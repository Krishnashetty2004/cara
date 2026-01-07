import { useEffect, useRef, useState } from 'react'
import { View, Text, StyleSheet, Animated, Image } from 'react-native'
import { router } from 'expo-router'
import { useAuth } from '@clerk/clerk-expo'
import { colors, animation } from '@/constants/theme'

export default function SplashScreen() {
  const { isLoaded, getToken } = useAuth()
  const fadeAnim = useRef(new Animated.Value(0)).current
  const loadingAnim = useRef(new Animated.Value(0)).current

  useEffect(() => {
    // Slow, intentional fade in
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: animation.verySlow,
      useNativeDriver: true,
    }).start()

    // Slow loading bar
    Animated.loop(
      Animated.timing(loadingAnim, {
        toValue: 1,
        duration: 2000,
        useNativeDriver: false,
      })
    ).start()
  }, [])

  useEffect(() => {
    async function checkRealAuthState() {
      if (!isLoaded) return

      await new Promise(resolve => setTimeout(resolve, 2500))

      // TEMP: Bypass auth for testing - REMOVE THIS LATER
      const BYPASS_AUTH = true
      if (BYPASS_AUTH) {
        console.log('[Auth] BYPASSING AUTH FOR TESTING')
        router.replace('/(main)/home')
        return
      }

      try {
        const token = await getToken()
        if (token) {
          router.replace('/(main)/home')
        } else {
          router.replace('/(auth)/login')
        }
      } catch (error) {
        router.replace('/(auth)/login')
      }
    }

    checkRealAuthState()
  }, [isLoaded])

  const loadingWidth = loadingAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  })

  return (
    <View style={styles.container}>
      {/* Content - generous whitespace */}
      <View style={styles.content}>
        <Animated.View style={[styles.brandingContainer, { opacity: fadeAnim }]}>
          {/* Cara Logo */}
          <Image
            source={require('@/assets/images/cara-splash.png')}
            style={styles.logo}
            resizeMode="contain"
          />
          <Text style={styles.tagline}>Your digital friends</Text>
        </Animated.View>
      </View>

      {/* Minimal loading indicator */}
      <View style={styles.bottomSection}>
        <View style={styles.loadingBar}>
          <Animated.View style={[styles.loadingProgress, { width: loadingWidth }]} />
        </View>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.calm,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 48,
  },
  brandingContainer: {
    alignItems: 'center',
  },
  logo: {
    width: 200,
    height: 80,
    marginBottom: 24,
  },
  tagline: {
    fontSize: 18,
    color: colors.textBody,
    fontFamily: 'Inter_400Regular',
    letterSpacing: 0.5,
    textAlign: 'center',
  },
  bottomSection: {
    paddingBottom: 100,
    alignItems: 'center',
  },
  loadingBar: {
    width: 48,
    height: 2,
    backgroundColor: colors.warm,
    borderRadius: 1,
    overflow: 'hidden',
  },
  loadingProgress: {
    height: '100%',
    backgroundColor: colors.emotional,
    borderRadius: 1,
  },
})
