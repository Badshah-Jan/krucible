import React, { useState, useEffect } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';

import GradientBg from '@/components/common/GradientBg';
import Text from '@/components/common/Text';
import { db } from '@/services/firebase';
import { AuthService } from '@/services/authService';
import { UserService, UserProfile } from '@/services/userService';
import { ChatService } from '@/services/chatService';
import { useAppStore } from '@/store/appStore';

// ─── Helpers ──────────────────────────────────────────────────────────────────
const AVATAR_COLORS = ['#C2410C', '#166534', '#1D4ED8', '#B45309', '#6D28D9', '#BE185D'];
function avatarColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}
function getInitials(name: string): string {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function NewChatScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const community = useAppStore((s) => s.community);

  const [search, setSearch] = useState('');
  const [contacts, setContacts] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);

  // ── Load current user ──────────────────────────────────────────────────────
  useEffect(() => {
    const auth = AuthService.getCurrentUser();
    if (!auth) return;
    UserService.getUser(auth.uid).then(setCurrentUser).catch(console.error);
  }, []);

  // ── Load community members from Firestore ──────────────────────────────────
  useEffect(() => {
    const communityId = community?.communityId ?? currentUser?.communityId;
    if (!communityId) {
      setLoading(false);
      return;
    }

    const authUid = AuthService.getCurrentUser()?.uid;

    const load = async () => {
      try {
        setLoading(true);
        const q = query(
          collection(db, 'users'),
          where('communityId', '==', communityId)
        );
        const snap = await getDocs(q);
        const members = snap.docs
          .map((d: any) => d.data() as UserProfile)
          .filter((u: any) => u.uid !== authUid); // exclude self
        setContacts(members);
      } catch (err) {
        console.error('Failed to load community members:', err);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [community?.communityId, currentUser?.communityId]);

  // ── Filter by search ───────────────────────────────────────────────────────
  const filtered = contacts.filter((c) =>
    (c.name ?? '').toLowerCase().includes(search.toLowerCase())
  );

  // ── Start a DM conversation ────────────────────────────────────────────────
  const handleSelect = async (contact: UserProfile) => {
    const auth = AuthService.getCurrentUser();
    if (!auth || starting) return;

    setStarting(true);
    try {
      const me = currentUser;
      const myName = me?.name ?? auth.displayName ?? 'Neighbor';
      const theirName = contact.name ?? 'Neighbor';

      const roomId = await ChatService.createOrGetDmConversation(
        auth.uid,
        contact.uid,
        myName,
        theirName
      );

      router.replace(`/chat/${roomId}?name=${encodeURIComponent(theirName)}` as any);
    } catch (err) {
      console.error('Failed to create conversation:', err);
    } finally {
      setStarting(false);
    }
  };

  return (
    <GradientBg>
      <SafeAreaView style={{ flex: 1 }}>
        {/* ── Header ── */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="close" size={22} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t('new_message', 'New Message')}</Text>
          {starting && <ActivityIndicator color="#FFFFFF" style={{ marginLeft: 8 }} />}
        </View>

        {/* ── Search ── */}
        <View style={styles.searchRow}>
          <Text style={styles.toLabel}>{t('to', 'To:')}</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Search by name…"
            placeholderTextColor="#6B7280"
            value={search}
            onChangeText={setSearch}
            autoFocus
          />
        </View>

        {/* ── Contact list ── */}
        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator color="#FFFFFF" />
            <Text style={styles.hintText}>Loading community members…</Text>
          </View>
        ) : (
          <FlatList
            data={filtered}
            keyExtractor={(item) => item.uid}
            ListHeaderComponent={
              <Text style={styles.sectionLabel}>
                {community?.name ? community.name.toUpperCase() + ' MEMBERS' : 'COMMUNITY MEMBERS'}
              </Text>
            }
            ListEmptyComponent={
              <View style={styles.center}>
                <Ionicons name="people-outline" size={36} color="rgba(255,255,255,0.2)" />
                <Text style={styles.hintText}>
                  {search ? 'No matching members found' : 'No other members in your community yet'}
                </Text>
              </View>
            }
            renderItem={({ item }) => {
              const name = item.name ?? 'Neighbor';
              const color = avatarColor(name);
              const initials = getInitials(name);
              return (
                <TouchableOpacity
                  style={styles.contactRow}
                  onPress={() => handleSelect(item)}
                  activeOpacity={0.8}
                >
                  <View style={[styles.avatarCircle, { backgroundColor: color }]}>
                    <Text style={styles.avatarText}>{initials}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.contactName}>{name}</Text>
                    {item.district || item.neighborhood ? (
                      <Text style={styles.contactSub}>{item.neighborhood ?? item.district}</Text>
                    ) : null}
                  </View>
                  <Ionicons name="chatbubble-ellipses-outline" size={18} color="rgba(255,255,255,0.3)" />
                </TouchableOpacity>
              );
            }}
          />
        )}
      </SafeAreaView>
    </GradientBg>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center', padding: 40, gap: 10 },
  hintText: { color: 'rgba(255,255,255,0.3)', fontSize: 13, textAlign: 'center', marginTop: 6 },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
    gap: 12,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: { color: '#FFFFFF', fontSize: 17, fontWeight: '700', flex: 1 },

  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  toLabel: { color: 'rgba(255,255,255,0.4)', marginRight: 10, fontSize: 14 },
  searchInput: { flex: 1, color: '#FFFFFF', fontSize: 16 },

  sectionLabel: {
    color: 'rgba(255,255,255,0.25)',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.5,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },

  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
    gap: 12,
  },
  avatarCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: '#FFFFFF', fontSize: 13, fontWeight: '800' },
  contactName: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },
  contactSub: { color: 'rgba(255,255,255,0.35)', fontSize: 11, marginTop: 2 },
});
