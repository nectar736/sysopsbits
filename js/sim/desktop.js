// Help desk simulator: the BitsOS 98 shell. Power and boot, window manager, taskbar, Start menu,
// the Help Desk Tickets panel, progress (localStorage) and analytics. Apps live in apps.js.
import { LABS, checkLab } from './labs.js';
import { createMachine } from './engine.js';
import { h, ICONS, APPS } from './apps.js';

const KEY = 'sob-sim-progress';
const FOCUSABLE = 'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])';
const DESKTOP_APPS = [
    ['computer', 'My Computer'], ['net', 'Network Connections'], ['cmd', 'Command Prompt'], ['notepad', 'Notepad'], ['tickets', 'Help Desk Tickets'],
];

const screen = document.querySelector('.sim-screen');
const power = document.getElementById('sim-power');
const fullBtn = document.getElementById('sim-fullscreen');

const S = {
    state: 'off', labId: null, machines: {}, hints: {}, progress: loadProgress(),
    windows: [], modals: [], z: 100, desktop: null, taskList: null, panel: null, startMenu: null, clockTimer: 0, shiftShown: false,
};

const reducedMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
const compact = () => matchMedia('(max-width: 700px)').matches;
const lab = () => LABS.find((l) => l.id === S.labId);

function loadProgress() {
    try {
        const v = JSON.parse(localStorage.getItem(KEY) || '{}');
        if (!v || typeof v !== 'object' || Array.isArray(v)) return {};
        const out = {};
        for (const l of LABS) if (v[l.id] && typeof v[l.id] === 'object') out[l.id] = v[l.id];
        return out;
    } catch (e) {
        return {};
    }
}
function saveProgress() {
    try { localStorage.setItem(KEY, JSON.stringify(S.progress)); } catch (e) { /* storage blocked: keep it in memory */ }
}

// ---------- the context apps use ----------

const ctx = {
    machine: () => S.machines[S.labId],
    setMachine: (m) => { S.machines[S.labId] = m; },
    world: () => lab().world,
    reducedMotion,
    openWindow,
    closeWindow,
    message,
    setTitle: (win, title) => {
        win.setAttribute('aria-label', title);
        win.querySelector('.os-title-text').textContent = title;
        const task = taskFor(win);
        if (task) task.textContent = title;
    },
};

// ---------- power ----------

function setState(s) {
    S.state = s;
    screen.dataset.state = s;
}

function stage(...kids) {
    let layer = screen.querySelector(':scope > .os-stage');
    if (!layer) {
        layer = h('div', { class: 'os-layer os-stage' });
        screen.append(layer);
    }
    layer.replaceChildren(...kids);
    return layer;
}

function renderOff() {
    clearInterval(S.clockTimer);
    S.windows = [];
    S.modals = [];
    setState('off');
    power.setAttribute('aria-pressed', 'false');
    stage(h('div', { class: 'os-layer os-off' }, h('button', { class: 'os-off-btn', type: 'button', onclick: powerOn }, 'Press power to start')));
}

function powerOn() {
    if (S.state !== 'off') return;
    power.setAttribute('aria-pressed', 'true');
    if (reducedMotion()) { renderDesktop(); return; }
    setState('boot');
    const pre = h('div', { class: 'os-layer os-boot', tabindex: '-1', 'aria-label': 'Starting BitsOS 98' });
    stage(pre);
    pre.focus({ preventScroll: true });
    const lines = ['BitsBIOS v4.10  (c) BitsOS', '', 'Memory test: 65536K OK', 'Detecting drives ... Local Disk (C:)', 'Network adapter ... BitsNet PCI Fast Ethernet', '', 'Starting BitsOS 98 ...'];
    let i = 0;
    let done = false;
    const finish = () => {
        if (done) return;
        done = true;
        document.removeEventListener('keydown', skip, true);
        screen.removeEventListener('pointerdown', skip);
        if (S.state === 'boot') renderDesktop();
    };
    const skip = (e) => {
        if (e.type === 'keydown') e.preventDefault();
        finish();
    };
    const tick = () => {
        if (done || S.state !== 'boot') return;
        if (i < lines.length) {
            pre.append(h('div', { class: i === 0 ? 'os-boot-logo' : null, text: lines[i++] || ' ' }));
            setTimeout(tick, 200);
        } else {
            setTimeout(finish, 300);
        }
    };
    setTimeout(() => {
        document.addEventListener('keydown', skip, true);
        screen.addEventListener('pointerdown', skip);
    }, 0);
    tick();
}

function powerOff() {
    for (const w of [...S.windows]) w.remove();
    renderOff();
}

// ---------- desktop ----------

function renderDesktop() {
    setState('desktop');
    const desk = h('div', { class: 'os-layer os-desktop' });
    S.desktop = desk;
    S.windows = [];
    S.modals = [];
    if (!S.labId) S.labId = (LABS.find((l) => !S.progress[l.id]) || LABS[0]).id;
    ensureMachine();

    const icons = h('ul', { class: 'os-icons', 'aria-label': 'Desktop' }, DESKTOP_APPS.map(([app, label]) => h('li', {},
        h('button', {
            class: 'os-icon', type: 'button', 'data-app': app,
            onclick: (e) => { if (e.detail === 0 || e.pointerType === 'touch' || S.lastPointer === 'touch') launch(app); },
            ondblclick: () => launch(app),
            onpointerdown: (e) => { S.lastPointer = e.pointerType; },
        }, h('span', { icon: app }), h('span', { class: 'os-icon-label', text: label })))));

    S.panel = renderPanel();
    S.startMenu = renderStartMenu();
    S.taskList = h('div', { class: 'os-tasks' },
        h('button', { class: 'os-btn os-task', type: 'button', 'data-app': 'tickets', 'aria-pressed': 'false', onclick: toggleDrawer }, 'Tickets'));
    const clock = h('div', { class: 'os-clock os-sunken' });
    const tickClock = () => { clock.textContent = new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }); };
    tickClock();
    clearInterval(S.clockTimer);
    S.clockTimer = setInterval(tickClock, 20000);
    const start = h('button', { class: 'os-btn os-start', type: 'button', 'aria-expanded': 'false', 'aria-controls': 'os-startmenu', onclick: toggleStart }, h('span', { icon: 'logo' }), 'Start');
    const taskbar = h('div', { class: 'os-taskbar' }, start, S.taskList, clock);

    desk.append(icons, S.panel, S.startMenu, taskbar);
    desk.addEventListener('pointerdown', (e) => {
        if (!S.startMenu.hidden && !e.target.closest('.os-startmenu, .os-start')) closeStart();
    });
    stage(desk);
    const current = S.panel.querySelector('.os-ticket[aria-current="true"]');
    if (current && !compact()) current.focus({ preventScroll: true });
}

function launch(app) {
    closeStart();
    if (app === 'tickets') {
        if (compact()) toggleDrawer(true);
        const t = S.panel.querySelector('.os-ticket[aria-current="true"]');
        if (t) t.focus();
        return;
    }
    const def = APPS[app];
    openWindow({ app, title: def.title, icon: def.icon, width: def.width, height: def.height, render: (body, win) => def.render(ctx, body, win) });
}

function toggleDrawer(force) {
    const open = typeof force === 'boolean' ? force : !S.panel.classList.contains('is-open');
    S.panel.classList.toggle('is-open', open);
    const btn = S.taskList.querySelector('.os-task[data-app="tickets"]');
    btn.setAttribute('aria-pressed', String(open));
}

// ---------- Start menu ----------

function renderStartMenu() {
    const item = (iconName, label, act) => h('li', {}, h('button', { class: 'os-menu-item', type: 'button', onclick: act }, h('span', { icon: iconName }), label));
    return h('div', { class: 'os-startmenu', id: 'os-startmenu', hidden: true },
        h('div', { class: 'os-startband', 'aria-hidden': 'true', text: 'BitsOS 98' }),
        h('ul', { class: 'os-menu', 'aria-label': 'Start menu' },
            ...DESKTOP_APPS.map(([app, label]) => item(app, label, () => launch(app))),
            h('li', { class: 'os-menu-sep', role: 'separator' }),
            item('help', 'Help', () => launch('help')),
            item('power', 'Shut Down...', () => { closeStart(); powerOff(); })));
}
function toggleStart() {
    if (S.startMenu.hidden) {
        S.startMenu.hidden = false;
        S.desktop.querySelector('.os-start').setAttribute('aria-expanded', 'true');
        S.startMenu.querySelector('.os-menu-item').focus();
    } else closeStart();
}
function closeStart() {
    if (!S.startMenu || S.startMenu.hidden) return;
    S.startMenu.hidden = true;
    S.desktop.querySelector('.os-start').setAttribute('aria-expanded', 'false');
}

// ---------- tickets panel ----------

function ensureMachine() {
    if (!S.machines[S.labId]) S.machines[S.labId] = createMachine(lab().machine);
}
const closedCount = () => LABS.filter((l) => S.progress[l.id]).length;

function renderPanel() {
    const panel = h('section', { class: 'os-panel', 'aria-label': 'Help Desk Tickets' },
        h('div', { class: 'os-titlebar' }, h('span', { icon: 'tickets' }), h('span', { class: 'os-title-text', text: 'Help Desk Tickets' })),
        h('ul', { class: 'os-tickets os-sunken', 'aria-label': 'Tickets' }),
        h('div', { class: 'os-ticket-detail' }),
        h('div', { class: 'os-panel-actions' },
            h('button', { class: 'os-btn', type: 'button', 'data-action': 'hint', onclick: showHint }, 'Hint'),
            h('button', { class: 'os-btn', type: 'button', 'data-action': 'reset', onclick: resetMachine }, 'Reset machine'),
            h('button', { class: 'os-btn', type: 'button', 'data-action': 'close-ticket', onclick: closeTicket }, 'Close ticket')),
        h('div', { class: 'os-progress os-sunken', 'aria-live': 'polite' }));
    fillPanel(panel);
    return panel;
}

function fillPanel(panel = S.panel) {
    panel.querySelector('.os-tickets').replaceChildren(...LABS.map((l) => h('li', {},
        h('button', { class: 'os-ticket', type: 'button', 'data-lab': l.id, 'aria-current': l.id === S.labId ? 'true' : null, onclick: () => selectLab(l.id) },
            h('span', { class: 'os-ticket-num', text: `#${l.id}` }), h('span', { text: l.title }),
            h('span', { class: 'os-ticket-state', text: S.progress[l.id] ? 'Closed' : 'Open' })))));
    const l = lab();
    const used = S.hints[l.id] || 0;
    panel.querySelector('.os-ticket-detail').replaceChildren(...[
        h('h3', { text: `#${l.id} ${l.ticket.subject}` }),
        h('p', { class: 'os-ticket-meta', text: `From: ${l.ticket.from} | ${l.difficulty} | PC: ${l.machine.hostname}` }),
        h('p', { class: 'os-ticket-msg os-sunken', text: l.ticket.body }),
        h('p', {}, h('strong', { text: 'Done looks like:' })),
        h('ul', {}, l.done.map((d) => h('li', { text: d }))),
        used ? h('p', {}, h('strong', { text: 'Hints:' })) : null,
        used ? h('ol', { class: 'os-hints' }, l.hints.slice(0, used).map((t) => h('li', { text: t }))) : null,
    ].filter(Boolean));
    const hint = panel.querySelector('[data-action="hint"]');
    hint.textContent = `Hint (${used}/3)`;
    hint.disabled = used >= 3;
    panel.querySelector('.os-progress').textContent = `${closedCount()} of ${LABS.length} closed`;
}

function closeAllWindows() {
    for (const w of [...S.windows].reverse()) closeWindow(w, { silent: true });
}

function selectLab(id) {
    if (id === S.labId) {
        if (compact()) toggleDrawer(false);
        return;
    }
    closeAllWindows();
    S.labId = id;
    ensureMachine();
    fillPanel();
    S.panel.querySelector(`.os-ticket[data-lab="${id}"]`).focus();
}

function showHint() {
    const l = lab();
    S.hints[l.id] = Math.min(3, (S.hints[l.id] || 0) + 1);
    fillPanel();
    const hint = S.panel.querySelector('[data-action="hint"]');
    (hint.disabled ? S.panel.querySelector('.os-hints li:last-child') || hint : hint).focus?.();
}

function resetMachine() {
    closeAllWindows();
    S.machines[S.labId] = createMachine(lab().machine);
    fillPanel();
    S.panel.querySelector('[data-action="reset"]').focus();
}

async function closeTicket(e) {
    const opener = e.currentTarget;
    const l = lab();
    const result = checkLab(l, ctx.machine());
    if (!result.passed) {
        await message({ kind: 'still-broken', title: `Ticket #${l.id}`, icon: 'warning', text: l.failReply, opener });
        return;
    }
    const hints = S.hints[l.id] || 0;
    if (!S.progress[l.id]) {
        S.progress[l.id] = { closed: new Date().toISOString(), hints };
        saveProgress();
        if (typeof window.gtag === 'function') window.gtag('event', 'sim_ticket_closed', { lab_id: l.id, hints });
    }
    fillPanel();
    const d = l.debrief;
    const content = h('div', {},
        h('p', { text: 'The user confirms it works. Ticket closed.' }),
        h('dl', { class: 'os-debrief' },
            h('dt', { text: 'What was wrong' }), h('dd', { text: d.cause }),
            h('dt', { text: 'Remember' }), h('dd', { text: d.remember }),
            h('dt', { text: 'On a real PC' }), h('dd', {}, h('code', { text: d.command })),
            h('dt', { text: 'Hints used' }), h('dd', { text: `${hints} of 3` })),
        h('p', {}, 'Read next: ', h('a', { class: 'os-link', href: d.link.href, text: d.link.text })));
    await message({ kind: 'debrief', title: `Ticket #${l.id} closed`, icon: 'info', content, opener, width: 420 });
    if (closedCount() === LABS.length && !S.shiftShown) {
        S.shiftShown = true;
        await message({
            kind: 'shift', title: 'Shift complete', icon: 'info', opener,
            content: h('div', {},
                h('p', { text: 'All six tickets closed. That covers the networking basics every help desk uses daily: IP settings, drive mapping, DHCP, DNS, gateways and the hosts file.' }),
                h('p', {}, 'Keep going with the ', h('a', { class: 'os-link', href: 'index.html#practice-tests', text: 'free practice tests' }), ' or the ', h('a', { class: 'os-link', href: 'store.html', text: 'exam study guides' }), '.')),
        });
    }
}

// ---------- windows ----------

function taskFor(win) {
    return S.taskList && win.dataset.app ? S.taskList.querySelector(`.os-task[data-app="${win.dataset.app}"]`) : null;
}

function openWindow({ app, kind, title, icon, modal = false, opener, width, height, escClose = false, render, onClose }) {
    if (app) {
        const existing = S.windows.find((w) => w.dataset.app === app);
        if (existing) { restore(existing); return existing; }
    }
    const win = h('section', { class: 'os-window', role: 'dialog', 'aria-label': title, 'data-app': app, 'data-kind': kind, 'aria-modal': modal ? 'true' : null, tabindex: '-1' });
    const close = h('button', { class: 'os-btn os-tb-btn', type: 'button', 'aria-label': 'Close', onclick: () => closeWindow(win) }, 'x');
    const bar = h('div', { class: 'os-titlebar' }, h('span', { icon }), h('span', { class: 'os-title-text', text: title }),
        modal || kind ? null : h('button', { class: 'os-btn os-tb-btn', type: 'button', 'aria-label': 'Minimize', onclick: () => minimize(win) }, '_'),
        modal || kind ? null : h('button', { class: 'os-btn os-tb-btn', type: 'button', 'aria-label': 'Maximize', onclick: () => win.classList.toggle('is-maximized') }, '[]'),
        close);
    const body = h('div', { class: 'os-body' });
    win.append(bar, body);
    win._meta = { opener, modal, escClose: escClose || modal, onClose };
    if (modal) {
        win._backdrop = h('div', { class: 'os-modal-backdrop' });
        S.desktop.append(win._backdrop);
        S.modals.push(win);
    }
    if (width) win.style.width = `${width}px`;
    if (height) win.style.height = `${height}px`;
    S.desktop.append(win);
    S.windows.push(win);
    render(body, win);
    place(win, modal || !!kind);
    if (app) {
        S.taskList.append(h('button', { class: 'os-btn os-task', type: 'button', 'data-app': app, 'aria-pressed': 'true', onclick: () => taskClick(win) }, title));
    }
    makeDraggable(win, bar);
    win.addEventListener('pointerdown', () => focusWindow(win));
    focusWindow(win);
    const first = body.querySelector('[autofocus]') || body.querySelector(FOCUSABLE) || win;
    first.focus({ preventScroll: true });
    return win;
}

function place(win, centered) {
    const dw = S.desktop.clientWidth;
    const dh = S.desktop.clientHeight - 30;
    const ww = Math.min(win.offsetWidth, dw - 8);
    const wh = Math.min(win.offsetHeight, dh - 4);
    let left;
    let top;
    if (centered) {
        left = (dw - ww) / 2;
        top = (dh - wh) / 2;
    } else {
        const n = S.windows.filter((w) => w.dataset.app).length - 1;
        left = 356 + n * 26; // right of the ticket panel and the icon column
        top = 14 + n * 26;
    }
    win.style.left = `${Math.max(0, Math.min(left, dw - ww))}px`;
    win.style.top = `${Math.max(0, Math.min(top, dh - wh))}px`;
}

// Pull every window back inside the desktop after the screen changes size (resize, full screen).
function clampAll() {
    if (!S.desktop || !S.desktop.isConnected) return;
    const dw = S.desktop.clientWidth;
    const dh = S.desktop.clientHeight - 30;
    for (const w of S.windows) {
        if (w.hidden) continue;
        const left = Math.max(0, Math.min(w.offsetLeft, dw - w.offsetWidth));
        const top = Math.max(0, Math.min(w.offsetTop, dh - w.offsetHeight));
        w.style.left = `${left}px`;
        w.style.top = `${top}px`;
    }
}

function focusWindow(win) {
    if (S.modals.length && !S.modals.includes(win) && win !== S.modals[S.modals.length - 1]) return;
    win.style.zIndex = String(++S.z + (win._meta.modal ? 1000 : 0));
    if (win._backdrop) win._backdrop.style.zIndex = String(S.z + 999);
    for (const w of S.windows) w.classList.toggle('is-active', w === win);
    for (const w of S.windows) {
        const t = taskFor(w);
        if (t) t.setAttribute('aria-pressed', String(w === win && !w.hidden));
    }
}

function restore(win) {
    win.hidden = false;
    focusWindow(win);
    const target = win.querySelector('[autofocus]') || win.querySelector(FOCUSABLE) || win;
    target.focus({ preventScroll: true });
}

function minimize(win) {
    win.hidden = true;
    const t = taskFor(win);
    if (t) t.setAttribute('aria-pressed', 'false');
    const top = topWindow();
    if (top) focusWindow(top);
}

function taskClick(win) {
    if (!win.hidden && win.classList.contains('is-active')) minimize(win);
    else restore(win);
}

function topWindow() {
    return S.windows.filter((w) => !w.hidden).sort((a, b) => Number(b.style.zIndex) - Number(a.style.zIndex))[0] || null;
}

function closeWindow(win, { silent = false } = {}) {
    if (!win.isConnected && !S.windows.includes(win)) return;
    win.remove();
    if (win._backdrop) win._backdrop.remove();
    S.windows = S.windows.filter((w) => w !== win);
    S.modals = S.modals.filter((w) => w !== win);
    const t = taskFor(win);
    if (t) t.remove();
    const { opener, onClose } = win._meta;
    if (onClose) onClose();
    if (silent) return;
    const top = topWindow();
    if (top) focusWindow(top);
    if (opener && opener.isConnected) opener.focus({ preventScroll: true });
    else if (top) (top.querySelector(FOCUSABLE) || top).focus({ preventScroll: true });
}

function message({ kind, title, icon = 'info', text, paragraphs, content, buttons, opener, width }) {
    const list = buttons || [{ label: 'OK', action: 'ok', value: true }];
    return new Promise((resolve) => {
        let result = false;
        openWindow({
            kind, title, icon, modal: true, opener, width,
            onClose: () => resolve(result),
            render(body, win) {
                const words = content || h('div', {}, (paragraphs || [text]).map((t) => h('p', { text: t })));
                body.append(h('div', { class: 'os-msg' }, h('span', { icon }), words),
                    h('div', { class: 'os-row os-row-end' }, list.map((b, i) => h('button', {
                        class: 'os-btn', type: 'button', 'data-action': b.action, autofocus: i === 0,
                        onclick: () => { result = b.value; closeWindow(win); },
                    }, b.label))));
            },
        });
    });
}

function makeDraggable(win, bar) {
    bar.addEventListener('pointerdown', (e) => {
        if (e.button !== 0 || e.target.closest('.os-tb-btn') || compact() || win.classList.contains('is-maximized')) return;
        e.preventDefault();
        const dw = S.desktop.clientWidth;
        const dh = S.desktop.clientHeight - 30;
        const sx = e.clientX - win.offsetLeft;
        const sy = e.clientY - win.offsetTop;
        bar.setPointerCapture(e.pointerId);
        const move = (ev) => {
            win.style.left = `${Math.max(0, Math.min(ev.clientX - sx, dw - win.offsetWidth))}px`;
            win.style.top = `${Math.max(0, Math.min(ev.clientY - sy, dh - 20))}px`;
        };
        const up = () => {
            bar.removeEventListener('pointermove', move);
            bar.removeEventListener('pointerup', up);
            bar.removeEventListener('lostpointercapture', up);
        };
        bar.addEventListener('pointermove', move);
        bar.addEventListener('pointerup', up);
        bar.addEventListener('lostpointercapture', up);
    });
}

// ---------- keyboard and full screen ----------

function setFullscreen(on) {
    document.documentElement.classList.toggle('sim-fullscreen', on);
    fullBtn.setAttribute('aria-pressed', String(on));
    fullBtn.textContent = on ? 'Exit full screen' : 'Full screen';
    requestAnimationFrame(clampAll);
}

document.addEventListener('keydown', (e) => {
    if (S.state !== 'desktop' && e.key === 'Escape' && document.documentElement.classList.contains('sim-fullscreen')) {
        setFullscreen(false);
        return;
    }
    if (S.state !== 'desktop') return;
    const modal = S.modals[S.modals.length - 1];
    if (e.key === 'Tab' && modal) {
        const items = [...modal.querySelectorAll(FOCUSABLE)].filter((el) => el.offsetParent !== null);
        if (!items.length) return;
        const first = items[0];
        const last = items[items.length - 1];
        if (!modal.contains(document.activeElement)) { e.preventDefault(); first.focus(); } else if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); } else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
        return;
    }
    if (e.key !== 'Escape') return;
    if (modal) { e.preventDefault(); closeWindow(modal); return; }
    if (S.startMenu && !S.startMenu.hidden) { closeStart(); S.desktop.querySelector('.os-start').focus(); return; }
    const active = S.windows.find((w) => w.classList.contains('is-active') && !w.hidden);
    if (active && active._meta.escClose && active.contains(document.activeElement)) { e.preventDefault(); closeWindow(active); return; }
    if (S.panel && S.panel.classList.contains('is-open') && compact()) { toggleDrawer(false); return; }
    if (document.documentElement.classList.contains('sim-fullscreen')) setFullscreen(false);
});

// ---------- start ----------

if (screen && power) {
    screen.classList.add('is-live');
    fullBtn.hidden = false;
    fullBtn.addEventListener('click', () => setFullscreen(!document.documentElement.classList.contains('sim-fullscreen')));
    power.addEventListener('click', () => (S.state === 'off' ? powerOn() : powerOff()));
    if ('ResizeObserver' in window) new ResizeObserver(() => clampAll()).observe(screen);
    else window.addEventListener('resize', clampAll);
    renderOff();
}

export { ICONS };
