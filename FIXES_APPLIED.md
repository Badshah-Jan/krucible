# Bug Fixes Applied - June 7, 2026

## ✅ Fixed Issues

### 1. **UI Store Reference Error** ✅ FIXED

**Problem:** `ReferenceError: Property 'UI' doesn't exist` in `src/app/settings/index.tsx`

**Root Cause:** The settings screen was using `UI.toast()` but didn't import `UI` from uiStore.

**Fix Applied:**

- ✅ Added import: `import { UI } from '@/store/uiStore';` to `src/app/settings/index.tsx`
- ✅ Now `toggleNotificationPref()` can properly call `UI.toast()` to show error notifications

**Status:** Ready to test

---

### 2. **expo-av Deprecation** ✅ IN PROGRESS

**Problem:** `WARN [expo-av]: Expo AV has been deprecated and will be removed in SDK 54`

**Work Done:**

- ✅ Removed `expo-av ~16.0.8` from package.json
- ✅ Added new packages:
  - `expo-audio ^14.0.0` (for audio playback)
  - `expo-video ^14.0.0` (for video playback)
- ✅ Updated `src/app/sos/index.tsx` to use new `expo-audio` API:
  - Changed `Audio.setAudioModeAsync()` → `Audio.setAudioMode()`
  - Changed `Audio.Sound.createAsync()` → `new Audio.Sound()` with `loadAsync()`
  - Updated sound methods: `unloadAsync()` → `release()`, `stop()` instead

**Next Steps:**

```bash
npm install
# or
yarn install
```

**Status:** Awaiting dependency installation

---

### 3. **Firebase FCM Not Initialized (Android)** ⚠️ REQUIRES MANUAL SETUP

**Problem:** `Error: Default FirebaseApp is not initialized in this process com.neighborly.app`

**Root Cause:** Android native Firebase initialization requires google-services.json configuration

**Work Done:**

- ✅ Added explicit Firebase import to root layout (`src/app/_layout.tsx`)
- ✅ Firebase Web SDK is properly initialized in `src/services/firebase.ts`

**⚠️ Manual Setup Required - Follow These Steps:**

1. **Get FCM Credentials from Firebase Console:**
   - Go to: https://console.firebase.google.com/
   - Select project: `neighborly-b7dd2`
   - Navigate to: Settings → Project Settings → Service Accounts
   - Click "Generate New Private Key" to download JSON credentials

2. **Download google-services.json:**
   - In Firebase Console: Settings → General
   - Scroll to "Your apps" section
   - Find Android app `com.neighborly.app`
   - Click "Download google-services.json"
   - Place in: `android/app/google-services.json`

3. **Verify Android Gradle Configuration:**
   - Check `android/build.gradle` has:
     ```gradle
     buildscript {
       dependencies {
         classpath 'com.google.gms:google-services:4.3.15'
       }
     }
     ```
   - Check `android/app/build.gradle` has:
     ```gradle
     apply plugin: 'com.google.gms.google-services'
     ```

4. **Follow Expo FCM Guide:**
   - Reference: https://docs.expo.dev/push-notifications/fcm-credentials/

**Reference Documentation:**

- https://docs.expo.dev/versions/v56.0.0/sdk/notifications/
- https://docs.firebase.google.com/guides/android/setup

**Status:** Awaiting manual Firebase & Android setup

---

## 📋 Next Steps

### Immediate (Before Testing):

```bash
# 1. Install new dependencies
npm install
# or yarn install

# 2. Clean build cache
rm -rf node_modules/.bin
rm -rf .expo

# 3. Run app
npm start
# Select 'a' for Android
```

### Before SOS Audio Works:

- Complete Firebase/FCM setup (Step 3 above)
- Verify google-services.json is in place
- Rebuild Android with: `eas build --platform android`

---

## 🔍 Files Modified

1. ✅ `src/app/settings/index.tsx` - Added UI import
2. ✅ `src/app/sos/index.tsx` - Migrated from expo-av to expo-audio
3. ✅ `src/app/_layout.tsx` - Added Firebase initialization import
4. ✅ `package.json` - Removed expo-av, added expo-audio & expo-video

---

## ⚠️ Remaining Warnings to Ignore (For Now)

These warnings are not blocking and can be addressed later:

- Android bundling warnings are normal during development
- Reload cycles are expected in Expo development

---

## 💡 Testing Checklist

- [ ] Run `npm install` successfully
- [ ] App starts without "UI doesn't exist" error
- [ ] Settings screen loads properly
- [ ] Notification preferences can be toggled
- [ ] SOS screen loads (even if alarm doesn't work yet)
- [ ] After FCM setup: SOS alarm audio works
- [ ] After FCM setup: Push notifications received

---

## 📞 Support

If you encounter issues:

1. **Clear cache and reinstall:**

   ```bash
   rm -rf node_modules package-lock.json
   npm install
   ```

2. **Check if expo-audio is properly installed:**

   ```bash
   npm list expo-audio
   ```

3. **Verify Firebase config:**
   - Check `src/services/firebase.ts` has valid config
   - Ensure credentials aren't exposed in public repo

4. **For FCM issues:**
   - Verify google-services.json path
   - Check Android build.gradle configuration
   - Clear Android build: `cd android && ./gradlew clean && cd ..`
