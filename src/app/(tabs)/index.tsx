import CategoryChips from "@/components/feed/CategoryChips";
import PostCard from "@/components/feed/PostCard";
import { chipIdToFirestoreValue } from "@/constants/categories";
import { useLocationGuard } from "@/hooks/useLocationGuard";
import { useNotifications } from "@/hooks/useNotifications";
import { AuthService } from "@/services/authService";
import { CommunityDoc, CommunityService } from "@/services/communityService";
import { Post as FirestorePost, PostService } from "@/services/postService";
import { SosService, SOSAlert } from "@/services/sosService";
import ProviderService, { ServiceProvider } from "@/services/providerService";
import BusinessService, { BusinessProfile } from "@/services/businessService";
import { UserService } from "@/services/userService";
import { useAppStore } from "@/store/appStore";
import { formatDistance, haversineDistance } from "@/utils/distance";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, {
    useCallback,
    useEffect,
    useMemo,
    useState
} from "react";
import { useTranslation } from "react-i18next";
import {
    ActivityIndicator,
    Alert,
    Modal,
    Pressable,
    RefreshControl,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from "react-native";
import Animated, { FadeIn, FadeInDown } from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";

const PX = 16;

const T = {
  bg: "#F8F9FA",
  card: "#FFFFFF",
  primary: "#EF4444",
  text: "#111827",
  textSecondary: "#6B7280",
  border: "#E5E7EB",
  danger: "#DC2626",
  dangerBg: "#FEE2E2",
};

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

function getTimeAgo(ts: any): string {
  if (!ts) return "now";
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  const s = Math.floor((Date.now() - d.getTime()) / 1000);
  if (s < 60) return "now";
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  if (s < 86400) return `${Math.floor(s / 3600)}h`;
  return `${Math.floor(s / 86400)}d`;
}

function isWithin24h(ts: any): boolean {
  if (!ts) return false;
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return Date.now() - d.getTime() < 86_400_000;
}

export default function HomeFeedScreen() {
  const router = useRouter();
  const community = useAppStore((s) => s.community);
  const coordinates = useAppStore((s) => s.coordinates);
  const authInitialized = useAppStore((s) => s.authInitialized);
  const { t } = useTranslation();
  const { unreadCount } = useNotifications();
  const { isGpsDisabled, guardAction, openLocationSettings } =
    useLocationGuard();

  const [selectedCategory, setSelectedCategory] = useState("all");
  const [sheetVisible, setSheetVisible] = useState(false);
  const [neighModal, setNeighModal] = useState(false);

  const [livePosts, setLivePosts] = useState<FirestorePost[]>([]);
  const [activeSosAlerts, setActiveSosAlerts] = useState<SOSAlert[]>([]);
  const [communityDoc, setCommunityDoc] = useState<CommunityDoc | null>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [featuredProviders, setFeaturedProviders] = useState<ServiceProvider[]>([]);
  const [nearbyBusinesses, setNearbyBusinesses] = useState<BusinessProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [feedError, setFeedError] = useState<string | null>(null);

  // ── Real-time user profile ────────────────────────────────────────────────
  useEffect(() => {
    const me = AuthService.getCurrentUser();
    if (!me) return;
    const unsub = UserService.subscribeToUser(me.uid, (p) => setUserProfile(p));
    return unsub;
  }, []);

  // ── Real-time community document ──────────────────────────────────────────
  useEffect(() => {
    const cid = community?.communityId ?? userProfile?.communityId;
    if (!cid) return;
    const unsub = CommunityService.subscribeToCommunity(cid, (doc) =>
      setCommunityDoc(doc),
    );
    return unsub;
  }, [community?.communityId, userProfile?.communityId]);

  // ── Real-time post feed ───────────────────────────────────────────────────
  useEffect(() => {
    const cid = community?.communityId ?? userProfile?.communityId;
    if (!authInitialized) return;
    if (!cid) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setFeedError(null);

    const unsubPosts = PostService.subscribeToCommunityPosts(
      cid,
      coordinates?.lat,
      coordinates?.lng,
      (posts) => {
        setLivePosts(posts);
        setIsLoading(false);
        setFeedError(null);
      },
      (err) => {
        console.error("Feed subscription error:", err);
        setFeedError("Could not load feed. Check your connection.");
        setIsLoading(false);
      },
    );

    const unsubSos = SosService.subscribeToActiveSOS(cid, (alerts) => {
      setActiveSosAlerts(alerts);
    });

    const loadMonetizationEntities = async () => {
      try {
        const providers = await ProviderService.getServicesByCommunity(cid);
        setFeaturedProviders(providers.filter(p => p.featured).slice(0, 5));
        
        const businesses = await BusinessService.getBusinessesByCommunity(cid);
        setNearbyBusinesses(businesses.slice(0, 5));
      } catch (err) {
        console.warn("Could not load monetization entities", err);
      }
    };
    loadMonetizationEntities();

    // Auto-heal missing communityId in user profile
    const healProfile = async () => {
      const me = AuthService.getCurrentUser();
      if (me && cid && userProfile && !userProfile.communityId) {
        await UserService.updateUser(me.uid, { communityId: cid } as any);
      }
    };
    healProfile();

    return () => {
      unsubPosts();
      unsubSos();
    };
  }, [
    authInitialized,
    community?.communityId,
    userProfile?.communityId,
    coordinates?.lat,
    coordinates?.lng,
  ]);

  // ── Derived stats ─────────────────────────────────────────────────────────
  const oneDayAgo = Date.now() - 86_400_000;

  const activeSosCount = activeSosAlerts.length;

  const activeTodayCount = livePosts.filter((p) => {
    if (!p.createdAt) return false;
    const d = p.createdAt.toDate ? p.createdAt.toDate() : new Date(p.createdAt);
    return d.getTime() > oneDayAgo;
  }).length;

  const memberCount =
    communityDoc?.memberCount ??
    Math.max(new Set(livePosts.map((p) => p.userId)).size, 1);

  // ── Feed filtering ────────────────────────────────────────────────────────
  const filtered = livePosts.filter((p) => {
    if (selectedCategory === "all") return true;
    const firestoreVal = chipIdToFirestoreValue(selectedCategory);
    if (!firestoreVal) return true;
    return p.category.toLowerCase() === firestoreVal.toLowerCase();
  });

  // ── Display values ────────────────────────────────────────────────────────
  const me = AuthService.getCurrentUser();
  const displayName =
    userProfile?.displayName ||
    userProfile?.name ||
    me?.displayName ||
    "Neighbor";

  const areaName =
    communityDoc?.name ||
    community?.district ||
    community?.area ||
    userProfile?.neighborhood ||
    userProfile?.communityName ||
    "Your Area";

  const cityName =
    communityDoc?.city || community?.city || userProfile?.city || "";

  // ── Like handler ──────────────────────────────────────────────────────────
  const handleLike = useCallback(
    async (post: FirestorePost) => {
      if (!me) return;
      setLivePosts((curr) =>
        curr.map((p) => {
          if (p.id !== post.id) return p;
          const liked = p.likedBy?.includes(me.uid) ?? false;
          return {
            ...p,
            likesCount: liked
              ? Math.max(0, p.likesCount - 1)
              : p.likesCount + 1,
            likedBy: liked
              ? (p.likedBy ?? []).filter((u) => u !== me.uid)
              : [...(p.likedBy ?? []), me.uid],
          };
        }),
      );
      try {
        await PostService.toggleLike(post.id!, me.uid);
      } catch {}
    },
    [me],
  );

  // ── Feed items ──────────────────────────────────────────────────────────
  const feedItems = useMemo(() => {
    // 1. Map SOS Alerts into feed-friendly cards
    const sosItems = activeSosAlerts.map(alert => {
      let dist = "Nearby";
      if (coordinates && alert.location?.lat && alert.location?.lng) {
        dist = formatDistance(
          haversineDistance(
            coordinates.lat,
            coordinates.lng,
            alert.location.lat,
            alert.location.lng,
          ),
        );
      }
      return {
        id: `sos_${alert.id}`,
        originalId: alert.id,
        userName: alert.creatorName,
        userAvatar: "", 
        timePosted: getTimeAgo(alert.createdAt),
        distance: dist,
        likes: 0,
        commentsCount: alert.respondersCount || 0, 
        likedByMe: false,
        category: "Emergency", 
        title: `🚨 ${alert.type}`,
        description: `Emergency reported in ${alert.location.area}. Status: ${alert.status.toUpperCase()}`,
        createdAt: alert.createdAt,
        isSos: true,
      };
    });

    // 2. Map standard posts
    const postItems = filtered.map((post) => {
      let dist = "Nearby";
      if (coordinates && post.latitude && post.longitude) {
        dist = formatDistance(
          haversineDistance(
            coordinates.lat,
            coordinates.lng,
            post.latitude,
            post.longitude,
          ),
        );
      }
      return {
        ...post,
        id: post.id ?? Math.random().toString(),
        userName: post.userName ?? "Neighbor",
        userAvatar: post.userAvatar ?? "",
        timePosted: getTimeAgo(post.createdAt),
        distance: dist,
        likes: post.likesCount ?? 0,
        commentsCount: post.commentsCount ?? 0,
        likedByMe: me ? (post.likedBy?.includes(me.uid) ?? false) : false,
        isSos: false,
      };
    });

    // 3. Combine and sort
    const combined = [...sosItems, ...postItems];
    combined.sort((a, b) => {
       const aTime = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : 0;
       const bTime = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : 0;
       return bTime - aTime;
    });

    return combined;
  }, [filtered, activeSosAlerts, coordinates, me]);

  const go = (action: string) => guardAction(action);

  return (
    <View style={[s.root, { backgroundColor: T.bg }]}>
      <StatusBar
        barStyle="dark-content"
        translucent
        backgroundColor="transparent"
      />
      <SafeAreaView style={{ flex: 1, backgroundColor: T.bg }} edges={["top"]}>
        {/* ── HEADER ── */}
        <View style={s.header}>
          <View>
            <Text style={s.headerGreeting}>{getGreeting()},</Text>
            <Text style={s.headerName}>{displayName}</Text>
          </View>
          <View style={s.headerActions}>
            <TouchableOpacity
              style={s.circleBtn}
              onPress={() => router.push("/search")}
            >
              <Ionicons name="search" size={20} color={T.text} />
            </TouchableOpacity>
            <TouchableOpacity
              style={s.circleBtn}
              onPress={() => router.push("/notifications")}
            >
              <Ionicons name="notifications-outline" size={20} color={T.text} />
              {unreadCount > 0 && <View style={s.redDot} />}
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 112 }}
          refreshControl={
            <RefreshControl
              refreshing={isLoading}
              onRefresh={() => {
                setIsLoading(true);
                setTimeout(() => setIsLoading(false), 800);
              }}
              colors={[T.primary]}
              tintColor={T.primary}
            />
          }
        >
          <View>
            {/* ── NEIGHBOURHOOD BAR ── */}
            <TouchableOpacity
              style={s.locationBar}
              activeOpacity={0.8}
              onPress={() => setNeighModal(true)}
            >
              <View style={s.locPinCircle}>
                <Ionicons name="location" size={16} color="#FFFFFF" />
              </View>
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={s.locLabel}>Your neighbourhood</Text>
                <Text style={s.locName} numberOfLines={1}>
                  {areaName}
                </Text>
              </View>
              <Ionicons name="chevron-down" size={18} color={T.textSecondary} />
            </TouchableOpacity>

            {/* ── HERO CARD ── */}
            <Animated.View
              entering={FadeInDown.duration(400)}
              style={s.heroContainer}
            >
              <View style={s.heroCard}>
                <View style={s.heroBadgeRow}>
                  <View
                    style={[
                      s.heroBadge,
                      {
                        backgroundColor:
                          activeSosCount > 0 ? "#450A0A" : "#1A2E1A",
                      },
                    ]}
                  >
                    <View
                      style={{
                        width: 7,
                        height: 7,
                        borderRadius: 4,
                        backgroundColor:
                          activeSosCount > 0 ? "#EF4444" : "#22C55E",
                        marginRight: 6,
                      }}
                    />
                    <Text
                      style={[
                        s.heroBadgeText,
                        { color: activeSosCount > 0 ? "#FCA5A5" : "#86EFAC" },
                      ]}
                    >
                      {activeSosCount > 0
                        ? `${activeSosCount} active alert${activeSosCount > 1 ? "s" : ""} nearby`
                        : "All clear nearby"}
                    </Text>
                  </View>
                </View>
                <Text style={s.heroTitle}>
                  Your community is looking out for you
                </Text>
                <Text style={s.heroSubtitle}>
                  Stay informed, offer help, and build trust with your
                  neighbours in real time.
                </Text>
                <TouchableOpacity
                  style={s.heroBtn}
                  onPress={() => setSelectedCategory("emergency")}
                >
                  <Text style={s.heroBtnText}>View alerts →</Text>
                </TouchableOpacity>
                <View style={s.heroDivider} />
                <View style={s.heroStats}>
                  <View style={s.heroStatCol}>
                    <Text style={s.heroStatVal}>{memberCount}</Text>
                    <Text style={s.heroStatLbl}>Members</Text>
                  </View>
                  <View style={s.heroStatCol}>
                    <Text style={s.heroStatVal}>{activeTodayCount}</Text>
                    <Text style={s.heroStatLbl}>Active today</Text>
                  </View>
                  <View style={s.heroStatCol}>
                    <Text style={s.heroStatVal}>
                      {activeSosCount > 0 ? activeSosCount : "–"}
                    </Text>
                    <Text style={s.heroStatLbl}>Active SOS</Text>
                  </View>
                </View>
              </View>
            </Animated.View>

            {/* ── QUICK ACTIONS ── */}
            <Animated.View entering={FadeInDown.duration(350).delay(100)}>
              <View style={s.sectionHead}>
                <Text style={s.sectionTitle}>Quick actions</Text>
              </View>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={s.quickActionsRow}
              >
                {(
                  [
                    {
                      color1: "#FEE2E2",
                      color2: "#FEF2F2",
                      border: "#EF4444",
                      icon: "alert",
                      label: "SOS Alert",
                      textColor: "#EF4444",
                      route: "/sos",
                    },
                    {
                      color1: "#DBEAFE",
                      color2: "#EFF6FF",
                      border: "#2563EB",
                      icon: "hand-left-outline",
                      label: "Need Help",
                      textColor: "#2563EB",
                      route: "/post/create?type=help",
                    },
                    {
                      color1: "#D1FAE5",
                      color2: "#ECFDF5",
                      border: "#10B981",
                      icon: "heart-outline",
                      label: "Offer Help",
                      textColor: "#10B981",
                      route: "/post/create?type=offer",
                    },
                    {
                      color1: "#E9D5FF",
                      color2: "#FAF5FF",
                      border: "#9333EA",
                      icon: "star-outline",
                      label: "Recommend",
                      textColor: "#9333EA",
                      route: "/post/create?type=recommend",
                    },
                    {
                      color1: "#FEF3C7",
                      color2: "#FFFBEB",
                      border: "#D97706",
                      icon: "search-outline",
                      label: "Lost & Found",
                      textColor: "#D97706",
                      route: "/post/create?type=lost",
                    },
                  ] as const
                ).map((a) => (
                  <TouchableOpacity
                    key={a.label}
                    style={[
                      s.actionCard,
                      { borderColor: a.color1, backgroundColor: a.color2 },
                    ]}
                    onPress={() => router.push(a.route as any)}
                  >
                    <View
                      style={[
                        s.actionRing,
                        { backgroundColor: a.color1, borderColor: a.border },
                      ]}
                    >
                      <Ionicons
                        name={a.icon as any}
                        size={18}
                        color={a.border}
                      />
                    </View>
                    <Text style={[s.actionText, { color: a.textColor }]}>
                      {a.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </Animated.View>

            {/* ── MARKETPLACE BANNER ── */}
            <Animated.View entering={FadeInDown.duration(350).delay(150)}>
              <View style={s.sectionHead}>
                <Text style={s.sectionTitle}>Local Services</Text>
              </View>
              <TouchableOpacity
                style={s.marketplaceBanner}
                onPress={() => router.push("/services" as any)}
                activeOpacity={0.9}
              >
                <View style={s.marketIcon}>
                  <Ionicons name="briefcase" size={22} color="#FFFFFF" />
                </View>
                <View style={{ flex: 1, paddingRight: 10 }}>
                  <Text style={s.marketTitle}>Service Marketplace</Text>
                  <Text style={s.marketSub}>
                    Find local plumbers, electricians, tutors, and more
                  </Text>
                </View>
                <View style={s.marketAction}>
                  <Text style={s.marketActionText}>Explore</Text>
                  <Ionicons name="arrow-forward" size={12} color="#4F46E5" />
                </View>
              </TouchableOpacity>
            </Animated.View>

            {/* ── LOCAL HIGHLIGHTS (COMBINED) ── */}
            {(featuredProviders.length > 0 || nearbyBusinesses.length > 0) && (
              <Animated.View entering={FadeInDown.duration(350).delay(150)}>
                <View style={s.sectionHead}>
                  <Text style={s.sectionTitle}>Local Highlights</Text>
                  <TouchableOpacity onPress={() => router.push("/businesses" as any)}>
                    <Text style={{color: T.primary, fontSize: 13, fontWeight: "600"}}>Explore</Text>
                  </TouchableOpacity>
                </View>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: PX, paddingTop: 12, paddingBottom: 8, gap: 12 }}>
                  {featuredProviders.map(provider => (
                    <TouchableOpacity 
                      key={`prov-${provider.id}`} 
                      style={s.featuredCard}
                      onPress={() => router.push(`/services/${provider.id}` as any)}
                    >
                      <View style={[s.featuredBadge, { backgroundColor: '#F59E0B' }]}>
                        <Ionicons name="star" size={10} color="#FFFFFF" />
                        <Text style={s.featuredBadgeText}>Featured</Text>
                      </View>
                      <View style={s.featuredIconBox}>
                        <Ionicons name="person" size={20} color="#FFFFFF" />
                      </View>
                      <Text style={s.featuredName} numberOfLines={1}>{provider.name}</Text>
                      <Text style={s.featuredCat}>{provider.category}</Text>
                    </TouchableOpacity>
                  ))}
                  {nearbyBusinesses.map(biz => (
                    <TouchableOpacity 
                      key={`biz-${biz.id}`} 
                      style={s.bizCard}
                      onPress={() => router.push(`/businesses/${biz.id}` as any)}
                    >
                      <View style={s.bizIconBox}>
                        <Ionicons name="storefront" size={24} color="#6366F1" />
                      </View>
                      <Text style={s.bizName} numberOfLines={1}>{biz.businessName}</Text>
                      <Text style={s.bizCat}>{biz.category}</Text>
                      {biz.verified && (
                        <View style={s.bizVerified}>
                          <Ionicons name="checkmark-circle" size={12} color="#10B981" />
                          <Text style={s.bizVerifiedText}>Verified</Text>
                        </View>
                      )}
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </Animated.View>
            )}

            {/* ── FEED HEADER ── */}
            <Animated.View entering={FadeIn.delay(250)}>
              <View style={s.sectionHead}>
                <Text style={s.sectionTitle}>Community feed</Text>
                <Pressable
                  style={s.postBtn}
                  onPress={() => {
                    if (!go("Post")) return;
                    setSheetVisible(true);
                  }}
                >
                  <Text style={s.postBtnText}>+ Post</Text>
                </Pressable>
              </View>
              <CategoryChips
                selectedCategory={selectedCategory}
                onSelectCategory={setSelectedCategory}
              />
            </Animated.View>

            {/* ── STATES (GPS off / error / loading) ── */}
            {isGpsDisabled ? (
              <View style={[s.stateBox, { marginHorizontal: PX }]}>
                <Ionicons
                  name="location-outline"
                  size={36}
                  color={T.textSecondary}
                />
                <Text style={s.stateTitle}>Location off</Text>
                <Text style={s.stateSub}>
                  Enable GPS to see your community feed.
                </Text>
                <TouchableOpacity
                  style={s.stateBtn}
                  onPress={openLocationSettings}
                >
                  <Text style={s.stateBtnTxt}>Enable Location</Text>
                </TouchableOpacity>
              </View>
            ) : feedError ? (
              <View style={[s.stateBox, { marginHorizontal: PX }]}>
                <Ionicons
                  name="cloud-offline-outline"
                  size={36}
                  color={T.textSecondary}
                />
                <Text style={s.stateTitle}>Could not load feed</Text>
                <Text style={s.stateSub}>{feedError}</Text>
              </View>
            ) : isLoading ? (
              <View
                style={{ paddingVertical: 52, alignItems: "center", gap: 12 }}
              >
                <ActivityIndicator size="small" color={T.primary} />
                <Text style={{ color: T.textSecondary, fontSize: 13 }}>
                  Loading feed…
                </Text>
              </View>
            ) : feedItems.length === 0 ? (
              <View style={[s.onboardingCard, { marginHorizontal: PX }]}>
                <View style={s.onboardingIconBg}>
                  <Ionicons name="people-outline" size={36} color={T.primary} />
                </View>
                <Text style={s.onboardingTitle}>Welcome to your community</Text>
                <Text style={s.onboardingDesc}>
                  Be the first to ask for help, share recommendations, or
                  connect with neighbors.
                </Text>
                <TouchableOpacity
                  style={s.onboardingPrimaryBtn}
                  onPress={() => {
                    if (!go("Post")) return;
                    router.push("/post/create");
                  }}
                >
                  <Text style={s.onboardingPrimaryBtnText}>Create Post</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={{ paddingHorizontal: PX }}>
                {feedItems.map((post) => (
                  <PostCard
                    key={post.id}
                    post={post}
                    onPress={() => 
                      post.isSos 
                        ? router.push(`/sos/${post.originalId}` as any) 
                        : router.push(`/post/${post.id}` as any)
                    }
                    onLikePress={() => !post.isSos && handleLike(post as FirestorePost)}
                    onCommentPress={() =>
                      post.isSos 
                        ? router.push(`/sos/${post.originalId}` as any) 
                        : router.push(`/post/${post.id}` as any)
                    }
                  />
                ))}
              </View>
            )}
          </View>
        </ScrollView>

        {/* ── NEIGHBOURHOOD MODAL ── */}
        <Modal
          visible={neighModal}
          transparent
          animationType="fade"
          onRequestClose={() => setNeighModal(false)}
        >
          <Pressable
            style={s.neighOverlay}
            onPress={() => setNeighModal(false)}
          >
            <Pressable
              style={s.neighSheet}
              onPress={(e) => e.stopPropagation()}
            >
              <View style={s.neighHandle} />
              <View style={s.neighIconWrap}>
                <View style={s.neighIconCircle}>
                  <Ionicons name="location" size={22} color="#EF4444" />
                </View>
              </View>
              <Text style={s.neighModalLabel}>YOUR NEIGHBOURHOOD</Text>
              <Text style={s.neighModalArea}>{areaName}</Text>
              {cityName ? (
                <Text style={s.neighModalCity}>{cityName}</Text>
              ) : null}

              <View style={s.neighInfoRow}>
                <Ionicons name="people-outline" size={15} color="#6B7280" />
                <Text style={s.neighInfoText}>
                  {memberCount} members in your area
                </Text>
              </View>
              <View style={s.neighInfoRow}>
                <Ionicons name="radio-outline" size={15} color="#6B7280" />
                <Text style={s.neighInfoText}>
                  {activeSosCount > 0
                    ? `${activeSosCount} active alert${activeSosCount > 1 ? "s" : ""} right now`
                    : "No active alerts nearby"}
                </Text>
              </View>
              <View style={s.neighInfoRow}>
                <Ionicons name="flash-outline" size={15} color="#6B7280" />
                <Text style={s.neighInfoText}>
                  {activeTodayCount} posts active today
                </Text>
              </View>

              <TouchableOpacity
                style={s.neighDismissBtn}
                onPress={() => setNeighModal(false)}
                activeOpacity={0.85}
              >
                <Text style={s.neighDismissText}>Got it</Text>
              </TouchableOpacity>
            </Pressable>
          </Pressable>
        </Modal>

        {/* ── BOTTOM SHEET ── */}
        <Modal
          visible={sheetVisible}
          transparent
          animationType="slide"
          onRequestClose={() => setSheetVisible(false)}
        >
          <Pressable style={s.sheetBg} onPress={() => setSheetVisible(false)}>
            <Pressable style={s.sheet} onPress={(e) => e.stopPropagation()}>
              <View style={s.sheetPill} />
              <Text style={s.sheetTitle}>Create Post</Text>

              {(
                [
                  {
                    icon: "megaphone-outline",
                    title: "Post to Community",
                    sub: "Share news, updates or services",
                    route: "/post/create",
                  },
                  {
                    icon: "hand-right-outline",
                    title: "Ask for Help",
                    sub: "Request assistance from neighbors",
                    route: "/post/create?type=help",
                  },
                  {
                    icon: "star-outline",
                    title: "Recommend",
                    sub: "Share a recommendation",
                    route: "/post/create?type=recommend",
                  },
                  {
                    icon: "search-outline",
                    title: "Lost & Found",
                    sub: "Report or find a lost item",
                    route: "/post/create?type=lost",
                  },
                ] as const
              ).map((item) => (
                <TouchableOpacity
                  key={item.title}
                  style={s.sheetRow}
                  onPress={() => {
                    setSheetVisible(false);
                    router.push(item.route as any);
                  }}
                >
                  <View style={s.sheetIco}>
                    <Ionicons name={item.icon} size={20} color={T.text} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.sheetRowT}>{item.title}</Text>
                    <Text style={s.sheetRowS}>{item.sub}</Text>
                  </View>
                  <Ionicons
                    name="chevron-forward"
                    size={15}
                    color={T.textSecondary}
                  />
                </TouchableOpacity>
              ))}

              <TouchableOpacity
                style={[s.sheetRow, { borderBottomWidth: 0 }]}
                onPress={() => {
                  setSheetVisible(false);
                  router.push("/sos");
                }}
              >
                <View style={[s.sheetIco, { backgroundColor: T.dangerBg }]}>
                  <Ionicons name="alert" size={20} color={T.danger} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[s.sheetRowT, { color: T.danger }]}>
                    SOS Alert
                  </Text>
                  <Text style={s.sheetRowS}>
                    For immediate emergencies only
                  </Text>
                </View>
              </TouchableOpacity>
            </Pressable>
          </Pressable>
        </Modal>
      </SafeAreaView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: T.bg },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: PX,
    paddingTop: 12,
    paddingBottom: 8,
    backgroundColor: T.bg,
  },
  headerGreeting: { color: T.textSecondary, fontSize: 13, fontWeight: "500" },
  headerName: {
    color: T.text,
    fontSize: 24,
    fontWeight: "800",
    letterSpacing: -0.5,
    marginTop: 2,
  },
  headerActions: { flexDirection: "row", gap: 10 },
  circleBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: T.card,
    borderWidth: 1,
    borderColor: T.border,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  redDot: {
    position: "absolute",
    top: 11,
    right: 11,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: T.primary,
  },

  locationBar: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: PX,
    marginTop: 14,
    backgroundColor: T.card,
    borderRadius: 100,
    borderWidth: 1,
    borderColor: T.border,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  locPinCircle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: T.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  locLabel: { color: T.textSecondary, fontSize: 10, fontWeight: "600" },
  locName: { color: T.text, fontSize: 13, fontWeight: "700", marginTop: 1 },

  heroContainer: { paddingHorizontal: PX, marginTop: 14, marginBottom: 6 },
  heroCard: {
    backgroundColor: "#1A1A1A",
    borderRadius: 20,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 10,
    elevation: 6,
  },
  heroBadgeRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  heroBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 100,
  },
  heroBadgeText: { fontSize: 11, fontWeight: "700", letterSpacing: 0.1 },
  heroTitle: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "800",
    lineHeight: 23,
    letterSpacing: -0.3,
  },
  heroSubtitle: {
    color: "#9CA3AF",
    fontSize: 12,
    lineHeight: 17,
    marginTop: 5,
    fontWeight: "400",
  },
  heroBtn: {
    alignSelf: "flex-start",
    backgroundColor: T.primary,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 100,
    marginTop: 14,
  },
  heroBtnText: { color: "#FFFFFF", fontSize: 12, fontWeight: "700" },
  heroDivider: { height: 1, backgroundColor: "#2D2D2D", marginVertical: 14 },
  heroStats: { flexDirection: "row", justifyContent: "space-between" },
  heroStatCol: { flex: 1 },
  heroStatVal: { color: "#FFFFFF", fontSize: 16, fontWeight: "800" },
  heroStatLbl: {
    color: "#9CA3AF",
    fontSize: 10,
    marginTop: 2,
    fontWeight: "500",
  },

  quickActionsRow: {
    flexDirection: "row",
    paddingHorizontal: PX,
    gap: 8,
    paddingRight: PX * 2,
  },
  actionCard: {
    width: 94,
    borderRadius: 16,
    borderWidth: 1.5,
    paddingVertical: 14,
    alignItems: "center",
    gap: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  actionRing: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
  },
  actionText: { fontSize: 10, fontWeight: "700", textAlign: "center" },

  sectionHead: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: PX,
    marginTop: 24,
    marginBottom: 14,
  },
  sectionTitle: {
    color: T.text,
    fontSize: 16,
    fontWeight: "800",
    letterSpacing: -0.3,
  },
  postBtn: { paddingHorizontal: 4, paddingVertical: 2 },
  postBtnText: { color: T.primary, fontSize: 13, fontWeight: "700" },
  feedList: { paddingHorizontal: PX },

  onboardingCard: {
    backgroundColor: T.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: T.border,
    padding: 24,
    alignItems: "center",
    marginTop: 8,
  },
  onboardingIconBg: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#FEF2F2",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  onboardingTitle: {
    color: T.text,
    fontSize: 18,
    fontWeight: "800",
    textAlign: "center",
    marginBottom: 8,
  },
  onboardingDesc: {
    color: T.textSecondary,
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 20,
  },
  onboardingPrimaryBtn: {
    backgroundColor: T.primary,
    height: 44,
    borderRadius: 10,
    paddingHorizontal: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  onboardingPrimaryBtnText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },

  stateBox: {
    borderRadius: 16,
    backgroundColor: T.card,
    borderWidth: 1,
    borderColor: T.border,
    paddingVertical: 36,
    paddingHorizontal: 24,
    alignItems: "center",
  },
  stateTitle: {
    color: T.text,
    fontSize: 17,
    fontWeight: "700",
    marginTop: 14,
    marginBottom: 6,
  },
  stateSub: {
    color: T.textSecondary,
    fontSize: 13,
    textAlign: "center",
    lineHeight: 20,
  },
  stateBtn: {
    marginTop: 18,
    backgroundColor: T.text,
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 100,
  },
  stateBtnTxt: { color: "#FFF", fontSize: 13, fontWeight: "800" },

  sheetBg: {
    flex: 1,
    backgroundColor: "rgba(17, 24, 39, 0.4)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: T.card,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 12,
    paddingHorizontal: PX,
    paddingBottom: 40,
    borderWidth: 1,
    borderColor: T.border,
  },
  sheetPill: {
    width: 36,
    height: 4,
    backgroundColor: T.border,
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 20,
  },
  sheetTitle: {
    color: T.text,
    fontSize: 19,
    fontWeight: "800",
    marginBottom: 16,
  },
  sheetRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: T.border,
  },
  sheetIco: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: T.bg,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  sheetRowT: { color: T.text, fontSize: 15, fontWeight: "700" },
  sheetRowS: { color: T.textSecondary, fontSize: 12, marginTop: 2 },

  neighOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "flex-end",
  },
  neighSheet: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingTop: 12,
    paddingHorizontal: 24,
    paddingBottom: 40,
    borderTopWidth: 1,
    borderColor: "#E5E7EB",
  },
  neighHandle: {
    width: 40,
    height: 4,
    backgroundColor: "#E5E7EB",
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 24,
  },
  neighIconWrap: { alignItems: "center", marginBottom: 16 },
  neighIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#FEE2E2",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 4,
    borderColor: "#FECACA",
  },
  neighModalLabel: {
    color: "#9CA3AF",
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1.5,
    textAlign: "center",
    marginBottom: 8,
  },
  neighModalArea: {
    color: "#111827",
    fontSize: 22,
    fontWeight: "800",
    letterSpacing: -0.5,
    textAlign: "center",
    marginBottom: 4,
  },
  neighModalCity: {
    color: "#6B7280",
    fontSize: 14,
    fontWeight: "500",
    textAlign: "center",
    marginBottom: 20,
  },
  neighInfoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
  },
  neighInfoText: { color: "#374151", fontSize: 14, fontWeight: "500" },
  neighDismissBtn: {
    marginTop: 20,
    backgroundColor: "#111827",
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
  },
  neighDismissText: { color: "#FFFFFF", fontSize: 15, fontWeight: "700" },

  // Marketplace Banner
  marketplaceBanner: {
    backgroundColor: "#EEF2FF",
    borderRadius: 20,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: PX,
    borderWidth: 1,
    borderColor: "#E0E7FF",
  },
  marketIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#4F46E5",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
    shadowColor: "#4F46E5",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  marketTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#312E81",
    marginBottom: 2,
    letterSpacing: -0.3,
  },
  marketSub: {
    fontSize: 12,
    color: "#4F46E5",
    fontWeight: "500",
    lineHeight: 16,
  },
  marketAction: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 100,
  },
  marketActionText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#4F46E5",
    marginRight: 4,
  },
  
  featuredCard: { width: 156, backgroundColor: "#FFFFFF", borderRadius: 16, padding: 12, borderWidth: 1, borderColor: "#E5E7EB", alignItems: "center" },
  featuredBadge: { position: "absolute", top: -10, backgroundColor: "#F59E0B", flexDirection: "row", alignItems: "center", paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8, zIndex: 1 },
  featuredBadgeText: { color: "#FFFFFF", fontSize: 9, fontWeight: "700" },
  featuredIconBox: { width: 48, height: 48, borderRadius: 24, backgroundColor: "#3B82F6", alignItems: "center", justifyContent: "center", marginBottom: 8, marginTop: 4 },
  featuredName: { fontSize: 13, fontWeight: "700", color: "#111827", textAlign: "center", marginBottom: 2 },
  featuredCat: { fontSize: 11, color: "#6B7280", textAlign: "center" },

  bizCard: { width: 156, backgroundColor: "#FFFFFF", borderRadius: 16, padding: 12, borderWidth: 1, borderColor: "#E5E7EB", alignItems: "center" },
  bizIconBox: { width: 48, height: 48, borderRadius: 24, backgroundColor: "#EEF2FF", alignItems: "center", justifyContent: "center", marginBottom: 8 },
  bizName: { fontSize: 13, fontWeight: "700", color: "#111827", textAlign: "center", marginBottom: 2 },
  bizCat: { fontSize: 11, color: "#6B7280", textAlign: "center", marginBottom: 6 },
  bizVerified: { flexDirection: "row", alignItems: "center", backgroundColor: "#ECFDF5", paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  bizVerifiedText: { fontSize: 10, color: "#10B981", fontWeight: "600", marginLeft: 2 },
});
