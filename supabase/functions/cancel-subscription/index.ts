// Cancel Razorpay Subscription
// Deploy with: supabase functions deploy cancel-subscription

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const RAZORPAY_KEY_ID = Deno.env.get('RAZORPAY_KEY_ID')!
const RAZORPAY_KEY_SECRET = Deno.env.get('RAZORPAY_KEY_SECRET')!
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

serve(async (req: Request) => {
  // CORS headers
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      },
    })
  }

  try {
    const { subscription_id } = await req.json()

    if (!subscription_id) {
      return new Response(
        JSON.stringify({ error: 'subscription_id is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Cancel subscription on Razorpay
    const auth = btoa(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`)
    
    const razorpayResponse = await fetch(
      `https://api.razorpay.com/v1/subscriptions/${subscription_id}/cancel`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          cancel_at_cycle_end: 0, // Cancel immediately
        }),
      }
    )

    if (!razorpayResponse.ok) {
      const errorText = await razorpayResponse.text()
      console.error('[CancelSubscription] Razorpay error:', errorText)
      return new Response(
        JSON.stringify({ error: 'Failed to cancel subscription', details: errorText }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      )
    }

    const subscription = await razorpayResponse.json()

    // Update subscription in database
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
    const { error: dbError } = await supabase
      .from('subscriptions')
      .update({
        status: 'cancelled',
        cancelled_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('razorpay_subscription_id', subscription_id)

    if (dbError) {
      console.error('[CancelSubscription] Database error:', dbError)
    }

    return new Response(
      JSON.stringify({
        cancelled: true,
        subscription_id: subscription.id,
        status: subscription.status,
      }),
      {
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    )
  } catch (error: any) {
    console.error('[CancelSubscription] Error:', error)
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
})

