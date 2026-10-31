/** Minimal SGR parser for rendering terminal output in the UI. */

export interface AnsiStyle {
  fg?: number; // 0-7 base, 8-15 bright
  bg?: number;
  bold?: boolean;
}

export interface AnsiSpan {
  text: string;
  style: AnsiStyle;
}

export interface ParsedAnsi {
  spans: AnsiSpan[];
  /** Index of the last screen-clear sequence (text before it should be dropped). */
  cleared: boolean;
}

// eslint-disable-next-line no-control-regex
const SEQ = /\x1b\[([0-9;?]*)([A-Za-z])/g;

export function parseAnsi(input: string, initial: AnsiStyle = {}): ParsedAnsi {
  let style: AnsiStyle = { ...initial };
  const spans: AnsiSpan[] = [];
  let cleared = false;
  let last = 0;
  const push = (text: string) => {
    if (!text) return;
    const prev = spans[spans.length - 1];
    if (prev && prev.style.fg === style.fg && prev.style.bg === style.bg && prev.style.bold === style.bold) prev.text += text;
    else spans.push({ text, style: { ...style } });
  };
  for (const m of input.matchAll(SEQ)) {
    push(input.slice(last, m.index));
    last = m.index! + m[0].length;
    const [, params = '', cmd] = m;
    if (cmd === 'J' && (params === '2' || params === '3')) {
      spans.length = 0;
      cleared = true;
      continue;
    }
    if (cmd !== 'm') continue;
    const codes = params === '' ? [0] : params.split(';').map(Number);
    for (const c of codes) {
      if (c === 0) style = {};
      else if (c === 1) style.bold = true;
      else if (c === 22) style.bold = false;
      else if (c >= 30 && c <= 37) style.fg = c - 30;
      else if (c === 39) delete style.fg;
      else if (c >= 40 && c <= 47) style.bg = c - 40;
      else if (c === 49) delete style.bg;
      else if (c >= 90 && c <= 97) style.fg = c - 90 + 8;
    }
  }
  push(input.slice(last));
  return { spans, cleared };
}
