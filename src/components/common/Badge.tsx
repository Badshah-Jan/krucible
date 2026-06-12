import React from "react";
import { View, Text, StyleSheet, ViewStyle, TextStyle } from "react-native";

interface BadgeProps {
  count: number;
  maxCount?: number;
  color?: string;
  textColor?: string;
  style?: ViewStyle;
  textStyle?: TextStyle;
  visible?: boolean;
}

export default function Badge({
  count,
  maxCount = 99,
  color = "#EF4444", // Neighborly Primary/Danger Red
  textColor = "#FFFFFF",
  style,
  textStyle,
  visible = true,
}: BadgeProps) {
  if (!visible || count <= 0) return null;

  const displayCount = count > maxCount ? `${maxCount}+` : count.toString();

  return (
    <View style={[styles.badge, { backgroundColor: color }, style]}>
      <Text style={[styles.badgeText, { color: textColor }, textStyle]}>
        {displayCount}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    position: "absolute",
    top: -4,
    right: -8,
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: "#FFFFFF",
    paddingHorizontal: 4,
    zIndex: 10,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: "800",
  },
});
