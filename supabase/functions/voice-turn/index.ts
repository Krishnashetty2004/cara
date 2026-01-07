/**
 * Voice Turn Edge Function - Optimized for Speed
 *
 * Orchestrates a single conversation turn:
 * 1. Receives audio from client (with JWT auth)
 * 2. Transcribes with OpenAI Whisper
 * 3. Generates response with GPT-4o-mini
 * 4. Synthesizes speech with ElevenLabs Flash
 * 5. Returns audio + text to client
 *
 * Deploy: npx supabase functions deploy voice-turn
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { requireAuth, getAdminClient } from '../_shared/auth.ts'
import { PERMISSIVE_CORS_HEADERS } from '../_shared/cors.ts'
import {
  validateAudioBase64,
  validateAudioFormat,
  validateCharacterId,
  validateSystemPrompt,
  validateConversationHistory,
  validationErrorResponse,
} from '../_shared/validation.ts'

// API Keys from Supabase secrets
const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY')!
const ELEVENLABS_API_KEY = Deno.env.get('ELEVENLABS_API_KEY')!
const SARVAM_API_KEY = Deno.env.get('SARVAM_API_KEY')!

// Character voice configurations
interface ElevenLabsVoice {
  provider: 'elevenlabs'
  voiceId: string
  settings: object
}

interface SarvamVoice {
  provider: 'sarvam'
  voiceId: string
  model: string
  languageCode: string
}

type CharacterVoice = ElevenLabsVoice | SarvamVoice

const CHARACTER_VOICES: Record<string, CharacterVoice> = {
  preethi: {
    provider: 'elevenlabs',
    voiceId: 'ryIIztHPLYSJ74ueXxnO',
    settings: {
      stability: 0.25,
      similarity_boost: 0.85,
      style: 0.8,
      use_speaker_boost: true,
    },
  },
  ira: {
    provider: 'elevenlabs',
    voiceId: 'mg9npuuaf8WJphS6E0Rt',
    settings: {
      stability: 0.55,
      similarity_boost: 0.75,
      style: 0.35,
      use_speaker_boost: true,
    },
  },
  riya: {
    provider: 'sarvam',
    voiceId: 'manisha', // Sarvam AI Telugu female voice - chaotic bestie
    model: 'bulbul:v2',
    languageCode: 'te-IN',
  },
}

interface VoiceTurnRequest {
  audio_base64: string
  audio_format?: 'wav' | 'pcm16' | 'mp3' | 'm4a' | '3gp' | 'webm' | 'ogg'
  character_id: string
  system_prompt: string
  conversation_history?: Array<{ role: 'user' | 'assistant'; content: string }>
  generate_opener?: boolean
  opener_text?: string
}

interface VoiceTurnResponse {
  success: boolean
  user_transcript?: string
  assistant_response?: string
  audio_base64?: string
  audio_format?: string
  latency_ms?: {
    stt: number
    llm: number
    tts: number
    total: number
  }
  error?: string
}

serve(async (req: Request) => {
  const corsHeaders = PERMISSIVE_CORS_HEADERS

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405, corsHeaders)
  }

  const startTime = Date.now()
  const latency = { stt: 0, llm: 0, tts: 0, total: 0 }

  try {
    // Authenticate request via JWT
    const { auth, response: authResponse } = await requireAuth(req, corsHeaders)
    if (authResponse) {
      return authResponse
    }

    const { userId, isPremium } = auth

    // Parse and validate request body
    const body: VoiceTurnRequest = await req.json()

    // Validate inputs
    if (body.audio_base64) {
      const audioValidation = validateAudioBase64(body.audio_base64)
      if (!audioValidation.valid) {
        return validationErrorResponse(audioValidation.error!, corsHeaders)
      }
    }

    if (body.audio_format) {
      const formatValidation = validateAudioFormat(body.audio_format)
      if (!formatValidation.valid) {
        return validationErrorResponse(formatValidation.error!, corsHeaders)
      }
    }

    if (body.character_id) {
      const charValidation = validateCharacterId(body.character_id)
      if (!charValidation.valid) {
        return validationErrorResponse(charValidation.error!, corsHeaders)
      }
    }

    if (body.system_prompt) {
      const promptValidation = validateSystemPrompt(body.system_prompt)
      if (!promptValidation.valid) {
        return validationErrorResponse(promptValidation.error!, corsHeaders)
      }
    }

    if (body.conversation_history) {
      const histValidation = validateConversationHistory(body.conversation_history)
      if (!histValidation.valid) {
        return validationErrorResponse(histValidation.error!, corsHeaders)
      }
    }

    const {
      audio_base64,
      audio_format = 'wav',
      character_id,
      system_prompt,
      conversation_history = [],
      generate_opener = false,
      opener_text,
    } = body

    console.log(`[voice-turn] Processing turn, character: ${character_id}, opener: ${generate_opener}`)

    // ========================================
    // Opener-only mode: Just synthesize TTS
    // ========================================
    if (generate_opener && opener_text) {
      const ttsStart = Date.now()
      const character = CHARACTER_VOICES[character_id] || CHARACTER_VOICES.preethi

      try {
        const audioArrayBuffer = await synthesizeSpeech(opener_text, character)
        const audioBase64Out = arrayBufferToBase64(audioArrayBuffer)

        latency.tts = Date.now() - ttsStart
        latency.total = Date.now() - startTime

        // Determine audio format based on provider
        const audioFormat = character.provider === 'sarvam' ? 'wav' : 'mp3'

        console.log(`[voice-turn] Opener TTS (${character.provider}): ${audioArrayBuffer.byteLength} bytes (${latency.tts}ms)`)

        return jsonResponse({
          success: true,
          assistant_response: opener_text,
          audio_base64: audioBase64Out,
          audio_format: audioFormat,
          latency_ms: latency,
        } as VoiceTurnResponse, 200, corsHeaders)
      } catch (ttsError) {
        console.error('[voice-turn] Opener TTS error:', ttsError)
        return jsonResponse({ error: 'Opener synthesis failed' }, 500, corsHeaders)
      }
    }

    // Regular voice turn mode
    if (!audio_base64) {
      return jsonResponse({ error: 'Missing audio_base64' }, 400, corsHeaders)
    }

    // ========================================
    // Step 1: Transcribe with Whisper
    // ========================================
    const sttStart = Date.now()

    const mimeTypes: Record<string, string> = {
      'wav': 'audio/wav',
      'mp3': 'audio/mpeg',
      'm4a': 'audio/mp4',
      '3gp': 'audio/3gpp',
      'webm': 'audio/webm',
      'ogg': 'audio/ogg',
      'pcm16': 'audio/wav',
    }
    const mimeType = mimeTypes[audio_format] || 'audio/mpeg'

    const audioBuffer = base64ToArrayBuffer(audio_base64)
    const audioBlob = new Blob([audioBuffer], { type: mimeType })

    const fileExtension = audio_format === 'pcm16' ? 'wav' : audio_format
    const formData = new FormData()
    formData.append('file', audioBlob, `audio.${fileExtension}`)
    formData.append('model', 'whisper-1')
    formData.append('language', 'en') // Roman/Latin script output

    const whisperResponse = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
      },
      body: formData,
    })

    if (!whisperResponse.ok) {
      console.error('[voice-turn] Whisper error')
      return jsonResponse({ error: 'Transcription failed' }, 500, corsHeaders)
    }

    const whisperData = await whisperResponse.json()
    const userTranscript = whisperData.text?.trim()

    latency.stt = Date.now() - sttStart
    console.log(`[voice-turn] STT complete (${latency.stt}ms)`)

    if (!userTranscript) {
      return jsonResponse({
        success: true,
        user_transcript: '',
        assistant_response: '',
        audio_base64: '',
        latency_ms: { ...latency, total: Date.now() - startTime },
      }, 200, corsHeaders)
    }

    // ========================================
    // Step 2: Generate response with GPT-4o (STREAMING)
    // ========================================
    const llmStart = Date.now()

    const messages = [
      { role: 'system', content: system_prompt },
      ...conversation_history,
      { role: 'user', content: userTranscript },
    ]

    // Use streaming for faster time-to-first-token
    const chatResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages,
        max_tokens: 80,
        temperature: 0.7,
        presence_penalty: 0.6,
        frequency_penalty: 0.4,
        stream: true, // Enable streaming for faster response
      }),
    })

    if (!chatResponse.ok) {
      console.error('[voice-turn] GPT error')
      return jsonResponse({ error: 'Response generation failed' }, 500, corsHeaders)
    }

    // Process streaming response and collect sentences for parallel TTS
    const character = CHARACTER_VOICES[character_id] || CHARACTER_VOICES.preethi
    const sentences: string[] = []
    let currentSentence = ''
    let fullResponse = ''
    const ttsPromises: Promise<ArrayBuffer>[] = []
    const ttsStart = Date.now()
    let firstSentenceSent = false

    const reader = chatResponse.body?.getReader()
    const decoder = new TextDecoder()

    if (!reader) {
      return jsonResponse({ error: 'Stream reader unavailable' }, 500, corsHeaders)
    }

    // Sentence boundary detection regex
    const sentenceEndRegex = /[.!?।]+\s*$/

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      const chunk = decoder.decode(value, { stream: true })
      const lines = chunk.split('\n').filter(line => line.trim() !== '')

      for (const line of lines) {
        if (line === 'data: [DONE]') continue
        if (!line.startsWith('data: ')) continue

        try {
          const json = JSON.parse(line.slice(6))
          const token = json.choices?.[0]?.delta?.content || ''

          if (token) {
            fullResponse += token
            currentSentence += token

            // Check if we have a complete sentence
            if (sentenceEndRegex.test(currentSentence) && currentSentence.trim().length > 5) {
              const sentence = currentSentence.trim()
              sentences.push(sentence)

              // Fire TTS request immediately for this sentence (parallel processing)
              const ttsPromise = synthesizeSpeech(sentence, character)
              ttsPromises.push(ttsPromise)

              if (!firstSentenceSent) {
                console.log(`[voice-turn] First sentence ready, firing TTS: "${sentence.substring(0, 30)}..."`)
                firstSentenceSent = true
              }

              currentSentence = ''
            }
          }
        } catch (e) {
          // Skip malformed JSON chunks
        }
      }
    }

    // Handle any remaining text as final sentence
    if (currentSentence.trim().length > 0) {
      const sentence = currentSentence.trim()
      sentences.push(sentence)
      ttsPromises.push(synthesizeSpeech(sentence, character))
    }

    latency.llm = Date.now() - llmStart
    console.log(`[voice-turn] LLM streaming complete (${latency.llm}ms), ${sentences.length} sentences`)

    const assistantResponse = fullResponse.trim()

    if (!assistantResponse) {
      return jsonResponse({ error: 'Empty response from LLM' }, 500, corsHeaders)
    }

    // ========================================
    // Step 3: Wait for parallel TTS and concatenate
    // ========================================
    let audioBase64Out = ''

    if (ttsPromises.length > 0) {
      try {
        // Wait for all TTS requests to complete (they were fired in parallel)
        const audioBuffers = await Promise.all(ttsPromises)

        // Concatenate all audio buffers
        const totalLength = audioBuffers.reduce((sum, buf) => sum + buf.byteLength, 0)
        const combined = new Uint8Array(totalLength)
        let offset = 0

        for (const buffer of audioBuffers) {
          combined.set(new Uint8Array(buffer), offset)
          offset += buffer.byteLength
        }

        audioBase64Out = arrayBufferToBase64(combined.buffer)
      } catch (ttsError) {
        console.error('[voice-turn] TTS parallel processing error:', ttsError)
        return jsonResponse({ error: 'Speech synthesis failed' }, 500, corsHeaders)
      }
    }

    latency.tts = Date.now() - ttsStart
    latency.total = Date.now() - startTime

    // Determine audio format based on provider
    const outputAudioFormat = character.provider === 'sarvam' ? 'wav' : 'mp3'

    console.log(`[voice-turn] TTS parallel complete (${character.provider}, ${latency.tts}ms), total: ${latency.total}ms`)

    // ========================================
    // Return response
    // ========================================
    return jsonResponse({
      success: true,
      user_transcript: userTranscript,
      assistant_response: assistantResponse,
      audio_base64: audioBase64Out,
      audio_format: outputAudioFormat,
      latency_ms: latency,
    } as VoiceTurnResponse, 200, corsHeaders)

  } catch (error) {
    console.error('[voice-turn] Unexpected error')
    return jsonResponse({ error: 'Internal server error' }, 500, corsHeaders)
  }
})

// Helper functions
function jsonResponse(data: object, status: number, corsHeaders: Record<string, string>): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

// Synthesize speech for a single sentence (used for parallel TTS)
// Supports both ElevenLabs and Sarvam AI
async function synthesizeSpeech(
  text: string,
  character: CharacterVoice
): Promise<ArrayBuffer> {
  console.log(`[TTS] Synthesizing with ${character.provider}: "${text.substring(0, 50)}..."`)

  if (character.provider === 'sarvam') {
    // Sarvam AI TTS for Telugu (Riya)
    const sarvamChar = character as SarvamVoice
    const response = await fetch('https://api.sarvam.ai/text-to-speech', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-subscription-key': SARVAM_API_KEY,
      },
      body: JSON.stringify({
        text: text,
        target_language_code: sarvamChar.languageCode, // te-IN for Telugu
        speaker: sarvamChar.voiceId, // manisha
        model: sarvamChar.model, // bulbul:v2
        pitch: 0,
        pace: 1.1, // Slightly faster for energetic personality
        loudness: 1.2, // Slightly louder for expressive speech
        speech_sample_rate: 22050,
        enable_preprocessing: true,
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error(`[TTS] Sarvam error ${response.status}:`, errorText)
      throw new Error(`Sarvam TTS failed: ${response.status} - ${errorText}`)
    }

    const data = await response.json()
    // Sarvam returns base64 audio in the audios array
    if (data.audios && data.audios[0]) {
      const audioBase64 = data.audios[0]
      return base64ToArrayBuffer(audioBase64)
    }
    throw new Error('Sarvam TTS returned no audio')
  } else {
    // ElevenLabs TTS (Preethi, Ira)
    const elevenChar = character as ElevenLabsVoice
    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${elevenChar.voiceId}`,
      {
        method: 'POST',
        headers: {
          'Accept': 'audio/mpeg',
          'Content-Type': 'application/json',
          'xi-api-key': ELEVENLABS_API_KEY,
        },
        body: JSON.stringify({
          text,
          model_id: 'eleven_turbo_v2_5',
          voice_settings: elevenChar.settings,
        }),
      }
    )

    if (!response.ok) {
      const errorText = await response.text()
      console.error(`[TTS] ElevenLabs error ${response.status}:`, errorText)
      throw new Error(`ElevenLabs TTS failed: ${response.status} - ${errorText}`)
    }

    return response.arrayBuffer()
  }
}

function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binaryString = atob(base64)
  const bytes = new Uint8Array(binaryString.length)
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i)
  }
  return bytes.buffer
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)
  let binary = ''
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary)
}
