import { Audio } from 'expo-av'

let currentRecording: Audio.Recording | null = null

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

export async function startRecording(): Promise<Audio.Recording> {
  try {
    // Stop any existing recording first
    if (currentRecording) {
      await stopRecording()
    }

    // Ensure audio mode is set for recording
    await setupAudioMode()

    const { recording } = await Audio.Recording.createAsync(
      Audio.RecordingOptionsPresets.HIGH_QUALITY
    )

    currentRecording = recording
    return recording
  } catch (error) {
    console.error('[Recorder] Start recording error:', error)
    throw error
  }
}

export async function stopRecording(): Promise<string | null> {
  try {
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
    if (currentRecording) {
      await currentRecording.stopAndUnloadAsync()
      currentRecording = null
    }
  } catch (error) {
    console.error('[Recorder] Cancel recording error:', error)
    currentRecording = null
  }
}
