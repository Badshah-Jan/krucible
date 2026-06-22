/**
 * SafetyBanner — Compact safety notice shown in marketplace/provider contexts.
 *
 * Usage:
 *   <SafetyBanner type="marketplace" />
 *   <SafetyBanner type="chat" onDismiss={() => ...} />
 *   <SafetyBanner type="sos" />
 */
import React from "react";
import { View, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Text from "@/components/common/Text";

type BannerType = "marketplace" | "chat" | "sos" | "legal";

const BANNER_CONFIG: Record<
  BannerType,
  { icon: string; color: string; bg: string; border: string; title: string; body: string }
> = {
  marketplace: {
    icon: "shield-checkmark",
    color: "#D97706",
    bg: "#FFFBEB",
    border: "#FDE68A",
    title: "Safety Reminder",
    body: "Never send money in advance. Verify identity before payment. Meet in safe, public places.",
  },
  chat: {
    icon: "lock-closed",
    color: "#2563EB",
    bg: "#EFF6FF",
    border: "#BFDBFE",
    title: "Chat Safety",
    body: "Do not share passwords, banking details, or personal documents. Be cautious when sending money to anyone.",
  },
  sos: {
    icon: "warning",
    color: "#DC2626",
    bg: "#FEF2F2",
    border: "#FECACA",
    title: "Emergency Disclaimer",
    body: "Neighborly is not a replacement for emergency services (Police, Ambulance, Fire). For life-threatening emergencies, call your local emergency number immediately.",
  },
  legal: {
    icon: "information-circle",
    color: "#6B7280",
    bg: "#F9FAFB",
    border: "#E5E7EB",
    title: "Disclaimer",
    body: "Neighborly connects community members but is not responsible for private transactions, agreements, services, or disputes between users.",
  },
};

interface Props {
  type: BannerType;
  onDismiss?: () => void;
}

export default function SafetyBanner({ type, onDismiss }: Props) {
  const cfg = BANNER_CONFIG[type];

  return (
    <View style={[styles.container, { backgroundColor: cfg.bg, borderColor: cfg.border }]}>
      <View style={[styles.iconBox, { backgroundColor: cfg.color + "14" }]}>
        <Ionicons name={cfg.icon as any} size={18} color={cfg.color} />
      </View>
      <View style={styles.textBox}>
        <Text style={[styles.title, { color: cfg.color }]}>{cfg.title}</Text>
        <Text style={styles.body}>{cfg.body}</Text>
      </View>
      {onDismiss && (
        <TouchableOpacity onPress={onDismiss} style={styles.dismiss} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Ionicons name="close" size={16} color="#9CA3AF" />
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    marginBottom: 12,
    alignItems: "flex-start",
  },
  iconBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
    marginTop: 2,
  },
  textBox: { flex: 1 },
  title: {
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0.3,
    marginBottom: 4,
  },
  body: {
    fontSize: 12,
    color: "#4B5563",
    lineHeight: 18,
  },
  dismiss: {
    marginLeft: 8,
    marginTop: 2,
  },
});
