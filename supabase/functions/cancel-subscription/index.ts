/**
 * Cancel Razorpay Subscription
 *
 * Cancels a subscription. User can only cancel their own subscriptions.
 * Security: Uses JWT auth and verifies subscription ownership.
 *
 * Deploy with: supabase functions deploy cancel-subscription
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { requireAuth, getAdminClient, forbiddenResponse } from '../_shared/auth.ts'
import { PERMISSIVE_CORS_HEADERS } from '../_shared/cors.ts'
import { validateSubscriptionId, validationErrorResponse } from '../_shared/validation.ts'

const RAZORPAY_KEY_ID = Deno.env.get('RAZORPAY_KEY_ID')!
const RAZORPAY_KEY_SECRET = Deno.env.get('RAZORPAY_KEY_SECRET')!

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

    const { userId } = auth

    // Parse request body
    const { subscription_id } = await req.json()

    // Validate subscription_id format
    const subValidation = validateSubscriptionId(subscription_id)
    if (!subValidation.valid) {
      return validationErrorResponse(subValidation.error!, corsHeaders)
    }

    // Use service role client
    const adminClient = getAdminClient()

    // CRITICAL: Verify the user owns this subscription
    const { data: subscription, error: lookupError } = await adminClient
      .from('subscriptions')
      .select('id, user_id, razorpay_subscription_id, status')
      .eq('razorpay_subscription_id', subscription_id)
      .single()

    if (lookupError || !subscription) {
      return new Response(
        JSON.stringify({ error: 'Subscription not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Ownership check - user can only cancel their own subscription
    if (subscription.user_id !== userId) {
      console.error('[cancel-subscription] Unauthorized cancellation attempt')
      return forbiddenResponse('You can only cancel your own subscription', corsHeaders)
    }

    // Check if already cancelled
    if (subscription.status === 'cancelled') {
      return new Response(
        JSON.stringify({ error: 'Subscription is already cancelled' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`[cancel-subscription] Cancelling subscription: ${subscription_id}`)

    // Cancel subscription on Razorpay
    const auth64 = btoa(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`)

    const razorpayResponse = await fetch(
      `https://api.razorpay.com/v1/subscriptions/${subscription_id}/cancel`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${auth64}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          cancel_at_cycle_end: 0, // Cancel immediately
        }),
      }
    )

    if (!razorpayResponse.ok) {
      console.error('[cancel-subscription] Razorpay error:', razorpayResponse.status)
      return new Response(
        JSON.stringify({ error: 'Failed to cancel subscription' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const cancelledSub = await razorpayResponse.json()

    // Update subscription in database
    const { error: dbError } = await adminClient
      .from('subscriptions')
      .update({
        status: 'cancelled',
        cancelled_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('razorpay_subscription_id', subscription_id)

    if (dbError) {
      console.error('[cancel-subscription] Database error')
    }

    // Update user premium status
    await adminClient
      .from('users')
      .update({ is_premium: false })
      .eq('id', userId)

    console.log(`[cancel-subscription] Successfully cancelled: ${subscription_id}`)

    return new Response(
      JSON.stringify({
        cancelled: true,
        subscription_id: cancelledSub.id,
        status: cancelledSub.status,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('[cancel-subscription] Error')
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
