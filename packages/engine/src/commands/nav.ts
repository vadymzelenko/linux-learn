import type { DirNode, FsNode } from '../types';
import type { CommandDef, Ctx } from '../shell/context';
import { parseArgs, ArgError } from '../shell/args';
import { can, canonToPath, collate, FsError, nodeBlocksK, nodeSize, resolve, R, X } from '../vfs/fs';
import { normalize } from '../vfs/path';
import { colorFor, columnize, humanSize, lsQuote, lsTime, modeString, needsQuote, paint } from './util';

export const pwd: CommandDef = {
  name: 'pwd',
  builtin: true,
  category: 'navigation',
  doc: {
    summary: 'print name of current/working directory',
    usage: ['pwd [-LP]'],
    description: 'Print the full filename of the current working directory.',
    options: [
      ['-L', 'print the value of $PWD (default)'],
      ['-P', 'print the physical directory, without any symbolic links'],
    ],
    seeAlso: ['cd'],
  },
  run(ctx) {
    const a = parseArgs(ctx.args, { flags: 'LP' });
    const physical = a.order.lastIndexOf('P') > a.order.lastIndexOf('L');
    if (physical) {
      try {
        ctx.out(canonToPath(ctx.stat(ctx.cwd).canon) + '\n');
      } catch {
        ctx.out(ctx.cwd + '\n');
      }
    } else ctx.out(ctx.cwd + '\n');
    return 0;
  },
};

export const cd: CommandDef = {
  name: 'cd',
  builtin: true,
  category: 'navigation',
  doc: {
    summary: 'change the shell working directory',
    usage: ['cd [-L|-P] [dir]'],
    description:
      'Change the current directory to DIR. The default DIR is the value of the HOME shell variable. `cd -` returns to the previous directory ($OLDPWD). `..` is the parent directory, `~` is your home.',
    options: [
      ['-L', 'follow symbolic links logically (default)'],
      ['-P', 'use the physical directory structure'],
    ],
    examples: [
      ['cd /var/log', 'go to an absolute path'],
      ['cd ..', 'go one level up'],
      ['cd', 'go home'],
      ['cd -', 'go back to the previous directory'],
    ],
    seeAlso: ['pwd'],
  },
  run(ctx) {
    let args = ctx.args;
    let physical = false;
    while (args[0] && /^-[LP]+$/.test(args[0])) {
      physical = args[0].includes('P');
      args = args.slice(1);
    }
    if (args[0] === '--') args = args.slice(1);
    if (args.length > 1) {
      ctx.err('bash: cd: too many arguments\n');
      return 1;
    }
    let target = args[0];
    let print = false;
    if (target === undefined) {
      target = ctx.shell.getVar('HOME');
      if (!target) {
        ctx.err('bash: cd: HOME not set\n');
        return 1;
      }
    } else if (target === '-') {
      target = ctx.shell.getVar('OLDPWD');
      if (!target) {
        ctx.err('bash: cd: OLDPWD not set\n');
        return 1;
      }
      print = true;
    } else if (target.startsWith('-') && target !== '-') {
      ctx.err(`bash: cd: ${target}: invalid option\ncd: usage: cd [-L|[-P [-e]] [-@]] [dir]\n`);
      return 2;
    }
    if (target === '') return 0;
    const logical = normalize(target, ctx.cwd);
    try {
      const r = resolve(ctx.fs, logical, ctx.cred, true);
      if (r.node.type !== 'dir') throw new FsError('ENOTDIR');
      if (!can(r.node, ctx.cred, X)) throw new FsError('EACCES');
      const dest = physical ? canonToPath(r.canon) : logical;
      ctx.shell.setCwd(dest);
      if (print) ctx.out(dest + '\n');
      return 0;
    } catch (e) {
      if (e instanceof FsError) {
        ctx.err(`bash: cd: ${target}: ${e.text}\n`);
        return 1;
      }
      throw e;
    }
  },
};

// ---------------------------------------------------------------- ls

interface Entry {
  name: string; // display name (as given / child name)
  node: FsNode; // lstat node
  target?: FsNode | null; // resolved symlink target (null = dangling)
  path: string; // absolute path
}

export const ls: CommandDef = {
  name: 'ls',
  category: 'navigation',
  doc: {
    summary: 'list directory contents',
    usage: ['ls [OPTION]... [FILE]...'],
    description:
      'List information about the FILEs (the current directory by default). Sort entries alphabetically if none of -tS is specified.',
    options: [
      ['-a, --all', 'do not ignore entries starting with .'],
      ['-A, --almost-all', 'do not list implied . and ..'],
      ['-d, --directory', 'list directories themselves, not their contents'],
      ['-F, --classify', 'append indicator (one of */@) to entries'],
      ['-h, --human-readable', 'with -l, print sizes like 1K 234M 2G etc.'],
      ['-l', 'use a long listing format'],
      ['-r, --reverse', 'reverse order while sorting'],
      ['-R, --recursive', 'list subdirectories recursively'],
      ['-S', 'sort by file size, largest first'],
      ['-t', 'sort by time, newest first'],
      ['-1', 'list one file per line'],
      ['-C', 'list entries by columns'],
      ['--color[=WHEN]', "color the output WHEN ('always', 'auto', or 'never')"],
    ],
    notes: [
      'Exit status: 0 if OK, 1 if minor problems (e.g., cannot access subdirectory), 2 if serious trouble (e.g., cannot access command-line argument).',
    ],
    examples: [
      ['ls -la', 'long listing including hidden files'],
      ['ls -lh /var/log', 'sizes in human readable form'],
      ['ls -lt', 'newest files first'],
    ],
    seeAlso: ['tree', 'stat', 'dircolors'],
  },
  run(ctx) {
    const a = parseArgs(ctx.args, {
      flags: 'aAdFhlrRSt1Cx',
      long: {
        all: 'a',
        'almost-all': 'A',
        directory: 'd',
        classify: 'F',
        'human-readable': 'h',
        reverse: 'r',
        recursive: 'R',
      },
      longOptional: { color: 'color' },
    });
    const f = a.flags;
    const all = f.has('a');
    const almost = f.has('A') && !all;
    const long = f.has('l');
    const colorOpt = a.values.get('color') ?? (f.has('color') ? 'always' : 'never');
    if (!['always', 'yes', 'force', 'never', 'no', 'none', 'auto', 'tty', 'if-tty'].includes(colorOpt)) {
      throw new ArgError(`invalid argument '${colorOpt}' for '--color'`);
    }
    const color = ['always', 'yes', 'force'].includes(colorOpt) || (['auto', 'tty', 'if-tty'].includes(colorOpt) && ctx.isTTY);
    const lastFormat = [...a.order].reverse().find((o) => o === 'l' || o === '1' || o === 'C');
    const oneLine = !long && (lastFormat === '1' || (!ctx.isTTY && lastFormat !== 'C'));
    const sortKey = [...a.order].reverse().find((o) => o === 't' || o === 'S');

    let code = 0;
    const operands = a.operands.length ? a.operands : ['.'];
    const files: Entry[] = [];
    const dirs: Entry[] = [];

    for (const op of operands) {
      const abs = ctx.abs(op);
      let lst;
      try {
        lst = resolve(ctx.fs, abs, ctx.cred, false);
      } catch (e) {
        if (e instanceof FsError) {
          ctx.fail(`cannot access '${op}': ${e.text}`);
          code = 2;
          continue;
        }
        throw e;
      }
      let node = lst.node;
      let target: FsNode | null | undefined;
      if (node.type === 'symlink') {
        try {
          target = resolve(ctx.fs, abs, ctx.cred, true).node;
        } catch {
          target = null;
        }
        const follow = !(long || f.has('d') || f.has('F')) || abs.endsWith('/');
        if (follow && target) node = target;
      }
      const entry: Entry = { name: op, node, path: abs, ...(target !== undefined && node.type === 'symlink' ? { target } : {}) };
      if (node.type === 'dir' && !f.has('d')) dirs.push(entry);
      else files.push(entry);
    }

    const sortEntries = (list: Entry[]) => {
      list.sort((x, y) => {
        if (sortKey === 't') {
          const d = y.node.mtime - x.node.mtime;
          if (d !== 0) return d;
        } else if (sortKey === 'S') {
          const d = nodeSize(y.node) - nodeSize(x.node);
          if (d !== 0) return d;
        }
        return collate(x.name, y.name);
      });
      if (f.has('r')) list.reverse();
      return list;
    };

    const indicator = (e: Entry) => {
      if (!f.has('F')) return '';
      const n = e.node;
      if (n.type === 'dir') return '/';
      if (n.type === 'symlink') return long ? '' : '@';
      return n.mode & 0o111 ? '*' : '';
    };

    const renderName = (e: Entry, quoteAll: boolean) => {
      const q = ctx.isTTY ? lsQuote(e.name) : e.name;
      const pad = ctx.isTTY && quoteAll && !oneLine && !needsQuote(e.name) ? ' ' : '';
      const c = color ? colorFor(e.node, e.name, e.target === null) : null;
      return { text: pad + paint(q, c) + indicator(e), width: pad.length + q.length + indicator(e).length };
    };

    const renderList = (list: Entry[], isDirListing: boolean): string => {
      if (list.length === 0) return '';
      const quoteAny = ctx.isTTY && list.some((e) => needsQuote(e.name));
      if (long) {
        const rows = list.map((e) => {
          const n = e.node;
          const nlink = n.type === 'dir' ? 2 + Object.values(n.children).filter((c) => c.type === 'dir').length : 1;
          const size = nodeSize(n);
          const name = renderName(e, quoteAny);
          let nameText = name.text;
          if (n.type === 'symlink') {
            const t = e.target;
            const tc = color && t ? colorFor(t, n.target) : color ? colorFor(n, n.name, true) : null;
            nameText += ` -> ${paint(ctx.isTTY ? lsQuote(n.target) : n.target, tc)}${f.has('F') && t ? (t.type === 'dir' ? '/' : t.mode & 0o111 ? '*' : '') : ''}`;
          }
          return {
            mode: modeString(n),
            nlink: String(nlink),
            owner: n.owner,
            group: n.group,
            size: f.has('h') ? humanSize(size) : String(size),
            time: lsTime(n.mtime, ctx.now),
            name: nameText,
          };
        });
        const w = (k: 'nlink' | 'owner' | 'group' | 'size') => Math.max(...rows.map((r) => r[k].length));
        const wl = w('nlink'), wo = w('owner'), wg = w('group'), ws = w('size');
        let out = '';
        if (isDirListing) {
          const total = list.reduce((s, e) => s + nodeBlocksK(e.node), 0);
          out += `total ${f.has('h') ? humanSize(total * 1024) : total}\n`;
        }
        for (const r of rows) {
          out += `${r.mode} ${r.nlink.padStart(wl)} ${r.owner.padEnd(wo)} ${r.group.padEnd(wg)} ${r.size.padStart(ws)} ${r.time} ${r.name}\n`;
        }
        return out;
      }
      const rendered = list.map((e) => renderName(e, quoteAny));
      if (oneLine) return rendered.map((r) => r.text).join('\n') + '\n';
      return columnize(
        rendered.map((r) => r.text),
        rendered.map((r) => r.width),
        ctx.columns,
      );
    };

    const listDir = (e: Entry, header: boolean, isOperand: boolean): string => {
      const dir = e.node as DirNode;
      let out = header ? `${e.name}:\n` : '';
      if (!can(dir, ctx.cred, R)) {
        ctx.fail(`cannot open directory '${e.name}': Permission denied`);
        code = isOperand ? 2 : Math.max(code, 1);
        return header ? out : '';
      }
      const entries: Entry[] = [];
      const base = e.path.replace(/\/+$/, '') || '/';
      const canTraverse = can(dir, ctx.cred, X);
      if (all) {
        entries.push({ name: '.', node: dir, path: base });
        let parent: FsNode = dir;
        try {
          parent = resolve(ctx.fs, normalize('..', base), ctx.cred, true).node;
        } catch {
          /* keep */
        }
        entries.push({ name: '..', node: parent, path: normalize('..', base) });
      }
      for (const [name, child] of Object.entries(dir.children)) {
        if (name.startsWith('.') && !all && !almost) continue;
        const path = base === '/' ? `/${name}` : `${base}/${name}`;
        let target: FsNode | null | undefined;
        if (child.type === 'symlink') {
          try {
            target = resolve(ctx.fs, path, ctx.cred, true).node;
          } catch {
            target = null;
          }
        }
        entries.push({ name, node: child, path, ...(target !== undefined ? { target } : {}) });
      }
      sortEntries(entries);
      void canTraverse;
      out += renderList(entries, true);
      if (f.has('R')) {
        for (const sub of entries) {
          if (sub.node.type !== 'dir' || sub.name === '.' || sub.name === '..') continue;
          const name = e.name.endsWith('/') ? e.name + sub.name : `${e.name}/${sub.name}`;
          out += '\n' + listDir({ ...sub, name }, true, false);
        }
      }
      return out;
    };

    let out = '';
    sortEntries(files);
    out += renderList(files, false);
    sortEntries(dirs);
    const showHeaders = f.has('R') || files.length + dirs.length > 1 || code !== 0;
    dirs.forEach((d, i) => {
      if (out !== '' || i > 0) out += '\n';
      out += listDir(d, showHeaders, true);
    });
    ctx.out(out);
    return code;
  },
};

// ---------------------------------------------------------------- tree

export const tree: CommandDef = {
  name: 'tree',
  category: 'navigation',
  doc: {
    summary: 'list contents of directories in a tree-like format',
    usage: ['tree [-adfL level] [directory ...]'],
    description: 'Tree is a recursive directory listing program that produces a depth indented listing of files.',
    options: [
      ['-a', 'All files are listed (including hidden ones).'],
      ['-d', 'List directories only.'],
      ['-f', 'Print the full path prefix for each file.'],
      ['-L level', 'Max display depth of the directory tree.'],
      ['--noreport', 'Turn off file/directory count at end of tree listing.'],
    ],
    seeAlso: ['ls', 'find'],
  },
  run(ctx) {
    const a = parseArgs(ctx.args, { flags: 'adfC', withValue: 'L', long: { noreport: 'noreport' } });
    const maxDepth = a.values.has('L') ? Number(a.values.get('L')) : Infinity;
    if (a.values.has('L') && (!Number.isInteger(maxDepth) || maxDepth < 1)) {
      ctx.err('tree: Invalid level, must be greater than 0.\n');
      return 1;
    }
    const color = ctx.isTTY;
    let dirsCount = 0;
    let filesCount = 0;
    let out = '';
    let code = 0;
    const roots = a.operands.length ? a.operands : ['.'];
    for (const r of roots) {
      let res;
      try {
        res = ctx.stat(r);
      } catch {
        out += `${r}  [error opening dir]\n`;
        code = 2;
        continue;
      }
      if (res.node.type !== 'dir') {
        out += `${r}  [error opening dir]\n`;
        continue;
      }
      out += paint(r, color ? colorFor(res.node, r) : null) + '\n';
      const walk = (dir: DirNode, prefix: string, depth: number, path: string) => {
        if (!can(dir, ctx.cred, R)) return;
        const names = Object.keys(dir.children)
          .filter((n) => a.flags.has('a') || !n.startsWith('.'))
          .filter((n) => !a.flags.has('d') || dir.children[n]!.type === 'dir')
          .sort(collate);
        names.forEach((name, i) => {
          const node = dir.children[name]!;
          const last = i === names.length - 1;
          const childPath = `${path}/${name}`;
          const label = a.flags.has('f') ? childPath : name;
          let line = prefix + (last ? '└── ' : '├── ') + paint(label, color ? colorFor(node, name) : null);
          if (node.type === 'symlink') line += ` -> ${node.target}`;
          if (node.type === 'dir') {
            dirsCount++;
            const denied = !can(node, ctx.cred, R);
            out += line + (denied ? '  [error opening dir]' : '') + '\n';
            if (depth + 1 < maxDepth) walk(node, prefix + (last ? '    ' : '│   '), depth + 1, childPath);
          } else {
            filesCount++;
            out += line + '\n';
          }
        });
      };
      walk(res.node, '', 0, r === '/' ? '' : r);
    }
    if (!a.flags.has('noreport')) {
      const d = `${dirsCount} director${dirsCount === 1 ? 'y' : 'ies'}`;
      out += a.flags.has('d') ? `\n${d}\n` : `\n${d}, ${filesCount} file${filesCount === 1 ? '' : 's'}\n`;
    }
    ctx.out(out);
    return code;
  },
};
