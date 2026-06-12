import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, StatusBar, Linking } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import BusinessService, { BusinessProfile } from "@/services/businessService";
import { AuthService } from "@/services/authService";
import { UserService } from "@/services/userService";
import { ChatService } from "@/services/chatService";
import { Alert } from "react-native";

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

  const handleChat = async () => {
    if (!business) return;
    const me = AuthService.getCurrentUser();
    if (!me) {
      Alert.alert('Error', 'You must be logged in to chat.');
      return;
    }
    
    if (me.uid === business.userId) {
      Alert.alert('Note', 'This is your own business profile.');
      return;
    }

    try {
      BusinessService.trackContactClick(id as string);
      const userProfile = await UserService.getOwnProfile(me.uid);
      const myName = userProfile?.name || me.displayName || "Neighbor";
      const chatId = await ChatService.createOrGetDmConversation(me.uid, business.userId, myName, business.businessName || "Business", "business");
      router.push(`/chat/${chatId}?name=${encodeURIComponent(business.businessName || "Business")}` as any);
    } catch (e: any) {
      console.error("Chat Error:", e);
      Alert.alert('Error', `Could not start chat: ${e.message || 'Unknown error'}`);
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
      <StatusBar barStyle="dark-content" backgroundColor="#F8F9FA" translucent={false} />
      
      <SafeAreaView style={{ flex: 1 }} edges={["top"]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.circleBtn}>
            <Ionicons name="arrow-back" size={24} color="#111827" />
          </TouchableOpacity>
          <View style={{ flex: 1 }} />
        </View>

        <ScrollView contentContainerStyle={styles.scroll}>
          {business.isPremium ? (
            <LinearGradient colors={["#FFFBEB", "#FEF3C7", "transparent"]} style={styles.profileHeader}>
              <View style={styles.badges}>
                <View style={[styles.badge, { backgroundColor: '#FDE68A', borderColor: '#FCD34D', borderWidth: 1 }]}>
                  <Ionicons name="star" size={12} color="#D97706" style={{ marginRight: 4 }} />
                  <Text style={[styles.badgeText, { color: '#B45309' }]}>PREMIUM PROVIDER</Text>
                </View>
                {business.isVerified && (
                  <View style={[styles.badge, { backgroundColor: '#D1FAE5', borderColor: '#A7F3D0', borderWidth: 1 }]}>
                    <Ionicons name="checkmark-circle" size={12} color="#059669" style={{ marginRight: 4 }} />
                    <Text style={[styles.badgeText, { color: '#059669' }]}>VERIFIED</Text>
                  </View>
                )}
              </View>
              <Text style={styles.name}>{business.businessName}</Text>
              <Text style={styles.category}>{business.category}</Text>
            </LinearGradient>
          ) : (
            <View style={styles.profileHeader}>
               <View style={styles.badges}>
                {business.isVerified && (
                  <View style={[styles.badge, { backgroundColor: '#D1FAE5', borderColor: '#A7F3D0', borderWidth: 1 }]}>
                    <Ionicons name="checkmark-circle" size={12} color="#059669" style={{ marginRight: 4 }} />
                    <Text style={[styles.badgeText, { color: '#059669' }]}>VERIFIED</Text>
                  </View>
                )}
              </View>
              <Text style={styles.name}>{business.businessName}</Text>
              <Text style={styles.category}>{business.category}</Text>
            </View>
          )}

          <View style={{ paddingHorizontal: 16 }}>
            <View style={styles.card}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                <Ionicons name="information-circle" size={20} color="#EF4444" style={{ marginRight: 8 }} />
                <Text style={styles.sectionTitle}>About Us</Text>
              </View>
              <Text style={styles.aboutText}>{business.description}</Text>
            </View>

            <View style={styles.card}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                <Ionicons name="location" size={20} color="#EF4444" style={{ marginRight: 8 }} />
                <Text style={styles.sectionTitle}>Contact & Location</Text>
              </View>
              
              <TouchableOpacity style={styles.contactRow} onPress={handleCall} activeOpacity={0.7}>
                <View style={styles.iconBox}>
                  <Ionicons name="call" size={18} color="#EF4444" />
                </View>
                <Text style={styles.contactText}>{business.phone}</Text>
                <Ionicons name="chevron-forward" size={16} color="#9CA3AF" />
              </TouchableOpacity>

              <View style={styles.contactRow}>
                <View style={styles.iconBox}>
                  <Ionicons name="map" size={18} color="#EF4444" />
                </View>
                <Text style={styles.contactText}>{business.address}</Text>
              </View>

              {business.website && (
                <TouchableOpacity style={styles.contactRow} onPress={handleWebsite} activeOpacity={0.7}>
                  <View style={styles.iconBox}>
                    <Ionicons name="globe" size={18} color="#EF4444" />
                  </View>
                  <Text style={styles.contactText}>{business.website}</Text>
                  <Ionicons name="open-outline" size={16} color="#9CA3AF" />
                </TouchableOpacity>
              )}
            </View>
            
            {business.userId === AuthService.getCurrentUser()?.uid && !business.isPremium && (
              <LinearGradient colors={["#FFFBEB", "#FEF3C7"]} style={styles.upgradeBox}>
                <View style={styles.upgradeIconBox}>
                  <Ionicons name="star" size={24} color="#D97706" />
                </View>
                <View style={{ flex: 1, marginLeft: 16 }}>
                  <Text style={styles.upgradeTitle}>Upgrade to Premium</Text>
                  <Text style={styles.upgradeSub}>Get featured placement and rank higher in local searches.</Text>
                  <TouchableOpacity 
                    style={styles.upgradeBtn}
                    onPress={() => router.push(`/businesses/premium?id=${business.id}&type=business` as any)}
                  >
                    <Text style={styles.upgradeBtnText}>See Benefits</Text>
                  </TouchableOpacity>
                </View>
              </LinearGradient>
            )}

            {business.userId === AuthService.getCurrentUser()?.uid && (
              <View style={styles.adminBox}>
                <Text style={styles.adminTitle}>Analytics (Beta)</Text>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 12 }}>
                  <View style={{ alignItems: 'center' }}>
                    <Text style={styles.adminStatVal}>{business.views || 0}</Text>
                    <Text style={styles.adminStatLabel}>Total Views</Text>
                  </View>
                  <View style={{ alignItems: 'center' }}>
                    <Text style={styles.adminStatVal}>{business.contactClicks || 0}</Text>
                    <Text style={styles.adminStatLabel}>Clicks</Text>
                  </View>
                </View>
              </View>
            )}
          </View>
        </ScrollView>

        {/* Footer Actions */}
        <View style={styles.footer}>
          <TouchableOpacity style={styles.actionBtnOutline} onPress={handleCall}>
            <Ionicons name="call" size={24} color="#EF4444" />
          </TouchableOpacity>
          <TouchableOpacity activeOpacity={0.8} style={{ flex: 1 }} onPress={handleChat}>
             <LinearGradient colors={["#EF4444", "#DC2626"]} style={styles.actionBtnSolid} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
              <Ionicons name="chatbubbles" size={20} color="#FFFFFF" style={{ marginRight: 8 }} />
              <Text style={{ color: '#FFFFFF', fontWeight: '800', fontSize: 16 }}>Message</Text>
             </LinearGradient>
          </TouchableOpacity>
        </View>
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
  header: { flexDirection: "row", paddingHorizontal: 16, paddingTop: 16 },
  circleBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: "#FFFFFF", alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "#E5E7EB" },
  scroll: { paddingBottom: 40 },
  profileHeader: { paddingHorizontal: 24, paddingBottom: 32, paddingTop: 16 },
  badges: { flexDirection: "row", gap: 8, marginBottom: 12 },
  badge: { flexDirection: "row", alignItems: "center", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 100 },
  badgeText: { fontSize: 10, fontWeight: "800", letterSpacing: 0.5 },
  name: { fontSize: 32, fontWeight: "800", color: "#111827", marginBottom: 4 },
  category: { fontSize: 16, color: "#EF4444", fontWeight: "600" },
  card: { backgroundColor: "#FFFFFF", borderRadius: 20, padding: 20, marginBottom: 16, borderWidth: 1, borderColor: "#E5E7EB", shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  sectionTitle: { fontSize: 18, fontWeight: "700", color: "#111827" },
  aboutText: { fontSize: 15, color: "#4B5563", lineHeight: 24 },
  contactRow: { flexDirection: "row", alignItems: "center", paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: "#F3F4F6" },
  iconBox: { width: 36, height: 36, borderRadius: 18, backgroundColor: "#FEE2E2", alignItems: "center", justifyContent: "center", marginRight: 12 },
  contactText: { flex: 1, fontSize: 15, color: "#374151", fontWeight: "500" },
  
  adminBox: { backgroundColor: "#ECFDF5", padding: 20, borderRadius: 20, marginTop: 8, borderWidth: 1, borderColor: "#A7F3D0" },
  adminTitle: { fontSize: 14, fontWeight: "800", color: "#059669", textTransform: "uppercase", letterSpacing: 1 },
  adminStatVal: { fontSize: 24, fontWeight: "800", color: "#111827" },
  adminStatLabel: { fontSize: 13, color: "#6B7280", marginTop: 2 },
  
  footer: { flexDirection: 'row', padding: 20, paddingBottom: 30, borderTopWidth: 1, borderTopColor: '#E5E7EB', backgroundColor: '#FFFFFF', gap: 12 },
  actionBtnOutline: { width: 56, height: 56, borderRadius: 28, borderWidth: 1, borderColor: '#FCA5A5', alignItems: 'center', justifyContent: 'center', backgroundColor: '#FEF2F2' },
  actionBtnSolid: { height: 56, borderRadius: 28, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', shadowColor: "#EF4444", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 },
  
  upgradeBox: { flexDirection: "row", padding: 20, borderRadius: 20, marginTop: 8, marginBottom: 16, borderWidth: 1, borderColor: "#FDE68A" },
  upgradeIconBox: { width: 48, height: 48, borderRadius: 24, backgroundColor: "#FFFFFF", alignItems: "center", justifyContent: "center" },
  upgradeTitle: { fontSize: 16, fontWeight: "800", color: "#B45309", marginBottom: 4 },
  upgradeSub: { fontSize: 13, color: "#92400E", marginBottom: 12, lineHeight: 18 },
  upgradeBtn: { backgroundColor: "#F59E0B", paddingVertical: 8, paddingHorizontal: 16, borderRadius: 100, alignSelf: "flex-start" },
  upgradeBtnText: { color: "#FFFFFF", fontSize: 13, fontWeight: "800" }
});
