/**
 * OpenAI Realtime API Client
 *
 * This provides ultra-low latency voice conversations using WebSocket.
 * GPT-4o processes audio natively - no separate STT/TTS calls needed.
 *
 * Security: API key is never exposed to client. We fetch ephemeral tokens
 * from our Edge Function which validates auth and checks usage limits.
 */

import { Audio } from 'expo-av'
import * as FileSystem from 'expo-file-system/legacy'
import { getCharacter } from '@/constants/characters'
import { getCombinedGuidance } from '@/lib/conversation'
import { supabase, createAuthenticatedInvoker } from '@/lib/supabase'
import type { CharacterId } from '@/types/character'
import type { UserMemory, RelationshipData } from '@/types/database'

const REALTIME_API_URL = 'wss://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview-2024-12-17'

interface TokenResponse {
  token?: string
  expires_at?: number
  remaining_seconds?: number
  is_premium?: boolean
  error?: string
  limit_reached?: boolean
}

// Audio configuration for PCM16 format (required by Realtime API)
const SAMPLE_RATE = 24000
const CHANNELS = 1
const BIT_DEPTH = 16

export type RealtimeEvent =
  | { type: 'connected'; remainingSeconds?: number; isPremium?: boolean }
  | { type: 'disconnected' }
  | { type: 'error'; message: string }
  | { type: 'limit_reached'; isPremium: boolean }
  | { type: 'speech_started' }
  | { type: 'speech_stopped' }
  | { type: 'transcription'; text: string; isFinal: boolean }
  | { type: 'response_started' }
  | { type: 'response_text'; text: string; isFinal: boolean }
  | { type: 'response_audio'; audioData: string } // base64 PCM16
  | { type: 'response_done' }
  | { type: 'turn_ended' }
  | { type: 'usage_updated'; remainingSeconds: number }

export interface RealtimeClientOptions {
  characterId: CharacterId
  onEvent: (event: RealtimeEvent) => void
  getToken?: () => Promise<string | null> // Clerk getToken for authenticated Edge Function calls
  memory?: UserMemory | null
  relationship?: RelationshipData | null
  lastConversationSummary?: string | null
  onUsageUpdate?: (remainingSeconds: number) => void
}

type ConversationMood = 'neutral' | 'flirty' | 'caring' | 'playful' | 'intimate'

class OpenAIRealtimeClient {
  private ws: WebSocket | null = null
  private characterId: CharacterId
  private onEvent: (event: RealtimeEvent) => void
  private onUsageUpdate?: (remainingSeconds: number) => void
  private memory: UserMemory | null
  private relationship: RelationshipData | null
  private lastConversationSummary: string | null
  private authenticatedInvoke: ReturnType<typeof createAuthenticatedInvoker> | null
  private isConnected: boolean = false
  private audioQueue: string[] = []
  private isPlayingAudio: boolean = false
  private currentSound: Audio.Sound | null = null
  private reconnectAttempts: number = 0
  private maxReconnectAttempts: number = 3

  // Conversation flow tracking
  private turnCount: number = 0
  private currentMood: ConversationMood = 'neutral'
  private lastMoodChange: number = 0

  // Usage tracking
  private remainingSeconds: number = 0
  private isPremium: boolean = false
  private callStartTime: number = 0
  private usageUpdateInterval: ReturnType<typeof setInterval> | null = null

  constructor(options: RealtimeClientOptions) {
    this.characterId = options.characterId
    this.onEvent = options.onEvent
    this.onUsageUpdate = options.onUsageUpdate
    this.memory = options.memory || null
    this.relationship = options.relationship || null
    this.lastConversationSummary = options.lastConversationSummary || null
    this.authenticatedInvoke = options.getToken ? createAuthenticatedInvoker(options.getToken) : null
  }

  /**
   * Fetch ephemeral token from our Edge Function
   * This keeps the OpenAI API key secure on the server
   */
  private async fetchRealtimeToken(): Promise<TokenResponse> {
    try {
      if (!this.authenticatedInvoke) {
        return { error: 'Not authenticated - missing getToken' }
      }

      const { data, error } = await this.authenticatedInvoke('realtime-token', {
        method: 'POST',
      })

      if (error) {
        return { error: error.message || 'Failed to get session token' }
      }

      return data as TokenResponse
    } catch (err) {
      return { error: 'Network error while fetching token' }
    }
  }

  /**
   * Start tracking usage time and update remaining seconds
   */
  private startUsageTracking() {
    this.callStartTime = Date.now()

    // Update remaining time every second
    this.usageUpdateInterval = setInterval(() => {
      if (!this.isConnected) {
        this.stopUsageTracking()
        return
      }

      const elapsedSeconds = Math.floor((Date.now() - this.callStartTime) / 1000)
      const newRemaining = Math.max(0, this.remainingSeconds - elapsedSeconds)

      // Notify UI of remaining time
      this.onEvent({ type: 'usage_updated', remainingSeconds: newRemaining })
      this.onUsageUpdate?.(newRemaining)

      // If user runs out of time and not premium, disconnect
      if (newRemaining <= 0 && !this.isPremium) {
        this.onEvent({ type: 'limit_reached', isPremium: false })
        this.disconnect()
      }
    }, 1000)
  }

  /**
   * Stop usage tracking
   */
  private stopUsageTracking() {
    if (this.usageUpdateInterval) {
      clearInterval(this.usageUpdateInterval)
      this.usageUpdateInterval = null
    }
  }

  /**
   * Get the duration of the current call in seconds
   */
  getCallDuration(): number {
    if (!this.callStartTime) return 0
    return Math.floor((Date.now() - this.callStartTime) / 1000)
  }

  async connect(): Promise<boolean> {
    try {
      // Step 1: Fetch ephemeral token from our Edge Function
      const tokenResponse = await this.fetchRealtimeToken()

      if (tokenResponse.error) {
        if (tokenResponse.limit_reached) {
          this.onEvent({ type: 'limit_reached', isPremium: tokenResponse.is_premium || false })
          return false
        }

        this.onEvent({ type: 'error', message: tokenResponse.error })
        return false
      }

      if (!tokenResponse.token) {
        this.onEvent({ type: 'error', message: 'Failed to get session token' })
        return false
      }

      // Store usage info
      this.remainingSeconds = tokenResponse.remaining_seconds || 0
      this.isPremium = tokenResponse.is_premium || false

      // Step 2: Connect to OpenAI using ephemeral token
      return new Promise((resolve) => {
        try {
          // Use WebSocket subprotocol to pass the token (more reliable than headers in RN)
          // @ts-ignore - React Native WebSocket accepts options object as third arg
          this.ws = new WebSocket(REALTIME_API_URL, [
            'realtime',
            `openai-insecure-api-key.${tokenResponse.token}`,
            'openai-beta.realtime-v1',
          ])

          this.ws.onopen = () => {
            this.isConnected = true
            this.reconnectAttempts = 0
            this.configureSession()
            this.startUsageTracking()
            this.onEvent({
              type: 'connected',
              remainingSeconds: this.remainingSeconds,
              isPremium: this.isPremium,
            })
            resolve(true)
          }

          this.ws.onclose = () => {
            this.isConnected = false
            this.stopUsageTracking()
            this.onEvent({ type: 'disconnected' })
          }

          this.ws.onerror = () => {
            this.onEvent({ type: 'error', message: 'Connection error' })
            resolve(false)
          }

          this.ws.onmessage = (event) => {
            this.handleMessage(event.data)
          }

        } catch (error) {
          this.onEvent({ type: 'error', message: 'Failed to create connection' })
          resolve(false)
        }
      })

    } catch (error) {
      this.onEvent({ type: 'error', message: 'Failed to connect' })
      return false
    }
  }

  private configureSession() {
    if (!this.ws || !this.isConnected) return

    const character = getCharacter(this.characterId)
    const systemPrompt = character.getSystemPrompt(
      this.memory,
      this.relationship,
      this.lastConversationSummary
    )

    // Configure the session with character personality
    const sessionConfig = {
      type: 'session.update',
      session: {
        modalities: ['text', 'audio'],
        instructions: systemPrompt,
        voice: 'shimmer', // Best for female Indian voice
        input_audio_format: 'pcm16',
        output_audio_format: 'pcm16',
        input_audio_transcription: {
          model: 'whisper-1',
        },
        turn_detection: {
          type: 'server_vad',
          threshold: 0.7, // Higher = less sensitive to background noise (0.0-1.0)
          prefix_padding_ms: 400, // Audio to include before speech starts
          silence_duration_ms: 800, // Wait longer to confirm speech ended
        },
        temperature: 0.8,
        max_response_output_tokens: 150,
      },
    }

    this.send(sessionConfig)

    // Start the conversation after a brief delay
    setTimeout(() => {
      this.startConversation()
    }, 500)
  }

  // Get time-based greeting context
  private getTimeBasedContext(): string {
    const hour = new Date().getHours()

    if (hour >= 5 && hour < 12) {
      return 'morning'
    } else if (hour >= 12 && hour < 17) {
      return 'afternoon'
    } else if (hour >= 17 && hour < 21) {
      return 'evening'
    } else {
      return 'night'
    }
  }

  // Start the conversation with a dynamic, memory-aware greeting
  startConversation() {
    if (!this.isConnected) return

    const timeContext = this.getTimeBasedContext()
    const character = getCharacter(this.characterId)

    // Build context-aware greeting prompt
    let greetingContext = ''

    // Reference last conversation if exists
    if (this.lastConversationSummary) {
      greetingContext += `\nLast time you talked about: ${this.lastConversationSummary}. You can subtly reference this if natural.`
    }

    // Use their name if known
    const userName = this.memory?.name
    if (userName) {
      greetingContext += `\nAddress them as ${userName} or use a pet name like baby, jaan.`
    }

    // Reference relationship stage
    const stage = this.relationship?.relationship_stage || 'stranger'
    if (stage === 'stranger') {
      greetingContext += '\nThis is a NEW caller - you don\'t know them yet. Be curious, ask their name!'
    } else if (stage === 'romantic' || stage === 'flirty') {
      greetingContext += '\nYou\'re very close to them. Be intimate, possessive, and loving.'
    } else if (stage === 'close_friend' || stage === 'friend') {
      greetingContext += '\nYou know them well. Be comfortable and playful.'
    }

    // Time-specific instruction with natural variety
    const timeInstructions: Record<string, string> = {
      morning: 'It\'s morning - be cute, maybe sleepy, ask about their night or tease about waking up late.',
      afternoon: 'It\'s afternoon - playful energy, ask about their day, or tease them for calling during work.',
      evening: 'It\'s evening - relaxed, romantic vibes, ask how their day was.',
      night: 'It\'s late night - intimate, soft voice, cozy conversation mood.',
    }

    const prompt = `[System: User is calling you. ${timeInstructions[timeContext]}${greetingContext}

Pick up naturally like a real girlfriend would. Keep your greeting SHORT (1 sentence max).
Be ${character.name} - ${stage === 'stranger' ? 'curious and flirty' : 'possessive and loving'}.
Use natural fillers like "Hiii...", "Mmmm...", "Awww...".
Don't wait for them - YOU start talking first!]`

    // Send a system-level prompt to trigger the greeting
    this.send({
      type: 'conversation.item.create',
      item: {
        type: 'message',
        role: 'user',
        content: [{
          type: 'input_text',
          text: prompt
        }],
      },
    })

    // Request a response with audio
    this.send({
      type: 'response.create',
      response: {
        modalities: ['text', 'audio'],
      },
    })
  }

  // Get dynamic mood guidance based on turn count and randomness
  private getMoodGuidance(): string {
    this.turnCount++

    // Vary the mood every few turns
    if (this.turnCount - this.lastMoodChange >= 4) {
      const moods: ConversationMood[] = ['flirty', 'caring', 'playful', 'intimate']
      this.currentMood = moods[Math.floor(Math.random() * moods.length)]
      this.lastMoodChange = this.turnCount
    }

    // Get combined guidance from speech patterns module
    return getCombinedGuidance(this.turnCount, this.currentMood)
  }

  // Inject mood guidance into conversation
  private injectMoodGuidance() {
    const guidance = this.getMoodGuidance()
    if (guidance) {
      // Send as a system hint that won't be spoken
      this.send({
        type: 'conversation.item.create',
        item: {
          type: 'message',
          role: 'user',
          content: [{
            type: 'input_text',
            text: guidance
          }],
        },
      })
    }
  }

  private handleMessage(data: string) {
    try {
      const message = JSON.parse(data)

      switch (message.type) {
        case 'session.created':
        case 'session.updated':
          break

        case 'input_audio_buffer.speech_started':
          this.onEvent({ type: 'speech_started' })
          this.stopAudioPlayback()
          break

        case 'input_audio_buffer.speech_stopped':
          this.onEvent({ type: 'speech_stopped' })
          break

        case 'conversation.item.input_audio_transcription.completed':
          this.onEvent({
            type: 'transcription',
            text: message.transcript || '',
            isFinal: true
          })
          this.injectMoodGuidance()
          break

        case 'response.created':
          this.onEvent({ type: 'response_started' })
          break

        case 'response.text.delta':
          this.onEvent({
            type: 'response_text',
            text: message.delta || '',
            isFinal: false
          })
          break

        case 'response.text.done':
          this.onEvent({
            type: 'response_text',
            text: message.text || '',
            isFinal: true
          })
          break

        case 'response.audio.delta':
          if (message.delta) {
            this.audioQueue.push(message.delta)
            this.processAudioQueue()
          }
          break

        case 'response.audio_transcript.delta':
          if (message.delta) {
            this.onEvent({
              type: 'response_text',
              text: message.delta || '',
              isFinal: false
            })
          }
          break

        case 'response.audio_transcript.done':
          if (message.transcript) {
            this.onEvent({
              type: 'response_text',
              text: message.transcript || '',
              isFinal: true
            })
          }
          break

        case 'response.audio.done':
          break

        case 'response.done':
          this.onEvent({ type: 'response_done' })
          break

        case 'response.output_item.done':
        case 'rate_limits.updated':
        case 'response.output_item.added':
        case 'response.content_part.added':
        case 'conversation.item.truncated':
          break

        case 'error':
          this.onEvent({
            type: 'error',
            message: message.error?.message || 'Unknown error'
          })
          break

        default:
          break
      }
    } catch (error) {
      // Parse error - ignore
    }
  }

  private async processAudioQueue() {
    if (this.isPlayingAudio) return

    // Wait for enough audio data before playing (at least 20KB base64 = ~15KB audio = ~0.3 sec)
    // Or if no new audio for 100ms
    const totalQueueSize = this.audioQueue.reduce((sum, chunk) => sum + chunk.length, 0)

    if (this.audioQueue.length === 0) return

    // Only start playing if we have enough audio or response is done
    if (totalQueueSize < 20000 && this.audioQueue.length < 5) {
      // Wait a bit for more chunks
      setTimeout(() => this.processAudioQueue(), 100)
      return
    }

    this.isPlayingAudio = true

    try {
      // Combine queued audio chunks by decoding, concatenating, re-encoding
      const audioChunks = this.audioQueue.splice(0, this.audioQueue.length)

      // Decode each chunk to bytes and combine
      const allBytes: number[] = []
      for (const chunk of audioChunks) {
        const bytes = this.base64ToUint8Array(chunk)
        allBytes.push(...Array.from(bytes))
      }

      // Convert combined bytes back to base64
      const combinedBytes = new Uint8Array(allBytes)
      let binary = ''
      for (let i = 0; i < combinedBytes.length; i++) {
        binary += String.fromCharCode(combinedBytes[i])
      }
      const combinedAudio = btoa(binary)

      // Convert base64 PCM16 to playable format
      await this.playPCMAudio(combinedAudio)
    } catch (error) {
      // Audio playback error - ignore
    } finally {
      this.isPlayingAudio = false
      // Process any remaining audio
      if (this.audioQueue.length > 0) {
        this.processAudioQueue()
      }
    }
  }

  private async playPCMAudio(base64Audio: string) {
    try {
      // Create a temporary WAV file from PCM16 data
      const wavData = this.createWavFromPCM(base64Audio)
      const cacheDir = FileSystem.cacheDirectory || FileSystem.documentDirectory || ''
      const fileUri = `${cacheDir}realtime_audio_${Date.now()}.wav`

      await FileSystem.writeAsStringAsync(fileUri, wavData, {
        encoding: 'base64',
      })

      // Set audio mode that allows BOTH recording and playback through SPEAKER
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true, // Keep true for simultaneous recording
        playsInSilentModeIOS: true,
        staysActiveInBackground: true,
        shouldDuckAndroid: false,
        playThroughEarpieceAndroid: false,
        interruptionModeIOS: 1, // DoNotMix
        interruptionModeAndroid: 1, // DoNotMix
      })

      // Play the audio
      const { sound } = await Audio.Sound.createAsync(
        { uri: fileUri },
        {
          shouldPlay: true,
          volume: 1.0,
          rate: 1.0,
          shouldCorrectPitch: false,
        }
      )

      this.currentSound = sound

      // Wait for playback to complete
      return new Promise<void>((resolve) => {
        const timeout = setTimeout(() => {
          sound.unloadAsync().catch(() => {})
          this.currentSound = null
          FileSystem.deleteAsync(fileUri, { idempotent: true }).catch(() => {})
          resolve()
        }, 10000) // 10 second timeout

        sound.setOnPlaybackStatusUpdate((status) => {
          if (status.isLoaded) {
            if (status.didJustFinish) {
              clearTimeout(timeout)
              sound.unloadAsync().catch(() => {})
              this.currentSound = null
              FileSystem.deleteAsync(fileUri, { idempotent: true }).catch(() => {})
              resolve()
            }
          } else if ('error' in status) {
            clearTimeout(timeout)
            sound.unloadAsync().catch(() => {})
            this.currentSound = null
            FileSystem.deleteAsync(fileUri, { idempotent: true }).catch(() => {})
            resolve()
          }
        })
      })
    } catch (error) {
      // Playback error - ignore
    }
  }

  private createWavFromPCM(base64PCM: string): string {
    // Decode base64 PCM data to raw bytes
    const pcmBytes = this.base64ToUint8Array(base64PCM)
    const pcmLength = pcmBytes.length

    // Create combined buffer (44 byte header + PCM data)
    const wavBuffer = new ArrayBuffer(44 + pcmLength)
    const view = new DataView(wavBuffer)
    const wavBytes = new Uint8Array(wavBuffer)

    // RIFF header
    this.writeString(view, 0, 'RIFF')
    view.setUint32(4, 36 + pcmLength, true)
    this.writeString(view, 8, 'WAVE')

    // fmt chunk
    this.writeString(view, 12, 'fmt ')
    view.setUint32(16, 16, true) // chunk size
    view.setUint16(20, 1, true) // PCM format
    view.setUint16(22, CHANNELS, true)
    view.setUint32(24, SAMPLE_RATE, true)
    view.setUint32(28, SAMPLE_RATE * CHANNELS * (BIT_DEPTH / 8), true) // byte rate
    view.setUint16(32, CHANNELS * (BIT_DEPTH / 8), true) // block align
    view.setUint16(34, BIT_DEPTH, true)

    // data chunk
    this.writeString(view, 36, 'data')
    view.setUint32(40, pcmLength, true)

    // Copy PCM data after header
    wavBytes.set(pcmBytes, 44)

    // Convert combined buffer to base64
    return this.arrayBufferToBase64(wavBuffer)
  }

  private base64ToUint8Array(base64: string): Uint8Array {
    const binaryString = atob(base64)
    const bytes = new Uint8Array(binaryString.length)
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i)
    }
    return bytes
  }

  private writeString(view: DataView, offset: number, str: string) {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i))
    }
  }

  private arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer)
    let binary = ''
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i])
    }
    return btoa(binary)
  }

  async stopAudioPlayback() {
    this.audioQueue = []
    if (this.currentSound) {
      try {
        await this.currentSound.stopAsync()
        await this.currentSound.unloadAsync()
      } catch (error) {
        // Ignore errors when stopping
      }
      this.currentSound = null
    }
    this.isPlayingAudio = false
  }

  // Send audio chunk to the API
  sendAudio(base64Audio: string) {
    if (!this.isConnected) return

    this.send({
      type: 'input_audio_buffer.append',
      audio: base64Audio,
    })
  }

  // Commit the audio buffer (signal end of input)
  commitAudio() {
    if (!this.isConnected) return

    this.send({
      type: 'input_audio_buffer.commit',
    })
  }

  // Clear the audio buffer
  clearAudioBuffer() {
    if (!this.isConnected) return

    this.send({
      type: 'input_audio_buffer.clear',
    })
  }

  // Request a response (usually auto-triggered by VAD)
  requestResponse() {
    if (!this.isConnected) return

    this.send({
      type: 'response.create',
      response: {
        modalities: ['text', 'audio'],
      },
    })
  }

  // Cancel current response
  cancelResponse() {
    if (!this.isConnected) return

    this.send({
      type: 'response.cancel',
    })
    this.stopAudioPlayback()
  }

  // Send a text message (for testing or hybrid mode)
  sendText(text: string) {
    if (!this.isConnected) return

    this.send({
      type: 'conversation.item.create',
      item: {
        type: 'message',
        role: 'user',
        content: [{ type: 'input_text', text }],
      },
    })

    this.send({
      type: 'response.create',
      response: {
        modalities: ['text', 'audio'],
      },
    })
  }

  private send(message: object) {
    if (this.ws && this.isConnected) {
      this.ws.send(JSON.stringify(message))
    }
  }

  async disconnect() {
    // Stop usage tracking first
    this.stopUsageTracking()

    // Report usage to backend
    const callDuration = this.getCallDuration()
    if (callDuration > 0) {
      this.reportUsage(callDuration).catch(() => {})
    }

    await this.stopAudioPlayback()

    if (this.ws) {
      this.ws.close()
      this.ws = null
    }

    this.isConnected = false
    this.callStartTime = 0
  }

  /**
   * Report call duration to backend for usage tracking
   */
  private async reportUsage(durationSeconds: number): Promise<void> {
    try {
      if (!this.authenticatedInvoke) {
        return
      }

      await this.authenticatedInvoke('track-usage', {
        method: 'POST',
        body: { duration_seconds: durationSeconds },
      })
    } catch (err) {
      // Usage reporting error - ignore
    }
  }

  get connected(): boolean {
    return this.isConnected
  }
}

export { OpenAIRealtimeClient }
