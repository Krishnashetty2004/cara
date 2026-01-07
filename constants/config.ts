export const CONFIG = {
  // Freemium limits
  FREE_DAILY_MINUTES: 30,
  FREE_CALL_LIMIT_SECONDS: 1800, // 30 minutes
  WARNING_BEFORE_END_SECONDS: 60, // Show warning 1 minute before limit

  // Razorpay Subscription
  RAZORPAY_KEY_ID: process.env.EXPO_PUBLIC_RAZORPAY_KEY_ID || '',
  RAZORPAY_PLAN_ID: process.env.EXPO_PUBLIC_RAZORPAY_PLAN_ID || '',
  SUBSCRIPTION_PRICE_INR: 99,
  SUBSCRIPTION_PERIOD: 'weekly',
  SUBSCRIPTION_GRACE_DAYS: 3,

  // API Limits
  MAX_CONVERSATION_HISTORY: 20,
  MAX_RESPONSE_TOKENS: 150,

  // UI Timings
  CALLING_RING_DURATION_MS: 2000,
  CALL_END_DELAY_MS: 1500,

  // OpenAI - using GPT-4o for best quality responses
  OPENAI_MODEL: 'gpt-4o',
  WHISPER_MODEL: 'whisper-1',

  // ElevenLabs - using turbo for faster TTS
  ELEVENLABS_MODEL: 'eleven_turbo_v2_5',
} as const
