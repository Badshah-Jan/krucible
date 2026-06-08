import { useTranslation } from 'react-i18next';
import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  TouchableOpacity,
  FlatList,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Image,
  Alert,
  Share,
  ActivityIndicator,
  StyleSheet,
  StatusBar,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Text from '@/components/common/Text';
import { PostService, Post } from '@/services/postService';
import { CommentService, Comment } from '@/services/commentService';
import { AuthService } from '@/services/authService';
import { UserService } from '@/services/userService';

const T = { bg: '#F8F9FA', card: '#FFFFFF', text: '#111827', textSecondary: '#6B7280', border: '#E5E7EB', primary: '#EF4444', blue: '#2563EB', green: '#10B981', yellow: '#D97706' };

export default function PostDetailScreen() {
  const { t } = useTranslation();
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [post, setPost] = useState<Post | null>(null);
  const [postComments, setPostComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [newComment, setNewComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [replyingTo, setReplyingTo] = useState<Comment | null>(null);
  const [sortOrder] = useState<'desc' | 'asc'>('desc');
  const currentUser = AuthService.getCurrentUser();

  useEffect(() => {
    if (!id) return;
    const unsubPost = PostService.subscribeToPost(id, (p) => { setPost(p); setLoading(false); });
    const unsubComments = CommentService.subscribeToComments(id, setPostComments);
    return () => { unsubPost(); unsubComments(); };
  }, [id]);

  const threadedComments = useMemo(() => {
    const roots: Comment[] = [];
    const childrenMap: Record<string, Comment[]> = {};
    const sorted = [...postComments].sort((a, b) => {
      const ta = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : 0;
      const tb = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : 0;
      return sortOrder === 'desc' ? tb - ta : ta - tb;
    });
    sorted.forEach(c => {
      if (c.parentId) {
        if (!childrenMap[c.parentId]) childrenMap[c.parentId] = [];
        childrenMap[c.parentId].push(c);
      } else { roots.push(c); }
    });
    const out: (Comment & { isReply?: boolean })[] = [];
    roots.forEach(r => {
      out.push(r);
      if (r.id && childrenMap[r.id]) {
        childrenMap[r.id].sort((a, b) => (a.createdAt?.toDate?.().getTime?.() ?? 0) - (b.createdAt?.toDate?.().getTime?.() ?? 0))
          .forEach(child => out.push({ ...child, isReply: true }));
      }
    });
    return out;
  }, [postComments, sortOrder]);

  const handleToggleLike = async () => {
    if (!currentUser || !post || !id) return;
    const likedByMe = post.likedBy?.includes(currentUser.uid) || false;
    setPost({
      ...post,
      likesCount: likedByMe ? Math.max(0, post.likesCount - 1) : post.likesCount + 1,
      likedBy: likedByMe ? (post.likedBy || []).filter(u => u !== currentUser.uid) : [...(post.likedBy || []), currentUser.uid],
    });
    try { await PostService.toggleLike(id, currentUser.uid); }
    catch (error) { console.error(error); setPost(post); }
  };

  const handleSendComment = async () => {
    if (newComment.trim().length === 0) return;
    try {
      setIsSubmitting(true);
      const user = AuthService.getCurrentUser();
      if (!user) throw new Error('User not authenticated');
      const userProfile = await UserService.getUser(user.uid);
      if (!userProfile) throw new Error('User profile not found');
      const commentPayload: any = {
        userId: user.uid,
        userName: userProfile.name,
        userAvatar: userProfile.photoURL,
        content: newComment.trim(),
      };
      if (replyingTo?.id) {
        commentPayload.parentId = replyingTo.id;
      }
      await CommentService.addComment(id, commentPayload);
      await UserService.incrementKarma(user.uid, 2);
      setNewComment('');
      setReplyingTo(null);
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'Could not send comment.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleCommentLike = async (commentId: string) => {
    if (!currentUser || !id) return;
    try { await CommentService.toggleCommentLike(id, commentId, currentUser.uid); }
    catch (e) { console.error(e); }
  };

  const handleDeleteComment = (commentId: string) => {
    if (!id) return;
    Alert.alert('Delete Comment', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        try { await CommentService.deleteComment(id, commentId); }
        catch (e) { Alert.alert('Error', 'Failed to delete comment'); }
      }}
    ]);
  };

  const handleOpenMaps = () => {
    if (post && post.latitude && post.longitude) {
      const url = Platform.select({
        ios: `maps:0,0?q=${post.latitude},${post.longitude}`,
        android: `geo:0,0?q=${post.latitude},${post.longitude}`,
        default: `https://www.google.com/maps/search/?api=1&query=${post.latitude},${post.longitude}`,
      }) as string;
      Linking.openURL(url).catch(() => Alert.alert('Error', 'Could not open maps.'));
    } else {
      Alert.alert('No Location', 'This post does not have a valid location attached.');
    }
  };

  if (loading) {
    return (
      <View style={s.root}>
        <SafeAreaView style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={T.primary} />
          <Text style={{ marginTop: 16, color: T.textSecondary }}>{t('loading_discussion', 'Loading discussion...')}</Text>
        </SafeAreaView>
      </View>
    );
  }

  if (!post) {
    return (
      <View style={s.root}>
        <SafeAreaView style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <Text style={{ fontSize: 20, fontWeight: '800', color: T.text, marginBottom: 16 }}>{t('post_not_found', 'Post Not Found')}</Text>
          <TouchableOpacity onPress={() => router.back()} style={s.primaryBtn}>
            <Text style={s.primaryBtnText}>{t('go_back', 'Go Back')}</Text>
          </TouchableOpacity>
        </SafeAreaView>
      </View>
    );
  }

  const isEmergency = post.category?.toLowerCase() === 'emergency';

  return (
    <View style={s.root}>
      <StatusBar barStyle="dark-content" backgroundColor={T.bg} />
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <View style={s.header}>
          <TouchableOpacity onPress={() => router.back()} style={s.headerBtn} activeOpacity={0.8}>
            <Ionicons name="arrow-back" size={20} color={T.text} />
          </TouchableOpacity>
          <Text style={s.headerTitle}>{t('discussion', 'Discussion')}</Text>
          <TouchableOpacity style={s.headerBtn} activeOpacity={0.8} onPress={() => Share.share({ message: post.title })}>
            <Ionicons name="ellipsis-horizontal" size={20} color={T.text} />
          </TouchableOpacity>
        </View>

        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
          style={{ flex: 1 }}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 25}
        >
          <FlatList
            data={threadedComments}
            keyExtractor={(item: any) => item.id!}
            contentContainerStyle={s.scrollContent}
            keyboardShouldPersistTaps="handled"
            ListHeaderComponent={
              <View style={s.card}>
                <Text style={s.title}>{post.title}</Text>
                <Text style={s.desc}>{post.description}</Text>
                {/* Bug fix: Post type has no `distance` field. Use `distanceLabel`. */}
                <Text style={s.metaText}>{post.distanceLabel || 'Nearby'}</Text>
                <TouchableOpacity style={s.locationStrip} activeOpacity={0.7} onPress={handleOpenMaps}>
                  <Text style={s.locationStripText}>Live location attached (Tap for Maps)</Text>
                </TouchableOpacity>
                {isEmergency && (
                  <View style={s.urgencyStrip}>
                    <Text style={s.urgencyStripText}>High urgency · Posted just now</Text>
                  </View>
                )}
                <View style={s.actionRow}>
                  <TouchableOpacity style={s.actionBox} onPress={handleToggleLike}>
                    <Ionicons name="heart-outline" size={18} color={T.textSecondary} />
                    <Text style={s.actionBoxText}>{post.likesCount || 0}</Text>
                  </TouchableOpacity>
                  <View style={s.actionBox}>
                    <Ionicons name="chatbubble-outline" size={18} color={T.textSecondary} />
                    <Text style={s.actionBoxText}>{postComments.length}</Text>
                  </View>
                  <TouchableOpacity style={s.actionBox} onPress={() => Share.share({ message: post.title })}>
                    <Ionicons name="share-social-outline" size={18} color={T.textSecondary} />
                    <Text style={s.actionBoxText}>Share</Text>
                  </TouchableOpacity>
                </View>
                <Text style={s.commentsTitle}>Comments ({postComments.length})</Text>
              </View>
            }
            renderItem={({ item }: { item: Comment & { isReply?: boolean } }) => {
              const isLiked = item.likedBy?.includes(currentUser?.uid || '');
              const isMyComment = item.userId === currentUser?.uid;
              return (
                <View style={[s.commentCard, item.isReply && { marginLeft: 46, paddingLeft: 12, borderLeftWidth: 2, borderLeftColor: '#F3F4F6' }]}>
                  <View style={s.commentHeader}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <View style={s.commentAvatar}>
                        <Text style={s.commentAvatarText}>{item.userName?.substring(0, 2).toUpperCase() ?? 'U'}</Text>
                      </View>
                      <View style={{ marginLeft: 10 }}>
                        <Text style={s.commentName}>{item.userName}</Text>
                        <Text style={s.commentTime}>{item.createdAt?.toDate?.()?.toLocaleString?.() ?? 'recently'}</Text>
                      </View>
                    </View>
                    <TouchableOpacity onPress={() => isMyComment ? handleDeleteComment(item.id!) : null}>
                      <Ionicons name="ellipsis-horizontal" size={14} color={T.textSecondary} />
                    </TouchableOpacity>
                  </View>
                  <Text style={s.commentText}>{item.content}</Text>
                  <View style={s.commentActions}>
                    <TouchableOpacity style={s.commentActionBtn} onPress={() => handleToggleCommentLike(item.id!)}>
                      <Ionicons name={isLiked ? 'heart' : 'heart-outline'} size={14} color={isLiked ? T.primary : T.textSecondary} />
                      <Text style={[s.commentActionText, isLiked && { color: T.primary }]}>{item.likesCount || 0}</Text>
                    </TouchableOpacity>
                    {!item.isReply && (
                      <TouchableOpacity style={s.commentActionBtn} onPress={() => setReplyingTo(item)}>
                        <Text style={s.commentActionText}>Reply</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              );
            }}
            ListEmptyComponent={
              <View style={s.emptyState}>
                <Ionicons name="chatbubbles-outline" size={40} color="#D1D5DB" />
                <Text style={s.emptyStateText}>{t('no_comments_yet_start_the_conv', 'No comments yet. Start the conversation!')}</Text>
              </View>
            }
          />

          <View style={s.inputWrapper}>
            {replyingTo && (
              <View style={s.replyBar}>
                <Text style={s.replyBarText}>Replying to {replyingTo.userName}</Text>
                <TouchableOpacity onPress={() => setReplyingTo(null)} hitSlop={10}>
                  <Ionicons name="close-circle" size={16} color={T.textSecondary} />
                </TouchableOpacity>
              </View>
            )}
            <View style={s.inputContainer}>
              <TextInput
                value={newComment}
                onChangeText={setNewComment}
                placeholder={replyingTo ? 'Write a reply...' : 'Add a comment...'}
                placeholderTextColor="#9CA3AF"
                style={s.input}
                editable={!isSubmitting}
                onSubmitEditing={handleSendComment}
                returnKeyType="send"
              />
              <TouchableOpacity style={s.sendBtn} onPress={handleSendComment} disabled={isSubmitting}>
                <Ionicons name="send" size={16} color="#FFF" />
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#FFFFFF' },
  primaryBtn: { backgroundColor: T.primary, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12 },
  primaryBtnText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  headerBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 16, fontWeight: '700', color: T.text },
  scrollContent: { paddingBottom: 100 },
  card: { backgroundColor: '#FFFFFF', padding: 16, marginBottom: 8, borderBottomWidth: 4, borderBottomColor: '#F3F4F6' },
  title: { fontSize: 22, fontWeight: '800', color: T.text, marginBottom: 8 },
  desc: { fontSize: 15, color: T.textSecondary, lineHeight: 22, marginBottom: 16 },
  metaText: { fontSize: 12, color: T.textSecondary, fontWeight: '500', marginBottom: 8 },
  locationStrip: { paddingVertical: 12, borderTopWidth: 1, borderTopColor: '#FEF2F2', borderBottomWidth: 1, borderBottomColor: '#FEF2F2', marginBottom: 8 },
  locationStripText: { fontSize: 13, color: T.primary, fontWeight: '600' },
  urgencyStrip: { paddingVertical: 10, paddingHorizontal: 12, backgroundColor: '#FFFBEB', marginBottom: 16 },
  urgencyStripText: { fontSize: 13, color: T.yellow, fontWeight: '600' },
  actionRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 },
  actionBox: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 10, borderRadius: 12, borderWidth: 1, borderColor: '#F3F4F6' },
  actionBoxText: { fontSize: 13, fontWeight: '600', color: '#6B7280', marginLeft: 6 },
  commentsTitle: { fontSize: 18, fontWeight: '800', color: T.text, paddingHorizontal: 16 },
  commentCard: { paddingHorizontal: 16, marginBottom: 20 },
  commentHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  commentAvatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#9CA3AF', alignItems: 'center', justifyContent: 'center' },
  commentAvatarText: { color: '#FFF', fontSize: 12, fontWeight: 'bold' },
  commentName: { fontSize: 14, fontWeight: '700', color: T.text },
  commentTime: { fontSize: 12, color: '#9CA3AF', marginTop: 2 },
  commentText: { fontSize: 15, color: '#111827', lineHeight: 22, marginBottom: 10, marginLeft: 46 },
  commentActions: { flexDirection: 'row', alignItems: 'center', gap: 16, marginLeft: 46 },
  commentActionBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  commentActionText: { fontSize: 13, fontWeight: '600', color: T.textSecondary },
  emptyState: { padding: 40, alignItems: 'center', justifyContent: 'center' },
  emptyStateText: { fontSize: 15, color: T.textSecondary, marginTop: 12, textAlign: 'center' },
  inputWrapper: { padding: 12, borderTopWidth: 1, borderTopColor: '#F3F4F6', backgroundColor: '#FFFFFF' },
  replyBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, paddingVertical: 8, backgroundColor: '#F3F4F6', borderRadius: 8, marginBottom: 8 },
  replyBarText: { fontSize: 12, color: T.textSecondary, fontWeight: '500' },
  inputContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F3F4F6', borderRadius: 24, paddingHorizontal: 16, paddingVertical: 8 },
  input: { flex: 1, fontSize: 15, color: T.text, maxHeight: 100, minHeight: 36, paddingVertical: 8 },
  sendBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: T.primary, alignItems: 'center', justifyContent: 'center', marginLeft: 8 },
});