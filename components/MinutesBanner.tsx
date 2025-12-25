import { Pressable, Text } from 'react-native'

interface MinutesBannerProps {
  remainingMinutes: number
  onPress: () => void
}

export function MinutesBanner({ remainingMinutes, onPress }: MinutesBannerProps) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        {
          backgroundColor: 'rgba(96, 165, 250, 0.15)',
          paddingHorizontal: 20,
          paddingVertical: 12,
          borderRadius: 20,
          borderWidth: 1,
          borderColor: 'rgba(96, 165, 250, 0.3)',
          opacity: pressed ? 0.8 : 1,
        },
      ]}
    >
      <Text
        style={{
          color: '#60A5FA',
          fontSize: 14,
          fontWeight: '500',
        }}
      >
        {remainingMinutes} mins left today • Go Unlimited
      </Text>
    </Pressable>
  )
}
