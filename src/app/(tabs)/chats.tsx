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
  ScrollView,
  Platform
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import Text from "@/components/common/Text";
import { AuthService } from "@/services/authService";
import { ChatService, Conversation } from "@/services/chatService";
import { CommunityDoc, CommunityService } from "@/services/communityService";
import { useAppStore } from "@/store/appStore";

import { Colors } from "@/constants/colors";

// ─── Design tokens ────────────────────────────────────────────────────────────
const T = {
  bg: Colors.bg,
  card: Colors.card,
  border: Colors.border,
  text: Colors.text,
  textSecondary: Colors.textSecondary,
  primary: Colors.primary,
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
  "#FF385C", // Coral
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

  // ── Highlighted Community Chat Card ───────────────────────────────────────
  const renderCommunityChatCard = (conv: Conversation) => {
    const unread = conv.unreadCounts?.[uid ?? ""] ?? 0;
    const timeLabel = formatTimeAgo(conv.lastMessageAt);
    const displayName = conv.name ?? "Community Chat";
    const navRoute = `/chat/${conv.id}?name=${encodeURIComponent(displayName)}`;

    return (
      <TouchableOpacity
        key={conv.id}
        style={styles.communityCard}
        activeOpacity={0.9}
        onPress={() => router.push(navRoute as any)}
      >
        <View style={styles.communityCardLeft}>
          <View style={styles.communityCardIcon}>
            <Ionicons name="home" size={24} color="#FFFFFF" />
          </View>
          <View style={styles.communityCardBadge}>
            <Text style={styles.communityCardBadgeText}>TOWN HALL</Text>
          </View>
        </View>

        <View style={styles.communityCardMiddle}>
          <Text style={styles.communityCardTitle} numberOfLines={1}>
            {displayName}
          </Text>
          <Text style={styles.communityCardDesc} numberOfLines={1}>
            {conv.lastMessage || "No messages yet"}
          </Text>
          <Text style={styles.communityCardTime}>
            Active {timeLabel}
          </Text>
        </View>

        <View style={styles.communityCardRight}>
          {unread > 0 ? (
            <View style={styles.communityCardUnread}>
              <Text style={styles.communityCardUnreadText}>
                {unread}
              </Text>
            </View>
          ) : (
            <Ionicons name="chevron-forward" size={20} color={T.primary} />
          )}
        </View>
      </TouchableOpacity>
    );
  };

  const renderSectionHeader = ({ section }: { section: any }) => {
    const { type, data } = section;

    if (type === "community") {
      return (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Community Town Hall</Text>
          </View>
          {data.map((conv: Conversation) => renderCommunityChatCard(conv))}
        </View>
      );
    }

    if (type === "dm" || type === "business") {
      return (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{type === "business" ? "Business Inquiries" : "Direct Messages"}</Text>
            <TouchableOpacity onPress={() => router.push("/chat/new")}>
              <Text style={styles.sectionAction}>New Chat</Text>
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
          <Ionicons name="chatbubbles-outline" size={48} color="#CCCCCC" />
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
      let bgColor = T.primary;
      if (isDm && uid) {
        const otherId = conv.participants?.find((p) => p !== uid);
        displayName = otherId
          ? (conv.participantNames?.[otherId] ?? "Neighbor")
          : "Neighbor";
          
        // Use service/business name if available
        if ((conv.context === "service" || conv.context === "business") && conv.contextTitle) {
          displayName = conv.contextTitle;
        }

        initStr = getInitials(displayName);
        bgColor = avatarColor(displayName);
      }

      const navRoute = `/chat/${conv.id}?name=${encodeURIComponent(displayName)}`;

      return (
        <TouchableOpacity
          key={conv.id}
          style={styles.rowItem}
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
                { backgroundColor: (conv.iconColor ?? T.primary) + "15" },
              ]}
            >
              <Ionicons
                name={(conv.iconName ?? "chatbubbles") as any}
                size={20}
                color={conv.iconColor ?? T.primary}
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
                style={{ marginTop: 6 }}
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
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <SafeAreaView style={{ flex: 1, backgroundColor: "#FFFFFF" }} edges={["top"]}>
        
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
                color={T.text}
              />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.circleBtn}
              activeOpacity={0.8}
              onPress={() => router.push("/chat/new")}
            >
              <Ionicons name="create-outline" size={18} color={T.text} />
            </TouchableOpacity>
          </View>
        </View>

        {/* ── Search ── */}
        <View style={styles.searchBar}>
          <Ionicons
            name="search-outline"
            size={18}
            color={T.textSecondary}
            style={{ marginRight: 8 }}
          />
          <TextInput
            placeholder="Search messages, people..."
            placeholderTextColor={T.textSecondary}
            style={styles.searchInput}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery("")}>
              <Ionicons name="close-circle" size={18} color={T.textSecondary} />
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
    color: T.textSecondary,
    fontSize: 14,
    textAlign: "center",
    marginTop: 6,
    paddingHorizontal: 20,
    fontWeight: "500",
  },
  tabsContainer: {
    paddingHorizontal: 24,
    paddingTop: 8,
    gap: 8,
  },
  tabBtn: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: "#F7F7F7",
    marginBottom: 12,
    borderWidth: 1,
    borderColor: T.border,
  },
  tabBtnActive: {
    backgroundColor: T.text,
    borderColor: T.text,
  },
  tabText: {
    fontSize: 13,
    fontWeight: "700",
    color: T.textSecondary,
  },
  tabTextActive: {
    color: "#FFFFFF",
  },
  scroll: { paddingTop: 24, paddingBottom: 60 },

  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 16,
    backgroundColor: "#FFFFFF",
  },
  headerSub: { fontSize: 11, color: T.primary, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.8 },
  headerTitle: { fontSize: 32, fontWeight: "800", color: T.text, marginTop: 4, letterSpacing: -0.8 },
  headerRight: { flexDirection: "row", gap: 8 },
  circleBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#F7F7F7",
    borderWidth: 1,
    borderColor: T.border,
    alignItems: "center",
    justifyContent: "center",
  },

  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F7F7F7",
    borderRadius: 12,
    marginHorizontal: 24,
    paddingHorizontal: 14,
    height: 48,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: T.border,
  },
  searchInput: { flex: 1, color: T.text, fontSize: 14, fontWeight: "600" },

  section: { marginBottom: 36, paddingHorizontal: 24 },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: T.text,
    letterSpacing: -0.3,
  },
  sectionAction: { fontSize: 13, fontWeight: "700", color: T.primary },

  // Highlighted Community Chat Card
  communityCard: {
    backgroundColor: Colors.card,
    borderColor: Colors.border,
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
  },
  communityCardLeft: {
    marginRight: 12,
    alignItems: "center",
  },
  communityCardIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: T.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  communityCardBadge: {
    backgroundColor: T.text,
    borderRadius: 4,
    paddingHorizontal: 5,
    paddingVertical: 1,
    marginTop: -6,
  },
  communityCardBadgeText: {
    color: "#FFFFFF",
    fontSize: 7,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  communityCardMiddle: {
    flex: 1,
    marginRight: 10,
  },
  communityCardTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: T.text,
  },
  communityCardDesc: {
    fontSize: 12,
    color: T.textSecondary,
    marginTop: 2,
    fontWeight: "400",
  },
  communityCardTime: {
    fontSize: 10,
    color: T.textSecondary,
    marginTop: 4,
    fontWeight: "500",
  },
  communityCardRight: {
    alignItems: "center",
    justifyContent: "center",
  },
  communityCardUnread: {
    backgroundColor: T.primary,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 5,
  },
  communityCardUnreadText: {
    color: "#FFFFFF",
    fontSize: 9,
    fontWeight: "700",
  },

  listContainer: {
    backgroundColor: "#FFFFFF",
  },
  rowItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  avatarContainer: { marginRight: 12 },
  initialsAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  initialsText: { color: "#FFFFFF", fontSize: 13, fontWeight: "600" },
  channelIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  rowMiddle: { flex: 1, marginRight: 8 },
  rowTitle: { fontSize: 14, fontWeight: "600", color: T.text },
  rowDesc: { fontSize: 12, color: T.textSecondary, marginTop: 2, fontWeight: "400" },
  rowRight: { alignItems: "flex-end", justifyContent: "center" },
  rowTime: { fontSize: 11, color: T.textSecondary, fontWeight: "400" },
  badge: {
    backgroundColor: T.primary,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
    marginTop: 4,
  },
  badgeText: { color: "#FFFFFF", fontSize: 9, fontWeight: "700" },

  emptyTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: T.text,
    marginTop: 10,
  },
});
