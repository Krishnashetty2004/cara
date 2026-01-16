/**
 * @deprecated CLIENT-SIDE VOICE PIPELINE - DO NOT USE IN PRODUCTION
 *
 * This file orchestrates client-side API calls (Whisper STT, OpenAI Chat, ElevenLabs TTS).
 * All underlying modules use client-embedded API keys that are visible in the app bundle.
 *
 * For production deployments, use the server-side implementation instead:
 * - Hook: useHybridCall (hooks/useHybridCall.ts)
 * - Edge Function: supabase/functions/voice-turn/
 *
 * The server-side implementation is also faster (uses Groq for inference).
 *
 * This file is kept for local development/testing convenience only.
 */

import { transcribeAudio } from './whisper'
import { getCharacterResponse, resetConversation as resetChat, getConversationHistory, getCurrentCharacter } from './chat'
import { generateVoice, cleanupAudioCache } from './elevenlabs'
import type { VoicePipelineResult } from '@/types'
import type { CharacterId } from '@/types/character'

export { resetChat as resetConversation, getConversationHistory }

// Full pipeline: User audio -> Transcribe -> Get response -> Generate voice
export async function processVoiceInput(audioUri: string, characterId?: CharacterId): Promise<VoicePipelineResult> {
  const charId = characterId || getCurrentCharacter()

  // Step 1: Transcribe user audio
  // [Pipeline] Transcribing audio...')
  const userText = await transcribeAudio(audioUri)
  // [Pipeline] User said:', userText)

  // Skip if transcription is empty or too short
  if (!userText || userText.trim().length < 2) {
    throw new Error('Could not understand audio')
  }

  // Step 2: Get character's text response
  console.log(`[Pipeline] Getting ${charId} response...`)
  const responseText = await getCharacterResponse(userText, charId)
  console.log(`[Pipeline] ${charId} says:`, responseText)

  // Step 3: Generate character's voice
  // [Pipeline] Generating voice...')
  const responseAudioUri = await generateVoice(responseText, charId)
  // [Pipeline] Audio generated:', responseAudioUri)

  return {
    userText,
    responseText,
    audioUri: responseAudioUri,
  }
}

// Generate voice for a specific text (used for openers)
export async function generateCharacterVoice(text: string, characterId?: CharacterId): Promise<string> {
  const charId = characterId || getCurrentCharacter()
  return generateVoice(text, charId)
}

// Legacy function for backwards compatibility
export async function generatePreethiVoice(text: string): Promise<string> {
  return generateVoice(text, 'preethi')
}

// Export cleanup function
export { cleanupAudioCache }
