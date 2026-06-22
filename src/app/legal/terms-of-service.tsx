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

function DisclaimerBox({ children }: { children: string }) {
  return (
    <View style={styles.disclaimerBox}>
      <Ionicons name="warning" size={16} color="#B45309" style={{ marginRight: 8, marginTop: 1 }} />
      <Text style={styles.disclaimerText}>{children}</Text>
    </View>
  );
}

export default function TermsOfServiceScreen() {
  const router = useRouter();

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" backgroundColor="#F8F9FA" />
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={20} color="#111827" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Terms of Service</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <View style={styles.hero}>
            <Ionicons name="document-text" size={36} color="#4F46E5" />
            <Text style={styles.heroTitle}>Neighborly Terms of Service</Text>
            <Text style={styles.heroSub}>Effective Date: {EFFECTIVE_DATE}</Text>
          </View>

          <View style={styles.introBox}>
            <Text style={styles.introText}>
              Please read these Terms of Service ("Terms") carefully before using the Neighborly application. By creating an account or using Neighborly, you agree to be bound by these Terms. If you do not agree, do not use the application.
            </Text>
          </View>

          <Section title="1. Eligibility and Accounts">
            <Body>You must be at least 13 years of age to use Neighborly. By creating an account, you represent and warrant that you are 13 years of age or older.</Body>
            <Bullet>You are responsible for maintaining the confidentiality of your account credentials</Bullet>
            <Bullet>You are responsible for all activity that occurs under your account</Bullet>
            <Bullet>You must provide accurate and truthful information when creating your account</Bullet>
            <Bullet>You may not create more than one account per person</Bullet>
            <Bullet>You may not share your account with others or allow others to access your account</Bullet>
            <Bullet>You may delete your account at any time in Settings → Danger Zone → Delete Account</Bullet>
          </Section>

          <Section title="2. Community Participation">
            <Body>Neighborly is a community platform. When participating in the community, you agree to:</Body>
            <Bullet>Treat all other users with respect and dignity</Bullet>
            <Bullet>Post truthful and accurate information</Bullet>
            <Bullet>Use the platform only for lawful purposes</Bullet>
            <Bullet>Follow our Community Guidelines at all times</Bullet>
            <Bullet>Not impersonate any person or entity</Bullet>
            <Bullet>Not create accounts for the purpose of harassment or abuse</Bullet>
          </Section>

          <Section title="3. Community Content Disclaimer">
            <DisclaimerBox>All posts, comments, and community content are created by users and do not represent the views of Neighborly.</DisclaimerBox>
            <Body>Neighborly is a platform that hosts user-generated content. We do not review, verify, or endorse any content posted by users before it is published. You acknowledge that:</Body>
            <Bullet>Content accuracy is not guaranteed — always verify information independently</Bullet>
            <Bullet>Neighborly is not responsible for the accuracy, completeness, or reliability of any user-generated content</Bullet>
            <Bullet>Content may be removed if it violates our Community Guidelines or these Terms</Bullet>
            <Bullet>Neighborly reserves the right to remove any content at its sole discretion</Bullet>
          </Section>

          <Section title="4. Chat and Messaging Disclaimer">
            <DisclaimerBox>Neighborly messaging is a community tool. Do not share sensitive personal, financial, or confidential information through chat.</DisclaimerBox>
            <Body>By using the messaging features, you acknowledge that:</Body>
            <Bullet>Neighborly is not responsible for content exchanged in direct messages or community chat</Bullet>
            <Bullet>You should not share bank details, passwords, home addresses, or financial information via chat</Bullet>
            <Bullet>Neighborly may review messages when investigating reported violations of these Terms</Bullet>
            <Bullet>A first-time safety reminder is displayed when initiating new conversations</Bullet>
            <Bullet>You can block any user at any time in their profile or in Settings → Blocked Users</Bullet>
          </Section>

          <Section title="5. Marketplace and Service Provider Disclaimer">
            <DisclaimerBox>Neighborly is not a party to any transaction, agreement, or dispute between users and service providers.</DisclaimerBox>
            <Body>Neighborly provides a local marketplace platform that enables users to list and discover businesses and services. You acknowledge that:</Body>
            <Bullet>Neighborly does not verify the credentials, qualifications, licenses, or insurance of any listed business or service provider</Bullet>
            <Bullet>Neighborly does not guarantee the quality, safety, or legality of any services or products offered on the platform</Bullet>
            <Bullet>Neighborly is not responsible for any loss, damage, injury, or dispute arising from a transaction or agreement between users</Bullet>
            <Bullet>You engage with businesses and service providers entirely at your own risk</Bullet>
            <Bullet>You are solely responsible for performing your own due diligence before engaging any service provider</Bullet>
            <Bullet>Neighborly does not process any payments between users — all transactions are conducted independently off-platform</Bullet>

            <SubTitle>Premium Listings</SubTitle>
            <Body>Premium listing status indicates an admin-approved visibility enhancement only. It does not constitute an endorsement, certification, or guarantee of any service provider's quality or reliability. Premium status is granted by Neighborly administrators following a review of the request.</Body>
          </Section>

          <Section title="6. SOS Emergency Feature Disclaimer">
            <DisclaimerBox>THE SOS FEATURE IS A COMMUNITY COORDINATION TOOL ONLY. IT IS NOT A SUBSTITUTE FOR OFFICIAL EMERGENCY SERVICES.</DisclaimerBox>
            <Body>By using the SOS emergency feature, you expressly acknowledge and agree that:</Body>
            <Bullet>The SOS feature enables you to notify nearby community members of an emergency — it does not dispatch professional emergency services</Bullet>
            <Bullet>You must always contact official emergency services (such as 911, 15, 1122, or 112) for life-threatening situations — do not rely solely on Neighborly SOS</Bullet>
            <Bullet>Response times, availability of responders, and the ability of responders to assist are not guaranteed</Bullet>
            <Bullet>Neighborly bears no liability whatsoever for any outcome, injury, loss, or death arising from use of or reliance on the SOS feature</Bullet>
            <Bullet>Misuse of SOS alerts (including fake alerts, test alerts, or repeated abuse) may result in immediate account suspension</Bullet>
            <Bullet>SOS alerts automatically expire based on alert type; expired alerts do not indicate that an emergency has been resolved</Bullet>
          </Section>

          <Section title="7. Karma and Reputation">
            <Body>Neighborly's Karma system rewards positive community contributions. You acknowledge that:</Body>
            <Bullet>Karma points have no monetary value and cannot be transferred, sold, redeemed, or exchanged</Bullet>
            <Bullet>Karma points are awarded at the discretion of the platform and may be adjusted by administrators</Bullet>
            <Bullet>Karma levels and badges are indicators of community participation only and do not confer any rights or privileges outside the platform</Bullet>
          </Section>

          <Section title="8. Content You Post">
            <Body>You retain ownership of content you post on Neighborly. By posting content, you grant Neighborly a non-exclusive, royalty-free license to display, distribute, and use that content to operate the platform. You represent that:</Body>
            <Bullet>You own or have the right to post the content</Bullet>
            <Bullet>The content does not violate any third-party rights</Bullet>
            <Bullet>The content complies with our Community Guidelines</Bullet>
            <Body>You may delete your own content at any time. When you delete your account, all your content is permanently removed.</Body>
          </Section>

          <Section title="9. Prohibited Conduct">
            <Body>You agree not to:</Body>
            <Bullet>Harass, threaten, or intimidate any user</Bullet>
            <Bullet>Post hate speech, discriminatory content, or content that incites violence</Bullet>
            <Bullet>Scam, defraud, or deceive other users</Bullet>
            <Bullet>Post fake or misleading emergency alerts</Bullet>
            <Bullet>Impersonate any person, business, or organization</Bullet>
            <Bullet>Attempt to gain unauthorized access to any account or system</Bullet>
            <Bullet>Use the platform to distribute spam, malware, or illegal content</Bullet>
            <Bullet>Scrape, crawl, or extract data from the platform by automated means</Bullet>
            <Bullet>Use the platform for any unlawful purpose</Bullet>
          </Section>

          <Section title="10. Reporting and Moderation">
            <Body>Neighborly provides in-app reporting tools to flag content that violates these Terms. You acknowledge that:</Body>
            <Bullet>Reports are reviewed by Neighborly's moderation team</Bullet>
            <Bullet>Neighborly reserves the right to remove content and suspend or terminate accounts at its sole discretion</Bullet>
            <Bullet>Moderation decisions are final, subject to appeal by contacting {CONTACT_EMAIL}</Bullet>
            <Bullet>Filing false reports may result in action against your account</Bullet>
          </Section>

          <Section title="11. Account Suspension and Termination">
            <Body>Neighborly may suspend or terminate your account without notice if you:</Body>
            <Bullet>Violate these Terms or our Community Guidelines</Bullet>
            <Bullet>Engage in fraudulent or abusive behavior</Bullet>
            <Bullet>Misuse the SOS emergency feature</Bullet>
            <Bullet>Create multiple accounts to evade a suspension</Bullet>
            <Body>You may appeal a suspension by contacting {CONTACT_EMAIL}. You may also terminate your own account at any time in Settings.</Body>
          </Section>

          <Section title="12. Limitation of Liability">
            <DisclaimerBox>To the maximum extent permitted by applicable law, Neighborly shall not be liable for any indirect, incidental, special, consequential, or punitive damages.</DisclaimerBox>
            <Body>Neighborly provides the platform "as is" and "as available" without warranties of any kind, express or implied. Neighborly specifically disclaims all liability for:</Body>
            <Bullet>Outcomes arising from reliance on the SOS emergency feature</Bullet>
            <Bullet>Disputes, losses, or damages arising from transactions or agreements between users</Bullet>
            <Bullet>The accuracy, reliability, or completeness of user-generated content</Bullet>
            <Bullet>Loss of data, interruption of service, or technical failures</Bullet>
            <Bullet>Actions taken by other users of the platform</Bullet>
            <Bullet>Any direct or indirect harm arising from your use of or inability to use the platform</Bullet>
            <Body>In jurisdictions that do not allow the exclusion of certain warranties or limitation of liability, Neighborly's liability is limited to the maximum extent permitted by law.</Body>
          </Section>

          <Section title="13. Privacy">
            <Body>Your use of Neighborly is also governed by our Privacy Policy, which is incorporated into these Terms by reference. Please review our Privacy Policy to understand our data practices.</Body>
          </Section>

          <Section title="14. Governing Law">
            <Body>These Terms shall be governed by and construed in accordance with applicable law. Any disputes arising from these Terms or your use of Neighborly shall be resolved through good-faith negotiation. If a dispute cannot be resolved informally, it shall be subject to binding arbitration or the jurisdiction of courts as determined by applicable local law.</Body>
          </Section>

          <Section title="15. Changes to These Terms">
            <Body>Neighborly reserves the right to modify these Terms at any time. When we make material changes, we will update the effective date and notify you within the app. Continued use of Neighborly after changes become effective constitutes your acceptance of the revised Terms.</Body>
          </Section>

          <Section title="16. Contact Us">
            <Body>For questions or concerns about these Terms, contact us at:</Body>
            <Body>Email: {CONTACT_EMAIL}</Body>
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
    backgroundColor: '#EEF2FF', margin: 16, borderRadius: 14,
    padding: 16, borderWidth: 1, borderColor: '#C7D2FE',
  },
  introText: { fontSize: 13, color: '#3730A3', lineHeight: 22 },
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
  disclaimerBox: {
    flexDirection: 'row', alignItems: 'flex-start',
    backgroundColor: '#FEF3C7', borderRadius: 10, padding: 12,
    marginBottom: 12, borderWidth: 1, borderColor: '#FDE68A',
  },
  disclaimerText: { fontSize: 12, color: '#92400E', lineHeight: 20, flex: 1, fontWeight: '600' },
  footer: { alignItems: 'center', marginTop: 16, paddingBottom: 8 },
  footerText: { fontSize: 11, color: '#9CA3AF', marginBottom: 4 },
});
