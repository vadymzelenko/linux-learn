import { describe, expect, it } from 'vitest';
import { parse, tokenize, ParseError, wordLiteral } from '../src/shell/parser';

describe('tokenizer', () => {
  it('splits words and keeps quotes info', () => {
    const s = parse(`echo 'a b' "c $HOME" d\\ e # comment`);
    const words = s.items[0]!.pipeline[0]!.words;
    expect(words.map(wordLiteral)).toEqual(['echo', 'a b', 'c $HOME', 'd e']);
    expect(words[1]!.parts[0]).toMatchObject({ t: 'lit', q: 1 });
    expect(words[2]!.parts[1]).toMatchObject({ t: 'var', name: 'HOME', q: 2 });
  });

  it('parses pipes, lists and redirects', () => {
    const s = parse('ls -l | grep x > out.txt 2>&1 && echo ok || echo fail; pwd');
    expect(s.items).toHaveLength(4);
    expect(s.items[0]!.pipeline).toHaveLength(2);
    expect(s.items[0]!.next).toBe('&&');
    const grep = s.items[0]!.pipeline[1]!;
    expect(grep.redirects.map((r) => [r.fd, r.op, wordLiteral(r.target)])).toEqual([
      [1, '>', 'out.txt'],
      [2, '>&', '1'],
    ]);
    expect(s.items[1]!.next).toBe('||');
    expect(s.items[2]!.next).toBe(';');
  });

  it('handles fd-prefixed redirects only when attached', () => {
    const a = parse('cmd 2>err.log').items[0]!.pipeline[0]!;
    expect(a.redirects[0]).toMatchObject({ fd: 2, op: '>' });
    const b = parse('echo 2 >out').items[0]!.pipeline[0]!;
    expect(b.words.map(wordLiteral)).toEqual(['echo', '2']);
    expect(b.redirects[0]).toMatchObject({ fd: 1 });
  });

  it('parses assignments', () => {
    const c = parse('FOO=bar BAZ="x y" env').items[0]!.pipeline[0]!;
    expect(c.assignments.map((a) => [a.name, wordLiteral(a.value)])).toEqual([
      ['FOO', 'bar'],
      ['BAZ', 'x y'],
    ]);
    expect(c.words.map(wordLiteral)).toEqual(['env']);
  });

  it('parses command substitution and ${}', () => {
    const c = parse('echo $(ls -1 | wc -l) ${HOME}x').items[0]!.pipeline[0]!;
    expect(c.words[1]!.parts[0]).toMatchObject({ t: 'sub', src: 'ls -1 | wc -l' });
    expect(c.words[2]!.parts).toMatchObject([{ t: 'var', name: 'HOME' }, { t: 'lit', v: 'x' }]);
  });

  it('reports bash-like syntax errors', () => {
    expect(() => parse('| ls')).toThrow("syntax error near unexpected token `|'");
    expect(() => parse('ls >')).toThrow("syntax error near unexpected token `newline'");
    expect(() => parse("echo 'abc")).toThrow("unexpected EOF while looking for matching `''");
    expect(() => parse('echo "abc')).toThrow(ParseError);
    expect(() => parse('ls &&')).toThrow('unexpected end of file');
    expect(() => parse('ls && && pwd')).toThrow("syntax error near unexpected token `&&'");
  });

  it('empty input and comments', () => {
    expect(parse('').items).toEqual([]);
    expect(parse('   # just a comment').items).toEqual([]);
    expect(tokenize('a#b')).toHaveLength(1);
  });

  it('handles empty quoted strings as arguments', () => {
    const c = parse(`echo "" ''`).items[0]!.pipeline[0]!;
    expect(c.words).toHaveLength(3);
  });
});
