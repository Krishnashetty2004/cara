/**
 * Topic Tracker - Avoids repetition within a conversation
 *
 * Tracks discussed topics and provides guidance to prevent
 * the AI from repeating topics or questions.
 */

export type TopicCategory =
  | 'work'
  | 'personal'
  | 'flirty'
  | 'emotional'
  | 'interests'
  | 'plans'
  | 'memories'
  | 'random'

export interface TopicTracker {
  discussedTopics: Set<string>
  topicCounts: Record<TopicCategory, number>
  lastTopic: string | null
  turnCount: number
  askedQuestions: Set<string>
}

export function createTopicTracker(): TopicTracker {
  return {
    discussedTopics: new Set(),
    topicCounts: {
      work: 0,
      personal: 0,
      flirty: 0,
      emotional: 0,
      interests: 0,
      plans: 0,
      memories: 0,
      random: 0,
    },
    lastTopic: null,
    turnCount: 0,
    askedQuestions: new Set(),
  }
}

// Common question patterns to track
const QUESTION_PATTERNS = [
  { pattern: /kya kar (raha|rahi|rahe)/i, key: 'what_doing' },
  { pattern: /kaisa (hai|tha|raha)/i, key: 'how_are_you' },
  { pattern: /kaha (hai|ho|tha)/i, key: 'where_are_you' },
  { pattern: /khana kha(ya|li)/i, key: 'eaten_food' },
  { pattern: /neend|soya|soyi/i, key: 'sleep' },
  { pattern: /naam kya/i, key: 'asking_name' },
  { pattern: /office|kaam/i, key: 'work_question' },
  { pattern: /miss (kiya|kar)/i, key: 'miss_me' },
]

// Detect topic from user message
export function detectTopic(message: string): { topic: string; category: TopicCategory } {
  const lowerMsg = message.toLowerCase()

  // Work-related keywords
  if (/office|kaam|work|meeting|boss|colleague|project|deadline|client|job/.test(lowerMsg)) {
    return { topic: 'work_discussion', category: 'work' }
  }

  // Emotional keywords
  if (/sad|upset|khush|happy|tension|stress|worried|miss|dukhi|pareshan|anxious/.test(lowerMsg)) {
    return { topic: 'emotional_share', category: 'emotional' }
  }

  // Flirty keywords
  if (/cute|pretty|beautiful|love|pyaar|kiss|hug|date|romantic|sexy|hot/.test(lowerMsg)) {
    return { topic: 'flirty_talk', category: 'flirty' }
  }

  // Personal life
  if (/family|maa|papa|ghar|home|friend|dost|bhai|behen|parents/.test(lowerMsg)) {
    return { topic: 'personal_life', category: 'personal' }
  }

  // Plans
  if (/plan|karna|jayega|milenge|weekend|tomorrow|kal|holiday|vacation|trip/.test(lowerMsg)) {
    return { topic: 'future_plans', category: 'plans' }
  }

  // Interests/hobbies
  if (/movie|film|song|music|game|book|show|series|netflix|cricket|football/.test(lowerMsg)) {
    return { topic: 'interests', category: 'interests' }
  }

  // Memories/past
  if (/yaad|remember|pehle|last time|kal|past|story/.test(lowerMsg)) {
    return { topic: 'memories', category: 'memories' }
  }

  return { topic: 'general_chat', category: 'random' }
}

// Update tracker with new message
export function updateTracker(
  tracker: TopicTracker,
  message: string,
  isCharacterMessage: boolean = false
): TopicTracker {
  const { topic, category } = detectTopic(message)

  // Track discussed topics
  tracker.discussedTopics.add(topic)
  tracker.topicCounts[category]++
  tracker.lastTopic = topic
  tracker.turnCount++

  // Track questions asked by character
  if (isCharacterMessage) {
    for (const { pattern, key } of QUESTION_PATTERNS) {
      if (pattern.test(message)) {
        tracker.askedQuestions.add(key)
      }
    }
  }

  return tracker
}

// Check if a question has already been asked
export function wasQuestionAsked(tracker: TopicTracker, questionKey: string): boolean {
  return tracker.askedQuestions.has(questionKey)
}

// Get anti-repetition guidance for prompts
export function getAntiRepetitionGuidance(tracker: TopicTracker): string {
  const parts: string[] = []

  // Topic balance guidance
  if (tracker.topicCounts.work > 2) {
    parts.push('Work topics covered - redirect to personal/fun topics.')
  }

  if (tracker.topicCounts.flirty > 4) {
    parts.push('Balance flirty with deeper conversation. Ask about their life.')
  }

  if (tracker.turnCount > 8 && tracker.topicCounts.emotional === 0) {
    parts.push('Ask how they\'re really feeling. Show you care.')
  }

  if (tracker.turnCount > 6 && tracker.topicCounts.personal === 0) {
    parts.push('Ask about their family or friends.')
  }

  // Question repetition guidance
  const commonQuestions = ['what_doing', 'how_are_you', 'miss_me']
  const askedCommon = commonQuestions.filter((q) => tracker.askedQuestions.has(q))
  if (askedCommon.length >= 2) {
    parts.push('Ask something NEW - avoid repeating basic questions.')
  }

  // Variety guidance
  if (tracker.turnCount > 5) {
    parts.push('Vary your reactions and pet names. Don\'t repeat yourself.')
  }

  return parts.length > 0 ? `\n[AVOID: ${parts.join(' | ')}]` : ''
}

// Get suggested topics based on what hasn't been discussed
export function getSuggestedTopics(tracker: TopicTracker): string[] {
  const suggestions: string[] = []

  if (tracker.topicCounts.personal === 0) {
    suggestions.push('Ask about their family or friends')
  }
  if (tracker.topicCounts.interests === 0) {
    suggestions.push('Ask about their hobbies or what they watch')
  }
  if (tracker.topicCounts.plans === 0) {
    suggestions.push('Ask about their weekend plans')
  }
  if (tracker.topicCounts.memories === 0 && tracker.turnCount > 5) {
    suggestions.push('Reference something from earlier in the conversation')
  }

  return suggestions
}
