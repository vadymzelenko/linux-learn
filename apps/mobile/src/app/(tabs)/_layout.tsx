import { Redirect } from 'expo-router';
import { Tabs } from 'expo-router/tabs';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../theme';
import { useStore } from '../../state/store';
import { Icon } from '../../components/ui/Icon';

export default function TabsLayout() {
  const theme = useTheme();
  const { t } = useTranslation();
  const onboarded = useStore((s) => s.settings.onboarded);
  if (!onboarded) return <Redirect href="/onboarding" />;
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.accent,
        tabBarInactiveTintColor: theme.textDim,
        tabBarStyle: { backgroundColor: theme.surface, borderTopColor: theme.border },
        tabBarLabelStyle: { fontWeight: '700' },
        sceneStyle: { backgroundColor: theme.bg },
      }}
    >
      <Tabs.Screen name="index" options={{ title: t('tabs.home'), tabBarIcon: ({ color }) => <Icon name="home" color={String(color)} /> }} />
      <Tabs.Screen name="courses" options={{ title: t('tabs.courses'), tabBarIcon: ({ color }) => <Icon name="learn" color={String(color)} /> }} />
      <Tabs.Screen name="sandbox" options={{ title: t('tabs.sandbox'), tabBarIcon: ({ color }) => <Icon name="sandbox" color={String(color)} /> }} />
      <Tabs.Screen name="practice" options={{ title: t('tabs.practice'), tabBarIcon: ({ color }) => <Icon name="practice" color={String(color)} /> }} />
      <Tabs.Screen name="profile" options={{ title: t('tabs.profile'), tabBarIcon: ({ color }) => <Icon name="profile" color={String(color)} /> }} />
    </Tabs>
  );
}
