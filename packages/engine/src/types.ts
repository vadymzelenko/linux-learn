/**
 * Core data model of the simulator. Everything here is plain JSON-serialisable
 * data so that machines can be stored on device and shipped as mission fixtures.
 */

export interface NodeMeta {
  name: string;
  /** Permission bits, e.g. 0o755. File type is encoded by `type`. */
  mode: number;
  owner: string;
  group: string;
  /** Modification time, ms since epoch. */
  mtime: number;
}

export interface FileNode extends NodeMeta {
  type: 'file';
  content: string;
  /** Optional fake size in bytes for big generated files (logs, videos). */
  fakeSize?: number;
}

export interface DirNode extends NodeMeta {
  type: 'dir';
  children: Record<string, FsNode>;
}

export interface SymlinkNode extends NodeMeta {
  type: 'symlink';
  target: string;
}

export type FsNode = FileNode | DirNode | SymlinkNode;

export interface UserInfo {
  name: string;
  uid: number;
  gid: number;
  home: string;
  groups: string[];
  shell?: string;
}

export interface ProcessInfo {
  pid: number;
  user: string;
  command: string;
  cpu: number;
  mem: number;
  /** RSS in KiB */
  rss?: number;
  stat?: string;
  start?: string;
}

export interface DiskInfo {
  filesystem: string;
  /** Sizes in KiB */
  size: number;
  used: number;
  mount: string;
  type?: string;
}

export interface HttpResponse {
  status: number;
  body?: string;
  headers?: Record<string, string>;
  /** Reverse proxy: when this local service is not active, the answer is 502 Bad Gateway. */
  upstream?: string;
}

/** A remote host reachable from the simulated machine. */
export interface NetHost {
  name: string;
  ip: string;
  /** Host answers ping/TCP (default true). */
  up?: boolean;
  /** Present in DNS (default true). Hosts only in /etc/hosts set this to false. */
  dns?: boolean;
  /** Round-trip time in ms (default 20). */
  latency?: number;
  /** Packet loss in percent (0-100). */
  loss?: number;
  /** traceroute hops before the host ("name ip", "ip" or "*"). */
  hops?: string[];
  /** Open TCP ports, e.g. { "80": "http", "443": "https" }. */
  ports?: Record<string, string>;
  /** HTTP responses by path. */
  http?: Record<string, HttpResponse>;
  aliases?: string[];
}

export interface NetInterface {
  name: string;
  /** e.g. "10.0.2.15/24" */
  cidr: string;
  mac: string;
  up: boolean;
}

export interface Network {
  interfaces: NetInterface[];
  gateway: string;
  dnsServer: string;
  hosts: NetHost[];
}

export interface Service {
  name: string;
  description: string;
  state: 'active' | 'inactive' | 'failed';
  enabled: boolean;
  /** When the current state began (ms); defaults to boot time. */
  since?: number;
  /** User the daemon runs as (ps, ss -p). */
  user?: string;
  pid?: number;
  /** Listening port (TCP unless proto is udp). */
  port?: number;
  proto?: 'tcp' | 'udp';
  bind?: string;
  http?: Record<string, HttpResponse>;
  /** Journal lines (already formatted, oldest first). */
  logs: string[];
  /** A (re)start only succeeds when this file check passes. */
  config?: { path: string; mustContain?: string; mustNotContain?: string; error: string };
}

export interface SystemInfo {
  uptimeSec: number;
  load: [number, number, number];
  cpus: number;
  /** KiB */
  memTotal: number;
  memUsed: number;
  memCache: number;
  swapTotal: number;
  swapUsed: number;
  logins: { user: string; tty: string; from: string; at: string }[];
}

export interface Machine {
  hostname: string;
  fs: DirNode;
  users: UserInfo[];
  processes: ProcessInfo[];
  disks: DiskInfo[];
  network?: Network;
  services?: Service[];
  system?: SystemInfo;
}

export interface Session {
  machine: Machine;
  /** Current user name. */
  user: string;
  /** Logical working directory (like $PWD). */
  cwd: string;
  /** Exported environment variables. */
  env: Record<string, string>;
  /** Shell (non-exported) variables. */
  locals: Record<string, string>;
  aliases: Record<string, string>;
  /** Users to return to on `exit` (after `sudo -i` / `su`). */
  userStack: { user: string; cwd: string }[];
  history: string[];
  lastExitCode: number;
}

export type Stream = 'stdout' | 'stderr';

export interface OutputChunk {
  stream: Stream;
  text: string;
}

/** A simple command as it was actually executed (after expansion). Used by task checks. */
export interface ExecutedCommand {
  name: string;
  args: string[];
  exitCode: number;
  /** Was it executed through sudo. */
  sudo?: boolean;
}

export interface ExecOptions {
  /** Current time in ms. Fixed in tests for determinism. */
  now?: number;
  /** Terminal width in characters (affects `ls` columns). */
  columns?: number;
  /** Whether stdout is a terminal (colours, columns). Default true. */
  isTTY?: boolean;
  /** Max characters of output kept per execution. */
  maxOutput?: number;
}

export type ShellEvent =
  | { type: 'clear' }
  | { type: 'didYouMean'; command: string; suggestion: string }
  | { type: 'easterEgg'; id: 'rm-rf-root' | 'sudo-rm-rf-root' | 'fork-bomb' }
  | { type: 'openEditor'; path: string; content: string; exists: boolean }
  | { type: 'exit' };

export interface ExecResult {
  session: Session;
  output: OutputChunk[];
  exitCode: number;
  events: ShellEvent[];
  executed: ExecutedCommand[];
}
