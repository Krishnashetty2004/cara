import { supabase } from '@/lib/supabase'
import * as WebBrowser from 'expo-web-browser'
import * as Linking from 'expo-linking'
import type { DbUser, DbRelationshipProgress } from '@/types/database'

// Configure web browser for OAuth
WebBrowser.maybeCompleteAuthSession()

// Get the redirect URL for OAuth
const redirectUrl = Linking.createURL('auth/callback')

export interface AuthUser {
  id: string
  email: string | null
  name: string | null
  avatarUrl: string | null
  totalCalls: number
  totalMinutes: number
  isPremium: boolean
}

export interface AuthState {
  user: AuthUser | null
  isLoading: boolean
  error: string | null
}

// Sign in with Google OAuth
export async function signInWithGoogle(): Promise<AuthUser | null> {
  try {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: redirectUrl,
        skipBrowserRedirect: true,
      },
    })

    if (error) throw error

    if (data.url) {
      // Open browser for OAuth
      const result = await WebBrowser.openAuthSessionAsync(data.url, redirectUrl)

      if (result.type === 'success') {
        // Extract the URL and get the session
        const url = result.url
        const params = new URL(url).searchParams
        const accessToken = params.get('access_token')
        const refreshToken = params.get('refresh_token')

        if (accessToken && refreshToken) {
          const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          })

          if (sessionError) throw sessionError

          if (sessionData.user) {
            // Create or fetch user in our database
            return await getOrCreateUser(sessionData.user)
          }
        }
      }
    }

    return null
  } catch (error) {
    console.error('[Auth] Google sign-in error:', error)
    throw error
  }
}

// Sign out
export async function signOut(): Promise<void> {
  try {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
  } catch (error) {
    console.error('[Auth] Sign out error:', error)
    throw error
  }
}

// Get current session
export async function getCurrentUser(): Promise<AuthUser | null> {
  try {
    const { data: { session } } = await supabase.auth.getSession()

    if (!session?.user) {
      return null
    }

    return await getOrCreateUser(session.user)
  } catch (error) {
    console.error('[Auth] Get current user error:', error)
    return null
  }
}

// Create or fetch user in our database
async function getOrCreateUser(authUser: { id: string; email?: string; user_metadata?: any }): Promise<AuthUser> {
  const googleId = authUser.id
  const email = authUser.email || null
  const name = authUser.user_metadata?.full_name || authUser.user_metadata?.name || null
  const avatarUrl = authUser.user_metadata?.avatar_url || authUser.user_metadata?.picture || null

  // Try to get existing user
  let { data: existingUser, error: fetchError } = await supabase
    .from('users')
    .select('*')
    .eq('google_id', googleId)
    .single()

  if (fetchError && fetchError.code !== 'PGRST116') {
    // PGRST116 = no rows found, which is fine
    console.error('[Auth] Fetch user error:', fetchError)
  }

  if (existingUser) {
    return mapDbUserToAuthUser(existingUser as DbUser)
  }

  // Create new user
  const { data: newUser, error: createError } = await supabase
    .from('users')
    .insert({
      google_id: googleId,
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

  return mapDbUserToAuthUser(newUser as DbUser)
}

// Map database user to auth user
function mapDbUserToAuthUser(dbUser: DbUser): AuthUser {
  return {
    id: dbUser.id,
    email: dbUser.email,
    name: dbUser.name,
    avatarUrl: dbUser.avatar_url,
    totalCalls: dbUser.total_calls,
    totalMinutes: dbUser.total_minutes,
    isPremium: dbUser.is_premium,
  }
}

// Listen to auth state changes
export function onAuthStateChange(callback: (user: AuthUser | null) => void) {
  return supabase.auth.onAuthStateChange(async (event, session) => {
    if (session?.user) {
      const user = await getOrCreateUser(session.user)
      callback(user)
    } else {
      callback(null)
    }
  })
}

// Update user stats after a call
export async function updateUserStats(
  userId: string,
  callDurationSeconds: number
): Promise<void> {
  try {
    const minutes = Math.ceil(callDurationSeconds / 60)

    const { error } = await supabase.rpc('increment_user_stats', {
      p_user_id: userId,
      p_minutes: minutes,
    })

    // If RPC doesn't exist, fall back to direct update
    if (error) {
      const { data: user } = await supabase
        .from('users')
        .select('total_calls, total_minutes')
        .eq('id', userId)
        .single()

      if (user) {
        await supabase
          .from('users')
          .update({
            total_calls: (user.total_calls || 0) + 1,
            total_minutes: (user.total_minutes || 0) + minutes,
            last_call_at: new Date().toISOString(),
          })
          .eq('id', userId)
      }
    }
  } catch (error) {
    console.error('[Auth] Update user stats error:', error)
  }
}

// Get user's relationship progress
export async function getUserRelationship(userId: string): Promise<DbRelationshipProgress | null> {
  try {
    const { data, error } = await supabase
      .from('relationship_progress')
      .select('*')
      .eq('user_id', userId)
      .single()

    if (error) {
      console.error('[Auth] Get relationship error:', error)
      return null
    }

    return data as DbRelationshipProgress
  } catch (error) {
    console.error('[Auth] Get relationship error:', error)
    return null
  }
}
