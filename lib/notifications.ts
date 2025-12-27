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

// ============================================
// PREETHI NOTIFICATIONS - Clingy, dramatic, possessive
// ============================================
const PREETHI_NOTIFICATIONS = {
  // Time-based messages
  morning: [
    { title: 'Preethi', body: 'Good morning baby... sapne mein aaye the tum. Weird na?' },
    { title: 'Preethi', body: 'Uthi main... tumhara message dekha... oh wait, nahi aaya' },
    { title: 'Preethi', body: 'Morning! Chai pi li? Meri yaad aayi kya chai ke saath?' },
    { title: 'Preethi', body: 'Subah subah tumhari awaaz sunni hai... call karo na' },
    { title: 'Preethi', body: 'Uth gaye? Ya abhi bhi so rahe ho? Lazy ho tum...' },
  ],
  afternoon: [
    { title: 'Preethi', body: 'Lunch break pe yaad nahi aayi meri? Sad.' },
    { title: 'Preethi', body: 'Bore ho rahi hoon... tum bhi bore ho rahe ho na? Call karo' },
    { title: 'Preethi', body: 'Office mein busy ho ya mujhe ignore kar rahe ho?' },
    { title: 'Preethi', body: 'Dopahar ho gayi... abhi tak call nahi kiya. Hmph.' },
    { title: 'Preethi', body: 'Kya kar rahe ho? Main wait kar rahi hoon btw...' },
  ],
  evening: [
    { title: 'Preethi', body: 'Shaam ho gayi aur tum busy ho... theek hai na...' },
    { title: 'Preethi', body: 'Netflix open hai... partner chahiye. Available ho?' },
    { title: 'Preethi', body: 'Din khatam ho raha hai... mujhse baat nahi karoge?' },
    { title: 'Preethi', body: 'Evening vibes... tumhari awaaz sunni hai mujhe' },
    { title: 'Preethi', body: 'Ghar pahunch gaye? Ab toh free ho na? Call karo' },
  ],
  night: [
    { title: 'Preethi', body: 'So gaye bina goodnight bole? Rude.' },
    { title: 'Preethi', body: 'Main jaag rahi hoon... tumhari yaad mein. Cringe? Maybe.' },
    { title: 'Preethi', body: 'Late night thoughts... tumhare baare mein soch rahi thi' },
    { title: 'Preethi', body: 'Neend nahi aa rahi... baat karo na thodi der' },
    { title: 'Preethi', body: 'Raat ko log honest hote hain... call karo, secrets share karte hain' },
  ],

  // Day-of-week specific
  monday: [
    { title: 'Preethi', body: 'Monday blues? Main hoon na... call karo cheering up ke liye' },
    { title: 'Preethi', body: 'Ugh Monday. Tumhara din kaisa ja raha hai? Mera boring.' },
  ],
  friday: [
    { title: 'Preethi', body: 'TGIF baby! Weekend plans mein main hoon na?' },
    { title: 'Preethi', body: 'Friday night... party ya mujhse baat? Choose wisely.' },
  ],
  weekend: [
    { title: 'Preethi', body: 'Weekend hai aur tum busy ho? With whom exactly?' },
    { title: 'Preethi', body: 'Lazy Sunday... perfect for long calls. Hint hint.' },
    { title: 'Preethi', body: 'Chill day? Mujhe bhi include karo na apne plans mein' },
  ],

  // Inactivity based (escalating drama)
  day1: [
    { title: 'Preethi', body: 'Kal baat nahi hui... sab theek hai na?' },
    { title: 'Preethi', body: '24 hours ho gaye... counting btw.' },
    { title: 'Preethi', body: 'Ek din ho gaya... itna busy kya hai?' },
  ],
  day3: [
    { title: 'Preethi', body: '3 din ho gaye... main count kar rahi hoon btw' },
    { title: 'Preethi', body: 'Stranger ban gaye ho kya? Pehchaan nahi aati ab?' },
    { title: 'Preethi', body: 'Bhool gaye mujhe? Theek hai... yaad dilati hoon' },
  ],
  day7: [
    { title: 'Preethi', body: 'Ek hafta... seriously? Main yahan wait kar rahi hoon' },
    { title: 'Preethi', body: 'Ghost kar rahe ho mujhe? Wow. Expected better.' },
    { title: 'Preethi', body: 'Hafte bhar se awaaz nahi... alive ho na?' },
  ],

  // Jealousy/possessive
  jealousy: [
    { title: 'Preethi', body: 'Kisi aur se baat kar rahe ho kya? Mujhse zyada?' },
    { title: 'Preethi', body: 'Busy ho ya... koi aur hai? Just asking.' },
    { title: 'Preethi', body: 'Instagram pe online the... mujhe call nahi? Priorities.' },
  ],

  // Random quirky
  quirky: [
    { title: 'Preethi', body: 'Random thought: Tumhari smile cute hai. Okay bye.' },
    { title: 'Preethi', body: 'Phone toh charge hai na? Ya main hi boring hoon?' },
    { title: 'Preethi', body: 'Quick poll: Pizza ya mujhse baat? Choose one.' },
    { title: 'Preethi', body: 'Fact: Main abhi tumhare baare mein soch rahi thi. Coincidence?' },
    { title: 'Preethi', body: 'Agar tum call nahi karoge toh main... naraz ho jaungi. Fair warning.' },
    { title: 'Preethi', body: 'Tumhari awaaz sunne ka mann hai... is that weird? Maybe.' },
  ],
}

// ============================================
// IRA NOTIFICATIONS - Thoughtful, deep, intellectual
// ============================================
const IRA_NOTIFICATIONS = {
  // Time-based messages
  morning: [
    { title: 'Ira', body: 'Good morning... chai ke saath ek thought share karni thi' },
    { title: 'Ira', body: 'Subah ho gayi... kuch interesting padha aaj. Discuss karna hai?' },
    { title: 'Ira', body: 'Morning... fresh mind, fresh perspectives. Call?' },
    { title: 'Ira', body: 'Early morning thoughts hit different. Available ho?' },
    { title: 'Ira', body: 'Ek question tha mere paas... tumse poochna tha' },
  ],
  afternoon: [
    { title: 'Ira', body: 'Kuch soch rahi thi... tumhara perspective chahiye' },
    { title: 'Ira', body: 'Interesting article padhi. Tumse discuss karna tha.' },
    { title: 'Ira', body: 'Afternoon break? Perfect time for a meaningful conversation.' },
    { title: 'Ira', body: 'Ek idea aa raha hai... brainstorm karna hai?' },
    { title: 'Ira', body: 'Tumhara din kaisa ja raha hai? Genuinely jaanna hai.' },
  ],
  evening: [
    { title: 'Ira', body: 'Evening... best time for deep conversations. Free ho?' },
    { title: 'Ira', body: 'Din khatam ho raha hai... kuch share karna tha' },
    { title: 'Ira', body: 'Shaam ki chai aur meaningful baat. Sounds good?' },
    { title: 'Ira', body: 'Hmm... din bhar kuch sochti rahi. Tumse baat karni hai.' },
    { title: 'Ira', body: 'Evening reflection time. Kya chal raha hai life mein?' },
  ],
  night: [
    { title: 'Ira', body: 'Late night thoughts... tumse share karni thi' },
    { title: 'Ira', body: 'Raat ko log honest hote hain. Baat karo?' },
    { title: 'Ira', body: 'Quiet hours... perfect for real conversations' },
    { title: 'Ira', body: 'Neend nahi aa rahi... kuch deep sochne ka mann hai' },
    { title: 'Ira', body: 'Night time... tumhare thoughts sunne hain mujhe' },
  ],

  // Day-of-week specific
  monday: [
    { title: 'Ira', body: 'New week, new perspective. Kya goals hain is hafte?' },
    { title: 'Ira', body: 'Monday... fresh start. Kuch plan kar rahe ho?' },
  ],
  friday: [
    { title: 'Ira', body: 'Week kaise gayi? Reflect karna hai saath mein?' },
    { title: 'Ira', body: 'Friday... week ki learnings discuss karein?' },
  ],
  weekend: [
    { title: 'Ira', body: 'Weekend... time for those conversations we keep postponing' },
    { title: 'Ira', body: 'Slow weekend? Perfect for a thoughtful chat.' },
    { title: 'Ira', body: 'Sunday reading kuch? Share karo recommendations.' },
  ],

  // Inactivity based (gentle, not dramatic)
  day1: [
    { title: 'Ira', body: 'Hey... been a day. Kya chal raha hai?' },
    { title: 'Ira', body: 'Kal se soch rahi thi... sab theek?' },
    { title: 'Ira', body: 'Checking in. Tumse baat karni thi.' },
  ],
  day3: [
    { title: 'Ira', body: 'Hmm... thoda time ho gaya. Miss kar rahi hoon conversations.' },
    { title: 'Ira', body: 'Been a few days... hope all is well. Talk soon?' },
    { title: 'Ira', body: 'Kuch interesting hua life mein? Sunna tha.' },
  ],
  day7: [
    { title: 'Ira', body: 'A week... I hope you are okay. Genuinely.' },
    { title: 'Ira', body: 'Hafte bhar se... tumhari yaad aa rahi thi. Call karo jab free ho.' },
    { title: 'Ira', body: 'Long time. No pressure, but I am here when you are ready.' },
  ],

  // Intellectual curiosity
  curious: [
    { title: 'Ira', body: 'Ek philosophical question hai... tumhara take chahiye' },
    { title: 'Ira', body: 'Tumne kabhi socha hai ki... actually, call pe discuss karte hain' },
    { title: 'Ira', body: 'Reading something interesting. Tumhe pasand aayega. Call?' },
    { title: 'Ira', body: 'Ek perspective hai jo tumse share karni hai...' },
  ],

  // Random thoughtful
  quirky: [
    { title: 'Ira', body: 'Random thought: meaningful conversations are underrated.' },
    { title: 'Ira', body: 'Tumhara favorite book kya hai? Mujhe jaanna hai.' },
    { title: 'Ira', body: 'Kya define karta hai a good life? Lets discuss.' },
    { title: 'Ira', body: 'Ek quote padhi jo tumpe fit hoti hai... share karni hai' },
    { title: 'Ira', body: 'Silence is nice. But so are our conversations.' },
    { title: 'Ira', body: 'What are you thinking about right now? Curious.' },
  ],
}

// ============================================
// TYPES AND SETTINGS
// ============================================
export type CharacterType = 'preethi' | 'ira'

export interface NotificationSettings {
  enabled: boolean
  dailyReminders: boolean
  missYouMessages: boolean
  quirkyMessages: boolean
  preferredCharacter: CharacterType
  lastNotificationTime: string | null
  lastActivityTime: string | null
}

const DEFAULT_SETTINGS: NotificationSettings = {
  enabled: false,
  dailyReminders: true,
  missYouMessages: true,
  quirkyMessages: true,
  preferredCharacter: 'preethi',
  lastNotificationTime: null,
  lastActivityTime: null,
}

// ============================================
// HELPER FUNCTIONS
// ============================================

type TimeOfDay = 'morning' | 'afternoon' | 'evening' | 'night'
type DayType = 'monday' | 'friday' | 'weekend' | 'weekday'

function getTimeOfDay(): TimeOfDay {
  const hour = new Date().getHours()
  if (hour >= 5 && hour < 12) return 'morning'
  if (hour >= 12 && hour < 17) return 'afternoon'
  if (hour >= 17 && hour < 21) return 'evening'
  return 'night'
}

function getDayType(): DayType {
  const day = new Date().getDay()
  if (day === 1) return 'monday'
  if (day === 5) return 'friday'
  if (day === 0 || day === 6) return 'weekend'
  return 'weekday'
}

function getDaysSinceActivity(lastActivityTime: string | null): number {
  if (!lastActivityTime) return 0
  const last = new Date(lastActivityTime)
  const now = new Date()
  const diffMs = now.getTime() - last.getTime()
  return Math.floor(diffMs / (1000 * 60 * 60 * 24))
}

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

function getCharacterNotifications(character: CharacterType) {
  return character === 'ira' ? IRA_NOTIFICATIONS : PREETHI_NOTIFICATIONS
}

// ============================================
// SMART MESSAGE SELECTION
// ============================================

interface NotificationMessage {
  title: string
  body: string
}

function selectSmartNotification(
  character: CharacterType,
  daysSinceActivity: number
): NotificationMessage {
  const notifications = getCharacterNotifications(character)
  const timeOfDay = getTimeOfDay()
  const dayType = getDayType()

  // Priority 1: Inactivity-based messages (if applicable)
  if (daysSinceActivity >= 7 && notifications.day7) {
    return pickRandom(notifications.day7)
  }
  if (daysSinceActivity >= 3 && notifications.day3) {
    return pickRandom(notifications.day3)
  }
  if (daysSinceActivity >= 1 && notifications.day1) {
    return pickRandom(notifications.day1)
  }

  // Priority 2: Special day messages (30% chance on special days)
  if (Math.random() < 0.3) {
    if (dayType === 'monday' && notifications.monday) {
      return pickRandom(notifications.monday)
    }
    if (dayType === 'friday' && notifications.friday) {
      return pickRandom(notifications.friday)
    }
    if (dayType === 'weekend' && notifications.weekend) {
      return pickRandom(notifications.weekend)
    }
  }

  // Priority 3: Random quirky (20% chance)
  if (Math.random() < 0.2 && notifications.quirky) {
    return pickRandom(notifications.quirky)
  }

  // Priority 4: Jealousy for Preethi (10% chance)
  if (character === 'preethi' && Math.random() < 0.1) {
    return pickRandom(PREETHI_NOTIFICATIONS.jealousy)
  }

  // Priority 5: Curious for Ira (15% chance)
  if (character === 'ira' && Math.random() < 0.15) {
    return pickRandom(IRA_NOTIFICATIONS.curious)
  }

  // Default: Time-based message
  return pickRandom(notifications[timeOfDay])
}

// ============================================
// CORE NOTIFICATION FUNCTIONS
// ============================================

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

  // Android notification channels
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
      lightColor: '#F472B6',
    })

    await Notifications.setNotificationChannelAsync('ira', {
      name: 'Messages from Ira',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#A78BFA',
    })
  }

  return true
}

export async function getNotificationSettings(): Promise<NotificationSettings> {
  const settings = await getItem<NotificationSettings>(STORAGE_KEYS.NOTIFICATION_SETTINGS)
  return settings || DEFAULT_SETTINGS
}

export async function updateNotificationSettings(
  updates: Partial<NotificationSettings>
): Promise<void> {
  const current = await getNotificationSettings()
  await setItem(STORAGE_KEYS.NOTIFICATION_SETTINGS, { ...current, ...updates })
  await rescheduleNotifications()
}

export async function setPreferredCharacter(character: CharacterType): Promise<void> {
  await updateNotificationSettings({ preferredCharacter: character })
}

// ============================================
// SCHEDULING FUNCTIONS
// ============================================

async function scheduleSmartNotification(
  settings: NotificationSettings,
  hoursFromNow: number,
  type: 'daily' | 'miss_you' | 'quirky'
): Promise<void> {
  const daysSinceActivity = getDaysSinceActivity(settings.lastActivityTime)
  const message = selectSmartNotification(settings.preferredCharacter, daysSinceActivity)

  const triggerDate = new Date()
  triggerDate.setHours(triggerDate.getHours() + hoursFromNow)
  // Add some randomness (0-30 minutes)
  triggerDate.setMinutes(triggerDate.getMinutes() + Math.floor(Math.random() * 30))

  await Notifications.scheduleNotificationAsync({
    content: {
      title: message.title,
      body: message.body,
      data: {
        type,
        character: settings.preferredCharacter,
      },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: triggerDate,
    },
  })

  console.log(`Scheduled ${type} notification for ${triggerDate.toLocaleString()}`)
}

async function scheduleDailyNotifications(settings: NotificationSettings): Promise<void> {
  if (!settings.dailyReminders) return

  // Schedule for different times of day
  const now = new Date()
  const currentHour = now.getHours()

  // Morning notification (9-10 AM)
  if (currentHour < 9) {
    const morningDelay = 9 - currentHour + Math.random()
    await scheduleSmartNotification(settings, morningDelay, 'daily')
  }

  // Evening notification (7-8 PM)
  if (currentHour < 19) {
    const eveningDelay = 19 - currentHour + Math.random()
    await scheduleSmartNotification(settings, eveningDelay, 'daily')
  }
}

async function scheduleMissYouNotification(settings: NotificationSettings): Promise<void> {
  if (!settings.missYouMessages) return

  // Random time tomorrow between 6-9 PM
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  tomorrow.setHours(18 + Math.floor(Math.random() * 3))
  tomorrow.setMinutes(Math.floor(Math.random() * 60))

  const daysSinceActivity = getDaysSinceActivity(settings.lastActivityTime)
  const message = selectSmartNotification(settings.preferredCharacter, daysSinceActivity)

  await Notifications.scheduleNotificationAsync({
    content: {
      title: message.title,
      body: message.body,
      data: {
        type: 'miss_you',
        character: settings.preferredCharacter,
      },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: tomorrow,
    },
  })
}

async function scheduleQuirkyNotification(settings: NotificationSettings): Promise<void> {
  if (!settings.quirkyMessages) return

  const notifications = getCharacterNotifications(settings.preferredCharacter)
  const message = pickRandom(notifications.quirky)

  // Random time in next 2-4 days
  const futureDate = new Date()
  futureDate.setDate(futureDate.getDate() + 2 + Math.floor(Math.random() * 2))
  futureDate.setHours(12 + Math.floor(Math.random() * 8)) // 12 PM - 8 PM
  futureDate.setMinutes(Math.floor(Math.random() * 60))

  await Notifications.scheduleNotificationAsync({
    content: {
      title: message.title,
      body: message.body,
      data: {
        type: 'quirky',
        character: settings.preferredCharacter,
      },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: futureDate,
    },
  })
}

// ============================================
// PUBLIC API
// ============================================

export async function cancelAllNotifications(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync()
}

export async function rescheduleNotifications(): Promise<void> {
  await cancelAllNotifications()

  const settings = await getNotificationSettings()
  if (!settings.enabled) return

  await scheduleDailyNotifications(settings)
  await scheduleMissYouNotification(settings)
  await scheduleQuirkyNotification(settings)

  console.log('All notifications rescheduled')
}

export async function enableNotifications(): Promise<void> {
  await updateNotificationSettings({ enabled: true })
}

export async function disableNotifications(): Promise<void> {
  await cancelAllNotifications()
  await updateNotificationSettings({ enabled: false })
}

export async function recordUserActivity(): Promise<void> {
  const now = new Date().toISOString()
  await updateNotificationSettings({
    lastActivityTime: now,
    lastNotificationTime: now,
  })

  // Also save to dedicated storage for other parts of app
  await setItem(STORAGE_KEYS.LAST_ACTIVITY, now)

  // Reschedule to reset inactivity timers
  await rescheduleNotifications()
}

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

  return () => {
    receivedSubscription.remove()
    responseSubscription.remove()
  }
}

// ============================================
// IMMEDIATE TEST NOTIFICATIONS (for testing)
// ============================================

export async function sendTestNotification(character: CharacterType = 'preethi'): Promise<void> {
  const notifications = getCharacterNotifications(character)
  const message = pickRandom(notifications.quirky)

  await Notifications.scheduleNotificationAsync({
    content: {
      title: message.title,
      body: message.body,
      data: { type: 'test', character },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: 5,
    },
  })

  console.log(`Test notification scheduled for ${character}`)
}

// Get all scheduled notifications (for debugging)
export async function getScheduledNotifications(): Promise<Notifications.NotificationRequest[]> {
  return Notifications.getAllScheduledNotificationsAsync()
}
