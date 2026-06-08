import { useEffect } from "react";
import { AppState, AppStateStatus } from "react-native";
import { ChatService } from "../services/chatService";
import { AuthService } from "../services/authService";

export function useOnlinePresence() {
  useEffect(() => {
    const user = AuthService.getCurrentUser();
    if (!user) return;

    // Set online when app opens
    ChatService.updateOnlineStatus(user.uid, true).catch(() => {});

    const handleAppStateChange = (nextState: AppStateStatus) => {
      if (nextState === "background") {
        // App moved to background → set as away
        ChatService.updateOnlineStatus(user.uid, false).catch(() => {});
      } else if (nextState === "active") {
        // App foregrounded → set as online
        ChatService.updateOnlineStatus(user.uid, true).catch(() => {});
      }
    };

    const appStateSubscription = AppState.addEventListener(
      "change",
      handleAppStateChange
    );

    return () => {
      appStateSubscription.remove();
      // App closed → set as offline (only on explicit unmount, not background)
      ChatService.updateOnlineStatus(user.uid, false).catch(() => {});
    };
  }, []);
}
