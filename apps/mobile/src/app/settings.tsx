import { useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Switch, View } from 'react-native';
import { router } from 'expo-router';
import Constants from 'expo-constants';
import { useTranslation } from 'react-i18next';
import { LANGS } from '@linux-learn/content';
import { useStore } from '../state/store';
import { useTheme, MONO, space } from '../theme';
import { themes, THEME_IDS } from '../theme/themes';
import { Body, Button, Card, H1, H2, Icon, IconButton, Row, Screen } from '../components/ui';
import { LANGUAGE_NAMES } from '../i18n';
import { syncReminder } from '../lib/reminders';
import { Text } from '../theme/Text';
import { TextInput } from 'react-native';
import { TermKeyboard } from '../components/terminal/TermKeyboard';
import { DEFAULT_QUICK, type KeyboardSettings } from '../state/store';
import { BackButton } from '../components/BackButton';
import { confirmDialog, infoDialog } from '../components/Dialog';
import { sound } from '../lib/sound';
import { haptic } from '../lib/haptics';

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
        infoDialog({ title: t('settings.remindersDenied'), message: t('settings.remindersDeniedHint'), ok: t('common.ok'), icon: 'bell-off', tone: 'warning' });
      }
    }
  };

  const reset = () => {
    const doIt = () => {
      useStore.getState().resetAll();
      router.replace('/');
    };
    confirmDialog({ title: t('settings.resetProgress'), message: t('settings.resetConfirm'), confirm: t('common.reset'), cancel: t('common.cancel'), destructive: true, icon: 'trash', onConfirm: doIt });
  };

  return (
    <Screen edges={['top', 'bottom']}>
      <Row style={{ padding: space.sm }}>
        <BackButton />
        <H1 style={{ fontSize: 24 }}>{t('settings.title')}</H1>
      </Row>
      <ScrollView contentContainerStyle={styles.content}>
        <H2>{t('settings.language')}</H2>
        <View style={styles.chips}>
          <Chip label={t('settings.system')} active={s.lang === 'system'} onPress={() => { haptic.tap(); set({ lang: 'system' }); }} />
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
                  <Text style={{ fontFamily: MONO, color: th.term.user }}>student@trainer</Text>
                  <Text style={{ fontFamily: MONO, color: th.term.fg }}>:</Text>
                  <Text style={{ fontFamily: MONO, color: th.term.path }}>~</Text>
                  <Text style={{ fontFamily: MONO, color: th.term.fg }}>$ ls</Text>
                </Text>
                <Text style={{ fontFamily: MONO, fontSize: 12 }}>
                  <Text style={{ fontFamily: MONO, color: th.term.ansi[12] }}>docs</Text>
                  <Text style={{ fontFamily: MONO, color: th.term.fg }}>  notes.txt  </Text>
                  <Text style={{ fontFamily: MONO, color: th.term.ansi[10] }}>run.sh</Text>
                </Text>
                <Text style={{ color: th.term.fg, marginTop: 6, fontWeight: '700' }}>{t(`settings.themes.${id}`)}</Text>
              </Pressable>
            );
          })}
        </View>

        <H2>{t('keyboard.title')}</H2>
        <KeyboardSettingsCard />

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
            <Switch
              value={s.haptics}
              onValueChange={(v) => {
                set({ haptics: v });
                if (v) setTimeout(() => haptic.success(), 50);
              }}
              accessibilityLabel={t('settings.haptics')}
            />
          </Row>
          <Row style={{ justifyContent: 'space-between' }}>
            <View style={{ flex: 1 }}>
              <Text style={{ color: theme.text, fontWeight: '700', fontSize: 16 }}>{t('settings.sounds')}</Text>
              <Body dim>{t('settings.soundsHint')}</Body>
            </View>
            <Switch
              value={s.sounds}
              onValueChange={(v) => {
                set({ sounds: v });
                if (v) setTimeout(() => sound.play('success'), 50);
              }}
              accessibilityLabel={t('settings.sounds')}
            />
          </Row>
          {Platform.OS !== 'ios' ? (
            <Row style={{ justifyContent: 'space-between' }}>
              <View style={{ flex: 1 }}>
                <Text style={{ color: theme.text, fontWeight: '700', fontSize: 16 }}>{t('settings.immersive')}</Text>
                <Body dim>{t('settings.immersiveHint')}</Body>
              </View>
              <Switch value={s.immersive} onValueChange={(v) => set({ immersive: v })} accessibilityLabel={t('settings.immersive')} />
            </Row>
          ) : null}
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

        <Card onPress={() => router.push('/backup')} accessibilityLabel={t('backup.title')}>
          <Row gap={12}>
            <Icon name="swap-horizontal-circle-outline" size={28} color={theme.accent} />
            <View style={{ flex: 1 }}>
              <Text style={{ color: theme.text, fontWeight: '800', fontSize: 16 }}>{t('backup.title')}</Text>
              <Body dim>{t('backup.entry')}</Body>
            </View>
            <Icon name="chevron-right" color={theme.textDim} />
          </Row>
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
  qchip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  qinput: { flex: 1, borderWidth: 1, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 8, fontSize: 14 },
  preview: { borderRadius: 12, borderWidth: StyleSheet.hairlineWidth, overflow: 'hidden' },
  themes: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  themeCard: { width: '48%', flexGrow: 1, minWidth: 150, borderRadius: 14, padding: 12, gap: 2 },
});

/** Keyboard settings with a live preview of the keyboard itself. */
function KeyboardSettingsCard() {
  const theme = useTheme();
  const { t } = useTranslation();
  const kb = useStore((st) => st.settings.keyboard);
  const setSettings = useStore((st) => st.setSettings);
  const [draft, setDraft] = useState('');
  const [typed, setTyped] = useState('');
  const set = (patch: Partial<KeyboardSettings>) => setSettings({ keyboard: { ...kb, ...patch } });
  const noop = () => undefined;
  return (
    <Card style={{ gap: space.md }}>
      <View style={styles.chips}>
        <Chip label={t('keyboard.custom')} active={kb.mode === 'custom'} onPress={() => set({ mode: 'custom' })} />
        <Chip label={t('keyboard.system')} active={kb.mode === 'system'} onPress={() => set({ mode: 'system' })} />
      </View>
      <Body dim>{kb.mode === 'custom' ? t('keyboard.customHint') : t('keyboard.systemHint')}</Body>
      {kb.mode === 'custom' ? (
        <>
          <Row style={{ flexWrap: 'wrap' }}>
            <Text style={{ color: theme.textDim, minWidth: 110 }}>{t('keyboard.size')}</Text>
            {(['S', 'M', 'L'] as const).map((z) => (
              <Chip key={z} label={t(`keyboard.sizes.${z}`)} active={kb.size === z} onPress={() => set({ size: z })} />
            ))}
          </Row>
          <Row style={{ flexWrap: 'wrap' }}>
            <Text style={{ color: theme.textDim, minWidth: 110 }}>{t('keyboard.opacity')}</Text>
            {[1, 0.85, 0.7].map((o) => (
              <Chip key={o} label={`${Math.round(o * 100)}%`} active={Math.abs(kb.opacity - o) < 0.01} onPress={() => set({ opacity: o })} />
            ))}
          </Row>
          <Row style={{ justifyContent: 'space-between' }}>
            <Text style={{ color: theme.text, flex: 1 }}>{t('keyboard.numberRow')}</Text>
            <Switch value={kb.numberRow} onValueChange={(v) => set({ numberRow: v })} accessibilityLabel={t('keyboard.numberRow')} />
          </Row>
          <Row style={{ justifyContent: 'space-between' }}>
            <Text style={{ color: theme.text, flex: 1 }}>{t('keyboard.keySound')}</Text>
            <Switch value={kb.keySound} onValueChange={(v) => set({ keySound: v })} accessibilityLabel={t('keyboard.keySound')} />
          </Row>
          <Text style={{ color: theme.text, fontWeight: '700' }}>{t('keyboard.quick')}</Text>
          <View style={styles.chips}>
            {kb.quick.map((q) => (
              <Pressable
                key={q}
                onPress={() => set({ quick: kb.quick.filter((x) => x !== q) })}
                accessibilityRole="button"
                accessibilityHint={t('keyboard.removeQuick')}
                style={[styles.qchip, { backgroundColor: theme.surface2 }]}
              >
                <Text style={{ fontFamily: MONO, color: theme.accent }}>{q.trimEnd()}</Text>
                <Text style={{ color: theme.textDim }}>✕</Text>
              </Pressable>
            ))}
          </View>
          <Row>
            <TextInput
              value={draft}
              onChangeText={setDraft}
              placeholder={t('keyboard.addQuick')}
              placeholderTextColor={theme.textDim}
              autoCapitalize="none"
              autoCorrect={false}
              onSubmitEditing={() => {
                if (draft.trim() && !kb.quick.includes(draft)) set({ quick: [...kb.quick, draft] });
                setDraft('');
              }}
              style={[styles.qinput, { color: theme.text, borderColor: theme.border, fontFamily: MONO }]}
            />
            <Button small variant="secondary" title={t('keyboard.reset')} onPress={() => set({ quick: DEFAULT_QUICK })} />
          </Row>
          <Text style={{ color: theme.textDim, fontSize: 13 }}>{t('keyboard.preview')}</Text>
          <View style={[styles.preview, { backgroundColor: theme.term.bg, borderColor: theme.border }]}>
            <Text style={{ fontFamily: MONO, color: theme.term.fg, padding: 10 }}>
              $ {typed}
              <Text style={{ color: theme.term.cursor }}>▌</Text>
            </Text>
            <TermKeyboard
              actions={{
                insert: (x) => setTyped((v) => (v + x).slice(-40)),
                backspace: () => setTyped((v) => v.slice(0, -1)),
                enter: () => setTyped(''),
                special: noop,
                control: (c) => (c === 'c' || c === 'u' ? setTyped('') : undefined),
                alt: noop,
                hide: noop,
              }}
            />
          </View>
        </>
      ) : null}
    </Card>
  );
}
