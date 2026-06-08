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
    Text,
    TouchableOpacity,
    View
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useLocationGuard } from "@/hooks/useLocationGuard";
import { useNotifications } from "@/hooks/useNotifications";
import { AuthService } from "@/services/authService";
import { PostService } from "@/services/postService";
import { UserService } from "@/services/userService";
import { useAppStore } from "@/store/appStore";

const { width } = Dimensions.get("window");

// ─── Design tokens ────────────────────────────────────────────────────────────
const T = {
  bg: "#F8F9FA",
  card: "#FFFFFF",
  text: "#111827",
  textSecondary: "#6B7280",
  border: "#E5E7EB",
  primary: "#EF4444",
  blue: "#2563EB",
  orange: "#D97706",
  green: "#10B981",
  purple: "#7C3AED",
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

function catColor(category: string): string {
  const c = category?.toLowerCase();
  if (c === "emergency") return T.primary;
  if (c === "help") return T.blue;
  if (c === "services") return T.green;
  if (c === "food") return T.orange;
  if (c === "recommendations") return T.purple;
  if (c?.includes("lost")) return T.orange;
  return T.textSecondary;
}

// ─── Radius options ───────────────────────────────────────────────────────────
const RADIUS_OPTIONS = [1, 3, 5, 10] as const;
type RadiusKm = (typeof RADIUS_OPTIONS)[number];

// ─── Section header ───────────────────────────────────────────────────────────
function SectionHeader({
  icon,
  label,
  badge,
  badgeBg = T.primary,
}: {
  icon: string;
  label: string;
  badge?: string;
  badgeBg?: string;
}) {
  return (
    <View style={s.sectionHeader}>
      <View style={s.sectionLeft}>
        <Ionicons
          name={icon as any}
          size={14}
          color={T.textSecondary}
          style={{ marginRight: 6 }}
        />
        <Text style={s.sectionLabel}>{label}</Text>
      </View>
      {badge ? (
        <View style={[s.sectionBadge, { backgroundColor: badgeBg }]}>
          <Text style={s.sectionBadgeText}>{badge}</Text>
        </View>
      ) : null}
    </View>
  );
}

// ─── Emergency card ───────────────────────────────────────────────────────────
function EmergencyCard({ item }: { item: any }) {
  const router = useRouter();
  const hasCoords = item.latitude && item.longitude;
  return (
    <TouchableOpacity
      style={s.emergencyCard}
      activeOpacity={0.9}
      onPress={() => router.push(`/post/${item.id}` as any)}
    >
      <View style={s.emTopRow}>
        <View style={s.emBadge}>
          <Ionicons
            name="time"
            size={11}
            color="#FFFFFF"
            style={{ marginRight: 3 }}
          />
          <Text style={s.emBadgeText}>SOS nearby</Text>
        </View>
        <Text style={s.emMeta}>
          {item.timePosted}
          {item.distance ? (
            <Text style={{ color: "#FCA5A5" }}> · {item.distance}</Text>
          ) : null}
        </Text>
      </View>

      <Text style={s.emTitle} numberOfLines={2}>
        {item.title}
      </Text>

      <View style={s.emFooter}>
        <View style={s.emResponders}>
          <Ionicons
            name="people-outline"
            size={13}
            color="#9CA3AF"
            style={{ marginRight: 5 }}
          />
          <Text style={s.emRespondersText}>
            {item.commentsCount || 0} responding
          </Text>
        </View>
        <View style={s.emActions}>
          {hasCoords && (
            <TouchableOpacity
              style={s.emMapsBtn}
              onPress={() =>
                openMaps(item.latitude, item.longitude, item.title)
              }
              activeOpacity={0.8}
            >
              <Ionicons name="navigate-outline" size={13} color="#9CA3AF" />
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={s.emHelpBtn}
            onPress={() => router.push(`/post/${item.id}` as any)}
            activeOpacity={0.8}
          >
            <Ionicons
              name="hand-left"
              size={12}
              color="#FFFFFF"
              style={{ marginRight: 4 }}
            />
            <Text style={s.emHelpText}>I Can Help</Text>
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );
}

// ─── Generic post row ─────────────────────────────────────────────────────────
function PostRow({ item, isLast }: { item: any; isLast: boolean }) {
  const router = useRouter();
  const hasCoords = item.latitude && item.longitude;
  const color = catColor(item.category);
  return (
    <View>
      <TouchableOpacity
        style={s.postRow}
        activeOpacity={0.75}
        onPress={() => router.push(`/post/${item.id}` as any)}
      >
        <View style={[s.postDot, { backgroundColor: color }]} />
        <View style={s.postContent}>
          <Text style={s.postTitle} numberOfLines={1}>
            {item.title}
          </Text>
          <View style={s.postMeta}>
            <Ionicons
              name="location-outline"
              size={10}
              color={T.textSecondary}
              style={{ marginRight: 2 }}
            />
            <Text style={s.postMetaText}>{item.distance || "Nearby"}</Text>
            <View style={s.metaDot} />
            <Ionicons
              name="time-outline"
              size={10}
              color={T.textSecondary}
              style={{ marginRight: 2 }}
            />
            <Text style={s.postMetaText}>{item.timePosted}</Text>
            {item.commentsCount > 0 && (
              <>
                <View style={s.metaDot} />
                <Ionicons
                  name="chatbubble-outline"
                  size={10}
                  color={T.textSecondary}
                  style={{ marginRight: 2 }}
                />
                <Text style={s.postMetaText}>{item.commentsCount}</Text>
              </>
            )}
          </View>
        </View>
        <View style={s.postActions}>
          {hasCoords && (
            <TouchableOpacity
              hitSlop={10}
              onPress={() =>
                openMaps(item.latitude, item.longitude, item.title)
              }
            >
              <Ionicons
                name="navigate-outline"
                size={15}
                color={T.textSecondary}
              />
            </TouchableOpacity>
          )}
          <Ionicons
            name="chevron-forward"
            size={15}
            color="#D1D5DB"
            style={{ marginLeft: 8 }}
          />
        </View>
      </TouchableOpacity>
      {!isLast && <View style={s.rowDivider} />}
    </View>
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

// ─── Location widget (replaces fake map) ──────────────────────────────────────
function LocationWidget({
  areaName,
  cityName,
  lat,
  lng,
  sosCount,
  totalNearby,
}: {
  areaName: string;
  cityName: string;
  lat?: number;
  lng?: number;
  sosCount: number;
  totalNearby: number;
}) {
  return (
    <View style={s.locWidget}>
      {/* Accuracy pulse ring */}
      <View style={s.locPulseOuter} />
      <View style={s.locPulseInner} />
      <View style={s.locPinCircle}>
        <Ionicons name="location" size={20} color="#FFFFFF" />
      </View>

      {/* Badges */}
      <View style={s.locBottomRow}>
        <View style={s.locNameBadge}>
          <Ionicons
            name="location-outline"
            size={11}
            color={T.text}
            style={{ marginRight: 4 }}
          />
          <Text style={s.locNameText} numberOfLines={1}>
            {areaName}
            {cityName ? `, ${cityName}` : ""}
          </Text>
        </View>
        <View
          style={[
            s.locSosBadge,
            { backgroundColor: sosCount > 0 ? T.primary : "#10B981" },
          ]}
        >
          <Text style={s.locSosText}>
            {sosCount > 0 ? `${sosCount} SOS` : "All clear"}
          </Text>
        </View>
      </View>

      {/* Coords row */}
      {lat !== undefined && lng !== undefined && (
        <View style={s.locCoordsRow}>
          <Ionicons
            name="navigate-circle-outline"
            size={11}
            color="rgba(255,255,255,0.5)"
            style={{ marginRight: 4 }}
          />
          <Text style={s.locCoordsText}>
            {lat.toFixed(4)}, {lng.toFixed(4)}
          </Text>
          <View style={s.locDot} />
          <Text style={s.locCoordsText}>{totalNearby} nearby</Text>
        </View>
      )}
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────
type TabType =
  | "All"
  | "Emergencies"
  | "Requests"
  | "Services"
  | "Lost & Found"
  | "Recommendations";

export default function NearbyScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const community = useAppStore((s) => s.community);
  const coordinates = useAppStore((s) => s.coordinates);
  const authInitialized = useAppStore((s) => s.authInitialized);
  const { isGpsDisabled, openLocationSettings } = useLocationGuard();
  const { unreadCount } = useNotifications();

  const [livePosts, setLivePosts] = useState<any[]>([]);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [feedError, setFeedError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>("All");
  const [radiusKm, setRadiusKm] = useState<RadiusKm>(5);

  // ── Real-time user profile ─────────────────────────────────────────────────
  useEffect(() => {
    const me = AuthService.getCurrentUser();
    if (!me) return;
    const unsub = UserService.subscribeToUser(me.uid, (p) => setUserProfile(p));
    return unsub;
  }, []);

  // ── Real-time post feed ────────────────────────────────────────────────────
  useEffect(() => {
    const cid = community?.communityId ?? userProfile?.communityId;
    if (!authInitialized) return;
    if (!cid) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setFeedError(null);

    // Synchronous unsub — no async IIFE, no leak
    const unsub = PostService.subscribeToCommunityPosts(
      cid,
      coordinates?.lat,
      coordinates?.lng,
      (posts) => {
        setLivePosts(
          posts.map((p) => ({
            ...p,
            distance:
              p.distanceLabel ??
              (p.distanceKm != null ? `${p.distanceKm} km away` : undefined),
            timePosted: getTimeAgo(p.createdAt),
          })),
        );
        setIsLoading(false);
      },
      (err) => {
        console.error("Nearby feed error:", err);
        setFeedError("Could not load nearby activity. Check your connection.");
        setIsLoading(false);
      },
    );

    return unsub;
  }, [
    authInitialized,
    community?.communityId,
    userProfile?.communityId,
    coordinates?.lat,
    coordinates?.lng,
  ]);

  // ── Radius-filtered posts ──────────────────────────────────────────────────
  const withinRadius = livePosts.filter((p) => {
    if (p.distanceKm == null) return true; // no coords on post → include
    return p.distanceKm <= radiusKm;
  });

  // ── Category splits ────────────────────────────────────────────────────────
  const emergencies = withinRadius.filter(
    (p) => p.category?.toLowerCase() === "emergency",
  );
  const requests = withinRadius.filter((p) =>
    ["help", "general", "food"].includes(p.category?.toLowerCase()),
  );
  const services = withinRadius.filter(
    (p) => p.category?.toLowerCase() === "services",
  );
  const lostFound = withinRadius.filter((p) => {
    const c = p.category?.toLowerCase();
    return c === "lost & found" || c === "lost_found" || c === "lost";
  });
  const recommendations = withinRadius.filter(
    (p) => p.category?.toLowerCase() === "recommendations",
  );
  const trending = [...withinRadius]
    .sort((a, b) => (b.commentsCount || 0) - (a.commentsCount || 0))
    .slice(0, 6);

  // ── Display values ─────────────────────────────────────────────────────────
  const areaName =
    community?.district ||
    community?.area ||
    userProfile?.district ||
    userProfile?.neighborhood ||
    userProfile?.communityName ||
    "";

  const cityName = community?.city || userProfile?.city || "";

  // ── GPS-off guard ──────────────────────────────────────────────────────────
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

  const TABS: TabType[] = [
    "All",
    "Emergencies",
    "Requests",
    "Services",
    "Lost & Found",
    "Recommendations",
  ];

  // ── Render sections ────────────────────────────────────────────────────────
  const renderSections = () => {
    if (activeTab === "All") {
      return (
        <>
          <View style={s.section}>
            <SectionHeader icon="navigate-outline" label="YOUR LOCATION" />
            <LocationWidget
              areaName={areaName || "Locating…"}
              cityName={cityName}
              lat={coordinates?.lat}
              lng={coordinates?.lng}
              sosCount={emergencies.length}
              totalNearby={withinRadius.length}
            />
          </View>

          {emergencies.length > 0 && (
            <View style={s.section}>
              <SectionHeader
                icon="alert-circle-outline"
                label="NEARBY SOS"
                badge={`${emergencies.length} active`}
              />
              {emergencies.map((item) => (
                <EmergencyCard key={item.id} item={item} />
              ))}
            </View>
          )}

          {requests.length > 0 && (
            <View style={s.section}>
              <SectionHeader icon="hand-left-outline" label="HELP REQUESTS" />
              <View style={s.listCard}>
                {requests.map((item, i) => (
                  <PostRow
                    key={item.id}
                    item={item}
                    isLast={i === requests.length - 1}
                  />
                ))}
              </View>
            </View>
          )}

          {lostFound.length > 0 && (
            <View style={s.section}>
              <SectionHeader
                icon="search-outline"
                label="LOST & FOUND"
                badgeBg="#FEF3C7"
              />
              <View style={s.listCard}>
                {lostFound.map((item, i) => (
                  <PostRow
                    key={item.id}
                    item={item}
                    isLast={i === lostFound.length - 1}
                  />
                ))}
              </View>
            </View>
          )}

          {recommendations.length > 0 && (
            <View style={s.section}>
              <SectionHeader
                icon="star-outline"
                label="RECOMMENDATIONS"
                badgeBg="#EEF2FF"
              />
              <View style={s.listCard}>
                {recommendations.map((item, i) => (
                  <PostRow
                    key={item.id}
                    item={item}
                    isLast={i === recommendations.length - 1}
                  />
                ))}
              </View>
            </View>
          )}

          {services.length > 0 && (
            <View style={s.section}>
              <SectionHeader
                icon="construct-outline"
                label="COMMUNITY SERVICES"
              />
              <View style={s.listCard}>
                {services.map((item, i) => (
                  <PostRow
                    key={item.id}
                    item={item}
                    isLast={i === services.length - 1}
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
        </>
      );
    }

    if (activeTab === "Emergencies") {
      return emergencies.length > 0 ? (
        <View style={s.section}>
          <SectionHeader
            icon="alert-circle-outline"
            label="NEARBY SOS"
            badge={`${emergencies.length} active`}
          />
          {emergencies.map((item) => (
            <EmergencyCard key={item.id} item={item} />
          ))}
        </View>
      ) : (
        <EmptyState
          icon="shield-checkmark-outline"
          title="No active SOS alerts"
          sub={`None within ${radiusKm} km`}
        />
      );
    }

    if (activeTab === "Requests") {
      return requests.length > 0 ? (
        <View style={s.section}>
          <SectionHeader icon="hand-left-outline" label="HELP REQUESTS" />
          <View style={s.listCard}>
            {requests.map((item, i) => (
              <PostRow
                key={item.id}
                item={item}
                isLast={i === requests.length - 1}
              />
            ))}
          </View>
        </View>
      ) : (
        <EmptyState
          icon="chatbubble-ellipses-outline"
          title="No help requests nearby"
          sub={`None within ${radiusKm} km`}
        />
      );
    }

    if (activeTab === "Services") {
      return services.length > 0 ? (
        <View style={s.section}>
          <SectionHeader icon="construct-outline" label="COMMUNITY SERVICES" />
          <View style={s.listCard}>
            {services.map((item, i) => (
              <PostRow
                key={item.id}
                item={item}
                isLast={i === services.length - 1}
              />
            ))}
          </View>
        </View>
      ) : (
        <EmptyState
          icon="hammer-outline"
          title="No services nearby"
          sub={`None within ${radiusKm} km`}
        />
      );
    }

    if (activeTab === "Lost & Found") {
      return lostFound.length > 0 ? (
        <View style={s.section}>
          <SectionHeader
            icon="search-outline"
            label="LOST & FOUND"
            badgeBg="#FEF3C7"
          />
          <View style={s.listCard}>
            {lostFound.map((item, i) => (
              <PostRow
                key={item.id}
                item={item}
                isLast={i === lostFound.length - 1}
              />
            ))}
          </View>
        </View>
      ) : (
        <EmptyState
          icon="help-circle-outline"
          title="No lost & found posts"
          sub={`None within ${radiusKm} km`}
        />
      );
    }

    if (activeTab === "Recommendations") {
      return recommendations.length > 0 ? (
        <View style={s.section}>
          <SectionHeader
            icon="star-outline"
            label="RECOMMENDATIONS"
            badgeBg="#EEF2FF"
          />
          <View style={s.listCard}>
            {recommendations.map((item, i) => (
              <PostRow
                key={item.id}
                item={item}
                isLast={i === recommendations.length - 1}
              />
            ))}
          </View>
        </View>
      ) : (
        <EmptyState
          icon="star-outline"
          title="No recommendations nearby"
          sub={`None within ${radiusKm} km`}
        />
      );
    }
  };

  return (
    <View style={s.root}>
      <StatusBar barStyle="dark-content" backgroundColor={T.bg} />
      <SafeAreaView style={{ flex: 1 }} edges={["top"]}>
        {/* ── Header ── */}
        <View style={s.header}>
          <View style={s.headerLeft}>
            <View style={s.pinCircle}>
              <Ionicons name="location" size={17} color="#FFFFFF" />
            </View>
            <View style={{ marginLeft: 10, flex: 1 }}>
              <Text style={s.headerTitle} numberOfLines={1}>
                {areaName || "Nearby"}
              </Text>
              <Text style={s.headerSub}>
                Discover what's happening around you
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
          <Ionicons
            name="radio-outline"
            size={13}
            color={T.textSecondary}
            style={{ marginRight: 8 }}
          />
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
        </View>

        {/* ── Content ── */}
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={s.scroll}
          refreshControl={
            <RefreshControl
              refreshing={isLoading}
              onRefresh={() => {
                setIsLoading(true);
                setTimeout(() => setIsLoading(false), 600);
              }}
              colors={[T.primary]}
              tintColor={T.primary}
            />
          }
        >
          {renderSections()}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: T.bg },
  scroll: { paddingHorizontal: 16, paddingBottom: 110 },
  section: { marginBottom: 20 },
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
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    marginRight: 8,
  },
  pinCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: T.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    color: T.text,
    fontSize: 17,
    fontWeight: "800",
    letterSpacing: -0.3,
  },
  headerSub: { color: T.textSecondary, fontSize: 11, marginTop: 1 },
  headerRight: { flexDirection: "row", gap: 8 },
  circleBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: T.card,
    borderWidth: 1,
    borderColor: T.border,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  unreadDot: {
    position: "absolute",
    top: 9,
    right: 10,
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: T.primary,
    borderWidth: 1,
    borderColor: T.card,
  },

  // Section header
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  sectionLeft: { flexDirection: "row", alignItems: "center" },
  sectionLabel: {
    color: T.textSecondary,
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.8,
  },
  sectionBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 100 },
  sectionBadgeText: { color: "#FFFFFF", fontSize: 9, fontWeight: "800" },

  // Radius chips
  radiusRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 8,
    gap: 6,
  },
  radiusChip: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 100,
    borderWidth: 1,
    borderColor: T.border,
    backgroundColor: T.card,
  },
  radiusChipActive: { backgroundColor: T.text, borderColor: T.text },
  radiusChipText: { fontSize: 11, fontWeight: "700", color: T.textSecondary },

  // Location widget
  locWidget: {
    backgroundColor: "#1C1E21",
    borderRadius: 20,
    height: 130,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    position: "relative",
  },
  locPulseOuter: {
    position: "absolute",
    width: 90,
    height: 90,
    borderRadius: 45,
    borderWidth: 1,
    borderColor: "rgba(239,68,68,0.2)",
    backgroundColor: "rgba(239,68,68,0.05)",
  },
  locPulseInner: {
    position: "absolute",
    width: 54,
    height: 54,
    borderRadius: 27,
    borderWidth: 1,
    borderColor: "rgba(239,68,68,0.35)",
    backgroundColor: "rgba(239,68,68,0.1)",
  },
  locPinCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: T.primary,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: T.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },
  locBottomRow: {
    position: "absolute",
    bottom: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    width: "100%",
  },
  locNameBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.9)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 100,
    maxWidth: "65%",
  },
  locNameText: { color: T.text, fontSize: 11, fontWeight: "700" },
  locSosBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 100 },
  locSosText: { color: "#FFFFFF", fontSize: 10, fontWeight: "800" },
  locCoordsRow: {
    position: "absolute",
    top: 10,
    flexDirection: "row",
    alignItems: "center",
  },
  locCoordsText: {
    color: "rgba(255,255,255,0.4)",
    fontSize: 9,
    fontWeight: "600",
  },
  locDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: "rgba(255,255,255,0.25)",
    marginHorizontal: 6,
  },

  // Emergency card
  emergencyCard: {
    backgroundColor: "#111827",
    borderRadius: 20,
    padding: 16,
    marginBottom: 10,
    shadowColor: T.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 4,
  },
  emTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  emBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: T.primary,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 100,
  },
  emBadgeText: {
    color: "#FFFFFF",
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  emMeta: { color: "rgba(255,255,255,0.4)", fontSize: 11 },
  emTitle: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "800",
    lineHeight: 20,
    marginBottom: 14,
  },
  emFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  emResponders: { flexDirection: "row", alignItems: "center" },
  emRespondersText: {
    color: "rgba(255,255,255,0.45)",
    fontSize: 12,
    fontWeight: "500",
  },
  emActions: { flexDirection: "row", alignItems: "center", gap: 8 },
  emMapsBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.08)",
    alignItems: "center",
    justifyContent: "center",
  },
  emHelpBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: T.primary,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 100,
  },
  emHelpText: { color: "#FFFFFF", fontSize: 11, fontWeight: "700" },

  // Post row
  listCard: {
    backgroundColor: T.card,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: T.border,
    paddingHorizontal: 16,
    paddingVertical: 4,
  },
  postRow: { flexDirection: "row", alignItems: "center", paddingVertical: 13 },
  postDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 12,
    flexShrink: 0,
  },
  postContent: { flex: 1, marginRight: 10 },
  postTitle: { color: T.text, fontSize: 13, fontWeight: "700", lineHeight: 18 },
  postMeta: { flexDirection: "row", alignItems: "center", marginTop: 3 },
  postMetaText: { color: T.textSecondary, fontSize: 10 },
  metaDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: "#D1D5DB",
    marginHorizontal: 5,
  },
  postActions: { flexDirection: "row", alignItems: "center" },
  rowDivider: { height: 1, backgroundColor: "#F3F4F6" },

  // Empty state
  emptyWrap: {
    backgroundColor: T.card,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: T.border,
    paddingVertical: 40,
    paddingHorizontal: 24,
    alignItems: "center",
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
  loadingText: { color: T.textSecondary, fontSize: 13, marginTop: 8 },
});
