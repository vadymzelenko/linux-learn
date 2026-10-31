/**
 * User administration (useradd, usermod, groupadd, passwd), process
 * matching (pgrep, pkill, killall), diff and the z* wrappers.
 */
import type { ProcessInfo, UserInfo } from '../types';
import type { CommandDef, Ctx } from '../shell/context';
import { ArgError, parseArgs } from '../shell/args';
import { FsError, makeDir, makeFile, putChild, resolve as fsResolve, updateAt, type Cred } from '../vfs/fs';
import { eachInput, ereToJs, joinLines, lines, makeRegExp } from './util';

const ROOT: Cred = { name: 'root', groups: ['root'], root: true };

// ---------------------------------------------------------------- /etc/passwd + /etc/group

interface GroupEntry {
  name: string;
  gid: number;
}

function readSys(ctx: Ctx, path: string): string {
  try {
    const n = fsResolve(ctx.fs, path, ROOT).node;
    return n.type === 'file' ? n.content : '';
  } catch {
    return '';
  }
}

function writeSys(ctx: Ctx, path: string, content: string) {
  try {
    const { canon } = fsResolve(ctx.fs, path, ROOT);
    ctx.fs = updateAt(ctx.fs, canon, (n) => {
      if (n.type === 'file') n.content = content;
    });
  } catch {
    const parts = path.split('/').filter(Boolean);
    const name = parts.pop()!;
    ctx.fs = putChild(ctx.fs, parts, makeFile(name, content, { owner: 'root', group: 'root', now: ctx.now }), ctx.now);
  }
}

/** Groups known to the system: /etc/group plus every group a user is in. */
export function systemGroups(ctx: Ctx): GroupEntry[] {
  const out: GroupEntry[] = [];
  for (const l of lines(readSys(ctx, '/etc/group'))) {
    const [name, , gid] = l.split(':');
    if (name && !out.some((g) => g.name === name)) out.push({ name, gid: Number(gid) || 0 });
  }
  let next = Math.max(1000, ...out.map((g) => g.gid), ...ctx.machine.users.map((u) => u.gid)) + 1;
  for (const u of ctx.machine.users)
    for (const g of u.groups)
      if (!out.some((x) => x.name === g)) out.push({ name: g, gid: g === u.name ? u.gid : next++ });
  return out;
}

function sync(ctx: Ctx, users: UserInfo[], groups: GroupEntry[]) {
  ctx.shell.setUsers(users);
  writeSys(ctx, '/etc/passwd', users.map((u) => `${u.name}:x:${u.uid}:${u.gid}:${u.name}:${u.home}:${u.shell ?? '/bin/bash'}`).join('\n') + '\n');
  writeSys(
    ctx,
    '/etc/group',
    groups.map((g) => `${g.name}:x:${g.gid}:${users.filter((u) => u.groups.includes(g.name) && u.name !== g.name).map((u) => u.name).join(',')}`).join('\n') + '\n',
  );
}

function needRoot(ctx: Ctx, file = '/etc/passwd'): boolean {
  if (ctx.cred.root) return true;
  ctx.err(`${ctx.name}: Permission denied.\n${ctx.name}: cannot lock ${file}; try again later.\n`);
  return false;
}

const VALID_NAME = /^[a-z_][a-z0-9_-]{0,31}$/;

export const useradd: CommandDef = {
  name: 'useradd',
  category: 'permissions',
  doc: {
    summary: 'create a new user',
    usage: ['useradd [options] LOGIN'],
    description: 'Create a new user account. Needs root (sudo). Without -m no home directory is created.',
    options: [
      ['-m, --create-home', "create the user's home directory"],
      ['-s, --shell SHELL', 'login shell of the new account'],
      ['-G, --groups GROUPS', 'list of supplementary groups (comma separated)'],
      ['-d, --home-dir DIR', 'home directory of the new account'],
    ],
    examples: [['sudo useradd -m -s /bin/bash anna', 'create anna with a home directory'], ['sudo useradd -m -G sudo,developers ivan', 'create ivan in two extra groups']],
    seeAlso: ['usermod', 'userdel', 'groupadd', 'passwd', 'id'],
  },
  run(ctx) {
    const a = parseArgs(ctx.args, { flags: 'mMrN', withValue: 'sGdcgu', long: { 'create-home': 'm', system: 'r' }, longWithValue: { shell: 's', groups: 'G', 'home-dir': 'd', comment: 'c' } });
    const name = a.operands[0];
    if (!name) throw new ArgError('missing LOGIN');
    if (!needRoot(ctx)) return 1;
    if (!VALID_NAME.test(name)) {
      ctx.fail(`invalid user name '${name}': use lowercase letters, digits, - and _`);
      return 3;
    }
    const users = ctx.machine.users;
    if (users.some((u) => u.name === name)) {
      ctx.fail(`user '${name}' already exists`);
      return 9;
    }
    const groups = systemGroups(ctx);
    const extra = (a.values.get('G') ?? '').split(',').filter(Boolean);
    for (const g of extra)
      if (!groups.some((x) => x.name === g)) {
        ctx.fail(`group '${g}' does not exist`);
        return 6;
      }
    const uid = Math.max(999, ...users.map((u) => u.uid).filter((x) => x < 60000)) + 1;
    const gid = groups.some((g) => g.gid === uid) ? Math.max(...groups.map((g) => g.gid).filter((x) => x < 60000)) + 1 : uid;
    const home = a.values.get('d') ?? `/home/${name}`;
    const user: UserInfo = { name, uid, gid, home, groups: [name, ...extra], shell: a.values.get('s') ?? '/bin/sh' };
    sync(ctx, [...users, user], [...groups, { name, gid }]);
    if (a.flags.has('m') && !ctx.tryStat(home)) {
      const parts = home.split('/').filter(Boolean);
      const dirName = parts.pop()!;
      const d = { owner: name, group: name, now: ctx.now };
      try {
        ctx.fs = putChild(ctx.fs, parts, makeDir(dirName, d, 0o750, { '.bashrc': makeFile('.bashrc', '# ~/.bashrc\n', d), '.profile': makeFile('.profile', '# ~/.profile\n', d) }), ctx.now);
      } catch (e) {
        if (!(e instanceof FsError)) throw e;
      }
    }
    return 0;
  },
};

export const userdel: CommandDef = {
  name: 'userdel',
  category: 'permissions',
  doc: { summary: 'delete a user account', usage: ['userdel [-r] LOGIN'], options: [['-r, --remove', "remove the home directory too"]], seeAlso: ['useradd'] },
  run(ctx) {
    const a = parseArgs(ctx.args, { flags: 'rf', long: { remove: 'r', force: 'f' } });
    const name = a.operands[0];
    if (!name) throw new ArgError('missing LOGIN');
    if (!needRoot(ctx)) return 1;
    const u = ctx.machine.users.find((x) => x.name === name);
    if (!u) {
      ctx.fail(`user '${name}' does not exist`);
      return 6;
    }
    const busy = u.uid === 0 ? { pid: 1 } : ctx.shell.processes().find((p) => p.user === name);
    if (busy) {
      ctx.fail(`user ${name} is currently used by process ${busy.pid}`);
      return 8;
    }
    sync(ctx, ctx.machine.users.filter((x) => x.name !== name), systemGroups(ctx).filter((g) => g.name !== name));
    if (a.flags.has('r')) {
      try {
        const { canon } = fsResolve(ctx.fs, u.home, ROOT, false);
        const parentCanon = canon.slice(0, -1);
        ctx.fs = updateAt(ctx.fs, parentCanon, (n) => {
          if (n.type === 'dir') delete n.children[canon[canon.length - 1]!];
        });
      } catch {
        ctx.fail(`${u.home} home directory (${u.home}) not found`);
      }
    }
    return 0;
  },
};

export const usermod: CommandDef = {
  name: 'usermod',
  category: 'permissions',
  doc: {
    summary: 'modify a user account',
    usage: ['usermod [options] LOGIN'],
    description: 'Change an account. The most common use: add a user to a group with -aG. Without -a, -G REPLACES all supplementary groups. Group changes apply at the next login.',
    options: [
      ['-a, --append', 'append to the groups given with -G (do not remove others)'],
      ['-G, --groups GROUPS', 'new list of supplementary groups'],
      ['-s, --shell SHELL', 'new login shell'],
      ['-L, --lock', 'lock the password'],
    ],
    examples: [['sudo usermod -aG docker student', 'add student to the docker group'], ['sudo usermod -s /bin/zsh anna', "change anna's shell"]],
    seeAlso: ['useradd', 'groups', 'id'],
  },
  run(ctx) {
    const a = parseArgs(ctx.args, { flags: 'aLU', withValue: 'Gsdgcl', long: { append: 'a', lock: 'L', unlock: 'U' }, longWithValue: { groups: 'G', shell: 's', home: 'd' } });
    const name = a.operands[0];
    if (!name) throw new ArgError('missing LOGIN');
    if (!needRoot(ctx)) return 1;
    const users = ctx.machine.users;
    const u = users.find((x) => x.name === name);
    if (!u) {
      ctx.fail(`user '${name}' does not exist`);
      return 6;
    }
    const groups = systemGroups(ctx);
    let newGroups = u.groups;
    if (a.values.has('G')) {
      const list = (a.values.get('G') ?? '').split(',').filter(Boolean);
      for (const g of list)
        if (!groups.some((x) => x.name === g)) {
          ctx.fail(`group '${g}' does not exist`);
          return 6;
        }
      const primary = u.groups[0] ?? u.name;
      newGroups = a.flags.has('a') ? [...new Set([...u.groups, ...list])] : [primary, ...list.filter((g) => g !== primary)];
    } else if (a.flags.has('a')) {
      ctx.err('usermod: -a flag is ONLY allowed with the -G flag\n');
      return 2;
    }
    const updated: UserInfo = { ...u, groups: newGroups, ...(a.values.has('s') ? { shell: a.values.get('s')! } : {}), ...(a.values.has('d') ? { home: a.values.get('d')! } : {}) };
    sync(ctx, users.map((x) => (x.name === name ? updated : x)), groups);
    return 0;
  },
};

export const groupadd: CommandDef = {
  name: 'groupadd',
  category: 'permissions',
  doc: { summary: 'create a new group', usage: ['groupadd GROUP'], examples: [['sudo groupadd developers', 'create the developers group']], seeAlso: ['usermod', 'groups'] },
  run(ctx) {
    const a = parseArgs(ctx.args, { flags: 'rf', withValue: 'g' });
    const name = a.operands[0];
    if (!name) throw new ArgError('missing GROUP');
    if (!needRoot(ctx, '/etc/group')) return 1;
    if (!VALID_NAME.test(name)) {
      ctx.fail(`'${name}' is not a valid group name`);
      return 3;
    }
    const groups = systemGroups(ctx);
    if (groups.some((g) => g.name === name)) {
      ctx.fail(`group '${name}' already exists`);
      return 9;
    }
    const gid = Math.max(1000, ...groups.map((g) => g.gid).filter((x) => x < 60000)) + 1;
    sync(ctx, ctx.machine.users, [...groups, { name, gid }]);
    return 0;
  },
};

export const passwd: CommandDef = {
  name: 'passwd',
  category: 'permissions',
  doc: { summary: 'change user password', usage: ['passwd [LOGIN]'], description: 'Change the password of the current user, or (as root) of any user. In the simulator the password is not really stored.', seeAlso: ['useradd'] },
  run(ctx) {
    const a = parseArgs(ctx.args, { flags: 'lSd' });
    const name = a.operands[0] ?? ctx.user;
    if (!ctx.machine.users.some((u) => u.name === name)) {
      ctx.fail(`user '${name}' does not exist`);
      return 1;
    }
    if (name !== ctx.user && !ctx.cred.root) {
      ctx.err(`passwd: You may not view or modify password information for ${name}.\n`);
      return 1;
    }
    if (a.flags.has('S')) {
      ctx.out(`${name} P 10/31/2026 0 99999 7 -1\n`);
      return 0;
    }
    ctx.out(`New password: \nRetype new password: \npasswd: password updated successfully\n`);
    return 0;
  },
};

// ---------------------------------------------------------------- pgrep / pkill / killall

const procName = (p: ProcessInfo) => (p.command.split(/\s+/)[0] ?? '').split('/').pop()!.replace(/^\[|\]$/g, '');

function matchProcs(ctx: Ctx, pattern: string, full: boolean, user?: string, exact = false): ProcessInfo[] | null {
  const re = exact ? null : makeRegExp(ereToJs(pattern), '');
  if (typeof re === 'string') {
    ctx.fail(re);
    return null;
  }
  return ctx.shell.processes().filter((p) => {
    if (user && p.user !== user) return false;
    const subject = full ? p.command : procName(p);
    return exact ? subject === pattern : re!.test(subject);
  });
}

export const pgrep: CommandDef = {
  name: 'pgrep',
  category: 'system',
  doc: {
    summary: 'look up processes by name',
    usage: ['pgrep [options] PATTERN'],
    description: 'Print the PIDs of processes whose name matches PATTERN (a regular expression). Exit status 1 if nothing matched.',
    options: [
      ['-l', 'also print the process name'],
      ['-a', 'also print the full command line'],
      ['-f', 'match against the full command line, not just the name'],
      ['-u USER', 'only processes of USER'],
      ['-c', 'print the count of matching processes'],
    ],
    examples: [['pgrep -a python', 'all python processes with their arguments'], ['pgrep -u www-data -l nginx', 'nginx processes of www-data']],
    seeAlso: ['pkill', 'ps'],
  },
  run(ctx) {
    const a = parseArgs(ctx.args, { flags: 'lafcx', withValue: 'u', long: { 'list-name': 'l', 'list-full': 'a', full: 'f', count: 'c', exact: 'x' } });
    const pattern = a.operands[0];
    if (pattern === undefined) {
      ctx.err('pgrep: no matching criteria specified\nTry `pgrep --help\' for more information.\n');
      return 2;
    }
    const found = matchProcs(ctx, pattern, a.flags.has('f'), a.values.get('u'), a.flags.has('x'));
    if (!found) return 2;
    if (a.flags.has('c')) ctx.out(`${found.length}\n`);
    else ctx.out(joinLines(found.map((p) => (a.flags.has('a') ? `${p.pid} ${p.command}` : a.flags.has('l') ? `${p.pid} ${procName(p)}` : String(p.pid)))));
    return found.length ? 0 : 1;
  },
};

function killList(ctx: Ctx, list: ProcessInfo[], report: (p: ProcessInfo) => string): number {
  let code = 0;
  let killed = 0;
  for (const p of list) {
    if (!ctx.cred.root && p.user !== ctx.user) {
      ctx.err(report(p));
      code = 1;
      continue;
    }
    if (p.pid === 1) continue;
    ctx.shell.setProcesses(ctx.shell.processes().filter((x) => x.pid !== p.pid));
    killed++;
  }
  return killed ? 0 : code || 1;
}

const SIGNAL = /^-(\d+|[A-Z]+|SIG[A-Z]+)$/;

export const pkill: CommandDef = {
  name: 'pkill',
  category: 'system',
  doc: {
    summary: 'signal processes by name',
    usage: ['pkill [-SIGNAL] [options] PATTERN'],
    description: 'Send a signal (default TERM) to every process whose name matches PATTERN. Careful: "pkill a" matches everything with an "a" in its name — check with pgrep first.',
    options: [
      ['-f', 'match against the full command line'],
      ['-u USER', 'only processes of USER'],
      ['-9', 'send SIGKILL'],
    ],
    examples: [['pgrep -a gzip && pkill gzip', 'look, then stop'], ['pkill -f report_generator.py', 'by a part of the arguments']],
    seeAlso: ['pgrep', 'kill', 'killall'],
  },
  run(ctx) {
    const args = ctx.args.filter((x) => !SIGNAL.test(x));
    const a = parseArgs(args, { flags: 'fxe', withValue: 'us', long: { full: 'f', exact: 'x', echo: 'e' }, longWithValue: { signal: 's' } });
    const pattern = a.operands[0];
    if (pattern === undefined) {
      ctx.err('pkill: no matching criteria specified\nTry `pkill --help\' for more information.\n');
      return 2;
    }
    const found = matchProcs(ctx, pattern, a.flags.has('f'), a.values.get('u'), a.flags.has('x'));
    if (!found) return 2;
    if (a.flags.has('e')) for (const p of found) if (ctx.cred.root || p.user === ctx.user) ctx.out(`${procName(p)} killed (pid ${p.pid})\n`);
    return killList(ctx, found, (p) => `pkill: killing pid ${p.pid} failed: Operation not permitted\n`);
  },
};

export const killall: CommandDef = {
  name: 'killall',
  category: 'system',
  doc: { summary: 'kill processes by exact name', usage: ['killall [-SIGNAL] [-u USER] NAME...'], description: 'Kill every process whose name is exactly NAME.', examples: [['killall gzip', 'stop all gzip processes']], seeAlso: ['pkill', 'kill'] },
  run(ctx) {
    const args = ctx.args.filter((x) => !SIGNAL.test(x));
    const a = parseArgs(args, { flags: 'iqv', withValue: 'us' });
    if (!a.operands.length) {
      ctx.err('Usage: killall [OPTION]... [--] NAME...\n');
      return 2;
    }
    let code = 0;
    for (const name of a.operands) {
      const found = matchProcs(ctx, name, false, a.values.get('u'), true)!;
      if (!found.length) {
        ctx.err(`${name}: no process found\n`);
        code = 1;
        continue;
      }
      if (killList(ctx, found, (p) => `${name}(${p.pid}): Operation not permitted\n`)) code = 1;
    }
    return code;
  },
};

// ---------------------------------------------------------------- diff

type Op = { t: ' ' | '-' | '+'; s: string };

function diffOps(x: string[], y: string[], eq: (p: string, r: string) => boolean): Op[] {
  const n = x.length;
  const m = y.length;
  const L = Array.from({ length: n + 1 }, () => new Uint32Array(m + 1));
  for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--) L[i]![j] = eq(x[i]!, y[j]!) ? L[i + 1]![j + 1]! + 1 : Math.max(L[i + 1]![j]!, L[i]![j + 1]!);
  const ops: Op[] = [];
  let i = 0;
  let j = 0;
  while (i < n || j < m) {
    if (i < n && j < m && eq(x[i]!, y[j]!)) {
      ops.push({ t: ' ', s: x[i]! });
      i++;
      j++;
    } else if (i < n && (j === m || L[i + 1]![j]! >= L[i]![j + 1]!)) ops.push({ t: '-', s: x[i++]! });
    else ops.push({ t: '+', s: y[j++]! });
  }
  return ops;
}

const range = (s: number, e: number) => (s >= e ? String(s) : `${s},${e}`);

export const diff: CommandDef = {
  name: 'diff',
  category: 'text',
  doc: {
    summary: 'compare files line by line',
    usage: ['diff [OPTION]... FILE1 FILE2'],
    description: 'Show what must change in FILE1 to make it FILE2. "<" lines are from FILE1, ">" lines from FILE2. Exit status 0 = same, 1 = different.',
    options: [
      ['-u', 'unified format (- removed, + added), like in git'],
      ['-q, --brief', 'only say whether the files differ'],
      ['-i', 'ignore case'],
      ['-w', 'ignore all white space'],
    ],
    examples: [['diff nginx.conf.bak nginx.conf', 'what changed in the config?'], ['diff -u old.txt new.txt', 'patch-style output']],
    seeAlso: ['comm', 'cmp'],
  },
  run(ctx) {
    const a = parseArgs(ctx.args, { flags: 'uqiwsb', withValue: 'U', long: { brief: 'q', unified: 'u', 'ignore-case': 'i', 'ignore-all-space': 'w' } });
    if (a.operands.length < 2) {
      ctx.err(a.operands.length ? `diff: missing operand after '${a.operands[0]}'\ndiff: Try 'diff --help' for more information.\n` : "diff: missing operand\ndiff: Try 'diff --help' for more information.\n");
      return 2;
    }
    const [f1, f2] = a.operands as [string, string];
    const texts: string[] = [];
    for (const f of [f1, f2]) {
      try {
        texts.push(f === '-' ? (ctx.stdin ?? '') : ctx.readFile(f));
      } catch (e) {
        if (e instanceof FsError) {
          ctx.fail(`${f}: ${e.text}`);
          return 2;
        }
        throw e;
      }
    }
    const x = lines(texts[0]!);
    const y = lines(texts[1]!);
    if (x.length * y.length > 4_000_000) {
      ctx.fail('files too large for the simulator');
      return 2;
    }
    const norm = (s: string) => {
      let r = a.flags.has('i') ? s.toLowerCase() : s;
      if (a.flags.has('w')) r = r.replace(/\s+/g, '');
      else if (a.flags.has('b')) r = r.replace(/\s+/g, ' ').trimEnd();
      return r;
    };
    const ops = diffOps(x, y, (p, r) => norm(p) === norm(r));
    const differs = ops.some((o) => o.t !== ' ');
    if (!differs) {
      if (a.flags.has('s')) ctx.out(`Files ${f1} and ${f2} are identical\n`);
      return 0;
    }
    if (a.flags.has('q')) {
      ctx.out(`Files ${f1} and ${f2} differ\n`);
      return 1;
    }
    let out = '';
    if (a.flags.has('u') || a.values.has('U')) {
      const C = Number(a.values.get('U') ?? 3);
      out += `--- ${f1}\n+++ ${f2}\n`;
      // positions in x / y before each op
      const pos: [number, number][] = [];
      let i = 0;
      let j = 0;
      for (const o of ops) {
        pos.push([i, j]);
        if (o.t !== '+') i++;
        if (o.t !== '-') j++;
      }
      let k = 0;
      while (k < ops.length) {
        if (ops[k]!.t === ' ') {
          k++;
          continue;
        }
        let start = Math.max(0, k - C);
        let end = k;
        // extend while changes are within 2C of each other
        while (end < ops.length) {
          let e = end;
          while (e < ops.length && ops[e]!.t !== ' ') e++;
          let gap = e;
          while (gap < ops.length && ops[gap]!.t === ' ') gap++;
          if (gap < ops.length && gap - e <= 2 * C) end = gap;
          else {
            end = Math.min(ops.length, e + C);
            break;
          }
        }
        const hunk = ops.slice(start, end);
        const [si, sj] = pos[start]!;
        const nx = hunk.filter((o) => o.t !== '+').length;
        const ny = hunk.filter((o) => o.t !== '-').length;
        out += `@@ -${nx ? si + 1 : si},${nx} +${ny ? sj + 1 : sj},${ny} @@\n`;
        for (const o of hunk) out += `${o.t}${o.s}\n`;
        k = end;
        start = end;
      }
    } else {
      let i = 0;
      let j = 0;
      let k = 0;
      while (k < ops.length) {
        if (ops[k]!.t === ' ') {
          i++;
          j++;
          k++;
          continue;
        }
        const del: string[] = [];
        const add: string[] = [];
        while (k < ops.length && ops[k]!.t !== ' ') {
          if (ops[k]!.t === '-') del.push(ops[k]!.s);
          else add.push(ops[k]!.s);
          k++;
        }
        if (del.length && add.length) out += `${range(i + 1, i + del.length)}c${range(j + 1, j + add.length)}\n`;
        else if (del.length) out += `${range(i + 1, i + del.length)}d${j}\n`;
        else out += `${i}a${range(j + 1, j + add.length)}\n`;
        out += del.map((l) => `< ${l}\n`).join('');
        if (del.length && add.length) out += '---\n';
        out += add.map((l) => `> ${l}\n`).join('');
        i += del.length;
        j += add.length;
      }
    }
    ctx.out(out);
    return 1;
  },
};

// ---------------------------------------------------------------- compressed logs

/**
 * Rotated logs (*.gz) are stored as plain text in the simulator, so the
 * z-tools are thin wrappers that teach the real command names.
 */
function zWrapper(name: string, target: string, summary: string): CommandDef {
  return {
    name,
    category: target === 'grep' ? 'search' : 'text',
    doc: { summary, usage: [`${name} [OPTION]... FILE...`], description: `Like ${target}, but reads gzip-compressed files (e.g. rotated logs *.gz) without unpacking them.`, examples: [[`${name} ${target === 'grep' ? 'error ' : ''}/var/log/syslog.2.gz`, `${target} inside a compressed log`]], seeAlso: [target] },
    run(ctx) {
      const r = ctx.shell.run([target, ...ctx.args], ctx.stdin);
      ctx.forward(r.chunks.map((c) => ({ ...c, text: c.text.replace(new RegExp(`^${target}:`, 'gm'), `${name}:`) })));
      return r.code;
    },
  };
}

export const zcat = zWrapper('zcat', 'cat', 'print the contents of compressed files');
export const zgrep = zWrapper('zgrep', 'grep', 'search compressed files for a pattern');
export const zless = zWrapper('zless', 'less', 'view compressed files');


// ---------------------------------------------------------------- paste / comm

export const paste: CommandDef = {
  name: 'paste',
  category: 'text',
  doc: {
    summary: 'merge lines of files side by side',
    usage: ['paste [-d LIST] [-s] [FILE]...'],
    description: 'Write lines consisting of the corresponding lines of each FILE, separated by TABs.',
    options: [
      ['-d, --delimiters=LIST', 'use characters from LIST instead of TABs'],
      ['-s, --serial', 'paste one file at a time instead of in parallel'],
    ],
    examples: [['paste names.txt phones.txt', 'two columns'], ['paste -sd, list.txt', 'join all lines with commas']],
    seeAlso: ['cut', 'join'],
  },
  run(ctx) {
    const a = parseArgs(ctx.args, { flags: 's', withValue: 'd', long: { serial: 's' }, longWithValue: { delimiters: 'd' } });
    const delims = (a.values.get('d') ?? '\t').replace(/\\t/g, '\t').replace(/\\n/g, '\n') || '\t';
    const cols: string[][] = [];
    const ok = eachInput(ctx, a.operands, (t) => cols.push(lines(t)));
    let out = '';
    const join = (cells: string[]) => cells.reduce((acc, c, i) => (i === 0 ? c : acc + delims[(i - 1) % delims.length] + c), '');
    if (a.flags.has('s')) for (const c of cols) out += join(c) + '\n';
    else {
      const n = Math.max(0, ...cols.map((c) => c.length));
      for (let i = 0; i < n; i++) out += join(cols.map((c) => c[i] ?? '')) + '\n';
    }
    ctx.out(out);
    return ok ? 0 : 1;
  },
};

export const comm: CommandDef = {
  name: 'comm',
  category: 'text',
  doc: {
    summary: 'compare two sorted files line by line',
    usage: ['comm [-123] FILE1 FILE2'],
    description: 'Three columns: lines only in FILE1, lines only in FILE2, lines in both. Both files must be sorted (use sort first).',
    options: [
      ['-1', 'suppress column 1 (lines unique to FILE1)'],
      ['-2', 'suppress column 2 (lines unique to FILE2)'],
      ['-3', 'suppress column 3 (lines that appear in both files)'],
    ],
    examples: [['comm -12 a.txt b.txt', 'only lines present in both'], ['comm -23 yesterday.txt today.txt', 'what disappeared']],
    seeAlso: ['diff', 'sort', 'uniq'],
  },
  run(ctx) {
    const a = parseArgs(ctx.args, { flags: '123' });
    if (a.operands.length !== 2) {
      ctx.err(a.operands.length < 2 ? `comm: missing operand${a.operands.length ? ` after '${a.operands[0]}'` : ''}\nTry 'comm --help' for more information.\n` : `comm: extra operand '${a.operands[2]}'\n`);
      return 1;
    }
    const texts: string[] = [];
    if (!eachInput(ctx, a.operands, (t) => texts.push(t))) return 1;
    const x = lines(texts[0]!);
    const y = lines(texts[1]!);
    const show = [!a.flags.has('1'), !a.flags.has('2'), !a.flags.has('3')];
    const col = (n: 0 | 1 | 2, s: string) => {
      if (!show[n]) return '';
      return '\t'.repeat(show.slice(0, n).filter(Boolean).length) + s + '\n';
    };
    let out = '';
    let i = 0;
    let j = 0;
    let warned = false;
    const checkOrder = (arr: string[], k: number, f: number) => {
      if (!warned && k > 0 && arr[k]! < arr[k - 1]!) {
        warned = true;
        ctx.err(`comm: file ${f} is not in sorted order\n`);
      }
    };
    while (i < x.length || j < y.length) {
      if (j >= y.length || (i < x.length && x[i]! < y[j]!)) {
        checkOrder(x, i, 1);
        out += col(0, x[i++]!);
      } else if (i >= x.length || y[j]! < x[i]!) {
        checkOrder(y, j, 2);
        out += col(1, y[j++]!);
      } else {
        out += col(2, x[i]!);
        i++;
        j++;
      }
    }
    ctx.out(out);
    return warned ? 1 : 0;
  },
};
