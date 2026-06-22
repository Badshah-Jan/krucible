import ActionSheet from "@/components/common/ActionSheet";
import LanguageSwitcher from "@/components/common/LanguageSwitcher";
import Text from "@/components/common/Text";
import { AuthService } from "@/services/authService";
import { PrivacySettings, UserService } from "@/services/userService";
import { useAppStore } from "@/store/appStore";
import { UI } from "@/store/uiStore";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useRouter, useLocalSearchParams } from "expo-router";
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

const T = {
  bg: "#FFFFFF",
  primary: "#FF385C", // Airbnb Coral
  text: "#222222", // Airbnb Off-black
  textSecondary: "#717171", // Airbnb Slate-gray
  border: "#DDDDDD", // Airbnb border outline
  separator: "#EBEBEB", // Airbnb divider
};

// ─── Settings Row Component (Airbnb Flat List Style) ────────────────────────
function SettingRow({
  icon,
  label,
  value,
  type = "switch",
  onToggle,
  onPress,
  subtitle,
}: {
  icon: string;
  label: string;
  value?: boolean | string;
  type?: "switch" | "link" | "value";
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
      <View style={styles.settingRowLeft}>
        <Ionicons name={icon as any} size={22} color={T.text} style={styles.rowIcon} />
        <View style={{ flex: 1, paddingRight: 8 }}>
          <Text style={styles.settingLabel}>{label}</Text>
          {subtitle && <Text style={styles.settingSubtitle}>{subtitle}</Text>}
        </View>
      </View>

      {type === "switch" && (
        <Switch
          value={value as boolean}
          onValueChange={onToggle}
          trackColor={{ false: "#E5E7EB", true: T.primary }}
          thumbColor={"#FFFFFF"}
        />
      )}

      {type === "link" && (
        <Ionicons name="chevron-forward" size={18} color="#717171" />
      )}

      {type === "value" && (
        <View style={styles.valueRow}>
          <Text style={styles.settingValueText}>{value}</Text>
          <Ionicons name="chevron-forward" size={18} color="#717171" />
        </View>
      )}
    </TouchableOpacity>
  );
}

export default function SettingsScreen() {
  const router = useRouter();
  const { section } = useLocalSearchParams<{ section?: string }>();
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

  // ── Notification Preferences ──────────────────────────────────────────────
  const [pushNotifications, setPushNotifications] = useState(true);
  const [sosNotifications, setSosNotifications] = useState(true);
  const [chatNotifications, setChatNotifications] = useState(true);
  const [communityNotifications, setCommunityNotifications] = useState(true);
  const [recommendationNotifications, setRecommendationNotifications] = useState(true);
  const [lostFoundNotifications, setLostFoundNotifications] = useState(true);

  // ── Privacy Settings ──────────────────────────────────────────────────────
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
          UI.alert(
            "Permission Required",
            "Camera permission is required to take a photo."
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
          UI.alert(
            "Permission Required",
            "Gallery permission is required to choose a photo."
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
            UI.success("Success", "Profile picture updated!");
          } catch (error) {
            UI.error("Error", "Failed to upload profile picture.");
          } finally {
            setIsSaving(false);
          }
        }
      }
    } catch (e) {
      console.error(e);
      UI.error("Error", "Could not load image picker.");
    }
  };

  // ── Save Profile (Name + Handle + Bio + Prefs) ────────────────────────────
  const handleSave = async () => {
    if (isSaving) return;
    if (!name.trim()) {
      UI.error("Error", "Name cannot be empty");
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

        // Batch save Notification Preferences
        await UserService.updateNotificationPreferences(currentUser.uid, {
          pushEnabled: pushNotifications,
          sos: sosNotifications,
          messages: chatNotifications,
          community: communityNotifications,
          recommendations: recommendationNotifications,
          lostAndFound: lostFoundNotifications,
        } as any);

        // Batch save Privacy Settings
        await UserService.updatePrivacySettings(currentUser.uid, {
          profileVisible,
          activityVisible,
          locationVisible,
          distanceVisible,
        });

        // If master push toggle changed, update token registry
        const NotificationService = require("@/services/notificationService").default;
        await NotificationService.handlePushToggleChange(
          currentUser.uid,
          pushNotifications,
        );

        UI.success(
          t("settings_saved", "Settings Saved"),
          t("settings_saved_msg", "Setting updated successfully")
        );
        
        router.push("/(tabs)/profile" as any);
      }
    } catch (e) {
      console.error(e);
      UI.error("Error", "Failed to save settings");
    } finally {
      setIsSaving(false);
    }
  };

  // ── Logout ────────────────────────────────────────────────────────────────
  const handleLogout = () => {
    UI.confirm(
      t("log_out", "Log Out"),
      t("log_out_msg", "Are you sure you want to log out?"),
      async () => {
        try {
          await AuthService.logout();
          logout();
          router.replace("/(auth)/login");
        } catch (error) {
          console.error("Logout failed", error);
          UI.error("Error", "Failed to log out. Please try again.");
        }
      },
      t("log_out", "Log Out"),
      "warning"
    );
  };

  // ── Delete Account ─────────────────────────────────────────────────────────
  const handleDeleteAccount = () => {
    UI.confirm(
      "Delete Account",
      "Deleting your account will permanently remove your profile, posts, messages, businesses, services, media, reputation, and all associated data. This action cannot be undone.",
      async () => {
        try {
          setIsSaving(true);
          await AuthService.deleteAccount();
          logout();
          router.replace("/(auth)/login");
        } catch (error: any) {
          console.warn("Delete Account handled error:", error?.message || error);
          if (
            error?.code === "auth/requires-recent-login" ||
            error?.message?.includes("recent-login")
          ) {
            UI.alert(
              "Authentication Required",
              "For security reasons, please log out and log back in to verify your identity before deleting your account.",
              "warning"
            );
          } else {
            UI.error(
              "Error",
              "Failed to delete account. Please try again."
            );
          }
        } finally {
          setIsSaving(false);
        }
      },
      "Permanently Delete Account",
      "danger"
    );
  };

  if (isLoading) {
    return (
      <View style={[styles.root, { alignItems: "center", justifyContent: "center" }]}>
        <StatusBar barStyle="dark-content" />
        <ActivityIndicator size="small" color={T.primary} />
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <SafeAreaView style={{ flex: 1, backgroundColor: "#FFFFFF" }} edges={["top"]}>
        
        {/* Header (Airbnb Clean Style) */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backBtn}
            activeOpacity={0.8}
          >
            <Ionicons name="chevron-back" size={24} color={T.text} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleSave}
            style={styles.saveBtn}
            disabled={isSaving}
            activeOpacity={0.8}
          >
            {isSaving ? (
              <ActivityIndicator size="small" color={T.primary} />
            ) : (
              <Text style={styles.saveText}>{t("save", "Save")}</Text>
            )}
          </TouchableOpacity>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scroll}
        >
          {/* Page Title */}
          <View style={styles.titleContainer}>
            <Text style={styles.screenTitle}>
              {!section ? t("settings", "Settings") : 
                section === "personal" ? t("personal_info", "Personal Info") :
                section === "security" ? t("login_security", "Login & Security") :
                t("privacy_safety", "Privacy & Safety")
              }
            </Text>
          </View>

          {/* ─── Personal Info Section ─── */}
          {(!section || section === "personal") && (
            <>
              {/* ─── Profile Avatar Edit (Airbnb Style underline text trigger) ─── */}
              <View style={styles.avatarSection}>
            <View style={styles.avatarWrapper}>
              <Image
                source={{
                  uri:
                    avatarUri ||
                    "https://ui-avatars.com/api/?name=Neighbor&background=F7F7F7&color=717171",
                }}
                style={styles.avatar}
              />
              <TouchableOpacity
                style={styles.changePhotoBtn}
                activeOpacity={0.7}
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
                <Text style={styles.changePhotoText}>Change photo</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* ─── Airbnb Card Inputs (Thin box with small top label inside) ─── */}
          <View style={styles.formContainer}>
            <Text style={styles.sectionTitle}>{t("edit_profile", "PROFILE INFO")}</Text>
            
            <View style={styles.airbnbInputBox}>
              <Text style={styles.airbnbInputLabel}>{t("full_name", "Full Name")}</Text>
              <TextInput
                style={styles.airbnbInput}
                value={name}
                onChangeText={setName}
                placeholderTextColor="#A0A0A0"
              />
            </View>

            <View style={[styles.airbnbInputBox, { marginTop: 12 }]}>
              <Text style={styles.airbnbInputLabel}>{t("handle", "Handle")}</Text>
              <TextInput
                style={styles.airbnbInput}
                value={handle}
                onChangeText={setHandle}
                autoCapitalize="none"
                placeholderTextColor="#A0A0A0"
                placeholder="your_handle"
              />
            </View>

            <View style={[styles.airbnbInputBox, { marginTop: 12, height: 100 }]}>
              <Text style={styles.airbnbInputLabel}>{t("bio", "Bio")}</Text>
              <TextInput
                style={[styles.airbnbInput, { height: 60, textAlignVertical: "top" }]}
                value={bio}
                onChangeText={setBio}
                multiline
                numberOfLines={3}
                maxLength={200}
                placeholder="Tell your neighbours a bit about yourself..."
                placeholderTextColor="#A0A0A0"
              />
              <Text style={styles.charCount}>{bio.length}/200</Text>
            </View>
          </View>
          </>
          )}

          {/* ─── Security Section ─── */}
          {(!section || section === "security") && (
            <>
              {/* ─── Notification Preferences ─── */}
              <View style={styles.listContainer}>
            <Text style={styles.sectionTitle}>{t("notifications", "NOTIFICATIONS")}</Text>
            
            <SettingRow
              icon="notifications-outline"
              label={t("push_notifications", "Push Notifications")}
              subtitle="Master switch for all community alerts"
              value={pushNotifications}
              type="switch"
              onToggle={setPushNotifications}
            />
            <View style={styles.menuSeparator} />

            <SettingRow
              icon="alert-circle-outline"
              label={t("sos_alerts", "SOS Alerts")}
              subtitle="Critical emergency alerts from neighbors"
              value={sosNotifications}
              type="switch"
              onToggle={setSosNotifications}
            />
            <View style={styles.menuSeparator} />

            <SettingRow
              icon="chatbubble-outline"
              label={t("chat_notifications", "Chat Messages")}
              subtitle="Direct chats and room messages notifications"
              value={chatNotifications}
              type="switch"
              onToggle={setChatNotifications}
            />
            <View style={styles.menuSeparator} />

            <SettingRow
              icon="people-outline"
              label={t("community_updates", "Community Updates")}
              subtitle="Posts and events in your neighborhood feed"
              value={communityNotifications}
              type="switch"
              onToggle={setCommunityNotifications}
            />
            <View style={styles.menuSeparator} />

            <SettingRow
              icon="star-outline"
              label={t("recommendations", "Recommendations")}
              subtitle="Local business and service reviews"
              value={recommendationNotifications}
              type="switch"
              onToggle={setRecommendationNotifications}
            />
            <View style={styles.menuSeparator} />

            <SettingRow
              icon="search-outline"
              label={t("lost_and_found", "Lost & Found")}
              subtitle="Lost item posts and update matches"
              value={lostFoundNotifications}
              type="switch"
              onToggle={setLostFoundNotifications}
            />
          </View>

          {/* ─── Language Options ─── */}
          <View style={styles.listContainer}>
            <Text style={styles.sectionTitle}>{t("language", "LANGUAGE")}</Text>
            <View style={styles.languageRow}>
              <View style={styles.languageLeft}>
                <Ionicons name="language-outline" size={22} color={T.text} />
                <Text style={styles.settingLabel}>{t("language", "Language")}</Text>
              </View>
              <LanguageSwitcher />
            </View>
          </View>
          </>
          )}

          {/* ─── Privacy & Safety Section ─── */}
          {(!section || section === "privacy") && (
            <>
              {/* ─── Privacy Settings ─── */}
              <View style={styles.listContainer}>
            <Text style={styles.sectionTitle}>{t("privacy_safety", "PRIVACY & SAFETY")}</Text>
            
            <SettingRow
              icon="eye-outline"
              label={t("public_profile", "Public Profile")}
              subtitle="Allow other neighbors to view your profile"
              value={profileVisible}
              type="switch"
              onToggle={setProfileVisible}
            />
            <View style={styles.menuSeparator} />

            <SettingRow
              icon="time-outline"
              label={t("activity_visible", "Activity Visibility")}
              subtitle="Show your latest actions to the neighborhood"
              value={activityVisible}
              type="switch"
              onToggle={setActivityVisible}
            />
            <View style={styles.menuSeparator} />

            <SettingRow
              icon="location-outline"
              label={t("location_visible", "Precise Location")}
              subtitle="Show pinpoint map location vs general community name"
              value={locationVisible}
              type="switch"
              onToggle={setLocationVisible}
            />
            <View style={styles.menuSeparator} />

            <SettingRow
              icon="navigate-outline"
              label={t("distance_visible", "Distance Visibility")}
              subtitle="Display distance tag on your shared posts"
              value={distanceVisible}
              type="switch"
              onToggle={setDistanceVisible}
            />
          </View>
          </>
          )}

          {(!section || section === "security") && (
            <>
              {/* ─── Safety & Navigation Features ─── */}
              <View style={styles.listContainer}>
                <Text style={styles.sectionTitle}>{t("safety", "SAFETY")}</Text>
                
                <SettingRow
                  icon="home-outline"
                  label="Home Community"
                  subtitle="Switch your permanent primary home neighborhood"
                  type="link"
                  onPress={() => {
                    Alert.alert(
                      "Change Home Community",
                      "You are changing your permanent Home Community.\n\nYour Home Feed, Community Chat, Community Alerts, and future Community Notifications will switch to the new community.\n\nOnly continue if you have permanently relocated.",
                      [
                        { text: "Cancel", style: "cancel" },
                        {
                          text: "Continue",
                          style: "destructive",
                          onPress: () => router.push("/(auth)/community-setup" as any),
                        },
                      ],
                    );
                  }}
                />
                <View style={styles.menuSeparator} />

                <SettingRow
                  icon="shield-checkmark-outline"
                  label={t("emergency_contacts", "Emergency Contacts")}
                  subtitle={
                    emergencyContactCount > 0
                      ? `${emergencyContactCount} contact${emergencyContactCount > 1 ? "s" : ""} saved`
                      : "Setup contacts for immediate SOS dispatch"
                  }
                  type="link"
                  onPress={() => router.push("/settings/emergency-contacts" as any)}
                />
                <View style={styles.menuSeparator} />

                <SettingRow
                  icon="ban-outline"
                  label={t("blocked_users", "Blocked Users")}
                  subtitle={
                    blockedUserCount > 0
                      ? `${blockedUserCount} user${blockedUserCount > 1 ? "s" : ""} blocked`
                      : "Manage list of blocked neighbor profiles"
                  }
                  type="link"
                  onPress={() => router.push("/settings/blocked-users" as any)}
                />
              </View>

              {/* ─── Logout link ─── */}
              <View style={styles.footerContainer}>
                <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
                  <Text style={styles.logoutText}>{t("log_out_devices", "Log out")}</Text>
                </TouchableOpacity>
              </View>

              {/* ─── Danger Zone Account Deletion ─── */}
              <View style={styles.dangerZone}>
                <Text style={styles.dangerTitle}>{t("danger_zone", "DANGER ZONE")}</Text>
                <View style={styles.dangerCard}>
                  <Text style={styles.dangerHeading}>Delete your account</Text>
                  <Text style={styles.dangerSubText}>
                    Permanently delete your profile, posts, messages, businesses, services, media, and all associated data. This action is irreversible.
                  </Text>
                  <TouchableOpacity
                    style={styles.deleteBtn}
                    onPress={handleDeleteAccount}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.deleteBtnText}>Permanently Delete Account</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </>
          )}

          {/* Footer Info */}
          <Text style={styles.footerText}>Neighborly v1.0.0 (Build 42)</Text>
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
    backgroundColor: T.bg,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 8,
    backgroundColor: "#FFFFFF",
  },
  backBtn: {
    paddingVertical: 4,
    paddingRight: 12,
  },
  saveBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: T.text,
    borderRadius: 8,
    minWidth: 64,
    alignItems: "center",
    justifyContent: "center",
  },
  saveText: {
    color: "#FFFFFF",
    fontWeight: "800",
    fontSize: 13,
  },
  scroll: {
    paddingBottom: 60,
  },
  titleContainer: {
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 8,
  },
  screenTitle: {
    fontSize: 32,
    fontWeight: "800",
    color: T.text,
    letterSpacing: -0.8,
  },
  avatarSection: {
    alignItems: "center",
    marginVertical: 20,
  },
  avatarWrapper: {
    alignItems: "center",
    gap: 8,
  },
  avatar: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: "#F7F7F7",
    borderWidth: 1,
    borderColor: T.border,
  },
  changePhotoBtn: {
    paddingVertical: 4,
  },
  changePhotoText: {
    fontSize: 13,
    fontWeight: "700",
    color: T.text,
    textDecorationLine: "underline",
  },
  formContainer: {
    paddingHorizontal: 24,
    marginVertical: 12,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: "800",
    color: T.textSecondary,
    letterSpacing: 0.8,
    textTransform: "uppercase",
    marginBottom: 16,
  },
  airbnbInputBox: {
    borderWidth: 1,
    borderColor: T.border,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: "#FFFFFF",
    minHeight: 56,
    justifyContent: "center",
  },
  airbnbInputLabel: {
    fontSize: 10,
    fontWeight: "600",
    color: T.textSecondary,
    marginBottom: 2,
  },
  airbnbInput: {
    fontSize: 15,
    fontWeight: "600",
    color: T.text,
    padding: 0,
  },
  charCount: {
    fontSize: 10,
    color: T.textSecondary,
    textAlign: "right",
    position: "absolute",
    bottom: 8,
    right: 12,
  },
  listContainer: {
    marginVertical: 16,
    paddingHorizontal: 24,
  },
  settingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 16,
  },
  settingRowLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    gap: 12,
  },
  rowIcon: {
    width: 24,
    textAlign: "center",
  },
  settingLabel: {
    fontSize: 15,
    fontWeight: "600",
    color: T.text,
  },
  settingSubtitle: {
    fontSize: 12,
    color: T.textSecondary,
    fontWeight: "500",
    marginTop: 2,
    lineHeight: 16,
  },
  valueRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  settingValueText: {
    color: T.textSecondary,
    fontSize: 13,
    fontWeight: "600",
  },
  menuSeparator: {
    height: 1,
    backgroundColor: T.separator,
  },
  languageRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 16,
  },
  languageLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  footerContainer: {
    paddingHorizontal: 24,
    marginVertical: 16,
  },
  logoutBtn: {
    paddingVertical: 8,
    alignSelf: "flex-start",
  },
  logoutText: {
    color: T.text,
    fontSize: 16,
    fontWeight: "800",
    textDecorationLine: "underline",
  },
  dangerZone: {
    marginVertical: 24,
    paddingHorizontal: 24,
  },
  dangerTitle: {
    fontSize: 12,
    fontWeight: "800",
    color: T.primary,
    letterSpacing: 0.8,
    textTransform: "uppercase",
    marginBottom: 16,
  },
  dangerCard: {
    borderWidth: 1,
    borderColor: "#FECACA",
    borderRadius: 12,
    padding: 18,
    backgroundColor: "#FEF2F2",
  },
  dangerHeading: {
    fontSize: 16,
    fontWeight: "800",
    color: "#991B1B",
    marginBottom: 6,
  },
  dangerSubText: {
    fontSize: 13,
    color: "#991B1B",
    lineHeight: 18,
    marginBottom: 16,
    opacity: 0.9,
    fontWeight: "500",
  },
  deleteBtn: {
    backgroundColor: T.primary,
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  deleteBtnText: {
    color: "#FFFFFF",
    fontWeight: "800",
    fontSize: 14,
  },
  footerText: {
    color: T.textSecondary,
    fontSize: 11,
    fontWeight: "600",
    textAlign: "center",
    marginTop: 24,
    marginBottom: 8,
  },
});
