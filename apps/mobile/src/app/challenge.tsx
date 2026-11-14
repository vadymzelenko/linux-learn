import { useMemo, useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { challenges, findChallenge, tr } from '@linux-learn/content';
import { useStore } from '../state/store';
import { useTheme, space } from '../theme';
import { Button, IconButton, Screen } from '../components/ui';
import { TaskRunner } from '../components/steps/TaskRunner';
import { rewardAfterHints } from '../lib/progress';
import { Text } from '../theme/Text';
import { goBack } from '../lib/nav';
import { BackButton } from '../components/BackButton';

export default function ChallengeScreen() {
  const theme = useTheme();
  const { t, i18n } = useTranslation();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const challenge = useMemo(() => findChallenge(id ?? '') ?? challenges[0]!, [id]);
  const done = useStore((s) => !!s.progress.practice?.[challenge.id]);
  const nextOpen = useStore((s) => challenges.find((c) => c.id !== challenge.id && !s.progress.practice?.[c.id]));
  const [reward, setReward] = useState<number | null>(null);
  return (
    <Screen edges={['top', 'bottom']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.header}>
          <BackButton />
          <Text style={{ color: theme.text, fontWeight: '800', fontSize: 17, flex: 1 }} numberOfLines={1}>
            {t('practice.tasks')} · {tr(challenge.title, i18n.language)}
          </Text>
        </View>
        <View style={styles.body}>
          <TaskRunner
            task={{
              key: challenge.id,
              goal: challenge.goal,
              setup: challenge.setup,
              ...(challenge.prepare ? { prepare: challenge.prepare } : {}),
              checks: challenge.checks,
              hints: challenge.hints,
              solution: challenge.solution,
              ...(challenge.instructions ? { instructions: challenge.instructions } : {}),
            }}
            {...(challenge.topics?.length ? { onTheory: () => router.push({ pathname: '/read/[id]', params: { id: challenge.topics!.join(',') } }) } : {})}
            onSolved={({ hints }) => {
              const xp = done ? 0 : rewardAfterHints(challenge.xp ?? 30, hints);
              if (!done) useStore.getState().completePractice(challenge.id, xp);
              setReward(xp);
            }}
            onContinue={reward !== null ? () => (nextOpen ? router.replace({ pathname: '/challenge', params: { id: nextOpen.id } }) : goBack('/practice')) : undefined}
            continueLabel={nextOpen ? t('practice.nextTask') : t('common.done')}
            solvedFooter={
              reward !== null ? (
                <View style={{ gap: space.sm }}>
                  {nextOpen ? <Button title={t('practice.nextTask')} icon="play" onPress={() => router.replace({ pathname: '/challenge', params: { id: nextOpen.id } })} /> : null}
                  <Button variant={nextOpen ? 'secondary' : 'primary'} title={`${t('common.done')}${reward ? ` · ${t('lesson.earned', { xp: reward })}` : ''}`} onPress={() => goBack()} />
                </View>
              ) : null
            }
          />
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: space.sm, padding: space.sm },
  body: { flex: 1, paddingHorizontal: space.md, paddingBottom: space.sm, maxWidth: 1200, width: '100%', alignSelf: 'center' },
});
