import { test, expect } from '@playwright/test';

test.use({ viewport: { width: 1280, height: 800 } });

test('about.html follows the theme: dark card backgrounds come from the tokens', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'dark' });
  await page.goto('/about.html');
  await page.evaluate(() => { localStorage.setItem('theme', 'dark'); document.documentElement.classList.remove('light-mode'); });
  const bg = await page.locator('.about-card:not(.hero-card)').first().evaluate((el) => getComputedStyle(el).backgroundColor);
  expect(bg).toBe('rgb(20, 23, 28)');
  const html = await (await page.request.get('/about.html')).text();
  expect(html).not.toMatch(/<style[\s>]/);
});

test('about.html keeps its text', async ({ page, request }) => {
  await page.goto('/about.html');
  const text = await page.locator('main').innerText();
  for (const s of ["Hi, I'm Matthew Hippensteel", 'About Me', 'Areas of Expertise', 'Our Values']) expect(text).toContain(s);
  await expect(page.locator('.cert-card')).toHaveCount(12);
});

for (const path of ['/tutorials/az-140-practice-test.html', '/tutorials/az-900-practice-test.html', '/tutorials/az-104-practice-test.html', '/project-management/pmp-practice-test.html']) {
  for (const theme of ['dark', 'light']) {
    test(`${path} can be completed in ${theme} mode`, async ({ page }) => {
      const errors = [];
      page.on('pageerror', (e) => errors.push(e.message));
      await page.addInitScript((t) => localStorage.setItem('theme', t), theme);
      await page.goto(path);
      const total = await page.locator('.question-nav-btn').count();
      expect(total).toBeGreaterThan(0);
      for (let i = 0; i < total; i++) {
        await page.locator('.options-list label').first().click();
        const next = page.locator('#next-btn');
        if (i < total - 1 && await next.isVisible()) await next.click();
      }
      const fill = await page.locator('.progress-fill').first().evaluate((el) => {
        const s = getComputedStyle(el); return s.backgroundImage !== 'none' || s.backgroundColor !== 'rgba(0, 0, 0, 0)';
      });
      expect(fill).toBe(true);
      expect(errors).toEqual([]);
    });
  }
}

test('EVM quiz page renders in both themes without errors', async ({ page }) => {
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/project-management/pmp-formulas-earned-value-management.html');
  await page.locator('.theme-toggle').click();
  await page.locator('.theme-toggle').click();
  expect(errors).toEqual([]);
});

test('404.html renders with header and footer and requests no AdSense script', async ({ page }) => {
  const ads = [];
  page.on('request', (r) => { if (r.url().includes('adsbygoogle')) ads.push(r.url()); });
  await page.goto('/404.html');
  await expect(page.locator('.site-header')).toBeVisible();
  await expect(page.locator('.site-footer')).toBeVisible();
  expect(ads).toEqual([]);
});

test('contact.html uses the reading column', async ({ page }) => {
  await page.goto('/contact.html');
  const width = await page.locator('article.post > .container').evaluate((el) => el.getBoundingClientRect().width);
  expect(width).toBeLessThanOrEqual(748.5);
});
