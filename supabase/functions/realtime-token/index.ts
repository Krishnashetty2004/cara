/**
 * Realtime Token Edge Function
 *
 * This function acts as a secure proxy for OpenAI Realtime API access.
 * It:
 * 1. Verifies the user is authenticated via Clerk JWT
 * 2. Checks their usage limits (10 min free daily, unlimited for premium)
 * 3. Returns an ephemeral token from OpenAI (expires in 60 seconds)
 *
 * The client uses this token to connect to OpenAI directly,
 * keeping the actual API key secure on the server.
 *
 * Deploy with: supabase functions deploy realtime-token
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { requireAuth, getAdminClient } from '../_shared/auth.ts'
import { getCorsHeaders, handleCorsPreflightRequest, PERMISSIVE_CORS_HEADERS } from '../_shared/cors.ts'
import { checkRateLimit, RATE_LIMITS, rateLimitedResponse } from '../_shared/rateLimit.ts'

const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY')!

// Free tier limit: 10 minutes = 600 seconds per day
const FREE_TIER_DAILY_LIMIT_SECONDS = 600

interface TokenResponse {
  token?: string
  expires_at?: number
  remaining_seconds?: number
  is_premium?: boolean
  error?: string
  limit_reached?: boolean
}

serve(async (req: Request) => {
  // Use permissive CORS during migration, then switch to getCorsHeaders(req)
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

    const { clerkId, userId, isPremium } = auth

    // Rate limiting by user
    const rateLimitResult = checkRateLimit(`token:${userId}`, RATE_LIMITS.TOKEN_REQUEST)
    if (!rateLimitResult.allowed) {
      return rateLimitedResponse(rateLimitResult)
    }

    // Use service role client
    const adminClient = getAdminClient()

    // Log request (sanitized - no PII)
    console.log(`[realtime-token] Token request, premium: ${isPremium}`)

    const today = new Date().toISOString().split('T')[0]

    // Get or create usage tracking for today
    let { data: usage, error: usageError } = await adminClient
      .from('usage_tracking')
      .select('*')
      .eq('user_id', userId)
      .eq('date', today)
      .single()

    if (usageError && usageError.code === 'PGRST116') {
      // No usage record for today, create one
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
        console.error('[realtime-token] Usage insert error')
        // Continue without usage tracking
        usage = { total_seconds: 0, call_count: 0 }
      } else {
        usage = newUsage
      }
    }

    const usedSeconds = usage?.total_seconds || 0
    const dailyLimit = isPremium ? 999999 : FREE_TIER_DAILY_LIMIT_SECONDS

    // Check if user has exceeded their limit
    if (usedSeconds >= dailyLimit) {
      console.log(`[realtime-token] Daily limit reached, premium: ${isPremium}`)
      return new Response(JSON.stringify({
        error: 'Daily limit reached',
        limit_reached: true,
        is_premium: isPremium,
        remaining_seconds: 0,
      } as TokenResponse), {
        status: 429,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Request ephemeral token from OpenAI
    const openaiResponse = await fetch('https://api.openai.com/v1/realtime/sessions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-realtime-preview-2024-12-17',
        voice: 'shimmer',
      }),
    })

    if (!openaiResponse.ok) {
      const errorText = await openaiResponse.text()
      console.error('[realtime-token] OpenAI API error:', openaiResponse.status)

      if (errorText.includes('insufficient_quota')) {
        return new Response(JSON.stringify({
          error: 'Service temporarily unavailable. Please try again later.',
        }), {
          status: 503,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      return new Response(JSON.stringify({
        error: 'Failed to create realtime session',
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const session = await openaiResponse.json()

    // Increment call count
    await adminClient
      .from('usage_tracking')
      .update({
        call_count: (usage?.call_count || 0) + 1,
        last_call_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId)
      .eq('date', today)

    console.log(`[realtime-token] Token issued, remaining: ${dailyLimit - usedSeconds}s`)

    // Return the ephemeral token and usage info
    return new Response(JSON.stringify({
      token: session.client_secret?.value,
      expires_at: session.client_secret?.expires_at,
      remaining_seconds: dailyLimit - usedSeconds,
      is_premium: isPremium,
    } as TokenResponse), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (error) {
    console.error('[realtime-token] Unexpected error')
    return new Response(JSON.stringify({
      error: 'Internal server error',
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
