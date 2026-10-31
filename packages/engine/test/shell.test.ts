import { describe, expect, it } from 'vitest';
import { basic, term, NOW } from './helpers';
import { createShell, run, promptString, saveFile, isSession, migrateSession } from '../src';

describe('shell basics', () => {
  it('pwd, cd and the prompt', () => {
    const t = term(basic);
    expect(t.$('pwd')).toBe('/home/student\n');
    expect(promptString(t.session)).toBe('student@trainer:~$ ');
    t.$('cd docs');
    expect(promptString(t.session)).toBe('student@trainer:~/docs$ ');
    expect(t.$('cd -')).toBe('/home/student\n');
    t.$('cd /var/log');
    expect(t.$('pwd')).toBe('/var/log\n');
    t.$('cd');
    expect(t.$('pwd')).toBe('/home/student\n');
    t.$('cd ~/docs/..');
    expect(t.$('pwd')).toBe('/home/student\n');
  });

  it('cd errors', () => {
    const t = term(basic);
    expect(t.$('cd nope')).toBe('bash: cd: nope: No such file or directory\n');
    expect(t.code).toBe(1);
    expect(t.$('cd notes.txt')).toBe('bash: cd: notes.txt: Not a directory\n');
    expect(t.$('cd a b')).toBe('bash: cd: too many arguments\n');
    expect(t.$('cd /root')).toBe('bash: cd: /root: Permission denied\n');
  });

  it('logical vs physical pwd through symlinks', () => {
    const t = term({ files: { '~/real/': null, '~/ln': { symlink: 'real' } } });
    t.$('cd ln');
    expect(t.$('pwd')).toBe('/home/student/ln\n');
    expect(t.$('pwd -P')).toBe('/home/student/real\n');
  });

  it('command not found + suggestion event', () => {
    const t = term();
    expect(t.$('sl')).toBe('bash: sl: command not found\n');
    expect(t.code).toBe(127);
    expect(t.last.events).toContainEqual({ type: 'didYouMean', command: 'sl', suggestion: 'ls' });
    t.$('grpe');
    expect(t.last.events[0]).toMatchObject({ suggestion: 'grep' });
    t.$('qwertyuiop');
    expect(t.last.events).toEqual([]);
  });

  it('variables, export, $? and quoting', () => {
    const t = term();
    expect(t.$('echo $HOME $USER')).toBe('/home/student student\n');
    expect(t.$("echo '$HOME'")).toBe('$HOME\n');
    expect(t.$('echo "$HOME"')).toBe('/home/student\n');
    expect(t.$('echo \\$HOME')).toBe('$HOME\n');
    t.$('NAME=Linux');
    expect(t.$('echo "Hi $NAME!"')).toBe('Hi Linux!\n');
    expect(t.$('env | grep ^NAME=')).toBe('');
    t.$('export NAME');
    expect(t.$('env | grep ^NAME')).toBe('NAME=Linux\n');
    t.$('false');
    expect(t.$('echo $?')).toBe('1\n');
    expect(t.$('echo $?')).toBe('0\n');
    expect(t.$('echo ${HOME}/x')).toBe('/home/student/x\n');
    expect(t.$('echo $UNSET_VAR end')).toBe('end\n');
    expect(t.$('FOO=1 printenv FOO')).toBe('1\n');
    expect(t.$('echo $FOO')).toBe('\n');
  });

  it('word splitting of unquoted variables', () => {
    const t = term();
    t.$('X="a   b"');
    expect(t.$('echo $X')).toBe('a b\n');
    expect(t.$('echo "$X"')).toBe('a   b\n');
    t.$('touch $X');
    expect(t.$('ls')).toBe('a\nb\n');
  });

  it('&&, || and ;', () => {
    const t = term();
    expect(t.$('true && echo yes || echo no')).toBe('yes\n');
    expect(t.$('false && echo yes || echo no')).toBe('no\n');
    expect(t.$('false; echo after')).toBe('after\n');
    expect(t.$('mkdir d && cd d && pwd')).toBe('/home/student/d\n');
  });

  it('pipes', () => {
    const t = term(basic);
    expect(t.$('cat notes.txt | wc -l')).toBe('2\n');
    expect(t.$('ls | sort -r | head -1')).toBe('notes.txt\n');
    expect(t.$('echo b a c | tr " " "\\n" | sort')).toBe('a\nb\nc\n');
  });

  it('redirections', () => {
    const t = term(basic);
    t.$('echo one > f.txt');
    t.$('echo two >> f.txt');
    expect(t.$('cat f.txt')).toBe('one\ntwo\n');
    t.$('echo new > f.txt');
    expect(t.$('cat f.txt')).toBe('new\n');
    expect(t.$('cat nope 2> err.txt')).toBe('');
    expect(t.$('cat err.txt')).toBe('cat: nope: No such file or directory\n');
    expect(t.$('cat nope notes.txt > all.txt 2>&1')).toBe('');
    expect(t.$('cat all.txt')).toBe('cat: nope: No such file or directory\nhello\nworld\n');
    expect(t.$('wc -l < notes.txt')).toBe('2\n');
    expect(t.$('cat nope 2>/dev/null')).toBe('');
    expect(t.$('ls nope &> both.txt; cat both.txt')).toBe("ls: cannot access 'nope': No such file or directory\n");
    expect(t.$('echo x > missing/dir/f')).toBe('bash: missing/dir/f: No such file or directory\n');
    expect(t.$('echo x > docs')).toBe('bash: docs: Is a directory\n');
    expect(t.$('cat < nope')).toBe('bash: nope: No such file or directory\n');
    expect(t.$('echo x > /etc/passwd')).toBe('bash: /etc/passwd: Permission denied\n');
  });

  it('redirect target is created before the command runs (ls sees it)', () => {
    const t = term();
    t.$('ls > list.txt');
    expect(t.$('cat list.txt')).toBe('list.txt\n');
  });

  it('sort file > file truncates first, like bash', () => {
    const t = term({ files: { '~/f': 'b\na\n' } });
    t.$('sort f > f');
    expect(t.$('cat f')).toBe('');
  });

  it('globs', () => {
    const t = term({ files: { '~/a.txt': '', '~/b.txt': '', '~/c.md': '', '~/.hidden.txt': '', '~/dir/d.txt': '' } });
    expect(t.$('echo *.txt')).toBe('a.txt b.txt\n');
    expect(t.$('echo *')).toBe('a.txt b.txt c.md dir\n');
    expect(t.$('echo */*.txt')).toBe('dir/d.txt\n');
    expect(t.$('echo ?.md')).toBe('c.md\n');
    expect(t.$('echo [ab].txt')).toBe('a.txt b.txt\n');
    expect(t.$('echo "*.txt"')).toBe('*.txt\n');
    expect(t.$('echo *.zip')).toBe('*.zip\n');
    expect(t.$('ls *.zip')).toBe("ls: cannot access '*.zip': No such file or directory\n");
    expect(t.$('echo .*')).toBe('.bashrc .hidden.txt .profile\n');
    t.$('rm *.txt');
    expect(t.$('ls')).toBe('c.md\ndir\n');
  });

  it('command substitution', () => {
    const t = term(basic);
    expect(t.$('echo "files: $(ls | wc -l)"')).toBe('files: 2\n');
    t.$('mkdir backup-$(date +%F)');
    expect(t.$('ls -d backup-*')).toBe('backup-2026-10-31\n');
  });

  it('aliases', () => {
    const t = term(basic);
    expect(t.$('ll docs')).toContain('readme.md');
    t.$("alias hi='echo hello'");
    expect(t.$('hi there')).toBe('hello there\n');
    expect(t.$('alias hi')).toBe("alias hi='echo hello'\n");
    t.$('unalias hi');
    expect(t.$('hi')).toBe('bash: hi: command not found\n');
  });

  it('history and !!', () => {
    const t = term();
    t.$('echo one');
    t.$('echo two');
    expect(t.$('history')).toBe('    1  echo one\n    2  echo two\n    3  history\n');
    // ignoredups: repeating `history` does not add a new entry
    expect(t.$('!!')).toBe('history\n    1  echo one\n    2  echo two\n    3  history\n');
    t.$(' echo secret');
    expect(t.session.history).not.toContain(' echo secret');
    t.$('history -c');
    expect(t.session.history).toEqual([]);
  });

  it('sudo !! after permission denied', () => {
    const t = term();
    expect(t.$('cat /etc/shadow')).toBe('cat: /etc/shadow: Permission denied\n');
    expect(t.$('sudo !!')).toBe('sudo cat /etc/shadow\nroot:*:20000:0:99999:7:::\n');
  });

  it('sudo -i and exit', () => {
    const t = term();
    t.$('sudo -i');
    expect(promptString(t.session)).toBe('root@trainer:~# ');
    expect(t.$('whoami')).toBe('root\n');
    expect(t.$('pwd')).toBe('/root\n');
    expect(t.$('exit')).toBe('logout\n');
    expect(t.$('whoami')).toBe('student\n');
    expect(t.$('pwd')).toBe('/home/student\n');
    t.$('exit');
    expect(t.last.events).toContainEqual({ type: 'exit' });
  });

  it('syntax errors do not crash', () => {
    const t = term();
    expect(t.$('ls |')).toBe('bash: syntax error: unexpected end of file\n');
    expect(t.code).toBe(2);
    expect(t.$('echo "unterminated')).toBe("bash: unexpected EOF while looking for matching `\"'\n");
    expect(t.$(':(){ :|:& };:')).toContain('fork');
    expect(t.last.events).toContainEqual({ type: 'easterEgg', id: 'fork-bomb' });
  });

  it('scripts: permissions, arguments and subshell cd', () => {
    const t = term({ files: { '~/hello.sh': '#!/bin/bash\n# greet\necho "Hello, $1"\ncd /tmp\npwd\n' } });
    expect(t.$('./hello.sh')).toBe('bash: ./hello.sh: Permission denied\n');
    expect(t.code).toBe(126);
    t.$('chmod +x hello.sh');
    expect(t.$('./hello.sh World')).toBe('Hello, World\n/tmp\n');
    expect(t.$('pwd')).toBe('/home/student\n');
    expect(t.$('bash hello.sh Bob')).toBe('Hello, Bob\n/tmp\n');
    expect(t.$('./nope.sh')).toBe('bash: ./nope.sh: No such file or directory\n');
    expect(t.$('/usr/bin/whoami')).toBe('student\n');
    expect(t.$('source hello.sh x; pwd')).toBe('Hello, x\n/tmp\n/tmp\n');
  });

  it('limits runaway recursion', () => {
    const t = term({ files: { '~/r.sh': { content: './r.sh\n', mode: '755' } } });
    const out = t.$('./r.sh');
    expect(out).toMatch(/nesting|limit/);
  });

  it('output is capped', () => {
    const s = createShell({ files: { '~/big': 'x'.repeat(1000) + '\n' } });
    const r = run(s, 'cat big big big', { now: NOW, maxOutput: 1500 });
    const text = r.output.map((o) => o.text).join('');
    expect(text.length).toBeLessThan(1600);
    expect(text).toContain('[output truncated]');
  });

  it('is pure: the previous session is unchanged', () => {
    const s0 = createShell(basic);
    const r = run(s0, 'rm -r docs; cd /tmp; X=1', { now: NOW });
    expect(r.session.cwd).toBe('/tmp');
    expect(s0.cwd).toBe('/home/student');
    expect(run(s0, 'ls', { now: NOW, isTTY: false }).output[0]!.text).toBe('docs\nnotes.txt\n');
    expect(JSON.parse(JSON.stringify(r.session))).toEqual(r.session);
  });

  it('clear prints the clear sequence', () => {
    const t = term();
    expect(t.$('clear')).toBe('\x1b[H\x1b[2J\x1b[3J');
  });

  it('saveFile (editor) respects permissions', () => {
    const s = createShell();
    const ok = saveFile(s, '/home/student/new.txt', 'text\n', NOW);
    expect(ok.error).toBeUndefined();
    expect(run(ok.session, 'cat new.txt', { now: NOW }).output[0]!.text).toBe('text\n');
    expect(saveFile(s, '/etc/hosts', 'x', NOW).error).toBe('Permission denied');
  });

  it('validates stored sessions', () => {
    const s = createShell();
    expect(isSession(s)).toBe(true);
    expect(isSession({})).toBe(false);
    expect(isSession(null)).toBe(false);
    const old = JSON.parse(JSON.stringify(s));
    delete old.locals;
    delete old.userStack;
    const m = migrateSession(old);
    expect(m.locals).toEqual({});
    expect(m.userStack).toEqual([]);
  });

  it('tty mode: ls colors via alias, columns', () => {
    const t = term({ files: { '~/dir/': null, '~/run.sh': { content: '', mode: '755' }, '~/a.txt': '' } }, { tty: true, columns: 80 });
    const out = t.$('ls');
    expect(out).toBe('a.txt  \x1b[01;34mdir\x1b[0m  \x1b[01;32mrun.sh\x1b[0m\n');
    expect(t.$('\\ls')).toBe('a.txt  dir  run.sh\n');
    expect(t.$('ls | cat')).toBe('a.txt\ndir\nrun.sh\n');
  });
});
