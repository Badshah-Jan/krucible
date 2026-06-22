# Neighborly — Launch Compliance Audit Report
**Generated:** 2025  
**App Version:** 1.0.0  
**Platform Targets:** Google Play Store + Apple App Store  
**Stack:** Expo (React Native) · Firebase Auth/Firestore · Cloudinary · Resend · Expo Notifications

---

## STEP 1 — MONETIZATION & TRACKING APPLICABILITY REPORT

### ✅ What Was Audited

| Feature | Finding | Evidence |
|---|---|---|
| Paid Subscriptions | ⚠️ PARTIAL — Admin-approved only | `premium.tsx` shows $9.99/mo UI; `requestPremiumUpgrade` Cloud Function submits a pending request; admin manually approves in `approvePremiumSubscription` |
| Google Play Billing / Apple IAP | ❌ NOT IMPLEMENTED | No `expo-in-app-purchases`, no `react-native-purchases`, no billing SDK in `package.json` |
| Auto-Renewing Purchases | ❌ NOT IMPLEMENTED | No subscription lifecycle, no renewal hooks, no receipt validation |
| Free Trials | ❌ NOT IMPLEMENTED | Not present anywhere |
| In-App Purchases (consumables) | ❌ NOT IMPLEMENTED | No purchase flow |
| Advertising | ❌ NOT IMPLEMENTED | No ad SDK, no AdMob, no ad references |
| Third-Party Analytics | ❌ NOT IMPLEMENTED | No Firebase Analytics, no Mixpanel, no Amplitude, no Segment |
| User Tracking / IDFA | ❌ NOT IMPLEMENTED | No `expo-tracking-transparency`, no ATT prompt |
| Third-Party Tracking SDKs | ❌ NOT IMPLEMENTED | Only SDKs: Firebase (Auth/Firestore/Functions), Cloudinary (image storage), Resend (email), Google Sign-In |

### ⚠️ Premium Flow Clarification

The current premium system is NOT a real billing system. It is a **manual upgrade request workflow**:
1. User taps "Subscribe Now" → submits a Firestore document to `subscription_requests`
2. Admin reviews and approves/rejects via admin panel
3. No money changes hands inside the app — no payment SDK exists

**Compliance impact:** Because no payment is processed inside the app, Google Play Billing and Apple IAP requirements **do not apply** at this time. However, if the `$9.99/mo` pricing language is visible to users, both stores may scrutinize this as an **implied subscription claim** (see Mandatory Items below).

---

## STEP 2 — DATA COLLECTED (Privacy Audit)

### Data Collected & Stored in Firestore

| Data Type | Collected | Where | Purpose |
|---|---|---|---|
| Email address | ✅ | `users/{uid}.email` | Auth, notifications, welcome email |
| Full name | ✅ | `users/{uid}.name` | Profile display |
| Handle (username) | ✅ | `users/{uid}.handle` | Profile identity |
| Bio | ✅ | `users/{uid}.bio` | Profile display |
| Profile photo | ✅ | Cloudinary CDN + `users/{uid}.photoURL` | Profile display |
| GPS coordinates (lat/lng) | ✅ | `users/{uid}.latitude/longitude` | Community assignment, SOS radius |
| Neighborhood / district / city | ✅ | `users/{uid}.neighborhood/district/city` | Community grouping |
| Community ID | ✅ | `users/{uid}.communityId` | Feed & chat scoping |
| Posts & post content | ✅ | `posts/{postId}` | Community feed |
| Comments | ✅ | `posts/{postId}/comments/{commentId}` | Post discussion |
| Direct messages | ✅ | `conversations/{id}/messages/{id}` | Private & community chat |
| SOS alert data | ✅ | `sos_alerts/{id}` | Emergency coordination |
| Emergency contacts (name, phone) | ✅ | `users/{uid}.emergencyContacts[]` | SOS feature |
| Push notification tokens (FCM) | ✅ | `users/{uid}.fcmToken/fcmTokens` | Push delivery |
| Online presence / last seen | ✅ | `users/{uid}.isOnline/lastSeen` | Chat UI |
| Notification preferences | ✅ | `users/{uid}.notificationPreferences` | Notification control |
| Privacy settings | ✅ | `users/{uid}.privacySettings` | User control |
| Blocked users list | ✅ | `users/{uid}.blockedUsers[]` | Safety |
| Karma score & history | ✅ | `users/{uid}.karma` + subcollection | Reputation |
| Business/service listings | ✅ | `businesses/`, `services/` | Marketplace |
| Reports submitted | ✅ | `reports/` | Moderation |
| Security events | ✅ | `security_events/` | Abuse detection |
| Rate limit records | ✅ | `rate_limits/` | Anti-abuse |
| IP address / device info | ❌ | Not stored | N/A |
| Browsing history | ❌ | Not collected | N/A |
| Payment info | ❌ | Not collected | N/A |
| Contacts (device) | ❌ | Not accessed | N/A |

### Data Shared with Third Parties

| Party | Data Shared | Purpose | Location |
|---|---|---|---|
| Google Firebase | Email, UID, auth tokens | Auth + database | Firebase servers |
| Cloudinary | Profile photos, post images, business images | Image hosting/CDN | `cloudinaryService.ts` |
| Resend | Email address, name | Welcome emails, transactional email | `functions/index.js` |
| Google Sign-In | OAuth token | Social login | `authService.ts` |
| Expo Push Service | FCM tokens, notification payloads | Push notifications | `notificationService.ts` |

**No advertising networks. No analytics platforms. No data brokers.**

### Data Encryption

- **In transit:** All Firebase/Firestore traffic is TLS-encrypted by default
- **At rest:** Firebase encrypts data at rest by default (Google infrastructure)
- **Cloudinary:** HTTPS CDN delivery enforced (`secure_url` always used)
- **Local storage:** AsyncStorage used only for session tokens and cooldown timestamps (no PII stored locally beyond auth tokens managed by Firebase SDK)

### Account Deletion

✅ **Fully implemented.** `AuthService.deleteAccount()` + `UserService.cleanupUserData()` deletes:
- User profile document
- All posts, comments, messages
- Business and service listings + images (Cloudinary cleanup)
- SOS alerts, reports, notifications, karma history
- Conversation participation
- Follower/following relationships
- Firebase Auth account

---

## STEP 3 — GOOGLE PLAY DATA SAFETY

### Data Collected (for Play Console form)

| Category | Data Type | Collected | Shared | Purpose | Optional? |
|---|---|---|---|---|---|
| Personal info | Name | ✅ | No | App functionality | No |
| Personal info | Email address | ✅ | No (used server-side for email delivery) | Account management | No |
| Personal info | Profile photo | ✅ | No (hosted on Cloudinary) | Profile display | Yes |
| Personal info | User bio/handle | ✅ | No | Profile display | Yes |
| Location | Approximate location | ✅ | No | Community matching | No |
| Location | Precise location | ✅ | No | SOS alerts, post geotagging | Yes (user can disable) |
| Messages | Emails or text messages | ✅ | No | In-app messaging | No |
| Photos & videos | Photos | ✅ | No | Posts, profile | Yes |
| App activity | In-app search history | No | No | — | — |
| App activity | Other user-generated content (posts) | ✅ | No | Community feed | No |
| App info & performance | Crash logs | No (not implemented) | No | — | — |
| Device or other IDs | Device ID | No | No | — | — |

### Data Safety Answers

- **Does your app collect or share any of the required user data types?** YES
- **Is all of the user data collected by your app encrypted in transit?** YES
- **Do you provide a way for users to request that their data is deleted?** YES (Settings → Delete Account)
- **Is this app primarily directed to children?** NO

---

## STEP 4 — TERMS & CONDITIONS REQUIREMENTS

### Required Sections (Based on Actual Features)

1. **Acceptance of Terms** — Standard acceptance clause

2. **Account Registration**
   - Email/password and Google Sign-In
   - Email verification required for posting
   - One account per person

3. **Community Content Disclaimer**
   - User-generated posts, comments, and messages are not reviewed before publication
   - Neighborly is not responsible for accuracy of community content
   - Content may be removed if it violates community guidelines

4. **Marketplace Disclaimer**
   - Business and service listings are created by users
   - Neighborly does not verify qualifications, licenses, or credentials of listed providers
   - Neighborly is not a party to any transaction between users and service providers
   - Users engage with providers at their own risk

5. **Service Provider Disclaimer**
   - Premium listing status indicates admin-approved visibility boost only
   - Premium does not constitute endorsement, certification, or guarantee of service quality
   - The `$9.99/mo` premium fee is an administrative service charge — not a platform transaction

6. **Chat Disclaimer**
   - Direct messages and community chat are provided as a convenience feature
   - Neighborly is not responsible for content exchanged in chats
   - Users should not share sensitive personal or financial information in chat
   - First-time DM safety warning is displayed (implemented in `TrustSafetyService`)

7. **SOS / Emergency Disclaimer** ⚠️ **CRITICAL**
   - The SOS feature is a community coordination tool only
   - It is NOT a substitute for official emergency services (911, 112, 15, etc.)
   - Response times and responder availability are not guaranteed
   - Misuse of SOS alerts (fake/repeated alerts) may result in account suspension
   - Neighborly bears no liability for outcomes arising from reliance on SOS responses

8. **Location Data**
   - Location is used for community matching and SOS radius calculations
   - Precise GPS is only shared in SOS alerts and user-controlled posts
   - Users can disable precise location visibility in Settings

9. **Karma System**
   - Karma points have no monetary value
   - Karma cannot be transferred, sold, or redeemed

10. **Content Moderation**
    - Users may report content via the in-app report system
    - Neighborly reserves the right to remove content and suspend accounts
    - Admin and moderator roles have elevated access to enforce guidelines

11. **Governing Law & Limitation of Liability**

12. **Changes to Terms**

---

## STEP 5 — USER SAFETY AUDIT

### Implemented ✅

| Feature | Status | Location |
|---|---|---|
| Report User | ✅ | `ReportModal.tsx` + `TrustSafetyService.submitReport()` |
| Report Post | ✅ | `ReportModal.tsx` (targetType: "post") |
| Report Comment | ✅ | `ReportModal.tsx` (targetType: "comment") |
| Report Message | ✅ | `ReportModal.tsx` (targetType: "message") |
| Report Business/Service | ✅ | `ReportModal.tsx` (targetType: "business"/"service") |
| Block User | ✅ | `UserService.blockUser()` + settings/blocked-users screen |
| Unblock User | ✅ | `UserService.unblockUser()` + blocked users list |
| Admin moderation tools | ✅ | `admin/src/pages/` — Users, Posts, SOS, Security panels |
| Moderator role | ✅ | `roles.ts` + Firestore rules |
| Auto-flag on threshold reports | ✅ | `TrustSafetyService.checkAndFlagUser()` (3 reports = flag) |
| Admin suspension | ✅ | `TrustSafetyService.suspendUser()` |
| Admin warning notification | ✅ | `TrustSafetyService.warnUser()` |
| SOS abuse detection | ✅ | `TrustSafetyService.checkSOSAbuse()` (3/day, 7/week limits) |
| First-time chat safety warning | ✅ | `TrustSafetyService.shouldShowChatSafetyWarning()` |
| Emergency contacts | ✅ | `UserService` + settings/emergency-contacts screen |
| Privacy controls (location, profile) | ✅ | `UserService.updatePrivacySettings()` |
| Duplicate report prevention | ✅ | `TrustSafetyService.submitReport()` queries before creating |
| Rate limiting (anti-spam) | ✅ | `SecurityService` + Cloud Functions |

### Missing / Gaps Identified ⚠️

| Gap | Severity | Notes |
|---|---|---|
| No "mute user" feature | Low | Block exists; mute is optional enhancement |
| Report reasons don't include "underage user" | Medium | Recommended for stores |
| No in-app content appeal process | Low | Reports are admin-only reviewed |
| Community Guidelines screen exists but links to `/support/guidelines` (not yet confirmed as a full policy screen) | Medium | Needs a proper written guidelines page |
| No age gate / age verification | Medium | App appears to be 13+ but no age check on signup |

---

## STEP 6 — APP STORE COMPLIANCE

### Apple App Store

| Requirement | Status | Notes |
|---|---|---|
| Account Deletion | ✅ | Implemented in Settings > Danger Zone |
| Privacy Policy URL | ⚠️ MISSING | `about.tsx` links to `https://example.com/privacy` — PLACEHOLDER, must be replaced with a real hosted URL |
| Terms of Service URL | ⚠️ MISSING | Links to `https://example.com/terms` — PLACEHOLDER |
| Location Usage Description | ⚠️ MISSING | `app.json` has no `NSLocationWhenInUseUsageDescription` or `NSLocationAlwaysUsageDescription` strings |
| Notification Permission Description | ⚠️ MISSING | No `expo-notifications` description string in `app.json` |
| Camera Usage Description | ⚠️ MISSING | Camera is accessed via `expo-image-picker` but no `NSCameraUsageDescription` in `app.json` |
| Photo Library Description | ⚠️ MISSING | `NSPhotoLibraryUsageDescription` not set in `app.json` |
| ATT (App Tracking Transparency) | ✅ NOT REQUIRED | No third-party tracking SDKs present |
| Age Rating | ⚠️ NEEDS SETTING | Must be set during App Store Connect submission (recommend 12+ or 17+ due to community messaging and SOS) |
| COPPA Compliance | ⚠️ REVIEW | No age gate exists; if targeting 13+ must state so in metadata |
| Subscription / IAP disclosure | ⚠️ REVIEW | "$9.99/mo" language visible to users — Apple may flag if no IAP is registered |

### Google Play Store

| Requirement | Status | Notes |
|---|---|---|
| Account Deletion | ✅ | Implemented |
| Privacy Policy URL | ⚠️ MISSING | Placeholder URL must be replaced |
| Data Safety Form | ⚠️ INCOMPLETE | Must be filled in Play Console based on Step 3 above |
| Location Permission Rationale | ⚠️ MISSING | No rationale strings configured |
| Prominent Disclosure (location) | ✅ | `location-permission.tsx` and `gps-enable.tsx` screens exist — explicit permission request flow |
| Foreground location only | ✅ | Only `requestForegroundPermissionsAsync()` used — no background location |
| Target API Level | ⚠️ VERIFY | Must target API 34+ for 2024 submissions |
| Google Play Billing | ✅ NOT REQUIRED | No in-app purchases implemented |
| Content Rating | ⚠️ NEEDS QUESTIONNAIRE | Must complete in Play Console |
| Sensitive permissions (camera, location) | ⚠️ MUST JUSTIFY | Requires permissions declaration and use-case justification |

---

## FINAL REPORT

---

### 1. MANDATORY COMPLIANCE ITEMS

| # | Item | Priority | Action |
|---|---|---|---|
| M1 | Replace placeholder Privacy Policy URL (`https://example.com/privacy`) with a real hosted policy | 🔴 CRITICAL | Must do before submission |
| M2 | Replace placeholder Terms of Service URL (`https://example.com/terms`) | 🔴 CRITICAL | Must do before submission |
| M3 | Add iOS permission description strings to `app.json` (location, camera, photo library, notifications) | 🔴 CRITICAL | App will be rejected without these |
| M4 | Complete Google Play Data Safety form in Play Console | 🔴 CRITICAL | Required for all Play submissions |
| M5 | Add SOS disclaimer to T&C — "not a substitute for emergency services" | 🔴 CRITICAL | Liability requirement |
| M6 | Add marketplace disclaimer to T&C | 🔴 HIGH | Required for community marketplace |
| M7 | Remove or clarify "$9.99/mo" language OR register an in-app purchase product | 🔴 HIGH | Both stores may reject implied billing without IAP registration |
| M8 | Set content/age rating in both App Store Connect and Play Console | 🔴 HIGH | Required for submission |

---

### 2. OPTIONAL COMPLIANCE ITEMS

| # | Item | Priority | Notes |
|---|---|---|---|
| O1 | Add "underage user" to report reasons | 🟡 MEDIUM | Good practice, store-friendly |
| O2 | Add a written Community Guidelines page (currently just a button linking elsewhere) | 🟡 MEDIUM | Supports safety compliance |
| O3 | Add age confirmation checkbox on signup | 🟡 MEDIUM | Demonstrates 13+ enforcement |
| O4 | Add "mute user" feature | 🟢 LOW | Enhancement, not required |
| O5 | Add crash reporting (e.g. Sentry or Firebase Crashlytics) | 🟢 LOW | Improves post-launch quality |

---

### 3. GOOGLE PLAY REQUIREMENTS

| Requirement | Status |
|---|---|
| Privacy Policy hosted URL | ❌ Needs real URL |
| Data Safety form completed | ❌ Must fill in Play Console |
| Target SDK API 34+ | ⚠️ Verify in `android/app/build.gradle` |
| Account deletion flow | ✅ Implemented |
| Foreground-only location | ✅ Compliant |
| Location permission rationale UI | ✅ Screens exist (`gps-enable.tsx`, `location-permission.tsx`) |
| No background tracking | ✅ Compliant |
| No undeclared billing | ✅ No billing SDK present |
| Content rating questionnaire | ❌ Must complete in Play Console |
| Prominent disclosure for sensitive permissions | ✅ Partial — location screens exist |

---

### 4. APP STORE REQUIREMENTS

| Requirement | Status |
|---|---|
| Privacy Policy URL in app metadata | ❌ Placeholder only |
| Account deletion (GDPR/App Store guideline 5.1.1) | ✅ Implemented |
| `NSLocationWhenInUseUsageDescription` | ❌ Missing from `app.json` |
| `NSCameraUsageDescription` | ❌ Missing from `app.json` |
| `NSPhotoLibraryUsageDescription` | ❌ Missing from `app.json` |
| Notification permission description | ❌ Missing from `app.json` |
| ATT prompt (App Tracking Transparency) | ✅ Not required — no tracking |
| Age rating set in App Store Connect | ❌ Must set during submission |
| IAP / StoreKit compliance | ✅ Not required — no purchases |
| Guideline 1.2 (user-generated content safety) | ✅ Report + block + moderation present |
| No placeholder/example links in production | ❌ `example.com` URLs must be removed |

---

### 5. PRIVACY REQUIREMENTS

| Requirement | Status |
|---|---|
| Privacy Policy exists | ❌ Placeholder URL only |
| Policy covers: email, name, photo, location, messages | ❌ Policy not written yet |
| Policy covers: community data, posts, SOS data | ❌ Policy not written yet |
| Policy covers: third parties (Firebase, Cloudinary, Resend, Google) | ❌ Not written yet |
| Data retention period disclosed | ❌ Not disclosed |
| User data deletion described | ❌ Not in policy |
| Location data use disclosed | ❌ Not in policy |
| Contact info (support email) in policy | ❌ Not in policy |
| Policy hosted at permanent URL | ❌ Not hosted yet |

---

### 6. LEGAL REQUIREMENTS

| Requirement | Status |
|---|---|
| Terms of Service exists | ❌ Placeholder URL only |
| SOS emergency disclaimer | ❌ Not written |
| Marketplace disclaimer | ❌ Not written |
| Service provider disclaimer | ❌ Not written |
| Chat safety disclaimer | ⚠️ Partial — safety banner exists in UI but no legal T&C |
| Limitation of liability clause | ❌ Not written |
| Governing law clause | ❌ Not written |
| Community content disclaimer | ❌ Not written |
| Age/eligibility requirements stated | ❌ Not written |

---

### 7. MISSING COMPLIANCE FEATURES

| Feature | Gap | Fix |
|---|---|---|
| `app.json` iOS permission strings | All 4 description strings missing | Add `infoPlist` section (see below) |
| Real Privacy Policy page | Only `example.com` placeholder | Write and host privacy policy; update URL in `about.tsx` |
| Real Terms of Service page | Only `example.com` placeholder | Write and host T&C; update URL in `about.tsx` |
| "$9.99/mo" subscription claim | No billing SDK backing it | Either register an IAP product or reframe as "request an upgrade" with no price shown |
| Google Play Data Safety | Form not filled | Complete in Play Console using Step 3 data above |
| Content rating | Not set | Complete questionnaire in both stores |

---

### 8. LAUNCH READINESS SCORE

```
╔══════════════════════════════════════════════════════════════╗
║          NEIGHBORLY — LAUNCH READINESS SCORE                 ║
╠══════════════════════════════════════════════════════════════╣
║                                                              ║
║  App Functionality         ████████████████████  100%  ✅    ║
║  User Safety Features      ██████████████████░░   90%  ✅    ║
║  Account Deletion          ████████████████████  100%  ✅    ║
║  Billing Compliance        ████████████████████  100%  ✅    ║
║  (no billing = compliant)                                    ║
║  Location Permissions UI   ████████████████░░░░   80%  ⚠️    ║
║  Privacy Policy            ████░░░░░░░░░░░░░░░░   20%  ❌    ║
║  Terms & Conditions        ████░░░░░░░░░░░░░░░░   20%  ❌    ║
║  iOS Permission Strings    ░░░░░░░░░░░░░░░░░░░░    0%  ❌    ║
║  Play Data Safety Form     ░░░░░░░░░░░░░░░░░░░░    0%  ❌    ║
║  Store Content Rating      ░░░░░░░░░░░░░░░░░░░░    0%  ❌    ║
║                                                              ║
║  OVERALL SCORE:  52 / 100  — NOT READY FOR SUBMISSION        ║
║                                                              ║
╚══════════════════════════════════════════════════════════════╝
```

**Blocked by 5 critical items before submission:**

1. ❌ Write & host Privacy Policy → update URL in `about.tsx`
2. ❌ Write & host Terms of Service → update URL in `about.tsx`
3. ❌ Add iOS permission description strings to `app.json`
4. ❌ Complete Google Play Data Safety form
5. ❌ Resolve "$9.99/mo" display without a registered IAP product
6. ❌ Set age/content rating in both store consoles

**After fixing all 6 blockers, estimated score: 92/100 (ready for submission)**

---

## IMPLEMENTATION TASKS

### Task 1 — `app.json` iOS Permission Strings

Add to the `expo.ios` section:

```json
"infoPlist": {
  "NSLocationWhenInUseUsageDescription": "Neighborly uses your location to match you with your local community and to broadcast SOS alerts to nearby neighbors.",
  "NSCameraUsageDescription": "Neighborly uses your camera to let you take a profile photo or post photos in the community feed.",
  "NSPhotoLibraryUsageDescription": "Neighborly accesses your photo library so you can choose a profile picture or share images in the community feed.",
  "NSUserNotificationUsageDescription": "Neighborly sends push notifications for SOS alerts, messages, and community updates."
}
```

### Task 2 — Update Placeholder URLs in `about.tsx`

Replace:
- `https://example.com/privacy` → your hosted privacy policy URL
- `https://example.com/terms` → your hosted terms URL
- `https://example.com/guidelines` → your hosted guidelines URL

### Task 3 — Resolve Premium Pricing Display

**Option A (Recommended for launch):** Remove the "$9.99/mo" price from `premium.tsx` and replace with "Request Premium Upgrade" — describe it as an admin-reviewed listing boost with no upfront charge. This removes the billing scrutiny entirely.

**Option B:** Register a proper subscription product in Google Play Console and App Store Connect, integrate `expo-in-app-purchases`, and process payment through platform billing — but this requires significant additional development.

### Task 4 — Write Privacy Policy

Minimum required sections (based on actual data collected):
- What we collect (email, name, photo, location, posts, messages, SOS data, FCM tokens)
- Why we collect it (community matching, emergency alerts, account management)
- Third parties (Firebase/Google, Cloudinary, Resend, Google Sign-In, Expo)
- Data retention (user controls their own deletion)
- How to delete your account
- Children's policy (13+ requirement)
- Contact information

### Task 5 — Write Terms of Service

Include all 12 sections listed in Step 4 above, with special attention to the SOS disclaimer and marketplace disclaimer.

---

## NOT REQUIRED (Confirmed by Audit)

These systems were explicitly checked and confirmed absent — **do not implement**:

- ❌ Google Play Billing SDK
- ❌ Apple StoreKit / IAP
- ❌ Auto-renewal subscription management
- ❌ Free trial systems
- ❌ Purchase reminders
- ❌ App Tracking Transparency prompt
- ❌ Analytics opt-out consent banner
- ❌ GDPR cookie consent (no web cookies in mobile app)
- ❌ AdMob or any advertising integration
