import { produce, type Draft } from 'immer';
import type { DirNode, FileNode, FsNode, SymlinkNode } from '../types';
import { normalize, splitPath } from './path';

export type Errno =
  | 'ENOENT'
  | 'ENOTDIR'
  | 'EISDIR'
  | 'EACCES'
  | 'EEXIST'
  | 'ENOTEMPTY'
  | 'ELOOP'
  | 'EINVAL'
  | 'EPERM'
  | 'EBUSY'
  | 'EFBIG';

export const ERRNO_TEXT: Record<Errno, string> = {
  ENOENT: 'No such file or directory',
  ENOTDIR: 'Not a directory',
  EISDIR: 'Is a directory',
  EACCES: 'Permission denied',
  EEXIST: 'File exists',
  ENOTEMPTY: 'Directory not empty',
  ELOOP: 'Too many levels of symbolic links',
  EINVAL: 'Invalid argument',
  EPERM: 'Operation not permitted',
  EBUSY: 'Device or resource busy',
  EFBIG: 'File too large',
};

export class FsError extends Error {
  constructor(
    public readonly code: Errno,
    public readonly path = '',
  ) {
    super(`${code}: ${ERRNO_TEXT[code]}${path ? ` (${path})` : ''}`);
    this.name = 'FsError';
  }
  get text(): string {
    return ERRNO_TEXT[this.code];
  }
}

/** Credentials of the acting user. */
export interface Cred {
  name: string;
  groups: string[];
  root: boolean;
}

export const R = 4;
export const W = 2;
export const X = 1;

export function can(node: FsNode, cred: Cred, bit: number): boolean {
  if (cred.root) {
    // root may do anything, except execute a file that has no x bit at all
    if (bit === X && node.type === 'file') return (node.mode & 0o111) !== 0;
    return true;
  }
  const shift = node.owner === cred.name ? 6 : cred.groups.includes(node.group) ? 3 : 0;
  return ((node.mode >> shift) & bit) !== 0;
}

export function utf8Length(s: string): number {
  let n = 0;
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i);
    if (c < 0x80) n += 1;
    else if (c < 0x800) n += 2;
    else if (c >= 0xd800 && c <= 0xdbff) {
      n += 4;
      i++;
    } else n += 3;
  }
  return n;
}

export function nodeSize(node: FsNode): number {
  switch (node.type) {
    case 'file':
      return node.fakeSize ?? utf8Length(node.content);
    case 'dir':
      return 4096;
    case 'symlink':
      return utf8Length(node.target);
  }
}

/** Disk usage in KiB as `du`/`ls -s` would report (4K blocks). */
export function nodeBlocksK(node: FsNode): number {
  if (node.type === 'dir') return 4;
  if (node.type === 'symlink') return 0;
  return Math.ceil(nodeSize(node) / 4096) * 4;
}

export interface Resolved {
  node: FsNode;
  /** Canonical (physical) path segments. */
  canon: string[];
}

const MAX_SYMLINK_HOPS = 40;

/**
 * Resolve an absolute path, checking search (x) permission on every traversed
 * directory and following symlinks. The final component is followed only when
 * `followLast` is set (stat vs lstat semantics).
 */
export function resolve(root: DirNode, absPath: string, cred: Cred, followLast = true): Resolved {
  const trailingSlash = absPath.length > 1 && absPath.endsWith('/');
  let segs = splitPath(absPath);
  let canon: string[] = [];
  let chain: FsNode[] = [root];
  let node: FsNode = root;
  let hops = 0;
  while (segs.length > 0) {
    const seg = segs.shift()!;
    if (node.type !== 'dir') throw new FsError('ENOTDIR', absPath);
    if (seg === '.') continue;
    if (seg === '..') {
      if (canon.length > 0) {
        canon.pop();
        chain.pop();
      }
      node = chain[chain.length - 1]!;
      continue;
    }
    if (!can(node, cred, X)) throw new FsError('EACCES', absPath);
    const child: FsNode | undefined = Object.prototype.hasOwnProperty.call(node.children, seg)
      ? node.children[seg]
      : undefined;
    if (!child) throw new FsError('ENOENT', absPath);
    if (child.type === 'symlink' && (segs.length > 0 || followLast || trailingSlash)) {
      if (++hops > MAX_SYMLINK_HOPS) throw new FsError('ELOOP', absPath);
      if (child.target.startsWith('/')) {
        canon = [];
        chain = [root];
        node = root;
      }
      segs = [...splitPath(child.target), ...segs];
      continue;
    }
    canon.push(seg);
    chain.push(child);
    node = child;
  }
  if (trailingSlash && node.type !== 'dir') throw new FsError('ENOTDIR', absPath);
  return { node, canon };
}

export function tryResolve(root: DirNode, absPath: string, cred: Cred, followLast = true): Resolved | null {
  try {
    return resolve(root, absPath, cred, followLast);
  } catch {
    return null;
  }
}

/** Unchecked lookup by canonical segments (no symlinks, no permissions). */
export function getAt(root: DirNode, canon: readonly string[]): FsNode | undefined {
  let node: FsNode = root;
  for (const seg of canon) {
    if (node.type !== 'dir') return undefined;
    const next: FsNode | undefined = node.children[seg];
    if (!next) return undefined;
    node = next;
  }
  return node;
}

export interface ParentRef {
  parent: DirNode;
  parentCanon: string[];
  name: string;
  /** Existing entry with that name (not followed). */
  existing: FsNode | undefined;
}

/** Resolve the directory that would contain `absPath`. */
export function resolveParent(root: DirNode, absPath: string, cred: Cred): ParentRef {
  const norm = absPath.replace(/\/+$/, '') || '/';
  if (norm === '/') throw new FsError('EBUSY', absPath);
  const idx = norm.lastIndexOf('/');
  const parentPath = idx <= 0 ? '/' : norm.slice(0, idx);
  const name = norm.slice(idx + 1);
  if (name === '.' || name === '..') throw new FsError('EINVAL', absPath);
  const { node, canon } = resolve(root, parentPath, cred, true);
  if (node.type !== 'dir') throw new FsError('ENOTDIR', absPath);
  return { parent: node, parentCanon: canon, name, existing: node.children[name] };
}

function draftAt(root: Draft<DirNode>, canon: readonly string[]): Draft<FsNode> {
  let node: Draft<FsNode> = root;
  for (const seg of canon) {
    if (node.type !== 'dir') throw new FsError('ENOTDIR', '/' + canon.join('/'));
    const next: Draft<FsNode> | undefined = node.children[seg];
    if (!next) throw new FsError('ENOENT', '/' + canon.join('/'));
    node = next;
  }
  return node;
}

/** Insert or replace a child entry. */
export function putChild(root: DirNode, parentCanon: readonly string[], node: FsNode, now: number): DirNode {
  return produce(root, (draft) => {
    const parent = draftAt(draft, parentCanon);
    if (parent.type !== 'dir') throw new FsError('ENOTDIR');
    parent.children[node.name] = node as Draft<FsNode>;
    parent.mtime = now;
  });
}

export function removeChild(root: DirNode, parentCanon: readonly string[], name: string, now: number): DirNode {
  return produce(root, (draft) => {
    const parent = draftAt(draft, parentCanon);
    if (parent.type !== 'dir') throw new FsError('ENOTDIR');
    delete parent.children[name];
    parent.mtime = now;
  });
}

export function updateAt(root: DirNode, canon: readonly string[], recipe: (n: Draft<FsNode>) => void): DirNode {
  return produce(root, (draft) => {
    recipe(draftAt(draft, canon));
  });
}

/** Is `inner` equal to or nested inside `outer` (both canonical)? */
export function isInside(inner: readonly string[], outer: readonly string[]): boolean {
  if (inner.length < outer.length) return false;
  return outer.every((s, i) => inner[i] === s);
}

export function canonToPath(canon: readonly string[]): string {
  return '/' + canon.join('/');
}

// ---------- node constructors ----------

export interface NodeDefaults {
  owner: string;
  group: string;
  now: number;
}

export function makeFile(name: string, content: string, d: NodeDefaults, mode = 0o644): FileNode {
  return { type: 'file', name, content, mode, owner: d.owner, group: d.group, mtime: d.now };
}

export function makeDir(name: string, d: NodeDefaults, mode = 0o755, children: Record<string, FsNode> = {}): DirNode {
  return { type: 'dir', name, children, mode, owner: d.owner, group: d.group, mtime: d.now };
}

export function makeSymlink(name: string, target: string, d: NodeDefaults): SymlinkNode {
  return { type: 'symlink', name, target, mode: 0o777, owner: d.owner, group: d.group, mtime: d.now };
}

/** Deep copy a subtree under a new name (used by `cp -r`). */
export function cloneTree(node: FsNode, name: string, d: NodeDefaults, preserve: boolean): FsNode {
  const meta = preserve
    ? { name, mode: node.mode, owner: node.owner, group: node.group, mtime: node.mtime }
    : { name, mode: node.mode, owner: d.owner, group: d.group, mtime: d.now };
  switch (node.type) {
    case 'file':
      return { ...meta, type: 'file', content: node.content, ...(node.fakeSize !== undefined ? { fakeSize: node.fakeSize } : {}) };
    case 'symlink':
      return { ...meta, type: 'symlink', target: node.target, mode: 0o777 };
    case 'dir': {
      const children: Record<string, FsNode> = {};
      for (const [k, v] of Object.entries(node.children)) children[k] = cloneTree(v, k, d, preserve);
      return { ...meta, type: 'dir', children };
    }
  }
}

/** Walk a subtree depth-first (pre-order). Children are visited in collation order. */
export function* walkTree(
  node: FsNode,
  path: string,
  depth = 0,
): Generator<{ node: FsNode; path: string; depth: number }> {
  yield { node, path, depth };
  if (node.type === 'dir') {
    for (const name of Object.keys(node.children).sort(collate)) {
      const child = node.children[name]!;
      yield* walkTree(child, path === '/' ? `/${name}` : `${path}/${name}`, depth + 1);
    }
  }
}

/**
 * Approximation of glibc en_US.UTF-8 collation used by `ls`, `sort` and glob
 * ordering on a typical Ubuntu box: punctuation is ignored at the first level,
 * case-insensitive, then ties broken by lowercase-before-uppercase and bytes.
 */
export function collate(a: string, b: string): number {
  const ka = collationKey(a);
  const kb = collationKey(b);
  if (ka !== kb) return ka < kb ? -1 : 1;
  const la = a.toLowerCase();
  const lb = b.toLowerCase();
  if (la !== lb) return la < lb ? -1 : 1;
  // lowercase sorts before uppercase in en_US
  for (let i = 0; i < Math.min(a.length, b.length); i++) {
    if (a[i] !== b[i]) {
      const al = a[i] === a[i]!.toLowerCase();
      const bl = b[i] === b[i]!.toLowerCase();
      if (al !== bl) return al ? -1 : 1;
      return a[i]! < b[i]! ? -1 : 1;
    }
  }
  return a.length - b.length;
}

function collationKey(s: string): string {
  const key = s.toLowerCase().replace(/[^\p{L}\p{N}]/gu, '');
  return key === '' ? s : key;
}

export { normalize };
