import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import {
  addDoc,
  arrayRemove,
  arrayUnion,
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  serverTimestamp,
  Timestamp,
  updateDoc,
  where,
  writeBatch,
} from "firebase/firestore";
import { Platform } from "react-native";
import { db } from "./firebase";

export type NotificationType =
  | "sos_alert"
  | "help_request"
  | "comment"
  | "comment_reply"
  | "direct_message"
  | "community_update"
  | "karma_reward"
  | "recommendation"
  | "lost_found"
  | "system"
  | "like_notification";

export interface AppNotification {
  id: string;
  userId: string;
  title: string;
  body: string;
  type: NotificationType;
  read: boolean;
  data?: Record<string, any>;
  createdAt: any;
  expiresAt?: any;
}

// Configure foreground notification presentation
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

// ── Map notification types to preference keys ──────────────────────────────────
const TYPE_TO_PREF_KEY: Record<string, string> = {
  sos_alert: "sos",
  help_request: "mentions",
  comment: "mentions",
  comment_reply: "mentions",
  direct_message: "messages",
  community_update: "community",
  karma_reward: "karma",
  recommendation: "recommendations",
  lost_found: "lostAndFound",
  system: "pushEnabled", // system notifications always go if push is enabled
  like_notification: "mentions",
};

class NotificationService {
  private _currentToken: string | null = null;
  private _tokenRefreshSubscription: any = null;

  /**
   * Request permissions and get the Expo push token.
   * Saves it to the current user's profile (supports multi-device via fcmTokens array).
   * Also starts listening for token refresh events.
   */
  async registerForPushNotificationsAsync(userId: string) {
    let token: string | null = null;

    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync("sos_alerts", {
        name: "SOS Alerts",
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 500, 200, 500],
        sound: "default",
      });
      await Notifications.setNotificationChannelAsync("messages", {
        name: "Messages",
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 150],
        sound: "default",
      });
      await Notifications.setNotificationChannelAsync("community", {
        name: "Community",
        importance: Notifications.AndroidImportance.DEFAULT,
        sound: "default",
      });
      await Notifications.setNotificationChannelAsync("general", {
        name: "General",
        importance: Notifications.AndroidImportance.DEFAULT,
        sound: "default",
      });
    }

    if (Device.isDevice) {
      const { status: existingStatus } =
        await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      if (existingStatus !== "granted") {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      if (finalStatus !== "granted") {
        console.warn("Push notification permission not granted");
        return null;
      }
      const tokenData = await Notifications.getExpoPushTokenAsync();
      token = tokenData.data;
      console.log("[NotificationService] Token generated:", token);
    } else {
      console.warn("Push notifications require a physical device");
    }

    if (token) {
      this._currentToken = token;
      // Store as both legacy single token and multi-device array
      const docRef = doc(db, "users", userId);
      await updateDoc(docRef, {
        fcmToken: token,
        fcmTokens: arrayUnion(token),
        lastActive: serverTimestamp(),
      });
      console.log("[NotificationService] Token stored to Firestore user document for user:", userId);

      // Listen for token refresh events
      this._startTokenRefreshListener(userId);
    }

    return token;
  }

  /**
   * Listen for push token refresh and update Firestore automatically.
   */
  private _startTokenRefreshListener(userId: string) {
    // Remove old listener if any
    if (this._tokenRefreshSubscription) {
      this._tokenRefreshSubscription.remove();
    }

    this._tokenRefreshSubscription = Notifications.addPushTokenListener(
      async (newTokenData) => {
        const newToken = newTokenData.data;
        if (newToken && newToken !== this._currentToken) {
          console.log(
            "[NotificationService] Token refreshed, updating Firestore",
          );
          const oldToken = this._currentToken;
          this._currentToken = newToken;

          try {
            const docRef = doc(db, "users", userId);
            const updates: any = {
              fcmToken: newToken,
              fcmTokens: arrayUnion(newToken),
              lastActive: serverTimestamp(),
            };
            await updateDoc(docRef, updates);

            // Remove old token from array
            if (oldToken) {
              await updateDoc(docRef, {
                fcmTokens: arrayRemove(oldToken),
              });
            }
          } catch (error) {
            console.error(
              "[NotificationService] Failed to update refreshed token:",
              error,
            );
          }
        }
      },
    );
  }

  /**
   * Unregister push token from Firestore (used on logout or push disable).
   * Removes the current device's token from both fcmToken and fcmTokens.
   */
  async unregisterPushToken(userId: string) {
    try {
      if (this._tokenRefreshSubscription) {
        this._tokenRefreshSubscription.remove();
        this._tokenRefreshSubscription = null;
      }

      if (this._currentToken) {
        const docRef = doc(db, "users", userId);
        await updateDoc(docRef, {
          fcmToken: null,
          fcmTokens: arrayRemove(this._currentToken),
          lastActive: serverTimestamp(),
        });
        this._currentToken = null;
      }
    } catch (error) {
      console.error(
        "[NotificationService] Failed to unregister push token:",
        error,
      );
    }
  }

  /**
   * Handle push toggle change. When disabled, revokes token from Firestore
   * so no server-side pushes can reach this device. When re-enabled, re-registers.
   */
  async handlePushToggleChange(userId: string, enabled: boolean) {
    if (!enabled) {
      await this.unregisterPushToken(userId);
    } else {
      await this.registerForPushNotificationsAsync(userId);
    }
  }

  /**
   * Check if a user has enabled notifications for a specific type.
   * Reads prefs directly from Firestore to avoid circular import issues.
   */
  private async shouldSendNotification(
    userId: string,
    type: NotificationType,
  ): Promise<{ shouldSend: boolean; fcmTokens: string[] }> {
    try {
      const snap = await getDoc(doc(db, "users", userId));
      if (!snap.exists()) return { shouldSend: true, fcmTokens: [] };
      
      const data = snap.data();
      const tokens: string[] = Array.isArray(data?.fcmTokens) ? [...data.fcmTokens] : [];
      if (tokens.length === 0 && data?.fcmToken) {
        tokens.push(data.fcmToken);
      }

      const prefs = data?.notificationPreferences;
      if (!prefs) return { shouldSend: true, fcmTokens: tokens };
      if (prefs.pushEnabled === false) return { shouldSend: false, fcmTokens: tokens };
      const prefKey = TYPE_TO_PREF_KEY[type];
      if (prefKey && prefKey in prefs) return { shouldSend: (prefs as any)[prefKey] !== false, fcmTokens: tokens };
      return { shouldSend: true, fcmTokens: tokens };
    } catch {
      return { shouldSend: true, fcmTokens: [] };
    }
  }

  /**
   * Helper to determine which channel ID to use based on type.
   */
  private getChannelIdForType(type: NotificationType): string {
    switch (type) {
      case "sos_alert":
        return "sos_alerts";
      case "direct_message":
      case "help_request":
        return "messages";
      case "community_update":
      case "comment":
      case "comment_reply":
      case "lost_found":
      case "recommendation":
        return "community";
      default:
        return "general";
    }
  }

  /**
   * Send actual push notification via Expo Push API
   */
  async sendExpoPushNotifications(
    tokens: string[],
    title: string,
    body: string,
    data: Record<string, any>,
    channelId: string = "general",
  ) {
    if (!tokens || tokens.length === 0) return;

    // Filter out invalid tokens
    const validTokens = tokens.filter((t) => t && t.startsWith("ExponentPushToken"));
    if (validTokens.length === 0) return;

    const messages = validTokens.map((token) => ({
      to: token,
      sound: "default",
      title,
      body,
      data,
      channelId,
    }));

    try {
      const response = await fetch("https://exp.host/--/api/v2/push/send", {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Accept-encoding": "gzip, deflate",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(messages),
      });
      const result = await response.json();
      console.log("[NotificationService] Expo Push sent:", result);
    } catch (error) {
      console.error("[NotificationService] Error sending Expo Push:", error);
    }
  }

  /**
   * Check if target user has blocked the sender.
   * Reads blockedUsers field directly to avoid circular import.
   */
  private async isBlockedBy(
    targetUserId: string,
    senderUserId: string,
  ): Promise<boolean> {
    try {
      const snap = await getDoc(doc(db, "users", targetUserId));
      if (!snap.exists()) return false;
      const blocked: string[] = snap.data()?.blockedUsers || [];
      return blocked.includes(senderUserId);
    } catch {
      return false;
    }
  }

  /**
   * Create an in-app notification in Firestore.
   * Respects the user's notification preferences and block list.
   */
  async sendInAppNotification(
    userId: string,
    title: string,
    body: string,
    type: NotificationType,
    data?: Record<string, any>,
  ) {
    try {
      // Check if user wants this type of notification and get tokens
      const { shouldSend, fcmTokens } = await this.shouldSendNotification(userId, type);
      if (!shouldSend) {
        console.log(
          `[NotificationService] Skipped ${type} for ${userId} — disabled by preference`,
        );
        return;
      }

      // Check if user has blocked the sender (if sender info available)
      if (data?.senderId) {
        const blocked = await this.isBlockedBy(userId, data.senderId);
        if (blocked) {
          console.log(
            `[NotificationService] Skipped notification — sender ${data.senderId} is blocked by ${userId}`,
          );
          return;
        }
      }

      // ─── NEW: Calculate TTL (expires in 30 days) ──────────────────────
      const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
      const expiresAtTime = Math.floor((Date.now() + THIRTY_DAYS_MS) / 1000);
      // ─── END: TTL calculation ─────────────────────────────────────────

      const notifRef = collection(db, "notifications");
      await addDoc(notifRef, {
        userId,
        title,
        body,
        type,
        read: false,
        data: data || {},
        createdAt: serverTimestamp(),
        expiresAt: new Timestamp(expiresAtTime, 0),
      });

      // Actually trigger the Android/iOS push notification
      const channelId = this.getChannelIdForType(type);
      
      // Inject type into data so the tap handler knows what to open
      const pushData = { ...(data || {}), type };
      
      await this.sendExpoPushNotifications(fcmTokens, title, body, pushData, channelId);

    } catch (error) {
      console.error("Error sending in-app notification:", error);
    }
  }

  /**
   * Broadcast SOS to ALL members of the community using writeBatch.
   * Excludes the sender. Respects each recipient's SOS notification preference
   * and block list.
   */
  async broadcastSOSAlert(
    senderName: string,
    locationData: {
      latitude: number;
      longitude: number;
      postId: string;
      area?: string;
    },
    communityId: string,
    senderUid: string,
  ) {
    const title = "\uD83D\uDEA8 SOS Alert Nearby!";
    const body = `${senderName} needs immediate help${
      locationData.area ? ` in ${locationData.area}` : " in your area"
    }.`;

    try {
      const usersSnap = await getDocs(
        query(collection(db, "users"), where("communityId", "==", communityId)),
      );

      const allUsers = usersSnap.docs.map((d: any) => ({
        uid: d.id,
        ...d.data(),
      }));

      // Filter recipients: not the sender, SOS preference enabled, sender not blocked
      const recipients = allUsers.filter((user: any) => {
        if (user.uid === senderUid) return false;

        // Check SOS notification preference
        const prefs = (user as any).notificationPreferences;
        if (prefs) {
          if (prefs.pushEnabled === false) return false;
          if (prefs.sos === false) return false;
        }

        // Check if recipient has blocked the sender
        const blocked: string[] = (user as any).blockedUsers || [];
        if (blocked.includes(senderUid)) return false;

        return true;
      });

      if (recipients.length === 0) return;

      const BATCH_SIZE = 499;
      for (let i = 0; i < recipients.length; i += BATCH_SIZE) {
        const batch = writeBatch(db);
        const chunk = recipients.slice(i, i + BATCH_SIZE);
        
        const allTokensToPush: string[] = [];

        for (const user of chunk) {
          const ref = doc(collection(db, "notifications"));
          batch.set(ref, {
            userId: user.uid,
            title,
            body,
            type: "sos_alert",
            read: false,
            data: { ...locationData, senderId: senderUid },
            createdAt: serverTimestamp(),
          });
          
          if (Array.isArray(user.fcmTokens)) {
            allTokensToPush.push(...user.fcmTokens);
          } else if (user.fcmToken) {
            allTokensToPush.push(user.fcmToken);
          }
        }
        await batch.commit();
        
        // Trigger push for this chunk
        const pushData = { ...locationData, senderId: senderUid, type: "sos_alert" };
        await this.sendExpoPushNotifications(allTokensToPush, title, body, pushData, "sos_alerts");
      }
    } catch (error) {
      console.error("broadcastSOSAlert error:", error);
    }
  }

  /**
   * Subscribe to real-time user notifications
   */
  subscribeToUserNotifications(
    userId: string,
    callback: (notifications: AppNotification[]) => void,
  ) {
    // No orderBy — where + orderBy requires a composite index.
    // Sort client-side instead.
    const q = query(
      collection(db, "notifications"),
      where("userId", "==", userId),
    );

    return onSnapshot(q, (snapshot: any) => {
      const notifs: AppNotification[] = snapshot.docs
        .map((doc: any) => ({ id: doc.id, ...doc.data() }) as AppNotification)
        .sort((a: any, b: any) => {
          const ta = a.createdAt?.toDate?.() ?? new Date(a.createdAt ?? 0);
          const tb = b.createdAt?.toDate?.() ?? new Date(b.createdAt ?? 0);
          return tb.getTime() - ta.getTime(); // desc
        });
      callback(notifs);
    });
  }

  /**
   * Mark a single notification as read
   */
  async markAsRead(notificationId: string) {
    try {
      const ref = doc(db, "notifications", notificationId);
      await updateDoc(ref, { read: true });
    } catch (error) {
      console.error("Error marking notification as read:", error);
    }
  }

  /**
   * Mark all user notifications as read
   */
  async markAllAsRead(userId: string) {
    try {
      const q = query(
        collection(db, "notifications"),
        where("userId", "==", userId),
        where("read", "==", false),
      );

      const snapshot = await getDocs(q);
      const batch = writeBatch(db);

      snapshot.forEach((d: any) => {
        batch.update(d.ref, { read: true });
      });

      await batch.commit();
    } catch (error) {
      console.error("Error marking all as read:", error);
    }
  }
}

export default new NotificationService();
