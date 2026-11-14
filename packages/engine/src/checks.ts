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
import { GITHUB_ROOT, gitAncestors, gitCurrentBranch, gitDbAt, gitHeadCommit, gitIgnoreMatcher, gitWorkTreeOf } from './commands/git';

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
  | { type: 'exitCode'; code: number }
  /** A docker container by name: running / exited / absent; optionally its image and a published host port. */
  | { type: 'containerState'; name: string; state: 'running' | 'exited' | 'absent'; image?: string; hostPort?: number; network?: string }
  /** A local docker image (repo or repo:tag) exists (or not). */
  | { type: 'imageExists'; name: string; exists?: boolean }
  /** Number of docker containers (all or only running). */
  | { type: 'containerCount'; eq?: number; max?: number; min?: number; running?: boolean }
  /**
   * A git repository at (or containing) `path`. Every given field must hold:
   * commits = at least N commits on HEAD; branch = this branch exists; head = current branch;
   * clean = nothing staged / modified / untracked; tracked = file is in the last commit;
   * staged = file differs between HEAD and the index; remote = remote exists;
   * pushed = the branch equals its remote-tracking branch (origin/<branch>);
   * message = regex for the last commit message; merged = branch is merged into HEAD;
   * merging = a merge with conflicts is in progress; tag = tag exists; ignored = path matches .gitignore.
   */
  | { type: 'git'; path: string; commits?: number; branch?: string; noBranch?: string; head?: string; clean?: boolean; tracked?: string; untracked?: string; staged?: string; remote?: string; pushed?: string; message?: string; merged?: string; merging?: boolean; tag?: string; ignored?: string }
  /** A repository on the simulated GitHub (OWNER/NAME or NAME of the student). */
  | { type: 'github'; repo: string; exists?: boolean; branch?: string; file?: string; commits?: number; prs?: number; merged?: number; issues?: number; tag?: string; release?: string; fileContains?: string };

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
    case 'containerState': {
      const c = s.machine.docker?.containers.find((x) => x.name === check.name);
      if (check.state === 'absent') return ok(!c);
      if (!c) return ok(false);
      const img = check.image ? (check.image.includes(':') ? check.image : `${check.image}:latest`) : null;
      return ok((c.state === check.state || (check.state === 'exited' && c.state === 'created')) && (!img || c.image === img) && (check.hostPort === undefined || c.ports.some((p) => p.host === check.hostPort)) && (check.network === undefined || [c.network ?? 'bridge', ...(c.extraNetworks ?? [])].includes(check.network)));
    }
    case 'imageExists': {
      const [repo, tag] = check.name.includes(':') ? check.name.split(':') : [check.name, undefined];
      const found = !!s.machine.docker?.images.some((i) => i.repo === repo && (tag === undefined || i.tag === tag));
      return ok(check.exists === false ? !found : found);
    }
    case 'git': {
      const root = p(check.path);
      const db = gitDbAt(s.machine.fs, root);
      if (!db || db.bare) return ok(false);
      const head = gitHeadCommit(db);
      const tree = head ? (db.commits[head]?.tree ?? {}) : {};
      const rel = (f: string) => {
        const a = p(f);
        // repo root: the directory that holds .git
        let r = root;
        while (r !== '/' && !lookup(s, `${r}/.git`)) r = r.slice(0, r.lastIndexOf('/')) || '/';
        return a.startsWith(r === '/' ? '/' : r + '/') ? a.slice(r === '/' ? 1 : r.length + 1) : f;
      };
      const repoRoot = (() => {
        let r = root;
        while (r !== '/' && !lookup(s, `${r}/.git`)) r = r.slice(0, r.lastIndexOf('/')) || '/';
        return r;
      })();
      const conds: boolean[] = [];
      if (check.commits !== undefined) conds.push(gitAncestors(db, head).size >= check.commits);
      if (check.branch !== undefined) conds.push(db.branches[check.branch] !== undefined || gitCurrentBranch(db) === check.branch);
      if (check.noBranch !== undefined) conds.push(db.branches[check.noBranch] === undefined);
      if (check.head !== undefined) conds.push(gitCurrentBranch(db) === check.head);
      if (check.tracked !== undefined) conds.push(rel(check.tracked) in tree);
      if (check.untracked !== undefined) conds.push(!(rel(check.untracked) in db.index));
      if (check.staged !== undefined) conds.push(db.index[rel(check.staged)] !== tree[rel(check.staged)]);
      if (check.remote !== undefined) conds.push(db.remotes[check.remote] !== undefined);
      if (check.tag !== undefined) conds.push(db.tags[check.tag] !== undefined);
      if (check.merging !== undefined) conds.push(!!db.merge === check.merging);
      if (check.pushed !== undefined) {
        const local = db.branches[check.pushed];
        const up = db.upstream[check.pushed];
        conds.push(!!local && db.tracking[`${up?.remote ?? 'origin'}/${up?.branch ?? check.pushed}`] === local);
      }
      if (check.merged !== undefined) {
        const b = db.branches[check.merged] ?? db.tracking[check.merged];
        conds.push(!!b && gitAncestors(db, head).has(b));
      }
      if (check.message !== undefined) {
        try {
          conds.push(!!head && new RegExp(check.message, 'i').test(db.commits[head]?.message ?? ''));
        } catch {
          conds.push(false);
        }
      }
      const work = check.clean !== undefined || check.ignored !== undefined ? gitWorkTreeOf(s.machine.fs, repoRoot) : {};
      if (check.ignored !== undefined) conds.push(gitIgnoreMatcher(work)(rel(check.ignored)));
      if (check.clean !== undefined) {
        const ign = gitIgnoreMatcher(work);
        const same = JSON.stringify(Object.entries(db.index).sort()) === JSON.stringify(Object.entries(tree).sort());
        const clean = same && !db.merge && Object.keys(db.index).every((f) => work[f] === db.index[f]) && Object.keys(work).every((f) => f in db.index || ign(f));
        conds.push(clean === check.clean);
      }
      return ok(conds.every(Boolean));
    }
    case 'github': {
      const user = s.userStack[0]?.user ?? s.user;
      const [owner, name] = check.repo.includes('/') ? check.repo.split('/') : [user, check.repo];
      const db = gitDbAt(s.machine.fs, `${GITHUB_ROOT}/${owner}/${name}.git`);
      if (check.exists === false) return ok(!db);
      if (!db) return ok(false);
      const main = 'branch' in db.head ? db.head.branch : 'main';
      const conds: boolean[] = [];
      if (check.branch !== undefined) conds.push(db.branches[check.branch] !== undefined);
      if (check.file !== undefined) conds.push(!!db.branches[main] && check.file in (db.commits[db.branches[main]!]?.tree ?? {}));
      if (check.commits !== undefined) conds.push(gitAncestors(db, db.branches[main]).size >= check.commits);
      if (check.prs !== undefined) conds.push((db.pulls ?? []).length >= check.prs);
      if (check.merged !== undefined) conds.push((db.pulls ?? []).filter((x) => x.state === 'MERGED').length >= check.merged);
      if (check.issues !== undefined) conds.push((db.issues ?? []).length >= check.issues);
      if (check.tag !== undefined) conds.push(db.tags[check.tag] !== undefined);
      if (check.release !== undefined) conds.push((db.releases ?? []).some((x) => x.tag === check.release));
      if (check.fileContains !== undefined && check.file !== undefined) conds.push((db.commits[db.branches[main] ?? '']?.tree[check.file] ?? '').includes(check.fileContains));
      return ok(conds.every(Boolean));
    }
    case 'containerCount': {
      const n = (s.machine.docker?.containers ?? []).filter((c) => !check.running || c.state === 'running').length;
      return ok((check.eq === undefined || n === check.eq) && (check.min === undefined || n >= check.min) && (check.max === undefined || n <= check.max));
    }
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
