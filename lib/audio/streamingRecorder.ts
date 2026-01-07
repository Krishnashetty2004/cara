/**
 * Streaming Audio Recorder
 *
 * Captures audio in real-time and provides PCM16 chunks for streaming.
 * Uses expo-av with chunked recording for React Native compatibility.
 */

import { Audio } from 'expo-av'
import * as FileSystem from 'expo-file-system/legacy'

const CHUNK_DURATION_MS = 100 // Send audio every 100ms for low latency
const SAMPLE_RATE = 24000 // Required by OpenAI Realtime API

export interface StreamingRecorderOptions {
  onAudioChunk: (base64PCM: string) => void
  onError: (error: string) => void
  onSilenceDetected?: () => void
}

class StreamingAudioRecorder {
  private recording: Audio.Recording | null = null
  private isRecording: boolean = false
  private chunkInterval: ReturnType<typeof setInterval> | null = null
  private options: StreamingRecorderOptions
  private lastChunkUri: string | null = null

  constructor(options: StreamingRecorderOptions) {
    this.options = options
  }

  async start(): Promise<boolean> {
    try {
      console.log('[StreamingRecorder] Starting...')

      // Request permissions
      const permission = await Audio.requestPermissionsAsync()
      if (!permission.granted) {
        this.options.onError('Microphone permission denied')
        return false
      }

      // Configure audio mode for recording
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        staysActiveInBackground: true,
        shouldDuckAndroid: true,
      })

      // Start recording with PCM-compatible settings
      this.recording = new Audio.Recording()

      await this.recording.prepareToRecordAsync({
        android: {
          extension: '.wav',
          outputFormat: Audio.AndroidOutputFormat.DEFAULT,
          audioEncoder: Audio.AndroidAudioEncoder.DEFAULT,
          sampleRate: SAMPLE_RATE,
          numberOfChannels: 1,
          bitRate: SAMPLE_RATE * 16, // 16-bit
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
      })

      await this.recording.startAsync()
      this.isRecording = true

      console.log('[StreamingRecorder] Recording started')
      return true

    } catch (error) {
      console.error('[StreamingRecorder] Start error:', error)
      this.options.onError('Failed to start recording')
      return false
    }
  }

  async stop(): Promise<string | null> {
    if (!this.isRecording || !this.recording) {
      return null
    }

    try {
      console.log('[StreamingRecorder] Stopping...')

      this.isRecording = false

      if (this.chunkInterval) {
        clearInterval(this.chunkInterval)
        this.chunkInterval = null
      }

      await this.recording.stopAndUnloadAsync()
      const uri = this.recording.getURI()
      this.recording = null

      // Reset audio mode
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
        staysActiveInBackground: true,
        shouldDuckAndroid: true,
      })

      console.log('[StreamingRecorder] Stopped, URI:', uri)
      return uri

    } catch (error) {
      console.error('[StreamingRecorder] Stop error:', error)
      return null
    }
  }

  async cancel() {
    this.isRecording = false

    if (this.chunkInterval) {
      clearInterval(this.chunkInterval)
      this.chunkInterval = null
    }

    if (this.recording) {
      try {
        await this.recording.stopAndUnloadAsync()
      } catch (error) {
        // Ignore errors during cancel
      }
      this.recording = null
    }
  }

  get recording_active(): boolean {
    return this.isRecording
  }
}

/**
 * Convert WAV file to base64 PCM16 data (strips WAV header)
 */
export async function wavToPCM16Base64(wavUri: string): Promise<string> {
  try {
    const base64Wav = await FileSystem.readAsStringAsync(wavUri, {
      encoding: 'base64',
    })

    // WAV header is 44 bytes, skip it to get raw PCM data
    // But base64 encoding changes the byte alignment, so we decode, strip, re-encode
    const binaryString = atob(base64Wav)
    const bytes = new Uint8Array(binaryString.length)
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i)
    }

    // Skip 44-byte WAV header
    const pcmBytes = bytes.slice(44)

    // Convert back to base64
    let binary = ''
    for (let i = 0; i < pcmBytes.length; i++) {
      binary += String.fromCharCode(pcmBytes[i])
    }

    return btoa(binary)
  } catch (error) {
    console.error('[StreamingRecorder] WAV to PCM conversion error:', error)
    throw error
  }
}

/**
 * Simple recorder that captures full audio and converts to PCM16
 */
export async function recordAndGetPCM16(
  durationMs: number = 5000
): Promise<{ uri: string; pcm16Base64: string } | null> {
  try {
    const permission = await Audio.requestPermissionsAsync()
    if (!permission.granted) {
      throw new Error('Microphone permission denied')
    }

    await Audio.setAudioModeAsync({
      allowsRecordingIOS: true,
      playsInSilentModeIOS: true,
      staysActiveInBackground: true,
      shouldDuckAndroid: true,
    })

    const recording = new Audio.Recording()

    await recording.prepareToRecordAsync({
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
    })

    await recording.startAsync()

    // Wait for duration
    await new Promise((resolve) => setTimeout(resolve, durationMs))

    await recording.stopAndUnloadAsync()
    const uri = recording.getURI()

    if (!uri) {
      throw new Error('No recording URI')
    }

    await Audio.setAudioModeAsync({
      allowsRecordingIOS: false,
      playsInSilentModeIOS: true,
      staysActiveInBackground: true,
      shouldDuckAndroid: true,
    })

    const pcm16Base64 = await wavToPCM16Base64(uri)

    return { uri, pcm16Base64 }
  } catch (error) {
    console.error('[StreamingRecorder] Record error:', error)
    return null
  }
}

export { StreamingAudioRecorder }
