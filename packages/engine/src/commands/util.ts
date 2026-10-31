import type { FsNode } from '../types';
import { FsError } from '../vfs/fs';
import type { Ctx } from '../shell/context';

export const ESC = '\x1b';
export const C = {
  reset: `${ESC}[0m`,
  dir: `${ESC}[01;34m`,
  link: `${ESC}[01;36m`,
  exec: `${ESC}[01;32m`,
  archive: `${ESC}[01;31m`,
  image: `${ESC}[01;35m`,
  orphan: `${ESC}[40;31;01m`,
  stickyOtherWritable: `${ESC}[30;42m`,
  otherWritable: `${ESC}[34;42m`,
  grepMatch: `${ESC}[01;31m${ESC}[K`,
  grepFile: `${ESC}[35m${ESC}[K`,
  grepLine: `${ESC}[32m${ESC}[K`,
  grepSep: `${ESC}[36m${ESC}[K`,
  grepEnd: `${ESC}[m${ESC}[K`,
};

const ARCHIVE_EXT = /\.(tar|tgz|gz|zip|bz2|xz|7z|rar|deb|rpm|jar|zst)$/i;
const IMAGE_EXT = /\.(png|jpe?g|gif|bmp|svg|webp|tiff?|ico|mp4|mkv|avi|mov|webm|mp3|flac|ogg|wav)$/i;

/** GNU ls default LS_COLORS (subset). */
export function colorFor(node: FsNode, name: string, dangling = false): string | null {
  if (node.type === 'dir') {
    if ((node.mode & 0o1002) === 0o1002) return C.stickyOtherWritable;
    if (node.mode & 0o002) return C.otherWritable;
    return C.dir;
  }
  if (node.type === 'symlink') return dangling ? C.orphan : C.link;
  if (node.mode & 0o111) return C.exec;
  if (ARCHIVE_EXT.test(name)) return C.archive;
  if (IMAGE_EXT.test(name)) return C.image;
  return null;
}

export function paint(text: string, color: string | null): string {
  return color ? `${color}${text}${C.reset}` : text;
}

/** Strip ANSI escape sequences. */
export function stripAnsi(s: string): string {
  // eslint-disable-next-line no-control-regex
  return s.replace(/\x1b\[[0-9;?]*[A-Za-z]/g, '');
}

/** Quote a file name the way `ls` does on a terminal (shell-escape style). */
export function lsQuote(name: string): string {
  if (/^[A-Za-z0-9_.,+:@%/=-]+$/.test(name) && !name.startsWith('~')) return name;
  if (!name.includes("'")) return `'${name}'`;
  if (!/["$`\\!]/.test(name)) return `"${name}"`;
  return `'${name.replace(/'/g, `'\\''`)}'`;
}

export function needsQuote(name: string): boolean {
  return lsQuote(name) !== name;
}

/** Mode string like `drwxr-xr-x`. */
export function modeString(node: FsNode): string {
  const t = node.type === 'dir' ? 'd' : node.type === 'symlink' ? 'l' : '-';
  const m = node.mode;
  const rwx = (bits: number, special: boolean, ch: string) =>
    (bits & 4 ? 'r' : '-') +
    (bits & 2 ? 'w' : '-') +
    (special ? (bits & 1 ? ch : ch.toUpperCase()) : bits & 1 ? 'x' : '-');
  return (
    t +
    rwx((m >> 6) & 7, (m & 0o4000) !== 0, 's') +
    rwx((m >> 3) & 7, (m & 0o2000) !== 0, 's') +
    rwx(m & 7, (m & 0o1000) !== 0, 't')
  );
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS_LONG = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const DAYS_LONG = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const SIX_MONTHS = (365.2425 * 24 * 3600 * 1000) / 2;

const p2 = (n: number) => String(n).padStart(2, '0');

/** `ls -l` timestamp (UTC). */
export function lsTime(mtime: number, now: number): string {
  const d = new Date(mtime);
  const mon = MONTHS[d.getUTCMonth()]!;
  const day = String(d.getUTCDate()).padStart(2, ' ');
  if (now - mtime > SIX_MONTHS || mtime - now > 60_000) return `${mon} ${day}  ${d.getUTCFullYear()}`;
  return `${mon} ${day} ${p2(d.getUTCHours())}:${p2(d.getUTCMinutes())}`;
}

/** `date` default format, UTC. */
export function dateString(ms: number): string {
  const d = new Date(ms);
  return `${DAYS[d.getUTCDay()]} ${MONTHS[d.getUTCMonth()]} ${String(d.getUTCDate()).padStart(2, ' ')} ${p2(d.getUTCHours())}:${p2(d.getUTCMinutes())}:${p2(d.getUTCSeconds())} UTC ${d.getUTCFullYear()}`;
}

export function strftime(fmt: string, ms: number): string {
  const d = new Date(ms);
  return fmt.replace(/%([a-zA-Z%])/g, (_m, c: string) => {
    switch (c) {
      case 'Y': return String(d.getUTCFullYear());
      case 'y': return p2(d.getUTCFullYear() % 100);
      case 'm': return p2(d.getUTCMonth() + 1);
      case 'd': return p2(d.getUTCDate());
      case 'e': return String(d.getUTCDate()).padStart(2, ' ');
      case 'H': return p2(d.getUTCHours());
      case 'M': return p2(d.getUTCMinutes());
      case 'S': return p2(d.getUTCSeconds());
      case 'F': return `${d.getUTCFullYear()}-${p2(d.getUTCMonth() + 1)}-${p2(d.getUTCDate())}`;
      case 'T': return `${p2(d.getUTCHours())}:${p2(d.getUTCMinutes())}:${p2(d.getUTCSeconds())}`;
      case 'R': return `${p2(d.getUTCHours())}:${p2(d.getUTCMinutes())}`;
      case 'D': return `${p2(d.getUTCMonth() + 1)}/${p2(d.getUTCDate())}/${p2(d.getUTCFullYear() % 100)}`;
      case 'a': return DAYS[d.getUTCDay()]!;
      case 'A': return DAYS_LONG[d.getUTCDay()]!;
      case 'b': case 'h': return MONTHS[d.getUTCMonth()]!;
      case 'B': return MONTHS_LONG[d.getUTCMonth()]!;
      case 'j': {
        const start = Date.UTC(d.getUTCFullYear(), 0, 1);
        return String(Math.floor((ms - start) / 86_400_000) + 1).padStart(3, '0');
      }
      case 'u': return String(d.getUTCDay() || 7);
      case 'w': return String(d.getUTCDay());
      case 's': return String(Math.floor(ms / 1000));
      case 'Z': return 'UTC';
      case 'z': return '+0000';
      case 'n': return '\n';
      case 't': return '\t';
      case '%': return '%';
      default: return `%${c}`;
    }
  });
}

/** GNU human-readable size (ls -h, du -h, df -h): powers of 1024, rounded up. */
export function humanSize(bytes: number): string {
  if (bytes < 1024) return String(bytes);
  const units = ['K', 'M', 'G', 'T', 'P'];
  let v = bytes;
  let i = -1;
  do {
    v /= 1024;
    i++;
  } while (v >= 1024 && i < units.length - 1);
  if (v < 10) {
    const r = Math.ceil(v * 10) / 10;
    if (r < 10) return `${r.toFixed(1)}${units[i]}`;
    v = r;
  }
  let n = Math.ceil(v);
  if (n >= 1024 && i < units.length - 1) {
    return `1.0${units[i + 1]}`;
  }
  return `${n}${units[i]}`;
}

/** Layout names in columns like GNU ls (vertical order). `widths` are display widths. */
export function columnize(items: string[], widths: number[], lineWidth: number): string {
  const n = items.length;
  if (n === 0) return '';
  let best = { cols: 1, rows: n, colW: [Math.max(...widths)] };
  for (let cols = n; cols >= 1; cols--) {
    const rows = Math.ceil(n / cols);
    const realCols = Math.ceil(n / rows);
    const colW: number[] = [];
    for (let c = 0; c < realCols; c++) {
      let w = 0;
      for (let r = 0; r < rows; r++) {
        const idx = c * rows + r;
        if (idx < n) w = Math.max(w, widths[idx]!);
      }
      colW.push(w);
    }
    const total = colW.reduce((a, b) => a + b, 0) + 2 * (realCols - 1);
    if (total <= lineWidth || cols === 1) {
      best = { cols: realCols, rows, colW };
      break;
    }
  }
  const lines: string[] = [];
  for (let r = 0; r < best.rows; r++) {
    let line = '';
    for (let c = 0; c < best.cols; c++) {
      const idx = c * best.rows + r;
      if (idx >= n) continue;
      const isLast = c === best.cols - 1 || (c + 1) * best.rows + r >= n;
      line += items[idx]!;
      if (!isLast) line += ' '.repeat(best.colW[c]! - widths[idx]! + 2);
    }
    lines.push(line);
  }
  return lines.join('\n') + '\n';
}

/** GNU `quote()` in a UTF-8 locale: ‘text’ (used in many coreutils messages). */
export function q(s: string): string {
  return `\u2018${s}\u2019`;
}

/** Error helper: `cmd: cannot <action> 'path': <errno text>` */
export function cannot(ctx: Ctx, action: string, path: string, e: unknown): void {
  if (e instanceof FsError) ctx.fail(`cannot ${action} '${path}': ${e.text}`);
  else throw e;
}

/** Split text into lines, ignoring the final trailing newline. */
export function lines(text: string): string[] {
  if (text === '') return [];
  const arr = text.split('\n');
  if (arr[arr.length - 1] === '') arr.pop();
  return arr;
}

export function joinLines(arr: string[]): string {
  return arr.length ? arr.join('\n') + '\n' : '';
}

/**
 * Read input files (or stdin if none / "-"). Calls `each` for every
 * readable input, prints GNU-style errors for the rest. Returns false on any error.
 */
export function eachInput(ctx: Ctx, files: string[], each: (text: string, name: string) => void): boolean {
  let ok = true;
  const list = files.length ? files : ['-'];
  for (const f of list) {
    if (f === '-') {
      each(ctx.stdin ?? '', '-');
      continue;
    }
    try {
      each(ctx.readFile(f), f);
    } catch (e) {
      if (e instanceof FsError) {
        ctx.fail(`${f}: ${e.text}`);
        ok = false;
      } else throw e;
    }
  }
  return ok;
}

/** Parse a GNU numeric argument, printing an error if invalid. */
export function parseCount(ctx: Ctx, v: string, what: string): number | null {
  if (!/^[+-]?\d+$/.test(v)) {
    ctx.fail(`invalid number of ${what}: ${q(v)}`);
    return null;
  }
  return Math.abs(parseInt(v, 10));
}

/** Convert POSIX bracket classes to JS. */
export function posixClasses(re: string): string {
  return re
    .replace(/\[:alpha:\]/g, 'A-Za-z')
    .replace(/\[:digit:\]/g, '0-9')
    .replace(/\[:alnum:\]/g, 'A-Za-z0-9')
    .replace(/\[:upper:\]/g, 'A-Z')
    .replace(/\[:lower:\]/g, 'a-z')
    .replace(/\[:space:\]/g, ' \\t\\n\\r\\f\\v')
    .replace(/\[:blank:\]/g, ' \\t')
    .replace(/\[:punct:\]/g, '!-\\/:-@\\[-`{-~')
    .replace(/\[:xdigit:\]/g, '0-9A-Fa-f');
}

/** Translate a POSIX basic regular expression into a JS RegExp source. */
export function breToJs(src: string): string {
  let out = '';
  for (let i = 0; i < src.length; i++) {
    const c = src[i]!;
    if (c === '\\' && i + 1 < src.length) {
      const n = src[++i]!;
      if ('|+?(){}'.includes(n)) out += n;
      else if (n === '<' || n === '>') out += '\\b';
      else out += '\\' + n;
      continue;
    }
    if ('|+?(){}'.includes(c)) {
      out += '\\' + c;
      continue;
    }
    if (c === '[') {
      // copy bracket expression verbatim
      let j = i + 1;
      if (src[j] === '^') j++;
      if (src[j] === ']') j++;
      while (j < src.length && src[j] !== ']') {
        if (src[j] === '[' && src[j + 1] === ':') {
          const end = src.indexOf(':]', j + 2);
          if (end !== -1) j = end + 2;
          else j++;
        } else j++;
      }
      out += posixClasses(src.slice(i, j + 1));
      i = j;
      continue;
    }
    if (c === '*' && (out === '' || out.endsWith('^'))) {
      out += '\\*';
      continue;
    }
    out += c;
  }
  return out;
}

export function ereToJs(src: string): string {
  let out = '';
  for (let i = 0; i < src.length; i++) {
    const c = src[i]!;
    if (c === '\\' && i + 1 < src.length) {
      const n = src[++i]!;
      out += n === '<' || n === '>' ? '\\b' : '\\' + n;
      continue;
    }
    if (c === '[') {
      let j = i + 1;
      if (src[j] === '^') j++;
      if (src[j] === ']') j++;
      while (j < src.length && src[j] !== ']') {
        if (src[j] === '[' && src[j + 1] === ':') {
          const end = src.indexOf(':]', j + 2);
          j = end !== -1 ? end + 2 : j + 1;
        } else j++;
      }
      out += posixClasses(src.slice(i, j + 1));
      i = j;
      continue;
    }
    out += c;
  }
  return out;
}

export function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&');
}

/** Safe RegExp construction; returns an error string on invalid pattern. */
export function makeRegExp(source: string, flags: string): RegExp | string {
  try {
    return new RegExp(source, flags);
  } catch (e) {
    return e instanceof Error ? e.message : 'invalid regular expression';
  }
}
