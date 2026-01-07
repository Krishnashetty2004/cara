import { useEffect } from 'react'
import { Stack, useRouter, useSegments } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { View, ActivityIndicator } from 'react-native'
import { ClerkProvider, ClerkLoaded, useAuth } from '@clerk/clerk-expo'
import {
  useFonts,
  PlayfairDisplay_400Regular,
  PlayfairDisplay_600SemiBold,
  PlayfairDisplay_700Bold,
} from '@expo-google-fonts/playfair-display'
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from '@expo-google-fonts/inter'
import { tokenCache, CLERK_PUBLISHABLE_KEY } from '@/lib/clerk'
import '../global.css'

// Auto-redirect based on auth state
function AuthRedirect({ children }: { children: React.ReactNode }) {
  const { isLoaded, getToken } = useAuth()
  const segments = useSegments()
  const router = useRouter()

  useEffect(() => {
    async function checkAuthAndRedirect() {
      if (!isLoaded) return // Wait for Clerk to load

      // Auth is now enabled for production
      const BYPASS_AUTH = false
      if (BYPASS_AUTH) {
        return // Don't redirect anywhere
      }

      try {
        // Check real auth state with getToken()
        const token = await getToken()
        const hasValidSession = !!token

        const inAuthGroup = segments[0] === '(auth)'
        const inMainGroup = segments[0] === '(main)'
        const inPaywallGroup = segments[0] === '(paywall)'

        if (hasValidSession && inAuthGroup) {
          // User has valid session but on login screen → Go to home
          console.log('[AuthRedirect] Valid session found, redirecting to home')
          router.replace('/(main)/home')
        } else if (!hasValidSession && (inMainGroup || inPaywallGroup)) {
          // User has no valid session but trying to access protected routes → Go to login
          console.log('[AuthRedirect] No valid session, redirecting to login')
          router.replace('/(auth)/login')
        }
      } catch (error) {
        console.log('[AuthRedirect] Error checking auth:', error)
      }
    }

    checkAuthAndRedirect()
  }, [isLoaded, segments])

  return <>{children}</>
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    PlayfairDisplay_400Regular,
    PlayfairDisplay_600SemiBold,
    PlayfairDisplay_700Bold,
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  })

  if (!fontsLoaded) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F2F3F4' }}>
        <ActivityIndicator size="large" color="#A77693" />
      </View>
    )
  }

  return (
    <ClerkProvider publishableKey={CLERK_PUBLISHABLE_KEY} tokenCache={tokenCache}>
      <ClerkLoaded>
        <SafeAreaProvider>
          <AuthRedirect>
            <StatusBar style="light" />
            <Stack
              screenOptions={{
                headerShown: false,
                animation: 'fade',
                animationDuration: 200,
              }}
            >
              <Stack.Screen name="index" />
              <Stack.Screen name="(auth)" />
              <Stack.Screen name="(main)" />
              <Stack.Screen
                name="(paywall)"
                options={{
                  presentation: 'transparentModal',
                  animation: 'fade_from_bottom',
                }}
              />
            </Stack>
          </AuthRedirect>
        </SafeAreaProvider>
      </ClerkLoaded>
    </ClerkProvider>
  )
}
