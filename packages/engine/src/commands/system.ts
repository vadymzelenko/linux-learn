import type { FsNode } from '../types';
import type { CommandDef, Ctx } from '../shell/context';
import { ArgError, parseArgs } from '../shell/args';
import { formatHelp, formatMan } from '../shell/help';
import { can, FsError, updateAt, R, W } from '../vfs/fs';
import { basename as pathBasename, dirname as pathDirname } from '../vfs/path';
import { dateString, q, strftime } from './util';

// ---------------------------------------------------------------- chmod / chown

/** Apply a symbolic or octal mode to an existing mode. Returns null if invalid. */
export function applyMode(spec: string, current: number, isDir: boolean): number | null {
  if (/^[0-7]{1,4}$/.test(spec)) return parseInt(spec, 8) | (spec.length < 4 && isDir ? current & 0o6000 : 0);
  let mode = current;
  for (const clause of spec.split(',')) {
    const m = /^([ugoa]*)([-+=][rwxXst]*)+$/.exec(clause);
    if (!m) return null;
    const who = m[1] || 'a';
    const ops = clause.slice(m[1]!.length).match(/[-+=][rwxXst]*/g) ?? [];
    for (const op of ops) {
      const sign = op[0]!;
      const perms = op.slice(1);
      let bits = 0;
      for (const p of perms) {
        const base = p === 'r' ? 4 : p === 'w' ? 2 : p === 'x' || (p === 'X' && (isDir || current & 0o111)) ? 1 : 0;
        for (const w of who) {
          if (w === 'u' || w === 'a') bits |= base << 6;
          if (w === 'g' || w === 'a') bits |= base << 3;
          if (w === 'o' || w === 'a') bits |= base;
        }
        if (p === 's') {
          if (who.includes('u') || who.includes('a')) bits |= 0o4000;
          if (who.includes('g') || who.includes('a')) bits |= 0o2000;
        }
        if (p === 't') bits |= 0o1000;
      }
      if (sign === '+') mode |= bits;
      else if (sign === '-') mode &= ~bits;
      else {
        let mask = 0;
        for (const w of who) {
          if (w === 'u' || w === 'a') mask |= 0o4700;
          if (w === 'g' || w === 'a') mask |= 0o2070;
          if (w === 'o' || w === 'a') mask |= 0o1007;
        }
        mode = (mode & ~mask) | bits;
      }
    }
  }
  return mode;
}

export const chmod: CommandDef = {
  name: 'chmod',
  category: 'permissions',
  doc: {
    summary: 'change file mode bits',
    usage: ['chmod [OPTION]... MODE[,MODE]... FILE...', 'chmod [OPTION]... OCTAL-MODE FILE...'],
    description:
      "Change the permissions of each FILE. MODE is either octal (755 = rwxr-xr-x, 644 = rw-r--r--) or symbolic: [ugoa][+-=][rwx], e.g. u+x (owner may execute), go-w (group and others may not write), a=r. r=4, w=2, x=1 — add them for each of user, group, others.",
    options: [
      ['-R, --recursive', 'change files and directories recursively'],
      ['-v, --verbose', 'output a diagnostic for every file processed'],
      ['-c, --changes', 'like verbose but report only when a change is made'],
    ],
    examples: [
      ['chmod +x deploy.sh', 'make a script executable'],
      ['chmod 600 secret.key', 'only the owner can read and write'],
      ['chmod -R go-w project/', 'remove write access for group and others everywhere'],
    ],
    seeAlso: ['chown', 'ls', 'umask'],
  },
  run(ctx) {
    // modes like -w look like options: treat them as the mode operand
    const argv = [...ctx.args];
    let modeIdx = -1;
    for (let k = 0; k < argv.length; k++) {
      if (/^-[rwxXst]+$/.test(argv[k]!) && modeIdx === -1) {
        modeIdx = k;
        break;
      }
    }
    let modeFromDash: string | null = null;
    if (modeIdx !== -1) modeFromDash = argv.splice(modeIdx, 1)[0]!;
    const a = parseArgs(argv, { flags: 'Rvcf', long: { recursive: 'R', verbose: 'v', changes: 'c', silent: 'f', quiet: 'f' } });
    const ops = [...a.operands];
    const spec = modeFromDash ?? ops.shift();
    if (spec === undefined) throw new ArgError('missing operand');
    if (ops.length === 0) throw new ArgError(`missing operand after '${spec}'`);
    if (applyMode(spec, 0o644, false) === null) {
      ctx.fail(`invalid mode: ${q(spec)}`);
      ctx.err("Try 'chmod --help' for more information.\n");
      return 1;
    }
    let code = 0;
    const change = (path: string, shown: string, recurse: boolean) => {
      let r;
      try {
        r = ctx.stat(path);
      } catch (e) {
        if (e instanceof FsError) {
          ctx.fail(`cannot access '${shown}': ${e.text}`);
          code = 1;
          return;
        }
        throw e;
      }
      const node = r.node;
      if (!ctx.cred.root && node.owner !== ctx.user) {
        ctx.fail(`changing permissions of '${shown}': Operation not permitted`);
        code = 1;
      } else {
        const next = applyMode(spec, node.mode & 0o7777, node.type === 'dir')!;
        const old = node.mode & 0o7777;
        ctx.fs = updateAt(ctx.fs, r.canon, (n) => {
          n.mode = next;
        });
        const o = old.toString(8).padStart(4, '0');
        const nm = next.toString(8).padStart(4, '0');
        if (a.flags.has('v') || (a.flags.has('c') && old !== next)) {
          ctx.out(old === next ? `mode of '${shown}' retained as ${o} (${modeStr(next, node)})\n` : `mode of '${shown}' changed from ${o} (${modeStr(old, node)}) to ${nm} (${modeStr(next, node)})\n`);
        }
      }
      if (recurse && node.type === 'dir') {
        const fresh = ctx.stat(path).node;
        if (fresh.type === 'dir' && can(fresh, ctx.cred, R)) {
          for (const name of Object.keys(fresh.children)) {
            const child = fresh.children[name]!;
            if (child.type === 'symlink') continue;
            change(`${path.replace(/\/$/, '')}/${name}`, `${shown.replace(/\/$/, '')}/${name}`, true);
          }
        }
      }
    };
    for (const f of ops) change(f, f, a.flags.has('R'));
    return code;
  },
};

function modeStr(mode: number, node: FsNode): string {
  const t = node.type === 'dir' ? 'd' : '-';
  const s = (b: number) => (b & 4 ? 'r' : '-') + (b & 2 ? 'w' : '-') + (b & 1 ? 'x' : '-');
  return t + s((mode >> 6) & 7) + s((mode >> 3) & 7) + s(mode & 7);
}

export const chown: CommandDef = {
  name: 'chown',
  category: 'permissions',
  doc: {
    summary: 'change file owner and group',
    usage: ['chown [OPTION]... [OWNER][:[GROUP]] FILE...'],
    description: 'Change the owner and/or group of each FILE to OWNER and/or GROUP. Only root can give files away, so this usually needs sudo.',
    options: [
      ['-R, --recursive', 'operate on files and directories recursively'],
      ['-v, --verbose', 'output a diagnostic for every file processed'],
    ],
    examples: [
      ['sudo chown www-data:www-data /var/www/site', 'give a directory to the web server user'],
      ['sudo chown -R student: ~/project', 'take back everything inside your project'],
    ],
    seeAlso: ['chmod', 'chgrp'],
  },
  run(ctx) {
    const a = parseArgs(ctx.args, { flags: 'Rvcfh', long: { recursive: 'R', verbose: 'v' } });
    const ops = [...a.operands];
    const spec = ops.shift();
    if (spec === undefined) throw new ArgError('missing operand');
    if (ops.length === 0) throw new ArgError(`missing operand after '${spec}'`);
    const [userPart, groupPart] = spec.split(/[:.]/, 2) as [string, string | undefined];
    const users = ctx.machine.users;
    const owner = userPart || undefined;
    if (owner && !users.some((u) => u.name === owner)) {
      ctx.fail(`invalid user: ${q(spec)}`);
      return 1;
    }
    let group: string | undefined = groupPart;
    if (spec.includes(':') && groupPart === '' && owner) group = users.find((u) => u.name === owner)?.groups[0];
    const allGroups = new Set(users.flatMap((u) => u.groups));
    if (group && !allGroups.has(group)) {
      ctx.fail(`invalid group: ${q(spec)}`);
      return 1;
    }
    let code = 0;
    const apply = (path: string, shown: string) => {
      let r;
      try {
        r = ctx.stat(path, false);
      } catch (e) {
        if (e instanceof FsError) {
          ctx.fail(`cannot access '${shown}': ${e.text}`);
          code = 1;
          return;
        }
        throw e;
      }
      const node = r.node;
      const me = users.find((u) => u.name === ctx.user);
      const allowed =
        ctx.cred.root ||
        ((!owner || owner === node.owner) && node.owner === ctx.user && (!group || (me?.groups.includes(group) ?? false)));
      if (!allowed) {
        ctx.fail(`changing ${owner && owner !== node.owner ? 'ownership' : 'group'} of '${shown}': Operation not permitted`);
        code = 1;
      } else {
        ctx.fs = updateAt(ctx.fs, r.canon, (n) => {
          if (owner) n.owner = owner;
          if (group) n.group = group;
        });
        if (a.flags.has('v')) ctx.out(`changed ownership of '${shown}' to ${owner ?? node.owner}:${group ?? node.group}\n`);
      }
      if (a.flags.has('R') && node.type === 'dir') {
        for (const name of Object.keys(node.children)) apply(`${path.replace(/\/$/, '')}/${name}`, `${shown.replace(/\/$/, '')}/${name}`);
      }
    };
    for (const f of ops) apply(f, f);
    return code;
  },
};

// ---------------------------------------------------------------- users

export const whoami: CommandDef = {
  name: 'whoami',
  category: 'system',
  doc: { summary: 'print effective user name', usage: ['whoami [OPTION]...'], description: 'Print the user name associated with the current effective user ID.', seeAlso: ['id', 'who'] },
  run(ctx) {
    const a = parseArgs(ctx.args, {});
    if (a.operands.length) {
      ctx.fail(`extra operand ${q(a.operands[0]!)}`);
      ctx.err("Try 'whoami --help' for more information.\n");
      return 1;
    }
    ctx.out(ctx.user + '\n');
    return 0;
  },
};

function groupId(name: string): number {
  return name === 'root' ? 0 : name === 'sudo' ? 27 : name === 'adm' ? 4 : name === 'www-data' ? 33 : name === 'docker' ? 999 : 1000;
}

export const id: CommandDef = {
  name: 'id',
  category: 'system',
  doc: { summary: 'print real and effective user and group IDs', usage: ['id [OPTION]... [USER]...'], options: [['-u', 'print only the effective user ID'], ['-g', 'print only the effective group ID'], ['-G', 'print all group IDs'], ['-n', 'print a name instead of a number, for -ugG']], seeAlso: ['whoami', 'groups'] },
  run(ctx) {
    const a = parseArgs(ctx.args, { flags: 'ugGn' });
    const name = a.operands[0] ?? ctx.user;
    const u = ctx.machine.users.find((x) => x.name === name);
    if (!u) {
      ctx.fail(`${q(name)}: no such user`);
      return 1;
    }
    const gid = (g: string, i: number) => (i === 0 ? u.gid : groupId(g));
    if (a.flags.has('u')) ctx.out((a.flags.has('n') ? u.name : u.uid) + '\n');
    else if (a.flags.has('g')) ctx.out((a.flags.has('n') ? u.groups[0] : u.gid) + '\n');
    else if (a.flags.has('G')) ctx.out(u.groups.map((g, i) => (a.flags.has('n') ? g : gid(g, i))).join(' ') + '\n');
    else ctx.out(`uid=${u.uid}(${u.name}) gid=${u.gid}(${u.groups[0]}) groups=${u.groups.map((g, i) => `${gid(g, i)}(${g})`).join(',')}\n`);
    return 0;
  },
};

export const groups: CommandDef = {
  name: 'groups',
  category: 'system',
  doc: { summary: 'print the groups a user is in', usage: ['groups [USERNAME]...'], seeAlso: ['id'] },
  run(ctx) {
    const name = ctx.args[0] ?? ctx.user;
    const u = ctx.machine.users.find((x) => x.name === name);
    if (!u) {
      ctx.fail(`${q(name)}: no such user`);
      return 1;
    }
    ctx.out((ctx.args[0] ? `${name} : ` : '') + u.groups.join(' ') + '\n');
    return 0;
  },
};

export const sudo: CommandDef = {
  name: 'sudo',
  category: 'permissions',
  doc: {
    summary: 'execute a command as another user',
    usage: ['sudo [-u user] command [arg ...]', 'sudo -i | -s'],
    description:
      'sudo runs a single command with superuser (root) privileges. Your user must be in the sudo group. With great power comes great responsibility: as root you can break anything — in the trainer you can always reset the machine.',
    options: [
      ['-u user', 'run the command as a user other than root'],
      ['-i, --login', 'start a login shell as the target user (exit to come back)'],
      ['-s, --shell', 'run a shell as the target user'],
      ['-l, --list', 'list allowed commands'],
    ],
    examples: [
      ['sudo apt update', 'run one command as root'],
      ['sudo !!', 'repeat the previous command with sudo'],
      ['sudo -i', 'become root (type exit to return)'],
    ],
    seeAlso: ['su', 'chown'],
  },
  run(ctx) {
    const a = parseArgs(ctx.args, { flags: 'iskEHlnv', withValue: 'u', long: { login: 'i', shell: 's', list: 'l' }, stopAtOperand: true });
    const me = ctx.machine.users.find((u) => u.name === ctx.user);
    const isRoot = me?.uid === 0;
    if (!isRoot && !me?.groups.includes('sudo')) {
      ctx.err(`${ctx.user} is not in the sudoers file.\n`);
      return 1;
    }
    const target = a.values.get('u') ?? 'root';
    if (!ctx.machine.users.some((u) => u.name === target)) {
      ctx.err(`sudo: unknown user ${target}\nsudo: error initializing audit plugin sudoers_audit\n`);
      return 1;
    }
    if (a.flags.has('l')) {
      ctx.out(`User ${ctx.user} may run the following commands on ${ctx.machine.hostname}:\n    (ALL : ALL) ALL\n`);
      return 0;
    }
    if (a.flags.has('v') || a.flags.has('k')) return 0;
    if (a.flags.has('i') || a.flags.has('s') || a.operands.length === 0) {
      if (a.operands.length === 0 && !a.flags.has('i') && !a.flags.has('s')) {
        ctx.err('usage: sudo -h | -K | -k | -V\nusage: sudo [-u user] command [arg ...]\nusage: sudo -i | -s\n');
        return 1;
      }
      if (a.operands.length === 0) {
        ctx.shell.pushUser(target);
        return 0;
      }
    }
    const [cmd, ...rest] = a.operands;
    if ((cmd === 'su' || cmd === 'bash' || cmd === 'sh') && rest.every((r) => r === '-' || r === '-i' || r === '-l')) {
      ctx.shell.pushUser(target);
      return 0;
    }
    const r = ctx.shell.run(a.operands, ctx.stdin, { asUser: target });
    ctx.forward(r.chunks);
    return r.code;
  },
};

export const su: CommandDef = {
  name: 'su',
  category: 'permissions',
  doc: { summary: 'run a command with substitute user ID', usage: ['su [options] [-] [user]'], description: 'Switch to another user. In the trainer the root account has no password, so use `sudo su` or `sudo -i` instead.', seeAlso: ['sudo'] },
  run(ctx) {
    const target = ctx.args.filter((x) => !x.startsWith('-'))[0] ?? 'root';
    if (ctx.cred.root) {
      if (!ctx.machine.users.some((u) => u.name === target)) {
        ctx.err(`su: user ${target} does not exist or the user entry does not contain all the required fields\n`);
        return 1;
      }
      ctx.shell.pushUser(target);
      return 0;
    }
    ctx.err('Password: \nsu: Authentication failure\n');
    return 1;
  },
};

// ---------------------------------------------------------------- processes

export const ps: CommandDef = {
  name: 'ps',
  category: 'system',
  doc: {
    summary: 'report a snapshot of the current processes',
    usage: ['ps [options]'],
    description: 'ps displays information about active processes. `ps aux` shows every process with its owner, CPU and memory usage.',
    options: [
      ['aux', 'all processes of all users, BSD style'],
      ['-e, -A', 'select all processes'],
      ['-f', 'full-format listing'],
    ],
    examples: [['ps aux | grep nginx', 'find a process by name']],
    seeAlso: ['top', 'kill'],
  },
  run(ctx) {
    const unix = ctx.args.filter((x) => x.startsWith('-')).join('').replace(/-/g, '');
    const bsdArgs = ctx.args.filter((x) => !x.startsWith('-')).join('');
    const all = /[ax]/.test(bsdArgs) || /[eA]/.test(unix);
    const bsd = bsdArgs.includes('u');
    const full = unix.includes('f');
    const shellPid = 1200;
    const procs = [...ctx.shell.processes(), { pid: 4242, user: ctx.user, command: `ps ${ctx.args.join(' ')}`.trim(), cpu: 0, mem: 0.1, rss: 4_100, stat: 'R+', start: '12:00' }];
    const visible = all ? procs : procs.filter((p) => p.pid === shellPid || p.pid === 4242);
    let out = '';
    if (bsd) {
      out += 'USER         PID %CPU %MEM    VSZ   RSS TTY      STAT START   TIME COMMAND\n';
      for (const p of visible) {
        const vsz = Math.round((p.rss ?? 4000) * 2.6);
        out += `${p.user.slice(0, 8).padEnd(8)} ${String(p.pid).padStart(7)} ${p.cpu.toFixed(1).padStart(4)} ${p.mem.toFixed(1).padStart(4)} ${String(vsz).padStart(6)} ${String(p.rss ?? 4000).padStart(5)} ${(p.pid === shellPid || p.pid === 4242 ? 'pts/0' : '?').padEnd(8)} ${(p.stat ?? 'S').padEnd(4)} ${(p.start ?? '09:00').padEnd(5)} ${`${Math.floor(p.cpu / 60)}:${String(Math.floor(p.cpu) % 60).padStart(2, '0')}`.padStart(6)} ${p.command}\n`;
      }
    } else if (full) {
      out += 'UID          PID    PPID  C STIME TTY          TIME CMD\n';
      for (const p of visible) out += `${p.user.slice(0, 8).padEnd(8)} ${String(p.pid).padStart(7)} ${String(p.pid === 1 ? 0 : 1).padStart(7)}  ${Math.floor(p.cpu)} ${(p.start ?? '09:00').padEnd(5)} ${(p.pid === shellPid || p.pid === 4242 ? 'pts/0' : '?').padEnd(8)} 00:00:0${Math.min(9, Math.floor(p.cpu))} ${p.command}\n`;
    } else {
      out += '    PID TTY          TIME CMD\n';
      for (const p of visible) out += `${String(p.pid).padStart(7)} ${(p.pid === shellPid || p.pid === 4242 ? 'pts/0' : '?').padEnd(8)} 00:00:00 ${pathBasename(p.command.split(' ')[0]!.replace(/^-/, ''))}\n`;
    }
    ctx.out(out);
    return 0;
  },
};

export const kill: CommandDef = {
  name: 'kill',
  builtin: true,
  category: 'system',
  doc: {
    summary: 'send a signal to a process',
    usage: ['kill [-s sigspec | -n signum | -sigspec] pid ...', 'kill -l'],
    description: 'Send the processes identified by PID the signal named by SIGSPEC. The default is SIGTERM (polite request to stop); -9 (SIGKILL) cannot be ignored.',
    examples: [['kill 1234', 'ask process 1234 to terminate'], ['kill -9 1234', 'force kill']],
    seeAlso: ['ps', 'killall'],
  },
  run(ctx) {
    const args = ctx.args.filter((x) => !/^-(\d+|[A-Z]+|s|n)$/.test(x));
    if (ctx.args[0] === '-l') {
      ctx.out(' 1) SIGHUP\t 2) SIGINT\t 3) SIGQUIT\t 9) SIGKILL\t15) SIGTERM\t18) SIGCONT\t19) SIGSTOP\n');
      return 0;
    }
    if (args.length === 0) {
      ctx.err('kill: usage: kill [-s sigspec | -n signum | -sigspec] pid | jobspec ... or kill -l [sigspec]\n');
      return 2;
    }
    let code = 0;
    for (const a of args) {
      const pid = Number(a);
      if (!Number.isInteger(pid)) {
        ctx.err(`bash: kill: ${a}: arguments must be process or job IDs\n`);
        code = 1;
        continue;
      }
      const p = ctx.shell.processes().find((x) => x.pid === pid);
      if (!p) {
        ctx.err(`bash: kill: (${pid}) - No such process\n`);
        code = 1;
        continue;
      }
      if (!ctx.cred.root && p.user !== ctx.user) {
        ctx.err(`bash: kill: (${pid}) - Operation not permitted\n`);
        code = 1;
        continue;
      }
      if (pid === 1) {
        // killing init as root would crash a real system; the kernel ignores it
        continue;
      }
      ctx.shell.setProcesses(ctx.shell.processes().filter((x) => x.pid !== pid));
    }
    return code;
  },
};

// ---------------------------------------------------------------- info

export const uname: CommandDef = {
  name: 'uname',
  category: 'system',
  doc: { summary: 'print system information', usage: ['uname [OPTION]...'], options: [['-a, --all', 'print all information'], ['-r, --kernel-release', 'print the kernel release'], ['-n, --nodename', 'print the network node hostname'], ['-m, --machine', 'print the machine hardware name']] },
  run(ctx) {
    const a = parseArgs(ctx.args, { flags: 'asnrvmpio', long: { all: 'a', 'kernel-name': 's', nodename: 'n', 'kernel-release': 'r', 'kernel-version': 'v', machine: 'm', 'operating-system': 'o' } });
    const f = a.flags;
    const parts: string[] = [];
    const all = f.has('a');
    if (all || f.has('s') || f.size === 0) parts.push('Linux');
    if (all || f.has('n')) parts.push(ctx.machine.hostname);
    if (all || f.has('r')) parts.push('6.8.0-45-generic');
    if (all || f.has('v')) parts.push('#45-Ubuntu SMP PREEMPT_DYNAMIC Fri Aug 30 12:02:04 UTC 2024');
    if (all || f.has('m')) parts.push('x86_64');
    if (all || f.has('p')) parts.push('x86_64');
    if (all || f.has('i')) parts.push('x86_64');
    if (all || f.has('o')) parts.push('GNU/Linux');
    ctx.out(parts.join(' ') + '\n');
    return 0;
  },
};

export const hostname: CommandDef = {
  name: 'hostname',
  category: 'system',
  doc: { summary: 'show the system\'s host name', usage: ['hostname'], seeAlso: ['uname'] },
  run(ctx) {
    if (ctx.args.includes('-I') || ctx.args.includes('-i')) {
      ctx.out(ctx.args.includes('-I') ? '10.0.2.15 \n' : '127.0.1.1\n');
      return 0;
    }
    if (ctx.args.length && !ctx.args[0]!.startsWith('-')) {
      ctx.err('hostname: you must be root to change the host name\n');
      return 1;
    }
    ctx.out(ctx.machine.hostname + '\n');
    return 0;
  },
};

export const date: CommandDef = {
  name: 'date',
  category: 'system',
  doc: {
    summary: 'print the system date and time',
    usage: ['date [OPTION]... [+FORMAT]'],
    description: 'Display the current time in the given FORMAT. FORMAT controls the output: %Y year, %m month, %d day, %H hour, %M minute, %S second, %F = %Y-%m-%d, %T = %H:%M:%S, %s seconds since 1970.',
    examples: [['date +%F', 'e.g. 2026-10-31'], ['date "+%Y-%m-%d %H:%M"', 'custom format']],
  },
  run(ctx) {
    const fmt = ctx.args.find((x) => x.startsWith('+'));
    const other = ctx.args.find((x) => !x.startsWith('+') && !['-u', '--utc', '-R', '-I'].includes(x));
    if (other) {
      ctx.fail(`invalid date ${q(other)}`);
      return 1;
    }
    if (ctx.args.includes('-I')) ctx.out(strftime('%F', ctx.now) + '\n');
    else if (ctx.args.includes('-R')) ctx.out(strftime('%a, %d %b %Y %T +0000', ctx.now) + '\n');
    else ctx.out((fmt ? strftime(fmt.slice(1), ctx.now) : dateString(ctx.now)) + '\n');
    return 0;
  },
};

export const basenameCmd: CommandDef = {
  name: 'basename',
  category: 'files',
  doc: { summary: 'strip directory and suffix from filenames', usage: ['basename NAME [SUFFIX]', 'basename OPTION... NAME...'], examples: [['basename /var/log/syslog', 'prints syslog'], ['basename photo.jpg .jpg', 'prints photo']] },
  run(ctx) {
    const a = parseArgs(ctx.args, { flags: 'az', withValue: 's', longWithValue: { suffix: 's' } });
    if (a.operands.length === 0) throw new ArgError('missing operand');
    const multi = a.flags.has('a') || a.values.has('s');
    const suffix = a.values.get('s') ?? (!multi ? a.operands[1] : undefined);
    const names = multi ? a.operands : [a.operands[0]!];
    if (!multi && a.operands.length > 2) {
      ctx.fail(`extra operand ${q(a.operands[2]!)}`);
      ctx.err("Try 'basename --help' for more information.\n");
      return 1;
    }
    ctx.out(names.map((n) => pathBasename(n, suffix)).join('\n') + '\n');
    return 0;
  },
};

export const dirnameCmd: CommandDef = {
  name: 'dirname',
  category: 'files',
  doc: { summary: 'strip last component from file name', usage: ['dirname NAME...'], examples: [['dirname /var/log/syslog', 'prints /var/log']] },
  run(ctx) {
    const a = parseArgs(ctx.args, { flags: 'z' });
    if (a.operands.length === 0) throw new ArgError('missing operand');
    ctx.out(a.operands.map((n) => pathDirname(n)).join('\n') + '\n');
    return 0;
  },
};

export const sleep: CommandDef = {
  name: 'sleep',
  category: 'shell',
  doc: { summary: 'delay for a specified amount of time', usage: ['sleep NUMBER[SUFFIX]...'], description: 'Pause for NUMBER seconds (s, m, h, d suffixes). In the trainer time does not really pass.' },
  run(ctx) {
    if (ctx.args.length === 0) throw new ArgError('missing operand');
    for (const a of ctx.args) {
      if (!/^\d*\.?\d+[smhd]?$/.test(a)) {
        ctx.fail(`invalid time interval ${q(a)}`);
        ctx.err("Try 'sleep --help' for more information.\n");
        return 1;
      }
    }
    return 0;
  },
};

export const man: CommandDef = {
  name: 'man',
  category: 'help',
  doc: {
    summary: 'an interface to the system reference manuals',
    usage: ['man [section] page'],
    description: 'man shows the manual page of a command: what it does, its options and examples. Every command also has a shorter summary via COMMAND --help.',
    examples: [['man ls', 'read the manual for ls'], ['man -k copy', 'search manual page summaries']],
    seeAlso: ['help', 'whatis'],
  },
  run(ctx) {
    const args = ctx.args.filter((x) => !/^\d$/.test(x));
    if (args[0] === '-k' || args[0] === '--apropos') {
      const term = (args[1] ?? '').toLowerCase();
      const hits = ctx.shell
        .commandNames()
        .map((n) => ctx.shell.lookup(n)!)
        .filter((d) => d.name.includes(term) || d.doc.summary.toLowerCase().includes(term))
        .sort((x, y) => x.name.localeCompare(y.name));
      if (!hits.length) {
        ctx.err(`${term}: nothing appropriate.\n`);
        return 16;
      }
      ctx.out(hits.map((d) => `${`${d.name} (1)`.padEnd(15)} - ${d.doc.summary}`).join('\n') + '\n');
      return 0;
    }
    if (args.length === 0) {
      ctx.err("What manual page do you want?\nFor example, try 'man man'.\n");
      return 1;
    }
    let code = 0;
    args.forEach((name, i) => {
      const def = ctx.shell.lookup(name);
      if (!def) {
        ctx.err(`No manual entry for ${name}\n`);
        code = 16;
        return;
      }
      if (i > 0) ctx.out('\n');
      ctx.out(formatMan(def, ctx.columns));
    });
    return code;
  },
};

export const whatis: CommandDef = {
  name: 'whatis',
  category: 'help',
  doc: { summary: 'display one-line manual page descriptions', usage: ['whatis name ...'] },
  run(ctx) {
    let code = 0;
    for (const n of ctx.args) {
      const d = ctx.shell.lookup(n);
      if (d) ctx.out(`${`${n} (1)`.padEnd(15)} - ${d.doc.summary}\n`);
      else {
        ctx.out(`${n}: nothing appropriate.\n`);
        code = 16;
      }
    }
    return code;
  },
};

export const nano: CommandDef = {
  name: 'nano',
  category: 'files',
  doc: {
    summary: 'Nano\'s ANOther editor, inspired by Pico',
    usage: ['nano [OPTIONS] [[+LINE[,COLUMN]] FILE]...'],
    description: 'A small and friendly text editor. In the trainer nano opens a simplified editor: edit the text, then Save (Ctrl+O) or Exit (Ctrl+X).',
    seeAlso: ['vim', 'cat'],
  },
  run(ctx) {
    const file = ctx.args.find((x) => !x.startsWith('-') && !x.startsWith('+'));
    if (!file) {
      ctx.err('nano: the trainer editor needs a file name: nano FILE\n');
      return 1;
    }
    let content = '';
    let exists = false;
    const r = ctx.tryStat(file);
    if (r) {
      if (r.node.type === 'dir') {
        ctx.err(`nano: "${file}" is a directory\n`);
        return 1;
      }
      if (r.node.type === 'file') {
        if (!can(r.node, ctx.cred, R)) {
          ctx.err(`nano: Error reading ${file}: Permission denied\n`);
          return 1;
        }
        content = r.node.content;
        exists = true;
      }
    }
    if (!ctx.isTTY) {
      ctx.err('Too many errors from stdin\n');
      return 1;
    }
    ctx.shell.emit({ type: 'openEditor', path: ctx.abs(file), content, exists });
    return 0;
  },
};

export const vim: CommandDef = {
  ...nano,
  name: 'vim',
  doc: { ...nano.doc, summary: 'Vi IMproved, a programmer\'s text editor', usage: ['vim [arguments] [file ..]'], description: 'In the trainer vim opens the same simplified editor as nano. (Real tip: to exit real vim press Esc, type :q! and Enter.)' },
};
export const vi: CommandDef = { ...vim, name: 'vi' };

export function canWrite(ctx: Ctx, node: FsNode): boolean {
  return can(node, ctx.cred, W);
}

export { formatHelp };
