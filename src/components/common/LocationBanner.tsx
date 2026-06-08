/**
 * LocationBanner.tsx
 * Premium in-app GPS warning banner.
 * Slides in from top with spring animation when GPS is disabled.
 */

import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Platform,
  Linking,
  StyleSheet,
  TouchableOpacity,
  Text,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ExpoLocation from 'expo-location';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useAppStore } from '@/store/appStore';

const BANNER_HEIGHT = 80;

export default function LocationBanner() {
  const isGpsDisabled = useAppStore((state) => state.isGpsDisabled);
  const setGpsDisabled = useAppStore((state) => state.setGpsDisabled);
  const insets = useSafeAreaInsets();
  const [dismissed, setDismissed] = useState(false);
  const prevDisabled = useRef(false);

  useEffect(() => {
    if (isGpsDisabled && !prevDisabled.current) {
      setDismissed(false);
    }
    prevDisabled.current = isGpsDisabled;
  }, [isGpsDisabled]);

  const translateY = useSharedValue(-BANNER_HEIGHT - 60);
  const opacity = useSharedValue(0);
  const shouldShow = isGpsDisabled && !dismissed;

  useEffect(() => {
    if (shouldShow) {
      opacity.value = withTiming(1, { duration: 220 });
      translateY.value = withSpring(0, { damping: 18, stiffness: 120 });
    } else {
      opacity.value = withTiming(0, { duration: 180 });
      translateY.value = withTiming(-BANNER_HEIGHT - 60, { duration: 200 });
    }
  }, [shouldShow]);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: opacity.value,
  }));

  const handleEnable = async () => {
    if (Platform.OS === 'android') {
      try {
        await Linking.sendIntent('android.settings.LOCATION_SOURCE_SETTINGS');
      } catch {
        Linking.openSettings();
      }
    } else {
      Linking.openSettings();
    }
  };

  // Auto-dismiss when GPS returns
  useEffect(() => {
    if (!isGpsDisabled) return;
    const id = setInterval(async () => {
      try {
        const on = await ExpoLocation.hasServicesEnabledAsync();
        if (on) setGpsDisabled(false);
      } catch (_) {}
    }, 2000);
    return () => clearInterval(id);
  }, [isGpsDisabled]);

  if (!isGpsDisabled && !shouldShow) return null;

  const topPadding = insets.top > 0 ? insets.top + 8 : 44;

  return (
    <Animated.View style={[styles.wrapper, { top: topPadding }, animStyle]}>
      <View style={styles.banner}>
        {/* Left: Icon */}
        <View style={styles.iconWrap}>
          <Ionicons name="location-outline" size={20} color="#EF4444" />
        </View>

        {/* Center: Text */}
        <View style={styles.textWrap}>
          <Text style={styles.title}>Location Disabled</Text>
          <Text style={styles.subtitle}>Enable GPS to see your community feed</Text>
        </View>

        {/* Right: Actions */}
        <View style={styles.actionsCol}>
          <TouchableOpacity style={styles.enableBtn} onPress={handleEnable} activeOpacity={0.85}>
            <Text style={styles.enableBtnText}>Enable</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setDismissed(true)} hitSlop={12} style={styles.closeBtn}>
            <Ionicons name="close" size={14} color="#9CA3AF" />
          </TouchableOpacity>
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    left: 12,
    right: 12,
    zIndex: 9999,
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#FCA5A5', // Red-ish border for warning
    paddingVertical: 12,
    paddingHorizontal: 14,
    gap: 10,
    shadowColor: '#EF4444',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 8,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FEF2F2',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  textWrap: {
    flex: 1,
  },
  title: {
    color: '#111827',
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 18,
  },
  subtitle: {
    color: '#6B7280',
    fontSize: 11,
    lineHeight: 15,
    marginTop: 1,
  },
  actionsCol: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexShrink: 0,
  },
  enableBtn: {
    backgroundColor: '#EF4444',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 100,
  },
  enableBtnText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  closeBtn: {
    padding: 2,
  },
});
