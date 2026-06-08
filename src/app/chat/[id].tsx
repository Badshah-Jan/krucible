import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Image,
  Alert,
  ActionSheetIOS,
  Clipboard,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

import Text from '@/components/common/Text';
import GradientBg from '@/components/common/GradientBg';
import { ChatService, ChatMessage, Conversation, MessageStatus } from '@/services/chatService';
import { AuthService } from '@/services/authService';
import { UserService } from '@/services/userService';

// ─── Helpers ──────────────────────────────────────────────────────────────────
function formatTime(ts: any): string {
  if (!ts) return '';
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function formatDateLabel(ts: any): string {
  if (!ts) return '';
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - d.getTime()) / 86_400_000);
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  return d.toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' });
}

function isSameDay(a: any, b: any): boolean {
  if (!a || !b) return false;
  const da = a.toDate ? a.toDate() : new Date(a);
  const db2 = b.toDate ? b.toDate() : new Date(b);
  return da.toDateString() === db2.toDateString();
}

function isGrouped(current: ChatMessage, prev: ChatMessage | undefined): boolean {
  if (!prev) return false;
  if (current.senderId !== prev.senderId) return false;
  if (!current.createdAt || !prev.createdAt) return false;
  const tc = current.createdAt.toDate ? current.createdAt.toDate() : new Date(current.createdAt);
  const tp = prev.createdAt.toDate ? prev.createdAt.toDate() : new Date(prev.createdAt);
  return Math.abs(tc.getTime() - tp.getTime()) < 2 * 60 * 1000;
}

type ListItem =
  | { kind: 'date'; label: string; key: string }
  | { kind: 'message'; msg: ChatMessage; grouped: boolean; key: string };

function buildListItems(messages: ChatMessage[]): ListItem[] {
  const items: ListItem[] = [];
  for (let i = 0; i < messages.length; i++) {
    const msg = messages[i];
    const prev = messages[i - 1];
    if (!isSameDay(msg.createdAt, prev?.createdAt)) {
      items.push({ kind: 'date', label: formatDateLabel(msg.createdAt), key: `date_${i}` });
    }
    items.push({ kind: 'message', msg, grouped: isGrouped(msg, prev), key: msg.id ?? `m_${i}` });
  }
  return items;
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function ChatDetailScreen() {
  const { t } = useTranslation();
  const { id, name } = useLocalSearchParams<{ id: string; name: string }>();
  const router = useRouter();

  const [inputText, setInputText] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [convMeta, setConvMeta] = useState<Conversation | null>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [feedError, setFeedError] = useState<string | null>(null);
  const [pendingMsgs, setPendingMsgs] = useState<ChatMessage[]>([]);
  const [otherUserPresence, setOtherUserPresence] = useState<{ isOnline: boolean; lastSeen: any; isDeleted?: boolean } | null>(null);

  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const flatListRef = useRef<FlatList>(null);

  // ── Load current user ─────────────────────────────────────────────────────
  useEffect(() => {
    const auth = AuthService.getCurrentUser();
    if (!auth) return;
    const unsub = UserService.subscribeToUser(auth.uid, (p) => {
      setCurrentUser(p ? { ...p, uid: auth.uid } : { uid: auth.uid, name: auth.displayName ?? 'Neighbor' });
    });
    return () => {
      unsub();
    };
  }, []);

  // ── Subscribe to messages ──────────────────────────────────────────────────
  useEffect(() => {
    if (!id) return;
    setLoading(true);
    setFeedError(null);

    const unsub = ChatService.subscribeToMessages(
      id,
      (fetched) => {
        setMessages(fetched);
        setLoading(false);
        // Remove any pending message that now appears in Firestore
        setPendingMsgs((prev) =>
          prev.filter((p) => !fetched.find((f) => f.text === p.text && f.senderId === p.senderId))
        );
      },
      (err) => {
        setFeedError('Could not load messages. Check your connection.');
        setLoading(false);
      }
    );

    return unsub;
  }, [id]);

  // ── Subscribe to conversation metadata (typing, readBy) ───────────────
  useEffect(() => {
    if (!id) return;
    const unsub = ChatService.subscribeToConversationMeta(id, (conv) => setConvMeta(conv));
    return unsub;
  }, [id]);

  const otherUid = convMeta?.type === 'dm' && currentUser?.uid 
    ? convMeta.participants?.find((p: string) => p !== currentUser.uid) 
    : null;
  const isBlocked = otherUid ? currentUser?.blockedUsers?.includes(otherUid) : false;

  // ── Subscribe to other user's online status (DM only) ────────────────
  useEffect(() => {
    if (!otherUid) return;
    const unsub = ChatService.subscribeToUserPresence(otherUid, (presence) => {
      setOtherUserPresence(presence);
    });
    return unsub;
  }, [otherUid]);

  // ── Block User ─────────────────────────────────────────────────────────────
  const handleBlockUser = useCallback(() => {
    if (!otherUid || !currentUser?.uid) return;
    
    Alert.alert(
      isBlocked ? 'Unblock User' : 'Block User',
      isBlocked 
        ? 'Are you sure you want to unblock this user?'
        : 'Are you sure you want to block this user? They will not be able to message you anymore.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: isBlocked ? 'Unblock' : 'Block', 
          style: isBlocked ? 'default' : 'destructive',
          onPress: async () => {
            try {
              if (isBlocked) {
                await UserService.unblockUser(currentUser.uid, otherUid);
                Alert.alert('Unblocked', 'User has been unblocked.');
              } else {
                await UserService.blockUser(currentUser.uid, otherUid);
                Alert.alert('Blocked', 'User has been blocked.');
              }
            } catch (err) {
              Alert.alert('Error', 'Could not update block status.');
            }
          }
        }
      ]
    );
  }, [isBlocked, otherUid, currentUser?.uid]);

  // ── Mark as read on open ───────────────────────────────────────────────────
  useEffect(() => {
    const uid = currentUser?.uid;
    if (!id || !uid) return;
    ChatService.markConversationRead(id, uid).catch(console.error);
  }, [id, currentUser?.uid, messages.length]);

  // ── Typing indicator logic ─────────────────────────────────────────────────
  const handleInputChange = useCallback(
    (text: string) => {
      setInputText(text);
      if (!id || !currentUser?.uid) return;
      ChatService.setTypingStatus(id, currentUser.uid, true).catch(() => {});
      if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
      typingTimerRef.current = setTimeout(() => {
        ChatService.setTypingStatus(id, currentUser.uid, false).catch(() => {});
      }, 3000);
    },
    [id, currentUser?.uid]
  );

  const stopTyping = useCallback(() => {
    if (!id || !currentUser?.uid) return;
    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    ChatService.setTypingStatus(id, currentUser.uid, false).catch(() => {});
  }, [id, currentUser?.uid]);

  // ── Compute who is typing ──────────────────────────────────────────────────
  const typingUsers: string[] = [];
  if (convMeta?.typing && currentUser?.uid) {
    const TYPING_TIMEOUT = 5000;
    for (const [uid, ts] of Object.entries(convMeta.typing)) {
      if (uid === currentUser.uid || !ts) continue;
      const t2 = ts.toDate ? ts.toDate() : new Date(ts);
      if (Date.now() - t2.getTime() < TYPING_TIMEOUT) {
        const tname = convMeta.participantNames?.[uid] ?? 'Someone';
        typingUsers.push(tname);
      }
    }
  }

  // ── Send message ───────────────────────────────────────────────────────────
  const handleSend = useCallback(async () => {
    const text = inputText.trim();
    if (!text || !currentUser?.uid || !id) return;

    setInputText('');
    stopTyping();

    // Optimistic update
    const optimistic: ChatMessage = {
      id: `pending_${Date.now()}`,
      type: 'text',
      text,
      senderId: currentUser.uid,
      senderName: currentUser.name ?? currentUser.displayName ?? 'Neighbor',
      senderAvatar: currentUser.photoURL,
      createdAt: { toDate: () => new Date() },
      status: 'pending',
    };
    setPendingMsgs((prev) => [...prev, optimistic]);

    try {
      const participants = convMeta?.participants ?? [];
      await ChatService.sendMessage(id, {
        type: 'text',
        text,
        senderId: currentUser.uid,
        senderName: currentUser.name ?? currentUser.displayName ?? 'Neighbor',
        senderAvatar: currentUser.photoURL ?? undefined,
        replyTo: null,
      }, participants);
    } catch (err) {
      // Mark the optimistic message as failed
      setPendingMsgs((prev) =>
        prev.map((p) => (p.id === optimistic.id ? { ...p, status: 'failed' } : p))
      );
    }
  }, [inputText, currentUser, id, convMeta, stopTyping]);

  // ── Message actions ────────────────────────────────────────────────────────
  const handleLongPress = useCallback(
    (msg: ChatMessage) => {
      const isOwner = msg.senderId === currentUser?.uid;
      const isDeleted = !!msg.deletedAt;
      if (isDeleted) return;

      const options = ['Copy text', 'React 👍', 'React ❤️'];
      if (isOwner) options.push('Delete');
      options.push('Cancel');

      if (Platform.OS === 'ios') {
        ActionSheetIOS.showActionSheetWithOptions(
          { options, destructiveButtonIndex: isOwner ? options.length - 2 : undefined, cancelButtonIndex: options.length - 1 },
          (idx) => handleAction(idx, msg, options, isOwner)
        );
      } else {
        Alert.alert('Message', undefined, [
          { text: 'Copy text', onPress: () => Clipboard.setString(msg.text ?? '') },
          { text: 'React 👍', onPress: () => ChatService.toggleReaction(id!, msg.id!, '👍', currentUser!.uid) },
          { text: 'React ❤️', onPress: () => ChatService.toggleReaction(id!, msg.id!, '❤️', currentUser!.uid) },
          ...(isOwner ? [{ text: 'Delete', style: 'destructive' as const, onPress: () => ChatService.deleteMessage(id!, msg.id!) }] : []),
          { text: 'Cancel', style: 'cancel' as const },
        ]);
      }
    },
    [currentUser, id]
  );

  const handleAction = (idx: number, msg: ChatMessage, options: string[], isOwner: boolean) => {
    const choice = options[idx];
    if (choice === 'Copy text') Clipboard.setString(msg.text ?? '');
    else if (choice === 'React 👍') ChatService.toggleReaction(id!, msg.id!, '👍', currentUser!.uid);
    else if (choice === 'React ❤️') ChatService.toggleReaction(id!, msg.id!, '❤️', currentUser!.uid);
    else if (choice === 'Delete') ChatService.deleteMessage(id!, msg.id!);
  };

  // ── Merged + list items ────────────────────────────────────────────────────
  const allMessages = [...messages, ...pendingMsgs];
  const listItems = buildListItems(allMessages);

  // ── Render item ────────────────────────────────────────────────────────────
  const renderItem = useCallback(
    ({ item }: { item: ListItem }) => {
      if (item.kind === 'date') {
        return (
          <View style={styles.dateSep}>
            <View style={styles.dateLine} />
            <Text style={styles.dateLabel}>{item.label}</Text>
            <View style={styles.dateLine} />
          </View>
        );
      }

      const { msg, grouped } = item;
      const isMe = msg.senderId === currentUser?.uid;
      const isSystem = msg.senderId === "system_sos";
      const isPending = msg.status === 'pending';
      const isFailed = msg.status === 'failed';
      const isDeleted = !!msg.deletedAt;

      const reactions = msg.reactions ?? {};
      const reactionEntries = Object.entries(reactions).filter(([, uids]) => uids.length > 0);

      return (
        <View style={[
          styles.msgWrapper, 
          isSystem ? styles.systemWrapper : isMe ? styles.myWrapper : styles.theirWrapper, 
          grouped && { marginTop: 2 }
        ]}>
          {/* Avatar column for others */}
          {!isMe && !isSystem && (
            <View style={styles.avatarCol}>
              {!grouped ? (
                msg.senderAvatar ? (
                  <Image source={{ uri: msg.senderAvatar }} style={styles.avatar} />
                ) : (
                  <View style={[styles.avatarFallback, { backgroundColor: '#2563EB' }]}>
                    <Text style={styles.avatarFallbackText}>{(msg.senderName?.[0] ?? '?').toUpperCase()}</Text>
                  </View>
                )
              ) : (
                <View style={styles.avatarPlaceholder} />
              )}
            </View>
          )}

          <View style={[styles.msgContent, isSystem && { maxWidth: '90%', width: '100%' }, isMe && { alignItems: 'flex-end' }]}>
            {!isMe && !isSystem && !grouped && (
              <Text style={styles.senderName}>{msg.senderName}</Text>
            )}

            <TouchableOpacity
              activeOpacity={0.85}
              onLongPress={() => handleLongPress(msg)}
              style={[
                styles.bubble,
                isSystem ? styles.systemBubble : isMe ? styles.myBubble : styles.theirBubble,
                isPending && { opacity: 0.6 },
                isFailed && { borderWidth: 1, borderColor: '#EF4444' },
              ]}
            >
              {isDeleted ? (
                <Text style={[styles.msgText, { fontStyle: 'italic', opacity: 0.5 }]}>Message deleted</Text>
              ) : msg.type === "sos_alert" ? (
                <View style={styles.sosAlertCard}>
                  <View style={styles.sosHeader}>
                    <Ionicons name="alert-circle" size={20} color="#FFFFFF" />
                    <Text style={styles.sosTitle}>EMERGENCY ALERT</Text>
                  </View>
                  <View style={styles.sosBody}>
                    <Text style={styles.sosText}>{msg.text}</Text>
                    {msg.metadata?.sosId && (
                      <View style={styles.sosActions}>
                        <TouchableOpacity 
                          style={styles.sosBtn}
                          onPress={() => router.push(`/sos/${msg.metadata.sosId}` as any)}
                        >
                          <Text style={styles.sosBtnText}>View SOS</Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                </View>
              ) : msg.imageUrl ? (
                <Image source={{ uri: msg.imageUrl }} style={styles.msgImage} />
              ) : (
                <Text style={styles.msgText}>{msg.text}</Text>
              )}
              <View style={styles.msgMeta}>
                <Text style={styles.msgTime}>{formatTime(msg.createdAt)}</Text>
                {isMe && (() => {
                  const realStatus = ChatService.getMessageReadStatus(msg, convMeta, currentUser?.uid);
                  const isRead = realStatus === 'read';
                  return (
                    <Ionicons
                      name={isPending ? 'time-outline' : isFailed ? 'alert-circle-outline' : 'checkmark-done'}
                      size={12}
                      color={isFailed ? '#EF4444' : isPending ? 'rgba(255,255,255,0.4)' : isRead ? '#34D399' : 'rgba(255,255,255,0.7)'}
                      style={{ marginLeft: 4 }}
                    />
                  );
                })()}
              </View>
            </TouchableOpacity>

            {/* Reactions row */}
            {reactionEntries.length > 0 && (
              <View style={styles.reactionsRow}>
                {reactionEntries.map(([emoji, uids]) => (
                  <TouchableOpacity
                    key={emoji}
                    style={[styles.reactionChip, uids.includes(currentUser?.uid) && styles.reactionChipActive]}
                    onPress={() => ChatService.toggleReaction(id!, msg.id!, emoji, currentUser!.uid)}
                  >
                    <Text style={styles.reactionText}>{emoji} {uids.length}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {/* Failed retry */}
            {isFailed && (
              <TouchableOpacity
                style={styles.retryBtn}
                onPress={() => {
                  setPendingMsgs((prev) => prev.filter((p) => p.id !== msg.id));
                  setInputText(msg.text ?? '');
                }}
              >
                <Text style={styles.retryText}>Tap to retry</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      );
    },
    [currentUser, handleLongPress, id]
  );

  const chatName = Array.isArray(name) ? name[0] : name ?? 'Chat';

  return (
    <GradientBg>
      <SafeAreaView style={{ flex: 1 }}>
        {/* ── Header ── */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.headerBtn}>
            <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
          </TouchableOpacity>

          <View style={styles.headerInfo}>
            <View style={styles.headerAvatar}>
              <Ionicons name="people" size={18} color="#2563EB" />
            </View>
            <View>
              <Text style={styles.headerName} numberOfLines={1}>{otherUserPresence?.isDeleted ? 'Deleted Account' : chatName}</Text>
              {otherUserPresence?.isDeleted ? (
                <Text style={[styles.headerSub, { color: '#EF4444' }]}>Account no longer exists</Text>
              ) : typingUsers.length > 0 ? (
                <Text style={styles.headerSub}>
                  {typingUsers.join(', ')} {typingUsers.length === 1 ? 'is' : 'are'} typing…
                </Text>
              ) : convMeta?.type === 'dm' && otherUserPresence ? (
                <Text style={[styles.headerSub, !otherUserPresence.isOnline && { color: '#9CA3AF' }]}>
                  {otherUserPresence.isOnline
                    ? 'Online'
                    : otherUserPresence.lastSeen
                      ? `Last seen ${(otherUserPresence.lastSeen.toDate ? otherUserPresence.lastSeen.toDate() : new Date(otherUserPresence.lastSeen)).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                      : 'Offline'
                  }
                </Text>
              ) : (
                <Text style={styles.headerSub}>Live room</Text>
              )}
            </View>
          </View>

          {otherUid ? (
            <TouchableOpacity style={styles.headerBtn} onPress={handleBlockUser}>
              <Ionicons name="ellipsis-vertical" size={20} color="#FFFFFF" />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={styles.headerBtn}>
              <Ionicons name="information-circle-outline" size={20} color="#FFFFFF" />
            </TouchableOpacity>
          )}
        </View>

        {/* ── Messages ── */}
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
          style={{ flex: 1 }}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 25}
        >
          {loading ? (
            <View style={styles.center}>
              <ActivityIndicator color="#FFFFFF" />
            </View>
          ) : feedError ? (
            <View style={styles.center}>
              <Ionicons name="cloud-offline-outline" size={36} color="rgba(255,255,255,0.4)" />
              <Text style={styles.errorText}>{feedError}</Text>
            </View>
          ) : (
            <FlatList
              ref={flatListRef}
              data={listItems}
              keyExtractor={(item) => item.key}
              renderItem={renderItem}
              contentContainerStyle={styles.msgList}
              onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
              onLayout={() => flatListRef.current?.scrollToEnd({ animated: false })}
              ListEmptyComponent={
                <View style={styles.center}>
                  <Ionicons name="chatbubbles-outline" size={48} color="rgba(255,255,255,0.2)" />
                  <Text style={styles.emptyText}>No messages yet. Say hi!</Text>
                </View>
              }
            />
          )}

          {/* ── Input ── */}
          {otherUserPresence?.isDeleted ? (
            <View style={[styles.inputArea, { justifyContent: 'center', paddingVertical: 20 }]}>
              <Ionicons name="trash" size={16} color="#9CA3AF" style={{ marginRight: 6 }} />
              <Text style={{ color: '#9CA3AF', fontSize: 14, fontWeight: '700' }}>This account has been deleted.</Text>
            </View>
          ) : isBlocked ? (
            <View style={[styles.inputArea, { justifyContent: 'center', paddingVertical: 20 }]}>
              <Ionicons name="lock-closed" size={16} color="#EF4444" style={{ marginRight: 6 }} />
              <Text style={{ color: '#EF4444', fontSize: 14, fontWeight: '700' }}>You have blocked this user.</Text>
            </View>
          ) : (
            <View style={styles.inputArea}>
              <TouchableOpacity 
                style={styles.attachBtn}
                onPress={() => {
                  Alert.alert(
                    'Attach',
                    'Choose an option',
                    [
                      { text: 'Photo/Video', onPress: () => Alert.alert('Feature', 'Photo/Video picker coming soon') },
                      { text: 'Document', onPress: () => Alert.alert('Feature', 'Document picker coming soon') },
                      { text: 'Location', onPress: () => Alert.alert('Feature', 'Location sharing coming soon') },
                      { text: 'Cancel', style: 'cancel' },
                    ]
                  );
                }}
              >
                <Ionicons name="add" size={22} color="#9CA3AF" />
              </TouchableOpacity>
              <TextInput
                style={styles.input}
                placeholder="Type a message…"
                placeholderTextColor="#6B7280"
                value={inputText}
                onChangeText={handleInputChange}
                onBlur={stopTyping}
                multiline
                maxLength={1000}
              />
              <TouchableOpacity
                style={[styles.sendBtn, !inputText.trim() && { opacity: 0.4 }]}
                onPress={handleSend}
                disabled={!inputText.trim()}
              >
                <Ionicons name="send" size={16} color="#FFFFFF" style={{ marginLeft: 2 }} />
              </TouchableOpacity>
            </View>
          )}
        </KeyboardAvoidingView>
      </SafeAreaView>
    </GradientBg>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10 },
  errorText: { color: 'rgba(255,255,255,0.5)', fontSize: 13, textAlign: 'center' },
  emptyText: { color: 'rgba(255,255,255,0.3)', fontSize: 14, marginTop: 8 },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  headerBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerInfo: { flex: 1, flexDirection: 'row', alignItems: 'center', marginLeft: 10, gap: 10 },
  headerAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(37,99,235,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerName: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
  headerSub: { color: '#10B981', fontSize: 11, marginTop: 1 },

  msgList: { padding: 12, paddingBottom: 8 },

  dateSep: { flexDirection: 'row', alignItems: 'center', marginVertical: 16, paddingHorizontal: 8 },
  dateLine: { flex: 1, height: 1, backgroundColor: 'rgba(255,255,255,0.08)' },
  dateLabel: { color: 'rgba(255,255,255,0.3)', fontSize: 11, marginHorizontal: 12, fontWeight: '600' },

  msgWrapper: { flexDirection: 'row', alignItems: 'flex-end', marginBottom: 6 },
  myWrapper: { justifyContent: 'flex-end' },
  theirWrapper: { justifyContent: 'flex-start' },
  systemWrapper: { justifyContent: 'center' },

  sosAlertCard: {
    backgroundColor: '#EF4444',
    borderRadius: 12,
    overflow: 'hidden',
    width: 250,
  },
  sosHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#DC2626',
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 6,
  },
  sosTitle: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 12,
    letterSpacing: 1,
  },
  sosBody: {
    padding: 12,
  },
  sosText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 20,
    marginBottom: 12,
  },
  sosActions: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.2)',
    paddingTop: 12,
  },
  sosBtn: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
  },
  sosBtnText: {
    color: '#EF4444',
    fontWeight: '800',
    fontSize: 13,
  },
  avatarCol: { width: 30, marginRight: 8 },
  avatar: { width: 28, height: 28, borderRadius: 14 },
  avatarFallback: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  avatarFallbackText: { color: '#FFFFFF', fontSize: 11, fontWeight: '800' },
  avatarPlaceholder: { width: 28, height: 28 },

  msgContent: { maxWidth: '76%' },
  senderName: { color: 'rgba(255,255,255,0.4)', fontSize: 11, marginBottom: 3, marginLeft: 12 },

  bubble: { borderRadius: 18, paddingHorizontal: 14, paddingVertical: 10 },
  myBubble: { backgroundColor: '#2563EB', borderBottomRightRadius: 4 },
  theirBubble: { backgroundColor: 'rgba(255,255,255,0.1)', borderBottomLeftRadius: 4 },
  systemBubble: { backgroundColor: 'transparent', paddingHorizontal: 0, paddingVertical: 0 },
  msgText: { color: '#FFFFFF', fontSize: 14, lineHeight: 20 },
  msgImage: { width: 200, height: 200, borderRadius: 12 },
  msgMeta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', marginTop: 4 },
  msgTime: { color: 'rgba(255,255,255,0.4)', fontSize: 10 },

  reactionsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 4, marginLeft: 4 },
  reactionChip: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 100,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  reactionChipActive: { backgroundColor: 'rgba(37,99,235,0.25)', borderColor: '#2563EB' },
  reactionText: { color: '#FFFFFF', fontSize: 12 },

  retryBtn: { marginTop: 4 },
  retryText: { color: '#EF4444', fontSize: 11 },

  inputArea: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 12,
    paddingTop: 8,
    gap: 8,
    backgroundColor: 'rgba(0,0,0,0.25)',
  },
  attachBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  input: {
    flex: 1,
    minHeight: 40,
    maxHeight: 110,
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 10,
    color: '#FFFFFF',
    fontSize: 14,
  },
  sendBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#2563EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
