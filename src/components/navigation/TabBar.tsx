import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React from "react";
import { useTranslation } from "react-i18next";
import {
    Platform,
    Pressable,
    StyleSheet,
    Text,
    View
} from "react-native";
import Animated, {
    useAnimatedStyle,
    useSharedValue,
    withRepeat,
    withSequence,
    withTiming,
} from "react-native-reanimated";
import { useUnreadChats } from "@/hooks/useUnreadChats";
import Badge from "@/components/common/Badge";

const T = {
  card: "#FFFFFF", // Clean white
  primary: "#EF4444", // Red/Coral
  danger: "#EF4444", // Red
  text: "#111827", // Slate 900
  textSecondary: "#9CA3AF", // Gray 400
  border: "#E5E7EB", // Slate 200
};

export default function TabBar({ state, descriptors, navigation }: any) {
  const router = useRouter();
  const { t } = useTranslation();
  const unreadChatsCount = useUnreadChats();

  const pulseScale = useSharedValue(1);

  React.useEffect(() => {
    pulseScale.value = withRepeat(
      withSequence(
        withTiming(1.08, { duration: 1000 }),
        withTiming(1.0, { duration: 1000 }),
      ),
      -1,
      true,
    );
  }, []);

  const animatedSOSStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: pulseScale.value }],
    };
  });

  return (
    <View style={styles.absoluteContainer}>
      <View style={styles.tabContainer}>
        {state.routes.map((route: any, index: number) => {
          const { options } = descriptors[route.key];
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

          if (route.name === "sos-dummy") {
            return (
              <View key="sos-button-wrapper" style={styles.sosWrapper}>
                <Animated.View style={[styles.sosAnimatedBg, animatedSOSStyle]}>
                  <Pressable
                    onPress={() => router.push("/sos")}
                    style={styles.sosButton}
                  >
                    <LinearGradient
                      colors={[T.primary, "#B91C1C"]}
                      style={styles.sosGradient}
                    >
                      <Text style={styles.sosText}>{t("sos", "SOS")}</Text>
                    </LinearGradient>
                  </Pressable>
                </Animated.View>
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
            iconName = isFocused
              ? "chatbubble-ellipses"
              : "chatbubble-ellipses-outline";
            label = t("chats", "Chats");
          } else if (route.name === "profile") {
            iconName = isFocused ? "person" : "person-outline";
            label = t("profile", "Profile");
          }

          return (
            <Pressable key={route.key} onPress={onPress} style={styles.tabItem}>
              <View>
                <Ionicons
                  name={iconName}
                  size={22}
                  color={isFocused ? T.primary : T.textSecondary}
                />
                {route.name === "chats" && (
                  <Badge count={unreadChatsCount} maxCount={99} />
                )}
              </View>
              <Text
                style={[
                  styles.tabLabel,
                  {
                    color: isFocused ? T.primary : T.textSecondary,
                    fontWeight: isFocused ? "800" : "500",
                  },
                ]}
              >
                {label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  absoluteContainer: {
    position: "absolute",
    bottom: Platform.OS === "ios" ? 28 : 20,
    left: 0,
    right: 0,
    backgroundColor: "transparent",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 100,
  },
  tabItem: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    height: "100%",
  },
  tabLabel: {
    fontSize: 10,
    marginTop: 4,
    letterSpacing: 0.2,
  },
  tabContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: T.card,
    borderWidth: 1,
    borderColor: T.border,
    borderRadius: 40,
    paddingHorizontal: 12,
    paddingVertical: 12,
    height: 76,
    width: "92%",
    alignSelf: "center",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  sosWrapper: {
    width: 56,
    height: 56,
    marginTop: -20,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 110,
  },
  sosAnimatedBg: {
    width: 52,
    height: 52,
    borderRadius: 26,
    shadowColor: T.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 6,
  },
  sosButton: {
    width: "100%",
    height: "100%",
    borderRadius: 26,
    overflow: "hidden",
    borderWidth: 2,
    borderColor: T.card,
  },
  sosGradient: {
    width: "100%",
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
  sosText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "900",
    letterSpacing: -0.5,
  },
});
