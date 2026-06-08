import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface State {
  hasError: boolean;
  error: Error | null;
}

// Try to import expo-updates if available, otherwise use mock
let Updates: any = null;
try {
  Updates = require('expo-updates');
} catch (e) {
  console.log('[ErrorBoundary] expo-updates not available - fallback to dev mode');
}

export default class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  State
> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[ErrorBoundary] Caught rendering error:', error, info.componentStack);
  }

  handleReload = async () => {
    try {
      // Try Updates if available (production)
      if (Updates && Updates.reloadAsync) {
        await Updates.reloadAsync();
      } else {
        // Fallback to dev mode reload
        this.setState({ hasError: false, error: null });
        if (__DEV__) {
          console.log('[ErrorBoundary] Dev mode - resetting error state');
        }
      }
    } catch {
      // If all else fails, just reset state
      this.setState({ hasError: false, error: null });
    }
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <View style={s.container}>
        <Ionicons name="warning-outline" size={52} color="#EF4444" />
        <Text style={s.title}>Something went wrong</Text>
        <Text style={s.sub}>
          The app ran into an unexpected error. Your data is safe.
        </Text>
        <TouchableOpacity style={s.btn} onPress={this.handleReload} activeOpacity={0.85}>
          <Ionicons name="refresh" size={16} color="#FFFFFF" style={{ marginRight: 8 }} />
          <Text style={s.btnText}>Reload App</Text>
        </TouchableOpacity>
        {__DEV__ && this.state.error && (
          <Text style={s.debug} numberOfLines={4}>
            {this.state.error.message}
          </Text>
        )}
      </View>
    );
  }
}

const s = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: '#111827',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  sub: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 28,
  },
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#111827',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 100,
  },
  btnText: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },
  debug: {
    marginTop: 24,
    fontSize: 10,
    color: '#9CA3AF',
    fontFamily: 'monospace',
    textAlign: 'center',
  },
});
