// Get Razorpay Subscription URL
// Deploy with: supabase functions deploy get-subscription-url

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const RAZORPAY_KEY_ID = Deno.env.get('RAZORPAY_KEY_ID')!
const RAZORPAY_KEY_SECRET = Deno.env.get('RAZORPAY_KEY_SECRET')!

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

    // Get subscription details from Razorpay
    const auth = btoa(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`)

    const razorpayResponse = await fetch(
      `https://api.razorpay.com/v1/subscriptions/${subscription_id}`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Basic ${auth}`,
        },
      }
    )

    if (!razorpayResponse.ok) {
      const errorText = await razorpayResponse.text()
      console.error('[GetSubscriptionURL] Razorpay error:', errorText)
      return new Response(
        JSON.stringify({ error: 'Failed to get subscription' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      )
    }

    const subscription = await razorpayResponse.json()

    return new Response(
      JSON.stringify({
        short_url: subscription.short_url,
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
    console.error('[GetSubscriptionURL] Error:', error)
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
})
