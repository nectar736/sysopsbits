import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from restyle_pages import (  # noqa: E402
    FONT_HREF, add_main_id, add_motion_script, drop_syntax_css, head_of, heads_match,
    iso_dates, restyle, strip_badge_styles, swap_fonts, swap_svg_fonts,
)

OLD_FONTS = ('<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Outfit:wght@500;600;700;800'
             '&amp;family=Plus+Jakarta+Sans:wght@400;500;600;700&amp;family=JetBrains+Mono:wght@400;500&amp;display=swap">')

OLD = '''<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Sample - SysOpsBits</title>
    <link rel="canonical" href="https://sysopsbits.com/sample.html">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    %s
    <link rel="stylesheet" href="../css/main.css">
    <link rel="stylesheet" href="../css/syntax.css">
    <link rel="stylesheet" href="../css/shortcodes.css">
    <script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-1" crossorigin="anonymous"></script>
</head>
<body>
    <main>
        <a href="../microsoft.html" class="category" style="background:rgba(6,182,212,0.12);color:#06b6d4;border-color:rgba(6,182,212,0.2)">Microsoft</a>
        <time datetime="2026-10-30">Oct 30, 2026</time>
    </main>
    <script src="../js/main.js" defer></script>
    <script src="../js/partials.js" defer></script>
</body>
</html>
''' % OLD_FONTS

SAMPLE = OLD


class EditTests(unittest.TestCase):
    def test_swap_fonts_replaces_the_stylesheet_href(self):
        out = swap_fonts(OLD)
        self.assertIn('<link rel="stylesheet" href="%s">' % FONT_HREF, out)
        self.assertNotIn('Outfit', out)
        self.assertNotIn('Plus+Jakarta', out)
        self.assertIn('<link rel="preconnect" href="https://fonts.googleapis.com">', out)

    def test_font_href_requests_two_families(self):
        self.assertEqual(
            FONT_HREF,
            'https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600'
            '&amp;family=JetBrains+Mono:wght@400;500&amp;display=swap')

    def test_drop_syntax_css_removes_the_whole_line(self):
        out = drop_syntax_css(OLD)
        self.assertNotIn('syntax.css', out)
        self.assertIn('    <link rel="stylesheet" href="../css/main.css">\n    <link rel="stylesheet" href="../css/shortcodes.css">', out)

    def test_drop_syntax_css_handles_root_and_absolute_paths(self):
        for href in ('css/syntax.css', '/css/syntax.css'):
            self.assertEqual(drop_syntax_css('a\n    <link rel="stylesheet" href="%s">\nb\n' % href), 'a\nb\n')

    def test_strip_badge_styles_only_touches_category(self):
        src = ('<a href="m.html" class="category" style="background:rgba(6,182,212,0.12);color:#06b6d4">Microsoft</a>'
               '<p style="color:red">x</p>')
        out = strip_badge_styles(src)
        self.assertIn('<a href="m.html" class="category">Microsoft</a>', out)
        self.assertIn('<p style="color:red">x</p>', out)

    def test_strip_badge_styles_handles_span(self):
        self.assertEqual(strip_badge_styles('<span class="category" style="color:#f59e0b">Store</span>'),
                         '<span class="category">Store</span>')

    def test_strip_badge_styles_leaves_other_category_classes(self):
        src = '<div class="category-card" style="x:y">a</div>'
        self.assertEqual(strip_badge_styles(src), src)

    def test_iso_dates(self):
        self.assertEqual(iso_dates('<time datetime="2026-10-30">Oct 30, 2026</time>'),
                         '<time datetime="2026-10-30">2026-10-30</time>')

    def test_iso_dates_truncates_datetime_with_time_part(self):
        self.assertEqual(iso_dates('<time datetime="2026-10-30T09:00:00Z">October 30</time>'),
                         '<time datetime="2026-10-30T09:00:00Z">2026-10-30</time>')

    def test_swap_svg_fonts_replaces_retired_families_only(self):
        src = ('<text font-family="Outfit, sans-serif" font-size="12">A</text>'
               '<text font-family="Plus Jakarta Sans, sans-serif">B</text>'
               '<text font-family="JetBrains Mono, monospace">C</text>')
        out = swap_svg_fonts(src)
        self.assertEqual(out.count('font-family="IBM Plex Sans, system-ui, sans-serif"'), 2)
        self.assertIn('font-family="JetBrains Mono, monospace"', out)
        self.assertNotIn('Outfit', out)
        self.assertEqual(swap_svg_fonts(out), out)

    def test_add_main_id_keeps_existing_attrs(self):
        self.assertEqual(add_main_id('<main class="x">'), '<main id="main-content" class="x">')
        self.assertEqual(add_main_id('<main>'), '<main id="main-content">')

    def test_add_main_id_does_not_duplicate(self):
        self.assertEqual(add_main_id('<main id="main-content">'), '<main id="main-content">')

    def test_add_motion_script_prefix(self):
        self.assertIn('<script src="../js/motion.js" defer></script>\n</body>',
                      add_motion_script('<script src="../js/partials.js" defer></script>\n</body>', '../'))

    def test_add_motion_script_keeps_indentation_and_absolute_prefix(self):
        out = add_motion_script('    <script src="/js/partials.js" defer></script>\n</body>', '/')
        self.assertEqual(out, '    <script src="/js/partials.js" defer></script>\n'
                              '    <script src="/js/motion.js" defer></script>\n</body>')

    def test_add_motion_script_only_once(self):
        once = add_motion_script(OLD, '../')
        self.assertEqual(add_motion_script(once, '../'), once)
        self.assertEqual(once.count('js/motion.js'), 1)


class RestyleTests(unittest.TestCase):
    def test_restyle_applies_every_edit(self):
        out = restyle(SAMPLE, '../')
        self.assertIn(FONT_HREF, out)
        self.assertNotIn('syntax.css', out)
        self.assertIn('<a href="../microsoft.html" class="category">Microsoft</a>', out)
        self.assertIn('<time datetime="2026-10-30">2026-10-30</time>', out)
        self.assertIn('<main id="main-content">', out)
        self.assertIn('<script src="../js/motion.js" defer></script>', out)

    def test_restyle_is_idempotent(self):
        once = restyle(SAMPLE, '../')
        self.assertEqual(restyle(once, '../'), once)

    def test_head_of_returns_the_head_element(self):
        head = head_of(OLD)
        self.assertTrue(head.startswith('<head>'))
        self.assertTrue(head.endswith('</head>'))
        self.assertNotIn('<body>', head)

    def test_head_of_accepts_attributes_on_the_head_tag(self):
        self.assertEqual(head_of('<html><head lang="en"><title>t</title></head><body></body></html>'),
                         '<head lang="en"><title>t</title></head>')

    def test_heads_match_ignores_fonts_and_syntax_only(self):
        self.assertTrue(heads_match(OLD, restyle(OLD, '../')))
        self.assertFalse(heads_match(OLD, restyle(OLD, '../').replace('<title>', '<title>x')))

    def test_heads_match_detects_a_removed_adsense_script(self):
        new = restyle(OLD, '../').replace(
            '    <script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-1" crossorigin="anonymous"></script>\n', '')
        self.assertFalse(heads_match(OLD, new))

    def test_heads_match_ignores_line_endings_and_removed_inline_style_blocks(self):
        old = OLD.replace('</head>', '    <style>\n.x { color: #fff; }\n    </style>\n</head>')
        self.assertTrue(heads_match(old.replace('\n', '\r\n'), restyle(OLD, '../')))


if __name__ == '__main__':
    unittest.main()
