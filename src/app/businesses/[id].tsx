import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, StatusBar, Linking } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import BusinessService, { BusinessProfile } from "@/services/businessService";

export default function BusinessProfileScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const [business, setBusiness] = useState<BusinessProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      loadBusiness(id as string);
      BusinessService.trackBusinessView(id as string);
    }
  }, [id]);

  const loadBusiness = async (businessId: string) => {
    try {
      const data = await BusinessService.getBusinessById(businessId);
      setBusiness(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleCall = () => {
    if (business?.phone) {
      BusinessService.trackContactClick(id as string);
      Linking.openURL(`tel:${business.phone}`);
    }
  };

  const handleWebsite = () => {
    if (business?.website) {
      BusinessService.trackContactClick(id as string);
      Linking.openURL(business.website);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#EF4444" />
      </View>
    );
  }

  if (!business) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>Business not found</Text>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor="#111827" />
      <SafeAreaView style={{ flex: 1, backgroundColor: "#111827" }} edges={["top"]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.circleBtn}>
            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <View style={{ flex: 1 }} />
        </View>

        <ScrollView contentContainerStyle={styles.scroll}>
          <View style={styles.profileHeader}>
            <View style={styles.badges}>
              {business.featured && (
                <View style={[styles.badge, { backgroundColor: '#F59E0B' }]}>
                  <Ionicons name="star" size={12} color="#FFFFFF" style={{ marginRight: 4 }} />
                  <Text style={styles.badgeText}>Featured Provider</Text>
                </View>
              )}
              {business.verified && (
                <View style={[styles.badge, { backgroundColor: '#10B981' }]}>
                  <Ionicons name="checkmark-circle" size={12} color="#FFFFFF" style={{ marginRight: 4 }} />
                  <Text style={styles.badgeText}>Verified Provider</Text>
                </View>
              )}
            </View>
            <Text style={styles.name}>{business.businessName}</Text>
            <Text style={styles.category}>{business.category}</Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.sectionTitle}>About Us</Text>
            <Text style={styles.aboutText}>{business.description}</Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Contact & Location</Text>
            
            <TouchableOpacity style={styles.contactRow} onPress={handleCall} activeOpacity={0.7}>
              <View style={styles.iconBox}>
                <Ionicons name="call" size={20} color="#EF4444" />
              </View>
              <Text style={styles.contactText}>{business.phone}</Text>
              <Ionicons name="chevron-forward" size={16} color="#9CA3AF" />
            </TouchableOpacity>

            <View style={styles.contactRow}>
              <View style={styles.iconBox}>
                <Ionicons name="location" size={20} color="#EF4444" />
              </View>
              <Text style={styles.contactText}>{business.address}</Text>
            </View>

            {business.website && (
              <TouchableOpacity style={styles.contactRow} onPress={handleWebsite} activeOpacity={0.7}>
                <View style={styles.iconBox}>
                  <Ionicons name="globe" size={20} color="#EF4444" />
                </View>
                <Text style={styles.contactText}>{business.website}</Text>
                <Ionicons name="open-outline" size={16} color="#9CA3AF" />
              </TouchableOpacity>
            )}
          </View>
          
          <View style={styles.adminBox}>
             <Text style={styles.adminTitle}>Analytics (Beta)</Text>
             <Text style={styles.adminStat}>Total Views: {business.views}</Text>
             <Text style={styles.adminStat}>Contact Clicks: {business.contactClicks}</Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#F8F9FA" },
  center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#F8F9FA" },
  errorText: { fontSize: 16, color: "#6B7280", marginBottom: 16 },
  backBtn: { padding: 12, backgroundColor: "#EF4444", borderRadius: 8 },
  backText: { color: "#FFFFFF", fontWeight: "600" },
  header: { flexDirection: "row", padding: 16, backgroundColor: "#111827" },
  circleBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(255,255,255,0.1)", alignItems: "center", justifyContent: "center" },
  scroll: { padding: 16, paddingBottom: 40 },
  profileHeader: { backgroundColor: "#111827", marginHorizontal: -16, marginTop: -16, paddingHorizontal: 16, paddingBottom: 32, paddingTop: 16, borderBottomLeftRadius: 24, borderBottomRightRadius: 24, marginBottom: 24 },
  badges: { flexDirection: "row", gap: 8, marginBottom: 12 },
  badge: { flexDirection: "row", alignItems: "center", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  badgeText: { fontSize: 12, fontWeight: "700", color: "#FFFFFF" },
  name: { fontSize: 28, fontWeight: "800", color: "#FFFFFF", marginBottom: 4 },
  category: { fontSize: 16, color: "#9CA3AF", fontWeight: "500" },
  card: { backgroundColor: "#FFFFFF", borderRadius: 16, padding: 20, marginBottom: 16, borderWidth: 1, borderColor: "#E5E7EB" },
  sectionTitle: { fontSize: 18, fontWeight: "700", color: "#111827", marginBottom: 12 },
  aboutText: { fontSize: 15, color: "#4B5563", lineHeight: 24 },
  contactRow: { flexDirection: "row", alignItems: "center", paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: "#F3F4F6" },
  iconBox: { width: 40, height: 40, borderRadius: 20, backgroundColor: "#FEF2F2", alignItems: "center", justifyContent: "center", marginRight: 12 },
  contactText: { flex: 1, fontSize: 15, color: "#374151", fontWeight: "500" },
  adminBox: { backgroundColor: "#F3F4F6", padding: 16, borderRadius: 12, marginTop: 16 },
  adminTitle: { fontSize: 14, fontWeight: "700", color: "#6B7280", marginBottom: 8 },
  adminStat: { fontSize: 13, color: "#4B5563" },
});
