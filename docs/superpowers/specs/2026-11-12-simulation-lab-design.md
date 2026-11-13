# Help Desk Simulator ("Simulation" tab): design

Date: 2026-11-12. Status: draft, awaiting owner approval.

## Intent

A **Simulation** link in the top nav opens a page showing a retro CRT monitor. Inside the screen runs an
original 90s-style desktop OS ("BitsOS 98"). A help-desk ticket queue docked on the left of the desktop lists
short labs. Each lab is a **broken machine**: the learner reads a user's ticket, diagnoses the fault with
real Windows commands and settings dialogs, fixes it, and closes the ticket. The ticket only closes if the
fault is actually fixed.

Who it's for: people new to IT (help desk, junior sysadmin, students). Why: teach the first networking and
desktop-support skills by doing, and keep them on the site (practice tests, guides, study-guide store).

Owner decisions so far: lab style B (broken-machine ticket with hints), not a guided step-by-step script.

## Goals

- It feels like sitting at an old PC: the power button, a short boot screen, a teal desktop, grey bevelled
  windows, a taskbar with a Start menu and clock.
- Six starter labs, from easy to harder, each solvable in 3 to 10 minutes.
- Every command and dialog behaves the way it does on a real Windows PC, so the skills transfer. Output
  follows real Windows formatting.
- Learners have to diagnose. Random clicking must not solve a lab, and closing a ticket checks the machine's
  actual state.
- Progress is remembered per browser, with a "3 of 6 tickets closed" counter.
- When a ticket closes, a short debrief explains the root cause, what to remember and the real-world command,
  and links to a related post.
- It works with a keyboard, at phone width, and with reduced motion.

## Non-goals (this version)

- Multiple machines, a full file system, Linux labs, sound, user accounts, a lab editor.
- Pixel-perfect dragging on phones (windows open full-screen there instead).
- Home-page placement. A homepage card can be added later; the owner can ask for it.

## Anti-goals (failure even if it "works")

- **Technically wrong teaching.** A beginner learning a wrong fact is the worst outcome. Every behaviour a lab
  relies on is fact-checked against Microsoft documentation (see "Fact check" below).
- Microsoft trade dress: no Windows logo, no "Windows" name, no copied icons or startup sound. The 90s style
  is generic: teal desktop, grey bevels, a taskbar. The Start button shows the SysOpsBits mark.
- Anything that runs real commands or touches the visitor's network. Everything is simulated in the page.
- A heavy page. No Three.js and no framework (budget below).
- Hiding content from crawlers or no-JS visitors. The page's teaching text is plain HTML.

## Constraints (from AGENTS.md)

- Static HTML, no build step for site code. Push to `main`.
- Standard page head: title, meta description, canonical, og/twitter with og:image, favicons, the one Google
  Fonts link, inline theme script, one JSON-LD `@graph` (LearningResource + BreadcrumbList), gtag, exactly one
  AdSense script. Author "Matthew Hippensteel".
- Header and footer are inlined. Add the nav link in `partials/header.html`, then run
  `python scripts/sync_partials.py`.
- Add the page to `sitemap.xml`, `llms.txt` (Key pages), `categories.html` and the `guided-labs.html` listing
  (a `.post-card` inside `.posts-grid`).
- Theme tokens: use the existing token names, and add no new font links.
- Motion only under `html.motion-ok`, and nothing moves for reduced-motion visitors.
- Don't add `.progress-bar` or `.progress-fill` classes. Prefix every simulator class with `sim-` or `os-`.

## Approaches considered

1. **Vanilla ES modules, a pure engine plus a thin DOM layer (picked).** This matches the site (it is how
   `js/hero-graph.js` and `js/home-scene.js` are split). The engine has no DOM, so it is unit-tested with
   `node --test`. There is no build step and no new dependency. The cost: we write the window manager by hand,
   which is about 300 lines.
2. **Preact + htm bundled with the existing esbuild tooling.** Component state is nicer, but it adds a
   committed vendor bundle and a dependency for one page. Rejected: the site avoids a build step for its
   own code.
3. **The 98.css library for the look.** It looks authentic quickly, but it copies Windows 98 styling closely
   (the trade-dress risk above) and adds a stylesheet we don't control. Rejected. Our own CSS is about 400
   lines.

## The page

`/simulation.html` (root, like the listing pages).

- Title: "Free IT Help Desk Simulator: Fix DNS, IP and Network Problems | SysOpsBits".
- Breadcrumb: Home > Simulation.
- Nav: add `<li><a href="simulation.html" data-page="simulation">Simulation</a></li>` after "Project
  Management". Also add "Help Desk Simulator" to the Categories dropdown, after "Free Practice Tests". If the
  desktop nav wraps between 941 and 1100px, raise the mobile breakpoint until it doesn't (a test pins this).

Page layout, top to bottom, inside the normal site header and footer:

```
~/simulation
Help Desk Simulator                                   (h1)
One paragraph: what it is, that it's free, nothing installs.

┌──────────────── monitor bezel (site tokens) ───────────────┐
│ ┌──────────── screen 4:3, retro palette always ─────────┐  │
│ │ ┌ Tickets ─────┐  [My Computer] [Network] [Cmd] [Note] │  │
│ │ │ #101 Static ✓│                                       │  │
│ │ │ #102 S: drive│      ┌ Command Prompt ───── _ □ x ┐   │  │
│ │ │ #103 169.254 │      │ C:\> ipconfig               │   │  │
│ │ │ #104 DNS     │      │ ...                         │   │  │
│ │ │ ...          │      └─────────────────────────────┘   │  │
│ │ │ 1 of 6 closed│                                        │  │
│ │ └──────────────┘                                        │  │
│ │ [Start]| Command Prompt | Tickets |            10:42 AM │  │
│ └─────────────────────────────────────────────────────────┘  │
│  ( ) power      [Full screen]                     BitsOS 98  │
└──────────────────────────────────────────────────────────────┘

How it works (3 short steps) · The six labs (h2 + one paragraph each,
crawlable, also the no-JS fallback) · Commands you'll use (table) ·
Related: AZ-900 networking, Fix VPN issues with PowerShell, CMD vs
PowerShell · study-guide CTA (aside.product-cta style) · FAQ (3 Qs)
```

- **Entering.** The monitor starts powered off: a dark screen with a glowing "Press power to start" button.
  Pressing it runs a boot screen (memory count, a "BitsOS 98" splash) of about 1.5s, then the desktop. Any
  key or click skips the boot. With reduced motion there is no boot animation and the desktop appears at once.
- **Full screen.** A button expands the monitor to fill the viewport (a fixed overlay with the page scroll
  locked). Escape or the button exits. The Fullscreen API is not needed.
- **Theme.** The site's light/dark theme styles the bezel and page. The inside of the screen always uses the
  retro palette, so it reads as a different machine.
- **Phones (≤ 700px).** The screen fills the width at about a 3:4 ratio. Windows open maximized, the ticket
  queue becomes a drawer opened from a "Tickets" taskbar button, and drag is off.
- **No JavaScript.** The monitor shows a static picture of the desktop (inline SVG) with "The simulator needs
  JavaScript". All lab text below it stays readable.

## The OS shell

- **Desktop icons:** My Computer, Network Connections, Command Prompt, Notepad, Help Desk Tickets.
  Double-click or Enter opens them; a single click or focus selects. Icons are original pixel-style inline SVGs.
- **Start menu:** Programs (the same apps), Tickets, Help (how the simulator works), Shut Down (back to the
  powered-off screen; lab state is kept).
- **Windows:** a title bar with icon and title, plus minimize, maximize and close. Dragging the title bar moves
  a window, which stays inside the screen. Clicking a window brings it to the front. Taskbar buttons
  restore or minimize their window.
- **Modal dialogs** (TCP/IPv4 Properties, error boxes) block their parent window, trap focus, close with
  Escape, and return focus to the opener.
- **Clock:** the visitor's local time.

Retro skin, modern skills: the OS looks like the 90s, but the commands and dialogs are the modern Windows
ones a technologist meets at work (`ipconfig /all`, "Internet Protocol Version 4 (TCP/IPv4) Properties").
The Help window says this in one line.

## Apps

1. **Command Prompt.** It has scrollback, Up/Down history and case-insensitive commands. It supports:
   `help`, `cls`, `exit`, `hostname`, `ipconfig`, `ipconfig /all`, `/release`, `/renew`, `/flushdns`,
   `/displaydns`, `ping <host|ip>`, `tracert <host|ip>`, `nslookup <name> [server]`, `net use`,
   `net use X: \\server\share`, `net use X: /delete`, `dir [X:]`, `type <path>` and `arp -a`. Unknown
   commands print the real "'x' is not recognized as an internal or external command, operable program or
   batch file." Each command runs instantly (no fake delays), except that `ping` and `tracert` print line by
   line at about 150ms intervals, instant under reduced motion.
2. **Network Connections.** It shows one adapter, "Ethernet", with its status (Enabled/Disabled, Connected,
   "Network cable unplugged"). The buttons are Enable, Disable, Status and Properties. Properties opens the
   adapter dialog, which has an "Internet Protocol Version 4 (TCP/IPv4)" item. Its Properties button opens:
   - "Obtain an IP address automatically" / "Use the following IP address": IP address, Subnet mask, Default
     gateway.
   - "Obtain DNS server address automatically" / "Use the following DNS server addresses": Preferred,
     Alternate.
   - OK validates. A malformed address gets an error box and the dialog stays open. A gateway outside the
     subnet gets a warning with Yes/No, as real Windows does. OK applies the change to the machine state.
3. **Notepad.** File > Open uses a tiny virtual file system: `C:\Windows\System32\drivers\etc\hosts` and
   `C:\Users\you\Desktop\network-notes.txt`. Every lab writes its network documentation into the notes
   file: the server names, the IP plan, the router address. File > Save writes back to the state. Saving the
   hosts file shows a one-line tip that real Windows needs Notepad run as administrator.
4. **My Computer.** It shows Local Disk (C:) and any mapped drives with their state. Tools > Map Network Drive
   asks for a drive letter, a folder (`\\server\share`) and "Reconnect at sign-in". Disconnect is also there.
5. **Help Desk Tickets** (the side navigation the owner asked for). It is docked on the left inside the
   screen and can't be closed, only collapsed. It lists the tickets with a number, a short title, a
   difficulty (Easy/Medium) and a status. Selecting one shows:
   - the user's message, written as a real ticket;
   - "What done looks like": the user-visible outcome, never the fix;
   - **Hint** (up to 3, each more specific; hints used are counted in the debrief);
   - **Reset machine**;
   - **Close ticket**, which runs the lab's checks. If any fail, the user replies in a realistic voice
     ("Still can't open the intranet") and the ticket stays open. A ticket never says which setting is wrong.

   Switching tickets loads that lab's machine. Each lab's in-progress state is kept in memory for the
   session, and closed status is saved to `localStorage`.

## Engine (pure, no DOM)

A machine state holds: hostname; the adapter (enabled, cable, dhcp flag, static ip/mask/gateway, dns mode,
dns list); the current lease (assigned or APIPA); the DNS cache; the files (hosts, notes); and the mapped
drives. A lab-defined **world** holds the subnets, the hosts on them (ip, name, answers ping, shares), the DNS
servers and their records, the DHCP server (available or not, pool, options), the router, and an internet
host reachable through the router.

Core functions, all pure and unit-tested:

- `effectiveConfig(state, world)` gives the IP, mask, gateway and DNS in use. DHCP gives a lease if the DHCP
  server can be reached. Otherwise the address is APIPA (169.254.x.x/16) with no gateway. A disabled adapter
  or unplugged cable means no address.
- `route(state, world, ip)` decides whether a host is on the same subnet (direct, if the host exists and
  answers), on another subnet (through the gateway, if the gateway is on-link and is the router), or
  unreachable. It returns the reason, which is used for real-looking messages ("Destination host
  unreachable.", "Request timed out.", "General failure.", "PING: transmit failed. General failure.").
- `resolve(state, world, name)` checks the hosts file, then the cache, then each DNS server in order (the
  server must be routable and must answer). It returns the address, the source and a failure reason. Short
  names get the primary DNS suffix (`corp.local`) from the lab.
- `nslookupQuery` queries DNS servers directly and ignores the hosts file and cache, as the real tool does.
- The formatters print `ipconfig`, `ping`, `tracert`, `nslookup` and `net use` output in the Windows format.

**Labs are data:** id, number, title, difficulty, ticket text, done-looks-like, the world, initial machine
overrides, notes-file text, checks, hints, debrief and a related link. Each check is a function of
(state, world) with a label. Every lab must pass two unit tests: none of its checks pass at the start, and
all pass after the intended fix is scripted through the engine (the same functions the UI calls).

## The six labs (easy to harder)

| # | Ticket | Fault | Intended fix | Teaches |
|---|---|---|---|---|
| 101 | "Set up the new print server" | Machine PRN01 is on DHCP, and the ticket gives the static plan (192.168.1.50/24, gateway .1, DNS .10) | Enter the static config in TCP/IPv4 Properties | The four IPv4 fields and what each does |
| 102 | "My S: drive disappeared" | No mapping | `net use S: \\FS01\Shared`, or the Map Network Drive dialog | UNC paths, drive mapping, `net use` |
| 103 | "Network says 169.254, no internet" | DHCP failed earlier (the wall jack was dead, and facilities fixed it this morning). The PC still holds an APIPA address | `ipconfig /renew` (or `/release` then `/renew`) | What APIPA means and when to renew a lease |
| 104 | "Can't open the intranet" | Static DNS points to a decommissioned server (10.0.0.53). Ping by IP works, by name fails | Set DNS to 10.0.0.10 from the notes, or switch DNS to automatic | Name vs IP testing, `nslookup`, the DNS server setting |
| 105 | "Can't reach the internet, file server works" | The static gateway is 192.168.1.254, which doesn't exist | Set the gateway to 192.168.1.1 | Gateways, local vs remote traffic, `tracert` |
| 106 | "Intranet works for everyone but me" | A stale hosts entry maps the intranet to its old IP 10.0.0.99 | Remove the line in Notepad and save | The hosts file comes before DNS; `nslookup` ignores the hosts file, so it looks right while `ping` fails |

Checks are user-visible outcomes, never just "field equals value". For 104, the checks are: `intranet.corp.local`
resolves to 10.0.0.20 through the machine's resolver, and the host answers through `route`. For 101, the
checks are the exact planned address, mask, gateway and DNS, and the gateway and DNS server are reachable.

Each debrief has the root cause in one sentence, the remember-this point, the real command, the hints used,
and one related link: 101 to 104 link to the AZ-900 networking post, 105 to the NSG post, and 106 to the
VPN troubleshooting post. The builder may pick a better existing post if it fits.

**Fact check.** Before the lab text is final, the researcher verifies these against Microsoft Learn:

- APIPA behaviour and range;
- what `/renew` does from APIPA;
- that `nslookup` bypasses the hosts file;
- whether hosts-file edits take effect without `/flushdns`;
- the gateway-off-subnet warning;
- the exact output formats and error strings.

Where real behaviour is uncertain, the lab must not depend on it.

**Fact-check results (researcher, 2026-11-12, Microsoft Learn).**

Confirmed:

- The APIPA block is 169.254.0.0/16 with mask 255.255.0.0, and it is on by default.
- `ipconfig /renew` renews DHCP, and only on adapters set to obtain an address automatically.
- The Windows resolver checks the cache, then the hosts file, then DNS. `nslookup` bypasses the cache and the
  hosts file and asks only the primary DNS server.
- `ipconfig /displaydns` shows preloaded hosts entries.
- `ipconfig /flushdns` clears negative entries as well, and Microsoft advises flushing after changing DNS
  client settings.
- What the ping messages mean:
  - "Destination host unreachable": no ARP reply on the local subnet.
  - "Request timed out": ARP worked but no echo reply came back.
  - "General failure": no usable interface (adapter disabled or disconnected).
- Off-subnet traffic goes to the gateway, and local traffic goes direct.

Not documented: the exact console strings, the exact text of the gateway warning, whether hosts-file edits
need a flush, the negative-cache TTL, and the DHCP retry interval on Windows 10/11.

How the build handles these:

- **APIPA addresses.** Generate only from 169.254.1.0 to 169.254.254.255 (valid under every reading), with no
  default gateway.
- **103.** Say Windows "retries on its own every few minutes"; `/renew` asks right now.
- **104.** Negative caching is not modelled, so the fix works without a flush. The debrief advises
  `ipconfig /flushdns` "if it still fails after the fix, to clear cached failures", which is Microsoft's own
  advice.
- **106.** Hosts edits take effect when saved. The debrief says `ipconfig /flushdns` clears any answer
  Windows cached before the edit. It doesn't claim that a flush is required or that it isn't.
- **Gateway outside the subnet.** The dialog shows a plain-language Yes/No warning, not presented as
  Windows' exact text. No lab depends on it; 105's wrong gateway is inside the subnet.
- **Console strings.** Capture the exact formats from a real Windows 11 machine (the dev PC) during
  implementation, using harmless commands only: `ipconfig`, `ipconfig /all`, `ping` to a made-up name and to
  an unused local IP, `nslookup` to a made-up name, `net use`, `tracert -h 2`, an unknown command. Don't
  change any adapter settings. Replace real addresses and names with the lab's values. Ping and tracert
  wording for unreachable cases follows the meanings above:
  - off-subnet with a dead gateway: "Request timed out." with no reply source;
  - same-subnet host that doesn't exist: "Reply from <own IP>: Destination host unreachable.";
  - adapter disabled or APIPA with an off-subnet target: "PING: transmit failed. General failure."

## Progress, analytics, monetization

- `localStorage` key `sob-sim-progress`: `{ "<labId>": { "closed": "<ISO date>", "hints": n } }`. Every read
  and write is wrapped in try/catch, and the page works without storage.
- Closing a ticket calls `gtag('event', 'sim_ticket_closed', { lab_id, hints })` when gtag exists.
- Closing all six opens a "Shift complete" dialog with links to the free practice tests and the store. Below
  the monitor is the standard study-guide CTA for AZ-900. There are no Amazon links.

## Files

- `simulation.html`
- `css/sim.css` (loaded only by this page)
- `js/sim/engine.js`, `js/sim/commands.js`, `js/sim/labs.js` (pure)
- `js/sim/desktop.js` (window manager, apps, boot, wiring; `<script type="module">`)
- `images/simulation-og.jpg` (1200×630 screenshot of the sim, made with Playwright)
- Tests: `scripts/vendor/tests/unit/sim-*.test.mjs` and `scripts/vendor/tests/e2e/simulation.spec.mjs`
- Docs: update `docs/design-system.md` (the sim palette and motion) and `AGENTS.md` (structure)

## Performance and quality budget

- Simulator JS + CSS: no more than 45 KB gzipped together. No third-party code. Lighthouse accessibility
  is 100 and best practices is at least 95 on this page.
- No layout shift: the monitor reserves its aspect ratio before JS runs.
- Retro-palette text pairs meet WCAG AA (black on #c0c0c0, white on the teal desktop). The new tokens
  are added to the `check_site.py` contrast pairs.
- e2e tests:
  - the nav link appears on every page;
  - power on, then the boot is skipped under reduced motion;
  - solve lab 104 through the real UI (the dialog plus a command);
  - a wrong fix keeps the ticket open;
  - progress survives a reload;
  - no horizontal scroll at 360px;
  - the no-JS fallback shows;
  - focus returns from dialogs;
  - the header nav doesn't wrap at 941 to 1100px.

## Left to the builder

The exact module split inside `js/sim/`, CSS structure, the icon art, the exact ticket copy and hint wording
(within the facts above), the boot screen text, the world addresses for labs other than those named, and how
windows cascade when they open.

## Builder-check answers (Claude's calls)

- **Fact check timing.** It runs before the plan, and its results are written into the labs table above. The
  plan codes the confirmed behaviour only.
- **Nav placement.** The owner asked for a top-level tab, so "Simulation" is a top-level link. It also gets a
  card in the Guided Labs listing and a Categories dropdown entry, because it is a lab and should be found
  there too. This duplication is intended.
- **Budget.** Measure `css/sim.css` plus all `js/sim/*.js`, gzipped, including the inline SVG icons in JS. The
  page HTML is excluded. The target is 45 KB and the hard ceiling is 60 KB, and a unit test enforces the
  ceiling. Don't lazy-load the lab data.
- **Duplicate lab text.** The HTML lab paragraphs are hand-written teaching summaries, separate from
  `labs.js`. A unit test checks that every lab in `labs.js` has an `<h3 id="lab-<number>">` in
  `simulation.html` with the same title.
- **Related links.** Pick the closest existing indexed post, and prefer on-prem/Windows posts
  (`tutorials/fix-vpn-issues-windows-powershell.html`, `tutorials/cmd-vs-powershell-2026.html`) over Azure ones
  where they fit better. A test fails if any debrief link points to a noindex page. No new posts are in scope.
- **Retro palette.** Use custom properties declared on `.sim-screen` in `css/sim.css` (`--os-face`, `--os-text`,
  `--os-desktop`, `--os-title`, `--os-title-text`, `--os-highlight`, `--os-highlight-text`). `check_site.py`
  reads that block and checks its own pairs (text on face, title text on title, highlight text on highlight,
  icon label text on desktop).

## Calls made by Claude (owner may change)

- The name "BitsOS 98" and the nav label "Simulation" (the page h1 says "Help Desk Simulator").
- The ticket queue sits inside the screen as a docked panel, not beside the monitor.
- Modern Windows commands and dialogs in a retro skin.
- Six labs as listed. The page's URL is `/simulation.html`.
