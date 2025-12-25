// Razorpay Webhook Handler for Supabase Edge Functions
// Deploy with: supabase functions deploy razorpay-webhook

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { createHmac } from 'https://deno.land/std@0.168.0/node/crypto.ts'

const RAZORPAY_WEBHOOK_SECRET = Deno.env.get('RAZORPAY_WEBHOOK_SECRET')!
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

interface RazorpayWebhookPayload {
  entity: string
  account_id: string
  event: string
  contains: string[]
  payload: {
    subscription?: {
      entity: {
        id: string
        plan_id: string
        customer_id: string
        status: string
        current_start: number
        current_end: number
        notes: Record<string, string>
      }
    }
    payment?: {
      entity: {
        id: string
        amount: number
        currency: string
        status: string
        method: string
      }
    }
  }
  created_at: number
}

serve(async (req: Request) => {
  // Only accept POST
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  try {
    // Get raw body for signature verification
    const body = await req.text()
    const signature = req.headers.get('x-razorpay-signature')

    if (!signature) {
      console.error('Missing webhook signature')
      return new Response('Missing signature', { status: 401 })
    }

    // Verify webhook signature
    const expectedSignature = createHmac('sha256', RAZORPAY_WEBHOOK_SECRET)
      .update(body)
      .digest('hex')

    if (signature !== expectedSignature) {
      console.error('Invalid webhook signature')
      return new Response('Invalid signature', { status: 401 })
    }

    // Parse payload
    const payload: RazorpayWebhookPayload = JSON.parse(body)
    console.log(`Received webhook: ${payload.event}`)

    // Initialize Supabase client with service role
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    // Handle different events
    switch (payload.event) {
      case 'subscription.activated':
      case 'subscription.charged': {
        const sub = payload.payload.subscription?.entity
        if (!sub) break

        // Get user_id from subscription notes
        const userId = sub.notes?.user_id
        if (!userId) {
          console.error('No user_id in subscription notes')
          break
        }

        // Upsert subscription record
        const { error: subError } = await supabase.from('subscriptions').upsert(
          {
            user_id: userId,
            razorpay_subscription_id: sub.id,
            razorpay_customer_id: sub.customer_id,
            plan_id: sub.plan_id,
            status: 'active',
            current_period_start: new Date(sub.current_start * 1000).toISOString(),
            current_period_end: new Date(sub.current_end * 1000).toISOString(),
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'razorpay_subscription_id' }
        )

        if (subError) {
          console.error('Error upserting subscription:', subError)
        }

        // Update user premium status
        const { error: userError } = await supabase
          .from('users')
          .update({ is_premium: true })
          .eq('id', userId)

        if (userError) {
          console.error('Error updating user premium status:', userError)
        }

        // Log payment if present
        if (payload.payload.payment?.entity) {
          const payment = payload.payload.payment.entity
          await supabase.from('payment_history').upsert(
            {
              user_id: userId,
              razorpay_payment_id: payment.id,
              amount: payment.amount,
              currency: payment.currency,
              status: payment.status,
              method: payment.method,
            },
            { onConflict: 'razorpay_payment_id' }
          )
        }

        console.log(`Subscription activated for user ${userId}`)
        break
      }

      case 'subscription.pending':
      case 'subscription.halted': {
        const sub = payload.payload.subscription?.entity
        if (!sub) break

        // Update subscription status
        const { error } = await supabase
          .from('subscriptions')
          .update({
            status: sub.status,
            updated_at: new Date().toISOString(),
          })
          .eq('razorpay_subscription_id', sub.id)

        if (error) {
          console.error('Error updating subscription status:', error)
        }

        console.log(`Subscription ${sub.status} for ${sub.id}`)
        break
      }

      case 'subscription.cancelled':
      case 'subscription.completed':
      case 'subscription.expired': {
        const sub = payload.payload.subscription?.entity
        if (!sub) break

        // Update subscription status
        const { data: subData, error: fetchError } = await supabase
          .from('subscriptions')
          .select('user_id')
          .eq('razorpay_subscription_id', sub.id)
          .single()

        if (fetchError) {
          console.error('Error fetching subscription:', fetchError)
          break
        }

        // Update subscription
        await supabase
          .from('subscriptions')
          .update({
            status: sub.status === 'cancelled' ? 'cancelled' : 'expired',
            cancelled_at:
              sub.status === 'cancelled' ? new Date().toISOString() : null,
            updated_at: new Date().toISOString(),
          })
          .eq('razorpay_subscription_id', sub.id)

        // Update user premium status to false
        if (subData?.user_id) {
          await supabase
            .from('users')
            .update({ is_premium: false })
            .eq('id', subData.user_id)
        }

        console.log(`Subscription ${sub.status} for user ${subData?.user_id}`)
        break
      }

      case 'payment.failed': {
        const payment = payload.payload.payment?.entity
        if (!payment) break

        console.log(`Payment failed: ${payment.id}`)
        // Could send notification to user here
        break
      }

      default:
        console.log(`Unhandled event: ${payload.event}`)
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('Webhook error:', error)
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
})
