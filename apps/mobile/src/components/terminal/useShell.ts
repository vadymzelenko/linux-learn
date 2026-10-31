import { useCallback, useRef, useState } from 'react';
import { complete, prompt, run, saveFile, type ExecResult, type PromptParts, type Session } from '@linux-learn/engine';
import { useTranslation } from 'react-i18next';
import { useStore } from '../../state/store';
import { haptic } from '../../lib/haptics';

export interface Block {
  id: number;
  prompt?: PromptParts;
  command?: string;
  /** Raw output (may contain ANSI colours). */
  output: string;
  /** Localised trainer message (not part of the real terminal output). */
  note?: { text: string; tone: 'info' | 'warn' | 'success' };
  failed?: boolean;
}

export interface EditorState {
  path: string;
  content: string;
  exists: boolean;
}

export interface ShellOptions {
  /** Called with every executed line (task checks, stats). */
  onExec?: (result: ExecResult, line: string) => void;
  /** Called whenever the session changes (persistence). */
  onSession?: (s: Session) => void;
  /** A fresh session after `exit`. */
  makeSession?: () => Session;
  columns: number;
  /** Count stats/achievements for this terminal. */
  track?: boolean;
}

const MAX_BLOCKS = 400;
const MAX_LINES = 1000;
let blockSeq = 1;

function trimBuffer(blocks: Block[]): Block[] {
  let lines = 0;
  let start = blocks.length;
  while (start > 0) {
    const b = blocks[start - 1]!;
    lines += 1 + (b.output.match(/\n/g)?.length ?? 0);
    if (lines > MAX_LINES) break;
    start--;
  }
  const kept = blocks.slice(Math.max(start, blocks.length - MAX_BLOCKS));
  if (kept.length < blocks.length && kept[0]) {
    // cut the oldest output to fit exactly
    const first = kept[0];
    const parts = first.output.split('\n');
    if (parts.length > MAX_LINES) kept[0] = { ...first, output: parts.slice(-MAX_LINES).join('\n') };
  }
  return kept;
}

export function useShell(initial: Session, opts: ShellOptions) {
  const { t } = useTranslation();
  const [session, setSessionState] = useState(initial);
  const sessionRef = useRef(initial);
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [editor, setEditor] = useState<EditorState | null>(null);
  const historyPos = useRef<number | null>(null);
  const draft = useRef('');
  const optsRef = useRef(opts);
  optsRef.current = opts;

  const setSession = useCallback((s: Session) => {
    sessionRef.current = s;
    setSessionState(s);
    optsRef.current.onSession?.(s);
  }, []);

  const pushBlocks = useCallback((add: Block[], clear = false) => {
    setBlocks((prev) => trimBuffer(clear ? add : [...prev, ...add]));
  }, []);

  const note = useCallback(
    (text: string, tone: 'info' | 'warn' | 'success' = 'info') => pushBlocks([{ id: blockSeq++, output: '', note: { text, tone } }]),
    [pushBlocks],
  );

  const execute = useCallback(
    (line: string) => {
      historyPos.current = null;
      draft.current = '';
      const before = sessionRef.current;
      const p = prompt(before);
      const result = run(before, line, { now: Date.now(), columns: optsRef.current.columns, isTTY: true });
      let output = result.output.map((o) => o.text).join('');
      const failed = result.exitCode !== 0;
      const cleared = result.events.some((e) => e.type === 'clear');
      if (cleared) output = output.slice(output.lastIndexOf('\x1b[3J') + 4);
      const add: Block[] = cleared ? [] : [{ id: blockSeq++, prompt: p, command: line, output, failed }];
      if (cleared && output) add.push({ id: blockSeq++, output });
      let next = result.session;
      for (const e of result.events) {
        if (e.type === 'didYouMean') add.push({ id: blockSeq++, output: '', note: { text: t('terminal.didYouMean', { cmd: e.suggestion }), tone: 'info' } });
        if (e.type === 'easterEgg') {
          const key = e.id === 'fork-bomb' ? 'terminal.forkBomb' : e.id === 'sudo-rm-rf-root' ? 'terminal.sudoRmrf' : 'terminal.rmrf';
          add.push({ id: blockSeq++, output: '', note: { text: t(key), tone: 'warn' } });
        }
        if (e.type === 'openEditor') setEditor({ path: e.path, content: e.content, exists: e.exists });
        if (e.type === 'exit' && optsRef.current.makeSession) {
          next = { ...optsRef.current.makeSession(), history: result.session.history };
          add.push({ id: blockSeq++, output: '', note: { text: t('terminal.logout'), tone: 'info' } });
        }
      }
      pushBlocks(add, cleared);
      setSession(next);
      if (failed) haptic.error();
      if (optsRef.current.track !== false && line.trim()) useStore.getState().recordCommand(line, result, next.cwd);
      optsRef.current.onExec?.({ ...result, session: next }, line);
      return result;
    },
    [pushBlocks, setSession, t],
  );

  /** Up/Down through the session history. Returns the text to show. */
  const historyStep = useCallback((dir: -1 | 1, current: string): string | null => {
    const h = sessionRef.current.history;
    if (h.length === 0) return null;
    if (historyPos.current === null) {
      if (dir === 1) return null;
      draft.current = current;
      historyPos.current = h.length - 1;
    } else {
      const pos = historyPos.current + dir;
      if (pos >= h.length) {
        historyPos.current = null;
        return draft.current;
      }
      historyPos.current = Math.max(0, pos);
    }
    return h[historyPos.current] ?? null;
  }, []);

  const tab = useCallback(
    (line: string, cursor: number) => {
      const r = complete(sessionRef.current, line, cursor);
      if (r.candidates.length > 1) {
        pushBlocks([{ id: blockSeq++, prompt: prompt(sessionRef.current), command: line, output: r.candidates.join('  ') + '\n' }]);
      }
      return r;
    },
    [pushBlocks],
  );

  const interrupt = useCallback(
    (line: string) => {
      historyPos.current = null;
      pushBlocks([{ id: blockSeq++, prompt: prompt(sessionRef.current), command: line + '^C', output: '' }]);
    },
    [pushBlocks],
  );

  const clearScreen = useCallback(() => setBlocks([]), []);

  const replaceSession = useCallback(
    (s: Session, keepScreen = false) => {
      setSession(s);
      if (!keepScreen) setBlocks([]);
    },
    [setSession],
  );

  const saveEditor = useCallback(
    (content: string): string | null => {
      if (!editor) return null;
      const r = saveFile(sessionRef.current, editor.path, content, Date.now());
      if (r.error) return r.error;
      setSession(r.session);
      setEditor({ ...editor, content, exists: true });
      return null;
    },
    [editor, setSession],
  );

  return {
    session,
    blocks,
    execute,
    historyStep,
    tab,
    interrupt,
    clearScreen,
    replaceSession,
    note,
    editor,
    closeEditor: () => setEditor(null),
    saveEditor,
    prompt: prompt(session),
  };
}

export type ShellController = ReturnType<typeof useShell>;
