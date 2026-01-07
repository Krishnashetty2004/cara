import type { UserMemory, RelationshipData } from './database'

export type CharacterId = 'preethi' | 'ira' | 'riya'

export interface VoiceSettings {
  stability: number
  similarity_boost: number
  style: number
  use_speaker_boost: boolean
}

export type TTSProvider = 'elevenlabs' | 'sarvam'

export interface CharacterConfig {
  id: CharacterId
  name: string
  tagline: string
  // ElevenLabs config (for Preethi, Ira)
  elevenlabsVoiceId?: string
  elevenlabsVoiceSettings?: VoiceSettings
  // Sarvam AI config (for Riya - Telugu)
  sarvamVoiceId?: string
  sarvamModel?: string
  ttsProvider?: TTSProvider
  avatarImage: any // require() result for static image
  getSystemPrompt: (
    memory: UserMemory | null,
    relationship: RelationshipData | null,
    lastConversationSummary: string | null
  ) => string
  getOpeners: () => string[]
  getRandomOpener: () => string
}

// Character registry type
export type CharacterRegistry = Record<CharacterId, CharacterConfig>
