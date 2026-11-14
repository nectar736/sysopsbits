import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  parseIpv4, formatIpv4, maskBits, createMachine, effectiveConfig, route, resolve, nslookupQuery,
  dhcpRenew, dhcpRelease, flushDns, validateIpv4, applyIpv4, setAdapterEnabled, mapDrive, unmapDrive,
  listShare, readFile, writeFile, parseHosts, HOSTS_PATH,
} from '../../../../js/sim/engine.js';

const WORLD = {
  domain: 'corp.local',
  hosts: [
    { ip: '10.0.0.10', name: 'DC01', ping: true },
    { ip: '10.0.0.15', name: 'FS01', ping: true, shares: { Shared: ['Budget.xlsx', 'Handbook.pdf'] } },
    { ip: '10.0.0.20', name: 'INTRANET', ping: true },
    { ip: '10.0.0.30', name: 'PRN', ping: false },
  ],
  router: { ip: '10.0.0.1', internet: true },
  dns: { '10.0.0.10': { name: 'DC01.corp.local', records: { 'intranet.corp.local': '10.0.0.20', 'fs01.corp.local': '10.0.0.15', 'dc01.corp.local': '10.0.0.10' } } },
  dhcp: { available: true, lease: { ip: '10.0.0.77', mask: '255.255.255.0', gateway: '10.0.0.1', dns: ['10.0.0.10'] } },
  internet: { 'www.example.com': '93.184.215.14' },
};

const STATIC = { hostname: 'PC01', adapter: { dhcp: false, ip: '10.0.0.50', mask: '255.255.255.0', gateway: '10.0.0.1', dnsAuto: false, dns: ['10.0.0.10'] } };
const machine = (over = {}) => createMachine({ ...STATIC, ...over, adapter: { ...STATIC.adapter, ...(over.adapter || {}) } });
const okSettings = { ipAuto: false, ip: '10.0.0.50', mask: '255.255.255.0', gateway: '10.0.0.1', dnsAuto: false, dns1: '10.0.0.10', dns2: '' };

test('parseIpv4 accepts dotted quads and rejects bad ones', () => {
  assert.equal(parseIpv4('10.0.0.1'), 0x0a000001);
  assert.equal(parseIpv4('255.255.255.255'), 0xffffffff);
  for (const bad of ['192.168.1.256', '01.2.3.4', '1.2.3', '1.2.3.4.5', '', ' 1.2.3.4', 'a.b.c.d', '1..2.3']) {
    assert.equal(parseIpv4(bad), null, bad);
  }
  assert.equal(formatIpv4(0xc0a80132), '192.168.1.50');
});

test('maskBits counts contiguous masks and rejects the rest', () => {
  assert.equal(maskBits('255.255.255.0'), 24);
  assert.equal(maskBits('255.255.0.0'), 16);
  assert.equal(maskBits('255.0.255.0'), null);
  assert.equal(maskBits('nope'), null);
});

test('createMachine fills defaults and does not share state with its spec', () => {
  const spec = { adapter: { dns: ['10.0.0.10'] }, drives: {} };
  const m = createMachine(spec);
  assert.equal(m.adapter.name, 'Ethernet');
  assert.equal(m.adapter.enabled, true);
  assert.equal(m.adapter.dhcp, true);
  assert.match(readFile(m, HOSTS_PATH), /^#/);
  m.adapter.dns.push('x');
  assert.deepEqual(spec.adapter.dns, ['10.0.0.10']);
});

test('effectiveConfig: static, dhcp lease, apipa, no lease, disabled, unplugged', () => {
  assert.deepEqual(effectiveConfig(machine(), WORLD), { source: 'static', ip: '10.0.0.50', mask: '255.255.255.0', gateway: '10.0.0.1', dns: ['10.0.0.10'] });
  const leased = createMachine({ adapter: { dhcp: true }, lease: { ...WORLD.dhcp.lease, apipa: false } });
  assert.equal(effectiveConfig(leased, WORLD).source, 'dhcp');
  assert.equal(effectiveConfig(leased, WORLD).ip, '10.0.0.77');
  const apipa = createMachine({ adapter: { dhcp: true }, lease: { ip: '169.254.7.9', mask: '255.255.0.0', gateway: '', dns: [], apipa: true } });
  assert.equal(effectiveConfig(apipa, WORLD).source, 'apipa');
  assert.equal(effectiveConfig(createMachine({ adapter: { dhcp: true } }), WORLD).source, 'none');
  assert.equal(effectiveConfig(machine({ adapter: { enabled: false } }), WORLD).source, 'none');
  assert.equal(effectiveConfig(machine({ adapter: { cable: false } }), WORLD).source, 'none');
});

test('route: loopback, local hosts, silent hosts, unknown local addresses', () => {
  const m = machine();
  assert.equal(route(m, WORLD, '127.0.0.1').via, 'loopback');
  assert.deepEqual(route(m, WORLD, '10.0.0.20'), { ok: true, via: 'local', hops: ['10.0.0.20'], fail: null });
  assert.equal(route(m, WORLD, '10.0.0.1').ok, true);
  assert.equal(route(m, WORLD, '10.0.0.30').fail, 'no-reply');
  assert.equal(route(m, WORLD, '10.0.0.99').fail, 'no-arp');
  assert.equal(route(m, WORLD, '10.0.0.50').ok, true);
});

test('route: through the gateway, no gateway, dead gateway, no interface', () => {
  assert.deepEqual(route(machine(), WORLD, '93.184.215.14'), { ok: true, via: 'gateway', hops: ['10.0.0.1', '93.184.215.14'], fail: null });
  assert.equal(route(machine(), WORLD, '203.0.113.9').fail, 'no-reply');
  assert.equal(route(machine({ adapter: { gateway: '' } }), WORLD, '93.184.215.14').fail, 'no-route');
  const dead = machine({ adapter: { gateway: '10.0.0.254' } });
  assert.equal(route(dead, WORLD, '93.184.215.14').fail, 'gateway-dead');
  assert.equal(route(dead, WORLD, '10.0.0.15').ok, true, 'a dead gateway still reaches local hosts');
  assert.equal(route(machine({ adapter: { enabled: false } }), WORLD, '10.0.0.20').fail, 'no-interface');
  const noInternet = { ...WORLD, router: { ip: '10.0.0.1', internet: false } };
  assert.equal(route(machine(), noInternet, '93.184.215.14').fail, 'no-reply');
});

test('resolve: short names get the domain suffix and DNS answers are cached', () => {
  const m = machine();
  const r = resolve(m, WORLD, 'intranet');
  assert.deepEqual(r, { ok: true, ip: '10.0.0.20', fqdn: 'intranet.corp.local', source: 'dns', fail: null });
  assert.equal(m.cache['intranet.corp.local'], '10.0.0.20');
  assert.equal(resolve(m, WORLD, 'intranet.corp.local').source, 'cache');
  assert.equal(resolve(machine(), WORLD, 'WWW.Example.com').ip, '93.184.215.14');
  assert.equal(resolve(machine(), WORLD, 'localhost').ip, '127.0.0.1');
});

test('resolve: unknown names are nxdomain, an unreachable DNS server times out', () => {
  assert.equal(resolve(machine(), WORLD, 'nope.corp.local').fail, 'nxdomain');
  const badDns = machine({ adapter: { dns: ['10.0.0.53'] } });
  assert.equal(resolve(badDns, WORLD, 'intranet').fail, 'timeout');
  assert.equal(route(badDns, WORLD, '10.0.0.20').ok, true, 'ping by IP still works');
  const second = machine({ adapter: { dns: ['10.0.0.53', '10.0.0.10'] } });
  assert.equal(resolve(second, WORLD, 'intranet').ip, '10.0.0.20', 'falls through to the alternate server');
});

test('resolve prefers the hosts file; nslookupQuery ignores it and the cache', () => {
  let m = machine();
  m = writeFile(m, HOSTS_PATH, '# old entry\n10.0.0.99    intranet.corp.local\n');
  assert.deepEqual(resolve(m, WORLD, 'intranet.corp.local'), { ok: true, ip: '10.0.0.99', fqdn: 'intranet.corp.local', source: 'hosts', fail: null });
  assert.equal(resolve(m, WORLD, 'intranet').source, 'hosts');
  const q = nslookupQuery(m, WORLD, 'intranet.corp.local');
  assert.equal(q.ok, true);
  assert.equal(q.ip, '10.0.0.20');
  assert.deepEqual(q.server, { ip: '10.0.0.10', name: 'DC01.corp.local' });
});

test('nslookupQuery: timeout, nxdomain, explicit server, no server', () => {
  const bad = machine({ adapter: { dns: ['10.0.0.53', '10.0.0.10'] } });
  const t = nslookupQuery(bad, WORLD, 'intranet');
  assert.equal(t.fail, 'timeout', 'nslookup only asks the first server');
  assert.deepEqual(t.server, { ip: '10.0.0.53', name: null });
  assert.equal(nslookupQuery(bad, WORLD, 'intranet', '10.0.0.10').ip, '10.0.0.20');
  assert.equal(nslookupQuery(machine(), WORLD, 'nope').fail, 'nxdomain');
  assert.equal(nslookupQuery(machine({ adapter: { dns: [] } }), WORLD, 'intranet').fail, 'no-server');
});

test('dhcpRenew gets a lease, or an APIPA address when no DHCP server answers', () => {
  const dhcp = createMachine({ hostname: 'LAPTOP7', adapter: { dhcp: true } });
  const got = dhcpRenew(dhcp, WORLD);
  assert.equal(got.ok, true);
  assert.equal(effectiveConfig(got.machine, WORLD).ip, '10.0.0.77');
  const none = dhcpRenew(dhcp, { ...WORLD, dhcp: { available: false, lease: null } });
  assert.equal(none.ok, false);
  assert.equal(none.fail, 'no-dhcp');
  const lease = none.machine.lease;
  assert.equal(lease.apipa, true);
  assert.equal(lease.mask, '255.255.0.0');
  assert.equal(lease.gateway, '');
  const [a, b, c] = lease.ip.split('.').map(Number);
  assert.deepEqual([a, b], [169, 254]);
  assert.ok(c >= 1 && c <= 254, lease.ip);
  assert.equal(dhcpRenew(dhcp, { ...WORLD, dhcp: { available: false } }).machine.lease.ip, lease.ip, 'deterministic');
  assert.equal(dhcpRenew(machine(), WORLD).fail, 'static');
  assert.equal(dhcpRenew(createMachine({ adapter: { dhcp: true, enabled: false } }), WORLD).fail, 'no-interface');
  assert.equal(dhcpRelease(got.machine).lease, null);
});

test('flushDns empties the cache', () => {
  const m = machine();
  resolve(m, WORLD, 'intranet');
  assert.deepEqual(flushDns(m).cache, {});
});

test('validateIpv4 errors for each bad field and a warning for an off-subnet gateway', () => {
  const v = (over) => validateIpv4({ ...okSettings, ...over });
  assert.deepEqual(v({}), { errors: [], warnings: [] });
  assert.deepEqual(v({ ip: '' }).errors, ['Enter a valid IP address.']);
  assert.deepEqual(v({ ip: '192.168.1.256' }).errors, ['Enter a valid IP address.']);
  assert.deepEqual(v({ ip: '01.2.3.4' }).errors, ['Enter a valid IP address.']);
  assert.deepEqual(v({ mask: '' }).errors, ['Enter a valid subnet mask.']);
  assert.deepEqual(v({ mask: '255.0.255.0' }).errors, ['The subnet mask must be contiguous.']);
  assert.deepEqual(v({ ip: '10.0.0.0' }).errors, ["The IP address can't be the network or broadcast address of its subnet."]);
  assert.deepEqual(v({ ip: '10.0.0.255' }).errors, ["The IP address can't be the network or broadcast address of its subnet."]);
  assert.deepEqual(v({ gateway: '10.0.0' }).errors, ['Enter a valid default gateway, or leave it blank.']);
  assert.deepEqual(v({ gateway: '' }), { errors: [], warnings: [] });
  assert.deepEqual(v({ dns1: '10.0.0.300' }).errors, ['Enter a valid preferred DNS server.']);
  assert.deepEqual(v({ dns1: '' }).errors, []);
  assert.deepEqual(v({ dns2: 'x' }).errors, ['Enter a valid alternate DNS server, or leave it blank.']);
  assert.deepEqual(v({ gateway: '192.168.1.1' }).warnings, ['gateway-off-subnet']);
  assert.deepEqual(validateIpv4({ ipAuto: true, ip: 'junk', mask: '', gateway: '', dnsAuto: true, dns1: 'junk', dns2: '' }), { errors: [], warnings: [] });
  assert.deepEqual(validateIpv4({ ipAuto: true, dnsAuto: false, dns1: 'junk', dns2: '' }).errors, ['Enter a valid preferred DNS server.']);
});

test('applyIpv4 sets a static config, and automatic asks DHCP for a lease', () => {
  const start = createMachine({ adapter: { dhcp: true }, lease: { ...WORLD.dhcp.lease, apipa: false } });
  const s = applyIpv4(start, { ...okSettings, dns2: '10.0.0.11', dnsAuto: true }, WORLD);
  assert.equal(s.adapter.dhcp, false);
  assert.equal(s.adapter.dnsAuto, false, 'a static IP forces static DNS');
  assert.deepEqual(s.adapter.dns, ['10.0.0.10', '10.0.0.11']);
  assert.equal(s.lease, null);
  assert.equal(start.adapter.dhcp, true, 'input not mutated');
  const back = applyIpv4(s, { ipAuto: true, dnsAuto: true }, WORLD);
  assert.equal(effectiveConfig(back, WORLD).source, 'dhcp');
  assert.deepEqual(effectiveConfig(back, WORLD).dns, ['10.0.0.10']);
  const dhcpStaticDns = applyIpv4(s, { ipAuto: true, dnsAuto: false, dns1: '10.0.0.53', dns2: '' }, WORLD);
  assert.deepEqual(effectiveConfig(dhcpStaticDns, WORLD).dns, ['10.0.0.53']);
});

test('setAdapterEnabled: disabling drops the lease, enabling a DHCP adapter renews', () => {
  const apipa = createMachine({ adapter: { dhcp: true }, lease: { ip: '169.254.7.9', mask: '255.255.0.0', gateway: '', dns: [], apipa: true } });
  const off = setAdapterEnabled(apipa, false, WORLD);
  assert.equal(effectiveConfig(off, WORLD).source, 'none');
  const on = setAdapterEnabled(off, true, WORLD);
  assert.equal(effectiveConfig(on, WORLD).ip, '10.0.0.77');
});

test('mapDrive maps a share, and reports in-use, bad-path and not-found', () => {
  const m = machine();
  const ok = mapDrive(m, WORLD, 'S:', '\\\\FS01\\Shared');
  assert.equal(ok.error, null);
  assert.equal(ok.machine.drives.S, '\\\\FS01\\Shared');
  assert.deepEqual(listShare(ok.machine, WORLD, ok.machine.drives.S), ['Budget.xlsx', 'Handbook.pdf']);
  assert.equal(mapDrive(m, WORLD, 's', '\\\\fs01\\shared').error, null, 'case-insensitive');
  assert.equal(mapDrive(ok.machine, WORLD, 'S:', '\\\\FS01\\Shared').error, 'in-use');
  assert.equal(mapDrive(m, WORLD, 'C:', '\\\\FS01\\Shared').error, 'in-use');
  assert.equal(mapDrive(m, WORLD, 'S:', 'FS01\\Shared').error, 'bad-path');
  assert.equal(mapDrive(m, WORLD, 'S:', '\\\\FS02\\Shared').error, 'not-found');
  assert.equal(mapDrive(m, WORLD, 'S:', '\\\\FS01\\Nope').error, 'not-found');
  assert.equal(mapDrive(m, WORLD, 'S:', '\\\\10.0.0.15\\Shared').error, null, 'by IP');
  assert.equal(mapDrive(machine({ adapter: { dns: ['10.0.0.53'] } }), WORLD, 'S:', '\\\\FS01\\Shared').error, 'not-found');
  assert.equal(unmapDrive(ok.machine, 'S:').machine.drives.S, undefined);
  assert.equal(unmapDrive(m, 'S:').error, 'not-found');
});

test('files are case-insensitive and parseHosts skips comments', () => {
  const m = writeFile(machine(), 'C:\\Users\\you\\Desktop\\notes.txt', 'hi');
  assert.equal(readFile(m, 'c:\\users\\YOU\\desktop\\NOTES.TXT'), 'hi');
  assert.equal(readFile(m, 'C:\\missing.txt'), null);
  assert.deepEqual({ ...parseHosts('# c\n\n10.0.0.99  Intranet.corp.local  intranet # trailing\n  127.0.0.1 localhost\nbad line\n') }, {
    'intranet.corp.local': '10.0.0.99', intranet: '10.0.0.99', localhost: '127.0.0.1',
  });
});
