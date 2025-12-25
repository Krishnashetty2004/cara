import { useState, useCallback, useEffect, useMemo } from 'react'
import { CONFIG } from '@/constants/config'
import { useAuth } from './useAuth'
import { getUserMemory, processAndSaveFacts } from '@/lib/memory/userMemory'
import {
  getRelationship,
  updateRelationshipAfterCall,
  extractInsideJokes,
  addInsideJoke,
} from '@/lib/memory/relationshipTracker'
import {
  createConversation,
  logMessage,
  endConversation,
  getLastConversationSummary,
} from '@/lib/memory/conversationLogger'
import { setUserContext, clearUserContext, getConversationHistory } from '@/lib/voice/chat'
import { updateUserStats } from '@/lib/supabase/auth'
import { getActiveSubscription, isSubscriptionValid } from '@/lib/razorpay'
import type { UserMemory, RelationshipData } from '@/types'
import type { DbSubscription } from '@/types/razorpay'
import type { CharacterId } from '@/types/character'

interface UseUserReturn {
  user: { id: string; name: string | null; email: string | null } | null
  isLoading: boolean
  error: string | null
  isPremium: boolean
  remainingMinutes: number
  subscription: DbSubscription | null
  memory: UserMemory | null
  relationship: RelationshipData | null
  canMakeCall: () => boolean
  incrementMinutesUsed: (minutes: number) => void
  loadUserContext: () => Promise<void>
  startConversationSession: () => Promise<string | null>
  logConversationMessage: (role: 'user' | CharacterId, content: string) => Promise<void>
  endConversationSession: (conversationId: string, durationSeconds: number, characterId?: CharacterId) => Promise<void>
  checkSubscriptionStatus: () => Promise<void>
  refreshUser: () => Promise<void>
}

export function useUser(): UseUserReturn {
  const { user: authUser, isLoading: authLoading } = useAuth()

  const [dailyMinutesUsed, setDailyMinutesUsed] = useState(0)
  const [memory, setMemory] = useState<UserMemory | null>(null)
  const [relationship, setRelationship] = useState<RelationshipData | null>(null)
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null)
  const [subscription, setSubscription] = useState<DbSubscription | null>(null)

  // Check if user has valid premium subscription
  const isPremium = useMemo(() => {
    // First check subscription status
    if (subscription && isSubscriptionValid(subscription)) {
      return true
    }
    // Fallback to auth user flag (for legacy or manual premium)
    return authUser?.isPremium || false
  }, [subscription, authUser?.isPremium])

  const remainingMinutes = Math.max(0, CONFIG.FREE_DAILY_MINUTES - dailyMinutesUsed)

  // Load user context (memory + relationship) before a call
  const loadUserContext = useCallback(async () => {
    if (!authUser?.id) {
      clearUserContext()
      return
    }

    try {
      console.log('[useUser] Loading context for user:', authUser.id)

      // Load all data in parallel
      const [userMemory, userRelationship, lastSummary] = await Promise.all([
        getUserMemory(authUser.id),
        getRelationship(authUser.id),
        getLastConversationSummary(authUser.id),
      ])

      setMemory(userMemory)
      setRelationship(userRelationship)

      // Set context for chat personalization
      setUserContext(userMemory, userRelationship, lastSummary)

      console.log('[useUser] Context loaded:', {
        memory: Object.keys(userMemory).length,
        relationship: userRelationship?.relationship_stage,
        hasLastSummary: !!lastSummary,
      })
    } catch (error) {
      console.error('[useUser] Load context error:', error)
      clearUserContext()
    }
  }, [authUser?.id])

  // Start a conversation session
  const startConversationSession = useCallback(async (): Promise<string | null> => {
    if (!authUser?.id) return null

    try {
      const conversationId = await createConversation(authUser.id)
      setCurrentConversationId(conversationId)
      console.log('[useUser] Conversation started:', conversationId)
      return conversationId
    } catch (error) {
      console.error('[useUser] Start conversation error:', error)
      return null
    }
  }, [authUser?.id])

  // Log a message in the current conversation
  const logConversationMessage = useCallback(
    async (role: 'user' | CharacterId, content: string) => {
      if (!currentConversationId) return

      try {
        await logMessage(currentConversationId, role, content)
      } catch (error) {
        console.error('[useUser] Log message error:', error)
      }
    },
    [currentConversationId]
  )

  // End conversation and process learning
  const endConversationSession = useCallback(
    async (conversationId: string, durationSeconds: number, characterId: CharacterId = 'preethi') => {
      if (!authUser?.id) return

      try {
        // End conversation (generates summary)
        await endConversation(conversationId, durationSeconds)

        // Get conversation history for learning
        const history = getConversationHistory()

        if (history.length > 0) {
          // Process each user-assistant pair for fact extraction
          for (let i = 0; i < history.length - 1; i += 2) {
            const userMsg = history[i]
            const assistantMsg = history[i + 1]

            if (userMsg?.role === 'user' && assistantMsg?.role === 'assistant') {
              // Extract and save facts in background
              processAndSaveFacts(authUser.id, characterId, userMsg.content, assistantMsg.content).catch(
                console.error
              )
            }
          }

          // Extract inside jokes
          const jokes = await extractInsideJokes(
            history.map((m) => ({ role: m.role, content: m.content }))
          )
          for (const joke of jokes) {
            await addInsideJoke(authUser.id, characterId, joke)
          }
        }

        // Update relationship based on conversation
        await updateRelationshipAfterCall(authUser.id, characterId, 'casual', durationSeconds)

        // Update user stats
        await updateUserStats(authUser.id, durationSeconds)

        setCurrentConversationId(null)
        clearUserContext()

        console.log('[useUser] Conversation ended, learning complete')
      } catch (error) {
        console.error('[useUser] End conversation error:', error)
      }
    },
    [authUser?.id]
  )

  const canMakeCall = useCallback((): boolean => {
    if (isPremium) return true
    return remainingMinutes > 0
  }, [isPremium, remainingMinutes])

  const incrementMinutesUsed = useCallback((minutes: number = 1) => {
    setDailyMinutesUsed((prev) => prev + minutes)
  }, [])

  // Check and refresh subscription status from database
  const checkSubscriptionStatus = useCallback(async () => {
    if (!authUser?.id) {
      setSubscription(null)
      return
    }

    try {
      const sub = await getActiveSubscription(authUser.id)
      setSubscription(sub)
      console.log('[useUser] Subscription status:', sub?.status || 'none')
    } catch (error) {
      console.error('[useUser] Check subscription error:', error)
      setSubscription(null)
    }
  }, [authUser?.id])

  const refreshUser = useCallback(async () => {
    await Promise.all([loadUserContext(), checkSubscriptionStatus()])
  }, [loadUserContext, checkSubscriptionStatus])

  // Load user context and subscription when auth user changes
  useEffect(() => {
    if (authUser?.id) {
      loadUserContext()
      checkSubscriptionStatus()
    } else {
      setMemory(null)
      setRelationship(null)
      setSubscription(null)
      clearUserContext()
    }
  }, [authUser?.id, loadUserContext, checkSubscriptionStatus])

  return {
    user: authUser ? { id: authUser.id, name: authUser.name, email: authUser.email } : null,
    isLoading: authLoading,
    error: null,
    isPremium,
    remainingMinutes,
    subscription,
    memory,
    relationship,
    canMakeCall,
    incrementMinutesUsed,
    loadUserContext,
    startConversationSession,
    logConversationMessage,
    endConversationSession,
    checkSubscriptionStatus,
    refreshUser,
  }
}
