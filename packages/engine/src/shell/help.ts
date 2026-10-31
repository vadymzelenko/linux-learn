import type { CommandDef } from './context';

function wrap(text: string, width: number, indent: string): string {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = '';
  for (const w of words) {
    if (line && (indent + line + ' ' + w).length > width) {
      lines.push(indent + line);
      line = w;
    } else line = line ? `${line} ${w}` : w;
  }
  if (line) lines.push(indent + line);
  return lines.join('\n');
}

/** GNU-style `--help` output. */
export function formatHelp(def: CommandDef): string {
  const { doc } = def;
  const out: string[] = [];
  doc.usage.forEach((u, i) => out.push(`${i === 0 ? 'Usage:' : '  or: '} ${u}`));
  if (doc.description) out.push(wrap(doc.description, 78, ''));
  if (doc.options?.length) {
    out.push('');
    for (const [flags, desc] of doc.options) {
      const left = `  ${flags}`;
      if (left.length <= 28) out.push(left.padEnd(30) + desc);
      else out.push(left + '\n' + ' '.repeat(30) + desc);
    }
  }
  if (def.builtin) {
    out.push('');
    out.push('This is a shell builtin.');
  }
  return out.join('\n') + '\n';
}

/** man(1)-style page. */
export function formatMan(def: CommandDef, width = 80): string {
  const { doc } = def;
  const title = `${def.name.toUpperCase()}(${def.builtin ? '1' : '1'})`;
  const center = def.builtin ? 'Bash Builtins' : 'User Commands';
  const w = Math.max(40, Math.min(width, 100));
  const gap = Math.max(1, Math.floor((w - title.length * 2 - center.length) / 2));
  const header = title + ' '.repeat(gap) + center + ' '.repeat(Math.max(1, w - title.length * 2 - center.length - gap)) + title;
  const ind = '       ';
  const out: string[] = [header, '', 'NAME', `${ind}${def.name} - ${doc.summary}`, '', 'SYNOPSIS'];
  for (const u of doc.usage) out.push(ind + u);
  out.push('', 'DESCRIPTION');
  if (doc.description) out.push(wrap(doc.description, w, ind), '');
  for (const [flags, desc] of doc.options ?? []) {
    out.push(ind + flags);
    out.push(wrap(desc, w, ind + '       '), '');
  }
  for (const n of doc.notes ?? []) out.push(wrap(n, w, ind), '');
  if (doc.examples?.length) {
    out.push('EXAMPLES');
    for (const [cmd, desc] of doc.examples) {
      out.push(ind + cmd);
      out.push(wrap(desc, w, ind + '       '), '');
    }
  }
  if (doc.seeAlso?.length) out.push('SEE ALSO', ind + doc.seeAlso.map((s) => `${s}(1)`).join(', '), '');
  out.push(`Linux Trainer${' '.repeat(Math.max(1, w - 'Linux Trainer'.length - 'October 2026'.length - title.length - 2))}October 2026  ${title}`);
  return out.join('\n') + '\n';
}
