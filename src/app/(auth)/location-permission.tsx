import { useTranslation } from 'react-i18next';
import React, { useEffect, useState } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  ActivityIndicator,
  Platform,
  StatusBar,
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
  FadeIn,
  FadeInRight,
  FadeOutLeft,
} from 'react-native-reanimated';

import { useAppStore } from '@/store/appStore';
import type { Community } from '@/store/appStore';
import Text from '@/components/common/Text';
import { LocationService } from '@/services/locationService';
import { UserService } from '@/services/userService';
import { CommunityService } from '@/services/communityService';
import { AuthService } from '@/services/authService';

const { width, height } = Dimensions.get('window');

type Phase = 'permission' | 'locating' | 'found' | 'denied' | 'gps_disabled' | 'error';

export default function LocationPermissionScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const setLocation = useAppStore((s) => s.setLocation);
  const setLocationStatus = useAppStore((s) => s.setLocationStatus);

  const [phase, setPhase] = useState<Phase>('permission');
  const [communityName, setCommunityName] = useState('');
  const permissionGrantedRef = React.useRef(false);

  // Modern subtle animation values
  const floatY = useSharedValue(0);
  const glowOpacity = useSharedValue(0.3);

  useEffect(() => {
    floatY.value = withRepeat(
      withSequence(
        withTiming(-8, { duration: 2500 }),
        withTiming(0, { duration: 2500 })
      ),
      -1,
      true
    );

    glowOpacity.value = withRepeat(
      withSequence(
        withTiming(0.6, { duration: 2000 }),
        withTiming(0.3, { duration: 2000 })
      ),
      -1,
      true
    );
  }, []);

  const animatedFloat = useAnimatedStyle(() => {
    return {
      transform: [{ translateY: floatY.value }],
    };
  });

  const animatedGlow = useAnimatedStyle(() => {
    return {
      opacity: glowOpacity.value,
    };
  });

  // ── Request location ────────────────────────────────────────────────────────
  const handleAllow = async () => {
    setPhase('locating');
    setLocationStatus('requesting');
    permissionGrantedRef.current = false;

    try {
      const hasPermission = await LocationService.requestPermissions();
      if (!hasPermission) {
        setLocationStatus('denied');
        setPhase('denied');
        return;
      }
      permissionGrantedRef.current = true;

      const isGpsEnabled = await ExpoLocation.hasServicesEnabledAsync();
      if (!isGpsEnabled) {
        useAppStore.getState().setGpsDisabled(true);
        setLocationStatus('denied');
        router.replace('/(auth)/gps-enable');
        return;
      }

      const pos = await LocationService.getCurrentLocation();
      const { latitude: lat, longitude: lng } = pos!;

      const place = await LocationService.reverseGeocode(lat, lng);
      if (!place) throw new Error('Geocode failed');

      const currentUser = AuthService.getCurrentUser();
      if (!currentUser) throw new Error('Not authenticated');

      const { communityId, communityName } =
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
        name: communityName,
        area: place.neighborhood,
        district: place.district,
        city: place.city,
        country: place.country,
        communityId,
      };

      setLocation({ lat, lng }, community);
      setCommunityName(communityName);
      setPhase('found');

      setTimeout(() => {
        router.replace('/(tabs)');
      }, 2000);

    } catch (e: any) {
      const msg = e?.message ?? '';
      console.warn('[LocationPermission] error:', msg);

      if (msg.includes('provider is unavailable') || msg.includes('Location provider')) {
        useAppStore.getState().setGpsDisabled(true);
        setLocationStatus('denied');
        router.replace('/(auth)/gps-enable');
      } else if (permissionGrantedRef.current) {
        setPhase('error');
      } else {
        setPhase('denied');
        setLocationStatus('denied');
      }
    }
  };

  const handleSkip = () => {
    const fallback: Community = {
      name: 'Block 13',
      area: 'Block 13',
      district: 'Gulshan-e-Iqbal',
      city: 'Karachi',
      country: 'Pakistan',
    };
    setLocation({ lat: 24.9252, lng: 67.0949 }, fallback);
    router.replace('/(tabs)');
  };

  // Determine active color based on phase
  const getPhaseColor = () => {
    switch (phase) {
      case 'found': return '#10B981'; // Green
      case 'denied': return '#EF4444'; // Red
      case 'error': return '#F59E0B'; // Orange
      default: return '#3B82F6'; // Blue
    }
  };

  const activeColor = getPhaseColor();

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      {/* Dynamic Background Glow */}
      <Animated.View style={styles.glowContainer} key={`glow-${phase}`} entering={FadeIn.duration(800)}>
        <LinearGradient
          colors={[activeColor, 'transparent']}
          style={styles.radialGlow}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
        />
      </Animated.View>

      <SafeAreaView style={{ flex: 1 }}>
        <View style={styles.contentSection}>
          
          <View style={styles.topSpacer} />

          {/* ── TOP VISUAL SECTION ── */}
          <View style={styles.visualSection}>
            <Animated.View style={[styles.iconWrapper, animatedFloat]} key={`icon-${phase}`} entering={FadeIn.duration(600).delay(100)}>
              <Animated.View style={[styles.glowBackground, animatedGlow, { backgroundColor: activeColor }]} />
              <View style={[styles.iconSurface, { shadowColor: activeColor }]}>
                {phase === 'permission' && <Ionicons name="location-sharp" size={48} color={activeColor} />}
                {phase === 'locating' && <ActivityIndicator size="large" color={activeColor} />}
                {phase === 'found' && <Ionicons name="checkmark" size={48} color={activeColor} />}
                {phase === 'denied' && <Ionicons name="location-outline" size={48} color={activeColor} />}
                {phase === 'error' && <Ionicons name="warning-outline" size={48} color={activeColor} />}
              </View>
            </Animated.View>
          </View>

          {/* ── BOTTOM CONTENT SECTION ── */}
          <View style={styles.textSection}>
            <Animated.View key={`text-${phase}`} entering={FadeInRight.springify().damping(20).mass(0.8)}>
              {phase === 'permission' && (
                <>
                  <Text variant="h1" style={styles.titleText}>Find help near you</Text>
                  <Text variant="body" style={styles.descText}>
                    Neighborly connects you to your neighbourhood. We use your location to show posts, alerts, and people near you.
                  </Text>
                  
                  {/* Trust badges */}
                  <View style={styles.trustRow}>
                    {[
                      { icon: 'shield-checkmark', text: 'Private' },
                      { icon: 'location-outline', text: 'Local Only' },
                      { icon: 'eye-off-outline', text: 'Never Shared' },
                    ].map((b) => (
                      <View key={b.text} style={styles.trustBadge}>
                        <Ionicons name={b.icon as any} size={14} color="#A1A1AA" />
                        <Text style={styles.trustText}>{b.text}</Text>
                      </View>
                    ))}
                  </View>
                </>
              )}

              {phase === 'locating' && (
                <>
                  <Text variant="h1" style={styles.titleText}>Finding your neighbourhood...</Text>
                  <Text variant="body" style={styles.descText}>GPS & reverse geocoding in progress.</Text>
                </>
              )}

              {phase === 'found' && (
                <>
                  <Text variant="h1" style={styles.titleText}>Community Found!</Text>
                  <Text variant="h2" style={{ color: '#FFFFFF', marginTop: 12 }}>📍 {communityName}</Text>
                  <Text variant="body" style={[styles.descText, { marginTop: 12 }]}>Taking you to your feed...</Text>
                </>
              )}

              {phase === 'denied' && (
                <>
                  <Text variant="h1" style={styles.titleText}>Permission Denied</Text>
                  <Text variant="body" style={styles.descText}>
                    Location access was denied. Please open your phone Settings and grant location permission to Neighborly.
                  </Text>
                </>
              )}

              {phase === 'error' && (
                <>
                  <Text variant="h1" style={styles.titleText}>Couldn't Get Location</Text>
                  <Text variant="body" style={styles.descText}>
                    Location permission is granted but your GPS signal is weak or still warming up. Please try again in a moment.
                  </Text>
                </>
              )}
            </Animated.View>
          </View>

          {/* ── ACTIONS SECTION ── */}
          <View style={styles.actionsContainer}>
            {phase === 'permission' && (
              <Animated.View entering={FadeIn.duration(400).delay(200)}>
                <TouchableOpacity onPress={handleAllow} style={styles.primaryButton} activeOpacity={0.8}>
                  <Ionicons name="location" size={20} color="#000000" />
                  <Text style={styles.primaryButtonText}>{t('enable_location', 'Enable Location')}</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={handleSkip} style={styles.skipButton}>
                  <Text style={styles.skipText}>{t('skip_for_now', 'Skip for now')}</Text>
                </TouchableOpacity>
              </Animated.View>
            )}

            {(phase === 'denied' || phase === 'error') && (
              <Animated.View entering={FadeIn.duration(400).delay(200)}>
                <TouchableOpacity onPress={phase === 'denied' ? () => setPhase('permission') : handleAllow} style={styles.primaryButton} activeOpacity={0.8}>
                  <Ionicons name="refresh" size={20} color="#000000" />
                  <Text style={styles.primaryButtonText}>Try Again</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={handleSkip} style={styles.skipButton}>
                  <Text style={styles.skipText}>Continue with default area</Text>
                </TouchableOpacity>
              </Animated.View>
            )}
          </View>

        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000', // Pure OLED Black
  },
  glowContainer: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.35,
  },
  radialGlow: {
    width: width,
    height: height * 0.6,
    position: 'absolute',
    top: 0,
  },
  contentSection: {
    flex: 1,
    paddingHorizontal: 32,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 40 : 32,
    justifyContent: 'space-between',
  },
  topSpacer: {
    flex: 0.5,
  },
  
  // Visual
  visualSection: {
    flex: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  glowBackground: {
    position: 'absolute',
    width: 140,
    height: 140,
    borderRadius: 70,
    transform: [{ scale: 1.4 }],
    opacity: 0.15,
  },
  iconSurface: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#1E293B',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    elevation: 20,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
  },

  // Text
  textSection: {
    flex: 1,
    justifyContent: 'center',
  },
  titleText: {
    color: '#FFFFFF',
    fontSize: 40,
    fontWeight: '800',
    letterSpacing: -1,
    marginBottom: 16,
    lineHeight: 46,
  },
  descText: {
    color: '#A1A1AA', // Zinc 400
    fontSize: 18,
    lineHeight: 28,
    fontWeight: '400',
  },

  // Trust Badges
  trustRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
  },
  trustBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#18181B', // Zinc 900
    borderWidth: 1,
    borderColor: '#27272A', // Zinc 800
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 50,
  },
  trustText: { 
    color: '#E4E4E7', // Zinc 200
    fontSize: 12, 
    fontWeight: '600' 
  },

  // Actions
  actionsContainer: {
    marginTop: 10,
  },
  primaryButton: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    paddingVertical: 18,
    borderRadius: 100, // Pill
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  primaryButtonText: {
    color: '#000000',
    fontSize: 18,
    fontWeight: '700',
  },
  skipButton: {
    alignItems: 'center',
    paddingVertical: 16,
    marginTop: 8,
  },
  skipText: {
    color: '#A1A1AA',
    fontSize: 16,
    fontWeight: '600',
  },
});
