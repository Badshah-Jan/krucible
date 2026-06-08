import { useCallback, useEffect, useState } from "react";
import { AuthService } from "../services/authService";
import NotificationService, {
  AppNotification,
} from "../services/notificationService";

export function useNotifications() {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Use Firebase Auth directly, not the Zustand mock user object
    const uid = AuthService.getCurrentUser()?.uid;
    if (!uid) {
      setNotifications([]);
      setUnreadCount(0);
      setLoading(false);
      return;
    }

    setLoading(true);
    const unsubscribe = NotificationService.subscribeToUserNotifications(
      uid,
      (notifs) => {
        setNotifications(notifs);
        setUnreadCount(notifs.filter((n) => !n.read).length);
        setLoading(false);
      },
    );

    return () => unsubscribe();
  }, []);

  /**
   * Mark a single notification as read.
   *
   * Updates the local state immediately (optimistic) so the UI reflects the
   * change without waiting for the Firestore round-trip. The server write is
   * still performed; if it fails the in-memory state will be re-synced on the
   * next snapshot.
   */
  const markAsRead = useCallback(async (id: string) => {
    // Optimistic local update
    setNotifications((prev) => {
      let changed = false;
      const next = prev.map((n) => {
        if (n.id === id && !n.read) {
          changed = true;
          return { ...n, read: true };
        }
        return n;
      });
      if (changed) {
        setUnreadCount((c) => Math.max(0, c - 1));
      }
      return changed ? next : prev;
    });

    await NotificationService.markAsRead(id);
  }, []);

  const markAllAsRead = useCallback(async () => {
    const uid = AuthService.getCurrentUser()?.uid;
    if (!uid) return;

    // Optimistic local update
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnreadCount(0);

    await NotificationService.markAllAsRead(uid);
  }, []);

  return {
    notifications,
    unreadCount,
    loading,
    markAsRead,
    markAllAsRead,
  };
}
