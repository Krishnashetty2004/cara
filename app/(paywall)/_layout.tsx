import { Stack } from 'expo-router'

export default function PaywallLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        presentation: 'transparentModal',
        animation: 'fade_from_bottom',
        animationDuration: 300,
      }}
    >
      <Stack.Screen name="premium" />
    </Stack>
  )
}
