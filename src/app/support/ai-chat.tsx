import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
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

type Message = {
  id: string;
  text: string;
  isAI: boolean;
  timestamp: Date;
};

const AI_RESPONSES: Record<string, string> = {
  'sos': 'To send an SOS alert, tap the red SOS Alert button on your home screen. This will immediately notify all neighbors within 5km and your emergency contacts.',
  'emergency': 'For emergencies, use the SOS Alert feature on the home screen. For non-urgent help, create a post in the Help Requests category.',
  'location': 'Your location is only shared when you create a post or SOS alert. You can control location sharing in Settings > Privacy > Location Visibility.',
  'block': 'To block a user: Go to their profile > tap the three dots menu > select "Block User". Manage blocked users in Settings > Blocked Users.',

  'delete': 'To delete your account: Go to Settings > scroll down > tap "Delete Account". Note: This permanently deletes all your data and cannot be undone.',
  'notification': 'Manage notifications in Settings > Notifications. You can toggle different notification types like SOS alerts, chat messages, and community updates.',
  'privacy': 'Control your privacy in Settings > Privacy & Safety. You can manage profile visibility, activity status, location sharing, and distance display.',
  'contact': 'You can reach us at badshahkha656@gmail.com. We typically respond within 24 hours.',
};

function getAIResponse(userMessage: string): string {
  const lowerMsg = userMessage.toLowerCase();
  
  for (const [key, response] of Object.entries(AI_RESPONSES)) {
    if (lowerMsg.includes(key)) {
      return response;
    }
  }
  
  return "I'm here to help! You can ask me about SOS alerts, location settings, blocking users, notifications, privacy settings, or how to contact support. What would you like to know?";
}

export default function AIChatScreen() {
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      text: "Hi! I'm your AasPaas Support AI. I can help you with questions about using the app, privacy settings, SOS alerts, and more. How can I assist you today?",
      isAI: true,
      timestamp: new Date(),
    },
  ]);
  const [inputText, setInputText] = useState('');
  const flatListRef = useRef<FlatList>(null);

  const handleSend = () => {
    if (!inputText.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      text: inputText.trim(),
      isAI: false,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputText('');

    setTimeout(() => {
      const aiResponse: Message = {
        id: (Date.now() + 1).toString(),
        text: getAIResponse(inputText),
        isAI: true,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, aiResponse]);
    }, 800);
  };

  useEffect(() => {
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 100);
  }, [messages]);

  const renderMessage = ({ item }: { item: Message }) => (
    <View style={[styles.messageBubble, item.isAI ? styles.aiBubble : styles.userBubble]}>
      {item.isAI && (
        <View style={styles.aiAvatar}>
          <Ionicons name="chatbubbles" size={14} color="#2563EB" />
        </View>
      )}
      <View style={[styles.bubble, item.isAI ? styles.aiBubbleContent : styles.userBubbleContent]}>
        <Text style={[styles.messageText, item.isAI ? { color: T.text } : { color: '#FFFFFF' }]}>
          {item.text}
        </Text>
        <Text style={[styles.timestamp, item.isAI ? { color: T.textSecondary } : { color: 'rgba(255,255,255,0.7)' }]}>
          {item.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </Text>
      </View>
    </View>
  );

  const quickQuestions = [
    'How do I send SOS?',
    'Location settings',
    'Block a user',
  ];

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" backgroundColor={T.bg} />
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={20} color={T.text} />
          </TouchableOpacity>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <View style={styles.headerInfo}>
              <View style={styles.aiHeaderIcon}>
                <Ionicons name="chatbubbles" size={16} color="#2563EB" />
              </View>
              <View>
                <Text style={styles.headerTitle}>Support AI</Text>
                <Text style={styles.headerStatus}>● Online</Text>
              </View>
            </View>
          </View>
        </View>

        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={{ flex: 1 }}
        >
          <FlatList
            ref={flatListRef}
            data={messages}
            keyExtractor={(item) => item.id}
            renderItem={renderMessage}
            contentContainerStyle={styles.messagesList}
            onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
          />

          {messages.length === 1 && (
            <View style={styles.quickQuestionsContainer}>
              <Text style={styles.quickQuestionsLabel}>Quick questions:</Text>
              <View style={styles.quickQuestionsRow}>
                {quickQuestions.map((q, i) => (
                  <TouchableOpacity
                    key={i}
                    style={styles.quickQuestionChip}
                    onPress={() => {
                      setInputText(q);
                      handleSend();
                    }}
                  >
                    <Text style={styles.quickQuestionText}>{q}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              placeholder="Ask me anything..."
              placeholderTextColor="#9CA3AF"
              value={inputText}
              onChangeText={setInputText}
              multiline
              maxLength={500}
            />
            <TouchableOpacity
              style={[styles.sendBtn, !inputText.trim() && { opacity: 0.4 }]}
              onPress={handleSend}
              disabled={!inputText.trim()}
            >
              <Ionicons name="send" size={18} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: T.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: T.border,
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
  headerInfo: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  aiHeaderIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: { fontSize: 15, fontWeight: '800', color: T.text },
  headerStatus: { fontSize: 11, color: '#10B981', marginTop: 1 },

  messagesList: { padding: 16, paddingBottom: 8 },
  messageBubble: { flexDirection: 'row', marginBottom: 12, alignItems: 'flex-end' },
  aiBubble: { justifyContent: 'flex-start' },
  userBubble: { justifyContent: 'flex-end' },
  aiAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  bubble: { maxWidth: '80%', borderRadius: 18, padding: 12 },
  aiBubbleContent: { backgroundColor: T.card, borderWidth: 1, borderColor: T.border, borderBottomLeftRadius: 4 },
  userBubbleContent: { backgroundColor: '#2563EB', borderBottomRightRadius: 4 },
  messageText: { fontSize: 14, lineHeight: 20, marginBottom: 4 },
  timestamp: { fontSize: 10 },

  quickQuestionsContainer: { paddingHorizontal: 16, paddingBottom: 12 },
  quickQuestionsLabel: { fontSize: 11, fontWeight: '700', color: T.textSecondary, marginBottom: 8 },
  quickQuestionsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  quickQuestionChip: {
    backgroundColor: T.card,
    borderWidth: 1,
    borderColor: T.border,
    borderRadius: 100,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  quickQuestionText: { fontSize: 12, fontWeight: '600', color: T.text },

  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 12,
    gap: 8,
    backgroundColor: T.card,
    borderTopWidth: 1,
    borderTopColor: T.border,
  },
  input: {
    flex: 1,
    minHeight: 44,
    maxHeight: 100,
    backgroundColor: T.bg,
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
    fontSize: 14,
    color: T.text,
    borderWidth: 1,
    borderColor: T.border,
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#2563EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
