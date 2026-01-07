/**
 * Check Subscription Edge Function
 *
 * Verifies user's subscription status before allowing calls.
 * Returns subscription details and usage information.
 *
 * Security: Uses JWT auth to identify user.
 *
 * Deploy with: supabase functions deploy check-subscription
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { requireAuth, getAdminClient } from '../_shared/auth.ts'
import { PERMISSIVE_CORS_HEADERS } from '../_shared/cors.ts'
import { checkRateLimit, RATE_LIMITS, rateLimitedResponse } from '../_shared/rateLimit.ts'

// Free tier limit: 30 minutes = 1800 seconds per day
const FREE_TIER_DAILY_LIMIT_SECONDS = 1800

interface SubscriptionResponse {
  is_premium: boolean
  subscription_status?: string
  plan_id?: string
  current_period_end?: string
  daily_usage_seconds: number
  daily_limit_seconds: number
  remaining_seconds: number
  can_make_call: boolean
  error?: string
}

serve(async (req: Request) => {
  const corsHeaders = PERMISSIVE_CORS_HEADERS

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Authenticate request via JWT
    const { auth, response: authResponse } = await requireAuth(req, corsHeaders)
    if (authResponse) {
      return authResponse
    }

    const { userId, isPremium } = auth

    // Rate limiting
    const rateLimitResult = checkRateLimit(`sub:${userId}`, RATE_LIMITS.SUBSCRIPTION_CHECK)
    if (!rateLimitResult.allowed) {
      return rateLimitedResponse(rateLimitResult)
    }

    // Use service role client
    const adminClient = getAdminClient()

    const today = new Date().toISOString().split('T')[0]

    // Get today's usage
    let dailyUsage = 0
    const { data: usage } = await adminClient
      .from('usage_tracking')
      .select('total_seconds')
      .eq('user_id', userId)
      .eq('date', today)
      .single()

    if (usage) {
      dailyUsage = usage.total_seconds || 0
    }

    // Get subscription details if premium
    let subscriptionDetails: {
      status?: string
      plan_id?: string
      current_period_end?: string
    } = {}

    if (isPremium) {
      const { data: subscription } = await adminClient
        .from('subscriptions')
        .select('status, plan_id, current_period_end')
        .eq('user_id', userId)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      if (subscription) {
        subscriptionDetails = {
          status: subscription.status,
          plan_id: subscription.plan_id,
          current_period_end: subscription.current_period_end,
        }
      }
    }

    const dailyLimit = isPremium ? 999999 : FREE_TIER_DAILY_LIMIT_SECONDS
    const remainingSeconds = Math.max(0, dailyLimit - dailyUsage)
    const canMakeCall = remainingSeconds > 0

    console.log(`[check-subscription] Premium: ${isPremium}, remaining: ${remainingSeconds}s`)

    const response: SubscriptionResponse = {
      is_premium: isPremium,
      subscription_status: subscriptionDetails.status,
      plan_id: subscriptionDetails.plan_id,
      current_period_end: subscriptionDetails.current_period_end,
      daily_usage_seconds: dailyUsage,
      daily_limit_seconds: dailyLimit,
      remaining_seconds: remainingSeconds,
      can_make_call: canMakeCall,
    }

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (error) {
    console.error('[check-subscription] Unexpected error')
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
