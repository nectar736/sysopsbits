import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createMachine, writeFile, HOSTS_PATH, NOTES_PATH } from '../../../../js/sim/engine.js';
import { runCommand, PROMPT, COMMANDS } from '../../../../js/sim/commands.js';

const WORLD = {
  domain: 'corp.local',
  hosts: [
    { ip: '10.0.0.10', name: 'DC01', ping: true },
    { ip: '10.0.0.15', name: 'FS01', ping: true, shares: { Shared: ['Budget.xlsx'] } },
    { ip: '10.0.0.20', name: 'INTRANET', ping: true },
    { ip: '10.0.0.30', name: 'PRN', ping: false },
  ],
  router: { ip: '10.0.0.1', internet: true },
  dns: { '10.0.0.10': { name: 'DC01.corp.local', records: { 'intranet.corp.local': '10.0.0.20', 'fs01.corp.local': '10.0.0.15' } } },
  dhcp: { available: true, server: '10.0.0.10', lease: { ip: '10.0.0.77', mask: '255.255.255.0', gateway: '10.0.0.1', dns: ['10.0.0.10'] } },
  internet: { 'www.example.com': '93.184.215.14' },
};
const STATIC = { hostname: 'PC01', adapter: { dhcp: false, ip: '10.0.0.50', mask: '255.255.255.0', gateway: '10.0.0.1', dnsAuto: false, dns: ['10.0.0.10'] } };
const mk = (over = {}) => createMachine({ ...STATIC, ...over, adapter: { ...STATIC.adapter, ...(over.adapter || {}) } });
const run = (input, machine = mk(), world = WORLD) => runCommand(input, { machine, world });
const text = (r) => r.lines.join('\n');
const LEASED = { hostname: 'LAPTOP7', adapter: { dhcp: true }, lease: { ...WORLD.dhcp.lease } };

test('prompt and help', () => {
  assert.equal(PROMPT, 'C:\\Users\\you>');
  const h = text(run('help'));
  for (const c of ['IPCONFIG', 'PING', 'TRACERT', 'NSLOOKUP', 'NET USE', 'TYPE', 'CLS']) assert.match(h, new RegExp(c));
  assert.ok(COMMANDS.includes('ipconfig'));
});

test('empty input, cls, exit, hostname', () => {
  assert.deepEqual(run('   ').lines, []);
  assert.equal(run('cls').clear, true);
  assert.equal(run('EXIT').exit, true);
  assert.deepEqual(run('hostname').lines, ['PC01']);
});

test('unknown command prints the real two-line message', () => {
  assert.deepEqual(run('foo bar').lines, [
    "'foo' is not recognized as an internal or external command,",
    'operable program or batch file.',
  ]);
});

test('ipconfig on a static adapter', () => {
  assert.deepEqual(run('ipconfig').lines, [
    '',
    'Windows IP Configuration',
    '',
    '',
    'Ethernet adapter Ethernet:',
    '',
    '   Connection-specific DNS Suffix  . : ',
    '   IPv4 Address. . . . . . . . . . . : 10.0.0.50',
    '   Subnet Mask . . . . . . . . . . . : 255.255.255.0',
    '   Default Gateway . . . . . . . . . : 10.0.0.1',
  ]);
});

test('sloppy switches: case, spacing and a dash all mean /all', () => {
  assert.deepEqual(run('  IPCONFIG   -ALL ').lines, run('ipconfig /all').lines);
});

test('ipconfig /all on a static adapter', () => {
  const lines = run('ipconfig /all').lines;
  assert.ok(lines.includes('   Host Name . . . . . . . . . . . . : PC01'));
  assert.ok(lines.includes('   DHCP Enabled. . . . . . . . . . . : No'));
  assert.ok(lines.includes('   IPv4 Address. . . . . . . . . . . : 10.0.0.50(Preferred) '));
  assert.ok(lines.includes('   DNS Servers . . . . . . . . . . . : 10.0.0.10'));
  assert.ok(lines.some((l) => /^ {3}Physical Address\. \. \. \. \. \. \. \. \. : ([0-9A-F]{2}-){5}[0-9A-F]{2}$/.test(l)));
});

test('ipconfig /all on DHCP shows the suffix, DHCP server and both DNS lines', () => {
  const m = createMachine({ ...LEASED, lease: { ...WORLD.dhcp.lease, dns: ['10.0.0.10', '10.0.0.11'] } });
  const lines = run('ipconfig /all', m).lines;
  assert.ok(lines.includes('   Connection-specific DNS Suffix  . : corp.local'));
  assert.ok(lines.includes('   DHCP Enabled. . . . . . . . . . . : Yes'));
  assert.ok(lines.includes('   DHCP Server . . . . . . . . . . . : 10.0.0.10'));
  const i = lines.indexOf('   DNS Servers . . . . . . . . . . . : 10.0.0.10');
  assert.equal(lines[i + 1], ' '.repeat(39) + '10.0.0.11');
});

test('ipconfig on APIPA shows the autoconfiguration address and a blank gateway', () => {
  const m = createMachine({ hostname: 'LAPTOP7', adapter: { dhcp: true }, lease: { ip: '169.254.20.7', mask: '255.255.0.0', gateway: '', dns: [], apipa: true } });
  assert.ok(run('ipconfig', m).lines.includes('   Autoconfiguration IPv4 Address. . : 169.254.20.7'));
  assert.ok(run('ipconfig', m).lines.includes('   Default Gateway . . . . . . . . . : '));
  assert.ok(run('ipconfig /all', m).lines.includes('   Autoconfiguration IPv4 Address. . : 169.254.20.7(Preferred) '));
});

test('ipconfig: an unplugged adapter shows media disconnected, a disabled one is not listed', () => {
  assert.ok(run('ipconfig', mk({ adapter: { cable: false } })).lines.includes('   Media State . . . . . . . . . . . : Media disconnected'));
  assert.deepEqual(run('ipconfig', mk({ adapter: { enabled: false } })).lines, ['', 'Windows IP Configuration', '']);
});

test('ipconfig /release and /renew', () => {
  const fail = ['', 'Windows IP Configuration', '', 'The operation failed as no adapter is in the state permissible for this operation.'];
  assert.deepEqual(run('ipconfig /renew').lines, fail);
  assert.deepEqual(run('ipconfig /release').lines, fail);
  const apipa = createMachine({ hostname: 'LAPTOP7', adapter: { dhcp: true }, lease: { ip: '169.254.20.7', mask: '255.255.0.0', gateway: '', dns: [], apipa: true } });
  const renewed = run('ipconfig /renew', apipa);
  assert.ok(renewed.lines.includes('   IPv4 Address. . . . . . . . . . . : 10.0.0.77'));
  assert.equal(renewed.machine.lease.apipa, false);
  const down = run('ipconfig /renew', apipa, { ...WORLD, dhcp: { available: false } });
  assert.ok(down.lines.includes('An error occurred while renewing interface Ethernet : unable to contact your DHCP server. Request has timed out.'));
  const released = run('ipconfig /release', createMachine(LEASED));
  assert.equal(released.machine.lease, null);
  assert.ok(!text(released).includes('10.0.0.77'));
  assert.ok(run('ipconfig /renew', createMachine({ ...LEASED, adapter: { dhcp: true, cable: false } })).lines
    .includes('No operation can be performed on Ethernet while it has its media disconnected.'));
});

test('ipconfig /flushdns and /displaydns', () => {
  assert.deepEqual(run('ipconfig /flushdns').lines, ['', 'Windows IP Configuration', '', 'Successfully flushed the DNS Resolver Cache.']);
  const m = writeFile(mk(), HOSTS_PATH, '10.0.0.99 intranet.corp.local\n');
  const d = run('ipconfig /displaydns', m).lines;
  assert.ok(d.includes('    intranet.corp.local'));
  assert.ok(d.includes('    A (Host) Record . . . : 10.0.0.99'));
  assert.ok(run('ipconfig /bogus').lines[0].startsWith('Error: unrecognized or incomplete command line.'));
});

test('ping success by name streams four replies and statistics', () => {
  const r = run('ping intranet');
  assert.equal(r.stream, true);
  assert.equal(r.lines[0], '');
  assert.equal(r.lines[1], 'Pinging intranet.corp.local [10.0.0.20] with 32 bytes of data:');
  const replies = r.lines.filter((l) => l.startsWith('Reply from 10.0.0.20: bytes=32 time'));
  assert.equal(replies.length, 4);
  assert.ok(replies.every((l) => / TTL=128$/.test(l)));
  assert.ok(r.lines.includes('Ping statistics for 10.0.0.20:'));
  assert.ok(r.lines.includes('    Packets: Sent = 4, Received = 4, Lost = 0 (0% loss),'));
  assert.ok(r.lines.includes('Approximate round trip times in milli-seconds:'));
});

test('ping an internet name uses TTL=55; an IP prints no brackets', () => {
  assert.ok(run('ping www.example.com').lines.filter((l) => / TTL=55$/.test(l)).length === 4);
  assert.equal(run('ping 10.0.0.20').lines[1], 'Pinging 10.0.0.20 with 32 bytes of data:');
  assert.equal(run('ping 127.0.0.1').lines[2], 'Reply from 127.0.0.1: bytes=32 time<1ms TTL=128');
});

test('ping a name that does not resolve: one line, no statistics', () => {
  assert.deepEqual(run('ping intranet', mk({ adapter: { dns: ['10.0.0.53'] } })).lines,
    ['Ping request could not find host intranet. Please check the name and try again.']);
});

test('ping failures: unreachable local address, silent host, dead gateway, no route, no interface', () => {
  const unreach = run('ping 10.0.0.99').lines;
  assert.equal(unreach.filter((l) => l === 'Reply from 10.0.0.50: Destination host unreachable.').length, 4);
  assert.ok(unreach.includes('    Packets: Sent = 4, Received = 4, Lost = 0 (0% loss),'));
  assert.ok(!unreach.includes('Approximate round trip times in milli-seconds:'));
  const silent = run('ping 10.0.0.30').lines;
  assert.equal(silent.filter((l) => l === 'Request timed out.').length, 4);
  assert.ok(silent.includes('    Packets: Sent = 4, Received = 0, Lost = 4 (100% loss),'));
  const dead = run('ping 93.184.215.14', mk({ adapter: { gateway: '10.0.0.254' } })).lines;
  assert.equal(dead.filter((l) => l === 'Reply from 10.0.0.50: Destination host unreachable.').length, 4);
  const noGw = run('ping 93.184.215.14', mk({ adapter: { gateway: '' } })).lines;
  assert.equal(noGw.filter((l) => l === 'PING: transmit failed. General failure.').length, 4);
  const off = run('ping 10.0.0.20', mk({ adapter: { enabled: false } })).lines;
  assert.equal(off.filter((l) => l === 'PING: transmit failed. General failure.').length, 4);
});

test('bare ping prints usage and a simulator tip; -n sets the count', () => {
  const u = run('ping').lines;
  assert.equal(u[1], 'Usage: ping [-t] [-a] [-n count] [-l size] [-f] [-i TTL] [-v TOS]');
  assert.equal(u[u.length - 1], 'Try: ping <name or IP address>');
  assert.equal(run('ping -n 2 10.0.0.20').lines.filter((l) => l.startsWith('Reply from')).length, 2);
});

test('nslookup success, authoritative internal and forwarded internet answers', () => {
  assert.deepEqual(run('nslookup intranet').lines, [
    'Server:  DC01.corp.local', 'Address:  10.0.0.10', '', 'Name:    intranet.corp.local', 'Address:  10.0.0.20', '',
  ]);
  assert.ok(run('nslookup www.example.com').lines.includes('Non-authoritative answer:'));
});

test('nslookup nxdomain, timeout and no server', () => {
  assert.deepEqual(run('nslookup nope').lines, [
    'Server:  DC01.corp.local', 'Address:  10.0.0.10', '', "*** DC01.corp.local can't find nope.corp.local: Non-existent domain",
  ]);
  const t = run('nslookup intranet', mk({ adapter: { dns: ['10.0.0.53'] } })).lines;
  assert.deepEqual(t.slice(0, 5), ['DNS request timed out.', '    timeout was 2 seconds.', 'Server:  UnKnown', 'Address:  10.0.0.53', '']);
  assert.equal(t[t.length - 1], '*** Request to UnKnown timed-out');
  assert.ok(text(run('nslookup intranet', mk({ adapter: { dns: [] } }))).includes('*** Default servers are not available'));
  assert.ok(run('nslookup intranet 10.0.0.10', mk({ adapter: { dns: ['10.0.0.53'] } })).lines.includes('Address:  10.0.0.20'));
});

test('nslookup shows the DNS answer even when the hosts file overrides the name', () => {
  const m = writeFile(mk(), HOSTS_PATH, '10.0.0.99 intranet.corp.local\n');
  assert.ok(run('nslookup intranet.corp.local', m).lines.includes('Address:  10.0.0.20'));
  assert.ok(run('ping intranet.corp.local', m).lines.includes('Pinging intranet.corp.local [10.0.0.99] with 32 bytes of data:'));
});

test('bare nslookup explains interactive mode is not supported', () => {
  assert.deepEqual(run('nslookup').lines, ["The simulator doesn't support interactive nslookup. Try: nslookup <name>"]);
});

test('tracert through the gateway, and with a dead gateway', () => {
  const ok = run('tracert www.example.com').lines;
  assert.equal(ok[1], 'Tracing route to www.example.com [93.184.215.14]');
  assert.equal(ok[2], 'over a maximum of 30 hops:');
  assert.match(ok[4], /^ {2}1 {4}<1 ms {4}<1 ms {4}<1 ms {2}10\.0\.0\.1 $/);
  assert.match(ok[5], /^ {2}2 .* {2}93\.184\.215\.14 $/);
  assert.equal(ok[ok.length - 1], 'Trace complete.');
  const dead = run('tracert 93.184.215.14', mk({ adapter: { gateway: '10.0.0.254' } })).lines;
  assert.equal(dead[1], 'Tracing route to 93.184.215.14 over a maximum of 30 hops');
  assert.ok(dead.includes('  1  10.0.0.50  reports: Destination host unreachable.'));
  assert.ok(run('tracert nope', mk()).lines.includes('Unable to resolve target system name nope.'));
  const lost = run('tracert 203.0.113.9').lines;
  assert.equal(lost.filter((l) => l.endsWith('Request timed out.')).length, 3);
  assert.equal(lost[lost.length - 1], 'Trace complete.');
});

test('net use: map, list, delete and errors', () => {
  assert.deepEqual(run('net use').lines, ['New connections will be remembered.', '', 'There are no entries in the list.', '']);
  const mapped = run('net use S: \\\\FS01\\Shared');
  assert.deepEqual(mapped.lines, ['The command completed successfully.', '']);
  assert.equal(mapped.machine.drives.S, '\\\\FS01\\Shared');
  const list = run('net use', mapped.machine).lines;
  assert.ok(list.some((l) => /^OK {11}S: {8}\\\\FS01\\Shared/.test(l)));
  assert.deepEqual(run('net use S: \\\\FS01\\Shared', mapped.machine).lines, ['System error 85 has occurred.', '', 'The local device name is already in use.', '']);
  assert.deepEqual(run('net use Q: \\\\nosuchserver\\x').lines, ['System error 67 has occurred.', '', 'The network name cannot be found.', '']);
  assert.deepEqual(run('net use S: /delete', mapped.machine).lines, ['S: was deleted successfully.', '']);
  assert.equal(run('net use S: /delete', mapped.machine).machine.drives.S, undefined);
  assert.deepEqual(run('net use Q: /delete').lines, ['The network connection could not be found.', '', 'More help is available by typing NET HELPMSG 2250.', '']);
});

test('dir lists a mapped share; an unknown drive errors', () => {
  const mapped = run('net use S: \\\\FS01\\Shared').machine;
  assert.ok(run('dir S:', mapped).lines.some((l) => l.endsWith(' Budget.xlsx')));
  assert.deepEqual(run('dir Q:').lines, ['The system cannot find the drive specified.']);
  assert.ok(run('dir').lines.some((l) => l.includes('Directory of C:\\Users\\you')));
});

test('type prints a file, quoted or not, and errors on a missing one', () => {
  const m = writeFile(mk(), NOTES_PATH, 'DNS: 10.0.0.10');
  assert.deepEqual(run('type "C:\\Users\\you\\Desktop\\network-notes.txt"', m).lines, ['DNS: 10.0.0.10']);
  assert.deepEqual(run('type Desktop\\network-notes.txt', m).lines, ['DNS: 10.0.0.10']);
  assert.ok(run('type C:\\Windows\\System32\\drivers\\etc\\hosts').lines[0].startsWith('#'));
  assert.deepEqual(run('type C:\\nope.txt').lines, ['The system cannot find the file specified.']);
});

test('arp -a lists the gateway when it answers, and nothing without an interface', () => {
  const a = run('arp -a').lines;
  assert.equal(a[1], 'Interface: 10.0.0.50 --- 0x2');
  assert.ok(a.some((l) => l.startsWith('  10.0.0.1              ') && l.includes('dynamic')));
  assert.deepEqual(run('arp -a', mk({ adapter: { enabled: false } })).lines, ['No ARP Entries Found.']);
});

test('review: object property names are not hosts', () => {
  for (const name of ['constructor', '__proto__', 'toString', 'hasOwnProperty']) {
    assert.deepEqual(run(`ping ${name}`).lines, [`Ping request could not find host ${name}. Please check the name and try again.`], name);
  }
  assert.ok(!text(run('nslookup constructor')).includes('function'));
  assert.ok(!text(run('nslookup intranet constructor')).includes('function'));
});

test('review: ipconfig/all with no space and .exe names work', () => {
  assert.deepEqual(run('ipconfig/all').lines, run('ipconfig /all').lines);
  assert.deepEqual(run('IPCONFIG.EXE /all').lines, run('ipconfig /all').lines);
  assert.equal(run('ping.exe 10.0.0.20').lines[1], 'Pinging 10.0.0.20 with 32 bytes of data:');
});

test('review: switches that take a value do not become the target', () => {
  assert.equal(run('ping -l 100 10.0.0.20').lines[1], 'Pinging 10.0.0.20 with 32 bytes of data:');
  assert.equal(run('ping -w 500 -n 2 10.0.0.20').lines.filter((l) => l.startsWith('Reply from')).length, 2);
  assert.equal(run('tracert -h 5 10.0.0.20').lines[1], 'Tracing route to 10.0.0.20 over a maximum of 30 hops');
  assert.ok(text(run('ping -t 10.0.0.20')).includes('stops after 4 replies'));
});
