/**
 * @linux-learn/engine — a pure TypeScript Linux shell simulator.
 * No React Native dependencies: runs in Node, browsers and Hermes.
 */
import type { ExecOptions, ExecResult, Session } from './types';
import { BINARY_NAMES, COMMANDS } from './commands';
import { buildMachine, createSession, type MachineSpec } from './machine';
import { executeLine } from './shell/interpreter';
import { complete as completeImpl, type Completion } from './complete';
import { explain as explainImpl, type Explanation } from './explain';
import { tildify } from './vfs/path';
import { Ctx } from './shell/context';
import { FsError } from './vfs/fs';

export * from './types';
export type { MachineSpec, FileSpec } from './machine';
export { SYSTEM_EPOCH, DEFAULT_USER, DEFAULT_HOST } from './machine';
import { DEFAULT_NETWORK, DEFAULT_SERVICES, DEFAULT_SYSTEM } from './machine';
export type { Check, CheckContext, CheckResult, CheckStatus, TaskEvaluation } from './checks';
export { evaluateCheck, evaluateChecks } from './checks';
export type { Completion } from './complete';
export type { Explanation, ExplainPart, ExplainKind } from './explain';
export type { CommandDef, CommandDoc } from './shell/context';
export { normalizeFlags } from './shell/args';
export { editDistance, suggest } from './util/levenshtein';
export { stripAnsi, humanSize } from './commands/util';
export { parseAnsi, type AnsiSpan, type AnsiStyle } from './ansi';
export { COMMANDS };
export { formatHelp, formatMan } from './shell/help';
export { normalize as normalizePath, tildify, expandTilde } from './vfs/path';

/** Create a fresh session from a machine spec (fixture). */
export function createShell(spec: MachineSpec = {}): Session {
  const machine = buildMachine(spec, { binaries: BINARY_NAMES });
  return createSession(machine, spec);
}

/** Execute one input line. Pure: returns a new session, never throws. */
export function run(session: Session, line: string, opts: ExecOptions = {}): ExecResult {
  return executeLine(session, line, { ...opts, registry: COMMANDS });
}

/** Run several lines in order (used by tests and content linting). */
export function runAll(session: Session, lines: string[], opts: ExecOptions = {}): { session: Session; results: ExecResult[] } {
  const results: ExecResult[] = [];
  let s = session;
  for (const line of lines) {
    const r = run(s, line, opts);
    results.push(r);
    s = r.session;
  }
  return { session: s, results };
}

export function complete(session: Session, line: string, cursor = line.length): Completion {
  return completeImpl(session, line, cursor, COMMANDS);
}

export function explain(line: string): Explanation {
  return explainImpl(line, COMMANDS);
}

export interface PromptParts {
  user: string;
  host: string;
  path: string;
  symbol: '$' | '#';
}

export function prompt(session: Session): PromptParts {
  const home = session.machine.users.find((u) => u.name === session.user)?.home ?? '/';
  return {
    user: session.user,
    host: session.machine.hostname,
    path: tildify(session.cwd, home),
    symbol: session.user === 'root' ? '#' : '$',
  };
}

export function promptString(session: Session): string {
  const p = prompt(session);
  return `${p.user}@${p.host}:${p.path}${p.symbol} `;
}

/**
 * Save a file from the editor (nano). Returns the new session, or an error
 * message (e.g. "Permission denied").
 */
export function saveFile(session: Session, absPath: string, content: string, now = Date.now()): { session: Session; error?: string } {
  let fs = session.machine.fs;
  const u = session.machine.users.find((x) => x.name === session.user);
  const ctx = new Ctx(
    'nano',
    [],
    null,
    session.machine,
    session.user,
    { name: session.user, groups: u?.groups ?? [], root: u?.uid === 0 },
    u?.home ?? '/',
    now,
    false,
    80,
    {
      getFs: () => fs,
      setFs: (v: typeof fs) => (fs = v),
      cwd: () => session.cwd,
    } as never,
  );
  try {
    ctx.writeFile(absPath, content);
  } catch (e) {
    if (e instanceof FsError) return { session, error: e.text };
    throw e;
  }
  return { session: { ...session, machine: { ...session.machine, fs } } };
}

/** All command names, for the in-app reference. */
export function commandList() {
  return [...COMMANDS.values()]
    .filter((c) => /^[a-z]/.test(c.name))
    .sort((a, b) => a.name.localeCompare(b.name));
}

/** Basic structural validation of a stored session (defensive load from storage). */
export function isSession(v: unknown): v is Session {
  if (typeof v !== 'object' || v === null) return false;
  const s = v as Record<string, unknown>;
  const m = s['machine'] as Record<string, unknown> | undefined;
  return (
    typeof s['user'] === 'string' &&
    typeof s['cwd'] === 'string' &&
    typeof s['env'] === 'object' &&
    Array.isArray(s['history']) &&
    !!m &&
    typeof m['hostname'] === 'string' &&
    typeof m['fs'] === 'object' &&
    (m['fs'] as Record<string, unknown>)?.['type'] === 'dir' &&
    Array.isArray(m['users'])
  );
}

/** Fill in fields added in later versions so old saved sessions keep working. */
export function migrateSession(s: Session): Session {
  return {
    ...s,
    locals: s.locals ?? {},
    aliases: s.aliases ?? {},
    userStack: s.userStack ?? [],
    lastExitCode: s.lastExitCode ?? 0,
    machine: {
      ...s.machine,
      processes: s.machine.processes ?? [],
      disks: s.machine.disks ?? [],
      network: s.machine.network ?? DEFAULT_NETWORK,
      services: s.machine.services ?? DEFAULT_SERVICES(s.machine.hostname),
      system: s.machine.system ?? DEFAULT_SYSTEM(s.user),
    },
  };
}
