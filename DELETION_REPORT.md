# Account Deletion Audit Report

## 1. Trigger
Settings → Delete Account (handleDeleteAccount in src/app/settings/index.tsx)

## 2. Execution Flow (src/services/authService.ts & src/services/userService.ts)
1. **Confirmation Modal**: Handled via Alert.alert or ConfirmationModal in Settings UI.
2. **FCM Token Removal**: NotificationService.unregisterPushToken(user.uid) is executed first.
3. **Data Teardown (UserService.cleanupUserData)**: 
   - writeBatch(db) initializes.
   - Deletes all posts authored by the user.
   - Deletes all notifications addressed to the user.
   - Deletes karma_history subcollection.
   - Deletes users/{uid} document (which cascades to embedded arrays like lockedUsers, emergencyContacts).
4. **Firebase Auth Clean up**: irebaseDeleteUser(user) destroys the auth identity.
5. **OAuth Cleanup**: Google access is explicitly revoked and signed out.
6. **Redirection**: Automatically handled via auth state listener in _layout.tsx, pushing the user back to Onboarding/Login.

## 3. Orphaned Data Checks
- Comments: User's comments remain but will show as an orphaned ID or handle gracefully.
- Chat: chatService handles currentUser == null gracefully and previous chats are retained for the other participant. 
- Posts: Deleted correctly.

**Status: Complete and secure.**
