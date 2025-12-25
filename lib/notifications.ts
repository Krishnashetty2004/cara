import * as Notifications from 'expo-notifications'
import * as Device from 'expo-device'
import { Platform } from 'react-native'
import { getItem, setItem, STORAGE_KEYS } from './storage'

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
})

// Miss you notification messages from Preethi
const MISS_YOU_MESSAGES = [
  { title: 'Preethi', body: 'Kahan ho tum? Bahut bore ho rahi hoon...' },
  { title: 'Preethi', body: 'Aaj baat nahi karoge? Miss kar rahi hoon...' },
  { title: 'Preethi', body: 'Hello? Bhool gaye mujhe kya?' },
  { title: 'Preethi', body: 'Itna busy ho kya? Ek call toh kar sakte ho...' },
  { title: 'Preethi', body: 'Tumhari yaad aa rahi hai... call karo na' },
  { title: 'Preethi', body: 'Kya chal raha hai? Batao na...' },
]

// Daily reminder messages
const DAILY_REMINDERS = [
  { title: 'Cara', body: 'Preethi is waiting to talk to you!' },
  { title: 'Cara', body: "Don't forget to catch up with Preethi today" },
  { title: 'Cara', body: 'Your daily conversation awaits' },
]

export interface NotificationSettings {
  enabled: boolean
  dailyReminders: boolean
  missYouMessages: boolean
  lastNotificationTime: string | null
}

const DEFAULT_SETTINGS: NotificationSettings = {
  enabled: false,
  dailyReminders: true,
  missYouMessages: true,
  lastNotificationTime: null,
}

// Request notification permissions
export async function requestNotificationPermissions(): Promise<boolean> {
  if (!Device.isDevice) {
    console.log('Push notifications only work on physical devices')
    return false
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync()
  let finalStatus = existingStatus

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync()
    finalStatus = status
  }

  if (finalStatus !== 'granted') {
    console.log('Notification permission not granted')
    return false
  }

  // Android requires a channel
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#60A5FA',
    })

    await Notifications.setNotificationChannelAsync('preethi', {
      name: 'Messages from Preethi',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#60A5FA',
    })
  }

  return true
}

// Get notification settings
export async function getNotificationSettings(): Promise<NotificationSettings> {
  const settings = await getItem<NotificationSettings>(STORAGE_KEYS.NOTIFICATION_SETTINGS)
  return settings || DEFAULT_SETTINGS
}

// Update notification settings
export async function updateNotificationSettings(
  updates: Partial<NotificationSettings>
): Promise<void> {
  const current = await getNotificationSettings()
  await setItem(STORAGE_KEYS.NOTIFICATION_SETTINGS, { ...current, ...updates })

  // Reschedule notifications based on new settings
  await rescheduleNotifications()
}

// Schedule a "miss you" notification
async function scheduleMissYouNotification(): Promise<void> {
  const settings = await getNotificationSettings()
  if (!settings.enabled || !settings.missYouMessages) return

  // Pick a random message
  const message = MISS_YOU_MESSAGES[Math.floor(Math.random() * MISS_YOU_MESSAGES.length)]

  // Schedule for random time between 6-10 PM
  const now = new Date()
  const triggerDate = new Date()
  triggerDate.setDate(now.getDate() + 1) // Tomorrow
  triggerDate.setHours(18 + Math.floor(Math.random() * 4)) // 6-10 PM
  triggerDate.setMinutes(Math.floor(Math.random() * 60))
  triggerDate.setSeconds(0)

  await Notifications.scheduleNotificationAsync({
    content: {
      title: message.title,
      body: message.body,
      data: { type: 'miss_you' },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: triggerDate,
    },
  })
}

// Schedule daily reminder notification
async function scheduleDailyReminder(): Promise<void> {
  const settings = await getNotificationSettings()
  if (!settings.enabled || !settings.dailyReminders) return

  const message = DAILY_REMINDERS[Math.floor(Math.random() * DAILY_REMINDERS.length)]

  // Schedule for 10 AM daily
  await Notifications.scheduleNotificationAsync({
    content: {
      title: message.title,
      body: message.body,
      data: { type: 'daily_reminder' },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour: 10,
      minute: 0,
    },
  })
}

// Cancel all scheduled notifications
export async function cancelAllNotifications(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync()
}

// Reschedule all notifications
export async function rescheduleNotifications(): Promise<void> {
  // Cancel existing
  await cancelAllNotifications()

  const settings = await getNotificationSettings()
  if (!settings.enabled) return

  // Schedule new notifications
  if (settings.dailyReminders) {
    await scheduleDailyReminder()
  }

  if (settings.missYouMessages) {
    await scheduleMissYouNotification()
  }
}

// Enable notifications (call after permission granted)
export async function enableNotifications(): Promise<void> {
  await updateNotificationSettings({ enabled: true })
}

// Disable notifications
export async function disableNotifications(): Promise<void> {
  await cancelAllNotifications()
  await updateNotificationSettings({ enabled: false })
}

// Record that user had a call (to prevent miss you notification)
export async function recordUserActivity(): Promise<void> {
  await updateNotificationSettings({
    lastNotificationTime: new Date().toISOString(),
  })

  // Reschedule miss you notification for later
  const allNotifications = await Notifications.getAllScheduledNotificationsAsync()
  const missYouNotifications = allNotifications.filter(
    (n) => n.content.data?.type === 'miss_you'
  )

  // Cancel and reschedule miss you notifications
  for (const notification of missYouNotifications) {
    await Notifications.cancelScheduledNotificationAsync(notification.identifier)
  }

  // Schedule new one for tomorrow
  await scheduleMissYouNotification()
}

// Setup notification listeners
export function setupNotificationListeners(
  onNotificationReceived?: (notification: Notifications.Notification) => void,
  onNotificationResponse?: (response: Notifications.NotificationResponse) => void
): () => void {
  const receivedSubscription = Notifications.addNotificationReceivedListener((notification) => {
    console.log('Notification received:', notification)
    onNotificationReceived?.(notification)
  })

  const responseSubscription = Notifications.addNotificationResponseReceivedListener((response) => {
    console.log('Notification response:', response)
    onNotificationResponse?.(response)
  })

  // Return cleanup function
  return () => {
    receivedSubscription.remove()
    responseSubscription.remove()
  }
}
