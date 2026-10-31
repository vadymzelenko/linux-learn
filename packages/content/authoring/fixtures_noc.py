"""NOC machines: a healthy production web server and a busy, struggling one."""
import random
from lib import fixture

random.seed(2026)

H = 'web01'


def access_log(n=150, bad_ip=None, five_xx=0, start_min=0):
    ips = ['203.0.113.10', '198.51.100.23', '192.0.2.44', '203.0.113.77', '198.51.100.5', '192.0.2.150']
    paths = ['/', '/login', '/api/items', '/api/cart', '/static/app.js', '/static/style.css', '/health']
    out = []
    for i in range(n):
        ip = bad_ip if bad_ip and i % 3 == 0 else random.choice(ips)
        path = random.choice(paths)
        code = 200
        r = random.random()
        if r < 0.05: code = 404
        elif r < 0.08: code = 301
        if five_xx and i >= n - five_xx: code = random.choice([502, 502, 503, 500])
        m = start_min + i // 6
        out.append(f'{ip} - - [31/Oct/2026:10:{m:02d}:{(i * 7) % 60:02d} +0000] "GET {path} HTTP/1.1" {code} {random.randint(150, 9000)} "-" "Mozilla/5.0"')
    return '\n'.join(out) + '\n'


def syslog(extra=()):
    base = [
        f'Oct 31 09:00:01 {H} systemd[1]: Started cron.service - Regular background program processing daemon.',
        f'Oct 31 09:00:02 {H} systemd[1]: Started nginx.service - A high performance web server and a reverse proxy server.',
        f'Oct 31 09:00:03 {H} systemd[1]: Started postgresql.service - PostgreSQL RDBMS.',
        f'Oct 31 09:00:04 {H} systemd[1]: Started api.service - Shop API (node).',
        f'Oct 31 09:30:01 {H} CRON[2201]: (root) CMD (/usr/local/bin/backup.sh)',
        f'Oct 31 10:00:01 {H} CRON[2412]: (root) CMD (/usr/local/bin/backup.sh)',
        f'Oct 31 10:15:22 {H} kernel: [ 9213.442] eth0: link up, 1000 Mbps, full duplex',
    ]
    return '\n'.join(list(base) + list(extra)) + '\n'


AUTH = '\n'.join([
    f'Oct 31 09:05:12 {H} sshd[1190]: Accepted publickey for student from 192.168.1.10 port 52344 ssh2',
    *[f'Oct 31 10:{m:02d}:{s:02d} {H} sshd[{3000 + m}]: Failed password for invalid user admin from 45.155.205.{m} port {40000 + m} ssh2' for m, s in [(2, 11), (2, 14), (3, 1), (3, 9), (4, 30), (5, 2), (7, 45), (9, 13)]],
    f'Oct 31 10:12:40 {H} sudo:  student : TTY=pts/0 ; PWD=/home/student ; USER=root ; COMMAND=/usr/bin/systemctl restart nginx',
]) + '\n'

NGINX_CONF = '''user www-data;
worker_processes auto;

events { worker_connections 768; }

http {
    server {
        listen 80;
        server_name shop.example.com;
        location / { proxy_pass http://127.0.0.1:3000; }
    }
}
'''

RUNBOOK_NGINX = '''# Runbook: website down (HTTP 5xx / no answer)

1. Confirm: curl -I http://localhost   (expect HTTP 200)
2. Is nginx running?  systemctl status nginx
3. Is the backend running?  systemctl status api ; curl localhost:3000/health
4. Read the errors:  journalctl -u nginx -n 20 ; tail -n 20 /var/log/nginx/error.log
5. Fix the cause, then: sudo systemctl restart nginx
6. Verify again with curl and write the timeline in the ticket.
Escalate to L2 (#web-oncall) if not fixed in 15 minutes.
'''

RUNBOOK_DISK = '''# Runbook: disk almost full (> 90%)

1. Which filesystem?  df -h
2. What is big?  sudo du -sh /var/log/* | sort -h
3. Old rotated logs (*.gz, *.1) may be deleted; NEVER delete the live log of a running service.
4. Large core dumps in /var/crash can be removed after informing L2.
5. Check again with df -h and note the freed space in the ticket.
'''

services = [
    {"name": "nginx", "description": "A high performance web server and a reverse proxy server", "state": "active", "enabled": True, "pid": 901, "port": 80, "user": "www-data",
     "logs": [f'Oct 31 09:00:02 {H} systemd[1]: Starting nginx.service - A high performance web server and a reverse proxy server...', f'Oct 31 09:00:02 {H} systemd[1]: Started nginx.service - A high performance web server and a reverse proxy server.'],
     "config": {"path": "/etc/nginx/nginx.conf", "mustContain": "listen 80;", "error": "nginx: [emerg] no \"listen\" directive in /etc/nginx/nginx.conf"},
     "http": {"/": {"status": 200, "body": "<!doctype html><title>Shop</title><h1>Welcome to the shop</h1>\n", "headers": {"Server": "nginx/1.24.0 (Ubuntu)", "Content-Type": "text/html"}},
              "/health": {"status": 200, "body": "OK\n", "headers": {"Server": "nginx/1.24.0 (Ubuntu)"}}}},
    {"name": "api", "description": "Shop API (node)", "state": "active", "enabled": True, "pid": 1001, "port": 3000, "bind": "127.0.0.1", "user": "www-data",
     "logs": [f'Oct 31 09:00:04 {H} systemd[1]: Started api.service - Shop API (node).', f'Oct 31 09:00:05 {H} node[1001]: listening on 127.0.0.1:3000'],
     "http": {"/health": {"status": 200, "body": "{\"status\":\"ok\",\"db\":\"up\"}\n", "headers": {"Content-Type": "application/json"}}, "/": {"status": 200, "body": "{\"items\":42}\n"}}},
    {"name": "postgresql", "description": "PostgreSQL RDBMS", "state": "active", "enabled": True, "pid": 700, "port": 5432, "bind": "127.0.0.1", "user": "postgres",
     "logs": [f'Oct 31 09:00:03 {H} systemd[1]: Started postgresql.service - PostgreSQL RDBMS.']},
]

processes = [
    {"pid": 1, "user": "root", "command": "/sbin/init", "cpu": 0.0, "mem": 0.3, "rss": 12400, "stat": "Ss", "start": "09:00"},
    {"pid": 412, "user": "root", "command": "/usr/sbin/cron -f", "cpu": 0.0, "mem": 0.1, "rss": 2800, "stat": "Ss", "start": "09:00"},
    {"pid": 538, "user": "root", "command": "sshd: /usr/sbin/sshd -D", "cpu": 0.0, "mem": 0.2, "rss": 8100, "stat": "Ss", "start": "09:00"},
    {"pid": 700, "user": "postgres", "command": "/usr/lib/postgresql/16/bin/postgres -D /var/lib/postgresql/16/main", "cpu": 1.2, "mem": 3.1, "rss": 126000, "stat": "Ss", "start": "09:00"},
    {"pid": 901, "user": "www-data", "command": "nginx: master process /usr/sbin/nginx", "cpu": 0.1, "mem": 0.4, "rss": 9800, "stat": "Ss", "start": "09:00"},
    {"pid": 1001, "user": "www-data", "command": "node /srv/api/server.js", "cpu": 3.4, "mem": 6.2, "rss": 251000, "stat": "Sl", "start": "09:00"},
    {"pid": 1200, "user": "student", "command": "-bash", "cpu": 0.0, "mem": 0.1, "rss": 5200, "stat": "Ss", "start": "09:05"},
]

network = {"hosts": [
    {"name": "db01", "ip": "10.0.2.30", "latency": 0.6, "ports": {"5432": "postgresql", "22": "ssh"}, "hops": []},
    {"name": "cache01", "ip": "10.0.2.31", "latency": 0.5, "ports": {"6379": "redis", "22": "ssh"}},
    {"name": "monitoring", "ip": "10.0.2.5", "latency": 0.4, "ports": {"9090": "websm", "3000": "grafana"}, "http": {"/": {"status": 200, "body": "Grafana\n"}}},
    {"name": "payments.partner.net", "ip": "198.51.100.200", "latency": 48, "ports": {"443": "https"}, "hops": ["_gateway 10.0.2.2", "100.64.0.1", "core1.isp.net 203.0.113.1", "edge.partner.net 198.51.100.1"], "http": {"/status": {"status": 200, "body": "{\"payments\":\"ok\"}\n"}}},
]}

files = {
    "/var/log/syslog": {"content": syslog(), "owner": "root", "mode": "644"},
    "/var/log/auth.log": {"content": AUTH, "owner": "root", "mode": "640", "group": "adm"},
    "/var/log/nginx/access.log": {"content": access_log(), "owner": "www-data", "mode": "644"},
    "/var/log/nginx/access.log.1": {"content": access_log(60), "owner": "www-data", "mode": "644"},
    "/var/log/nginx/error.log": {"content": f'2026/10/31 10:11:03 [error] 912#912: *311 upstream timed out (110: Connection timed out) while reading response header from upstream, client: 203.0.113.10, server: shop.example.com, request: "GET /api/cart HTTP/1.1"\n', "owner": "www-data", "mode": "644"},
    "/etc/nginx/nginx.conf": {"content": NGINX_CONF, "owner": "root", "mode": "644"},
    "/etc/hosts": {"content": f"127.0.0.1\tlocalhost\n127.0.1.1\t{H}\n10.0.2.30\tdb01\n10.0.2.31\tcache01\n", "owner": "root", "mode": "644"},
    "~/runbooks/website-down.md": RUNBOOK_NGINX,
    "~/runbooks/disk-full.md": RUNBOOK_DISK,
    "~/notes/oncall.txt": "On-call this week: L2 web = Olena (#web-oncall), L2 db = Marek (#db-oncall)\nSeverity P1: page immediately. P2: within 15 min. P3/P4: ticket.\n",
}

fixture('noc-web01', {
    "hostname": H,
    "files": files,
    "services": services,
    "processes": processes,
    "network": network,
    "system": {"load": [0.42, 0.38, 0.30], "cpus": 2, "memTotal": 4015000, "memUsed": 1630000, "memCache": 1120000},
    "disks": [
        {"filesystem": "/dev/sda1", "size": 30830588, "used": 18930000, "mount": "/", "type": "ext4"},
        {"filesystem": "/dev/sdb1", "size": 10255636, "used": 4100000, "mount": "/var/lib/postgresql", "type": "ext4"},
        {"filesystem": "tmpfs", "size": 1015404, "used": 0, "mount": "/dev/shm", "type": "tmpfs"},
    ],
})

# ---------------------------------------------------------------- a struggling server
busy_procs = [p for p in processes if p["pid"] != 1001] + [
    {"pid": 1001, "user": "www-data", "command": "node /srv/api/server.js", "cpu": 12.0, "mem": 7.1, "rss": 290000, "stat": "Sl", "start": "09:00"},
    {"pid": 4711, "user": "student", "command": "python3 /home/student/report_generator.py", "cpu": 187.5, "mem": 41.3, "rss": 1690000, "stat": "R", "start": "10:41"},
    {"pid": 4800, "user": "root", "command": "gzip -9 /var/log/app/debug.log", "cpu": 8.1, "mem": 0.1, "rss": 2100, "stat": "R", "start": "10:44"},
]
fixture('noc-busy', {
    "hostname": H,
    "files": {
        **files,
        "/var/log/app/debug.log": {"content": "DEBUG very chatty line\n" * 40, "size": 8_589_934_592, "owner": "root"},
        "/var/log/app/debug.log.1.gz": {"content": "(binary)", "size": 2_147_483_648, "owner": "root"},
        "/var/crash/api.core": {"content": "(binary)", "size": 3_221_225_472, "owner": "root"},
        "~/report_generator.py": "# heavy report, should run at night\nimport time\nwhile True: pass\n",
    },
    "services": services,
    "processes": busy_procs,
    "network": network,
    "system": {"load": [7.82, 6.95, 4.10], "cpus": 2, "memTotal": 4015000, "memUsed": 3650000, "memCache": 180000, "swapTotal": 2097148, "swapUsed": 1460000},
    "disks": [
        {"filesystem": "/dev/sda1", "size": 30830588, "used": 29120000, "mount": "/", "type": "ext4"},
        {"filesystem": "/dev/sdb1", "size": 10255636, "used": 4100000, "mount": "/var/lib/postgresql", "type": "ext4"},
    ],
})
