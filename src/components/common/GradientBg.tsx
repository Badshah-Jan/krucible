import React from 'react';
import { StyleSheet, View, ViewStyle, StatusBar } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

interface GradientBgProps {
  children: React.ReactNode;
  style?: ViewStyle;
}

export default function GradientBg({ children, style }: GradientBgProps) {
  return (
    <LinearGradient
      colors={['#0B0E14', '#111827', '#0B0E14']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[{ flex: 1 }, style]}
    >
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      {children}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
