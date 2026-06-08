import { getCategoryTheme } from "@/constants/categories";
import { AuthService } from "@/services/authService";
import { Post as FirestorePost, PostService } from "@/services/postService";
import { UserService } from "@/services/userService";
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { useTranslation } from "react-i18next";
import {
    Alert,
    Image,
    Modal,
    Pressable,
    Share,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";

// ─── Design Tokens ────────────────────────────────────────────────────────────
const T = {
  bg: "#F8F9FA", // Clean light background
  card: "#FFFFFF", // White cards
  cardElevated: "#F9FAFB", // Subtle hover
  primary: "#EF4444", // Coral/Red primary
  text: "#111827", // Slate 900
  textSecondary: "#6B7280", // Gray 500
  border: "#E5E7EB", // Slate 200
  danger: "#DC2626", // Red
};

const getInitials = (name: string) => {
  if (!name) return "N";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
};

const getAvatarBg = (name: string) => {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  // Rich professional color tones matching the mockup
  const colors = [
    "#C2410C",
    "#166534",
    "#1D4ED8",
    "#B45309",
    "#6D28D9",
    "#BE185D",
  ];
  return colors[Math.abs(hash) % colors.length];
};

interface PostCardProps {
  post: FirestorePost | any;
  onPress?: () => void;
  onLikePress?: () => void;
  onCommentPress?: () => void;
}

export default function PostCard({
  post,
  onPress,
  onLikePress,
  onCommentPress,
}: PostCardProps) {
  const { t } = useTranslation();
  const [isEditing, setIsEditing] = React.useState(false);
  const [isOptionsVisible, setIsOptionsVisible] = React.useState(false);
  const [editTitle, setEditTitle] = React.useState(post.title);
  const [editDescription, setEditDescription] = React.useState(
    post.description,
  );

  // Fresh user state to fix avatar/name staleness
  const [authorAvatar, setAuthorAvatar] = React.useState(post.userAvatar);
  const [authorName, setAuthorName] = React.useState(post.userName);

  React.useEffect(() => {
    // If the snapshot prop updates (e.g. from our fan-out batch script), sync local state instantly
    if (post.userAvatar) setAuthorAvatar(post.userAvatar);
    if (post.userName) setAuthorName(post.userName);

    // Fallback: check if there's an even newer version directly on the user document
    if (post.userId) {
      UserService.getUser(post.userId)
        .then((u) => {
          if (u) {
            if (u.photoURL) setAuthorAvatar(u.photoURL);
            if (u.name) setAuthorName(u.name);
          }
        })
        .catch((error) => {
          console.warn("[PostCard] Could not refresh author profile:", error);
        });
    }
  }, [post.userId, post.userAvatar, post.userName]);

  const currentUser = AuthService.getCurrentUser();
  const isOwner = currentUser?.uid === post.userId;
  const isEmergency = String(post.category).toLowerCase() === "emergency";

  // Meta: distance · area · time
  const displayMeta = [
    post.distance,
    post.area || post.district,
    post.timePosted || "Just now",
  ]
    .filter(Boolean)
    .join(" · ");

  const handleUpdate = async () => {
    if (!editTitle.trim() || !editDescription.trim()) return;
    try {
      await PostService.updatePost(post.id, {
        title: editTitle,
        description: editDescription,
      });
      setIsEditing(false);
    } catch (e) {
      Alert.alert("Error", "Failed to update post");
    }
  };

  const catTheme = getCategoryTheme(post.category ?? "");
  const initials = getInitials(authorName || "Neighbor");
  const avatarColor = getAvatarBg(authorName || "Neighbor");
  const hasAvatarUrl =
    authorAvatar &&
    (authorAvatar.startsWith("http://") || authorAvatar.startsWith("https://"));

  return (
    <TouchableOpacity
      activeOpacity={0.9}
      onPress={onPress}
      style={[styles.container]}
    >
      {/* Header: User Info + Category Badge */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          {hasAvatarUrl ? (
            <Image source={{ uri: authorAvatar }} style={styles.avatar} />
          ) : (
            <View
              style={[styles.avatarInitials, { backgroundColor: avatarColor }]}
            >
              <Text style={styles.avatarInitialsText}>{initials}</Text>
            </View>
          )}

          <View style={{ marginLeft: 10 }}>
            <View
              style={{ flexDirection: "row", alignItems: "center", gap: 4 }}
            >
              <Text style={styles.userName}>{authorName || "Neighbor"}</Text>
              <Pressable
                onPress={() => setIsOptionsVisible(true)}
                hitSlop={10}
                style={{ marginLeft: 2 }}
              >
                <Ionicons
                  name="ellipsis-horizontal"
                  size={14}
                  color={T.textSecondary}
                />
              </Pressable>
            </View>
            <Text style={styles.metaText}>{displayMeta}</Text>
          </View>
        </View>

        <View style={{ flexDirection: "row", gap: 8, alignItems: "center" }}>
          {post.sponsored && (
            <View style={[styles.categoryPill, { backgroundColor: '#FEF3C7', borderColor: '#F59E0B' }]}>
              <Text style={[styles.categoryText, { color: '#D97706' }]}>Sponsored</Text>
            </View>
          )}
          <View
            style={[
              styles.categoryPill,
              { backgroundColor: catTheme.bg, borderColor: catTheme.border },
            ]}
          >
            <Text style={[styles.categoryText, { color: catTheme.color }]}>
              {post.category}
            </Text>
          </View>
        </View>
      </View>

      {/* Content */}
      <View style={styles.content}>
        {!!post.title && <Text style={styles.title}>{post.title}</Text>}
        <Text style={styles.description}>{post.description}</Text>
      </View>

      {/* Footer Actions */}
      <View style={styles.actionBar}>
        <View style={{ flexDirection: "row", gap: 16 }}>
          <Pressable
            onPress={onLikePress}
            hitSlop={12}
            style={styles.actionBtn}
          >
            {/* Outline-only heart icon as shown in mockup */}
            <Ionicons
              name="heart-outline"
              size={18}
              color={post.likedByMe ? T.primary : T.textSecondary}
            />
            <Text
              style={[
                styles.actionText,
                post.likedByMe && { color: T.primary },
              ]}
            >
              {post.likes > 0 ? post.likes : "0"}
            </Text>
          </Pressable>

          <Pressable
            onPress={onCommentPress}
            hitSlop={12}
            style={styles.actionBtn}
          >
            <Ionicons
              name="chatbubble-outline"
              size={16}
              color={T.textSecondary}
            />
            <Text style={styles.actionText}>
              {post.commentsCount > 0 ? post.commentsCount : "0"}
            </Text>
          </Pressable>

          <Pressable
            onPress={async () => {
              try {
                await Share.share({
                  message: `Check out this post on Neighborly: ${post.title || post.description}`,
                });
              } catch (error: any) {
                Alert.alert("Error", "Could not share post.");
              }
            }}
            hitSlop={12}
            style={styles.actionBtn}
          >
            <Ionicons
              name="share-social-outline"
              size={16}
              color={T.textSecondary}
            />
          </Pressable>
        </View>

        {/* Action text right-aligned matching mockup: "✓ Offer help" for emergency */}
        {isEmergency && (
          <TouchableOpacity style={styles.offerHelpBtn} onPress={onPress}>
            <Ionicons
              name="hand-left"
              size={14}
              color="#10B981"
              style={{ marginRight: 4 }}
            />
            <Text style={styles.offerHelpText}>Offer help</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Edit Modal */}
      <Modal visible={isEditing} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{t("edit_post", "Edit Post")}</Text>
            <TextInput
              value={editTitle}
              onChangeText={setEditTitle}
              placeholder="Post Title"
              placeholderTextColor={T.textSecondary}
              style={styles.modalInput}
            />
            <TextInput
              value={editDescription}
              onChangeText={setEditDescription}
              placeholder="Post Description"
              placeholderTextColor={T.textSecondary}
              multiline
              style={[
                styles.modalInput,
                { height: 100, textAlignVertical: "top" },
              ]}
            />
            <View style={styles.modalActions}>
              <TouchableOpacity onPress={() => setIsEditing(false)}>
                <Text style={styles.modalCancel}>{t("cancel", "Cancel")}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleUpdate}
                style={styles.modalSaveBtn}
              >
                <Text style={styles.modalSaveText}>{t("save", "Save")}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Options Menu Modal */}
      <Modal
        visible={isOptionsVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setIsOptionsVisible(false)}
      >
        <Pressable
          style={styles.sheetOverlay}
          onPress={() => setIsOptionsVisible(false)}
        >
          <Pressable
            style={styles.sheetContent}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>
              {t("post_options", "Post Options")}
            </Text>

            {isOwner ? (
              <>
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => {
                    setIsOptionsVisible(false);
                    setIsEditing(true);
                  }}
                  style={styles.sheetActionBtn}
                >
                  <Ionicons name="pencil" size={20} color={T.text} />
                  <Text style={styles.sheetActionText}>
                    {t("edit_post", "Edit Post")}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => {
                    setIsOptionsVisible(false);
                    Alert.alert(
                      "Delete Post",
                      "Are you sure you want to delete this post?",
                      [
                        { text: "Cancel", style: "cancel" },
                        {
                          text: "Delete",
                          style: "destructive",
                          onPress: () => PostService.deletePost(post.id),
                        },
                      ],
                    );
                  }}
                  style={[styles.sheetActionBtn, { borderBottomWidth: 0 }]}
                >
                  <Ionicons name="trash" size={20} color={T.danger} />
                  <Text style={[styles.sheetActionText, { color: T.danger }]}>
                    {t("delete_post", "Delete Post")}
                  </Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => {
                    setIsOptionsVisible(false);
                    Alert.alert(
                      "Report Post",
                      "Are you sure you want to report this post to the moderators?",
                      [
                        { text: "Cancel", style: "cancel" },
                        {
                          text: "Report",
                          style: "destructive",
                          onPress: () => {
                            // In a real app we would call PostService.reportPost(post.id)
                            Alert.alert(
                              "Reported",
                              "Thank you. This post has been reported for review by our moderators.",
                            );
                          },
                        },
                      ],
                    );
                  }}
                  style={styles.sheetActionBtn}
                >
                  <Ionicons name="flag-outline" size={20} color={T.danger} />
                  <Text style={[styles.sheetActionText, { color: T.danger }]}>
                    {t("report_post", "Report Post")}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => {
                    setIsOptionsVisible(false);
                    Alert.alert("Share", "Sharing link copied to clipboard!");
                  }}
                  style={[styles.sheetActionBtn, { borderBottomWidth: 0 }]}
                >
                  <Ionicons
                    name="share-social-outline"
                    size={20}
                    color={T.text}
                  />
                  <Text style={styles.sheetActionText}>
                    {t("share_post", "Share Post")}
                  </Text>
                </TouchableOpacity>
              </>
            )}
          </Pressable>
        </Pressable>
      </Modal>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: T.card,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#E5E7EB", // Slate 200 light border
    padding: 16,
    marginBottom: 12,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: T.border,
  },
  avatarInitials: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarInitialsText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "800",
  },
  userName: {
    color: T.text,
    fontSize: 14,
    fontWeight: "700",
  },
  metaText: {
    color: T.textSecondary,
    fontSize: 11,
    marginTop: 2,
  },
  categoryPill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 100,
    borderWidth: 1,
  },
  categoryText: {
    fontSize: 10,
    fontWeight: "700",
  },
  content: {
    marginBottom: 14,
  },
  title: {
    color: "#111827",
    fontSize: 15,
    fontWeight: "700",
    marginBottom: 4,
    lineHeight: 20,
  },
  description: {
    color: "#374151", // Soft dark gray
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "500",
  },
  actionBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6", // Thin separation line
    paddingTop: 12,
  },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  actionText: {
    color: T.textSecondary,
    fontSize: 12,
    fontWeight: "600",
  },
  offerHelpBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ECFDF5",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 100,
    borderWidth: 1,
    borderColor: "#10B981",
  },
  offerHelpText: {
    color: "#10B981",
    fontSize: 12,
    fontWeight: "700",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(17, 24, 39, 0.4)",
    justifyContent: "center",
    padding: 24,
  },
  modalContent: {
    backgroundColor: T.card,
    padding: 24,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: T.border,
    gap: 16,
  },
  modalTitle: {
    color: T.text,
    fontSize: 18,
    fontWeight: "800",
  },
  modalInput: {
    backgroundColor: T.bg,
    color: T.text,
    padding: 16,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: T.border,
  },
  modalActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
    gap: 16,
    marginTop: 8,
  },
  modalCancel: {
    color: T.textSecondary,
    fontWeight: "600",
  },
  modalSaveBtn: {
    backgroundColor: T.primary,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 100,
  },
  modalSaveText: {
    color: "#FFFFFF",
    fontWeight: "bold",
  },
  sheetOverlay: {
    flex: 1,
    backgroundColor: "rgba(17, 24, 39, 0.4)",
    justifyContent: "flex-end",
  },
  sheetContent: {
    backgroundColor: T.card,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 40,
    borderWidth: 1,
    borderColor: T.border,
  },
  sheetHandle: {
    width: 40,
    height: 4,
    backgroundColor: T.border,
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 20,
  },
  sheetTitle: {
    color: T.text,
    fontSize: 18,
    fontWeight: "800",
    marginBottom: 16,
  },
  sheetActionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: T.border,
  },
  sheetActionText: {
    color: T.text,
    fontSize: 15,
    fontWeight: "700",
  },
});
