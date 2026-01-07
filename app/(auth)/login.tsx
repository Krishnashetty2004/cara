// app/(auth)/login.tsx
// FIXED: Bigger logo, removed "Get started", rounded Google button

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  Image,
  Dimensions,
} from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import { useOAuth } from '@clerk/clerk-expo';
import { useRouter } from 'expo-router';

WebBrowser.maybeCompleteAuthSession();

const { width } = Dimensions.get('window');

export default function LoginScreen() {
  const { startOAuthFlow } = useOAuth({ strategy: 'oauth_google' });
  const router = useRouter();

  const handleGoogleSignIn = async () => {
    try {
      const { createdSessionId, setActive } = await startOAuthFlow();
      if (createdSessionId && setActive) {
        await setActive({ session: createdSessionId });
        router.replace('/(main)/home');
      }
    } catch (err) {
      console.error('OAuth error:', err);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Logo Section - BIGGER */}
        <View style={styles.logoSection}>
          <Text style={styles.logo}>cara</Text>
        </View>

        {/* Tagline Section */}
        <View style={styles.taglineSection}>
          <Text style={styles.tagline}>ai friends</Text>
          <Text style={styles.taglineHighlight}>who actually get you</Text>
          <Text style={styles.subtitle}>
            Human, realistic companions for{'\n'}meaningful conversations.
          </Text>
        </View>

        {/* Spacer */}
        <View style={styles.spacer} />

        {/* Google Button - ROUNDED, NO "Get started" */}
        <View style={styles.buttonSection}>
          <TouchableOpacity
            style={styles.googleButton}
            onPress={handleGoogleSignIn}
            activeOpacity={0.8}
          >
            <Image
              source={{ uri: 'https://developers.google.com/identity/images/g-logo.png' }}
              style={styles.googleIcon}
            />
            <Text style={styles.googleButtonText}>Continue with Google</Text>
          </TouchableOpacity>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <TouchableOpacity>
            <Text style={styles.footerLink}>Privacy Policy</Text>
          </TouchableOpacity>
          <Text style={styles.footerDot}>·</Text>
          <TouchableOpacity>
            <Text style={styles.footerLink}>Terms of Service</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F8FB',
  },
  content: {
    flex: 1,
    paddingHorizontal: 32,
    paddingTop: 80,
    paddingBottom: 40,
  },
  logoSection: {
    alignItems: 'center',
    marginBottom: 48,
  },
  logo: {
    fontSize: 72,  // MUCH BIGGER
    fontFamily: 'PlayfairDisplay-Bold',
    color: '#4A8FD4',
    letterSpacing: 2,
  },
  taglineSection: {
    alignItems: 'center',
  },
  tagline: {
    fontSize: 36,
    fontFamily: 'PlayfairDisplay-Regular',
    color: '#2B5A87',
    marginBottom: 8,
  },
  taglineHighlight: {
    fontSize: 32,
    fontFamily: 'PlayfairDisplay-Regular',
    color: '#C4A484',
    marginBottom: 24,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
  },
  spacer: {
    flex: 1,
  },
  buttonSection: {
    marginBottom: 32,
  },
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    height: 56,
    borderRadius: 50,  // FULLY ROUNDED
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  googleIcon: {
    width: 24,
    height: 24,
    marginRight: 12,
  },
  googleButtonText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#333',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  footerLink: {
    fontSize: 14,
    color: '#888',
  },
  footerDot: {
    fontSize: 14,
    color: '#888',
    marginHorizontal: 8,
  },
});
