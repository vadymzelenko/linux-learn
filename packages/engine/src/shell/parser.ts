/**
 * Bash-like tokenizer + parser.
 * Supports: '...' "..." \escapes, # comments, $VAR ${VAR} $? $(...),
 * pipes |, redirects > >> < 2> 2>> 2>&1 &> >&2, lists ; && || &.
 */

export type Quote = 0 | 1 | 2; // 0 = unquoted, 1 = single/escaped (fully literal), 2 = double

export type WordPart =
  | { t: 'lit'; v: string; q: Quote }
  | { t: 'var'; name: string; q: Quote }
  | { t: 'sub'; src: string; q: Quote }
  | { t: 'arith'; src: string; q: Quote };

export interface Word {
  parts: WordPart[];
  /** Original source text of the word, for error messages and checks. */
  raw: string;
}

export type RedirOp = '>' | '>>' | '<' | '>&' | '&>' | '&>>';

export interface Redirect {
  fd: number;
  op: RedirOp;
  /** target word, or fd number for `>&` */
  target: Word;
}

export type Compound =
  | { kind: 'for'; name: string; list: Word[] | null; body: Script }
  | { kind: 'if'; clauses: { cond: Script; body: Script }[]; otherwise: Script | null }
  | { kind: 'while' | 'until'; cond: Script; body: Script }
  | { kind: 'group'; body: Script };

export interface SimpleCommand {
  assignments: { name: string; value: Word }[];
  words: Word[];
  redirects: Redirect[];
  /** for / if / while / until / { …; } — words and assignments are empty then. */
  compound?: Compound;
}

export type Connector = ';' | '&&' | '||' | '&';

export interface ListItem {
  pipeline: SimpleCommand[];
  /** connector AFTER this pipeline */
  next: Connector | null;
}

export interface Script {
  items: ListItem[];
}

export class ParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ParseError';
  }
}

type Token =
  | { k: 'word'; word: Word }
  | { k: 'op'; op: '|' | Connector }
  | { k: 'redir'; fd: number; op: RedirOp }
  | { k: 'newline' };

const NAME_START = /[A-Za-z_]/;
const NAME_CHAR = /[A-Za-z0-9_]/;
const SPECIAL_VARS = new Set(['?', '$', '#', '0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '@', '*', '!']);

function eof(quote: string): ParseError {
  return new ParseError(`unexpected EOF while looking for matching \`${quote}'`);
}

/** Find the index of the `)` that closes a `$(` starting at `start` (index after `$(`). */
function findClosingParen(src: string, start: number): number {
  let depth = 1;
  let i = start;
  while (i < src.length) {
    const c = src[i]!;
    if (c === '\\') {
      i += 2;
      continue;
    }
    if (c === "'") {
      const end = src.indexOf("'", i + 1);
      if (end === -1) throw eof("'");
      i = end + 1;
      continue;
    }
    if (c === '"') {
      i++;
      while (i < src.length && src[i] !== '"') i += src[i] === '\\' ? 2 : 1;
      if (i >= src.length) throw eof('"');
      i++;
      continue;
    }
    if (c === '(') depth++;
    if (c === ')') {
      depth--;
      if (depth === 0) return i;
    }
    i++;
  }
  throw eof(')');
}

export function tokenize(src: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  let parts: WordPart[] = [];
  let wordStart = -1;
  let inWord = false;

  const pushLit = (v: string, q: Quote) => {
    const last = parts[parts.length - 1];
    if (last && last.t === 'lit' && last.q === q) last.v += v;
    else parts.push({ t: 'lit', v, q });
  };
  const startWord = () => {
    if (!inWord) {
      inWord = true;
      wordStart = i;
    }
  };
  const endWord = (endIdx: number) => {
    if (inWord) {
      tokens.push({ k: 'word', word: { parts, raw: src.slice(wordStart, endIdx) } });
      parts = [];
      inWord = false;
    }
  };

  /** Parse a `$...` expansion at position i (src[i] === '$'). Returns true if consumed. */
  const dollar = (q: Quote): boolean => {
    const n = src[i + 1];
    if (n === undefined) return false;
    if (n === '(') {
      if (src[i + 2] === '(') {
        const close = findClosingParen(src, i + 3);
        if (src[close + 1] !== ')') throw new ParseError('arithmetic expansion: missing `))\'');
        parts.push({ t: 'arith', src: src.slice(i + 3, close), q });
        i = close + 2;
        return true;
      }
      const close = findClosingParen(src, i + 2);
      parts.push({ t: 'sub', src: src.slice(i + 2, close), q });
      i = close + 1;
      return true;
    }
    if (n === '{') {
      const close = src.indexOf('}', i + 2);
      if (close === -1) throw eof('}');
      const name = src.slice(i + 2, close);
      if (!/^([A-Za-z_][A-Za-z0-9_]*|[?$#0-9@*!])$/.test(name)) throw new ParseError(`\${${name}}: bad substitution`);
      parts.push({ t: 'var', name, q });
      i = close + 1;
      return true;
    }
    if (SPECIAL_VARS.has(n)) {
      parts.push({ t: 'var', name: n, q });
      i += 2;
      return true;
    }
    if (NAME_START.test(n)) {
      let j = i + 1;
      while (j < src.length && NAME_CHAR.test(src[j]!)) j++;
      parts.push({ t: 'var', name: src.slice(i + 1, j), q });
      i = j;
      return true;
    }
    return false;
  };

  while (i < src.length) {
    const c = src[i]!;

    if (c === ' ' || c === '\t') {
      endWord(i);
      i++;
      continue;
    }
    if (c === '\n') {
      endWord(i);
      tokens.push({ k: 'newline' });
      i++;
      continue;
    }
    if (c === '#' && !inWord) {
      while (i < src.length && src[i] !== '\n') i++;
      continue;
    }
    if (c === '\\') {
      if (src[i + 1] === '\n') {
        i += 2;
        continue;
      }
      startWord();
      if (i + 1 < src.length) pushLit(src[i + 1]!, 1);
      i += 2;
      continue;
    }
    if (c === "'") {
      startWord();
      const end = src.indexOf("'", i + 1);
      if (end === -1) throw eof("'");
      pushLit(src.slice(i + 1, end), 1);
      // empty quotes still produce a (possibly empty) word
      if (end === i + 1) parts.push({ t: 'lit', v: '', q: 1 });
      i = end + 1;
      continue;
    }
    if (c === '"') {
      startWord();
      i++;
      let had = false;
      while (true) {
        if (i >= src.length) throw eof('"');
        const d = src[i]!;
        if (d === '"') {
          i++;
          break;
        }
        had = true;
        if (d === '\\') {
          const e = src[i + 1];
          if (e === '$' || e === '`' || e === '"' || e === '\\') {
            pushLit(e, 2);
            i += 2;
          } else if (e === '\n') {
            i += 2;
          } else {
            pushLit('\\', 2);
            i++;
          }
          continue;
        }
        if (d === '$' && dollar(2)) continue;
        if (d === '`') throw new ParseError('backtick substitution is not supported, use $(...)');
        pushLit(d, 2);
        i++;
      }
      if (!had) parts.push({ t: 'lit', v: '', q: 2 });
      continue;
    }
    if (c === '$') {
      startWord();
      if (dollar(0)) continue;
      pushLit('$', 0);
      i++;
      continue;
    }
    if (c === '`') throw new ParseError('backtick substitution is not supported, use $(...)');

    // operators
    if (c === '|' || c === '&' || c === ';' || c === '>' || c === '<' || c === '(' || c === ')') {
      // fd-prefixed redirect: e.g. 2>file (word consisting only of digits, no space)
      let fd: number | null = null;
      if ((c === '>' || c === '<') && inWord && parts.length === 1) {
        const p = parts[0]!;
        if (p.t === 'lit' && p.q === 0 && /^\d$/.test(p.v)) {
          fd = Number(p.v);
          parts = [];
          inWord = false;
        }
      }
      endWord(i);
      const two = src.slice(i, i + 2);
      const three = src.slice(i, i + 3);
      if (c === '(' || c === ')') throw new ParseError(`syntax error near unexpected token \`${c}'`);
      if (three === '&>>') {
        tokens.push({ k: 'redir', fd: 1, op: '&>>' });
        i += 3;
      } else if (two === '&>') {
        tokens.push({ k: 'redir', fd: 1, op: '&>' });
        i += 2;
      } else if (two === '>&') {
        tokens.push({ k: 'redir', fd: fd ?? 1, op: '>&' });
        i += 2;
      } else if (two === '>>') {
        tokens.push({ k: 'redir', fd: fd ?? 1, op: '>>' });
        i += 2;
      } else if (c === '>') {
        tokens.push({ k: 'redir', fd: fd ?? 1, op: '>' });
        i += src[i + 1] === '|' ? 2 : 1; // >| clobber
      } else if (c === '<') {
        if (two === '<<') throw new ParseError('here-documents (<<) are not supported');
        tokens.push({ k: 'redir', fd: fd ?? 0, op: '<' });
        i += 1;
      } else if (two === '||') {
        tokens.push({ k: 'op', op: '||' });
        i += 2;
      } else if (two === '&&') {
        tokens.push({ k: 'op', op: '&&' });
        i += 2;
      } else if (two === ';;') {
        throw new ParseError("syntax error near unexpected token `;;'");
      } else {
        tokens.push({ k: 'op', op: c as '|' | ';' | '&' });
        i += 1;
      }
      continue;
    }

    startWord();
    pushLit(c, 0);
    i++;
  }
  endWord(i);
  return tokens;
}

function tokenText(t: Token | undefined): string {
  if (!t || t.k === 'newline') return 'newline';
  if (t.k === 'op') return t.op;
  if (t.k === 'redir') return t.op === '&>' || t.op === '&>>' ? t.op : t.op;
  return t.word.raw;
}

const ASSIGN_RE = /^([A-Za-z_][A-Za-z0-9_]*)=/;

export function parse(src: string): Script {
  const tokens = tokenize(src);
  let pos = 0;
  const peek = () => tokens[pos];

  const unexpected = (t: Token | undefined) => new ParseError(`syntax error near unexpected token \`${tokenText(t)}'`);

  const isReserved = (t: Token | undefined, ...names: string[]): boolean => {
    if (!t || t.k !== 'word') return false;
    const p = t.word.parts;
    return p.length === 1 && p[0]!.t === 'lit' && p[0]!.q === 0 && names.includes(p[0]!.v);
  };
  const expect = (name: string) => {
    if (!isReserved(peek(), name)) throw pos >= tokens.length ? new ParseError('syntax error: unexpected end of file') : unexpected(peek());
    pos++;
  };
  const skipNewlines = () => {
    while (peek()?.k === 'newline') pos++;
  };

  const parseCompound = (): Compound => {
    const kw = (peek() as { word: Word }).word.raw;
    pos++;
    if (kw === 'for') {
      const nameTok = peek();
      if (!nameTok || nameTok.k !== 'word' || !/^[A-Za-z_][A-Za-z0-9_]*$/.test(nameTok.word.raw)) throw unexpected(nameTok);
      pos++;
      let list: Word[] | null = null;
      skipNewlines();
      if (isReserved(peek(), 'in')) {
        pos++;
        list = [];
        while (peek()?.k === 'word') list.push((tokens[pos++] as { word: Word }).word);
      }
      const sep = peek();
      if (sep && ((sep.k === 'op' && sep.op === ';') || sep.k === 'newline')) pos++;
      skipNewlines();
      expect('do');
      const body = parseList(['done']);
      expect('done');
      return { kind: 'for', name: nameTok.word.raw, list, body };
    }
    if (kw === 'if') {
      const clauses: { cond: Script; body: Script }[] = [];
      let otherwise: Script | null = null;
      for (;;) {
        const cond = parseList(['then']);
        expect('then');
        const body = parseList(['elif', 'else', 'fi']);
        clauses.push({ cond, body });
        if (isReserved(peek(), 'elif')) {
          pos++;
          continue;
        }
        if (isReserved(peek(), 'else')) {
          pos++;
          otherwise = parseList(['fi']);
        }
        expect('fi');
        return { kind: 'if', clauses, otherwise };
      }
    }
    if (kw === '{') {
      const body = parseList(['}']);
      expect('}');
      return { kind: 'group', body };
    }
    const cond = parseList(['do']);
    expect('do');
    const body = parseList(['done']);
    expect('done');
    return { kind: kw as 'while' | 'until', cond, body };
  };

  const parseSimple = (): SimpleCommand => {
    const cmd: SimpleCommand = { assignments: [], words: [], redirects: [] };
    if (isReserved(peek(), 'for', 'if', 'while', 'until', '{')) {
      cmd.compound = parseCompound();
      const c = cmd.compound;
      if (c.kind === 'if' ? c.clauses.some((x) => x.cond.items.length === 0 || x.body.items.length === 0) : c.body.items.length === 0 || ((c.kind === 'while' || c.kind === 'until') && c.cond.items.length === 0))
        throw new ParseError('syntax error: empty command list');
    }
    while (pos < tokens.length) {
      const t = peek()!;
      if (t.k === 'word' && !cmd.compound) {
        pos++;
        const first = t.word.parts[0];
        if (cmd.words.length === 0 && first && first.t === 'lit' && first.q === 0) {
          const m = ASSIGN_RE.exec(first.v);
          if (m) {
            const rest: WordPart[] = [];
            const remainder = first.v.slice(m[0].length);
            if (remainder) rest.push({ t: 'lit', v: remainder, q: 0 });
            rest.push(...t.word.parts.slice(1));
            cmd.assignments.push({ name: m[1]!, value: { parts: rest, raw: t.word.raw.slice(m[0].length) } });
            continue;
          }
        }
        cmd.words.push(t.word);
        continue;
      }
      if (t.k === 'redir') {
        pos++;
        const target = peek();
        if (!target || target.k !== 'word') throw unexpected(target);
        pos++;
        cmd.redirects.push({ fd: t.fd, op: t.op, target: target.word });
        continue;
      }
      if (t.k === 'word' && cmd.compound) throw unexpected(t);
      break;
    }
    return cmd;
  };

  const isEmpty = (c: SimpleCommand) => !c.compound && c.words.length === 0 && c.assignments.length === 0 && c.redirects.length === 0;

  function parseList(stop: string[]): Script {
    const items: ListItem[] = [];
    while (pos < tokens.length) {
      skipNewlines();
      if (pos >= tokens.length) break;
      if (stop.length && isReserved(peek(), ...stop)) break;
      if (isReserved(peek(), 'do', 'done', 'then', 'elif', 'else', 'fi', '}') && !stop.includes((peek() as { word: Word }).word.raw)) throw unexpected(peek());
      const pipeline: SimpleCommand[] = [];
      while (true) {
        const cmd = parseSimple();
        if (isEmpty(cmd)) throw unexpected(peek());
        pipeline.push(cmd);
        const t = peek();
        if (t && t.k === 'op' && t.op === '|') {
          pos++;
          skipNewlines();
          if (pos >= tokens.length) throw new ParseError('syntax error: unexpected end of file');
          continue;
        }
        break;
      }
      const t = peek();
      let next: Connector | null = null;
      if (t && t.k === 'op') {
        pos++;
        next = t.op as Connector;
        if (next === '&&' || next === '||') {
          skipNewlines();
          if (pos >= tokens.length) throw new ParseError('syntax error: unexpected end of file');
        }
      } else if (t && t.k === 'newline') {
        pos++;
        next = ';';
      } else if (t && !(stop.length && isReserved(t, ...stop))) {
        throw unexpected(t);
      }
      items.push({ pipeline, next });
    }
    return { items };
  }

  const script = parseList([]);
  if (pos < tokens.length) throw unexpected(peek());
  return script;
}

/** Plain text of a word ignoring expansions (used for completion & explain). */
export function wordLiteral(w: Word): string {
  return w.parts
    .map((p) => (p.t === 'lit' ? p.v : p.t === 'var' ? '$' + p.name : p.t === 'arith' ? `$((${p.src}))` : `$(${p.src})`))
    .join('');
}
