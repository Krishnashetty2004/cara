import { Pressable, Text, View, Animated } from 'react-native'
import { Mic } from 'lucide-react-native'
import { useEffect, useRef } from 'react'

interface PushToTalkProps {
  isRecording: boolean
  isDisabled: boolean
  onPressIn: () => void
  onPressOut: () => void
}

export function PushToTalk({
  isRecording,
  isDisabled,
  onPressIn,
  onPressOut,
}: PushToTalkProps) {
  const pulseAnim = useRef(new Animated.Value(1)).current

  useEffect(() => {
    if (isRecording) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.2,
            duration: 500,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
          }),
        ])
      ).start()
    } else {
      pulseAnim.setValue(1)
    }
  }, [isRecording])

  return (
    <View style={{ alignItems: 'center' }}>
      <Pressable
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        disabled={isDisabled}
        style={({ pressed }) => [
          {
            opacity: isDisabled ? 0.5 : pressed ? 0.8 : 1,
          },
        ]}
      >
        <View
          style={{
            alignItems: 'center',
            justifyContent: 'center',
            width: 100,
            height: 100,
          }}
        >
          {/* Pulse ring when recording */}
          {isRecording && (
            <Animated.View
              style={{
                position: 'absolute',
                width: 80,
                height: 80,
                borderRadius: 40,
                backgroundColor: 'rgba(255, 107, 107, 0.3)',
                transform: [{ scale: pulseAnim }],
              }}
            />
          )}

          {/* Main button */}
          <View
            style={{
              width: 70,
              height: 70,
              borderRadius: 35,
              backgroundColor: isRecording ? '#ff6b6b' : 'rgba(255, 255, 255, 0.1)',
              alignItems: 'center',
              justifyContent: 'center',
              borderWidth: 2,
              borderColor: isRecording ? '#ff6b6b' : 'rgba(255, 255, 255, 0.2)',
            }}
          >
            <Mic
              color={isRecording ? '#fff' : '#888'}
              size={28}
            />
          </View>
        </View>
      </Pressable>

      <Text
        style={{
          color: isRecording ? '#ff6b6b' : '#888',
          fontSize: 14,
          marginTop: 8,
        }}
      >
        {isRecording ? 'Listening...' : 'Hold to talk'}
      </Text>
    </View>
  )
}
