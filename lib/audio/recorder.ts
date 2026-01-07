import { Audio } from 'expo-av'
import { Platform } from 'react-native'

let currentRecording: Audio.Recording | null = null
let silenceCallback: (() => void) | null = null
let silenceTimer: ReturnType<typeof setTimeout> | null = null
let lastSpeechTime: number = 0
let recordingStartTime: number = 0
let hasReceivedValidMetering: boolean = false
let meteringCheckCount: number = 0

// VAD Configuration - different for iOS and Android
const VAD_CONFIG = {
  // Minimum audio level to consider as speech (in dB, typically -160 to 0)
  // iOS: -35 works well, Android: -40 (more sensitive due to different calibration)
  SILENCE_THRESHOLD: Platform.OS === 'ios' ? -35 : -40,
  // How long silence must last before we consider user done speaking (ms)
  SILENCE_DURATION: 1500,
  // Minimum recording time before VAD can trigger (ms)
  MIN_RECORDING_TIME: 1000,
  // Fallback timeout if metering doesn't work (Android issue) - 4 seconds
  ANDROID_FALLBACK_TIMEOUT: 4000,
  // Number of metering updates to check before falling back
  METERING_CHECK_THRESHOLD: 10,
}

export async function requestPermissions(): Promise<boolean> {
  try {
    const { granted } = await Audio.requestPermissionsAsync()
    return granted
  } catch (error) {
    console.error('[Recorder] Permission request error:', error)
    return false
  }
}

export async function setupAudioMode(): Promise<void> {
  try {
    await Audio.setAudioModeAsync({
      allowsRecordingIOS: true,
      playsInSilentModeIOS: true,
      staysActiveInBackground: true,
      playThroughEarpieceAndroid: false,
    })
  } catch (error) {
    console.error('[Recorder] Audio mode setup error:', error)
    throw error
  }
}

export async function startRecording(onSilenceDetected?: () => void): Promise<Audio.Recording> {
  try {
    // Stop any existing recording first
    if (currentRecording) {
      await stopRecording()
    }

    // Ensure audio mode is set for recording
    await setupAudioMode()

    // Reset VAD state
    silenceCallback = onSilenceDetected || null
    lastSpeechTime = Date.now()
    recordingStartTime = Date.now()
    hasReceivedValidMetering = false
    meteringCheckCount = 0

    // Create recording with metering enabled for VAD
    const { recording } = await Audio.Recording.createAsync(
      {
        ...Audio.RecordingOptionsPresets.HIGH_QUALITY,
        android: {
          ...Audio.RecordingOptionsPresets.HIGH_QUALITY.android,
          numberOfChannels: 1,
          bitRate: 128000,
          sampleRate: 44100,
        },
        ios: {
          ...Audio.RecordingOptionsPresets.HIGH_QUALITY.ios,
          numberOfChannels: 1,
          bitRate: 128000,
          sampleRate: 44100,
        },
        isMeteringEnabled: true, // Enable audio level metering for VAD
      },
      onRecordingStatusUpdate // VAD callback
    )

    currentRecording = recording

    // Android fallback: If metering doesn't work, use fixed timeout
    if (Platform.OS === 'android' && onSilenceDetected) {
      setTimeout(() => {
        // Check if we never received valid metering data
        if (!hasReceivedValidMetering && silenceCallback) {
          console.log('[Recorder] Android: No valid metering, using fallback timeout')
          silenceCallback()
        }
      }, VAD_CONFIG.ANDROID_FALLBACK_TIMEOUT)
    }

    return recording
  } catch (error) {
    console.error('[Recorder] Start recording error:', error)
    throw error
  }
}

// VAD: Called on each recording status update with audio levels
function onRecordingStatusUpdate(status: Audio.RecordingStatus) {
  if (!status.isRecording) {
    return
  }

  meteringCheckCount++
  const currentTime = Date.now()
  const recordingDuration = currentTime - recordingStartTime

  // Get audio level (in dB, typically -160 to 0)
  // -160 means no metering data (Android bug)
  const audioLevel = status.metering ?? -160

  // Check if we're receiving valid metering data (not stuck at -160 or undefined)
  if (audioLevel > -150) {
    hasReceivedValidMetering = true
  }

  // Log metering occasionally for debugging
  if (meteringCheckCount % 20 === 0) {
    console.log(`[Recorder] VAD metering: ${audioLevel.toFixed(1)} dB, valid: ${hasReceivedValidMetering}`)
  }

  // If metering is invalid (Android bug), don't process VAD
  if (audioLevel <= -150) {
    return
  }

  // Check if audio level indicates speech
  if (audioLevel > VAD_CONFIG.SILENCE_THRESHOLD) {
    // User is speaking - reset silence timer
    lastSpeechTime = currentTime

    if (silenceTimer) {
      clearTimeout(silenceTimer)
      silenceTimer = null
    }
  } else {
    // Silence detected - check if it's been long enough
    const silenceDuration = currentTime - lastSpeechTime

    // Only trigger if:
    // 1. We've been recording for minimum time
    // 2. Silence has lasted long enough
    // 3. We haven't already scheduled a callback
    if (
      recordingDuration > VAD_CONFIG.MIN_RECORDING_TIME &&
      silenceDuration >= VAD_CONFIG.SILENCE_DURATION &&
      !silenceTimer &&
      silenceCallback
    ) {
      console.log('[Recorder] VAD: Silence detected after', silenceDuration, 'ms, stopping recording')
      silenceTimer = setTimeout(() => {
        if (silenceCallback) {
          silenceCallback()
        }
      }, 100) // Small delay to ensure we capture any trailing audio
    }
  }
}

export async function stopRecording(): Promise<string | null> {
  try {
    // Clear VAD state
    if (silenceTimer) {
      clearTimeout(silenceTimer)
      silenceTimer = null
    }
    silenceCallback = null
    hasReceivedValidMetering = false
    meteringCheckCount = 0

    if (!currentRecording) {
      return null
    }

    await currentRecording.stopAndUnloadAsync()
    const uri = currentRecording.getURI()
    currentRecording = null

    return uri
  } catch (error) {
    console.error('[Recorder] Stop recording error:', error)
    currentRecording = null
    throw error
  }
}

export function isRecording(): boolean {
  return currentRecording !== null
}

export async function cancelRecording(): Promise<void> {
  try {
    // Clear VAD state
    if (silenceTimer) {
      clearTimeout(silenceTimer)
      silenceTimer = null
    }
    silenceCallback = null
    hasReceivedValidMetering = false
    meteringCheckCount = 0

    if (currentRecording) {
      await currentRecording.stopAndUnloadAsync()
      currentRecording = null
    }
  } catch (error) {
    console.error('[Recorder] Cancel recording error:', error)
    currentRecording = null
  }
}

// Export VAD config for external adjustment if needed
export { VAD_CONFIG }
