import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { LayoutAnimation, Platform, Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { evaluateTask, prepareSession, tr, type ContentCheck, type L10n } from '@linux-learn/content';
import { stripAnsi, type ExecutedCommand, type ExecResult, type Session, type TaskEvaluation } from '@linux-learn/engine';
import { useTheme, MONO, space } from '../../theme';
import { Body, Button, Icon, Row } from '../ui';
import { RichText } from '../ui/RichText';
import { Terminal, useColumns, type TerminalHandle } from '../terminal/Terminal';
import { useShell } from '../terminal/useShell';
import { feedback } from '../../lib/haptics';
import { confirmDialog } from '../Dialog';
import { Text } from '../../theme/Text';
import { HowTo } from './Steps';
import { useLayout } from '../../lib/layout';
import { MachineView } from '../MachineView';
import { Collapsible, FadeIn } from '../ui';
import { useUi } from '../../state/ui';
import { useStore } from '../../state/store';

export interface TaskSpec {
  /** Unique key: changing it restarts the task. */
  key: string;
  goal?: L10n;
  setup?: string | Record<string, unknown>;
  prepare?: string[];
  checks: ContentCheck[];
  hints?: { direction: L10n; command: string };
  solution: string[];
  prefill?: string;
  /** Extra text above the goal (mission briefing). */
  story?: L10n;
  title?: string;
  instructions?: L10n;
}

interface Props {
  task: TaskSpec;
  allowHints?: boolean;
  /** Opens the theory of this topic. */
  onTheory?: () => void;
  onSolved: (info: { hints: number; mistakes: number }) => void;
  /** Rendered under the checklist once solved (Continue button). */
  solvedFooter?: React.ReactNode;
  /** Enter in the terminal after solving runs this (same as the Continue button). */
  onContinue?: () => void;
  continueLabel?: string;
}

/** A goal card with a live checklist + a terminal on the task's machine. */
export function TaskRunner({ task, allowHints = true, onSolved, solvedFooter, onTheory, onContinue, continueLabel }: Props) {
  const theme = useTheme();
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const columns = useColumns();
  const { width, height } = useWindowDimensions();
  const layout = useLayout();
  const wide = layout.split;
  const [kbOpen, setKbOpen] = useState(false);
  /** While our keyboard is open on a phone, the goal card shrinks to one line (tap to peek). */
  const [peek, setPeek] = useState(false);
  const mini = !wide && kbOpen && !peek;
  const focus = !wide && kbOpen;
  /** The goal pane next to the terminal on a phone held sideways is narrow. */
  const narrowPane = wide && width * 0.38 < 330;

  // phone + our keyboard: the lesson header folds away too (see lesson screen)
  useEffect(() => {
    useUi.getState().setFocus(focus);
  }, [focus]);
  useEffect(() => () => useUi.getState().setFocus(false), []);

  // once: suggest turning the phone sideways, where goal and terminal sit side by side
  const tipSeen = useStore((s) => s.settings.rotateTipSeen);
  const [tip, setTip] = useState(false);
  useEffect(() => {
    if (!focus || tipSeen || layout.tablet || Platform.OS === 'web') return;
    const show = setTimeout(() => setTip(true), 900);
    const hide = setTimeout(() => {
      setTip(false);
      useStore.getState().setSettings({ rotateTipSeen: true });
    }, 8000);
    return () => {
      clearTimeout(show);
      clearTimeout(hide);
    };
  }, [focus, tipSeen, layout.tablet]);
  const closeTip = () => {
    setTip(false);
    useStore.getState().setSettings({ rotateTipSeen: true });
  };

  /** Smooth swap between the full goal card and its one-line version. */
  const animateSwap = () => LayoutAnimation.configureNext(LayoutAnimation.create(220, 'easeInEaseOut', 'opacity'));
  const initial = useMemo(() => prepareSession(task.setup, task.prepare ?? []), [task.key]); // eslint-disable-line react-hooks/exhaustive-deps
  const executed = useRef<ExecutedCommand[]>([]);
  const mistakes = useRef(0);
  const [evaluation, setEvaluation] = useState<TaskEvaluation | null>(null);
  const [hints, setHints] = useState(0);
  const [solved, setSolved] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const termRef = useRef<TerminalHandle>(null);

  const onExec = useCallback(
    (result: ExecResult) => {
      if (solved) return;
      executed.current.push(...result.executed);
      if (result.exitCode !== 0) mistakes.current++;
      const out = stripAnsi(result.output.map((o) => o.text).join(''));
      const ev = evaluateTask(task.checks, result.session, executed.current, out, result.exitCode);
      setEvaluation((prev) => {
        const newlyPassed = ev.results.some((r, i) => r.status === 'pass' && prev?.results[i]?.status !== 'pass');
        if (newlyPassed && !ev.passed) feedback.check();
        return ev;
      });
      if (ev.passed) {
        setSolved(true);
        feedback.correct();
        onSolved({ hints, mistakes: mistakes.current });
      }
    },
    [hints, onSolved, solved, task.checks],
  );

  const shell = useShell(initial, { onExec, columns, track: true });

  const [showFiles, setShowFiles] = useState(false);

  const reset = () => {
    const doIt = () => {
      executed.current = [];
      setEvaluation(null);
      shell.replaceSession(prepareSession(task.setup, task.prepare ?? []));
      if (task.prefill) termRef.current?.setInput(task.prefill);
    };
    confirmDialog({ title: t('lesson.resetConfirm'), message: t('lesson.resetHint'), icon: 'refresh', confirm: t('common.reset'), cancel: t('common.cancel'), destructive: true, onConfirm: doIt });
  };

  const missing = evaluation?.results.find((r) => r.status === 'partial')?.missingFlags;

  const passedCount = evaluation?.results.filter((r) => r.status === 'pass').length ?? 0;

  // missions have a story instead of a goal: show the next unmet check, else the story
  const nextCheck = task.checks.find((_, i) => evaluation?.results[i]?.status !== 'pass');
  const miniText = (task.goal ? tr(task.goal, lang) : nextCheck ? `→ ${tr(nextCheck.label, lang)}` : task.story ? tr(task.story, lang) : '').replace(/[`*]/g, '');

  const miniCard = (
    <Pressable
      onPress={() => {
        animateSwap();
        setPeek(true);
      }}
      accessibilityRole="button"
      accessibilityHint={t('lesson.expand')}
      style={[styles.mini, { backgroundColor: theme.surface, borderColor: solved ? theme.success : theme.border }]}
    >
      <Icon name={solved ? 'check-circle' : 'target'} size={18} color={solved ? theme.success : theme.accent} />
      <Text style={{ color: theme.text, fontSize: 14, flex: 1, fontWeight: '600' }} numberOfLines={layout.compact ? 1 : 2}>
        {solved ? t('lesson.solved') : miniText}
      </Text>
      <View style={[styles.counter, { backgroundColor: theme.surface2 }]}>
        <Text style={{ color: passedCount === task.checks.length ? theme.success : theme.textDim, fontSize: 12, fontWeight: '800' }}>
          {passedCount}/{task.checks.length}
        </Text>
      </View>
      <Icon name="chevron-down" size={20} color={theme.textDim} />
    </Pressable>
  );

  const card = (
    <View style={[styles.card, { backgroundColor: theme.surface, borderColor: solved ? theme.success : theme.border }]}>
      <Row style={{ justifyContent: 'space-between' }}>
        <Text style={{ color: theme.textDim, fontWeight: '800', fontSize: 12, letterSpacing: 1 }}>{(task.title ?? t('lesson.goal')).toUpperCase()}</Text>
        <Row gap={2}>
          {onTheory ? (
            <Pressable onPress={onTheory} hitSlop={8} accessibilityRole="button" accessibilityLabel={t('topic.readTopic')} style={[styles.pill, { backgroundColor: theme.surface2 }]}>
              <Icon name="book-open" size={16} color={theme.accent} />
              {narrowPane ? null : <Text style={{ color: theme.accent, fontWeight: '700', fontSize: 13 }}>{t('topic.theory')}</Text>}
            </Pressable>
          ) : null}
          <Pressable onPress={() => setShowFiles(!showFiles)} hitSlop={8} accessibilityRole="button" accessibilityLabel={t('lesson.files')} style={styles.iconBtn}>
            <Icon name="folder" size={20} color={showFiles ? theme.accent : theme.textDim} />
          </Pressable>
          <Pressable onPress={reset} hitSlop={8} accessibilityRole="button" accessibilityLabel={t('lesson.resetMachine')} style={styles.iconBtn}>
            <Icon name="refresh" size={20} color={theme.textDim} />
          </Pressable>
          <Pressable
            onPress={() => {
              animateSwap();
              if (kbOpen && !wide) setPeek(false);
              else setCollapsed(!collapsed);
            }}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={collapsed ? t('lesson.expand') : t('lesson.collapse')}
            style={styles.iconBtn}
          >
            <Icon name={collapsed ? 'chevron-down' : 'chevron-up'} size={20} color={theme.textDim} />
          </Pressable>
        </Row>
      </Row>
      {!collapsed ? (
        <ScrollView style={{ maxHeight: wide ? undefined : height * (kbOpen ? 0.3 : layout.compact ? 0.4 : 0.46) }} contentContainerStyle={{ gap: space.sm }}>
          {task.story ? <RichText text={tr(task.story, lang)} style={{ fontSize: 15, color: theme.textDim, marginBottom: 4 }} /> : null}
          {task.goal ? <RichText text={tr(task.goal, lang)} style={{ fontSize: 17, fontWeight: '600', marginBottom: 4 }} /> : null}
          {!solved && !layout.compact ? <HowTo text={t('lesson.howTo.task')} keys="Tab · ↑↓ · Enter" /> : null}
          {task.instructions ? (
            <View style={[styles.instr, { backgroundColor: theme.surface2 }]}>
              <Text style={{ color: theme.accent, fontWeight: '800', fontSize: 12, letterSpacing: 1 }}>{t('lesson.instructions').toUpperCase()}</Text>
              {tr(task.instructions, lang)
                .split('\n')
                .filter(Boolean)
                .map((line, k) => (
                  <Row key={k} gap={8} style={{ alignItems: 'flex-start' }}>
                    <Text style={{ color: theme.accent, fontWeight: '800', minWidth: 18 }}>{/^\d/.test(line) ? line.match(/^\d+/)![0] : '•'}</Text>
                    <RichText text={line.replace(/^\d+[.)]\s*/, '').replace(/^[-•]\s*/, '')} onCode={(c) => termRef.current?.insert(c)} style={{ fontSize: 15, marginBottom: 0, flex: 1 }} />
                  </Row>
                ))}
            </View>
          ) : null}
          {showFiles ? <FilesPanel session={shell.session} /> : null}
          <View style={{ gap: 6 }} accessibilityLabel={t('lesson.checklist')}>
            {task.checks.map((c, i) => {
              const st = evaluation?.results[i]?.status;
              return (
                <Row key={`${i}-${st ?? 'none'}`} gap={8}>
                  <FadeIn from={0} scale={st === 'pass'}>
                  <Icon
                    name={st === 'pass' ? 'check-circle' : 'circle'}
                    size={20}
                    color={st === 'pass' ? theme.success : st === 'partial' ? theme.warning : theme.textDim}
                  />
                  </FadeIn>
                  <Text style={{ color: st === 'pass' ? theme.text : theme.textDim, flex: 1, fontSize: 15 }}>{tr(c.label, lang)}</Text>
                </Row>
              );
            })}
          </View>
          {missing && !solved ? <Text style={{ color: theme.warning }}>{t('lesson.partial', { flags: missing.join(' ') })}</Text> : null}
          {allowHints && task.hints && !solved ? (
            <View style={{ gap: 6, marginTop: 4 }}>
              {hints >= 1 ? <Hint label={t('lesson.hintLevel1')} text={tr(task.hints.direction, lang)} /> : null}
              {hints >= 2 ? <Hint label={t('lesson.hintLevel2')} text={task.hints.command} mono onPress={() => termRef.current?.insert(task.hints!.command + ' ')} /> : null}
              {hints >= 3 ? (
                <Hint label={t('lesson.hintLevel3')} text={task.solution.join('\n')} mono onPress={() => termRef.current?.insert(task.solution[0]!)} />
              ) : null}
              {hints < 3 ? (
                <Button
                  small
                  variant="ghost"
                  icon="bulb"
                  title={t('lesson.showHint', { n: hints + 1 })}
                  onPress={() => setHints(hints + 1)}
                  style={{ alignSelf: 'flex-start' }}
                />
              ) : null}
            </View>
          ) : null}
          {solved ? (
            <Row gap={8} style={{ marginTop: 4 }}>
              <Icon name="check-circle" color={theme.success} />
              <Text style={{ color: theme.success, fontWeight: '800', fontSize: 16 }}>{t('lesson.solved')}</Text>
            </Row>
          ) : null}
          {solved ? solvedFooter : null}
        </ScrollView>
      ) : null}
    </View>
  );

  return (
    <View style={[styles.wrap, wide && { flexDirection: 'row' }]}>
      <View style={wide ? { width: '38%' } : undefined}>
        <FadeIn key={mini ? 'mini' : 'card'} from={mini ? -6 : 6} delay={0}>
          {mini ? miniCard : card}
        </FadeIn>
        <Collapsible open={tip}>
          <Pressable onPress={closeTip} accessibilityRole="button" style={[styles.tip, { backgroundColor: theme.surface2, borderColor: theme.accent }]}>
            <Icon name="phone-rotate-landscape" size={20} color={theme.accent} />
            <Text style={{ color: theme.text, fontSize: 13, flex: 1 }}>{t('lesson.rotateTip')}</Text>
            <Icon name="x" size={16} color={theme.textDim} />
          </Pressable>
        </Collapsible>
      </View>
      <Terminal
        ref={termRef}
        shell={shell}
        prefill={task.prefill}
        autoFocus
        grabTyping
        onKeyboardChange={(v) => {
          if (v !== kbOpen) animateSwap();
          setKbOpen(v);
          if (v) setPeek(false);
        }}
        style={{ flex: 1 }}
        banner={solved && onContinue ? (continueLabel ?? t('common.continue')) : null}
        onEmptyEnter={() => {
          if (solved && onContinue) {
            onContinue();
            return true;
          }
          return false;
        }}
      />
    </View>
  );
}

function Hint({ label, text, mono, onPress }: { label: string; text: string; mono?: boolean; onPress?: () => void }) {
  const theme = useTheme();
  return (
    <Pressable onPress={onPress} disabled={!onPress} accessibilityRole={onPress ? 'button' : 'text'} style={[styles.hint, { backgroundColor: theme.surface2 }]}>
      <Text style={{ color: theme.warning, fontSize: 12, fontWeight: '800' }}>{label}</Text>
      <Text style={{ color: theme.text, fontFamily: mono ? MONO : undefined, fontSize: mono ? 14 : 15 }}>{text}</Text>
    </Pressable>
  );
}

export function TaskSolvedNote({ xp }: { xp: number }) {
  const { t } = useTranslation();
  return <Body dim>{t('lesson.earned', { xp })}</Body>;
}

const styles = StyleSheet.create({
  wrap: { flex: 1, gap: space.sm },
  mini: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 14, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 6, minHeight: 40 },
  counter: { borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2 },
  card: { borderRadius: 16, borderWidth: 1, padding: space.md, gap: space.sm },
  iconBtn: { padding: 6, borderRadius: 999 },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, marginRight: 4 },
  instr: { borderRadius: 12, padding: 12, gap: 6 },
  files: { borderRadius: 12, padding: 12 },
  hint: { borderRadius: 10, padding: 10, gap: 2 },
  tip: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 6, borderRadius: 12, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 8 },
});

/** A quick look at the machine: where you are and what is there. */
function FilesPanel({ session }: { session: Session }) {
  return <MachineView session={session} />;
}
