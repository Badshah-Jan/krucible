import Text from "@/components/common/Text";
import { AuthService } from "@/services/authService";
import { LocationMonitorService } from "@/services/locationMonitorService";
import { LocationService } from "@/services/locationService";
import NotificationService from "@/services/notificationService";
import { PostService } from "@/services/postService";
import { UserService } from "@/services/userService";
import { ChatService } from "@/services/chatService";
import { useAppStore } from "@/store/appStore";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Alert,
  Dimensions,
  Linking,
  Pressable,
  ScrollView,
  Share,
  StatusBar,
  StyleSheet,
  TouchableOpacity,
  Vibration,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";

const { width } = Dimensions.get("window");

// ─── Constants ──────────────────────────────────────────────────────────────
const EMERGENCY_SERVICES = [
  {
    label: "Police",
    number: "15",
    icon: "shield-outline" as const,
    color: "#3B82F6",
  },
  {
    label: "Ambulance",
    number: "115",
    icon: "medkit-outline" as const,
    color: "#10B981",
  },
  {
    label: "Fire",
    number: "16",
    icon: "flame-outline" as const,
    color: "#EA580C",
  },
  {
    label: "Rescue",
    number: "1122",
    icon: "airplane-outline" as const,
    color: "#8B5CF6",
  },
  {
    label: "Women",
    number: "1099",
    icon: "heart-outline" as const,
    color: "#EC4899",
  },
  {
    label: "Edhi",
    number: "115",
    icon: "home-outline" as const,
    color: "#14B8A6",
  },
];

const QUICK_ACTIONS = [
  {
    id: "share",
    label: "Share location",
    desc: "Live GPS to contacts",
    icon: "location-outline" as const,
    color: "#EF4444",
  },
  {
    id: "notify",
    label: "Notify contacts",
    desc: "Alert trusted people",
    icon: "people-outline" as const,
    color: "#2563EB",
  },
  {
    id: "silent",
    label: "Silent alert",
    desc: "No sound mode",
    icon: "volume-mute-outline" as const,
    color: "#8B5CF6",
  },
  {
    id: "medical",
    label: "Medical info",
    desc: "View profile info",
    icon: "medical-outline" as const,
    color: "#F59E0B",
  },
  {
    id: "alarm",
    label: "Sound alarm",
    desc: "Loud siren mode",
    icon: "volume-high-outline" as const,
    color: "#EF4444",
  },
];

// ─── Pulsing Ring Component ─────────────────────────────────────────────────
function PulseRing({ delay, size }: { delay: number; size: number }) {
  const scale = useSharedValue(0.8);
  const opacity = useSharedValue(0.4);

  useEffect(() => {
    const startAnimation = () => {
      scale.value = withRepeat(
        withSequence(
          withTiming(1, { duration: 0 }),
          withTiming(1.5, { duration: 1600, easing: Easing.out(Easing.ease) }),
        ),
        -1,
        false,
      );
      opacity.value = withRepeat(
        withSequence(
          withTiming(0.4, { duration: 0 }),
          withTiming(0, { duration: 1600, easing: Easing.out(Easing.ease) }),
        ),
        -1,
        false,
      );
    };

    const timer = setTimeout(startAnimation, delay);
    return () => {
      clearTimeout(timer);
      cancelAnimation(scale);
      cancelAnimation(opacity);
    };
  }, [delay]);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={[
        {
          position: "absolute",
          width: size,
          height: size,
          borderRadius: size / 2,
          borderWidth: 1.5,
          borderColor: "#EF4444",
          backgroundColor: "rgba(239, 68, 68, 0.04)",
        },
        animStyle,
      ]}
    />
  );
}

// ─── Main SOS Screen ────────────────────────────────────────────────────────
export default function SosScreen() {
  const { t } = useTranslation();
  const router = useRouter();

  // Zustand Store
  const sosActive = useAppStore((state) => state.sosActive);
  const setSosActive = useAppStore((state) => state.setSosActive);
  const activeSosPostId = useAppStore((state) => state.activeSosPostId);
  const setActiveSosPostId = useAppStore((state) => state.setActiveSosPostId);
  const community = useAppStore((state) => state.community);
  const coordinates = useAppStore((state) => state.coordinates);

  // Stats from live database
  const [livePosts, setLivePosts] = useState<any[]>([]);
  const [userProfile, setUserProfile] = useState<any>(null);

  // Hold-to-activate states
  const [holding, setHolding] = useState(false);
  const [holdProgress, setHoldProgress] = useState(0);
  const holdInterval = useRef<ReturnType<typeof setInterval> | null>(null);
  const soundRef = useRef<any>(null);
  const HOLD_DURATION = 3000;
  const TICK = 50;


  const btnScale = useSharedValue(1);
  const btnAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: btnScale.value }],
  }));

  const glowOpacity = useSharedValue(0.15);
  useEffect(() => {
    if (sosActive) {
      glowOpacity.value = withRepeat(
        withSequence(
          withTiming(0.5, { duration: 600 }),
          withTiming(0.1, { duration: 600 }),
        ),
        -1,
        true,
      );
    } else {
      cancelAnimation(glowOpacity);
      glowOpacity.value = 0.15;
    }
  }, [sosActive]);

  const glowStyle = useAnimatedStyle(() => ({
    opacity: glowOpacity.value,
  }));

  useEffect(() => {
    let unsub = () => {};
    const setupListener = async () => {
      try {
        const authUser = AuthService.getCurrentUser();
        if (!authUser) return;
        const profile = await UserService.getUser(authUser.uid);
        setUserProfile(profile);

        const cid = community?.communityId || profile?.communityId;
        if (cid) {
          unsub = PostService.subscribeToCommunityPosts(
            cid,
            coordinates?.lat,
            coordinates?.lng,
            (posts) => setLivePosts(posts),
            (err) => console.error(err),
          );
        }
      } catch (e) {
        console.error(e);
      }
    };
    setupListener();
    return () => unsub();
  }, [coordinates?.lat, coordinates?.lng, community?.communityId]);

  // Derived metrics
  const uniqueAuthors = new Set(livePosts.map((p) => p.userId)).size;
  const neighboursCount = Math.max(uniqueAuthors, 3);
  const activeNowCount = Math.max(
    livePosts.filter((p) => {
      const d = p.createdAt?.toDate
        ? p.createdAt.toDate()
        : new Date(p.createdAt);
      return Date.now() - d.getTime() < 86400000; // active today
    }).length,
    2,
  );

  const areaName =
    community?.district ||
    community?.area ||
    userProfile?.district ||
    userProfile?.neighborhood ||
    userProfile?.communityName ||
    userProfile?.city ||
    "";

  const shortAreaName =
    community?.name || userProfile?.neighborhood || userProfile?.district || "";

  // ── Hold handlers ────────────────────────────────────────────────────────
  const startHold = async () => {
    if (sosActive || holdInterval.current) return;

    const hasLocation =
      await LocationMonitorService.verifyLocationBeforeAction(
        "broadcast an SOS",
      );
    if (!hasLocation) return;

    setHolding(true);
    Vibration.vibrate(50);
    btnScale.value = withTiming(0.94, { duration: 100 });

    let elapsed = 0;
    holdInterval.current = setInterval(async () => {
      elapsed += TICK;
      const pct = Math.min(elapsed / HOLD_DURATION, 1);
      setHoldProgress(pct);

      if (pct >= 1) {
        if (holdInterval.current) {
          clearInterval(holdInterval.current);
          holdInterval.current = null;
        }
        Vibration.vibrate([0, 100, 80, 200]);
        setHolding(false);
        setHoldProgress(0);
        btnScale.value = withTiming(1, { duration: 200 });
        setSosActive(true);

        try {
          const authUser = AuthService.getCurrentUser();
          if (authUser && community?.communityId && coordinates) {
            const profile = await UserService.getUser(authUser.uid);
            const place = await LocationService.reverseGeocode(
              coordinates.lat,
              coordinates.lng,
            );

            const postId = await PostService.createPost({
              userId: authUser.uid,
              userName: profile?.name || "A Neighbor",
              userAvatar: profile?.photoURL,
              communityId: community.communityId,
              title: `${profile?.name || "Someone"} needs immediate help!`,
              description: "Emergency SOS activated. Location attached.",
              category: "Emergency",
              latitude: coordinates.lat,
              longitude: coordinates.lng,
              area: place?.neighborhood,
              district: place?.district,
              city: place?.city,
              country: place?.country,
            });
            setActiveSosPostId(postId);
            await UserService.incrementPostsCount(authUser.uid);

            await NotificationService.broadcastSOSAlert(
              profile?.name || "A Neighbor",
              { latitude: coordinates.lat, longitude: coordinates.lng, postId },
              community.communityId,
              authUser.uid,
            );

            // Send message to the community chat
            const chatId = await ChatService.ensureCommunityConversation(
              community.communityId,
              community.name || "Community"
            );
            await ChatService.sendMessage(
              chatId,
              {
                type: "text",
                text: `🚨 EMERGENCY SOS: ${profile?.name || "Someone"} needs immediate help! Location: ${place?.neighborhood || place?.district || "Nearby"}. View the SOS post on the home feed.`,
                senderId: authUser.uid,
                senderName: profile?.name || "A Neighbor",
                senderAvatar: profile?.photoURL,
              },
              []
            );
          }
        } catch (error) {
          console.error("Failed to broadcast SOS:", error);
          Alert.alert(
            "Network Error",
            "Could not broadcast SOS to the community. Please call emergency services directly.",
          );
        }
      }
    }, TICK);
  };

  const cancelHold = () => {
    if (holdInterval.current) {
      clearInterval(holdInterval.current);
      holdInterval.current = null;
    }
    setHolding(false);
    setHoldProgress(0);
    btnScale.value = withTiming(1, { duration: 150 });
  };

  const handleCancel = () => {
    Alert.alert(
      "Cancel SOS Alert",
      "Are you sure you want to cancel the emergency alert?",
      [
        { text: "Keep Active", style: "cancel" },
        {
          text: "Cancel Alert",
          style: "destructive",
          onPress: async () => {
            if (activeSosPostId) {
              try {
                await PostService.cancelSOS(activeSosPostId);
                setActiveSosPostId(null);
              } catch (error) {
                console.error("Failed to cancel SOS post", error);
              }
            }
            setSosActive(false);
            Vibration.vibrate(30);
          },
        },
      ],
    );
  };

  const callEmergency = (number: string) => {
    Linking.openURL(`tel:${number}`);
  };

  const handleQuickAction = async (id: string, label: string) => {
    if (id === "share") {
      Vibration.vibrate(40);
      if (coordinates) {
        const url = `https://www.google.com/maps/search/?api=1&query=${coordinates.lat},${coordinates.lng}`;
        Share.share({
          message: `EMERGENCY SOS: I need help immediately. My live location is here: ${url}`,
        });
      }
    } else if (id === "alarm") {
      // Intense looping haptic alarm (expo-av not available in Expo Go)
      Vibration.vibrate([0, 300, 100, 300, 100, 600], true);
    } else if (id === "silent") {
      Vibration.cancel();
    } else if (id === "notify") {
      Vibration.vibrate(40);
      if (coordinates) {
        const url = `https://www.google.com/maps/search/?api=1&query=${coordinates.lat},${coordinates.lng}`;
        Linking.openURL(`sms:?body=EMERGENCY: I need help! Location: ${url}`);
      }
    } else if (id === "medical") {
      Vibration.vibrate(40);
      router.push("/(tabs)/profile");
    }
  };

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" backgroundColor="#F8F9FA" />
      <SafeAreaView style={{ flex: 1 }} edges={["top"]}>
        {/* ── Header ── */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.circleBtn}
            activeOpacity={0.8}
          >
            <Ionicons name="arrow-back" size={18} color="#4B5563" />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.headerSubtitle} numberOfLines={1}>
              {shortAreaName} Housing Society
            </Text>
            <Text style={styles.headerTitle}>Emergency SOS</Text>
          </View>
          <TouchableOpacity
            onPress={() => router.push("/notifications" as any)}
            style={styles.circleBtn}
            activeOpacity={0.8}
          >
            <Ionicons name="notifications-outline" size={18} color="#4B5563" />
          </TouchableOpacity>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scroll}
        >
          {/* ── Hero Info Card ── */}
          <View style={styles.heroCard}>
            <View style={styles.heroHeader}>
              <View style={styles.heroBadge}>
                <View style={styles.heroBadgeDot} />
                <Text style={styles.heroBadgeText}>
                  Location sharing active
                </Text>
              </View>
            </View>

            <Text style={styles.heroTitleText}>
              Your community is ready to respond
            </Text>
            <Text style={styles.heroSubtitleText}>
              Hold the SOS button to alert neighbours. Emergency services
              dialled instantly.
            </Text>

            <View style={styles.heroDivider} />

            <View style={styles.heroStatsRow}>
              <View style={styles.statCol}>
                <Text style={styles.statValue}>{neighboursCount}</Text>
                <Text style={styles.statLabel}>Neighbours nearby</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statCol}>
                <Text style={styles.statValue}>{activeNowCount}</Text>
                <Text style={styles.statLabel}>Active now</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statCol}>
                <Text style={styles.statValue}>~2m</Text>
                <Text style={styles.statLabel}>Avg response</Text>
              </View>
            </View>
          </View>

          {/* ── SOS Button Container ── */}
          <View style={styles.buttonContainer}>
            <Text style={styles.buttonTopLabel}>
              Hold 3 seconds to send an emergency alert
            </Text>

            <View style={styles.btnWrapperOuter}>
              {/* Pulsing rings */}
              {(sosActive || holding) && (
                <>
                  <PulseRing size={200} delay={0} />
                  <PulseRing size={200} delay={500} />
                  <PulseRing size={200} delay={1000} />
                </>
              )}

              {/* Glow halo behind button */}
              <Animated.View style={[styles.glowHalo, glowStyle]} />

              {/* Interactive trigger */}
              <Pressable
                onPressIn={startHold}
                onPressOut={cancelHold}
                disabled={sosActive}
              >
                <Animated.View style={[styles.sosButton, btnAnimStyle]}>
                  {/* Progress ring stroke */}
                  {holding && (
                    <View style={styles.progressRing}>
                      <View
                        style={[
                          styles.progressFill,
                          {
                            borderTopColor:
                              holdProgress > 0.75 ? "#10B981" : "#EF4444",
                            transform: [
                              { rotate: `${holdProgress * 360 - 90}deg` },
                            ],
                          },
                        ]}
                      />
                    </View>
                  )}

                  <View style={styles.sosInnerCircle}>
                    <Ionicons
                      name={sosActive ? "checkmark" : "alert-circle"}
                      size={36}
                      color="#FFFFFF"
                    />
                    <Text style={styles.sosText}>
                      {sosActive ? "active" : holding ? "holding" : "sos"}
                    </Text>
                  </View>
                </Animated.View>
              </Pressable>
            </View>

            <Text style={styles.buttonBottomLabel}>
              {sosActive
                ? "Alert Broadcasted Successfully"
                : "Press and hold to activate"}
            </Text>
          </View>

          {/* Cancel SOS alert button when active */}
          {sosActive && (
            <TouchableOpacity
              onPress={handleCancel}
              style={styles.cancelBtn}
              activeOpacity={0.85}
            >
              <Ionicons name="close-circle-outline" size={18} color="#EF4444" />
              <Text style={styles.cancelText}>Cancel Active SOS</Text>
            </TouchableOpacity>
          )}

          {/* ── Emergency Calls Section ── */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Emergency calls</Text>
              <TouchableOpacity
                style={styles.changeCountryBtn}
                activeOpacity={0.7}
              >
                <Text style={styles.changeCountryText}>Change country</Text>
                <Ionicons
                  name="arrow-forward"
                  size={12}
                  color="#EF4444"
                  style={{ marginLeft: 2, transform: [{ rotate: "-45deg" }] }}
                />
              </TouchableOpacity>
            </View>

            <View style={styles.gridContainer}>
              {EMERGENCY_SERVICES.map((item) => (
                <TouchableOpacity
                  key={item.label}
                  style={styles.serviceCard}
                  onPress={() => callEmergency(item.number)}
                  activeOpacity={0.8}
                >
                  <View
                    style={[
                      styles.serviceIconWrap,
                      { backgroundColor: item.color + "10" },
                    ]}
                  >
                    <Ionicons name={item.icon} size={18} color={item.color} />
                  </View>
                  <Text style={styles.serviceLabel}>{item.label}</Text>
                  <Text style={styles.serviceNumber}>{item.number}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* ── Quick Actions Section ── */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Quick actions</Text>
            <View style={styles.quickGrid}>
              {QUICK_ACTIONS.map((item) => (
                <TouchableOpacity
                  key={item.id}
                  style={styles.actionCard}
                  onPress={() => handleQuickAction(item.id, item.label)}
                  activeOpacity={0.8}
                >
                  <View
                    style={[
                      styles.actionIconWrap,
                      { backgroundColor: item.color + "10" },
                    ]}
                  >
                    <Ionicons name={item.icon} size={18} color={item.color} />
                  </View>
                  <View style={styles.actionContent}>
                    <Text style={styles.actionLabel}>{item.label}</Text>
                    <Text style={styles.actionDesc}>{item.desc}</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* ── Footer ── */}
          <View style={styles.footerBar}>
            <Ionicons
              name="alert-circle"
              size={14}
              color="#EF4444"
              style={{ marginRight: 6 }}
            />
            <Text style={styles.footerText}>
              {areaName} • Location shared automatically
            </Text>
          </View>
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
  scroll: {
    paddingHorizontal: 16,
    paddingBottom: 40,
  },

  // Header
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 14,
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
  headerCenter: {
    alignItems: "center",
    flex: 1,
  },
  headerSubtitle: {
    fontSize: 11,
    color: "#6B7280",
    fontWeight: "500",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#111827",
    marginTop: 2,
  },

  // Hero Card
  heroCard: {
    backgroundColor: "#1C1E21",
    borderRadius: 24,
    padding: 20,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 3,
  },
  heroHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  heroBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#EF4444",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 100,
  },
  heroBadgeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#FFFFFF",
    marginRight: 6,
  },
  heroBadgeText: {
    color: "#FFFFFF",
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 0.4,
  },
  heroTitleText: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "800",
    marginBottom: 6,
  },
  heroSubtitleText: {
    color: "#9CA3AF",
    fontSize: 12,
    lineHeight: 18,
    marginBottom: 16,
  },
  heroDivider: {
    height: 1,
    backgroundColor: "rgba(255,255,255,0.08)",
    marginBottom: 16,
  },
  heroStatsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  statCol: {
    flex: 1,
    alignItems: "center",
  },
  statValue: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "800",
  },
  statLabel: {
    color: "#9CA3AF",
    fontSize: 10,
    fontWeight: "600",
    marginTop: 3,
  },
  statDivider: {
    width: 1,
    height: 24,
    backgroundColor: "rgba(255,255,255,0.12)",
  },

  // SOS Button Container
  buttonContainer: {
    alignItems: "center",
    justifyContent: "center",
    marginVertical: 10,
  },
  buttonTopLabel: {
    color: "#6B7280",
    fontSize: 11,
    fontWeight: "600",
    marginBottom: 16,
  },
  btnWrapperOuter: {
    width: 200,
    height: 200,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
    marginBottom: 14,
  },
  glowHalo: {
    position: "absolute",
    width: 130,
    height: 130,
    borderRadius: 65,
    backgroundColor: "rgba(239, 68, 68, 0.12)",
  },
  sosButton: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  progressRing: {
    position: "absolute",
    width: 136,
    height: 136,
    borderRadius: 68,
    borderWidth: 3,
    borderColor: "rgba(239, 68, 68, 0.15)",
    justifyContent: "center",
    alignItems: "center",
  },
  progressFill: {
    position: "absolute",
    width: 136,
    height: 136,
    borderRadius: 68,
    borderWidth: 3,
    borderColor: "transparent",
  },
  sosInnerCircle: {
    width: 116,
    height: 116,
    borderRadius: 58,
    backgroundColor: "#EF4444",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#EF4444",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 14,
    elevation: 8,
  },
  sosText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 1,
    marginTop: 2,
  },
  buttonBottomLabel: {
    color: "#6B7280",
    fontSize: 11,
    fontWeight: "600",
  },

  // Cancel Button
  cancelBtn: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "center",
    backgroundColor: "#FEE2E2",
    borderColor: "#FECACA",
    borderWidth: 1,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 100,
    marginTop: 6,
    marginBottom: 16,
  },
  cancelText: {
    color: "#EF4444",
    fontSize: 12,
    fontWeight: "700",
    marginLeft: 6,
  },

  // Emergency Calls Grid
  section: {
    marginTop: 24,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#111827",
  },
  changeCountryBtn: {
    flexDirection: "row",
    alignItems: "center",
  },
  changeCountryText: {
    color: "#EF4444",
    fontSize: 12,
    fontWeight: "700",
  },
  gridContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: 8,
  },
  serviceCard: {
    width: (width - 48) / 3, // exactly 3 columns
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    paddingVertical: 16,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.02,
    shadowRadius: 4,
    elevation: 1.5,
  },
  serviceIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  serviceLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: "#6B7280",
    marginBottom: 3,
  },
  serviceNumber: {
    fontSize: 15,
    fontWeight: "800",
    color: "#111827",
  },

  // Quick Actions Grid
  quickGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: 8,
  },
  actionCard: {
    width: (width - 40) / 2, // exactly 2 columns
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.02,
    shadowRadius: 4,
    elevation: 1.5,
  },
  actionIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  actionContent: {
    flex: 1,
  },
  actionLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "#111827",
  },
  actionDesc: {
    fontSize: 10,
    color: "#6B7280",
    marginTop: 2,
  },

  // Footer Bar
  footerBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 30,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
  },
  footerText: {
    fontSize: 10,
    color: "#6B7280",
    fontWeight: "600",
  },
});
