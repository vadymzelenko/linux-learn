import { describe, expect, it } from 'vitest';
import { createShell } from '@linux-learn/engine';
import { buildBackup, importSettings, mergeProgress, parseBackup } from '../src/lib/backup';
import { initialProgress } from '../src/lib/progress';

const settings = { lang: 'ru', theme: 'dracula', fontSize: 16, onboarded: true, reminders: true, reminderHour: 8, keyboard: { mode: 'custom', size: 'L', opacity: 1 } };

describe('backup', () => {
  it('round-trips through JSON text, including sandbox machines', () => {
    const p = initialProgress();
    p.xp = 120;
    p.lessons['nav-1'] = { step: 0, hints: 1, xp: 30, completedAt: 1000 };
    const m = { id: 'm1', name: 'box', template: 'empty-home', session: createShell(), createdAt: 5 };
    const text = JSON.stringify(buildBackup({ settings, progress: p, sandbox: { machines: [m], activeId: 'm1' } }, 'android'));
    const r = parseBackup(text);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.backup.progress.xp).toBe(120);
    expect(r.backup.progress.lessons['nav-1']?.completedAt).toBe(1000);
    expect(r.backup.sandbox?.machines).toHaveLength(1);
    // pasted from a messenger with extra text around it
    expect(parseBackup(`here you go:\n${text}\n👍`).ok).toBe(true);
  });

  it('rejects foreign, broken and newer data', () => {
    expect(parseBackup('')).toEqual({ ok: false, error: 'empty' });
    expect(parseBackup('{"a":')).toEqual({ ok: false, error: 'json' });
    expect(parseBackup('{"a":1}')).toEqual({ ok: false, error: 'foreign' });
    expect(parseBackup('{"app":"linux-terminal-trainer","format":99,"settings":{},"progress":{}}')).toEqual({ ok: false, error: 'newer' });
    expect(parseBackup('{"app":"linux-terminal-trainer","format":1}')).toEqual({ ok: false, error: 'broken' });
  });

  it('sanitizes malformed progress fields', () => {
    const r = parseBackup(JSON.stringify({ app: 'linux-terminal-trainer', format: 1, settings: {}, progress: { xp: 'lots', lessons: { a: { step: 2 }, b: 'x' }, achievements: { first: 1, bad: 'no' } } }));
    expect(r.ok && r.backup.progress.xp).toBe(0);
    expect(r.ok && Object.keys(r.backup.progress.lessons)).toEqual(['a']);
    expect(r.ok && r.backup.progress.achievements).toEqual({ first: 1 });
    expect(r.ok && r.backup.progress.stats.commands).toBe(0);
  });

  it('merge keeps everything solved on both devices', () => {
    const a = initialProgress();
    const b = initialProgress();
    a.xp = 100;
    b.xp = 80;
    a.lessons.x = { step: 3, hints: 0, xp: 0 };
    b.lessons.x = { step: 0, hints: 1, xp: 20, completedAt: 50 };
    b.lessons.y = { step: 0, hints: 0, xp: 10, completedAt: 60 };
    a.missions.m = { completedAt: 10, hints: 0 };
    b.achievements.first = 7;
    a.streak = { current: 2, best: 5, last: '2026-01-01', freezes: 0 };
    b.streak = { current: 4, best: 4, last: '2026-01-03', freezes: 1 };
    const m = mergeProgress(a, b);
    expect(m.xp).toBe(100);
    expect(m.lessons.x).toEqual({ step: 0, hints: 1, xp: 20, completedAt: 50 });
    expect(m.lessons.y?.completedAt).toBe(60);
    expect(m.missions.m).toBeDefined();
    expect(m.achievements.first).toBe(7);
    expect(m.streak).toEqual({ current: 4, best: 5, last: '2026-01-03', freezes: 1 });
  });

  it('device-only settings stay on the device', () => {
    const cur = { ...settings, lang: 'en', onboarded: false, reminders: false, keyboard: { mode: 'system', size: 'M', opacity: 0.7 } };
    const out = importSettings(cur, { ...settings, unknown: 1, fontSize: 'big' });
    expect(out.lang).toBe('ru');
    expect(out.theme).toBe('dracula');
    expect(out.fontSize).toBe(16);
    expect(out.onboarded).toBe(false);
    expect(out.reminders).toBe(false);
    expect(out.keyboard).toEqual({ mode: 'system', size: 'L', opacity: 1 });
    expect('unknown' in out).toBe(false);
    expect(importSettings({ fontSize: 14 }, { fontSize: 'big' }).fontSize).toBe(14);
  });
});
