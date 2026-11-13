import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from build_article_extras import (  # noqa: E402
    PRODUCTS, Post, apply, cta_key, heading_ids, related_for, slugify, toc_html,
)


def post(path, category='Microsoft', tags=(), date='2026-01-01', noindex=False, has_cta=False):
    return Post(path=path, title=path.split('/')[-1], date=date, category=category,
                category_href='../microsoft.html', tags=list(tags), noindex=noindex,
                has_cta=has_cta, is_standard=True)


PAGE = '''<html><head><title>T</title></head><body>
    <main id="main-content">
        <article class="post">
            <div class="container">
                <header class="post-header">
                    <h1>T</h1>
                </header>

                <div class="post-content">
                    <h2>One</h2><p>a</p>
                    <h2>Two</h2><p>b</p>
                    <h2>Three</h2><p>c</p>
                </div>
%s
            </div>
        </article>
    </main>
    <script src="../js/motion.js" defer></script>
</body></html>
'''
FOOTER = '''                <footer class="post-footer">
                    <div class="post-tags"><span class="tag">#azure</span></div>
                </footer>'''


class UnitTests(unittest.TestCase):
    def test_slugify(self):
        self.assertEqual(slugify('ODFC: when to split Office data out'), 'odfc-when-to-split-office-data-out')

    def test_heading_ids_dedupe_and_plain_labels(self):
        html = '<div class="post-content"><h2>Setup</h2><h2>Setup</h2><h2>Use <code>az login</code> &amp; go</h2></div>'
        out, items = heading_ids(html)
        self.assertEqual([i for i, _ in items], ['setup', 'setup-2', 'use-az-login-go'])
        self.assertEqual(items[2][1], 'Use az login & go')
        self.assertIn('<h2 id="setup-2">', out)

    def test_heading_ids_keeps_existing_id(self):
        out, items = heading_ids('<h2 id="keep" class="x">Kept</h2><h2>New</h2>')
        self.assertEqual(items, [('keep', 'Kept'), ('new', 'New')])
        self.assertIn('<h2 id="keep" class="x">', out)

    def test_toc_empty_below_three(self):
        self.assertEqual(toc_html([('a', 'A'), ('b', 'B')]), '')
        self.assertIn('href="#c"', toc_html([('a', 'A'), ('b', 'B'), ('c', 'C & D')]))
        self.assertIn('C &amp; D', toc_html([('a', 'A'), ('b', 'B'), ('c', 'C & D')]))

    def test_related_excludes_self_noindex_other_category(self):
        me = post('tutorials/me.html')
        posts = [me, post('tutorials/hidden.html', noindex=True), post('project-management/pm.html', category='Project Management'),
                 post('tutorials/a.html'), post('tutorials/b.html')]
        self.assertEqual([p.path for p in related_for(me, posts)], ['tutorials/a.html', 'tutorials/b.html'])

    def test_related_ranks_shared_tags_then_date(self):
        me = post('tutorials/me.html', tags=['#azure', '#avd'])
        posts = [me, post('tutorials/old-two.html', tags=['#azure', '#avd'], date='2025-01-01'),
                 post('tutorials/new-none.html', date='2026-10-01'), post('tutorials/new-one.html', tags=['#avd'], date='2026-09-01'),
                 post('tutorials/newest-none.html', date='2026-11-01')]
        self.assertEqual([p.path for p in related_for(me, posts)],
                         ['tutorials/old-two.html', 'tutorials/new-one.html', 'tutorials/newest-none.html'])

    def test_cta_key_mapping(self):
        cases = {
            'project-management/psm1-vs-csm.html': 'psm1',
            'project-management/burnup-vs-burndown-charts-pmp.html': 'pmp-charts',
            'project-management/visual-tools-charts-flashcards-pmp.html': 'pmp-charts',
            'project-management/raci-matrix-guide-pmp.html': 'pmp',
            'project-management/pmbok8-six-principles.html': 'pmp',
            'tutorials/az-900-azure-virtual-machines.html': 'az-900',
            'tutorials/az-104-something.html': 'az-104',
            'tutorials/az-140-fslogix.html': 'az-140',
            'comparisons/unifi-vs-pfsense-2026.html': None,
        }
        for path, key in cases.items():
            self.assertEqual(cta_key(post(path)), key, path)
        self.assertEqual(set(PRODUCTS), {'pmp', 'pmp-charts', 'psm1', 'az-900', 'az-104', 'az-140'})


class ApplyTests(unittest.TestCase):
    def setUp(self):
        self.me = post('tutorials/me.html', tags=['#azure'])
        self.posts = [self.me, post('tutorials/a.html', tags=['#azure']), post('tutorials/b.html'), post('tutorials/c.html')]

    def test_apply_adds_toc_cta_post_end_and_script(self):
        out = apply(PAGE % FOOTER, self.me, self.posts)
        self.assertIn('<!-- auto:toc:start -->', out)
        self.assertLess(out.index('auto:toc:start'), out.index('<div class="post-content">'))
        self.assertIn('<h2 id="one">', out)
        self.assertIn('class="store-line"', out)
        self.assertLess(out.index('auto:cta:start'), out.index('<footer class="post-footer">'))
        self.assertGreater(out.index('auto:post-end:start'), out.index('</footer>'))
        self.assertEqual(out.count('class="related-posts"'), 1)
        self.assertIn('<script src="../js/article.js" defer></script>', out)

    def test_apply_skips_cta_when_present_or_noindex(self):
        for p in (post('tutorials/me.html', has_cta=True), post('tutorials/me.html', noindex=True)):
            self.assertNotIn('auto:cta', apply(PAGE % FOOTER, p, self.posts))

    def test_apply_without_post_footer_appends_inside_container(self):
        out = apply(PAGE % '', self.me, self.posts)
        end = out.index('auto:post-end:end')
        self.assertLess(end, out.index('</article>'))
        self.assertGreater(out.index('auto:post-end:start'), out.index('<div class="post-content">'))

    def test_apply_is_idempotent(self):
        once = apply(PAGE % FOOTER, self.me, self.posts)
        self.assertEqual(apply(once, self.me, self.posts), once)

    def test_apply_leaves_head_untouched(self):
        out = apply(PAGE % FOOTER, self.me, self.posts)
        self.assertEqual(out[:out.index('</head>')], (PAGE % FOOTER)[:(PAGE % FOOTER).index('</head>')])


if __name__ == '__main__':
    unittest.main()
