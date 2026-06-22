import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React from "react";
import { useTranslation } from "react-i18next";
import {
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { useUnreadChats } from "@/hooks/useUnreadChats";
import { Colors } from "@/constants/colors";

export default function TabBar({ state, descriptors, navigation }: any) {
  const router = useRouter();
  const { t } = useTranslation();
  const unreadChatsCount = useUnreadChats();

  const pulseOpacity = useSharedValue(1);
  const pulseScale = useSharedValue(1);

  React.useEffect(() => {
    pulseOpacity.value = withRepeat(
      withSequence(
        withTiming(0.7, { duration: 900 }),
        withTiming(1, { duration: 900 }),
      ),
      -1,
      true,
    );
    pulseScale.value = withRepeat(
      withSequence(
        withTiming(1.08, { duration: 900 }),
        withTiming(1.0, { duration: 900 }),
      ),
      -1,
      true,
    );
  }, []);

  const pulseRingStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
    opacity: pulseOpacity.value,
  }));

  return (
    <View style={styles.tabContainer}>
      {state.routes.map((route: any, index: number) => {
        const isFocused = state.index === index;

        const onPress = () => {
          const event = navigation.emit({
            type: "tabPress",
            target: route.key,
            canPreventDefault: true,
          });
          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(route.name);
          }
        };

        // ── SOS Button (center) ───────────────────────────────────────────
        if (route.name === "sos-dummy") {
          return (
            <View key="sos-btn" style={styles.sosWrapper}>
              {/* Pulse ring */}
              <Animated.View style={[styles.pulseRing, pulseRingStyle]} />
              <Pressable
                onPress={() => router.push("/sos")}
                style={styles.sosButton}
              >
                <Ionicons name="alert-circle" size={20} color="#FFFFFF" />
                <Text style={styles.sosLabel}>{t("sos", "SOS")}</Text>
              </Pressable>
            </View>
          );
        }

        let iconName: any = "home-outline";
        let label = t("home", "Home");

        if (route.name === "index") {
          iconName = isFocused ? "home" : "home-outline";
          label = t("home", "Home");
        } else if (route.name === "explore") {
          iconName = isFocused ? "map" : "map-outline";
          label = t("nearby", "Nearby");
        } else if (route.name === "chats") {
          iconName = isFocused ? "chatbubble-ellipses" : "chatbubble-ellipses-outline";
          label = t("chats", "Chats");
        } else if (route.name === "profile") {
          iconName = isFocused ? "person" : "person-outline";
          label = t("profile", "Profile");
        }

        return (
          <Pressable key={route.key} onPress={onPress} style={styles.tabItem}>
            <View style={styles.iconWrap}>
              {isFocused && <View style={styles.activeIndicator} />}
              <Ionicons
                name={iconName}
                size={22}
                color={isFocused ? Colors.primary : Colors.textSecondary}
              />
              {route.name === "chats" && unreadChatsCount > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>
                    {unreadChatsCount > 9 ? "9+" : unreadChatsCount}
                  </Text>
                </View>
              )}
            </View>
            <Text
              style={[
                styles.tabLabel,
                { color: isFocused ? Colors.primary : Colors.textSecondary },
                isFocused && styles.tabLabelActive,
              ]}
            >
              {label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  tabContainer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingTop: 6,
    paddingBottom: Platform.OS === "ios" ? 26 : 8,
    height: Platform.OS === "ios" ? 84 : 66,
    alignItems: "flex-start",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 16,
    zIndex: 100,
  },
  tabItem: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 2,
  },
  iconWrap: {
    width: 44,
    height: 28,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  activeIndicator: {
    position: "absolute",
    top: 0,
    left: "50%",
    marginLeft: -10,
    width: 20,
    height: 3,
    borderRadius: 2,
    backgroundColor: Colors.primary,
  },
  badge: {
    position: "absolute",
    top: -3,
    right: -2,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: Colors.danger,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 3,
    borderWidth: 1.5,
    borderColor: "#FFFFFF",
  },
  badgeText: { color: "#FFFFFF", fontSize: 9, fontWeight: "800" },
  tabLabel: {
    fontSize: 10,
    fontWeight: "500",
    marginTop: 3,
    letterSpacing: 0.1,
  },
  tabLabelActive: { fontWeight: "700" },

  // SOS
  sosWrapper: {
    width: 64,
    alignItems: "center",
    justifyContent: "center",
    marginTop: -20,
  },
  pulseRing: {
    position: "absolute",
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: Colors.danger,
    opacity: 0.15,
  },
  sosButton: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: Colors.danger,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: Colors.danger,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 8,
    borderWidth: 2.5,
    borderColor: "#FFFFFF",
    gap: 1,
  },
  sosLabel: {
    color: "#FFFFFF",
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 0.5,
  },
});
