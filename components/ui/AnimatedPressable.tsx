import React from 'react';
import { Pressable, PressableProps, ViewStyle, StyleProp } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

const AnimatedPressableComponent = Animated.createAnimatedComponent(Pressable);

interface AnimatedPressableProps extends Omit<PressableProps, 'style'> {
  style?: StyleProp<ViewStyle>;
  haptic?: 'light' | 'medium' | 'heavy' | 'selection' | 'none';
  scaleValue?: number;
  children: React.ReactNode;
}

export function AnimatedPressable({
  haptic = 'light',
  scaleValue = 0.96,
  children,
  onPressIn,
  onPressOut,
  style,
  ...props
}: AnimatedPressableProps) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: withSpring(scale.value, { damping: 15, stiffness: 400 }) }],
  }));

  const handlePressIn = (e: any) => {
    scale.value = scaleValue;

    if (haptic !== 'none') {
      switch (haptic) {
        case 'selection':
          Haptics.selectionAsync();
          break;
        case 'medium':
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          break;
        case 'heavy':
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
          break;
        default:
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
    }

    onPressIn?.(e);
  };

  const handlePressOut = (e: any) => {
    scale.value = 1;
    onPressOut?.(e);
  };

  return (
    <AnimatedPressableComponent
      style={[animatedStyle, style]}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      {...props}
    >
      {children}
    </AnimatedPressableComponent>
  );
}
