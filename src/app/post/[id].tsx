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

const T = { bg: '#F7F7F7', card: '#FFFFFF', text: '#222222', textSecondary: '#717171', border: '#EBEBEB', primary: '#FF385C', blue: '#2563EB', green: '#10B981', yellow: '#D97706' };

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


  const handleSendComment = async () => {
    if (newComment.trim().length === 0) return;
    try {
      setIsSubmitting(true);
      const user = AuthService.getCurrentUser();
      if (!user) throw new Error('User not authenticated');
      const userProfile = await UserService.getOwnProfile(user.uid);
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
      setNewComment('');
      setReplyingTo(null);
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'Could not send comment.');
    } finally {
      setIsSubmitting(false);
    }
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
          <Text style={{ marginTop: 16, color: T.textSecondary }}>{t('loading_discussion', 'Loading details...')}</Text>
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
          <Text style={s.headerTitle}>{isEmergency ? 'Emergency Alert' : 'Request Details'}</Text>
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
                <View style={s.authorHeader}>
                  {post.userAvatar ? (
                    <Image source={{ uri: post.userAvatar }} style={s.authorAvatar} />
                  ) : (
                    <View style={[s.authorAvatar, { backgroundColor: '#EBEBEB', alignItems: 'center', justifyContent: 'center' }]}>
                      <Text style={{ color: T.textSecondary, fontWeight: '700', fontSize: 16 }}>{post.userName?.substring(0, 2).toUpperCase() || 'U'}</Text>
                    </View>
                  )}
                  <View style={s.authorInfo}>
                    <Text style={s.authorName}>{post.userName || 'A Neighbor'}</Text>
                    <Text style={s.postTime}>{post.createdAt?.toDate?.()?.toLocaleString?.() || 'Just now'} • {post.distanceLabel || 'Nearby'}</Text>
                  </View>
                </View>
                <Text style={s.title}>{post.title}</Text>
                <Text style={s.desc}>{post.description}</Text>
                <TouchableOpacity style={s.locationStrip} activeOpacity={0.7} onPress={handleOpenMaps}>
                  <Ionicons name="location" size={16} color={T.primary} style={{ marginRight: 8 }} />
                  <Text style={s.locationStripText}>Live location attached (Tap for Maps)</Text>
                </TouchableOpacity>
                {isEmergency && (
                  <View style={s.urgencyStrip}>
                    <Ionicons name="warning" size={16} color={T.yellow} style={{ marginRight: 8 }} />
                    <Text style={s.urgencyStripText}>High urgency · Posted just now</Text>
                  </View>
                )}
                <View style={s.actionRow}>

                  <View style={s.actionBox}>
                    <Ionicons name="list-outline" size={18} color={T.textSecondary} />
                    <Text style={s.actionBoxText}>{postComments.length} Responses</Text>
                  </View>
                  <TouchableOpacity style={[s.actionBox, { backgroundColor: '#F7F7F7', borderColor: 'transparent' }]} onPress={() => Share.share({ message: post.title })}>
                    <Ionicons name="share-outline" size={18} color={T.text} />
                    <Text style={s.actionBoxText}>Share</Text>
                  </TouchableOpacity>
                </View>
                <View style={s.divider} />
                <Text style={s.commentsTitle}>Activity Log ({postComments.length})</Text>
              </View>
            }
            renderItem={({ item }: { item: Comment & { isReply?: boolean } }) => {
              const isMyComment = item.userId === currentUser?.uid;
              return (
                <View style={[s.commentCard, item.isReply && s.replyCard]}>
                  <View style={s.commentHeader}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      {item.userAvatar ? (
                        <Image source={{ uri: item.userAvatar }} style={s.commentAvatar} />
                      ) : (
                        <View style={s.commentAvatar}>
                          <Text style={s.commentAvatarText}>{item.userName?.substring(0, 2).toUpperCase() ?? 'U'}</Text>
                        </View>
                      )}
                      <View style={{ marginLeft: 10 }}>
                        <Text style={s.commentName}>{item.userName}</Text>
                        <Text style={s.commentTime}>{item.createdAt?.toDate?.()?.toLocaleString?.() ?? 'recently'}</Text>
                      </View>
                    </View>
                    <TouchableOpacity onPress={() => isMyComment ? handleDeleteComment(item.id!) : null} hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}>
                      <Ionicons name="ellipsis-horizontal" size={16} color={T.textSecondary} />
                    </TouchableOpacity>
                  </View>
                  <Text style={s.commentText}>{item.content}</Text>
                  <View style={s.commentActions}>
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
                <Ionicons name="document-text-outline" size={40} color="#D1D5DB" />
                <Text style={s.emptyStateText}>{t('no_comments_yet_start_the_conv', 'No responses yet. Be the first to help or share info.')}</Text>
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
                placeholder={replyingTo ? 'Write a follow-up...' : 'Add a response or offer help...'}
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
  root: { flex: 1, backgroundColor: T.bg },
  primaryBtn: { backgroundColor: T.primary, paddingHorizontal: 24, paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  primaryBtnText: { color: '#FFF', fontSize: 16, fontWeight: '600' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: T.card, borderBottomWidth: 1, borderBottomColor: T.border, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  headerBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F7F7F7' },
  headerTitle: { fontSize: 17, fontWeight: '700', color: T.text, letterSpacing: -0.3 },
  scrollContent: { paddingBottom: 120 },
  card: { backgroundColor: T.card, paddingTop: 20, paddingHorizontal: 20, paddingBottom: 8, marginBottom: 8, borderBottomWidth: 8, borderBottomColor: '#F0F0F0' },
  authorHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  authorAvatar: { width: 44, height: 44, borderRadius: 22 },
  authorInfo: { marginLeft: 12 },
  authorName: { fontSize: 16, fontWeight: '700', color: T.text },
  postTime: { fontSize: 13, color: T.textSecondary, marginTop: 2, fontWeight: '500' },
  title: { fontSize: 26, fontWeight: '800', color: T.text, marginBottom: 12, letterSpacing: -0.5 },
  desc: { fontSize: 17, color: T.text, lineHeight: 26, marginBottom: 20, fontWeight: '400' },
  locationStrip: { paddingVertical: 14, paddingHorizontal: 16, backgroundColor: '#F7F7F7', borderRadius: 12, flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  locationStripText: { fontSize: 14, color: T.text, fontWeight: '600' },
  urgencyStrip: { paddingVertical: 14, paddingHorizontal: 16, backgroundColor: '#FFFBEB', borderRadius: 12, flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  urgencyStripText: { fontSize: 14, color: T.yellow, fontWeight: '600' },
  actionRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16, marginTop: 8 },
  actionBox: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, borderRadius: 12, backgroundColor: '#FFF', borderWidth: 1, borderColor: T.border },
  actionBoxText: { fontSize: 14, fontWeight: '600', color: T.text, marginLeft: 8 },
  divider: { height: 1, backgroundColor: T.border, marginHorizontal: -20, marginTop: 8 },
  commentsTitle: { fontSize: 16, fontWeight: '700', color: T.textSecondary, paddingTop: 20, paddingBottom: 12, textTransform: 'uppercase', letterSpacing: 0.5 },
  commentCard: { paddingHorizontal: 20, marginBottom: 20 },
  replyCard: { marginLeft: 48, paddingLeft: 16, borderLeftWidth: 2, borderLeftColor: '#EBEBEB', marginTop: -12 },
  commentHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  commentAvatar: { width: 32, height: 32, borderRadius: 6, backgroundColor: '#EBEBEB', alignItems: 'center', justifyContent: 'center' },
  commentAvatarText: { color: T.textSecondary, fontSize: 13, fontWeight: 'bold' },
  commentName: { fontSize: 14, fontWeight: '700', color: T.text },
  commentTime: { fontSize: 12, color: T.textSecondary, marginTop: 2, fontWeight: '500' },
  commentText: { fontSize: 15, color: T.text, lineHeight: 22, marginBottom: 10, marginLeft: 42 },
  commentActions: { flexDirection: 'row', alignItems: 'center', gap: 24, marginLeft: 42 },
  commentActionBtn: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  commentActionText: { fontSize: 13, fontWeight: '600', color: T.textSecondary },
  emptyState: { padding: 40, alignItems: 'center', justifyContent: 'center' },
  emptyStateText: { fontSize: 16, color: T.textSecondary, marginTop: 12, textAlign: 'center', fontWeight: '500' },
  inputWrapper: { padding: 16, paddingBottom: Platform.OS === 'ios' ? 32 : 16, borderTopWidth: 1, borderTopColor: T.border, backgroundColor: T.card, shadowColor: '#000', shadowOffset: { width: 0, height: -2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 10 },
  replyBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 10, backgroundColor: '#F7F7F7', borderRadius: 12, marginBottom: 12 },
  replyBarText: { fontSize: 13, color: T.textSecondary, fontWeight: '600' },
  inputContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F7F7F7', borderRadius: 24, paddingHorizontal: 16, paddingVertical: 6, borderWidth: 1, borderColor: T.border },
  input: { flex: 1, fontSize: 16, color: T.text, maxHeight: 100, minHeight: 40, paddingVertical: 8 },
  sendBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: T.primary, alignItems: 'center', justifyContent: 'center', marginLeft: 12 },
});