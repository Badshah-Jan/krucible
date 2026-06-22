import React, { useState, useEffect } from 'react';
import { View, ScrollView, TouchableOpacity, StyleSheet, TextInput, ActivityIndicator, Alert, StatusBar, Platform, KeyboardAvoidingView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import Text from '@/components/common/Text';
import ProviderService, { CATEGORIES } from '@/services/providerService';
import { useAppStore } from '@/store/appStore';
import { AuthService } from '@/services/authService';
import { UserService } from "@/services/userService";
import { Colors } from '@/constants/colors';

export default function RegisterServiceScreen() {
  const router = useRouter();
  const community = useAppStore((s) => s.community);
  const coordinates = useAppStore((s) => s.coordinates);

  const [loading, setLoading] = useState(false);
  const [name, setName] = useState('');
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [about, setAbout] = useState('');
  const [phone, setPhone] = useState('');
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
      Alert.alert('Success!', 'Your service profile has been created.', [
        { text: 'Done', onPress: () => router.back() }
      ]);
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to register. Try again.');
    } finally {
      setLoading(false);
    }
  };

  if (profileLoading) {
    return (
      <View style={[styles.root, { alignItems: "center", justifyContent: "center" }]}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <SafeAreaView style={styles.root} edges={['top']}>
        <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
        
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="close" size={24} color="#18181B" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Offer a Service</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
          <View style={styles.heroSection}>
            <View style={styles.iconCircle}>
              <Ionicons name="briefcase" size={28} color={Colors.primary} />
            </View>
            <View style={styles.heroTextContainer}>
              <Text style={styles.heroTitle}>Share Your Skills</Text>
              <Text style={styles.heroSub}>Offer your professional skills to people right in your neighborhood.</Text>
            </View>
          </View>

          <View style={styles.formContainer}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Business or Full Name <Text style={styles.required}>*</Text></Text>
              <TextInput 
                style={styles.input}
                placeholder="e.g. Bilal Electricals or Ustad Bilal"
                value={name}
                onChangeText={setName}
                placeholderTextColor="#A1A1AA"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Service Category <Text style={styles.required}>*</Text></Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -16 }}>
                <View style={{ width: 16 }} />
                {CATEGORIES.map(c => (
                  <TouchableOpacity
                    key={c}
                    style={[styles.catChip, category === c && styles.catChipActive]}
                    onPress={() => setCategory(c)}
                  >
                    <Text style={[styles.catText, category === c && styles.catTextActive]}>{c}</Text>
                  </TouchableOpacity>
                ))}
                <View style={{ width: 16 }} />
              </ScrollView>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Phone Number (WhatsApp preferred) <Text style={styles.required}>*</Text></Text>
              <TextInput 
                style={styles.input}
                placeholder="+92 300 1234567"
                keyboardType="phone-pad"
                value={phone}
                onChangeText={setPhone}
                placeholderTextColor="#A1A1AA"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>About Your Service <Text style={styles.required}>*</Text></Text>
              <TextInput 
                style={[styles.input, styles.textArea]}
                placeholder="Describe what you do, your experience, and your typical rates..."
                multiline
                numberOfLines={4}
                value={about}
                onChangeText={setAbout}
                textAlignVertical="top"
                placeholderTextColor="#A1A1AA"
              />
            </View>

            <View style={styles.infoBox}>
              <Ionicons name="location" size={18} color={Colors.primary} />
              <Text style={styles.infoText}>
                Your service profile will be linked to <Text style={{fontWeight:'700', color: '#18181B'}}>{community?.name}</Text>.
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
              <Text style={styles.submitBtnText}>Create Profile</Text>
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
  iconCircle: { width: 48, height: 48, borderRadius: 24, backgroundColor: Colors.primaryLight, alignItems: 'center', justifyContent: 'center', marginRight: 16 },
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
  catChipActive: { backgroundColor: Colors.primaryLight, borderColor: Colors.primary },
  catText: { fontSize: 14, fontWeight: "500", color: "#71717A" },
  catTextActive: { color: Colors.primary, fontWeight: "700" },
  
  infoBox: { flexDirection: "row", alignItems: 'center', backgroundColor: Colors.primaryLight, padding: 14, borderRadius: 12, marginTop: 8 },
  infoText: { flex: 1, fontSize: 13, color: Colors.primaryMid, marginLeft: 10, lineHeight: 18 },
  
  footer: { padding: 16, paddingBottom: Platform.OS === 'ios' ? 10 : 20, backgroundColor: "#FFFFFF", borderTopWidth: 1, borderTopColor: "#F4F4F5" },
  submitBtn: { backgroundColor: Colors.primary, height: 54, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  submitBtnText: { color: "#FFFFFF", fontSize: 16, fontWeight: "600" },
});
