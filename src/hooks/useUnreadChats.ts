import { useEffect, useState } from "react";
import { AuthService } from "../services/authService";
import { ChatService, Conversation } from "../services/chatService";
import { useAppStore } from "../store/appStore";
import * as Notifications from "expo-notifications";

export function useUnreadChats() {
  const [unreadCount, setUnreadCount] = useState(0);
  const community = useAppStore((s) => s.community);
  const isAuthenticated = useAppStore((s) => s.isAuthenticated);
  const authInitialized = useAppStore((s) => s.authInitialized);

  useEffect(() => {
    // Don't subscribe until auth is fully initialized and user is logged in
    if (!authInitialized || !isAuthenticated) {
      setUnreadCount(0);
      return;
    }

    const user = AuthService.getCurrentUser();
    if (!user) {
      setUnreadCount(0);
      return;
    }

    const uid = user.uid;
    const cid = community?.communityId;

    const unsubscribe = ChatService.subscribeToUserConversations(
      uid,
      cid,
      (conversations: Conversation[]) => {
        let totalUnread = 0;
        conversations.forEach((conv) => {
          if (conv.unreadCounts && conv.unreadCounts[uid]) {
            totalUnread += conv.unreadCounts[uid];
          }
        });
        setUnreadCount(totalUnread);
        Notifications.setBadgeCountAsync(totalUnread).catch(() => {});
      },
      (error) => {
        console.warn("Error subscribing to unread chats:", error);
      }
    );

    return () => unsubscribe();
  }, [community?.communityId, isAuthenticated, authInitialized]);

  return unreadCount;
}

