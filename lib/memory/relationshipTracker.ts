import { supabase } from '@/lib/supabase'
import type { DbRelationshipProgress, RelationshipStage, RelationshipData } from '@/types/database'
import type { CharacterId } from '@/types/character'

// Get relationship progress for a user with a specific character
export async function getRelationship(
  userId: string,
  characterId: CharacterId = 'preethi'
): Promise<RelationshipData | null> {
  try {
    const { data, error } = await supabase
      .from('relationship_progress')
      .select('*')
      .eq('user_id', userId)
      .eq('character_id', characterId)
      .single()

    if (error) {
      // If no relationship exists, create one
      if (error.code === 'PGRST116') {
        await createRelationship(userId, characterId)
        return {
          trust_level: 0,
          flirt_level: 0,
          inside_jokes: [],
          pet_names: [],
          relationship_stage: 'stranger',
          notes: null,
        }
      }
      // [Relationship] Error: Get error:', error)
      return null
    }

    const rel = data as DbRelationshipProgress
    return {
      trust_level: rel.trust_level,
      flirt_level: rel.flirt_level,
      inside_jokes: rel.inside_jokes || [],
      pet_names: rel.pet_names || [],
      relationship_stage: rel.relationship_stage,
      notes: rel.notes,
    }
  } catch (error) {
    // [Relationship] Error: Get error:', error)
    return null
  }
}

// Create a new relationship for a user with a character
async function createRelationship(
  userId: string,
  characterId: CharacterId
): Promise<void> {
  try {
    await supabase
      .from('relationship_progress')
      .insert({
        user_id: userId,
        character_id: characterId,
        trust_level: 0,
        flirt_level: 0,
        inside_jokes: [],
        pet_names: [],
        relationship_stage: 'stranger',
      })
  } catch (error) {
    // [Relationship] Error: Create error:', error)
  }
}

// Update relationship after a call
export async function updateRelationshipAfterCall(
  userId: string,
  characterId: CharacterId,
  conversationMood: string,
  callDurationSeconds: number
): Promise<void> {
  try {
    const current = await getRelationship(userId, characterId)
    if (!current) return

    // Calculate trust and flirt increases based on call
    let trustIncrease = 2 // Base trust per call
    let flirtIncrease = 1 // Base flirt per call

    // Mood affects increases
    switch (conversationMood) {
      case 'flirty':
      case 'romantic':
        flirtIncrease += 3
        trustIncrease += 1
        break
      case 'emotional':
        trustIncrease += 4
        break
      case 'happy':
      case 'playful':
        trustIncrease += 2
        flirtIncrease += 2
        break
      case 'sad':
        trustIncrease += 3 // Sharing sadness builds trust
        break
      case 'angry':
        trustIncrease -= 1
        flirtIncrease -= 1
        break
      case 'thoughtful':
      case 'productive':
        trustIncrease += 3 // Deep conversations build trust
        break
    }

    // Longer calls = more connection
    const minutes = Math.floor(callDurationSeconds / 60)
    trustIncrease += Math.min(minutes, 5) // Cap bonus at 5

    // Calculate new values (capped at 100)
    const newTrust = Math.min(100, current.trust_level + trustIncrease)
    const newFlirt = Math.min(100, current.flirt_level + flirtIncrease)

    // Determine new relationship stage
    const newStage = calculateRelationshipStage(newTrust, newFlirt)

    // Update database
    await supabase
      .from('relationship_progress')
      .update({
        trust_level: newTrust,
        flirt_level: newFlirt,
        relationship_stage: newStage,
      })
      .eq('user_id', userId)
      .eq('character_id', characterId)

    // [Relationship] Updated ${characterId}: trust=${newTrust}, flirt=${newFlirt}, stage=${newStage}`)
  } catch (error) {
    // [Relationship] Error: Update error:', error)
  }
}

// Calculate relationship stage based on levels
function calculateRelationshipStage(trust: number, flirt: number): RelationshipStage {
  const avg = (trust + flirt) / 2

  if (avg >= 80 && flirt >= 70) return 'romantic'
  if (avg >= 60 && flirt >= 50) return 'flirty'
  if (avg >= 50) return 'close_friend'
  if (avg >= 30) return 'friend'
  if (avg >= 15) return 'acquaintance'
  return 'stranger'
}

// Add an inside joke
export async function addInsideJoke(
  userId: string,
  characterId: CharacterId,
  joke: string
): Promise<void> {
  try {
    const current = await getRelationship(userId, characterId)
    if (!current) return

    const jokes = [...current.inside_jokes]
    if (!jokes.includes(joke) && jokes.length < 10) {
      jokes.push(joke)

      await supabase
        .from('relationship_progress')
        .update({ inside_jokes: jokes })
        .eq('user_id', userId)
        .eq('character_id', characterId)
    }
  } catch (error) {
    // [Relationship] Error: Add joke error:', error)
  }
}

// Add a pet name
export async function addPetName(
  userId: string,
  characterId: CharacterId,
  name: string
): Promise<void> {
  try {
    const current = await getRelationship(userId, characterId)
    if (!current) return

    const names = [...current.pet_names]
    if (!names.includes(name) && names.length < 5) {
      names.push(name)

      await supabase
        .from('relationship_progress')
        .update({ pet_names: names })
        .eq('user_id', userId)
        .eq('character_id', characterId)
    }
  } catch (error) {
    // [Relationship] Error: Add pet name error:', error)
  }
}

// Update AI notes about the user
export async function updateNotes(
  userId: string,
  characterId: CharacterId,
  notes: string
): Promise<void> {
  try {
    await supabase
      .from('relationship_progress')
      .update({ notes })
      .eq('user_id', userId)
      .eq('character_id', characterId)
  } catch (error) {
    // [Relationship] Error: Update notes error:', error)
  }
}

// Get relationship stage description for prompts
export function getRelationshipDescription(stage: RelationshipStage): string {
  switch (stage) {
    case 'stranger':
      return 'You just met this person. Be curious, ask their name, get to know them. Flirt lightly.'

    case 'acquaintance':
      return 'You know them a little. Remember what they told you. Be friendlier, flirt more.'

    case 'friend':
      return 'You\'re friends now. Be comfortable, share more, create inside jokes. Increase flirting.'

    case 'close_friend':
      return 'You\'re close friends. Be very comfortable, reference past conversations, be possessive about them. Heavy flirting.'

    case 'flirty':
      return 'There\'s clear chemistry. Be very flirty, possessive, jealous. Act like they\'re yours. Demand attention.'

    case 'romantic':
      return 'You\'re basically in a relationship. Be full girlfriend mode - possessive, romantic, demanding, loving. They\'re YOUR person now.'

    default:
      return ''
  }
}

// Analyze conversation for potential inside jokes
export async function extractInsideJokes(
  messages: { role: string; content: string }[]
): Promise<string[]> {
  try {
    const OPENAI_API_KEY = process.env.EXPO_PUBLIC_OPENAI_API_KEY!

    const messageText = messages
      .map((m) => `${m.role}: ${m.content}`)
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
            content: `Identify any potential inside jokes or funny moments from this conversation that could be referenced in future conversations.

Return a JSON array of strings, max 2 items. Each should be a brief description of the joke/moment.

Example: ["when he called you bro and you got mad", "the time he said he's a 'corporate slave'"]

If no inside jokes found, return [].`,
          },
          {
            role: 'user',
            content: messageText,
          },
        ],
        temperature: 0.3,
        max_tokens: 100,
      }),
    })

    if (!response.ok) return []

    const data = await response.json()
    const content = data.choices[0]?.message?.content || '[]'

    try {
      return JSON.parse(content)
    } catch {
      return []
    }
  } catch (error) {
    // [Relationship] Error: Extract jokes error:', error)
    return []
  }
}
