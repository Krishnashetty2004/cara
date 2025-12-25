import { View, Text, Image, Pressable, Animated, StyleSheet, Dimensions } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { useEffect, useRef, useState } from 'react'
import { Settings, Phone } from 'lucide-react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { useUser } from '@/hooks/useUser'
import { CHARACTER_LIST } from '@/constants/characters'
import type { CharacterId } from '@/types/character'

const { width, height } = Dimensions.get('window')
const SPLASH_BG = require('@/assets/images/splashs.jpeg')

export default function HomeScreen() {
  const insets = useSafeAreaInsets()
  const { isPremium, remainingMinutes, canMakeCall } = useUser()
  const [selectedCharacter, setSelectedCharacter] = useState<CharacterId>('preethi')

  const selectedCharacterConfig = CHARACTER_LIST.find(c => c.id === selectedCharacter)!

  // Pulsing ring animation for selected character
  const pulseAnim = useRef(new Animated.Value(1)).current
  const pulseOpacity = useRef(new Animated.Value(0.5)).current

  // Call button pulse animation
  const callPulse1 = useRef(new Animated.Value(1)).current
  const callOpacity1 = useRef(new Animated.Value(0.4)).current
  const callPulse2 = useRef(new Animated.Value(1)).current
  const callOpacity2 = useRef(new Animated.Value(0.2)).current

  useEffect(() => {
    // Character pulse animation
    Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(pulseAnim, {
            toValue: 1.15,
            duration: 1500,
            useNativeDriver: true,
          }),
          Animated.timing(pulseOpacity, {
            toValue: 0,
            duration: 1500,
            useNativeDriver: true,
          }),
        ]),
        Animated.parallel([
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 0,
            useNativeDriver: true,
          }),
          Animated.timing(pulseOpacity, {
            toValue: 0.5,
            duration: 0,
            useNativeDriver: true,
          }),
        ]),
      ])
    ).start()

    // Call button pulse 1
    Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(callPulse1, {
            toValue: 1.5,
            duration: 1200,
            useNativeDriver: true,
          }),
          Animated.timing(callOpacity1, {
            toValue: 0,
            duration: 1200,
            useNativeDriver: true,
          }),
        ]),
        Animated.parallel([
          Animated.timing(callPulse1, {
            toValue: 1,
            duration: 0,
            useNativeDriver: true,
          }),
          Animated.timing(callOpacity1, {
            toValue: 0.4,
            duration: 0,
            useNativeDriver: true,
          }),
        ]),
      ])
    ).start()

    // Call button pulse 2 (delayed)
    setTimeout(() => {
      Animated.loop(
        Animated.sequence([
          Animated.parallel([
            Animated.timing(callPulse2, {
              toValue: 1.8,
              duration: 1200,
              useNativeDriver: true,
            }),
            Animated.timing(callOpacity2, {
              toValue: 0,
              duration: 1200,
              useNativeDriver: true,
            }),
          ]),
          Animated.parallel([
            Animated.timing(callPulse2, {
              toValue: 1,
              duration: 0,
              useNativeDriver: true,
            }),
            Animated.timing(callOpacity2, {
              toValue: 0.2,
              duration: 0,
              useNativeDriver: true,
            }),
          ]),
        ])
      ).start()
    }, 400)
  }, [])

  const handleCall = () => {
    if (!canMakeCall()) {
      alert('No minutes remaining!')
      return
    }
    router.push({ pathname: '/(main)/call', params: { characterId: selectedCharacter } })
  }

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
          'rgba(10, 22, 40, 0.85)',
          'rgba(10, 22, 40, 0.7)',
          'rgba(10, 22, 40, 0.75)',
          'rgba(10, 22, 40, 0.9)',
        ]}
        locations={[0, 0.3, 0.6, 1]}
        style={styles.gradientOverlay}
      />

      {/* Content */}
      <View style={[styles.content, { paddingTop: insets.top }]}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>cara</Text>
          <Pressable
            onPress={() => router.push('/(main)/settings')}
            style={({ pressed }) => [
              styles.settingsButton,
              { opacity: pressed ? 0.6 : 1 },
            ]}
          >
            <Settings color="rgba(255,255,255,0.8)" size={24} />
          </Pressable>
        </View>

        {/* Main Content */}
        <View style={styles.mainContent}>
          {/* Label */}
          <Text style={styles.selectLabel}>Choose your companion</Text>

          {/* Character Selection */}
          <View style={styles.characterGrid}>
            {CHARACTER_LIST.map((character) => {
              const isSelected = character.id === selectedCharacter
              return (
                <Pressable
                  key={character.id}
                  onPress={() => setSelectedCharacter(character.id)}
                  style={({ pressed }) => [
                    styles.characterItem,
                    { opacity: pressed ? 0.8 : 1 },
                  ]}
                >
                  <View style={styles.avatarContainer}>
                    {/* Pulsing ring - only for selected */}
                    {isSelected && (
                      <Animated.View
                        style={[
                          styles.pulseRing,
                          {
                            transform: [{ scale: pulseAnim }],
                            opacity: pulseOpacity,
                          },
                        ]}
                      />
                    )}

                    {/* Avatar */}
                    <View
                      style={[
                        styles.avatar,
                        {
                          borderColor: isSelected ? '#FFFFFF' : 'rgba(255,255,255,0.3)',
                          borderWidth: isSelected ? 3 : 2,
                        },
                      ]}
                    >
                      <Image
                        source={character.avatarImage}
                        style={[styles.avatarImage, { opacity: isSelected ? 1 : 0.5 }]}
                        resizeMode="cover"
                      />
                    </View>
                  </View>

                  {/* Name */}
                  <Text
                    style={[
                      styles.characterName,
                      {
                        color: isSelected ? '#FFFFFF' : 'rgba(255,255,255,0.5)',
                        fontFamily: isSelected ? 'Inter_600SemiBold' : 'Inter_400Regular',
                      },
                    ]}
                  >
                    {character.name}
                  </Text>
                </Pressable>
              )
            })}
          </View>

          {/* Selected character info */}
          <View style={styles.selectedInfo}>
            <Text style={styles.selectedName}>{selectedCharacterConfig.name}</Text>
            <Text style={styles.selectedTagline}>{selectedCharacterConfig.tagline}</Text>
          </View>

          {/* Call Button */}
          <View style={styles.callButtonContainer}>
            {/* Pulse ring 2 */}
            <Animated.View
              style={[
                styles.callPulseRing,
                {
                  transform: [{ scale: callPulse2 }],
                  opacity: callOpacity2,
                },
              ]}
            />
            {/* Pulse ring 1 */}
            <Animated.View
              style={[
                styles.callPulseRing,
                {
                  transform: [{ scale: callPulse1 }],
                  opacity: callOpacity1,
                },
              ]}
            />
            {/* Button */}
            <Pressable
              onPress={handleCall}
              disabled={!canMakeCall()}
              style={({ pressed }) => [
                styles.callButton,
                {
                  opacity: pressed || !canMakeCall() ? 0.8 : 1,
                  transform: [{ scale: pressed ? 0.95 : 1 }],
                },
              ]}
            >
              <LinearGradient
                colors={['#60A5FA', '#3B82F6']}
                style={styles.callButtonGradient}
              >
                <Phone color="#FFFFFF" size={32} />
              </LinearGradient>
            </Pressable>
          </View>

          {/* Minutes remaining */}
          {!isPremium && (
            <Pressable
              onPress={() => router.push('/(paywall)/premium')}
              style={({ pressed }) => [
                styles.minutesContainer,
                { opacity: pressed ? 0.8 : 1 },
              ]}
            >
              <Text style={styles.minutesText}>
                {remainingMinutes} mins remaining
              </Text>
              <Text style={styles.upgradeText}>Tap to upgrade</Text>
            </Pressable>
          )}
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 16,
  },
  headerTitle: {
    fontSize: 32,
    color: '#FFFFFF',
    fontFamily: 'PlayfairDisplay_700Bold',
    letterSpacing: -1,
  },
  settingsButton: {
    padding: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  mainContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 40,
  },
  selectLabel: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.5)',
    marginBottom: 24,
    fontFamily: 'Inter_500Medium',
    textTransform: 'uppercase',
    letterSpacing: 2,
  },
  characterGrid: {
    flexDirection: 'row',
    gap: 40,
    marginBottom: 32,
  },
  characterItem: {
    alignItems: 'center',
  },
  avatarContainer: {
    width: 120,
    height: 120,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pulseRing: {
    position: 'absolute',
    width: 110,
    height: 110,
    borderRadius: 55,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.6)',
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  characterName: {
    fontSize: 15,
    marginTop: 12,
    letterSpacing: 0.3,
  },
  selectedInfo: {
    alignItems: 'center',
    marginBottom: 40,
  },
  selectedName: {
    fontSize: 42,
    color: '#FFFFFF',
    fontFamily: 'PlayfairDisplay_700Bold',
    marginBottom: 8,
    letterSpacing: -1,
  },
  selectedTagline: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.6)',
    fontFamily: 'Inter_400Regular',
  },
  callButtonContainer: {
    width: 100,
    height: 100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  callPulseRing: {
    position: 'absolute',
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#3B82F6',
  },
  callButton: {
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 10,
  },
  callButtonGradient: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  minutesContainer: {
    marginTop: 32,
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  minutesText: {
    fontSize: 15,
    color: '#FFFFFF',
    fontFamily: 'Inter_500Medium',
  },
  upgradeText: {
    fontSize: 13,
    color: '#60A5FA',
    fontFamily: 'Inter_400Regular',
    marginTop: 4,
  },
})
