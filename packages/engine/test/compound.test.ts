import { describe, expect, it } from 'vitest';
import { term } from './helpers';

describe('compound commands', () => {
  const spec = { files: { '~/hosts.txt': 'web01\ndb01\n\ncache01\n', '~/a.log': 'x\n', '~/b.log': 'y\n' } };
  it('for loops', () => {
    const t = term(spec);
    expect(t.$('for i in 1 2 3; do echo n$i; done')).toBe('n1\nn2\nn3\n');
    expect(t.$('for f in *.log; do echo "file: $f"; done')).toBe('file: a.log\nfile: b.log\n');
    expect(t.$('for i in {1..3}\ndo\n  echo $i\ndone')).toBe('1\n2\n3\n');
    expect(t.$('for x in a b c; do if [ $x = b ]; then continue; fi; echo $x; done')).toBe('a\nc\n');
    expect(t.$('for x in a b c; do echo $x; break; done')).toBe('a\n');
    expect(t.$('for i in 1 2; do for j in a b; do echo $i$j; break 2; done; done')).toBe('1a\n');
    expect(t.$('for i in 1 2 3; do echo $i; done | wc -l')).toBe('3\n');
    expect(t.$('for i in 1 2; do echo $i; done > out.txt; cat out.txt')).toBe('1\n2\n');
    expect(t.$('for i in; do echo x; done')).toBe('');
    expect(t.$('break')).toBe('');
    expect(t.$('break x; echo $?')).toContain('loop count out of range');
  });
  it('if / elif / else', () => {
    const t = term(spec);
    expect(t.$('if [ -f hosts.txt ]; then echo yes; else echo no; fi')).toBe('yes\n');
    expect(t.$('if [ -f nope ]; then echo yes; else echo no; fi')).toBe('no\n');
    expect(t.$('n=5; if [ $n -gt 10 ]; then echo big; elif [ $n -gt 3 ]; then echo mid; else echo small; fi')).toBe('mid\n');
    expect(t.$('if grep -q db01 hosts.txt; then echo found; fi')).toBe('found\n');
    expect(t.$('if false; then echo x; fi; echo $?')).toBe('0\n');
    expect(t.$('if true; then echo a; fi && echo b')).toBe('a\nb\n');
  });
  it('while / until / read', () => {
    const t = term(spec);
    expect(t.$('while read h; do echo "ping $h"; done < hosts.txt')).toBe('ping web01\nping db01\nping \nping cache01\n');
    expect(t.$('cat hosts.txt | while read h; do [ -z "$h" ] && continue; echo $h; done')).toBe('web01\ndb01\ncache01\n');
    expect(t.$('i=0; while [ $i -lt 3 ]; do echo $i; i=$((i+1)); done')).toBe('0\n1\n2\n');
    expect(t.$('i=3; until [ $i -eq 0 ]; do echo $i; i=$((i - 1)); done')).toBe('3\n2\n1\n');
    expect(t.$('echo "a b c" | { read x y; echo "$y/$x"; }')).toBe('b c/a\n');
    expect(t.$('read v < hosts.txt; echo $v')).toBe('web01\n');
    expect(t.$('read; echo "[$REPLY]"')).toBe('[]\n');
    expect(t.$('while true; do echo x; done')).toContain('');
  });
  it('syntax errors', () => {
    const t = term();
    expect(t.$('for i in 1 2; echo $i; done')).toContain('syntax error');
    expect(t.$('if true; then echo x')).toContain('unexpected end of file');
    expect(t.$('done')).toContain("syntax error near unexpected token `done'");
    expect(t.$('if true; then fi')).toContain('syntax error');
    expect(t.$('for 1x in a; do echo; done')).toContain('syntax error');
    expect(t.$('while true; do echo; done foo')).toContain('syntax error');
  });
  it('arithmetic', () => {
    const t = term();
    expect(t.$('echo $((2+3*4))')).toBe('14\n');
    expect(t.$('echo $(( (2+3)*4 ))')).toBe('20\n');
    expect(t.$('a=7; b=2; echo $((a/b)) $((a%b)) $(($a-$b)) $((a**b))')).toBe('3 1 5 49\n');
    expect(t.$('echo $((5>3)) $((2==3)) $((1&&0)) $((0||1)) $((!0)) $((-4+1))')).toBe('1 0 0 1 1 -3\n');
    expect(t.$('echo $((1/0))')).toContain('division by 0');
    expect(t.$('echo $((2+))')).toContain('syntax error');
    expect(t.$('echo $((2 @ 3))')).toContain('syntax error');
    expect(t.$('x=abc; echo $((x))')).toBe('0\n');
    expect(t.$('x=hello1; echo $((x))')).toBe('0\n');
    expect(t.$('y=3; x=y; echo $((x+1))')).toBe('4\n');
    expect(t.$('x=1.5; echo $((x))')).toContain('operand expected');
    expect(t.$('echo $(())')).toBe('0\n');
    expect(t.$('echo $((2+(3))')).toContain('missing');
  });
});

describe('awk arrays and loops', () => {
  const spec = { files: { '~/s.csv': 'date,city,amount\n1,Kyiv,120\n1,Lviv,80\n2,Kyiv,200\n', '~/ips.log': 'a x\nb y\na z\na w\n' } };
  it('associative arrays', () => {
    const t = term(spec);
    expect(t.$("awk -F, 'NR>1 {t[$2]+=$3} END {for (c in t) print c, t[c]}' s.csv")).toBe('Kyiv 320\nLviv 80\n');
    expect(t.$("awk '{n[$1]++} END {for (k in n) print n[k], k}' ips.log | sort -rn")).toBe('3 a\n1 b\n');
    expect(t.$("awk '!seen[$1]++' ips.log")).toBe('a x\nb y\n');
    expect(t.$("awk '{n[$1]++} END {print length(n)}' ips.log")).toBe('2\n');
    expect(t.$("awk '{n[$1]++} END {if (\"a\" in n) print \"yes\"; if ((\"c\" in n) == 0) print \"no\"}' ips.log")).toBe('yes\nno\n');
    expect(t.$("awk '{n[$1]++} END {delete n[\"a\"]; for (k in n) print k; delete n; print length(n)}' ips.log")).toBe('b\n0\n');
    expect(t.$("awk 'BEGIN {k = split(\"a:b:c\", p, \":\"); print k, p[1], p[3]}'")).toBe('3 a c\n');
    expect(t.$("awk 'BEGIN {split(\"x y\", q); print q[2]; m[1,2]=5; print m[1,2]}'")).toBe('y\n5\n');
  });
  it('loops, break, continue, exit', () => {
    const t = term(spec);
    expect(t.$("awk 'BEGIN {for (i = 1; i <= 3; i++) print i}'")).toBe('1\n2\n3\n');
    expect(t.$("awk 'BEGIN {i = 0; while (i < 5) {i++; if (i == 2) continue; if (i == 4) break; print i}}'")).toBe('1\n3\n');
    expect(t.$("awk '{print; if (NR == 2) exit} END {print \"end\"}' ips.log")).toBe('a x\nb y\nend\n');
    expect(t.$("awk 'BEGIN {print \"x\"; exit 1; print \"y\"}'")).toBe('x\n');
    expect(t.$("awk '{for (i = NF; i > 0; i--) printf \"%s \", $i; print \"\"}' ips.log | head -1")).toBe('x a \n');
    expect(t.$("awk 'BEGIN {for (;;) {n++; if (n > 3) break}; print n}'")).toBe('4\n');
    expect(t.$("awk 'BEGIN {delete 5}'")).toContain('syntax error');
    expect(t.$("awk 'BEGIN {if (1 in ) print}'")).toContain('expected array name');
    expect(t.$("awk 'BEGIN {split(\"a\", 5)}'")).toContain('split');
  });
});
