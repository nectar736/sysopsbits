import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { createMachine, applyIpv4, mapDrive, flushDns } from '../../../../js/sim/engine.js';
import { runCommand } from '../../../../js/sim/commands.js';
import { LABS, checkLab } from '../../../../js/sim/labs.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..');
const byId = (id) => LABS.find((l) => l.id === id);
const fresh = (lab) => createMachine(lab.machine);
const cmd = (lab, m, line) => runCommand(line, { machine: m, world: lab.world }).machine;

test('six labs, 101 to 106, with unique ids and three hints each', () => {
  assert.deepEqual(LABS.map((l) => l.id), ['101', '102', '103', '104', '105', '106']);
  for (const lab of LABS) {
    assert.equal(lab.hints.length, 3, lab.id);
    assert.ok(['Easy', 'Medium'].includes(lab.difficulty), lab.id);
    assert.ok(lab.ticket.from && lab.ticket.subject && lab.ticket.body, lab.id);
    assert.ok(lab.done.length >= 1 && lab.failReply && lab.notes, lab.id);
    assert.ok(lab.debrief.cause && lab.debrief.remember && lab.debrief.command && lab.debrief.link.href, lab.id);
  }
});

for (const lab of LABS) {
  test(`lab ${lab.id} starts broken and the intended fix closes it`, () => {
    const start = checkLab(lab, fresh(lab));
    assert.equal(start.passed, false);
    assert.ok(start.failed.length >= 1);
    const fixed = checkLab(lab, lab.fix(fresh(lab), lab.world));
    assert.deepEqual(fixed, { passed: true, failed: [] });
  });
}

test('wrong fixes keep tickets open', () => {
  const l101 = byId('101');
  const badMask = applyIpv4(fresh(l101), { ipAuto: false, ip: '192.168.1.50', mask: '255.255.0.0', gateway: '192.168.1.1', dnsAuto: false, dns1: '192.168.1.10', dns2: '' }, l101.world);
  assert.equal(checkLab(l101, badMask).passed, false);

  const l102 = byId('102');
  assert.equal(checkLab(l102, mapDrive(fresh(l102), l102.world, 'T:', '\\\\FS01\\Shared').machine).passed, false);

  const l103 = byId('103');
  assert.equal(checkLab(l103, cmd(l103, fresh(l103), 'ipconfig /flushdns')).passed, false);

  const l104 = byId('104');
  const google = applyIpv4(fresh(l104), { ipAuto: false, ip: '10.0.0.50', mask: '255.255.255.0', gateway: '10.0.0.1', dnsAuto: false, dns1: '8.8.8.8', dns2: '' }, l104.world);
  assert.equal(checkLab(l104, google).passed, false);

  const l105 = byId('105');
  const self = applyIpv4(fresh(l105), { ipAuto: false, ip: '192.168.1.40', mask: '255.255.255.0', gateway: '192.168.1.40', dnsAuto: false, dns1: '192.168.1.10', dns2: '' }, l105.world);
  assert.equal(checkLab(l105, self).passed, false);

  const l106 = byId('106');
  assert.equal(checkLab(l106, flushDns(fresh(l106))).passed, false);
});

test('the lab symptoms match their tickets', () => {
  const out = (id, line) => runCommand(line, { machine: fresh(byId(id)), world: byId(id).world }).lines.join('\n');
  assert.match(out('103', 'ipconfig'), /Autoconfiguration IPv4 Address\. \. : 169\.254\./);
  assert.match(out('104', 'ping intranet'), /could not find host intranet/);
  assert.match(out('104', 'ping 10.0.0.20'), /Reply from 10\.0\.0\.20: bytes=32/);
  assert.match(out('105', 'ping fs01'), /Reply from 192\.168\.1\.15: bytes=32/);
  assert.match(out('105', 'ping www.example.com'), /Destination host unreachable/);
  assert.match(out('106', 'nslookup intranet'), /Address: {2}10\.0\.0\.20/);
  assert.match(out('106', 'ping intranet.corp.local'), /\[10\.0\.0\.99\]/);
});

test('a closed DHCP-based fix also works by disabling and enabling the adapter (lab 103)', async () => {
  const { setAdapterEnabled } = await import('../../../../js/sim/engine.js');
  const l = byId('103');
  const m = setAdapterEnabled(setAdapterEnabled(fresh(l), false, l.world), true, l.world);
  assert.equal(checkLab(l, m).passed, true);
});

test('every debrief link is an existing, indexed post', () => {
  for (const lab of LABS) {
    const file = path.join(ROOT, lab.debrief.link.href);
    assert.ok(existsSync(file), lab.debrief.link.href);
    assert.doesNotMatch(readFileSync(file, 'utf8'), /noindex/, lab.debrief.link.href);
  }
});

test('simulation.html has a matching h3 for every lab', { skip: !existsSync(path.join(ROOT, 'simulation.html')) }, () => {
  const html = readFileSync(path.join(ROOT, 'simulation.html'), 'utf8');
  for (const lab of LABS) {
    const title = lab.title.replace(/&/g, '&amp;').replace(/'/g, '(?:\'|&#39;|’)');
    assert.match(html, new RegExp(`<h3 id="lab-${lab.id}">${title}</h3>`), lab.id);
  }
});

test('review: teaching text does not overstate', () => {
  for (const lab of LABS) assert.doesNotMatch(lab.debrief.remember, /(?<!almost )always means/, lab.id);
  assert.doesNotMatch(byId('105').debrief.link.text, /route/i);
});
