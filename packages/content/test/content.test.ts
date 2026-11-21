import { describe, expect, it } from 'vitest';
import { lintContent, solveTask } from '../src/lint';
import { allLessons, challenges, examTasks, findChallenge, levelFor, LEVELS, modules, prepareSession, resolveSetup, stepXp, tr } from '../src';

describe('content', () => {
  it('passes the linter: every task is solvable, no schema errors', () => {
    const issues = lintContent();
    expect(issues.filter((i) => i.level === 'error')).toEqual([]);
  });

  it('is fully translated into en, ru and uk', () => {
    expect(lintContent().filter((i) => i.message.startsWith('missing translation'))).toEqual([]);
  });

  it('has the release volume from the spec', () => {
    expect(modules.length).toBeGreaterThanOrEqual(6);
    expect(allLessons.length).toBeGreaterThanOrEqual(30);
  });

  it('the linter catches a broken task', () => {
    const broken = {
      setup: 'home-basic',
      checks: [{ type: 'dirExists' as const, path: '~/project', label: { en: 'x' } }],
      hints: { command: 'mkdir' },
      solution: ['mkdir projekt'],
    };
    expect(solveTask(broken)).toMatch(/does not pass/);
    expect(solveTask({ ...broken, solution: ['mkdri project'] })).toMatch(/command not found/);
    expect(solveTask({ ...broken, checks: [{ type: 'dirExists', path: '~/docs', label: { en: 'x' } }] })).toMatch(/already solved/);
  });

  it('helpers', () => {
    expect(tr({ en: 'Hi', uk: 'Привіт' }, 'uk')).toBe('Привіт');
    expect(tr({ en: 'Hi' }, 'pl')).toBe('Hi');
    expect(tr(undefined, 'en')).toBe('');
    expect(() => resolveSetup('nope')).toThrow();
    expect(prepareSession('home-basic', ['cd docs']).cwd).toBe('/home/student/docs');
    expect(prepareSession('home-basic', ['cd docs']).history).toEqual([]);
    expect(levelFor(0)).toMatchObject({ id: 'newbie', next: 150 });
    expect(levelFor(10_000)).toMatchObject({ id: 'root', next: null });
    expect(LEVELS.length).toBe(7);
    expect(stepXp({ type: 'quiz' } as never)).toBe(5);
    expect(examTasks().length).toBeGreaterThanOrEqual(10);
  });

  it('practice tasks have unique ids and are found by id', () => {
    expect(new Set(challenges.map((c) => c.id)).size).toBe(challenges.length);
    for (const c of challenges) expect(findChallenge(c.id)).toBe(c);
  });
});
