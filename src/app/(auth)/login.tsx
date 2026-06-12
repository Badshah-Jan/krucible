import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Dimensions, TouchableOpacity, Alert, Platform, StatusBar } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { FontAwesome5 } from '@expo/vector-icons';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';

import Text from '@/components/common/Text';
import Input from '@/components/common/Input';
import Button from '@/components/common/Button';
import { useAppStore } from '@/store/appStore';
import { AuthService } from '@/services/authService';
import { UserService } from '@/services/userService';

const { width, height } = Dimensions.get('window');

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
              photoURL: user.photoURL || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80',
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
          setErrorMsg('An account with this email already exists. Please sign in with email and password.');
        } else {
          setErrorMsg("Could not complete Google Sign-In. Please try again.");
        }
      }
    } finally {
      setIsSigningIn(false);
    }
  };

  const handleEmailLogin = async () => {
    if (!email || !password) {
      setErrorMsg('Please enter both email and password.');
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
      let friendlyError = 'Login failed. Please try again.';
      if (error.code === 'auth/invalid-credential' || error.code === 'auth/wrong-password' || error.code === 'auth/user-not-found') {
        friendlyError = 'Invalid email or password. Please try again.';
      } else if (error.code === 'auth/too-many-requests') {
        friendlyError = 'Too many attempts. Please try again later.';
      }
      setErrorMsg(friendlyError);
    } finally {
      setIsSigningIn(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      <KeyboardAwareScrollView 
        contentContainerStyle={styles.scrollContent} 
        showsVerticalScrollIndicator={false} 
        keyboardShouldPersistTaps="handled"
        enableOnAndroid={true}
        extraScrollHeight={20}
      >
          <Animated.View entering={FadeIn.duration(800)} style={styles.header}>
            <View style={styles.logoBox}>
              <Text variant="h1" style={styles.logoText}>Neighborly</Text>
              <View style={styles.logoDot} />
            </View>
            <Text variant="body" style={styles.tagline}>Help Is Nearby.</Text>
          </Animated.View>

          <Animated.View entering={FadeInDown.duration(600).delay(200)} style={styles.formContainer}>
            {errorMsg ? <Text variant="body" style={styles.errorText}>{errorMsg}</Text> : null}

            <TouchableOpacity 
              style={styles.googleButton} 
              onPress={handleGoogleLogin}
              disabled={isSigningIn}
              activeOpacity={0.9}
            >
              <FontAwesome5 name="google" size={20} color="#000000" />
              <Text variant="bodyBold" style={styles.googleBtnText}>
                {isSigningIn ? "Signing In..." : "Continue with Google"}
              </Text>
            </TouchableOpacity>

            <View style={styles.dividerContainer}>
              <View style={styles.dividerLine} />
              <Text variant="caption" style={styles.dividerText}>OR</Text>
              <View style={styles.dividerLine} />
            </View>

            <Input
              label="Email"
              placeholder="Enter your email"
              keyboardType="email-address"
              autoCapitalize="none"
              value={email}
              onChangeText={setEmail}
            />
            
            <Input
              label="Password"
              placeholder="Enter your password"
              secureTextEntry
              value={password}
              onChangeText={setPassword}
            />

            <TouchableOpacity 
              style={styles.forgotPassword} 
              onPress={() => router.push('/(auth)/forgot-password')}
            >
              <Text variant="bodyBold" style={styles.forgotPasswordText}>Forgot Password?</Text>
            </TouchableOpacity>

            <Button
              title={isSigningIn ? "Logging in..." : "Log In"}
              onPress={handleEmailLogin}
              disabled={isSigningIn}
              style={styles.loginBtn}
            />

            <View style={styles.footerRow}>
              <Text variant="body" style={styles.footerText}>Don't have an account? </Text>
              <TouchableOpacity onPress={() => router.push('/(auth)/signup')}>
                <Text variant="bodyBold" style={styles.signupText}>Sign Up</Text>
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
    backgroundColor: '#000000',
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 40,
    paddingBottom: 40,
  },
  header: {
    alignItems: 'center',
    marginTop: height * 0.08,
    marginBottom: 48,
  },
  logoBox: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  logoText: {
    fontSize: 48,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: -2,
  },
  logoDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#2563EB',
    marginLeft: 4,
  },
  tagline: {
    color: '#A1A1AA',
    fontSize: 18,
    fontWeight: '500',
    marginTop: 8,
  },
  formContainer: {
    paddingBottom: 20,
  },
  errorText: {
    color: '#EF4444',
    textAlign: 'center',
    marginBottom: 16,
  },
  googleButton: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    paddingVertical: 18,
    borderRadius: 100,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  googleBtnText: {
    color: '#000000',
    fontSize: 18,
    fontWeight: '700',
    marginLeft: 12,
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  dividerText: {
    color: '#71717A',
    paddingHorizontal: 16,
  },
  forgotPassword: {
    alignSelf: 'flex-end',
    marginBottom: 24,
  },
  forgotPasswordText: {
    color: '#2563EB',
    fontSize: 14,
  },
  loginBtn: {
    width: '100%',
    marginBottom: 24,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  footerText: {
    color: '#A1A1AA',
  },
  signupText: {
    color: '#FFFFFF',
  },
});
