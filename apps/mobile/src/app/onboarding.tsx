import { useMemo, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { createShell } from '@linux-learn/engine';
import { LANGS } from '@linux-learn/content';
import { useStore } from '../state/store';
import { useTheme, MONO, MONO_BOLD, space } from '../theme';
import { Body, Button, H1, Icon, Row, Screen } from '../components/ui';
import { Terminal, useColumns } from '../components/terminal/Terminal';
import { useShell } from '../components/terminal/useShell';
import { LANGUAGE_NAMES, resolveLang } from '../i18n';
import { haptic } from '../lib/haptics';

const SLIDES = [
  { icon: 'terminal', title: 'onboarding.s1Title', text: 'onboarding.s1Text', art: '$ ls -la ~\ndrwxr-x--- student student .\n-rw-r--r-- student notes.txt' },
  { icon: 'target', title: 'onboarding.s2Title', text: 'onboarding.s2Text', art: '[✓] mkdir project\n[✓] mv notes.txt project/\n[ ] ...' },
  { icon: 'shield', title: 'onboarding.s3Title', text: 'onboarding.s3Text', art: "$ sudo rm -rf --no-preserve-root /\n$ ls /\n$ # reset → all good" },
] as const;

function FirstCommand() {
  const theme = useTheme();
  const { t } = useTranslation();
  const columns = useColumns();
  const initial = useMemo(() => createShell({ files: { '~/notes.txt': 'Learn Linux\n' } }), []);
  const [done, setDone] = useState(false);
  const shell = useShell(initial, {
    columns,
    onExec: (r) => {
      if (r.executed.some((e) => e.name === 'pwd' && e.exitCode === 0)) {
        haptic.success();
        setDone(true);
      }
    },
  });
  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={{ flex: 1, padding: space.lg, gap: space.md }}>
        <H1>{t('onboarding.firstCommandTitle')}</H1>
        <Body>{done ? t('onboarding.firstCommandDone') : t('onboarding.firstCommandText')}</Body>
        <Terminal shell={shell} autoFocus style={{ flex: 1 }} />
        {done ? (
          <Button
            title={t('onboarding.letsGo')}
            icon="play"
            onPress={() => {
              useStore.getState().setSettings({ onboarded: true });
              useStore.getState().gainXp(5);
              router.replace('/');
            }}
          />
        ) : (
          <Button variant="secondary" title="pwd" onPress={() => shell.execute('pwd')} style={{ borderColor: theme.border }} />
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

export default function Onboarding() {
  const theme = useTheme();
  const { t } = useTranslation();
  const [index, setIndex] = useState(0);
  const lang = useStore((s) => s.settings.lang);
  if (index >= SLIDES.length) {
    return (
      <Screen edges={['top', 'bottom']}>
        <FirstCommand />
      </Screen>
    );
  }
  const slide = SLIDES[index]!;
  return (
    <Screen edges={['top', 'bottom']}>
      <View style={styles.wrap}>
        {index === 0 ? (
          <View style={styles.langs} accessibilityLabel={t('onboarding.language')}>
            {LANGS.map((l) => {
              const active = resolveLang(lang) === l;
              return (
                <Pressable
                  key={l}
                  onPress={() => useStore.getState().setSettings({ lang: l })}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: active }}
                  style={[styles.lang, { backgroundColor: active ? theme.accent : theme.surface2 }]}
                >
                  <Text style={{ color: active ? theme.onAccent : theme.text, fontWeight: '700' }}>{LANGUAGE_NAMES[l]}</Text>
                </Pressable>
              );
            })}
          </View>
        ) : (
          <View style={{ height: 44 }} />
        )}
        <View style={styles.center}>
          <View style={[styles.icon, { backgroundColor: theme.surface2 }]}>
            <Icon name={slide.icon} size={52} color={theme.accent} />
          </View>
          <View style={[styles.art, { backgroundColor: theme.term.bg, borderColor: theme.border }]}>
            <Text style={{ fontFamily: MONO, color: theme.term.fg, fontSize: 13, lineHeight: 20 }}>{slide.art}</Text>
          </View>
          <H1 style={{ textAlign: 'center' }}>{t(slide.title)}</H1>
          <Body dim style={{ textAlign: 'center', fontSize: 17, lineHeight: 25 }}>
            {t(slide.text)}
          </Body>
        </View>
        <Row style={{ justifyContent: 'center', marginBottom: space.lg }}>
          {SLIDES.map((_, i) => (
            <View key={i} style={[styles.dot, { backgroundColor: i === index ? theme.accent : theme.border, width: i === index ? 22 : 8 }]} />
          ))}
        </Row>
        <Button title={index === SLIDES.length - 1 ? t('common.start') : t('common.next')} onPress={() => setIndex(index + 1)} />
        <Text style={{ fontFamily: MONO_BOLD, color: theme.textDim, textAlign: 'center', marginTop: space.md, fontSize: 12 }}>Linux Terminal Trainer</Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, padding: space.xl, maxWidth: 560, width: '100%', alignSelf: 'center' },
  langs: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center' },
  lang: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 999, minHeight: 40 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: space.lg },
  icon: { width: 96, height: 96, borderRadius: 48, alignItems: 'center', justifyContent: 'center' },
  art: { borderWidth: 1, borderRadius: 14, padding: 14, alignSelf: 'stretch' },
  dot: { height: 8, borderRadius: 4 },
});
