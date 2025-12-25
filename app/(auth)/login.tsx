import { View, Text, Pressable, ActivityIndicator, Alert, StyleSheet, Dimensions, Linking } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { useEffect, useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import Svg, { Path } from 'react-native-svg'

const { width, height } = Dimensions.get('window')

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

// Decorative blob component
const Blob = ({ style, color = '#D4E5F7' }: { style?: any; color?: string }) => (
  <View style={[styles.blob, style, { backgroundColor: color }]} />
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
    if (user) {
      router.replace('/(main)/home')
      return
    }
    await signIn()
  }

  const openPrivacyPolicy = () => {
    Linking.openURL('https://cara.plutas.in/privacy')
  }

  const openTerms = () => {
    Linking.openURL('https://cara.plutas.in/terms')
  }

  return (
    <View style={styles.container}>
      {/* Decorative Blobs */}
      <Blob style={styles.blobTopLeft} color="#D4E5F7" />
      <Blob style={styles.blobTopRight} color="#4A90D9" />
      <Blob style={styles.blobBottomLeft} color="#D4E5F7" />
      <Blob style={styles.blobBottomRight} color="#D4E5F7" />

      {/* Stars */}
      <Text style={styles.star1}>✦</Text>
      <Text style={styles.star2}>✦</Text>
      <Text style={styles.star3}>✦</Text>

      {/* Content */}
      <View style={[styles.content, { paddingTop: insets.top + 80 }]}>
        {/* App Name */}
        <Text style={styles.appName}>cara</Text>

        {/* Tagline */}
        <View style={styles.taglineContainer}>
          <Text style={styles.tagline}>ai friends</Text>
          <Text style={styles.taglineAccent}>just like your real friends</Text>
        </View>

        {/* Subtitle */}
        <Text style={styles.subtitle}>Say hi to Preethi & Ira</Text>
        <Text style={styles.description}>
          Human, realistic companions for meaningful conversations that help with life.
        </Text>

        {/* Spacer */}
        <View style={styles.spacer} />

        {/* Google Sign In Button */}
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
              <ActivityIndicator color="#FFFFFF" size="small" />
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

        {/* iOS Coming Soon */}
        <View style={styles.iosButton}>
          <Text style={styles.iosIcon}>🍎</Text>
          <Text style={styles.iosText}>iOS coming soon</Text>
        </View>
      </View>

      {/* Footer */}
      <View style={[styles.footer, { paddingBottom: insets.bottom + 20 }]}>
        <Pressable onPress={openPrivacyPolicy}>
          <Text style={styles.footerLink}>Privacy Policy</Text>
        </Pressable>
        <Text style={styles.footerDot}>•</Text>
        <Pressable onPress={openTerms}>
          <Text style={styles.footerLink}>Terms of Service</Text>
        </Pressable>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F9FC',
  },
  blob: {
    position: 'absolute',
    borderRadius: 999,
    opacity: 0.6,
  },
  blobTopLeft: {
    width: 300,
    height: 300,
    top: -100,
    left: -100,
  },
  blobTopRight: {
    width: 80,
    height: 80,
    top: 200,
    right: 40,
    opacity: 0.4,
  },
  blobBottomLeft: {
    width: 120,
    height: 120,
    bottom: 200,
    left: 20,
  },
  blobBottomRight: {
    width: 200,
    height: 200,
    bottom: -50,
    right: -50,
  },
  star1: {
    position: 'absolute',
    top: 150,
    left: '15%',
    fontSize: 16,
    color: '#718096',
  },
  star2: {
    position: 'absolute',
    top: 180,
    right: 80,
    fontSize: 20,
    color: '#718096',
  },
  star3: {
    position: 'absolute',
    bottom: 300,
    right: 30,
    fontSize: 14,
    color: '#718096',
  },
  content: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  appName: {
    fontSize: 64,
    fontFamily: 'PlayfairDisplay_700Bold',
    color: '#4A90D9',
    letterSpacing: -2,
    marginBottom: 40,
  },
  taglineContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  tagline: {
    fontSize: 32,
    fontFamily: 'PlayfairDisplay_400Regular',
    color: '#1a1a2e',
  },
  taglineAccent: {
    fontSize: 32,
    fontFamily: 'PlayfairDisplay_400Regular',
    fontStyle: 'italic',
    color: '#E8927C',
  },
  subtitle: {
    fontSize: 18,
    color: '#2D3748',
    marginBottom: 8,
  },
  description: {
    fontSize: 16,
    color: '#718096',
    textAlign: 'center',
    lineHeight: 24,
    maxWidth: 300,
  },
  spacer: {
    flex: 1,
  },
  // Dark button
  buttonWrapper: {
    backgroundColor: '#1a1a2e',
    borderRadius: 100,
    width: '100%',
    maxWidth: 320,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
    overflow: 'hidden',
  },
  buttonWrapperPressed: {
    backgroundColor: '#2D3748',
    transform: [{ scale: 0.98 }],
  },
  buttonPressable: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    paddingHorizontal: 32,
  },
  googleIconWrapper: {
    marginRight: 12,
  },
  googleButtonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '600',
  },
  iosButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 100,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    width: '100%',
    maxWidth: 320,
  },
  iosIcon: {
    fontSize: 18,
    marginRight: 8,
  },
  iosText: {
    fontSize: 16,
    color: '#718096',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 20,
  },
  footerLink: {
    fontSize: 14,
    color: '#718096',
    textDecorationLine: 'underline',
  },
  footerDot: {
    color: '#718096',
    marginHorizontal: 8,
  },
})
