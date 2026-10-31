import { describe, expect, it } from 'vitest';
import { evaluateChecks, type MachineSpec } from '../src';
import { term } from './helpers';

const broken: MachineSpec = {
  hostname: 'web01',
  services: [
    {
      name: 'nginx',
      description: 'A high performance web server and a reverse proxy server',
      state: 'failed',
      enabled: true,
      pid: 901,
      port: 80,
      user: 'www-data',
      logs: ['Oct 31 09:00:02 web01 nginx[901]: nginx: [emerg] unknown directive "servr_name"'],
      config: { path: '/etc/nginx/nginx.conf', mustNotContain: 'servr_name', error: 'nginx: [emerg] unknown directive "servr_name"' },
      http: { '/': { status: 200, body: 'ok\n' }, '/health': { status: 503, body: 'down\n' }, '/api': { status: 200, body: 'api\n', upstream: 'postgresql' } },
    },
    { name: 'postgresql', description: 'PostgreSQL RDBMS', state: 'active', enabled: false, pid: 700, port: 5432, bind: '127.0.0.1', user: 'postgres', logs: [] },
    { name: 'dns-cache', description: 'Local DNS cache', state: 'active', enabled: true, pid: 710, port: 53, proto: 'udp', logs: [] },
  ],
  network: {
    hosts: [
      { name: 'db01', ip: '10.0.2.30', latency: 0.6, ports: { '5432': 'postgresql' } },
      { name: 'old-api', ip: '10.0.2.40', up: false, hops: ['_gateway 10.0.2.2'] },
      { name: 'flaky', ip: '10.0.2.50', loss: 50, ports: {} },
      { name: 'internal.corp', ip: '10.0.9.9', dns: false, ports: { '80': 'http' } },
    ],
  },
  files: {
    '/etc/nginx/nginx.conf': { content: 'server {\n  servr_name _;\n}\n', owner: 'root' },
    '/etc/hosts': { content: '127.0.0.1 localhost\n10.0.9.9 internal.corp\n', owner: 'root' },
  },
  system: { load: [3.5, 2.1, 1.2], cpus: 2 },
};

describe('network commands', () => {
  it('ping: reachable, down, lossy, unknown, local', () => {
    const t = term(broken);
    const ok = t.$('ping -c 3 db01');
    expect(ok).toContain('PING db01 (10.0.2.30) 56(84) bytes of data.');
    expect(ok).toContain('3 packets transmitted, 3 received, 0% packet loss');
    expect(ok).toMatch(/rtt min\/avg\/max\/mdev = [\d.]+\/[\d.]+\/[\d.]+\/[\d.]+ ms/);
    expect(t.code).toBe(0);
    expect(t.$('ping -c 2 old-api')).toContain('2 packets transmitted, 0 received, 100% packet loss');
    expect(t.code).toBe(1);
    expect(t.$('ping -c 4 flaky')).toMatch(/[1-3] received/);
    expect(t.$('ping nosuch')).toBe('ping: nosuch: Name or service not known\n');
    expect(t.code).toBe(2);
    expect(t.$('ping -c 1 localhost')).toContain('time=0.0');
    expect(t.$('ping -q -c 1 db01')).not.toContain('icmp_seq');
    expect(t.$('ping')).toContain('Destination address required');
  });
  it('traceroute', () => {
    const t = term(broken);
    expect(t.$('traceroute example.com')).toMatch(/^traceroute to example.com \(93\.184\.215\.14\), 30 hops max/);
    expect(t.$('traceroute -n old-api')).toContain(' 8  * * *');
    expect(t.$('traceroute localhost')).toContain('localhost (127.0.0.1)');
    expect(t.$('traceroute nosuch')).toContain('Name or service not known');
    expect(t.$('traceroute')).toContain('missing argument');
  });
  it('ip a / r / link', () => {
    const t = term(broken);
    expect(t.$('ip a')).toContain('inet 10.0.2.15/24 brd 10.0.2.255 scope global dynamic eth0');
    expect(t.$('ip -br a')).toContain('eth0             UP');
    expect(t.$('ip r')).toBe('default via 10.0.2.2 dev eth0 proto dhcp metric 100 \n10.0.2.0/24 dev eth0 proto kernel scope link src 10.0.2.15 metric 100 \n');
    expect(t.$('ip link')).toContain('state UP mode DEFAULT');
    expect(t.$('ip')).toContain('Usage: ip');
    expect(t.$('ip foo')).toContain('Object "foo" is unknown');
    const down = term({ network: { interfaces: [{ name: 'eth0', cidr: '192.168.0.5/16', mac: 'aa:bb:cc:dd:ee:ff', up: false }] } });
    expect(down.$('ip a')).toContain('state DOWN');
    expect(down.$('ip r')).toBe('');
    expect(down.$('hostname -I')).toBe('10.0.2.15 \n');
  });
  it('ss and netstat', () => {
    const t = term(broken);
    const ss = t.$('ss -tuln');
    expect(ss).toContain('0.0.0.0:22');
    expect(ss).toContain('127.0.0.1:5432');
    expect(ss).toContain('udp   UNCONN');
    expect(ss).not.toContain(':80');
    expect(t.$('ss -tl')).toContain(':ssh');
    expect(t.$('ss -t')).toContain('ESTAB');
    expect(t.$('ss -tlp')).not.toContain('users:');
    expect(t.$('sudo ss -tlpn')).toContain('users:(("postgres');
    expect(t.$('ss -ta')).toContain('ESTAB');
    expect(t.$('netstat -tlnp')).toContain('Active Internet connections (only servers)');
    expect(t.$('sudo netstat -tulpn')).toContain('538/sshd');
    expect(t.$('netstat -t')).toContain('ESTABLISHED');
  });
  it('dig / nslookup / host ignore /etc/hosts', () => {
    const t = term(broken);
    expect(t.$('dig github.com')).toContain('github.com.\t\t300\tIN\tA\t140.82.121.4');
    expect(t.$('dig internal.corp')).toContain('status: NXDOMAIN');
    expect(t.$('dig +short internal.corp')).toBe('');
    expect(t.$('nslookup example.com')).toContain('Address: 93.184.215.14');
    expect(t.$('nslookup internal.corp')).toContain("server can't find internal.corp: NXDOMAIN");
    expect(t.$('nslookup')).toContain('give a name');
    expect(t.$('host internal.corp')).toBe('Host internal.corp not found: 3(NXDOMAIN)\n');
    expect(t.$('host')).toContain('Usage: host');
    // ping uses /etc/hosts
    expect(t.$('ping -c 1 internal.corp')).toContain('10.0.9.9');
  });
  it('curl / wget / nc', () => {
    const t = term(broken);
    expect(t.$('curl -s http://example.com')).toContain('Example Domain');
    expect(t.$('curl -I https://example.com')).toMatch(/^HTTP\/1\.1 200 OK\n/);
    expect(t.$('curl localhost')).toBe("curl: (7) Failed to connect to localhost port 80 after 2 ms: Couldn't connect to server\n");
    expect(t.code).toBe(7);
    expect(t.$('curl http://old-api')).toContain('curl: (28)');
    expect(t.$('curl nosuch.example')).toBe('curl: (6) Could not resolve host: nosuch.example\n');
    expect(t.$('curl')).toContain('try');
    expect(t.$('curl -s -o page.html http://example.com && cat page.html')).toContain('Example Domain');
    expect(t.$('curl -s -o /dev/null -w "%{http_code}" http://internal.corp/missing')).toBe('404');
    expect(t.$('curl -f http://internal.corp/missing')).toContain('(22) The requested URL returned error: 404');
    expect(t.$('curl -v http://internal.corp/')).toContain('> GET / HTTP/1.1');
    expect(t.$('curl -i http://internal.corp/')).toContain('HTTP/1.1 200 OK');
    expect(t.$('wget -q -O got.html http://example.com; cat got.html')).toContain('Example Domain');
    expect(t.$('wget http://example.com/missing')).toContain('ERROR 404');
    expect(t.$('wget nosuch.tld')).toContain('unable to resolve');
    expect(t.$('wget localhost')).toContain('Connection refused');
    expect(t.$('wget')).toContain('missing URL');
    expect(t.$('nc -zv db01 5432')).toBe('Connection to db01 (10.0.2.30) 5432 port [tcp/postgresql] succeeded!\n');
    expect(t.$('nc -zv db01 3306')).toContain('Connection refused');
    expect(t.$('nc -zv old-api 80')).toContain('timed out');
    expect(t.$('nc -zv nosuch 80')).toContain('Name or service not known');
    expect(t.$('nc localhost')).toContain('usage: nc');
  });
});

describe('services', () => {
  it('fix a broken nginx config and restart', () => {
    const t = term(broken);
    expect(t.$('systemctl --failed')).toContain('● nginx.service');
    expect(t.$('systemctl status nginx')).toContain('Active: failed (Result: exit-code)');
    expect(t.code).toBe(3);
    expect(t.$('systemctl restart nginx')).toContain('Interactive authentication required');
    expect(t.$('sudo systemctl restart nginx')).toContain('Job for nginx.service failed');
    expect(t.$('journalctl -u nginx -p err')).toContain('unknown directive');
    t.$("sudo sed -i 's/servr_name/server_name/' /etc/nginx/nginx.conf");
    expect(t.$('sudo systemctl restart nginx')).toBe('');
    expect(t.$('systemctl is-active nginx')).toBe('active\n');
    expect(t.$('curl -s localhost')).toBe('ok\n');
    expect(t.$('curl -s -o /dev/null -w "%{http_code}" localhost/health')).toBe('503');
    expect(t.$('systemctl status nginx')).toMatch(/Active: active \(running\) since .*; 0s ago/);
    expect(t.$('ss -tln')).toContain(':80');
    expect(t.$('curl -s localhost/api')).toBe('api\n');
    t.$('sudo systemctl stop postgresql');
    expect(t.$('curl -I localhost/api')).toContain('HTTP/1.1 502 Bad Gateway');
    expect(t.$('ps aux | grep -c nginx')).toBe('1\n');
    expect(t.$('journalctl -u nginx -n 1')).toContain('Started nginx.service');
    const ev = evaluateChecks([{ type: 'serviceState', name: 'nginx', state: 'active' }], { session: t.session, executed: [], lastOutput: '', lastExitCode: 0 });
    expect(ev.passed).toBe(true);
  });
  it('stop, start, enable, list, service wrapper, unknown units', () => {
    const t = term(broken);
    t.$('sudo systemctl stop postgresql');
    expect(t.$('systemctl is-active postgresql')).toBe('inactive\n');
    expect(t.$('nc -zv localhost 5432')).toContain('refused');
    t.$('sudo service postgresql start');
    expect(t.$('systemctl is-active postgresql')).toBe('active\n');
    expect(t.$('sudo systemctl start postgresql')).toBe('');
    expect(t.$('systemctl is-enabled postgresql')).toBe('disabled\n');
    expect(t.$('sudo systemctl enable postgresql')).toContain('Created symlink');
    expect(t.$('sudo systemctl disable postgresql')).toContain('Removed');
    expect(t.$('sudo systemctl reload postgresql')).toBe('');
    t.$('sudo systemctl stop postgresql');
    expect(t.$('sudo systemctl reload postgresql')).toContain('invalid');
    expect(t.$('systemctl status postgresql')).toContain('inactive (dead) since');
    expect(t.$('systemctl list-units --type=service')).toContain('loaded units listed');
    expect(t.$('systemctl list-unit-files')).toContain('unit files listed');
    expect(t.$('systemctl')).toContain('UNIT');
    expect(t.$('systemctl status nosuch')).toBe('Unit nosuch.service could not be found.\n');
    expect(t.$('systemctl is-active nosuch')).toBe('inactive\n');
    expect(t.$('sudo systemctl restart nosuch')).toContain('not found');
    expect(t.$('systemctl status')).toContain('Too few arguments');
    expect(t.$('systemctl frobnicate nginx')).toContain('Unknown command verb');
    expect(t.$('service')).toContain('Usage: service');
    expect(t.$('journalctl -u nosuch')).toBe('-- No entries --\n');
    expect(t.$('journalctl -r -n 1')).not.toBe('');
    expect(t.$('journalctl --unit=ssh -e')).toContain('ssh');
  });
});

describe('monitoring', () => {
  it('uptime, nproc, free, who, w, top', () => {
    const t = term(broken);
    expect(t.$('uptime')).toBe(' 12:00:00 up 3 days,  2:14,  1 user,  load average: 3.50, 2.10, 1.20\n');
    expect(t.$('uptime -p')).toBe('up 3 days, 2 hours, 14 minutes\n');
    expect(t.$('uptime -s')).toBe('2026-10-28 09:46:00\n');
    expect(t.$('nproc')).toBe('2\n');
    expect(t.$('free -h')).toContain('Mem:          3.8Gi');
    expect(t.$('free -m')).toContain('3920');
    expect(t.$('free -g')).toContain('Mem:              3');
    expect(t.$('free')).toContain('4015000');
    expect(t.$('who')).toBe('student  pts/0        2026-10-31 09:05 (192.168.1.10)\n');
    expect(t.$('w')).toContain('USER     TTY      FROM');
    const top = t.$('top -b -n 1');
    expect(top).toMatch(/^top - 12:00:00 up 3 days/);
    expect(top).toContain('%Cpu(s)');
    expect(top).toContain('sshd');
    expect(t.$('ps aux --sort=-%mem | head -2 | tail -1')).toContain('init');
    expect(t.$('ps aux --sort -pid | head -2 | tail -1')).toContain('ps aux');
    expect(t.$('ps aux --sort=%mem | head -2 | tail -1')).toContain('cron');
  });
});
