/**
 * Simulated networking, services and monitoring (for the NOC course).
 * Remote hosts, interfaces and services come from the machine spec, so
 * missions can describe broken networks deterministically.
 */
import type { HttpResponse, NetHost, Network, Service } from '../types';
import type { CommandDef, Ctx } from '../shell/context';
import { ArgError, parseArgs } from '../shell/args';
import { resolve as fsResolve, type Cred } from '../vfs/fs';
import { DEFAULT_NETWORK } from '../machine';
import { humanSize, strftime } from './util';

const ROOT: Cred = { name: 'root', groups: ['root'], root: true };
const IPV4 = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
const PORT_NAMES: Record<string, string> = { '21': 'ftp', '22': 'ssh', '25': 'smtp', '53': 'domain', '80': 'http', '443': 'https', '3306': 'mysql', '5432': 'postgresql', '6379': 'redis', '8080': 'http-alt', '9090': 'websm', '27017': 'mongodb' };

const net = (ctx: Ctx): Network => ctx.machine.network ?? DEFAULT_NETWORK;

function ipOf(cidr: string) {
  return cidr.split('/')[0]!;
}

function ownIps(ctx: Ctx): string[] {
  return ['127.0.0.1', '127.0.1.1', ...net(ctx).interfaces.filter((i) => i.up).map((i) => ipOf(i.cidr))];
}

function readFileAsRoot(ctx: Ctx, path: string): string | null {
  try {
    const n = fsResolve(ctx.fs, path, ROOT, true).node;
    return n.type === 'file' ? n.content : null;
  } catch {
    return null;
  }
}

function hostsFile(ctx: Ctx): Map<string, string> {
  const map = new Map<string, string>();
  for (const line of (readFileAsRoot(ctx, '/etc/hosts') ?? '').split('\n')) {
    const clean = line.replace(/#.*/, '').trim();
    if (!clean) continue;
    const [ip, ...names] = clean.split(/\s+/);
    for (const n of names) if (!map.has(n) && ip) map.set(n, ip);
  }
  return map;
}

export interface Target {
  name: string;
  ip: string;
  local: boolean;
  host?: NetHost;
}

/** Resolve like the system resolver (/etc/hosts, then DNS). `dnsOnly` skips /etc/hosts (dig, nslookup). */
export function resolveHost(ctx: Ctx, name: string, dnsOnly = false): Target | null {
  const n = net(ctx);
  let ip: string | undefined;
  if (IPV4.test(name)) ip = name;
  else if (!dnsOnly && name === 'localhost') ip = '127.0.0.1';
  else if (!dnsOnly && name === ctx.machine.hostname) ip = '127.0.1.1';
  else if (!dnsOnly && hostsFile(ctx).has(name)) ip = hostsFile(ctx).get(name);
  else {
    const h = n.hosts.find((x) => (x.name === name || x.aliases?.includes(name)) && x.dns !== false);
    ip = h?.ip;
  }
  if (!ip) return null;
  const local = ip.startsWith('127.') || ownIps(ctx).includes(ip);
  const host = n.hosts.find((x) => x.ip === ip);
  return { name, ip, local, ...(host ? { host } : {}) };
}

type PortState = 'open' | 'refused' | 'timeout';

function localService(ctx: Ctx, port: number): Service | undefined {
  return ctx.shell.services().find((s) => s.state === 'active' && s.port === port);
}

function tcpState(ctx: Ctx, t: Target, port: number): PortState {
  if (t.local) return localService(ctx, port) ? 'open' : 'refused';
  if (!t.host || t.host.up === false) return 'timeout';
  return t.host.ports?.[String(port)] ? 'open' : 'refused';
}

const sig3 = (ms: number) => (ms < 1 ? ms.toFixed(3) : ms < 10 ? ms.toFixed(2) : ms < 100 ? ms.toFixed(1) : ms.toFixed(0));
const jitter = (base: number, seq: number) => Math.max(0.005, base * (1 + 0.07 * Math.sin(seq * 1.7)));

// ---------------------------------------------------------------- ping

export const ping: CommandDef = {
  name: 'ping',
  category: 'network',
  doc: {
    summary: 'send ICMP ECHO_REQUEST to network hosts',
    usage: ['ping [-c count] [-i interval] [-W timeout] destination'],
    description:
      'ping checks whether a host is reachable and how long a round trip takes. A real ping runs until you press Ctrl+C; the trainer sends 4 packets unless -c is given.',
    options: [
      ['-c count', 'stop after sending count packets'],
      ['-i interval', 'wait interval seconds between packets'],
      ['-W timeout', 'time to wait for a response, in seconds'],
      ['-q', 'quiet output: only the summary'],
    ],
    examples: [['ping -c 3 google.com', 'is the internet reachable?'], ['ping 10.0.2.2', 'is the gateway alive?']],
    seeAlso: ['traceroute', 'ip', 'dig'],
  },
  run(ctx) {
    const a = parseArgs(ctx.args, { flags: 'q46nO', withValue: 'ciWswt' });
    const dest = a.operands[0];
    if (!dest) {
      ctx.err('ping: usage error: Destination address required\n');
      return 1;
    }
    const count = Math.min(20, Math.max(1, Number(a.values.get('c') ?? 4) || 4));
    const t = resolveHost(ctx, dest);
    if (!t) {
      ctx.err(`ping: ${dest}: Name or service not known\n`);
      return 2;
    }
    const latency = t.local ? 0.04 : (t.host?.latency ?? 20);
    const up = t.local || (!!t.host && t.host.up !== false);
    const loss = t.local ? 0 : (t.host?.loss ?? 0);
    let out = `PING ${dest} (${t.ip}) 56(84) bytes of data.\n`;
    const times: number[] = [];
    for (let seq = 1; seq <= count; seq++) {
      const dropped = !up || (seq * 37) % 100 < loss;
      if (dropped) continue;
      const ms = jitter(latency, seq);
      times.push(ms);
      if (!a.flags.has('q')) out += `64 bytes from ${t.ip}: icmp_seq=${seq} ttl=${t.local ? 64 : 57} time=${sig3(ms)} ms\n`;
    }
    const recv = times.length;
    const pct = Math.round(((count - recv) / count) * 100);
    out += `\n--- ${dest} ping statistics ---\n`;
    out += `${count} packets transmitted, ${recv} received, ${pct}% packet loss, time ${(count - 1) * 1000 + (up ? 3 : 61)}ms\n`;
    if (recv) {
      const min = Math.min(...times);
      const max = Math.max(...times);
      const avg = times.reduce((x, y) => x + y, 0) / recv;
      const mdev = Math.sqrt(times.reduce((s, x) => s + (x - avg) ** 2, 0) / recv);
      out += `rtt min/avg/max/mdev = ${min.toFixed(3)}/${avg.toFixed(3)}/${max.toFixed(3)}/${mdev.toFixed(3)} ms\n`;
    }
    ctx.out(out);
    return recv ? 0 : 1;
  },
};

export const traceroute: CommandDef = {
  name: 'traceroute',
  category: 'network',
  doc: {
    summary: 'print the route packets trace to network host',
    usage: ['traceroute [-n] host'],
    description: 'Shows every router (hop) between you and the host with the delay to each. Lines with * * * mean that hop did not answer; if the stars never end, the path is broken there.',
    options: [['-n', 'do not resolve IP addresses to names']],
    examples: [['traceroute google.com', 'where does the path to Google go?']],
    seeAlso: ['ping', 'mtr'],
  },
  run(ctx) {
    const a = parseArgs(ctx.args, { flags: 'nI46', withValue: 'mqw' });
    const dest = a.operands[0];
    if (!dest) {
      ctx.err('Specify "host" missing argument.\n');
      return 1;
    }
    const t = resolveHost(ctx, dest);
    if (!t) {
      ctx.err(`${dest}: Name or service not known\nCannot handle "host" cmdline arg \`${dest}' on position 1 (argc 1)\n`);
      return 2;
    }
    const n = a.flags.has('n');
    let out = `traceroute to ${dest} (${t.ip}), 30 hops max, 60 byte packets\n`;
    const line = (i: number, label: string, base: number) => {
      const ts = [1, 2, 3].map((k) => `${jitter(base, i * 3 + k).toFixed(3)} ms`).join('  ');
      out += `${String(i).padStart(2)}  ${label}  ${ts}\n`;
    };
    if (t.local) {
      line(1, n ? t.ip : `localhost (${t.ip})`, 0.03);
      ctx.out(out);
      return 0;
    }
    const hops = t.host?.hops ?? [`_gateway ${net(ctx).gateway}`];
    let i = 0;
    for (const h of hops) {
      i++;
      if (h === '*') {
        out += `${String(i).padStart(2)}  * * *\n`;
        continue;
      }
      const [first, second] = h.split(' ');
      const ip = second ?? first!;
      line(i, n || !second ? ip : `${first} (${ip})`, 0.5 + (i - 1) * ((t.host?.latency ?? 20) / (hops.length + 1)));
    }
    if (t.host && t.host.up !== false) line(i + 1, n ? t.ip : `${dest} (${t.ip})`, t.host.latency ?? 20);
    else for (let k = i + 1; k <= Math.max(i + 3, 8); k++) out += `${String(k).padStart(2)}  * * *\n`;
    ctx.out(out);
    return 0;
  },
};

// ---------------------------------------------------------------- ip / ss / netstat

function prefixToMask(prefix: number): number[] {
  const m = prefix === 0 ? 0 : (0xffffffff << (32 - prefix)) >>> 0;
  return [24, 16, 8, 0].map((s) => (m >>> s) & 255);
}

function broadcast(cidr: string): string {
  const [ip, p] = cidr.split('/');
  const parts = ip!.split('.').map(Number);
  const mask = prefixToMask(Number(p));
  return parts.map((v, i) => (v & mask[i]!) | (~mask[i]! & 255)).join('.');
}

function network(cidr: string): string {
  const [ip, p] = cidr.split('/');
  const parts = ip!.split('.').map(Number);
  const mask = prefixToMask(Number(p));
  return `${parts.map((v, i) => v & mask[i]!).join('.')}/${p}`;
}

export const ip: CommandDef = {
  name: 'ip',
  category: 'network',
  doc: {
    summary: 'show / manipulate routing, network devices, interfaces',
    usage: ['ip [ -br ] { addr | route | link } [ show ]'],
    description: 'ip a shows network interfaces and their IP addresses, ip r the routing table (the "default via" line is your gateway), ip link the interfaces and whether they are UP.',
    options: [['-br, -brief', 'one line per interface']],
    examples: [['ip a', 'my IP addresses'], ['ip r', 'routes and the default gateway']],
    seeAlso: ['ping', 'ss'],
  },
  run(ctx) {
    const args = [...ctx.args];
    const brief = args[0] === '-br' || args[0] === '-brief';
    if (brief) args.shift();
    const obj = args[0] ?? '';
    const ifs = net(ctx).interfaces;
    const flags = (up: boolean, lo: boolean) => (lo ? '<LOOPBACK,UP,LOWER_UP>' : up ? '<BROADCAST,MULTICAST,UP,LOWER_UP>' : '<BROADCAST,MULTICAST>');
    if (['a', 'addr', 'address'].includes(obj)) {
      if (brief) {
        ctx.out(`lo               UNKNOWN        127.0.0.1/8 \n` + ifs.map((i) => `${i.name.padEnd(16)} ${(i.up ? 'UP' : 'DOWN').padEnd(14)} ${i.up ? i.cidr : ''} \n`).join(''));
        return 0;
      }
      let out = `1: lo: ${flags(true, true)} mtu 65536 qdisc noqueue state UNKNOWN group default qlen 1000\n    link/loopback 00:00:00:00:00:00 brd 00:00:00:00:00:00\n    inet 127.0.0.1/8 scope host lo\n       valid_lft forever preferred_lft forever\n`;
      ifs.forEach((i, k) => {
        out += `${k + 2}: ${i.name}: ${flags(i.up, false)} mtu 1500 qdisc fq_codel state ${i.up ? 'UP' : 'DOWN'} group default qlen 1000\n    link/ether ${i.mac} brd ff:ff:ff:ff:ff:ff\n`;
        if (i.up) out += `    inet ${i.cidr} brd ${broadcast(i.cidr)} scope global dynamic ${i.name}\n       valid_lft 86313sec preferred_lft 86313sec\n`;
      });
      ctx.out(out);
      return 0;
    }
    if (['r', 'route', 'ro'].includes(obj)) {
      const up = ifs.filter((i) => i.up);
      let out = up[0] ? `default via ${net(ctx).gateway} dev ${up[0].name} proto dhcp metric 100 \n` : '';
      for (const i of up) out += `${network(i.cidr)} dev ${i.name} proto kernel scope link src ${ipOf(i.cidr)} metric 100 \n`;
      ctx.out(out);
      return 0;
    }
    if (['l', 'link'].includes(obj)) {
      let out = `1: lo: ${flags(true, true)} mtu 65536 qdisc noqueue state UNKNOWN mode DEFAULT group default qlen 1000\n    link/loopback 00:00:00:00:00:00 brd 00:00:00:00:00:00\n`;
      ifs.forEach((i, k) => (out += `${k + 2}: ${i.name}: ${flags(i.up, false)} mtu 1500 qdisc fq_codel state ${i.up ? 'UP' : 'DOWN'} mode DEFAULT group default qlen 1000\n    link/ether ${i.mac} brd ff:ff:ff:ff:ff:ff\n`));
      ctx.out(out);
      return 0;
    }
    if (obj === '') {
      ctx.err('Usage: ip [ OPTIONS ] OBJECT { COMMAND | help }\nwhere  OBJECT := { address | link | route | ... }\n');
      return 255;
    }
    ctx.err(`Object "${obj}" is unknown, try "ip help".\n`);
    return 255;
  },
};

interface Sock {
  proto: 'tcp' | 'udp';
  state: 'LISTEN' | 'UNCONN' | 'ESTAB';
  local: string;
  port: number;
  peer: string;
  svc?: Service;
}

function sockets(ctx: Ctx): Sock[] {
  const out: Sock[] = [];
  for (const s of ctx.shell.services()) {
    if (s.state !== 'active' || !s.port) continue;
    const proto = s.proto ?? 'tcp';
    out.push({ proto, state: proto === 'udp' ? 'UNCONN' : 'LISTEN', local: s.bind ?? '0.0.0.0', port: s.port, peer: '0.0.0.0:*', svc: s });
  }
  const sshd = ctx.shell.services().find((s) => s.name === 'ssh' && s.state === 'active');
  if (sshd) out.push({ proto: 'tcp', state: 'ESTAB', local: ipOf(net(ctx).interfaces[0]?.cidr ?? '10.0.2.15/24'), port: 22, peer: '192.168.1.10:52344', svc: sshd });
  return out.sort((x, y) => x.port - y.port);
}

export const ss: CommandDef = {
  name: 'ss',
  category: 'network',
  doc: {
    summary: 'another utility to investigate sockets',
    usage: ['ss [options]'],
    description: 'Shows network connections and listening ports. The classic combo is ss -tulpn: TCP and UDP, listening sockets, process names, numeric ports. Is my web server listening on port 80? ss will tell.',
    options: [
      ['-t, --tcp', 'display TCP sockets'],
      ['-u, --udp', 'display UDP sockets'],
      ['-l, --listening', 'display only listening sockets'],
      ['-a, --all', 'display all sockets'],
      ['-n, --numeric', "don't resolve service names"],
      ['-p, --processes', 'show process using socket (needs root for other users)'],
    ],
    examples: [['sudo ss -tulpn', 'which programs listen on which ports'], ['ss -tln | grep :80', 'is anything listening on port 80?']],
    seeAlso: ['netstat', 'ip', 'nc'],
  },
  run(ctx) {
    const a = parseArgs(ctx.args, { flags: 'tulanpe4r6H', long: { tcp: 't', udp: 'u', listening: 'l', all: 'a', numeric: 'n', processes: 'p' } });
    const f = a.flags;
    const wantT = f.has('t') || !f.has('u');
    const wantU = f.has('u') || !f.has('t');
    let list = sockets(ctx).filter((s) => (s.proto === 'tcp' ? wantT : wantU));
    if (f.has('l')) list = list.filter((s) => s.state !== 'ESTAB');
    else if (!f.has('a')) list = list.filter((s) => s.state === 'ESTAB');
    const port = (p: number) => (f.has('n') ? String(p) : (PORT_NAMES[String(p)] ?? String(p)));
    const rows = [['Netid', 'State', 'Recv-Q', 'Send-Q', 'Local Address:Port', 'Peer Address:Port', 'Process']];
    for (const s of list) {
      const proc = f.has('p') && s.svc && (ctx.cred.root || s.svc.user === ctx.user) ? `users:(("${s.svc.name === 'ssh' ? 'sshd' : s.svc.name}",pid=${s.svc.pid ?? 0},fd=${s.state === 'ESTAB' ? 4 : 3}))` : '';
      rows.push([s.proto, s.state, '0', s.state === 'LISTEN' ? '511' : '0', `${s.local}:${port(s.port)}`, s.peer, proc]);
    }
    const w = [5, 6, 6, 6, 20, 19];
    ctx.out(
      rows
        .map((r) =>
          [r[0]!.padEnd(w[0]!), r[1]!.padEnd(w[1]!), r[2]!.padEnd(w[2]!), r[3]!.padEnd(w[3]!), r[4]!.padStart(w[4]!), r[5]!.padStart(w[5]!), r[6]].join(' ').trimEnd(),
        )
        .join('\n') + '\n',
    );
    return 0;
  },
};

export const netstat: CommandDef = {
  name: 'netstat',
  category: 'network',
  doc: {
    summary: 'print network connections (deprecated, use ss)',
    usage: ['netstat [-tulpn]'],
    description: 'The older cousin of ss, still found on many servers. netstat -tulpn lists listening TCP/UDP ports with programs.',
    options: [['-t', 'TCP'], ['-u', 'UDP'], ['-l', 'only listening'], ['-p', 'show PID/Program name'], ['-n', 'numeric addresses']],
    seeAlso: ['ss'],
  },
  run(ctx) {
    const a = parseArgs(ctx.args, { flags: 'tulpnae' });
    const f = a.flags;
    const wantT = f.has('t') || !f.has('u');
    const wantU = f.has('u') || !f.has('t');
    let list = sockets(ctx).filter((s) => (s.proto === 'tcp' ? wantT : wantU));
    if (f.has('l')) list = list.filter((s) => s.state !== 'ESTAB');
    else if (!f.has('a')) list = list.filter((s) => s.state === 'ESTAB');
    let out = f.has('l') ? 'Active Internet connections (only servers)\n' : 'Active Internet connections (w/o servers)\n';
    out += `Proto Recv-Q Send-Q Local Address           Foreign Address         State      ${f.has('p') ? ' PID/Program name' : ''}`.trimEnd() + '\n';
    for (const s of list) {
      const prog = f.has('p') ? (s.svc && (ctx.cred.root || s.svc.user === ctx.user) ? ` ${s.svc.pid}/${s.svc.name === 'ssh' ? 'sshd' : s.svc.name}` : ' -') : '';
      const state = s.state === 'ESTAB' ? 'ESTABLISHED' : s.state === 'UNCONN' ? '' : 'LISTEN';
      out += `${s.proto.padEnd(5)} ${'0'.padStart(6)} ${'0'.padStart(6)} ${`${s.local}:${s.port}`.padEnd(23)} ${(s.peer === '0.0.0.0:*' ? '0.0.0.0:*' : s.peer).padEnd(23)} ${state.padEnd(11)}${prog}`.trimEnd() + '\n';
    }
    ctx.out(out);
    return 0;
  },
};

// ---------------------------------------------------------------- DNS

export const dig: CommandDef = {
  name: 'dig',
  category: 'network',
  doc: {
    summary: 'DNS lookup utility',
    usage: ['dig [@server] name [type] [+short]'],
    description: 'Asks a DNS server for the address of a name. Unlike ping or curl, dig does NOT read /etc/hosts — so if ping works but dig fails (or the other way round), compare the two sources.',
    options: [['+short', 'print only the answer']],
    examples: [['dig example.com', 'full DNS answer'], ['dig +short github.com', 'just the IP']],
    seeAlso: ['nslookup', 'host'],
  },
  run(ctx) {
    const short = ctx.args.includes('+short');
    const ops = ctx.args.filter((x) => !x.startsWith('+') && !x.startsWith('@') && !/^(A|AAAA|MX|NS|TXT|CNAME)$/i.test(x) && !x.startsWith('-'));
    const name = ops[0] ?? '.';
    const t = resolveHost(ctx, name, true);
    const server = ctx.args.find((x) => x.startsWith('@'))?.slice(1) ?? net(ctx).dnsServer;
    if (short) {
      if (t) ctx.out(t.ip + '\n');
      return 0;
    }
    const fq = name.endsWith('.') ? name : `${name}.`;
    let out = `\n; <<>> DiG 9.18.28-0ubuntu0.24.04.1-Ubuntu <<>> ${ctx.args.join(' ')}\n;; global options: +cmd\n;; Got answer:\n`;
    out += `;; ->>HEADER<<- opcode: QUERY, status: ${t ? 'NOERROR' : 'NXDOMAIN'}, id: 4242\n`;
    out += `;; flags: qr rd ra; QUERY: 1, ANSWER: ${t ? 1 : 0}, AUTHORITY: ${t ? 0 : 1}, ADDITIONAL: 1\n\n`;
    out += `;; QUESTION SECTION:\n;${fq}\t\t\tIN\tA\n\n`;
    if (t) out += `;; ANSWER SECTION:\n${fq}\t\t300\tIN\tA\t${t.ip}\n\n`;
    out += `;; Query time: 12 msec\n;; SERVER: ${server}#53(${server}) (UDP)\n;; WHEN: ${strftime('%a %b %d %H:%M:%S UTC %Y', ctx.now)}\n;; MSG SIZE  rcvd: ${t ? 56 : 104}\n\n`;
    ctx.out(out);
    return 0;
  },
};

export const nslookup: CommandDef = {
  name: 'nslookup',
  category: 'network',
  doc: { summary: 'query Internet name servers', usage: ['nslookup name [server]'], description: 'Asks DNS for the address of a name (does not read /etc/hosts).', seeAlso: ['dig', 'host'] },
  run(ctx) {
    const name = ctx.args.find((x) => !x.startsWith('-'));
    if (!name) {
      ctx.err('nslookup: interactive mode is not supported in the trainer, give a name\n');
      return 1;
    }
    const t = resolveHost(ctx, name, true);
    const server = net(ctx).dnsServer;
    let out = `Server:\t\t${server}\nAddress:\t${server}#53\n\n`;
    if (!t) {
      ctx.out(out + `** server can't find ${name}: NXDOMAIN\n\n`);
      return 1;
    }
    out += `Non-authoritative answer:\nName:\t${name}\nAddress: ${t.ip}\n\n`;
    ctx.out(out);
    return 0;
  },
};

export const host: CommandDef = {
  name: 'host',
  category: 'network',
  doc: { summary: 'DNS lookup utility', usage: ['host name'], examples: [['host github.com', 'github.com has address ...']], seeAlso: ['dig'] },
  run(ctx) {
    const name = ctx.args.find((x) => !x.startsWith('-'));
    if (!name) {
      ctx.err('Usage: host [-aCdilrTvVw] [-c class] [-N ndots] [-t type] [-W time]\n            [-R number] [-m flag] [-p port] hostname [server]\n');
      return 1;
    }
    const t = resolveHost(ctx, name, true);
    if (!t) {
      ctx.out(`Host ${name} not found: 3(NXDOMAIN)\n`);
      return 1;
    }
    ctx.out(`${name} has address ${t.ip}\n`);
    return 0;
  },
};

// ---------------------------------------------------------------- curl / nc

const REASONS: Record<number, string> = { 200: 'OK', 201: 'Created', 204: 'No Content', 301: 'Moved Permanently', 302: 'Found', 304: 'Not Modified', 400: 'Bad Request', 401: 'Unauthorized', 403: 'Forbidden', 404: 'Not Found', 500: 'Internal Server Error', 502: 'Bad Gateway', 503: 'Service Unavailable', 504: 'Gateway Timeout' };

function parseUrl(raw: string): { scheme: string; host: string; port: number; path: string } | null {
  const m = /^(?:(https?):\/\/)?([^/:?#]+)(?::(\d+))?([^?#]*)?/.exec(raw);
  if (!m) return null;
  const scheme = m[1] ?? 'http';
  return { scheme, host: m[2]!, port: m[3] ? Number(m[3]) : scheme === 'https' ? 443 : 80, path: m[4] || '/' };
}

function fetchHttp(ctx: Ctx, t: Target, port: number, path: string): HttpResponse {
  const table = t.local ? localService(ctx, port)?.http : t.host?.http;
  const r = table?.[path];
  if (r?.upstream && t.local && ctx.shell.services().find((x) => x.name === r.upstream)?.state !== 'active') {
    return { status: 502, body: '<html>\n<head><title>502 Bad Gateway</title></head>\n<body>\n<center><h1>502 Bad Gateway</h1></center>\n<hr><center>nginx/1.24.0 (Ubuntu)</center>\n</body>\n</html>\n', headers: { Server: 'nginx/1.24.0 (Ubuntu)', 'Content-Type': 'text/html' } };
  }
  if (r) return r;
  if (path === '/' && (!table || Object.keys(table).length === 0)) return { status: 200, body: `<html><body><h1>It works!</h1></body></html>\n`, headers: { Server: t.local ? 'nginx/1.24.0 (Ubuntu)' : 'web' } };
  return { status: 404, body: '<html><head><title>404 Not Found</title></head><body><h1>404 Not Found</h1></body></html>\n' };
}

export const curl: CommandDef = {
  name: 'curl',
  category: 'network',
  doc: {
    summary: 'transfer a URL',
    usage: ['curl [options] <url>'],
    description: 'Makes an HTTP request and prints the response. The NOC favourite for "is the site up?": curl -I shows just the status line and headers. Errors are numbered: (6) cannot resolve host, (7) connection refused, (28) timeout.',
    options: [
      ['-I, --head', 'show the response headers only'],
      ['-s, --silent', 'silent mode'],
      ['-o, --output <file>', 'write the body to a file'],
      ['-L, --location', 'follow redirects'],
      ['-w, --write-out <format>', "print extra info, e.g. -w '%{http_code}'"],
      ['-f, --fail', 'fail with exit code 22 on HTTP errors'],
      ['-v, --verbose', 'show the request and response headers'],
    ],
    examples: [['curl -I https://example.com', 'status code of a site'], ['curl -s -o /dev/null -w "%{http_code}\\n" localhost', 'just the code']],
    seeAlso: ['wget', 'nc'],
  },
  run(ctx) {
    const a = parseArgs(ctx.args, {
      flags: 'IsSLfvkiq',
      withValue: 'owmXHdA',
      long: { head: 'I', silent: 's', location: 'L', fail: 'f', verbose: 'v', insecure: 'k', include: 'i' },
      longWithValue: { output: 'o', 'write-out': 'w', 'max-time': 'm', 'connect-timeout': 'connect-timeout', request: 'X', header: 'H', data: 'd' },
    });
    const raw = a.operands[0];
    if (!raw) {
      ctx.err("curl: try 'curl --help' or 'curl --manual' for more information\n");
      return 2;
    }
    let u = parseUrl(raw);
    if (!u) {
      ctx.err(`curl: (3) URL rejected: Malformed input to a URL function\n`);
      return 3;
    }
    const f = a.flags;
    let hops = 0;
    for (;;) {
      const t = resolveHost(ctx, u.host);
      if (!t) {
        ctx.err(`curl: (6) Could not resolve host: ${u.host}\n`);
        return 6;
      }
      const st = tcpState(ctx, t, u.port);
      if (st === 'refused') {
        ctx.err(`curl: (7) Failed to connect to ${u.host} port ${u.port} after 2 ms: Couldn't connect to server\n`);
        return 7;
      }
      if (st === 'timeout') {
        ctx.err(`curl: (28) Failed to connect to ${u.host} port ${u.port} after 10002 ms: Timeout was reached\n`);
        return 28;
      }
      const r = fetchHttp(ctx, t, u.port, u.path);
      const body = r.body ?? '';
      const headers: Record<string, string> = { ...(r.headers ?? {}), 'Content-Length': String(body.length) };
      const loc = headers['Location'];
      if (f.has('L') && loc && r.status >= 300 && r.status < 400 && hops < 5) {
        hops++;
        const next = parseUrl(loc.startsWith('/') ? `${u.scheme}://${u.host}${loc}` : loc);
        if (next) {
          u = next;
          continue;
        }
      }
      const head = `HTTP/1.1 ${r.status} ${REASONS[r.status] ?? ''}`.trimEnd() + '\n' + Object.entries(headers).map(([k, v]) => `${k}: ${v}\n`).join('') + '\n';
      if (f.has('v')) ctx.err(`*   Trying ${t.ip}:${u.port}...\n* Connected to ${u.host} (${t.ip}) port ${u.port}\n> GET ${u.path} HTTP/1.1\n> Host: ${u.host}\n> User-Agent: curl/8.5.0\n>\n` + head.split('\n').filter(Boolean).map((l) => `< ${l}\n`).join(''));
      if (f.has('f') && r.status >= 400) {
        ctx.err(`curl: (22) The requested URL returned error: ${r.status}\n`);
        return 22;
      }
      let out = f.has('I') ? head : (f.has('i') ? head : '') + body;
      const o = a.values.get('o');
      if (o && !f.has('I')) {
        try {
          ctx.writeFile(o, body);
        } catch {
          ctx.err(`curl: (23) Failure writing output to destination\n`);
          return 23;
        }
        out = '';
      }
      const w = a.values.get('w');
      if (w) out += w.replace(/%\{http_code\}/g, String(r.status)).replace(/%\{size_download\}/g, String(body.length)).replace(/\\n/g, '\n');
      ctx.out(out);
      return 0;
    }
  },
};

export const wget: CommandDef = {
  name: 'wget',
  category: 'network',
  doc: { summary: 'the non-interactive network downloader', usage: ['wget [-O file] url'], seeAlso: ['curl'] },
  run(ctx) {
    const a = parseArgs(ctx.args, { flags: 'qc', withValue: 'O' });
    const raw = a.operands[0];
    if (!raw) {
      ctx.err("wget: missing URL\nUsage: wget [OPTION]... [URL]...\n\nTry `wget --help' for more options.\n");
      return 1;
    }
    const u = parseUrl(raw);
    const t = u && resolveHost(ctx, u.host);
    if (!u || !t) {
      ctx.err(`--${strftime('%F %T', ctx.now)}--  ${raw}\nResolving ${u?.host ?? raw}... failed: Name or service not known.\nwget: unable to resolve host address '${u?.host ?? raw}'\n`);
      return 4;
    }
    if (tcpState(ctx, t, u.port) !== 'open') {
      ctx.err(`--${strftime('%F %T', ctx.now)}--  ${raw}\nConnecting to ${u.host} (${u.host})|${t.ip}|:${u.port}... failed: Connection refused.\n`);
      return 4;
    }
    const r = fetchHttp(ctx, t, u.port, u.path);
    const file = a.values.get('O') ?? (u.path.split('/').pop() || 'index.html');
    if (r.status >= 400) {
      ctx.err(`HTTP request sent, awaiting response... ${r.status} ${REASONS[r.status] ?? ''}\n${strftime('%F %T', ctx.now)} ERROR ${r.status}: ${REASONS[r.status] ?? ''}.\n`);
      return 8;
    }
    if (file !== '-') ctx.writeFile(file, r.body ?? '');
    else ctx.out(r.body ?? '');
    if (!a.flags.has('q')) ctx.err(`HTTP request sent, awaiting response... ${r.status} ${REASONS[r.status] ?? ''}\nSaving to: '${file}'\n\n${strftime('%F %T', ctx.now)} - '${file}' saved [${(r.body ?? '').length}]\n`);
    return 0;
  },
};

export const nc: CommandDef = {
  name: 'nc',
  category: 'network',
  doc: {
    summary: 'arbitrary TCP and UDP connections and listens',
    usage: ['nc -zv host port'],
    description: 'netcat. In the NOC it is mostly used to check whether a TCP port is open: nc -zv db01 5432. "succeeded" = something listens; "Connection refused" = host is up but nothing listens; "timed out" = host down or a firewall drops packets.',
    options: [['-z', 'only scan for listening daemons, without sending data'], ['-v', 'verbose'], ['-w secs', 'timeout']],
    examples: [['nc -zv localhost 80', 'is my web server listening?']],
    seeAlso: ['ss', 'curl'],
  },
  run(ctx) {
    const a = parseArgs(ctx.args, { flags: 'zvnu4', withValue: 'w' });
    const [hostName, portStr] = a.operands;
    if (!hostName || !portStr) {
      ctx.err('usage: nc [-46CDdFhklNnrStUuvZz] [-I length] [-i interval] [-M ttl]\n\t  [-m minttl] [-O length] [-P proxy_username] [-p source_port]\n\t  [-q seconds] [-s sourceaddr] [-T keyword] [-V rtable] [-W recvlimit]\n\t  [-w timeout] [-X proxy_protocol] [-x proxy_address[:port]]\n\t  [destination] [port]\n');
      return 1;
    }
    const t = resolveHost(ctx, hostName);
    if (!t) {
      ctx.err(`nc: getaddrinfo for host "${hostName}" port ${portStr}: Name or service not known\n`);
      return 1;
    }
    const port = Number(portStr);
    const st = tcpState(ctx, t, port);
    const svc = PORT_NAMES[portStr] ?? '*';
    if (st === 'open') {
      if (a.flags.has('v')) ctx.err(`Connection to ${hostName} (${t.ip}) ${port} port [tcp/${svc}] succeeded!\n`);
      return 0;
    }
    if (a.flags.has('v') || true) ctx.err(st === 'refused' ? `nc: connect to ${hostName} (${t.ip}) port ${port} (tcp) failed: Connection refused\n` : `nc: connect to ${hostName} (${t.ip}) port ${port} (tcp) timed out: Operation now in progress\n`);
    return 1;
  },
};

// ---------------------------------------------------------------- systemd

const unitName = (n: string) => n.replace(/\.service$/, '');

function journalStamp(ctx: Ctx) {
  return strftime('%b %d %H:%M:%S', ctx.now);
}

function bootTime(ctx: Ctx) {
  return ctx.now - (ctx.machine.system?.uptimeSec ?? 3600) * 1000;
}

function ago(ms: number): string {
  const s = Math.max(0, Math.round(ms / 1000));
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}min ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ${Math.floor((s % 3600) / 60)}min ago`;
  return `${Math.floor(s / 86400)} days ago`;
}

function updateService(ctx: Ctx, name: string, fn: (s: Service) => Service) {
  ctx.shell.setServices(ctx.shell.services().map((s) => (s.name === name ? fn(s) : s)));
}

function configOk(ctx: Ctx, s: Service): boolean {
  if (!s.config) return true;
  const content = readFileAsRoot(ctx, s.config.path);
  if (content === null) return false;
  if (s.config.mustContain !== undefined && !content.includes(s.config.mustContain)) return false;
  if (s.config.mustNotContain !== undefined && content.includes(s.config.mustNotContain)) return false;
  return true;
}

function startService(ctx: Ctx, s: Service, verb: 'start' | 'restart' | 'reload'): boolean {
  const host = ctx.machine.hostname;
  const ts = journalStamp(ctx);
  const logs: string[] = [];
  if (verb !== 'start' && s.state === 'active') logs.push(`${ts} ${host} systemd[1]: Stopping ${s.name}.service - ${s.description}...`, `${ts} ${host} systemd[1]: Stopped ${s.name}.service - ${s.description}.`);
  logs.push(`${ts} ${host} systemd[1]: Starting ${s.name}.service - ${s.description}...`);
  const pid = (s.pid ?? 900) + 37;
  if (!configOk(ctx, s)) {
    logs.push(
      `${ts} ${host} ${s.name}[${pid}]: ${s.config!.error}`,
      `${ts} ${host} systemd[1]: ${s.name}.service: Control process exited, code=exited, status=1/FAILURE`,
      `${ts} ${host} systemd[1]: ${s.name}.service: Failed with result 'exit-code'.`,
      `${ts} ${host} systemd[1]: Failed to start ${s.name}.service - ${s.description}.`,
    );
    updateService(ctx, s.name, (x) => ({ ...x, state: 'failed', since: ctx.now, logs: [...x.logs, ...logs] }));
    ctx.shell.setProcesses(ctx.shell.processes().filter((p) => p.pid !== s.pid));
    return false;
  }
  logs.push(`${ts} ${host} systemd[1]: Started ${s.name}.service - ${s.description}.`);
  updateService(ctx, s.name, (x) => ({ ...x, state: 'active', since: ctx.now, pid, logs: [...x.logs, ...logs] }));
  const procs = ctx.shell.processes().filter((p) => p.pid !== s.pid && p.pid !== pid);
  ctx.shell.setProcesses([...procs, { pid, user: s.user ?? 'root', command: `/usr/sbin/${s.name}`, cpu: 0, mem: 0.4, rss: 9_800, stat: 'Ss', start: strftime('%H:%M', ctx.now) }]);
  return true;
}

export const systemctl: CommandDef = {
  name: 'systemctl',
  category: 'system',
  doc: {
    summary: 'control the systemd system and service manager',
    usage: ['systemctl [OPTIONS...] COMMAND [UNIT...]'],
    description:
      'Manage services: status shows whether a service runs and its last log lines; start, stop and restart change its state (root only). list-units --type=service --state=failed lists broken services — a great first command during an incident.',
    options: [
      ['status UNIT', 'show runtime status and recent logs'],
      ['start|stop|restart UNIT', 'start, stop or restart a service (needs sudo)'],
      ['reload UNIT', 'reload configuration without stopping'],
      ['enable|disable UNIT', 'start (or not) at boot'],
      ['is-active UNIT', 'print active / inactive / failed'],
      ['list-units --type=service', 'list services'],
      ['--failed', 'list failed units'],
    ],
    examples: [['systemctl status nginx', 'is nginx running?'], ['sudo systemctl restart nginx', 'restart it'], ['systemctl --failed', 'what is broken?']],
    seeAlso: ['journalctl', 'ps'],
  },
  run(ctx) {
    const args = ctx.args.filter((x) => !['--no-pager', '-l', '--full', '-q', '--quiet', '--all', '-a'].includes(x));
    const failedOnly = args.includes('--failed') || args.includes('--state=failed');
    const ops = args.filter((x) => !x.startsWith('-'));
    const cmd = ops[0] ?? 'list-units';
    const units = ops.slice(1).map(unitName);
    const svcs = ctx.shell.services();
    const find = (n: string) => svcs.find((s) => s.name === n);
    const host = ctx.machine.hostname;

    if (cmd === 'list-units' || cmd === 'list-unit-files' || (ops.length === 0)) {
      const list = svcs.filter((s) => (failedOnly ? s.state === 'failed' : true)).sort((x, y) => x.name.localeCompare(y.name));
      if (cmd === 'list-unit-files') {
        ctx.out('UNIT FILE' + ' '.repeat(23) + 'STATE    PRESET\n' + list.map((s) => `${`${s.name}.service`.padEnd(32)}${(s.enabled ? 'enabled' : 'disabled').padEnd(9)}enabled\n`).join('') + `\n${list.length} unit files listed.\n`);
        return 0;
      }
      const w = Math.max(20, ...list.map((s) => s.name.length + 9));
      let out = `  ${'UNIT'.padEnd(w)} LOAD   ACTIVE   SUB     DESCRIPTION\n`;
      for (const s of list) {
        const sub = s.state === 'active' ? 'running' : s.state === 'failed' ? 'failed' : 'dead';
        out += `${s.state === 'failed' ? '●' : ' '} ${`${s.name}.service`.padEnd(w)} loaded ${s.state.padEnd(8)} ${sub.padEnd(7)} ${s.description}\n`;
      }
      out += `\nLegend: LOAD   → Reflects whether the unit definition was properly loaded.\n        ACTIVE → The high-level unit activation state, i.e. generalization of SUB.\n        SUB    → The low-level unit activation state, values depend on unit type.\n\n${list.length} loaded units listed.\n`;
      ctx.out(out);
      return 0;
    }

    if (units.length === 0) {
      ctx.err(`Too few arguments.\n`);
      return 1;
    }
    let code = 0;
    for (const u of units) {
      const s = find(u);
      if (!s) {
        if (cmd === 'status') ctx.err(`Unit ${u}.service could not be found.\n`);
        else if (cmd === 'is-active') ctx.out('inactive\n');
        else ctx.err(`Failed to ${cmd} ${u}.service: Unit ${u}.service not found.\n`);
        code = cmd === 'status' ? 4 : cmd === 'is-active' ? 3 : 5;
        continue;
      }
      switch (cmd) {
        case 'status': {
          const dot = s.state === 'active' ? '●' : s.state === 'failed' ? '×' : '○';
          const since = s.since ?? bootTime(ctx);
          const active =
            s.state === 'active'
              ? `active (running) since ${strftime('%a %F %T UTC', since)}; ${ago(ctx.now - since)}`
              : s.state === 'failed'
                ? `failed (Result: exit-code) since ${strftime('%a %F %T UTC', since)}; ${ago(ctx.now - since)}`
                : `inactive (dead)${s.since ? ` since ${strftime('%a %F %T UTC', since)}; ${ago(ctx.now - since)}` : ''}`;
          let out = `${dot} ${s.name}.service - ${s.description}\n     Loaded: loaded (/usr/lib/systemd/system/${s.name}.service; ${s.enabled ? 'enabled' : 'disabled'}; preset: enabled)\n     Active: ${active}\n`;
          if (s.state === 'active') out += `   Main PID: ${s.pid ?? 0} (${s.name === 'ssh' ? 'sshd' : s.name})\n      Tasks: 2 (limit: 4558)\n     Memory: 4.1M (peak: 6.2M)\n        CPU: 52ms\n     CGroup: /system.slice/${s.name}.service\n`;
          const tail = s.logs.slice(-10);
          if (tail.length) out += `\n${tail.join('\n')}\n`;
          ctx.out(out);
          if (s.state !== 'active') code = 3;
          break;
        }
        case 'is-active':
          ctx.out(s.state + '\n');
          if (s.state !== 'active') code = 3;
          break;
        case 'is-enabled':
          ctx.out((s.enabled ? 'enabled' : 'disabled') + '\n');
          if (!s.enabled) code = 1;
          break;
        case 'start':
        case 'stop':
        case 'restart':
        case 'reload':
        case 'enable':
        case 'disable': {
          if (!ctx.cred.root) {
            ctx.err(`Failed to ${cmd} ${u}.service: Interactive authentication required.\nSee system logs and 'systemctl status ${u}.service' for details.\n`);
            code = 1;
            break;
          }
          if (cmd === 'enable' || cmd === 'disable') {
            updateService(ctx, u, (x) => ({ ...x, enabled: cmd === 'enable' }));
            ctx.err(cmd === 'enable' ? `Created symlink /etc/systemd/system/multi-user.target.wants/${u}.service → /usr/lib/systemd/system/${u}.service.\n` : `Removed "/etc/systemd/system/multi-user.target.wants/${u}.service".\n`);
            break;
          }
          if (cmd === 'stop') {
            if (s.state !== 'inactive') {
              const ts = journalStamp(ctx);
              updateService(ctx, u, (x) => ({ ...x, state: 'inactive', since: ctx.now, logs: [...x.logs, `${ts} ${host} systemd[1]: Stopping ${u}.service - ${s.description}...`, `${ts} ${host} systemd[1]: Stopped ${u}.service - ${s.description}.`] }));
              ctx.shell.setProcesses(ctx.shell.processes().filter((p) => p.pid !== s.pid));
            }
            break;
          }
          if (cmd === 'start' && s.state === 'active') break;
          if (cmd === 'reload' && s.state !== 'active') {
            ctx.err(`Job for ${u}.service invalid.\n`);
            code = 1;
            break;
          }
          if (!startService(ctx, s, cmd)) {
            ctx.err(`Job for ${u}.service failed because the control process exited with error code.\nSee "systemctl status ${u}.service" and "journalctl -xeu ${u}.service" for details.\n`);
            code = 1;
          }
          break;
        }
        default:
          ctx.err(`Unknown command verb '${cmd}'.\n`);
          return 1;
      }
    }
    return code;
  },
};

export const service: CommandDef = {
  name: 'service',
  category: 'system',
  doc: { summary: 'run a System V init script (wrapper around systemctl)', usage: ['service NAME status|start|stop|restart'], seeAlso: ['systemctl'] },
  run(ctx) {
    const [name, verb] = ctx.args;
    if (!name || !verb) {
      ctx.err('Usage: service < option > | --status-all | [ service_name [ command | --full-restart ] ]\n');
      return 1;
    }
    const r = ctx.shell.run(['systemctl', verb, name], null);
    ctx.forward(r.chunks);
    return r.code;
  },
};

export const journalctl: CommandDef = {
  name: 'journalctl',
  category: 'system',
  doc: {
    summary: 'print log entries from the systemd journal',
    usage: ['journalctl [-u unit] [-n lines] [-p priority] [-f]'],
    description: 'Reads the system journal. journalctl -u nginx shows the logs of one service; -n 20 the last 20 lines; -p err only errors; -xe jumps to the end with explanations. In the trainer -f prints the latest lines and returns.',
    options: [
      ['-u, --unit=UNIT', 'show logs of the specified unit'],
      ['-n, --lines=N', 'number of journal entries to show'],
      ['-p, --priority=err', 'show only errors and worse'],
      ['-r, --reverse', 'newest entries first'],
      ['-e', 'jump to the end'],
      ['-f, --follow', 'follow the journal'],
    ],
    examples: [['journalctl -u nginx -n 20', 'last 20 lines of nginx'], ['journalctl -p err', 'only errors']],
    seeAlso: ['systemctl', 'tail'],
  },
  run(ctx) {
    const a = parseArgs(ctx.args, {
      flags: 'rfexqkb',
      withValue: 'unpS',
      long: { reverse: 'r', follow: 'f', 'no-pager': 'np', pager_end: 'e', quiet: 'q' },
      longWithValue: { unit: 'u', lines: 'n', priority: 'p', since: 'S', until: 'U' },
    });
    const unitsWanted: string[] = [];
    for (let i = 0; i < ctx.args.length; i++) {
      const x = ctx.args[i]!;
      if (x === '-u' || x === '--unit') unitsWanted.push(unitName(ctx.args[i + 1] ?? ''));
      else if (x.startsWith('-u') && x.length > 2) unitsWanted.push(unitName(x.slice(2)));
      else if (x.startsWith('--unit=')) unitsWanted.push(unitName(x.slice(7)));
    }
    const svcs = ctx.shell.services().filter((s) => !unitsWanted.length || unitsWanted.includes(s.name));
    let lines = svcs.flatMap((s) => s.logs);
    lines.sort((x, y) => (x.slice(0, 15) < y.slice(0, 15) ? -1 : x.slice(0, 15) > y.slice(0, 15) ? 1 : 0));
    const pr = a.values.get('p');
    if (pr && /^(err|error|3|crit|2|alert|1|emerg|0|warning|4)$/.test(pr)) {
      const re = /error|fail|fatal|crit|emerg|denied|refused|exited, code|killed|out of memory|panic/i;
      lines = lines.filter((l) => re.test(l));
    }
    const n = a.values.get('n') ?? (a.flags.has('f') || a.flags.has('e') ? '10' : undefined);
    if (n !== undefined) lines = lines.slice(-Math.max(0, Number(n) || 0));
    if (a.flags.has('r')) lines.reverse();
    if (!lines.length) {
      ctx.out('-- No entries --\n');
      return 0;
    }
    ctx.out(lines.join('\n') + '\n');
    return 0;
  },
};

// ---------------------------------------------------------------- monitoring

function uptimeParts(sec: number) {
  return { d: Math.floor(sec / 86400), h: Math.floor((sec % 86400) / 3600), m: Math.floor((sec % 3600) / 60) };
}

function uptimeLine(ctx: Ctx): string {
  const sys = ctx.machine.system;
  const { d, h, m } = uptimeParts(sys?.uptimeSec ?? 3600);
  const users = sys?.logins.length ?? 1;
  const up = `${d ? `${d} day${d === 1 ? '' : 's'}, ` : ''}${h ? `${String(h).padStart(2)}:${String(m).padStart(2, '0')}` : `${m} min`}`;
  const load = (sys?.load ?? [0, 0, 0]).map((x) => x.toFixed(2)).join(', ');
  return ` ${strftime('%T', ctx.now)} up ${up},  ${users} user${users === 1 ? '' : 's'},  load average: ${load}`;
}

export const uptime: CommandDef = {
  name: 'uptime',
  category: 'system',
  doc: {
    summary: 'tell how long the system has been running',
    usage: ['uptime [-p] [-s]'],
    description: 'Prints the time, how long the system is up, how many users are logged in and the load average for the last 1, 5 and 15 minutes. A load average above the number of CPU cores (nproc) means processes are waiting in line.',
    options: [['-p, --pretty', 'show uptime in pretty format'], ['-s, --since', 'system up since']],
    seeAlso: ['top', 'w', 'nproc'],
  },
  run(ctx) {
    const a = parseArgs(ctx.args, { flags: 'ps', long: { pretty: 'p', since: 's' } });
    const sec = ctx.machine.system?.uptimeSec ?? 3600;
    if (a.flags.has('s')) {
      ctx.out(strftime('%F %T', ctx.now - sec * 1000) + '\n');
      return 0;
    }
    if (a.flags.has('p')) {
      const { d, h, m } = uptimeParts(sec);
      const parts = [d && `${d} day${d === 1 ? '' : 's'}`, h && `${h} hour${h === 1 ? '' : 's'}`, m && `${m} minute${m === 1 ? '' : 's'}`].filter(Boolean);
      ctx.out(`up ${parts.join(', ') || '0 minutes'}\n`);
      return 0;
    }
    ctx.out(uptimeLine(ctx) + '\n');
    return 0;
  },
};

export const nproc: CommandDef = {
  name: 'nproc',
  category: 'system',
  doc: { summary: 'print the number of processing units available', usage: ['nproc'], seeAlso: ['uptime', 'lscpu'] },
  run(ctx) {
    ctx.out(`${ctx.machine.system?.cpus ?? 2}\n`);
    return 0;
  },
};

function fmtFreeHuman(kib: number): string {
  if (kib === 0) return '0B';
  let v = kib * 1024;
  const units = ['B', 'Ki', 'Mi', 'Gi', 'Ti'];
  let i = 0;
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024;
    i++;
  }
  return `${v < 10 ? v.toFixed(1) : Math.round(v)}${units[i]}`;
}

export const free: CommandDef = {
  name: 'free',
  category: 'system',
  doc: {
    summary: 'display amount of free and used memory in the system',
    usage: ['free [-h] [-m] [-g]'],
    description: 'Shows RAM and swap. Look at "available", not "free": Linux uses spare RAM as cache (buff/cache) and gives it back when programs need it. Heavy swap usage means the machine is short on memory.',
    options: [['-h, --human', 'human readable units'], ['-m, --mebi', 'show in MiB'], ['-g, --gibi', 'show in GiB']],
    examples: [['free -h', 'memory at a glance']],
    seeAlso: ['top', 'vmstat'],
  },
  run(ctx) {
    const a = parseArgs(ctx.args, { flags: 'hmgkwt', long: { human: 'h', mebi: 'm', gibi: 'g' } });
    const s = ctx.machine.system;
    if (!s) return 0;
    const fmt = (k: number) => (a.flags.has('h') ? fmtFreeHuman(k) : a.flags.has('g') ? String(Math.floor(k / 1048576)) : a.flags.has('m') ? String(Math.floor(k / 1024)) : String(k));
    const freeMem = Math.max(0, s.memTotal - s.memUsed - s.memCache);
    const avail = Math.max(0, s.memTotal - s.memUsed);
    const row = (label: string, cells: string[]) => label.padEnd(7) + cells.map((c) => c.padStart(12)).join('') + '\n';
    let out = ' '.repeat(7) + ['total', 'used', 'free', 'shared', 'buff/cache', 'available'].map((c) => c.padStart(12)).join('') + '\n';
    out += row('Mem:', [fmt(s.memTotal), fmt(s.memUsed), fmt(freeMem), fmt(12_288), fmt(s.memCache), fmt(avail)]);
    out += row('Swap:', [fmt(s.swapTotal), fmt(s.swapUsed), fmt(s.swapTotal - s.swapUsed)]);
    ctx.out(out);
    return 0;
  },
};

export const who: CommandDef = {
  name: 'who',
  category: 'system',
  doc: { summary: 'show who is logged on', usage: ['who'], seeAlso: ['w', 'last'] },
  run(ctx) {
    const logins = ctx.machine.system?.logins ?? [];
    ctx.out(logins.map((l) => `${l.user.padEnd(8)} ${l.tty.padEnd(12)} ${l.at} (${l.from})\n`).join(''));
    return 0;
  },
};

export const w: CommandDef = {
  name: 'w',
  category: 'system',
  doc: { summary: 'show who is logged on and what they are doing', usage: ['w'], description: 'The first line equals uptime: time, uptime, users and load average.', seeAlso: ['uptime', 'who'] },
  run(ctx) {
    const logins = ctx.machine.system?.logins ?? [];
    let out = uptimeLine(ctx) + '\nUSER     TTY      FROM             LOGIN@   IDLE   JCPU   PCPU WHAT\n';
    for (const l of logins) out += `${l.user.padEnd(8)} ${l.tty.padEnd(8)} ${l.from.padEnd(16)} ${l.at.slice(11, 16)}    0.00s  0.04s  0.00s ${l.user === ctx.user ? 'w' : '-bash'}\n`;
    ctx.out(out);
    return 0;
  },
};

export const top: CommandDef = {
  name: 'top',
  category: 'system',
  doc: {
    summary: 'display Linux processes',
    usage: ['top [-b] [-n iterations]'],
    description: 'Live view of the busiest processes: load average, CPU and memory summary, then processes sorted by %CPU. Real top refreshes every few seconds (q quits); the trainer prints one snapshot like top -b -n 1.',
    options: [['-b', 'batch mode'], ['-n N', 'number of iterations']],
    seeAlso: ['ps', 'htop', 'uptime', 'free'],
  },
  run(ctx) {
    const s = ctx.machine.system;
    const procs = [...ctx.shell.processes()].sort((x, y) => y.cpu - x.cpu);
    const cpus = s?.cpus ?? 2;
    const us = Math.min(100, procs.reduce((t, p) => t + p.cpu, 0) / cpus);
    const running = procs.filter((p) => (p.stat ?? 'S').startsWith('R')).length + 1;
    const mib = (k: number) => (k / 1024).toFixed(1).padStart(8);
    let out = uptimeLine(ctx).replace(/^ /, 'top - ') + '\n';
    out += `Tasks: ${String(procs.length + 1).padStart(3)} total, ${String(running).padStart(3)} running, ${String(procs.length + 1 - running).padStart(3)} sleeping,   0 stopped,   0 zombie\n`;
    out += `%Cpu(s): ${us.toFixed(1).padStart(4)} us,  0.7 sy,  0.0 ni, ${Math.max(0, 99.3 - us).toFixed(1).padStart(4)} id,  0.0 wa,  0.0 hi,  0.0 si,  0.0 st\n`;
    if (s) {
      out += `MiB Mem : ${mib(s.memTotal)} total, ${mib(Math.max(0, s.memTotal - s.memUsed - s.memCache))} free, ${mib(s.memUsed)} used, ${mib(s.memCache)} buff/cache\n`;
      out += `MiB Swap: ${mib(s.swapTotal)} total, ${mib(s.swapTotal - s.swapUsed)} free, ${mib(s.swapUsed)} used. ${mib(s.memTotal - s.memUsed)} avail Mem\n`;
    }
    out += '\n    PID USER      PR  NI    VIRT    RES    SHR S  %CPU  %MEM     TIME+ COMMAND\n';
    for (const p of procs) {
      const rss = p.rss ?? 4000;
      const cmd = p.command.split(' ')[0]!.split('/').pop()!.replace(/^-/, '').replace(/:$/, '');
      const shown = cmd === 'python3' || cmd === 'node' || cmd === 'java' ? `${cmd}` : cmd;
      out += `${String(p.pid).padStart(7)} ${p.user.slice(0, 8).padEnd(8)}  20   0 ${String(Math.round(rss * 2.6)).padStart(7)} ${String(rss).padStart(6)} ${String(Math.round(rss / 3)).padStart(6)} ${(p.stat ?? 'S')[0]} ${p.cpu.toFixed(1).padStart(5)} ${p.mem.toFixed(1).padStart(5)} ${`${Math.floor(p.cpu / 60)}:${String(Math.floor(p.cpu) % 60).padStart(2, '0')}.00`.padStart(9)} ${shown}\n`;
    }
    ctx.out(out);
    return 0;
  },
};

export { humanSize, ArgError };
