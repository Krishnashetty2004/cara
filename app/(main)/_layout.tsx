import { Stack } from 'expo-router'

export default function MainLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
        animationDuration: 250,
      }}
    >
      <Stack.Screen name="home" />
      <Stack.Screen
        name="call"
        options={{
          gestureEnabled: false,
          animation: 'fade',
          animationDuration: 300,
        }}
      />
      <Stack.Screen
        name="settings"
        options={{
          animation: 'slide_from_right',
        }}
      />
    </Stack>
  )
}
