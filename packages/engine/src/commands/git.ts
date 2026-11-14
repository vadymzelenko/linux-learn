/**
 * A simulated git (and a tiny GitHub CLI `gh`). A repository is a real
 * directory with a `.git` folder in the virtual file system: the history lives
 * in `.git/trainer.json` (full snapshots — repositories in lessons are tiny),
 * `.git/HEAD` and `.git/config` are kept in sync for curious `cat`s.
 *
 * "GitHub" repositories are bare repositories under /srv/github/OWNER/NAME.git,
 * reachable as https://github.com/OWNER/NAME(.git) or git@github.com:OWNER/NAME.git.
 * Output mimics git 2.43 and gh 2.45.
 */
import { Ctx, type CommandDef } from '../shell/context';
import { FsError, removeChild, resolve, resolveParent, type Cred } from '../vfs/fs';
import { basename, normalize } from '../vfs/path';
import type { DirNode, FsNode } from '../types';
import { diffOps } from './admin';

export const GIT_VERSION = '2.43.0';
export const GITHUB_ROOT = '/srv/github';
const DB = 'trainer.json';

// ------------------------------------------------------------------ model

export interface GitCommit {
  id: string;
  parents: string[];
  /** path (relative to the repo root) -> content */
  tree: Record<string, string>;
  message: string;
  author: string;
  email: string;
  time: number;
}

export interface PullRequest {
  number: number;
  title: string;
  body: string;
  head: string;
  base: string;
  state: 'OPEN' | 'MERGED' | 'CLOSED';
  author: string;
}

export interface Issue {
  number: number;
  title: string;
  body: string;
  state: 'OPEN' | 'CLOSED';
  author: string;
}

export interface GitDb {
  v: 1;
  bare: boolean;
  /** Current branch (may have no commits yet), or a detached commit. */
  head: { branch: string } | { detached: string };
  branches: Record<string, string>;
  commits: Record<string, GitCommit>;
  /** The staging area: a full snapshot of what the next commit will contain. */
  index: Record<string, string>;
  remotes: Record<string, string>;
  /** Remote-tracking branches: "origin/main" -> commit id. */
  tracking: Record<string, string>;
  upstream: Record<string, { remote: string; branch: string }>;
  config: Record<string, string>;
  tags: Record<string, string>;
  stash: { message: string; index: Record<string, string>; work: Record<string, string>; base: string }[];
  merge?: { theirs: string; name: string; conflicts: string[] };
  /** GitHub side (bare repositories only). */
  pulls?: PullRequest[];
  issues?: Issue[];
  releases?: { tag: string; title: string; notes: string; author: string; time: number }[];
  description?: string;
  visibility?: 'public' | 'private';
}

function emptyDb(bare: boolean, branch = 'main'): GitDb {
  return { v: 1, bare, head: { branch }, branches: {}, commits: {}, index: {}, remotes: {}, tracking: {}, upstream: {}, config: {}, tags: {}, stash: [] };
}

// ------------------------------------------------------------------ hashing / dates

function fnv(s: string, seed: number): string {
  let h = (0x811c9dc5 ^ seed) >>> 0;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, '0');
}

function commitId(c: Omit<GitCommit, 'id'>): string {
  const s = JSON.stringify([c.parents, c.tree, c.message, c.author, c.email, c.time]);
  return [1, 2, 3, 4, 5].map((k) => fnv(s, k * 0x9e3779b1)).join('');
}

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
function gitDate(ms: number): string {
  const d = new Date(ms);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${DAYS[d.getUTCDay()]} ${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()} ${p(d.getUTCHours())}:${p(d.getUTCMinutes())}:${p(d.getUTCSeconds())} ${d.getUTCFullYear()} +0000`;
}

const short = (id: string) => id.slice(0, 7);

// ------------------------------------------------------------------ colours

const ESC = '\x1b';
const paint = (ctx: Ctx, code: string, s: string) => (ctx.isTTY ? `${ESC}[${code}m${s}${ESC}[m` : s);
const red = (ctx: Ctx, s: string) => paint(ctx, '31', s);
const green = (ctx: Ctx, s: string) => paint(ctx, '32', s);
const yellow = (ctx: Ctx, s: string) => paint(ctx, '33', s);
const cyan = (ctx: Ctx, s: string) => paint(ctx, '1;36', s);

// ------------------------------------------------------------------ file system helpers

const ROOT_CRED: Cred = { name: 'root', groups: ['root'], root: true };

/** The same context, acting as root (the GitHub "server" ignores local permissions). */
function asRoot(ctx: Ctx): Ctx {
  return new Ctx(ctx.name, ctx.args, ctx.stdin, ctx.machine, 'root', ROOT_CRED, ctx.home, ctx.now, ctx.isTTY, ctx.columns, ctx.shell);
}

function node(ctx: Ctx, abs: string): FsNode | null {
  try {
    return resolve(ctx.fs, abs, ROOT_CRED, true).node;
  } catch {
    return null;
  }
}

function mkdirp(ctx: Ctx, abs: string): void {
  const segs = abs.split('/').filter(Boolean);
  let cur = '';
  for (const s of segs) {
    cur += '/' + s;
    const n = node(ctx, cur);
    if (!n) ctx.mkdir(cur);
    else if (n.type !== 'dir') throw new FsError('ENOTDIR', cur);
  }
}

function writeAt(ctx: Ctx, abs: string, content: string): void {
  const dir = abs.slice(0, abs.lastIndexOf('/')) || '/';
  mkdirp(ctx, dir);
  ctx.writeFile(abs, content);
}

function removeAt(ctx: Ctx, abs: string): void {
  const ref = resolveParent(ctx.fs, abs, ctx.cred);
  if (!ref.existing) return;
  ctx.fs = removeChild(ctx.fs, ref.parentCanon, ref.name, ctx.now);
  // drop directories left empty
  let dir = '/' + ref.parentCanon.join('/');
  while (dir.split('/').length > 2) {
    const n = node(ctx, dir);
    if (!n || n.type !== 'dir' || Object.keys(n.children).length) break;
    const r = resolveParent(ctx.fs, dir, ctx.cred);
    ctx.fs = removeChild(ctx.fs, r.parentCanon, r.name, ctx.now);
    dir = '/' + r.parentCanon.join('/');
  }
}

/** Files of a directory (recursively), relative paths, `.git` excluded. */
function readTree(ctx: Ctx, root: string): Record<string, string> {
  const out: Record<string, string> = {};
  const dir = node(ctx, root);
  if (!dir || dir.type !== 'dir') return out;
  const walk = (n: DirNode, prefix: string) => {
    for (const [name, child] of Object.entries(n.children)) {
      if (!prefix && name === '.git') continue;
      const rel = prefix ? `${prefix}/${name}` : name;
      if (child.type === 'dir') walk(child, rel);
      else if (child.type === 'file') out[rel] = child.content;
      else out[rel] = `→ ${child.target}`;
    }
  };
  walk(dir, '');
  return out;
}

// ------------------------------------------------------------------ repositories

interface Repo {
  /** Work tree root (for a bare repository: the repository directory itself). */
  root: string;
  gitDir: string;
  db: GitDb;
}

function readDb(ctx: Ctx, gitDir: string): GitDb | null {
  const n = node(ctx, `${gitDir}/${DB}`);
  if (!n || n.type !== 'file') return null;
  try {
    return JSON.parse(n.content) as GitDb;
  } catch {
    return null;
  }
}

function renderConfig(db: GitDb): string {
  let s = `[core]\n\trepositoryformatversion = 0\n\tfilemode = true\n\tbare = ${db.bare}\n`;
  for (const [name, url] of Object.entries(db.remotes)) s += `[remote "${name}"]\n\turl = ${url}\n\tfetch = +refs/heads/*:refs/remotes/${name}/*\n`;
  for (const [b, u] of Object.entries(db.upstream)) s += `[branch "${b}"]\n\tremote = ${u.remote}\n\tmerge = refs/heads/${u.branch}\n`;
  const sections: Record<string, string[]> = {};
  for (const [k, v] of Object.entries(db.config)) {
    const i = k.lastIndexOf('.');
    (sections[k.slice(0, i)] ??= []).push(`\t${k.slice(i + 1)} = ${v}`);
  }
  for (const [sec, lines] of Object.entries(sections)) s += `[${sec}]\n${lines.join('\n')}\n`;
  return s;
}

function saveDb(ctx: Ctx, repo: Repo): void {
  const c = repo.gitDir.startsWith(GITHUB_ROOT + '/') ? asRoot(ctx) : ctx;
  writeAt(c, `${repo.gitDir}/${DB}`, JSON.stringify(repo.db));
  const head = 'branch' in repo.db.head ? `ref: refs/heads/${repo.db.head.branch}\n` : `${repo.db.head.detached}\n`;
  writeAt(c, `${repo.gitDir}/HEAD`, head);
  writeAt(c, `${repo.gitDir}/config`, renderConfig(repo.db));
  if (ctx !== c) ctx.fs = c.fs;
}

/** The repository containing `dir` (walks up like git does). */
function findRepo(ctx: Ctx, dir: string): Repo | null {
  let cur = dir;
  for (;;) {
    const g = cur === '/' ? '/.git' : `${cur}/.git`;
    const db = readDb(ctx, g);
    if (db) return { root: cur, gitDir: g, db };
    const bare = readDb(ctx, cur);
    if (bare?.bare) return { root: cur, gitDir: cur, db: bare };
    if (cur === '/') return null;
    cur = cur.slice(0, cur.lastIndexOf('/')) || '/';
  }
}

function headCommit(db: GitDb): string | undefined {
  return 'branch' in db.head ? db.branches[db.head.branch] : db.head.detached;
}

function headTree(db: GitDb): Record<string, string> {
  const id = headCommit(db);
  return id ? (db.commits[id]?.tree ?? {}) : {};
}

function currentBranch(db: GitDb): string | null {
  return 'branch' in db.head ? db.head.branch : null;
}

/** All ancestors of a commit (including itself). */
function ancestors(db: GitDb, id: string | undefined): Set<string> {
  const seen = new Set<string>();
  const stack = id ? [id] : [];
  while (stack.length) {
    const c = stack.pop()!;
    if (seen.has(c) || !db.commits[c]) continue;
    seen.add(c);
    stack.push(...db.commits[c]!.parents);
  }
  return seen;
}

/** Commits reachable from id, newest first. */
function history(db: GitDb, ids: (string | undefined)[]): GitCommit[] {
  const seen = new Set<string>();
  for (const id of ids) for (const a of ancestors(db, id)) seen.add(a);
  return [...seen].map((id) => db.commits[id]!).sort((a, b) => b.time - a.time || (a.parents.includes(b.id) ? -1 : b.parents.includes(a.id) ? 1 : 0));
}

function mergeBase(db: GitDb, a: string, b: string): string | undefined {
  const anc = ancestors(db, a);
  // nearest common ancestor: walk b's history newest first
  return history(db, [b]).find((c) => anc.has(c.id))?.id;
}

/** HEAD, HEAD~2, HEAD^, main, origin/main, a tag or a (short) id. */
function revParse(db: GitDb, rev: string): string | undefined {
  const m = /^(.*?)((?:[~^]\d*)*)$/.exec(rev)!;
  let base = m[1]!;
  let id: string | undefined;
  if (base === 'HEAD' || base === '@' || base === '') id = headCommit(db);
  else if (db.branches[base] !== undefined) id = db.branches[base];
  else if (db.tracking[base] !== undefined) id = db.tracking[base];
  else if (db.tags[base] !== undefined) id = db.tags[base];
  else if (/^[0-9a-f]{4,40}$/.test(base)) {
    const found = Object.keys(db.commits).filter((k) => k.startsWith(base));
    if (found.length === 1) id = found[0];
  } else if (base.startsWith('refs/heads/')) id = db.branches[base.slice(11)];
  base = '';
  for (const op of m[2]!.match(/[~^]\d*/g) ?? []) {
    if (!id) return undefined;
    const n = op.length > 1 ? Number(op.slice(1)) : 1;
    if (op[0] === '~') for (let i = 0; i < n && id; i++) id = db.commits[id]?.parents[0];
    else id = n === 0 ? id : db.commits[id]?.parents[n - 1];
  }
  return id;
}

// ------------------------------------------------------------------ .gitignore

function ignoreMatcher(work: Record<string, string>): (path: string) => boolean {
  const rules = (work['.gitignore'] ?? '')
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith('#'));
  const res = rules.map((r) => {
    const neg = r.startsWith('!');
    let p = neg ? r.slice(1) : r;
    const dirOnly = p.endsWith('/');
    if (dirOnly) p = p.slice(0, -1);
    const anchored = p.includes('/');
    p = p.replace(/^\//, '');
    const re = p.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*\*/g, '\u0000').replace(/\*/g, '[^/]*').replace(/\?/g, '[^/]').replace(/\u0000/g, '.*');
    return { neg, rx: new RegExp(anchored ? `^${re}(/|$)` : `(^|/)${re}${dirOnly ? '/' : '(/|$)'}`) };
  });
  return (path) => {
    let ignored = false;
    for (const r of res) if (r.rx.test(path)) ignored = !r.neg;
    return ignored;
  };
}

// ------------------------------------------------------------------ status

interface Status {
  staged: { kind: 'new file' | 'modified' | 'deleted'; path: string }[];
  unstaged: { kind: 'modified' | 'deleted'; path: string }[];
  untracked: string[];
  conflicts: string[];
}

function computeStatus(ctx: Ctx, repo: Repo): Status {
  const db = repo.db;
  const head = headTree(db);
  const work = readTree(ctx, repo.root);
  const ignored = ignoreMatcher(work);
  const conflicts = db.merge?.conflicts ?? [];
  const staged: Status['staged'] = [];
  const unstaged: Status['unstaged'] = [];
  for (const p of [...new Set([...Object.keys(head), ...Object.keys(db.index)])].sort()) {
    if (conflicts.includes(p)) continue;
    if (!(p in head)) staged.push({ kind: 'new file', path: p });
    else if (!(p in db.index)) staged.push({ kind: 'deleted', path: p });
    else if (head[p] !== db.index[p]) staged.push({ kind: 'modified', path: p });
  }
  for (const p of Object.keys(db.index).sort()) {
    if (conflicts.includes(p)) continue;
    if (!(p in work)) unstaged.push({ kind: 'deleted', path: p });
    else if (work[p] !== db.index[p]) unstaged.push({ kind: 'modified', path: p });
  }
  const untrackedFiles = Object.keys(work).filter((p) => !(p in db.index) && !ignored(p) && !conflicts.includes(p));
  // collapse a directory that holds only untracked files into "dir/"
  const tracked = Object.keys(db.index);
  const untracked = new Set<string>();
  for (const p of untrackedFiles) {
    const segs = p.split('/');
    let shown = p;
    for (let i = 1; i < segs.length; i++) {
      const dir = segs.slice(0, i).join('/') + '/';
      if (!tracked.some((t) => t.startsWith(dir))) {
        shown = dir;
        break;
      }
    }
    untracked.add(shown);
  }
  return { staged, unstaged, untracked: [...untracked].sort(), conflicts: [...conflicts] };
}

/** A repo-relative path as git prints it from the current directory. */
function rel(ctx: Ctx, repo: Repo, p: string): string {
  const abs = repo.root === '/' ? `/${p}` : `${repo.root}/${p}`;
  const cwd = ctx.cwd;
  if (cwd === repo.root) return p;
  const a = abs.split('/').filter(Boolean);
  const c = cwd.split('/').filter(Boolean);
  let i = 0;
  while (i < a.length && i < c.length && a[i] === c[i]) i++;
  return [...Array(c.length - i).fill('..'), ...a.slice(i)].join('/') + (p.endsWith('/') ? '/' : '');
}

/** Turn command-line paths into repo-relative pathspecs. */
function pathspecs(ctx: Ctx, repo: Repo, args: string[]): string[] {
  return args.map((a) => {
    const abs = normalize(a, ctx.cwd);
    if (abs === repo.root) return '';
    return repo.root === '/' ? abs.slice(1) : abs.slice(repo.root.length + 1);
  });
}

const under = (path: string, spec: string) => spec === '' || path === spec || path.startsWith(spec.replace(/\/$/, '') + '/');

// ------------------------------------------------------------------ identity

function globalConfig(ctx: Ctx): Record<string, string> {
  const n = node(ctx, `${ctx.home}/.gitconfig`);
  const out: Record<string, string> = {};
  if (!n || n.type !== 'file') return out;
  let section = '';
  for (const line of n.content.split('\n')) {
    const s = /^\s*\[([^\]"\s]+)(?:\s+"([^"]*)")?\]/.exec(line);
    if (s) {
      section = s[2] !== undefined ? `${s[1]}.${s[2]}` : s[1]!;
      continue;
    }
    const kv = /^\s*([\w-]+)\s*=\s*(.*?)\s*$/.exec(line);
    if (kv && section) out[`${section}.${kv[1]}`.toLowerCase()] = kv[2]!;
  }
  return out;
}

function writeGlobalConfig(ctx: Ctx, cfg: Record<string, string>): void {
  const sections: Record<string, string[]> = {};
  for (const [k, v] of Object.entries(cfg)) {
    const i = k.lastIndexOf('.');
    (sections[k.slice(0, i)] ??= []).push(`\t${k.slice(i + 1)} = ${v}`);
  }
  ctx.writeFile(`${ctx.home}/.gitconfig`, Object.entries(sections).map(([s, l]) => `[${s}]\n${l.join('\n')}\n`).join(''));
}

function configValue(ctx: Ctx, repo: Repo | null, key: string, overrides: Record<string, string>): string | undefined {
  const k = key.toLowerCase();
  return overrides[k] ?? repo?.db.config[k] ?? globalConfig(ctx)[k];
}

// ------------------------------------------------------------------ remotes

/** Where a remote URL points to in the VFS. */
function remotePath(ctx: Ctx, url: string): string {
  const gh = /^(?:https:\/\/github\.com\/|git@github\.com:)([\w.-]+)\/([\w.-]+?)(?:\.git)?\/?$/.exec(url);
  if (gh) return `${GITHUB_ROOT}/${gh[1]}/${gh[2]}.git`;
  return normalize(url.replace(/^file:\/\//, ''), ctx.cwd);
}

function openRemote(ctx: Ctx, url: string): Repo | null {
  const p = remotePath(ctx, url);
  const db = readDb(ctx, p) ?? readDb(ctx, `${p}/.git`);
  if (!db) return null;
  return { root: p, gitDir: db.bare ? p : `${p}/.git`, db };
}

function notFound(ctx: Ctx, url: string): number {
  if (/github\.com/.test(url)) ctx.err(`remote: Repository not found.\nfatal: repository '${url.replace(/\/?$/, '/')}' not found\n`);
  else ctx.err(`fatal: '${url}' does not appear to be a git repository\nfatal: Could not read from remote repository.\n\nPlease make sure you have the correct access rights\nand the repository exists.\n`);
  return 128;
}

/** Copy every commit reachable from `id` from one database into another. */
function copyCommits(from: GitDb, to: GitDb, id: string | undefined): void {
  for (const c of ancestors(from, id)) if (!to.commits[c]) to.commits[c] = from.commits[c]!;
}

function remoteHeadBranch(db: GitDb): string {
  return 'branch' in db.head ? db.head.branch : 'main';
}

// ------------------------------------------------------------------ work tree updates

/** Replace tracked files of the work tree (old tree → new tree); untracked files stay. */
function checkoutTree(ctx: Ctx, repo: Repo, from: Record<string, string>, to: Record<string, string>): void {
  const abs = (p: string) => (repo.root === '/' ? `/${p}` : `${repo.root}/${p}`);
  for (const p of Object.keys(from)) if (!(p in to)) removeAt(ctx, abs(p));
  for (const [p, c] of Object.entries(to)) if (from[p] !== c || !node(ctx, abs(p))) writeAt(ctx, abs(p), c);
}

/** Files whose uncommitted changes a checkout would overwrite. */
function wouldOverwrite(ctx: Ctx, repo: Repo, target: Record<string, string>): string[] {
  const head = headTree(repo.db);
  const work = readTree(ctx, repo.root);
  const out: string[] = [];
  for (const p of new Set([...Object.keys(head), ...Object.keys(target)])) {
    if (head[p] === target[p]) continue;
    const dirtyIndex = repo.db.index[p] !== head[p];
    const dirtyWork = work[p] !== (repo.db.index[p] ?? undefined) && (p in work || p in repo.db.index);
    if ((dirtyIndex || dirtyWork) && work[p] !== target[p]) out.push(p);
    if (!(p in head) && !(p in repo.db.index) && p in work && work[p] !== target[p]) out.push(p);
  }
  return [...new Set(out)].sort();
}

// ------------------------------------------------------------------ diffs

function splitLines(s: string): string[] {
  if (s === '') return [];
  const l = s.split('\n');
  if (l[l.length - 1] === '') l.pop();
  return l;
}

function countChanges(a: string | undefined, b: string | undefined): { ins: number; del: number } {
  const ops = diffOps(splitLines(a ?? ''), splitLines(b ?? ''), (x, y) => x === y);
  return { ins: ops.filter((o) => o.t === '+').length, del: ops.filter((o) => o.t === '-').length };
}

function unified(ctx: Ctx, path: string, a: string | undefined, b: string | undefined): string {
  const ops = diffOps(splitLines(a ?? ''), splitLines(b ?? ''), (x, y) => x === y);
  if (!ops.some((o) => o.t !== ' ')) return '';
  let head = paint(ctx, '1', `diff --git a/${path} b/${path}`) + '\n';
  if (a === undefined) head += paint(ctx, '1', 'new file mode 100644') + '\n';
  if (b === undefined) head += paint(ctx, '1', 'deleted file mode 100644') + '\n';
  head += paint(ctx, '1', `--- ${a === undefined ? '/dev/null' : `a/${path}`}`) + '\n' + paint(ctx, '1', `+++ ${b === undefined ? '/dev/null' : `b/${path}`}`) + '\n';
  // hunks with 3 lines of context
  const C = 3;
  let out = '';
  let i = 0;
  let ln1 = 1;
  let ln2 = 1;
  const pos: { o: (typeof ops)[number]; a: number; b: number }[] = ops.map((o) => {
    const r = { o, a: ln1, b: ln2 };
    if (o.t !== '+') ln1++;
    if (o.t !== '-') ln2++;
    return r;
  });
  while (i < pos.length) {
    if (pos[i]!.o.t === ' ') {
      i++;
      continue;
    }
    let start = Math.max(0, i - C);
    let end = i;
    // extend while changes are close together
    for (let j = i; j < pos.length; j++) {
      if (pos[j]!.o.t !== ' ') end = j;
      else if (j - end > C * 2) break;
    }
    const stop = Math.min(pos.length, end + C + 1);
    const chunk = pos.slice(start, stop);
    const aLen = chunk.filter((x) => x.o.t !== '+').length;
    const bLen = chunk.filter((x) => x.o.t !== '-').length;
    const aStart = aLen ? chunk.find((x) => x.o.t !== '+')!.a : chunk[0]!.a - 1;
    const bStart = bLen ? chunk.find((x) => x.o.t !== '-')!.b : chunk[0]!.b - 1;
    const r = (s: number, n: number) => (n === 1 ? `${s}` : `${s},${n}`);
    out += cyan(ctx, `@@ -${r(aStart, aLen)} +${r(bStart, bLen)} @@`) + '\n';
    for (const x of chunk) out += x.o.t === '+' ? green(ctx, `+${x.o.s}`) + '\n' : x.o.t === '-' ? red(ctx, `-${x.o.s}`) + '\n' : ` ${x.o.s}\n`;
    i = stop;
    start = stop;
  }
  return head + out;
}

function treeDiff(ctx: Ctx, a: Record<string, string>, b: Record<string, string>, specs: string[] = []): string {
  let out = '';
  for (const p of [...new Set([...Object.keys(a), ...Object.keys(b)])].sort()) {
    if (specs.length && !specs.some((s) => under(p, s))) continue;
    if (a[p] !== b[p]) out += unified(ctx, p, a[p], b[p]);
  }
  return out;
}

/** " 2 files changed, 3 insertions(+), 1 deletion(-)" + per-file lines. */
function diffStat(ctx: Ctx, a: Record<string, string>, b: Record<string, string>, withFiles: boolean): string {
  const files = [...new Set([...Object.keys(a), ...Object.keys(b)])].filter((p) => a[p] !== b[p]).sort();
  if (!files.length) return '';
  let ins = 0;
  let del = 0;
  let lines = '';
  const w = Math.max(...files.map((f) => f.length));
  for (const f of files) {
    const c = countChanges(a[f], b[f]);
    ins += c.ins;
    del += c.del;
    if (withFiles) lines += ` ${f.padEnd(w)} | ${String(c.ins + c.del).padStart(2)} ${green(ctx, '+'.repeat(Math.min(c.ins, 40)))}${red(ctx, '-'.repeat(Math.min(c.del, 40)))}\n`;
  }
  const parts = [`${files.length} file${files.length === 1 ? '' : 's'} changed`];
  if (ins || !del) parts.push(`${ins} insertion${ins === 1 ? '' : 's'}(+)`);
  if (del) parts.push(`${del} deletion${del === 1 ? '' : 's'}(-)`);
  let modes = '';
  for (const f of files) {
    if (!(f in a)) modes += ` create mode 100644 ${f}\n`;
    else if (!(f in b)) modes += ` delete mode 100644 ${f}\n`;
  }
  return lines + ' ' + parts.join(', ') + '\n' + modes;
}

// ------------------------------------------------------------------ merging

/** Three-way merge of one file; null = conflict (markers are returned in `text`). */
function merge3(base: string | undefined, ours: string | undefined, theirs: string | undefined, theirName: string): { text: string | undefined; conflict: boolean } {
  if (ours === theirs) return { text: ours, conflict: false };
  if (base === ours) return { text: theirs, conflict: false };
  if (base === theirs) return { text: ours, conflict: false };
  // both changed: try to combine changes in different places of the file
  const b = splitLines(base ?? '');
  const o = splitLines(ours ?? '');
  const t = splitLines(theirs ?? '');
  if (b.length === o.length && b.length === t.length) {
    const res: string[] = [];
    let clash = false;
    for (let i = 0; i < b.length; i++) {
      if (o[i] === t[i]) res.push(o[i]!);
      else if (o[i] === b[i]) res.push(t[i]!);
      else if (t[i] === b[i]) res.push(o[i]!);
      else clash = true;
    }
    if (!clash) return { text: res.join('\n') + '\n', conflict: false };
  }
  // conflict markers around the differing middle part
  let pre = 0;
  while (pre < o.length && pre < t.length && o[pre] === t[pre]) pre++;
  let suf = 0;
  while (suf < o.length - pre && suf < t.length - pre && o[o.length - 1 - suf] === t[t.length - 1 - suf]) suf++;
  const lines = [...o.slice(0, pre), '<<<<<<< HEAD', ...o.slice(pre, o.length - suf), '=======', ...t.slice(pre, t.length - suf), `>>>>>>> ${theirName}`, ...o.slice(o.length - suf)];
  return { text: lines.join('\n') + '\n', conflict: true };
}

// ------------------------------------------------------------------ the git command

interface Opts {
  repo: Repo | null;
  overrides: Record<string, string>;
}

function needRepo(ctx: Ctx, o: Opts): Repo | null {
  if (o.repo && !o.repo.db.bare) return o.repo;
  if (o.repo?.db.bare) ctx.err('fatal: this operation must be run in a work tree\n');
  else ctx.err('fatal: not a git repository (or any of the parent directories): .git\n');
  return null;
}

function flagsOf(args: string[]): { flags: Set<string>; values: Record<string, string>; rest: string[] } {
  const flags = new Set<string>();
  const values: Record<string, string> = {};
  const rest: string[] = [];
  const withValue = new Set(['-m', '--message', '-n', '-b', '-B', '-c', '-C', '--max-count', '--branch', '--set-upstream-to', '--author', '--grep', '--format', '--pretty', '-d', '-D', '-M']);
  let i = 0;
  let dashdash = false;
  while (i < args.length) {
    const a = args[i]!;
    if (dashdash) rest.push(a);
    else if (a === '--') {
      dashdash = true;
      flags.add('--');
    } else if (/^--[\w-]+=/.test(a)) values[a.slice(0, a.indexOf('='))] = a.slice(a.indexOf('=') + 1);
    else if (/^-\d+$/.test(a)) values['-n'] = a.slice(1);
    else if (a.startsWith('-') && a.length > 1) {
      if (withValue.has(a) && i + 1 < args.length) {
        if (values[a] !== undefined && a === '-m') values[a] += '\n\n' + args[i + 1]!;
        else values[a] = args[i + 1]!;
        i++;
      } else if (/^-[a-zA-Z]{2,}$/.test(a)) {
        // combined short flags: -am "msg"
        for (const ch of a.slice(1)) flags.add('-' + ch);
        const last = '-' + a[a.length - 1];
        if (withValue.has(last) && i + 1 < args.length) {
          values[last] = args[i + 1]!;
          flags.delete(last);
          i++;
        }
      } else flags.add(a);
    } else rest.push(a);
    i++;
  }
  return { flags, values, rest };
}

function commitNow(ctx: Ctx, repo: Repo, o: Opts, message: string, parents: string[], tree: Record<string, string>): GitCommit | null {
  const name = configValue(ctx, repo, 'user.name', o.overrides);
  const email = configValue(ctx, repo, 'user.email', o.overrides);
  if (!name || !email) {
    ctx.err(
      `Author identity unknown\n\n*** Please tell me who you are.\n\nRun\n\n  git config --global user.email "you@example.com"\n  git config --global user.name "Your Name"\n\nto set your account's default identity.\nOmit --global to set the identity only in this repository.\n\nfatal: unable to auto-detect email address (got '${ctx.user}@${ctx.machine.hostname}.(none)')\n`,
    );
    return null;
  }
  // later commits get later times, even inside one simulated second
  const last = Math.max(0, ...Object.values(repo.db.commits).map((c) => c.time));
  const time = Math.max(ctx.now, last + 60_000);
  const data = { parents, tree, message, author: name, email, time };
  const c = { id: commitId(data), ...data };
  repo.db.commits[c.id] = c;
  if ('branch' in repo.db.head) repo.db.branches[repo.db.head.branch] = c.id;
  else repo.db.head = { detached: c.id };
  return c;
}

function decorations(ctx: Ctx, db: GitDb, id: string): string {
  const d: string[] = [];
  const cur = currentBranch(db);
  if (headCommit(db) === id) d.push(cur ? `${cyan(ctx, 'HEAD ->')} ${green(ctx, cur)}` : cyan(ctx, 'HEAD'));
  for (const [b, c] of Object.entries(db.branches)) if (c === id && b !== cur) d.push(green(ctx, b));
  for (const [b, c] of Object.entries(db.tracking)) if (c === id) d.push(red(ctx, b));
  for (const [t, c] of Object.entries(db.tags)) if (c === id) d.push(yellow(ctx, `tag: ${t}`));
  return d.length ? ` ${yellow(ctx, '(')}${d.join(yellow(ctx, ', '))}${yellow(ctx, ')')}` : '';
}

function subject(m: string): string {
  return m.split('\n')[0]!;
}

const GIT_USAGE = `usage: git [--version] [--help] [-C <path>] [-c <name>=<value>] <command> [<args>]

These are common Git commands used in various situations:

start a working area
   clone     Clone a repository into a new directory
   init      Create an empty Git repository or reinitialize an existing one

work on the current change
   add       Add file contents to the index
   mv        Move or rename a file, a directory, or a symlink
   restore   Restore working tree files
   rm        Remove files from the working tree and from the index

examine the history and state
   diff      Show changes between commits, commit and working tree, etc
   log       Show commit logs
   show      Show various types of objects
   status    Show the working tree status

grow, mark and tweak your common history
   branch    List, create, or delete branches
   commit    Record changes to the repository
   merge     Join two or more development histories together
   reset     Reset current HEAD to the specified state
   revert    Revert some existing commits
   switch    Switch branches
   tag       Create, list, delete or verify a tag object

collaborate
   fetch     Download objects and refs from another repository
   pull      Fetch from and integrate with another repository or a local branch
   push      Update remote refs along with associated objects
   remote    Manage set of tracked repositories
`;

type Sub = (ctx: Ctx, args: string[], o: Opts) => number;

const sub: Record<string, Sub> = {
  init(ctx, args) {
    const { flags, values, rest } = flagsOf(args);
    const dir = normalize(rest[0] ?? '.', ctx.cwd);
    const bare = flags.has('--bare');
    const branch = values['-b'] ?? values['--initial-branch'] ?? 'main';
    const gitDir = bare ? dir : `${dir}/.git`;
    const c = dir.startsWith(GITHUB_ROOT + '/') ? asRoot(ctx) : ctx;
    try {
      mkdirp(c, dir);
      const existing = readDb(c, gitDir);
      if (existing) {
        ctx.out(`Reinitialized existing Git repository in ${gitDir}/\n`);
        return 0;
      }
      for (const d of ['objects', 'refs/heads', 'refs/tags', 'hooks', 'info']) mkdirp(c, `${gitDir}/${d}`);
      writeAt(c, `${gitDir}/description`, "Unnamed repository; edit this file 'description' to name the repository.\n");
      const repo = { root: dir, gitDir, db: emptyDb(bare, branch) };
      saveDb(c, repo);
      if (c !== ctx) ctx.fs = c.fs;
    } catch (e) {
      if (e instanceof FsError) {
        ctx.err(`fatal: cannot mkdir ${rest[0] ?? '.'}: ${e.code === 'EACCES' ? 'Permission denied' : 'No such file or directory'}\n`);
        return 128;
      }
      throw e;
    }
    ctx.out(`Initialized empty Git repository in ${gitDir}/\n`);
    return 0;
  },

  config(ctx, args, o) {
    const { flags, rest } = flagsOf(args);
    const global = flags.has('--global');
    if (flags.has('--list') || flags.has('-l')) {
      const g = globalConfig(ctx);
      const local = global ? {} : (o.repo?.db.config ?? {});
      for (const [k, v] of Object.entries(g)) ctx.out(`${k}=${v}\n`);
      if (!global && o.repo) ctx.out(`core.repositoryformatversion=0\ncore.bare=${o.repo.db.bare}\n`);
      for (const [k, v] of Object.entries(local)) ctx.out(`${k}=${v}\n`);
      if (!global && o.repo) for (const [n, url] of Object.entries(o.repo.db.remotes)) ctx.out(`remote.${n}.url=${url}\n`);
      return 0;
    }
    const [key, ...vals] = rest;
    if (!key || !key.includes('.')) {
      ctx.err(key ? `error: key does not contain a section: ${key}\n` : 'usage: git config [<options>]\n');
      return key ? 1 : 129;
    }
    const k = key.toLowerCase();
    if (flags.has('--unset')) {
      if (global) {
        const g = globalConfig(ctx);
        delete g[k];
        writeGlobalConfig(ctx, g);
      } else if (o.repo) {
        delete o.repo.db.config[k];
        saveDb(ctx, o.repo);
      }
      return 0;
    }
    if (!vals.length) {
      const v = global ? globalConfig(ctx)[k] : configValue(ctx, o.repo, k, {});
      if (v === undefined) return 1;
      ctx.out(v + '\n');
      return 0;
    }
    const value = vals.join(' ');
    if (global) {
      writeGlobalConfig(ctx, { ...globalConfig(ctx), [k]: value });
      return 0;
    }
    if (!o.repo) {
      ctx.err('fatal: not in a git directory\n');
      return 128;
    }
    o.repo.db.config[k] = value;
    saveDb(ctx, o.repo);
    return 0;
  },

  status(ctx, args, o) {
    const repo = needRepo(ctx, o);
    if (!repo) return 128;
    const { flags } = flagsOf(args);
    const st = computeStatus(ctx, repo);
    const db = repo.db;
    if (flags.has('-s') || flags.has('--short')) {
      const lines = new Map<string, [string, string]>();
      for (const s of st.staged) lines.set(s.path, [s.kind === 'new file' ? 'A' : s.kind === 'deleted' ? 'D' : 'M', ' ']);
      for (const s of st.unstaged) {
        const cur = lines.get(s.path) ?? [' ', ' '];
        lines.set(s.path, [cur[0], s.kind === 'deleted' ? 'D' : 'M']);
      }
      const out: string[] = [];
      for (const c of st.conflicts) out.push(`${red(ctx, 'UU')} ${rel(ctx, repo, c)}`);
      for (const [p, [x, y]] of [...lines.entries()].sort(([a], [b]) => (a < b ? -1 : 1))) out.push(`${green(ctx, x)}${red(ctx, y)} ${rel(ctx, repo, p)}`);
      for (const u of st.untracked) out.push(`${red(ctx, '??')} ${rel(ctx, repo, u)}`);
      if (out.length) ctx.out(out.join('\n') + '\n');
      return 0;
    }
    const branch = currentBranch(db);
    let s = branch ? `On branch ${branch}\n` : `${red(ctx, 'HEAD detached at')} ${short(headCommit(db) ?? '')}\n`;
    const up = branch ? db.upstream[branch] : undefined;
    if (up && headCommit(db)) {
      const trk = `${up.remote}/${up.branch}`;
      const remoteId = db.tracking[trk];
      if (!remoteId) s += `Your branch is based on '${trk}', but the upstream is gone.\n  (use "git branch --unset-upstream" to fixup)\n`;
      else {
        const mine = ancestors(db, headCommit(db));
        const theirs = ancestors(db, remoteId);
        const ahead = [...mine].filter((x) => !theirs.has(x)).length;
        const behind = [...theirs].filter((x) => !mine.has(x)).length;
        if (!ahead && !behind) s += `Your branch is up to date with '${trk}'.\n`;
        else if (ahead && !behind) s += `Your branch is ahead of '${trk}' by ${ahead} commit${ahead > 1 ? 's' : ''}.\n  (use "git push" to publish your local commits)\n`;
        else if (behind && !ahead) s += `Your branch is behind '${trk}' by ${behind} commit${behind > 1 ? 's' : ''}, and can be fast-forwarded.\n  (use "git pull" to update your local branch)\n`;
        else s += `Your branch and '${trk}' have diverged,\nand have ${ahead} and ${behind} different commits each, respectively.\n  (use "git pull" if you want to integrate the remote branch with yours)\n`;
      }
    }
    if (!headCommit(db)) s += '\nNo commits yet\n';
    if (db.merge) {
      s += st.conflicts.length
        ? '\nYou have unmerged paths.\n  (fix conflicts and run "git commit")\n  (use "git merge --abort" to abort the merge)\n'
        : '\nAll conflicts fixed but you are still merging.\n  (use "git commit" to conclude merge)\n';
    }
    const pad = (k: string) => (k + ':').padEnd(12);
    if (st.staged.length) {
      s += `\nChanges to be committed:\n  (use "git ${headCommit(db) ? 'restore --staged' : 'rm --cached'} <file>..." to unstage)\n`;
      for (const x of st.staged) s += `\t${green(ctx, pad(x.kind) + rel(ctx, repo, x.path))}\n`;
    }
    if (st.conflicts.length) {
      s += '\nUnmerged paths:\n  (use "git add <file>..." to mark resolution)\n';
      for (const c of st.conflicts) s += `\t${red(ctx, 'both modified:   ' + rel(ctx, repo, c))}\n`;
    }
    if (st.unstaged.length) {
      s += `\nChanges not staged for commit:\n  (use "git add${st.unstaged.some((x) => x.kind === 'deleted') ? '/rm' : ''} <file>..." to update what will be committed)\n  (use "git restore <file>..." to discard changes in working directory)\n`;
      for (const x of st.unstaged) s += `\t${red(ctx, pad(x.kind) + rel(ctx, repo, x.path))}\n`;
    }
    if (st.untracked.length) {
      s += '\nUntracked files:\n  (use "git add <file>..." to include in what will be committed)\n';
      for (const u of st.untracked) s += `\t${red(ctx, rel(ctx, repo, u))}\n`;
    }
    if (!st.staged.length && !db.merge) {
      if (st.unstaged.length) s += '\nno changes added to commit (use "git add" and/or "git commit -a")\n';
      else if (st.untracked.length) s += `\nnothing added to commit but untracked files present (use "git add" to track)\n`;
      else if (!headCommit(db)) s += '\nnothing to commit (create/copy files and use "git add" to track)\n';
      else s += 'nothing to commit, working tree clean\n';
    }
    ctx.out(s);
    return 0;
  },

  add(ctx, args, o) {
    const repo = needRepo(ctx, o);
    if (!repo) return 128;
    const { flags, rest } = flagsOf(args);
    const all = flags.has('-A') || flags.has('--all');
    if (!rest.length && !all) {
      ctx.err('Nothing specified, nothing added.\nhint: Maybe you wanted to say \'git add .\'?\n');
      return 0;
    }
    const work = readTree(ctx, repo.root);
    const ignored = ignoreMatcher(work);
    const specs = all ? [''] : pathspecs(ctx, repo, rest);
    const db = repo.db;
    const ignoredHit: string[] = [];
    for (const [i, spec] of specs.entries()) {
      const glob = !all && /[*?[]/.test(rest[i]!) ? new RegExp('^' + spec.replace(/[.+^${}()|\\]/g, '\\$&').replace(/\*/g, '.*').replace(/\?/g, '.') + '$') : null;
      const match = (p: string) => (glob ? glob.test(p) : under(p, spec));
      const hits = [...new Set([...Object.keys(work), ...Object.keys(db.index)])].filter(match);
      if (!hits.length) {
        ctx.err(`fatal: pathspec '${rest[i]}' did not match any files\n`);
        return 128;
      }
      for (const p of hits) {
        if (p in work) {
          if (!(p in db.index) && ignored(p)) {
            if (spec === p) ignoredHit.push(p);
            continue;
          }
          db.index[p] = work[p]!;
        } else delete db.index[p];
        if (db.merge) db.merge.conflicts = db.merge.conflicts.filter((c) => c !== p);
      }
    }
    saveDb(ctx, repo);
    if (ignoredHit.length) {
      ctx.err(`The following paths are ignored by one of your .gitignore files:\n${ignoredHit.join('\n')}\nhint: Use -f if you really want to add them.\n`);
      return 1;
    }
    return 0;
  },

  rm(ctx, args, o) {
    const repo = needRepo(ctx, o);
    if (!repo) return 128;
    const { flags, rest } = flagsOf(args);
    const cached = flags.has('--cached');
    const recursive = flags.has('-r');
    const db = repo.db;
    for (const [i, spec] of pathspecs(ctx, repo, rest).entries()) {
      const hits = Object.keys(db.index).filter((p) => (recursive ? under(p, spec) : p === spec));
      if (!hits.length) {
        ctx.err(Object.keys(db.index).some((p) => under(p, spec)) ? `fatal: not removing '${rest[i]}' recursively without -r\n` : `fatal: pathspec '${rest[i]}' did not match any files\n`);
        return 128;
      }
      for (const p of hits) {
        delete db.index[p];
        if (!cached) removeAt(ctx, repo.root === '/' ? `/${p}` : `${repo.root}/${p}`);
        ctx.out(`rm '${p}'\n`);
      }
    }
    saveDb(ctx, repo);
    return 0;
  },

  mv(ctx, args, o) {
    const repo = needRepo(ctx, o);
    if (!repo) return 128;
    const { rest } = flagsOf(args);
    if (rest.length !== 2) {
      ctx.err('usage: git mv [<options>] <source>... <destination>\n');
      return 129;
    }
    const [from, to] = pathspecs(ctx, repo, rest) as [string, string];
    if (!(from in repo.db.index)) {
      ctx.err(`fatal: not under version control, source=${from}, destination=${to}\n`);
      return 128;
    }
    const r = ctx.shell.run(['mv', rest[0]!, rest[1]!], null);
    if (r.code) {
      ctx.forward(r.chunks);
      return 128;
    }
    const work = readTree(ctx, repo.root);
    const target = to in work ? to : `${to}/${basename(from)}`;
    repo.db.index[target] = repo.db.index[from]!;
    delete repo.db.index[from];
    saveDb(ctx, repo);
    return 0;
  },

  restore(ctx, args, o) {
    const repo = needRepo(ctx, o);
    if (!repo) return 128;
    const { flags, values, rest } = flagsOf(args);
    const staged = flags.has('--staged') || flags.has('-S');
    const source = values['--source'] ?? values['-s'];
    const specs = pathspecs(ctx, repo, rest);
    if (!rest.length) {
      ctx.err('fatal: you must specify path(s) to restore\n');
      return 128;
    }
    const db = repo.db;
    const head = source ? (db.commits[revParse(db, source) ?? '']?.tree ?? {}) : headTree(db);
    for (const [i, spec] of specs.entries()) {
      const pool = staged ? [...new Set([...Object.keys(db.index), ...Object.keys(head)])] : Object.keys(source ? head : db.index);
      const hits = pool.filter((p) => under(p, spec));
      if (!hits.length) {
        ctx.err(`error: pathspec '${rest[i]}' did not match any file(s) known to git\n`);
        return 1;
      }
      for (const p of hits) {
        if (staged) {
          if (p in head) db.index[p] = head[p]!;
          else delete db.index[p];
        } else {
          const content = source ? head[p] : db.index[p];
          const abs = repo.root === '/' ? `/${p}` : `${repo.root}/${p}`;
          if (content === undefined) removeAt(ctx, abs);
          else writeAt(ctx, abs, content);
        }
      }
    }
    saveDb(ctx, repo);
    return 0;
  },

  commit(ctx, args, o) {
    const repo = needRepo(ctx, o);
    if (!repo) return 128;
    const { flags, values } = flagsOf(args);
    const db = repo.db;
    if (flags.has('-a') || flags.has('--all')) {
      const work = readTree(ctx, repo.root);
      for (const p of Object.keys(db.index)) {
        if (p in work) db.index[p] = work[p]!;
        else delete db.index[p];
      }
    }
    if (db.merge?.conflicts.length) {
      ctx.err(`error: Committing is not possible because you have unmerged files.\nhint: Fix them up in the work tree, and then use 'git add/rm <file>'\nhint: as appropriate to mark resolution and make a commit.\nfatal: Exiting because of an unresolved conflict.\n`);
      return 128;
    }
    const amend = flags.has('--amend');
    const parentId = headCommit(db);
    const prev = parentId ? db.commits[parentId] : undefined;
    let message = values['-m'] ?? values['--message'];
    if (message === undefined && db.merge) message = `Merge branch '${db.merge.name}'`;
    if (message === undefined && amend && prev && flags.has('--no-edit')) message = prev.message;
    if (message === undefined) {
      ctx.err('error: there is no text editor for commit messages in the trainer\nhint: write the message right in the command: git commit -m "What changed"\nAborting commit due to empty commit message.\n');
      return 1;
    }
    if (!message.trim()) {
      ctx.err('Aborting commit due to empty commit message.\n');
      return 1;
    }
    const st = computeStatus(ctx, repo);
    const base = amend ? (prev?.parents[0] ? db.commits[prev.parents[0]]?.tree : {}) : headTree(db);
    const changed = JSON.stringify(db.index) !== JSON.stringify(base ?? {});
    if (!changed && !db.merge && !amend) {
      const branch = currentBranch(db);
      let s = branch ? `On branch ${branch}\n` : '';
      if (st.unstaged.length) {
        s += 'Changes not staged for commit:\n';
        for (const x of st.unstaged) s += `\t${(x.kind + ':').padEnd(12)}${rel(ctx, repo, x.path)}\n`;
        s += '\nno changes added to commit (use "git add" and/or "git commit -a")\n';
      } else if (st.untracked.length) {
        s += 'Untracked files:\n';
        for (const u of st.untracked) s += `\t${rel(ctx, repo, u)}\n`;
        s += '\nnothing added to commit but untracked files present (use "git add" to track)\n';
      } else s += headCommit(db) ? 'nothing to commit, working tree clean\n' : '\nInitial commit\n\nnothing to commit (create/copy files and use "git add" to track)\n';
      ctx.out(s);
      return 1;
    }
    const parents = amend ? (prev?.parents ?? []) : db.merge ? [parentId!, db.merge.theirs] : parentId ? [parentId] : [];
    const c = commitNow(ctx, repo, o, message, parents, { ...db.index });
    if (!c) return 128;
    delete db.merge;
    saveDb(ctx, repo);
    const branch = currentBranch(db) ?? 'detached HEAD';
    ctx.out(`[${branch}${parents.length ? '' : ' (root-commit)'} ${short(c.id)}] ${subject(message)}\n`);
    if (!db.merge) ctx.out(diffStat(ctx, parents[0] ? (db.commits[parents[0]]?.tree ?? {}) : {}, c.tree, false));
    return 0;
  },

  log(ctx, args, o) {
    const repo = o.repo;
    if (!repo) return needRepo(ctx, o) ? 0 : 128;
    const { flags, values, rest } = flagsOf(args);
    const db = repo.db;
    const oneline = flags.has('--oneline') || values['--format'] === 'oneline' || values['--pretty'] === 'oneline';
    const max = values['-n'] ?? values['--max-count'];
    const specs = rest.filter((r) => revParse(db, r) === undefined && !r.includes('..'));
    const revs = rest.filter((r) => !specs.includes(r));
    let starts: (string | undefined)[] = flags.has('--all') ? [...Object.values(db.branches), ...Object.values(db.tracking)] : [];
    let exclude = new Set<string>();
    for (const r of revs) {
      if (r.includes('..')) {
        const [a, b] = r.split('..');
        exclude = ancestors(db, revParse(db, a || 'HEAD'));
        starts.push(revParse(db, b || 'HEAD'));
      } else starts.push(revParse(db, r));
    }
    if (!starts.length) {
      if (!headCommit(db)) {
        ctx.err(`fatal: your current branch '${currentBranch(db)}' does not have any commits yet\n`);
        return 128;
      }
      starts = [headCommit(db)];
    }
    let list = history(db, starts).filter((c) => !exclude.has(c.id));
    if (specs.length) {
      const sp = pathspecs(ctx, repo, specs);
      list = list.filter((c) => {
        const parent = c.parents[0] ? db.commits[c.parents[0]]?.tree ?? {} : {};
        return sp.some((s) => [...new Set([...Object.keys(parent), ...Object.keys(c.tree)])].some((p) => under(p, s) && parent[p] !== c.tree[p]));
      });
    }
    const author = values['--author'];
    if (author) list = list.filter((c) => `${c.author} <${c.email}>`.toLowerCase().includes(author.toLowerCase()));
    const grep = values['--grep'];
    if (grep) {
      const ci = flags.has('-i') || flags.has('--regexp-ignore-case');
      list = list.filter((c) => (ci ? c.message.toLowerCase().includes(grep.toLowerCase()) : c.message.includes(grep)));
    }
    if (max !== undefined) list = list.slice(0, Number(max));
    const graph = flags.has('--graph');
    let out = '';
    for (const c of list) {
      if (oneline) out += `${graph ? '* ' : ''}${yellow(ctx, short(c.id))}${decorations(ctx, db, c.id)} ${subject(c.message)}\n`;
      else {
        out += `${graph ? '* ' : ''}${yellow(ctx, `commit ${c.id}`)}${decorations(ctx, db, c.id)}\n`;
        if (c.parents.length > 1) out += `Merge: ${c.parents.map(short).join(' ')}\n`;
        out += `Author: ${c.author} <${c.email}>\nDate:   ${gitDate(c.time)}\n\n${c.message.split('\n').map((l) => (l ? `    ${l}` : '')).join('\n')}\n\n`;
      }
    }
    ctx.out(oneline ? out : out.replace(/\n\n$/, '\n'));
    return 0;
  },

  show(ctx, args, o) {
    const repo = o.repo;
    if (!repo) return needRepo(ctx, o) ? 0 : 128;
    const { flags, rest } = flagsOf(args);
    const rev = rest[0] ?? 'HEAD';
    const fileRef = /^(.*?):(.+)$/.exec(rev);
    if (fileRef) {
      const id = revParse(repo.db, fileRef[1] || 'HEAD');
      const content = id ? repo.db.commits[id]?.tree[fileRef[2]!] : undefined;
      if (content === undefined) {
        ctx.err(`fatal: path '${fileRef[2]}' does not exist in '${fileRef[1] || 'HEAD'}'\n`);
        return 128;
      }
      ctx.out(content);
      return 0;
    }
    const id = revParse(repo.db, rev);
    const c = id ? repo.db.commits[id] : undefined;
    if (!c) {
      ctx.err(`fatal: ambiguous argument '${rev}': unknown revision or path not in the working tree.\n`);
      return 128;
    }
    const parent = c.parents[0] ? (repo.db.commits[c.parents[0]]?.tree ?? {}) : {};
    let out = `${yellow(ctx, `commit ${c.id}`)}${decorations(ctx, repo.db, c.id)}\nAuthor: ${c.author} <${c.email}>\nDate:   ${gitDate(c.time)}\n\n${c.message.split('\n').map((l) => (l ? `    ${l}` : '')).join('\n')}\n`;
    if (flags.has('--stat')) out += '\n' + diffStat(ctx, parent, c.tree, true);
    else if (c.parents.length < 2) {
      const d = treeDiff(ctx, parent, c.tree);
      if (d) out += '\n' + d;
    }
    ctx.out(out);
    return 0;
  },

  diff(ctx, args, o) {
    const repo = needRepo(ctx, o);
    if (!repo) return 128;
    const { flags, rest } = flagsOf(args);
    const db = repo.db;
    const revs = rest.filter((r) => revParse(db, r) !== undefined || r.includes('..'));
    const specs = pathspecs(ctx, repo, rest.filter((r) => !revs.includes(r)));
    const stat = flags.has('--stat');
    let a: Record<string, string>;
    let b: Record<string, string>;
    if (flags.has('--staged') || flags.has('--cached')) {
      a = revs[0] ? (db.commits[revParse(db, revs[0])!]?.tree ?? {}) : headTree(db);
      b = db.index;
    } else if (revs.length === 1 && revs[0]!.includes('..')) {
      const [x, y] = revs[0]!.split('..');
      a = db.commits[revParse(db, x || 'HEAD') ?? '']?.tree ?? {};
      b = db.commits[revParse(db, y || 'HEAD') ?? '']?.tree ?? {};
    } else if (revs.length === 2) {
      a = db.commits[revParse(db, revs[0]!)!]?.tree ?? {};
      b = db.commits[revParse(db, revs[1]!)!]?.tree ?? {};
    } else {
      a = revs.length === 1 ? (db.commits[revParse(db, revs[0]!)!]?.tree ?? {}) : db.index;
      const work = readTree(ctx, repo.root);
      // only tracked files take part in a work-tree diff
      b = Object.fromEntries(Object.entries(work).filter(([p]) => p in db.index || p in a));
      for (const p of Object.keys(db.index)) if (!(p in work)) delete b[p];
    }
    if (specs.length) {
      const keep = (t: Record<string, string>) => Object.fromEntries(Object.entries(t).filter(([p]) => specs.some((s) => under(p, s))));
      a = keep(a);
      b = keep(b);
    }
    ctx.out(stat ? diffStat(ctx, a, b, true) : treeDiff(ctx, a, b));
    return 0;
  },

  branch(ctx, args, o) {
    const repo = needRepo(ctx, o);
    if (!repo) return 128;
    const { flags, values, rest } = flagsOf(args);
    const db = repo.db;
    const del = values['-d'] ?? values['-D'] ?? (flags.has('--delete') ? rest[0] : undefined);
    if (del !== undefined) {
      if (db.branches[del] === undefined) {
        ctx.err(`error: branch '${del}' not found\n`);
        return 1;
      }
      if (currentBranch(db) === del) {
        ctx.err(`error: cannot delete branch '${del}' used by worktree at '${repo.root}'\n`);
        return 1;
      }
      const force = values['-D'] !== undefined || flags.has('--force');
      if (!force && !ancestors(db, headCommit(db)).has(db.branches[del]!)) {
        ctx.err(`error: the branch '${del}' is not fully merged.\nIf you are sure you want to delete it, run 'git branch -D ${del}'.\n`);
        return 1;
      }
      ctx.out(`Deleted branch ${del} (was ${short(db.branches[del]!)}).\n`);
      delete db.branches[del];
      delete db.upstream[del];
      saveDb(ctx, repo);
      return 0;
    }
    if (values['-M'] !== undefined || values['-m'] !== undefined) {
      const newName = values['-M'] ?? values['-m'];
      const old = rest[0] ? values['-M'] ?? values['-m'] : currentBranch(db);
      const target = rest[0] ?? newName!;
      const from = rest[0] ? newName! : old!;
      if (db.branches[from] !== undefined) {
        db.branches[target] = db.branches[from]!;
        delete db.branches[from];
      }
      if (currentBranch(db) === from) db.head = { branch: target };
      saveDb(ctx, repo);
      return 0;
    }
    const upTo = values['--set-upstream-to'] ?? (flags.has('-u') ? rest.shift() : undefined);
    if (upTo) {
      const [remote, ...b] = upTo.split('/');
      const br = currentBranch(db)!;
      db.upstream[br] = { remote: remote!, branch: b.join('/') };
      saveDb(ctx, repo);
      ctx.out(`branch '${br}' set up to track '${upTo}'.\n`);
      return 0;
    }
    if (rest.length) {
      const name = rest[0]!;
      if (!/^[\w./-]+$/.test(name) || name.startsWith('-') || name.endsWith('/') || name.includes('..')) {
        ctx.err(`fatal: '${name}' is not a valid branch name\n`);
        return 128;
      }
      if (db.branches[name] !== undefined) {
        ctx.err(`fatal: a branch named '${name}' already exists\n`);
        return 128;
      }
      const start = revParse(db, rest[1] ?? 'HEAD');
      if (!start) {
        ctx.err(rest[1] ? `fatal: not a valid object name: '${rest[1]}'\n` : `fatal: not a valid object name: '${currentBranch(db)}'\n`);
        return 128;
      }
      db.branches[name] = start;
      saveDb(ctx, repo);
      return 0;
    }
    const cur = currentBranch(db);
    let out = '';
    if (!cur) out += `* ${green(ctx, `(HEAD detached at ${short(headCommit(db) ?? '')})`)}\n`;
    const verbose = flags.has('-v') || flags.has('-vv');
    for (const b of Object.keys(db.branches).sort()) {
      const id = db.branches[b]!;
      const tail = verbose ? ` ${short(id)} ${subject(db.commits[id]?.message ?? '')}` : '';
      out += b === cur ? `* ${green(ctx, b)}${tail}\n` : `  ${b}${tail}\n`;
    }
    if (flags.has('-a') || flags.has('-r')) {
      if (flags.has('-r')) out = '';
      for (const t of Object.keys(db.tracking).sort()) out += `  ${red(ctx, `remotes/${t}`.replace(/^remotes\//, flags.has('-r') ? '' : 'remotes/'))}\n`;
    }
    ctx.out(out);
    return 0;
  },

  switch(ctx, args, o) {
    const { flags, values, rest } = flagsOf(args);
    const create = values['-c'] ?? values['-C'] ?? values['--create'];
    return switchTo(ctx, o, create ?? rest[0], { create: create !== undefined, start: create !== undefined ? rest[0] : undefined, detach: flags.has('--detach') });
  },

  checkout(ctx, args, o) {
    const repo = needRepo(ctx, o);
    if (!repo) return 128;
    const { flags, values, rest } = flagsOf(args);
    const create = values['-b'] ?? values['-B'];
    if (create !== undefined) return switchTo(ctx, o, create, { create: true, start: rest[0] });
    // `git checkout -- file` / `git checkout file`: restore from the index
    const isRev = (r: string) => revParse(repo.db, r) !== undefined || repo.db.branches[r] !== undefined || Object.keys(repo.db.tracking).some((t) => t.endsWith('/' + r));
    if (flags.has('--') || (rest.length && !isRev(rest[0]!))) {
      return sub.restore!(ctx, rest, o);
    }
    if (!rest.length) return 0;
    return switchTo(ctx, o, rest[0]!, { create: false, detach: true });
  },

  merge(ctx, args, o) {
    const repo = needRepo(ctx, o);
    if (!repo) return 128;
    const { flags, values, rest } = flagsOf(args);
    const db = repo.db;
    if (flags.has('--abort')) {
      if (!db.merge) {
        ctx.err('fatal: There is no merge to abort (MERGE_HEAD missing).\n');
        return 128;
      }
      const work = readTree(ctx, repo.root);
      checkoutTree(ctx, repo, work, headTree(db));
      db.index = { ...headTree(db) };
      delete db.merge;
      saveDb(ctx, repo);
      return 0;
    }
    if (db.merge) {
      ctx.err('error: Merging is not possible because you have unmerged files.\nhint: Fix them up in the work tree, and then use \'git add/rm <file>\'\nhint: as appropriate to mark resolution and make a commit.\nfatal: Exiting because of an unresolved conflict.\n');
      return 128;
    }
    const name = rest[0];
    if (!name) {
      ctx.err('fatal: No remote for the current branch.\n');
      return 128;
    }
    return mergeInto(ctx, repo, o, name, values['-m'], flags.has('--no-ff'));
  },

  reset(ctx, args, o) {
    const repo = needRepo(ctx, o);
    if (!repo) return 128;
    const { flags, rest } = flagsOf(args);
    const db = repo.db;
    const revArg = rest.find((r) => revParse(db, r) !== undefined);
    const paths = rest.filter((r) => r !== revArg);
    if (paths.length) {
      // unstage files
      const tree = db.commits[revParse(db, revArg ?? 'HEAD') ?? '']?.tree ?? {};
      const work = readTree(ctx, repo.root);
      const unknown = pathspecs(ctx, repo, paths).findIndex((spec) => ![...Object.keys(db.index), ...Object.keys(tree), ...Object.keys(work)].some((p) => under(p, spec)));
      if (unknown >= 0) {
        ctx.err(`fatal: ambiguous argument '${paths[unknown]}': unknown revision or path not in the working tree.\n`);
        return 128;
      }
      for (const spec of pathspecs(ctx, repo, paths)) {
        for (const p of [...new Set([...Object.keys(db.index), ...Object.keys(tree)])].filter((p) => under(p, spec))) {
          if (p in tree) db.index[p] = tree[p]!;
          else delete db.index[p];
        }
      }
      saveDb(ctx, repo);
      const st = computeStatus(ctx, repo);
      if (st.unstaged.length) ctx.out('Unstaged changes after reset:\n' + st.unstaged.map((x) => `${x.kind === 'deleted' ? 'D' : 'M'}\t${rel(ctx, repo, x.path)}\n`).join(''));
      return 0;
    }
    const target = revParse(db, revArg ?? 'HEAD');
    if (!target) {
      ctx.err(`fatal: ambiguous argument '${revArg ?? 'HEAD'}': unknown revision or path not in the working tree.\n`);
      return 128;
    }
    const tree = db.commits[target]!.tree;
    const hard = flags.has('--hard');
    const soft = flags.has('--soft');
    const before = headTree(db);
    if (hard) {
      const work = readTree(ctx, repo.root);
      checkoutTree(ctx, repo, { ...work, ...before, ...db.index }, tree);
    }
    if ('branch' in db.head) db.branches[db.head.branch] = target;
    else db.head = { detached: target };
    if (!soft) db.index = { ...tree };
    delete db.merge;
    saveDb(ctx, repo);
    if (hard) ctx.out(`HEAD is now at ${short(target)} ${subject(db.commits[target]!.message)}\n`);
    else if (!soft) {
      const st = computeStatus(ctx, repo);
      if (st.unstaged.length) ctx.out('Unstaged changes after reset:\n' + st.unstaged.map((x) => `${x.kind === 'deleted' ? 'D' : 'M'}\t${rel(ctx, repo, x.path)}\n`).join(''));
    }
    return 0;
  },

  revert(ctx, args, o) {
    const repo = needRepo(ctx, o);
    if (!repo) return 128;
    const { rest } = flagsOf(args);
    const db = repo.db;
    const id = revParse(db, rest[0] ?? '');
    const c = id ? db.commits[id] : undefined;
    if (!c) {
      ctx.err(`fatal: bad revision '${rest[0] ?? ''}'\n`);
      return 128;
    }
    if (computeStatus(ctx, repo).staged.length || computeStatus(ctx, repo).unstaged.length) {
      ctx.err('error: your local changes would be overwritten by revert.\nhint: commit your changes or stash them to proceed.\nfatal: revert failed\n');
      return 128;
    }
    const parent = c.parents[0] ? db.commits[c.parents[0]]!.tree : {};
    const cur = headTree(db);
    const next: Record<string, string> = { ...cur };
    for (const p of new Set([...Object.keys(parent), ...Object.keys(c.tree)])) {
      if (parent[p] === c.tree[p]) continue;
      const m = merge3(c.tree[p], cur[p], parent[p], `parent of ${short(c.id)} (${subject(c.message)})`);
      if (m.conflict) {
        ctx.err(`error: could not revert ${short(c.id)}... ${subject(c.message)}\nhint: the file ${p} was changed again later; revert by hand\n`);
        return 1;
      }
      if (m.text === undefined) delete next[p];
      else next[p] = m.text;
    }
    const msg = `Revert "${subject(c.message)}"\n\nThis reverts commit ${c.id}.`;
    checkoutTree(ctx, repo, cur, next);
    db.index = { ...next };
    const nc = commitNow(ctx, repo, o, msg, [headCommit(db)!], next);
    if (!nc) return 128;
    saveDb(ctx, repo);
    ctx.out(`[${currentBranch(db)} ${short(nc.id)}] ${subject(msg)}\n` + diffStat(ctx, cur, next, false));
    return 0;
  },

  stash(ctx, args, o) {
    const repo = needRepo(ctx, o);
    if (!repo) return 128;
    const db = repo.db;
    const action = args[0] && !args[0].startsWith('-') ? args[0] : 'push';
    if (action === 'list') {
      ctx.out(db.stash.map((s, i) => `stash@{${i}}: ${s.message}\n`).join(''));
      return 0;
    }
    if (action === 'pop' || action === 'apply' || action === 'drop' || action === 'show') {
      const ref = args[1] ?? 'stash@{0}';
      const m = /^(?:stash@\{)?(\d+)\}?$/.exec(ref);
      const n = m ? Number(m[1]) : -1;
      const s = db.stash[n];
      if (!s) {
        ctx.err(db.stash.length ? `error: ${ref} is not a valid reference\n` : 'No stash entries found.\n');
        return 1;
      }
      if (action === 'show') {
        ctx.out(diffStat(ctx, db.commits[s.base]?.tree ?? {}, s.work, true));
        return 0;
      }
      if (action !== 'drop') {
        const work = readTree(ctx, repo.root);
        const tracked = Object.fromEntries(Object.entries(work).filter(([p]) => p in db.index));
        checkoutTree(ctx, repo, tracked, s.work);
        db.index = { ...s.index };
      }
      if (action !== 'apply') db.stash.splice(n, 1);
      saveDb(ctx, repo);
      const dropped = `Dropped stash@{${n}} (${fnv(s.message + s.base, 7)}${fnv(s.base + s.message, 3)})\n`;
      if (action === 'drop') {
        ctx.out(dropped);
        return 0;
      }
      sub.status!(ctx, [], o);
      if (action === 'pop') ctx.out(dropped);
      return 0;
    }
    if (action === 'clear') {
      db.stash = [];
      saveDb(ctx, repo);
      return 0;
    }
    const st = computeStatus(ctx, repo);
    if (!st.staged.length && !st.unstaged.length) {
      ctx.out('No local changes to save\n');
      return 0;
    }
    const work = readTree(ctx, repo.root);
    const tracked = Object.fromEntries(Object.entries(work).filter(([p]) => p in db.index || p in headTree(db)));
    for (const p of Object.keys(db.index)) if (!(p in work)) delete tracked[p];
    const head = headCommit(db)!;
    const mi = args.findIndex((a) => a === '-m' || a === '--message');
    const own = mi >= 0 ? args[mi + 1] : undefined;
    const msg = own ? `On ${currentBranch(db)}: ${own}` : `WIP on ${currentBranch(db)}: ${short(head)} ${subject(db.commits[head]!.message)}`;
    db.stash.unshift({ message: msg, index: { ...db.index }, work: tracked, base: head });
    checkoutTree(ctx, repo, tracked, headTree(db));
    db.index = { ...headTree(db) };
    saveDb(ctx, repo);
    ctx.out(`Saved working directory and index state ${msg}\n`);
    return 0;
  },

  'cherry-pick'(ctx, args, o) {
    const repo = needRepo(ctx, o);
    if (!repo) return 128;
    const db = repo.db;
    const { rest } = flagsOf(args);
    if (!rest.length) {
      ctx.err('usage: git cherry-pick [<options>] <commit-ish>...\n');
      return 129;
    }
    const st = computeStatus(ctx, repo);
    if (st.staged.length || st.unstaged.length) {
      ctx.err('error: your local changes would be overwritten by cherry-pick.\nhint: commit your changes or stash them to proceed.\nfatal: cherry-pick failed\n');
      return 128;
    }
    for (const r of rest) {
      const id = revParse(db, r);
      const c = id ? db.commits[id] : undefined;
      if (!c) {
        ctx.err(`fatal: bad revision '${r}'\n`);
        return 128;
      }
      const parent = c.parents[0] ? db.commits[c.parents[0]]!.tree : {};
      const head = headTree(db);
      const next = { ...head };
      const conflicts: string[] = [];
      for (const p of new Set([...Object.keys(parent), ...Object.keys(c.tree)])) {
        if (parent[p] === c.tree[p]) continue;
        if (head[p] === parent[p] || head[p] === c.tree[p]) {
          if (c.tree[p] === undefined) delete next[p];
          else next[p] = c.tree[p]!;
        } else conflicts.push(p);
      }
      if (conflicts.length) {
        ctx.err(`error: could not apply ${short(c.id)}... ${subject(c.message)}\nhint: The commit changes lines that are different on this branch (${conflicts.join(', ')}).\nhint: Apply the change by hand instead, or merge the branch.\n`);
        return 1;
      }
      const made = commitNow(ctx, repo, o, c.message, headCommit(db) ? [headCommit(db)!] : [], next);
      if (!made) return 128;
      checkoutTree(ctx, repo, head, next);
      db.index = { ...next };
      saveDb(ctx, repo);
      const changed = Object.keys(next).filter((p) => next[p] !== head[p]).length + Object.keys(head).filter((p) => !(p in next)).length;
      ctx.out(`[${currentBranch(db) ?? 'HEAD'} ${short(made.id)}] ${subject(c.message)}\n Date: ${gitDate(c.time)}\n ${changed} file${changed === 1 ? '' : 's'} changed\n`);
    }
    return 0;
  },
  blame(ctx, args, o) {
    const repo = needRepo(ctx, o);
    if (!repo) return 128;
    const db = repo.db;
    const { rest } = flagsOf(args);
    if (!rest[0]) {
      ctx.err('usage: git blame [<options>] [<rev-opts>] [<rev>] [--] <file>\n');
      return 129;
    }
    const path = rel(ctx, repo, rest[0]);
    const chain: GitCommit[] = [];
    for (let id = headCommit(db); id; id = db.commits[id]?.parents[0]) chain.push(db.commits[id]!);
    const text = chain[0]?.tree[path];
    if (text === undefined) {
      ctx.err(`fatal: no such path '${path}' in HEAD\n`);
      return 128;
    }
    const lines = splitLines(text);
    const width = Math.max(...chain.map((c) => c.author.length));
    let out = '';
    lines.forEach((line, i) => {
      // the oldest commit from which this line has been in the file ever since
      let owner = chain[0]!;
      for (const c of chain) {
        if (!splitLines(c.tree[path] ?? '').includes(line)) break;
        owner = c;
      }
      const root = owner.parents.length === 0 ? '^' : '';
      const d = new Date(owner.time).toISOString().replace('T', ' ').slice(0, 19);
      out += `${root}${short(owner.id).slice(0, root ? 7 : 8)} (${owner.author.padEnd(width)} ${d} +0000 ${String(i + 1).padStart(String(lines.length).length)}) ${line}\n`;
    });
    ctx.out(out);
    return 0;
  },
  tag(ctx, args, o) {
    const repo = needRepo(ctx, o);
    if (!repo) return 128;
    const { flags, values, rest } = flagsOf(args);
    const db = repo.db;
    if (flags.has('-d') || values['-d'] !== undefined) {
      for (const t of [...(values['-d'] !== undefined ? [values['-d']] : []), ...rest]) {
        if (db.tags[t] === undefined) {
          ctx.err(`error: tag '${t}' not found.\n`);
          return 1;
        }
        ctx.out(`Deleted tag '${t}' (was ${short(db.tags[t]!)})\n`);
        delete db.tags[t];
      }
      saveDb(ctx, repo);
      return 0;
    }
    if (!rest.length) {
      ctx.out(Object.keys(db.tags).sort().map((t) => t + '\n').join(''));
      return 0;
    }
    const id = revParse(db, rest[1] ?? 'HEAD');
    if (!id) {
      ctx.err(`fatal: Failed to resolve '${rest[1] ?? 'HEAD'}' as a valid ref.\n`);
      return 128;
    }
    if (db.tags[rest[0]!] !== undefined) {
      ctx.err(`fatal: tag '${rest[0]}' already exists\n`);
      return 128;
    }
    db.tags[rest[0]!] = id;
    saveDb(ctx, repo);
    return 0;
  },

  remote(ctx, args, o) {
    const repo = needRepo(ctx, o);
    if (!repo) return 128;
    const db = repo.db;
    const [action, ...rest] = args;
    if (!action || action === '-v' || action === '--verbose') {
      for (const [n, url] of Object.entries(db.remotes)) ctx.out(action ? `${n}\t${url} (fetch)\n${n}\t${url} (push)\n` : `${n}\n`);
      return 0;
    }
    if (action === 'add') {
      const [name, url] = rest;
      if (!name || !url) {
        ctx.err('usage: git remote add [<options>] <name> <url>\n');
        return 129;
      }
      if (db.remotes[name]) {
        ctx.err(`error: remote ${name} already exists.\n`);
        return 3;
      }
      db.remotes[name] = url;
      saveDb(ctx, repo);
      return 0;
    }
    if (action === 'remove' || action === 'rm') {
      const name = rest[0] ?? '';
      if (!db.remotes[name]) {
        ctx.err(`error: No such remote: '${name}'\n`);
        return 2;
      }
      delete db.remotes[name];
      for (const t of Object.keys(db.tracking)) if (t.startsWith(name + '/')) delete db.tracking[t];
      for (const [b, u] of Object.entries(db.upstream)) if (u.remote === name) delete db.upstream[b];
      saveDb(ctx, repo);
      return 0;
    }
    if (action === 'set-url') {
      const [name, url] = rest;
      if (!name || !url || !db.remotes[name]) {
        ctx.err(`error: No such remote '${name ?? ''}'\n`);
        return 2;
      }
      db.remotes[name] = url;
      saveDb(ctx, repo);
      return 0;
    }
    if (action === 'get-url') {
      const url = db.remotes[rest[0] ?? ''];
      if (!url) {
        ctx.err(`error: No such remote '${rest[0] ?? ''}'\n`);
        return 2;
      }
      ctx.out(url + '\n');
      return 0;
    }
    ctx.err(`error: unknown subcommand: \`${action}'\n`);
    return 129;
  },

  clone(ctx, args, o) {
    const { values, rest } = flagsOf(args);
    const url = rest[0];
    if (!url) {
      ctx.err('fatal: You must specify a repository to clone.\n');
      return 129;
    }
    const remote = openRemote(ctx, url);
    const name = rest[1] ?? basename(url.replace(/\/$/, '')).replace(/\.git$/, '').replace(/^.*:/, '');
    const dir = normalize(name, ctx.cwd);
    if (node(ctx, dir) && (node(ctx, dir) as DirNode).type === 'dir' && Object.keys((node(ctx, dir) as DirNode).children).length) {
      ctx.err(`fatal: destination path '${name}' already exists and is not an empty directory.\n`);
      return 128;
    }
    if (!remote) return notFound(ctx, url);
    ctx.err(`Cloning into '${name}'...\n`);
    const rdb = remote.db;
    const branch = values['-b'] ?? values['--branch'] ?? remoteHeadBranch(rdb);
    try {
      mkdirp(ctx, dir);
      mkdirp(ctx, `${dir}/.git`);
    } catch (e) {
      if (e instanceof FsError) {
        ctx.err(`fatal: could not create work tree dir '${name}': Permission denied\n`);
        return 128;
      }
      throw e;
    }
    const db = emptyDb(false, branch);
    // a local path is remembered as an absolute one, like git does
    db.remotes.origin = /^(https?:|git@|file:)/.test(url) ? url : remote.gitDir === remotePath(ctx, url) || remote.root === remotePath(ctx, url) ? remotePath(ctx, url) : url;
    for (const [b, id] of Object.entries(rdb.branches)) {
      copyCommits(rdb, db, id);
      db.tracking[`origin/${b}`] = id;
    }
    const repo: Repo = { root: dir, gitDir: `${dir}/.git`, db };
    if (rdb.branches[branch]) {
      db.branches[branch] = rdb.branches[branch]!;
      db.upstream[branch] = { remote: 'origin', branch };
      db.index = { ...db.commits[rdb.branches[branch]!]!.tree };
      checkoutTree(ctx, repo, {}, db.index);
      const n = Object.keys(db.commits).length;
      ctx.err(`remote: Enumerating objects: ${n * 3}, done.\nremote: Total ${n * 3} (delta 0), reused 0 (delta 0), pack-reused 0\nReceiving objects: 100% (${n * 3}/${n * 3}), done.\n`);
    } else ctx.err('warning: You appear to have cloned an empty repository.\n');
    saveDb(ctx, repo);
    return 0;
  },

  fetch(ctx, args, o) {
    const repo = needRepo(ctx, o);
    if (!repo) return 128;
    const { rest } = flagsOf(args);
    return fetchRemote(ctx, repo, rest[0] ?? defaultRemote(repo.db)) === null ? 128 : 0;
  },

  pull(ctx, args, o) {
    const repo = needRepo(ctx, o);
    if (!repo) return 128;
    const { rest } = flagsOf(args);
    const db = repo.db;
    const branch = currentBranch(db);
    const up = branch ? db.upstream[branch] : undefined;
    const remote = rest[0] ?? up?.remote ?? defaultRemote(db);
    const rbranch = rest[1] ?? up?.branch;
    if (!remote) {
      ctx.err('fatal: No remote repository specified.  Please, specify either a URL or a\nremote name from which new revisions should be fetched.\n');
      return 128;
    }
    if (!rbranch) {
      ctx.err(`There is no tracking information for the current branch.\nPlease specify which branch you want to merge with.\n\n    git pull ${remote} <branch>\n\nIf you wish to set tracking information for this branch you can do so with:\n\n    git branch --set-upstream-to=${remote}/<branch> ${branch}\n\n`);
      return 1;
    }
    if (fetchRemote(ctx, repo, remote) === null) return 128;
    if (!db.tracking[`${remote}/${rbranch}`]) {
      ctx.err(`fatal: couldn't find remote ref ${rbranch}\n`);
      return 1;
    }
    return mergeInto(ctx, repo, o, `${remote}/${rbranch}`, undefined, false, true);
  },

  push(ctx, args, o) {
    const repo = needRepo(ctx, o);
    if (!repo) return 128;
    const { flags, rest } = flagsOf(args);
    const db = repo.db;
    const setUp = flags.has('-u') || flags.has('--set-upstream');
    const force = flags.has('-f') || flags.has('--force') || flags.has('--force-with-lease');
    const branch = currentBranch(db);
    const up = branch ? db.upstream[branch] : undefined;
    const remoteName = rest[0] ?? up?.remote ?? (Object.keys(db.remotes).length === 1 ? Object.keys(db.remotes)[0] : undefined);
    if (!remoteName || !db.remotes[remoteName]) {
      if (rest[0] && !db.remotes[rest[0]]) return notFound(ctx, rest[0]);
      ctx.err('fatal: No configured push destination.\nEither specify the URL from the command-line or configure a remote repository using\n\n    git remote add <name> <url>\n\nand then push using the remote name\n\n    git push <name>\n\n');
      return 128;
    }
    const pushTags = flags.has('--tags');
    // a tag: git push origin v1.0  /  git push --tags
    if (pushTags || (rest[1] && db.tags[rest[1]] !== undefined && db.branches[rest[1]] === undefined)) {
      const url = db.remotes[remoteName]!;
      const remote = openRemote(ctx, url);
      if (!remote) return notFound(ctx, url);
      const names = pushTags ? Object.keys(db.tags).sort() : [rest[1]!];
      let lines = '';
      for (const t of names) {
        if (remote.db.tags[t] === db.tags[t]) continue;
        if (remote.db.tags[t] !== undefined && !force) {
          ctx.err(`To ${url}\n ! [rejected]        ${t} -> ${t} (already exists)\nerror: failed to push some refs to '${url}'\nhint: Updates were rejected because the tag already exists in the remote.\n`);
          return 1;
        }
        copyCommits(db, remote.db, db.tags[t]);
        remote.db.tags[t] = db.tags[t]!;
        lines += ` * [new tag]         ${t} -> ${t}\n`;
      }
      if (!lines) {
        ctx.err('Everything up-to-date\n');
        return 0;
      }
      saveDb(ctx, remote);
      ctx.err(`Enumerating objects: 1, done.\nTotal 0 (delta 0), reused 0 (delta 0), pack-reused 0\nTo ${url}\n${lines}`);
      return 0;
    }
    let refspec = rest[1] ?? (up && !rest[0] ? up.branch : undefined);
    if (!refspec) {
      if (!setUp && !rest[0]) {
        ctx.err(`fatal: The current branch ${branch} has no upstream branch.\nTo push the current branch and set the remote as upstream, use\n\n    git push --set-upstream ${remoteName} ${branch}\n\n`);
        return 128;
      }
      refspec = branch ?? 'HEAD';
    }
    const [srcName, dstName] = refspec.includes(':') ? refspec.split(':') : [refspec === 'HEAD' ? branch! : refspec, refspec === 'HEAD' ? branch! : (up?.branch ?? refspec)];
    const src = db.branches[srcName!];
    if (!src) {
      ctx.err(`error: src refspec ${srcName} does not match any\nerror: failed to push some refs to '${db.remotes[remoteName]}'\n`);
      return 1;
    }
    const url = db.remotes[remoteName]!;
    const remote = openRemote(ctx, url);
    if (!remote) return notFound(ctx, url);
    const rdb = remote.db;
    const old = rdb.branches[dstName!];
    let line: string;
    if (old === src) line = 'Everything up-to-date\n';
    else {
      if (old && !force && !ancestors(db, src).has(old)) {
        const known = !!db.commits[old];
        ctx.err(`To ${url}\n ! [rejected]        ${srcName} -> ${dstName} (${known ? 'non-fast-forward' : 'fetch first'})\nerror: failed to push some refs to '${url}'\nhint: Updates were rejected because ${known ? 'the tip of your current branch is behind\nhint: its remote counterpart' : 'the remote contains work that you do not\nhint: have locally. This is usually caused by another repository pushing to\nhint: the same ref'}. If you want to integrate the remote changes,\nhint: use 'git pull' before pushing again.\nhint: See the 'Note about fast-forwards' in 'git push --help' for details.\n`);
        return 1;
      }
      copyCommits(db, rdb, src);
      rdb.branches[dstName!] = src;
      if (rdb.bare && !Object.keys(rdb.branches).includes(remoteHeadBranch(rdb))) rdb.head = { branch: dstName! };
      if (!rdb.bare) {
        // pushing into a non-bare repository: real git refuses the checked-out branch
        if (currentBranch(rdb) === dstName) {
          ctx.err(`remote: error: refusing to update checked out branch: refs/heads/${dstName}\n`);
          return 1;
        }
      }
      saveDb(ctx, remote);
      const n = ancestors(db, src).size - (old ? ancestors(db, old).size : 0);
      line = `Enumerating objects: ${Math.max(3, n * 3)}, done.\nWriting objects: 100% (${Math.max(3, n * 3)}/${Math.max(3, n * 3)}), done.\nTotal ${Math.max(3, n * 3)} (delta 0), reused 0 (delta 0), pack-reused 0\n`;
      if (remote.gitDir.startsWith(GITHUB_ROOT) && !old && dstName !== remoteHeadBranch(rdb)) {
        const ownerRepo = remote.gitDir.slice(GITHUB_ROOT.length + 1).replace(/\.git$/, '');
        line += `remote:\nremote: Create a pull request for '${dstName}' on GitHub by visiting:\nremote:      https://github.com/${ownerRepo}/pull/new/${dstName}\nremote:\n`;
      }
      line += `To ${url}\n${old ? `   ${short(old)}..${short(src)}  ${srcName} -> ${dstName}` : ` * [new branch]      ${srcName} -> ${dstName}`}${force && old && !ancestors(db, src).has(old) ? ' (forced update)' : ''}\n`;
    }
    db.tracking[`${remoteName}/${dstName}`] = src;
    ctx.err(line);
    if (setUp && srcName && db.branches[srcName] !== undefined) {
      db.upstream[srcName] = { remote: remoteName, branch: dstName! };
      ctx.out(`branch '${srcName}' set up to track '${remoteName}/${dstName}'.\n`);
    }
    saveDb(ctx, repo);
    return 0;
  },
};

function defaultRemote(db: GitDb): string | undefined {
  return db.remotes.origin ? 'origin' : Object.keys(db.remotes)[0];
}

/** Update remote-tracking branches; returns null when the remote is unreachable. */
function fetchRemote(ctx: Ctx, repo: Repo, remoteName: string | undefined): string | null {
  const db = repo.db;
  if (!remoteName) {
    ctx.err('fatal: No remote repository specified.\n');
    return null;
  }
  const url = db.remotes[remoteName] ?? remoteName;
  const remote = openRemote(ctx, url);
  if (!remote) {
    notFound(ctx, url);
    return null;
  }
  let report = '';
  for (const [b, id] of Object.entries(remote.db.branches)) {
    const key = `${remoteName}/${b}`;
    const old = db.tracking[key];
    if (old === id) continue;
    copyCommits(remote.db, db, id);
    db.tracking[key] = id;
    report += old ? `   ${short(old)}..${short(id)}  ${b.padEnd(10)} -> ${key}\n` : ` * [new branch]      ${b.padEnd(10)} -> ${key}\n`;
  }
  for (const key of Object.keys(db.tracking)) if (key.startsWith(remoteName + '/') && remote.db.branches[key.slice(remoteName.length + 1)] === undefined) delete db.tracking[key];
  if (report) ctx.err(`From ${url}\n${report}`);
  saveDb(ctx, repo);
  return report;
}

function switchTo(ctx: Ctx, o: Opts, name: string | undefined, opt: { create: boolean; start?: string | undefined; detach?: boolean }): number {
  const repo = needRepo(ctx, o);
  if (!repo) return 128;
  const db = repo.db;
  if (!name) {
    ctx.err('fatal: missing branch or commit argument\n');
    return 128;
  }
  if (opt.create) {
    if (db.branches[name] !== undefined) {
      ctx.err(`fatal: a branch named '${name}' already exists\n`);
      return 128;
    }
    const start = opt.start ? revParse(db, opt.start) : headCommit(db);
    if (opt.start && !start) {
      ctx.err(`fatal: invalid reference: ${opt.start}\n`);
      return 128;
    }
    if (!start) {
      // unborn branch: just rename HEAD
      db.head = { branch: name };
      saveDb(ctx, repo);
      ctx.err(`Switched to a new branch '${name}'\n`);
      return 0;
    }
    const target = db.commits[start]!.tree;
    const bad = wouldOverwrite(ctx, repo, target);
    if (bad.length) return overwriteError(ctx, bad, 'checkout');
    checkoutTree(ctx, repo, headTree(db), target);
    db.index = mergeIndex(db, target);
    db.branches[name] = start;
    db.head = { branch: name };
    if (opt.start && db.tracking[opt.start]) {
      const [remote, ...b] = opt.start.split('/');
      db.upstream[name] = { remote: remote!, branch: b.join('/') };
    }
    saveDb(ctx, repo);
    ctx.err(`Switched to a new branch '${name}'\n`);
    if (db.upstream[name] && opt.start) ctx.out(`branch '${name}' set up to track '${opt.start}'.\n`);
    return 0;
  }
  let id = db.branches[name];
  let branch: string | undefined = id !== undefined ? name : undefined;
  if (id === undefined) {
    // remote branch of the same name: create a tracking branch (git's DWIM)
    const trk = Object.keys(db.tracking).find((t) => t.split('/').slice(1).join('/') === name);
    if (trk) return switchTo(ctx, o, name, { create: true, start: trk });
    if (opt.detach) id = revParse(db, name);
    if (id === undefined) {
      ctx.err(opt.detach ? `error: pathspec '${name}' did not match any file(s) known to git\n` : `fatal: invalid reference: ${name}\n`);
      return opt.detach ? 1 : 128;
    }
    branch = undefined;
  }
  if (branch && currentBranch(db) === branch) {
    ctx.err(`Already on '${branch}'\n`);
    return 0;
  }
  const target = db.commits[id]!.tree;
  const bad = wouldOverwrite(ctx, repo, target);
  if (bad.length) return overwriteError(ctx, bad, 'checkout');
  checkoutTree(ctx, repo, headTree(db), target);
  db.index = mergeIndex(db, target);
  db.head = branch ? { branch } : { detached: id };
  saveDb(ctx, repo);
  if (branch) ctx.err(`Switched to branch '${branch}'\n`);
  else ctx.err(`Note: switching to '${name}'.\n\nYou are in 'detached HEAD' state. You can look around, make experimental\nchanges and commit them, and you can discard any commits you make in this\nstate without impacting any branches by switching back to a branch.\n\nHEAD is now at ${short(id)} ${subject(db.commits[id]!.message)}\n`);
  return 0;
}

/** Keep staged changes of files the branches agree on. */
function mergeIndex(db: GitDb, target: Record<string, string>): Record<string, string> {
  const head = headTree(db);
  const out = { ...target };
  for (const p of new Set([...Object.keys(head), ...Object.keys(db.index)])) {
    if (head[p] === target[p] && db.index[p] !== head[p]) {
      if (p in db.index) out[p] = db.index[p]!;
      else delete out[p];
    }
  }
  return out;
}

function overwriteError(ctx: Ctx, files: string[], op: string): number {
  ctx.err(`error: Your local changes to the following files would be overwritten by ${op}:\n${files.map((f) => `\t${f}\n`).join('')}Please commit your changes or stash them before you ${op === 'checkout' ? 'switch branches' : op}.\nAborting\n`);
  return 1;
}

function mergeInto(ctx: Ctx, repo: Repo, o: Opts, name: string, message: string | undefined, noFf: boolean, pulling = false): number {
  const db = repo.db;
  const theirs = revParse(db, name);
  if (!theirs) {
    ctx.err(`merge: ${name} - not something we can merge\n`);
    return 1;
  }
  const ours = headCommit(db);
  const theirTree = db.commits[theirs]!.tree;
  if (!ours) {
    // unborn branch: just take theirs
    checkoutTree(ctx, repo, {}, theirTree);
    db.index = { ...theirTree };
    if ('branch' in db.head) db.branches[db.head.branch] = theirs;
    saveDb(ctx, repo);
    return 0;
  }
  if (ancestors(db, ours).has(theirs)) {
    ctx.out('Already up to date.\n');
    return 0;
  }
  const st = computeStatus(ctx, repo);
  const ourTree = headTree(db);
  if (ancestors(db, theirs).has(ours) && !noFf) {
    const bad = wouldOverwrite(ctx, repo, theirTree);
    if (bad.length) return overwriteError(ctx, bad, 'merge');
    checkoutTree(ctx, repo, ourTree, theirTree);
    db.index = mergeIndex(db, theirTree);
    if ('branch' in db.head) db.branches[db.head.branch] = theirs;
    else db.head = { detached: theirs };
    saveDb(ctx, repo);
    ctx.out(`Updating ${short(ours)}..${short(theirs)}\nFast-forward\n${diffStat(ctx, ourTree, theirTree, true)}`);
    return 0;
  }
  if (st.staged.length || st.unstaged.length) {
    const touched = [...st.staged, ...st.unstaged].map((x) => x.path).filter((p) => theirTree[p] !== ourTree[p]);
    if (touched.length) return overwriteError(ctx, [...new Set(touched)], 'merge');
  }
  const baseId = mergeBase(db, ours, theirs);
  const base = baseId ? db.commits[baseId]!.tree : {};
  const result: Record<string, string> = {};
  const conflicts: string[] = [];
  let log = '';
  for (const p of [...new Set([...Object.keys(base), ...Object.keys(ourTree), ...Object.keys(theirTree)])].sort()) {
    const m = merge3(base[p], ourTree[p], theirTree[p], name);
    if (ourTree[p] !== theirTree[p] && base[p] !== ourTree[p] && base[p] !== theirTree[p]) log += `Auto-merging ${p}\n`;
    if (m.conflict) {
      conflicts.push(p);
      log += `CONFLICT (content): Merge conflict in ${p}\n`;
    }
    if (m.text !== undefined) result[p] = m.text;
  }
  checkoutTree(ctx, repo, ourTree, result);
  if (conflicts.length) {
    db.index = Object.fromEntries(Object.entries(result).filter(([p]) => !conflicts.includes(p)));
    for (const p of conflicts) if (ourTree[p] !== undefined) db.index[p] = ourTree[p]!;
    db.merge = { theirs, name, conflicts };
    saveDb(ctx, repo);
    ctx.out(`${log}Automatic merge failed; fix conflicts and then commit the result.\n`);
    return 1;
  }
  db.index = { ...result };
  const msg = message ?? (pulling ? `Merge branch '${name.split('/').slice(1).join('/')}' of ${db.remotes[name.split('/')[0]!] ?? name}` : `Merge branch '${name}'`);
  const c = commitNow(ctx, repo, o, msg, [ours, theirs], result);
  if (!c) return 128;
  saveDb(ctx, repo);
  ctx.out(`${log}Merge made by the 'ort' strategy.\n${diffStat(ctx, ourTree, result, true)}`);
  return 0;
}

export const git: CommandDef = {
  name: 'git',
  category: 'files',
  doc: {
    summary: 'version control: save snapshots of a project and share them',
    usage: ['git [-C DIR] [-c NAME=VALUE] COMMAND [ARGS]'],
    description: 'Git records snapshots (commits) of a project, lets you work on branches and exchange history with remote repositories such as GitHub.',
    options: [
      ['init', 'create an empty repository in the current directory'],
      ['clone URL [DIR]', 'copy a remote repository with its whole history'],
      ['status', 'what changed: staged, not staged, untracked files'],
      ['add FILE...', 'stage changes for the next commit (git add . — everything)'],
      ['commit -m MESSAGE', 'save the staged snapshot with a message'],
      ['log', 'history of commits (--oneline: one line each)'],
      ['diff', 'unstaged changes line by line (--staged: what will be committed)'],
      ['show COMMIT', 'one commit and its changes'],
      ['branch [NAME]', 'list branches or create one'],
      ['switch BRANCH', 'switch to a branch (-c NAME: create it first)'],
      ['checkout BRANCH', 'switch branches (older command; -b NAME creates one)'],
      ['merge BRANCH', 'join another branch into the current one'],
      ['remote add NAME URL', 'connect a remote repository (usually origin)'],
      ['push', 'send your commits to the remote repository (-u: remember it)'],
      ['pull', 'get new commits from the remote and merge them'],
      ['fetch', 'download new commits without merging them'],
      ['restore FILE', 'discard changes in a file (--staged: unstage it)'],
      ['reset', 'move the branch back (--hard also discards changes)'],
      ['revert COMMIT', 'a new commit that undoes an old one'],
      ['stash', 'put unfinished changes aside (stash pop: bring them back)'],
      ['tag NAME', 'mark a commit, e.g. a release v1.0 (-a -m: annotated)'],
      ['cherry-pick COMMIT', 'copy one commit from another branch onto the current one'],
      ['blame FILE', 'who last changed each line, and in which commit'],
      ['config KEY VALUE', 'settings such as user.name and user.email (--global: for all your repositories)'],
      ['-m, --message MSG', 'commit: the commit message'],
      ['-a, --all', 'commit: stage every modified tracked file first'],
      ['--oneline', 'log: one short line per commit'],
      ['--graph', 'log: draw the branch graph'],
      ['-u, --set-upstream', 'push: remember the remote branch for git push / git pull'],
      ['--staged, --cached', 'diff / restore: the staging area'],
      ['--hard', 'reset: also overwrite files in the work tree'],
      ['-b NAME', 'checkout: create a new branch and switch to it'],
      ['-c NAME', 'switch: create a new branch and switch to it'],
      ['-d NAME', 'branch: delete a merged branch (-D: delete anyway)'],
      ['--global', 'config: the setting is for all your repositories'],
      ['--amend', 'commit: replace the last commit'],
      ['--tags', 'push: send all tags to the remote'],
      ['--grep TEXT', 'log: only commits whose message contains TEXT'],
      ['--author NAME', 'log: only commits by this author'],
      ['--abort', 'merge: give up a merge with conflicts'],
    ],
    examples: [
      ['git init', 'start versioning the current folder'],
      ['git add . && git commit -m "First commit"', 'save the first snapshot'],
      ['git log --oneline', 'short history'],
      ['git switch -c feature', 'a new branch for a feature'],
      ['git push -u origin main', 'publish main to GitHub'],
    ],
    seeAlso: ['gh', 'diff'],
  },
  run(ctx) {
    let args = [...ctx.args];
    const overrides: Record<string, string> = {};
    let dir = ctx.cwd;
    while (args.length) {
      if (args[0] === '-C' && args[1]) {
        dir = normalize(args[1], dir);
        args = args.slice(2);
      } else if (args[0] === '-c' && args[1]) {
        const [k, ...v] = args[1].split('=');
        overrides[k!.toLowerCase()] = v.join('=');
        args = args.slice(2);
      } else if (args[0] === '--no-pager' || args[0] === '-P') args = args.slice(1);
      else break;
    }
    const [cmd, ...rest] = args;
    if (!cmd || cmd === 'help' || cmd === '--help') {
      ctx.out(GIT_USAGE);
      return cmd ? 0 : 1;
    }
    if (cmd === '--version' || cmd === 'version') {
      ctx.out(`git version ${GIT_VERSION}\n`);
      return 0;
    }
    const fn = sub[cmd];
    if (!fn) {
      const near = Object.keys(sub).find((s) => s.startsWith(cmd.slice(0, 3)));
      ctx.err(`git: '${cmd}' is not a git command. See 'git --help'.\n${near ? `\nThe most similar command is\n\t${near}\n` : ''}`);
      return 1;
    }
    const prevCwd = ctx.cwd;
    // -C: run as if started in DIR
    if (dir !== prevCwd) {
      if (node(ctx, dir)?.type !== 'dir') {
        ctx.err(`fatal: cannot change to '${dir}': No such file or directory\n`);
        return 128;
      }
      ctx.shell.setCwd(dir);
    }
    const quiet = rest.some((a) => a === '--quiet' || /^-[a-zA-Z]*q[a-zA-Z]*$/.test(a)) && cmd !== 'log' && cmd !== 'grep';
    const before = ctx.chunks().length;
    try {
      const code = fn(ctx, rest.filter((a) => a !== '-q' && a !== '--quiet').map((a) => (/^-[a-zA-Z]*q[a-zA-Z]*$/.test(a) ? a.replace('q', '') : a)), { repo: findRepo(ctx, ctx.cwd), overrides });
      if (quiet) {
        // -q: keep only errors
        const chunks = ctx.chunks();
        const keep = chunks.slice(before).filter((c) => c.stream === 'stderr' && (code !== 0 || /^(error|fatal|warning)/m.test(c.text)));
        chunks.splice(before, chunks.length - before, ...keep);
      }
      return code;
    } catch (e) {
      if (e instanceof FsError) {
        ctx.err(`fatal: ${e.code === 'EACCES' ? 'Permission denied' : e.message}\n`);
        return 128;
      }
      throw e;
    } finally {
      if (dir !== prevCwd) ctx.shell.setCwd(prevCwd);
    }
  },
};

// ------------------------------------------------------------------ gh (GitHub CLI)

function ghRepoOf(ctx: Ctx, arg?: string): { owner: string; name: string; repo: Repo } | null {
  if (arg) {
    const [owner, name] = arg.includes('/') ? arg.split('/') : [ctx.shell.users().find((u) => u.uid === 1000)?.name ?? ctx.user, arg];
    const repo = openRemote(ctx, `https://github.com/${owner}/${name}`);
    return repo ? { owner: owner!, name: name!.replace(/\.git$/, ''), repo } : null;
  }
  const local = findRepo(ctx, ctx.cwd);
  const url = local ? (local.db.remotes.origin ?? Object.values(local.db.remotes)[0]) : undefined;
  const m = url ? /github\.com[/:]([\w.-]+)\/([\w.-]+?)(?:\.git)?$/.exec(url) : null;
  if (!m) return null;
  const repo = openRemote(ctx, url!);
  return repo ? { owner: m[1]!, name: m[2]!, repo } : null;
}

function ghUser(ctx: Ctx): string {
  return ctx.shell.users().find((u) => u.uid === 1000)?.name ?? ctx.user;
}

const ghNoRepo = (ctx: Ctx) => {
  ctx.err('no git remotes found\n');
  return 1;
};

export const gh: CommandDef = {
  name: 'gh',
  category: 'network',
  doc: {
    summary: 'GitHub from the terminal: repositories, pull requests, issues',
    usage: ['gh COMMAND SUBCOMMAND [FLAGS]'],
    description: 'The official GitHub CLI. In the trainer GitHub is simulated: repositories live on a pretend github.com that only this machine can see.',
    options: [
      ['auth status', 'which GitHub account you are logged in to'],
      ['repo create NAME', 'create a repository on GitHub (--public / --private)'],
      ['repo clone OWNER/NAME', 'clone a GitHub repository'],
      ['repo view', 'show the repository and its README'],
      ['repo list', 'your repositories'],
      ['pr create', 'open a pull request from the current branch (--title, --body, --base)'],
      ['pr list', 'open pull requests'],
      ['pr view N', 'one pull request'],
      ['pr merge N', 'merge a pull request on GitHub (--merge, --squash)'],
      ['pr checkout N', 'check out the branch of a pull request'],
      ['issue create', 'open an issue (--title, --body)'],
      ['issue list', 'open issues'],
      ['issue close N', 'close an issue'],
      ['release create TAG', 'publish a release for a tag (--title, --notes)'],
      ['release list', 'releases of the repository'],
      ['--title, -t TEXT', 'title of a pull request or issue'],
      ['--body, -b TEXT', 'description of a pull request or issue'],
      ['--base, -B BRANCH', 'pr create: the branch to merge into (default: main)'],
      ['--public', 'repo create: visible to everyone'],
      ['--private', 'repo create: visible only to you'],
    ],
    examples: [
      ['gh repo create site --public', 'a new public repository'],
      ['gh pr create --title "Add contacts" --body "New page"', 'open a pull request'],
      ['gh pr merge 1 --merge', 'merge pull request #1'],
    ],
    seeAlso: ['git'],
  },
  run(ctx) {
    const [area, action, ...rest] = ctx.args;
    const val = (names: string[]): string | undefined => {
      for (let i = 0; i < rest.length; i++) {
        const a = rest[i]!;
        for (const n of names) {
          if (a === n) return rest[i + 1];
          if (a.startsWith(n + '=')) return a.slice(n.length + 1);
        }
      }
      return undefined;
    };
    const positional = rest.filter((a, i) => !a.startsWith('-') && !(i > 0 && /^-(t|b|B|H|n|R|-title|-body|-base|-head|-description|-notes|-repo)$/.test(rest[i - 1]!)));
    const user = ghUser(ctx);
    if (!area || area === '--help' || area === 'help') {
      ctx.out('Work seamlessly with GitHub from the command line.\n\nUSAGE\n  gh <command> <subcommand> [flags]\n\nCORE COMMANDS\n  auth:   Authenticate gh and git with GitHub\n  issue:  Manage issues\n  pr:     Manage pull requests\n  release: Manage releases\n  repo:   Manage repositories\n');
      return 0;
    }
    if (area === '--version') {
      ctx.out('gh version 2.45.0 (2024-03-04)\nhttps://github.com/cli/cli/releases/tag/v2.45.0\n');
      return 0;
    }
    if (area === 'auth') {
      if (action === 'status') {
        ctx.out(`github.com\n  ✓ Logged in to github.com account ${user} (keyring)\n  - Active account: true\n  - Git operations protocol: https\n  - Token scopes: 'gist', 'read:org', 'repo'\n`);
        return 0;
      }
      if (action === 'login') {
        ctx.out(`✓ Already logged in to github.com account ${user}\n`);
        return 0;
      }
    }
    if (area === 'repo') {
      if (action === 'create') {
        const name = positional[0];
        if (!name) {
          ctx.err('name argument required to create a repository\n');
          return 1;
        }
        const [owner, rname] = name.includes('/') ? name.split('/') : [user, name];
        const path = `${GITHUB_ROOT}/${owner}/${rname}.git`;
        if (readDb(ctx, path)) {
          ctx.err(`GraphQL: Name already exists on this account (createRepository)\n`);
          return 1;
        }
        const r = asRoot(ctx);
        mkdirp(r, path);
        const repo: Repo = { root: path, gitDir: path, db: { ...emptyDb(true), visibility: rest.includes('--private') ? 'private' : 'public', pulls: [], issues: [], ...(val(['--description', '-d']) ? { description: val(['--description', '-d'])! } : {}) } };
        saveDb(r, repo);
        ctx.fs = r.fs;
        ctx.out(`✓ Created repository ${owner}/${rname} on GitHub\n  https://github.com/${owner}/${rname}\n`);
        if (rest.includes('--clone')) return git.run(new Ctx('git', ['clone', `https://github.com/${owner}/${rname}.git`], null, ctx.machine, ctx.user, ctx.cred, ctx.home, ctx.now, ctx.isTTY, ctx.columns, ctx.shell));
        return 0;
      }
      if (action === 'clone') {
        const name = positional[0];
        if (!name) {
          ctx.err('cannot clone: repository argument required\n');
          return 1;
        }
        const full = name.includes('/') ? name : `${user}/${name}`;
        const r = ctx.shell.run(['git', 'clone', `https://github.com/${full}.git`, ...positional.slice(1)], null);
        ctx.forward(r.chunks);
        return r.code;
      }
      if (action === 'list') {
        const n = node(ctx, `${GITHUB_ROOT}/${positional[0] ?? user}`);
        const names = n && n.type === 'dir' ? Object.keys(n.children).map((x) => x.replace(/\.git$/, '')) : [];
        ctx.out(`\nShowing ${names.length} of ${names.length} repositories in @${positional[0] ?? user}\n\n${names.map((x) => `${positional[0] ?? user}/${x}\t${readDb(ctx, `${GITHUB_ROOT}/${positional[0] ?? user}/${x}.git`)?.visibility ?? 'public'}\n`).join('')}`);
        return 0;
      }
      if (action === 'view') {
        const r = ghRepoOf(ctx, positional[0]);
        if (!r) return ghNoRepo(ctx);
        const id = r.repo.db.branches[remoteHeadBranch(r.repo.db)];
        const readme = id ? r.repo.db.commits[id]!.tree['README.md'] : undefined;
        ctx.out(`${r.owner}/${r.name}\n${r.repo.db.description ?? 'No description provided'}\n\n${readme ?? 'This repository does not have a README'}\n\nView this repository on GitHub: https://github.com/${r.owner}/${r.name}\n`);
        return 0;
      }
    }
    if (area === 'release') {
      const r = ghRepoOf(ctx, val(['--repo', '-R']));
      if (!r) return ghNoRepo(ctx);
      const db = r.repo.db;
      db.releases ??= [];
      const url = `https://github.com/${r.owner}/${r.name}`;
      const tag = positional[0];
      if (action === 'create') {
        if (!tag) {
          ctx.err('could not create: no tag name provided\n');
          return 1;
        }
        if (db.releases.some((x) => x.tag === tag)) {
          ctx.err(`HTTP 422: Validation Failed (${url.replace('https://github.com', 'https://api.github.com/repos')}/releases)\nRelease.tag_name already exists\n`);
          return 1;
        }
        if (db.tags[tag] === undefined) {
          // like GitHub: a missing tag is created from the default branch
          const head = db.branches[remoteHeadBranch(db)];
          if (!head) {
            ctx.err('HTTP 422: Validation Failed\nRepository is empty\n');
            return 1;
          }
          db.tags[tag] = head;
        }
        db.releases.push({ tag, title: val(['--title', '-t']) ?? tag, notes: val(['--notes', '-n']) ?? '', author: user, time: ctx.now });
        const root = asRoot(ctx);
        saveDb(root, r.repo);
        ctx.fs = root.fs;
        ctx.out(`${url}/releases/tag/${tag}\n`);
        return 0;
      }
      if (action === 'list') {
        const list = [...db.releases].reverse();
        if (!list.length) {
          ctx.err('no releases found\n');
          return 1;
        }
        ctx.out(list.map((x, i) => `${x.title}\t${i === 0 ? 'Latest' : ''}\t${x.tag}\t${new Date(x.time).toISOString().slice(0, 10)}\n`).join(''));
        return 0;
      }
      if (action === 'view') {
        const x = tag ? db.releases.find((y) => y.tag === tag) : db.releases[db.releases.length - 1];
        if (!x) {
          ctx.err('release not found\n');
          return 1;
        }
        ctx.out(`${x.title}\n${x.tag}\n${x.author} released this ${new Date(x.time).toISOString().slice(0, 10)}\n\n  ${x.notes || 'No release notes'}\n\nView on GitHub: ${url}/releases/tag/${x.tag}\n`);
        return 0;
      }
      ctx.err(`unknown command "release ${action ?? ''}" for "gh"\n`);
      return 1;
    }
    if (area === 'pr' || area === 'issue') {
      const r = ghRepoOf(ctx, val(['--repo', '-R']));
      if (!r) return ghNoRepo(ctx);
      const db = r.repo.db;
      db.pulls ??= [];
      db.issues ??= [];
      const nextNumber = () => db.pulls!.length + db.issues!.length + 1;
      const save = () => {
        const root = asRoot(ctx);
        saveDb(root, r.repo);
        ctx.fs = root.fs;
      };
      const url = `https://github.com/${r.owner}/${r.name}`;
      if (area === 'issue') {
        if (action === 'create') {
          const title = val(['--title', '-t']);
          if (!title) {
            ctx.err('must provide `--title` and `--body` when not running interactively\n');
            return 1;
          }
          const n = nextNumber();
          db.issues.push({ number: n, title, body: val(['--body', '-b']) ?? '', state: 'OPEN', author: user });
          save();
          ctx.out(`\nCreating issue in ${r.owner}/${r.name}\n\n${url}/issues/${n}\n`);
          return 0;
        }
        if (action === 'list') {
          const open = db.issues.filter((i) => i.state === 'OPEN');
          ctx.out(open.length ? `\nShowing ${open.length} of ${open.length} open issues in ${r.owner}/${r.name}\n\n${open.map((i) => `#${i.number}\t${i.title}\n`).join('')}` : `no open issues in ${r.owner}/${r.name}\n`);
          return 0;
        }
        if (action === 'close') {
          const i = db.issues.find((x) => x.number === Number(String(positional[0]).replace('#', '')));
          if (!i) {
            ctx.err(`GraphQL: Could not resolve to an issue with the number of ${positional[0]}.\n`);
            return 1;
          }
          i.state = 'CLOSED';
          save();
          ctx.out(`✓ Closed issue ${r.owner}/${r.name}#${i.number} (${i.title})\n`);
          return 0;
        }
      }
      if (area === 'pr') {
        if (action === 'create') {
          const local = findRepo(ctx, ctx.cwd);
          const head = val(['--head', '-H']) ?? (local ? currentBranch(local.db) : null);
          const base = val(['--base', '-B']) ?? remoteHeadBranch(db);
          const title = val(['--title', '-t']) ?? (rest.includes('--fill') && local && head ? subject(local.db.commits[local.db.branches[head]!]?.message ?? head) : undefined);
          if (!title) {
            ctx.err('must provide `--title` and `--body` (or `--fill`) when not running interactively\n');
            return 1;
          }
          if (!head || db.branches[head] === undefined) {
            ctx.err(`aborted: you must first push the current branch to a remote, or use the --head flag\n`);
            return 1;
          }
          if (head === base) {
            ctx.err(`could not create a pull request: head branch "${head}" is the same as base branch "${base}"\n`);
            return 1;
          }
          if (db.pulls.some((p) => p.head === head && p.state === 'OPEN')) {
            ctx.err(`a pull request for branch "${head}" into branch "${base}" already exists:\n${url}/pull/${db.pulls.find((p) => p.head === head)!.number}\n`);
            return 1;
          }
          if (ancestors(db, db.branches[base]).has(db.branches[head]!)) {
            ctx.err(`pull request create failed: GraphQL: No commits between ${base} and ${head} (createPullRequest)\n`);
            return 1;
          }
          const n = nextNumber();
          db.pulls.push({ number: n, title, body: val(['--body', '-b']) ?? '', head, base, state: 'OPEN', author: user });
          save();
          ctx.out(`\nCreating pull request for ${head} into ${base} in ${r.owner}/${r.name}\n\n${url}/pull/${n}\n`);
          return 0;
        }
        if (action === 'list') {
          const open = db.pulls.filter((p) => p.state === 'OPEN');
          ctx.out(open.length ? `\nShowing ${open.length} of ${open.length} open pull requests in ${r.owner}/${r.name}\n\n${open.map((p) => `#${p.number}\t${p.title}\t${p.head}\tOPEN\n`).join('')}` : `no open pull requests in ${r.owner}/${r.name}\n`);
          return 0;
        }
        const pr = db.pulls.find((p) => p.number === Number(String(positional[0] ?? '').replace('#', '')));
        if (!pr) {
          ctx.err(`GraphQL: Could not resolve to a PullRequest with the number of ${positional[0] ?? '?'}. (repository.pullRequest)\n`);
          return 1;
        }
        if (action === 'view') {
          const head = db.branches[pr.head];
          const base = db.branches[pr.base];
          const commits = head ? history(db, [head]).filter((c) => !ancestors(db, base).has(c.id)).length : 0;
          ctx.out(`${pr.title} #${pr.number}\n${pr.state === 'OPEN' ? 'Open' : pr.state === 'MERGED' ? 'Merged' : 'Closed'} • ${pr.author} wants to merge ${commits} commit${commits === 1 ? '' : 's'} into ${pr.base} from ${pr.head}\n\n  ${pr.body || 'No description provided'}\n\nView this pull request on GitHub: ${url}/pull/${pr.number}\n`);
          return 0;
        }
        if (action === 'checkout') {
          const local = findRepo(ctx, ctx.cwd);
          if (!local) return ghNoRepo(ctx);
          const f = ctx.shell.run(['git', 'fetch'], null);
          if (f.code) {
            ctx.forward(f.chunks);
            return f.code;
          }
          const s = ctx.shell.run(['git', 'switch', pr.head], null);
          ctx.forward(s.chunks);
          return s.code;
        }
        if (action === 'merge') {
          if (pr.state !== 'OPEN') {
            ctx.err(`! Pull request ${r.owner}/${r.name}#${pr.number} (${pr.title}) was already merged\n`);
            return 1;
          }
          const head = db.branches[pr.head];
          const baseId = db.branches[pr.base];
          if (!head) {
            ctx.err(`the head branch ${pr.head} no longer exists\n`);
            return 1;
          }
          const squash = rest.includes('--squash') || rest.includes('-s');
          const rebase = rest.includes('--rebase') || rest.includes('-r');
          const time = Math.max(ctx.now, ...Object.values(db.commits).map((c) => c.time + 60_000));
          if (!baseId || ancestors(db, head).has(baseId)) {
            if (squash && baseId) {
              const data = { parents: [baseId], tree: db.commits[head]!.tree, message: `${pr.title} (#${pr.number})`, author: user, email: `${user}@users.noreply.github.com`, time };
              const c = { id: commitId(data), ...data };
              db.commits[c.id] = c;
              db.branches[pr.base] = c.id;
            } else if (rebase || !baseId) db.branches[pr.base] = head;
            else {
              const data = { parents: [baseId, head], tree: db.commits[head]!.tree, message: `Merge pull request #${pr.number} from ${r.owner}/${pr.head}\n\n${pr.title}`, author: user, email: `${user}@users.noreply.github.com`, time };
              const c = { id: commitId(data), ...data };
              db.commits[c.id] = c;
              db.branches[pr.base] = c.id;
            }
          } else {
            // base moved on: merge without conflicts or refuse
            const base = db.commits[mergeBase(db, baseId, head) ?? '']?.tree ?? {};
            const ours = db.commits[baseId]!.tree;
            const theirs = db.commits[head]!.tree;
            const tree: Record<string, string> = {};
            for (const p of new Set([...Object.keys(base), ...Object.keys(ours), ...Object.keys(theirs)])) {
              const m = merge3(base[p], ours[p], theirs[p], pr.head);
              if (m.conflict) {
                ctx.err(`X Pull request ${r.owner}/${r.name}#${pr.number} is not mergeable: the merge commit cannot be cleanly created.\nTo have the pull request merged after all the requirements have been met, add the \`--auto\` flag.\nRun the following to resolve the merge conflicts locally:\n  gh pr checkout ${pr.number} && git fetch origin ${pr.base} && git merge origin/${pr.base}\n`);
                return 1;
              }
              if (m.text !== undefined) tree[p] = m.text;
            }
            const data = { parents: squash ? [baseId] : [baseId, head], tree, message: squash ? `${pr.title} (#${pr.number})` : `Merge pull request #${pr.number} from ${r.owner}/${pr.head}\n\n${pr.title}`, author: user, email: `${user}@users.noreply.github.com`, time };
            const c = { id: commitId(data), ...data };
            db.commits[c.id] = c;
            db.branches[pr.base] = c.id;
          }
          pr.state = 'MERGED';
          const del = rest.includes('--delete-branch') || rest.includes('-d');
          if (del) delete db.branches[pr.head];
          save();
          ctx.out(`✓ ${squash ? 'Squashed and merged' : rebase ? 'Rebased and merged' : 'Merged'} pull request ${r.owner}/${r.name}#${pr.number} (${pr.title})\n${del ? `✓ Deleted remote branch ${pr.head}\n` : ''}`);
          return 0;
        }
        if (action === 'close') {
          pr.state = 'CLOSED';
          save();
          ctx.out(`✓ Closed pull request ${r.owner}/${r.name}#${pr.number} (${pr.title})\n`);
          return 0;
        }
      }
    }
    ctx.err(`unknown command "${[area, action].filter(Boolean).join(' ')}" for "gh"\n`);
    return 1;
  },
};

/** For checks: the git database of the repository at (or containing) a path. */
export function gitDbAt(fs: DirNode, abs: string): GitDb | null {
  let cur = abs;
  for (;;) {
    for (const g of [cur === '/' ? '/.git' : `${cur}/.git`, cur]) {
      try {
        const n = resolve(fs, `${g}/${DB}`, ROOT_CRED, true).node;
        if (n.type === 'file') return JSON.parse(n.content) as GitDb;
      } catch {
        /* keep looking */
      }
    }
    if (cur === '/') return null;
    cur = cur.slice(0, cur.lastIndexOf('/')) || '/';
  }
}

/** For checks: is the work tree clean (no staged, unstaged or untracked changes)? */
export function gitWorkTreeOf(fs: DirNode, abs: string): Record<string, string> {
  try {
    const n = resolve(fs, abs, ROOT_CRED, true).node;
    if (n.type !== 'dir') return {};
    const out: Record<string, string> = {};
    const walk = (d: DirNode, prefix: string) => {
      for (const [name, child] of Object.entries(d.children)) {
        if (!prefix && name === '.git') continue;
        const r = prefix ? `${prefix}/${name}` : name;
        if (child.type === 'dir') walk(child, r);
        else if (child.type === 'file') out[r] = child.content;
      }
    };
    walk(n, '');
    return out;
  } catch {
    return {};
  }
}

export { headCommit as gitHeadCommit, ancestors as gitAncestors, currentBranch as gitCurrentBranch, ignoreMatcher as gitIgnoreMatcher };
