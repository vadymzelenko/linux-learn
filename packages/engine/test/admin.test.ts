import { describe, expect, it } from 'vitest';
import type { MachineSpec } from '../src';
import { term } from './helpers';

const procs: MachineSpec = {
  users: [{ name: 'www-data', uid: 33 }],
  processes: [
    { pid: 1, user: 'root', command: '/sbin/init', cpu: 0, mem: 0.1, rss: 1000, stat: 'Ss', start: '09:00' },
    { pid: 900, user: 'www-data', command: 'nginx: worker process', cpu: 0.2, mem: 0.5, rss: 5000, stat: 'S', start: '09:00' },
    { pid: 4711, user: 'student', command: 'python3 report_generator.py --all', cpu: 187.5, mem: 12, rss: 900000, stat: 'R', start: '10:00' },
    { pid: 4720, user: 'student', command: 'gzip -9 big.log', cpu: 40, mem: 0.3, rss: 3000, stat: 'R', start: '10:05' },
    { pid: 4721, user: 'student', command: 'gzip -9 other.log', cpu: 38, mem: 0.3, rss: 3000, stat: 'R', start: '10:05' },
  ],
};

describe('user administration', () => {
  it('useradd needs root, creates user, home, groups', () => {
    const t = term();
    expect(t.$('useradd anna')).toContain('Permission denied');
    expect(t.code).toBe(1);
    t.$('sudo useradd -m -s /bin/bash anna');
    expect(t.code).toBe(0);
    expect(t.$('id anna')).toMatch(/uid=1001\(anna\) gid=\d+\(anna\) groups=\d+\(anna\)/);
    expect(t.$('grep anna /etc/passwd')).toBe('anna:x:1001:1001:anna:/home/anna:/bin/bash\n');
    expect(t.$('ls -ld /home/anna')).toMatch(/^drwxr-x--- \d+ anna anna/);
    expect(t.$('sudo useradd anna')).toContain("user 'anna' already exists");
    expect(t.code).toBe(9);
    expect(t.$('sudo useradd -G nope bob')).toContain("group 'nope' does not exist");
    expect(t.$('sudo useradd Bad!')).toContain('invalid user name');
    t.$('sudo useradd bob');
    expect(t.$('ls /home')).not.toContain('bob');
    expect(t.$('useradd')).toContain('missing LOGIN');
  });

  it('groupadd + usermod -aG / -G and chown to the new group', () => {
    const t = term({ files: { '~/f.txt': 'x\n' } });
    expect(t.$('groupadd devs')).toContain('cannot lock /etc/group');
    t.$('sudo groupadd devs');
    expect(t.$('sudo groupadd devs')).toContain("group 'devs' already exists");
    expect(t.$('grep devs /etc/group')).toMatch(/^devs:x:\d+:$/m);
    t.$('sudo usermod -aG devs student');
    expect(t.$('groups student')).toContain('devs');
    expect(t.$('groups student')).toContain('sudo');
    expect(t.$('grep ^devs /etc/group')).toMatch(/^devs:x:\d+:student$/m);
    t.$('sudo chown :devs f.txt');
    expect(t.code).toBe(0);
    expect(t.$('ls -l f.txt')).toContain('student devs');
    t.$('sudo useradd -m eve');
    t.$('sudo usermod -G devs eve');
    expect(t.$('id -nG eve')).toBe('eve devs\n');
    expect(t.$('sudo usermod -a eve')).toContain('ONLY allowed with the -G');
    expect(t.$('sudo usermod -aG ghosts eve')).toContain("group 'ghosts' does not exist");
    expect(t.$('sudo usermod -aG devs ghost')).toContain("user 'ghost' does not exist");
    t.$('sudo usermod -s /bin/zsh eve');
    expect(t.$('grep ^eve /etc/passwd')).toContain('/bin/zsh');
    expect(t.$('sudo groupadd 9bad')).toContain('not a valid group name');
  });

  it('userdel [-r]', () => {
    const t = term();
    t.$('sudo useradd -m tmpuser');
    t.$('sudo userdel -r tmpuser');
    expect(t.code).toBe(0);
    expect(t.$('ls /home')).not.toContain('tmpuser');
    expect(t.$('grep -c tmpuser /etc/passwd')).toBe('0\n');
    expect(t.$('sudo userdel tmpuser')).toContain('does not exist');
    expect(t.$('sudo userdel student')).toContain('currently used');
    expect(t.$('userdel x')).toContain('Permission denied');
  });

  it('passwd', () => {
    const t = term();
    expect(t.$('passwd')).toContain('password updated successfully');
    expect(t.$('passwd root')).toContain('You may not view or modify password information for root');
    expect(t.$('sudo passwd root')).toContain('updated successfully');
    expect(t.$('passwd ghost')).toContain("user 'ghost' does not exist");
    expect(t.$('passwd -S')).toMatch(/^student P/);
  });
});

describe('pgrep / pkill / killall', () => {
  it('pgrep variants', () => {
    const t = term(procs);
    expect(t.$('pgrep gzip')).toBe('4720\n4721\n');
    expect(t.$('pgrep -l python')).toBe('4711 python3\n');
    expect(t.$('pgrep -a python')).toBe('4711 python3 report_generator.py --all\n');
    expect(t.$('pgrep -f report_generator')).toBe('4711\n');
    expect(t.$('pgrep report_generator')).toBe('');
    expect(t.code).toBe(1);
    expect(t.$('pgrep -c gzip')).toBe('2\n');
    expect(t.$('pgrep -u www-data nginx')).toBe('900\n');
    expect(t.$('pgrep -x gzi')).toBe('');
    expect(t.$('pgrep')).toContain('no matching criteria');
    expect(t.$('pgrep "("')).toContain('pgrep:');
  });

  it('pkill and killall', () => {
    const t = term(procs);
    expect(t.$('pkill nginx')).toContain('killing pid 900 failed: Operation not permitted');
    expect(t.code).toBe(1);
    expect(t.$('pkill -e -f report_generator.py')).toBe('python3 killed (pid 4711)\n');
    expect(t.$('pgrep python')).toBe('');
    t.$('pkill -9 gzip');
    expect(t.code).toBe(0);
    expect(t.$('pgrep gzip')).toBe('');
    expect(t.$('pkill nothing')).toBe('');
    expect(t.code).toBe(1);
    expect(t.$('pkill')).toContain('no matching criteria');
    expect(t.$('killall nginx:')).toContain('Operation not permitted');
    t.$('sudo killall nginx:');
    expect(t.$('pgrep nginx')).toBe('');
    expect(t.$('killall foo')).toBe('foo: no process found\n');
    expect(t.$('killall')).toContain('Usage');
    t.$('sudo kill 1');
    expect(t.$('sudo pkill init; pgrep init')).toBe('1\n');
  });
});

describe('diff', () => {
  const spec: MachineSpec = {
    files: {
      '~/a.txt': 'one\ntwo\nthree\nfour\n',
      '~/b.txt': 'one\nTWO\nthree\nfour\nfive\n',
      '~/c.txt': 'one\ntwo\nthree\nfour\n',
      '~/d.txt': 'two\nthree\n',
      '~/long1.txt': Array.from({ length: 20 }, (_, i) => `line ${i + 1}`).join('\n') + '\n',
      '~/long2.txt': Array.from({ length: 20 }, (_, i) => (i === 1 ? 'changed 2' : i === 17 ? 'changed 18' : `line ${i + 1}`)).join('\n') + '\n',
    },
  };
  it('normal format', () => {
    const t = term(spec);
    expect(t.$('diff a.txt b.txt')).toBe('2c2\n< two\n---\n> TWO\n4a5\n> five\n');
    expect(t.code).toBe(1);
    expect(t.$('diff a.txt c.txt')).toBe('');
    expect(t.code).toBe(0);
    expect(t.$('diff a.txt d.txt')).toBe('1d0\n< one\n4d2\n< four\n');
    expect(t.$('diff -i a.txt b.txt')).toBe('4a5\n> five\n');
  });
  it('-u, -q, -s, errors', () => {
    const t = term(spec);
    expect(t.$('diff -u a.txt b.txt')).toBe('--- a.txt\n+++ b.txt\n@@ -1,4 +1,5 @@\n one\n-two\n+TWO\n three\n four\n+five\n');
    const u = t.$('diff -u long1.txt long2.txt');
    expect(u.match(/^@@/gm)).toHaveLength(2);
    expect(u).toContain('@@ -1,5 +1,5 @@');
    expect(t.$('diff -q a.txt b.txt')).toBe('Files a.txt and b.txt differ\n');
    expect(t.$('diff -s a.txt c.txt')).toBe('Files a.txt and c.txt are identical\n');
    expect(t.$('diff a.txt nope.txt')).toBe('diff: nope.txt: No such file or directory\n');
    expect(t.code).toBe(2);
    expect(t.$('diff a.txt')).toContain("missing operand after 'a.txt'");
    expect(t.$('diff')).toContain('missing operand');
    expect(t.$('cat b.txt | diff a.txt -')).toContain('2c2');
    expect(t.$('diff -w a.txt c.txt')).toBe('');
  });
});

describe('z-tools', () => {
  it('zcat / zgrep read rotated logs', () => {
    const t = term({ files: { '/var/log/syslog.2.gz': 'Oct 29 error one\nOct 29 ok\n' } });
    expect(t.$('zcat /var/log/syslog.2.gz')).toBe('Oct 29 error one\nOct 29 ok\n');
    expect(t.$('zgrep -c error /var/log/syslog.2.gz')).toBe('1\n');
    expect(t.$('zcat /nope.gz')).toBe('zcat: /nope.gz: No such file or directory\n');
    expect(t.$('man zgrep')).toContain('compressed');
  });
});
