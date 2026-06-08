import React, { useState } from 'react';
import { View, ScrollView, TouchableOpacity, StyleSheet, TextInput, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import Text from '@/components/common/Text';
import Button from '@/components/common/Button';
import ProviderService, { CATEGORIES } from '@/services/providerService';
import { useAppStore } from '@/store/appStore';
import { AuthService } from '@/services/authService';

export default function RegisterServiceScreen() {
  const router = useRouter();
  const community = useAppStore((s) => s.community);
  const coordinates = useAppStore((s) => s.coordinates);

  const [loading, setLoading] = useState(false);
  const [name, setName] = useState('');
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [about, setAbout] = useState('');
  const [phone, setPhone] = useState('');

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
  footer: { padding: 24, borderTopWidth: 1, borderTopColor: '#F3F4F6', backgroundColor: '#FFFFFF' }
});
