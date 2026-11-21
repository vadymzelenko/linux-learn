import { z } from 'zod';

export const LANGS = ['en', 'uk', 'ru', 'pl'] as const;
export type Lang = (typeof LANGS)[number];

/** Localised text. English is required and is the fallback. */
export const L10n = z.object({
  en: z.string().min(1),
  uk: z.string().min(1).optional(),
  ru: z.string().min(1).optional(),
  pl: z.string().min(1).optional(),
});
export type L10n = z.infer<typeof L10n>;

const path = z.string().min(1);

/** Task check (mirrors the engine's Check type) + a label for the checklist. */
export const CheckSchema = z
  .discriminatedUnion('type', [
    z.object({ type: z.literal('fileExists'), path }),
    z.object({ type: z.literal('dirExists'), path }),
    z.object({ type: z.literal('symlinkExists'), path, target: z.string().optional() }),
    z.object({ type: z.literal('notExists'), path }),
    z.object({ type: z.literal('userExists'), name: z.string(), group: z.string().optional(), exists: z.boolean().optional() }),
    z.object({ type: z.literal('fileContains'), path, text: z.string().optional(), regex: z.string().optional(), flags: z.string().optional() }),
    z.object({ type: z.literal('fileNotContains'), path, text: z.string().optional(), regex: z.string().optional() }),
    z.object({ type: z.literal('fileEquals'), path, text: z.string() }),
    z.object({ type: z.literal('cwdIs'), path }),
    z.object({ type: z.literal('modeIs'), path, mode: z.string().regex(/^[0-7]{3,4}$/) }),
    z.object({ type: z.literal('ownerIs'), path, owner: z.string().optional(), group: z.string().optional() }),
    z.object({ type: z.literal('dirEmpty'), path }),
    z.object({
      type: z.literal('countIn'),
      path,
      pattern: z.string().optional(),
      min: z.number().optional(),
      max: z.number().optional(),
      eq: z.number().optional(),
      fileType: z.enum(['file', 'dir']).optional(),
    }),
    z.object({ type: z.literal('usedCommand'), command: z.string(), flags: z.array(z.string()).optional(), args: z.array(z.string()).optional(), success: z.boolean().optional() }),
    z.object({ type: z.literal('outputContains'), text: z.string().optional(), regex: z.string().optional(), flags: z.string().optional() }),
    z.object({ type: z.literal('outputLines'), eq: z.number().optional(), min: z.number().optional(), max: z.number().optional() }),
    z.object({ type: z.literal('varEquals'), name: z.string(), value: z.string() }),
    z.object({ type: z.literal('aliasExists'), name: z.string(), value: z.string().optional() }),
    z.object({ type: z.literal('userIs'), user: z.string() }),
    z.object({ type: z.literal('processGone'), pid: z.number().optional(), name: z.string().optional() }),
    z.object({ type: z.literal('exitCode'), code: z.number() }),
    z.object({ type: z.literal('serviceState'), name: z.string(), state: z.enum(['active', 'inactive', 'failed']) }),
    z.object({ type: z.literal('serviceEnabled'), name: z.string(), enabled: z.boolean() }),
    z.object({ type: z.literal('containerState'), name: z.string(), state: z.enum(['running', 'exited', 'absent']), image: z.string().optional(), hostPort: z.number().int().optional(), network: z.string().optional() }),
    z.object({ type: z.literal('imageExists'), name: z.string(), exists: z.boolean().optional() }),
    z.object({
      type: z.literal('git'),
      path,
      commits: z.number().int().optional(),
      branch: z.string().optional(),
      noBranch: z.string().optional(),
      head: z.string().optional(),
      clean: z.boolean().optional(),
      tracked: z.string().optional(),
      untracked: z.string().optional(),
      staged: z.string().optional(),
      remote: z.string().optional(),
      pushed: z.string().optional(),
      message: z.string().optional(),
      merged: z.string().optional(),
      merging: z.boolean().optional(),
      tag: z.string().optional(),
      ignored: z.string().optional(),
    }),
    z.object({
      type: z.literal('github'),
      repo: z.string(),
      exists: z.boolean().optional(),
      branch: z.string().optional(),
      file: z.string().optional(),
      commits: z.number().int().optional(),
      prs: z.number().int().optional(),
      merged: z.number().int().optional(),
      issues: z.number().int().optional(),
      tag: z.string().optional(),
      release: z.string().optional(),
      fileContains: z.string().optional(),
    }),
    z.object({ type: z.literal('containerCount'), eq: z.number().int().optional(), min: z.number().int().optional(), max: z.number().int().optional(), running: z.boolean().optional() }),
  ])
  .and(z.object({ label: L10n }));
export type ContentCheck = z.infer<typeof CheckSchema>;

/** A machine: fixture id, or an inline engine MachineSpec. */
export const SetupSchema = z.union([z.string(), z.record(z.string(), z.unknown())]);

const Hints = z.object({
  /** Level 1: direction ("you need a command that moves files") */
  direction: L10n,
  /** Level 2: the command name */
  command: z.string(),
  /** Level 3 = the full solution (task.solution) */
});

const TheoryStep = z.object({
  type: z.literal('theory'),
  /** Card heading. */
  title: L10n.optional(),
  /** false = pure reading, no terminal under the text. */
  terminal: z.boolean().optional(),
  /** Paragraphs separated by blank lines; `code` and **bold** are supported. Tapping `code` pastes it into the terminal. */
  text: L10n,
  /** Animated demo: the command is "typed", its real output appears line by line. */
  demo: z.object({ setup: SetupSchema.optional(), commands: z.array(z.string()).min(1) }).optional(),
});

const TaskStep = z.object({
  type: z.literal('task'),
  goal: L10n,
  /** Step-by-step instructions ("1. ...\n2. ..."). */
  instructions: L10n.optional(),
  setup: SetupSchema.optional(),
  /** Commands run silently on the setup before the task starts. */
  prepare: z.array(z.string()).optional(),
  checks: z.array(CheckSchema).min(1),
  hints: Hints,
  solution: z.array(z.string()).min(1),
  /** Prefilled input (used by "fix the command" steps). */
  prefill: z.string().optional(),
  xp: z.number().int().positive().optional(),
});

const FixStep = TaskStep.extend({ type: z.literal('fix'), prefill: z.string() });

const PredictStep = z.object({
  type: z.literal('predict'),
  setup: SetupSchema.optional(),
  prepare: z.array(z.string()).optional(),
  command: z.string(),
  /** Commands whose output is shown as context (default: where you are + tree). */
  context: z.array(z.string()).optional(),
  /** Candidate outputs (terminal text, always English). The linter verifies the right one. */
  options: z.array(z.string()).min(2).max(4),
  answer: z.number().int().min(0),
  explanation: L10n.optional(),
});

const BuildStep = z.object({
  type: z.literal('build'),
  goal: L10n,
  /** The correct command as an ordered list of tokens. */
  answer: z.array(z.string()).min(2),
  /** Extra wrong tokens mixed in. */
  distractors: z.array(z.string()).optional(),
  explanation: L10n.optional(),
});

const QuizStep = z.object({
  type: z.literal('quiz'),
  question: L10n,
  options: z.array(L10n).min(2).max(5),
  answer: z.number().int().min(0),
  explanation: L10n.optional(),
});

export const StepSchema = z.discriminatedUnion('type', [TheoryStep, TaskStep, FixStep, PredictStep, BuildStep, QuizStep]);
export type Step = z.infer<typeof StepSchema>;
export type TaskLikeStep = z.infer<typeof TaskStep> | z.infer<typeof FixStep>;

export const LessonSchema = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/),
  title: L10n,
  /** Commands practised in this lesson (spaced repetition keys). */
  commands: z.array(z.string()).min(1),
  /** Default machine for the lesson's steps. */
  setup: SetupSchema.optional(),
  steps: z.array(StepSchema).min(1),
});
export type Lesson = z.infer<typeof LessonSchema>;

export const ModuleSchema = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/),
  /** Shown as a branch of the file-system progress map: /learn/<path> */
  path: z.string(),
  icon: z.string(),
  title: L10n,
  description: L10n,
  lessons: z.array(LessonSchema).min(1),
});
export type Module = z.infer<typeof ModuleSchema>;

export const MissionSchema = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/),
  /** Course the mission belongs to. */
  course: z.string().optional(),
  /** Lessons to re-read before / during the mission. */
  topics: z.array(z.string()).optional(),
  instructions: L10n.optional(),
  title: L10n,
  story: L10n,
  difficulty: z.number().int().min(1).max(3),
  /** Module that must be completed to unlock the mission. */
  requires: z.string().optional(),
  premium: z.boolean().optional(),
  setup: SetupSchema,
  prepare: z.array(z.string()).optional(),
  checks: z.array(CheckSchema).min(1),
  hints: Hints,
  solution: z.array(z.string()).min(1),
  xp: z.number().int().positive(),
});
export type Mission = z.infer<typeof MissionSchema>;

export const ChallengeSchema = TaskStep.extend({ id: z.string(), title: L10n, topics: z.array(z.string()).optional() });
export type Challenge = z.infer<typeof ChallengeSchema>;

export const CourseSchema = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/),
  icon: z.string(),
  color: z.string(),
  title: L10n,
  subtitle: L10n,
  description: L10n,
  /** Announced course ("Later"): shown greyed out, no modules yet. */
  soon: z.boolean().optional(),
  modules: z.array(z.string()),
});
export type Course = z.infer<typeof CourseSchema>;

export const GlossarySchema = z.object({
  id: z.string(),
  /** Category: basics, files, text, permissions, processes, network, noc, shell. */
  category: z.string(),
  term: L10n,
  definition: L10n,
  /** Word forms that get underlined in theory texts, per language (lowercase). */
  match: z.record(z.string(), z.array(z.string())).optional(),
  /** Related command (opens the man page). */
  command: z.string().optional(),
});
export type GlossaryTerm = z.infer<typeof GlossarySchema>;

export const AchievementSchema = z.object({
  id: z.string(),
  icon: z.string(),
  title: L10n,
  description: L10n,
  secret: z.boolean().optional(),
});
export type Achievement = z.infer<typeof AchievementSchema>;
