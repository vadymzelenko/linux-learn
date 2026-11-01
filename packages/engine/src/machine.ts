import type { DirNode, DiskInfo, DockerContainer, DockerState, FsNode, Machine, Network, ProcessInfo, Service, Session, SystemInfo, UserInfo } from './types';
import { makeDir, makeFile, makeSymlink, type NodeDefaults } from './vfs/fs';
import { expandTilde, splitPath } from './vfs/path';
import { DOCKER_HUB, emptyDocker, imageId, parseRef } from './commands/docker';

/** 2026-10-01 09:00 UTC – timestamp of the "installed" system files. */
export const SYSTEM_EPOCH = Date.UTC(2026, 9, 1, 9, 0, 0);

export type FileSpec =
  | string
  | null
  | {
      content?: string;
      /** e.g. "755" or 0o755 */
      mode?: string | number;
      owner?: string;
      group?: string;
      /** Create a symlink pointing to this target. */
      symlink?: string;
      dir?: boolean;
      /** Fake size in bytes (for "big" files). */
      size?: number;
      /** ISO date or ms. */
      mtime?: string | number;
    };

export interface MachineSpec {
  hostname?: string;
  user?: string;
  /** Extra users besides root and the main user. */
  users?: { name: string; uid?: number; groups?: string[]; home?: string }[];
  /** Working directory, may start with `~`. */
  cwd?: string;
  /**
   * Files to create. Keys are paths (may start with `~`); a key ending with
   * `/` or a null value creates a directory.
   */
  files?: Record<string, FileSpec>;
  processes?: ProcessInfo[];
  disks?: DiskInfo[];
  /** Network: extra hosts are merged with the default internet hosts. */
  network?: Partial<Network> & { hosts?: Network['hosts'] };
  services?: Service[];
  system?: Partial<SystemInfo>;
  env?: Record<string, string>;
  /** Base time for created files (ms). */
  now?: number;
  /** Is the main user in the sudo group (default true). */
  sudo?: boolean;
  /** Docker installed: the `docker` service, images pulled from the catalog, containers. */
  docker?: DockerSpec;
}

export interface DockerSpec {
  /** State of the docker daemon service (default active). */
  daemon?: 'active' | 'inactive' | 'failed';
  /** The main user is in the `docker` group (default true). */
  group?: boolean;
  /** Images already pulled, e.g. ["nginx:latest", "alpine"]. */
  images?: string[];
  containers?: {
    name: string;
    image: string;
    state?: 'running' | 'exited' | 'created';
    exitCode?: number;
    /** "8080:80" */
    ports?: string[];
    env?: Record<string, string>;
    command?: string;
    /** Extra log lines after the image's start logs. */
    logs?: string[];
    /** Minutes since the container was created (default 120). */
    age?: number;
    restart?: string;
  }[];
  volumes?: string[];
}

export const DEFAULT_USER = 'student';
export const DEFAULT_HOST = 'trainer';

const BASHRC = `# ~/.bashrc: executed by bash(1) for non-login shells.

# don't put duplicate lines or lines starting with space in the history.
HISTCONTROL=ignoreboth
HISTSIZE=1000

# enable color support of ls and also add handy aliases
alias ls='ls --color=auto'
alias grep='grep --color=auto'

# some more ls aliases
alias ll='ls -alF'
alias la='ls -A'
alias l='ls -CF'
`;

const PROFILE = `# ~/.profile: executed by the command interpreter for login shells.

# include .bashrc if it exists
if [ -f "$HOME/.bashrc" ]; then
    . "$HOME/.bashrc"
fi

# set PATH so it includes user's private bin if it exists
if [ -d "$HOME/bin" ] ; then
    PATH="$HOME/bin:$PATH"
fi
`;

const OS_RELEASE = `PRETTY_NAME="Ubuntu 24.04.1 LTS"
NAME="Ubuntu"
VERSION_ID="24.04"
VERSION="24.04.1 LTS (Noble Numbat)"
VERSION_CODENAME=noble
ID=ubuntu
ID_LIKE=debian
HOME_URL="https://www.ubuntu.com/"
`;

function parseMode(m: string | number | undefined, fallback: number): number {
  if (m === undefined) return fallback;
  if (typeof m === 'number') return m;
  return parseInt(m, 8);
}

function parseTime(t: string | number | undefined, fallback: number): number {
  if (t === undefined) return fallback;
  if (typeof t === 'number') return t;
  const v = Date.parse(t);
  return Number.isNaN(v) ? fallback : v;
}

/** Mutable helper used only while building a machine. */
function ensureDir(root: DirNode, segs: string[], d: NodeDefaults): DirNode {
  let cur = root;
  for (const s of segs) {
    let next = cur.children[s];
    if (!next || next.type !== 'dir') {
      next = makeDir(s, d);
      cur.children[s] = next;
    }
    cur = next;
  }
  return cur;
}

function setNode(root: DirNode, path: string, node: FsNode, d: NodeDefaults): void {
  const segs = splitPath(path);
  const name = segs.pop();
  if (!name) return;
  const parent = ensureDir(root, segs, d);
  const prev = parent.children[name];
  if (prev && prev.type === 'dir' && node.type === 'dir') {
    // keep existing children when re-declaring a directory
    parent.children[name] = { ...node, children: { ...prev.children, ...node.children } };
  } else {
    parent.children[name] = node;
  }
}

export interface CreateMachineOptions {
  /** Command names that get a fake binary in /usr/bin. */
  binaries?: string[];
}

export function buildMachine(spec: MachineSpec = {}, opts: CreateMachineOptions = {}): Machine {
  const user = spec.user ?? DEFAULT_USER;
  const now = spec.now ?? SYSTEM_EPOCH;
  const sys: NodeDefaults = { owner: 'root', group: 'root', now: SYSTEM_EPOCH };
  const home = user === 'root' ? '/root' : `/home/${user}`;
  const users: UserInfo[] = [
    { name: 'root', uid: 0, gid: 0, home: '/root', groups: ['root'], shell: '/bin/bash' },
  ];
  if (user !== 'root') users.push({ name: user, uid: 1000, gid: 1000, home, groups: [user, ...(spec.sudo === false ? [] : ['sudo']), ...(spec.docker && spec.docker.group !== false ? ['docker'] : [])], shell: '/bin/bash' });
  (spec.users ?? []).forEach((u, i) => {
    if (users.some((x) => x.name === u.name)) return;
    users.push({
      name: u.name,
      uid: u.uid ?? 1001 + i,
      gid: u.uid ?? 1001 + i,
      home: u.home ?? `/home/${u.name}`,
      groups: u.groups ?? [u.name],
      shell: '/bin/bash',
    });
  });

  const root = makeDir('', sys);
  for (const d of ['boot', 'dev', 'etc', 'home', 'mnt', 'media', 'opt', 'srv', 'usr/bin', 'usr/sbin', 'usr/lib', 'usr/local/bin', 'usr/share', 'var/log', 'var/tmp', 'var/lib', 'var/www']) {
    ensureDir(root, splitPath(d), sys);
  }
  root.children['tmp'] = makeDir('tmp', sys, 0o1777);
  root.children['root'] = makeDir('root', sys, 0o700, {
    '.bashrc': makeFile('.bashrc', BASHRC, sys),
    '.profile': makeFile('.profile', PROFILE, sys),
  });
  root.children['bin'] = makeSymlink('bin', 'usr/bin', sys);
  root.children['sbin'] = makeSymlink('sbin', 'usr/sbin', sys);
  root.children['lib'] = makeSymlink('lib', 'usr/lib', sys);
  const dev = ensureDir(root, ['dev'], sys);
  dev.children['null'] = makeFile('null', '', sys, 0o666);

  const etc = ensureDir(root, ['etc'], sys);
  const hostname = spec.hostname ?? DEFAULT_HOST;
  etc.children['hostname'] = makeFile('hostname', hostname + '\n', sys);
  etc.children['hosts'] = makeFile('hosts', `127.0.0.1\tlocalhost\n127.0.1.1\t${hostname}\n\n::1\tip6-localhost ip6-loopback\n`, sys);
  etc.children['os-release'] = makeFile('os-release', OS_RELEASE, sys);
  etc.children['shells'] = makeFile('shells', '# /etc/shells: valid login shells\n/bin/sh\n/bin/bash\n/usr/bin/bash\n', sys);
  etc.children['passwd'] = makeFile(
    'passwd',
    users.map((u) => `${u.name}:x:${u.uid}:${u.gid}:${u.name === 'root' ? 'root' : u.name}:${u.home}:${u.shell ?? '/bin/bash'}`).join('\n') + '\n',
    sys,
  );
  const groups = new Map<string, string[]>();
  for (const u of users) for (const g of u.groups) groups.set(g, [...(groups.get(g) ?? []), ...(g === u.name ? [] : [u.name])]);
  etc.children['group'] = makeFile(
    'group',
    [...groups.entries()].map(([g, m], i) => `${g}:x:${g === 'root' ? 0 : g === 'sudo' ? 27 : (users.find((u) => u.name === g)?.gid ?? 2000 + i)}:${m.join(',')}`).join('\n') + '\n',
    sys,
  );
  etc.children['shadow'] = makeFile('shadow', 'root:*:20000:0:99999:7:::\n', { ...sys, group: 'shadow' }, 0o640);

  const bin = ensureDir(root, ['usr', 'bin'], sys);
  for (const name of opts.binaries ?? []) {
    bin.children[name] = makeFile(name, '\x7fELF\x02\x01\x01 (binary data)\n', sys, 0o755);
  }

  for (const u of users) {
    if (u.name === 'root') continue;
    const ud: NodeDefaults = { owner: u.name, group: u.groups[0] ?? u.name, now: SYSTEM_EPOCH };
    setNode(root, u.home, makeDir(u.name, ud, 0o750, {
      '.bashrc': makeFile('.bashrc', BASHRC, ud),
      '.profile': makeFile('.profile', PROFILE, ud),
    }), sys);
  }

  // user files
  const ud: NodeDefaults = { owner: user, group: user === 'root' ? 'root' : user, now };
  for (const [rawPath, fspec] of Object.entries(spec.files ?? {})) {
    const path = expandTilde(rawPath, home);
    const name = splitPath(path).pop() ?? '';
    const isDirKey = rawPath.endsWith('/') || fspec === null || (typeof fspec === 'object' && fspec.dir);
    const s = typeof fspec === 'object' && fspec !== null ? fspec : {};
    const d: NodeDefaults = {
      owner: s.owner ?? ud.owner,
      group: s.group ?? s.owner ?? ud.group,
      now: parseTime(s.mtime, now),
    };
    // directories created on the way to a file belong to the user (inside home)
    const parentSegs = splitPath(path).slice(0, -1);
    ensureDir(root, parentSegs, path.startsWith(home) ? ud : sys);
    if (s.symlink !== undefined) {
      setNode(root, path, makeSymlink(name, s.symlink, d), d);
    } else if (isDirKey) {
      setNode(root, path, makeDir(name, d, parseMode(s.mode, 0o755)), d);
    } else {
      const content = typeof fspec === 'string' ? fspec : (s.content ?? '');
      const file = makeFile(name, content, d, parseMode(s.mode, 0o644));
      if (s.size !== undefined) file.fakeSize = s.size;
      setNode(root, path, file, d);
    }
  }

  const processes: ProcessInfo[] = spec.processes ?? [
    { pid: 1, user: 'root', command: '/sbin/init', cpu: 0, mem: 0.3, rss: 12_400, stat: 'Ss', start: '09:00' },
    { pid: 412, user: 'root', command: '/usr/sbin/cron -f', cpu: 0, mem: 0.1, rss: 2_800, stat: 'Ss', start: '09:00' },
    { pid: 538, user: 'root', command: 'sshd: /usr/sbin/sshd -D', cpu: 0, mem: 0.2, rss: 8_100, stat: 'Ss', start: '09:00' },
    { pid: 1200, user, command: '-bash', cpu: 0, mem: 0.1, rss: 5_200, stat: 'Ss', start: '09:01' },
  ];
  const disks: DiskInfo[] = spec.disks ?? [
    { filesystem: '/dev/sda1', size: 30_830_588, used: 9_412_208, mount: '/', type: 'ext4' },
    { filesystem: 'tmpfs', size: 1_015_404, used: 0, mount: '/dev/shm', type: 'tmpfs' },
    { filesystem: '/dev/sda15', size: 106_858, used: 6_186, mount: '/boot/efi', type: 'vfat' },
  ];

  const network: Network = {
    interfaces: spec.network?.interfaces ?? DEFAULT_NETWORK.interfaces,
    gateway: spec.network?.gateway ?? DEFAULT_NETWORK.gateway,
    dnsServer: spec.network?.dnsServer ?? DEFAULT_NETWORK.dnsServer,
    hosts: [
      ...(spec.network?.hosts ?? []),
      ...DEFAULT_NETWORK.hosts.filter((h) => !(spec.network?.hosts ?? []).some((x) => x.name === h.name)),
    ],
  };
  // services from the spec override the defaults (cron, ssh) with the same name
  const services: Service[] = [
    ...DEFAULT_SERVICES(hostname).filter((d) => !(spec.services ?? []).some((x) => x.name === d.name)),
    ...(spec.services ?? []),
  ];
  const system: SystemInfo = { ...DEFAULT_SYSTEM(user), ...(spec.system ?? {}) };
  if (spec.docker) {
    if (!services.some((x) => x.name === 'docker'))
      services.push({
        name: 'docker',
        description: 'Docker Application Container Engine',
        state: spec.docker.daemon ?? 'active',
        enabled: true,
        pid: 880,
        logs: [`Oct 31 09:00:02 ${hostname} systemd[1]: Starting docker.service - Docker Application Container Engine...`, `Oct 31 09:00:03 ${hostname} dockerd[880]: API listen on /run/docker.sock`, `Oct 31 09:00:03 ${hostname} systemd[1]: Started docker.service - Docker Application Container Engine.`],
      });
    return { hostname, fs: root, users, processes, disks, network, services, system, docker: buildDocker(spec.docker, now) };
  }

  return { hostname, fs: root, users, processes, disks, network, services, system };
}

export const DEFAULT_NETWORK: Network = {
  interfaces: [{ name: 'eth0', cidr: '10.0.2.15/24', mac: '52:54:00:12:34:56', up: true }],
  gateway: '10.0.2.2',
  dnsServer: '127.0.0.53',
  hosts: [
    {
      name: 'example.com',
      ip: '93.184.215.14',
      latency: 92,
      hops: ['_gateway 10.0.2.2', '100.64.0.1', 'ae-1.r20.frnkge13.de.bb.gin.ntt.net 129.250.6.112', '*', 'ae-2.r21.lsanca07.us.bb.gin.ntt.net 129.250.4.107'],
      ports: { '80': 'http', '443': 'https' },
      http: {
        '/': { status: 200, body: '<!doctype html>\n<html>\n<head><title>Example Domain</title></head>\n<body><h1>Example Domain</h1></body>\n</html>\n', headers: { 'Content-Type': 'text/html; charset=UTF-8', Server: 'ECS (dce/2694)' } },
      },
    },
    {
      name: 'google.com',
      ip: '142.250.74.14',
      latency: 12,
      aliases: ['www.google.com'],
      hops: ['_gateway 10.0.2.2', '100.64.0.1', '72.14.215.85', '142.251.65.93'],
      ports: { '80': 'http', '443': 'https' },
      http: { '/': { status: 200, body: '<!doctype html><html><head><title>Google</title></head><body>Search</body></html>\n', headers: { 'Content-Type': 'text/html; charset=ISO-8859-1', Server: 'gws' } } },
    },
    {
      name: 'github.com',
      ip: '140.82.121.4',
      latency: 31,
      hops: ['_gateway 10.0.2.2', '100.64.0.1', 'ae0.cr1.fra.github.net 140.82.112.1'],
      ports: { '22': 'ssh', '443': 'https', '80': 'http' },
      http: { '/': { status: 200, body: '<!DOCTYPE html><title>GitHub</title>\n', headers: { Server: 'github.com' } } },
    },
    { name: '1.1.1.1', ip: '1.1.1.1', latency: 9, ports: { '53': 'domain', '443': 'https' }, dns: false },
    { name: '8.8.8.8', ip: '8.8.8.8', latency: 14, ports: { '53': 'domain' }, dns: false },
  ],
};

export const DEFAULT_SERVICES = (host: string): Service[] => [
  {
    name: 'cron',
    description: 'Regular background program processing daemon',
    state: 'active',
    enabled: true,
    pid: 412,
    logs: [`Oct 31 09:00:01 ${host} systemd[1]: Started cron.service - Regular background program processing daemon.`],
  },
  {
    name: 'ssh',
    description: 'OpenBSD Secure Shell server',
    state: 'active',
    enabled: true,
    pid: 538,
    port: 22,
    logs: [
      `Oct 31 09:00:01 ${host} systemd[1]: Starting ssh.service - OpenBSD Secure Shell server...`,
      `Oct 31 09:00:01 ${host} sshd[538]: Server listening on 0.0.0.0 port 22.`,
      `Oct 31 09:00:01 ${host} systemd[1]: Started ssh.service - OpenBSD Secure Shell server.`,
    ],
  },
];

export const DEFAULT_SYSTEM = (user: string): SystemInfo => ({
  uptimeSec: 3 * 86400 + 2 * 3600 + 14 * 60,
  load: [0.15, 0.1, 0.05],
  cpus: 2,
  memTotal: 4_015_000,
  memUsed: 1_256_000,
  memCache: 948_000,
  swapTotal: 2_097_148,
  swapUsed: 0,
  logins: [{ user, tty: 'pts/0', from: '192.168.1.10', at: '2026-10-31 09:05' }],
});

export function createSession(machine: Machine, spec: Pick<MachineSpec, 'user' | 'cwd' | 'env'> = {}): Session {
  const user = spec.user ?? (machine.users.find((u) => u.uid === 1000)?.name ?? 'root');
  const info = machine.users.find((u) => u.name === user);
  const home = info?.home ?? '/';
  const cwd = expandTilde(spec.cwd ?? '~', home);
  return {
    machine,
    user,
    cwd,
    env: {
      HOME: home,
      USER: user,
      LOGNAME: user,
      PWD: cwd,
      SHELL: '/bin/bash',
      PATH: '/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin',
      LANG: 'en_US.UTF-8',
      TERM: 'xterm-256color',
      ...(spec.env ?? {}),
    },
    locals: { HOSTNAME: machine.hostname, HISTSIZE: '1000' },
    aliases: { grep: 'grep --color=auto', l: 'ls -CF', la: 'ls -A', ll: 'ls -alF', ls: 'ls --color=auto' },
    userStack: [],
    history: [],
    lastExitCode: 0,
  };
}

function buildDocker(spec: DockerSpec, now: number): DockerState {
  const st = emptyDocker();
  const want = new Set([...(spec.images ?? []), ...(spec.containers ?? []).map((c) => c.image)].map((r) => {
    const p = parseRef(r);
    return `${p.repo}:${p.tag}`;
  }));
  for (const ref of want) {
    const { repo, tag } = parseRef(ref);
    const cat = DOCKER_HUB.find((i) => i.repo === repo && i.tag === tag);
    if (cat) st.images.push({ ...cat, id: imageId(cat), created: now + cat.created });
  }
  (spec.containers ?? []).forEach((c, i) => {
    const { repo, tag } = parseRef(c.image);
    const img = st.images.find((x) => x.repo === repo && x.tag === tag);
    const created = now - (c.age ?? 120) * 60_000;
    const id = (imageId({ repo: c.name, tag: String(i) }) + imageId({ repo: repo, tag: c.name })).slice(0, 24);
    const container: DockerContainer = {
      id,
      name: c.name,
      image: `${repo}:${tag}`,
      command: c.command ?? img?.cmd ?? '',
      created,
      state: c.state ?? 'running',
      exitCode: c.exitCode ?? 0,
      startedAt: created + 1000,
      ...(c.state === 'exited' ? { finishedAt: created + 60_000 } : {}),
      ports: (c.ports ?? []).map((p) => {
        const [h, ct] = p.split(':');
        return { host: Number(h), container: Number(ct) };
      }),
      env: c.env ?? {},
      volumes: [],
      logs: [...(c.exitCode && img?.crashLogs ? img.crashLogs : (img?.startLogs ?? [])), ...(c.logs ?? [])],
      ...(c.restart ? { restart: c.restart } : {}),
    };
    st.containers.push(container);
  });
  st.volumes.push(...(spec.volumes ?? []));
  return st;
}
