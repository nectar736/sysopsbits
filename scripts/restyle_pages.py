"""One-off bulk edits for the 2026-11 redesign. Safe to re-run: a second run changes nothing.

Run from the repo root:
    python scripts/restyle_pages.py           apply the edits and print a count per edit
    python scripts/restyle_pages.py --check   fail if any page's <head> differs from main in
                                              anything other than the fonts link, the syntax.css
                                              link and inline <style> blocks

Edits (every page except the three meta-refresh stubs):
  1. Google Fonts link -> IBM Plex Sans + JetBrains Mono
  2. remove the css/syntax.css link (the stylesheet was unused)
  3. strip inline style attributes from .category badges
  4. <time datetime="YYYY-MM-DD"> text -> the ISO date
  5. <main> gets id="main-content" (skip-link target)
  6. js/motion.js script tag before </body>
"""
import re
import subprocess
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from check_site import STUBS, site_pages  # noqa: E402

FONT_HREF = ('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600'
             '&amp;family=JetBrains+Mono:wght@400;500&amp;display=swap')

_FONT_LINK = re.compile(r'(<link rel="stylesheet" href=")https://fonts\.googleapis\.com/css2\?[^"]*(")')
_SYNTAX_LINE = re.compile(r'[ \t]*<link rel="stylesheet" href="[^"]*css/syntax\.css">[ \t]*\r?\n')
_BADGE = re.compile(r'(<(?:a|span)\b[^>]*\bclass="category")\s+style="[^"]*"')
_TIME = re.compile(r'(<time datetime="(\d{4}-\d{2}-\d{2})[^"]*">)[^<]*(</time>)')
_MAIN = re.compile(r'<main(?![^>]*\bid=)([^>]*)>')
_BODY_END = re.compile(r'([ \t]*)</body>')
_LAST_SCRIPT_INDENT = re.compile(r'^([ \t]*)<script\b[^\n]*\n(?=[ \t]*</body>)', re.M)


def swap_fonts(html):
    return _FONT_LINK.sub(lambda m: m.group(1) + FONT_HREF + m.group(2), html)


def drop_syntax_css(html):
    return _SYNTAX_LINE.sub('', html)


def strip_badge_styles(html):
    return _BADGE.sub(r'\1', html)


def iso_dates(html):
    return _TIME.sub(lambda m: m.group(1) + m.group(2) + m.group(3), html)


def add_main_id(html):
    return _MAIN.sub(lambda m: '<main id="main-content"%s>' % m.group(1), html, count=1)


def add_motion_script(html, prefix):
    """Insert the motion.js tag before </body>. prefix is '', '../' (repeated) or '/'."""
    if 'js/motion.js' in html:
        return html
    indent = _LAST_SCRIPT_INDENT.search(html)
    pad = indent.group(1) if indent else ''
    tag = '%s<script src="%sjs/motion.js" defer></script>\n' % (pad, prefix)
    return _BODY_END.sub(lambda m: tag + m.group(0), html, count=1)


EDITS = (
    ('fonts', swap_fonts),
    ('syntax.css', drop_syntax_css),
    ('badges', strip_badge_styles),
    ('dates', iso_dates),
    ('main id', add_main_id),
)


def restyle(html, prefix):
    for _, fn in EDITS:
        html = fn(html)
    return add_motion_script(html, prefix)


def head_of(html):
    m = re.search(r'<head>.*?</head>', html, re.S)
    return m.group(0) if m else ''


def _normal_head(html):
    head = head_of(html.replace('\r\n', '\n'))
    head = re.sub(r'[ \t]*<style\b.*?</style>[ \t]*\n?', '', head, flags=re.S)
    lines = [ln.rstrip() for ln in head.split('\n')
             if 'fonts.googleapis.com/css2' not in ln and 'css/syntax.css' not in ln]
    return '\n'.join(ln for ln in lines if ln.strip())


def heads_match(old, new):
    """True when the two documents' heads differ only in the allowed ways."""
    return _normal_head(old) == _normal_head(new)


def prefix_for(rel):
    # 404.html is served at any URL depth, so it uses root-absolute paths
    return '/' if rel == '404.html' else '../' * rel.count('/')


def _pages(root):
    for page in site_pages(root):
        rel = page.relative_to(root).as_posix()
        if rel not in STUBS:
            yield page, rel


def apply_all(root):
    counts = {name: 0 for name, _ in EDITS}
    counts['motion script'] = 0
    changed = 0
    for page, rel in _pages(root):
        html = page.read_text(encoding='utf-8')
        new = html
        for name, fn in EDITS:
            after = fn(new)
            if after != new:
                counts[name] += 1
            new = after
        after = add_motion_script(new, prefix_for(rel))
        if after != new:
            counts['motion script'] += 1
        new = after
        if new != html:
            with open(page, 'w', encoding='utf-8', newline='\n') as fh:
                fh.write(new)
            changed += 1
    for name, n in counts.items():
        print('%-14s %d pages' % (name, n))
    print('updated %d pages' % changed)
    return 0


def check_heads(root):
    bad = []
    for page, rel in _pages(root):
        shown = subprocess.run(['git', 'show', 'main:' + rel], cwd=root, capture_output=True)
        if shown.returncode != 0:
            continue  # new page, nothing to compare with
        if not heads_match(shown.stdout.decode('utf-8'), page.read_text(encoding='utf-8')):
            bad.append(rel)
    for rel in bad:
        print('head changed: %s' % rel)
    print('heads: %s' % ('ok' if not bad else '%d mismatch(es)' % len(bad)))
    return 1 if bad else 0


def main(argv):
    root = Path(__file__).resolve().parents[1]
    if '--check' in argv:
        return check_heads(root)
    return apply_all(root)


if __name__ == '__main__':
    sys.exit(main(sys.argv))
