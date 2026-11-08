import { moduleLocked } from '../../lib/edition';
import { ProGate } from '../../components/ProGate';
import { ScrollView, StyleSheet, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { COMMANDS } from '@linux-learn/engine';
import { findLesson, lessonMinutes, tr } from '@linux-learn/content';
import { Text } from '../../theme/Text';
import { BackButton } from '../../components/BackButton';
import { useTheme, MONO, MONO_BOLD, space } from '../../theme';
import { Button, IconButton, Pill, Row, Screen } from '../../components/ui';
import { TheoryCards } from '../../components/ui/RichText';

/** Read the theory of one or more lessons (ids separated by commas) — the "quick jump to the topic". */
function ReadInner() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const theme = useTheme();
  const { t, i18n } = useTranslation();
  const refs = (id ?? '').split(',').map(findLesson).filter((r): r is NonNullable<typeof r> => !!r);

  return (
    <Screen edges={['top', 'bottom']}>
      <Row style={{ padding: space.sm }}>
        <BackButton />
        <Text style={{ color: theme.textDim, fontWeight: '700', letterSpacing: 1, fontSize: 12 }}>{t('topic.theory').toUpperCase()}</Text>
      </Row>
      <ScrollView contentContainerStyle={styles.content}>
        {refs.map((ref) => (
          <View key={ref.lesson.id} style={{ gap: space.md, marginBottom: space.xl }}>
            <Text style={{ color: theme.textDim, fontFamily: MONO, fontSize: 12 }}>
              {ref.module.path}/{ref.lesson.id}
            </Text>
            <Text style={{ color: theme.text, fontSize: 28, fontWeight: '800' }}>{tr(ref.lesson.title, i18n.language)}</Text>
            <Row>
              <Pill text={tr(ref.module.title, i18n.language)} />
              <Pill text={t('courses.minutes', { n: lessonMinutes(ref.lesson) })} />
            </Row>
            {ref.lesson.steps
              .filter((s) => s.type === 'theory')
              .map((s, i) =>
                s.type === 'theory' ? <TheoryCards key={i} text={tr(s.text, i18n.language)} {...(s.title ? { title: tr(s.title, i18n.language) } : {})} /> : null,
              )}
            <Text style={{ color: theme.textDim, fontWeight: '700', marginTop: space.sm }}>{t('topic.commands')}</Text>
            <View style={{ gap: 8 }}>
              {ref.lesson.commands.map((c) => {
                const def = COMMANDS.get(c);
                return (
                  <View key={c} style={[styles.cmd, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                    <Text style={{ fontFamily: MONO_BOLD, color: theme.term.user, fontSize: 16, width: 96 }} onPress={() => router.push({ pathname: '/reference', params: { cmd: c } })}>
                      {c}
                    </Text>
                    <Text style={{ color: theme.text, flex: 1 }}>{def?.doc.summary}</Text>
                  </View>
                );
              })}
            </View>
            <Button variant="secondary" icon="play" title={t('library.practice')} onPress={() => router.push({ pathname: '/lesson/[id]', params: { id: ref.lesson.id } })} />
          </View>
        ))}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { padding: space.lg, paddingTop: 0, maxWidth: 820, width: '100%', alignSelf: 'center' },
  cmd: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: space.md, borderRadius: 12, borderWidth: StyleSheet.hairlineWidth },
});

/** Free edition: locked content shows what Pro adds instead. */
function LockedScreen() {
  return (
    <Screen edges={['top', 'bottom']}>
      <Row style={{ padding: space.sm }}>
        <BackButton />
      </Row>
      <ProGate locked />
    </Screen>
  );
}

export default function ReadScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const refs = (id ?? '').split(',').map(findLesson).filter((r) => !!r);
  if (refs.length && refs.every((r) => moduleLocked(r!.module.id))) return <LockedScreen />;
  return <ReadInner />;
}
