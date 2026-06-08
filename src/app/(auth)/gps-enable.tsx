import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Platform,
  Linking,
  ActivityIndicator,
  AppState,
  AppStateStatus,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as ExpoLocation from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  withDelay,
  Easing,
  FadeIn,
  FadeOut,
  SlideInUp,
} from 'react-native-reanimated';
import { useAppStore } from '@/store/appStore';
import type { Community } from '@/store/appStore';
import GradientBg from '@/components/common/GradientBg';
import Text from '@/components/common/Text';
import { LocationService } from '@/services/locationService';
import { UserService } from '@/services/userService';
import { CommunityService } from '@/services/communityService';
import { AuthService } from '@/services/authService';

// ─── Pulsing Ring Component ───────────────────────────────────────────────────
function PulseRing({ size, delay, color }: { size: number; delay: number; color: string }) {
  const scale = useSharedValue(1);
  const opacity = useSharedValue(0.5);

  useEffect(() => {
    scale.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(1, { duration: 0 }),
          withTiming(1.6, { duration: 2200, easing: Easing.out(Easing.ease) })
        ),
        -1,
        false
      )
    );
    opacity.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(0.4, { duration: 0 }),
          withTiming(0, { duration: 2200, easing: Easing.out(Easing.ease) })
        ),
        -1,
        false
      )
    );
  }, []);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          width: size,
          height: size,
          borderRadius: size / 2,
          borderWidth: 1.5,
          borderColor: color,
          backgroundColor: color + '08',
        },
        animStyle,
      ]}
    />
  );
}

// ─── Dot Progress Indicator ───────────────────────────────────────────────────
function DotProgress({ count = 3 }: { count?: number }) {
  const [active, setActive] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setActive((p) => (p + 1) % count), 600);
    return () => clearInterval(id);
  }, [count]);
  return (
    <View style={{ flexDirection: 'row', gap: 6, justifyContent: 'center', marginTop: 12 }}>
      {Array.from({ length: count }).map((_, i) => (
        <View
          key={i}
          style={{
            width: 8,
            height: 8,
            borderRadius: 4,
            backgroundColor: i === active ? '#2563EB' : 'rgba(255,255,255,0.15)',
          }}
        />
      ))}
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────
type Phase = 'gps_required' | 'acquiring' | 'success';

export default function GpsEnableScreen() {
  const router = useRouter();
  const setLocation = useAppStore((s) => s.setLocation);
  const setGpsDisabled = useAppStore((s) => s.setGpsDisabled);
  const setLocationStatus = useAppStore((s) => s.setLocationStatus);

  const [phase, setPhase] = useState<Phase>('gps_required');
  const [communityName, setCommunityName] = useState('');
  const [dots, setDots] = useState('');

  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);

  // ── Icon float animation ──────────────────────────────────────────────────
  const iconY = useSharedValue(0);
  useEffect(() => {
    iconY.value = withRepeat(
      withSequence(
        withTiming(-12, { duration: 1400 }),
        withTiming(0, { duration: 1400 })
      ),
      -1,
      true
    );
  }, []);
  const iconStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: iconY.value }],
  }));

  // ── Acquiring dots animation ──────────────────────────────────────────────
  useEffect(() => {
    if (phase !== 'acquiring') return;
    const id = setInterval(() => {
      setDots((d) => (d.length >= 3 ? '' : d + '.'));
    }, 500);
    return () => clearInterval(id);
  }, [phase]);

  // ── Core: run the location pipeline once GPS is on ────────────────────────
  const runLocationPipeline = useCallback(async () => {
    try {
      setPhase('acquiring');
      setLocationStatus('requesting');

      const pos = await LocationService.getCurrentLocation();
      if (!pos) throw new Error('Could not get position');

      const { latitude: lat, longitude: lng } = pos;

      const place = await LocationService.reverseGeocode(lat, lng);
      if (!place) throw new Error('Could not reverse geocode');

      const currentUser = AuthService.getCurrentUser();
      if (!currentUser) throw new Error('Not authenticated');

      const { communityId, communityName: cName } =
        await CommunityService.assignUserToCommunity({
          userId: currentUser.uid,
          neighborhood: place.neighborhood,
          district: place.district,
          city: place.city,
          country: place.country,
          latitude: lat,
          longitude: lng,
        });

      await UserService.updateUser(currentUser.uid, {
        latitude: lat,
        longitude: lng,
        neighborhood: place.neighborhood,
        area: place.neighborhood,
        district: place.district,
        city: place.city,
        country: place.country,
      });

      const community: Community = {
        name: cName,
        area: place.neighborhood,
        district: place.district,
        city: place.city,
        country: place.country,
        communityId,
      };

      setLocation({ lat, lng }, community);
      setGpsDisabled(false);
      setCommunityName(cName);
      setPhase('success');

      // Navigate after brief celebration
      setTimeout(() => {
        router.replace('/(tabs)');
      }, 1800);
    } catch (e: any) {
      console.error('[GpsEnableScreen] pipeline error:', e);
      // Return to gps_required — GPS may still be off
      setPhase('gps_required');
    }
  }, []);

  // ── Polling: check GPS every 2s while waiting ─────────────────────────────
  const startPolling = useCallback(() => {
    if (pollingRef.current) return;
    pollingRef.current = setInterval(async () => {
      try {
        const enabled = await ExpoLocation.hasServicesEnabledAsync();
        if (enabled) {
          stopPolling();
          setGpsDisabled(false);
          await runLocationPipeline();
        }
      } catch (_) {}
    }, 2000);
  }, [runLocationPipeline]);

  const stopPolling = () => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
  };

  // Start polling on mount
  useEffect(() => {
    startPolling();

    // Also re-check when app comes to foreground
    const sub = AppState.addEventListener('change', (nextState: AppStateStatus) => {
      if (appStateRef.current.match(/inactive|background/) && nextState === 'active') {
        // App just foregrounded — immediately check GPS
        ExpoLocation.hasServicesEnabledAsync().then((enabled) => {
          if (enabled && phase === 'gps_required') {
            stopPolling();
            setGpsDisabled(false);
            runLocationPipeline();
          }
        });
      }
      appStateRef.current = nextState;
    });

    return () => {
      stopPolling();
      sub.remove();
    };
  }, []);

  const openLocationSettings = async () => {
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

  // ── Manual Retry ───────────────────────────────────────────────────────────
  const handleRetry = async () => {
    try {
      const enabled = await ExpoLocation.hasServicesEnabledAsync();
      if (enabled) {
        stopPolling();
        setGpsDisabled(false);
        await runLocationPipeline();
      }
    } catch (_) {}
  };

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <GradientBg>
      <SafeAreaView style={styles.container}>

        {/* ── GPS REQUIRED PHASE ─────────────────────────────────────────── */}
        {phase === 'gps_required' && (
          <Animated.View entering={FadeIn} style={styles.content}>

            {/* Top Label */}
            <View style={styles.topBadge}>
              <Ionicons name="location" size={13} color="#2563EB" />
              <Text style={styles.topBadgeText}>LOCATION SERVICES</Text>
            </View>

            {/* Beacon Animation */}
            <View style={styles.beaconSection}>
              <View style={styles.beaconWrapper}>
                <PulseRing size={260} delay={0} color="#F59E0B" />
                <PulseRing size={260} delay={800} color="#F59E0B" />
                <PulseRing size={260} delay={1600} color="#F59E0B" />
                <Animated.View style={[styles.iconCircle, iconStyle]}>
                  <LinearGradient
                    colors={['#92400E', '#F59E0B']}
                    style={styles.iconGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                  >
                    <Ionicons name="location-outline" size={52} color="#FFFFFF" />
                  </LinearGradient>
                </Animated.View>
              </View>
            </View>

            {/* Text Content */}
            <View style={styles.textSection}>
              <Text style={styles.heading}>Enable Location{'\n'}Services</Text>
              <Text style={styles.body}>
                Neighborly uses your live location to connect you with nearby people, community updates, and emergency alerts.
              </Text>

              {/* Feature Pills */}
              <View style={styles.pillRow}>
                {[
                  { icon: 'people', label: 'Nearby People' },
                  { icon: 'warning', label: 'Emergency Alerts' },
                  { icon: 'home', label: 'Community Feed' },
                ].map((f) => (
                  <View key={f.label} style={styles.pill}>
                    <Ionicons name={f.icon as any} size={12} color="#F59E0B" />
                    <Text style={styles.pillText}>{f.label}</Text>
                  </View>
                ))}
              </View>
            </View>

            {/* Buttons */}
            <View style={styles.buttonStack}>
              {/* Primary CTA */}
              <TouchableOpacity
                style={styles.primaryBtn}
                activeOpacity={0.85}
                onPress={openLocationSettings}
              >
                <LinearGradient
                  colors={['#D97706', '#F59E0B']}
                  style={StyleSheet.absoluteFill}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                />
                <Ionicons name="locate" size={20} color="#FFFFFF" />
                <Text style={styles.primaryBtnText}>Turn On Location</Text>
              </TouchableOpacity>

              {/* Secondary Actions */}
              <View style={styles.secondaryRow}>
                <TouchableOpacity style={styles.secondaryBtn} activeOpacity={0.75} onPress={handleRetry}>
                  <Ionicons name="refresh" size={16} color="#9CA3AF" />
                  <Text style={styles.secondaryBtnText}>Retry</Text>
                </TouchableOpacity>

                <View style={styles.divider} />

                <TouchableOpacity style={styles.secondaryBtn} activeOpacity={0.75} onPress={openLocationSettings}>
                  <Ionicons name="settings-outline" size={16} color="#9CA3AF" />
                  <Text style={styles.secondaryBtnText}>Open Settings</Text>
                </TouchableOpacity>
              </View>

              {/* Waiting status */}
              <View style={styles.waitingRow}>
                <ActivityIndicator size="small" color="#F59E0B" />
                <Text style={styles.waitingText}>Waiting for location services to turn on...</Text>
              </View>
            </View>
          </Animated.View>
        )}

        {/* ── ACQUIRING PHASE ───────────────────────────────────────────── */}
        {phase === 'acquiring' && (
          <Animated.View entering={FadeIn} style={styles.centeredContent}>
            <View style={styles.beaconWrapper}>
              <PulseRing size={200} delay={0} color="#2563EB" />
              <PulseRing size={200} delay={700} color="#2563EB" />
              <View style={styles.iconCircleSmall}>
                <LinearGradient
                  colors={['#1E40AF', '#2563EB']}
                  style={styles.iconGradient}
                >
                  <ActivityIndicator size="large" color="#FFFFFF" />
                </LinearGradient>
              </View>
            </View>

            <Text style={styles.acquiringTitle}>📍 Finding Your Community{dots}</Text>
            <Text style={styles.acquiringSub}>Please wait while we locate nearby communities.</Text>
            <DotProgress count={3} />
          </Animated.View>
        )}

        {/* ── SUCCESS PHASE ─────────────────────────────────────────────── */}
        {phase === 'success' && (
          <Animated.View entering={FadeIn} style={styles.centeredContent}>
            <View style={styles.beaconWrapper}>
              <View style={[styles.iconCircleSmall, { borderWidth: 2, borderColor: '#10B981' }]}>
                <LinearGradient colors={['#064e3b', '#10B981']} style={styles.iconGradient}>
                  <Ionicons name="checkmark" size={52} color="#FFFFFF" />
                </LinearGradient>
              </View>
            </View>

            <Text style={[styles.acquiringTitle, { color: '#10B981' }]}>Community Found!</Text>
            <Text style={styles.communityNameText}>📍 {communityName}</Text>
            <Text style={styles.acquiringSub}>Taking you to your feed...</Text>
          </Animated.View>
        )}

      </SafeAreaView>
    </GradientBg>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: {
    flex: 1,
    paddingHorizontal: 28,
    paddingBottom: 36,
    paddingTop: 20,
    justifyContent: 'space-between',
  },
  centeredContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    gap: 12,
  },

  // Top badge
  topBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(37,99,235,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(37,99,235,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 50,
  },
  topBadgeText: {
    color: '#2563EB',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 2,
  },

  // Beacon
  beaconSection: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 0,
    marginVertical: 8,
  },
  beaconWrapper: {
    width: 230,
    height: 230,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
  },
  iconCircle: {
    shadowColor: '#F59E0B',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 12,
  },
  iconCircleSmall: {
    borderRadius: 60,
    overflow: 'hidden',
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 12,
  },
  iconGradient: {
    width: 104,
    height: 104,
    borderRadius: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Text section
  textSection: { gap: 14 },
  heading: {
    color: '#FFFFFF',
    fontSize: 38,
    fontWeight: '900',
    letterSpacing: -1,
    lineHeight: 44,
  },
  body: {
    color: '#9CA3AF',
    fontSize: 15,
    lineHeight: 24,
  },
  pillRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(245,158,11,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(245,158,11,0.2)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 50,
  },
  pillText: { color: '#FCD34D', fontSize: 11, fontWeight: '600' },

  // Buttons
  buttonStack: { gap: 12 },
  primaryBtn: {
    height: 58,
    borderRadius: 30,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    overflow: 'hidden',
    position: 'relative',
    shadowColor: '#F59E0B',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  primaryBtnText: { color: '#FFFFFF', fontSize: 17, fontWeight: '800' },
  secondaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 0,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: 16,
    overflow: 'hidden',
  },
  secondaryBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    paddingVertical: 14,
  },
  secondaryBtnText: { color: '#9CA3AF', fontSize: 14, fontWeight: '600' },
  divider: {
    width: 1,
    height: 24,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  waitingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 4,
  },
  waitingText: {
    color: '#6B7280',
    fontSize: 12,
    textAlign: 'center',
    flex: 1,
  },

  // Acquiring / Success
  acquiringTitle: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '800',
    textAlign: 'center',
    marginTop: 20,
  },
  acquiringSub: {
    color: '#9CA3AF',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  communityNameText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
  },
});
