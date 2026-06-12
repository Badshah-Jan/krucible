import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { Image } from "expo-image";

import { AuthService } from "@/services/authService";
import { UserProfile, UserService } from "@/services/userService";
import { useAppStore } from "@/store/appStore";
import { UI } from "@/store/uiStore";
import { Post as FirestorePost, PostService } from "@/services/postService";

// ─── Stat Card ───────────────────────────────────────────────────────────────
function StatItem({
  value,
  label,
  icon,
  color,
}: {
  value: number | string;
  label: string;
  icon: string;
  color: string;
}) {
  return (
    <View style={s.statItem}>
      <View style={[s.statIconBox, { backgroundColor: color + "10" }]}>
        <Ionicons name={icon as any} size={18} color={color} />
      </View>
      <Text style={s.statValue}>{value}</Text>
      <Text style={s.statLabel}>{label}</Text>
    </View>
  );
}

// ─── Menu Row ────────────────────────────────────────────────────────────────
function MenuRow({
  icon,
  label,
  color = "#64748B",
  onPress,
}: {
  icon: string;
  label: string;
  color?: string;
  onPress?: () => void;
}) {
  return (
    <TouchableOpacity style={s.menuRow} onPress={onPress} activeOpacity={0.7}>
      <View style={s.menuIconWrap}>
        <Ionicons name={icon as any} size={20} color={color} />
      </View>
      <Text style={s.menuLabel}>{label}</Text>
      <Ionicons name="chevron-forward" size={16} color="#CBD5E1" style={{ marginLeft: "auto" }} />
    </TouchableOpacity>
  );
}

// ─── Reputation Badge ────────────────────────────────────────────────────────
function ReputationBadge({ icon, text, color }: { icon: string; text: string; color: string }) {
  return (
    <View style={s.badge}>
      <Ionicons name={icon as any} size={16} color={color} />
      <Text style={s.badgeText}>{text}</Text>
    </View>
  );
}

// ─── Main Profile Screen ─────────────────────────────────────────────────────
export default function ProfileScreen() {
  const router = useRouter();
  const logout = useAppStore((state) => state.logout);
  const { t } = useTranslation();
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [userPosts, setUserPosts] = useState<FirestorePost[]>([]);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const performLogout = async () => {
    setIsLoggingOut(true);
    try {
      await AuthService.logout();
      logout();
      router.replace("/(auth)/login" as any);
    } catch (error) {
      console.error("Logout error", error);
      UI.error("Error", "Failed to log out");
      setIsLoggingOut(false);
    }
  };

  const handleLogoutClick = () => {
    UI.confirm("Are you sure?", "Do you really want to log out?", performLogout, "Sure", "warning");
  };

  useEffect(() => {
    let unsubscribeUser: () => void;
    let unsubscribePosts: () => void;

    const setupSubscription = async () => {
      setLoading(true);
      const currentUser = AuthService.getCurrentUser();
      if (currentUser) {
        unsubscribeUser = UserService.subscribeToUser(currentUser.uid, (profile) => {
          setUserProfile(profile);
          setLoading(false);
        });
        unsubscribePosts = PostService.subscribeToUserPosts(currentUser.uid, (posts) => {
          setUserPosts(posts);
        });
      } else {
        setLoading(false);
      }
    };
    setupSubscription();

    return () => {
      if (unsubscribeUser) unsubscribeUser();
      if (unsubscribePosts) unsubscribePosts();
    };
  }, []);

  if (loading || !userProfile) {
    return (
      <View style={s.loadingContainer}>
        <StatusBar barStyle="dark-content" backgroundColor="#F8FAFC" />
        <ActivityIndicator size="large" color="#4F46E5" />
      </View>
    );
  }

  const karmaPoints = userProfile.karma || 0;

  const userHandle = `@${userProfile.name.toLowerCase().replace(/\s+/g, "_")}`;
  const userNeighborhood = userProfile.neighborhood || userProfile.district || userProfile.city || "Neighbourhood";
  const avatarUri = userProfile.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(userProfile.name)}&background=random`;

  return (
    <View style={s.root}>
      <StatusBar barStyle="dark-content" backgroundColor="#F8FAFC" />
      <SafeAreaView style={{ flex: 1 }} edges={["top"]}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scroll}>
          
          {/* ── Header ── */}
          <View style={s.header}>
            <View>
              <Text style={s.greeting}>Good morning,</Text>
              <Text style={s.headerName}>{userProfile.name}</Text>
              <View style={s.headerLocation}>
                <Ionicons name="location" size={14} color="#4F46E5" />
                <Text style={s.headerLocationText}>{userNeighborhood}</Text>
                <Ionicons name="chevron-down" size={12} color="#64748B" />
              </View>
            </View>
            <TouchableOpacity style={s.settingsBtn} onPress={() => router.push("/settings" as any)}>
              <Ionicons name="settings-outline" size={20} color="#0F172A" />
            </TouchableOpacity>
          </View>

          {/* ── Profile Card ── */}
          <View style={s.profileCard}>
            <View style={s.profileCardInner}>
              <View style={s.avatarContainer}>
                <Image source={{ uri: avatarUri }} style={s.avatar} />
                <View style={s.onlineDot} />
              </View>

              <View style={s.profileInfo}>
                <View style={s.nameRow}>
                  <View style={s.nameTextWrap}>
                    <Text style={s.profileName} numberOfLines={1}>{userProfile.name}</Text>
                  </View>
                  <TouchableOpacity style={s.editPill} onPress={() => router.push("/settings" as any)}>
                    <Text style={s.editPillText}>Edit Profile</Text>
                    <Ionicons name="pencil" size={10} color="#4F46E5" />
                  </TouchableOpacity>
                </View>
                <Text style={s.handle}>{userProfile.handle ? `@${userProfile.handle}` : userHandle}</Text>

                <View style={s.locationTag}>
                  <Ionicons name="location-outline" size={14} color="#EF4444" />
                  <Text style={s.locationText} numberOfLines={1}>{userNeighborhood}</Text>
                </View>

                <View style={s.karmaTag}>
                  <Ionicons name="star-outline" size={14} color="#3B82F6" />
                  <Text style={s.karmaText}>
                    <Text style={{ fontWeight: "700" }}>{karmaPoints}</Text> Karma
                  </Text>
                </View>
              </View>
            </View>
          </View>

          {/* ── Stats ── */}
          <View style={s.statsCard}>
            <StatItem value={userPosts.length} label="Posts" icon="document-text" color="#3B82F6" />
            <View style={s.statDivider} />
            <StatItem value={userProfile.sosResponsesGiven || 0} label="Helped" icon="hand-left" color="#10B981" />
            <View style={s.statDivider} />
            <StatItem value={karmaPoints} label="Karma" icon="heart" color="#EF4444" />
            <View style={s.statDivider} />
            <StatItem value={userProfile.followers?.length || 0} label="Followers" icon="people" color="#F59E0B" />
          </View>

          {/* ── Community Reputation ── */}
          <View style={s.section}>
            <View style={s.sectionHeader}>
              <Text style={s.sectionTitle}>Community Reputation</Text>
              <TouchableOpacity onPress={() => router.push("/karma" as any)}><Text style={s.viewAll}>View all &gt;</Text></TouchableOpacity>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.hScroll}>
              <ReputationBadge icon="shield-checkmark-outline" text="Verified User" color="#10B981" />
              {karmaPoints >= 1000 && <ReputationBadge icon="heart" text="Helpful Neighbour" color="#EF4444" />}
              {userPosts.length >= 5 && <ReputationBadge icon="people-outline" text="Active Member" color="#8B5CF6" />}
              {(userProfile.sosResponsesGiven || 0) > 0 && <ReputationBadge icon="medkit" text="First Responder" color="#F59E0B" />}
              {userProfile.isPremium && <ReputationBadge icon="star" text="Premium Member" color="#F59E0B" />}
            </ScrollView>
          </View>

          {/* ── Grow with Neighborly ── */}
          <View style={s.growBanner}>
            <View style={s.growHeader}>
              <View style={s.growIconBox}>
                <Ionicons name="trending-up" size={24} color="#6D28D9" />
              </View>
              <View style={s.growInfo}>
                <Text style={s.growTitle}>Grow with Neighborly</Text>
                <Text style={s.growSub}>Offer services or list your local business to reach your community.</Text>
              </View>
            </View>
            <View style={s.growActions}>
              <TouchableOpacity style={s.growBtnSecondary} onPress={() => router.push("/businesses/register" as any)}>
                <Ionicons name="storefront-outline" size={16} color="#4F46E5" />
                <Text style={s.growBtnSecondaryText}>List Business</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.growBtnPrimary} onPress={() => router.push("/services/register" as any)}>
                <Ionicons name="briefcase-outline" size={16} color="#FFFFFF" />
                <Text style={s.growBtnPrimaryText}>Offer Service</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* ── Settings ── */}
          <View style={s.section}>
            <View style={[s.sectionHeader, { marginBottom: 8 }]}>
              <Text style={s.sectionTitle}>Settings</Text>
            </View>
            <View style={s.settingsList}>
              <MenuRow icon="star-outline" label="Karma Dashboard" color="#3B82F6" onPress={() => router.push("/karma" as any)} />
              <MenuRow icon="person-outline" label="Edit Profile" color="#3B82F6" onPress={() => router.push("/settings" as any)} />
              <MenuRow icon="shield-checkmark-outline" label="Privacy & Security" color="#3B82F6" onPress={() => router.push("/settings" as any)} />
              <MenuRow icon="notifications-outline" label="Notifications" color="#F59E0B" onPress={() => router.push("/notifications" as any)} />
              <MenuRow icon="location-outline" label="Location Settings" color="#06B6D4" onPress={() => router.push("/settings" as any)} />
              <MenuRow icon="help-circle-outline" label="Help & Support" color="#8B5CF6" onPress={() => router.push("/support" as any)} />
              <MenuRow icon="information-circle-outline" label="About Neighborly" color="#64748B" onPress={() => router.push("/about" as any)} />
            </View>
          </View>

          {/* ── Recent Activity ── */}
          <View style={s.section}>
            <View style={s.sectionHeader}>
              <Text style={s.sectionTitle}>Recent Activity</Text>
              <TouchableOpacity onPress={() => router.push(`/(tabs)` as any)}><Text style={s.viewAll}>Feed &gt;</Text></TouchableOpacity>
            </View>
            
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.hScroll}>
              {userPosts.length > 0 ? (
                userPosts.slice(0, 5).map(post => (
                  <TouchableOpacity 
                    key={post.id} 
                    style={[s.activityCard, { maxWidth: 220 }]} 
                    onPress={() => {
                      if (post.isSos && post.originalId) {
                        router.push(`/sos/${post.originalId}`);
                      } else if (post.id) {
                        router.push(`/post/${post.id}`);
                      }
                    }}
                  >
                    <View style={[s.activityIcon, { backgroundColor: post.isSos ? "#FEE2E2" : "#EFF6FF" }]}>
                      {post.isSos ? (
                         <Text style={{ color: "#EF4444", fontSize: 10, fontWeight: "800" }}>SOS</Text>
                      ) : (
                         <Ionicons name="document-text" size={16} color="#3B82F6" />
                      )}
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={s.activityTitle} numberOfLines={1}>{post.isSos ? "Posted an SOS" : `Posted in ${post.category || 'Feed'}`}</Text>
                      <Text style={s.activitySub} numberOfLines={1}>{post.title || post.description}</Text>
                    </View>
                  </TouchableOpacity>
                ))
              ) : (
                <View style={s.activityCard}>
                  <View style={[s.activityIcon, { backgroundColor: "#F3F4F6" }]}>
                    <Ionicons name="time" size={16} color="#9CA3AF" />
                  </View>
                  <View>
                    <Text style={s.activityTitle}>No recent activity</Text>
                    <Text style={s.activitySub}>Your latest actions will appear here</Text>
                  </View>
                </View>
              )}
            </ScrollView>
          </View>

          {/* ── Logout Button ── */}
          <TouchableOpacity
            style={[s.logoutBtn, isLoggingOut && { opacity: 0.5 }]}
            onPress={handleLogoutClick}
            activeOpacity={0.8}
            disabled={isLoggingOut}
          >
            {isLoggingOut ? (
              <ActivityIndicator size="small" color="#EF4444" />
            ) : (
              <Ionicons name="log-out-outline" size={18} color="#EF4444" />
            )}
            <Text style={s.logoutText}>
              {isLoggingOut ? "Logging out..." : "Log Out"}
            </Text>
          </TouchableOpacity>
          
          <Text style={s.versionText}>Neighborly v1.0.0</Text>

        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#FFFFFF" },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#FFFFFF" },
  scroll: { paddingBottom: 100 },

  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 24,
  },
  greeting: { fontSize: 14, color: "#64748B", fontWeight: "600", marginBottom: 2 },
  headerName: { fontSize: 26, fontWeight: "900", color: "#0F172A", letterSpacing: -0.5, marginBottom: 8 },
  headerLocation: { flexDirection: "row", alignItems: "center", gap: 4 },
  headerLocationText: { fontSize: 13, color: "#334155", fontWeight: "700" },
  settingsBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#F8FAFC",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },

  profileCard: {
    backgroundColor: "#FFFFFF",
    marginHorizontal: 16,
    borderRadius: 24,
    padding: 20,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
    elevation: 2,
    borderWidth: 1,
    borderColor: "#F1F5F9",
    marginBottom: 20,
  },
  profileCardInner: { flexDirection: "row", alignItems: "center" },
  avatarContainer: { position: "relative", marginRight: 16 },
  avatar: { width: 84, height: 84, borderRadius: 42, backgroundColor: "#E2E8F0" },
  onlineDot: {
    position: "absolute",
    bottom: 2,
    right: 2,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: "#10B981",
    borderWidth: 3,
    borderColor: "#FFFFFF",
  },
  profileInfo: { flex: 1, justifyContent: "center" },
  nameRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 2 },
  nameTextWrap: { flexDirection: "row", alignItems: "center", flex: 1, paddingRight: 8 },
  profileName: { fontSize: 18, fontWeight: "800", color: "#0F172A", flexShrink: 1 },
  handle: { fontSize: 13, color: "#64748B", fontWeight: "500", marginBottom: 10 },
  verifiedTag: { flexDirection: "row", alignItems: "center", gap: 4, marginBottom: 6 },
  verifiedText: { fontSize: 12, color: "#10B981", fontWeight: "700" },
  locationTag: { flexDirection: "row", alignItems: "center", gap: 4, marginBottom: 6 },
  locationText: { fontSize: 12, color: "#64748B", fontWeight: "500" },
  karmaTag: { flexDirection: "row", alignItems: "center", gap: 4 },
  karmaText: { fontSize: 12, color: "#64748B" },

  editPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#EEF2FF",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 100,
    gap: 4,
  },
  editPillText: { color: "#4F46E5", fontSize: 11, fontWeight: "700" },

  statsCard: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    marginHorizontal: 16,
    borderRadius: 20,
    paddingVertical: 16,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 10,
    elevation: 2,
    borderWidth: 1,
    borderColor: "#F1F5F9",
    marginBottom: 24,
  },
  statItem: { flex: 1, alignItems: "center" },
  statIconBox: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center", marginBottom: 8 },
  statValue: { fontSize: 18, fontWeight: "800", color: "#0F172A", marginBottom: 2 },
  statLabel: { fontSize: 11, color: "#64748B", fontWeight: "600" },
  statDivider: { width: 1, backgroundColor: "#F1F5F9", marginVertical: 8 },

  section: { marginBottom: 28 },
  sectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 20, marginBottom: 12 },
  sectionTitle: { fontSize: 16, fontWeight: "800", color: "#0F172A" },
  viewAll: { fontSize: 13, color: "#4F46E5", fontWeight: "700" },

  hScroll: { paddingHorizontal: 16, gap: 12 },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 16,
    gap: 8,
    borderWidth: 1,
    borderColor: "#F1F5F9",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.02,
    shadowRadius: 6,
    elevation: 1,
  },
  badgeText: { fontSize: 13, fontWeight: "700", color: "#334155" },

  growBanner: {
    backgroundColor: "#F8F5FF",
    marginHorizontal: 16,
    padding: 20,
    borderRadius: 24,
    marginBottom: 28,
  },
  growHeader: { flexDirection: "row", alignItems: "center", marginBottom: 16 },
  growIconBox: { width: 48, height: 48, borderRadius: 24, backgroundColor: "#EDE9FE", alignItems: "center", justifyContent: "center", marginRight: 16 },
  growInfo: { flex: 1 },
  growTitle: { fontSize: 16, fontWeight: "800", color: "#1E1B4B", marginBottom: 4 },
  growSub: { fontSize: 12, color: "#4C1D95", lineHeight: 18, paddingRight: 4 },
  growActions: { flexDirection: "row", gap: 12 },
  growBtnPrimary: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#4F46E5",
    paddingVertical: 12,
    borderRadius: 12,
    gap: 6,
  },
  growBtnPrimaryText: { color: "#FFFFFF", fontSize: 13, fontWeight: "700" },
  growBtnSecondary: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E0E7FF",
    gap: 6,
  },
  growBtnSecondaryText: { color: "#4F46E5", fontSize: 13, fontWeight: "700" },

  settingsList: {
    marginHorizontal: 20,
  },
  menuRow: { flexDirection: "row", alignItems: "center", paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: "#F1F5F9" },
  menuIconWrap: { width: 32, alignItems: "center", justifyContent: "center", marginRight: 12 },
  menuLabel: { fontSize: 14, fontWeight: "700", color: "#0F172A" },

  activityCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#F1F5F9",
    width: 240,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.02,
    shadowRadius: 6,
    elevation: 1,
  },
  activityIcon: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center", marginRight: 12 },
  activityTitle: { fontSize: 14, fontWeight: "800", color: "#0F172A", marginBottom: 2 },
  activitySub: { fontSize: 12, color: "#64748B" },

  logoutBtn: {
    marginHorizontal: 16,
    height: 48,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#FCA5A5",
    backgroundColor: "#FEF2F2",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginBottom: 20,
  },
  logoutText: {
    color: "#EF4444",
    fontSize: 14,
    fontWeight: "800",
  },
  versionText: {
    color: "#94A3B8",
    fontSize: 11,
    fontWeight: "600",
    textAlign: "center",
    marginBottom: 16,
  },
});
