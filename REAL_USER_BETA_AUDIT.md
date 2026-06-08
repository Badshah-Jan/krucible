# Neighborly Real User Beta Testing Audit

## 1. Critical Bugs
- **Missing Global Error Boundary**: There is no <ErrorBoundary> wrapper in src/app/_layout.tsx. Any unhandled JavaScript exception (e.g., rendering undefined from a partial Firestore document) will cause a fatal white-screen crash in production rather than gracefully recovering.
- **Online Presence System Failure**: The ChatService.updateOnlineStatus method is strictly bound to the mount/unmount lifecycle of src/app/chat/[id].tsx. If a user is navigating the feed or app normally, they appear "Offline". They only appear "Online" to others while actively staring at a specific chat screen. Navigating away immediately marks them offline.

## 2. Medium Bugs
- **KeyboardAvoidingView UI Jump (Android)**: In src/app/chat/[id].tsx and src/app/post/create.tsx, KeyboardAvoidingView uses ehavior="padding" unconditionally on iOS but sets it to undefined on Android. Given Expo's default djustResize window behavior, this can still cause input fields to be hidden behind the keyboard on some Android manufacturer skins (Samsung/Xiaomi) or cause double-padding jumps.
- **Firestore Offline Persistence Missing**: In src/services/firebase.ts, getFirestore(app) is initialized without a persistent local cache (initializeFirestore({ localCache: ... })). Because this project uses the Firebase Web SDK in React Native, offline mode defaults to memory cache only. If a user opens the app without an internet connection, they will see empty screens instead of locally cached posts/chats.

## 3. Minor Bugs
- **Avatar Fallback Color Logic**: In src/app/(tabs)/chats.tsx, the fallback avatar color hashes the user's name. If 
ame is undefined/empty, this will throw an error and crash the Chats screen.
- **Location Guard Fallback**: In useLocationGuard.ts, if the OS-level GPS is off but the user denied permissions, the fallback opens App Settings rather than Android Location Settings on some device branches.

## 4. Performance Issues
- **SEVERE UI Thread Bottleneck (Lists)**: The Home Feed (src/app/(tabs)/index.tsx) and Explore Feed (src/app/(tabs)/explore.tsx) render arrays of post cards using .map() inside a standard <ScrollView>. This forces React Native to render *every single post* immediately, bypassing cell recycling. On a low-end Android device, scrolling past 20-30 posts will cause severe frame drops, lag, and out-of-memory crashes.
  *Fix*: Refactor ScrollView + .map to use <FlatList> or <FlashList> with initialNumToRender and keyExtractor.

## 5. Notification Issues
- **Background Tap Handling Race Condition**: The ddNotificationResponseReceivedListener in _layout.tsx routes the user to outer.push('/post/ID'). However, if the app is launched from a completely killed state, the root layout may attempt navigation before the navigation tree is fully mounted and ready, occasionally ignoring the deep link.

## 6. Chat Issues
- **Typing Indicator Ghosting**: setTypingStatus is bound to text input changes, but if the app is suddenly backgrounded or the user loses internet connection while typing, the typing status remains stuck as 	rue in Firestore until the timeout clears it (which is not implemented on the server side).

## 7. SOS Issues
- **Accidental Trigger Vulnerability**: The SOS button in src/app/sos/index.tsx requires a hold, but the vibration feedback (Vibration.vibrate(50)) triggers immediately on press. A user trying to scroll past the SOS card might accidentally trigger the first phase of the SOS protocol, causing UI panic.

## 8. Location Issues
- **Geocoding API Limits**: LocationService.reverseGeocode relies on Expo Location's native geocoder. On Android, this hits the Google Play Services geocoder, which can rate-limit or fail silently on Huawei devices without GMS. A fallback to Google Maps Geocoding API is required for full reliability.

## 9. UI/UX Issues
- **Overlapping Safe Areas**: Top padding is applied via SafeAreaView in index.tsx. However, Android devices with punch-hole cameras may experience inconsistent header spacing because React Navigation's default header is disabled (headerShown: false) but status bar translucency is forced.

## 10. Beta Launch Recommendations
1. **Mandatory Refactor**: Convert the Home and Explore ScrollViews to FlatList. Do not launch the beta without this, as users will abandon the app due to lag.
2. **Move Presence to Root**: Move the updateOnlineStatus listener to the root _layout.tsx tied to AppState (foreground/background) rather than the chat screen lifecycle.
3. **Add Global Error Boundary**: Wrap the root layout in an Error Boundary that presents a fallback "Something went wrong" UI with a "Reload App" button.
4. **Fix Android Keyboard**: Test chat specifically on an Android physical device to verify if KeyboardAvoidingView behaves correctly with the manifest's djustResize setting.
