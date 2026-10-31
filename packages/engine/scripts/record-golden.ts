/**
 * Records reference output of the golden scenarios in a REAL bash.
 *
 *   pnpm --filter @linux-learn/engine golden:record          # local bash
 *   pnpm --filter @linux-learn/engine golden:record:docker   # Ubuntu 24.04 in Docker
 *
 * Output: test/golden/expected.json (commit it).
 */
import { spawnSync } from 'node:child_process';
import { chmodSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { scenarios } from '../golden/scenarios';

export interface GoldenRecord {
  cmd: string;
  stdout: string;
  stderr: string;
  code: number;
}

const HOME = '/home/student';

function normalize(text: string, home: string): string {
  return text
    .split(home)
    .join(HOME)
    .replace(/^bash: line \d+: /gm, 'bash: ')
    .replace(/^(\.\/[\w.]+): line \d+: /gm, '$1: ');
}

const out: Record<string, GoldenRecord[]> = {};
for (const sc of scenarios) {
  const root = mkdtempSync(join(tmpdir(), 'golden-'));
  const home = join(root, 'home', 'student');
  mkdirSync(home, { recursive: true });
  for (const [path, spec] of Object.entries(sc.files)) {
    const full = join(home, path);
    if (path.endsWith('/')) {
      mkdirSync(full, { recursive: true });
      continue;
    }
    mkdirSync(dirname(full), { recursive: true });
    const content = typeof spec === 'string' ? spec : spec.content;
    writeFileSync(full, content);
    chmodSync(full, typeof spec === 'string' ? 0o644 : parseInt(spec.mode, 8));
  }
  out[sc.name] = sc.commands.map((cmd) => {
    const r = spawnSync('bash', ['-c', cmd], {
      cwd: home,
      encoding: 'utf8',
      env: {
        HOME: home,
        USER: 'student',
        LOGNAME: 'student',
        PATH: '/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin',
        LANG: 'C.UTF-8',
        LC_ALL: 'C.UTF-8',
        TERM: 'dumb',
        SHELL: '/bin/bash',
      },
    });
    return { cmd, stdout: normalize(r.stdout, home), stderr: normalize(r.stderr, home), code: r.status ?? -1 };
  });
  rmSync(root, { recursive: true, force: true });
}

const target = join(dirname(fileURLToPath(import.meta.url)), '..', 'test', 'golden', 'expected.json');
writeFileSync(target, JSON.stringify(out, null, 2) + '\n');
const bash = spawnSync('bash', ['--version'], { encoding: 'utf8' }).stdout.split('\n')[0];
const ls = spawnSync('ls', ['--version'], { encoding: 'utf8' }).stdout.split('\n')[0];
console.log(`Recorded ${Object.values(out).flat().length} commands with ${bash} / ${ls} -> ${target}`);
