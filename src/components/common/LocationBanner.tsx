import React, { useEffect, useRef } from 'react';
import {
  View,
  Platform,
  Linking,
  StyleSheet,
  TouchableOpacity,
  Text,
  AppState,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ExpoLocation from 'expo-location';
import { BlurView } from 'expo-blur';
import { useAppStore } from '@/store/appStore';
import { LocationMonitorService } from '@/services/locationMonitorService';

export default function LocationBanner() {
  const isGpsDisabled = useAppStore((state) => state.isGpsDisabled);

  const handleEnable = async () => {
    if (Platform.OS === 'android') {
      try {
        await Linking.sendIntent('android.settings.LOCATION_SOURCE_SETTINGS');
      } catch {
        Linking.openSettings();
      }
    } else {
      Linking.openSettings();
    }
  };

  const checkGpsStatus = async () => {
    try {
      const on = await ExpoLocation.hasServicesEnabledAsync();
      if (on) {
        // Automatically recover and hide banner via the service
        LocationMonitorService.checkLocationState();
      }
    } catch (_) {}
  };

  // Auto-dismiss when GPS returns via AppState change or interval
  useEffect(() => {
    if (!isGpsDisabled) return;
    
    // 1. AppState listener (immediate detection when app returns from background settings)
    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') {
        checkGpsStatus();
      }
    });

    // 2. Fallback Interval (detects if user turns on GPS via quick settings drawer without leaving app)
    const interval = setInterval(() => {
      checkGpsStatus();
    }, 5000); // Check every 5 seconds while banner is visible

    return () => {
      subscription.remove();
      clearInterval(interval);
    };
  }, [isGpsDisabled]);

  if (!isGpsDisabled) return null;

  return (
    <Modal
      visible={isGpsDisabled}
      transparent={true}
      animationType="fade"
      onRequestClose={() => {
        // Explicitly do nothing to prevent hardware back button dismissal
      }}
    >
      <View style={styles.wrapper}>
        {Platform.OS === 'ios' ? (
          <BlurView intensity={90} tint="dark" style={StyleSheet.absoluteFill} />
        ) : (
          <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.95)' }]} />
        )}
        
        <View style={styles.content}>
          <View style={styles.iconCircle}>
            <Ionicons name="location" size={48} color="#EF4444" />
          </View>

          <Text style={styles.title}>Location Required</Text>
          <Text style={styles.subtitle}>
            Neighborly requires an active GPS connection to keep the community safe.
            You cannot browse, post, or chat while your location is disabled.
          </Text>

          <TouchableOpacity style={styles.enableBtn} onPress={handleEnable} activeOpacity={0.85}>
            <Ionicons name="settings" size={18} color="#FFFFFF" />
            <Text style={styles.enableBtnText}>Enable Location Settings</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.refreshRow} 
            activeOpacity={0.7}
            onPress={checkGpsStatus}
          >
            <Ionicons name="refresh" size={16} color="#9CA3AF" />
            <Text style={styles.waitingText}>I've enabled it (Refresh)</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 999999, // Ensure it's above everything
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
  enableBtn: {
    flexDirection: 'row',
    backgroundColor: '#EF4444',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderRadius: 100,
    alignItems: 'center',
    gap: 8,
    width: '100%',
    justifyContent: 'center',
  },
  enableBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  refreshRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 24,
    padding: 8,
  },
  waitingText: {
    color: '#6B7280',
    fontSize: 14,
    fontWeight: '500',
  },
});
