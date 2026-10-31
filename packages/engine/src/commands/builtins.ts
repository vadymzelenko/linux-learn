import type { CommandDef } from '../shell/context';
import { parseArgs } from '../shell/args';
import { can, FsError, nodeSize, R, W, X } from '../vfs/fs';

export const clear: CommandDef = {
  name: 'clear',
  category: 'shell',
  doc: { summary: 'clear the terminal screen', usage: ['clear'], description: 'Clears the screen. Shortcut: Ctrl+L.' },
  run(ctx) {
    ctx.out('\x1b[H\x1b[2J\x1b[3J');
    ctx.shell.emit({ type: 'clear' });
    return 0;
  },
};

export const history: CommandDef = {
  name: 'history',
  builtin: true,
  category: 'shell',
  doc: {
    summary: 'display the command history list',
    usage: ['history [-c] [n]'],
    description: 'Display the history list with line numbers. Use the Up/Down arrows to walk through it, !! to repeat the last command.',
    options: [['-c', 'clear the history list']],
    examples: [['history 5', 'last five commands'], ['history | grep mkdir', 'search the history']],
  },
  run(ctx) {
    if (ctx.args[0] === '-c') {
      ctx.shell.clearHistory();
      return 0;
    }
    const h = ctx.shell.history();
    let start = 0;
    if (ctx.args[0] !== undefined) {
      if (!/^\d+$/.test(ctx.args[0])) {
        ctx.err(`bash: history: ${ctx.args[0]}: numeric argument required\n`);
        return 1;
      }
      start = Math.max(0, h.length - Number(ctx.args[0]));
    }
    let out = '';
    for (let i = start; i < h.length; i++) out += `${String(i + 1).padStart(5)}  ${h[i]}\n`;
    ctx.out(out);
    return 0;
  },
};

const NAME = /^[A-Za-z_][A-Za-z0-9_]*$/;

export const exportCmd: CommandDef = {
  name: 'export',
  builtin: true,
  category: 'shell',
  doc: {
    summary: 'set export attribute for shell variables',
    usage: ['export [-n] [name[=value] ...]', 'export -p'],
    description: 'Marks each NAME for automatic export to the environment of subsequently executed commands. Without arguments, lists exported variables.',
    examples: [['export EDITOR=nano', 'set and export a variable'], ['export PATH="$HOME/bin:$PATH"', 'add a directory to PATH']],
  },
  run(ctx) {
    const args = ctx.args.filter((a) => a !== '-p');
    if (args.length === 0) {
      const vars = ctx.shell.exportedVars();
      ctx.out(
        Object.keys(vars)
          .sort()
          .map((k) => `declare -x ${k}="${vars[k]!.replace(/(["\\$`])/g, '\\$1')}"`)
          .join('\n') + '\n',
      );
      return 0;
    }
    let code = 0;
    for (const a of args) {
      if (a === '-n') continue;
      const eq = a.indexOf('=');
      const name = eq === -1 ? a : a.slice(0, eq);
      if (!NAME.test(name)) {
        ctx.err(`bash: export: \`${a}': not a valid identifier\n`);
        code = 1;
        continue;
      }
      if (eq !== -1) ctx.shell.setVar(name, a.slice(eq + 1), true);
      else ctx.shell.exportVar(name);
    }
    return code;
  },
};

export const unset: CommandDef = {
  name: 'unset',
  builtin: true,
  category: 'shell',
  doc: { summary: 'unset values and attributes of shell variables', usage: ['unset [name ...]'] },
  run(ctx) {
    for (const a of ctx.args) if (a !== '-v' && a !== '-f') ctx.shell.unsetVar(a);
    return 0;
  },
};

export const env: CommandDef = {
  name: 'env',
  category: 'shell',
  doc: {
    summary: 'run a program in a modified environment',
    usage: ['env [NAME=VALUE]... [COMMAND [ARG]...]'],
    description: 'Print the environment variables, or run COMMAND with extra NAME=VALUE variables.',
    examples: [['env | grep PATH', 'find a variable'], ['env LANG=C ls', 'run ls with a different language']],
    seeAlso: ['printenv', 'export'],
  },
  run(ctx) {
    const args = [...ctx.args];
    const extra: Record<string, string> = {};
    while (args.length && /^[A-Za-z_]\w*=/.test(args[0]!)) {
      const a = args.shift()!;
      const i = a.indexOf('=');
      extra[a.slice(0, i)] = a.slice(i + 1);
    }
    if (args[0] === '-i') args.shift();
    if (args.length === 0) {
      const vars = { ...ctx.shell.exportedVars(), ...extra };
      ctx.out(Object.entries(vars).map(([k, v]) => `${k}=${v}`).join('\n') + '\n');
      return 0;
    }
    const saved: Record<string, string | undefined> = {};
    for (const [k, v] of Object.entries(extra)) {
      saved[k] = ctx.shell.getVar(k);
      ctx.shell.setVar(k, v, true);
    }
    const r = ctx.shell.run(args, ctx.stdin);
    for (const [k, v] of Object.entries(saved)) {
      if (v === undefined) ctx.shell.unsetVar(k);
      else ctx.shell.setVar(k, v, true);
    }
    ctx.forward(r.chunks);
    if (r.code === 127) {
      // env reports a missing command itself
      return 127;
    }
    return r.code;
  },
};

export const printenv: CommandDef = {
  name: 'printenv',
  category: 'shell',
  doc: { summary: 'print all or part of environment', usage: ['printenv [VARIABLE]...'], examples: [['printenv HOME', 'value of one variable']] },
  run(ctx) {
    const vars = ctx.shell.exportedVars();
    if (ctx.args.length === 0) {
      ctx.out(Object.entries(vars).map(([k, v]) => `${k}=${v}`).join('\n') + '\n');
      return 0;
    }
    let code = 0;
    for (const a of ctx.args) {
      if (a in vars) ctx.out(vars[a] + '\n');
      else code = 1;
    }
    return code;
  },
};

export const alias: CommandDef = {
  name: 'alias',
  builtin: true,
  category: 'shell',
  doc: {
    summary: 'define or display aliases',
    usage: ['alias [name[=value] ... ]'],
    description: "Without arguments, print the list of aliases. `alias name='command'` creates a shortcut: typing name runs command.",
    examples: [["alias ll='ls -alF'", 'a shortcut for a detailed listing'], ["alias gs='git status'", 'save typing']],
    seeAlso: ['unalias', 'type'],
  },
  run(ctx) {
    const all = ctx.shell.aliases();
    const fmt = (k: string) => `alias ${k}='${all[k]!.replace(/'/g, `'\\''`)}'`;
    const args = ctx.args.filter((a) => a !== '-p');
    if (args.length === 0) {
      const keys = Object.keys(all).sort();
      if (keys.length) ctx.out(keys.map(fmt).join('\n') + '\n');
      return 0;
    }
    let code = 0;
    for (const a of args) {
      const eq = a.indexOf('=');
      if (eq === -1) {
        if (a in all) ctx.out(fmt(a) + '\n');
        else {
          ctx.err(`bash: alias: ${a}: not found\n`);
          code = 1;
        }
        continue;
      }
      const name = a.slice(0, eq);
      if (!/^[^\s/$`'"=|&;<>()]+$/.test(name)) {
        ctx.err(`bash: alias: \`${name}': invalid alias name\n`);
        code = 1;
        continue;
      }
      ctx.shell.setAlias(name, a.slice(eq + 1));
      all[name] = a.slice(eq + 1);
    }
    return code;
  },
};

export const unalias: CommandDef = {
  name: 'unalias',
  builtin: true,
  category: 'shell',
  doc: { summary: 'remove alias definitions', usage: ['unalias [-a] name [name ...]'] },
  run(ctx) {
    if (ctx.args[0] === '-a') {
      for (const k of Object.keys(ctx.shell.aliases())) ctx.shell.unalias(k);
      return 0;
    }
    if (ctx.args.length === 0) {
      ctx.err('unalias: usage: unalias [-a] name [name ...]\n');
      return 2;
    }
    let code = 0;
    for (const a of ctx.args) {
      if (!ctx.shell.unalias(a)) {
        ctx.err(`bash: unalias: ${a}: not found\n`);
        code = 1;
      }
    }
    return code;
  },
};

export const type: CommandDef = {
  name: 'type',
  builtin: true,
  category: 'shell',
  doc: {
    summary: 'display information about command type',
    usage: ['type [-at] name [name ...]'],
    description: 'For each NAME, indicate how it would be interpreted if used as a command name: alias, shell builtin or file.',
    examples: [['type ls', 'ls is aliased to ...'], ['type cd', 'cd is a shell builtin']],
    seeAlso: ['which'],
  },
  run(ctx) {
    const a = parseArgs(ctx.args, { flags: 'atpP' });
    let code = 0;
    const aliases = ctx.shell.aliases();
    for (const name of a.operands) {
      const def = ctx.shell.lookup(name);
      if (a.flags.has('t')) {
        if (name in aliases) ctx.out('alias\n');
        else if (def?.builtin) ctx.out('builtin\n');
        else if (def) ctx.out('file\n');
        else code = 1;
        continue;
      }
      if (name in aliases) ctx.out(`${name} is aliased to \`${aliases[name]}'\n`);
      else if (def?.builtin) ctx.out(`${name} is a shell builtin\n`);
      else if (def) ctx.out(`${name} is /usr/bin/${name}\n`);
      else {
        ctx.err(`bash: type: ${name}: not found\n`);
        code = 1;
      }
    }
    return code;
  },
};

export const exit: CommandDef = {
  name: 'exit',
  builtin: true,
  category: 'shell',
  doc: { summary: 'exit the shell', usage: ['exit [n]'], description: 'Exit the shell with a status of N. After `sudo -i` or `su`, exit returns to your own user.' },
  run(ctx) {
    const n = ctx.args[0] !== undefined ? Number(ctx.args[0]) : Number(ctx.shell.getVar('?') ?? 0);
    if (ctx.args[0] !== undefined && !Number.isInteger(n)) {
      ctx.err(`bash: exit: ${ctx.args[0]}: numeric argument required\n`);
    }
    ctx.shell.requestExit();
    if (ctx.shell.getVar('0') !== 'bash') return Number.isInteger(n) ? n & 255 : 2;
    if (ctx.shell.popUser()) {
      ctx.out('logout\n');
      return Number.isInteger(n) ? n & 255 : 2;
    }
    ctx.out('logout\n');
    ctx.shell.emit({ type: 'exit' });
    return Number.isInteger(n) ? n & 255 : 2;
  },
};

export const trueCmd: CommandDef = {
  name: 'true',
  builtin: true,
  category: 'shell',
  doc: { summary: 'do nothing, successfully', usage: ['true'] },
  run: () => 0,
};

export const falseCmd: CommandDef = {
  name: 'false',
  builtin: true,
  category: 'shell',
  doc: { summary: 'do nothing, unsuccessfully', usage: ['false'] },
  run: () => 1,
};

export const bash: CommandDef = {
  name: 'bash',
  category: 'shell',
  doc: {
    summary: 'GNU Bourne-Again SHell',
    usage: ['bash [script [args...]]', 'bash -c "command string"'],
    description: 'Run a shell script file, or a command string with -c. The trainer supports commands, pipes, redirects, variables and && / || lists inside scripts (no if/for loops yet).',
    examples: [['bash backup.sh', 'run a script without making it executable'], ['bash -c "ls | wc -l"', 'run a command string']],
    seeAlso: ['sh', 'source'],
  },
  run(ctx) {
    const args = ctx.args.filter((a) => a !== '-e' && a !== '-x' && a !== '-l' && a !== '--login');
    if (args[0] === '-c') {
      if (args[1] === undefined) {
        ctx.err('bash: -c: option requires an argument\n');
        return 2;
      }
      const r = ctx.shell.runScript(args[1], args.slice(3), { subshell: true, name: args[2] ?? 'bash', stdin: ctx.stdin });
      ctx.forward(r.chunks);
      return r.code;
    }
    if (args.length === 0) {
      if (ctx.stdin !== null) {
        const r = ctx.shell.runScript(ctx.stdin, [], { subshell: true, name: 'bash', stdin: null });
        ctx.forward(r.chunks);
        return r.code;
      }
      return 0; // a nested interactive shell: nothing to do in the trainer
    }
    const [file, ...rest] = args;
    let text: string;
    try {
      text = ctx.readFile(file!);
    } catch (e) {
      if (e instanceof FsError) {
        ctx.err(`${ctx.name}: ${file}: ${e.text}\n`);
        return 127;
      }
      throw e;
    }
    const r = ctx.shell.runScript(text, rest, { subshell: true, name: file!, stdin: ctx.stdin });
    ctx.forward(r.chunks);
    return r.code;
  },
};

export const sh: CommandDef = { ...bash, name: 'sh', doc: { ...bash.doc, summary: 'command interpreter (shell)' } };

export const source: CommandDef = {
  name: 'source',
  builtin: true,
  category: 'shell',
  doc: {
    summary: 'execute commands from a file in the current shell',
    usage: ['source filename [arguments]', '. filename [arguments]'],
    description: 'Read and execute commands from FILENAME in the current shell: variables, aliases and cd made by the file stay in effect. Typical use: `source ~/.bashrc` after editing it.',
  },
  run(ctx) {
    const [file, ...rest] = ctx.args;
    if (!file) {
      ctx.err(`bash: ${ctx.name}: filename argument required\n${ctx.name}: usage: ${ctx.name} filename [arguments]\n`);
      return 2;
    }
    let text: string;
    try {
      text = ctx.readFile(file);
    } catch (e) {
      if (e instanceof FsError) {
        ctx.err(`bash: ${file}: ${e.text}\n`);
        return 1;
      }
      throw e;
    }
    // ignore lines the trainer cannot run (if/fi blocks in .profile)
    const runnable = filterUnsupported(text);
    const r = ctx.shell.runScript(runnable, rest, { subshell: false, name: 'bash', stdin: ctx.stdin });
    ctx.forward(r.chunks);
    return r.code;
  },
};

export const dot: CommandDef = { ...source, name: '.' };

/** Drop if/for/while blocks from sourced files (not supported yet). */
function filterUnsupported(text: string): string {
  const out: string[] = [];
  let depth = 0;
  for (const line of text.split('\n')) {
    const t = line.trim();
    if (/^(if|for|while|until|case)\b/.test(t)) depth++;
    if (depth === 0 && !/^\w+\s*\(\)\s*\{/.test(t)) out.push(line);
    if (/^(fi|done|esac)\b/.test(t) || /;\s*(fi|done)\s*$/.test(t)) depth = Math.max(0, depth - 1);
  }
  return out.join('\n');
}

export const test: CommandDef = {
  name: 'test',
  builtin: true,
  category: 'shell',
  doc: {
    summary: 'evaluate conditional expression',
    usage: ['test EXPRESSION', '[ EXPRESSION ]'],
    description: 'Exit with status 0 (true) or 1 (false) depending on EXPRESSION. Useful with && and ||.',
    options: [
      ['-e FILE', 'FILE exists'],
      ['-f FILE', 'FILE exists and is a regular file'],
      ['-d FILE', 'FILE exists and is a directory'],
      ['-s FILE', 'FILE exists and has a size greater than zero'],
      ['-r/-w/-x FILE', 'FILE is readable / writable / executable'],
      ['-z STRING', 'the length of STRING is zero'],
      ['-n STRING', 'the length of STRING is nonzero'],
      ['S1 = S2, S1 != S2', 'the strings are equal / not equal'],
      ['N1 -eq/-ne/-lt/-le/-gt/-ge N2', 'integer comparison'],
    ],
    examples: [['[ -f config.txt ] && echo found', 'run echo only if the file exists']],
  },
  run(ctx) {
    let args = [...ctx.args];
    if (ctx.name === '[') {
      if (args[args.length - 1] !== ']') {
        ctx.err("bash: [: missing `]'\n");
        return 2;
      }
      args = args.slice(0, -1);
    }
    const unary = (op: string, v: string): boolean | null => {
      const st = () => ctx.tryStat(v);
      switch (op) {
        case '-e': case '-a': return !!st();
        case '-f': return st()?.node.type === 'file';
        case '-d': return st()?.node.type === 'dir';
        case '-L': case '-h': return ctx.tryStat(v, false)?.node.type === 'symlink';
        case '-s': { const s = st(); return !!s && nodeSize(s.node) > 0 && s.node.type !== 'dir' || (!!s && s.node.type === 'dir'); }
        case '-r': { const s = st(); return !!s && can(s.node, ctx.cred, R); }
        case '-w': { const s = st(); return !!s && can(s.node, ctx.cred, W); }
        case '-x': { const s = st(); return !!s && can(s.node, ctx.cred, X); }
        case '-z': return v.length === 0;
        case '-n': return v.length > 0;
      }
      return null;
    };
    const binary = (l: string, op: string, r: string): boolean | null => {
      switch (op) {
        case '=': case '==': return l === r;
        case '!=': return l !== r;
      }
      if (/^-(eq|ne|lt|le|gt|ge)$/.test(op)) {
        if (!/^-?\d+$/.test(l.trim()) || !/^-?\d+$/.test(r.trim())) {
          ctx.err(`bash: ${ctx.name}: ${/^-?\d+$/.test(l.trim()) ? r : l}: integer expression expected\n`);
          throw new Error('int');
        }
        const a = Number(l), b = Number(r);
        return { '-eq': a === b, '-ne': a !== b, '-lt': a < b, '-le': a <= b, '-gt': a > b, '-ge': a >= b }[op] ?? null;
      }
      return null;
    };
    const evalExpr = (xs: string[]): boolean => {
      if (xs[0] === '!') return !evalExpr(xs.slice(1));
      const orIdx = xs.indexOf('-o');
      if (orIdx > 0) return evalExpr(xs.slice(0, orIdx)) || evalExpr(xs.slice(orIdx + 1));
      const andIdx = xs.indexOf('-a', 1);
      if (andIdx > 0 && xs.length > 3) return evalExpr(xs.slice(0, andIdx)) && evalExpr(xs.slice(andIdx + 1));
      if (xs.length === 0) return false;
      if (xs.length === 1) return xs[0]!.length > 0;
      if (xs.length === 2) {
        const r = unary(xs[0]!, xs[1]!);
        if (r === null) throw new Error(`bash: ${ctx.name}: ${xs[0]}: unary operator expected`);
        return r;
      }
      if (xs.length === 3) {
        const r = binary(xs[0]!, xs[1]!, xs[2]!);
        if (r === null) throw new Error(`bash: ${ctx.name}: ${xs[1]}: binary operator expected`);
        return r;
      }
      throw new Error(`bash: ${ctx.name}: too many arguments`);
    };
    try {
      return evalExpr(args) ? 0 : 1;
    } catch (e) {
      if (e instanceof Error && e.message !== 'int') ctx.err(e.message + '\n');
      return 2;
    }
  },
};

export const bracket: CommandDef = { ...test, name: '[' };

export const help: CommandDef = {
  name: 'help',
  builtin: true,
  category: 'help',
  doc: { summary: 'display information about builtin commands', usage: ['help [pattern ...]'], description: 'Without arguments, lists the commands available in the trainer.' },
  run(ctx) {
    if (ctx.args.length) {
      let code = 0;
      for (const a of ctx.args) {
        const d = ctx.shell.lookup(a);
        if (!d) {
          ctx.err(`bash: help: no help topics match \`${a}'.  Try \`help help' or \`man -k ${a}' or \`info ${a}'.\n`);
          code = 1;
          continue;
        }
        ctx.out(`${a}: ${d.doc.usage[0]}\n    ${d.doc.summary}\n`);
      }
      return code;
    }
    const names = ctx.shell.commandNames().filter((n) => /^[a-z]/.test(n)).sort();
    let out = 'GNU bash, version 5.2.21(1)-release (x86_64-pc-linux-gnu) — Linux Trainer\n';
    out += 'These commands are available. Type `man NAME` or `NAME --help` to learn more.\n\n';
    const width = 16;
    const perRow = Math.max(1, Math.floor(ctx.columns / width));
    for (let i = 0; i < names.length; i += perRow) {
      out += names.slice(i, i + perRow).map((n) => n.padEnd(width)).join('').trimEnd() + '\n';
    }
    ctx.out(out);
    return 0;
  },
};

export const read: CommandDef = {
  name: 'read',
  builtin: true,
  category: 'shell',
  doc: {
    summary: 'read a line from standard input into variables',
    usage: ['read [-r] [-p PROMPT] NAME...'],
    description: 'Read one line and split it into words: the first word goes to the first NAME, the rest of the line to the last one. Exit status is 1 at end of input, which makes `while read line; do …; done < file` stop.',
    options: [
      ['-r', 'do not treat backslashes as escapes'],
      ['-p PROMPT', 'print PROMPT first'],
    ],
    examples: [['while read line; do echo "> $line"; done < notes.txt', 'process a file line by line'], ['read -p "Name: " name', 'ask the user (interactive)']],
    seeAlso: ['echo'],
  },
  run(ctx) {
    const a = parseArgs(ctx.args, { flags: 'rs', withValue: 'pdnt' });
    const names = a.operands.length ? a.operands : ['REPLY'];
    const line = ctx.shell.readLine(ctx.stdin);
    if (line === null) {
      for (const n of names) ctx.shell.setVar(n, '');
      return 1;
    }
    const text = a.flags.has('r') ? line : line.replace(/\\(.)/g, '$1');
    if (names.length === 1) {
      ctx.shell.setVar(names[0]!, names[0] === 'REPLY' ? text : text.trim());
      return 0;
    }
    const words = text.trim().split(/[ \t]+/);
    names.forEach((n, i) => ctx.shell.setVar(n, i === names.length - 1 ? words.slice(i).join(' ') : (words[i] ?? '')));
    return 0;
  },
};

function loopBuiltin(kind: 'break' | 'continue'): CommandDef {
  return {
    name: kind,
    builtin: true,
    category: 'shell',
    doc: { summary: kind === 'break' ? 'exit from a for, while or until loop' : 'resume the next iteration of a loop', usage: [`${kind} [N]`] },
    run(ctx) {
      const n = Number(ctx.args[0] ?? 1);
      if (!Number.isInteger(n) || n < 1) {
        ctx.err(`bash: ${kind}: ${ctx.args[0]}: loop count out of range\n`);
        return 1;
      }
      if (!ctx.shell.loopControl(kind, n)) return 0;
      return 0;
    },
  };
}
export const breakCmd = loopBuiltin('break');
export const continueCmd = loopBuiltin('continue');
