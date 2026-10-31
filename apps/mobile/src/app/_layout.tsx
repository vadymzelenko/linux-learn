import '../i18n';
import { useEffect } from 'react';
import { Platform, View } from 'react-native';
import { Stack, type ErrorBoundaryProps } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import * as SystemUI from 'expo-system-ui';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useFonts, JetBrainsMono_400Regular, JetBrainsMono_700Bold } from '@expo-google-fonts/jetbrains-mono';
import { Onest_400Regular, Onest_500Medium, Onest_600SemiBold, Onest_700Bold, Onest_800ExtraBold } from '@expo-google-fonts/onest';
import { useTranslation } from 'react-i18next';
import i18n, { resolveLang } from '../i18n';
import { AppThemeProvider, useTheme } from '../theme';
import { useStore } from '../state/store';
import { Toasts } from '../components/Toasts';
import { syncReminder } from '../lib/reminders';
import { Button } from '../components/ui';
import { GlossaryProvider } from '../components/ui/RichText';
import { Text } from '../theme/Text';

void SplashScreen.preventAutoHideAsync().catch(() => undefined);

function Shell() {
  const theme = useTheme();
  const { t } = useTranslation();
  const settings = useStore((s) => s.settings);

  useEffect(() => {
    void SystemUI.setBackgroundColorAsync(theme.bg).catch(() => undefined);
  }, [theme.bg]);

  useEffect(() => {
    void syncReminder(settings.reminders, settings.reminderHour, t('settings.reminderTitle'), t('settings.reminderBody'));
  }, [settings.reminders, settings.reminderHour, t]);

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      <StatusBar style={theme.dark ? 'light' : 'dark'} />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: theme.bg }, animation: Platform.OS === 'android' ? 'fade_from_bottom' : 'default' }} />
      <Toasts />
    </View>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({ JetBrainsMono_400Regular, JetBrainsMono_700Bold, Onest_400Regular, Onest_500Medium, Onest_600SemiBold, Onest_700Bold, Onest_800ExtraBold });
  const hydrated = useStore((s) => s.hydrated);
  const lang = useStore((s) => s.settings.lang);

  useEffect(() => {
    void i18n.changeLanguage(resolveLang(lang));
  }, [lang]);

  const ready = (fontsLoaded || !!fontError) && hydrated;
  useEffect(() => {
    if (ready) void SplashScreen.hideAsync().catch(() => undefined);
  }, [ready]);

  if (!ready) return null;
  return (
    <SafeAreaProvider>
      <AppThemeProvider>
        <GlossaryProvider>
          <Shell />
        </GlossaryProvider>
      </AppThemeProvider>
    </SafeAreaProvider>
  );
}

export function ErrorBoundary({ error, retry }: ErrorBoundaryProps) {
  return (
    <View style={{ flex: 1, backgroundColor: '#0B0F14', alignItems: 'center', justifyContent: 'center', padding: 24, gap: 12 }}>
      <Text style={{ color: '#E6EDF3', fontSize: 22, fontWeight: '800' }}>{i18n.t('errors.title')}</Text>
      <Text style={{ color: '#9AA7B4', textAlign: 'center' }}>{i18n.t('errors.text')}</Text>
      <Text style={{ color: '#5A6876', fontSize: 12 }}>{error.message}</Text>
      <Button title={i18n.t('common.retry')} onPress={retry} />
    </View>
  );
}
