import { Stack } from 'expo-router'

export default function MainLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="home" />
      <Stack.Screen
        name="call"
        options={{
          gestureEnabled: false, // Prevent accidental swipe back during call
        }}
      />
      <Stack.Screen name="settings" />
    </Stack>
  )
}
