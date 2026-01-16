/**
 * @deprecated CLIENT-SIDE API - DO NOT USE IN PRODUCTION
 *
 * This file makes direct API calls to OpenAI using a client-embedded API key.
 * The key will be visible to anyone who decompiles the app bundle.
 *
 * For production deployments, use the server-side implementation instead:
 * - Hook: useHybridCall (hooks/useHybridCall.ts)
 * - Edge Function: supabase/functions/voice-turn/
 *
 * This file is kept for local development/testing convenience only.
 */

import { CHARACTERS, DEFAULT_CHARACTER } from '@/constants/characters'
import { CONFIG } from '@/constants/config'
import type { ConversationMessage, UserMemory, RelationshipData } from '@/types'
import type { CharacterId } from '@/types/character'

const OPENAI_API_KEY = process.env.EXPO_PUBLIC_OPENAI_API_KEY!

// Conversation history for current call session
let conversationHistory: ConversationMessage[] = []

// Current character for the session
let currentCharacterId: CharacterId = DEFAULT_CHARACTER

// User context for personalization
let currentUserMemory: UserMemory | null = null
let currentRelationship: RelationshipData | null = null
let currentLastSummary: string | null = null

export function resetConversation(): void {
  conversationHistory = []
}

export function getConversationHistory(): ConversationMessage[] {
  return [...conversationHistory]
}

// Set current character for the session
export function setCurrentCharacter(characterId: CharacterId): void {
  currentCharacterId = characterId
}

// Get current character
export function getCurrentCharacter(): CharacterId {
  return currentCharacterId
}

// Set user context for personalization
export function setUserContext(
  memory: UserMemory | null,
  relationship: RelationshipData | null,
  lastSummary: string | null
): void {
  currentUserMemory = memory
  currentRelationship = relationship
  currentLastSummary = lastSummary
}

// Clear user context
export function clearUserContext(): void {
  currentUserMemory = null
  currentRelationship = null
  currentLastSummary = null
}

export function addUserMessage(content: string): void {
  conversationHistory.push({ role: 'user', content })

  // Keep only last N messages to manage context
  if (conversationHistory.length > CONFIG.MAX_CONVERSATION_HISTORY) {
    conversationHistory = conversationHistory.slice(-CONFIG.MAX_CONVERSATION_HISTORY)
  }
}

export function addAssistantMessage(content: string): void {
  conversationHistory.push({ role: 'assistant', content })
}

// Get system prompt - personalized if context is set
function getSystemPrompt(characterId?: CharacterId): string {
  const charId = characterId || currentCharacterId
  const character = CHARACTERS[charId]

  return character.getSystemPrompt(
    currentUserMemory,
    currentRelationship,
    currentLastSummary
  )
}

export async function getCharacterResponse(
  userText: string,
  characterId?: CharacterId
): Promise<string> {
  try {
    // Add user message to history
    addUserMessage(userText)

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: CONFIG.OPENAI_MODEL,
        messages: [
          { role: 'system', content: getSystemPrompt(characterId) },
          ...conversationHistory,
        ],
        temperature: 0.95,
        max_tokens: CONFIG.MAX_RESPONSE_TOKENS,
        presence_penalty: 0.6,
        frequency_penalty: 0.4,
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`OpenAI API error: ${response.status} - ${errorText}`)
    }

    const data = await response.json()
    const reply = data.choices[0]?.message?.content || 'hmm...'

    // Add assistant response to history
    addAssistantMessage(reply)

    return reply
  } catch (error) {
    throw error
  }
}

// Legacy function for backwards compatibility
export async function getPreethiResponse(userText: string): Promise<string> {
  return getCharacterResponse(userText, 'preethi')
}
