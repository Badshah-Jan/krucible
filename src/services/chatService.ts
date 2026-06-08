import {
  arrayUnion,
  collection,
  doc,
  getDoc,
  getDocs,
  increment,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  startAfter,
  updateDoc,
  where,
  writeBatch,
} from "firebase/firestore";
import { db } from "./firebase";
import NotificationService from "./notificationService";

// ─── Types ────────────────────────────────────────────────────────────────────

export type MessageStatus =
  | "pending"
  | "sent"
  | "delivered"
  | "read"
  | "failed";
export type ConversationType = "community" | "channel" | "dm";

export interface ChatMessage {
  id?: string;
  text?: string;
  imageUrl?: string;
  audioUrl?: string;
  type: "text" | "image" | "audio";
  senderId: string;
  senderName: string;
  senderAvatar?: string;
  createdAt: any;
  status?: MessageStatus;
  reactions?: Record<string, string[]>; // emoji → [uid, ...]
  replyTo?: { id: string; text: string; senderName: string } | null;
  deletedAt?: any;
}

export interface Conversation {
  id?: string;
  type: ConversationType;
  participants: string[];
  participantNames?: Record<string, string>;
  communityId?: string;
  channelId?: string;
  name?: string;
  iconName?: string;
  iconColor?: string;
  lastMessage: string;
  lastMessageAt: any;
  lastSenderId?: string;
  readBy?: Record<string, any>; // uid → Timestamp (last read)
  typing?: Record<string, any>; // uid → Timestamp (typing heartbeat)
  unreadCounts?: Record<string, number>;
  createdAt: any;
}

const MESSAGES_PAGE_SIZE = 50;

// ─── ChatService ──────────────────────────────────────────────────────────────

export class ChatService {
  // ── Conversations ─────────────────────────────────────────────────────────

  /**
   * Get or create a DM conversation between two users.
   * Uses a deterministic ID (sorted UIDs) to prevent duplicate threads.
   */
  static async createOrGetDmConversation(
    uid1: string,
    uid2: string,
    name1: string,
    name2: string,
  ): Promise<string> {
    const roomId = ["dm", uid1, uid2].sort().join("_");
    const ref = doc(db, "conversations", roomId);
    const snap = await getDoc(ref);

    if (!snap.exists()) {
      await setDoc(ref, {
        type: "dm",
        participants: [uid1, uid2],
        participantNames: { [uid1]: name1, [uid2]: name2 },
        lastMessage: "",
        lastMessageAt: serverTimestamp(),
        readBy: {},
        typing: {},
        unreadCounts: { [uid1]: 0, [uid2]: 0 },
        createdAt: serverTimestamp(),
      } as Omit<Conversation, "id">);
    }

    return roomId;
  }

  /**
   * Create or get the community group chat conversation.
   */
  static async ensureCommunityConversation(
    communityId: string,
    communityName: string,
  ): Promise<string> {
    const roomId = `community_${communityId}`;
    const ref = doc(db, "conversations", roomId);
    const snap = await getDoc(ref);

    if (!snap.exists()) {
      await setDoc(ref, {
        type: "community",
        communityId,
        participants: [], // open membership — anyone in community can join
        name: communityName,
        iconName: "home",
        iconColor: "#EF4444",
        lastMessage: "Community chat created",
        lastMessageAt: serverTimestamp(),
        readBy: {},
        typing: {},
        unreadCounts: {},
        createdAt: serverTimestamp(),
      } as Omit<Conversation, "id">);
    }

    return roomId;
  }

  /**
   * Subscribe to all conversations for a user (DMs + community).
   */
  static subscribeToUserConversations(
    uid: string,
    communityId: string | undefined,
    callback: (conversations: Conversation[]) => void,
    onError?: (e: Error) => void,
  ): () => void {
    // Query 1: DM conversations this user is a participant of
    // No orderBy — array-contains + orderBy requires a composite index.
    // We sort client-side instead.
    const dmQuery = query(
      collection(db, "conversations"),
      where("participants", "array-contains", uid),
    );

    let dmConvs: Conversation[] = [];
    let communityConv: Conversation | null = null;

    const emit = () => {
      const all: Conversation[] = [];
      if (communityConv) all.push(communityConv);
      all.push(...dmConvs);
      callback(all);
    };

    const unsubDm = onSnapshot(
      dmQuery,
      (snap: any) => {
        dmConvs = snap.docs
          .map((d: any) => ({ id: d.id, ...d.data() }) as Conversation)
          .sort((a: any, b: any) => {
            const ta =
              a.lastMessageAt?.toDate?.() ?? new Date(a.lastMessageAt ?? 0);
            const tb =
              b.lastMessageAt?.toDate?.() ?? new Date(b.lastMessageAt ?? 0);
            return tb.getTime() - ta.getTime(); // most recent first
          });
        emit();
      },
      (err: any) => {
        console.error("DM conversations error:", err);
        onError?.(err);
      },
    );

    // Query 2: community conversation (a single doc, not participants-gated)
    let unsubCommunity = () => {};
    if (communityId) {
      const commId = `community_${communityId}`;
      unsubCommunity = onSnapshot(
        doc(db, "conversations", commId),
        (snap: any) => {
          communityConv = snap.exists()
            ? ({ id: snap.id, ...snap.data() } as Conversation)
            : null;
          emit();
        },
        (err: any) => {
          console.error("Community conversation error:", err);
          onError?.(err);
        },
      );
    }

    return () => {
      unsubDm();
      unsubCommunity();
    };
  }

  // ── Messages ──────────────────────────────────────────────────────────────

  /**
   * Send a message. Atomically writes the message doc and updates the
   * conversation's lastMessage / lastMessageAt / unreadCounts.
   */
  static async sendMessage(
    chatId: string,
    message: Omit<ChatMessage, "id" | "createdAt" | "status">,
    participantIds: string[],
  ): Promise<string> {
    const batch = writeBatch(db);

    // 1. Write message
    const msgRef = doc(collection(db, "conversations", chatId, "messages"));
    batch.set(msgRef, {
      ...message,
      createdAt: serverTimestamp(),
      status: "sent",
    });

    // 2. Update conversation metadata
    const convRef = doc(db, "conversations", chatId);
    const convSnap = await getDoc(convRef);
    const conversation = convSnap.exists()
      ? ({ id: convSnap.id, ...convSnap.data() } as Conversation)
      : null;
    let recipientIds = participantIds.filter((uid) => uid !== message.senderId);

    if (
      recipientIds.length === 0 &&
      conversation?.type === "community" &&
      conversation.communityId
    ) {
      const usersSnap = await getDocs(
        query(
          collection(db, "users"),
          where("communityId", "==", conversation.communityId),
        ),
      );
      recipientIds = usersSnap.docs
        .map((userDoc: any) => userDoc.id as string)
        .filter((uid: string) => uid !== message.senderId);
    }

    const unreadIncrement: Record<string, any> = {};
    for (const uid of recipientIds) {
      unreadIncrement[`unreadCounts.${uid}`] = increment(1);
    }

    batch.update(convRef, {
      lastMessage:
        message.text || (message.imageUrl ? "📷 Photo" : "🎤 Voice note"),
      lastMessageAt: serverTimestamp(),
      lastSenderId: message.senderId,
      ...unreadIncrement,
    });

    await batch.commit();

    // 3. Send in-app notifications to recipients (fire-and-forget, non-blocking)
    const messagePreview = message.text
      ? message.text.length > 80
        ? message.text.substring(0, 80) + "…"
        : message.text
      : message.imageUrl
        ? "📷 Sent a photo"
        : "🎤 Sent a voice note";

    for (const uid of recipientIds) {
      NotificationService.sendInAppNotification(
        uid,
        `💬 ${message.senderName}`,
        messagePreview,
        "direct_message",
        { chatId, senderId: message.senderId, senderName: message.senderName },
      ).catch((e) =>
        console.warn("[ChatService] Notification failed (non-fatal):", e),
      );
    }

    return msgRef.id;
  }

  /**
   * Subscribe to paginated messages — latest 50, real-time.
   */
  static subscribeToMessages(
    chatId: string,
    callback: (messages: ChatMessage[]) => void,
    onError?: (e: Error) => void,
  ): () => void {
    const q = query(
      collection(db, "conversations", chatId, "messages"),
      orderBy("createdAt", "desc"),
      limit(MESSAGES_PAGE_SIZE),
    );

    return onSnapshot(
      q,
      (snapshot: any) => {
        const messages = snapshot.docs
          .map((d: any) => ({ id: d.id, ...d.data() }) as ChatMessage)
          .reverse(); // reverse so oldest is first for display
        callback(messages);
      },
      (err: any) => {
        console.error("Messages subscription error:", err);
        onError?.(err);
      },
    );
  }

  /**
   * Load older messages (pagination cursor).
   *
   * `beforeSnapshot` is a Firestore DocumentSnapshot (only used as a cursor
   * marker by `startAfter`, never inspected directly), so we type it loosely
   * with `any` here to keep the public surface decoupled from the SDK shape.
   */
  static async loadMoreMessages(
    chatId: string,
    beforeSnapshot: any,
  ): Promise<ChatMessage[]> {
    const q = query(
      collection(db, "conversations", chatId, "messages"),
      orderBy("createdAt", "desc"),
      startAfter(beforeSnapshot),
      limit(MESSAGES_PAGE_SIZE),
    );
    const snap = await getDocs(q);
    return snap.docs
      .map((d: any) => ({ id: d.id, ...d.data() }) as ChatMessage)
      .reverse();
  }

  /**
   * Delete own message (soft delete — replaces content).
   */
  static async deleteMessage(chatId: string, messageId: string): Promise<void> {
    const ref = doc(db, "conversations", chatId, "messages", messageId);
    await updateDoc(ref, {
      text: null,
      imageUrl: null,
      audioUrl: null,
      deletedAt: serverTimestamp(),
    });
  }

  /**
   * Add or toggle a reaction on a message.
   */
  static async toggleReaction(
    chatId: string,
    messageId: string,
    emoji: string,
    uid: string,
  ): Promise<void> {
    const ref = doc(db, "conversations", chatId, "messages", messageId);
    const snap = await getDoc(ref);
    if (!snap.exists()) return;

    const reactions: Record<string, string[]> = snap.data().reactions || {};
    const current = reactions[emoji] || [];
    const hasReacted = current.includes(uid);

    await updateDoc(ref, {
      [`reactions.${emoji}`]: hasReacted
        ? current.filter((u) => u !== uid)
        : [...current, uid],
    });
  }

  // ── Read receipts ─────────────────────────────────────────────────────────

  /**
   * Mark all messages in a conversation as read for a user.
   * Writes readBy.{uid} = serverTimestamp() on the conversation doc.
   */
  static async markConversationRead(
    chatId: string,
    uid: string,
  ): Promise<void> {
    try {
      const ref = doc(db, "conversations", chatId);
      await updateDoc(ref, {
        [`readBy.${uid}`]: serverTimestamp(),
        [`unreadCounts.${uid}`]: 0,
      });
    } catch (e) {
      console.error("markConversationRead error:", e);
    }
  }

  // ── Typing indicators ─────────────────────────────────────────────────────

  /**
   * Write a typing heartbeat. Call every ~2s while typing.
   * Clear on blur / send by calling setTypingStatus(id, uid, false).
   */
  static async setTypingStatus(
    chatId: string,
    uid: string,
    isTyping: boolean,
  ): Promise<void> {
    try {
      const ref = doc(db, "conversations", chatId);
      await updateDoc(ref, {
        [`typing.${uid}`]: isTyping ? serverTimestamp() : null,
      });
    } catch (e) {
      // Non-fatal
    }
  }

  /**
   * Subscribe to the conversation document for typing + read-receipt metadata.
   */
  static subscribeToConversationMeta(
    chatId: string,
    callback: (conv: Conversation | null) => void,
  ): () => void {
    return onSnapshot(doc(db, "conversations", chatId), (snap: any) => {
      callback(
        snap.exists()
          ? ({ id: snap.id, ...snap.data() } as Conversation)
          : null,
      );
    });
  }

  // ── Participants ──────────────────────────────────────────────────────────

  /**
   * Add a user to a conversation's participants list (for community chat).
   */
  static async joinConversation(chatId: string, uid: string): Promise<void> {
    try {
      await updateDoc(doc(db, "conversations", chatId), {
        participants: arrayUnion(uid),
      });
    } catch (e) {
      console.error("joinConversation error:", e);
    }
  }

  // ── Online Presence ─────────────────────────────────────────────────────

  /**
   * Update user's online status. Call on app foreground/background events.
   */
  static async updateOnlineStatus(
    uid: string,
    isOnline: boolean,
  ): Promise<void> {
    try {
      const ref = doc(db, "users", uid);
      await updateDoc(ref, {
        isOnline,
        lastSeen: serverTimestamp(),
      });
    } catch (e) {
      // Non-fatal
    }
  }

  /**
   * Subscribe to another user's online status (for DM header).
   */
  static subscribeToUserPresence(
    uid: string,
    callback: (data: { isOnline: boolean; lastSeen: any }) => void,
  ): () => void {
    return onSnapshot(doc(db, "users", uid), (snap: any) => {
      if (snap.exists()) {
        const d = snap.data();
        callback({
          isOnline: d.isOnline ?? false,
          lastSeen: d.lastSeen ?? null,
        });
      }
    });
  }

  // ── Read Receipt Helpers ───────────────────────────────────────────────

  /**
   * Get the read status of the last message for a DM conversation.
   * Returns 'read' if the other user's readBy timestamp is after the message.
   */
  static getMessageReadStatus(
    msg: ChatMessage,
    convMeta: Conversation | null,
    currentUid: string,
  ): MessageStatus {
    if (!msg || !convMeta) return msg?.status ?? 'sent';
    if (msg.senderId !== currentUid) return 'read'; // incoming = always read

    // For outgoing messages, check if the other participants have read
    const readBy = convMeta.readBy ?? {};
    const msgTime = msg.createdAt?.toDate ? msg.createdAt.toDate() : new Date(msg.createdAt ?? 0);

    for (const [uid, ts] of Object.entries(readBy)) {
      if (uid === currentUid) continue;
      const readTime = ts && (ts as any).toDate ? (ts as any).toDate() : new Date(ts ?? 0);
      if (readTime >= msgTime) return 'read';
    }

    return msg.status ?? 'sent';
  }
}
