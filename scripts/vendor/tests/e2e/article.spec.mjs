import { test, expect } from '@playwright/test';

const POSTS = [
  '/tutorials/az-140-fslogix-profile-containers-guide.html',
  '/tutorials/azure-nsg-best-practices.html',
  '/comparisons/best-cheap-vps-hosting-2026.html',
];
const FSLOGIX = POSTS[0];

test.describe('article at 1280px', () => {
  test.use({ viewport: { width: 1280, height: 800 } });

  test('reading column is at most 700px wide', async ({ page }) => {
    await page.goto(FSLOGIX);
    const width = await page.locator('article.post > .container > .post-content').evaluate((el) => el.getBoundingClientRect().width);
    expect(width).toBeLessThanOrEqual(700.5);
    expect(width).toBeGreaterThan(650);
  });

  test('progress goes from 0 to 1 over the page', async ({ page }) => {
    await page.goto(FSLOGIX);
    const scale = () => page.locator('.read-progress').evaluate((el) => new DOMMatrix(getComputedStyle(el).transform).a);
    await expect.poll(scale).toBeLessThan(0.05);
    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
    await expect.poll(scale).toBeGreaterThan(0.95);
  });

  test('TOC is open and sticky in the margin; links land clear of the header', async ({ page }) => {
    await page.goto(FSLOGIX);
    await expect(page.locator('.post-toc details')).toHaveAttribute('open', '');
    const link = page.locator('.post-toc a').nth(2);
    const id = (await link.getAttribute('href')).slice(1);
    await link.click();
    await expect(page).toHaveURL(new RegExp(`#${id}$`));
    await expect.poll(() => page.locator(`#${id}`).evaluate((h) => Math.round(h.getBoundingClientRect().top))).toBeGreaterThanOrEqual(64);
    await expect(link).toHaveAttribute('aria-current', 'true');
    const box = await page.locator('.post-toc').boundingBox();
    const column = await page.locator('article.post > .container > .post-content').boundingBox();
    expect(box.x).toBeGreaterThan(column.x + column.width);
  });

  test('copy button copies the code block text', async ({ page, context, browserName }) => {
    test.skip(browserName !== 'chromium', 'clipboard permission is Chromium-only');
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    await page.goto(FSLOGIX);
    const pre = page.locator('article.post pre').first();
    await pre.hover();
    await pre.locator('.copy-button').click();
    await expect(pre.locator('.copy-button')).toHaveText('Copied');
    const copied = await page.evaluate(() => navigator.clipboard.readText());
    expect(copied.replace(/\r\n/g, '\n')).toBe(await pre.locator('code').textContent());
  });

  test('no element inside .post-content is animated', async ({ page }) => {
    await page.goto(FSLOGIX);
    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
    await expect(page.locator('article.post [data-reveal]')).toHaveCount(0);
  });

  test('related block has three links; none point to noindex pages', async ({ page, request }) => {
    await page.goto(FSLOGIX);
    const hrefs = await page.locator('.related-posts li > a').evaluateAll((els) => els.map((a) => a.href));
    expect(hrefs.length).toBe(3);
    for (const href of hrefs) expect(await (await request.get(href)).text()).not.toContain('content="noindex');
  });

  test('contact.html has no reading progress and no TOC', async ({ page }) => {
    await page.goto('/contact.html');
    await expect(page.locator('.read-progress')).toHaveCount(0);
    await expect(page.locator('.post-toc')).toHaveCount(0);
  });
});

test.describe('article at 768px', () => {
  test.use({ viewport: { width: 768, height: 900 } });
  test('TOC is collapsed under the header', async ({ page }) => {
    await page.goto(FSLOGIX);
    await expect(page.locator('.post-toc details')).not.toHaveAttribute('open', '');
    await expect(page.locator('.post-toc summary')).toBeVisible();
  });
});

test.describe('article at 360px', () => {
  test.use({ viewport: { width: 360, height: 740 } });
  for (const path of POSTS) {
    test(`no horizontal page scroll: ${path}`, async ({ page }) => {
      await page.goto(path);
      expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(0);
    });
  }
});

test('with JavaScript disabled TOC links and related links work', async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();
  await page.goto(FSLOGIX);
  await page.locator('.post-toc summary').click();
  const href = await page.locator('.post-toc a').first().getAttribute('href');
  await expect(page.locator(href)).toHaveCount(1);
  await expect(page.locator('.related-posts li > a')).toHaveCount(3);
  await context.close();
});

// Every standard post keeps the reading column: main > article.post > .container (see AGENTS.md).
const PM_POSTS = [
  'agile-vs-predictive-vs-hybrid-pmp', 'avoid-stakeholder-matrix-traps-pmp', 'burnup-vs-burndown-charts-pmp', 'cpm-vs-pert-pmp',
  'pmbok8-six-principles', 'pmbok8-vs-7-what-changed', 'pmp-formulas-earned-value-management', 'psm1-exam-guide',
  'psm1-vs-csm', 'raci-matrix-guide-pmp', 'visual-tools-charts-flashcards-pmp',
];
for (const slug of PM_POSTS) {
  test(`project management post keeps side margins: ${slug}`, async ({ page }) => {
    for (const width of [390, 1280]) {
      await page.setViewportSize({ width, height: 800 });
      await page.goto(`/project-management/${slug}.html`);
      await expect(page.locator('main > article.post > .container > header.post-header')).toHaveCount(1);
      const box = await page.locator('article.post .post-content p').first().boundingBox();
      expect(box.x, `left gutter at ${width}px`).toBeGreaterThanOrEqual(16);
      expect(box.x + box.width, `right gutter at ${width}px`).toBeLessThanOrEqual(width - 16);
      if (width === 1280) expect(box.width).toBeLessThanOrEqual(700);
    }
  });
}
