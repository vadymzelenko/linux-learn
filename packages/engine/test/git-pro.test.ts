import { describe, expect, it } from 'vitest';
import { evaluateChecks, type Check } from '../src';
import { term } from './helpers';

const spec = { files: { '~/.gitconfig': '[user]\n\tname = Student\n\temail = student@example.com\n', '~/p/a.txt': 'one\ntwo\n', '~/p/b.txt': 'b\n' } };
const setup = (t: ReturnType<typeof term>) => {
  for (const l of ['cd ~/p', 'git init -q', 'git add .', 'git commit -qm "Start"', 'echo three >> a.txt', 'git commit -qam "Third line"']) t.$(l);
};
const ev = (t: ReturnType<typeof term>, c: Check[]) => evaluateChecks(c, { session: t.session, executed: [], lastOutput: '', lastExitCode: 0 }).passed;

describe('git: stash, log filters, tags, cherry-pick, blame, releases', () => {
  it('stash with a message, show, drop by index, clear', () => {
    const t = term(spec);
    setup(t);
    t.$('echo draft >> b.txt');
    expect(t.$('git stash push -m "wip b"')).toContain('On main: wip b');
    expect(t.$('git stash list')).toBe('stash@{0}: On main: wip b\n');
    expect(t.$('git stash show')).toContain('b.txt');
    expect(t.$('git stash drop stash@{3}')).toContain('not a valid reference');
    expect(t.$('git stash drop')).toMatch(/^Dropped stash@\{0\} \(/);
    expect(t.$('git stash pop')).toContain('No stash entries');
    expect(t.$('git stash')).toContain('No local changes');
    t.$('echo x >> b.txt');
    t.$('git stash');
    t.$('git stash clear');
    expect(t.$('git stash list')).toBe('');
  });

  it('log --grep and --author', () => {
    const t = term(spec);
    setup(t);
    t.$('git -c user.name=Anna -c user.email=anna@example.com commit -q --allow-empty -m "Docs fix"');
    expect(t.$('git log --oneline --grep=Third')).toContain('Third line');
    expect(t.$('git log --oneline --grep=Third')).not.toContain('Start');
    expect(t.$('git log --oneline -i --grep third')).toContain('Third line');
    expect(t.$('git log --oneline --author=Anna').trim().split('\n')).toHaveLength(1);
  });

  it('tags pushed to GitHub and releases', () => {
    const t = term(spec);
    setup(t);
    t.$('gh repo create p --public');
    t.$('git remote add origin https://github.com/student/p.git');
    t.$('git switch -qc feature');
    expect(t.$('git push -u origin main')).toContain("branch 'main' set up to track 'origin/main'");
    t.$('git switch -q main');
    t.$('git tag v1.0');
    t.$('git tag v1.1');
    expect(t.$('git push origin v1.0')).toContain('[new tag]         v1.0 -> v1.0');
    expect(t.$('git push --tags')).toContain('v1.1 -> v1.1');
    expect(t.$('git push --tags')).toContain('Everything up-to-date');
    expect(ev(t, [{ type: 'github', repo: 'p', tag: 'v1.1' }])).toBe(true);
    expect(t.$('gh release list')).toContain('no releases');
    expect(t.$('gh release create v1.0 --title "First release" --notes "Hello"')).toContain('/releases/tag/v1.0');
    expect(t.$('gh release create v1.0')).toContain('already exists');
    expect(t.$('gh release create v2.0')).toContain('/releases/tag/v2.0');
    expect(t.$('gh release create')).toContain('no tag name');
    expect(t.$('gh release list')).toMatch(/^v2\.0\tLatest/);
    expect(t.$('gh release view v1.0')).toContain('Hello');
    expect(t.$('gh release view nope')).toContain('not found');
    expect(t.$('gh release frob')).toContain('unknown command');
    expect(ev(t, [{ type: 'github', repo: 'p', release: 'v1.0', file: 'a.txt', fileContains: 'three' }])).toBe(true);
    expect(ev(t, [{ type: 'github', repo: 'p', release: 'v9' }])).toBe(false);
    t.$('git tag -d v1.1');
    t.$('git tag v1.1 HEAD~1');
    expect(t.$('git push origin v1.1')).toContain('already exists');
  });

  it('cherry-pick and blame', () => {
    const t = term(spec);
    setup(t);
    t.$('git switch -qc fix');
    t.$('echo fixed > b.txt');
    t.$('git commit -qam "Fix b"');
    t.$('echo more >> a.txt');
    t.$('git commit -qam "More a"');
    t.$('git switch -q main');
    expect(t.$('git cherry-pick fix~1')).toContain('Fix b');
    expect(t.$('cat b.txt')).toBe('fixed\n');
    expect(t.$('git log --oneline -n 1')).toContain('Fix b');
    expect(t.$('git cherry-pick nope')).toContain('bad revision');
    expect(t.$('git cherry-pick')).toContain('usage');
    t.$('echo dirty >> b.txt');
    expect(t.$('git cherry-pick fix')).toContain('would be overwritten');
    t.$('git restore b.txt');
    t.$('echo other > a.txt');
    t.$('git commit -qam "Rewrite a"');
    expect(t.$('git cherry-pick fix')).toContain('could not apply');
    const blame = t.$('git blame b.txt');
    expect(blame).toMatch(/\(Student .* 1\) fixed\n$/);
    expect(t.$('git blame a.txt')).toContain('other');
    expect(t.$('git blame nope.txt')).toContain('no such path');
    expect(t.$('git blame')).toContain('usage');
  });
});
