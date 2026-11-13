# Help Desk Simulator Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add `/simulation.html`: a retro CRT monitor running "BitsOS 98", with six broken-machine help-desk
tickets that new technologists fix using simulated Windows networking tools.

**Architecture:** A pure engine (`js/sim/engine.js`) models one PC and a lab-defined network. A pure command
layer (`js/sim/commands.js`) turns typed commands into Windows-format output. Labs are data (`js/sim/labs.js`).
A DOM layer (`js/sim/desktop.js` + `js/sim/apps.js`) draws the shell and calls only engine/command functions,
so every behaviour the UI shows is unit-tested in Node.

**Tech Stack:** Vanilla ES modules, CSS custom properties, `node --test`, Playwright, Python unittest. No new
dependencies.

**Spec:** `docs/superpowers/specs/2026-11-12-simulation-lab-design.md`

## Global Constraints

- Static HTML; no build step for site code; push to `main`.
- Page head as every page: title, meta description, canonical, og/twitter + og:image, favicons, the one Google
  Fonts link, inline theme script, one JSON-LD `@graph` (LearningResource + BreadcrumbList), gtag, **exactly one**
  AdSense script. Author "Matthew Hippensteel".
- Title: "Free IT Help Desk Simulator: Fix DNS, IP and Network Problems | SysOpsBits". H1: "Help Desk Simulator".
- Nav: `<li><a href="simulation.html" data-page="simulation">Simulation</a></li>` after Project Management; "Help
  Desk Simulator" in the Categories dropdown after "Free Practice Tests". Edit `partials/header.html`, then run
  `python scripts/sync_partials.py`.
- No Microsoft names, logos, icons or sounds. The OS is "BitsOS 98"; the Start button shows the SysOpsBits mark.
- Every class is prefixed `sim-` (page/monitor) or `os-` (inside the screen). No `.progress-bar` or `.progress-fill`.
- Motion only under `html.motion-ok`; under reduced motion: no boot animation, and ping/tracert lines print instantly.
- Budget: `css/sim.css` + `js/sim/*.js` gzipped ≤ 60 KB (target 45 KB). No third-party code.
- `localStorage` key `sob-sim-progress`, shape `{ "<labId>": { "closed": "<ISO date>", "hints": n } }`, every access in try/catch.
- Analytics: `gtag('event', 'sim_ticket_closed', { lab_id, hints })` only when `window.gtag` exists.
- APIPA addresses only from 169.254.1.0 to 169.254.254.255, with no default gateway.
- No lab may depend on negative DNS caching, on whether a hosts edit needs a flush, or on the exact gateway-warning text.
- Debrief links must point to indexed (no `noindex`) existing posts.

## Review Focus

1. **Sloppy command input:** extra spaces, any case, `-all` for `/all`, `ping` with no target, `nslookup` with no
   argument (interactive mode). The expected behaviour is real Windows output or a one-line "not supported in
   the simulator" note, never a crash or a blank line. *Tests: Task 3.*
2. **Bad TCP/IPv4 dialog input:** blank fields with static selected, `192.168.1.256`, `01.2.3.4`, non-contiguous
   mask `255.0.255.0`, an IP that is the subnet's network or broadcast address. Each gets an error, the dialog
   stays open, and the state is unchanged. *Tests: Task 2 (`validateIpv4`).*
3. **Switching tickets mid-lab and coming back:** in-progress state is kept per lab for the session. Only "Reset
   machine" resets a lab. After a reload, closed status persists and machines start fresh. *Tests: Task 6 e2e.*
4. **Storage blocked or corrupt** (`localStorage` throws, or the value is invalid JSON): the page loads, shows
   "0 of 6 closed", and closing still works in memory. *Tests: Task 6 e2e.*
5. **Keyboard-only use:** the power button, opening apps with Enter on desktop icons, focus moving into a new
   window's first field, Escape closing a modal and returning focus to its opener, and Escape leaving full
   screen. *Tests: Task 6 e2e.*

---

### Task 1: Capture real Windows output as fixtures

**Files:**
- Create: `scripts/vendor/tests/unit/fixtures/win-output.md`

These are read-only commands on the dev PC (Windows 11). Change nothing:
- `ipconfig`
- `ipconfig /all`
- `ping -n 2 nosuchhost.invalid`
- `ping -n 2` to an unused IP on the PC's own subnet
- `ping -n 2 127.0.0.1`
- `nslookup nosuchhost.invalid`
- `nslookup example.com`
- `net use`
- `tracert -h 2 -d example.com`
- `foo`
- `net use Q: \\nosuchserver\x`

- [ ] **Step 1:** Run each command, then paste the output into the fixture under a `## <command>` heading inside
  fenced blocks. Before saving, replace the real IPs, MAC address, hostname, DNS suffix and adapter names with
  the placeholders `<IP>`, `<MAC>`, `<HOST>` and so on.
- [ ] **Step 2:** Check that no real address or name is left:
  `grep -nE "([0-9]{1,3}\.){3}[0-9]{1,3}" scripts/vendor/tests/unit/fixtures/win-output.md`.
  Expected: only 127.0.0.1, placeholders, or documentation addresses.
- [ ] **Step 3: Commit** `test: add anonymised Windows command output samples for the simulator`

Task 3 uses these for exact headings, label padding (`. . . :` alignment), blank-line placement and error
strings.

### Task 2: Engine

**Files:**
- Create: `js/sim/engine.js`
- Test: `scripts/vendor/tests/unit/sim-engine.test.mjs`

**Interfaces (Produces).** All functions are pure. Machines are plain objects, and every "change" returns a
new machine.

```js
// World (lab data):
// { domain: 'corp.local',
//   hosts: [{ ip, name /* short, uppercase e.g. 'FS01' */, ping: bool, shares?: { [share]: string[] /* file names */ } }],
//   router: { ip, internet: bool } | null,
//   dns: { [serverIp]: { name /* fqdn */, records: { [fqdnLower]: ip } } },
//   dhcp: { available: bool, lease: { ip, mask, gateway, dns: string[] } } | null,
//   internet: { [fqdnLower]: ip } }
// Machine:
// { hostname, adapter: { name: 'Ethernet', enabled, cable, dhcp: bool, ip, mask, gateway, dnsAuto: bool, dns: string[] },
//   lease: { ip, mask, gateway, dns, apipa: bool } | null, cache: { [fqdnLower]: ip },
//   files: { [winPathLower]: string }, drives: { [letterUpper]: unc } }
export function parseIpv4(s)               // -> int (uint32) | null; rejects leading zeros, >255, wrong part count
export function formatIpv4(n)              // -> 'a.b.c.d'
export function maskBits(mask)             // -> 0..32 | null (null when not contiguous)
export function createMachine(spec)        // spec = lab.machine; fills defaults; files gets the hosts default when missing
export function effectiveConfig(m, w)      // -> { source: 'static'|'dhcp'|'apipa'|'none', ip, mask, gateway, dns: [] }
export function route(m, w, ip)            // -> { ok, via: 'loopback'|'local'|'gateway'|null, hops: [ip], fail: null|'no-interface'|'no-route'|'no-arp'|'no-reply'|'gateway-dead' }
export function resolve(m, w, name)        // -> { ok, ip, fqdn, source: 'hosts'|'cache'|'dns'|null, fail: null|'nxdomain'|'timeout' }
export function nslookupQuery(m, w, name, serverIp?) // -> { server: { ip, name|null }, ok, ip, fqdn, fail: null|'nxdomain'|'timeout'|'no-server' }
export function dhcpRenew(m, w)            // -> { machine, ok, fail: null|'static'|'no-interface'|'no-dhcp' }
export function dhcpRelease(m)             // -> machine
export function flushDns(m)                // -> machine (cache emptied; hosts stay preloaded)
export function validateIpv4(settings)     // settings = { ipAuto, ip, mask, gateway, dnsAuto, dns1, dns2 } -> { errors: string[], warnings: ['gateway-off-subnet']? }
export function applyIpv4(m, settings)     // -> machine (static: lease null; auto: keeps lease until renew, see below)
export function setAdapterEnabled(m, on)   // -> machine
export function mapDrive(m, w, letter, unc)// -> { machine, error: null|'in-use'|'bad-path'|'not-found' }
export function unmapDrive(m, letter)      // -> { machine, error: null|'not-found' }
export function listShare(m, w, unc)       // -> string[] | null (null when unreachable)
export function readFile(m, path) / writeFile(m, path, text) // case-insensitive Windows paths
export function parseHosts(text)           // -> { [nameLower]: ip }; ignores comments and blank lines
```

Rules the tests pin:

- **`effectiveConfig`:** disabled or unplugged gives `none`. Static gives the adapter values. DHCP with a lease
  gives the lease (`apipa` when `lease.apipa`). DHCP with no lease gives `none`, until renew.
  `dnsAuto && !dhcp` is impossible: `applyIpv4` forces `dnsAuto=false` when the IP is static.
- **`route`:**
  - 127.x is loopback.
  - `none` fails `no-interface`.
  - On the same subnet: the host is in `w.hosts` (or is the router), `ping:true` gives `local`, a host
    that doesn't answer gives `no-reply`, and an unknown address gives `no-arp`.
  - Off subnet with no gateway gives `no-route`. A gateway that isn't `w.router.ip`, or isn't on-link, gives
    `gateway-dead`. Otherwise it routes via the gateway: a target in `w.hosts` or the internet values (only
    when `router.internet`) gives `ok` with `hops: [gateway, target]`.
- **`resolve`:**
  - A name with no dot gets `.${w.domain}` appended.
  - Order: hosts file, then cache, then DNS servers in order.
  - A server counts only if `route(...).ok` reaches it and it is a key of `w.dns`. Its records are checked
    first, then `w.internet` (it forwards).
  - Some server reached but no record gives `nxdomain`. No server reached gives `timeout`.
  - A success through DNS is added to the cache.
- **`nslookupQuery`:** uses only the first DNS server (or `serverIp`) and never the hosts file or cache.
- **`dhcpRenew` with `w.dhcp.available`** sets `lease = { ...w.dhcp.lease, apipa:false }`. When unavailable, the
  lease becomes APIPA `169.254.X.Y/255.255.0.0`, with X and Y derived deterministically from the hostname
  (X in 1..254), no gateway and no DNS, and `ok:false, fail:'no-dhcp'`.
- **`validateIpv4` errors** (exact strings, shown in the error box):
  - `'Enter a valid IP address.'`
  - `'Enter a valid subnet mask.'`
  - `'The subnet mask must be contiguous.'`
  - `'The IP address can't be the network or broadcast address of its subnet.'`
  - `'Enter a valid default gateway, or leave it blank.'`
  - `'Enter a valid preferred DNS server.'`
  - `'Enter a valid alternate DNS server, or leave it blank.'`

  A blank gateway or blank alternate DNS is allowed. Static IP with a blank preferred DNS is allowed (real
  Windows allows it).
- **`mapDrive`:** `in-use` when the letter is taken. `bad-path` when the UNC doesn't match
  `^\\\\[^\\]+\\[^\\]+$`. `not-found` when the server name doesn't resolve or route, or the share isn't on it.

- [ ] **Step 1: Write the failing tests**, one `test()` per rule above. They use a small inline world (domain
  `corp.local`; `10.0.0.0/24`; DC01 at 10.0.0.10 serving DNS with `intranet.corp.local → 10.0.0.20`; INTRANET at
  10.0.0.20 `ping:true`; PRN at 10.0.0.30 `ping:false`; router 10.0.0.1 `internet:true`;
  `internet: { 'www.example.com': '93.184.215.14' }`). Required cases:
  - every `validateIpv4` error string, including Review Focus 2's inputs, plus the gateway-off-subnet warning;
  - APIPA: in range, deterministic, no gateway;
  - `resolve` prefers the hosts file over DNS, while `nslookupQuery` ignores the hosts file for the same name;
  - a dead gateway still reaches local hosts;
  - an unreachable DNS server: `ping` by IP routes ok, `resolve` fails `timeout`;
  - `mapDrive` gives `in-use` and `not-found`.
- [ ] **Step 2:** Run `node --test "scripts/vendor/tests/unit/sim-engine.test.mjs"`. Expected: FAIL (module missing).
- [ ] **Step 3:** Implement `js/sim/engine.js` to the interface. IPs are compared as uint32 (`>>> 0`).
- [ ] **Step 4:** Run the same command. Expected: all pass.
- [ ] **Step 5: Commit** `feat(sim): network engine for the help desk simulator`

### Task 3: Command Prompt commands

**Files:**
- Create: `js/sim/commands.js`
- Test: `scripts/vendor/tests/unit/sim-commands.test.mjs`

**Interfaces:**
- Consumes: everything in Task 2.
- Produces: `PROMPT = 'C:\\Users\\you>'`, `COMMANDS` (the names listed by `help`), and
  `runCommand(input, { machine, world }) -> { machine, lines: string[], clear?: true, exit?: true, stream?: true }`.
  `stream` means the UI prints the lines one at a time.

Supported: `help`, `cls`, `exit`, `hostname`, `ipconfig [/all|/release|/renew|/flushdns|/displaydns]`, `ping <t>`
(4 echoes), `tracert <t>` (max 30 hops, but stop after the last real hop plus 3 timeout lines when unreachable,
then `Trace complete.`), `nslookup <name> [server]`, `net use`, `net use X: \\s\sh`, `net use X: /delete`, `dir [X:]`,
`type <path>`, `arp -a`. Switches accept `/` or `-` in any case. Whitespace is collapsed.

Output rules (exact layout copied from Task 1's fixture):
- `ping` success: `Reply from <ip>: bytes=32 time=<1..9>ms TTL=128` for local targets and `TTL=55` for internet
  targets. The time is deterministic from the target IP.
- `ping` / `route` failures:
  - `no-interface` and `no-route` print `PING: transmit failed. General failure.`
  - `no-arp` prints `Reply from <own ip>: Destination host unreachable.`
  - `no-reply` and `gateway-dead` print `Request timed out.`
- A name that doesn't resolve prints `Ping request could not find host <name>. Please check the name and try again.`
  (no statistics).
- `nslookup` with no argument: `The simulator doesn't support interactive nslookup. Try: nslookup <name>`.
- `ping` with no target prints the real usage line's first line from the fixture, followed by `Try: ping <name or IP address>`.
- An unknown command prints the exact two-line "is not recognized" message from the fixture.
- `net use` errors use the fixture's "System error N has occurred." format: 85 for `in-use`, 53 for
  `not-found` / `bad-path`.
- `ipconfig /all` on APIPA shows `Autoconfiguration IPv4 Address. . : 169.254.x.y(Preferred)` and a blank Default
  Gateway. Static shows `DHCP Enabled. . . : No`.
- `ipconfig /release` and `/renew` on a static adapter print the real "The operation failed as no adapter is in
  the state permissible for this operation." line (confirm it in Task 1 if possible; otherwise use that text).

- [ ] **Step 1: Write the failing tests.** They cover:
  - `ipconfig` and `ipconfig /all` for static, DHCP, APIPA and disabled machines, checked against the fixture
    layout (label padding, blank lines);
  - each ping outcome in the rules above;
  - `nslookup` timeout and nxdomain text, and that `nslookup` on a hosts-overridden name shows the DNS answer;
  - `net use` map, list, delete and both errors;
  - `tracert` with a dead gateway;
  - `cls` sets `clear` and `exit` sets `exit`;
  - Review Focus 1: `'  IPCONFIG   -ALL '` equals `'ipconfig /all'`, bare `ping`, bare `nslookup`, `foo bar`.
- [ ] **Step 2:** Run `node --test "scripts/vendor/tests/unit/sim-commands.test.mjs"`. Expected: FAIL.
- [ ] **Step 3:** Implement `js/sim/commands.js`.
- [ ] **Step 4:** Run the command again. Expected: pass.
- [ ] **Step 5: Commit** `feat(sim): command prompt commands with Windows-format output`

### Task 4: Labs

**Files:**
- Create: `js/sim/labs.js`
- Test: `scripts/vendor/tests/unit/sim-labs.test.mjs`

**Interfaces:**
- Consumes: Task 2 and `runCommand` from Task 3.
- Produces: `LABS` (an array ordered 101 to 106) and `checkLab(lab, machine) -> { passed: bool, failed: string[] }`.

  Each lab:
  `{ id: '101', title, difficulty: 'Easy'|'Medium', ticket: { from, subject, body }, done: string[], world, machine /* createMachine spec */, notes /* network-notes.txt text */, checks: [{ label, test: (m, w) => bool }], failReply, hints: [h1, h2, h3], debrief: { cause, remember, command, link: { href, text } }, fix: (m, w) => m }`.
  `fix` is used by the tests only: it applies the intended fix through engine/commands functions.

The labs (titles are exact; the HTML h3s must match):

| id | title | difficulty | world/machine | checks (user outcomes) | link |
|---|---|---|---|---|---|
| 101 | Set up the new print server | Easy | PRN01 on DHCP, lease 192.168.1.77. The notes give 192.168.1.50 / 255.255.255.0 / gw 192.168.1.1 / DNS 192.168.1.10 | static config equals the plan; the gateway and DNS answer through `route` | az-900 networking |
| 102 | My S: drive disappeared | Easy | No drives. FS01 at 10.0.0.15 has a Shared share | `S:` maps to `\\FS01\Shared` (case-insensitive); `listShare` works | cmd-vs-powershell |
| 103 | The network says 169.254 | Easy | DHCP adapter with an APIPA lease. `w.dhcp.available` is true (the jack was fixed) | the address isn't APIPA; `www.example.com` routes | az-900 networking |
| 104 | Can't open the intranet | Medium | Static, DNS 10.0.0.53 (not in `w.hosts`). DC01 10.0.0.10 is DNS. INTRANET 10.0.0.20 | `resolve('intranet')` gives 10.0.0.20 and `route` is ok | az-900 networking |
| 105 | Internet's down, but the file server works | Medium | Static 192.168.1.40, gw 192.168.1.254 (absent), router .1 | `www.example.com` resolves and routes; FS01 still routes | azure-nsg-best-practices |
| 106 | Intranet works for everyone but me | Medium | DNS correct. The hosts file has `10.0.0.99 intranet.corp.local`. 10.0.0.99 is absent | `resolve('intranet.corp.local')` gives 10.0.0.20 through any source, and `route` is ok | fix-vpn-issues-windows-powershell |

Copy rules:
- `done` and `failReply` describe user-visible outcomes only, and never name a setting.
- Hint 3 may name the fix.
- Debriefs use the spec's hedged wording for 103 ("retries on its own every few minutes"), 104 and 106 (the
  flushdns advice).

- [ ] **Step 1: Write the failing tests.**
  - For every lab: `checkLab(lab, createMachine(lab.machine)).passed === false`, and
    `checkLab(lab, lab.fix(...)).passed === true`.
  - Wrong fixes stay failed: 104 with DNS set to 8.8.8.8 (not in the world); 105 with gateway 192.168.1.40
    (itself); 101 with mask 255.255.0.0; 106 after only `ipconfig /flushdns`.
  - Ids are unique and there are three hints each.
  - Every `link.href` file exists and has no `noindex`.
  - Every lab title appears as `<h3 id="lab-<id>">title</h3>` in `simulation.html`. This test is skipped until
    Task 5 creates the page.
- [ ] **Step 2:** Run `node --test "scripts/vendor/tests/unit/sim-labs.test.mjs"`. Expected: FAIL.
- [ ] **Step 3:** Implement `js/sim/labs.js`.
- [ ] **Step 4:** Run the command again. Expected: pass, with the HTML test skipped.
- [ ] **Step 5: Commit** `feat(sim): six help desk lab tickets`

### Task 5: Page, styles, nav and indexes

**Files:**
- Create: `simulation.html`, `css/sim.css`
- Modify: `partials/header.html` (nav and dropdown), then all pages via `python scripts/sync_partials.py`;
  `css/main.css` (only if the nav wraps: move the `940px` breakpoint); `sitemap.xml`; `llms.txt` (Key pages:
  `- [Help Desk Simulator](https://sysopsbits.com/simulation.html): Free in-browser IT troubleshooting labs: DNS, static IP, APIPA, gateway, hosts file, mapped drives`);
  `categories.html` (Guided Labs section); `guided-labs.html` (one `article.post-card` in `.posts-grid`);
  `scripts/check_site.py` + `scripts/tests/test_check_site.py`
- Test: `scripts/vendor/tests/e2e/simulation.spec.mjs` (the page part)

**Interfaces (Produces):** the DOM hooks Task 6 fills and the e2e tests use.

```html
<main id="main-content"> … <p class="section-path">~/simulation</p><h1>Help Desk Simulator</h1>
<div class="sim-monitor">                       <!-- aspect-ratio 4/3 reserved in CSS; ≤700px: 3/4 -->
  <div class="sim-screen" data-state="off">       <!-- off | boot | desktop; retro tokens declared here -->
    <svg class="sim-fallback" …>  <noscript>The simulator needs JavaScript.</noscript>
  </div>
  <div class="sim-controls"><button id="sim-power" type="button" aria-pressed="false">Power</button>
    <button id="sim-fullscreen" type="button" aria-pressed="false">Full screen</button><span>BitsOS 98</span></div>
</div>
… <h2>The six labs</h2> <h3 id="lab-101">Set up the new print server</h3><p>…</p> … (×6)
<script type="module" src="js/sim/desktop.js"></script>
```

- Page head per Global Constraints. Copy it from `guided-labs.html`, then change the title, description,
  canonical, og/twitter, and JSON-LD (`@type: ["LearningResource"]`, `learningResourceType: "Simulation"`,
  `isAccessibleForFree: true`, BreadcrumbList Home > Simulation). og:image is `images/simulation-og.jpg`
  (Task 7).
- Below the monitor: How it works (3 steps), The six labs, a Commands table, Related (3 links), the AZ-900
  `aside.product-cta` (copy the markup from an AZ-900 post, with the same href and `data-product`), and an FAQ
  (3 Qs, mirrored in a JSON-LD FAQPage).
- `css/sim.css` declares on `.sim-screen`:

  | Token | Value |
  |---|---|
  | `--os-face` | `#c0c0c0` |
  | `--os-text` | `#000000` |
  | `--os-desktop` | `#007070` |
  | `--os-desktop-text` | `#ffffff` |
  | `--os-title` | `#000080` |
  | `--os-title-text` | `#ffffff` |
  | `--os-highlight` | `#000080` |
  | `--os-highlight-text` | `#ffffff` |
  | `--os-shadow` | `#808080` |
  | `--os-light` | `#ffffff` |
  | `--os-term-bg` | `#000000` |
  | `--os-term-text` | `#c0c0c0` |

  The bevels use `--os-light`/`--os-shadow` box-shadows. Fonts: `Tahoma, Verdana, "Segoe UI", sans-serif` at
  13px, and `var(--font-mono)` in the terminal. The scanline overlay is static. Any flicker sits only under
  `html.motion-ok` and `prefers-reduced-motion: no-preference`.
- `check_site.py`: add `SIM_PAIRS`:
  - `--os-text` on `--os-face`, 4.5
  - `--os-desktop-text` on `--os-desktop`, 4.5
  - `--os-title-text` on `--os-title`, 4.5
  - `--os-highlight-text` on `--os-highlight`, 4.5
  - `--os-term-text` on `--os-term-bg`, 4.5

  Read them from the `.sim-screen` block of `css/sim.css` using the existing `_block`/`_resolve`, inside
  `check_contrast`.

- [ ] **Step 1: Write the failing tests.**
  - Python: a sim pair failing below 4.5 is reported, and the real `css/sim.css` passes.
  - e2e:
    - the nav link `a[data-page="simulation"]` exists on `/index.html`, `/about.html` and a post, and has
      `aria-current` on the sim page (if the existing nav marks the current page; check `partials.js`);
    - the page has exactly 1 AdSense script, 1 canonical and 1 `application/ld+json`;
    - six `h3[id^="lab-"]`;
    - JS disabled: `.sim-fallback` is visible and the lab text is visible;
    - 360px: no horizontal scroll;
    - widths 941, 1000, 1100: every `.nav-menu > li` has the same `offsetTop` (no wrap).
- [ ] **Step 2:** Run `python -m unittest discover -s scripts/tests` and
  `cd scripts/vendor && npx playwright test simulation --project=chromium`. Expected: FAIL.
- [ ] **Step 3:** Build the page, the CSS, the nav edit, the sync, the indexes and the check_site change. If the
  no-wrap test fails, raise the mobile breakpoint in `main.css` to the smallest width that passes, and update
  the nav width test in `nav.spec.mjs` if one pins 940.
- [ ] **Step 4:** Run both commands again, plus `python scripts/check_site.py all`. Expected: pass. Un-skip the
  Task 4 HTML-title test and run it; expected: pass.
- [ ] **Step 5: Commit** `feat(sim): simulation page, retro monitor styles and nav link`

### Task 6: Desktop shell and apps

**Files:**
- Create: `js/sim/desktop.js` (power/boot, window manager, taskbar, Start menu, clock, full screen, tickets
  panel, progress, analytics)
- Create: `js/sim/apps.js` (Command Prompt, Network Connections + TCP/IPv4 dialog, Notepad, My Computer + Map
  Network Drive)
- Modify: `css/sim.css`
- Test: `scripts/vendor/tests/e2e/simulation.spec.mjs` (the interaction part)

**Interfaces:**
- Consumes: Tasks 2 to 4 and the Task 5 DOM.
- Produces the DOM hooks for tests:

  | Element | Hook |
  |---|---|
  | Desktop icons | `button.os-icon[data-app="cmd|net|notepad|computer|tickets"]` |
  | Windows | `.os-window[data-app]` with `role="dialog"`, `aria-label` = title, plus `aria-modal="true"` on modal dialogs |
  | Taskbar | `.os-taskbar`, `.os-start`, `.os-task[data-app]`, `.os-clock` |
  | Terminal | input `#os-cmd-input` (labelled "Command"), output `.os-cmd-output` (`aria-live="polite"`) |
  | Network | `[data-action="properties"]`, `[data-action="ipv4"]`; TCP/IPv4 form inputs named `ipAuto` (radio `yes|no`), `ip`, `mask`, `gateway`, `dnsAuto` (radio `yes|no`), `dns1`, `dns2`; OK `[data-action="ok"]` |
  | Error box | `.os-window[data-kind="error"]` |
  | Tickets | `.os-ticket[data-lab]` with `aria-current="true"` on the selected one; `[data-action="hint"]`, `[data-action="reset"]`, `[data-action="close-ticket"]` |
  | Results | `.os-window[data-kind="debrief"]` / `[data-kind="still-broken"]` |
  | Progress | `.os-progress` text `"<n> of 6 closed"` |

Behaviour (from the spec):

- **Power and boot.** Power: off → boot (about 1.5s of POST lines, skipped by any key or click, and instant under
  reduced motion) → desktop with Tickets open on the first unclosed lab. Power again returns to off and keeps
  the in-memory lab state.
- **Apps.** One instance per app. Opening an app focuses its first field. Windows can be dragged by the title
  bar and are clamped to the screen. Click brings a window to the front. Minimize/restore via the taskbar.
  At ≤700px windows open maximized with no drag, and Tickets becomes a drawer toggled by `.os-task[data-app="tickets"]`.
- **Modals.** They trap focus, close with Escape, and return focus to their opener.
- **Full screen.** It toggles `html.sim-fullscreen` (fixed overlay, body scroll locked). Escape exits when no
  modal is open.
- **Labs and progress.** Each lab's machine lives in memory per session, keyed by lab id. Reset recreates it.
  Close ticket runs `checkLab`:
  - passed: debrief + progress saved + gtag + counter;
  - failed: the still-broken box with `failReply`.
  - All six closed: the "Shift complete" box with links to `index.html#practice-tests` and `store.html`.
- **Start menu:** Programs (the five apps), Tickets, Help (a window explaining how the simulator works,
  including the line "Retro look, modern Windows commands"), and Shut Down (the same as Power off).
- **Notepad:** File > Open lists the two virtual files. Saving the hosts file shows the one-line tip that real
  Windows needs Notepad run as administrator.
- **Debrief:** cause, remember, command, hints used (n of 3) and the link.
- **Commands.** `ping` and `tracert` output streams at about 150ms per line (instant under reduced motion). The
  input is disabled while streaming. Up/Down recalls history. Scrollback is capped at 500 lines.

- [ ] **Step 1: Write the failing e2e tests** (chromium, firefox, webkit):
  - **Power on:** the desktop shows; with `reducedMotion: 'reduce'` it shows within 300ms.
  - **Lab 104, wrong then right:**
    - open cmd, type `ping intranet`; expect the "could not find host" line;
    - Close ticket; expect still-broken;
    - Network → Properties → TCP/IPv4, set dns1 `10.0.0.10`, OK;
    - Close ticket; expect a debrief and "1 of 6 closed";
    - reload: still "1 of 6 closed".
  - **Bad dialog input:** ip `192.168.1.256` gives an error box; the dialog is still open; after closing the error
    box, focus returns to the dialog.
  - **Review Focus 3:** select 104, set dns1 `10.0.0.10`, select 101, select 104 again; the field still shows
    `10.0.0.10`. Reset restores `10.0.0.53`.
  - **Review Focus 4:** with `page.addInitScript` making `localStorage.getItem` throw, the page powers on, shows
    "0 of 6 closed", and closing 101 shows "1 of 6 closed". With corrupt JSON in `sob-sim-progress` it also
    shows "0 of 6 closed".
  - **Review Focus 5:**
    - keyboard only: Tab to `#sim-power`, Enter, focus the cmd icon, Enter; `#os-cmd-input` is focused;
    - in the TCP/IPv4 modal, Escape closes it and focus returns to `[data-action="ipv4"]`;
    - in full screen, Escape exits.
  - **360px:** a window opens maximized inside `.sim-screen`, and the Tickets drawer toggles.
- [ ] **Step 2:** Run `cd scripts/vendor && npx playwright test simulation`. Expected: the new tests FAIL.
- [ ] **Step 3:** Implement `desktop.js`, `apps.js` and the CSS.
- [ ] **Step 4:** Run the command again. Expected: pass on all 3 browsers. Then run the full suite:
  `npx playwright test`, `node --test "scripts/vendor/tests/unit/*.test.mjs"`,
  `python -m unittest discover -s scripts/tests` and `python scripts/check_site.py all`. Expected: all pass.
- [ ] **Step 5: Commit** `feat(sim): BitsOS 98 desktop, apps and ticket queue`

### Task 7: Budget, og image, docs, review, ship

**Files:**
- Create: `scripts/vendor/tests/unit/sim-budget.test.mjs`, `images/simulation-og.jpg`, `scripts/vendor/make_sim_og.mjs`
- Modify: `docs/design-system.md`, `AGENTS.md`

- [ ] **Step 1:** Budget test: gzip `css/sim.css` and every `js/sim/*.js` with `zlib.gzipSync`, assert the sum is
  ≤ 61440 bytes, and log the total. Run it. Expected: pass, with the size printed.
- [ ] **Step 2:** `make_sim_og.mjs`: Playwright opens `/simulation.html` at 1200×630 (dark theme), powers on, opens
  Command Prompt, runs `ipconfig`, screenshots `.sim-monitor` padded onto the page background, and writes
  `images/simulation-og.jpg` (quality 80). Run it with the server up, then view the image to check it.
- [ ] **Step 3:** Docs:
  - `design-system.md`: a "Simulator" section with the `--os-*` tokens, motion rules, the budget and the size
    from Step 1;
  - `AGENTS.md`: the Structure lines for `js/sim/`, `css/sim.css`, `simulation.html`, plus the rule
    "simulator labs are data in `js/sim/labs.js`; every lab needs fix/wrong-fix unit tests and a matching
    `h3#lab-<id>` in `simulation.html`".
- [ ] **Step 4:** Code review: dispatch the `code-reviewer` agent on the diff from the commit before Task 1.
  Ask for correctness, accessibility, security (no `innerHTML` with typed input), and teaching accuracy
  against the spec's fact-check section. Fix the confirmed findings and re-run the full suite from Task 6
  Step 4.
- [ ] **Step 5:** Commit `docs(sim): design system, agent notes and og image`. Then run `git push`.
  Then `git fetch -q origin && git status -sb`. Expected: `## main...origin/main` with nothing ahead.
