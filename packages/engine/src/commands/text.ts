import type { CommandDef, Ctx } from '../shell/context';
import { ArgError, parseArgs } from '../shell/args';
import { can, collate, FsError, R } from '../vfs/fs';
import type { DirNode } from '../types';
import { breToJs, C, eachInput, ereToJs, escapeRegExp, joinLines, lines, makeRegExp, parseCount, q } from './util';
import { utf8Length } from '../vfs/fs';

// ---------------------------------------------------------------- echo / printf

function backslashEscapes(s: string): { text: string; stop: boolean } {
  let out = '';
  for (let i = 0; i < s.length; i++) {
    const c = s[i]!;
    if (c !== '\\' || i + 1 >= s.length) {
      out += c;
      continue;
    }
    const n = s[++i]!;
    switch (n) {
      case 'n': out += '\n'; break;
      case 't': out += '\t'; break;
      case 'r': out += '\r'; break;
      case 'a': out += '\x07'; break;
      case 'b': out += '\b'; break;
      case 'f': out += '\f'; break;
      case 'v': out += '\v'; break;
      case 'e': case 'E': out += '\x1b'; break;
      case '\\': out += '\\'; break;
      case 'c': return { text: out, stop: true };
      case '0': {
        const m = /^[0-7]{0,3}/.exec(s.slice(i + 1))![0];
        out += String.fromCharCode(parseInt(m || '0', 8));
        i += m.length;
        break;
      }
      case 'x': {
        const m = /^[0-9a-fA-F]{1,2}/.exec(s.slice(i + 1));
        if (m) {
          out += String.fromCharCode(parseInt(m[0], 16));
          i += m[0].length;
        } else out += '\\x';
        break;
      }
      default: out += '\\' + n;
    }
  }
  return { text: out, stop: false };
}

export const echo: CommandDef = {
  name: 'echo',
  builtin: true,
  noHelp: true,
  category: 'text',
  doc: {
    summary: 'display a line of text',
    usage: ['echo [-neE] [arg ...]'],
    description: 'Write arguments to the standard output, separated by a single space and followed by a newline.',
    options: [
      ['-n', 'do not append a newline'],
      ['-e', 'enable interpretation of backslash escapes (\\n, \\t, ...)'],
      ['-E', 'explicitly suppress interpretation of backslash escapes'],
    ],
    examples: [
      ['echo Hello', 'print a word'],
      ['echo "Hi, $USER"', 'variables are expanded inside double quotes'],
      ['echo text > file.txt', 'write text into a file'],
    ],
    seeAlso: ['printf'],
  },
  run(ctx) {
    let args = ctx.args;
    let newline = true;
    let escapes = false;
    while (args.length && /^-[neE]+$/.test(args[0]!)) {
      for (const c of args[0]!.slice(1)) {
        if (c === 'n') newline = false;
        if (c === 'e') escapes = true;
        if (c === 'E') escapes = false;
      }
      args = args.slice(1);
    }
    let text = args.join(' ');
    if (escapes) {
      const r = backslashEscapes(text);
      text = r.text;
      if (r.stop) newline = false;
    }
    ctx.out(text + (newline ? '\n' : ''));
    return 0;
  },
};

export const printf: CommandDef = {
  name: 'printf',
  builtin: true,
  category: 'text',
  doc: {
    summary: 'format and print data',
    usage: ['printf FORMAT [ARGUMENT]...'],
    description: 'Print ARGUMENT(s) according to FORMAT. Supports %s %d %i %f %x %o %c %b %% and backslash escapes. The format is reused while arguments remain.',
    examples: [["printf '%s\\n' one two", 'print each argument on its own line']],
    seeAlso: ['echo'],
  },
  run(ctx) {
    const [fmt, ...rest] = ctx.args;
    if (fmt === undefined) {
      ctx.err('printf: usage: printf [-v var] format [arguments]\n');
      return 2;
    }
    let args = [...rest];
    let out = '';
    let code = 0;
    do {
      let consumed = 0;
      const text = fmt.replace(/%([-+ 0#]*)(\d+|\*)?(?:\.(\d+))?([sdifxXocb%])/g, (_m, flags: string, width: string | undefined, prec: string | undefined, conv: string) => {
        if (conv === '%') return '%';
        const arg = args[consumed++] ?? '';
        let s: string;
        switch (conv) {
          case 'd':
          case 'i': {
            const n = arg === '' ? 0 : Number.parseInt(arg, 10);
            if (arg !== '' && Number.isNaN(n)) {
              ctx.err(`bash: printf: ${arg}: invalid number\n`);
              code = 1;
            }
            s = String(Number.isNaN(n) ? 0 : n);
            break;
          }
          case 'f': s = (Number.parseFloat(arg) || 0).toFixed(prec !== undefined ? Number(prec) : 6); break;
          case 'x': s = ((Number.parseInt(arg, 10) || 0) >>> 0).toString(16); break;
          case 'X': s = ((Number.parseInt(arg, 10) || 0) >>> 0).toString(16).toUpperCase(); break;
          case 'o': s = ((Number.parseInt(arg, 10) || 0) >>> 0).toString(8); break;
          case 'c': s = arg.slice(0, 1); break;
          case 'b': s = backslashEscapes(arg).text; break;
          default: s = prec !== undefined ? arg.slice(0, Number(prec)) : arg;
        }
        const w = width && width !== '*' ? Number(width) : 0;
        if (s.length < w) s = flags.includes('-') ? s.padEnd(w) : flags.includes('0') && conv !== 's' ? s.padStart(w, '0') : s.padStart(w);
        return s;
      });
      out += backslashEscapes(text).text;
      args = args.slice(consumed);
      if (consumed === 0) break;
    } while (args.length > 0);
    ctx.out(out);
    return code;
  },
};

// ---------------------------------------------------------------- head / tail

function headTail(kind: 'head' | 'tail'): CommandDef {
  return {
    name: kind,
    category: 'text',
    doc: {
      summary: kind === 'head' ? 'output the first part of files' : 'output the last part of files',
      usage: [`${kind} [OPTION]... [FILE]...`],
      description:
        kind === 'head'
          ? 'Print the first 10 lines of each FILE to standard output. With more than one FILE, precede each with a header giving the file name.'
          : 'Print the last 10 lines of each FILE to standard output. With more than one FILE, precede each with a header giving the file name.',
      options: [
        ['-c, --bytes=NUM', `print the ${kind === 'head' ? 'first' : 'last'} NUM bytes`],
        ['-n, --lines=NUM', `print the ${kind === 'head' ? 'first' : 'last'} NUM lines instead of the ${kind === 'head' ? 'first' : 'last'} 10${kind === 'tail' ? '; or use -n +NUM to output starting with line NUM' : ''}`],
        ['-q, --quiet', 'never print headers giving file names'],
        ['-v, --verbose', 'always print headers giving file names'],
        ...(kind === 'tail' ? ([['-f, --follow', 'output appended data as the file grows (not interactive in the trainer)']] as [string, string][]) : []),
      ],
      examples:
        kind === 'head'
          ? [['head -n 3 file.txt', 'first three lines']]
          : [['tail -n 20 /var/log/syslog', 'last 20 lines of a log'], ['tail -n +2 data.csv', 'everything except the header line']],
      seeAlso: [kind === 'head' ? 'tail' : 'head', 'cat'],
    },
    run(ctx) {
      const a = parseArgs(ctx.args, {
        flags: 'qvfF',
        withValue: 'nc',
        long: { quiet: 'q', silent: 'q', verbose: 'v', follow: 'f' },
        longWithValue: { lines: 'n', bytes: 'c' },
        numericShortcut: 'n',
      });
      const raw = a.values.get('c') ?? a.values.get('n') ?? '10';
      const bytes = a.values.has('c') && a.order.lastIndexOf('c') > a.order.lastIndexOf('n');
      const fromStart = kind === 'tail' && raw.startsWith('+');
      const allBut = kind === 'head' && raw.startsWith('-');
      const n = parseCount(ctx, raw, bytes ? 'bytes' : 'lines');
      if (n === null) return 1;
      const files = a.operands.length ? a.operands : ['-'];
      const headers = a.flags.has('v') || (files.length > 1 && !a.flags.has('q'));
      let first = true;
      const ok = eachInput(ctx, files, (text, name) => {
        if (headers) {
          ctx.out(`${first ? '' : '\n'}==> ${name === '-' ? 'standard input' : name} <==\n`);
        }
        first = false;
        if (bytes) {
          if (kind === 'head') ctx.out(allBut ? text.slice(0, Math.max(0, text.length - n)) : text.slice(0, n));
          else ctx.out(fromStart ? text.slice(Math.max(0, n - 1)) : n === 0 ? '' : text.slice(-n));
          return;
        }
        const parts = text.split('\n');
        const trailing = parts[parts.length - 1] === '';
        if (trailing) parts.pop();
        let start: number;
        let end: number;
        if (kind === 'head') {
          start = 0;
          end = allBut ? Math.max(0, parts.length - n) : Math.min(n, parts.length);
        } else {
          start = fromStart ? Math.min(Math.max(0, n - 1), parts.length) : Math.max(0, parts.length - n);
          end = parts.length;
        }
        let out = '';
        for (let i = start; i < end; i++) out += parts[i] + (i === parts.length - 1 && !trailing ? '' : '\n');
        ctx.out(out);
      });
      // `head` on a directory
      return ok ? 0 : 1;
    },
  };
}

export const head = headTail('head');
export const tail = headTail('tail');

// ---------------------------------------------------------------- wc

export const wc: CommandDef = {
  name: 'wc',
  category: 'text',
  doc: {
    summary: 'print newline, word, and byte counts for each file',
    usage: ['wc [OPTION]... [FILE]...'],
    description:
      'Print newline, word, and byte counts for each FILE, and a total line if more than one FILE is specified. A word is a non-zero-length sequence of printable characters delimited by white space.',
    options: [
      ['-c, --bytes', 'print the byte counts'],
      ['-m, --chars', 'print the character counts'],
      ['-l, --lines', 'print the newline counts'],
      ['-w, --words', 'print the word counts'],
      ['-L, --max-line-length', 'print the maximum display width'],
    ],
    examples: [
      ['wc -l notes.txt', 'count lines'],
      ['ls | wc -l', 'count files in the current directory'],
    ],
    seeAlso: ['grep', 'sort'],
  },
  run(ctx) {
    const a = parseArgs(ctx.args, {
      flags: 'cmlwL',
      long: { bytes: 'c', chars: 'm', lines: 'l', words: 'w', 'max-line-length': 'L' },
    });
    let sel = ['l', 'w', 'm', 'c', 'L'].filter((k) => a.flags.has(k));
    if (sel.length === 0) sel = ['l', 'w', 'c'];
    const files = a.operands.length ? a.operands : ['-'];
    const rows: { counts: number[]; name: string }[] = [];
    const totals = sel.map(() => 0);
    let regularTotal = 0;
    let minWidth = 1;
    let code = 0;
    for (const f of files) {
      let text: string;
      if (f === '-') {
        text = ctx.stdin ?? '';
        minWidth = 7;
      } else {
        try {
          const r = ctx.stat(f);
          if (r.node.type === 'dir') {
            ctx.fail(`${f}: Is a directory`);
            rows.push({ counts: sel.map(() => 0), name: f });
            code = 1;
            continue;
          }
          text = ctx.readFile(f);
          regularTotal += utf8Length(text);
        } catch (e) {
          if (e instanceof FsError) {
            ctx.fail(`${f}: ${e.text}`);
            code = 1;
            continue;
          }
          throw e;
        }
      }
      const counts = sel.map((k) => {
        switch (k) {
          case 'l': return (text.match(/\n/g) ?? []).length;
          case 'w': return text.split(/[ \t\n\r\f\v]+/).filter(Boolean).length;
          case 'm': return [...text].length;
          case 'c': return utf8Length(text);
          default: return Math.max(0, ...text.split('\n').map((l) => l.replace(/\t/g, '        ').length));
        }
      });
      counts.forEach((c, i) => (totals[i] = sel[i] === 'L' ? Math.max(totals[i]!, c) : totals[i]! + c));
      rows.push({ counts, name: f === '-' && a.operands.length === 0 ? '' : f });
    }
    let width = 1;
    for (let t = regularTotal; t >= 10; t = Math.floor(t / 10)) width++;
    width = Math.max(width, minWidth);
    if (sel.length === 1 && files.length === 1) width = 1;
    const fmt = (counts: number[], name: string) => counts.map((c) => String(c).padStart(width)).join(' ') + (name ? ` ${name}` : '') + '\n';
    let out = rows.map((r) => fmt(r.counts, r.name)).join('');
    if (files.length > 1) out += fmt(totals, 'total');
    ctx.out(out);
    return code;
  },
};

// ---------------------------------------------------------------- grep

export const grep: CommandDef = {
  name: 'grep',
  category: 'search',
  doc: {
    summary: 'print lines that match patterns',
    usage: ['grep [OPTION...] PATTERNS [FILE...]'],
    description:
      'Search for PATTERNS in each FILE. PATTERNS is a basic regular expression by default (-E for extended, -F for fixed strings). When FILE is -, or no FILE is given, read standard input (recursive searches examine the working directory).',
    options: [
      ['-E, --extended-regexp', 'PATTERNS are extended regular expressions'],
      ['-F, --fixed-strings', 'PATTERNS are strings'],
      ['-e, --regexp=PATTERNS', 'use PATTERNS for matching'],
      ['-i, --ignore-case', 'ignore case distinctions in patterns and data'],
      ['-v, --invert-match', 'select non-matching lines'],
      ['-w, --word-regexp', 'match only whole words'],
      ['-x, --line-regexp', 'match only whole lines'],
      ['-c, --count', 'print only a count of selected lines per FILE'],
      ['-l, --files-with-matches', 'print only names of FILEs with selected lines'],
      ['-L, --files-without-match', 'print only names of FILEs with no selected lines'],
      ['-n, --line-number', 'print line number with output lines'],
      ['-H, --with-filename', 'print file name with output lines'],
      ['-h, --no-filename', 'suppress the file name prefix on output'],
      ['-o, --only-matching', 'show only nonempty parts of lines that match'],
      ['-q, --quiet', 'suppress all normal output'],
      ['-r, --recursive', 'search directories recursively'],
      ['-m, --max-count=NUM', 'stop after NUM selected lines'],
      ['--color[=WHEN]', 'use markers to highlight the matching strings'],
    ],
    notes: ['Exit status is 0 if a line is selected, 1 if no lines were selected, and 2 if an error occurred.'],
    examples: [
      ['grep error app.log', 'lines containing "error"'],
      ['grep -rn TODO src/', 'search a whole directory with line numbers'],
      ['ps aux | grep nginx', 'filter the output of another command'],
    ],
    seeAlso: ['find', 'sed', 'awk'],
  },
  run(ctx) {
    const a = parseArgs(ctx.args, {
      flags: 'EFGivwxclLnHhoqsrRIa',
      withValue: 'emABC',
      long: {
        'extended-regexp': 'E', 'fixed-strings': 'F', 'basic-regexp': 'G', 'ignore-case': 'i', 'invert-match': 'v',
        'word-regexp': 'w', 'line-regexp': 'x', count: 'c', 'files-with-matches': 'l', 'files-without-match': 'L',
        'line-number': 'n', 'with-filename': 'H', 'no-filename': 'h', 'only-matching': 'o', quiet: 'q', silent: 'q',
        'no-messages': 's', recursive: 'r', 'dereference-recursive': 'R',
      },
      longWithValue: { regexp: 'e', 'max-count': 'm', include: 'include', exclude: 'exclude' },
      longOptional: { color: 'color', colour: 'color' },
    });
    const f = a.flags;
    const operands = [...a.operands];
    const patterns: string[] = [];
    if (a.values.has('e')) {
      // all -e occurrences
      const argv = ctx.args;
      for (let i = 0; i < argv.length; i++) {
        if (argv[i] === '-e' && argv[i + 1] !== undefined) patterns.push(argv[++i]!);
        else if (/^-e./.test(argv[i]!)) patterns.push(argv[i]!.slice(2));
        else if (argv[i]!.startsWith('--regexp=')) patterns.push(argv[i]!.slice(9));
      }
    } else {
      const p = operands.shift();
      if (p === undefined) {
        ctx.err("Usage: grep [OPTION]... PATTERNS [FILE]...\nTry 'grep --help' for more information.\n");
        return 2;
      }
      patterns.push(...p.split('\n'));
    }
    const colorOpt = a.values.get('color') ?? (f.has('color') ? 'auto' : 'never');
    const color = colorOpt === 'always' || (colorOpt === 'auto' && ctx.isTTY);
    const sources = patterns.map((p) => (f.has('F') ? escapeRegExp(p) : f.has('E') ? ereToJs(p) : breToJs(p)));
    let src = sources.map((s) => `(?:${s})`).join('|');
    if (f.has('w')) src = `(?<![A-Za-z0-9_])(?:${src})(?![A-Za-z0-9_])`;
    if (f.has('x')) src = `^(?:${src})$`;
    const re = makeRegExp(src, f.has('i') ? 'gi' : 'g');
    if (typeof re === 'string') {
      ctx.fail('Invalid regular expression');
      return 2;
    }
    const recursive = f.has('r') || f.has('R');
    const maxCount = a.values.has('m') ? Number(a.values.get('m')) : Infinity;
    let files = operands;
    let omitDotSlash = false;
    if (files.length === 0) {
      if (recursive) {
        files = ['.'];
        omitDotSlash = true;
      } else files = ['-'];
    }
    const multi = recursive || files.length > 1;
    const showName = f.has('H') || (multi && !f.has('h'));
    let matchedAny = false;
    let error = false;
    let out = '';

    const paintName = (n: string) => (color ? `${C.grepFile}${n}${C.grepEnd}` : n);
    const sep = color ? `${C.grepSep}:${C.grepEnd}` : ':';

    const searchText = (text: string, name: string) => {
      let count = 0;
      const ls = lines(text);
      for (let i = 0; i < ls.length && count < maxCount; i++) {
        const line = ls[i]!;
        re.lastIndex = 0;
        const hit = re.test(line);
        if (hit === f.has('v')) continue;
        count++;
        matchedAny = true;
        if (f.has('q') || f.has('l') || f.has('L') || f.has('c')) continue;
        const prefix = (showName ? paintName(name) + sep : '') + (f.has('n') ? (color ? `${C.grepLine}${i + 1}${C.grepEnd}` : String(i + 1)) + sep : '');
        if (f.has('o') && !f.has('v')) {
          re.lastIndex = 0;
          for (const m of line.matchAll(re)) {
            if (m[0] === '') continue;
            out += prefix + (color ? `${C.grepMatch}${m[0]}${C.grepEnd}` : m[0]) + '\n';
          }
        } else {
          re.lastIndex = 0;
          const body = color && !f.has('v') ? line.replace(re, (m) => (m ? `${C.grepMatch}${m}${C.grepEnd}` : m)) : line;
          out += prefix + body + '\n';
        }
      }
      if (f.has('c')) out += (showName ? paintName(name) + sep : '') + count + '\n';
      if (f.has('l') && count > 0) out += paintName(name) + '\n';
      if (f.has('L') && count === 0) out += paintName(name) + '\n';
    };

    const include = a.values.get('include');
    const exclude = a.values.get('exclude');
    const globOk = (name: string) => {
      const base = name.slice(name.lastIndexOf('/') + 1);
      const toRe = (g: string) => new RegExp('^' + g.split('*').map(escapeRegExp).join('.*') + '$');
      if (include && !toRe(include).test(base)) return false;
      if (exclude && toRe(exclude).test(base)) return false;
      return true;
    };

    const walk = (path: string, shown: string) => {
      let r;
      try {
        r = ctx.stat(path);
      } catch (e) {
        if (e instanceof FsError) {
          if (!f.has('s')) ctx.fail(`${shown}: ${e.text}`);
          error = true;
          return;
        }
        throw e;
      }
      const node = r.node;
      if (node.type === 'dir') {
        if (!can(node, ctx.cred, R)) {
          if (!f.has('s')) ctx.fail(`${shown}: Permission denied`);
          error = true;
          return;
        }
        for (const name of Object.keys((node as DirNode).children).sort(collate)) {
          const child = (node as DirNode).children[name]!;
          if (child.type === 'symlink' && !f.has('R')) continue;
          const childShown = omitDotSlash && shown === '.' ? name : shown.endsWith('/') ? shown + name : `${shown}/${name}`;
          walk(path.endsWith('/') ? path + name : `${path}/${name}`, childShown);
        }
        return;
      }
      if (!globOk(shown)) return;
      try {
        searchText(ctx.readFile(path), shown);
      } catch (e) {
        if (e instanceof FsError) {
          if (!f.has('s')) ctx.fail(`${shown}: ${e.text}`);
          error = true;
        } else throw e;
      }
    };

    for (const file of files) {
      if (file === '-') {
        searchText(ctx.stdin ?? '', '(standard input)');
        continue;
      }
      if (recursive) {
        walk(file, file);
        continue;
      }
      const r = ctx.tryStat(file);
      if (r && r.node.type === 'dir') {
        if (!f.has('s')) ctx.fail(`${file}: Is a directory`);
        error = true;
        continue;
      }
      try {
        searchText(ctx.readFile(file), file);
      } catch (e) {
        if (e instanceof FsError) {
          if (!f.has('s')) ctx.fail(`${file}: ${e.text}`);
          error = true;
        } else throw e;
      }
    }
    if (!f.has('q')) ctx.out(out);
    if (f.has('q') && matchedAny) return 0;
    return error ? 2 : matchedAny ? 0 : 1;
  },
};

// ---------------------------------------------------------------- sort / uniq

function leadingNumber(s: string): number {
  const m = /^\s*([+-]?\d*\.?\d+)/.exec(s);
  return m ? Number(m[1]) : 0;
}

function humanNumber(s: string): number {
  const m = /^\s*([+-]?\d*\.?\d+)\s*([KMGTPE]?)/i.exec(s);
  if (!m) return 0;
  const mult = { '': 1, K: 1e3, M: 1e6, G: 1e9, T: 1e12, P: 1e15, E: 1e18 }[m[2]!.toUpperCase()] ?? 1;
  return Number(m[1]) * mult;
}

export const sort: CommandDef = {
  name: 'sort',
  category: 'text',
  doc: {
    summary: 'sort lines of text files',
    usage: ['sort [OPTION]... [FILE]...'],
    description: 'Write sorted concatenation of all FILE(s) to standard output. With no FILE, or when FILE is -, read standard input.',
    options: [
      ['-f, --ignore-case', 'fold lower case to upper case characters'],
      ['-h, --human-numeric-sort', 'compare human readable numbers (e.g., 2K 1G)'],
      ['-n, --numeric-sort', 'compare according to string numerical value'],
      ['-r, --reverse', 'reverse the result of comparisons'],
      ['-u, --unique', 'output only the first of an equal run'],
      ['-k, --key=KEYDEF', 'sort via a key; KEYDEF gives location (field number)'],
      ['-t, --field-separator=SEP', 'use SEP instead of non-blank to blank transition'],
      ['-o, --output=FILE', 'write result to FILE instead of standard output'],
    ],
    examples: [
      ['sort names.txt', 'alphabetical order'],
      ['sort -n -r scores.txt', 'numbers, largest first'],
      ['du -h | sort -h', 'sort human readable sizes'],
    ],
    seeAlso: ['uniq', 'shuf'],
  },
  run(ctx) {
    const a = parseArgs(ctx.args, {
      flags: 'fhnruVbsM',
      withValue: 'kto',
      long: { 'ignore-case': 'f', 'human-numeric-sort': 'h', 'numeric-sort': 'n', reverse: 'r', unique: 'u', 'version-sort': 'V', stable: 's' },
      longWithValue: { key: 'k', 'field-separator': 't', output: 'o' },
    });
    const f = a.flags;
    let all: string[] = [];
    for (const file of a.operands.length ? a.operands : ['-']) {
      if (file === '-') {
        all.push(...lines(ctx.stdin ?? ''));
        continue;
      }
      try {
        all.push(...lines(ctx.readFile(file)));
      } catch (e) {
        if (e instanceof FsError) {
          ctx.fail(e.code === 'EISDIR' ? `read failed: ${file}: Is a directory` : `cannot read: ${file}: ${e.text}`);
          return 2;
        }
        throw e;
      }
    }
    const sepOpt = a.values.get('t');
    const keyDef = a.values.get('k');
    let keyStart = 0;
    let keyEnd = Infinity;
    let keyNumeric = false;
    let keyReverse = false;
    if (keyDef) {
      const m = /^(\d+)(?:\.\d+)?([a-zA-Z]*)(?:,(\d+)(?:\.\d+)?([a-zA-Z]*))?$/.exec(keyDef);
      if (!m) {
        ctx.fail(`invalid number at field start: invalid count at start of '${keyDef}'`);
        return 2;
      }
      keyStart = Number(m[1]) - 1;
      keyEnd = m[3] ? Number(m[3]) : Infinity;
      const opts = (m[2] ?? '') + (m[4] ?? '');
      keyNumeric = opts.includes('n');
      keyReverse = opts.includes('r');
    }
    const key = (line: string): string => {
      if (!keyDef) return line;
      if (sepOpt !== undefined) return line.split(sepOpt).slice(keyStart, keyEnd).join(sepOpt);
      const fields = line.match(/\s*\S+/g) ?? [];
      return fields.slice(keyStart, keyEnd).join('').trimStart();
    };
    const numeric = f.has('n') || keyNumeric;
    const cmp = (x: string, y: string): number => {
      const kx = key(x);
      const ky = key(y);
      let d: number;
      if (f.has('h')) d = humanNumber(kx) - humanNumber(ky);
      else if (numeric) d = leadingNumber(kx) - leadingNumber(ky);
      else if (f.has('V')) d = kx.localeCompare(ky, undefined, { numeric: true });
      else d = f.has('f') ? collate(kx.toUpperCase(), ky.toUpperCase()) : collate(kx, ky);
      if (keyReverse) d = -d;
      if (d === 0 && !f.has('s') && !f.has('u')) d = collate(x, y);
      return d;
    };
    all.sort(cmp);
    if (f.has('r')) all.reverse();
    if (f.has('u')) {
      const out: string[] = [];
      for (const l of all) if (out.length === 0 || cmp(out[out.length - 1]!, l) !== 0) out.push(l);
      all = out;
    }
    const text = joinLines(all);
    const o = a.values.get('o');
    if (o) {
      try {
        ctx.writeFile(o, text);
      } catch (e) {
        if (e instanceof FsError) {
          ctx.fail(`open failed: ${o}: ${e.text}`);
          return 2;
        }
        throw e;
      }
    } else ctx.out(text);
    return 0;
  },
};

export const uniq: CommandDef = {
  name: 'uniq',
  category: 'text',
  doc: {
    summary: 'report or omit repeated lines',
    usage: ['uniq [OPTION]... [INPUT [OUTPUT]]'],
    description: 'Filter adjacent matching lines from INPUT (or standard input), writing to OUTPUT (or standard output). Note: \'uniq\' does not detect repeated lines unless they are adjacent, so you usually sort first.',
    options: [
      ['-c, --count', 'prefix lines by the number of occurrences'],
      ['-d, --repeated', 'only print duplicate lines, one for each group'],
      ['-u, --unique', 'only print unique lines'],
      ['-i, --ignore-case', 'ignore differences in case when comparing'],
    ],
    examples: [['sort access.log | uniq -c | sort -rn', 'count how often each line occurs']],
    seeAlso: ['sort', 'comm'],
  },
  run(ctx) {
    const a = parseArgs(ctx.args, { flags: 'cdui', long: { count: 'c', repeated: 'd', unique: 'u', 'ignore-case': 'i' } });
    const [input, output] = a.operands;
    let text = '';
    const ok = eachInput(ctx, input ? [input] : [], (t) => (text = t));
    if (!ok) return 1;
    const groups: { line: string; n: number }[] = [];
    const eq = (x: string, y: string) => (a.flags.has('i') ? x.toLowerCase() === y.toLowerCase() : x === y);
    for (const l of lines(text)) {
      const g = groups[groups.length - 1];
      if (g && eq(g.line, l)) g.n++;
      else groups.push({ line: l, n: 1 });
    }
    const sel = groups.filter((g) => (a.flags.has('d') ? g.n > 1 : true) && (a.flags.has('u') ? g.n === 1 : true));
    const out = joinLines(sel.map((g) => (a.flags.has('c') ? `${String(g.n).padStart(7)} ${g.line}` : g.line)));
    if (output) ctx.writeFile(output, out);
    else ctx.out(out);
    return 0;
  },
};

// ---------------------------------------------------------------- cut

function parseList(spec: string): ((n: number) => boolean) | null {
  const ranges: [number, number][] = [];
  for (const part of spec.split(',')) {
    const m = /^(\d*)-?(\d*)$/.exec(part);
    if (!m || part === '' || part === '-') return null;
    const hasDash = part.includes('-');
    const lo = m[1] ? Number(m[1]) : 1;
    const hi = hasDash ? (m[2] ? Number(m[2]) : Infinity) : lo;
    if (lo < 1) return null;
    ranges.push([lo, hi]);
  }
  return (n) => ranges.some(([lo, hi]) => n >= lo && n <= hi);
}

export const cut: CommandDef = {
  name: 'cut',
  category: 'text',
  doc: {
    summary: 'remove sections from each line of files',
    usage: ['cut OPTION... [FILE]...'],
    description: 'Print selected parts of lines from each FILE to standard output.',
    options: [
      ['-c, --characters=LIST', 'select only these characters'],
      ['-d, --delimiter=DELIM', 'use DELIM instead of TAB for field delimiter'],
      ['-f, --fields=LIST', 'select only these fields'],
      ['-s, --only-delimited', 'do not print lines not containing delimiters'],
    ],
    notes: ['Each LIST is made up of one range, or many ranges separated by commas: N, N-, N-M, -M.'],
    examples: [
      ['cut -d: -f1 /etc/passwd', 'list user names'],
      ['cut -c1-5 file.txt', 'first five characters of every line'],
    ],
    seeAlso: ['awk', 'paste'],
  },
  run(ctx) {
    const a = parseArgs(ctx.args, {
      flags: 's',
      withValue: 'cdfb',
      long: { 'only-delimited': 's' },
      longWithValue: { characters: 'c', delimiter: 'd', fields: 'f', bytes: 'b' },
    });
    const fields = a.values.get('f');
    const chars = a.values.get('c') ?? a.values.get('b');
    if (!fields && !chars) throw new ArgError('you must specify a list of bytes, characters, or fields');
    const delim = a.values.get('d') ?? '\t';
    if (delim.length !== 1) {
      ctx.fail('the delimiter must be a single character');
      ctx.err("Try 'cut --help' for more information.\n");
      return 1;
    }
    const sel = parseList((fields ?? chars)!);
    if (!sel) {
      ctx.fail(`invalid ${fields ? 'field' : 'byte/character'} value ${q((fields ?? chars)!)}`);
      ctx.err("Try 'cut --help' for more information.\n");
      return 1;
    }
    let out = '';
    const ok = eachInput(ctx, a.operands, (text) => {
      for (const line of lines(text)) {
        if (chars) {
          out += [...line].filter((_, i) => sel(i + 1)).join('') + '\n';
        } else {
          if (!line.includes(delim)) {
            if (!a.flags.has('s')) out += line + '\n';
            continue;
          }
          out += line.split(delim).filter((_, i) => sel(i + 1)).join(delim) + '\n';
        }
      }
    });
    ctx.out(out);
    return ok ? 0 : 1;
  },
};

// ---------------------------------------------------------------- tr

function expandSet(spec: string): string[] {
  const classes: Record<string, string> = {
    lower: 'abcdefghijklmnopqrstuvwxyz',
    upper: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
    digit: '0123456789',
    alpha: 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ',
    alnum: '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ',
    space: ' \t\n\r\f\v',
    blank: ' \t',
    punct: '!"#$%&\'()*+,-./:;<=>?@[\\]^_`{|}~',
  };
  const chars: string[] = [];
  const unesc = (s: string, i: number): [string, number] => {
    if (s[i] === '\\' && i + 1 < s.length) {
      const n = s[i + 1]!;
      const map: Record<string, string> = { n: '\n', t: '\t', r: '\r', '\\': '\\' };
      return [map[n] ?? n, i + 2];
    }
    return [s[i]!, i + 1];
  };
  let i = 0;
  while (i < spec.length) {
    const cls = /^\[:([a-z]+):\]/.exec(spec.slice(i));
    if (cls && classes[cls[1]!]) {
      chars.push(...classes[cls[1]!]!);
      i += cls[0].length;
      continue;
    }
    const [c, ni] = unesc(spec, i);
    if (spec[ni] === '-' && ni + 1 < spec.length) {
      const [d, nj] = unesc(spec, ni + 1);
      for (let x = c.charCodeAt(0); x <= d.charCodeAt(0); x++) chars.push(String.fromCharCode(x));
      i = nj;
      continue;
    }
    chars.push(c);
    i = ni;
  }
  return chars;
}

export const tr: CommandDef = {
  name: 'tr',
  category: 'text',
  doc: {
    summary: 'translate or delete characters',
    usage: ['tr [OPTION]... STRING1 [STRING2]'],
    description: 'Translate, squeeze, and/or delete characters from standard input, writing to standard output. Sets may use ranges (a-z) and classes like [:upper:].',
    options: [
      ['-d, --delete', 'delete characters in STRING1, do not translate'],
      ['-s, --squeeze-repeats', 'replace each sequence of a repeated character with a single occurrence'],
      ['-c, --complement', 'use the complement of STRING1'],
    ],
    examples: [
      ["tr a-z A-Z", 'convert to upper case'],
      ["tr -d '\\r'", 'remove Windows carriage returns'],
    ],
    seeAlso: ['sed'],
  },
  run(ctx) {
    const a = parseArgs(ctx.args, { flags: 'dscC', long: { delete: 'd', 'squeeze-repeats': 's', complement: 'c' } });
    const [s1, s2] = a.operands;
    if (s1 === undefined) throw new ArgError('missing operand');
    const del = a.flags.has('d');
    const squeeze = a.flags.has('s');
    if (!del && !squeeze && s2 === undefined) {
      ctx.fail(`missing operand after ${q(s1)}`);
      ctx.err('Two strings must be given when translating.\n');
      ctx.err("Try 'tr --help' for more information.\n");
      return 1;
    }
    const set1 = expandSet(s1);
    const set2 = s2 !== undefined ? expandSet(s2) : [];
    const comp = a.flags.has('c') || a.flags.has('C');
    const in1 = (ch: string) => (comp ? !set1.includes(ch) : set1.includes(ch));
    const input = ctx.stdin ?? '';
    let out = '';
    let last = '';
    for (const ch of input) {
      let c: string | null = ch;
      if (del) {
        if (in1(ch)) c = null;
      } else if (s2 !== undefined && in1(ch)) {
        if (comp) c = set2[set2.length - 1] ?? ch;
        else {
          const idx = set1.lastIndexOf(ch);
          c = set2[Math.min(idx, set2.length - 1)] ?? ch;
        }
      }
      if (c === null) continue;
      const squeezeSet = del ? set2 : s2 !== undefined ? set2 : set1;
      if (squeeze && c === last && (squeezeSet.includes(c) || (comp && !del && s2 === undefined && in1(c)))) continue;
      out += c;
      last = c;
    }
    ctx.out(out);
    return 0;
  },
};

// ---------------------------------------------------------------- tee

export const tee: CommandDef = {
  name: 'tee',
  category: 'text',
  doc: {
    summary: 'read from standard input and write to standard output and files',
    usage: ['tee [OPTION]... [FILE]...'],
    description: 'Copy standard input to each FILE, and also to standard output.',
    options: [['-a, --append', 'append to the given FILEs, do not overwrite']],
    examples: [['ls | tee list.txt', 'see the output and save it at the same time'], ["echo 'line' | sudo tee -a /etc/hosts", 'write into a root-owned file']],
    seeAlso: ['cat'],
  },
  run(ctx) {
    const a = parseArgs(ctx.args, { flags: 'ai', long: { append: 'a' } });
    const input = ctx.stdin ?? '';
    let code = 0;
    for (const f of a.operands) {
      try {
        ctx.writeFile(f, input, a.flags.has('a'));
      } catch (e) {
        if (e instanceof FsError) {
          ctx.fail(`${f}: ${e.text}`);
          code = 1;
        } else throw e;
      }
    }
    ctx.out(input);
    return code;
  },
};

// ---------------------------------------------------------------- nl / tac / rev

export const tac: CommandDef = {
  name: 'tac',
  category: 'text',
  doc: { summary: 'concatenate and print files in reverse', usage: ['tac [FILE]...'], seeAlso: ['cat'] },
  run(ctx) {
    const a = parseArgs(ctx.args, {});
    let out = '';
    const ok = eachInput(ctx, a.operands, (t) => (out += joinLines(lines(t).reverse())));
    ctx.out(out);
    return ok ? 0 : 1;
  },
};

export const nl: CommandDef = {
  name: 'nl',
  category: 'text',
  doc: { summary: 'number lines of files', usage: ['nl [FILE]...'], description: 'Write each FILE to standard output, with line numbers added to non-empty lines.', seeAlso: ['cat'] },
  run(ctx) {
    const a = parseArgs(ctx.args, { withValue: 'bsw' });
    let n = 0;
    let out = '';
    const all = a.values.get('b') === 'a';
    const ok = eachInput(ctx, a.operands, (t) => {
      for (const l of lines(t)) out += l === '' && !all ? '       \n' : `${String(++n).padStart(6)}\t${l}\n`;
    });
    ctx.out(out);
    return ok ? 0 : 1;
  },
};

export const rev: CommandDef = {
  name: 'rev',
  category: 'text',
  doc: { summary: 'reverse lines characterwise', usage: ['rev [file ...]'] },
  run(ctx) {
    let out = '';
    const ok = eachInput(ctx, ctx.args, (t) => (out += joinLines(lines(t).map((l) => [...l].reverse().join('')))));
    ctx.out(out);
    return ok ? 0 : 1;
  },
};

export const seq: CommandDef = {
  name: 'seq',
  category: 'text',
  doc: {
    summary: 'print a sequence of numbers',
    usage: ['seq [OPTION]... LAST', 'seq [OPTION]... FIRST LAST', 'seq [OPTION]... FIRST INCREMENT LAST'],
    options: [['-s, --separator=STRING', 'use STRING to separate numbers (default: \\n)']],
  },
  run(ctx) {
    const a = parseArgs(ctx.args, { flags: 'w', withValue: 's', longWithValue: { separator: 's' } });
    const nums = a.operands.map(Number);
    if (nums.length === 0 || nums.length > 3 || nums.some((n) => Number.isNaN(n))) {
      const bad = a.operands.find((o) => Number.isNaN(Number(o)));
      if (bad !== undefined) ctx.fail(`invalid floating point argument: ${q(bad)}`);
      else ctx.fail('missing operand');
      ctx.err("Try 'seq --help' for more information.\n");
      return 1;
    }
    const [first, inc, last] = nums.length === 1 ? [1, 1, nums[0]!] : nums.length === 2 ? [nums[0]!, 1, nums[1]!] : [nums[0]!, nums[1]!, nums[2]!];
    if (inc === 0) {
      ctx.fail("invalid Zero increment value: '0'");
      return 1;
    }
    const out: string[] = [];
    for (let x = first; inc > 0 ? x <= last : x >= last; x += inc) {
      out.push(String(x));
      if (out.length > 100_000) break;
    }
    const sep = a.values.get('s') ?? '\n';
    ctx.out(out.length ? out.join(sep) + '\n' : '');
    return 0;
  },
};

export const less: CommandDef = {
  name: 'less',
  category: 'files',
  doc: {
    summary: 'view file contents page by page',
    usage: ['less [FILE]...'],
    description: 'In a real terminal less opens an interactive pager (q to quit). In the trainer the whole file is printed and you can scroll the terminal.',
    seeAlso: ['more', 'cat', 'head'],
  },
  run(ctx) {
    const a = parseArgs(ctx.args, { flags: 'NSRFXim' });
    if (a.operands.length === 0 && ctx.stdin === null) {
      ctx.err('Missing filename ("less --help" for help)\n');
      return 1;
    }
    let ok = true;
    for (const f of a.operands.length ? a.operands : ['-']) {
      const r = f === '-' ? null : ctx.tryStat(f);
      if (r && r.node.type === 'dir') {
        ctx.out(`${f} is a directory\n`);
        continue;
      }
      ok = eachInput(ctx, [f], (t) => ctx.out(t)) && ok;
    }
    return ok ? 0 : 1;
  },
};

export const more: CommandDef = { ...less, name: 'more', doc: { ...less.doc, summary: 'file perusal filter for crt viewing', usage: ['more [FILE]...'] } };

export { backslashEscapes };
export type { Ctx };
