import { createClient, SupabaseClient } from '@supabase/supabase-js'
import * as SecureStore from 'expo-secure-store'
import { Platform } from 'react-native'

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!

// Custom storage adapter for Expo SecureStore
const ExpoSecureStoreAdapter = {
  getItem: async (key: string): Promise<string | null> => {
    if (Platform.OS === 'web') {
      return localStorage.getItem(key)
    }
    return SecureStore.getItemAsync(key)
  },
  setItem: async (key: string, value: string): Promise<void> => {
    if (Platform.OS === 'web') {
      localStorage.setItem(key, value)
      return
    }
    await SecureStore.setItemAsync(key, value)
  },
  removeItem: async (key: string): Promise<void> => {
    if (Platform.OS === 'web') {
      localStorage.removeItem(key)
      return
    }
    await SecureStore.deleteItemAsync(key)
  },
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: ExpoSecureStoreAdapter,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
})

/**
 * Invoke a Supabase Edge Function with Clerk JWT authentication
 *
 * This function adds the Clerk token to the Authorization header
 * for secure authentication with our Edge Functions.
 *
 * @param functionName - Name of the Edge Function to call
 * @param options - Options including body data
 * @param getToken - Function to get the Clerk JWT token
 */
export async function invokeWithAuth(
  functionName: string,
  options: {
    body?: Record<string, unknown>
    method?: 'POST' | 'GET'
  },
  getToken: () => Promise<string | null>
): Promise<{ data: unknown; error: Error | null }> {
  try {
    // Get the Clerk JWT token
    let token = await getToken()

    // Fallback: If no Clerk token, use anon key (for testing/free tier)
    if (!token) {
      console.log('[Supabase] No Clerk token, using anon key fallback')
      token = supabaseAnonKey
    }

    // Make the request with the Authorization header
    const response = await fetch(
      `${supabaseUrl}/functions/v1/${functionName}`,
      {
        method: options.method || 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'apikey': supabaseAnonKey,
        },
        body: options.body ? JSON.stringify(options.body) : undefined,
      }
    )

    const data = await response.json()

    if (!response.ok) {
      return {
        data: null,
        error: new Error(data.error || `HTTP ${response.status}`),
      }
    }

    return { data, error: null }
  } catch (err) {
    return {
      data: null,
      error: err instanceof Error ? err : new Error('Unknown error'),
    }
  }
}

/**
 * Create a helper for authenticated Edge Function calls
 * Use this in components/hooks that have access to Clerk's getToken
 */
export function createAuthenticatedInvoker(getToken: () => Promise<string | null>) {
  return async function invoke(
    functionName: string,
    options: { body?: Record<string, unknown>; method?: 'POST' | 'GET' } = {}
  ) {
    return invokeWithAuth(functionName, options, getToken)
  }
}
