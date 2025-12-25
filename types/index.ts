export type CallState = 'idle' | 'calling' | 'connected' | 'ending' | 'ended'

export interface User {
  id: string
  clerk_id: string
  email: string | null
  name: string | null
  avatar_url: string | null
  is_premium: boolean
  premium_expires_at: string | null
  daily_minutes_used: number
  daily_reset_at: string
  total_call_minutes: number
  created_at: string
  updated_at: string
}

export interface Call {
  id: string
  user_id: string
  duration_seconds: number
  started_at: string
  ended_at: string | null
}

export interface VoicePipelineResult {
  userText: string
  responseText: string
  audioUri: string
}

export interface ConversationMessage {
  role: 'user' | 'assistant'
  content: string
}

// Re-export database types
export * from './database'
