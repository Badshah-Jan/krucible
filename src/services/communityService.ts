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
  id: string;
  name: string;
  district: string;
  city: string;
  country: string;
  centerLat: number;
  centerLng: number;
  memberCount: number;
  radiusKm: number;
  createdAt: any;
  updatedAt: any;
}

// ─── Slug Generator ────────────────────────────────────────────────────────────
export function generateCommunitySlug(district: string, city: string): string {
  const raw = district && district !== city ? district : city;
  return raw
    .toLowerCase()
    .replace(/\b(e|al|ul|el|de|the|of|and|&)\b/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^-|-$/g, '');
}

export function generateCommunityName(
  district: string,
  neighborhood: string,
  city: string,
): string {
  if (district && district !== city) return district;
  if (neighborhood && neighborhood !== city) return neighborhood;
  return city;
}

// ─── Community Service ─────────────────────────────────────────────────────────
export class CommunityService {

  /**
   * Ensure the community document exists and is up to date.
   * Does NOT write communityId to the user document.
   * Call this before confirming a primary community.
   */
  static async ensureCommunityExists(params: {
    neighborhood: string;
    district: string;
    city: string;
    country: string;
    latitude: number;
    longitude: number;
  }): Promise<{ communityId: string; communityName: string }> {
    const { neighborhood, district, city, country, latitude, longitude } = params;

    const communityId = generateCommunitySlug(district, city);
    const communityName = generateCommunityName(district, neighborhood, city);

    const communityRef = doc(db, 'communities', communityId);
    const communitySnap = await getDoc(communityRef);

    if (!communitySnap.exists()) {
      await setDoc(communityRef, {
        id: communityId,
        name: communityName,
        district,
        city,
        country,
        centerLat: latitude,
        centerLng: longitude,
        memberCount: 0,
        radiusKm: 5,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }

    return { communityId, communityName };
  }

  /**
   * Permanently confirm a user's primary community.
   * Called only when the user explicitly taps "Yes, this is my home".
   * Increments memberCount and writes primaryCommunityId to the user doc.
   */
  static async confirmPrimaryCommunity(params: {
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
      const existingPrimaryId = userSnap.exists()
        ? (userSnap.data().primaryCommunityId ?? userSnap.data().communityId ?? null)
        : null;

      const communityRef = doc(db, 'communities', communityId);
      const communitySnap = await getDoc(communityRef);

      if (!communitySnap.exists()) {
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
      } else if (existingPrimaryId !== communityId) {
        await updateDoc(communityRef, {
          memberCount: increment(1),
          updatedAt: serverTimestamp(),
        });
      }

      // Decrement old primary community if switching
      if (existingPrimaryId && existingPrimaryId !== communityId) {
        try {
          await updateDoc(doc(db, 'communities', existingPrimaryId), {
            memberCount: increment(-1),
            updatedAt: serverTimestamp(),
          });
        } catch (_) {}
      }

      // Write primary community fields to user document
      await setDoc(
        userRef,
        {
          primaryCommunityId: communityId,
          primaryCommunityName: communityName,
          communityConfirmedAt: serverTimestamp(),
          // Keep legacy communityId in sync for backward-compat reads
          communityId,
          communityName,
          lastActive: serverTimestamp(),
        },
        { merge: true },
      );

      return { communityId, communityName };
    } catch (error) {
      console.error('CommunityService.confirmPrimaryCommunity error:', error);
      throw error;
    }
  }

  /**
   * Allow a user to voluntarily change their primary community.
   * Requires explicit user intent — never called automatically.
   */
  static async changePrimaryCommunity(params: {
    userId: string;
    neighborhood: string;
    district: string;
    city: string;
    country: string;
    latitude: number;
    longitude: number;
  }): Promise<{ communityId: string; communityName: string }> {
    return this.confirmPrimaryCommunity(params);
  }

  /**
   * @deprecated Use confirmPrimaryCommunity for new code.
   * Kept for backward compatibility with screens not yet migrated.
   * Internally calls confirmPrimaryCommunity so behaviour is safe.
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
    return this.confirmPrimaryCommunity(params);
  }

  /**
   * @deprecated Alias for backward-compat.
   */
  static async updateUserCommunity(params: {
    userId: string;
    oldCommunityId?: string;
    neighborhood: string;
    district: string;
    city: string;
    country: string;
    latitude: number;
    longitude: number;
  }): Promise<{ communityId: string; communityName: string }> {
    const { oldCommunityId: _, ...rest } = params;
    return this.confirmPrimaryCommunity(rest);
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
    callback: (community: CommunityDoc | null) => void,
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
