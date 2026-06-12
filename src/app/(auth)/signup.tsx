import React, { useState } from 'react';
import { View, StyleSheet, Dimensions, TouchableOpacity, Platform, StatusBar } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';

import Text from '@/components/common/Text';
import Input from '@/components/common/Input';
import Button from '@/components/common/Button';
import { AuthService } from '@/services/authService';
import { UserService } from '@/services/userService';

const { width } = Dimensions.get('window');

export default function SignUpScreen() {
  const router = useRouter();
  const [isSigningUp, setIsSigningUp] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const handleSignUp = async () => {
    if (!name || !email || !password || !confirmPassword) {
      setErrorMsg('Please fill in all fields.');
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
    
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumbers = /\d/.test(password);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>\-_]/.test(password);

    if (!hasUpperCase || !hasLowerCase || !hasNumbers || !hasSpecialChar) {
      setErrorMsg('Password must contain at least 1 uppercase letter, 1 lowercase letter, 1 number, and 1 special character.');
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
          photoURL: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80',
        });
        
        await AuthService.sendVerificationEmail(user);
        router.push('/(auth)/verify-email');
      }
    } catch (error: any) {
      let friendlyError = 'Sign up failed. Please try again.';
      if (error.code === 'auth/email-already-in-use') {
        friendlyError = 'This email is already registered. Please log in instead.';
      } else if (error.code === 'auth/invalid-email') {
        friendlyError = 'Please enter a valid email address.';
      }
      setErrorMsg(friendlyError);
    } finally {
      setIsSigningUp(false);
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
          <Animated.View entering={FadeIn.duration(500)} style={styles.header}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
              <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
            </TouchableOpacity>
            <View style={styles.titleBox}>
              <Text variant="h2" style={styles.titleText}>Create Account</Text>
              <Text variant="body" style={styles.subtitleText}>Join your local community.</Text>
            </View>
          </Animated.View>

          <Animated.View entering={FadeInDown.duration(500).delay(100)} style={styles.formContainer}>
            {errorMsg ? <Text variant="body" style={styles.errorText}>{errorMsg}</Text> : null}

            <Input
              label="Full Name"
              placeholder="Enter your name"
              autoCapitalize="words"
              value={name}
              onChangeText={setName}
            />

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
              placeholder="Create a password"
              secureTextEntry
              value={password}
              onChangeText={setPassword}
            />

            <Input
              label="Confirm Password"
              placeholder="Confirm your password"
              secureTextEntry
              value={confirmPassword}
              onChangeText={setConfirmPassword}
            />

            <Button
              title={isSigningUp ? "Creating Account..." : "Create Account"}
              onPress={handleSignUp}
              disabled={isSigningUp}
              style={styles.signupBtn}
            />

            <View style={styles.footerRow}>
              <Text variant="body" style={styles.footerText}>Already have an account? </Text>
              <TouchableOpacity onPress={() => router.push('/(auth)/login')}>
                <Text variant="bodyBold" style={styles.loginText}>Log In</Text>
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
    paddingTop: 20,
    paddingBottom: 40,
  },
  header: {
    marginBottom: 40,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.05)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  titleBox: {
    gap: 8,
  },
  titleText: {
    color: '#FFFFFF',
    fontSize: 32,
    fontWeight: '800',
  },
  subtitleText: {
    color: '#A1A1AA',
    fontSize: 16,
  },
  formContainer: {
    paddingBottom: 20,
  },
  errorText: {
    color: '#EF4444',
    textAlign: 'center',
    marginBottom: 16,
  },
  signupBtn: {
    width: '100%',
    marginTop: 8,
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
  loginText: {
    color: '#FFFFFF',
  },
});
