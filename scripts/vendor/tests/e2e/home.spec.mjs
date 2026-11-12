import { test, expect } from '@playwright/test';

const H1 = 'Pass your Azure and PMP exams with labs that actually work';
const SUBTITLE = 'Free practice tests, step-by-step Azure Virtual Desktop and AZ-104 labs, and compressed study guides, written by a PMP-certified sysadmin with seven Microsoft certifications.';
const GUIDES = [
  ['az-140', 'https://buymeacoffee.com/mattyhip/e/589877', 'AZ-140 Exam Kit', '$8.99'],
  ['az-104', 'https://buymeacoffee.com/mattyhip/e/537655', 'AZ-104 Exam Cram', '$8.99'],
  ['az-900', 'https://buymeacoffee.com/mattyhip/e/538078', 'AZ-900 Exam Cracker', '$8.99'],
  ['pmp', 'https://buymeacoffee.com/mattyhip/e/537680', 'PMP Exam Cracker', '$8.99'],
  ['pmp-charts', 'https://buymeacoffee.com/mattyhip/e/552628', 'PMP Charts & Visuals', '$6.99'],
  ['psm1', 'https://buymeacoffee.com/mattyhip/e/564665', 'PSM I Exam Cracker', '$8.99'],
];

test.describe('homepage', () => {
  test.use({ viewport: { width: 1280, height: 800 } });

  test('hero H1 and subtitle copy unchanged', async ({ page }) => {
    await page.goto('/index.html');
    await expect(page.locator('h1')).toHaveCount(1);
    await expect(page.locator('h1.hero-title')).toHaveText(H1);
    await expect(page.locator('.hero-subtitle')).toHaveText(SUBTITLE);
    await expect(page.locator('.hero .btn-primary')).toHaveAttribute('href', '#practice-tests');
    await expect(page.locator('.hero .btn-secondary')).toHaveAttribute('href', 'store.html');
    await expect(page.locator('.trust-chips li')).toHaveCount(6);
  });

  test('sections appear in spec order', async ({ page }) => {
    await page.goto('/index.html');
    expect(await page.locator('main .section-path').allTextContents()).toEqual(
      ['~/practice-tests', '~/featured', '~/study-guides', '~/latest', '~/topics']);
    await expect(page.locator('main h2', { hasText: 'Why SysOpsBits?' })).toHaveCount(1);
  });

  test('#practice-tests has four cards; featured has three; log has six rows', async ({ page }) => {
    await page.goto('/index.html');
    await expect(page.locator('#practice-tests .post-card')).toHaveCount(4);
    await expect(page.locator('#featured .post-card')).toHaveCount(3);
    await expect(page.locator('#latest .log-row')).toHaveCount(6);
    await expect(page.locator('#latest img')).toHaveCount(0);
    await expect(page.locator('.topic-card')).toHaveCount(4);
  });

  test('six guide cards keep href, data-product, name and price', async ({ page }) => {
    await page.goto('/index.html');
    const cards = await page.locator('a.guide-card').evaluateAll((els) => els.map((a) => [
      a.dataset.product, a.href, a.querySelector('.guide-name').textContent, a.querySelector('.guide-price').textContent,
    ]));
    expect(cards).toEqual(GUIDES);
    await expect(page.locator('a.guide-card[target="_blank"][rel="noopener"]')).toHaveCount(6);
  });

  test('latest log rows are sorted newest first and none link to a noindex page', async ({ page, request }) => {
    await page.goto('/index.html');
    const rows = await page.locator('#latest .log-row').evaluateAll((els) => els.map((li) => ({
      date: li.querySelector('time').getAttribute('datetime'),
      shown: li.querySelector('time').textContent,
      href: li.querySelector('a.log-title').href,
    })));
    const dates = rows.map((r) => r.date);
    expect(dates).toEqual([...dates].sort().reverse());
    for (const row of rows) {
      expect(row.shown).toBe(row.date);
      const body = await (await request.get(row.href)).text();
      expect(body).not.toContain('content="noindex');
      expect(body).toContain(`"datePublished": "${row.date}`);
    }
  });

  test('featured cards link to indexed posts', async ({ page, request }) => {
    await page.goto('/index.html');
    const hrefs = await page.locator('#featured .post-card h3 a').evaluateAll((els) => els.map((a) => a.getAttribute('href')));
    expect(hrefs).toEqual([
      'tutorials/az-140-deploy-host-pool-step-by-step.html',
      'tutorials/azure-nsg-best-practices.html',
      'project-management/pmp-formulas-earned-value-management.html',
    ]);
    for (const href of hrefs) {
      const res = await request.get('/' + href);
      expect(res.status()).toBe(200);
      expect(await res.text()).not.toContain('content="noindex');
    }
  });

  test('hero-scene box has non-zero size and holds the fallback svg', async ({ page }) => {
    await page.goto('/index.html');
    const box = await page.locator('.hero-scene').boundingBox();
    expect(box.width).toBeGreaterThan(200);
    expect(Math.abs(box.width - box.height)).toBeLessThan(1);
    await expect(page.locator('.hero-scene svg.hero-fallback')).toBeVisible();
    await expect(page.locator('.hero-scene')).toHaveAttribute('aria-hidden', 'true');
    await expect(page.locator('.hero canvas#hero-canvas')).toHaveAttribute('aria-hidden', 'true');
  });

  test('the old particle script is gone', async ({ page }) => {
    const requested = [];
    page.on('request', (r) => requested.push(r.url()));
    await page.goto('/index.html');
    expect(requested.filter((u) => u.includes('hero-animation'))).toEqual([]);
    await expect(page.locator('.floating-particles, .tech-grid')).toHaveCount(0);
  });
});

test('with JavaScript disabled every section is visible', async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();
  await page.goto('/index.html');
  const hidden = await page.locator('main .home-section, main .post-card, main .guide-card, main .log-row, main .topic-card, .hero-content')
    .evaluateAll((els) => els.filter((el) => {
      const s = getComputedStyle(el);
      return s.opacity !== '1' || s.visibility !== 'visible' || s.display === 'none' || el.getBoundingClientRect().height === 0;
    }).length);
  expect(hidden).toBe(0);
  await expect(page.locator('.hero-scene svg.hero-fallback')).toBeVisible();
  await context.close();
});

test('no horizontal page scroll on the homepage at 360px', async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 360, height: 740 } });
  const page = await context.newPage();
  await page.goto('/index.html');
  expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(0);
  await expect(page.locator('h1.hero-title')).toBeInViewport();
  await context.close();
});
