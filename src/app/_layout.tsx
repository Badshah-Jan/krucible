import ConfirmationModal from "@/components/common/ConfirmationModal";
import CustomToast from "@/components/common/CustomToast";
import ErrorBoundary from "@/components/common/ErrorBoundary";
import LocationBanner from "@/components/common/LocationBanner";
import NetworkLockdown from "@/components/common/NetworkLockdown";
import "@/locales/i18n";
import { AuthService } from "@/services/authService";
import { ChatService } from "@/services/chatService";
import { app } from "@/services/firebase";
import LanguageService from "@/services/languageService";
import { LocationMonitorService } from "@/services/locationMonitorService";
import NotificationService from "@/services/notificationService";
import { UserService } from "@/services/userService";
import { useAppStore } from "@/store/appStore";
import { UI } from "@/store/uiStore";
import * as ExpoLocation from "expo-location";
import * as Notifications from "expo-notifications";
import { Stack, useRouter } from "expo-router";
import { useEffect, useRef } from "react";
import { AppState, AppStateStatus, Alert as RNAlert, LogBox } from "react-native";
import "../global.css";

// Firebase is initialized via the firebase service on app startup
if (!app) {
  console.warn("Firebase failed to initialize");
}

// Ignore Firebase internal unmount permission errors
LogBox.ignoreLogs([
  "FirebaseError: Missing or insufficient permissions",
  "@firebase/firestore",
  "auth/requires-recent-login",
  "functions/not-found",
  "FirebaseError: not-found"
]);

// ─── Global Alert Override ──────────────────────────────────────────────────
// This intercepts every native Alert.alert() call in the application
// and routes it through our new Neighborly UI design system.
const originalAlert = RNAlert.alert;
RNAlert.alert = (title, message, buttons, options) => {
  if (
    !buttons ||
    buttons.length === 0 ||
    (buttons.length === 1 && !buttons[0].onPress)
  ) {
    // Simple notification alert -> Route to Custom Toast
    const isError =
      title?.toLowerCase().includes("error") ||
      title?.toLowerCase().includes("fail") ||
      title?.toLowerCase().includes("required");
    const isSuccess =
      title?.toLowerCase().includes("success") ||
      title?.toLowerCase().includes("updated") ||
      title?.toLowerCase().includes("created");
    const isWarning = title?.toLowerCase().includes("warning");

    UI.toast(
      title || "Notification",
      isError
        ? "error"
        : isSuccess
          ? "success"
          : isWarning
            ? "warning"
            : "info",
      message || "",
    );
    return;
  }

  if (buttons.length >= 2) {
    // Confirmation alert
    const cancelBtn = buttons.find(
      (b) =>
        b.style === "cancel" ||
        b.text?.toLowerCase() === "cancel" ||
        b.text?.toLowerCase() === "no",
    );
    const confirmBtn = buttons.find((b) => b !== cancelBtn);
    const isDestructive =
      confirmBtn?.style === "destructive" ||
      title?.toLowerCase().includes("delete") ||
      title?.toLowerCase().includes("remove");

    UI.confirm(
      title || "Confirm",
      message || "Are you sure?",
      confirmBtn?.onPress || (() => {}),
      confirmBtn?.text || "Confirm",
      isDestructive ? "danger" : "warning",
      cancelBtn?.onPress,
    );
    return;
  }

  // Fallback for weird configurations
  originalAlert(title, message, buttons, options);
};

export default function RootLayout() {
  const login = useAppStore((state) => state.login);
  const logout = useAppStore((state) => state.logout);
  const setLocation = useAppStore((state) => state.setLocation);
  const setGpsDisabled = useAppStore((state) => state.setGpsDisabled);
  const setAuthInitialized = useAppStore((state) => state.setAuthInitialized);
  const router = useRouter();
  const registeredNotificationUserRef = useRef<string | null>(null);

  // Use online presence system
  useEffect(() => {
    let currentUid: string | null = null;

    const authUnsub = AuthService.onAuthStateChanged((user) => {
      if (user) {
        currentUid = user.uid;
        ChatService.updateOnlineStatus(user.uid, true).catch(() => {});
      } else {
        if (currentUid) {
          ChatService.updateOnlineStatus(currentUid, false).catch(() => {});
        }
        currentUid = null;
      }
    });

    const handleAppStateChange = (nextState: AppStateStatus) => {
      if (!currentUid) return;
      if (nextState === "background") {
        ChatService.updateOnlineStatus(currentUid, false).catch(() => {});
      } else if (nextState === "active") {
        ChatService.updateOnlineStatus(currentUid, true).catch(() => {});
      }
    };

    const appStateSubscription = AppState.addEventListener(
      "change",
      handleAppStateChange,
    );

    return () => {
      authUnsub();
      appStateSubscription.remove();
      if (currentUid) {
        ChatService.updateOnlineStatus(currentUid, false).catch(() => {});
      }
    };
  }, []);

  // Foreground Notification Handler - Shows toast when notification arrives while app is open
  useEffect(() => {
    const subscription = Notifications.addNotificationReceivedListener(
      (notification) => {
        const { title, body, data } = notification.request.content;
        console.log("[Notification] Notification received in foreground:", title, body, data);

        // Show as in-app toast (uses UI store we already have)
        if (title) {
          UI.toast(title, "info", body || "");
        }
      },
    );

    return () => {
      subscription.remove();
    };
  }, []);

  // Deep Link Handler - Navigates to correct screen when notification is tapped from system drawer
  useEffect(() => {
    const subscription = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        const data = response.notification.request.content.data;

        if (!data) return;

        console.log("[Notification] Notification tapped with data:", data);

        // Route based on notification type
        switch (data.type) {
          case "sos_alert":
            if (data.sosId) {
              console.log("[Navigation] Executed navigation to SOS:", data.sosId);
              router.push(`/sos/${data.sosId}`);
            }
            break;

          case "comment":
          case "comment_reply":
          case "help_request":
          case "like_notification":
            if (data.postId) {
              console.log("[Navigation] Executed navigation to Post:", data.postId);
              router.push(`/post/${data.postId}`);
            }
            break;
          case "direct_message":
          case "chat_message":
            if (data.chatId) {
              console.log("[Navigation] Executed navigation to Chat:", data.chatId);
              router.push(`/chat/${data.chatId}`);
            }
            break;

          case "karma_reward":
            console.log("[Navigation] Executed navigation to Karma");
            router.push("/karma");
            break;

          case "community_update":
          case "recommendation":
          case "lost_found":
            if (data.postId) {
              console.log("[Navigation] Executed navigation to Community Post:", data.postId);
              router.push(`/post/${data.postId}`);
            }
            break;

          default:
            console.log("[Navigation] Unknown notification type:", data.type);
            break;
        }
      },
    );

    return () => {
      subscription.remove();
    };
  }, [router]);

  useEffect(() => {
    // Initialize localization on boot
    LanguageService.initLanguage();

    const unsubscribe = AuthService.onAuthStateChanged(async (user) => {
      if (user) {
        if (!AuthService.isAccountAccessAllowed(user)) {
          logout();
          setAuthInitialized(true);
          return;
        }

        login();

        if (
          registeredNotificationUserRef.current &&
          registeredNotificationUserRef.current !== user.uid
        ) {
          NotificationService.unregisterPushToken(
            registeredNotificationUserRef.current,
          ).catch(console.warn);
        }
        registeredNotificationUserRef.current = user.uid;

        // ── Restore location/community from Firestore on every app start ──
        try {
          let profile: any = null;
          let profileLoadError: any = null;
          
          try {
            profile = await UserService.getOwnProfile(user.uid);
          } catch (fetchError: any) {
            profileLoadError = fetchError;
            // Distinguish permission errors from genuine missing profiles.
            // If it's a Firestore permissions error, don't treat it as a ghost account.
            const isPermissionError = 
              fetchError?.code === 'permission-denied' ||
              fetchError?.message?.includes('Missing or insufficient permissions') ||
              fetchError?.message?.includes('permission-denied');
            
            if (isPermissionError) {
              console.warn("[Auth] Could not load profile (permissions). Proceeding without community restore.");
              // Don't delete — this is a Firestore rules issue, not a missing account
            } else {
              console.error("[Auth] Unexpected profile load error:", fetchError);
            }
          }
          
          if (!profile && !profileLoadError) {
            // Only force-delete if the profile is definitively missing AND it's not a brand new signup.
            // (Brand new signups won't have a profile for ~500ms while login.tsx creates it)
            const creationTime = new Date(user.metadata?.creationTime || 0).getTime();
            const isBrandNewUser = Date.now() - creationTime < 2 * 60 * 1000; // < 2 minutes old
            
            if (isBrandNewUser) {
              console.log("[Auth] Brand new user detected without profile yet. Giving login screen time to create it.");
              // Do not return here, let auth initialize so login.tsx can do its job.
            } else {
              console.warn("[Auth] User document genuinely missing. Forcing ghost account deletion.");
              try { await user.delete(); } catch { await AuthService.logout(); }
              logout();
              setAuthInitialized(true);
              return;
            }
          }

          if (profile?.latitude && profile?.longitude && profile?.communityId) {
            // Restore saved community into Zustand
            setLocation(
              { lat: profile.latitude, lng: profile.longitude },
              {
                name:
                  profile.communityName ||
                  profile.district ||
                  profile.city ||
                  "Your Area",
                area: profile.neighborhood || profile.district || "",
                district: profile.district || "",
                city: profile.city || "",
                country: profile.country || "",
                communityId: profile.communityId,
              },
            );

            // ── GPS gate: even with a saved community, GPS must be on ──
            try {
              const { status } =
                await ExpoLocation.getForegroundPermissionsAsync();
              if (status === "granted") {
                const gpsOn = await ExpoLocation.hasServicesEnabledAsync();
                setGpsDisabled(!gpsOn);
              }
              // If permission not granted → setGpsDisabled(false), let
              // location-permission screen handle the flow
            } catch (_) {}
          }
        } catch (error) {
          console.error("Error restoring user location:", error);
        } finally {
          setAuthInitialized(true);
          // Start background GPS & permission monitoring
          LocationMonitorService.initialize();
          // Register for push notifications (multi-device aware)
          NotificationService.registerForPushNotificationsAsync(user.uid).catch(
            console.warn,
          );
        }

        // Routing is handled by index.tsx
      } else {
        if (registeredNotificationUserRef.current) {
          NotificationService.unregisterPushToken(
            registeredNotificationUserRef.current,
          ).catch(console.warn);
          registeredNotificationUserRef.current = null;
        }
        logout();
        LocationMonitorService.stopMonitoring();
      }
    });
    return () => {
      unsubscribe();
      LocationMonitorService.stopMonitoring();
    };
  }, []);

  return (
    <ErrorBoundary>
      <CustomToast />
      <ConfirmationModal />
      <LocationBanner />
      <NetworkLockdown />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(tabs)" />
      </Stack>
    </ErrorBoundary>
  );
}
