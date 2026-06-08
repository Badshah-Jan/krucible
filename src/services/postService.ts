import {
  addDoc,
  arrayRemove,
  arrayUnion,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  increment,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
  writeBatch,
} from "firebase/firestore";
import { db } from "./firebase";
import {
  DEFAULT_RADIUS_KM,
  formatDistance,
  haversineDistance,
  isWithinRadius,
} from "./locationService";
import type { NotificationType } from "./notificationService";
import NotificationService from "./notificationService";
import { UserService } from "./userService";

export interface Post {
  id?: string;
  userId: string;
  userName?: string;
  userAvatar?: string;
  communityId: string;
  title: string;
  description: string;
  category: string;
  latitude: number;
  longitude: number;
  area?: string;
  district?: string;
  city?: string;
  country?: string;
  createdAt?: any;
  likesCount: number;
  commentsCount: number;
  likedBy?: string[];
  responderIds?: string[];
  responderDetails?: Record<
    string,
    { name: string; photoURL: string | null; respondedAt: any }
  >;
  respondersCount?: number;
  // Computed client-side, not stored:
  distanceKm?: number;
  distanceLabel?: string;
  sponsored?: boolean;
}

export class PostService {
  /**
   * Map a post category to the correct notification type.
   * Returns null for 'Emergency' since SOS uses its own broadcastSOSAlert flow.
   */
  private static getCategoryNotificationType(
    category: string,
  ): NotificationType | null {
    const cat = category?.toLowerCase();
    if (cat === "emergency") return null; // SOS has its own broadcast
    if (cat === "recommendations") return "recommendation";
    if (cat === "lost & found" || cat === "lost_found" || cat === "lost")
      return "lost_found";
    // General, Help, Food, Services → community_update
    return "community_update";
  }

  static async createPost(
    postData: Omit<
      Post,
      | "id"
      | "createdAt"
      | "likesCount"
      | "commentsCount"
      | "distanceKm"
      | "distanceLabel"
    >,
  ): Promise<string> {
    try {
      const docRef = await addDoc(collection(db, "posts"), {
        ...postData,
        likesCount: 0,
        commentsCount: 0,
        likedBy: [],
        createdAt: serverTimestamp(),
      });

      // Notify community members for non-SOS posts (fire-and-forget)
      const notifType = this.getCategoryNotificationType(postData.category);
      if (notifType && postData.communityId) {
        this.broadcastPostNotification(
          postData.userId,
          postData.userName || "A Neighbor",
          postData.title,
          postData.communityId,
          docRef.id,
          notifType,
          postData.category,
          postData.area || postData.district,
        ).catch((e) =>
          console.warn(
            "[PostService] Post notification broadcast failed (non-fatal):",
            e,
          ),
        );
      }

      return docRef.id;
    } catch (error) {
      console.error("Error creating post:", error);
      throw error;
    }
  }

  /**
   * Broadcast a notification to community members when a new post is created.
   * Respects each recipient's notification preferences and block list.
   * Skips the post author.
   */
  private static async broadcastPostNotification(
    authorUid: string,
    authorName: string,
    postTitle: string,
    communityId: string,
    postId: string,
    notifType: NotificationType,
    category: string,
    area?: string,
  ) {
    try {
      const usersSnap = await getDocs(
        query(collection(db, "users"), where("communityId", "==", communityId)),
      );

      const categoryLabel =
        category.charAt(0).toUpperCase() + category.slice(1);
      const title = `📢 New ${categoryLabel} post`;
      const body = `${authorName}: ${postTitle}${area ? ` (${area})` : ""}`;

      const allUsers = usersSnap.docs.map((d: any) => ({ uid: d.id, ...d.data() }));

      // Filter: not the author, preference enabled, not blocked
      const recipients = allUsers.filter((user: any) => {
        if (user.uid === authorUid) return false;
        const prefs = (user as any).notificationPreferences;
        if (prefs) {
          if (prefs.pushEnabled === false) return false;
          // Check type-specific preference
          const TYPE_MAP: Record<string, string> = {
            community_update: "community",
            recommendation: "recommendations",
            lost_found: "lostAndFound",
          };
          const prefKey = TYPE_MAP[notifType];
          if (prefKey && (prefs as any)[prefKey] === false) return false;
        }
        const blocked: string[] = (user as any).blockedUsers || [];
        if (blocked.includes(authorUid)) return false;
        return true;
      });

      if (recipients.length === 0) return;

      // Use writeBatch for efficient writes
      const BATCH_SIZE = 499;
      for (let i = 0; i < recipients.length; i += BATCH_SIZE) {
        const batch = writeBatch(db);
        const chunk = recipients.slice(i, i + BATCH_SIZE);
        for (const user of chunk) {
          const ref = doc(collection(db, "notifications"));
          batch.set(ref, {
            userId: user.uid,
            title,
            body,
            type: notifType,
            read: false,
            data: { postId, senderId: authorUid, category },
            createdAt: serverTimestamp(),
          });
        }
        await batch.commit();
      }
    } catch (error) {
      console.error("[PostService] broadcastPostNotification error:", error);
    }
  }

  static async deletePost(postId: string): Promise<void> {
    try {
      await deleteDoc(doc(db, "posts", postId));
    } catch (error) {
      console.error("Error deleting post:", error);
      throw error;
    }
  }

  static async updatePost(
    postId: string,
    updates: Partial<Pick<Post, "title" | "description">>,
  ): Promise<void> {
    try {
      await updateDoc(doc(db, "posts", postId), updates as any);
    } catch (error) {
      console.error("Error updating post:", error);
      throw error;
    }
  }

  /**
   * Real-time listener for community posts.
   */
  static subscribeToCommunityPosts(
    communityId: string,
    userLat: number | undefined,
    userLng: number | undefined,
    callback: (posts: Post[]) => void,
    onError?: (error: Error) => void,
  ): () => void {
    const q = query(
      collection(db, "posts"),
      where("communityId", "==", communityId),
      orderBy("createdAt", "desc"),
    );

    return onSnapshot(
      q,
      (snapshot: any) => {
        const posts = snapshot.docs.map(
          (d: any) => ({ id: d.id, ...d.data() }) as Post,
        );

        if (userLat !== undefined && userLng !== undefined) {
          callback(
            posts.map((p: any) => {
              const km = haversineDistance(
                userLat,
                userLng,
                p.latitude,
                p.longitude,
              );
              return {
                ...p,
                distanceKm: parseFloat(km.toFixed(2)),
                distanceLabel: formatDistance(km),
              };
            }),
          );
        } else {
          callback(posts);
        }
      },
      (error: any) => {
        console.error("Error subscribing to posts:", error);
        if (onError) onError(error);
      },
    );
  }

  /**
   * Real-time listener for a single post.
   */
  static subscribeToPost(
    postId: string,
    callback: (post: Post | null) => void,
  ): () => void {
    return onSnapshot(doc(db, "posts", postId), (snap: any) => {
      if (snap.exists()) {
        callback({ id: snap.id, ...snap.data() } as Post);
      } else {
        callback(null);
      }
    });
  }

  /**
   * Fetch posts by communityId (existing city-level query).
   * Optionally annotates each post with distance from the user's location.
   */
  static async getPostsByCommunity(
    communityId: string,
    userLat?: number,
    userLng?: number,
  ): Promise<Post[]> {
    try {
      const q = query(
        collection(db, "posts"),
        where("communityId", "==", communityId),
        orderBy("createdAt", "desc"),
      );

      const snapshot = await getDocs(q);
      const posts = snapshot.docs.map(
        (d: any) => ({ id: d.id, ...d.data() }) as Post,
      );

      // Annotate distance if user coords are available
      if (userLat !== undefined && userLng !== undefined) {
        return posts.map((p: any) => {
          const km = haversineDistance(
            userLat,
            userLng,
            p.latitude,
            p.longitude,
          );
          return {
            ...p,
            distanceKm: parseFloat(km.toFixed(2)),
            distanceLabel: formatDistance(km),
          };
        });
      }

      return posts;
    } catch (error) {
      console.error("Error fetching posts:", error);
      throw error;
    }
  }

  /**
   * Radius-based feed. Fetches recent posts from Firestore,
   * then filters client-side by haversine distance from the user.
   *
   * Why client-side filtering: Firestore has no native geo-radius query.
   * For production scale, swap this with a GeoFirestore or Cloud Function.
   *
   * @param userLat    User's current latitude
   * @param userLng    User's current longitude
   * @param radiusKm   Configurable radius (default = DEFAULT_RADIUS_KM = 5 km)
   * @param limitDays  Only include posts from the last N days (default 7)
   */
  static async getPostsByRadius(
    userLat: number,
    userLng: number,
    radiusKm: number = DEFAULT_RADIUS_KM,
    limitDays: number = 7,
  ): Promise<Post[]> {
    try {
      // Fetch broadly sorted by date; filter by radius in JS
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - limitDays);

      const q = query(collection(db, "posts"), orderBy("createdAt", "desc"));

      const snapshot = await getDocs(q);
      const allPosts = snapshot.docs.map(
        (d: any) => ({ id: d.id, ...d.data() }) as Post,
      );

      // Filter by radius and annotate distance
      return allPosts
        .filter((p: any) => {
          if (!p.latitude || !p.longitude) return false;
          return isWithinRadius(
            userLat,
            userLng,
            p.latitude,
            p.longitude,
            radiusKm,
          );
        })
        .map((p: any) => {
          const km = haversineDistance(
            userLat,
            userLng,
            p.latitude,
            p.longitude,
          );
          return {
            ...p,
            distanceKm: parseFloat(km.toFixed(2)),
            distanceLabel: formatDistance(km),
          };
        })
        .sort((a: any, b: any) => (a.distanceKm ?? 999) - (b.distanceKm ?? 999)); // nearest first
    } catch (error) {
      console.error("Error fetching posts by radius:", error);
      throw error;
    }
  }

  static async getPostById(postId: string): Promise<Post | null> {
    try {
      const docRef = doc(db, "posts", postId);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        return { id: docSnap.id, ...docSnap.data() } as Post;
      }
      return null;
    } catch (error) {
      console.error("Error fetching post by ID:", error);
      throw error;
    }
  }

  static async incrementCommentsCount(postId: string): Promise<void> {
    try {
      const docRef = doc(db, "posts", postId);
      await updateDoc(docRef, { commentsCount: increment(1) });
    } catch (error) {
      console.error("Error incrementing comments count:", error);
      throw error;
    }
  }

  static async toggleLike(postId: string, userId: string): Promise<boolean> {
    try {
      const docRef = doc(db, "posts", postId);
      const docSnap = await getDoc(docRef);

      if (!docSnap.exists()) throw new Error("Post not found");

      const data = docSnap.data();
      const likedBy = data.likedBy || [];
      const hasLiked = likedBy.includes(userId);

      if (hasLiked) {
        await updateDoc(docRef, {
          likedBy: arrayRemove(userId),
          likesCount: increment(-1),
        });
        return false;
      } else {
        await updateDoc(docRef, {
          likedBy: arrayUnion(userId),
          likesCount: increment(1),
        });

        // ─── NEW: Send like notification ──────────────────────────────────
        // Don't notify if the user likes their own post
        if (data.userId && data.userId !== userId) {
          try {
            // Get liker's profile for notification
            const likerProfile = await UserService.getUser(userId);
            const likerName = likerProfile?.name || "A Neighbor";

            // Send notification to post author
            await NotificationService.sendInAppNotification(
              data.userId, // Post author
              `❤️ ${likerName} liked your post`,
              data.title ? data.title.substring(0, 80) : "Your post",
              "like_notification",
              {
                postId,
                senderId: userId,
                senderName: likerName,
                category: data.category,
              },
            );
          } catch (notifError) {
            // Log but don't fail - notification is non-critical
            console.warn(
              "[PostService] Like notification failed (non-critical):",
              notifError,
            );
          }
        }
        // ─── END: Like notification ───────────────────────────────────────

        return true;
      }
    } catch (error) {
      console.error("Error toggling like:", error);
      throw error;
    }
  }

  /**
   * Respond to an SOS post. Adds the responder to a `responders` array
   * (arrayUnion prevents duplicates). Returns false if already responded.
   */
  static async respondToSOS(
    postId: string,
    responder: { uid: string; name: string; photoURL?: string },
  ): Promise<boolean> {
    try {
      const docRef = doc(db, "posts", postId);
      const snap = await getDoc(docRef);
      if (!snap.exists()) return false;

      const data = snap.data();
      const responders: string[] = data.responderIds || [];
      if (responders.includes(responder.uid)) return false; // already responded

      await updateDoc(docRef, {
        responderIds: arrayUnion(responder.uid),
        [`responderDetails.${responder.uid}`]: {
          name: responder.name,
          photoURL: responder.photoURL || null,
          respondedAt: serverTimestamp(),
        },
        respondersCount: increment(1),
      });
      return true;
    } catch (error) {
      console.error("respondToSOS error:", error);
      throw error;
    }
  }

  /**
   * Soft-cancel an SOS post. Preserves the document for history.
   * Sets status = 'cancelled' and cancelledAt timestamp.
   */
  static async cancelSOS(postId: string): Promise<void> {
    try {
      await updateDoc(doc(db, "posts", postId), {
        status: "cancelled",
        cancelledAt: serverTimestamp(),
      });
    } catch (error) {
      console.error("cancelSOS error:", error);
      throw error;
    }
  }

  /**
   * Check if the user already has an active (non-cancelled) SOS post
   * in their community. Used to prevent duplicate SOS on app restart.
   */
  static async getActiveSosForUser(
    userId: string,
    communityId: string,
  ): Promise<Post | null> {
    try {
      const q = query(
        collection(db, "posts"),
        where("userId", "==", userId),
        where("communityId", "==", communityId),
        where("category", "==", "Emergency"),
      );
      const snap = await getDocs(q);
      const active = snap.docs
        .map((d: any) => ({ id: d.id, ...d.data() }) as Post & { status?: string })
        .find((p: any) => p.status !== "cancelled");
      return active ?? null;
    } catch {
      return null;
    }
  }
  static subscribeToUserPosts(
    userId: string,
    callback: (posts: Post[]) => void,
  ): () => void {
    const q = query(
      collection(db, "posts"),
      where("userId", "==", userId),
      orderBy("createdAt", "desc"),
    );

    return onSnapshot(
      q,
      (snapshot: any) => {
        const posts = snapshot.docs.map(
          (d: any) => ({ id: d.id, ...d.data() }) as Post,
        );
        callback(posts);
      },
      (error: any) => {
        console.error("Error subscribing to user posts:", error);
      },
    );
  }
}
