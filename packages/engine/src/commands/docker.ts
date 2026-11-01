/**
 * A simulated Docker: images, containers, ports, logs, exec, build, volumes
 * and a small `docker compose`. State lives in `machine.docker`; the daemon is
 * the `docker` systemd service. Output mimics Docker 27 / BuildKit.
 */
import type { DockerContainer, DockerImage, DockerState, HttpResponse, Service } from '../types';
import { Ctx, type CommandDef } from '../shell/context';
import { normalize } from '../vfs/path';

export const DOCKER_VERSION = '27.3.1';

// ------------------------------------------------------------------ catalog

const NGINX_INDEX = `<!DOCTYPE html>
<html>
<head>
<title>Welcome to nginx!</title>
</head>
<body>
<h1>Welcome to nginx!</h1>
<p>If you see this page, the nginx web server is successfully installed and
working. Further configuration is required.</p>
</body>
</html>
`;

const NGINX_CONF = `user  nginx;
worker_processes  auto;

error_log  /var/log/nginx/error.log notice;
pid        /run/nginx.pid;

events {
    worker_connections  1024;
}

http {
    include       /etc/nginx/mime.types;
    default_type  application/octet-stream;
    sendfile        on;
    keepalive_timeout  65;
    include /etc/nginx/conf.d/*.conf;
}
`;

const OS_RELEASE: Record<string, string> = {
  alpine: 'NAME="Alpine Linux"\nID=alpine\nVERSION_ID=3.20.3\nPRETTY_NAME="Alpine Linux v3.20"\nHOME_URL="https://alpinelinux.org/"\n',
  ubuntu: 'PRETTY_NAME="Ubuntu 24.04.1 LTS"\nNAME="Ubuntu"\nVERSION_ID="24.04"\nVERSION="24.04.1 LTS (Noble Numbat)"\nID=ubuntu\nID_LIKE=debian\n',
  debian: 'PRETTY_NAME="Debian GNU/Linux 12 (bookworm)"\nNAME="Debian GNU/Linux"\nVERSION_ID="12"\nVERSION="12 (bookworm)"\nID=debian\n',
};

const HELLO = `
Hello from Docker!
This message shows that your installation appears to be working correctly.

To generate this message, Docker took the following steps:
 1. The Docker client contacted the Docker daemon.
 2. The Docker daemon pulled the "hello-world" image from the Docker Hub.
    (amd64)
 3. The Docker daemon created a new container from that image which runs the
    executable that produces the output you are currently reading.
 4. The Docker daemon streamed that output to the Docker client, which sent it
    to your terminal.

To try something more ambitious, you can run an Ubuntu container with:
 $ docker run -it ubuntu bash

For more examples and ideas, visit:
 https://docs.docker.com/get-started/
`;

const DAY = 86_400_000;

function nginxImage(tag: string, size: string, age: number): DockerImage {
  return {
    repo: 'nginx',
    tag,
    id: '',
    size,
    created: -age * DAY,
    cmd: 'nginx -g daemon off;',
    entrypoint: '/docker-entrypoint.sh',
    expose: [80],
    serveDir: '/usr/share/nginx/html',
    os: tag.includes('alpine') ? 'alpine' : 'debian',
    startLogs: [
      '/docker-entrypoint.sh: /docker-entrypoint.d/ is not empty, will attempt to perform configuration',
      '/docker-entrypoint.sh: Configuration complete; ready for start up',
      '2026/10/31 09:00:00 [notice] 1#1: nginx/1.27.2',
      '2026/10/31 09:00:00 [notice] 1#1: start worker processes',
    ],
    files: { '/usr/share/nginx/html/index.html': NGINX_INDEX, '/usr/share/nginx/html/50x.html': '<h1>An error occurred.</h1>\n', '/etc/nginx/nginx.conf': NGINX_CONF, '/etc/nginx/conf.d/default.conf': 'server {\n    listen       80;\n    server_name  localhost;\n    location / {\n        root   /usr/share/nginx/html;\n        index  index.html;\n    }\n}\n' },
    accessLog: true,
  };
}

/** The "Docker Hub": images that can be pulled. Created times are relative (negative ms before now). */
export const DOCKER_HUB: DockerImage[] = [
  { repo: 'hello-world', tag: 'latest', id: '', size: '13.3kB', created: -540 * DAY, cmd: '/hello', oneShot: HELLO, os: 'scratch' },
  nginxImage('latest', '192MB', 14),
  nginxImage('1.27', '192MB', 14),
  nginxImage('alpine', '47.9MB', 14),
  { repo: 'alpine', tag: 'latest', id: '', size: '7.8MB', created: -40 * DAY, cmd: '/bin/sh', os: 'alpine', shell: true },
  { repo: 'alpine', tag: '3.20', id: '', size: '7.8MB', created: -40 * DAY, cmd: '/bin/sh', os: 'alpine', shell: true },
  { repo: 'ubuntu', tag: 'latest', id: '', size: '78.1MB', created: -30 * DAY, cmd: '/bin/bash', os: 'ubuntu', shell: true },
  { repo: 'ubuntu', tag: '24.04', id: '', size: '78.1MB', created: -30 * DAY, cmd: '/bin/bash', os: 'ubuntu', shell: true },
  { repo: 'python', tag: '3.12-slim', id: '', size: '124MB', created: -9 * DAY, cmd: 'python3', os: 'debian', shell: true },
  { repo: 'node', tag: '22-alpine', id: '', size: '157MB', created: -12 * DAY, cmd: 'node', os: 'alpine', shell: true },
  {
    repo: 'redis',
    tag: '7',
    id: '',
    size: '117MB',
    created: -20 * DAY,
    cmd: 'redis-server',
    entrypoint: 'docker-entrypoint.sh',
    expose: [6379],
    os: 'debian',
    startLogs: ['1:C 31 Oct 2026 09:00:00.000 * oO0OoO0OoO0Oo Redis is starting oO0OoO0OoO0Oo', '1:M 31 Oct 2026 09:00:00.001 * Running mode=standalone, port=6379.', '1:M 31 Oct 2026 09:00:00.002 * Server initialized', '1:M 31 Oct 2026 09:00:00.002 * Ready to accept connections tcp'],
  },
  {
    repo: 'postgres',
    tag: '16',
    id: '',
    size: '435MB',
    created: -18 * DAY,
    cmd: 'postgres',
    entrypoint: 'docker-entrypoint.sh',
    expose: [5432],
    os: 'debian',
    requiredEnv: ['POSTGRES_PASSWORD'],
    crashLogs: [
      'Error: Database is uninitialized and superuser password is not specified.',
      '       You must specify POSTGRES_PASSWORD to a non-empty value for the',
      '       superuser. For example, "-e POSTGRES_PASSWORD=password" on "docker run".',
    ],
    startLogs: ['PostgreSQL init process complete; ready for start up.', '2026-10-31 09:00:01.000 UTC [1] LOG:  starting PostgreSQL 16.4 on x86_64-pc-linux-gnu', '2026-10-31 09:00:01.010 UTC [1] LOG:  listening on IPv4 address "0.0.0.0", port 5432', '2026-10-31 09:00:01.050 UTC [1] LOG:  database system is ready to accept connections'],
  },
];

// ------------------------------------------------------------------ helpers

function hash(s: string): string {
  // FNV-1a, twice, rendered as 12+ hex chars: stable ids across runs
  let h1 = 0x811c9dc5;
  let h2 = 0x1b873593;
  for (let i = 0; i < s.length; i++) {
    h1 = Math.imul(h1 ^ s.charCodeAt(i), 0x01000193) >>> 0;
    h2 = Math.imul(h2 ^ s.charCodeAt(i), 0x5bd1e995) >>> 0;
  }
  return (h1.toString(16).padStart(8, '0') + h2.toString(16).padStart(8, '0')).slice(0, 16);
}

/** The full 64-hex id docker prints for `run -d`, `inspect`, `prune`. */
function fullId(id: string): string {
  return (id + hash(id) + hash(id + '1') + hash(id + '2') + hash(id + '3')).slice(0, 64);
}

export function imageId(img: Pick<DockerImage, 'repo' | 'tag'>): string {
  return (hash(`${img.repo}:${img.tag}`) + hash(`${img.tag}@${img.repo}`)).slice(0, 12);
}

const ADJ = ['admiring', 'brave', 'clever', 'eager', 'festive', 'happy', 'jolly', 'keen', 'lucid', 'modest', 'nifty', 'quirky', 'serene', 'tender', 'vibrant', 'zealous'];
const SCI = ['turing', 'hopper', 'lovelace', 'torvalds', 'ritchie', 'thompson', 'curie', 'noether', 'babbage', 'knuth', 'hamilton', 'tesla', 'shannon', 'dijkstra', 'liskov', 'wozniak'];

function autoName(id: string): string {
  const n = parseInt(id.slice(0, 4), 16);
  return `${ADJ[n % ADJ.length]}_${SCI[Math.floor(n / ADJ.length) % SCI.length]}`;
}

export function parseRef(ref: string): { repo: string; tag: string } {
  const at = ref.lastIndexOf(':');
  const slash = ref.lastIndexOf('/');
  let repo = ref;
  let tag = 'latest';
  if (at > slash && at > 0) {
    repo = ref.slice(0, at);
    tag = ref.slice(at + 1);
  }
  repo = repo.replace(/^docker\.io\//, '').replace(/^library\//, '');
  return { repo, tag };
}

const refOf = (i: Pick<DockerImage, 'repo' | 'tag'>) => `${i.repo}:${i.tag}`;

function since(ms: number): string {
  const s = Math.max(0, Math.round(ms / 1000));
  if (s < 1) return 'Less than a second';
  if (s < 60) return `${s} second${s === 1 ? '' : 's'}`;
  const m = Math.round(s / 60);
  if (s < 3600) return m === 1 ? 'About a minute' : `${m} minutes`;
  const h = Math.round(s / 3600);
  if (s < DAY / 1000) return h === 1 ? 'About an hour' : `${h} hours`;
  const d = Math.round(s / 86400);
  if (d < 14) return `${d} day${d === 1 ? '' : 's'}`;
  if (d < 60) return `${Math.round(d / 7)} weeks`;
  if (d < 365) return `${Math.round(d / 30)} months`;
  return `${Math.round(d / 365)} year${Math.round(d / 365) === 1 ? '' : 's'}`;
}

const ago = (ms: number) => `${since(ms)} ago`;

function table(rows: string[][]): string {
  const w = rows[0]!.map((_, i) => Math.max(...rows.map((r) => (r[i] ?? '').length)));
  return rows.map((r) => r.map((c, i) => (i === r.length - 1 ? c : c.padEnd(w[i]! + 3))).join('').trimEnd()).join('\n') + '\n';
}

export function emptyDocker(): DockerState {
  return { images: [], containers: [], volumes: [], networks: ['bridge', 'host', 'none'] };
}

function state(ctx: Ctx): DockerState {
  return ctx.shell.docker() ?? emptyDocker();
}

function save(ctx: Ctx, s: DockerState) {
  ctx.shell.setDocker(s);
}

function catalogImage(ref: string): DockerImage | undefined {
  const { repo, tag } = parseRef(ref);
  return DOCKER_HUB.find((i) => i.repo === repo && i.tag === tag);
}

function findImage(s: DockerState, ref: string): DockerImage | undefined {
  const { repo, tag } = parseRef(ref);
  const low = ref.toLowerCase();
  return s.images.find((i) => (i.repo === repo && i.tag === tag) || (low.length >= 4 && (i.id || imageId(i)).startsWith(low)));
}

function findContainer(s: DockerState, key: string): DockerContainer | undefined {
  return s.containers.find((c) => c.name === key) ?? (key.length >= 2 ? s.containers.find((c) => c.id.startsWith(key)) : undefined);
}

function materialize(img: DockerImage, now: number): DockerImage {
  return { ...img, id: img.id || imageId(img), created: img.created < 0 ? now + img.created : img.created };
}

function pullLog(img: DockerImage): string {
  const layers = img.oneShot ? 1 : img.size.endsWith('MB') && parseFloat(img.size) > 100 ? 4 : 2;
  let out = `${img.tag}: Pulling from ${img.repo.includes('/') ? img.repo : 'library/' + img.repo}\n`;
  for (let i = 0; i < layers; i++) out += `${hash(img.repo + img.tag + i).slice(0, 12)}: Pull complete\n`;
  out += `Digest: sha256:${hash(img.repo).repeat(4)}\nStatus: Downloaded newer image for ${refOf(img)}\n`;
  return out;
}

/** Pull from the catalog into local images. Returns null (and prints the error) when the image does not exist. */
function pull(ctx: Ctx, s: DockerState, ref: string, quiet = false): { s: DockerState; img: DockerImage; log: string } | null {
  const local = findImage(s, ref);
  if (local) return { s, img: local, log: '' };
  const cat = catalogImage(ref);
  const { repo } = parseRef(ref);
  if (!cat) {
    ctx.err(`docker: Error response from daemon: pull access denied for ${repo}, repository does not exist or may require 'docker login': denied: requested access to the resource is denied\n`);
    return null;
  }
  const img = materialize(cat, ctx.now);
  return { s: { ...s, images: [...s.images, img] }, img, log: quiet ? '' : pullLog(img) };
}

/** Is the client allowed to talk to the daemon, and is the daemon running? */
function connect(ctx: Ctx): boolean {
  const svc = ctx.shell.services().find((x) => x.name === 'docker');
  const u = ctx.machine.users.find((x) => x.name === ctx.user);
  const allowed = ctx.cred.root || !!u?.groups.includes('docker');
  if (!allowed) {
    ctx.err(
      'permission denied while trying to connect to the Docker daemon socket at unix:///var/run/docker.sock: Get "http://%2Fvar%2Frun%2Fdocker.sock/v1.47/containers/json": dial unix /var/run/docker.sock: connect: permission denied\n',
    );
    return false;
  }
  if (!svc || svc.state !== 'active') {
    ctx.err('Cannot connect to the Docker daemon at unix:///var/run/docker.sock. Is the docker daemon running?\n');
    return false;
  }
  return true;
}

function portsText(c: DockerContainer, img?: DockerImage): string {
  if (c.state !== 'running') return '';
  const mapped = c.ports.map((p) => `0.0.0.0:${p.host}->${p.container}/tcp, [::]:${p.host}->${p.container}/tcp`);
  const exposed = (img?.expose ?? []).filter((e) => !c.ports.some((p) => p.container === e)).map((e) => `${e}/tcp`);
  return [...mapped, ...exposed].join(', ');
}

function statusText(c: DockerContainer, now: number): string {
  if (c.state === 'running') return `Up ${since(now - c.startedAt)}`;
  if (c.state === 'created') return 'Created';
  if (c.state === 'paused') return `Up ${since(now - c.startedAt)} (Paused)`;
  return `Exited (${c.exitCode}) ${ago(now - (c.finishedAt ?? c.startedAt))}`;
}

function shortCmd(cmd: string): string {
  const q = `"${cmd}"`;
  return q.length > 22 ? q.slice(0, 20) + '…"' : q;
}

/** A file inside a container: bind mounts first (live host files), then container changes, then the image. */
function containerFile(ctx: Ctx, s: DockerState, c: DockerContainer, path: string): string | null {
  for (const b of c.binds ?? []) {
    if (path === b.container || path.startsWith(b.container.replace(/\/$/, '') + '/')) {
      const hostPath = b.host + path.slice(b.container.length);
      try {
        return ctx.readFile(hostPath);
      } catch {
        return null;
      }
    }
  }
  if (c.files && path in c.files) return c.files[path]!;
  const img = findImage(s, c.image);
  if (img?.files && path in img.files) return img.files[path]!;
  if (path === '/etc/os-release') return OS_RELEASE[img?.os ?? 'debian'] ?? null;
  if (path === '/etc/hostname') return c.id.slice(0, 12) + '\n';
  return null;
}

function containerListing(ctx: Ctx, s: DockerState, c: DockerContainer, dir: string): string[] | null {
  const d = dir.replace(/\/$/, '') || '';
  const names = new Set<string>();
  const add = (p: string) => {
    if (p.startsWith(d + '/')) names.add(p.slice(d.length + 1).split('/')[0]!);
  };
  const img = findImage(s, c.image);
  for (const p of Object.keys(img?.files ?? {})) add(p);
  for (const p of Object.keys(c.files ?? {})) add(p);
  for (const b of c.binds ?? []) {
    if (d === b.container.replace(/\/$/, '')) {
      try {
        const r = ctx.stat(b.host);
        if (r.node.type === 'dir') for (const k of Object.keys(r.node.children)) names.add(k);
      } catch {
        /* missing bind source */
      }
    } else add(b.container);
  }
  if (d === '') for (const x of ['bin', 'dev', 'etc', 'home', 'lib', 'proc', 'root', 'run', 'sys', 'tmp', 'usr', 'var']) names.add(x);
  if (d === '/etc') names.add('os-release').add('hostname');
  return names.size ? [...names].sort() : null;
}

/** HTTP served by a running container on a host port (used by curl / nc / ss). */
export function containerHttp(ctx: Ctx, port: number, path: string): HttpResponse | null {
  const s = ctx.shell.docker();
  if (!s || ctx.shell.services().find((x) => x.name === 'docker')?.state !== 'active') return null;
  for (const c of s.containers) {
    if (c.state !== 'running') continue;
    const p = c.ports.find((x) => x.host === port);
    if (!p) continue;
    const img = findImage(s, c.image);
    if (img?.http?.[path]) return img.http[path]!;
    if (img?.serveDir && p.container === (img.expose?.[0] ?? 80)) {
      const file = path.endsWith('/') ? path + 'index.html' : path;
      const body = containerFile(ctx, s, c, img.serveDir + file);
      if (body !== null) return { status: 200, body, headers: { Server: 'nginx/1.27.2', 'Content-Type': file.endsWith('.css') ? 'text/css' : 'text/html' } };
      return { status: 404, body: '<html>\r\n<head><title>404 Not Found</title></head>\r\n<body>\r\n<center><h1>404 Not Found</h1></center>\r\n<hr><center>nginx/1.27.2</center>\r\n</body>\r\n</html>\r\n', headers: { Server: 'nginx/1.27.2' } };
    }
    // a non-HTTP service (redis, postgres): the TCP port is open but there is no HTTP answer
    return { status: 0 };
  }
  return null;
}

/** Ports published by running containers, as pseudo services for ss / nc. */
export function containerServices(ctx: Ctx): Service[] {
  const s = ctx.shell.docker();
  if (!s || ctx.shell.services().find((x) => x.name === 'docker')?.state !== 'active') return [];
  return s.containers
    .filter((c) => c.state === 'running')
    .flatMap((c) => c.ports.map((p) => ({ name: 'docker-proxy', description: `docker-proxy for ${c.name}`, state: 'active' as const, enabled: true, user: 'root', pid: 3000 + parseInt(c.id.slice(0, 3), 16), port: p.host, logs: [] })));
}

function appendAccessLog(s: DockerState, port: number, path: string, status: number, now: number): DockerState {
  return {
    ...s,
    containers: s.containers.map((c) => {
      if (c.state !== 'running' || !c.ports.some((p) => p.host === port)) return c;
      const img = findImage(s, c.image);
      if (!img?.accessLog) return c;
      const d = new Date(now);
      const mon = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][d.getUTCMonth()];
      const ts = `${String(d.getUTCDate()).padStart(2, '0')}/${mon}/${d.getUTCFullYear()}:${d.toISOString().slice(11, 19)} +0000`;
      return { ...c, logs: [...c.logs, `172.17.0.1 - - [${ts}] "GET ${path} HTTP/1.1" ${status} 615 "-" "curl/8.5.0" "-"`] };
    }),
  };
}

/** Called by curl after a request to a published port: nginx writes an access log line. */
export function logContainerRequest(ctx: Ctx, port: number, path: string, status: number) {
  const s = ctx.shell.docker();
  if (s) save(ctx, appendAccessLog(s, port, path, status, ctx.now));
}

// ------------------------------------------------------------------ run / exec

interface RunOpts {
  detach: boolean;
  name?: string;
  ports: { host: number; container: number }[];
  env: Record<string, string>;
  volumes: string[];
  binds: { host: string; container: string }[];
  rm: boolean;
  interactive: boolean;
  restart?: string;
  network?: string;
}

const RUN_VALUE = new Set(['--name', '-p', '--publish', '-e', '--env', '-v', '--volume', '--restart', '--network', '--net', '-w', '--workdir', '-u', '--user', '-h', '--hostname', '--memory', '-m', '--cpus', '--entrypoint', '-l', '--label', '--env-file']);

function parseRun(ctx: Ctx, args: string[]): { opts: RunOpts; image?: string; cmd: string[] } | null {
  const opts: RunOpts = { detach: false, ports: [], env: {}, volumes: [], binds: [], rm: false, interactive: false };
  let i = 0;
  for (; i < args.length; i++) {
    const a = args[i]!;
    if (!a.startsWith('-') || a === '-') break;
    let [flag, inline] = a.startsWith('--') && a.includes('=') ? [a.slice(0, a.indexOf('=')), a.slice(a.indexOf('=') + 1)] : [a, undefined as string | undefined];
    // -p8080:80, -eKEY=V
    if (!a.startsWith('--') && a.length > 2 && RUN_VALUE.has(a.slice(0, 2))) {
      flag = a.slice(0, 2);
      inline = a.slice(2);
    }
    if (RUN_VALUE.has(flag)) {
      const v = inline ?? args[++i];
      if (v === undefined) {
        ctx.err(`flag needs an argument: '${flag.replace(/^-+/, '')}' in ${flag}\nSee 'docker run --help'.\n`);
        return null;
      }
      switch (flag) {
        case '--name':
          opts.name = v;
          break;
        case '-p':
        case '--publish': {
          const m = /^(?:[\d.]+:)?(\d+):(\d+)(?:\/tcp)?$/.exec(v) ?? /^(\d+)$/.exec(v);
          if (!m) {
            ctx.err(`docker: invalid publish opts format (should be name=value but got '${v}')\n`);
            return null;
          }
          opts.ports.push(m[2] ? { host: Number(m[1]), container: Number(m[2]) } : { host: 32768 + opts.ports.length, container: Number(m[1]) });
          break;
        }
        case '-e':
        case '--env': {
          const eq = v.indexOf('=');
          if (eq > 0) opts.env[v.slice(0, eq)] = v.slice(eq + 1);
          break;
        }
        case '-v':
        case '--volume': {
          const [src, dst] = v.split(':');
          if (!src || !dst) {
            ctx.err(`docker: invalid spec: ${v}: empty section between colons.\n`);
            return null;
          }
          if (src.startsWith('/') || src.startsWith('.') || src.startsWith('~')) opts.binds.push({ host: ctx.abs(src.replace(/^~(?=\/|$)/, ctx.home)), container: dst });
          else opts.volumes.push(`${src}:${dst}`);
          break;
        }
        case '--restart':
          opts.restart = v;
          break;
        case '--network':
        case '--net':
          opts.network = v;
          break;
      }
      continue;
    }
    // combined short flags: -dit, -it, -d
    if (/^-[ditP]+$/.test(a)) {
      if (a.includes('d')) opts.detach = true;
      if (a.includes('i') || a.includes('t')) opts.interactive = true;
      continue;
    }
    if (a === '--detach') opts.detach = true;
    else if (a === '--rm') opts.rm = true;
    else if (a === '--interactive' || a === '--tty') opts.interactive = true;
    else {
      ctx.err(`unknown flag: ${a}\nSee 'docker run --help'.\n`);
      return null;
    }
  }
  return { opts, ...(args[i] ? { image: args[i] } : {}), cmd: args.slice(i + 1) };
}

/** Run a command "inside" a container: a handful of read-only tools. */
function execIn(ctx: Ctx, s: DockerState, c: DockerContainer, argv: string[]): { out: string; err: string; code: number } {
  const img = findImage(s, c.image);
  const [cmd, ...rest] = argv;
  const env: Record<string, string> = { PATH: '/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin', HOSTNAME: c.id.slice(0, 12), HOME: '/root', ...(img?.env ?? {}), ...c.env };
  const notFound = () => ({ out: '', err: `OCI runtime exec failed: exec failed: unable to start container process: exec: "${cmd}": executable file not found in $PATH: unknown\n`, code: 127 });
  switch (cmd) {
    case undefined:
      return { out: '', err: '"docker exec" requires at least 2 arguments.\n', code: 1 };
    case 'echo':
      return { out: rest.join(' ') + '\n', err: '', code: 0 };
    case 'hostname':
      return { out: c.id.slice(0, 12) + '\n', err: '', code: 0 };
    case 'whoami':
      return { out: 'root\n', err: '', code: 0 };
    case 'pwd':
      return { out: (img?.workdir ?? '/') + '\n', err: '', code: 0 };
    case 'env':
    case 'printenv':
      if (rest[0]) return env[rest[0]] !== undefined ? { out: env[rest[0]] + '\n', err: '', code: 0 } : { out: '', err: '', code: 1 };
      return { out: Object.entries(env).map(([k, v]) => `${k}=${v}`).join('\n') + '\n', err: '', code: 0 };
    case 'cat': {
      let out = '';
      let err = '';
      for (const f of rest) {
        const p = normalize(f, img?.workdir ?? '/');
        const t = containerFile(ctx, s, c, p);
        if (t === null) err += `cat: ${f}: No such file or directory\n`;
        else out += t;
      }
      return { out, err, code: err ? 1 : 0 };
    }
    case 'ls': {
      const target = normalize(rest.find((x) => !x.startsWith('-')) ?? img?.workdir ?? '/', img?.workdir ?? '/');
      const names = containerListing(ctx, s, c, target === '/' ? '' : target);
      if (!names) {
        if (containerFile(ctx, s, c, target) !== null) return { out: target + '\n', err: '', code: 0 };
        return { out: '', err: `ls: cannot access '${target}': No such file or directory\n`, code: 2 };
      }
      return { out: names.join('\n') + '\n', err: '', code: 0 };
    }
    case 'ps':
      return { out: `PID   USER     TIME  COMMAND\n    1 root      0:00 ${img?.cmd ?? c.command}\n   42 root      0:00 ${argv.join(' ')}\n`, err: '', code: 0 };
    case 'nginx':
      if (img?.repo !== 'nginx') return notFound();
      if (rest.includes('-t')) return { out: '', err: 'nginx: the configuration file /etc/nginx/nginx.conf syntax is ok\nnginx: configuration file /etc/nginx/nginx.conf test is successful\n', code: 0 };
      if (rest.join(' ') === '-s reload') return { out: '', err: '2026/10/31 09:00:00 [notice] 42#42: signal process started\n', code: 0 };
      return { out: '', err: 'nginx: [emerg] bind() to 0.0.0.0:80 failed (98: Address already in use)\n', code: 1 };
    case 'redis-cli':
      if (img?.repo !== 'redis') return notFound();
      return { out: rest[0]?.toUpperCase() === 'PING' || rest.length === 0 ? 'PONG\n' : 'OK\n', err: '', code: 0 };
    case 'psql':
      if (img?.repo !== 'postgres') return notFound();
      return { out: ' ?column? \n----------\n        1\n(1 row)\n\n', err: '', code: 0 };
    case 'sh':
    case 'bash':
    case 'ash':
      if (rest[0] === '-c' && rest[1]) return execIn(ctx, s, c, rest[1].split(/\s+/).filter(Boolean));
      if (cmd === 'bash' && img?.os === 'alpine') return notFound();
      return { out: '', err: '', code: -1 };
    case 'python3':
    case 'python':
      if (img?.repo !== 'python') return notFound();
      if (rest[0] === '--version' || rest[0] === '-V') return { out: 'Python 3.12.7\n', err: '', code: 0 };
      return { out: '', err: '', code: -1 };
    case 'node':
      if (img?.repo !== 'node') return notFound();
      if (rest[0] === '--version' || rest[0] === '-v') return { out: 'v22.11.0\n', err: '', code: 0 };
      return { out: '', err: '', code: -1 };
    case 'uname':
      return { out: rest.includes('-a') ? `Linux ${c.id.slice(0, 12)} 6.8.0-45-generic #45-Ubuntu SMP x86_64 GNU/Linux\n` : 'Linux\n', err: '', code: 0 };
    default:
      return notFound();
  }
}

const INTERACTIVE_NOTE = '[trainer] Interactive shells inside containers are not simulated. Run single commands instead, e.g. docker exec web ls /\n';

function doRun(ctx: Ctx, args: string[]): number {
  const parsed = parseRun(ctx, args);
  if (!parsed) return 125;
  const { opts, image, cmd } = parsed;
  if (!image) {
    ctx.err(`docker: 'docker run' requires at least 1 argument.\n\nUsage:  docker run [OPTIONS] IMAGE [COMMAND] [ARG...]\n\nSee 'docker run --help' for more information\n`);
    return 125;
  }
  let s = state(ctx);
  if (opts.name && s.containers.some((c) => c.name === opts.name)) {
    const other = s.containers.find((c) => c.name === opts.name)!;
    ctx.err(`docker: Error response from daemon: Conflict. The container name "/${opts.name}" is already in use by container "${fullId(other.id)}". You have to remove (or rename) that container to be able to reuse that name.\n\nRun 'docker run --help' for more information\n`);
    return 125;
  }
  if (!findImage(s, image)) ctx.err(`Unable to find image '${refOf(parseRef(image))}' locally\n`);
  const pulled = pull(ctx, s, image);
  if (!pulled) {
    ctx.err(`\nRun 'docker run --help' for more information\n`);
    return 125;
  }
  s = pulled.s;
  if (pulled.log) ctx.out(pulled.log);
  const img = pulled.img;
  // port already taken by a host service or another container?
  for (const p of opts.ports) {
    const busy = ctx.shell.services().some((x) => x.state === 'active' && x.port === p.host) || s.containers.some((c) => c.state === 'running' && c.ports.some((q) => q.host === p.host));
    if (busy) {
      const id = hash(`${opts.name ?? image}${ctx.now}${s.containers.length}`) + hash(String(ctx.now));
      const created: DockerContainer = { id, name: opts.name ?? autoName(id), image: refOf(img), command: cmd.join(' ') || img.cmd, created: ctx.now, state: 'created', exitCode: 128, startedAt: ctx.now, ports: opts.ports, env: opts.env, volumes: opts.volumes, logs: [] };
      if (!opts.rm) s = { ...s, containers: [...s.containers, created] };
      save(ctx, s);
      ctx.err(`docker: Error response from daemon: driver failed programming external connectivity on endpoint ${created.name} (${hash(created.id)}): Bind for 0.0.0.0:${p.host} failed: port is already allocated.\n`);
      return 125;
    }
  }
  for (const v of opts.volumes) {
    const name = v.split(':')[0]!;
    if (!s.volumes.includes(name)) s = { ...s, volumes: [...s.volumes, name] };
  }
  const id = hash(`${opts.name ?? image}${ctx.now}${s.containers.length}`) + hash(`${ctx.now}${image}`);
  const command = cmd.length ? cmd.join(' ') : img.cmd;
  const missingEnv = (img.requiredEnv ?? []).filter((k) => !opts.env[k]);
  const c: DockerContainer = {
    id,
    name: opts.name ?? autoName(id),
    image: refOf(img),
    command,
    created: ctx.now,
    state: 'running',
    exitCode: 0,
    startedAt: ctx.now,
    ports: opts.ports,
    env: opts.env,
    volumes: opts.volumes,
    ...(opts.binds.length ? { binds: opts.binds } : {}),
    logs: [],
    ...(opts.restart ? { restart: opts.restart } : {}),
    ...(opts.network ? { network: opts.network } : {}),
  };

  let output = '';
  let exitNow: number | null = null;
  if (img.oneShot && !cmd.length) {
    output = img.oneShot;
    exitNow = 0;
  } else if (missingEnv.length) {
    output = (img.crashLogs ?? [`error: ${missingEnv.join(', ')} is not set`]).join('\n') + '\n';
    exitNow = 1;
  } else if (cmd.length || img.shell) {
    // a command (or an interactive shell) — runs and exits
    const r = execIn(ctx, s, c, cmd.length ? cmd : [img.cmd.split(' ')[0]!]);
    if (r.code === -1) {
      output = opts.interactive ? INTERACTIVE_NOTE : '';
      exitNow = 0;
    } else {
      output = r.out + r.err;
      exitNow = r.code === 127 ? 127 : r.code;
      if (r.code === 127) {
        ctx.err(`docker: Error response from daemon: failed to create task for container: failed to create shim task: OCI runtime create failed: runc create failed: unable to start container process: exec: "${cmd[0]}": executable file not found in $PATH: unknown\n`);
        if (!opts.rm) s = { ...s, containers: [...s.containers, { ...c, state: 'created', exitCode: 127 }] };
        save(ctx, s);
        return 127;
      }
    }
  } else {
    output = (img.startLogs ?? []).join('\n') + (img.startLogs?.length ? '\n' : '');
  }

  if (exitNow !== null) {
    const done: DockerContainer = { ...c, state: 'exited', exitCode: exitNow, finishedAt: ctx.now, logs: output ? output.replace(/\n$/, '').split('\n') : [] };
    if (!opts.rm) s = { ...s, containers: [...s.containers, done] };
    save(ctx, s);
    if (opts.detach) ctx.out(fullId(id) + '\n');
    else ctx.out(output);
    return opts.detach ? 0 : exitNow;
  }

  const running: DockerContainer = { ...c, logs: output ? output.replace(/\n$/, '').split('\n') : [] };
  if (opts.detach) {
    s = { ...s, containers: [...s.containers, running] };
    save(ctx, s);
    ctx.out(fullId(id) + '\n');
    return 0;
  }
  // attached long-running server: show its log, then behave as if Ctrl+C was pressed
  ctx.out(output);
  ctx.err('^C[trainer] The container ran in the foreground and was stopped as if you pressed Ctrl+C. Add -d to run it in the background.\n');
  const stopped: DockerContainer = { ...running, state: 'exited', exitCode: 0, finishedAt: ctx.now };
  if (!opts.rm) s = { ...s, containers: [...s.containers, stopped] };
  save(ctx, s);
  return 0;
}

// ------------------------------------------------------------------ build

function doBuild(ctx: Ctx, args: string[]): number {
  let tag: string | undefined;
  let file: string | undefined;
  let dir: string | undefined;
  for (let i = 0; i < args.length; i++) {
    const a = args[i]!;
    if (a === '-t' || a === '--tag') tag = args[++i];
    else if (a.startsWith('--tag=')) tag = a.slice(6);
    else if (a === '-f' || a === '--file') file = args[++i];
    else if (a === '-q' || a === '--quiet' || a === '--no-cache') continue;
    else if (!a.startsWith('-')) dir = a;
  }
  if (!dir) {
    ctx.err(`ERROR: "docker buildx build" requires exactly 1 argument.\nSee 'docker buildx build --help'.\n\nUsage:  docker buildx build [OPTIONS] PATH | URL | -\n\nStart a build\n`);
    return 1;
  }
  const ctxDir = ctx.abs(dir);
  const dfPath = file ? ctx.abs(file) : `${ctxDir.replace(/\/$/, '')}/Dockerfile`;
  let df: string;
  try {
    df = ctx.readFile(dfPath);
  } catch {
    ctx.err(`[+] Building 0.0s (1/1) FINISHED\n => [internal] load build definition from Dockerfile\n => => transferring dockerfile: 2B\nERROR: failed to solve: failed to read dockerfile: open Dockerfile: no such file or directory\n`);
    return 1;
  }
  const lines = df
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith('#'));
  let s = state(ctx);
  const steps: string[] = [];
  let base: DockerImage | undefined;
  const files: Record<string, string> = {};
  let workdir = '/';
  let cmd: string | undefined;
  let entry: string | undefined;
  const expose: number[] = [];
  const env: Record<string, string> = {};
  const total = lines.filter((l) => /^(FROM|COPY|ADD|RUN|WORKDIR)\b/i.test(l)).length;
  let n = 0;
  const fail = (msg: string) => {
    ctx.out(`[+] Building 0.4s (${n}/${total + 2}) FINISHED\n => [internal] load build definition from Dockerfile\n${steps.join('')}`);
    ctx.err(`ERROR: failed to solve: ${msg}\n`);
    return 1;
  };
  const jsonOrShell = (v: string) => {
    try {
      const arr = JSON.parse(v) as unknown;
      if (Array.isArray(arr)) return arr.map(String).join(' ');
    } catch {
      /* shell form */
    }
    return v;
  };
  for (const line of lines) {
    const m = /^(\w+)\s+(.*)$/.exec(line);
    if (!m) return fail(`dockerfile parse error on line: unknown instruction: ${line}`);
    const ins = m[1]!.toUpperCase();
    const val = m[2]!.trim();
    switch (ins) {
      case 'FROM': {
        n++;
        const ref = val.split(/\s+/)[0]!;
        const p = pull(ctx, s, ref, true);
        if (!p) return fail(`docker.io/library/${parseRef(ref).repo}:${parseRef(ref).tag}: not found`);
        s = p.s;
        base = p.img;
        workdir = base.workdir ?? '/';
        steps.push(` => [${n}/${total}] FROM docker.io/library/${refOf(base)}\n`);
        break;
      }
      case 'WORKDIR':
        n++;
        workdir = normalize(val, workdir);
        steps.push(` => [${n}/${total}] WORKDIR ${workdir}\n`);
        break;
      case 'COPY':
      case 'ADD': {
        n++;
        const parts = (val.startsWith('[') ? (JSON.parse(val) as string[]) : val.split(/\s+/)).filter((x) => !x.startsWith('--'));
        const dest = parts.pop()!;
        for (const src of parts) {
          const hostPath = normalize(src, ctxDir);
          let node;
          try {
            node = ctx.stat(hostPath).node;
          } catch {
            return fail(`failed to compute cache key: failed to calculate checksum of ref ${hash(ctxDir)}::${hash(src)}: "/${src.replace(/^\.\//, '')}": not found`);
          }
          const destAbs = normalize(dest, workdir);
          if (node.type === 'file') {
            const intoDir = dest.endsWith('/') || dest === '.' || dest === './' || parts.length > 1;
            const target = intoDir ? `${destAbs.replace(/\/$/, '')}/${hostPath.split('/').pop()}` : destAbs;
            files[target] = node.content;
          } else if (node.type === 'dir') {
            const walk = (dirNode: typeof node, rel: string) => {
              if (dirNode.type !== 'dir') return;
              for (const [k, ch] of Object.entries(dirNode.children)) {
                if (ch.type === 'file') files[`${destAbs}${rel}/${k}`] = ch.content;
                else if (ch.type === 'dir') walk(ch, `${rel}/${k}`);
              }
            };
            walk(node, '');
          }
        }
        steps.push(` => [${n}/${total}] ${ins} ${val}\n`);
        break;
      }
      case 'RUN':
        n++;
        steps.push(` => [${n}/${total}] RUN ${val}\n`);
        break;
      case 'CMD':
        cmd = jsonOrShell(val);
        break;
      case 'ENTRYPOINT':
        entry = jsonOrShell(val);
        break;
      case 'EXPOSE':
        for (const p of val.split(/\s+/)) expose.push(parseInt(p, 10));
        break;
      case 'ENV': {
        const [k, ...v] = val.includes('=') ? val.split('=') : val.split(/\s+/);
        env[k!] = v.join(val.includes('=') ? '=' : ' ');
        break;
      }
      case 'LABEL':
      case 'USER':
      case 'ARG':
      case 'VOLUME':
        break;
      default:
        return fail(`dockerfile parse error on line ${lines.indexOf(line) + 1}: unknown instruction: ${m[1]}`);
    }
  }
  if (!base) return fail('no build stage in current context');
  const ref = parseRef(tag ?? '<none>');
  const created = ctx.now;
  const image: DockerImage = {
    ...base,
    repo: tag ? ref.repo : '<none>',
    tag: tag ? ref.tag : '<none>',
    id: hash(`${tag}${created}${JSON.stringify(files)}`).slice(0, 12),
    created,
    size: base.size,
    cmd: cmd ?? base.cmd,
    ...(entry ? { entrypoint: entry } : {}),
    workdir,
    expose: expose.length ? expose : (base.expose ?? []),
    env: { ...(base.env ?? {}), ...env },
    files: { ...(base.files ?? {}), ...files },
    base: refOf(base),
  };
  if (cmd) delete image.oneShot;
  // the tag moves to the new image; an old image with the same tag becomes <none>
  s = { ...s, images: [...s.images.map((i) => (tag && i.repo === image.repo && i.tag === image.tag ? { ...i, repo: '<none>', tag: '<none>' } : i)), image] };
  save(ctx, s);
  ctx.out(
    `[+] Building 1.8s (${total + 2}/${total + 2}) FINISHED                                     docker:default\n => [internal] load build definition from Dockerfile                        0.0s\n => [internal] load .dockerignore                                           0.0s\n${steps.map((x) => x.replace('\n', ''.padEnd(1) + '\n')).join('')} => exporting to image                                                      0.1s\n => => writing image sha256:${image.id}${hash(image.id).repeat(3).slice(0, 52)}\n${tag ? ` => => naming to docker.io/library/${refOf(image)}\n` : ''}`,
  );
  return 0;
}

// ------------------------------------------------------------------ compose

interface ComposeService {
  name: string;
  image?: string;
  build?: string;
  ports: string[];
  env: Record<string, string>;
  volumes: string[];
  restart?: string;
}

/** Just enough YAML for docker-compose files: nested maps and "- item" lists. */
export function parseCompose(src: string): ComposeService[] | string {
  const out: ComposeService[] = [];
  let inServices = false;
  let svc: ComposeService | null = null;
  let key: string | null = null;
  const unq = (s: string) => s.trim().replace(/^["']|["']$/g, '');
  for (const raw of src.split('\n')) {
    if (!raw.trim() || raw.trim().startsWith('#')) continue;
    const indent = raw.length - raw.trimStart().length;
    const line = raw.trim();
    if (indent === 0) {
      inServices = /^services:\s*$/.test(line);
      svc = null;
      continue;
    }
    if (!inServices) continue;
    if (indent <= 2 && /^[\w.-]+:\s*$/.test(line)) {
      svc = { name: line.slice(0, -1), ports: [], env: {}, volumes: [] };
      out.push(svc);
      key = null;
      continue;
    }
    if (!svc) return 'services must be a mapping';
    if (line.startsWith('- ')) {
      const v = unq(line.slice(2));
      if (key === 'ports') svc.ports.push(v);
      else if (key === 'volumes') svc.volumes.push(v);
      else if (key === 'environment') {
        const eq = v.indexOf('=');
        if (eq > 0) svc.env[v.slice(0, eq)] = v.slice(eq + 1);
      }
      continue;
    }
    const m = /^([\w.-]+):\s*(.*)$/.exec(line);
    if (!m) return `yaml: line could not be parsed: ${line}`;
    const [, k, v] = m;
    if (key === 'environment' && indent >= 6 && v) {
      svc.env[k!] = unq(v);
      continue;
    }
    key = k!;
    if (k === 'image') svc.image = unq(v!);
    else if (k === 'build') svc.build = unq(v!) || '.';
    else if (k === 'restart') svc.restart = unq(v!);
    else if (k === 'ports' && v?.startsWith('[')) svc.ports = v.slice(1, -1).split(',').map(unq).filter(Boolean);
  }
  if (!out.length) return 'no service selected';
  for (const s of out) if (!s.image && !s.build) return `service "${s.name}" has neither an image nor a build context specified: invalid compose project`;
  return out;
}

function doCompose(ctx: Ctx, args: string[]): number {
  const fIdx = args.findIndex((a) => a === '-f' || a === '--file');
  const file = fIdx >= 0 ? args[fIdx + 1] : undefined;
  const rest = fIdx >= 0 ? [...args.slice(0, fIdx), ...args.slice(fIdx + 2)] : args;
  const sub = rest.find((a) => !a.startsWith('-'));
  const subArgs = rest.slice(rest.indexOf(sub ?? '') + 1);
  if (!sub || sub === 'version') {
    ctx.out(sub ? 'Docker Compose version v2.29.7\n' : 'Usage:  docker compose [OPTIONS] COMMAND\n\nDefine and run multi-container applications with Docker\n\nCommands:\n  build       Build or rebuild services\n  down        Stop and remove containers, networks\n  logs        View output from containers\n  ps          List containers\n  restart     Restart service containers\n  stop        Stop services\n  up          Create and start containers\n');
    return sub ? 0 : 0;
  }
  const candidates = file ? [file] : ['compose.yaml', 'compose.yml', 'docker-compose.yml', 'docker-compose.yaml'];
  let src: string | null = null;
  for (const f of candidates) {
    try {
      src = ctx.readFile(f);
      break;
    } catch {
      /* try the next name */
    }
  }
  if (src === null) {
    ctx.err(`no configuration file provided: not found\n`);
    return 1;
  }
  const parsed = parseCompose(src);
  if (typeof parsed === 'string') {
    ctx.err(`${parsed}\n`);
    return 15;
  }
  const project = (ctx.cwd.split('/').pop() || 'default').toLowerCase().replace(/[^a-z0-9_-]/g, '');
  const cname = (svc: string) => `${project}-${svc}-1`;
  let s = state(ctx);
  const only = subArgs.filter((a) => !a.startsWith('-'));
  const services = only.length && sub !== 'up' ? parsed.filter((x) => only.includes(x.name)) : parsed;

  switch (sub) {
    case 'up': {
      if (!subArgs.includes('-d') && !subArgs.includes('--detach')) {
        ctx.err('[trainer] Without -d compose would stay attached to the logs. Use docker compose up -d.\n');
      }
      let out = '';
      let n = 0;
      const net = `${project}_default`;
      if (!s.networks.includes(net)) {
        s = { ...s, networks: [...s.networks, net] };
        out += ` ✔ Network ${net}  Created\n`;
        n++;
      }
      for (const svc of services) {
        const existing = s.containers.find((c) => c.name === cname(svc.name));
        if (existing?.state === 'running') {
          out += ` ✔ Container ${cname(svc.name)}  Running\n`;
          n++;
          continue;
        }
        if (existing) s = { ...s, containers: s.containers.filter((c) => c !== existing) };
        let ref = svc.image;
        if (svc.build) {
          const prev = s;
          save(ctx, s);
          const code = doBuild(ctx, ['-t', `${project}-${svc.name}`, svc.build]);
          if (code !== 0) return code;
          s = ctx.shell.docker() ?? prev;
          ref = `${project}-${svc.name}`;
        }
        save(ctx, s);
        const runArgs = ['-d', '--name', cname(svc.name), '--network', net];
        for (const p of svc.ports) runArgs.push('-p', p);
        for (const [k, v] of Object.entries(svc.env)) runArgs.push('-e', `${k}=${v}`);
        for (const v of svc.volumes) runArgs.push('-v', v);
        if (svc.restart) runArgs.push('--restart', svc.restart);
        runArgs.push(ref!);
        const sub2 = new Ctx2(ctx);
        const code = doRun(sub2.ctx, runArgs);
        s = ctx.shell.docker() ?? s;
        if (code !== 0) {
          ctx.forward(sub2.ctx.chunks().filter((c) => c.stream === 'stderr'));
          ctx.out(out);
          ctx.err(`Error response from daemon: failed to start ${cname(svc.name)}\n`);
          return 1;
        }
        out += ` ✔ Container ${cname(svc.name)}  Started\n`;
        n++;
      }
      save(ctx, s);
      ctx.out(`[+] Running ${n}/${n}\n${out}`);
      return 0;
    }
    case 'ps': {
      const rows = [['NAME', 'IMAGE', 'COMMAND', 'SERVICE', 'CREATED', 'STATUS', 'PORTS']];
      for (const svc of services) {
        const c = s.containers.find((x) => x.name === cname(svc.name));
        if (!c || (c.state !== 'running' && !subArgs.includes('-a'))) continue;
        rows.push([c.name, c.image.replace(/:latest$/, ''), shortCmd(c.command), svc.name, ago(ctx.now - c.created), statusText(c, ctx.now), portsText(c, findImage(s, c.image))]);
      }
      ctx.out(table(rows));
      return 0;
    }
    case 'down':
    case 'stop':
    case 'restart':
    case 'start': {
      let out = '';
      let n = 0;
      for (const svc of [...services].reverse()) {
        const c = s.containers.find((x) => x.name === cname(svc.name));
        if (!c) continue;
        n++;
        if (sub === 'down') {
          s = { ...s, containers: s.containers.filter((x) => x !== c) };
          out += ` ✔ Container ${c.name}  Removed\n`;
        } else if (sub === 'stop') {
          s = { ...s, containers: s.containers.map((x) => (x === c && x.state === 'running' ? { ...x, state: 'exited' as const, exitCode: 0, finishedAt: ctx.now } : x)) };
          out += ` ✔ Container ${c.name}  Stopped\n`;
        } else {
          s = { ...s, containers: s.containers.map((x) => (x === c ? { ...x, state: 'running' as const, exitCode: 0, startedAt: ctx.now } : x)) };
          out += ` ✔ Container ${c.name}  ${sub === 'restart' ? 'Started' : 'Started'}\n`;
        }
      }
      if (sub === 'down' && s.networks.includes(`${project}_default`)) {
        s = { ...s, networks: s.networks.filter((x) => x !== `${project}_default`) };
        out += ` ✔ Network ${project}_default  Removed\n`;
        n++;
      }
      save(ctx, s);
      ctx.out(`[+] Running ${n}/${n}\n${out}`);
      return 0;
    }
    case 'logs': {
      const w = Math.max(...services.map((x) => cname(x.name).length));
      for (const svc of services) {
        const c = s.containers.find((x) => x.name === cname(svc.name));
        if (!c) continue;
        for (const l of c.logs) ctx.out(`${cname(svc.name).padEnd(w)}  | ${l}\n`);
      }
      return 0;
    }
    case 'config':
      ctx.out(src);
      return 0;
    default:
      ctx.err(`unknown docker command: "compose ${sub}"\n`);
      return 1;
  }
}

/** A child context that shares the shell but buffers its own output. */
class Ctx2 {
  ctx: Ctx;
  constructor(parent: Ctx) {
    this.ctx = new Ctx('docker', [], null, parent.machine, parent.user, parent.cred, parent.home, parent.now, false, parent.columns, parent.shell);
  }
}

// ------------------------------------------------------------------ inspect

function inspectJson(ctx: Ctx, s: DockerState, c: DockerContainer) {
  const img = findImage(s, c.image);
  return {
    Id: fullId(c.id),
    Created: new Date(c.created).toISOString(),
    Path: (img?.entrypoint ?? c.command).split(' ')[0],
    State: { Status: c.state, Running: c.state === 'running', Paused: c.state === 'paused', ExitCode: c.exitCode, StartedAt: new Date(c.startedAt).toISOString(), FinishedAt: c.finishedAt ? new Date(c.finishedAt).toISOString() : '0001-01-01T00:00:00Z' },
    Image: `sha256:${img?.id ?? ''}`,
    Name: `/${c.name}`,
    RestartCount: 0,
    HostConfig: { RestartPolicy: { Name: c.restart ?? 'no' }, PortBindings: Object.fromEntries(c.ports.map((p) => [`${p.container}/tcp`, [{ HostIp: '', HostPort: String(p.host) }]])), Binds: (c.binds ?? []).map((b) => `${b.host}:${b.container}`) },
    Mounts: [...(c.binds ?? []).map((b) => ({ Type: 'bind', Source: b.host, Destination: b.container })), ...c.volumes.map((v) => ({ Type: 'volume', Name: v.split(':')[0], Destination: v.split(':')[1] }))],
    Config: { Hostname: c.id.slice(0, 12), Env: [...Object.entries(c.env).map(([k, v]) => `${k}=${v}`), 'PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin'], Cmd: c.command.split(' '), Image: c.image, WorkingDir: img?.workdir ?? '', ExposedPorts: Object.fromEntries((img?.expose ?? []).map((p) => [`${p}/tcp`, {}])) },
    NetworkSettings: { IPAddress: c.state === 'running' ? `172.17.0.${2 + s.containers.filter((x) => x.state === 'running').indexOf(c)}` : '', Ports: Object.fromEntries(c.ports.map((p) => [`${p.container}/tcp`, [{ HostIp: '0.0.0.0', HostPort: String(p.host) }]])), Networks: { [c.network ?? 'bridge']: {} } },
  };
}

function goTemplate(tpl: string, data: unknown): string {
  return tpl.replace(/\{\{\s*(json\s+)?\.([\w.]*)\s*\}\}/g, (_, json: string | undefined, path: string) => {
    let v: unknown = data;
    for (const k of path.split('.').filter(Boolean)) v = v && typeof v === 'object' ? (v as Record<string, unknown>)[k] : undefined;
    if (json) return JSON.stringify(v);
    if (v === undefined) return '<no value>';
    if (typeof v === 'object') return Array.isArray(v) ? `[${v.join(' ')}]` : `map[${Object.keys(v as object).join(' ')}]`;
    return String(v);
  });
}

// ------------------------------------------------------------------ command

const USAGE = `
Usage:  docker [OPTIONS] COMMAND

A self-sufficient runtime for containers

Common Commands:
  run         Create and run a new container from an image
  exec        Execute a command in a running container
  ps          List containers
  build       Build an image from a Dockerfile
  pull        Download an image from a registry
  images      List images
  version     Show the Docker version information
  info        Display system-wide information

Management Commands:
  compose     Docker Compose
  container   Manage containers
  image       Manage images
  network     Manage networks
  volume      Manage volumes

Commands:
  inspect     Return low-level information on Docker objects
  logs        Fetch the logs of a container
  restart     Restart one or more containers
  rm          Remove one or more containers
  rmi         Remove one or more images
  start       Start one or more stopped containers
  stats       Display a live stream of container(s) resource usage statistics
  stop        Stop one or more running containers
  tag         Create a tag TARGET_IMAGE that references SOURCE_IMAGE

Run 'docker COMMAND --help' for more information on a command.
`;

export const docker: CommandDef = {
  name: 'docker',
  category: 'system',
  doc: {
    summary: 'run and manage containers',
    usage: ['docker [OPTIONS] COMMAND [ARG...]'],
    description:
      'Docker packs an application with everything it needs into an image and runs it as an isolated container. Containers share the host kernel, start in a second and are thrown away just as fast.',
    options: [
      ['run IMAGE', 'create and start a container (-d background, -p HOST:CONTAINER publish a port, --name NAME, -e KEY=VALUE, -v SRC:DST, --rm)'],
      ['ps', 'list running containers (-a: all, -q: only IDs)'],
      ['images', 'list local images'],
      ['pull IMAGE', 'download an image from Docker Hub'],
      ['logs CONTAINER', 'show the output of a container (--tail N, -f)'],
      ['exec CONTAINER CMD', 'run a command inside a running container'],
      ['stop|start|restart CONTAINER', 'stop, start or restart a container'],
      ['rm CONTAINER', 'remove a stopped container (-f: also a running one)'],
      ['rmi IMAGE', 'remove an image'],
      ['build -t NAME DIR', 'build an image from DIR/Dockerfile'],
      ['inspect CONTAINER', 'low-level details as JSON (-f/--format for one field)'],
      ['compose up -d', 'start every service from compose.yaml'],
      ['compose down', 'stop and remove the services of compose.yaml'],
      ['volume ls|create|rm', 'manage named volumes'],
      ['network ls|create', 'list or create networks'],
      ['-d, --detach', 'run the container in the background and print its ID'],
      ['-p, --publish HOST:CONTAINER', 'publish a container port on the host, e.g. 8080:80'],
      ['--name NAME', 'give the container a name'],
      ['-e, --env KEY=VALUE', 'set an environment variable inside the container'],
      ['-v, --volume SRC:DST', 'mount a host directory or a named volume into the container'],
      ['--rm', 'remove the container automatically when it stops'],
      ['--restart POLICY', 'restart policy: no, always, unless-stopped, on-failure'],
      ['-i, -t, -it', 'interactive mode with a terminal (for shells)'],
      ['-a, --all', 'ps: show stopped containers too'],
      ['-q, --quiet', 'print only IDs'],
      ['-f, --force', 'force: remove even a running container or a used image'],
      ['--tail N', 'logs: show only the last N lines'],
      ['-t, --tag NAME', 'build: name (and tag) of the new image, e.g. myapp:1.0'],
      ['--format, -f TEMPLATE', 'print only the fields of a template, e.g. {{.State.Status}}'],
    ],
    examples: [
      ['docker run hello-world', 'check that Docker works'],
      ['docker run -d --name web -p 8080:80 nginx', 'a web server on http://localhost:8080'],
      ['docker ps -a', 'all containers, including stopped'],
      ['docker logs --tail 20 web', 'last 20 log lines'],
      ['docker exec web cat /etc/nginx/nginx.conf', 'look inside a container'],
      ['docker build -t myapp .', 'build an image from ./Dockerfile'],
    ],
    seeAlso: ['systemctl', 'curl', 'ss'],
  },
  run(ctx) {
    const args = [...ctx.args];
    if (args[0] === '--version' || args[0] === '-v') {
      ctx.out(`Docker version ${DOCKER_VERSION}, build ce12230\n`);
      return 0;
    }
    if (!args.length || args[0] === 'help' || args[0] === '--help') {
      ctx.out(USAGE);
      return 0;
    }
    if (!ctx.shell.docker()) {
      ctx.err(`Command 'docker' not found, but can be installed with:\n\nsudo apt install docker.io\n`);
      return 127;
    }
    // "management" aliases: docker container ls / image ls / image rm …
    let [sub, ...rest] = args;
    if (sub === 'container' || sub === 'image') {
      const m = rest[0];
      const map: Record<string, string> = sub === 'container' ? { ls: 'ps', list: 'ps', rm: 'rm', start: 'start', stop: 'stop', restart: 'restart', logs: 'logs', inspect: 'inspect', exec: 'exec', run: 'run', prune: 'container-prune' } : { ls: 'images', list: 'images', rm: 'rmi', pull: 'pull', build: 'build', inspect: 'image-inspect', prune: 'image-prune', tag: 'tag' };
      if (!m || !map[m]) {
        ctx.err(`docker: '${sub} ${m ?? ''}' is not a docker command.\nSee 'docker --help'\n`);
        return 1;
      }
      sub = map[m]!;
      rest = rest.slice(1);
    }
    if (sub === 'version') {
      ctx.out(`Client: Docker Engine - Community\n Version:           ${DOCKER_VERSION}\n API version:       1.47\n OS/Arch:           linux/amd64\n\n`);
      if (!connect(ctx)) return 1;
      ctx.out(`Server: Docker Engine - Community\n Engine:\n  Version:          ${DOCKER_VERSION}\n  API version:      1.47 (minimum version 1.24)\n  OS/Arch:          linux/amd64\n containerd:\n  Version:          1.7.22\n`);
      return 0;
    }
    if (!connect(ctx)) return 1;
    let s = state(ctx);
    const containerArg = (verb: string) => {
      const names = rest.filter((a) => !a.startsWith('-'));
      if (!names.length) {
        ctx.err(`"docker ${verb}" requires at least 1 argument.\nSee 'docker ${verb} --help'.\n\nUsage:  docker ${verb} [OPTIONS] CONTAINER [CONTAINER...]\n`);
        return null;
      }
      return names;
    };
    switch (sub) {
      case 'info': {
        const running = s.containers.filter((c) => c.state === 'running').length;
        ctx.out(
          `Client: Docker Engine - Community\n Version:    ${DOCKER_VERSION}\n Context:    default\n\nServer:\n Containers: ${s.containers.length}\n  Running: ${running}\n  Paused: ${s.containers.filter((c) => c.state === 'paused').length}\n  Stopped: ${s.containers.length - running}\n Images: ${s.images.length}\n Server Version: ${DOCKER_VERSION}\n Storage Driver: overlay2\n Cgroup Driver: systemd\n Kernel Version: 6.8.0-45-generic\n Operating System: Ubuntu 24.04.1 LTS\n CPUs: ${ctx.machine.system?.cpus ?? 2}\n Docker Root Dir: /var/lib/docker\n`,
        );
        return 0;
      }
      case 'ps': {
        const all = rest.includes('-a') || rest.includes('--all') || rest.some((a) => /^-\w*a/.test(a) && !a.startsWith('--'));
        const quiet = rest.includes('-q') || rest.includes('--quiet') || rest.some((a) => /^-\w*q/.test(a) && !a.startsWith('--'));
        const list = s.containers.filter((c) => all || c.state === 'running').reverse();
        if (quiet) {
          ctx.out(list.map((c) => c.id.slice(0, 12) + '\n').join(''));
          return 0;
        }
        const rows = [['CONTAINER ID', 'IMAGE', 'COMMAND', 'CREATED', 'STATUS', 'PORTS', 'NAMES']];
        for (const c of list) rows.push([c.id.slice(0, 12), c.image.replace(/:latest$/, ''), shortCmd(c.command), ago(ctx.now - c.created), statusText(c, ctx.now), portsText(c, findImage(s, c.image)), c.name]);
        ctx.out(table(rows));
        return 0;
      }
      case 'images': {
        const quiet = rest.includes('-q');
        const filter = rest.find((a) => !a.startsWith('-'));
        const list = [...s.images].reverse().filter((i) => !filter || i.repo === parseRef(filter).repo);
        if (quiet) {
          ctx.out(list.map((i) => (i.id || imageId(i)) + '\n').join(''));
          return 0;
        }
        const rows = [['REPOSITORY', 'TAG', 'IMAGE ID', 'CREATED', 'SIZE']];
        for (const i of list) rows.push([i.repo, i.tag, i.id || imageId(i), ago(ctx.now - i.created), i.size]);
        ctx.out(table(rows));
        return 0;
      }
      case 'pull': {
        const ref = rest.find((a) => !a.startsWith('-'));
        if (!ref) {
          ctx.err(`"docker pull" requires exactly 1 argument.\nSee 'docker pull --help'.\n\nUsage:  docker pull [OPTIONS] NAME[:TAG|@DIGEST]\n`);
          return 1;
        }
        const existing = findImage(s, ref);
        if (existing) {
          ctx.out(`${existing.tag}: Pulling from library/${existing.repo}\nDigest: sha256:${hash(existing.repo).repeat(4)}\nStatus: Image is up to date for ${refOf(existing)}\ndocker.io/library/${refOf(existing)}\n`);
          return 0;
        }
        const p = pull(ctx, s, ref);
        if (!p) return 1;
        save(ctx, p.s);
        ctx.out(`Using default tag: latest\n`.repeat(ref.includes(':') ? 0 : 1) + p.log + `docker.io/library/${refOf(p.img)}\n`);
        return 0;
      }
      case 'run':
        return doRun(ctx, rest);
      case 'create': {
        const code = doRun(ctx, ['-d', ...rest]);
        const st = ctx.shell.docker();
        if (code === 0 && st) {
          const last = st.containers[st.containers.length - 1]!;
          save(ctx, { ...st, containers: st.containers.map((c) => (c === last ? { ...c, state: 'created' as const } : c)) });
        }
        return code;
      }
      case 'logs': {
        const name = rest.filter((a, i) => !a.startsWith('-') && !['--tail', '-n'].includes(rest[i - 1] ?? ''))[0];
        if (!name) {
          ctx.err(`"docker logs" requires exactly 1 argument.\nSee 'docker logs --help'.\n\nUsage:  docker logs [OPTIONS] CONTAINER\n`);
          return 1;
        }
        const c = findContainer(s, name);
        if (!c) {
          ctx.err(`Error response from daemon: No such container: ${name}\n`);
          return 1;
        }
        const ti = rest.findIndex((a) => a === '--tail' || a === '-n');
        const tailArg = ti >= 0 ? rest[ti + 1] : rest.find((a) => a.startsWith('--tail='))?.slice(7);
        const n = tailArg && tailArg !== 'all' ? parseInt(tailArg, 10) : Infinity;
        const lines = Number.isFinite(n) ? c.logs.slice(Math.max(0, c.logs.length - n)) : c.logs;
        const ts = rest.includes('-t') || rest.includes('--timestamps');
        ctx.out(lines.map((l) => (ts ? `${new Date(c.startedAt).toISOString()} ` : '') + l + '\n').join(''));
        if (rest.includes('-f') || rest.includes('--follow')) ctx.err('[trainer] -f would keep following new lines; in the trainer it shows what is there now.\n');
        return 0;
      }
      case 'stop':
      case 'start':
      case 'restart':
      case 'kill':
      case 'pause':
      case 'unpause': {
        const names = containerArg(sub);
        if (!names) return 1;
        let code = 0;
        for (const n of names) {
          const c = findContainer(s, n);
          if (!c) {
            ctx.err(`Error response from daemon: No such container: ${n}\n`);
            code = 1;
            continue;
          }
          if ((sub === 'start' || sub === 'restart') && c.state !== 'running') {
            const img = findImage(s, c.image);
            const missing = (img?.requiredEnv ?? []).filter((k) => !c.env[k]);
            const busy = c.ports.find((p) => ctx.shell.services().some((x) => x.state === 'active' && x.port === p.host) || s.containers.some((o) => o !== c && o.state === 'running' && o.ports.some((q) => q.host === p.host)));
            if (busy) {
              ctx.err(`Error response from daemon: driver failed programming external connectivity on endpoint ${c.name}: Bind for 0.0.0.0:${busy.host} failed: port is already allocated\nError: failed to start containers: ${n}\n`);
              code = 1;
              continue;
            }
            if (missing.length || (img?.oneShot && c.command === img.cmd) || img?.shell) {
              s = { ...s, containers: s.containers.map((x) => (x === c ? { ...x, state: 'exited' as const, exitCode: missing.length ? 1 : 0, startedAt: ctx.now, finishedAt: ctx.now, logs: [...x.logs, ...(missing.length ? (img?.crashLogs ?? []) : [])] } : x)) };
              ctx.out(n + '\n');
              continue;
            }
          }
          if (sub === 'stop' || sub === 'kill') {
            if (c.state === 'running' || c.state === 'paused') s = { ...s, containers: s.containers.map((x) => (x === c ? { ...x, state: 'exited' as const, exitCode: sub === 'kill' ? 137 : 0, finishedAt: ctx.now } : x)) };
            if (c.state !== 'running' && sub === 'kill') {
              ctx.err(`Error response from daemon: cannot kill container: ${n}: container ${c.id} is not running\n`);
              code = 1;
              continue;
            }
          } else if (sub === 'pause' || sub === 'unpause') {
            if (c.state !== (sub === 'pause' ? 'running' : 'paused')) {
              ctx.err(`Error response from daemon: container ${c.id} is not ${sub === 'pause' ? 'running' : 'paused'}\n`);
              code = 1;
              continue;
            }
            s = { ...s, containers: s.containers.map((x) => (x === c ? { ...x, state: sub === 'pause' ? ('paused' as const) : ('running' as const) } : x)) };
          } else {
            const img = findImage(s, c.image);
            const relog = c.state !== 'running' || sub === 'restart' ? (img?.startLogs ?? []) : [];
            s = { ...s, containers: s.containers.map((x) => (x === c ? { ...x, state: 'running' as const, exitCode: 0, startedAt: c.state === 'running' && sub === 'start' ? x.startedAt : ctx.now, logs: [...x.logs, ...relog] } : x)) };
          }
          ctx.out(n + '\n');
        }
        save(ctx, s);
        return code;
      }
      case 'rm': {
        const force = rest.some((a) => a === '-f' || a === '--force' || /^-\w*f/.test(a));
        const names = containerArg('rm');
        if (!names) return 1;
        let code = 0;
        for (const n of names) {
          const c = findContainer(s, n);
          if (!c) {
            ctx.err(`Error response from daemon: No such container: ${n}\n`);
            code = 1;
            continue;
          }
          if ((c.state === 'running' || c.state === 'paused') && !force) {
            ctx.err(`Error response from daemon: cannot remove container "/${c.name}": container is running: stop the container before removing or force remove\n`);
            code = 1;
            continue;
          }
          s = { ...s, containers: s.containers.filter((x) => x !== c) };
          ctx.out(n + '\n');
        }
        save(ctx, s);
        return code;
      }
      case 'rmi': {
        const force = rest.includes('-f') || rest.includes('--force');
        const refs = rest.filter((a) => !a.startsWith('-'));
        if (!refs.length) {
          ctx.err(`"docker rmi" requires at least 1 argument.\nSee 'docker rmi --help'.\n\nUsage:  docker rmi [OPTIONS] IMAGE [IMAGE...]\n`);
          return 1;
        }
        let code = 0;
        for (const r of refs) {
          const img = findImage(s, r);
          if (!img) {
            ctx.err(`Error response from daemon: No such image: ${refOf(parseRef(r))}\n`);
            code = 1;
            continue;
          }
          const user = s.containers.find((c) => c.image === refOf(img));
          if (user && !force) {
            ctx.err(`Error response from daemon: conflict: unable to remove repository reference "${r}" (must force) - container ${user.id.slice(0, 12)} is using its referenced image ${img.id || imageId(img)}\n`);
            code = 1;
            continue;
          }
          s = { ...s, images: s.images.filter((x) => x !== img) };
          ctx.out(`Untagged: ${refOf(img)}\nDeleted: sha256:${img.id || imageId(img)}${hash(img.repo).repeat(4).slice(0, 52)}\n`);
        }
        save(ctx, s);
        return code;
      }
      case 'exec': {
        let i = 0;
        let interactive = false;
        for (; i < rest.length && rest[i]!.startsWith('-'); i++) {
          if (/^-[it]+$/.test(rest[i]!) || rest[i] === '--interactive' || rest[i] === '--tty') interactive = true;
          if (rest[i] === '-u' || rest[i] === '-w' || rest[i] === '-e') i++;
        }
        const name = rest[i];
        const argv = rest.slice(i + 1);
        if (!name || !argv.length) {
          ctx.err(`"docker exec" requires at least 2 arguments.\nSee 'docker exec --help'.\n\nUsage:  docker exec [OPTIONS] CONTAINER COMMAND [ARG...]\n`);
          return 1;
        }
        const c = findContainer(s, name);
        if (!c) {
          ctx.err(`Error response from daemon: No such container: ${name}\n`);
          return 1;
        }
        if (c.state !== 'running') {
          ctx.err(`Error response from daemon: container ${fullId(c.id)} is not running\n`);
          return 1;
        }
        const r = execIn(ctx, s, c, argv);
        if (r.code === -1) {
          ctx.out(interactive ? INTERACTIVE_NOTE : '');
          return 0;
        }
        ctx.out(r.out);
        ctx.err(r.err);
        return r.code === 127 ? 126 + 1 : r.code;
      }
      case 'image-inspect':
      case 'inspect': {
        let fmt: string | undefined;
        const names: string[] = [];
        for (let i = 0; i < rest.length; i++) {
          const a = rest[i]!;
          if (a === '-f' || a === '--format') fmt = rest[++i];
          else if (a.startsWith('--format=')) fmt = a.slice(9);
          else if (!a.startsWith('-')) names.push(a);
        }
        if (!names.length) {
          ctx.err(`"docker inspect" requires at least 1 argument.\nSee 'docker inspect --help'.\n\nUsage:  docker inspect [OPTIONS] NAME|ID [NAME|ID...]\n`);
          return 1;
        }
        const objs: unknown[] = [];
        for (const n of names) {
          const c = findContainer(s, n);
          if (c) {
            objs.push(inspectJson(ctx, s, c));
            continue;
          }
          const img = findImage(s, n);
          if (img) {
            objs.push({ Id: `sha256:${img.id || imageId(img)}`, RepoTags: [refOf(img)], Created: new Date(img.created).toISOString(), Config: { Cmd: img.cmd.split(' '), Entrypoint: img.entrypoint ? [img.entrypoint] : null, WorkingDir: img.workdir ?? '', ExposedPorts: Object.fromEntries((img.expose ?? []).map((p) => [`${p}/tcp`, {}])), Env: Object.entries(img.env ?? {}).map(([k, v]) => `${k}=${v}`) }, Os: 'linux', Architecture: 'amd64', Size: img.size });
            continue;
          }
          ctx.out('[]\n');
          ctx.err(`Error: No such object: ${n}\n`);
          return 1;
        }
        if (fmt) ctx.out(objs.map((o) => goTemplate(fmt!, o) + '\n').join(''));
        else ctx.out(JSON.stringify(objs, null, 4) + '\n');
        return 0;
      }
      case 'stats': {
        const rows = [['CONTAINER ID', 'NAME', 'CPU %', 'MEM USAGE / LIMIT', 'MEM %', 'NET I/O', 'BLOCK I/O', 'PIDS']];
        for (const c of s.containers.filter((x) => x.state === 'running')) {
          const k = parseInt(c.id.slice(0, 4), 16);
          const mem = 3 + (k % 60);
          rows.push([c.id.slice(0, 12), c.name, `${((k % 300) / 100).toFixed(2)}%`, `${mem.toFixed(1)}MiB / 3.82GiB`, `${((mem / 3911) * 100).toFixed(2)}%`, `${(k % 9) + 1}.2kB / 0B`, '0B / 4.1kB', String((k % 4) + 1)]);
        }
        ctx.out(table(rows));
        if (!rest.includes('--no-stream')) ctx.err('[trainer] Showing one snapshot (as with --no-stream).\n');
        return 0;
      }
      case 'tag': {
        const [src, dst] = rest.filter((a) => !a.startsWith('-'));
        const img = src ? findImage(s, src) : undefined;
        if (!src || !dst) {
          ctx.err(`"docker tag" requires exactly 2 arguments.\nSee 'docker tag --help'.\n\nUsage:  docker tag SOURCE_IMAGE[:TAG] TARGET_IMAGE[:TAG]\n`);
          return 1;
        }
        if (!img) {
          ctx.err(`Error response from daemon: No such image: ${src}\n`);
          return 1;
        }
        const r = parseRef(dst);
        s = { ...s, images: [...s.images.filter((x) => !(x.repo === r.repo && x.tag === r.tag)), { ...img, repo: r.repo, tag: r.tag }] };
        save(ctx, s);
        return 0;
      }
      case 'build':
        return doBuild(ctx, rest);
      case 'compose':
        return doCompose(ctx, rest);
      case 'container-prune':
      case 'image-prune': {
        if (sub === 'container-prune') {
          const gone = s.containers.filter((c) => c.state !== 'running' && c.state !== 'paused');
          s = { ...s, containers: s.containers.filter((c) => !gone.includes(c)) };
          ctx.out(`Deleted Containers:\n${gone.map((c) => fullId(c.id) + '\n').join('')}\nTotal reclaimed space: ${gone.length ? '1.09kB' : '0B'}\n`);
        } else {
          const used = new Set(s.containers.map((c) => c.image));
          const gone = s.images.filter((i) => i.repo === '<none>' || (rest.includes('-a') && !used.has(refOf(i))));
          s = { ...s, images: s.images.filter((i) => !gone.includes(i)) };
          ctx.out(`${gone.map((i) => `deleted: sha256:${i.id}\n`).join('')}Total reclaimed space: ${gone.length ? gone[0]!.size : '0B'}\n`);
        }
        save(ctx, s);
        return 0;
      }
      case 'system': {
        if (rest[0] === 'df') {
          const rows = [['TYPE', 'TOTAL', 'ACTIVE', 'SIZE', 'RECLAIMABLE'], ['Images', String(s.images.length), String(new Set(s.containers.map((c) => c.image)).size), s.images.length ? '512.3MB' : '0B', '0B (0%)'], ['Containers', String(s.containers.length), String(s.containers.filter((c) => c.state === 'running').length), '1.09kB', '0B (0%)'], ['Local Volumes', String(s.volumes.length), '0', '0B', '0B'], ['Build Cache', '0', '0', '0B', '0B']];
          ctx.out(table(rows));
          return 0;
        }
        if (rest[0] === 'prune') {
          const gone = s.containers.filter((c) => c.state !== 'running' && c.state !== 'paused');
          s = { ...s, containers: s.containers.filter((c) => !gone.includes(c)), images: s.images.filter((i) => i.repo !== '<none>') };
          save(ctx, s);
          ctx.out(`Deleted Containers:\n${gone.map((c) => c.id + '\n').join('')}\nTotal reclaimed space: 0B\n`);
          return 0;
        }
        ctx.err(`docker: 'system ${rest[0] ?? ''}' is not a docker command.\n`);
        return 1;
      }
      case 'volume': {
        const [op, name] = rest;
        if (op === 'ls' || op === 'list') {
          ctx.out(table([['DRIVER', 'VOLUME NAME'], ...s.volumes.map((v) => ['local', v])]));
          return 0;
        }
        if (op === 'create') {
          const v = name ?? hash(String(ctx.now)) + hash('v' + ctx.now);
          if (!s.volumes.includes(v)) s = { ...s, volumes: [...s.volumes, v] };
          save(ctx, s);
          ctx.out(v + '\n');
          return 0;
        }
        if (op === 'rm' && name) {
          if (!s.volumes.includes(name)) {
            ctx.err(`Error response from daemon: get ${name}: no such volume\n`);
            return 1;
          }
          if (s.containers.some((c) => c.volumes.some((v) => v.startsWith(name + ':')))) {
            ctx.err(`Error response from daemon: remove ${name}: volume is in use\n`);
            return 1;
          }
          save(ctx, { ...s, volumes: s.volumes.filter((v) => v !== name) });
          ctx.out(name + '\n');
          return 0;
        }
        if (op === 'inspect' && name && s.volumes.includes(name)) {
          ctx.out(JSON.stringify([{ CreatedAt: new Date(ctx.now).toISOString(), Driver: 'local', Mountpoint: `/var/lib/docker/volumes/${name}/_data`, Name: name, Scope: 'local' }], null, 4) + '\n');
          return 0;
        }
        ctx.err(`Usage:  docker volume COMMAND\n\nManage volumes\n\nCommands:\n  create      Create a volume\n  inspect     Display detailed information on one or more volumes\n  ls          List volumes\n  rm          Remove one or more volumes\n`);
        return 1;
      }
      case 'network': {
        if (rest[0] === 'ls') {
          ctx.out(table([['NETWORK ID', 'NAME', 'DRIVER', 'SCOPE'], ...s.networks.map((n) => [hash(n).slice(0, 12), n, n === 'host' ? 'host' : n === 'none' ? 'null' : 'bridge', 'local'])]));
          return 0;
        }
        if (rest[0] === 'create' && rest[1]) {
          if (!s.networks.includes(rest[1])) save(ctx, { ...s, networks: [...s.networks, rest[1]] });
          ctx.out(hash(rest[1]) + hash(rest[1] + 'x') + '\n');
          return 0;
        }
        ctx.err(`Usage:  docker network COMMAND\n\nManage networks\n\nCommands:\n  create      Create a network\n  ls          List networks\n`);
        return 1;
      }
      default:
        ctx.err(`docker: '${sub}' is not a docker command.\nSee 'docker --help'\n`);
        return 1;
    }
  },
};
