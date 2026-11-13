import { test, expect } from '@playwright/test';

const LISTINGS = ['/microsoft.html', '/project-management.html', '/comparisons.html', '/guided-labs.html', '/categories.html', '/store.html'];
const STORE_IDS = { '589877': 'az-140', '537655': 'az-104', '538078': 'az-900', '537680': 'pmp', '552628': 'pmp-charts', '564665': 'psm1' };

test.describe('listing pages', () => {
  test.use({ viewport: { width: 1280, height: 800 } });

  test('post count script still reports the number of cards', async ({ page }) => {
    await page.goto('/microsoft.html');
    const cards = await page.locator('.posts-grid .post-card').count();
    await expect(page.locator('.post-count').first()).toContainText(String(cards));
  });

  test('keyboard focus on a card link shows a focus ring and no tilt', async ({ page }) => {
    await page.goto('/microsoft.html');
    const link = page.locator('.posts-grid .post-card h3 a').first();
    await link.focus();
    const ring = await link.evaluate((el) => getComputedStyle(el).outlineStyle);
    expect(ring).not.toBe('none');
    expect(await page.locator('.post-card.is-tilting').count()).toBe(0);
  });

  test('store: six covers, data-product on every purchase link, tilt on the cover', async ({ page }) => {
    await page.goto('/store.html');
    await expect(page.locator('.book-grid .post-card')).toHaveCount(6);
    const links = await page.locator('.book-grid a[href*="buymeacoffee.com/mattyhip/e/"]').evaluateAll((els) =>
      els.map((a) => [a.href.split('/e/')[1], a.dataset.product]));
    expect(links.length).toBe(18);
    for (const [id, product] of links) expect(product).toBe(STORE_IDS[id]);
  });

  test('store click sends placement "store"', async ({ page }) => {
    await page.goto('/store.html');
    await page.evaluate(() => { window.__events = []; window.gtag = (...args) => window.__events.push(args); });
    await page.locator('.book-grid .read-more').first().evaluate((a) => {
      a.addEventListener('click', (e) => e.preventDefault());
      a.click();
    });
    const events = await page.evaluate(() => window.__events);
    expect(events[0][2].placement).toBe('store');
  });

  test('categories.html and microsoft.html have no inline style blocks or inline-styled promo', async ({ request }) => {
    for (const path of ['/categories.html', '/microsoft.html']) {
      const html = await (await request.get(path)).text();
      expect(html).not.toMatch(/<style[\s>]/);
      expect(html).not.toContain('onmouseover');
    }
  });
});

test.describe('listing pages at 360px', () => {
  test.use({ viewport: { width: 360, height: 740 } });
  for (const path of LISTINGS) {
    test(`no horizontal page scroll: ${path}`, async ({ page }) => {
      await page.goto(path);
      expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(0);
    });
  }
});
