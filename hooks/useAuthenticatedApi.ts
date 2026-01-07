/**
 * Hook for making authenticated API calls to Edge Functions
 *
 * This hook provides a secure way to call Edge Functions with
 * the user's Clerk JWT token automatically included.
 */

import { useCallback, useMemo } from 'react'
import { useAuth } from '@clerk/clerk-expo'
import { invokeWithAuth } from '@/lib/supabase'

interface InvokeOptions {
  body?: Record<string, unknown>
  method?: 'POST' | 'GET'
}

interface InvokeResult<T = unknown> {
  data: T | null
  error: Error | null
}

/**
 * Hook that provides authenticated Edge Function invocation
 *
 * Usage:
 * ```tsx
 * const { invoke, isReady } = useAuthenticatedApi()
 *
 * const handleAction = async () => {
 *   const { data, error } = await invoke('function-name', { body: { ... } })
 * }
 * ```
 */
export function useAuthenticatedApi() {
  const { getToken, isLoaded, isSignedIn } = useAuth()

  const invoke = useCallback(
    async <T = unknown>(
      functionName: string,
      options: InvokeOptions = {}
    ): Promise<InvokeResult<T>> => {
      if (!isLoaded) {
        return {
          data: null,
          error: new Error('Auth not loaded yet'),
        }
      }

      if (!isSignedIn) {
        return {
          data: null,
          error: new Error('Not signed in'),
        }
      }

      const result = await invokeWithAuth(functionName, options, getToken)
      return result as InvokeResult<T>
    },
    [getToken, isLoaded, isSignedIn]
  )

  const isReady = isLoaded && isSignedIn

  return {
    invoke,
    isReady,
    getToken,
  }
}

/**
 * Specific API hooks for common operations
 */

// Token response type
interface TokenResponse {
  token?: string
  expires_at?: number
  remaining_seconds?: number
  is_premium?: boolean
  error?: string
  limit_reached?: boolean
}

// Voice turn response type
interface VoiceTurnResponse {
  success: boolean
  user_transcript?: string
  assistant_response?: string
  audio_base64?: string
  audio_format?: string
  latency_ms?: {
    stt: number
    llm: number
    tts: number
    total: number
  }
  error?: string
}

// Usage response type
interface UsageResponse {
  success?: boolean
  total_seconds?: number
  remaining_seconds?: number
  limit_reached?: boolean
  is_premium?: boolean
  error?: string
}

// Subscription response type
interface SubscriptionResponse {
  is_premium: boolean
  subscription_status?: string
  plan_id?: string
  current_period_end?: string
  daily_usage_seconds: number
  daily_limit_seconds: number
  remaining_seconds: number
  can_make_call: boolean
  error?: string
}

/**
 * Hook for realtime token operations
 */
export function useRealtimeTokenApi() {
  const { invoke, isReady } = useAuthenticatedApi()

  const fetchToken = useCallback(async (): Promise<TokenResponse> => {
    const { data, error } = await invoke<TokenResponse>('realtime-token', {
      method: 'POST',
    })

    if (error) {
      return { error: error.message }
    }

    return data || { error: 'No data returned' }
  }, [invoke])

  return { fetchToken, isReady }
}

/**
 * Hook for voice turn operations
 */
export function useVoiceTurnApi() {
  const { invoke, isReady } = useAuthenticatedApi()

  const sendVoiceTurn = useCallback(
    async (params: {
      audio_base64: string
      audio_format?: string
      character_id: string
      system_prompt: string
      conversation_history?: Array<{ role: 'user' | 'assistant'; content: string }>
      generate_opener?: boolean
      opener_text?: string
    }): Promise<VoiceTurnResponse> => {
      const { data, error } = await invoke<VoiceTurnResponse>('voice-turn', {
        body: params,
      })

      if (error) {
        return { success: false, error: error.message }
      }

      return data || { success: false, error: 'No data returned' }
    },
    [invoke]
  )

  return { sendVoiceTurn, isReady }
}

/**
 * Hook for usage tracking operations
 */
export function useUsageTrackingApi() {
  const { invoke, isReady } = useAuthenticatedApi()

  const trackUsage = useCallback(
    async (durationSeconds: number): Promise<UsageResponse> => {
      const { data, error } = await invoke<UsageResponse>('track-usage', {
        body: { duration_seconds: durationSeconds },
      })

      if (error) {
        return { error: error.message }
      }

      return data || { error: 'No data returned' }
    },
    [invoke]
  )

  return { trackUsage, isReady }
}

/**
 * Hook for subscription operations
 */
export function useSubscriptionApi() {
  const { invoke, isReady } = useAuthenticatedApi()

  const checkSubscription = useCallback(async (): Promise<SubscriptionResponse> => {
    const { data, error } = await invoke<SubscriptionResponse>('check-subscription', {
      method: 'POST',
    })

    if (error) {
      return {
        is_premium: false,
        daily_usage_seconds: 0,
        daily_limit_seconds: 600,
        remaining_seconds: 0,
        can_make_call: false,
        error: error.message,
      }
    }

    return (
      data || {
        is_premium: false,
        daily_usage_seconds: 0,
        daily_limit_seconds: 600,
        remaining_seconds: 0,
        can_make_call: false,
        error: 'No data returned',
      }
    )
  }, [invoke])

  const createSubscription = useCallback(async (): Promise<{
    subscription_id?: string
    short_url?: string
    error?: string
  }> => {
    const { data, error } = await invoke<{
      subscription_id: string
      status: string
      short_url: string
    }>('create-subscription', {
      method: 'POST',
    })

    if (error) {
      return { error: error.message }
    }

    return data || { error: 'No data returned' }
  }, [invoke])

  const cancelSubscription = useCallback(
    async (subscriptionId: string): Promise<{ cancelled?: boolean; error?: string }> => {
      const { data, error } = await invoke<{ cancelled: boolean }>('cancel-subscription', {
        body: { subscription_id: subscriptionId },
      })

      if (error) {
        return { error: error.message }
      }

      return data || { error: 'No data returned' }
    },
    [invoke]
  )

  const getSubscriptionUrl = useCallback(
    async (subscriptionId: string): Promise<{ short_url?: string; error?: string }> => {
      const { data, error } = await invoke<{ short_url: string; status: string }>(
        'get-subscription-url',
        {
          body: { subscription_id: subscriptionId },
        }
      )

      if (error) {
        return { error: error.message }
      }

      return data || { error: 'No data returned' }
    },
    [invoke]
  )

  return {
    checkSubscription,
    createSubscription,
    cancelSubscription,
    getSubscriptionUrl,
    isReady,
  }
}
