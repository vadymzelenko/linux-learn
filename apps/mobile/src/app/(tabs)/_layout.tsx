import { StyleSheet, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Redirect } from 'expo-router';
import { Tabs } from 'expo-router/tabs';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../theme';
import { useStore } from '../../state/store';
import { Icon } from '../../components/ui/Icon';
import { Text } from '../../theme/Text';

export default function TabsLayout() {
  const theme = useTheme();
  const { t } = useTranslation();
  const onboarded = useStore((s) => s.settings.onboarded);
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  // landscape puts the label next to the icon, so the bar can be lower
  const barHeight = (width > height ? 52 : 66) + insets.bottom;
  // narrow phones: smaller labels so "Sandbox" / "Practice" are not cut off
  const labelSize = width < 360 ? 9.5 : width < 400 ? 10.5 : 12;
  if (!onboarded) return <Redirect href="/onboarding" />;
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.accent,
        tabBarInactiveTintColor: theme.textDim,
        tabBarStyle: { backgroundColor: theme.surface, borderTopColor: theme.border, borderTopWidth: StyleSheet.hairlineWidth, height: barHeight, paddingTop: 4, paddingBottom: 4 + insets.bottom, elevation: 0 },
        // own label: the default one has a fixed height that cuts descenders (y, g, ą)
        tabBarLabel: ({ color, children, position }) => (
          <Text numberOfLines={1} style={{ flexShrink: 0, color, fontWeight: '700', fontSize: position === 'beside-icon' ? 13 : labelSize, lineHeight: Math.round((position === 'beside-icon' ? 13 : labelSize) * 1.45), marginLeft: position === 'beside-icon' ? 12 : 0, marginTop: position === 'beside-icon' ? 0 : 2 }}>
            {children}
          </Text>
        ),
        tabBarItemStyle: { paddingHorizontal: 0 },
        animation: 'shift',
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
