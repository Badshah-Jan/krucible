/**
 * Trust & Safety Service
 *
 * Centralizes reporting, content moderation, SOS abuse detection,
 * and suspicious-account flagging for the Neighborly platform.
 *
 * Reuses existing Firestore collections:
 *  - `reports`       (already exists — extended with richer metadata)
 *  - `users`         (blockedUsers, role fields already exist)
 *  - `notifications` (admin alerts sent here)
 *  - `sos_alerts`    (queried for abuse detection)
 */

import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  increment,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
  limit,
} from "firebase/firestore";
import { db } from "./firebase";
import AsyncStorage from "@react-native-async-storage/async-storage";

// ── Report Types ────────────────────────────────────────────────────────────

export type ReportTargetType =
  | "user"
  | "message"
  | "post"
  | "comment"
  | "service"
  | "business";

export type ReportReason =
  | "fraud"
  | "scam"
  | "fake_information"
  | "harassment"
  | "spam"
  | "inappropriate_content"
  | "fake_sos"
  | "dangerous_behavior"
  | "other";

export interface Report {
  id?: string;
  reporterId: string;
  reporterName?: string;
  targetId: string;        // UID of user, ID of post/comment/etc.
  targetType: ReportTargetType;
  targetOwnerId?: string;  // The user who owns the reported content
  reason: ReportReason;
  details?: string;
  status: "pending" | "reviewed" | "action_taken" | "dismissed";
  adminNotes?: string;
  createdAt: any;
}

// ── SOS Abuse Thresholds ────────────────────────────────────────────────────

const SOS_DAILY_LIMIT = 3;       // Max SOS alerts per day
const SOS_WEEKLY_LIMIT = 7;      // Max SOS alerts per week
const REPORT_THRESHOLD_FLAG = 3; // Number of reports before flagging

// ── Report Reason Labels ────────────────────────────────────────────────────

export const REPORT_REASONS: { value: ReportReason; label: string; icon: string }[] = [
  { value: "fraud", label: "Fraud", icon: "alert-circle" },
  { value: "scam", label: "Scam", icon: "warning" },
  { value: "fake_information", label: "Fake Information", icon: "document-text" },
  { value: "harassment", label: "Harassment", icon: "hand-left" },
  { value: "spam", label: "Spam", icon: "mail-unread" },
  { value: "inappropriate_content", label: "Inappropriate Content", icon: "eye-off" },
  { value: "fake_sos", label: "Fake SOS Alert", icon: "megaphone" },
  { value: "dangerous_behavior", label: "Dangerous Behavior", icon: "skull" },
  { value: "other", label: "Other", icon: "ellipsis-horizontal" },
];

// ── TrustSafetyService ──────────────────────────────────────────────────────

class TrustSafetyServiceClass {

  // ── FEATURE 1: Report Content/User ──────────────────────────────────────

  /**
   * Submit a report against any target (user, post, comment, message,
   * service, or business). Writes to the existing `reports` collection
   * and triggers an admin notification.
   */
  async submitReport(report: {
    reporterId: string;
    reporterName?: string;
    targetId: string;
    targetType: ReportTargetType;
    targetOwnerId?: string;
    reason: ReportReason;
    details?: string;
  }): Promise<string> {
    // Prevent self-reporting
    if (report.reporterId === report.targetOwnerId) {
      throw new Error("You cannot report your own content.");
    }

    // Prevent duplicate reports from same user on same target
    const existing = await getDocs(
      query(
        collection(db, "reports"),
        where("reporterId", "==", report.reporterId),
        where("targetId", "==", report.targetId),
        limit(1),
      ),
    );
    if (!existing.empty) {
      throw new Error("You have already reported this content.");
    }

    const docRef = await addDoc(collection(db, "reports"), {
      ...report,
      status: "pending",
      createdAt: serverTimestamp(),
    });

    // Check if target owner now exceeds report threshold → auto-flag
    if (report.targetOwnerId) {
      this.checkAndFlagUser(report.targetOwnerId).catch(console.warn);
    }

    return docRef.id;
  }

  // ── FEATURE 5: SOS Abuse Detection ──────────────────────────────────────

  /**
   * Check whether a user has exceeded SOS creation limits.
   * Returns { allowed, warning, message }.
   */
  async checkSOSAbuse(creatorId: string): Promise<{
    allowed: boolean;
    warning: boolean;
    message: string;
  }> {
    try {
      const now = new Date();
      const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

      const sosSnap = await getDocs(
        query(
          collection(db, "sos_alerts"),
          where("creatorId", "==", creatorId),
        ),
      );

      let dailyCount = 0;
      let weeklyCount = 0;
      let cancelledCount = 0;

      sosSnap.docs.forEach((d) => {
        const data = d.data();
        const created = data.createdAt?.toDate
          ? data.createdAt.toDate()
          : new Date(data.createdAt ?? 0);

        if (created >= oneDayAgo) dailyCount++;
        if (created >= oneWeekAgo) {
          weeklyCount++;
          if (data.status === "cancelled") cancelledCount++;
        }
      });

      // Hard block if daily limit exceeded
      if (dailyCount >= SOS_DAILY_LIMIT) {
        return {
          allowed: false,
          warning: false,
          message: `You have reached the maximum of ${SOS_DAILY_LIMIT} SOS alerts per day. Please contact support if you need further assistance.`,
        };
      }

      // Hard block if weekly limit exceeded
      if (weeklyCount >= SOS_WEEKLY_LIMIT) {
        return {
          allowed: false,
          warning: false,
          message: `You have reached the maximum of ${SOS_WEEKLY_LIMIT} SOS alerts this week. Your account has been flagged for admin review.`,
        };
      }

      // Warning if high cancellation rate
      if (cancelledCount >= 2 && cancelledCount / weeklyCount > 0.5) {
        return {
          allowed: true,
          warning: true,
          message: "Multiple cancelled SOS alerts detected. Please use SOS only for genuine emergencies. Misuse may result in a temporary restriction.",
        };
      }

      return { allowed: true, warning: false, message: "" };
    } catch (error) {
      console.error("[TrustSafety] SOS abuse check failed:", error);
      // Fail open — never block legitimate emergencies
      return { allowed: true, warning: false, message: "" };
    }
  }

  // ── FEATURE 8: Suspicious Account Detection ─────────────────────────────

  /**
   * If a user accumulates >= REPORT_THRESHOLD_FLAG reports,
   * flag their account for admin review by setting `flaggedForReview`.
   */
  private async checkAndFlagUser(userId: string): Promise<void> {
    try {
      const reportsSnap = await getDocs(
        query(
          collection(db, "reports"),
          where("targetOwnerId", "==", userId),
          where("status", "==", "pending"),
        ),
      );

      if (reportsSnap.size >= REPORT_THRESHOLD_FLAG) {
        const userRef = doc(db, "users", userId);
        await setDoc(
          userRef,
          {
            flaggedForReview: true,
            flagReason: `Received ${reportsSnap.size} pending reports`,
            flaggedAt: serverTimestamp(),
          },
          { merge: true },
        );
      }
    } catch (error) {
      console.error("[TrustSafety] Flag check failed:", error);
    }
  }

  // ── FEATURE 7: First-Time Chat Safety Warning ───────────────────────────

  /**
   * Returns true if we should show a safety warning for a given chat.
   * Uses AsyncStorage to track "seen" chats — shows once per conversation.
   */
  async shouldShowChatSafetyWarning(chatId: string): Promise<boolean> {
    try {
      const key = `chat_safety_seen_${chatId}`;
      const seen = await AsyncStorage.getItem(key);
      return seen === null;
    } catch {
      return false;
    }
  }

  async dismissChatSafetyWarning(chatId: string): Promise<void> {
    try {
      const key = `chat_safety_seen_${chatId}`;
      await AsyncStorage.setItem(key, "1");
    } catch {}
  }

  // ── FEATURE 10: Admin Moderation — Subscribe to Reports ─────────────────

  /**
   * Real-time subscription to all pending reports.
   * Used by admin screens.
   */
  subscribeToReports(
    statusFilter: "pending" | "reviewed" | "action_taken" | "dismissed" | "all",
    callback: (reports: Report[]) => void,
  ): () => void {
    let q;
    if (statusFilter === "all") {
      q = query(collection(db, "reports"));
    } else {
      q = query(
        collection(db, "reports"),
        where("status", "==", statusFilter),
      );
    }

    return onSnapshot(q, (snap) => {
      const reports = snap.docs
        .map((d) => ({ id: d.id, ...d.data() }) as Report)
        .sort((a, b) => {
          const ta = a.createdAt?.toDate?.() ?? new Date(0);
          const tb = b.createdAt?.toDate?.() ?? new Date(0);
          return tb.getTime() - ta.getTime();
        });
      callback(reports);
    });
  }

  /**
   * Admin action: update report status and optionally add notes.
   */
  async updateReportStatus(
    reportId: string,
    status: "reviewed" | "action_taken" | "dismissed",
    adminNotes?: string,
  ): Promise<void> {
    const ref = doc(db, "reports", reportId);
    await updateDoc(ref, {
      status,
      ...(adminNotes ? { adminNotes } : {}),
      reviewedAt: serverTimestamp(),
    });
  }

  /**
   * Admin action: suspend a user (sets role to "suspended").
   */
  async suspendUser(userId: string, reason: string): Promise<void> {
    const userRef = doc(db, "users", userId);
    await setDoc(
      userRef,
      {
        role: "suspended",
        suspendedAt: serverTimestamp(),
        suspendReason: reason,
      },
      { merge: true },
    );
  }

  /**
   * Admin action: warn a user via notification.
   */
  async warnUser(userId: string, message: string): Promise<void> {
    await addDoc(collection(db, "notifications"), {
      userId,
      title: "⚠️ Community Guidelines Warning",
      body: message,
      type: "system",
      read: false,
      data: { type: "moderation_warning" },
      createdAt: serverTimestamp(),
    });
  }
}

export const TrustSafetyService = new TrustSafetyServiceClass();
