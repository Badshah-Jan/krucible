import React, { useState, useEffect } from 'react';
import { View, ScrollView, TouchableOpacity, StyleSheet, TextInput, ActivityIndicator, Alert, StatusBar, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { LinearGradient } from "expo-linear-gradient";
import Animated, { FadeInDown, FadeInUp } from "react-native-reanimated";
import Text from '@/components/common/Text';
import Button from '@/components/common/Button';
import ProviderService, { CATEGORIES } from '@/services/providerService';
import { useAppStore } from '@/store/appStore';
import { AuthService } from '@/services/authService';
import { UserService, UserProfile } from "@/services/userService";

export default function RegisterServiceScreen() {
  const router = useRouter();
  const community = useAppStore((s) => s.community);
  const coordinates = useAppStore((s) => s.coordinates);

  const [loading, setLoading] = useState(false);
  const [name, setName] = useState('');
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [about, setAbout] = useState('');
  const [phone, setPhone] = useState('');

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
    if (!name.trim() || !about.trim() || !phone.trim()) {
      Alert.alert('Missing Fields', 'Please fill out all required fields.');
      return;
    }

    const user = AuthService.getCurrentUser();
    if (!user) {
      Alert.alert('Error', 'You must be logged in.');
      return;
    }

    if (!community?.communityId || !coordinates) {
      Alert.alert('Error', 'We could not detect your community or location.');
      return;
    }

    setLoading(true);
    try {
      await ProviderService.registerProvider({
        userId: user.uid,
        name: name.trim(),
        category,
        about: about.trim(),
        phone: phone.trim(),
        isAvailable: true,
        communityId: community.communityId,
        location: {
          lat: coordinates.lat,
          lng: coordinates.lng,
          address: community.name || ''
        }
      });
      Alert.alert('Success!', 'Your service provider profile has been created.');
      router.back();
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to register. Try again.');
    } finally {
      setLoading(false);
    }
  };

  if (profileLoading) {
    return (
      <View style={[styles.root, { alignItems: "center", justifyContent: "center" }]}>
        <ActivityIndicator size="large" color="#EF4444" />
      </View>
    );
  }



  return (
    <View style={styles.root}>
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="close" size={24} color="#111827" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Offer a Service</Text>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
          <Text style={styles.sectionDesc}>
            Join the Neighborly marketplace to offer your professional skills to people in your community.
          </Text>

          {/* Form */}
          <Text style={styles.label}>Business or Full Name</Text>
          <TextInput 
            style={styles.input}
            placeholder="e.g. Bilal Electricals or Ustad Bilal"
            value={name}
            onChangeText={setName}
            placeholderTextColor="#9CA3AF"
          />

          <Text style={styles.label}>Service Category</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.catScroll}>
            {CATEGORIES.map(c => (
              <TouchableOpacity
                key={c}
                style={[styles.catChip, category === c && styles.catChipActive]}
                onPress={() => setCategory(c)}
              >
                <Text style={[styles.catChipText, category === c && styles.catChipTextActive]}>{c}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <Text style={styles.label}>Phone Number (WhatsApp preferred)</Text>
          <TextInput 
            style={styles.input}
            placeholder="+92 300 1234567"
            keyboardType="phone-pad"
            value={phone}
            onChangeText={setPhone}
            placeholderTextColor="#9CA3AF"
          />

          <Text style={styles.label}>About Your Service</Text>
          <TextInput 
            style={[styles.input, styles.textArea]}
            placeholder="Describe what you do, your experience, and your typical rates..."
            multiline
            numberOfLines={4}
            value={about}
            onChangeText={setAbout}
            textAlignVertical="top"
            placeholderTextColor="#9CA3AF"
          />

          <View style={styles.infoBox}>
            <Ionicons name="location" size={20} color="#4F46E5" />
            <Text style={styles.infoText}>
              Your service profile will be linked to your current community: {community?.name}
            </Text>
          </View>

        </ScrollView>

        <View style={styles.footer}>
          <Button 
            title={loading ? "Registering..." : "Create Profile"}
            onPress={handleRegister}
            disabled={loading}
            style={{ backgroundColor: '#4F46E5' }}
          />
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#FFFFFF' },
  header: { flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  backBtn: { marginRight: 16 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#111827' },
  scroll: { padding: 24, paddingBottom: 40 },
  sectionDesc: { fontSize: 14, color: '#4B5563', lineHeight: 22, marginBottom: 24 },
  label: { fontSize: 13, fontWeight: '700', color: '#374151', marginBottom: 8 },
  input: { backgroundColor: '#F8F9FA', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, fontSize: 15, color: '#111827', marginBottom: 20 },
  textArea: { height: 120, paddingTop: 14 },
  catScroll: { flexDirection: 'row', marginBottom: 24 },
  catChip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: '#F3F4F6', borderWidth: 1, borderColor: '#E5E7EB', marginRight: 8, height: 36 },
  catChipActive: { backgroundColor: '#EEF2FF', borderColor: '#4F46E5' },
  catChipText: { fontSize: 13, color: '#4B5563', fontWeight: '500' },
  catChipTextActive: { color: '#4F46E5', fontWeight: '700' },
  infoBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#EEF2FF', padding: 16, borderRadius: 12, marginTop: 10 },
  infoText: { flex: 1, marginLeft: 12, fontSize: 12, color: '#312E81', lineHeight: 18 },
  submitBtn: { backgroundColor: '#4F46E5', paddingVertical: 16, alignItems: 'center', borderRadius: 12, marginTop: 16 },
  submitText: { color: '#FFFFFF', fontWeight: '700', fontSize: 16 },
  premiumHeader: { flexDirection: "row", paddingHorizontal: 20, paddingTop: 10, justifyContent: "flex-end" },
  premiumBackBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(255,255,255,0.1)", alignItems: "center", justifyContent: "center" },
  premiumScroll: { flexGrow: 1, paddingHorizontal: 24, paddingBottom: 40 },
  premiumHero: { alignItems: "center", marginTop: 20 },
  premiumIconBg: { width: 100, height: 100, borderRadius: 32, alignItems: "center", justifyContent: "center", marginBottom: 24, shadowColor: "#E11D48", shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.5, shadowRadius: 20, elevation: 10 },
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
  premiumBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", paddingVertical: 18, borderRadius: 100, shadowColor: "#E11D48", shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.4, shadowRadius: 15, elevation: 8 },
  premiumBtnText: { color: "#FFFFFF", fontSize: 18, fontWeight: "800", marginRight: 8 },
  footer: { padding: 24, borderTopWidth: 1, borderTopColor: '#F3F4F6', backgroundColor: '#FFFFFF' }
});
