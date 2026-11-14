import { describe, expect, it } from 'vitest';
import { evaluateChecks, type Check } from '../src';
import { term } from './helpers';

const lab = { docker: { images: ['nginx:latest', 'redis:7', 'alpine:latest'], containers: [{ name: 'web', image: 'nginx' }, { name: 'cache', image: 'redis:7' }] } };

describe('docker: networks, rename, shared tags', () => {
  it('names resolve only on a shared user-defined network', () => {
    const t = term(lab);
    expect(t.$('docker exec web getent hosts cache')).toBe('');
    expect(t.code).toBe(2);
    expect(t.$('docker exec cache redis-cli -h web ping')).toContain('Name or service not known');
    t.$('docker network create shop');
    expect(t.$('docker network create shop')).toContain('already exists');
    t.$('docker network connect shop web');
    expect(t.$('docker network connect shop web')).toContain('already exists in network shop');
    t.$('docker network connect shop cache');
    expect(t.$('docker exec web getent hosts cache')).toMatch(/^172\.18\.0\.\d+\s+cache\n$/);
    expect(t.$('docker exec web getent hosts web')).toMatch(/^172\.17\.0\.\d+/);
    expect(t.$('docker exec web getent hosts localhost')).toContain('localhost');
    expect(t.$('docker exec web getent')).toContain('Usage');
    expect(t.$('docker exec cache redis-cli -h web ping')).toContain('Connection refused');
    expect(t.$('docker exec cache redis-cli -h cache ping')).toBe('PONG\n');
    const inspect = JSON.parse(t.$('docker network inspect shop'));
    expect(Object.values(inspect[0].Containers).map((c) => (c as { Name: string }).Name).sort()).toEqual(['cache', 'web']);
    expect(JSON.parse(t.$('docker inspect web'))[0].NetworkSettings.Networks).toHaveProperty('shop');
    const checks: Check[] = [{ type: 'containerState', name: 'cache', state: 'running', network: 'shop' }];
    expect(evaluateChecks(checks, { session: t.session, executed: [], lastOutput: '', lastExitCode: 0 }).passed).toBe(true);
    expect(evaluateChecks([{ type: 'containerState', name: 'web', state: 'running', network: 'nope' }], { session: t.session, executed: [], lastOutput: '', lastExitCode: 0 }).passed).toBe(false);
    expect(t.$('docker network rm shop')).toContain('active endpoints');
    expect(t.$('docker network rm bridge')).toContain('pre-defined');
    expect(t.$('docker network inspect nope')).toContain('not found');
    t.$('docker network disconnect shop web');
    expect(t.$('docker network disconnect shop web')).toContain('is not connected');
    expect(t.$('docker network disconnect shop nope')).toContain('No such container');
    t.$('docker network disconnect shop cache');
    expect(t.$('docker network rm shop')).toBe('shop\n');
    expect(t.$('docker network frob')).toContain('Usage:  docker network');
  });

  it('a container started on a network; disconnecting its first network', () => {
    const t = term(lab);
    t.$('docker network create app');
    t.$('docker run -d --name tools --network app alpine sleep 1000');
    t.$('docker run -d --name kv --network app redis:7');
    t.$('docker run -dit --name sh1 alpine');
    expect(t.$('docker ps')).toContain('sh1');
    expect(t.$('docker exec tools ping -c 1 kv')).toContain('1 packets received');
    expect(t.$('docker exec tools ping -c 1 web')).toContain("bad address 'web'");
    expect(t.$('docker exec tools ping')).toContain('Usage: ping');
    expect(t.$('docker exec web ping kv')).toContain('executable file not found');
    t.$('docker network connect bridge kv');
    t.$('docker network disconnect app kv');
    expect(JSON.parse(t.$('docker inspect kv'))[0].NetworkSettings.Networks).toHaveProperty('bridge');
  });

  it('rename and rmi of a second tag', () => {
    const t = term(lab);
    expect(t.$('docker rename web site')).toBe('');
    expect(t.$('docker ps')).toContain('site');
    expect(t.$('docker rename site cache')).toContain('is already in use');
    expect(t.$('docker rename nope x')).toContain('No such container');
    expect(t.$('docker rename')).toContain('requires exactly 2 arguments');
    t.$('docker tag nginx:latest shop:1.0');
    const out = t.$('docker rmi shop:1.0');
    expect(out).toBe('Untagged: shop:1.0\n');
    expect(t.$('docker images')).toContain('nginx');
  });
});
