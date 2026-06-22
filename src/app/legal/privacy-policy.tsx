import React from 'react';
import { View, ScrollView, TouchableOpacity, StyleSheet, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import Text from '@/components/common/Text';

const EFFECTIVE_DATE = 'July 1, 2025';
const CONTACT_EMAIL = 'support@neighborly.app';

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

function Body({ children }: { children: string }) {
  return <Text style={styles.body}>{children}</Text>;
}

function Bullet({ children }: { children: string }) {
  return (
    <View style={styles.bulletRow}>
      <Text style={styles.bulletDot}>•</Text>
      <Text style={styles.bulletText}>{children}</Text>
    </View>
  );
}

function SubTitle({ children }: { children: string }) {
  return <Text style={styles.subTitle}>{children}</Text>;
}

export default function PrivacyPolicyScreen() {
  const router = useRouter();

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" backgroundColor="#F8F9FA" />
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={20} color="#111827" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Privacy Policy</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <View style={styles.hero}>
            <Ionicons name="shield-checkmark" size={36} color="#10B981" />
            <Text style={styles.heroTitle}>Neighborly Privacy Policy</Text>
            <Text style={styles.heroSub}>Effective Date: {EFFECTIVE_DATE}</Text>
          </View>

          <View style={styles.introBox}>
            <Text style={styles.introText}>
              Neighborly ("we", "our", or "us") is committed to protecting your privacy. This Privacy Policy explains what information we collect, how we use it, who we share it with, and what rights you have over your data. By using Neighborly, you agree to the practices described in this policy.
            </Text>
          </View>

          <Section title="1. Information We Collect">
            <SubTitle>1.1 Account Information</SubTitle>
            <Bullet>Email address — required for account creation and communication</Bullet>
            <Bullet>Full name — displayed on your public profile</Bullet>
            <Bullet>Username / handle — your unique community identifier</Bullet>
            <Bullet>Profile photo — uploaded voluntarily; stored on Cloudinary CDN</Bullet>
            <Bullet>Password — stored as a secure hash by Firebase Authentication; we never see your plain-text password</Bullet>

            <SubTitle>1.2 Location Information</SubTitle>
            <Bullet>Precise GPS coordinates (latitude and longitude) — used to determine your permanent Home Community during setup, and to provide real-time Nearby feeds, businesses, and SOS alerts as you travel</Bullet>
            <Bullet>Neighborhood, district, and city — derived from GPS via reverse geocoding</Bullet>
            <Bullet>You can disable precise location sharing in Settings → Privacy, or revoke location permission in your device settings at any time</Bullet>

            <SubTitle>1.3 Community and Content Data</SubTitle>
            <Bullet>Posts, titles, descriptions, and images you publish to the community feed</Bullet>
            <Bullet>Comments you write on posts</Bullet>
            <Bullet>Direct messages and community chat messages you send or receive</Bullet>
            <Bullet>Your assigned community membership (community ID, neighborhood, city)</Bullet>

            <SubTitle>1.4 SOS and Emergency Data</SubTitle>
            <Bullet>SOS alert type, location, and timestamp when you create an emergency alert</Bullet>
            <Bullet>Responder details when neighbors respond to your SOS</Bullet>
            <Bullet>Emergency contact names, phone numbers, and relationships — stored on your account, used only for SOS features</Bullet>

            <SubTitle>1.5 Device and Notification Data</SubTitle>
            <Bullet>Push notification tokens (FCM tokens) — used solely to deliver push notifications to your device</Bullet>
            <Bullet>Online presence and last-seen timestamps — used for chat interface indicators</Bullet>

            <SubTitle>1.6 Marketplace and Business Data</SubTitle>
            <Bullet>Business and service listing information you create (name, description, contact details, images, location)</Bullet>
            <Bullet>Reviews and ratings you submit for businesses or service providers</Bullet>

            <SubTitle>1.7 Reputation Data</SubTitle>
            <Bullet>Karma points and karma history — awarded for community contributions; has no monetary value</Bullet>

            <SubTitle>1.8 Safety and Moderation Data</SubTitle>
            <Bullet>Reports you submit against content or other users</Bullet>
            <Bullet>Security event logs (e.g., failed login attempts) — used to detect abuse and protect users</Bullet>
            <Bullet>Rate-limit records — used to prevent spam and platform misuse</Bullet>
          </Section>

          <Section title="2. How We Use Your Information">
            <Bullet>To create and manage your account</Bullet>
            <Bullet>To establish your permanent Home Community</Bullet>
            <Bullet>To dynamically load Nearby posts, providers, and SOS alerts based on your real-time GPS location</Bullet>
            <Bullet>To display your profile and content to community members</Bullet>
            <Bullet>To enable messaging between neighbors</Bullet>
            <Bullet>To broadcast SOS emergency alerts to nearby community members</Bullet>
            <Bullet>To send push notifications for messages, SOS alerts, and community activity</Bullet>
            <Bullet>To send transactional emails (welcome email, email verification, password reset)</Bullet>
            <Bullet>To operate the local marketplace and service provider listings</Bullet>
            <Bullet>To enforce community guidelines and investigate reported content</Bullet>
            <Bullet>To protect the security and integrity of the platform through rate limiting and abuse detection</Bullet>
            <Bullet>To award and track Karma reputation points</Bullet>
          </Section>

          <Section title="3. Third-Party Services">
            <Body>We do not sell, rent, or trade your personal information. We share data only with the following service providers, solely to operate Neighborly:</Body>

            <SubTitle>Firebase (Google LLC)</SubTitle>
            <Body>Used for user authentication, database (Firestore), file storage, and server-side functions. Your account credentials and app data are stored on Firebase infrastructure. Governed by Google's Privacy Policy.</Body>

            <SubTitle>Google Sign-In</SubTitle>
            <Body>If you sign in with Google, Google authenticates your identity and provides us with your name and email address. Governed by Google's Privacy Policy.</Body>

            <SubTitle>Cloudinary</SubTitle>
            <Body>Profile photos, post images, and business listing images are stored and served from Cloudinary's CDN. Only images you explicitly upload are stored there. Governed by Cloudinary's Privacy Policy.</Body>

            <SubTitle>Resend</SubTitle>
            <Body>Used to send transactional emails (welcome email, verification). Your email address and name are passed to Resend solely for email delivery. Governed by Resend's Privacy Policy.</Body>

            <SubTitle>Expo (Expo, Inc.)</SubTitle>
            <Body>Used to deliver push notifications to your device. Your device push token is used solely for notification delivery. Governed by Expo's Privacy Policy.</Body>

            <Body>We do not use advertising networks, third-party analytics platforms, or data brokers. No user data is shared for advertising or marketing purposes.</Body>
          </Section>

          <Section title="4. Data Retention">
            <Bullet>Your data is retained for as long as your account is active</Bullet>
            <Bullet>When you delete your account, all personal data (profile, posts, messages, listings, media, karma) is permanently removed</Bullet>
            <Bullet>Security logs and rate-limit records may be retained for up to 30 days for platform integrity purposes</Bullet>
            <Bullet>Deleted content is permanently removed and cannot be recovered</Bullet>
          </Section>

          <Section title="5. Your Rights and Choices">
            <SubTitle>Access and Correction</SubTitle>
            <Body>You may view and update your profile information at any time in Settings.</Body>

            <SubTitle>Location Control</SubTitle>
            <Body>You can disable precise location sharing in Settings → Privacy → Precise Location. You can also revoke location permissions entirely in your device settings, though this limits community matching and SOS features.</Body>

            <SubTitle>Notification Control</SubTitle>
            <Body>You can manage notification categories (SOS alerts, messages, community updates) in Settings → Notifications.</Body>

            <SubTitle>Account Deletion</SubTitle>
            <Body>You may permanently delete your account in Settings → Danger Zone → Delete Account. Deletion is irreversible and removes all associated data including posts, messages, business listings, images, karma history, emergency contacts, and your authentication record.</Body>
          </Section>

          <Section title="6. Data Security">
            <Bullet>All data transmission is encrypted via TLS/HTTPS</Bullet>
            <Bullet>Firebase encrypts data at rest using Google infrastructure-level encryption</Bullet>
            <Bullet>Images are served over HTTPS from Cloudinary CDN</Bullet>
            <Bullet>Firestore security rules enforce that users can only read and write their own data</Bullet>
            <Bullet>Server-side rate limiting and abuse detection protect against unauthorized access</Bullet>
            <Body>No security system is perfect. In the event of a data breach, we will notify affected users as required by applicable law.</Body>
          </Section>

          <Section title="7. Children's Privacy">
            <Body>Neighborly is intended for users who are 13 years of age or older. We do not knowingly collect personal information from children under 13. If you are a parent or guardian and believe your child under 13 has created an account, please contact us at {CONTACT_EMAIL} and we will delete the account and all associated data promptly.</Body>
          </Section>

          <Section title="8. Local Storage">
            <Body>Neighborly uses device local storage (AsyncStorage) only to persist your authentication session and rate-limit cooldown timestamps. No advertising cookies or third-party tracking identifiers are stored.</Body>
          </Section>

          <Section title="9. Changes to This Policy">
            <Body>We may update this Privacy Policy from time to time. When we make material changes, we will update the effective date at the top of this document and notify you within the app where appropriate. Continued use of Neighborly after changes become effective constitutes acceptance of the revised policy.</Body>
          </Section>

          <Section title="10. Contact Us">
            <Body>For questions, concerns, or data requests regarding this Privacy Policy, contact us at:</Body>
            <Body>Email: {CONTACT_EMAIL}</Body>
            <Body>We aim to respond to all privacy inquiries within 5 business days.</Body>
          </Section>

          <View style={styles.footer}>
            <Text style={styles.footerText}>© {new Date().getFullYear()} Neighborly. All rights reserved.</Text>
            <Text style={styles.footerText}>Effective: {EFFECTIVE_DATE}</Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F8F9FA' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12,
    backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#E5E7EB',
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: { fontSize: 16, fontWeight: '800', color: '#111827' },
  scroll: { paddingBottom: 48 },
  hero: {
    alignItems: 'center', paddingVertical: 28,
    backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#E5E7EB',
  },
  heroTitle: { fontSize: 20, fontWeight: '800', color: '#111827', marginTop: 10, textAlign: 'center' },
  heroSub: { fontSize: 12, color: '#6B7280', marginTop: 4 },
  introBox: {
    backgroundColor: '#EFF6FF', margin: 16, borderRadius: 14,
    padding: 16, borderWidth: 1, borderColor: '#BFDBFE',
  },
  introText: { fontSize: 13, color: '#1E40AF', lineHeight: 22 },
  section: {
    backgroundColor: '#FFFFFF', marginHorizontal: 16, marginBottom: 10,
    borderRadius: 16, padding: 18, borderWidth: 1, borderColor: '#E5E7EB',
  },
  sectionTitle: { fontSize: 15, fontWeight: '800', color: '#111827', marginBottom: 12 },
  subTitle: { fontSize: 13, fontWeight: '700', color: '#374151', marginTop: 12, marginBottom: 6 },
  body: { fontSize: 13, color: '#4B5563', lineHeight: 22, marginBottom: 8 },
  bulletRow: { flexDirection: 'row', marginBottom: 6, paddingRight: 8 },
  bulletDot: { fontSize: 13, color: '#6B7280', marginRight: 8, marginTop: 1 },
  bulletText: { fontSize: 13, color: '#4B5563', lineHeight: 22, flex: 1 },
  footer: { alignItems: 'center', marginTop: 16, paddingBottom: 8 },
  footerText: { fontSize: 11, color: '#9CA3AF', marginBottom: 4 },
});
