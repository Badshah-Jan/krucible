import ActionSheet from "@/components/common/ActionSheet";
import LanguageSwitcher from "@/components/common/LanguageSwitcher";
import { AuthService } from "@/services/authService";
import { PrivacySettings, UserService } from "@/services/userService";
import { useAppStore } from "@/store/appStore";
import { UI } from "@/store/uiStore";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useRouter, useLocalSearchParams } from "expo-router";
import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { getAuth, sendPasswordResetEmail } from "firebase/auth";
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
    Text,
    Linking
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const T = {
  bg: "#F7F7F7",
  card: "#FFFFFF",
  primary: "#FF385C", 
  text: "#222222", 
  textSecondary: "#717171", 
  border: "#DDDDDD", 
  separator: "#EBEBEB", 
  danger: "#EF4444",
};

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
  value?: boolean | string | number;
  type?: "switch" | "link" | "value";
  onToggle?: (val: boolean) => void;
  onPress?: () => void;
  subtitle?: string;
}) {
  return (
    <TouchableOpacity
      style={s.settingRow}
      onPress={onPress}
      disabled={type === "switch" && !onPress}
      activeOpacity={0.7}
    >
      <View style={s.settingRowLeft}>
        <Ionicons name={icon as any} size={22} color={T.text} style={s.rowIcon} />
        <View style={{ flex: 1, paddingRight: 8 }}>
          <Text style={s.settingLabel}>{label}</Text>
          {subtitle && <Text style={s.settingSubtitle}>{subtitle}</Text>}
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
        <Ionicons name="chevron-forward" size={18} color="#D1D5DB" />
      )}

      {type === "value" && (
        <View style={s.valueRow}>
          <Text style={s.settingValueText}>{value}</Text>
          <Ionicons name="chevron-forward" size={18} color="#D1D5DB" />
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

  const [sheet, setSheet] = useState<{ visible: boolean; title: string; options: any[] }>({
    visible: false, title: "", options: [],
  });

  const showSheet = (title: string, options: any[]) => setSheet({ visible: true, title, options });

  // Profile Form
  const [name, setName] = useState("");
  const [handle, setHandle] = useState("");
  const [bio, setBio] = useState("");
  const [avatarUri, setAvatarUri] = useState("");

  // Notifications
  const [sosNotifications, setSosNotifications] = useState(true);
  const [communityNotifications, setCommunityNotifications] = useState(true);
  const [recommendationNotifications, setRecommendationNotifications] = useState(true);
  const [chatNotifications, setChatNotifications] = useState(true);
  const [serviceNotifications, setServiceNotifications] = useState(true);
  const [pushNotifications, setPushNotifications] = useState(true);

  // Privacy
  const [profileVisible, setProfileVisible] = useState(true);
  const [locationVisible, setLocationVisible] = useState(true);
  const [distanceVisible, setDistanceVisible] = useState(true);
  const [allowDirectMessages, setAllowDirectMessages] = useState(true);

  // Location
  const [locationRadius, setLocationRadius] = useState<number>(5);
  
  // Status
  const [emailVerified, setEmailVerified] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!currentUser?.uid) {
      setIsLoading(false);
      return;
    }

    setEmailVerified(currentUser.emailVerified);

    const unsubscribe = UserService.subscribeToUser(currentUser.uid, (u) => {
      if (u) {
        setName(u.name || "");
        setHandle(u.handle || (u.name ? u.name.toLowerCase().replace(/\s+/g, "_") : ""));
        setBio(u.bio || "");
        if (u.photoURL) setAvatarUri(u.photoURL);
        if (u.locationRadius) setLocationRadius(u.locationRadius);

        if (u.notificationPreferences) {
          setSosNotifications(u.notificationPreferences.sos !== false);
          setCommunityNotifications(u.notificationPreferences.community !== false);
          setRecommendationNotifications(u.notificationPreferences.recommendations !== false);
          setChatNotifications(u.notificationPreferences.messages !== false);
          setServiceNotifications(u.notificationPreferences.services !== false);
          setPushNotifications(u.notificationPreferences.pushEnabled !== false);
        }

        if (u.privacySettings) {
          setProfileVisible(u.privacySettings.profileVisible !== false);
          setLocationVisible(u.privacySettings.locationVisible !== false);
          setDistanceVisible(u.privacySettings.distanceVisible !== false);
          setAllowDirectMessages(u.privacySettings.allowDirectMessages !== false);
        }
      }
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [currentUser?.uid]);

  const handlePickImage = async (useCamera: boolean = false) => {
    try {
      let result;
      if (useCamera) {
        const perm = await ImagePicker.requestCameraPermissionsAsync();
        if (!perm.granted) {
          UI.alert("Permission Required", "Camera permission is required.");
          return;
        }
        result = await ImagePicker.launchCameraAsync({ mediaTypes: ["images"], allowsEditing: true, aspect: [1, 1], quality: 0.5, base64: true });
      } else {
        const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!perm.granted) {
          UI.alert("Permission Required", "Gallery permission is required.");
          return;
        }
        result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], allowsEditing: true, aspect: [1, 1], quality: 0.5, base64: true });
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
    }
  };

  const updateNotificationPref = async (key: string, value: boolean) => {
    if (!currentUser?.uid) return;
    try {
      await UserService.updateNotificationPreferences(currentUser.uid, { [key]: value });
      if (key === 'pushEnabled') {
        const NotificationService = require("@/services/notificationService").default;
        await NotificationService.handlePushToggleChange(currentUser.uid, value);
      }
    } catch (e) { console.error(e); }
  };

  const updatePrivacyPref = async (key: string, value: boolean) => {
    if (!currentUser?.uid) return;
    try {
      await UserService.updatePrivacySettings(currentUser.uid, { [key]: value });
    } catch (e) { console.error(e); }
  };

  const updateLocationRadius = async (val: number) => {
    if (!currentUser?.uid) return;
    setLocationRadius(val);
    try {
      await UserService.updateProfile(currentUser.uid, { locationRadius: val });
    } catch (e) { console.error(e); }
  };

  const handleSaveProfileInfo = async () => {
    if (isSaving) return;
    if (!name.trim()) {
      UI.error("Error", "Name cannot be empty");
      return;
    }
    setIsSaving(true);
    try {
      if (currentUser) {
        await UserService.updateProfile(currentUser.uid, {
          name: name.trim(),
          handle: handle.trim().toLowerCase().replace(/\s+/g, ""),
          bio: bio.trim(),
        });
        UI.success("Profile Saved", "Your profile information has been updated.");
      }
    } catch (e) {
      console.error(e);
      UI.error("Error", "Failed to save profile");
    } finally {
      setIsSaving(false);
    }
  };

  const handleResetPassword = async () => {
    try {
      if (!currentUser?.email) return;
      const auth = getAuth();
      await sendPasswordResetEmail(auth, currentUser.email);
      UI.success("Email Sent", "A password reset link has been sent to your email.");
    } catch (err) {
      UI.error("Error", "Failed to send reset email.");
    }
  };

  const handleLogout = () => {
    UI.confirm("Log Out", "Are you sure you want to log out?", async () => {
      try {
        await AuthService.logout();
        logout();
        router.replace("/(auth)/login");
      } catch (error) {
        UI.error("Error", "Failed to log out.");
      }
    }, "Log Out", "warning");
  };

  const handleDeleteAccount = () => {
    UI.confirm(
      "Delete Account",
      "This will permanently delete your profile, posts, messages, and all data. This action is irreversible.",
      async () => {
        try {
          setIsSaving(true);
          await AuthService.deleteAccount();
          logout();
          router.replace("/(auth)/login");
        } catch (error: any) {
          if (error?.code === "auth/requires-recent-login" || error?.message?.includes("recent-login")) {
            UI.alert("Security Verification", "Please log out and log back in to verify your identity before deleting your account.", "warning");
          } else {
            UI.error("Error", "Failed to delete account.");
          }
        } finally {
          setIsSaving(false);
        }
      },
      "Permanently Delete",
      "danger"
    );
  };

  if (isLoading) {
    return (
      <View style={[s.root, { alignItems: "center", justifyContent: "center" }]}>
        <ActivityIndicator size="small" color={T.primary} />
      </View>
    );
  }

  return (
    <View style={s.root}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <SafeAreaView style={{ flex: 1, backgroundColor: T.bg }} edges={["top"]}>
        
        <View style={s.header}>
          <TouchableOpacity onPress={() => router.back()} style={s.backBtn} activeOpacity={0.8}>
            <Ionicons name="chevron-back" size={24} color={T.text} />
          </TouchableOpacity>
          <Text style={s.headerTitle}>Settings</Text>
          <TouchableOpacity onPress={handleSaveProfileInfo} style={s.saveBtn} disabled={isSaving} activeOpacity={0.8}>
            {isSaving ? <ActivityIndicator size="small" color="#FFFFFF" /> : <Text style={s.saveText}>Save</Text>}
          </TouchableOpacity>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scroll}>
          
          <View style={s.avatarSection}>
            <Image source={{ uri: avatarUri || "https://ui-avatars.com/api/?name=Neighbor&background=F7F7F7&color=717171" }} style={s.avatar} />
            <TouchableOpacity style={s.changePhotoBtn} activeOpacity={0.7} onPress={() =>
              showSheet("Change Avatar", [
                { label: "Take Photo", action: () => handlePickImage(true) },
                { label: "Choose from Gallery", action: () => handlePickImage(false) },
              ])
            }>
              <Text style={s.changePhotoText}>Change photo</Text>
            </TouchableOpacity>
          </View>

          <View style={s.card}>
            <Text style={s.cardTitle}>PROFILE</Text>
            <View style={s.inputBox}>
              <Text style={s.inputLabel}>Full Name</Text>
              <TextInput style={s.input} value={name} onChangeText={setName} />
            </View>
            <View style={[s.inputBox, { marginTop: 12 }]}>
              <Text style={s.inputLabel}>Handle</Text>
              <TextInput style={s.input} value={handle} onChangeText={setHandle} autoCapitalize="none" />
            </View>
            <View style={[s.inputBox, { marginTop: 12 }]}>
              <Text style={s.inputLabel}>Bio</Text>
              <TextInput style={[s.input, { height: 60, textAlignVertical: "top" }]} value={bio} onChangeText={setBio} multiline maxLength={200} />
            </View>
          </View>

          <View style={s.card}>
            <Text style={s.cardTitle}>NOTIFICATIONS</Text>
            <SettingRow icon="alert-circle-outline" label="SOS Alerts" value={sosNotifications} onToggle={(val) => { setSosNotifications(val); updateNotificationPref('sos', val); }} />
            <View style={s.separator} />
            <SettingRow icon="people-outline" label="Nearby Help Requests" value={communityNotifications} onToggle={(val) => { setCommunityNotifications(val); updateNotificationPref('community', val); }} />
            <View style={s.separator} />
            <SettingRow icon="star-outline" label="Recommendations" value={recommendationNotifications} onToggle={(val) => { setRecommendationNotifications(val); updateNotificationPref('recommendations', val); }} />
            <View style={s.separator} />
            <SettingRow icon="briefcase-outline" label="Service Updates" value={serviceNotifications} onToggle={(val) => { setServiceNotifications(val); updateNotificationPref('services', val); }} />
            <View style={s.separator} />
            <SettingRow icon="chatbubble-outline" label="Messages" value={chatNotifications} onToggle={(val) => { setChatNotifications(val); updateNotificationPref('messages', val); }} />
            <View style={s.separator} />
            <SettingRow icon="megaphone-outline" label="Community Announcements" value={pushNotifications} onToggle={(val) => { setPushNotifications(val); updateNotificationPref('pushEnabled', val); }} />
          </View>

          <View style={s.card}>
            <Text style={s.cardTitle}>LOCATION</Text>
            <SettingRow icon="home-outline" label="Change Community" type="link" onPress={() => router.push("/(auth)/community-setup" as any)} />
            <View style={s.separator} />
            <SettingRow icon="location-outline" label="Update Location" type="link" onPress={() => router.push("/(auth)/location-permission" as any)} />
            <View style={s.separator} />
            <SettingRow 
              icon="radio-outline" 
              label="Location Radius" 
              value={`${locationRadius} KM`} 
              type="value" 
              onPress={() => {
                showSheet("Select Location Radius", [
                  { label: "1 KM", action: () => updateLocationRadius(1) },
                  { label: "5 KM", action: () => updateLocationRadius(5) },
                  { label: "10 KM", action: () => updateLocationRadius(10) },
                  { label: "25 KM", action: () => updateLocationRadius(25) },
                ]);
              }} 
            />
          </View>

          <View style={s.card}>
            <Text style={s.cardTitle}>PRIVACY</Text>
            <SettingRow icon="eye-outline" label="Profile Visibility" value={profileVisible} onToggle={(val) => { setProfileVisible(val); updatePrivacyPref('profileVisible', val); }} />
            <View style={s.separator} />
            <SettingRow icon="map-outline" label="Show Exact Location" value={locationVisible} onToggle={(val) => { setLocationVisible(val); updatePrivacyPref('locationVisible', val); }} />
            <View style={s.separator} />
            <SettingRow icon="navigate-outline" label="Show Distance Only" value={distanceVisible} onToggle={(val) => { setDistanceVisible(val); updatePrivacyPref('distanceVisible', val); }} />
            <View style={s.separator} />
            <SettingRow icon="mail-outline" label="Allow Direct Messages" value={allowDirectMessages} onToggle={(val) => { setAllowDirectMessages(val); updatePrivacyPref('allowDirectMessages', val); }} />
          </View>

          <View style={s.card}>
            <Text style={s.cardTitle}>LANGUAGE</Text>
            <View style={s.languageRow}>
              <View style={s.settingRowLeft}>
                <Ionicons name="language-outline" size={22} color={T.text} style={s.rowIcon} />
                <Text style={s.settingLabel}>App Language</Text>
              </View>
              <LanguageSwitcher />
            </View>
          </View>

          <View style={s.card}>
            <Text style={s.cardTitle}>ACCOUNT</Text>
            <SettingRow icon="lock-closed-outline" label="Change Password" type="link" onPress={handleResetPassword} />
            <View style={s.separator} />
            <SettingRow icon="checkmark-circle-outline" label="Email Verification Status" value={emailVerified ? "Verified" : "Unverified"} type="value" />
            <View style={s.separator} />
            <SettingRow icon="log-out-outline" label="Log Out" type="link" onPress={handleLogout} />
            <View style={s.separator} />
            <SettingRow icon="trash-outline" label="Delete Account" type="link" onPress={handleDeleteAccount} />
          </View>

          <View style={s.card}>
            <Text style={s.cardTitle}>SUPPORT</Text>
            <SettingRow icon="help-buoy-outline" label="Contact Support" type="link" onPress={() => Linking.openURL('mailto:support@neighborly.com')} />
            <View style={s.separator} />
            <SettingRow icon="warning-outline" label="Report Problem" type="link" onPress={() => Linking.openURL('mailto:support@neighborly.com?subject=Problem Report')} />
            <View style={s.separator} />
            <SettingRow icon="document-text-outline" label="Terms of Service" type="link" onPress={() => router.push("/legal/terms-of-service" as any)} />
            <View style={s.separator} />
            <SettingRow icon="shield-checkmark-outline" label="Privacy Policy" type="link" onPress={() => router.push("/legal/privacy-policy" as any)} />
          </View>

          <Text style={s.footerText}>Neighborly v1.0.0 (Production Build)</Text>
        </ScrollView>
        <ActionSheet visible={sheet.visible} title={sheet.title} options={sheet.options} onClose={() => setSheet({ ...sheet, visible: false })} />
      </SafeAreaView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: T.bg },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 12, backgroundColor: T.card, borderBottomWidth: 1, borderBottomColor: T.border },
  headerTitle: { fontSize: 18, fontWeight: "700", color: T.text },
  backBtn: { padding: 8 },
  saveBtn: { backgroundColor: T.text, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8, minWidth: 64, alignItems: "center" },
  saveText: { color: "#FFF", fontWeight: "700", fontSize: 13 },
  scroll: { paddingBottom: 60, paddingTop: 16, paddingHorizontal: 16 },
  
  avatarSection: { alignItems: "center", marginBottom: 24 },
  avatar: { width: 80, height: 80, borderRadius: 40, backgroundColor: "#EBEBEB", borderWidth: 1, borderColor: T.border, marginBottom: 8 },
  changePhotoText: { fontSize: 13, fontWeight: "600", color: T.primary, textDecorationLine: "underline" },
  changePhotoBtn: { padding: 4 },

  card: { backgroundColor: T.card, borderRadius: 16, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: T.border },
  cardTitle: { fontSize: 11, fontWeight: "800", color: T.textSecondary, letterSpacing: 0.5, marginBottom: 16 },
  
  inputBox: { borderWidth: 1, borderColor: T.border, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8 },
  inputLabel: { fontSize: 10, fontWeight: "700", color: T.textSecondary, textTransform: "uppercase", marginBottom: 4 },
  input: { fontSize: 15, color: T.text, padding: 0 },

  settingRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 12 },
  settingRowLeft: { flexDirection: "row", alignItems: "center", flex: 1 },
  rowIcon: { width: 28 },
  settingLabel: { fontSize: 15, fontWeight: "500", color: T.text },
  settingSubtitle: { fontSize: 12, color: T.textSecondary, marginTop: 2 },
  valueRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  settingValueText: { fontSize: 14, color: T.textSecondary, fontWeight: "500" },
  separator: { height: 1, backgroundColor: T.separator },
  
  languageRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 12 },
  footerText: { textAlign: "center", fontSize: 12, color: T.textSecondary, marginVertical: 24, fontWeight: "500" }
});
