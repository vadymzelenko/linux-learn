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
    const value = part.t === 'var' ? (env.getVar(part.name) ?? '') : env.runSub(part.src).replace(/\n+$/, '');
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
