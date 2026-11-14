import sys
import tempfile
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from check_site import PAIRS, STUBS, contrast, parse_tokens, site_pages  # noqa: E402


class ContrastTests(unittest.TestCase):
    def test_contrast_known_pairs(self):
        self.assertAlmostEqual(contrast('#e6e8eb', '#0b0d10'), 15.85, delta=0.02)
        self.assertAlmostEqual(contrast('#9a4a06', '#fafaf7'), 5.98, delta=0.02)

    def test_contrast_is_symmetric(self):
        self.assertEqual(contrast('#000000', '#ffffff'), contrast('#ffffff', '#000000'))
        self.assertAlmostEqual(contrast('#000000', '#ffffff'), 21.0, delta=0.01)


class TokenTests(unittest.TestCase):
    def test_parse_tokens_overlays_light_and_resolves_var(self):
        css = ':root{--a:#000000;--b:var(--a);--c:#111111}.light-mode{--a:#ffffff}'
        t = parse_tokens(css)
        self.assertEqual(t['dark']['--b'], '#000000')
        self.assertEqual(t['light']['--b'], '#ffffff')
        self.assertEqual(t['light']['--c'], '#111111')

    def test_parse_tokens_handles_multiline_blocks_and_comments(self):
        css = ':root {\n  --a: #123456; /* note */\n  --font: \'X\', sans-serif;\n}\n.light-mode {\n  --a: #abcdef;\n}\n'
        t = parse_tokens(css)
        self.assertEqual(t['dark']['--a'], '#123456')
        self.assertEqual(t['light']['--a'], '#abcdef')
        self.assertEqual(t['dark']['--font'], "'X', sans-serif")

    def test_pairs_are_triples_with_minimums(self):
        self.assertTrue(PAIRS)
        for fg, bg, minimum in PAIRS:
            self.assertTrue(fg.startswith('--') and bg.startswith('--'))
            self.assertIn(minimum, (3.0, 4.5))


class PageSetTests(unittest.TestCase):
    def test_site_pages_skips_partials_docs_scripts(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            for rel in ('index.html', 'tutorials/a.html', 'partials/header.html',
                        'docs/x.html', 'scripts/vendor/node_modules/p/y.html', '.omo/z.html'):
                f = root / rel
                f.parent.mkdir(parents=True, exist_ok=True)
                f.write_text('<html></html>', encoding='utf-8')
            found = sorted(p.relative_to(root).as_posix() for p in site_pages(root))
            self.assertEqual(found, ['index.html', 'tutorials/a.html'])

    def test_stubs_are_the_three_refresh_pages(self):
        self.assertEqual(STUBS, {'tools.html', 'tutorials.html', 'comparisons/cmd-vs-powershell-2026.html'})


if __name__ == '__main__':
    unittest.main()


class SimPaletteTest(unittest.TestCase):
    def test_sim_pairs_report_a_failing_pair(self):
        from check_site import check_sim_contrast
        with tempfile.TemporaryDirectory() as d:
            (Path(d) / 'css').mkdir()
            (Path(d) / 'css' / 'sim.css').write_text(
                '.sim-screen {\n  --os-face: #c0c0c0;\n  --os-text: #b0b0b0;\n  --os-desktop: #007070;\n  --os-desktop-text: #ffffff;\n'
                '  --os-title: #000080;\n  --os-title-text: #ffffff;\n  --os-highlight: #000080;\n  --os-highlight-text: #ffffff;\n'
                '  --os-term-bg: #000000;\n  --os-term-text: #c0c0c0;\n}\n', encoding='utf-8')
            failures = check_sim_contrast(d)
        self.assertEqual(len(failures), 1)
        self.assertIn('--os-text on --os-face', failures[0])

    def test_real_sim_css_passes(self):
        from check_site import check_sim_contrast
        self.assertEqual(check_sim_contrast(Path(__file__).resolve().parents[2]), [])
