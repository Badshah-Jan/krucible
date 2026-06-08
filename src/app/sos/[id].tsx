import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  ActivityIndicator,
  Alert,
  Linking,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, useLocalSearchParams } from "expo-router";
import { SosService, SOSType, SOSAlert } from "@/services/sosService";
import { AuthService } from "@/services/authService";
import { UserService } from "@/services/userService";
import { useAppStore } from "@/store/appStore";
import Animated, { SlideInDown, FadeIn } from "react-native-reanimated";

const EMERGENCY_TYPES: Record<SOSType, { icon: any; color: string }> = {
  "Medical Emergency": { icon: "medkit", color: "#EF4444" },
  "Accident": { icon: "car-sport", color: "#F97316" },
  "Fire Emergency": { icon: "flame", color: "#EA580C" },
  "Crime / Security Threat": { icon: "shield-half", color: "#1D4ED8" },
  "Missing Person": { icon: "search", color: "#8B5CF6" },
  "Women Safety": { icon: "woman", color: "#EC4899" },
  "Child Safety": { icon: "body", color: "#F43F5E" },
  "Vehicle Breakdown": { icon: "construct", color: "#F59E0B" },
  "Urgent Assistance": { icon: "alert-circle", color: "#06B6D4" },
  "Other Emergency": { icon: "warning", color: "#6B7280" },
};

export default function SOSDetailsScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [alertData, setAlertData] = useState<SOSAlert | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeLeft, setTimeLeft] = useState("");
  const coordinates = useAppStore(s => s.coordinates);
  
  const currentUser = AuthService.getCurrentUser();

  useEffect(() => {
    if (!id) return;
    const unsub = SosService.subscribeToSOS(id, (data) => {
      setAlertData(data);
      setLoading(false);
    });
    return () => unsub();
  }, [id]);

  useEffect(() => {
    const updateTime = () => {
      if (!alertData?.expiresAt) return;
      const exp = alertData.expiresAt.toDate ? alertData.expiresAt.toDate() : new Date(alertData.expiresAt);
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
    const timerId = setInterval(updateTime, 60000);
    return () => clearInterval(timerId);
  }, [alertData?.expiresAt]);

  const handleRespond = async () => {
    if (!alertData || !currentUser || !coordinates) return;
    try {
      const profile = await UserService.getUser(currentUser.uid);
      await SosService.respondToSOS(
        alertData.id!,
        currentUser.uid,
        profile?.name || "A Neighbor",
        coordinates.lat,
        coordinates.lng,
        alertData.location.lat,
        alertData.location.lng
      );
      Alert.alert("Response Sent", "You have been marked as responding.");
    } catch (error) {
      console.error(error);
      Alert.alert("Error", "Could not submit response. Please try again.");
    }
  };

  const openMap = () => {
    if (!alertData) return;
    const url = `https://www.google.com/maps/search/?api=1&query=${alertData.location.lat},${alertData.location.lng}`;
    Linking.openURL(url);
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#EF4444" />
      </View>
    );
  }

  if (!alertData) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>SOS Alert not found.</Text>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backBtnText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const typeData = EMERGENCY_TYPES[alertData.type] || EMERGENCY_TYPES["Other Emergency"];
  const isCreator = currentUser?.uid === alertData.creatorId;
  const isResponding = alertData.responderIds.includes(currentUser?.uid || "");
  const isActive = alertData.status === "active" || alertData.status === "responding";

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor="#000000" />
      <SafeAreaView style={{ flex: 1 }} edges={["top"]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.circleBtn}>
            <Ionicons name="close" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <View style={styles.headerTitleWrap}>
            {isActive && <View style={styles.pulsingDot} />}
            <Text style={styles.headerTitle}>{isActive ? "LIVE EMERGENCY" : "EMERGENCY RESOLVED"}</Text>
          </View>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView contentContainerStyle={styles.scroll}>
          <Animated.View entering={SlideInDown} style={[styles.radarCard, { borderColor: isActive ? typeData.color : "#4B5563" }]}>
            <View style={styles.radarCardTop}>
              <View style={[styles.radarIconBox, { backgroundColor: (isActive ? typeData.color : "#4B5563") + '26' }]}>
                <Ionicons name={typeData.icon} size={32} color={isActive ? typeData.color : "#9CA3AF"} />
              </View>
              <View style={{ flex: 1, marginLeft: 16 }}>
                <Text style={styles.radarType}>{alertData.type}</Text>
                <Text style={styles.radarCreator}>Reported by {alertData.creatorName}</Text>
                <Text style={styles.radarLocation}><Ionicons name="location" size={12} /> {alertData.location.area}</Text>
              </View>
            </View>

            <View style={styles.radarStats}>
              <View style={styles.radarStatCol}>
                <Text style={styles.radarStatVal}>{alertData.respondersCount}</Text>
                <Text style={styles.radarStatLbl}>Responders</Text>
              </View>
              <View style={styles.radarStatCol}>
                <Text style={styles.radarStatVal}>{alertData.radiusKm} km</Text>
                <Text style={styles.radarStatLbl}>Alert Radius</Text>
              </View>
              <View style={styles.radarStatCol}>
                <Text style={[styles.radarStatVal, !isActive && { color: "#9CA3AF" }]}>{isActive ? timeLeft : alertData.status}</Text>
                <Text style={styles.radarStatLbl}>Status</Text>
              </View>
            </View>
          </Animated.View>

          <View style={styles.actionsBox}>
             <TouchableOpacity style={styles.mapBtn} onPress={openMap}>
               <Ionicons name="map-outline" size={20} color="#FFFFFF" />
               <Text style={styles.mapBtnText}>OPEN IN MAPS</Text>
             </TouchableOpacity>

             {isActive && !isCreator && (
               <TouchableOpacity 
                 style={[styles.respondBtn, isResponding && styles.respondingBtn]} 
                 onPress={handleRespond}
                 disabled={isResponding}
               >
                 <Ionicons name={isResponding ? "checkmark-circle" : "hand-right"} size={20} color="#FFFFFF" />
                 <Text style={styles.respondBtnText}>{isResponding ? "YOU ARE RESPONDING" : "I CAN HELP"}</Text>
               </TouchableOpacity>
             )}
          </View>

          {alertData.respondersCount > 0 && (
            <Animated.View entering={FadeIn.delay(200)} style={styles.respondersList}>
              <Text style={styles.respondersTitle}>Responding Neighbors</Text>
              {Object.values(alertData.responders).map((r, i) => (
                <View key={i} style={styles.responderRow}>
                  <Ionicons name="person-circle" size={32} color="#9CA3AF" />
                  <View style={{ marginLeft: 12, flex: 1 }}>
                    <Text style={styles.responderName}>{r.name}</Text>
                    <Text style={styles.responderDist}>{r.distanceKm} km away</Text>
                  </View>
                </View>
              ))}
            </Animated.View>
          )}

        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#000000" },
  center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#000000" },
  errorText: { color: "#FFFFFF", fontSize: 16, marginBottom: 16 },
  backBtn: { padding: 12, backgroundColor: "#374151", borderRadius: 8 },
  backBtnText: { color: "#FFFFFF", fontWeight: "600" },
  
  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 16, paddingTop: 12, paddingBottom: 12,
    borderBottomWidth: 1, borderBottomColor: "#1F2937",
  },
  circleBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(255,255,255,0.1)", alignItems: "center", justifyContent: "center" },
  headerTitleWrap: { flexDirection: "row", alignItems: "center" },
  pulsingDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: "#EF4444", marginRight: 8 },
  headerTitle: { color: "#FFFFFF", fontSize: 13, fontWeight: "800", letterSpacing: 2 },
  
  scroll: { padding: 20 },
  
  radarCard: {
    backgroundColor: "#111827", borderRadius: 20, padding: 20,
    borderWidth: 2, marginBottom: 24,
  },
  radarCardTop: { flexDirection: "row", alignItems: "center", marginBottom: 24 },
  radarIconBox: { width: 64, height: 64, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  radarType: { color: "#FFFFFF", fontSize: 22, fontWeight: "800", marginBottom: 4 },
  radarCreator: { color: "#D1D5DB", fontSize: 14, marginBottom: 4 },
  radarLocation: { color: "#9CA3AF", fontSize: 14, fontWeight: "500" },
  
  radarStats: { flexDirection: "row", borderTopWidth: 1, borderTopColor: "#1F2937", paddingTop: 16 },
  radarStatCol: { flex: 1, alignItems: "center" },
  radarStatVal: { color: "#FFFFFF", fontSize: 20, fontWeight: "800" },
  radarStatLbl: { color: "#6B7280", fontSize: 11, fontWeight: "600", marginTop: 4, textTransform: "uppercase" },

  actionsBox: { gap: 12, marginBottom: 32 },
  mapBtn: {
    backgroundColor: "#374151", borderRadius: 100, paddingVertical: 16,
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
  },
  mapBtnText: { color: "#FFFFFF", fontSize: 15, fontWeight: "700", letterSpacing: 1 },
  respondBtn: {
    backgroundColor: "#EF4444", borderRadius: 100, paddingVertical: 18,
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
  },
  respondingBtn: { backgroundColor: "#10B981" },
  respondBtnText: { color: "#FFFFFF", fontSize: 16, fontWeight: "800", letterSpacing: 1 },

  respondersList: { backgroundColor: "#111827", borderRadius: 16, padding: 20, borderWidth: 1, borderColor: "#1F2937" },
  respondersTitle: { color: "#FFFFFF", fontSize: 16, fontWeight: "700", marginBottom: 16 },
  responderRow: { flexDirection: "row", alignItems: "center", marginBottom: 16 },
  responderName: { color: "#FFFFFF", fontSize: 16, fontWeight: "600" },
  responderDist: { color: "#9CA3AF", fontSize: 13, marginTop: 2 },
});
