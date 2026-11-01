import type { DirNode, DockerState, ExecOptions, ExecResult, ExecutedCommand, OutputChunk, ProcessInfo, Service, Session, ShellEvent, UserInfo } from '../types';
import { can, collate, FsError, resolve, R, X, type Cred } from '../vfs/fs';
import { basename, normalize } from '../vfs/path';
import { suggest } from '../util/levenshtein';
import { ArgError } from './args';
import { Ctx, type CommandDef, type RunResult, type ShellApi } from './context';
import { ArithError, expandWord, expandWordSingle, type ExpandEnv } from './expand';
import type { GlobFs } from './glob';
import { parse, ParseError, type Compound, type Script, type SimpleCommand } from './parser';
import { formatHelp } from './help';

export type Registry = ReadonlyMap<string, CommandDef>;

const MAX_STEPS = 5000;
const MAX_DEPTH = 24;
const DEFAULT_MAX_OUTPUT = 200_000;
const HISTORY_LIMIT = 1000;
/** Commands whose usage errors exit with 2 (GNU convention). */
const EXIT2_ON_USAGE = new Set(['ls', 'grep', 'diff', 'bash', 'sh']);
export const SHELL_PID = 1200;

class LimitError extends Error {}

type Sink = { kind: 'parent'; stream: 'stdout' | 'stderr' } | { kind: 'file'; path: string } | { kind: 'null' };

class Runner implements ShellApi {
  fs: DirNode;
  cwdPath: string;
  env: Record<string, string>;
  locals: Record<string, string>;
  aliasMap: Record<string, string>;
  hist: string[];
  user: string;
  userStack: { user: string; cwd: string }[];
  lastExit: number;
  events: ShellEvent[] = [];
  executed: ExecutedCommand[] = [];
  steps = 0;
  depth = 0;
  positional: string[] = [];
  scriptName = 'bash';
  sudoDepth = 0;
  readonly now: number;
  readonly columns: number;
  readonly isTTY: boolean;

  constructor(
    private readonly session: Session,
    private readonly registry: Registry,
    opts: ExecOptions,
  ) {
    this.fs = session.machine.fs;
    this.procs = session.machine.processes;
    this.svcs = session.machine.services ?? [];
    this.dock = session.machine.docker;
    this.usrs = session.machine.users;
    this.cwdPath = session.cwd;
    this.env = { ...session.env };
    this.locals = { ...session.locals };
    this.aliasMap = { ...session.aliases };
    this.hist = [...session.history];
    this.user = session.user;
    this.userStack = [...session.userStack];
    this.lastExit = session.lastExitCode;
    this.now = opts.now ?? Date.now();
    this.columns = Math.max(20, opts.columns ?? 80);
    this.isTTY = opts.isTTY ?? true;
  }

  procs: ProcessInfo[];
  svcs: Service[];
  usrs: UserInfo[];
  users() {
    return this.usrs;
  }
  setUsers(u: UserInfo[]) {
    this.usrs = u;
  }
  services() {
    return this.svcs;
  }
  setServices(s: Service[]) {
    this.svcs = s;
  }
  dock: DockerState | undefined;
  docker() {
    return this.dock;
  }
  setDocker(d: DockerState) {
    this.dock = d;
  }

  // ---------- ShellApi ----------
  processes() {
    return this.procs;
  }
  setProcesses(p: ProcessInfo[]) {
    this.procs = p;
  }
  getFs() {
    return this.fs;
  }
  setFs(fs: DirNode) {
    this.fs = fs;
  }
  cwd() {
    return this.cwdPath;
  }
  setCwd(path: string) {
    if (path !== this.cwdPath) this.env['OLDPWD'] = this.cwdPath;
    this.cwdPath = path;
    this.env['PWD'] = path;
  }
  getVar(name: string): string | undefined {
    switch (name) {
      case '?':
        return String(this.lastExit);
      case '$':
        return String(SHELL_PID);
      case '#':
        return String(this.positional.length);
      case '0':
        return this.scriptName;
      case '@':
      case '*':
        return this.positional.join(' ');
      case '!':
        return '';
      case 'RANDOM':
        return String((this.now / 1000 + this.steps * 7919) % 32768 | 0);
    }
    if (/^[1-9]$/.test(name)) return this.positional[Number(name) - 1];
    if (name in this.locals) return this.locals[name];
    return this.env[name];
  }
  setVar(name: string, value: string, exported = false) {
    if (exported || name in this.env) {
      this.env[name] = value;
      delete this.locals[name];
    } else {
      this.locals[name] = value;
    }
  }
  exportVar(name: string) {
    if (name in this.locals) {
      this.env[name] = this.locals[name]!;
      delete this.locals[name];
    } else if (!(name in this.env)) {
      this.env[name] = '';
    }
  }
  unsetVar(name: string) {
    delete this.env[name];
    delete this.locals[name];
  }
  exportedVars() {
    return { ...this.env };
  }
  aliases() {
    return { ...this.aliasMap };
  }
  setAlias(name: string, value: string) {
    this.aliasMap[name] = value;
  }
  unalias(name: string) {
    if (!(name in this.aliasMap)) return false;
    delete this.aliasMap[name];
    return true;
  }
  history() {
    return this.hist;
  }
  clearHistory() {
    this.hist = [];
  }
  emit(event: ShellEvent) {
    this.events.push(event);
  }
  requestExit() {
    this.exitRequested = true;
  }
  lookup(name: string) {
    return this.registry.get(name);
  }
  commandNames() {
    return [...this.registry.keys()];
  }
  pushUser(user: string) {
    this.userStack.push({ user: this.user, cwd: this.cwdPath });
    this.user = user;
    const home = this.home();
    this.env['HOME'] = home;
    this.env['USER'] = user;
    this.env['LOGNAME'] = user;
    this.setCwd(home);
  }
  popUser() {
    const prev = this.userStack.pop();
    if (!prev) return false;
    this.user = prev.user;
    this.env['HOME'] = this.home();
    this.env['USER'] = prev.user;
    this.env['LOGNAME'] = prev.user;
    this.setCwd(prev.cwd);
    return true;
  }

  run(argv: string[], stdin: string | null, opts: { asUser?: string } = {}): RunResult {
    if (!opts.asUser) return this.runCommand(argv, stdin, false, {});
    const prev = this.user;
    this.user = opts.asUser;
    this.sudoDepth++;
    try {
      return this.runCommand(argv, stdin, false, {});
    } finally {
      this.user = prev;
      this.sudoDepth--;
    }
  }

  runScript(source: string, args: string[], opts: { subshell: boolean; name: string; stdin: string | null }): RunResult {
    let script: Script;
    try {
      script = parse(source);
    } catch (e) {
      if (e instanceof ParseError) return { chunks: [{ stream: 'stderr', text: `${opts.name}: ${e.message}\n` }], code: 2 };
      throw e;
    }
    const saved = {
      cwd: this.cwdPath,
      env: { ...this.env },
      locals: { ...this.locals },
      aliases: { ...this.aliasMap },
      positional: this.positional,
      scriptName: this.scriptName,
      user: this.user,
      userStack: [...this.userStack],
    };
    this.positional = args;
    this.scriptName = opts.name;
    try {
      return this.runList(script, opts.stdin, false);
    } finally {
      this.exitRequested = false;
      this.positional = saved.positional;
      this.scriptName = saved.scriptName;
      if (opts.subshell) {
        this.cwdPath = saved.cwd;
        this.env = saved.env;
        this.locals = saved.locals;
        this.aliasMap = saved.aliases;
        this.user = saved.user;
        this.userStack = saved.userStack;
      }
    }
  }

  // ---------- helpers ----------
  home(): string {
    return this.usrs.find((u) => u.name === this.user)?.home ?? '/';
  }
  cred(): Cred {
    const u = this.usrs.find((x) => x.name === this.user);
    return { name: this.user, groups: u?.groups ?? [this.user], root: u?.uid === 0 };
  }

  globFs(): GlobFs {
    const cred = this.cred();
    return {
      list: (abs) => {
        try {
          const { node } = resolve(this.fs, abs, cred, true);
          if (node.type !== 'dir' || !can(node, cred, R)) return null;
          return Object.keys(node.children);
        } catch {
          return null;
        }
      },
      exists: (abs) => {
        try {
          resolve(this.fs, abs, cred, false);
          return true;
        } catch {
          return false;
        }
      },
      isDir: (abs) => {
        try {
          return resolve(this.fs, abs, cred, true).node.type === 'dir';
        } catch {
          return false;
        }
      },
      compare: collate,
    };
  }

  expandEnv(): ExpandEnv {
    return {
      getVar: (n) => this.getVar(n),
      home: this.env['HOME'] ?? this.home(),
      cwd: this.cwdPath,
      fs: this.globFs(),
      runSub: (src) => {
        const res = this.runNested(() => {
          const script = parse(src);
          return this.runList(script, null, false);
        });
        let out = '';
        for (const c of res.chunks) {
          if (c.stream === 'stdout') out += c.text;
          else this.pendingStderr.push(c);
        }
        return out;
      },
    };
  }

  /** stderr produced while expanding words (command substitution). */
  pendingStderr: OutputChunk[] = [];

  runNested(fn: () => RunResult): RunResult {
    if (this.depth >= MAX_DEPTH) return { chunks: [{ stream: 'stderr', text: 'bash: maximum nesting level exceeded\n' }], code: 1 };
    this.depth++;
    try {
      return fn();
    } catch (e) {
      if (e instanceof ParseError) return { chunks: [{ stream: 'stderr', text: `bash: ${e.message}\n` }], code: 2 };
      throw e;
    } finally {
      this.depth--;
    }
  }

  // ---------- execution ----------
  runList(script: Script, stdin: string | null, tty: boolean): RunResult {
    const chunks: OutputChunk[] = [];
    let code = this.lastExit;
    let skip = false;
    let prevConnector: string | null = null;
    for (const item of script.items) {
      if (prevConnector === '&&') skip = code !== 0;
      else if (prevConnector === '||') skip = code === 0;
      else skip = false;
      if (!skip) {
        const res = this.runPipeline(item.pipeline, stdin, tty);
        chunks.push(...res.chunks);
        code = res.code;
        this.lastExit = code;
        if (this.exitRequested || this.loopCtl) break;
      }
      prevConnector = item.next;
    }
    return { chunks, code };
  }

  exitRequested = false;

  /** Raw text of the commands in the pipeline being run (ps shows its siblings). */
  pipelineCmds: string[] = [];
  pipeline() {
    return this.pipelineCmds;
  }

  runPipeline(cmds: SimpleCommand[], stdin: string | null, tty: boolean): RunResult {
    const prevPipeline = this.pipelineCmds;
    if (cmds.length > 1) this.pipelineCmds = cmds.filter((c) => !c.compound).map((c) => c.words.map((w) => w.raw.replace(/^(['"])(.*)\1$/, '$2')).join(' '));
    try {
      return this.runPipelineInner(cmds, stdin, tty);
    } finally {
      this.pipelineCmds = prevPipeline;
    }
  }

  private runPipelineInner(cmds: SimpleCommand[], stdin: string | null, tty: boolean): RunResult {
    const upward: OutputChunk[] = [];
    let input = stdin;
    let code = 0;
    cmds.forEach((cmd, i) => {
      const last = i === cmds.length - 1;
      const res = this.runSimple(cmd, input, last && tty);
      code = res.code;
      if (last) {
        upward.push(...res.chunks);
      } else {
        let piped = '';
        for (const c of res.chunks) {
          if (c.stream === 'stdout') piped += c.text;
          else upward.push(c);
        }
        input = piped;
      }
    });
    return { chunks: upward, code };
  }

  runSimple(cmd: SimpleCommand, stdin: string | null, tty: boolean): RunResult {
    try {
      return this.runSimpleInner(cmd, stdin, tty);
    } catch (e) {
      if (e instanceof ArithError) {
        this.pendingStderr = [];
        return { chunks: [{ stream: 'stderr', text: `bash: ${e.message}\n` }], code: 1 };
      }
      throw e;
    }
  }

  // ---------- loops and conditions ----------
  loopDepth = 0;
  loopCtl: { kind: 'break' | 'continue'; n: number } | null = null;
  /** Shared stdin of a while-read loop: `read` consumes it line by line. */
  readBuf: { rest: string } | null = null;

  readLine(stdin: string | null): string | null {
    if (this.readBuf) {
      if (this.readBuf.rest === '') return null;
      const nl = this.readBuf.rest.indexOf('\n');
      const line = nl === -1 ? this.readBuf.rest : this.readBuf.rest.slice(0, nl);
      this.readBuf.rest = nl === -1 ? '' : this.readBuf.rest.slice(nl + 1);
      return line;
    }
    if (!stdin) return null;
    const nl = stdin.indexOf('\n');
    return nl === -1 ? stdin : stdin.slice(0, nl);
  }

  loopControl(kind: 'break' | 'continue', n: number): boolean {
    if (this.loopDepth === 0) return false;
    this.loopCtl = { kind, n: Math.max(1, Math.min(n, this.loopDepth)) };
    return true;
  }

  runCompound(c: Compound, stdin: string | null, tty: boolean): RunResult {
    const res = this.runCompoundInner(c, stdin, tty);
    // record loops / conditions so that task checks can ask for them
    if (c.kind !== 'group') this.executed.push({ name: c.kind, args: [], exitCode: res.code });
    return res;
  }

  private runCompoundInner(c: Compound, stdin: string | null, tty: boolean): RunResult {
    const chunks: OutputChunk[] = [];
    let code = 0;
    const list = (sc: Script, input: string | null) => {
      const r = this.runList(sc, input, tty);
      chunks.push(...r.chunks);
      return r.code;
    };
    if (c.kind === 'group') return { chunks, code: list(c.body, stdin) };
    if (c.kind === 'if') {
      for (const cl of c.clauses) {
        if (list(cl.cond, stdin) === 0) return { chunks, code: list(cl.body, stdin) };
        if (this.exitRequested || this.loopCtl) return { chunks, code: this.lastExit };
      }
      code = c.otherwise ? list(c.otherwise, stdin) : 0;
      return { chunks, code };
    }
    const prevBuf = this.readBuf;
    if (c.kind !== 'for' && stdin !== null && !this.readBuf) this.readBuf = { rest: stdin };
    this.loopDepth++;
    let iterations = 0;
    try {
      const env = this.expandEnv();
      const items = c.kind === 'for' ? (c.list ? c.list.flatMap((w) => expandWord(w, env)) : this.positional) : null;
      for (;;) {
        if (++iterations > 10_000) throw new LimitError();
        if (c.kind === 'for') {
          if (iterations > items!.length) break;
          this.setVar(c.name, items![iterations - 1]!);
        } else {
          const ok = list(c.cond, stdin) === 0;
          if (this.exitRequested) break;
          if (ok !== (c.kind === 'while')) break;
        }
        code = list(c.body, stdin);
        if (this.exitRequested) break;
        if (this.loopCtl) {
          const ctl = this.loopCtl;
          if (ctl.n > 1) {
            this.loopCtl = { ...ctl, n: ctl.n - 1 };
            break;
          }
          this.loopCtl = null;
          if (ctl.kind === 'break') break;
        }
      }
    } finally {
      this.loopDepth--;
      this.readBuf = prevBuf;
    }
    return { chunks, code };
  }

  private runSimpleInner(cmd: SimpleCommand, stdin: string | null, tty: boolean): RunResult {
    if (++this.steps > MAX_STEPS) throw new LimitError();
    const env = this.expandEnv();
    const pre: OutputChunk[] = [];
    const flushPending = () => {
      pre.push(...this.pendingStderr);
      this.pendingStderr = [];
    };

    let argv = cmd.words.flatMap((w) => expandWord(w, env));
    // alias expansion (first word, unquoted)
    const first = cmd.words[0];
    if (first && first.parts.length === 1 && first.parts[0]!.t === 'lit' && first.parts[0]!.q === 0) {
      const alias = this.aliasMap[argv[0] ?? ''];
      if (alias !== undefined) {
        try {
          const aScript = parse(alias);
          const aCmd = aScript.items[0]?.pipeline[0];
          if (aScript.items.length === 1 && aScript.items[0]!.pipeline.length === 1 && aCmd && aCmd.redirects.length === 0) {
            const aArgv = aCmd.words.flatMap((w) => expandWord(w, env));
            argv = [...aArgv, ...argv.slice(1)];
          }
        } catch {
          /* ignore broken alias */
        }
      }
    }
    const assigns = cmd.assignments.map((a) => ({ name: a.name, value: expandWordSingle(a.value, env) }));
    flushPending();

    // ---- redirections ----
    const sinks: Record<1 | 2, Sink> = { 1: { kind: 'parent', stream: 'stdout' }, 2: { kind: 'parent', stream: 'stderr' } };
    let input = stdin;
    const cred = this.cred();
    for (const r of cmd.redirects) {
      if (r.op === '>&') {
        const targetFd = expandWordSingle(r.target, env);
        if (targetFd !== '1' && targetFd !== '2') {
          // `>& file` is the same as `&> file`
          const path = targetFd;
          const err = this.openForWrite(path, false);
          if (err) return { chunks: [...pre, err], code: 1 };
          sinks[1] = sinks[2] = { kind: 'file', path };
          continue;
        }
        const fd = r.fd === 2 ? 2 : 1;
        sinks[fd] = { ...sinks[Number(targetFd) as 1 | 2] };
        continue;
      }
      const targets = expandWord(r.target, env);
      flushPending();
      if (targets.length !== 1) {
        return { chunks: [...pre, { stream: 'stderr', text: `bash: ${r.target.raw}: ambiguous redirect\n` }], code: 1 };
      }
      const path = targets[0]!;
      if (r.op === '<') {
        try {
          const { node } = resolve(this.fs, normalize(path, this.cwdPath), cred, true);
          if (node.type === 'dir') throw new FsError('EISDIR');
          if (!can(node, cred, R)) throw new FsError('EACCES');
          input = node.type === 'file' ? node.content : '';
        } catch (e) {
          if (e instanceof FsError) {
            if (e.code === 'EISDIR') {
              input = '';
              continue;
            }
            return { chunks: [...pre, { stream: 'stderr', text: `bash: ${path}: ${e.text}\n` }], code: 1 };
          }
          throw e;
        }
        continue;
      }
      const append = r.op === '>>' || r.op === '&>>';
      const err = this.openForWrite(path, append);
      if (err) return { chunks: [...pre, err], code: 1 };
      const sink: Sink = path === '/dev/null' ? { kind: 'null' } : { kind: 'file', path };
      if (r.op === '&>' || r.op === '&>>') {
        sinks[1] = sink;
        sinks[2] = { ...sink };
      } else if (r.fd === 2) sinks[2] = sink;
      else if (r.fd === 1) sinks[1] = sink;
    }

    // ---- run ----
    let res: RunResult;
    if (cmd.compound) {
      res = this.runCompound(cmd.compound, input, tty && sinks[1].kind === 'parent' && sinks[1].stream === 'stdout');
    } else if (argv.length === 0) {
      for (const a of assigns) this.setVar(a.name, a.value);
      res = { chunks: [], code: this.pendingSubCode ?? 0 };
    } else {
      const outIsTTY = tty && sinks[1].kind === 'parent' && sinks[1].stream === 'stdout';
      const savedEnv = assigns.length ? { ...this.env } : null;
      for (const a of assigns) this.env[a.name] = a.value;
      try {
        res = this.runCommand(argv, input, outIsTTY, {});
      } finally {
        if (savedEnv) this.env = savedEnv;
      }
    }
    this.pendingSubCode = null;

    // ---- route output ----
    const routed: OutputChunk[] = [...pre];
    const fileWrites = new Map<string, string>();
    const order: string[] = [];
    for (const c of res.chunks) {
      const sink = sinks[c.stream === 'stdout' ? 1 : 2];
      if (sink.kind === 'parent') routed.push({ stream: sink.stream, text: c.text });
      else if (sink.kind === 'file') {
        if (!fileWrites.has(sink.path)) order.push(sink.path);
        fileWrites.set(sink.path, (fileWrites.get(sink.path) ?? '') + c.text);
      }
    }
    for (const path of order) {
      try {
        this.writeRedirect(path, fileWrites.get(path)!);
      } catch (e) {
        if (e instanceof FsError) routed.push({ stream: 'stderr', text: `bash: ${path}: ${e.text}\n` });
        else throw e;
      }
    }
    return { chunks: routed, code: res.code };
  }

  pendingSubCode: number | null = null;

  private makeCtx(name: string, args: string[], stdin: string | null, tty: boolean): Ctx {
    return new Ctx(name, args, stdin, this.usrs === this.session.machine.users ? this.session.machine : { ...this.session.machine, users: this.usrs }, this.user, this.cred(), this.env['HOME'] ?? this.home(), this.now, tty, this.columns, this);
  }

  /** Truncate/create a redirect target before the command runs, like bash. */
  private openForWrite(path: string, append: boolean): OutputChunk | null {
    if (path === '/dev/null') return null;
    const ctx = this.makeCtx('bash', [], null, false);
    try {
      if (append) {
        // create if missing, but do not truncate
        ctx.writeFile(path, '', true);
      } else {
        ctx.writeFile(path, '', false);
      }
      return null;
    } catch (e) {
      if (e instanceof FsError) return { stream: 'stderr', text: `bash: ${path}: ${e.text}\n` };
      throw e;
    }
  }

  private writeRedirect(path: string, text: string) {
    const ctx = this.makeCtx('bash', [], null, false);
    ctx.writeFile(path, text, true);
  }

  runCommand(argv: string[], stdin: string | null, tty: boolean, _opts: object): RunResult {
    const name = argv[0]!;
    const args = argv.slice(1);
    if (name.includes('/')) return this.runPath(name, args, stdin, tty);
    const def = this.registry.get(name);
    if (!def) {
      // a script installed somewhere in $PATH (e.g. /usr/local/bin/backup.sh)
      for (const dir of (this.env['PATH'] ?? '').split(':').filter(Boolean)) {
        const candidate = `${dir.replace(/\/$/, '')}/${name}`;
        try {
          const n = resolve(this.fs, candidate, this.cred(), true).node;
          if (n.type === 'file' && can(n, this.cred(), X) && !n.content.startsWith('\x7fELF')) return this.runPath(candidate, args, stdin, tty);
        } catch {
          // not here
        }
      }
      if (this.depth === 0 && this.sudoDepth === 0) {
        const s = suggest(name, [...this.registry.keys()].filter((n) => /^[a-z]/.test(n))) ?? suggest(name, Object.keys(this.aliasMap));
        if (s) this.emit({ type: 'didYouMean', command: name, suggestion: s });
      }
      const prefix = this.sudoDepth > 0 ? `sudo: ${name}: command not found` : `${this.scriptName === 'bash' ? 'bash' : this.scriptName}: ${name}: command not found`;
      this.executed.push({ name, args, exitCode: 127, ...(this.sudoDepth > 0 ? { sudo: true } : {}) });
      return { chunks: [{ stream: 'stderr', text: prefix + '\n' }], code: 127 };
    }
    return this.invoke(def, name, args, stdin, tty);
  }

  invoke(def: CommandDef, name: string, args: string[], stdin: string | null, tty: boolean): RunResult {
    const ctx = this.makeCtx(name, args, stdin, tty);
    let code: number;
    const dashIdx = args.indexOf('--');
    const helpIdx = args.indexOf('--help');
    if (!def.noHelp && helpIdx !== -1 && (dashIdx === -1 || helpIdx < dashIdx)) {
      ctx.out(formatHelp(def));
      code = 0;
    } else {
      try {
        code = def.run(ctx);
      } catch (e) {
        if (e instanceof LimitError) throw e;
        if (e instanceof ArgError) {
          ctx.fail(e.message);
          ctx.err(`Try '${name} --help' for more information.\n`);
          code = EXIT2_ON_USAGE.has(name) ? 2 : 1;
        } else if (e instanceof FsError) {
          ctx.fail(e.text);
          code = 1;
        } else {
          ctx.fail(`internal error: ${e instanceof Error ? e.message : String(e)}`);
          code = 1;
        }
      }
    }
    this.executed.push({ name, args, exitCode: code, ...(this.sudoDepth > 0 ? { sudo: true } : {}) });
    return { chunks: ctx.chunks(), code };
  }

  /** `./script.sh`, `/usr/bin/ls`, `~/bin/tool` */
  runPath(path: string, args: string[], stdin: string | null, tty: boolean): RunResult {
    const cred = this.cred();
    const fail = (text: string, code: number): RunResult => {
      this.executed.push({ name: path, args, exitCode: code });
      return { chunks: [{ stream: 'stderr', text: `bash: ${path}: ${text}\n` }], code };
    };
    let node;
    try {
      node = resolve(this.fs, normalize(path, this.cwdPath), cred, true).node;
    } catch (e) {
      if (e instanceof FsError) return fail(e.text, e.code === 'ENOENT' ? 127 : 126);
      throw e;
    }
    if (node.type === 'dir') return fail('Is a directory', 126);
    if (node.type !== 'file' || !can(node, cred, X)) return fail('Permission denied', 126);
    if (node.content.startsWith('\x7fELF')) {
      const def = this.registry.get(basename(path));
      if (def) return this.invoke(def, basename(path), args, stdin, tty);
      return fail('cannot execute binary file: Exec format error', 126);
    }
    if (!can(node, cred, R)) return fail('Permission denied', 126);
    const res = this.runNested(() => this.runScript(node.content, args, { subshell: true, name: path, stdin }));
    this.executed.push({ name: path, args, exitCode: res.code });
    return res;
  }
}

export interface InterpreterOptions extends ExecOptions {
  registry: Registry;
}

function expandHistory(line: string, history: string[]): { line: string; changed: boolean; error?: string } {
  if (!line.includes('!')) return { line, changed: false };
  let out = '';
  let changed = false;
  let inSingle = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i]!;
    if (c === "'" ) inSingle = !inSingle;
    if (!inSingle && c === '\\' && line[i + 1] === '!') {
      out += '\\!';
      i++;
      continue;
    }
    if (!inSingle && c === '!' && line[i + 1] === '!') {
      const last = history[history.length - 1];
      if (last === undefined) return { line, changed: false, error: '!!: event not found' };
      out += last;
      i++;
      changed = true;
      continue;
    }
    out += c;
  }
  return { line: out, changed };
}

/** Execute one line of input in a session. Never throws. */
export function executeLine(session: Session, input: string, opts: InterpreterOptions): ExecResult {
  const runner = new Runner(session, opts.registry, opts);
  const maxOutput = opts.maxOutput ?? DEFAULT_MAX_OUTPUT;
  const output: OutputChunk[] = [];
  let line = input.replace(/\r/g, '');

  const hx = expandHistory(line, runner.hist);
  if (hx.error) {
    output.push({ stream: 'stderr', text: `bash: ${hx.error}\n` });
    return finish(1);
  }
  if (hx.changed) {
    line = hx.line;
    output.push({ stream: 'stdout', text: line + '\n' });
  }

  // history: HISTCONTROL=ignoreboth
  const trimmed = line.trim();
  if (trimmed && !line.startsWith(' ') && runner.hist[runner.hist.length - 1] !== line) {
    runner.hist.push(line);
    if (runner.hist.length > HISTORY_LIMIT) runner.hist.splice(0, runner.hist.length - HISTORY_LIMIT);
  }

  if (/:\(\)\s*\{\s*:\s*\|\s*:\s*&\s*\}\s*;?\s*:/.test(line)) {
    runner.emit({ type: 'easterEgg', id: 'fork-bomb' });
    output.push({ stream: 'stderr', text: 'bash: fork: retry: Resource temporarily unavailable\n' });
    return finish(254);
  }

  let script: Script;
  try {
    script = parse(line);
  } catch (e) {
    const msg = e instanceof ParseError ? e.message : 'syntax error';
    output.push({ stream: 'stderr', text: `bash: ${msg}\n` });
    return finish(2);
  }

  let code: number;
  try {
    const res = runner.runList(script, null, runner.isTTY);
    output.push(...res.chunks);
    code = res.code;
  } catch (e) {
    if (e instanceof LimitError) {
      output.push({ stream: 'stderr', text: 'bash: execution stopped: too many commands (limit 5000)\n' });
      code = 130;
    } else {
      output.push({ stream: 'stderr', text: `bash: internal error: ${e instanceof Error ? e.message : String(e)}\n` });
      code = 1;
    }
  }
  return finish(code);

  function finish(exitCode: number): ExecResult {
    runner.lastExit = exitCode;
    // cap output size
    let total = 0;
    const capped: OutputChunk[] = [];
    for (const c of output) {
      if (total + c.text.length > maxOutput) {
        capped.push({ stream: c.stream, text: c.text.slice(0, Math.max(0, maxOutput - total)) });
        capped.push({ stream: 'stderr', text: '\n[output truncated]\n' });
        break;
      }
      total += c.text.length;
      capped.push(c);
    }
    // merge adjacent chunks of same stream
    const merged: OutputChunk[] = [];
    for (const c of capped) {
      const prev = merged[merged.length - 1];
      if (prev && prev.stream === c.stream) prev.text += c.text;
      else if (c.text) merged.push({ ...c });
    }
    const newSession: Session = {
      machine:
        runner.fs === session.machine.fs && runner.procs === session.machine.processes && runner.svcs === (session.machine.services ?? []) && runner.usrs === session.machine.users && runner.dock === session.machine.docker
          ? session.machine
          : { ...session.machine, fs: runner.fs, processes: runner.procs, users: runner.usrs, ...(session.machine.services || runner.svcs.length ? { services: runner.svcs } : {}), ...(runner.dock ? { docker: runner.dock } : {}) },
      user: runner.user,
      cwd: runner.cwdPath,
      env: runner.env,
      locals: runner.locals,
      aliases: runner.aliasMap,
      userStack: runner.userStack,
      history: runner.hist,
      lastExitCode: exitCode,
    };
    return { session: newSession, output: merged, exitCode, events: runner.events, executed: runner.executed };
  }
}
