import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { COMMANDS } from '@linux-learn/engine';
import { commandSummary, optionText } from '@linux-learn/content';
import { useStore } from '../state/store';
import { useTheme, MONO, MONO_BOLD, radius, space } from '../theme';
import { Button, FadeIn, H1, Icon, ProgressBar, Row, Screen } from '../components/ui';
import { dayKey, reviewDeck } from '../lib/progress';
import { Text } from '../theme/Text';
import { goBack } from '../lib/nav';
import { BackButton } from '../components/BackButton';
import { feedback } from '../lib/haptics';

/**
 * Spaced-repetition flashcards (SM-2) for commands you struggled with:
 * see the command, recall what it does, reveal, rate. A forgotten card comes
 * back once more at the end of the session, like in Anki.
 */
export default function ReviewScreen() {
  const theme = useTheme();
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const initial = useMemo(() => reviewDeck(useStore.getState().progress, dayKey(new Date()), (c) => COMMANDS.has(c)), []);
  const [queue, setQueue] = useState(initial);
  const [repeated, setRepeated] = useState<string[]>([]);
  const [done, setDone] = useState(0);
  const [shown, setShown] = useState(false);
  const cmd = queue[0];
  const def = cmd ? COMMANDS.get(cmd) : undefined;
  const total = initial.length + repeated.length;

  const answer = (q: number) => {
    if (!cmd) return;
    useStore.getState().review(cmd, q);
    if (q >= 3) feedback.correct();
    else feedback.tap();
    const again = q < 3 && !repeated.includes(cmd);
    if (again) setRepeated([...repeated, cmd]);
    setQueue([...queue.slice(1), ...(again ? [cmd] : [])]);
    setDone(done + 1);
    setShown(false);
  };

  return (
    <Screen edges={['top', 'bottom']}>
      <Row style={{ padding: space.sm, paddingRight: space.lg }}>
        <BackButton />
        <View style={{ flex: 1 }}>
          <ProgressBar value={total ? done / total : 1} height={8} />
        </View>
        {total ? (
          <Text style={{ color: theme.textDim, fontFamily: MONO, fontSize: 13 }}>
            {Math.min(done + 1, total)}/{total}
          </Text>
        ) : null}
      </Row>
      <ScrollView contentContainerStyle={styles.wrap}>
        {!cmd || !def ? (
          <View style={styles.center}>
            <Icon name="check-circle" size={72} color={theme.success} />
            <H1 style={{ textAlign: 'center' }}>{total ? t('practice.reviewDone') : t('practice.reviewEmpty')}</H1>
            <Button title={t('common.done')} onPress={() => goBack('/practice')} style={{ alignSelf: 'stretch' }} />
          </View>
        ) : (
          <FadeIn key={`${cmd}-${done}`} style={{ gap: space.lg, flex: 1 }}>
            <Text style={{ color: theme.textDim, fontWeight: '700', textAlign: 'center' }}>{t('practice.reviewQuestion')}</Text>
            <View style={[styles.card, { backgroundColor: theme.term.bg, borderColor: shown ? theme.accent : theme.border }]}>
              <Text style={{ fontFamily: MONO_BOLD, color: theme.term.user, fontSize: 44 }}>{cmd}</Text>
              {shown ? (
                <FadeIn style={{ gap: 12, alignSelf: 'stretch' }}>
                  <Text style={{ color: theme.term.fg, fontSize: 18, textAlign: 'center', fontWeight: '600' }}>{commandSummary(def.name, lang, def.doc.summary)}</Text>
                  <Text style={{ fontFamily: MONO, color: theme.term.path, fontSize: 13, textAlign: 'center' }}>{def.doc.usage[0]}</Text>
                  {(def.doc.options ?? []).slice(0, 3).map(([spec, d]) => (
                    <Row key={spec} gap={10} style={{ alignItems: 'flex-start' }}>
                      <Text style={{ fontFamily: MONO, color: theme.warning, fontSize: 13, minWidth: 70 }}>{spec.split(',')[0]}</Text>
                      <Text style={{ color: theme.term.fg, fontSize: 14, flex: 1, opacity: 0.9 }}>{optionText(def.name, spec, lang, d)}</Text>
                    </Row>
                  ))}
                </FadeIn>
              ) : (
                <Text style={{ color: theme.textDim, fontSize: 13 }}>{t('practice.reviewThink')}</Text>
              )}
            </View>
            {shown ? (
              <Row gap={8}>
                <Button variant="danger" title={t('practice.forgot')} onPress={() => answer(1)} style={{ flex: 1 }} small />
                <Button variant="secondary" title={t('practice.hard')} onPress={() => answer(3)} style={{ flex: 1 }} small />
                <Button title={t('practice.remembered')} onPress={() => answer(5)} style={{ flex: 1 }} small />
              </Row>
            ) : (
              <Button title={t('practice.showAnswer')} icon="eye-outline" onPress={() => setShown(true)} />
            )}
          </FadeIn>
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  wrap: { padding: space.lg, flexGrow: 1, maxWidth: 640, width: '100%', alignSelf: 'center' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: space.lg },
  card: { borderWidth: 2, borderRadius: radius.lg + 6, padding: space.xl, alignItems: 'center', gap: space.lg, minHeight: 260, justifyContent: 'center' },
});
