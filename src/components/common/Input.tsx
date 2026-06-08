import React, { useState } from 'react';
import { TextInput, TextInputProps, View, StyleSheet } from 'react-native';
import Text from './Text';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
}

export default function Input({
  label,
  error,
  style,
  onFocus,
  onBlur,
  ...props
}: InputProps) {
  const [isFocused, setIsFocused] = useState(false);

  return (
    <View style={styles.wrapper}>
      {label && (
        <Text variant="captionBold" color="gray" style={styles.label}>
          {label}
        </Text>
      )}
      <View
        style={[
          styles.inputContainer,
          props.multiline && styles.multilineContainer,
          isFocused ? styles.focused : error ? styles.errored : styles.normal,
        ]}
      >
        <TextInput
          placeholderTextColor="#6B7280"
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
            props.multiline && { textAlignVertical: 'top' },
            style,
          ]}
          {...props}
        />
      </View>
      {error && (
        <Text variant="caption" color="red" style={styles.errorText}>
          {error}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    width: '100%',
    marginBottom: 16,
  },
  label: {
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 2,
  },
  inputContainer: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderRadius: 16,
    overflow: 'hidden',
    height: 56,
  },
  multilineContainer: {
    height: undefined,
    minHeight: 120,
    paddingVertical: 4,
  },
  normal: {
    borderColor: 'rgba(255,255,255,0.10)',
  },
  focused: {
    borderColor: '#2563EB',
  },
  errored: {
    borderColor: '#EF4444',
  },
  textInput: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 16,
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  errorText: {
    marginTop: 4,
    marginLeft: 4,
  },
});
