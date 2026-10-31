/** GNU getopt_long-style argument parser shared by all commands. */

export interface ArgSpec {
  /** Short boolean flags, e.g. 'alhR1' */
  flags?: string;
  /** Short options that take a value, e.g. 'n' for `-n 5` / `-n5` */
  withValue?: string;
  /** Long options mapped to short ones (or to themselves if no short form). */
  long?: Record<string, string>;
  /** Long options that take a value (`--lines=5` / `--lines 5`), mapped to short key. */
  longWithValue?: Record<string, string>;
  /** Long options with an optional `=value` (`--color`, `--color=auto`). */
  longOptional?: Record<string, string>;
  /** Accept `-NUM` as value for this key (head -5, tail -20). */
  numericShortcut?: string;
  /** Stop parsing options at the first operand (like `find`, `sudo`, `xargs`). */
  stopAtOperand?: boolean;
}

export interface ParsedArgs {
  flags: Set<string>;
  values: Map<string, string>;
  /** Order in which options were seen (for "last one wins" semantics). */
  order: string[];
  operands: string[];
}

export class ArgError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ArgError';
  }
}

export function parseArgs(argv: readonly string[], spec: ArgSpec): ParsedArgs {
  const flags = new Set<string>();
  const values = new Map<string, string>();
  const order: string[] = [];
  const operands: string[] = [];
  const shortFlags = spec.flags ?? '';
  const shortVals = spec.withValue ?? '';
  const long = spec.long ?? {};
  const longVals = spec.longWithValue ?? {};
  const longOpt = spec.longOptional ?? {};

  let i = 0;
  for (; i < argv.length; i++) {
    const arg = argv[i]!;
    if (arg === '--') {
      i++;
      break;
    }
    if (arg.startsWith('--')) {
      const eq = arg.indexOf('=');
      const name = eq === -1 ? arg.slice(2) : arg.slice(2, eq);
      const exactVal = longVals[name];
      const exactFlag = long[name];
      let key: string | undefined;
      let takesValue = false;
      const optKey = longOpt[name] ?? (Object.keys(longOpt).filter((n) => n.startsWith(name)).length === 1 && name.length > 1 ? longOpt[Object.keys(longOpt).find((n) => n.startsWith(name))!] : undefined);
      if (optKey !== undefined) {
        if (eq !== -1) values.set(optKey, arg.slice(eq + 1));
        else flags.add(optKey);
        order.push(optKey);
        continue;
      }
      if (exactVal !== undefined) {
        key = exactVal;
        takesValue = true;
      } else if (exactFlag !== undefined) key = exactFlag;
      else {
        // unambiguous prefix, as getopt_long allows
        const cands = [...Object.keys(long), ...Object.keys(longVals)].filter((n) => n.startsWith(name));
        // candidates that map to the same option are not ambiguous (--color / --colour)
        const targets = new Set(cands.map((n) => (n in longVals ? `v:${longVals[n]}` : `f:${long[n]}`)));
        const uniq = targets.size === 1 ? cands.slice(0, 1) : [...new Set(cands)];
        if (uniq.length === 1) {
          const n = uniq[0]!;
          takesValue = n in longVals;
          key = takesValue ? longVals[n] : long[n];
        } else if (uniq.length > 1) {
          throw new ArgError(`option '--${name}' is ambiguous`);
        }
      }
      if (key === undefined) throw new ArgError(`unrecognized option '${arg}'`);
      if (takesValue) {
        let v: string | undefined;
        if (eq !== -1) v = arg.slice(eq + 1);
        else v = argv[++i];
        if (v === undefined) throw new ArgError(`option '--${name}' requires an argument`);
        values.set(key, v);
      } else {
        if (eq !== -1) throw new ArgError(`option '--${name}' doesn't allow an argument`);
        flags.add(key);
      }
      order.push(key);
      continue;
    }
    if (arg.startsWith('-') && arg.length > 1) {
      if (spec.numericShortcut && /^-\d+$/.test(arg)) {
        values.set(spec.numericShortcut, arg.slice(1));
        order.push(spec.numericShortcut);
        continue;
      }
      for (let j = 1; j < arg.length; j++) {
        const c = arg[j]!;
        if (shortVals.includes(c)) {
          let v = arg.slice(j + 1);
          if (v === '') {
            const nxt = argv[++i];
            if (nxt === undefined) throw new ArgError(`option requires an argument -- '${c}'`);
            v = nxt;
          }
          values.set(c, v);
          order.push(c);
          break;
        }
        if (shortFlags.includes(c)) {
          flags.add(c);
          order.push(c);
          continue;
        }
        throw new ArgError(`invalid option -- '${c}'`);
      }
      continue;
    }
    operands.push(arg);
    if (spec.stopAtOperand) {
      i++;
      break;
    }
  }
  for (; i < argv.length; i++) operands.push(argv[i]!);
  return { flags, values, order, operands };
}

/**
 * Normalise a command's flags for comparison in task checks:
 * `ls -la`, `ls -al` and `ls -l -a` all become {a, l}.
 */
export function normalizeFlags(args: readonly string[]): { flags: Set<string>; operands: string[] } {
  const flags = new Set<string>();
  const operands: string[] = [];
  let ended = false;
  for (const a of args) {
    if (!ended && a === '--') {
      ended = true;
      continue;
    }
    if (!ended && a.startsWith('--') && a.length > 2) {
      flags.add(a.split('=')[0]!);
    } else if (!ended && a.startsWith('-') && a.length > 1 && !/^-\d+$/.test(a)) {
      for (const c of a.slice(1)) flags.add('-' + c);
    } else {
      operands.push(a);
    }
  }
  return { flags, operands };
}
