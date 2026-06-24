import {
  addDoc,
  arrayUnion,
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
  writeBatch,
  Timestamp,
  increment,
} from "firebase/firestore";
import { db } from "./firebase";
import { isWithinRadius, haversineDistance } from "./locationService";
import NotificationService from "./notificationService";
import { UserService } from "./userService";
import { ChatService } from "./chatService";
import { SecurityService } from "./securityService";

export type SOSType = 
  | "Medical Emergency"
  | "Accident"
  | "Fire Emergency"
  | "Crime / Security Threat"
  | "Missing Person"
  | "Women Safety"
  | "Child Safety"
  | "Vehicle Breakdown"
  | "Urgent Assistance"
  | "Other Emergency";

export interface SOSAlert {
  id?: string;
  creatorId: string;
  creatorName: string;
  communityId: string;
  type: SOSType;
  status: "active" | "responding" | "resolved" | "expired" | "cancelled";
  location: {
    lat: number;
    lng: number;
    area: string;
    city: string;
  };
  radiusKm: number;
  createdAt: any;
  expiresAt: any;
  resolvedAt?: any;
  cancelledAt?: any;
  responderIds: string[];
  respondersCount: number;
  responders: Record<string, {
    name: string;
    distanceKm: number;
    respondedAt: any;
  }>;
}

const EMERGENCY_EXPIRY_MAP: Record<SOSType, number> = {
  "Medical Emergency": 24,
  "Accident": 24,
  "Fire Emergency": 24,
  "Crime / Security Threat": 24,
  "Missing Person": 72,
  "Women Safety": 24,
  "Child Safety": 24,
  "Vehicle Breakdown": 6,
  "Urgent Assistance": 2,
  "Other Emergency": 24,
};

export class SosService {
  /**
   * Create a new SOS Alert
   */
  static async createSOS(
    alertData: Omit<SOSAlert, "id" | "status" | "createdAt" | "expiresAt" | "responderIds" | "respondersCount" | "responders">
  ): Promise<string> {
    try {
      await SecurityService.enforceRateLimit("sos_create");

      const now = new Date();
      const expiryHours = EMERGENCY_EXPIRY_MAP[alertData.type] || 24;
      const expiresAt = new Date(now.getTime() + expiryHours * 60 * 60 * 1000);

      const docRef = await addDoc(collection(db, "sos_alerts"), {
        ...alertData,
        status: "active",
        createdAt: serverTimestamp(),
        expiresAt: Timestamp.fromDate(expiresAt),
        responderIds: [],
        respondersCount: 0,
        responders: {},
      });

      // Broadcast Notification
      this.broadcastSOSNotification(
        alertData.creatorId,
        alertData.type,
        alertData.communityId,
        alertData.location.lat,
        alertData.location.lng,
        alertData.radiusKm,
        docRef.id
      ).catch(console.warn);

      // Broadcast to Community Chat
      this.broadcastSOSSystemMessage(
        { ...alertData, id: docRef.id },
        "active"
      ).catch(console.warn);

      return docRef.id;
    } catch (error) {
      console.error("Error creating SOS:", error);
      throw error;
    }
  }

  /**
   * Broadcast SOS System Message to Community Chat
   */
  private static async broadcastSOSSystemMessage(
    alertData: any,
    status: "active" | "responding" | "resolved" | "cancelled" | "expired"
  ) {
    try {
      if (!alertData.communityId) return;
      const roomId = `community_${alertData.communityId}`;
      
      let text = "";
      if (status === "active") {
        text = `🚨 EMERGENCY ALERT\n\nA neighbor has requested emergency assistance.\n\nCategory: ${alertData.type}\nLocation: ${alertData.location?.area || "Nearby"}\nRadius: ${alertData.radiusKm} km`;
      } else if (status === "responding") {
        text = `🚑 Responders are on the way for the ${alertData.type}.`;
      } else if (status === "resolved") {
        text = `✅ SOS Resolved.`;
      } else if (status === "cancelled") {
        text = `❌ SOS Cancelled.`;
      } else if (status === "expired") {
        text = `⏰ SOS Expired.`;
      }

      await ChatService.ensureCommunityConversation(
        alertData.communityId, 
        alertData.location?.district || "Community"
      );

      const msgRef = doc(collection(db, "conversations", roomId, "messages"));
      const batch2 = writeBatch(db);
      batch2.set(msgRef, {
        type: "sos_alert",
        text,
        senderId: "system_sos",
        senderName: "Emergency System",
        createdAt: Timestamp.now(),
        status: "sent",
        metadata: {
          sosId: alertData.id,
          status,
          alertType: alertData.type,
          location: alertData.location,
          creatorName: alertData.creatorName,
          radiusKm: alertData.radiusKm,
        }
      });
      const convRef2 = doc(db, "conversations", roomId);
      batch2.update(convRef2, {
        lastMessage: text.substring(0, 60),
        lastMessageAt: Timestamp.now(),
        lastSenderId: "system_sos",
      });
      await batch2.commit();
    } catch (e) {
      console.warn("Could not broadcast SOS system message:", e);
    }
  }

  /**
   * Broadcast SOS Push Notifications
   */
  private static async broadcastSOSNotification(
    creatorId: string,
    type: SOSType,
    communityId: string,
    lat: number,
    lng: number,
    radiusKm: number,
    sosId: string
  ) {
    try {
      // Query users in the community
      const usersSnap = await getDocs(
        query(collection(db, "users"), where("communityId", "==", communityId))
      );

      const title = `🚨 ${type} Nearby`;
      const body = `An emergency has been reported within ${radiusKm}km of your location. Please check if you can help.`;

      const allUsers = usersSnap.docs.map((d: any) => ({ uid: d.id, ...d.data() }));

      // Filter recipients by radius
      const recipients = allUsers.filter((user: any) => {
        if (user.uid === creatorId) return false;
        
        // Check push preferences
        const prefs = user.notificationPreferences;
        if (prefs && (prefs.pushEnabled === false || prefs.sos === false)) return false;

        // Check radius
        if (user.latitude && user.longitude) {
          const inRadius = isWithinRadius(lat, lng, user.latitude, user.longitude, radiusKm);
          if (!inRadius) return false;
        }

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
            data: { sosId, type },
            createdAt: serverTimestamp(),
          });
          
          if (Array.isArray(user.fcmTokens)) {
            allTokensToPush.push(...user.fcmTokens);
          } else if (user.fcmToken) {
            allTokensToPush.push(user.fcmToken);
          }
        }
        await batch.commit();

        // Send physical push notifications via Expo Push API
        await NotificationService.sendExpoPushNotifications(
          allTokensToPush,
          title,
          body,
          { sosId, type },
          "sos_alerts"
        );
      }
    } catch (error) {
      console.error("broadcastSOSNotification error:", error);
    }
  }

  /**
   * Subscribe to Active SOS Alerts in a community
   */
  static subscribeToActiveSOS(
    communityId: string,
    callback: (alerts: SOSAlert[]) => void
  ): () => void {
    const q = query(
      collection(db, "sos_alerts"),
      where("communityId", "==", communityId)
    );

    return onSnapshot(q, (snapshot: any) => {
      const now = new Date();
      const alerts = snapshot.docs
        .map((d: any) => ({ id: d.id, ...d.data() } as SOSAlert))
        .filter((a: any) => {
          // Client-side auto-expiry check and status check
          if (a.status !== "active" && a.status !== "responding") return false;
          const exp = a.expiresAt?.toDate ? a.expiresAt.toDate() : new Date(a.expiresAt ?? 0);
          return exp > now;
        })
        .sort((a: any, b: any) => {
          const aTime = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : 0;
          const bTime = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : 0;
          return bTime - aTime;
        });
      callback(alerts);
    });
  }

  /**
   * Subscribe to a single SOS alert
   */
  static subscribeToSOS(
    sosId: string,
    callback: (alert: SOSAlert | null) => void
  ): () => void {
    return onSnapshot(doc(db, "sos_alerts", sosId), (snap: any) => {
      if (snap.exists()) {
        callback({ id: snap.id, ...snap.data() } as SOSAlert);
      } else {
        callback(null);
      }
    });
  }

  /**
   * Fetch active SOS alerts by radius
   */
  static async getActiveSOSByRadius(
    userLat: number,
    userLng: number,
    radiusKm: number = 10
  ): Promise<SOSAlert[]> {
    try {
      // Fetch all alerts (in a real app, use GeoFirestore)
      const q = query(
        collection(db, "sos_alerts"),
        orderBy("createdAt", "desc")
      );
      
      const snapshot = await getDocs(q);
      const now = new Date();
      
      const activeAlerts = snapshot.docs
        .map((d: any) => ({ id: d.id, ...d.data() } as SOSAlert))
        .filter((a: any) => {
          if (a.status !== "active" && a.status !== "responding") return false;
          const exp = a.expiresAt?.toDate ? a.expiresAt.toDate() : new Date(a.expiresAt ?? 0);
          if (exp <= now) return false;
          
          if (a.location?.lat && a.location?.lng) {
            return isWithinRadius(userLat, userLng, a.location.lat, a.location.lng, radiusKm);
          }
          return false;
        })
        .sort((a: any, b: any) => {
          const aTime = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : 0;
          const bTime = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : 0;
          return bTime - aTime;
        });

      return activeAlerts;
    } catch (error) {
      console.error("getActiveSOSByRadius error:", error);
      return [];
    }
  }

  /**
   * Respond to an SOS
   */
  static async respondToSOS(
    sosId: string,
    responderId: string,
    responderName: string,
    responderLat: number,
    responderLng: number,
    sosLat: number,
    sosLng: number
  ): Promise<boolean> {
    try {
      const docRef = doc(db, "sos_alerts", sosId);
      const snap = await getDoc(docRef);
      if (!snap.exists()) return false;

      const data = snap.data();
      if (data.responderIds?.includes(responderId)) return false;

      const distanceKm = haversineDistance(responderLat, responderLng, sosLat, sosLng);

      await updateDoc(docRef, {
        responderIds: arrayUnion(responderId),
        respondersCount: increment(1),
        status: "responding",
        [`responders.${responderId}`]: {
          name: responderName,
          distanceKm: parseFloat(distanceKm.toFixed(2)),
          respondedAt: serverTimestamp(),
        }
      });

      // Update the user's SOS response count
      const userRef = doc(db, "users", responderId);
      await updateDoc(userRef, {
        sosResponsesGiven: increment(1)
      }).catch(e => console.warn("Could not update user SOS responses count", e));

      // Award Karma
      // await UserService.incrementKarma(responderId, 10, "Responded to an SOS Emergency");

      // Broadcast update to Community Chat
      this.broadcastSOSSystemMessage({ ...data, id: sosId }, "responding").catch(console.warn);

      return true;
    } catch (error) {
      console.error("respondToSOS error:", error);
      throw error;
    }
  }

  /**
   * Mark an SOS as Resolved
   */
  static async resolveSOS(sosId: string): Promise<void> {
    try {
      const docRef = doc(db, "sos_alerts", sosId);
      const snap = await getDoc(docRef);
      const data = snap.exists() ? snap.data() : null;

      await updateDoc(docRef, {
        status: "resolved",
        resolvedAt: serverTimestamp(),
      });

      if (data) {
        // await UserService.incrementKarma(data.creatorId, 30, "Resolved an SOS Emergency");
        this.broadcastSOSSystemMessage({ ...data, id: sosId }, "resolved").catch(console.warn);
      }
    } catch (error) {
      console.error("resolveSOS error:", error);
      throw error;
    }
  }

  /**
   * Mark an SOS as Cancelled
   */
  static async cancelSOS(sosId: string): Promise<void> {
    try {
      const docRef = doc(db, "sos_alerts", sosId);
      const snap = await getDoc(docRef);
      const data = snap.exists() ? snap.data() : null;

      await updateDoc(docRef, {
        status: "cancelled",
        cancelledAt: serverTimestamp(),
      });

      if (data) {
        this.broadcastSOSSystemMessage({ ...data, id: sosId }, "cancelled").catch(console.warn);
      }
    } catch (error) {
      console.error("cancelSOS error:", error);
      throw error;
    }
  }
}
