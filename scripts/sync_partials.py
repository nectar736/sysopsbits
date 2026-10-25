"""Copy partials/header.html and partials/footer.html into every page.

The header and footer are inlined (not only fetched by js/partials.js) so search engines
and AI crawlers that don't run JavaScript can still see the site navigation.

Run from the repo root after editing either partial:
    python scripts/sync_partials.py
"""
import glob
import os
import re

SKIP = ('partials/', 'docs/', '.omo/', 'scripts/')


def localize(fragment, prefix):
    def fix(m):
        href = m.group(1)
        if href.startswith(('http', '/', '#', 'mailto:')):
            return m.group(0)
        return 'href="%s%s"' % (prefix, href)
    return re.sub(r'href="([^"]+)"', fix, fragment)


def load(name):
    text = open(os.path.join('partials', name + '.html'), encoding='utf-8').read().strip()
    return re.sub(r'^<!--.*?-->\s*', '', text, flags=re.S)


def block(name, fragment):
    return '<!-- partial:%s:start -->\n%s\n<!-- partial:%s:end -->' % (name, fragment, name)


def main():
    parts = {n: load(n) for n in ('header', 'footer')}
    changed = 0
    for path in glob.glob('**/*.html', recursive=True):
        path = path.replace(os.sep, '/')
        if path.startswith(SKIP):
            continue
        s = open(path, encoding='utf-8').read()
        # 404.html is served at any URL depth, so it uses root-absolute links
        prefix = '/' if path == '404.html' else '../' * path.count('/')
        new = s
        for name, frag in parts.items():
            inlined = block(name, localize(frag, prefix))
            marked = re.compile(r'<!-- partial:%s:start -->.*?<!-- partial:%s:end -->' % (name, name), re.S)
            if marked.search(new):
                new = marked.sub(lambda m: inlined, new, count=1)
            else:
                new = new.replace('<div id="%s-placeholder"></div>' % name,
                                  '<div id="%s-placeholder">%s</div>' % (name, inlined), 1)
        if new != s:
            with open(path, 'w', encoding='utf-8', newline='\n') as fh:
                fh.write(new)
            changed += 1
    print('updated %d pages' % changed)


if __name__ == '__main__':
    main()
