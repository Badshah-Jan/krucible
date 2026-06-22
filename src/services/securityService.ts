import { getFunctions, httpsCallable } from "firebase/functions";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { app, db, auth } from "./firebase";
import { doc, setDoc, increment, serverTimestamp, collection, getDocs, query, where } from "firebase/firestore";

export type RateLimitAction =
  | "post_create"
  | "comment_create"
  | "message_send"
  | "business_register"
  | "service_register"
  | "verification_resend"
  | "password_reset"
  | "sos_create";

const CLIENT_THROTTLE_MS: Record<RateLimitAction, number> = {
  post_create: 30_000,
  comment_create: 5_000,
  message_send: 1_000,
  business_register: 60_000,
  service_register: 60_000,
  verification_resend: 60_000,
  password_reset: 60_000,
  sos_create: 30_000,
};

const lastActionAt: Partial<Record<RateLimitAction, number>> = {};

class SecurityServiceClass {
  private functions = getFunctions(app);

  /** Client-side throttle — complements server enforcement. */
  clientThrottle(action: RateLimitAction): void {
    const now = Date.now();
    const last = lastActionAt[action] ?? 0;
    const minGap = CLIENT_THROTTLE_MS[action];
    if (now - last < minGap) {
      throw new Error("Please wait a moment before trying again.");
    }
    lastActionAt[action] = now;
  }

  /** Server-side rate limit via Cloud Function. */
  async enforceRateLimit(action: RateLimitAction): Promise<void> {
    this.clientThrottle(action);
    try {
      const fn = httpsCallable(this.functions, "enforceRateLimit");
      await fn({ action });
    } catch (error: any) {
      if (
        error?.code === "functions/not-found" ||
        error?.code === "functions/unavailable" ||
        error?.code === "functions/internal"
      ) {
        // Cloud Functions not deployed — client throttle still applies
        return;
      }
      const msg =
        error?.message?.includes("resource-exhausted") ||
        error?.code === "functions/resource-exhausted"
          ? "Too many requests. Please try again later."
          : error?.message || "Request blocked for security reasons.";
      throw new Error(msg);
    }
  }

  async logSecurityEvent(
    eventType: string,
    metadata: Record<string, unknown> = {},
  ): Promise<void> {
    try {
      const fn = httpsCallable(this.functions, "logSecurityEvent");
      await fn({ eventType, metadata });
    } catch {
      // Non-fatal — never block user flows on logging failure
    }
  }

  async awardKarma(
    uid: string,
    amount: number,
    reason: string,
  ): Promise<void> {
    try {
      const fn = httpsCallable(this.functions, "awardKarma");
      await fn({ uid, amount, reason });
    } catch (error: any) {
      if (
        error?.code === "functions/not-found" ||
        error?.code === "functions/unavailable" ||
        error?.code === "functions/internal"
      ) {
        console.warn("[SecurityService] Cloud Function 'awardKarma' unavailable. Falling back to client-side update.");
        const userRef = doc(db, "users", uid);
        await setDoc(
          userRef,
          {
            karma: increment(amount),
            lastActive: serverTimestamp(),
          },
          { merge: true }
        );
        const historyRef = doc(collection(userRef, "karma_history"));
        await setDoc(historyRef, {
          action: reason || "Earned Karma",
          points: `+${amount}`,
          color: "#F59E0B",
          icon: "star-outline",
          createdAt: serverTimestamp(),
        });
      } else {
        throw error;
      }
    }
  }

  async requestPremiumUpgrade(
    entityType: "business" | "service",
    entityId: string,
  ): Promise<void> {
    try {
      const fn = httpsCallable(this.functions, "requestPremiumUpgrade");
      await fn({ entityType, entityId });
    } catch (error: any) {
      if (
        error?.code === "functions/not-found" ||
        error?.code === "functions/unavailable" ||
        error?.code === "functions/internal" ||
        error?.message?.includes("not-found")
      ) {
        console.warn("[SecurityService] Cloud Function 'requestPremiumUpgrade' unavailable. Falling back to client-side write.");
        const currentUser = auth.currentUser;
        if (!currentUser) throw new Error("Must be logged in to request upgrade.");
        
        // Check for duplicate pending requests
        const reqsRef = collection(db, "subscription_requests");
        const q = query(reqsRef, where("entityId", "==", entityId), where("status", "==", "pending"));
        const pendingSnap = await getDocs(q);
        
        if (!pendingSnap.empty) {
          throw new Error("already-exists: A pending premium request already exists for this listing.");
        }

        const reqRef = doc(reqsRef);
        await setDoc(reqRef, {
          userId: currentUser.uid,
          entityType,
          entityId,
          status: "pending",
          createdAt: serverTimestamp(),
        });
      } else {
        throw error;
      }
    }
  }

  /** Persist verification resend cooldown across app restarts. */
  async canResendVerification(): Promise<boolean> {
    const key = "verification_resend_at";
    const last = await AsyncStorage.getItem(key);
    if (last && Date.now() - Number(last) < CLIENT_THROTTLE_MS.verification_resend) {
      return false;
    }
    return true;
  }

  async markVerificationResent(): Promise<void> {
    await AsyncStorage.setItem("verification_resend_at", String(Date.now()));
  }

  async canRequestPasswordReset(): Promise<boolean> {
    const key = "password_reset_at";
    const last = await AsyncStorage.getItem(key);
    if (last && Date.now() - Number(last) < CLIENT_THROTTLE_MS.password_reset) {
      return false;
    }
    return true;
  }

  async markPasswordResetRequested(): Promise<void> {
    await AsyncStorage.setItem("password_reset_at", String(Date.now()));
  }
}

export const SecurityService = new SecurityServiceClass();
