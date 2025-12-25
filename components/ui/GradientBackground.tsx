import { View, ViewStyle } from 'react-native'

interface GradientBackgroundProps {
  children: React.ReactNode
  style?: ViewStyle
  colors?: string[]
}

export function GradientBackground({
  children,
  style,
}: GradientBackgroundProps) {
  return (
    <View style={[{ flex: 1, backgroundColor: '#FFFFFF' }, style]}>
      {children}
    </View>
  )
}
