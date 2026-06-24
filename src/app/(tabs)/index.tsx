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
import { Image } from "expo-image";
import { useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
    ActivityIndicator,
    FlatList,
    Modal,
    Pressable,
    RefreshControl,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import Animated, { FadeIn, FadeInDown, useSharedValue, useAnimatedStyle, withRepeat, withSequence, withTiming, withDelay } from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";

import { Colors } from '@/constants/colors';

const PX = 16;
const T = {
  bg: Colors.bg,
  card: Colors.card,
  primary: Colors.primary,
  text: Colors.text,
  textSecondary: Colors.textSecondary,
  border: Colors.border,
  danger: Colors.danger,
  dangerBg: Colors.dangerLight,
  warning: Colors.warning,
  accent: '#F59E0B',
};

// High-fidelity curated cover photos to represent categories elegantly
const SERVICE_IMAGES: Record<string, string> = {
  plumber: "https://images.unsplash.com/photo-1504328345606-18bbc8c9d7d1?w=250&q=80",
  electrician: "https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=250&q=80",
  carpenter: "https://images.unsplash.com/photo-1497366216548-37526070297c?w=250&q=80",
  mechanic: "https://images.unsplash.com/photo-1486006920555-c77dce18193b?w=250&q=80",
  tutor: "https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=250&q=80",
  cleaner: "https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=250&q=80",
  painter: "https://images.unsplash.com/photo-1562259949-e8e7689d7828?w=250&q=80",
  "ac technician": "https://images.unsplash.com/photo-1581092921461-eab62e97a780?w=250&q=80",
  driver: "https://images.unsplash.com/photo-1449965408869-eaa3f722e40d?w=250&q=80",
  photographer: "https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=250&q=80",
  other: "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=250&q=80",
};

const BIZ_IMAGES: Record<string, string> = {
  cafe: "https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=250&q=80",
  restaurant: "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=250&q=80",
  grocery: "https://images.unsplash.com/photo-1542838132-92c53300491e?w=250&q=80",
  retail: "https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=250&q=80",
  other: "https://images.unsplash.com/photo-1528698827591-e19ccd7bc23d?w=250&q=80",
};

function getServiceImg(category: string): string {
  const cat = String(category).toLowerCase();
  return SERVICE_IMAGES[cat] || SERVICE_IMAGES["other"];
}

function getBizImg(category: string): string {
  const cat = String(category).toLowerCase();
  if (cat.includes("cafe") || cat.includes("coffee")) return BIZ_IMAGES["cafe"];
  if (cat.includes("restaurant") || cat.includes("food") || cat.includes("bakery")) return BIZ_IMAGES["restaurant"];
  if (cat.includes("grocery") || cat.includes("mart") || cat.includes("store")) return BIZ_IMAGES["grocery"];
  if (cat.includes("retail") || cat.includes("shop") || cat.includes("boutique")) return BIZ_IMAGES["retail"];
  return BIZ_IMAGES["other"];
}

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

function FloatingIcon({ source, delay, style }: { source: any, delay: number, style: any }) {
  const translateY = useSharedValue(0);

  useEffect(() => {
    translateY.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(-4, { duration: 1500 }),
          withTiming(0, { duration: 1500 })
        ),
        -1, // infinite
        true // reverse
      )
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateY: translateY.value }],
    };
  });

  return (
    <Animated.View entering={FadeInDown.delay(delay).springify()} style={[animatedStyle, s.actionIconWrap]}>
      <Image source={source} style={style} contentFit="contain" />
    </Animated.View>
  );
}

export default function HomeFeedScreen() {
  const router = useRouter();
  const community = useAppStore((s) => s.primaryCommunity);
  const coordinates = useAppStore((s) => s.coordinates);
  const authInitialized = useAppStore((s) => s.authInitialized);
  const { t } = useTranslation();
  const { unreadCount } = useNotifications();
  const { isGpsDisabled, guardAction, openLocationSettings } =
    useLocationGuard();

  const [selectedCategory, setSelectedCategory] = useState("all");
  const [sheetVisible, setSheetVisible] = useState(false);
  const [neighModal, setNeighModal] = useState(false);

  const [searchModalVisible, setSearchModalVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");
  const [localNeighbors, setLocalNeighbors] = useState<any[]>([]);

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

  const activeCommunityId = community?.communityId ?? userProfile?.communityId;

  // ── Real-time neighbors subscription ──────────────────────────────────────
  useEffect(() => {
    if (!activeCommunityId) return;
    const unsub = UserService.subscribeToNeighborsByCommunity(
      activeCommunityId,
      (neighbors) => setLocalNeighbors(neighbors),
      (err) => console.warn("[Home] Neighbors subscription error:", err),
    );
    return unsub;
  }, [activeCommunityId]);

  // ── Debounce search query 150ms ───────────────────────────────────────────
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearchQuery(searchQuery), 150);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // ── Reset search modal inputs when opened/closed ──────────────────────────
  useEffect(() => {
    setSearchQuery("");
    setDebouncedSearchQuery("");
  }, [searchModalVisible]);

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
      limitCount,
    );

    const unsubSos = SosService.subscribeToActiveSOS(
      activeCommunityId,
      (alerts) => {
        setActiveSosAlerts(alerts);
      },
    );

    return () => {
      unsubPosts();
      unsubSos();
    };
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

          const businesses =
            await BusinessService.getBusinessesByCommunity(cid);
          setNearbyBusinesses(businesses.slice(0, 5));
        } catch (err) {
          console.warn("Could not load monetization entities", err);
        }
      };
      loadMonetizationEntities();
    }, [community?.communityId, userProfile?.communityId]),
  );

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



  // ── Feed items ──────────────────────────────────────────────────────────
  const feedItems = useMemo(() => {
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
        commentsCount: alert.respondersCount || 0,
        category: "Emergency",
        title: `🚨 ${alert.type}`,
        description: `Emergency reported in ${alert.location.area}. Status: ${alert.status.toUpperCase()}`,
        createdAt: alert.createdAt,
        isSos: true,
      };
    });

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
        commentsCount: post.commentsCount ?? 0,
        isSos: false,
      };
    });

    const combined =
      selectedCategory === "all"
        ? [...sosItems, ...postItems]
        : selectedCategory === "emergency"
          ? [
              ...sosItems,
              ...postItems.filter(
                (p) => p.category?.toLowerCase() === "emergency",
              ),
            ]
          : postItems.filter((p) => {
              const firestoreVal = chipIdToFirestoreValue(selectedCategory);
              return firestoreVal
                ? p.category?.toLowerCase() === firestoreVal.toLowerCase()
                : true;
            });

    combined.sort((a, b) => {
      const aTime = a.createdAt?.toDate
        ? a.createdAt.toDate().getTime()
        : a.createdAt ? new Date(a.createdAt).getTime() : Date.now();
      const bTime = b.createdAt?.toDate
        ? b.createdAt.toDate().getTime()
        : b.createdAt ? new Date(b.createdAt).getTime() : Date.now();
      return bTime - aTime;
    });

    return combined;
  }, [filtered, activeSosAlerts, coordinates]);

  const liveActivities = useMemo(() => {
    const list: any[] = [];
    activeSosAlerts.forEach((alert) => {
      list.push({
        id: alert.id,
        category: "Emergency",
        title: `${alert.type} reported in ${alert.location.area}`,
        distance: "Nearby",
        timePosted: getTimeAgo(alert.createdAt),
        commentsCount: alert.respondersCount || 0,
        isSos: true,
      });
    });

    livePosts.forEach((post) => {
      const cat = post.category?.toLowerCase();
      if (cat === "need help" || cat === "lost & found") {
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
        list.push({
          id: post.id,
          category: post.category,
          emoji: cat === "need help" ? "🤝" : "🔍",
          title: post.title || post.description,
          distance: dist,
          timePosted: getTimeAgo(post.createdAt),
          isSos: false,
        });
      }
    });

    return list.slice(0, 8);
  }, [livePosts, activeSosAlerts, coordinates]);

  // ── Search results (debounced) ────────────────────────────────────────────
  const searchResults = useMemo(() => {
    if (!debouncedSearchQuery.trim()) return [];
    const term = debouncedSearchQuery.toLowerCase();
    const posts: any[] = [];
    const neighbors: any[] = [];

    livePosts.forEach(p => {
      if (p.title?.toLowerCase().includes(term) || p.description?.toLowerCase().includes(term) || p.category?.toLowerCase().includes(term)) {
        posts.push({ ...p, id: p.id || String(Math.random()), searchType: 'post' });
      }
    });
    localNeighbors.forEach(u => {
      if (u.name?.toLowerCase().includes(term) || u.bio?.toLowerCase().includes(term)) {
        neighbors.push({ ...u, id: u.uid || String(Math.random()), searchType: 'user' });
      }
    });

    // Build flat list with section headers
    const flat: any[] = [];
    if (posts.length > 0) { flat.push({ _header: 'Community Posts' }); flat.push(...posts); }
    if (neighbors.length > 0) { flat.push({ _header: 'Neighbors' }); flat.push(...neighbors); }
    return flat;
  }, [debouncedSearchQuery, livePosts, localNeighbors]);

  const rawResultCount = useMemo(() => {
    if (!debouncedSearchQuery.trim()) return 0;
    return searchResults.filter((r: any) => !r._header).length;
  }, [searchResults, debouncedSearchQuery]);

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
          <View style={s.headerLeft}>
            <Text style={s.headerGreeting}>{getGreeting()}, 👋</Text>
            <Text style={s.headerName}>{displayName}</Text>
            
            <TouchableOpacity
              style={s.locationBar}
              activeOpacity={0.7}
              onPress={() => setNeighModal(true)}
            >
              <Ionicons name="location" size={13} color={T.primary} />
              <Text style={s.locName} numberOfLines={1}>
                {areaName}{cityName ? `, ${cityName}` : ""}
              </Text>
              <Ionicons name="chevron-down" size={12} color={T.textSecondary} />
            </TouchableOpacity>

            <View style={s.onlineRow}>
              <View style={s.greenDot} />
              <Text style={s.onlineText}>
                {Math.max(memberCount, 12)} neighbours online
              </Text>
            </View>
          </View>

          <View style={s.headerActions}>
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
                    `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=F7F7F7&color=717171`,
                }}
                style={s.avatar}
              />
            </TouchableOpacity>
          </View>
        </View>

        {/* ── AIRBNB SIGNATURE FLOATING SEARCH PILL ── */}
        <TouchableOpacity
          style={s.searchPill}
          activeOpacity={0.9}
          onPress={() => setSearchModalVisible(true)}
        >
          <Ionicons name="search" size={18} color={T.text} />
          <View style={s.searchPillContent}>
            <Text style={s.searchPillTitle} numberOfLines={1}>
              📍 {areaName}
            </Text>
            <Text style={s.searchPillSub} numberOfLines={1}>
              Search posts, local help & services
            </Text>
          </View>
          <View style={s.searchFilterBtn}>
            <Ionicons name="options-outline" size={16} color={T.text} />
          </View>
        </TouchableOpacity>

        <FlatList
          data={feedItems}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 120 }}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={() => {
                setIsRefreshing(true);
                setLimitCount(50);
                setTimeout(() => setIsRefreshing(false), 800);
              }}
              colors={[T.primary]}
              tintColor={T.primary}
            />
          }
          initialNumToRender={6}
          maxToRenderPerBatch={6}
          windowSize={6}
          removeClippedSubviews={true}
          ListHeaderComponent={
            <View style={{ paddingBottom: 16 }}>

              {/* ── PRIMARY ACTION HUB (AIRBNB 3D ICONS) ── */}
              <View style={s.actionHub}>
                <Text style={s.sectionTitle}>How can we help?</Text>
                
                <View style={s.actionRow}>
                  {/* SOS */}
                  <TouchableOpacity
                    style={s.actionItem}
                    activeOpacity={0.7}
                    onPress={() => router.push("/sos")}
                  >
                    <FloatingIcon source={require('@/assets/icons3d/sos.png')} delay={50} style={s.actionIcon3d} />
                    <Text style={s.actionLabel}>SOS</Text>
                  </TouchableOpacity>

                  {/* Need Help */}
                  <TouchableOpacity
                    style={s.actionItem}
                    activeOpacity={0.7}
                    onPress={() => router.push("/post/create?type=help")}
                  >
                    <FloatingIcon source={require('@/assets/icons3d/need_help.png')} delay={100} style={s.actionIcon3d} />
                    <Text style={s.actionLabel} numberOfLines={1}>Need Help</Text>
                  </TouchableOpacity>

                  {/* Offer Help */}
                  <TouchableOpacity
                    style={s.actionItem}
                    activeOpacity={0.7}
                    onPress={() => router.push("/post/create?type=offer")}
                  >
                    <FloatingIcon source={require('@/assets/icons3d/offer_help.png')} delay={150} style={s.actionIcon3d} />
                    <Text style={s.actionLabel} numberOfLines={1}>Offer Help</Text>
                  </TouchableOpacity>

                  {/* Recommendation */}
                  <TouchableOpacity
                    style={s.actionItem}
                    activeOpacity={0.7}
                    onPress={() => router.push("/post/create?type=recommend")}
                  >
                    <FloatingIcon source={require('@/assets/icons3d/recommend.png')} delay={200} style={s.actionIcon3d} />
                    <Text style={s.actionLabel} numberOfLines={1}>Recommend</Text>
                  </TouchableOpacity>

                  {/* Lost & Found */}
                  <TouchableOpacity
                    style={s.actionItem}
                    activeOpacity={0.7}
                    onPress={() => router.push("/post/create?type=lost")}
                  >
                    <FloatingIcon source={require('@/assets/icons3d/lost_found.png')} delay={250} style={s.actionIcon3d} />
                    <Text style={s.actionLabel} numberOfLines={1}>Lost & Found</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* ── LIVE COMMUNITY ACTIVITY ── */}
              {liveActivities.length > 0 && (
                <View style={s.liveSection}>
                  <View style={s.liveHeader}>
                    <Text style={s.sectionTitle}>Recent Alerts & Needs</Text>
                    <View style={s.liveBadge}>
                      <View style={s.liveDot} />
                      <Text style={s.liveBadgeText}>Active now</Text>
                    </View>
                  </View>
                  
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.liveScroll}>
                    {liveActivities.map((act) => (
                      <TouchableOpacity 
                        key={act.id} 
                        style={[s.liveCard, act.isSos && s.liveCardSos]} 
                        onPress={() => router.push(act.isSos ? `/sos/${act.id}` : `/post/${act.id}`)} 
                        activeOpacity={0.9}
                      >
                        <View style={s.liveCardTop}>
                          <View style={s.catPill}>
                            <Text style={s.catPillText}>
                              {act.category === "Lost & Found" ? "Lost" : act.category}
                            </Text>
                          </View>
                          <Text style={s.liveCardTime}>{act.timePosted}</Text>
                        </View>
                        
                        <Text style={s.liveCardTitle} numberOfLines={2}>
                          {act.title}
                        </Text>
                        
                        <View style={s.liveCardFooter}>
                          <View style={s.footerInfo}>
                            <Ionicons name="location-outline" size={13} color={T.textSecondary} />
                            <Text style={s.footerInfoTxt}>{act.distance}</Text>
                          </View>
                          <View style={[s.footerInfo, { marginLeft: 12 }]}>
                            <Ionicons name="chatbubble-ellipses-outline" size={13} color={T.textSecondary} />
                            <Text style={s.footerInfoTxt}>
                              {act.commentsCount > 0 ? `${act.commentsCount} replies` : 'Reply'}
                            </Text>
                          </View>
                        </View>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              )}

              {/* ── FEATURED SERVICES (STUNNING CATEGORY IMAGES) ── */}
              {featuredProviders.length > 0 && (
                <View style={s.serviceSection}>
                  <View style={s.sectionHeaderRow}>
                    <Text style={s.sectionTitle}>Services Nearby</Text>
                    <TouchableOpacity onPress={() => router.push('/services' as any)} hitSlop={8}>
                      <Text style={s.sectionLink}>See all</Text>
                    </TouchableOpacity>
                  </View>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.serviceScroll}>
                    {featuredProviders.map((p) => (
                      <TouchableOpacity 
                        key={p.id} 
                        style={s.serviceCard} 
                        activeOpacity={0.9} 
                        onPress={() => router.push(`/services/${p.id}` as any)}
                      >
                        <View style={s.serviceAvatarWrap}>
                          <Image source={{ uri: getServiceImg(p.category) }} style={s.serviceAvatar} contentFit="cover" transition={200} />
                          {p.availabilityStatus === 'available_now' && <View style={s.serviceOnlineDot} />}
                        </View>
                        <Text style={s.serviceName} numberOfLines={1}>{p.name}</Text>
                        <Text style={s.serviceCategory} numberOfLines={1}>{p.category}</Text>
                        <View style={s.serviceRatingRow}>
                          <Ionicons name="star" size={10} color={T.accent} />
                          <Text style={s.serviceRating}>{p.rating ? p.rating.toFixed(1) : 'New'}</Text>
                        </View>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              )}

              {/* ── NEARBY BUSINESSES (STUNNING STOREFRONT IMAGES) ── */}
              {nearbyBusinesses.length > 0 && (
                <View style={s.serviceSection}>
                  <View style={s.sectionHeaderRow}>
                    <Text style={s.sectionTitle}>Local Businesses</Text>
                    <TouchableOpacity onPress={() => router.push('/businesses' as any)} hitSlop={8}>
                      <Text style={s.sectionLink}>See all</Text>
                    </TouchableOpacity>
                  </View>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.serviceScroll}>
                    {nearbyBusinesses.map((b) => (
                      <TouchableOpacity 
                        key={b.id} 
                        style={s.bizCard} 
                        activeOpacity={0.9} 
                        onPress={() => router.push(`/businesses/${b.id}` as any)}
                      >
                        <View style={s.bizIconBox}>
                          <Image source={{ uri: getBizImg(b.category) }} style={s.bizImage} contentFit="cover" transition={200} />
                        </View>
                        <Text style={s.bizName} numberOfLines={1}>{b.businessName}</Text>
                        <Text style={s.bizCat} numberOfLines={1}>{b.category}</Text>
                        {b.isVerified && (
                          <View style={s.bizVerifiedBadge}>
                            <Text style={s.bizVerifiedText}>✓ Verified</Text>
                          </View>
                        )}
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              )}

              {/* ── FEED HEADER & FILTERS ── */}
              <Animated.View entering={FadeIn.delay(100)} style={s.feedHeader}>
                <View style={s.feedHeaderTop}>
                  <Text style={s.feedSectionTitle}>Local Requests & Notices</Text>
                  <TouchableOpacity
                    style={s.postBtn}
                    activeOpacity={0.8}
                    onPress={() => {
                      if (!go("Post")) return;
                      router.push('/post/create');
                    }}
                  >
                    <Ionicons name="add" size={14} color={T.card} style={{ marginRight: 2 }} />
                    <Text style={s.postBtnText}>Post</Text>
                  </TouchableOpacity>
                </View>
                
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={s.chipsRow}
                >
                  {([
                    { id: "all", label: "All" },
                    { id: "emergency", label: "🚨 Emergency" },
                    { id: "need_help", label: "🤝 Need Help" },
                    { id: "offer_help", label: "💚 Offer Help" },
                    { id: "recommendations", label: "⭐ Recommend" },
                    { id: "lost_found", label: "🔍 Lost & Found" },
                  ] as const).map((cat) => (
                    <TouchableOpacity
                      key={cat.id}
                      style={[s.chip, selectedCategory === cat.id && s.chipActive]}
                      onPress={() => setSelectedCategory(cat.id as any)}
                      activeOpacity={0.8}
                    >
                      <Text style={[s.chipText, selectedCategory === cat.id && s.chipTextActive]}>
                        {cat.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </Animated.View>

              {/* ── STATES ── */}
              {isGpsDisabled ? (
                <View style={s.stateBox}>
                  <Ionicons
                    name="location-outline"
                    size={36}
                    color={T.textSecondary}
                  />
                  <Text style={s.stateTitle}>Location Access Required</Text>
                  <Text style={s.stateSub}>
                    Enable GPS in your settings to view posts in your local community.
                  </Text>
                  <TouchableOpacity
                    style={s.stateBtn}
                    onPress={openLocationSettings}
                  >
                    <Text style={s.stateBtnTxt}>Enable Location</Text>
                  </TouchableOpacity>
                </View>
              ) : feedError ? (
                <View style={s.stateBox}>
                  <Ionicons
                    name="cloud-offline-outline"
                    size={36}
                    color={T.textSecondary}
                  />
                  <Text style={s.stateTitle}>Could not load feed</Text>
                  <Text style={s.stateSub}>{feedError}</Text>
                </View>
              ) : isLoading ? (
                <View style={s.loadingContainer}>
                  <ActivityIndicator size="small" color={T.primary} />
                  <Text style={s.loadingText}>Connecting to neighbors…</Text>
                </View>
              ) : null}
            </View>
          }
          ListEmptyComponent={
            <View style={s.onboardingCard}>
              <View style={s.onboardingIconBg}>
                <Ionicons
                  name="shield-checkmark-outline"
                  size={32}
                  color={Colors.primary}
                />
              </View>
              <Text style={s.onboardingTitle}>All quiet nearby</Text>
              <Text style={s.onboardingDesc}>
                {selectedCategory === "all"
                  ? "No posts in your neighborhood yet. Be the first to share something!"
                  : "No active entries under this category right now. Rest easy!"}
              </Text>
            </View>
          }
          renderItem={({ item: post }) => (
            <Animated.View entering={FadeInDown.duration(300)} style={{ paddingHorizontal: PX }}>
              <PostCard
                post={post}
                onPress={() =>
                  post.isSos
                    ? router.push(`/sos/${(post as any).originalId}` as any)
                    : router.push(`/post/${post.id}` as any)
                }
                onCommentPress={() =>
                  post.isSos
                    ? router.push(`/sos/${(post as any).originalId}` as any)
                    : router.push(`/post/${post.id}` as any)
                }
              />
            </Animated.View>
          )}
          onEndReached={() => {
            if (feedItems.length >= limitCount) {
              setLimitCount((prev) => prev + 50);
            }
          }}
          onEndReachedThreshold={0.5}
          ListFooterComponent={<View style={{ height: 100 }} />}
        />

        {/* ── FLOATING CREATE FAB ── */}
        <TouchableOpacity
          style={s.fab}
          activeOpacity={0.9}
          onPress={() => { if (!go('Post')) return; setSheetVisible(true); }}
        >
          <Ionicons name="add" size={20} color={T.card} />
          <Text style={s.fabText}>Create</Text>
        </TouchableOpacity>

        {/* ── NEIGHBOURHOOD MODAL ── */}
        <Modal
          visible={neighModal}
          transparent
          animationType="fade"
          onRequestClose={() => setNeighModal(false)}
        >
          <Pressable
            style={s.modalOverlay}
            onPress={() => setNeighModal(false)}
          >
            <Pressable
              style={s.modalSheet}
              onPress={(e) => e.stopPropagation()}
            >
              <View style={s.modalHandle} />
              
              <View style={s.modalHeaderCircle}>
                <Ionicons name="location" size={24} color={T.primary} />
              </View>
              
              <Text style={s.modalMetaLabel}>Your Neighborhood</Text>
              <Text style={s.modalAreaTitle}>{areaName}</Text>
              {cityName ? <Text style={s.modalCityText}>{cityName}</Text> : null}

              <View style={s.modalStatRow}>
                <Ionicons name="people-outline" size={16} color={T.textSecondary} />
                <Text style={s.modalStatText}>
                  {memberCount} verified neighbours
                </Text>
              </View>
              
              <View style={s.modalStatRow}>
                <Ionicons name="radio-outline" size={16} color={T.textSecondary} />
                <Text style={s.modalStatText}>
                  {activeSosCount > 0
                    ? `${activeSosCount} active emergency alerts`
                    : "No active alerts in your zone"}
                </Text>
              </View>
              
              <View style={s.modalStatRow}>
                <Ionicons name="sparkles-outline" size={16} color={T.textSecondary} />
                <Text style={s.modalStatText}>
                  {activeTodayCount} local stories shared today
                </Text>
              </View>

              <TouchableOpacity
                style={s.modalDismissBtn}
                onPress={() => setNeighModal(false)}
                activeOpacity={0.8}
              >
                <Text style={s.modalDismissText}>Got it</Text>
              </TouchableOpacity>
            </Pressable>
          </Pressable>
        </Modal>

        {/* ── CREATE POST BOTTOM SHEET ── */}
        <Modal
          visible={sheetVisible}
          transparent
          animationType="slide"
          onRequestClose={() => setSheetVisible(false)}
        >
          <Pressable style={s.sheetBg} onPress={() => setSheetVisible(false)}>
            <Pressable style={s.sheet} onPress={(e) => e.stopPropagation()}>
              <View style={s.sheetPill} />
              <Text style={s.sheetTitle}>Create</Text>

              {(
                [
                  {
                    icon: "megaphone-outline",
                    title: "Post to Community",
                    sub: "Share news, updates, or helpful recommendations",
                    route: "/post/create",
                    color: T.primary,
                    bg: "Colors.primaryLight"
                  },
                  {
                    icon: "hand-right-outline",
                    title: "Ask for Help",
                    sub: "Request assistance from nearby neighbours",
                    route: "/post/create?type=help",
                    color: T.primary,
                    bg: "Colors.primaryLight"
                  },
                  {
                    icon: "star-outline",
                    title: "Recommend",
                    sub: "Recommend local services or businesses",
                    route: "/post/create?type=recommend",
                    color: "Colors.text",
                    bg: "Colors.surface"
                  },
                  {
                    icon: "search-outline",
                    title: "Lost & Found",
                    sub: "Report a lost item or found property",
                    route: "/post/create?type=lost",
                    color: "Colors.text",
                    bg: "Colors.surface"
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
                  activeOpacity={0.7}
                >
                  <View style={[s.sheetIco, { backgroundColor: item.bg }]}>
                    <Ionicons name={item.icon} size={18} color={item.color} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.sheetRowT}>{item.title}</Text>
                    <Text style={s.sheetRowS}>{item.sub}</Text>
                  </View>
                  <Ionicons
                    name="chevron-forward"
                    size={14}
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
                activeOpacity={0.7}
              >
                <View style={[s.sheetIco, { backgroundColor: T.dangerBg }]}>
                  <Ionicons name="alert" size={18} color={T.danger} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[s.sheetRowT, { color: T.danger }]}>
                    SOS Emergency Alert
                  </Text>
                  <Text style={s.sheetRowS}>
                    Broadcast immediate safety emergency alerts
                  </Text>
                </View>
                <Ionicons
                  name="chevron-forward"
                  size={14}
                  color="Colors.textSecondary"
                />
              </TouchableOpacity>
            </Pressable>
          </Pressable>
        </Modal>

        {/* ── AIRBNB FULLSCREEN SEARCH MODAL POPUP ── */}
        <Modal
          visible={searchModalVisible}
          animationType="slide"
          onRequestClose={() => setSearchModalVisible(false)}
        >
          <View style={s.searchModalRoot}>
            <SafeAreaView style={{ flex: 1, backgroundColor: T.bg }} edges={["top"]}>
              {/* Header */}
              <View style={s.searchModalHeader}>
                <TouchableOpacity
                  onPress={() => {
                    setSearchModalVisible(false);
                    setSearchQuery('');
                  }}
                  style={s.searchModalCloseBtn}
                  hitSlop={12}
                >
                  <Ionicons name="arrow-back" size={22} color={T.text} />
                </TouchableOpacity>
                <View style={s.searchModalInputContainer}>
                  <Ionicons name="search" size={16} color={T.textSecondary} />
                  <TextInput
                    style={s.searchModalInput}
                    placeholder={t('search_placeholder', 'Search posts, services, or people...')}
                    placeholderTextColor={T.textSecondary}
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    autoFocus
                    clearButtonMode="while-editing"
                  />
                  {searchQuery.length > 0 && (
                    <TouchableOpacity onPress={() => setSearchQuery('')} hitSlop={8}>
                      <Ionicons name="close-circle" size={16} color={T.textSecondary} />
                    </TouchableOpacity>
                  )}
                </View>
              </View>

              {/* Search Content */}
              <View style={{ flex: 1, paddingHorizontal: PX }}>
                {debouncedSearchQuery.length > 0 ? (
                  searchResults.filter((r: any) => !r._header).length > 0 ? (
                    <FlatList
                      data={searchResults}
                      keyExtractor={(item, i) => item._header ? `hdr_${i}` : item.id}
                      showsVerticalScrollIndicator={false}
                      keyboardShouldPersistTaps="handled"
                      contentContainerStyle={{ paddingTop: 8, paddingBottom: 40 }}
                      ListHeaderComponent={
                        <Text style={s.searchRecentTitle}>
                          {rawResultCount} result{rawResultCount !== 1 ? 's' : ''} for "{debouncedSearchQuery}"
                        </Text>
                      }
                      renderItem={({ item }) => {
                        // Section header
                        if (item._header) {
                          return <Text style={[s.searchRecentTitle, { marginTop: 12 }]}>{item._header.toUpperCase()}</Text>;
                        }
                        if (item.searchType === 'post') {
                          return (
                            <TouchableOpacity
                              style={s.searchResultItem}
                              activeOpacity={0.9}
                              onPress={() => {
                                setSearchModalVisible(false);
                                setSearchQuery('');
                                router.push(`/post/${item.id}` as any);
                              }}
                            >
                              <View style={s.searchIconBox}>
                                <Ionicons name="document-text-outline" size={16} color={T.textSecondary} />
                              </View>
                              <View style={{ flex: 1 }}>
                                <Text style={s.searchResultTitle} numberOfLines={1}>{item.title || item.description}</Text>
                                <Text style={s.searchResultSub} numberOfLines={1}>
                                  {item.category || 'Post'} • Nearby
                                </Text>
                              </View>
                              <Ionicons name="chevron-forward" size={14} color="#B0B0B0" />
                            </TouchableOpacity>
                          );
                        }
                        if (item.searchType === 'user') {
                          return (
                            <View style={s.searchResultItem}>
                              <View style={s.searchIconBox}>
                                <Ionicons name="person-outline" size={16} color={T.textSecondary} />
                              </View>
                              <View style={{ flex: 1 }}>
                                <Text style={s.searchResultTitle} numberOfLines={1}>{item.name}</Text>
                                <Text style={s.searchResultSub} numberOfLines={1}>{item.bio || item.neighborhood || 'Neighbor'}</Text>
                              </View>
                            </View>
                          );
                        }
                        if (item.searchType === 'business') {
                          return (
                            <TouchableOpacity
                              style={s.searchResultItem}
                              activeOpacity={0.9}
                              onPress={() => {
                                setSearchModalVisible(false);
                                setSearchQuery('');
                                router.push(`/businesses/${item.id}` as any);
                              }}
                            >
                              <View style={[s.searchIconBox, { backgroundColor: '#FFFBEB', borderColor: '#FDE68A' }]}>
                                <Ionicons name="storefront-outline" size={16} color={T.accent} />
                              </View>
                              <View style={{ flex: 1 }}>
                                <Text style={s.searchResultTitle} numberOfLines={1}>{item.businessName}</Text>
                                <Text style={s.searchResultSub} numberOfLines={1}>{item.category || 'Business'}{item.address ? ` • ${item.address}` : ''}</Text>
                              </View>
                              <Ionicons name="chevron-forward" size={14} color="#B0B0B0" />
                            </TouchableOpacity>
                          );
                        }
                        return null;
                      }}
                    />
                  ) : (
                    <View style={s.searchCenterContainer}>
                      <Ionicons name="search-outline" size={40} color="#CCCCCC" />
                      <Text style={[s.searchResultTitle, { marginTop: 16, textAlign: 'center' }]}>No results found</Text>
                      <Text style={[s.searchResultSub, { textAlign: 'center', marginTop: 6 }]}>
                        No posts, people, or businesses match "{debouncedSearchQuery}"
                      </Text>
                    </View>
                  )
                ) : (
                  <View style={{ marginTop: 20 }}>
                    <Text style={s.searchRecentTitle}>BROWSE BY CATEGORY</Text>
                    {[
                      { label: '🤝  Help Requests', q: 'help' },
                      { label: '🚨  Emergency Alerts', q: 'emergency' },
                      { label: '🔍  Lost & Found', q: 'lost' },
                      { label: '⭐  Recommendations', q: 'recommendations' },
                      { label: '🛠️  Local Services', q: 'services' },
                    ].map((c) => (
                      <TouchableOpacity
                        key={c.q}
                        style={[s.searchRecentItem, { backgroundColor: Colors.card, borderRadius: 8, paddingHorizontal: 12, marginBottom: 4, borderWidth: 1, borderColor: Colors.border }]}
                        onPress={() => setSearchQuery(c.q)}
                        activeOpacity={0.7}
                      >
                        <Text style={s.searchRecentText}>{c.label}</Text>
                        <Ionicons name="chevron-forward" size={14} color="#CCCCCC" style={{ marginLeft: 'auto' }} />
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>
            </SafeAreaView>
          </View>
        </Modal>

      </SafeAreaView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: T.bg },
  
  // Header styling
  header: {
    paddingHorizontal: PX,
    paddingTop: 12,
    paddingBottom: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    backgroundColor: Colors.card,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  headerLeft: {
    flex: 1,
  },
  headerGreeting: {
    color: T.textSecondary,
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  headerName: {
    color: T.text,
    fontSize: 22,
    fontWeight: "800",
    letterSpacing: -0.5,
    marginTop: 2,
    marginBottom: 8,
  },
  locationBar: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: Colors.surface,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 100,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 4,
  },
  locName: {
    color: T.text,
    fontSize: 12,
    fontWeight: "700",
    maxWidth: 180,
  },
  onlineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    paddingLeft: 4,
  },
  greenDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.success,
    marginRight: 6,
  },
  onlineText: {
    color: Colors.success,
    fontSize: 11,
    fontWeight: '600',
  },
  headerActions: { 
    flexDirection: "row", 
    gap: 10, 
    alignItems: "center",
    paddingTop: 4,
  },
  circleBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.card,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: Colors.border,
  },
  redDot: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: T.danger,
  },
  avatarBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: Colors.border,
  },
  avatar: { width: "100%", height: "100%", backgroundColor: "Colors.surface" },

  // Airbnb Signature Floating Search Pill
  searchPill: {
    backgroundColor: Colors.card,
    borderRadius: 100,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginHorizontal: PX,
    marginTop: 8,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  searchPillContent: {
    flex: 1,
    marginLeft: 12,
  },
  searchPillTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: Colors.text,
  },
  searchPillSub: {
    fontSize: 11,
    color: Colors.textSecondary,
    fontWeight: '500',
    marginTop: 1,
  },
  searchFilterBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },

  // Action Hub (Airbnb Horizontal Categories)
  actionHub: {
    paddingHorizontal: PX,
    paddingTop: 10,
    paddingBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: T.text,
    letterSpacing: -0.3,
    marginBottom: 12,
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  actionItem: {
    flex: 1,
    alignItems: 'center',
  },
  actionIconWrap: {
    width: 56,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionIcon3d: {
    width: 48,
    height: 48,
  },
  actionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.text,
    marginTop: 8,
    textAlign: 'center',
  },

  // Live Community Activity
  liveSection: {
    marginTop: 16,
    marginBottom: 20,
  },
  liveHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: PX,
    marginBottom: 12,
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: T.dangerBg,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    marginLeft: 10,
  },
  liveDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: T.danger,
    marginRight: 5,
  },
  liveBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: T.danger,
    textTransform: 'uppercase',
  },
  liveScroll: {
    paddingHorizontal: PX,
    gap: 10,
  },
  liveCard: {
    width: 230,
    backgroundColor: Colors.card,
    borderRadius: 8,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  liveCardSos: {
    borderColor: Colors.danger,
    borderLeftWidth: 3.5,
  },
  liveCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  catPill: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  catPillText: {
    fontSize: 8,
    fontWeight: '700',
    color: Colors.text,
  },
  liveCardTime: {
    fontSize: 11,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  liveCardTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: T.text,
    lineHeight: 18,
    marginBottom: 12,
    height: 36,
  },
  liveCardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: 1,
    borderColor: Colors.border,
    paddingTop: 8,
  },
  footerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  footerInfoTxt: {
    fontSize: 11,
    color: Colors.textSecondary,
    fontWeight: '600',
  },

  // Services & Businesses
  serviceSection: { 
    marginBottom: 20,
  },
  sectionHeaderRow: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    paddingHorizontal: PX, 
    marginBottom: 12,
  },
  sectionLink: { 
    color: T.primary, 
    fontSize: 13, 
    fontWeight: "700",
  },
  serviceScroll: { 
    paddingHorizontal: PX, 
    gap: 10,
  },
  serviceCard: {
    width: 112,
    backgroundColor: Colors.card,
    borderRadius: 8,
    padding: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  serviceAvatarWrap: { 
    position: 'relative', 
    marginBottom: 8,
    width: '100%',
    height: 64,
    borderRadius: 6,
    overflow: 'hidden',
  },
  serviceAvatar: { 
    width: '100%', 
    height: '100%', 
    backgroundColor: Colors.surface,
  },
  serviceOnlineDot: { 
    position: 'absolute', 
    top: 4, 
    right: 4, 
    width: 8, 
    height: 8, 
    borderRadius: 4, 
    backgroundColor: Colors.success, 
    borderWidth: 1.5, 
    borderColor: Colors.card,
  },
  serviceName: { 
    fontSize: 11, 
    fontWeight: '800', 
    color: T.text, 
    textAlign: 'center', 
    marginBottom: 2,
    width: '100%',
  },
  serviceCategory: { 
    fontSize: 9, 
    color: Colors.textSecondary, 
    textAlign: 'center', 
    marginBottom: 4,
    fontWeight: '500',
  },
  serviceRatingRow: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 3,
  },
  serviceRating: { 
    fontSize: 10, 
    fontWeight: '700', 
    color: Colors.accent,
  },
  bizCard: {
    width: 120,
    backgroundColor: Colors.card,
    borderRadius: 8,
    padding: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  bizIconBox: { 
    width: '100%', 
    height: 64, 
    borderRadius: 6, 
    overflow: 'hidden',
    backgroundColor: Colors.surface, 
    marginBottom: 8,
  },
  bizImage: {
    width: '100%',
    height: '100%',
  },
  bizName: { 
    fontSize: 11, 
    fontWeight: '800', 
    color: T.text, 
    textAlign: 'center', 
    marginBottom: 2,
    width: '100%',
  },
  bizCat: { 
    fontSize: 9, 
    color: Colors.textSecondary, 
    textAlign: 'center', 
    marginBottom: 6,
    fontWeight: '500',
  },
  bizVerifiedBadge: { 
    backgroundColor: Colors.dangerLight, 
    paddingHorizontal: 6, 
    paddingVertical: 2, 
    borderRadius: 6, 
    borderWidth: 1, 
    borderColor: Colors.danger,
  },
  bizVerifiedText: { 
    fontSize: 8, 
    fontWeight: '700', 
    color: Colors.danger,
  },

  // Feed Header & Chips
  feedHeader: { 
    paddingHorizontal: PX,
    marginTop: 12,
    marginBottom: 16,
  },
  feedHeaderTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  feedSectionTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: T.text,
    letterSpacing: -0.3,
  },
  postBtn: {
    backgroundColor: Colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 100,
  },
  postBtnText: {
    color: Colors.card,
    fontSize: 12,
    fontWeight: '800',
  },
  chipsRow: {
    gap: 8,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 100,
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  chipActive: {
    backgroundColor: Colors.text,
    borderColor: Colors.text,
  },
  chipText: {
    fontSize: 11,
    fontWeight: "700",
    color: Colors.text,
  },
  chipTextActive: {
    color: Colors.card,
  },

  // State / Loading layouts
  stateBox: {
    borderRadius: 8,
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingVertical: 32,
    paddingHorizontal: 20,
    alignItems: "center",
    marginHorizontal: PX,
    marginTop: 12,
  },
  stateTitle: {
    color: T.text,
    fontSize: 15,
    fontWeight: "800",
    marginTop: 12,
    marginBottom: 6,
  },
  stateSub: {
    color: Colors.textSecondary,
    fontSize: 12,
    textAlign: "center",
    lineHeight: 16,
  },
  stateBtn: {
    marginTop: 16,
    backgroundColor: Colors.text,
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 8,
  },
  stateBtnTxt: { color: Colors.card, fontSize: 12, fontWeight: "700" },

  loadingContainer: { 
    paddingVertical: 40, 
    alignItems: "center", 
    gap: 8,
  },
  loadingText: { 
    color: Colors.textSecondary, 
    fontSize: 12,
    fontWeight: '600',
  },

  onboardingCard: {
    backgroundColor: Colors.card,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 24,
    alignItems: "center",
    marginHorizontal: PX,
    marginTop: 12,
  },
  onboardingIconBg: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  onboardingTitle: {
    color: T.text,
    fontSize: 15,
    fontWeight: "800",
    textAlign: "center",
    marginBottom: 6,
  },
  onboardingDesc: {
    color: Colors.textSecondary,
    fontSize: 12,
    textAlign: "center",
    lineHeight: 16,
  },

  // FAB
  fab: {
    position: 'absolute',
    bottom: 24,
    right: PX,
    backgroundColor: Colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 100,
    gap: 6,
    zIndex: 90,
  },
  fabText: { color: Colors.card, fontSize: 13, fontWeight: '800' },

  // Neighborhood Modal Sheet
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.3)",
    justifyContent: "flex-end",
  },
  modalSheet: {
    backgroundColor: Colors.card,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingTop: 12,
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  modalHandle: {
    width: 36,
    height: 4,
    backgroundColor: Colors.border,
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 20,
  },
  modalHeaderCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
    alignSelf: 'center',
    marginBottom: 12,
  },
  modalMetaLabel: {
    color: Colors.textSecondary,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1.0,
    textTransform: "uppercase",
    textAlign: "center",
    marginBottom: 4,
  },
  modalAreaTitle: {
    color: T.text,
    fontSize: 18,
    fontWeight: "800",
    letterSpacing: -0.3,
    textAlign: "center",
    marginBottom: 2,
  },
  modalCityText: {
    color: Colors.textSecondary,
    fontSize: 13,
    fontWeight: "600",
    textAlign: "center",
    marginBottom: 20,
  },
  modalStatRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  modalStatText: { color: T.text, fontSize: 13, fontWeight: "600" },
  modalDismissBtn: {
    marginTop: 20,
    backgroundColor: Colors.text,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  modalDismissText: { color: Colors.card, fontSize: 13, fontWeight: "700" },

  // Bottom Sheet Create Modal
  sheetBg: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.3)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: Colors.card,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingTop: 12,
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  sheetPill: {
    width: 36,
    height: 4,
    backgroundColor: Colors.border,
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 20,
  },
  sheetTitle: {
    color: T.text,
    fontSize: 16,
    fontWeight: "800",
    marginBottom: 16,
  },
  sheetRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  sheetIco: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  sheetRowT: { color: T.text, fontSize: 14, fontWeight: "700" },
  sheetRowS: { color: Colors.textSecondary, fontSize: 11, marginTop: 2, fontWeight: '500' },

  // Search Modal
  searchModalRoot: {
    flex: 1,
    backgroundColor: T.bg,
  },
  searchModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: Colors.card,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  searchModalCloseBtn: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  searchModalInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 100,
    paddingHorizontal: 12,
    height: 38,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  searchModalInput: {
    flex: 1,
    color: Colors.text,
    fontSize: 13,
    marginHorizontal: 6,
    fontWeight: '600',
    padding: 0,
  },
  searchResultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.card,
    borderRadius: 10,
    padding: 12,
    marginTop: 8,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  searchIconBox: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  searchResultTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.text,
  },
  searchResultSub: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 2,
    fontWeight: '500',
  },
  searchCenterContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
  },
  searchNoResultsText: {
    color: Colors.textSecondary,
    marginTop: 12,
    fontSize: 13,
    fontWeight: '600',
  },
  searchRecentTitle: {
    color: Colors.textSecondary,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  searchRecentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  searchRecentText: {
    color: Colors.text,
    fontSize: 13,
    fontWeight: '600',
    marginLeft: 10,
  },
});


