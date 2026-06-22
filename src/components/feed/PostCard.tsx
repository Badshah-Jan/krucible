import { AuthService } from "@/services/authService";
import { Post as FirestorePost, PostService } from "@/services/postService";
import { UserService } from "@/services/userService";
import { Colors } from "@/constants/colors";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import React from "react";
import {
  Alert,
  Modal,
  Pressable,
  Share,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

interface PostCardProps {
  post: FirestorePost | any;
  onPress?: () => void;
  onLikePress?: () => void;
  onCommentPress?: () => void;
}

// Category config — color + emoji
const CATEGORY_CONFIG: Record<string, { color: string; bg: string; emoji: string; label: string }> = {
  emergency: { color: Colors.danger, bg: Colors.dangerLight, emoji: "🚨", label: "Emergency" },
  help:       { color: "#D97706", bg: "#FEF3C7", emoji: "🤝", label: "Help" },
  lost_found: { color: "#2563EB", bg: "#EFF6FF", emoji: "🔍", label: "Lost & Found" },
  "lost & found": { color: "#2563EB", bg: "#EFF6FF", emoji: "🔍", label: "Lost & Found" },
  recommendations: { color: Colors.primary, bg: Colors.primaryLight, emoji: "⭐", label: "Recommend" },
  services:   { color: "#7C3AED", bg: "#F5F3FF", emoji: "🔧", label: "Services" },
  general:    { color: Colors.textSecondary, bg: Colors.surface, emoji: "💬", label: "General" },
};

function getCatConfig(cat: string) {
  const key = cat?.toLowerCase();
  return (
    CATEGORY_CONFIG[key] ||
    CATEGORY_CONFIG["general"]
  );
}

const PostCard = ({
  post,
  onPress,
  onLikePress,
  onCommentPress,
}: PostCardProps) => {
  const [isEditing, setIsEditing] = React.useState(false);
  const [isOptionsVisible, setIsOptionsVisible] = React.useState(false);
  const [editTitle, setEditTitle] = React.useState(post.title || "");
  const [editDescription, setEditDescription] = React.useState(post.description || "");

  const [authorAvatar, setAuthorAvatar] = React.useState(post.userAvatar);
  const [authorName, setAuthorName] = React.useState(post.userName);

  React.useEffect(() => {
    if (post.userAvatar) setAuthorAvatar(post.userAvatar);
    if (post.userName) setAuthorName(post.userName);
    if (post.userId) {
      UserService.getUser(post.userId)
        .then((u) => {
          if (u?.photoURL) setAuthorAvatar(u.photoURL);
          if (u?.name) setAuthorName(u.name);
        })
        .catch(() => {});
    }
  }, [post.userId, post.userAvatar, post.userName]);

  const currentUser = AuthService.getCurrentUser();
  const isOwner = currentUser?.uid === post.userId;
  const catConfig = getCatConfig(post.category);
  const isEmergency = post.category?.toLowerCase() === "emergency" || post.isSos;

  const handleUpdate = async () => {
    if (!editTitle.trim() || !editDescription.trim()) return;
    try {
      await PostService.updatePost(post.id, {
        title: editTitle,
        description: editDescription,
      });
      setIsEditing(false);
    } catch {
      Alert.alert("Error", "Failed to update post");
    }
  };

  const avatarUri =
    authorAvatar ||
    `https://ui-avatars.com/api/?name=${encodeURIComponent(authorName || "N")}&background=E8F5F0&color=1A6B4A&bold=true&size=80`;

  return (
    <View style={[styles.card, isEmergency && styles.cardEmergency]}>
      {isEmergency && <View style={styles.emergencyBar} />}

      <TouchableOpacity activeOpacity={0.95} onPress={onPress}>
        {/* ── Header ── */}
        <View style={styles.header}>
          <Image
            source={{ uri: avatarUri }}
            style={styles.avatar}
            contentFit="cover"
            transition={200}
          />
          <View style={styles.headerMeta}>
            <Text style={styles.authorName} numberOfLines={1}>
              {authorName || "Neighbour"}
            </Text>
            <Text style={styles.metaLine} numberOfLines={1}>
              {[post.distance, post.timePosted || "Just now"].filter(Boolean).join(" · ")}
            </Text>
          </View>
          <View style={styles.headerRight}>
            <View style={[styles.catBadge, { backgroundColor: catConfig.bg }]}>
              <Text style={[styles.catText, { color: catConfig.color }]}>
                {catConfig.emoji} {catConfig.label}
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => setIsOptionsVisible(true)}
              hitSlop={12}
              style={styles.moreBtn}
            >
              <Ionicons name="ellipsis-horizontal" size={16} color={Colors.textSecondary} />
            </TouchableOpacity>
          </View>
        </View>

        {/* ── Content ── */}
        <View style={styles.body}>
          {!!post.imageUrl && (
            <Image
              source={{ uri: post.imageUrl }}
              style={styles.image}
              contentFit="cover"
              transition={200}
            />
          )}
          {!!post.title && (
            <Text style={styles.title} numberOfLines={2}>{post.title}</Text>
          )}
          <Text style={styles.description} numberOfLines={3}>
            {post.description}
          </Text>
        </View>
      </TouchableOpacity>

      {/* ── Divider ── */}
      <View style={styles.divider} />

      {/* ── Footer ── */}
      <View style={styles.footer}>
        <View style={styles.actions}>
          {!post.isSos && (
            <TouchableOpacity style={styles.actionBtn} onPress={onLikePress} hitSlop={8}>
              <Ionicons
                name={post.likedByMe ? "heart" : "heart-outline"}
                size={19}
                color={post.likedByMe ? Colors.danger : Colors.textSecondary}
              />
              {post.likes > 0 && (
                <Text style={[styles.actionCount, post.likedByMe && { color: Colors.danger }]}>
                  {post.likes}
                </Text>
              )}
            </TouchableOpacity>
          )}
          <TouchableOpacity style={styles.actionBtn} onPress={onCommentPress} hitSlop={8}>
            <Ionicons name="chatbubble-outline" size={18} color={Colors.textSecondary} />
            {post.commentsCount > 0 && (
              <Text style={styles.actionCount}>{post.commentsCount}</Text>
            )}
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => Share.share({ message: post.title || post.description || "" })}
            hitSlop={8}
          >
            <Ionicons name="arrow-redo-outline" size={18} color={Colors.textSecondary} />
          </TouchableOpacity>
        </View>

        {isEmergency && (
          <TouchableOpacity style={styles.respondBtn} onPress={onPress} activeOpacity={0.85}>
            <Text style={styles.respondText}>Respond →</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* ── Options Sheet ── */}
      <Modal
        visible={isOptionsVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setIsOptionsVisible(false)}
      >
        <Pressable style={styles.sheetOverlay} onPress={() => setIsOptionsVisible(false)}>
          <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>Post Options</Text>
            {isOwner ? (
              <>
                <TouchableOpacity
                  onPress={() => { setIsOptionsVisible(false); setIsEditing(true); }}
                  style={styles.sheetRow}
                >
                  <View style={styles.sheetIconWrap}>
                    <Ionicons name="pencil-outline" size={18} color={Colors.text} />
                  </View>
                  <Text style={styles.sheetRowText}>Edit Post</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => {
                    setIsOptionsVisible(false);
                    Alert.alert("Delete Post", "This cannot be undone.", [
                      { text: "Cancel", style: "cancel" },
                      { text: "Delete", style: "destructive", onPress: () => PostService.deletePost(post.id) },
                    ]);
                  }}
                  style={[styles.sheetRow, { borderBottomWidth: 0 }]}
                >
                  <View style={[styles.sheetIconWrap, { backgroundColor: Colors.dangerLight }]}>
                    <Ionicons name="trash-outline" size={18} color={Colors.danger} />
                  </View>
                  <Text style={[styles.sheetRowText, { color: Colors.danger }]}>Delete Post</Text>
                </TouchableOpacity>
              </>
            ) : (
              <TouchableOpacity
                onPress={() => {
                  setIsOptionsVisible(false);
                  Alert.alert("Reported", "Thank you for keeping the community safe.");
                }}
                style={[styles.sheetRow, { borderBottomWidth: 0 }]}
              >
                <View style={[styles.sheetIconWrap, { backgroundColor: Colors.dangerLight }]}>
                  <Ionicons name="flag-outline" size={18} color={Colors.danger} />
                </View>
                <Text style={[styles.sheetRowText, { color: Colors.danger }]}>Report Post</Text>
              </TouchableOpacity>
            )}
          </Pressable>
        </Pressable>
      </Modal>

      {/* ── Edit Modal ── */}
      <Modal visible={isEditing} transparent animationType="fade">
        <View style={styles.editOverlay}>
          <View style={styles.editCard}>
            <Text style={styles.editTitle}>Edit Post</Text>
            <TextInput
              value={editTitle}
              onChangeText={setEditTitle}
              style={styles.editInput}
              placeholder="Title"
              placeholderTextColor={Colors.textTertiary}
            />
            <TextInput
              value={editDescription}
              onChangeText={setEditDescription}
              style={[styles.editInput, { height: 100, textAlignVertical: "top" }]}
              placeholder="Description"
              placeholderTextColor={Colors.textTertiary}
              multiline
            />
            <View style={styles.editActions}>
              <TouchableOpacity onPress={() => setIsEditing(false)} style={styles.editCancelBtn}>
                <Text style={styles.editCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleUpdate} style={styles.editSaveBtn}>
                <Text style={styles.editSaveText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.card,
    borderRadius: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: "hidden",
  },
  cardEmergency: {
    borderLeftWidth: 4,
    borderLeftColor: Colors.danger,
  },
  emergencyBar: {
    height: 0,
    width: 0,
  },

  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 8,
    gap: 8,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.surface,
    flexShrink: 0,
  },
  headerMeta: { flex: 1 },
  authorName: {
    fontSize: 13,
    fontWeight: "600",
    color: Colors.text,
  },
  metaLine: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 1,
    fontWeight: "400",
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flexShrink: 0,
  },
  catBadge: {
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
  },
  catText: {
    fontSize: 9,
    fontWeight: "600",
  },
  moreBtn: {
    width: 28,
    height: 28,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 14,
  },

  body: {
    paddingHorizontal: 12,
    paddingBottom: 10,
  },
  image: {
    width: "100%",
    height: 180,
    borderRadius: 8,
    marginBottom: 8,
    backgroundColor: Colors.surface,
  },
  title: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.text,
    marginBottom: 4,
    lineHeight: 19,
  },
  description: {
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 18,
    fontWeight: "400",
  },

  divider: { height: 1, backgroundColor: Colors.border, marginHorizontal: 12 },

  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  actions: { flexDirection: "row", alignItems: "center", gap: 16 },
  actionBtn: { flexDirection: "row", alignItems: "center", gap: 4 },
  actionCount: {
    fontSize: 12,
    fontWeight: "500",
    color: Colors.textSecondary,
  },
  respondBtn: {
    backgroundColor: Colors.danger,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  respondText: { color: "#FFFFFF", fontSize: 11, fontWeight: "600" },

  // Bottom Sheet
  sheetOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 40,
  },
  sheetHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.border,
    alignSelf: "center",
    marginBottom: 18,
  },
  sheetTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: Colors.text,
    marginBottom: 14,
    letterSpacing: -0.3,
  },
  sheetRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 13,
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
    gap: 12,
  },
  sheetIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: Colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  sheetRowText: { fontSize: 15, fontWeight: "600", color: Colors.text },

  // Edit Modal
  editOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "center",
    padding: 20,
  },
  editCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 22,
  },
  editTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: Colors.text,
    marginBottom: 16,
  },
  editInput: {
    backgroundColor: Colors.surface,
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: Colors.text,
    marginBottom: 12,
    fontWeight: "500",
  },
  editActions: { flexDirection: "row", justifyContent: "flex-end", gap: 10, marginTop: 4 },
  editCancelBtn: { paddingVertical: 9, paddingHorizontal: 14 },
  editCancelText: { fontSize: 14, fontWeight: "600", color: Colors.textSecondary },
  editSaveBtn: {
    backgroundColor: Colors.primary,
    paddingVertical: 9,
    paddingHorizontal: 18,
    borderRadius: 10,
  },
  editSaveText: { color: "#FFFFFF", fontSize: 14, fontWeight: "700" },
});

export default React.memo(PostCard, (prev, next) => {
  if (prev.post.id !== next.post.id) return false;
  if (prev.post.likes !== next.post.likes) return false;
  if (prev.post.commentsCount !== next.post.commentsCount) return false;
  if (prev.post.likedByMe !== next.post.likedByMe) return false;
  if (prev.post.title !== next.post.title) return false;
  if (prev.post.description !== next.post.description) return false;
  return true;
});
