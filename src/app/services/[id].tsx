import React, { useEffect, useState } from 'react';
import { View, ScrollView, TouchableOpacity, StyleSheet, Linking, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import Text from '@/components/common/Text';
import Button from '@/components/common/Button';
import ProviderService, { ServiceProvider, ServiceReview } from '@/services/providerService';
import { AuthService } from '@/services/authService';
import { ChatService } from '@/services/chatService';

export default function ServiceDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();

  const [provider, setProvider] = useState<ServiceProvider | null>(null);
  const [reviews, setReviews] = useState<ServiceReview[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      loadData(id as string);
    }
  }, [id]);

  const loadData = async (serviceId: string) => {
    try {
      setLoading(true);
      const data = await ProviderService.getProviderById(serviceId);
      if (data) {
        setProvider(data);
        const revs = await ProviderService.getReviews(serviceId);
        setReviews(revs);
      }
    } catch (e) {
      console.error("Error loading service details:", e);
    } finally {
      setLoading(false);
    }
  };

  const handleCall = () => {
    if (provider?.phone) {
      Linking.openURL(`tel:${provider.phone}`).catch(() => {
        Alert.alert('Error', 'Unable to open dialer.');
      });
    }
  };

  const handleWhatsApp = () => {
    if (provider?.phone) {
      // Remove any non-numeric characters for WhatsApp link
      const num = provider.phone.replace(/[^0-9]/g, '');
      Linking.openURL(`whatsapp://send?phone=${num}`).catch(() => {
        Alert.alert('Error', 'WhatsApp is not installed on your device.');
      });
    }
  };

  const handleChat = async () => {
    if (!provider) return;
    const me = AuthService.getCurrentUser();
    if (!me) {
      Alert.alert('Error', 'You must be logged in to chat.');
      return;
    }
    
    if (me.uid === provider.userId) {
      Alert.alert('Note', 'This is your own service profile.');
      return;
    }

    try {
      const chatId = await ChatService.createOrGetDmConversation(me.uid, provider.userId, "User", provider.name);
      router.push(`/chat/${chatId}?name=${encodeURIComponent(provider.name)}` as any);
    } catch (e) {
      Alert.alert('Error', 'Could not start chat.');
    }
  };

  if (loading) {
    return (
      <View style={[styles.root, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#4F46E5" />
      </View>
    );
  }

  if (!provider) {
    return (
      <View style={[styles.root, { justifyContent: 'center', alignItems: 'center' }]}>
        <Text>Service not found.</Text>
        <Button title="Go Back" onPress={() => router.back()} style={{ marginTop: 20 }} />
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color="#111827" />
          </TouchableOpacity>
        </View>

        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 100 }}>
          {/* Profile Card */}
          <View style={styles.profileSection}>
            <View style={styles.avatarBox}>
              <Ionicons name="construct" size={40} color="#4F46E5" />
            </View>
            <Text style={styles.title}>{provider.name}</Text>
            <Text style={styles.category}>{provider.category}</Text>

            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <Ionicons name="star" size={18} color="#F59E0B" />
                <Text style={styles.statBold}>{provider.rating ? provider.rating.toFixed(1) : '0'}</Text>
                <Text style={styles.statLight}>({provider.reviewCount} reviews)</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Ionicons name="location" size={18} color="#10B981" />
                <Text style={styles.statBold}>Local</Text>
              </View>
            </View>

            <View style={[styles.availBadge, !provider.isAvailable && { backgroundColor: '#FEE2E2', borderColor: '#FCA5A5' }]}>
              <View style={[styles.availDot, !provider.isAvailable && { backgroundColor: '#EF4444' }]} />
              <Text style={[styles.availText, !provider.isAvailable && { color: '#EF4444' }]}>
                {provider.isAvailable ? 'Available Now' : 'Currently Unavailable'}
              </Text>
            </View>
          </View>

          {/* About Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>ABOUT</Text>
            <Text style={styles.aboutText}>{provider.about}</Text>
          </View>

          {/* Reviews Section */}
          <View style={styles.section}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <Text style={styles.sectionTitle}>REVIEWS</Text>
              <TouchableOpacity onPress={() => router.push(`/services/review?serviceId=${provider.id}` as any)}>
                <Text style={{ color: '#4F46E5', fontWeight: '700', fontSize: 13 }}>Write a Review</Text>
              </TouchableOpacity>
            </View>

            {reviews.length === 0 ? (
              <Text style={{ color: '#9CA3AF', fontStyle: 'italic' }}>No reviews yet. Be the first to review!</Text>
            ) : (
              reviews.map(r => (
                <View key={r.id} style={styles.reviewCard}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                    <Ionicons name="person-circle" size={24} color="#D1D5DB" />
                    <Text style={{ fontSize: 13, fontWeight: '600', color: '#374151', marginLeft: 8 }}>User</Text>
                    <View style={{ flex: 1 }} />
                    <View style={{ flexDirection: 'row' }}>
                      {[1,2,3,4,5].map(star => (
                        <Ionicons key={star} name="star" size={14} color={star <= r.rating ? '#F59E0B' : '#E5E7EB'} />
                      ))}
                    </View>
                  </View>
                  <Text style={{ fontSize: 14, color: '#4B5563', lineHeight: 20 }}>{r.comment}</Text>
                </View>
              ))
            )}
          </View>

        </ScrollView>

        {/* Footer Actions */}
        <View style={styles.footer}>
          <TouchableOpacity style={styles.actionBtnOutline} onPress={handleWhatsApp}>
            <Ionicons name="logo-whatsapp" size={20} color="#10B981" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionBtnOutline} onPress={handleCall}>
            <Ionicons name="call" size={20} color="#4F46E5" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionBtnSolid} onPress={handleChat}>
            <Ionicons name="chatbubbles" size={20} color="#FFFFFF" style={{ marginRight: 8 }} />
            <Text style={{ color: '#FFFFFF', fontWeight: '700', fontSize: 15 }}>Chat</Text>
          </TouchableOpacity>
        </View>

      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#FFFFFF' },
  header: { padding: 16, borderBottomWidth: 1, borderBottomColor: '#F3F4F6', flexDirection: 'row' },
  backBtn: { width: 40, height: 40, justifyContent: 'center' },
  profileSection: { alignItems: 'center', padding: 24, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  avatarBox: { width: 90, height: 90, borderRadius: 45, backgroundColor: '#EEF2FF', alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: '#4F46E5' },
  title: { fontSize: 22, fontWeight: '800', color: '#111827', marginTop: 16 },
  category: { fontSize: 14, fontWeight: '600', color: '#4F46E5', marginTop: 4 },
  statsRow: { flexDirection: 'row', alignItems: 'center', marginTop: 16, backgroundColor: '#F8F9FA', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 100 },
  statItem: { flexDirection: 'row', alignItems: 'center' },
  statBold: { fontSize: 14, fontWeight: '700', color: '#111827', marginLeft: 6 },
  statLight: { fontSize: 13, color: '#6B7280', marginLeft: 4 },
  statDivider: { width: 1, height: 16, backgroundColor: '#D1D5DB', marginHorizontal: 16 },
  availBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#D1FAE5', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 100, marginTop: 16, borderWidth: 1, borderColor: '#6EE7B7' },
  availDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#10B981' },
  availText: { fontSize: 13, fontWeight: '700', color: '#059669', marginLeft: 8 },
  section: { padding: 24, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  sectionTitle: { fontSize: 12, fontWeight: '800', color: '#9CA3AF', letterSpacing: 1, marginBottom: 12 },
  aboutText: { fontSize: 14, color: '#4B5563', lineHeight: 22 },
  reviewCard: { backgroundColor: '#F8F9FA', padding: 16, borderRadius: 16, marginBottom: 12, borderWidth: 1, borderColor: '#E5E7EB' },
  footer: { flexDirection: 'row', padding: 16, paddingBottom: 30, borderTopWidth: 1, borderTopColor: '#F3F4F6', backgroundColor: '#FFFFFF', gap: 12 },
  actionBtnOutline: { width: 56, height: 56, borderRadius: 28, borderWidth: 1, borderColor: '#E5E7EB', alignItems: 'center', justifyContent: 'center', backgroundColor: '#F8F9FA' },
  actionBtnSolid: { flex: 1, height: 56, borderRadius: 28, backgroundColor: '#4F46E5', flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
});
