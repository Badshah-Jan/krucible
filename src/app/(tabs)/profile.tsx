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

const T = {
  bg: "#FFFFFF", // Pure white page background matching Airbnb's profile look
  primary: "#FF385C", // Airbnb Coral
  text: "#222222", // Airbnb Off-black
  textSecondary: "#717171", // Airbnb Slate-gray
  separator: "#EBEBEB", // Airbnb divider line
};

// ─── Menu Row Component ──────────────────────────────────────────────────────
function MenuRow({
  icon,
  label,
  onPress,
}: {
  icon: string;
  label: string;
  onPress?: () => void;
}) {
  return (
    <TouchableOpacity style={s.menuRow} onPress={onPress} activeOpacity={0.7}>
      <View style={s.menuLeft}>
        <Ionicons name={icon as any} size={22} color={T.text} style={s.menuIcon} />
        <Text style={s.menuLabel}>{label}</Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color="#717171" />
    </TouchableOpacity>
  );
}

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
    UI.confirm("Are you sure?", "Do you really want to log out?", performLogout, "Log Out", "warning");
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

  const getJoinedYear = () => {
    if (!userProfile?.createdAt) return new Date().getFullYear();
    const dateObj = (userProfile.createdAt && typeof userProfile.createdAt.toDate === "function") 
      ? userProfile.createdAt.toDate() 
      : new Date(userProfile.createdAt);
    return dateObj.getFullYear();
  };

  if (loading || !userProfile) {
    return (
      <View style={s.loadingContainer}>
        <StatusBar barStyle="dark-content" />
        <ActivityIndicator size="small" color={T.primary} />
      </View>
    );
  }

  const karmaPoints = userProfile.karma || 0;
  const userNeighborhood = userProfile.neighborhood || userProfile.district || userProfile.city || "Neighbourhood";
  const avatarUri = userProfile.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(userProfile.name)}&background=F7F7F7&color=717171`;

  return (
    <View style={s.root}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <SafeAreaView style={{ flex: 1, backgroundColor: "#FFFFFF" }} edges={["top"]}>
        
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scroll}>
          
          {/* ── PROFILE SCREEN TITLE ── */}
          <View style={s.titleContainer}>
            <Text style={s.screenTitle}>Profile</Text>
          </View>

          {/* ── AIRBNB SIGNATURE ID CARD SECTION ── */}
          <View style={s.idSection}>
            {/* Left physical badge card */}
            <View style={s.badgeCard}>
              <View style={s.badgeAvatarWrapper}>
                <Image source={{ uri: avatarUri }} style={s.badgeAvatar} />
                <View style={s.onlineDot} />
              </View>
              <Text style={s.badgeName} numberOfLines={1}>
                {userProfile.name.split(" ")[0]}
              </Text>
              <View style={s.badgeLabelRow}>
                <Ionicons name="shield-checkmark" size={12} color={T.primary} />
                <Text style={s.badgeLabelText}>Neighbor</Text>
              </View>
            </View>

            {/* Right details column */}
            <View style={s.badgeDetails}>
              <Text style={s.aboutTitle}>About me</Text>
              
              <View style={s.aboutRow}>
                <Ionicons name="calendar-outline" size={16} color={T.text} />
                <Text style={s.aboutText}>Joined in {getJoinedYear()}</Text>
              </View>

              <View style={s.aboutRow}>
                <Ionicons name="heart-outline" size={16} color={T.text} />
                <Text style={s.aboutText}>{karmaPoints} Karma points</Text>
              </View>

              <View style={s.aboutRow}>
                <Ionicons name="hand-left-outline" size={16} color={T.text} />
                <Text style={s.aboutText}>{userProfile.sosResponsesGiven || 0} helped</Text>
              </View>

              <View style={s.aboutRow}>
                <Ionicons name="location-outline" size={16} color={T.text} />
                <Text style={s.aboutText} numberOfLines={1}>{userNeighborhood}</Text>
              </View>
            </View>
          </View>

          {/* ── HOSTING BANNER (GROW WITH NEIGHBORLY) ── */}
          <View style={s.growBanner}>
            <View style={s.growInfo}>
              <Text style={s.growTitle}>Grow with Neighborly</Text>
              <Text style={s.growSub}>Offer professional services or list your local business to connect with nearby neighbors.</Text>
            </View>
            <View style={s.growActions}>
              <TouchableOpacity style={s.growBtnSecondary} onPress={() => router.push("/businesses/register" as any)}>
                <Text style={s.growBtnSecondaryText}>List Business</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.growBtnPrimary} onPress={() => router.push("/services/register" as any)}>
                <Text style={s.growBtnPrimaryText}>Offer Service</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* ── SETTINGS SECTION: ACCOUNT SETTINGS ── */}
          <View style={s.listContainer}>
            <Text style={s.listGroupTitle}>Account Settings</Text>
            
            <MenuRow icon="person-circle-outline" label="Personal info" onPress={() => router.push("/settings?section=personal" as any)} />
            <View style={s.menuSeparator} />
            
            <MenuRow icon="shield-checkmark-outline" label="Login & security" onPress={() => router.push("/settings?section=security" as any)} />
            <View style={s.menuSeparator} />
            
            <MenuRow icon="notifications-outline" label="Notifications" onPress={() => router.push("/notifications" as any)} />
            <View style={s.menuSeparator} />
            
            <MenuRow icon="lock-closed-outline" label="Privacy & Safety" onPress={() => router.push("/settings?section=privacy" as any)} />
          </View>

          {/* ── SETTINGS SECTION: COMMUNITY CONTRIBUTIONS ── */}
          <View style={s.listContainer}>
            <Text style={s.listGroupTitle}>My Contributions</Text>
            
            <MenuRow icon="star-outline" label="Karma points dashboard" onPress={() => router.push("/karma" as any)} />
            <View style={s.menuSeparator} />
            
            <MenuRow icon="people-outline" label="Emergency contacts" onPress={() => router.push("/settings/emergency-contacts" as any)} />
            <View style={s.menuSeparator} />
            
            <MenuRow icon="help-circle-outline" label="Help & Support Desk" onPress={() => router.push("/support" as any)} />
          </View>

          {/* ── LOGOUT & VERSION ── */}
          <View style={s.footerContainer}>
            <TouchableOpacity
              style={[s.logoutBtn, isLoggingOut && { opacity: 0.5 }]}
              onPress={handleLogoutClick}
              activeOpacity={0.8}
              disabled={isLoggingOut}
            >
              <Text style={s.logoutText}>
                {isLoggingOut ? "Logging out..." : "Log out"}
              </Text>
            </TouchableOpacity>
            <View style={{ width: '100%', height: 1, backgroundColor: T.separator, marginVertical: 24 }} />
            <Text style={s.versionText}>Neighborly v1.0.0 • Help Is Nearby</Text>
          </View>

        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: T.bg },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: T.bg },
  scroll: { paddingBottom: 60 },

  titleContainer: {
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 8,
  },
  screenTitle: {
    fontSize: 32,
    fontWeight: "800",
    color: T.text,
    letterSpacing: -0.8,
  },

  // Airbnb Signature Side-by-Side ID Card Section
  idSection: {
    flexDirection: "row",
    paddingHorizontal: 24,
    marginVertical: 24,
    gap: 24,
    alignItems: "center",
  },
  badgeCard: {
    width: 140,
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 16,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#EBEBEB",
    // Premium soft card shadow
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  badgeAvatarWrapper: {
    position: "relative",
    marginBottom: 12,
  },
  badgeAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#F7F7F7",
  },
  onlineDot: {
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
  badgeName: {
    fontSize: 20,
    fontWeight: "800",
    color: T.text,
    textAlign: "center",
    marginBottom: 4,
  },
  badgeLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  badgeLabelText: {
    fontSize: 11,
    color: T.text,
    fontWeight: "700",
  },

  // Right details side of the ID Card
  badgeDetails: {
    flex: 1,
    justifyContent: "center",
  },
  aboutTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: T.text,
    marginBottom: 12,
  },
  aboutRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginVertical: 4,
  },
  aboutText: {
    fontSize: 13,
    color: T.text,
    fontWeight: "600",
  },

  // Hosting Banner
  growBanner: {
    backgroundColor: "#FFFFFF",
    marginHorizontal: 24,
    padding: 18,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#EBEBEB",
    marginVertical: 12,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.02,
    shadowRadius: 6,
    elevation: 1,
  },
  growInfo: { marginBottom: 16 },
  growTitle: { fontSize: 16, fontWeight: "800", color: T.text },
  growSub: { fontSize: 13, color: T.textSecondary, lineHeight: 18, marginTop: 4, fontWeight: "500" },
  growActions: { flexDirection: "row", gap: 10 },
  growBtnPrimary: {
    flex: 1,
    backgroundColor: T.text,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  growBtnPrimaryText: { color: "#FFFFFF", fontSize: 13, fontWeight: "800" },
  growBtnSecondary: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#DDDDDD",
    alignItems: "center",
    justifyContent: "center",
  },
  growBtnSecondaryText: { color: T.text, fontSize: 13, fontWeight: "800" },

  // List Settings
  listContainer: {
    marginVertical: 16,
    paddingHorizontal: 24,
  },
  listGroupTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: T.text,
    marginBottom: 12,
  },
  menuRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 16,
  },
  menuLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  menuIcon: {
    width: 24,
    textAlign: "center",
  },
  menuLabel: {
    fontSize: 15,
    fontWeight: "500",
    color: T.text,
  },
  menuSeparator: {
    height: 1,
    backgroundColor: T.separator,
  },

  // Footer & Logout
  footerContainer: {
    marginTop: 24,
    paddingHorizontal: 24,
  },
  logoutBtn: {
    paddingVertical: 8,
  },
  logoutText: {
    color: T.text,
    fontSize: 16,
    fontWeight: "800",
    textDecorationLine: "underline",
  },
  versionText: {
    color: T.textSecondary,
    fontSize: 11,
    fontWeight: "600",
  },
});
