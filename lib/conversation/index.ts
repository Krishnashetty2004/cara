/**
 * Conversation Management
 *
 * Exports topic tracking and speech pattern utilities
 * for natural, human-like conversations.
 */

export {
  createTopicTracker,
  detectTopic,
  updateTracker,
  wasQuestionAsked,
  getAntiRepetitionGuidance,
  getSuggestedTopics,
} from './topicTracker'
export type { TopicTracker, TopicCategory } from './topicTracker'

export {
  SPEECH_FILLERS,
  RESPONSE_STARTERS,
  PET_NAMES,
  getRandomFiller,
  getRandomStarter,
  getRandomPetName,
  getSpeechPatternGuidance,
  getMoodGuidance,
  getTurnGuidance,
  getCombinedGuidance,
} from './speechPatterns'
