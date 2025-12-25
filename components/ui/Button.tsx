import { Pressable, Text, ActivityIndicator, ViewStyle, TextStyle } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'

interface ButtonProps {
  onPress: () => void
  title: string
  variant?: 'primary' | 'secondary' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
  isLoading?: boolean
  disabled?: boolean
  style?: ViewStyle
  textStyle?: TextStyle
}

export function Button({
  onPress,
  title,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  disabled = false,
  style,
  textStyle,
}: ButtonProps) {
  const isDisabled = disabled || isLoading

  const sizeStyles = {
    sm: { paddingHorizontal: 16, paddingVertical: 10 },
    md: { paddingHorizontal: 24, paddingVertical: 14 },
    lg: { paddingHorizontal: 32, paddingVertical: 18 },
  }

  const textSizeStyles = {
    sm: { fontSize: 14 },
    md: { fontSize: 16 },
    lg: { fontSize: 18 },
  }

  if (variant === 'primary') {
    return (
      <Pressable
        onPress={onPress}
        disabled={isDisabled}
        style={({ pressed }) => [
          { opacity: pressed || isDisabled ? 0.8 : 1 },
          style,
        ]}
      >
        <LinearGradient
          colors={['#60A5FA', '#3B82F6']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={[
            {
              borderRadius: 16,
              alignItems: 'center',
              justifyContent: 'center',
              flexDirection: 'row',
            },
            sizeStyles[size],
          ]}
        >
          {isLoading ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text
              style={[
                {
                  color: '#fff',
                  fontFamily: 'Inter_600SemiBold',
                },
                textSizeStyles[size],
                textStyle,
              ]}
            >
              {title}
            </Text>
          )}
        </LinearGradient>
      </Pressable>
    )
  }

  if (variant === 'secondary') {
    return (
      <Pressable
        onPress={onPress}
        disabled={isDisabled}
        style={({ pressed }) => [
          {
            backgroundColor: '#F1F5F9',
            borderRadius: 16,
            alignItems: 'center',
            justifyContent: 'center',
            flexDirection: 'row',
            opacity: pressed || isDisabled ? 0.8 : 1,
          },
          sizeStyles[size],
          style,
        ]}
      >
        {isLoading ? (
          <ActivityIndicator color="#3B82F6" size="small" />
        ) : (
          <Text
            style={[
              {
                color: '#1E293B',
                fontFamily: 'Inter_600SemiBold',
              },
              textSizeStyles[size],
              textStyle,
            ]}
          >
            {title}
          </Text>
        )}
      </Pressable>
    )
  }

  // Ghost variant
  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      style={({ pressed }) => [
        {
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'row',
          opacity: pressed || isDisabled ? 0.6 : 1,
        },
        sizeStyles[size],
        style,
      ]}
    >
      {isLoading ? (
        <ActivityIndicator color="#64748B" size="small" />
      ) : (
        <Text
          style={[
            {
              color: '#64748B',
              fontFamily: 'Inter_500Medium',
            },
            textSizeStyles[size],
            textStyle,
          ]}
        >
          {title}
        </Text>
      )}
    </Pressable>
  )
}
