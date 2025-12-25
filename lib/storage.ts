import AsyncStorage from '@react-native-async-storage/async-storage'

// Storage keys
export const STORAGE_KEYS = {
  ONBOARDING_COMPLETED: 'onboarding_completed',
  AGE_VERIFIED: 'age_verified',
  USER_PREFERENCES: 'user_preferences',
  NOTIFICATION_SETTINGS: 'notification_settings',
  FIRST_LAUNCH: 'first_launch',
} as const

type StorageKey = (typeof STORAGE_KEYS)[keyof typeof STORAGE_KEYS]

// Generic storage helpers
export async function setItem<T>(key: StorageKey, value: T): Promise<void> {
  try {
    const jsonValue = JSON.stringify(value)
    await AsyncStorage.setItem(key, jsonValue)
  } catch (error) {
    console.error(`Error saving ${key}:`, error)
    throw error
  }
}

export async function getItem<T>(key: StorageKey): Promise<T | null> {
  try {
    const jsonValue = await AsyncStorage.getItem(key)
    return jsonValue != null ? JSON.parse(jsonValue) : null
  } catch (error) {
    console.error(`Error reading ${key}:`, error)
    return null
  }
}

export async function removeItem(key: StorageKey): Promise<void> {
  try {
    await AsyncStorage.removeItem(key)
  } catch (error) {
    console.error(`Error removing ${key}:`, error)
  }
}

export async function clearAll(): Promise<void> {
  try {
    await AsyncStorage.clear()
  } catch (error) {
    console.error('Error clearing storage:', error)
  }
}

// Onboarding helpers
export async function isOnboardingCompleted(): Promise<boolean> {
  const completed = await getItem<boolean>(STORAGE_KEYS.ONBOARDING_COMPLETED)
  return completed === true
}

export async function setOnboardingCompleted(): Promise<void> {
  await setItem(STORAGE_KEYS.ONBOARDING_COMPLETED, true)
}

// Age verification helpers
export async function isAgeVerified(): Promise<boolean> {
  const verified = await getItem<boolean>(STORAGE_KEYS.AGE_VERIFIED)
  return verified === true
}

export async function setAgeVerified(): Promise<void> {
  await setItem(STORAGE_KEYS.AGE_VERIFIED, true)
}

// User preferences
export interface UserPreferences {
  displayName: string
  dailyReminders: boolean
  missYouNotifications: boolean
}

const DEFAULT_PREFERENCES: UserPreferences = {
  displayName: '',
  dailyReminders: true,
  missYouNotifications: true,
}

export async function getUserPreferences(): Promise<UserPreferences> {
  const prefs = await getItem<UserPreferences>(STORAGE_KEYS.USER_PREFERENCES)
  return prefs || DEFAULT_PREFERENCES
}

export async function setUserPreferences(prefs: Partial<UserPreferences>): Promise<void> {
  const current = await getUserPreferences()
  await setItem(STORAGE_KEYS.USER_PREFERENCES, { ...current, ...prefs })
}

// First launch check
export async function isFirstLaunch(): Promise<boolean> {
  const launched = await getItem<boolean>(STORAGE_KEYS.FIRST_LAUNCH)
  if (launched === null) {
    await setItem(STORAGE_KEYS.FIRST_LAUNCH, false)
    return true
  }
  return false
}
