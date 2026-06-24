import React, { useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import Animated, { FadeInUp, FadeOutUp } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import Text from './Text';
import { useUIStore, ToastType } from '@/store/uiStore';

const getToastStyles = (type: ToastType) => {
  switch (type) {
    case 'success':
      return { iconColor: '#10B981', icon: 'checkmark-circle' };
    case 'error':
      return { iconColor: '#EF4444', icon: 'alert-circle' };
    case 'warning':
      return { iconColor: '#F59E0B', icon: 'warning' };
    case 'info':
    default:
      return { iconColor: '#3B82F6', icon: 'information-circle' };
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
      entering={FadeInUp.duration(300).springify().damping(18)} 
      exiting={FadeOutUp.duration(200)}
      style={styles.container}
      pointerEvents="box-none"
    >
      <TouchableOpacity 
        activeOpacity={0.9} 
        onPress={hideToast}
        style={styles.toast}
      >
        <Ionicons name={styleConfig.icon as any} size={20} color={styleConfig.iconColor} style={styles.icon} />
        <View style={styles.content}>
          <Text style={styles.title} numberOfLines={1}>{toastConfig.title}</Text>
          {toastConfig.message ? (
            <Text style={styles.message} numberOfLines={2}>
              {toastConfig.message}
            </Text>
          ) : null}
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 60,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 9999,
  },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#222222',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 100, // Pill shape
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
    maxWidth: '90%',
  },
  icon: {
    marginRight: 10,
  },
  content: {
    justifyContent: 'center',
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.2,
  },
  message: {
    fontSize: 13,
    marginTop: 2,
    color: '#A1A1AA',
    fontWeight: '500',
  },
});
