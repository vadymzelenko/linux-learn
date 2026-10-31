/**
 * Pure progress logic: XP, streaks, spaced repetition (simplified SM-2) and
 * achievements. No React, no storage — fully unit-tested.
 */
import { achievements as allAchievements, allLessons, levelFor, missions, modules } from '@linux-learn/content';
import type { ExecResult } from '@linux-learn/engine';

export type DayKey = string; // YYYY-MM-DD in local time

export function dayKey(d: Date): DayKey {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export function daysBetween(a: DayKey, b: DayKey): number {
  const pa = a.split('-').map(Number) as [number, number, number];
  const pb = b.split('-').map(Number) as [number, number, number];
  const ta = Date.UTC(pa[0], pa[1] - 1, pa[2]);
  const tb = Date.UTC(pb[0], pb[1] - 1, pb[2]);
  return Math.round((tb - ta) / 86_400_000);
}

export function addDays(d: DayKey, n: number): DayKey {
  const [y, m, day] = d.split('-').map(Number) as [number, number, number];
  return dayKey(new Date(y, m - 1, day + n));
}

// ---------------------------------------------------------------- state

export interface LessonProgress {
  completedAt?: number;
  /** Index of the step to resume from. */
  step: number;
  hints: number;
  xp: number;
}

export interface SrsCard {
  ef: number;
  interval: number;
  reps: number;
  due: DayKey;
}

export interface Streak {
  current: number;
  best: number;
  last: DayKey | null;
  freezes: number;
}

export interface Progress {
  xp: number;
  lessons: Record<string, LessonProgress>;
  missions: Record<string, { completedAt: number; hints: number }>;
  achievements: Record<string, number>;
  streak: Streak;
  daily: { last: DayKey | null; count: number };
  srs: Record<string, SrsCard>;
  stats: { commands: number; grep: number; pipes: number; sudo: number; dirs: string[] };
  exam: { passedAt?: number; best: number };
  lastReviewPrompt?: number;
}

export const initialProgress = (): Progress => ({
  xp: 0,
  lessons: {},
  missions: {},
  achievements: {},
  streak: { current: 0, best: 0, last: null, freezes: 0 },
  daily: { last: null, count: 0 },
  srs: {},
  stats: { commands: 0, grep: 0, pipes: 0, sudo: 0, dirs: [] },
  exam: { best: 0 },
});

// ---------------------------------------------------------------- XP

/** Reward for a solved task after hints: each hint level takes a third. */
export function rewardAfterHints(base: number, hintsUsed: number): number {
  const factor = [1, 0.66, 0.33, 0.1][Math.min(hintsUsed, 3)]!;
  return Math.max(1, Math.round(base * factor));
}

// ---------------------------------------------------------------- streak

/**
 * Register activity on `today`. A missed single day is covered by a freeze
 * if one is available. Returns the new streak and what happened.
 */
export function touchStreak(s: Streak, today: DayKey): { streak: Streak; event: 'same' | 'kept' | 'frozen' | 'reset' | 'started' } {
  if (s.last === today) return { streak: s, event: 'same' };
  if (s.last === null) return { streak: { ...s, current: 1, best: Math.max(s.best, 1), last: today }, event: 'started' };
  const gap = daysBetween(s.last, today);
  if (gap === 1) {
    const current = s.current + 1;
    return { streak: { ...s, current, best: Math.max(s.best, current), last: today }, event: 'kept' };
  }
  if (gap === 2 && s.freezes > 0) {
    const current = s.current + 1;
    return { streak: { ...s, current, best: Math.max(s.best, current), last: today, freezes: s.freezes - 1 }, event: 'frozen' };
  }
  if (gap <= 0) return { streak: s, event: 'same' }; // clock went backwards
  return { streak: { ...s, current: 1, last: today }, event: 'reset' };
}

/** Is the streak still alive (for display) on `today`? */
export function liveStreak(s: Streak, today: DayKey): number {
  if (!s.last) return 0;
  const gap = daysBetween(s.last, today);
  if (gap <= 1) return s.current;
  if (gap === 2 && s.freezes > 0) return s.current;
  return 0;
}

// ---------------------------------------------------------------- SRS (simplified SM-2)

/**
 * quality: 5 = perfect, 4 = correct after a small hesitation,
 * 3 = correct with hints, < 3 = failed.
 */
export function reviewCard(card: SrsCard | undefined, quality: number, today: DayKey): SrsCard {
  const c = card ?? { ef: 2.5, interval: 0, reps: 0, due: today };
  const q = Math.max(0, Math.min(5, quality));
  if (q < 3) return { ef: Math.max(1.3, c.ef - 0.2), interval: 1, reps: 0, due: addDays(today, 1) };
  const ef = Math.max(1.3, c.ef + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02)));
  const reps = c.reps + 1;
  const interval = reps === 1 ? 1 : reps === 2 ? 6 : Math.round(c.interval * ef);
  return { ef, interval, reps, due: addDays(today, interval) };
}

export function dueCards(srs: Record<string, SrsCard>, today: DayKey): string[] {
  return Object.entries(srs)
    .filter(([, c]) => daysBetween(c.due, today) >= 0)
    .sort((a, b) => (a[1].due < b[1].due ? -1 : 1))
    .map(([k]) => k);
}

/** After a task: commands where the user struggled go into the review deck. */
export function scheduleStruggles(srs: Record<string, SrsCard>, commands: string[], hintsUsed: number, mistakes: number, today: DayKey) {
  if (hintsUsed === 0 && mistakes === 0) return srs;
  const next = { ...srs };
  for (const cmd of commands) next[cmd] = reviewCard(next[cmd], hintsUsed > 1 ? 1 : 2, today);
  return next;
}

// ---------------------------------------------------------------- stats & achievements

export function recordExec(stats: Progress['stats'], line: string, result: ExecResult, cwd: string): Progress['stats'] {
  const names = result.executed.map((e) => e.name);
  const dirs = stats.dirs.includes(cwd) || stats.dirs.length >= 50 ? stats.dirs : [...stats.dirs, cwd];
  return {
    commands: stats.commands + (line.trim() ? 1 : 0),
    grep: stats.grep + names.filter((n) => n === 'grep').length,
    pipes: stats.pipes + (/[^|]\|[^|]/.test(` ${line} `) && result.exitCode === 0 ? 1 : 0),
    sudo: stats.sudo + names.filter((n) => n === 'sudo').length + (result.executed.some((e) => e.sudo) && !names.includes('sudo') ? 1 : 0),
    dirs,
  };
}

export function moduleCompleted(p: Progress, moduleId: string): boolean {
  const m = modules.find((x) => x.id === moduleId);
  return !!m && m.lessons.every((l) => p.lessons[l.id]?.completedAt);
}

export function lessonUnlocked(p: Progress, lessonId: string): boolean {
  const ref = allLessons.find((l) => l.lesson.id === lessonId);
  if (!ref) return false;
  if (ref.globalIndex === 0) return true;
  // a lesson opens when the previous lesson is completed (modules are branches of one path)
  const prev = allLessons[ref.globalIndex - 1]!;
  return !!p.lessons[prev.lesson.id]?.completedAt || !!p.lessons[lessonId];
}

export function nextLesson(p: Progress) {
  return allLessons.find((l) => !p.lessons[l.lesson.id]?.completedAt);
}

export interface AchievementContext {
  now: Date;
  events?: ExecResult['events'];
  hintsInModule?: Record<string, number>;
}

/** Ids of achievements that are earned now but not yet recorded. */
export function newAchievements(p: Progress, ctx: AchievementContext): string[] {
  const has = (id: string) => id in p.achievements;
  const out: string[] = [];
  const add = (id: string, cond: boolean) => {
    if (cond && !has(id) && allAchievements.some((a) => a.id === id)) out.push(id);
  };
  const lessonsDone = Object.values(p.lessons).filter((l) => l.completedAt).length;
  const missionsDone = Object.keys(p.missions).length;
  add('first-command', p.stats.commands > 0);
  add('first-lesson', lessonsDone > 0);
  add('first-pipe', p.stats.pipes > 0);
  add('grep-master', p.stats.grep >= 25);
  add('sudo-user', p.stats.sudo > 0);
  add('explorer', p.stats.dirs.length >= 10);
  add('module-done', modules.some((m) => moduleCompleted(p, m.id)));
  add('all-modules', modules.every((m) => moduleCompleted(p, m.id)));
  add(
    'no-hints-module',
    modules.some((m) => moduleCompleted(p, m.id) && m.lessons.every((l) => (p.lessons[l.id]?.hints ?? 1) === 0)),
  );
  add('first-mission', missionsDone > 0);
  add('all-missions', missionsDone >= missions.length);
  add('streak-3', p.streak.best >= 3);
  add('streak-7', p.streak.best >= 7);
  add('daily-challenge', p.daily.count > 0);
  add('level-root', levelFor(p.xp).id === 'root');
  add('exam-passed', !!p.exam.passedAt);
  for (const e of ctx.events ?? []) {
    if (e.type === 'easterEgg' && (e.id === 'rm-rf-root' || e.id === 'sudo-rm-rf-root')) add('rm-rf-root', true);
    if (e.type === 'easterEgg' && e.id === 'fork-bomb') add('fork-bomb', true);
  }
  return out;
}

export function nightOwl(now: Date): boolean {
  return now.getHours() < 4;
}
