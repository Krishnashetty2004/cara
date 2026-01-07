/**
 * Track Usage Edge Function
 *
 * Records call duration to the usage_tracking table.
 * Called by the client when a call ends.
 *
 * Security: Uses JWT auth and validates duration server-side.
 *
 * Deploy with: supabase functions deploy track-usage
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { requireAuth, getAdminClient } from '../_shared/auth.ts'
import { PERMISSIVE_CORS_HEADERS } from '../_shared/cors.ts'
import { validateDurationSeconds, validationErrorResponse } from '../_shared/validation.ts'
import { checkRateLimit, RATE_LIMITS, rateLimitedResponse } from '../_shared/rateLimit.ts'

// Free tier limit: 30 minutes = 1800 seconds per day
const FREE_TIER_DAILY_LIMIT_SECONDS = 1800

// Maximum duration per call (2 hours = 7200 seconds)
const MAX_CALL_DURATION_SECONDS = 7200

interface UsageRequest {
  duration_seconds: number
}

interface UsageResponse {
  success?: boolean
  total_seconds?: number
  remaining_seconds?: number
  limit_reached?: boolean
  is_premium?: boolean
  error?: string
}

serve(async (req: Request) => {
  const corsHeaders = PERMISSIVE_CORS_HEADERS

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  // Only accept POST
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  try {
    // Authenticate request via JWT
    const { auth, response: authResponse } = await requireAuth(req, corsHeaders)
    if (authResponse) {
      return authResponse
    }

    const { userId, isPremium } = auth

    // Rate limiting
    const rateLimitResult = checkRateLimit(`usage:${userId}`, RATE_LIMITS.USAGE_TRACK)
    if (!rateLimitResult.allowed) {
      return rateLimitedResponse(rateLimitResult)
    }

    // Parse request body
    const body: UsageRequest = await req.json()

    // Validate duration
    const durationValidation = validateDurationSeconds(body.duration_seconds)
    if (!durationValidation.valid) {
      return validationErrorResponse(durationValidation.error!, corsHeaders)
    }

    // Clamp duration to valid range
    const durationSeconds = Math.min(
      MAX_CALL_DURATION_SECONDS,
      Math.max(0, Math.floor(body.duration_seconds || 0))
    )

    if (durationSeconds === 0) {
      return new Response(JSON.stringify({ success: true, message: 'No usage to record' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Use service role client for database operations
    const adminClient = getAdminClient()

    console.log(`[track-usage] Recording ${durationSeconds}s, premium: ${isPremium}`)

    const today = new Date().toISOString().split('T')[0]

    // Get or create usage record for today
    let { data: usage, error: usageError } = await adminClient
      .from('usage_tracking')
      .select('*')
      .eq('user_id', userId)
      .eq('date', today)
      .single()

    if (usageError && usageError.code === 'PGRST116') {
      // No record exists, create one
      const { data: newUsage, error: insertError } = await adminClient
        .from('usage_tracking')
        .insert({
          user_id: userId,
          date: today,
          total_seconds: 0,
          call_count: 0,
        })
        .select()
        .single()

      if (insertError) {
        console.error('[track-usage] Usage insert error')
        return new Response(JSON.stringify({ error: 'Failed to create usage record' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
      usage = newUsage
    }

    // Calculate new totals
    const currentSeconds = usage?.total_seconds || 0
    const newTotalSeconds = currentSeconds + durationSeconds
    const dailyLimit = isPremium ? 999999 : FREE_TIER_DAILY_LIMIT_SECONDS
    const remainingSeconds = Math.max(0, dailyLimit - newTotalSeconds)
    const limitReached = newTotalSeconds >= dailyLimit

    // Update usage record
    const { error: updateError } = await adminClient
      .from('usage_tracking')
      .update({
        total_seconds: newTotalSeconds,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId)
      .eq('date', today)

    if (updateError) {
      console.error('[track-usage] Usage update error')
      return new Response(JSON.stringify({ error: 'Failed to update usage' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Also update user's total minutes (for non-premium users)
    if (!isPremium) {
      await adminClient
        .from('users')
        .update({
          total_minutes: Math.floor(newTotalSeconds / 60),
        })
        .eq('id', userId)
    }

    console.log(`[track-usage] Updated: ${newTotalSeconds}s total, ${remainingSeconds}s remaining`)

    return new Response(JSON.stringify({
      success: true,
      total_seconds: newTotalSeconds,
      remaining_seconds: remainingSeconds,
      limit_reached: limitReached,
      is_premium: isPremium,
    } as UsageResponse), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (error) {
    console.error('[track-usage] Unexpected error')
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
