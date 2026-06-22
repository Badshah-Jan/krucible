import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, TextInput, StatusBar } from 'react-native';
import { Colors } from '@/constants/colors';

const T = {
  bg: '#FFFFFF',
  primary: Colors.primary,
  text: '#111111',
  textSecondary: '#6B7280',
  inputBg: '#F3F4F6',
  separator: '#E5E7EB',
};
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';

import Text from '@/components/common/Text';
import { AuthService } from '@/services/authService';

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const [isSending, setIsSending] = useState(false);
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const handleSendReset = async () => {
    if (!email) {
      setErrorMsg('Please enter your email address.');
      return;
    }
    
    if (isSending) return;
    setIsSending(true);
    setErrorMsg('');
    setMessage('');

    try {
      await AuthService.sendPasswordReset(email);
      setMessage('Password reset email has been sent.');
      setEmail('');
    } catch (error: any) {
      let friendlyError = 'Failed to send reset email. Please try again.';
      if (error.code === 'auth/invalid-email') {
        friendlyError = 'Please enter a valid email address.';
      } else if (error.message?.includes('wait')) {
        friendlyError = error.message;
      }
      setErrorMsg(friendlyError);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" translucent backgroundColor="transparent" />
      <KeyboardAwareScrollView 
        contentContainerStyle={styles.scrollContent} 
        showsVerticalScrollIndicator={false} 
        keyboardShouldPersistTaps="handled"
        enableOnAndroid={true}
        extraScrollHeight={20}
      >
          <Animated.View entering={FadeIn.duration(500)} style={styles.header}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
              <Ionicons name="arrow-back" size={24} color={T.text} />
            </TouchableOpacity>
            <View style={styles.titleBox}>
              <Text variant="h2" style={styles.titleText}>Reset Password</Text>
              <Text variant="body" style={styles.subtitleText}>Enter your email to receive a reset link.</Text>
            </View>
          </Animated.View>

          <Animated.View entering={FadeInDown.duration(500).delay(100)} style={styles.formContainer}>
            {errorMsg ? <Text variant="body" style={styles.errorText}>{errorMsg}</Text> : null}
            {message ? <Text variant="body" style={styles.successText}>{message}</Text> : null}

            <View style={styles.inputContainer}>
              <TextInput
                style={styles.textInput}
                placeholder="Enter your email"
                placeholderTextColor={T.textSecondary}
                keyboardType="email-address"
                autoCapitalize="none"
                value={email}
                onChangeText={setEmail}
              />
            </View>

            <TouchableOpacity
              style={[styles.primaryBtn, isSending && { opacity: 0.7 }]}
              onPress={handleSendReset}
              disabled={isSending}
              activeOpacity={0.8}
            >
              <Text style={styles.primaryBtnText}>{isSending ? "Sending..." : "Send Reset Link"}</Text>
            </TouchableOpacity>
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
    backgroundColor: '#F7F7F7',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  titleBox: {
    gap: 8,
  },
  titleText: {
    color: T.text,
    fontSize: 32,
    fontWeight: '800',
  },
  subtitleText: {
    color: T.text,
    fontSize: 18,
    fontWeight: '600',
  },
  formContainer: {
    paddingBottom: 20,
  },
  errorText: {
    color: T.primary,
    textAlign: 'center',
    marginBottom: 16,
  },
  successText: {
    color: '#10B981',
    textAlign: 'center',
    marginBottom: 16,
  },
  inputContainer: {
    backgroundColor: T.inputBg,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    marginBottom: 24,
  },
  textInput: {
    fontSize: 16,
    color: T.text,
    padding: 0,
    margin: 0,
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
    fontWeight: '700',
  },
});
