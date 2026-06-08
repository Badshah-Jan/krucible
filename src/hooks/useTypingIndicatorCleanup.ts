import { useEffect } from "react";
import { AppState, AppStateStatus } from "react-native";
import { ChatService } from "../services/chatService";
import { AuthService } from "../services/authService";

/**
 * Cleanup typing indicators when:
 * - User navigates away from chat (cleanup on unmount)
 * - Timeout occurs (auto-cleanup)
 * - App goes to background (background cleanup)
 * - Network disconnect (cleanup on unmount)
 */
export function useTypingIndicatorCleanup(chatId: string, uid: string) {
  useEffect(() => {
    const user = AuthService.getCurrentUser();
    if (!user || !chatId || !uid) return;

    const handleAppStateChange = (nextState: AppStateStatus) => {
      if (nextState === "background") {
        // Background cleanup: stop typing indicators when app goes to background
        ChatService.setTypingStatus(chatId, uid, false).catch(() => {});
      }
    };

    const appStateSubscription = AppState.addEventListener(
      "change",
      handleAppStateChange
    );

    // Cleanup on unmount (disconnect cleanup)
    return () => {
      appStateSubscription.remove();
      ChatService.setTypingStatus(chatId, uid, false).catch(() => {});
    };
  }, [chatId, uid]);
}
