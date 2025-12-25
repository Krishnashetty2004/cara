import { useEffect } from 'react'
import * as WebBrowser from 'expo-web-browser'

export function useWarmUpBrowser() {
  useEffect(() => {
    // Warm up the browser for faster OAuth flow
    void WebBrowser.warmUpAsync()

    return () => {
      // Clean up on unmount
      void WebBrowser.coolDownAsync()
    }
  }, [])
}
