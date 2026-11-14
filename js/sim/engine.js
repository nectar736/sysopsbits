// Help desk simulator: the network engine. Pure functions over plain objects, no DOM.
// A machine is one Windows PC; a world is the lab's network (see the plan for both shapes).
// Every "change" returns a new machine. The one exception is resolve(), which adds DNS answers to
// machine.cache in place, the way the real resolver cache fills as a side effect of lookups.

export const HOSTS_PATH = 'C:\\Windows\\System32\\drivers\\etc\\hosts';
export const NOTES_PATH = 'C:\\Users\\you\\Desktop\\network-notes.txt';

const DEFAULT_HOSTS = [
    '# hosts file for BitsOS.',
    '#',
    '# Each line maps an IP address to a host name, for example:',
    '#      10.0.0.5     server1.corp.local',
    '#',
    '# Windows checks this file before it asks a DNS server.',
    '',
].join('\n');

export function parseIpv4(s) {
    if (typeof s !== 'string') return null;
    const m = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(s);
    if (!m) return null;
    let n = 0;
    for (let i = 1; i <= 4; i++) {
        const part = m[i];
        if (part.length > 1 && part[0] === '0') return null;
        const v = Number(part);
        if (v > 255) return null;
        n = n * 256 + v;
    }
    return n >>> 0;
}

export function formatIpv4(n) {
    return [n >>> 24, (n >>> 16) & 255, (n >>> 8) & 255, n & 255].join('.');
}

export function maskBits(mask) {
    const n = parseIpv4(mask);
    if (n === null) return null;
    const inv = (~n) >>> 0;
    if (((inv & (inv + 1)) >>> 0) !== 0) return null;
    let bits = 0;
    for (let v = n; v & 0x80000000; v = (v << 1) >>> 0) bits++;
    return bits;
}

const fileKey = (path) => String(path).toLowerCase();
// Own-property lookup, so names like "constructor" or "__proto__" are never treated as hosts or records.
const own = (obj, key) => (obj && Object.prototype.hasOwnProperty.call(obj, key) ? obj[key] : undefined);

function clone(m) {
    return {
        hostname: m.hostname,
        adapter: { ...m.adapter, dns: [...m.adapter.dns] },
        lease: m.lease ? { ...m.lease, dns: [...m.lease.dns] } : null,
        cache: { ...m.cache },
        files: { ...m.files },
        drives: { ...m.drives },
    };
}

export function createMachine(spec = {}) {
    const a = spec.adapter || {};
    const files = { [fileKey(HOSTS_PATH)]: DEFAULT_HOSTS };
    for (const [path, text] of Object.entries(spec.files || {})) files[fileKey(path)] = text;
    return clone({
        hostname: spec.hostname || 'PC01',
        adapter: {
            name: 'Ethernet', enabled: true, cable: true, dhcp: true, ip: '', mask: '', gateway: '', dnsAuto: true,
            ...a, dns: [...(a.dns || [])],
        },
        lease: spec.lease ? { gateway: '', dns: [], apipa: false, ...spec.lease } : null,
        cache: { ...(spec.cache || {}) },
        files,
        drives: { ...(spec.drives || {}) },
    });
}

export function effectiveConfig(m) {
    const a = m.adapter;
    const none = { source: 'none', ip: null, mask: null, gateway: null, dns: [] };
    if (!a.enabled || !a.cable) return none;
    if (!a.dhcp) return { source: 'static', ip: a.ip, mask: a.mask, gateway: a.gateway, dns: a.dns.filter(Boolean) };
    if (!m.lease) return none;
    const l = m.lease;
    return { source: l.apipa ? 'apipa' : 'dhcp', ip: l.ip, mask: l.mask, gateway: l.gateway, dns: a.dnsAuto ? [...l.dns] : a.dns.filter(Boolean) };
}

function sameSubnet(a, b, mask) {
    const x = parseIpv4(a), y = parseIpv4(b), k = parseIpv4(mask);
    if (x === null || y === null || k === null) return false;
    return ((x & k) >>> 0) === ((y & k) >>> 0);
}

function hostAt(w, ip) {
    const h = w.hosts.find((x) => x.ip === ip);
    if (h) return h;
    if (w.router && w.router.ip === ip) return { ip, name: 'ROUTER', ping: true };
    return null;
}

const fail = (reason) => ({ ok: false, via: null, hops: [], fail: reason });

export function route(m, w, ip) {
    const n = parseIpv4(ip);
    if (n === null) return fail('no-route');
    if (n >>> 24 === 127) return { ok: true, via: 'loopback', hops: [ip], fail: null };
    const cfg = effectiveConfig(m);
    if (cfg.source === 'none') return fail('no-interface');
    if (ip === cfg.ip) return { ok: true, via: 'local', hops: [ip], fail: null };
    if (sameSubnet(ip, cfg.ip, cfg.mask)) {
        const h = hostAt(w, ip);
        if (!h) return fail('no-arp');
        return h.ping ? { ok: true, via: 'local', hops: [ip], fail: null } : fail('no-reply');
    }
    if (!cfg.gateway) return fail('no-route');
    if (!w.router || w.router.ip !== cfg.gateway || !sameSubnet(cfg.gateway, cfg.ip, cfg.mask)) return fail('gateway-dead');
    const h = w.hosts.find((x) => x.ip === ip);
    const online = h ? h.ping : (w.router.internet && Object.values(w.internet || {}).includes(ip));
    if (!online) return { ok: false, via: 'gateway', hops: [cfg.gateway], fail: 'no-reply' };
    return { ok: true, via: 'gateway', hops: [cfg.gateway, ip], fail: null };
}

function fqdnOf(w, name) {
    const n = String(name).toLowerCase().replace(/\.$/, '');
    return n.includes('.') ? n : `${n}.${w.domain}`;
}

function dnsAnswer(w, server, fqdn) {
    const zone = own(w.dns, server);
    if (!zone) return undefined;
    return own(zone.records, fqdn) || own(w.internet, fqdn) || null;
}

export function resolve(m, w, name) {
    const raw = String(name).toLowerCase().replace(/\.$/, '');
    const fqdn = fqdnOf(w, raw);
    const result = (ip, source) => ({ ok: true, ip, fqdn, source, fail: null });
    if (raw === 'localhost') return result('127.0.0.1', 'hosts');
    const hosts = parseHosts(readFile(m, HOSTS_PATH) || '');
    if (own(hosts, raw)) return result(hosts[raw], 'hosts');
    if (own(hosts, fqdn)) return result(hosts[fqdn], 'hosts');
    if (own(m.cache, fqdn)) return result(m.cache[fqdn], 'cache');
    let reached = false;
    for (const server of effectiveConfig(m).dns) {
        if (!route(m, w, server).ok) continue;
        const answer = dnsAnswer(w, server, fqdn);
        if (answer === undefined) continue;
        reached = true;
        if (answer) {
            m.cache[fqdn] = answer;
            return result(answer, 'dns');
        }
        break;
    }
    return { ok: false, ip: null, fqdn, source: null, fail: reached ? 'nxdomain' : 'timeout' };
}

export function nslookupQuery(m, w, name, serverIp) {
    const fqdn = fqdnOf(w, name);
    const server = serverIp || effectiveConfig(m).dns[0];
    if (!server) return { server: { ip: null, name: null }, ok: false, ip: null, fqdn, fail: 'no-server' };
    const zone = own(w.dns, server);
    const info = { ip: server, name: zone ? zone.name : null };
    if (!zone || !route(m, w, server).ok) return { server: { ip: server, name: null }, ok: false, ip: null, fqdn, fail: 'timeout' };
    const answer = dnsAnswer(w, server, fqdn);
    if (!answer) return { server: info, ok: false, ip: null, fqdn, fail: 'nxdomain' };
    return { server: info, ok: true, ip: answer, fqdn, fail: null };
}

function apipaFor(hostname) {
    let h = 2166136261;
    for (const ch of String(hostname)) h = Math.imul(h ^ ch.charCodeAt(0), 16777619) >>> 0;
    return `169.254.${1 + (h % 254)}.${(h >>> 8) % 256}`;
}

export function dhcpRenew(m, w) {
    if (!m.adapter.dhcp) return { machine: m, ok: false, fail: 'static' };
    if (!m.adapter.enabled || !m.adapter.cable) return { machine: m, ok: false, fail: 'no-interface' };
    const next = clone(m);
    if (w.dhcp && w.dhcp.available && w.dhcp.lease) {
        next.lease = { ...w.dhcp.lease, dns: [...w.dhcp.lease.dns], apipa: false };
        return { machine: next, ok: true, fail: null };
    }
    next.lease = { ip: apipaFor(m.hostname), mask: '255.255.0.0', gateway: '', dns: [], apipa: true };
    return { machine: next, ok: false, fail: 'no-dhcp' };
}

export function dhcpRelease(m) {
    const next = clone(m);
    if (next.adapter.dhcp) next.lease = null;
    return next;
}

export function flushDns(m) {
    const next = clone(m);
    next.cache = {};
    return next;
}

const blank = (s) => !s || !String(s).trim();

export function validateIpv4(s) {
    const errors = [];
    const warnings = [];
    if (!s.ipAuto) {
        const ip = parseIpv4(s.ip);
        const bits = maskBits(s.mask);
        const maskN = parseIpv4(s.mask);
        if (ip === null) errors.push('Enter a valid IP address.');
        if (maskN === null || maskN === 0) errors.push('Enter a valid subnet mask.');
        else if (bits === null) errors.push('The subnet mask must be contiguous.');
        if (ip !== null && bits !== null && bits > 0 && bits <= 30) {
            const host = (ip & ~maskN) >>> 0;
            const all = (~maskN) >>> 0;
            if (host === 0 || host === all) errors.push("The IP address can't be the network or broadcast address of its subnet.");
        }
        if (!blank(s.gateway)) {
            if (parseIpv4(s.gateway) === null) errors.push('Enter a valid default gateway, or leave it blank.');
            else if (ip !== null && bits !== null && !sameSubnet(s.gateway, s.ip, s.mask)) warnings.push('gateway-off-subnet');
        }
    }
    if (!s.ipAuto || !s.dnsAuto) {
        if (!blank(s.dns1) && parseIpv4(s.dns1) === null) errors.push('Enter a valid preferred DNS server.');
        if (!blank(s.dns2) && parseIpv4(s.dns2) === null) errors.push('Enter a valid alternate DNS server, or leave it blank.');
    }
    return { errors, warnings };
}

export function applyIpv4(m, s, w) {
    const next = clone(m);
    const a = next.adapter;
    const dns = [s.dns1, s.dns2].filter((x) => !blank(x)).map((x) => x.trim());
    if (!s.ipAuto) {
        Object.assign(a, { dhcp: false, ip: s.ip.trim(), mask: s.mask.trim(), gateway: blank(s.gateway) ? '' : s.gateway.trim(), dnsAuto: false, dns });
        next.lease = null;
        return next;
    }
    const wasStatic = !a.dhcp;
    Object.assign(a, { dhcp: true, ip: '', mask: '', gateway: '', dnsAuto: !!s.dnsAuto, dns: s.dnsAuto ? [] : dns });
    if (wasStatic) next.lease = null;
    return w && !next.lease ? dhcpRenew(next, w).machine : next;
}

export function setAdapterEnabled(m, on, w) {
    const next = clone(m);
    next.adapter.enabled = !!on;
    if (!on) {
        if (next.adapter.dhcp) next.lease = null;
        return next;
    }
    return w && next.adapter.dhcp ? dhcpRenew(next, w).machine : next;
}

function findShare(m, w, unc) {
    const parts = /^\\\\([^\\]+)\\([^\\]+)$/.exec(String(unc).trim());
    if (!parts) return { error: 'bad-path' };
    const server = parts[1];
    const ip = parseIpv4(server) !== null ? server : resolve(m, w, server).ip;
    if (!ip || !route(m, w, ip).ok) return { error: 'not-found' };
    const host = w.hosts.find((h) => h.ip === ip);
    const key = host && host.shares && Object.keys(host.shares).find((k) => k.toLowerCase() === parts[2].toLowerCase());
    if (!key) return { error: 'not-found' };
    return { error: null, files: host.shares[key] };
}

const driveLetter = (letter) => String(letter).trim().replace(/:$/, '').toUpperCase();

export function mapDrive(m, w, letter, unc) {
    const L = driveLetter(letter);
    if (!/^[A-Z]$/.test(L)) return { machine: m, error: 'bad-path' };
    if (L === 'C' || own(m.drives, L)) return { machine: m, error: 'in-use' };
    const found = findShare(m, w, unc);
    if (found.error) return { machine: m, error: found.error };
    const next = clone(m);
    next.drives[L] = String(unc).trim();
    return { machine: next, error: null };
}

export function unmapDrive(m, letter) {
    const L = driveLetter(letter);
    if (!own(m.drives, L)) return { machine: m, error: 'not-found' };
    const next = clone(m);
    delete next.drives[L];
    return { machine: next, error: null };
}

export function listShare(m, w, unc) {
    const found = findShare(m, w, unc);
    return found.error ? null : [...found.files];
}

export function readFile(m, path) {
    const v = own(m.files, fileKey(path));
    return v === undefined ? null : v;
}

export function writeFile(m, path, text) {
    const next = clone(m);
    next.files[fileKey(path)] = String(text);
    return next;
}

export function parseHosts(text) {
    const out = Object.create(null);
    for (const line of String(text).split(/\r?\n/)) {
        const [ip, ...names] = line.replace(/#.*/, '').trim().split(/\s+/);
        if (!names.length || parseIpv4(ip) === null) continue;
        for (const n of names) out[n.toLowerCase()] = ip;
    }
    return out;
}
