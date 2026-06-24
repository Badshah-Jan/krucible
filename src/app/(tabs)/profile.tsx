import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
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
import ProviderService, { ServiceProvider } from "@/services/providerService";
import { collection, onSnapshot, query, where, deleteDoc, doc } from "firebase/firestore";
import { db } from "@/services/firebase";
import PostCard from "@/components/feed/PostCard";

const T = {
  bg: "#FFFFFF",
  card: "#FFFFFF",
  primary: "#FF385C",
  blue: "#008489",
  green: "#10B981",
  purple: "#8B5CF6",
  text: "#222222",
  textSecondary: "#717171",
  separator: "#EBEBEB",
  surface: "#F7F7F7",
  border: "#EBEBEB",
};

function MenuRow({ icon, label, onPress, color = T.text }: { icon: string; label: string; onPress?: () => void; color?: string }) {
  return (
    <TouchableOpacity style={s.menuRow} onPress={onPress} activeOpacity={0.7}>
      <View style={s.menuLeft}>
        <Ionicons name={icon as any} size={22} color={color} style={s.menuIcon} />
        <Text style={[s.menuLabel, { color }]}>{label}</Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color="#D1D5DB" />
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
  const [myServices, setMyServices] = useState<ServiceProvider[]>([]);
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
    UI.confirm("Log Out", "Are you sure you want to log out of Neighborly?", performLogout, "Log Out", "warning");
  };

  const handleDeleteService = (serviceId: string) => {
    UI.confirm("Delete Service", "Are you sure you want to delete this service listing?", async () => {
      try {
        await deleteDoc(doc(db, "services", serviceId));
        UI.success("Success", "Service deleted successfully.");
      } catch (err) {
        UI.error("Error", "Could not delete service.");
      }
    }, "Delete", "danger");
  };

  useEffect(() => {
    let unsubscribeUser = () => {};
    let unsubscribePosts = () => {};
    let unsubscribeServices = () => {};

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
        unsubscribeServices = onSnapshot(
          query(collection(db, "services"), where("userId", "==", currentUser.uid)),
          (snap) => {
            setMyServices(snap.docs.map(d => ({ id: d.id, ...d.data() } as ServiceProvider)));
          }
        );
      } else {
        setLoading(false);
      }
    };
    setupSubscription();

    return () => {
      unsubscribeUser();
      unsubscribePosts();
      unsubscribeServices();
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

  const userNeighborhood = userProfile.neighborhood || userProfile.district || userProfile.city || "Neighbourhood";
  const avatarUri = userProfile.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(userProfile.name)}&background=F7F7F7&color=717171`;

  // Calculate Activity Summary
  const helpRequestsCreated = userPosts.filter(p => p.category?.toLowerCase() === "need help").length;
  const helpRequestsResolved = userProfile.helpRequestsResolved || 0;
  const recommendationsShared = userPosts.filter(p => p.category?.toLowerCase() === "recommendations" || p.category?.toLowerCase() === "recommendation").length;
  const sosResponses = userProfile.sosResponsesGiven || 0;

  return (
    <View style={s.root}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <SafeAreaView style={{ flex: 1, backgroundColor: "#FFFFFF" }} edges={["top"]}>
        
        <View style={s.header}>
          <Text style={s.screenTitle}>My Profile</Text>
          <TouchableOpacity onPress={() => router.push("/settings" as any)} hitSlop={10}>
            <Ionicons name="settings-outline" size={24} color={T.text} />
          </TouchableOpacity>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scroll}>
          
          {/* ── 1. USER INFORMATION & REPUTATION ── */}
          <View style={s.idSection}>
            <View style={s.badgeCard}>
              <View style={s.badgeAvatarWrapper}>
                <Image source={{ uri: avatarUri }} style={s.badgeAvatar} />
                {userProfile.isVerified && (
                  <View style={s.verifiedBadge}>
                    <Ionicons name="checkmark-sharp" size={10} color="#FFF" />
                  </View>
                )}
              </View>
              <Text style={s.badgeName} numberOfLines={1}>{userProfile.name}</Text>
              
              <View style={s.badgeLabelRow}>
                <Ionicons name="location-outline" size={12} color={T.textSecondary} />
                <Text style={s.badgeLabelText} numberOfLines={1}>{userNeighborhood}</Text>
              </View>
              
              <View style={[s.badgeLabelRow, { marginTop: 6 }]}>
                <Ionicons name="shield-checkmark" size={14} color={userProfile.isVerified ? T.green : T.primary} />
                <Text style={[s.badgeLabelText, { color: userProfile.isVerified ? T.green : T.text, fontWeight: "700" }]}>
                  {userProfile.isVerified ? "Verified Neighbor" : "Neighbor"}
                </Text>
              </View>

              <Text style={s.joinDateText}>Joined {getJoinedYear()}</Text>
            </View>

            <View style={s.reputationCard}>
              <Text style={s.reputationTitle}>Trust Score</Text>
              <Text style={s.trustScore}>
                {userProfile.trustScore || Math.min(100, 50 + (userProfile.isVerified ? 20 : 0) + ((userProfile.helpRequestsResolved || 0) * 10) + ((userProfile.sosResponsesGiven || 0) * 15) + (recommendationsShared * 5))}
              </Text>
              <Text style={s.reputationSub}>
                {(() => {
                  const score = userProfile.trustScore || Math.min(100, 50 + (userProfile.isVerified ? 20 : 0) + ((userProfile.helpRequestsResolved || 0) * 10) + ((userProfile.sosResponsesGiven || 0) * 15) + (recommendationsShared * 5));
                  if (score >= 95) return `Top 1% in ${userNeighborhood}`;
                  if (score >= 85) return `Top 5% in ${userNeighborhood}`;
                  if (score >= 70) return `Top 15% in ${userNeighborhood}`;
                  return `Active in ${userNeighborhood}`;
                })()}
              </Text>
            </View>
          </View>

          {/* ── 2. ACTIVITY SUMMARY ── */}
          <View style={s.sectionContainer}>
            <Text style={s.sectionTitle}>Activity Summary</Text>
            <View style={s.activityGrid}>
              <View style={s.activityStat}>
                <Text style={s.statValue}>{helpRequestsCreated}</Text>
                <Text style={s.statLabel}>Requests</Text>
              </View>
              <View style={s.activityStat}>
                <Text style={s.statValue}>{helpRequestsResolved}</Text>
                <Text style={s.statLabel}>Resolved</Text>
              </View>
              <View style={s.activityStat}>
                <Text style={s.statValue}>{recommendationsShared}</Text>
                <Text style={s.statLabel}>Recommended</Text>
              </View>
              <View style={s.activityStat}>
                <Text style={s.statValue}>{myServices.length}</Text>
                <Text style={s.statLabel}>Services</Text>
              </View>
              <View style={s.activityStat}>
                <Text style={[s.statValue, { color: T.primary }]}>{sosResponses}</Text>
                <Text style={[s.statLabel, { color: T.primary }]}>SOS Responses</Text>
              </View>
            </View>
          </View>

          {/* ── 3. MY POSTS ── */}
          <View style={s.sectionContainer}>
            <Text style={s.sectionTitle}>My Posts</Text>
            {userPosts.length === 0 ? (
              <View style={s.emptyBox}>
                <Text style={s.emptyText}>You haven't posted anything yet.</Text>
                <TouchableOpacity style={s.emptyBtn} onPress={() => router.push("/post/create" as any)}>
                  <Text style={s.emptyBtnText}>Create Post</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={s.postList}>
                {userPosts.slice(0, 3).map(post => (
                  <PostCard key={post.id} post={post} onPress={() => router.push(`/post/${post.id}` as any)} />
                ))}
                {userPosts.length > 3 && (
                  <TouchableOpacity style={s.viewAllBtn} onPress={() => router.push("/profile/posts" as any)}>
                    <Text style={s.viewAllText}>View All Posts</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
          </View>

          {/* ── 4. MY SERVICES ── */}
          <View style={s.sectionContainer}>
            <View style={s.sectionHeaderRow}>
              <Text style={s.sectionTitle}>My Services</Text>
              <TouchableOpacity onPress={() => router.push("/services/register" as any)}>
                <Text style={s.addText}>+ Add Service</Text>
              </TouchableOpacity>
            </View>
            
            {myServices.length === 0 ? (
              <View style={s.emptyBox}>
                <Text style={s.emptyText}>You haven't listed any services.</Text>
                <TouchableOpacity style={s.emptyBtn} onPress={() => router.push("/services/register" as any)}>
                  <Text style={s.emptyBtnText}>Offer a Service</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={s.serviceList}>
                {myServices.map(service => (
                  <View key={service.id} style={s.serviceCard}>
                    <View style={s.serviceHeader}>
                      <View style={{ flex: 1 }}>
                        <Text style={s.serviceCat}>{service.category}</Text>
                        <Text style={s.serviceName}>{service.name}</Text>
                        <Text style={[s.serviceStatus, { color: service.isVerified ? T.green : T.textSecondary }]}>
                          {service.isVerified ? "✓ Verified" : "Pending Verification"}
                        </Text>
                      </View>
                    </View>
                    <View style={s.serviceActions}>
                      <TouchableOpacity style={[s.svcBtn, { flex: 1 }]} onPress={() => router.push(`/services/${service.id}` as any)}>
                        <Text style={s.svcBtnText}>View</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={[s.svcBtn, s.svcBtnDanger]} onPress={() => handleDeleteService(service.id!)}>
                        <Ionicons name="trash-outline" size={16} color={T.primary} />
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </View>

          {/* ── 5. ACCOUNT MANAGEMENT ── */}
          <View style={s.sectionContainer}>
            <Text style={s.sectionTitle}>Account Management</Text>
            <View style={s.menuBox}>
              <MenuRow icon="diamond-outline" label="Neighborly Premium" onPress={() => router.push("/premium" as any)} color="#D4AF37" />
              <View style={s.menuSeparator} />
              <MenuRow icon="person-outline" label="Edit Profile" onPress={() => router.push("/settings?section=personal" as any)} />
              <View style={s.menuSeparator} />
              <MenuRow icon="lock-closed-outline" label="Change Password" onPress={() => router.push("/settings?section=security" as any)} />
              <View style={s.menuSeparator} />
              <MenuRow icon="settings-outline" label="Preferences" onPress={() => router.push("/settings" as any)} />
              <View style={s.menuSeparator} />
              <MenuRow icon="log-out-outline" label="Log Out" onPress={handleLogoutClick} color={T.primary} />
            </View>
          </View>

          <View style={s.footerContainer}>
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

  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 8,
  },
  screenTitle: {
    fontSize: 28,
    fontWeight: "800",
    color: T.text,
    letterSpacing: -0.5,
  },

  // 1. ID & Reputation
  idSection: {
    paddingHorizontal: 20,
    marginVertical: 16,
    flexDirection: "row",
    gap: 16,
  },
  badgeCard: {
    flex: 1,
    backgroundColor: T.card,
    borderRadius: 20,
    padding: 16,
    alignItems: "center",
    borderWidth: 1,
    borderColor: T.border,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  badgeAvatarWrapper: {
    position: "relative",
    marginBottom: 12,
  },
  badgeAvatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: T.surface,
  },
  verifiedBadge: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: T.green,
    borderWidth: 2,
    borderColor: T.bg,
    alignItems: "center",
    justifyContent: "center",
  },
  badgeName: {
    fontSize: 18,
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
    fontSize: 12,
    color: T.textSecondary,
    fontWeight: "500",
  },
  joinDateText: {
    fontSize: 11,
    color: "#9CA3AF",
    marginTop: 12,
    fontWeight: "600",
  },

  reputationCard: {
    width: 120,
    backgroundColor: T.surface,
    borderRadius: 20,
    padding: 16,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: T.border,
  },
  reputationTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: T.textSecondary,
    marginBottom: 8,
  },
  trustScore: {
    fontSize: 32,
    fontWeight: "800",
    color: T.green,
  },
  reputationSub: {
    fontSize: 10,
    fontWeight: "600",
    color: T.textSecondary,
    textAlign: "center",
    marginTop: 8,
  },

  // Generic Sections
  sectionContainer: {
    marginTop: 24,
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: T.text,
    marginBottom: 12,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  addText: {
    fontSize: 14,
    fontWeight: "700",
    color: T.blue,
  },

  // 2. Activity Grid
  activityGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  activityStat: {
    flex: 1,
    minWidth: "30%",
    backgroundColor: T.card,
    borderRadius: 12,
    padding: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: T.border,
  },
  statValue: {
    fontSize: 20,
    fontWeight: "800",
    color: T.text,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: T.textSecondary,
    textAlign: "center",
  },

  // Empty States
  emptyBox: {
    backgroundColor: T.surface,
    borderRadius: 16,
    padding: 24,
    alignItems: "center",
    borderWidth: 1,
    borderColor: T.separator,
  },
  emptyText: {
    fontSize: 14,
    color: T.textSecondary,
    fontWeight: "500",
    marginBottom: 16,
  },
  emptyBtn: {
    backgroundColor: T.text,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  emptyBtnText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
  },

  // Posts
  postList: {
    gap: 12,
  },
  viewAllBtn: {
    padding: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: T.separator,
    borderRadius: 8,
  },
  viewAllText: {
    fontSize: 13,
    fontWeight: "700",
    color: T.text,
  },

  // Services
  serviceList: {
    gap: 12,
  },
  serviceCard: {
    backgroundColor: T.card,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: T.border,
  },
  serviceHeader: {
    flexDirection: "row",
    marginBottom: 12,
  },
  serviceCat: {
    fontSize: 10,
    fontWeight: "800",
    color: T.green,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  serviceName: {
    fontSize: 16,
    fontWeight: "700",
    color: T.text,
    marginBottom: 4,
  },
  serviceStatus: {
    fontSize: 12,
    fontWeight: "600",
  },
  serviceActions: {
    flexDirection: "row",
    gap: 8,
  },
  svcBtn: {
    paddingVertical: 8,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: T.separator,
    borderRadius: 8,
  },
  svcBtnDanger: {
    paddingHorizontal: 16,
    borderColor: "#FEE2E2",
    backgroundColor: "#FEF2F2",
  },
  svcBtnText: {
    fontSize: 13,
    fontWeight: "700",
    color: T.text,
  },

  // Menu Box
  menuBox: {
    backgroundColor: T.card,
    borderRadius: 16,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: T.border,
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
    fontWeight: "600",
  },
  menuSeparator: {
    height: 1,
    backgroundColor: T.separator,
  },

  footerContainer: {
    marginTop: 40,
    alignItems: "center",
  },
  versionText: {
    color: T.textSecondary,
    fontSize: 11,
    fontWeight: "600",
  },
});
