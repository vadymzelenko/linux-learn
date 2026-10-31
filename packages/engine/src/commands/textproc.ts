import type { CommandDef } from '../shell/context';
import { ArgError, parseArgs } from '../shell/args';
import { FsError } from '../vfs/fs';
import { breToJs, eachInput, ereToJs, lines, makeRegExp } from './util';

// ---------------------------------------------------------------- sed (subset)

type Address = { kind: 'line'; n: number } | { kind: 'last' } | { kind: 're'; re: RegExp };

interface SedCmd {
  a1?: Address;
  a2?: Address;
  negate: boolean;
  cmd: 's' | 'd' | 'p' | 'q' | 'a' | 'i' | 'c' | '=';
  re?: RegExp;
  repl?: string;
  global?: boolean;
  nth?: number;
  print?: boolean;
  text?: string;
  /** range state */
  active?: boolean;
}

class SedError extends Error {}

function parseSed(script: string, ere: boolean): SedCmd[] {
  const cmds: SedCmd[] = [];
  let i = 0;
  const toRe = (src: string, flags: string) => {
    const r = makeRegExp(ere ? ereToJs(src) : breToJs(src), flags);
    if (typeof r === 'string') throw new SedError(`-e expression #1, char ${i}: Invalid regular expression`);
    return r;
  };
  const readDelim = (delim: string): string => {
    let out = '';
    while (i < script.length && script[i] !== delim) {
      if (script[i] === '\\' && i + 1 < script.length) {
        if (script[i + 1] === delim) out += delim;
        else if (script[i + 1] === 'n') out += '\n';
        else out += script[i]! + script[i + 1]!;
        i += 2;
        continue;
      }
      out += script[i++];
    }
    if (script[i] !== delim) throw new SedError(`-e expression #1, char ${i}: unterminated \`s' command`);
    i++;
    return out;
  };
  const readAddr = (): Address | undefined => {
    if (/\d/.test(script[i] ?? '')) {
      let n = '';
      while (/\d/.test(script[i] ?? '')) n += script[i++];
      return { kind: 'line', n: Number(n) };
    }
    if (script[i] === '$') {
      i++;
      return { kind: 'last' };
    }
    if (script[i] === '/') {
      i++;
      const src = readDelim('/');
      let flags = '';
      if (script[i] === 'I') {
        flags = 'i';
        i++;
      }
      return { kind: 're', re: toRe(src, flags) };
    }
    return undefined;
  };
  while (i < script.length) {
    while (i < script.length && /[\s;]/.test(script[i]!)) i++;
    if (i >= script.length) break;
    const c: SedCmd = { negate: false, cmd: 'p' };
    const a1 = readAddr();
    if (a1) c.a1 = a1;
    if (a1 && script[i] === ',') {
      i++;
      const a2 = readAddr();
      if (!a2) throw new SedError(`-e expression #1, char ${i}: unexpected \`,'`);
      c.a2 = a2;
    }
    while (script[i] === ' ') i++;
    if (script[i] === '!') {
      c.negate = true;
      i++;
    }
    const op = script[i++];
    switch (op) {
      case 's': {
        const delim = script[i++];
        if (!delim) throw new SedError(`-e expression #1, char ${i}: unterminated \`s' command`);
        const pat = readDelim(delim);
        const repl = readDelim(delim);
        let flags = '';
        let global = false;
        let nth = 1;
        let print = false;
        while (i < script.length && /[gpiI0-9]/.test(script[i]!)) {
          const fch = script[i++]!;
          if (fch === 'g') global = true;
          else if (fch === 'p') print = true;
          else if (fch === 'i' || fch === 'I') flags += 'i';
          else nth = Number(fch);
        }
        Object.assign(c, { cmd: 's', re: toRe(pat, flags + 'g'), repl, global, nth, print });
        break;
      }
      case 'd':
      case 'p':
      case 'q':
      case '=':
        c.cmd = op;
        break;
      case 'a':
      case 'i':
      case 'c': {
        c.cmd = op;
        if (script[i] === '\\') i++;
        while (script[i] === ' ') i++;
        let text = '';
        while (i < script.length && script[i] !== '\n' && script[i] !== ';') text += script[i++];
        c.text = text;
        break;
      }
      default:
        throw new SedError(`-e expression #1, char ${i}: unknown command: \`${op ?? ''}'`);
    }
    cmds.push(c);
  }
  return cmds;
}

function sedReplace(line: string, c: SedCmd): { out: string; did: boolean } {
  let count = 0;
  let did = false;
  const out = line.replace(c.re!, (...m: unknown[]) => {
    const match = m[0] as string;
    count++;
    if (!c.global && count !== c.nth) return match;
    if (c.global && count < (c.nth ?? 1)) return match;
    did = true;
    const groups = m.slice(1, -2) as (string | undefined)[];
    let r = '';
    const repl = c.repl!;
    for (let k = 0; k < repl.length; k++) {
      const ch = repl[k]!;
      if (ch === '\\' && k + 1 < repl.length) {
        const n = repl[++k]!;
        if (/\d/.test(n)) r += groups[Number(n) - 1] ?? '';
        else if (n === 'n') r += '\n';
        else if (n === 't') r += '\t';
        else r += n;
      } else if (ch === '&') r += match;
      else r += ch;
    }
    return r;
  });
  return { out, did };
}

export const sed: CommandDef = {
  name: 'sed',
  category: 'text',
  doc: {
    summary: 'stream editor for filtering and transforming text',
    usage: ['sed [OPTION]... {script} [input-file]...'],
    description:
      "Sed reads input line by line, applies the script and prints the result. Supported commands: s/regex/replacement/[gpIN], d, p, q, =, a/i/c text, with addresses N, $, /regex/ and ranges A,B. Most common: sed 's/old/new/g' file.",
    options: [
      ['-n, --quiet', 'suppress automatic printing of pattern space'],
      ['-e script', 'add the script to the commands to be executed'],
      ['-i, --in-place', 'edit files in place'],
      ['-E, -r, --regexp-extended', 'use extended regular expressions in the script'],
    ],
    examples: [
      ["sed 's/http/https/g' links.txt", 'replace every http with https'],
      ["sed -i 's/DEBUG=true/DEBUG=false/' .env", 'edit a file in place'],
      ["sed -n '5,10p' file.txt", 'print lines 5 to 10'],
      ["sed '/^#/d' config", 'delete comment lines'],
    ],
    seeAlso: ['awk', 'tr', 'grep'],
  },
  run(ctx) {
    const a = parseArgs(ctx.args, {
      flags: 'nEris',
      withValue: 'e',
      long: { quiet: 'n', silent: 'n', 'in-place': 'i', 'regexp-extended': 'E', separate: 's' },
      longWithValue: { expression: 'e' },
    });
    const operands = [...a.operands];
    const scripts: string[] = [];
    for (let k = 0; k < ctx.args.length; k++) {
      if (ctx.args[k] === '-e' && ctx.args[k + 1] !== undefined) scripts.push(ctx.args[++k]!);
    }
    if (scripts.length === 0) {
      const s = operands.shift();
      if (s === undefined) {
        ctx.err('Usage: sed [OPTION]... {script-only-if-no-other-script} [input-file]...\n');
        return 1;
      }
      scripts.push(s);
    }
    let cmds: SedCmd[];
    try {
      cmds = parseSed(scripts.join('\n'), a.flags.has('E') || a.flags.has('r'));
    } catch (e) {
      if (e instanceof SedError) {
        ctx.fail(e.message);
        return 1;
      }
      throw e;
    }
    const quiet = a.flags.has('n');
    const inPlace = a.flags.has('i');
    if (inPlace && operands.length === 0) {
      ctx.fail('no input files');
      return 1;
    }

    const matches = (addr: Address, line: string, n: number, last: boolean) =>
      addr.kind === 'line' ? n === addr.n : addr.kind === 'last' ? last : (addr.re.lastIndex = 0, addr.re.test(line));

    const process = (text: string): { out: string; quit: boolean } => {
      const ls = lines(text);
      let out = '';
      for (const c of cmds) c.active = false;
      let quit = false;
      for (let idx = 0; idx < ls.length && !quit; idx++) {
        let line = ls[idx]!;
        const n = idx + 1;
        const last = idx === ls.length - 1;
        let deleted = false;
        let append = '';
        for (const c of cmds) {
          let sel: boolean;
          if (!c.a1) sel = true;
          else if (!c.a2) sel = matches(c.a1, line, n, last);
          else if (c.active) {
            sel = true;
            if (c.a2.kind === 'line' ? n >= c.a2.n : matches(c.a2, line, n, last)) c.active = false;
          } else if (matches(c.a1, line, n, last)) {
            sel = true;
            c.active = !(c.a2.kind === 'line' && c.a2.n <= n);
          } else sel = false;
          if (c.negate) sel = !sel;
          if (!sel) continue;
          if (c.cmd === 's') {
            const r = sedReplace(line, c);
            line = r.out;
            if (r.did && c.print) out += line + '\n';
          } else if (c.cmd === 'd') {
            deleted = true;
            break;
          } else if (c.cmd === 'p') out += line + '\n';
          else if (c.cmd === '=') out += n + '\n';
          else if (c.cmd === 'a') append += c.text + '\n';
          else if (c.cmd === 'i') out += c.text + '\n';
          else if (c.cmd === 'c') {
            out += c.text + '\n';
            deleted = true;
            break;
          } else if (c.cmd === 'q') {
            quit = true;
            break;
          }
        }
        if (!deleted && !quiet) out += line + '\n';
        out += append;
      }
      return { out, quit };
    };

    if (inPlace) {
      let code = 0;
      for (const f of operands) {
        try {
          const text = ctx.readFile(f);
          ctx.writeFile(f, process(text).out);
        } catch (e) {
          if (e instanceof FsError) {
            ctx.fail(`can't read ${f}: ${e.text}`);
            code = 2;
          } else throw e;
        }
      }
      return code;
    }
    let all = '';
    const ok = eachInput(ctx, operands, (t) => (all += t.endsWith('\n') || t === '' ? t : t + '\n'));
    ctx.out(process(all).out);
    return ok ? 0 : 2;
  },
};

// ---------------------------------------------------------------- awk (subset)

type Tok = { t: 'num'; v: number } | { t: 'str'; v: string } | { t: 're'; v: string } | { t: 'id'; v: string } | { t: 'op'; v: string };

class AwkError extends Error {}

function lexAwk(src: string): Tok[] {
  const toks: Tok[] = [];
  let i = 0;
  const prevAllowsRegex = () => {
    const p = toks[toks.length - 1];
    return !p || (p.t === 'op' && !['$', ')'].includes(p.v)) ;
  };
  while (i < src.length) {
    const c = src[i]!;
    if (c === ' ' || c === '\t') {
      i++;
      continue;
    }
    if (c === '\n' || c === ';') {
      toks.push({ t: 'op', v: ';' });
      i++;
      continue;
    }
    if (c === '#') {
      while (i < src.length && src[i] !== '\n') i++;
      continue;
    }
    if (/\d/.test(c) || (c === '.' && /\d/.test(src[i + 1] ?? ''))) {
      const m = /^\d*\.?\d+(?:[eE][+-]?\d+)?/.exec(src.slice(i))!;
      toks.push({ t: 'num', v: Number(m[0]) });
      i += m[0].length;
      continue;
    }
    if (c === '"') {
      let s = '';
      i++;
      while (i < src.length && src[i] !== '"') {
        if (src[i] === '\\') {
          const n = src[i + 1];
          s += n === 'n' ? '\n' : n === 't' ? '\t' : (n ?? '');
          i += 2;
        } else s += src[i++];
      }
      if (src[i] !== '"') throw new AwkError('non-terminated string');
      i++;
      toks.push({ t: 'str', v: s });
      continue;
    }
    if (c === '/' && prevAllowsRegex()) {
      let s = '';
      i++;
      while (i < src.length && src[i] !== '/') {
        if (src[i] === '\\' && src[i + 1] === '/') {
          s += '/';
          i += 2;
        } else s += src[i++];
      }
      if (src[i] !== '/') throw new AwkError('non-terminated regular expression');
      i++;
      toks.push({ t: 're', v: s });
      continue;
    }
    if (/[A-Za-z_]/.test(c)) {
      const m = /^[A-Za-z_][A-Za-z0-9_]*/.exec(src.slice(i))!;
      toks.push({ t: 'id', v: m[0] });
      i += m[0].length;
      continue;
    }
    const three = src.slice(i, i + 3);
    const two = src.slice(i, i + 2);
    if (['**='].includes(three)) {
      toks.push({ t: 'op', v: three });
      i += 3;
      continue;
    }
    if (['==', '!=', '<=', '>=', '&&', '||', '+=', '-=', '*=', '/=', '%=', '++', '--', '!~', '**', '>>'].includes(two)) {
      toks.push({ t: 'op', v: two });
      i += 2;
      continue;
    }
    if ('{}()$+-*/%<>=!~,?:^'.includes(c)) {
      toks.push({ t: 'op', v: c });
      i++;
      continue;
    }
    throw new AwkError(`syntax error at source line 1: unexpected character '${c}'`);
  }
  return toks;
}

type Node =
  | { k: 'num'; v: number }
  | { k: 'str'; v: string }
  | { k: 're'; v: RegExp }
  | { k: 'var'; name: string }
  | { k: 'field'; e: Node }
  | { k: 'bin'; op: string; l: Node; r: Node }
  | { k: 'un'; op: string; e: Node }
  | { k: 'assign'; op: string; target: Node; e: Node }
  | { k: 'incdec'; op: string; prefix: boolean; target: Node }
  | { k: 'match'; neg: boolean; l: Node; r: Node }
  | { k: 'cond'; c: Node; a: Node; b: Node }
  | { k: 'call'; name: string; args: Node[] }
  | { k: 'concat'; parts: Node[] };

type Stmt =
  | { k: 'print'; args: Node[]; redirect?: { op: string; target: Node } }
  | { k: 'printf'; args: Node[] }
  | { k: 'expr'; e: Node }
  | { k: 'block'; body: Stmt[] }
  | { k: 'if'; c: Node; then: Stmt; else?: Stmt }
  | { k: 'next' };

interface Rule {
  pattern: 'BEGIN' | 'END' | Node | null;
  body: Stmt[] | null;
}

function parseAwk(toks: Tok[]): Rule[] {
  let p = 0;
  const peek = () => toks[p];
  const isOp = (v: string) => {
    const t = toks[p];
    return !!t && t.t === 'op' && t.v === v;
  };
  const expectOp = (v: string) => {
    if (!isOp(v)) throw new AwkError(`syntax error: expected '${v}'`);
    p++;
  };
  const skipSemis = () => {
    while (isOp(';')) p++;
  };

  const primary = (): Node => {
    const t = peek();
    if (!t) throw new AwkError('syntax error: unexpected end of program');
    if (t.t === 'num') {
      p++;
      return { k: 'num', v: t.v };
    }
    if (t.t === 'str') {
      p++;
      return { k: 'str', v: t.v };
    }
    if (t.t === 're') {
      p++;
      const r = makeRegExp(ereToJs(t.v), '');
      if (typeof r === 'string') throw new AwkError('invalid regular expression');
      return { k: 're', v: r };
    }
    if (t.t === 'op' && t.v === '$') {
      p++;
      return { k: 'field', e: primary() };
    }
    if (t.t === 'op' && t.v === '(') {
      p++;
      const saved = noGt;
      noGt = false;
      const e = expr();
      noGt = saved;
      expectOp(')');
      return e;
    }
    if (t.t === 'op' && (t.v === '-' || t.v === '!' || t.v === '+')) {
      p++;
      return { k: 'un', op: t.v, e: primary() };
    }
    if (t.t === 'op' && (t.v === '++' || t.v === '--')) {
      p++;
      return { k: 'incdec', op: t.v, prefix: true, target: primary() };
    }
    if (t.t === 'id') {
      p++;
      if (['length', 'toupper', 'tolower', 'substr', 'index', 'int', 'sprintf'].includes(t.v)) {
        const args: Node[] = [];
        if (isOp('(')) {
          p++;
          if (!isOp(')')) {
            args.push(expr());
            while (isOp(',')) {
              p++;
              args.push(expr());
            }
          }
          expectOp(')');
        }
        return { k: 'call', name: t.v, args };
      }
      const v: Node = { k: 'var', name: t.v };
      if (isOp('++') || isOp('--')) {
        const op = (peek() as { v: string }).v;
        p++;
        return { k: 'incdec', op, prefix: false, target: v };
      }
      return v;
    }
    throw new AwkError(`syntax error at '${t.v}'`);
  };
  const postfix = (): Node => {
    const e = primary();
    if (e.k === 'field' && (isOp('++') || isOp('--'))) {
      const op = (peek() as { v: string }).v;
      p++;
      return { k: 'incdec', op, prefix: false, target: e };
    }
    return e;
  };
  const binLevel = (ops: string[], next: () => Node) => (): Node => {
    let l = next();
    while (peek()?.t === 'op' && ops.includes((peek() as { v: string }).v)) {
      const op = (peek() as { v: string }).v;
      p++;
      l = { k: 'bin', op, l, r: next() };
    }
    return l;
  };
  const pow = binLevel(['^', '**'], postfix);
  const mul = binLevel(['*', '/', '%'], pow);
  const add = binLevel(['+', '-'], mul);
  const startsPrimary = () => {
    const t = peek();
    if (!t) return false;
    if (t.t === 'num' || t.t === 'str' || t.t === 'id') return !(t.t === 'id' && ['in', 'getline'].includes(t.v));
    return t.t === 'op' && (t.v === '$' || t.v === '(' || t.v === '!' || t.v === '-' || t.v === '++' || t.v === '--');
  };
  const concat = (): Node => {
    const parts = [add()];
    while (startsPrimary() && !isOp('-') && !isOp('!')) parts.push(add());
    return parts.length === 1 ? parts[0]! : { k: 'concat', parts };
  };
  let noGt = false;
  const comparison = (): Node => {
    const l = concat();
    const t = peek();
    if (t?.t === 'op' && ['<', '<=', '==', '!=', '>=', ...(noGt ? [] : ['>'])].includes(t.v)) {
      p++;
      return { k: 'bin', op: t.v, l, r: concat() };
    }
    return l;
  };
  const matchLevel = (): Node => {
    let l = comparison();
    while (isOp('~') || isOp('!~')) {
      const neg = isOp('!~');
      p++;
      l = { k: 'match', neg, l, r: comparison() };
    }
    return l;
  };
  const and = binLevel(['&&'], matchLevel);
  const or = binLevel(['||'], and);
  const ternary = (): Node => {
    const c = or();
    if (isOp('?')) {
      p++;
      const a = ternary();
      expectOp(':');
      return { k: 'cond', c, a, b: ternary() };
    }
    return c;
  };
  const expr = (): Node => {
    const start = p;
    const lhs = ternary();
    const t = peek();
    if (t?.t === 'op' && ['=', '+=', '-=', '*=', '/=', '%=', '^='].includes(t.v)) {
      if (lhs.k !== 'var' && lhs.k !== 'field') {
        p = start;
        throw new AwkError('syntax error: invalid assignment');
      }
      p++;
      return { k: 'assign', op: t.v, target: lhs, e: expr() };
    }
    return lhs;
  };

  const stmt = (): Stmt => {
    skipSemis();
    const t = peek();
    if (t?.t === 'op' && t.v === '{') {
      p++;
      const body: Stmt[] = [];
      skipSemis();
      while (!isOp('}')) {
        body.push(stmt());
        skipSemis();
      }
      p++;
      return { k: 'block', body };
    }
    if (t?.t === 'id' && (t.v === 'print' || t.v === 'printf')) {
      p++;
      const args: Node[] = [];
      noGt = true;
      const paren = isOp('(');
      if (!isOp(';') && !isOp('}') && peek()) {
        args.push(expr());
        while (isOp(',')) {
          p++;
          args.push(expr());
        }
      }
      noGt = false;
      void paren;
      let redirect: { op: string; target: Node } | undefined;
      if (isOp('>') || isOp('>>')) {
        const op = (peek() as { v: string }).v;
        p++;
        redirect = { op, target: concat() };
      }
      if (t.v === 'printf') return { k: 'printf', args };
      return redirect ? { k: 'print', args, redirect } : { k: 'print', args };
    }
    if (t?.t === 'id' && t.v === 'next') {
      p++;
      return { k: 'next' };
    }
    if (t?.t === 'id' && t.v === 'if') {
      p++;
      expectOp('(');
      const c = expr();
      expectOp(')');
      const then = stmt();
      skipSemis();
      if (peek()?.t === 'id' && (peek() as { v: string }).v === 'else') {
        p++;
        return { k: 'if', c, then, else: stmt() };
      }
      return { k: 'if', c, then };
    }
    return { k: 'expr', e: expr() };
  };

  const rules: Rule[] = [];
  skipSemis();
  while (p < toks.length) {
    let pattern: Rule['pattern'] = null;
    const t = peek()!;
    if (t.t === 'id' && (t.v === 'BEGIN' || t.v === 'END')) {
      p++;
      pattern = t.v;
    } else if (!(t.t === 'op' && t.v === '{')) {
      pattern = expr();
    }
    let body: Stmt[] | null = null;
    if (isOp('{')) {
      const b = stmt();
      body = b.k === 'block' ? b.body : [b];
    }
    rules.push({ pattern, body });
    skipSemis();
  }
  return rules;
}

class NextSignal {}

export const awk: CommandDef = {
  name: 'awk',
  category: 'text',
  doc: {
    summary: 'pattern scanning and text processing language',
    usage: ["awk [-F fs] [-v var=value] 'program' [file ...]"],
    description:
      "Awk splits every input line into fields $1, $2, ... ($0 is the whole line, NF the number of fields, NR the line number) and runs `pattern { action }` rules. The trainer supports a practical subset: print, printf, variables, arithmetic, comparisons, regex patterns, if/else, BEGIN/END and length/toupper/tolower/substr/index/int.",
    options: [
      ['-F fs', 'use fs as the input field separator'],
      ['-v var=value', 'assign a variable before the program starts'],
    ],
    examples: [
      ["awk '{print $1}' access.log", 'first column of every line'],
      ["awk -F: '{print $1, $7}' /etc/passwd", 'user names and their shells'],
      ["awk '$3 > 100' data.txt", 'lines where the 3rd field is greater than 100'],
      ["awk '{sum += $2} END {print sum}' sales.txt", 'sum a column'],
    ],
    seeAlso: ['cut', 'sed', 'grep'],
  },
  run(ctx) {
    const a = parseArgs(ctx.args, { withValue: 'Fvf', stopAtOperand: true });
    const operands = [...a.operands];
    const program = operands.shift();
    if (program === undefined) {
      ctx.err("usage: awk [-F fs][-v var=value][prog | -f progfile][file ...]\n");
      return 2;
    }
    let rules: Rule[];
    try {
      rules = parseAwk(lexAwk(program));
    } catch (e) {
      if (e instanceof AwkError) {
        ctx.err(`awk: ${e.message}\n awk: source line number 1\n`);
        return 2;
      }
      throw e;
    }
    const vars = new Map<string, string | number>();
    let fsOpt = a.values.get('F');
    if (fsOpt === '\\t' || fsOpt === 't') fsOpt = '\t';
    vars.set('FS', fsOpt ?? ' ');
    vars.set('OFS', ' ');
    vars.set('ORS', '\n');
    for (let k = 0; k < ctx.args.length; k++) {
      if (ctx.args[k] === '-v' && ctx.args[k + 1]) {
        const [n, ...v] = ctx.args[k + 1]!.split('=');
        vars.set(n!, v.join('='));
      }
    }
    let fields: string[] = [''];
    let out = '';
    const files = new Map<string, string>();
    let steps = 0;

    const toNum = (v: string | number): number => (typeof v === 'number' ? v : Number(/^\s*[+-]?(\d+\.?\d*|\.\d+)([eE][+-]?\d+)?/.exec(v)?.[0] ?? 0));
    const toStr = (v: string | number): string =>
      typeof v === 'number' ? (Number.isInteger(v) ? String(v) : String(Number(v.toPrecision(6)))) : v;
    const looksNumeric = (v: string | number) => typeof v === 'number' || /^\s*[+-]?(\d+\.?\d*|\.\d+)([eE][+-]?\d+)?\s*$/.test(v);

    const splitLine = (line: string) => {
      const fs = toStr(vars.get('FS') ?? ' ');
      let parts: string[];
      if (fs === ' ') parts = line.split(/[ \t\n]+/).filter((x, i, arr) => !(x === '' && (i === 0 || i === arr.length - 1)));
      else if (fs.length === 1) parts = line.split(fs);
      else parts = line.split(new RegExp(fs));
      if (line === '') parts = [];
      fields = [line, ...parts];
      vars.set('NF', parts.length);
    };
    const rebuild = () => {
      fields[0] = fields.slice(1).join(toStr(vars.get('OFS') ?? ' '));
    };

    const getField = (i: number): string => fields[i] ?? '';
    const setField = (i: number, v: string) => {
      if (i === 0) {
        splitLine(v);
        return;
      }
      while (fields.length <= i) fields.push('');
      fields[i] = v;
      vars.set('NF', fields.length - 1);
      rebuild();
    };

    const assignTo = (target: Node, v: string | number) => {
      if (target.k === 'var') {
        vars.set(target.name, v);
        if (target.name === 'NF') {
          fields = fields.slice(0, toNum(v) + 1);
          rebuild();
        }
      } else if (target.k === 'field') setField(toNum(evaluate(target.e)), toStr(v));
    };

    const evaluate = (n: Node): string | number => {
      if (++steps > 200_000) throw new AwkError('program is too slow (step limit)');
      switch (n.k) {
        case 'num': return n.v;
        case 'str': return n.v;
        case 're': return n.v.test(getField(0)) ? 1 : 0;
        case 'var': return vars.get(n.name) ?? '';
        case 'field': return getField(toNum(evaluate(n.e)));
        case 'un': {
          const v = evaluate(n.e);
          if (n.op === '!') return truthy(v) ? 0 : 1;
          return n.op === '-' ? -toNum(v) : toNum(v);
        }
        case 'bin': {
          if (n.op === '&&') return truthy(evaluate(n.l)) && truthy(evaluate(n.r)) ? 1 : 0;
          if (n.op === '||') return truthy(evaluate(n.l)) || truthy(evaluate(n.r)) ? 1 : 0;
          const l = evaluate(n.l);
          const r = evaluate(n.r);
          switch (n.op) {
            case '+': return toNum(l) + toNum(r);
            case '-': return toNum(l) - toNum(r);
            case '*': return toNum(l) * toNum(r);
            case '/':
              if (toNum(r) === 0) throw new AwkError('division by zero');
              return toNum(l) / toNum(r);
            case '%': return toNum(l) % toNum(r);
            case '^': case '**': return toNum(l) ** toNum(r);
            default: {
              const numeric = looksNumeric(l) && looksNumeric(r);
              const c = numeric ? toNum(l) - toNum(r) : toStr(l) < toStr(r) ? -1 : toStr(l) > toStr(r) ? 1 : 0;
              const res = { '<': c < 0, '<=': c <= 0, '>': c > 0, '>=': c >= 0, '==': c === 0, '!=': c !== 0 }[n.op];
              return res ? 1 : 0;
            }
          }
        }
        case 'match': {
          const s = toStr(evaluate(n.l));
          const re = n.r.k === 're' ? n.r.v : new RegExp(ereToJs(toStr(evaluate(n.r))));
          return re.test(s) !== n.neg ? 1 : 0;
        }
        case 'cond': return truthy(evaluate(n.c)) ? evaluate(n.a) : evaluate(n.b);
        case 'concat': return n.parts.map((x) => toStr(evaluate(x))).join('');
        case 'assign': {
          const v = evaluate(n.e);
          let res: string | number = v;
          if (n.op !== '=') {
            const cur = toNum(evaluate(n.target));
            const r = toNum(v);
            res = n.op === '+=' ? cur + r : n.op === '-=' ? cur - r : n.op === '*=' ? cur * r : n.op === '/=' ? cur / r : n.op === '%=' ? cur % r : cur ** r;
          }
          assignTo(n.target, res);
          return res;
        }
        case 'incdec': {
          const cur = toNum(evaluate(n.target));
          const next = n.op === '++' ? cur + 1 : cur - 1;
          assignTo(n.target, next);
          return n.prefix ? next : cur;
        }
        case 'call': {
          const args = n.args.map(evaluate);
          switch (n.name) {
            case 'length': return (args.length ? toStr(args[0]!) : getField(0)).length;
            case 'toupper': return toStr(args[0] ?? '').toUpperCase();
            case 'tolower': return toStr(args[0] ?? '').toLowerCase();
            case 'int': return Math.trunc(toNum(args[0] ?? 0));
            case 'index': return toStr(args[0] ?? '').indexOf(toStr(args[1] ?? '')) + 1;
            case 'substr': {
              const s = toStr(args[0] ?? '');
              const start = Math.max(1, Math.round(toNum(args[1] ?? 1)));
              const len = args[2] !== undefined ? Math.round(toNum(args[2])) : Infinity;
              return s.substr(start - 1, len === Infinity ? undefined : len);
            }
            case 'sprintf': return formatPrintf(args.map(toStr));
          }
          return '';
        }
      }
    };
    const truthy = (v: string | number) => (typeof v === 'number' ? v !== 0 : v !== '' && (!looksNumeric(v) || toNum(v) !== 0));

    const formatPrintf = (args: string[]): string => {
      const [fmt = '', ...rest] = args;
      let k = 0;
      return fmt.replace(/%([-0]?)(\d*)(?:\.(\d+))?([sdifc%])/g, (_m, fl: string, w: string, prec: string | undefined, conv: string) => {
        if (conv === '%') return '%';
        const v = rest[k++] ?? '';
        let s = conv === 'd' || conv === 'i' ? String(Math.trunc(toNum(v))) : conv === 'f' ? toNum(v).toFixed(prec ? Number(prec) : 6) : conv === 'c' ? v.slice(0, 1) : prec ? v.slice(0, Number(prec)) : v;
        const width = Number(w || 0);
        if (s.length < width) s = fl === '-' ? s.padEnd(width) : fl === '0' ? s.padStart(width, '0') : s.padStart(width);
        return s;
      });
    };

    const emit = (text: string, redirect?: { op: string; target: Node }) => {
      if (!redirect) {
        out += text;
        return;
      }
      const name = toStr(evaluate(redirect.target));
      const prev = files.get(name);
      if (prev === undefined && redirect.op === '>') files.set(name, text);
      else if (prev === undefined) {
        let existing = '';
        try {
          existing = ctx.readFile(name);
        } catch {
          /* new file */
        }
        files.set(name, existing + text);
      } else files.set(name, prev + text);
    };

    const exec = (s: Stmt) => {
      switch (s.k) {
        case 'print': {
          const text = s.args.length === 0 ? getField(0) : s.args.map((x) => toStr(evaluate(x))).join(toStr(vars.get('OFS') ?? ' '));
          emit(text + toStr(vars.get('ORS') ?? '\n'), s.redirect);
          break;
        }
        case 'printf':
          emit(formatPrintf(s.args.map((x) => toStr(evaluate(x)))));
          break;
        case 'expr': evaluate(s.e); break;
        case 'block': s.body.forEach(exec); break;
        case 'if':
          if (truthy(evaluate(s.c))) exec(s.then);
          else if (s.else) exec(s.else);
          break;
        case 'next': throw new NextSignal();
      }
    };

    try {
      for (const r of rules) if (r.pattern === 'BEGIN') r.body?.forEach(exec);
      let nr = 0;
      let input = '';
      const ok = eachInput(ctx, operands.filter((o) => !/^[A-Za-z_]\w*=/.test(o)), (t) => (input += t.endsWith('\n') || t === '' ? t : t + '\n'));
      if (!ok) return 2;
      const hasMain = rules.some((r) => r.pattern !== 'BEGIN' && r.pattern !== 'END');
      const hasEnd = rules.some((r) => r.pattern === 'END');
      if (hasMain || hasEnd) {
        for (const line of lines(input)) {
          nr++;
          vars.set('NR', nr);
          vars.set('FNR', nr);
          splitLine(line);
          try {
            for (const r of rules) {
              if (r.pattern === 'BEGIN' || r.pattern === 'END') continue;
              if (r.pattern && !truthy(evaluate(r.pattern))) continue;
              if (r.body) r.body.forEach(exec);
              else out += getField(0) + '\n';
            }
          } catch (e) {
            if (!(e instanceof NextSignal)) throw e;
          }
        }
      }
      for (const r of rules) if (r.pattern === 'END') r.body?.forEach(exec);
    } catch (e) {
      if (e instanceof AwkError) {
        ctx.out(out);
        ctx.err(`awk: ${e.message}\n`);
        return 2;
      }
      throw e;
    }
    ctx.out(out);
    for (const [name, text] of files) {
      try {
        ctx.writeFile(name, text);
      } catch (e) {
        if (e instanceof FsError) ctx.err(`awk: can't redirect to ${name}\n`);
        else throw e;
      }
    }
    return 0;
  },
};

export { ArgError };
