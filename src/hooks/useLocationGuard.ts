/**
 * useLocationGuard.ts
 *
 * A hook that:
 * 1. Returns whether GPS is currently disabled.
 * 2. Provides a `guardAction` wrapper — call it before any location-gated
 *    action (SOS, post, nearby feed). It shows an in-app message if GPS is off.
 * 3. Provides `openLocationSettings` helper.
 */

import { Platform, Linking, Alert } from 'react-native';
import { useAppStore } from '@/store/appStore';

export function useLocationGuard() {
  const isGpsDisabled = useAppStore((state) => state.isGpsDisabled);
  const coordinates = useAppStore((state) => state.coordinates);
  const locationStatus = useAppStore((state) => state.locationStatus);

  const isLocationReady =
    !isGpsDisabled && !!coordinates && locationStatus === 'granted';

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

  /**
   * Wrap any location-dependent action with this guard.
   * Returns true if the action can proceed, false if blocked.
   */
  const guardAction = (featureName: string = 'this feature'): boolean => {
    if (!isLocationReady) {
      Alert.alert(
        'Location Required',
        `${featureName} requires your live location. Please enable Location Services to continue.`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Enable Location',
            onPress: openLocationSettings,
          },
        ]
      );
      return false;
    }
    return true;
  };

  return {
    isGpsDisabled,
    isLocationReady,
    coordinates,
    openLocationSettings,
    guardAction,
  };
}
