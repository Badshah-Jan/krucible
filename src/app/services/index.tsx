import React, { useEffect, useState } from 'react';
import { View, ScrollView, TouchableOpacity, StyleSheet, FlatList, ActivityIndicator, TextInput, Linking, Alert, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown } from 'react-native-reanimated';
import Text from '@/components/common/Text';
import ProviderService, { CATEGORIES, ServiceProvider } from '@/services/providerService';
import { useAppStore } from '@/store/appStore';
import { AuthService } from '@/services/authService';
import { Colors } from '@/constants/colors';

export default function ServicesMarketplaceScreen() {
  const router = useRouter();
  const community = useAppStore((s) => s.community);
  
  const [services, setServices] = useState<ServiceProvider[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [hasProviderProfile, setHasProviderProfile] = useState(false);

  useEffect(() => {
    loadServices();
    checkProfile();
  }, [community?.communityId, selectedCategory]);

  const loadServices = async () => {
    if (!community?.communityId) return;
    setLoading(true);
    try {
      const results = await ProviderService.getServicesByCommunity(community.communityId, selectedCategory);
      setServices(results);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const checkProfile = async () => {
    const user = AuthService.getCurrentUser();
    if (user) {
      const profile = await ProviderService.getProviderByUserId(user.uid);
      if (profile) setHasProviderProfile(true);
    }
  };

  const handleCall = (phone: string) => {
    Linking.openURL(`tel:${phone}`).catch(() => {
      Alert.alert('Error', 'Unable to open dialer.');
    });
  };

  const handleWhatsApp = (phone: string) => {
    const num = phone.replace(/[^0-9]/g, '');
    Linking.openURL(`whatsapp://send?phone=${num}`).catch(() => {
      Alert.alert('Error', 'WhatsApp is not installed on your device.');
    });
  };

  const filteredServices = services.filter((s) => 
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.about.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const renderService = React.useCallback(({ item: provider, index }: { item: ServiceProvider; index: number }) => {
    return (
      <MemoizedServiceItem 
        provider={provider}
        index={index}
        onCall={handleCall}
        onWhatsApp={handleWhatsApp}
        onPress={() => router.push(`/services/${provider.id}` as any)}
      />
    );
  }, []);

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" backgroundColor="#F8F9FA" translucent={false} />
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color="#111827" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Local Services</Text>
          <View style={{ width: 44 }} />
        </View>

        {/* Search */}
        <View style={styles.searchContainer}>
          <View style={styles.searchBox}>
            <Ionicons name="search" size={20} color="#9CA3AF" />
            <TextInput 
              placeholder="Search services, providers..."
              style={styles.searchInput}
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholderTextColor="#9CA3AF"
            />
          </View>
        </View>

        <FlatList
          data={filteredServices}
          keyExtractor={(item) => item.id!}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 100 }}
          renderItem={renderService}
          ListHeaderComponent={
            <>
              {/* Categories */}
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoriesScroll} contentContainerStyle={{ gap: 10 }}>
                <TouchableOpacity onPress={() => setSelectedCategory('All')} activeOpacity={0.7}>
                  {selectedCategory === 'All' ? (
                    <LinearGradient colors={[Colors.primary, Colors.primaryMid]} style={styles.catBtnActive} start={{x:0, y:0}} end={{x:1, y:0}}>
                      <Text style={styles.catTextActive}>All</Text>
                    </LinearGradient>
                  ) : (
                    <View style={styles.catBtn}>
                      <Text style={styles.catText}>All</Text>
                    </View>
                  )}
                </TouchableOpacity>
                {CATEGORIES.map((cat) => {
                  const isActive = selectedCategory === cat;
                  return (
                    <TouchableOpacity key={cat} onPress={() => setSelectedCategory(cat)} activeOpacity={0.7}>
                      {isActive ? (
                        <LinearGradient colors={[Colors.primary, Colors.primaryMid]} style={styles.catBtnActive} start={{x:0, y:0}} end={{x:1, y:0}}>
                          <Text style={styles.catTextActive}>{cat}</Text>
                        </LinearGradient>
                      ) : (
                        <View style={styles.catBtn}>
                          <Text style={styles.catText}>{cat}</Text>
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
              {loading && <ActivityIndicator size="large" color={Colors.primary} style={{ marginTop: 50 }} />}
            </>
          }
          ListEmptyComponent={
            !loading ? (
              <View style={styles.emptyState}>
                <View style={styles.emptyIconBox}>
                  <Ionicons name="construct" size={48} color={Colors.primary} />
                </View>
                <Text style={styles.emptyTitle}>No Providers Found</Text>
                <Text style={styles.emptySub}>We couldn't find any services matching your criteria.</Text>
              </View>
            ) : null
          }
        />

        {/* Floating Action Button */}
        {!hasProviderProfile ? (
          <TouchableOpacity 
            style={styles.fab} 
            activeOpacity={0.9}
            onPress={() => router.push('/services/register' as any)}
          >
            <LinearGradient colors={[Colors.primary, Colors.primaryMid]} style={styles.fabGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
              <Ionicons name="briefcase" size={20} color="#FFFFFF" />
              <Text style={styles.fabText}>Offer a Service</Text>
            </LinearGradient>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity 
            style={styles.fab} 
            activeOpacity={0.9}
            onPress={() => {
              const user = AuthService.getCurrentUser();
              if (user) {
                ProviderService.getProviderByUserId(user.uid).then(profile => {
                  if (profile) router.push(`/services/${profile.id}` as any);
                });
              }
            }}
          >
            <LinearGradient colors={["#10B981", "#059669"]} style={styles.fabGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
              <Ionicons name="person-circle" size={20} color="#FFFFFF" />
              <Text style={styles.fabText}>My Profile</Text>
            </LinearGradient>
          </TouchableOpacity>
        )}
      </SafeAreaView>
    </View>
  );
}

const MemoizedServiceItem = React.memo(({ provider, index, onPress, onCall, onWhatsApp }: any) => {
  return (
    <Animated.View entering={FadeInDown.duration(400).delay(index * 100).springify()}>
      <TouchableOpacity 
        style={[styles.providerCard, { marginHorizontal: 16 }]}
        activeOpacity={0.8}
        onPress={onPress}
      >
        <ServiceCardContent provider={provider} onCall={onCall} onWhatsApp={onWhatsApp} />
      </TouchableOpacity>
    </Animated.View>
  );
}, (prev, next) => prev.provider.id === next.provider.id && prev.provider.name === next.provider.name);

const ServiceCardContent = React.memo(({ provider, onCall, onWhatsApp }: { provider: ServiceProvider; onCall: any; onWhatsApp: any }) => {
  return (
    <View>
      <View style={styles.providerHeader}>
        <View style={styles.avatar}>
          <Ionicons name="person" size={24} color={Colors.primary} />
          {provider.isAvailable && <View style={styles.onlineDot} />}
        </View>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={styles.providerName} numberOfLines={1}>{provider.name}</Text>
          <Text style={styles.providerCat} numberOfLines={1}>{provider.category}</Text>
        </View>
        <View style={styles.badgesCol}>
          <View style={styles.ratingBadge}>
            <Ionicons name="star" size={10} color="#F59E0B" />
            <Text style={styles.ratingText}>{provider.rating ? provider.rating.toFixed(1) : 'New'}</Text>
          </View>
        </View>
      </View>
      <Text style={styles.providerAbout} numberOfLines={2}>{provider.about}</Text>
      
      {/* Inline Actions */}
      {provider.phone && (
        <View style={styles.actionRow}>
          <TouchableOpacity 
            style={[styles.actionBtn, { borderColor: "#A7F3D0", backgroundColor: "#D1FAE5" }]} 
            onPress={() => onWhatsApp(provider.phone)}
          >
            <Ionicons name="logo-whatsapp" size={14} color="#059669" style={{ marginRight: 6 }} />
            <Text style={[styles.actionBtnText, { color: "#059669" }]}>WhatsApp</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.actionBtn} 
            onPress={() => onCall(provider.phone)}
          >
            <Ionicons name="call" size={14} color={Colors.primary} style={{ marginRight: 6 }} />
            <Text style={styles.actionBtnText}>Call</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F8F9FA' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8 },
  backBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: "#FFFFFF", alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "#E5E7EB" },
  headerTitle: { fontSize: 20, fontWeight: '800', color: '#111827' },
  
  searchContainer: { paddingHorizontal: 16, marginBottom: 12, marginTop: 8 },
  searchBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', paddingHorizontal: 16, borderRadius: 100, borderWidth: 1, borderColor: '#E5E7EB', height: 48 },
  searchInput: { flex: 1, marginLeft: 12, fontSize: 15, color: '#111827' },
  
  categoriesScroll: { paddingHorizontal: 16, paddingBottom: 16, marginBottom: 8 },
  catBtn: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 100, backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "#E5E7EB" },
  catBtnActive: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 100, shadowColor: Colors.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 },
  catText: { fontSize: 14, fontWeight: "600", color: "#6B7280" },
  catTextActive: { fontSize: 14, fontWeight: "700", color: "#FFFFFF" },
  
  listContainer: { paddingHorizontal: 16 },
  providerCard: { backgroundColor: "#FFFFFF", borderRadius: 24, padding: 20, marginBottom: 16, borderWidth: 1, borderColor: "#E5E7EB", shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  premiumCard: { borderRadius: 24, padding: 20, marginBottom: 16, borderWidth: 1, borderColor: "#FCD34D", shadowColor: "#F59E0B", shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.2, shadowRadius: 15, elevation: 5 },
  
  providerHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  avatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#EEF2FF', alignItems: 'center', justifyContent: 'center', position: 'relative', borderWidth: 2, borderColor: '#C7D2FE' },
  onlineDot: { position: 'absolute', bottom: 0, right: 0, width: 12, height: 12, borderRadius: 6, backgroundColor: '#10B981', borderWidth: 2, borderColor: '#FFFFFF' },
  providerName: { fontSize: 18, fontWeight: '800', color: '#111827' },
  providerCat: { fontSize: 13, fontWeight: "600", color: '#4F46E5', marginTop: 2 },
  
  badgesCol: { alignItems: 'flex-end' },
  badge: { flexDirection: "row", alignItems: "center", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 100 },
  badgeText: { fontSize: 9, fontWeight: "800", letterSpacing: 0.5 },
  ratingBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FEF3C7', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12, borderWidth: 1, borderColor: '#FDE68A' },
  ratingText: { fontSize: 11, fontWeight: '800', color: '#B45309', marginLeft: 4 },
  
  providerAbout: { fontSize: 14, color: '#4B5563', lineHeight: 22, marginBottom: 16 },
  
  actionRow: { flexDirection: "row", gap: 12 },
  actionBtn: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 8, borderRadius: 100, backgroundColor: Colors.primaryLight, borderWidth: 1, borderColor: "#E0E7FF" },
  actionBtnText: { fontSize: 13, fontWeight: "700", color: Colors.primary },
  
  emptyState: { alignItems: 'center', justifyContent: 'center', padding: 40, paddingTop: 60 },
  emptyIconBox: { width: 96, height: 96, borderRadius: 48, backgroundColor: Colors.primaryLight, alignItems: "center", justifyContent: "center", marginBottom: 24 },
  emptyTitle: { fontSize: 20, fontWeight: '800', color: '#111827', marginTop: 12 },
  emptySub: { fontSize: 15, color: '#6B7280', textAlign: 'center', marginTop: 8, lineHeight: 24 },
  
  fab: { position: 'absolute', bottom: 24, right: 24, shadowColor: '#4F46E5', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 8 },
  fabGradient: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 14, borderRadius: 100 },
  fabText: { color: '#FFFFFF', fontWeight: '800', fontSize: 15, marginLeft: 8 }
});
