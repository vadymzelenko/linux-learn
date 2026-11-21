import { describe, expect, it } from 'vitest';
import { evaluateChecks, type Check } from '../src';
import { term } from './helpers';

const ID = '~/.gitconfig';
const who = { files: { [ID]: '[user]\n\tname = Student\n\temail = student@example.com\n' } };

function repo() {
  const t = term(who);
  t.$('mkdir site && cd site && git init -q');
  return t;
}
const ev = (t: ReturnType<typeof term>, checks: Check[]) => evaluateChecks(checks, { session: t.session, executed: [], lastOutput: '', lastExitCode: 0 }).passed;

describe('git: local repository', () => {
  it('init, status, add, commit, log', () => {
    const t = term();
    expect(t.$('git status')).toMatch(/not a git repository/);
    expect(t.code).toBe(128);
    t.$('mkdir site && cd site');
    expect(t.$('git init')).toBe('Initialized empty Git repository in /home/student/site/.git/\n');
    t.$('echo "# Site" > README.md');
    expect(t.$('git status')).toContain('Untracked files:\n  (use "git add <file>..." to include in what will be committed)\n\tREADME.md\n');
    t.$('git add README.md');
    expect(t.$('git status')).toContain('Changes to be committed:\n  (use "git rm --cached <file>..." to unstage)\n\tnew file:   README.md');
    expect(t.$('git commit -m "First"')).toMatch(/Author identity unknown/);
    t.$('git config --global user.name "Student"');
    t.$('git config --global user.email s@example.com');
    expect(t.$('cat ~/.gitconfig')).toBe('[user]\n\tname = Student\n\temail = s@example.com\n');
    expect(t.$('git commit -m "First commit"')).toMatch(/^\[main \(root-commit\) [0-9a-f]{7}\] First commit\n 1 file changed, 1 insertion\(\+\)\n create mode 100644 README.md\n$/);
    expect(t.$('git status')).toBe('On branch main\nnothing to commit, working tree clean\n');
    expect(t.$('git log')).toMatch(/^commit [0-9a-f]{40} \(HEAD -> main\)\nAuthor: Student <s@example.com>\nDate:   \w{3} \w{3} \d+ [\d:]{8} \d{4} \+0000\n\n    First commit\n$/);
    expect(t.$('cat .git/HEAD')).toBe('ref: refs/heads/main\n');
  });

  it('short status, diff, collapsed untracked dirs, .gitignore', () => {
    const t = repo();
    t.$('echo a > a.txt && git add . && git commit -qm one');
    t.$('echo b >> a.txt; mkdir css; echo x > css/s.css; echo log > debug.log; echo "*.log" > .gitignore');
    expect(t.$('git status -s')).toBe(' M a.txt\n?? .gitignore\n?? css/\n');
    expect(t.$('git diff')).toBe('diff --git a/a.txt b/a.txt\n--- a/a.txt\n+++ b/a.txt\n@@ -1 +1,2 @@\n a\n+b\n');
    t.$('git add a.txt');
    expect(t.$('git diff')).toBe('');
    expect(t.$('git diff --staged')).toContain('+b');
    t.$('git restore --staged a.txt');
    expect(t.$('git status -s')).toContain(' M a.txt');
    t.$('git restore a.txt');
    expect(t.$('cat a.txt')).toBe('a\n');
    expect(ev(t, [{ type: 'git', path: '~/site', ignored: '~/site/debug.log' }])).toBe(true);
  });

  it('branches, fast-forward and a conflict', () => {
    const t = repo();
    t.$('echo base > f && git add f && git commit -qm base');
    t.$('git switch -c feature && echo feat >> f && git commit -qam feat');
    t.$('git switch main');
    expect(t.$('cat f')).toBe('base\n');
    expect(t.$('git merge feature')).toMatch(/^Updating [0-9a-f]{7}\.\.[0-9a-f]{7}\nFast-forward\n f \| +1 \+\n 1 file changed, 1 insertion\(\+\)\n$/);
    t.$('git switch -c b2 && echo B > f && git commit -qam b2 && git switch main && echo M > f && git commit -qam m');
    expect(t.$('git merge b2')).toBe('Auto-merging f\nCONFLICT (content): Merge conflict in f\nAutomatic merge failed; fix conflicts and then commit the result.\n');
    expect(t.$('cat f')).toBe('<<<<<<< HEAD\nM\n=======\nB\n>>>>>>> b2\n');
    expect(ev(t, [{ type: 'git', path: '~/site', merging: true }])).toBe(true);
    expect(t.$('git commit -m x')).toMatch(/unmerged files/);
    t.$('echo MB > f && git add f && git commit -qm "Merge b2"');
    expect(ev(t, [{ type: 'git', path: '~/site', merging: false, merged: 'b2', clean: true, commits: 5, message: '^merge b2$' }])).toBe(true);
    expect(t.$('git log --oneline -1')).toMatch(/\(HEAD -> main\) Merge b2/);
  });

  it('switching with uncommitted changes that would be lost is refused', () => {
    const t = repo();
    t.$('echo 1 > f && git add f && git commit -qm one && git switch -c b && echo 2 > f && git commit -qam two && git switch main');
    t.$('echo dirty > f');
    expect(t.$('git switch b')).toMatch(/would be overwritten by checkout:\n\tf\n/);
    t.$('git stash');
    expect(t.$('cat f')).toBe('1\n');
    expect(t.$('git stash list')).toMatch(/^stash@\{0\}: WIP on main/);
    t.$('git stash pop');
    expect(t.$('cat f')).toBe('dirty\n');
  });

  it('reset, revert, tag, show', () => {
    const t = repo();
    t.$('echo 1 > f && git add f && git commit -qm one && echo 2 > f && git commit -qam two');
    expect(t.$('git show HEAD:f')).toBe('2\n');
    t.$('git revert HEAD');
    expect(t.$('cat f')).toBe('1\n');
    expect(t.$('git log --oneline -1')).toMatch(/Revert "two"/);
    t.$('git tag v1.0');
    expect(t.$('git tag')).toBe('v1.0\n');
    t.$('git reset --hard HEAD~2');
    expect(t.$('git log --oneline')).toMatch(/^[0-9a-f]{7} \(HEAD -> main\) one\n$/);
  });
});

describe('git + simulated GitHub', () => {
  it('create, push, clone, pull, pull request', () => {
    const t = repo();
    t.$('echo "# Site" > README.md && git add . && git commit -qm init');
    expect(t.$('gh repo create site --public')).toBe('✓ Created repository student/site on GitHub\n  https://github.com/student/site\n');
    t.$('git remote add origin https://github.com/student/site.git');
    expect(t.$('git push')).toMatch(/has no upstream branch/);
    expect(t.$('git push -u origin main')).toMatch(/ \* \[new branch\]      main -> main\nbranch 'main' set up to track 'origin\/main'\.\n$/);
    expect(ev(t, [{ type: 'git', path: '~/site', pushed: 'main', remote: 'origin' }, { type: 'github', repo: 'site', file: 'README.md', commits: 1 }])).toBe(true);
    // a colleague pushes
    t.$('cd ~ && git clone -q https://github.com/student/site.git other 2>/dev/null; cd other && echo more >> README.md && git commit -qam more && git push -q 2>/dev/null; cd ~/site');
    t.$('echo local > notes.txt && git add . && git commit -qm notes');
    expect(t.$('git push')).toMatch(/! \[rejected\]        main -> main \(fetch first\)/);
    t.$('git pull');
    expect(t.$('git log --oneline -1')).toMatch(/Merge branch 'main' of https:\/\/github.com\/student\/site.git/);
    expect(t.$('git push')).toMatch(/main -> main/);
    // pull request
    t.$('git switch -c contact && echo hi > contact.html && git add . && git commit -qm "Contact page" && git push -u origin contact');
    expect(t.$('gh pr create --title "Contact page" --body "New page"')).toContain('https://github.com/student/site/pull/1');
    expect(t.$('gh pr list')).toContain('#1\tContact page\tcontact\tOPEN');
    expect(t.$('gh pr merge 1 --merge --delete-branch')).toBe('✓ Merged pull request student/site#1 (Contact page)\n✓ Deleted remote branch contact\n');
    t.$('git switch main && git pull');
    expect(t.$('ls')).toContain('contact.html');
    expect(ev(t, [{ type: 'github', repo: 'student/site', merged: 1, prs: 1 }])).toBe(true);
  });

  it('clone of a missing repository fails like GitHub', () => {
    const t = term(who);
    expect(t.$('git clone https://github.com/student/nope.git')).toBe("remote: Repository not found.\nfatal: repository 'https://github.com/student/nope.git/' not found\n");
    expect(t.code).toBe(128);
  });
});
