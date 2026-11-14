// Writes images/simulation-og.jpg (1200x630) from the live simulator.
// Run with the dev server up: node serve.mjs 8123, then node make_sim_og.mjs
import { chromium } from '@playwright/test';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1200, height: 630 }, reducedMotion: 'reduce', colorScheme: 'dark' });
await page.addInitScript(() => { try { localStorage.setItem('theme', 'dark'); } catch (e) { /* ignore */ } });
await page.goto('http://localhost:8123/simulation.html');
await page.locator('#sim-power').click();
await page.locator('.os-ticket[data-lab="104"]').click();
await page.locator('.os-icon[data-app="cmd"]').dblclick();
for (const line of ['ping intranet', 'nslookup intranet']) {
    await page.locator('#os-cmd-input').fill(line);
    await page.locator('#os-cmd-input').press('Enter');
}
// Frame just the monitor, centred on the page background.
await page.evaluate(() => {
    document.documentElement.classList.add('sim-fullscreen');
    document.querySelector('.sim-controls').style.visibility = 'hidden';
});
await page.screenshot({ path: path.join(ROOT, 'images/simulation-og.jpg'), type: 'jpeg', quality: 80 });
await browser.close();
