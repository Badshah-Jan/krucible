import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { UI } from '@/store/uiStore';
import { SecurityService } from '@/services/securityService';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';

export default function PremiumBenefitsScreen() {
  const router = useRouter();
  const { id, type } = useLocalSearchParams();

  const handlePurchase = () => {
    if (!id || !type) return;

    UI.confirm(
      "Confirm Purchase",
      "Upgrade this to Premium for $9.99/mo?",
      async () => {
        try {
          await SecurityService.requestPremiumUpgrade(
            type === 'service' ? 'service' : 'business',
            id as string,
          );
          UI.toast(
            "Request Submitted",
            "success",
            "Your premium upgrade request is pending admin approval.",
          );
          router.back();
        } catch (e: any) {
          console.error(e);
          UI.toast("Error", "error", e?.message || "Failed to submit upgrade request.");
        }
      },
      "Subscribe",
      "warning"
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: "#F8F9FA" }}>
      <StatusBar barStyle="dark-content" />
      
      <SafeAreaView style={{ flex: 1 }} edges={["top", "bottom"]}>
        {/* Header */}
        <View style={styles.premiumHeader}>
          <TouchableOpacity onPress={() => router.back()} style={styles.premiumBackBtn}>
            <Ionicons name="close" size={28} color="#111827" />
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.premiumScroll} showsVerticalScrollIndicator={false}>
          <Animated.View entering={FadeInUp.duration(600).springify()} style={styles.premiumHero}>
            <LinearGradient colors={["#F59E0B", "#D97706"]} style={styles.premiumIconBg}>
              <Ionicons name="star" size={48} color="#FFFFFF" />
            </LinearGradient>
            <View style={styles.premiumBadge}>
              <Ionicons name="star" size={14} color="#D97706" />
              <Text style={styles.premiumBadgeText}>Neighborly Premium</Text>
            </View>
            <Text style={styles.premiumTitle}>Upgrade to Premium</Text>
            <Text style={styles.premiumSubtitle}>
              Supercharge your local visibility. Get featured placement and rank higher in local searches.
            </Text>
          </Animated.View>

          <Animated.View entering={FadeInDown.duration(600).delay(200).springify()} style={styles.benefitsContainer}>
            <View style={styles.benefitRow}>
              <View style={styles.benefitIcon}>
                <Ionicons name="rocket" size={16} color="#059669" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.benefitTitle}>Featured Placement</Text>
                <Text style={styles.benefitDesc}>Appear in the exclusive 'Featured Providers' section on the Home feed.</Text>
              </View>
            </View>

            <View style={styles.benefitRow}>
              <View style={styles.benefitIcon}>
                <Ionicons name="search" size={16} color="#059669" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.benefitTitle}>Search Priority</Text>
                <Text style={styles.benefitDesc}>Rank above standard free listings in local searches.</Text>
              </View>
            </View>

            <View style={styles.benefitRow}>
              <View style={styles.benefitIcon}>
                <Ionicons name="checkmark-circle" size={16} color="#059669" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.benefitTitle}>Verified Badge</Text>
                <Text style={styles.benefitDesc}>Unlock the ability to request a blue Verified Badge for instant trust.</Text>
              </View>
            </View>
            
            <View style={styles.benefitRow}>
              <View style={styles.benefitIcon}>
                <Ionicons name="bar-chart" size={16} color="#059669" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.benefitTitle}>Analytics Dashboard</Text>
                <Text style={styles.benefitDesc}>See exactly how many neighbors view your profile.</Text>
              </View>
            </View>
          </Animated.View>
        </ScrollView>

        {/* Footer Action */}
        <Animated.View entering={FadeInDown.duration(600).delay(400).springify()} style={styles.premiumFooter}>
          <Text style={styles.premiumCancelText}>$9.99/month. Cancel anytime. No commitment.</Text>
          <TouchableOpacity 
            activeOpacity={0.9}
            onPress={handlePurchase}
          >
            <LinearGradient colors={["#F59E0B", "#D97706"]} style={styles.premiumBtn} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
              <Text style={styles.premiumBtnText}>Subscribe Now</Text>
              <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
            </LinearGradient>
          </TouchableOpacity>
        </Animated.View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  premiumHeader: { flexDirection: "row", paddingHorizontal: 20, paddingTop: 10, justifyContent: "flex-end" },
  premiumBackBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: "#FFFFFF", alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "#E5E7EB" },
  premiumScroll: { flexGrow: 1, paddingHorizontal: 24, paddingBottom: 40 },
  premiumHero: { alignItems: "center", marginTop: 20 },
  premiumIconBg: { width: 100, height: 100, borderRadius: 32, alignItems: "center", justifyContent: "center", marginBottom: 24, shadowColor: "#F59E0B", shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.3, shadowRadius: 20, elevation: 10 },
  premiumBadge: { flexDirection: "row", alignItems: "center", backgroundColor: "#FEF3C7", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 100, marginBottom: 16, borderWidth: 1, borderColor: "#FDE68A" },
  premiumBadgeText: { color: "#D97706", fontSize: 12, fontWeight: "700", marginLeft: 6, textTransform: "uppercase", letterSpacing: 0.5 },
  premiumTitle: { fontSize: 32, fontWeight: "800", color: "#111827", marginBottom: 12, textAlign: "center" },
  premiumSubtitle: { fontSize: 16, color: "#6B7280", textAlign: "center", lineHeight: 24, paddingHorizontal: 10 },
  
  benefitsContainer: { marginTop: 40, backgroundColor: "#FFFFFF", borderRadius: 24, padding: 24, borderWidth: 1, borderColor: "#E5E7EB", shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  benefitRow: { flexDirection: "row", alignItems: "flex-start", marginBottom: 24 },
  benefitIcon: { width: 28, height: 28, borderRadius: 14, backgroundColor: "#D1FAE5", alignItems: "center", justifyContent: "center", marginRight: 16, marginTop: 2 },
  benefitTitle: { fontSize: 16, fontWeight: "700", color: "#111827", marginBottom: 4 },
  benefitDesc: { fontSize: 14, color: "#6B7280", lineHeight: 20 },
  
  premiumFooter: { paddingHorizontal: 24, paddingBottom: 10, paddingTop: 20, borderTopWidth: 1, borderTopColor: "#E5E7EB", backgroundColor: "#FFFFFF" },
  premiumCancelText: { color: "#6B7280", fontSize: 13, textAlign: "center", marginBottom: 16 },
  premiumBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", paddingVertical: 18, borderRadius: 100, shadowColor: "#F59E0B", shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.3, shadowRadius: 15, elevation: 8 },
  premiumBtnText: { color: "#FFFFFF", fontSize: 18, fontWeight: "800", marginRight: 8 },
});
