import type { CommandDef } from '../shell/context';
import * as admin from './admin';
import * as builtins from './builtins';
import * as dockerCmds from './docker';
import * as files from './files';
import * as nav from './nav';
import * as network from './network';
import * as search from './search';
import * as system from './system';
import * as text from './text';
import * as textproc from './textproc';

function isCommand(v: unknown): v is CommandDef {
  return typeof v === 'object' && v !== null && 'run' in v && 'name' in v && 'doc' in v;
}

const all: CommandDef[] = [];
for (const mod of [nav, files, text, textproc, search, system, network, admin, dockerCmds, builtins]) {
  for (const v of Object.values(mod)) if (isCommand(v)) all.push(v);
}

/** All commands known to the simulator, by name. */
export const COMMANDS: ReadonlyMap<string, CommandDef> = new Map(all.map((c) => [c.name, c]));

/** Names of commands that exist as files in /usr/bin. */
export const BINARY_NAMES: string[] = all.filter((c) => !c.builtin && /^[a-z]/.test(c.name)).map((c) => c.name);
