import { describe, expect, it } from 'vitest';
import { highlightCommand, highlightHelp } from '../src/lib/highlight';

const kinds = (l: string) => highlightCommand(l).filter((s) => s.text.trim()).map((s) => `${s.kind}:${s.text}`);

describe('terminal highlighting', () => {
  it('commands, flags, strings, paths, operators, variables', () => {
    expect(kinds('grep -rn "TODO x" src/ | wc -l > out.txt')).toEqual(['cmd:grep', 'flag:-rn', 'string:"TODO x"', 'path:src/', 'op:|', 'cmd:wc', 'flag:-l', 'op:>', 'text:out.txt']);
    expect(kinds('sudo chown $USER ~/f && cd ..')).toEqual(['cmd:sudo', 'cmd:chown', 'var:$USER', 'path:~/f', 'op:&&', 'cmd:cd', 'path:..']);
    expect(kinds('X=1 echo hi # note')).toEqual(['var:X=1', 'cmd:echo', 'text:hi', 'comment:# note']);
    expect(kinds('for f in *.log; do gzip $f; done')[0]).toBe('op:for');
    expect(highlightCommand('ls  -la').map((s) => s.text).join('')).toBe('ls  -la');
  });
  it('help pages: usage and options', () => {
    const h = highlightHelp('Usage: ls [OPTION]...\n  -a, --all   show hidden\nplain\n')!;
    expect(h.find((s) => s.kind === 'cmd')?.text).toBe('Usage:');
    expect(h.find((s) => s.kind === 'flag')?.text).toBe('-a, --all');
    expect(h.map((s) => s.text).join('')).toBe('Usage: ls [OPTION]...\n  -a, --all   show hidden\nplain\n');
    expect(highlightHelp('just output\n')).toBeNull();
  });
});
