import { View, Pressable, StyleSheet } from 'react-native'
import * as Haptics from 'expo-haptics'
import Svg, { Path } from 'react-native-svg'
import { colors } from '@/constants/theme'

interface CallControlsProps {
  isMuted: boolean
  isSpeakerOn: boolean
  onToggleMute: () => void
  onToggleSpeaker: () => void
  onHangup: () => void
}

// Phone Icon
const PhoneIcon = ({ size = 32, color = '#FFF' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
)

// Mic Icon
const MicIcon = ({ size = 28, color = '#FFF' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path
      d="M19 10v2a7 7 0 01-14 0v-2M12 19v4M8 23h8"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
)

// Mic Off Icon
const MicOffIcon = ({ size = 28, color = colors.error }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M1 1l22 22M9 9v3a3 3 0 005.12 2.12M15 9.34V4a3 3 0 00-5.94-.6"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path
      d="M17 16.95A7 7 0 015 12v-2m14 0v2a7 7 0 01-.11 1.23M12 19v4M8 23h8"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
)

// Volume Icon
const VolumeIcon = ({ size = 28, color = colors.emotional }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M11 5L6 9H2v6h4l5 4V5zM19.07 4.93a10 10 0 010 14.14M15.54 8.46a5 5 0 010 7.07"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
)

// Volume Off Icon
const VolumeOffIcon = ({ size = 28, color = 'rgba(255, 255, 255, 0.5)' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M11 5L6 9H2v6h4l5 4V5zM23 9l-6 6M17 9l6 6"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
)

export function CallControls({
  isMuted,
  isSpeakerOn,
  onToggleMute,
  onToggleSpeaker,
  onHangup,
}: CallControlsProps) {
  const handleToggleSpeaker = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    onToggleSpeaker()
  }

  const handleToggleMute = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    onToggleMute()
  }

  const handleHangup = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy)
    onHangup()
  }

  return (
    <View style={styles.container}>
      {/* Speaker toggle */}
      <Pressable
        onPress={handleToggleSpeaker}
        style={({ pressed }) => [
          styles.controlButton,
          isSpeakerOn && styles.controlButtonActive,
          pressed && { opacity: 0.7 },
        ]}
      >
        {isSpeakerOn ? (
          <VolumeIcon color={colors.emotional} size={24} />
        ) : (
          <VolumeOffIcon color="rgba(255, 255, 255, 0.5)" size={24} />
        )}
      </Pressable>

      {/* Hang up */}
      <Pressable
        onPress={handleHangup}
        style={({ pressed }) => [
          styles.hangupButton,
          pressed && { opacity: 0.85, transform: [{ scale: 0.96 }] },
        ]}
      >
        <View style={styles.hangupIconWrapper}>
          <PhoneIcon color="#FFFFFF" size={28} />
        </View>
      </Pressable>

      {/* Mute toggle */}
      <Pressable
        onPress={handleToggleMute}
        style={({ pressed }) => [
          styles.controlButton,
          isMuted && styles.controlButtonMuted,
          pressed && { opacity: 0.7 },
        ]}
      >
        {isMuted ? (
          <MicOffIcon color={colors.error} size={24} />
        ) : (
          <MicIcon color="#FFFFFF" size={24} />
        )}
      </Pressable>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 32,
  },
  controlButton: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  controlButtonActive: {
    backgroundColor: 'rgba(167, 118, 147, 0.25)',
    borderColor: 'rgba(167, 118, 147, 0.5)',
  },
  controlButtonMuted: {
    backgroundColor: 'rgba(184, 90, 90, 0.25)',
    borderColor: 'rgba(184, 90, 90, 0.5)',
  },
  hangupButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.error,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.error,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 10,
  },
  hangupIconWrapper: {
    transform: [{ rotate: '135deg' }],
  },
})
