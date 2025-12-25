// Re-export from new location for backwards compatibility
// TODO: Update all imports to use @/constants/characters and remove this file

export { PreethiCharacter } from './characters/preethi'

// Legacy exports for backwards compatibility
import { PreethiCharacter } from './characters/preethi'

export const ELEVENLABS_VOICE_ID = PreethiCharacter.elevenlabsVoiceId
export const ELEVENLABS_VOICE_SETTINGS = PreethiCharacter.elevenlabsVoiceSettings

export function getPreethiSystemPrompt() {
  return PreethiCharacter.getSystemPrompt(null, null, null)
}

export function getPersonalizedPrompt(
  memory: import('@/types/database').UserMemory | null,
  relationship: import('@/types/database').RelationshipData | null,
  lastConversationSummary: string | null
) {
  return PreethiCharacter.getSystemPrompt(memory, relationship, lastConversationSummary)
}

export const PREETHI_OPENERS = PreethiCharacter.getOpeners()

export function getRandomOpener() {
  return PreethiCharacter.getRandomOpener()
}
