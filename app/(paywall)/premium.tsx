import { View, Text, Pressable, Alert, ActivityIndicator } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { useState } from 'react'
import { X, Check, Sparkles } from 'lucide-react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { CONFIG } from '@/constants/config'
import { useUser } from '@/hooks/useUser'
import { createSubscription, openCheckout } from '@/lib/razorpay'

export default function PremiumScreen() {
  const { user, isPremium, checkSubscriptionStatus } = useUser()
  const [isLoading, setIsLoading] = useState(false)

  const handlePurchase = async () => {
    if (!user?.id) {
      Alert.alert('Sign In Required', 'Please sign in to subscribe to premium.', [
        { text: 'OK', onPress: () => router.push('/(auth)/login') },
      ])
      return
    }

    setIsLoading(true)

    try {
      // Create subscription on Razorpay
      const subscriptionId = await createSubscription(user.id)

      if (!subscriptionId) {
        throw new Error('Failed to create subscription')
      }

      // Open Razorpay checkout
      const result = await openCheckout(subscriptionId, {
        id: user.id,
        email: user.email,
        name: user.name,
      })

      if (result) {
        // Payment successful - refresh subscription status
        await checkSubscriptionStatus()
        Alert.alert('Welcome to Premium!', 'You now have unlimited access to Preethi.', [
          { text: 'Start Calling', onPress: () => router.replace('/(main)/home') },
        ])
      } else {
        // Payment was dismissed or failed
        // Webhook will handle the actual status update
        // Show a message asking user to wait
        Alert.alert(
          'Payment Processing',
          'If you completed the payment, your premium status will be updated shortly.',
          [{ text: 'OK' }]
        )
      }
    } catch (error: any) {
      console.error('[Premium] Purchase error:', error)
      Alert.alert('Payment Failed', error.message || 'Something went wrong. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  // If already premium, show status
  if (isPremium) {
    return (
      <View style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
        <SafeAreaView style={{ flex: 1 }}>
          <View style={{ flex: 1, paddingHorizontal: 24 }}>
            {/* Close Button */}
            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', paddingTop: 16 }}>
              <Pressable
                onPress={() => router.back()}
                style={({ pressed }) => [{ padding: 8, opacity: pressed ? 0.7 : 1 }]}
              >
                <X color="#64748B" size={24} />
              </Pressable>
            </View>

            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
              <View
                style={{
                  width: 80,
                  height: 80,
                  borderRadius: 40,
                  backgroundColor: '#DCFCE7',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: 24,
                }}
              >
                <Check color="#10B981" size={40} />
              </View>

              <Text
                style={{
                  fontSize: 28,
                  color: '#1E293B',
                  marginBottom: 8,
                  fontFamily: 'PlayfairDisplay_700Bold',
                }}
              >
                You're Premium!
              </Text>

              <Text
                style={{
                  fontSize: 16,
                  color: '#64748B',
                  textAlign: 'center',
                  fontFamily: 'Inter_400Regular',
                }}
              >
                Enjoy unlimited access to Preethi
              </Text>
            </View>
          </View>
        </SafeAreaView>
      </View>
    )
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
      <SafeAreaView style={{ flex: 1 }}>
        <View style={{ flex: 1, paddingHorizontal: 24 }}>
          {/* Close Button */}
          <View style={{ flexDirection: 'row', justifyContent: 'flex-end', paddingTop: 16 }}>
            <Pressable
              onPress={() => router.back()}
              style={({ pressed }) => [{ padding: 8, opacity: pressed ? 0.7 : 1 }]}
            >
              <X color="#64748B" size={24} />
            </Pressable>
          </View>

          {/* Header */}
          <View style={{ alignItems: 'center', marginTop: 40 }}>
            <View
              style={{
                width: 80,
                height: 80,
                borderRadius: 40,
                backgroundColor: '#DBEAFE',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 24,
              }}
            >
              <Sparkles color="#3B82F6" size={40} />
            </View>

            <Text
              style={{
                fontSize: 32,
                color: '#1E293B',
                marginBottom: 8,
                fontFamily: 'PlayfairDisplay_700Bold',
              }}
            >
              Go Premium
            </Text>

            <Text
              style={{
                fontSize: 16,
                color: '#64748B',
                textAlign: 'center',
                fontFamily: 'Inter_400Regular',
              }}
            >
              Unlimited access to Preethi
            </Text>
          </View>

          {/* Features */}
          <View style={{ marginTop: 40 }}>
            <FeatureItem text="Unlimited voice calls" />
            <FeatureItem text="No 5-minute time limit" />
            <FeatureItem text="Priority access 24/7" />
            <FeatureItem text="Exclusive conversations" />
          </View>

          {/* Pricing */}
          <View style={{ flex: 1, justifyContent: 'flex-end', paddingBottom: 24 }}>
            <View
              style={{
                backgroundColor: '#F8FAFC',
                borderRadius: 16,
                padding: 24,
                marginBottom: 16,
                borderWidth: 2,
                borderColor: '#3B82F6',
                alignItems: 'center',
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
                <Text
                  style={{
                    fontSize: 48,
                    color: '#1E293B',
                    fontFamily: 'Inter_700Bold',
                  }}
                >
                  ₹{CONFIG.SUBSCRIPTION_PRICE_INR}
                </Text>
                <Text
                  style={{
                    fontSize: 16,
                    color: '#64748B',
                    marginLeft: 4,
                    fontFamily: 'Inter_400Regular',
                  }}
                >
                  /{CONFIG.SUBSCRIPTION_PERIOD}
                </Text>
              </View>
              <Text
                style={{
                  fontSize: 12,
                  color: '#94A3B8',
                  marginTop: 4,
                  fontFamily: 'Inter_400Regular',
                }}
              >
                Cancel anytime
              </Text>
            </View>

            <Pressable onPress={handlePurchase} disabled={isLoading}>
              <LinearGradient
                colors={isLoading ? ['#94A3B8', '#64748B'] : ['#60A5FA', '#3B82F6']}
                style={{
                  paddingVertical: 18,
                  borderRadius: 16,
                  alignItems: 'center',
                  shadowColor: '#3B82F6',
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.3,
                  shadowRadius: 8,
                  elevation: 6,
                }}
              >
                {isLoading ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text
                    style={{
                      fontSize: 18,
                      color: '#FFFFFF',
                      fontFamily: 'Inter_600SemiBold',
                    }}
                  >
                    Subscribe Now
                  </Text>
                )}
              </LinearGradient>
            </Pressable>

            <Text
              style={{
                fontSize: 11,
                color: '#94A3B8',
                textAlign: 'center',
                marginTop: 16,
                fontFamily: 'Inter_400Regular',
              }}
            >
              Secure payment powered by Razorpay
            </Text>
          </View>
        </View>
      </SafeAreaView>
    </View>
  )
}

function FeatureItem({ text }: { text: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 12 }}>
      <View
        style={{
          width: 24,
          height: 24,
          borderRadius: 12,
          backgroundColor: '#DCFCE7',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Check color="#10B981" size={14} />
      </View>
      <Text
        style={{
          fontSize: 16,
          color: '#1E293B',
          marginLeft: 12,
          fontFamily: 'Inter_400Regular',
        }}
      >
        {text}
      </Text>
    </View>
  )
}
