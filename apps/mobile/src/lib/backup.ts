/**
 * Backup of learning progress and settings: one JSON document that moves
 * between devices (phone → computer and back) as a file or as copied text.
 * Pure functions only: building, validating and merging are unit-tested.
 */
import { isSession, migrateSession, type Session } from '@linux-learn/engine';
import { initialProgress, type Progress } from './progress';

export const BACKUP_APP = 'linux-terminal-trainer';
export const BACKUP_FORMAT = 1;

export interface BackupMachine {
  id: string;
  name: string;
  template: string;
  session: Session;
  createdAt: number;
}

export interface Backup {
  app: typeof BACKUP_APP;
  format: number;
  exportedAt: string;
  /** Platform the backup was made on ("android", "web", …) — shown on import. */
  from?: string;
  settings: Record<string, unknown>;
  progress: Progress;
  sandbox?: { machines: BackupMachine[]; activeId: string | null };
}

/** Settings that belong to one device and are never copied to another. */
const DEVICE_ONLY = ['onboarded', 'reminders', 'reminderHour'] as const;
const DEVICE_ONLY_KEYBOARD = ['mode'] as const;

export function buildBackup(state: { settings: object; progress: Progress; sandbox: { machines: BackupMachine[]; activeId: string | null } }, from: string, now = new Date()): Backup {
  return {
    app: BACKUP_APP,
    format: BACKUP_FORMAT,
    exportedAt: now.toISOString(),
    from,
    settings: { ...(state.settings as Record<string, unknown>) },
    progress: state.progress,
    sandbox: state.sandbox,
  };
}

export function backupFileName(now = new Date()): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `linux-trainer-backup-${now.getFullYear()}-${p(now.getMonth() + 1)}-${p(now.getDate())}.json`;
}

export type ParseResult = { ok: true; backup: Backup } | { ok: false; error: 'empty' | 'json' | 'foreign' | 'newer' | 'broken' };

const isObj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
const num = (v: unknown, d = 0) => (typeof v === 'number' && Number.isFinite(v) ? v : d);

/** Read a backup from text (file contents or pasted). Tolerates surrounding text from messengers. */
export function parseBackup(text: string): ParseResult {
  const raw = text.trim();
  if (!raw) return { ok: false, error: 'empty' };
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    // pasted together with other text: take the outermost {...}
    const a = raw.indexOf('{');
    const b = raw.lastIndexOf('}');
    if (a < 0 || b <= a) return { ok: false, error: 'json' };
    try {
      data = JSON.parse(raw.slice(a, b + 1));
    } catch {
      return { ok: false, error: 'json' };
    }
  }
  if (!isObj(data) || data.app !== BACKUP_APP) return { ok: false, error: 'foreign' };
  if (num(data.format) > BACKUP_FORMAT) return { ok: false, error: 'newer' };
  if (!isObj(data.progress) || !isObj(data.settings)) return { ok: false, error: 'broken' };
  const progress = sanitizeProgress(data.progress);
  const machines = (isObj(data.sandbox) && Array.isArray(data.sandbox.machines) ? data.sandbox.machines : [])
    .filter((m): m is BackupMachine => isObj(m) && typeof m.id === 'string' && isSession(m.session))
    .map((m) => ({ id: m.id, name: String(m.name ?? 'machine').slice(0, 24), template: String(m.template ?? 'empty-home'), createdAt: num(m.createdAt, Date.now()), session: migrateSession(m.session) }));
  const activeId = isObj(data.sandbox) && typeof data.sandbox.activeId === 'string' ? data.sandbox.activeId : null;
  return {
    ok: true,
    backup: {
      app: BACKUP_APP,
      format: num(data.format, 1),
      exportedAt: typeof data.exportedAt === 'string' ? data.exportedAt : '',
      ...(typeof data.from === 'string' ? { from: data.from } : {}),
      settings: data.settings,
      progress,
      sandbox: { machines, activeId },
    },
  };
}

/** Keep only well-formed fields; anything missing gets its default. */
export function sanitizeProgress(p: Record<string, unknown>): Progress {
  const base = initialProgress();
  const rec = <T>(v: unknown, ok: (x: unknown) => x is T): Record<string, T> => (isObj(v) ? (Object.fromEntries(Object.entries(v).filter(([, x]) => ok(x))) as Record<string, T>) : {});
  const lessonOk = (x: unknown): x is Progress['lessons'][string] => isObj(x) && typeof x.step === 'number';
  const missionOk = (x: unknown): x is Progress['missions'][string] => isObj(x) && typeof x.completedAt === 'number';
  const numOk = (x: unknown): x is number => typeof x === 'number';
  const cardOk = (x: unknown): x is Progress['srs'][string] => isObj(x) && typeof x.due === 'string' && typeof x.ef === 'number';
  const streak = isObj(p.streak) ? p.streak : {};
  const stats = isObj(p.stats) ? p.stats : {};
  const exam = isObj(p.exam) ? p.exam : {};
  const daily = isObj(p.daily) ? p.daily : {};
  return {
    ...base,
    xp: Math.max(0, num(p.xp)),
    lessons: Object.fromEntries(Object.entries(rec(p.lessons, lessonOk)).map(([k, l]) => [k, { step: num(l.step), hints: num(l.hints), xp: num(l.xp), ...(typeof l.completedAt === 'number' ? { completedAt: l.completedAt } : {}) }])),
    missions: rec(p.missions, missionOk),
    achievements: rec(p.achievements, numOk),
    practice: rec(p.practice, numOk),
    srs: rec(p.srs, cardOk),
    streak: { current: num(streak.current), best: num(streak.best), last: typeof streak.last === 'string' ? streak.last : null, freezes: Math.min(2, num(streak.freezes)) },
    daily: { last: typeof daily.last === 'string' ? daily.last : null, count: num(daily.count) },
    stats: {
      commands: num(stats.commands),
      grep: num(stats.grep),
      pipes: num(stats.pipes),
      sudo: num(stats.sudo),
      dirs: Array.isArray(stats.dirs) ? stats.dirs.filter((d): d is string => typeof d === 'string').slice(0, 500) : [],
    },
    exam: { best: num(exam.best), ...(typeof exam.passedAt === 'number' ? { passedAt: exam.passedAt } : {}) },
    ...(typeof p.lastReviewPrompt === 'number' ? { lastReviewPrompt: p.lastReviewPrompt } : {}),
  };
}

const minDefined = (a?: number, b?: number) => (a === undefined ? b : b === undefined ? a : Math.min(a, b));

/**
 * Combine two progress records (learning on both devices): everything solved
 * on either side stays solved, counters take the larger value.
 */
export function mergeProgress(a: Progress, b: Progress): Progress {
  const lessons: Progress['lessons'] = { ...a.lessons };
  for (const [id, l] of Object.entries(b.lessons)) {
    const m = lessons[id];
    if (!m) {
      lessons[id] = l;
      continue;
    }
    const completedAt = minDefined(m.completedAt, l.completedAt);
    lessons[id] = { step: completedAt ? 0 : Math.max(m.step, l.step), hints: Math.max(m.hints, l.hints), xp: Math.max(m.xp, l.xp), ...(completedAt ? { completedAt } : {}) };
  }
  const minRec = (x: Record<string, number>, y: Record<string, number>) => {
    const out = { ...x };
    for (const [k, v] of Object.entries(y)) out[k] = Math.min(out[k] ?? v, v);
    return out;
  };
  const srs = { ...a.srs };
  for (const [k, c] of Object.entries(b.srs)) if (!srs[k] || c.reps > srs[k]!.reps) srs[k] = c;
  const lastA = a.streak.last ?? '';
  const lastB = b.streak.last ?? '';
  const newer = lastB > lastA ? b.streak : a.streak;
  const passedAt = minDefined(a.exam.passedAt, b.exam.passedAt);
  return {
    ...a,
    xp: Math.max(a.xp, b.xp),
    lessons,
    missions: { ...b.missions, ...a.missions },
    achievements: minRec(a.achievements, b.achievements),
    practice: minRec(a.practice ?? {}, b.practice ?? {}),
    srs,
    streak: { ...newer, best: Math.max(a.streak.best, b.streak.best), freezes: Math.max(a.streak.freezes, b.streak.freezes) },
    stats: {
      commands: Math.max(a.stats.commands, b.stats.commands),
      grep: Math.max(a.stats.grep, b.stats.grep),
      pipes: Math.max(a.stats.pipes, b.stats.pipes),
      sudo: Math.max(a.stats.sudo, b.stats.sudo),
      dirs: [...new Set([...a.stats.dirs, ...b.stats.dirs])].slice(0, 500),
    },
    exam: { best: Math.max(a.exam.best, b.exam.best), ...(passedAt ? { passedAt } : {}) },
  };
}

/** Settings from a backup applied on this device: device-only ones stay as they are. */
export function importSettings<S extends object>(current: S, incoming: Record<string, unknown>): S {
  const out: Record<string, unknown> = { ...(current as Record<string, unknown>) };
  for (const [k, v] of Object.entries(incoming)) {
    if ((DEVICE_ONLY as readonly string[]).includes(k) || !(k in out) || v === undefined || v === null) continue;
    if (k === 'keyboard' && isObj(v) && isObj(out.keyboard)) {
      const kb: Record<string, unknown> = { ...out.keyboard };
      for (const [kk, vv] of Object.entries(v)) if (!(DEVICE_ONLY_KEYBOARD as readonly string[]).includes(kk) && kk in kb && typeof vv === typeof kb[kk]) kb[kk] = vv;
      out.keyboard = kb;
      continue;
    }
    if (typeof v === typeof out[k]) out[k] = v;
  }
  return out as S;
}

/** Short human summary for the confirmation sheet. */
export function backupSummary(b: Backup) {
  return {
    lessons: Object.values(b.progress.lessons).filter((l) => l.completedAt).length,
    xp: b.progress.xp,
    machines: b.sandbox?.machines.length ?? 0,
    date: b.exportedAt ? b.exportedAt.slice(0, 10) : '',
  };
}
