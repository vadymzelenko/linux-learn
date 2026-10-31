/** Lexical path helpers (no file system access). All results are absolute & normalised. */

export function splitPath(p: string): string[] {
  return p.split('/').filter((s) => s.length > 0);
}

/**
 * Lexically normalise a path: collapses `//`, resolves `.` and `..`.
 * Relative paths are resolved against `cwd`.
 */
export function normalize(path: string, cwd = '/'): string {
  const base = path.startsWith('/') ? [] : splitPath(cwd);
  const out = [...base];
  for (const seg of splitPath(path)) {
    if (seg === '.') continue;
    if (seg === '..') {
      out.pop();
      continue;
    }
    out.push(seg);
  }
  return '/' + out.join('/');
}

export function join(...parts: string[]): string {
  return normalize(parts.filter(Boolean).join('/'), '/');
}

export function dirname(p: string): string {
  if (p === '' ) return '.';
  const trimmed = p.replace(/\/+$/, '');
  if (trimmed === '') return '/';
  const idx = trimmed.lastIndexOf('/');
  if (idx === -1) return '.';
  if (idx === 0) return '/';
  return trimmed.slice(0, idx).replace(/\/+$/, '') || '/';
}

export function basename(p: string, suffix?: string): string {
  const trimmed = p.replace(/\/+$/, '');
  if (trimmed === '') return p.startsWith('/') ? '/' : '';
  let base = trimmed.slice(trimmed.lastIndexOf('/') + 1);
  if (suffix && base.endsWith(suffix) && base !== suffix) base = base.slice(0, -suffix.length);
  return base;
}

/** Replace a leading home directory with `~` (for the prompt). */
export function tildify(p: string, home: string): string {
  if (home === '/' || home === '') return p;
  if (p === home) return '~';
  if (p.startsWith(home + '/')) return '~' + p.slice(home.length);
  return p;
}

/** Expand `~` / `~/x` with the given home (used by task checks and the shell). */
export function expandTilde(p: string, home: string): string {
  if (p === '~') return home;
  if (p.startsWith('~/')) return home.replace(/\/$/, '') + p.slice(1);
  return p;
}
