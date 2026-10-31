import { createShell, evaluateChecks, run, type Check, type ExecutedCommand, type MachineSpec, type Session, type TaskEvaluation } from '@linux-learn/engine';
import type { Achievement, Challenge, ContentCheck, L10n, Lang, Lesson, Mission, Module, Step } from './schema';

import m1 from '../modules/01-navigation.json';
import m2 from '../modules/02-files.json';
import m3 from '../modules/03-text.json';
import m4 from '../modules/04-search.json';
import m5 from '../modules/05-permissions.json';
import m6 from '../modules/06-power.json';
import missionsJson from '../missions/missions.json';
import challengesJson from '../challenges/challenges.json';
import achievementsJson from '../achievements.json';

import fEmpty from '../fixtures/empty-home.json';
import fHome from '../fixtures/home-basic.json';
import fText from '../fixtures/text-files.json';
import fSearch from '../fixtures/search.json';
import fPerm from '../fixtures/permissions.json';
import fSystem from '../fixtures/system.json';

export * from './schema';

export const modules: Module[] = [m1, m2, m3, m4, m5, m6] as unknown as Module[];
export const missions: Mission[] = missionsJson as unknown as Mission[];
export const challenges: Challenge[] = challengesJson as unknown as Challenge[];
export const achievements: Achievement[] = achievementsJson as unknown as Achievement[];

export const fixtures: Record<string, MachineSpec> = {
  'empty-home': fEmpty as MachineSpec,
  'home-basic': fHome as MachineSpec,
  'text-files': fText as MachineSpec,
  search: fSearch as MachineSpec,
  permissions: fPerm as MachineSpec,
  system: fSystem as MachineSpec,
};

/** Pick the text for a language, falling back to English. */
export function tr(text: L10n | undefined, lang: Lang | string): string {
  if (!text) return '';
  return (text as Record<string, string | undefined>)[lang] ?? text.en;
}

export function resolveSetup(setup: string | Record<string, unknown> | undefined): MachineSpec {
  if (setup === undefined) return fixtures['empty-home']!;
  if (typeof setup === 'string') {
    const f = fixtures[setup];
    if (!f) throw new Error(`Unknown fixture: ${setup}`);
    return f;
  }
  return setup as MachineSpec;
}

/** Fresh session for a step: setup + silent `prepare` commands. */
export function prepareSession(setup: string | Record<string, unknown> | undefined, prepare: string[] = [], now?: number): Session {
  let s = createShell(resolveSetup(setup));
  for (const cmd of prepare) s = run(s, cmd, { now, isTTY: false }).session;
  // the prepared commands are not the user's history
  return { ...s, history: [] };
}

export function evaluateTask(
  checks: ContentCheck[],
  session: Session,
  executed: ExecutedCommand[],
  lastOutput: string,
  lastExitCode: number,
): TaskEvaluation {
  return evaluateChecks(checks as unknown as Check[], { session, executed, lastOutput, lastExitCode });
}

// ---------- indexes ----------

export interface LessonRef {
  lesson: Lesson;
  module: Module;
  index: number; // index inside the module
  globalIndex: number;
}

export const allLessons: LessonRef[] = (() => {
  const out: LessonRef[] = [];
  for (const module of modules) module.lessons.forEach((lesson, index) => out.push({ lesson, module, index, globalIndex: out.length }));
  return out;
})();

export function findLesson(id: string): LessonRef | undefined {
  return allLessons.find((l) => l.lesson.id === id);
}

export function findModule(id: string): Module | undefined {
  return modules.find((m) => m.id === id);
}

export function findMission(id: string): Mission | undefined {
  return missions.find((m) => m.id === id);
}

export function isTaskStep(step: Step): step is Extract<Step, { type: 'task' | 'fix' }> {
  return step.type === 'task' || step.type === 'fix';
}

/** XP for finishing a step (before hint penalties). */
export function stepXp(step: Step): number {
  switch (step.type) {
    case 'theory':
      return 2;
    case 'task':
    case 'fix':
      return step.xp ?? 15;
    case 'predict':
    case 'build':
      return 8;
    case 'quiz':
      return 5;
  }
}

/** The same challenge for everybody on a given day (no server needed). */
export function dailyChallenge(date: Date): Challenge {
  const day = Math.floor(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / 86_400_000);
  // walk the pool with a step coprime to its size: no repeats until every challenge was used
  const n = challenges.length;
  const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b));
  const step = [5, 7, 11, 13, 3, 1].find((k) => gcd(k, n) === 1) ?? 1;
  return challenges[(((day * step) % n) + n) % n]!;
}

/** Levels from newbie to root. */
export const LEVELS = [
  { id: 'newbie', xp: 0 },
  { id: 'user', xp: 150 },
  { id: 'scripter', xp: 400 },
  { id: 'poweruser', xp: 800 },
  { id: 'admin', xp: 1400 },
  { id: 'sysadmin', xp: 2200 },
  { id: 'root', xp: 3200 },
] as const;

export function levelFor(xp: number): { index: number; id: string; current: number; next: number | null } {
  let index = 0;
  for (let i = 0; i < LEVELS.length; i++) if (xp >= LEVELS[i]!.xp) index = i;
  const next = LEVELS[index + 1];
  return { index, id: LEVELS[index]!.id, current: LEVELS[index]!.xp, next: next ? next.xp : null };
}

/** Final exam: a fixed selection of tasks across all modules. */
export function examTasks(): { step: Extract<Step, { type: 'task' | 'fix' }>; lesson: Lesson }[] {
  const out: { step: Extract<Step, { type: 'task' | 'fix' }>; lesson: Lesson }[] = [];
  for (const m of modules) {
    const tasks = m.lessons.flatMap((lesson) => lesson.steps.filter(isTaskStep).map((step) => ({ step, lesson })));
    // two tasks per module: the last task of the first and of the last lesson
    const pick = [tasks[Math.floor(tasks.length / 3)], tasks[tasks.length - 1]].filter(Boolean) as typeof tasks;
    out.push(...pick);
  }
  return out;
}
