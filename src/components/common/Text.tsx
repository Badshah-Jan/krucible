import React from "react";
import {
    Text as RNText,
    TextProps as RNTextProps,
    StyleSheet,
} from "react-native";

const COLORS = {
  white: "#FFFFFF",
  gray: "#9CA3AF", // slate-400
  purple: "#3B82F6", // Mapped to blue
  pink: "#60A5FA", // Mapped to light blue
  blue: "#2563EB", // Royal Blue
  red: "#DC2626", // Professional Red
};

const VARIANT_STYLES = StyleSheet.create({
  h1: { fontSize: 30, fontWeight: "bold", letterSpacing: -0.5 },
  h2: { fontSize: 20, fontWeight: "bold", letterSpacing: 0.5 },
  h3: { fontSize: 18, fontWeight: "600" },
  bodyBold: { fontSize: 16, fontWeight: "600" },
  body: { fontSize: 16, fontWeight: "400", lineHeight: 24 },
  captionBold: { fontSize: 12, fontWeight: "600" },
  caption: { fontSize: 12, fontWeight: "400", lineHeight: 16 },
  error: { fontSize: 14, fontWeight: "500", color: "#EF4444" },
});

interface TextProps extends RNTextProps {
  variant?:
    | "h1"
    | "h2"
    | "h3"
    | "body"
    | "bodyBold"
    | "caption"
    | "captionBold"
    | "error";
  color?: "white" | "gray" | "purple" | "pink" | "blue" | "red";
}

export default function Text({
  children,
  variant = "body",
  color = "white",
  style,
  ...props
}: TextProps) {
  return (
    <RNText
      style={[VARIANT_STYLES[variant], { color: COLORS[color] }, style]}
      {...props}
    >
      {children}
    </RNText>
  );
}
