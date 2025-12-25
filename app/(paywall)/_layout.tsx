import { Stack } from 'expo-router'

export default function PaywallLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        presentation: 'modal',
      }}
    >
      <Stack.Screen name="premium" />
    </Stack>
  )
}
