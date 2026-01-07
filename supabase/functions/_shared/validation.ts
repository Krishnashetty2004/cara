/**
 * Input Validation Utilities for Edge Functions
 *
 * Provides validation for common input types to prevent:
 * - Injection attacks
 * - Memory exhaustion (large payloads)
 * - Invalid data types
 */

// Maximum sizes
const MAX_CLERK_ID_LENGTH = 100
const MAX_AUDIO_BASE64_SIZE = 50 * 1024 * 1024 // 50MB
const MAX_SYSTEM_PROMPT_LENGTH = 50000 // Character prompts can be large
const MAX_CONVERSATION_HISTORY_LENGTH = 50
const MAX_STRING_LENGTH = 1000

// Valid patterns
const CLERK_ID_PATTERN = /^[a-zA-Z0-9_-]+$/
const CHARACTER_ID_PATTERN = /^[a-z0-9_-]+$/
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

interface ValidationResult {
  valid: boolean
  error?: string
}

/**
 * Validate clerk_id format
 */
export function validateClerkId(clerkId: unknown): ValidationResult {
  if (typeof clerkId !== 'string') {
    return { valid: false, error: 'clerk_id must be a string' }
  }

  if (clerkId.length === 0) {
    return { valid: false, error: 'clerk_id is required' }
  }

  if (clerkId.length > MAX_CLERK_ID_LENGTH) {
    return { valid: false, error: 'clerk_id too long' }
  }

  if (!CLERK_ID_PATTERN.test(clerkId)) {
    return { valid: false, error: 'Invalid clerk_id format' }
  }

  return { valid: true }
}

/**
 * Validate UUID format
 */
export function validateUUID(uuid: unknown, fieldName = 'id'): ValidationResult {
  if (typeof uuid !== 'string') {
    return { valid: false, error: `${fieldName} must be a string` }
  }

  if (!UUID_PATTERN.test(uuid)) {
    return { valid: false, error: `Invalid ${fieldName} format` }
  }

  return { valid: true }
}

/**
 * Validate character_id
 */
export function validateCharacterId(characterId: unknown): ValidationResult {
  if (typeof characterId !== 'string') {
    return { valid: false, error: 'character_id must be a string' }
  }

  if (characterId.length === 0 || characterId.length > 50) {
    return { valid: false, error: 'Invalid character_id length' }
  }

  if (!CHARACTER_ID_PATTERN.test(characterId)) {
    return { valid: false, error: 'Invalid character_id format' }
  }

  // Whitelist valid characters
  const validCharacters = ['preethi', 'ira', 'riya']
  if (!validCharacters.includes(characterId)) {
    return { valid: false, error: 'Unknown character' }
  }

  return { valid: true }
}

/**
 * Validate audio base64 data
 */
export function validateAudioBase64(audioBase64: unknown): ValidationResult {
  if (typeof audioBase64 !== 'string') {
    return { valid: false, error: 'audio_base64 must be a string' }
  }

  if (audioBase64.length > MAX_AUDIO_BASE64_SIZE) {
    return { valid: false, error: 'Audio data too large' }
  }

  // Basic base64 validation
  if (audioBase64.length > 0) {
    try {
      atob(audioBase64.slice(0, 100)) // Test first 100 chars
    } catch {
      return { valid: false, error: 'Invalid base64 encoding' }
    }
  }

  return { valid: true }
}

/**
 * Validate audio format
 */
export function validateAudioFormat(format: unknown): ValidationResult {
  const validFormats = ['wav', 'pcm16', 'mp3', 'm4a', '3gp', 'webm', 'ogg']

  if (format === undefined) {
    return { valid: true } // Optional field
  }

  if (typeof format !== 'string') {
    return { valid: false, error: 'audio_format must be a string' }
  }

  if (!validFormats.includes(format)) {
    return { valid: false, error: `Invalid audio format. Allowed: ${validFormats.join(', ')}` }
  }

  return { valid: true }
}

/**
 * Validate system prompt
 */
export function validateSystemPrompt(prompt: unknown): ValidationResult {
  if (typeof prompt !== 'string') {
    return { valid: false, error: 'system_prompt must be a string' }
  }

  if (prompt.length > MAX_SYSTEM_PROMPT_LENGTH) {
    return { valid: false, error: 'system_prompt too long' }
  }

  return { valid: true }
}

/**
 * Validate conversation history
 */
export function validateConversationHistory(history: unknown): ValidationResult {
  if (history === undefined) {
    return { valid: true } // Optional field
  }

  if (!Array.isArray(history)) {
    return { valid: false, error: 'conversation_history must be an array' }
  }

  if (history.length > MAX_CONVERSATION_HISTORY_LENGTH) {
    return { valid: false, error: 'conversation_history too long' }
  }

  for (const msg of history) {
    if (typeof msg !== 'object' || msg === null) {
      return { valid: false, error: 'Invalid message in conversation_history' }
    }

    if (msg.role !== 'user' && msg.role !== 'assistant') {
      return { valid: false, error: 'Invalid role in conversation_history' }
    }

    if (typeof msg.content !== 'string' || msg.content.length > MAX_STRING_LENGTH * 10) {
      return { valid: false, error: 'Invalid content in conversation_history' }
    }
  }

  return { valid: true }
}

/**
 * Validate duration in seconds
 */
export function validateDurationSeconds(duration: unknown): ValidationResult {
  if (typeof duration !== 'number') {
    return { valid: false, error: 'duration_seconds must be a number' }
  }

  if (!Number.isFinite(duration) || duration < 0) {
    return { valid: false, error: 'Invalid duration value' }
  }

  // Max 2 hours per call
  if (duration > 7200) {
    return { valid: false, error: 'Duration exceeds maximum allowed' }
  }

  return { valid: true }
}

/**
 * Validate subscription ID
 */
export function validateSubscriptionId(subId: unknown): ValidationResult {
  if (typeof subId !== 'string') {
    return { valid: false, error: 'subscription_id must be a string' }
  }

  if (subId.length === 0 || subId.length > 100) {
    return { valid: false, error: 'Invalid subscription_id length' }
  }

  // Razorpay subscription IDs start with 'sub_'
  if (!subId.startsWith('sub_')) {
    return { valid: false, error: 'Invalid subscription_id format' }
  }

  return { valid: true }
}

/**
 * Create a validation error response
 */
export function validationErrorResponse(
  error: string,
  corsHeaders: Record<string, string>
): Response {
  return new Response(
    JSON.stringify({ error, code: 'VALIDATION_ERROR' }),
    {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    }
  )
}

/**
 * Validate voice-turn request body
 */
export function validateVoiceTurnRequest(body: Record<string, unknown>): ValidationResult {
  // audio_base64 is optional if generate_opener is true
  if (!body.generate_opener && body.audio_base64) {
    const audioResult = validateAudioBase64(body.audio_base64)
    if (!audioResult.valid) return audioResult
  }

  if (body.audio_format !== undefined) {
    const formatResult = validateAudioFormat(body.audio_format)
    if (!formatResult.valid) return formatResult
  }

  if (body.character_id !== undefined) {
    const charResult = validateCharacterId(body.character_id)
    if (!charResult.valid) return charResult
  }

  if (body.system_prompt !== undefined) {
    const promptResult = validateSystemPrompt(body.system_prompt)
    if (!promptResult.valid) return promptResult
  }

  if (body.conversation_history !== undefined) {
    const histResult = validateConversationHistory(body.conversation_history)
    if (!histResult.valid) return histResult
  }

  return { valid: true }
}
