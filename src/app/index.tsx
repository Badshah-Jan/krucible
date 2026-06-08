import { useEffect } from 'react';
import { View, StyleSheet, Dimensions, StatusBar } from 'react-native';
import { useRouter } from 'expo-router';
import { useAppStore } from '@/store/appStore';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import Text from '@/components/common/Text';

const { width } = Dimensions.get('window');

export default function Index() {
  const router = useRouter();
  const isAuthenticated = useAppStore((state) => state.isAuthenticated);
  const authInitialized = useAppStore((state) => state.authInitialized);
  const community = useAppStore((state) => state.community);
  const locationStatus = useAppStore((state) => state.locationStatus);
  const isGpsDisabled = useAppStore((state) => state.isGpsDisabled);

  const opacity = useSharedValue(0);
  const scale = useSharedValue(0.95);

  useEffect(() => {
    // Subtle premium animation
    opacity.value = withTiming(1, { duration: 1200, easing: Easing.out(Easing.ease) });
    scale.value = withTiming(1, { duration: 1200, easing: Easing.out(Easing.ease) });

    // Only route once auth state and profile are fully loaded
    if (!authInitialized) return;

    // Enforce a minimum 2.5 seconds splash duration
    const timer = setTimeout(() => {
      if (!isAuthenticated) {
        router.replace('/(auth)/login');
        return;
      }

      // Step 1: Check location permission
      if (!community && locationStatus !== 'granted') {
        router.replace('/(auth)/location-permission');
        return;
      }

      // Step 2: Permission granted but GPS is disabled
      if (isGpsDisabled) {
        router.replace('/(auth)/gps-enable');
        return;
      }

      // All good
      router.replace('/(tabs)');
    }, 2500);

    return () => clearTimeout(timer);
  }, [isAuthenticated, authInitialized, community, locationStatus, isGpsDisabled]);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      opacity: opacity.value,
      transform: [{ scale: scale.value }],
    };
  });

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      <Animated.View style={[styles.content, animatedStyle]}>
        <View style={styles.logoContainer}>
          <Text variant="h1" color="white" numberOfLines={1} adjustsFontSizeToFit style={styles.logoText}>Neighborly</Text>
          <View style={styles.pinDot} />
        </View>
        <Text variant="body" color="gray" style={styles.tagline}>
          Help Is Nearby.
        </Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000', // Pure OLED Black
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    alignItems: 'center',
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 8,
  },
  logoText: {
    fontSize: 48,
    fontWeight: '900',
    letterSpacing: -1.5,
  },
  pinDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#2563EB',
    marginLeft: 6,
  },
  tagline: {
    color: '#A1A1AA', // Zinc 400
    fontSize: 18,
    fontWeight: '500',
    letterSpacing: 0,
  },
});
