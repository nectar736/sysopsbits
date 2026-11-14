// Help desk simulator: Command Prompt. Turns a typed line into Windows-format output lines.
// Output layouts follow real Windows 11 captures in scripts/vendor/tests/unit/fixtures/win-output.md.
import {
    parseIpv4, formatIpv4, effectiveConfig, route, resolve, nslookupQuery, dhcpRenew, dhcpRelease, flushDns,
    mapDrive, unmapDrive, listShare, readFile, parseHosts, HOSTS_PATH,
} from './engine.js';

export const PROMPT = 'C:\\Users\\you>';
export const COMMANDS = ['help', 'cls', 'exit', 'hostname', 'ipconfig', 'ping', 'tracert', 'nslookup', 'net', 'dir', 'type', 'arp'];

const HEADER = ['', 'Windows IP Configuration', ''];
const CONT = ' '.repeat(39);
const LABEL = {
    host: 'Host Name . . . . . . . . . . . . : ',
    primary: 'Primary Dns Suffix  . . . . . . . : ',
    node: 'Node Type . . . . . . . . . . . . : ',
    routing: 'IP Routing Enabled. . . . . . . . : ',
    wins: 'WINS Proxy Enabled. . . . . . . . : ',
    search: 'DNS Suffix Search List. . . . . . : ',
    media: 'Media State . . . . . . . . . . . : ',
    suffix: 'Connection-specific DNS Suffix  . : ',
    desc: 'Description . . . . . . . . . . . : ',
    mac: 'Physical Address. . . . . . . . . : ',
    dhcp: 'DHCP Enabled. . . . . . . . . . . : ',
    auto: 'Autoconfiguration Enabled . . . . : ',
    ipv4: 'IPv4 Address. . . . . . . . . . . : ',
    apipa: 'Autoconfiguration IPv4 Address. . : ',
    mask: 'Subnet Mask . . . . . . . . . . . : ',
    gateway: 'Default Gateway . . . . . . . . . : ',
    dhcpServer: 'DHCP Server . . . . . . . . . . . : ',
    dns: 'DNS Servers . . . . . . . . . . . : ',
    netbios: 'NetBIOS over Tcpip. . . . . . . . : ',
};
const row = (key, value = '') => `   ${LABEL[key]}${value}`;

function hash(s) {
    let h = 2166136261;
    for (const ch of String(s)) h = Math.imul(h ^ ch.charCodeAt(0), 16777619) >>> 0;
    return h;
}
const hex2 = (n) => (n & 255).toString(16).toUpperCase().padStart(2, '0');
const macFor = (seed) => { const h = hash(seed); return ['02', '50', 'B1', hex2(h >>> 16), hex2(h >>> 8), hex2(h)].join('-'); };

function tokenize(input) {
    const out = [];
    const re = /"([^"]*)"|(\S+)/g;
    let m;
    while ((m = re.exec(input))) out.push(m[1] !== undefined ? m[1] : m[2]);
    return out;
}
const isSwitch = (t) => /^[-/]/.test(t);
const sw = (t) => '/' + t.slice(1).toLowerCase();

// ---------- ipconfig ----------

function adapterBlock(m, w, all) {
    const a = m.adapter;
    if (!a.enabled) return [];
    const cfg = effectiveConfig(m);
    const lines = ['', 'Ethernet adapter Ethernet:', ''];
    const identity = all ? [row('desc', 'BitsNet PCI Fast Ethernet Adapter'), row('mac', macFor(m.hostname)), row('dhcp', a.dhcp ? 'Yes' : 'No'), row('auto', 'Yes')] : [];
    if (!a.cable) return [...lines, row('media', 'Media disconnected'), row('suffix'), ...identity];
    lines.push(row('suffix', cfg.source === 'dhcp' ? w.domain : ''), ...identity);
    const pref = all ? '(Preferred) ' : '';
    if (cfg.source !== 'none') {
        lines.push(row(cfg.source === 'apipa' ? 'apipa' : 'ipv4', cfg.ip + pref), row('mask', cfg.mask));
    }
    lines.push(row('gateway', cfg.gateway || ''));
    if (all) {
        if (cfg.source === 'dhcp' && w.dhcp && w.dhcp.server) lines.push(row('dhcpServer', w.dhcp.server));
        if (cfg.source !== 'none' && cfg.dns.length) {
            lines.push(row('dns', cfg.dns[0]), ...cfg.dns.slice(1).map((d) => CONT + d));
        }
        lines.push(row('netbios', 'Enabled'));
    }
    return lines;
}

function ipconfigAll(m, w) {
    return [...HEADER, row('host', m.hostname), row('primary', w.domain), row('node', 'Hybrid'), row('routing', 'No'), row('wins', 'No'), row('search', w.domain), ...adapterBlock(m, w, true)];
}

const NO_ADAPTER = 'The operation failed as no adapter is in the state permissible for this operation.';
const MEDIA = 'No operation can be performed on Ethernet while it has its media disconnected.';

function ipconfig(args, m, w) {
    const s = args.length ? (isSwitch(args[0]) ? sw(args[0]) : '?') : '';
    if (s === '') return { machine: m, lines: [...HEADER, ...adapterBlock(m, w, false)] };
    if (s === '/all') return { machine: m, lines: ipconfigAll(m, w) };
    if (s === '/flushdns') return { machine: flushDns(m), lines: [...HEADER, 'Successfully flushed the DNS Resolver Cache.'] };
    if (s === '/displaydns') return { machine: m, lines: displayDns(m) };
    if (s === '/release' || s === '/renew') {
        const a = m.adapter;
        if (!a.dhcp || !a.enabled) return { machine: m, lines: [...HEADER, NO_ADAPTER] };
        if (!a.cable) return { machine: m, lines: [...HEADER, MEDIA] };
        if (s === '/release') {
            const next = dhcpRelease(m);
            return { machine: next, lines: [...HEADER, ...adapterBlock(next, w, false)] };
        }
        const r = dhcpRenew(m, w);
        if (!r.ok) return { machine: r.machine, lines: [...HEADER, 'An error occurred while renewing interface Ethernet : unable to contact your DHCP server. Request has timed out.'] };
        return { machine: r.machine, lines: [...HEADER, ...adapterBlock(r.machine, w, false)] };
    }
    return { machine: m, lines: ['Error: unrecognized or incomplete command line.', '', 'Try: ipconfig /all'] };
}

function displayDns(m) {
    const entries = [];
    for (const [name, ip] of Object.entries(parseHosts(readFile(m, HOSTS_PATH) || ''))) entries.push([name, ip, 86400]);
    for (const [name, ip] of Object.entries(m.cache)) entries.push([name, ip, 3600]);
    if (!entries.length) return [...HEADER, 'Could not display the DNS Resolver Cache.'];
    const lines = [...HEADER];
    for (const [name, ip, ttl] of entries) {
        lines.push(`    ${name}`, '    ----------------------------------------', `    Record Name . . . . . : ${name}`,
            '    Record Type . . . . . : 1', `    Time To Live  . . . . : ${ttl}`, '    Data Length . . . . . : 4',
            '    Section . . . . . . . : Answer', `    A (Host) Record . . . : ${ip}`, '');
    }
    return lines;
}

// ---------- ping / tracert ----------

function lookup(m, w, target) {
    if (parseIpv4(target) !== null) return { ip: target, label: target, literal: true };
    const r = resolve(m, w, target);
    if (!r.ok) return null;
    const shown = !target.includes('.') && r.source === 'hosts' ? target : r.fqdn;
    return { ip: r.ip, label: `${shown} [${r.ip}]`, fqdn: shown, literal: false };
}

const isInternet = (w, ip) => !w.hosts.some((h) => h.ip === ip) && !(w.router && w.router.ip === ip);

function ping(args, m, w) {
    let count = 4;
    let target = null;
    for (let i = 0; i < args.length; i++) {
        if (isSwitch(args[i])) {
            if (sw(args[i]) === '/n') count = Math.min(10, Math.max(1, parseInt(args[++i], 10) || 4));
        } else if (!target) target = args[i];
    }
    if (!target) {
        return { machine: m, lines: ['', 'Usage: ping [-t] [-a] [-n count] [-l size] [-f] [-i TTL] [-v TOS]',
            '            [-r count] [-s count] [[-j host-list] | [-k host-list]]',
            '            [-w timeout] [-R] [-S srcaddr] [-c compartment] [-p]',
            '            [-4] [-6] target_name', '', 'Try: ping <name or IP address>'] };
    }
    const t = lookup(m, w, target);
    if (!t) return { machine: m, lines: [`Ping request could not find host ${target}. Please check the name and try again.`] };
    const r = route(m, w, t.ip);
    const own = effectiveConfig(m).ip;
    const lines = ['', `Pinging ${t.label} with 32 bytes of data:`];
    const times = [];
    let received = 0;
    for (let i = 0; i < count; i++) {
        if (r.ok) {
            received++;
            let ms;
            if (r.via === 'loopback') ms = 0;
            else if (r.via === 'local') ms = 1 + ((hash(t.ip) + i) % 3);
            else ms = 12 + ((hash(t.ip) + i * 3) % 9);
            times.push(ms);
            const ttl = r.via === 'gateway' ? (isInternet(w, t.ip) ? 55 : 127) : 128;
            lines.push(`Reply from ${t.ip}: bytes=32 time${ms === 0 ? '<1' : '=' + ms}ms TTL=${ttl}`);
        } else if (r.fail === 'no-arp' || r.fail === 'gateway-dead') {
            received++;
            lines.push(`Reply from ${own}: Destination host unreachable.`);
        } else if (r.fail === 'no-reply') {
            lines.push('Request timed out.');
        } else {
            lines.push('PING: transmit failed. General failure.');
        }
    }
    const lost = count - received;
    lines.push('', `Ping statistics for ${t.ip}:`, `    Packets: Sent = ${count}, Received = ${received}, Lost = ${lost} (${Math.round((lost / count) * 100)}% loss),`);
    if (times.length) {
        const min = Math.min(...times), max = Math.max(...times);
        const avg = Math.floor(times.reduce((a, b) => a + b, 0) / times.length);
        lines.push('Approximate round trip times in milli-seconds:', `    Minimum = ${min}ms, Maximum = ${max}ms, Average = ${avg}ms`);
    }
    return { machine: m, lines, stream: true };
}

const hopTime = (ms) => (ms === 0 ? '<1 ms' : `${ms} ms`).padStart(9);
const hop = (n, ms, ip) => `${String(n).padStart(3)}${hopTime(ms[0])}${hopTime(ms[1])}${hopTime(ms[2])}  ${ip} `;
const hopLost = (n) => `${String(n).padStart(3)}     *        *        *     Request timed out.`;

function tracert(args, m, w) {
    const target = args.find((a) => !isSwitch(a));
    if (!target) return { machine: m, lines: ['', 'Usage: tracert [-d] [-h maximum_hops] [-j host-list] [-w timeout]', '', 'Try: tracert <name or IP address>'] };
    const t = lookup(m, w, target);
    if (!t) return { machine: m, lines: [`Unable to resolve target system name ${target}.`] };
    const lines = t.literal
        ? ['', `Tracing route to ${t.ip} over a maximum of 30 hops`, '']
        : ['', `Tracing route to ${t.label}`, 'over a maximum of 30 hops:', ''];
    const r = route(m, w, t.ip);
    const own = effectiveConfig(m).ip;
    const far = (n) => { const b = 12 + (hash(t.ip) % 6); return [b + (n % 3), b + 1, b + ((n + 1) % 3)]; };
    if (r.ok) {
        r.hops.forEach((ip, i) => lines.push(hop(i + 1, r.via === 'gateway' && i > 0 && isInternet(w, ip) ? far(i) : [0, 0, 0], ip)));
    } else if (r.fail === 'no-arp' || r.fail === 'gateway-dead') {
        lines.push(`  1  ${own}  reports: Destination host unreachable.`);
    } else if (r.fail === 'no-reply') {
        let n = 1;
        for (const ip of r.hops) lines.push(hop(n++, [0, 0, 0], ip));
        for (let i = 0; i < 3; i++) lines.push(hopLost(n++));
    } else {
        lines.push('Transmit error: code 1231.');
    }
    lines.push('', 'Trace complete.');
    return { machine: m, lines, stream: true };
}

// ---------- nslookup ----------

function nslookup(args, m, w) {
    const plain = args.filter((a) => !isSwitch(a));
    if (!plain.length) return { machine: m, lines: ["The simulator doesn't support interactive nslookup. Try: nslookup <name>"] };
    const [name, serverArg] = plain;
    let server;
    if (serverArg) {
        server = parseIpv4(serverArg) !== null ? serverArg : resolve(m, w, serverArg).ip;
        if (!server) return { machine: m, lines: [`*** Can't find address for server ${serverArg}: Non-existent domain`] };
    }
    const q = nslookupQuery(m, w, name, server);
    if (q.fail === 'no-server') {
        return { machine: m, lines: ['*** Default servers are not available', 'Server:  UnKnown', 'Address:  127.0.0.1', '', `*** UnKnown can't find ${name}: No response from server`] };
    }
    if (q.fail === 'timeout') {
        const to = ['DNS request timed out.', '    timeout was 2 seconds.'];
        return { machine: m, lines: [...to, 'Server:  UnKnown', `Address:  ${q.server.ip}`, '', ...to, ...to, '*** Request to UnKnown timed-out'] };
    }
    const head = [`Server:  ${q.server.name}`, `Address:  ${q.server.ip}`, ''];
    if (q.fail === 'nxdomain') return { machine: m, lines: [...head, `*** ${q.server.name} can't find ${q.fqdn}: Non-existent domain`] };
    const authoritative = !!w.dns[q.server.ip].records[q.fqdn];
    return { machine: m, lines: [...head, ...(authoritative ? [] : ['Non-authoritative answer:']), `Name:    ${q.fqdn}`, `Address:  ${q.ip}`, ''] };
}

// ---------- net use / dir / type / arp ----------

const NET_SYNTAX = ['The syntax of this command is:', '', 'NET USE [devicename: [\\\\computername\\sharename]] [/DELETE]', ''];

function net(args, m, w) {
    if (!args.length || args[0].toLowerCase() !== 'use') return { machine: m, lines: [...NET_SYNTAX, 'The simulator supports NET USE only.'] };
    const rest = args.slice(1).filter((a) => !/^[-/]persistent:/i.test(a));
    if (!rest.length) {
        const drives = Object.entries(m.drives);
        if (!drives.length) return { machine: m, lines: ['New connections will be remembered.', '', 'There are no entries in the list.', ''] };
        const lines = ['New connections will be remembered.', '', '', 'Status       Local     Remote                    Network', '',
            '-'.repeat(79)];
        for (const [L, unc] of drives) {
            const status = listShare(m, w, unc) ? 'OK' : 'Unavailable';
            lines.push(status.padEnd(13) + `${L}:`.padEnd(10) + unc.padEnd(26) + 'BitsOS Network');
        }
        lines.push('The command completed successfully.', '');
        return { machine: m, lines };
    }
    const [dev, second] = rest;
    if (rest.length === 2 && isSwitch(second) && sw(second).startsWith('/d')) {
        const r = unmapDrive(m, dev);
        if (r.error) return { machine: m, lines: ['The network connection could not be found.', '', 'More help is available by typing NET HELPMSG 2250.', ''] };
        return { machine: r.machine, lines: [`${dev.toUpperCase().replace(/:?$/, ':')} was deleted successfully.`, ''] };
    }
    if (rest.length === 2 && /^[a-z]:$/i.test(dev)) {
        const r = mapDrive(m, w, dev, second);
        if (r.error === 'in-use') return { machine: m, lines: ['System error 85 has occurred.', '', 'The local device name is already in use.', ''] };
        if (r.error) return { machine: m, lines: ['System error 67 has occurred.', '', 'The network name cannot be found.', ''] };
        return { machine: r.machine, lines: ['The command completed successfully.', ''] };
    }
    return { machine: m, lines: NET_SYNTAX };
}

const STAMP = '11/03/2026  09:14 AM';
const commas = (n) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ',');

function dir(args, m, w) {
    const arg = args.find((a) => !isSwitch(a));
    const letter = arg ? arg.replace(/[:\\]+$/, '').toUpperCase() : 'C';
    if (letter === 'C') {
        return { machine: m, lines: [' Volume in drive C has no label.', ' Volume Serial Number is 1A2B-3C4D', '', ' Directory of C:\\Users\\you', '',
            ...['.', '..', 'Desktop', 'Documents'].map((d) => `${STAMP}    <DIR>          ${d}`),
            '               0 File(s)              0 bytes', '               4 Dir(s)  48,213,409,792 bytes free'] };
    }
    if (!/^[A-Z]$/.test(letter) || !m.drives[letter]) return { machine: m, lines: ['The system cannot find the drive specified.'] };
    const files = listShare(m, w, m.drives[letter]);
    if (!files) return { machine: m, lines: ['The network path was not found.'] };
    const sizes = files.map((f) => 10240 + (hash(f) % 900000));
    const share = m.drives[letter].split('\\').pop();
    return { machine: m, lines: [` Volume in drive ${letter} is ${share}`, ' Volume Serial Number is 5E7A-21C4', '', ` Directory of ${letter}:\\`, '',
        `${STAMP}    <DIR>          .`, ...files.map((f, i) => `${STAMP}${commas(sizes[i]).padStart(18)} ${f}`),
        `${String(files.length).padStart(16)} File(s)${commas(sizes.reduce((a, b) => a + b, 0)).padStart(15)} bytes`,
        '               1 Dir(s)  1,073,741,824 bytes free'] };
}

function type(args, m) {
    const p = args.find((a) => !isSwitch(a));
    if (!p) return { machine: m, lines: ['The syntax of the command is incorrect.'] };
    const full = /^[a-z]:/i.test(p) ? p : `C:\\Users\\you\\${p.replace(/^\\+/, '')}`;
    const text = readFile(m, full);
    if (text === null) return { machine: m, lines: ['The system cannot find the file specified.'] };
    const lines = text.split(/\r?\n/);
    if (lines.length > 1 && lines[lines.length - 1] === '') lines.pop();
    return { machine: m, lines };
}

function arp(args, m, w) {
    if (!args.length || sw(args[0]) !== '/a') return { machine: m, lines: ['Displays the ARP cache. Try: arp -a'] };
    const cfg = effectiveConfig(m);
    if (cfg.source === 'none') return { machine: m, lines: ['No ARP Entries Found.'] };
    const entry = (ip, mac, kind) => '  ' + ip.padEnd(22) + mac.padEnd(22) + kind.padEnd(10);
    const lines = ['', `Interface: ${cfg.ip} --- 0x2`, '  Internet Address      Physical Address      Type'];
    const seen = new Set();
    for (const ip of [cfg.gateway, ...cfg.dns]) {
        if (!ip || seen.has(ip)) continue;
        seen.add(ip);
        const r = route(m, w, ip);
        if (r.ok && r.via === 'local' && ip !== cfg.ip) lines.push(entry(ip, macFor(ip).toLowerCase(), 'dynamic'));
    }
    const ipN = parseIpv4(cfg.ip), maskN = parseIpv4(cfg.mask);
    if (ipN !== null && maskN !== null) lines.push(entry(formatIpv4((ipN | ~maskN) >>> 0), 'ff-ff-ff-ff-ff-ff', 'static'));
    return { machine: m, lines };
}

const HELP = [
    'Commands available in this simulator:',
    '',
    'ARP -A        Shows which local devices this PC has talked to.',
    'CLS           Clears the screen.',
    'DIR [X:]      Lists files on a drive, for example DIR S:',
    'EXIT          Closes the Command Prompt.',
    'HOSTNAME      Shows this computer\'s name.',
    'IPCONFIG      Shows network settings. Also /ALL, /RELEASE, /RENEW, /FLUSHDNS, /DISPLAYDNS',
    'NET USE       Lists, maps (NET USE S: \\\\server\\share) or removes (NET USE S: /DELETE) network drives.',
    'NSLOOKUP      Asks the DNS server for a name, for example NSLOOKUP intranet',
    'PING          Tests whether a name or IP address answers.',
    'TRACERT       Shows each router on the way to a name or IP address.',
    'TYPE          Prints a text file, for example TYPE Desktop\\network-notes.txt',
];

export function runCommand(input, { machine, world }) {
    const tokens = tokenize(String(input).trim());
    if (!tokens.length) return { machine, lines: [] };
    const [first, ...args] = tokens;
    const cmd = first.toLowerCase();
    switch (cmd) {
        case 'help': return { machine, lines: HELP };
        case 'cls': return { machine, lines: [], clear: true };
        case 'exit': return { machine, lines: [], exit: true };
        case 'hostname': return { machine, lines: [machine.hostname] };
        case 'ipconfig': return ipconfig(args, machine, world);
        case 'ping': return ping(args, machine, world);
        case 'tracert': return tracert(args, machine, world);
        case 'nslookup': return nslookup(args, machine, world);
        case 'net': return net(args, machine, world);
        case 'dir': return dir(args, machine, world);
        case 'type': return type(args, machine);
        case 'arp': return arp(args, machine, world);
        default: return { machine, lines: [`'${first}' is not recognized as an internal or external command,`, 'operable program or batch file.'] };
    }
}
