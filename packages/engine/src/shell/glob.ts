/**
 * Glob patterns use bash syntax. Inside a pattern string a backslash escapes
 * the next character (that's how quoted characters are represented).
 */

export function hasGlobChars(pattern: string): boolean {
  for (let i = 0; i < pattern.length; i++) {
    const c = pattern[i];
    if (c === '\\') {
      i++;
      continue;
    }
    if (c === '*' || c === '?') return true;
    if (c === '[' && pattern.indexOf(']', i + 2) !== -1) return true;
  }
  return false;
}

export function unescapeGlob(pattern: string): string {
  return pattern.replace(/\\(.)/gs, '$1');
}

export function escapeGlob(text: string): string {
  return text.replace(/[\\*?[\]]/g, '\\$&');
}

function escapeRe(c: string): string {
  return c.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&');
}

const cache = new Map<string, RegExp>();

/** Compile one path segment (no `/`) of a glob into a RegExp. */
export function globToRegExp(pattern: string): RegExp {
  const hit = cache.get(pattern);
  if (hit) return hit;
  let re = '';
  for (let i = 0; i < pattern.length; i++) {
    const c = pattern[i]!;
    if (c === '\\' && i + 1 < pattern.length) {
      re += escapeRe(pattern[++i]!);
    } else if (c === '*') {
      re += '[^/]*';
    } else if (c === '?') {
      re += '[^/]';
    } else if (c === '[') {
      let j = i + 1;
      let negate = false;
      if (pattern[j] === '!' || pattern[j] === '^') {
        negate = true;
        j++;
      }
      // a ']' right after '[' or '[!' is literal
      let k = j;
      if (pattern[k] === ']') k++;
      while (k < pattern.length && pattern[k] !== ']') k++;
      if (k >= pattern.length) {
        re += '\\[';
        continue;
      }
      let body = '';
      for (let m = j; m < k; m++) {
        const ch = pattern[m]!;
        if (ch === '\\' && m + 1 < k) {
          body += escapeRe(pattern[++m]!);
        } else if (ch === '-' && m > j && m + 1 < k) {
          body += '-';
        } else {
          body += ch === ']' || ch === '^' || ch === '[' ? '\\' + ch : escapeRe(ch);
        }
      }
      re += `[${negate ? '^' : ''}${body}]`;
      i = k;
    } else {
      re += escapeRe(c);
    }
  }
  const compiled = new RegExp(`^${re}$`, 's');
  if (cache.size > 500) cache.clear();
  cache.set(pattern, compiled);
  return compiled;
}

export function globMatch(pattern: string, name: string): boolean {
  return globToRegExp(pattern).test(name);
}

/** Is the first character of the pattern a literal dot (so hidden files match)? */
function matchesHidden(segment: string): boolean {
  return segment.startsWith('.') || segment.startsWith('\\.');
}

export interface GlobFs {
  /** List entry names of a directory (absolute path); null if unreadable / not a dir. */
  list(absDir: string): string[] | null;
  /** Does the path exist (lstat)? */
  exists(absPath: string): boolean;
  /** Is the path a directory (following symlinks)? */
  isDir(absPath: string): boolean;
  compare(a: string, b: string): number;
}

/**
 * Expand a glob pattern into matching paths (relative patterns resolved
 * against cwd but returned relative, like bash). Returns [] on no match.
 */
export function expandGlob(pattern: string, cwd: string, fs: GlobFs): string[] {
  const absolute = pattern.startsWith('/');
  const trailingSlash = pattern.endsWith('/');
  const segments = pattern.split('/').filter((s) => s.length > 0);
  // Each candidate: [displayPath, absolutePath]
  let candidates: [string, string][] = [[absolute ? '/' : '', absolute ? '/' : cwd]];
  const joinDisp = (a: string, b: string) => (a === '' ? b : a.endsWith('/') ? a + b : `${a}/${b}`);
  const joinAbs = (a: string, b: string) => (a.endsWith('/') ? a + b : `${a}/${b}`);

  segments.forEach((seg, idx) => {
    const last = idx === segments.length - 1;
    const next: [string, string][] = [];
    for (const [disp, abs] of candidates) {
      if (!hasGlobChars(seg)) {
        const lit = unescapeGlob(seg);
        const p = joinAbs(abs, lit);
        if (last ? fs.exists(p) : fs.isDir(p)) next.push([joinDisp(disp, lit), p]);
        continue;
      }
      const names = fs.list(abs);
      if (!names) continue;
      const showHidden = matchesHidden(seg);
      const re = globToRegExp(seg);
      const matched = names
        .filter((n) => (showHidden || !n.startsWith('.')) && n !== '.' && n !== '..' && re.test(n))
        .sort(fs.compare);
      for (const n of matched) {
        const p = joinAbs(abs, n);
        if (!last && !fs.isDir(p)) continue;
        next.push([joinDisp(disp, n), p]);
      }
    }
    candidates = next;
  });

  return candidates
    .filter(([, abs]) => !trailingSlash || fs.isDir(abs))
    .map(([disp]) => (trailingSlash ? disp + '/' : disp));
}
