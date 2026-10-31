import { describe, expect, it } from 'vitest';
import { basic, term } from './helpers';
import { lsQuote, strftime, modeString, columnize, humanSize, breToJs, ereToJs } from '../src/commands/util';
import { parseArgs, ArgError, normalizeFlags } from '../src/shell/args';
import { commandList, formatHelp, formatMan, COMMANDS, createShell, run, runAll, prompt } from '../src';
import { formatMan as fm } from '../src/shell/help';

describe('builtins', () => {
  it('export / unset / env / printenv', () => {
    const t = term();
    expect(t.$('export')).toContain('declare -x HOME="/home/student"');
    expect(t.$('export 1BAD=x')).toBe("bash: export: `1BAD=x': not a valid identifier\n");
    t.$('export GREETING=hi');
    expect(t.$('printenv GREETING')).toBe('hi\n');
    expect(t.$('printenv NOPE; echo $?')).toBe('1\n');
    expect(t.$('printenv')).toContain('GREETING=hi');
    expect(t.$('env FOO=bar printenv FOO')).toBe('bar\n');
    expect(t.$('printenv FOO')).toBe('');
    expect(t.$('env FOO=bar')).toContain('FOO=bar');
    t.$('unset GREETING');
    expect(t.$('echo "[$GREETING]"')).toBe('[]\n');
    expect(t.$('env nosuchcmd')).toBe('bash: nosuchcmd: command not found\n');
  });
  it('alias / unalias / type', () => {
    const t = term();
    expect(t.$('alias')).toContain("alias ll='ls -alF'");
    expect(t.$('alias nope')).toBe('bash: alias: nope: not found\n');
    expect(t.$("alias 'a b=x'")).toBe("bash: alias: `a b': invalid alias name\n");
    expect(t.$('unalias nope')).toBe('bash: unalias: nope: not found\n');
    expect(t.$('unalias')).toContain('usage');
    expect(t.$('type -t ll cd cat')).toBe('alias\nbuiltin\nfile\n');
    expect(t.$('type nosuch')).toBe('bash: type: nosuch: not found\n');
    t.$('unalias -a');
    expect(t.$('alias')).toBe('');
  });
  it('exit codes in scripts, bash -c, sh < stdin, source', () => {
    const t = term({ files: { '~/s.sh': 'echo a\nexit 3\necho never\n', '~/env.sh': 'export FROM_FILE=yes\nalias zz=pwd\n' } });
    expect(t.$('bash s.sh; echo $?')).toBe('a\n3\n');
    expect(t.$('bash -c "echo $((1+1))"')).toBe('2\n');
    expect(t.$("bash -c 'echo hi; false'; echo $?")).toBe('hi\n1\n');
    expect(t.$('bash -c')).toBe('bash: -c: option requires an argument\n');
    expect(t.$('echo "echo from-stdin" | sh')).toBe('from-stdin\n');
    expect(t.$('bash nope.sh')).toBe('bash: nope.sh: No such file or directory\n');
    t.$('source env.sh');
    expect(t.$('echo $FROM_FILE; zz')).toBe('yes\n/home/student\n');
    expect(t.$('. nope')).toBe('bash: nope: No such file or directory\n');
    expect(t.$('source')).toContain('filename argument required');
    expect(t.$('source ~/.bashrc; alias ll')).toBe("alias ll='ls -alF'\n");
    expect(t.$('bash')).toBe('');
  });
  it('test / [ operators', () => {
    const t = term({ files: { '~/f': 'x', '~/e': '', '~/l': { symlink: 'f' } } });
    const yes = (expr: string) => t.$(`${expr} && echo y || echo n`).trim();
    expect(yes('[ -e f ]')).toBe('y');
    expect(yes('[ -s e ]')).toBe('n');
    expect(yes('[ -L l ]')).toBe('y');
    expect(yes('[ -r f ]')).toBe('y');
    expect(yes('[ -w /etc/passwd ]')).toBe('n');
    expect(yes('[ -x /usr/bin/ls ]')).toBe('y');
    expect(yes('[ -z "" ]')).toBe('y');
    expect(yes('[ -n "" ]')).toBe('n');
    expect(yes('[ abc ]')).toBe('y');
    expect(yes('[ ! -f f ]')).toBe('n');
    expect(yes('[ 1 -eq 1 -a 2 -ne 3 ]')).toBe('y');
    expect(yes('[ 1 -eq 2 -o 2 -le 3 ]')).toBe('y');
    expect(yes('[ a != b ]')).toBe('y');
    expect(yes('[ 5 -ge 6 ]')).toBe('n');
    expect(yes('[ 5 -lt 6 ]')).toBe('y');
    expect(t.$('[ x -eq 1 ]; echo $?')).toBe('bash: [: x: integer expression expected\n2\n');
    expect(t.$('[ -f f')).toBe("bash: [: missing `]'\n");
    expect(t.$('[ -q f ]; echo $?')).toBe('bash: [: -q: unary operator expected\n2\n');
    expect(t.$('[ a b c d ]; echo $?')).toContain('2\n');
    expect(t.$('[ ]; echo $?')).toBe('1\n');
  });
  it('help and history N', () => {
    const t = term();
    expect(t.$('help cd')).toContain('cd: cd [-L|-P] [dir]');
    expect(t.$('help nosuch')).toContain('no help topics match');
    t.$('echo 1');
    t.$('echo 2');
    expect(t.$('history 2')).toBe('    4  echo 2\n    5  history 2\n');
    expect(t.$('history x')).toBe('bash: history: x: numeric argument required\n');
  });
  it('exit with code', () => {
    const t = term();
    expect(t.$('exit 4')).toBe('logout\n');
    expect(t.code).toBe(4);
    expect(t.$('exit abc')).toContain('numeric argument required');
  });
});

describe('system commands', () => {
  it('ps variants', () => {
    const t = term();
    expect(t.$('ps')).toBe('    PID TTY          TIME CMD\n   1200 pts/0    00:00:00 bash\n   4242 pts/0    00:00:00 ps\n');
    expect(t.$('ps -ef')).toContain('UID          PID    PPID');
    expect(t.$('ps aux')).toContain('/usr/sbin/cron -f');
    expect(t.$('kill -l')).toContain('SIGKILL');
    expect(t.$('kill')).toContain('usage');
    expect(t.$('kill abc')).toBe('bash: kill: abc: arguments must be process or job IDs\n');
    expect(t.$('sudo kill -9 412; ps aux | grep -c cron')).toBe('1\n');
    expect(t.$('sudo kill 1; echo $?')).toBe('0\n');
  });
  it('uname, hostname, date', () => {
    const t = term();
    expect(t.$('uname')).toBe('Linux\n');
    expect(t.$('uname -r')).toBe('6.8.0-45-generic\n');
    expect(t.$('uname -nm')).toBe('trainer x86_64\n');
    expect(t.$('uname -o')).toBe('GNU/Linux\n');
    expect(t.$('hostname')).toBe('trainer\n');
    expect(t.$('hostname -I')).toBe('10.0.2.15 \n');
    expect(t.$('hostname new')).toContain('must be root');
    expect(t.$('date -I')).toBe('2026-10-31\n');
    expect(t.$('date -R')).toBe('Sat, 31 Oct 2026 12:00:00 +0000\n');
    expect(t.$("date '+%A %B %j %s %T %R %D %e %y %u %w %Z %z %a %b %%'")).toBe('Saturday October 304 1793448000 12:00:00 12:00 10/31/26 31 26 6 6 UTC +0000 Sat Oct %\n');
    expect(t.$('date zz')).toBe('date: invalid date ‘zz’\n');
  });
  it('id, groups, su, sudo options', () => {
    const t = term();
    expect(t.$('id -u')).toBe('1000\n');
    expect(t.$('id -un')).toBe('student\n');
    expect(t.$('id -g')).toBe('1000\n');
    expect(t.$('id -Gn')).toBe('student sudo\n');
    expect(t.$('id root')).toBe('uid=0(root) gid=0(root) groups=0(root)\n');
    expect(t.$('groups')).toBe('student sudo\n');
    expect(t.$('groups root')).toBe('root : root\n');
    expect(t.$('su')).toContain('Authentication failure');
    expect(t.$('sudo -l')).toContain('(ALL : ALL) ALL');
    expect(t.$('sudo')).toContain('usage: sudo');
    expect(t.$('sudo -u nobody ls')).toContain('unknown user');
    expect(t.$('sudo -u root whoami')).toBe('root\n');
    expect(t.$('sudo nosuch')).toBe('sudo: nosuch: command not found\n');
    t.$('sudo su');
    expect(t.$('whoami')).toBe('root\n');
    t.$('su student');
    expect(t.$('whoami')).toBe('student\n');
    t.$('exit');
    t.$('exit');
    expect(t.$('whoami')).toBe('student\n');
  });
  it('man -k, whatis, nano/vim edge cases', () => {
    const t = term({ files: { '~/d/': null, '/srv/secret': { content: 'x', owner: 'root', mode: '600' } } });
    expect(t.$('man -k director')).toContain('mkdir (1)');
    expect(t.$('man -k zzzz')).toBe('zzzz: nothing appropriate.\n');
    expect(t.$('man ls cp')).toContain('CP(1)');
    expect(t.$('whatis zzz')).toBe('zzz: nothing appropriate.\n');
    expect(t.$('nano')).toContain('needs a file name');
    expect(t.$('nano d')).toBe('nano: "d" is a directory\n');
    expect(t.$('nano /srv/secret')).toContain('Permission denied');
    expect(t.$('nano new.txt')).toBe('Too many errors from stdin\n');
    expect(t.$('vim --help')).toContain('Usage: vim');
  });
  it('stat, basename, dirname, sleep', () => {
    const t = term({ files: { '~/f.txt': 'hello', '~/l': { symlink: 'f.txt' } } });
    expect(t.$('stat f.txt')).toContain('Access: (0644/-rw-r--r--)  Uid: ( 1000/ student)');
    expect(t.$('stat l')).toContain('File: l -> f.txt');
    expect(t.$('stat')).toContain('missing operand');
    expect(t.$('stat -c "%n %s %F" f.txt')).toBe('f.txt 5 regular file\n');
    expect(t.$('basename -a /a/b /c/d')).toBe('b\nd\n');
    expect(t.$('basename -s .txt /x/f.txt')).toBe('f\n');
    expect(t.$('basename')).toContain('missing operand');
    expect(t.$('dirname a/b c')).toBe('a\n.\n');
    expect(t.$('dirname')).toContain('missing operand');
    expect(t.$('sleep 1; echo ok')).toBe('ok\n');
    expect(t.$('sleep')).toContain('missing operand');
  });
  it('file detects many types', () => {
    const t = term({
      files: {
        '~/a.png': { content: '\x89PNG..', size: 1000 },
        '~/b.pdf': '%PDF-1.7',
        '~/c.zip': { content: '(binary)', size: 100 },
        '~/d.json': '{"a":1}\n',
        '~/e.csv': 'a,b\n',
        '~/f.html': '<!doctype html>\n',
        '~/g.py': 'print(1)\n',
        '~/h.txt': 'привіт\n',
        '~/i.sh': '#!/bin/sh\necho\n',
        '~/j.py': '#!/usr/bin/env python3\n',
        '~/k.c': 'int main(){}\n',
        '~/win.txt': 'a\r\nb\r\n',
        '~/empty': '',
        '~/bin': '\x01\x02data',
        '~/l': { symlink: 'h.txt' },
        '/srv/s': { content: 'x', owner: 'root', mode: '600' },
      },
    });
    const out = t.$('file -b a.png b.pdf c.zip d.json e.csv f.html g.py h.txt i.sh j.py k.c win.txt empty bin l /srv/s');
    expect(out.split('\n').slice(0, -1)).toEqual([
      'PNG image data, 1920 x 1080, 8-bit/color RGBA, non-interlaced',
      'PDF document, version 1.7, 12 page(s)',
      'Zip archive data, at least v2.0 to extract, compression method=deflate',
      'JSON text data',
      'CSV ASCII text',
      'HTML document, ASCII text',
      'Python script, ASCII text',
      'Unicode text, UTF-8 text',
      'POSIX shell script, ASCII text',
      'Python script, ASCII text',
      'C source, ASCII text',
      'ASCII text, with CRLF line terminators',
      'empty',
      'data',
      'symbolic link to h.txt',
      'regular file, no read permission',
    ]);
    expect(t.$('file')).toContain('Usage: file');
  });
  it('df variants', () => {
    const t = term();
    expect(t.$('df')).toContain('Filesystem     1K-blocks    Used Available Use% Mounted on');
    expect(t.$('df -hT /')).toBe('Filesystem     Type  Size  Used Avail Use% Mounted on\n/dev/sda1      ext4   30G  9.0G   21G  31% /\n');
    expect(t.$('df nope')).toBe('df: nope: No such file or directory\n');
  });
});

describe('file command options', () => {
  it('cp -n -p -a, mv -n, hard links, realpath, readlink -f', () => {
    const t = term({ files: { '~/a': 'A', '~/b': 'B', '~/d/x': 'x', '~/old': { content: 'o', mtime: '2025-01-01T00:00:00Z' } } });
    t.$('cp -n a b');
    expect(t.$('cat b')).toBe('B');
    t.$('cp -p old old2');
    expect(t.$('ls -l old2')).toContain('Jan  1  2025');
    t.$('cp -a d d2');
    expect(t.$('ls d2')).toBe('x\n');
    t.$('mv -n a b');
    expect(t.$('cat a b')).toBe('AB');
    t.$('ln a hard');
    expect(t.$('cat hard')).toBe('A');
    expect(t.$('ln d dh')).toBe('ln: d: hard link not allowed for directory\n');
    expect(t.$('ln nope x')).toBe("ln: failed to access 'nope': No such file or directory\n");
    expect(t.$('ln a b c')).toBe("ln: target 'c' is not a directory\n");
    t.$('ln -s a');
    t.$('cd d; ln -s ../a; cd ..');
    expect(t.$('readlink d/a')).toBe('../a\n');
    expect(t.$('readlink -f d/a')).toBe('/home/student/a\n');
    expect(t.$('realpath d/../a')).toBe('/home/student/a\n');
    expect(t.$('realpath nope')).toBe('realpath: nope: No such file or directory\n');
    expect(t.$('ln')).toContain('missing file operand');
    expect(t.$('cp a d')).toBe("cp: 'a' and 'd/a' are the same file\n");
    expect(t.$('cp d/x d')).toBe("cp: 'd/x' and 'd/x' are the same file\n");
    expect(t.$('mv b b')).toBe("mv: 'b' and 'b' are the same file\n");
    t.$('mkdir e; touch f');
    expect(t.$('mv f e/f; mkdir e2; mv e2 e/f')).toBe("mv: cannot overwrite non-directory 'e/f' with directory 'e2'\n");
    expect(t.$('mkdir -p z/f; mv z/f e/f')).toBe("mv: cannot overwrite non-directory 'e/f' with directory 'z/f'\n");
    expect(t.$('touch g; mv g z')).toBe('');
    expect(t.$('touch z/f/keep; mkdir -p y/z/f/k; mv y/z/f z')).toBe("mv: cannot move 'y/z/f' to 'z/f': Directory not empty\n");
  });
  it('rm -d, rm -rf with permissions, rmdir -p, touch -c', () => {
    const t = term({ files: { '~/emp/': null, '~/full/x': '', '/srv/locked/': { dir: true, owner: 'root', mode: '755' }, '/srv/locked/f': { content: '', owner: 'root' } } });
    expect(t.$('rm -d emp')).toBe('');
    expect(t.$('rm -d full')).toBe("rm: cannot remove 'full': Directory not empty\n");
    expect(t.$('rm -rf /srv/locked')).toBe("rm: cannot remove '/srv/locked/f': Permission denied\n");
    expect(t.$('touch -c nothing; ls nothing')).toContain('cannot access');
    t.$('touch /tmp/mine');
    expect(t.$('sudo touch /tmp/theirs; rm /tmp/theirs')).toBe("rm: cannot remove '/tmp/theirs': Operation not permitted\n");
    expect(t.$('rm /tmp/mine')).toBe('');
  });
  it('ls -t, ls -1 on tty, --color=always, quoting', () => {
    const t = term({ files: { '~/old': { content: '', mtime: '2026-10-01T00:00:00Z' }, '~/new': '', '~/my file': '', '~/arch.tar.gz': '', '~/pic.png': '' } }, { tty: true, columns: 30 });
    expect(t.$('\\ls -t')).toContain('new');
    expect(t.$('\\ls -1')).toBe("arch.tar.gz\n'my file'\nnew\nold\npic.png\n");
    expect(t.$('\\ls --color=always -1 arch.tar.gz pic.png')).toBe('\x1b[01;31march.tar.gz\x1b[0m\n\x1b[01;35mpic.png\x1b[0m\n');
    expect(t.$('\\ls')).toBe(" arch.tar.gz   new   pic.png\n'my file'      old\n");
    expect(t.$('ls --color=bogus')).toContain("invalid argument 'bogus' for '--color'");
    expect(t.$('ls -lh /usr/bin/ls')).toContain('/usr/bin/ls');
  });
  it('tree with -a, -f and errors', () => {
    const t = term({ files: { '~/t/.h': '', '~/t/l': { symlink: 'x' } } });
    expect(t.$('tree -a t')).toBe('t\n├── .h\n└── l -> x\n\n0 directories, 2 files\n');
    expect(t.$('tree -f t')).toContain('t/l -> x');
    expect(t.$('tree nope')).toBe('nope  [error opening dir]\n\n0 directories, 0 files\n');
    expect(t.$('tree -L 0')).toContain('Invalid level');
    expect(t.$('tree --noreport t')).toBe('t\n└── l -> x\n');
  });
});

describe('text command options', () => {
  it('cat -b -s -E -T, tac, nl, rev, less/more', () => {
    const t = term({ files: { '~/f': 'a\n\n\n\tb\n' } });
    expect(t.$('cat -b f')).toBe('     1\ta\n\n\n     2\t\tb\n');
    expect(t.$('cat -s f')).toBe('a\n\n\tb\n');
    expect(t.$('cat -ET f')).toBe('a$\n$\n$\n^Ib$\n');
    expect(t.$('tac f')).toBe('\tb\n\n\na\n');
    expect(t.$('nl f')).toBe('     1\ta\n       \n       \n     2\t\tb\n');
    expect(t.$('echo abc | rev')).toBe('cba\n');
    expect(t.$('less f')).toBe('a\n\n\n\tb\n');
    expect(t.$('more nope')).toBe('more: nope: No such file or directory\n');
    expect(t.$('less ~')).toBe('/home/student is a directory\n');
  });
  it('tail -c, head -n -N, -v, -q', () => {
    const t = term({ files: { '~/f': '1\n2\n3\n4\n' } });
    expect(t.$('tail -c 2 f')).toBe('4\n');
    expect(t.$('head -n -1 f')).toBe('1\n2\n3\n');
    expect(t.$('head -v -n 1 f')).toBe('==> f <==\n1\n');
    expect(t.$('head -q -n 1 f f')).toBe('1\n1\n');
    expect(t.$('echo x | head -v -n 1')).toBe('==> standard input <==\nx\n');
  });
  it('sort -f -V -o -k, uniq -i, cut -s, tr -c, printf extras', () => {
    const t = term({ files: { '~/f': 'b\nA\na\nB\n', '~/v': 'v1.10\nv1.2\n', '~/k': 'x 3\ny 1\n' } });
    expect(t.$('sort -f f')).toBe('a\nA\nb\nB\n');
    expect(t.$('sort -V v')).toBe('v1.2\nv1.10\n');
    t.$('sort -o out f');
    expect(t.$('cat out')).toBe('a\nA\nb\nB\n');
    expect(t.$('sort -k2 k')).toBe('y 1\nx 3\n');
    expect(t.$('sort -k2nr k')).toBe('x 3\ny 1\n');
    expect(t.$('sort -k x k')).toContain('invalid number');
    expect(t.$('sort f | uniq -i -c')).toBe('      2 a\n      2 b\n');
    t.$('sort f | uniq - out2');
    expect(t.$('cat out2')).toBe('a\nA\nb\nB\n');
    expect(t.$('printf "a:b\\nnodelim\\n" | cut -d: -f2 -s')).toBe('b\n');
    expect(t.$('cut -d ab -f1 f')).toContain('the delimiter must be a single character');
    expect(t.$('cut f')).toContain('you must specify a list');
    expect(t.$('echo abc123 | tr -cd 0-9')).toBe('123');
    expect(t.$('echo hello | tr [:lower:] [:upper:]')).toBe('HELLO\n');
    expect(t.$('tr')).toContain('missing operand');
    expect(t.$("printf '%x %X %o %c %b %.2f %5.1f|\\n' 255 255 8 hello 'a\\tb' 3.14159 2.5")).toBe('ff FF 10 h a\tb 3.14   2.5|\n');
    expect(t.$("printf '%d\\n' abc")).toContain('invalid number');
    expect(t.$('printf')).toContain('usage');
    expect(t.$("echo -e 'x\\cy'")).toBe('x');
    expect(t.$("echo -e '\\x41\\0102\\e[0m\\a\\b\\f\\v\\r\\\\'")).toBe('AB\x1b[0m\x07\b\f\v\r\\\n');
  });
  it('grep extra options', () => {
    const t = term({ files: { '~/a.txt': 'Foo\nbar\n', '~/d/x.log': 'foo\n', '~/d/y.txt': 'foo\n' } });
    expect(t.$('grep -F "." a.txt; echo $?')).toBe('1\n');
    expect(t.$('grep -H bar a.txt')).toBe('a.txt:bar\n');
    expect(t.$('grep -r --include="*.log" foo d')).toBe('d/x.log:foo\n');
    expect(t.$('grep -r --exclude="*.log" foo d')).toBe('d/y.txt:foo\n');
    expect(t.$('grep -rl foo .')).toBe('./d/x.log\n./d/y.txt\n');
    expect(t.$('grep -s foo nope; echo $?')).toBe('2\n');
    expect(t.$('grep "[" a.txt')).toContain('Invalid regular expression');
    expect(t.$('grep -ivx foo a.txt')).toBe('bar\n');
    expect(t.$('echo x | grep -c x -')).toBe('1\n');
    expect(t.$('grep -E "(" a.txt; echo $?')).toContain('2\n');
  });
  it('sed extras', () => {
    const t = term({ files: { '~/f': 'a\nb\nc\nd\n' } });
    expect(t.$("sed -n '$p' f")).toBe('d\n');
    expect(t.$("sed '2q' f")).toBe('a\nb\n');
    expect(t.$("sed -n '=' f")).toBe('1\n2\n3\n4\n');
    expect(t.$("sed '1a\\ new' f")).toBe('a\nnew\nb\nc\nd\n');
    expect(t.$("sed '1i top' f")).toBe('top\na\nb\nc\nd\n');
    expect(t.$("sed '2c X' f")).toBe('a\nX\nc\nd\n');
    expect(t.$("sed '/b/,/c/d' f")).toBe('a\nd\n');
    expect(t.$("sed '2!d' f")).toBe('b\n');
    expect(t.$("sed -e 's/a/A/' -e 's/b/B/' f")).toBe('A\nB\nc\nd\n');
    expect(t.$("sed 's/A/x/I' f")).toBe('x\nb\nc\nd\n');
    expect(t.$("echo aaa | sed 's/a/b/2'")).toBe('aba\n');
    expect(t.$("echo aaa | sed -n 's/a/b/p'")).toBe('baa\n');
    expect(t.$("echo 'a/b' | sed 's|/|-|'")).toBe('a-b\n');
    expect(t.$("sed 's/a/b' f")).toContain("unterminated `s' command");
    expect(t.$('sed')).toContain('Usage: sed');
    expect(t.$('sed -i s/a/b/')).toContain('no input files');
    expect(t.$('sed -i s/a/b/ nope')).toContain("can't read nope");
    expect(t.$("sed ',d' f")).toContain('unknown command');
  });
  it('awk extras', () => {
    const t = term({ files: { '~/n': '3 a\n1 b\n2 c\n' } });
    expect(t.$("awk 'BEGIN {print \"start\"} {n++} END {print n}' n")).toBe('start\n3\n');
    expect(t.$("awk -v x=10 '{print $1 + x}' n")).toBe('13\n11\n12\n');
    expect(t.$("awk 'NR==2' n")).toBe('1 b\n');
    expect(t.$("awk '$2 ~ /^[ab]$/ {print $2}' n")).toBe('a\nb\n');
    expect(t.$("awk '$2 !~ /a/ {next} {print \"A\"}' n")).toBe('A\n');
    expect(t.$("awk '{ $2 = \"X\"; print }' n")).toBe('3 X\n1 X\n2 X\n');
    expect(t.$("awk '{print length(), substr($2, 1, 1), index(\"abc\", $2), int(3.7)}' n")).toBe('3 a 1 3\n3 b 2 3\n3 c 3 3\n');
    expect(t.$("awk '{print ($1 > 1 ? \"big\" : \"small\")}' n")).toBe('big\nsmall\nbig\n');
    expect(t.$("awk '{x = x $2} END {print x, -1, !0, 2^3, 7%3, 1/4}' n")).toBe('abc -1 1 8 1 0.25\n');
    expect(t.$("awk '{print $1 > \"out.txt\"}' n; cat out.txt")).toBe('3\n1\n2\n');
    expect(t.$("awk 'BEGIN {print 1/0}'")).toContain('division by zero');
    expect(t.$("awk 'BEGIN {print sprintf(\"%05d\", 42), tolower(\"AB\")}'")).toBe('00042 ab\n');
    expect(t.$("awk 'BEGIN { if (1 && 0 || 1) print \"ok\" }'")).toBe('ok\n');
    expect(t.$("echo 'a:b' | awk -F: '{print $2; NF=1; print $0}'")).toBe('b\na\n');
    expect(t.$('awk')).toContain('usage');
    expect(t.$("awk '{print \"x}'")).toContain('non-terminated string');
    expect(t.$("awk '{ x = = 1 }'")).toContain('syntax error');
    expect(t.$("awk '{print $1}' nope")).toBe('awk: nope: No such file or directory\n');
  });
});

describe('find / du / xargs extras', () => {
  const spec = { files: { '~/p/A.TXT': 'x', '~/p/b.sh': { content: '', mode: '755' }, '~/p/new': '', '~/p/old': { content: '', mtime: '2026-10-31T11:30:00Z' }, '/srv/hidden/': { dir: true, owner: 'root', mode: '700' } } };
  it('find predicates', () => {
    const t = term(spec);
    expect(t.$('find p -iname "*.txt"')).toBe('p/A.TXT\n');
    expect(t.$('find p -path "*b.sh"')).toBe('p/b.sh\n');
    expect(t.$('find p -perm 755 -type f')).toBe('p/b.sh\n');
    expect(t.$('find p -perm -100 -type f')).toBe('p/b.sh\n');
    expect(t.$('find p -perm /111 -type f')).toBe('p/b.sh\n');
    expect(t.$('find p -user student -type f -name "*.sh"')).toBe('p/b.sh\n');
    expect(t.$('find p -group student -name new')).toBe('p/new\n');
    expect(t.$('find p -newer p/old -type f -name n*')).toBe('p/new\n');
    expect(t.$('find p -mmin +10')).toBe('p/old\n');
    expect(t.$('find p -name b.sh -ls')).toContain('-rwxr-xr-x');
    expect(t.$('find p -name new -print')).toBe('p/new\n');
    expect(t.$('find p -false; find p -true -name new')).toBe('p/new\n');
    expect(t.$('find p \\( -name new -o -name old \\) -type f')).toBe('p/new\np/old\n');
    expect(t.$('find p -not -type f')).toBe('p\n');
    expect(t.$('find p -mindepth 1 -maxdepth 1 -name new')).toBe('p/new\n');
    expect(t.$('find p -type f,d -name p')).toBe('p\n');
    expect(t.$('find /srv')).toBe("/srv\n/srv/hidden\nfind: ‘/srv/hidden’: Permission denied\n");
    expect(t.$('find p -name')).toBe("find: missing argument to `-name'\n");
    expect(t.$('find p -newer nope')).toContain('No such file');
    expect(t.$('find p -mtime x')).toContain('invalid argument');
    expect(t.$('find p -perm x')).toContain('invalid mode');
    expect(t.$('find p ( -name x')).toContain("syntax error near unexpected token");
    expect(t.$('find p \\( -name x')).toContain("I was expecting to find a ')'");
    expect(t.$('find p -name x extra')).toContain('paths must precede expression');
    expect(t.$('find p -exec')).toContain('missing argument');
  });
  it('find -delete honours permissions and non-empty dirs', () => {
    const t = term({ files: { '~/q/sub/f': '' } });
    expect(t.$('find q -name sub -delete')).toBe("find: cannot delete 'q/sub': Directory not empty\n");
    expect(t.$('find q -delete; ls q')).toContain('No such file');
  });
  it('du variants', () => {
    const t = term({ files: { '~/d/a': 'x', '~/d/s/b': 'y' } });
    expect(t.$('du -a d')).toBe('4\td/a\n4\td/s/b\n8\td/s\n16\td\n');
    expect(t.$('du -c d d/s')).toBe('8\td/s\n16\td\n8\td/s\n24\ttotal\n');
    expect(t.$('du -h -d 0 d')).toBe('16K\td\n');
    expect(t.$('du nope')).toBe("du: cannot access 'nope': No such file or directory\n");
    expect(t.$('sudo du -s /root')).toBe('12\t/root\n');
    expect(t.$('du -s /root')).toContain('Permission denied');
  });
  it('xargs variants and which', () => {
    const t = term({ files: { '~/x': '' } });
    expect(t.$("printf 'a\\0b\\0' | xargs -0 echo")).toBe('a b\n');
    expect(t.$('echo a | xargs -t echo')).toBe('echo a\na\n');
    expect(t.$('echo | xargs -r echo hi')).toBe('');
    expect(t.$('echo "q w" | xargs')).toBe('q w\n');
    expect(t.$('echo a | xargs nosuch; echo $?')).toBe('bash: nosuch: command not found\n127\n');
    expect(t.$('echo nope | xargs ls; echo $?')).toContain('123\n');
    expect(t.$('which -a ls')).toBe('/usr/bin/ls\n/bin/ls\n');
    expect(t.$('which /usr/bin/ls ./x')).toBe('/usr/bin/ls\n');
  });
});

describe('utilities', () => {
  it('lsQuote, modeString, columnize, humanSize, regex translation', () => {
    expect(lsQuote('plain.txt')).toBe('plain.txt');
    expect(lsQuote('my file')).toBe("'my file'");
    expect(lsQuote("it's")).toBe('"it\'s"');
    expect(lsQuote("it's $x")).toBe("'it'\\''s $x'");
    expect(modeString({ type: 'dir', name: 'x', mode: 0o1777, owner: '', group: '', mtime: 0, children: {} })).toBe('drwxrwxrwt');
    expect(modeString({ type: 'file', name: 'x', mode: 0o2644, owner: '', group: '', mtime: 0, content: '' })).toBe('-rw-r-Sr--');
    expect(columnize(['a', 'bb', 'c'], [1, 2, 1], 3)).toBe('a\nbb\nc\n');
    expect(columnize([], [], 80)).toBe('');
    expect(humanSize(1024 ** 2 - 1)).toBe('1.0M');
    expect(humanSize(1024 ** 5 * 3)).toBe('3.0P');
    expect(breToJs('a\\(b\\)\\{2\\}*\\<x\\>+?|')).toBe('a(b){2}*\\bx\\b\\+\\?\\|');
    expect(breToJs('*a[]x]')).toBe('\\*a[]x]');
    expect(ereToJs('\\<w[[:digit:]]+')).toBe('\\bw[0-9]+');
    expect(strftime('%q', 0)).toBe('%q');
  });
  it('argument parser edge cases', () => {
    expect(parseArgs(['--col'], { long: { color: 'c', colour: 'c' } }).flags.has('c')).toBe(true);
    expect(() => parseArgs(['--co'], { long: { color: 'c', count: 'n' } })).toThrow(ArgError);
    expect(() => parseArgs(['--lines'], { longWithValue: { lines: 'n' } })).toThrow("option '--lines' requires an argument");
    expect(() => parseArgs(['--all=x'], { long: { all: 'a' } })).toThrow("doesn't allow an argument");
    expect(() => parseArgs(['-n'], { withValue: 'n' })).toThrow("option requires an argument -- 'n'");
    expect(parseArgs(['--lines=5', '--', '-x'], { longWithValue: { lines: 'n' } })).toMatchObject({ operands: ['-x'] });
    expect(parseArgs(['-n5'], { withValue: 'n' }).values.get('n')).toBe('5');
    expect(normalizeFlags(['-la', '--all=x', '--', '-z', '-5']).flags).toEqual(new Set(['-l', '-a', '--all']));
  });
  it('help & man formatting, command list', () => {
    expect(formatHelp(COMMANDS.get('cd')!)).toContain('This is a shell builtin.');
    expect(formatMan(COMMANDS.get('grep')!)).toContain('EXAMPLES');
    expect(fm(COMMANDS.get('find')!, 200)).toContain('SEE ALSO');
    expect(commandList().length).toBeGreaterThan(60);
    for (const c of commandList()) {
      expect(c.doc.summary.length, c.name).toBeGreaterThan(3);
      expect(c.doc.usage.length, c.name).toBeGreaterThan(0);
    }
  });
  it('runAll and prompt as root', () => {
    const { session, results } = runAll(createShell({ user: 'root' }), ['cd /tmp', 'pwd']);
    expect(results[1]!.output[0]!.text).toBe('/tmp\n');
    expect(prompt(session)).toEqual({ user: 'root', host: 'trainer', path: '/tmp', symbol: '#' });
    expect(run(session, 'ls /root').exitCode).toBe(0);
  });
  it('every command survives --help and garbage arguments', () => {
    const s = createShell(basic);
    for (const c of commandList()) {
      for (const line of [`${c.name} --help`, `${c.name} -Q --zzz '' / . ~ notes.txt`, `${c.name}`, `echo data | ${c.name} x`]) {
        const r = run(s, line, { now: 0, isTTY: true });
        expect(r.output.every((o) => !o.text.includes('internal error')), line + JSON.stringify(r.output)).toBe(true);
      }
    }
  });
});
