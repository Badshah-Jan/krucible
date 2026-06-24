import { db } from './firebase';
import { 
  collection, 
  addDoc, 
  getDocs, 
  query, 
  orderBy, 
  serverTimestamp,
  onSnapshot,
  doc,
  getDoc,
  updateDoc,
  increment,
  arrayUnion,
  arrayRemove,
  deleteDoc,
} from 'firebase/firestore';
import { PostService } from './postService';
import NotificationService from './notificationService';
import { SecurityService } from './securityService';
import { sanitizeText } from '@/utils/security';

export interface Comment {
  id?: string;
  userId: string;
  userName?: string;
  userAvatar?: string;
  content: string;
  createdAt?: any;

  parentId?: string; // For nested replies
}

export class CommentService {
  /**
   * Adds a comment to a specific post's sub-collection
   */
  static async addComment(postId: string, commentData: Omit<Comment, 'id' | 'createdAt'>): Promise<string> {
    try {
      await SecurityService.enforceRateLimit('comment_create');

      // 1. Add comment to posts/{postId}/comments
      const commentsRef = collection(db, 'posts', postId, 'comments');
      const docRef = await addDoc(commentsRef, {
        ...commentData,
        content: sanitizeText(commentData.content, 2000),
        createdAt: serverTimestamp()
      });

      // 2. Increment the comment count on the parent post
      await PostService.incrementCommentsCount(postId);

      // 3. Notify the post author (fire-and-forget)
      try {
        const postSnap = await getDoc(doc(db, 'posts', postId));
        if (postSnap.exists()) {
          const postData = postSnap.data();
          const postAuthorId = postData.userId;
          // Don't notify if the commenter IS the author
          if (postAuthorId && postAuthorId !== commentData.userId) {
            const commentPreview = commentData.content.length > 100
              ? commentData.content.substring(0, 100) + '…'
              : commentData.content;

            NotificationService.sendInAppNotification(
              postAuthorId,
              `💬 ${commentData.userName} commented`,
              commentPreview,
              'comment',
              { postId, senderId: commentData.userId, senderName: commentData.userName }
            ).catch((e) => console.warn('[CommentService] Notification failed (non-fatal):', e));
          }
        }
      } catch (notifError) {
        console.warn('[CommentService] Comment notification failed (non-fatal):', notifError);
      }

      // ─── NEW: Notify reply parent ─────────────────────────────────────
      if (commentData.parentId) {
        try {
          // Get parent comment
          const parentRef = doc(db, 'posts', postId, 'comments', commentData.parentId);
          const parentSnap = await getDoc(parentRef);
          
          if (parentSnap.exists()) {
            const parentComment = parentSnap.data();
            
            // Don't notify if replying to own comment
            if (parentComment.userId && parentComment.userId !== commentData.userId) {
              const commentPreview = commentData.content.substring(0, 100);
              
              await NotificationService.sendInAppNotification(
                parentComment.userId,
                `💬 ${commentData.userName} replied to your comment`,
                commentPreview,
                'comment_reply',
                {
                  postId,
                  commentId: commentData.parentId,
                  senderId: commentData.userId,
                  senderName: commentData.userName,
                }
              );
            }
          }
        } catch (notifError) {
          console.warn('[CommentService] Reply notification failed:', notifError);
        }
      }
      // ─── END: Reply parent notification ───────────────────────────────

      return docRef.id;
    } catch (error) {
      console.error("Error adding comment:", error);
      throw error;
    }
  }

  /**
   * Fetches comments for a specific post (One-time fetch)
   */
  static async getComments(postId: string): Promise<Comment[]> {
    try {
      const q = query(
        collection(db, 'posts', postId, 'comments'),
        orderBy('createdAt', 'desc') // Newest comments first
      );
      
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map((doc: any) => ({
        id: doc.id,
        ...doc.data()
      })) as Comment[];
    } catch (error) {
      console.error("Error fetching comments:", error);
      throw error;
    }
  }

  /**
   * Subscribes to real-time comment updates for a specific post
   */
  static subscribeToComments(
    postId: string, 
    onUpdate: (comments: Comment[]) => void,
    onError?: (error: any) => void
  ) {
    const q = query(
      collection(db, 'posts', postId, 'comments'),
      orderBy('createdAt', 'asc') // Oldest first for chat-like UI
    );

    return onSnapshot(q, (snapshot: any) => {
      const comments = snapshot.docs.map((doc: any) => ({
        id: doc.id,
        ...doc.data()
      })) as Comment[];
      onUpdate(comments);
    }, onError);
  }


  /**
   * Deletes a comment and decrements the post's comment count
   */
  static async deleteComment(postId: string, commentId: string): Promise<void> {
    try {
      const commentRef = doc(db, 'posts', postId, 'comments', commentId);
      await deleteDoc(commentRef);

      // Decrement the comment count on the parent post
      const postRef = doc(db, 'posts', postId);
      await updateDoc(postRef, {
        commentsCount: increment(-1)
      });
    } catch (error) {
      console.error("Error deleting comment:", error);
      throw error;
    }
  }
}