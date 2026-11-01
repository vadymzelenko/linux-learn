import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { COMMANDS } from '@linux-learn/engine';
import { useStore } from '../state/store';
import { useTheme, MONO, MONO_BOLD, space } from '../theme';
import { Body, Button, H1, Icon, IconButton, ProgressBar, Row, Screen } from '../components/ui';
import { dayKey, dueCards } from '../lib/progress';
import { Text } from '../theme/Text';
import { goBack } from '../lib/nav';
import { BackButton } from '../components/BackButton';

/** Spaced-repetition flashcards for commands the user struggled with (SM-2). */
export default function ReviewScreen() {
  const theme = useTheme();
  const { t } = useTranslation();
  const deck = useMemo(() => dueCards(useStore.getState().progress.srs, dayKey(new Date())), []);
  const [i, setI] = useState(0);
  const [shown, setShown] = useState(false);
  const cmd = deck[i];
  const def = cmd ? COMMANDS.get(cmd) : undefined;

  const answer = (q: number) => {
    if (cmd) useStore.getState().review(cmd, q);
    setShown(false);
    setI(i + 1);
  };

  return (
    <Screen edges={['top', 'bottom']}>
      <Row style={{ padding: space.sm }}>
        <BackButton />
        <View style={{ flex: 1 }}>
          <ProgressBar value={deck.length ? i / deck.length : 1} height={6} />
        </View>
      </Row>
      <ScrollView contentContainerStyle={styles.wrap}>
        {!cmd ? (
          <View style={styles.center}>
            <Icon name="check-circle" size={64} color={theme.success} />
            <H1 style={{ textAlign: 'center' }}>{deck.length ? t('practice.reviewDone') : t('practice.reviewEmpty')}</H1>
            <Button title={t('common.done')} onPress={() => goBack()} style={{ alignSelf: 'stretch' }} />
          </View>
        ) : (
          <View style={{ gap: space.lg }}>
            <Body dim>{t('practice.reviewQuestion')}</Body>
            <View style={[styles.card, { backgroundColor: theme.term.bg, borderColor: theme.border }]}>
              <Text style={{ fontFamily: MONO_BOLD, color: theme.term.user, fontSize: 40 }}>{cmd}</Text>
              {shown && def ? (
                <View style={{ gap: 10, alignSelf: 'stretch' }}>
                  <Text style={{ color: theme.term.fg, fontSize: 17 }}>{def.doc.summary}</Text>
                  <Text style={{ fontFamily: MONO, color: theme.textDim, fontSize: 13 }}>{def.doc.usage[0]}</Text>
                  {(def.doc.examples ?? []).slice(0, 2).map(([ex, d]) => (
                    <View key={ex}>
                      <Text style={{ fontFamily: MONO, color: theme.term.path, fontSize: 14 }}>$ {ex}</Text>
                      <Text style={{ color: theme.textDim, fontSize: 13 }}>{d}</Text>
                    </View>
                  ))}
                </View>
              ) : null}
            </View>
            {shown ? (
              <Row>
                <Button variant="secondary" title={t('practice.forgot')} onPress={() => answer(1)} style={{ flex: 1 }} />
                <Button title={t('practice.remembered')} onPress={() => answer(5)} style={{ flex: 1 }} />
              </Row>
            ) : (
              <Button title={t('common.check')} onPress={() => setShown(true)} />
            )}
          </View>
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  wrap: { padding: space.lg, flexGrow: 1, maxWidth: 640, width: '100%', alignSelf: 'center' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: space.lg },
  card: { borderWidth: 1, borderRadius: 20, padding: space.xl, alignItems: 'center', gap: space.lg, minHeight: 220, justifyContent: 'center' },
});
