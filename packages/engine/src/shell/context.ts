import type { DirNode, Machine, OutputChunk, ProcessInfo, Service, ShellEvent, UserInfo } from '../types';
import {
  can,
  FsError,
  makeDir,
  makeFile,
  putChild,
  resolve,
  resolveParent,
  updateAt,
  R,
  W,
  X,
  type Cred,
  type Resolved,
} from '../vfs/fs';
import { normalize } from '../vfs/path';

export interface CommandDoc {
  /** One-line summary, e.g. "list directory contents" */
  summary: string;
  /** Usage lines without the "Usage:" prefix. */
  usage: string[];
  /** Short paragraph shown in --help after usage. */
  description?: string;
  /** [flags, description] e.g. ['-a, --all', 'do not ignore entries starting with .'] */
  options?: [string, string][];
  /** Extra paragraphs for man page. */
  notes?: string[];
  examples?: [string, string][];
  seeAlso?: string[];
}

/** Max size of a single file the simulator lets you create (1 MiB). */
export const MAX_FILE_SIZE = 1 << 20;

export interface RunResult {
  chunks: OutputChunk[];
  code: number;
}

export interface ShellApi {
  getFs(): DirNode;
  setFs(fs: DirNode): void;
  processes(): ProcessInfo[];
  setProcesses(p: ProcessInfo[]): void;
  services(): Service[];
  users(): UserInfo[];
  /** Commands of the pipeline currently running (empty for a single command). */
  pipeline(): string[];
  /** Next line for `read` (shared stdin of a while-read loop). */
  readLine(stdin: string | null): string | null;
  /** break / continue: false if not inside a loop. */
  loopControl(kind: 'break' | 'continue', n: number): boolean;
  setUsers(u: UserInfo[]): void;
  setServices(s: Service[]): void;
  cwd(): string;
  setCwd(path: string): void;
  getVar(name: string): string | undefined;
  setVar(name: string, value: string, exported?: boolean): void;
  exportVar(name: string): void;
  unsetVar(name: string): void;
  exportedVars(): Record<string, string>;
  aliases(): Record<string, string>;
  setAlias(name: string, value: string): void;
  unalias(name: string): boolean;
  history(): string[];
  clearHistory(): void;
  emit(event: ShellEvent): void;
  /** Stop the current script / list (the `exit` builtin). */
  requestExit(): void;
  /** Run an argv as a command (used by sudo, xargs, find -exec, which). */
  run(argv: string[], stdin: string | null, opts?: { asUser?: string }): RunResult;
  /** Run a script source (bash file.sh / source). */
  runScript(source: string, args: string[], opts: { subshell: boolean; name: string; stdin: string | null }): RunResult;
  /** Is there a command or builtin with this name? */
  lookup(name: string): CommandDef | undefined;
  commandNames(): string[];
  pushUser(user: string): void;
  popUser(): boolean;
}

export class Ctx {
  private outBuf: OutputChunk[] = [];

  constructor(
    public readonly name: string,
    public readonly args: string[],
    public readonly stdin: string | null,
    public readonly machine: Machine,
    public readonly user: string,
    public readonly cred: Cred,
    public readonly home: string,
    public readonly now: number,
    public readonly isTTY: boolean,
    public readonly columns: number,
    public readonly shell: ShellApi,
  ) {}

  /** Live root of the file system (trees are immutable; the reference is replaced). */
  get fs(): DirNode {
    return this.shell.getFs();
  }
  set fs(v: DirNode) {
    this.shell.setFs(v);
  }

  get cwd(): string {
    return this.shell.cwd();
  }

  out(text: string): void {
    if (text) this.outBuf.push({ stream: 'stdout', text });
  }
  err(text: string): void {
    if (text) this.outBuf.push({ stream: 'stderr', text });
  }
  /** Print `name: message` to stderr. */
  fail(message: string): void {
    this.err(`${this.name}: ${message}\n`);
  }
  /** Forward output of a nested command. */
  forward(chunks: OutputChunk[]): void {
    this.outBuf.push(...chunks);
  }
  chunks(): OutputChunk[] {
    return this.outBuf;
  }

  abs(path: string): string {
    // keep a trailing slash: it matters (file.txt/ -> ENOTDIR)
    const n = normalize(path, this.cwd);
    return path.length > 1 && path.endsWith('/') && n !== '/' ? n + '/' : n;
  }

  stat(path: string, follow = true): Resolved {
    return resolve(this.fs, this.abs(path), this.cred, follow);
  }

  tryStat(path: string, follow = true): Resolved | null {
    try {
      return this.stat(path, follow);
    } catch {
      return null;
    }
  }

  get defaults() {
    const u = this.machine.users.find((x) => x.name === this.user);
    const group = this.cred.root ? 'root' : (u?.groups[0] ?? this.user);
    return { owner: this.user, group, now: this.now };
  }

  /** Read a regular file's text. Throws FsError. */
  readFile(path: string): string {
    const { node } = this.stat(path);
    if (node.type === 'dir') throw new FsError('EISDIR', path);
    if (node.type !== 'file') throw new FsError('EINVAL', path);
    if (!can(node, this.cred, R)) throw new FsError('EACCES', path);
    return node.content;
  }

  /** Create or overwrite (or append to) a regular file. */
  writeFile(path: string, content: string, append = false): void {
    const absPath = this.abs(path);
    if (absPath === '/dev/null') return;
    // existing target (following symlinks)?
    let existing: Resolved | null = null;
    try {
      existing = resolve(this.fs, absPath, this.cred, true);
    } catch (e) {
      if (!(e instanceof FsError) || e.code !== 'ENOENT') throw e;
    }
    if (existing) {
      const { node, canon } = existing;
      if (node.type === 'dir') throw new FsError('EISDIR', path);
      if (!can(node, this.cred, W)) throw new FsError('EACCES', path);
      if ((append && node.type === 'file' ? node.content.length : 0) + content.length > MAX_FILE_SIZE) throw new FsError('EFBIG', path);
      const now = this.now;
      this.fs = updateAt(this.fs, canon, (n) => {
        if (n.type !== 'file') return;
        n.content = append ? n.content + content : content;
        delete n.fakeSize;
        n.mtime = now;
      });
      return;
    }
    if (absPath.endsWith('/')) throw new FsError('EISDIR', path);
    const ref = resolveParent(this.fs, absPath, this.cred);
    if (ref.existing && ref.existing.type === 'symlink') {
      // dangling symlink: create the target
      const target = normalize(ref.existing.target, '/' + ref.parentCanon.join('/'));
      this.writeFile(target, content, append);
      return;
    }
    if (!can(ref.parent, this.cred, W) || !can(ref.parent, this.cred, X)) throw new FsError('EACCES', path);
    if (content.length > MAX_FILE_SIZE) throw new FsError('EFBIG', path);
    this.fs = putChild(this.fs, ref.parentCanon, makeFile(ref.name, content, this.defaults), this.now);
  }

  mkdir(path: string, mode = 0o755): void {
    const ref = resolveParent(this.fs, this.abs(path), this.cred);
    if (ref.existing) throw new FsError('EEXIST', path);
    if (!can(ref.parent, this.cred, W) || !can(ref.parent, this.cred, X)) throw new FsError('EACCES', path);
    this.fs = putChild(this.fs, ref.parentCanon, makeDir(ref.name, this.defaults, mode), this.now);
  }
}

export interface CommandDef {
  name: string;
  doc: CommandDoc;
  /** Shell builtin (affects `type`, `which`). */
  builtin?: boolean;
  /** Don't treat `--help` specially (echo). */
  noHelp?: boolean;
  /** Category for the in-app command reference. */
  category?: 'navigation' | 'files' | 'text' | 'search' | 'permissions' | 'system' | 'network' | 'shell' | 'help';
  run(ctx: Ctx): number;
}
