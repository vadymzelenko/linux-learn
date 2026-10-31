import { useMemo, useRef, useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { prepareSession, tr, type L10n, type Step } from '@linux-learn/content';
import { useTheme, MONO, space } from '../../theme';
import { Body, Button, Icon, Row } from '../ui';
import { RichText, TheoryCards } from '../ui/RichText';
import { run, stripAnsi } from '@linux-learn/engine';
import { Terminal, useColumns, type TerminalHandle } from '../terminal/Terminal';
import { useShell } from '../terminal/useShell';
import { haptic } from '../../lib/haptics';
import { Text } from '../../theme/Text';

type StepOf<T extends Step['type']> = Extract<Step, { type: T }>;
export interface StepProps<T extends Step['type']> {
  step: StepOf<T>;
  lessonSetup?: string | Record<string, unknown>;
  onDone: (info: { mistakes: number }) => void;
}

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

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
      <ScrollView style={{ flex: wide ? 1.1 : termOpen ? 1.2 : 1 }} contentContainerStyle={{ paddingBottom: space.md }}>
        <TheoryCards text={tr(step.text, i18n.language)} {...(step.title ? { title: tr(step.title, i18n.language) } : {})} onCode={hasTerminal ? insert : undefined} />
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
            <Text style={{ color: theme.text, fontWeight: '700', flex: 1 }}>{t('lesson.terminal')}</Text>
            <Icon name={termOpen ? 'chevron-down' : 'chevron-up'} size={18} color={theme.textDim} />
          </Pressable>
        ) : null}
        {hasTerminal && termOpen ? <Terminal ref={termRef} shell={shell} style={{ flex: 1, minHeight: 150 }} /> : null}
        <Row>
          {step.demo ? <Button variant="secondary" icon="play" title={t('lesson.watchDemo')} onPress={() => void play()} disabled={playing} style={{ flex: 1 }} /> : null}
          <Button title={t('common.continue')} onPress={() => onDone({ mistakes: 0 })} style={{ flex: 1 }} />
        </Row>
      </View>
    </View>
  );
}

function Feedback({ ok, explanation }: { ok: boolean; explanation?: L10n }) {
  const theme = useTheme();
  const { t, i18n } = useTranslation();
  return (
    <View style={[styles.feedback, { backgroundColor: theme.surface2, borderColor: ok ? theme.success : theme.danger }]} accessibilityLiveRegion="polite">
      <Row>
        <Icon name={ok ? 'check-circle' : 'x'} color={ok ? theme.success : theme.danger} />
        <Text style={{ color: ok ? theme.success : theme.danger, fontWeight: '800', fontSize: 16 }}>{ok ? t('lesson.correct') : t('lesson.wrong')}</Text>
      </Row>
      {ok && explanation ? <Body>{tr(explanation, i18n.language)}</Body> : null}
    </View>
  );
}

function Choice({ text, mono, state, onPress, index }: { text: string; mono?: boolean; state: 'idle' | 'right' | 'wrong'; onPress: () => void; index: number }) {
  const theme = useTheme();
  const border = state === 'right' ? theme.success : state === 'wrong' ? theme.danger : theme.border;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ checked: state !== 'idle' }}
      accessibilityLabel={text || `(${index + 1}) empty`}
      style={({ pressed }) => [styles.choice, { borderColor: border, backgroundColor: mono ? theme.term.bg : theme.surface, opacity: pressed ? 0.85 : 1 }]}
    >
      <Text style={{ color: mono ? theme.term.fg : theme.text, fontFamily: mono ? MONO : undefined, fontSize: mono ? 14 : 16 }}>{text}</Text>
    </Pressable>
  );
}

function useChoice(answer: number, onDone: (i: { mistakes: number }) => void) {
  const [picked, setPicked] = useState<number[]>([]);
  const solved = picked.includes(answer);
  const pick = (i: number) => {
    if (solved || picked.includes(i)) return;
    if (i === answer) haptic.success();
    else haptic.error();
    setPicked([...picked, i]);
  };
  const state = (i: number): 'idle' | 'right' | 'wrong' => (picked.includes(i) ? (i === answer ? 'right' : 'wrong') : 'idle');
  return { picked, solved, pick, state, finish: () => onDone({ mistakes: picked.filter((p) => p !== answer).length }) };
}

export function QuizStep({ step, onDone }: StepProps<'quiz'>) {
  const { t, i18n } = useTranslation();
  const c = useChoice(step.answer, onDone);
  return (
    <ScrollView contentContainerStyle={{ gap: space.md }}>
      <RichText text={tr(step.question, i18n.language)} style={{ fontSize: 18, fontWeight: '700' }} />
      {step.options.map((o, i) => (
        <Choice key={i} index={i} text={tr(o, i18n.language)} state={c.state(i)} onPress={() => c.pick(i)} />
      ))}
      {c.picked.length ? <Feedback ok={c.solved} {...(step.explanation ? { explanation: step.explanation } : {})} /> : null}
      {c.solved ? <Button title={t('common.continue')} onPress={c.finish} /> : null}
    </ScrollView>
  );
}

export function PredictStep({ step, lessonSetup, onDone }: StepProps<'predict'>) {
  const theme = useTheme();
  const { t } = useTranslation();
  const c = useChoice(step.answer, onDone);
  const session = useMemo(() => prepareSession(step.setup ?? lessonSetup, step.prepare ?? []), [step, lessonSetup]);
  const where = session.cwd.replace(/^\/home\/student/, '~');
  const p = `${session.user}@${session.machine.hostname}:${where}$ `;
  // show the machine: what the user would see with a quick look around
  const context = useMemo(() => {
    const cmds = step.context ?? ['tree -a -L 2 --noreport'];
    let s = session;
    return cmds.map((cmd) => {
      const r = run(s, cmd, { isTTY: false });
      s = r.session;
      return { cmd, out: stripAnsi(r.output.map((o) => o.text).join('')).trimEnd() };
    });
  }, [session, step.context]);

  return (
    <ScrollView contentContainerStyle={{ gap: space.md }}>
      <View style={[styles.cmdBox, { backgroundColor: theme.surface, borderColor: theme.border, gap: 8 }]}>
        <Row>
          <Icon name="server" size={18} color={theme.term.path} />
          <Text style={{ color: theme.textDim, fontWeight: '700', fontSize: 12, letterSpacing: 1 }}>{t('lesson.context').toUpperCase()}</Text>
        </Row>
        <Text style={{ color: theme.text }}>{t('lesson.whereYouAre', { path: where })}</Text>
        {context.map((x) => (
          <View key={x.cmd} style={[styles.ctxTerm, { backgroundColor: theme.term.bg }]}>
            <Text style={{ fontFamily: MONO, fontSize: 13, color: theme.term.fg, lineHeight: 19 }}>
              <Text style={{ color: theme.term.user }}>$ </Text>
              {x.cmd}
              {'\n'}
              {x.out}
            </Text>
          </View>
        ))}
      </View>
      <View style={[styles.cmdBox, { backgroundColor: theme.term.bg, borderColor: theme.accent }]}>
        <Text style={{ fontFamily: MONO, fontSize: 15, color: theme.term.fg }}>
          <Text style={{ color: theme.term.user }}>{p}</Text>
          {step.command}
        </Text>
      </View>
      {step.options.map((o, i) => (
        <Choice key={i} index={i} mono text={o === '' ? t('lesson.emptyOutput') : o} state={c.state(i)} onPress={() => c.pick(i)} />
      ))}
      {c.picked.length ? <Feedback ok={c.solved} {...(step.explanation ? { explanation: step.explanation } : {})} /> : null}
      {c.solved ? <Button title={t('common.continue')} onPress={c.finish} /> : null}
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
  const line = chosen.map((id) => pool.find((p) => p.id === id)!.text);

  const check = () => {
    const ok = line.join(' ') === step.answer.join(' ');
    setResult(ok);
    if (ok) haptic.success();
    else {
      haptic.error();
      setMistakes(mistakes + 1);
    }
  };

  return (
    <ScrollView contentContainerStyle={{ gap: space.md }}>
      <RichText text={tr(step.goal, i18n.language)} style={{ fontSize: 18, fontWeight: '700' }} />
      <Body dim>{t('lesson.tokensHint')}</Body>
      <View style={[styles.cmdBox, styles.assembled, { backgroundColor: theme.term.bg, borderColor: result === false ? theme.danger : result ? theme.success : theme.border }]}>
        <Text style={{ fontFamily: MONO, color: theme.term.user, fontSize: 15 }}>$</Text>
        {chosen.map((id) => (
          <Pressable
            key={id}
            onPress={() => {
              setResult(null);
              setChosen(chosen.filter((c) => c !== id));
            }}
            accessibilityRole="button"
            style={[styles.token, { backgroundColor: theme.surface2 }]}
          >
            <Text style={{ fontFamily: MONO, color: theme.term.fg, fontSize: 15 }}>{pool.find((p) => p.id === id)!.text}</Text>
          </Pressable>
        ))}
      </View>
      <View style={styles.tokens}>
        {pool
          .filter((p) => !chosen.includes(p.id))
          .map((p) => (
            <Pressable
              key={p.id}
              onPress={() => {
                haptic.tap();
                setResult(null);
                setChosen([...chosen, p.id]);
              }}
              accessibilityRole="button"
              accessibilityLabel={p.text}
              style={({ pressed }) => [styles.token, styles.bigToken, { backgroundColor: pressed ? theme.border : theme.surface, borderColor: theme.border }]}
            >
              <Text style={{ fontFamily: MONO, color: theme.text, fontSize: 16 }}>{p.text}</Text>
            </Pressable>
          ))}
      </View>
      {result !== null ? <Feedback ok={result} {...(step.explanation ? { explanation: step.explanation } : {})} /> : null}
      {result ? (
        <Button title={t('common.continue')} onPress={() => onDone({ mistakes })} />
      ) : (
        <Button title={t('common.check')} onPress={check} disabled={chosen.length === 0} />
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  termToggle: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, paddingVertical: 12, borderRadius: 12 },
  ctxTerm: { borderRadius: 10, padding: 10 },
  feedback: { borderWidth: 1, borderRadius: 14, padding: space.md, gap: 6 },
  choice: { borderWidth: 1.5, borderRadius: 14, padding: space.md, minHeight: 52, justifyContent: 'center' },
  cmdBox: { borderWidth: 1, borderRadius: 14, padding: space.md },
  assembled: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'center', minHeight: 60 },
  tokens: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  token: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  bigToken: { paddingHorizontal: 14, paddingVertical: 10, borderWidth: 1, ...(Platform.OS === 'web' ? ({ cursor: 'pointer' } as object) : {}) },
});
