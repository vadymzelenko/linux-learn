import { useMemo, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { examTasks } from '@linux-learn/content';
import { useStore } from '../state/store';
import { useTheme, space } from '../theme';
import { Body, Button, H1, Icon, IconButton, ProgressBar, Row, Screen } from '../components/ui';
import { TaskRunner } from '../components/steps/TaskRunner';
import { Certificate } from '../components/Certificate';
import { Text } from '../theme/Text';
import { goBack } from '../lib/nav';
import { BackButton } from '../components/BackButton';

export const PASS_PERCENT = 70;

export default function ExamScreen() {
  const theme = useTheme();
  const { t } = useTranslation();
  const tasks = useMemo(() => examTasks(), []);
  const [phase, setPhase] = useState<'intro' | 'run' | 'result'>('intro');
  const [index, setIndex] = useState(0);
  const solved = useRef(0);
  const [solvedNow, setSolvedNow] = useState(false);
  const certName = useStore((s) => s.settings.certName);
  const passedAt = useStore((s) => s.progress.exam.passedAt);

  const score = Math.round((solved.current / tasks.length) * 100);
  const next = () => {
    setSolvedNow(false);
    if (index + 1 < tasks.length) setIndex(index + 1);
    else {
      const final = Math.round((solved.current / tasks.length) * 100);
      useStore.getState().completeExam(final, final >= PASS_PERCENT);
      setPhase('result');
    }
  };

  if (phase === 'intro') {
    return (
      <Screen edges={['top', 'bottom']}>
        <ScrollView contentContainerStyle={[styles.center, { flexGrow: 1 }]}>
          <Icon name="graduation-cap" size={64} color={theme.accent} />
          <H1 style={{ textAlign: 'center' }}>{t('exam.title')}</H1>
          <Body style={{ textAlign: 'center' }}>{t('exam.intro', { count: tasks.length, pass: PASS_PERCENT })}</Body>
          <Button title={t('common.start')} icon="play" onPress={() => setPhase('run')} style={{ alignSelf: 'stretch' }} />
          {passedAt ? <Button variant="secondary" title={t('exam.certificate')} onPress={() => setPhase('result')} style={{ alignSelf: 'stretch' }} /> : null}
          <Button variant="ghost" title={t('common.back')} onPress={() => goBack()} />
        </ScrollView>
      </Screen>
    );
  }

  if (phase === 'result') {
    const passed = !!useStore.getState().progress.exam.passedAt;
    return (
      <Screen edges={['top', 'bottom']}>
        <ScrollView contentContainerStyle={[styles.center, { flexGrow: 1 }]}>
          <H1 style={{ textAlign: 'center' }}>{passed ? t('exam.passed') : t('exam.failed')}</H1>
          {index > 0 ? <Body style={{ fontSize: 18 }}>{t('exam.score', { score })}</Body> : null}
          {passed ? (
            <>
              <TextInput
                value={certName}
                onChangeText={(v) => useStore.getState().setSettings({ certName: v.slice(0, 40) })}
                placeholder={t('exam.certName')}
                placeholderTextColor={theme.textDim}
                accessibilityLabel={t('exam.certName')}
                style={[styles.name, { color: theme.text, borderColor: theme.border, backgroundColor: theme.surface }]}
              />
              <Certificate name={certName} />
            </>
          ) : (
            <Button title={t('common.retry')} onPress={() => router.replace('/exam')} style={{ alignSelf: 'stretch' }} />
          )}
          <Button variant="secondary" title={t('lesson.backToMap')} onPress={() => goBack()} style={{ alignSelf: 'stretch' }} />
        </ScrollView>
      </Screen>
    );
  }

  const item = tasks[index]!;
  return (
    <Screen edges={['top', 'bottom']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Row style={{ padding: space.sm }}>
          <BackButton />
          <View style={{ flex: 1, gap: 4 }}>
            <Text style={{ color: theme.textDim, fontSize: 12 }}>{t('exam.task', { n: index + 1, total: tasks.length })}</Text>
            <ProgressBar value={index / tasks.length} height={6} />
          </View>
          {!solvedNow ? <Button small variant="ghost" title={t('exam.giveUp')} onPress={next} /> : null}
        </Row>
        <View style={{ flex: 1, paddingHorizontal: space.md, paddingBottom: space.sm }}>
          <TaskRunner
            key={index}
            allowHints={false}
            task={{
              key: `exam-${index}`,
              goal: item.step.goal,
              setup: item.step.setup ?? item.lesson.setup,
              ...(item.step.prepare ? { prepare: item.step.prepare } : {}),
              ...(item.step.prefill ? { prefill: item.step.prefill } : {}),
              checks: item.step.checks,
              solution: item.step.solution,
            }}
            onTheory={() => router.push({ pathname: '/read/[id]', params: { id: item.lesson.id } })}
            onSolved={() => {
              solved.current++;
              setSolvedNow(true);
            }}
            solvedFooter={solvedNow ? <Button title={t('common.next')} onPress={next} /> : null}
          />
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', padding: space.xl, gap: space.lg, maxWidth: 560, width: '100%', alignSelf: 'center' },
  name: { alignSelf: 'stretch', borderWidth: 1, borderRadius: 12, padding: 14, fontSize: 17 },
});
