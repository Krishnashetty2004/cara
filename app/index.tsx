import { useEffect, useRef, useState } from 'react'
import { View, Text, StyleSheet, Dimensions, Animated } from 'react-native'
import { router } from 'expo-router'
import { useAuth } from '@clerk/clerk-expo'
import { LinearGradient } from 'expo-linear-gradient'
import { Image } from 'react-native'

const { width, height } = Dimensions.get('window')
const SPLASH_BG = require('@/assets/images/splashs.jpeg')

export default function SplashScreen() {
  const { isLoaded, getToken } = useAuth()
  const fadeAnim = useRef(new Animated.Value(0)).current
  const scaleAnim = useRef(new Animated.Value(0.9)).current
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    // Fade in animation
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 8,
        tension: 40,
        useNativeDriver: true,
      }),
    ]).start()
  }, [])

  useEffect(() => {
    async function checkRealAuthState() {
      if (!isLoaded) return

      // Wait for splash animation to show
      await new Promise(resolve => setTimeout(resolve, 2500))

      try {
        // getToken() actually checks if there's a valid session
        const token = await getToken()
        
        console.log('[Splash] Real auth check:', { hasToken: !!token })

        if (token) {
          // Has valid token = signed in
          console.log('[Splash] Valid token found, going to home')
          router.replace('/(main)/home')
        } else {
          // No token = not signed in
          console.log('[Splash] No token, going to login')
          router.replace('/(auth)/login')
        }
      } catch (error) {
        console.log('[Splash] Error checking token:', error)
        router.replace('/(auth)/login')
      } finally {
        setChecking(false)
      }
    }

    checkRealAuthState()
  }, [isLoaded])

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
          'rgba(10, 22, 40, 0.7)',
          'rgba(10, 22, 40, 0.4)',
          'rgba(10, 22, 40, 0.5)',
          'rgba(10, 22, 40, 0.8)',
        ]}
        locations={[0, 0.3, 0.6, 1]}
        style={styles.gradientOverlay}
      />

      {/* Content */}
      <View style={styles.content}>
        <Animated.View
          style={[
            styles.brandingContainer,
            {
              opacity: fadeAnim,
              transform: [{ scale: scaleAnim }],
            },
          ]}
        >
          <Text style={styles.appName}>cara</Text>
          <Text style={styles.tagline}>Your digital friends</Text>
        </Animated.View>
      </View>

      {/* Bottom Loading Indicator */}
      <View style={styles.bottomSection}>
        <View style={styles.loadingBar}>
          <Animated.View
            style={[
              styles.loadingProgress,
              {
                opacity: fadeAnim,
              },
            ]}
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
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  brandingContainer: {
    alignItems: 'center',
  },
  appName: {
    fontSize: 80,
    color: '#FFFFFF',
    letterSpacing: -2,
    fontFamily: 'PlayfairDisplay_700Bold',
    textShadowColor: 'rgba(0, 0, 0, 0.4)',
    textShadowOffset: { width: 0, height: 3 },
    textShadowRadius: 8,
    textAlign: 'center',
  },
  tagline: {
    fontSize: 18,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 16,
    fontFamily: 'Inter_400Regular',
    letterSpacing: 1,
    textAlign: 'center',
  },
  bottomSection: {
    paddingBottom: 80,
    alignItems: 'center',
  },
  loadingBar: {
    width: 60,
    height: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  loadingProgress: {
    width: '100%',
    height: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    borderRadius: 2,
  },
})
