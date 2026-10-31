import { Alert, Platform, Pressable, ScrollView, StyleSheet, Switch, View } from 'react-native';
import { router } from 'expo-router';
import Constants from 'expo-constants';
import { useTranslation } from 'react-i18next';
import { LANGS } from '@linux-learn/content';
import { useStore } from '../state/store';
import { useTheme, MONO, space } from '../theme';
import { themes, THEME_IDS } from '../theme/themes';
import { Body, Button, Card, H1, H2, IconButton, Row, Screen } from '../components/ui';
import { LANGUAGE_NAMES } from '../i18n';
import { syncReminder } from '../lib/reminders';
import { Text } from '../theme/Text';

function Chip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ checked: active }}
      style={[styles.chip, { backgroundColor: active ? theme.accent : theme.surface2 }]}
    >
      <Text style={{ color: active ? theme.onAccent : theme.text, fontWeight: '700' }}>{label}</Text>
    </Pressable>
  );
}

export default function SettingsScreen() {
  const theme = useTheme();
  const { t } = useTranslation();
  const s = useStore((st) => st.settings);
  const set = useStore((st) => st.setSettings);

  const toggleReminders = async (v: boolean) => {
    set({ reminders: v });
    if (v) {
      const ok = await syncReminder(true, s.reminderHour, t('settings.reminderTitle'), t('settings.reminderBody'));
      if (!ok) {
        set({ reminders: false });
        Alert.alert(t('settings.remindersDenied'));
      }
    }
  };

  const reset = () => {
    const doIt = () => {
      useStore.getState().resetAll();
      router.replace('/');
    };
    if (Platform.OS === 'web') {
      if (globalThis.confirm?.(t('settings.resetConfirm')) ?? true) doIt();
      return;
    }
    Alert.alert(t('settings.resetConfirm'), undefined, [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('common.reset'), style: 'destructive', onPress: doIt },
    ]);
  };

  return (
    <Screen edges={['top', 'bottom']}>
      <Row style={{ padding: space.sm }}>
        <IconButton icon="chevron-left" label={t('common.back')} onPress={() => router.back()} />
        <H1 style={{ fontSize: 24 }}>{t('settings.title')}</H1>
      </Row>
      <ScrollView contentContainerStyle={styles.content}>
        <H2>{t('settings.language')}</H2>
        <View style={styles.chips}>
          <Chip label={t('settings.system')} active={s.lang === 'system'} onPress={() => set({ lang: 'system' })} />
          {LANGS.map((l) => (
            <Chip key={l} label={LANGUAGE_NAMES[l]} active={s.lang === l} onPress={() => set({ lang: l })} />
          ))}
        </View>

        <H2>{t('settings.theme')}</H2>
        <View style={styles.themes}>
          {THEME_IDS.map((id) => {
            const th = themes[id];
            const active = s.theme === id;
            return (
              <Pressable
                key={id}
                onPress={() => set({ theme: id })}
                accessibilityRole="radio"
                accessibilityState={{ checked: active }}
                accessibilityLabel={t(`settings.themes.${id}`)}
                style={[styles.themeCard, { backgroundColor: th.term.bg, borderColor: active ? theme.accent : theme.border, borderWidth: active ? 2 : 1 }]}
              >
                <Text style={{ fontFamily: MONO, fontSize: 12 }}>
                  <Text style={{ color: th.term.user }}>student@trainer</Text>
                  <Text style={{ color: th.term.fg }}>:</Text>
                  <Text style={{ color: th.term.path }}>~</Text>
                  <Text style={{ color: th.term.fg }}>$ ls</Text>
                </Text>
                <Text style={{ fontFamily: MONO, fontSize: 12 }}>
                  <Text style={{ color: th.term.ansi[12] }}>docs</Text>
                  <Text style={{ color: th.term.fg }}>  notes.txt  </Text>
                  <Text style={{ color: th.term.ansi[10] }}>run.sh</Text>
                </Text>
                <Text style={{ color: th.term.fg, marginTop: 6, fontWeight: '700' }}>{t(`settings.themes.${id}`)}</Text>
              </Pressable>
            );
          })}
        </View>

        <H2>{t('settings.fontSize')}</H2>
        <Card style={{ gap: space.md }}>
          <Text style={{ fontFamily: MONO, fontSize: s.fontSize, color: theme.text }}>$ echo &quot;Hello, Linux&quot;</Text>
          <Row>
            <Button small variant="secondary" title="A−" onPress={() => set({ fontSize: Math.max(11, s.fontSize - 1) })} />
            <Text style={{ color: theme.text, fontFamily: MONO, minWidth: 40, textAlign: 'center' }}>{s.fontSize}</Text>
            <Button small variant="secondary" title="A+" onPress={() => set({ fontSize: Math.min(22, s.fontSize + 1) })} />
          </Row>
        </Card>

        <Card style={{ gap: space.md }}>
          <Row style={{ justifyContent: 'space-between' }}>
            <View style={{ flex: 1 }}>
              <Text style={{ color: theme.text, fontWeight: '700', fontSize: 16 }}>{t('settings.haptics')}</Text>
              <Body dim>{t('settings.hapticsHint')}</Body>
            </View>
            <Switch value={s.haptics} onValueChange={(v) => set({ haptics: v })} accessibilityLabel={t('settings.haptics')} />
          </Row>
          <Row style={{ justifyContent: 'space-between' }}>
            <View style={{ flex: 1 }}>
              <Text style={{ color: theme.text, fontWeight: '700', fontSize: 16 }}>{t('settings.reminders')}</Text>
              <Body dim>{t('settings.remindersHint')}</Body>
            </View>
            <Switch value={s.reminders} onValueChange={(v) => void toggleReminders(v)} accessibilityLabel={t('settings.reminders')} />
          </Row>
          {s.reminders ? (
            <Row>
              <Text style={{ color: theme.textDim }}>{t('settings.reminderTime')}</Text>
              {[8, 12, 19, 21].map((h) => (
                <Chip key={h} label={`${h}:00`} active={s.reminderHour === h} onPress={() => set({ reminderHour: h })} />
              ))}
            </Row>
          ) : null}
        </Card>

        <H2>{t('settings.privacy')}</H2>
        <Body dim>{t('settings.privacyText')}</Body>

        <Button variant="danger" title={t('settings.resetProgress')} onPress={reset} style={{ marginTop: space.lg }} />
        <Text style={{ color: theme.textDim, textAlign: 'center', marginTop: space.lg }}>
          Linux Terminal Trainer · {t('settings.version', { v: Constants.expoConfig?.version ?? '1.0.0' })}
        </Text>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { padding: space.lg, gap: space.md, paddingBottom: space.xxl, maxWidth: 720, width: '100%', alignSelf: 'center' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 999, minHeight: 40, justifyContent: 'center' },
  themes: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  themeCard: { width: '48%', flexGrow: 1, minWidth: 150, borderRadius: 14, padding: 12, gap: 2 },
});
