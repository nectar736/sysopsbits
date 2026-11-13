import { test, expect } from '@playwright/test';

test.describe('hero scene', () => {
  test.use({ viewport: { width: 1280, height: 800 } });
  test.skip(({ browserName }) => browserName !== 'chromium', 'WebGL scene checks run in Chromium');

  test('desktop: scene becomes ready and hero box does not move', async ({ page }) => {
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.goto('/index.html');
    const before = await page.locator('.hero-scene').boundingBox();
    await expect(page.locator('.hero')).toHaveClass(/scene-ready/, { timeout: 15000 });
    expect(await page.locator('.hero-scene').boundingBox()).toEqual(before);
    await expect(page.locator('html')).toHaveClass(/gsap-ready/);
    expect(errors).toEqual([]);
  });

  test('reduced motion: no vendor request, fallback visible', async ({ page }) => {
    const vendor = [];
    page.on('request', (r) => { if (r.url().includes('/js/vendor/')) vendor.push(r.url()); });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/index.html');
    await page.waitForTimeout(3500);
    expect(vendor).toEqual([]);
    await expect(page.locator('.hero-fallback')).toBeVisible();
  });

  test('vendor request blocked: fallback stays, no page error', async ({ page }) => {
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.route('**/js/vendor/*', (route) => route.abort());
    await page.goto('/index.html');
    await page.waitForTimeout(3500);
    await expect(page.locator('.hero')).not.toHaveClass(/scene-ready/);
    await expect(page.locator('.hero-fallback')).toBeVisible();
    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
    await expect(page.locator('[data-reveal="pending"]')).toHaveCount(0, { timeout: 5000 });
    expect(errors).toEqual([]);
  });

  test('theme toggle recolours the scene', async ({ page }) => {
    await page.goto('/index.html');
    await expect(page.locator('.hero')).toHaveClass(/scene-ready/, { timeout: 15000 });
    const canvas = page.locator('#hero-canvas');
    const before = await canvas.getAttribute('data-theme');
    await page.locator('.theme-toggle').click();
    await expect(canvas).not.toHaveAttribute('data-theme', before);
  });

  test('resize keeps canvas matched to the hero', async ({ page }) => {
    await page.goto('/index.html');
    await expect(page.locator('.hero')).toHaveClass(/scene-ready/, { timeout: 15000 });
    await page.setViewportSize({ width: 1000, height: 700 });
    await expect.poll(async () => {
      const hero = await page.locator('.hero').evaluate((el) => `${el.clientWidth}x${el.clientHeight}`);
      return (await page.locator('#hero-canvas').getAttribute('data-size')) === hero;
    }).toBe(true);
  });

  test('scrolling past the hero pauses rendering, scrolling back resumes', async ({ page }) => {
    await page.goto('/index.html');
    await expect(page.locator('.hero')).toHaveClass(/scene-ready/, { timeout: 15000 });
    const canvas = page.locator('#hero-canvas');
    await expect(canvas).toHaveAttribute('data-running', '1');
    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
    await expect(canvas).toHaveAttribute('data-running', '0');
    await page.evaluate(() => window.scrollTo(0, 0));
    await expect(canvas).toHaveAttribute('data-running', '1');
  });

  test('every card is visible after scrolling to the bottom', async ({ page }) => {
    await page.goto('/index.html');
    await expect(page.locator('html')).toHaveClass(/gsap-ready/, { timeout: 15000 });
    for (let y = 0; y < 8000; y += 500) await page.evaluate((v) => window.scrollTo(0, v), y);
    await expect.poll(() => page.locator('.post-card, .guide-card, .log-row, .topic-card').evaluateAll(
      (els) => els.filter((el) => getComputedStyle(el).opacity !== '1').length), { timeout: 5000 }).toBe(0);
  });

  for (const path of ['/about.html', '/microsoft.html', '/tutorials/az-140-fslogix-profile-containers-guide.html']) {
    test(`non-home page never requests vendor bundles: ${path}`, async ({ page }) => {
      const vendor = [];
      page.on('request', (r) => { if (r.url().includes('/js/vendor/')) vendor.push(r.url()); });
      await page.goto(path);
      await page.waitForTimeout(2500);
      expect(vendor).toEqual([]);
    });
  }
});

test.describe('hero scene on mobile', () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
  test.skip(({ browserName }) => browserName !== 'chromium', 'Chromium only');

  test('no vendor request until first interaction', async ({ page }) => {
    const vendor = [];
    page.on('request', (r) => { if (r.url().includes('/js/vendor/')) vendor.push(r.url()); });
    await page.goto('/index.html');
    await page.waitForTimeout(3000);
    expect(vendor).toEqual([]);
    await page.touchscreen.tap(200, 700);
    await expect.poll(() => vendor.length, { timeout: 10000 }).toBeGreaterThan(0);
  });
});
