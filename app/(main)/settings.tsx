import { View, Text, Pressable, Alert, ScrollView, Linking, useWindowDimensions, StyleSheet } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { Crown, LogOut, Shield, FileText, ChevronRight, ChevronLeft } from 'lucide-react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { useUser } from '@/hooks/useUser'
import { useAuth } from '@/hooks/useAuth'
import { CONFIG } from '@/constants/config'

// Brand colors - Light Blue Theme
const colors = {
  background: '#F8FAFC',
  surface: '#FFFFFF',
  surfaceLight: '#EFF6FF',
  primary: '#3B82F6',
  text: '#1E293B',
  textSecondary: '#475569',
  textMuted: '#94A3B8',
  border: '#E2E8F0',
  success: '#10B981',
  danger: '#EF4444',
}

export default function SettingsScreen() {
  const { isPremium, remainingMinutes, subscription } = useUser()
  const { signOut } = useAuth()
  const { width } = useWindowDimensions()

  const isSmallScreen = width < 375
  const horizontalPadding = isSmallScreen ? 16 : 24

  const handleSignOut = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: signOut },
    ])
  }

  const openPrivacyPolicy = () => {
    Linking.openURL('https://cara.app/privacy')
  }

  const openTermsOfService = () => {
    Linking.openURL('https://cara.app/terms')
  }

  const getSubscriptionInfo = () => {
    if (!subscription?.current_period_end) return null
    const endDate = new Date(subscription.current_period_end)
    return `Renews on ${endDate.toLocaleDateString()}`
  }

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 40 }}
        >
          {/* Header */}
          <View style={[styles.header, { paddingHorizontal: horizontalPadding }]}>
            <Pressable
              onPress={() => router.back()}
              style={({ pressed }) => [
                styles.backButton,
                { opacity: pressed ? 0.5 : 1 },
              ]}
            >
              <ChevronLeft color={colors.text} size={28} />
            </Pressable>
            <Text style={styles.headerTitle}>Settings</Text>
          </View>

          <View style={{ paddingHorizontal: horizontalPadding }}>
            {/* Premium Section */}
            <View style={[styles.card, isPremium && styles.cardPremium]}>
              <View style={styles.cardHeader}>
                <View style={styles.crownContainer}>
                  <Crown
                    color={isPremium ? colors.primary : colors.textMuted}
                    size={24}
                    fill={isPremium ? colors.primary : 'transparent'}
                  />
                </View>
                <Text style={styles.cardTitle}>
                  {isPremium ? 'Premium Member' : 'Free Plan'}
                </Text>
              </View>

              {isPremium ? (
                <View>
                  <Text style={styles.premiumText}>
                    Unlimited voice calls
                  </Text>
                  {getSubscriptionInfo() && (
                    <Text style={styles.subscriptionInfo}>
                      {getSubscriptionInfo()}
                    </Text>
                  )}
                </View>
              ) : (
                <>
                  <Text style={styles.freeText}>
                    {remainingMinutes} minutes remaining today
                  </Text>
                  <Pressable
                    onPress={() => router.push('/(paywall)/premium')}
                    style={({ pressed }) => ({ opacity: pressed ? 0.8 : 1 })}
                  >
                    <LinearGradient
                      colors={[colors.primary, '#2563EB']}
                      style={styles.upgradeButton}
                    >
                      <Text style={styles.upgradeButtonText}>
                        Upgrade to Premium - ₹{CONFIG.SUBSCRIPTION_PRICE_INR}/{CONFIG.SUBSCRIPTION_PERIOD}
                      </Text>
                    </LinearGradient>
                  </Pressable>
                </>
              )}
            </View>

            {/* Legal Section */}
            <Text style={styles.sectionTitle}>Legal</Text>
            <View style={styles.menuCard}>
              <MenuItem
                icon={<Shield color={colors.textSecondary} size={22} />}
                title="Privacy Policy"
                onPress={openPrivacyPolicy}
              />
              <View style={styles.menuDivider} />
              <MenuItem
                icon={<FileText color={colors.textSecondary} size={22} />}
                title="Terms of Service"
                onPress={openTermsOfService}
              />
            </View>

            {/* Account Section */}
            <Text style={styles.sectionTitle}>Account</Text>
            <View style={styles.menuCard}>
              <MenuItem
                icon={<LogOut color={colors.danger} size={22} />}
                title="Sign Out"
                titleColor={colors.danger}
                onPress={handleSignOut}
              />
            </View>

            {/* Version */}
            <Text style={styles.version}>Cara v1.0.0</Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  )
}

function MenuItem({
  icon,
  title,
  titleColor = colors.text,
  onPress,
}: {
  icon: React.ReactNode
  title: string
  titleColor?: string
  onPress: () => void
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.menuItem,
        { backgroundColor: pressed ? colors.surfaceLight : 'transparent' },
      ]}
    >
      <View style={styles.menuIconContainer}>{icon}</View>
      <Text style={[styles.menuTitle, { color: titleColor }]}>{title}</Text>
      <ChevronRight color={colors.textMuted} size={20} />
    </Pressable>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  safeArea: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 8,
    paddingBottom: 24,
  },
  backButton: {
    padding: 8,
    marginLeft: -8,
  },
  headerTitle: {
    fontSize: 28,
    color: colors.text,
    marginLeft: 8,
    fontFamily: 'PlayfairDisplay_600SemiBold',
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardPremium: {
    borderColor: colors.primary,
    borderWidth: 1.5,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  crownContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surfaceLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: {
    fontSize: 20,
    color: colors.text,
    marginLeft: 14,
    fontFamily: 'Inter_600SemiBold',
  },
  premiumText: {
    fontSize: 16,
    color: colors.success,
    fontFamily: 'Inter_500Medium',
  },
  subscriptionInfo: {
    fontSize: 13,
    color: colors.textMuted,
    fontFamily: 'Inter_400Regular',
    marginTop: 6,
  },
  freeText: {
    fontSize: 15,
    color: colors.textSecondary,
    marginBottom: 18,
    fontFamily: 'Inter_400Regular',
  },
  upgradeButton: {
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 14,
    alignItems: 'center',
  },
  upgradeButtonText: {
    fontSize: 16,
    color: '#FFFFFF',
    fontFamily: 'Inter_600SemiBold',
  },
  sectionTitle: {
    fontSize: 14,
    color: colors.textMuted,
    marginBottom: 12,
    fontFamily: 'Inter_500Medium',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  menuCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 24,
    borderWidth: 1,
    borderColor: colors.border,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  menuIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: colors.surfaceLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuTitle: {
    fontSize: 16,
    marginLeft: 14,
    flex: 1,
    fontFamily: 'Inter_400Regular',
  },
  menuDivider: {
    height: 1,
    backgroundColor: colors.border,
    marginHorizontal: 16,
  },
  version: {
    fontSize: 13,
    color: colors.textMuted,
    textAlign: 'center',
    fontFamily: 'Inter_400Regular',
    marginTop: 8,
  },
})
