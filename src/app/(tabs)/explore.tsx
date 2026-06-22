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
  Platform,
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
import { useAppStore } from "@/store/appStore";
import { formatDistance, haversineDistance } from "@/utils/distance";

const { width } = Dimensions.get("window");
const PX = 16; // Standard padding

// ─── Design tokens ────────────────────────────────────────────────────────────
const T = {
  bg: "#FFFFFF",
  card: "#FFFFFF",
  text: "#222222", // Airbnb Off-black
  textSecondary: "#717171", // Airbnb Slate-gray
  border: "#EBEBEB", // Airbnb border divider
  primary: "#FF385C", // Airbnb Coral
  blue: "#008489", // Airbnb Teal/Blue
  orange: "#FFB400", // Airbnb amber/orange
  green: "#10B981", // Emerald green
  purple: "#8B5CF6",
  surface: "#F7F7F7", // Airbnb off-white
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

// ─── Radius options ───────────────────────────────────────────────────────────
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
          size={16}
          color={T.text}
          style={{ marginRight: 6 }}
        />
        <Text style={s.sectionTitle}>{label}</Text>
      </View>
      {onSeeAll && (
        <TouchableOpacity onPress={onSeeAll}>
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
      style={s.horizCard}
      activeOpacity={0.9}
      onPress={() => router.push(`/sos/${item.originalId || item.id}` as any)}
    >
      <View style={s.hcHeader}>
        <View style={[s.hcIconBox, { backgroundColor: "#FFF1F2" }]}>
          <Text style={{ fontSize: 10, fontWeight: "800", color: T.primary }}>SOS</Text>
        </View>
        <View style={{ flex: 1 }}>
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
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <Ionicons name="people" size={12} color={T.textSecondary} style={{ marginRight: 4 }} />
            <Text style={s.hcTimeText}>{item.commentsCount || 0}</Text>
          </View>
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
        <View style={[s.hcIconBox, { backgroundColor: "#EBF8FF" }]}>
          <Ionicons name="hand-left" size={16} color={T.blue} />
        </View>
        <View style={{ flex: 1 }}>
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
          <Text style={[s.hcBtnText, { color: T.blue }]}>Open</Text>
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
        <View style={[s.hcIconBox, { backgroundColor: "#ECFDF5" }]}>
          <Ionicons name="search" size={16} color={T.green} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={s.hcTitle} numberOfLines={1}>{item.title}</Text>
          <View style={s.hcMetaRow}>
            <Ionicons name="location-outline" size={11} color={T.textSecondary} />
            <Text style={s.hcMetaText} numberOfLines={1}>{item.area || "Nearby"}</Text>
          </View>
        </View>
      </View>
      <View style={s.hcFooter}>
        <Text style={s.hcTimeText}>{item.distance || "0.8 km"} • {item.timePosted}</Text>
        <View style={[s.hcBtn, { backgroundColor: T.green, borderWidth: 0 }]}>
          <Text style={[s.hcBtnText, { color: "#FFFFFF" }]}>View</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

// ─── Timeline Row ─────────────────────────────────────────────────────────────
function TimelineRow({ item, isLast }: { item: any; isLast: boolean }) {
  const router = useRouter();
  
  let color = T.textSecondary;
  let icon = "ellipse";
  const cat = item.category?.toLowerCase() || "";
  if (cat === "emergency" || item.isSos) {
    color = T.primary;
    icon = "alert-circle";
  } else if (cat === "help" || cat === "general" || cat === "food") {
    color = T.orange;
    icon = "hand-left";
  } else if (cat.includes("lost")) {
    color = T.green;
    icon = "search";
  } else if (cat === "services") {
    color = T.blue;
    icon = "construct";
  } else if (cat === "recommendations") {
    color = T.purple;
    icon = "star";
  }

  return (
    <TouchableOpacity 
      style={s.timelineRow}
      onPress={() => {
        if (item.isSos) {
          router.push(`/sos/${item.originalId || item.id}` as any);
        } else {
          router.push(`/post/${item.id}` as any);
        }
      }}
      activeOpacity={0.7}
    >
      <View style={s.tlLineCol}>
        <View style={[s.tlDot, { backgroundColor: color + "20" }]}>
          <Ionicons name={icon as any} size={12} color={color} />
        </View>
        {!isLast && <View style={[s.tlLine, { backgroundColor: "#F3F4F6" }]} />}
      </View>
      <View style={s.tlContent}>
        <View style={{ flex: 1 }}>
          <Text style={s.tlTitle} numberOfLines={1}>{item.title}</Text>
          <Text style={s.tlSub} numberOfLines={1}>{item.area || "Your Area"}</Text>
        </View>
        <View style={{ alignItems: "flex-end" }}>
          <Text style={s.tlDist}>{item.distance || "Nearby"}</Text>
          <Text style={[s.tlTime, { color: color }]}>{item.timePosted}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

// ─── Empty state ──────────────────────────────────────────────────────────────
function EmptyState({
  icon,
  title,
  sub,
}: {
  icon: string;
  title: string;
  sub?: string;
}) {
  return (
    <View style={s.emptyWrap}>
      <Ionicons name={icon as any} size={32} color="#D1D5DB" />
      <Text style={s.emptyTitle}>{title}</Text>
      {sub ? <Text style={s.emptySub}>{sub}</Text> : null}
    </View>
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
  const [userProfile, setUserProfile] = useState<any>(null);
  const [communityUsers, setCommunityUsers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [radiusKm, setRadiusKm] = useState<RadiusKm>(5);

  useEffect(() => {
    const me = AuthService.getCurrentUser();
    if (!me) return;
    const unsub = UserService.subscribeToUser(me.uid, (p) => setUserProfile(p));
    return unsub;
  }, []);

  const loadNearbyData = async () => {
    if (!coordinates?.lat || !coordinates?.lng) {
      setIsLoading(false);
      return;
    }
    
    setIsLoading(true);
    try {
      const users = await UserService.getUsersByRadius(coordinates.lat, coordinates.lng, radiusKm);
      setCommunityUsers(users);

      const posts = await PostService.getPostsByRadius(coordinates.lat, coordinates.lng, radiusKm, 7);
      setLivePosts(
        posts.map((p) => ({
          ...p,
          distance:
            p.distanceLabel ??
            (p.distanceKm != null ? `${p.distanceKm} km away` : undefined),
          timePosted: getTimeAgo(p.createdAt),
        })),
      );

      const alerts = await SosService.getActiveSOSByRadius(coordinates.lat, coordinates.lng, radiusKm);
      setActiveSosAlerts(alerts);
    } catch (err) {
      console.error("Nearby data load error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!authInitialized) return;
    loadNearbyData();
  }, [
    authInitialized,
    coordinates?.lat,
    coordinates?.lng,
    radiusKm,
  ]);

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
      title: `🚨 ${alert.type}`,
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
  const requests = withinRadius.filter((p) =>
    ["help", "general", "food"].includes(p.category?.toLowerCase()),
  );
  const lostFound = withinRadius.filter((p) => {
    const c = p.category?.toLowerCase();
    return c === "lost & found" || c === "lost_found" || c === "lost";
  });
  
  const activityTimeline = [...withinRadius]
    .sort((a, b) => {
      const aTime = a.createdAt?.toDate 
        ? a.createdAt.toDate().getTime() 
        : (a.createdAt ? new Date(a.createdAt).getTime() : Date.now());
      const bTime = b.createdAt?.toDate 
        ? b.createdAt.toDate().getTime() 
        : (b.createdAt ? new Date(b.createdAt).getTime() : Date.now());
      return bTime - aTime;
    })
    .slice(0, 10);

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
            <Text style={s.headerTitle}>Nearby</Text>
          </View>
          <View style={s.center}>
            <Ionicons name="location-outline" size={48} color="#D1D5DB" />
            <Text style={s.stateTitle}>Location Required</Text>
            <Text style={s.stateSub}>
              Enable GPS to discover what's happening nearby.
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
                {areaName || "Nearby"}
              </Text>
              <Text style={s.headerSub}>
                See what's happening nearby
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

        {/* ── Radius chips ── */}
        <View style={s.radiusRow}>
          {RADIUS_OPTIONS.map((r) => (
            <TouchableOpacity
              key={r}
              onPress={() => setRadiusKm(r)}
              style={[s.radiusChip, radiusKm === r && s.radiusChipActive]}
              activeOpacity={0.8}
            >
              <Text
                style={[
                  s.radiusChipText,
                  radiusKm === r && { color: "#FFFFFF" },
                ]}
              >
                {r} km
              </Text>
            </TouchableOpacity>
          ))}
          <View style={{ flex: 1 }} />
          <TouchableOpacity 
            style={s.myLocBtn}
            onPress={() => Alert.alert("Location", `Currently showing activity near ${areaName || "your location"}.`)}
          >
            <Ionicons name="locate" size={12} color={T.blue} style={{ marginRight: 4 }}/>
            <Text style={[s.myLocText, { color: T.blue }]}>My Location</Text>
          </TouchableOpacity>
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

          {emergencies.length > 0 && (
            <View style={s.section}>
              <SectionHeader
                icon="alert-circle"
                label="Nearby emergencies"
                onSeeAll={() => router.push("/" as any)}
              />
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

          {requests.length > 0 && (
            <View style={s.section}>
              <SectionHeader
                icon="hand-left"
                label="Nearby help requests"
                onSeeAll={() => router.push("/search" as any)}
              />
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

          {lostFound.length > 0 && (
            <View style={s.section}>
              <SectionHeader
                icon="cube"
                label="Lost & found nearby"
                onSeeAll={() => router.push("/search" as any)}
              />
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

          {activityTimeline.length > 0 && (
            <View style={s.section}>
              <SectionHeader
                icon="pulse"
                label="Activity around you"
                onSeeAll={() => router.push("/search" as any)}
              />
              <View style={s.timelineContainer}>
                {activityTimeline.map((item, index) => (
                  <TimelineRow 
                    key={item.id} 
                    item={item} 
                    isLast={index === activityTimeline.length - 1} 
                  />
                ))}
              </View>
            </View>
          )}

          {withinRadius.length === 0 && (
            <EmptyState
              icon="people-outline"
              title="Nothing nearby yet"
              sub={`No activity within ${radiusKm} km. Be the first to post!`}
            />
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
  section: { marginBottom: 28 },
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
    fontSize: 16,
    fontWeight: "800",
    letterSpacing: -0.3,
  },
  seeAllText: { color: T.primary, fontSize: 13, fontWeight: "700" },

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
  radiusChipActive: { backgroundColor: T.primary, borderColor: T.primary },
  radiusChipText: { fontSize: 12, fontWeight: "700", color: T.textSecondary },
  myLocBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 100,
    borderWidth: 1,
    borderColor: T.border,
    backgroundColor: T.card,
  },
  myLocText: { color: T.text, fontSize: 12, fontWeight: "700" },

  // Map Widget
  mapWidget: {
    height: 220,
    marginHorizontal: PX,
    marginBottom: 36,
    borderRadius: 20,
    backgroundColor: T.border,
    overflow: "hidden",
    position: "relative",
    borderWidth: 1,
    borderColor: T.border,
  },
  userMarker: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: T.primary,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#FFF",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 4,
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

  // Horizontal Cards
  horizCard: {
    width: width * 0.72,
    backgroundColor: T.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: T.border,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.02,
    shadowRadius: 8,
    elevation: 1,
  },
  hcHeader: { flexDirection: "row", alignItems: "center", marginBottom: 12 },
  hcIconBox: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  hcTitle: { color: T.text, fontSize: 15, fontWeight: "700", marginBottom: 4 },
  hcMetaRow: { flexDirection: "row", alignItems: "center" },
  hcMetaText: { color: T.textSecondary, fontSize: 12, marginLeft: 4, fontWeight: "500" },
  hcFooter: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  hcTimeText: { color: T.textSecondary, fontSize: 12, fontWeight: "500" },
  hcRespondText: { color: T.textSecondary, fontSize: 12, fontWeight: "600" },
  hcBtn: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 100,
    borderWidth: 1,
    borderColor: T.border,
  },
  hcBtnText: { fontSize: 11, fontWeight: "700" },

  // Timeline
  timelineContainer: { paddingHorizontal: PX },
  timelineRow: { flexDirection: "row", minHeight: 60 },
  tlLineCol: { width: 24, alignItems: "center" },
  tlDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 2,
  },
  tlLine: { width: 2, flex: 1, marginTop: -4, marginBottom: -4, zIndex: 1 },
  tlContent: { flex: 1, flexDirection: "row", paddingLeft: 12, paddingBottom: 16 },
  tlTitle: { color: T.text, fontSize: 14, fontWeight: "700", marginBottom: 2 },
  tlSub: { color: T.textSecondary, fontSize: 12, fontWeight: "500" },
  tlDist: { color: T.textSecondary, fontSize: 11, fontWeight: "600", marginBottom: 2 },
  tlTime: { fontSize: 11, fontWeight: "700" },

  // Empty state
  emptyWrap: {
    backgroundColor: T.card,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: T.border,
    paddingVertical: 40,
    paddingHorizontal: 24,
    alignItems: "center",
    marginHorizontal: PX,
  },
  emptyTitle: {
    color: T.textSecondary,
    fontSize: 14,
    fontWeight: "700",
    marginTop: 10,
  },
  emptySub: {
    color: "#9CA3AF",
    fontSize: 12,
    marginTop: 4,
    textAlign: "center",
  },

  // GPS-off / error states
  stateTitle: {
    color: T.text,
    fontSize: 16,
    fontWeight: "700",
    textAlign: "center",
  },
  stateSub: {
    color: T.textSecondary,
    fontSize: 13,
    textAlign: "center",
    lineHeight: 18,
  },
  stateBtn: {
    marginTop: 6,
    backgroundColor: T.text,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 100,
  },
  stateBtnText: { color: "#FFFFFF", fontSize: 13, fontWeight: "800" },
});
