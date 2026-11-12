import { test, expect } from '@playwright/test';

const POST = '/tutorials/az-140-fslogix-profile-containers-guide.html';

test.describe('desktop navigation', () => {
  test.use({ viewport: { width: 1280, height: 800 } });

  test('skip link is first focusable and targets main', async ({ page, browserName }) => {
    test.skip(browserName === 'webkit', 'WebKit does not Tab to links without an OS setting');
    await page.goto('/about.html');
    await page.keyboard.press('Tab');
    const href = await page.evaluate(() => document.activeElement.getAttribute('href'));
    expect(href).toBe('#main-content');
    await expect(page.locator('main#main-content')).toHaveCount(1);
    await expect(page.locator('.skip-link')).toBeInViewport();
  });

  test('skip link is the first link in the document', async ({ page }) => {
    await page.goto('/about.html');
    const first = await page.evaluate(() => document.querySelector('a[href], button').className);
    expect(first).toBe('skip-link');
  });

  test('dropdown opens with Enter and closes with Escape', async ({ page }) => {
    await page.goto('/about.html');
    const toggle = page.locator('.dropdown-toggle');
    await expect(toggle).toHaveAttribute('aria-expanded', 'false');
    await toggle.focus();
    await page.keyboard.press('Enter');
    await expect(toggle).toHaveAttribute('aria-expanded', 'true');
    await expect(page.locator('#nav-categories')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(toggle).toHaveAttribute('aria-expanded', 'false');
    await expect(toggle).toBeFocused();
  });

  test('theme toggle fires themechange and sets aria-pressed', async ({ page }) => {
    await page.goto('/about.html');
    await page.evaluate(() => {
      window.__themes = [];
      document.addEventListener('themechange', (e) => window.__themes.push(e.detail.light));
    });
    const toggle = page.locator('.theme-toggle');
    const before = await page.evaluate(() => document.documentElement.classList.contains('light-mode'));
    await expect(toggle).toHaveAttribute('aria-pressed', String(before));
    await toggle.click();
    await expect(toggle).toHaveAttribute('aria-pressed', String(!before));
    expect(await page.evaluate(() => window.__themes)).toEqual([!before]);
    await toggle.click();
    expect(await page.evaluate(() => window.__themes)).toEqual([!before, before]);
  });

  test('in-page anchor updates the URL hash', async ({ page }) => {
    await page.goto('/index.html');
    await page.locator('.hero a[href="#practice-tests"]').click();
    await expect(page).toHaveURL(/#practice-tests$/);
  });

  for (const path of ['/index.html', '/about.html', '/microsoft.html', POST, '/404.html']) {
    test(`header does not cover the top of main on ${path}`, async ({ page }) => {
      await page.goto(path);
      const gap = await page.evaluate(() => {
        const header = document.querySelector('.site-header').getBoundingClientRect();
        const main = document.querySelector('main');
        const first = main.firstElementChild.getBoundingClientRect();
        return { headerBottom: header.bottom, headerHeight: header.height, contentTop: first.top };
      });
      expect(gap.headerHeight).toBe(64);
      expect(gap.contentTop).toBeGreaterThanOrEqual(gap.headerBottom - 0.5);
    });
  }

  test('header has no tagline and the brand keeps its name', async ({ page }) => {
    await page.goto('/about.html');
    await expect(page.locator('.site-tagline')).toHaveCount(0);
    await expect(page.locator('.site-title')).toHaveText('SysOpsBits_');
  });

  test('copy button has a label, no inline style, and code pages still load', async ({ page }) => {
    await page.goto(POST);
    const button = page.locator('pre .copy-button').first();
    await expect(button).toHaveAttribute('aria-label', 'Copy code');
    expect(await button.getAttribute('style')).toBeNull();
  });
});

test.describe('mobile navigation', () => {
  test.use({ viewport: { width: 360, height: 740 } });

  test('menu toggle sets aria-expanded and Escape closes', async ({ page }) => {
    await page.goto('/about.html');
    const toggle = page.locator('.nav-toggle');
    const menu = page.locator('#nav-menu');
    await expect(toggle).toHaveAttribute('aria-controls', 'nav-menu');
    await expect(toggle).toHaveAttribute('aria-expanded', 'false');
    await expect(menu).toBeHidden();
    await toggle.click();
    await expect(toggle).toHaveAttribute('aria-expanded', 'true');
    await expect(menu).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(toggle).toHaveAttribute('aria-expanded', 'false');
    await expect(menu).toBeHidden();
    await expect(toggle).toBeFocused();
  });

  test('back/forward cache return shows content and a closed menu', async ({ page }) => {
    await page.goto('/microsoft.html');
    await page.locator('.nav-toggle').click();
    await page.locator('#nav-menu a[href="about.html"]').click();
    await expect(page).toHaveURL(/about\.html$/);
    await page.goBack();
    await expect(page).toHaveURL(/microsoft\.html$/);
    await expect(page.locator('.nav-toggle')).toHaveAttribute('aria-expanded', 'false');
    await expect(page.locator('#nav-menu')).toBeHidden();
    const hiddenInView = await page.evaluate(() => Array.from(document.querySelectorAll('[data-reveal="pending"]'))
      .filter((el) => el.getBoundingClientRect().top < window.innerHeight).length);
    expect(hiddenInView).toBe(0);
  });

  test('no horizontal page scroll with the menu open', async ({ page }) => {
    await page.goto('/about.html');
    await page.locator('.nav-toggle').click();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow).toBeLessThanOrEqual(0);
  });
});
