import type { Session } from './types';
import { can, collate, resolve, R, type Cred } from './vfs/fs';
import { expandTilde, normalize } from './vfs/path';
import type { Registry } from './shell/interpreter';

export interface Completion {
  /** New full input line. */
  line: string;
  /** New cursor position. */
  cursor: number;
  /** All candidates when the completion is ambiguous (to show like bash on Tab Tab). */
  candidates: string[];
}

const DIR_ONLY = new Set(['cd', 'rmdir', 'pushd']);

function credOf(session: Session): Cred {
  const u = session.machine.users.find((x) => x.name === session.user);
  return { name: session.user, groups: u?.groups ?? [session.user], root: u?.uid === 0 };
}

function commonPrefix(xs: string[]): string {
  if (xs.length === 0) return '';
  let p = xs[0]!;
  for (const x of xs) while (!x.startsWith(p)) p = p.slice(0, -1);
  return p;
}

const escapeWord = (s: string) => s.replace(/([ \t'"\\$&;|<>()*?[\]!#`])/g, '\\$1');

export function complete(session: Session, line: string, cursor: number, registry: Registry): Completion {
  const before = line.slice(0, cursor);
  const after = line.slice(cursor);
  // find the start of the current word (unescaped whitespace or an operator)
  let start = before.length;
  while (start > 0) {
    const c = before[start - 1]!;
    const escaped = start >= 2 && before[start - 2] === '\\';
    if (!escaped && /[\s|;&<>(]/.test(c)) break;
    start--;
  }
  const rawWord = before.slice(start);
  const word = rawWord.replace(/\\(.)/g, '$1').replace(/^["']/, '');
  const head = before.slice(0, start);
  const segment = head.split(/\|\||&&|[|;&]/).pop() ?? '';
  const isCommandPosition = segment.trim() === '' || /^\s*sudo\s+$/.test(segment);
  const cmdName = segment.trim().split(/\s+/)[0] ?? '';

  const finish = (candidates: string[], isDir: (c: string) => boolean, display: (c: string) => string = (c) => c, esc: (c: string) => string = escapeWord): Completion => {
    if (candidates.length === 0) return { line, cursor, candidates: [] };
    if (candidates.length === 1) {
      const c = candidates[0]!;
      const suffix = isDir(c) ? '' : ' ';
      const replaced = head + esc(c) + suffix;
      const space = after.startsWith(' ') && suffix === ' ' ? '' : '';
      return { line: replaced + space + after, cursor: replaced.length, candidates: [] };
    }
    const prefix = commonPrefix(candidates);
    if (prefix.length > word.length) {
      const replaced = head + esc(prefix);
      return { line: replaced + after, cursor: replaced.length, candidates: [] };
    }
    return { line, cursor, candidates: candidates.map(display) };
  };

  if (isCommandPosition && !word.includes('/')) {
    const names = new Set([...registry.keys(), ...Object.keys(session.aliases)]);
    const cands = [...names].filter((n) => n.startsWith(word) && /^[a-z]/.test(n)).sort();
    return finish(cands, () => false);
  }

  if (word.startsWith('$') && !word.includes('/')) {
    const vars = [...new Set([...Object.keys(session.env), ...Object.keys(session.locals)])].map((v) => '$' + v);
    return finish(vars.filter((v) => v.startsWith(word)).sort(), () => false, (c) => c, (c) => c);
  }

  // path completion
  const home = session.env['HOME'] ?? '/';
  const slash = word.lastIndexOf('/');
  const dirPart = slash === -1 ? '' : word.slice(0, slash + 1);
  const prefix = slash === -1 ? word : word.slice(slash + 1);
  const dirAbs = normalize(expandTilde(dirPart === '' ? '.' : dirPart, home), session.cwd);
  const cred = credOf(session);
  let names: string[] = [];
  try {
    const { node } = resolve(session.machine.fs, dirAbs, cred, true);
    if (node.type === 'dir' && can(node, cred, R)) names = Object.keys(node.children);
  } catch {
    names = [];
  }
  const isDirAt = (name: string) => {
    try {
      return resolve(session.machine.fs, normalize(name, dirAbs), cred, true).node.type === 'dir';
    } catch {
      return false;
    }
  };
  let matches = names.filter((n) => n.startsWith(prefix) && (prefix.startsWith('.') || !n.startsWith('.')));
  if (DIR_ONLY.has(cmdName)) matches = matches.filter(isDirAt);
  matches.sort(collate);
  const full = matches.map((m) => dirPart + m + (isDirAt(m) ? '/' : ''));
  return finish(full, (c) => c.endsWith('/'), (c) => c.slice(dirPart.length));
}
