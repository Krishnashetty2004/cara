import type { CharacterId, CharacterConfig, CharacterRegistry } from '@/types/character'
import { PreethiCharacter } from './preethi'
import { IraCharacter } from './ira'
import { RiyaCharacter } from './riya'

export const CHARACTERS: CharacterRegistry = {
  preethi: PreethiCharacter,
  ira: IraCharacter,
  riya: RiyaCharacter,
}

export const CHARACTER_LIST: CharacterConfig[] = Object.values(CHARACTERS)

export const DEFAULT_CHARACTER: CharacterId = 'preethi'

export function getCharacter(id: CharacterId): CharacterConfig {
  return CHARACTERS[id]
}

export function getCharacterIds(): CharacterId[] {
  return Object.keys(CHARACTERS) as CharacterId[]
}

// Re-export individual characters
export { PreethiCharacter } from './preethi'
export { IraCharacter } from './ira'
export { RiyaCharacter } from './riya'
