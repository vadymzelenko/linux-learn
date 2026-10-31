/**
 * Task check DSL: a task is solved when every check passes. Checks look at the
 * resulting state of the machine (not at the exact command typed), so any
 * correct solution is accepted.
 */
import type { ExecutedCommand, FsNode, Session } from './types';
import { normalizeFlags } from './shell/args';
import { resolve, type Cred } from './vfs/fs';
import { expandTilde, normalize } from './vfs/path';
import { stripAnsi } from './commands/util';

export type Check =
  | { type: 'fileExists'; path: string }
  | { type: 'dirExists'; path: string }
  | { type: 'symlinkExists'; path: string; target?: string }
  | { type: 'notExists'; path: string }
  | { type: 'fileContains'; path: string; text?: string; regex?: string; flags?: string }
  | { type: 'fileEquals'; path: string; text: string }
  | { type: 'fileNotContains'; path: string; text?: string; regex?: string }
  | { type: 'cwdIs'; path: string }
  | { type: 'modeIs'; path: string; mode: string }
  | { type: 'ownerIs'; path: string; owner?: string; group?: string }
  | { type: 'dirEmpty'; path: string }
  | { type: 'countIn'; path: string; pattern?: string; min?: number; max?: number; eq?: number; fileType?: 'file' | 'dir' }
  | { type: 'usedCommand'; command: string; flags?: string[]; args?: string[]; success?: boolean }
  | { type: 'outputContains'; text?: string; regex?: string; flags?: string }
  | { type: 'outputLines'; eq?: number; min?: number; max?: number }
  | { type: 'varEquals'; name: string; value: string }
  | { type: 'aliasExists'; name: string; value?: string }
  | { type: 'userIs'; user: string }
  | { type: 'userExists'; name: string; group?: string; exists?: boolean }
  | { type: 'processGone'; pid?: number; name?: string }
  | { type: 'serviceState'; name: string; state: 'active' | 'inactive' | 'failed' }
  | { type: 'serviceEnabled'; name: string; enabled: boolean }
  | { type: 'exitCode'; code: number };

export interface CheckContext {
  session: Session;
  /** Every command executed since the task started (in order). */
  executed: ExecutedCommand[];
  /** Combined output of the last line entered (ANSI stripped by the checker). */
  lastOutput: string;
  lastExitCode: number;
}

export type CheckStatus = 'pass' | 'partial' | 'fail';

export interface CheckResult {
  status: CheckStatus;
  /** For partial usedCommand: flags that were missing. */
  missingFlags?: string[];
}

function rootCred(): Cred {
  return { name: 'root', groups: ['root'], root: true };
}

function lookup(session: Session, path: string, follow = true): FsNode | null {
  const home = session.machine.users.find((u) => u.name === session.user)?.home ?? session.env['HOME'] ?? '/';
  const abs = normalize(expandTilde(path, home), session.cwd);
  try {
    return resolve(session.machine.fs, abs, rootCred(), follow).node;
  } catch {
    return null;
  }
}

function absPath(session: Session, path: string): string {
  const home = session.machine.users.find((u) => u.name === session.user)?.home ?? '/';
  const studentHome = session.userStack[0] ? session.machine.users.find((u) => u.name === session.userStack[0]!.user)?.home : undefined;
  return normalize(expandTilde(path, studentHome ?? home), session.cwd);
}

function textMatch(content: string, c: { text?: string; regex?: string; flags?: string }): boolean {
  if (c.regex !== undefined) {
    try {
      return new RegExp(c.regex, c.flags ?? 'm').test(content);
    } catch {
      return false;
    }
  }
  return c.text !== undefined && content.includes(c.text);
}

export function evaluateCheck(check: Check, ctx: CheckContext): CheckResult {
  const s = ctx.session;
  const ok = (b: boolean): CheckResult => ({ status: b ? 'pass' : 'fail' });
  // paths in checks are relative to the *student's* home, even after `sudo -i`
  const p = (path: string) => absPath(s, path);
  switch (check.type) {
    case 'fileExists':
      return ok(lookup(s, p(check.path))?.type === 'file');
    case 'dirExists':
      return ok(lookup(s, p(check.path))?.type === 'dir');
    case 'symlinkExists': {
      const n = lookup(s, p(check.path), false);
      return ok(n?.type === 'symlink' && (check.target === undefined || n.target === check.target || normalize(n.target, p(check.path) + '/..') === p(check.target)));
    }
    case 'notExists':
      return ok(lookup(s, p(check.path), false) === null);
    case 'fileContains': {
      const n = lookup(s, p(check.path));
      return ok(n?.type === 'file' && textMatch(n.content, check));
    }
    case 'fileNotContains': {
      const n = lookup(s, p(check.path));
      return ok(n?.type === 'file' && !textMatch(n.content, check));
    }
    case 'fileEquals': {
      const n = lookup(s, p(check.path));
      return ok(n?.type === 'file' && n.content.trimEnd() === check.text.trimEnd());
    }
    case 'cwdIs':
      return ok(normalize(s.cwd) === p(check.path));
    case 'modeIs': {
      const n = lookup(s, p(check.path));
      return ok(!!n && (n.mode & 0o7777) === parseInt(check.mode, 8));
    }
    case 'ownerIs': {
      const n = lookup(s, p(check.path), false);
      return ok(!!n && (check.owner === undefined || n.owner === check.owner) && (check.group === undefined || n.group === check.group));
    }
    case 'dirEmpty': {
      const n = lookup(s, p(check.path));
      return ok(n?.type === 'dir' && Object.keys(n.children).length === 0);
    }
    case 'countIn': {
      const n = lookup(s, p(check.path));
      if (n?.type !== 'dir') return ok(false);
      let re: RegExp | null = null;
      if (check.pattern) re = new RegExp('^' + check.pattern.split('*').map((x) => x.replace(/[.+?^${}()|[\]\\]/g, '\\$&')).join('.*') + '$');
      const count = Object.values(n.children).filter((c) => (!re || re.test(c.name)) && (!check.fileType || c.type === check.fileType)).length;
      return ok((check.eq === undefined || count === check.eq) && (check.min === undefined || count >= check.min) && (check.max === undefined || count <= check.max));
    }
    case 'usedCommand': {
      const wanted = new Set((check.flags ?? []).flatMap((f) => (f.startsWith('--') ? [f] : [...f.replace(/^-/, '')].map((c) => '-' + c))));
      let partial: string[] | null = null;
      for (const e of ctx.executed) {
        const name = e.name.split('/').pop();
        if (name !== check.command) continue;
        if (check.success && e.exitCode !== 0) continue;
        const { flags, operands } = normalizeFlags(e.args);
        if (check.args && !check.args.every((a) => operands.includes(a))) continue;
        const missing = [...wanted].filter((f) => !flags.has(f));
        if (missing.length === 0) return { status: 'pass' };
        if (!partial || missing.length < partial.length) partial = missing;
      }
      return partial ? { status: 'partial', missingFlags: partial } : { status: 'fail' };
    }
    case 'outputContains':
      return ok(textMatch(stripAnsi(ctx.lastOutput), check));
    case 'outputLines': {
      const out = stripAnsi(ctx.lastOutput);
      const n = out === '' ? 0 : out.replace(/\n$/, '').split('\n').length;
      return ok((check.eq === undefined || n === check.eq) && (check.min === undefined || n >= check.min) && (check.max === undefined || n <= check.max));
    }
    case 'varEquals':
      return ok((s.locals[check.name] ?? s.env[check.name]) === check.value);
    case 'aliasExists':
      return ok(check.name in s.aliases && (check.value === undefined || s.aliases[check.name] === check.value));
    case 'userIs':
      return ok(s.user === check.user);
    case 'userExists': {
      const u = s.machine.users.find((x) => x.name === check.name);
      if (check.exists === false) return ok(!u);
      return ok(!!u && (check.group === undefined || u.groups.includes(check.group)));
    }
    case 'processGone':
      return ok(!s.machine.processes.some((pr) => (check.pid !== undefined && pr.pid === check.pid) || (check.name !== undefined && pr.command.includes(check.name))));
    case 'serviceState':
      return ok((s.machine.services ?? []).find((x) => x.name === check.name)?.state === check.state);
    case 'serviceEnabled':
      return ok((s.machine.services ?? []).find((x) => x.name === check.name)?.enabled === check.enabled);
    case 'exitCode':
      return ok(ctx.lastExitCode === check.code);
  }
}

export interface TaskEvaluation {
  results: CheckResult[];
  passed: boolean;
  /** Some checks only partially satisfied (e.g. the right command, missing a flag). */
  partial: boolean;
  progress: number;
}

export function evaluateChecks(checks: Check[], ctx: CheckContext): TaskEvaluation {
  const results = checks.map((c) => evaluateCheck(c, ctx));
  const passed = results.every((r) => r.status === 'pass');
  const partial = !passed && results.some((r) => r.status === 'partial');
  const progress = checks.length === 0 ? 1 : results.filter((r) => r.status === 'pass').length / checks.length;
  return { results, passed, partial, progress };
}
