import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, StatusBar, Image } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import BusinessService, { BusinessProfile, BUSINESS_CATEGORIES } from "@/services/businessService";
import { useAppStore } from "@/store/appStore";

export default function BusinessesScreen() {
  const router = useRouter();
  const community = useAppStore(s => s.community);
  const [businesses, setBusinesses] = useState<BusinessProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>("All");

  useEffect(() => {
    loadBusinesses();
  }, [community?.communityId, selectedCategory]);

  const loadBusinesses = async () => {
    if (!community?.communityId) return;
    setLoading(true);
    try {
      const results = await BusinessService.getBusinessesByCommunity(community.communityId, selectedCategory);
      setBusinesses(results);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const renderBusiness = ({ item }: { item: BusinessProfile }) => (
    <TouchableOpacity 
      style={styles.card} 
      onPress={() => router.push(`/businesses/${item.id}` as any)}
      activeOpacity={0.8}
    >
      <View style={styles.cardContent}>
        <View style={styles.cardHeader}>
          <Text style={styles.name}>{item.businessName}</Text>
          <View style={styles.badges}>
            {item.featured && (
              <View style={[styles.badge, { backgroundColor: '#F59E0B' }]}>
                <Ionicons name="star" size={10} color="#FFFFFF" style={{ marginRight: 2 }} />
                <Text style={styles.badgeText}>Featured</Text>
              </View>
            )}
            {item.verified && (
              <View style={[styles.badge, { backgroundColor: '#10B981' }]}>
                <Ionicons name="checkmark-circle" size={10} color="#FFFFFF" style={{ marginRight: 2 }} />
                <Text style={styles.badgeText}>Verified</Text>
              </View>
            )}
          </View>
        </View>
        <Text style={styles.category}>{item.category}</Text>
        <Text style={styles.address} numberOfLines={1}>
          <Ionicons name="location-outline" size={12} /> {item.address}
        </Text>
        <Text style={styles.description} numberOfLines={2}>{item.description}</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" backgroundColor="#F8F9FA" />
      <SafeAreaView style={{ flex: 1 }} edges={["top"]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color="#111827" />
          </TouchableOpacity>
          <Text style={styles.title}>Local Businesses</Text>
          <TouchableOpacity onPress={() => router.push("/businesses/register" as any)}>
            <Ionicons name="add-circle" size={28} color="#EF4444" />
          </TouchableOpacity>
        </View>

        <View style={styles.categories}>
          <FlatList
            horizontal
            showsHorizontalScrollIndicator={false}
            data={["All", ...BUSINESS_CATEGORIES]}
            contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[styles.catBtn, selectedCategory === item && styles.catBtnActive]}
                onPress={() => setSelectedCategory(item)}
              >
                <Text style={[styles.catText, selectedCategory === item && styles.catTextActive]}>
                  {item}
                </Text>
              </TouchableOpacity>
            )}
          />
        </View>

        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color="#EF4444" />
          </View>
        ) : (
          <FlatList
            data={businesses}
            keyExtractor={item => item.id!}
            renderItem={renderBusiness}
            contentContainerStyle={styles.list}
            ListEmptyComponent={
              <View style={styles.center}>
                <Ionicons name="storefront-outline" size={48} color="#D1D5DB" />
                <Text style={styles.emptyTitle}>No businesses found</Text>
                <Text style={styles.emptySub}>No local businesses registered in this category yet.</Text>
              </View>
            }
          />
        )}
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#F8F9FA" },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 12 },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: "#FFFFFF", alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "#E5E7EB" },
  title: { fontSize: 18, fontWeight: "700", color: "#111827" },
  categories: { paddingVertical: 12 },
  catBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "#E5E7EB" },
  catBtnActive: { backgroundColor: "#EF4444", borderColor: "#EF4444" },
  catText: { fontSize: 14, fontWeight: "600", color: "#6B7280" },
  catTextActive: { color: "#FFFFFF" },
  list: { padding: 16, gap: 12 },
  card: { backgroundColor: "#FFFFFF", borderRadius: 16, padding: 16, borderWidth: 1, borderColor: "#E5E7EB" },
  cardContent: { flex: 1 },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 4 },
  name: { fontSize: 16, fontWeight: "700", color: "#111827", flex: 1 },
  badges: { flexDirection: "row", gap: 4 },
  badge: { flexDirection: "row", alignItems: "center", paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8 },
  badgeText: { fontSize: 10, fontWeight: "700", color: "#FFFFFF" },
  category: { fontSize: 13, fontWeight: "600", color: "#EF4444", marginBottom: 8 },
  address: { fontSize: 13, color: "#6B7280", marginBottom: 8 },
  description: { fontSize: 14, color: "#374151", lineHeight: 20 },
  emptyTitle: { fontSize: 18, fontWeight: "700", color: "#111827", marginTop: 16 },
  emptySub: { fontSize: 14, color: "#6B7280", marginTop: 8, textAlign: "center", paddingHorizontal: 32 },
});
