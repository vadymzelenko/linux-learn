import { describe, expect, it } from 'vitest';
import { basic, term } from './helpers';
import { complete, createShell, evaluateChecks, explain, type Check, type ExecutedCommand } from '../src';
import { parseAnsi } from '../src/ansi';
import { editDistance, suggest } from '../src/util/levenshtein';

describe('task checks', () => {
  it('checks the state, not the exact command', () => {
    const checks: Check[] = [
      { type: 'dirExists', path: '~/project' },
      { type: 'fileExists', path: '~/project/notes.txt' },
      { type: 'notExists', path: '~/notes.txt' },
    ];
    for (const solution of [
      ['mkdir project', 'mv notes.txt project/'],
      ['mkdir ~/project && mv ~/notes.txt ~/project/notes.txt'],
      ['mkdir project', 'cp notes.txt project', 'rm notes.txt'],
      ['mkdir project', 'cd project', 'mv ../notes.txt .'],
    ]) {
      const t = term(basic);
      const executed: ExecutedCommand[] = [];
      for (const l of solution) {
        t.$(l);
        executed.push(...t.last.executed);
      }
      const ev = evaluateChecks(checks, { session: t.session, executed, lastOutput: '', lastExitCode: 0 });
      expect(ev.passed, solution.join('; ')).toBe(true);
    }
    const t = term(basic);
    t.$('mkdir project');
    const ev = evaluateChecks(checks, { session: t.session, executed: t.last.executed, lastOutput: '', lastExitCode: 0 });
    expect(ev.passed).toBe(false);
    expect(ev.progress).toBeCloseTo(1 / 3);
  });

  it('usedCommand normalises flags and gives partial credit', () => {
    const check: Check = { type: 'usedCommand', command: 'ls', flags: ['-l', '-a'] };
    const s = createShell();
    const ctx = (args: string[]) => ({ session: s, executed: [{ name: 'ls', args, exitCode: 0 }], lastOutput: '', lastExitCode: 0 });
    expect(evaluateChecks([check], ctx(['-la'])).passed).toBe(true);
    expect(evaluateChecks([check], ctx(['-al'])).passed).toBe(true);
    expect(evaluateChecks([check], ctx(['-l', '-a'])).passed).toBe(true);
    expect(evaluateChecks([check], ctx(['-lah', 'docs'])).passed).toBe(true);
    const partial = evaluateChecks([check], ctx(['-l']));
    expect(partial.passed).toBe(false);
    expect(partial.partial).toBe(true);
    expect(partial.results[0]).toEqual({ status: 'partial', missingFlags: ['-a'] });
    expect(evaluateChecks([{ type: 'usedCommand', command: 'ls', flags: ['-la'] }], ctx(['-al'])).passed).toBe(true);
    expect(evaluateChecks([{ type: 'usedCommand', command: 'grep', flags: ['--count'] }], ctx(['-la'])).passed).toBe(false);
  });

  it('other check types', () => {
    const t = term({ files: { '~/run.sh': '#!/bin/bash\necho hi\n', '~/log': 'ERROR 1\nok\n' } });
    t.$('chmod 755 run.sh; cd /tmp; ln -s /var/log ~/logs; X=1; alias g=grep; echo "result 42"');
    const c = (check: Check) => evaluateChecks([check], { session: t.session, executed: t.last.executed, lastOutput: t.last.output.map((o) => o.text).join(''), lastExitCode: t.code }).passed;
    expect(c({ type: 'modeIs', path: '~/run.sh', mode: '755' })).toBe(true);
    expect(c({ type: 'modeIs', path: '~/run.sh', mode: '644' })).toBe(false);
    expect(c({ type: 'cwdIs', path: '/tmp' })).toBe(true);
    expect(c({ type: 'symlinkExists', path: '~/logs', target: '/var/log' })).toBe(true);
    expect(c({ type: 'fileContains', path: '~/log', text: 'ERROR' })).toBe(true);
    expect(c({ type: 'fileContains', path: '~/log', regex: '^ok$' })).toBe(true);
    expect(c({ type: 'fileNotContains', path: '~/log', text: 'WARN' })).toBe(true);
    expect(c({ type: 'outputContains', text: 'result 42' })).toBe(true);
    expect(c({ type: 'outputContains', regex: 'result \\d+' })).toBe(true);
    expect(c({ type: 'varEquals', name: 'X', value: '1' })).toBe(true);
    expect(c({ type: 'aliasExists', name: 'g', value: 'grep' })).toBe(true);
    expect(c({ type: 'userIs', user: 'student' })).toBe(true);
    expect(c({ type: 'ownerIs', path: '~/run.sh', owner: 'student' })).toBe(true);
    expect(c({ type: 'countIn', path: '~', pattern: '*.sh', eq: 1 })).toBe(true);
    expect(c({ type: 'dirEmpty', path: '/mnt' })).toBe(true);
    expect(c({ type: 'exitCode', code: 0 })).toBe(true);
    expect(c({ type: 'outputLines', eq: 1 })).toBe(true);
    expect(c({ type: 'fileEquals', path: '~/log', text: 'ERROR 1\nok' })).toBe(true);
    expect(c({ type: 'usedCommand', command: 'chmod', args: ['755'], success: true })).toBe(true);
    expect(c({ type: 'processGone', name: 'cron' })).toBe(false);
  });

  it('paths stay relative to the student home after sudo -i', () => {
    const t = term(basic);
    t.$('sudo -i');
    const ev = evaluateChecks([{ type: 'fileExists', path: '~/notes.txt' }], { session: t.session, executed: [], lastOutput: '', lastExitCode: 0 });
    expect(ev.passed).toBe(true);
  });
});

describe('tab completion', () => {
  const s = createShell({ files: { '~/documents/': null, '~/downloads/': null, '~/notes.txt': '', '~/my file.txt': '', '~/.hidden': '' } });
  it('completes commands', () => {
    expect(complete(s, 'whoa')).toMatchObject({ line: 'whoami ', candidates: [] });
    expect(complete(s, 'mkd').line).toBe('mkdir ');
    expect(complete(s, 'c').candidates).toEqual(expect.arrayContaining(['cat', 'cd', 'cp']));
    expect(complete(s, 'sudo whoa').line).toBe('sudo whoami ');
  });
  it('completes paths', () => {
    expect(complete(s, 'cat no').line).toBe('cat notes.txt ');
    expect(complete(s, 'cd do')).toMatchObject({ line: 'cd do', candidates: ['documents/', 'downloads/'] });
    expect(complete(s, 'cd doc').line).toBe('cd documents/');
    expect(complete(s, 'cat my').line).toBe('cat my\\ file.txt ');
    expect(complete(s, 'ls .hi').line).toBe('ls .hidden ');
    expect(complete(s, 'ls /et').line).toBe('ls /etc/');
    expect(complete(s, 'ls ~/no').line).toBe('ls ~/notes.txt ');
    expect(complete(s, 'cd n').candidates).toEqual([]);
    expect(complete(s, 'cat xyz')).toMatchObject({ line: 'cat xyz', candidates: [] });
    expect(complete(s, 'ls | gre').line).toBe('ls | grep ');
    expect(complete(s, 'echo $HOM').line).toBe('echo $HOME ');
    expect(complete(s, 'echo $HO').candidates).toEqual(['$HOME', '$HOSTNAME']);
  });
  it('keeps text after the cursor', () => {
    const r = complete(s, 'cat no | wc', 6);
    expect(r.line).toBe('cat notes.txt  | wc');
    expect(r.cursor).toBe(14);
  });
});

describe('explain', () => {
  it('splits a command into parts', () => {
    const e = explain('ls -la /var/log | grep -i error > out.txt');
    expect(e.parts.map((p) => [p.text, p.kind])).toEqual([
      ['ls', 'command'],
      ['-la', 'flag'],
      ['/var/log', 'arg'],
      ['|', 'operator'],
      ['grep', 'command'],
      ['-i', 'flag'],
      ['error', 'arg'],
      ['>', 'redirect'],
      ['out.txt', 'arg'],
    ]);
    expect(e.parts[1]!.description).toContain('-l: use a long listing format');
    expect(e.parts[1]!.description).toContain('-a: do not ignore entries starting with .');
    expect(e.parts[3]!.key).toBe('explain.op.pipe');
  });
  it('option values, sudo and unknown commands', () => {
    const e = explain('sudo head -n 5 *.log && foo');
    expect(e.parts.map((p) => p.kind)).toEqual(['command', 'command', 'flag', 'value', 'arg', 'operator', 'unknown']);
    expect(e.parts[4]!.key).toBe('explain.arg.glob');
  });
  it('find predicates and long options', () => {
    const e = explain('find . -name "*.txt" -type f');
    expect(e.parts.map((p) => p.kind)).toEqual(['command', 'arg', 'flag', 'value', 'flag', 'value']);
    expect(explain('ls --all').parts[1]!.description).toBe('do not ignore entries starting with .');
  });
  it('reports syntax errors', () => {
    expect(explain('ls |').error).toContain('unexpected end of file');
  });
});

describe('ansi & levenshtein', () => {
  it('parses colors and clear', () => {
    const r = parseAnsi('a\x1b[01;34mdir\x1b[0m b');
    expect(r.spans).toEqual([
      { text: 'a', style: {} },
      { text: 'dir', style: { bold: true, fg: 4 } },
      { text: ' b', style: {} },
    ]);
    expect(parseAnsi('old\x1b[H\x1b[2Jnew')).toEqual({ spans: [{ text: 'new', style: {} }], cleared: true });
  });
  it('distance with transpositions', () => {
    expect(editDistance('sl', 'ls')).toBe(1);
    expect(editDistance('kitten', 'sitting')).toBe(3);
    expect(suggest('mkdri', ['mkdir', 'rmdir'])).toBe('mkdir');
    expect(suggest('zzzz', ['ls'])).toBeUndefined();
  });
});
