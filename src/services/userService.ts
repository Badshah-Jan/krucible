import {
  addDoc,
  arrayRemove,
  arrayUnion,
  collection,
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
} from "firebase/firestore";
import { deleteObject, ref } from "firebase/storage";
import { CloudinaryService } from "./cloudinaryService";
import { db, storage } from "./firebase";
import NotificationService from "./notificationService";

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
}

// ─── User Profile ─────────────────────────────────────────────────────────────
export interface UserProfile {
  uid: string;
  name: string;
  handle?: string;
  bio?: string;
  email: string;
  photoURL: string;
  karma: number;
  level: string;
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
    karma: boolean;
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
  lastLocationUpdate?: any;
}

export class UserService {
  static async getUser(uid: string): Promise<UserProfile | null> {
    try {
      const docRef = doc(db, "users", uid);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        return docSnap.data() as UserProfile;
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

  static async updateProfile(
    uid: string,
    updates: Partial<UserProfile>,
  ): Promise<void> {
    try {
      const docRef = doc(db, "users", uid);
      await setDoc(docRef, {
        ...updates,
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
        contentType,
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
      const currentUser = await this.getUser(uid);
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
      await setDoc(docRef, {
        ...data,
        uid,
        karma: 0,
        level: "Neighbor",
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
          karma: true,
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
      const current = await this.getUser(uid);
      const updatedPrefs = {
        pushEnabled: true,
        emailAlerts: true,
        sos: true,
        mentions: true,
        messages: true,
        karma: true,
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
      const current = await this.getUser(uid);
      const updatedSettings: PrivacySettings = {
        profileVisible: true,
        activityVisible: true,
        locationVisible: true,
        distanceVisible: true,
        ...(current?.privacySettings || {}),
        ...settings,
      };

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
      const user = await this.getUser(uid);
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
      const user = await this.getUser(uid);
      const contacts = user?.emergencyContacts || [];
      const updated = contacts.filter((c) => c.id !== contactId);
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
      const user = await this.getUser(uid);
      const contacts = user?.emergencyContacts || [];
      const updated = contacts.map((c) =>
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
      const user = await this.getUser(uid);
      return user?.emergencyContacts || [];
    } catch (error) {
      console.error("Error getting emergency contacts:", error);
      return [];
    }
  }

  // ── Karma ─────────────────────────────────────────────────────────────────

  static async incrementKarma(
    uid: string,
    amount: number,
    reason: string = "Your helpful contribution was appreciated",
  ): Promise<void> {
    try {
      const docRef = doc(db, "users", uid);
      await setDoc(docRef, {
        karma: increment(amount),
        lastActive: serverTimestamp(),
      }, { merge: true });

      // ─── NEW: Add history record ──────────────────────────────────────────
      const historyRef = collection(db, "users", uid, "karma_history");
      let action = "Earned Karma";
      let icon = "star-outline";
      let color = "#F59E0B";
      if (amount === 2) {
        action = "Participated in Chat";
        icon = "chatbubble-outline";
        color = "#8B5CF6";
      } else if (amount === 10) {
        action = "Created Community Post";
        icon = "document-text-outline";
        color = "#059669";
      } else if (amount === 50) {
        action = "Answered SOS Alert";
        icon = "heart-outline";
        color = "#EF4444";
      }

      await addDoc(historyRef, {
        action,
        points: `+${amount}`,
        color,
        icon,
        createdAt: serverTimestamp(),
      });
      // ─── END: History record ──────────────────────────────────────────────

      // ─── NEW: Send karma notification ────────────────────────────────────
      if (amount > 0) {
        try {
          // Avoid circular dependency by getting singleton instance or using the class method
          await NotificationService.sendInAppNotification(
            uid,
            `⭐ +${amount} Karma Points!`,
            reason,
            "karma_reward",
            {
              points: amount,
              reason,
            },
          );
        } catch (notifError) {
          console.warn(
            "[UserService] Karma notification failed (non-critical):",
            notifError,
          );
        }
      }
      // ─── END: Karma notification ────────────────────────────────────────
    } catch (error) {
      console.error("Error incrementing karma:", error);
      throw error;
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
      console.error("Error incrementing posts count:", error);
      throw error;
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
      console.error("Error incrementing comments count:", error);
      throw error;
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
        console.error("Error subscribing to user:", error);
      },
    );
  }

  static subscribeToKarmaHistory(
    uid: string,
    callback: (history: any[]) => void
  ) {
    const q = query(
      collection(db, "users", uid, "karma_history"),
      orderBy("createdAt", "desc"),
      limit(50)
    );
    return onSnapshot(
      q,
      (snapshot: any) => {
        const history = snapshot.docs.map((d: any) => ({
          id: d.id,
          ...d.data()
        }));
        callback(history);
      },
      (error: any) => {
        console.error("Error subscribing to karma history:", error);
      }
    );
  }

  static async cleanupUserData(uid: string): Promise<void> {
    try {
      const batch = writeBatch(db);
      let count = 0;
      
      const safelyDelete = (ref: any) => {
        if (count < 490) {
          batch.delete(ref);
          count++;
        }
      };

      // 1. Delete all posts by user
      const postsQ = query(collection(db, "posts"), where("userId", "==", uid));
      const postsSnap = await getDocs(postsQ);
      postsSnap.forEach((docSnap: any) => safelyDelete(docSnap.ref));

      // 2. Delete all notifications for user
      const notifQ = query(collection(db, "notifications"), where("userId", "==", uid));
      const notifSnap = await getDocs(notifQ);
      notifSnap.forEach((docSnap: any) => safelyDelete(docSnap.ref));

      // 3. Delete karma history
      const karmaQ = collection(db, "users", uid, "karma_history");
      const karmaSnap = await getDocs(karmaQ);
      karmaSnap.forEach((docSnap: any) => safelyDelete(docSnap.ref));

      // 4. Delete user document
      safelyDelete(doc(db, "users", uid));

      if (count > 0) {
        await batch.commit();
      }
    } catch (error) {
      console.error("Error cleaning up user data:", error);
      throw error;
    }
  }
}
