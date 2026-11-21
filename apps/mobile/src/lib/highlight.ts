/**
 * Display-only colouring for the terminal (like fish / zsh-syntax-highlighting):
 * a typed command line is split into commands, flags, strings, paths,
 * variables and operators; help / man output gets its options highlighted.
 * Colours come from the theme's ANSI palette, so every theme looks right.
 */
export type HlKind = 'cmd' | 'flag' | 'string' | 'path' | 'var' | 'op' | 'num' | 'comment' | 'text';

export interface HlSpan {
  text: string;
  kind: HlKind;
}

const OPS = new Set(['|', '||', '&&', ';', '&', '>', '>>', '<', '2>', '2>>', '2>&1', '&>', '|&']);
const KEYWORDS = new Set(['for', 'in', 'do', 'done', 'if', 'then', 'else', 'elif', 'fi', 'while', 'until', 'case', 'esac']);

/** Split a command line into coloured spans (whitespace kept as text). */
export function highlightCommand(line: string): HlSpan[] {
  const out: HlSpan[] = [];
  const re = /(\s+)|(#.*$)|("(?:[^"\\]|\\.)*"?|'[^']*'?)|(2>&1|2>>|2>|&>|\|&|\|\||&&|>>|[|;&<>])|([^\s|;&<>"']+)/g;
  let expectCmd = true;
  let m: RegExpExecArray | null;
  while ((m = re.exec(line))) {
    const [tok, ws, comment, str, op, word] = m;
    if (ws) out.push({ text: ws, kind: 'text' });
    else if (comment) out.push({ text: comment, kind: 'comment' });
    else if (str) {
      out.push({ text: str, kind: 'string' });
      expectCmd = false;
    } else if (op) {
      out.push({ text: op, kind: 'op' });
      if (!op.includes('>') && op !== '<') expectCmd = true;
    } else if (word) {
      let kind: HlKind;
      if (KEYWORDS.has(word)) {
        kind = 'op';
        expectCmd = word !== 'in';
      } else if (expectCmd && /^\w+=/.test(word)) kind = 'var';
      else if (expectCmd) {
        kind = 'cmd';
        expectCmd = word === 'sudo' || word === 'xargs' || word === 'time';
      } else if (/^-/.test(word) && word.length > 1) kind = 'flag';
      else if (/^\$/.test(word)) kind = 'var';
      else if (/^[~./]|\//.test(word)) kind = 'path';
      else if (/^\d+$/.test(word)) kind = 'num';
      else kind = 'text';
      out.push({ text: word, kind });
    } else out.push({ text: tok, kind: 'text' });
  }
  return out;
}

/** Help / man pages: "Usage:" headers and leading option names. Only for text without ANSI codes. */
export function highlightHelp(text: string): HlSpan[] | null {
  if (text.includes('\x1b') || !/(^|\n)(Usage:|usage:|NAME\n|SYNOPSIS)/.test(text)) return null;
  const out: HlSpan[] = [];
  const lines = text.split('\n').map((l, i, a) => (i < a.length - 1 ? l + '\n' : l));
  for (const line of lines) {
    if (!line) continue;
    const head = /^(Usage:|usage:|NAME|SYNOPSIS|DESCRIPTION|OPTIONS|EXAMPLES|SEE ALSO)(.*)$/s.exec(line);
    const opt = /^(\s{1,8})(-{1,2}[\w-]+(?:[ =][A-Z][A-Z_]*)?(?:,\s*-{1,2}[\w-]+(?:[ =][A-Z][A-Z_]*)?)*)(.*)$/s.exec(line);
    if (head) {
      out.push({ text: head[1]!, kind: 'cmd' }, { text: head[2]!, kind: 'text' });
    } else if (opt) {
      out.push({ text: opt[1]!, kind: 'text' }, { text: opt[2]!, kind: 'flag' }, { text: opt[3]!, kind: 'text' });
    } else out.push({ text: line, kind: 'text' });
  }
  return out;
}

/** ANSI colour index (into theme.term.ansi) for each kind; undefined = default text colour. */
export const HL_ANSI: Record<HlKind, number | undefined> = {
  cmd: 10,
  flag: 11,
  string: 3,
  path: 12,
  var: 14,
  op: 13,
  num: 6,
  comment: 8,
  text: undefined,
};
