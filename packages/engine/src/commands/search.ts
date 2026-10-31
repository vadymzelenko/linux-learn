import type { DirNode, FsNode } from '../types';
import type { CommandDef, Ctx } from '../shell/context';
import { parseArgs } from '../shell/args';
import { can, collate, FsError, nodeBlocksK, nodeSize, resolveParent, removeChild, R, X } from '../vfs/fs';
import { globMatch } from '../shell/glob';
import { humanSize, modeString, q } from './util';

// ---------------------------------------------------------------- find

interface FindItem {
  node: FsNode;
  path: string; // shown path
  abs: string;
  depth: number;
}

type Pred = (it: FindItem) => boolean;

class FindError extends Error {}

export const find: CommandDef = {
  name: 'find',
  category: 'search',
  doc: {
    summary: 'search for files in a directory hierarchy',
    usage: ['find [starting-point...] [expression]'],
    description:
      'find walks the directory tree rooted at each starting point (default: the current directory) and evaluates the expression for every file. Tests are combined with -a (and, default), -o (or), ! / -not and parentheses \\( \\).',
    options: [
      ['-name PATTERN', 'base name matches shell PATTERN (quote it: -name "*.log")'],
      ['-iname PATTERN', 'like -name, but case insensitive'],
      ['-path PATTERN', 'whole path matches PATTERN'],
      ['-type c', 'file is of type c: f (regular file), d (directory), l (symbolic link)'],
      ['-size [+-]N[ckMG]', 'file uses more (+) / less (-) / exactly N units of space'],
      ['-mtime [+-]N', 'file was modified more/less than N*24 hours ago'],
      ['-mmin [+-]N', 'file was modified more/less than N minutes ago'],
      ['-empty', 'file is empty and is either a regular file or a directory'],
      ['-user NAME', 'file is owned by user NAME'],
      ['-perm MODE', 'permission bits are exactly MODE (octal)'],
      ['-maxdepth N', 'descend at most N levels'],
      ['-mindepth N', 'do not apply tests at levels less than N'],
      ['-newer FILE', 'file was modified more recently than FILE'],
      ['-print', 'print the full file name (default action)'],
      ['-delete', 'delete files; true if removal succeeded'],
      ['-exec COMMAND {} ;', "execute COMMAND; {} is replaced by the file name, the command ends with an escaped ';' (\\;) or '+'"],
    ],
    examples: [
      ['find . -name "*.txt"', 'all .txt files below the current directory'],
      ['find /var/log -size +10M', 'files bigger than 10 MiB'],
      ['find ~ -type d -empty', 'empty directories in your home'],
      ['find . -name "*.tmp" -delete', 'delete all .tmp files'],
    ],
    seeAlso: ['locate', 'grep', 'xargs'],
  },
  run(ctx) {
    const args = ctx.args;
    let i = 0;
    const starts: string[] = [];
    while (i < args.length && !args[i]!.startsWith('-') && args[i] !== '!' && args[i] !== '(') starts.push(args[i++]!);
    if (starts.length === 0) starts.push('.');
    let maxDepth = Infinity;
    let minDepth = 0;
    let hasAction = false;
    let code = 0;
    const execResults: { chunksCode: number }[] = [];
    void execResults;

    const need = (opt: string): string => {
      const v = args[i++];
      if (v === undefined) throw new FindError(`missing argument to \`${opt}'`);
      return v;
    };
    const cmpNum = (spec: string, value: number, opt: string): boolean => {
      const m = /^([+-]?)(\d+)$/.exec(spec);
      if (!m) throw new FindError(`invalid argument \`${spec}' to \`${opt}'`);
      const n = Number(m[2]);
      return m[1] === '+' ? value > n : m[1] === '-' ? value < n : value === n;
    };

    const parsePrimary = (): Pred => {
      const tok = args[i++];
      if (tok === undefined) throw new FindError('expected an expression');
      switch (tok) {
        case '(': {
          const e = parseOr();
          if (args[i++] !== ')') throw new FindError("invalid expression; I was expecting to find a ')' somewhere but did not see one.");
          return e;
        }
        case '!':
        case '-not': {
          const e = parsePrimary();
          return (it) => !e(it);
        }
        case '-name':
        case '-iname': {
          const pat = need(tok);
          const ci = tok === '-iname';
          return (it) => {
            const base = it.path === '/' ? '/' : it.path.replace(/\/+$/, '').split('/').pop()!;
            return ci ? globMatch(pat.toLowerCase(), base.toLowerCase()) : globMatch(pat, base);
          };
        }
        case '-path':
        case '-wholename': {
          const pat = need(tok);
          const re = new RegExp('^' + pat.split('*').map((s) => s.replace(/[.+?^${}()|[\]\\]/g, '\\$&')).join('.*') + '$');
          return (it) => re.test(it.path);
        }
        case '-type': {
          const t = need(tok);
          if (!/^[fdl](,[fdl])*$/.test(t)) throw new FindError(`Unknown argument to -type: ${t}`);
          const types = t.split(',').map((x) => ({ f: 'file', d: 'dir', l: 'symlink' })[x]);
          return (it) => types.includes(it.node.type);
        }
        case '-size': {
          const spec = need(tok);
          const m = /^([+-]?)(\d+)([bckwMG]?)$/.exec(spec);
          if (!m) throw new FindError(`invalid -size type \`${spec.replace(/^[+-]?\d*/, '')}'`);
          const unit = { b: 512, c: 1, w: 2, k: 1024, M: 1024 ** 2, G: 1024 ** 3, '': 512 }[m[3]!]!;
          const n = Number(m[2]);
          return (it) => {
            const size = nodeSize(it.node);
            const units = unit === 1 ? size : Math.ceil(size / unit);
            return m[1] === '+' ? units > n : m[1] === '-' ? units < n : units === n;
          };
        }
        case '-mtime':
        case '-mmin': {
          const spec = need(tok);
          const div = tok === '-mtime' ? 86_400_000 : 60_000;
          cmpNum(spec, 0, tok);
          return (it) => cmpNum(spec, Math.floor((ctx.now - it.node.mtime) / div), tok);
        }
        case '-newer': {
          const ref = need(tok);
          const r = ctx.tryStat(ref);
          if (!r) throw new FindError(`'${ref}': No such file or directory`);
          return (it) => it.node.mtime > r.node.mtime;
        }
        case '-empty':
          return (it) => (it.node.type === 'file' ? nodeSize(it.node) === 0 : it.node.type === 'dir' ? Object.keys(it.node.children).length === 0 : false);
        case '-user': {
          const u = need(tok);
          return (it) => it.node.owner === u;
        }
        case '-group': {
          const g = need(tok);
          return (it) => it.node.group === g;
        }
        case '-perm': {
          const spec = need(tok);
          const m = /^([-/]?)([0-7]{1,4})$/.exec(spec);
          if (!m) throw new FindError(`invalid mode \`${spec}'`);
          const mode = parseInt(m[2]!, 8);
          return (it) => {
            const pm = it.node.mode & 0o7777;
            return m[1] === '-' ? (pm & mode) === mode : m[1] === '/' ? (pm & mode) !== 0 || mode === 0 : pm === mode;
          };
        }
        case '-maxdepth':
        case '-mindepth': {
          const v = need(tok);
          if (!/^\d+$/.test(v)) throw new FindError(`Expected a positive decimal integer argument to ${tok}, but got ${q(v)}`);
          if (tok === '-maxdepth') maxDepth = Number(v);
          else minDepth = Number(v);
          return () => true;
        }
        case '-true':
          return () => true;
        case '-false':
          return () => false;
        case '-print':
          hasAction = true;
          return (it) => {
            ctx.out(it.path + '\n');
            return true;
          };
        case '-ls':
          hasAction = true;
          return (it) => {
            ctx.out(`${String(nodeBlocksK(it.node)).padStart(6)} ${modeString(it.node)}   1 ${it.node.owner} ${it.node.group} ${String(nodeSize(it.node)).padStart(8)} ${it.path}\n`);
            return true;
          };
        case '-delete':
          hasAction = true;
          return (it) => {
            try {
              if (it.node.type === 'dir' && Object.keys((ctx.tryStat(it.abs, false)?.node as DirNode | undefined)?.children ?? {}).length > 0) {
                throw new FsError('ENOTEMPTY');
              }
              const ref = resolveParent(ctx.fs, it.abs, ctx.cred);
              if (!can(ref.parent, ctx.cred, 2)) throw new FsError('EACCES');
              ctx.fs = removeChild(ctx.fs, ref.parentCanon, ref.name, ctx.now);
              return true;
            } catch (e) {
              if (e instanceof FsError) {
                ctx.fail(`cannot delete '${it.path}': ${e.text}`);
                code = 1;
                return false;
              }
              throw e;
            }
          };
        case '-exec':
        case '-ok': {
          hasAction = true;
          const cmd: string[] = [];
          while (i < args.length && args[i] !== ';' && args[i] !== '+') cmd.push(args[i++]!);
          const term = args[i++];
          if (term === undefined || cmd.length === 0) throw new FindError(`missing argument to \`${tok}'`);
          if (term === '+') {
            const batch: string[] = [];
            batchRunners.push(() => {
              if (batch.length === 0) return;
              const argv = cmd.flatMap((c) => (c === '{}' ? batch : [c]));
              const r = ctx.shell.run(argv, null);
              ctx.forward(r.chunks);
              if (r.code !== 0) code = 1;
            });
            return (it) => {
              batch.push(it.path);
              return true;
            };
          }
          return (it) => {
            const argv = cmd.map((c) => c.split('{}').join(it.path));
            const r = ctx.shell.run(argv, null);
            ctx.forward(r.chunks);
            return r.code === 0;
          };
        }
        default:
          if (tok.startsWith('-')) throw new FindError(`unknown predicate \`${tok}'`);
          throw new FindError(`paths must precede expression: \`${tok}'`);
      }
    };
    const parseAnd = (): Pred => {
      let left = parsePrimary();
      while (i < args.length && args[i] !== '-o' && args[i] !== '-or' && args[i] !== ')' && args[i] !== ',') {
        if (args[i] === '-a' || args[i] === '-and') i++;
        const right = parsePrimary();
        const l = left;
        left = (it) => l(it) && right(it);
      }
      return left;
    };
    const parseOr = (): Pred => {
      let left = parseAnd();
      while (args[i] === '-o' || args[i] === '-or') {
        i++;
        const right = parseAnd();
        const l = left;
        left = (it) => l(it) || right(it);
      }
      return left;
    };
    const batchRunners: (() => void)[] = [];

    let expr: Pred = () => true;
    try {
      if (i < args.length) expr = parseOr();
      if (i < args.length) throw new FindError(`paths must precede expression: \`${args[i]}'`);
    } catch (e) {
      if (e instanceof FindError) {
        ctx.fail(e.message);
        return 1;
      }
      throw e;
    }
    const pred: Pred = hasAction ? expr : (it) => {
      if (expr(it)) ctx.out(it.path + '\n');
      return true;
    };

    const visit = (it: FindItem) => {
      if (it.depth >= minDepth) pred(it);
      if (it.node.type !== 'dir' || it.depth >= maxDepth) return;
      // re-read the directory (it may have been changed by -delete / -exec)
      const fresh = ctx.tryStat(it.abs, false)?.node;
      if (!fresh || fresh.type !== 'dir') return;
      if (!can(fresh, ctx.cred, R) || !can(fresh, ctx.cred, X)) {
        ctx.fail(`${q(it.path)}: Permission denied`);
        code = 1;
        return;
      }
      for (const name of Object.keys(fresh.children).sort(collate)) {
        const child = fresh.children[name]!;
        visit({
          node: child,
          path: it.path.endsWith('/') ? it.path + name : `${it.path}/${name}`,
          abs: it.abs === '/' ? `/${name}` : `${it.abs}/${name}`,
          depth: it.depth + 1,
        });
      }
    };

    // -delete implies depth-first: children before parents
    const usesDelete = args.includes('-delete');
    const visitDepth = (it: FindItem) => {
      if (it.node.type === 'dir' && it.depth < maxDepth) {
        const fresh = ctx.tryStat(it.abs, false)?.node;
        if (fresh && fresh.type === 'dir') {
          if (!can(fresh, ctx.cred, R) || !can(fresh, ctx.cred, X)) {
            ctx.fail(`${q(it.path)}: Permission denied`);
            code = 1;
          } else {
            for (const name of Object.keys(fresh.children).sort(collate)) {
              visitDepth({
                node: fresh.children[name]!,
                path: it.path.endsWith('/') ? it.path + name : `${it.path}/${name}`,
                abs: it.abs === '/' ? `/${name}` : `${it.abs}/${name}`,
                depth: it.depth + 1,
              });
            }
          }
        }
      }
      if (it.depth >= minDepth) pred(it);
    };

    for (const s of starts) {
      let r;
      try {
        r = ctx.stat(s, false);
        if (r.node.type === 'symlink' && s.endsWith('/')) r = ctx.stat(s, true);
      } catch (e) {
        if (e instanceof FsError) {
          ctx.fail(`${q(s)}: ${e.text}`);
          code = 1;
          continue;
        }
        throw e;
      }
      const item = { node: r.node, path: s, abs: ctx.abs(s).replace(/(.)\/+$/, '$1'), depth: 0 };
      if (usesDelete) visitDepth(item);
      else visit(item);
    }
    batchRunners.forEach((b) => b());
    return code;
  },
};

// ---------------------------------------------------------------- du / df

export const du: CommandDef = {
  name: 'du',
  category: 'system',
  doc: {
    summary: 'estimate file space usage',
    usage: ['du [OPTION]... [FILE]...'],
    description: 'Summarize device usage of the set of FILEs, recursively for directories. Sizes are in 1K blocks unless -h is used.',
    options: [
      ['-a, --all', 'write counts for all files, not just directories'],
      ['-c, --total', 'produce a grand total'],
      ['-d, --max-depth=N', 'print the total for a directory only if it is N or fewer levels below the command line argument'],
      ['-h, --human-readable', 'print sizes in human readable format (e.g., 1K 234M 2G)'],
      ['-s, --summarize', 'display only a total for each argument'],
    ],
    examples: [
      ['du -sh *', 'size of every item in the current directory'],
      ['du -h --max-depth=1 /var | sort -h', 'which directory takes the most space'],
    ],
    seeAlso: ['df', 'ls'],
  },
  run(ctx) {
    const a = parseArgs(ctx.args, {
      flags: 'achsbkxS',
      withValue: 'd',
      long: { all: 'a', total: 'c', 'human-readable': 'h', summarize: 's' },
      longWithValue: { 'max-depth': 'd' },
    });
    const f = a.flags;
    const maxDepth = a.values.has('d') ? Number(a.values.get('d')) : f.has('s') ? 0 : Infinity;
    const fmt = (k: number) => (f.has('h') ? (k === 0 ? '0' : humanSize(k * 1024)) : String(k));
    let out = '';
    let total = 0;
    let code = 0;
    const walk = (node: FsNode, path: string, depth: number): number => {
      let size = nodeBlocksK(node);
      if (node.type === 'dir') {
        if (!can(node, ctx.cred, R) || !can(node, ctx.cred, X)) {
          ctx.fail(`cannot read directory '${path}': Permission denied`);
          code = 1;
        } else {
          for (const name of Object.keys(node.children).sort(collate)) {
            size += walk(node.children[name]!, path.endsWith('/') ? path + name : `${path}/${name}`, depth + 1);
          }
        }
        if (depth <= maxDepth) out += `${fmt(size)}\t${path}\n`;
      } else if ((f.has('a') && depth <= maxDepth) || depth === 0) {
        out += `${fmt(size)}\t${path}\n`;
      }
      return size;
    };
    for (const p of a.operands.length ? a.operands : ['.']) {
      try {
        total += walk(ctx.stat(p, false).node, p, 0);
      } catch (e) {
        if (e instanceof FsError) {
          ctx.fail(`cannot access '${p}': ${e.text}`);
          code = 1;
        } else throw e;
      }
    }
    if (f.has('c')) out += `${fmt(total)}\ttotal\n`;
    ctx.out(out);
    return code;
  },
};

export const df: CommandDef = {
  name: 'df',
  category: 'system',
  doc: {
    summary: 'report file system space usage',
    usage: ['df [OPTION]... [FILE]...'],
    description: 'Show information about the file systems: their size, used and available space, and where they are mounted.',
    options: [
      ['-h, --human-readable', 'print sizes in powers of 1024 (e.g., 1023M)'],
      ['-T, --print-type', 'print file system type'],
    ],
    examples: [['df -h', 'how much disk space is left']],
    seeAlso: ['du', 'mount'],
  },
  run(ctx) {
    const a = parseArgs(ctx.args, { flags: 'hTiak', long: { 'human-readable': 'h', 'print-type': 'T', all: 'a' } });
    let disks = ctx.machine.disks;
    if (a.operands.length) {
      const sel = new Set<string>();
      for (const p of a.operands) {
        const r = ctx.tryStat(p);
        if (!r) {
          ctx.fail(`${p}: No such file or directory`);
          return 1;
        }
        const abs = '/' + r.canon.join('/');
        const best = [...disks].sort((x, y) => y.mount.length - x.mount.length).find((d) => abs === d.mount || abs.startsWith(d.mount === '/' ? '/' : d.mount + '/'));
        if (best) sel.add(best.mount);
      }
      disks = disks.filter((d) => sel.has(d.mount));
    }
    const h = a.flags.has('h');
    const T = a.flags.has('T');
    const rows = [
      [
        'Filesystem',
        ...(T ? ['Type'] : []),
        h ? 'Size' : '1K-blocks',
        'Used',
        h ? 'Avail' : 'Available',
        'Use%',
        'Mounted on',
      ],
      ...disks.map((d) => {
        const avail = Math.max(0, d.size - d.used);
        const pct = d.size === 0 ? '-' : `${Math.ceil((d.used / (d.used + avail || 1)) * 100)}%`;
        const fmt = (k: number) => (h ? (k === 0 ? '0' : humanSize(k * 1024)) : String(k));
        return [d.filesystem, ...(T ? [d.type ?? 'ext4'] : []), fmt(d.size), fmt(d.used), fmt(avail), pct, d.mount];
      }),
    ];
    const n = rows[0]!.length;
    const minWidth = (c: number) => (c === 0 ? 14 : c === n - 2 ? 4 : h && c < n - 1 && !(T && c === 1) ? 5 : 0);
    const widths = Array.from({ length: n }, (_, c) => Math.max(minWidth(c), ...rows.map((r) => r[c]!.length)));
    const leftCols = new Set([0, ...(T ? [1] : []), n - 1]);
    let out = '';
    for (const r of rows) {
      out +=
        r
          .map((cell, c) => (c === n - 1 ? cell : leftCols.has(c) ? cell.padEnd(widths[c]!) : cell.padStart(widths[c]!)))
          .join(' ') + '\n';
    }
    ctx.out(out);
    return 0;
  },
};

// ---------------------------------------------------------------- which / file / xargs / stat

export const which: CommandDef = {
  name: 'which',
  category: 'search',
  doc: {
    summary: 'locate a command',
    usage: ['which [-a] filename ...'],
    description: 'which returns the pathnames of the files which would be executed in the current environment. Shell builtins (cd, export...) are not files, so which prints nothing for them.',
    seeAlso: ['type', 'whereis'],
  },
  run(ctx) {
    const a = parseArgs(ctx.args, { flags: 'as' });
    let code = 0;
    for (const name of a.operands) {
      if (name.includes('/')) {
        const r = ctx.tryStat(name);
        if (r && r.node.type === 'file' && can(r.node, ctx.cred, X)) ctx.out(name + '\n');
        else code = 1;
        continue;
      }
      const path = (ctx.shell.getVar('PATH') ?? '').split(':').filter(Boolean);
      let found = false;
      for (const dir of path) {
        const p = `${dir.replace(/\/$/, '')}/${name}`;
        const r = ctx.tryStat(p);
        if (r && r.node.type === 'file' && r.node.mode & 0o111) {
          ctx.out(p + '\n');
          found = true;
          if (!a.flags.has('a')) break;
        }
      }
      if (!found) code = 1;
    }
    return code;
  },
};

function describeFile(node: FsNode, name: string, target?: string): string {
  if (node.type === 'dir') return 'directory';
  if (node.type === 'symlink') return `symbolic link to ${target ?? node.target}`;
  const c = node.content;
  if (node.fakeSize === undefined && c.length === 0) return 'empty';
  if (c.startsWith('\x7fELF')) return 'ELF 64-bit LSB pie executable, x86-64, version 1 (SYSV), dynamically linked, interpreter /lib64/ld-linux-x86-64.so.2, for GNU/Linux 3.2.0, stripped';
  const ext = (name.split('.').pop() ?? '').toLowerCase();
  const byExt: Record<string, string> = {
    png: 'PNG image data, 1920 x 1080, 8-bit/color RGBA, non-interlaced',
    jpg: 'JPEG image data, JFIF standard 1.01, resolution (DPI), density 72x72, segment length 16, baseline, precision 8, 4032x3024, components 3',
    jpeg: 'JPEG image data, JFIF standard 1.01, resolution (DPI), density 72x72, segment length 16, baseline, precision 8, 4032x3024, components 3',
    gif: 'GIF image data, version 89a, 480 x 270',
    pdf: 'PDF document, version 1.7, 12 page(s)',
    zip: 'Zip archive data, at least v2.0 to extract, compression method=deflate',
    gz: 'gzip compressed data, from Unix, original size modulo 2^32 10240',
    tgz: 'gzip compressed data, from Unix, original size modulo 2^32 10240',
    tar: 'POSIX tar archive (GNU)',
    mp3: 'Audio file with ID3 version 2.4.0, contains: MPEG ADTS, layer III, v1, 320 kbps, 44.1 kHz, JntStereo',
    mp4: 'ISO Media, MP4 v2 [ISO 14496-14]',
    mkv: 'Matroska data',
    deb: 'Debian binary package (format 2.0), with control.tar.zst, data compression zst',
    iso: 'ISO 9660 CD-ROM filesystem data',
    docx: 'Microsoft Word 2007+',
    xlsx: 'Microsoft Excel 2007+',
  };
  if (c.startsWith('%PDF')) return byExt.pdf!;
  if (c.startsWith('\x89PNG') || c.startsWith('PNG')) return byExt.png!;
  if (byExt[ext] && (node.fakeSize !== undefined || /[\x00-\x08\x0e-\x1f]/.test(c) || c.startsWith('(binary'))) return byExt[ext]!;
  const firstLine = c.split('\n')[0] ?? '';
  const nonAscii = /[^\x00-\x7f]/.test(c);
  const charset = nonAscii ? 'Unicode text, UTF-8 text' : 'ASCII text';
  const exec = node.mode & 0o111 ? ' executable' : '';
  const longLines = c.split('\n').some((l) => l.length > 300) ? ', with very long lines' : '';
  const crlf = c.includes('\r\n') ? ', with CRLF line terminators' : '';
  if (firstLine.startsWith('#!')) {
    if (/bash/.test(firstLine)) return `Bourne-Again shell script, ${charset}${exec}${longLines}${crlf}`;
    if (/\bsh\b/.test(firstLine)) return `POSIX shell script, ${charset}${exec}${longLines}${crlf}`;
    if (/python/.test(firstLine)) return `Python script, ${charset}${exec}${longLines}${crlf}`;
    if (/node/.test(firstLine)) return `Node.js script, ${charset}${exec}${longLines}${crlf}`;
  }
  if (ext === 'json' && /^\s*[[{]/.test(c)) return 'JSON text data';
  if (ext === 'csv') return `CSV ${charset}${crlf}`;
  if (ext === 'html' || /^\s*<!doctype html/i.test(c)) return `HTML document, ${charset}${crlf}`;
  if (ext === 'py') return `Python script, ${charset}${exec}${crlf}`;
  if (ext === 'c' || ext === 'h') return `C source, ${charset}${crlf}`;
  if (/[\x00-\x08\x0e-\x1f]/.test(c)) return 'data';
  return `${charset}${exec}${longLines}${crlf}`;
}

export const file: CommandDef = {
  name: 'file',
  category: 'files',
  doc: {
    summary: 'determine file type',
    usage: ['file [-b] FILE...'],
    description: 'file tests each argument and prints its type. The file name extension does not matter on Linux: file looks at the contents.',
    options: [['-b, --brief', 'do not prepend filenames to output lines']],
    examples: [['file *', 'type of every file in the directory']],
    seeAlso: ['ls', 'stat'],
  },
  run(ctx) {
    const a = parseArgs(ctx.args, { flags: 'bLhi', long: { brief: 'b' } });
    if (a.operands.length === 0) {
      ctx.err('Usage: file [-bcCdEhikLlNnprsSvzZ0] [--apple] [--extension] [--mime-encoding]\n            [--mime-type] [-e <testname>] [-F <separator>]  [-f <namefile>]\n            [-m <magicfiles>] [-P <parameter=value>] [--exclude-quiet]\n            <file> ...\n       file -C [-m <magicfiles>]\n       file [--help]\n');
      return 1;
    }
    const width = Math.max(...a.operands.map((o) => o.length)) + 1;
    for (const op of a.operands) {
      const prefix = a.flags.has('b') ? '' : `${op}:`.padEnd(width + 1);
      let desc: string;
      try {
        const r = ctx.stat(op, a.flags.has('L'));
        if (r.node.type === 'file' && !can(r.node, ctx.cred, R)) desc = `regular file, no read permission`;
        else desc = describeFile(r.node, op);
      } catch (e) {
        if (e instanceof FsError) desc = `cannot open \`${op}' (${e.text})`;
        else throw e;
      }
      ctx.out(prefix + desc + '\n');
    }
    return 0;
  },
};

export const stat: CommandDef = {
  name: 'stat',
  category: 'files',
  doc: { summary: 'display file status', usage: ['stat FILE...'], description: 'Display file or file system status: size, permissions, owner and times.', seeAlso: ['ls', 'file'] },
  run(ctx) {
    const a = parseArgs(ctx.args, { flags: 'Lt', withValue: 'c' });
    if (a.operands.length === 0) {
      ctx.fail('missing operand');
      ctx.err("Try 'stat --help' for more information.\n");
      return 1;
    }
    let code = 0;
    for (const op of a.operands) {
      try {
        const { node } = ctx.stat(op, a.flags.has('L'));
        const fmtc = a.values.get('c');
        if (fmtc) {
          ctx.out(
            fmtc
              .replace(/%a/g, (node.mode & 0o7777).toString(8))
              .replace(/%A/g, modeString(node))
              .replace(/%s/g, String(nodeSize(node)))
              .replace(/%U/g, node.owner)
              .replace(/%G/g, node.group)
              .replace(/%n/g, op)
              .replace(/%F/g, node.type === 'dir' ? 'directory' : node.type === 'symlink' ? 'symbolic link' : nodeSize(node) === 0 ? 'regular empty file' : 'regular file') + '\n',
          );
          continue;
        }
        const d = new Date(node.mtime).toISOString().replace('T', ' ').replace('Z', '000000 +0000');
        const kind = node.type === 'dir' ? 'directory' : node.type === 'symlink' ? 'symbolic link' : nodeSize(node) === 0 ? 'regular empty file' : 'regular file';
        const users = ctx.machine.users;
        const uid = users.find((u) => u.name === node.owner)?.uid ?? 0;
        const gid = users.find((u) => u.groups[0] === node.group)?.gid ?? 0;
        ctx.out(
          `  File: ${node.type === 'symlink' ? `${op} -> ${node.target}` : op}\n` +
            `  Size: ${String(nodeSize(node)).padEnd(15)} Blocks: ${String(nodeBlocksK(node) * 2).padEnd(10)} IO Block: 4096   ${kind}\n` +
            `Access: (${(node.mode & 0o7777).toString(8).padStart(4, '0')}/${modeString(node)})  Uid: (${String(uid).padStart(5)}/${node.owner.padStart(8)})   Gid: (${String(gid).padStart(5)}/${node.group.padStart(8)})\n` +
            `Modify: ${d}\n`,
        );
      } catch (e) {
        if (e instanceof FsError) {
          ctx.fail(`cannot statx '${op}': ${e.text}`);
          code = 1;
        } else throw e;
      }
    }
    return code;
  },
};

export const xargs: CommandDef = {
  name: 'xargs',
  category: 'shell',
  doc: {
    summary: 'build and execute command lines from standard input',
    usage: ['xargs [OPTION]... [COMMAND [INITIAL-ARGS]...]'],
    description: 'Read items from standard input (separated by blanks or newlines) and run COMMAND with those items as arguments. The default COMMAND is echo.',
    options: [
      ['-n, --max-args=MAX-ARGS', 'use at most MAX-ARGS arguments per command line'],
      ['-I R', 'replace R in INITIAL-ARGS with names read from standard input (one line per command)'],
      ['-0, --null', 'items are separated by a null, not whitespace'],
    ],
    examples: [
      ['find . -name "*.tmp" | xargs rm', 'delete everything find has found'],
      ['cat urls.txt | xargs -n 1 echo', 'run a command once per item'],
    ],
    seeAlso: ['find'],
  },
  run(ctx) {
    const a = parseArgs(ctx.args, {
      flags: '0rt',
      withValue: 'nIdL',
      long: { null: '0', 'no-run-if-empty': 'r', verbose: 't' },
      longWithValue: { 'max-args': 'n' },
      stopAtOperand: true,
    });
    const cmd = a.operands.length ? a.operands : ['echo'];
    const input = ctx.stdin ?? '';
    const repl = a.values.get('I');
    let items: string[];
    if (repl !== undefined) items = input.split('\n').filter((l) => l.trim() !== '');
    else if (a.flags.has('0')) items = input.split('\0').filter(Boolean);
    else {
      items = [];
      const re = /"([^"]*)"|'([^']*)'|((?:\\.|[^\s"'])+)/g;
      for (const m of input.matchAll(re)) items.push(m[1] ?? m[2] ?? m[3]!.replace(/\\(.)/g, '$1'));
    }
    if (items.length === 0 && (a.flags.has('r') || repl !== undefined)) return 0;
    const batches: string[][] = [];
    if (repl !== undefined) for (const it of items) batches.push(cmd.map((c) => c.split(repl).join(it)));
    else {
      const n = a.values.has('n') ? Math.max(1, Number(a.values.get('n'))) : Infinity;
      if (items.length === 0) batches.push([...cmd]);
      for (let k = 0; k < items.length; k += n === Infinity ? items.length : n) batches.push([...cmd, ...items.slice(k, n === Infinity ? undefined : k + n)]);
    }
    let code = 0;
    for (const argv of batches) {
      if (a.flags.has('t')) ctx.err(argv.join(' ') + '\n');
      const r = ctx.shell.run(argv, null);
      ctx.forward(r.chunks);
      if (r.code === 127) return 127;
      if (r.code !== 0) code = 123;
    }
    return code;
  },
};

export type { Ctx };
