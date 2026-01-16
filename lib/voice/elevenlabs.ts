/**
 * @deprecated CLIENT-SIDE API - DO NOT USE IN PRODUCTION
 *
 * This file makes direct API calls to ElevenLabs using a client-embedded API key.
 * The key will be visible to anyone who decompiles the app bundle.
 *
 * For production deployments, use the server-side implementation instead:
 * - Hook: useHybridCall (hooks/useHybridCall.ts)
 * - Edge Function: supabase/functions/voice-turn/ (supports ElevenLabs + Sarvam AI)
 *
 * This file is kept for local development/testing convenience only.
 */

import * as FileSystem from 'expo-file-system/legacy'
import { CHARACTERS, DEFAULT_CHARACTER } from '@/constants/characters'
import { CONFIG } from '@/constants/config'
import type { CharacterId } from '@/types/character'

const ELEVENLABS_API_KEY = process.env.EXPO_PUBLIC_ELEVENLABS_API_KEY!

export async function generateVoice(text: string, characterId?: CharacterId): Promise<string> {
  try {
    const charId = characterId || DEFAULT_CHARACTER
    const character = CHARACTERS[charId]

    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${character.elevenlabsVoiceId}`,
      {
        method: 'POST',
        headers: {
          Accept: 'audio/mpeg',
          'Content-Type': 'application/json',
          'xi-api-key': ELEVENLABS_API_KEY,
        },
        body: JSON.stringify({
          text,
          model_id: CONFIG.ELEVENLABS_MODEL,
          voice_settings: character.elevenlabsVoiceSettings,
        }),
      }
    )

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`ElevenLabs API error: ${response.status} - ${errorText}`)
    }

    // Get the audio data as array buffer
    const audioData = await response.arrayBuffer()

    // Convert to base64
    const base64Audio = arrayBufferToBase64(audioData)

    // Save to file system
    const fileName = `voice_response_${Date.now()}.mp3`
    const fileUri = `${FileSystem.cacheDirectory}${fileName}`

    // Write base64 data to file
    await FileSystem.writeAsStringAsync(fileUri, base64Audio, {
      encoding: 'base64',
    })

    return fileUri
  } catch (error) {
    // [ElevenLabs] Error: Voice generation error:', error)
    throw error
  }
}

// Helper function to convert ArrayBuffer to base64
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)
  let binary = ''
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary)
}

// Clean up old audio files from cache
export async function cleanupAudioCache(): Promise<void> {
  try {
    const cacheDir = FileSystem.cacheDirectory
    if (!cacheDir) return

    // List all files in cache
    const files = await FileSystem.readDirectoryAsync(cacheDir)

    // Delete voice response files older than 1 hour
    const oneHourAgo = Date.now() - 60 * 60 * 1000

    for (const fileName of files) {
      if (fileName.startsWith('voice_response_')) {
        try {
          // Extract timestamp from filename
          const match = fileName.match(/voice_response_(\d+)\.mp3/)
          if (match) {
            const timestamp = parseInt(match[1], 10)
            if (timestamp < oneHourAgo) {
              await FileSystem.deleteAsync(`${cacheDir}${fileName}`, { idempotent: true })
            }
          }
        } catch {
          // Ignore errors for individual file deletions
        }
      }
    }
  } catch (error) {
    // [ElevenLabs] Error: Cache cleanup error:', error)
  }
}
