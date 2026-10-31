import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import { basename, dirname, normalize, tildify, expandTilde } from '../src/vfs/path';
import { collate, resolve, FsError } from '../src/vfs/fs';
import { createShell } from '../src';
import { globMatch, expandGlob, hasGlobChars } from '../src/shell/glob';
import { humanSize } from '../src/commands/util';

const student = { name: 'student', groups: ['student', 'sudo'], root: false };

describe('paths', () => {
  it('normalizes', () => {
    expect(normalize('a//b/./c/../d', '/home/student')).toBe('/home/student/a/b/d');
    expect(normalize('../../..', '/home/student')).toBe('/');
    expect(normalize('/', '/x')).toBe('/');
    expect(normalize('.', '/x')).toBe('/x');
  });
  it('dirname / basename like coreutils', () => {
    expect(dirname('/var/log/syslog')).toBe('/var/log');
    expect(dirname('file')).toBe('.');
    expect(dirname('/file')).toBe('/');
    expect(dirname('a/b/')).toBe('a');
    expect(basename('/var/log/')).toBe('log');
    expect(basename('photo.jpg', '.jpg')).toBe('photo');
    expect(basename('/')).toBe('/');
  });
  it('tilde helpers', () => {
    expect(tildify('/home/student/x', '/home/student')).toBe('~/x');
    expect(tildify('/home/student', '/home/student')).toBe('~');
    expect(tildify('/home/studentx', '/home/student')).toBe('/home/studentx');
    expect(expandTilde('~/a', '/home/s')).toBe('/home/s/a');
  });

  it('property: normalize is idempotent and always absolute', () => {
    const seg = fc.constantFrom('a', 'b', '.', '..', '', 'c d');
    fc.assert(
      fc.property(fc.array(seg, { maxLength: 12 }), fc.boolean(), (segs, abs) => {
        const p = (abs ? '/' : '') + segs.join('/');
        const n = normalize(p, '/home/student');
        expect(n.startsWith('/')).toBe(true);
        expect(normalize(n)).toBe(n);
        expect(n.includes('//')).toBe(n === '//' );
        expect(n.split('/').includes('..')).toBe(false);
      }),
    );
  });
});

describe('resolution', () => {
  const s = createShell({
    files: {
      '~/a/b/file.txt': 'x',
      '~/link': { symlink: 'a/b' },
      '~/abs': { symlink: '/etc' },
      '~/loop1': { symlink: 'loop2' },
      '~/loop2': { symlink: 'loop1' },
      '~/dangling': { symlink: 'nowhere' },
    },
  });
  const fs = s.machine.fs;
  it('follows relative and absolute symlinks', () => {
    expect(resolve(fs, '/home/student/link/file.txt', student).canon).toEqual(['home', 'student', 'a', 'b', 'file.txt']);
    expect(resolve(fs, '/home/student/abs/hostname', student).node.type).toBe('file');
    expect(resolve(fs, '/home/student/link/..', student).canon).toEqual(['home', 'student', 'a']);
    expect(resolve(fs, '/home/student/link', student, false).node.type).toBe('symlink');
  });
  it('detects loops and errors', () => {
    expect(() => resolve(fs, '/home/student/loop1', student)).toThrow(FsError);
    try {
      resolve(fs, '/home/student/loop1', student);
    } catch (e) {
      expect((e as FsError).code).toBe('ELOOP');
    }
    expect(() => resolve(fs, '/home/student/dangling', student)).toThrow('ENOENT');
    expect(() => resolve(fs, '/home/student/a/b/file.txt/x', student)).toThrow('ENOTDIR');
    expect(() => resolve(fs, '/home/student/a/b/file.txt/', student)).toThrow('ENOTDIR');
    expect(() => resolve(fs, '/root/.bashrc', student)).toThrow('EACCES');
  });
  it('root can traverse anything', () => {
    expect(resolve(fs, '/root/.bashrc', { name: 'root', groups: ['root'], root: true }).node.type).toBe('file');
  });
});

describe('glob', () => {
  it('matches like bash', () => {
    expect(globMatch('*.txt', 'a.txt')).toBe(true);
    expect(globMatch('*.txt', 'a.txt.bak')).toBe(false);
    expect(globMatch('file?.log', 'file1.log')).toBe(true);
    expect(globMatch('[ab]*', 'apple')).toBe(true);
    expect(globMatch('[!ab]*', 'apple')).toBe(false);
    expect(globMatch('[a-c]x', 'bx')).toBe(true);
    expect(globMatch('\\*', '*')).toBe(true);
    expect(globMatch('\\*', 'a')).toBe(false);
    expect(hasGlobChars('a\\*b')).toBe(false);
    expect(hasGlobChars('[x')).toBe(false);
  });
  it('expands relative patterns across directories', () => {
    const tree: Record<string, string[]> = { '/h': ['a', 'b', '.hidden'], '/h/a': ['x.txt', 'y.md'], '/h/b': ['z.txt'] };
    const fsx = {
      list: (p: string) => tree[p] ?? null,
      exists: (p: string) => p in tree || Object.entries(tree).some(([d, ns]) => ns.some((n) => `${d}/${n}` === p)),
      isDir: (p: string) => p in tree,
      compare: collate,
    };
    expect(expandGlob('*/*.txt', '/h', fsx)).toEqual(['a/x.txt', 'b/z.txt']);
    expect(expandGlob('*', '/h', fsx)).toEqual(['a', 'b']);
    expect(expandGlob('.*', '/h', fsx)).toEqual(['.hidden']);
    expect(expandGlob('/h/a/*', '/', fsx)).toEqual(['/h/a/x.txt', '/h/a/y.md']);
    expect(expandGlob('*/', '/h', fsx)).toEqual(['a/', 'b/']);
    expect(expandGlob('nothing*', '/h', fsx)).toEqual([]);
  });
  it('property: a literal name always matches itself when escaped', () => {
    fc.assert(
      fc.property(fc.string({ maxLength: 12 }).filter((s) => !s.includes('/')), (name) => {
        const escaped = name.replace(/[\\*?[\]]/g, '\\$&');
        expect(globMatch(escaped, name)).toBe(true);
        expect(globMatch('*', name)).toBe(true);
      }),
    );
  });
});

describe('collation & sizes', () => {
  it('sorts like en_US.UTF-8', () => {
    expect(['b', '.bashrc', 'Documents', 'a', '_x'].sort(collate)).toEqual(['a', 'b', '.bashrc', 'Documents', '_x']);
    expect(['B', 'a', 'A', 'b'].sort(collate)).toEqual(['a', 'A', 'b', 'B']);
  });
  it('human sizes round up like GNU', () => {
    expect(humanSize(0)).toBe('0');
    expect(humanSize(1023)).toBe('1023');
    expect(humanSize(1024)).toBe('1.0K');
    expect(humanSize(1536)).toBe('1.5K');
    expect(humanSize(4097)).toBe('4.1K');
    expect(humanSize(10 * 1024)).toBe('10K');
    expect(humanSize(10 * 1024 + 1)).toBe('11K');
    expect(humanSize(5 * 1024 * 1024)).toBe('5.0M');
    expect(humanSize(1024 ** 3 * 2.5)).toBe('2.5G');
  });
});
