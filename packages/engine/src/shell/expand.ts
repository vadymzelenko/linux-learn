import type { Word } from './parser';
import { escapeGlob, expandGlob, hasGlobChars, unescapeGlob, type GlobFs } from './glob';

export interface ExpandEnv {
  getVar(name: string): string | undefined;
  home: string;
  cwd: string;
  /** Run a command substitution and return its stdout. */
  runSub(src: string): string;
  fs: GlobFs;
}

interface Field {
  pattern: string; // glob-escaped text
  hasQuoted: boolean;
}

/**
 * Expand a word into zero or more fields:
 * tilde → parameters / command substitution → field splitting → globbing → quote removal.
 */
export function expandWord(word: Word, env: ExpandEnv, opts: { glob?: boolean; split?: boolean } = {}): string[] {
  if (opts.glob !== false) {
    const words = braceExpand(word);
    if (words.length > 1 || words[0] !== word) return words.flatMap((w) => expandOne(w, env, opts));
  }
  return expandOne(word, env, opts);
}

const MAX_BRACE = 10_000;

function rangeItems(body: string): string[] | null {
  let m = /^(-?\d+)\.\.(-?\d+)(?:\.\.(-?\d+))?$/.exec(body);
  if (m) {
    const a = Number(m[1]);
    const b = Number(m[2]);
    const step = Math.abs(Number(m[3] ?? 1)) || 1;
    if (Math.abs(b - a) / step > MAX_BRACE) return null;
    const width = /^-?0\d/.test(m[1]!) || /^-?0\d/.test(m[2]!) ? Math.max(m[1]!.length, m[2]!.length) : 0;
    const out: string[] = [];
    for (let i = a; a <= b ? i <= b : i >= b; i += a <= b ? step : -step) out.push(width ? String(Math.abs(i)).padStart(width - (i < 0 ? 1 : 0), '0').replace(/^/, i < 0 ? '-' : '') : String(i));
    return out;
  }
  m = /^([a-zA-Z])\.\.([a-zA-Z])$/.exec(body);
  if (m) {
    const a = m[1]!.charCodeAt(0);
    const b = m[2]!.charCodeAt(0);
    const out: string[] = [];
    for (let i = a; a <= b ? i <= b : i >= b; i += a <= b ? 1 : -1) out.push(String.fromCharCode(i));
    return out;
  }
  return null;
}

/** Find the first expandable {…} in s: returns [start, end, alternatives]. */
function findBrace(s: string): [number, number, string[]] | null {
  for (let i = 0; i < s.length; i++) {
    if (s[i] !== '{') continue;
    let depth = 0;
    const commas: number[] = [];
    for (let j = i; j < s.length; j++) {
      if (s[j] === '{') depth++;
      else if (s[j] === '}') {
        depth--;
        if (depth === 0) {
          const body = s.slice(i + 1, j);
          if (commas.length) {
            const alts: string[] = [];
            let prev = i + 1;
            for (const c of commas) {
              alts.push(s.slice(prev, c));
              prev = c + 1;
            }
            alts.push(s.slice(prev, j));
            return [i, j, alts];
          }
          const r = rangeItems(body);
          if (r) return [i, j, r];
          break;
        }
      } else if (s[j] === ',' && depth === 1) commas.push(j);
    }
  }
  return null;
}

/** Bash brace expansion on unquoted literal text: a{b,c}d → abd acd, {1..3} → 1 2 3. */
export function braceExpand(word: Word, budget = { n: 0 }): Word[] {
  for (let k = 0; k < word.parts.length; k++) {
    const part = word.parts[k]!;
    if (part.t !== 'lit' || part.q !== 0) continue;
    const hit = findBrace(part.v);
    if (!hit) continue;
    const [start, end, alts] = hit;
    const out: Word[] = [];
    for (const alt of alts) {
      if (++budget.n > MAX_BRACE) return [word];
      const v = part.v.slice(0, start) + alt + part.v.slice(end + 1);
      const parts = [...word.parts.slice(0, k), ...(v ? [{ t: 'lit' as const, v, q: 0 as const }] : []), ...word.parts.slice(k + 1)];
      out.push(...braceExpand({ parts, raw: word.raw }, budget));
    }
    return out;
  }
  return [word];
}

function expandOne(word: Word, env: ExpandEnv, opts: { glob?: boolean; split?: boolean }): string[] {
  const doGlob = opts.glob ?? true;
  const doSplit = opts.split ?? true;
  const fields: Field[] = [];
  let cur: Field | null = null;
  const ensure = (): Field => (cur ??= { pattern: '', hasQuoted: false });
  const finish = () => {
    if (cur) fields.push(cur);
    cur = null;
  };

  word.parts.forEach((part, idx) => {
    if (part.t === 'lit') {
      let v = part.v;
      if (idx === 0 && part.q === 0 && (v === '~' || v.startsWith('~/'))) {
        // tilde expansion produces quoted text (no further globbing of $HOME)
        ensure().pattern += escapeGlob(env.home);
        v = v.slice(1);
      }
      const f = ensure();
      if (part.q === 0) f.pattern += v;
      else {
        f.pattern += escapeGlob(v);
        f.hasQuoted = true;
      }
      return;
    }
    const value = part.t === 'var' ? (env.getVar(part.name) ?? '') : part.t === 'arith' ? String(evalArith(part.src, env.getVar)) : env.runSub(part.src).replace(/\n+$/, '');
    if (part.q !== 0 || !doSplit) {
      const f = ensure();
      f.pattern += escapeGlob(value);
      if (part.q !== 0) f.hasQuoted = true;
      return;
    }
    // unquoted: field splitting on IFS whitespace, result is glob-active
    const pieces = value.split(/[ \t\n]+/);
    pieces.forEach((piece, i) => {
      if (i > 0) finish();
      if (piece !== '') ensure().pattern += piece;
    });
    if (/[ \t\n]$/.test(value) && pieces.length > 1) finish();
  });
  finish();

  const out: string[] = [];
  for (const f of fields) {
    if (f.pattern === '' && !f.hasQuoted) continue;
    if (doGlob && hasGlobChars(f.pattern)) {
      const matches = expandGlob(f.pattern, env.cwd, env.fs);
      if (matches.length > 0) {
        out.push(...matches);
        continue;
      }
    }
    out.push(unescapeGlob(f.pattern));
  }
  return out;
}

/** Expand without splitting or globbing (assignments, redirect targets). */
export function expandWordSingle(word: Word, env: ExpandEnv): string {
  return expandWord(word, env, { glob: false, split: false }).join(' ');
}

export class ArithError extends Error {}

/** Integer arithmetic for $(( … )): + - * / % ** comparisons && || ! and variables. */
export function evalArith(src: string, getVar: (name: string) => string | undefined): number {
  const toks = src.match(/\s*(\d+|[A-Za-z_][A-Za-z0-9_]*|\$[A-Za-z_][A-Za-z0-9_]*|\*\*|<=|>=|==|!=|&&|\|\||[-+*/%()<>!])/gy);
  const joined = (toks ?? []).join('').replace(/\s+/g, '');
  if (joined !== src.replace(/\s+/g, '')) throw new ArithError(`${src.trim()}: syntax error in expression`);
  const t = (toks ?? []).map((x) => x.trim());
  let i = 0;
  const peek = () => t[i];
  const num = (name: string, depth = 0): number => {
    const v = (getVar(name.replace(/^\$/, '')) ?? '').trim();
    if (v === '') return 0;
    if (/^-?\d+$/.test(v)) return Number(v);
    if (depth < 5 && /^[A-Za-z_][A-Za-z0-9_]*$/.test(v)) return num(v, depth + 1);
    throw new ArithError(`${v}: syntax error: operand expected`);
  };
  const primary = (): number => {
    const x = t[i++];
    if (x === undefined) throw new ArithError(`${src.trim()}: syntax error: operand expected`);
    if (x === '(') {
      const v = or();
      if (t[i++] !== ')') throw new ArithError(`${src.trim()}: missing \`)'`);
      return v;
    }
    if (x === '-') return -primary();
    if (x === '+') return primary();
    if (x === '!') return primary() ? 0 : 1;
    if (/^\d+$/.test(x)) return Number(x);
    if (/^\$?[A-Za-z_]/.test(x)) return num(x);
    throw new ArithError(`${src.trim()}: syntax error: operand expected (error token is "${x}")`);
  };
  const pow = (): number => {
    const b = primary();
    if (peek() === '**') {
      i++;
      return Math.trunc(b ** pow());
    }
    return b;
  };
  const mul = (): number => {
    let v = pow();
    while (peek() === '*' || peek() === '/' || peek() === '%') {
      const op = t[i++];
      const r = pow();
      if ((op === '/' || op === '%') && r === 0) throw new ArithError('division by 0 (error token is "' + r + '")');
      v = op === '*' ? v * r : op === '/' ? Math.trunc(v / r) : v % r;
    }
    return v;
  };
  const add = (): number => {
    let v = mul();
    while (peek() === '+' || peek() === '-') v = t[i++] === '+' ? v + mul() : v - mul();
    return v;
  };
  const cmp = (): number => {
    let v = add();
    while (['<', '>', '<=', '>=', '==', '!='].includes(peek() ?? '')) {
      const op = t[i++];
      const r = add();
      v = Number(op === '<' ? v < r : op === '>' ? v > r : op === '<=' ? v <= r : op === '>=' ? v >= r : op === '==' ? v === r : v !== r);
    }
    return v;
  };
  const and = (): number => {
    let v = cmp();
    while (peek() === '&&') {
      i++;
      const r = cmp();
      v = Number(!!v && !!r);
    }
    return v;
  };
  function or(): number {
    let v = and();
    while (peek() === '||') {
      i++;
      const r = and();
      v = Number(!!v || !!r);
    }
    return v;
  }
  if (t.length === 0) return 0;
  const v = or();
  if (i < t.length) throw new ArithError(`${src.trim()}: syntax error in expression (error token is "${t.slice(i).join(' ')}")`);
  return v;
}
