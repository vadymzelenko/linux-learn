import { describe, expect, it } from 'vitest';
import { explain, evaluateChecks, type Check } from '../src';
import { term } from './helpers';

const who = { files: { '~/.gitconfig': '[user]\n\tname = Student\n\temail = student@example.com\n' } };
function repo(tty = false) {
  const t = term(who, { tty });
  t.$('mkdir r && cd r && git init -q && echo a > a.txt && echo b > b.txt && git add . && git commit -qm one');
  return t;
}
const ev = (t: ReturnType<typeof term>, checks: Check[]) => evaluateChecks(checks, { session: t.session, executed: [], lastOutput: '', lastExitCode: 0 }).passed;

describe('git: more commands', () => {
  it('version, help, unknown commands, -C', () => {
    const t = term(who);
    expect(t.$('git --version')).toBe('git version 2.43.0\n');
    expect(t.$('git')).toMatch(/^usage: git/);
    expect(t.$('git stauts')).toMatch(/'stauts' is not a git command[\s\S]*status/);
    t.$('mkdir p && git -C p init -q');
    expect(t.$('git -C p status')).toMatch(/On branch main/);
    expect(t.$('git -C nowhere status')).toMatch(/cannot change to/);
    expect(t.$('git init --bare -b trunk remote.git')).toMatch(/Initialized empty Git repository in \/home\/student\/remote\.git\//);
    expect(t.$('git init p')).toMatch(/Reinitialized/);
    expect(t.$('cd remote.git && git status')).toMatch(/must be run in a work tree/);
  });

  it('config: get, list, unset, local', () => {
    const t = repo();
    expect(t.$('git config user.name')).toBe('Student\n');
    expect(t.$('git config --global --list')).toContain('user.email=student@example.com');
    t.$('git config user.name "Local Name"');
    expect(t.$('git config user.name')).toBe('Local Name\n');
    expect(t.$('git config --list')).toContain('user.name=Local Name');
    expect(t.$('cat .git/config')).toContain('[user]\n\tname = Local Name');
    t.$('git config --unset user.name');
    expect(t.$('git config user.name')).toBe('Student\n');
    t.$('git config --global --unset user.email');
    expect(t.$('git config --global user.email; echo $?')).toBe('1\n');
    expect(t.$('git config nokey')).toMatch(/does not contain a section/);
    expect(t.$('cd ~ && git config core.x 1')).toMatch(/not in a git directory/);
  });

  it('status variants: modified, deleted, staged deletions, subdirectory paths', () => {
    const t = repo(true);
    t.$('rm b.txt; echo z >> a.txt; mkdir sub; echo s > sub/s.txt');
    const st = t.$('git status');
    expect(st).toContain('modified:   a.txt');
    expect(st).toContain('deleted:    b.txt');
    expect(st).toContain('use "git add/rm <file>..."');
    t.$('git add -A');
    expect(t.$('git status -s')).toContain('D');
    t.$('cd sub');
    expect(t.$('git status')).toContain('../a.txt');
    t.$('cd .. && git commit -qm two');
    expect(t.$('git log --oneline')).toMatch(/two[\s\S]*one/);
  });

  it('add errors, ignored files, rm and mv', () => {
    const t = repo();
    expect(t.$('git add')).toMatch(/Nothing specified/);
    expect(t.$('git add nope.txt')).toMatch(/did not match any files/);
    t.$('echo "*.log" > .gitignore && echo x > x.log');
    expect(t.$('git add x.log')).toMatch(/ignored by one of your .gitignore files/);
    t.$('echo c > c.txt && git add "*.txt"');
    expect(t.$('git status -s')).toContain('A  c.txt');
    expect(t.$('git rm b.txt')).toBe("rm 'b.txt'\n");
    expect(t.$('ls')).not.toContain('b.txt');
    expect(t.$('git rm --cached a.txt')).toBe("rm 'a.txt'\n");
    expect(t.$('ls')).toContain('a.txt');
    expect(t.$('git rm nope')).toMatch(/did not match/);
    t.$('git add a.txt && git commit -qm x');
    t.$('git mv a.txt renamed.txt');
    expect(t.$('git status -s')).toContain('renamed.txt');
    expect(t.$('git mv ghost y')).toMatch(/not under version control/);
    expect(t.$('git mv onlyone')).toMatch(/usage/);
  });

  it('commit: no message, nothing to commit, amend, empty message', () => {
    const t = repo();
    expect(t.$('git commit')).toMatch(/no text editor/);
    expect(t.$('git commit -m ""')).toMatch(/empty commit message/);
    expect(t.$('git commit -m nothing')).toBe('On branch main\nnothing to commit, working tree clean\n');
    t.$('echo q > q.txt');
    expect(t.$('git commit -m nothing')).toMatch(/untracked files present/);
    t.$('echo more >> a.txt');
    expect(t.$('git commit -m nothing')).toMatch(/no changes added to commit/);
    t.$('git commit -qam "tpyo"');
    t.$('git commit --amend -m "typo fixed"');
    expect(t.$('git log --oneline -1')).toContain('typo fixed');
    expect(t.$('git log --oneline').trim().split('\n')).toHaveLength(2);
    t.$('git commit --amend --no-edit');
    expect(t.$('git log -n 1')).toContain('typo fixed');
  });

  it('log ranges, graph, paths, show variants', () => {
    const t = repo(true);
    t.$('echo 2 >> a.txt && git commit -qam two && echo 3 >> b.txt && git commit -qam three');
    expect(t.$('git log --oneline HEAD~2..HEAD')).toMatch(/three[\s\S]*two/);
    expect(t.$('git log --oneline -- a.txt')).not.toContain('three');
    expect(t.$('git log --pretty=oneline -1')).toContain('three');
    expect(t.$('git log --graph -1')).toContain('* ');
    expect(t.$('git show HEAD^')).toContain('+2');
    expect(t.$('git show HEAD~1:a.txt')).toBe('a\n2\n');
    expect(t.$('git show HEAD:missing')).toMatch(/does not exist/);
    expect(t.$('git show nonsense')).toMatch(/unknown revision/);
    const id = t.$('git log --oneline -1').replace(/\x1b\[[0-9;]*m/g, '').slice(0, 7);
    expect(t.$(`git show --stat ${id}`)).toContain('b.txt');
    t.$('mkdir e && cd e && git init -q');
    expect(t.$('git log')).toMatch(/does not have any commits yet/);
  });

  it('diff variants', () => {
    const t = repo();
    t.$('echo 2 >> a.txt && git commit -qam two');
    expect(t.$('git diff HEAD~1 HEAD')).toContain('+2');
    expect(t.$('git diff HEAD~1..HEAD')).toContain('+2');
    expect(t.$('git diff HEAD~1 --stat')).toContain('a.txt');
    t.$('echo 3 >> a.txt && echo x >> b.txt');
    expect(t.$('git diff a.txt')).not.toContain('b.txt');
    expect(t.$('git diff --stat')).toMatch(/2 files changed, 2 insertions\(\+\)/);
    t.$('git add a.txt');
    expect(t.$('git diff --cached HEAD~1')).toContain('+3');
    // long file: two separate hunks
    t.$('seq 1 30 > n.txt && git add n.txt && git commit -qm n && sed -i "s/^2$/two/; s/^28$/twenty-eight/" n.txt');
    expect(t.$('git diff n.txt').match(/@@/g)?.length).toBe(4);
  });

  it('branch management', () => {
    const t = repo();
    t.$('git branch dev && git branch old HEAD');
    expect(t.$('git branch')).toBe('  dev\n* main\n  old\n');
    expect(t.$('git branch -v')).toMatch(/\* main [0-9a-f]{7} one/);
    expect(t.$('git branch dev')).toMatch(/already exists/);
    expect(t.$('git branch bad..name')).toMatch(/not a valid branch name/);
    expect(t.$('git branch x nosuch')).toMatch(/not a valid object name/);
    t.$('git branch -m old older');
    expect(t.$('git branch')).toContain('older');
    t.$('git branch -M trunk');
    expect(t.$('git branch')).toContain('* trunk');
    expect(t.$('git branch -d trunk')).toMatch(/cannot delete branch/);
    expect(t.$('git branch -d ghost')).toMatch(/not found/);
    t.$('git switch -q dev && echo d > d.txt && git add . && git commit -qm d && git switch -q trunk');
    expect(t.$('git branch -d dev')).toMatch(/not fully merged/);
    expect(t.$('git branch -D dev')).toMatch(/^Deleted branch dev/);
    expect(t.$('git switch nope')).toMatch(/invalid reference/);
    expect(t.$('git switch trunk')).toMatch(/Already on 'trunk'/);
    expect(t.$('git switch')).toMatch(/missing branch/);
    expect(t.$('git switch -c older')).toMatch(/already exists/);
    expect(t.$('git switch -c z nosuch')).toMatch(/invalid reference/);
  });

  it('checkout: -b, files, detached HEAD', () => {
    const t = repo();
    expect(t.$('git checkout -b feat')).toBe("Switched to a new branch 'feat'\n");
    t.$('echo broken > a.txt');
    t.$('git checkout -- a.txt');
    expect(t.$('cat a.txt')).toBe('a\n');
    t.$('echo broken > a.txt && git checkout a.txt');
    expect(t.$('cat a.txt')).toBe('a\n');
    t.$('echo 2 >> a.txt && git commit -qam two');
    expect(t.$('git checkout HEAD~1')).toMatch(/detached HEAD/);
    expect(t.$('git status')).toMatch(/HEAD detached at/);
    expect(t.$('git branch')).toMatch(/HEAD detached at/);
    t.$('git checkout feat');
    expect(t.$('cat a.txt')).toBe('a\n2\n');
    expect(t.$('git checkout')).toBe('');
  });

  it('merge: no-ff, already up to date, abort, combining different lines, errors', () => {
    const t = repo();
    t.$('printf "1\\n2\\n3\\n" > n.txt && git add n.txt && git commit -qm n');
    t.$('git switch -qc x && sed -i "s/1/one/" n.txt && git commit -qam x1 && git switch -q main');
    t.$('sed -i "s/3/three/" n.txt && git commit -qam m3');
    expect(t.$('git merge x')).toMatch(/Merge made by the 'ort' strategy/);
    expect(t.$('cat n.txt')).toBe('one\n2\nthree\n');
    expect(t.$('git merge x')).toBe('Already up to date.\n');
    t.$('git switch -qc y && echo y > y.txt && git add . && git commit -qm y && git switch -q main');
    expect(t.$('git merge --no-ff y -m "Merge y"')).toMatch(/Merge made/);
    expect(t.$('git log --oneline -1')).toContain('Merge y');
    expect(t.$('git merge nothing')).toMatch(/not something we can merge/);
    expect(t.$('git merge')).toMatch(/No remote/);
    expect(t.$('git merge --abort')).toMatch(/no merge to abort/i);
    t.$('git switch -qc c1 && echo C1 > a.txt && git commit -qam c1 && git switch -q main && echo M > a.txt && git commit -qam cm');
    t.$('git merge c1');
    expect(t.$('git merge c1')).toMatch(/unmerged files/);
    t.$('git merge --abort');
    expect(t.$('cat a.txt')).toBe('M\n');
    expect(ev(t, [{ type: 'git', path: '~/r', merging: false, clean: true }])).toBe(true);
  });

  it('reset variants, revert errors, stash edge cases, tags', () => {
    const t = repo();
    t.$('echo 2 >> a.txt && git commit -qam two');
    t.$('git reset --soft HEAD~1');
    expect(t.$('git status -s')).toBe('M  a.txt\n');
    t.$('git reset');
    expect(t.$('git status -s')).toBe(' M a.txt\n');
    t.$('git add a.txt && git reset a.txt');
    expect(t.$('git status -s')).toBe(' M a.txt\n');
    expect(t.$('git reset nosuch')).toMatch(/ambiguous argument 'nosuch'/);
    expect(t.$('git revert HEAD')).toMatch(/local changes would be overwritten/);
    t.$('git restore a.txt');
    expect(t.$('git revert nosuch')).toMatch(/bad revision/);
    expect(t.$('git stash')).toBe('No local changes to save\n');
    expect(t.$('git stash pop')).toMatch(/No stash entries/);
    t.$('echo w >> a.txt && git stash && git stash apply');
    expect(t.$('git stash list')).toMatch(/stash@\{0\}/);
    t.$('git stash drop');
    expect(t.$('git stash list')).toBe('');
    t.$('git restore a.txt && git tag v1 && git tag v0 HEAD');
    expect(t.$('git tag v1')).toMatch(/already exists/);
    expect(t.$('git tag x nosuch')).toMatch(/Failed to resolve/);
    expect(t.$('git log --oneline -1')).toContain('tag: v');
    expect(t.$('git tag -d v0')).toMatch(/Deleted tag 'v0'/);
    expect(t.$('git tag -d v0')).toMatch(/not found/);
    expect(ev(t, [{ type: 'git', path: '~/r', tag: 'v1' }])).toBe(true);
  });

  it('remotes: add, -v, get-url, set-url, remove, errors', () => {
    const t = repo();
    t.$('git remote add origin https://github.com/student/r.git');
    expect(t.$('git remote')).toBe('origin\n');
    expect(t.$('git remote -v')).toContain('origin\thttps://github.com/student/r.git (push)');
    expect(t.$('git remote add origin x')).toMatch(/already exists/);
    expect(t.$('git remote add')).toMatch(/usage/);
    t.$('git remote set-url origin git@github.com:student/r.git');
    expect(t.$('git remote get-url origin')).toBe('git@github.com:student/r.git\n');
    expect(t.$('git remote get-url nope')).toMatch(/No such remote/);
    expect(t.$('git remote set-url nope x')).toMatch(/No such remote/);
    expect(t.$('git remote frob')).toMatch(/unknown subcommand/);
    expect(t.$('git push origin main')).toMatch(/Repository not found/);
    t.$('git remote remove origin');
    expect(t.$('git remote remove origin')).toMatch(/No such remote/);
    expect(t.$('git push')).toMatch(/No configured push destination/);
    expect(t.$('git fetch')).toMatch(/No remote repository specified/);
    expect(t.$('git pull')).toMatch(/No remote repository specified/);
  });

  it('local bare remote: push, fetch, branches tracking, force push, pull with conflict', () => {
    const t = repo();
    t.$('git init -q --bare ~/hub.git && git remote add origin ~/hub.git && git push -qu origin main');
    expect(t.$('git push')).toBe('Everything up-to-date\n');
    t.$('cd ~ && git clone -q hub.git other && cd other && echo X > a.txt && git commit -qam x && git push -q && git switch -qc side && git push -qu origin side && cd ~/r');
    expect(t.$('git fetch')).toMatch(/\* \[new branch\]\s+side\s+-> origin\/side/);
    expect(t.$('git status')).toMatch(/behind 'origin\/main' by 1 commit/);
    expect(t.$('git branch -r')).toContain('origin/side');
    expect(t.$('git switch side')).toMatch(/set up to track 'origin\/side'/);
    t.$('git switch -q main && echo Y > a.txt && git commit -qam y');
    expect(t.$('git status')).toMatch(/have diverged/);
    expect(t.$('git push')).toMatch(/rejected/);
    expect(t.$('git pull')).toMatch(/CONFLICT/);
    t.$('git merge --abort');
    expect(t.$('git push --force')).toMatch(/forced update/);
    t.$('git switch -qc lonely');
    expect(t.$('git pull')).toMatch(/no tracking information/);
    expect(t.$('git push origin nosuch')).toMatch(/src refspec nosuch does not match/);
    t.$('git branch -u origin/main');
    expect(t.$('git status')).toMatch(/origin\/main/);
    expect(t.$('cd ~ && git clone hub.git other 2>&1')).toMatch(/already exists and is not an empty directory/);
    expect(t.$('git clone')).toMatch(/must specify a repository/);
    expect(t.$('git clone /nope/x.git')).toMatch(/does not appear to be a git repository/);
  });
});

describe('gh: more', () => {
  function pub() {
    const t = repo();
    t.$('gh repo create r --public --description "Demo" && git remote add origin https://github.com/student/r.git && git push -qu origin main');
    return t;
  }
  it('auth, help, version, repo list/view/clone, errors', () => {
    const t = pub();
    expect(t.$('gh auth status')).toContain('Logged in to github.com account student');
    expect(t.$('gh auth login')).toContain('Already logged in');
    expect(t.$('gh')).toContain('USAGE');
    expect(t.$('gh --version')).toMatch(/^gh version/);
    expect(t.$('gh repo list')).toContain('student/r\tpublic');
    expect(t.$('gh repo view')).toContain('Demo');
    expect(t.$('gh repo create r')).toMatch(/already exists/);
    expect(t.$('gh repo create')).toMatch(/name argument required/);
    expect(t.$('cd ~ && gh repo clone r copy 2>&1 && ls copy')).toContain('a.txt');
    expect(t.$('gh repo clone')).toMatch(/repository argument required/);
    expect(t.$('gh repo create made --private --clone 2>&1')).toContain('Created repository student/made');
    expect(t.$('gh frob')).toMatch(/unknown command/);
    expect(t.$('cd /tmp && gh pr list')).toMatch(/no git remotes found/);
  });
  it('issues and pull requests: view, checkout, squash, rebase, close, errors', () => {
    const t = pub();
    expect(t.$('gh issue create')).toMatch(/must provide/);
    t.$('gh issue create --title "Bug" --body "b"');
    expect(t.$('gh issue list')).toContain('#1\tBug');
    expect(t.$('gh issue close 1')).toContain('Closed issue');
    expect(t.$('gh issue list')).toMatch(/no open issues/);
    expect(t.$('gh issue close 9')).toMatch(/Could not resolve/);
    expect(t.$('gh pr create --title x')).toMatch(/same as base branch/);
    t.$('git switch -qc f1 && echo f > f.txt && git add . && git commit -qm "F one"');
    expect(t.$('gh pr create --title x')).toMatch(/must first push/);
    t.$('git push -qu origin f1');
    expect(t.$('gh pr create')).toMatch(/must provide/);
    expect(t.$('gh pr create --fill')).toContain('/pull/2');
    expect(t.$('gh pr create --title again')).toMatch(/already exists/);
    expect(t.$('gh pr view 2')).toMatch(/F one #2\nOpen • student wants to merge 1 commit into main from f1/);
    expect(t.$('gh pr merge 2 --squash')).toContain('Squashed and merged');
    expect(t.$('gh pr merge 2')).toMatch(/already merged/);
    t.$('git switch -q main && git pull -q && git switch -qc f2 && echo g > g.txt && git add . && git commit -qm g && git push -qu origin f2');
    t.$('gh pr create --title g --body ""');
    t.$('git switch -q main');
    expect(t.$('gh pr checkout 3')).toMatch(/Switched to branch 'f2'|Already on/);
    expect(t.$('gh pr merge 3 --rebase')).toContain('Rebased and merged');
    t.$('git switch -qc f3 main && echo h > h.txt && git add . && git commit -qm h && git push -qu origin f3 && gh pr create --title h --body h');
    expect(t.$('gh pr close 4')).toContain('Closed pull request');
    expect(t.$('gh pr merge 99')).toMatch(/Could not resolve/);
    expect(t.$('gh pr create --title nothing --head f2')).toMatch(/No commits between/);
  });
  it('merging a PR when main moved on: clean merge and a conflict', () => {
    const t = pub();
    t.$('git switch -qc p1 && echo p > p.txt && git add . && git commit -qm p && git push -qu origin p1 && gh pr create --title p --body p');
    t.$('git switch -q main && echo m > m.txt && git add . && git commit -qm m && git push -q');
    expect(t.$('gh pr merge 1 --merge')).toContain('Merged pull request');
    t.$('git pull -q');
    expect(t.$('ls')).toMatch(/m\.txt[\s\S]*p\.txt/);
    t.$('git switch -qc p2 && echo P2 > a.txt && git commit -qam p2 && git push -qu origin p2 && gh pr create --title p2 --body p2');
    t.$('git switch -q main && echo M2 > a.txt && git commit -qam m2 && git push -q');
    expect(t.$('gh pr merge 2 --merge')).toMatch(/is not mergeable/);
    expect(evaluateChecks([{ type: 'github', repo: 'student/r', prs: 2, merged: 1, branch: 'p2', commits: 3, file: 'm.txt' }], { session: t.session, executed: [], lastOutput: '', lastExitCode: 0 }).passed).toBe(true);
    expect(evaluateChecks([{ type: 'github', repo: 'nope', exists: false }, { type: 'github', repo: 'r', issues: 0 }], { session: t.session, executed: [], lastOutput: '', lastExitCode: 0 }).passed).toBe(true);
    expect(evaluateChecks([{ type: 'git', path: '~/nowhere', commits: 1 }], { session: t.session, executed: [], lastOutput: '', lastExitCode: 0 }).passed).toBe(false);
  });
});

describe('explain: git and gh', () => {
  const parts = (l: string) => explain(l).parts.map((p) => `${p.kind}:${p.text}${p.key ? ':' + p.key : ''}`);
  it('describes subcommands, branches, remotes, commits', () => {
    expect(parts('git push -u origin main')).toEqual(expect.arrayContaining(['arg:origin:explain.arg.remote', 'arg:main:explain.arg.branch']));
    expect(parts('git switch -c feature')).toEqual(expect.arrayContaining(['value:feature:explain.optionValue']));
    expect(parts('git merge feature')).toContain('arg:feature:explain.arg.branch');
    expect(parts('git reset --hard HEAD~1')).toContain('arg:HEAD~1:explain.arg.revision');
    expect(parts('git log --oneline -5')).toContain('flag:-5:explain.git.lastN');
    expect(parts('git clone https://github.com/a/b.git site')).toEqual(expect.arrayContaining(['arg:site:explain.arg.newDir']));
    expect(parts('git remote add origin https://github.com/a/b.git')).toContain('arg:origin:explain.arg.remote');
    expect(parts('git config --global user.name Anna')).toEqual(expect.arrayContaining(['arg:user.name:explain.arg.configKey', 'arg:Anna:explain.arg.configValue']));
    expect(parts('git tag v1.0')).toContain('arg:v1.0:explain.arg.revision');
    expect(parts('git -C ~/site status')).toContain('flag:-C:explain.git.dirOpt');
    expect(parts('git add -- a.txt')).toContain('flag:--:explain.endOfOptions');
    expect(parts('gh pr merge 3 --squash')).toContain('arg:3:explain.arg.prNumber');
    expect(parts('gh repo clone student/site')).toContain('arg:student/site:explain.arg.repoName');
    expect(parts('git')).toEqual(['command:git']);
  });
});
