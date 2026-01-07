/**
 * Get Razorpay Subscription URL
 *
 * Retrieves the payment URL for a subscription.
 * Security: Uses JWT auth and verifies subscription ownership.
 *
 * Deploy with: supabase functions deploy get-subscription-url
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

    // Verify the user owns this subscription
    const { data: subscription, error: lookupError } = await adminClient
      .from('subscriptions')
      .select('id, user_id, razorpay_subscription_id')
      .eq('razorpay_subscription_id', subscription_id)
      .single()

    if (lookupError || !subscription) {
      return new Response(
        JSON.stringify({ error: 'Subscription not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Ownership check
    if (subscription.user_id !== userId) {
      console.error('[get-subscription-url] Unauthorized access attempt')
      return forbiddenResponse('You can only access your own subscription', corsHeaders)
    }

    console.log(`[get-subscription-url] Fetching URL for subscription`)

    // Get subscription details from Razorpay
    const auth64 = btoa(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`)

    const razorpayResponse = await fetch(
      `https://api.razorpay.com/v1/subscriptions/${subscription_id}`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Basic ${auth64}`,
        },
      }
    )

    if (!razorpayResponse.ok) {
      console.error('[get-subscription-url] Razorpay error:', razorpayResponse.status)
      return new Response(
        JSON.stringify({ error: 'Failed to get subscription' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const razorpaySub = await razorpayResponse.json()

    return new Response(
      JSON.stringify({
        short_url: razorpaySub.short_url,
        status: razorpaySub.status,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('[get-subscription-url] Error')
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
