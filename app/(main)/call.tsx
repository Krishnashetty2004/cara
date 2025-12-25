import { View, Text, Alert, Image, Animated, StyleSheet, Dimensions } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { router, useLocalSearchParams } from 'expo-router'
import { useEffect, useRef, useState } from 'react'
import { LinearGradient } from 'expo-linear-gradient'
import { CallControls } from '@/components/CallControls'
import { useCall } from '@/hooks/useCall'
import { useUser } from '@/hooks/useUser'
import { getCharacter, DEFAULT_CHARACTER } from '@/constants/characters'
import type { CharacterId } from '@/types/character'

const { width, height } = Dimensions.get('window')
const SPLASH_BG = require('@/assets/images/splashs.jpeg')

export default function CallScreen() {
  const insets = useSafeAreaInsets()
  const { characterId: characterIdParam } = useLocalSearchParams<{ characterId: string }>()
  const characterId = (characterIdParam as CharacterId) || DEFAULT_CHARACTER
  const character = getCharacter(characterId)

  const {
    user,
    isPremium,
    canMakeCall,
    incrementMinutesUsed,
    loadUserContext,
    startConversationSession,
    logConversationMessage,
    endConversationSession,
  } = useUser()

  const [conversationId, setConversationId] = useState<string | null>(null)
  const [showTimeWarning, setShowTimeWarning] = useState(false)
  const [timeLimitReached, setTimeLimitReached] = useState(false)

  const {
    callState,
    isMuted,
    isSpeakerOn,
    isCharacterSpeaking,
    formattedDuration,
    callDuration,
    error,
    timeWarningShown,
    startCall,
    endCall,
    toggleMute,
    toggleSpeaker,
    clearError,
  } = useCall({
    characterId,
    canMakeCall,
    isPremium,
    onMinuteUsed: () => incrementMinutesUsed(1),
    onUserMessage: (text) => {
      if (conversationId) {
        logConversationMessage('user', text)
      }
    },
    onCharacterResponse: (text) => {
      if (conversationId) {
        logConversationMessage(characterId, text)
      }
    },
    onTimeWarning: (secondsRemaining) => {
      setShowTimeWarning(true)
      setTimeout(() => setShowTimeWarning(false), 5000)
    },
    onTimeLimitReached: () => {
      setTimeLimitReached(true)
    },
  })

  // Avatar animation
  const scaleAnim = useRef(new Animated.Value(1)).current
  const ringAnim = useRef(new Animated.Value(1)).current
  const ringOpacity = useRef(new Animated.Value(0.5)).current

  useEffect(() => {
    if (isCharacterSpeaking || callState === 'calling') {
      Animated.loop(
        Animated.sequence([
          Animated.parallel([
            Animated.timing(scaleAnim, { toValue: 1.05, duration: 400, useNativeDriver: true }),
            Animated.timing(ringAnim, { toValue: 1.3, duration: 800, useNativeDriver: true }),
            Animated.timing(ringOpacity, { toValue: 0, duration: 800, useNativeDriver: true }),
          ]),
          Animated.parallel([
            Animated.timing(scaleAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
            Animated.timing(ringAnim, { toValue: 1, duration: 0, useNativeDriver: true }),
            Animated.timing(ringOpacity, { toValue: 0.5, duration: 0, useNativeDriver: true }),
          ]),
        ])
      ).start()
    } else {
      scaleAnim.setValue(1)
      ringAnim.setValue(1)
      ringOpacity.setValue(0)
    }
  }, [isCharacterSpeaking, callState])

  useEffect(() => {
    async function initializeCall() {
      if (user?.id) {
        await loadUserContext()
        const convId = await startConversationSession()
        setConversationId(convId)
      }
      startCall()
    }
    initializeCall()
  }, [])

  useEffect(() => {
    if (callState === 'ended') {
      if (conversationId && user?.id) {
        endConversationSession(conversationId, callDuration, characterId)
      }

      if (timeLimitReached) {
        setTimeout(() => {
          router.replace('/(paywall)/premium')
        }, 1500)
      } else {
        setTimeout(() => router.back(), 1000)
      }
    }
  }, [callState, timeLimitReached])

  useEffect(() => {
    if (error) {
      Alert.alert('Error', error, [{ text: 'OK', onPress: clearError }])
    }
  }, [error])

  return (
    <View style={styles.container}>
      {/* Background Image */}
      <Image
        source={SPLASH_BG}
        style={styles.backgroundImage}
        resizeMode="cover"
      />

      {/* Gradient Overlay */}
      <LinearGradient
        colors={[
          'rgba(10, 22, 40, 0.9)',
          'rgba(10, 22, 40, 0.75)',
          'rgba(10, 22, 40, 0.8)',
          'rgba(10, 22, 40, 0.95)',
        ]}
        locations={[0, 0.3, 0.6, 1]}
        style={styles.gradientOverlay}
      />

      {/* Content */}
      <View style={[styles.content, { paddingTop: insets.top }]}>
        {/* Time Warning Banner */}
        {showTimeWarning && !isPremium && (
          <View style={styles.warningBanner}>
            <Text style={styles.warningText}>
              1 minute remaining! Upgrade for unlimited calls
            </Text>
          </View>
        )}

        {/* Time Limit Reached Banner */}
        {timeLimitReached && (
          <View style={styles.dangerBanner}>
            <Text style={styles.dangerText}>
              Time's up! Upgrade for unlimited calls
            </Text>
          </View>
        )}

        {/* Main Content */}
        <View style={styles.mainContent}>
          {/* Character Name */}
          <Text style={styles.characterName}>{character.name}</Text>

          {/* Avatar with animation */}
          <View style={styles.avatarContainer}>
            {/* Pulsing ring */}
            <Animated.View
              style={[
                styles.pulseRing,
                {
                  borderColor: timeLimitReached ? '#EF4444' : 'rgba(255, 255, 255, 0.6)',
                  transform: [{ scale: ringAnim }],
                  opacity: ringOpacity,
                },
              ]}
            />

            {/* Avatar */}
            <Animated.View
              style={[
                styles.avatar,
                {
                  borderColor: timeLimitReached ? '#EF4444' : '#FFFFFF',
                  transform: [{ scale: scaleAnim }],
                },
              ]}
            >
              <Image
                source={character.avatarImage}
                style={styles.avatarImage}
                resizeMode="cover"
              />
            </Animated.View>
          </View>

          {/* Duration */}
          <Text
            style={[
              styles.duration,
              {
                color: timeLimitReached
                  ? '#EF4444'
                  : timeWarningShown
                    ? '#F59E0B'
                    : 'rgba(255, 255, 255, 0.8)',
              },
            ]}
          >
            {callState === 'calling'
              ? 'Connecting...'
              : callState === 'ended'
                ? timeLimitReached
                  ? "Time's Up!"
                  : 'Call Ended'
                : formattedDuration}
          </Text>

          {/* Premium badge */}
          {isPremium && callState === 'connected' && (
            <View style={styles.premiumBadge}>
              <Text style={styles.premiumBadgeText}>Unlimited</Text>
            </View>
          )}
        </View>

        {/* Controls */}
        <View style={[styles.controlsContainer, { paddingBottom: insets.bottom + 30 }]}>
          <CallControls
            isMuted={isMuted}
            isSpeakerOn={isSpeakerOn}
            onToggleMute={toggleMute}
            onToggleSpeaker={toggleSpeaker}
            onHangup={endCall}
          />
        </View>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a1628',
  },
  backgroundImage: {
    position: 'absolute',
    width: width,
    height: height,
  },
  gradientOverlay: {
    position: 'absolute',
    width: width,
    height: height,
  },
  content: {
    flex: 1,
  },
  warningBanner: {
    backgroundColor: 'rgba(245, 158, 11, 0.2)',
    paddingVertical: 12,
    paddingHorizontal: 20,
    marginHorizontal: 20,
    marginTop: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#F59E0B',
    alignItems: 'center',
  },
  warningText: {
    fontSize: 14,
    color: '#F59E0B',
    fontFamily: 'Inter_600SemiBold',
    textAlign: 'center',
  },
  dangerBanner: {
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
    paddingVertical: 12,
    paddingHorizontal: 20,
    marginHorizontal: 20,
    marginTop: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#EF4444',
    alignItems: 'center',
  },
  dangerText: {
    fontSize: 14,
    color: '#EF4444',
    fontFamily: 'Inter_600SemiBold',
    textAlign: 'center',
  },
  mainContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  characterName: {
    fontSize: 36,
    color: '#FFFFFF',
    marginBottom: 40,
    fontFamily: 'PlayfairDisplay_700Bold',
    letterSpacing: -1,
  },
  avatarContainer: {
    width: 220,
    height: 220,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pulseRing: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    borderWidth: 3,
  },
  avatar: {
    width: 180,
    height: 180,
    borderRadius: 90,
    overflow: 'hidden',
    borderWidth: 3,
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  duration: {
    fontSize: 32,
    marginTop: 40,
    fontFamily: 'Inter_400Regular',
    letterSpacing: 1,
  },
  premiumBadge: {
    marginTop: 16,
    backgroundColor: 'rgba(96, 165, 250, 0.2)',
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#60A5FA',
  },
  premiumBadgeText: {
    fontSize: 14,
    color: '#60A5FA',
    fontFamily: 'Inter_500Medium',
  },
  controlsContainer: {
    alignItems: 'center',
  },
})
