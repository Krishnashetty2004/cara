// app/(main)/home.tsx
// Home screen with real user data

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  Image,
  ScrollView,
  Dimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useUser as useAppUser } from '@/hooks/useUser';

const { width } = Dimensions.get('window');

// Character data
const characters = [
  {
    id: 'preethi',
    name: 'Preethi',
    tagline: 'Your flirty friend',
    image: require('@/assets/images/preethi.jpg'),
    available: true,
  },
  {
    id: 'ira',
    name: 'Ira',
    tagline: 'Your calm confidant',
    image: require('@/assets/images/ira.jpg'),
    available: true,
  },
  {
    id: 'riya',
    name: 'Riya',
    tagline: 'Chaotic Telugu bestie',
    image: require('@/assets/images/riya.png'),
    available: true,
  },
];

export default function HomeScreen() {
  const router = useRouter();
  const [selectedCharacter, setSelectedCharacter] = useState(characters[0]);
  const { isPremium, remainingMinutes, canMakeCall } = useAppUser();

  // Real minutes from hook
  const minutesRemaining = isPremium ? Infinity : remainingMinutes;

  const handleStartCall = () => {
    if (canMakeCall()) {
      router.push({
        pathname: '/(main)/call',
        params: { characterId: selectedCharacter.id },
      });
    } else {
      router.push('/(paywall)/premium');
    }
  };

  const handleOpenSettings = () => {
    router.push('/(main)/settings');
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.logo}>cara</Text>
        <TouchableOpacity onPress={handleOpenSettings} style={styles.settingsButton}>
          <Ionicons name="settings-outline" size={24} color="#666" />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Character Selector */}
        <View style={styles.selectorSection}>
          <Text style={styles.sectionLabel}>CHOOSE YOUR COMPANION</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.characterScroll}
          >
            {characters.map((char) => (
              <TouchableOpacity
                key={char.id}
                style={styles.characterThumb}
                onPress={() => char.available && setSelectedCharacter(char)}
                activeOpacity={char.available ? 0.7 : 1}
              >
                <View style={[
                  styles.thumbPlaceholder,
                  selectedCharacter.id === char.id && styles.thumbSelected,
                ]}>
                  {char.image ? (
                    <Image source={char.image} style={styles.thumbImage} />
                  ) : (
                    <View style={styles.thumbEmpty} />
                  )}
                  {!char.available && (
                    <View style={styles.soonBadge}>
                      <Text style={styles.soonText}>Soon</Text>
                    </View>
                  )}
                </View>
                <Text style={[
                  styles.thumbName,
                  selectedCharacter.id === char.id && styles.thumbNameSelected,
                ]}>{char.name}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Main Character Card */}
        <View style={styles.mainCard}>
          <Image
            source={selectedCharacter.image || require('@/assets/images/preethi.jpg')}
            style={styles.mainImage}
            resizeMode="cover"
          />
          <View style={styles.cardOverlay}>
            <Text style={styles.characterName}>{selectedCharacter.name}</Text>
            <Text style={styles.characterTagline}>{selectedCharacter.tagline}</Text>
          </View>
        </View>

        {/* Minutes Badge */}
        <View style={styles.minutesBadge}>
          <Text style={styles.minutesText}>
            {isPremium ? 'Unlimited calls' : `${minutesRemaining} minutes remaining`}
          </Text>
        </View>

        {/* Start Call Button - ROUNDED, NO ICON */}
        <TouchableOpacity
          style={[
            styles.callButton,
            !canMakeCall() && styles.callButtonDisabled,
          ]}
          onPress={handleStartCall}
          activeOpacity={0.8}
        >
          <Text style={styles.callButtonText}>Start Call</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F8FB',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 16,
  },
  logo: {
    fontSize: 32,  // BIGGER
    fontFamily: 'PlayfairDisplay-Bold',
    color: '#4A8FD4',
    letterSpacing: 1,
  },
  settingsButton: {
    padding: 8,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  selectorSection: {
    marginBottom: 24,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#888',
    letterSpacing: 1,
    marginBottom: 16,
  },
  characterScroll: {
    flexDirection: 'row',
  },
  characterThumb: {
    marginRight: 20,
    alignItems: 'center',
  },
  thumbPlaceholder: {
    width: 72,
    height: 72,
    borderRadius: 36,
    overflow: 'hidden',
    backgroundColor: '#E0E0E0',
    borderWidth: 3,
    borderColor: 'transparent',
  },
  thumbSelected: {
    borderColor: '#4A8FD4',
  },
  thumbImage: {
    width: '100%',
    height: '100%',
  },
  thumbEmpty: {
    width: '100%',
    height: '100%',
    backgroundColor: '#D0D0D0',
  },
  thumbName: {
    marginTop: 8,
    fontSize: 13,
    color: '#888',
    fontWeight: '500',
  },
  thumbNameSelected: {
    color: '#4A8FD4',
    fontWeight: '600',
  },
  soonBadge: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingVertical: 4,
  },
  soonText: {
    color: 'white',
    fontSize: 10,
    fontWeight: '600',
    textAlign: 'center',
  },
  mainCard: {
    width: '100%',
    height: width * 1.1,
    borderRadius: 24,
    overflow: 'hidden',
    backgroundColor: '#2B5A87',
    marginBottom: 24,
  },
  mainImage: {
    width: '100%',
    height: '100%',
  },
  cardOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 24,
    paddingTop: 48,
    backgroundColor: 'rgba(43,90,135,0.85)',
  },
  characterName: {
    fontSize: 32,
    fontFamily: 'PlayfairDisplay-Bold',
    color: 'white',
    marginBottom: 4,
  },
  characterTagline: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.8)',
  },
  minutesBadge: {
    alignItems: 'center',
    marginBottom: 16,
  },
  minutesText: {
    fontSize: 14,
    color: '#888',
  },
  callButton: {
    backgroundColor: '#4A8FD4',
    height: 56,
    borderRadius: 50,  // FULLY ROUNDED
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#4A8FD4',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  callButtonDisabled: {
    backgroundColor: '#B0C4DE',
    shadowOpacity: 0,
  },
  callButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: 'white',
  },
});
