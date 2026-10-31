import { createShell, run, type MachineSpec, type Session, type ExecResult } from '../src';

export const NOW = Date.UTC(2026, 9, 31, 12, 0, 0);

export interface Term {
  session: Session;
  /** run a line, return combined output */
  $(line: string): string;
  last: ExecResult;
  code: number;
}

export function term(spec: MachineSpec = {}, opts: { tty?: boolean; columns?: number } = {}): Term {
  const t: Term = {
    session: createShell({ now: NOW, ...spec }),
    last: undefined as unknown as ExecResult,
    code: 0,
    $(line: string) {
      const r = run(t.session, line, { now: NOW, isTTY: opts.tty ?? false, columns: opts.columns ?? 80 });
      t.session = r.session;
      t.last = r;
      t.code = r.exitCode;
      return r.output.map((o) => o.text).join('');
    },
  };
  return t;
}

export const basic: MachineSpec = {
  files: {
    '~/notes.txt': 'hello\nworld\n',
    '~/docs/': null,
    '~/docs/readme.md': '# Readme\n',
    '~/docs/todo.txt': 'buy milk\nfix bug\n',
  },
};
