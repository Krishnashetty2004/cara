import { supabase } from '@/lib/supabase'
import type { DbUserMemory, UserMemory, MemoryKey } from '@/types/database'
import type { CharacterId } from '@/types/character'

// Fetch all memory for a user with a specific character
export async function getUserMemory(
  userId: string,
  characterId: CharacterId = 'preethi'
): Promise<UserMemory> {
  try {
    const { data, error } = await supabase
      .from('user_memory')
      .select('*')
      .eq('user_id', userId)
      .eq('character_id', characterId)

    if (error) {
      console.error('[Memory] Fetch error:', error)
      return {}
    }

    // Convert array to memory object
    const memory: UserMemory = {}

    for (const item of data as DbUserMemory[]) {
      const key = item.key as MemoryKey

      // Handle array-type keys
      if (key === 'interests' || key === 'friends') {
        try {
          memory[key] = JSON.parse(item.value)
        } catch {
          memory[key] = [item.value]
        }
      } else {
        ;(memory as any)[key] = item.value
      }
    }

    return memory
  } catch (error) {
    console.error('[Memory] Fetch error:', error)
    return {}
  }
}

// Save a single memory item
export async function saveMemory(
  userId: string,
  characterId: CharacterId,
  key: MemoryKey,
  value: string,
  confidence: number = 1.0
): Promise<void> {
  try {
    const { error } = await supabase
      .from('user_memory')
      .upsert(
        {
          user_id: userId,
          character_id: characterId,
          key,
          value,
          confidence,
          last_mentioned: new Date().toISOString(),
        },
        {
          onConflict: 'user_id,character_id,key',
        }
      )

    if (error) {
      console.error('[Memory] Save error:', error)
    }
  } catch (error) {
    console.error('[Memory] Save error:', error)
  }
}

// Append to an array-type memory (interests, friends)
export async function appendToMemory(
  userId: string,
  characterId: CharacterId,
  key: 'interests' | 'friends',
  newValue: string
): Promise<void> {
  try {
    // Get existing values
    const { data } = await supabase
      .from('user_memory')
      .select('value')
      .eq('user_id', userId)
      .eq('character_id', characterId)
      .eq('key', key)
      .single()

    let values: string[] = []
    if (data) {
      try {
        values = JSON.parse(data.value)
      } catch {
        values = [data.value]
      }
    }

    // Add new value if not exists
    if (!values.includes(newValue)) {
      values.push(newValue)
    }

    // Save updated array
    await saveMemory(userId, characterId, key, JSON.stringify(values))
  } catch (error) {
    console.error('[Memory] Append error:', error)
  }
}

// Update last mentioned timestamp
export async function touchMemory(
  userId: string,
  characterId: CharacterId,
  key: MemoryKey
): Promise<void> {
  try {
    await supabase
      .from('user_memory')
      .update({ last_mentioned: new Date().toISOString() })
      .eq('user_id', userId)
      .eq('character_id', characterId)
      .eq('key', key)
  } catch (error) {
    console.error('[Memory] Touch error:', error)
  }
}

// Delete a memory
export async function deleteMemory(
  userId: string,
  characterId: CharacterId,
  key: MemoryKey
): Promise<void> {
  try {
    await supabase
      .from('user_memory')
      .delete()
      .eq('user_id', userId)
      .eq('character_id', characterId)
      .eq('key', key)
  } catch (error) {
    console.error('[Memory] Delete error:', error)
  }
}

// Extract facts from a conversation message using AI
export async function extractFacts(
  userMessage: string,
  characterResponse: string,
  characterName: string = 'Preethi'
): Promise<{ key: MemoryKey; value: string; confidence: number }[]> {
  try {
    const OPENAI_API_KEY = process.env.EXPO_PUBLIC_OPENAI_API_KEY!

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
            content: `You are a fact extractor. Extract personal facts about the user from this conversation.

Return a JSON array of facts. Each fact should have:
- key: one of [name, nickname, gender, job, city, relationship_status, age, interests, favorite_food, favorite_movie, favorite_music, friends, family, pet, college, hometown]
- value: the extracted value (string)
- confidence: how sure you are (0.0 to 1.0)

GENDER DETECTION (IMPORTANT):
- gender can ONLY be "male" or "female"
- Detect from: pronouns, names, relationship terms (girlfriend/boyfriend/wife/husband), Hindi gender markers
- "Meri girlfriend" = user is male, "Mera boyfriend" = user is female
- Indian male names: Rahul, Arjun, Karthik, Vikram, Rohit, Aditya, etc = male
- Indian female names: Priya, Anjali, Sneha, Pooja, Neha, Kavya, etc = female
- "Main ladka hoon" = male, "Main ladki hoon" = female
- "Bhai" when referring to self = male, "Didi" = female

Only extract facts that are clearly stated. If the user says "main Rahul hoon" or "my name is Rahul", extract BOTH name AND gender.

If no facts can be extracted, return an empty array [].

Examples:
- "Main Rahul hoon" -> [{key: "name", value: "Rahul", confidence: 1.0}, {key: "gender", value: "male", confidence: 0.9}]
- "Meri girlfriend ne breakup kar diya" -> [{key: "relationship_status", value: "single", confidence: 0.8}, {key: "gender", value: "male", confidence: 0.95}]
- "My boyfriend is annoying" -> [{key: "gender", value: "female", confidence: 0.95}]
- "Main Bangalore mein rehta hoon" -> [{key: "city", value: "Bangalore", confidence: 1.0}, {key: "gender", value: "male", confidence: 0.7}]
- "Main Bangalore mein rehti hoon" -> [{key: "city", value: "Bangalore", confidence: 1.0}, {key: "gender", value: "female", confidence: 0.9}]`,
          },
          {
            role: 'user',
            content: `User said: "${userMessage}"\n${characterName} responded: "${characterResponse}"`,
          },
        ],
        temperature: 0.3,
        max_tokens: 200,
      }),
    })

    if (!response.ok) {
      return []
    }

    const data = await response.json()
    const content = data.choices[0]?.message?.content || '[]'

    // Parse JSON from response
    const jsonMatch = content.match(/\[[\s\S]*\]/)
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0])
    }

    return []
  } catch (error) {
    console.error('[Memory] Extract facts error:', error)
    return []
  }
}

// Process and save extracted facts
export async function processAndSaveFacts(
  userId: string,
  characterId: CharacterId,
  userMessage: string,
  characterResponse: string,
  characterName: string = 'Preethi'
): Promise<void> {
  try {
    const facts = await extractFacts(userMessage, characterResponse, characterName)

    for (const fact of facts) {
      if (fact.key === 'interests' || fact.key === 'friends') {
        await appendToMemory(userId, characterId, fact.key, fact.value)
      } else {
        await saveMemory(userId, characterId, fact.key, fact.value, fact.confidence)
      }
    }

    console.log(`[Memory] Saved ${facts.length} facts for user ${userId} with ${characterId}`)
  } catch (error) {
    console.error('[Memory] Process facts error:', error)
  }
}
