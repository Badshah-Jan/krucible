import React, { useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, Modal } from 'react-native';
import Animated, { FadeInUp, FadeOutUp, useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import Text from './Text';
import { useUIStore, ToastType } from '@/store/uiStore';
import { BlurView } from 'expo-blur';

const getToastStyles = (type: ToastType) => {
  switch (type) {
    case 'success':
      return { bg: '#ECFDF5', border: '#10B981', text: '#065F46', icon: 'checkmark-circle' };
    case 'error':
      return { bg: '#FEF2F2', border: '#EF4444', text: '#991B1B', icon: 'close-circle' };
    case 'warning':
      return { bg: '#FFFBEB', border: '#F59E0B', text: '#92400E', icon: 'warning' };
    case 'info':
    default:
      return { bg: '#EFF6FF', border: '#3B82F6', text: '#1E40AF', icon: 'information-circle' };
  }
};

export default function CustomToast() {
  const { toastVisible, toastConfig, hideToast } = useUIStore();

  useEffect(() => {
    if (toastVisible && toastConfig?.duration) {
      const timer = setTimeout(hideToast, toastConfig.duration);
      return () => clearTimeout(timer);
    }
  }, [toastVisible, toastConfig]);

  if (!toastVisible || !toastConfig) return null;

  const styleConfig = getToastStyles(toastConfig.type || 'info');

  return (
    <Animated.View 
      entering={FadeInUp.duration(300).springify()} 
      exiting={FadeOutUp.duration(200)}
      style={styles.container}
    >
      <TouchableOpacity 
        activeOpacity={0.9} 
        onPress={hideToast}
        style={[styles.toast, { backgroundColor: styleConfig.bg, borderColor: styleConfig.border }]}
      >
        <Ionicons name={styleConfig.icon as any} size={22} color={styleConfig.border} style={styles.icon} />
        <View style={styles.content}>
          <Text style={[styles.title, { color: styleConfig.text }]}>{toastConfig.title}</Text>
          {toastConfig.message ? (
            <Text style={[styles.message, { color: styleConfig.text }]} numberOfLines={2}>
              {toastConfig.message}
            </Text>
          ) : null}
        </View>
        <Ionicons name="close" size={16} color={styleConfig.text} style={styles.closeBtn} />
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 50,
    left: 16,
    right: 16,
    zIndex: 9999,
  },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 3,
  },
  icon: {
    marginRight: 12,
  },
  content: {
    flex: 1,
  },
  title: {
    fontSize: 14,
    fontWeight: '800',
  },
  message: {
    fontSize: 12,
    marginTop: 2,
    opacity: 0.8,
  },
  closeBtn: {
    marginLeft: 12,
    opacity: 0.5,
  }
});
