import React, { useEffect, useState } from 'react';
import { View, ScrollView, TouchableOpacity, StyleSheet, FlatList, ActivityIndicator, TextInput, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import Text from '@/components/common/Text';
import ProviderService, { CATEGORIES, ServiceProvider } from '@/services/providerService';
import { useAppStore } from '@/store/appStore';
import { AuthService } from '@/services/authService';

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

  const filteredServices = services.filter((s) => 
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.about.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <View style={styles.root}>
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color="#111827" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Local Services</Text>
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

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
          {/* Categories */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoriesScroll}>
            <TouchableOpacity
              style={[styles.categoryPill, selectedCategory === 'All' && styles.categoryPillActive]}
              onPress={() => setSelectedCategory('All')}
            >
              <Text style={[styles.categoryText, selectedCategory === 'All' && styles.categoryTextActive]}>All</Text>
            </TouchableOpacity>
            {CATEGORIES.map((cat) => (
              <TouchableOpacity
                key={cat}
                style={[styles.categoryPill, selectedCategory === cat && styles.categoryPillActive]}
                onPress={() => setSelectedCategory(cat)}
              >
                <Text style={[styles.categoryText, selectedCategory === cat && styles.categoryTextActive]}>{cat}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Provider List */}
          <View style={styles.listContainer}>
            {loading ? (
              <ActivityIndicator size="large" color="#4F46E5" style={{ marginTop: 50 }} />
            ) : filteredServices.length > 0 ? (
              filteredServices.map((provider) => (
                <TouchableOpacity 
                  key={provider.id} 
                  style={styles.providerCard}
                  activeOpacity={0.8}
                  onPress={() => router.push(`/services/${provider.id}` as any)}
                >
                  <View style={styles.providerHeader}>
                    <View style={styles.avatar}>
                      <Ionicons name="person" size={24} color="#4F46E5" />
                      {provider.isAvailable && <View style={styles.onlineDot} />}
                    </View>
                    <View style={{ flex: 1, marginLeft: 12 }}>
                      <Text style={styles.providerName}>{provider.name}</Text>
                      <Text style={styles.providerCat}>{provider.category}</Text>
                    </View>
                    <View style={styles.ratingBadge}>
                      <Ionicons name="star" size={12} color="#F59E0B" />
                      <Text style={styles.ratingText}>{provider.rating ? provider.rating.toFixed(1) : 'New'}</Text>
                    </View>
                  </View>
                  <Text style={styles.providerAbout} numberOfLines={2}>{provider.about}</Text>
                </TouchableOpacity>
              ))
            ) : (
              <View style={styles.emptyState}>
                <Ionicons name="construct-outline" size={48} color="#D1D5DB" />
                <Text style={styles.emptyTitle}>No Providers Found</Text>
                <Text style={styles.emptySub}>We couldn't find any services matching your criteria.</Text>
              </View>
            )}
          </View>
        </ScrollView>

        {/* Floating Action Button */}
        {!hasProviderProfile && (
          <TouchableOpacity 
            style={styles.fab} 
            activeOpacity={0.9}
            onPress={() => router.push('/services/register' as any)}
          >
            <Ionicons name="briefcase-outline" size={20} color="#FFFFFF" />
            <Text style={styles.fabText}>Offer a Service</Text>
          </TouchableOpacity>
        )}
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F8F9FA' },
  header: { flexDirection: 'row', alignItems: 'center', padding: 16 },
  backBtn: { marginRight: 16 },
  headerTitle: { fontSize: 20, fontWeight: '800', color: '#111827' },
  searchContainer: { paddingHorizontal: 16, marginBottom: 12 },
  searchBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', paddingHorizontal: 12, borderRadius: 12, borderWidth: 1, borderColor: '#E5E7EB', height: 44 },
  searchInput: { flex: 1, marginLeft: 8, fontSize: 14, color: '#111827' },
  categoriesScroll: { paddingHorizontal: 16, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: '#F3F4F6', marginBottom: 16 },
  categoryPill: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E5E7EB', marginRight: 8 },
  categoryPillActive: { backgroundColor: '#4F46E5', borderColor: '#4F46E5' },
  categoryText: { fontSize: 13, fontWeight: '600', color: '#6B7280' },
  categoryTextActive: { color: '#FFFFFF' },
  listContainer: { paddingHorizontal: 16 },
  providerCard: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#E5E7EB', elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3 },
  providerHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  avatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#EEF2FF', alignItems: 'center', justifyContent: 'center', position: 'relative' },
  onlineDot: { position: 'absolute', bottom: 0, right: 0, width: 12, height: 12, borderRadius: 6, backgroundColor: '#10B981', borderWidth: 2, borderColor: '#FFFFFF' },
  providerName: { fontSize: 15, fontWeight: '700', color: '#111827' },
  providerCat: { fontSize: 12, color: '#6B7280', marginTop: 2 },
  ratingBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FEF3C7', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  ratingText: { fontSize: 12, fontWeight: '700', color: '#B45309', marginLeft: 4 },
  providerAbout: { fontSize: 13, color: '#4B5563', lineHeight: 18 },
  emptyState: { alignItems: 'center', justifyContent: 'center', padding: 40 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: '#4B5563', marginTop: 12 },
  emptySub: { fontSize: 13, color: '#9CA3AF', textAlign: 'center', marginTop: 8 },
  fab: { position: 'absolute', bottom: 24, right: 24, backgroundColor: '#4F46E5', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 14, borderRadius: 100, shadowColor: '#4F46E5', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 8 },
  fabText: { color: '#FFFFFF', fontWeight: '700', fontSize: 14, marginLeft: 8 }
});
