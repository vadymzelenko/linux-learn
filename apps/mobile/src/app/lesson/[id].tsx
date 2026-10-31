import { useCallback, useMemo, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { allLessons, findLesson, isTaskStep, stepXp, tr } from '@linux-learn/content';
import { useStore } from '../../state/store';
import { useTheme, space } from '../../theme';
import { Body, Button, H1, Icon, IconButton, ProgressBar, Row, Screen } from '../../components/ui';
import { BuildStep, PredictStep, QuizStep, TheoryStep } from '../../components/steps/Steps';
import { TaskRunner } from '../../components/steps/TaskRunner';
import { rewardAfterHints } from '../../lib/progress';
import { ads } from '../../lib/ads';

export default function LessonScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const ref = findLesson(id ?? '');
  const theme = useTheme();
  const { t, i18n } = useTranslation();
  const saved = useStore((s) => (ref ? s.progress.lessons[ref.lesson.id] : undefined));
  const [index, setIndex] = useState(() => (saved && !saved.completedAt ? Math.min(saved.step, (ref?.lesson.steps.length ?? 1) - 1) : 0));
  const [finished, setFinished] = useState(false);
  const earned = useRef(0);
  const hintsTotal = useRef(0);
  const mistakesTotal = useRef(0);
  const [taskSolved, setTaskSolved] = useState<{ xp: number } | null>(null);

  const lesson = ref?.lesson;
  const step = lesson?.steps[index];
  const next = useMemo(() => (ref ? allLessons[ref.globalIndex + 1] : undefined), [ref]);

  const advance = useCallback(
    (xp: number) => {
      if (!lesson) return;
      earned.current += xp;
      useStore.getState().gainXp(xp);
      setTaskSolved(null);
      if (index + 1 < lesson.steps.length) {
        setIndex(index + 1);
        useStore.getState().saveLessonStep(lesson.id, index + 1);
      } else {
        const st = useStore.getState();
        st.completeLesson(lesson.id, earned.current);
        st.scheduleReview(lesson.commands, hintsTotal.current, mistakesTotal.current);
        if (hintsTotal.current) st.addHints(lesson.id, 0);
        ads.onLessonCompleted();
        setFinished(true);
      }
    },
    [index, lesson],
  );

  if (!ref || !lesson) {
    return (
      <Screen>
        <View style={{ padding: space.lg, gap: space.md }}>
          <H1>404</H1>
          <Button title={t('lesson.backToMap')} onPress={() => router.replace('/')} />
        </View>
      </Screen>
    );
  }

  if (finished) {
    return (
      <Screen edges={['top', 'bottom']}>
        <View style={styles.finish}>
          <View style={[styles.badge, { backgroundColor: theme.accent }]}>
            <Icon name="check" size={56} color={theme.onAccent} />
          </View>
          <H1 style={{ textAlign: 'center' }}>{t('lesson.finished')}</H1>
          <Body style={{ textAlign: 'center', fontSize: 18 }}>{tr(lesson.title, i18n.language)}</Body>
          <Text style={{ color: theme.accent, fontSize: 32, fontWeight: '900' }}>{t('lesson.earned', { xp: earned.current })}</Text>
          <View style={{ gap: space.md, alignSelf: 'stretch', maxWidth: 420, width: '100%', marginTop: space.xl }}>
            {next ? (
              <Button
                title={t('lesson.nextLesson')}
                icon="play"
                onPress={() => {
                  if (ads.shouldShowInterstitial()) ads.showInterstitial();
                  router.replace({ pathname: '/lesson/[id]', params: { id: next.lesson.id } });
                }}
              />
            ) : null}
            <Button variant="secondary" title={t('lesson.backToMap')} onPress={() => router.back()} />
          </View>
        </View>
      </Screen>
    );
  }

  if (!step) return null;

  const kindLabel = {
    theory: t('lesson.theory'),
    task: t('lesson.task'),
    fix: t('lesson.fix'),
    predict: t('lesson.predict'),
    build: t('lesson.build'),
    quiz: t('lesson.quiz'),
  }[step.type];

  const onSimpleDone = (base: number) => (info: { mistakes: number }) => {
    mistakesTotal.current += info.mistakes;
    advance(info.mistakes ? Math.max(1, Math.round(base / 2)) : base);
  };

  return (
    <Screen edges={['top', 'bottom']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.header}>
          <IconButton icon="x" label={t('common.close')} onPress={() => router.back()} />
          <View style={{ flex: 1, gap: 4 }}>
            <Row style={{ justifyContent: 'space-between' }}>
              <Text style={{ color: theme.text, fontWeight: '800', fontSize: 15, flexShrink: 1 }} numberOfLines={1}>
                {tr(lesson.title, i18n.language)}
              </Text>
              <Text style={{ color: theme.textDim, fontSize: 12 }}>{t('lesson.step', { n: index + 1, total: lesson.steps.length })}</Text>
            </Row>
            <ProgressBar value={index / lesson.steps.length} height={6} />
          </View>
        </View>
        <View style={styles.body}>
          <Text style={{ color: theme.accent, fontWeight: '800', fontSize: 12, letterSpacing: 1, marginBottom: space.sm }}>{kindLabel.toUpperCase()}</Text>
          {step.type === 'theory' ? (
            <TheoryStep key={index} step={step} lessonSetup={lesson.setup} onDone={onSimpleDone(stepXp(step))} />
          ) : step.type === 'quiz' ? (
            <QuizStep key={index} step={step} onDone={onSimpleDone(stepXp(step))} />
          ) : step.type === 'predict' ? (
            <PredictStep key={index} step={step} lessonSetup={lesson.setup} onDone={onSimpleDone(stepXp(step))} />
          ) : step.type === 'build' ? (
            <BuildStep key={index} step={step} onDone={onSimpleDone(stepXp(step))} />
          ) : isTaskStep(step) ? (
            <TaskRunner
              key={`${lesson.id}-${index}`}
              task={{
                key: `${lesson.id}-${index}`,
                goal: step.goal,
                setup: step.setup ?? lesson.setup,
                checks: step.checks,
                hints: step.hints,
                solution: step.solution,
                ...(step.prepare ? { prepare: step.prepare } : {}),
                ...(step.prefill ? { prefill: step.prefill } : {}),
              }}
              onSolved={({ hints, mistakes }) => {
                hintsTotal.current += hints;
                mistakesTotal.current += mistakes;
                if (hints) useStore.getState().addHints(lesson.id, hints);
                setTaskSolved({ xp: rewardAfterHints(stepXp(step), hints) });
              }}
              solvedFooter={
                taskSolved ? <Button title={`${t('common.continue')} · ${t('lesson.earned', { xp: taskSolved.xp })}`} onPress={() => advance(taskSolved.xp)} /> : null
              }
            />
          ) : null}
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingHorizontal: space.sm, paddingVertical: space.sm },
  body: { flex: 1, paddingHorizontal: space.md, paddingBottom: space.sm, maxWidth: 1200, width: '100%', alignSelf: 'center' },
  finish: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: space.xl, gap: space.md },
  badge: { width: 104, height: 104, borderRadius: 52, alignItems: 'center', justifyContent: 'center', marginBottom: space.md },
});
