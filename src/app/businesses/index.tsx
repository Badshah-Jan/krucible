import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, StatusBar, Linking } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import Animated, { FadeInDown } from "react-native-reanimated";
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

  const handleCall = (phone: string, id: string) => {
    BusinessService.trackContactClick(id);
    Linking.openURL(`tel:${phone}`);
  };

  const handleWebsite = (url: string, id: string) => {
    BusinessService.trackContactClick(id);
    Linking.openURL(url);
  };

  const renderBusiness = React.useCallback(({ item, index }: { item: BusinessProfile; index: number }) => {
    return (
      <MemoizedBusinessItem 
        item={item} 
        index={index} 
        onCall={handleCall} 
        onWeb={handleWebsite} 
        onPress={() => router.push(`/businesses/${item.id}` as any)} 
      />
    );
  }, []);

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" backgroundColor="#F8F9FA" translucent={false} />
      <SafeAreaView style={{ flex: 1 }} edges={["top"]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color="#111827" />
          </TouchableOpacity>
          <Text style={styles.title}>Local Businesses</Text>
          <TouchableOpacity onPress={() => router.push("/businesses/register" as any)} style={styles.addBtn}>
            <Ionicons name="add" size={24} color="#EF4444" />
          </TouchableOpacity>
        </View>

        <View style={styles.categories}>
          <FlatList
            horizontal
            showsHorizontalScrollIndicator={false}
            data={["All", ...BUSINESS_CATEGORIES]}
            contentContainerStyle={{ paddingHorizontal: 16, gap: 10 }}
            renderItem={({ item }) => {
              const isActive = selectedCategory === item;
              return (
                <TouchableOpacity onPress={() => setSelectedCategory(item)} activeOpacity={0.7}>
                  {isActive ? (
                    <LinearGradient colors={["#EF4444", "#DC2626"]} style={styles.catBtnActive} start={{x:0, y:0}} end={{x:1, y:0}}>
                      <Text style={styles.catTextActive}>{item}</Text>
                    </LinearGradient>
                  ) : (
                    <View style={styles.catBtn}>
                      <Text style={styles.catText}>{item}</Text>
                    </View>
                  )}
                </TouchableOpacity>
              );
            }}
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
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <View style={styles.centerEmpty}>
                <View style={styles.emptyIconBox}>
                  <Ionicons name="storefront" size={48} color="#EF4444" />
                </View>
                <Text style={styles.emptyTitle}>No businesses found</Text>
                <Text style={styles.emptySub}>No local businesses registered in this category yet. Be the first!</Text>
                <TouchableOpacity style={styles.emptyBtn} onPress={() => router.push("/businesses/register" as any)}>
                  <Text style={styles.emptyBtnText}>Register Business</Text>
                </TouchableOpacity>
              </View>
            }
          />
        )}
      </SafeAreaView>
    </View>
  );
}

const MemoizedBusinessItem = React.memo(({ item, index, onCall, onWeb, onPress }: any) => {
  return (
    <Animated.View entering={FadeInDown.duration(400).delay(index * 100).springify()}>
      <TouchableOpacity 
        style={styles.card} 
        onPress={onPress}
        activeOpacity={0.8}
      >
        <CardContent item={item} onCall={onCall} onWeb={onWeb} />
      </TouchableOpacity>
    </Animated.View>
  );
}, (prev, next) => prev.item.id === next.item.id && prev.item.businessName === next.item.businessName);

const CardContent = React.memo(({ item, onCall, onWeb }: { item: BusinessProfile; onCall: any; onWeb: any }) => {
  return (
    <View style={styles.cardContent}>
      <View style={styles.cardHeader}>
        <View style={{ flex: 1 }}>
          <Text style={styles.name} numberOfLines={1}>{item.businessName}</Text>
          <Text style={styles.category} numberOfLines={1}>{item.category}</Text>
        </View>
        <View style={styles.badges}>
          {item.isVerified && (
            <View style={[styles.badge, { backgroundColor: '#D1FAE5', borderColor: '#A7F3D0', borderWidth: 1 }]}>
              <Ionicons name="checkmark-circle" size={10} color="#059669" style={{ marginRight: 2 }} />
              <Text style={[styles.badgeText, { color: '#059669' }]}>VERIFIED</Text>
            </View>
          )}
        </View>
      </View>
      
      <View style={styles.addressRow}>
        <Ionicons name="location" size={14} color="#6B7280" style={{ marginRight: 4 }} />
        <Text style={styles.address} numberOfLines={1}>{item.address}</Text>
      </View>
      
      <Text style={styles.description} numberOfLines={2}>{item.description}</Text>

      {/* Inline Actions */}
      <View style={styles.actionRow}>
        {item.phone ? (
          <TouchableOpacity 
            style={styles.actionBtn} 
            onPress={() => onCall(item.phone, item.id)}
          >
            <Ionicons name="call" size={14} color="#EF4444" style={{ marginRight: 6 }} />
            <Text style={styles.actionBtnText}>Call</Text>
          </TouchableOpacity>
        ) : null}
        
        {item.website ? (
          <TouchableOpacity 
            style={styles.actionBtn} 
            onPress={() => onWeb(item.website, item.id)}
          >
            <Ionicons name="globe" size={14} color="#EF4444" style={{ marginRight: 6 }} />
            <Text style={styles.actionBtnText}>Website</Text>
          </TouchableOpacity>
        ) : null}
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#F8F9FA" },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  centerEmpty: { flex: 1, alignItems: "center", justifyContent: "center", paddingTop: 60, paddingHorizontal: 32 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8 },
  backBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: "#FFFFFF", alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "#E5E7EB" },
  addBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: "#FEE2E2", alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "#FCA5A5" },
  title: { fontSize: 20, fontWeight: "800", color: "#111827" },
  
  categories: { paddingVertical: 16 },
  catBtn: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 100, backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "#E5E7EB" },
  catBtnActive: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 100, shadowColor: "#EF4444", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 },
  catText: { fontSize: 14, fontWeight: "600", color: "#6B7280" },
  catTextActive: { fontSize: 14, fontWeight: "700", color: "#FFFFFF" },
  
  list: { padding: 16, gap: 16, paddingBottom: 40 },
  card: { backgroundColor: "#FFFFFF", borderRadius: 24, padding: 20, borderWidth: 1, borderColor: "#E5E7EB", shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  premiumCard: { borderRadius: 24, padding: 20, borderWidth: 1, borderColor: "#FCD34D", shadowColor: "#F59E0B", shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.2, shadowRadius: 15, elevation: 5 },
  cardContent: { flex: 1 },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 },
  name: { fontSize: 18, fontWeight: "800", color: "#111827", marginBottom: 4 },
  category: { fontSize: 13, fontWeight: "600", color: "#EF4444" },
  badges: { flexDirection: "column", gap: 6, alignItems: 'flex-end', marginLeft: 12 },
  badge: { flexDirection: "row", alignItems: "center", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 100 },
  badgeText: { fontSize: 9, fontWeight: "800", letterSpacing: 0.5 },
  
  addressRow: { flexDirection: "row", alignItems: "center", marginBottom: 12, marginTop: 4 },
  address: { fontSize: 13, color: "#6B7280", flex: 1 },
  description: { fontSize: 14, color: "#4B5563", lineHeight: 22, marginBottom: 16 },
  
  actionRow: { flexDirection: "row", gap: 12 },
  actionBtn: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 8, borderRadius: 100, backgroundColor: "#FEF2F2", borderWidth: 1, borderColor: "#FEE2E2" },
  actionBtnText: { fontSize: 13, fontWeight: "700", color: "#EF4444" },
  
  emptyIconBox: { width: 96, height: 96, borderRadius: 48, backgroundColor: "#FEE2E2", alignItems: "center", justifyContent: "center", marginBottom: 24 },
  emptyTitle: { fontSize: 20, fontWeight: "800", color: "#111827", marginBottom: 8 },
  emptySub: { fontSize: 15, color: "#6B7280", textAlign: "center", lineHeight: 24, marginBottom: 32 },
  emptyBtn: { backgroundColor: "#EF4444", paddingHorizontal: 24, paddingVertical: 14, borderRadius: 100 },
  emptyBtnText: { color: "#FFFFFF", fontSize: 15, fontWeight: "700" }
});
