import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Text, Platform, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import NetInfo from '@react-native-community/netinfo';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { BlurView } from 'expo-blur';

export default function NetworkLockdown() {
  const [isConnected, setIsConnected] = useState<boolean>(true);

  useEffect(() => {
    // Subscribe to network state changes
    const unsubscribe = NetInfo.addEventListener(state => {
      // isInternetReachable is more accurate but can be null initially.
      // We check if it's explicitly false or if isConnected is false.
      const hasConnection =
        state.isConnected === true && state.isInternetReachable !== false;
      setIsConnected(hasConnection);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  if (isConnected) return null;

  return (
    <Animated.View 
      entering={FadeIn.duration(300)} 
      exiting={FadeOut.duration(300)}
      style={styles.wrapper}
    >
      {Platform.OS === 'ios' ? (
        <BlurView intensity={90} tint="dark" style={StyleSheet.absoluteFill} />
      ) : (
        <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.95)' }]} />
      )}
      
      <View style={styles.content}>
        <View style={styles.iconCircle}>
          <Ionicons name="wifi-outline" size={48} color="#EF4444" />
          <View style={styles.crossBadge}>
            <Ionicons name="close" size={14} color="#FFFFFF" />
          </View>
        </View>

        <Text style={styles.title}>No Internet Connection</Text>
        <Text style={styles.subtitle}>
          Neighborly requires an active internet connection to load posts, send messages, and receive real-time SOS alerts. 
          Please connect to Wi-Fi or Cellular Data.
        </Text>

        <View style={styles.waitingRow}>
          <ActivityIndicator size="small" color="#9CA3AF" />
          <Text style={styles.waitingText}>Waiting for connection...</Text>
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 9999999, // Above everything, even LocationBanner
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    alignItems: 'center',
    paddingHorizontal: 32,
    maxWidth: 400,
  },
  iconCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    position: 'relative',
  },
  crossBadge: {
    position: 'absolute',
    bottom: 5,
    right: 5,
    backgroundColor: '#EF4444',
    borderRadius: 12,
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#000000',
  },
  title: {
    color: '#FFFFFF',
    fontSize: 26,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 12,
  },
  subtitle: {
    color: '#9CA3AF',
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
    marginBottom: 36,
  },
  waitingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 100,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    gap: 12,
  },
  waitingText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
});
