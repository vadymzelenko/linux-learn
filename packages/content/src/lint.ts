/**
 * Content linter: validates every JSON file with zod and then lets the engine
 * SOLVE every task with its reference solution. A lesson that cannot be
 * solved fails CI (and the release build).
 */
import { COMMANDS, run, stripAnsi, type ExecutedCommand } from '@linux-learn/engine';
import { z } from 'zod';
import {
  AchievementSchema,
  ChallengeSchema,
  CourseSchema,
  GlossarySchema,
  LANGS,
  MissionSchema,
  ModuleSchema,
  type ContentCheck,
  type L10n,
} from './schema';
import { achievements, allLessons, commandL10n, challenges, courses, evaluateTask, fixtures, glossary, missions, modules, prepareSession } from './index';

export const REQUIRED_LANGS = ['en', 'ru', 'uk'] as const;

export interface LintIssue {
  level: 'error' | 'warning' | 'info';
  where: string;
  message: string;
}

const NOW = Date.UTC(2026, 9, 31, 12, 0, 0);

function collectL10n(value: unknown, path: string, out: { path: string; text: L10n }[]) {
  if (Array.isArray(value)) {
    value.forEach((v, i) => collectL10n(v, `${path}[${i}]`, out));
    return;
  }
  if (value && typeof value === 'object') {
    const obj = value as Record<string, unknown>;
    if (typeof obj['en'] === 'string' && Object.keys(obj).every((k) => (LANGS as readonly string[]).includes(k))) {
      out.push({ path, text: obj as unknown as L10n });
      return;
    }
    for (const [k, v] of Object.entries(obj)) collectL10n(v, `${path}.${k}`, out);
  }
}

interface TaskLike {
  setup?: string | Record<string, unknown>;
  prepare?: string[];
  checks: ContentCheck[];
  solution: string[];
  hints: { command: string };
  prefill?: string;
}

/** Solve a task with its solution; returns an error message or null. */
export function solveTask(task: TaskLike, fallbackSetup?: string | Record<string, unknown>): string | null {
  let session = prepareSession(task.setup ?? fallbackSetup, task.prepare ?? [], NOW);
  const before = evaluateTask(task.checks, session, [], '', 0);
  if (before.passed) return 'task is already solved before any command';
  const executed: ExecutedCommand[] = [];
  let lastOut = '';
  let lastCode = 0;
  for (const line of task.solution) {
    const r = run(session, line, { now: NOW, isTTY: true, columns: 60 });
    session = r.session;
    executed.push(...r.executed);
    const out = stripAnsi(r.output.map((o) => o.text).join(''));
    if (/command not found|internal error/.test(out)) return `solution line "${line}" failed: ${out.trim()}`;
    lastOut = out;
    lastCode = r.exitCode;
    const ev = evaluateTask(task.checks, session, executed, out, r.exitCode);
    if (ev.passed) return null;
  }
  const final = evaluateTask(task.checks, session, executed, lastOut, lastCode);
  const failing = final.results.map((r, i) => (r.status === 'pass' ? null : `${task.checks[i]!.type}(${r.status})`)).filter(Boolean);
  return `solution does not pass: ${failing.join(', ')}`;
}

export function lintContent(): LintIssue[] {
  const issues: LintIssue[] = [];
  const err = (where: string, message: string) => issues.push({ level: 'error', where, message });
  const warn = (where: string, message: string) => issues.push({ level: 'warning', where, message });

  const validate = <T>(schema: z.ZodType<T>, data: unknown, where: string) => {
    const r = schema.safeParse(data);
    if (!r.success) for (const i of r.error.issues) err(`${where}.${i.path.join('.')}`, i.message);
    return r.success;
  };

  modules.forEach((m, i) => validate(ModuleSchema, m, `module[${i}:${m.id}]`));
  courses.forEach((c, i) => {
    validate(CourseSchema, c, `course[${i}:${c.id}]`);
    for (const id of c.modules) if (!modules.some((m) => m.id === id)) err(`course ${c.id}`, `unknown module "${id}"`);
  });
  glossary.forEach((g, i) => validate(GlossarySchema, g, `glossary[${i}:${g.id}]`));
  for (const m of modules) if (!courses.some((c) => c.modules.includes(m.id))) warn(`module ${m.id}`, 'module is not part of any course');
  for (const ms of missions) for (const tp of ms.topics ?? []) if (!allLessons.some((l) => l.lesson.id === tp)) err(`mission ${ms.id}`, `unknown topic lesson "${tp}"`);
  for (const ch of challenges) for (const tp of ch.topics ?? []) if (!allLessons.some((l) => l.lesson.id === tp)) err(`challenge ${ch.id}`, `unknown topic lesson "${tp}"`);
  for (const g of glossary) if (g.command && !COMMANDS.has(g.command)) err(`glossary ${g.id}`, `unknown command "${g.command}"`);
  missions.forEach((m, i) => validate(MissionSchema, m, `mission[${i}:${m.id}]`));
  challenges.forEach((c, i) => validate(ChallengeSchema, c, `challenge[${i}:${c.id}]`));
  achievements.forEach((a, i) => validate(AchievementSchema, a, `achievement[${i}:${a.id}]`));
  if (issues.some((i) => i.level === 'error')) return issues;

  // unique ids
  const ids = new Map<string, string>();
  const unique = (id: string, where: string) => {
    if (ids.has(id)) err(where, `duplicate id "${id}" (also in ${ids.get(id)})`);
    ids.set(id, where);
  };
  modules.forEach((m) => {
    unique(m.id, `module ${m.id}`);
    m.lessons.forEach((l) => unique(l.id, `lesson ${l.id}`));
  });
  missions.forEach((m) => unique(m.id, `mission ${m.id}`));
  challenges.forEach((c) => unique(c.id, `challenge ${c.id}`));

  // translations
  const texts: { path: string; text: L10n }[] = [];
  collectL10n(modules, 'modules', texts);
  collectL10n(missions, 'missions', texts);
  collectL10n(challenges, 'challenges', texts);
  collectL10n(achievements, 'achievements', texts);
  collectL10n(courses, 'courses', texts);
  collectL10n(glossary, 'glossary', texts);
  // en, ru and uk are required; Polish falls back to English and is reported as a summary
  let plMissing = 0;
  for (const { path, text } of texts) {
    const missing = REQUIRED_LANGS.filter((l) => !(text as Record<string, string | undefined>)[l]);
    if (missing.length) warn(path, `missing translation: ${missing.join(', ')}`);
    if (!(text as Record<string, string | undefined>)['pl']) plMissing++;
  }
  if (plMissing) issues.push({ level: 'info', where: 'translations', message: `Polish: ${texts.length - plMissing}/${texts.length} texts translated (the rest falls back to English)` });

  // command manual translations (Explain / reference): every command and option in every language
  for (const def of COMMANDS.values()) {
    const l = commandL10n[def.name];
    if (!l) {
      warn(`commands-l10n ${def.name}`, 'missing command translation');
      continue;
    }
    for (const lang of ['ru', 'uk', 'pl'] as const) if (!l.summary[lang]) warn(`commands-l10n ${def.name}`, `missing summary: ${lang}`);
    for (const [spec] of def.doc.options ?? []) {
      const o = l.options?.[spec];
      if (!o || !o.ru || !o.uk || !o.pl) warn(`commands-l10n ${def.name}`, `missing option translation: ${spec}`);
    }
  }

  const checkSetup = (setup: unknown, where: string) => {
    if (typeof setup === 'string' && !fixtures[setup]) err(where, `unknown fixture "${setup}"`);
  };

  // lessons
  for (const m of modules) {
    for (const lesson of m.lessons) {
      const where = `${m.id}/${lesson.id}`;
      checkSetup(lesson.setup, where);
      for (const c of lesson.commands) if (!COMMANDS.has(c)) err(where, `unknown command in "commands": ${c}`);
      lesson.steps.forEach((step, si) => {
        const sw = `${where}#${si + 1}(${step.type})`;
        switch (step.type) {
          case 'theory': {
            if (step.demo) {
              let s = prepareSession(step.demo.setup ?? lesson.setup, [], NOW);
              for (const c of step.demo.commands) {
                const r = run(s, c, { now: NOW });
                s = r.session;
                const out = r.output.map((o) => o.text).join('');
                if (r.exitCode !== 0) err(sw, `demo command "${c}" exited with ${r.exitCode}: ${out.trim()}`);
              }
            }
            break;
          }
          case 'task':
          case 'fix': {
            checkSetup(step.setup, sw);
            const e = solveTask(step, lesson.setup);
            if (e) err(sw, e);
            const used = step.solution.flatMap((l) => l.split(/\s*(?:\|\||&&|[|;])\s*/).map((p) => p.trim().split(/\s+/)));
            const names = used.flatMap((w) => (w[0] === 'sudo' ? [w[0], w[1] ?? ''] : [w[0] ?? '']));
            if (!names.includes(step.hints.command)) warn(sw, `hint command "${step.hints.command}" is not used in the solution`);
            if (step.type === 'fix') {
              const r = run(prepareSession(step.setup ?? lesson.setup, step.prepare, NOW), step.prefill, { now: NOW });
              const ev = evaluateTask(step.checks, r.session, r.executed, r.output.map((o) => o.text).join(''), r.exitCode);
              if (ev.passed) err(sw, 'the broken command (prefill) already solves the task');
            }
            break;
          }
          case 'predict': {
            checkSetup(step.setup, sw);
            if (step.answer >= step.options.length) err(sw, 'answer index out of range');
            const s = prepareSession(step.setup ?? lesson.setup, step.prepare, NOW);
            const r = run(s, step.command, { now: NOW, isTTY: false });
            const actual = stripAnsi(r.output.map((o) => o.text).join('')).trimEnd();
            const expected = (step.options[step.answer] ?? '').trimEnd();
            if (actual !== expected) err(sw, `predicted output differs.\n    expected option: ${JSON.stringify(expected)}\n    engine prints:   ${JSON.stringify(actual)}`);
            step.options.forEach((o, i) => {
              if (i !== step.answer && o.trimEnd() === actual) err(sw, `option ${i} is also correct`);
            });
            if (new Set(step.options.map((o) => o.trimEnd())).size !== step.options.length) err(sw, 'duplicate options');
            break;
          }
          case 'build': {
            const s = prepareSession(lesson.setup, [], NOW);
            const r = run(s, step.answer.join(' '), { now: NOW });
            const out = r.output.map((o) => o.text).join('');
            if (r.exitCode !== 0) err(sw, `assembled command fails (${r.exitCode}): ${out.trim()}`);
            for (const d of step.distractors ?? []) if (step.answer.includes(d)) err(sw, `distractor "${d}" is part of the answer`);
            break;
          }
          case 'quiz':
            if (step.answer >= step.options.length) err(sw, 'answer index out of range');
            break;
        }
      });
    }
  }

  for (const mission of missions) {
    const where = `mission ${mission.id}`;
    checkSetup(mission.setup, where);
    if (mission.requires && !modules.some((m) => m.id === mission.requires)) err(where, `requires unknown module "${mission.requires}"`);
    const e = solveTask(mission);
    if (e) err(where, e);
  }
  for (const ch of challenges) {
    const e = solveTask(ch);
    if (e) err(`challenge ${ch.id}`, e);
  }
  return issues;
}

export function contentStats() {
  const lessons = modules.reduce((n, m) => n + m.lessons.length, 0);
  const steps = modules.reduce((n, m) => n + m.lessons.reduce((k, l) => k + l.steps.length, 0), 0);
  const tasks = modules.reduce((n, m) => n + m.lessons.reduce((k, l) => k + l.steps.filter((s) => s.type === 'task' || s.type === 'fix').length, 0), 0);
  return { modules: modules.length, lessons, steps, tasks, missions: missions.length, challenges: challenges.length, achievements: achievements.length, glossary: glossary.length, courses: courses.length };
}
