import { Tabs } from 'expo-router';
import TabBar from '@/components/navigation/TabBar';
import { useTranslation } from 'react-i18next';

export default function TabLayout() {
  const { t } = useTranslation();
  return (
    <Tabs
      tabBar={(props) => <TabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tabs.Screen name="index" options={{ title: t('home', 'Home') }} />
      <Tabs.Screen name="explore" options={{ title: t('nearby', 'Nearby') }} />
      <Tabs.Screen name="sos-dummy" options={{ title: t('sos', 'SOS') }} />
      <Tabs.Screen name="chats" options={{ title: t('chats', 'Chats') }} />
      <Tabs.Screen name="profile" options={{ title: t('profile', 'Profile') }} />
    </Tabs>
  );
}
