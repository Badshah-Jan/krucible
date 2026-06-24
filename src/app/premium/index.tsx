import React from "react";
import { View, StyleSheet, ScrollView, TouchableOpacity, SafeAreaView, StatusBar } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import Text from "@/components/common/Text";

const T = {
  bg: "#FFFFFF",
  card: "#FFFFFF",
  text: "#222222",
  textSecondary: "#717171",
  border: "#EBEBEB",
  primary: "#FF385C",
  surface: "#F7F7F7",
  gold: "#D4AF37",
};

export default function PremiumScreen() {
  const router = useRouter();

  const PREMIUM_FEATURES = [
    {
      id: "featured",
      title: "Featured Listings",
      description: "Pin your business or service to the top of the neighborhood directory.",
      icon: "star-outline",
    },
    {
      id: "sponsored",
      title: "Sponsored Posts",
      description: "Reach more neighbors instantly with highlighted community posts.",
      icon: "megaphone-outline",
    },
    {
      id: "verification",
      title: "Business Verification",
      description: "Get the blue checkmark and build instant trust with your local community.",
      icon: "checkmark-circle-outline",
    },
    {
      id: "priority",
      title: "Priority Recommendations",
      description: "Show up first when neighbors ask for recommendations.",
      icon: "trending-up-outline",
    },
  ];

  return (
    <SafeAreaView style={s.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={24} color={T.text} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Premium</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        <View style={s.hero}>
          <View style={s.iconWrapper}>
            <Ionicons name="diamond" size={48} color={T.gold} />
          </View>
          <Text style={s.heroTitle}>Neighborly Premium</Text>
          <Text style={s.heroSubtitle}>
            Supercharge your local presence. Premium features for businesses and professionals are launching soon.
          </Text>
        </View>

        <View style={s.featuresList}>
          {PREMIUM_FEATURES.map((feat) => (
            <View key={feat.id} style={s.featureCard}>
              <View style={s.featureIconContainer}>
                <Ionicons name={feat.icon as any} size={24} color={T.primary} />
              </View>
              <View style={s.featureText}>
                <Text style={s.featureTitle}>{feat.title}</Text>
                <Text style={s.featureDesc}>{feat.description}</Text>
              </View>
              <View style={s.badge}>
                <Text style={s.badgeText}>Coming Soon</Text>
              </View>
            </View>
          ))}
        </View>

        <View style={s.notifyCard}>
          <Ionicons name="notifications-outline" size={24} color={T.text} />
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={s.notifyTitle}>Want early access?</Text>
            <Text style={s.notifyDesc}>We'll notify you when premium features become available in your neighborhood.</Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: T.bg },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: T.border,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: T.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: T.text,
  },
  content: {
    padding: 24,
    paddingBottom: 48,
  },
  hero: {
    alignItems: "center",
    marginBottom: 40,
    marginTop: 16,
  },
  iconWrapper: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: "#FFF9E6", // light gold
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
  },
  heroTitle: {
    fontSize: 28,
    fontWeight: "800",
    color: T.text,
    marginBottom: 12,
    textAlign: "center",
  },
  heroSubtitle: {
    fontSize: 16,
    color: T.textSecondary,
    textAlign: "center",
    lineHeight: 24,
  },
  featuresList: {
    gap: 16,
    marginBottom: 40,
  },
  featureCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: T.surface,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: T.border,
  },
  featureIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#FFF0F2",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 16,
  },
  featureText: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: T.text,
    marginBottom: 4,
  },
  featureDesc: {
    fontSize: 14,
    color: T.textSecondary,
    lineHeight: 20,
  },
  badge: {
    position: "absolute",
    top: -10,
    right: 16,
    backgroundColor: T.gold,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#FFFFFF",
    textTransform: "uppercase",
  },
  notifyCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: T.surface,
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: T.border,
  },
  notifyTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: T.text,
    marginBottom: 4,
  },
  notifyDesc: {
    fontSize: 14,
    color: T.textSecondary,
    lineHeight: 20,
  },
});
