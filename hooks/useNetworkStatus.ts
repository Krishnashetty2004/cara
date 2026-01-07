import { useState, useEffect, useCallback, useRef } from 'react'
import { AppState, AppStateStatus } from 'react-native'

export interface NetworkStatus {
  isConnected: boolean
  isLoading: boolean
  lastChecked: number | null
}

/**
 * Hook to monitor network connectivity status
 *
 * Uses a simple fetch-based approach to detect connectivity.
 * Checks connectivity on mount, app foreground, and on demand.
 */
export function useNetworkStatus() {
  const [status, setStatus] = useState<NetworkStatus>({
    isConnected: true, // Assume connected initially
    isLoading: true,
    lastChecked: null,
  })

  const appStateRef = useRef(AppState.currentState)

  // Check connectivity by making a simple fetch request
  const checkConnectivity = useCallback(async (): Promise<boolean> => {
    try {
      // Use a fast, reliable endpoint
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 5000)

      const response = await fetch('https://www.google.com/generate_204', {
        method: 'HEAD',
        signal: controller.signal,
      })

      clearTimeout(timeoutId)
      return response.ok || response.status === 204
    } catch {
      return false
    }
  }, [])

  // Refresh network status
  const refresh = useCallback(async () => {
    setStatus((prev) => ({ ...prev, isLoading: true }))
    const connected = await checkConnectivity()
    setStatus({
      isConnected: connected,
      isLoading: false,
      lastChecked: Date.now(),
    })
    return connected
  }, [checkConnectivity])

  // Check on mount
  useEffect(() => {
    refresh()
  }, [refresh])

  // Check when app comes to foreground
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      if (
        appStateRef.current.match(/inactive|background/) &&
        nextAppState === 'active'
      ) {
        // App came to foreground, check connectivity
        refresh()
      }
      appStateRef.current = nextAppState
    })

    return () => {
      subscription.remove()
    }
  }, [refresh])

  // Periodic check every 30 seconds when app is active
  useEffect(() => {
    const interval = setInterval(() => {
      if (appStateRef.current === 'active') {
        refresh()
      }
    }, 30000)

    return () => clearInterval(interval)
  }, [refresh])

  return {
    ...status,
    canMakeRequests: status.isConnected,
    refresh,
  }
}

/**
 * Simple hook that just returns whether we're online
 */
export function useIsOnline(): boolean {
  const { isConnected } = useNetworkStatus()
  return isConnected
}

export default useNetworkStatus
