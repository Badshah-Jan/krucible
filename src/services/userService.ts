import {
  addDoc,
  arrayRemove,
  arrayUnion,
  collection,
  collectionGroup,
  doc,
  limit,
  orderBy,
  getDoc,
  getDocs,
  increment,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
  type QueryDocumentSnapshot,
  type DocumentData,
  type Query,
  type DocumentReference,
  type UpdateData,
  type WriteBatch,
} from "firebase/firestore";
import { deleteObject, ref } from "firebase/storage";
import { CloudinaryService } from "./cloudinaryService";
import { auth, db, storage } from "./firebase";
import NotificationService from "./notificationService";
import { SecurityService } from "./securityService";
import type { UserRole } from "@/types/roles";

// ─── Emergency Contact ────────────────────────────────────────────────────────
export interface EmergencyContact {
  id: string;
  name: string;
  phone: string;
  relationship: string;
  createdAt?: any;
}

// ─── Privacy Settings ─────────────────────────────────────────────────────────
export interface PrivacySettings {
  profileVisible: boolean; // Show profile to public
  activityVisible: boolean; // Show activity history
  locationVisible: boolean; // Show precise location vs community name only
  distanceVisible: boolean; // Show distance from other users
  allowDirectMessages: boolean; // Allow incoming DMs
}

// ─── User Profile ─────────────────────────────────────────────────────────────
export interface UserProfile {
  uid: string;
  name: string;
  handle?: string;
  bio?: string;
  email: string;
  photoURL: string;

  latitude?: number;
  longitude?: number;
  neighborhood?: string; // e.g. "Block 13" (street-level)
  area?: string; // alias for neighborhood (UI use)
  district?: string; // e.g. "Gulshan-e-Iqbal"
  city?: string;
  country?: string;
  communityId?: string;
  communityName?: string;
  createdAt: any;
  lastActive: any;
  postsCount?: number;
  commentsCount?: number;
  sosAlertsCreated?: number;
  sosResponsesGiven?: number;
  helpRequestsResolved?: number;
  fcmToken?: string;
  fcmTokens?: string[];
  notificationPreferences?: {
    pushEnabled: boolean;
    emailAlerts: boolean;
    sos: boolean;
    mentions: boolean;
    messages: boolean;

    community: boolean;
    recommendations: boolean;
    lostAndFound: boolean;
  };
  // Privacy
  privacySettings?: PrivacySettings;
  // Blocking & Following
  blockedUsers?: string[];
  following?: string[];
  followers?: string[];
  // Emergency Contacts
  emergencyContacts?: EmergencyContact[];
  // Location
  locationEnabled?: boolean;
  locationRadius?: number; // 1, 5, 10, 25
  lastLocationUpdate?: any;
  isOnline?: boolean;
  lastSeen?: any;

  // Reputation & Verification
  trustScore?: number;
  isVerified?: boolean;

  // Authorization
  role?: UserRole;
  emailVerified?: boolean;
}

/** Fields safe to expose when viewing another user's profile. */
export type PublicUserProfile = Pick<
  UserProfile,
  | "uid"
  | "name"
  | "handle"
  | "bio"
  | "photoURL"

  | "communityId"
  | "communityName"
  | "neighborhood"
  | "area"
  | "district"
  | "city"
  | "country"
  | "privacySettings"
  | "isOnline"
  | "lastSeen"
  | "createdAt"
  | "lastActive"
> & {
  // Exact coordinates only included when user has locationVisible enabled
  latitude?: number;
  longitude?: number;
};

const PROTECTED_PROFILE_FIELDS = [
  "role",

  "isVerified",
  "postsCount",
  "commentsCount",
  "sosAlertsCreated",
  "sosResponsesGiven",
  "helpRequestsResolved",
  "emailVerified",
  "createdAt",
  "email",
  "fcmToken",
  "fcmTokens",
] as const;

export class UserService {
  static toPublicProfile(profile: UserProfile): PublicUserProfile {
    const locationVisible = profile.privacySettings?.locationVisible !== false;
    const publicProfile: PublicUserProfile = {
      uid: profile.uid,
      name: profile.name,
      handle: profile.handle,
      bio: profile.bio,
      photoURL: profile.photoURL,

      communityId: profile.communityId,
      communityName: profile.communityName,
      neighborhood: profile.neighborhood,
      area: profile.area,
      district: profile.district,
      city: profile.city,
      country: profile.country,
      privacySettings: profile.privacySettings,
      isOnline: profile.isOnline,
      lastSeen: profile.lastSeen,
      createdAt: profile.createdAt,
      lastActive: profile.lastActive,
    };
    if (locationVisible) {
      publicProfile.latitude = profile.latitude;
      publicProfile.longitude = profile.longitude;
    }
    return publicProfile;
  }

  /** Full profile for the signed-in owner only. */
  static async getOwnProfile(uid: string): Promise<UserProfile | null> {
    try {
      const docRef = doc(db, "users", uid);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        return docSnap.data() as UserProfile;
      }
      return null;
    } catch (error) {
      console.error("Error fetching own profile:", error);
      throw error;
    }
  }

  /** Alias used by some screens for the current user's full profile. */
  static async getUserProfile(uid: string): Promise<UserProfile | null> {
    return this.getOwnProfile(uid);
  }

  static async getUser(uid: string): Promise<UserProfile | PublicUserProfile | null> {
    try {
      const docRef = doc(db, "users", uid);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const profile = docSnap.data() as UserProfile;
        const viewerUid = auth.currentUser?.uid;
        if (viewerUid === uid) {
          return profile;
        }
        return this.toPublicProfile(profile);
      }
      return null;
    } catch (error) {
      if ((error as any)?.code === "permission-denied") {
        console.warn(
          "User profile is not readable with current permissions:",
          uid,
        );
        return null;
      }
      console.error("Error fetching user:", error);
      throw error;
    }
  }

  static async getUsersByCommunity(communityId: string): Promise<PublicUserProfile[]> {
    try {
      const q = query(
        collection(db, "users"),
        where("communityId", "==", communityId)
      );
      const snapshot = await getDocs(q);
      return snapshot.docs.map((d) =>
        this.toPublicProfile(d.data() as UserProfile),
      );
    } catch (error) {
      console.error("Error fetching users by community:", error);
      return [];
    }
  }

  /**
   * Real-time subscription to all neighbors in a community.
   * Fires immediately when a user joins, updates their profile,
   * or has their account deleted by admin — zero manual refresh needed.
   */
  static subscribeToNeighborsByCommunity(
    communityId: string,
    callback: (neighbors: PublicUserProfile[]) => void,
    onError?: (err: Error) => void,
  ): () => void {
    const q = query(
      collection(db, "users"),
      where("communityId", "==", communityId),
      limit(150),
    );
    return onSnapshot(
      q,
      (snap) => {
        const neighbors = snap.docs.map((d) =>
          this.toPublicProfile(d.data() as UserProfile),
        );
        callback(neighbors);
      },
      (error) => {
        console.error("[UserService] Neighbors subscription error:", error);
        onError?.(error);
      },
    );
  }

  static async getUsersByRadius(
    userLat: number,
    userLng: number,
    radiusKm: number = 5
  ): Promise<PublicUserProfile[]> {
    try {
      const q = query(collection(db, "users"));
      const snapshot = await getDocs(q);
      
      const { isWithinRadius } = require('./locationService');
      
      const nearbyUsers = snapshot.docs
        .map((d) => d.data() as UserProfile)
        .filter((u) => {
          // If the user has location hidden, we might still include them if we want to guess based on community,
          // but for strict GPS-based nearby, we check their stored coordinates.
          if (u.latitude && u.longitude && u.privacySettings?.locationVisible !== false) {
            return isWithinRadius(userLat, userLng, u.latitude, u.longitude, radiusKm);
          }
          return false;
        })
        .map((u) => this.toPublicProfile(u));
        
      return nearbyUsers;
    } catch (error) {
      console.error("Error fetching users by radius:", error);
      return [];
    }
  }

  private static stripProtectedFields(
    updates: Partial<UserProfile>,
  ): Partial<UserProfile> {
    const safe = { ...updates };
    for (const field of PROTECTED_PROFILE_FIELDS) {
      delete (safe as Record<string, unknown>)[field];
    }
    return safe;
  }

  static async updateProfile(
    uid: string,
    updates: Partial<UserProfile>,
  ): Promise<void> {
    try {
      const safeUpdates = this.stripProtectedFields(updates);
      const docRef = doc(db, "users", uid);
      await setDoc(docRef, {
        ...safeUpdates,
        lastActive: serverTimestamp(),
      }, { merge: true });

      // Fan-out updates to denormalized data (Posts)
      if (updates.photoURL || updates.name) {
        this.syncUserMetadata(uid, updates.name, updates.photoURL);
      }
    } catch (error) {
      console.error("Error updating profile:", error);
      throw error;
    }
  }

  static async reportContent(
    reporterId: string,
    contentId: string,
    contentType: "post" | "comment",
    reason: string,
  ): Promise<void> {
    try {
      const reportsRef = collection(db, "reports");
      await addDoc(reportsRef, {
        reporterId,
        contentId,
        targetId: contentId,
        targetType: contentType,
        reason,
        status: "pending",
        createdAt: serverTimestamp(),
      });
    } catch (error) {
      console.error("Error reporting content:", error);
      throw error;
    }
  }

  static async toggleFollow(
    currentUserId: string,
    targetUserId: string,
  ): Promise<boolean> {
    try {
      if (currentUserId === targetUserId) return false;

      const currentUserRef = doc(db, "users", currentUserId);
      const targetUserRef = doc(db, "users", targetUserId);

      const currentUserSnap = await getDoc(currentUserRef);
      if (!currentUserSnap.exists()) return false;

      const data = currentUserSnap.data();
      const following: string[] = data.following || [];
      const isFollowing = following.includes(targetUserId);

      const batch = writeBatch(db);

      if (isFollowing) {
        batch.update(currentUserRef, { following: arrayRemove(targetUserId) });
        batch.update(targetUserRef, { followers: arrayRemove(currentUserId) });
      } else {
        batch.update(currentUserRef, { following: arrayUnion(targetUserId) });
        batch.update(targetUserRef, { followers: arrayUnion(currentUserId) });
      }

      await batch.commit();
      return !isFollowing; // returns new following state
    } catch (error) {
      console.error("Error toggling follow:", error);
      throw error;
    }
  }

  /**
   * Background task to sync denormalized user data across the application.
   */
  private static async syncUserMetadata(
    uid: string,
    newName?: string,
    newPhotoURL?: string,
  ) {
    try {
      const batch = writeBatch(db);
      const updates: any = {};
      if (newName) updates.userName = newName;
      if (newPhotoURL) updates.userAvatar = newPhotoURL;

      // Update user's posts
      const postsQ = query(collection(db, "posts"), where("userId", "==", uid));
      const postsSnap = await getDocs(postsQ);
      let count = 0;

      postsSnap.forEach((d: any) => {
        if (count < 490) {
          // Keep under Firestore 500 batch limit
          batch.update(d.ref, updates);
          count++;
        }
      });

      if (count > 0) {
        await batch.commit();
      }
    } catch (e) {
      console.error("Failed to sync user metadata to posts", e);
    }
  }

  static async uploadProfilePicture(
    uid: string,
    imageUri: string,
  ): Promise<string> {
    try {
      // 1. Get current user to find old avatar URL for cleanup (only if it was a Firebase Storage URL)
      const currentUser = await this.getOwnProfile(uid);
      const oldPhotoURL = currentUser?.photoURL;

      // 2. Upload image to Cloudinary
      const downloadURL = await CloudinaryService.uploadImage(imageUri);

      // 3. Save secure_url to Firestore
      await this.updateProfile(uid, { photoURL: downloadURL });

      // 4. Cleanup old avatar from Storage (if it was a Firebase Storage URL)
      if (
        oldPhotoURL &&
        oldPhotoURL.includes("firebasestorage.googleapis.com")
      ) {
        try {
          const oldRef = ref(storage, oldPhotoURL);
          await deleteObject(oldRef);
        } catch (cleanupError) {
          console.warn(
            "Old Firebase avatar cleanup failed (non-fatal):",
            cleanupError,
          );
        }
      }

      return downloadURL;
    } catch (error) {
      console.error("Error uploading profile picture:", error);
      throw error;
    }
  }

  static async createUser(
    uid: string,
    data: Partial<UserProfile>,
  ): Promise<void> {
    try {
      const docRef = doc(db, "users", uid);
      
      // Safety check: Don't overwrite if it already exists to avoid hitting strict 'update' rules.
      const snap = await getDoc(docRef);
      if (snap.exists()) return;

      await setDoc(docRef, {
        ...this.stripProtectedFields(data),
        uid,
        email: data.email || "no-email@neighborly.com", // Add back email since it's a protected field
        role: "user",

        postsCount: 0,
        commentsCount: 0,
        bio: "",
        handle: "",
        blockedUsers: [],
        emergencyContacts: [],
        privacySettings: {
          profileVisible: true,
          activityVisible: true,
          locationVisible: true,
          distanceVisible: true,
        },
        notificationPreferences: {
          pushEnabled: true,
          emailAlerts: true,
          sos: true,
          mentions: true,
          messages: true,

          community: true,
          recommendations: true,
          lostAndFound: true,
        },
        createdAt: serverTimestamp(),
        lastActive: serverTimestamp(),
      });
    } catch (error) {
      console.error("Error creating user:", error);
      throw error;
    }
  }

  static async updateUser(
    uid: string,
    data: Partial<UserProfile>,
  ): Promise<void> {
    try {
      const docRef = doc(db, "users", uid);
      await setDoc(docRef, {
        ...data,
        lastActive: serverTimestamp(),
      }, { merge: true });
    } catch (error) {
      console.error("Error updating user:", error);
      throw error;
    }
  }

  // ── Notification Preferences ──────────────────────────────────────────────

  static async updateNotificationPreferences(
    uid: string,
    preferences: Partial<UserProfile["notificationPreferences"]>,
  ): Promise<void> {
    try {
      const docRef = doc(db, "users", uid);
      const current = await this.getOwnProfile(uid);
      const updatedPrefs = {
        pushEnabled: true,
        emailAlerts: true,
        sos: true,
        mentions: true,
        messages: true,

        community: true,
        recommendations: true,
        lostAndFound: true,
        ...(current?.notificationPreferences || {}),
        ...preferences,
      };

      await setDoc(docRef, {
        notificationPreferences: updatedPrefs,
        lastActive: serverTimestamp(),
      }, { merge: true });
    } catch (error) {
      console.error("Error updating notification preferences:", error);
      throw error;
    }
  }

  // ── Privacy Settings ──────────────────────────────────────────────────────

  static async updatePrivacySettings(
    uid: string,
    settings: Partial<PrivacySettings>,
  ): Promise<void> {
    try {
      const docRef = doc(db, "users", uid);
      const current = await this.getOwnProfile(uid);
      const updatedSettings: PrivacySettings = {
        profileVisible: true,
        activityVisible: true,
        locationVisible: true,
        distanceVisible: true,
        allowDirectMessages: true,
        ...(current?.privacySettings || {}),
        ...Object.fromEntries(Object.entries(settings).filter(([_, v]) => v !== undefined)),
      } as PrivacySettings;

      await setDoc(docRef, {
        privacySettings: updatedSettings,
        lastActive: serverTimestamp(),
      }, { merge: true });
    } catch (error) {
      console.error("Error updating privacy settings:", error);
      throw error;
    }
  }

  // ── Blocked Users ─────────────────────────────────────────────────────────

  static async blockUser(uid: string, blockedUid: string): Promise<void> {
    try {
      const docRef = doc(db, "users", uid);
      await setDoc(docRef, {
        blockedUsers: arrayUnion(blockedUid),
        lastActive: serverTimestamp(),
      }, { merge: true });
    } catch (error) {
      console.error("Error blocking user:", error);
      throw error;
    }
  }

  static async unblockUser(uid: string, blockedUid: string): Promise<void> {
    try {
      const docRef = doc(db, "users", uid);
      await setDoc(docRef, {
        blockedUsers: arrayRemove(blockedUid),
        lastActive: serverTimestamp(),
      }, { merge: true });
    } catch (error) {
      console.error("Error unblocking user:", error);
      throw error;
    }
  }

  static async getBlockedUsers(uid: string): Promise<string[]> {
    try {
      const user = await this.getOwnProfile(uid);
      return user?.blockedUsers || [];
    } catch (error) {
      console.error("Error getting blocked users:", error);
      return [];
    }
  }

  static async isUserBlocked(uid: string, targetUid: string): Promise<boolean> {
    const blocked = await this.getBlockedUsers(uid);
    return blocked.includes(targetUid);
  }

  // ── Emergency Contacts ────────────────────────────────────────────────────

  static async addEmergencyContact(
    uid: string,
    contact: Omit<EmergencyContact, "id" | "createdAt">,
  ): Promise<void> {
    try {
      const newContact: EmergencyContact = {
        ...contact,
        id: `ec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        createdAt: new Date().toISOString(),
      };
      const docRef = doc(db, "users", uid);
      await setDoc(docRef, {
        emergencyContacts: arrayUnion(newContact),
        lastActive: serverTimestamp(),
      }, { merge: true });
    } catch (error) {
      console.error("Error adding emergency contact:", error);
      throw error;
    }
  }

  static async removeEmergencyContact(
    uid: string,
    contactId: string,
  ): Promise<void> {
    try {
      const user = await this.getOwnProfile(uid);
      const contacts = user?.emergencyContacts || [];
      const updated = contacts.filter((c: EmergencyContact) => c.id !== contactId);
      const docRef = doc(db, "users", uid);
      await setDoc(docRef, {
        emergencyContacts: updated,
        lastActive: serverTimestamp(),
      }, { merge: true });
    } catch (error) {
      console.error("Error removing emergency contact:", error);
      throw error;
    }
  }

  static async updateEmergencyContact(
    uid: string,
    contactId: string,
    updates: Partial<EmergencyContact>,
  ): Promise<void> {
    try {
      const user = await this.getOwnProfile(uid);
      const contacts = user?.emergencyContacts || [];
      const updated = contacts.map((c: EmergencyContact) =>
        c.id === contactId ? { ...c, ...updates } : c,
      );
      const docRef = doc(db, "users", uid);
      await setDoc(docRef, {
        emergencyContacts: updated,
        lastActive: serverTimestamp(),
      }, { merge: true });
    } catch (error) {
      console.error("Error updating emergency contact:", error);
      throw error;
    }
  }

  static async getEmergencyContacts(uid: string): Promise<EmergencyContact[]> {
    try {
      const user = await this.getOwnProfile(uid);
      return user?.emergencyContacts || [];
    } catch (error) {
      console.error("Error getting emergency contacts:", error);
      return [];
    }
  }



  static async incrementPostsCount(uid: string): Promise<void> {
    try {
      const docRef = doc(db, "users", uid);
      await setDoc(docRef, {
        postsCount: increment(1),
        lastActive: serverTimestamp(),
      }, { merge: true });
    } catch (error) {
      console.warn("Posts count increment failed (expected if cloud functions are missing):", error);
    }
  }

  static async incrementCommentsCount(uid: string): Promise<void> {
    try {
      const docRef = doc(db, "users", uid);
      await setDoc(docRef, {
        commentsCount: increment(1),
        lastActive: serverTimestamp(),
      }, { merge: true });
    } catch (error) {
      console.warn("Comments count increment failed (expected if cloud functions are missing):", error);
    }
  }

  // ── Real-time Subscription ────────────────────────────────────────────────

  static subscribeToUser(
    uid: string,
    callback: (user: UserProfile | null) => void,
  ) {
    const docRef = doc(db, "users", uid);
    return onSnapshot(
      docRef,
      (docSnap: any) => {
        if (docSnap.exists()) {
          callback(docSnap.data() as UserProfile);
        } else {
          callback(null);
        }
      },
      (error: any) => {
        console.warn("Subscription warning (user):", error?.message || error);
      },
    );
  }



  static async cleanupUserData(uid: string): Promise<void> {
    try {
      const userRef = doc(db, "users", uid);
      const userSnap = await getDoc(userRef);
      const userProfile = userSnap.exists() ? userSnap.data() : null;

      const batches: WriteBatch[] = [];
      let currentBatch = writeBatch(db);
      let opCount = 0;

      const safelyDelete = (ref: DocumentReference<DocumentData>) => {
        if (opCount >= 490) {
          batches.push(currentBatch);
          currentBatch = writeBatch(db);
          opCount = 0;
        }
        currentBatch.delete(ref);
        opCount++;
      };

      const safelyUpdate = (ref: DocumentReference<DocumentData>, data: UpdateData<DocumentData>) => {
        if (opCount >= 490) {
          batches.push(currentBatch);
          currentBatch = writeBatch(db);
          opCount = 0;
        }
        currentBatch.update(ref, data);
        opCount++;
      };

      // Helper for querying and processing safely
      const processQuery = async (
        q: Query<DocumentData>,
        isDelete = true,
        updateData?: UpdateData<DocumentData>,
        imageFields: string[] = [],
      ) => {
        try {
          const snap = await getDocs(q);
          for (const docSnap of snap.docs) {
            const data = docSnap.data() as Record<string, unknown>;

            // Delete Cloudinary images if specified
            if (isDelete && imageFields.length > 0) {
              for (const field of imageFields) {
                const value = data[field];
                if (value) {
                  if (Array.isArray(value)) {
                    for (const url of value) {
                      if (typeof url === "string" && url.includes("cloudinary.com")) {
                        await CloudinaryService.deleteImage(url);
                      }
                    }
                  } else if (typeof value === "string" && value.includes("cloudinary.com")) {
                    await CloudinaryService.deleteImage(value);
                  }
                }
              }
            }

            if (isDelete) {
              safelyDelete(docSnap.ref);
            } else if (updateData) {
              safelyUpdate(docSnap.ref, updateData);
            }
          }
        } catch (e) {
          console.warn(`Cleanup partial failure for query:`, e);
        }
      };

      // (userProfile already fetched at the start of cleanupUserData)

      if (userProfile && userProfile.photoURL && userProfile.photoURL.includes('firebasestorage.googleapis.com')) {
        try {
          const { ref: storageRef, deleteObject } = require('firebase/storage');
          const { storage } = require('./firebase');
          const oldRef = storageRef(storage, userProfile.photoURL);
          await deleteObject(oldRef);
        } catch (e) {
          console.warn("Could not delete legacy Firebase avatar:", e);
        }
      } else if (userProfile && userProfile.photoURL && userProfile.photoURL.includes('cloudinary.com')) {
        await CloudinaryService.deleteImage(userProfile.photoURL);
      }

      // 1. Posts & Liked Posts
      const postsQ = query(collection(db, "posts"), where("userId", "==", uid));
      await processQuery(postsQ, true, undefined, ['mediaUrls', 'image', 'imageUrl']);
      

      // 2. Comments & Messages (Collection Group allowed by new rules)
      const commentsQ = query(collectionGroup(db, "comments"), where("userId", "==", uid));
      await processQuery(commentsQ);

      const msgsQ = query(collectionGroup(db, "messages"), where("senderId", "==", uid));
      await processQuery(msgsQ);

      // 3. Businesses & Reviews
      const bizQ = query(collection(db, "businesses"), where("userId", "==", uid));
      await processQuery(bizQ, true, undefined, ['images', 'coverImage', 'logoUrl']);
      const bizRevQ = query(collection(db, "business_reviews"), where("userId", "==", uid));
      await processQuery(bizRevQ);

      // 4. Services & Reviews
      const srvQ = query(collection(db, "services"), where("userId", "==", uid));
      await processQuery(srvQ, true, undefined, ['images', 'coverImage', 'logoUrl']);
      const srvRevQ = query(collection(db, "service_reviews"), where("userId", "==", uid));
      await processQuery(srvRevQ);

      // 5. SOS Alerts
      const sosQ = query(collection(db, "sos_alerts"), where("creatorId", "==", uid));
      await processQuery(sosQ);

      // 6. Reports
      const reportsQ = query(collection(db, "reports"), where("reporterId", "==", uid));
      await processQuery(reportsQ);

      // 7. Notifications
      const notifQ = query(collection(db, "notifications"), where("userId", "==", uid));
      await processQuery(notifQ);
      // 9. Conversations (DMs vs Community)
      try {
        const convsQ = query(collection(db, "conversations"), where("participants", "array-contains", uid));
        const convsSnap = await getDocs(convsQ);
        convsSnap.forEach((docSnap: QueryDocumentSnapshot<DocumentData>) => {
          const data = docSnap.data() as { type?: string };
          if (data.type === "dm") {
            safelyDelete(docSnap.ref);
          } else if (data.type === "community") {
            safelyUpdate(docSnap.ref, { participants: arrayRemove(uid) });
          }
        });
      } catch(e) {
        console.warn("Conversation cleanup failed", e);
      }

      // 10. Followers/Following Cleanup
      const followingQ = query(collection(db, "users"), where("followers", "array-contains", uid));
      await processQuery(followingQ, false, { followers: arrayRemove(uid) });

      const followersQ = query(collection(db, "users"), where("following", "array-contains", uid));
      await processQuery(followersQ, false, { following: arrayRemove(uid) });

      // 11. Decrement Community Member Count
      if (userProfile?.communityId) {
        safelyUpdate(doc(db, "communities", userProfile.communityId), {
          memberCount: increment(-1)
        });
      }

      // 12. User Profile Document
      safelyDelete(doc(db, "users", uid));

      // Execute all batches
      batches.push(currentBatch);
      for (const b of batches) {
        await b.commit();
      }
    } catch (error) {
      console.error("Error cleaning up user data:", error);
      throw error;
    }
  }
}
