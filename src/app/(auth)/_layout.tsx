import { Stack } from 'expo-router';

export default function AuthLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="login" />
      <Stack.Screen name="location-permission" />
      <Stack.Screen name="gps-enable" />
    </Stack>
  );
}
