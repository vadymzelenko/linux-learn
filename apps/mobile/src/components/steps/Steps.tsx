import { useMemo, useRef, useState } from 'react';
import { Animated, Platform, Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { prepareSession, tr, type L10n, type Step } from '@linux-learn/content';
import { useTheme, MONO, space } from '../../theme';
import { Body, Button, FadeIn, Icon, Row } from '../ui';
import { useFeedbackMotion } from '../ui/Motion';
import { RichText, TheoryCards } from '../ui/RichText';
import { run, stripAnsi } from '@linux-learn/engine';
import { Terminal, useColumns, type TerminalHandle } from '../terminal/Terminal';
import { useShell } from '../terminal/useShell';
import { KeyCatcher } from '../KeyCatcher';
import { MachineView } from '../MachineView';
import { feedback } from '../../lib/haptics';
import { Text } from '../../theme/Text';

type StepOf<T extends Step['type']> = Extract<Step, { type: T }>;
export interface StepProps<T extends Step['type']> {
  step: StepOf<T>;
  lessonSetup?: string | Record<string, unknown>;
  onDone: (info: { mistakes: number }) => void;
}

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** A one-line, plain-language "what to do here" above every step. */
export function HowTo({ text, keys }: { text: string; keys?: string }) {
  const theme = useTheme();
  return (
    <Row gap={8} style={[styles.howto, { backgroundColor: theme.surface2 }]}>
      <Icon name="hand-pointing-right" size={18} color={theme.accent} />
      <Text style={{ color: theme.text, fontSize: 14, flex: 1 }}>{text}</Text>
      {keys && Platform.OS === 'web' ? <Text style={{ color: theme.textDim, fontSize: 12, fontFamily: MONO }}>{keys}</Text> : null}
    </Row>
  );
}

/** Theory as cards + an optional live terminal: tap `code` to paste it, or watch the demo type itself. */
export function TheoryStep({ step, lessonSetup, onDone }: StepProps<'theory'>) {
  const theme = useTheme();
  const { t, i18n } = useTranslation();
  const columns = useColumns();
  const { width, height } = useWindowDimensions();
  const wide = width >= 820 && width > height;
  const hasTerminal = step.terminal !== false;
  const setup = step.demo?.setup ?? lessonSetup;
  const initial = useMemo(() => prepareSession(setup), [setup]);
  const shell = useShell(initial, { columns, track: true });
  const termRef = useRef<TerminalHandle>(null);
  const [playing, setPlaying] = useState(false);
  const [termOpen, setTermOpen] = useState(wide);
  const done = () => onDone({ mistakes: 0 });

  const insert = (c: string) => {
    if (!hasTerminal) return;
    setTermOpen(true);
    setTimeout(() => termRef.current?.insert(c), 50);
  };

  const play = async () => {
    if (!step.demo || playing) return;
    setTermOpen(true);
    setPlaying(true);
    shell.replaceSession(prepareSession(setup));
    await wait(80);
    for (const cmd of step.demo.commands) {
      for (let i = 1; i <= cmd.length; i++) {
        termRef.current?.setInput(cmd.slice(0, i));
        await wait(28);
      }
      await wait(220);
      termRef.current?.setInput('');
      shell.execute(cmd);
      await wait(650);
    }
    setPlaying(false);
  };

  return (
    <View style={{ flex: 1, gap: space.md, flexDirection: wide ? 'row' : 'column' }}>
      <KeyCatcher
        enabled={!(hasTerminal && termOpen)}
        onKey={(e) => {
          if (e.key === 'Enter') {
            done();
            return true;
          }
        }}
      />
      <ScrollView style={{ flex: wide ? 1.1 : termOpen ? 1.2 : 1 }} contentContainerStyle={{ paddingBottom: space.md }}>
        <FadeIn>
          <TheoryCards text={tr(step.text, i18n.language)} {...(step.title ? { title: tr(step.title, i18n.language) } : {})} onCode={hasTerminal ? insert : undefined} />
        </FadeIn>
        {hasTerminal ? <Text style={{ color: theme.textDim, fontSize: 13, marginTop: space.sm }}>{t('lesson.tapToInsert')}</Text> : null}
      </ScrollView>
      <View style={[{ gap: space.sm, flexShrink: 0 }, (wide || termOpen) && { flex: 1 }]}>
        {hasTerminal && !wide ? (
          <Pressable
            onPress={() => setTermOpen(!termOpen)}
            accessibilityRole="button"
            accessibilityState={{ expanded: termOpen }}
            style={[styles.termToggle, { backgroundColor: theme.surface2 }]}
          >
            <Icon name="terminal" size={18} color={theme.accent} />
            <Text style={{ color: theme.text, fontWeight: '700', flex: 1 }}>{termOpen ? t('lesson.terminal') : t('lesson.tryTerminal')}</Text>
            <Icon name={termOpen ? 'chevron-down' : 'chevron-up'} size={18} color={theme.textDim} />
          </Pressable>
        ) : null}
        {hasTerminal && termOpen ? (
          <Terminal
            ref={termRef}
            shell={shell}
            style={{ flex: 1, minHeight: 150 }}
            onEmptyEnter={() => {
              done();
              return true;
            }}
            grabTyping
          />
        ) : null}
        <Row>
          {step.demo ? <Button variant="secondary" icon="play" title={t('lesson.watchDemo')} onPress={() => void play()} disabled={playing} style={{ flex: 1 }} /> : null}
          <Button title={t('common.continue')} hint={Platform.OS === 'web' ? 'Enter' : undefined} onPress={done} style={{ flex: 1 }} />
        </Row>
      </View>
    </View>
  );
}

function Feedback({ ok, explanation }: { ok: boolean; explanation?: L10n }) {
  const theme = useTheme();
  const { t, i18n } = useTranslation();
  return (
    <FadeIn from={8}>
      <View style={[styles.feedback, { backgroundColor: theme.surface2, borderColor: ok ? theme.success : theme.danger }]} accessibilityLiveRegion="polite">
        <Row>
          <Icon name={ok ? 'check-circle' : 'x'} color={ok ? theme.success : theme.danger} />
          <Text style={{ color: ok ? theme.success : theme.danger, fontWeight: '800', fontSize: 16 }}>{ok ? t('lesson.correct') : t('lesson.wrongTryAgain')}</Text>
        </Row>
        {ok && explanation ? <Body>{tr(explanation, i18n.language)}</Body> : null}
      </View>
    </FadeIn>
  );
}

function Choice({ text, mono, state, onPress, index }: { text: string; mono?: boolean; state: 'idle' | 'right' | 'wrong'; onPress: () => void; index: number }) {
  const theme = useTheme();
  const motion = useFeedbackMotion();
  const prev = useRef(state);
  if (prev.current !== state) {
    prev.current = state;
    if (state === 'wrong') setTimeout(motion.shake, 0);
    if (state === 'right') setTimeout(motion.pop, 0);
  }
  const border = state === 'right' ? theme.success : state === 'wrong' ? theme.danger : theme.border;
  const badgeBg = state === 'right' ? theme.success : state === 'wrong' ? theme.danger : theme.surface2;
  return (
    <FadeIn index={index}>
      <Animated.View style={motion.style}>
        <Pressable
          onPress={onPress}
          accessibilityRole="radio"
          accessibilityState={{ checked: state !== 'idle', disabled: state === 'wrong' }}
          accessibilityLabel={`${index + 1}. ${text || 'empty'}`}
          style={({ pressed, hovered }: { pressed: boolean; hovered?: boolean }) => [
            styles.choice,
            { borderColor: hovered && state === 'idle' ? theme.accent : border, backgroundColor: mono ? theme.term.bg : theme.surface, opacity: pressed ? 0.85 : state === 'wrong' ? 0.6 : 1 },
          ]}
        >
          <View style={[styles.badge, { backgroundColor: badgeBg }]}>
            {state === 'idle' ? (
              <Text style={{ color: theme.text, fontWeight: '800', fontSize: 14 }}>{index + 1}</Text>
            ) : (
              <Icon name={state === 'right' ? 'check' : 'x'} size={16} color={state === 'right' ? theme.onAccent : '#FFFFFF'} />
            )}
          </View>
          <Text style={{ flex: 1, color: mono ? theme.term.fg : theme.text, fontFamily: mono ? MONO : undefined, fontSize: mono ? 14 : 16, lineHeight: mono ? 20 : 22 }}>{text}</Text>
        </Pressable>
      </Animated.View>
    </FadeIn>
  );
}

/**
 * Display order of the options: shuffled on every mount so the right answer is
 * not always in the same place (in the content it is usually the first one).
 */
function useOrder(n: number, answer: number): number[] {
  return useMemo(() => {
    const idx = Array.from({ length: n }, (_, i) => i);
    for (let i = n - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [idx[i], idx[j]] = [idx[j]!, idx[i]!];
    }
    if (n > 2 && idx[0] === answer && Math.random() < 0.67) idx.push(idx.shift()!);
    return idx;
  }, [n, answer]);
}

function useChoice(answer: number, onDone: (i: { mistakes: number }) => void) {
  const [picked, setPicked] = useState<number[]>([]);
  const solved = picked.includes(answer);
  const pick = (i: number) => {
    if (solved || picked.includes(i)) return;
    if (i === answer) feedback.correct();
    else feedback.wrong();
    setPicked([...picked, i]);
  };
  const state = (i: number): 'idle' | 'right' | 'wrong' => (picked.includes(i) ? (i === answer ? 'right' : 'wrong') : 'idle');
  const finish = () => onDone({ mistakes: picked.filter((p) => p !== answer).length });
  return { picked, solved, pick, state, finish };
}

/** Keys for a list of choices: 1–9 pick, Enter continues once solved. */
function ChoiceKeys({ order, c }: { order: number[]; c: ReturnType<typeof useChoice> }) {
  return (
    <KeyCatcher
      onKey={(e) => {
        const n = Number(e.key);
        if (Number.isInteger(n) && n >= 1 && n <= order.length) {
          c.pick(order[n - 1]!);
          return true;
        }
        if (e.key === 'Enter' && c.solved) {
          c.finish();
          return true;
        }
      }}
    />
  );
}

export function QuizStep({ step, onDone }: StepProps<'quiz'>) {
  const { t, i18n } = useTranslation();
  const c = useChoice(step.answer, onDone);
  const order = useOrder(step.options.length, step.answer);
  return (
    <ScrollView contentContainerStyle={{ gap: space.md, paddingBottom: space.lg }}>
      <ChoiceKeys order={order} c={c} />
      <HowTo text={t('lesson.howTo.quiz')} keys={`1–${order.length} · Enter`} />
      <FadeIn>
        <RichText text={tr(step.question, i18n.language)} style={{ fontSize: 19, fontWeight: '700' }} />
      </FadeIn>
      {order.map((i, k) => (
        <Choice key={i} index={k} text={tr(step.options[i]!, i18n.language)} state={c.state(i)} onPress={() => c.pick(i)} />
      ))}
      {c.picked.length ? <Feedback ok={c.solved} {...(step.explanation ? { explanation: step.explanation } : {})} /> : null}
      {c.solved ? <Button title={t('common.continue')} hint={Platform.OS === 'web' ? 'Enter' : undefined} onPress={c.finish} /> : null}
    </ScrollView>
  );
}

export function PredictStep({ step, lessonSetup, onDone }: StepProps<'predict'>) {
  const theme = useTheme();
  const { t } = useTranslation();
  const c = useChoice(step.answer, onDone);
  const order = useOrder(step.options.length, step.answer);
  const session = useMemo(() => prepareSession(step.setup ?? lessonSetup, step.prepare ?? []), [step, lessonSetup]);
  const p = `${session.user}@${session.machine.hostname}:${session.cwd.replace(/^\/home\/student/, '~')}$ `;
  const [showMachine, setShowMachine] = useState(true);
  // custom context commands (e.g. "cat notes.txt") are shown as a mini terminal; the default is the file view
  const context = useMemo(() => {
    if (!step.context) return null;
    let s = session;
    return step.context.map((cmd) => {
      const r = run(s, cmd, { isTTY: false });
      s = r.session;
      return { cmd, out: stripAnsi(r.output.map((o) => o.text).join('')).trimEnd() };
    });
  }, [session, step.context]);

  return (
    <ScrollView contentContainerStyle={{ gap: space.md, paddingBottom: space.lg }}>
      <ChoiceKeys order={order} c={c} />
      <HowTo text={t('lesson.howTo.predict')} keys={`1–${order.length} · Enter`} />
      <FadeIn>
        <View style={[styles.cmdBox, { backgroundColor: theme.term.bg, borderColor: theme.accent }]}>
          <Text style={{ color: theme.textDim, fontSize: 12, marginBottom: 6 }}>{t('lesson.theCommand')}</Text>
          <Text style={{ fontFamily: MONO, fontSize: 16, color: theme.term.fg }}>
            <Text style={{ fontFamily: MONO, color: theme.term.user }}>{p}</Text>
            {step.command}
          </Text>
        </View>
      </FadeIn>
      <View style={[styles.cmdBox, { backgroundColor: theme.surface, borderColor: theme.border, gap: 8 }]}>
        <Pressable onPress={() => setShowMachine(!showMachine)} accessibilityRole="button" accessibilityState={{ expanded: showMachine }}>
          <Row>
            <Icon name="server" size={18} color={theme.term.path} />
            <Text style={{ color: theme.textDim, fontWeight: '700', fontSize: 12, letterSpacing: 1, flex: 1 }}>{t('lesson.context').toUpperCase()}</Text>
            <Text style={{ color: theme.textDim, fontSize: 12 }}>{showMachine ? t('lesson.collapse') : t('lesson.expand')}</Text>
            <Icon name={showMachine ? 'chevron-up' : 'chevron-down'} size={18} color={theme.textDim} />
          </Row>
        </Pressable>
        {showMachine ? (
          context ? (
            context.map((x) => (
              <View key={x.cmd} style={[styles.ctxTerm, { backgroundColor: theme.term.bg }]}>
                <Text style={{ fontFamily: MONO, fontSize: 13, color: theme.term.fg, lineHeight: 19 }}>
                  <Text style={{ fontFamily: MONO, color: theme.term.user }}>$ </Text>
                  {x.cmd}
                  {'\n'}
                  {x.out}
                </Text>
              </View>
            ))
          ) : (
            <MachineView session={session} compact />
          )
        ) : null}
      </View>
      <Text style={{ color: theme.text, fontWeight: '700', fontSize: 16 }}>{t('lesson.whichOutput')}</Text>
      {order.map((i, k) => (
        <Choice key={i} index={k} mono text={step.options[i] === '' ? t('lesson.emptyOutput') : step.options[i]!} state={c.state(i)} onPress={() => c.pick(i)} />
      ))}
      {c.picked.length ? <Feedback ok={c.solved} {...(step.explanation ? { explanation: step.explanation } : {})} /> : null}
      {c.solved ? <Button title={t('common.continue')} hint={Platform.OS === 'web' ? 'Enter' : undefined} onPress={c.finish} /> : null}
    </ScrollView>
  );
}

function shuffle<T>(xs: T[], seed: number): T[] {
  const a = [...xs];
  let s = seed || 1;
  for (let i = a.length - 1; i > 0; i--) {
    s = (s * 9301 + 49297) % 233280;
    const j = Math.floor((s / 233280) * (i + 1));
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a;
}

export function BuildStep({ step, onDone }: StepProps<'build'>) {
  const theme = useTheme();
  const { t, i18n } = useTranslation();
  const pool = useMemo(() => {
    const tokens = [...step.answer, ...(step.distractors ?? [])].map((text, id) => ({ id, text }));
    let sh = shuffle(tokens, step.answer.join('').length + tokens.length);
    if (sh.slice(0, step.answer.length).every((tk, i) => tk.text === step.answer[i])) sh = sh.reverse();
    return sh;
  }, [step]);
  const [chosen, setChosen] = useState<number[]>([]);
  const [result, setResult] = useState<null | boolean>(null);
  const [mistakes, setMistakes] = useState(0);
  const motion = useFeedbackMotion();
  const line = chosen.map((id) => pool.find((p) => p.id === id)!.text);
  const left = pool.filter((p) => !chosen.includes(p.id));

  const add = (id: number) => {
    feedback.key();
    setResult(null);
    setChosen((c) => [...c, id]);
  };
  const removeLast = () => {
    feedback.tap();
    setResult(null);
    setChosen((c) => c.slice(0, -1));
  };
  const check = () => {
    const ok = line.join(' ') === step.answer.join(' ');
    setResult(ok);
    if (ok) {
      feedback.correct();
      motion.pop();
    } else {
      feedback.wrong();
      motion.shake();
      setMistakes(mistakes + 1);
    }
  };

  return (
    <ScrollView contentContainerStyle={{ gap: space.md, paddingBottom: space.lg }}>
      <KeyCatcher
        onKey={(e) => {
          const n = Number(e.key);
          if (Number.isInteger(n) && n >= 1 && n <= left.length) {
            add(left[n - 1]!.id);
            return true;
          }
          if (e.key === 'Backspace' && chosen.length) {
            removeLast();
            return true;
          }
          if (e.key === 'Enter') {
            if (result) onDone({ mistakes });
            else if (chosen.length) check();
            return true;
          }
        }}
      />
      <HowTo text={t('lesson.howTo.build')} keys="1–9 · ⌫ · Enter" />
      <FadeIn>
        <RichText text={tr(step.goal, i18n.language)} style={{ fontSize: 19, fontWeight: '700' }} />
      </FadeIn>
      <Animated.View style={motion.style}>
        <View style={[styles.cmdBox, styles.assembled, { backgroundColor: theme.term.bg, borderColor: result === false ? theme.danger : result ? theme.success : theme.border }]}>
          <Text style={{ fontFamily: MONO, color: theme.term.user, fontSize: 15 }}>$</Text>
          {chosen.length === 0 ? <Text style={{ color: theme.textDim, fontSize: 14 }}>{t('lesson.buildEmpty')}</Text> : null}
          {chosen.map((id) => (
            <Pressable
              key={id}
              onPress={() => {
                feedback.tap();
                setResult(null);
                setChosen(chosen.filter((c) => c !== id));
              }}
              accessibilityRole="button"
              accessibilityHint={t('lesson.tapToRemove')}
              style={[styles.token, { backgroundColor: theme.surface2 }]}
            >
              <Text style={{ fontFamily: MONO, color: theme.term.fg, fontSize: 15 }}>{pool.find((p) => p.id === id)!.text}</Text>
            </Pressable>
          ))}
        </View>
      </Animated.View>
      <View style={styles.tokens}>
        {left.map((p, k) => (
          <FadeIn key={p.id} index={k} from={6}>
            <Pressable
              onPress={() => add(p.id)}
              accessibilityRole="button"
              accessibilityLabel={p.text}
              style={({ pressed }) => [styles.token, styles.bigToken, { backgroundColor: pressed ? theme.border : theme.surface, borderColor: theme.border }]}
            >
              {Platform.OS === 'web' && k < 9 ? <Text style={{ color: theme.textDim, fontSize: 11, fontFamily: MONO }}>{k + 1}</Text> : null}
              <Text style={{ fontFamily: MONO, color: theme.text, fontSize: 16 }}>{p.text}</Text>
            </Pressable>
          </FadeIn>
        ))}
      </View>
      {result !== null ? <Feedback ok={result} {...(step.explanation ? { explanation: step.explanation } : {})} /> : null}
      {result ? (
        <Button title={t('common.continue')} hint={Platform.OS === 'web' ? 'Enter' : undefined} onPress={() => onDone({ mistakes })} />
      ) : (
        <Row>
          {chosen.length ? <Button variant="secondary" icon="backspace-outline" title={t('lesson.undo')} onPress={removeLast} style={{ flex: 1 }} /> : null}
          <Button title={t('common.check')} hint={Platform.OS === 'web' ? 'Enter' : undefined} onPress={check} disabled={chosen.length === 0} style={{ flex: 2 }} />
        </Row>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  howto: { paddingHorizontal: 12, paddingVertical: 10, borderRadius: 12 },
  termToggle: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, paddingVertical: 12, borderRadius: 12 },
  ctxTerm: { borderRadius: 10, padding: 10 },
  feedback: { borderWidth: 1, borderRadius: 14, padding: space.md, gap: 6 },
  choice: { flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1.5, borderRadius: 14, padding: space.md, minHeight: 56 },
  badge: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  cmdBox: { borderWidth: 1, borderRadius: 14, padding: space.md },
  assembled: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'center', minHeight: 60 },
  tokens: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  token: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  bigToken: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 10, borderWidth: 1, ...(Platform.OS === 'web' ? ({ cursor: 'pointer' } as object) : {}) },
});
