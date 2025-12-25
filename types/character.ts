import type { UserMemory, RelationshipData } from './database'

export type CharacterId = 'preethi' | 'ira'

export interface VoiceSettings {
  stability: number
  similarity_boost: number
  style: number
  use_speaker_boost: boolean
}

export interface CharacterConfig {
  id: CharacterId
  name: string
  tagline: string
  elevenlabsVoiceId: string
  elevenlabsVoiceSettings: VoiceSettings
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
