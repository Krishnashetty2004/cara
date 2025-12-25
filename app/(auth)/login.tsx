import { View, Text, Pressable, ActivityIndicator, Alert, StyleSheet, Dimensions, Image, Linking } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { useEffect, useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { LinearGradient } from 'expo-linear-gradient'
import Svg, { Path } from 'react-native-svg'

const { width, height } = Dimensions.get('window')
const SPLASH_BG = require('@/assets/images/splashs.jpeg')

// Google "G" Logo Component (official colors)
const GoogleLogo = () => (
  <Svg width={20} height={20} viewBox="0 0 24 24">
    <Path
      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      fill="#4285F4"
    />
    <Path
      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      fill="#34A853"
    />
    <Path
      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      fill="#FBBC05"
    />
    <Path
      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      fill="#EA4335"
    />
  </Svg>
)

export default function LoginScreen() {
  const insets = useSafeAreaInsets()
  const { user, isLoading, error, signIn, clearError } = useAuth()
  const [isPressed, setIsPressed] = useState(false)

  useEffect(() => {
    if (user) {
      router.replace('/(main)/home')
    }
  }, [user])

  useEffect(() => {
    if (error) {
      Alert.alert('Sign In Error', error, [{ text: 'OK', onPress: clearError }])
    }
  }, [error, clearError])

  const handleSignIn = async () => {
    // Prevent double sign-in if already authenticated
    if (user) {
      router.replace('/(main)/home')
      return
    }
    await signIn()
  }

  const openPrivacyPolicy = async () => {
    const url = 'https://cara.plutas.in/privacy'
    const supported = await Linking.canOpenURL(url)
    if (supported) {
      await Linking.openURL(url)
    } else {
      Alert.alert('Error', 'Unable to open Privacy Policy')
    }
  }

  const openTerms = async () => {
    const url = 'https://cara.plutas.in/terms'
    const supported = await Linking.canOpenURL(url)
    if (supported) {
      await Linking.openURL(url)
    } else {
      Alert.alert('Error', 'Unable to open Terms of Service')
    }
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
          'rgba(10, 22, 40, 0.6)',
          'rgba(10, 22, 40, 0.2)',
          'rgba(10, 22, 40, 0.4)',
          'rgba(10, 22, 40, 0.85)',
        ]}
        locations={[0, 0.3, 0.6, 1]}
        style={styles.gradientOverlay}
      />

      {/* Content */}
      <View style={[styles.content, { paddingTop: insets.top }]}>
        {/* Top Spacer - pushes content down */}
        <View style={styles.topSpacer} />

        {/* Header - Centered */}
        <View style={styles.header}>
          <Text style={styles.appName}>cara</Text>
          <Text style={styles.tagline}>Your digital friends</Text>
        </View>

        {/* Bottom Spacer - pushes button down */}
        <View style={styles.bottomSpacer} />

        {/* Footer */}
        <View style={[styles.footer, { paddingBottom: insets.bottom + 20 }]}>
          {/* Google Button - Using View wrapper for reliable background */}
          <View style={[
            styles.buttonWrapper,
            isPressed && styles.buttonWrapperPressed
          ]}>
            <Pressable
              onPress={handleSignIn}
              onPressIn={() => setIsPressed(true)}
              onPressOut={() => setIsPressed(false)}
              disabled={isLoading || !!user}
              style={styles.buttonPressable}
            >
              {isLoading ? (
                <ActivityIndicator color="#1a1a1a" size="small" />
              ) : (
                <>
                  <View style={styles.googleIconWrapper}>
                    <GoogleLogo />
                  </View>
                  <Text style={styles.googleButtonText}>Continue with Google</Text>
                </>
              )}
            </Pressable>
          </View>

          {/* Links */}
          <View style={styles.linksContainer}>
            <Pressable onPress={openPrivacyPolicy}>
              <Text style={styles.linkText}>Privacy policy</Text>
            </Pressable>
            <Text style={styles.linkDot}>•</Text>
            <Pressable onPress={openTerms}>
              <Text style={styles.linkText}>Terms of service</Text>
            </Pressable>
          </View>
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
    paddingHorizontal: 24,
  },
  topSpacer: {
    flex: 1,
  },
  header: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  appName: {
    fontSize: 72,
    color: '#FFFFFF',
    letterSpacing: -2,
    fontFamily: 'PlayfairDisplay_700Bold',
    textShadowColor: 'rgba(0, 0, 0, 0.4)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 6,
    textAlign: 'center',
  },
  tagline: {
    fontSize: 17,
    color: 'rgba(255, 255, 255, 0.75)',
    marginTop: 12,
    fontFamily: 'Inter_400Regular',
    letterSpacing: 0.5,
    textAlign: 'center',
  },
  bottomSpacer: {
    flex: 1.5,
  },
  footer: {
    alignItems: 'center',
  },
  // WHITE BUTTON - View wrapper approach
  buttonWrapper: {
    backgroundColor: '#FFFFFF',
    borderRadius: 100,
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 8,
    overflow: 'hidden',
  },
  buttonWrapperPressed: {
    backgroundColor: '#F0F0F0',
    transform: [{ scale: 0.98 }],
  },
  buttonPressable: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 32,
    minHeight: 56,
  },
  googleIconWrapper: {
    marginRight: 12,
  },
  googleButtonText: {
    color: '#1a1a1a',
    fontSize: 17,
    fontWeight: '600',
    fontFamily: 'Inter_600SemiBold',
  },
  linksContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 24,
  },
  linkText: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    textDecorationLine: 'underline',
  },
  linkDot: {
    color: 'rgba(255, 255, 255, 0.5)',
    marginHorizontal: 10,
    fontSize: 14,
  },
})
