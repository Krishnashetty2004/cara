import React, { useState } from 'react'
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ScrollView,
  Linking,
  Modal,
  Alert,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { useAuth } from '@/hooks/useAuth'
import { useUser } from '@/hooks/useUser'
import {
  ChevronLeft,
  ChevronRight,
  Flag,
  CreditCard,
  MessageSquare,
  LogOut,
} from 'lucide-react-native'

// WhatsApp number for support
const WHATSAPP_NUMBER = '917780185418'

// Report Content Modal Component
function ReportContentModal({
  visible,
  onClose
}: {
  visible: boolean
  onClose: () => void
}) {
  const reportOptions = [
    'Inappropriate content',
    'Harassment or bullying',
    'Violence or threats',
    'Spam or misleading',
    'Other',
  ]

  const handleReport = (reason: string) => {
    Alert.alert('Report Submitted', `Thank you for reporting: ${reason}`)
    onClose()
  }

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Report Content</Text>
            <Pressable onPress={onClose}>
              <Text style={styles.modalClose}>✕</Text>
            </Pressable>
          </View>

          <Text style={styles.modalDescription}>
            Help us keep our community safe by reporting inappropriate AI-generated content.
          </Text>

          {reportOptions.map((option) => (
            <Pressable
              key={option}
              style={({ pressed }) => [
                styles.reportOption,
                pressed && styles.reportOptionPressed
              ]}
              onPress={() => handleReport(option)}
            >
              <Text style={styles.reportOptionText}>{option}</Text>
            </Pressable>
          ))}
        </View>
      </View>
    </Modal>
  )
}

export default function SettingsScreen() {
  const { user, signOut } = useAuth()
  const { isPremium } = useUser()
  const [showReportModal, setShowReportModal] = useState(false)

  // Get user info
  const userName = user?.name || 'User'
  const userEmail = user?.email || 'user@email.com'
  const userInitial = userName.charAt(0).toUpperCase()

  const handleSignOut = async () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            await signOut()
            router.replace('/(auth)/login')
          }
        },
      ]
    )
  }

  const handleManageSubscription = () => {
    const message = encodeURIComponent(
      `Hi! I need help with my Cara subscription.\n\nEmail: ${userEmail}`
    )
    Linking.openURL(`https://wa.me/${WHATSAPP_NUMBER}?text=${message}`)
  }

  const handleGiveFeedback = () => {
    const message = encodeURIComponent('Hi! I have feedback about Cara app:')
    Linking.openURL(`https://wa.me/${WHATSAPP_NUMBER}?text=${message}`)
  }

  const handlePrivacyPolicy = () => {
    Linking.openURL('https://cara.plutas.in/privacy')
  }

  const handleTermsOfService = () => {
    Linking.openURL('https://cara.plutas.in/terms')
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable
          onPress={() => router.back()}
          style={({ pressed }) => [
            styles.backButton,
            pressed && { opacity: 0.6 }
          ]}
        >
          <ChevronLeft size={28} color="#1a1a2e" />
        </Pressable>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Title */}
        <Text style={styles.title}>Profile</Text>

        {/* User Profile Section */}
        <View style={styles.profileSection}>
          {/* Avatar */}
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{userInitial}</Text>
          </View>

          {/* User Info */}
          <Text style={styles.userName}>{userName}</Text>
          <Text style={styles.userEmail}>{userEmail}</Text>
          <Text style={styles.subscriptionStatus}>
            Subscription: {isPremium ? 'Active' : 'Inactive'}
          </Text>
        </View>

        {/* Menu Options */}
        <View style={styles.menuCard}>
          {/* Report Content */}
          <Pressable
            style={({ pressed }) => [
              styles.menuItem,
              pressed && styles.menuItemPressed
            ]}
            onPress={() => setShowReportModal(true)}
          >
            <Flag size={20} color="#718096" />
            <Text style={styles.menuItemText}>Report content</Text>
            <ChevronRight size={20} color="#A0AEC0" />
          </Pressable>

          <View style={styles.menuDivider} />

          {/* Manage Subscription */}
          <Pressable
            style={({ pressed }) => [
              styles.menuItem,
              pressed && styles.menuItemPressed
            ]}
            onPress={handleManageSubscription}
          >
            <CreditCard size={20} color="#718096" />
            <Text style={styles.menuItemText}>Manage subscription</Text>
            <ChevronRight size={20} color="#A0AEC0" />
          </Pressable>

          <View style={styles.menuDivider} />

          {/* Give Feedback */}
          <Pressable
            style={({ pressed }) => [
              styles.menuItem,
              pressed && styles.menuItemPressed
            ]}
            onPress={handleGiveFeedback}
          >
            <MessageSquare size={20} color="#718096" />
            <Text style={styles.menuItemText}>Give feedback</Text>
            <ChevronRight size={20} color="#A0AEC0" />
          </Pressable>

          <View style={styles.menuDivider} />

          {/* Sign Out */}
          <Pressable
            style={({ pressed }) => [
              styles.menuItem,
              pressed && styles.menuItemPressed
            ]}
            onPress={handleSignOut}
          >
            <LogOut size={20} color="#F56565" />
            <Text style={[styles.menuItemText, styles.menuItemTextDanger]}>Sign out</Text>
            <ChevronRight size={20} color="#A0AEC0" />
          </Pressable>
        </View>

        {/* Spacer */}
        <View style={styles.spacer} />
      </ScrollView>

      {/* Footer Links */}
      <View style={styles.footer}>
        <Pressable onPress={handlePrivacyPolicy}>
          <Text style={styles.footerLink}>Privacy Policy</Text>
        </Pressable>
        <Text style={styles.footerDot}>•</Text>
        <Pressable onPress={handleTermsOfService}>
          <Text style={styles.footerLink}>Terms and Conditions</Text>
        </Pressable>
      </View>

      {/* Report Modal */}
      <ReportContentModal
        visible={showReportModal}
        onClose={() => setShowReportModal(false)}
      />
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F9FC',
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: '#1a1a2e',
    marginBottom: 24,
  },
  profileSection: {
    marginBottom: 32,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#14B8A6',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatarText: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  userName: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1a1a2e',
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 14,
    color: '#718096',
    marginBottom: 4,
  },
  subscriptionStatus: {
    fontSize: 14,
    color: '#718096',
  },
  menuCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 18,
    paddingHorizontal: 16,
  },
  menuItemPressed: {
    backgroundColor: '#EDF2F7',
  },
  menuItemText: {
    flex: 1,
    fontSize: 16,
    color: '#2D3748',
    marginLeft: 12,
  },
  menuItemTextDanger: {
    color: '#F56565',
  },
  menuDivider: {
    height: 1,
    backgroundColor: '#EDF2F7',
    marginHorizontal: 16,
  },
  spacer: {
    height: 40,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 20,
    paddingBottom: 32,
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
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 360,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1a1a2e',
  },
  modalClose: {
    fontSize: 24,
    color: '#718096',
    padding: 4,
  },
  modalDescription: {
    fontSize: 14,
    color: '#718096',
    marginBottom: 20,
    lineHeight: 20,
  },
  reportOption: {
    backgroundColor: '#F5F9FC',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 20,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  reportOptionPressed: {
    backgroundColor: '#EDF2F7',
  },
  reportOptionText: {
    fontSize: 16,
    color: '#2D3748',
    textAlign: 'center',
  },
})
