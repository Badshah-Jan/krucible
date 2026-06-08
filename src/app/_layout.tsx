import ConfirmationModal from "@/components/common/ConfirmationModal";
import CustomToast from "@/components/common/CustomToast";
import ErrorBoundary from "@/components/common/ErrorBoundary";
import LocationBanner from "@/components/common/LocationBanner";
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
import { AppState, AppStateStatus, Alert as RNAlert } from "react-native";
import "../global.css";

// Firebase is initialized via the firebase service on app startup
if (!app) {
  console.warn("Firebase failed to initialize");
}

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
        const { title, body } = notification.request.content;

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

        console.log("[Notification] Tapped:", data.type, data);

        // Route based on notification type
        switch (data.type) {
          case "sos_alert":
          case "comment":
          case "comment_reply":
          case "help_request":
          case "like_notification":
            if (data.postId) {
              console.log("[Navigation] → Post:", data.postId);
              router.push(`/post/${data.postId}`);
            }
            break;

          case "direct_message":
          case "chat_message":
            if (data.chatId) {
              console.log("[Navigation] → Chat:", data.chatId);
              router.push(`/chat/${data.chatId}`);
            }
            break;

          case "karma_reward":
            console.log("[Navigation] → Karma");
            router.push("/karma");
            break;

          case "community_update":
          case "recommendation":
          case "lost_found":
            if (data.postId) {
              console.log("[Navigation] → Community Post:", data.postId);
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
          const profile = await UserService.getUser(user.uid);
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
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(tabs)" />
      </Stack>
    </ErrorBoundary>
  );
}
