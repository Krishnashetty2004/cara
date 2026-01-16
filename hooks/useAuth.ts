import { useState, useEffect, useCallback } from 'react'
import { useAuth as useClerkAuth, useUser as useClerkUser } from '@clerk/clerk-expo'
import * as WebBrowser from 'expo-web-browser'
import { useOAuth } from '@clerk/clerk-expo'
import { useWarmUpBrowser } from './useWarmUpBrowser'
import { supabase } from '@/lib/supabase'
import type { DbUser } from '@/types/database'

// Complete any pending auth sessions
WebBrowser.maybeCompleteAuthSession()

export interface AuthUser {
  id: string
  clerkId: string
  email: string | null
  name: string | null
  avatarUrl: string | null
  totalCalls: number
  totalMinutes: number
  isPremium: boolean
}

interface UseAuthReturn {
  user: AuthUser | null
  isLoading: boolean
  isAuthenticated: boolean
  error: string | null
  signIn: () => Promise<void>
  signOut: () => Promise<void>
  clearError: () => void
}

export function useAuth(): UseAuthReturn {
  // Warm up browser for faster OAuth
  useWarmUpBrowser()

  const { isLoaded: isClerkLoaded, isSignedIn, signOut: clerkSignOut, getToken } = useClerkAuth()
  const { user: clerkUser } = useClerkUser()
  const { startOAuthFlow } = useOAuth({ strategy: 'oauth_google' })

  const [user, setUser] = useState<AuthUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [realAuthState, setRealAuthState] = useState(false)

  // Check real auth state using getToken()
  useEffect(() => {
    async function checkRealAuth() {
      if (!isClerkLoaded) return

      try {
        const token = await getToken()
        const hasValidSession = !!token
        setRealAuthState(hasValidSession)
        // [useAuth] Real auth state:', { hasToken: hasValidSession, isSignedIn })
      } catch (err) {
        setRealAuthState(false)
      }
    }

    checkRealAuth()
  }, [isClerkLoaded, isSignedIn])

  // Sync Clerk user with Supabase
  useEffect(() => {
    async function syncUser() {
      if (!isClerkLoaded) return

      if (realAuthState && clerkUser) {
        try {
          const authUser = await getOrCreateSupabaseUser(clerkUser)
          setUser(authUser)
        } catch (err: any) {
          // [useAuth] Error: Error syncing user:', err)
          setError(err.message || 'Failed to sync user')
        }
      } else {
        setUser(null)
      }
      setIsLoading(false)
    }

    syncUser()
  }, [isClerkLoaded, realAuthState, clerkUser])

  const signIn = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)

      // Check if already has valid session
      const existingToken = await getToken()
      if (existingToken) {
        // [useAuth] Already has valid session')
        return
      }

      // Start OAuth flow - Clerk handles redirect automatically using app scheme
      const { createdSessionId, setActive } = await startOAuthFlow()

      if (createdSessionId && setActive) {
        await setActive({ session: createdSessionId })
        // Update real auth state immediately
        setRealAuthState(true)
        // User will be synced via useEffect when clerkUser updates
      }
    } catch (err: any) {
      // Don't show error if already signed in
      if (err.message?.includes('already signed in')) {
        // [useAuth] User is already signed in, skipping error')
        setRealAuthState(true)
        return
      }
      
      // [useAuth] Error: Sign in error:', err)
      setError(err.message || 'Failed to sign in with Google')
    } finally {
      setIsLoading(false)
    }
  }, [startOAuthFlow, getToken])

  const signOut = useCallback(async () => {
    try {
      setIsLoading(true)
      await clerkSignOut()
      setUser(null)
    } catch (err: any) {
      // [useAuth] Error: Sign out error:', err)
      setError(err.message || 'Failed to sign out')
    } finally {
      setIsLoading(false)
    }
  }, [clerkSignOut])

  const clearError = useCallback(() => {
    setError(null)
  }, [])

  return {
    user,
    isLoading: !isClerkLoaded || isLoading,
    isAuthenticated: !!user,
    error,
    signIn,
    signOut,
    clearError,
  }
}

// Create or fetch user in Supabase database
async function getOrCreateSupabaseUser(clerkUser: any): Promise<AuthUser> {
  const clerkId = clerkUser.id
  const email = clerkUser.primaryEmailAddress?.emailAddress || null
  const name = clerkUser.fullName || clerkUser.firstName || null
  const avatarUrl = clerkUser.imageUrl || null

  // Try to get existing user by clerk_id
  let { data: existingUser, error: fetchError } = await supabase
    .from('users')
    .select('*')
    .eq('clerk_id', clerkId)
    .single()

  if (fetchError && fetchError.code !== 'PGRST116') {
    console.error('[Auth] Fetch user error:', fetchError)
  }

  if (existingUser) {
    // Update user info if changed
    if (existingUser.email !== email || existingUser.name !== name || existingUser.avatar_url !== avatarUrl) {
      await supabase
        .from('users')
        .update({ email, name, avatar_url: avatarUrl })
        .eq('clerk_id', clerkId)
    }
    return mapDbUserToAuthUser(existingUser as DbUser, clerkId)
  }

  // Also check by google_id for backward compatibility
  let { data: googleUser } = await supabase
    .from('users')
    .select('*')
    .eq('google_id', clerkId)
    .single()

  if (googleUser) {
    // Migrate to clerk_id
    await supabase
      .from('users')
      .update({ clerk_id: clerkId, email, name, avatar_url: avatarUrl })
      .eq('google_id', clerkId)
    return mapDbUserToAuthUser(googleUser as DbUser, clerkId)
  }

  // Create new user
  const { data: newUser, error: createError } = await supabase
    .from('users')
    .insert({
      clerk_id: clerkId,
      google_id: clerkId, // For backward compatibility
      email,
      name,
      avatar_url: avatarUrl,
      total_calls: 0,
      total_minutes: 0,
      is_premium: false,
    })
    .select()
    .single()

  if (createError) {
    console.error('[Auth] Create user error:', createError)
    throw createError
  }

  return mapDbUserToAuthUser(newUser as DbUser, clerkId)
}

function mapDbUserToAuthUser(dbUser: DbUser, clerkId: string): AuthUser {
  return {
    id: dbUser.id,
    clerkId: clerkId,
    email: dbUser.email,
    name: dbUser.name,
    avatarUrl: dbUser.avatar_url,
    totalCalls: dbUser.total_calls,
    totalMinutes: dbUser.total_minutes,
    isPremium: dbUser.is_premium,
  }
}
