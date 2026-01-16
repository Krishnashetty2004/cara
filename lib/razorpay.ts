// Razorpay Client for React Native
// Note: For Expo managed workflow, we use Razorpay's web-based checkout

import { Linking, Platform } from 'react-native'
import { CONFIG } from '@/constants/config'
import { supabase, createAuthenticatedInvoker } from '@/lib/supabase'
import type {
  RazorpayCheckoutOptions,
  RazorpaySuccessResponse,
  DbSubscription,
} from '@/types/razorpay'

const RAZORPAY_KEY_ID = CONFIG.RAZORPAY_KEY_ID
const RAZORPAY_PLAN_ID = CONFIG.RAZORPAY_PLAN_ID

// Create a subscription via Supabase Edge Function
export async function createSubscription(
  getToken: () => Promise<string | null>
): Promise<string | null> {
  try {
    const authenticatedInvoke = createAuthenticatedInvoker(getToken)

    // Call edge function to create subscription on Razorpay
    // User ID is extracted from JWT token by Edge Function
    const { data, error } = await authenticatedInvoke('create-subscription', {
      method: 'POST',
    })

    if (error) {
      // [Razorpay] Error: Error creating subscription:', error)
      return null
    }

    return (data as { subscription_id?: string })?.subscription_id || null
  } catch (error) {
    // [Razorpay] Error: Create subscription error:', error)
    return null
  }
}

// Open Razorpay checkout
// For Expo managed workflow, we use browser-based checkout
export async function openCheckout(
  subscriptionId: string,
  user: { id: string; email?: string | null; name?: string | null },
  getToken?: () => Promise<string | null>
): Promise<RazorpaySuccessResponse | null> {
  return new Promise((resolve) => {
    if (Platform.OS === 'web') {
      // Web checkout using Razorpay.js
      openWebCheckout(subscriptionId, user, resolve)
    } else {
      // For Expo Go / managed workflow, use browser checkout
      // Native module requires a development build
      openBrowserCheckout(subscriptionId, resolve, getToken)
    }
  })
}

// Web-based checkout
function openWebCheckout(
  subscriptionId: string,
  user: { id: string; email?: string | null; name?: string | null },
  resolve: (value: RazorpaySuccessResponse | null) => void
) {
  // This will be injected via a script tag in the web version
  const Razorpay = (window as any).Razorpay

  if (!Razorpay) {
    // [Razorpay] Error: Razorpay.js not loaded')
    resolve(null)
    return
  }

  const options: RazorpayCheckoutOptions = {
    key: RAZORPAY_KEY_ID,
    subscription_id: subscriptionId,
    name: 'Cara Premium',
    description: 'Weekly subscription - ₹99/week',
    prefill: {
      name: user.name || undefined,
      email: user.email || undefined,
    },
    theme: {
      color: '#3B82F6',
    },
    handler: (response: RazorpaySuccessResponse) => {
      resolve(response)
    },
    modal: {
      ondismiss: () => {
        resolve(null)
      },
    },
  }

  const rzp = new Razorpay(options)
  rzp.open()
}

// Native checkout using react-native-razorpay
async function openNativeCheckout(
  subscriptionId: string,
  user: { id: string; email?: string | null; name?: string | null },
  resolve: (value: RazorpaySuccessResponse | null) => void
) {
  try {
    // Try to import react-native-razorpay dynamically
    const RazorpayCheckout = require('react-native-razorpay').default

    const options = {
      key: RAZORPAY_KEY_ID,
      subscription_id: subscriptionId,
      name: 'Cara Premium',
      description: 'Weekly subscription - ₹99/week',
      prefill: {
        name: user.name || '',
        email: user.email || '',
      },
      theme: {
        color: '#3B82F6',
      },
    }

    const response = await RazorpayCheckout.open(options)
    resolve({
      razorpay_payment_id: response.razorpay_payment_id,
      razorpay_subscription_id: response.razorpay_subscription_id,
      razorpay_signature: response.razorpay_signature,
    })
  } catch (error: any) {
    if (error.code === 'MODULE_NOT_FOUND') {
      // Fallback to opening Razorpay payment link in browser
      // [Razorpay] Native module not available, using web checkout')
      openBrowserCheckout(subscriptionId, resolve)
    } else {
      // [Razorpay] Error: Checkout error:', error)
      resolve(null)
    }
  }
}

// Fallback: Open Razorpay short URL in browser
async function openBrowserCheckout(
  subscriptionId: string,
  resolve: (value: RazorpaySuccessResponse | null) => void,
  getToken?: () => Promise<string | null>
) {
  try {
    if (!getToken) {
      // [Razorpay] Error: Cannot get subscription URL - missing getToken')
      resolve(null)
      return
    }

    const authenticatedInvoke = createAuthenticatedInvoker(getToken)
    
    // Get the subscription short URL from our backend
    const { data, error } = await authenticatedInvoke('get-subscription-url', {
      body: { subscription_id: subscriptionId },
    })

    if (error || !(data as { short_url?: string })?.short_url) {
      // [Razorpay] Error: Could not get subscription URL')
      resolve(null)
      return
    }

    // Open in browser
    await Linking.openURL((data as { short_url: string }).short_url)

    // Since we can't get the response directly, we'll rely on webhook
    // Return null and let the webhook update the status
    resolve(null)
  } catch (error) {
    // [Razorpay] Error: Browser checkout error:', error)
    resolve(null)
  }
}

// Verify payment signature (should be done on server, but adding for completeness)
export async function verifyPayment(
  paymentId: string,
  subscriptionId: string,
  signature: string,
  getToken: () => Promise<string | null>
): Promise<boolean> {
  try {
    const authenticatedInvoke = createAuthenticatedInvoker(getToken)
    
    const { data, error } = await authenticatedInvoke('verify-payment', {
      body: {
        razorpay_payment_id: paymentId,
        razorpay_subscription_id: subscriptionId,
        razorpay_signature: signature,
      },
    })

    if (error) {
      // [Razorpay] Error: Verification error:', error)
      return false
    }

    return (data as { verified?: boolean })?.verified === true
  } catch (error) {
    // [Razorpay] Error: Verify payment error:', error)
    return false
  }
}

// Get user's active subscription
export async function getActiveSubscription(
  userId: string
): Promise<DbSubscription | null> {
  try {
    const { data, error } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        // No rows returned
        return null
      }
      // [Razorpay] Error: Get subscription error:', error)
      return null
    }

    return data
  } catch (error) {
    // [Razorpay] Error: Get subscription error:', error)
    return null
  }
}

// Check if subscription is still valid (including grace period)
export function isSubscriptionValid(subscription: DbSubscription | null): boolean {
  if (!subscription) return false
  if (subscription.status !== 'active') return false
  if (!subscription.current_period_end) return false

  const now = new Date()
  const periodEnd = new Date(subscription.current_period_end)

  // Add grace period
  const gracePeriodEnd = new Date(periodEnd)
  gracePeriodEnd.setDate(gracePeriodEnd.getDate() + CONFIG.SUBSCRIPTION_GRACE_DAYS)

  return now <= gracePeriodEnd
}

// Cancel subscription
export async function cancelSubscription(
  subscriptionId: string,
  getToken: () => Promise<string | null>
): Promise<boolean> {
  try {
    const authenticatedInvoke = createAuthenticatedInvoker(getToken)
    
    const { data, error } = await authenticatedInvoke('cancel-subscription', {
      body: { subscription_id: subscriptionId },
    })

    if (error) {
      // [Razorpay] Error: Cancel error:', error)
      return false
    }

    return (data as { cancelled?: boolean })?.cancelled === true
  } catch (error) {
    // [Razorpay] Error: Cancel subscription error:', error)
    return false
  }
}
