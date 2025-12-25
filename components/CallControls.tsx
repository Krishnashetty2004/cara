import { View, Pressable, StyleSheet } from 'react-native'
import { Phone, Mic, MicOff, Volume2, VolumeX } from 'lucide-react-native'

interface CallControlsProps {
  isMuted: boolean
  isSpeakerOn: boolean
  onToggleMute: () => void
  onToggleSpeaker: () => void
  onHangup: () => void
}

export function CallControls({
  isMuted,
  isSpeakerOn,
  onToggleMute,
  onToggleSpeaker,
  onHangup,
}: CallControlsProps) {
  return (
    <View style={styles.container}>
      {/* Speaker toggle */}
      <Pressable
        onPress={onToggleSpeaker}
        style={({ pressed }) => [
          styles.controlButton,
          isSpeakerOn && styles.controlButtonActive,
          { opacity: pressed ? 0.7 : 1 },
        ]}
      >
        {isSpeakerOn ? (
          <Volume2 color="#60A5FA" size={24} />
        ) : (
          <VolumeX color="rgba(255, 255, 255, 0.5)" size={24} />
        )}
      </Pressable>

      {/* Hang up */}
      <Pressable
        onPress={onHangup}
        style={({ pressed }) => [
          styles.hangupButton,
          {
            opacity: pressed ? 0.8 : 1,
            transform: [{ scale: pressed ? 0.95 : 1 }],
          },
        ]}
      >
        <Phone
          color="#FFFFFF"
          size={28}
          style={{ transform: [{ rotate: '135deg' }] }}
        />
      </Pressable>

      {/* Mute toggle */}
      <Pressable
        onPress={onToggleMute}
        style={({ pressed }) => [
          styles.controlButton,
          isMuted && styles.controlButtonMuted,
          { opacity: pressed ? 0.7 : 1 },
        ]}
      >
        {isMuted ? (
          <MicOff color="#EF4444" size={24} />
        ) : (
          <Mic color="#FFFFFF" size={24} />
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
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  controlButtonActive: {
    backgroundColor: 'rgba(96, 165, 250, 0.2)',
    borderColor: '#60A5FA',
  },
  controlButtonMuted: {
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
    borderColor: '#EF4444',
  },
  hangupButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#EF4444',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#EF4444',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 10,
  },
})
