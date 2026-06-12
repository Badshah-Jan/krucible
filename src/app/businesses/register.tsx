import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, Alert, KeyboardAvoidingView, Platform, StatusBar } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import Animated, { FadeInDown, FadeInUp } from "react-native-reanimated";
import BusinessService, { BUSINESS_CATEGORIES } from "@/services/businessService";
import { useAppStore } from "@/store/appStore";
import { AuthService } from "@/services/authService";
import { UserService, UserProfile } from "@/services/userService";

export default function RegisterBusinessScreen() {
  const router = useRouter();
  const community = useAppStore(s => s.community);
  const coordinates = useAppStore(s => s.coordinates);
  
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    businessName: "",
    category: BUSINESS_CATEGORIES[0],
    description: "",
    address: "",
    phone: "",
    website: "",
  });
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);

  useEffect(() => {
    const fetchUser = async () => {
      const user = AuthService.getCurrentUser();
      if (!user) {
        setProfileLoading(false);
        return;
      }
      try {
        const profile = await UserService.getOwnProfile(user.uid);
        setUserProfile(profile);
      } catch (err) {
        console.error("Failed to fetch user profile:", err);
      } finally {
        setProfileLoading(false);
      }
    };
    fetchUser();
  }, []);

  const handleRegister = async () => {
    if (!form.businessName || !form.phone || !form.address || !form.description) {
      Alert.alert("Missing Fields", "Please fill in all required fields.");
      return;
    }

    const user = AuthService.getCurrentUser();
    if (!user || !community?.communityId) {
      Alert.alert("Error", "You must be logged into a community.");
      return;
    }

    setLoading(true);
    try {
      await BusinessService.registerBusiness({
        userId: user.uid,
        communityId: community.communityId,
        businessName: form.businessName,
        category: form.category,
        description: form.description,
        address: form.address,
        phone: form.phone,
        website: form.website,
        location: {
          lat: coordinates?.lat || 0,
          lng: coordinates?.lng || 0,
        }
      });
      
      Alert.alert("Success", "Your business has been registered successfully!", [
        { text: "OK", onPress: () => router.back() }
      ]);
    } catch (error) {
      console.error(error);
      Alert.alert("Error", "Failed to register business.");
    } finally {
      setLoading(false);
    }
  };

  if (profileLoading) {
    return (
      <SafeAreaView style={[styles.root, { alignItems: "center", justifyContent: "center" }]}>
        <ActivityIndicator size="large" color="#EF4444" />
      </SafeAreaView>
    );
  }

  // Removing the premium requirement blocker so any user can register a business for free
  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <SafeAreaView style={styles.root} edges={["top"]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color="#111827" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Register Business</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView contentContainerStyle={styles.scroll}>
          <Text style={styles.sectionTitle}>Business Details</Text>
          
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Business Name *</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Neighborly Cafe"
              placeholderTextColor="#9CA3AF"
              value={form.businessName}
              onChangeText={(text) => setForm({ ...form, businessName: text })}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Category *</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -16 }}>
              <View style={{ width: 16 }} />
              {BUSINESS_CATEGORIES.map(cat => (
                <TouchableOpacity
                  key={cat}
                  style={[styles.catChip, form.category === cat && styles.catChipActive]}
                  onPress={() => setForm({ ...form, category: cat })}
                >
                  <Text style={[styles.catText, form.category === cat && styles.catTextActive]}>{cat}</Text>
                </TouchableOpacity>
              ))}
              <View style={{ width: 16 }} />
            </ScrollView>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Description *</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Tell the community about your business..."
              placeholderTextColor="#9CA3AF"
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              value={form.description}
              onChangeText={(text) => setForm({ ...form, description: text })}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Business Address *</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. 123 Main Street"
              placeholderTextColor="#9CA3AF"
              value={form.address}
              onChangeText={(text) => setForm({ ...form, address: text })}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Contact Phone *</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. +1 234 567 8900"
              placeholderTextColor="#9CA3AF"
              keyboardType="phone-pad"
              value={form.phone}
              onChangeText={(text) => setForm({ ...form, phone: text })}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Website (Optional)</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. https://mybusiness.com"
              placeholderTextColor="#9CA3AF"
              keyboardType="url"
              autoCapitalize="none"
              value={form.website}
              onChangeText={(text) => setForm({ ...form, website: text })}
            />
          </View>
          
          <View style={styles.infoBox}>
            <Ionicons name="information-circle" size={20} color="#3B82F6" />
            <Text style={styles.infoText}>
              By registering your business, neighbors will be able to easily find your location and contact details. In the future, you will be able to verify your business and run sponsored local promotions.
            </Text>
          </View>

        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity 
            style={[styles.submitBtn, loading && { opacity: 0.7 }]} 
            onPress={handleRegister}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.submitBtnText}>Register Business</Text>
            )}
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#F8F9FA" },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 16, borderBottomWidth: 1, borderBottomColor: "#E5E7EB", backgroundColor: "#FFFFFF" },
  backBtn: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  headerTitle: { fontSize: 18, fontWeight: "700", color: "#111827" },
  scroll: { padding: 16, paddingBottom: 40 },
  sectionTitle: { fontSize: 20, fontWeight: "800", color: "#111827", marginBottom: 20 },
  inputGroup: { marginBottom: 20 },
  label: { fontSize: 14, fontWeight: "600", color: "#374151", marginBottom: 8 },
  input: { backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "#D1D5DB", borderRadius: 12, paddingHorizontal: 16, height: 52, fontSize: 15, color: "#111827" },
  textArea: { height: 100, paddingTop: 16 },
  catChip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "#D1D5DB", marginRight: 8 },
  catChipActive: { backgroundColor: "#EF4444", borderColor: "#EF4444" },
  catText: { fontSize: 14, fontWeight: "500", color: "#6B7280" },
  catTextActive: { color: "#FFFFFF", fontWeight: "700" },
  infoBox: { flexDirection: "row", backgroundColor: "#EFF6FF", padding: 16, borderRadius: 12, marginTop: 8 },
  infoText: { flex: 1, fontSize: 13, color: "#1E3A8A", marginLeft: 12, lineHeight: 20 },
  footer: { padding: 16, backgroundColor: "#FFFFFF", borderTopWidth: 1, borderTopColor: "#E5E7EB" },
  submitBtn: { backgroundColor: "#EF4444", height: 56, borderRadius: 16, alignItems: "center", justifyContent: "center", shadowColor: "#EF4444", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 },
  submitBtnText: { color: "#FFFFFF", fontSize: 16, fontWeight: "700" },

  // Premium UI Styles
  premiumHeader: { flexDirection: "row", paddingHorizontal: 20, paddingTop: 10, justifyContent: "flex-end" },
  premiumBackBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(255,255,255,0.1)", alignItems: "center", justifyContent: "center" },
  premiumScroll: { flexGrow: 1, paddingHorizontal: 24, paddingBottom: 40 },
  premiumHero: { alignItems: "center", marginTop: 20 },
  premiumIconBg: { width: 100, height: 100, borderRadius: 32, alignItems: "center", justifyContent: "center", marginBottom: 24, shadowColor: "#6366F1", shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.5, shadowRadius: 20, elevation: 10 },
  premiumBadge: { flexDirection: "row", alignItems: "center", backgroundColor: "rgba(245, 158, 11, 0.2)", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 100, marginBottom: 16, borderWidth: 1, borderColor: "rgba(245, 158, 11, 0.3)" },
  premiumBadgeText: { color: "#F59E0B", fontSize: 12, fontWeight: "700", marginLeft: 6, textTransform: "uppercase", letterSpacing: 0.5 },
  premiumTitle: { fontSize: 32, fontWeight: "800", color: "#FFFFFF", marginBottom: 12, textAlign: "center" },
  premiumSubtitle: { fontSize: 16, color: "#94A3B8", textAlign: "center", lineHeight: 24, paddingHorizontal: 10 },
  
  benefitsContainer: { marginTop: 40, backgroundColor: "rgba(255,255,255,0.03)", borderRadius: 24, padding: 24, borderWidth: 1, borderColor: "rgba(255,255,255,0.05)" },
  benefitRow: { flexDirection: "row", alignItems: "flex-start", marginBottom: 24 },
  benefitIcon: { width: 28, height: 28, borderRadius: 14, backgroundColor: "rgba(16, 185, 129, 0.2)", alignItems: "center", justifyContent: "center", marginRight: 16, marginTop: 2 },
  benefitTitle: { fontSize: 16, fontWeight: "700", color: "#F8FAFC", marginBottom: 4 },
  benefitDesc: { fontSize: 14, color: "#94A3B8", lineHeight: 20 },
  
  premiumFooter: { paddingHorizontal: 24, paddingBottom: Platform.OS === 'ios' ? 10 : 24, paddingTop: 20, borderTopWidth: 1, borderTopColor: "rgba(255,255,255,0.05)", backgroundColor: "rgba(2, 6, 23, 0.8)" },
  premiumCancelText: { color: "#64748B", fontSize: 13, textAlign: "center", marginBottom: 16 },
  premiumBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", paddingVertical: 18, borderRadius: 100, shadowColor: "#4F46E5", shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.4, shadowRadius: 15, elevation: 8 },
  premiumBtnText: { color: "#FFFFFF", fontSize: 18, fontWeight: "800", marginRight: 8 },
});
