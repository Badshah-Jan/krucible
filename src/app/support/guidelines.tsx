import React from 'react';
import { View, ScrollView, TouchableOpacity, StyleSheet, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import Text from '@/components/common/Text';

const T = {
  bg: '#F8F9FA',
  card: '#FFFFFF',
  text: '#111827',
  textSecondary: '#6B7280',
  border: '#E5E7EB',
  primary: '#EF4444',
};

function GuidelineSection({ title, icon, color, children }: any) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <View style={[styles.sectionIcon, { backgroundColor: color + '10', borderColor: color + '20' }]}>
          <Ionicons name={icon} size={20} color={color} />
        </View>
        <Text style={styles.sectionTitle}>{title}</Text>
      </View>
      <View style={styles.card}>{children}</View>
    </View>
  );
}

function GuidelineItem({ text, icon = 'checkmark-circle' }: { text: string; icon?: string }) {
  return (
    <View style={styles.item}>
      <Ionicons name={icon as any} size={18} color="#10B981" style={{ marginRight: 10 }} />
      <Text style={styles.itemText}>{text}</Text>
    </View>
  );
}

function WarningItem({ text }: { text: string }) {
  return (
    <View style={[styles.item, { backgroundColor: '#FEF2F2' }]}>
      <Ionicons name="close-circle" size={18} color={T.primary} style={{ marginRight: 10 }} />
      <Text style={[styles.itemText, { color: T.primary }]}>{text}</Text>
    </View>
  );
}

export default function GuidelinesScreen() {
  const router = useRouter();

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" backgroundColor={T.bg} />
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={20} color={T.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Community Guidelines</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
          
          {/* Intro */}
          <View style={styles.introCard}>
            <Ionicons name="shield-checkmark" size={48} color="#10B981" />
            <Text style={styles.introTitle}>Building a Safe Community Together</Text>
            <Text style={styles.introText}>
              AasPaas connects neighbors to help each other in times of need. These guidelines ensure everyone feels safe, respected, and supported.
            </Text>
          </View>

          {/* Respectful Communication */}
          <GuidelineSection title="Respectful Communication" icon="chatbubbles-outline" color="#2563EB">
            <GuidelineItem text="Treat all community members with kindness and respect" />
            <GuidelineItem text="Use appropriate language in all posts and messages" />
            <GuidelineItem text="Listen to and consider different perspectives" />
            <GuidelineItem text="Avoid heated arguments or personal attacks" />
            <GuidelineItem text="Report offensive or inappropriate content to moderators" />
          </GuidelineSection>

          {/* Privacy & Safety */}
          <GuidelineSection title="Privacy & Safety" icon="shield-outline" color="#10B981">
            <GuidelineItem text="Never share personal information publicly (phone, address, financial details)" />
            <GuidelineItem text="Meet in public places when connecting with neighbors" />
            <GuidelineItem text="Use the app's messaging system for initial communications" />
            <GuidelineItem text="Trust your instincts - if something feels wrong, report it" />
            <GuidelineItem text="Keep children supervised when interacting with neighbors" />
          </GuidelineSection>

          {/* SOS & Emergency Usage */}
          <GuidelineSection title="SOS & Emergency Usage" icon="alert-circle-outline" color={T.primary}>
            <GuidelineItem text="Use SOS alerts ONLY for genuine emergencies" />
            <GuidelineItem text="Provide clear, accurate information in emergency posts" />
            <GuidelineItem text="Respond to SOS alerts only if you can genuinely help" />
            <GuidelineItem text="Call emergency services (911/108) for life-threatening situations" />
            <GuidelineItem text="Follow up after an emergency is resolved" />
            
            <View style={styles.divider} />
            <Text style={styles.warningTitle}>Do NOT use SOS for:</Text>
            <WarningItem text="Non-urgent requests or general questions" />
            <WarningItem text="Testing the system" />
            <WarningItem text="Commercial promotions or advertising" />
          </GuidelineSection>

          {/* Content Standards */}
          <GuidelineSection title="Content Standards" icon="document-text-outline" color="#F59E0B">
            <GuidelineItem text="Post accurate and truthful information" />
            <GuidelineItem text="Use relevant categories for your posts" />
            <GuidelineItem text="Include clear descriptions and context" />
            <GuidelineItem text="Add photos only when appropriate and helpful" />
            <GuidelineItem text="Avoid duplicate or spam posts" />
            
            <View style={styles.divider} />
            <Text style={styles.warningTitle}>Prohibited Content:</Text>
            <WarningItem text="Hate speech, discrimination, or harassment" />
            <WarningItem text="Violence, threats, or illegal activity" />
            <WarningItem text="Sexual content or inappropriate material" />
            <WarningItem text="Scams, fraud, or misleading information" />
            <WarningItem text="Copyright infringement or stolen content" />
          </GuidelineSection>

          {/* Helping Others */}
          <GuidelineSection title="Helping Others" icon="hand-left-outline" color="#8B5CF6">
            <GuidelineItem text="Respond promptly to help requests when possible" />
            <GuidelineItem text="Be clear about what help you can offer" />
            <GuidelineItem text="Follow through on commitments you make" />
            <GuidelineItem text="Respect people's privacy and boundaries" />
            <GuidelineItem text="Earn karma points by being a helpful neighbor" />
          </GuidelineSection>

          {/* Commercial Activity */}
          <GuidelineSection title="Commercial Activity" icon="storefront-outline" color="#D97706">
            <GuidelineItem text="Recommendations for local businesses are welcome" />
            <GuidelineItem text="Clearly disclose if you have a business relationship" />
            <GuidelineItem text="Use the Services category for professional offerings" />
            <GuidelineItem text="Avoid excessive self-promotion" />
            <WarningItem text="No spam, MLMs, or pyramid schemes" />
          </GuidelineSection>

          {/* Reporting & Moderation */}
          <GuidelineSection title="Reporting & Moderation" icon="flag-outline" color="#DC2626">
            <GuidelineItem text="Report content that violates these guidelines" />
            <GuidelineItem text="Block users who make you uncomfortable" />
            <GuidelineItem text="Cooperate with moderators during investigations" />
            <GuidelineItem text="Appeals can be sent to badshahkha656@gmail.com" />
          </GuidelineSection>

          {/* Consequences */}
          <View style={styles.consequencesCard}>
            <Ionicons name="warning-outline" size={32} color={T.primary} />
            <Text style={styles.consequencesTitle}>Violation Consequences</Text>
            <Text style={styles.consequencesText}>
              • First offense: Warning and content removal{'\n'}
              • Second offense: Temporary account suspension{'\n'}
              • Third offense: Permanent account ban{'\n'}
              • Severe violations: Immediate permanent ban
            </Text>
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>
              By using AasPaas, you agree to follow these community guidelines.
            </Text>
            <Text style={styles.footerText}>Last updated: December 2024</Text>
          </View>

        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: T.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 16,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: T.card,
    borderWidth: 1,
    borderColor: T.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: { fontSize: 16, fontWeight: '800', color: T.text },
  scroll: { paddingBottom: 40 },

  introCard: {
    backgroundColor: T.card,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: T.border,
    marginHorizontal: 16,
    marginBottom: 24,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 2,
  },
  introTitle: { fontSize: 18, fontWeight: '800', color: T.text, marginTop: 12, marginBottom: 8, textAlign: 'center' },
  introText: { fontSize: 14, color: T.textSecondary, textAlign: 'center', lineHeight: 22 },

  section: { paddingHorizontal: 16, marginBottom: 20 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  sectionIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  sectionTitle: { fontSize: 15, fontWeight: '800', color: T.text },

  card: {
    backgroundColor: T.card,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: T.border,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 2,
  },

  item: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 10, paddingVertical: 6, paddingHorizontal: 8, borderRadius: 8 },
  itemText: { fontSize: 13, color: T.textSecondary, flex: 1, lineHeight: 20 },

  divider: { height: 1, backgroundColor: '#F3F4F6', marginVertical: 12 },
  warningTitle: { fontSize: 12, fontWeight: '700', color: T.primary, marginBottom: 8 },

  consequencesCard: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FCA5A5',
    borderRadius: 20,
    marginHorizontal: 16,
    padding: 20,
    alignItems: 'center',
    marginBottom: 24,
  },
  consequencesTitle: { fontSize: 15, fontWeight: '800', color: T.primary, marginTop: 10, marginBottom: 8 },
  consequencesText: { fontSize: 13, color: '#DC2626', textAlign: 'center', lineHeight: 22 },

  footer: { alignItems: 'center', paddingHorizontal: 32, marginTop: 10 },
  footerText: { fontSize: 11, color: '#9CA3AF', textAlign: 'center', marginBottom: 6 },
});
