import { describe, expect, it } from 'vitest';
import { basic, term } from './helpers';

describe('ls', () => {
  it('lists, hides dotfiles, -a/-A', () => {
    const t = term(basic);
    expect(t.$('ls')).toBe('docs\nnotes.txt\n');
    expect(t.$('ls -A')).toBe('.bashrc\ndocs\nnotes.txt\n.profile\n');
    expect(t.$('ls -a')).toBe('.\n..\n.bashrc\ndocs\nnotes.txt\n.profile\n');
  });
  it('long format', () => {
    const t = term(basic);
    expect(t.$('ls -l')).toBe(
      'total 8\n' +
        'drwxr-xr-x 2 student student 4096 Oct 31 12:00 docs\n' +
        '-rw-r--r-- 1 student student   12 Oct 31 12:00 notes.txt\n',
    );
    expect(t.$('ls -l notes.txt')).toBe('-rw-r--r-- 1 student student 12 Oct 31 12:00 notes.txt\n');
    expect(t.$('ls -la')).toContain('drwxr-x--- 3 student student 4096 Oct  1 09:00 .\n');
  });
  it('flags combine in any order', () => {
    const t = term(basic);
    expect(t.$('ls -la')).toBe(t.$('ls -al'));
    expect(t.$('ls -l -a')).toBe(t.$('ls -al'));
    expect(t.$('ls --all -l')).toBe(t.$('ls -al'));
  });
  it('multiple operands, dirs get headers', () => {
    const t = term(basic);
    expect(t.$('ls notes.txt docs')).toBe('notes.txt\n\ndocs:\nreadme.md\ntodo.txt\n');
    expect(t.$('ls docs nope')).toBe("ls: cannot access 'nope': No such file or directory\ndocs:\nreadme.md\ntodo.txt\n");
    expect(t.code).toBe(2);
  });
  it('-R, -d, -F, -h, -S, -t, -r', () => {
    const t = term({ files: { '~/big': { content: 'x', size: 5 * 1024 * 1024 }, '~/small': 'x', '~/d/sub/f': '', '~/run': { content: '', mode: '755' }, '~/ln': { symlink: 'small' } } });
    expect(t.$('ls -R d')).toBe('d:\nsub\n\nd/sub:\nf\n');
    expect(t.$('ls -d d')).toBe('d\n');
    expect(t.$('ls -F')).toBe('big\nd/\nln@\nrun*\nsmall\n');
    expect(t.$('ls -lh big')).toContain(' 5.0M ');
    expect(t.$('ls -S')).toBe('big\nd\nln\nsmall\nrun\n');
    expect(t.$('ls -r')).toBe('small\nrun\nln\nd\nbig\n');
    expect(t.$('ls -l ln')).toContain('ln -> small');
  });
  it('invalid option', () => {
    const t = term();
    expect(t.$('ls -z')).toBe("ls: invalid option -- 'z'\nTry 'ls --help' for more information.\n");
    expect(t.code).toBe(2);
    expect(t.$('ls --bogus')).toBe("ls: unrecognized option '--bogus'\nTry 'ls --help' for more information.\n");
  });
  it('permission denied on directory', () => {
    const t = term();
    expect(t.$('ls /root')).toBe("ls: cannot open directory '/root': Permission denied\n");
  });
  it('--help', () => {
    const t = term();
    const out = t.$('ls --help');
    expect(out.startsWith('Usage: ls [OPTION]... [FILE]...\n')).toBe(true);
    expect(out).toContain('-a, --all');
  });
});

describe('files', () => {
  it('mkdir', () => {
    const t = term();
    expect(t.$('mkdir a')).toBe('');
    expect(t.$('mkdir a')).toBe("mkdir: cannot create directory ‘a’: File exists\n");
    expect(t.$('mkdir x/y')).toBe("mkdir: cannot create directory ‘x/y’: No such file or directory\n");
    expect(t.$('mkdir -pv x/y/z')).toBe("mkdir: created directory 'x'\nmkdir: created directory 'x/y'\nmkdir: created directory 'x/y/z'\n");
    expect(t.$('mkdir -p x/y')).toBe('');
    expect(t.$('mkdir')).toBe("mkdir: missing operand\nTry 'mkdir --help' for more information.\n");
    expect(t.$('mkdir /opt/app')).toBe("mkdir: cannot create directory ‘/opt/app’: Permission denied\n");
    t.$('mkdir -m 700 private');
    expect(t.$('stat -c %a private')).toBe('700\n');
  });
  it('touch', () => {
    const t = term();
    t.$('touch a b');
    expect(t.$('ls')).toBe('a\nb\n');
    expect(t.$('touch nodir/x')).toBe("touch: cannot touch 'nodir/x': No such file or directory\n");
    expect(t.$('touch /etc/hostname')).toBe("touch: cannot touch '/etc/hostname': Permission denied\n");
  });
  it('cat', () => {
    const t = term(basic);
    expect(t.$('cat notes.txt docs/todo.txt')).toBe('hello\nworld\nbuy milk\nfix bug\n');
    expect(t.$('cat -n notes.txt')).toBe('     1\thello\n     2\tworld\n');
    expect(t.$('cat docs')).toBe('cat: docs: Is a directory\n');
    expect(t.$('echo piped | cat')).toBe('piped\n');
    expect(t.$('echo a | cat - notes.txt')).toBe('a\nhello\nworld\n');
    expect(t.$('cat -A notes.txt')).toBe('hello$\nworld$\n');
  });
  it('rm', () => {
    const t = term(basic);
    expect(t.$('rm nope')).toBe("rm: cannot remove 'nope': No such file or directory\n");
    expect(t.$('rm -f nope')).toBe('');
    expect(t.code).toBe(0);
    expect(t.$('rm docs')).toBe("rm: cannot remove 'docs': Is a directory\n");
    expect(t.$('rm -v notes.txt')).toBe("removed 'notes.txt'\n");
    expect(t.$('rm -rv docs')).toBe("removed 'docs/readme.md'\nremoved 'docs/todo.txt'\nremoved directory 'docs'\n");
    expect(t.$('ls')).toBe('');
    expect(t.$('rm -r .')).toBe("rm: refusing to remove '.' or '..' directory: skipping '.'\n");
    expect(t.$('rm /etc/hosts')).toBe("rm: cannot remove '/etc/hosts': Permission denied\n");
    expect(t.$('rm')).toBe("rm: missing operand\nTry 'rm --help' for more information.\n");
  });
  it('rm -rf / is refused; with --no-preserve-root as root it wipes the sandbox', () => {
    const t = term(basic);
    t.$('sudo rm -rf --no-preserve-root /');
    expect(t.last.events).toContainEqual({ type: 'easterEgg', id: 'sudo-rm-rf-root' });
    expect(t.$('ls /')).toBe('');
    expect(t.$('pwd')).toBe('/home/student\n');
  });
  it('rmdir', () => {
    const t = term(basic);
    expect(t.$('rmdir docs')).toBe("rmdir: failed to remove 'docs': Directory not empty\n");
    expect(t.$('rmdir notes.txt')).toBe("rmdir: failed to remove 'notes.txt': Not a directory\n");
    expect(t.$('rmdir nope')).toBe("rmdir: failed to remove 'nope': No such file or directory\n");
    t.$('mkdir -p a/b/c');
    expect(t.$('rmdir -p a/b/c')).toBe('');
    expect(t.$('ls')).toBe('docs\nnotes.txt\n');
  });
  it('cp', () => {
    const t = term(basic);
    t.$('cp notes.txt copy.txt');
    expect(t.$('cat copy.txt')).toBe('hello\nworld\n');
    expect(t.$('cp docs d2')).toBe("cp: -r not specified; omitting directory 'docs'\n");
    t.$('cp -r docs d2');
    expect(t.$('ls d2')).toBe('readme.md\ntodo.txt\n');
    t.$('cp notes.txt copy.txt docs');
    expect(t.$('ls docs')).toBe('copy.txt\nnotes.txt\nreadme.md\ntodo.txt\n');
    expect(t.$('cp notes.txt copy.txt nope')).toBe("cp: target 'nope': No such file or directory\n");
    expect(t.$('cp nope x')).toBe("cp: cannot stat 'nope': No such file or directory\n");
    expect(t.$('cp notes.txt notes.txt')).toBe("cp: 'notes.txt' and 'notes.txt' are the same file\n");
    expect(t.$('cp -r docs docs/inner')).toBe("cp: cannot copy a directory, 'docs', into itself, 'docs/inner'\n");
    t.$('rm -r docs/inner');
    expect(t.$('cp notes.txt')).toBe("cp: missing destination file operand after 'notes.txt'\nTry 'cp --help' for more information.\n");
    expect(t.$('cp -v notes.txt n2')).toBe("'notes.txt' -> 'n2'\n");
    // d2 exists now, so docs is copied *into* it
    t.$('cp -r docs d2');
    expect(t.$('ls d2')).toBe('docs\nreadme.md\ntodo.txt\n');
  });
  it('mv', () => {
    const t = term(basic);
    t.$('mv notes.txt n.txt');
    expect(t.$('ls')).toBe('docs\nn.txt\n');
    t.$('mv n.txt docs/');
    expect(t.$('ls docs')).toBe('n.txt\nreadme.md\ntodo.txt\n');
    expect(t.$('mv nope x')).toBe("mv: cannot stat 'nope': No such file or directory\n");
    expect(t.$('mv docs docs/sub')).toBe("mv: cannot move 'docs' to a subdirectory of itself, 'docs/sub'\n");
    expect(t.$('mv -v docs documents')).toBe("renamed 'docs' -> 'documents'\n");
    t.$('mkdir e; touch f');
    expect(t.$('mv f e documents')).toBe('');
    expect(t.$('ls documents')).toBe('e\nf\nn.txt\nreadme.md\ntodo.txt\n');
    expect(t.$('mv documents/f /etc/')).toBe("mv: cannot move 'documents/f' to '/etc/f': Permission denied\n");
  });
  it('ln and readlink', () => {
    const t = term(basic);
    t.$('ln -s docs/todo.txt todo');
    expect(t.$('cat todo')).toBe('buy milk\nfix bug\n');
    expect(t.$('readlink todo')).toBe('docs/todo.txt\n');
    expect(t.$('ln -s x todo')).toBe("ln: failed to create symbolic link 'todo': File exists\n");
    t.$('ln -sf notes.txt todo');
    expect(t.$('readlink todo')).toBe('notes.txt\n');
    t.$('rm notes.txt');
    expect(t.$('cat todo')).toBe('cat: todo: No such file or directory\n');
    t.$('ln -s /var/log logs');
    expect(t.$('ls -d logs/')).toBe('logs/\n');
  });
  it('tree', () => {
    const t = term(basic);
    expect(t.$('tree')).toBe('.\n├── docs\n│   ├── readme.md\n│   └── todo.txt\n└── notes.txt\n\n1 directory, 3 files\n');
    expect(t.$('tree -d')).toBe('.\n└── docs\n\n1 directory\n');
    expect(t.$('tree -L 1 docs')).toBe('docs\n├── readme.md\n└── todo.txt\n\n0 directories, 2 files\n');
  });
});

describe('text', () => {
  const lines = Array.from({ length: 15 }, (_, i) => `line ${i + 1}`).join('\n') + '\n';
  it('head and tail', () => {
    const t = term({ files: { '~/f': lines, '~/g': 'a\nb' } });
    expect(t.$('head f')).toBe(lines.split('\n').slice(0, 10).join('\n') + '\n');
    expect(t.$('head -n 2 f')).toBe('line 1\nline 2\n');
    expect(t.$('head -3 f')).toBe('line 1\nline 2\nline 3\n');
    expect(t.$('tail -n 2 f')).toBe('line 14\nline 15\n');
    expect(t.$('tail -n +14 f')).toBe('line 14\nline 15\n');
    expect(t.$('tail -1 g')).toBe('b');
    expect(t.$('head -c 4 f')).toBe('line');
    expect(t.$('head -n 1 f g')).toBe('==> f <==\nline 1\n\n==> g <==\na\n');
    expect(t.$('head -n x f')).toBe("head: invalid number of lines: ‘x’\n");
  });
  it('wc', () => {
    const t = term({ files: { '~/f': 'one two\nthree\n', '~/g': 'x\n' } });
    expect(t.$('wc f')).toBe(' 2  3 14 f\n');
    expect(t.$('wc -l f')).toBe('2 f\n');
    expect(t.$('wc -w < f')).toBe('3\n');
    expect(t.$('cat f | wc')).toBe('      2       3      14\n');
    expect(t.$('wc -l f g')).toBe(' 2 f\n 1 g\n 3 total\n');
  });
  it('grep', () => {
    const t = term({ files: { '~/log': 'INFO start\nERROR disk full\ninfo done\nERROR net\n', '~/d/a.txt': 'TODO one\n', '~/d/b.txt': 'nothing\n' } });
    expect(t.$('grep ERROR log')).toBe('ERROR disk full\nERROR net\n');
    expect(t.$('grep -i info log')).toBe('INFO start\ninfo done\n');
    expect(t.$('grep -c ERROR log')).toBe('2\n');
    expect(t.$('grep -n net log')).toBe('4:ERROR net\n');
    expect(t.$('grep -v ERROR log')).toBe('INFO start\ninfo done\n');
    expect(t.$('grep -r TODO d')).toBe('d/a.txt:TODO one\n');
    expect(t.$('cd d; grep -r TODO; cd ..')).toBe('a.txt:TODO one\n');
    expect(t.$('grep -l o d/a.txt d/b.txt')).toBe('d/a.txt\nd/b.txt\n');
    expect(t.$('grep -o "ERROR [a-z]*" log')).toBe('ERROR disk\nERROR net\n');
    expect(t.$('grep -E "disk|net" log')).toBe('ERROR disk full\nERROR net\n');
    expect(t.$('grep "disk\\|net" log')).toBe('ERROR disk full\nERROR net\n');
    expect(t.$('grep -w do log')).toBe('');
    expect(t.code).toBe(1);
    expect(t.$('grep x nope')).toBe('grep: nope: No such file or directory\n');
    expect(t.code).toBe(2);
    expect(t.$('grep x d')).toBe('grep: d: Is a directory\n');
    expect(t.$('grep -q ERROR log && echo found')).toBe('found\n');
    expect(t.$('grep "^[[:upper:]]* " log')).toBe('INFO start\nERROR disk full\nERROR net\n');
  });
  it('grep --color highlights matches on a tty only', () => {
    const t = term({ files: { '~/f': 'abc\n' } }, { tty: true });
    expect(t.$('grep b f')).toBe('a\x1b[01;31m\x1b[Kb\x1b[m\x1b[Kc\n');
    expect(t.$('grep b f | cat')).toBe('abc\n');
  });
  it('sort and uniq', () => {
    const t = term({ files: { '~/f': 'b\na\nc\na\n', '~/n': '10\n9\n100\n', '~/h': '1K\n5M\n20\n', '~/csv': 'x,3\ny,1\nz,2\n' } });
    expect(t.$('sort f')).toBe('a\na\nb\nc\n');
    expect(t.$('sort -r f')).toBe('c\nb\na\na\n');
    expect(t.$('sort -u f')).toBe('a\nb\nc\n');
    expect(t.$('sort n')).toBe('10\n100\n9\n');
    expect(t.$('sort -n n')).toBe('9\n10\n100\n');
    expect(t.$('sort -rn n')).toBe('100\n10\n9\n');
    expect(t.$('sort -h h')).toBe('20\n1K\n5M\n');
    expect(t.$('sort -t, -k2 -n csv')).toBe('y,1\nz,2\nx,3\n');
    expect(t.$('sort f | uniq')).toBe('a\nb\nc\n');
    expect(t.$('sort f | uniq -c')).toBe('      2 a\n      1 b\n      1 c\n');
    expect(t.$('sort f | uniq -d')).toBe('a\n');
    expect(t.$('sort f | uniq -u')).toBe('b\nc\n');
  });
  it('cut, tr, tee, nl, seq, printf', () => {
    const t = term();
    expect(t.$('cut -d: -f1 /etc/passwd')).toBe('root\nstudent\n');
    expect(t.$('echo abcdef | cut -c2-4')).toBe('bcd\n');
    expect(t.$('echo a,b,c | cut -d, -f2-')).toBe('b,c\n');
    expect(t.$('echo hello | tr a-z A-Z')).toBe('HELLO\n');
    expect(t.$('echo hello | tr -d l')).toBe('heo\n');
    expect(t.$('echo "a   b" | tr -s " "')).toBe('a b\n');
    expect(t.$('echo hi | tee out.txt')).toBe('hi\n');
    expect(t.$('cat out.txt')).toBe('hi\n');
    expect(t.$('echo x | tee -a out.txt > /dev/null; cat out.txt')).toBe('hi\nx\n');
    expect(t.$('seq 3')).toBe('1\n2\n3\n');
    expect(t.$('seq 2 2 6')).toBe('2\n4\n6\n');
    expect(t.$("printf '%s=%d\\n' a 1 b 2")).toBe('a=1\nb=2\n');
    expect(t.$("printf '%5s|%-3s|\\n' ab c")).toBe('   ab|c  |\n');
    expect(t.$('echo -e "a\\tb"')).toBe('a\tb\n');
    expect(t.$('echo -n x')).toBe('x');
    expect(t.$('echo --help')).toBe('--help\n');
  });
  it('sed', () => {
    const t = term({ files: { '~/f': 'cat\ndog\ncat dog\n# comment\n' } });
    expect(t.$('sed s/cat/CAT/ f')).toBe('CAT\ndog\nCAT dog\n# comment\n');
    expect(t.$("sed 's/o/0/g' f")).toBe('cat\nd0g\ncat d0g\n# c0mment\n');
    expect(t.$("sed -n '2p' f")).toBe('dog\n');
    expect(t.$("sed '/^#/d' f")).toBe('cat\ndog\ncat dog\n');
    expect(t.$("sed -n '/cat/p' f")).toBe('cat\ncat dog\n');
    expect(t.$("sed '2,3d' f")).toBe('cat\n# comment\n');
    expect(t.$("sed -E 's/(cat) (dog)/\\2 \\1/' f")).toBe('cat\ndog\ndog cat\n# comment\n');
    expect(t.$("sed 's/cat/[&]/' f")).toBe('[cat]\ndog\n[cat] dog\n# comment\n');
    t.$("sed -i 's/dog/wolf/g' f");
    expect(t.$('cat f')).toBe('cat\nwolf\ncat wolf\n# comment\n');
    expect(t.$("sed 'x' f")).toContain('unknown command');
  });
  it('awk', () => {
    const t = term({ files: { '~/sales': 'apple 3 1.5\npear 10 0.5\nplum 7 2\n' } });
    expect(t.$("awk '{print $1}' sales")).toBe('apple\npear\nplum\n');
    expect(t.$("awk '$2 > 5 {print $1, $2}' sales")).toBe('pear 10\nplum 7\n');
    expect(t.$("awk '{s += $2} END {print s}' sales")).toBe('20\n');
    expect(t.$("awk 'END {print NR}' sales")).toBe('3\n');
    expect(t.$("awk '/pl/' sales")).toBe('apple 3 1.5\nplum 7 2\n');
    expect(t.$("awk '{print $NF}' sales")).toBe('1.5\n0.5\n2\n');
    expect(t.$("awk -F: '$3 >= 1000 {print $1}' /etc/passwd")).toBe('student\n');
    expect(t.$("awk '{print NR \": \" toupper($1)}' sales")).toBe('1: APPLE\n2: PEAR\n3: PLUM\n');
    expect(t.$("awk '{ if ($2 > 5) print \"big\"; else print \"small\" }' sales")).toBe('small\nbig\nbig\n');
    expect(t.$("awk '{printf \"%-6s%3d\\n\", $1, $2}' sales")).toBe('apple   3\npear   10\nplum    7\n');
    expect(t.$("awk '{print $2 * $3}' sales")).toBe('4.5\n5\n14\n');
    expect(t.$("awk '{print $1' sales")).toContain('awk:');
  });
});

describe('search & system', () => {
  const spec = {
    files: {
      '~/proj/a.txt': 'x',
      '~/proj/b.log': { content: '', size: 20 * 1024 * 1024 },
      '~/proj/sub/c.txt': '',
      '~/proj/empty/': null,
      '~/proj/old.txt': { content: 'o', mtime: '2026-01-01T00:00:00Z' },
    },
  };
  it('find', () => {
    const t = term(spec);
    expect(t.$('find proj -name "*.txt"')).toBe('proj/a.txt\nproj/old.txt\nproj/sub/c.txt\n');
    expect(t.$('find proj -type d')).toBe('proj\nproj/empty\nproj/sub\n');
    expect(t.$('find proj -size +10M')).toBe('proj/b.log\n');
    expect(t.$('find proj -empty')).toBe('proj/empty\nproj/sub/c.txt\n');
    expect(t.$('find proj -maxdepth 1 -type f')).toBe('proj/a.txt\nproj/b.log\nproj/old.txt\n');
    expect(t.$('find proj -mtime +30')).toBe('proj/old.txt\n');
    expect(t.$('find proj -name "*.txt" -o -name "*.log" | wc -l')).toBe('4\n');
    expect(t.$('find proj ! -name "*.txt" -type f')).toBe('proj/b.log\n');
    expect(t.$('find nope')).toBe("find: ‘nope’: No such file or directory\n");
    expect(t.$('find proj -bogus')).toBe("find: unknown predicate `-bogus'\n");
    t.$('find proj -name "*.txt" -delete');
    expect(t.$('find proj -type f')).toBe('proj/b.log\n');
    expect(t.$('find proj -type d -empty -exec rmdir {} \\;')).toBe('');
    expect(t.$('ls proj')).toBe('b.log\n');
    expect(t.$('cd proj; find')).toBe('.\n./b.log\n');
  });
  it('find with -exec ... +', () => {
    const t = term(spec);
    expect(t.$('find proj -name "*.txt" -exec echo {} +')).toBe('proj/a.txt proj/old.txt proj/sub/c.txt\n');
  });
  it('du and df', () => {
    const t = term(spec);
    expect(t.$('du -sh proj')).toBe('21M\tproj\n');
    expect(t.$('du proj')).toBe('4\tproj/empty\n4\tproj/sub\n20500\tproj\n');
    const df = t.$('df -h');
    expect(df.split('\n')[0]).toBe('Filesystem      Size  Used Avail Use% Mounted on');
    expect(df.split('\n')[1]).toBe('/dev/sda1        30G  9.0G   21G  31% /');
  });
  it('which, type, file, whoami, id, uname, date', () => {
    const t = term({ files: { '~/s.sh': { content: '#!/bin/bash\necho\n', mode: '755' } } });
    expect(t.$('which ls')).toBe('/usr/bin/ls\n');
    expect(t.$('which cd')).toBe('');
    expect(t.code).toBe(1);
    expect(t.$('file s.sh /etc/passwd /usr/bin/ls')).toBe(
      's.sh:        Bourne-Again shell script, ASCII text executable\n/etc/passwd: ASCII text\n/usr/bin/ls: ELF 64-bit LSB pie executable, x86-64, version 1 (SYSV), dynamically linked, interpreter /lib64/ld-linux-x86-64.so.2, for GNU/Linux 3.2.0, stripped\n',
    );
    expect(t.$('whoami')).toBe('student\n');
    expect(t.$('id')).toBe('uid=1000(student) gid=1000(student) groups=1000(student),27(sudo)\n');
    expect(t.$('uname -a')).toContain('Linux trainer 6.8.0-45-generic');
    expect(t.$('date')).toBe('Sat Oct 31 12:00:00 UTC 2026\n');
    expect(t.$('date +%Y-%m-%d')).toBe('2026-10-31\n');
  });
  it('chmod', () => {
    const t = term({ files: { '~/f': '' } });
    t.$('chmod +x f');
    expect(t.$('stat -c %a f')).toBe('755\n');
    t.$('chmod go-rx f');
    expect(t.$('stat -c %A f')).toBe('-rwx------\n');
    t.$('chmod u=rw,g=r,o= f');
    expect(t.$('stat -c %a f')).toBe('640\n');
    t.$('chmod 4755 f');
    expect(t.$('stat -c %A f')).toBe('-rwsr-xr-x\n');
    expect(t.$('chmod 644 /etc/hosts')).toBe("chmod: changing permissions of '/etc/hosts': Operation not permitted\n");
    expect(t.$('chmod xyz f')).toBe("chmod: invalid mode: ‘xyz’\nTry 'chmod --help' for more information.\n");
    expect(t.$('chmod 644 nope')).toBe("chmod: cannot access 'nope': No such file or directory\n");
    expect(t.$('chmod -v 600 f')).toBe("mode of 'f' changed from 4755 (rwsr-xr-x) to 0600 (rw-------)\n".replace('(rwsr-xr-x)', '(-rwxr-xr-x)').replace('(rw-------)', '(-rw-------)'));
    t.$('chmod -w f');
    expect(t.$('echo x > f')).toBe('bash: f: Permission denied\n');
  });
  it('chown requires root', () => {
    const t = term({ files: { '~/f': '' } });
    expect(t.$('chown root f')).toBe("chown: changing ownership of 'f': Operation not permitted\n");
    t.$('sudo chown root:root f');
    expect(t.$('stat -c "%U %G" f')).toBe('root root\n');
    expect(t.$('sudo chown bob f')).toBe("chown: invalid user: ‘bob’\n");
  });
  it('permissions: reading and writing others files', () => {
    const t = term({ files: { '/srv/secret.txt': { content: 'top', owner: 'root', mode: '600' }, '/srv/pub.txt': { content: 'pub', owner: 'root', mode: '644' } } });
    expect(t.$('cat /srv/secret.txt')).toBe('cat: /srv/secret.txt: Permission denied\n');
    expect(t.$('cat /srv/pub.txt')).toBe('pub');
    expect(t.$('echo x >> /srv/pub.txt')).toBe('bash: /srv/pub.txt: Permission denied\n');
    expect(t.$('sudo cat /srv/secret.txt')).toBe('top');
    expect(t.$('rm /srv/pub.txt')).toBe("rm: cannot remove '/srv/pub.txt': Permission denied\n");
  });
  it('sudo for a user not in sudoers', () => {
    const t = term({ user: 'guest', sudo: false });
    expect(t.$('sudo ls')).toBe('guest is not in the sudoers file.\n');
  });
  it('ps and kill', () => {
    const t = term({ processes: [{ pid: 1, user: 'root', command: '/sbin/init', cpu: 0, mem: 0.1 }, { pid: 777, user: 'student', command: 'python3 runaway.py', cpu: 99.5, mem: 12 }, { pid: 900, user: 'root', command: 'nginx: master', cpu: 0, mem: 1 }] });
    expect(t.$('ps aux | grep runaway | head -1')).toContain('python3 runaway.py');
    expect(t.$('kill 900')).toBe('bash: kill: (900) - Operation not permitted\n');
    expect(t.$('kill 777')).toBe('');
    expect(t.$('ps aux | grep -c runaway')).toBe('1\n');
    expect(t.$('kill 12345')).toBe('bash: kill: (12345) - No such process\n');
  });
  it('xargs', () => {
    const t = term({ files: { '~/a.tmp': '', '~/b.tmp': '', '~/keep': '' } });
    t.$('ls *.tmp | xargs rm');
    expect(t.$('ls')).toBe('keep\n');
    expect(t.$('echo a b c | xargs -n 1 echo x')).toBe('x a\nx b\nx c\n');
    expect(t.$('printf "1\\n2\\n" | xargs -I % echo item-%')).toBe('item-1\nitem-2\n');
  });
  it('man, help, whatis, test', () => {
    const t = term();
    expect(t.$('man')).toBe("What manual page do you want?\nFor example, try 'man man'.\n");
    expect(t.$('man nosuch')).toBe('No manual entry for nosuch\n');
    expect(t.$('man ls')).toContain('ls - list directory contents');
    expect(t.$('whatis cp')).toBe('cp (1)          - copy files and directories\n');
    expect(t.$('[ -d /tmp ] && echo dir')).toBe('dir\n');
    expect(t.$('[ -f /tmp ] || echo notfile')).toBe('notfile\n');
    expect(t.$('test 3 -gt 2 && echo yes')).toBe('yes\n');
    expect(t.$('[ a = b ]; echo $?')).toBe('1\n');
    expect(t.$('help')).toContain('ls');
  });
  it('nano emits an editor event', () => {
    const t = term({ files: { '~/f.txt': 'abc' } }, { tty: true });
    t.$('nano f.txt');
    expect(t.last.events).toContainEqual({ type: 'openEditor', path: '/home/student/f.txt', content: 'abc', exists: true });
  });
});
