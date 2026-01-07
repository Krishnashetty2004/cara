// app/(paywall)/premium.tsx
// Razorpay payment integration

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useUser, useAuth } from '@clerk/clerk-expo';
import { Ionicons } from '@expo/vector-icons';
import { createSubscription, openCheckout } from '@/lib/razorpay';
import { useUser as useAppUser } from '@/hooks/useUser';

export default function PremiumScreen() {
  const router = useRouter();
  const { user } = useUser();
  const { getToken } = useAuth();
  const { checkSubscriptionStatus } = useAppUser();
  const [loading, setLoading] = useState(false);

  const handleClose = () => {
    router.back();
  };

  const handleSubscribe = async () => {
    if (!user?.id) {
      Alert.alert('Error', 'Please sign in first');
      return;
    }

    setLoading(true);
    try {
      if (!getToken) {
        throw new Error('Not authenticated');
      }

      // Step 1: Create subscription on Razorpay
      // User ID is extracted from JWT token on the server
      const subscriptionId = await createSubscription(getToken);

      if (!subscriptionId) {
        throw new Error('Failed to create subscription');
      }

      // Step 2: Open Razorpay checkout
      const result = await openCheckout(
        subscriptionId,
        {
          id: user.id,
          email: user.primaryEmailAddress?.emailAddress,
          name: user.firstName || undefined,
        },
        getToken
      );

      // If we got a response (web checkout), subscription is active
      if (result) {
        Alert.alert(
          'Welcome to Premium!',
          'Enjoy unlimited calls with Cara.',
          [{ text: 'OK', onPress: () => router.back() }]
        );
        // Refresh subscription status
        await checkSubscriptionStatus();
      } else {
        // Browser checkout - webhook will update status
        Alert.alert(
          'Complete Payment',
          'Please complete the payment in your browser. Your premium status will be activated automatically.',
          [{ text: 'OK', onPress: () => router.back() }]
        );
      }
    } catch (error) {
      console.error('Subscription error:', error);
      Alert.alert('Error', 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const features = [
    'Unlimited voice calls',
    'No 5-minute time limit',
    'Priority access 24/7',
    'Exclusive conversations',
  ];

  return (
    <SafeAreaView style={styles.container}>
      {/* Close Button */}
      <TouchableOpacity style={styles.closeButton} onPress={handleClose}>
        <Ionicons name="close" size={28} color="#666" />
      </TouchableOpacity>

      <View style={styles.content}>
        {/* Icon */}
        <View style={styles.iconContainer}>
          <Text style={styles.iconText}>✨</Text>
        </View>

        {/* Title */}
        <Text style={styles.title}>Go Premium</Text>
        <Text style={styles.subtitle}>Unlimited access to your AI companions</Text>

        {/* Features Card */}
        <View style={styles.featuresCard}>
          {features.map((feature, index) => (
            <View key={index} style={styles.featureRow}>
              <View style={styles.checkCircle}>
                <Ionicons name="checkmark" size={16} color="white" />
              </View>
              <Text style={styles.featureText}>{feature}</Text>
            </View>
          ))}
        </View>

        {/* Price Card - SOLID FILL, NO WEIRD BORDER */}
        <View style={styles.priceCard}>
          <View style={styles.priceRow}>
            <Text style={styles.currency}>₹</Text>
            <Text style={styles.price}>99</Text>
            <Text style={styles.period}>/week</Text>
          </View>
          <Text style={styles.cancelText}>Cancel anytime</Text>
        </View>

        {/* Spacer */}
        <View style={styles.spacer} />

        {/* Subscribe Button - VISIBLE, ROUNDED, PROMINENT */}
        <TouchableOpacity
          style={styles.subscribeButton}
          onPress={handleSubscribe}
          activeOpacity={0.8}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text style={styles.subscribeButtonText}>Subscribe Now</Text>
          )}
        </TouchableOpacity>

        {/* Footer */}
        <Text style={styles.footerText}>
          Secure payment powered by Razorpay
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F8FB',
  },
  closeButton: {
    position: 'absolute',
    top: 60,
    right: 20,
    zIndex: 10,
    padding: 8,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 80,
    alignItems: 'center',
  },

  // Icon
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#F0E6F0',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  iconText: {
    fontSize: 36,
  },

  // Title
  title: {
    fontSize: 32,
    fontFamily: 'PlayfairDisplay-Bold',
    color: '#2B5A87',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 32,
  },

  // Features Card
  featuresCard: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 24,
    width: '100%',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  checkCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#4CAF50',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  featureText: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },

  // Price Card - CLEAN, NO BORDER
  priceCard: {
    backgroundColor: '#F8F4F8',
    borderRadius: 16,
    paddingVertical: 24,
    paddingHorizontal: 32,
    width: '100%',
    alignItems: 'center',
    marginBottom: 24,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  currency: {
    fontSize: 24,
    fontWeight: '700',
    color: '#2B5A87',
  },
  price: {
    fontSize: 56,
    fontWeight: '800',
    color: '#2B5A87',
  },
  period: {
    fontSize: 18,
    color: '#666',
    marginLeft: 4,
  },
  cancelText: {
    fontSize: 14,
    color: '#888',
    marginTop: 8,
  },

  spacer: {
    flex: 1,
  },

  // Subscribe Button - VISIBLE, PROMINENT
  subscribeButton: {
    backgroundColor: '#4A8FD4',
    height: 56,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    shadowColor: '#4A8FD4',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
    marginBottom: 16,
  },
  subscribeButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: 'white',
  },

  // Footer
  footerText: {
    fontSize: 13,
    color: '#999',
    marginBottom: 32,
  },
});
