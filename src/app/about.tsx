import React from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Linking } from "react-native";
import { Stack, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";

export default function AboutScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.root} edges={["top", "bottom"]}>
      <Stack.Screen options={{ headerShown: false }} />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#0F172A" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>About Neighborly</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Logo/Branding Header */}
        <View style={styles.brandingHeader}>
          <View style={styles.logoBox}>
            <Ionicons name="home" size={40} color="#4F46E5" />
          </View>
          <Text style={styles.appName}>Neighborly</Text>
          <Text style={styles.appVersion}>Version 1.0.0</Text>
        </View>

        {/* Mission Statement */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Our Mission</Text>
          <Text style={styles.bodyText}>
            Neighborly is built to connect communities, foster local trust, and provide a secure platform for residents to help one another. Whether it's an emergency SOS, a local marketplace, or just a quick chat with the person next door—we believe that stronger neighborhoods make for a better world.
          </Text>
        </View>

        {/* Links */}
        <View style={styles.linksCard}>
          <TouchableOpacity style={styles.linkRow} onPress={() => Linking.openURL('https://example.com/terms')}>
            <Ionicons name="document-text-outline" size={20} color="#4F46E5" />
            <Text style={styles.linkText}>Terms of Service</Text>
            <Ionicons name="chevron-forward" size={16} color="#CBD5E1" style={{ marginLeft: "auto" }} />
          </TouchableOpacity>
          <View style={styles.divider} />
          
          <TouchableOpacity style={styles.linkRow} onPress={() => Linking.openURL('https://example.com/privacy')}>
            <Ionicons name="shield-checkmark-outline" size={20} color="#10B981" />
            <Text style={styles.linkText}>Privacy Policy</Text>
            <Ionicons name="chevron-forward" size={16} color="#CBD5E1" style={{ marginLeft: "auto" }} />
          </TouchableOpacity>
          <View style={styles.divider} />

          <TouchableOpacity style={styles.linkRow} onPress={() => Linking.openURL('https://example.com/guidelines')}>
            <Ionicons name="people-outline" size={20} color="#8B5CF6" />
            <Text style={styles.linkText}>Community Guidelines</Text>
            <Ionicons name="chevron-forward" size={16} color="#CBD5E1" style={{ marginLeft: "auto" }} />
          </TouchableOpacity>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>Made with ❤️ for communities.</Text>
          <Text style={styles.copyright}>© {new Date().getFullYear()} Neighborly Inc. All rights reserved.</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#F8FAFC" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#0F172A",
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  brandingHeader: {
    alignItems: "center",
    marginBottom: 32,
    marginTop: 20,
  },
  logoBox: {
    width: 80,
    height: 80,
    borderRadius: 24,
    backgroundColor: "#EEF2FF",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#E0E7FF",
  },
  appName: {
    fontSize: 28,
    fontWeight: "900",
    color: "#0F172A",
    marginBottom: 4,
  },
  appVersion: {
    fontSize: 14,
    color: "#64748B",
    fontWeight: "600",
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 24,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 10,
    elevation: 2,
    borderWidth: 1,
    borderColor: "#F1F5F9",
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#0F172A",
    marginBottom: 12,
  },
  bodyText: {
    fontSize: 15,
    color: "#475569",
    lineHeight: 24,
  },
  linksCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    paddingHorizontal: 20,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 10,
    elevation: 2,
    borderWidth: 1,
    borderColor: "#F1F5F9",
    marginBottom: 32,
  },
  linkRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 18,
  },
  linkText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#0F172A",
    marginLeft: 12,
  },
  divider: {
    height: 1,
    backgroundColor: "#F1F5F9",
  },
  footer: {
    alignItems: "center",
  },
  footerText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#64748B",
    marginBottom: 4,
  },
  copyright: {
    fontSize: 12,
    color: "#94A3B8",
  },
});
