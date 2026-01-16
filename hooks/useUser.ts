import { useState, useCallback, useEffect, useMemo } from 'react'
import { CONFIG } from '@/constants/config'
import { useAuth } from './useAuth'
import { getUserMemory, processAndSaveFacts } from '@/lib/memory/userMemory'
import { getFreeMinutesData, incrementFreeMinutesUsed as persistMinutesUsed } from '@/lib/storage'
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
  user: { id: string; clerkId: string; name: string | null; email: string | null } | null
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
  const [isMinutesLoading, setIsMinutesLoading] = useState(true)
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

  // Load persisted free minutes on mount
  useEffect(() => {
    async function loadMinutes() {
      try {
        const data = await getFreeMinutesData()
        setDailyMinutesUsed(data.minutesUsed)
      } catch (error) {
        // Ignore loading error - use defaults
      } finally {
        setIsMinutesLoading(false)
      }
    }
    loadMinutes()
  }, [])

  // Load user context (memory + relationship) before a call
  const loadUserContext = useCallback(async () => {
    if (!authUser?.id) {
      clearUserContext()
      return
    }

    try {
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
    } catch (error) {
      clearUserContext()
    }
  }, [authUser?.id])

  // Start a conversation session
  const startConversationSession = useCallback(async (): Promise<string | null> => {
    if (!authUser?.id) return null

    try {
      const conversationId = await createConversation(authUser.id)
      setCurrentConversationId(conversationId)
      return conversationId
    } catch (error) {
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
        // Ignore log message errors
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
              processAndSaveFacts(authUser.id, characterId, userMsg.content, assistantMsg.content).catch(() => {})
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
      } catch (error) {
        // End conversation error - ignore
      }
    },
    [authUser?.id]
  )

  const canMakeCall = useCallback((): boolean => {
    if (isPremium) return true
    return remainingMinutes > 0
  }, [isPremium, remainingMinutes])

  const incrementMinutesUsed = useCallback(async (minutes: number = 1) => {
    setDailyMinutesUsed((prev) => prev + minutes)
    try {
      await persistMinutesUsed(minutes)
    } catch (error) {
      // Persist error - ignore
    }
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
    } catch (error) {
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
    user: authUser ? { id: authUser.id, clerkId: authUser.clerkId, name: authUser.name, email: authUser.email } : null,
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
