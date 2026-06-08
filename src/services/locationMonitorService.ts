import { useAppStore } from "@/store/appStore";
import * as Location from "expo-location";
import { router } from "expo-router";
import { Alert, AppState, AppStateStatus } from "react-native";
import { AuthService } from "./authService";
import { CommunityService } from "./communityService";
import { LocationService } from "./locationService";
import { UserService } from "./userService";

// ── Real-time GPS polling interval (ms) ──────────────────────────────────────
const GPS_POLL_INTERVAL_MS = 3000;

export class LocationMonitorService {
  private static isMonitoring = false;
  private static appStateSubscription: any = null;
  private static gpsPollingInterval: ReturnType<typeof setInterval> | null =
    null;

  // ─── Public API ───────────────────────────────────────────────────────────

  static initialize() {
    if (this.isMonitoring) return;
    this.isMonitoring = true;

    // Monitor App State (foreground/background transitions)
    this.appStateSubscription = AppState.addEventListener(
      "change",
      this.handleAppStateChange,
    );

    // Run an immediate check on startup
    this.checkLocationState();

    // Start real-time GPS polling
    this.startGpsPolling();
  }

  static stopMonitoring() {
    this.isMonitoring = false;

    if (this.appStateSubscription) {
      this.appStateSubscription.remove();
      this.appStateSubscription = null;
    }

    this.stopGpsPolling();
  }

  // ─── GPS Polling ─────────────────────────────────────────────────────────

  private static startGpsPolling() {
    if (this.gpsPollingInterval) return;
    this.gpsPollingInterval = setInterval(async () => {
      await this.pollGpsState();
    }, GPS_POLL_INTERVAL_MS);
  }

  private static stopGpsPolling() {
    if (this.gpsPollingInterval) {
      clearInterval(this.gpsPollingInterval);
      this.gpsPollingInterval = null;
    }
  }

  /**
   * Polls GPS state. If GPS turns ON while we had it as disabled,
   * automatically fetches & updates location without user restart.
   */
  private static async pollGpsState() {
    const user = AuthService.getCurrentUser();
    if (!user) return;

    try {
      const { status } = await Location.getForegroundPermissionsAsync();
      if (status !== "granted") return; // Permission check is separate

      const wasDisabled = useAppStore.getState().isGpsDisabled;
      const isNowEnabled = await Location.hasServicesEnabledAsync();

      if (wasDisabled && isNowEnabled) {
        // GPS just turned ON → auto-recover location
        useAppStore.getState().setGpsDisabled(false);
        await this.autoRecoverLocation(user.uid);
      } else if (!wasDisabled && !isNowEnabled) {
        // GPS just turned OFF → mark as disabled
        useAppStore.getState().setGpsDisabled(true);
      }
    } catch (e) {
      // Silent — polling should never crash the app
    }
  }

  /**
   * Called when GPS is detected as turning ON.
   * Silently fetches coordinates, reverse geocodes, and updates Zustand + Firestore.
   */
  private static async autoRecoverLocation(uid: string) {
    try {
      const pos = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const place = await LocationService.reverseGeocode(
        pos.coords.latitude,
        pos.coords.longitude,
      );

      if (!place) return;

      const { communityId, communityName } =
        await CommunityService.assignUserToCommunity({
          userId: uid,
          neighborhood: place.neighborhood,
          district: place.district,
          city: place.city,
          country: place.country,
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
        });

      await UserService.updateUser(uid, {
        locationEnabled: true,
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
        area: place.neighborhood,
        neighborhood: place.neighborhood,
        district: place.district,
        city: place.city,
        country: place.country,
        communityId,
        lastLocationUpdate: new Date(),
      } as any);

      useAppStore.getState().setLocation(
        { lat: pos.coords.latitude, lng: pos.coords.longitude },
        {
          name: communityName,
          area: place.neighborhood,
          district: place.district,
          city: place.city,
          country: place.country,
          communityId,
        },
      );

      // If the user was on the gps-enable screen, this will cause index.tsx
      // to re-evaluate and navigate them into the app automatically.
    } catch (e) {
      console.warn("[LocationMonitor] Auto-recover failed:", e);
    }
  }

  // ─── App State Handler ────────────────────────────────────────────────────

  private static handleAppStateChange = async (
    nextAppState: AppStateStatus,
  ) => {
    if (nextAppState === "active") {
      // App foregrounded → do an immediate check (don't wait for next poll)
      await this.checkLocationState();
    }
  };

  // ─── Full State Check ─────────────────────────────────────────────────────

  static async checkLocationState() {
    const user = AuthService.getCurrentUser();
    if (!user) return;

    try {
      const { status } = await Location.getForegroundPermissionsAsync();

      if (status !== "granted") {
        this.handlePermissionRevoked();
        return;
      }

      const enabled = await Location.hasServicesEnabledAsync();

      if (!enabled) {
        useAppStore.getState().setGpsDisabled(true);
        return;
      }

      // GPS is on — clear disabled flag
      const wasDisabled = useAppStore.getState().isGpsDisabled;
      if (wasDisabled) {
        useAppStore.getState().setGpsDisabled(false);
        await this.autoRecoverLocation(user.uid);
        return;
      }

      // Everything is fine — silently sync if user moved significantly
      this.syncLocationSilent(user.uid);
    } catch (error) {
      console.error("[LocationMonitor] checkLocationState error:", error);
    }
  }

  // ─── Permission Revoked ───────────────────────────────────────────────────

  private static handlePermissionRevoked() {
    const state = useAppStore.getState();
    state.setLocationStatus("denied");
    state.clearLocation();
    router.replace("/(auth)/location-permission");
  }

  // ─── Silent Significant-Move Detection ───────────────────────────────────

  private static async syncLocationSilent(uid: string) {
    try {
      const pos = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      const currentCoords = useAppStore.getState().coordinates;
      if (!currentCoords) return;

      const dist = this.calculateDistance(
        currentCoords.lat,
        currentCoords.lng,
        pos.coords.latitude,
        pos.coords.longitude,
      );

      // Only reassign community if user moved more than 5 km
      if (dist > 5000) {
        const place = await LocationService.reverseGeocode(
          pos.coords.latitude,
          pos.coords.longitude,
        );
        if (!place) return;

        const { communityId, communityName } =
          await CommunityService.assignUserToCommunity({
            userId: uid,
            neighborhood: place.neighborhood,
            district: place.district,
            city: place.city,
            country: place.country,
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
          });

        const currentCommunity = useAppStore.getState().community;
        if (currentCommunity?.communityId !== communityId) {
          Alert.alert(
            "Location Changed",
            `You have been moved to your new local community: ${communityName}.`,
          );

          useAppStore.getState().setLocation(
            { lat: pos.coords.latitude, lng: pos.coords.longitude },
            {
              name: communityName,
              area: place.neighborhood,
              district: place.district,
              city: place.city,
              country: place.country,
              communityId,
            },
          );

          await UserService.updateUser(uid, {
            locationEnabled: true,
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            area: place.neighborhood,
            district: place.district,
            city: place.city,
            country: place.country,
            communityId,
            lastLocationUpdate: new Date(),
          } as any);
        }
      }
    } catch (e) {
      console.warn("[LocationMonitor] Silent sync failed:", e);
    }
  }

  // ─── Pre-Action Verification ─────────────────────────────────────────────

  static async verifyLocationBeforeAction(
    actionName: string,
  ): Promise<boolean> {
    const { status } = await Location.getForegroundPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(
        "Permission Required",
        `Location permission is required to ${actionName}.`,
      );
      return false;
    }

    const enabled = await Location.hasServicesEnabledAsync();
    if (!enabled) {
      useAppStore.getState().setGpsDisabled(true);
      Alert.alert(
        "Location Services Off",
        "Please enable Location Services to use this feature.",
      );
      return false;
    }

    const coords = useAppStore.getState().coordinates;
    if (!coords) {
      Alert.alert(
        "Location Error",
        "We could not determine your current location. Please try again.",
      );
      return false;
    }

    return true;
  }

  // ─── Haversine Helper ─────────────────────────────────────────────────────

  private static calculateDistance(
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
      Math.sin(dp / 2) * Math.sin(dp / 2) +
      Math.cos(p1) * Math.cos(p2) * Math.sin(dl / 2) * Math.sin(dl / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }
}
