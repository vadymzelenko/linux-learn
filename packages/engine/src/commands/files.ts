import type { DirNode, FsNode } from '../types';
import type { CommandDef, Ctx } from '../shell/context';
import { ArgError, parseArgs } from '../shell/args';
import {
  can,
  canonToPath,
  cloneTree,
  FsError,
  isInside,
  makeFile,
  makeSymlink,
  putChild,
  removeChild,
  resolveParent,
  updateAt,
  R,
  W,
  X,
  type ParentRef,
} from '../vfs/fs';
import { basename } from '../vfs/path';
import { cannot, eachInput, q } from './util';

function checkParentWritable(ctx: Ctx, ref: ParentRef, path: string) {
  if (!can(ref.parent, ctx.cred, W) || !can(ref.parent, ctx.cred, X)) throw new FsError('EACCES', path);
  // sticky bit (/tmp): only the owner of the entry (or dir) may remove/rename it
  if (ref.parent.mode & 0o1000 && ref.existing && !ctx.cred.root && ref.existing.owner !== ctx.user && ref.parent.owner !== ctx.user) {
    throw new FsError('EPERM', path);
  }
}

function parseMode(ctx: Ctx, spec: string): number | null {
  if (/^[0-7]{1,4}$/.test(spec)) return parseInt(spec, 8);
  ctx.fail(`invalid mode ${q(spec)}`);
  return null;
}

// ---------------------------------------------------------------- mkdir

export const mkdir: CommandDef = {
  name: 'mkdir',
  category: 'files',
  doc: {
    summary: 'make directories',
    usage: ['mkdir [OPTION]... DIRECTORY...'],
    description: 'Create the DIRECTORY(ies), if they do not already exist.',
    options: [
      ['-m, --mode=MODE', 'set file mode (as in chmod), not a=rwx - umask'],
      ['-p, --parents', 'no error if existing, make parent directories as needed'],
      ['-v, --verbose', 'print a message for each created directory'],
    ],
    examples: [
      ['mkdir projects', 'create one directory'],
      ['mkdir -p a/b/c', 'create a whole chain of directories'],
    ],
    seeAlso: ['rmdir', 'rm'],
  },
  run(ctx) {
    const a = parseArgs(ctx.args, {
      flags: 'pv',
      withValue: 'm',
      long: { parents: 'p', verbose: 'v' },
      longWithValue: { mode: 'm' },
    });
    if (a.operands.length === 0) throw new ArgError('missing operand');
    let mode = 0o755;
    if (a.values.has('m')) {
      const m = parseMode(ctx, a.values.get('m')!);
      if (m === null) return 1;
      mode = m;
    }
    let code = 0;
    for (const dir of a.operands) {
      try {
        if (a.flags.has('p')) {
          const segs = ctx.abs(dir).split('/').filter(Boolean);
          let cur = '';
          for (const seg of segs) {
            cur += '/' + seg;
            const existing = ctx.tryStat(cur);
            if (existing) {
              if (existing.node.type !== 'dir') {
                const isLast = cur === ctx.abs(dir).replace(/\/$/, '');
                const shown = dir.startsWith('/') ? cur : relativeShown(dir, cur, ctx);
                ctx.fail(`cannot create directory ${q(shown)}: ${isLast ? 'File exists' : 'Not a directory'}`);
                code = 1;
                break;
              }
              continue;
            }
            ctx.mkdir(cur, cur === ctx.abs(dir).replace(/\/$/, '') ? mode : 0o755);
            if (a.flags.has('v')) ctx.out(`mkdir: created directory '${dir.startsWith('/') ? cur : relativeShown(dir, cur, ctx)}'\n`);
          }
        } else {
          ctx.mkdir(dir, mode);
          if (a.flags.has('v')) ctx.out(`mkdir: created directory '${dir}'\n`);
        }
      } catch (e) {
        if (e instanceof FsError) ctx.fail(`cannot create directory ${q(dir)}: ${e.text}`);
        else throw e;
        code = 1;
      }
    }
    return code;
  },
};

/** For `mkdir -pv a/b`: show the path as the user typed it, prefix by prefix. */
function relativeShown(typed: string, abs: string, ctx: Ctx): string {
  const full = ctx.abs(typed).replace(/\/$/, '');
  const typedClean = typed.replace(/\/+$/, '');
  if (abs === full) return typedClean;
  const extra = full.slice(abs.length).split('/').filter(Boolean).length;
  const parts = typedClean.split('/');
  return parts.slice(0, parts.length - extra).join('/');
}

// ---------------------------------------------------------------- touch

export const touch: CommandDef = {
  name: 'touch',
  category: 'files',
  doc: {
    summary: 'change file timestamps',
    usage: ['touch [OPTION]... FILE...'],
    description:
      'Update the modification time of each FILE to the current time. A FILE argument that does not exist is created empty, unless -c is supplied.',
    options: [['-c, --no-create', 'do not create any files']],
    examples: [['touch notes.txt', 'create an empty file (or update its time)']],
    seeAlso: ['stat'],
  },
  run(ctx) {
    const a = parseArgs(ctx.args, { flags: 'cam', long: { 'no-create': 'c' } });
    if (a.operands.length === 0) throw new ArgError('missing file operand');
    let code = 0;
    for (const f of a.operands) {
      try {
        const r = ctx.tryStat(f);
        if (r) {
          if (!ctx.cred.root && r.node.owner !== ctx.user && !can(r.node, ctx.cred, W)) throw new FsError('EACCES', f);
          const now = ctx.now;
          ctx.fs = updateAt(ctx.fs, r.canon, (n) => {
            n.mtime = now;
          });
        } else if (!a.flags.has('c')) {
          ctx.writeFile(f, '', true);
        }
      } catch (e) {
        if (e instanceof FsError && e.code === 'EACCES' && ctx.tryStat(f)) ctx.fail(`cannot touch '${f}': Permission denied`);
        else cannot(ctx, 'touch', f, e);
        code = 1;
      }
    }
    return code;
  },
};

// ---------------------------------------------------------------- cat

export const cat: CommandDef = {
  name: 'cat',
  category: 'files',
  doc: {
    summary: 'concatenate files and print on the standard output',
    usage: ['cat [OPTION]... [FILE]...'],
    description: 'Concatenate FILE(s) to standard output. With no FILE, or when FILE is -, read standard input.',
    options: [
      ['-A, --show-all', 'equivalent to -vET'],
      ['-b, --number-nonblank', 'number nonempty output lines, overrides -n'],
      ['-E, --show-ends', 'display $ at end of each line'],
      ['-n, --number', 'number all output lines'],
      ['-s, --squeeze-blank', 'suppress repeated empty output lines'],
      ['-T, --show-tabs', 'display TAB characters as ^I'],
    ],
    examples: [
      ['cat notes.txt', 'print a file'],
      ['cat a.txt b.txt > both.txt', 'join two files into a third one'],
    ],
    seeAlso: ['less', 'head', 'tail', 'tac'],
  },
  run(ctx) {
    const a = parseArgs(ctx.args, {
      flags: 'AbEnsTuv',
      long: { 'show-all': 'A', 'number-nonblank': 'b', 'show-ends': 'E', number: 'n', 'squeeze-blank': 's', 'show-tabs': 'T' },
    });
    const f = a.flags;
    const showEnds = f.has('E') || f.has('A');
    const showTabs = f.has('T') || f.has('A');
    let lineNo = 0;
    let prevBlank = false;
    let atLineStart = true;
    let ok = true;
    for (const file of a.operands.length ? a.operands : ['-']) {
      if (file !== '-') {
        const r = ctx.tryStat(file);
        if (r && r.node.type === 'dir') {
          ctx.fail(`${file}: Is a directory`);
          ok = false;
          continue;
        }
      }
      ok = eachInput(ctx, [file], (text) => {
        if (!f.has('n') && !f.has('b') && !showEnds && !showTabs && !f.has('s')) {
          ctx.out(text);
          return;
        }
        let out = '';
        const parts = text.split('\n');
        parts.forEach((line, i) => {
          const isLast = i === parts.length - 1;
          if (isLast && line === '') return;
          const blank = line === '';
          if (f.has('s') && blank && prevBlank && atLineStart) return;
          prevBlank = blank;
          let l = showTabs ? line.replace(/\t/g, '^I') : line;
          if (atLineStart && (f.has('b') ? !blank : f.has('n'))) l = `${String(++lineNo).padStart(6)}\t${l}`;
          out += l + (isLast ? '' : (showEnds ? '$' : '') + '\n');
          atLineStart = !isLast;
        });
        ctx.out(out);
      }) && ok;
    }
    return ok ? 0 : 1;
  },
};

// ---------------------------------------------------------------- rm

export const rm: CommandDef = {
  name: 'rm',
  category: 'files',
  doc: {
    summary: 'remove files or directories',
    usage: ['rm [OPTION]... [FILE]...'],
    description:
      'Remove (unlink) the FILE(s). By default, rm does not remove directories. Use the --recursive (-r or -R) option to remove each listed directory, too, along with all of its contents. Note that if you use rm to remove a file, it is not possible to recover it: there is no trash bin in the terminal.',
    options: [
      ['-f, --force', 'ignore nonexistent files and arguments, never prompt'],
      ['-r, -R, --recursive', 'remove directories and their contents recursively'],
      ['-d, --dir', 'remove empty directories'],
      ['-v, --verbose', 'explain what is being done'],
      ['--no-preserve-root', "do not treat '/' specially"],
    ],
    examples: [
      ['rm old.txt', 'delete a file'],
      ['rm -r build/', 'delete a directory with everything inside'],
      ['rm *.log', 'delete all .log files in the current directory'],
    ],
    seeAlso: ['rmdir', 'mv'],
  },
  run(ctx) {
    const a = parseArgs(ctx.args, {
      flags: 'frRdviI',
      long: { force: 'f', recursive: 'r', dir: 'd', verbose: 'v', 'no-preserve-root': 'no-preserve-root', 'preserve-root': 'preserve-root', interactive: 'i' },
    });
    const f = a.flags;
    const recursive = f.has('r') || f.has('R');
    const force = f.has('f');
    if (a.operands.length === 0) {
      if (force) return 0;
      throw new ArgError('missing operand');
    }
    let code = 0;
    for (const op of a.operands) {
      const abs = ctx.abs(op);
      const base = basename(op);
      if (base === '.' || base === '..') {
        ctx.fail(`refusing to remove '.' or '..' directory: skipping '${op}'`);
        code = 1;
        continue;
      }
      if (abs.replace(/\/+$/, '') === '' || abs === '/') {
        if (recursive && !f.has('no-preserve-root')) {
          ctx.fail("it is dangerous to operate recursively on '/'");
          ctx.fail('use --no-preserve-root to override this failsafe');
          ctx.shell.emit({ type: 'easterEgg', id: ctx.cred.root ? 'sudo-rm-rf-root' : 'rm-rf-root' });
          code = 1;
          continue;
        }
        if (!recursive) {
          ctx.fail("cannot remove '/': Is a directory");
          code = 1;
          continue;
        }
        // rm -rf --no-preserve-root /  — wipe everything we are allowed to
        ctx.shell.emit({ type: 'easterEgg', id: ctx.cred.root ? 'sudo-rm-rf-root' : 'rm-rf-root' });
        const root = ctx.fs;
        for (const name of Object.keys(root.children)) {
          if (!removeTree(ctx, `/${name}`, `/${name}`, force, f.has('v'))) code = 1;
        }
        continue;
      }
      let ref: ParentRef;
      try {
        ref = resolveParent(ctx.fs, abs, ctx.cred);
        if (!ref.existing) throw new FsError('ENOENT', op);
      } catch (e) {
        if (e instanceof FsError && e.code === 'ENOENT' && force) continue;
        cannot(ctx, 'remove', op, e);
        code = 1;
        continue;
      }
      let node: FsNode = ref.existing;
      if (abs.endsWith('/') && node.type === 'symlink') {
        // `rm link/` refers to the target directory
        const t = ctx.tryStat(abs);
        if (t) node = t.node;
      }
      if (node.type === 'dir') {
        if (!recursive) {
          if (f.has('d')) {
            if (Object.keys(node.children).length > 0) {
              ctx.fail(`cannot remove '${op}': Directory not empty`);
              code = 1;
              continue;
            }
          } else {
            ctx.fail(`cannot remove '${op}': Is a directory`);
            code = 1;
            continue;
          }
        }
        // refuse to remove a directory containing the cwd? (allowed in Linux, but keep it simple: allowed)
        if (!removeTree(ctx, abs.replace(/\/+$/, ''), op.replace(/\/+$/, '') || op, force, f.has('v'))) code = 1;
        continue;
      }
      try {
        checkParentWritable(ctx, ref, op);
        ctx.fs = removeChild(ctx.fs, ref.parentCanon, ref.name, ctx.now);
        if (f.has('v')) ctx.out(`removed '${op}'\n`);
      } catch (e) {
        cannot(ctx, 'remove', op, e);
        code = 1;
      }
    }
    return code;
  },
};

/** Recursively remove; returns false if anything failed. */
function removeTree(ctx: Ctx, abs: string, shown: string, force: boolean, verbose: boolean): boolean {
  let ref: ParentRef;
  try {
    ref = resolveParent(ctx.fs, abs, ctx.cred);
  } catch (e) {
    cannot(ctx, 'remove', shown, e);
    return false;
  }
  const node = ref.existing;
  if (!node) {
    if (!force) ctx.fail(`cannot remove '${shown}': No such file or directory`);
    return force;
  }
  let ok = true;
  if (node.type === 'dir') {
    if (!can(node, ctx.cred, R) || !can(node, ctx.cred, X)) {
      ctx.fail(`cannot remove '${shown}': Permission denied`);
      return false;
    }
    for (const name of Object.keys(node.children)) {
      const childWritable = can(node, ctx.cred, W);
      if (!childWritable) {
        ctx.fail(`cannot remove '${shown}/${name}': Permission denied`);
        ok = false;
        continue;
      }
      if (!removeTree(ctx, `${abs}/${name}`, `${shown}/${name}`, force, verbose)) ok = false;
    }
    if (!ok) return false;
  }
  try {
    const fresh = resolveParent(ctx.fs, abs, ctx.cred);
    checkParentWritable(ctx, fresh, shown);
    ctx.fs = removeChild(ctx.fs, fresh.parentCanon, fresh.name, ctx.now);
    if (verbose) ctx.out(node.type === 'dir' ? `removed directory '${shown}'\n` : `removed '${shown}'\n`);
    return true;
  } catch (e) {
    cannot(ctx, 'remove', shown, e);
    return false;
  }
}

// ---------------------------------------------------------------- rmdir

export const rmdir: CommandDef = {
  name: 'rmdir',
  category: 'files',
  doc: {
    summary: 'remove empty directories',
    usage: ['rmdir [OPTION]... DIRECTORY...'],
    description: 'Remove the DIRECTORY(ies), if they are empty.',
    options: [
      ['-p, --parents', "remove DIRECTORY and its ancestors; e.g., 'rmdir -p a/b' is similar to 'rmdir a/b a'"],
      ['-v, --verbose', 'output a diagnostic for every directory processed'],
    ],
    seeAlso: ['rm', 'mkdir'],
  },
  run(ctx) {
    const a = parseArgs(ctx.args, { flags: 'pv', long: { parents: 'p', verbose: 'v', 'ignore-fail-on-non-empty': 'ignore' } });
    if (a.operands.length === 0) throw new ArgError('missing operand');
    let code = 0;
    const removeOne = (dir: string): boolean => {
      try {
        const ref = resolveParent(ctx.fs, ctx.abs(dir), ctx.cred);
        if (!ref.existing) throw new FsError('ENOENT');
        let node = ref.existing;
        if (node.type === 'symlink') {
          ctx.fail(`failed to remove '${dir}': Not a directory`);
          return false;
        }
        if (node.type !== 'dir') throw new FsError('ENOTDIR');
        if (Object.keys(node.children).length > 0) {
          if (a.flags.has('ignore')) return false;
          throw new FsError('ENOTEMPTY');
        }
        checkParentWritable(ctx, ref, dir);
        ctx.fs = removeChild(ctx.fs, ref.parentCanon, ref.name, ctx.now);
        if (a.flags.has('v')) ctx.out(`rmdir: removing directory, '${dir}'\n`);
        void node;
        return true;
      } catch (e) {
        if (e instanceof FsError) ctx.fail(`failed to remove '${dir}': ${e.text}`);
        else throw e;
        return false;
      }
    };
    for (const op of a.operands) {
      let dir = op.replace(/\/+$/, '') || op;
      if (!removeOne(dir)) {
        code = 1;
        continue;
      }
      if (a.flags.has('p')) {
        while (dir.includes('/')) {
          dir = dir.slice(0, dir.lastIndexOf('/'));
          if (!dir) break;
          if (!removeOne(dir)) {
            code = 1;
            break;
          }
        }
      }
    }
    return code;
  },
};

// ---------------------------------------------------------------- cp / mv shared

interface Target {
  abs: string;
  shown: string;
}

function resolveTargets(ctx: Ctx, operands: string[], name: string, noTargetDir: boolean): { sources: string[]; dest: string; destIsDir: boolean } | null {
  if (operands.length === 0) throw new ArgError('missing file operand');
  if (operands.length === 1) throw new ArgError(`missing destination file operand after '${operands[0]}'`);
  const dest = operands[operands.length - 1]!;
  const sources = operands.slice(0, -1);
  const d = ctx.tryStat(dest);
  const destIsDir = !noTargetDir && !!d && d.node.type === 'dir';
  if (sources.length > 1 && !destIsDir) {
    ctx.err(`${name}: target '${dest}': ${d ? 'Not a directory' : 'No such file or directory'}\n`);
    return null;
  }
  return { sources, dest, destIsDir };
}

function targetFor(ctx: Ctx, src: string, dest: string, destIsDir: boolean): Target {
  if (destIsDir) {
    const base = basename(src);
    const shown = dest.endsWith('/') ? dest + base : `${dest}/${base}`;
    return { abs: ctx.abs(shown), shown };
  }
  return { abs: ctx.abs(dest), shown: dest };
}

function sameNode(ctx: Ctx, a: string, b: string): boolean {
  const ra = ctx.tryStat(a);
  const rb = ctx.tryStat(b);
  return !!ra && !!rb && canonToPath(ra.canon) === canonToPath(rb.canon);
}

/** Copy `node` into the location `dst` (absolute), merging directories. */
function copyInto(ctx: Ctx, node: FsNode, dstAbs: string, dstShown: string, preserve: boolean, noClobber: boolean, verbose: string | null): boolean {
  const ref = resolveParent(ctx.fs, dstAbs, ctx.cred);
  let existing = ref.existing;
  if (existing && existing.type === 'symlink') {
    const t = ctx.tryStat(dstAbs);
    if (t) existing = t.node;
  }
  if (node.type === 'dir') {
    if (existing && existing.type !== 'dir') {
      ctx.fail(`cannot overwrite non-directory '${dstShown}' with directory '${verbose ?? ''}'`);
      return false;
    }
    if (!existing) {
      checkParentWritable(ctx, ref, dstShown);
      const copy = cloneTree({ ...node, children: {} }, ref.name, ctx.defaults, preserve) as DirNode;
      ctx.fs = putChild(ctx.fs, ref.parentCanon, copy, ctx.now);
      if (verbose !== null) ctx.out(`'${verbose}' -> '${dstShown}'\n`);
    }
    let ok = true;
    if (!can(node, ctx.cred, R)) {
      ctx.fail(`cannot access '${verbose}': Permission denied`);
      return false;
    }
    for (const [name, child] of Object.entries(node.children)) {
      if (!copyInto(ctx, child, `${dstAbs}/${name}`, `${dstShown}/${name}`, preserve, noClobber, verbose !== null ? `${verbose}/${name}` : null)) ok = false;
    }
    return ok;
  }
  if (existing && existing.type === 'dir') {
    ctx.fail(`cannot overwrite directory '${dstShown}' with non-directory`);
    return false;
  }
  if (existing && noClobber) return true;
  if (node.type === 'file' && !can(node, ctx.cred, R)) {
    ctx.fail(`cannot open '${verbose ?? dstShown}' for reading: Permission denied`);
    return false;
  }
  if (node.type === 'symlink') {
    checkParentWritable(ctx, ref, dstShown);
    ctx.fs = putChild(ctx.fs, ref.parentCanon, cloneTree(node, ref.name, ctx.defaults, preserve), ctx.now);
  } else if (existing) {
    ctx.writeFile(dstAbs, node.content);
  } else {
    checkParentWritable(ctx, ref, dstShown);
    const copy = cloneTree(node, ref.name, ctx.defaults, preserve);
    ctx.fs = putChild(ctx.fs, ref.parentCanon, copy, ctx.now);
  }
  if (verbose !== null) ctx.out(`'${verbose}' -> '${dstShown}'\n`);
  return true;
}

export const cp: CommandDef = {
  name: 'cp',
  category: 'files',
  doc: {
    summary: 'copy files and directories',
    usage: ['cp [OPTION]... SOURCE DEST', 'cp [OPTION]... SOURCE... DIRECTORY'],
    description: 'Copy SOURCE to DEST, or multiple SOURCE(s) to DIRECTORY.',
    options: [
      ['-a, --archive', 'same as -dR --preserve=all'],
      ['-n, --no-clobber', 'do not overwrite an existing file'],
      ['-p', 'preserve mode, ownership and timestamps'],
      ['-r, -R, --recursive', 'copy directories recursively'],
      ['-T, --no-target-directory', 'treat DEST as a normal file'],
      ['-v, --verbose', 'explain what is being done'],
    ],
    examples: [
      ['cp notes.txt backup.txt', 'copy a file'],
      ['cp -r project/ project-backup', 'copy a whole directory'],
      ['cp *.jpg photos/', 'copy several files into a directory'],
    ],
    seeAlso: ['mv', 'rsync'],
  },
  run(ctx) {
    const a = parseArgs(ctx.args, {
      flags: 'anprRTvfiuPdL',
      long: { archive: 'a', 'no-clobber': 'n', recursive: 'r', verbose: 'v', 'no-target-directory': 'T', force: 'f', interactive: 'i', update: 'u' },
    });
    const f = a.flags;
    const recursive = f.has('r') || f.has('R') || f.has('a');
    const t = resolveTargets(ctx, a.operands, 'cp', f.has('T'));
    if (!t) return 1;
    let code = 0;
    for (const src of t.sources) {
      let node: FsNode;
      try {
        node = ctx.stat(src).node;
      } catch (e) {
        if (e instanceof FsError) ctx.fail(`cannot stat '${src}': ${e.text}`);
        else throw e;
        code = 1;
        continue;
      }
      if (node.type === 'dir' && !recursive) {
        ctx.fail(`-r not specified; omitting directory '${src}'`);
        code = 1;
        continue;
      }
      const dst = targetFor(ctx, src, t.dest, t.destIsDir);
      if (sameNode(ctx, src, dst.shown)) {
        ctx.fail(`'${src}' and '${dst.shown}' are the same file`);
        code = 1;
        continue;
      }
      if (node.type === 'dir') {
        const sCanon = ctx.stat(src).canon;
        let dParent;
        try {
          dParent = resolveParent(ctx.fs, dst.abs, ctx.cred);
        } catch (e) {
          cannot(ctx, 'create directory', dst.shown, e);
          code = 1;
          continue;
        }
        if (isInside([...dParent.parentCanon, dParent.name], sCanon)) {
          // GNU cp copies one level (the snapshot taken before the copy) and then complains
          try {
            copyInto(ctx, node, dst.abs, dst.shown, f.has('p') || f.has('a'), f.has('n'), null);
          } catch {
            /* ignore */
          }
          ctx.fail(`cannot copy a directory, '${src}', into itself, '${dst.shown}'`);
          code = 1;
          continue;
        }
      }
      try {
        if (!copyInto(ctx, node, dst.abs, dst.shown, f.has('p') || f.has('a'), f.has('n'), f.has('v') ? src : null)) code = 1;
      } catch (e) {
        if (e instanceof FsError) {
          ctx.fail(`cannot create ${node.type === 'dir' ? 'directory' : 'regular file'} '${dst.shown}': ${e.text}`);
          code = 1;
        } else throw e;
      }
    }
    return code;
  },
};

export const mv: CommandDef = {
  name: 'mv',
  category: 'files',
  doc: {
    summary: 'move (rename) files',
    usage: ['mv [OPTION]... SOURCE DEST', 'mv [OPTION]... SOURCE... DIRECTORY'],
    description: 'Rename SOURCE to DEST, or move SOURCE(s) to DIRECTORY.',
    options: [
      ['-f, --force', 'do not prompt before overwriting'],
      ['-n, --no-clobber', 'do not overwrite an existing file'],
      ['-T, --no-target-directory', 'treat DEST as a normal file'],
      ['-v, --verbose', 'explain what is being done'],
    ],
    examples: [
      ['mv draft.txt final.txt', 'rename a file'],
      ['mv *.png images/', 'move all PNG files into a directory'],
    ],
    seeAlso: ['cp', 'rename'],
  },
  run(ctx) {
    const a = parseArgs(ctx.args, {
      flags: 'fnTviu',
      long: { force: 'f', 'no-clobber': 'n', 'no-target-directory': 'T', verbose: 'v', interactive: 'i', update: 'u' },
    });
    const f = a.flags;
    const t = resolveTargets(ctx, a.operands, 'mv', f.has('T'));
    if (!t) return 1;
    let code = 0;
    for (const src of t.sources) {
      let sref: ParentRef;
      try {
        sref = resolveParent(ctx.fs, ctx.abs(src), ctx.cred);
        if (!sref.existing) throw new FsError('ENOENT');
      } catch (e) {
        if (e instanceof FsError) ctx.fail(`cannot stat '${src}': ${e.text}`);
        else throw e;
        code = 1;
        continue;
      }
      const node = sref.existing;
      const dst = targetFor(ctx, src, t.dest, t.destIsDir);
      try {
        const dref = resolveParent(ctx.fs, dst.abs, ctx.cred);
        const sCanon = [...sref.parentCanon, sref.name];
        const dCanon = [...dref.parentCanon, dref.name];
        if (canonToPath(sCanon) === canonToPath(dCanon)) {
          ctx.fail(`'${src}' and '${dst.shown}' are the same file`);
          code = 1;
          continue;
        }
        if (node.type === 'dir' && isInside(dCanon, sCanon)) {
          ctx.fail(`cannot move '${src}' to a subdirectory of itself, '${dst.shown}'`);
          code = 1;
          continue;
        }
        const existing = dref.existing;
        if (existing) {
          if (f.has('n')) continue;
          if (existing.type === 'dir' && node.type !== 'dir') {
            ctx.fail(`cannot overwrite directory '${dst.shown}' with non-directory`);
            code = 1;
            continue;
          }
          if (existing.type !== 'dir' && node.type === 'dir') {
            ctx.fail(`cannot overwrite non-directory '${dst.shown}' with directory '${src}'`);
            code = 1;
            continue;
          }
          if (existing.type === 'dir' && Object.keys(existing.children).length > 0) {
            ctx.fail(`cannot move '${src}' to '${dst.shown}': Directory not empty`);
            code = 1;
            continue;
          }
        }
        checkParentWritable(ctx, sref, src);
        checkParentWritable(ctx, { ...dref, existing: undefined }, dst.shown);
        // moving a directory to another parent requires write permission on it (to update '..')
        if (node.type === 'dir' && canonToPath(sref.parentCanon) !== canonToPath(dref.parentCanon) && !can(node, ctx.cred, W)) {
          throw new FsError('EACCES');
        }
        const moved: FsNode = { ...node, name: dref.name };
        ctx.fs = removeChild(ctx.fs, sref.parentCanon, sref.name, ctx.now);
        ctx.fs = putChild(ctx.fs, dref.parentCanon, moved, ctx.now);
        if (f.has('v')) ctx.out(`renamed '${src}' -> '${dst.shown}'\n`);
      } catch (e) {
        if (e instanceof FsError) {
          if (e.code === 'ENOENT' || e.code === 'ENOTDIR') ctx.fail(`cannot move '${src}' to '${dst.shown}': ${e.text}`);
          else ctx.fail(`cannot move '${src}' to '${dst.shown}': ${e.text}`);
          code = 1;
        } else throw e;
      }
    }
    return code;
  },
};

// ---------------------------------------------------------------- ln

export const ln: CommandDef = {
  name: 'ln',
  category: 'files',
  doc: {
    summary: 'make links between files',
    usage: ['ln [OPTION]... TARGET LINK_NAME', 'ln [OPTION]... TARGET... DIRECTORY'],
    description:
      'Create a link to TARGET with the name LINK_NAME. A symbolic link (-s) is a small file that points to another path; when the target is removed the link becomes dangling. In this trainer hard links are emulated with a copy.',
    options: [
      ['-f, --force', 'remove existing destination files'],
      ['-s, --symbolic', 'make symbolic links instead of hard links'],
      ['-v, --verbose', 'print name of each linked file'],
      ['-n, --no-dereference', 'treat LINK_NAME as a normal file if it is a symbolic link to a directory'],
    ],
    examples: [
      ['ln -s /var/log logs', 'create a shortcut called logs'],
      ['ln -sf v2 current', 'repoint an existing link'],
    ],
    seeAlso: ['readlink', 'cp'],
  },
  run(ctx) {
    const a = parseArgs(ctx.args, { flags: 'sfvnrT', long: { symbolic: 's', force: 'f', verbose: 'v', 'no-dereference': 'n' } });
    const f = a.flags;
    if (a.operands.length === 0) throw new ArgError('missing file operand');
    let targets: string[];
    let dest: string;
    let destIsDir = false;
    if (a.operands.length === 1) {
      targets = [a.operands[0]!];
      dest = '.';
      destIsDir = true;
    } else {
      targets = a.operands.slice(0, -1);
      dest = a.operands[a.operands.length - 1]!;
      const d = ctx.tryStat(dest, !f.has('n'));
      destIsDir = !!d && d.node.type === 'dir';
      if (targets.length > 1 && !destIsDir) {
        ctx.fail(`target '${dest}' is not a directory`);
        return 1;
      }
    }
    let code = 0;
    for (const target of targets) {
      const linkShown = destIsDir ? (dest === '.' ? basename(target) : `${dest.replace(/\/$/, '')}/${basename(target)}`) : dest;
      try {
        const ref = resolveParent(ctx.fs, ctx.abs(linkShown), ctx.cred);
        if (ref.existing) {
          if (!f.has('f')) {
            ctx.fail(`failed to create ${f.has('s') ? 'symbolic' : 'hard'} link '${linkShown}': File exists`);
            code = 1;
            continue;
          }
          if (ref.existing.type === 'dir') {
            ctx.fail(`${linkShown}: cannot overwrite directory`);
            code = 1;
            continue;
          }
        }
        checkParentWritable(ctx, { ...ref, existing: undefined }, linkShown);
        let node: FsNode;
        if (f.has('s')) {
          node = makeSymlink(ref.name, target, ctx.defaults);
        } else {
          let src;
          try {
            src = ctx.stat(target);
          } catch (e) {
            if (e instanceof FsError) {
              ctx.fail(`failed to access '${target}': ${e.text}`);
              code = 1;
              continue;
            }
            throw e;
          }
          if (src.node.type === 'dir') {
            ctx.fail(`${target}: hard link not allowed for directory`);
            code = 1;
            continue;
          }
          node = src.node.type === 'file' ? { ...src.node, name: ref.name } : makeFile(ref.name, '', ctx.defaults);
        }
        ctx.fs = putChild(ctx.fs, ref.parentCanon, node, ctx.now);
        if (f.has('v')) ctx.out(`'${linkShown}' ${f.has('s') ? '->' : '=>'} '${target}'\n`);
      } catch (e) {
        if (e instanceof FsError) {
          ctx.fail(`failed to create ${f.has('s') ? 'symbolic' : 'hard'} link '${linkShown}': ${e.text}`);
          code = 1;
        } else throw e;
      }
    }
    return code;
  },
};

export const readlink: CommandDef = {
  name: 'readlink',
  category: 'files',
  doc: {
    summary: 'print resolved symbolic links or canonical file names',
    usage: ['readlink [OPTION]... FILE...'],
    options: [['-f, --canonicalize', 'canonicalize by following every symlink in every component recursively']],
    seeAlso: ['ln', 'realpath'],
  },
  run(ctx) {
    const a = parseArgs(ctx.args, { flags: 'fenmqsv', long: { canonicalize: 'f' } });
    if (a.operands.length === 0) throw new ArgError('missing operand');
    let code = 0;
    for (const op of a.operands) {
      if (a.flags.has('f') || a.flags.has('e') || a.flags.has('m')) {
        const r = ctx.tryStat(op);
        if (r) ctx.out(canonToPath(r.canon) + '\n');
        else code = 1;
        continue;
      }
      const r = ctx.tryStat(op, false);
      if (r && r.node.type === 'symlink') ctx.out(r.node.target + '\n');
      else code = 1;
    }
    return code;
  },
};

export const realpath: CommandDef = {
  name: 'realpath',
  category: 'files',
  doc: { summary: 'print the resolved path', usage: ['realpath [OPTION]... FILE...'], seeAlso: ['readlink'] },
  run(ctx) {
    const a = parseArgs(ctx.args, { flags: 'emqsLP' });
    if (a.operands.length === 0) throw new ArgError('missing operand');
    let code = 0;
    for (const op of a.operands) {
      try {
        ctx.out(canonToPath(ctx.stat(op).canon) + '\n');
      } catch (e) {
        if (e instanceof FsError) ctx.fail(`${op}: ${e.text}`);
        code = 1;
      }
    }
    return code;
  },
};

