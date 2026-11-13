import { test, expect } from '@playwright/test';

test.use({ viewport: { width: 1280, height: 800 } });

test('cards below the fold start hidden and reveal when scrolled to', async ({ page }) => {
  await page.goto('/microsoft.html');
  await expect(page.locator('html')).toHaveClass(/motion-ok/);
  const pending = page.locator('.post-card[data-reveal="pending"]');
  expect(await pending.count()).toBeGreaterThan(0);
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  await expect(pending).toHaveCount(0, { timeout: 5000 });
});

test('nothing on screen at load is hidden', async ({ page }) => {
  await page.goto('/microsoft.html');
  const hidden = await page.locator('[data-reveal="pending"]').evaluateAll((els) =>
    els.filter((el) => el.getBoundingClientRect().top < window.innerHeight).length);
  expect(hidden).toBe(0);
});

test('reduced motion: no motion-ok class and nothing pending', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/microsoft.html');
  await expect(page.locator('html')).not.toHaveClass(/motion-ok/);
  await expect(page.locator('[data-reveal="pending"]')).toHaveCount(0);
});

test('print shows every card even when it was never scrolled to', async ({ page }) => {
  await page.goto('/microsoft.html');
  await page.emulateMedia({ media: 'print' });
  await expect.poll(() => page.locator('.post-card').evaluateAll((els) =>
    els.filter((el) => getComputedStyle(el).opacity !== '1').length)).toBe(0);
});

test('card tilts under a fine pointer and settles when the pointer leaves', async ({ page }) => {
  await page.goto('/microsoft.html');
  const card = page.locator('.posts-grid .post-card').first();
  const box = await card.boundingBox();
  await page.mouse.move(box.x + 10, box.y + 10);
  await expect(card).toHaveClass(/is-tilting/);
  expect(await card.evaluate((el) => el.style.getPropertyValue('--rx'))).not.toBe('');
  await page.mouse.move(box.x + box.width / 2, 20);
  await expect(card).not.toHaveClass(/is-tilting/);
  expect(await card.evaluate((el) => el.style.getPropertyValue('--rx'))).toBe('');
});

test('tilt is released when the page scrolls without the pointer moving', async ({ page }) => {
  await page.goto('/microsoft.html');
  const card = page.locator('.posts-grid .post-card').first();
  const box = await card.boundingBox();
  await page.mouse.move(box.x + 10, box.y + 10);
  await expect(card).toHaveClass(/is-tilting/);
  await page.mouse.wheel(0, 900);
  await expect(card).not.toHaveClass(/is-tilting/);
});
