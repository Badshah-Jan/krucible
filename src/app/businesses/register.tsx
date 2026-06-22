import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, Alert, KeyboardAvoidingView, Platform, StatusBar } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import BusinessService, { BUSINESS_CATEGORIES } from "@/services/businessService";
import { useAppStore } from "@/store/appStore";
import { AuthService } from "@/services/authService";
import { UserService } from "@/services/userService";

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
  const [profileLoading, setProfileLoading] = useState(true);

  useEffect(() => {
    const fetchUser = async () => {
      const user = AuthService.getCurrentUser();
      if (!user) {
        setProfileLoading(false);
        return;
      }
      try {
        await UserService.getOwnProfile(user.uid);
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
      
      Alert.alert("Success", "Your business has been listed successfully!", [
        { text: "Done", onPress: () => router.back() }
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
      <View style={[styles.root, { alignItems: "center", justifyContent: "center" }]}>
        <ActivityIndicator size="large" color="#4F46E5" />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <SafeAreaView style={styles.root} edges={["top"]}>
        <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
        
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color="#18181B" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>List a Business</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <View style={styles.heroSection}>
            <View style={styles.iconCircle}>
              <Ionicons name="storefront" size={28} color="#4F46E5" />
            </View>
            <View style={styles.heroTextContainer}>
              <Text style={styles.heroTitle}>Grow Your Business</Text>
              <Text style={styles.heroSub}>Connect directly with neighbors looking for local products and services.</Text>
            </View>
          </View>

          <View style={styles.formContainer}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Business Name <Text style={styles.required}>*</Text></Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. Neighborly Cafe"
                placeholderTextColor="#A1A1AA"
                value={form.businessName}
                onChangeText={(text) => setForm({ ...form, businessName: text })}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Category <Text style={styles.required}>*</Text></Text>
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
              <Text style={styles.label}>Description <Text style={styles.required}>*</Text></Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Tell the community what makes your business special..."
                placeholderTextColor="#A1A1AA"
                multiline
                numberOfLines={4}
                textAlignVertical="top"
                value={form.description}
                onChangeText={(text) => setForm({ ...form, description: text })}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Business Address <Text style={styles.required}>*</Text></Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. 123 Main Street"
                placeholderTextColor="#A1A1AA"
                value={form.address}
                onChangeText={(text) => setForm({ ...form, address: text })}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Contact Phone <Text style={styles.required}>*</Text></Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. +1 234 567 8900"
                placeholderTextColor="#A1A1AA"
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
                placeholderTextColor="#A1A1AA"
                keyboardType="url"
                autoCapitalize="none"
                value={form.website}
                onChangeText={(text) => setForm({ ...form, website: text })}
              />
            </View>
            
            <View style={styles.infoBox}>
              <Ionicons name="location" size={18} color="#4F46E5" />
              <Text style={styles.infoText}>
                Your business will be listed in the <Text style={{fontWeight:'700', color: '#18181B'}}>{community?.name}</Text> directory.
              </Text>
            </View>
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
              <Text style={styles.submitBtnText}>List Business</Text>
            )}
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#FFFFFF" },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 16, backgroundColor: "#FFFFFF", borderBottomWidth: 1, borderBottomColor: "#F4F4F5" },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: "#F4F4F5", alignItems: "center", justifyContent: "center" },
  headerTitle: { fontSize: 17, fontWeight: "700", color: "#18181B" },
  
  scroll: { padding: 16, paddingBottom: 40, backgroundColor: "#FAFAFA" },
  
  heroSection: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', padding: 16, borderRadius: 16, marginBottom: 20, borderWidth: 1, borderColor: '#F4F4F5' },
  iconCircle: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#EEF2FF', alignItems: 'center', justifyContent: 'center', marginRight: 16 },
  heroTextContainer: { flex: 1 },
  heroTitle: { fontSize: 18, fontWeight: '700', color: '#18181B', marginBottom: 4 },
  heroSub: { fontSize: 13, color: '#71717A', lineHeight: 18 },

  formContainer: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#F4F4F5' },
  inputGroup: { marginBottom: 20 },
  label: { fontSize: 14, fontWeight: "600", color: "#3F3F46", marginBottom: 8 },
  required: { color: '#EF4444' },
  input: { backgroundColor: "#FAFAFA", borderWidth: 1, borderColor: "#E4E4E7", borderRadius: 12, paddingHorizontal: 16, height: 50, fontSize: 15, color: "#18181B" },
  textArea: { height: 100, paddingTop: 14 },
  
  catChip: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, backgroundColor: "#FAFAFA", borderWidth: 1, borderColor: "#E4E4E7", marginRight: 8 },
  catChipActive: { backgroundColor: "#EEF2FF", borderColor: "#4F46E5" },
  catText: { fontSize: 14, fontWeight: "500", color: "#71717A" },
  catTextActive: { color: "#4F46E5", fontWeight: "700" },
  
  infoBox: { flexDirection: "row", alignItems: 'center', backgroundColor: "#EEF2FF", padding: 14, borderRadius: 12, marginTop: 8 },
  infoText: { flex: 1, fontSize: 13, color: "#4338CA", marginLeft: 10, lineHeight: 18 },
  
  footer: { padding: 16, paddingBottom: Platform.OS === 'ios' ? 10 : 20, backgroundColor: "#FFFFFF", borderTopWidth: 1, borderTopColor: "#F4F4F5" },
  submitBtn: { backgroundColor: '#4F46E5', height: 54, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  submitBtnText: { color: "#FFFFFF", fontSize: 16, fontWeight: "600" },
});
