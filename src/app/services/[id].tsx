import React, { useEffect, useState } from 'react';
import { View, ScrollView, TouchableOpacity, StyleSheet, Linking, ActivityIndicator, Alert, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { LinearGradient } from "expo-linear-gradient";
import Text from '@/components/common/Text';
import SafetyBanner from '@/components/safety/SafetyBanner';
import ReportModal from '@/components/safety/ReportModal';
import ProviderService, { ServiceProvider, ServiceReview } from '@/services/providerService';
import { AuthService } from '@/services/authService';
import { UserService } from '@/services/userService';
import { ChatService } from '@/services/chatService';
import { Colors } from '@/constants/colors';

export default function ServiceDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();

  const [provider, setProvider] = useState<ServiceProvider | null>(null);
  const [reviews, setReviews] = useState<ServiceReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [showReport, setShowReport] = useState(false);

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
      const userProfile = await UserService.getUserProfile(me.uid);
      const myName = userProfile?.name || me.displayName || "Neighbor";
      const chatId = await ChatService.createOrGetDmConversation(me.uid, provider.userId, myName, provider.name || "Provider", "service");
      router.push(`/chat/${chatId}?name=${encodeURIComponent(provider.name || "Provider")}` as any);
    } catch (e: any) {
      console.error("Chat Error:", e);
      Alert.alert('Error', `Could not start chat: ${e.message || 'Unknown error'}`);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  if (!provider) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>Service not found.</Text>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" backgroundColor="#F8F9FA" translucent={false} />
      
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.circleBtn}>
            <Ionicons name="arrow-back" size={24} color="#111827" />
          </TouchableOpacity>
          <View style={{ flex: 1 }} />
          {provider.userId !== AuthService.getCurrentUser()?.uid && (
            <TouchableOpacity onPress={() => setShowReport(true)} style={styles.circleBtn}>
              <Ionicons name="flag-outline" size={20} color="#6B7280" />
            </TouchableOpacity>
          )}
        </View>

        <ScrollView contentContainerStyle={styles.scroll}>
          {provider.isPremium ? (
            <LinearGradient colors={["#FFFBEB", "#FEF3C7", "transparent"]} style={styles.profileHeader}>
              <View style={styles.badges}>
                <View style={[styles.badge, { backgroundColor: '#FDE68A', borderColor: '#FCD34D', borderWidth: 1 }]}>
                  <Ionicons name="star" size={12} color="#D97706" style={{ marginRight: 4 }} />
                  <Text style={[styles.badgeText, { color: '#B45309' }]}>PREMIUM PROVIDER</Text>
                </View>
                {provider.isVerified && (
                  <View style={[styles.badge, { backgroundColor: '#D1FAE5', borderColor: '#A7F3D0', borderWidth: 1 }]}>
                    <Ionicons name="checkmark-circle" size={12} color="#059669" style={{ marginRight: 4 }} />
                    <Text style={[styles.badgeText, { color: '#059669' }]}>VERIFIED</Text>
                  </View>
                )}
              </View>
              <Text style={styles.name}>{provider.name}</Text>
              <Text style={styles.category}>{provider.category}</Text>

              <View style={[styles.statsRow, { backgroundColor: '#FEF3C7', borderColor: '#FDE68A' }]}>
                <View style={styles.statItem}>
                  <Ionicons name="star" size={16} color="#D97706" />
                  <Text style={[styles.statBold, { color: '#92400E' }]}>{provider.rating ? provider.rating.toFixed(1) : 'New'}</Text>
                  <Text style={[styles.statLight, { color: '#B45309' }]}>({provider.reviewCount} reviews)</Text>
                </View>
                <View style={[styles.statDivider, { backgroundColor: '#FCD34D' }]} />
                <View style={styles.statItem}>
                  <Ionicons name="location" size={16} color="#059669" />
                  <Text style={[styles.statBold, { color: '#92400E' }]}>Local</Text>
                </View>
              </View>
            </LinearGradient>
          ) : (
            <View style={styles.profileHeader}>
              <View style={styles.badges}>
                {provider.isVerified && (
                  <View style={[styles.badge, { backgroundColor: '#D1FAE5', borderColor: '#A7F3D0', borderWidth: 1 }]}>
                    <Ionicons name="checkmark-circle" size={12} color="#059669" style={{ marginRight: 4 }} />
                    <Text style={[styles.badgeText, { color: '#059669' }]}>VERIFIED</Text>
                  </View>
                )}
              </View>
              <Text style={styles.name}>{provider.name}</Text>
              <Text style={styles.category}>{provider.category}</Text>

              <View style={[styles.statsRow, { backgroundColor: '#FFFFFF', borderColor: '#E5E7EB' }]}>
                <View style={styles.statItem}>
                  <Ionicons name="star" size={16} color="#F59E0B" />
                  <Text style={[styles.statBold, { color: '#111827' }]}>{provider.rating ? provider.rating.toFixed(1) : 'New'}</Text>
                  <Text style={[styles.statLight, { color: '#6B7280' }]}>({provider.reviewCount} reviews)</Text>
                </View>
                <View style={[styles.statDivider, { backgroundColor: '#E5E7EB' }]} />
                <View style={styles.statItem}>
                  <Ionicons name="location" size={16} color="#10B981" />
                  <Text style={[styles.statBold, { color: '#111827' }]}>Local</Text>
                </View>
              </View>
            </View>
          )}

          <View style={{ paddingHorizontal: 16 }}>
            <View style={[styles.availBadge, !provider.isAvailable && { backgroundColor: '#FEE2E2', borderColor: '#FCA5A5' }]}>
              <View style={[styles.availDot, !provider.isAvailable && { backgroundColor: Colors.primary }]} />
              <Text style={[styles.availText, !provider.isAvailable && { color: Colors.primaryMid }]}>
                {provider.isAvailable ? 'Available Now' : 'Currently Unavailable'}
              </Text>
            </View>

            <View style={[styles.card, { paddingHorizontal: 14, paddingVertical: 12 }]}>
              <SafetyBanner type="marketplace" />
            </View>

            <View style={styles.card}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                <Ionicons name="person" size={20} color={Colors.primary} style={{ marginRight: 8 }} />
                <Text style={styles.sectionTitle}>About</Text>
              </View>
              <Text style={styles.aboutText}>{provider.about}</Text>
            </View>

            {provider.userId === AuthService.getCurrentUser()?.uid && !provider.isPremium && (
              <LinearGradient colors={["#FFFBEB", "#FEF3C7"]} style={styles.upgradeBox}>
                <View style={styles.upgradeIconBox}>
                  <Ionicons name="star" size={24} color="#D97706" />
                </View>
                <View style={{ flex: 1, marginLeft: 16 }}>
                  <Text style={styles.upgradeTitle}>Upgrade to Premium</Text>
                  <Text style={styles.upgradeSub}>Get featured placement and rank higher in local searches.</Text>
                  <TouchableOpacity 
                    style={styles.upgradeBtn}
                    onPress={() => router.push(`/businesses/premium?id=${provider.id}&type=service` as any)}
                  >
                    <Text style={styles.upgradeBtnText}>See Benefits</Text>
                  </TouchableOpacity>
                </View>
              </LinearGradient>
            )}

            <View style={styles.card}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Ionicons name="star-half" size={20} color="#F59E0B" style={{ marginRight: 8 }} />
                  <Text style={styles.sectionTitle}>Reviews</Text>
                </View>
                <TouchableOpacity onPress={() => router.push(`/services/review?serviceId=${provider.id}` as any)}>
                  <Text style={{ color: Colors.primary, fontWeight: '700', fontSize: 13 }}>Write Review</Text>
                </TouchableOpacity>
              </View>

              {reviews.length === 0 ? (
                <Text style={{ color: '#6B7280', fontStyle: 'italic', textAlign: 'center', paddingVertical: 10 }}>No reviews yet. Be the first to review!</Text>
              ) : (
                reviews.map(r => (
                  <View key={r.id} style={styles.reviewCard}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                      <Ionicons name="person-circle" size={24} color="#9CA3AF" />
                      <Text style={{ fontSize: 13, fontWeight: '700', color: '#111827', marginLeft: 8 }}>Neighbor</Text>
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

            {/* Legal Disclaimer */}
            <SafetyBanner type="legal" />
          </View>
        </ScrollView>

        {/* Footer Actions */}
        <View style={styles.footer}>
          <TouchableOpacity style={[styles.actionBtnOutline, { borderColor: '#A7F3D0', backgroundColor: '#D1FAE5' }]} onPress={handleWhatsApp}>
            <Ionicons name="logo-whatsapp" size={24} color="#059669" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionBtnOutline} onPress={handleCall}>
            <Ionicons name="call" size={24} color={Colors.primary} />
          </TouchableOpacity>
          <TouchableOpacity activeOpacity={0.8} style={{ flex: 1 }} onPress={handleChat}>
             <LinearGradient colors={[Colors.primary, Colors.primaryMid]} style={styles.actionBtnSolid} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
              <Ionicons name="chatbubbles" size={20} color="#FFFFFF" style={{ marginRight: 8 }} />
              <Text style={{ color: '#FFFFFF', fontWeight: '800', fontSize: 16 }}>Message</Text>
             </LinearGradient>
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      <ReportModal
        visible={showReport}
        targetId={provider?.id || ''}
        targetType="service"
        targetOwnerId={provider?.userId}
        onClose={() => setShowReport(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#F8F9FA" },
  center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#F8F9FA" },
  errorText: { fontSize: 16, color: "#6B7280", marginBottom: 16 },
  backBtn: { padding: 12, backgroundColor: Colors.primary, borderRadius: 8 },
  backText: { color: "#FFFFFF", fontWeight: "600" },
  header: { flexDirection: "row", paddingHorizontal: 16, paddingTop: 16 },
  circleBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: "#FFFFFF", alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "#E5E7EB" },
  scroll: { paddingBottom: 40 },
  profileHeader: { paddingHorizontal: 24, paddingBottom: 32, paddingTop: 16 },
  badges: { flexDirection: "row", gap: 8, marginBottom: 12 },
  badge: { flexDirection: "row", alignItems: "center", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 100 },
  badgeText: { fontSize: 10, fontWeight: "800", letterSpacing: 0.5 },
  name: { fontSize: 32, fontWeight: "800", color: "#111827", marginBottom: 4 },
  category: { fontSize: 16, color: Colors.primary, fontWeight: "600" },
  
  statsRow: { flexDirection: 'row', alignItems: 'center', marginTop: 16, paddingHorizontal: 20, paddingVertical: 12, borderRadius: 100, alignSelf: 'flex-start', borderWidth: 1 },
  statItem: { flexDirection: 'row', alignItems: 'center' },
  statBold: { fontSize: 14, fontWeight: '800', marginLeft: 6 },
  statLight: { fontSize: 13, marginLeft: 4 },
  statDivider: { width: 1, height: 16, marginHorizontal: 16 },
  
  availBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#D1FAE5', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 100, marginBottom: 16, borderWidth: 1, borderColor: '#A7F3D0', alignSelf: 'center' },
  availDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#059669' },
  availText: { fontSize: 13, fontWeight: '800', color: '#047857', marginLeft: 8 },
  
  card: { backgroundColor: "#FFFFFF", borderRadius: 20, padding: 20, marginBottom: 16, borderWidth: 1, borderColor: "#E5E7EB", shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  sectionTitle: { fontSize: 18, fontWeight: "700", color: "#111827" },
  aboutText: { fontSize: 15, color: "#4B5563", lineHeight: 24 },
  reviewCard: { backgroundColor: "#F9FAFB", padding: 16, borderRadius: 16, marginBottom: 12, borderWidth: 1, borderColor: "#F3F4F6" },
  
  footer: { flexDirection: 'row', padding: 20, paddingBottom: 30, borderTopWidth: 1, borderTopColor: '#E5E7EB', backgroundColor: '#FFFFFF', gap: 12 },
  actionBtnOutline: { width: 56, height: 56, borderRadius: 28, borderWidth: 1, borderColor: '#FCA5A5', alignItems: 'center', justifyContent: 'center', backgroundColor: '#FEF2F2' },
  actionBtnSolid: { height: 56, borderRadius: 28, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', shadowColor: Colors.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 },
  
  upgradeBox: { flexDirection: "row", padding: 20, borderRadius: 20, marginTop: 8, marginBottom: 16, borderWidth: 1, borderColor: "#FDE68A" },
  upgradeIconBox: { width: 48, height: 48, borderRadius: 24, backgroundColor: "#FFFFFF", alignItems: "center", justifyContent: "center" },
  upgradeTitle: { fontSize: 16, fontWeight: "800", color: "#B45309", marginBottom: 4 },
  upgradeSub: { fontSize: 13, color: "#92400E", marginBottom: 12, lineHeight: 18 },
  upgradeBtn: { backgroundColor: "#F59E0B", paddingVertical: 8, paddingHorizontal: 16, borderRadius: 100, alignSelf: "flex-start" },
  upgradeBtnText: { color: "#FFFFFF", fontSize: 13, fontWeight: "800" }
});
