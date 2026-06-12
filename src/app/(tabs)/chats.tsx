import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator,
  FlatList,
  StatusBar,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
  Alert,
  ScrollView
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import Text from "@/components/common/Text";
import { AuthService } from "@/services/authService";
import { ChatService, Conversation } from "@/services/chatService";
import { CommunityDoc, CommunityService } from "@/services/communityService";
import { useAppStore } from "@/store/appStore";

// ─── Design tokens ────────────────────────────────────────────────────────────
const T = {
  bg: "#F8F9FA",
  card: "#FFFFFF",
  border: "#E5E7EB",
  text: "#111827",
  textSecondary: "#6B7280",
  primary: "#EF4444",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
function formatTimeAgo(ts: any): string {
  if (!ts) return "";
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  const diffMs = Date.now() - d.getTime();
  const m = Math.floor(diffMs / 60_000);
  const h = Math.floor(m / 60);
  if (m < 1) return "now";
  if (m < 60) return `${m}m`;
  if (h < 24) return `${h}h`;
  if (h < 48) return "Yesterday";
  return `${Math.floor(h / 24)}d`;
}

function getInitials(name: string): string {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

const AVATAR_COLORS = [
  "#C2410C",
  "#166534",
  "#1D4ED8",
  "#B45309",
  "#6D28D9",
  "#BE185D",
];
function avatarColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++)
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function ChatsScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const community = useAppStore((s) => s.community);

  const [uid, setUid] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<
    "All" | "Unread" | "DMs" | "Business" | "Emergency"
  >("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [communityDoc, setCommunityDoc] = useState<CommunityDoc | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ── Auth ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    const user = AuthService.getCurrentUser();
    if (user) setUid(user.uid);
  }, []);

  // ── Community stats real-time ─────────────────────────────────────────────
  useEffect(() => {
    const cid = community?.communityId;
    if (!cid) return;
    const unsub = CommunityService.subscribeToCommunity(cid, (doc) =>
      setCommunityDoc(doc),
    );
    return unsub;
  }, [community?.communityId]);

  // ── Ensure community conversation exists ──────────────────────────────────
  useEffect(() => {
    const cid = community?.communityId;
    const name = community?.name || community?.district || "Community";
    if (!cid) return;
    ChatService.ensureCommunityConversation(cid, name).catch(console.error);
  }, [community?.communityId]);

  // ── Conversations real-time ───────────────────────────────────────────────
  useEffect(() => {
    if (!uid) return;
    setLoading(true);
    setError(null);

    const unsub = ChatService.subscribeToUserConversations(
      uid,
      community?.communityId,
      (convs) => {
        setConversations(convs);
        setLoading(false);
      },
      (err) => {
        setError("Could not load chats. Check your connection.");
        setLoading(false);
      },
    );

    return unsub;
  }, [uid, community?.communityId]);

  // ── Filtering ─────────────────────────────────────────────────────────────
  const filtered = conversations.filter((conv) => {
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const name = conv.name || "";
      const msg = conv.lastMessage || "";
      if (!name.toLowerCase().includes(q) && !msg.toLowerCase().includes(q))
        return false;
    }
    if (activeTab === "Unread") {
      const unread = conv.unreadCounts?.[uid ?? ""] ?? 0;
      return unread > 0;
    }
    if (activeTab === "Business") {
      return conv.context === "business" || conv.context === "service";
    }
    if (activeTab === "DMs") {
      return conv.type === "dm" && conv.context !== "business" && conv.context !== "service";
    }
    if (activeTab === "Emergency") {
      return (
        conv.iconName === "alert-circle-outline" ||
        conv.channelId === "sos-alerts"
      );
    }
    return true;
  });

  const communityConvs = filtered.filter(
    (c) => c.type === "community" || c.type === "channel",
  );
  const dmConvs = filtered.filter((c) => c.type === "dm");

  const communityName =
    community?.name || community?.district || "Your Community";
  const memberCount = communityDoc?.memberCount ?? 0;

  // ── Virtualized list helpers ───────────────────────────────────────────────
  const handleDeleteChat = useCallback((conv: Conversation, name: string) => {
    if (conv.type !== "dm") {
      Alert.alert("Cannot Delete", "You cannot delete community or channel chats from here.");
      return;
    }
    Alert.alert(
      "Delete Chat",
      `Are you sure you want to delete your conversation with ${name}? This cannot be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Delete", 
          style: "destructive", 
          onPress: async () => {
            try {
              if (conv.id) await ChatService.deleteConversation(conv.id);
            } catch (e) {
              Alert.alert("Error", "Could not delete conversation.");
            }
          }
        }
      ]
    );
  }, []);

  const getSections = () => {
    const sections: any[] = [];

    if (activeTab !== "DMs" && activeTab !== "Business" && communityConvs.length > 0) {
      sections.push({ type: "community", data: communityConvs });
    }
    if (activeTab !== "Emergency" && activeTab !== "Business" && dmConvs.length > 0) {
      sections.push({ type: "dm", data: dmConvs });
    }
    if (activeTab === "Business" && dmConvs.length > 0) {
      sections.push({ type: "business", data: dmConvs });
    }
    if (communityConvs.length === 0 && dmConvs.length === 0 && !loading) {
      sections.push({ type: "empty", data: {} });
    }

    return sections;
  };

  const renderSectionHeader = ({ section }: { section: any }) => {
    const { type, data } = section;

    if (type === "community") {
      return (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>COMMUNITY CHAT</Text>
          </View>

          <View style={styles.listContainer}>
            {data.map((conv: Conversation, i: number) =>
              renderConversationRow(conv, i === data.length - 1),
            )}
          </View>
        </View>
      );
    }

    if (type === "dm" || type === "business") {
      return (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{type === "business" ? "BUSINESS INQUIRIES" : "DIRECT MESSAGES"}</Text>
            <TouchableOpacity onPress={() => router.push("/chat/new")}>
              <Text style={styles.sectionAction}>New chat</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.listContainer}>
            {data.map((conv: Conversation, i: number) =>
              renderConversationRow(conv, i === data.length - 1),
            )}
          </View>
        </View>
      );
    }

    if (type === "empty") {
      return (
        <View style={styles.center}>
          <Ionicons name="chatbubbles-outline" size={48} color="#9CA3AF" />
          <Text style={styles.emptyTitle}>No conversations found</Text>
          <Text style={styles.emptyDesc}>
            {searchQuery
              ? "Try a different search term"
              : "Start chatting with your neighbours"}
          </Text>
        </View>
      );
    }

    return null;
  };

  // ── Render helpers ────────────────────────────────────────────────────────
  const renderConversationRow = useCallback(
    (conv: Conversation, isLast: boolean) => {
      const unread = conv.unreadCounts?.[uid ?? ""] ?? 0;
      const timeLabel = formatTimeAgo(conv.lastMessageAt);
      const isDm = conv.type === "dm";

      // For DMs, derive the other participant's name
      let displayName = conv.name ?? "Chat";
      let initStr = "?";
      let bgColor = "#EF4444";
      if (isDm && uid) {
        const otherId = conv.participants.find((p) => p !== uid);
        displayName = otherId
          ? (conv.participantNames?.[otherId] ?? "Neighbor")
          : "Neighbor";
        initStr = getInitials(displayName);
        bgColor = avatarColor(displayName);
      }

      const navRoute = `/chat/${conv.id}?name=${encodeURIComponent(displayName)}`;

      return (
        <TouchableOpacity
          key={conv.id}
          style={[styles.rowItem, isLast && { borderBottomWidth: 0 }]}
          activeOpacity={0.8}
          onPress={() => router.push(navRoute as any)}
          onLongPress={() => handleDeleteChat(conv, displayName)}
        >
          {isDm ? (
            <View style={styles.avatarContainer}>
              <View
                style={[styles.initialsAvatar, { backgroundColor: bgColor }]}
              >
                <Text style={styles.initialsText}>{initStr}</Text>
              </View>
            </View>
          ) : (
            <View
              style={[
                styles.channelIcon,
                { backgroundColor: (conv.iconColor ?? "#EF4444") + "18" },
              ]}
            >
              <Ionicons
                name={(conv.iconName ?? "chatbubbles") as any}
                size={18}
                color={conv.iconColor ?? "#EF4444"}
              />
            </View>
          )}

          <View style={styles.rowMiddle}>
            <Text style={styles.rowTitle} numberOfLines={1}>
              {displayName}
            </Text>
            <Text style={styles.rowDesc} numberOfLines={1}>
              {conv.lastMessage || "No messages yet"}
            </Text>
          </View>

          <View style={styles.rowRight}>
            <Text style={styles.rowTime}>{timeLabel}</Text>
            {unread > 0 ? (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>
                  {unread > 99 ? "99+" : unread}
                </Text>
              </View>
            ) : (
              <Ionicons
                name="checkmark-done"
                size={14}
                color="#10B981"
                style={{ marginTop: 4 }}
              />
            )}
          </View>
        </TouchableOpacity>
      );
    },
    [uid, router],
  );

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" backgroundColor={T.bg} />
      <SafeAreaView style={{ flex: 1 }} edges={["top"]}>
        {/* ── Header ── */}
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerSub}>{communityName}</Text>
            <Text style={styles.headerTitle}>Messages</Text>
          </View>
          <View style={styles.headerRight}>
            <TouchableOpacity
              style={styles.circleBtn}
              activeOpacity={0.8}
              onPress={() => router.push("/notifications")}
            >
              <Ionicons
                name="notifications-outline"
                size={18}
                color="#4B5563"
              />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.circleBtn}
              activeOpacity={0.8}
              onPress={() => router.push("/chat/new")}
            >
              <Ionicons name="create-outline" size={18} color="#4B5563" />
            </TouchableOpacity>
          </View>
        </View>

        {/* ── Search ── */}
        <View style={styles.searchBar}>
          <Ionicons
            name="search-outline"
            size={18}
            color="#9CA3AF"
            style={{ marginRight: 8 }}
          />
          <TextInput
            placeholder="Search messages, people..."
            placeholderTextColor="#9CA3AF"
            style={styles.searchInput}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery("")}>
              <Ionicons name="close-circle" size={18} color="#9CA3AF" />
            </TouchableOpacity>
          )}
        </View>
        {/* ── Tabs ── */}
        <View style={{ borderBottomWidth: 1, borderBottomColor: T.border }}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.tabsContainer}
          >
            {["All", "Unread", "DMs", "Business", "Emergency"].map((tab) => {
              const isActive = activeTab === tab;
              return (
                <TouchableOpacity
                  key={tab}
                  style={[styles.tabBtn, isActive && styles.tabBtnActive]}
                  onPress={() => setActiveTab(tab as any)}
                >
                  <Text style={[styles.tabText, isActive && styles.tabTextActive]}>
                    {tab}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* ── Content ── */}
        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator color={T.primary} />
          </View>
        ) : error ? (
          <View style={styles.center}>
            <Ionicons
              name="cloud-offline-outline"
              size={36}
              color={T.textSecondary}
            />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : (
          <FlatList
            data={getSections()}
            keyExtractor={(item, index) => `section_${index}`}
            renderItem={({ item }) => renderSectionHeader({ section: item })}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scroll}
          />
        )}
      </SafeAreaView>

      {/* ── FAB ── */}
      <TouchableOpacity style={styles.fab} activeOpacity={0.9} onPress={() => router.push('/chat/new' as any)}>
        <Ionicons name="chatbubble-ellipses-outline" size={24} color="#FFFFFF" />
        <View style={styles.fabPlus}>
          <Ionicons name="add" size={12} color="#FFFFFF" />
        </View>
      </TouchableOpacity>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: T.bg },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 60,
    gap: 10,
  },
  errorText: {
    color: T.textSecondary,
    fontSize: 13,
    textAlign: "center",
    marginTop: 8,
  },
  emptyDesc: {
    color: "#6B7280",
    fontSize: 14,
    textAlign: "center",
    marginTop: 6,
    paddingHorizontal: 20,
  },
  tabsContainer: {
    paddingHorizontal: 16,
    paddingTop: 8,
    gap: 8,
  },
  tabBtn: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: "#F3F4F6",
    marginBottom: 12,
  },
  tabBtnActive: {
    backgroundColor: "#111827",
  },
  tabText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#4B5563",
  },
  tabTextActive: {
    color: "#FFFFFF",
  },
  scroll: { paddingBottom: 100 },

  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 12,
  },
  headerSub: { fontSize: 11, color: T.primary, fontWeight: "700" },
  headerTitle: { fontSize: 26, fontWeight: "800", color: T.text, marginTop: 2 },
  headerRight: { flexDirection: "row", gap: 8 },
  circleBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: T.card,
    borderWidth: 1,
    borderColor: T.border,
    alignItems: "center",
    justifyContent: "center",
  },

  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: T.card,
    borderRadius: 12,
    marginHorizontal: 16,
    paddingHorizontal: 14,
    height: 44,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: T.border,
  },
  searchInput: { flex: 1, color: T.text, fontSize: 13, fontWeight: "500" },

  section: { marginBottom: 22, paddingHorizontal: 16 },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 10,
    fontWeight: "800",
    color: "#9CA3AF",
    letterSpacing: 1.5,
  },
  sectionAction: { fontSize: 11, fontWeight: "700", color: T.primary },

  communityCard: {
    backgroundColor: "#1E293B",
    borderRadius: 20,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
  },
  commIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: "rgba(239,68,68,0.12)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  commInfo: { flex: 1 },
  commTitle: { fontSize: 14, fontWeight: "800", color: "#FFFFFF" },
  commSub: { fontSize: 11, color: "#9CA3AF", marginTop: 2 },
  activeRow: { flexDirection: "row", alignItems: "center", marginTop: 4 },
  greenDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#10B981",
    marginRight: 5,
  },
  activeText: { fontSize: 10, color: "#10B981", fontWeight: "700" },

  listContainer: {
    backgroundColor: T.card,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: T.border,
    paddingHorizontal: 16,
    elevation: 1,
  },
  rowItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  avatarContainer: { marginRight: 12 },
  initialsAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  initialsText: { color: "#FFFFFF", fontSize: 12, fontWeight: "800" },
  channelIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  rowMiddle: { flex: 1, marginRight: 10 },
  rowTitle: { fontSize: 13, fontWeight: "800", color: T.text },
  rowDesc: { fontSize: 11, color: T.textSecondary, marginTop: 3 },
  rowRight: { alignItems: "flex-end" },
  rowTime: { fontSize: 9, color: "#9CA3AF", fontWeight: "600" },
  badge: {
    backgroundColor: T.primary,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
    marginTop: 4,
  },
  badgeText: { color: "#FFFFFF", fontSize: 9, fontWeight: "800" },

  emptySection: {
    backgroundColor: T.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: T.border,
    padding: 24,
    alignItems: "center",
    gap: 8,
  },
  emptySectionText: { color: T.textSecondary, fontSize: 13 },
  startChatBtn: {
    backgroundColor: T.primary,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 100,
    marginTop: 4,
  },
  startChatBtnText: { color: "#FFFFFF", fontSize: 12, fontWeight: "700" },

  emptyTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#4B5563",
    marginTop: 10,
  },
  // FAB
  fab: {
    position: 'absolute',
    bottom: 110,
    right: 24,
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#6D28D9',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#6D28D9',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
    zIndex: 9999,
  },
  fabPlus: {
    position: 'absolute',
    bottom: 16,
    right: 16,
    backgroundColor: '#6D28D9',
    width: 14,
    height: 14,
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center'
  },
});
