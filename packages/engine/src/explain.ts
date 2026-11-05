/**
 * "Explain command" mode: split a command line into parts and describe each
 * one. Every generic part carries an i18n `key` (+ `params`), commands carry
 * their name and options carry the option spec from the built-in manual, so
 * the UI can show a translated text; `description` is the English fallback.
 */
import { parse, ParseError, wordLiteral, type Script, type SimpleCommand, type Word } from './shell/parser';
import type { Registry } from './shell/interpreter';
import type { CommandDef } from './shell/context';

export type ExplainKind = 'command' | 'subcommand' | 'flag' | 'value' | 'arg' | 'operator' | 'redirect' | 'assignment' | 'keyword' | 'unknown';

export interface ExplainFlag {
  /** "-l" */
  flag: string;
  /** Option spec from the manual, e.g. "-l, --lines" (key for translations). */
  spec?: string;
  description: string;
  key?: string;
  params?: Record<string, string>;
}

export interface ExplainPart {
  text: string;
  kind: ExplainKind;
  /** English description. */
  description: string;
  /** i18n key for generic parts (operators, argument kinds). */
  key?: string;
  /** Interpolation params for the key. */
  params?: Record<string, string>;
  /** kind=command: the command name (translated summary lookup). */
  command?: string;
  /** The command this option / subcommand belongs to. */
  owner?: string;
  /** Option spec (flags / subcommands) for translated option texts. */
  spec?: string;
  /** Several short flags written together (-la): one entry per flag. */
  flags?: ExplainFlag[];
}

export interface Explanation {
  parts: ExplainPart[];
  error?: string;
}

const OPERATORS: Record<string, [string, string]> = {
  '|': ['explain.op.pipe', 'pipe: send the output of the command on the left into the input of the command on the right'],
  '&&': ['explain.op.and', 'run the next command only if the previous one succeeded'],
  '||': ['explain.op.or', 'run the next command only if the previous one failed'],
  ';': ['explain.op.seq', 'run the next command after this one, whatever the result'],
  '&': ['explain.op.bg', 'run the command in the background'],
};

const REDIRECTS: Record<string, [string, string]> = {
  '>': ['explain.redir.out', 'write the output into a file (the file is overwritten)'],
  '>>': ['explain.redir.append', 'append the output to the end of a file'],
  '<': ['explain.redir.in', 'read the input of the command from a file'],
  '2>': ['explain.redir.err', 'write error messages into a file'],
  '2>>': ['explain.redir.errAppend', 'append error messages to a file'],
  '2>&1': ['explain.redir.errToOut', 'send error messages to the same place as normal output'],
  '>&2': ['explain.redir.outToErr', 'send the output to the error stream'],
  '&>': ['explain.redir.both', 'write both output and errors into a file'],
  '&>>': ['explain.redir.bothAppend', 'append both output and errors to a file'],
};

const SIGNALS: Record<string, [string, string]> = {
  '1': ['HUP', 'hang up: many daemons re-read their configuration'],
  '2': ['INT', 'interrupt, like Ctrl+C'],
  '9': ['KILL', 'kill immediately; the process cannot catch or ignore it'],
  '15': ['TERM', 'ask the process to terminate politely (the default)'],
  '19': ['STOP', 'pause the process'],
  '18': ['CONT', 'continue a paused process'],
};
const SIGNAL_BY_NAME: Record<string, string> = Object.fromEntries(Object.entries(SIGNALS).map(([n, [name]]) => [name, n]));

type Role =
  | 'file'
  | 'dir'
  | 'newDir'
  | 'pattern'
  | 'sedScript'
  | 'awkProgram'
  | 'mode'
  | 'owner'
  | 'linkTarget'
  | 'linkName'
  | 'pid'
  | 'procName'
  | 'unit'
  | 'host'
  | 'url'
  | 'port'
  | 'text'
  | 'format'
  | 'number'
  | 'seconds'
  | 'username'
  | 'groupname'
  | 'commandName'
  | 'varAssign'
  | 'varName'
  | 'aliasDef'
  | 'script'
  | 'set'
  | 'startPath'
  | 'image'
  | 'container'
  | 'tokens';

/** Meaning of positional arguments; the last role repeats. */
const POSITIONAL: Record<string, Role[]> = {
  grep: ['pattern', 'file'],
  zgrep: ['pattern', 'file'],
  sed: ['sedScript', 'file'],
  awk: ['awkProgram', 'file'],
  chmod: ['mode', 'file'],
  chown: ['owner', 'file'],
  ln: ['linkTarget', 'linkName'],
  kill: ['pid'],
  killall: ['procName'],
  pkill: ['procName'],
  pgrep: ['procName'],
  cd: ['dir'],
  tree: ['dir'],
  mkdir: ['newDir'],
  rmdir: ['dir'],
  echo: ['text'],
  printf: ['format', 'text'],
  seq: ['number'],
  sleep: ['seconds'],
  service: ['unit', 'tokens'],
  ping: ['host'],
  traceroute: ['host'],
  dig: ['host'],
  nslookup: ['host'],
  host: ['host'],
  curl: ['url'],
  wget: ['url'],
  nc: ['host', 'port'],
  useradd: ['username'],
  userdel: ['username'],
  usermod: ['username'],
  passwd: ['username'],
  su: ['username'],
  id: ['username'],
  groups: ['username'],
  groupadd: ['groupname'],
  man: ['commandName'],
  whatis: ['commandName'],
  which: ['commandName'],
  type: ['commandName'],
  help: ['commandName'],
  export: ['varAssign'],
  alias: ['aliasDef'],
  unalias: ['commandName'],
  unset: ['varName'],
  read: ['varName'],
  tr: ['set'],
  source: ['script'],
  '.': ['script'],
  bash: ['script'],
  sh: ['script'],
  find: ['startPath'],
};

/** Options that take a value even when the manual spec does not show it. */
const VALUE_OPTS: Record<string, string[]> = {
  head: ['-n', '-c'],
  tail: ['-n', '-c'],
  grep: ['-e', '-m', '-A', '-B', '-C', '-f'],
  cut: ['-d', '-f', '-c'],
  sort: ['-k', '-t', '-o'],
  mkdir: ['-m'],
  tree: ['-L'],
  awk: ['-F', '-v'],
  sed: ['-e'],
  xargs: ['-n', '-I'],
  sudo: ['-u'],
  du: ['-d'],
  ping: ['-c', '-i', '-W'],
  journalctl: ['-u', '-n', '-p'],
  nc: ['-w'],
  curl: ['-o', '-w', '-X', '-H', '-d', '-m'],
  useradd: ['-s', '-G', '-d'],
  usermod: ['-G', '-s'],
  pgrep: ['-u'],
  pkill: ['-u'],
  top: ['-n'],
  paste: ['-d'],
  seq: ['-s'],
  read: ['-p'],
  docker: ['-p', '--publish', '--name', '-e', '--env', '-v', '--volume', '--restart', '--network', '--format', '--file', '--tail', '-n', '-w', '-u'],
};

function escapeRe(s: string): string {
  return s.replace(/[-[\]{}()*+?.\\^$|]/g, '\\$&');
}

/** Find the manual entry for an option: ["-n, --lines=NUM", "print ..."]. */
function findOption(def: CommandDef | undefined, flag: string): [string, string] | undefined {
  const options = def?.doc.options;
  if (!options) return undefined;
  const re = new RegExp(`(^|[\\s,/|])${escapeRe(flag)}($|[\\s,=\\[/|<])`);
  // real options first ("-d, --detach"), then subcommand lines that mention it ("compose up -d")
  return options.find(([f]) => (f.startsWith('-') || !flag.startsWith('-')) && re.test(f)) ?? options.find(([f]) => re.test(f));
}

/** Does this option take a value (`-n 5`, `-d:`, `--lines=5`)? */
function takesValue(def: CommandDef | undefined, flag: string): boolean {
  if (!def) return false;
  if ((VALUE_OPTS[def.name] ?? []).includes(flag)) return true;
  const opt = findOption(def, flag);
  if (!opt) return false;
  return opt[0].split(/,\s*/).some((tok) => /^-{1,2}[\w-]+(\s+\S|=)/.test(tok) && !tok.includes('[='));
}

const strip = (s: string) => s.replace(/^(['"])(.*)\1$/s, '$2');

function describePath(text: string): { key: string; description: string } {
  if (text.startsWith('$(') || text.startsWith('`')) return { key: 'explain.arg.cmdSubst', description: 'command substitution: replaced with the output of the command inside' };
  if (/^["']?\$/.test(text)) return { key: 'explain.arg.variable', description: 'a variable: replaced with its value' };
  if (/[*?[]/.test(strip(text)) && !/^['"]/.test(text)) return { key: 'explain.arg.glob', description: 'a glob pattern: the shell replaces it with all matching file names' };
  if (/^['"].*[*?[]/.test(text)) return { key: 'explain.arg.quotedGlob', description: 'a pattern in quotes: passed to the command as is, not expanded by the shell' };
  if (text === '~' || text.startsWith('~/')) return { key: 'explain.arg.home', description: 'a path inside your home directory (~)' };
  if (text === '.' || text === './') return { key: 'explain.arg.cwd', description: 'the current directory' };
  if (text === '..' || text === '../') return { key: 'explain.arg.parent', description: 'the parent directory' };
  if (text === '-') return { key: 'explain.arg.stdin', description: 'standard input' };
  if (text === '/dev/null') return { key: 'explain.arg.devNull', description: '/dev/null: a black hole that discards everything written to it' };
  if (text.startsWith('/')) return { key: 'explain.arg.absPath', description: 'an absolute path (starts at the root /)' };
  if (text.includes('/')) return { key: 'explain.arg.relPath', description: 'a relative path (from the current directory)' };
  if (/^['"]/.test(text)) return { key: 'explain.arg.string', description: 'a quoted string: passed as a single argument' };
  if (/\.\w{1,5}$/.test(text)) return { key: 'explain.arg.fileName', description: 'a file name (in the current directory)' };
  return { key: 'explain.arg.plain', description: 'an argument: a file or directory name' };
}

function rwx(d: number): string {
  return (d & 4 ? 'r' : '-') + (d & 2 ? 'w' : '-') + (d & 1 ? 'x' : '-');
}

const WHO: Record<string, string> = { u: 'owner', g: 'group', o: 'others', a: 'everyone' };
const PERM: Record<string, string> = { r: 'read', w: 'write', x: 'execute', X: 'execute (dirs)', s: 'setuid/setgid', t: 'sticky' };
const OP: Record<string, string> = { '+': 'add', '-': 'remove', '=': 'set exactly' };

/**
 * `u+x,g-w` → "owner: add execute; group: remove write". Words are passed as
 * `@key|key` params: the app translates every key and joins them.
 */
function symbolicMode(v: string): (Omit<ExplainPart, 'text' | 'kind'>) | undefined {
  const clauses = v.split(',');
  const en: string[] = [];
  for (const c of clauses) {
    const m = /^([ugoa]*)([+=-])([rwxXst]*)$/.exec(c);
    if (!m) return undefined;
    const who = [...new Set((m[1] || 'a').split(''))];
    const perms = [...new Set(m[3]!.split(''))];
    const whoKeys = who.map((w) => `explain.chmod.who.${w}`).join('|');
    const permKeys = perms.length ? perms.map((p) => `explain.chmod.perm.${p === 'X' ? 'x' : p}`).join('|') : 'explain.chmod.perm.none';
    const op = m[2] === '+' ? 'add' : m[2] === '-' ? 'remove' : 'set';
    en.push(`${who.map((w) => WHO[w]).join(', ')}: ${OP[m[2]!]} ${perms.length ? perms.map((p) => PERM[p]).join(', ') : 'nothing'}`);
    if (clauses.length === 1) return { key: `explain.chmod.${op}`, params: { mode: v, who: '@' + whoKeys, perms: '@' + permKeys }, description: `${v}: ${en[0]}` };
  }
  return { key: 'explain.arg.modeSymbolicList', params: { mode: v }, description: `${v}: ${en.join('; ')}`, flags: clauses.map((c) => {
    const one = symbolicMode(c)!;
    return { flag: c, key: one.key!, params: one.params!, description: one.description };
  }) };
}

/** Turn a positional argument into a described part according to its role. */
function describeRole(role: Role, raw: string): Omit<ExplainPart, 'text' | 'kind'> & { kind?: ExplainKind } {
  const v = strip(raw);
  switch (role) {
    case 'file':
    case 'dir':
    case 'startPath':
    case 'linkName': {
      const d = describePath(raw);
      if (role === 'startPath' && d.key !== 'explain.arg.glob') return { key: 'explain.arg.startPath', params: { path: v }, description: `where to start searching: ${v} (and everything inside)` };
      if (role === 'linkName') return { key: 'explain.arg.linkName', params: { name: v }, description: `the name of the new link: ${v}` };
      return d;
    }
    case 'newDir':
      return { key: 'explain.arg.newDir', params: { name: v }, description: `the directory to create: ${v}` };
    case 'linkTarget':
      return { key: 'explain.arg.linkTarget', params: { target: v }, description: `what the link points to: ${v}` };
    case 'pattern':
      return { key: 'explain.arg.pattern', params: { pattern: v }, description: `the search pattern: lines containing "${v}" (a regular expression)` };
    case 'sedScript': {
      const m = /^s(.)(.*?)\1(.*?)\1([gip0-9]*)$/.exec(v);
      if (m) {
        const all = m[4]!.includes('g');
        return { key: all ? 'explain.arg.sedSubstAll' : 'explain.arg.sedSubst', params: { from: m[2]!, to: m[3]! }, description: `replace "${m[2]}" with "${m[3]}"${all ? ' (g: every occurrence in a line)' : ' (only the first occurrence in each line)'}` };
      }
      const d = /^\/(.*)\/d$/.exec(v);
      if (d) return { key: 'explain.arg.sedDelete', params: { re: d[1]! }, description: `delete lines that match "${d[1]}"` };
      const p = /^(\d+(?:,\d+)?)p$/.exec(v);
      if (p) return { key: 'explain.arg.sedPrint', params: { range: p[1]! }, description: `print line(s) ${p[1]} (usually with -n)` };
      const nd = /^(\d+(?:,\d+)?)d$/.exec(v);
      if (nd) return { key: 'explain.arg.sedDeleteLines', params: { range: nd[1]! }, description: `delete line(s) ${nd[1]}` };
      return { key: 'explain.arg.sedScript', params: { script: v }, description: 'a sed script: what to do with each line' };
    }
    case 'awkProgram': {
      const m = /^\s*(\/[^/]*\/|[^{]*?)\s*\{\s*print\s+([^}]*?)\s*;?\s*\}\s*$/.exec(v);
      if (m) {
        const fields = m[2]!.replace(/\s*,\s*/g, ', ');
        const cond = m[1]!.trim();
        if (cond) return { key: 'explain.arg.awkCondPrint', params: { cond, fields }, description: `for lines where ${cond} holds, print ${fields}` };
        return { key: 'explain.arg.awkPrint', params: { fields }, description: `for every line print ${fields} ($1 is the first field, $NF the last)` };
      }
      return { key: 'explain.arg.awkProgram', params: { program: v }, description: 'an awk program: pattern { action } applied to every line' };
    }
    case 'mode': {
      if (/^[0-7]{3,4}$/.test(v)) {
        const d = v.slice(-3).split('').map(Number);
        const s = d.map(rwx);
        return { key: 'explain.arg.modeOctal', params: { mode: v, all: s.join(''), u: s[0]!, g: s[1]!, o: s[2]! }, description: `permissions ${v} = ${s.join('')}: owner ${s[0]}, group ${s[1]}, others ${s[2]}` };
      }
      const sym = symbolicMode(v);
      if (sym) return sym;
      return { key: 'explain.arg.modeSymbolic', params: { mode: v }, description: `symbolic permissions ${v}: u owner, g group, o others, a all; + add, - remove, = set exactly; r read, w write, x execute` };
    }
    case 'owner': {
      const [u, g] = v.split(':');
      if (g !== undefined && u) return { key: 'explain.arg.ownerGroup', params: { user: u, group: g || u }, description: `new owner ${u} and group ${g || u}` };
      if (g !== undefined) return { key: 'explain.arg.groupOnly', params: { group: g }, description: `new group ${g}` };
      return { key: 'explain.arg.owner', params: { user: v }, description: `new owner: user ${v}` };
    }
    case 'pid':
      return /^%\d+$/.test(v) ? { key: 'explain.arg.job', params: { job: v }, description: `job number ${v.slice(1)} of this shell` } : { key: 'explain.arg.pid', params: { pid: v }, description: `process ID (PID) ${v}` };
    case 'procName':
      return { key: 'explain.arg.procName', params: { name: v }, description: `processes named ${v}` };
    case 'unit':
      return { key: 'explain.arg.unit', params: { unit: v }, description: `the service (unit) ${v}` };
    case 'host':
      return /^\d+\.\d+\.\d+\.\d+$/.test(v) ? { key: 'explain.arg.ip', params: { host: v }, description: `the IP address ${v}` } : { key: 'explain.arg.host', params: { host: v }, description: `the host name ${v}` };
    case 'url':
      return { key: 'explain.arg.url', params: { url: v }, description: `the address (URL) to request: ${v}` };
    case 'port':
      return { key: 'explain.arg.port', params: { port: v }, description: `TCP port ${v}` };
    case 'text':
      if (/^["']?\$/.test(raw) || raw.startsWith('`')) return describePath(raw);
      return { key: 'explain.arg.text', params: { text: v }, description: 'the text to print' };
    case 'format':
      return { key: 'explain.arg.format', params: { format: v }, description: 'the format: %s is replaced with a string, %d with a number, \\n is a new line' };
    case 'number':
      return { key: 'explain.arg.number', params: { n: v }, description: `the number ${v}` };
    case 'seconds':
      return { key: 'explain.arg.seconds', params: { n: v }, description: `how long to wait: ${v} s` };
    case 'username':
      return { key: 'explain.arg.username', params: { name: v }, description: `the user ${v}` };
    case 'groupname':
      return { key: 'explain.arg.groupname', params: { name: v }, description: `the group ${v}` };
    case 'commandName':
      return { key: 'explain.arg.commandName', params: { name: v }, description: `the command ${v}` };
    case 'varAssign': {
      const eq = v.indexOf('=');
      return eq > 0 ? { key: 'explain.arg.exportAssign', params: { name: v.slice(0, eq), value: v.slice(eq + 1) }, description: `set ${v.slice(0, eq)} and make it visible to child programs` } : { key: 'explain.arg.varName', params: { name: v }, description: `the variable ${v}` };
    }
    case 'varName':
      return { key: 'explain.arg.varName', params: { name: v }, description: `the variable ${v}` };
    case 'aliasDef': {
      const eq = v.indexOf('=');
      return eq > 0 ? { key: 'explain.arg.aliasDef', params: { name: v.slice(0, eq), value: strip(v.slice(eq + 1)) }, description: `typing ${v.slice(0, eq)} will run ${strip(v.slice(eq + 1))}` } : { key: 'explain.arg.commandName', params: { name: v }, description: `the alias ${v}` };
    }
    case 'script':
      return { key: 'explain.arg.script', params: { file: v }, description: `the script file ${v}` };
    case 'set':
      return { key: 'explain.arg.charSet', params: { set: v }, description: `a set of characters: ${v}` };
    case 'image':
      return { key: 'explain.arg.image', params: { image: v }, description: `the image ${v} (name[:tag], latest by default)` };
    case 'container':
      return { key: 'explain.arg.container', params: { name: v }, description: `the container ${v} (name or ID)` };
    default:
      return describePath(raw);
  }
}

interface Ctx {
  parts: ExplainPart[];
  registry: Registry;
}

/** Real commands the trainer does not simulate: not a typo, just not here. */
const REAL_ELSEWHERE = new Set(['tar', 'gzip', 'gunzip', 'zip', 'unzip', 'xz', 'bzip2', 'apt', 'apt-get', 'dpkg', 'yum', 'dnf', 'pacman', 'snap', 'ssh', 'scp', 'sftp', 'rsync', 'make', 'gcc', 'python', 'python3', 'pip', 'pip3', 'node', 'npm', 'npx', 'java', 'htop', 'crontab', 'mount', 'umount', 'lsblk', 'fdisk', 'mkfs', 'vi', 'emacs', 'screen', 'tmux', 'gh', 'kubectl', 'helm', 'terraform', 'ansible', 'openssl', 'iptables', 'ufw', 'nmap', 'tcpdump', 'jq', 'watch', 'lsof', 'strace', 'shutdown', 'reboot']);

function commandPart(ctx: Ctx, w: Word): CommandDef | undefined {
  const name = wordLiteral(w);
  if (name.includes('/')) {
    ctx.parts.push({ text: w.raw, kind: 'command', key: 'explain.runScript', params: { file: name }, description: `run the program or script ${name} (a path, not a command from $PATH)` });
    return undefined;
  }
  if (!ctx.registry.get(name) && REAL_ELSEWHERE.has(name)) {
    ctx.parts.push({ text: w.raw, kind: 'command', key: 'explain.notInTrainer', params: { name }, description: `${name}: a real Linux command, but this trainer does not simulate it` });
    return undefined;
  }
  const def = ctx.registry.get(name);
  ctx.parts.push(def ? { text: w.raw, kind: 'command', command: def.name, description: def.doc.summary } : { text: w.raw, kind: 'unknown', key: 'explain.unknownCommand', description: 'unknown command — maybe a typo?' });
  return def;
}

/** Options of a command ("-la", "--all", "-n 5", "-d:"). Returns the index after the option and its value. */
function explainOption(ctx: Ctx, def: CommandDef | undefined, words: Word[], i: number): number {
  const w = words[i]!;
  const t = wordLiteral(w);
  const owner = def?.name;
  if (t.startsWith('--')) {
    const [flag, inline] = t.includes('=') ? [t.slice(0, t.indexOf('=')), t.slice(t.indexOf('=') + 1)] : [t, undefined];
    const opt = findOption(def, flag);
    ctx.parts.push({ text: w.raw, kind: 'flag', description: opt ? opt[1] : 'option', ...(opt ? { spec: opt[0] } : { key: 'explain.option' }), ...(owner ? { owner } : {}) });
    if (inline === undefined && takesValue(def, flag) && words[i + 1]) {
      ctx.parts.push({ text: words[i + 1]!.raw, kind: 'value', key: 'explain.optionValue', params: { option: flag, value: strip(words[i + 1]!.raw) }, description: `value for ${flag}` });
      return i + 2;
    }
    return i + 1;
  }
  // a whole-word option (find -name, ip -br, test -eq)
  const whole = findOption(def, t);
  if (t.length > 2 && whole) {
    ctx.parts.push({ text: w.raw, kind: 'flag', spec: whole[0], description: whole[1], ...(owner ? { owner } : {}) });
    if (takesValue(def, t) && words[i + 1]) {
      ctx.parts.push({ text: words[i + 1]!.raw, kind: 'value', key: 'explain.optionValue', params: { option: t, value: strip(words[i + 1]!.raw) }, description: `value for ${t}` });
      return i + 2;
    }
    return i + 1;
  }
  // short flags, possibly combined (-la) or with an attached value (-d: -f1 -n5)
  const chars = [...t.slice(1)];
  const flags: ExplainFlag[] = [];
  let value: string | undefined;
  for (let k = 0; k < chars.length; k++) {
    const f = '-' + chars[k];
    const opt = findOption(def, f);
    flags.push({ flag: f, description: opt ? opt[1] : 'option', ...(opt ? { spec: opt[0] } : { key: 'explain.option' }) });
    if (takesValue(def, f)) {
      const rest = chars.slice(k + 1).join('');
      if (rest) value = rest;
      break;
    }
  }
  if (flags.length === 1 && value === undefined) {
    const only = flags[0]!;
    ctx.parts.push({ text: w.raw, kind: 'flag', description: only.description, ...(only.spec ? { spec: only.spec } : { key: 'explain.option' }), ...(owner ? { owner } : {}) });
  } else {
    ctx.parts.push({
      text: w.raw,
      kind: 'flag',
      description: flags.map((f) => `${f.flag}: ${f.description}`).join('\n') + (value !== undefined ? `\n${value}: value` : ''),
      flags: value !== undefined ? [...flags, { flag: value, key: 'explain.optionValue', params: { option: flags[flags.length - 1]!.flag, value }, description: `value for ${flags[flags.length - 1]!.flag}` }] : flags,
      ...(owner ? { owner } : {}),
    });
  }
  const last = flags[flags.length - 1]!.flag;
  if (value === undefined && takesValue(def, last) && words[i + 1]) {
    ctx.parts.push({ text: words[i + 1]!.raw, kind: 'value', key: 'explain.optionValue', params: { option: last, value: strip(words[i + 1]!.raw) }, description: `value for ${last}` });
    return i + 2;
  }
  return i + 1;
}

const isOption = (t: string) => t.startsWith('-') && t.length > 1 && !/^-\d+$/.test(t);

/** Subcommands listed as options in the manual: "status UNIT", "start|stop|restart UNIT", "compose up -d". */
function subcommandSpec(def: CommandDef, sub: string, next?: string): [string, string] | undefined {
  const opts = def.doc.options ?? [];
  if (next && !next.startsWith('-')) {
    const two = opts.find(([f]) => f.split(/\s+/).slice(0, 2).join(' ') === `${sub} ${next}`);
    if (two) return two;
  }
  return opts.find(([f]) => !f.startsWith('-') && f.split(/\s+/)[0]!.split('|').includes(sub));
}

function explainWords(ctx: Ctx, words: Word[]): void {
  if (!words.length) return;
  const def = commandPart(ctx, words[0]!);
  explainArgs(ctx, def, words, 1);
}

function explainArgs(ctx: Ctx, def: CommandDef | undefined, words: Word[], start: number): void {
  const name = def?.name;
  let i = start;
  let endOfOptions = false;
  let positional = 0;
  const pos: Word[] = [];

  // wrappers: the next word is another command
  if (name === 'sudo' || name === 'xargs' || name === 'env' || name === 'time') {
    while (i < words.length && isOption(wordLiteral(words[i]!))) i = explainOption(ctx, def, words, i);
    if (name === 'env') while (i < words.length && /^\w+=/.test(wordLiteral(words[i]!))) {
      const t = wordLiteral(words[i]!);
      ctx.parts.push({ text: words[i]!.raw, kind: 'assignment', key: 'explain.envAssign', params: { name: t.split('=')[0]! }, description: `set ${t.split('=')[0]} for this command only` });
      i++;
    }
    if (i < words.length) explainWords(ctx, words.slice(i));
    return;
  }

  if (name === 'kill' && words[i]) {
    const t = wordLiteral(words[i]!);
    const m = /^-(?:s\s*)?(\d+|[A-Z][A-Z0-9]*)$/.exec(t);
    if (m) {
      const n = /^\d+$/.test(m[1]!) ? m[1]! : (SIGNAL_BY_NAME[m[1]!.replace(/^SIG/, '')] ?? '');
      const sig = SIGNALS[n];
      ctx.parts.push({ text: words[i]!.raw, kind: 'flag', key: sig ? `explain.signal.${sig[0]}` : 'explain.signal', params: { n, name: sig?.[0] ?? m[1]! }, description: sig ? `signal ${n} (SIG${sig[0]}): ${sig[1]}` : `signal ${m[1]}` });
      i++;
    }
  }

  if (name === 'ps' && words[i] && /^[auxefwl]+$/.test(wordLiteral(words[i]!))) {
    const opt = findOption(def, wordLiteral(words[i]!));
    ctx.parts.push({ text: words[i]!.raw, kind: 'flag', ...(opt ? { spec: opt[0], description: opt[1] } : { key: 'explain.bsdOptions', description: 'BSD-style options (no dash)' }), ...(name ? { owner: name } : {}) });
    i++;
  }

  if ((name === 'head' || name === 'tail') && words[i] && /^-\d+$/.test(wordLiteral(words[i]!))) {
    const n = wordLiteral(words[i]!).slice(1);
    ctx.parts.push({ text: words[i]!.raw, kind: 'flag', key: name === 'head' ? 'explain.firstLines' : 'explain.lastLines', params: { n }, description: `${name === 'head' ? 'the first' : 'the last'} ${n} lines` });
    i++;
  }

  // subcommand-style tools
  if (def && (name === 'systemctl' || name === 'docker' || name === 'ip' || name === 'journalctl') ) {
    while (i < words.length && isOption(wordLiteral(words[i]!))) i = explainOption(ctx, def, words, i);
    const sub = words[i] ? wordLiteral(words[i]!) : undefined;
    if (sub && !sub.startsWith('-') && name !== 'journalctl') {
      const next = words[i + 1] ? wordLiteral(words[i + 1]!) : undefined;
      const spec = name === 'ip' ? undefined : subcommandSpec(def, sub, next);
      const ipObj = name === 'ip' ? ({ a: 'addr', addr: 'addr', address: 'addr', r: 'route', ro: 'route', route: 'route', l: 'link', link: 'link', n: 'neigh', neigh: 'neigh', neighbor: 'neigh' } as Record<string, string>)[sub] : undefined;
      const two = spec && next && !next.startsWith('-') && spec[0].split(/\s+/).slice(0, 2).join(' ') === `${sub} ${next}`;
      ctx.parts.push({ text: two ? `${words[i]!.raw} ${words[i + 1]!.raw}` : words[i]!.raw, kind: 'subcommand', owner: name!, ...(spec ? { spec: spec[0], description: spec[1] } : name === 'ip' ? { key: ipObj ? `explain.ip.${ipObj}` : 'explain.subcommand', params: { sub }, description: ipObj ? `object: ${ipObj}` : `subcommand ${sub}` } : { key: 'explain.subcommand', params: { sub }, description: `subcommand ${sub}` }) });
      i += two ? 2 : 1;
      if (name === 'docker') return explainDocker(ctx, def, sub, two ? next : undefined, words, i);
      if (name === 'ip') {
        for (; i < words.length; i++) ctx.parts.push({ text: words[i]!.raw, kind: 'subcommand', owner: 'ip', key: `explain.ipCmd`, params: { cmd: wordLiteral(words[i]!) }, description: `${wordLiteral(words[i]!)}: what to do with the object (show, add, del…)` });
        return;
      }
      for (; i < words.length; i++) {
        const t = wordLiteral(words[i]!);
        if (isOption(t)) i = explainOption(ctx, def, words, i) - 1;
        else ctx.parts.push({ text: words[i]!.raw, kind: 'arg', ...describeRole('unit', words[i]!.raw) });
      }
      return;
    }
  }

  if (name === 'find') return explainFind(ctx, def!, words, i);

  for (; i < words.length; i++) {
    const w = words[i]!;
    const t = wordLiteral(w);
    if (!endOfOptions && t === '--') {
      endOfOptions = true;
      ctx.parts.push({ text: w.raw, kind: 'flag', key: 'explain.endOfOptions', description: 'end of options: everything after this is a file name or argument' });
      continue;
    }
    // `grep -e PATTERN` / `sed -e SCRIPT` consume the first positional role
    if (!endOfOptions && isOption(t) && !def) {
      ctx.parts.push({ text: w.raw, kind: 'flag', key: 'explain.option', description: 'an option of the command' });
      continue;
    }
    if (!endOfOptions && isOption(t) && def) {
      const before = ctx.parts.length;
      i = explainOption(ctx, def, words, i) - 1;
      if ((name === 'grep' || name === 'sed') && (t === '-e' || t.startsWith('--regexp')) && ctx.parts.length > before + 1) positional = Math.max(positional, 1);
      continue;
    }
    pos.push(w);
    const roles = POSITIONAL[name ?? ''] ?? ['file'];
    let role = roles[Math.min(positional, roles.length - 1)]!;
    positional++;
    if (name === 'test' || name === '[') {
      ctx.parts.push(t === ']' ? { text: w.raw, kind: 'keyword', key: 'explain.testClose', description: 'closes the [ … ] test' } : { text: w.raw, kind: 'arg', ...describeRole('text', w.raw), key: 'explain.testOperand', params: { v: strip(w.raw) }, description: 'a value being compared or tested' });
      continue;
    }
    if (role === 'tokens') role = 'text';
    if (name === 'service' && positional === 2) {
      ctx.parts.push({ text: w.raw, kind: 'subcommand', key: 'explain.serviceAction', params: { action: t }, description: `what to do with the service: ${t}` });
      continue;
    }
    ctx.parts.push({ text: w.raw, kind: 'arg', ...describeRole(role, w.raw) });
  }
  // cp / mv: the last of several names is the destination
  if ((name === 'cp' || name === 'mv') && pos.length >= 2) {
    const lastW = pos[pos.length - 1]!;
    for (const p of ctx.parts) {
      if (p.kind !== 'arg' || !pos.some((w) => w.raw === p.text)) continue;
      const v = strip(p.text);
      if (p.text === lastW.raw) Object.assign(p, { key: name === 'mv' ? 'explain.arg.mvDest' : 'explain.arg.cpDest', params: { path: v }, description: `the destination: a directory to ${name} into, or the new name` });
      else Object.assign(p, { key: name === 'mv' ? 'explain.arg.mvSource' : 'explain.arg.cpSource', params: { path: v }, description: `what to ${name === 'mv' ? 'move' : 'copy'}: ${v}` });
    }
  }
}

function explainFind(ctx: Ctx, def: CommandDef, words: Word[], start: number): void {
  let i = start;
  while (i < words.length && !wordLiteral(words[i]!).startsWith('-') && !['(', '!', ')'].includes(wordLiteral(words[i]!))) {
    ctx.parts.push({ text: words[i]!.raw, kind: 'arg', ...describeRole('startPath', words[i]!.raw) });
    i++;
  }
  for (; i < words.length; i++) {
    const w = words[i]!;
    const t = wordLiteral(w);
    if (t === '!' || t === '-not') {
      ctx.parts.push({ text: w.raw, kind: 'operator', key: 'explain.find.not', description: 'NOT: invert the next test' });
      continue;
    }
    if (t === '-o' || t === '-or') {
      ctx.parts.push({ text: w.raw, kind: 'operator', key: 'explain.find.or', description: 'OR: either test may match' });
      continue;
    }
    if (t === '(' || t === ')') {
      ctx.parts.push({ text: w.raw, kind: 'operator', key: 'explain.find.group', description: 'grouping of tests' });
      continue;
    }
    if (t === '-exec' || t === '-ok' || t === '-execdir') {
      const opt = findOption(def, '-exec');
      ctx.parts.push({ text: w.raw, kind: 'flag', owner: 'find', ...(opt ? { spec: opt[0], description: opt[1] } : { description: 'run a command for each file' }) });
      const end = words.findIndex((x, k) => k > i && [';', '+'].includes(wordLiteral(x)));
      const inner = words.slice(i + 1, end < 0 ? undefined : end);
      if (inner.length) {
        const before = ctx.parts.length;
        explainWords(ctx, inner);
        for (const p of ctx.parts.slice(before)) if (p.text === '{}') Object.assign(p, { kind: 'arg', key: 'explain.find.placeholder', params: {}, description: '{} is replaced with the name of each found file' });
      }
      if (end >= 0) {
        const term = wordLiteral(words[end]!);
        ctx.parts.push({ text: words[end]!.raw, kind: 'operator', key: term === '+' ? 'explain.find.execPlus' : 'explain.find.execEnd', description: term === '+' ? 'end of -exec: pass many files to one command' : 'end of -exec: run the command once per file' });
        i = end;
      } else i = words.length;
      continue;
    }
    if (t.startsWith('-')) {
      i = explainOption(ctx, def, words, i) - 1;
      continue;
    }
    ctx.parts.push({ text: w.raw, kind: 'arg', ...describePath(w.raw) });
  }
}

const DOCKER_CONTAINER_SUBS = new Set(['stop', 'start', 'restart', 'rm', 'logs', 'inspect', 'kill', 'pause', 'unpause', 'stats']);

function explainDocker(ctx: Ctx, def: CommandDef, sub: string, sub2: string | undefined, words: Word[], start: number): void {
  let i = start;
  let seenImage = false;
  for (; i < words.length; i++) {
    const w = words[i]!;
    const t = wordLiteral(w);
    if (isOption(t) && !seenImage) {
      // -t / -f mean different things for different subcommands
      const special = sub === 'build' && (t === '-t' || t === '--tag') ? '-t, --tag NAME' : (sub === 'inspect' || sub === 'ps') && (t === '-f' || t === '--format') ? '--format, -f TEMPLATE' : null;
      if (special) {
        const opt = (def.doc.options ?? []).find(([f]) => f === special);
        ctx.parts.push({ text: w.raw, kind: 'flag', owner: 'docker', ...(opt ? { spec: opt[0], description: opt[1] } : { key: 'explain.option', description: 'option' }) });
        if (words[i + 1]) {
          ctx.parts.push({ text: words[i + 1]!.raw, kind: 'value', key: 'explain.optionValue', params: { option: t, value: strip(words[i + 1]!.raw) }, description: `value for ${t}` });
          i++;
        }
        continue;
      }
      i = explainOption(ctx, def, words, i) - 1;
      continue;
    }
    if (sub === 'run' || sub === 'create') {
      if (!seenImage) {
        seenImage = true;
        ctx.parts.push({ text: w.raw, kind: 'arg', ...describeRole('image', w.raw) });
        continue;
      }
      // the rest is the command to run inside the container
      const before = ctx.parts.length;
      explainWords(ctx, words.slice(i));
      for (const p of ctx.parts.slice(before)) if (p.kind === 'unknown') Object.assign(p, { key: 'explain.arg.inContainer', description: 'a program inside the container' });
      return;
    }
    if (sub === 'exec') {
      ctx.parts.push({ text: w.raw, kind: 'arg', ...describeRole('container', w.raw) });
      const before = ctx.parts.length;
      explainWords(ctx, words.slice(i + 1));
      for (const p of ctx.parts.slice(before)) if (p.kind === 'unknown') Object.assign(p, { key: 'explain.arg.inContainer', description: 'a program inside the container' });
      return;
    }
    if (sub === 'pull' || sub === 'rmi' || sub === 'push' || (sub === 'image' && sub2)) {
      ctx.parts.push({ text: w.raw, kind: 'arg', ...describeRole('image', w.raw) });
      continue;
    }
    if (sub === 'build') {
      ctx.parts.push({ text: w.raw, kind: 'arg', key: 'explain.arg.buildContext', params: { path: strip(w.raw) }, description: 'the build context: the directory with the Dockerfile and the files to copy' });
      continue;
    }
    if (sub === 'tag') {
      ctx.parts.push({ text: w.raw, kind: 'arg', ...describeRole('image', w.raw) });
      continue;
    }
    if (DOCKER_CONTAINER_SUBS.has(sub) || sub === 'container') {
      ctx.parts.push({ text: w.raw, kind: 'arg', ...describeRole('container', w.raw) });
      continue;
    }
    ctx.parts.push({ text: w.raw, kind: 'arg', ...describePath(w.raw) });
  }
}

function explainScript(ctx: Ctx, script: Script): void {
  script.items.forEach((item, idx) => {
    item.pipeline.forEach((cmd, k) => {
      explainCommand(ctx, cmd);
      if (k < item.pipeline.length - 1) {
        const [key, description] = OPERATORS['|']!;
        ctx.parts.push({ text: '|', kind: 'operator', key, description });
      }
    });
    if (item.next && !(item.next === ';' && idx === script.items.length - 1)) {
      const [key, description] = OPERATORS[item.next]!;
      ctx.parts.push({ text: item.next, kind: 'operator', key, description });
    }
  });
}

function explainCommand(ctx: Ctx, cmd: SimpleCommand): void {
  const c = cmd.compound;
  if (c) {
    switch (c.kind) {
      case 'for': {
        const list = c.list ? c.list.map((w) => w.raw).join(' ') : '"$@"';
        ctx.parts.push({ text: `for ${c.name} in ${list}`, kind: 'keyword', key: 'explain.kw.for', params: { name: c.name, list }, description: `loop: run the body once for every value of ${list}; the current value is in $${c.name}` });
        ctx.parts.push({ text: 'do', kind: 'keyword', key: 'explain.kw.do', description: 'the loop body starts here' });
        explainScript(ctx, c.body);
        ctx.parts.push({ text: 'done', kind: 'keyword', key: 'explain.kw.done', description: 'end of the loop' });
        break;
      }
      case 'while':
      case 'until':
        ctx.parts.push({ text: c.kind, kind: 'keyword', key: `explain.kw.${c.kind}`, description: c.kind === 'while' ? 'loop: repeat while the condition command succeeds' : 'loop: repeat until the condition command succeeds' });
        explainScript(ctx, c.cond);
        ctx.parts.push({ text: 'do', kind: 'keyword', key: 'explain.kw.do', description: 'the loop body starts here' });
        explainScript(ctx, c.body);
        ctx.parts.push({ text: 'done', kind: 'keyword', key: 'explain.kw.done', description: 'end of the loop' });
        break;
      case 'if':
        c.clauses.forEach((cl, k) => {
          ctx.parts.push({ text: k === 0 ? 'if' : 'elif', kind: 'keyword', key: k === 0 ? 'explain.kw.if' : 'explain.kw.elif', description: k === 0 ? 'condition: run the command; if it succeeds (exit code 0), run the "then" branch' : 'otherwise check another condition' });
          explainScript(ctx, cl.cond);
          ctx.parts.push({ text: 'then', kind: 'keyword', key: 'explain.kw.then', description: 'what to do when the condition is true' });
          explainScript(ctx, cl.body);
        });
        if (c.otherwise) {
          ctx.parts.push({ text: 'else', kind: 'keyword', key: 'explain.kw.else', description: 'what to do when no condition was true' });
          explainScript(ctx, c.otherwise);
        }
        ctx.parts.push({ text: 'fi', kind: 'keyword', key: 'explain.kw.fi', description: 'end of the if' });
        break;
      case 'group':
        ctx.parts.push({ text: '{', kind: 'keyword', key: 'explain.kw.group', description: 'a group of commands: their output can be redirected together' });
        explainScript(ctx, c.body);
        ctx.parts.push({ text: '}', kind: 'keyword', key: 'explain.kw.groupEnd', description: 'end of the group' });
        break;
    }
  } else {
    for (const a of cmd.assignments) {
      ctx.parts.push({ text: `${a.name}=${a.value.raw}`, kind: 'assignment', key: cmd.words.length ? 'explain.envAssign' : 'explain.assignment', params: { name: a.name, value: strip(a.value.raw) }, description: cmd.words.length ? `set ${a.name} for this command only` : `set the variable ${a.name}` });
    }
    explainWords(ctx, cmd.words);
  }
  for (const r of cmd.redirects) {
    const target = wordLiteral(r.target);
    const op = r.op === '>&' ? `${r.fd === 2 ? '2' : ''}>&${target}` : `${r.fd === 2 ? '2' : ''}${r.op}`;
    const known = REDIRECTS[op];
    ctx.parts.push({ text: op, kind: 'redirect', key: known?.[0] ?? 'explain.redirect', description: known?.[1] ?? 'redirection' });
    if (r.op !== '>&') {
      const d = describePath(r.target.raw);
      ctx.parts.push(target === '/dev/null' ? { text: r.target.raw, kind: 'arg', ...d } : { text: r.target.raw, kind: 'arg', key: r.op === '<' ? 'explain.redirSource' : 'explain.redirTarget', params: { file: strip(r.target.raw) }, description: r.op === '<' ? 'the file to read from' : 'the file used by the redirection' });
    }
  }
}

export function explain(line: string, registry: Registry): Explanation {
  const ctx: Ctx = { parts: [], registry };
  let script: Script;
  try {
    script = parse(line);
  } catch (e) {
    return { parts: [], error: e instanceof ParseError ? e.message : 'syntax error' };
  }
  explainScript(ctx, script);
  return { parts: ctx.parts };
}
