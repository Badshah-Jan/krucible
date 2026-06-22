import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  AppState,
  AppStateStatus,
  Alert,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as ExpoLocation from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeIn, FadeInUp, FadeInDown } from 'react-native-reanimated';

import { useAppStore } from '@/store/appStore';
import Text from '@/components/common/Text';
import { LocationService } from '@/services/locationService';
import { UserService } from '@/services/userService';
import { CommunityService } from '@/services/communityService';
import { AuthService } from '@/services/authService';

type Phase = 'detecting' | 'confirm' | 'saving' | 'error' | 'manual';

export default function CommunitySetupScreen() {
  const router = useRouter();
  const setPrimaryCommunity = useAppStore((s) => s.setPrimaryCommunity);
  const setCurrentCoordinates = useAppStore((s) => s.setCurrentCoordinates);
  const setLocationStatus = useAppStore((s) => s.setLocationStatus);
  const setGpsDisabled = useAppStore((s) => s.setGpsDisabled);

  const [phase, setPhase] = useState<Phase>('detecting');
  const [detectedLat, setDetectedLat] = useState(0);
  const [detectedLng, setDetectedLng] = useState(0);
  const [detectedCommunityId, setDetectedCommunityId] = useState('');
  const [detectedCommunityName, setDetectedCommunityName] = useState('');
  const [detectedCity, setDetectedCity] = useState('');
  const [detectedDistrict, setDetectedDistrict] = useState('');
  const [detectedNeighborhood, setDetectedNeighborhood] = useState('');
  const [detectedCountry, setDetectedCountry] = useState('');
  
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);

  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);

  const stopPolling = () => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
  };

  // ── Detect GPS location and resolve community ─────────────────────────────
  const runDetection = useCallback(async () => {
    try {
      setPhase('detecting');
      setLocationStatus('requesting');

      const pos = await LocationService.getCurrentLocation();
      if (!pos) throw new Error('Could not get position');

      const { latitude: lat, longitude: lng } = pos;

      const place = await LocationService.reverseGeocode(lat, lng);
      if (!place) throw new Error('Could not reverse geocode');

      const { communityId, communityName } =
        await CommunityService.ensureCommunityExists({
          neighborhood: place.neighborhood,
          district: place.district,
          city: place.city,
          country: place.country,
          latitude: lat,
          longitude: lng,
        });

      setDetectedLat(lat);
      setDetectedLng(lng);
      setDetectedCommunityId(communityId);
      setDetectedCommunityName(communityName);
      setDetectedCity(place.city);
      setDetectedDistrict(place.district);
      setDetectedNeighborhood(place.neighborhood);
      setDetectedCountry(place.country);
      setLocationStatus('granted');
      setGpsDisabled(false);
      setPhase('confirm');
    } catch (e: any) {
      console.error('[CommunitySetup] Detection failed:', e);
      setPhase('error');
    }
  }, []);

  // ── Poll for GPS becoming available ──────────────────────────────────────
  useEffect(() => {
    const tryStart = async () => {
      const enabled = await ExpoLocation.hasServicesEnabledAsync().catch(() => false);
      if (enabled) {
        await runDetection();
      } else {
        pollingRef.current = setInterval(async () => {
          const on = await ExpoLocation.hasServicesEnabledAsync().catch(() => false);
          if (on) {
            stopPolling();
            await runDetection();
          }
        }, 3000);
      }
    };
    tryStart();

    const sub = AppState.addEventListener('change', (next: AppStateStatus) => {
      if (appStateRef.current.match(/inactive|background/) && next === 'active') {
        ExpoLocation.hasServicesEnabledAsync().then((on) => {
          if (on) { stopPolling(); runDetection(); }
        });
      }
      appStateRef.current = next;
    });

    return () => { stopPolling(); sub.remove(); };
  }, [runDetection]);

  // ── User confirms detected community as home ──────────────────────────────
  const handleConfirm = useCallback(async () => {
    const user = AuthService.getCurrentUser();
    if (!user) return;

    setPhase('saving');
    try {
      const { communityId, communityName } =
        await CommunityService.confirmPrimaryCommunity({
          userId: user.uid,
          neighborhood: detectedNeighborhood,
          district: detectedDistrict,
          city: detectedCity,
          country: detectedCountry,
          latitude: detectedLat,
          longitude: detectedLng,
        });

      await UserService.updateUser(user.uid, {
        latitude: detectedLat,
        longitude: detectedLng,
        currentLatitude: detectedLat,
        currentLongitude: detectedLng,
        neighborhood: detectedNeighborhood,
        area: detectedNeighborhood,
        district: detectedDistrict,
        city: detectedCity,
        country: detectedCountry,
        locationEnabled: true,
        lastLocationUpdate: new Date(),
      } as any);

      // Set primary community in store
      setPrimaryCommunity({
        name: communityName,
        area: detectedNeighborhood,
        district: detectedDistrict,
        city: detectedCity,
        country: detectedCountry,
        communityId,
      });

      // Set current coordinates separately
      setCurrentCoordinates({ lat: detectedLat, lng: detectedLng });

      router.replace('/(tabs)');
    } catch (e: any) {
      console.error('[CommunitySetup] Confirm failed:', e);
      Alert.alert('Error', 'Could not save your community. Please try again.');
      setPhase('confirm');
    }
  }, [
    detectedLat, detectedLng, detectedCommunityId, detectedCommunityName,
    detectedCity, detectedDistrict, detectedNeighborhood, detectedCountry,
  ]);

  // ── User wants to pick a different community ──────────────────────────────
  const handleChooseAnother = useCallback(() => {
    setPhase('manual');
  }, []);

  const handleManualSearch = useCallback(async () => {
    if (!searchQuery.trim()) return;
    setIsSearching(true);
    try {
      const results = await ExpoLocation.geocodeAsync(searchQuery);
      if (results.length > 0) {
        const { latitude: lat, longitude: lng } = results[0];
        const place = await LocationService.reverseGeocode(lat, lng);
        if (!place) throw new Error('Could not reverse geocode');

        const { communityId, communityName } = await CommunityService.ensureCommunityExists({
          neighborhood: place.neighborhood,
          district: place.district,
          city: place.city,
          country: place.country,
          latitude: lat,
          longitude: lng,
        });

        setDetectedLat(lat);
        setDetectedLng(lng);
        setDetectedCommunityId(communityId);
        setDetectedCommunityName(communityName);
        setDetectedCity(place.city);
        setDetectedDistrict(place.district);
        setDetectedNeighborhood(place.neighborhood);
        setDetectedCountry(place.country);
        setPhase('confirm');
      } else {
        Alert.alert('Not Found', 'Could not find that location. Try adding the city name.');
      }
    } catch (e) {
      console.error('Manual search error:', e);
      Alert.alert('Error', 'An error occurred while searching. Please try again.');
    } finally {
      setIsSearching(false);
    }
  }, [searchQuery]);

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <View style={styles.root}>
      <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>

        {/* ── DETECTING ─────────────────────────────────────────────────── */}
        {phase === 'detecting' && (
          <Animated.View entering={FadeIn} style={styles.centerContent}>
            <View style={styles.iconCircle}>
              <ActivityIndicator size="large" color="#C0392B" />
            </View>
            <Text style={styles.detectingTitle}>Finding your neighborhood...</Text>
            <Text style={styles.detectingSub}>
              We are using your GPS to detect your area.
            </Text>
          </Animated.View>
        )}

        {/* ── CONFIRM ───────────────────────────────────────────────────── */}
        {phase === 'confirm' && (
          <Animated.View entering={FadeIn} style={styles.confirmContent}>
            {/* Header */}
            <Animated.View entering={FadeInUp.springify()} style={styles.headerSection}>
              <View style={styles.homeIconCircle}>
                <Ionicons name="home" size={28} color="#C0392B" />
              </View>
              <Text style={styles.headerLabel}>We detected</Text>
            </Animated.View>

            {/* Detected Community Card */}
            <Animated.View
              entering={FadeInUp.delay(80).springify()}
              style={styles.communityCard}
            >
              <View style={styles.communityCardRow}>
                <View style={styles.locationDot} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.communityName}>{detectedCommunityName}</Text>
                  <Text style={styles.communityCity}>{detectedCity}</Text>
                </View>
                <View style={styles.homeBadge}>
                  <Ionicons name="home-outline" size={12} color="#C0392B" />
                  <Text style={styles.homeBadgeText}>Home</Text>
                </View>
              </View>

              <View style={styles.cardDivider} />

              <Text style={styles.confirmQuestion}>
                Is this your home community?
              </Text>
              <Text style={styles.confirmSub}>
                This determines your community feed, chat, and reputation. You can change it later in Settings.
              </Text>
            </Animated.View>

            {/* Disclaimer */}
            <Animated.View entering={FadeInUp.delay(160).springify()} style={styles.disclaimerBox}>
              <Ionicons name="information-circle-outline" size={16} color="#6B7280" />
              <Text style={styles.disclaimerText}>
                Your home community stays fixed even when you travel. Only your current GPS location updates in real time.
              </Text>
            </Animated.View>

            {/* Buttons */}
            <Animated.View entering={FadeInDown.delay(200).springify()} style={styles.buttonStack}>
              <TouchableOpacity
                style={styles.primaryBtn}
                onPress={handleConfirm}
                activeOpacity={0.85}
              >
                <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" />
                <Text style={styles.primaryBtnText}>Yes, this is my home</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.secondaryBtn}
                onPress={handleChooseAnother}
                activeOpacity={0.8}
              >
                <Text style={styles.secondaryBtnText}>Not correct, set manually</Text>
              </TouchableOpacity>
            </Animated.View>
          </Animated.View>
        )}

        {/* ── MANUAL SEARCH ─────────────────────────────────────────────── */}
        {phase === 'manual' && (
          <Animated.View entering={FadeIn} style={styles.confirmContent}>
            <Animated.View entering={FadeInUp.springify()} style={styles.headerSection}>
              <View style={[styles.homeIconCircle, { backgroundColor: '#F3F4F6' }]}>
                <Ionicons name="search" size={28} color="#4B5563" />
              </View>
              <Text style={[styles.headerLabel, { color: '#4B5563' }]}>Search Location</Text>
            </Animated.View>
            
            <Animated.View entering={FadeInUp.delay(80).springify()}>
              <Text style={styles.detectingSub}>
                Enter your city and neighborhood to manually set your home community.
              </Text>
              
              <View style={styles.inputContainer}>
                <Ionicons name="location-outline" size={20} color="#9CA3AF" />
                <TextInput
                  style={styles.textInput}
                  placeholder="e.g. DHA Phase 6, Karachi"
                  placeholderTextColor="#9CA3AF"
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  onSubmitEditing={handleManualSearch}
                  returnKeyType="search"
                  autoFocus
                />
              </View>
              
              <TouchableOpacity
                style={[styles.primaryBtn, { marginTop: 24, opacity: isSearching ? 0.7 : 1 }]}
                onPress={handleManualSearch}
                disabled={isSearching}
                activeOpacity={0.85}
              >
                {isSearching ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Ionicons name="search" size={20} color="#FFFFFF" />
                    <Text style={styles.primaryBtnText}>Search</Text>
                  </>
                )}
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.secondaryBtn, { marginTop: 12 }]}
                onPress={() => setPhase('confirm')}
                disabled={isSearching}
              >
                <Text style={styles.secondaryBtnText}>Cancel</Text>
              </TouchableOpacity>
            </Animated.View>
          </Animated.View>
        )}

        {/* ── SAVING ────────────────────────────────────────────────────── */}
        {phase === 'saving' && (
          <Animated.View entering={FadeIn} style={styles.centerContent}>
            <View style={styles.iconCircle}>
              <ActivityIndicator size="large" color="#C0392B" />
            </View>
            <Text style={styles.detectingTitle}>Saving your community...</Text>
          </Animated.View>
        )}

        {/* ── ERROR ─────────────────────────────────────────────────────── */}
        {phase === 'error' && (
          <Animated.View entering={FadeIn} style={styles.centerContent}>
            <View style={[styles.iconCircle, { backgroundColor: '#FEF2F2', borderColor: '#FECACA' }]}>
              <Ionicons name="location-outline" size={32} color="#EF4444" />
            </View>
            <Text style={styles.detectingTitle}>Could not detect location</Text>
            <Text style={styles.detectingSub}>
              Please ensure Location Services are enabled and try again.
            </Text>
            <TouchableOpacity style={styles.retryBtn} onPress={runDetection}>
              <Text style={styles.retryBtnText}>Try Again</Text>
            </TouchableOpacity>
          </Animated.View>
        )}

      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#FFFFFF' },

  centerContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    gap: 16,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FFF1F2',
    borderWidth: 1,
    borderColor: '#FECDD3',
    alignItems: 'center',
    justifyContent: 'center',
  },
  detectingTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111111',
    textAlign: 'center',
  },
  detectingSub: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 22,
  },
  retryBtn: {
    marginTop: 8,
    backgroundColor: '#111111',
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 10,
  },
  retryBtnText: { color: '#FFFFFF', fontSize: 14, fontWeight: '600' },

  confirmContent: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 32,
    paddingBottom: 24,
    justifyContent: 'center',
    gap: 16,
  },
  headerSection: {
    alignItems: 'center',
    marginBottom: 8,
    gap: 12,
  },
  homeIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#FFF1F2',
    borderWidth: 1,
    borderColor: '#FECDD3',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: '#6B7280',
    letterSpacing: 0.5,
  },

  communityCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 0.5,
    borderColor: '#E5E7EB',
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  communityCardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 14,
  },
  locationDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#C0392B',
  },
  communityName: {
    fontSize: 17,
    fontWeight: '600',
    color: '#111111',
  },
  communityCity: {
    fontSize: 13,
    fontWeight: '400',
    color: '#6B7280',
    marginTop: 2,
  },
  homeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FFF1F2',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 0.5,
    borderColor: '#FECDD3',
  },
  homeBadgeText: {
    fontSize: 11,
    fontWeight: '500',
    color: '#C0392B',
  },
  cardDivider: {
    height: 1,
    backgroundColor: '#F3F4F6',
    marginBottom: 14,
  },
  confirmQuestion: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111111',
    marginBottom: 6,
  },
  confirmSub: {
    fontSize: 13,
    fontWeight: '400',
    color: '#6B7280',
    lineHeight: 20,
  },

  disclaimerBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#F9FAFB',
    borderRadius: 10,
    borderWidth: 0.5,
    borderColor: '#E5E7EB',
    padding: 12,
    gap: 8,
  },
  disclaimerText: {
    fontSize: 12,
    fontWeight: '400',
    color: '#6B7280',
    lineHeight: 18,
    flex: 1,
  },

  buttonStack: { gap: 10, marginTop: 8 },
  primaryBtn: {
    height: 48,
    backgroundColor: '#C0392B',
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  primaryBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
  },
  secondaryBtn: {
    height: 48,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    borderWidth: 0.5,
    borderColor: '#D1D5DB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryBtnText: {
    color: '#374151',
    fontSize: 14,
    fontWeight: '500',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    paddingHorizontal: 12,
    marginTop: 16,
    height: 48,
  },
  textInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 14,
    color: '#111111',
    fontWeight: '400',
  },
});
