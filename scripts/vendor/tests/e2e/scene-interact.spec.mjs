import { test, expect } from '@playwright/test';

test.skip(({ browserName }) => browserName !== 'chromium', 'WebGL interaction checks run in Chromium');

async function ready(page) {
  await page.goto('/index.html');
  await expect(page.locator('.hero')).toHaveClass(/scene-ready/, { timeout: 15000 });
  await expect(page.locator('#hero-canvas')).toHaveAttribute('data-interactive', '1');
  return page.locator('.hero-scene').boundingBox();
}

test.describe('desktop', () => {
  test.use({ viewport: { width: 1280, height: 800 } });

  test('hovering the object highlights the nearest node; leaving clears it', async ({ page }) => {
    const box = await ready(page);
    const canvas = page.locator('#hero-canvas');
    // sweep across the object until a node is under the cursor
    let hit = false;
    for (let i = 0; i <= 20 && !hit; i++) {
      await page.mouse.move(box.x + box.width * (0.2 + 0.03 * i), box.y + box.height * 0.5);
      await page.waitForTimeout(40);
      hit = (await canvas.getAttribute('data-hover')) !== '';
    }
    expect(hit).toBe(true);
    await expect(page.locator('.hero-scene')).toHaveCSS('cursor', 'crosshair');
    await page.mouse.move(20, box.y + box.height + 200);
    await expect(canvas).toHaveAttribute('data-hover', '');
  });

  test('clicking the object starts a ping', async ({ page }) => {
    const box = await ready(page);
    const canvas = page.locator('#hero-canvas');
    await expect(canvas).toHaveAttribute('data-pings', '0');
    await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
    await expect(canvas).toHaveAttribute('data-pings', '1');
    await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
    await expect(canvas).toHaveAttribute('data-pings', '2');
  });

  test('dragging spins the object; a drag is not a ping', async ({ page }) => {
    const box = await ready(page);
    const canvas = page.locator('#hero-canvas');
    const cx = box.x + box.width / 2;
    const cy = box.y + box.height / 2;
    await page.mouse.move(cx, cy);
    await page.mouse.down();
    for (let i = 1; i <= 10; i++) await page.mouse.move(cx + i * 15, cy, { steps: 1 });
    await page.mouse.up();
    const drag = Number(await canvas.getAttribute('data-drag-yaw'));
    expect(Math.abs(drag)).toBeGreaterThan(0.5);
    await expect(canvas).toHaveAttribute('data-pings', '0');
  });

  test('hero buttons still work and do not ping', async ({ page }) => {
    await ready(page);
    await page.locator('.hero .btn-primary').click();
    await expect(page).toHaveURL(/#practice-tests$/);
    await expect(page.locator('#hero-canvas')).toHaveAttribute('data-pings', '0');
  });

  test('no page errors while interacting', async ({ page }) => {
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    const box = await ready(page);
    for (let i = 0; i < 5; i++) await page.mouse.click(box.x + box.width * (0.3 + 0.1 * i), box.y + box.height * 0.5);
    await page.mouse.move(box.x + 10, box.y + 10);
    await page.locator('.theme-toggle').click();
    await page.waitForTimeout(800);
    expect(errors).toEqual([]);
  });
});

test.describe('touch', () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });

  test('a tap on the object pings; no hover highlight', async ({ page }) => {
    await page.goto('/index.html');
    await page.touchscreen.tap(380, 120); // first interaction loads the scene
    await expect(page.locator('.hero')).toHaveClass(/scene-ready/, { timeout: 15000 });
    const canvas = page.locator('#hero-canvas');
    await expect(canvas).toHaveAttribute('data-interactive', '1');
    const box = await page.locator('.hero-scene').boundingBox();
    const before = Number(await canvas.getAttribute('data-pings'));
    await page.touchscreen.tap(Math.min(box.x + box.width * 0.8, 385), box.y + box.height * 0.8);
    await expect.poll(async () => Number(await canvas.getAttribute('data-pings'))).toBe(before + 1);
    await expect(canvas).toHaveAttribute('data-hover', '');
  });
});

test('reduced motion: the static drawing ignores clicks and nothing loads', async ({ page }) => {
  const vendor = [];
  page.on('request', (r) => { if (r.url().includes('/js/vendor/')) vendor.push(r.url()); });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('/index.html');
  const box = await page.locator('.hero-scene').boundingBox();
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
  await page.waitForTimeout(2500);
  expect(vendor).toEqual([]);
  await expect(page.locator('.hero-scene')).not.toHaveCSS('cursor', 'crosshair');
});
