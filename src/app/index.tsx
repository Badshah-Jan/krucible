import { useEffect } from 'react';
import { View, StyleSheet, StatusBar, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { useAppStore } from '@/store/appStore';
import { AuthService } from '@/services/authService';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  Easing,
} from 'react-native-reanimated';
import { Text as RNText } from 'react-native';
import Text from '@/components/common/Text';

export default function Index() {
  const router = useRouter();
  const isAuthenticated = useAppStore((state) => state.isAuthenticated);
  const authInitialized = useAppStore((state) => state.authInitialized);
  const community = useAppStore((state) => state.primaryCommunity);
  const locationStatus = useAppStore((state) => state.locationStatus);
  const isGpsDisabled = useAppStore((state) => state.isGpsDisabled);

  // Logo animation
  const logoOpacity = useSharedValue(0);
  const logoScale = useSharedValue(0.88);

  // Tagline animation (slightly delayed)
  const taglineOpacity = useSharedValue(0);
  const taglineY = useSharedValue(10);

  useEffect(() => {
    // Premium Airbnb-style ease-in animation
    logoOpacity.value = withTiming(1, { duration: 700, easing: Easing.out(Easing.cubic) });
    logoScale.value = withTiming(1, { duration: 700, easing: Easing.out(Easing.cubic) });

    taglineOpacity.value = withDelay(400, withTiming(1, { duration: 500, easing: Easing.out(Easing.ease) }));
    taglineY.value = withDelay(400, withTiming(0, { duration: 500, easing: Easing.out(Easing.ease) }));

    // Only route once auth state and profile are fully loaded
    if (!authInitialized) return;

    // Enforce a minimum 2.5 seconds splash duration
    const timer = setTimeout(() => {
      const firebaseUser = AuthService.getCurrentUser();
      if (firebaseUser && !AuthService.isAccountAccessAllowed(firebaseUser)) {
        router.replace('/(auth)/verify-email');
        return;
      }

      if (!isAuthenticated) {
        router.replace('/(auth)/login');
        return;
      }

      // Step 1: Check location permission
      if (locationStatus !== 'granted') {
        router.replace('/(auth)/location-permission');
        return;
      }

      // Step 2: Permission granted but GPS is disabled
      if (isGpsDisabled) {
        router.replace('/(auth)/gps-enable');
        return;
      }

      // Step 3: Permission and GPS are fine but no primary community confirmed yet
      if (!community) {
        router.replace('/(auth)/community-setup');
        return;
      }

      // All good
      router.replace('/(tabs)');
    }, 2500);

    return () => clearTimeout(timer);
  }, [isAuthenticated, authInitialized, community, locationStatus, isGpsDisabled]);

  const logoAnimatedStyle = useAnimatedStyle(() => ({
    opacity: logoOpacity.value,
    transform: [{ scale: logoScale.value }],
  }));

  const taglineAnimatedStyle = useAnimatedStyle(() => ({
    opacity: taglineOpacity.value,
    transform: [{ translateY: taglineY.value }],
  }));

  return (
    <View style={styles.container}>
      {/* White background, dark status bar — like Airbnb */}
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" translucent={false} />

      {/* Centered logo + wordmark */}
      <Animated.View style={[styles.logoWrap, logoAnimatedStyle]}>
        <Image
          source={require('@/assets/images/adaptive-icon.png')}
          style={[styles.iconImage, { tintColor: '#FF5A5F' }]}
          resizeMode="contain"
        />
        <RNText style={styles.wordmark}>Neighborly</RNText>
      </Animated.View>

      {/* Tagline — fades in slightly after the logo */}
      <Animated.View style={[styles.taglineWrap, taglineAnimatedStyle]}>
        <Text style={styles.tagline}>Your neighborhood, connected.</Text>
      </Animated.View>

      {/* Bottom brand footer — like Nextdoor */}
      <View style={styles.footer}>
        <View style={styles.footerDot} />
        <Text style={styles.footerText}>neighborly.com</Text>
        <View style={styles.footerDot} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoWrap: {
    alignItems: 'center',
    gap: 20,
  },
  iconImage: {
    width: 140,
    height: 140,
  },
  wordmark: {
    fontSize: 40,
    fontWeight: '800',
    color: '#111827',
    letterSpacing: -1.5,
    includeFontPadding: false,
    lineHeight: 48,
  },
  taglineWrap: {
    marginTop: 16,
  },
  tagline: {
    fontSize: 16,
    color: '#9CA3AF',
    fontWeight: '500',
    letterSpacing: 0.1,
  },
  footer: {
    position: 'absolute',
    bottom: 48,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  footerDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#D1D5DB',
  },
  footerText: {
    fontSize: 13,
    color: '#9CA3AF',
    fontWeight: '500',
    letterSpacing: 0.2,
  },
});
