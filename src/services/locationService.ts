import * as Location from 'expo-location';
import { generateCommunitySlug } from './communityService';

export interface GeoLocation {
  latitude: number;
  longitude: number;
}

export interface AddressDetails {
  neighborhood: string;  // e.g. "Block 13"
  district: string;      // e.g. "Gulshan-e-Iqbal"
  city: string;          // e.g. "Karachi"
  country: string;       // e.g. "Pakistan"
  communityId: string;   // e.g. "block-13-karachi"
}

// ─── Haversine Distance Formula ────────────────────────────────────────────────
/**
 * Calculate the great-circle distance between two GPS coordinates.
 * @returns Distance in kilometers (km)
 */
export function haversineDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371; // Earth's radius in km
  const toRad = (deg: number) => (deg * Math.PI) / 180;

  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Format a raw distance in km to a human-readable string.
 * e.g. 0.18 → "180 m away", 1.5 → "1.5 km away"
 */
export function formatDistance(km: number): string {
  if (km < 0.05) {
    return 'Nearby';
  }
  if (km < 1) {
    return `${Math.round(km * 1000)}m away`;
  }
  return `${km.toFixed(1)} km away`;
}

/**
 * Check whether a point is within a configurable radius (default 5 km).
 */
export function isWithinRadius(
  userLat: number,
  userLng: number,
  postLat: number,
  postLng: number,
  radiusKm: number = 5
): boolean {
  return haversineDistance(userLat, userLng, postLat, postLng) <= radiusKm;
}

// ─── Location Service ──────────────────────────────────────────────────────────
export class LocationService {

  static async requestPermissions(): Promise<boolean> {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      return status === 'granted';
    } catch (error) {
      console.error('Error requesting location permissions:', error);
      return false;
    }
  }

  static async checkPermissions(): Promise<boolean> {
    try {
      const { status } = await Location.getForegroundPermissionsAsync();
      return status === 'granted';
    } catch {
      return false;
    }
  }

  static async getCurrentLocation(): Promise<GeoLocation | null> {
    try {
      // ── 1. Try last known position first (fast, no timeout risk) ──────────
      try {
        const last = await Location.getLastKnownPositionAsync({
          maxAge: 60000,         // Accept positions up to 60s old
          requiredAccuracy: 500, // Within 500m
        });
        if (last) {
          return {
            latitude: last.coords.latitude,
            longitude: last.coords.longitude,
          };
        }
      } catch (_) {
        // No last known position — proceed to fresh acquisition
      }

      // ── 2. Fresh GPS fix with generous timeout ────────────────────────────
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
        timeInterval: 1000,
        distanceInterval: 0,
      });
      return {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      };
    } catch (error: any) {
      console.error('Error getting current location:', error?.message ?? error);
      // Re-throw so callers can distinguish GPS errors from permission errors
      throw error;
    }
  }

  static async reverseGeocode(
    latitude: number,
    longitude: number
  ): Promise<AddressDetails | null> {
    try {
      const result = await Location.reverseGeocodeAsync({ latitude, longitude });

      if (result.length > 0) {
        const addr = result[0];

        // South Asian addresses: expo-location fields:
        // addr.name        = specific place/building
        // addr.street      = street/road name
        // addr.district    = district (e.g. "Gulshan-e-Iqbal")
        // addr.subregion   = sub-region (varies by country)
        // addr.city        = city (e.g. "Karachi")
        // addr.region      = province/state

        // neighborhood = most specific available: street > district > subregion > city
        const neighborhood =
          addr.district ||
          addr.subregion ||
          addr.name ||
          addr.city ||
          'Unknown Area';

        // district = administrative district
        const district =
          addr.district ||
          addr.subregion ||
          addr.city ||
          'Unknown District';

        const city = addr.city || addr.region || 'Unknown City';
        const country = addr.country || 'Unknown Country';

        // Use the clean slug generator from CommunityService
        const communityId = generateCommunitySlug(district, city);

        return { neighborhood, district, city, country, communityId };
      }
      return null;
    } catch (error) {
      console.error('Error reverse geocoding:', error);
      return null;
    }
  }

  /**
   * Full pipeline: request permission → get GPS → reverse geocode.
   * Returns null if any step fails.
   */
  static async getFullLocationContext(): Promise<{
    latitude: number;
    longitude: number;
    address: AddressDetails;
  } | null> {
    try {
      const hasPermission = await this.requestPermissions();
      if (!hasPermission) return null;

      const pos = await this.getCurrentLocation();
      if (!pos) return null;

      const address = await this.reverseGeocode(pos.latitude, pos.longitude);
      if (!address) return null;

      return { latitude: pos.latitude, longitude: pos.longitude, address };
    } catch (error) {
      console.error('getFullLocationContext error:', error);
      return null;
    }
  }
}

// ─── Default radius constant (configurable) ────────────────────────────────────
export const DEFAULT_RADIUS_KM = 5;
export const EXTENDED_RADIUS_KM = 20;
