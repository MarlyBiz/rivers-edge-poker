// 412px checks: portrait gate + Install/Share, landscape splash, landing, start a game, act once.
import { chromium } from '/tmp/pw/node_modules/playwright-core/index.mjs';
const B = process.env.BASE || 'http://localhost:4174', out = process.env.OUT || '/tmp/pkshots';
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome' });
const r = {};
// Portrait 412
{
  const p = await (await b.newContext({ viewport: { width: 412, height: 915 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true })).newPage();
  await p.goto(B); await p.waitForTimeout(2500);
  r.portraitButtons = await p.locator('[data-testid=app-actions] button').allTextContents();
  await p.screenshot({ path: `${out}-portrait-412.png` });
  await p.click('[aria-label="Install app"]'); await p.waitForTimeout(400);
  r.installHelp = await p.locator('[aria-label="Install instructions"]').count();
  await p.screenshot({ path: `${out}-install-help-412.png` });
  await p.click('[aria-label="Close"]');
  await p.evaluate(() => { Object.defineProperty(navigator, 'share', { value: undefined, configurable: true }); });
  await p.context().grantPermissions(['clipboard-read', 'clipboard-write'], { origin: new URL(B).origin }).catch(() => {});
  await p.click('[aria-label="Share app"]'); await p.waitForTimeout(400);
  r.shareToast = await p.locator('[data-testid=share-toast]').textContent().catch(() => null);
  await p.screenshot({ path: `${out}-share-412.png` });
  r.manifest = await p.evaluate(async () => { const m = await (await fetch('/manifest.json')).json(); return m.icons.length + ' icons, ' + m.name; });
  r.sw = await p.evaluate(async () => { await new Promise(res => setTimeout(res, 1500)); return !!(await navigator.serviceWorker.getRegistration()); });
}
// Landscape 915x412 (phone turned sideways)
{
  const p = await (await b.newContext({ viewport: { width: 915, height: 412 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true })).newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto(B); await p.waitForTimeout(2500);
  await p.screenshot({ path: `${out}-landscape-splash.png` });
  await p.locator('text=TAP TO PLAY').click(); await p.waitForTimeout(1200);
  if (await p.locator('text=TAP TO PLAY').count()) { await p.locator('text=TAP TO PLAY').click(); await p.waitForTimeout(1200); }
  r.landingButtons = (await p.locator('[data-testid=app-actions] button').allTextContents());
  await p.screenshot({ path: `${out}-landing.png` });
  const start = p.locator('button:visible').filter({ hasText: /start|play|deal|enter|begin/i }).last();
  r.startLabel = (await start.textContent())?.trim();
  await start.click(); await p.waitForTimeout(3500);
  r.actionsDuringHand = await p.locator('[data-testid=app-actions]').count();
  await p.screenshot({ path: `${out}-table.png` });
  for (let i = 0; i < 12; i++) {
    const act = p.locator('button:visible').filter({ hasText: /^\s*(Check|Call|FOLD)\b/ }).first();
    if (await act.count()) { r.acted = (await act.textContent()).trim(); await act.click(); break; }
    await p.waitForTimeout(1000);
  }
  await p.waitForTimeout(3000);
  await p.screenshot({ path: `${out}-after-action.png` });
  r.errors = errs;
}
console.log(JSON.stringify(r, null, 1));
await b.close();
