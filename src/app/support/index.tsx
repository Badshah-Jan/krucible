import React, { useState } from 'react';
import {
  View,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  Linking,
  Alert,
} from 'react-native';
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

function SupportOption({
  icon,
  title,
  description,
  color,
  onPress,
}: {
  icon: string;
  title: string;
  description: string;
  color: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity style={styles.optionCard} onPress={onPress} activeOpacity={0.8}>
      <View style={[styles.optionIcon, { backgroundColor: color + '10', borderColor: color + '20' }]}>
        <Ionicons name={icon as any} size={24} color={color} />
      </View>
      <View style={styles.optionContent}>
        <Text style={styles.optionTitle}>{title}</Text>
        <Text style={styles.optionDesc}>{description}</Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
    </TouchableOpacity>
  );
}

function GuidelineItem({ icon, text }: { icon: string; text: string }) {
  return (
    <View style={styles.guidelineItem}>
      <View style={styles.guidelineIcon}>
        <Ionicons name={icon as any} size={16} color="#10B981" />
      </View>
      <Text style={styles.guidelineText}>{text}</Text>
    </View>
  );
}

export default function SupportScreen() {
  const router = useRouter();
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);

  const handleEmailSupport = () => {
    const email = 'badshahkha656@gmail.com';
    const subject = 'AasPaas Support Request';
    const body = 'Please describe your issue:\n\n';
    const mailtoUrl = `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    
    Linking.openURL(mailtoUrl).catch(() => {
      Alert.alert('Error', 'Unable to open email client. Please email us at badshahkha656@gmail.com');
    });
  };

  const faqs = [
    {
      q: 'How do I report an emergency?',
      a: 'Tap the SOS Alert button on the home screen. This will immediately notify all nearby neighbors and emergency contacts.',
    },
    {
      q: 'How is my location shared?',
      a: 'Your exact location is only shared when you create a post or send an SOS alert. You can control location visibility in Settings > Privacy.',
    },
    {
      q: 'How do I block a user?',
      a: 'Go to their profile, tap the three dots menu, and select "Block User". You can manage blocked users in Settings > Blocked Users.',
    },
    {
      q: 'What is Karma and how do I earn it?',
      a: 'Karma points are earned by helping neighbors, responding to SOS alerts, and being an active community member. View your Karma Dashboard in Profile > Karma.',
    },
    {
      q: 'How do I delete my account?',
      a: 'Go to Settings > Delete Account. Note: This action is permanent and will delete all your data.',
    },
  ];

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" backgroundColor={T.bg} />
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={20} color={T.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Help & Support</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
          
          {/* Support Options */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>GET HELP</Text>
            
            <SupportOption
              icon="chatbubbles"
              title="Chat with Support AI"
              description="Get instant answers to your questions"
              color="#2563EB"
              onPress={() => router.push('/support/ai-chat' as any)}
            />
            
            <SupportOption
              icon="mail"
              title="Email Support"
              description="badshahkha656@gmail.com"
              color="#10B981"
              onPress={handleEmailSupport}
            />
            
            <SupportOption
              icon="document-text"
              title="Community Guidelines"
              description="Learn how to be a good neighbor"
              color="#F59E0B"
              onPress={() => router.push('/support/guidelines' as any)}
            />
          </View>

          {/* Quick Guidelines */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>COMMUNICATION GUIDELINES</Text>
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Ionicons name="shield-checkmark" size={20} color="#10B981" />
                <Text style={styles.cardHeaderText}>Be Respectful & Safe</Text>
              </View>
              
              <GuidelineItem icon="checkmark-circle" text="Be respectful and kind to all neighbors" />
              <GuidelineItem icon="checkmark-circle" text="Keep personal information private" />
              <GuidelineItem icon="checkmark-circle" text="Use SOS alerts only for real emergencies" />
              <GuidelineItem icon="checkmark-circle" text="Report suspicious activity to moderators" />
              <GuidelineItem icon="checkmark-circle" text="Help build a safe community" />
              
              <TouchableOpacity 
                style={styles.guidelinesBtn}
                onPress={() => router.push('/support/guidelines' as any)}
              >
                <Text style={styles.guidelinesBtnText}>View Full Guidelines →</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* FAQs */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>FREQUENTLY ASKED QUESTIONS</Text>
            <View style={styles.card}>
              {faqs.map((faq, index) => (
                <View key={index}>
                  <TouchableOpacity
                    style={styles.faqItem}
                    onPress={() => setExpandedFaq(expandedFaq === index ? null : index)}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.faqQuestion}>{faq.q}</Text>
                    <Ionicons
                      name={expandedFaq === index ? 'chevron-up' : 'chevron-down'}
                      size={18}
                      color="#6B7280"
                    />
                  </TouchableOpacity>
                  {expandedFaq === index && (
                    <View style={styles.faqAnswer}>
                      <Text style={styles.faqAnswerText}>{faq.a}</Text>
                    </View>
                  )}
                  {index < faqs.length - 1 && <View style={styles.divider} />}
                </View>
              ))}
            </View>
          </View>

          {/* Contact Info */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>CONTACT US</Text>
            <View style={styles.card}>
              <View style={styles.contactRow}>
                <View style={styles.contactIcon}>
                  <Ionicons name="mail" size={18} color="#10B981" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.contactLabel}>Email</Text>
                  <Text style={styles.contactValue}>badshahkha656@gmail.com</Text>
                </View>
                <TouchableOpacity onPress={handleEmailSupport}>
                  <Ionicons name="send" size={18} color={T.primary} />
                </TouchableOpacity>
              </View>
              
              <View style={styles.divider} />
              
              <View style={styles.contactRow}>
                <View style={styles.contactIcon}>
                  <Ionicons name="time" size={18} color="#2563EB" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.contactLabel}>Response Time</Text>
                  <Text style={styles.contactValue}>Within 24 hours</Text>
                </View>
              </View>
            </View>
          </View>

          {/* App Info */}
          <View style={styles.appInfo}>
            <Text style={styles.appInfoText}>AasPaas v1.0.0</Text>
            <Text style={styles.appInfoText}>Build 42 · Production</Text>
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
  section: { paddingHorizontal: 16, marginBottom: 24 },
  sectionLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#9CA3AF',
    letterSpacing: 1.5,
    marginBottom: 12,
  },
  
  optionCard: {
    backgroundColor: T.card,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: T.border,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 2,
  },
  optionIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  optionContent: { flex: 1 },
  optionTitle: { fontSize: 14, fontWeight: '700', color: T.text, marginBottom: 2 },
  optionDesc: { fontSize: 12, color: T.textSecondary },
  
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
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 14,
  },
  cardHeaderText: { fontSize: 14, fontWeight: '800', color: T.text },
  
  guidelineItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  guidelineIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#ECFDF5',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  guidelineText: { fontSize: 13, color: T.textSecondary, flex: 1, lineHeight: 20 },
  guidelinesBtn: {
    marginTop: 10,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: T.border,
    alignItems: 'center',
  },
  guidelinesBtnText: { fontSize: 13, fontWeight: '700', color: T.primary },
  
  faqItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  faqQuestion: { fontSize: 13, fontWeight: '700', color: T.text, flex: 1, marginRight: 10 },
  faqAnswer: { paddingBottom: 12 },
  faqAnswerText: { fontSize: 13, color: T.textSecondary, lineHeight: 20 },
  divider: { height: 1, backgroundColor: '#F3F4F6' },
  
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  contactIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  contactLabel: { fontSize: 10, fontWeight: '700', color: '#9CA3AF', marginBottom: 2 },
  contactValue: { fontSize: 13, fontWeight: '600', color: T.text },
  
  appInfo: { alignItems: 'center', marginTop: 10 },
  appInfoText: { fontSize: 10, color: '#9CA3AF', marginBottom: 4 },
});
