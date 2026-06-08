import ActionSheet from "@/components/common/ActionSheet";
import LanguageSwitcher from "@/components/common/LanguageSwitcher";
import Text from "@/components/common/Text";
import { AuthService } from "@/services/authService";
import { PrivacySettings, UserService } from "@/services/userService";
import { useAppStore } from "@/store/appStore";
import { UI } from "@/store/uiStore";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
    ActivityIndicator,
    Alert,
    Image,
    ScrollView,
    StatusBar,
    StyleSheet,
    Switch,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

// ─── Settings Row Component ──────────────────────────────────────────────────
function SettingRow({
  icon,
  label,
  value,
  type = "switch",
  color = "#9CA3AF",
  onToggle,
  onPress,
  subtitle,
}: {
  icon: string;
  label: string;
  value?: boolean | string;
  type?: "switch" | "link" | "value";
  color?: string;
  onToggle?: (val: boolean) => void;
  onPress?: () => void;
  subtitle?: string;
}) {
  return (
    <TouchableOpacity
      style={styles.settingRow}
      onPress={onPress}
      disabled={type === "switch" && !onPress}
      activeOpacity={0.7}
    >
      <View
        style={[
          styles.settingIconBox,
          { backgroundColor: color + "10", borderColor: color + "20" },
        ]}
      >
        <Ionicons name={icon as any} size={18} color={color} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.settingLabel}>{label}</Text>
        {subtitle && <Text style={styles.settingSubtitle}>{subtitle}</Text>}
      </View>

      {type === "switch" && (
        <Switch
          value={value as boolean}
          onValueChange={onToggle}
          trackColor={{ false: "#E5E7EB", true: "#10B981" }}
          thumbColor={"#FFFFFF"}
        />
      )}

      {type === "link" && (
        <Ionicons name="chevron-forward" size={16} color="#9CA3AF" />
      )}

      {type === "value" && (
        <View style={styles.valueRow}>
          <Text style={styles.settingValueText}>{value}</Text>
          <Ionicons name="chevron-forward" size={16} color="#9CA3AF" />
        </View>
      )}
    </TouchableOpacity>
  );
}

export default function SettingsScreen() {
  const router = useRouter();
  const logout = useAppStore((state) => state.logout);
  const { t } = useTranslation();
  const currentUser = AuthService.getCurrentUser();

  const [sheet, setSheet] = useState<{
    visible: boolean;
    title: string;
    options: any[];
  }>({
    visible: false,
    title: "",
    options: [],
  });

  const showSheet = (title: string, options: any[]) =>
    setSheet({ visible: true, title, options });

  // ── Form State ────────────────────────────────────────────────────────────
  const [name, setName] = useState("");
  const [handle, setHandle] = useState("");
  const [bio, setBio] = useState("");

  // ── Notification Preferences (all persisted to Firestore) ─────────────────
  const [pushNotifications, setPushNotifications] = useState(true);
  const [sosNotifications, setSosNotifications] = useState(true);
  const [chatNotifications, setChatNotifications] = useState(true);
  const [communityNotifications, setCommunityNotifications] = useState(true);
  const [recommendationNotifications, setRecommendationNotifications] =
    useState(true);
  const [lostFoundNotifications, setLostFoundNotifications] = useState(true);

  // ── Privacy Settings (all persisted to Firestore) ─────────────────────────
  const [profileVisible, setProfileVisible] = useState(true);
  const [activityVisible, setActivityVisible] = useState(true);
  const [locationVisible, setLocationVisible] = useState(true);
  const [distanceVisible, setDistanceVisible] = useState(true);

  // ── Misc ───────────────────────────────────────────────────────────────────
  const [avatarUri, setAvatarUri] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [emergencyContactCount, setEmergencyContactCount] = useState(0);
  const [blockedUserCount, setBlockedUserCount] = useState(0);

  // ── Load all user settings from Firestore ─────────────────────────────────
  useEffect(() => {
    if (!currentUser?.uid) {
      setIsLoading(false);
      return;
    }

    const unsubscribe = UserService.subscribeToUser(currentUser.uid, (u) => {
      if (u) {
        setName(u.name || "");
        setHandle(
          u.handle || (u.name ? u.name.toLowerCase().replace(/\s+/g, "_") : ""),
        );
        setBio(u.bio || "");

        if (u.photoURL) {
          setAvatarUri(u.photoURL);
        }

        // Notification preferences
        if (u.notificationPreferences) {
          setPushNotifications(u.notificationPreferences.pushEnabled !== false);
          setSosNotifications(u.notificationPreferences.sos !== false);
          setChatNotifications(u.notificationPreferences.messages !== false);
          setCommunityNotifications(
            u.notificationPreferences.community !== false,
          );
          setRecommendationNotifications(
            u.notificationPreferences.recommendations !== false,
          );
          setLostFoundNotifications(
            u.notificationPreferences.lostAndFound !== false,
          );
        }

        // Privacy settings
        if (u.privacySettings) {
          setProfileVisible(u.privacySettings.profileVisible !== false);
          setActivityVisible(u.privacySettings.activityVisible !== false);
          setLocationVisible(u.privacySettings.locationVisible !== false);
          setDistanceVisible(u.privacySettings.distanceVisible !== false);
        }

        // Counts
        setEmergencyContactCount(u.emergencyContacts?.length || 0);
        setBlockedUserCount(u.blockedUsers?.length || 0);
      }
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [currentUser?.uid]);

  // ── Image Picker ──────────────────────────────────────────────────────────
  const handlePickImage = async (useCamera: boolean = false) => {
    try {
      let result;
      if (useCamera) {
        const perm = await ImagePicker.requestCameraPermissionsAsync();
        if (!perm.granted) {
          Alert.alert(
            "Permission Required",
            "Camera permission is required to take a photo.",
          );
          return;
        }
        result = await ImagePicker.launchCameraAsync({
          mediaTypes: ["images"],
          allowsEditing: true,
          aspect: [1, 1],
          quality: 0.5,
          base64: true,
        });
      } else {
        const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!perm.granted) {
          Alert.alert(
            "Permission Required",
            "Gallery permission is required to choose a photo.",
          );
          return;
        }
        result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ["images"],
          allowsEditing: true,
          aspect: [1, 1],
          quality: 0.5,
          base64: true,
        });
      }

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const uri = result.assets[0].uri;
        setAvatarUri(uri);

        if (currentUser?.uid) {
          setIsSaving(true);
          try {
            await UserService.uploadProfilePicture(currentUser.uid, uri);
            Alert.alert("Success", "Profile picture updated!");
          } catch (error) {
            Alert.alert("Error", "Failed to upload profile picture.");
          } finally {
            setIsSaving(false);
          }
        }
      }
    } catch (e) {
      console.error(e);
      Alert.alert("Error", "Could not load image picker.");
    }
  };

  // ── Notification Preference Toggles (all persist to Firestore) ────────────
  const toggleNotificationPref = async (
    key: string,
    value: boolean,
    setter: (v: boolean) => void,
  ) => {
    setter(value);
    if (currentUser?.uid) {
      try {
        await UserService.updateNotificationPreferences(currentUser.uid, {
          [key]: value,
        } as any);
        // If master push toggle changed, update token registry
        if (key === "pushEnabled") {
          const NotificationService =
            require("@/services/notificationService").default;
          await NotificationService.handlePushToggleChange(
            currentUser.uid,
            value,
          );
        }
      } catch (error) {
        setter(!value); // Revert on failure
        UI.toast("Error", "error", "Failed to update notification preference.");
      }
    }
  };

  // ── Privacy Toggles (all persist to Firestore) ────────────────────────────
  const togglePrivacySetting = async (
    key: keyof PrivacySettings,
    value: boolean,
    setter: (v: boolean) => void,
  ) => {
    setter(value);
    if (currentUser?.uid) {
      try {
        await UserService.updatePrivacySettings(currentUser.uid, {
          [key]: value,
        });
      } catch (error) {
        setter(!value); // Revert on failure
        Alert.alert("Error", "Failed to update privacy setting.");
      }
    }
  };

  // ── Save Profile (Name + Handle + Bio) ────────────────────────────────────
  const handleSave = async () => {
    if (isSaving) return;
    if (!name.trim()) {
      Alert.alert("Error", "Name cannot be empty");
      return;
    }
    setIsSaving(true);
    try {
      if (currentUser) {
        const finalHandle = handle.trim().toLowerCase().replace(/\s+/g, "");
        await UserService.updateProfile(currentUser.uid, {
          name: name.trim(),
          handle: finalHandle,
          bio: bio.trim(),
        });
        Alert.alert(
          t("settings_saved", "Settings Saved"),
          t(
            "settings_saved_msg",
            "Your profile has been updated successfully.",
          ),
        );
      }
    } catch (e) {
      console.error(e);
      Alert.alert("Error", "Failed to save settings");
    } finally {
      setIsSaving(false);
    }
  };

  // ── Logout ────────────────────────────────────────────────────────────────
  const handleLogout = () => {
    Alert.alert(
      t("log_out", "Log Out"),
      t("log_out_msg", "Are you sure you want to log out?"),
      [
        { text: t("cancel", "Cancel"), style: "cancel" },
        {
          text: t("log_out", "Log Out"),
          style: "destructive",
          onPress: async () => {
            try {
              await AuthService.logout();
              logout();
              router.replace("/(auth)/login");
            } catch (error) {
              console.error("Logout failed", error);
              Alert.alert("Error", "Failed to log out. Please try again.");
            }
          },
        },
      ],
    );
  };

  // ── Delete Account ─────────────────────────────────────────────────────────
  const handleDeleteAccount = () => {
    Alert.alert(
      "Delete Account",
      "Are you sure you want to permanently delete your account? This action cannot be undone and will delete all your data, posts, and settings.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            // Second confirmation
            Alert.alert(
              "Final Confirmation",
              "This will immediately delete your account. Proceed?",
              [
                { text: "Cancel", style: "cancel" },
                {
                  text: "Yes, Delete",
                  style: "destructive",
                  onPress: async () => {
                    try {
                      setIsSaving(true);
                      await AuthService.deleteAccount();
                      logout();
                      router.replace("/(auth)/login");
                    } catch (error: any) {
                      console.error("Delete Account failed", error);
                      // Handle the requirement to re-authenticate for sensitive operations
                      if (
                        error?.code === "auth/requires-recent-login" ||
                        error?.message?.includes("recent-login")
                      ) {
                        Alert.alert(
                          "Authentication Required",
                          "For security reasons, please log out and log back in to verify your identity before deleting your account.",
                        );
                      } else {
                        Alert.alert(
                          "Error",
                          "Failed to delete account. Please try again.",
                        );
                      }
                    } finally {
                      setIsSaving(false);
                    }
                  },
                },
              ],
            );
          },
        },
      ],
    );
  };

  if (isLoading) {
    return (
      <View
        style={[
          styles.root,
          { alignItems: "center", justifyContent: "center" },
        ]}
      >
        <StatusBar barStyle="dark-content" backgroundColor="#F8F9FA" />
        <ActivityIndicator size="large" color="#2563EB" />
        <Text style={{ marginTop: 12, color: "#6B7280", fontSize: 13 }}>
          Loading settings...
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" backgroundColor="#F8F9FA" />
      <SafeAreaView style={{ flex: 1 }} edges={["top"]}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backBtn}
            activeOpacity={0.8}
          >
            <Ionicons name="arrow-back" size={18} color="#4B5563" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t("settings", "Settings")}</Text>
          <TouchableOpacity
            onPress={handleSave}
            style={styles.saveBtn}
            disabled={isSaving}
            activeOpacity={0.8}
          >
            {isSaving ? (
              <ActivityIndicator size="small" color="#2563EB" />
            ) : (
              <Text style={styles.saveText}>{t("save", "Save")}</Text>
            )}
          </TouchableOpacity>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scroll}
        >
          {/* ═══ Profile Edit Section ═══ */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              {t("edit_profile", "EDIT PROFILE")}
            </Text>
            <View style={styles.card}>
              <View style={styles.avatarSection}>
                <View style={styles.avatarContainer}>
                  <Image
                    source={{
                      uri:
                        avatarUri ||
                        "https://via.placeholder.com/150/E5E7EB/9CA3AF?text=?",
                    }}
                    style={styles.avatar}
                  />
                  <TouchableOpacity
                    style={styles.editAvatarBtn}
                    activeOpacity={0.85}
                    onPress={() =>
                      showSheet(t("change_avatar", "Change Avatar"), [
                        {
                          label: t("take_photo", "Take Photo"),
                          action: () => handlePickImage(true),
                        },
                        {
                          label: t("choose_gallery", "Choose from Gallery"),
                          action: () => handlePickImage(false),
                        },
                      ])
                    }
                  >
                    <Ionicons name="camera" size={14} color="#FFFFFF" />
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>
                  {t("full_name", "Full Name")}
                </Text>
                <TextInput
                  style={styles.input}
                  value={name}
                  onChangeText={setName}
                  placeholderTextColor="#9CA3AF"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>{t("handle", "Handle")}</Text>
                <TextInput
                  style={styles.input}
                  value={handle}
                  onChangeText={setHandle}
                  autoCapitalize="none"
                  placeholderTextColor="#9CA3AF"
                  placeholder="your_handle"
                />
              </View>

              <View style={[styles.inputGroup, { marginBottom: 6 }]}>
                <Text style={styles.inputLabel}>{t("bio", "Bio")}</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={bio}
                  onChangeText={setBio}
                  multiline
                  numberOfLines={3}
                  maxLength={200}
                  placeholder="Tell your neighbours a bit about yourself..."
                  placeholderTextColor="#9CA3AF"
                />
                <Text style={styles.charCount}>{bio.length}/200</Text>
              </View>
            </View>
          </View>

          {/* ═══ Notification Preferences ═══ */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              {t("notifications", "NOTIFICATIONS")}
            </Text>
            <View style={styles.card}>
              <SettingRow
                icon="notifications-outline"
                label={t("push_notifications", "Push Notifications")}
                subtitle="Master switch for all notifications"
                value={pushNotifications}
                type="switch"
                color="#2563EB"
                onToggle={(v) =>
                  toggleNotificationPref("pushEnabled", v, setPushNotifications)
                }
              />
              <View style={styles.divider} />
              <SettingRow
                icon="alert-circle-outline"
                label={t("sos_alerts", "SOS Alerts")}
                subtitle="Emergency alerts in your area"
                value={sosNotifications}
                type="switch"
                color="#EF4444"
                onToggle={(v) =>
                  toggleNotificationPref("sos", v, setSosNotifications)
                }
              />
              <View style={styles.divider} />
              <SettingRow
                icon="chatbubble-outline"
                label={t("chat_notifications", "Chat Messages")}
                subtitle="Direct and community messages"
                value={chatNotifications}
                type="switch"
                color="#10B981"
                onToggle={(v) =>
                  toggleNotificationPref("messages", v, setChatNotifications)
                }
              />
              <View style={styles.divider} />
              <SettingRow
                icon="people-outline"
                label={t("community_updates", "Community Updates")}
                subtitle="Posts and activity in your area"
                value={communityNotifications}
                type="switch"
                color="#F59E0B"
                onToggle={(v) =>
                  toggleNotificationPref(
                    "community",
                    v,
                    setCommunityNotifications,
                  )
                }
              />
              <View style={styles.divider} />
              <SettingRow
                icon="star-outline"
                label={t("recommendations", "Recommendations")}
                subtitle="Local business and service suggestions"
                value={recommendationNotifications}
                type="switch"
                color="#8B5CF6"
                onToggle={(v) =>
                  toggleNotificationPref(
                    "recommendations",
                    v,
                    setRecommendationNotifications,
                  )
                }
              />
              <View style={styles.divider} />
              <SettingRow
                icon="search-outline"
                label={t("lost_and_found", "Lost & Found")}
                subtitle="Lost and found item updates"
                value={lostFoundNotifications}
                type="switch"
                color="#D97706"
                onToggle={(v) =>
                  toggleNotificationPref(
                    "lostAndFound",
                    v,
                    setLostFoundNotifications,
                  )
                }
              />
            </View>
          </View>

          {/* ═══ Language ═══ */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t("language", "LANGUAGE")}</Text>
            <View style={styles.card}>
              <View
                style={[styles.settingRow, { justifyContent: "space-between" }]}
              >
                <View style={styles.settingRowLeft}>
                  <View
                    style={[
                      styles.settingIconBox,
                      {
                        backgroundColor: "#F59E0B10",
                        borderColor: "#F59E0B20",
                      },
                    ]}
                  >
                    <Ionicons
                      name="language-outline"
                      size={18}
                      color="#F59E0B"
                    />
                  </View>
                  <Text style={styles.settingLabel}>
                    {t("language", "Language")}
                  </Text>
                </View>
                <LanguageSwitcher />
              </View>
            </View>
          </View>

          {/* ═══ Privacy & Safety ═══ */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              {t("privacy_safety", "PRIVACY & SAFETY")}
            </Text>
            <View style={styles.card}>
              <SettingRow
                icon="eye-outline"
                label={t("public_profile", "Public Profile")}
                subtitle="Allow others to discover your profile"
                value={profileVisible}
                type="switch"
                color="#8B5CF6"
                onToggle={(v) =>
                  togglePrivacySetting("profileVisible", v, setProfileVisible)
                }
              />
              <View style={styles.divider} />
              <SettingRow
                icon="time-outline"
                label={t("activity_visible", "Activity Visibility")}
                subtitle="Show your recent activity to others"
                value={activityVisible}
                type="switch"
                color="#6366F1"
                onToggle={(v) =>
                  togglePrivacySetting("activityVisible", v, setActivityVisible)
                }
              />
              <View style={styles.divider} />
              <SettingRow
                icon="location-outline"
                label={t("location_visible", "Precise Location")}
                subtitle="Show exact location or community name only"
                value={locationVisible}
                type="switch"
                color="#10B981"
                onToggle={(v) =>
                  togglePrivacySetting("locationVisible", v, setLocationVisible)
                }
              />
              <View style={styles.divider} />
              <SettingRow
                icon="navigate-outline"
                label={t("distance_visible", "Distance Visibility")}
                subtitle="Show distance from you on posts"
                value={distanceVisible}
                type="switch"
                color="#0EA5E9"
                onToggle={(v) =>
                  togglePrivacySetting("distanceVisible", v, setDistanceVisible)
                }
              />
            </View>
          </View>

          {/* ═══ Safety Features ═══ */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t("safety", "SAFETY")}</Text>
            <View style={styles.card}>
              <SettingRow
                icon="shield-checkmark-outline"
                label={t("emergency_contacts", "Emergency Contacts")}
                subtitle={
                  emergencyContactCount > 0
                    ? `${emergencyContactCount} contact${emergencyContactCount > 1 ? "s" : ""} saved`
                    : "Add contacts for emergencies"
                }
                type="link"
                color="#EF4444"
                onPress={() =>
                  router.push("/settings/emergency-contacts" as any)
                }
              />
              <View style={styles.divider} />
              <SettingRow
                icon="ban-outline"
                label={t("blocked_users", "Blocked Users")}
                subtitle={
                  blockedUserCount > 0
                    ? `${blockedUserCount} user${blockedUserCount > 1 ? "s" : ""} blocked`
                    : "No blocked users"
                }
                type="link"
                color="#6B7280"
                onPress={() => router.push("/settings/blocked-users" as any)}
              />
            </View>
          </View>

          {/* ═══ Logout ═══ */}
          <TouchableOpacity
            style={styles.logoutBtn}
            onPress={handleLogout}
            activeOpacity={0.8}
          >
            <Ionicons name="log-out-outline" size={18} color="#EF4444" />
            <Text style={styles.logoutText}>
              {t("log_out_devices", "Log Out")}
            </Text>
          </TouchableOpacity>

          {/* ═══ Delete Account ═══ */}
          <TouchableOpacity
            style={[
              styles.logoutBtn,
              {
                borderColor: "#EF4444",
                backgroundColor: "#FFFFFF",
                marginTop: 0,
              },
            ]}
            onPress={handleDeleteAccount}
            activeOpacity={0.8}
          >
            <Ionicons name="trash-outline" size={18} color="#EF4444" />
            <Text style={styles.logoutText}>Delete Account</Text>
          </TouchableOpacity>

          {/* Footer Info */}
          <Text style={styles.footerText}>AasPaas v1.0.0 (Build 42)</Text>
        </ScrollView>
        <ActionSheet
          visible={sheet.visible}
          title={sheet.title}
          options={sheet.options}
          onClose={() => setSheet({ ...sheet, visible: false })}
        />
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#F8F9FA",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 16,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    color: "#111827",
    fontSize: 16,
    fontWeight: "800",
  },
  saveBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: "#FFFFFF",
    borderRadius: 100,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    alignItems: "center",
    justifyContent: "center",
    minWidth: 64,
  },
  saveText: {
    color: "#2563EB",
    fontWeight: "800",
    fontSize: 12,
  },
  scroll: {
    paddingBottom: 40,
  },
  section: {
    paddingHorizontal: 16,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 10,
    fontWeight: "800",
    color: "#9CA3AF",
    letterSpacing: 1.5,
    marginBottom: 8,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.02,
    shadowRadius: 6,
    elevation: 1.5,
  },
  avatarSection: {
    alignItems: "center",
    paddingVertical: 18,
  },
  avatarContainer: {
    position: "relative",
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 2,
    borderColor: "#2563EB",
    backgroundColor: "#F3F4F6",
  },
  editAvatarBtn: {
    position: "absolute",
    bottom: 0,
    right: -4,
    backgroundColor: "#2563EB",
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },
  inputGroup: {
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  inputLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: "#9CA3AF",
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 6,
  },
  input: {
    height: 42,
    backgroundColor: "#F3F4F6",
    borderRadius: 10,
    paddingHorizontal: 12,
    fontSize: 13,
    fontWeight: "600",
    color: "#111827",
  },
  textArea: {
    height: 70,
    textAlignVertical: "top",
    paddingTop: 10,
  },
  charCount: {
    fontSize: 10,
    color: "#9CA3AF",
    textAlign: "right",
    marginTop: 4,
  },
  settingRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  settingRowLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  settingIconBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  settingLabel: {
    color: "#4B5563",
    fontSize: 13,
    fontWeight: "700",
    flex: 1,
  },
  settingSubtitle: {
    color: "#9CA3AF",
    fontSize: 10,
    fontWeight: "500",
    marginTop: 1,
  },
  valueRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  settingValueText: {
    color: "#9CA3AF",
    fontSize: 12,
    fontWeight: "600",
  },
  divider: {
    height: 1,
    backgroundColor: "#F3F4F6",
    marginHorizontal: 16,
  },
  logoutBtn: {
    marginHorizontal: 16,
    height: 48,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#FCA5A5",
    backgroundColor: "#FEF2F2",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginBottom: 20,
    marginTop: 10,
  },
  logoutText: {
    color: "#EF4444",
    fontSize: 13,
    fontWeight: "800",
  },
  footerText: {
    color: "#9CA3AF",
    fontSize: 10,
    fontWeight: "600",
    textAlign: "center",
    marginBottom: 24,
  },
});
