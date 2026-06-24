import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Alert,
  Dimensions,
  Linking,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import MapView, { Marker } from "react-native-maps";

import Text from "@/components/common/Text";
import { useLocationGuard } from "@/hooks/useLocationGuard";
import { useNotifications } from "@/hooks/useNotifications";
import { AuthService } from "@/services/authService";
import { PostService } from "@/services/postService";
import { SosService } from "@/services/sosService";
import { UserService } from "@/services/userService";
import ProviderService, { ServiceProvider } from "@/services/providerService";
import { useAppStore } from "@/store/appStore";
import { formatDistance, haversineDistance } from "@/utils/distance";
import { collection, onSnapshot, query, where, orderBy, limit } from "firebase/firestore";
import { db } from "@/services/firebase";

const { width } = Dimensions.get("window");
const PX = 16; 

// ─── Design tokens ────────────────────────────────────────────────────────────
const T = {
  bg: "#FFFFFF",
  card: "#FFFFFF",
  text: "#222222", 
  textSecondary: "#717171", 
  border: "#EBEBEB", 
  primary: "#FF385C", 
  blue: "#008489", 
  orange: "#FFB400", 
  green: "#10B981", 
  purple: "#8B5CF6",
  surface: "#F7F7F7", 
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
function getTimeAgo(ts: any): string {
  if (!ts) return "Just now";
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  const s = Math.floor((Date.now() - d.getTime()) / 1000);
  if (s < 60) return "Just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

function openMaps(lat: number, lng: number, label?: string) {
  const encoded = encodeURIComponent(label ?? "");
  const url =
    `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}` +
    (label ? `&destination_place_id=${encoded}` : "");
  Linking.openURL(url).catch(() =>
    Alert.alert("Maps unavailable", "Could not open Google Maps."),
  );
}

const RADIUS_OPTIONS = [1, 3, 5, 10] as const;
type RadiusKm = (typeof RADIUS_OPTIONS)[number];

// ─── Section header ───────────────────────────────────────────────────────────
function SectionHeader({
  icon,
  label,
  onSeeAll,
}: {
  icon: string;
  label: string;
  onSeeAll?: () => void;
}) {
  return (
    <View style={s.sectionHeader}>
      <View style={s.sectionLeft}>
        <Ionicons
          name={icon as any}
          size={18}
          color={T.text}
          style={{ marginRight: 8 }}
        />
        <Text style={s.sectionTitle}>{label}</Text>
      </View>
      {onSeeAll && (
        <TouchableOpacity onPress={onSeeAll} hitSlop={10}>
          <Text style={s.seeAllText}>See all</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

// ─── Map Widget ───────────────────────────────────────────────────────────────
function MapWidget({ lat, lng, area, users = [] }: { lat?: number; lng?: number; area: string, users?: any[] }) {
  if (!lat || !lng) {
    return (
      <View style={[s.mapWidget, { alignItems: "center", justifyContent: "center" }]}>
        <Text style={{ color: T.textSecondary, fontWeight: "500" }}>Location required for map.</Text>
      </View>
    );
  }

  const currentUserUid = AuthService.getCurrentUser()?.uid;

  return (
    <View style={s.mapWidget}>
      <MapView
        style={{ width: "100%", height: "100%" }}
        initialRegion={{
          latitude: lat,
          longitude: lng,
          latitudeDelta: 0.04,
          longitudeDelta: 0.04,
        }}
        showsUserLocation={true}
        showsMyLocationButton={true}
      >
        {users.map((u) => {
          if (!u.latitude || !u.longitude || u.uid === currentUserUid) return null;
          return (
            <Marker
              key={u.uid}
              coordinate={{ latitude: u.latitude, longitude: u.longitude }}
              title={u.name}
              description={u.bio || "Neighbor"}
              pinColor={T.primary}
            />
          );
        })}
      </MapView>

      <TouchableOpacity 
        style={s.mapOverlayBtn} 
        activeOpacity={0.9}
        onPress={() => openMaps(lat, lng, area)}
      >
        <Ionicons name="navigate-circle" size={40} color={T.primary} />
      </TouchableOpacity>
    </View>
  );
}

// ─── Horizontal Cards ─────────────────────────────────────────────────────────
function EmergencyCard({ item }: { item: any }) {
  const router = useRouter();
  return (
    <TouchableOpacity
      style={[s.horizCard, { borderLeftColor: T.primary, borderLeftWidth: 4 }]}
      activeOpacity={0.9}
      onPress={() => router.push(`/sos/${item.originalId || item.id}` as any)}
    >
      <View style={s.hcHeader}>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 4 }}>
            <Ionicons name="alert-circle" size={14} color={T.primary} />
            <Text style={{ fontSize: 11, fontWeight: "800", color: T.primary, textTransform: "uppercase", letterSpacing: 0.5 }}>Active SOS</Text>
          </View>
          <Text style={s.hcTitle} numberOfLines={1}>{item.title}</Text>
          <View style={s.hcMetaRow}>
            <Ionicons name="location-outline" size={11} color={T.textSecondary} />
            <Text style={s.hcMetaText} numberOfLines={1}>{item.area || "Nearby"}</Text>
          </View>
        </View>
      </View>
      <View style={s.hcFooter}>
        <Text style={s.hcTimeText}>{item.distance || "0.5 km"} • {item.timePosted}</Text>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <View style={[s.hcBtn, { borderColor: T.primary, backgroundColor: T.primary }]}>
            <Text style={[s.hcBtnText, { color: "#FFFFFF" }]}>Respond</Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

function HelpCard({ item }: { item: any }) {
  const router = useRouter();
  return (
    <TouchableOpacity
      style={s.horizCard}
      activeOpacity={0.9}
      onPress={() => router.push(`/post/${item.id}` as any)}
    >
      <View style={s.hcHeader}>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 4 }}>
            <Ionicons name="hand-left-outline" size={14} color={T.blue} />
            <Text style={{ fontSize: 11, fontWeight: "800", color: T.blue, textTransform: "uppercase", letterSpacing: 0.5 }}>Need Help</Text>
          </View>
          <Text style={s.hcTitle} numberOfLines={1}>{item.title}</Text>
          <View style={s.hcMetaRow}>
            <Ionicons name="location-outline" size={11} color={T.textSecondary} />
            <Text style={s.hcMetaText} numberOfLines={1}>{item.area || "Nearby"}</Text>
          </View>
        </View>
      </View>
      <View style={s.hcFooter}>
        <Text style={s.hcTimeText}>{item.distance || "1.2 km"} • {item.timePosted}</Text>
        <View style={[s.hcBtn, { borderColor: T.blue }]}>
          <Text style={[s.hcBtnText, { color: T.blue }]}>Contact</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

function RecommendationCard({ item }: { item: any }) {
  const router = useRouter();
  return (
    <TouchableOpacity
      style={s.horizCard}
      activeOpacity={0.9}
      onPress={() => router.push(`/post/${item.id}` as any)}
    >
      <View style={s.hcHeader}>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 4 }}>
            <Ionicons name="star-outline" size={14} color={T.purple} />
            <Text style={{ fontSize: 11, fontWeight: "800", color: T.purple, textTransform: "uppercase", letterSpacing: 0.5 }}>Recommendation</Text>
          </View>
          <Text style={s.hcTitle} numberOfLines={1}>{item.title}</Text>
          <View style={s.hcMetaRow}>
            <Ionicons name="location-outline" size={11} color={T.textSecondary} />
            <Text style={s.hcMetaText} numberOfLines={1}>{item.area || "Nearby"}</Text>
          </View>
        </View>
      </View>
      <View style={s.hcFooter}>
        <Text style={s.hcTimeText}>{item.distance || "0.8 km"} • {item.timePosted}</Text>
        <View style={[s.hcBtn, { borderColor: T.purple }]}>
          <Text style={[s.hcBtnText, { color: T.purple }]}>Suggest</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

function LostFoundCard({ item }: { item: any }) {
  const router = useRouter();
  return (
    <TouchableOpacity
      style={s.horizCard}
      activeOpacity={0.9}
      onPress={() => router.push(`/post/${item.id}` as any)}
    >
      <View style={s.hcHeader}>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 4 }}>
            <Ionicons name="search-outline" size={14} color={T.orange} />
            <Text style={{ fontSize: 11, fontWeight: "800", color: T.orange, textTransform: "uppercase", letterSpacing: 0.5 }}>Lost & Found</Text>
          </View>
          <Text style={s.hcTitle} numberOfLines={1}>{item.title}</Text>
          <View style={s.hcMetaRow}>
            <Ionicons name="location-outline" size={11} color={T.textSecondary} />
            <Text style={s.hcMetaText} numberOfLines={1}>{item.area || "Nearby"}</Text>
          </View>
        </View>
      </View>
      <View style={s.hcFooter}>
        <Text style={s.hcTimeText}>{item.distance || "0.8 km"} • {item.timePosted}</Text>
        <View style={[s.hcBtn, { borderColor: T.orange }]}>
          <Text style={[s.hcBtnText, { color: T.orange }]}>View Details</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

function FeaturedBusinessCard() {
  const router = useRouter();
  return (
    <TouchableOpacity
      style={[s.horizCard, { borderTopWidth: 4, borderTopColor: "#D4AF37", backgroundColor: "#FFFBF0" }]}
      activeOpacity={0.9}
      onPress={() => router.push("/premium" as any)}
    >
      <View style={{ position: 'absolute', top: 8, right: 8, backgroundColor: "#D4AF37", paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
        <Text style={{ fontSize: 9, fontWeight: "800", color: "#FFF", textTransform: "uppercase" }}>Coming Soon</Text>
      </View>
      <View style={s.hcHeader}>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 4 }}>
            <Ionicons name="diamond" size={14} color="#D4AF37" />
            <Text style={{ fontSize: 11, fontWeight: "800", color: "#D4AF37", textTransform: "uppercase", letterSpacing: 0.5 }}>Premium Listing</Text>
          </View>
          <Text style={s.hcTitle} numberOfLines={1}>Your Business Here</Text>
          <View style={s.hcMetaRow}>
            <Ionicons name="star" size={11} color={T.orange} />
            <Text style={[s.hcMetaText, { color: T.text }]} numberOfLines={1}>5.0 • 0.5 km</Text>
          </View>
        </View>
      </View>
      <View style={s.hcFooter}>
        <Text style={[s.hcTimeText, { color: T.textSecondary }]}>
          Top Rated
        </Text>
        <View style={[s.hcBtn, { borderColor: "#D4AF37" }]}>
          <Text style={[s.hcBtnText, { color: "#D4AF37" }]}>Promote</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

function ServiceProviderCard({ item }: { item: any }) {
  const router = useRouter();
  return (
    <TouchableOpacity
      style={s.horizCard}
      activeOpacity={0.9}
      onPress={() => router.push(`/services/${item.id}` as any)}
    >
      <View style={s.hcHeader}>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 4 }}>
            <Ionicons name="construct-outline" size={14} color={T.green} />
            <Text style={{ fontSize: 11, fontWeight: "800", color: T.green, textTransform: "uppercase", letterSpacing: 0.5 }}>{item.category}</Text>
          </View>
          <Text style={s.hcTitle} numberOfLines={1}>{item.name}</Text>
          <View style={s.hcMetaRow}>
            <Ionicons name="star" size={11} color={T.orange} />
            <Text style={[s.hcMetaText, { color: T.text }]} numberOfLines={1}>{item.rating ? item.rating.toFixed(1) : "New"} • {item.distance || "Nearby"}</Text>
          </View>
        </View>
      </View>
      <View style={s.hcFooter}>
        <Text style={[s.hcTimeText, { color: item.isVerified ? T.green : T.textSecondary }]}>
          {item.isVerified ? "✓ Verified" : "Unverified"}
        </Text>
        <View style={[s.hcBtn, { borderColor: T.green }]}>
          <Text style={[s.hcBtnText, { color: T.green }]}>Contact</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function NearbyScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const community = useAppStore((s) => s.primaryCommunity);
  const coordinates = useAppStore((s) => s.coordinates);
  const authInitialized = useAppStore((s) => s.authInitialized);
  const { isGpsDisabled, openLocationSettings } = useLocationGuard();
  const { unreadCount } = useNotifications();

  const [livePosts, setLivePosts] = useState<any[]>([]);
  const [activeSosAlerts, setActiveSosAlerts] = useState<any[]>([]);
  const [localServices, setLocalServices] = useState<any[]>([]);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [communityUsers, setCommunityUsers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Read radius from settings, default to 5km
  const radiusKm = userProfile?.locationRadius || 5;

  useEffect(() => {
    const me = AuthService.getCurrentUser();
    if (!me) return;
    const unsub = UserService.subscribeToUser(me.uid, (p) => setUserProfile(p));
    return unsub;
  }, []);

  useEffect(() => {
    if (!authInitialized || !coordinates?.lat || !coordinates?.lng) {
      setIsLoading(false);
      return;
    }
    
    setIsLoading(true);

    // 1. Subscribe to Users
    const usersUnsub = onSnapshot(
      query(collection(db, "users"), limit(100)),
      (snap) => {
        const users = snap.docs.map((d: any) => ({ uid: d.id, ...d.data() }));
        const filtered = users.filter((u: any) => {
          if (!u.latitude || !u.longitude) return false;
          const dist = haversineDistance(coordinates.lat!, coordinates.lng!, u.latitude, u.longitude);
          return dist <= radiusKm;
        });
        setCommunityUsers(filtered);
      },
      (err) => console.warn("Users sub error:", err)
    );

    const activeCommunityId = community?.communityId ?? userProfile?.communityId;

    // 2. Subscribe to Posts
    let postsUnsub = () => {};
    if (activeCommunityId) {
      const now = Date.now();
      postsUnsub = onSnapshot(
        query(
          collection(db, "posts"),
          where("communityId", "==", activeCommunityId),
          orderBy("createdAt", "desc"),
          limit(100)
        ),
        (snap) => {
          let posts = snap.docs.map((d: any) => ({ id: d.id, ...d.data() }));
          
          posts = posts.filter((p: any) => {
            if (p.category?.toLowerCase() === 'community alert' && p.expiresAt) {
              const exp = p.expiresAt.toDate ? p.expiresAt.toDate().getTime() : new Date(p.expiresAt).getTime();
              if (now > exp) return false;
            }
            return true;
          });

          const mapped = posts.map((p: any) => {
            let km: number | null = null;
            if (p.latitude != null && p.longitude != null && coordinates.lat != null && coordinates.lng != null) {
              km = haversineDistance(coordinates.lat, coordinates.lng, p.latitude, p.longitude);
            }
            
            return {
              ...p,
              distanceKm: km != null ? parseFloat(km.toFixed(2)) : null,
              distance: p.distanceLabel ?? (km != null ? formatDistance(km) : "Nearby"),
              timePosted: getTimeAgo(p.createdAt),
            };
          });
          setLivePosts(mapped);
        },
        (err) => console.warn("Posts sub error:", err)
      );
    }

    // 3. Subscribe to Active SOS
    let sosUnsub = () => {};
    if (activeCommunityId) {
      sosUnsub = SosService.subscribeToActiveSOS(
        activeCommunityId,
        (alerts) => {
          setActiveSosAlerts(alerts);
        }
      );
    }

    // 4. Subscribe to Services
    let servicesUnsub = () => {};
    if (activeCommunityId) {
      servicesUnsub = onSnapshot(
        query(collection(db, "services"), where("communityId", "==", activeCommunityId)),
        (snap) => {
          const services = snap.docs.map((d: any) => ({ id: d.id, ...d.data() }));
          const mappedServices = services.map((s: any) => {
            let dist = null;
            let distLabel = "Nearby";
            if (s.location && s.location.lat && s.location.lng) {
              dist = haversineDistance(coordinates.lat!, coordinates.lng!, s.location.lat, s.location.lng);
              distLabel = formatDistance(dist);
            }
            return {
              ...s,
              distanceKm: dist,
              distance: distLabel,
            };
          }).filter((s: any) => s.distanceKm == null || s.distanceKm <= radiusKm);
          
          mappedServices.sort((a: any, b: any) => {
            if (a.isVerified !== b.isVerified) return a.isVerified ? -1 : 1;
            if (a.isAvailable === b.isAvailable) return b.rating - a.rating;
            return a.isAvailable ? -1 : 1;
          });
          
          setLocalServices(mappedServices);
        },
        (err) => console.warn("Services sub error:", err)
      );
    }

    setIsLoading(false);

    return () => {
      usersUnsub();
      postsUnsub();
      sosUnsub();
      servicesUnsub();
    };
  }, [
    authInitialized,
    coordinates?.lat,
    coordinates?.lng,
    radiusKm,
    community?.communityId,
    userProfile?.communityId
  ]);

  const loadNearbyData = async () => {
    // Left empty since we are now real-time. Just a dummy for the refresh control.
    setTimeout(() => setIsLoading(false), 500);
  };

  const sosItems = activeSosAlerts.map((alert) => {
    let distKm: number | null = null;
    let distLabel = "Nearby";
    if (coordinates && alert.location?.lat && alert.location?.lng) {
      distKm = haversineDistance(
        coordinates.lat,
        coordinates.lng,
        alert.location.lat,
        alert.location.lng,
      );
      distLabel = formatDistance(distKm);
    }
    return {
      ...alert,
      id: `sos_${alert.id}`,
      originalId: alert.id,
      title: `Emergency: ${alert.type}`,
      category: "Emergency",
      area: alert.location?.area,
      timePosted: getTimeAgo(alert.createdAt),
      distanceKm: distKm,
      distance: distLabel,
      commentsCount: alert.respondersCount || 0,
      isSos: true,
    };
  });

  const allItems = [...sosItems, ...livePosts];

  const withinRadius = allItems.filter((p) => {
    if (p.distanceKm == null) return true;
    return p.distanceKm <= radiusKm;
  });

  const emergencies = withinRadius.filter(
    (p) => p.category?.toLowerCase() === "emergency" || p.isSos
  );
  
  const requests = withinRadius.filter((p) => {
    const cat = p.category?.toLowerCase() || "";
    return cat.includes("need help") || cat === "help" || cat === "general";
  });

  const recommendations = withinRadius.filter((p) => {
    const cat = p.category?.toLowerCase() || "";
    return cat.includes("recommend") || cat === "recommendations";
  });

  const lostFound = withinRadius.filter((p) => {
    const c = p.category?.toLowerCase();
    return c === "lost & found" || c === "lost_found" || c === "lost";
  });

  const areaName =
    community?.district ||
    community?.area ||
    userProfile?.district ||
    userProfile?.neighborhood ||
    userProfile?.communityName ||
    "";

  if (isGpsDisabled || (!isLoading && !coordinates && authInitialized)) {
    return (
      <View style={s.root}>
        <StatusBar barStyle="dark-content" backgroundColor={T.bg} />
        <SafeAreaView style={{ flex: 1 }} edges={["top"]}>
          <View style={s.header}>
            <Text style={s.headerTitle}>Nearby Utility</Text>
          </View>
          <View style={s.center}>
            <Ionicons name="location-outline" size={48} color="#D1D5DB" />
            <Text style={s.stateTitle}>Location Required</Text>
            <Text style={s.stateSub}>
              Enable GPS to discover local needs and services.
            </Text>
            <TouchableOpacity style={s.stateBtn} onPress={openLocationSettings}>
              <Text style={s.stateBtnText}>Enable Location</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  return (
    <View style={s.root}>
      <StatusBar barStyle="dark-content" backgroundColor={T.bg} />
      <SafeAreaView style={{ flex: 1, backgroundColor: "#FFFFFF" }} edges={["top"]}>
        
        {/* ── Header ── */}
        <View style={s.header}>
          <View style={s.headerLeft}>
            <View style={s.pinCircle}>
              <Ionicons name="location" size={17} color={T.primary} />
            </View>
            <View style={{ marginLeft: 10, flex: 1 }}>
              <Text style={s.headerTitle} numberOfLines={1}>
                {areaName || "Nearby Activity"}
              </Text>
              <Text style={s.headerSub}>
                Local needs & services within {radiusKm} km
              </Text>
            </View>
          </View>
          <View style={s.headerRight}>
            <TouchableOpacity
              style={s.circleBtn}
              onPress={() => router.push("/search" as any)}
            >
              <Ionicons name="search-outline" size={18} color={T.text} />
            </TouchableOpacity>
            <TouchableOpacity
              style={s.circleBtn}
              onPress={() => router.push("/notifications" as any)}
            >
              <Ionicons name="notifications-outline" size={18} color={T.text} />
              {unreadCount > 0 && <View style={s.unreadDot} />}
            </TouchableOpacity>
          </View>
        </View>

        {/* ── Content ── */}
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={s.scroll}
          refreshControl={
            <RefreshControl
              refreshing={isLoading}
              onRefresh={() => {
                loadNearbyData();
              }}
              colors={[T.primary]}
              tintColor={T.primary}
            />
          }
        >
          <MapWidget 
            lat={coordinates?.lat || userProfile?.latitude} 
            lng={coordinates?.lng || userProfile?.longitude} 
            area={areaName}
            users={communityUsers}
          />

          {/* SECTION 1: Nearby Activity Overview */}
          <View style={s.overviewCard}>
            <Text style={s.overviewTitle}>📍 Nearby Activity</Text>
            <View style={s.overviewGrid}>
              <View style={s.overviewStat}>
                <Text style={s.statValue}>{emergencies.length}</Text>
                <Text style={s.statLabel}>Active SOS</Text>
              </View>
              <View style={s.overviewStat}>
                <Text style={s.statValue}>{requests.length}</Text>
                <Text style={s.statLabel}>Help Requests</Text>
              </View>
              <View style={s.overviewStat}>
                <Text style={s.statValue}>{lostFound.length}</Text>
                <Text style={s.statLabel}>Lost & Found</Text>
              </View>
              <View style={s.overviewStat}>
                <Text style={s.statValue}>{localServices.length}</Text>
                <Text style={s.statLabel}>Services Available</Text>
              </View>
            </View>
          </View>

          {/* SECTION 6: Active SOS Alerts */}
          {emergencies.length > 0 && (
            <View style={s.section}>
              <SectionHeader icon="alert-circle" label="Active SOS Alerts" />
              <ScrollView 
                horizontal 
                showsHorizontalScrollIndicator={false} 
                contentContainerStyle={{ paddingHorizontal: PX, paddingBottom: 12, gap: 12 }}
              >
                {emergencies.map((item) => (
                  <EmergencyCard key={item.id} item={item} />
                ))}
              </ScrollView>
            </View>
          )}

          {/* SECTION 2: Need Help Near You */}
          {requests.length > 0 && (
            <View style={s.section}>
              <SectionHeader icon="hand-left-outline" label="Need Help Near You" onSeeAll={() => router.push("/search" as any)} />
              <ScrollView 
                horizontal 
                showsHorizontalScrollIndicator={false} 
                contentContainerStyle={{ paddingHorizontal: PX, paddingBottom: 12, gap: 12 }}
              >
                {requests.map((item) => (
                  <HelpCard key={item.id} item={item} />
                ))}
              </ScrollView>
            </View>
          )}

          {/* SECTION 4: Recommendations Near You */}
          {recommendations.length > 0 && (
            <View style={s.section}>
              <SectionHeader icon="star-outline" label="Recommendations Near You" onSeeAll={() => router.push("/search" as any)} />
              <ScrollView 
                horizontal 
                showsHorizontalScrollIndicator={false} 
                contentContainerStyle={{ paddingHorizontal: PX, paddingBottom: 12, gap: 12 }}
              >
                {recommendations.map((item) => (
                  <RecommendationCard key={item.id} item={item} />
                ))}
              </ScrollView>
            </View>
          )}

          {/* MONETIZATION PLACEHOLDER: Featured Businesses */}
          <View style={s.section}>
            <SectionHeader icon="diamond-outline" label="Featured Businesses" />
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false} 
              contentContainerStyle={{ paddingHorizontal: PX, paddingBottom: 12, gap: 12 }}
            >
              <FeaturedBusinessCard />
              <FeaturedBusinessCard />
            </ScrollView>
          </View>

          {/* MONETIZATION PLACEHOLDER: Promote Card */}
          <View style={{ marginHorizontal: PX, marginBottom: 32 }}>
            <TouchableOpacity 
              style={{ backgroundColor: '#111827', borderRadius: 16, padding: 20, flexDirection: 'row', alignItems: 'center' }}
              activeOpacity={0.9}
              onPress={() => router.push('/premium' as any)}
            >
              <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: '#374151', alignItems: 'center', justifyContent: 'center', marginRight: 16 }}>
                <Ionicons name="trending-up" size={24} color="#D4AF37" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: '#FFF', fontSize: 16, fontWeight: '700', marginBottom: 4 }}>Promote Your Business</Text>
                <Text style={{ color: '#9CA3AF', fontSize: 13, lineHeight: 18 }}>Premium Business Listings Coming Soon.</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
            </TouchableOpacity>
          </View>

          {/* SECTION 4: Trusted Local Services */}
          {localServices.length > 0 && (
            <View style={s.section}>
              <SectionHeader icon="construct-outline" label="Trusted Local Services" onSeeAll={() => router.push("/services" as any)} />
              <ScrollView 
                horizontal 
                showsHorizontalScrollIndicator={false} 
                contentContainerStyle={{ paddingHorizontal: PX, paddingBottom: 12, gap: 12 }}
              >
                {localServices.map((item) => (
                  <ServiceProviderCard key={item.id} item={item} />
                ))}
              </ScrollView>
            </View>
          )}

          {/* SECTION 5: Lost & Found */}
          {lostFound.length > 0 && (
            <View style={s.section}>
              <SectionHeader icon="search-outline" label="Lost & Found" onSeeAll={() => router.push("/search" as any)} />
              <ScrollView 
                horizontal 
                showsHorizontalScrollIndicator={false} 
                contentContainerStyle={{ paddingHorizontal: PX, paddingBottom: 12, gap: 12 }}
              >
                {lostFound.map((item) => (
                  <LostFoundCard key={item.id} item={item} />
                ))}
              </ScrollView>
            </View>
          )}

          {withinRadius.length === 0 && localServices.length === 0 && (
            <View style={s.emptyWrap}>
              <Ionicons name="map-outline" size={32} color="#D1D5DB" />
              <Text style={s.emptyTitle}>Nothing active nearby</Text>
              <Text style={s.emptySub}>No local needs or services within {radiusKm} km.</Text>
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: T.bg },
  scroll: { paddingTop: 16, paddingBottom: 80 },
  section: { marginBottom: 32 },
  center: {
    alignItems: "center",
    justifyContent: "center",
    padding: 40,
    gap: 10,
  },

  // Header
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 16,
    backgroundColor: "#FFFFFF",
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    marginRight: 8,
  },
  pinCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#FFF1F2",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#FFE4E6",
  },
  headerTitle: {
    color: T.text,
    fontSize: 20,
    fontWeight: "800",
    letterSpacing: -0.4,
  },
  headerSub: { color: T.textSecondary, fontSize: 13, marginTop: 2, fontWeight: "500" },
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
    position: "relative",
  },
  unreadDot: {
    position: "absolute",
    top: 10,
    right: 10,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: T.primary,
    borderWidth: 1,
    borderColor: T.bg,
  },

  // Section header
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: PX,
    marginBottom: 16,
  },
  sectionLeft: { flexDirection: "row", alignItems: "center" },
  sectionTitle: {
    color: T.text,
    fontSize: 18,
    fontWeight: "800",
    letterSpacing: -0.4,
  },
  seeAllText: { color: T.textSecondary, fontSize: 13, fontWeight: "600", textDecorationLine: "underline" },

  // Radius chips
  radiusRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingBottom: 16,
    gap: 8,
  },
  radiusChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 100,
    borderWidth: 1,
    borderColor: T.border,
    backgroundColor: T.card,
  },
  radiusChipActive: { backgroundColor: T.text, borderColor: T.text },
  radiusChipText: { fontSize: 13, fontWeight: "700", color: T.textSecondary },

  // Map Widget
  mapWidget: {
    height: 200,
    marginHorizontal: PX,
    marginBottom: 24,
    borderRadius: 16,
    backgroundColor: T.border,
    overflow: "hidden",
    position: "relative",
    borderWidth: 1,
    borderColor: T.border,
  },
  mapOverlayBtn: {
    position: "absolute",
    bottom: 12,
    right: 12,
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
  },

  // Overview Card
  overviewCard: {
    marginHorizontal: PX,
    backgroundColor: T.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 32,
    borderWidth: 1,
    borderColor: T.border,
  },
  overviewTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: T.text,
    marginBottom: 16,
  },
  overviewGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  overviewStat: {
    flex: 1,
    minWidth: "40%",
    backgroundColor: T.card,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: T.border,
    alignItems: "center",
  },
  statValue: {
    fontSize: 20,
    fontWeight: "800",
    color: T.text,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: T.textSecondary,
    textAlign: "center",
  },

  // Horizontal Cards
  horizCard: {
    width: width * 0.75,
    backgroundColor: T.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: T.border,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 1,
  },
  hcHeader: { flexDirection: "row", alignItems: "flex-start", marginBottom: 12 },
  hcTitle: { color: T.text, fontSize: 16, fontWeight: "700", marginBottom: 6, lineHeight: 22 },
  hcMetaRow: { flexDirection: "row", alignItems: "center" },
  hcMetaText: { color: T.textSecondary, fontSize: 13, marginLeft: 4, fontWeight: "500" },
  hcFooter: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 4 },
  hcTimeText: { color: T.textSecondary, fontSize: 12, fontWeight: "500" },
  hcBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  hcBtnText: { fontSize: 12, fontWeight: "700" },

  // Empty state
  emptyWrap: {
    backgroundColor: T.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: T.border,
    paddingVertical: 40,
    paddingHorizontal: 24,
    alignItems: "center",
    marginHorizontal: PX,
    marginBottom: 40,
  },
  emptyTitle: {
    color: T.text,
    fontSize: 15,
    fontWeight: "700",
    marginTop: 12,
  },
  emptySub: {
    color: T.textSecondary,
    fontSize: 13,
    marginTop: 6,
    textAlign: "center",
  },

  // GPS-off / error states
  stateTitle: {
    color: T.text,
    fontSize: 18,
    fontWeight: "800",
    textAlign: "center",
  },
  stateSub: {
    color: T.textSecondary,
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
  },
  stateBtn: {
    marginTop: 12,
    backgroundColor: T.text,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
  },
  stateBtnText: { color: "#FFFFFF", fontSize: 14, fontWeight: "700" },
});
