import { AuthService } from "@/services/authService";
import { LocationService } from "@/services/locationService";
import { SOSAlert, SOSType, SosService } from "@/services/sosService";
import { UserService } from "@/services/userService";
import { useAppStore } from "@/store/appStore";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from "react-native";
import Animated, {
    FadeInDown,
    SlideInDown
} from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";

const EMERGENCY_TYPES: { type: SOSType; icon: any; color: string }[] = [
  { type: "Medical Emergency", icon: "medkit", color: "#EF4444" },
  { type: "Accident", icon: "car-sport", color: "#F97316" },
  { type: "Fire Emergency", icon: "flame", color: "#EA580C" },
  { type: "Crime / Security Threat", icon: "shield-half", color: "#3B82F6" },
  { type: "Missing Person", icon: "search", color: "#8B5CF6" },
  { type: "Women Safety", icon: "woman", color: "#EC4899" },
  { type: "Child Safety", icon: "body", color: "#F43F5E" },
  { type: "Vehicle Breakdown", icon: "construct", color: "#F59E0B" },
  { type: "Urgent Assistance", icon: "alert-circle", color: "#06B6D4" },
  { type: "Other Emergency", icon: "warning", color: "#9CA3AF" },
];

const RADIUS_OPTIONS = [
  { label: "500m", value: 0.5 },
  { label: "1 km", value: 1 },
  { label: "2 km", value: 2 },
  { label: "5 km", value: 5 },
];

export default function SOSScreen() {
  const router = useRouter();
  const community = useAppStore((s) => s.community);
  const coordinates = useAppStore((s) => s.coordinates);

  const [activeAlert, setActiveAlert] = useState<SOSAlert | null>(null);
  const [loading, setLoading] = useState(true);

  // Creation State
  const [selectedType, setSelectedType] = useState<SOSType | null>(null);
  const [selectedRadius, setSelectedRadius] = useState<number>(2);
  const [isCreating, setIsCreating] = useState(false);

  // Load Active SOS if any
  useEffect(() => {
    let unsub = () => {};
    const checkActiveSOS = async () => {
      const user = AuthService.getCurrentUser();
      if (!user || !community?.communityId) {
        setLoading(false);
        return;
      }
      unsub = SosService.subscribeToActiveSOS(community.communityId, (alerts) => {
        const myActive = alerts.find(a => a.creatorId === user.uid && a.status === 'active');
        setActiveAlert(myActive || null);
        setLoading(false);
      });
    };
    checkActiveSOS();
    return () => unsub();
  }, [community?.communityId]);

  const handleCreateSOS = async () => {
    if (!selectedType) return;
    
    setIsCreating(true);
    try {
      const user = AuthService.getCurrentUser();
      if (!user) throw new Error("Not authenticated");
      const profile = await UserService.getOwnProfile(user.uid);
      
      const activeCommunityId = community?.communityId || profile?.communityId;
      if (!activeCommunityId) throw new Error("Could not determine your community. Please restart the app.");
      
      let lat = coordinates?.lat || profile?.latitude;
      let lng = coordinates?.lng || profile?.longitude;
      
      if (!lat || !lng) {
         throw new Error("Could not determine your GPS location. Please ensure location services are enabled.");
      }
      const place = await LocationService.reverseGeocode(lat, lng);

      await SosService.createSOS({
        creatorId: user.uid,
        creatorName: profile?.name || "A Neighbor",
        communityId: activeCommunityId,
        type: selectedType,
        location: {
          lat: lat,
          lng: lng,
          area: place?.neighborhood || profile?.area || "Unknown Area",
          city: place?.city || profile?.city || "Unknown City",
        },
        radiusKm: selectedRadius,
      });

      setSelectedType(null);
    } catch (error) {
      console.error(error);
      Alert.alert("Error", error instanceof Error ? error.message : "Could not create SOS. Check your connection.");
    } finally {
      setIsCreating(false);
    }
  };

  const handleResolve = () => {
    Alert.alert(
      "Resolve Emergency",
      "Are you sure this emergency is resolved? This will notify responders.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Mark Resolved",
          style: "default",
          onPress: async () => {
            if (activeAlert?.id) await SosService.resolveSOS(activeAlert.id);
          },
        },
      ],
    );
  };

  const handleCancel = () => {
    Alert.alert(
      "Cancel Emergency",
      "Cancel this alert? Use this if created by mistake.",
      [
        { text: "Keep Active", style: "cancel" },
        {
          text: "Cancel SOS",
          style: "destructive",
          onPress: async () => {
            if (activeAlert?.id) await SosService.cancelSOS(activeAlert.id);
          },
        },
      ],
    );
  };

  // ─── UI Rendering ────────────────────────────────────────────────────────
  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#EF4444" />
      </View>
    );
  }

  if (activeAlert) {
    return (
      <ActiveRadar
        alert={activeAlert}
        onResolve={handleResolve}
        onCancel={handleCancel}
      />
    );
  }

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor="#111827" />
      <SafeAreaView style={{ flex: 1 }} edges={["top"]}>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.circleBtn}
          >
            <Ionicons name="close" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Emergency SOS</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView contentContainerStyle={styles.scroll}>
          <Text style={styles.heroTitle}>What is the emergency?</Text>
          
          <View style={styles.grid}>
            {EMERGENCY_TYPES.map((et) => {
              const isSelected = selectedType === et.type;
              return (
                <TouchableOpacity
                  key={et.type}
                  style={[
                    styles.typeCard, 
                    isSelected && { backgroundColor: et.color, borderColor: et.color }
                  ]}
                  onPress={() => setSelectedType(et.type)}
                  activeOpacity={0.8}
                >
                  <View style={[styles.iconWrap, isSelected && { backgroundColor: '#FFFFFF33' }]}>
                    <Ionicons name={et.icon} size={22} color={isSelected ? '#FFFFFF' : et.color} />
                  </View>
                  <Text style={[styles.typeText, isSelected && { color: '#FFFFFF', fontWeight: '800' }]} numberOfLines={2}>{et.type}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {selectedType && (
            <Animated.View entering={FadeInDown} style={styles.radiusSection}>
              {(() => {
                const typeDataForColor = EMERGENCY_TYPES.find(t => t.type === selectedType) || EMERGENCY_TYPES[9];
                return (
                  <>
                    <Text style={styles.sectionTitle}>Alert Radius</Text>
                    <Text style={styles.sectionSub}>Neighbors within this distance will receive a loud critical alert.</Text>
                    
                    <View style={styles.radiusRow}>
                      {RADIUS_OPTIONS.map((ro) => {
                        const isSel = selectedRadius === ro.value;
                        return (
                          <TouchableOpacity
                            key={ro.label}
                            style={[
                              styles.radiusBtn, 
                              isSel && { backgroundColor: typeDataForColor.color, borderColor: typeDataForColor.color }
                            ]}
                            onPress={() => setSelectedRadius(ro.value)}
                          >
                            <Text style={[styles.radiusText, isSel && styles.radiusTextActive]}>{ro.label}</Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>

                    <TouchableOpacity 
                      style={[
                        styles.broadcastBtn, 
                        { backgroundColor: typeDataForColor.color },
                        isCreating && { opacity: 0.7 }
                      ]} 
                      onPress={handleCreateSOS}
                      disabled={isCreating}
                      activeOpacity={0.8}
                    >
                      {isCreating ? <ActivityIndicator color="#FFFFFF" size="small" /> : (
                        <>
                          <Ionicons name="alert-circle" size={24} color="#FFFFFF" />
                          <Text style={styles.broadcastBtnText}>BROADCAST SOS</Text>
                        </>
                      )}
                    </TouchableOpacity>
                  </>
                );
              })()}
            </Animated.View>
          )}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

function ActiveRadar({
  alert,
  onResolve,
  onCancel,
}: {
  alert: SOSAlert;
  onResolve: () => void;
  onCancel: () => void;
}) {
  const [timeLeft, setTimeLeft] = useState("");

  useEffect(() => {
    const updateTime = () => {
      if (!alert.expiresAt) return;
      const exp = alert.expiresAt.toDate
        ? alert.expiresAt.toDate()
        : new Date(alert.expiresAt);
      const diff = exp.getTime() - Date.now();
      if (diff <= 0) {
        setTimeLeft("Expired");
        return;
      }
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      setTimeLeft(`${h}h ${m}m Remaining`);
    };
    updateTime();
    const id = setInterval(updateTime, 60000);
    return () => clearInterval(id);
  }, [alert.expiresAt]);

  const typeData =
    EMERGENCY_TYPES.find((t) => t.type === alert.type) || EMERGENCY_TYPES[9];

  return (
    <View style={[styles.root, { backgroundColor: "#000000" }]}>
      <StatusBar barStyle="light-content" backgroundColor="#000000" />
      <SafeAreaView style={{ flex: 1 }}>
        <View style={styles.radarHeader}>
          <View style={styles.pulsingDot} />
          <Text style={styles.radarHeaderText}>LIVE EMERGENCY RADAR</Text>
        </View>

        <ScrollView contentContainerStyle={styles.radarScroll}>
          <Animated.View
            entering={SlideInDown}
            style={[styles.radarCard, { borderColor: typeData.color }]}
          >
            <View style={styles.radarCardTop}>
              <View
                style={[
                  styles.radarIconBox,
                  { backgroundColor: typeData.color + "26" },
                ]}
              >
                <Ionicons
                  name={typeData.icon}
                  size={32}
                  color={typeData.color}
                />
              </View>
              <View style={{ flex: 1, marginLeft: 16 }}>
                <Text style={styles.radarType}>{alert.type}</Text>
                <Text style={styles.radarLocation}>
                  <Ionicons name="location" size={12} /> {alert.location.area}
                </Text>
              </View>
            </View>

            <View style={styles.radarStats}>
              <View style={styles.radarStatCol}>
                <Text style={styles.radarStatVal}>{alert.respondersCount}</Text>
                <Text style={styles.radarStatLbl}>Responders</Text>
              </View>
              <View style={styles.radarStatCol}>
                <Text style={styles.radarStatVal}>{alert.radiusKm} km</Text>
                <Text style={styles.radarStatLbl}>Alert Radius</Text>
              </View>
              <View style={styles.radarStatCol}>
                <Text style={styles.radarStatVal}>{timeLeft}</Text>
                <Text style={styles.radarStatLbl}>Time Left</Text>
              </View>
            </View>

            {alert.respondersCount > 0 && (
              <View style={styles.respondersList}>
                <Text style={styles.respondersTitle}>Responding Neighbors</Text>
                {Object.values(alert.responders).map((r, i) => (
                  <View key={i} style={styles.responderRow}>
                    <Ionicons name="person-circle" size={24} color="#9CA3AF" />
                    <Text style={styles.responderName}>{r.name}</Text>
                    <Text style={styles.responderDist}>
                      {r.distanceKm} km away
                    </Text>
                  </View>
                ))}
              </View>
            )}
          </Animated.View>

          <TouchableOpacity
            style={[styles.resolveBtn, { backgroundColor: "#10B981" }]}
            onPress={onResolve}
          >
            <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" />
            <Text style={styles.resolveBtnText}>MARK AS RESOLVED</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.cancelLink} onPress={onCancel}>
            <Text style={styles.cancelLinkText}>Cancel SOS (False Alarm)</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#111827" },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#111827",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
  },
  circleBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: { color: "#FFFFFF", fontSize: 18, fontWeight: "700" },
  scroll: { padding: 20, paddingBottom: 60 },
  heroTitle: {
    color: "#FFFFFF",
    fontSize: 28,
    fontWeight: "800",
    marginBottom: 24,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: 8,
  },
  typeCard: {
    width: "31%", // 3 columns
    backgroundColor: "#1F2937",
    borderRadius: 16,
    padding: 12,
    alignItems: "center",
    borderWidth: 2,
    borderColor: "transparent",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    marginBottom: 4,
  },
  iconWrap: {
    width: 44, height: 44, borderRadius: 22,
    alignItems: "center", justifyContent: "center",
    marginBottom: 8,
    backgroundColor: "#111827", // Darker contrast
  },
  typeText: { color: "#D1D5DB", fontSize: 11, fontWeight: "600", textAlign: "center", minHeight: 30 },

  radiusSection: { marginTop: 24 },
  sectionTitle: { color: "#FFFFFF", fontSize: 18, fontWeight: "800", marginBottom: 4 },
  sectionSub: { color: "#9CA3AF", fontSize: 13, marginBottom: 16 },
  radiusRow: { flexDirection: "row", gap: 8, marginBottom: 24 },
  radiusBtn: {
    flex: 1, paddingVertical: 10, borderRadius: 10,
    backgroundColor: "#1F2937", alignItems: "center",
    borderWidth: 1.5, borderColor: "#374151"
  },
  radiusText: { color: "#D1D5DB", fontWeight: "700", fontSize: 13 },
  radiusTextActive: { color: "#FFFFFF" },

  broadcastBtn: {
    backgroundColor: "#EF4444",
    borderRadius: 16,
    paddingVertical: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    shadowColor: "#EF4444",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  broadcastBtnText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "800",
    letterSpacing: 0.5,
  },

  // Active Radar Styles
  radarHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#1F2937",
  },
  pulsingDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#EF4444",
    marginRight: 8,
  },
  radarHeaderText: {
    color: "#EF4444",
    fontSize: 13,
    fontWeight: "800",
    letterSpacing: 2,
  },
  radarScroll: { padding: 20 },
  radarCard: {
    backgroundColor: "#111827",
    borderRadius: 20,
    padding: 20,
    borderWidth: 2,
    marginBottom: 24,
  },
  radarCardTop: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 24,
  },
  radarIconBox: {
    width: 64,
    height: 64,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  radarType: {
    color: "#FFFFFF",
    fontSize: 22,
    fontWeight: "800",
    marginBottom: 4,
  },
  radarLocation: { color: "#9CA3AF", fontSize: 14, fontWeight: "500" },
  radarStats: {
    flexDirection: "row",
    borderTopWidth: 1,
    borderTopColor: "#1F2937",
    paddingTop: 16,
  },
  radarStatCol: { flex: 1, alignItems: "center" },
  radarStatVal: { color: "#FFFFFF", fontSize: 20, fontWeight: "800" },
  radarStatLbl: {
    color: "#6B7280",
    fontSize: 11,
    fontWeight: "600",
    marginTop: 4,
    textTransform: "uppercase",
  },

  respondersList: {
    marginTop: 24,
    borderTopWidth: 1,
    borderTopColor: "#1F2937",
    paddingTop: 16,
  },
  respondersTitle: {
    color: "#D1D5DB",
    fontSize: 13,
    fontWeight: "700",
    marginBottom: 12,
  },
  responderRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  responderName: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "600",
    marginLeft: 12,
    flex: 1,
  },
  responderDist: { color: "#9CA3AF", fontSize: 13 },

  resolveBtn: {
    borderRadius: 100,
    paddingVertical: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginBottom: 16,
  },
  resolveBtnText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "800",
    letterSpacing: 1,
  },
  cancelLink: { alignItems: "center", paddingVertical: 12 },
  cancelLinkText: {
    color: "#6B7280",
    fontSize: 14,
    fontWeight: "600",
    textDecorationLine: "underline",
  },
});
