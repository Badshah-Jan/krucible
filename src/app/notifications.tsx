import { useTranslation } from 'react-i18next';
import React, { useEffect } from 'react';
import {
  View, ScrollView, TouchableOpacity, StyleSheet,
  Switch, ActivityIndicator, Text, StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useNotifications } from '@/hooks/useNotifications';
import NotificationService from '@/services/notificationService';
import { AuthService } from '@/services/authService';
import { UserService } from '@/services/userService';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '@/services/firebase';

// ─── Design Tokens ────────────────────────────────────────────────────────────
const T = {
  bg:            '#F8F9FA',
  card:          '#FFFFFF',
  text:          '#111827',
  textSecondary: '#6B7280',
  border:        '#E5E7EB',
  primary:       '#EF4444',
  blue:          '#2563EB',
};

const getTimeAgo = (ts: any): string => {
  if (!ts) return '';
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  const s = Math.floor((Date.now() - d.getTime()) / 1000);
  if (s < 60) return 'Just now';
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
};

const TYPE_CONFIG: Record<string, { icon: string; color: string; bg: string; label: string }> = {
  sos_alert:      { icon: 'alert-circle', color: '#EF4444', bg: '#FEE2E2', label: 'Emergency' },
  help_request:   { icon: 'hand-left',    color: '#2563EB', bg: '#DBEAFE', label: 'Help Request' },
  comment:        { icon: 'chatbubble',   color: '#6366F1', bg: '#EEF2FF', label: 'Comment' },
  comment_reply:  { icon: 'chatbubbles',  color: '#6366F1', bg: '#EEF2FF', label: 'Reply' },
  like_notification: { icon: 'heart',      color: '#EF4444', bg: '#FEE2E2', label: 'Like' },
  direct_message: { icon: 'mail',         color: '#10B981', bg: '#D1FAE5', label: 'Message' },
  community_update: { icon: 'people',     color: '#F59E0B', bg: '#FEF3C7', label: 'Community' },
  recommendation: { icon: 'bulb',         color: '#8B5CF6', bg: '#EDE9FE', label: 'Recommendation' },
  lost_found:     { icon: 'search',       color: '#D97706', bg: '#FEF3C7', label: 'Lost & Found' },
  karma_reward:   { icon: 'star',         color: '#F59E0B', bg: '#FEF3C7', label: 'Karma' },
  default:        { icon: 'notifications',color: '#6B7280', bg: '#F3F4F6', label: 'Update' },
};

export default function NotificationsScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { notifications, unreadCount, loading, markAsRead, markAllAsRead } = useNotifications();
  const currentUser = AuthService.getCurrentUser();

  const [pushEnabled, setPushEnabled] = React.useState(true);
  const [sosEnabled, setSosEnabled] = React.useState(true);
  const [mentionsEnabled, setMentionsEnabled] = React.useState(true);

  useEffect(() => {
    if (currentUser?.uid) {
      const unsubscribe = onSnapshot(doc(db, 'users', currentUser.uid), (docSnap: any) => {
        if (docSnap.exists()) {
          const u = docSnap.data();
          if (u?.notificationPreferences) {
            setPushEnabled(u.notificationPreferences.pushEnabled !== false);
            setSosEnabled(u.notificationPreferences.sos !== false);
            setMentionsEnabled(u.notificationPreferences.mentions !== false);
          }
        }
      });
      return () => unsubscribe();
    }
  }, [currentUser?.uid]);

  const togglePreference = async (key: 'pushEnabled' | 'sos' | 'mentions', value: boolean) => {
    if (!currentUser?.uid) return;
    
    // Optimistic update
    if (key === 'pushEnabled') setPushEnabled(value);
    if (key === 'sos') setSosEnabled(value);
    if (key === 'mentions') setMentionsEnabled(value);
    
    try {
      await UserService.updateNotificationPreferences(currentUser.uid, { [key]: value });
      if (key === 'pushEnabled') {
        await NotificationService.handlePushToggleChange(currentUser.uid, value);
      }
    } catch (e) {
      console.error('Failed to update preference:', e);
      // Revert on failure
      if (key === 'pushEnabled') setPushEnabled(!value);
      if (key === 'sos') setSosEnabled(!value);
      if (key === 'mentions') setMentionsEnabled(!value);
    }
  };

  const handleNotificationPress = async (notif: any) => {
    if (!notif.read) await markAsRead(notif.id);
    switch (notif.type) {
      case 'sos_alert':
      case 'comment':
      case 'comment_reply':
      case 'help_request':
      case 'like_notification':
      case 'community_update':
      case 'recommendation':
      case 'lost_found':
        if (notif.data?.postId) router.push(`/post/${notif.data.postId}`);
        break;
      case 'direct_message':
        if (notif.data?.chatId) router.push(`/chat/${notif.data.chatId}`);
        break;
      case 'karma_reward': router.push('/karma'); break;
      default: break;
    }
  };

  const getConfig = (type: string) => TYPE_CONFIG[type] || TYPE_CONFIG.default;

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" backgroundColor="#F8F9FA" />
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>

        {/* ── Header ── */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={20} color={T.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>
            Notifications{unreadCount > 0 ? ` (${unreadCount})` : ''}
          </Text>
          {unreadCount > 0 ? (
            <TouchableOpacity onPress={markAllAsRead} style={styles.markAllBtn}>
              <Text style={styles.markAllText}>Mark all read</Text>
            </TouchableOpacity>
          ) : (
            <View style={{ width: 80 }} />
          )}
        </View>

        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 100 }}
          showsVerticalScrollIndicator={false}
        >

          {/* ── Preferences ── */}
          <Text style={styles.sectionLabel}>PREFERENCES</Text>
          <View style={styles.card}>
            <PrefRow
              label="Push Notifications"
              sub="Receive alerts on your device"
              value={pushEnabled}
              onChange={(v) => togglePreference('pushEnabled', v)}
              trackOn={T.blue}
            />
            <View style={styles.divider} />
            <PrefRow
              label="SOS Alerts"
              sub="Emergency alerts in your area"
              value={sosEnabled}
              onChange={(v) => togglePreference('sos', v)}
              trackOn={T.primary}
              labelColor={T.primary}
            />
            <View style={styles.divider} />
            <PrefRow
              label="Mentions & Replies"
              sub="When someone responds to you"
              value={mentionsEnabled}
              onChange={(v) => togglePreference('mentions', v)}
              trackOn={T.blue}
            />
          </View>

          {/* ── Recent Notifications ── */}
          <Text style={[styles.sectionLabel, { marginTop: 24 }]}>RECENT</Text>

          {loading ? (
            <View style={styles.centered}>
              <ActivityIndicator size="small" color={T.primary} />
            </View>
          ) : notifications.length === 0 ? (
            <View style={styles.emptyCard}>
              <View style={styles.emptyIconWrap}>
                <Ionicons name="notifications-off-outline" size={28} color={T.textSecondary} />
              </View>
              <Text style={styles.emptyTitle}>No notifications yet</Text>
              <Text style={styles.emptySubtitle}>We'll let you know when something happens in your community.</Text>
            </View>
          ) : (
            <View style={styles.card}>
              {notifications.map((notif, index) => {
                const cfg = getConfig(notif.type);
                return (
                  <React.Fragment key={notif.id}>
                    <TouchableOpacity
                      style={[styles.notifRow, !notif.read && styles.notifRowUnread]}
                      onPress={() => handleNotificationPress(notif)}
                      activeOpacity={0.75}
                    >
                      {/* Icon */}
                      <View style={[styles.notifIcon, { backgroundColor: cfg.bg }]}>
                        <Ionicons name={cfg.icon as any} size={18} color={cfg.color} />
                      </View>

                      {/* Text */}
                      <View style={styles.notifText}>
                        <View style={styles.notifTopRow}>
                          <Text style={styles.notifTitle} numberOfLines={1}>{notif.title}</Text>
                          {!notif.read && <View style={styles.unreadDot} />}
                        </View>
                        <Text style={styles.notifBody} numberOfLines={2}>{notif.body}</Text>
                        <Text style={styles.notifTime}>{getTimeAgo(notif.createdAt)}</Text>
                      </View>

                      {/* Type badge */}
                      <View style={[styles.typeBadge, { backgroundColor: cfg.bg }]}>
                        <Text style={[styles.typeBadgeText, { color: cfg.color }]}>{cfg.label}</Text>
                      </View>
                    </TouchableOpacity>
                    {index < notifications.length - 1 && <View style={styles.divider} />}
                  </React.Fragment>
                );
              })}
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

// ── Pref Row ─────────────────────────────────────────────────────────────────
function PrefRow({
  label, sub, value, onChange, trackOn, labelColor
}: {
  label: string; sub: string; value: boolean;
  onChange: (v: boolean) => void; trackOn: string; labelColor?: string;
}) {
  return (
    <View style={styles.prefRow}>
      <View style={{ flex: 1 }}>
        <Text style={[styles.prefLabel, { color: labelColor || T.text }]}>{label}</Text>
        <Text style={styles.prefSub}>{sub}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={onChange}
        trackColor={{ false: '#E5E7EB', true: trackOn }}
        thumbColor="#FFFFFF"
        ios_backgroundColor="#E5E7EB"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: T.bg,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: T.bg,
    borderBottomWidth: 1,
    borderBottomColor: T.border,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: T.card,
    borderWidth: 1,
    borderColor: T.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    color: T.text,
    fontSize: 17,
    fontWeight: '800',
    marginLeft: 12,
    letterSpacing: -0.3,
  },
  markAllBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 100,
    backgroundColor: '#EFF6FF',
  },
  markAllText: {
    color: T.blue,
    fontSize: 12,
    fontWeight: '700',
  },

  // Section labels
  sectionLabel: {
    color: T.textSecondary,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.2,
    marginBottom: 8,
    marginTop: 20,
  },

  // Card
  card: {
    backgroundColor: T.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: T.border,
    overflow: 'hidden',
  },

  divider: {
    height: 1,
    backgroundColor: T.border,
  },

  // Preferences
  prefRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  prefLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: T.text,
    marginBottom: 2,
  },
  prefSub: {
    fontSize: 11,
    color: T.textSecondary,
  },

  // Empty state
  emptyCard: {
    backgroundColor: T.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: T.border,
    paddingVertical: 36,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  emptyIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  emptyTitle: {
    color: T.text,
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 6,
  },
  emptySubtitle: {
    color: T.textSecondary,
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 19,
  },

  // Notification rows
  notifRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 14,
    paddingVertical: 14,
    gap: 12,
  },
  notifRowUnread: {
    backgroundColor: '#FAFBFF',
  },
  notifIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  notifText: {
    flex: 1,
  },
  notifTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
  },
  notifTitle: {
    color: T.text,
    fontSize: 13,
    fontWeight: '700',
    flex: 1,
  },
  unreadDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: T.blue,
    flexShrink: 0,
  },
  notifBody: {
    color: T.textSecondary,
    fontSize: 12,
    lineHeight: 17,
    marginBottom: 4,
  },
  notifTime: {
    color: '#9CA3AF',
    fontSize: 10,
    fontWeight: '500',
  },
  typeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 100,
    flexShrink: 0,
    alignSelf: 'flex-start',
  },
  typeBadgeText: {
    fontSize: 9,
    fontWeight: '700',
  },

  centered: {
    paddingVertical: 40,
    alignItems: 'center',
  },
});
