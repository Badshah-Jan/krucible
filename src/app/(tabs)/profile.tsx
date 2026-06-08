import Text from "@/components/common/Text";
import { AuthService } from "@/services/authService";
import { UserProfile, UserService } from "@/services/userService";
import { useAppStore } from "@/store/appStore";
import { UI } from "@/store/uiStore";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
    ActivityIndicator,
    Image,
    ScrollView,
    StatusBar,
    StyleSheet,
    TouchableOpacity,
    View
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

// ─── Stat Card ───────────────────────────────────────────────────────────────
function StatCard({
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
    <View style={styles.statCard}>
      <View
        style={[
          styles.statIconCircle,
          { backgroundColor: color + "10", borderColor: color + "20" },
        ]}
      >
        <Ionicons name={icon as any} size={18} color={color} />
      </View>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

// ─── Menu Row ────────────────────────────────────────────────────────────────
function MenuRow({
  icon,
  label,
  color = "#9CA3AF",
  onPress,
  danger = false,
}: {
  icon: string;
  label: string;
  color?: string;
  onPress?: () => void;
  danger?: boolean;
}) {
  return (
    <TouchableOpacity
      style={styles.menuRow}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View
        style={[
          styles.menuIconBox,
          { backgroundColor: color + "10", borderColor: color + "20" },
        ]}
      >
        <Ionicons name={icon as any} size={18} color={color} />
      </View>
      <Text style={[styles.menuLabel, danger && { color: "#EF4444" }]}>
        {label}
      </Text>
      <Ionicons
        name="chevron-forward"
        size={16}
        color="#9CA3AF"
        style={{ marginLeft: "auto" }}
      />
    </TouchableOpacity>
  );
}

import PostCard from "@/components/feed/PostCard";
import { Post as FirestorePost, PostService } from "@/services/postService";

// ─── Main Profile Screen ─────────────────────────────────────────────────────
export default function ProfileScreen() {
  const router = useRouter();
  const logout = useAppStore((state) => state.logout);
  const { t } = useTranslation();
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [userPosts, setUserPosts] = useState<FirestorePost[]>([]);

  useEffect(() => {
    let unsubscribeUser: () => void;
    let unsubscribePosts: () => void;

    const setupSubscription = async () => {
      setLoading(true);
      const currentUser = AuthService.getCurrentUser();
      if (currentUser) {
        unsubscribeUser = UserService.subscribeToUser(
          currentUser.uid,
          (profile) => {
            setUserProfile(profile);
            setLoading(false);
          },
        );

        unsubscribePosts = PostService.subscribeToUserPosts(
          currentUser.uid,
          (posts) => {
            setUserPosts(posts);
          },
        );
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

  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const performLogout = async () => {
    setIsLoggingOut(true);
    try {
      await AuthService.logout();
      logout();
      router.replace("/(auth)/login");
    } catch (error) {
      console.error("Logout error", error);
      UI.error("Error", "Failed to log out");
      setIsLoggingOut(false);
    }
  };

  const handleLogoutClick = () => {
    UI.confirm(
      "Are you sure?",
      "Do you really want to log out?",
      performLogout,
      "Sure",
      "warning",
    );
  };

  if (loading || !userProfile) {
    return (
      <View style={styles.loadingContainer}>
        <StatusBar barStyle="dark-content" backgroundColor="#F8F9FA" />
        <ActivityIndicator size="large" color="#2563EB" />
        <Text style={{ marginTop: 12, color: "#6B7280", fontSize: 13 }}>
          {t("loading_profile", "Loading Profile...")}
        </Text>
      </View>
    );
  }

  const karmaPoints = userProfile.karma || 0;
  const karmaLevel =
    karmaPoints >= 4000
      ? "Legend"
      : karmaPoints >= 2500
        ? "Champion"
        : karmaPoints >= 1000
          ? "Helper"
          : "Newcomer";

  const userHandle = `@${userProfile.name.toLowerCase().replace(/\s+/g, "_")}`;
  const userNeighborhood =
    userProfile.neighborhood || userProfile.district || userProfile.city || "";

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" backgroundColor="#F8F9FA" />
      <SafeAreaView style={{ flex: 1 }} edges={["top"]}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scroll}
        >
          {/* ── Header Bar ── */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>{t("profile", "My Profile")}</Text>
            <TouchableOpacity
              style={styles.circleBtn}
              onPress={() => router.push("/settings" as any)}
              activeOpacity={0.8}
            >
              <Ionicons name="settings-outline" size={18} color="#4B5563" />
            </TouchableOpacity>
          </View>

          {/* ── Profile Card: Avatar + Name + Details ── */}
          <View style={styles.profileCard}>
            {/* Avatar */}
            <View style={styles.avatarContainer}>
              <Image
                source={{
                  uri:
                    userProfile.photoURL ||
                    "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80",
                }}
                style={styles.avatar}
              />
              <View style={styles.avatarOnlineDot} />
            </View>

            {/* User Details */}
            <View style={styles.nameRow}>
              <Text style={styles.userName}>{userProfile.name}</Text>
              <Ionicons
                name="checkmark-circle"
                size={18}
                color="#2563EB"
                style={{ marginLeft: 4 }}
              />
            </View>
            <Text style={styles.userHandle}>
              @{userProfile.handle || userHandle.replace("@", "")}
            </Text>

            {userProfile.bio ? (
              <Text style={styles.userBio}>{userProfile.bio}</Text>
            ) : null}

            {/* Location & Karma Indicators */}
            <View style={styles.detailsRow}>
              <View style={styles.detailItem}>
                <Ionicons name="location-outline" size={13} color="#EF4444" />
                <Text style={styles.detailText} numberOfLines={1}>
                  {userNeighborhood}
                </Text>
              </View>
              <View style={styles.detailDot} />
              <View style={styles.detailItem}>
                <Ionicons name="star-outline" size={13} color="#2563EB" />
                <Text style={styles.detailText}>
                  {karmaPoints.toLocaleString()} pts • {karmaLevel}
                </Text>
              </View>
            </View>
          </View>

          {/* ── Stats Container ── */}
          <View style={styles.statsRow}>
            <StatCard
              value={userPosts.length || 0}
              label={t("posts", "Posts")}
              icon="document-text-outline"
              color="#2563EB"
            />
            <StatCard
              value={userProfile.sosResponsesGiven || 0}
              label={t("helped", "Helped")}
              icon="hand-left-outline"
              color="#10B981"
            />
            <StatCard
              value={userProfile.karma || 0}
              label={t("karma", "Karma")}
              icon="heart-outline"
              color="#EF4444"
            />
          </View>

          {/* ── Settings Menu ── */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>{t("settings", "SETTINGS")}</Text>
            <View style={styles.menuContainer}>
              <MenuRow
                icon="star-outline"
                label="Karma & Achievements"
                color="#2563EB"
                onPress={() => router.push("/karma" as any)}
              />
              <View style={styles.menuDivider} />
              <MenuRow
                icon="person-outline"
                label="Edit Profile"
                color="#2563EB"
                onPress={() => router.push("/settings" as any)}
              />
              <View style={styles.menuDivider} />
              <MenuRow
                icon="shield-checkmark-outline"
                label="Privacy & Security"
                color="#3B82F6"
                onPress={() => router.push("/settings" as any)}
              />
              <View style={styles.menuDivider} />
              <MenuRow
                icon="notifications-outline"
                label="Notifications"
                color="#F59E0B"
                onPress={() => router.push("/notifications" as any)}
              />
              <View style={styles.menuDivider} />
              <MenuRow
                icon="location-outline"
                label="Location Settings"
                color="#10B981"
                onPress={() => router.push("/settings" as any)}
              />
              <View style={styles.menuDivider} />
              <MenuRow
                icon="help-circle-outline"
                label="Help & Support"
                color="#6B7280"
                onPress={() => router.push("/support" as any)}
              />
            </View>
          </View>

          {/* ── Recent Activity (User Posts) ── */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>
              {t("recent_activity", "RECENT ACTIVITY")}
            </Text>
            {userPosts.length === 0 ? (
              <View
                style={{
                  padding: 20,
                  alignItems: "center",
                  backgroundColor: "#FFFFFF",
                  borderRadius: 16,
                  borderWidth: 1,
                  borderColor: "#E5E7EB",
                }}
              >
                <Ionicons
                  name="document-text-outline"
                  size={32}
                  color="#D1D5DB"
                />
                <Text style={{ marginTop: 8, color: "#9CA3AF", fontSize: 13 }}>
                  No recent activity yet.
                </Text>
              </View>
            ) : (
              userPosts.map((post) => {
                const mapped = {
                  ...post,
                  id: post.id ?? Math.random().toString(),
                  userName: post.userName ?? "Neighbor",
                  userAvatar: post.userAvatar ?? "",
                  timePosted: "recently", // Simplified for profile view
                  distance: "Nearby",
                  likes: post.likesCount ?? 0,
                  commentsCount: post.commentsCount ?? 0,
                  likedByMe: false, // Will be updated by real feed
                };
                return (
                  <PostCard
                    key={mapped.id}
                    post={mapped as any}
                    onPress={() => router.push(`/post/${mapped.id}`)}
                    onLikePress={() => {}}
                    onCommentPress={() => router.push(`/post/${mapped.id}`)}
                  />
                );
              })
            )}
          </View>

          {/* ── Logout Button ── */}
          <TouchableOpacity
            style={[styles.logoutBtn, isLoggingOut && { opacity: 0.5 }]}
            onPress={handleLogoutClick}
            activeOpacity={0.8}
            disabled={isLoggingOut}
          >
            {isLoggingOut ? (
              <ActivityIndicator size="small" color="#EF4444" />
            ) : (
              <Ionicons name="log-out-outline" size={18} color="#EF4444" />
            )}
            <Text style={styles.logoutText}>
              {isLoggingOut ? "Logging out..." : t("log_out", "Log Out")}
            </Text>
          </TouchableOpacity>

          {/* Version Info */}
          <Text style={styles.versionText}>
            AasPaas v1.0.0 · Startup Edition
          </Text>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#F8F9FA",
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: "#F8F9FA",
    alignItems: "center",
    justifyContent: "center",
  },
  scroll: {
    paddingBottom: 60,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 16,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: "800",
    color: "#111827",
  },
  circleBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    alignItems: "center",
    justifyContent: "center",
  },
  profileCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    marginHorizontal: 16,
    paddingVertical: 24,
    paddingHorizontal: 16,
    alignItems: "center",
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.02,
    shadowRadius: 6,
    elevation: 1.5,
  },
  avatarContainer: {
    position: "relative",
    marginBottom: 12,
  },
  avatar: {
    width: 84,
    height: 84,
    borderRadius: 42,
    borderWidth: 2,
    borderColor: "#2563EB",
    backgroundColor: "#F3F4F6",
  },
  avatarOnlineDot: {
    position: "absolute",
    bottom: 2,
    right: 2,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: "#10B981",
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  userName: {
    fontSize: 18,
    fontWeight: "800",
    color: "#111827",
  },
  userHandle: {
    fontSize: 12,
    color: "#9CA3AF",
    fontWeight: "600",
    marginTop: 2,
  },
  userBio: {
    fontSize: 13,
    color: "#6B7280",
    textAlign: "center",
    marginTop: 8,
    lineHeight: 18,
    paddingHorizontal: 8,
  },
  detailsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 12,
  },
  detailItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    maxWidth: 160,
  },
  detailText: {
    fontSize: 11,
    color: "#4B5563",
    fontWeight: "700",
  },
  detailDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#D1D5DB",
  },
  statsRow: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 16,
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    paddingVertical: 14,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.02,
    shadowRadius: 4,
    elevation: 1,
  },
  statIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 6,
  },
  statValue: {
    fontSize: 16,
    fontWeight: "800",
    color: "#111827",
  },
  statLabel: {
    fontSize: 9,
    color: "#9CA3AF",
    fontWeight: "700",
    letterSpacing: 0.5,
    marginTop: 2,
  },
  section: {
    paddingHorizontal: 16,
    marginBottom: 20,
  },
  sectionLabel: {
    fontSize: 10,
    fontWeight: "800",
    color: "#9CA3AF",
    letterSpacing: 1.5,
    marginBottom: 10,
  },
  menuContainer: {
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    paddingHorizontal: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.02,
    shadowRadius: 6,
    elevation: 1.5,
  },
  menuRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
  },
  menuIconBox: {
    width: 34,
    height: 34,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  menuLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: "#4B5563",
  },
  menuDivider: {
    height: 1,
    backgroundColor: "#F3F4F6",
  },
  logoutBtn: {
    marginHorizontal: 16,
    height: 48,
    borderRadius: 14,
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
    fontSize: 13,
    fontWeight: "800",
  },
  versionText: {
    color: "#9CA3AF",
    fontSize: 10,
    fontWeight: "600",
    textAlign: "center",
    marginBottom: 16,
  },
});
