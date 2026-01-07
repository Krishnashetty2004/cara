/**
 * Razorpay Webhook Handler for Supabase Edge Functions
 *
 * Handles subscription lifecycle events from Razorpay.
 * Security:
 * - Validates HMAC signature
 * - Implements idempotency to prevent duplicate processing
 * - Cross-references user_id with database records
 * - Logs all changes for audit trail
 *
 * Deploy with: supabase functions deploy razorpay-webhook
 */

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

/**
 * Log audit event for tracking
 */
async function logAuditEvent(
  supabase: ReturnType<typeof createClient>,
  eventType: string,
  userId: string | null,
  details: Record<string, unknown>
) {
  try {
    // For now, just console log. In production, you might want a dedicated audit table
    console.log(`[AUDIT] ${eventType}:`, JSON.stringify({
      user_id: userId ? 'redacted' : null,
      timestamp: new Date().toISOString(),
      ...details,
    }))
  } catch (e) {
    console.error('[AUDIT] Failed to log event')
  }
}

/**
 * Check if webhook event was already processed (idempotency)
 */
async function isEventProcessed(
  supabase: ReturnType<typeof createClient>,
  eventId: string,
  subscriptionId: string
): Promise<boolean> {
  // We'll use the subscription's updated_at as a simple idempotency check
  // A more robust solution would use a dedicated webhook_events table
  const { data } = await supabase
    .from('subscriptions')
    .select('updated_at')
    .eq('razorpay_subscription_id', subscriptionId)
    .single()

  if (!data) return false

  // If updated within last 5 seconds, likely a duplicate
  const updatedAt = new Date(data.updated_at).getTime()
  const now = Date.now()
  return (now - updatedAt) < 5000
}

/**
 * Verify user exists and matches the one in subscription notes
 */
async function verifyUserFromSubscription(
  supabase: ReturnType<typeof createClient>,
  subscriptionId: string,
  notesUserId: string
): Promise<{ verified: boolean; userId: string | null }> {
  // First, try to find existing subscription in our database
  const { data: existingSub } = await supabase
    .from('subscriptions')
    .select('user_id')
    .eq('razorpay_subscription_id', subscriptionId)
    .single()

  if (existingSub) {
    // Verify the notes user_id matches our database
    if (existingSub.user_id !== notesUserId) {
      console.error('[webhook] User mismatch! Notes:', notesUserId, 'DB:', existingSub.user_id)
      return { verified: false, userId: null }
    }
    return { verified: true, userId: existingSub.user_id }
  }

  // For new subscriptions, verify user exists in users table
  const { data: user } = await supabase
    .from('users')
    .select('id')
    .eq('id', notesUserId)
    .single()

  if (!user) {
    console.error('[webhook] User not found:', notesUserId)
    return { verified: false, userId: null }
  }

  return { verified: true, userId: notesUserId }
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
      console.error('[webhook] Missing signature')
      await logAuditEvent(null as any, 'WEBHOOK_AUTH_FAILED', null, { reason: 'missing_signature' })
      return new Response('Missing signature', { status: 401 })
    }

    // Verify webhook signature
    const expectedSignature = createHmac('sha256', RAZORPAY_WEBHOOK_SECRET)
      .update(body)
      .digest('hex')

    if (signature !== expectedSignature) {
      console.error('[webhook] Invalid signature')
      await logAuditEvent(null as any, 'WEBHOOK_AUTH_FAILED', null, { reason: 'invalid_signature' })
      return new Response('Invalid signature', { status: 401 })
    }

    // Parse payload
    const payload: RazorpayWebhookPayload = JSON.parse(body)
    console.log(`[webhook] Received: ${payload.event}`)

    // Initialize Supabase client with service role
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    // Handle different events
    switch (payload.event) {
      case 'subscription.activated':
      case 'subscription.charged': {
        const sub = payload.payload.subscription?.entity
        if (!sub) break

        // Get user_id from subscription notes
        const notesUserId = sub.notes?.user_id
        if (!notesUserId) {
          console.error('[webhook] No user_id in subscription notes')
          await logAuditEvent(supabase, 'WEBHOOK_MISSING_USER', null, {
            subscription_id: sub.id,
            event: payload.event,
          })
          break
        }

        // Verify user
        const { verified, userId } = await verifyUserFromSubscription(supabase, sub.id, notesUserId)
        if (!verified || !userId) {
          console.error('[webhook] User verification failed')
          await logAuditEvent(supabase, 'WEBHOOK_USER_MISMATCH', null, {
            subscription_id: sub.id,
            notes_user_id: 'redacted',
          })
          break
        }

        // Check idempotency
        if (await isEventProcessed(supabase, payload.event, sub.id)) {
          console.log('[webhook] Event already processed, skipping')
          return new Response(JSON.stringify({ received: true, skipped: true }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          })
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
          console.error('[webhook] Error upserting subscription')
        }

        // Update user premium status
        const { error: userError } = await supabase
          .from('users')
          .update({ is_premium: true })
          .eq('id', userId)

        if (userError) {
          console.error('[webhook] Error updating user premium status')
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

        await logAuditEvent(supabase, 'SUBSCRIPTION_ACTIVATED', userId, {
          subscription_id: sub.id,
          event: payload.event,
        })

        console.log(`[webhook] Subscription activated`)
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
          console.error('[webhook] Error updating subscription status')
        }

        await logAuditEvent(supabase, 'SUBSCRIPTION_STATUS_CHANGED', null, {
          subscription_id: sub.id,
          status: sub.status,
        })

        console.log(`[webhook] Subscription ${sub.status}`)
        break
      }

      case 'subscription.cancelled':
      case 'subscription.completed':
      case 'subscription.expired': {
        const sub = payload.payload.subscription?.entity
        if (!sub) break

        // Get user from subscription
        const { data: subData, error: fetchError } = await supabase
          .from('subscriptions')
          .select('user_id')
          .eq('razorpay_subscription_id', sub.id)
          .single()

        if (fetchError) {
          console.error('[webhook] Error fetching subscription')
          break
        }

        // Check idempotency
        if (await isEventProcessed(supabase, payload.event, sub.id)) {
          console.log('[webhook] Event already processed, skipping')
          return new Response(JSON.stringify({ received: true, skipped: true }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          })
        }

        // Update subscription
        await supabase
          .from('subscriptions')
          .update({
            status: sub.status === 'cancelled' ? 'cancelled' : 'expired',
            cancelled_at: sub.status === 'cancelled' ? new Date().toISOString() : null,
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

        await logAuditEvent(supabase, 'SUBSCRIPTION_ENDED', subData?.user_id || null, {
          subscription_id: sub.id,
          reason: sub.status,
        })

        console.log(`[webhook] Subscription ${sub.status}`)
        break
      }

      case 'payment.failed': {
        const payment = payload.payload.payment?.entity
        if (!payment) break

        await logAuditEvent(supabase, 'PAYMENT_FAILED', null, {
          payment_id: payment.id,
        })

        console.log(`[webhook] Payment failed`)
        break
      }

      default:
        console.log(`[webhook] Unhandled event: ${payload.event}`)
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('[webhook] Error')
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
})
