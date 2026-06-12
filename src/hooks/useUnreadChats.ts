import { useEffect, useState } from "react";
import { AuthService } from "../services/authService";
import { ChatService, Conversation } from "../services/chatService";
import { useAppStore } from "../store/appStore";

export function useUnreadChats() {
  const [unreadCount, setUnreadCount] = useState(0);
  const community = useAppStore((s) => s.community);

  useEffect(() => {
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
      },
      (error) => {
        console.warn("Error subscribing to unread chats:", error);
      }
    );

    return () => unsubscribe();
  }, [community?.communityId]);

  return unreadCount;
}
