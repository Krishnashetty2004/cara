import { View, Image, ImageSourcePropType, ViewStyle } from 'react-native'

interface AvatarProps {
  source: ImageSourcePropType
  size?: number
  borderColor?: string
  borderWidth?: number
  style?: ViewStyle
}

export function Avatar({
  source,
  size = 100,
  borderColor = '#60A5FA',
  borderWidth = 3,
  style,
}: AvatarProps) {
  return (
    <View
      style={[
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          borderWidth,
          borderColor,
          overflow: 'hidden',
        },
        style,
      ]}
    >
      <Image
        source={source}
        style={{
          width: '100%',
          height: '100%',
        }}
        resizeMode="cover"
      />
    </View>
  )
}
