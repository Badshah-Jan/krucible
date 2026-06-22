# Permanent Community + Real-Time Location — Implementation Report

---

## 1. Architecture Changes

### Before
```
GPS Changes → assignUserToCommunity() → communityId overwrites → Feed changes
```

### After
```
GPS Changes → setCurrentCoordinates() → coordinates update only
                                         ↓
                                    Nearby screen uses this

User confirms home → confirmPrimaryCommunity() → primaryCommunityId set once
                                                  ↓
                                             Home feed always uses this
```

Two independent data paths. They never overwrite each other.

---

## 2. Firestore Changes

### User Document — New Fields Added

| Field | Type | Purpose |
|---|---|---|
| `primaryCommunityId` | string | Permanent home community slug (never auto-changed) |
| `primaryCommunityName` | string | Display name of home community |
| `communityConfirmedAt` | Timestamp | When user explicitly confirmed their home |
| `currentLatitude` | number | Real-time GPS latitude (updates silently) |
| `currentLongitude` | number | Real-time GPS longitude (updates silently) |

### Legacy Fields (kept for backward compatibility)

| Field | Status | Notes |
|---|---|---|
| `communityId` | Kept, mirrors `primaryCommunityId` | All existing queries still work |
| `communityName` | Kept, mirrors `primaryCommunityName` | No reads broken |
| `latitude` | Kept, mirrors `currentLatitude` | Distance calculations unchanged |
| `longitude` | Kept, mirrors `currentLongitude` | SOS radius unchanged |

**No data loss. No collection changes. No index changes needed.**

---

## 3. User Migration Plan

### Existing Users
Existing users already have `communityId` set. On next app launch:
- `index.tsx` checks `community` (aliased to `primaryCommunity` in store)
- Zustand loads `primaryCommunity` from Firestore `communityId` field via `UserService`
- If `primaryCommunityId` is missing but `communityId` exists, the app still works because `communityId` is the fallback read in all community queries
- **No migration script needed** — the legacy `communityId` field is preserved and continues to work
- New `primaryCommunityId` field is written on next community confirmation action

### New Users
- `location-permission.tsx` → grants permission, stores coordinates → routes to `community-setup.tsx`
- `community-setup.tsx` → detects GPS → shows confirmation card → user taps confirm → `confirmPrimaryCommunity()` writes both `primaryCommunityId` and `communityId`

---

## 4. Files Modified

| File | Change |
|---|---|
| `src/store/appStore.ts` | Added `primaryCommunity` field. Added `setPrimaryCommunity()` and `setCurrentCoordinates()` actions. `community` kept as backward-compat alias pointing to `primaryCommunity`. `setLocation()` kept for backward-compat. |
| `src/services/communityService.ts` | Added `ensureCommunityExists()` (no user write). Added `confirmPrimaryCommunity()` (explicit user-triggered only). Renamed internal logic. `assignUserToCommunity()` kept as deprecated alias calling `confirmPrimaryCommunity()`. |
| `src/services/locationMonitorService.ts` | Removed all community reassignment on GPS move. Now calls only `refreshCurrentCoordinates()` which updates `coordinates` in Zustand and `currentLatitude/currentLongitude` in Firestore. GPS poll interval changed from 3s to 10s. |
| `src/app/(auth)/location-permission.tsx` | After getting GPS coordinates, no longer calls `assignUserToCommunity`. Calls `setCurrentCoordinates()` then routes to `community-setup` for explicit confirmation. |
| `src/app/(auth)/gps-enable.tsx` | When GPS turns back on, checks if user already has a primary community. If yes: updates coordinates only, goes to tabs. If no: routes to `community-setup`. |
| `src/app/index.tsx` | Added Step 3 to routing logic: if locationStatus is granted but `community` is null, route to `community-setup` instead of tabs. |
| `src/app/(tabs)/index.tsx` | Changed `useAppStore((s) => s.community)` to `useAppStore((s) => s.primaryCommunity)`. Home feed now always reads from permanent community. |
| `src/app/(tabs)/explore.tsx` | Changed `useAppStore((s) => s.community)` to `useAppStore((s) => s.primaryCommunity)`. Nearby screen uses `coordinates` (real-time) for distance, and `primaryCommunity.communityId` for SOS/post subscription scoping. |
| `src/app/settings/index.tsx` | Added "Home Community" row in Safety section. Tapping shows a confirmation alert before routing to `community-setup` for voluntary change. |

## 5. New Files Created

| File | Purpose |
|---|---|
| `src/app/(auth)/community-setup.tsx` | New onboarding screen. Detects GPS, resolves community slug via reverse geocode, shows confirmation card ("Is this your home community?"), calls `confirmPrimaryCommunity()` only on explicit tap. Routes to `community-setup` can also be triggered from Settings for voluntary community change. |

---

## 6. Location Logic Changes

| Behaviour | Before | After |
|---|---|---|
| GPS coordinates update | Triggered community reassignment | Updates `currentLatitude/currentLongitude` only |
| Community on GPS move | Auto-reassigned if moved > 5 km | Never auto-reassigned |
| Community assignment | Automatic | Requires explicit user confirmation tap |
| Home feed data source | `community.communityId` (could change) | `primaryCommunity.communityId` (stable) |
| Nearby screen data source | Same `communityId` as home | `coordinates` (current GPS) for distance sorting |
| Travel scenario | Feed would switch to Lahore community | Feed stays on Karachi DHA; Nearby shows Lahore content |

---

## 7. Community Logic Changes

| Behaviour | Before | After |
|---|---|---|
| `assignUserToCommunity()` | Called on every GPS sync | Deprecated alias; only called on explicit confirmation |
| `confirmPrimaryCommunity()` | Did not exist | New — only path that writes `primaryCommunityId` |
| `ensureCommunityExists()` | Did not exist | New — creates community doc without touching user doc |
| Community change from Settings | Not available | Available via Settings → Safety → Home Community (with confirmation alert) |
| `communityId` field | Single field, auto-updated | Kept as backward-compat mirror of `primaryCommunityId` |

---

## 8. Battery Impact

| Component | Before | After |
|---|---|---|
| GPS poll interval (LocationMonitor) | 3 seconds | 10 seconds (GPS service check only, not position) |
| Position fetch on foreground | Always + reverse geocode + Firestore write | Only if moved > 500 m, coordinates only, no geocode |
| Reverse geocode calls | Every significant move | Only during community-setup (once) or voluntary change |
| Firestore writes on move | Full community + user document | Single field update (`currentLatitude`, `currentLongitude`) |

**Result: Significantly reduced battery usage.** Reverse geocoding (the most expensive operation) is now called once during onboarding, not on every GPS sync.

---

## Backward Compatibility

- All existing Firestore queries using `communityId` continue to work unchanged
- `community` store field still works (alias to `primaryCommunity`)
- `setLocation()` still works (sets both coords and primary community)
- `assignUserToCommunity()` still works (calls `confirmPrimaryCommunity()` internally)
- Existing users with `communityId` already set will route directly to tabs on next launch — no re-confirmation required
- Zero data loss for existing users
