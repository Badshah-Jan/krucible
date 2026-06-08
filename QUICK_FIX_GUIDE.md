# ⚡ QUICK FIX GUIDE - Notification System P0 Fixes
**Estimated Time:** 2-3 hours  
**Difficulty:** Low-Medium  
**Impact:** Moves from 54/100 → 80+/100 production readiness

---

## FIX #1: Add Foreground Notification Listener (15 min)

**File:** `src/app/_layout.tsx`  
**What it does:** Shows in-app toast when notification arrives while app is open

```typescript
// Add this AFTER the existing Notifications.setNotificationHandler() config

useEffect(() => {
  const subscription = Notifications.addNotificationReceivedListener(
    (notification) => {
      // When app is in foreground and notification received
      const { title, body } = notification.request.content;
      
      // Show as in-app toast using UI store
      UI.toast(title || 'Notification', 'info', body || '');
      
      // Optional: Play sound
      // Optional: Haptic feedback
      // Optional: Update badge count
    }
  );

  return () => subscription.remove(); // Cleanup
}, []);
```

**Why it matters:**
- Users see instant feedback when message arrives
- Notification doesn't get "lost" while app open
- Matches WhatsApp/Facebook behavior

---

## FIX #2: Add Deep Link Handler (20 min)

**File:** `src/app/_layout.tsx`  
**What it does:** Navigate to correct screen when user taps notification from system drawer

```typescript
// Add this effect AFTER Notifications setup

useEffect(() => {
  const subscription = Notifications.addNotificationResponseReceivedListener(
    (response) => {
      const data = response.notification.request.content.data;
      
      if (!data) return;
      
      // Route based on notification type
      switch (data.type) {
        case 'sos_alert':
        case 'comment':
        case 'help_request':
          if (data.postId) {
            router.push(`/post/${data.postId}`);
          }
          break;

        case 'direct_message':
        case 'chat_message':
          if (data.chatId) {
            router.push(`/chat/${data.chatId}`);
          }
          break;

        case 'karma_reward':
          router.push('/karma');
          break;

        case 'community_update':
        case 'recommendation':
        case 'lost_found':
          if (data.postId) {
            router.push(`/post/${data.postId}`);
          }
          break;

        default:
          break;
      }
    }
  );

  return () => subscription.remove();
}, [router]);
```

**Why it matters:**
- Clicking notification actually does something
- Opens the relevant screen with one tap
- Critical user interaction pattern

---

## FIX #3: Add Like Notifications (10 min)

**File:** `src/services/postService.ts`  
**What it does:** Notify post author when someone likes their post

**Location:** Find `toggleLike()` method around line 368

```typescript
static async toggleLike(postId: string, userId: string): Promise<boolean> {
  try {
    const docRef = doc(db, 'posts', postId);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) throw new Error('Post not found');

    const data = docSnap.data();
    const likedBy = data.likedBy || [];
    const hasLiked = likedBy.includes(userId);

    if (hasLiked) {
      await updateDoc(docRef, {
        likedBy: arrayRemove(userId),
        likesCount: increment(-1),
      });
      return false;
    } else {
      await updateDoc(docRef, {
        likedBy: arrayUnion(userId),
        likesCount: increment(1),
      });

      // ✨ NEW CODE: Notify post author ✨
      if (data.userId && data.userId !== userId) {
        try {
          const likerProfile = await UserService.getUser(userId);
          const likerName = likerProfile?.name || 'Someone';
          
          NotificationService.sendInAppNotification(
            data.userId,
            `❤️ ${likerName} liked your post`,
            data.title.substring(0, 80),
            'like_notification',
            {
              postId,
              senderId: userId,
              senderName: likerName,
            }
          ).catch((e) => console.warn('Like notification failed:', e));
        } catch (e) {
          console.warn('Failed to send like notification:', e);
        }
      }
      // ✨ END NEW CODE ✨

      return true;
    }
  } catch (error) {
    console.error('Error toggling like:', error);
    throw error;
  }
}
```

**Why it matters:**
- Core engagement feature (no engagement feedback = broken)
- Users know their posts are appreciated
- Drives interaction

---

## FIX #4: Add Karma Reward Notifications (15 min)

**File:** `src/services/userService.ts`  
**What it does:** Notify user when they earn karma points

**Location:** Find `incrementKarmaPoints()` or similar method

```typescript
static async incrementKarmaPoints(userId: string, points: number, reason?: string) {
  try {
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, {
      karma: increment(points),
      lastActive: serverTimestamp(),
    });

    // ✨ NEW CODE: Notify user of karma earned ✨
    if (points > 0) {
      try {
        const reasonText = reason || 'Your helpful contribution was appreciated';
        
        NotificationService.sendInAppNotification(
          userId,
          `⭐ +${points} Karma Points!`,
          reasonText,
          'karma_reward',
          {
            points,
            reason,
          }
        ).catch((e) => console.warn('Karma notification failed:', e));
      } catch (e) {
        console.warn('Failed to send karma notification:', e);
      }
    }
    // ✨ END NEW CODE ✨
  } catch (error) {
    console.error('Error incrementing karma:', error);
  }
}
```

**Why it matters:**
- Gamification feedback
- Motivates users to help others
- Closes achievement loop

---

## FIX #5: Configure Deep Linking (10 min)

**File:** `app.json`  
**What it does:** Enable deep linking schema for notification responses

**Current:**
```json
{
  "expo": {
    "scheme": "aaspaas",
    // ... rest of config
  }
}
```

**No changes needed** - Already configured! But verify `scheme` exists.

The Expo Router automatically handles deep linking when:
1. ✅ Scheme defined in `app.json` (already done)
2. ✅ File-based routing in place (already done)
3. ✅ Notification response handler set (FIX #2 does this)

---

## FIX #6 (OPTIONAL): Add TTL for Auto-Deletion (15 min)

**File:** `src/services/notificationService.ts`  
**What it does:** Auto-delete old notifications after 30 days

**Location:** Find `sendInAppNotification()` method

```typescript
async sendInAppNotification(
  userId: string,
  title: string,
  body: string,
  type: NotificationType,
  data?: Record<string, any>
) {
  try {
    const shouldSend = await this.shouldSendNotification(userId, type);
    if (!shouldSend) {
      console.log(`[NotificationService] Skipped ${type} for ${userId} — disabled by preference`);
      return;
    }

    if (data?.senderId) {
      const blocked = await this.isBlockedBy(userId, data.senderId);
      if (blocked) {
        console.log(`[NotificationService] Skipped notification — sender blocked`);
        return;
      }
    }

    // ✨ NEW CODE: Add TTL ✨
    const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;
    const expiresAt = new Timestamp(
      Math.floor((Date.now() + thirtyDaysMs) / 1000),
      0
    );
    // ✨ END NEW CODE ✨

    const notifRef = collection(db, 'notifications');
    await addDoc(notifRef, {
      userId,
      title,
      body,
      type,
      read: false,
      data: data || {},
      createdAt: serverTimestamp(),
      expiresAt, // ✨ Add this line ✨
    });
  } catch (error) {
    console.error('Error sending in-app notification:', error);
  }
}
```

**Then in Firestore Console:**
1. Go to Cloud Firestore
2. Collection `notifications` → Indexes
3. Create Index with `expiresAt` field (TTL)
4. Set to "Delete" mode

---

## VERIFICATION CHECKLIST

After applying all fixes:

- [ ] App doesn't crash on startup
- [ ] Notification toasts appear while app is open
- [ ] Tapping notification in system drawer navigates to correct screen
- [ ] Like notification appears when post is liked
- [ ] Karma notification appears when points earned
- [ ] Notification preferences still respected
- [ ] Blocked users don't get notifications
- [ ] Notifications appear in notifications screen
- [ ] Test on real Android device (not just emulator)
- [ ] Test with app in background
- [ ] Test with app killed

---

## TESTING COMMANDS

```bash
# Rebuild app with changes
npm start
# Select 'a' for Android

# In another terminal, send test notification:
npm run test:notify
# (Create this script or use Firebase Console)
```

---

## EXPECTED RESULTS

After these 6 fixes:

| Metric | Before | After |
|--------|--------|-------|
| Foreground notifications visible | ❌ No | ✅ Yes |
| Tap notification works | ❌ No | ✅ Yes |
| Like notifications sent | ❌ No | ✅ Yes |
| Karma notifications sent | ❌ No | ✅ Yes |
| Production readiness | 54/100 | 80/100 |

---

## NEXT PHASE (P1 - After these work)

1. Add pagination to notifications (limit 50)
2. Add retry logic for failed sends
3. Add reply notifications
4. Add idempotency keys

Estimated: 1-2 more days to reach 90/100

---

**Time Estimate:** 2-3 hours focused work  
**Difficulty:** Low-Medium  
**Impact:** Critical → System becomes actually functional
