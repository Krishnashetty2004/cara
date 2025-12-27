import { View, Text, Alert, Image, Animated, StyleSheet, Dimensions, ImageBackground } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { router, useLocalSearchParams } from 'expo-router'
import { useEffect, useRef, useState } from 'react'
import { useAuth } from '@clerk/clerk-expo'
import { CallControls } from '@/components/CallControls'
import { useHybridCall } from '@/hooks/useHybridCall'
import { useUser } from '@/hooks/useUser'
import { getCharacter, DEFAULT_CHARACTER } from '@/constants/characters'
import { colors, radius, spacing } from '@/constants/theme'
import { recordUserActivity, setPreferredCharacter } from '@/lib/notifications'
import type { CharacterId } from '@/types/character'

const { width, height } = Dimensions.get('window')

export default function CallScreen() {
  const insets = useSafeAreaInsets()
  const { characterId: characterIdParam } = useLocalSearchParams<{ characterId: string }>()
  const characterId = (characterIdParam as CharacterId) || DEFAULT_CHARACTER
  const character = getCharacter(characterId)
  const { getToken } = useAuth()

  const {
    user,
    isPremium,
    canMakeCall,
    incrementMinutesUsed,
    loadUserContext,
    startConversationSession,
    logConversationMessage,
    endConversationSession,
    memory,
    relationship,
  } = useUser()

  const [conversationId, setConversationId] = useState<string | null>(null)
  const [showTimeWarning, setShowTimeWarning] = useState(false)
  const [timeLimitReached, setTimeLimitReached] = useState(false)

  const {
    callState,
    processingState,
    isMuted,
    isSpeakerOn,
    isRecording,
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
  } = useHybridCall({
    characterId,
    clerkId: user?.clerkId,
    getToken,
    canMakeCall,
    isPremium,
    memory,
    relationship,
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

  // Listening animation (sound wave bars)
  const wave1 = useRef(new Animated.Value(0.3)).current
  const wave2 = useRef(new Animated.Value(0.5)).current
  const wave3 = useRef(new Animated.Value(0.7)).current
  const wave4 = useRef(new Animated.Value(0.4)).current
  const wave5 = useRef(new Animated.Value(0.6)).current

  // Listening animation
  useEffect(() => {
    if (isRecording && !isMuted) {
      const animateWave = (wave: Animated.Value, duration: number) => {
        return Animated.loop(
          Animated.sequence([
            Animated.timing(wave, { toValue: 1, duration, useNativeDriver: true }),
            Animated.timing(wave, { toValue: 0.3, duration, useNativeDriver: true }),
          ])
        )
      }

      const animations = [
        animateWave(wave1, 300),
        animateWave(wave2, 400),
        animateWave(wave3, 350),
        animateWave(wave4, 450),
        animateWave(wave5, 380),
      ]

      animations.forEach(a => a.start())

      return () => {
        animations.forEach(a => a.stop())
      }
    } else {
      wave1.setValue(0.3)
      wave2.setValue(0.5)
      wave3.setValue(0.7)
      wave4.setValue(0.4)
      wave5.setValue(0.6)
    }
  }, [isRecording, isMuted])

  // Speaking animation
  useEffect(() => {
    if (isCharacterSpeaking || callState === 'calling') {
      Animated.loop(
        Animated.sequence([
          Animated.parallel([
            Animated.timing(scaleAnim, { toValue: 1.03, duration: 500, useNativeDriver: true }),
            Animated.timing(ringAnim, { toValue: 1.25, duration: 1000, useNativeDriver: true }),
            Animated.timing(ringOpacity, { toValue: 0, duration: 1000, useNativeDriver: true }),
          ]),
          Animated.parallel([
            Animated.timing(scaleAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
            Animated.timing(ringAnim, { toValue: 1, duration: 0, useNativeDriver: true }),
            Animated.timing(ringOpacity, { toValue: 0.4, duration: 0, useNativeDriver: true }),
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

      // Record activity for smart notifications
      recordUserActivity()
      // Update preferred character for notifications
      setPreferredCharacter(characterId as 'preethi' | 'ira')

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

  // Get status text
  const getStatusText = () => {
    if (callState === 'calling') return 'Connecting...'
    if (callState === 'ended') return timeLimitReached ? "Time's Up" : 'Call Ended'
    if (processingState === 'listening') return 'Listening...'
    if (processingState === 'thinking') return 'Thinking...'
    if (processingState === 'speaking') return 'Speaking...'
    return formattedDuration
  }

  return (
    <View style={styles.container}>
      {/* Character Background Image */}
      <ImageBackground
        source={character.avatarImage}
        style={styles.backgroundImage}
        resizeMode="cover"
      >
        {/* Dark gradient overlay */}
        <LinearGradient
          colors={['rgba(0,0,0,0.4)', 'rgba(0,0,0,0.7)', 'rgba(0,0,0,0.9)']}
          style={styles.gradient}
        />
      </ImageBackground>

      {/* Content */}
      <View style={[styles.content, { paddingTop: insets.top + spacing.lg }]}>
        {/* Time Warning Banner */}
        {showTimeWarning && !isPremium && (
          <View style={styles.warningBanner}>
            <Text style={styles.warningText}>
              1 minute remaining
            </Text>
          </View>
        )}

        {/* Time Limit Reached Banner */}
        {timeLimitReached && (
          <View style={styles.dangerBanner}>
            <Text style={styles.dangerText}>
              Time's up
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
                  borderColor: timeLimitReached
                    ? colors.error
                    : 'rgba(255, 255, 255, 0.3)',
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
                  borderColor: timeLimitReached
                    ? colors.error
                    : isRecording
                      ? colors.emotional
                      : 'rgba(255, 255, 255, 0.8)',
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

          {/* Listening Animation - Sound Wave */}
          {isRecording && !isMuted && (
            <View style={styles.listeningContainer}>
              <View style={styles.soundWave}>
                {[wave1, wave2, wave3, wave4, wave5].map((wave, index) => (
                  <Animated.View
                    key={index}
                    style={[
                      styles.waveBar,
                      {
                        transform: [{ scaleY: wave }],
                        backgroundColor: colors.emotional,
                      },
                    ]}
                  />
                ))}
              </View>
              <Text style={styles.listeningText}>Listening...</Text>
            </View>
          )}

          {/* Duration / Status */}
          <Text
            style={[
              styles.duration,
              {
                color: timeLimitReached
                  ? colors.error
                  : timeWarningShown
                    ? colors.warning
                    : 'rgba(255, 255, 255, 0.9)',
              },
            ]}
          >
            {getStatusText()}
          </Text>

          {/* Premium badge */}
          {isPremium && callState === 'connected' && (
            <View style={styles.premiumBadge}>
              <Text style={styles.premiumBadgeText}>Unlimited</Text>
            </View>
          )}
        </View>

        {/* Controls */}
        <View style={[styles.controlsContainer, { paddingBottom: insets.bottom + 40 }]}>
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
    backgroundColor: '#000',
  },
  backgroundImage: {
    position: 'absolute',
    width: width,
    height: height,
  },
  gradient: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
  warningBanner: {
    backgroundColor: 'rgba(201, 154, 90, 0.15)',
    paddingVertical: 12,
    paddingHorizontal: 24,
    marginHorizontal: spacing.xl,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: 'rgba(201, 154, 90, 0.4)',
    alignItems: 'center',
  },
  warningText: {
    fontSize: 14,
    color: colors.warning,
    fontFamily: 'Inter_500Medium',
    textAlign: 'center',
  },
  dangerBanner: {
    backgroundColor: 'rgba(184, 90, 90, 0.15)',
    paddingVertical: 12,
    paddingHorizontal: 24,
    marginHorizontal: spacing.xl,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: 'rgba(184, 90, 90, 0.4)',
    alignItems: 'center',
  },
  dangerText: {
    fontSize: 14,
    color: colors.error,
    fontFamily: 'Inter_500Medium',
    textAlign: 'center',
  },
  mainContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  characterName: {
    fontSize: 32,
    color: '#FFFFFF',
    marginBottom: spacing.xxl,
    fontFamily: 'PlayfairDisplay_400Regular',
    letterSpacing: -0.5,
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
    borderWidth: 2,
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
    fontSize: 36,
    marginTop: spacing.xxl,
    fontFamily: 'Inter_400Regular',
    letterSpacing: 2,
  },
  premiumBadge: {
    marginTop: spacing.lg,
    backgroundColor: 'rgba(167, 118, 147, 0.2)',
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: 'rgba(167, 118, 147, 0.4)',
  },
  premiumBadgeText: {
    fontSize: 13,
    color: colors.emotional,
    fontFamily: 'Inter_500Medium',
  },
  controlsContainer: {
    alignItems: 'center',
  },
  listeningContainer: {
    alignItems: 'center',
    marginTop: spacing.lg,
  },
  soundWave: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 40,
    gap: 4,
  },
  waveBar: {
    width: 4,
    height: 30,
    borderRadius: 2,
  },
  listeningText: {
    marginTop: spacing.sm,
    fontSize: 14,
    color: colors.emotional,
    fontFamily: 'Inter_500Medium',
  },
})
