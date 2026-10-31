import { useMemo, useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { dailyChallenge, tr } from '@linux-learn/content';
import { useStore } from '../state/store';
import { useTheme, space } from '../theme';
import { Button, IconButton, Screen } from '../components/ui';
import { TaskRunner } from '../components/steps/TaskRunner';
import { dayKey, rewardAfterHints } from '../lib/progress';
import { Text } from '../theme/Text';

export default function ChallengeScreen() {
  const theme = useTheme();
  const { t, i18n } = useTranslation();
  const challenge = useMemo(() => dailyChallenge(new Date()), []);
  const doneToday = useStore((s) => s.progress.daily.last === dayKey(new Date()));
  const [reward, setReward] = useState<number | null>(null);
  return (
    <Screen edges={['top', 'bottom']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.header}>
          <IconButton icon="x" label={t('common.close')} onPress={() => router.back()} />
          <Text style={{ color: theme.text, fontWeight: '800', fontSize: 17, flex: 1 }} numberOfLines={1}>
            {t('practice.daily')} · {tr(challenge.title, i18n.language)}
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
              const xp = doneToday ? 0 : rewardAfterHints(challenge.xp ?? 30, hints);
              if (!doneToday) useStore.getState().completeDaily(xp);
              setReward(xp);
            }}
            solvedFooter={
              reward !== null ? (
                <Button title={`${t('common.done')}${reward ? ` · ${t('lesson.earned', { xp: reward })}` : ''}`} onPress={() => router.back()} />
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
