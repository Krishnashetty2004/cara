import { View, Text, ScrollView, Pressable } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { ChevronLeft } from 'lucide-react-native'
import { GradientBackground } from '@/components/ui/GradientBackground'

interface LegalSection {
  title: string
  content: string
}

interface LegalPageProps {
  title: string
  lastUpdated: string
  sections: LegalSection[]
}

export function LegalPage({ title, lastUpdated, sections }: LegalPageProps) {
  return (
    <GradientBackground>
      <SafeAreaView style={{ flex: 1 }}>
        {/* Header */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            paddingHorizontal: 24,
            paddingTop: 16,
            paddingBottom: 16,
          }}
        >
          <Pressable
            onPress={() => router.back()}
            style={({ pressed }) => [{ padding: 8, marginLeft: -8, opacity: pressed ? 0.7 : 1 }]}
          >
            <ChevronLeft color="#fff" size={28} />
          </Pressable>
          <Text style={{ fontSize: 20, fontWeight: '700', color: '#fff', marginLeft: 8 }}>
            {title}
          </Text>
        </View>

        {/* Content */}
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
        >
          {/* Last Updated */}
          <Text style={{ fontSize: 12, color: '#64748B', marginBottom: 24 }}>
            Last updated: {lastUpdated}
          </Text>

          {/* Sections */}
          {sections.map((section, index) => (
            <View key={index} style={{ marginBottom: 24 }}>
              <Text
                style={{
                  fontSize: 18,
                  fontWeight: '700',
                  color: '#fff',
                  marginBottom: 12,
                }}
              >
                {section.title}
              </Text>
              <Text
                style={{
                  fontSize: 14,
                  color: '#94A3B8',
                  lineHeight: 22,
                }}
              >
                {section.content}
              </Text>
            </View>
          ))}

          {/* Footer */}
          <View
            style={{
              marginTop: 24,
              paddingTop: 24,
              borderTopWidth: 1,
              borderTopColor: '#334155',
            }}
          >
            <Text style={{ fontSize: 12, color: '#64748B', textAlign: 'center' }}>
              Plutas Labs - Cara App
            </Text>
            <Text style={{ fontSize: 12, color: '#64748B', textAlign: 'center', marginTop: 4 }}>
              Questions? Contact legal@cara.app
            </Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    </GradientBackground>
  )
}
