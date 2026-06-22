import React, { useState } from 'react';
import {
  TextInput,
  TextInputProps,
  View,
  StyleSheet,
  TouchableOpacity,
  Text,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/colors';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  hint?: string;
  theme?: 'dark' | 'light';
  leftIcon?: string;
}

export default function Input({
  label,
  error,
  hint,
  style,
  onFocus,
  onBlur,
  secureTextEntry,
  theme = 'dark',
  leftIcon,
  ...props
}: InputProps) {
  const [isFocused, setIsFocused] = useState(false);
  const [isSecure, setIsSecure] = useState(secureTextEntry);

  const isDark = theme === 'dark';

  return (
    <View style={styles.wrapper}>
      {label && (
        <Text style={[styles.label, isDark ? styles.labelDark : styles.labelLight]}>
          {label}
        </Text>
      )}
      <View
        style={[
          styles.inputContainer,
          props.multiline && styles.multilineContainer,
          isDark ? styles.containerDark : styles.containerLight,
          isFocused && (isDark ? styles.focusedDark : styles.focusedLight),
          !!error && styles.errored,
        ]}
      >
        {leftIcon && (
          <Ionicons
            name={leftIcon as any}
            size={18}
            color={isFocused ? Colors.primary : isDark ? '#606070' : Colors.textSecondary}
            style={styles.leftIcon}
          />
        )}
        <TextInput
          placeholderTextColor={isDark ? '#505060' : '#ABABAB'}
          secureTextEntry={isSecure}
          onFocus={(e) => {
            setIsFocused(true);
            if (onFocus) onFocus(e);
          }}
          onBlur={(e) => {
            setIsFocused(false);
            if (onBlur) onBlur(e);
          }}
          style={[
            styles.textInput,
            isDark ? styles.textInputDark : styles.textInputLight,
            props.multiline && { textAlignVertical: 'top' },
            style,
          ]}
          {...props}
        />
        {secureTextEntry && (
          <TouchableOpacity
            style={styles.iconButton}
            onPress={() => setIsSecure(!isSecure)}
            activeOpacity={0.7}
          >
            <Ionicons
              name={isSecure ? 'eye-off-outline' : 'eye-outline'}
              size={20}
              color={isDark ? '#505060' : Colors.textSecondary}
            />
          </TouchableOpacity>
        )}
      </View>
      {!!error && (
        <Text style={styles.errorText}>{error}</Text>
      )}
      {!!hint && !error && (
        <Text style={styles.hintText}>{hint}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    width: '100%',
    marginBottom: 18,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8,
    letterSpacing: 0.1,
  },
  labelDark: { color: '#A0A0B0' },
  labelLight: { color: Colors.textSecondary },

  inputContainer: {
    borderWidth: 1.5,
    borderRadius: 14,
    height: 54,
    flexDirection: 'row',
    alignItems: 'center',
    overflow: 'hidden',
  },
  multilineContainer: {
    height: undefined,
    minHeight: 110,
    paddingVertical: 12,
    alignItems: 'flex-start',
  },
  containerDark: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderColor: 'rgba(255,255,255,0.08)',
  },
  containerLight: {
    backgroundColor: '#FFFFFF',
    borderColor: Colors.border,
  },
  focusedDark: {
    borderColor: Colors.primary,
    backgroundColor: 'rgba(26,107,74,0.06)',
  },
  focusedLight: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryLight,
  },
  errored: {
    borderColor: Colors.danger,
  },
  leftIcon: {
    marginLeft: 14,
  },
  textInput: {
    flex: 1,
    fontSize: 15,
    paddingHorizontal: 14,
    height: '100%',
    fontWeight: '500',
  },
  textInputDark: { color: '#F0F0F5' },
  textInputLight: { color: Colors.text },
  iconButton: {
    paddingHorizontal: 14,
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    color: Colors.danger,
    fontSize: 12,
    fontWeight: '500',
    marginTop: 6,
    marginLeft: 2,
  },
  hintText: {
    color: Colors.textTertiary,
    fontSize: 12,
    marginTop: 6,
    marginLeft: 2,
  },
});
