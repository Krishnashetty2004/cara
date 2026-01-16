/**
 * @deprecated CLIENT-SIDE API - DO NOT USE IN PRODUCTION
 *
 * This file makes direct API calls to OpenAI Whisper using a client-embedded API key.
 * The key will be visible to anyone who decompiles the app bundle.
 *
 * For production deployments, use the server-side implementation instead:
 * - Hook: useHybridCall (hooks/useHybridCall.ts)
 * - Edge Function: supabase/functions/voice-turn/ (uses Groq Whisper - 10x faster)
 *
 * This file is kept for local development/testing convenience only.
 */

import * as FileSystem from 'expo-file-system/legacy'
import { CONFIG } from '@/constants/config'

const OPENAI_API_KEY = process.env.EXPO_PUBLIC_OPENAI_API_KEY!

export async function transcribeAudio(audioUri: string): Promise<string> {
  try {
    // Check if file exists
    const fileInfo = await FileSystem.getInfoAsync(audioUri)
    if (!fileInfo.exists) {
      throw new Error('Audio file not found')
    }

    // Create form data with the audio file
    const formData = new FormData()
    formData.append('file', {
      uri: audioUri,
      type: 'audio/m4a',
      name: 'recording.m4a',
    } as any)
    formData.append('model', CONFIG.WHISPER_MODEL)
    formData.append('language', 'en') // Handles Hinglish well

    const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: formData,
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Whisper API error: ${response.status} - ${errorText}`)
    }

    const data = await response.json()
    return data.text || ''
  } catch (error) {
    // [Whisper] Error: Transcription error:', error)
    throw error
  }
}
