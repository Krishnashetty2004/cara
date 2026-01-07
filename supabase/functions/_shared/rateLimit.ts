/**
 * Rate Limiting Utilities
 *
 * Implements sliding window rate limiting.
 * Uses in-memory for low-latency with database fallback for persistence.
 *
 * For production, consider using Redis or Upstash for distributed rate limiting.
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

interface RateLimitEntry {
  count: number
  windowStart: number
}

// In-memory store (fast path)
const rateLimitStore = new Map<string, RateLimitEntry>()

// Cleanup old entries periodically
const CLEANUP_INTERVAL = 60000 // 1 minute
let lastCleanup = Date.now()

function cleanupOldEntries(windowMs: number) {
  const now = Date.now()
  if (now - lastCleanup < CLEANUP_INTERVAL) return

  lastCleanup = now
  const cutoff = now - windowMs

  for (const [key, entry] of rateLimitStore.entries()) {
    if (entry.windowStart < cutoff) {
      rateLimitStore.delete(key)
    }
  }
}

export interface RateLimitConfig {
  windowMs: number
  maxRequests: number
}

export interface RateLimitResult {
  allowed: boolean
  remaining: number
  resetAt: number
}

/**
 * Check if a request should be rate limited (in-memory, fast)
 */
export function checkRateLimit(key: string, config: RateLimitConfig): RateLimitResult {
  const now = Date.now()
  cleanupOldEntries(config.windowMs)

  const entry = rateLimitStore.get(key)

  if (!entry || now - entry.windowStart >= config.windowMs) {
    rateLimitStore.set(key, { count: 1, windowStart: now })
    return {
      allowed: true,
      remaining: config.maxRequests - 1,
      resetAt: now + config.windowMs,
    }
  }

  if (entry.count >= config.maxRequests) {
    return {
      allowed: false,
      remaining: 0,
      resetAt: entry.windowStart + config.windowMs,
    }
  }

  entry.count++
  return {
    allowed: true,
    remaining: config.maxRequests - entry.count,
    resetAt: entry.windowStart + config.windowMs,
  }
}

/**
 * Database-backed rate limiting for critical operations
 * Uses usage_tracking table for persistent rate limiting
 */
export async function checkPersistentRateLimit(
  userId: string,
  operation: string,
  config: RateLimitConfig
): Promise<RateLimitResult> {
  const now = Date.now()
  const windowStart = now - config.windowMs
  const cacheKey = `${operation}:${userId}`

  // Fast path: check in-memory first
  const memResult = checkRateLimit(cacheKey, config)
  if (!memResult.allowed) {
    return memResult
  }

  // For critical operations, also check database
  // This ensures rate limits persist across function restarts
  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
    const today = new Date().toISOString().split('T')[0]

    // Get today's usage
    const { data: usage } = await supabase
      .from('usage_tracking')
      .select('call_count, last_call_at')
      .eq('user_id', userId)
      .eq('date', today)
      .single()

    if (usage && usage.call_count) {
      // Check if too many calls today
      const dailyLimit = config.maxRequests * 60 * 24 // Scale to daily
      if (usage.call_count > dailyLimit) {
        return {
          allowed: false,
          remaining: 0,
          resetAt: new Date(today).getTime() + 86400000, // Next day
        }
      }
    }
  } catch (error) {
    // If database check fails, rely on in-memory
    console.error('[rateLimit] Database check failed, using in-memory only')
  }

  return memResult
}

/**
 * Default rate limit configurations (tightened for security)
 */
export const RATE_LIMITS = {
  // Token requests: 5 per minute per user (reduced from 10)
  TOKEN_REQUEST: {
    windowMs: 60000,
    maxRequests: 5,
  },

  // Usage tracking: 10 per minute per user (reduced from 20)
  USAGE_TRACK: {
    windowMs: 60000,
    maxRequests: 10,
  },

  // Subscription checks: 15 per minute per user (reduced from 30)
  SUBSCRIPTION_CHECK: {
    windowMs: 60000,
    maxRequests: 15,
  },

  // Subscription operations: 3 per minute (create/cancel)
  SUBSCRIPTION_MODIFY: {
    windowMs: 60000,
    maxRequests: 3,
  },

  // Voice turn: 30 per minute (for active calls)
  VOICE_TURN: {
    windowMs: 60000,
    maxRequests: 30,
  },

  // Webhook calls: 100 per minute (from Razorpay)
  WEBHOOK: {
    windowMs: 60000,
    maxRequests: 100,
  },
}

/**
 * Create rate limit headers for response
 */
export function rateLimitHeaders(result: RateLimitResult): Record<string, string> {
  return {
    'X-RateLimit-Remaining': result.remaining.toString(),
    'X-RateLimit-Reset': new Date(result.resetAt).toISOString(),
    ...(result.allowed
      ? {}
      : { 'Retry-After': Math.ceil((result.resetAt - Date.now()) / 1000).toString() }),
  }
}

/**
 * Create a rate limited response
 */
export function rateLimitedResponse(result: RateLimitResult): Response {
  return new Response(
    JSON.stringify({
      error: 'Too many requests',
      code: 'RATE_LIMITED',
      retry_after: Math.ceil((result.resetAt - Date.now()) / 1000),
    }),
    {
      status: 429,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        ...rateLimitHeaders(result),
      },
    }
  )
}

/**
 * IP-based rate limiting (for unauthenticated endpoints)
 */
export function checkIpRateLimit(
  request: Request,
  config: RateLimitConfig
): RateLimitResult {
  // Get client IP from headers (Cloudflare, Vercel, or direct)
  const ip =
    request.headers.get('cf-connecting-ip') ||
    request.headers.get('x-real-ip') ||
    request.headers.get('x-forwarded-for')?.split(',')[0] ||
    'unknown'

  return checkRateLimit(`ip:${ip}`, config)
}
