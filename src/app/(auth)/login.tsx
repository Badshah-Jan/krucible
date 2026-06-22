import React, { useEffect, useState } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  Dimensions,
  TextInput,
} from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import Text from '@/components/common/Text';
import Input from '@/components/common/Input';
import Button from '@/components/common/Button';
import { useAppStore } from '@/store/appStore';
import { AuthService } from '@/services/authService';
import { UserService } from '@/services/userService';
import { Colors } from '@/constants/colors';

const { height } = Dimensions.get('window');

const T = {
  bg: '#FFFFFF',
  primary: Colors.primary,
  text: '#111111',
  textSecondary: '#6B7280',
  inputBg: '#F3F4F6',
  separator: '#E5E7EB',
};

export default function LoginScreen() {
  const login = useAppStore((state) => state.login);
  const router = useRouter();
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    GoogleSignin.configure({
      webClientId: '345012250731-a8crsgah080dhofvmotgkh2ppqqme634.apps.googleusercontent.com',
    });
  }, []);

  const handleGoogleLogin = async () => {
    if (isSigningIn) return;
    setIsSigningIn(true);
    setErrorMsg('');
    try {
      await GoogleSignin.hasPlayServices();
      const response = await GoogleSignin.signIn();
      if (response.type === 'success' && response.data.idToken) {
        const user = await AuthService.loginWithGoogle(response.data.idToken);
        if (user) {
          const userProfile = await UserService.getOwnProfile(user.uid);
          if (!userProfile) {
            await UserService.createUser(user.uid, {
              name: user.displayName || 'Neighborly User',
              email: user.email || '',
              photoURL: user.photoURL || '',
            });
          }
          if (!AuthService.isAccountAccessAllowed(user)) {
            router.replace('/(auth)/verify-email');
            return;
          }
          login();
          router.replace('/(auth)/location-permission');
        }
      }
    } catch (error: any) {
      if (error?.code !== 'SIGN_IN_CANCELLED') {
        if (error?.code === 'auth/account-exists-with-different-credential') {
          setErrorMsg('An account with this email already exists. Please sign in with email.');
        } else {
          setErrorMsg('Google Sign-In failed. Please try again.');
        }
      }
    } finally {
      setIsSigningIn(false);
    }
  };

  const handleEmailLogin = async () => {
    if (!email || !password) {
      setErrorMsg('Please enter your email and password.');
      return;
    }
    if (isSigningIn) return;
    setIsSigningIn(true);
    setErrorMsg('');
    try {
      const user = await AuthService.loginWithEmail(email.trim().toLowerCase(), password);
      if (user) {
        if (!AuthService.isAccountAccessAllowed(user)) {
          await AuthService.sendVerificationEmail(user).catch(() => {});
          router.replace('/(auth)/verify-email');
          return;
        }
        login();
        router.replace('/(auth)/location-permission');
      }
    } catch (error: any) {
      let msg = 'Login failed. Please try again.';
      if (['auth/invalid-credential', 'auth/wrong-password', 'auth/user-not-found'].includes(error.code)) {
        msg = 'Invalid email or password.';
      } else if (error.code === 'auth/too-many-requests') {
        msg = 'Too many attempts. Please try again later.';
      }
      setErrorMsg(msg);
    } finally {
      setIsSigningIn(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
      <KeyboardAwareScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        enableOnAndroid
        extraScrollHeight={20}
      >
        {/* ── Brand Header ── */}
        <Animated.View entering={FadeIn.duration(700)} style={styles.header}>
          <Text style={styles.logoText}>Welcome back</Text>
        </Animated.View>

        {/* ── Form Card ── */}
        <Animated.View entering={FadeInDown.duration(600).delay(150)} style={styles.card}>

          {!!errorMsg && (
            <View style={styles.errorBox}>
              <Ionicons name="alert-circle-outline" size={16} color={Colors.danger} />
              <Text style={styles.errorText}>{errorMsg}</Text>
            </View>
          )}

          <View style={styles.inputContainer}>
            <TextInput
              style={styles.textInput}
              placeholder="Email"
              placeholderTextColor={T.textSecondary}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              value={email}
              onChangeText={(t) => { setEmail(t); setErrorMsg(''); }}
            />
          </View>

          <View style={styles.inputContainer}>
            <TextInput
              style={styles.textInput}
              placeholder="Password"
              placeholderTextColor={T.textSecondary}
              secureTextEntry
              autoComplete="password"
              value={password}
              onChangeText={(t) => { setPassword(t); setErrorMsg(''); }}
            />
          </View>

          <TouchableOpacity
            style={styles.forgotBtn}
            onPress={() => router.push('/(auth)/forgot-password')}
          >
            <Text style={styles.forgotText}>Forgot password?</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.primaryBtn, isSigningIn && { opacity: 0.7 }]}
            onPress={handleEmailLogin}
            disabled={isSigningIn}
            activeOpacity={0.8}
          >
            <Text style={styles.primaryBtnText}>{isSigningIn ? "Logging in…" : "Continue"}</Text>
          </TouchableOpacity>

          {/* Divider */}
          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Google */}
          <TouchableOpacity
            style={styles.googleBtn}
            onPress={handleGoogleLogin}
            disabled={isSigningIn}
            activeOpacity={0.85}
          >
            <Ionicons name="logo-google" size={20} color="#222" style={styles.btnIconLeft} />
            <Text style={styles.googleBtnText}>Continue with Google</Text>
          </TouchableOpacity>

          <View style={styles.footerRow}>
            <Text style={styles.footerText}>Don't have an account? </Text>
            <TouchableOpacity onPress={() => router.push('/(auth)/signup')}>
              <Text style={styles.footerLink}>Sign up</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </KeyboardAwareScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: T.bg,
  },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: height * 0.08,
    paddingBottom: 40,
  },
  header: {
    marginBottom: 32,
    marginTop: 10,
  },
  logoText: {
    fontSize: 32,
    fontWeight: '800',
    color: T.text,
  },
  card: {
    backgroundColor: T.bg,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    marginBottom: 20,
  },
  errorText: {
    color: '#DC2626',
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
  },
  inputContainer: {
    backgroundColor: T.inputBg,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    marginBottom: 16,
  },
  textInput: {
    fontSize: 16,
    color: T.text,
    padding: 0,
    margin: 0,
  },
  forgotBtn: {
    alignSelf: 'flex-start',
    marginBottom: 24,
  },
  forgotText: {
    color: T.textSecondary,
    fontSize: 14,
    fontWeight: '500',
  },
  primaryBtn: {
    backgroundColor: T.primary,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 24,
  },
  primaryBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
    gap: 12,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: T.separator,
  },
  dividerText: {
    color: T.textSecondary,
    fontSize: 12,
    fontWeight: '400',
  },
  googleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    paddingVertical: 16,
    marginBottom: 16,
  },
  btnIconLeft: {
    position: 'absolute',
    left: 20,
  },
  googleBtnText: {
    color: T.text,
    fontSize: 16,
    fontWeight: '600',
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 24,
  },
  footerText: { color: T.textSecondary, fontSize: 14 },
  footerLink: { color: T.text, fontSize: 14, fontWeight: '600', textDecorationLine: 'underline' },
});
