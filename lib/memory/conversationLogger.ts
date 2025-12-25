import { supabase } from '@/lib/supabase'
import type { DbConversation, DbConversationMessage } from '@/types/database'
import type { CharacterId } from '@/types/character'

// Create a new conversation session
export async function createConversation(
  userId: string,
  characterId: CharacterId = 'preethi'
): Promise<string | null> {
  try {
    const { data, error } = await supabase
      .from('conversations')
      .insert({
        user_id: userId,
        character_id: characterId,
      })
      .select('id')
      .single()

    if (error) {
      console.error('[ConversationLogger] Create error:', error)
      return null
    }

    return data.id
  } catch (error) {
    console.error('[ConversationLogger] Create error:', error)
    return null
  }
}

// Log a message in a conversation
export async function logMessage(
  conversationId: string,
  role: 'user' | CharacterId,
  content: string
): Promise<void> {
  try {
    const { error } = await supabase.from('conversation_messages').insert({
      conversation_id: conversationId,
      role,
      content,
    })

    if (error) {
      console.error('[ConversationLogger] Log message error:', error)
    }
  } catch (error) {
    console.error('[ConversationLogger] Log message error:', error)
  }
}

// End a conversation and save summary
export async function endConversation(
  conversationId: string,
  durationSeconds: number,
  characterName: string = 'Preethi'
): Promise<void> {
  try {
    // Get all messages for summary generation
    const { data: messages } = await supabase
      .from('conversation_messages')
      .select('role, content')
      .eq('conversation_id', conversationId)
      .order('timestamp', { ascending: true })

    let summary: string | null = null
    let mood: string | null = null

    // Generate summary if we have messages
    if (messages && messages.length > 0) {
      const result = await generateConversationSummary(
        messages as DbConversationMessage[],
        characterName
      )
      summary = result.summary
      mood = result.mood
    }

    // Update conversation record
    const { error } = await supabase
      .from('conversations')
      .update({
        ended_at: new Date().toISOString(),
        duration_seconds: durationSeconds,
        summary,
        mood,
      })
      .eq('id', conversationId)

    if (error) {
      console.error('[ConversationLogger] End conversation error:', error)
    }
  } catch (error) {
    console.error('[ConversationLogger] End conversation error:', error)
  }
}

// Generate AI summary of conversation
async function generateConversationSummary(
  messages: DbConversationMessage[],
  characterName: string = 'Preethi'
): Promise<{ summary: string; mood: string }> {
  try {
    const OPENAI_API_KEY = process.env.EXPO_PUBLIC_OPENAI_API_KEY!

    const messageText = messages
      .map((m) => `${m.role === 'user' ? 'User' : characterName}: ${m.content}`)
      .join('\n')

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `Summarize this conversation between User and ${characterName} in 2-3 sentences. Also identify the overall mood.

Return JSON:
{
  "summary": "Brief summary of what was discussed, any important revelations, emotional moments",
  "mood": "one of: happy, sad, flirty, romantic, angry, playful, emotional, casual, thoughtful, productive"
}`,
          },
          {
            role: 'user',
            content: messageText,
          },
        ],
        temperature: 0.3,
        max_tokens: 200,
      }),
    })

    if (!response.ok) {
      return { summary: 'Call completed', mood: 'casual' }
    }

    const data = await response.json()
    const content = data.choices[0]?.message?.content || '{}'

    try {
      const parsed = JSON.parse(content)
      return {
        summary: parsed.summary || 'Call completed',
        mood: parsed.mood || 'casual',
      }
    } catch {
      return { summary: 'Call completed', mood: 'casual' }
    }
  } catch (error) {
    console.error('[ConversationLogger] Generate summary error:', error)
    return { summary: 'Call completed', mood: 'casual' }
  }
}

// Get recent conversation summaries for a user with a specific character
export async function getRecentConversations(
  userId: string,
  characterId: CharacterId = 'preethi',
  limit: number = 5
): Promise<{ summary: string; mood: string; date: string }[]> {
  try {
    const { data, error } = await supabase
      .from('conversations')
      .select('summary, mood, ended_at')
      .eq('user_id', userId)
      .eq('character_id', characterId)
      .not('summary', 'is', null)
      .order('ended_at', { ascending: false })
      .limit(limit)

    if (error) {
      console.error('[ConversationLogger] Get recent error:', error)
      return []
    }

    return (data || []).map((c) => ({
      summary: c.summary || '',
      mood: c.mood || 'casual',
      date: c.ended_at || '',
    }))
  } catch (error) {
    console.error('[ConversationLogger] Get recent error:', error)
    return []
  }
}

// Get the last conversation summary
export async function getLastConversationSummary(
  userId: string,
  characterId: CharacterId = 'preethi'
): Promise<string | null> {
  try {
    const { data, error } = await supabase
      .from('conversations')
      .select('summary')
      .eq('user_id', userId)
      .eq('character_id', characterId)
      .not('summary', 'is', null)
      .order('ended_at', { ascending: false })
      .limit(1)
      .single()

    if (error || !data) {
      return null
    }

    return data.summary
  } catch (error) {
    return null
  }
}
