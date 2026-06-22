import React from 'react';
import { View, ScrollView, TouchableOpacity, StyleSheet, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import Text from '@/components/common/Text';

const LAST_UPDATED = 'July 1, 2025';
const CONTACT_EMAIL = 'support@neighborly.app';

const T = {
  bg: '#F8F9FA',
  card: '#FFFFFF',
  text: '#111827',
  sub: '#6B7280',
  border: '#E5E7EB',
  red: '#EF4444',
  green: '#10B981',
};

function GuidelineSection({ title, icon, color, children }: {
  title: string; icon: string; color: string; children: React.ReactNode;
}) {
  return (
    <View style={styles.sectionWrap}>
      <View style={styles.sectionHeader}>
        <View style={[styles.sectionIcon, { backgroundColor: color + '15', borderColor: color + '25' }]}>
          <Ionicons name={icon as any} size={20} color={color} />
        </View>
        <Text style={styles.sectionTitle}>{title}</Text>
      </View>
      <View style={styles.card}>{children}</View>
    </View>
  );
}

function DoItem({ text }: { text: string }) {
  return (
    <View style={styles.item}>
      <Ionicons name="checkmark-circle" size={18} color={T.green} style={{ marginRight: 10, marginTop: 1 }} />
      <Text style={styles.itemText}>{text}</Text>
    </View>
  );
}

function DontItem({ text }: { text: string }) {
  return (
    <View style={[styles.item, styles.dontItem]}>
      <Ionicons name="close-circle" size={18} color={T.red} style={{ marginRight: 10, marginTop: 1 }} />
      <Text style={[styles.itemText, { color: '#B91C1C' }]}>{text}</Text>
    </View>
  );
}

function Divider() {
  return <View style={styles.divider} />;
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

          <View style={styles.introCard}>
            <Ionicons name="shield-checkmark" size={44} color={T.green} />
            <Text style={styles.introTitle}>Building a Safe Community</Text>
            <Text style={styles.introText}>
              Neighborly connects neighbors to help one another. These guidelines ensure our community stays safe, respectful, and trustworthy for everyone.
            </Text>
            <Text style={styles.introMeta}>Last updated: {LAST_UPDATED}</Text>
          </View>

          {/* 1 — Respectful Behaviour */}
          <GuidelineSection title="Respectful Behaviour" icon="people-outline" color="#2563EB">
            <DoItem text="Treat every community member with kindness and dignity" />
            <DoItem text="Use appropriate language in all posts, comments, and messages" />
            <DoItem text="Listen to and consider different perspectives" />
            <DoItem text="Disagree constructively — debate ideas, not people" />
            <Divider />
            <DontItem text="No personal attacks, insults, or name-calling" />
            <DontItem text="No harassment, bullying, or intimidation of any user" />
            <DontItem text="No hate speech, discrimination, or content targeting people based on race, religion, gender, ethnicity, nationality, disability, or sexual orientation" />
          </GuidelineSection>

          {/* 2 — Privacy & Personal Safety */}
          <GuidelineSection title="Privacy & Personal Safety" icon="shield-outline" color={T.green}>
            <DoItem text="Keep personal details (home address, phone number, banking information) private" />
            <DoItem text="Meet neighbors in public places for the first time" />
            <DoItem text="Use the app's built-in messaging for initial contact" />
            <DoItem text="Trust your instincts — if something feels unsafe, report it immediately" />
            <Divider />
            <DontItem text="Do not share your precise location with strangers" />
            <DontItem text="Do not solicit private contact information from other users" />
            <DontItem text="Do not contact minors privately outside of community posts" />
          </GuidelineSection>

          {/* 3 — SOS & Emergency Use */}
          <GuidelineSection title="SOS & Emergency Alerts" icon="alert-circle-outline" color={T.red}>
            <View style={styles.sosWarning}>
              <Ionicons name="warning" size={16} color="#92400E" style={{ marginRight: 8 }} />
              <Text style={styles.sosWarningText}>
                Always call official emergency services (911, 15, 1122, or 112) for life-threatening situations. The SOS feature is a community aid tool, not a replacement for emergency services.
              </Text>
            </View>
            <DoItem text="Use SOS alerts ONLY for genuine, real emergencies" />
            <DoItem text="Provide clear and accurate details when creating an SOS alert" />
            <DoItem text="Respond to SOS alerts only if you can genuinely and safely help" />
            <DoItem text="Mark your SOS as resolved once the emergency is over" />
            <Divider />
            <DontItem text="No fake, test, or non-urgent SOS alerts" />
            <DontItem text="No SOS alerts for commercial promotions or general questions" />
            <DontItem text="Repeated abuse of SOS will result in permanent account ban" />
          </GuidelineSection>

          {/* 4 — Honest and Accurate Content */}
          <GuidelineSection title="Honest & Accurate Content" icon="document-text-outline" color="#F59E0B">
            <DoItem text="Post truthful and accurate information" />
            <DoItem text="Use relevant post categories to help neighbors find content" />
            <DoItem text="Disclose any personal interest when recommending a business or service" />
            <DoItem text="Correct or delete posts if you discover information was inaccurate" />
            <Divider />
            <DontItem text="No misinformation, hoaxes, or deliberately false claims" />
            <DontItem text="No impersonation of any person, business, government body, or organization" />
            <DontItem text="No duplicate or repetitive spam posts" />
            <DontItem text="No posting of copyrighted material without permission" />
          </GuidelineSection>

          {/* 5 — No Scams or Fraud */}
          <GuidelineSection title="No Scams or Fraud" icon="ban-outline" color="#DC2626">
            <DontItem text="No scams, phishing attempts, or fraudulent offers" />
            <DontItem text="No requests for money, gift cards, or financial transfers from strangers" />
            <DontItem text="No multi-level marketing (MLM) schemes or pyramid schemes" />
            <DontItem text="No counterfeit goods or illegal products/services" />
            <DontItem text="No false urgency tactics to pressure other users" />
            <Divider />
            <DoItem text="If you suspect a scam, report it immediately using the in-app Report feature" />
            <DoItem text="Verify service providers independently before hiring or sending payment" />
          </GuidelineSection>

          {/* 6 — Marketplace Conduct */}
          <GuidelineSection title="Marketplace Conduct" icon="storefront-outline" color="#D97706">
            <DoItem text="Provide accurate descriptions of goods and services you offer" />
            <DoItem text="Respond to inquiries promptly and professionally" />
            <DoItem text="Honor agreements you make with other community members" />
            <DoItem text="Leave honest reviews based on genuine experiences" />
            <Divider />
            <DontItem text="No fake reviews or review manipulation" />
            <DontItem text="No excessive self-promotion in community posts (use business/service listings)" />
            <DontItem text="No advertising illegal goods or services" />
            <Text style={styles.noteText}>
              Note: Neighborly does not verify the credentials or qualifications of any listed service provider. Always perform your own due diligence before hiring.
            </Text>
          </GuidelineSection>

          {/* 7 — Dangerous Activities */}
          <GuidelineSection title="Dangerous & Illegal Activities" icon="skull-outline" color="#7C3AED">
            <DontItem text="No promotion or facilitation of illegal activities" />
            <DontItem text="No sale, trade, or discussion of illegal weapons, drugs, or controlled substances" />
            <DontItem text="No content that endangers the safety of any individual or group" />
            <DontItem text="No content sexualizing minors under any circumstances — will result in immediate permanent ban and report to authorities" />
            <DontItem text="No doxxing (publishing private personal information without consent)" />
          </GuidelineSection>

          {/* 8 — Reporting & Moderation */}
          <GuidelineSection title="Reporting & Moderation" icon="flag-outline" color="#0891B2">
            <DoItem text="Use the in-app Report button to flag content that violates these guidelines" />
            <DoItem text="Block users who make you uncomfortable — Settings → Blocked Users" />
            <DoItem text="Cooperate with moderators if contacted about a review" />
            <DoItem text="Appeals can be submitted to {CONTACT_EMAIL}" />
            <Divider />
            <DontItem text="Do not file false or malicious reports against other users" />
            <Text style={styles.noteText}>
              Reports are reviewed by Neighborly's moderation team. Action is taken at our sole discretion in accordance with these guidelines and our Terms of Service.
            </Text>
          </GuidelineSection>

          {/* Consequences */}
          <View style={styles.consequencesCard}>
            <Ionicons name="warning-outline" size={30} color={T.red} />
            <Text style={styles.consequencesTitle}>Violation Consequences</Text>
            <View style={styles.consequenceRow}>
              <Text style={styles.consequenceStep}>1st Offense</Text>
              <Text style={styles.consequenceDesc}>Warning and content removal</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.consequenceRow}>
              <Text style={styles.consequenceStep}>2nd Offense</Text>
              <Text style={styles.consequenceDesc}>Temporary account suspension</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.consequenceRow}>
              <Text style={styles.consequenceStep}>3rd Offense</Text>
              <Text style={styles.consequenceDesc}>Permanent account ban</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.consequenceRow}>
              <Text style={[styles.consequenceStep, { color: T.red }]}>Severe Violations</Text>
              <Text style={styles.consequenceDesc}>Immediate permanent ban (no warning)</Text>
            </View>
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>
              By using Neighborly, you agree to follow these Community Guidelines and our Terms of Service.
            </Text>
            <Text style={styles.footerMeta}>Last updated: {LAST_UPDATED}</Text>
          </View>

        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: T.bg },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12,
    backgroundColor: T.card, borderBottomWidth: 1, borderBottomColor: T.border,
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: { fontSize: 16, fontWeight: '800', color: T.text },
  scroll: { paddingBottom: 48 },
  introCard: {
    backgroundColor: T.card, borderRadius: 20, borderWidth: 1, borderColor: T.border,
    margin: 16, padding: 24, alignItems: 'center',
  },
  introTitle: { fontSize: 18, fontWeight: '800', color: T.text, marginTop: 12, marginBottom: 8, textAlign: 'center' },
  introText: { fontSize: 13, color: T.sub, textAlign: 'center', lineHeight: 22 },
  introMeta: { fontSize: 11, color: '#9CA3AF', marginTop: 12 },
  sectionWrap: { paddingHorizontal: 16, marginBottom: 12 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  sectionIcon: {
    width: 36, height: 36, borderRadius: 10, borderWidth: 1,
    alignItems: 'center', justifyContent: 'center', marginRight: 10,
  },
  sectionTitle: { fontSize: 15, fontWeight: '800', color: T.text },
  card: {
    backgroundColor: T.card, borderRadius: 16, borderWidth: 1,
    borderColor: T.border, padding: 14,
  },
  item: {
    flexDirection: 'row', alignItems: 'flex-start',
    marginBottom: 8, paddingVertical: 4, paddingHorizontal: 6, borderRadius: 8,
  },
  dontItem: { backgroundColor: '#FEF2F2' },
  itemText: { fontSize: 13, color: T.sub, flex: 1, lineHeight: 20 },
  divider: { height: 1, backgroundColor: '#F3F4F6', marginVertical: 8 },
  sosWarning: {
    flexDirection: 'row', alignItems: 'flex-start',
    backgroundColor: '#FEF3C7', borderRadius: 10, padding: 12,
    marginBottom: 10, borderWidth: 1, borderColor: '#FDE68A',
  },
  sosWarningText: { fontSize: 12, color: '#92400E', lineHeight: 19, flex: 1, fontWeight: '600' },
  noteText: { fontSize: 11, color: '#9CA3AF', lineHeight: 18, marginTop: 6, fontStyle: 'italic' },
  consequencesCard: {
    backgroundColor: '#FEF2F2', borderWidth: 1, borderColor: '#FCA5A5',
    borderRadius: 20, marginHorizontal: 16, padding: 20, marginBottom: 20,
  },
  consequencesTitle: { fontSize: 15, fontWeight: '800', color: T.red, marginTop: 8, marginBottom: 14 },
  consequenceRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6 },
  consequenceStep: { fontSize: 13, fontWeight: '700', color: '#374151', width: 110 },
  consequenceDesc: { fontSize: 13, color: T.sub, flex: 1 },
  footer: { alignItems: 'center', paddingHorizontal: 32, marginTop: 4 },
  footerText: { fontSize: 12, color: T.sub, textAlign: 'center', lineHeight: 20, marginBottom: 6 },
  footerMeta: { fontSize: 11, color: '#9CA3AF' },
});
