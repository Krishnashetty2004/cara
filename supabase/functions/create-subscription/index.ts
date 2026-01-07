/**
 * Create Razorpay Subscription
 *
 * Creates a new subscription for the authenticated user.
 * Security: Uses JWT auth - user can only create subscriptions for themselves.
 *
 * Deploy with: supabase functions deploy create-subscription
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { requireAuth, getAdminClient } from '../_shared/auth.ts'
import { PERMISSIVE_CORS_HEADERS } from '../_shared/cors.ts'

const RAZORPAY_KEY_ID = Deno.env.get('RAZORPAY_KEY_ID')!
const RAZORPAY_KEY_SECRET = Deno.env.get('RAZORPAY_KEY_SECRET')!
const RAZORPAY_PLAN_ID = Deno.env.get('RAZORPAY_PLAN_ID')!

serve(async (req: Request) => {
  const corsHeaders = PERMISSIVE_CORS_HEADERS

  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  try {
    // Authenticate request via JWT
    const { auth, response: authResponse } = await requireAuth(req, corsHeaders)
    if (authResponse) {
      return authResponse
    }

    const { userId, clerkId } = auth

    // Use service role client
    const adminClient = getAdminClient()

    // Get user details from database
    const { data: user, error: userError } = await adminClient
      .from('users')
      .select('id, email, name')
      .eq('id', userId)
      .single()

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'User not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check if user already has an active subscription
    const { data: existingSub } = await adminClient
      .from('subscriptions')
      .select('id, status')
      .eq('user_id', userId)
      .eq('status', 'active')
      .single()

    if (existingSub) {
      return new Response(
        JSON.stringify({ error: 'User already has an active subscription' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`[create-subscription] Creating subscription for user`)

    // Create subscription on Razorpay
    const auth64 = btoa(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`)

    const razorpayResponse = await fetch('https://api.razorpay.com/v1/subscriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth64}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        plan_id: RAZORPAY_PLAN_ID,
        customer_notify: 1,
        quantity: 1,
        total_count: 52, // 52 weeks = 1 year
        notes: {
          user_id: userId, // Internal database UUID
          clerk_id: clerkId, // Clerk ID for verification
          email: user.email || '',
        },
      }),
    })

    if (!razorpayResponse.ok) {
      const errorText = await razorpayResponse.text()
      console.error('[create-subscription] Razorpay error:', razorpayResponse.status)
      return new Response(
        JSON.stringify({ error: 'Failed to create subscription' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const subscription = await razorpayResponse.json()

    // Save subscription to database
    const { error: dbError } = await adminClient
      .from('subscriptions')
      .insert({
        user_id: userId,
        razorpay_subscription_id: subscription.id,
        razorpay_customer_id: subscription.customer_id || null,
        plan_id: subscription.plan_id,
        status: subscription.status,
        current_period_start: subscription.current_start
          ? new Date(subscription.current_start * 1000).toISOString()
          : null,
        current_period_end: subscription.current_end
          ? new Date(subscription.current_end * 1000).toISOString()
          : null,
      })

    if (dbError) {
      console.error('[create-subscription] Database error')
    }

    console.log(`[create-subscription] Subscription created: ${subscription.id}`)

    return new Response(
      JSON.stringify({
        subscription_id: subscription.id,
        status: subscription.status,
        short_url: subscription.short_url,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('[create-subscription] Error')
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
