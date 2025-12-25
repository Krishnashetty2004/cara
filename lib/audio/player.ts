import { Audio, AVPlaybackStatus } from 'expo-av'

let currentSound: Audio.Sound | null = null

export async function setupPlaybackMode(useSpeaker: boolean = true): Promise<void> {
  try {
    await Audio.setAudioModeAsync({
      allowsRecordingIOS: false,
      playsInSilentModeIOS: true,
      staysActiveInBackground: true,
      playThroughEarpieceAndroid: !useSpeaker,
    })
  } catch (error) {
    console.error('[Player] Playback mode setup error:', error)
    throw error
  }
}

export async function playAudio(
  uri: string,
  onPlaybackFinished?: () => void
): Promise<Audio.Sound> {
  try {
    // Stop any currently playing audio
    await stopAudio()

    // Setup playback mode
    await setupPlaybackMode()

    const { sound } = await Audio.Sound.createAsync(
      { uri },
      { shouldPlay: true, volume: 1.0 }
    )

    currentSound = sound

    // Set up playback status listener
    sound.setOnPlaybackStatusUpdate((status: AVPlaybackStatus) => {
      if (status.isLoaded && status.didJustFinish) {
        onPlaybackFinished?.()
      }
    })

    return sound
  } catch (error) {
    console.error('[Player] Play audio error:', error)
    throw error
  }
}

export async function stopAudio(): Promise<void> {
  try {
    if (currentSound) {
      await currentSound.stopAsync()
      await currentSound.unloadAsync()
      currentSound = null
    }
  } catch (error) {
    console.error('[Player] Stop audio error:', error)
    currentSound = null
  }
}

export async function pauseAudio(): Promise<void> {
  try {
    if (currentSound) {
      await currentSound.pauseAsync()
    }
  } catch (error) {
    console.error('[Player] Pause audio error:', error)
  }
}

export async function resumeAudio(): Promise<void> {
  try {
    if (currentSound) {
      await currentSound.playAsync()
    }
  } catch (error) {
    console.error('[Player] Resume audio error:', error)
  }
}

export async function setVolume(volume: number): Promise<void> {
  try {
    if (currentSound) {
      await currentSound.setVolumeAsync(Math.max(0, Math.min(1, volume)))
    }
  } catch (error) {
    console.error('[Player] Set volume error:', error)
  }
}

export function isPlaying(): boolean {
  return currentSound !== null
}
