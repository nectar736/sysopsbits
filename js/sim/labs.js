// Help desk simulator: the six lab tickets. Labs are data; checks test user-visible outcomes.
// Every lab needs a fix/wrong-fix unit test (scripts/vendor/tests/unit/sim-labs.test.mjs) and a matching
// <h3 id="lab-<id>"> in simulation.html.
import {
    effectiveConfig, route, resolve, applyIpv4, mapDrive, listShare, dhcpRenew, writeFile, HOSTS_PATH, NOTES_PATH,
} from './engine.js';

const INTERNET = { 'www.example.com': '93.184.215.14' };
const NETWORKING = { href: 'tutorials/az-900-azure-networking-fundamentals.html', text: 'Networking fundamentals: subnets, DNS and gateways' };

// Office LAN 10.0.0.0/24: DC01 is DNS and DHCP, FS01 is the file server, INTRANET is the intranet web server.
function corpWorld(extra = {}) {
    return {
        domain: 'corp.local',
        hosts: [
            { ip: '10.0.0.10', name: 'DC01', ping: true },
            { ip: '10.0.0.15', name: 'FS01', ping: true, shares: { Shared: ['Budget-2026.xlsx', 'Employee-Handbook.pdf', 'Org-Chart.pdf'] } },
            { ip: '10.0.0.20', name: 'INTRANET', ping: true },
        ],
        router: { ip: '10.0.0.1', internet: true },
        dns: {
            '10.0.0.10': {
                name: 'DC01.corp.local',
                records: { 'dc01.corp.local': '10.0.0.10', 'fs01.corp.local': '10.0.0.15', 'intranet.corp.local': '10.0.0.20' },
            },
        },
        dhcp: { available: true, server: '10.0.0.10', lease: { ip: '10.0.0.77', mask: '255.255.255.0', gateway: '10.0.0.1', dns: ['10.0.0.10'] } },
        internet: INTERNET,
        ...extra,
    };
}

// Branch office LAN 192.168.1.0/24: DNS01 is DNS, FS01 the file server, the router is .1.
function branchWorld() {
    return {
        domain: 'corp.local',
        hosts: [
            { ip: '192.168.1.10', name: 'DNS01', ping: true },
            { ip: '192.168.1.15', name: 'FS01', ping: true, shares: { Shared: ['Schedules.xlsx'] } },
        ],
        router: { ip: '192.168.1.1', internet: true },
        dns: {
            '192.168.1.10': {
                name: 'DNS01.corp.local',
                records: { 'dns01.corp.local': '192.168.1.10', 'fs01.corp.local': '192.168.1.15', 'prn01.corp.local': '192.168.1.50' },
            },
        },
        dhcp: { available: true, server: '192.168.1.10', lease: { ip: '192.168.1.77', mask: '255.255.255.0', gateway: '192.168.1.1', dns: ['192.168.1.10'] } },
        internet: INTERNET,
    };
}

const reaches = (m, w, name) => {
    const r = resolve(m, w, name);
    return r.ok && route(m, w, r.ip).ok;
};
const files = (notes) => ({ [NOTES_PATH]: notes });

const CORP_NOTES = [
    'NETWORK NOTES - main office',
    '===========================',
    'Subnet ......... 10.0.0.0  mask 255.255.255.0',
    'Router ......... 10.0.0.1',
    'DNS / DHCP ..... DC01      10.0.0.10',
    'File server .... FS01      10.0.0.15   share: \\\\FS01\\Shared',
    'Intranet ....... INTRANET  10.0.0.20   http://intranet.corp.local',
    '',
    'Old DNS server 10.0.0.53 was shut down in October.',
    'Intranet moved from 10.0.0.99 to 10.0.0.20 last month.',
    '',
].join('\r\n');

const BRANCH_NOTES = [
    'NETWORK NOTES - branch office',
    '=============================',
    'Subnet ......... 192.168.1.0  mask 255.255.255.0',
    'Router ......... 192.168.1.1',
    'DNS ............ DNS01   192.168.1.10',
    'File server .... FS01    192.168.1.15',
    'Print server ... PRN01   192.168.1.50  (static, reserved for the print server)',
    '',
].join('\r\n');

const STATIC_CORP = { dhcp: false, ip: '10.0.0.50', mask: '255.255.255.0', gateway: '10.0.0.1', dnsAuto: false };

export const LABS = [
    {
        id: '101',
        title: 'Set up the new print server',
        difficulty: 'Easy',
        ticket: {
            from: 'Dana (Facilities)',
            subject: 'New print server PRN01 needs its permanent address',
            body: 'Hi! The new print server PRN01 is plugged in and running. Everyone\'s printers point at 192.168.1.50, so it needs to keep that address permanently. Right now it picked up some random address on its own. The address plan is in network-notes.txt on the desktop. Thanks!',
        },
        done: ['PRN01 always uses the address in the plan.', 'PRN01 can reach the router and the DNS server.'],
        world: branchWorld(),
        machine: { hostname: 'PRN01', adapter: { dhcp: true }, lease: { ip: '192.168.1.77', mask: '255.255.255.0', gateway: '192.168.1.1', dns: ['192.168.1.10'] }, files: files(BRANCH_NOTES) },
        notes: BRANCH_NOTES,
        checks: [
            {
                label: 'Static address 192.168.1.50/24, gateway 192.168.1.1, DNS 192.168.1.10',
                test: (m) => {
                    const a = m.adapter;
                    return !a.dhcp && a.ip === '192.168.1.50' && a.mask === '255.255.255.0' && a.gateway === '192.168.1.1' && a.dns[0] === '192.168.1.10';
                },
            },
            { label: 'The router answers', test: (m, w) => route(m, w, '192.168.1.1').ok },
            { label: 'The DNS server answers names', test: (m, w) => reaches(m, w, 'fs01') },
        ],
        failReply: 'Dana: The printers still can\'t find the print server at the planned address. Can you double-check the settings against the plan?',
        hints: [
            'Run ipconfig /all. Does it say DHCP Enabled: Yes? That means the address can change.',
            'Open Network Connections, then Properties, then Internet Protocol Version 4 (TCP/IPv4). Choose "Use the following IP address".',
            'Enter IP 192.168.1.50, mask 255.255.255.0, gateway 192.168.1.1 and preferred DNS 192.168.1.10, then OK.',
        ],
        debrief: {
            cause: 'The server was on DHCP, so its address could change. Servers that other devices point at need a static address.',
            remember: 'An IPv4 setup has four parts: the address, the subnet mask (which addresses are local), the default gateway (the way off the local network) and the DNS server (who turns names into addresses).',
            command: 'netsh interface ipv4 set address name="Ethernet" static 192.168.1.50 255.255.255.0 192.168.1.1',
            link: NETWORKING,
        },
        fix: (m, w) => applyIpv4(m, { ipAuto: false, ip: '192.168.1.50', mask: '255.255.255.0', gateway: '192.168.1.1', dnsAuto: false, dns1: '192.168.1.10', dns2: '' }, w),
    },
    {
        id: '102',
        title: 'My S: drive disappeared',
        difficulty: 'Easy',
        ticket: {
            from: 'Marcus (Accounting)',
            subject: 'S: drive is gone!!',
            body: 'I got a new PC this morning and my S: drive isn\'t there anymore. That\'s where the budget spreadsheet lives and I need it for a meeting at 2. It used to be the Shared folder on the file server.',
        },
        done: ['Marcus has an S: drive again.', 'S: opens the Shared folder with the budget spreadsheet.'],
        world: corpWorld(),
        machine: { hostname: 'ACCT-PC14', adapter: { dhcp: true }, lease: { ip: '10.0.0.77', mask: '255.255.255.0', gateway: '10.0.0.1', dns: ['10.0.0.10'] }, files: files(CORP_NOTES) },
        notes: CORP_NOTES,
        checks: [
            { label: 'S: is mapped', test: (m) => !!m.drives.S },
            {
                label: 'S: opens the Shared folder on FS01',
                test: (m, w) => !!m.drives.S && /\\shared$/i.test(m.drives.S) && !!listShare(m, w, m.drives.S),
            },
        ],
        failReply: 'Marcus: I still don\'t see the budget spreadsheet on S:. My meeting is in an hour!',
        hints: [
            'Run net use to see which drives are mapped. Check network-notes.txt for the file server\'s name.',
            'A network folder is written as \\\\server\\share. You can map one in My Computer (Tools, Map Network Drive) or with net use.',
            'Type net use S: \\\\FS01\\Shared, then dir S: to check the spreadsheet is there.',
        ],
        debrief: {
            cause: 'Drive mappings belong to the user profile on a PC, so a new PC starts without them.',
            remember: 'A UNC path (\\\\server\\share) names a network folder. Mapping gives it a drive letter. In an office, Group Policy or a logon script usually maps drives for everyone.',
            command: 'net use S: \\\\FS01\\Shared /persistent:yes',
            link: { href: 'tutorials/cmd-vs-powershell-2026.html', text: 'CMD vs PowerShell: which to use for admin tasks' },
        },
        fix: (m, w) => mapDrive(m, w, 'S:', '\\\\FS01\\Shared').machine,
    },
    {
        id: '103',
        title: 'The network says 169.254',
        difficulty: 'Easy',
        ticket: {
            from: 'Priya (Sales)',
            subject: 'No internet since this morning',
            body: 'My laptop says it\'s connected but nothing loads. The wall jack at my desk was dead this morning, but facilities said they fixed it an hour ago. My colleague looked at the settings and said the address starts with 169.254. Is that bad?',
        },
        done: ['Priya\'s laptop gets a proper office address.', 'Websites load again.'],
        world: corpWorld(),
        machine: { hostname: 'LAPTOP-07', adapter: { dhcp: true }, lease: { ip: '169.254.83.12', mask: '255.255.0.0', gateway: '', dns: [], apipa: true }, files: files(CORP_NOTES) },
        notes: CORP_NOTES,
        checks: [
            { label: 'The laptop has a DHCP address, not 169.254', test: (m) => effectiveConfig(m).source === 'dhcp' },
            { label: 'Websites load', test: (m, w) => reaches(m, w, 'www.example.com') },
        ],
        failReply: 'Priya: Still nothing loads, and it still says 169.254 something.',
        hints: [
            'Run ipconfig. An address starting 169.254 means the PC gave itself an address because no DHCP server answered.',
            'The jack is fixed now, so the DHCP server should answer if the laptop asks again.',
            'Run ipconfig /renew. (Disabling and enabling the adapter in Network Connections also works.)',
        ],
        debrief: {
            cause: 'When the jack was dead, DHCP got no answer, so Windows gave itself an APIPA address (169.254.x.x) that only works with other APIPA devices.',
            remember: '169.254.x.x always means "DHCP didn\'t answer". Windows retries on its own every few minutes; ipconfig /renew asks right now. If renew fails, look at the cable, the switch port or the DHCP server.',
            command: 'ipconfig /renew',
            link: NETWORKING,
        },
        fix: (m, w) => dhcpRenew(m, w).machine,
    },
    {
        id: '104',
        title: 'Can\'t open the intranet',
        difficulty: 'Medium',
        ticket: {
            from: 'Tom (HR)',
            subject: 'Intranet won\'t load',
            body: 'The intranet (intranet.corp.local) says "can\'t find server" on my PC. My coworker next to me can open it fine. I haven\'t changed anything, but IT did some cleanup on my PC last week.',
        },
        done: ['intranet.corp.local opens on Tom\'s PC.'],
        world: corpWorld(),
        machine: { hostname: 'HR-PC03', adapter: { ...STATIC_CORP, dns: ['10.0.0.53'] }, files: files(CORP_NOTES) },
        notes: CORP_NOTES,
        checks: [
            { label: 'intranet.corp.local resolves to 10.0.0.20', test: (m, w) => resolve(m, w, 'intranet.corp.local').ip === '10.0.0.20' },
            { label: 'The intranet answers', test: (m, w) => route(m, w, '10.0.0.20').ok },
        ],
        failReply: 'Tom: Still "can\'t find server" when I open the intranet.',
        hints: [
            'Try ping intranet, then ping 10.0.0.20 (the address from network-notes.txt). What does it mean if the address works but the name doesn\'t?',
            'Run nslookup intranet. Which DNS server is the PC asking, and does it answer? Compare it with network-notes.txt.',
            'In TCP/IPv4 Properties, set the preferred DNS server to 10.0.0.10 (DC01).',
        ],
        debrief: {
            cause: 'The PC was still set to use the old DNS server, 10.0.0.53, which was shut down. With no DNS answer, names fail while addresses still work.',
            remember: 'If ping by IP works but ping by name fails, it\'s DNS. nslookup shows which server you\'re asking. If a name still fails right after a fix, ipconfig /flushdns clears cached failures.',
            command: 'netsh interface ipv4 set dnsservers name="Ethernet" static 10.0.0.10 primary',
            link: NETWORKING,
        },
        fix: (m, w) => applyIpv4(m, { ipAuto: false, ip: '10.0.0.50', mask: '255.255.255.0', gateway: '10.0.0.1', dnsAuto: false, dns1: '10.0.0.10', dns2: '' }, w),
    },
    {
        id: '105',
        title: 'Internet\'s down, but the file server works',
        difficulty: 'Medium',
        ticket: {
            from: 'Alex (Branch office)',
            subject: 'No websites, but the file server is fine',
            body: 'Weird one: I can open files on the file server (FS01) all day, but no websites load at all. Everyone else at the branch is fine. Someone set up my PC by hand when the branch opened.',
        },
        done: ['Websites load on Alex\'s PC.', 'The file server still works.'],
        world: branchWorld(),
        machine: { hostname: 'BR-PC02', adapter: { dhcp: false, ip: '192.168.1.40', mask: '255.255.255.0', gateway: '192.168.1.254', dnsAuto: false, dns: ['192.168.1.10'] }, files: files(BRANCH_NOTES) },
        notes: BRANCH_NOTES,
        checks: [
            { label: 'Websites load', test: (m, w) => reaches(m, w, 'www.example.com') },
            { label: 'The file server still works', test: (m, w) => reaches(m, w, 'fs01') },
        ],
        failReply: 'Alex: Websites still don\'t load. Is it my browser?',
        hints: [
            'FS01 is on the same subnet as the PC; websites are not. What does a PC need to reach other networks?',
            'Run tracert www.example.com and ipconfig. Compare the default gateway with the router in network-notes.txt.',
            'In TCP/IPv4 Properties, set the default gateway to 192.168.1.1.',
        ],
        debrief: {
            cause: 'The default gateway was 192.168.1.254, an address with no router on it. Local traffic goes straight to the device; everything else goes to the gateway, so only off-network traffic failed.',
            remember: 'Local works, remote fails: check the default gateway. tracert that stops at hop 1 points at the gateway too.',
            command: 'tracert www.example.com',
            link: { href: 'tutorials/azure-nsg-best-practices.html', text: 'How traffic rules and routes control what reaches what' },
        },
        fix: (m, w) => applyIpv4(m, { ipAuto: false, ip: '192.168.1.40', mask: '255.255.255.0', gateway: '192.168.1.1', dnsAuto: false, dns1: '192.168.1.10', dns2: '' }, w),
    },
    {
        id: '106',
        title: 'Intranet works for everyone but me',
        difficulty: 'Medium',
        ticket: {
            from: 'Sam (Marketing)',
            subject: 'Intranet times out on my PC only',
            body: 'The intranet just spins and times out on my PC. Everyone else can use it. Last month a contractor "fixed" something on my PC so I could reach the intranet during the move. Not sure what they did.',
        },
        done: ['intranet.corp.local opens on Sam\'s PC.'],
        world: corpWorld(),
        machine: {
            hostname: 'MKT-PC09',
            adapter: { ...STATIC_CORP, ip: '10.0.0.61', dns: ['10.0.0.10'] },
            files: {
                ...files(CORP_NOTES),
                [HOSTS_PATH]: '# hosts file for BitsOS.\r\n#\r\n# Added by contractor during the intranet move\r\n10.0.0.99    intranet.corp.local\r\n',
            },
        },
        notes: CORP_NOTES,
        checks: [
            { label: 'intranet.corp.local resolves to 10.0.0.20', test: (m, w) => resolve(m, w, 'intranet.corp.local').ip === '10.0.0.20' },
            { label: 'The intranet answers', test: (m, w) => route(m, w, '10.0.0.20').ok },
        ],
        failReply: 'Sam: Still timing out on the intranet.',
        hints: [
            'Compare nslookup intranet with ping intranet.corp.local. Do they show the same address?',
            'nslookup only asks the DNS server. ping uses the full Windows lookup, which reads a local file first. Try type C:\\Windows\\System32\\drivers\\etc\\hosts',
            'Open the hosts file in Notepad, delete the 10.0.0.99 line and save.',
        ],
        debrief: {
            cause: 'A hosts file entry from the move still pointed the intranet at its old address, 10.0.0.99. Windows reads the hosts file before asking DNS.',
            remember: 'nslookup skips the hosts file, so it can look right while apps fail. When nslookup and ping disagree, check the hosts file. ipconfig /flushdns clears any answer Windows cached before the edit.',
            command: 'type C:\\Windows\\System32\\drivers\\etc\\hosts',
            link: { href: 'tutorials/fix-vpn-issues-windows-powershell.html', text: 'Fix connection problems with PowerShell' },
        },
        fix: (m) => writeFile(m, HOSTS_PATH, '# hosts file for BitsOS.\r\n#\r\n'),
    },
];

export function checkLab(lab, machine) {
    const failed = lab.checks.filter((c) => !c.test(machine, lab.world)).map((c) => c.label);
    return { passed: failed.length === 0, failed };
}
