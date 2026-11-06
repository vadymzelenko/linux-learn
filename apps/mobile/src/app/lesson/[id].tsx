import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, BackHandler, Easing, KeyboardAvoidingView, Platform, StyleSheet, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { allLessons, findLesson, isTaskStep, stepXp, tr } from '@linux-learn/content';
import { useStore } from '../../state/store';
import { useTheme, space, MONO } from '../../theme';
import { Body, Button, H1, Icon, IconButton, ProgressBar, Row, Screen } from '../../components/ui';
import { BuildStep, PredictStep, QuizStep, TheoryStep } from '../../components/steps/Steps';
import { TaskRunner } from '../../components/steps/TaskRunner';
import { rewardAfterHints } from '../../lib/progress';
import { Text } from '../../theme/Text';
import { feedback } from '../../lib/haptics';
import { goBack } from '../../lib/nav';
import { confirmDialog } from '../../components/Dialog';
import { KeyCatcher } from '../../components/KeyCatcher';
import { SlideIn } from '../../components/ui';
import { useLayout } from '../../lib/layout';

/** The finish badge pops in with a spring and the "lesson complete" cue. */
function FinishBadge({ color, iconColor }: { color: string; iconColor: string }) {
  const scale = useRef(new Animated.Value(0.3)).current;
  const glow = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    feedback.complete();
    Animated.parallel([
      Animated.spring(scale, { toValue: 1, friction: 4, tension: 120, useNativeDriver: Platform.OS !== 'web' }),
      Animated.loop(Animated.sequence([Animated.timing(glow, { toValue: 1, duration: 1200, easing: Easing.inOut(Easing.quad), useNativeDriver: Platform.OS !== 'web' }), Animated.timing(glow, { toValue: 0, duration: 1200, easing: Easing.inOut(Easing.quad), useNativeDriver: Platform.OS !== 'web' })])),
    ]).start();
  }, [glow, scale]);
  return (
    <View style={{ alignItems: 'center', justifyContent: 'center' }}>
      <Animated.View style={[styles.halo, { backgroundColor: color, opacity: glow.interpolate({ inputRange: [0, 1], outputRange: [0.12, 0.28] }), transform: [{ scale: glow.interpolate({ inputRange: [0, 1], outputRange: [1, 1.15] }) }] }]} />
      <Animated.View style={[styles.badge, { backgroundColor: color, transform: [{ scale }] }]}>
        <Icon name="check" size={56} color={iconColor} />
      </Animated.View>
    </View>
  );
}

export default function LessonScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const ref = findLesson(id ?? '');
  const theme = useTheme();
  const layout = useLayout();
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

  /** Leaving mid-lesson asks first (progress is kept); a finished lesson just closes. */
  const askExit = useCallback(() => {
    if (finished || !lesson) return goBack('/courses');
    confirmDialog({
      title: t('lesson.exitTitle'),
      message: t('lesson.exitText', { n: index + 1, total: lesson.steps.length }),
      confirm: t('lesson.exitConfirm'),
      cancel: t('lesson.exitStay'),
      icon: 'exit-to-app',
      onConfirm: () => goBack('/courses'),
    });
  }, [finished, index, lesson, t]);

  useEffect(() => {
    if (Platform.OS === 'web') return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      askExit();
      return true;
    });
    return () => sub.remove();
  }, [askExit]);
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
          <Button title={t('lesson.backToMap')} onPress={() => goBack('/courses')} />
        </View>
      </Screen>
    );
  }

  if (finished) {
    return (
      <Screen edges={['top', 'bottom']}>
        <View style={styles.finish}>
          <KeyCatcher
            onKey={(e) => {
              if (e.key === 'Enter' && next) {
                router.replace({ pathname: '/lesson/[id]', params: { id: next.lesson.id } });
                return true;
              }
              if (e.key === 'Escape' || (e.key === 'Enter' && !next)) {
                goBack('/courses');
                return true;
              }
            }}
          />
          <FinishBadge color={theme.accent} iconColor={theme.onAccent} />
          <H1 style={{ textAlign: 'center' }}>{t('lesson.finished')}</H1>
          <Body style={{ textAlign: 'center', fontSize: 18 }}>{tr(lesson.title, i18n.language)}</Body>
          <Text style={{ color: theme.accent, fontSize: 32, fontWeight: '900' }}>{t('lesson.earned', { xp: earned.current })}</Text>
          <View style={{ gap: space.md, alignSelf: 'stretch', maxWidth: 420, width: '100%', marginTop: space.xl }}>
            {next ? (
              <Button
                title={t('lesson.nextLesson')}
                hint={Platform.OS === 'web' ? 'Enter' : undefined}
                icon="play"
                onPress={() => router.replace({ pathname: '/lesson/[id]', params: { id: next.lesson.id } })}
              />
            ) : null}
            <Button variant="secondary" icon="map-outline" title={t('lesson.backToMap')} hint={Platform.OS === 'web' ? 'Esc' : undefined} onPress={() => goBack('/courses')} />
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
          <IconButton icon="x" label={t('lesson.exitTitle')} onPress={askExit} />
          <View style={{ flex: 1, gap: 4 }}>
            <Row style={{ justifyContent: 'space-between' }}>
              <Text style={{ color: theme.text, fontWeight: '800', fontSize: 15, flexShrink: 1 }} numberOfLines={1}>
                {tr(lesson.title, i18n.language)}
              </Text>
              <Text style={{ color: theme.textDim, fontSize: 12, flexShrink: 0, fontFamily: MONO }} numberOfLines={1}>
                {layout.width < 520 ? `${index + 1}/${lesson.steps.length}` : t('lesson.step', { n: index + 1, total: lesson.steps.length })}
              </Text>
            </Row>
            <ProgressBar value={index / lesson.steps.length} height={6} />
          </View>
          {step.type !== 'theory' && lesson.steps.some((s) => s.type === 'theory') ? (
            <IconButton icon="book-open" label={t('topic.readTopic')} color={theme.accent} onPress={() => router.push({ pathname: '/read/[id]', params: { id: lesson.id } })} />
          ) : null}
        </View>
        <KeyCatcher
          webOnly
          onKey={(e) => {
            if (e.key === 'Escape') {
              askExit();
              return true;
            }
          }}
        />
        <SlideIn key={index} style={[styles.body, { paddingHorizontal: layout.pad, maxWidth: layout.split ? 1200 : layout.contentMax + layout.pad * 2 }]}>
          {layout.compact && isTaskStep(step) ? null : (
            <Text style={{ color: theme.accent, fontWeight: '800', fontSize: 12, letterSpacing: 1, marginBottom: space.sm }}>{kindLabel.toUpperCase()}</Text>
          )}
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
                ...(step.instructions ? { instructions: step.instructions } : {}),
              }}
              onTheory={() => router.push({ pathname: '/read/[id]', params: { id: lesson.id } })}
              onSolved={({ hints, mistakes }) => {
                hintsTotal.current += hints;
                mistakesTotal.current += mistakes;
                if (hints) useStore.getState().addHints(lesson.id, hints);
                setTaskSolved({ xp: rewardAfterHints(stepXp(step), hints) });
              }}
              onContinue={taskSolved ? () => advance(taskSolved.xp) : undefined}
              continueLabel={taskSolved ? `${t('common.continue')} · ${t('lesson.earned', { xp: taskSolved.xp })}` : undefined}
              solvedFooter={
                taskSolved ? <Button title={`${t('common.continue')} · ${t('lesson.earned', { xp: taskSolved.xp })}`} hint={Platform.OS === 'web' ? 'Enter' : undefined} onPress={() => advance(taskSolved.xp)} /> : null
              }
            />
          ) : null}
        </SlideIn>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingHorizontal: space.sm, paddingVertical: 6 },
  body: { flex: 1, paddingHorizontal: space.md, paddingBottom: space.sm, maxWidth: 1200, width: '100%', alignSelf: 'center' },
  finish: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: space.xl, gap: space.md },
  badge: { width: 104, height: 104, borderRadius: 52, alignItems: 'center', justifyContent: 'center', marginBottom: space.md },
  halo: { position: 'absolute', width: 150, height: 150, borderRadius: 75, top: -23 },
});
