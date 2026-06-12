import { auth } from './firebase';
import { 
  signOut as firebaseSignOut,
  onAuthStateChanged,
  User as FirebaseUser,
  GoogleAuthProvider,
  signInWithCredential,
  deleteUser as firebaseDeleteUser,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendEmailVerification,
  sendPasswordResetEmail,
  reauthenticateWithCredential,
  EmailAuthProvider,
} from 'firebase/auth';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import NotificationService from './notificationService';
import { SecurityService } from './securityService';

const GOOGLE_WEB_CLIENT_ID =
  '345012250731-a8crsgah080dhofvmotgkh2ppqqme634.apps.googleusercontent.com';

const RECENT_AUTH_MS = 5 * 60 * 1000;

export class AuthService {

  static isPasswordUser(user: FirebaseUser): boolean {
    return user.providerData.some((p) => p.providerId === 'password');
  }

  /** Email/password accounts must verify email before app access. OAuth providers are trusted. */
  static isAccountAccessAllowed(user: FirebaseUser): boolean {
    if (!this.isPasswordUser(user)) return true;
    return user.emailVerified;
  }

  static async requireRecentAuth(user: FirebaseUser): Promise<void> {
    const lastSignIn = new Date(user.metadata.lastSignInTime || 0).getTime();
    if (Date.now() - lastSignIn > RECENT_AUTH_MS) {
      throw {
        code: 'auth/requires-recent-login',
        message:
          'This operation is sensitive and requires recent authentication. Log in again before retrying.',
      };
    }
  }

  static async reauthenticateWithPassword(
    user: FirebaseUser,
    password: string,
  ): Promise<void> {
    if (!user.email) throw new Error('No email on account');
    const credential = EmailAuthProvider.credential(user.email, password);
    await reauthenticateWithCredential(user, credential);
  }

  private static configureGoogle() {
    GoogleSignin.configure({ webClientId: GOOGLE_WEB_CLIENT_ID });
  }


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
        this.configureGoogle();
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
      await this.requireRecentAuth(user);

      // 2. Unregister FCM
      try {
        await NotificationService.unregisterPushToken(user.uid);
      } catch (e) {
        console.warn('FCM cleanup failed:', e);
      }

      // 3. Backup user profile to prevent ghost accounts if deletion fails
      const { UserService } = require("./userService");
      const userProfile = await UserService.getOwnProfile(user.uid);



      // 4. Clean up Firestore data
      await UserService.cleanupUserData(user.uid);

      // 5. Delete Firebase Auth User
      try {
        await firebaseDeleteUser(user);
      } catch (authError: any) {
        // ROLLBACK: If Auth deletion fails, restore the user profile
        if (userProfile) {
           await UserService.createUser(user.uid, userProfile);
        }
        throw authError;
      }

      // 5. Revoke Google Access
      try {
        this.configureGoogle();
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
      SecurityService.logSecurityEvent('login_failed', { method: 'google' }).catch(() => {});
      console.error("Google Login error:", error);
      throw error;
    }
  }

  static async loginWithEmail(email: string, password: string): Promise<FirebaseUser> {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      return userCredential.user;
    } catch (error) {
      SecurityService.logSecurityEvent('login_failed', { method: 'email' }).catch(() => {});
      throw error;
    }
  }

  static async signUpWithEmail(email: string, password: string): Promise<FirebaseUser> {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    return userCredential.user;
  }

  static async sendVerificationEmail(user: FirebaseUser): Promise<void> {
    const canResend = await SecurityService.canResendVerification();
    if (!canResend) {
      throw new Error('Please wait before requesting another verification email.');
    }
    await sendEmailVerification(user);
    await SecurityService.markVerificationResent();
    await SecurityService.enforceRateLimit('verification_resend').catch(() => {});
  }

  static async sendPasswordReset(email: string): Promise<void> {
    const canReset = await SecurityService.canRequestPasswordReset();
    if (!canReset) {
      throw new Error('Please wait before requesting another reset email.');
    }
    try {
      await sendPasswordResetEmail(auth, email.trim().toLowerCase());
      await SecurityService.markPasswordResetRequested();
      await SecurityService.enforceRateLimit('password_reset').catch(() => {});
    } catch (error: any) {
      // Prevent account enumeration — treat missing users like success
      if (error?.code === 'auth/user-not-found') {
        await SecurityService.markPasswordResetRequested();
        return;
      }
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
