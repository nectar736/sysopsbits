import { test, expect } from '@playwright/test';

const SIM = '/simulation.html';

test.describe('simulation page', () => {
  test.use({ viewport: { width: 1280, height: 800 } });

  for (const path of ['/index.html', '/about.html', '/tutorials/azure-nsg-best-practices.html']) {
    test(`nav has the Simulation link on ${path}`, async ({ page }) => {
      await page.goto(path);
      const link = page.locator('.nav-menu > li > a[data-page="simulation"]');
      await expect(link).toHaveText('Simulation');
      await expect(page.locator('#nav-categories a', { hasText: 'Help Desk Simulator' })).toHaveCount(1);
    });
  }

  test('the Simulation link is marked active on the page', async ({ page }) => {
    await page.goto(SIM);
    await expect(page.locator('.nav-menu > li > a[data-page="simulation"]')).toHaveClass(/active/);
  });

  test('head follows the site conventions', async ({ page }) => {
    await page.goto(SIM);
    await expect(page).toHaveTitle('Free IT Help Desk Simulator: Fix DNS, IP and Network Problems | SysOpsBits');
    await expect(page.locator('script[src*="adsbygoogle.js"]')).toHaveCount(1);
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', 'https://sysopsbits.com/simulation.html');
    await expect(page.locator('script[type="application/ld+json"]')).toHaveCount(1);
    await expect(page.locator('meta[property="og:image"]')).toHaveAttribute('content', 'https://sysopsbits.com/images/simulation-og.jpg');
    await expect(page.locator('h1')).toHaveText('Help Desk Simulator');
    await expect(page.locator('h3[id^="lab-"]')).toHaveCount(6);
  });

  test('the monitor reserves its size before the simulator starts', async ({ page }) => {
    await page.goto(SIM);
    const box = await page.locator('.sim-monitor').boundingBox();
    expect(box.height).toBeGreaterThan(300);
    await expect(page.locator('#sim-power')).toBeVisible();
  });

  for (const width of [941, 1000, 1100, 1280]) {
    test(`desktop nav does not wrap at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 800 });
      await page.goto('/about.html');
      const mids = await page.locator('.nav-menu > li').evaluateAll((els) => els.map((el) => {
        const r = el.getBoundingClientRect();
        return r.top + r.height / 2;
      }));
      expect(Math.max(...mids) - Math.min(...mids)).toBeLessThan(4);
      expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(0);
    });
  }
});

test('with JavaScript disabled the fallback and the lab text show', async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();
  await page.goto(SIM);
  await expect(page.locator('.sim-fallback')).toBeVisible();
  await expect(page.locator('#lab-104')).toBeVisible();
  await context.close();
});

test('no horizontal page scroll on the simulation page at 360px', async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 360, height: 740 } });
  const page = await context.newPage();
  await page.goto(SIM);
  expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(0);
  await context.close();
});
