"""Site invariant checks for the redesign.

Run from the repo root:
    python scripts/check_site.py contrast     WCAG contrast of the colour tokens in css/main.css
    python scripts/check_site.py adsense      same number of AdSense scripts per page as on main
    python scripts/check_site.py idempotent   re-running the page scripts changes nothing
    python scripts/check_site.py all
Exit code 1 and one line per failure when a check fails.
"""
import hashlib
import os
import re
import subprocess
import sys
from pathlib import Path

SKIP_TOP = {'partials', 'docs', '.omo', 'scripts', '.git', '.superpowers', 'node_modules'}
STUBS = {'tools.html', 'tutorials.html', 'comparisons/cmd-vs-powershell-2026.html'}
PAGE_SCRIPTS = ('sync_partials.py', 'restyle_pages.py', 'build_article_extras.py')

_TEXT = ('--text-primary', '--text-secondary', '--text-muted', '--accent-text')
_SURFACES = ('--bg-primary', '--bg-card', '--bg-secondary', '--bg-elevated', '--bg-card-hover')
PAIRS = (
    [(fg, bg, 4.5) for fg in _TEXT for bg in _SURFACES]
    + [('--text-on-accent', '--accent', 4.5)]
    + [(fg, bg, 4.5) for fg in ('--state-ok', '--state-bad') for bg in ('--bg-primary', '--bg-card')]
    + [('--border-strong', bg, 3.0) for bg in ('--bg-primary', '--bg-card')]
)

HEX = re.compile(r'^#([0-9a-fA-F]{6})$')


def _luminance(hex_colour):
    m = HEX.match(hex_colour.strip())
    if not m:
        raise ValueError('not a 6-digit hex colour: %r' % hex_colour)
    channels = [int(m.group(1)[i:i + 2], 16) / 255 for i in (0, 2, 4)]
    lin = [c / 12.92 if c <= 0.03928 else ((c + 0.055) / 1.055) ** 2.4 for c in channels]
    return 0.2126 * lin[0] + 0.7152 * lin[1] + 0.0722 * lin[2]


def contrast(fg, bg):
    """WCAG 2 contrast ratio of two #rrggbb colours."""
    hi, lo = sorted((_luminance(fg), _luminance(bg)), reverse=True)
    return (hi + 0.05) / (lo + 0.05)


def _block(css, selector):
    m = re.search(re.escape(selector) + r'\s*\{(.*?)\}', css, re.S)
    if not m:
        return {}
    body = re.sub(r'/\*.*?\*/', '', m.group(1), flags=re.S)
    out = {}
    for decl in body.split(';'):
        name, sep, value = decl.partition(':')
        if sep and name.strip().startswith('--'):
            out[name.strip()] = value.strip()
    return out


def _resolve(tokens):
    resolved = dict(tokens)
    for _ in range(8):
        changed = False
        for name, value in resolved.items():
            m = re.fullmatch(r'var\((--[\w-]+)\)', value)
            if m and m.group(1) in resolved and resolved[m.group(1)] != value:
                resolved[name] = resolved[m.group(1)]
                changed = True
        if not changed:
            break
    return resolved


def parse_tokens(css):
    """Return {'dark': {...}, 'light': {...}} custom properties with var() aliases resolved."""
    dark = _block(css, ':root')
    light = dict(dark)
    light.update(_block(css, '.light-mode'))
    return {'dark': _resolve(dark), 'light': _resolve(light)}


def site_pages(root):
    """Every deployable HTML page, with the same exclusions as sync_partials.py."""
    root = Path(root)
    pages = []
    for dirpath, dirnames, filenames in os.walk(root):
        rel = Path(dirpath).relative_to(root)
        if rel == Path('.'):
            dirnames[:] = [d for d in dirnames if d not in SKIP_TOP]
        dirnames[:] = [d for d in dirnames if d != 'node_modules']
        for name in filenames:
            if name.endswith('.html'):
                pages.append(Path(dirpath) / name)
    return sorted(pages)


SIM_PAIRS = (
    ('--os-text', '--os-face', 4.5),
    ('--os-desktop-text', '--os-desktop', 4.5),
    ('--os-title-text', '--os-title', 4.5),
    ('--os-highlight-text', '--os-highlight', 4.5),
    ('--os-term-text', '--os-term-bg', 4.5),
)


def check_sim_contrast(root):
    """WCAG contrast of the simulator's retro palette (.sim-screen block of css/sim.css)."""
    path = Path(root) / 'css' / 'sim.css'
    if not path.exists():
        return ['contrast sim: css/sim.css is missing']
    tokens = _resolve(_block(path.read_text(encoding='utf-8'), '.sim-screen'))
    failures = []
    for fg, bg, minimum in SIM_PAIRS:
        if fg not in tokens or bg not in tokens:
            failures.append('contrast sim: missing token %s' % (fg if fg not in tokens else bg))
            continue
        ratio = contrast(tokens[fg], tokens[bg])
        if ratio < minimum:
            failures.append('contrast sim: %s on %s is %.2f, needs %.1f' % (fg, bg, ratio, minimum))
    return failures


def check_contrast(root):
    tokens = parse_tokens((Path(root) / 'css' / 'main.css').read_text(encoding='utf-8'))
    failures = check_sim_contrast(root)
    for theme in ('dark', 'light'):
        t = tokens[theme]
        for fg, bg, minimum in PAIRS:
            if fg not in t or bg not in t:
                failures.append('contrast %s: missing token %s' % (theme, fg if fg not in t else bg))
                continue
            if not (HEX.match(t[fg]) and HEX.match(t[bg])):
                continue
            ratio = contrast(t[fg], t[bg])
            if ratio < minimum:
                failures.append('contrast %s: %s on %s is %.2f, needs %.1f' % (theme, fg, bg, ratio, minimum))
    return failures


def _count_adsense(html):
    return len(re.findall(r'<script[^>]+adsbygoogle\.js', html))


def check_adsense(root):
    if subprocess.run(['git', 'rev-parse', '--verify', '--quiet', 'main'], cwd=root, capture_output=True).returncode != 0:
        return ['adsense: cannot compare, there is no local "main" branch']
    failures = []
    for page in site_pages(root):
        rel = page.relative_to(root).as_posix()
        now = _count_adsense(page.read_text(encoding='utf-8'))
        shown = subprocess.run(['git', 'show', 'main:' + rel], cwd=root, capture_output=True)
        if shown.returncode == 0:
            before = _count_adsense(shown.stdout.decode('utf-8', 'replace'))
            if now != before:
                failures.append('adsense %s: %d script tags, main has %d' % (rel, now, before))
        elif now > 1:
            failures.append('adsense %s: %d script tags on a new page' % (rel, now))
    return failures


def _hashes(root):
    return {p: hashlib.sha256(p.read_bytes()).hexdigest() for p in site_pages(root)}


def check_idempotent(root):
    failures = []
    before = _hashes(root)
    for name in PAGE_SCRIPTS:
        script = Path(root) / 'scripts' / name
        if not script.exists():
            continue
        run = subprocess.run([sys.executable, str(script)], cwd=root, capture_output=True, text=True)
        if run.returncode != 0:
            failures.append('idempotent: %s exited %d: %s' % (name, run.returncode, run.stderr.strip()[-200:]))
        after = _hashes(root)
        for page in sorted(set(before) | set(after)):
            if before.get(page) != after.get(page):
                failures.append('idempotent: %s changed %s' % (name, Path(page).relative_to(root).as_posix()))
        before = after
    return failures


CHECKS = {'contrast': check_contrast, 'adsense': check_adsense, 'idempotent': check_idempotent}


def main(argv):
    which = argv[1] if len(argv) > 1 else 'all'
    if which != 'all' and which not in CHECKS:
        print(__doc__)
        return 2
    root = Path(__file__).resolve().parents[1]
    failures = []
    for name, fn in CHECKS.items():
        if which in ('all', name):
            found = fn(root)
            print('%s: %s' % (name, 'ok' if not found else '%d failure(s)' % len(found)))
            failures += found
    for line in failures:
        print(line)
    return 1 if failures else 0


if __name__ == '__main__':
    sys.exit(main(sys.argv))
