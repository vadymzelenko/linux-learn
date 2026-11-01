import { describe, expect, it } from 'vitest';
import { evaluateChecks, explain, type Check } from '../src';
import { term } from './helpers';

const dock = { docker: { images: ['nginx:latest', 'alpine:latest'] } };

describe('docker: more subcommands', () => {
  it('help, version, info', () => {
    const t = term(dock);
    expect(t.$('docker')).toContain('Usage:  docker [OPTIONS] COMMAND');
    expect(t.$('docker --version')).toMatch(/^Docker version 27/);
    expect(t.$('docker version')).toContain('Server: Docker Engine');
    expect(t.$('docker info')).toContain('Images: 2');
    expect(t.$('docker frobnicate')).toContain("'frobnicate' is not a docker command");
    expect(t.$('docker container frob')).toContain('is not a docker command');
  });

  it('images, pull, tag, rmi -f, image ls aliases', () => {
    const t = term(dock);
    expect(t.$('docker images -q').trim().split('\n')).toHaveLength(2);
    expect(t.$('docker image ls')).toContain('alpine');
    expect(t.$('docker pull nginx')).toContain('Image is up to date');
    expect(t.$('docker pull redis:7')).toContain('Downloaded newer image for redis:7');
    expect(t.$('docker pull')).toContain('requires exactly 1 argument');
    expect(t.$('docker pull nosuchimage')).toContain('pull access denied');
    t.$('docker tag nginx web:1');
    expect(t.$('docker images web')).toContain('web');
    expect(t.$('docker tag nope x')).toContain('No such image');
    expect(t.$('docker tag')).toContain('requires exactly 2 arguments');
    t.$('docker run -d --name w nginx');
    expect(t.$('docker rmi -f nginx')).toContain('Untagged: nginx:latest');
    expect(t.$('docker rmi nope')).toContain('No such image');
    expect(t.$('docker rmi')).toContain('requires at least 1 argument');
  });

  it('run variants: --rm, commands, interactive shells, bad flags', () => {
    const t = term(dock);
    expect(t.$('docker run --rm alpine echo hi')).toBe('hi\n');
    expect(t.$('docker ps -a')).not.toContain('echo hi');
    expect(t.$('docker run alpine cat /etc/os-release')).toContain('Alpine Linux');
    expect(t.$('docker run -it ubuntu bash')).toContain('Interactive shells inside containers are not simulated');
    expect(t.$('docker run alpine bash')).toContain('executable file not found');
    expect(t.$('docker run --bogus nginx')).toContain('unknown flag: --bogus');
    expect(t.$('docker run -p')).toContain('flag needs an argument');
    expect(t.$('docker run -p abc nginx')).toContain('invalid publish');
    expect(t.$('docker run -v onlyone nginx')).toContain('invalid spec');
    expect(t.$('docker run')).toContain("requires at least 1 argument");
    const out = t.$('docker run --name fg nginx');
    expect(out).toContain('stopped as if you pressed Ctrl+C');
    expect(t.$('docker ps -a')).toMatch(/fg/);
    t.$('docker run -d --name vol -v data:/var/lib/data -e A=1 --restart always --network host nginx');
    expect(t.$('docker volume ls')).toContain('data');
    expect(t.$('docker inspect -f "{{.HostConfig.RestartPolicy.Name}}" vol')).toBe('always\n');
    expect(t.$("docker inspect '--format={{json .Config.Env}}' vol")).toContain('A=1');
    expect(t.$('docker create --name c1 nginx')).toMatch(/[0-9a-f]{64}/);
    expect(t.$('docker ps -a')).toMatch(/Created\s+c1/);
  });

  it('life cycle: start, restart, kill, pause, unpause, logs', () => {
    const t = term(dock);
    t.$('docker run -d --name web nginx');
    expect(t.$('docker pause web')).toBe('web\n');
    expect(t.$('docker ps')).toContain('(Paused)');
    expect(t.$('docker pause web')).toContain('is not running');
    expect(t.$('docker unpause web')).toBe('web\n');
    expect(t.$('docker restart web')).toBe('web\n');
    expect(t.$('docker kill web')).toBe('web\n');
    expect(t.$('docker ps -a')).toMatch(/Exited \(137\)/);
    expect(t.$('docker kill web')).toContain('is not running');
    expect(t.$('docker start web')).toBe('web\n');
    expect(t.$('docker logs -t --tail 1 web')).toMatch(/^\d{4}-\d\d-\d\dT/);
    expect(t.$('docker logs -f web')).toContain('-f would keep following');
    expect(t.$('docker logs')).toContain('requires exactly 1 argument');
    expect(t.$('docker logs nope')).toContain('No such container');
    expect(t.$('docker stop')).toContain('requires at least 1 argument');
    expect(t.$('docker stop nope')).toContain('No such container');
    expect(t.$('docker rm nope')).toContain('No such container');
    expect(t.$('docker stats')).toContain('MEM USAGE');
    expect(t.$('docker stats --no-stream')).toContain('web');
  });

  it('exec helpers inside containers', () => {
    const t = term({ docker: { images: ['nginx:latest', 'redis:7', 'postgres:16', 'python:3.12-slim', 'node:22-alpine'] } });
    t.$('docker run -d --name web -e MODE=prod nginx');
    expect(t.$('docker exec web env')).toContain('MODE=prod');
    expect(t.$('docker exec web printenv MODE')).toBe('prod\n');
    expect(t.$('docker exec web printenv NOPE')).toBe('');
    expect(t.$('docker exec web hostname')).toMatch(/^[0-9a-f]{12}\n$/);
    expect(t.$('docker exec web whoami')).toBe('root\n');
    expect(t.$('docker exec web pwd')).toBe('/\n');
    expect(t.$('docker exec web ps')).toContain('PID   USER');
    expect(t.$('docker exec web echo a b')).toBe('a b\n');
    expect(t.$('docker exec web uname -a')).toContain('Linux');
    expect(t.$('docker exec web cat /nope')).toContain('No such file');
    expect(t.$('docker exec web ls /etc')).toContain('os-release');
    expect(t.$('docker exec web ls /nope')).toContain('cannot access');
    expect(t.$('docker exec web ls /etc/nginx/nginx.conf')).toBe('/etc/nginx/nginx.conf\n');
    expect(t.$('docker exec web nginx -s reload')).toContain('signal process started');
    expect(t.$('docker exec web nginx')).toContain('Address already in use');
    expect(t.$("docker exec web sh -c 'echo inside'")).toBe('inside\n');
    expect(t.$('docker exec -it web sh')).toContain('Interactive shells');
    expect(t.$('docker exec web redis-cli ping')).toContain('executable file not found');
    expect(t.$('docker exec')).toContain('requires at least 2 arguments');
    expect(t.$('docker exec nope ls')).toContain('No such container');
    t.$('docker run -d --name cache redis:7');
    expect(t.$('docker exec cache redis-cli ping')).toBe('PONG\n');
    expect(t.$('docker exec cache redis-cli set a 1')).toBe('OK\n');
    t.$('docker run -d --name db -e POSTGRES_PASSWORD=x postgres:16');
    expect(t.$('docker exec db psql -c "select 1"')).toContain('(1 row)');
    expect(t.$('docker run --rm python:3.12-slim python3 --version')).toBe('Python 3.12.7\n');
    expect(t.$('docker run --rm node:22-alpine node -v')).toBe('v22.11.0\n');
    expect(t.$('curl localhost:6379')).toContain('Failed to connect');
    t.$('docker run -d --name c2 -p 6380:6379 redis:7');
    expect(t.$('curl localhost:6380')).toContain('Empty reply');
  });

  it('volumes, networks, prune and system', () => {
    const t = term(dock);
    expect(t.$('docker volume create pg')).toBe('pg\n');
    expect(t.$('docker volume create')).toMatch(/^[0-9a-f]+\n$/);
    expect(t.$('docker volume inspect pg')).toContain('/var/lib/docker/volumes/pg/_data');
    t.$('docker run -d --name db -v pg:/data nginx');
    expect(t.$('docker volume rm pg')).toContain('volume is in use');
    expect(t.$('docker volume rm nope')).toContain('no such volume');
    expect(t.$('docker volume')).toContain('Manage volumes');
    t.$('docker rm -f db');
    expect(t.$('docker volume rm pg')).toBe('pg\n');
    expect(t.$('docker network create backend')).toMatch(/^[0-9a-f]+\n$/);
    expect(t.$('docker network ls')).toContain('backend');
    expect(t.$('docker network')).toContain('Manage networks');
    t.$('docker run hello-world');
    expect(t.$('docker container prune -f')).toContain('Deleted Containers');
    expect(t.$('docker ps -aq')).toBe('');
    expect(t.$('docker image prune -a -f')).toContain('Total reclaimed space');
    expect(t.$('docker system df')).toContain('Build Cache');
    expect(t.$('docker system prune -f')).toContain('Total reclaimed space');
    expect(t.$('docker system nope')).toContain('is not a docker command');
  });

  it('build errors and compose details', () => {
    const t = term({ docker: {}, files: { '~/a/Dockerfile': 'FROM nosuch:1\n', '~/b/Dockerfile': 'FROM alpine\nFOO bar\n', '~/c/Dockerfile': 'FROM alpine\nWORKDIR /app\nCOPY src/ ./\nENV MODE=prod\nRUN echo hi\nEXPOSE 8000\nCMD ["sh", "-c", "echo ok"]\nLABEL x=y\n', '~/c/src/main.sh': 'echo main\n', '~/d/notes': 'x' } });
    expect(t.$('docker build -t x ~/a')).toContain('not found');
    expect(t.$('docker build -t x ~/b')).toContain('unknown instruction: FOO');
    expect(t.$('docker build -t x ~/d')).toContain('failed to read dockerfile');
    expect(t.$('docker build')).toContain('requires exactly 1 argument');
    expect(t.$('docker build -t app:1 ~/c')).toContain('naming to docker.io/library/app:1');
    expect(t.$('docker build -t app:1 ~/c')).toContain('naming');
    expect(t.$('docker images')).toContain('<none>');
    expect(t.$('docker run --rm app:1 cat /app/main.sh')).toBe('echo main\n');
    expect(t.$("docker inspect -f '{{.Config.WorkingDir}}' app:1")).toBe('/app\n');
    expect(t.$('docker inspect nope')).toContain('No such object');

    const yml = 'services:\n  api:\n    build: .\n    ports: ["9000:80"]\n    environment:\n      MODE: prod\n    restart: always\n  db:\n    image: postgres:16\n    environment:\n      - POSTGRES_PASSWORD=pw\n    volumes:\n      - pgdata:/var/lib/postgresql/data\n';
    const c = term({ docker: {}, cwd: '~/proj', files: { '~/proj/docker-compose.yml': yml, '~/proj/Dockerfile': 'FROM nginx:alpine\n' } });
    expect(c.$('docker compose up')).toContain('Use docker compose up -d');
    expect(c.$('docker compose ps')).toContain('proj-db-1');
    expect(c.$('docker compose logs db')).toContain('proj-db-1  |');
    expect(c.$('docker compose stop')).toContain('Stopped');
    expect(c.$('docker compose ps -a')).toContain('Exited');
    expect(c.$('docker compose start')).toContain('Started');
    expect(c.$('docker compose restart')).toContain('Started');
    expect(c.$('docker compose up -d')).toContain('Running');
    expect(c.$('docker compose config')).toContain('services:');
    expect(c.$('docker compose version')).toContain('v2.29');
    expect(c.$('docker compose')).toContain('Usage:  docker compose');
    expect(c.$('docker compose frob')).toContain('unknown docker command');
    const bad = term({ docker: {}, cwd: '~/x', files: { '~/x/compose.yaml': 'services:\n  web:\n    ports:\n      - "80:80"\n' } });
    expect(bad.$('docker compose up -d')).toContain('neither an image nor a build context');
    const none = term({ docker: {}, cwd: '~' });
    expect(none.$('docker compose up -d')).toContain('no configuration file provided');
    const conflict = term({ docker: { images: ['nginx:latest'] }, cwd: '~/y', files: { '~/y/compose.yaml': 'services:\n  web:\n    image: nginx\n    ports:\n      - "8080:80"\n' } });
    conflict.$('docker run -d -p 8080:80 nginx');
    expect(conflict.$('docker compose up -d')).toContain('port is already allocated');
  });

  it('task checks for docker', () => {
    const t = term(dock);
    t.$('docker run -d --name web -p 8080:80 nginx');
    t.$('docker run hello-world');
    const ev = (c: Check[]) => evaluateChecks(c, { session: t.session, executed: [], lastOutput: '', lastExitCode: 0 });
    expect(ev([{ type: 'containerState', name: 'web', state: 'running', image: 'nginx', hostPort: 8080 }]).passed).toBe(true);
    expect(ev([{ type: 'containerState', name: 'web', state: 'running', hostPort: 9 }]).passed).toBe(false);
    expect(ev([{ type: 'containerState', name: 'nope', state: 'absent' }]).passed).toBe(true);
    expect(ev([{ type: 'containerState', name: 'nope', state: 'running' }]).passed).toBe(false);
    expect(ev([{ type: 'imageExists', name: 'hello-world' }, { type: 'imageExists', name: 'nginx:latest' }, { type: 'imageExists', name: 'redis', exists: false }]).passed).toBe(true);
    expect(ev([{ type: 'containerCount', eq: 2 }, { type: 'containerCount', eq: 1, running: true }, { type: 'containerCount', min: 1, max: 3 }]).passed).toBe(true);
  });
});

describe('explain: roles and localization keys', () => {
  const kinds = (l: string) => explain(l).parts.map((p) => `${p.kind}:${p.text}${p.key ? ':' + p.key : ''}${p.spec ? '|' + p.spec : ''}`);
  it('decodes arguments by role', () => {
    expect(kinds('grep -rn TODO src/')).toEqual(expect.arrayContaining(['arg:TODO:explain.arg.pattern', 'arg:src/:explain.arg.relPath']));
    expect(kinds("sed -n '2,4p' f")).toContain("arg:'2,4p':explain.arg.sedPrint");
    expect(kinds("sed '/^#/d' f")).toContain("arg:'/^#/d':explain.arg.sedDelete");
    expect(kinds("sed '3d' f")).toContain("arg:'3d':explain.arg.sedDeleteLines");
    expect(kinds("sed 'y/a/b/' f")).toContain("arg:'y/a/b/':explain.arg.sedScript");
    expect(kinds("sed -e 's/a/b/' f")[2]).toMatch(/^value/);
    expect(kinds("awk '$3 > 5 {print $1}' f")).toContain("arg:'$3 > 5 {print $1}':explain.arg.awkCondPrint");
    expect(kinds("awk 'END {print NR}' f")).toContain("arg:'END {print NR}':explain.arg.awkCondPrint");
    expect(kinds("awk 'BEGIN{x=1}' f")).toContain("arg:'BEGIN{x=1}':explain.arg.awkProgram");
    expect(kinds('chown :web f')).toContain('arg::web:explain.arg.groupOnly');
    expect(kinds('chown bob f')).toContain('arg:bob:explain.arg.owner');
    expect(kinds('kill -TERM %1')).toEqual(['command:kill', 'flag:-TERM:explain.signal.TERM', 'arg:%1:explain.arg.job']);
    expect(kinds('kill -USR1 5')[1]).toBe('flag:-USR1:explain.signal');
    expect(kinds('ln -s /var/log logs')).toEqual(expect.arrayContaining(['arg:/var/log:explain.arg.linkTarget', 'arg:logs:explain.arg.linkName']));
    expect(kinds('mv a.txt b.txt')).toEqual(expect.arrayContaining(['arg:a.txt:explain.arg.mvSource', 'arg:b.txt:explain.arg.mvDest']));
    expect(kinds('mkdir -p a/b')).toContain('arg:a/b:explain.arg.newDir');
    expect(kinds('ping -c 3 10.0.0.1')).toContain('arg:10.0.0.1:explain.arg.ip');
    expect(kinds('ping db01')).toContain('arg:db01:explain.arg.host');
    expect(kinds('nc -zv db01 5432')).toContain('arg:5432:explain.arg.port');
    expect(kinds('curl -s https://x.io/a')).toContain('arg:https://x.io/a:explain.arg.url');
    expect(kinds('printf "%s\\n" a')).toEqual(expect.arrayContaining(['arg:"%s\\n":explain.arg.format', 'arg:a:explain.arg.text']));
    expect(kinds('seq 5')).toContain('arg:5:explain.arg.number');
    expect(kinds('sleep 2')).toContain('arg:2:explain.arg.seconds');
    expect(kinds('useradd -m anna')).toContain('arg:anna:explain.arg.username');
    expect(kinds('groupadd web')).toContain('arg:web:explain.arg.groupname');
    expect(kinds('man ls')).toContain('arg:ls:explain.arg.commandName');
    expect(kinds('export A=1')).toContain('arg:A=1:explain.arg.exportAssign');
    expect(kinds('export A')).toContain('arg:A:explain.arg.varName');
    expect(kinds("alias ll='ls -l'")).toContain("arg:ll='ls -l':explain.arg.aliasDef");
    expect(kinds('alias ll')).toContain('arg:ll:explain.arg.commandName');
    expect(kinds('source ~/.bashrc')).toContain('arg:~/.bashrc:explain.arg.script');
    expect(kinds('tr a-z A-Z')).toContain('arg:a-z:explain.arg.charSet');
    expect(kinds('pkill -f node')).toContain('arg:node:explain.arg.procName');
    expect(kinds('service nginx restart')).toEqual(['command:service', 'arg:nginx:explain.arg.unit', 'subcommand:restart:explain.serviceAction']);
    expect(kinds('cat - $(date) "x y" ../a .. "*.log"')).toEqual(['command:cat', 'arg:-:explain.arg.stdin', 'arg:$(date):explain.arg.cmdSubst', 'arg:"x y":explain.arg.string', 'arg:../a:explain.arg.relPath', 'arg:..:explain.arg.parent', 'arg:"*.log":explain.arg.quotedGlob']);
  });

  it('wrappers, find, test, loops and redirections', () => {
    expect(kinds('sudo -u bob ls')).toEqual(['command:sudo', 'flag:-u|-u user', 'value:bob:explain.optionValue', 'command:ls']);
    expect(kinds('env A=1 printenv A')[1]).toBe('assignment:A=1:explain.envAssign');
    expect(kinds('find . -type f | xargs -n 1 wc -l')).toContain('command:wc');
    expect(kinds("find . ! -name '*.c' -o '(' -empty ')' -exec ls {} +")).toEqual(expect.arrayContaining(['operator:!:explain.find.not', 'operator:-o:explain.find.or', "operator:'(':explain.find.group", 'operator:+:explain.find.execPlus', 'arg:{}:explain.find.placeholder']));
    expect(kinds('test -n "$X"')[1]).toMatch(/^flag:-n/);
    expect(kinds('[ "$a" = b ]')).toContain('keyword:]:explain.testClose');
    expect(kinds('while read l; do echo $l; done < f')).toEqual(expect.arrayContaining(['keyword:while:explain.kw.while', 'redirect:<:explain.redir.in', 'arg:f:explain.redirSource']));
    expect(kinds('until false; do break; done')[0]).toBe('keyword:until:explain.kw.until');
    expect(kinds('if true; then :; elif false; then :; fi')).toContain('keyword:elif:explain.kw.elif');
    expect(kinds('{ ls; pwd; } > out 2>&1')).toEqual(expect.arrayContaining(['keyword:{:explain.kw.group', 'keyword:}:explain.kw.groupEnd', 'redirect:2>&1:explain.redir.errToOut']));
    expect(kinds('ls &> all; ls >> f; ls 2>> e; ls &')).toEqual(expect.arrayContaining(['redirect:&>:explain.redir.both', 'redirect:>>:explain.redir.append', 'redirect:2>>:explain.redir.errAppend', 'operator:&:explain.op.bg']));
    expect(kinds('X=1')).toEqual(['assignment:X=1:explain.assignment']);
    expect(kinds('ls -- -x')).toContain('flag:--:explain.endOfOptions');
    expect(kinds('frobnicate')).toEqual(['unknown:frobnicate:explain.unknownCommand']);
    expect(explain('echo "unterminated').error).toBeTruthy();
    expect(kinds('tail -5 f')).toContain('flag:-5:explain.lastLines');
    expect(kinds('ls --sort=size')).toContain('flag:--sort=size:explain.option');
    expect(kinds('grep --max-count 2 x f')).toContain('value:2:explain.optionValue');
    expect(kinds('ps -ef')[1]).toBe('flag:-ef');
    expect(kinds('journalctl -u nginx -n 5')).toContain('value:nginx:explain.optionValue');
    expect(kinds('ip -br link show')).toEqual(['command:ip', 'flag:-br|-br, -brief', 'subcommand:link:explain.ip.link', 'subcommand:show:explain.ipCmd']);
    expect(kinds('ip foo')).toContain('subcommand:foo:explain.subcommand');
    expect(kinds('systemctl status nginx ssh')).toContain('arg:ssh:explain.arg.unit');
  });

  it('docker parts', () => {
    expect(kinds('docker pull nginx:1.27')).toContain('arg:nginx:1.27:explain.arg.image');
    expect(kinds('docker logs --tail 5 web')).toEqual(expect.arrayContaining(['value:5:explain.optionValue', 'arg:web:explain.arg.container']));
    expect(kinds("docker inspect -f '{{.State.Status}}' web")).toContain("value:'{{.State.Status}}':explain.optionValue");
    expect(kinds('docker run --rm alpine frob')).toContain('unknown:frob:explain.arg.inContainer');
    expect(kinds('docker exec web frob')).toContain('unknown:frob:explain.arg.inContainer');
    expect(kinds('docker tag a b')).toContain('arg:b:explain.arg.image');
    expect(kinds('docker volume ls')[1]).toMatch(/^subcommand:volume/);
    expect(kinds('docker frob x')).toContain('arg:x:explain.arg.plain');
  });
});
