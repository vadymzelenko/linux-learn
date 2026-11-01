import { createShell, evaluateChecks, run, type Check, type ExecutedCommand, type MachineSpec, type Session, type TaskEvaluation } from '@linux-learn/engine';
import type { Achievement, Challenge, ContentCheck, Course, GlossaryTerm, L10n, Lang, Lesson, Mission, Module, Step } from './schema';
import coursesJson from '../courses.json';
import glossaryJson from '../glossary.json';

import missionsJson from '../missions/missions.json';
import challengesJson from '../challenges/challenges.json';
import achievementsJson from '../achievements.json';
import commandsL10nJson from '../commands-l10n.json';
import { fixtureMap, moduleList } from './registry';


export * from './schema';

export const modules: Module[] = moduleList;
export const courses: Course[] = coursesJson as unknown as Course[];
export const glossary: GlossaryTerm[] = glossaryJson as unknown as GlossaryTerm[];
export const missions: Mission[] = missionsJson as unknown as Mission[];
export const challenges: Challenge[] = challengesJson as unknown as Challenge[];
export const achievements: Achievement[] = achievementsJson as unknown as Achievement[];

export const fixtures: Record<string, MachineSpec> = fixtureMap;

type CommandL10n = Record<string, { summary: Partial<Record<Lang, string>>; options?: Record<string, Partial<Record<Lang, string>>> }>;
/** Translated summaries and option texts of the simulator's commands (English lives in the engine). */
export const commandL10n: CommandL10n = commandsL10nJson as unknown as CommandL10n;

/** Summary of a command in a language; `fallback` is the English text from the manual. */
export function commandSummary(name: string, lang: string, fallback: string): string {
  return commandL10n[name]?.summary[lang as Lang] ?? fallback;
}

/** Text of an option (by its manual spec, e.g. "-n, --lines=NUM") in a language. */
export function optionText(name: string | undefined, spec: string | undefined, lang: string, fallback: string): string {
  if (!name || !spec) return fallback;
  return commandL10n[name]?.options?.[spec]?.[lang as Lang] ?? fallback;
}

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

// ---------- courses ----------

export function courseOfModule(moduleId: string): Course | undefined {
  return courses.find((c) => c.modules.includes(moduleId));
}

export function courseModules(course: Course): Module[] {
  return course.modules.map((id) => modules.find((m) => m.id === id)).filter((m): m is Module => !!m);
}

export function courseLessons(course: Course): LessonRef[] {
  return allLessons.filter((l) => course.modules.includes(l.module.id));
}

function words(text: L10n | undefined): number {
  return text ? text.en.split(/\s+/).length : 0;
}

/** Rough study time of a lesson in minutes (reading at ~120 wpm, tasks ~3 min). */
export function lessonMinutes(lesson: Lesson): number {
  let min = 0;
  for (const s of lesson.steps) {
    if (s.type === 'theory') min += words(s.text) / 120 + (s.demo ? 1 : 0) + (s.terminal === false ? 0 : 1);
    else if (s.type === 'task' || s.type === 'fix') min += 3.5;
    else if (s.type === 'predict' || s.type === 'build') min += 1.5;
    else min += 1;
  }
  return Math.max(3, Math.round(min));
}

export function courseHours(course: Course): number {
  const lessonsMin = courseLessons(course).reduce((t, l) => t + lessonMinutes(l.lesson), 0);
  const missionMin = missions.filter((m) => (m.course ?? 'linux') === course.id).reduce((t, m) => t + 6 + m.difficulty * 4, 0);
  return Math.round(((lessonsMin + missionMin) / 60) * 10) / 10;
}

/** Lessons whose theory explains a task's commands (for "read the theory" links). */
export function lessonsForCommands(commands: string[]): LessonRef[] {
  const wanted = new Set(commands);
  return allLessons.filter((l) => l.lesson.commands.some((c) => wanted.has(c))).slice(0, 4);
}

export function findTerm(id: string): GlossaryTerm | undefined {
  return glossary.find((g) => g.id === id);
}
