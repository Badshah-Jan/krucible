import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Platform, StatusBar } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';

import Text from '@/components/common/Text';
import Input from '@/components/common/Input';
import Button from '@/components/common/Button';
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
              <Text variant="h2" style={styles.titleText}>Reset Password</Text>
              <Text variant="body" style={styles.subtitleText}>Enter your email to receive a reset link.</Text>
            </View>
          </Animated.View>

          <Animated.View entering={FadeInDown.duration(500).delay(100)} style={styles.formContainer}>
            {errorMsg ? <Text variant="body" style={styles.errorText}>{errorMsg}</Text> : null}
            {message ? <Text variant="body" style={styles.successText}>{message}</Text> : null}

            <Input
              label="Email"
              placeholder="Enter your email"
              keyboardType="email-address"
              autoCapitalize="none"
              value={email}
              onChangeText={setEmail}
            />

            <Button
              title={isSending ? "Sending..." : "Send Reset Link"}
              onPress={handleSendReset}
              disabled={isSending}
              style={styles.sendBtn}
            />
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
  successText: {
    color: '#10B981',
    textAlign: 'center',
    marginBottom: 16,
  },
  sendBtn: {
    width: '100%',
    marginTop: 8,
  },
});
