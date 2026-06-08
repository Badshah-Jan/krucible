import React, { useEffect, useRef } from 'react';
import {
  View,
  Platform,
  Linking,
  StyleSheet,
  TouchableOpacity,
  Text,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ExpoLocation from 'expo-location';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  FadeIn,
  FadeOut,
} from 'react-native-reanimated';
import { BlurView } from 'expo-blur';
import { useAppStore } from '@/store/appStore';

export default function LocationBanner() {
  const isGpsDisabled = useAppStore((state) => state.isGpsDisabled);
  const setGpsDisabled = useAppStore((state) => state.setGpsDisabled);

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

  if (!isGpsDisabled) return null;

  return (
    <Animated.View 
      entering={FadeIn.duration(300)} 
      exiting={FadeOut.duration(300)}
      style={styles.wrapper}
    >
      {Platform.OS === 'ios' ? (
        <BlurView intensity={90} tint="dark" style={StyleSheet.absoluteFill} />
      ) : (
        <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.95)' }]} />
      )}
      
      <View style={styles.content}>
        <View style={styles.iconCircle}>
          <Ionicons name="location" size={48} color="#EF4444" />
        </View>

        <Text style={styles.title}>Location Required</Text>
        <Text style={styles.subtitle}>
          Neighborly requires an active GPS connection to keep the community safe.
          You cannot browse, post, or chat while your location is disabled.
        </Text>

        <TouchableOpacity style={styles.enableBtn} onPress={handleEnable} activeOpacity={0.85}>
          <Ionicons name="settings" size={18} color="#FFFFFF" />
          <Text style={styles.enableBtnText}>Enable Location Settings</Text>
        </TouchableOpacity>

        <View style={styles.waitingRow}>
          <ActivityIndicator size="small" color="#9CA3AF" />
          <Text style={styles.waitingText}>Waiting for GPS signal...</Text>
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 999999, // Ensure it's above everything
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    alignItems: 'center',
    paddingHorizontal: 32,
    maxWidth: 400,
  },
  iconCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 26,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 12,
  },
  subtitle: {
    color: '#9CA3AF',
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
    marginBottom: 36,
  },
  enableBtn: {
    flexDirection: 'row',
    backgroundColor: '#EF4444',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderRadius: 100,
    alignItems: 'center',
    gap: 8,
    width: '100%',
    justifyContent: 'center',
  },
  enableBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  waitingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 24,
  },
  waitingText: {
    color: '#6B7280',
    fontSize: 14,
    fontWeight: '500',
  },
});
