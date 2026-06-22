import React from 'react';
import { Pressable, StyleSheet, ViewStyle, TextStyle, ActivityIndicator } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import Text from './Text';
import { Colors } from '@/constants/colors';

interface ButtonProps {
  onPress: () => void;
  title: string;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  icon?: React.ReactNode;
  style?: ViewStyle;
  textStyle?: TextStyle;
  disabled?: boolean;
  loading?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export default function Button({
  onPress,
  title,
  variant = 'primary',
  icon,
  style,
  textStyle,
  disabled = false,
  loading = false,
  size = 'lg',
}: ButtonProps) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.97, { damping: 15, stiffness: 400 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 15, stiffness: 400 });
  };

  const sizeStyle = size === 'sm' ? styles.sizeSm : size === 'md' ? styles.sizeMd : styles.sizeLg;
  const textSizeStyle = size === 'sm' ? styles.textSm : size === 'md' ? styles.textMd : styles.textLg;

  const variantStyle = {
    primary: styles.primary,
    secondary: styles.secondary,
    outline: styles.outline,
    ghost: styles.ghost,
    danger: styles.danger,
  }[variant];

  const textColorStyle = {
    primary: styles.textWhite,
    secondary: styles.textPrimary,
    outline: styles.textPrimary,
    ghost: styles.textPrimary,
    danger: styles.textWhite,
  }[variant];

  return (
    <Animated.View style={[animatedStyle, style]}>
      <Pressable
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={disabled || loading}
        style={[
          styles.base,
          sizeStyle,
          variantStyle,
          (disabled || loading) && styles.disabled,
        ]}
      >
        {loading ? (
          <ActivityIndicator
            size="small"
            color={variant === 'primary' || variant === 'danger' ? '#FFFFFF' : Colors.primary}
          />
        ) : (
          <>
            {icon && icon}
            <Text style={[styles.text, textSizeStyle, textColorStyle, textStyle]}>
              {title}
            </Text>
          </>
        )}
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  sizeLg: { paddingVertical: 16, paddingHorizontal: 24 },
  sizeMd: { paddingVertical: 13, paddingHorizontal: 20 },
  sizeSm: { paddingVertical: 9, paddingHorizontal: 16 },

  primary: { backgroundColor: Colors.primary },
  secondary: { backgroundColor: Colors.primaryLight },
  outline: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: Colors.primary,
  },
  ghost: { backgroundColor: 'transparent' },
  danger: { backgroundColor: Colors.danger },
  disabled: { opacity: 0.45 },

  text: { fontWeight: '700', letterSpacing: -0.2 },
  textLg: { fontSize: 16 },
  textMd: { fontSize: 14 },
  textSm: { fontSize: 13 },
  textWhite: { color: '#FFFFFF' },
  textPrimary: { color: Colors.primary },
});
