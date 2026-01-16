import { useState, useRef, useCallback, useEffect } from 'react'
import { Audio } from 'expo-av'
import { Platform } from 'react-native'
import {
  readAsStringAsync,
  writeAsStringAsync,
  deleteAsync,
  cacheDirectory,
  EncodingType,
} from 'expo-file-system/legacy'
import {
  requestPermissions,
  setupAudioMode,
  startRecording as startAudioRecording,
  stopRecording as stopAudioRecording,
  cancelRecording,
} from '@/lib/audio/recorder'
import { playAudio, stopAudio, setupPlaybackMode } from '@/lib/audio/player'
import { supabase, createAuthenticatedInvoker } from '@/lib/supabase'
import { CHARACTERS, DEFAULT_CHARACTER } from '@/constants/characters'
import { CONFIG } from '@/constants/config'
import type { CallState } from '@/types'
import type { CharacterId } from '@/types/character'
import type { UserMemory, RelationshipData } from '@/types'

export type ProcessingState = 'idle' | 'listening' | 'thinking' | 'speaking'

interface ConversationMessage {
  role: 'user' | 'assistant'
  content: string
}

interface UseHybridCallOptions {
  characterId?: CharacterId
  clerkId?: string | null // Required for auth with Edge Functions
  getToken?: () => Promise<string | null> // Clerk getToken for authenticated Edge Function calls
  onMinuteUsed?: () => void
  canMakeCall?: () => boolean
  onUserMessage?: (text: string) => void
  onCharacterResponse?: (text: string) => void
  isPremium?: boolean
  onTimeLimitReached?: () => void
  onTimeWarning?: (secondsRemaining: number) => void
  memory?: UserMemory | null
  relationship?: RelationshipData | null
  lastConversationSummary?: string | null
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

/**
 * Hybrid voice call hook
 *
 * Uses a server-side orchestration approach:
 * 1. Client records audio → sends to Edge Function
 * 2. Edge Function: Whisper STT → GPT-4o-mini → ElevenLabs TTS
 * 3. Client receives audio + transcript → plays response
 *
 * Cost: ~$0.04/min (vs $0.30/min for Realtime API)
 */
export function useHybridCall(options: UseHybridCallOptions = {}) {
  const {
    characterId = DEFAULT_CHARACTER,
    clerkId = null,
    getToken,
    onMinuteUsed,
    canMakeCall,
    onUserMessage,
    onCharacterResponse,
    isPremium = false,
    onTimeLimitReached,
    onTimeWarning,
    memory = null,
    relationship = null,
    lastConversationSummary = null,
  } = options

  // Create authenticated invoker if getToken is provided
  const authenticatedInvoke = getToken ? createAuthenticatedInvoker(getToken) : null

  const [callState, setCallState] = useState<CallState>('idle')
  const [processingState, setProcessingState] = useState<ProcessingState>('idle')
  const [isMuted, setIsMuted] = useState(false)
  const [isSpeakerOn, setIsSpeakerOn] = useState(true)
  const [isRecording, setIsRecording] = useState(false)
  const [isCharacterSpeaking, setIsCharacterSpeaking] = useState(false)
  const [callDuration, setCallDuration] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [responseText, setResponseText] = useState<string | null>(null)
  const [timeWarningShown, setTimeWarningShown] = useState(false)

  // Refs for stable references
  const conversationHistory = useRef<ConversationMessage[]>([])
  const durationInterval = useRef<ReturnType<typeof setInterval> | null>(null)
  const callStartTime = useRef<number>(0)
  const lastMinuteCount = useRef<number>(0)
  const ringtoneSound = useRef<Audio.Sound | null>(null)
  const silenceTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isListeningRef = useRef(false)
  const callStateRef = useRef<CallState>('idle')
  const isMutedRef = useRef(false)
  const isCharacterSpeakingRef = useRef(false)
  const endCallRef = useRef<(() => Promise<void>) | null>(null)

  // Keep refs in sync
  useEffect(() => { callStateRef.current = callState }, [callState])
  useEffect(() => { isMutedRef.current = isMuted }, [isMuted])
  useEffect(() => { isCharacterSpeakingRef.current = isCharacterSpeaking }, [isCharacterSpeaking])

  // Get character's system prompt
  const getSystemPrompt = useCallback(() => {
    const character = CHARACTERS[characterId]
    return character.getSystemPrompt(memory, relationship, lastConversationSummary)
  }, [characterId, memory, relationship, lastConversationSummary])

  // Play ringtone
  const playRingtone = useCallback(async () => {
    try {
      const { sound } = await Audio.Sound.createAsync(
        require('@/assets/sounds/ringtone.mp3'),
        { shouldPlay: true, isLooping: true, volume: 0.7 }
      )
      ringtoneSound.current = sound
    } catch (err) {
      // Ringtone playback failed - continue without it
    }
  }, [])

  // Stop ringtone
  const stopRingtone = useCallback(async () => {
    try {
      if (ringtoneSound.current) {
        await ringtoneSound.current.stopAsync()
        await ringtoneSound.current.unloadAsync()
        ringtoneSound.current = null
      }
    } catch (err) {
      // Ignore stop ringtone errors
    }
  }, [])

  // Convert audio file to base64
  const audioFileToBase64 = async (uri: string): Promise<string> => {
    const base64 = await readAsStringAsync(uri, {
      encoding: EncodingType.Base64,
    })
    return base64
  }

  // Play audio from base64
  const playBase64Audio = async (
    base64: string,
    format: string = 'mp3',
    onFinished?: () => void
  ) => {
    try {
      // Write base64 to temp file
      const tempUri = `${cacheDirectory}response_${Date.now()}.${format}`
      await writeAsStringAsync(tempUri, base64, {
        encoding: EncodingType.Base64,
      })

      // Setup playback mode and play
      await setupPlaybackMode(isSpeakerOn)
      await playAudio(tempUri, async () => {
        // Clean up temp file
        try {
          await deleteAsync(tempUri, { idempotent: true })
        } catch {}
        onFinished?.()
      })
    } catch (err) {
      onFinished?.()
    }
  }

  // Send voice turn to Edge Function
  const sendVoiceTurn = async (audioBase64: string, format: string = 'm4a'): Promise<VoiceTurnResponse> => {
    if (!authenticatedInvoke) {
      throw new Error('Not authenticated - missing getToken')
    }

    const { data, error } = await authenticatedInvoke('voice-turn', {
      body: {
        audio_base64: audioBase64,
        audio_format: format,
        character_id: characterId,
        system_prompt: getSystemPrompt(),
        conversation_history: conversationHistory.current.slice(-10), // Last 10 messages for context
      },
    })

    if (error) {
      throw new Error(error.message || 'Voice processing failed')
    }

    return data as VoiceTurnResponse
  }

  // Start listening
  const startListening = useCallback(async () => {
    if (
      isMutedRef.current ||
      isCharacterSpeakingRef.current ||
      callStateRef.current !== 'connected' ||
      isListeningRef.current
    ) {
      return
    }

    try {
      isListeningRef.current = true
      await setupAudioMode()

      // Start recording with VAD callback - auto-stops when silence detected
      await startAudioRecording(() => {
        if (isListeningRef.current) {
          processRecording()
        }
      })

      setIsRecording(true)
      setProcessingState('listening')

      // Fallback timeout - shorter on Android since VAD metering doesn't work
      const fallbackTimeout = Platform.OS === 'android' ? 5000 : 15000
      silenceTimer.current = setTimeout(async () => {
        if (isListeningRef.current) {
          await processRecording()
        }
      }, fallbackTimeout)
    } catch (err: any) {
      isListeningRef.current = false
      setIsRecording(false)
      setProcessingState('idle')
    }
  }, [])

  // Process recording - send to Edge Function
  const processRecording = useCallback(async () => {
    if (!isListeningRef.current) return

    isListeningRef.current = false
    setIsRecording(false)

    // Clear silence timer
    if (silenceTimer.current) {
      clearTimeout(silenceTimer.current)
      silenceTimer.current = null
    }

    setProcessingState('thinking')

    try {
      const uri = await stopAudioRecording()

      if (uri && callStateRef.current === 'connected') {
        // Convert to base64
        const audioBase64 = await audioFileToBase64(uri)

        // Detect format from URI (expo-av uses m4a on iOS, 3gp on Android)
        const format = uri.endsWith('.m4a') ? 'm4a' : uri.endsWith('.3gp') ? '3gp' : 'wav'

        // Send to Edge Function
        const response = await sendVoiceTurn(audioBase64, format)

        if (!response.success) {
          throw new Error(response.error || 'Voice turn failed')
        }

        // Filter garbage transcripts (silence/noise detected as ".", "you", single chars)
        // Also filter known Whisper hallucinations that occur with silence/noise
        const transcript = response.user_transcript?.trim() || ''
        const cleanTranscript = transcript.replace(/[\s.,!?]+/g, '') // Remove spaces and punctuation
        const lowerTranscript = transcript.toLowerCase()

        // Known Whisper hallucinations with silence/background noise
        const isWhisperHallucination =
          lowerTranscript.includes('osho') ||
          lowerTranscript.includes('copyright') ||
          lowerTranscript.includes('subscribe') ||
          lowerTranscript.includes('thank you for watching') ||
          lowerTranscript.includes('www.') ||
          lowerTranscript.includes('.com') ||
          lowerTranscript.includes('music') ||
          lowerTranscript.includes('applause') ||
          /^\[.*\]$/.test(transcript) // [Music], [Applause], etc.

        const isGarbage =
          cleanTranscript.length < 3 ||
          /^[\s.,!?]+$/.test(transcript) ||
          /^(you|yo|the|a|an|i|me|my|um|uh|hmm|ah|oh|hey|hi|hello|huh|mhm|yeah|ya|yep|nah|no|yes|ok|okay)$/i.test(cleanTranscript) ||
          isWhisperHallucination

        if (isGarbage) {
          setProcessingState('idle')
          setTimeout(() => startListening(), 500)
          return
        }

        // Update conversation history
        if (response.user_transcript) {
          conversationHistory.current.push({
            role: 'user',
            content: response.user_transcript,
          })
          onUserMessage?.(response.user_transcript)
        }

        if (response.assistant_response) {
          conversationHistory.current.push({
            role: 'assistant',
            content: response.assistant_response,
          })
          setResponseText(response.assistant_response)
          onCharacterResponse?.(response.assistant_response)
        }

        // Play response audio
        if (response.audio_base64) {
          setIsCharacterSpeaking(true)
          isCharacterSpeakingRef.current = true
          setProcessingState('speaking')

          await playBase64Audio(
            response.audio_base64,
            response.audio_format || 'mp3',
            () => {
              setIsCharacterSpeaking(false)
              isCharacterSpeakingRef.current = false
              setProcessingState('idle')
              // Start listening again
              setTimeout(() => startListening(), 500)
            }
          )
        } else {
          // No audio, just restart listening
          setProcessingState('idle')
          setTimeout(() => startListening(), 500)
        }
      } else {
        setProcessingState('idle')
        setTimeout(() => startListening(), 500)
      }
    } catch (err: any) {
      setError(err.message || 'Failed to process voice')
      setProcessingState('idle')
      // Try to continue listening
      setTimeout(() => startListening(), 1000)
    }
  }, [characterId, startListening, onUserMessage, onCharacterResponse])

  // Play character's opener (initial greeting)
  const playOpener = useCallback(async () => {
    const character = CHARACTERS[characterId]
    const openerText = character.getRandomOpener()

    setResponseText(openerText)
    setProcessingState('speaking')
    setIsCharacterSpeaking(true)
    isCharacterSpeakingRef.current = true

    // Add opener to conversation history
    conversationHistory.current.push({
      role: 'assistant',
      content: openerText,
    })
    onCharacterResponse?.(openerText)

    try {
      // TEMP: Bypass clerkId check for testing - REMOVE THIS LATER
      const BYPASS_AUTH = true
      if (!clerkId && !BYPASS_AUTH) {
        throw new Error('Not authenticated - missing clerkId')
      }

      // Generate opener audio via Edge Function (empty audio = just TTS)
      if (!authenticatedInvoke) {
        throw new Error('Not authenticated - missing getToken')
      }

      const { data, error } = await authenticatedInvoke('voice-turn', {
        body: {
          audio_base64: '', // Empty = skip STT
          character_id: characterId,
          system_prompt: getSystemPrompt(),
          conversation_history: [],
          generate_opener: true, // Flag to generate opener only
          opener_text: openerText,
        },
      })

      const openerResponse = data as VoiceTurnResponse | null

      if (error || !openerResponse?.audio_base64) {
        // Fallback: just skip audio and start listening
        setIsCharacterSpeaking(false)
        isCharacterSpeakingRef.current = false
        setProcessingState('idle')
        setTimeout(() => startListening(), 500)
        return
      }

      await playBase64Audio(openerResponse.audio_base64, openerResponse.audio_format || 'mp3', () => {
        setIsCharacterSpeaking(false)
        isCharacterSpeakingRef.current = false
        setProcessingState('idle')
        setTimeout(() => startListening(), 500)
      })
    } catch (err) {
      setIsCharacterSpeaking(false)
      isCharacterSpeakingRef.current = false
      setProcessingState('idle')
      setTimeout(() => startListening(), 500)
    }
  }, [characterId, getSystemPrompt, onCharacterResponse, startListening])

  // Start the call
  const startCall = useCallback(async () => {
    // Check if user can make a call
    if (canMakeCall && !canMakeCall()) {
      setError('No minutes remaining. Upgrade to premium!')
      return
    }

    setError(null)
    setCallState('calling')
    callStateRef.current = 'calling'
    setResponseText(null)
    conversationHistory.current = []

    try {
      // Request permissions
      const hasPermission = await requestPermissions()
      if (!hasPermission) {
        throw new Error('Microphone permission denied')
      }

      // Play ringtone
      await playRingtone()

      // Ring for 10-15 seconds (random for realism)
      const ringDuration = 10000 + Math.random() * 5000
      await new Promise((r) => setTimeout(r, ringDuration))

      // Stop ringtone
      await stopRingtone()
      await setupAudioMode()

      // Connect
      setCallState('connected')
      callStateRef.current = 'connected'
      callStartTime.current = Date.now()
      lastMinuteCount.current = 0

      // Start duration timer
      durationInterval.current = setInterval(() => {
        const elapsed = Math.floor((Date.now() - callStartTime.current) / 1000)
        setCallDuration(elapsed)

        // Increment minutes every 60 seconds
        const currentMinute = Math.floor(elapsed / 60)
        if (currentMinute > lastMinuteCount.current) {
          lastMinuteCount.current = currentMinute
          onMinuteUsed?.()
        }

        // Time limit check for free users
        // TEMP: Bypass time limit for testing - REMOVE THIS LATER
        const BYPASS_TIME_LIMIT = true
        if (!isPremium && !BYPASS_TIME_LIMIT) {
          const timeLimit = CONFIG.FREE_CALL_LIMIT_SECONDS
          const warningTime = timeLimit - CONFIG.WARNING_BEFORE_END_SECONDS

          // Show warning 1 minute before limit
          if (elapsed >= warningTime && elapsed < timeLimit) {
            const remaining = timeLimit - elapsed
            if (!timeWarningShown) {
              setTimeWarningShown(true)
              onTimeWarning?.(remaining)
            }
          }

          // Auto-end at time limit
          if (elapsed >= timeLimit) {
            onTimeLimitReached?.()
            setTimeout(() => {
              if (callStateRef.current === 'connected') {
                endCallRef.current?.()
              }
            }, 0)
          }
        }
      }, 1000)

      // Play opener
      await playOpener()
    } catch (err: any) {
      await stopRingtone()
      setError(err.message || 'Failed to start call')
      setCallState('idle')
      callStateRef.current = 'idle'
      setProcessingState('idle')
    }
  }, [
    characterId,
    canMakeCall,
    isPremium,
    onMinuteUsed,
    onTimeLimitReached,
    onTimeWarning,
    playRingtone,
    stopRingtone,
    playOpener,
  ])

  // End the call
  const endCall = useCallback(async () => {
    setCallState('ending')
    callStateRef.current = 'ending'
    setProcessingState('idle')
    setResponseText(null)
    setTimeWarningShown(false)
    isListeningRef.current = false

    // Clear timers
    if (silenceTimer.current) {
      clearTimeout(silenceTimer.current)
      silenceTimer.current = null
    }
    if (durationInterval.current) {
      clearInterval(durationInterval.current)
      durationInterval.current = null
    }

    // Stop ringtone if playing
    await stopRingtone()

    // Cancel recording
    await cancelRecording()
    setIsRecording(false)

    // Stop audio
    await stopAudio()
    setIsCharacterSpeaking(false)
    isCharacterSpeakingRef.current = false

    // Clear history
    conversationHistory.current = []

    setCallState('ended')
    callStateRef.current = 'ended'

    // Reset to idle after brief delay
    setTimeout(() => {
      setCallState('idle')
      callStateRef.current = 'idle'
      setCallDuration(0)
      lastMinuteCount.current = 0
    }, CONFIG.CALL_END_DELAY_MS)
  }, [callDuration, stopRingtone])

  // Toggle mute
  const toggleMute = useCallback(async () => {
    const newMuted = !isMuted
    setIsMuted(newMuted)
    isMutedRef.current = newMuted

    if (newMuted && isRecording) {
      isListeningRef.current = false
      if (silenceTimer.current) {
        clearTimeout(silenceTimer.current)
        silenceTimer.current = null
      }
      await cancelRecording()
      setIsRecording(false)
      setProcessingState('idle')
    } else if (!newMuted && callStateRef.current === 'connected' && !isCharacterSpeakingRef.current) {
      setTimeout(() => startListening(), 500)
    }
  }, [isMuted, isRecording, startListening])

  // Toggle speaker
  const toggleSpeaker = useCallback(() => {
    setIsSpeakerOn((prev) => !prev)
  }, [])

  // Clear error
  const clearError = useCallback(() => {
    setError(null)
  }, [])

  // Keep endCall ref updated
  useEffect(() => {
    endCallRef.current = endCall
  }, [endCall])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isListeningRef.current = false
      if (silenceTimer.current) clearTimeout(silenceTimer.current)
      if (durationInterval.current) clearInterval(durationInterval.current)
      cancelRecording()
      stopAudio()
      if (ringtoneSound.current) {
        ringtoneSound.current.stopAsync()
        ringtoneSound.current.unloadAsync()
      }
    }
  }, [])

  // Format duration
  const formattedDuration = `${Math.floor(callDuration / 60)}:${(callDuration % 60)
    .toString()
    .padStart(2, '0')}`

  return {
    // State
    callState,
    processingState,
    isMuted,
    isSpeakerOn,
    isRecording,
    isCharacterSpeaking,
    callDuration,
    formattedDuration,
    error,
    responseText,
    timeWarningShown,

    // Actions
    startCall,
    endCall,
    toggleMute,
    toggleSpeaker,
    clearError,
  }
}
