// Saloon layout test: 7 viewports, in a live hand with 5 opponents (densest table).
// Asserts: no overlaps between table elements, nothing off-screen, min font 12px,
// action buttons >= 108x56, icon buttons >= 40x40. Optional --play plays a full hand
// in portrait 390x844 and landscape 844x390 and saves screenshots.
// usage: node test/layout-e2e.mjs <url> [--play] [--shots <prefix>]
import { chromium } from '/tmp/pw/node_modules/playwright-core/index.mjs';
const args = process.argv.slice(2);
const URL_ = args.find(a => a.startsWith('http')) || 'http://localhost:4174';
const PLAY = args.includes('--play');
const SHOTS = args.includes('--shots') ? args[args.indexOf('--shots') + 1] : null;
const VIEWPORTS = [
  [360, 780, true], [390, 844, true], [430, 932, true],
  [667, 375, true], [844, 390, true], [932, 430, true], [1280, 800, false],
];
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome' });
let failures = 0;

async function startHand(w, h, mobile, opponents = 5) {
  const ctx = await b.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: mobile ? 3 : 1, isMobile: mobile, hasTouch: mobile,
    userAgent: mobile ? 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1' : undefined });
  const p = await ctx.newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto(URL_, { waitUntil: 'networkidle' });
  await p.waitForTimeout(800);
  for (let i = 0; i < 2 && await p.locator('text=TAP TO PLAY').count(); i++) {
    await p.locator('button:has-text("TAP TO PLAY")').click(); await p.waitForTimeout(900);
  }
  await p.evaluate((n) => {
    const lab = [...document.querySelectorAll('label')].find(l => /Table Size/.test(l.textContent || ''));
    const grid = lab?.parentElement?.querySelector('div.grid');
    grid?.querySelectorAll('button')[n - 1]?.click(); // buttons are table sizes 2..6 → index = opponents - 1
  }, opponents);
  await p.waitForTimeout(200);
  await p.locator('button:visible').filter({ hasText: /Start Game|Enter High Stakes Room/ }).last().click();
  await p.waitForSelector('[data-testid=saloon-root]', { timeout: 10000 });
  return { p, ctx, errs };
}

async function waitTurn(p, ms = 40000) {
  await p.waitForSelector('[data-testid=action-fold]:not([disabled]), [data-testid=action-next], [data-testid=action-skip]', { timeout: ms });
  // dismiss the first-hand guide if it is up (it is a separate tips overlay)
  await p.evaluate(() => [...document.querySelectorAll('button')].find(b => b.closest('.fixed') && b.parentElement?.textContent?.includes('Interactive Game Guide'))?.click());
  await p.waitForTimeout(400);
}

const measure = (p) => p.evaluate(() => {
  const vw = innerWidth, vh = innerHeight;
  const r = el => { const b = el.getBoundingClientRect(); return { x: Math.round(b.x), y: Math.round(b.y), w: Math.round(b.width), h: Math.round(b.height) }; };
  const items = [];
  const add = (name, el) => el && items.push({ name, rect: r(el) });
  document.querySelectorAll('[data-testid=seat]').forEach(s => add(`seat ${s.dataset.name}`, s));
  ['pot', 'board', 'ticker', 'hero-plate', 'hero-stack', 'action-panel', 'topbar'].forEach(id => document.querySelectorAll(`[data-testid=${id}]`).forEach(e => add(id, e)));
  const offscreen = items.filter(i => i.rect.x < 0 || i.rect.y < 0 || i.rect.x + i.rect.w > vw + 0.5 || i.rect.y + i.rect.h > vh + 0.5)
    .map(i => ({ ...i, left: Math.max(0, -i.rect.x), top: Math.max(0, -i.rect.y), right: Math.max(0, i.rect.x + i.rect.w - vw), bottom: Math.max(0, i.rect.y + i.rect.h - vh) }));
  const overlaps = [];
  for (let i = 0; i < items.length; i++) for (let j = i + 1; j < items.length; j++) {
    const a = items[i].rect, c = items[j].rect;
    const ox = Math.min(a.x + a.w, c.x + c.w) - Math.max(a.x, c.x), oy = Math.min(a.y + a.h, c.y + c.h) - Math.max(a.y, c.y);
    if (ox > 0 && oy > 0) overlaps.push(`${items[i].name} × ${items[j].name} ${ox}x${oy}`);
  }
  // fonts: every visible text node inside the saloon root
  const root = document.querySelector('[data-testid=saloon-root]');
  const small = new Set();
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  while (walker.nextNode()) {
    const n = walker.currentNode; if (!n.textContent.trim()) continue;
    const el = n.parentElement; if (el.closest('[data-card=back]')) continue;
    const b = el.getBoundingClientRect(); if (!b.width || !b.height) continue;
    const fs = parseFloat(getComputedStyle(el).fontSize);
    if (fs < 12) small.add(`${n.textContent.trim().slice(0, 20)}=${fs}px`);
  }
  const tiny = [];
  root.querySelectorAll('button').forEach(bt => {
    const b = bt.getBoundingClientRect(); if (!b.width) return;
    const id = bt.dataset.testid || '';
    if (/^action-(fold|call|raise)$/.test(id) && (b.width < 108 || b.height < 56)) tiny.push(`${id} ${Math.round(b.width)}x${Math.round(b.height)}`);
    if (/^btn-/.test(id) && (b.width < 40 || b.height < 40)) tiny.push(`${id} ${Math.round(b.width)}x${Math.round(b.height)}`);
  });
  const card = sel => { const e = document.querySelector(sel); if (!e) return null; const b = e.getBoundingClientRect(); const rk = e.querySelector('[data-part=rank]'); const su = e.querySelector('[data-part=suit]');
    return `${Math.round(b.width)}x${Math.round(b.height)}${rk ? ` rank ${getComputedStyle(rk).fontSize} suit ${getComputedStyle(su).fontSize}` : ''}`; };
  return {
    items, offscreen, overlaps, smallFonts: [...small], tiny,
    sizes: {
      hero: card('[data-testid=hero-stack] [data-card]'),
      board: card('[data-testid=board] [data-card]') || card('[data-testid=board-slot]'),
      opp: card('[data-testid=seat] [data-card]'),
      seatName: getComputedStyle(document.querySelector('[data-testid=seat-name]')).fontSize,
      pot: getComputedStyle(document.querySelector('[data-testid=pot-amount]')).fontSize,
      buttons: [...document.querySelectorAll('[data-testid^=action-]')].map(e => `${e.dataset.testid} ${Math.round(e.getBoundingClientRect().width)}x${Math.round(e.getBoundingClientRect().height)} ${getComputedStyle(e).fontSize}`),
    },
  };
});

for (const [w, h, mobile] of VIEWPORTS) {
  const { p, ctx, errs } = await startHand(w, h, mobile);
  await waitTurn(p);
  const m = await measure(p);
  const bad = m.offscreen.length + m.overlaps.length + m.smallFonts.length + m.tiny.length + errs.length;
  failures += bad ? 1 : 0;
  console.log(`${bad ? 'FAIL' : 'PASS'} ${w}x${h}  seats=${m.items.filter(i => i.name.startsWith('seat')).length}  hero=${m.sizes.hero} board=${m.sizes.board} opp=${m.sizes.opp} name=${m.sizes.seatName} pot=${m.sizes.pot}`);
  console.log(`     ${m.sizes.buttons.join(' | ')}`);
  if (bad) console.log(JSON.stringify({ offscreen: m.offscreen, overlaps: m.overlaps, smallFonts: m.smallFonts, tiny: m.tiny, errs }, null, 1));
  if (SHOTS) await p.screenshot({ path: `${SHOTS}-${w}x${h}.png` });
  await ctx.close();
}

async function playHand(w, h, tag) {
  const { p, ctx, errs } = await startHand(w, h, true, 3);
  const log = [];
  let shotRaise = false, shotFan = false, shotInHand = false;
  for (let turn = 0; turn < 12; turn++) {
    await waitTurn(p, 60000);
    if (await p.locator('[data-testid=action-next], [data-testid=action-skip]').count()) break;
    if (await p.locator('text=Next hand starting').count()) break;
    if (!shotInHand && SHOTS) { await p.screenshot({ path: `${SHOTS}-${tag}-inhand.png` }); shotInHand = true; }
    if (!shotFan) {
      await p.click('[data-testid=hero-stack]'); await p.waitForTimeout(500);
      const fan = await p.evaluate(() => [...document.querySelectorAll('[data-testid=fan-card] [data-card]')].map(e => { const b = e.getBoundingClientRect(); return `${Math.round(b.width)}x${Math.round(b.height)}`; }));
      log.push(`fan open: ${fan.join(', ')}`);
      if (SHOTS) await p.screenshot({ path: `${SHOTS}-${tag}-fan.png` });
      await p.keyboard.press('Escape'); await p.waitForTimeout(300);
      log.push(`fan closed by Esc: ${(await p.locator('[data-testid=hero-fan]').count()) === 0}`);
      await p.click('[data-testid=hero-stack]'); await p.waitForTimeout(400);
      await p.mouse.click(10, h / 2); await p.waitForTimeout(400);
      log.push(`fan closed by tap: ${(await p.locator('[data-testid=hero-fan]').count()) === 0}`);
      shotFan = true;
    }
    if (!shotRaise) {
      await p.click('[data-testid=action-raise]'); await p.waitForTimeout(400);
      await p.click('[data-testid="preset-Pot"]'); await p.waitForTimeout(200);
      log.push(`raise sheet: ${await p.locator('[data-testid=raise-amount]').textContent()}`);
      if (SHOTS) await p.screenshot({ path: `${SHOTS}-${tag}-raise.png` });
      await p.click('[aria-label="Close raise"]'); await p.waitForTimeout(300);
      shotRaise = true;
    }
    const label = (await p.locator('[data-testid=action-call]').textContent()).trim();
    await p.click('[data-testid=action-call]');
    log.push(`turn ${turn + 1}: ${label}`);
    await p.waitForTimeout(600);
  }
  await p.waitForSelector('[data-testid=pot-winner], [data-testid=action-next]', { timeout: 60000 }).catch(() => {});
  const result = await p.evaluate(() => document.querySelector('[data-testid=pot-winner]')?.textContent || document.querySelector('[data-testid=ticker]')?.textContent);
  log.push(`result: ${result}`);
  const m = await measure(p);
  log.push(`showdown overlaps=${m.overlaps.length} offscreen=${m.offscreen.length} small=${m.smallFonts.length} opp=${m.sizes.opp}`);
  if (m.overlaps.length || m.offscreen.length) log.push(JSON.stringify({ o: m.overlaps, off: m.offscreen }));
  if (SHOTS) await p.screenshot({ path: `${SHOTS}-${tag}-showdown.png` });
  if (errs.length) log.push(`page errors: ${errs.join(' | ')}`);
  console.log(`PLAY ${tag} ${w}x${h}\n  ` + log.join('\n  '));
  await ctx.close();
}

if (PLAY) {
  await playHand(390, 844, 'portrait');
  await playHand(844, 390, 'landscape');
}
await b.close();
console.log(failures ? `\n${failures} viewport(s) failed` : '\nALL VIEWPORTS PASS');
process.exit(failures ? 1 : 0);
