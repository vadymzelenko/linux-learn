/**
 * "Explain command" mode: split a command line into parts and describe each
 * one using the built-in documentation. Descriptions are English (as in man);
 * `key` lets the UI show a translated text for generic parts.
 */
import { parse, ParseError, tokenize, wordLiteral, type SimpleCommand } from './shell/parser';
import type { Registry } from './shell/interpreter';

export type ExplainKind = 'command' | 'flag' | 'value' | 'arg' | 'operator' | 'redirect' | 'assignment' | 'unknown';

export interface ExplainPart {
  text: string;
  kind: ExplainKind;
  /** English description (from man pages). */
  description: string;
  /** i18n key for generic parts (operators, argument kinds). */
  key?: string;
  /** Interpolation params for the key. */
  params?: Record<string, string>;
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
  '&>': ['explain.redir.both', 'write both output and errors into a file'],
};

function findOption(options: [string, string][] | undefined, flag: string): [string, string] | undefined {
  if (!options) return undefined;
  const re = new RegExp(`(^|[\\s,/])${flag.replace(/[-[\]{}()*+?.\\^$|]/g, '\\$&')}($|[\\s,=\\[/])`);
  return options.find(([f]) => re.test(f));
}

function describeArg(text: string): { key: string; description: string } {
  if (/[*?[]/.test(text)) return { key: 'explain.arg.glob', description: 'a glob pattern: the shell replaces it with all matching file names' };
  if (text.startsWith('$')) return { key: 'explain.arg.variable', description: 'a variable: replaced with its value' };
  if (text === '~' || text.startsWith('~/')) return { key: 'explain.arg.home', description: 'a path inside your home directory (~)' };
  if (text === '.') return { key: 'explain.arg.cwd', description: 'the current directory' };
  if (text === '..') return { key: 'explain.arg.parent', description: 'the parent directory' };
  if (text.startsWith('/')) return { key: 'explain.arg.absPath', description: 'an absolute path (starts at the root /)' };
  if (text.includes('/')) return { key: 'explain.arg.relPath', description: 'a relative path (from the current directory)' };
  if (/^['"]/.test(text)) return { key: 'explain.arg.string', description: 'a quoted string: passed as a single argument' };
  return { key: 'explain.arg.plain', description: 'an argument (a file name, text or value)' };
}

/** Options that take a value: `-n 5` */
const VALUE_OPTS: Record<string, string[]> = {
  head: ['-n', '-c'],
  tail: ['-n', '-c'],
  find: ['-name', '-iname', '-type', '-size', '-mtime', '-mmin', '-maxdepth', '-mindepth', '-user', '-group', '-perm', '-newer', '-path'],
  grep: ['-e', '-m', '-A', '-B', '-C'],
  cut: ['-d', '-f', '-c'],
  sort: ['-k', '-t', '-o'],
  mkdir: ['-m'],
  tree: ['-L'],
  awk: ['-F', '-v'],
  sed: ['-e'],
  xargs: ['-n', '-I'],
  sudo: ['-u'],
  du: ['-d'],
};

export function explain(line: string, registry: Registry): Explanation {
  const parts: ExplainPart[] = [];
  let script;
  try {
    script = parse(line);
    tokenize(line);
  } catch (e) {
    return { parts, error: e instanceof ParseError ? e.message : 'syntax error' };
  }
  const explainSimple = (cmd: SimpleCommand) => {
    for (const a of cmd.assignments) {
      parts.push({ text: `${a.name}=${wordLiteral(a.value)}`, kind: 'assignment', key: 'explain.assignment', params: { name: a.name }, description: `set the variable ${a.name}` });
    }
    const words = cmd.words.map((w) => ({ raw: w.raw, lit: wordLiteral(w) }));
    let i = 0;
    let def = words[0] ? registry.get(words[0].lit) : undefined;
    if (words[0]) {
      parts.push(
        def
          ? { text: words[0].raw, kind: 'command', description: def.doc.summary }
          : { text: words[0].raw, kind: 'unknown', key: 'explain.unknownCommand', description: 'unknown command' },
      );
      i = 1;
    }
    // `sudo cmd ...` — explain the inner command too
    if (def?.name === 'sudo' && words[1] && !words[1].lit.startsWith('-')) {
      const inner = registry.get(words[1].lit);
      parts.push(inner ? { text: words[1].raw, kind: 'command', description: inner.doc.summary } : { text: words[1].raw, kind: 'unknown', key: 'explain.unknownCommand', description: 'unknown command' });
      def = inner;
      i = 2;
    }
    let endOfOptions = false;
    for (; i < words.length; i++) {
      const w = words[i]!;
      const t = w.lit;
      if (!endOfOptions && t === '--') {
        endOfOptions = true;
        parts.push({ text: w.raw, kind: 'flag', key: 'explain.endOfOptions', description: 'end of options: everything after this is a file name or argument' });
        continue;
      }
      const valueOpts = def ? (VALUE_OPTS[def.name] ?? []) : [];
      if (!endOfOptions && t.startsWith('-') && t.length > 1 && !/^-\d+$/.test(t) && def) {
        if (t.startsWith('--') || valueOpts.includes(t) || (def.name === 'find' && t.length > 2)) {
          const flag = t.split('=')[0]!;
          const opt = findOption(def.doc.options, flag);
          parts.push({ text: w.raw, kind: 'flag', description: opt ? opt[1] : 'option', ...(opt ? {} : { key: 'explain.option' }) });
          if (valueOpts.includes(t) && words[i + 1]) {
            i++;
            parts.push({ text: words[i]!.raw, kind: 'value', key: 'explain.optionValue', params: { option: t }, description: `value for ${t}` });
          }
          continue;
        }
        // combined short flags: -la → -l, -a
        const chars = [...t.slice(1)];
        const descs = chars.map((c) => {
          const opt = findOption(def!.doc.options, '-' + c);
          return `-${c}: ${opt ? opt[1] : 'option'}`;
        });
        parts.push({ text: w.raw, kind: 'flag', description: descs.join('\n') });
        const lastFlag = '-' + chars[chars.length - 1];
        if (valueOpts.includes(lastFlag) && chars.length > 1 && words[i + 1]) {
          i++;
          parts.push({ text: words[i]!.raw, kind: 'value', key: 'explain.optionValue', params: { option: lastFlag }, description: `value for ${lastFlag}` });
        }
        continue;
      }
      if (/^-\d+$/.test(t) && (def?.name === 'head' || def?.name === 'tail')) {
        parts.push({ text: w.raw, kind: 'flag', key: 'explain.lineCount', params: { n: t.slice(1) }, description: `number of lines (${t.slice(1)})` });
        continue;
      }
      const d = describeArg(w.raw);
      parts.push({ text: w.raw, kind: 'arg', key: d.key, description: d.description });
    }
    for (const r of cmd.redirects) {
      const op = r.op === '>&' ? `${r.fd === 2 ? '2' : ''}>&${wordLiteral(r.target)}` : `${r.fd === 2 ? '2' : ''}${r.op}`;
      const known = REDIRECTS[op];
      parts.push({ text: op, kind: 'redirect', key: known?.[0] ?? 'explain.redirect', description: known?.[1] ?? 'redirection' });
      if (r.op !== '>&') parts.push({ text: r.target.raw, kind: 'arg', key: 'explain.redirTarget', description: 'the file used by the redirection' });
    }
  };
  for (const item of script.items) {
    item.pipeline.forEach((cmd, idx) => {
      explainSimple(cmd);
      if (idx < item.pipeline.length - 1) {
        const [key, description] = OPERATORS['|']!;
        parts.push({ text: '|', kind: 'operator', key, description });
      }
    });
    if (item.next && !(item.next === ';' && item === script.items[script.items.length - 1])) {
      const [key, description] = OPERATORS[item.next]!;
      parts.push({ text: item.next, kind: 'operator', key, description });
    }
  }
  return { parts };
}
