// Supabase database types for Cara App
import type { CharacterId } from './character'

export interface DbUser {
  id: string
  google_id: string
  clerk_id?: string | null
  email: string | null
  name: string | null
  avatar_url: string | null
  created_at: string
  last_call_at: string | null
  total_calls: number
  total_minutes: number
  is_premium: boolean
  selected_character: CharacterId
}

export interface DbUserMemory {
  id: string
  user_id: string
  character_id: CharacterId
  key: string
  value: string
  confidence: number
  learned_at: string
  last_mentioned: string | null
}

export interface DbConversation {
  id: string
  user_id: string
  character_id: CharacterId
  started_at: string
  ended_at: string | null
  duration_seconds: number | null
  summary: string | null
  mood: string | null
}

export interface DbConversationMessage {
  id: string
  conversation_id: string
  role: 'user' | CharacterId
  content: string
  timestamp: string
}

export interface DbRelationshipProgress {
  id: string
  user_id: string
  character_id: CharacterId
  trust_level: number
  flirt_level: number
  inside_jokes: string[]
  pet_names: string[]
  relationship_stage: RelationshipStage
  notes: string | null
}

export type RelationshipStage =
  | 'stranger'
  | 'acquaintance'
  | 'friend'
  | 'close_friend'
  | 'flirty'
  | 'romantic'

// Memory keys that characters can learn about the user
export type MemoryKey =
  | 'name'
  | 'nickname'
  | 'gender'
  | 'job'
  | 'city'
  | 'relationship_status'
  | 'age'
  | 'interests'
  | 'favorite_food'
  | 'favorite_movie'
  | 'favorite_music'
  | 'friends'
  | 'family'
  | 'pet'
  | 'college'
  | 'hometown'

// Gender type for user identification
export type UserGender = 'male' | 'female'

// Parsed user memory for prompts
export interface UserMemory {
  name?: string
  nickname?: string
  gender?: UserGender
  job?: string
  city?: string
  relationship_status?: string
  age?: string
  interests?: string[]
  favorite_food?: string
  favorite_movie?: string
  favorite_music?: string
  friends?: string[]
  family?: string
  pet?: string
  college?: string
  hometown?: string
}

// Relationship data for prompts
export interface RelationshipData {
  trust_level: number
  flirt_level: number
  inside_jokes: string[]
  pet_names: string[]
  relationship_stage: RelationshipStage
  notes: string | null
}

// Database insert/update types
export type UserInsert = Omit<DbUser, 'id' | 'created_at'>
export type UserUpdate = Partial<Omit<DbUser, 'id' | 'google_id' | 'created_at'>>

export type UserMemoryInsert = Omit<DbUserMemory, 'id' | 'learned_at'>
export type UserMemoryUpdate = Partial<Omit<DbUserMemory, 'id' | 'user_id' | 'character_id' | 'key'>>

export type ConversationInsert = Omit<DbConversation, 'id' | 'started_at'>
export type ConversationUpdate = Partial<Omit<DbConversation, 'id' | 'user_id' | 'character_id' | 'started_at'>>

export type RelationshipInsert = Omit<DbRelationshipProgress, 'id'>
export type RelationshipUpdate = Partial<Omit<DbRelationshipProgress, 'id' | 'user_id' | 'character_id'>>
