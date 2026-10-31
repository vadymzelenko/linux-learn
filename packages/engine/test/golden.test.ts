/**
 * Golden tests: engine output must match what a real bash + GNU coreutils
 * printed for the same commands (recorded by scripts/record-golden.ts).
 */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { createShell, run, type MachineSpec, type Session } from '../src';
import { scenarios } from '../golden/scenarios';
import { NOW } from './helpers';

interface GoldenRecord {
  cmd: string;
  stdout: string;
  stderr: string;
  code: number;
}

const expected = JSON.parse(readFileSync(new URL('./golden/expected.json', import.meta.url), 'utf8')) as Record<string, GoldenRecord[]>;

describe('golden: engine matches real bash', () => {
  for (const sc of scenarios) {
    describe(sc.name, () => {
      const files: MachineSpec['files'] = {};
      for (const [path, spec] of Object.entries(sc.files)) {
        files[`~/${path}`] = path.endsWith('/') ? null : typeof spec === 'string' ? spec : { content: spec.content, mode: spec.mode };
      }
      const fresh = createShell({ files, now: NOW });
      let machine = fresh.machine;
      const records = expected[sc.name];
      it('has recordings', () => {
        expect(records, `run: pnpm --filter @linux-learn/engine golden:record`).toBeDefined();
        expect(records!.map((r) => r.cmd)).toEqual(sc.commands);
      });
      (records ?? []).forEach((rec, i) => {
        it(`${i + 1}: ${rec.cmd}`, () => {
          // every command runs in a fresh `bash -c` sharing only the file system
          const session: Session = { ...fresh, machine };
          const r = run(session, rec.cmd, { now: NOW, isTTY: false });
          machine = r.session.machine;
          const stdout = r.output.filter((o) => o.stream === 'stdout').map((o) => o.text).join('');
          const stderr = r.output.filter((o) => o.stream === 'stderr').map((o) => o.text).join('');
          expect({ stdout, stderr, code: r.exitCode }).toEqual({ stdout: rec.stdout, stderr: rec.stderr, code: rec.code });
        });
      });
    });
  }
});
