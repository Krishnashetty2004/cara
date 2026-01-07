/**
 * useRealtimeCall Hook
 *
 * Real-time voice calls using OpenAI Realtime API.
 * Provides sub-second latency with automatic voice activity detection.
 */

import { useState, useCallback, useRef, useEffect } from 'react'
import { Audio } from 'expo-av'
import * as FileSystem from 'expo-file-system/legacy'
import { OpenAIRealtimeClient, RealtimeEvent } from '@/lib/voice/realtime'
import { CONFIG } from '@/constants/config'
import type { CharacterId } from '@/types/character'
import type { UserMemory, RelationshipData } from '@/types/database'

export type CallState = 'idle' | 'connecting' | 'connected' | 'ending' | 'ended'
export type ProcessingState = 'idle' | 'listening' | 'thinking' | 'speaking'

interface UseRealtimeCallOptions {
  characterId: CharacterId
  getToken?: () => Promise<string | null> // Clerk getToken for authenticated Edge Function calls
  memory?: UserMemory | null
  relationship?: RelationshipData | null
  lastConversationSummary?: string | null
  isPremium?: boolean
  onMinuteUsed?: () => void
  onUserMessage?: (text: string) => void
  onCharacterResponse?: (text: string) => void
  onTimeWarning?: (secondsRemaining: number) => void
  onTimeLimitReached?: () => void
}

interface UseRealtimeCallReturn {
  // State
  callState: CallState
  processingState: ProcessingState
  isConnected: boolean
  isMuted: boolean
  isSpeakerOn: boolean
  isUserSpeaking: boolean
  isCharacterSpeaking: boolean
  callDuration: number
  formattedDuration: string
  error: string | null
  userTranscript: string
  characterResponse: string
  timeWarningShown: boolean

  // Actions
  startCall: () => Promise<void>
  endCall: () => Promise<void>
  toggleMute: () => void
  toggleSpeaker: () => void
  clearError: () => void
  interruptCharacter: () => void
}

const SAMPLE_RATE = 24000

export function useRealtimeCall(options: UseRealtimeCallOptions): UseRealtimeCallReturn {
  const {
    characterId,
    getToken,
    memory,
    relationship,
    lastConversationSummary,
    isPremium = false,
    onMinuteUsed,
    onUserMessage,
    onCharacterResponse,
    onTimeWarning,
    onTimeLimitReached,
  } = options

  // State
  const [callState, setCallState] = useState<CallState>('idle')
  const [processingState, setProcessingState] = useState<ProcessingState>('idle')
  const [isMuted, setIsMuted] = useState(false)
  const [isSpeakerOn, setIsSpeakerOn] = useState(true)
  const [isUserSpeaking, setIsUserSpeaking] = useState(false)
  const [isCharacterSpeaking, setIsCharacterSpeaking] = useState(false)
  const [callDuration, setCallDuration] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [userTranscript, setUserTranscript] = useState('')
  const [characterResponse, setCharacterResponse] = useState('')
  const [timeWarningShown, setTimeWarningShown] = useState(false)

  // Refs
  const clientRef = useRef<OpenAIRealtimeClient | null>(null)
  const recordingRef = useRef<Audio.Recording | null>(null)
  const durationIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const minuteIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const audioIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const isRecordingRef = useRef(false)
  const isMutedRef = useRef(false)
  const isProcessingChunkRef = useRef(false)
  const isStartingRecordingRef = useRef(false)

  // Format duration as MM:SS
  const formattedDuration = `${Math.floor(callDuration / 60)
    .toString()
    .padStart(2, '0')}:${(callDuration % 60).toString().padStart(2, '0')}`

  // Handle realtime events
  const handleRealtimeEvent = useCallback((event: RealtimeEvent) => {
    switch (event.type) {
      case 'connected':
        console.log('[useRealtimeCall] Connected')
        setCallState('connected')
        setProcessingState('listening')
        startRecording()
        break

      case 'disconnected':
        console.log('[useRealtimeCall] Disconnected')
        if (callState !== 'ending' && callState !== 'ended') {
          setError('Connection lost')
        }
        break

      case 'error':
        console.error('[useRealtimeCall] Error:', event.message)
        setError(event.message)
        break

      case 'speech_started':
        setIsUserSpeaking(true)
        setProcessingState('listening')
        // Interrupt character if speaking
        if (isCharacterSpeaking) {
          setIsCharacterSpeaking(false)
        }
        break

      case 'speech_stopped':
        setIsUserSpeaking(false)
        setProcessingState('thinking')
        break

      case 'transcription':
        if (event.isFinal && event.text) {
          setUserTranscript(event.text)
          onUserMessage?.(event.text)
        }
        break

      case 'response_started':
        setIsCharacterSpeaking(true)
        setProcessingState('speaking')
        setCharacterResponse('')
        break

      case 'response_text':
        if (event.isFinal) {
          setCharacterResponse(event.text)
          onCharacterResponse?.(event.text)
        } else {
          setCharacterResponse((prev) => prev + event.text)
        }
        break

      case 'response_done':
        setIsCharacterSpeaking(false)
        setProcessingState('listening')
        break
    }
  }, [callState, isCharacterSpeaking, onUserMessage, onCharacterResponse])

  // Recording preset for reuse
  const recordingOptions = {
    android: {
      extension: '.wav',
      outputFormat: Audio.AndroidOutputFormat.DEFAULT,
      audioEncoder: Audio.AndroidAudioEncoder.DEFAULT,
      sampleRate: SAMPLE_RATE,
      numberOfChannels: 1,
      bitRate: SAMPLE_RATE * 16,
    },
    ios: {
      extension: '.wav',
      outputFormat: Audio.IOSOutputFormat.LINEARPCM,
      audioQuality: Audio.IOSAudioQuality.HIGH,
      sampleRate: SAMPLE_RATE,
      numberOfChannels: 1,
      bitRate: SAMPLE_RATE * 16,
      linearPCMBitDepth: 16,
      linearPCMIsBigEndian: false,
      linearPCMIsFloat: false,
    },
    web: {
      mimeType: 'audio/wav',
      bitsPerSecond: SAMPLE_RATE * 16,
    },
  }

  // Start audio recording
  const startRecording = useCallback(async () => {
    // Prevent concurrent start calls
    if (isStartingRecordingRef.current) {
      console.log('[useRealtimeCall] Already starting recording, skipping...')
      return
    }
    if (isRecordingRef.current || isMutedRef.current) {
      console.log('[useRealtimeCall] Already recording or muted, skipping...')
      return
    }

    isStartingRecordingRef.current = true

    try {
      console.log('[useRealtimeCall] Starting recording...')

      // Clear any existing interval
      if (audioIntervalRef.current) {
        clearInterval(audioIntervalRef.current)
        audioIntervalRef.current = null
      }

      // Clean up any existing recording first - be very aggressive
      if (recordingRef.current) {
        try {
          await recordingRef.current.stopAndUnloadAsync()
        } catch (e) {
          // Try to force unload
          try {
            await recordingRef.current._cleanupForUnloadedRecorder()
          } catch (e2) {
            // Ignore
          }
        }
        recordingRef.current = null
      }

      // Reset audio mode completely before starting
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
        staysActiveInBackground: true,
        shouldDuckAndroid: true,
      })

      // Small delay to let audio system reset
      await new Promise(resolve => setTimeout(resolve, 100))

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        staysActiveInBackground: true,
        shouldDuckAndroid: true,
      })

      const recording = new Audio.Recording()
      await recording.prepareToRecordAsync(recordingOptions)
      await recording.startAsync()

      recordingRef.current = recording
      isRecordingRef.current = true
      isProcessingChunkRef.current = false

      // Set up periodic audio sending (every 250ms)
      audioIntervalRef.current = setInterval(async () => {
        // Skip if not recording, muted, or already processing a chunk
        if (!isRecordingRef.current || isMutedRef.current || isProcessingChunkRef.current) {
          return
        }

        // Skip if no recording ref
        if (!recordingRef.current) {
          return
        }

        isProcessingChunkRef.current = true

        try {
          // Capture the current recording reference
          const currentRecording = recordingRef.current
          recordingRef.current = null  // Clear ref immediately to prevent double processing

          // Stop and get audio from current recording
          const status = await currentRecording.getStatusAsync()
          if (!status.isRecording) {
            isProcessingChunkRef.current = false
            return
          }

          await currentRecording.stopAndUnloadAsync()
          const uri = currentRecording.getURI()

          if (uri && clientRef.current?.connected) {
            // Read and send audio
            const base64Audio = await FileSystem.readAsStringAsync(uri, {
              encoding: 'base64',
            })

            // Strip WAV header (44 bytes) and send PCM
            const pcm16 = stripWavHeader(base64Audio)
            if (pcm16) {
              clientRef.current.sendAudio(pcm16)
            }

            // Clean up file
            await FileSystem.deleteAsync(uri, { idempotent: true })
          }

          // Start new recording if still active (isRecordingRef is the flag, recordingRef is the object)
          if (isRecordingRef.current && !isMutedRef.current) {
            const newRecording = new Audio.Recording()
            await newRecording.prepareToRecordAsync(recordingOptions)
            await newRecording.startAsync()
            recordingRef.current = newRecording
          }
        } catch (error) {
          // Only log if it's not an expected "already unloaded" error
          const errorMessage = error instanceof Error ? error.message : String(error)
          if (!errorMessage.includes('already been unloaded')) {
            console.error('[useRealtimeCall] Audio chunk error:', error)
          }
        } finally {
          isProcessingChunkRef.current = false
        }
      }, 250)

      console.log('[useRealtimeCall] Recording started')
      isStartingRecordingRef.current = false
    } catch (error) {
      console.error('[useRealtimeCall] Start recording error:', error)
      isRecordingRef.current = false
      isStartingRecordingRef.current = false
    }
  }, [])

  // Stop recording
  const stopRecording = useCallback(async () => {
    console.log('[useRealtimeCall] Stopping recording...')
    isRecordingRef.current = false
    isStartingRecordingRef.current = false

    // Clear the audio interval first
    if (audioIntervalRef.current) {
      clearInterval(audioIntervalRef.current)
      audioIntervalRef.current = null
    }

    // Wait for any in-progress chunk processing to complete
    let waitCount = 0
    while (isProcessingChunkRef.current && waitCount < 10) {
      await new Promise(resolve => setTimeout(resolve, 50))
      waitCount++
    }

    if (recordingRef.current) {
      try {
        const status = await recordingRef.current.getStatusAsync()
        if (status.isRecording) {
          await recordingRef.current.stopAndUnloadAsync()
        }
        const uri = recordingRef.current.getURI()
        if (uri) {
          await FileSystem.deleteAsync(uri, { idempotent: true })
        }
      } catch (error) {
        // Ignore cleanup errors
      }
      recordingRef.current = null
    }
    console.log('[useRealtimeCall] Recording stopped')
  }, [])

  // Start call
  const startCall = useCallback(async () => {
    console.log('[useRealtimeCall] Starting call...')
    setCallState('connecting')
    setError(null)
    setUserTranscript('')
    setCharacterResponse('')
    setCallDuration(0)
    setTimeWarningShown(false)

    try {
      // Request permissions
      const permission = await Audio.requestPermissionsAsync()
      if (!permission.granted) {
        setError('Microphone permission required')
        setCallState('idle')
        return
      }

      // Create realtime client
      const client = new OpenAIRealtimeClient({
        characterId,
        getToken,
        onEvent: handleRealtimeEvent,
        memory,
        relationship,
        lastConversationSummary,
      })

      clientRef.current = client

      // Connect
      const connected = await client.connect()
      if (!connected) {
        setError('Failed to connect')
        setCallState('idle')
        return
      }

      // Start duration timer
      durationIntervalRef.current = setInterval(() => {
        setCallDuration((prev) => {
          const newDuration = prev + 1

          // Check time limit for free users
          if (!isPremium) {
            const secondsRemaining = CONFIG.FREE_CALL_LIMIT_SECONDS - newDuration

            if (secondsRemaining <= CONFIG.WARNING_BEFORE_END_SECONDS && !timeWarningShown) {
              setTimeWarningShown(true)
              onTimeWarning?.(secondsRemaining)
            }

            if (secondsRemaining <= 0) {
              onTimeLimitReached?.()
              endCall()
            }
          }

          return newDuration
        })
      }, 1000)

      // Track minutes used
      minuteIntervalRef.current = setInterval(() => {
        onMinuteUsed?.()
      }, 60000)

    } catch (error) {
      console.error('[useRealtimeCall] Start call error:', error)
      setError('Failed to start call')
      setCallState('idle')
    }
  }, [characterId, getToken, memory, relationship, lastConversationSummary, isPremium, handleRealtimeEvent, onMinuteUsed, onTimeWarning, onTimeLimitReached, timeWarningShown])

  // End call
  const endCall = useCallback(async () => {
    console.log('[useRealtimeCall] Ending call...')
    setCallState('ending')

    // Clear timers
    if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current)
      durationIntervalRef.current = null
    }
    if (minuteIntervalRef.current) {
      clearInterval(minuteIntervalRef.current)
      minuteIntervalRef.current = null
    }

    // Stop recording
    await stopRecording()

    // Disconnect client
    if (clientRef.current) {
      await clientRef.current.disconnect()
      clientRef.current = null
    }

    setIsUserSpeaking(false)
    setIsCharacterSpeaking(false)
    setProcessingState('idle')
    setCallState('ended')
  }, [stopRecording])

  // Toggle mute
  const toggleMute = useCallback(() => {
    setIsMuted((prev) => {
      const newMuted = !prev
      isMutedRef.current = newMuted

      if (newMuted) {
        stopRecording()
      } else if (callState === 'connected') {
        startRecording()
      }

      return newMuted
    })
  }, [callState, startRecording, stopRecording])

  // Toggle speaker
  const toggleSpeaker = useCallback(() => {
    setIsSpeakerOn((prev) => !prev)
  }, [])

  // Clear error
  const clearError = useCallback(() => {
    setError(null)
  }, [])

  // Interrupt character
  const interruptCharacter = useCallback(() => {
    if (clientRef.current && isCharacterSpeaking) {
      clientRef.current.cancelResponse()
      setIsCharacterSpeaking(false)
      setProcessingState('listening')
    }
  }, [isCharacterSpeaking])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current)
      }
      if (minuteIntervalRef.current) {
        clearInterval(minuteIntervalRef.current)
      }
      if (audioIntervalRef.current) {
        clearInterval(audioIntervalRef.current)
      }
      isRecordingRef.current = false
      stopRecording()
      clientRef.current?.disconnect()
    }
  }, [stopRecording])

  return {
    callState,
    processingState,
    isConnected: callState === 'connected',
    isMuted,
    isSpeakerOn,
    isUserSpeaking,
    isCharacterSpeaking,
    callDuration,
    formattedDuration,
    error,
    userTranscript,
    characterResponse,
    timeWarningShown,
    startCall,
    endCall,
    toggleMute,
    toggleSpeaker,
    clearError,
    interruptCharacter,
  }
}

// Helper function to strip WAV header and get PCM16 data
function stripWavHeader(base64Wav: string): string | null {
  try {
    const binaryString = atob(base64Wav)
    const bytes = new Uint8Array(binaryString.length)
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i)
    }

    // Skip 44-byte WAV header
    if (bytes.length <= 44) return null

    const pcmBytes = bytes.slice(44)

    let binary = ''
    for (let i = 0; i < pcmBytes.length; i++) {
      binary += String.fromCharCode(pcmBytes[i])
    }

    return btoa(binary)
  } catch (error) {
    return null
  }
}
