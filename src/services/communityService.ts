import { db } from './firebase';
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  increment,
  serverTimestamp,
  onSnapshot,
} from 'firebase/firestore';

// ─── Community Document (Firestore: /communities/{communityId}) ───────────────
export interface CommunityDoc {
  id: string;           // slug e.g. "gulshan-iqbal"
  name: string;         // display e.g. "Gulshan-e-Iqbal"
  district: string;
  city: string;
  country: string;
  centerLat: number;
  centerLng: number;
  memberCount: number;
  radiusKm: number;     // default 5 km
  createdAt: any;
  updatedAt: any;
}

// ─── Slug Generator ────────────────────────────────────────────────────────────
/**
 * Convert a raw place name into a clean, URL-safe community ID.
 *
 * Examples:
 *   "Gulshan-e-Iqbal"  → "gulshan-iqbal"
 *   "DHA Phase 6"      → "dha-phase-6"
 *   "Camden"           → "camden"
 *   "Manhattan"        → "manhattan"
 *   "Block 13"         → "block-13"
 */
export function generateCommunitySlug(district: string, city: string): string {
  const raw = district && district !== city ? district : city;

  return raw
    .toLowerCase()
    // Remove common filler words (articles, prepositions) that pad slugs
    .replace(/\b(e|al|ul|el|de|the|of|and|&)\b/g, '')
    // Replace non-alphanumeric with dashes
    .replace(/[^a-z0-9]+/g, '-')
    // Collapse multiple dashes
    .replace(/-{2,}/g, '-')
    // Trim leading/trailing dashes
    .replace(/^-|-$/g, '');
}

/**
 * Generate the human-readable community display name.
 *
 * Examples:
 *   district = "Gulshan-e-Iqbal", city = "Karachi"  → "Gulshan-e-Iqbal"
 *   district = "Karachi",         city = "Karachi"   → "Karachi"
 */
export function generateCommunityName(
  district: string,
  neighborhood: string,
  city: string
): string {
  if (district && district !== city) return district;
  if (neighborhood && neighborhood !== city) return neighborhood;
  return city;
}

// ─── Community Service ─────────────────────────────────────────────────────────
export class CommunityService {

  /**
   * Core assignment pipeline.
   * - Builds the communityId slug and display name from location data.
   * - Creates the Firestore /communities/{slug} document if new.
   * - Updates memberCount (idempotent — just increments on every new location save).
   * - Writes communityId + communityName back to the user document.
   *
   * Returns the resolved { communityId, communityName } for use in Zustand.
   */
  static async assignUserToCommunity(params: {
    userId: string;
    neighborhood: string;
    district: string;
    city: string;
    country: string;
    latitude: number;
    longitude: number;
  }): Promise<{ communityId: string; communityName: string }> {
    const { userId, neighborhood, district, city, country, latitude, longitude } = params;

    const communityId = generateCommunitySlug(district, city);
    const communityName = generateCommunityName(district, neighborhood, city);

    try {
      const userRef = doc(db, 'users', userId);
      const userSnap = await getDoc(userRef);
      const oldCommunityId = userSnap.exists() ? userSnap.data().communityId : null;

      const communityRef = doc(db, 'communities', communityId);
      const communitySnap = await getDoc(communityRef);

      if (!communitySnap.exists()) {
        // First member — create the community document
        await setDoc(communityRef, {
          id: communityId,
          name: communityName,
          district,
          city,
          country,
          centerLat: latitude,
          centerLng: longitude,
          memberCount: 1,
          radiusKm: 5,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      } else if (oldCommunityId !== communityId) {
        // Community already exists AND user is new to it — bump memberCount + timestamp
        await updateDoc(communityRef, {
          memberCount: increment(1),
          updatedAt: serverTimestamp(),
        });
      }

      // Decrement old community's member count if the user is switching communities
      if (oldCommunityId && oldCommunityId !== communityId) {
        try {
          const oldRef = doc(db, 'communities', oldCommunityId);
          await updateDoc(oldRef, {
            memberCount: increment(-1),
            updatedAt: serverTimestamp(),
          });
        } catch (e) {
          // Non-fatal
        }
      }

      // Persist communityId on the user document
      await setDoc(userRef, {
        communityId,
        communityName,
        lastActive: serverTimestamp(),
      }, { merge: true });

      return { communityId, communityName };
    } catch (error) {
      console.error('CommunityService.assignUserToCommunity error:', error);
      throw error;
    }
  }

  /**
   * Re-assign a user when their location has permanently changed.
   * Decrements the old community's memberCount, then calls assignUserToCommunity.
   */
  static async updateUserCommunity(params: {
    userId: string;
    oldCommunityId: string | undefined;
    neighborhood: string;
    district: string;
    city: string;
    country: string;
    latitude: number;
    longitude: number;
  }): Promise<{ communityId: string; communityName: string }> {
    const { oldCommunityId, ...rest } = params;
    // assignUserToCommunity now automatically handles decrementing old communities
    // based on the database state, so we just pass it through.
    return this.assignUserToCommunity(rest);
  }

  // ── Read ──────────────────────────────────────────────────────────────────
  static async getCommunity(communityId: string): Promise<CommunityDoc | null> {
    try {
      const snap = await getDoc(doc(db, 'communities', communityId));
      return snap.exists() ? (snap.data() as CommunityDoc) : null;
    } catch {
      return null;
    }
  }

  static subscribeToCommunity(
    communityId: string,
    callback: (community: CommunityDoc | null) => void
  ): () => void {
    return onSnapshot(doc(db, 'communities', communityId), (snap: any) => {
      callback(snap.exists() ? (snap.data() as CommunityDoc) : null);
    });
  }

  static async getMemberCount(communityId: string): Promise<number> {
    const c = await this.getCommunity(communityId);
    return c?.memberCount ?? 0;
  }

  static async getRadius(communityId: string): Promise<number> {
    const c = await this.getCommunity(communityId);
    return c?.radiusKm ?? 5;
  }
}
