import { describe, expect, it } from 'vitest';
import { allLessons, modules } from '@linux-learn/content';
import {
  addDays,
  daysBetween,
  dueCards,
  initialProgress,
  lessonUnlocked,
  liveStreak,
  newAchievements,
  nextLesson,
  rewardAfterHints,
  reviewCard,
  scheduleStruggles,
  touchStreak,
} from '../src/lib/progress';

describe('dates', () => {
  it('day arithmetic', () => {
    expect(daysBetween('2026-10-31', '2026-11-01')).toBe(1);
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
  });
});

describe('streak', () => {
  const s0 = { current: 0, best: 0, last: null, freezes: 0 };
  it('starts, continues, resets', () => {
    const a = touchStreak(s0, '2026-10-01');
    expect(a).toMatchObject({ event: 'started', streak: { current: 1 } });
    const b = touchStreak(a.streak, '2026-10-01');
    expect(b.event).toBe('same');
    const c = touchStreak(a.streak, '2026-10-02');
    expect(c.streak).toMatchObject({ current: 2, best: 2 });
    const d = touchStreak(c.streak, '2026-10-05');
    expect(d).toMatchObject({ event: 'reset', streak: { current: 1, best: 2 } });
  });
  it('a freeze covers one missed day', () => {
    const s = { current: 5, best: 5, last: '2026-10-01', freezes: 1 };
    const r = touchStreak(s, '2026-10-03');
    expect(r).toMatchObject({ event: 'frozen', streak: { current: 6, freezes: 0 } });
    expect(liveStreak(s, '2026-10-03')).toBe(5);
    expect(liveStreak({ ...s, freezes: 0 }, '2026-10-03')).toBe(0);
  });
});

describe('SM-2', () => {
  it('grows intervals on success and resets on failure', () => {
    let c = reviewCard(undefined, 5, '2026-10-01');
    expect(c).toMatchObject({ interval: 1, reps: 1, due: '2026-10-02' });
    c = reviewCard(c, 5, '2026-10-02');
    expect(c.interval).toBe(6);
    c = reviewCard(c, 4, '2026-10-08');
    expect(c.interval).toBeGreaterThan(6);
    const f = reviewCard(c, 1, '2026-10-20');
    expect(f).toMatchObject({ interval: 1, reps: 0 });
    expect(f.ef).toBeGreaterThanOrEqual(1.3);
  });
  it('only struggles are scheduled, due cards are found', () => {
    const clean = scheduleStruggles({}, ['ls'], 0, 0, '2026-10-01');
    expect(dueCards(clean, '2026-10-01')).toEqual(['ls']);
    // a known card is not reset by a clean lesson
    const known = { ls: { ef: 2.6, interval: 6, reps: 2, due: '2026-10-07' } };
    expect(scheduleStruggles(known, ['ls'], 0, 0, '2026-10-01')).toEqual(known);
    const srs = scheduleStruggles(known, ['grep', 'ls'], 2, 0, '2026-10-01');
    expect(dueCards(srs, '2026-10-01').sort()).toEqual(['grep', 'ls']);
    expect(srs.ls!.ef).toBeCloseTo(2.4);
  });
});

describe('progress', () => {
  it('rewards shrink with hints', () => {
    expect(rewardAfterHints(15, 0)).toBe(15);
    expect(rewardAfterHints(15, 1)).toBe(10);
    expect(rewardAfterHints(15, 3)).toBe(2);
  });
  it('lessons unlock in order', () => {
    const p = initialProgress();
    expect(lessonUnlocked(p, allLessons[0]!.lesson.id)).toBe(true);
    expect(lessonUnlocked(p, allLessons[1]!.lesson.id)).toBe(false);
    p.lessons[allLessons[0]!.lesson.id] = { completedAt: 1, step: 0, hints: 0, xp: 10 };
    expect(lessonUnlocked(p, allLessons[1]!.lesson.id)).toBe(true);
    expect(nextLesson(p)?.lesson.id).toBe(allLessons[1]!.lesson.id);
  });
  it('achievements', () => {
    const p = initialProgress();
    expect(newAchievements(p, { now: new Date() })).toEqual([]);
    p.stats.commands = 1;
    p.stats.pipes = 1;
    const m = modules[0]!;
    for (const l of m.lessons) p.lessons[l.id] = { completedAt: 1, step: 0, hints: 0, xp: 1 };
    const got = newAchievements(p, { now: new Date(), events: [{ type: 'easterEgg', id: 'rm-rf-root' }] });
    expect(got).toEqual(expect.arrayContaining(['first-command', 'first-pipe', 'first-lesson', 'module-done', 'no-hints-module', 'rm-rf-root']));
    p.achievements['first-command'] = 1;
    expect(newAchievements(p, { now: new Date() })).not.toContain('first-command');
  });
});
