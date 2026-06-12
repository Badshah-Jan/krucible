import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Platform, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { Linking } from 'react-native';

import Text from '@/components/common/Text';
import Button from '@/components/common/Button';
import { AuthService } from '@/services/authService';

export default function VerifyEmailScreen() {
  const router = useRouter();
  const [isResending, setIsResending] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    const checkVerification = async () => {
      const user = AuthService.getCurrentUser();
      if (user) {
        await user.reload();
        if (user.emailVerified) {
          router.replace('/(auth)/verification-success');
        }
      }
    };

    const interval = setInterval(checkVerification, 3000);
    return () => clearInterval(interval);
  }, [router]);

  const handleOpenEmailApp = async () => {
    try {
      if (Platform.OS === 'ios') {
        await Linking.openURL('message://');
      } else {
        await Linking.openURL('mailto:');
      }
    } catch (e) {
      setMessage("Please open your email app manually.");
    }
  };

  const handleResend = async () => {
    if (isResending) return;
    setIsResending(true);
    setMessage('');
    try {
      const user = AuthService.getCurrentUser();
      if (user) {
        await AuthService.sendVerificationEmail(user);
        setMessage('Verification email resent successfully.');
      } else {
        setMessage('User not found. Please log in again.');
      }
    } catch (error: any) {
      setMessage(error.message || 'Failed to resend email.');
    } finally {
      setIsResending(false);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      <SafeAreaView style={styles.safeArea}>
        <Animated.View entering={FadeIn.duration(800)} style={styles.iconContainer}>
          <View style={styles.iconCircle}>
            <Ionicons name="mail-unread" size={64} color="#2563EB" />
          </View>
        </Animated.View>

        <Animated.View entering={FadeInDown.duration(600).delay(200)} style={styles.content}>
          <Text variant="h2" style={styles.title}>Check Your Email</Text>
          <Text variant="body" style={styles.description}>
            We've sent a verification link to your email address. Please verify your account to continue.
          </Text>

          {message ? (
            <Text variant="body" style={styles.messageText}>{message}</Text>
          ) : null}

          <View style={styles.actions}>
            <Button
              title="Open Email App"
              onPress={handleOpenEmailApp}
              style={styles.mainBtn}
            />
            <Button
              title={isResending ? "Resending..." : "Resend Verification Email"}
              onPress={handleResend}
              variant="outline"
              disabled={isResending}
              style={styles.actionBtn}
            />
            <Button
              title="Back to Login"
              onPress={() => router.replace('/(auth)/login')}
              variant="outline"
              style={styles.actionBtn}
            />
          </View>
        </Animated.View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  safeArea: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconContainer: {
    marginBottom: 40,
  },
  iconCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(37,99,235,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    alignItems: 'center',
    width: '100%',
  },
  title: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '800',
    marginBottom: 16,
    textAlign: 'center',
  },
  description: {
    color: '#A1A1AA',
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
    paddingHorizontal: 16,
  },
  messageText: {
    color: '#10B981',
    textAlign: 'center',
    marginBottom: 24,
  },
  actions: {
    width: '100%',
    gap: 16,
  },
  mainBtn: {
    width: '100%',
  },
  actionBtn: {
    width: '100%',
  },
});
