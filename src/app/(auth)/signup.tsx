import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  Linking,
} from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import Text from '@/components/common/Text';
import Input from '@/components/common/Input';
import Button from '@/components/common/Button';
import { AuthService } from '@/services/authService';
import { UserService } from '@/services/userService';
import { Colors } from '@/constants/colors';
import { TextInput } from 'react-native';

const T = {
  bg: '#FFFFFF',
  primary: Colors.primary,
  text: '#111111',
  textSecondary: '#6B7280',
  inputBg: '#F3F4F6',
  separator: '#E5E7EB',
};

export default function SignUpScreen() {
  const router = useRouter();
  const [isSigningUp, setIsSigningUp] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [ageConfirmed, setAgeConfirmed] = useState(false);

  const handleSignUp = async () => {
    if (!name || !email || !password || !confirmPassword) {
      setErrorMsg('Please fill in all fields.');
      return;
    }
    if (!ageConfirmed) {
      setErrorMsg('Please confirm you are 13 years or older.');
      return;
    }
    if (password !== confirmPassword) {
      setErrorMsg('Passwords do not match.');
      return;
    }
    if (password.length < 6) {
      setErrorMsg('Password must be at least 6 characters.');
      return;
    }
    const hasUpper = /[A-Z]/.test(password);
    const hasLower = /[a-z]/.test(password);
    const hasNum   = /\d/.test(password);
    const hasSpec  = /[!@#$%^&*(),.?":{}|<>\-_]/.test(password);
    if (!hasUpper || !hasLower || !hasNum || !hasSpec) {
      setErrorMsg('Password needs uppercase, lowercase, a number, and a special character.');
      return;
    }
    if (isSigningUp) return;
    setIsSigningUp(true);
    setErrorMsg('');
    try {
      const user = await AuthService.signUpWithEmail(email, password);
      if (user) {
        await UserService.createUser(user.uid, {
          name: name.trim(),
          email: user.email || email,
          photoURL: '',
        });
        await AuthService.sendVerificationEmail(user);
        router.push('/(auth)/verify-email');
      }
    } catch (error: any) {
      let msg = 'Sign up failed. Please try again.';
      if (error.code === 'auth/email-already-in-use') {
        msg = 'This email is already registered. Please log in.';
      } else if (error.code === 'auth/invalid-email') {
        msg = 'Please enter a valid email address.';
      }
      setErrorMsg(msg);
    } finally {
      setIsSigningUp(false);
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
        {/* ── Header ── */}
        <Animated.View entering={FadeIn.duration(500)} style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={20} color={T.text} />
          </TouchableOpacity>
          <Text style={styles.titleText}>Create an account</Text>
        </Animated.View>

        {/* ── Form Card ── */}
        <Animated.View entering={FadeInDown.duration(500).delay(100)} style={styles.card}>
          {!!errorMsg && (
            <View style={styles.errorBox}>
              <Ionicons name="alert-circle-outline" size={16} color={T.primary} />
              <Text style={styles.errorText}>{errorMsg}</Text>
            </View>
          )}

          <View style={styles.inputContainer}>
            <TextInput
              style={styles.textInput}
              placeholder="Full Name"
              placeholderTextColor={T.textSecondary}
              autoCapitalize="words"
              value={name}
              onChangeText={(t) => { setName(t); setErrorMsg(''); }}
            />
          </View>

          <View style={styles.inputContainer}>
            <TextInput
              style={styles.textInput}
              placeholder="Email"
              placeholderTextColor={T.textSecondary}
              keyboardType="email-address"
              autoCapitalize="none"
              value={email}
              onChangeText={(t) => { setEmail(t); setErrorMsg(''); }}
            />
          </View>

          <View style={styles.inputContainer}>
            <TextInput
              style={styles.textInput}
              placeholder="Password (Min. 6 chars)"
              placeholderTextColor={T.textSecondary}
              secureTextEntry
              value={password}
              onChangeText={(t) => { setPassword(t); setErrorMsg(''); }}
            />
          </View>

          <View style={styles.inputContainer}>
            <TextInput
              style={styles.textInput}
              placeholder="Confirm Password"
              placeholderTextColor={T.textSecondary}
              secureTextEntry
              value={confirmPassword}
              onChangeText={(t) => { setConfirmPassword(t); setErrorMsg(''); }}
            />
          </View>

          {/* Age + Legal consent */}
          <TouchableOpacity
            style={styles.checkRow}
            onPress={() => setAgeConfirmed(!ageConfirmed)}
            activeOpacity={0.7}
          >
            <View style={[styles.checkbox, ageConfirmed && styles.checkboxActive]}>
              {ageConfirmed && <Ionicons name="checkmark" size={13} color="#FFFFFF" />}
            </View>
            <Text style={styles.checkText}>
              I'm 13+ and agree to the{' '}
              <Text
                style={styles.legalLink}
                onPress={() => router.push('/legal/terms-of-service' as any)}
              >
                Terms
              </Text>
              {' & '}
              <Text
                style={styles.legalLink}
                onPress={() => router.push('/legal/privacy-policy' as any)}
              >
                Privacy Policy
              </Text>
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.primaryBtn, isSigningUp && { opacity: 0.7 }]}
            onPress={handleSignUp}
            disabled={isSigningUp}
            activeOpacity={0.8}
          >
            <Text style={styles.primaryBtnText}>{isSigningUp ? "Creating account…" : "Create Account"}</Text>
          </TouchableOpacity>

          <View style={styles.footerRow}>
            <Text style={styles.footerText}>Already have an account? </Text>
            <TouchableOpacity onPress={() => router.push('/(auth)/login')}>
              <Text style={styles.footerLink}>Log in</Text>
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
    paddingTop: 24,
    paddingBottom: 40,
  },
  header: {
    marginBottom: 28,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F7F7F7',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 22,
  },
  titleText: {
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
  checkRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 24,
    marginTop: 20,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: '#B0B0B0',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  checkboxActive: {
    backgroundColor: T.primary,
    borderColor: T.primary,
  },
  checkText: {
    flex: 1,
    color: T.textSecondary,
    fontSize: 14,
    lineHeight: 22,
    fontWeight: '500',
  },
  legalLink: {
    color: '#222222',
    fontWeight: '700',
    textDecorationLine: 'underline',
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
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 32,
  },
  footerText: { color: T.text, fontSize: 15 },
  footerLink: { color: '#222222', fontSize: 15, fontWeight: '700', textDecorationLine: 'underline' },
});
