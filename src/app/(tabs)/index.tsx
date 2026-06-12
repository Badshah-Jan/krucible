import PostCard from "@/components/feed/PostCard";
import { chipIdToFirestoreValue } from "@/constants/categories";
import { useLocationGuard } from "@/hooks/useLocationGuard";
import { useNotifications } from "@/hooks/useNotifications";
import { AuthService } from "@/services/authService";
import BusinessService, { BusinessProfile } from "@/services/businessService";
import { CommunityDoc, CommunityService } from "@/services/communityService";
import { Post as FirestorePost, PostService } from "@/services/postService";
import ProviderService, { ServiceProvider } from "@/services/providerService";
import { SOSAlert, SosService } from "@/services/sosService";
import { UserService } from "@/services/userService";
import { useAppStore } from "@/store/appStore";
import { formatDistance, haversineDistance } from "@/utils/distance";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, useFocusEffect } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  RefreshControl,
  FlatList,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Animated, { FadeIn, FadeInDown } from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";
import { Image } from "expo-image";

const PX = 16;

const T = {
  bg: "#F9FAFB",
  card: "#FFFFFF",
  primary: "#4F46E5", // Premium Indigo instead of generic Red
  text: "#0F172A", // Rich Slate
  textSecondary: "#64748B",
  border: "#E2E8F0", // Softer border
  danger: "#E11D48", // Rose instead of standard Red
  dangerBg: "#FFE4E6",
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
  const [limitCount, setLimitCount] = useState(50);
  const [communityDoc, setCommunityDoc] = useState<CommunityDoc | null>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [featuredProviders, setFeaturedProviders] = useState<ServiceProvider[]>(
    [],
  );
  const [nearbyBusinesses, setNearbyBusinesses] = useState<BusinessProfile[]>(
    [],
  );
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
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

  // ── Derived active community ID to stabilize dependencies ─────────────────
  const activeCommunityId = community?.communityId ?? userProfile?.communityId;

  // ── Real-time post feed ───────────────────────────────────────────────────
  useEffect(() => {
    if (!authInitialized) return;
    if (!activeCommunityId) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setFeedError(null);

    const unsubPosts = PostService.subscribeToCommunityPosts(
      activeCommunityId,
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
      limitCount
    );

    const unsubSos = SosService.subscribeToActiveSOS(activeCommunityId, (alerts) => {
      setActiveSosAlerts(alerts);
    });

    // Auto-heal missing communityId in user profile
    const healProfile = async () => {
      const me = AuthService.getCurrentUser();
      if (me && activeCommunityId && userProfile && !userProfile.communityId) {
        await UserService.updateUser(me.uid, { communityId: activeCommunityId } as any);
      }
    };
    healProfile();

    return () => {
      unsubPosts();
      unsubSos();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authInitialized, activeCommunityId, limitCount]);

  // ── Refresh businesses and providers when screen comes into focus ───────
  useFocusEffect(
    useCallback(() => {
      const cid = community?.communityId ?? userProfile?.communityId;
      if (!cid) return;

      const loadMonetizationEntities = async () => {
        try {
          const providers = await ProviderService.getServicesByCommunity(cid);
          setFeaturedProviders(providers.slice(0, 5));

          const businesses = await BusinessService.getBusinessesByCommunity(cid);
          setNearbyBusinesses(businesses.slice(0, 5));
        } catch (err) {
          console.warn("Could not load monetization entities", err);
        }
      };
      loadMonetizationEntities();
    }, [community?.communityId, userProfile?.communityId])
  );

  // ── Derived stats ─────────────────────────────────────────────────────────
  const oneDayAgo = Date.now() - 86_400_000;

  const activeSosCount = activeSosAlerts.length;

  const activeTodayCount = livePosts.filter((p) => {
    if (!p.createdAt) return false;
    const d = p.createdAt.toDate ? p.createdAt.toDate() : new Date(p.createdAt);
    return d.getTime() > oneDayAgo;
  }).length;

  const helpTodayCount = livePosts.filter(p => isWithin24h(p.createdAt) && p.category?.toLowerCase() === 'help').length;
  const lostTodayCount = livePosts.filter(p => isWithin24h(p.createdAt) && (p.category?.toLowerCase() === 'lost & found' || p.category?.toLowerCase() === 'lost_found' || p.category?.toLowerCase() === 'lost')).length;
  const recommendationsTodayCount = livePosts.filter(p => isWithin24h(p.createdAt) && p.category?.toLowerCase() === 'recommendations').length;
  const activeAlertsCount = livePosts.filter(p => p.category?.toLowerCase() === 'community alert').length;
  const availableProvidersCount = featuredProviders.filter(p => p.availabilityStatus === 'available_now').length;

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
              ? Math.max(0, (p.likesCount || 0) - 1)
              : (p.likesCount || 0) + 1,
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
    const sosItems = activeSosAlerts.map((alert) => {
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

    // 3. Combine and sort (exclude recommendations from main feed)
    const combined = selectedCategory === "all"
      ? [...sosItems, ...postItems.filter(p => p.category?.toLowerCase() !== 'recommendations')]
      : selectedCategory === "emergency"
      ? [...sosItems, ...postItems.filter((p) => p.category?.toLowerCase() === "emergency")]
      : postItems.filter((p) => {
          if (p.category?.toLowerCase() === 'recommendations') return false;
          const firestoreVal = chipIdToFirestoreValue(selectedCategory);
          return firestoreVal
            ? p.category?.toLowerCase() === firestoreVal.toLowerCase()
            : true;
        });

    // Sort by Distance (5km buckets) then Time
    combined.sort((a, b) => {
      const aDist = (a as any).distanceKm ?? 999;
      const bDist = (b as any).distanceKm ?? 999;
      
      const aBucket = Math.floor(aDist / 5);
      const bBucket = Math.floor(bDist / 5);
      
      if (aBucket !== bBucket) {
        return aBucket - bBucket;
      }

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
            <Text style={s.headerGreeting}>{getGreeting()}, 👋</Text>
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
            <TouchableOpacity
              style={s.avatarBtn}
              onPress={() => router.push("/profile")}
            >
              <Image
                source={{
                  uri:
                    userProfile?.photoURL ||
                    me?.photoURL ||
                    `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=random`,
                }}
                style={s.avatar}
              />
            </TouchableOpacity>
          </View>
        </View>

        {/* ── LOCATION BAR ── */}
        <View style={s.locationContainer}>
          <TouchableOpacity
            style={s.locationBar}
            activeOpacity={0.8}
            onPress={() => setNeighModal(true)}
          >
            <Ionicons name="location" size={14} color="#6366F1" />
            <Text style={s.locName} numberOfLines={1}>
              {areaName}
            </Text>
            <Ionicons name="chevron-down" size={14} color={T.textSecondary} />
          </TouchableOpacity>
          <View style={s.tagsRow}>
            <View style={s.tagGreen}>
              <View style={s.tagGreenDot} />
              <Text style={s.tagGreenText}>Community active</Text>
            </View>
            <View style={s.tagGray}>
              <Ionicons
                name="people-outline"
                size={12}
                color={T.textSecondary}
              />
              <Text style={s.tagGrayText}>{memberCount} neighbours</Text>
            </View>
          </View>
        </View>

        
          <FlatList
            data={feedItems}
            keyExtractor={(item) => item.id}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 112 }}
            refreshControl={
              <RefreshControl
                refreshing={isRefreshing}
                onRefresh={() => {
                  setIsRefreshing(true);
                  // Optionally reset pagination limit on manual refresh
                  setLimitCount(50);
                  setTimeout(() => setIsRefreshing(false), 800);
                }}
                colors={[T.primary]}
                tintColor={T.primary}
              />
            }
            initialNumToRender={5}
            maxToRenderPerBatch={5}
            windowSize={5}
            removeClippedSubviews={true}
            ListHeaderComponent={(
              <View>
            {/* ── COMMUNITY PULSE ── */}
            <Animated.View entering={FadeInDown.duration(400)} style={s.sectionContainer}>
              <View style={s.sectionHeader}>
                <Text style={s.sectionTitle}>Today's Community Pulse</Text>
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: PX, gap: 12, paddingBottom: 16 }}>
                {activeSosCount > 0 && (
                  <View style={[s.pulseCard, { borderColor: '#FECDD3', backgroundColor: '#FFF1F2' }]}>
                    <Text style={{ fontSize: 20, marginBottom: 4 }}>🚨</Text>
                    <Text style={[s.pulseCount, { color: '#E11D48' }]}>{activeSosCount}</Text>
                    <Text style={s.pulseLabel}>Active SOS</Text>
                  </View>
                )}
                {activeAlertsCount > 0 && (
                  <View style={[s.pulseCard, { borderColor: '#FDE68A', backgroundColor: '#FFFBEB' }]}>
                    <Text style={{ fontSize: 20, marginBottom: 4 }}>📢</Text>
                    <Text style={[s.pulseCount, { color: '#D97706' }]}>{activeAlertsCount}</Text>
                    <Text style={s.pulseLabel}>Alerts</Text>
                  </View>
                )}
                {helpTodayCount > 0 && (
                  <View style={[s.pulseCard, { borderColor: '#BFDBFE', backgroundColor: '#EFF6FF' }]}>
                    <Text style={{ fontSize: 20, marginBottom: 4 }}>🤝</Text>
                    <Text style={[s.pulseCount, { color: '#2563EB' }]}>{helpTodayCount}</Text>
                    <Text style={s.pulseLabel}>Help Requests</Text>
                  </View>
                )}
                {lostTodayCount > 0 && (
                  <View style={[s.pulseCard, { borderColor: '#D1FAE5', backgroundColor: '#ECFDF5' }]}>
                    <Text style={{ fontSize: 20, marginBottom: 4 }}>🔍</Text>
                    <Text style={[s.pulseCount, { color: '#10B981' }]}>{lostTodayCount}</Text>
                    <Text style={s.pulseLabel}>Lost & Found</Text>
                  </View>
                )}
                {recommendationsTodayCount > 0 && (
                  <View style={[s.pulseCard, { borderColor: '#E9D5FF', backgroundColor: '#FAF5FF' }]}>
                    <Text style={{ fontSize: 20, marginBottom: 4 }}>⭐</Text>
                    <Text style={[s.pulseCount, { color: '#9333EA' }]}>{recommendationsTodayCount}</Text>
                    <Text style={s.pulseLabel}>Recommendations</Text>
                  </View>
                )}
                {availableProvidersCount > 0 && (
                  <View style={[s.pulseCard, { borderColor: '#E5E7EB', backgroundColor: '#F9FAFB' }]}>
                    <Text style={{ fontSize: 20, marginBottom: 4 }}>🔧</Text>
                    <Text style={[s.pulseCount, { color: '#4B5563' }]}>{availableProvidersCount}</Text>
                    <Text style={s.pulseLabel}>Available Now</Text>
                  </View>
                )}
                {activeSosCount === 0 && activeAlertsCount === 0 && helpTodayCount === 0 && lostTodayCount === 0 && recommendationsTodayCount === 0 && availableProvidersCount === 0 && (
                  <View style={[s.pulseCard, { borderColor: '#E5E7EB', backgroundColor: '#F9FAFB', width: 200 }]}>
                    <Text style={{ fontSize: 20, marginBottom: 4 }}>✨</Text>
                    <Text style={[s.pulseLabel, { textAlign: 'center' }]}>All quiet in the community today. Enjoy the peace!</Text>
                  </View>
                )}
              </ScrollView>
            </Animated.View>

            {/* ── QUICK ACTIONS ── */}
            <Animated.View
              entering={FadeInDown.duration(350).delay(100)}
              style={s.sectionContainer}
            >
              <View style={s.sectionHeader}>
                <Text style={s.sectionTitle}>Quick actions</Text>
                <TouchableOpacity onPress={() => {}}>
                  <Text style={s.sectionLink}>
                    Customize <Ionicons name="settings-outline" size={12} />
                  </Text>
                </TouchableOpacity>
              </View>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={s.quickActionsRow}
              >
                {(
                  [
                    {
                      color: "#EF4444",
                      icon: "alert",
                      label: "SOS Alert",
                      route: "/sos",
                    },
                    {
                      color: "#3B82F6",
                      icon: "hand-left-outline",
                      label: "Need Help",
                      route: "/post/create?type=help",
                    },
                    {
                      color: "#10B981",
                      icon: "heart-outline",
                      label: "Offer Help",
                      route: "/post/create?type=offer",
                    },
                    {
                      color: "#8B5CF6",
                      icon: "briefcase-outline",
                      label: "Services",
                      route: "/services",
                    },
                    {
                      color: "#F59E0B",
                      icon: "search-outline",
                      label: "Lost & Found",
                      route: "/post/create?type=lost",
                    },
                  ] as const
                ).map((a) => (
                  <TouchableOpacity
                    key={a.label}
                    style={s.actionCard}
                    onPress={() => router.push(a.route as any)}
                  >
                    <View style={[s.actionRing, { borderColor: a.color, backgroundColor: a.color + "18" }]}>
                      <Ionicons
                        name={a.icon as any}
                        size={20}
                        color={a.color}
                      />
                    </View>
                    <Text style={s.actionText}>{a.label}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </Animated.View>

            {/* ── EMERGENCY FEED ── */}
            <Animated.View
              entering={FadeIn.delay(250)}
              style={s.sectionContainer}
            >
              <View style={s.sectionHeader}>
                <Text style={s.sectionTitle}>
                  {selectedCategory === "all" ? "Community feed" : selectedCategory === "emergency" ? "Active emergencies" : selectedCategory === "help" ? "Help requests" : selectedCategory === "general" ? "General posts" : "Lost & Found"}
                </Text>
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
              {/* Category filter chips */}
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={s.chipsRow}
              >
                {(["all", "emergency", "help", "general", "lost"] as const).map((cat) => (
                  <TouchableOpacity
                    key={cat}
                    style={[s.chip, selectedCategory === cat && s.chipActive]}
                    onPress={() => setSelectedCategory(cat)}
                  >
                    <Text style={[s.chipText, selectedCategory === cat && s.chipTextActive]}>
                      {cat === "all" ? "All" : cat === "emergency" ? "🚨 Emergency" : cat === "help" ? "🤝 Help" : cat === "general" ? "📢 General" : "🔍 Lost & Found"}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </Animated.View>

            {/* ── STATES AND FEED LIST ── */}
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
                <ActivityIndicator size="small" color="#6366F1" />
                <Text style={{ color: T.textSecondary, fontSize: 13 }}>
                  Loading feed…
                </Text>
              </View>
            ) : null}
              </View>
            )}
            ListEmptyComponent={(
              <View style={[s.onboardingCard, { marginHorizontal: PX }]}>
                <View style={[s.onboardingIconBg, { backgroundColor: "#ECFDF5" }]}>
                  <Ionicons name="shield-checkmark-outline" size={36} color="#10B981" />
                </View>
                <Text style={s.onboardingTitle}>All clear nearby</Text>
                <Text style={s.onboardingDesc}>
                  {selectedCategory === "all"
                    ? "No posts in your community yet. Be the first to post!"
                    : "No active emergencies in your area right now. Rest easy!"}
                </Text>
              </View>
            )}
            renderItem={({ item: post }) => (
              <View style={{ paddingHorizontal: PX }}>
                <PostCard
                  post={post}
                  onPress={() =>
                    post.isSos
                      ? router.push(`/sos/${(post as any).originalId}` as any)
                      : router.push(`/post/${post.id}` as any)
                  }
                  onLikePress={() =>
                    !post.isSos && handleLike(post as FirestorePost)
                  }
                  onCommentPress={() =>
                    post.isSos
                      ? router.push(`/sos/${(post as any).originalId}` as any)
                      : router.push(`/post/${post.id}` as any)
                  }
                />
              </View>
            )}
            onEndReached={() => {
              if (feedItems.length >= limitCount) {
                setLimitCount(prev => prev + 50);
              }
            }}
            onEndReachedThreshold={0.5}
            ListFooterComponent={(
              <View>

            {/* ── SECTION DIVIDER ── */}
            <View
              style={{
                height: 1,
                backgroundColor: "#F3F4F6",
                marginHorizontal: PX,
                marginBottom: 24,
                marginTop: 8,
              }}
            />

            {/* ── COMMUNITY RECOMMENDATIONS ── */}
            {livePosts.filter(p => p.category?.toLowerCase() === 'recommendations').length > 0 && (
              <Animated.View entering={FadeInDown.duration(350).delay(100)} style={s.sectionContainer}>
                <View style={s.sectionHeader}>
                  <View style={{ flexDirection: "row", alignItems: "center" }}>
                    <Ionicons name="star" size={16} color="#F59E0B" style={{ marginRight: 6 }} />
                    <Text style={s.sectionTitle}>Community Recommendations</Text>
                  </View>
                </View>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: PX, gap: 12, paddingBottom: 16 }}>
                  {livePosts.filter(p => p.category?.toLowerCase() === 'recommendations').slice(0, 5).map(post => (
                    <View key={`rec-${post.id}`} style={{ width: 300 }}>
                      <PostCard
                        post={post as any}
                        onPress={() => router.push(`/post/${post.id}` as any)}
                        onLikePress={() => handleLike(post as FirestorePost)}
                        onCommentPress={() => router.push(`/post/${post.id}` as any)}
                      />
                    </View>
                  ))}
                </ScrollView>
              </Animated.View>
            )}

            {/* ── AVAILABLE PROVIDERS ── */}
            {featuredProviders.filter(p => p.availabilityStatus === 'available_now').length > 0 && (
              <Animated.View entering={FadeInDown.duration(350).delay(150)} style={s.sectionContainer}>
                <View style={s.sectionHeader}>
                  <View style={{ flexDirection: "row", alignItems: "center" }}>
                    <Ionicons name="flash" size={16} color="#10B981" style={{ marginRight: 6 }} />
                    <Text style={s.sectionTitle}>Available Right Now</Text>
                  </View>
                </View>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: PX, gap: 12, paddingBottom: 16 }}>
                  {featuredProviders.filter(p => p.availabilityStatus === 'available_now').map(provider => (
                    <TouchableOpacity key={`avail-${provider.id}`} style={s.availableProviderCard} onPress={() => router.push(`/services/${provider.id}` as any)}>
                      <View style={s.availableProviderHeader}>
                        <View style={s.providerInitialsBox}>
                           <Text style={s.providerInitials}>{provider.name.charAt(0)}</Text>
                        </View>
                        <View style={s.availableBadge}>
                          <View style={s.availableDot} />
                          <Text style={s.availableText}>Available</Text>
                        </View>
                      </View>
                      <Text style={s.providerName} numberOfLines={1}>{provider.name}</Text>
                      <Text style={s.providerCategory}>{provider.category}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </Animated.View>
            )}

            {/* ── EXPLORE MARKETPLACE (Categories) ── */}
            <Animated.View
              entering={FadeInDown.duration(350).delay(150)}
              style={s.sectionContainer}
            >
              <View style={s.sectionHeader}>
                <View style={{ flexDirection: "row", alignItems: "center" }}>
                  <Ionicons
                    name="grid-outline"
                    size={16}
                    color={T.text}
                    style={{ marginRight: 6 }}
                  />
                  <Text style={s.sectionTitle}>Browse categories</Text>
                </View>
                <TouchableOpacity
                  onPress={() => router.push("/services" as any)}
                >
                  <Text style={s.sectionLink}>View all &gt;</Text>
                </TouchableOpacity>
              </View>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{
                  paddingHorizontal: PX,
                  paddingBottom: 16,
                  paddingTop: 4,
                  gap: 12,
                }}
              >
                {[
                  {
                    icon: "hammer-outline",
                    label: "Home Services",
                    color: "#8B5CF6",
                    bg: "#F5F3FF",
                  },
                  {
                    icon: "school-outline",
                    label: "Tutors",
                    color: "#10B981",
                    bg: "#ECFDF5",
                  },
                  {
                    icon: "car-outline",
                    label: "Transport",
                    color: "#3B82F6",
                    bg: "#EFF6FF",
                  },
                  {
                    icon: "desktop-outline",
                    label: "Electronics",
                    color: "#F59E0B",
                    bg: "#FFFBEB",
                  },
                  {
                    icon: "fitness-outline",
                    label: "Health & Wellness",
                    color: "#EF4444",
                    bg: "#FEF2F2",
                  },
                ].map((cat) => (
                  <TouchableOpacity
                    key={cat.label}
                    style={s.catCard}
                    onPress={() =>
                      router.push(`/services?category=${cat.label}` as any)
                    }
                  >
                    <View style={[s.catIconBox, { backgroundColor: cat.bg }]}>
                      <Ionicons
                        name={cat.icon as any}
                        size={20}
                        color={cat.color}
                      />
                    </View>
                    <Text style={s.catLabel} numberOfLines={1}>
                      {cat.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </Animated.View>

            {/* ── EXPLORE MARKETPLACE ── */}
            {featuredProviders.length > 0 ? (
              <Animated.View
                entering={FadeInDown.duration(350).delay(150)}
                style={s.sectionContainer}
              >
                <View style={s.sectionHeader}>
                  <View style={{ flexDirection: "row", alignItems: "center" }}>
                    <Ionicons
                      name="briefcase-outline"
                      size={16}
                      color={T.text}
                      style={{ marginRight: 6 }}
                    />
                    <Text style={s.sectionTitle}>
                      Featured providers{" "}
                      <Text style={{ color: "#F59E0B" }}>★</Text>
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => router.push("/services" as any)}
                  >
                    <Text style={s.sectionLink}>See all &gt;</Text>
                  </TouchableOpacity>
                </View>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{
                    paddingHorizontal: PX,
                    paddingBottom: 16,
                    paddingTop: 4,
                    gap: 12,
                  }}
                >
                  {featuredProviders.map((provider) => (
                    <TouchableOpacity
                      key={`prov-${provider.id}`}
                      style={s.featuredCard}
                      onPress={() =>
                        router.push(`/services/${provider.id}` as any)
                      }
                    >
                      <View>
                        <Image
                          source={{
                            uri:
                              (provider as any).images?.[0] ||
                              `https://ui-avatars.com/api/?name=${encodeURIComponent(provider.name)}&background=random`,
                          }}
                          style={[s.featuredAvatar, provider.isPremium && { borderWidth: 2, borderColor: '#F59E0B' }]}
                        />
                        {provider.isPremium && (
                          <View style={{ position: 'absolute', bottom: -4, alignSelf: 'center', backgroundColor: '#F59E0B', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8 }}>
                            <Text style={{ color: '#FFF', fontSize: 8, fontWeight: '800', textTransform: 'uppercase' }}>PRO</Text>
                          </View>
                        )}
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={s.featuredName} numberOfLines={1}>
                          {provider.name}
                        </Text>
                        <View style={s.featuredRatingRow}>
                          <Ionicons name="star" size={10} color="#6366F1" />
                          <Text style={s.featuredRatingText}>
                            {provider.rating?.toFixed(1) || "New"}
                          </Text>
                          <Text style={s.featuredReviewsText}>
                            ({provider.reviewCount || 0})
                          </Text>
                        </View>
                        <View style={s.featuredCatRow}>
                          <Ionicons name="water" size={10} color="#3B82F6" />
                          <Text style={s.featuredCatText} numberOfLines={1}>
                            {provider.category}
                          </Text>
                        </View>
                        <View style={s.featuredDistRow}>
                          <Ionicons
                            name="location-outline"
                            size={10}
                            color={T.textSecondary}
                          />
                          <Text style={s.featuredDistText}>Nearby</Text>
                        </View>
                      </View>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </Animated.View>
            ) : (
              <Animated.View
                entering={FadeInDown.duration(350).delay(150)}
                style={s.sectionContainer}
              >
                <View style={s.sectionHeader}>
                  <Text style={s.sectionTitle}>Featured providers</Text>
                </View>
                <TouchableOpacity
                  style={[s.onboardingCard, { marginHorizontal: PX, marginTop: 4 }]}
                  onPress={() => router.push("/services/register" as any)}
                >
                  <View style={[s.onboardingIconBg, { backgroundColor: "#EEF2FF" }]}>
                    <Ionicons name="briefcase-outline" size={32} color="#4F46E5" />
                  </View>
                  <Text style={s.onboardingTitle}>Offer a Service</Text>
                  <Text style={s.onboardingDesc}>
                    Be the first in your area to offer a local service. Reach out to your community and grow your clientele!
                  </Text>
                </TouchableOpacity>
              </Animated.View>
            )}

            {/* ── NEARBY BUSINESSES ── */}
            {nearbyBusinesses.length > 0 ? (
              <Animated.View
                entering={FadeInDown.duration(350).delay(200)}
                style={s.sectionContainer}
              >
                <View style={s.sectionHeader}>
                  <Text style={s.sectionTitle}>Nearby businesses</Text>
                  <TouchableOpacity
                    onPress={() => router.push("/businesses" as any)}
                  >
                    <Text style={s.sectionLink}>See all &gt;</Text>
                  </TouchableOpacity>
                </View>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{
                    paddingHorizontal: PX,
                    paddingBottom: 16,
                    paddingTop: 4,
                    gap: 12,
                  }}
                >
                  {nearbyBusinesses.map((biz) => (
                    <TouchableOpacity
                      key={`biz-${biz.id}`}
                      style={[s.bizCard, biz.isPremium && { borderColor: '#FDE68A', backgroundColor: '#FFFBEB' }]}
                      onPress={() =>
                        router.push(`/businesses/${biz.id}` as any)
                      }
                    >
                      {biz.isPremium && (
                        <View style={{ position: 'absolute', top: -8, right: -8, backgroundColor: '#F59E0B', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12, flexDirection: 'row', alignItems: 'center', shadowColor: "#F59E0B", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 }}>
                          <Ionicons name="star" size={10} color="#FFF" style={{ marginRight: 2 }} />
                          <Text style={{ color: '#FFF', fontSize: 9, fontWeight: '800', textTransform: 'uppercase' }}>Premium</Text>
                        </View>
                      )}
                      <View style={[s.bizIconBox, biz.isPremium && { backgroundColor: '#FEF3C7' }]}>
                        <Ionicons name="storefront" size={20} color={biz.isPremium ? "#D97706" : "#10B981"} />
                      </View>
                      <Text style={s.bizName} numberOfLines={1}>
                        {biz.businessName}
                      </Text>
                      {biz.isVerified && (
                        <Text style={s.bizCat}>Verified Partner</Text>
                      )}
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </Animated.View>
            ) : (
              <Animated.View
                entering={FadeInDown.duration(350).delay(200)}
                style={s.sectionContainer}
              >
                <View style={s.sectionHeader}>
                  <Text style={s.sectionTitle}>Nearby businesses</Text>
                </View>
                <TouchableOpacity
                  style={[s.onboardingCard, { marginHorizontal: PX, marginTop: 4 }]}
                  onPress={() => router.push("/businesses/register" as any)}
                >
                  <View style={[s.onboardingIconBg, { backgroundColor: "#FEF2F2" }]}>
                    <Ionicons name="storefront-outline" size={32} color="#EF4444" />
                  </View>
                  <Text style={s.onboardingTitle}>List Your Business</Text>
                  <Text style={s.onboardingDesc}>
                    There are no businesses listed here yet. Be the first to list your business and reach your neighbors!
                  </Text>
                </TouchableOpacity>
              </Animated.View>
            )}
          </View>
        )}
      />

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
                  <Ionicons name="location" size={22} color="#6366F1" />
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
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: PX,
    paddingTop: 12,
    paddingBottom: 8,
  },
  headerGreeting: {
    color: T.textSecondary,
    fontSize: 13,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  headerName: {
    color: T.text,
    fontSize: 24,
    fontWeight: "800",
    letterSpacing: -0.5,
    marginTop: 2,
  },
  headerActions: { flexDirection: "row", gap: 12, alignItems: "center" },
  circleBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: T.card,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    borderWidth: 1,
    borderColor: T.border,
  },
  redDot: {
    position: "absolute",
    top: 8,
    right: 10,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: T.danger,
    borderWidth: 1.5,
    borderColor: T.card,
  },
  avatarBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  avatar: { width: "100%", height: "100%", backgroundColor: "#E2E8F0" },

  locationContainer: {
    paddingHorizontal: PX,
    paddingBottom: 8,
  },
  locationBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: T.card,
    alignSelf: "flex-start",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 100,
    borderWidth: 1,
    borderColor: T.border,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 2,
    elevation: 1,
  },
  locName: {
    color: T.text,
    fontSize: 14,
    fontWeight: "700",
    marginHorizontal: 6,
    maxWidth: 200,
  },
  tagsRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 12,
    gap: 12,
  },
  tagGreen: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F0FDF4",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 100,
    gap: 6,
  },
  tagGreenDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#16A34A",
  },
  tagGreenText: { color: "#16A34A", fontSize: 12, fontWeight: "700" },
  tagGray: { flexDirection: "row", alignItems: "center", gap: 6 },
  tagGrayText: { color: T.textSecondary, fontSize: 12, fontWeight: "600" },

  sectionContainer: { marginBottom: 16 },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: PX,
    marginBottom: 8,
  },
  sectionTitle: {
    color: T.text,
    fontSize: 18,
    fontWeight: "800",
    letterSpacing: -0.3,
  },
  sectionLink: { color: T.primary, fontSize: 14, fontWeight: "700" },
  postBtn: {
    backgroundColor: T.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 100,
    shadowColor: T.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  postBtnText: { color: "#FFFFFF", fontSize: 13, fontWeight: "700" },

  pulseCard: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    minWidth: 110,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 2,
  },
  pulseCount: {
    fontSize: 22,
    fontWeight: '900',
    marginBottom: 4,
  },
  pulseLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: T.textSecondary,
    textAlign: 'center',
  },

  quickActionsRow: {
    paddingHorizontal: PX,
    paddingBottom: 12,
    paddingTop: 4,
    gap: 16,
    paddingRight: PX * 2,
  },
  actionCard: {
    width: 96,
    height: 104,
    backgroundColor: T.card,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: T.border,
    gap: 12,
  },
  actionRing: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  chipsRow: {
    paddingHorizontal: PX,
    paddingBottom: 4,
    paddingTop: 4,
    gap: 8,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 100,
    backgroundColor: T.card,
    borderWidth: 1,
    borderColor: T.border,
  },
  chipActive: {
    backgroundColor: T.primary,
    borderColor: T.primary,
  },
  chipText: {
    fontSize: 12,
    fontWeight: "700",
    color: T.textSecondary,
  },
  chipTextActive: {
    color: "#FFFFFF",
  },
  actionText: {
    fontSize: 12,
    fontWeight: "700",
    color: T.text,
    textAlign: "center",
  },

  featuredCard: {
    width: 260,
    backgroundColor: T.card,
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: T.border,
    flexDirection: "row",
    alignItems: "center",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 2,
  },
  featuredAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    marginRight: 16,
    backgroundColor: "#E2E8F0",
  },
  featuredName: {
    fontSize: 15,
    fontWeight: "800",
    color: T.text,
    marginBottom: 4,
  },
  featuredRatingRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
  },
  featuredRatingText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#F59E0B",
    marginLeft: 4,
    marginRight: 6,
  },
  featuredReviewsText: { fontSize: 12, color: T.textSecondary },
  featuredCatRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 2,
  },
  featuredCatText: { fontSize: 12, color: T.textSecondary, marginLeft: 6 },
  featuredDistRow: { flexDirection: "row", alignItems: "center" },
  featuredDistText: { fontSize: 12, color: T.textSecondary, marginLeft: 6 },

  availableProviderCard: {
    width: 200,
    backgroundColor: T.card,
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: T.border,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 2,
  },
  availableProviderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  providerInitialsBox: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  providerInitials: {
    color: '#4F46E5',
    fontWeight: '800',
    fontSize: 16,
  },
  availableBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  availableDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
    marginRight: 4,
  },
  availableText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#10B981',
  },
  providerName: {
    fontSize: 15,
    fontWeight: '800',
    color: T.text,
    marginBottom: 4,
  },
  providerCategory: {
    fontSize: 13,
    color: T.textSecondary,
    fontWeight: '500',
  },

  catCard: {
    width: 104,
    backgroundColor: T.card,
    borderRadius: 20,
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: T.border,
    alignItems: "center",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 2,
  },
  catIconBox: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  catLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: T.text,
    textAlign: "center",
  },

  bizCard: {
    width: 140,
    backgroundColor: T.card,
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: T.border,
    alignItems: "center",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 2,
  },
  bizIconBox: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#F0FDF4",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  bizName: {
    fontSize: 14,
    fontWeight: "800",
    color: T.text,
    textAlign: "center",
    marginBottom: 4,
  },
  bizCat: {
    fontSize: 11,
    color: "#16A34A",
    fontWeight: "700",
    textAlign: "center",
  },

  onboardingCard: {
    backgroundColor: T.card,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: T.border,
    padding: 32,
    alignItems: "center",
    marginTop: 8,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.03,
    shadowRadius: 16,
    elevation: 2,
  },
  onboardingIconBg: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#F0FDFA",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  onboardingTitle: {
    color: T.text,
    fontSize: 20,
    fontWeight: "900",
    textAlign: "center",
    marginBottom: 8,
  },
  onboardingDesc: {
    color: T.textSecondary,
    fontSize: 15,
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 24,
  },
  onboardingPrimaryBtn: {
    backgroundColor: T.primary,
    height: 48,
    borderRadius: 100,
    paddingHorizontal: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  onboardingPrimaryBtnText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "800",
  },

  stateBox: {
    borderRadius: 24,
    backgroundColor: T.card,
    borderWidth: 1,
    borderColor: T.border,
    paddingVertical: 40,
    paddingHorizontal: 24,
    alignItems: "center",
  },
  stateTitle: {
    color: T.text,
    fontSize: 18,
    fontWeight: "800",
    marginTop: 16,
    marginBottom: 8,
  },
  stateSub: {
    color: T.textSecondary,
    fontSize: 14,
    textAlign: "center",
    lineHeight: 22,
  },
  stateBtn: {
    marginTop: 24,
    backgroundColor: T.text,
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 100,
  },
  stateBtnTxt: { color: "#FFF", fontSize: 14, fontWeight: "800" },

  sheetBg: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.4)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: T.card,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingTop: 12,
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  sheetPill: {
    width: 40,
    height: 5,
    backgroundColor: "#E2E8F0",
    borderRadius: 3,
    alignSelf: "center",
    marginBottom: 24,
  },
  sheetTitle: {
    color: T.text,
    fontSize: 20,
    fontWeight: "900",
    marginBottom: 16,
  },
  sheetRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: T.border,
  },
  sheetIco: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#F8FAFC",
    alignItems: "center",
    justifyContent: "center",
  },
  sheetRowT: { color: T.text, fontSize: 16, fontWeight: "800" },
  sheetRowS: { color: T.textSecondary, fontSize: 13, marginTop: 4 },

  neighOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.5)",
    justifyContent: "flex-end",
  },
  neighSheet: {
    backgroundColor: T.card,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingTop: 12,
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  neighHandle: {
    width: 40,
    height: 5,
    backgroundColor: "#E2E8F0",
    borderRadius: 3,
    alignSelf: "center",
    marginBottom: 24,
  },
  neighIconWrap: { alignItems: "center", marginBottom: 16 },
  neighIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#EEF2FF",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  neighModalLabel: {
    color: T.textSecondary,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1.5,
    textTransform: "uppercase",
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
});
