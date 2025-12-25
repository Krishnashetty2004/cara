import { Pressable, View, Animated } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { Phone } from 'lucide-react-native'
import { useEffect, useRef } from 'react'

interface CallButtonProps {
  onPress: () => void
  disabled?: boolean
}

export function CallButton({ onPress, disabled = false }: CallButtonProps) {
  const ring1Scale = useRef(new Animated.Value(1)).current
  const ring1Opacity = useRef(new Animated.Value(0.3)).current
  const ring2Scale = useRef(new Animated.Value(1)).current
  const ring2Opacity = useRef(new Animated.Value(0.15)).current

  useEffect(() => {
    // Ring 1 animation
    Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(ring1Scale, {
            toValue: 1.4,
            duration: 1200,
            useNativeDriver: true,
          }),
          Animated.timing(ring1Opacity, {
            toValue: 0,
            duration: 1200,
            useNativeDriver: true,
          }),
        ]),
        Animated.parallel([
          Animated.timing(ring1Scale, {
            toValue: 1,
            duration: 0,
            useNativeDriver: true,
          }),
          Animated.timing(ring1Opacity, {
            toValue: 0.3,
            duration: 0,
            useNativeDriver: true,
          }),
        ]),
      ])
    ).start()

    // Ring 2 animation (delayed)
    setTimeout(() => {
      Animated.loop(
        Animated.sequence([
          Animated.parallel([
            Animated.timing(ring2Scale, {
              toValue: 1.6,
              duration: 1200,
              useNativeDriver: true,
            }),
            Animated.timing(ring2Opacity, {
              toValue: 0,
              duration: 1200,
              useNativeDriver: true,
            }),
          ]),
          Animated.parallel([
            Animated.timing(ring2Scale, {
              toValue: 1,
              duration: 0,
              useNativeDriver: true,
            }),
            Animated.timing(ring2Opacity, {
              toValue: 0.15,
              duration: 0,
              useNativeDriver: true,
            }),
          ]),
        ])
      ).start()
    }, 400)
  }, [])

  return (
    <View style={{ width: 100, height: 100, alignItems: 'center', justifyContent: 'center' }}>
      {/* Outer pulse ring 2 */}
      <Animated.View
        style={{
          position: 'absolute',
          width: 80,
          height: 80,
          borderRadius: 40,
          backgroundColor: '#3B82F6',
          transform: [{ scale: ring2Scale }],
          opacity: ring2Opacity,
        }}
      />

      {/* Outer pulse ring 1 */}
      <Animated.View
        style={{
          position: 'absolute',
          width: 80,
          height: 80,
          borderRadius: 40,
          backgroundColor: '#3B82F6',
          transform: [{ scale: ring1Scale }],
          opacity: ring1Opacity,
        }}
      />

      {/* Main button */}
      <Pressable
        onPress={onPress}
        disabled={disabled}
        style={({ pressed }) => [
          {
            opacity: pressed || disabled ? 0.8 : 1,
            transform: [{ scale: pressed ? 0.95 : 1 }],
          },
        ]}
      >
        <LinearGradient
          colors={['#60A5FA', '#3B82F6']}
          style={{
            width: 70,
            height: 70,
            borderRadius: 35,
            alignItems: 'center',
            justifyContent: 'center',
            shadowColor: '#3B82F6',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.3,
            shadowRadius: 8,
            elevation: 6,
          }}
        >
          <Phone color="#fff" size={28} />
        </LinearGradient>
      </Pressable>
    </View>
  )
}
