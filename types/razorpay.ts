// Razorpay Subscription Types

export interface RazorpaySubscription {
  id: string
  entity: 'subscription'
  plan_id: string
  customer_id: string
  status:
    | 'created'
    | 'authenticated'
    | 'active'
    | 'pending'
    | 'halted'
    | 'cancelled'
    | 'completed'
    | 'expired'
  current_start: number // Unix timestamp
  current_end: number // Unix timestamp
  ended_at: number | null
  quantity: number
  notes: Record<string, string>
  charge_at: number
  offer_id: string | null
  short_url: string
  has_scheduled_changes: boolean
  change_scheduled_at: number | null
  source: string
  payment_method: string
  created_at: number
}

export interface RazorpayPayment {
  id: string
  entity: 'payment'
  amount: number // in paise
  currency: string
  status: 'created' | 'authorized' | 'captured' | 'refunded' | 'failed'
  method: string
  description: string | null
  order_id: string | null
  invoice_id: string | null
  international: boolean
  refund_status: string | null
  captured: boolean
  email: string
  contact: string
  customer_id: string
  notes: Record<string, string>
  fee: number
  tax: number
  error_code: string | null
  error_description: string | null
  created_at: number
}

export interface RazorpayWebhookPayload {
  entity: string
  account_id: string
  event:
    | 'subscription.activated'
    | 'subscription.charged'
    | 'subscription.pending'
    | 'subscription.halted'
    | 'subscription.cancelled'
    | 'subscription.completed'
    | 'subscription.expired'
    | 'subscription.updated'
    | 'payment.authorized'
    | 'payment.captured'
    | 'payment.failed'
  contains: string[]
  payload: {
    subscription?: {
      entity: RazorpaySubscription
    }
    payment?: {
      entity: RazorpayPayment
    }
  }
  created_at: number
}

export interface RazorpayCheckoutOptions {
  key: string
  subscription_id: string
  name: string
  description?: string
  image?: string
  prefill?: {
    name?: string
    email?: string
    contact?: string
  }
  theme?: {
    color?: string
  }
  modal?: {
    ondismiss?: () => void
    confirm_close?: boolean
  }
  handler?: (response: RazorpaySuccessResponse) => void
}

export interface RazorpaySuccessResponse {
  razorpay_payment_id: string
  razorpay_subscription_id: string
  razorpay_signature: string
}

export interface RazorpayError {
  code: string
  description: string
  source: string
  step: string
  reason: string
  metadata: {
    order_id?: string
    payment_id?: string
  }
}

// Database types
export interface DbSubscription {
  id: string
  user_id: string
  razorpay_subscription_id: string
  razorpay_customer_id: string | null
  plan_id: string
  status: RazorpaySubscription['status']
  current_period_start: string | null
  current_period_end: string | null
  cancelled_at: string | null
  created_at: string
  updated_at: string
}

export interface DbPaymentHistory {
  id: string
  user_id: string
  subscription_id: string | null
  razorpay_payment_id: string
  amount: number
  currency: string
  status: string
  method: string | null
  created_at: string
}
