// Create Razorpay Subscription
// Deploy with: supabase functions deploy create-subscription

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const RAZORPAY_KEY_ID = Deno.env.get('RAZORPAY_KEY_ID')!
const RAZORPAY_KEY_SECRET = Deno.env.get('RAZORPAY_KEY_SECRET')!
const RAZORPAY_PLAN_ID = Deno.env.get('RAZORPAY_PLAN_ID')!
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
    const { user_id } = await req.json()

    if (!user_id) {
      return new Response(
        JSON.stringify({ error: 'user_id is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Get user details from Supabase
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('id', user_id)
      .single()

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'User not found' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Create subscription on Razorpay
    const auth = btoa(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`)
    
    const razorpayResponse = await fetch('https://api.razorpay.com/v1/subscriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        plan_id: RAZORPAY_PLAN_ID,
        customer_notify: 1,
        quantity: 1,
        total_count: 52, // 52 weeks = 1 year
        notes: {
          user_id: user_id,
          email: user.email || '',
        },
      }),
    })

    if (!razorpayResponse.ok) {
      const errorText = await razorpayResponse.text()
      console.error('[CreateSubscription] Razorpay error:', errorText)
      return new Response(
        JSON.stringify({ error: 'Failed to create subscription', details: errorText }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      )
    }

    const subscription = await razorpayResponse.json()

    // Save subscription to database
    const { error: dbError } = await supabase
      .from('subscriptions')
      .insert({
        user_id: user_id,
        razorpay_subscription_id: subscription.id,
        razorpay_customer_id: subscription.customer_id || null,
        plan_id: subscription.plan_id,
        status: subscription.status,
        current_period_start: subscription.current_start ? new Date(subscription.current_start * 1000).toISOString() : null,
        current_period_end: subscription.current_end ? new Date(subscription.current_end * 1000).toISOString() : null,
      })

    if (dbError) {
      console.error('[CreateSubscription] Database error:', dbError)
    }

    return new Response(
      JSON.stringify({
        subscription_id: subscription.id,
        status: subscription.status,
        short_url: subscription.short_url,
      }),
      {
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    )
  } catch (error: any) {
    console.error('[CreateSubscription] Error:', error)
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
})

