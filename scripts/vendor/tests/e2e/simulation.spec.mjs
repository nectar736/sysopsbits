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

// ---------- the simulator itself ----------

async function powerOn(page) {
  await page.locator('#sim-power').click();
  await expect(page.locator('.sim-screen')).toHaveAttribute('data-state', 'desktop');
}
const win = (page, kind) => page.locator(`.os-window[data-kind="${kind}"]`);
async function openIpv4(page) {
  await page.locator('.os-icon[data-app="net"]').dblclick();
  await page.locator('.os-window[data-app="net"] [data-action="properties"]').click();
  await page.locator('.os-window[data-kind="adapter"] [data-action="ipv4"]').click();
  await expect(win(page, 'ipv4')).toBeVisible();
}
async function runCmd(page, line) {
  if (!(await page.locator('#os-cmd-input').count())) await page.locator('.os-icon[data-app="cmd"]').dblclick();
  const input = page.locator('#os-cmd-input');
  await expect(input).toBeEnabled();
  await input.fill(line);
  await input.press('Enter');
}

test.describe('simulator', () => {
  test.use({ viewport: { width: 1280, height: 800 }, reducedMotion: 'reduce' });

  test('power on shows the desktop at once under reduced motion', async ({ page }) => {
    await page.goto(SIM);
    await expect(page.locator('.sim-fallback')).toBeHidden();
    const t0 = Date.now();
    await page.locator('#sim-power').click();
    await expect(page.locator('.sim-screen')).toHaveAttribute('data-state', 'desktop', { timeout: 1000 });
    expect(Date.now() - t0).toBeLessThan(1000);
    await expect(page.locator('#sim-power')).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('.os-ticket')).toHaveCount(6);
    await expect(page.locator('.os-taskbar .os-clock')).toHaveText(/\d{1,2}:\d{2} (AM|PM)/);
    await expect(page.locator('.os-progress')).toHaveText('0 of 6 closed');
  });

  test('lab 104: a wrong close stays open, the real fix closes it, and progress survives a reload', async ({ page }) => {
    await page.goto(SIM);
    await powerOn(page);
    await page.locator('.os-ticket[data-lab="104"]').click();
    await expect(page.locator('.os-ticket[data-lab="104"]')).toHaveAttribute('aria-current', 'true');
    await runCmd(page, 'ping intranet');
    await expect(page.locator('.os-cmd-output')).toContainText('Ping request could not find host intranet.');
    await page.locator('[data-action="close-ticket"]').click();
    await expect(win(page, 'still-broken')).toBeVisible();
    await win(page, 'still-broken').locator('[data-action="ok"]').click();
    await expect(win(page, 'still-broken')).toHaveCount(0);
    await openIpv4(page);
    await expect(win(page, 'ipv4').locator('input[name="dns1"]')).toHaveValue('10.0.0.53');
    await win(page, 'ipv4').locator('input[name="dns1"]').fill('10.0.0.10');
    await win(page, 'ipv4').locator('[data-action="ok"]').click();
    await expect(win(page, 'ipv4')).toHaveCount(0);
    await page.locator('[data-action="close-ticket"]').click();
    await expect(win(page, 'debrief')).toBeVisible();
    await expect(win(page, 'debrief')).toContainText('10.0.0.53');
    await expect(page.locator('.os-progress')).toHaveText('1 of 6 closed');
    await page.reload();
    await powerOn(page);
    await expect(page.locator('.os-progress')).toHaveText('1 of 6 closed');
    await expect(page.locator('.os-ticket[data-lab="104"]')).toContainText('Closed');
  });

  test('a bad address shows an error, keeps the dialog open, and returns focus to it', async ({ page }) => {
    await page.goto(SIM);
    await powerOn(page);
    await page.locator('.os-ticket[data-lab="104"]').click();
    await openIpv4(page);
    await win(page, 'ipv4').locator('input[name="ip"]').fill('192.168.1.256');
    await win(page, 'ipv4').locator('[data-action="ok"]').click();
    await expect(win(page, 'error')).toContainText('Enter a valid IP address.');
    await expect(win(page, 'ipv4')).toBeVisible();
    await win(page, 'error').locator('[data-action="ok"]').click();
    await expect(win(page, 'error')).toHaveCount(0);
    expect(await page.evaluate(() => !!document.activeElement.closest('.os-window[data-kind="ipv4"]'))).toBe(true);
  });

  test('switching tickets keeps each machine until Reset', async ({ page }) => {
    await page.goto(SIM);
    await powerOn(page);
    await page.locator('.os-ticket[data-lab="104"]').click();
    await openIpv4(page);
    await win(page, 'ipv4').locator('input[name="dns1"]').fill('10.0.0.10');
    await win(page, 'ipv4').locator('[data-action="ok"]').click();
    await page.locator('.os-ticket[data-lab="101"]').click();
    await page.locator('.os-ticket[data-lab="104"]').click();
    await openIpv4(page);
    await expect(win(page, 'ipv4').locator('input[name="dns1"]')).toHaveValue('10.0.0.10');
    await win(page, 'ipv4').locator('[data-action="cancel"]').click();
    await page.locator('[data-action="reset"]').click();
    await openIpv4(page);
    await expect(win(page, 'ipv4').locator('input[name="dns1"]')).toHaveValue('10.0.0.53');
  });

  test('the ticket text is readable and has no stray placeholders', async ({ page }) => {
    await page.goto(SIM);
    await powerOn(page);
    const detail = page.locator('.os-ticket-detail');
    await expect(detail).not.toContainText('null');
    await expect(detail.locator('.os-ticket-msg')).toContainText('PRN01');
    const colours = await detail.locator('.os-ticket-msg').evaluate((el) => [getComputedStyle(el).color, getComputedStyle(el).backgroundColor]);
    expect(colours[0]).not.toBe(colours[1]);
    expect(colours[0]).toBe('rgb(0, 0, 0)');
  });

  test('hints reveal one at a time, up to three', async ({ page }) => {
    await page.goto(SIM);
    await powerOn(page);
    const hint = page.locator('[data-action="hint"]');
    for (let i = 1; i <= 3; i++) {
      await hint.click();
      await expect(page.locator('.os-hints li')).toHaveCount(i);
    }
    await expect(hint).toBeDisabled();
  });

  test('blocked storage still works in memory', async ({ page }) => {
    await page.addInitScript(() => {
      Storage.prototype.getItem = () => { throw new Error('blocked'); };
      Storage.prototype.setItem = () => { throw new Error('blocked'); };
    });
    await page.goto(SIM);
    await powerOn(page);
    await expect(page.locator('.os-progress')).toHaveText('0 of 6 closed');
    await page.locator('.os-ticket[data-lab="102"]').click();
    await runCmd(page, 'net use S: \\\\FS01\\Shared');
    await expect(page.locator('.os-cmd-output')).toContainText('The command completed successfully.');
    await page.locator('[data-action="close-ticket"]').click();
    await expect(page.locator('.os-progress')).toHaveText('1 of 6 closed');
  });

  test('corrupt saved progress counts as none', async ({ page }) => {
    await page.addInitScript(() => { try { localStorage.setItem('sob-sim-progress', '{not json'); } catch (e) { /* ignore */ } });
    await page.goto(SIM);
    await powerOn(page);
    await expect(page.locator('.os-progress')).toHaveText('0 of 6 closed');
  });

  test('keyboard only: power, open Command Prompt, Escape out of a modal and out of full screen', async ({ page }) => {
    await page.goto(SIM);
    await page.locator('#sim-power').focus();
    await page.keyboard.press('Enter');
    await expect(page.locator('.sim-screen')).toHaveAttribute('data-state', 'desktop');
    await page.locator('.os-icon[data-app="cmd"]').focus();
    await page.keyboard.press('Enter');
    await expect(page.locator('#os-cmd-input')).toBeFocused();
    await page.locator('.os-ticket[data-lab="104"]').click();
    await openIpv4(page);
    await expect(win(page, 'ipv4').locator('input[name="ipAuto"][value="no"]')).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(win(page, 'ipv4')).toHaveCount(0);
    await expect(page.locator('.os-window[data-kind="adapter"] [data-action="ipv4"]')).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(page.locator('.os-window[data-kind="adapter"]')).toHaveCount(0);
    await page.locator('#sim-fullscreen').click();
    await expect(page.locator('html')).toHaveClass(/sim-fullscreen/);
    await page.keyboard.press('Escape');
    await expect(page.locator('html')).not.toHaveClass(/sim-fullscreen/);
  });

  test('lab 106 through Notepad: delete the hosts line and save', async ({ page }) => {
    await page.goto(SIM);
    await powerOn(page);
    await page.locator('.os-ticket[data-lab="106"]').click();
    await page.locator('.os-icon[data-app="notepad"]').dblclick();
    await page.locator('.os-window[data-app="notepad"] [data-action="open"]').click();
    await page.locator('.os-window[data-kind="open"] [data-file="hosts"]').click();
    const text = page.locator('.os-window[data-app="notepad"] textarea');
    await expect(text).toHaveValue(/10\.0\.0\.99/);
    await text.fill('# cleaned\n');
    await page.locator('.os-window[data-app="notepad"] [data-action="save"]').click();
    await expect(win(page, 'info')).toContainText('administrator');
    await win(page, 'info').locator('[data-action="ok"]').click();
    await page.locator('[data-action="close-ticket"]').click();
    await expect(win(page, 'debrief')).toBeVisible();
  });

  test('lab 102 through My Computer: map S: with the dialog', async ({ page }) => {
    await page.goto(SIM);
    await powerOn(page);
    await page.locator('.os-ticket[data-lab="102"]').click();
    await page.locator('.os-icon[data-app="computer"]').dblclick();
    await page.locator('.os-window[data-app="computer"] [data-action="map"]').click();
    await win(page, 'map').locator('select[name="letter"]').selectOption('S');
    await win(page, 'map').locator('input[name="folder"]').fill('\\\\FS01\\Shared');
    await win(page, 'map').locator('[data-action="ok"]').click();
    await expect(page.locator('.os-window[data-app="computer"]')).toContainText('(S:)');
    await page.locator('[data-action="close-ticket"]').click();
    await expect(win(page, 'debrief')).toBeVisible();
  });
});

test.describe('simulator on a phone', () => {
  test.use({ viewport: { width: 360, height: 740 }, reducedMotion: 'reduce' });

  test('windows open maximized and the ticket drawer toggles', async ({ page }) => {
    await page.goto(SIM);
    await powerOn(page);
    const drawer = page.locator('.os-panel');
    await expect(drawer).toBeHidden();
    await page.locator('.os-task[data-app="tickets"]').click();
    await expect(drawer).toBeVisible();
    await page.locator('.os-task[data-app="tickets"]').click();
    await expect(drawer).toBeHidden();
    await page.locator('.os-icon[data-app="cmd"]').dblclick();
    const screen = await page.locator('.sim-screen').boundingBox();
    const w = await page.locator('.os-window[data-app="cmd"]').boundingBox();
    expect(Math.abs(w.width - screen.width)).toBeLessThan(2);
    expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(0);
  });
});

test('the boot screen plays with motion allowed and any key skips it', async ({ page }) => {
  await page.goto(SIM);
  await page.locator('#sim-power').click();
  await expect(page.locator('.sim-screen')).toHaveAttribute('data-state', 'boot');
  await page.keyboard.press('Space');
  await expect(page.locator('.sim-screen')).toHaveAttribute('data-state', 'desktop');
});
