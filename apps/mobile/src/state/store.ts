import { Platform } from 'react-native';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { produce } from 'immer';
import { createShell, isSession, migrateSession, type ExecResult, type Session } from '@linux-learn/engine';
import { fixtures, levelFor, type Lang } from '@linux-learn/content';
import type { ThemeId } from '../theme/themes';
import {
  dayKey,
  initialProgress,
  newAchievements,
  nightOwl,
  recordExec,
  reviewCard,
  scheduleStruggles,
  touchStreak,
  type Progress,
} from '../lib/progress';
import { storage } from './storage';

export interface Settings {
  lang: 'system' | Lang;
  theme: ThemeId;
  fontSize: number;
  haptics: boolean;
  sounds: boolean;
  reminders: boolean;
  reminderHour: number;
  onboarded: boolean;
  certName: string;
  keyboard: KeyboardSettings;
}

/** The in-app terminal keyboard (instead of the phone's system keyboard). */
export interface KeyboardSettings {
  /** custom: our keyboard; system: the phone keyboard (other languages, swipe typing). */
  mode: 'custom' | 'system';
  /** 0.55–1: see the output through the keyboard. */
  opacity: number;
  size: 'S' | 'M' | 'L';
  numberRow: boolean;
  keySound: boolean;
  /** Quick-insert chips above the keys. */
  quick: string[];
}

export const DEFAULT_QUICK = ['ls -la', 'cd ', 'cd ..', 'cat ', 'grep ', 'sudo ', '| ', '> ', '~/', 'clear'];

export interface Machine {
  id: string;
  name: string;
  template: string;
  session: Session;
  createdAt: number;
}

export type Toast =
  | { id: number; kind: 'achievement'; achievementId: string }
  | { id: number; kind: 'xp'; xp: number }
  | { id: number; kind: 'level'; level: string }
  | { id: number; kind: 'text'; text: string };

export const MAX_MACHINES = 3;

type DistributiveOmit<T, K extends keyof T> = T extends unknown ? Omit<T, K> : never;

interface State {
  settings: Settings;
  progress: Progress;
  sandbox: { machines: Machine[]; activeId: string | null };
  toasts: Toast[];
  hydrated: boolean;

  setSettings(patch: Partial<Settings>): void;
  /** Count activity for streak / stats; returns achievements unlocked. */
  recordCommand(line: string, result: ExecResult, cwd: string): void;
  saveLessonStep(lessonId: string, step: number): void;
  addHints(lessonId: string, n: number): void;
  gainXp(xp: number): void;
  completeLesson(lessonId: string, xp: number): void;
  completeMission(missionId: string, xp: number, hints: number): void;
  completePractice(id: string, xp: number): void;
  completeExam(score: number, passed: boolean): void;
  scheduleReview(commands: string[], hints: number, mistakes: number): void;
  review(command: string, quality: number): void;
  markReviewPrompt(): void;

  createMachine(template: string, name: string): string | null;
  updateMachine(id: string, session: Session): void;
  resetMachine(id: string): void;
  renameMachine(id: string, name: string): void;
  deleteMachine(id: string): void;
  setActiveMachine(id: string): void;

  dismissToast(id: number): void;
  pushToast(t: DistributiveOmit<Toast, 'id'>): void;
  resetAll(): void;
}

const defaultSettings: Settings = {
  lang: 'system',
  theme: 'classic',
  fontSize: 14,
  haptics: true,
  sounds: true,
  reminders: false,
  reminderHour: 19,
  onboarded: false,
  certName: '',
  keyboard: { mode: Platform.OS === 'web' ? 'system' : 'custom', opacity: 1, size: 'M', numberRow: true, keySound: false, quick: DEFAULT_QUICK },
};

let toastSeq = 1;

function freshMachine(template: string, name: string): Machine {
  const spec = fixtures[template] ?? fixtures['empty-home']!;
  return {
    id: `m${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
    name,
    template,
    session: createShell(spec),
    createdAt: Date.now(),
  };
}

export const useStore = create<State>()(
  persist(
    (set, get) => {
      /** Apply a progress change, then award achievements / level-ups as toasts. */
      const update = (recipe: (p: Progress) => void, events?: ExecResult['events']) => {
        const before = get().progress;
        const now = new Date();
        let progress = produce(before, recipe);
        const ids = newAchievements(progress, { now, ...(events ? { events } : {}) });
        if (nightOwl(now) && Object.values(progress.lessons).some((l) => l.completedAt && l.completedAt > Date.now() - 5000)) ids.push('night-owl');
        const fresh = ids.filter((id) => !(id in progress.achievements));
        if (fresh.length) {
          progress = produce(progress, (p) => {
            for (const id of fresh) p.achievements[id] = Date.now();
          });
        }
        const toasts: Toast[] = fresh.map((achievementId) => ({ id: toastSeq++, kind: 'achievement', achievementId }));
        const lvBefore = levelFor(before.xp).id;
        const lvAfter = levelFor(progress.xp).id;
        if (lvAfter !== lvBefore) toasts.push({ id: toastSeq++, kind: 'level', level: lvAfter });
        set({ progress, toasts: [...get().toasts, ...toasts].slice(-5) });
      };
      const activity = (p: Progress) => {
        p.streak = touchStreak(p.streak, dayKey(new Date())).streak;
      };

      return {
        settings: defaultSettings,
        progress: initialProgress(),
        sandbox: { machines: [], activeId: null },
        toasts: [],
        hydrated: false,

        setSettings: (patch) => set({ settings: { ...get().settings, ...patch } }),

        recordCommand: (line, result, cwd) =>
          update((p) => {
            p.stats = recordExec(p.stats, line, result, cwd);
          }, result.events),

        saveLessonStep: (lessonId, step) =>
          update((p) => {
            const l = (p.lessons[lessonId] ??= { step: 0, hints: 0, xp: 0 });
            l.step = Math.max(l.completedAt ? 0 : l.step, step);
          }),

        addHints: (lessonId, n) =>
          update((p) => {
            const l = (p.lessons[lessonId] ??= { step: 0, hints: 0, xp: 0 });
            l.hints += n;
          }),

        gainXp: (xp) => {
          update((p) => {
            p.xp += xp;
            activity(p);
          });
          if (xp > 0) get().pushToast({ kind: 'xp', xp });
        },

        completeLesson: (lessonId, xp) =>
          update((p) => {
            const l = (p.lessons[lessonId] ??= { step: 0, hints: 0, xp: 0 });
            if (!l.completedAt) {
              l.completedAt = Date.now();
              l.xp = xp;
            }
            l.step = 0;
            activity(p);
            // every 3 completed lessons earns a streak freeze (max 2)
            const done = Object.values(p.lessons).filter((x) => x.completedAt).length;
            if (done % 3 === 0) p.streak.freezes = Math.min(2, p.streak.freezes + 1);
          }),

        completeMission: (missionId, xp, hints) =>
          update((p) => {
            if (!p.missions[missionId]) {
              p.missions[missionId] = { completedAt: Date.now(), hints };
              p.xp += xp;
            }
            activity(p);
          }),

        completePractice: (id, xp) =>
          update((p) => {
            p.practice ??= {};
            if (p.practice[id]) return;
            p.practice[id] = Date.now();
            p.xp += xp;
            activity(p);
          }),

        completeExam: (score, passed) =>
          update((p) => {
            p.exam.best = Math.max(p.exam.best, score);
            if (passed && !p.exam.passedAt) {
              p.exam.passedAt = Date.now();
              p.xp += 200;
            }
            activity(p);
          }),

        scheduleReview: (commands, hints, mistakes) =>
          update((p) => {
            p.srs = scheduleStruggles(p.srs, commands, hints, mistakes, dayKey(new Date()));
          }),

        review: (command, quality) =>
          update((p) => {
            p.srs[command] = reviewCard(p.srs[command], quality, dayKey(new Date()));
            activity(p);
          }),

        markReviewPrompt: () =>
          update((p) => {
            p.lastReviewPrompt = Date.now();
          }),

        createMachine: (template, name) => {
          const { machines } = get().sandbox;
          if (machines.length >= MAX_MACHINES) return null;
          const m = freshMachine(template, name);
          set({ sandbox: { machines: [...machines, m], activeId: m.id } });
          return m.id;
        },
        updateMachine: (id, session) =>
          set({ sandbox: { ...get().sandbox, machines: get().sandbox.machines.map((m) => (m.id === id ? { ...m, session } : m)) } }),
        resetMachine: (id) =>
          set({
            sandbox: {
              ...get().sandbox,
              machines: get().sandbox.machines.map((m) => (m.id === id ? { ...freshMachine(m.template, m.name), id: m.id, createdAt: m.createdAt } : m)),
            },
          }),
        renameMachine: (id, name) =>
          set({ sandbox: { ...get().sandbox, machines: get().sandbox.machines.map((m) => (m.id === id ? { ...m, name: name.slice(0, 24) } : m)) } }),
        deleteMachine: (id) => {
          const machines = get().sandbox.machines.filter((m) => m.id !== id);
          const activeId = get().sandbox.activeId === id ? (machines[0]?.id ?? null) : get().sandbox.activeId;
          set({ sandbox: { machines, activeId } });
        },
        setActiveMachine: (id) => set({ sandbox: { ...get().sandbox, activeId: id } }),

        dismissToast: (id) => set({ toasts: get().toasts.filter((t) => t.id !== id) }),
        pushToast: (t) => set({ toasts: [...get().toasts, { ...t, id: toastSeq++ } as Toast].slice(-5) }),
        resetAll: () =>
          set({
            progress: initialProgress(),
            sandbox: { machines: [], activeId: null },
            settings: { ...get().settings, onboarded: true },
            toasts: [],
          }),
      };
    },
    {
      name: 'linux-trainer',
      version: 1,
      storage: createJSONStorage(() => storage),
      partialize: (s) => ({ settings: s.settings, progress: s.progress, sandbox: s.sandbox }),
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<State>;
        const machines = (p.sandbox?.machines ?? [])
          .filter((m) => m && isSession(m.session))
          .map((m) => ({ ...m, session: migrateSession(m.session) }))
          .slice(0, MAX_MACHINES);
        return {
          ...current,
          settings: { ...defaultSettings, ...(p.settings ?? {}), keyboard: { ...defaultSettings.keyboard, ...(p.settings?.keyboard ?? {}) } },
          progress: { ...initialProgress(), ...(p.progress ?? {}), stats: { ...initialProgress().stats, ...(p.progress?.stats ?? {}) } },
          sandbox: { machines, activeId: machines.some((m) => m.id === p.sandbox?.activeId) ? p.sandbox!.activeId : (machines[0]?.id ?? null) },
        };
      },
      // hydration may finish synchronously (web) before `useStore` is assigned: defer
      onRehydrateStorage: () => () => {
        setTimeout(() => useStore.setState({ hydrated: true }), 0);
      },
    },
  ),
);
