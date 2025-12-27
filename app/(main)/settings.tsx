// app/(main)/settings.tsx
// Profile screen with real user data

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  Linking,
  Alert,
  Switch,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useUser, useClerk } from '@clerk/clerk-expo';
import { Ionicons } from '@expo/vector-icons';
import { useUser as useAppUser } from '@/hooks/useUser';
import {
  requestNotificationPermissions,
  getNotificationSettings,
  updateNotificationSettings,
  sendTestNotification,
  type NotificationSettings,
} from '@/lib/notifications';

export default function SettingsScreen() {
  const router = useRouter();
  const { user } = useUser();
  const { signOut } = useClerk();
  const { isPremium, remainingMinutes } = useAppUser();

  // Notification settings state
  const [notifSettings, setNotifSettings] = useState<NotificationSettings | null>(null);

  useEffect(() => {
    loadNotificationSettings();
  }, []);

  const loadNotificationSettings = async () => {
    const settings = await getNotificationSettings();
    setNotifSettings(settings);
  };

  const handleToggleNotifications = async (enabled: boolean) => {
    if (enabled) {
      const granted = await requestNotificationPermissions();
      if (!granted) {
        Alert.alert(
          'Permission Required',
          'Please enable notifications in your device settings to receive messages from Preethi and Ira.'
        );
        return;
      }
    }
    await updateNotificationSettings({ enabled });
    loadNotificationSettings();
  };

  const handleToggleDailyReminders = async (enabled: boolean) => {
    await updateNotificationSettings({ dailyReminders: enabled });
    loadNotificationSettings();
  };

  const handleToggleMissYou = async (enabled: boolean) => {
    await updateNotificationSettings({ missYouMessages: enabled });
    loadNotificationSettings();
  };

  const handleToggleQuirky = async (enabled: boolean) => {
    await updateNotificationSettings({ quirkyMessages: enabled });
    loadNotificationSettings();
  };

  const handleTestNotification = async () => {
    await sendTestNotification(notifSettings?.preferredCharacter || 'preethi');
    Alert.alert('Test Sent', 'You should receive a notification in 5 seconds!');
  };

  // Real data from hooks
  const plan = isPremium ? 'Premium' : 'Free';
  const minutesLeft = isPremium ? '∞' : remainingMinutes;

  const handleBack = () => {
    router.back();
  };

  const handleUpgrade = () => {
    router.push('/(paywall)/premium');
  };

  const handleFeedback = () => {
    Linking.openURL('https://wa.me/917780185418?text=Cara%20Feedback:%20');
  };

  const handleManageSubscription = () => {
    Linking.openURL('https://wa.me/917780185418?text=Manage%20my%20Cara%20subscription');
  };

  const handleReportContent = () => {
    Linking.openURL('https://wa.me/917780185418?text=Report%20Cara%20content:%20');
  };

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
            await signOut();
            router.replace('/(auth)/login');
          },
        },
      ]
    );
  };

  // Get user initials
  const getInitials = () => {
    if (user?.firstName && user?.lastName) {
      return `${user.firstName[0]}${user.lastName[0]}`.toUpperCase();
    }
    if (user?.firstName) {
      return user.firstName[0].toUpperCase();
    }
    return 'U';
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.backButton}>
          <Ionicons name="chevron-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Profile</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile Card */}
        <View style={styles.profileCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{getInitials()}</Text>
          </View>
          <Text style={styles.userName}>
            {user?.firstName} {user?.lastName}
          </Text>
          <Text style={styles.userEmail}>
            {user?.primaryEmailAddress?.emailAddress}
          </Text>

          {/* Stats Row */}
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{plan}</Text>
              <Text style={styles.statLabel}>Plan</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{minutesLeft}</Text>
              <Text style={styles.statLabel}>Mins left</Text>
            </View>
          </View>
        </View>

        {/* Upgrade Card - MORE VISIBLE */}
        <TouchableOpacity
          style={styles.upgradeCard}
          onPress={handleUpgrade}
          activeOpacity={0.8}
        >
          <View style={styles.upgradeContent}>
            <Text style={styles.upgradeTitle}>Unlock Unlimited</Text>
            <Text style={styles.upgradeSubtitle}>Get unlimited calls for ₹99/week</Text>
          </View>
          <Text style={styles.upgradeArrow}>›</Text>
        </TouchableOpacity>

        {/* Notifications Section */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>NOTIFICATIONS</Text>

          {/* Master Toggle */}
          <View style={styles.toggleItem}>
            <View style={styles.menuContent}>
              <Text style={styles.menuTitle}>Enable Notifications</Text>
              <Text style={styles.menuSubtitle}>Get messages from Preethi & Ira</Text>
            </View>
            <Switch
              value={notifSettings?.enabled ?? false}
              onValueChange={handleToggleNotifications}
              trackColor={{ false: '#E0E0E0', true: '#9B7B8E' }}
              thumbColor={notifSettings?.enabled ? '#FFFFFF' : '#F4F4F4'}
            />
          </View>

          {notifSettings?.enabled && (
            <>
              {/* Daily Reminders */}
              <View style={styles.toggleItem}>
                <View style={styles.menuContent}>
                  <Text style={styles.menuTitle}>Daily Check-ins</Text>
                  <Text style={styles.menuSubtitle}>Morning & evening reminders</Text>
                </View>
                <Switch
                  value={notifSettings?.dailyReminders ?? true}
                  onValueChange={handleToggleDailyReminders}
                  trackColor={{ false: '#E0E0E0', true: '#9B7B8E' }}
                  thumbColor={notifSettings?.dailyReminders ? '#FFFFFF' : '#F4F4F4'}
                />
              </View>

              {/* Miss You Messages */}
              <View style={styles.toggleItem}>
                <View style={styles.menuContent}>
                  <Text style={styles.menuTitle}>Miss You Messages</Text>
                  <Text style={styles.menuSubtitle}>When you haven't called in a while</Text>
                </View>
                <Switch
                  value={notifSettings?.missYouMessages ?? true}
                  onValueChange={handleToggleMissYou}
                  trackColor={{ false: '#E0E0E0', true: '#9B7B8E' }}
                  thumbColor={notifSettings?.missYouMessages ? '#FFFFFF' : '#F4F4F4'}
                />
              </View>

              {/* Quirky Messages */}
              <View style={styles.toggleItem}>
                <View style={styles.menuContent}>
                  <Text style={styles.menuTitle}>Surprise Messages</Text>
                  <Text style={styles.menuSubtitle}>Random quirky notifications</Text>
                </View>
                <Switch
                  value={notifSettings?.quirkyMessages ?? true}
                  onValueChange={handleToggleQuirky}
                  trackColor={{ false: '#E0E0E0', true: '#9B7B8E' }}
                  thumbColor={notifSettings?.quirkyMessages ? '#FFFFFF' : '#F4F4F4'}
                />
              </View>

              {/* Test Notification */}
              <TouchableOpacity
                style={styles.testButton}
                onPress={handleTestNotification}
                activeOpacity={0.7}
              >
                <Text style={styles.testButtonText}>Send Test Notification</Text>
              </TouchableOpacity>
            </>
          )}
        </View>

        {/* Support Section */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>SUPPORT</Text>

          {/* Menu Item - NO ICON */}
          <TouchableOpacity
            style={styles.menuItem}
            onPress={handleFeedback}
            activeOpacity={0.7}
          >
            <View style={styles.menuContent}>
              <Text style={styles.menuTitle}>Give Feedback</Text>
              <Text style={styles.menuSubtitle}>Help us improve Cara</Text>
            </View>
            <Text style={styles.menuArrow}>›</Text>
          </TouchableOpacity>

          {/* Menu Item - NO ICON */}
          <TouchableOpacity
            style={styles.menuItem}
            onPress={handleManageSubscription}
            activeOpacity={0.7}
          >
            <View style={styles.menuContent}>
              <Text style={styles.menuTitle}>Manage Subscription</Text>
              <Text style={styles.menuSubtitle}>Update or cancel your plan</Text>
            </View>
            <Text style={styles.menuArrow}>›</Text>
          </TouchableOpacity>

          {/* Menu Item - NO ICON */}
          <TouchableOpacity
            style={styles.menuItem}
            onPress={handleReportContent}
            activeOpacity={0.7}
          >
            <View style={styles.menuContent}>
              <Text style={styles.menuTitle}>Report Content</Text>
              <Text style={styles.menuSubtitle}>Report inappropriate responses</Text>
            </View>
            <Text style={styles.menuArrow}>›</Text>
          </TouchableOpacity>
        </View>

        {/* Sign Out - SEPARATE SECTION, NOT RED */}
        <View style={styles.signOutSection}>
          <TouchableOpacity
            style={styles.signOutButton}
            onPress={handleSignOut}
            activeOpacity={0.7}
          >
            <Text style={styles.signOutText}>Sign Out</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F8FB',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  headerSpacer: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingBottom: 40,
  },

  // Profile Card
  profileCard: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#9B7B8E',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatarText: {
    fontSize: 28,
    fontWeight: '600',
    color: 'white',
  },
  userName: {
    fontSize: 22,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 14,
    color: '#888',
    marginBottom: 20,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statItem: {
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
  },
  statLabel: {
    fontSize: 13,
    color: '#888',
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 32,
    backgroundColor: '#E0E0E0',
  },

  // Upgrade Card - MORE VISIBLE
  upgradeCard: {
    backgroundColor: '#4A8FD4',
    borderRadius: 16,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 32,
    shadowColor: '#4A8FD4',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  upgradeContent: {
    flex: 1,
  },
  upgradeTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: 'white',
    marginBottom: 4,
  },
  upgradeSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.85)',
  },
  upgradeArrow: {
    fontSize: 28,
    color: 'white',
    fontWeight: '300',
  },

  // Section
  section: {
    marginBottom: 24,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#888',
    letterSpacing: 1,
    marginBottom: 16,
    marginLeft: 4,
  },

  // Menu Item - NO ICON, SEPARATED
  menuItem: {
    backgroundColor: 'white',
    borderRadius: 14,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  toggleItem: {
    backgroundColor: 'white',
    borderRadius: 14,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  testButton: {
    backgroundColor: '#F0EBF0',
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
    marginTop: 4,
  },
  testButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#9B7B8E',
  },
  menuContent: {
    flex: 1,
  },
  menuTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },
  menuSubtitle: {
    fontSize: 13,
    color: '#888',
  },
  menuArrow: {
    fontSize: 24,
    color: '#CCC',
    fontWeight: '300',
  },

  // Sign Out - NOT RED, SEPARATE
  signOutSection: {
    marginTop: 16,
    paddingTop: 16,
  },
  signOutButton: {
    backgroundColor: 'white',
    borderRadius: 14,
    padding: 18,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  signOutText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#4A8FD4',
  },
});
