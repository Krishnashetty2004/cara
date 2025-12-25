import { View, Image, ImageSourcePropType, Animated } from 'react-native'
import { useEffect, useRef } from 'react'

interface CallingAnimationProps {
  source: ImageSourcePropType
  size?: number
  isAnimating?: boolean
}

export function CallingAnimation({
  source,
  size = 150,
  isAnimating = true,
}: CallingAnimationProps) {
  const scaleAnim = useRef(new Animated.Value(1)).current
  const ringScaleAnim = useRef(new Animated.Value(1)).current
  const ringOpacityAnim = useRef(new Animated.Value(0.5)).current

  useEffect(() => {
    if (isAnimating) {
      // Avatar pulse
      Animated.loop(
        Animated.sequence([
          Animated.timing(scaleAnim, {
            toValue: 1.05,
            duration: 600,
            useNativeDriver: true,
          }),
          Animated.timing(scaleAnim, {
            toValue: 1,
            duration: 600,
            useNativeDriver: true,
          }),
        ])
      ).start()

      // Ring pulse
      Animated.loop(
        Animated.parallel([
          Animated.timing(ringScaleAnim, {
            toValue: 1.4,
            duration: 1200,
            useNativeDriver: true,
          }),
          Animated.timing(ringOpacityAnim, {
            toValue: 0,
            duration: 1200,
            useNativeDriver: true,
          }),
        ])
      ).start()
    } else {
      scaleAnim.setValue(1)
      ringScaleAnim.setValue(1)
      ringOpacityAnim.setValue(0)
    }
  }, [isAnimating])

  return (
    <View
      style={{
        width: size * 1.5,
        height: size * 1.5,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {/* Pulse ring */}
      <Animated.View
        style={{
          position: 'absolute',
          width: size,
          height: size,
          borderRadius: size / 2,
          borderWidth: 2,
          borderColor: '#60A5FA',
          transform: [{ scale: ringScaleAnim }],
          opacity: ringOpacityAnim,
        }}
      />

      {/* Avatar */}
      <Animated.View
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
          borderWidth: 3,
          borderColor: '#333',
          overflow: 'hidden',
          transform: [{ scale: scaleAnim }],
        }}
      >
        <Image
          source={source}
          style={{
            width: '100%',
            height: '100%',
          }}
          resizeMode="cover"
        />
      </Animated.View>
    </View>
  )
}
