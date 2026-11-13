"""Write the generated article blocks into every standard post. Re-run after adding or retitling a post.

Run from the repo root:
    python scripts/build_article_extras.py

For each standard post in tutorials/, project-management/, comparisons/ and tools/ it writes,
between <!-- auto:NAME:start --> / <!-- auto:NAME:end --> markers (so a re-run replaces them):
  auto:toc       table of contents from the body's h2 headings (only when there are 3 or more),
                 placed after the post header; h2 elements without an id get one
  auto:cta       a study-guide box after the body, only for indexed posts that have no
                 aside.product-cta of their own
  auto:post-end  a coffee link and three related posts from the same category
and adds js/article.js before </body>. Practice tests and meta-refresh stubs are skipped.
"""
import html as htmllib
import re
import sys
from dataclasses import dataclass, field
from pathlib import Path

POST_DIRS = ('tutorials', 'project-management', 'comparisons', 'tools')

# Copied from the homepage guide cards (index.html)
PRODUCTS = {
    'az-140': dict(name='AZ-140 Exam Kit', exam='AZ-140', detail='63 pages + 55-question exam', price='$8.99',
                   href='https://buymeacoffee.com/mattyhip/e/589877', image='az-140-exam-kit.jpg', width=1400, height=1400,
                   blurb='The full Azure Virtual Desktop skills outline compressed into 63 pages, plus a 55-question practice exam with an explanation for every answer.'),
    'az-104': dict(name='AZ-104 Exam Cram', exam='AZ-104', detail='Notes, labs + 80-question exam', price='$8.99',
                   href='https://buymeacoffee.com/mattyhip/e/537655', image='az-104.jpg', width=1168, height=784,
                   blurb='High-impact notes and labs for every AZ-104 skill area, plus an 80-question practice exam with explanations.'),
    'az-900': dict(name='AZ-900 Exam Cracker', exam='AZ-900', detail='61 pages + 40-question test', price='$8.99',
                   href='https://buymeacoffee.com/mattyhip/e/538078', image='az-900.png', width=1000, height=667,
                   blurb='The AZ-900 skills outline in 61 pages, plus a 40-question practice test with an explanation for every answer.'),
    'pmp': dict(name='PMP Exam Cracker', exam='the PMP', detail='64 pages + 80-question test', price='$8.99',
                href='https://buymeacoffee.com/mattyhip/e/537680', image='pmp-exam.png', width=1248, height=832,
                blurb='The PMP exam content outline condensed into 64 pages, plus an 80-question practice test with an explanation for every answer.'),
    'pmp-charts': dict(name='PMP Charts & Visuals', exam='the PMP', detail='31 charts + 40-question test', price='$6.99',
                       href='https://buymeacoffee.com/mattyhip/e/552628', image='pmp-charts-study-guide.jpg', width=832, height=1248,
                       blurb='31 charts and data visualizations the PMP exam asks you to read, plus a 40-question practice test.'),
    'psm1': dict(name='PSM I Exam Cracker', exam='PSM I', detail='14 pages + 80-question exam', price='$8.99',
                 href='https://buymeacoffee.com/mattyhip/e/564665', image='psm1-exam-cracker.jpg', width=1152, height=1728,
                 blurb='The Scrum Guide distilled into 14 pages, plus an 80-question practice exam with an annotated answer key.'),
}

COFFEE_ICON = ('<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">'
               '<path d="M2,21H20V19H2M20,18H8V6H20M20,3H8V5H20M16,10V8H18V10M16,14V12H18V14M16,18V16H18V18M7,9V7H15V9M7,13V11H15V13M7,17V15H15V17"/></svg>')


@dataclass
class Post:
    path: str
    title: str
    date: str
    category: str
    category_href: str
    tags: list = field(default_factory=list)
    noindex: bool = False
    has_cta: bool = False
    is_standard: bool = True


def _text(fragment):
    return re.sub(r'\s+', ' ', htmllib.unescape(re.sub(r'<[^>]+>', '', fragment))).strip()


def slugify(text):
    return re.sub(r'[^a-z0-9]+', '-', text.lower()).strip('-')


def _strip_auto(html):
    return re.sub(r'\n?[ \t]*<!-- auto:([\w-]+):start -->.*?<!-- auto:\1:end -->', '', html, flags=re.S)


def parse_post(rel, html):
    is_standard = ('<article class="post"' in html and 'practice-test' not in rel
                   and 'http-equiv="refresh"' not in html and '<div class="post-content">' in html)
    title = re.search(r'<h1[^>]*>(.*?)</h1>', html, re.S)
    date = re.search(r'"datePublished":\s*"(\d{4}-\d{2}-\d{2})', html)
    header = re.search(r'<header class="post-header">(.*?)</header>', html, re.S)
    cat = re.search(r'<a href="([^"]+)" class="category">([^<]+)</a>', header.group(1) if header else '')
    tags = re.findall(r'<span class="tag">([^<]+)</span>', html)
    body = _strip_auto(html)
    return Post(
        path=rel,
        title=_text(title.group(1)) if title else rel,
        date=date.group(1) if date else '',
        category=cat.group(2).strip() if cat else '',
        category_href=cat.group(1) if cat else '',
        tags=[t.strip().lower() for t in tags],
        noindex='content="noindex' in html,
        has_cta='class="product-cta"' in body,
        is_standard=is_standard,
    )


def collect_posts(root):
    posts = []
    for d in POST_DIRS:
        for f in sorted((Path(root) / d).glob('*.html')):
            rel = f.relative_to(root).as_posix()
            posts.append(parse_post(rel, f.read_text(encoding='utf-8')))
    return posts


def heading_ids(html):
    """Give every h2 an id; return the new html and [(id, plain label)]."""
    used = set(re.findall(r'\bid="([^"]+)"', html))
    items = []

    def fix(m):
        attrs, inner = m.group(1), m.group(2)
        label = _text(inner)
        existing = re.search(r'\bid="([^"]+)"', attrs)
        if existing:
            items.append((existing.group(1), label))
            return m.group(0)
        base = slugify(label) or 'section'
        hid, n = base, 2
        while hid in used:
            hid, n = '%s-%d' % (base, n), n + 1
        used.add(hid)
        items.append((hid, label))
        return '<h2 id="%s"%s>%s</h2>' % (hid, attrs, inner)

    return re.sub(r'<h2([^>]*)>(.*?)</h2>', fix, html, flags=re.S), items


def toc_html(items):
    if len(items) < 3:
        return ''
    lis = ''.join('<li><a href="#%s">%s</a></li>' % (i, htmllib.escape(label, quote=False)) for i, label in items)
    return ('<nav class="post-toc" aria-label="Table of contents"><details><summary>On this page</summary>'
            '<ol>%s</ol></details></nav>' % lis)


def related_for(post, posts, n=3):
    pool = [p for p in posts if p.is_standard and not p.noindex and p.path != post.path and p.category == post.category]
    mine = set(post.tags)
    pool.sort(key=lambda p: p.path)
    pool.sort(key=lambda p: p.date, reverse=True)
    pool.sort(key=lambda p: len(mine & set(p.tags)), reverse=True)
    return pool[:n]


def cta_key(post):
    name = post.path.split('/')[-1]
    if 'psm1' in name:
        return 'psm1'
    if any(k in name for k in ('burnup', 'charts', 'visual-tools')):
        return 'pmp-charts'
    if 'pmp' in name or 'pmbok' in name or post.path.startswith('project-management/'):
        return 'pmp'
    for key in ('az-900', 'az-104', 'az-140'):
        if key in name:
            return key
    return None


def cta_html(post):
    key = cta_key(post)
    if key is None:
        return '<p class="store-line">Studying for a certification? <a href="../store.html">Browse the study guides</a>.</p>'
    p = PRODUCTS[key]
    name = htmllib.escape(p['name'], quote=False)
    return (
        '<aside class="product-cta" aria-label="Study guide">'
        '<img src="../images/%s" alt="%s cover" width="%d" height="%d" loading="lazy">'
        '<div class="product-cta-body">'
        '<p class="product-cta-eyebrow">Studying for %s?</p>'
        '<h3 class="product-cta-title">%s</h3>'
        '<p>%s</p>'
        '<a class="btn btn-primary" href="%s" target="_blank" rel="noopener" data-product="%s">Get the %s, %s</a>'
        '<p class="product-cta-note">Written by the author of this guide. Free practice tests stay free.</p>'
        '</div></aside>'
    ) % (p['image'], name, p['width'], p['height'], p['exam'], name, p['blurb'], p['href'], key, name, p['price'])


def post_end_html(post, posts):
    rel = related_for(post, posts)
    items = ''.join(
        '<li><a href="../%s">%s</a> <span class="category">%s</span> <time datetime="%s">%s</time></li>'
        % (p.path, htmllib.escape(p.title, quote=False), htmllib.escape(p.category, quote=False), p.date, p.date)
        for p in rel)
    related = ('<section class="related-posts" aria-labelledby="related-h"><h2 id="related-h">Related</h2>'
               '<ul>%s</ul></section>' % items) if rel else ''
    return ('<div class="post-end"><p class="post-end-coffee">Found this useful? '
            '<a class="bmc-btn bmc-btn-inline" href="https://buymeacoffee.com/mattyhip" target="_blank" rel="noopener">'
            '%s<span>Buy me a coffee</span></a></p>%s</div>' % (COFFEE_ICON, related))


def _block(name, inner, indent):
    return '\n%s<!-- auto:%s:start -->%s<!-- auto:%s:end -->' % (indent, name, inner, name)


def apply(html, post, posts):
    html = _strip_auto(html)
    start = html.index('<div class="post-content">')
    footer = html.find('<footer class="post-footer">', start)
    art_end = html.index('</article>', start)
    body_end = footer if footer != -1 else art_end
    body, items = heading_ids(html[start:body_end])
    html = html[:start] + body + html[body_end:]

    # Table of contents after the post header
    toc = toc_html(items)
    if toc:
        hdr_end = html.index('</header>', html.index('<header class="post-header">')) + len('</header>')
        html = html[:hdr_end] + _block('toc', toc, ' ' * 16) + html[hdr_end:]

    # CTA after the body, before the post footer (or the end of the container)
    if not post.has_cta and not post.noindex:
        anchor = _body_end_anchor(html)
        html = html[:anchor] + _block('cta', cta_html(post), ' ' * 16) + html[anchor:]

    # Coffee link and related posts after the footer, inside the container
    footer = html.find('</footer>', html.index('<div class="post-content">'))
    art_end = html.index('</article>')
    if footer != -1 and footer < art_end:
        at = footer + len('</footer>')
    else:
        at = _body_end_anchor(html)
    html = html[:at] + _block('post-end', post_end_html(post, posts), ' ' * 16) + html[at:]

    if 'js/article.js' not in html:
        html = re.sub(r'([ \t]*)(<script src="\.\./js/motion\.js" defer></script>)',
                      lambda m: '%s%s\n%s<script src="../js/article.js" defer></script>' % (m.group(1), m.group(2), m.group(1)),
                      html, count=1)
    return html


def _body_end_anchor(html):
    """Index just before the post footer, or before the closing </div> of the article container."""
    start = html.index('<div class="post-content">')
    footer = html.find('<footer class="post-footer">', start)
    if footer != -1:
        return html.rfind('\n', 0, footer)
    art_end = html.index('</article>', start)
    container_close = html.rfind('</div>', start, art_end)
    return html.rfind('\n', 0, container_close)


def main():
    root = Path(__file__).resolve().parents[1]
    posts = collect_posts(root)
    changed = toc = cta = 0
    for p in posts:
        if not p.is_standard:
            continue
        f = root / p.path
        old = f.read_text(encoding='utf-8')
        new = apply(old, p, posts)
        toc += 'auto:toc:start' in new
        cta += 'auto:cta:start' in new
        if new != old:
            with open(f, 'w', encoding='utf-8', newline='\n') as fh:
                fh.write(new)
            changed += 1
    print('posts %d, with toc %d, generated cta %d, updated %d'
          % (sum(p.is_standard for p in posts), toc, cta, changed))
    return 0


if __name__ == '__main__':
    sys.exit(main())
