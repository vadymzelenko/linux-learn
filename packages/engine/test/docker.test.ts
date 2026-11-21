import { describe, expect, it } from 'vitest';
import { term } from './helpers';

const dock = { docker: {} };

describe('docker', () => {
  it('is not installed by default', () => {
    const t = term();
    expect(t.$('docker ps')).toContain("Command 'docker' not found");
    expect(t.code).toBe(127);
  });

  it('runs hello-world, pulling it first', () => {
    const t = term(dock);
    const out = t.$('docker run hello-world');
    expect(out).toContain("Unable to find image 'hello-world:latest' locally");
    expect(out).toContain('Hello from Docker!');
    expect(t.$('docker ps')).not.toContain('hello-world');
    expect(t.$('docker ps -a')).toMatch(/hello-world\s+"\/hello"\s+.*Exited \(0\)/);
    expect(t.$('docker images')).toMatch(/hello-world\s+latest\s+[0-9a-f]{12}/);
  });

  it('publishes ports: curl reaches nginx, logs record requests', () => {
    const t = term(dock);
    const id = t.$('docker run -d --name web -p 8080:80 nginx');
    expect(id.trim().split('\n').pop()).toMatch(/^[0-9a-f]{64}$/);
    expect(t.$('docker ps')).toMatch(/nginx\s+"\/docker-entrypoint\.…"|nginx\s+"nginx -g daemon/);
    expect(t.$('docker ps')).toContain('0.0.0.0:8080->80/tcp');
    expect(t.$('curl -s localhost:8080')).toContain('Welcome to nginx!');
    expect(t.$('docker logs web')).toContain('"GET / HTTP/1.1" 200');
    expect(t.$('ss -tln')).toContain(':8080');
    expect(t.$('curl localhost:9999')).toContain('Failed to connect');
    expect(t.code).toBe(7);
  });

  it('refuses duplicate names and busy ports', () => {
    const t = term(dock);
    t.$('docker run -d --name web -p 8080:80 nginx');
    expect(t.$('docker run -d --name web nginx')).toContain('Conflict. The container name "/web" is already in use');
    expect(t.$('docker run -d --name web2 -p 8080:80 nginx')).toContain('port is already allocated');
    expect(t.code).toBe(125);
  });

  it('stop, rm, rm -f and rmi conflicts', () => {
    const t = term(dock);
    t.$('docker run -d --name web nginx');
    expect(t.$('docker rm web')).toContain('container is running');
    expect(t.$('docker rmi nginx')).toContain('must force');
    t.$('docker stop web');
    expect(t.$('docker ps -a')).toMatch(/Exited \(0\)/);
    expect(t.$('docker rm web')).toBe('web\n');
    expect(t.$('docker rmi nginx')).toContain('Untagged: nginx:latest');
    t.$('docker run -d --name x nginx');
    expect(t.$('docker rm -f x')).toBe('x\n');
  });

  it('exec runs commands inside a running container', () => {
    const t = term(dock);
    t.$('docker run -d --name web nginx');
    expect(t.$('docker exec web cat /etc/nginx/nginx.conf')).toContain('worker_processes');
    expect(t.$('docker exec web ls /usr/share/nginx/html')).toContain('index.html');
    expect(t.$('docker exec web nginx -t')).toContain('syntax is ok');
    expect(t.$('docker exec web foo')).toContain('executable file not found');
    t.$('docker stop web');
    expect(t.$('docker exec web ls')).toContain('is not running');
  });

  it('postgres needs a password', () => {
    const t = term(dock);
    t.$('docker run -d --name db postgres:16');
    expect(t.$('docker ps -a')).toMatch(/Exited \(1\)/);
    expect(t.$('docker logs db')).toContain('POSTGRES_PASSWORD');
    t.$('docker rm db');
    t.$('docker run -d --name db -e POSTGRES_PASSWORD=secret postgres:16');
    expect(t.$('docker ps')).toMatch(/Up .*db/);
    expect(t.$("docker inspect -f '{{.State.Status}}' db")).toBe('running\n');
  });

  it('bind mounts serve live host files', () => {
    const t = term({ ...dock, files: { '~/site/index.html': '<h1>Mine</h1>\n' } });
    t.$('docker run -d -p 8080:80 -v ~/site:/usr/share/nginx/html nginx');
    expect(t.$('curl -s localhost:8080')).toBe('<h1>Mine</h1>\n');
    t.$('echo "<h1>v2</h1>" > ~/site/index.html');
    expect(t.$('curl -s localhost:8080')).toBe('<h1>v2</h1>\n');
  });

  it('builds an image from a Dockerfile', () => {
    const t = term({ ...dock, files: { '~/app/Dockerfile': 'FROM nginx:alpine\nCOPY index.html /usr/share/nginx/html/\n', '~/app/index.html': '<h1>Built</h1>\n' }, cwd: '~/app' });
    const out = t.$('docker build -t mysite .');
    expect(t.code).toBe(0);
    expect(out).toContain('naming to docker.io/library/mysite:latest');
    expect(t.$('docker images')).toContain('mysite');
    t.$('docker run -d -p 8081:80 mysite');
    expect(t.$('curl -s localhost:8081')).toBe('<h1>Built</h1>\n');
    t.$('rm index.html');
    expect(t.$('docker build -t broken .')).toContain('"/index.html": not found');
    expect(t.code).toBe(1);
  });

  it('compose up/ps/down', () => {
    const yml = 'services:\n  web:\n    image: nginx\n    ports:\n      - "8080:80"\n  cache:\n    image: redis:7\n';
    const t = term({ ...dock, files: { '~/shop/compose.yaml': yml }, cwd: '~/shop' });
    expect(t.$('docker compose up -d')).toContain('Container shop-web-1  Started');
    expect(t.$('docker ps')).toContain('shop-cache-1');
    expect(t.$('curl -s localhost:8080')).toContain('nginx');
    expect(t.$('docker compose ps')).toContain('shop-web-1');
    expect(t.$('docker compose down')).toContain('Network shop_default  Removed');
    expect(t.$('docker ps -a')).not.toContain('shop-');
  });

  it('needs the docker group and a running daemon', () => {
    const t = term({ docker: { group: false } });
    expect(t.$('docker ps')).toContain('permission denied while trying to connect to the Docker daemon socket');
    expect(t.$('sudo docker ps')).toContain('CONTAINER ID');
    const t2 = term({ docker: { daemon: 'inactive' } });
    expect(t2.$('docker ps')).toContain('Is the docker daemon running?');
    t2.$('sudo systemctl start docker');
    expect(t2.$('docker ps')).toContain('CONTAINER ID');
  });

  it('fixture containers and unknown images', () => {
    const t = term({ docker: { containers: [{ name: 'api', image: 'nginx', ports: ['80:80'] }, { name: 'old', image: 'redis:7', state: 'exited', exitCode: 137 }] } });
    expect(t.$('docker ps')).toContain('api');
    expect(t.$('docker ps -a')).toMatch(/Exited \(137\)/);
    expect(t.$('docker run ngnix')).toContain('pull access denied for ngnix');
    expect(t.$('docker ps -q').trim().split('\n')).toHaveLength(1);
  });
});
