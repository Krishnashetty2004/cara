import { useState, useRef, useCallback, useEffect } from 'react'
import { Audio } from 'expo-av'
import {
  processVoiceInput,
  generateCharacterVoice,
  resetConversation,
  cleanupAudioCache,
} from '@/lib/voice/pipeline'
import { setCurrentCharacter } from '@/lib/voice/chat'
import {
  requestPermissions,
  setupAudioMode,
  startRecording as startAudioRecording,
  stopRecording as stopAudioRecording,
  cancelRecording,
} from '@/lib/audio/recorder'
import { playAudio, stopAudio } from '@/lib/audio/player'
import { CHARACTERS, DEFAULT_CHARACTER } from '@/constants/characters'
import { CONFIG } from '@/constants/config'
import type { CallState } from '@/types'
import type { CharacterId } from '@/types/character'

// Processing states for visual feedback
export type ProcessingState = 'idle' | 'listening' | 'thinking' | 'speaking'

interface UseCallOptions {
  characterId?: CharacterId
  onMinuteUsed?: () => void
  canMakeCall?: () => boolean
  onUserMessage?: (text: string) => void
  onCharacterResponse?: (text: string) => void
  isPremium?: boolean
  onTimeLimitReached?: () => void
  onTimeWarning?: (secondsRemaining: number) => void
}

// Pre-cached opener for instant playback
let cachedOpenerAudio: string | null = null
let cachedOpenerText: string | null = null
let cachedOpenerCharacterId: CharacterId | null = null

// Pre-generate opener audio in background
async function preCacheOpener(characterId: CharacterId = DEFAULT_CHARACTER) {
  try {
    const character = CHARACTERS[characterId]
    const opener = character.getRandomOpener()
    cachedOpenerText = opener
    cachedOpenerCharacterId = characterId
    cachedOpenerAudio = await generateCharacterVoice(opener, characterId)
    console.log(`[useCall] Opener pre-cached for ${characterId}:`, opener.substring(0, 30) + '...')
  } catch (err) {
    console.error('[useCall] Failed to pre-cache opener:', err)
    cachedOpenerAudio = null
    cachedOpenerText = null
    cachedOpenerCharacterId = null
  }
}

export function useCall(options: UseCallOptions = {}) {
  const {
    characterId = DEFAULT_CHARACTER,
    onMinuteUsed,
    canMakeCall,
    onUserMessage,
    onCharacterResponse,
    isPremium = false,
    onTimeLimitReached,
    onTimeWarning,
  } = options

  // Set the current character in the chat module
  useEffect(() => {
    setCurrentCharacter(characterId)
  }, [characterId])

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
  useEffect(() => {
    callStateRef.current = callState
  }, [callState])

  useEffect(() => {
    isMutedRef.current = isMuted
  }, [isMuted])

  useEffect(() => {
    isCharacterSpeakingRef.current = isCharacterSpeaking
  }, [isCharacterSpeaking])

  // Pre-cache opener on mount or character change
  useEffect(() => {
    preCacheOpener(characterId)
  }, [characterId])

  // Play ringtone
  const playRingtone = useCallback(async () => {
    try {
      const { sound } = await Audio.Sound.createAsync(
        require('@/assets/sounds/ringtone.mp3'),
        { shouldPlay: true, isLooping: true, volume: 0.7 }
      )
      ringtoneSound.current = sound
    } catch (err) {
      console.error('[useCall] Ringtone error:', err)
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
      console.error('[useCall] Stop ringtone error:', err)
    }
  }, [])

  // Start listening - using refs to avoid stale closures
  const startListening = useCallback(async () => {
    console.log('[useCall] startListening called', {
      isMuted: isMutedRef.current,
      isCharacterSpeaking: isCharacterSpeakingRef.current,
      callState: callStateRef.current,
      isListening: isListeningRef.current
    })

    if (isMutedRef.current || isCharacterSpeakingRef.current || callStateRef.current !== 'connected' || isListeningRef.current) {
      console.log('[useCall] Cannot start listening - conditions not met')
      return
    }

    try {
      isListeningRef.current = true
      await setupAudioMode()
      await startAudioRecording()
      setIsRecording(true)
      setProcessingState('listening')
      console.log('[useCall] Now listening...')

      // Auto-stop after 5 seconds
      silenceTimer.current = setTimeout(async () => {
        console.log('[useCall] Auto-stop after 5 seconds')
        if (isListeningRef.current) {
          await processRecording()
        }
      }, 5000)
    } catch (err: any) {
      console.error('[useCall] Start listening error:', err)
      isListeningRef.current = false
      setIsRecording(false)
      setProcessingState('idle')
    }
  }, [])

  // Process recording
  const processRecording = useCallback(async () => {
    if (!isListeningRef.current) return

    console.log('[useCall] Processing recording...')
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
      console.log('[useCall] Recording stopped, uri:', uri ? 'exists' : 'null')

      if (uri && callStateRef.current === 'connected') {
        // Process voice input through pipeline
        const { userText, responseText: text } = await processVoiceInput(uri)
        console.log('[useCall] Got response:', text.substring(0, 30) + '...')

        // Log user message for persistence
        if (userText && onUserMessage) {
          onUserMessage(userText)
        }

        // Show text immediately
        setResponseText(text)

        // Log character's response for persistence
        if (onCharacterResponse) {
          onCharacterResponse(text)
        }

        // Play character's response
        setIsCharacterSpeaking(true)
        isCharacterSpeakingRef.current = true
        setProcessingState('speaking')

        try {
          const audioUri = await generateCharacterVoice(text, characterId)
          await playAudio(audioUri, () => {
            console.log('[useCall] Character finished speaking')
            setIsCharacterSpeaking(false)
            isCharacterSpeakingRef.current = false
            setProcessingState('idle')
            // Start listening again after a short delay
            setTimeout(() => startListening(), 500)
          })
        } catch (err: any) {
          console.error('[useCall] Voice playback error:', err)
          setIsCharacterSpeaking(false)
          isCharacterSpeakingRef.current = false
          setProcessingState('idle')
          // Try to start listening anyway
          setTimeout(() => startListening(), 1000)
        }
      } else {
        setProcessingState('idle')
        // Start listening again
        setTimeout(() => startListening(), 500)
      }
    } catch (err: any) {
      console.error('[useCall] Process error:', err)
      setProcessingState('idle')
      // Start listening again even on error
      setTimeout(() => startListening(), 1000)
    }
  }, [characterId, startListening])

  // Start the call
  const startCall = useCallback(async () => {
    console.log('[useCall] Starting call...')

    // Check if user can make a call
    if (canMakeCall && !canMakeCall()) {
      setError('No minutes remaining. Upgrade to premium!')
      return
    }

    setError(null)
    setCallState('calling')
    callStateRef.current = 'calling'
    setResponseText(null)
    resetConversation()

    try {
      // Request permissions and setup audio
      const hasPermission = await requestPermissions()
      if (!hasPermission) {
        throw new Error('Microphone permission denied')
      }

      // Play ringtone
      await playRingtone()

      // Ring for 10-15 seconds (random)
      const ringDuration = 10000 + Math.random() * 5000
      console.log('[useCall] Ringing for', ringDuration, 'ms')
      await new Promise((r) => setTimeout(r, ringDuration))

      // Stop ringtone and setup audio mode
      await stopRingtone()
      await setupAudioMode()

      // Connect
      setCallState('connected')
      callStateRef.current = 'connected'
      callStartTime.current = Date.now()
      lastMinuteCount.current = 0
      console.log('[useCall] Connected!')

      // Start duration timer
      durationInterval.current = setInterval(() => {
        const elapsed = Math.floor(
          (Date.now() - callStartTime.current) / 1000
        )
        setCallDuration(elapsed)

        // Increment minutes every 60 seconds
        const currentMinute = Math.floor(elapsed / 60)
        if (currentMinute > lastMinuteCount.current) {
          lastMinuteCount.current = currentMinute
          onMinuteUsed?.()
        }

        // Time limit check for free users
        if (!isPremium) {
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
            console.log('[useCall] Time limit reached, ending call')
            onTimeLimitReached?.()
            // Call endCall but we need to do it outside the interval
            setTimeout(() => {
              if (callStateRef.current === 'connected') {
                endCallRef.current?.()
              }
            }, 0)
          }
        }
      }, 1000)

      // Get opener - always fresh random one
      const character = CHARACTERS[characterId]
      let openerText: string
      let openerAudio: string | null = null

      // Use cached opener only if it's for the same character
      if (cachedOpenerAudio && cachedOpenerText && cachedOpenerCharacterId === characterId) {
        openerText = cachedOpenerText
        openerAudio = cachedOpenerAudio
        // Clear cache so next call gets fresh opener
        cachedOpenerAudio = null
        cachedOpenerText = null
        cachedOpenerCharacterId = null
        // Pre-cache next opener in background
        preCacheOpener(characterId)
      } else {
        openerText = character.getRandomOpener()
        console.log(`[useCall] Generating fresh opener for ${characterId}:`, openerText.substring(0, 30) + '...')
      }

      setResponseText(openerText)
      setProcessingState('speaking')
      setIsCharacterSpeaking(true)
      isCharacterSpeakingRef.current = true

      // Log opener as character's first message
      if (onCharacterResponse) {
        onCharacterResponse(openerText)
      }

      // Generate audio if not cached
      if (!openerAudio) {
        openerAudio = await generateCharacterVoice(openerText, characterId)
      }

      // Play opener
      await playAudio(openerAudio, () => {
        console.log('[useCall] Opener finished, starting to listen')
        setIsCharacterSpeaking(false)
        isCharacterSpeakingRef.current = false
        setProcessingState('idle')
        // Start listening after character speaks
        setTimeout(() => startListening(), 500)
      })

    } catch (err: any) {
      console.error('[useCall] Start call error:', err)
      await stopRingtone()
      setError(err.message || 'Failed to start call')
      setCallState('idle')
      callStateRef.current = 'idle'
      setProcessingState('idle')
    }
  }, [characterId, canMakeCall, onMinuteUsed, playRingtone, stopRingtone, startListening])

  // End the call
  const endCall = useCallback(async () => {
    console.log('[useCall] Ending call...')
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

    // Stop ringtone if still playing
    await stopRingtone()

    // Cancel any ongoing recording
    await cancelRecording()
    setIsRecording(false)

    // Stop any playing audio
    await stopAudio()
    setIsCharacterSpeaking(false)
    isCharacterSpeakingRef.current = false

    // Reset conversation
    resetConversation()

    // Final minute count
    const totalMinutes = Math.ceil(callDuration / 60)
    console.log(`[useCall] Call ended: ${totalMinutes} minutes`)

    setCallState('ended')
    callStateRef.current = 'ended'

    // Clean up audio cache in background
    cleanupAudioCache().catch(() => {})

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
      // Resume listening when unmuted
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

  // Keep endCall ref updated for use in interval
  useEffect(() => {
    endCallRef.current = endCall
  }, [endCall])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isListeningRef.current = false
      if (silenceTimer.current) {
        clearTimeout(silenceTimer.current)
      }
      if (durationInterval.current) {
        clearInterval(durationInterval.current)
      }
      cancelRecording()
      stopAudio()
      if (ringtoneSound.current) {
        ringtoneSound.current.stopAsync()
        ringtoneSound.current.unloadAsync()
      }
    }
  }, [])

  // Format duration for display
  const formattedDuration = `${Math.floor(callDuration / 60)}:${(
    callDuration % 60
  )
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
