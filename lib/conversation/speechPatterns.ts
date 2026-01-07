/**
 * Natural Speech Patterns
 *
 * Makes AI responses feel more human with natural fillers,
 * reactions, and varied response starters.
 */

// Speech fillers by category - Hindi/Hinglish natural sounds
export const SPEECH_FILLERS = {
  thinking: ['Hmm...', 'Matlab...', 'Actually...', 'Basically...', 'Waise...', 'Dekh...'],
  agreement: ['Haan haan...', 'Bilkul...', 'Sahi mein...', 'Obviously...', 'Exactly...'],
  surprise: ['Arrey!', 'Ohhh!', 'Accha?', 'Seriously?', 'Kya baat!', 'Really?', 'Sacchi?'],
  affection: ['Awww...', 'Baby...', 'Jaan...', 'Cutie...', 'Meri jaan...', 'Jaanu...'],
  playful: ['Hehe...', 'Haha...', 'Uff...', 'Oho...', 'Dekho...', 'Chal...'],
  empathy: ['Ohh no...', 'Poor baby...', 'Koi baat nahi...', 'Main hoon na...'],
}

// Response starters by mood/context
export const RESPONSE_STARTERS = {
  curious: ['Accha bata...', 'Phir kya hua?', 'Aur?', 'Tab?', 'Batao na...'],
  sympathetic: ['Ohh no...', 'Poor baby...', 'Meri jaan...', 'Koi baat nahi...', 'Relax...'],
  excited: ['OMG!', 'Yay!', 'Kitna exciting!', 'Mazaa aa gaya!', 'Wow!'],
  teasing: ['Ohho!', 'Hmm suspicious...', 'Jhooth!', 'Pakka?', 'Sachiii?'],
  flirty: ['Mmmm...', 'Tu na...', 'Haye...', 'Kitna cute...', 'Aww baby...'],
  caring: ['Sun...', 'Dekh...', 'Baby sun...', 'Bata na...', 'Kya hua?'],
}

// Pet names to vary - don't always use the same one
export const PET_NAMES = [
  'baby',
  'jaan',
  'meri jaan',
  'jaanu',
  'cutie',
  'babu',
  'sweetheart',
  'pagal',
  'stupid', // playful
]

// Get a random filler from a category
export function getRandomFiller(category: keyof typeof SPEECH_FILLERS): string {
  const fillers = SPEECH_FILLERS[category]
  return fillers[Math.floor(Math.random() * fillers.length)]
}

// Get a random starter for a mood
export function getRandomStarter(mood: keyof typeof RESPONSE_STARTERS): string {
  const starters = RESPONSE_STARTERS[mood]
  return starters[Math.floor(Math.random() * starters.length)]
}

// Get a random pet name
export function getRandomPetName(): string {
  return PET_NAMES[Math.floor(Math.random() * PET_NAMES.length)]
}

// Inject speech pattern guidance into prompt based on turn count
export function getSpeechPatternGuidance(turnCount: number): string {
  let guidance = `
NATURAL SPEECH (IMPORTANT):
- Start with fillers: "Hmm...", "Accha...", "Matlab...", "Haan..."
- React naturally: "Arrey!", "Ohhh!", "Accha?", "Kya baat!"
- Show you're listening: "Haan haan...", "Phir?", "Aur bata..."
- Express affection: "Awww...", "Baby...", "Jaan...", "Meri jaan..."
- Laugh naturally: "Hehe...", "Haha..." (NEVER use "lol" or emojis in speech)
- Pause with "..." for thinking or intimate moments
- Keep responses SHORT (1-2 sentences for phone call)`

  // Add variety guidance after several turns
  if (turnCount > 5) {
    guidance += `
- VARY your response starters. Don't always start with "Awww" or "Hmm"
- Use DIFFERENT pet names: baby, jaan, jaanu, cutie (don't repeat the same one)
- Mix up reactions - sometimes surprised, sometimes teasing, sometimes caring`
  }

  if (turnCount > 10) {
    guidance += `
- You've been talking for a while. Be more intimate and comfortable.
- Reference something from earlier in the conversation.
- Don't ask the same questions you already asked.`
  }

  return guidance
}

// Get mood-specific guidance for dynamic injection
export function getMoodGuidance(
  mood: 'neutral' | 'flirty' | 'caring' | 'playful' | 'intimate'
): string {
  const moodInstructions = {
    neutral: '',
    flirty: '[This response: Be EXTRA flirty. Tease them, drop hints, make them blush.]',
    caring:
      '[This response: Show you genuinely CARE. Ask how they\'re really doing. Be soft and supportive.]',
    playful:
      '[This response: Be PLAYFUL! Joke around, tease them, be fun and lighthearted.]',
    intimate:
      '[This response: INTIMATE mood. Soft voice, loving words, make them feel special and close to you.]',
  }

  return moodInstructions[mood]
}

// Get turn-based guidance for natural conversation flow
export function getTurnGuidance(turnCount: number): string {
  if (turnCount === 3) {
    return '[Ask something personal about their day or how they\'re feeling.]'
  }
  if (turnCount === 6) {
    return '[If you haven\'t already, ask about something specific in their life.]'
  }
  if (turnCount === 10) {
    return '[Reference something from earlier in this conversation to show you\'re listening.]'
  }
  if (turnCount === 15) {
    return '[The conversation is long. Express that you enjoy talking to them.]'
  }
  return ''
}

// Combined guidance for injection into realtime API
export function getCombinedGuidance(
  turnCount: number,
  mood: 'neutral' | 'flirty' | 'caring' | 'playful' | 'intimate'
): string {
  const moodGuidance = getMoodGuidance(mood)
  const turnGuidance = getTurnGuidance(turnCount)

  if (!moodGuidance && !turnGuidance) return ''

  return [moodGuidance, turnGuidance].filter(Boolean).join(' ')
}
