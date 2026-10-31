/**
 * Bash-like tokenizer + parser.
 * Supports: '...' "..." \escapes, # comments, $VAR ${VAR} $? $(...),
 * pipes |, redirects > >> < 2> 2>> 2>&1 &> >&2, lists ; && || &.
 */

export type Quote = 0 | 1 | 2; // 0 = unquoted, 1 = single/escaped (fully literal), 2 = double

export type WordPart =
  | { t: 'lit'; v: string; q: Quote }
  | { t: 'var'; name: string; q: Quote }
  | { t: 'sub'; src: string; q: Quote };

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

export interface SimpleCommand {
  assignments: { name: string; value: Word }[];
  words: Word[];
  redirects: Redirect[];
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
      if (src[i + 2] === '(') throw new ParseError('arithmetic expansion $((...)) is not supported');
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
  const items: ListItem[] = [];
  let pos = 0;
  const peek = () => tokens[pos];

  const unexpected = (t: Token | undefined) => new ParseError(`syntax error near unexpected token \`${tokenText(t)}'`);

  const parseSimple = (): SimpleCommand => {
    const cmd: SimpleCommand = { assignments: [], words: [], redirects: [] };
    while (pos < tokens.length) {
      const t = peek()!;
      if (t.k === 'word') {
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
      break;
    }
    return cmd;
  };

  const isEmpty = (c: SimpleCommand) => c.words.length === 0 && c.assignments.length === 0 && c.redirects.length === 0;

  while (pos < tokens.length) {
    while (peek()?.k === 'newline') pos++;
    if (pos >= tokens.length) break;
    const pipeline: SimpleCommand[] = [];
    while (true) {
      const cmd = parseSimple();
      if (isEmpty(cmd)) throw unexpected(peek());
      pipeline.push(cmd);
      const t = peek();
      if (t && t.k === 'op' && t.op === '|') {
        pos++;
        while (peek()?.k === 'newline') pos++;
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
        while (peek()?.k === 'newline') pos++;
        if (pos >= tokens.length) throw new ParseError('syntax error: unexpected end of file');
      }
    } else if (t && t.k === 'newline') {
      pos++;
      next = ';';
    } else if (t) {
      throw unexpected(t);
    }
    items.push({ pipeline, next });
  }
  return { items };
}

/** Plain text of a word ignoring expansions (used for completion & explain). */
export function wordLiteral(w: Word): string {
  return w.parts
    .map((p) => (p.t === 'lit' ? p.v : p.t === 'var' ? '$' + p.name : `$(${p.src})`))
    .join('');
}
