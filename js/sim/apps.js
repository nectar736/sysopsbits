// Help desk simulator: the apps inside BitsOS 98 (Command Prompt, Network Connections, Notepad, My Computer, Help).
// Apps only talk to the shell through the ctx object desktop.js passes in. User text is always set with
// textContent; innerHTML is used only for the constant icon SVGs below.
import { PROMPT, runCommand } from './commands.js';
import {
    effectiveConfig, validateIpv4, applyIpv4, setAdapterEnabled, readFile, writeFile, mapDrive, unmapDrive, listShare,
    HOSTS_PATH, NOTES_PATH,
} from './engine.js';

const PROPS = new Set(['value', 'checked', 'disabled', 'selected', 'hidden']);

export function h(tag, attrs = {}, ...kids) {
    const el = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) {
        if (v === false || v === null || v === undefined) continue;
        if (k === 'class') el.className = v;
        else if (k === 'text') el.textContent = v;
        else if (k === 'icon') el.innerHTML = ICONS[v] || '';
        else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2), v);
        else if (PROPS.has(k)) el[k] = v;
        else el.setAttribute(k, v === true ? '' : String(v));
    }
    for (const kid of kids.flat()) {
        if (kid === null || kid === undefined || kid === false) continue;
        el.append(kid instanceof Node ? kid : String(kid));
    }
    return el;
}

const svg = (body) => `<svg viewBox="0 0 32 32" shape-rendering="crispEdges" aria-hidden="true" focusable="false">${body}</svg>`;
export const ICONS = {
    computer: svg('<rect x="4" y="4" width="24" height="17" fill="#c0c0c0" stroke="#000"/><rect x="7" y="7" width="18" height="11" fill="#000080"/><rect x="9" y="9" width="6" height="2" fill="#7fbfff"/><rect x="10" y="22" width="12" height="3" fill="#808080"/><rect x="6" y="25" width="20" height="3" fill="#c0c0c0" stroke="#000"/>'),
    net: svg('<rect x="2" y="3" width="13" height="10" fill="#c0c0c0" stroke="#000"/><rect x="4" y="5" width="9" height="6" fill="#008080"/><rect x="17" y="17" width="13" height="10" fill="#c0c0c0" stroke="#000"/><rect x="19" y="19" width="9" height="6" fill="#008080"/><path d="M8 14v8h9" fill="none" stroke="#ffff00" stroke-width="2"/>'),
    cmd: svg('<rect x="3" y="5" width="26" height="22" fill="#c0c0c0" stroke="#000"/><rect x="3" y="5" width="26" height="4" fill="#000080"/><rect x="5" y="11" width="22" height="14" fill="#000"/><path d="M8 14l3 2-3 2" fill="none" stroke="#c0c0c0" stroke-width="1.5"/><rect x="13" y="19" width="6" height="1.5" fill="#c0c0c0"/>'),
    notepad: svg('<rect x="6" y="3" width="20" height="26" fill="#fff" stroke="#000"/><rect x="6" y="3" width="20" height="4" fill="#5f9fdf"/><path d="M9 11h14M9 15h14M9 19h14M9 23h9" stroke="#808080"/>'),
    tickets: svg('<rect x="6" y="5" width="20" height="24" fill="#f0e68c" stroke="#000"/><rect x="11" y="2" width="10" height="5" fill="#c0c0c0" stroke="#000"/><path d="M9 12h3M14 12h9M9 17h3M14 17h9M9 22h3M14 22h7" stroke="#000"/>'),
    logo: svg('<rect x="3" y="3" width="26" height="26" fill="#f5a524" stroke="#000"/><path d="M8 11l6 5-6 5" fill="none" stroke="#14110a" stroke-width="3"/><rect x="16" y="20" width="9" height="3" fill="#14110a"/>'),
    help: svg('<circle cx="16" cy="16" r="13" fill="#ffff80" stroke="#000"/><text x="16" y="22" font-size="17" font-weight="700" text-anchor="middle" font-family="Tahoma, sans-serif">?</text>'),
    power: svg('<circle cx="16" cy="17" r="10" fill="none" stroke="#a00000" stroke-width="3"/><rect x="14.5" y="3" width="3" height="13" fill="#a00000"/>'),
    error: svg('<circle cx="16" cy="16" r="13" fill="#e00000" stroke="#600"/><path d="M10 10l12 12M22 10L10 22" stroke="#fff" stroke-width="3"/>'),
    info: svg('<circle cx="16" cy="16" r="13" fill="#1060d0" stroke="#003"/><rect x="14.5" y="13" width="3" height="11" fill="#fff"/><rect x="14.5" y="8" width="3" height="3" fill="#fff"/>'),
    warning: svg('<path d="M16 3L30 28H2z" fill="#ffd800" stroke="#000"/><rect x="14.5" y="11" width="3" height="10" fill="#000"/><rect x="14.5" y="23" width="3" height="3" fill="#000"/>'),
    drive: svg('<rect x="3" y="10" width="26" height="12" fill="#c0c0c0" stroke="#000"/><rect x="22" y="15" width="4" height="2" fill="#00c000"/>'),
    netdrive: svg('<rect x="3" y="6" width="26" height="12" fill="#c0c0c0" stroke="#000"/><rect x="22" y="11" width="4" height="2" fill="#00c000"/><path d="M16 18v6M8 26h16" stroke="#000" stroke-width="2"/>'),
};

const button = (label, action, extra = {}) => h('button', { class: 'os-btn', type: 'button', 'data-action': action, ...extra }, label);
const okCancel = (onOk, onCancel, okLabel = 'OK') => h('div', { class: 'os-row os-row-end' },
    button(okLabel, 'ok', { onclick: onOk }), button('Cancel', 'cancel', { onclick: onCancel }));

// ---------- Command Prompt ----------

const MAX_LINES = 500;

function renderCmd(ctx, body, win) {
    const out = h('pre', { class: 'os-cmd-output', 'aria-live': 'polite' });
    const input = h('input', { id: 'os-cmd-input', class: 'os-cmd-input', type: 'text', 'aria-label': 'Command', autocomplete: 'off', autocapitalize: 'off', spellcheck: 'false', autofocus: true });
    const term = h('div', { class: 'os-term', onclick: () => { if (!getSelection().toString()) input.focus(); } },
        out, h('div', { class: 'os-cmd-line' }, h('span', { text: PROMPT }), input));
    body.append(term);
    const history = [];
    let at = 0;

    const print = (lines) => {
        for (const line of lines) out.append(line + '\n');
        while (out.childNodes.length > MAX_LINES) out.firstChild.remove();
        term.scrollTop = term.scrollHeight;
    };
    print(['BitsOS 98 [Version 4.10.1998]', '(c) BitsOS. Type HELP to see the commands you can use.', '']);

    function drip(lines, done) {
        let i = 0;
        const next = () => {
            if (!win.isConnected) return;
            if (i >= lines.length) { done(); return; }
            print([lines[i++]]);
            setTimeout(next, 150);
        };
        next();
    }

    input.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
            if (!history.length) return;
            e.preventDefault();
            at = Math.max(0, Math.min(history.length, at + (e.key === 'ArrowUp' ? -1 : 1)));
            input.value = history[at] || '';
            return;
        }
        if (e.key !== 'Enter') return;
        e.preventDefault();
        const line = input.value;
        input.value = '';
        if (line.trim()) history.push(line);
        at = history.length;
        print([PROMPT + line]);
        const r = runCommand(line, { machine: ctx.machine(), world: ctx.world() });
        ctx.setMachine(r.machine);
        if (r.exit) { ctx.closeWindow(win); return; }
        if (r.clear) { out.textContent = ''; return; }
        if (!r.lines.length) return;
        if (r.stream && !ctx.reducedMotion()) {
            input.disabled = true;
            drip(r.lines, () => {
                print(['']);
                input.disabled = false;
                input.focus();
            });
        } else {
            print([...r.lines, '']);
        }
    });
}

// ---------- Network Connections ----------

function adapterStatus(m) {
    const a = m.adapter;
    if (!a.enabled) return 'Disabled';
    if (!a.cable) return 'Network cable unplugged';
    const src = effectiveConfig(m).source;
    if (src === 'none') return 'No address yet';
    if (src === 'apipa') return 'Unidentified network';
    return 'Connected';
}

function renderNet(ctx, body) {
    const draw = () => {
        const m = ctx.machine();
        const on = m.adapter.enabled;
        body.replaceChildren(
            h('ul', { class: 'os-list os-sunken', 'aria-label': 'Network adapters' },
                h('li', { class: 'is-selected' }, h('strong', { text: 'Ethernet' }), h('br'), adapterStatus(m), h('br'), 'BitsNet PCI Fast Ethernet Adapter')),
            h('div', { class: 'os-row' },
                button(on ? 'Disable' : 'Enable', 'toggle', { onclick: () => { ctx.setMachine(setAdapterEnabled(ctx.machine(), !on, ctx.world())); draw(); } }),
                button('Status', 'status', { onclick: (e) => showStatus(ctx, e.currentTarget) }),
                button('Properties', 'properties', { onclick: (e) => openAdapter(ctx, e.currentTarget, draw) })),
        );
    };
    draw();
}

function showStatus(ctx, opener) {
    const m = ctx.machine();
    const c = effectiveConfig(m);
    const rows = [
        ['Status', adapterStatus(m)],
        ['IPv4 address', c.ip || ''],
        ['Subnet mask', c.mask || ''],
        ['Default gateway', c.gateway || ''],
        ['DNS servers', c.dns.join(', ')],
        ['DHCP enabled', m.adapter.dhcp ? 'Yes' : 'No'],
    ];
    ctx.openWindow({
        kind: 'status', title: 'Ethernet Status', icon: 'net', opener, escClose: true, width: 320,
        render(body, win) {
            body.append(
                h('dl', { class: 'os-debrief' }, rows.flatMap(([k, v]) => [h('dt', { text: k }), h('dd', { text: v || '(none)' })])),
                h('p', { class: 'os-note', text: 'Tip: ipconfig /all shows the same details and more.' }),
                h('div', { class: 'os-row os-row-end' }, button('Close', 'ok', { autofocus: true, onclick: () => ctx.closeWindow(win) })));
        },
    });
}

function openAdapter(ctx, opener, redraw) {
    ctx.openWindow({
        kind: 'adapter', title: 'Ethernet Properties', icon: 'net', opener, escClose: true, width: 330,
        render(body, win) {
            const items = [
                ['Client for BitsOS Networks', true],
                ['File and Printer Sharing', true],
                ['Internet Protocol Version 4 (TCP/IPv4)', true],
                ['Internet Protocol Version 6 (TCP/IPv6)', false],
            ];
            body.append(
                h('p', { class: 'os-note', text: 'Connect using:' }),
                h('div', { class: 'os-list os-sunken', text: 'BitsNet PCI Fast Ethernet Adapter' }),
                h('p', { class: 'os-note', text: 'This connection uses the following items:' }),
                h('ul', { class: 'os-list os-sunken' }, items.map(([name, on]) => h('li', { class: name.includes('IPv4') ? 'is-selected' : null }, `${on ? '[x]' : '[ ]'} ${name}`))),
                h('div', { class: 'os-row' }, button('Properties', 'ipv4', { onclick: (e) => openIpv4(ctx, e.currentTarget, redraw) })),
                h('p', { class: 'os-note', text: 'Select TCP/IPv4 and click Properties to change the address, gateway or DNS servers.' }),
                okCancel(() => ctx.closeWindow(win), () => ctx.closeWindow(win)),
            );
        },
    });
}

function field(label, name, value, disabled) {
    return h('label', { class: 'os-field' }, h('span', { text: label }),
        h('input', { class: 'os-input', type: 'text', name, value: value || '', disabled, inputmode: 'decimal', autocomplete: 'off', spellcheck: 'false' }));
}
function radio(name, value, label, checked) {
    return h('label', { class: 'os-radio' }, h('input', { type: 'radio', name, value, checked, autofocus: name === 'ipAuto' && checked }), label);
}

function openIpv4(ctx, opener, redraw) {
    ctx.openWindow({
        kind: 'ipv4', title: 'Internet Protocol Version 4 (TCP/IPv4) Properties', icon: 'net', modal: true, opener, width: 380,
        render(body, win) {
            const a = ctx.machine().adapter;
            const ipAuto = a.dhcp;
            const dnsAuto = a.dhcp && a.dnsAuto;
            const form = h('form', { class: 'os-form', onsubmit: (e) => e.preventDefault() },
                h('p', { class: 'os-note', text: 'Get these settings automatically from a DHCP server, or type them in yourself.' }),
                h('fieldset', { class: 'os-group' }, h('legend', { text: 'IP address' }),
                    radio('ipAuto', 'yes', 'Obtain an IP address automatically', ipAuto),
                    radio('ipAuto', 'no', 'Use the following IP address:', !ipAuto),
                    field('IP address:', 'ip', ipAuto ? '' : a.ip),
                    field('Subnet mask:', 'mask', ipAuto ? '' : a.mask),
                    field('Default gateway:', 'gateway', ipAuto ? '' : a.gateway)),
                h('fieldset', { class: 'os-group' }, h('legend', { text: 'DNS servers' }),
                    radio('dnsAuto', 'yes', 'Obtain DNS server address automatically', dnsAuto),
                    radio('dnsAuto', 'no', 'Use the following DNS server addresses:', !dnsAuto),
                    field('Preferred DNS server:', 'dns1', dnsAuto ? '' : a.dns[0]),
                    field('Alternate DNS server:', 'dns2', dnsAuto ? '' : a.dns[1])),
            );
            const el = (n) => form.elements[n];
            const pick = (n) => form.querySelector(`input[name="${n}"]:checked`).value === 'yes';
            const sync = () => {
                const ipA = pick('ipAuto');
                for (const n of ['ip', 'mask', 'gateway']) el(n).disabled = ipA;
                const dnsYes = form.querySelector('input[name="dnsAuto"][value="yes"]');
                dnsYes.disabled = !ipA;
                if (!ipA && dnsYes.checked) form.querySelector('input[name="dnsAuto"][value="no"]').checked = true;
                const dnsA = pick('dnsAuto');
                for (const n of ['dns1', 'dns2']) el(n).disabled = dnsA;
            };
            form.addEventListener('change', sync);
            sync();
            const ok = async (e) => {
                const okBtn = e.currentTarget;
                const s = { ipAuto: pick('ipAuto'), ip: el('ip').value.trim(), mask: el('mask').value.trim(), gateway: el('gateway').value.trim(), dnsAuto: pick('dnsAuto'), dns1: el('dns1').value.trim(), dns2: el('dns2').value.trim() };
                const v = validateIpv4(s);
                if (v.errors.length) {
                    await ctx.message({ kind: 'error', title: 'TCP/IP', icon: 'error', text: v.errors[0], opener: okBtn });
                    return;
                }
                if (v.warnings.includes('gateway-off-subnet')) {
                    const yes = await ctx.message({
                        kind: 'warning', title: 'TCP/IP', icon: 'warning', opener: okBtn,
                        text: 'The default gateway is not on the same network (subnet) as the IP address and subnet mask. Save these settings anyway?',
                        buttons: [{ label: 'Yes', action: 'yes', value: true }, { label: 'No', action: 'no', value: false }],
                    });
                    if (!yes) return;
                }
                ctx.setMachine(applyIpv4(ctx.machine(), s, ctx.world()));
                ctx.closeWindow(win);
                if (redraw) redraw();
            };
            body.append(form, okCancel(ok, () => ctx.closeWindow(win)));
        },
    });
}

// ---------- Notepad ----------

const FILES = [
    { key: 'notes', path: NOTES_PATH, name: 'network-notes.txt' },
    { key: 'hosts', path: HOSTS_PATH, name: 'hosts' },
];

function renderNotepad(ctx, body, win) {
    let file = FILES[0];
    const text = h('textarea', { class: 'os-textarea', 'aria-label': 'File contents', spellcheck: 'false', wrap: 'off' });
    const load = (f) => {
        file = f;
        text.value = (readFile(ctx.machine(), f.path) || '').replace(/\r\n/g, '\n');
        ctx.setTitle(win, `${f.name} - Notepad`);
    };
    const save = async (e) => {
        ctx.setMachine(writeFile(ctx.machine(), file.path, text.value));
        if (file.key === 'hosts') {
            await ctx.message({
                kind: 'info', title: 'Notepad', icon: 'info', opener: e.currentTarget,
                text: 'Saved. On a real PC, Windows only lets you save the hosts file if Notepad was started with "Run as administrator".',
            });
        }
    };
    const open = (e) => {
        ctx.openWindow({
            kind: 'open', title: 'Open', icon: 'notepad', modal: true, opener: e.currentTarget, width: 360,
            render(b, dlg) {
                b.append(h('p', { class: 'os-note', text: 'Choose a file to open:' }),
                    h('ul', { class: 'os-list os-sunken' }, FILES.map((f, i) => h('li', {},
                        h('button', { class: 'os-menu-item', type: 'button', 'data-file': f.key, autofocus: i === 0, onclick: () => { ctx.closeWindow(dlg); load(f); text.focus(); } }, f.path)))),
                    h('div', { class: 'os-row os-row-end' }, button('Cancel', 'cancel', { onclick: () => ctx.closeWindow(dlg) })));
            },
        });
    };
    body.append(h('div', { class: 'os-menubar' }, button('Open...', 'open', { onclick: open }), button('Save', 'save', { onclick: save })), text);
    load(FILES[0]);
}

// ---------- My Computer ----------

function renderComputer(ctx, body) {
    let selected = 'C';
    const draw = () => {
        const m = ctx.machine();
        const items = [{ letter: 'C', label: 'Local Disk (C:)', icon: 'drive' }];
        for (const [L, unc] of Object.entries(m.drives)) {
            const [, , server, share] = unc.split('\\');
            const ok = !!listShare(m, ctx.world(), unc);
            items.push({ letter: L, label: `${share} on '${server}' (${L}:)${ok ? '' : ' - Disconnected'}`, icon: 'netdrive' });
        }
        if (!items.some((i) => i.letter === selected)) selected = 'C';
        body.replaceChildren(
            h('ul', { class: 'os-list os-sunken', 'aria-label': 'Drives' }, items.map((it) => h('li', { class: it.letter === selected ? 'is-selected' : null },
                h('button', { class: 'os-menu-item', type: 'button', 'data-drive': it.letter, 'aria-pressed': String(it.letter === selected), icon: it.icon, onclick: () => { selected = it.letter; draw(); } }),
            ))),
            h('div', { class: 'os-row' },
                button('Open', 'open-drive', { onclick: (e) => openDrive(ctx, selected, e.currentTarget) }),
                button('Map Network Drive...', 'map', { onclick: (e) => openMap(ctx, e.currentTarget, draw) }),
                button('Disconnect', 'disconnect', { onclick: (e) => {
                    if (selected === 'C') {
                        ctx.message({ kind: 'info', title: 'My Computer', icon: 'info', text: 'Select a network drive to disconnect.', opener: e.currentTarget });
                        return;
                    }
                    ctx.setMachine(unmapDrive(ctx.machine(), selected).machine);
                    draw();
                } })),
        );
        body.querySelectorAll('[data-drive]').forEach((b, i) => b.append(items[i].label));
    };
    draw();
}

function openDrive(ctx, letter, opener) {
    const m = ctx.machine();
    let paragraphs;
    if (letter === 'C') paragraphs = ['C:\\Users\\you', 'Desktop', 'Documents'];
    else {
        const files = listShare(m, ctx.world(), m.drives[letter]);
        paragraphs = files ? [`${letter}:\\ (${m.drives[letter]})`, ...files] : [`${letter}:\\ is not accessible.`, 'The network path was not found.'];
    }
    ctx.message({ kind: 'drive', title: `${letter}:\\`, icon: letter === 'C' ? 'info' : 'info', paragraphs, opener });
}

function openMap(ctx, opener, redraw) {
    ctx.openWindow({
        kind: 'map', title: 'Map Network Drive', icon: 'netdrive', modal: true, opener, width: 360,
        render(body, win) {
            const used = new Set(['C', ...Object.keys(ctx.machine().drives)]);
            const letters = 'DEFGHIJKLMNOPQRSTUVWXYZ'.split('').filter((L) => !used.has(L));
            const sel = h('select', { class: 'os-select', name: 'letter' }, letters.map((L) => h('option', { value: L, selected: L === 'Z' }, `${L}:`)));
            const folder = h('input', { class: 'os-input', type: 'text', name: 'folder', autofocus: true, autocomplete: 'off', spellcheck: 'false' });
            const ok = async (e) => {
                const okBtn = e.currentTarget;
                const r = mapDrive(ctx.machine(), ctx.world(), sel.value, folder.value);
                if (r.error) {
                    const text = {
                        'bad-path': 'That folder doesn\'t look right. Network folders are written as \\\\server\\share.',
                        'not-found': 'The network name cannot be found.',
                        'in-use': 'The local device name is already in use.',
                    }[r.error];
                    await ctx.message({ kind: 'error', title: 'Map Network Drive', icon: 'error', text, opener: okBtn });
                    return;
                }
                ctx.setMachine(r.machine);
                ctx.closeWindow(win);
                if (redraw) redraw();
            };
            body.append(
                h('p', { class: 'os-note', text: 'Pick a drive letter and type the network folder to connect to.' }),
                h('label', { class: 'os-field' }, h('span', { text: 'Drive:' }), sel),
                h('label', { class: 'os-field' }, h('span', { text: 'Folder:' }), folder),
                h('p', { class: 'os-note', text: 'Example: \\\\server\\share' }),
                h('label', { class: 'os-radio' }, h('input', { type: 'checkbox', name: 'reconnect', checked: true }), 'Reconnect at sign-in'),
                okCancel(ok, () => ctx.closeWindow(win), 'Finish'),
            );
        },
    });
}

// ---------- Help ----------

function renderHelp(ctx, body) {
    const p = (t) => h('p', { class: 'os-note', text: t });
    body.append(
        p('Welcome to BitsOS 98. Retro look, modern Windows commands.'),
        p('1. Pick a ticket in Help Desk Tickets and read what the user says.'),
        p('2. Investigate with Command Prompt (type HELP), Network Connections, Notepad and My Computer. network-notes.txt on the desktop lists the servers and addresses.'),
        p('3. Fix the problem, then press Close ticket. If the user still has the problem, the ticket stays open.'),
        p('Stuck? Each ticket has three hints. Reset machine puts the PC back the way the ticket started.'),
        p('Everything here is simulated. Nothing touches your real computer or network.'),
    );
}

export const APPS = {
    cmd: { title: 'Command Prompt', icon: 'cmd', width: 560, height: 330, render: renderCmd },
    net: { title: 'Network Connections', icon: 'net', width: 340, render: renderNet },
    notepad: { title: 'network-notes.txt - Notepad', icon: 'notepad', width: 480, height: 330, render: renderNotepad },
    computer: { title: 'My Computer', icon: 'computer', width: 380, render: renderComputer },
    help: { title: 'Help', icon: 'help', width: 400, render: renderHelp },
};
