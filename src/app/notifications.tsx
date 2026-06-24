import { useTranslation } from 'react-i18next';
import React from 'react';
import {
  View, ScrollView, TouchableOpacity, StyleSheet,
  ActivityIndicator, Text, StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useNotifications } from '@/hooks/useNotifications';
import { AuthService } from '@/services/authService';

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
  if (!ts) return 'Just now';
  let d: Date;
  if (ts.toDate) {
    d = ts.toDate();
  } else if (ts.seconds) {
    d = new Date(ts.seconds * 1000);
  } else {
    d = new Date(ts);
  }
  const s = Math.floor((Date.now() - d.getTime()) / 1000);
  if (isNaN(s) || s < 60) return 'Just now';
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
};

const TYPE_CONFIG: Record<string, { icon: string; color: string; bg: string; label: string }> = {
  sos_alert:      { icon: 'alert-circle', color: '#FFFFFF', bg: '#E51D53', label: 'Emergency' }, // Airbnb Red/Pink
  help_request:   { icon: 'hand-left',    color: '#008489', bg: '#E6F3F3', label: 'Help Request' }, // Teal
  recommendation: { icon: 'star',         color: '#7B0051', bg: '#F2E5EC', label: 'Recommendation' }, // Deep Aubergine
  service_update: { icon: 'briefcase',    color: '#008489', bg: '#E6F3F3', label: 'Service' },
  lost_found:     { icon: 'search',       color: '#D93900', bg: '#FBEBE5', label: 'Lost & Found' }, // Burnt Orange
  comment:        { icon: 'chatbubble',   color: '#484848', bg: '#F2F2F2', label: 'Reply' }, // Dark Gray
  comment_reply:  { icon: 'chatbubbles',  color: '#484848', bg: '#F2F2F2', label: 'Discussion' },
  direct_message: { icon: 'mail',         color: '#484848', bg: '#F2F2F2', label: 'Message' },
  community_update: { icon: 'people',     color: '#008489', bg: '#E6F3F3', label: 'Community' },

  default:        { icon: 'notifications',color: '#767676', bg: '#F2F2F2', label: 'Update' },
};

// Helper to group notifications
const groupNotifications = (notifs: any[]) => {
  const today: any[] = [];
  const yesterday: any[] = [];
  const older: any[] = [];

  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const startOfYesterday = startOfToday - 86400000;

  notifs.forEach(n => {
    const ts = n.createdAt?.toDate ? n.createdAt.toDate().getTime() : new Date(n.createdAt).getTime();
    if (ts >= startOfToday) {
      today.push(n);
    } else if (ts >= startOfYesterday) {
      yesterday.push(n);
    } else {
      older.push(n);
    }
  });

  return { today, yesterday, older };
};

export default function NotificationsScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { notifications, unreadCount, loading, markAsRead, markAllAsRead } = useNotifications();
  const currentUser = AuthService.getCurrentUser();

  const handleNotificationPress = async (notif: any) => {
    if (!notif.read) await markAsRead(notif.id);
    switch (notif.type) {
      case 'sos_alert':
        if (notif.data?.sosId) router.push(`/sos/${notif.data.sosId}`);
        else router.push(`/sos`);
        break;
      case 'comment':
      case 'comment_reply':
      case 'help_request':
      case 'recommendation':
      case 'lost_found':
        if (notif.data?.postId) router.push(`/post/${notif.data.postId}`);
        break;
      case 'direct_message':
      case 'service_update':
      case 'community_update':
        if (notif.data?.chatId) router.push(`/chat/${notif.data.chatId}`);
        else router.push(`/(tabs)/chats`);
        break;
      default: break;
    }
  };

  const grouped = groupNotifications(notifications);
  const getConfig = (type: string) => TYPE_CONFIG[type] || TYPE_CONFIG.default;

  const renderGroup = (title: string, groupNotifs: any[]) => {
    if (groupNotifs.length === 0) return null;
    return (
      <View style={{ marginBottom: 24 }}>
        <Text style={styles.sectionLabel}>{title}</Text>
        <View style={styles.card}>
          {groupNotifs.map((notif, index) => {
            const cfg = getConfig(notif.type);
            return (
              <React.Fragment key={notif.id}>
                <TouchableOpacity
                  style={[styles.notifRow, !notif.read && styles.notifRowUnread]}
                  onPress={() => handleNotificationPress(notif)}
                  activeOpacity={0.75}
                >
                  <View style={[styles.notifIcon, { backgroundColor: cfg.bg }]}>
                    <Ionicons name={cfg.icon as any} size={18} color={cfg.color} />
                  </View>
                  <View style={styles.notifText}>
                    <View style={styles.notifTopRow}>
                      <Text style={[styles.notifTitle, !notif.read && { fontWeight: '800' }]} numberOfLines={1}>{notif.title}</Text>
                      {!notif.read && <View style={styles.unreadDot} />}
                    </View>
                    <Text style={styles.notifBody} numberOfLines={2}>{notif.body}</Text>
                    <View style={styles.metaRow}>
                      <Text style={styles.notifTime}>{getTimeAgo(notif.createdAt)}</Text>
                      <View style={[styles.typeBadge, { backgroundColor: cfg.bg }]}>
                        <Text style={[styles.typeBadgeText, { color: cfg.color }]}>{cfg.label}</Text>
                      </View>
                    </View>
                  </View>
                </TouchableOpacity>
                {index < groupNotifs.length - 1 && <View style={styles.divider} />}
              </React.Fragment>
            );
          })}
        </View>
      </View>
    );
  };

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <SafeAreaView style={{ flex: 1, backgroundColor: '#FFFFFF' }} edges={['top']}>

        {/* ── Header ── */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={24} color={T.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>
            Notifications
          </Text>
          {unreadCount > 0 && (
            <TouchableOpacity onPress={markAllAsRead} style={styles.markAllBtn}>
              <Text style={styles.markAllText}>Mark read</Text>
            </TouchableOpacity>
          )}
        </View>

        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 100, paddingTop: 16 }}
          showsVerticalScrollIndicator={false}
        >

          {loading ? (
            <View style={styles.centered}>
              <ActivityIndicator size="small" color={T.primary} />
            </View>
          ) : notifications.length === 0 ? (
            <View style={styles.emptyCard}>
              <View style={styles.emptyIconWrap}>
                <Ionicons name="notifications-outline" size={28} color="#767676" />
              </View>
              <Text style={styles.emptyTitle}>No notifications yet</Text>
              <Text style={styles.emptySubtitle}>You're all caught up with your community.</Text>
            </View>
          ) : (
            <View>
              {renderGroup("TODAY", grouped.today)}
              {renderGroup("YESTERDAY", grouped.yesterday)}
              {renderGroup("OLDER", grouped.older)}
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
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
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#EBEBEB',
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#EBEBEB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    color: '#222222',
    fontSize: 18,
    fontWeight: '700',
    marginLeft: 16,
  },
  markAllBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#F7F7F7',
  },
  markAllText: {
    color: '#222222',
    fontSize: 13,
    fontWeight: '600',
  },

  // Section labels
  sectionLabel: {
    color: '#222222',
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 12,
    marginTop: 8,
  },

  // Card
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#EBEBEB',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },

  divider: {
    height: 1,
    backgroundColor: '#EBEBEB',
  },

  // Empty state
  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#EBEBEB',
    paddingVertical: 48,
    paddingHorizontal: 24,
    alignItems: 'center',
    marginTop: 24,
  },
  emptyIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#F7F7F7',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    color: '#222222',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
  },
  emptySubtitle: {
    color: '#717171',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },

  // Notification rows
  notifRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 14,
  },
  notifRowUnread: {
    backgroundColor: '#F7F7F7',
  },
  notifIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
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
    marginBottom: 4,
  },
  notifTitle: {
    color: '#222222',
    fontSize: 15,
    fontWeight: '500',
    flex: 1,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#008489',
    flexShrink: 0,
  },
  notifBody: {
    color: '#717171',
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 8,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  notifTime: {
    color: '#B0B0B0',
    fontSize: 12,
    fontWeight: '500',
  },
  typeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    flexShrink: 0,
  },
  typeBadgeText: {
    fontSize: 10,
    fontWeight: '700',
  },

  centered: {
    paddingVertical: 40,
    alignItems: 'center',
  },
});
