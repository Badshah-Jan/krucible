import { auth } from './firebase';
import { 
  signOut as firebaseSignOut,
  onAuthStateChanged,
  User as FirebaseUser,
  GoogleAuthProvider,
  signInWithCredential,
  deleteUser as firebaseDeleteUser
} from 'firebase/auth';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import NotificationService from './notificationService';

export class AuthService {


  static async logout(): Promise<void> {
    try {
      // Clean up FCM token before logout
      const currentUser = auth.currentUser;
      if (currentUser?.uid) {
        try {
          await NotificationService.unregisterPushToken(currentUser.uid);
        } catch (tokenError) {
          console.warn('FCM token cleanup failed (non-fatal):', tokenError);
        }
      }

      await firebaseSignOut(auth);
      try {
        GoogleSignin.configure({
          webClientId: '345012250731-a8crsgah080dhofvmotgkh2ppqqme634.apps.googleusercontent.com',
        });
        await GoogleSignin.revokeAccess();
        await GoogleSignin.signOut();
      } catch (e) {
        console.log("Google SignOut Error (ignoring):", e);
      }
    } catch (error) {
      console.error("Logout error:", error);
      throw error;
    }
  }

  static async deleteAccount(): Promise<void> {
    const user = auth.currentUser;
    if (!user) throw new Error("No authenticated user");

    try {
      // 1. Unregister FCM
      try {
        await NotificationService.unregisterPushToken(user.uid);
      } catch (e) {
        console.warn('FCM cleanup failed:', e);
      }

      // 2. Clean up Firestore data
      const { UserService } = require("./userService");
      await UserService.cleanupUserData(user.uid);

      // 3. Delete Firebase Auth User
      await firebaseDeleteUser(user);

      // 4. Revoke Google Access
      try {
        GoogleSignin.configure({
          webClientId: '345012250731-a8crsgah080dhofvmotgkh2ppqqme634.apps.googleusercontent.com',
        });
        await GoogleSignin.revokeAccess();
        await GoogleSignin.signOut();
      } catch (e) {
        console.log("Google SignOut Error:", e);
      }
    } catch (error) {
      console.error("Delete account error:", error);
      throw error;
    }
  }

  static async loginWithGoogle(idToken: string): Promise<FirebaseUser> {
    try {
      const credential = GoogleAuthProvider.credential(idToken);
      const userCredential = await signInWithCredential(auth, credential);
      return userCredential.user;
    } catch (error) {
      console.error("Google Login error:", error);
      throw error;
    }
  }

  static onAuthStateChanged(callback: (user: FirebaseUser | null) => void) {
    return onAuthStateChanged(auth, callback);
  }

  static getCurrentUser(): FirebaseUser | null {
    return auth.currentUser;
  }
}
