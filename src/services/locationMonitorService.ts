import { useAppStore } from '@/store/appStore';
import * as Location from 'expo-location';
import { router } from 'expo-router';
import { AppState, AppStateStatus } from 'react-native';
import { AuthService } from './authService';
import { LocationService } from './locationService';
import { UserService } from './userService';

// ── How far (metres) the user must move before we update currentCoords ──────
const SIGNIFICANT_MOVE_M = 500;

// ── How often we check GPS service availability (not position) ───────────────
const GPS_STATUS_POLL_MS = 10_000;

export class LocationMonitorService {
  private static isMonitoring = false;
  private static appStateSubscription: any = null;
  private static gpsPollInterval: any = null;

  // ─── Public API ───────────────────────────────────────────────────────────

  static initialize() {
    if (this.isMonitoring) return;
    this.isMonitoring = true;

    this.appStateSubscription = AppState.addEventListener(
      'change',
      this.handleAppStateChange,
    );

    // Run an immediate check on startup
    this.checkLocationState();

    // Gentle poll to detect GPS turning OFF while the app is active.
    // We do NOT poll for position here — only for service availability.
    this.gpsPollInterval = setInterval(async () => {
      if (!useAppStore.getState().isGpsDisabled) {
        try {
          const enabled = await Location.hasServicesEnabledAsync();
          if (!enabled) {
            useAppStore.getState().setGpsDisabled(true);
          }
        } catch (_) {}
      }
    }, GPS_STATUS_POLL_MS);
  }

  static stopMonitoring() {
    this.isMonitoring = false;

    if (this.appStateSubscription) {
      this.appStateSubscription.remove();
      this.appStateSubscription = null;
    }

    if (this.gpsPollInterval) {
      clearInterval(this.gpsPollInterval);
      this.gpsPollInterval = null;
    }
  }

  // ─── App State Handler ────────────────────────────────────────────────────

  private static handleAppStateChange = async (next: AppStateStatus) => {
    if (next === 'active') {
      await LocationMonitorService.checkLocationState();
    }
  };

  // ─── Full State Check ─────────────────────────────────────────────────────

  static async checkLocationState() {
    const user = AuthService.getCurrentUser();
    if (!user) return;

    try {
      const { status } = await Location.getForegroundPermissionsAsync();

      if (status !== 'granted') {
        this.handlePermissionRevoked();
        return;
      }

      const enabled = await Location.hasServicesEnabledAsync();

      if (!enabled) {
        useAppStore.getState().setGpsDisabled(true);
        return;
      }

      const wasDisabled = useAppStore.getState().isGpsDisabled;
      if (wasDisabled) {
        useAppStore.getState().setGpsDisabled(false);
        await this.refreshCurrentCoordinates(user.uid);
        return;
      }

      // GPS is on — silently refresh current coordinates if user moved
      this.refreshCurrentCoordinates(user.uid);
    } catch (error) {
      console.error('[LocationMonitor] checkLocationState error:', error);
    }
  }

  // ─── Permission Revoked ───────────────────────────────────────────────────

  private static handlePermissionRevoked() {
    const state = useAppStore.getState();
    state.setLocationStatus('denied');
    state.clearLocation();
    router.replace('/(auth)/location-permission');
  }

  // ─── Refresh Current Coordinates Only ────────────────────────────────────
  /**
   * Updates the user's current GPS coordinates in Zustand and Firestore.
   * NEVER changes primaryCommunityId. Primary community is immutable here.
   */
  static async refreshCurrentCoordinates(uid: string) {
    try {
      const pos = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const { latitude: lat, longitude: lng } = pos.coords;
      const currentCoords = useAppStore.getState().coordinates;

      // Skip update if user hasn't moved significantly
      if (currentCoords) {
        const moved = this.distanceMetres(
          currentCoords.lat,
          currentCoords.lng,
          lat,
          lng,
        );
        if (moved < SIGNIFICANT_MOVE_M) return;
      }

      // Update Zustand with new coordinates only
      useAppStore.getState().setCurrentCoordinates({ lat, lng });

      // Persist current location to Firestore (separate from primary community)
      await UserService.updateUser(uid, {
        currentLatitude: lat,
        currentLongitude: lng,
        latitude: lat,
        longitude: lng,
        locationEnabled: true,
        lastLocationUpdate: new Date(),
      } as any);
    } catch (e) {
      console.warn('[LocationMonitor] refreshCurrentCoordinates failed:', e);
    }
  }

  // ─── Pre-Action Verification ─────────────────────────────────────────────

  static async verifyLocationBeforeAction(actionName: string): Promise<boolean> {
    const { status } = await Location.getForegroundPermissionsAsync();
    if (status !== 'granted') {
      const { Alert } = require('react-native');
      Alert.alert('Permission Required', `Location permission is required to ${actionName}.`);
      return false;
    }

    const enabled = await Location.hasServicesEnabledAsync();
    if (!enabled) {
      useAppStore.getState().setGpsDisabled(true);
      const { Alert } = require('react-native');
      Alert.alert('Location Services Off', 'Please enable Location Services to use this feature.');
      return false;
    }

    const coords = useAppStore.getState().coordinates;
    if (!coords) {
      const { Alert } = require('react-native');
      Alert.alert('Location Error', 'We could not determine your current location. Please try again.');
      return false;
    }

    return true;
  }

  // ─── Haversine Helper ─────────────────────────────────────────────────────

  private static distanceMetres(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number,
  ): number {
    const R = 6371e3;
    const p1 = (lat1 * Math.PI) / 180;
    const p2 = (lat2 * Math.PI) / 180;
    const dp = ((lat2 - lat1) * Math.PI) / 180;
    const dl = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dp / 2) ** 2 +
      Math.cos(p1) * Math.cos(p2) * Math.sin(dl / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }
}
