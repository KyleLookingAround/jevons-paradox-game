// Screenshots and a scripted play-through of the game, for visual checks.
//   node tools/shot.mjs [scenes|flow|checks|audit|m2|m3|m4|m4real|real|realplay|looks|first|all] [filter]
// Builds a mock-only page (src/ui/mock-main.ts bundled with `bun build`, inlined into index.html) at shots/mock.html,
// so the UI can be checked while the real model or content does not build. `real` runs `bun run build.ts` and plays
// dist/index.html. Sizes: 390×844 (phone), 1280×800 (desk), 360×740 (narrow: overflow check only).
// Web fonts are blocked unless FONTS=1 (the page must look right on its fallbacks).
import { createRequire } from 'node:module';
import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const { chromium } = createRequire(import.meta.url)('playwright');
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const out = resolve(root, 'shots');
mkdirSync(out, { recursive: true });
const mode = process.argv[2] || 'all';
const filter = process.argv[3];

function buildMock() {
  const js = execFileSync('bun', ['build', resolve(root, 'src/ui/mock-main.ts'), '--target=browser', '--format=iife', '--minify'], { cwd: root, maxBuffer: 1 << 26 }).toString();
  const css = readFileSync(resolve(root, 'src/styles.css'), 'utf8');
  const html = readFileSync(resolve(root, 'index.html'), 'utf8');
  const page = html.replace('/*__CSS__*/', () => css).replace('/*__JS__*/', () => js.replace(/<\/script/gi, '<\\/script'));
  writeFileSync(resolve(out, 'mock.html'), page);
  return 'file://' + resolve(out, 'mock.html');
}
const mock = buildMock();

const browser = await chromium.launch();
let problems = 0;
const fail = (m) => { problems++; console.log('  ' + m); };

async function newPage(sz, extra = {}) {
  const ctx = await browser.newContext({ viewport: { width: sz.w, height: sz.h }, deviceScaleFactor: sz.dpr ?? (sz.tag === 'desk' ? 1 : 2), acceptDownloads: true, ...extra });
  if (!process.env.FONTS) await ctx.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
  const page = await ctx.newPage();
  const errs = [];
  page.on('console', (m) => {
    if (!(m.type() === 'error' || m.type() === 'warning')) return;
    if (!process.env.FONTS && /fonts\.(googleapis|gstatic)/.test(m.location()?.url || '')) return; // blocked on purpose
    errs.push(`${m.type()}: ${m.text()}`);
  });
  page.on('pageerror', (e) => errs.push('pageerror: ' + e.message));
  return { ctx, page, errs };
}
const overflow = (page) => page.evaluate(() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth, cockpit: document.querySelector('.cockpit')?.getBoundingClientRect().height ?? 0 }));
/** Elements whose box pokes out past their column's right edge (the v1 two-column clipping bug). */
const clipped = (page) => page.evaluate(() => {
  const bad = [];
  for (const col of document.querySelectorAll('.cockpit, .feed')) {
    const r = col.getBoundingClientRect();
    for (const el of col.querySelectorAll('button, .dial, .spark, .gauge-side, .tab')) {
      const b = el.getBoundingClientRect();
      if (b.width && getComputedStyle(el).visibility !== 'hidden' && el.offsetParent && b.right > r.right + 1.5 && !el.closest('.tabs')) bad.push(`${el.className} ${Math.round(b.right)}>${Math.round(r.right)}`);
    }
  }
  return bad.slice(0, 5);
});

const SIZES = [{ w: 390, h: 844, tag: 'phone' }, { w: 1280, h: 800, tag: 'desk' }, { w: 360, h: 740, tag: 'narrow' }];

/* ---------------------------------------------------------------- scenes */
async function scenes() {
  const list = [
    { name: 'fresh', hash: '#mock' },
    { name: 'ledger', hash: '#mock:rich,reveal,smog=0.4' },
    { name: 'budget', hash: '#mock:budget' },
    { name: 'foundry', hash: '#mock:all,sector=iron,smog=0.2' },
    { name: 'gaslight', hash: '#mock:all,sector=light,smog=0.3' },
    { name: 'chrome', hash: '#mock:all,sector=motion,smog=0.6' },
    { name: 'terminal', hash: '#mock:all,sector=compute,smog=0.5' },
    { name: 'agentic', hash: '#mock:all,sector=code,smog=0.7' },
  ];
  for (const sc of list) {
    if (filter && !sc.name.includes(filter)) continue;
    for (const sz of SIZES) {
      const { ctx, page, errs } = await newPage(sz);
      await page.goto(mock + sc.hash);
      await page.waitForTimeout(1200);
      for (let i = 0; i < 3; i++) await page.click('.sell').catch(() => {});
      await page.waitForTimeout(900);
      const o = await overflow(page);
      if (o.sw > o.cw) fail(`OVERFLOW ${sc.name}/${sz.tag}: scrollWidth ${o.sw} > ${o.cw}`);
      const cl = await clipped(page);
      if (cl.length) fail(`CLIPPED ${sc.name}/${sz.tag}: ${cl.join(' | ')}`);
      if (sz.tag !== 'narrow') {
        await page.screenshot({ path: `${out}/${sc.name}-${sz.tag}.png` });
        if (sz.tag === 'phone') await page.screenshot({ path: `${out}/${sc.name}-${sz.tag}-full.png`, fullPage: true });
        console.log(`${sc.name}-${sz.tag}.png  cockpit ${Math.round(o.cockpit)}px of ${sz.h} (${Math.round(o.cockpit / sz.h * 100)}%)`);
      }
      if (errs.length) fail(`${sc.name}/${sz.tag}: ${errs.join(' | ')}`);
      await ctx.close();
    }
  }
}

/* ---------------------------------------------------------------- flow */
// Every interaction the UI offers, on the mock, with screenshots of the sheets.
async function flow(base, tag0 = 'flow') {
  for (const sz of SIZES.slice(0, 2)) {
    const { ctx, page, errs } = await newPage({ ...sz, dpr: 1 });
    const T = `${tag0}-${sz.tag}`;
    const step = async (name, f) => {
      try { await f(); console.log(`  ok   ${T} ${name}`); }
      catch (e) { fail(`FAIL ${T} ${name}: ${String(e.message).split('\n')[0]}`); }
    };
    const shot = (n) => page.screenshot({ path: `${out}/${T}-${n}.png` });
    const st = () => page.evaluate(() => window.rebound.state);
    const closeToasts = () => page.evaluate(() => { for (let i = 0; i < 8; i++) document.querySelector('.note-slot:not([hidden]) .note-x')?.click(); });
    await page.goto(base + '#mock:rich,reveal,light');
    await page.waitForTimeout(800);
    await step('click main button', async () => {
      const before = (await st()).run.clicks; await page.click('.sell'); await page.waitForTimeout(150);
      if ((await st()).run.clicks !== before + 1) throw new Error('clicks did not rise');
    });
    await step('fork pair drawn side by side', async () => {
      const f = page.locator('.fork').first();
      if (!(await f.count())) throw new Error('no fork');
      const cards = f.locator(':scope > .up');
      const a = await cards.nth(0).boundingBox(), b = await cards.nth(1).boundingBox();
      if (!(a && b && Math.abs(a.y - b.y) < 2 && b.x > a.x)) throw new Error('fork arms not side by side');
      await f.scrollIntoViewIfNeeded(); await page.waitForTimeout(150); await shot('fork');
    });
    await step('third card line (brings within reach)', async () => {
      if (!(await page.locator('.reach-l').count())) throw new Error('no "brings within reach" line');
      if (!(await page.locator('.proj:visible').count())) throw new Error('no "this decade" line');
    });
    await step('take a fork arm; the other is ruled out', async () => {
      await page.locator('.fork .up .buy:not([aria-disabled="true"])').first().click(); await page.waitForTimeout(200);
      // One arm of a fork asks first (it rules the other out for the run).
      await page.click('.layer:not([hidden]) button:has-text("Take it")'); await page.waitForTimeout(200);
      if (!(await page.locator('.up.excluded .ruled:has-text("Ruled out by")').count())) throw new Error('no ruled-out card');
    });
    await step('buy an upgrade', async () => {
      const n = Object.values((await st()).upgrades).reduce((a, b) => a + b, 0);
      await page.locator('.up .buy:not([aria-disabled="true"]):visible').first().click(); await page.waitForTimeout(150);
      if (await page.locator('.layer:not([hidden]) button:has-text("Take it")').count()) { await page.click('.layer:not([hidden]) button:has-text("Take it")'); await page.waitForTimeout(150); }
      if (Object.values((await st()).upgrades).reduce((a, b) => a + b, 0) !== n + 1) throw new Error('no upgrade bought');
    });
    await step('found an app (scene: tap the staked plot, then Found in its card)', async () => {
      const place = page.locator('.scn-place.avail').first();
      const id = await place.getAttribute('data-app');
      await place.evaluate((el) => el.scrollIntoView({ block: 'center' })); await place.click(); await page.waitForTimeout(150);
      await page.locator('.scn-found:not([aria-disabled="true"])').evaluate((el) => el.scrollIntoView({ block: 'center' }));
      await page.click('.scn-found:not([aria-disabled="true"])'); await page.waitForTimeout(200);
      const s = await st(); if (!s.sectors.steam.apps[id].founded) throw new Error(id + ' not founded');
    });
    await step('open a formula (rebound: shadow identity)', async () => {
      await page.click('.dial-reb .info'); await page.waitForTimeout(300);
      if (!(await page.locator('.f-vals dt:has-text("R shadow")').count())) throw new Error('no shadow row');
      await shot('formula'); await page.click('.sheet-x');
    });
    await step('switch industry tab (theme follows)', async () => {
      await page.click('.tab:has-text("Light")'); await page.waitForTimeout(200);
      if (await page.evaluate(() => document.documentElement.dataset.look) !== 'gaslight') throw new Error('look did not switch');
      if (await page.evaluate(() => document.documentElement.dataset.accent) !== 'gas') throw new Error('accent did not switch');
      await page.click('.tab:has-text("Steam")'); await page.waitForTimeout(200);
    });
    await step('locked industry checklist', async () => {
      const chips = page.locator('.tab.locked');
      if ((await chips.count()) < 1) throw new Error('no locked chip');
      await chips.first().click(); await page.waitForTimeout(250);
      if (!(await page.locator('.check li').count())) throw new Error('no checklist');
      if (!(await page.locator('.check-rk:has-text("Reckonings:")').count())) throw new Error('no reckonings line');
      await shot('checklist'); await page.keyboard.press('Escape'); await page.waitForTimeout(150);
    });
    await step('draw the budget line', async () => {
      await closeToasts();
      await page.locator('.bud-draw').scrollIntoViewIfNeeded();
      // M2: drawing opens the pace choice (three paces), then draws at the chosen one.
      await page.click('.bud-draw'); await page.waitForTimeout(200);
      if ((await page.locator('.pace-box .pace').count()) < 2) throw new Error('no pace choice');
      await page.locator('.pace-box .pace').nth(1).click(); await page.waitForTimeout(100);
      await shot('pace');
      await page.click('.pace-box .btn.primary'); await page.waitForTimeout(250);
      const b = (await st()).sectors.steam.budget;
      if (!b) throw new Error('no budget');
      if (b.pace !== 'firm') throw new Error(`drawn at ${b.pace}, not the chosen pace`);
      await page.click('.bud-draw'); await page.waitForTimeout(150);
      if (!(await page.locator('.pace-warn.warn:visible').count())) throw new Error('no redraw warning');
      await page.click('.pace-box button:has-text("Not now")');
      await page.waitForTimeout(5600); // history samples every 5 s of play
      if (!(await page.locator('.sp-bud[points*=","]').count())) throw new Error('budget line not on sparkline');
      await shot('budget');
    });
    await step('raise a lever, recycle, levy', async () => {
      await page.locator('.lev-raise:not([aria-disabled="true"])').first().click(); await page.waitForTimeout(200);
      const s = await st(); if (!Object.values(s.levers).some((l) => l.level > 0)) throw new Error('no lever raised');
      const seg = page.locator('.lever.active .seg-b:has-text("dividend")').first();
      if (await seg.count()) {
        await seg.click(); await page.waitForTimeout(200);
        if (!Object.values((await st()).levers).some((l) => l.recycle === 'dividend')) throw new Error('recycle not set');
      }
      if (!(await page.locator('.lever.active .lev-levy').count())) throw new Error('no levy line');
      await page.locator('.lever.active').first().scrollIntoViewIfNeeded(); await shot('lever');
    });
    await step('tighten past the authored levels', async () => {
      await page.evaluate(() => { const r = window.rebound; r.ctx.state = { ...r.state, mandate: 1e6 }; });
      for (let i = 0; i < 4; i++) { await page.locator('.lever:has-text("Coal duty") .lev-raise').click(); await page.waitForTimeout(120); }
      const lv = (await st()).levers['steam.duty'].level;
      if (lv < 4) throw new Error('duty level ' + lv);
      if (!(await page.locator('.lever:has-text("Coal duty") .lev-raise:has-text("Tighten")').count())) throw new Error('no Tighten label');
    });
    await step('open the menu', async () => { await page.click('.tb-menu'); await page.waitForTimeout(300); await shot('menu'); });
    await step('export a save', async () => {
      const [dl] = await Promise.all([page.waitForEvent('download', { timeout: 3000 }), page.click('button:has-text("Download save")')]);
      const ta = await page.inputValue('.save-ta'); if (!ta.startsWith('{')) throw new Error('save text empty');
      if (!dl.suggestedFilename().startsWith('rebound-')) throw new Error('bad filename');
    });
    await step('import the save back', async () => {
      await page.click('button:has-text("Load pasted save")'); await page.waitForTimeout(200);
      if (await page.locator('.layer:not([hidden])').count()) throw new Error('import did not close the menu');
    });
    await step('call a Reckoning (confirm shows the terms)', async () => {
      await closeToasts();
      await page.click('.run-foot .btn'); await page.waitForTimeout(250);
      if (!(await page.locator('.sheet .tl-row').count())) throw new Error('no terms ledger');
      await shot('confirm');
      await page.click('button:has-text("Close the books")'); await page.waitForTimeout(400);
      if (!(await page.locator('.sheet .tl').count())) throw new Error('no ledger on the summary');
      await shot('summary');
      await page.locator('.sheet .tl').scrollIntoViewIfNeeded(); await shot('summary-ledger');
      const s = await st(); if (s.meta.reckonings < 2) throw new Error('reckonings did not rise');
    });
    await step('no ticking while the post-Reckoning screens are up', async () => {
      const t0 = (await st()).time; await page.waitForTimeout(700);
      if ((await st()).time !== t0) throw new Error('time advanced behind the summary');
    });
    await step('shop: Know-how tree, Institutions seats', async () => {
      await page.click('button:has-text("Spend Hindsight")'); await page.waitForTimeout(300);
      if (!(await page.locator('.tree-row').count())) throw new Error('no tree');
      if (!(await page.locator('.seat').count())) throw new Error('no seats');
      if (!(await page.evaluate(() => window.rebound.d.freshRun))) throw new Error('run not fresh in the shop');
      const h0 = (await st()).meta.hindsight;
      await page.locator('.kh-node:has-text("Apprenticeships") .btn').click(); await page.waitForTimeout(200);
      if ((await st()).meta.hindsight >= h0) throw new Error('know-how not bought');
      await page.locator('.shop-item:has-text("Board of Trade") .btn:has-text("Found")').click(); await page.waitForTimeout(200);
      if (!(await st()).meta.institutions['in.board']) throw new Error('institution not bought');
      // Unseat one, seat another.
      await page.locator('.seat.full .btn').first().click(); await page.waitForTimeout(200);
      const lo1 = (await st()).meta.loadout.length;
      // Founded at its only level, it has left the list for "Owned"; owned Institutions not seated are one tap away
      // under the seats.
      if (await page.locator('.shop-item:has-text("Board of Trade"):visible').count()) throw new Error('a fully founded Institution still in the list');
      await page.locator('.seat-more > summary').click(); await page.waitForTimeout(150);
      await page.locator('.seat-pick .own-row:has-text("Board of Trade") .seat-b').click(); await page.waitForTimeout(200);
      const lo2 = (await st()).meta.loadout;
      if (!lo2.includes('in.board') || lo2.length !== lo1 + 1) throw new Error('seat/unseat failed: ' + lo2.join(','));
      await shot('shop');
      await page.locator('.kh-fork').first().scrollIntoViewIfNeeded(); await shot('shop-tree');
      await page.click('button:has-text("Begin the next run")'); await page.waitForTimeout(600);
      if (!((await st()).time > 0)) throw new Error('the next run did not start ticking');
      await shot('newrun');
    });
    await step('shop mid-run is read-only', async () => {
      await page.click('.tb-menu'); await page.waitForTimeout(200);
      await page.click('button:has-text("Hindsight shop")'); await page.waitForTimeout(250);
      if (!(await page.locator('.shop-ro:visible').count())) throw new Error('no read-only line');
      if (await page.locator('.kh-node .btn:not([aria-disabled="true"])').count()) throw new Error('a buy button is enabled mid-run');
      await shot('shop-readonly'); await page.keyboard.press('Escape');
    });
    await step('forced Reckoning', async () => {
      await page.goto(base + '#mock:rich,pending'); await page.waitForTimeout(800); await shot('pending');
      await page.click('button:has-text("Face the Reckoning")'); await page.waitForTimeout(400);
      if (!(await page.locator('.sheet-t:has-text("Run summary")').count())) throw new Error('no summary');
      await page.click('.sheet-foot button:has-text("Begin the next run")'); await page.waitForTimeout(400);
    });
    await step('win card', async () => {
      await page.goto(base + '#mock:won'); await page.waitForTimeout(6500); await shot('win');
      // M3: the first win is the first ending: its credits card (Content.ending.credits; the mock carries the real one).
      if (!(await page.locator('.paper-head:has-text("Steady State"), .credits .paper-head').count())) throw new Error('no win card');
    });
    const o = await overflow(page);
    if (o.sw > o.cw) fail(`OVERFLOW ${T}`);
    if (errs.length) fail(`console ${T}: ${errs.join(' | ')}`);
    await ctx.close();
  }
}

/* ---------------------------------------------------------------- checks */
async function checks() {
  const sz = { w: 390, h: 844, tag: 'phone', dpr: 1 };
  const step = async (name, f) => {
    try { await f(); console.log(`  ok   check ${name}`); }
    catch (e) { fail(`FAIL check ${name}: ${String(e.message).split('\n')[0]}`); }
  };
  // Keyboard only: reach the sell button and an upgrade with Tab, press them, open and close a sheet.
  await step('keyboard-only play', async () => {
    const { ctx, page, errs } = await newPage(sz);
    await page.goto(mock + '#mock'); await page.waitForTimeout(600);
    const st = () => page.evaluate(() => window.rebound.state);
    let found = false;
    for (let i = 0; i < 80 && !found; i++) { await page.keyboard.press('Tab'); found = await page.evaluate(() => document.activeElement?.classList.contains('sell')); }
    if (!found) throw new Error('sell button not reachable by Tab');
    const ring = await page.evaluate(() => getComputedStyle(document.activeElement).outlineStyle);
    if (ring === 'none') throw new Error('no visible focus ring on the sell button');
    for (let i = 0; i < 12; i++) await page.keyboard.press('Enter');
    await page.waitForTimeout(100);
    if ((await st()).run.clicks < 12) throw new Error('Enter did not sell');
    await page.waitForTimeout(400);
    let buy = false;
    for (let i = 0; i < 120 && !buy; i++) { await page.keyboard.press('Tab'); buy = await page.evaluate(() => document.activeElement?.classList.contains('buy') && document.activeElement.getAttribute('aria-disabled') !== 'true'); }
    if (!buy) throw new Error('no affordable Buy reachable by Tab');
    await page.keyboard.press('Enter'); await page.waitForTimeout(150);
    if (!Object.keys((await st()).upgrades).length) throw new Error('Enter did not buy');
    // Menu by keyboard, focus trapped, Escape returns focus.
    await page.focus('.tb-menu'); await page.keyboard.press('Enter'); await page.waitForTimeout(200);
    for (let i = 0; i < 80; i++) await page.keyboard.press('Tab');
    if (!(await page.evaluate(() => !!document.activeElement?.closest('.sheet')))) throw new Error('focus escaped the sheet');
    await page.keyboard.press('Escape'); await page.waitForTimeout(150);
    if (!(await page.evaluate(() => document.activeElement?.classList.contains('tb-menu')))) throw new Error('focus did not return to the menu button');
    await page.screenshot({ path: `${out}/check-keyboard.png` });
    if (errs.length) throw new Error(errs.join(' | '));
    await ctx.close();
  });
  await step('prefers-reduced-motion', async () => {
    const { ctx, page, errs } = await newPage(sz, { reducedMotion: 'reduce' });
    await page.goto(mock + '#mock:rich,reveal'); await page.waitForTimeout(600);
    const anim = await page.evaluate(() => {
      const els = [...document.querySelectorAll('*')];
      return els.filter((e) => { const s = getComputedStyle(e); return (s.animationName !== 'none' && parseFloat(s.animationDuration) > 0.01) || parseFloat(s.transitionDuration) > 0.01; }).length;
    });
    if (anim) throw new Error(`${anim} elements still animate`);
    await page.click('.sell'); await page.waitForTimeout(100);
    if (errs.length) throw new Error(errs.join(' | '));
    await ctx.close();
  });
  await step('web fonts blocked (fallback look)', async () => {
    const { ctx, page } = await newPage({ w: 390, h: 844, tag: 'phone' });
    await page.goto(mock + '#mock:rich,reveal'); await page.waitForTimeout(900);
    await page.screenshot({ path: `${out}/check-nofonts-ledger.png` });
    await page.goto(mock + '#mock:all,sector=code'); await page.waitForTimeout(900);
    await page.screenshot({ path: `${out}/check-nofonts-agentic.png` });
    await ctx.close();
  });
  await step('"While you were away" after a reload with a gap', async () => {
    const { ctx, page: first, errs } = await newPage(sz);
    await first.goto(mock + '#mock:persist'); await first.waitForTimeout(800);
    await first.evaluate(() => window.rebound.save());
    const t0 = await first.evaluate(() => window.rebound.state.time);
    await first.close(); // pagehide saves and stamps the time, as a real close would
    // Come back 25 minutes later: backdate the stamp before the page's own scripts run.
    const page = await ctx.newPage();
    page.on('pageerror', (e) => errs.push('pageerror: ' + e.message));
    await page.addInitScript(() => { if (!sessionStorage.getItem('gap')) { sessionStorage.setItem('gap', '1'); localStorage.setItem('rebound.mock.save.at', String(Date.now() - 25 * 60 * 1000)); } });
    await page.goto(mock + '#mock:persist'); await page.waitForTimeout(800);
    // M2: the ledger (lastOffline) at the head of the feed, under the gauges; dismissed once, not shown again.
    const ledger = await page.locator('.away:not([hidden]) .aw-t:has-text("While you were away")').count();
    const t1 = await page.evaluate(() => window.rebound.state.time);
    await page.screenshot({ path: `${out}/check-away.png` });
    if (!ledger) throw new Error('no "While you were away" ledger');
    if (!(t1 > t0 + 600)) throw new Error(`time did not jump (${t0} → ${t1})`);
    const g = await page.locator('.gauges').boundingBox(), a = await page.locator('.away').boundingBox();
    if (!g || !a || a.y < g.y + g.height - 1) throw new Error('the ledger covers the gauges');
    await page.click('.away button:has-text("Carry on")'); await page.waitForTimeout(150);
    if (await page.locator('.away:not([hidden])').count()) throw new Error('the ledger did not go');
    await page.reload(); await page.waitForTimeout(800);
    if (await page.locator('.away:not([hidden])').count()) throw new Error('the same report was shown twice: ' + await page.evaluate(() => JSON.stringify([window.rebound.state.lastOffline?.requested, window.rebound.state.lastOffline?.to, localStorage.getItem('rebound.ui.prefs')])));
    if (errs.length) throw new Error(errs.join(' | '));
    await ctx.close();
  });
  await step('unreadable save: note with export, fresh run', async () => {
    const { ctx, page } = await newPage(sz);
    await page.addInitScript(() => { if (!sessionStorage.getItem('seeded')) { localStorage.setItem('rebound.mock.save', '{"not":"a save"'); sessionStorage.setItem('seeded', '1'); } });
    await page.goto(mock + '#mock:persist'); await page.waitForTimeout(700);
    if (!(await page.locator('.sheet-t:has-text("could not be read")').count())) throw new Error('no note');
    if ((await page.inputValue('.sheet .save-ta')) !== '{"not":"a save"') throw new Error('raw text not offered');
    if ((await page.evaluate(() => localStorage.getItem('rebound.save.unreadable'))) !== '{"not":"a save"') throw new Error('raw text not kept');
    await page.screenshot({ path: `${out}/check-unread.png` });
    await ctx.close();
  });
  // QA B22: one note at a time, in the header's note line, never over a control or a gauge, and never moving the page.
  await step('notes: one at a time, never over a control or a gauge, no layout shift', async () => {
    for (const s2 of [sz, { w: 844, h: 390, tag: 'land', dpr: 1 }, { w: 1280, h: 800, tag: 'desk', dpr: 1 }]) {
      const { ctx, page } = await newPage(s2);
      await page.goto(mock + '#mock:rich,reveal'); await page.waitForTimeout(700);
      await page.evaluate(() => { for (let i = 0; i < 8; i++) document.querySelector('.note-slot:not([hidden]) .note-x')?.click(); });
      await page.waitForTimeout(200);
      const feedTop0 = await page.evaluate(() => document.querySelector('.feed').getBoundingClientRect().top);
      await page.evaluate(() => {
        const c = window.rebound.ctx;
        c.toast('Light, 1870–1950. The parish lamps are lit by gas.', { label: 'Go there', run: () => {} });
        c.toast('Save loaded.');
        c.toast('A third note waits its turn.');
      });
      await page.waitForTimeout(400);
      const r = await page.evaluate(() => {
        const shown = [...document.querySelectorAll('.note-slot')].filter((e) => !e.hidden && e.getClientRects().length);
        const n = shown[0]?.getBoundingClientRect();
        const hits = [];
        if (n) for (const el of document.querySelectorAll('button, .dial, .tab, .sell, .afford-chip')) {
          if (shown[0].contains(el)) continue;
          const b = el.getBoundingClientRect();
          if (!b.width || !b.height || getComputedStyle(el).visibility === 'hidden') continue;
          if (b.left < n.right - 1 && b.right > n.left + 1 && b.top < n.bottom - 1 && b.bottom > n.top + 1) hits.push(el.className.toString().slice(0, 30));
        }
        return { count: shown.length, hits, feedTop: document.querySelector('.feed').getBoundingClientRect().top };
      });
      await page.screenshot({ path: `${out}/check-notes-${s2.tag}.png` });
      await ctx.close();
      if (r.count !== 1) throw new Error(`${s2.tag}: ${r.count} notes on show`);
      if (r.hits.length) throw new Error(`${s2.tag}: a note covers ${r.hits.join(', ')}`);
      if (Math.abs(r.feedTop - feedTop0) > 1) throw new Error(`${s2.tag}: the feed moved ${r.feedTop - feedTop0}px when a note showed`);
    }
  });
}


/* ---------------------------------------------------------------- audit */
// The genre-audit items: hidden-until-meaningful, the affordable signal, save safety, QoL, statistics, rough edges.
const LOOK_SCENES = [['ledger', '#mock:rich,reveal,smog=0.4'], ['gaslight', '#mock:all,sector=light,smog=0.3'], ['chrome', '#mock:all,sector=motion,smog=0.6'],
  ['terminal', '#mock:all,sector=compute,smog=0.5'], ['agentic', '#mock:all,sector=code,smog=0.7']];
const DEUT = `<svg xmlns="http://www.w3.org/2000/svg" style="position:absolute;width:0;height:0"><filter id="deut"><feColorMatrix type="matrix" values="0.367 0.861 -0.228 0 0  0.280 0.673 0.047 0 0  -0.012 0.043 0.969 0 0  0 0 0 1 0"/></filter></svg>`;
async function audit() {
  const sz = { w: 390, h: 844, tag: 'phone', dpr: 1 };
  const step = async (name, f) => {
    try { await f(); console.log(`  ok   audit ${name}`); }
    catch (e) { fail(`FAIL audit ${name}: ${String(e.message).split('\n')[0]}`); }
  };
  const vis = (page, sel) => page.locator(sel).first().isVisible().catch(() => false);
  const st = (page) => page.evaluate(() => window.rebound.state);
  const rich = (page, cap, man = 0) => page.evaluate(([c, m]) => { const r = window.rebound; r.ctx.state = { ...r.state, capital: r.state.capital + c, mandate: r.state.mandate + m }; }, [cap, man]);

  await step('fresh run: no Mandate, no Reckoning, no spoilers', async () => {
    const { ctx, page, errs } = await newPage(sz);
    await page.goto(mock + '#mock'); await page.waitForTimeout(700);
    if (await vis(page, '.tb-man')) throw new Error('Mandate shown with no lever visible');
    if (await vis(page, '.run-foot')) throw new Error('Reckoning offered before the reveal');
    await page.click('.tb-menu'); await page.waitForTimeout(200);
    if (await vis(page, '.sheet button:has-text("Call a Reckoning")')) throw new Error('menu offers a Reckoning');
    if (await vis(page, '.how p:has-text("Jevons")')) throw new Error('Jevons quoted before the reveal');
    await page.keyboard.press('Escape');
    await page.click('.dial-reb .info'); await page.waitForTimeout(200);
    if (await page.locator('.f-vals').count()) throw new Error('rebound working shown before the reveal');
    await page.screenshot({ path: `${out}/audit-prereveal-rebound.png` }); await page.keyboard.press('Escape');
    await page.goto(mock + '#mock:rich,reveal'); await page.waitForTimeout(1600);
    if (!(await vis(page, '.tb-man'))) throw new Error('Mandate hidden with levers visible');
    if (!(await vis(page, '.run-foot'))) throw new Error('Reckoning not offered after the reveal');
    if (errs.length) throw new Error(errs.join(' | '));
    await ctx.close();
  });

  await step('affordable chip appears, jumps below the header; tab marker', async () => {
    const { ctx, page, errs } = await newPage(sz);
    await page.goto(mock + '#mock'); await page.waitForTimeout(500);
    if (await vis(page, '.afford-chip')) throw new Error('chip with nothing affordable');
    await rich(page, 5000); await page.waitForTimeout(1200);
    if (!(await vis(page, '.afford-chip'))) throw new Error('no chip');
    await page.screenshot({ path: `${out}/audit-chip.png` });
    await page.click('.afford-chip'); await page.waitForTimeout(900);
    const r = await page.evaluate(() => {
      const f = document.activeElement; const card = f?.closest('.up, .apps'); const cb = document.querySelector('.cockpit').getBoundingClientRect();
      return { focus: f?.className || '', top: card?.getBoundingClientRect().top ?? -1, cockpit: cb.bottom };
    });
    if (!/buy|scn-found/.test(r.focus)) throw new Error('focus not on a buy button: ' + r.focus);
    if (r.top < r.cockpit - 2) throw new Error(`card under the header (${r.top} < ${r.cockpit})`);
    await page.screenshot({ path: `${out}/audit-chip-jump.png` });
    await page.goto(mock + '#mock:rich,reveal'); await page.waitForTimeout(1500);
    if (!(await page.locator('.tab.can-buy').count())) throw new Error('no affordable marker on another Industry tab');
    if (errs.length) throw new Error(errs.join(' | '));
    await ctx.close();
  });

  await step('no-nag: an offer passed over twice leaves the count', async () => {
    const { ctx, page } = await newPage(sz);
    await page.goto(mock + '#mock'); await page.waitForTimeout(400);
    await rich(page, 1e6); await page.waitForTimeout(1200);
    const keys0 = await page.evaluate(() => window.rebound.ctx.afford.items.map((x) => x.key));
    // Buy two different non-fork improvements through the UI; something else stays affordable throughout.
    const ids = await page.evaluate(() => window.rebound.ctx.ups.filter((v) => v.affordable && !v.def.excludes?.length && !v.def.repeatable).map((v) => v.def.id));
    if (ids.length < 2) throw new Error('mock lacks two affordable one-offs: ' + ids.join(','));
    for (const id of ids.slice(0, 2)) { await page.click(`.up[data-up="${id}"] .buy`); await page.waitForTimeout(1100); }
    const keys1 = await page.evaluate(() => window.rebound.ctx.afford.items.map((x) => x.key));
    const passed = keys0.filter((k) => !ids.slice(0, 2).some((id) => k.startsWith('u:' + id)) && !keys1.includes(k));
    if (!passed.length) throw new Error('nothing left the count: ' + keys1.join(','));
    const still = await page.locator(`.up.afford[data-up="${passed[0].slice(2).split('@')[0]}"]`).count();
    if (passed[0].startsWith('u:') && !still) throw new Error('passed-over card lost its own affordable styling');
    await ctx.close();
  });

  await step('save safety: persist asked, backup at Reckoning, restore, export note, iOS line', async () => {
    const { ctx, page, errs } = await newPage(sz);
    await page.goto(mock + '#mock:persist,rich,reveal'); await page.waitForTimeout(800);
    await page.locator('.up .buy:not([aria-disabled="true"])').first().click(); await page.waitForTimeout(600);
    const pr = await page.evaluate(() => JSON.parse(localStorage.getItem('rebound.ui.prefs') || '{}').persist);
    if (!pr) throw new Error('persist() result not recorded');
    await page.click('.tb-menu'); await page.waitForTimeout(400);
    if (!(await page.locator('.save-note:has-text("Storage:")').count())) throw new Error('no storage line');
    if (!(await page.locator('.save-note:has-text("export")').count())) throw new Error('no export note');
    await page.keyboard.press('Escape');
    await page.click('.run-foot .btn'); await page.waitForTimeout(200);
    await page.click('button:has-text("Close the books")'); await page.waitForTimeout(400);
    if (!(await page.locator('.sum-dl button').count())) throw new Error('no download on the summary');
    await page.click('.sheet-foot button:has-text("Begin the next run")'); await page.waitForTimeout(300);
    const bk = await page.evaluate(() => localStorage.getItem('rebound.mock.save.backup'));
    if (!bk) throw new Error('no backup written');
    await page.waitForTimeout(1500);
    await page.click('.tb-menu'); await page.waitForTimeout(300);
    await page.click('button:has-text("Restore the backup")'); await page.waitForTimeout(150);
    await page.locator('.save').scrollIntoViewIfNeeded(); await page.screenshot({ path: `${out}/audit-menu-save.png` });
    await page.click('button:has-text("Restore it")'); await page.waitForTimeout(400);
    if (!(await page.locator('.layer:not([hidden]) .sheet-t:has-text("Hindsight")').count())) throw new Error('restored fresh run did not open the shop');
    await page.screenshot({ path: `${out}/audit-restored-shop.png` });
    if (errs.length) throw new Error(errs.join(' | '));
    await ctx.close();
    const ios = await newPage(sz, { userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1' });
    await ios.page.goto(mock + '#mock'); await ios.page.waitForTimeout(500);
    await ios.page.click('.tb-menu'); await ios.page.waitForTimeout(300);
    if (!(await vis(ios.page, '.save-ios'))) throw new Error('no iOS Home Screen line');
    await ios.page.locator('.save-ios').scrollIntoViewIfNeeded(); await ios.page.screenshot({ path: `${out}/audit-ios.png` });
    await ios.page.click('.save-ios .toast-x'); await ios.page.waitForTimeout(100);
    if (await vis(ios.page, '.save-ios')) throw new Error('iOS line not dismissed');
    await ios.ctx.close();
  });

  await step('manifest and icons', async () => {
    const { ctx, page } = await newPage(sz);
    await page.goto(mock + '#mock'); await page.waitForTimeout(800);
    const m = await page.evaluate(() => {
      const l = document.querySelector('link[rel=manifest]'); if (!l) return null;
      const j = JSON.parse(decodeURIComponent(l.href.split(',')[1]));
      return { name: j.name, display: j.display, icons: j.icons.map((i) => i.sizes + ' ' + i.type + ' ' + i.purpose), touch: !!document.querySelector('link[rel=apple-touch-icon]')?.href.startsWith('data:image/png') };
    });
    if (!m || m.display !== 'standalone' || !m.icons.some((i) => i.startsWith('512x512 image/png')) || !m.touch) throw new Error('bad manifest ' + JSON.stringify(m));
    const icon = await page.evaluate(() => JSON.parse(decodeURIComponent(document.querySelector('link[rel=manifest]').href.split(',')[1])).icons[1].src);
    await page.setContent(`<body style="margin:0;background:#888"><img src="${icon}" width="256"><img src="${icon}" width="256" style="border-radius:50%;margin-left:12px"></body>`);
    await page.screenshot({ path: `${out}/audit-icon.png`, clip: { x: 0, y: 0, width: 530, height: 260 } });
    await ctx.close();
  });

  await step('notation, text size, motion settings', async () => {
    const { ctx, page, errs } = await newPage(sz);
    await page.goto(mock + '#mock:rich,reveal'); await page.waitForTimeout(600);
    await page.click('.tb-menu'); await page.waitForTimeout(200);
    await page.click('.seg-b[aria-label^="Scientific"]'); await page.waitForTimeout(100);
    await page.click('.seg-b[aria-label^="Largest"]'); await page.waitForTimeout(100);
    await page.locator('.settings').scrollIntoViewIfNeeded(); await page.screenshot({ path: `${out}/audit-settings.png` });
    await page.keyboard.press('Escape'); await page.waitForTimeout(1200);
    const cap = await page.textContent('.tb-cap .tb-v');
    if (!/e\d/.test(cap)) throw new Error('capital not in scientific: ' + cap);
    if (await page.evaluate(() => document.documentElement.dataset.text) !== '2') throw new Error('text size not applied');
    if (errs.length) throw new Error(errs.join(' | '));
    await ctx.close();
  });

  await step('keyboard shortcuts (and not while typing)', async () => {
    const { ctx, page } = await newPage({ w: 1280, h: 800, tag: 'desk', dpr: 1 });
    await page.goto(mock + '#mock:rich,reveal'); await page.waitForTimeout(600);
    const c0 = (await st(page)).run.clicks;
    await page.keyboard.press('s'); await page.waitForTimeout(100);
    if ((await st(page)).run.clicks !== c0 + 1) throw new Error('S did not sell');
    await page.keyboard.down('s'); await page.waitForTimeout(600); await page.keyboard.up('s');
    if ((await st(page)).run.clicks > c0 + 2) throw new Error('holding S auto-sold');
    const n0 = Object.values((await st(page)).upgrades).reduce((a, b) => a + b, 0);
    await page.keyboard.press('b'); await page.waitForTimeout(200);
    if (await page.locator('.layer:not([hidden]) .sheet-t:has-text("A choice")').count()) await page.keyboard.press('Escape');
    else if (Object.values((await st(page)).upgrades).reduce((a, b) => a + b, 0) !== n0 + 1) throw new Error('B did not buy');
    await page.keyboard.press('2'); await page.waitForTimeout(200);
    if (await page.evaluate(() => window.rebound.ctx.sector) === 'steam') throw new Error('2 did not switch Industry');
    await page.keyboard.press('1'); await page.keyboard.press('m'); await page.waitForTimeout(250);
    if (!(await page.locator('.sheet-t:has-text("Menu")').count())) throw new Error('M did not open the menu');
    if (!(await vis(page, '.keys-dl'))) throw new Error('no cheat-sheet on desktop');
    await page.locator('.keys').scrollIntoViewIfNeeded(); await page.screenshot({ path: `${out}/audit-keys.png` });
    const c1 = (await st(page)).run.clicks;
    await page.focus('.save-ta'); await page.keyboard.type('sss'); await page.waitForTimeout(100);
    if ((await st(page)).run.clicks !== c1) throw new Error('typing sold');
    await page.keyboard.press('Escape'); await page.waitForTimeout(150);
    if (await page.locator('.layer:not([hidden])').count()) throw new Error('Esc did not close');
    await ctx.close();
  });

  await step('lever Max, hold-to-repeat, fork confirmation', async () => {
    const { ctx, page, errs } = await newPage(sz);
    await page.goto(mock + '#mock:rich,reveal'); await page.waitForTimeout(1200);
    await rich(page, 1e7, 1e6); await page.waitForTimeout(1200);
    const mx = page.locator('.lever .lev-max:visible').first();
    await mx.scrollIntoViewIfNeeded(); await mx.click(); await page.waitForTimeout(300);
    if (!Object.values((await st(page)).levers).some((l) => l.level >= 3)) throw new Error('Max raised less than three steps');
    await page.locator('.lever.active').first().screenshot({ path: `${out}/audit-lever-max.png` });
    const b = page.locator('.up[data-up="steam.shaft"] .buy');
    await b.scrollIntoViewIfNeeded(); const box = await b.boundingBox();
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2); await page.mouse.down(); await page.waitForTimeout(1300); await page.mouse.up(); await page.waitForTimeout(200);
    const lv = (await st(page)).upgrades['steam.shaft'] || 0;
    if (lv < 3) throw new Error('hold bought only ' + lv);
    const fb = page.locator('.fork .up .buy:not([aria-disabled="true"])').first();
    await fb.scrollIntoViewIfNeeded();
    const forkBefore = JSON.stringify((await st(page)).upgrades);
    await fb.click(); await page.waitForTimeout(250);
    if (!(await page.locator('.layer:not([hidden]) .sheet-t:has-text("A choice")').count())) throw new Error('no fork confirmation');
    await page.screenshot({ path: `${out}/audit-fork-confirm.png` });
    await page.click('.sheet button:has-text("Not yet")'); await page.waitForTimeout(150);
    if (JSON.stringify((await st(page)).upgrades) !== forkBefore) throw new Error('"Not yet" bought');
    await fb.click(); await page.waitForTimeout(200); await page.click('.sheet button:has-text("Take it")'); await page.waitForTimeout(250);
    if (!(await page.locator('.up.excluded').count())) throw new Error('fork arm not taken');
    if (errs.length) throw new Error(errs.join(' | '));
    await ctx.close();
  });

  await step('aria-live headline, rate-limited', async () => {
    const { ctx, page } = await newPage(sz);
    await page.goto(mock + '#mock'); await page.waitForTimeout(500);
    const push = (t) => page.evaluate((t) => { const r = window.rebound; r.ctx.state = { ...r.state, news: [{ time: r.state.time + Math.random(), year: 1790, key: 'x', text: t }, ...r.state.news] }; }, t);
    await push('First test headline'); await page.waitForTimeout(400);
    const a = await page.textContent('#app > p.vh[aria-live]');
    if (!a.includes('First test headline')) throw new Error('not announced: ' + a);
    await push('Second test headline'); await page.waitForTimeout(400);
    if ((await page.textContent('#app > p.vh[aria-live]')).includes('Second')) throw new Error('not rate-limited');
    await page.waitForTimeout(12500);
    if (!(await page.textContent('#app > p.vh[aria-live]')).includes('Second')) throw new Error('second never announced');
    await ctx.close();
  });

  await step('statistics page', async () => {
    const { ctx, page, errs } = await newPage(sz);
    await page.goto(mock + '#mock:rich,reveal'); await page.waitForTimeout(800);
    await page.click('.tb-menu'); await page.waitForTimeout(200);
    await page.click('button:has-text("Statistics")'); await page.waitForTimeout(300);
    if ((await page.locator('.stats-sheet .stats div:visible').count()) < 20) throw new Error('thin statistics');
    await page.screenshot({ path: `${out}/audit-stats.png` });
    await page.locator('.stats-per').scrollIntoViewIfNeeded(); await page.screenshot({ path: `${out}/audit-stats-2.png` });
    if (errs.length) throw new Error(errs.join(' | '));
    await ctx.close();
  });

  await step('onboarding line not shown after a long gap on an unbought run', async () => {
    const { ctx, page: first } = await newPage(sz);
    await first.goto(mock + '#mock:persist'); await first.waitForTimeout(500);
    await first.evaluate(() => window.rebound.save()); await first.close();
    const page = await ctx.newPage();
    await page.addInitScript(() => { localStorage.setItem('rebound.mock.save.at', String(Date.now() - 3 * 3600 * 1000)); });
    await page.goto(mock + '#mock:persist'); await page.waitForTimeout(800);
    if (await vis(page, '.onboard')) throw new Error('onboarding line shown after 3 h away');
    await ctx.close();
  });

  await step('header ≤ 30% with a budget drawn; five looks, largest text, 360 px, deuteranopia', async () => {
    for (const ts of [0, 2]) for (const [look, hash] of [['budget', '#mock:budget'], ...LOOK_SCENES]) for (const s2 of [{ w: 390, h: 844, tag: 'phone' }, { w: 360, h: 740, tag: 'narrow' }, { w: 1280, h: 800, tag: 'desk' }]) {
      const { ctx, page, errs } = await newPage({ ...s2, dpr: 1 });
      if (ts) await page.addInitScript((t) => { localStorage.setItem('rebound.ui.prefs', JSON.stringify({ textSize: t })); }, ts);
      await page.goto(mock + hash); await page.waitForTimeout(1300);
      const o = await overflow(page);
      if (o.sw > o.cw) fail(`OVERFLOW ${look}/${s2.tag}/ts${ts}: ${o.sw} > ${o.cw}`);
      if (look === 'budget' && ts === 0 && s2.tag === 'phone' && o.cockpit > 0.3 * s2.h) fail(`header ${Math.round(o.cockpit)}px > 30% of ${s2.h}`);
      if (s2.tag !== 'desk' || ts === 0) await page.screenshot({ path: `${out}/audit-${look}-${s2.tag}-ts${ts}.png` });
      if (ts === 0 && s2.tag === 'phone' && look !== 'budget') {
        await page.evaluate((d) => { document.body.insertAdjacentHTML('beforeend', d); document.documentElement.style.filter = 'url(#deut)'; }, DEUT);
        await page.waitForTimeout(100); await page.screenshot({ path: `${out}/audit-${look}-deut.png` });
      }
      if (errs.length) fail(`${look}/${s2.tag}/ts${ts}: ${errs.join(' | ')}`);
      await ctx.close();
    }
  });
}


/* ---------------------------------------------------------------- realplay */
// The real model and content with the scene: a fresh save through foundings, a crisis, a reload, a Reckoning and a
// second run, then frame timings under 4× CPU throttling. Capital is topped up and time fast-forwarded through the
// console handle so it takes a minute, not an hour; every purchase goes through the page.
async function realplay() {
  try { execFileSync('bun', ['run', 'build.ts'], { cwd: root, stdio: 'pipe' }); }
  catch (e) { console.log('REALPLAY: build failed:\n' + String(e.stderr || e.message).split('\n').slice(0, 6).join('\n')); return; }
  const url = 'file://' + resolve(root, 'dist/index.html');
  for (const sz of SIZES.slice(0, 2)) {
    const { ctx, page, errs } = await newPage({ ...sz, dpr: sz.tag === 'phone' ? 2 : 1 });
    const T = `realplay-${sz.tag}`;
    const step = async (name, f) => { try { await f(); console.log(`  ok   ${T} ${name}`); } catch (e) { fail(`FAIL ${T} ${name}: ${String(e.message).split('\n')[0]}`); } };
    const shot = (n) => page.screenshot({ path: `${out}/${T}-${n}.png` });
    const st = () => page.evaluate(() => window.rebound.state);
    const rich = (cap, man = 0) => page.evaluate(([c, m]) => { const r = window.rebound; r.ctx.state = { ...r.state, capital: r.state.capital + c, mandate: r.state.mandate + m }; }, [cap, man]);
    const ff = (sec) => page.evaluate((x) => { const r = window.rebound; r.ctx.state = r.model.fastForward(r.state, r.content, x); }, sec);
    const founded = () => page.evaluate(() => { const s = window.rebound.state; return Object.values(s.sectors).reduce((a, x) => a + Object.values(x.apps || {}).filter((y) => y.founded).length, 0); });
    const foundOne = async () => {
      const p = page.locator('.scn-place.avail').first();
      if (!(await p.count())) return false;
      // Centre it: the pinned header and the dock would otherwise cover a plot scrolled just into view.
      await p.evaluate((el) => el.scrollIntoView({ block: 'center' })); await page.waitForTimeout(150);
      await p.click({ timeout: 3000 }); await page.waitForTimeout(150);
      const f = page.locator('.scn-found:not([aria-disabled="true"]):visible');
      if (!(await f.count())) return false;
      await f.evaluate((el) => el.scrollIntoView({ block: 'center' }));
      await f.click({ timeout: 3000 }); await page.waitForTimeout(400); return true;
    };
    await page.goto(url); await page.waitForTimeout(1200);
    if (await page.evaluate(() => window.rebound?.ctx?.mock)) { console.log(`REALPLAY ${sz.tag}: fell back to the mock`); }
    await shot('00-fresh');
    await step('found several applications through the scene', async () => {
      const f0 = await founded();
      for (let round = 0; round < 30 && (await founded()) < f0 + 3; round++) {
        await rich(2e3 * Math.pow(2, round)); await page.waitForTimeout(1100);
        const b = page.locator('.up .buy:not([aria-disabled="true"]):visible');
        if (await b.count()) { await b.first().click({ timeout: 3000 }).catch(() => {}); await page.waitForTimeout(200); if (await page.locator('.layer:not([hidden]) .sheet-t:has-text("A choice")').count()) await page.click('.sheet button:has-text("Take it")'); }
        if (await foundOne()) await shot(`01-founded-${await founded()}`);
      }
      if ((await founded()) < f0 + 3) throw new Error(`founded only ${(await founded()) - f0}`);
      await page.evaluate(() => window.scrollTo(0, 0)); await page.waitForTimeout(400); await shot('02-town');
    });
    await step('a crisis (fast-forward until one fires)', async () => {
      const c0 = (await st()).sectors.steam.crisesFired;
      for (let i = 0; i < 40 && (await st()).sectors.steam.crisesFired === c0 && !(await page.evaluate(() => window.rebound.d.pendingReckoning)); i++) {
        await rich(1e6); await ff(30); await page.waitForTimeout(1100);
        await foundOne().catch(() => false);
        const b = page.locator('.up:not(.up-research) .buy:not([aria-disabled="true"]):visible');
        if (await b.count()) { await b.first().click({ timeout: 2000 }).catch(() => {}); if (await page.locator('.layer:not([hidden]) .sheet-t:has-text("A choice")').count()) await page.click('.sheet button:has-text("Take it")'); }
      }
      if ((await st()).sectors.steam.crisesFired === c0) throw new Error('no crisis');
      await page.evaluate(() => window.scrollTo(0, 0)); await page.waitForTimeout(500); await shot('03-crisis');
    });
    await step('reload: the town is built, no founding animations', async () => {
      await page.evaluate(() => window.rebound.save());
      await page.reload(); await page.waitForTimeout(300);
      const builds = await page.locator('.scn .build, .scn-scaf.on').count();
      await page.waitForTimeout(500); await shot('04-reloaded');
      if (builds) throw new Error(`${builds} founding animations after reload`);
      const fd = await page.locator('.scn-place:not(.avail)').count();
      if (!fd) throw new Error('no places after reload');
    });
    await step('reveal, Reckoning, second run', async () => {
      for (let round = 0; round < 30 && !(await st()).flags.revealed; round++) {
        if (await page.evaluate(() => window.rebound.d.pendingReckoning)) break;
        await rich(1e7); await page.waitForTimeout(1100);
        const b = page.locator('.up .buy:not([aria-disabled="true"]):visible');
        for (let i = 0; i < 4 && (await b.count()); i++) { await b.first().click().catch(() => {}); await page.waitForTimeout(150); if (await page.locator('.layer:not([hidden]) .sheet-t:has-text("A choice")').count()) await page.click('.sheet button:has-text("Take it")'); }
        await foundOne();
      }
      if (await page.evaluate(() => window.rebound.d.pendingReckoning)) {
        await page.waitForTimeout(400); await shot('05-pending'); await page.click('button:has-text("Face the Reckoning")');
      } else {
        await page.evaluate(() => { for (let i = 0; i < 8; i++) document.querySelector('.note-slot:not([hidden]) .note-x')?.click(); });
        // "Call a Reckoning" waits for the levers (the unfolding: five minutes of play after the reveal); time is moved
        // on through the console handle if the scripted buying got there first.
        for (let i = 0; i < 40 && !(await page.locator('.run-foot:not([hidden]) .btn').count()) && !(await page.evaluate(() => window.rebound.d.pendingReckoning)); i++) {
          await page.evaluate(() => { const r = window.rebound; r.ctx.state = r.model.tick(r.state, r.content, 20); }); await page.waitForTimeout(150);
        }
        if (await page.evaluate(() => window.rebound.d.pendingReckoning)) { await page.waitForTimeout(400); await page.click('button:has-text("Face the Reckoning")'); }
        else { await page.click('.run-foot .btn'); await page.waitForTimeout(250); await page.click('button:has-text("Close the books")'); }
      }
      await page.waitForTimeout(500); await shot('06-summary');
      await page.click('button:has-text("Spend Hindsight")'); await page.waitForTimeout(300);
      const kb = page.locator('.kh-node .btn:not([aria-disabled="true"])'); if (await kb.count()) { await kb.first().click(); await page.waitForTimeout(200); }
      await page.click('button:has-text("Begin the next run")'); await page.waitForTimeout(1500);
      if (!((await st()).meta.reckonings >= 1)) throw new Error('no Reckoning recorded');
      if (!(await page.evaluate(() => localStorage.getItem('rebound.save.v1.backup')))) throw new Error('no backup after the Reckoning');
      await page.evaluate(() => window.scrollTo(0, 0)); await shot('07-run2');
    });
    await step('switch Industry tabs: scenes swap cleanly', async () => {
      // Open a second industry through the console if the run has none yet (the unlock is the model's business).
      const tabs = page.locator('.tab:not(.locked)');
      for (let i = 0; i < 30 && (await tabs.count()) < 2 && !(await page.evaluate(() => window.rebound.d.pendingReckoning)); i++) {
        await rich(1e8); await ff(30); await page.waitForTimeout(1100);
        await foundOne().catch(() => false);
        const b = page.locator('.up .buy:not([aria-disabled="true"]):visible');
        for (let k = 0; k < 3 && (await b.count()); k++) { await b.first().click({ timeout: 2000 }).catch(() => {}); await page.waitForTimeout(120); if (await page.locator('.layer:not([hidden]) .sheet-t:has-text("A choice")').count()) await page.click('.sheet button:has-text("Take it")'); }
      }
      if ((await tabs.count()) < 2) { console.log(`  note ${T}: one industry open; tab swap not exercised`); return; }
      await tabs.nth(1).click(); await page.waitForTimeout(700); await shot('08-tab2');
      const n = await page.locator('.world-mount .scn').count();
      if (n !== 1) throw new Error(`${n} scenes in the page`);
      await tabs.nth(0).click(); await page.waitForTimeout(700);
    });
    await step('frame timings, 4× CPU throttle, game ticking', async () => {
      await page.evaluate(() => window.scrollTo(0, 0));
      const cdp = await ctx.newCDPSession(page);
      await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
      const r = await page.evaluate(() => new Promise((res) => {
        const d = []; let last = performance.now(); const t0 = last;
        const f = (now) => { d.push(now - last); last = now; if (now - t0 < 6000) requestAnimationFrame(f); else res(d); };
        requestAnimationFrame(f);
      }));
      await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 });
      const sorted = [...r].sort((a, b) => a - b), q = (p) => sorted[Math.min(sorted.length - 1, Math.floor(p * sorted.length))];
      console.log(`  perf ${T}: ${r.length} frames in 6 s, p50 ${q(0.5).toFixed(1)} ms, p95 ${q(0.95).toFixed(1)} ms, max ${sorted[sorted.length - 1].toFixed(0)} ms, >50 ms: ${r.filter((x) => x > 50).length}`);
    });
    const o = await overflow(page);
    if (o.sw > o.cw) fail(`OVERFLOW ${T}`);
    if (errs.length) fail(`console ${T}: ${errs.slice(0, 4).join(' | ')}`);
    await ctx.close();
  }
}


/* ---------------------------------------------------------------- looks (real game) */
// Every industry's page and scene in the real game. Later industries take hours to reach, so for these screenshots
// they are opened through the console handle (state.sectors[id].open), then the run ticks for a while with capital
// topped up and the first few uses founded through the page. Visual check only: not a balance or unlock test.
async function looks() {
  try { execFileSync('bun', ['run', 'build.ts'], { cwd: root, stdio: 'pipe' }); } catch (e) { console.log('LOOKS: build failed'); return; }
  const url = 'file://' + resolve(root, 'dist/index.html');
  for (const sz of SIZES) {
    const { ctx, page, errs } = await newPage({ ...sz, dpr: sz.tag === 'desk' ? 1 : 2 });
    await page.goto(url); await page.waitForTimeout(1000);
    const ids = await page.evaluate(() => window.rebound.content.sectorOrder);
    await page.evaluate(() => {
      const r = window.rebound; const s = r.state; const sectors = { ...s.sectors };
      // Roughly what the model does when an industry opens (reserve filled, free uses founded): screenshot use only.
      for (const id of r.content.sectorOrder) {
        if (sectors[id].open) continue;
        const def = r.content.sectors[id]; const apps = {};
        for (const a of def.applications) { const av = a.visibleBelow === Infinity; apps[a.id] = { available: av, founded: av && a.foundCost <= 0, satMul: 1, peakD: 0 }; }
        sectors[id] = { ...sectors[id], open: true, reserve: def.reserve, reserveMax: def.reserve, apps };
      }
      r.ctx.state = r.model.fastForward({ ...s, capital: 1e12, sectors }, r.content, 120);
    });
    for (const id of ids) {
      await page.evaluate((i) => window.rebound.ctx.selectSector(i), id);
      await page.waitForTimeout(600);
      for (let k = 0; k < 3; k++) {
        const p = page.locator('.scn-place.avail').first();
        if (!(await p.count())) break;
        await p.evaluate((el) => el.scrollIntoView({ block: 'center' })); await p.click({ timeout: 2000 }).catch(() => {});
        const f = page.locator('.scn-found:not([aria-disabled="true"]):visible');
        if (await f.count()) await f.click({ timeout: 2000 }).catch(() => {});
        await page.waitForTimeout(300);
      }
      await page.evaluate(() => { for (let i = 0; i < 8; i++) document.querySelector('.note-slot:not([hidden]) .note-x')?.click(); window.scrollTo(0, 0); });
      await page.waitForTimeout(1500);
      const o = await overflow(page);
      if (o.sw > o.cw) fail(`OVERFLOW looks ${id}/${sz.tag}`);
      const look = await page.evaluate(() => document.documentElement.dataset.look);
      await page.screenshot({ path: `${out}/looks-${id}-${sz.tag}.png` });
      if (sz.tag === 'phone') await page.screenshot({ path: `${out}/looks-${id}-${sz.tag}-full.png`, fullPage: true });
      console.log(`looks ${id} (${look}) ${sz.tag}: cockpit ${Math.round(o.cockpit)}px`);
    }
    if (errs.length) fail(`looks/${sz.tag}: ${errs.slice(0, 3).join(' | ')}`);
    await ctx.close();
  }
}

/* ---------------------------------------------------------------- real */
async function real() {
  try { execFileSync('bun', ['run', 'build.ts'], { cwd: root, stdio: 'pipe' }); }
  catch (e) { console.log('REAL: bun run build.ts failed:\n' + String(e.stderr || e.message).split('\n').slice(0, 6).join('\n')); return; }
  const url = 'file://' + resolve(root, 'dist/index.html');
  if (!existsSync(resolve(root, 'dist/index.html'))) { console.log('REAL: no dist/index.html'); return; }
  for (const sz of SIZES.slice(0, 2)) {
    const { ctx, page, errs } = await newPage(sz);
    await page.goto(url); await page.waitForTimeout(1500);
    const isMock = await page.evaluate(() => window.rebound?.ctx?.mock);
    console.log(`REAL ${sz.tag}: ${isMock ? 'fell back to the MOCK (content not in the M1 shape)' : 'real model and content'}`);
    for (let i = 0; i < 20; i++) await page.click('.sell').catch(() => {});
    await page.waitForTimeout(500);
    const buy = page.locator('.buy:not([aria-disabled="true"])').first();
    if (await buy.count()) await buy.click().catch(() => {});
    await page.waitForTimeout(800);
    await page.screenshot({ path: `${out}/real-${sz.tag}.png` });
    if (sz.tag === 'phone') await page.screenshot({ path: `${out}/real-${sz.tag}-full.png`, fullPage: true });
    const o = await overflow(page);
    if (o.sw > o.cw) fail(`OVERFLOW real/${sz.tag}`);
    if (errs.length) fail(`real/${sz.tag}: ${errs.join(' | ')}`);
    await ctx.close();
  }
  await realFlow(url);
  await majors(url);
}

/* ---------------------------------------------------------------- the QA majors (real game) */
// Checks for each major the QA pass fixed (design/qa-report-m2.md), so none can return unnoticed: landscape and short
// screens (B19), two tabs on one save (B20), the saved picture's figures (B4) and its survival of a reload (B36), the
// calendar never jumping (B3), a held line left for ten minutes (B6). Notes over controls (B22) are in `checks`.
async function majors(url) {
  const T = 'majors';
  const step = async (name, f) => { try { await f(); console.log(`  ok   ${T} ${name}`); } catch (e) { fail(`FAIL ${T} ${name}: ${String(e.message).split('\n')[0]}`); } };
  const clearNotes = (page) => page.evaluate(() => { for (let i = 0; i < 8; i++) document.querySelector('.note-slot:not([hidden]) .note-x')?.click(); });
  const seedCtx = async (sz, save, agoMs = 0) => {
    const r = await newPage({ ...sz, dpr: 1 }, { hasTouch: sz.w < 1000 });
    await r.ctx.addInitScript(([t, ago]) => {
      if (sessionStorage.getItem('seeded')) return; sessionStorage.setItem('seeded', '1');
      localStorage.setItem('rebound.save.v1', t); localStorage.setItem('rebound.save.v1.at', String(Date.now() - ago));
    }, [save, agoMs]);
    return r;
  };
  const { ctx: c0, page: p0 } = await newPage({ w: 390, h: 844, tag: 'phone', dpr: 1 });
  await p0.goto(url); await p0.waitForTimeout(800);
  const late = await makeLate(p0);
  await c0.close();

  await step('landscape and short screens: playable, nothing pinned over a third', async () => {
    for (const sz of [{ w: 844, h: 390, tag: 'land' }, { w: 667, h: 375, tag: 'land-small' }, { w: 320, h: 640, tag: 'w320' }, { w: 320, h: 568, tag: 'se' }, { w: 390, h: 844, tag: 'phone' }, { w: 1280, h: 500, tag: 'desk-short' }]) {
      const { ctx, page, errs } = await seedCtx(sz, late);
      await page.goto(url); await page.waitForTimeout(1300); await clearNotes(page); await page.waitForTimeout(300);
      const m = await page.evaluate(() => {
        const r = (s) => document.querySelector(s)?.getBoundingClientRect();
        const ck = r('.cockpit'), fd = r('.feed'), sell = r('.sell'), sc = r('.world-mount');
        const beside = ck.right <= fd.left + 1;
        return { vh: innerHeight, vw: innerWidth, beside, ck: ck.height, sellTop: sell.top, sellBottom: sell.bottom, sceneTop: sc.top, sceneBottom: sc.bottom,
          sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth };
      });
      await page.screenshot({ path: `${out}/${T}-${sz.tag}.png` });
      await ctx.close();
      if (m.sw > m.cw) throw new Error(`${sz.tag}: page scrolls sideways (${m.sw} > ${m.cw})`);
      if (!(m.sellTop >= 0 && m.sellBottom <= m.vh + 1)) throw new Error(`${sz.tag}: Sell off screen (${Math.round(m.sellTop)}–${Math.round(m.sellBottom)} of ${m.vh})`);
      if (!m.beside && m.ck > m.vh / 3 + 6) throw new Error(`${sz.tag}: the pinned header is ${Math.round(m.ck)} px of ${m.vh}`);
      if (sz.w > sz.h && sz.w < 1000 && !m.beside) throw new Error(`${sz.tag}: landscape is not side by side`);
      if (m.sceneTop > m.vh || m.sceneBottom < 0) throw new Error(`${sz.tag}: the picture is not on the first screen`);
      if (errs.length) throw new Error(errs.slice(0, 2).join(' | '));
    }
  });

  await step('two tabs on one save: one writer, a plain notice, a takeover that loses nothing', async () => {
    const { ctx, page: a } = await seedCtx({ w: 390, h: 844 }, late);
    await a.goto(url); await a.waitForTimeout(1200); await clearNotes(a);
    const b = await ctx.newPage(); await b.goto(url); await b.waitForTimeout(1200);
    if (!(await b.locator('.elsewhere:not([hidden])').count())) throw new Error('the second tab shows no notice');
    if (await a.locator('.elsewhere:not([hidden])').count()) throw new Error('the first tab stopped');
    // The player plays in the first tab (on screen), then turns to the second.
    await a.bringToFront();
    for (let i = 0; i < 20; i++) await a.click('.sell');
    await a.waitForTimeout(11000);
    const clicks = (pg) => pg.evaluate(() => window.rebound.state.run.clicks);
    const stored = () => a.evaluate(() => window.rebound.model.deserialize(localStorage.getItem('rebound.save.v1'), window.rebound.content).run.clicks);
    const ca = await clicks(a);
    if ((await stored()) !== ca) throw new Error(`the save holds ${await stored()} sales, the playing tab ${ca}`);
    for (let i = 0; i < 5; i++) await a.click('.sell');
    await b.bringToFront();
    await b.click('.elsewhere button');
    await b.waitForFunction(() => !document.querySelector('.elsewhere:not([hidden])'), null, { timeout: 6000 });
    await b.waitForTimeout(500);
    if ((await clicks(b)) !== ca + 5) throw new Error(`after the takeover the new tab has ${await clicks(b)} sales, not ${ca + 5}`);
    if (!(await a.locator('.elsewhere:not([hidden])').count())) throw new Error('the old tab did not stop');
    await b.screenshot({ path: `${out}/${T}-tabs-taken.png` }); await a.screenshot({ path: `${out}/${T}-tabs-stopped.png` });
    await ctx.close();
  });

  await step('the calendar never jumps when an Industry opens and never runs absurdly past its Age', async () => {
    const { ctx, page } = await newPage({ w: 390, h: 844, tag: 'phone', dpr: 1 });
    await page.goto(url); await page.waitForTimeout(800);
    const r = await page.evaluate(() => {
      const w = window.rebound, m = w.model, c = w.content;
      let s = m.createState(c);
      for (let i = 0; i < 600; i++) s = m.tick(s, c, 1);
      // Light opened by hand (screenshot-style), then the year sampled every second for three minutes
      const def = c.sectors.light; const apps = {};
      for (const a of def.applications) { const av = a.visibleBelow === Infinity; apps[a.id] = { available: av, founded: av && a.foundCost <= 0, satMul: 1, peakD: 0 }; }
      s = { ...s, sectors: { ...s.sectors, light: { ...s.sectors.light, open: true, openFor: 0, reserve: def.reserve, reserveMax: def.reserve, apps } } };
      let prev = m.derive(s, c).year, maxStep = 0;
      for (let i = 0; i < 180; i++) { s = m.tick(s, c, 1); const y = m.derive(s, c).year; maxStep = Math.max(maxStep, y - prev); if (y < prev - 1e-9) return { back: true }; prev = y; }
      const far = m.yearAt({ ...s, sectors: { ...s.sectors, steam: { ...s.sectors.steam, openFor: 1e6 }, light: { ...s.sectors.light, openFor: 1e6 } }, time: 1e6 }, c, 1e6);
      return { maxStep, end: prev, far, back: false };
    });
    await ctx.close();
    if (r.back) throw new Error('the calendar ran backwards');
    if (r.maxStep > 1.5) throw new Error(`the year jumped ${r.maxStep.toFixed(1)} in a second`);
    if (r.end < 1870) throw new Error(`the calendar never caught up with Light (${r.end.toFixed(0)})`);
    if (r.far > 1950) throw new Error(`the Coal Age reads ${Math.floor(r.far)} after a long run`);
  });

  await step('a held line left for ten minutes is held on return', async () => {
    const { ctx: cA, page: pA } = await newPage({ w: 390, h: 844, tag: 'phone', dpr: 1 });
    await pA.goto(url); await pA.waitForTimeout(800);
    const save = await pA.evaluate(() => {
      const w = window.rebound, m = w.model, c = w.content;
      const meta = { ...m.createState(c).meta, reckonings: 3, features: Object.fromEntries(Object.keys(c.features || {}).map((k) => [k, 0])) };
      let s = { ...m.createState(c, meta), capital: 5e4 };
      for (let i = 0; i < 300; i++) {
        const v = m.upgradeViews(s, c, 'steam').filter((x) => x.visible && x.affordable && !x.maxed && !x.excludedBy).sort((a, b) => a.cost - b.cost)[0];
        if (v) s = m.buyUpgrade(s, c, v.def.id);
        s = m.tick(s, c, 1);
      }
      s = m.drawBudget(s, c, 'steam', 'firm');
      s = { ...s, mandate: s.mandate + 5000 };
      s = m.setLever(s, c, 'steam.cap', 1);
      for (let i = 0; i < 260; i++) s = m.tick(s, c, 1);
      const d = m.derive(s, c).sectors.steam;
      return { text: m.serialize(s), decoupling: d.decoupling, years: s.sectors.steam.steadyYears };
    });
    await cA.close();
    if (!save.decoupling) throw new Error('the scripted line is not held before leaving');
    const { ctx, page } = await seedCtx({ w: 390, h: 844 }, save.text, 600e3);
    await page.goto(url); await page.waitForTimeout(1500);
    const r = await page.evaluate(() => ({ lines: window.rebound.state.lastOffline?.lines, lapsed: window.rebound.state.lastOffline?.lapsed?.length ?? 0, ledger: document.querySelector('.away')?.innerText ?? '' }));
    await page.screenshot({ path: `${out}/${T}-away-held.png` });
    await ctx.close();
    if (r.lines?.steam !== 'held') throw new Error(`Steam's line came back ${r.lines?.steam ?? 'missing'}`);
    if (r.lapsed) throw new Error(`${r.lapsed} levers lapsed`);
    if (!/the line held/.test(r.ledger)) throw new Error('the ledger does not say the line held');
  });

  await step('the saved picture tells the run\'s true story, and the summary survives a reload', async () => {
    const { ctx, page } = await newPage({ w: 390, h: 844, tag: 'phone', dpr: 1 }, { acceptDownloads: true });
    await page.goto(url); await page.waitForTimeout(900);
    for (let round = 0; round < 400; round++) {
      const pend = await page.evaluate((r0) => {
        const r = window.rebound, m = r.model, c = r.content;
        let s = { ...r.state, capital: r.state.capital + 2e3 * Math.pow(1.25, Math.min(r0, 60)) };
        const vs = m.upgradeViews(s, c, 'steam').filter((v) => v.visible && !v.maxed && v.affordable && !v.excludedBy).sort((a, b) => a.cost - b.cost);
        for (const v of vs.slice(0, 2)) { const n = m.buyUpgrade(s, c, v.def.id); if (n !== s) s = n; }
        const d = m.derive(s, c);
        for (const a of c.sectors.steam.applications) if (d.sectors.steam?.apps[a.id]?.canFound) s = m.foundApp(s, c, a.id);
        r.ctx.state = m.fastForward(s, c, 8);
        return !!m.derive(r.ctx.state, c).pendingReckoning;
      }, round);
      await page.waitForTimeout(40);
      if (pend) break;
    }
    await page.waitForTimeout(1200);
    await page.click('button:has-text("Face the Reckoning")'); await page.waitForTimeout(1500);
    const story = await page.evaluate(() => document.querySelector('.lp-story')?.textContent ?? '');
    const peak = await page.evaluate(() => window.rebound.state.meta.lastRun.sectors.steam.peakRFold);
    const want = peak < 10 ? `×${peak.toFixed(1)}` : null;
    if (!/peak coal use/.test(story) || (want && !story.includes(want))) throw new Error(`the story reads "${story}" (peak ×${peak.toFixed(1)})`);
    const dl = page.waitForEvent('download', { timeout: 20000 });
    await page.click('button:has-text("Save before and after")');
    await (await dl).saveAs(`${out}/${T}-card-pair.png`);
    await page.screenshot({ path: `${out}/${T}-summary.png` });
    await page.reload(); await page.waitForTimeout(1800);
    if (!(await page.locator('.sheet-t:has-text("Run summary")').count())) throw new Error('a reload on the summary did not show it again');
    if (!(await page.locator('button:has-text("Save picture")').count())) throw new Error('the picture buttons are gone after a reload');
    await ctx.close();
  });
}

// A scripted run on the real model: capital is topped up through the console handle so the run reaches the reveal,
// levers, budgets and a Reckoning in seconds. Everything else goes through the UI.
async function realFlow(url) {
  for (const sz of SIZES.slice(0, 2)) {
    const { ctx, page, errs } = await newPage({ ...sz, dpr: 1 });
    const T = `real-${sz.tag}`;
    const step = async (name, f) => {
      try { await f(); console.log(`  ok   ${T} ${name}`); }
      catch (e) { fail(`FAIL ${T} ${name}: ${String(e.message).split('\n')[0]}`); }
    };
    const st = () => page.evaluate(() => window.rebound.state);
    const rich = (cap, man = 0) => page.evaluate(([c, m]) => { const r = window.rebound; r.ctx.state = { ...r.state, capital: r.state.capital + c, mandate: r.state.mandate + m }; }, [cap, man]);
    const closeToasts = () => page.evaluate(() => { for (let i = 0; i < 8; i++) document.querySelector('.note-slot:not([hidden]) .note-x')?.click(); });
    await page.goto(url); await page.waitForTimeout(800);
    await step('sell and buy', async () => {
      for (let i = 0; i < 5; i++) await page.click('.sell');
      await rich(1e3); await page.waitForTimeout(1100);
      await page.locator('.up .buy:not([aria-disabled="true"]):visible').first().click(); await page.waitForTimeout(200);
      if (!Object.keys((await st()).upgrades).length) throw new Error('nothing bought');
    });
    await step('buy through to the reveal', async () => {
      for (let round = 0; round < 25 && !(await st()).flags.revealed; round++) {
        await rich(1e6); await page.waitForTimeout(1100);
        const b = page.locator('.up .buy:not([aria-disabled="true"]):visible');
        for (let i = 0; i < 4 && (await b.count()); i++) {
          await b.first().click({ timeout: 3000 }).catch(() => {}); await page.waitForTimeout(150);
          // One arm of a fork asks first: take it (an open sheet would otherwise swallow every later click).
          if (await page.locator('.layer:not([hidden]) button:has-text("Take it")').count()) { await page.click('.layer:not([hidden]) button:has-text("Take it")'); await page.waitForTimeout(150); }
        }
        const pl = page.locator('.scn-place.avail').first();
        if (await pl.count()) { await pl.click({ timeout: 3000 }).catch(() => {}); await page.locator('.scn-found:not([aria-disabled="true"]):visible').click({ timeout: 500 }).catch(() => {}); }
      }
      if (!(await st()).flags.revealed) throw new Error('never revealed');
      await page.waitForTimeout(1200);
      await page.screenshot({ path: `${out}/${T}-revealed.png` });
      await page.screenshot({ path: `${out}/${T}-revealed-full.png`, fullPage: true });
    });
    await step('formula sheets', async () => {
      for (const k of ['eff', 'cons', 'reb']) { await page.click(`.dial-${k} .info`); await page.waitForTimeout(200); await page.keyboard.press('Escape'); }
      await page.click('.price-row .info'); await page.waitForTimeout(200); await page.screenshot({ path: `${out}/${T}-price.png` }); await page.keyboard.press('Escape');
    });
    await step('the unfolding: the reveal brings no levers or budget; levers arrive later, alone', async () => {
      await closeToasts();
      if (await page.locator('section.budget:not([hidden])').count()) throw new Error('budget panel in run 1');
      if (await page.locator('section.levers:not([hidden])').count()) throw new Error('levers at the reveal');
      // Time is advanced through the console handle: the levers wait for five minutes of play and thickening smoke.
      for (let i = 0; i < 40 && !(await page.evaluate(() => window.rebound.d.features.levers)); i++) {
        await page.evaluate(() => { const r = window.rebound; r.ctx.state = r.model.tick(r.state, r.content, 20); });
        await page.waitForTimeout(120);
      }
      if (!(await page.evaluate(() => window.rebound.d.features.levers))) throw new Error('levers never arrived');
      // the levers panel shows with the next view refresh (1–4 s); its header then wears the mark
      await page.waitForSelector('section.levers .new-mark', { timeout: 6000 }).catch(() => {});
      if (!(await page.locator('.new-mark').count())) throw new Error('no New mark');
      if (await page.locator('section.budget:not([hidden])').count()) throw new Error('budget panel arrived with the levers');
      await rich(0, 1e4); await page.waitForTimeout(1100);
      await closeToasts();
      const r = page.locator('.lev-raise:not([aria-disabled="true"]):visible');
      if (!(await r.count())) throw new Error('no lever to raise');
      await r.first().click(); await page.waitForTimeout(1200);
      await page.locator('.lever.active').first().scrollIntoViewIfNeeded();
      await page.screenshot({ path: `${out}/${T}-lever.png` });
    });
    await step('locked industry checklist', async () => {
      const c = page.locator('.tab.locked');
      if (!(await c.count())) return;
      await c.first().click(); await page.waitForTimeout(250); await page.screenshot({ path: `${out}/${T}-checklist.png` }); await page.keyboard.press('Escape');
    });
    await step('Reckoning, summary, shop, next run', async () => {
      await closeToasts();
      await page.click('.run-foot .btn'); await page.waitForTimeout(250);
      await page.screenshot({ path: `${out}/${T}-confirm.png` });
      await page.click('button:has-text("Close the books")'); await page.waitForTimeout(500);
      await page.screenshot({ path: `${out}/${T}-summary.png` });
      const t0 = (await st()).time; await page.waitForTimeout(600);
      if ((await st()).time !== t0) throw new Error('ticked behind the summary');
      await page.click('button:has-text("Spend Hindsight")'); await page.waitForTimeout(300);
      await page.screenshot({ path: `${out}/${T}-shop.png` });
      const kb = page.locator('.kh-node .btn:not([aria-disabled="true"])');
      if (await kb.count()) { const h0 = (await st()).meta.hindsight; await kb.first().click(); await page.waitForTimeout(200); if ((await st()).meta.hindsight >= h0) throw new Error('know-how click did nothing'); }
      const ib = page.locator('.shop-item .btn:not([aria-disabled="true"]):not(.seat-b)');
      if (await ib.count()) { await ib.first().click(); await page.waitForTimeout(200); }
      const sb = page.locator('.shop-item .seat-b:not([aria-disabled="true"]):visible');
      if (await sb.count()) { await sb.first().click(); await page.waitForTimeout(200); }
      await page.screenshot({ path: `${out}/${T}-shop-after.png` });
      await page.click('button:has-text("Begin the next run")'); await page.waitForTimeout(700);
      if (!((await st()).time > 0)) throw new Error('next run not ticking');
    });
    const o = await overflow(page);
    if (o.sw > o.cw) fail(`OVERFLOW ${T}`);
    if (errs.length) fail(`console ${T}: ${errs.join(' | ')}`);
    await ctx.close();
  }
}

/* ---------------------------------------------------------------- first (real game, every look) */
// The first screen of every Industry in the real game, at phone (also at the largest text size and at 360 px) and
// desk sizes, for the cohesion pass: screenshots plus two checks. (1) Nothing important is cut off with an ellipsis.
// (2) A phone's first screen shows the header and gauges, the picture and a way to act (the sell button, the chip).
// All five Industries are opened through the console handle and given a few uses and improvements (screenshot use
// only: not a balance or unlock test). Writes shots/first-<industry>-<size>.png.
async function makeLate(page) {
  return page.evaluate(() => {
    const r = window.rebound, m = r.model, c = r.content;
    let s = r.state;
    const sectors = { ...s.sectors };
    for (const id of c.sectorOrder) {
      if (sectors[id].open) continue;
      const def = c.sectors[id]; const apps = {};
      for (const a of def.applications) { const av = a.visibleBelow === Infinity; apps[a.id] = { available: av, founded: av && a.foundCost <= 0, satMul: 1, peakD: 0 }; }
      sectors[id] = { ...sectors[id], open: true, reserve: def.reserve, reserveMax: def.reserve, apps };
    }
    s = { ...s, sectors };
    const safe = (x) => !m.derive(m.fastForward(x, c, 120), c).pendingReckoning;
    const kept = [s];
    for (let round = 0; round < 30; round++) {
      s = { ...s, capital: s.capital + 1e4 * Math.pow(1.8, round), mandate: (s.mandate || 0) + 50 };
      const vs = m.upgradeViews(s, c).filter((v) => v.visible && !v.maxed && v.affordable && !v.excludedBy).sort((a, b) => a.cost - b.cost);
      for (const v of vs.slice(0, 4)) { const n = m.buyUpgrade(s, c, v.def.id); if (n !== s) s = n; }
      const d = m.derive(s, c);
      for (const id of c.sectorOrder) for (const a of c.sectors[id].applications) if (d.sectors[id]?.apps[a.id]?.canFound) s = m.foundApp(s, c, a.id);
      const prev = s; s = m.fastForward(s, c, 10);
      if (m.derive(s, c).pendingReckoning) { s = prev; break; }
      kept.push(s);
    }
    while (kept.length > 1 && !safe(s)) s = kept.pop();
    // a late save has met every system (the unfolding)
    s = { ...s, meta: { ...s.meta, features: Object.fromEntries(Object.keys(c.features || {}).map((k) => [k, 0])) } };
    for (const id of c.sectorOrder) { const n = m.drawBudget(s, c, id); if (n) s = n; }
    for (const v of m.leverViews(s, c).filter((v) => v.visible && v.canRaise).slice(0, 3)) { const n = m.setLever(s, c, v.def.id, 1); if (n) s = n; }
    return m.serialize(s);
  });
}
const cutOff = (page) => page.evaluate(() => {
  const bad = [];
  for (const el of document.querySelectorAll('.cockpit *, .feed *, .dock *')) {
    if (!el.childNodes.length || !el.textContent.trim()) continue;
    const cs = getComputedStyle(el);
    if (cs.textOverflow !== 'ellipsis' || cs.display === 'none' || !el.getClientRects().length || el.closest('[data-clip="ok"]')) continue;
    if (el.scrollWidth > el.clientWidth + 1) bad.push(`${el.className || el.tagName}: "${el.textContent.trim().slice(0, 40)}"`);
  }
  return bad.slice(0, 8);
});
const firstScreen = (page) => page.evaluate(() => {
  const vh = innerHeight;
  const box = (s) => document.querySelector(s)?.getBoundingClientRect();
  const sell = box('.sell'), cockpit = box('.cockpit'), scene = box('.world-mount'), chip = document.querySelector('.afford-chip');
  const dockTop = box('.dock')?.top ?? vh;
  return {
    cockpit: Math.round(cockpit?.height ?? 0),
    sell: !!sell && sell.bottom <= vh + 1 && sell.top >= 0,
    // At least half the picture's height is between the header and the dock.
    scene: !!scene && (Math.min(scene.bottom, dockTop) - Math.max(scene.top, cockpit?.bottom ?? 0)) >= scene.height * 0.5,
    chip: !chip || chip.hidden || (chip.getBoundingClientRect().top >= 0 && chip.getBoundingClientRect().bottom <= vh),
  };
});
async function first() {
  try { execFileSync('bun', ['run', 'build.ts'], { cwd: root, stdio: 'pipe' }); } catch (e) { console.log('FIRST: build failed'); return; }
  const url = 'file://' + resolve(root, 'dist/index.html');
  // Make the save once.
  const { ctx: c0, page: p0 } = await newPage({ w: 390, h: 844, tag: 'phone' });
  await p0.goto(url); await p0.waitForTimeout(800);
  const save = await makeLate(p0);
  await c0.close();
  const sizes = [{ w: 390, h: 844, tag: 'phone' }, { w: 390, h: 844, tag: 'phone-big', text: 2 }, { w: 360, h: 740, tag: 'narrow' }, { w: 1280, h: 800, tag: 'desk' }];
  for (const sz of sizes) {
    const { ctx, page, errs } = await newPage({ ...sz, dpr: sz.tag === 'desk' ? 1 : 2 });
    await ctx.addInitScript(([t, ts]) => {
      if (sessionStorage.getItem('seeded')) return; sessionStorage.setItem('seeded', '1');
      localStorage.setItem('rebound.save.v1', t); localStorage.setItem('rebound.save.v1.at', String(Date.now()));
      if (ts) localStorage.setItem('rebound.ui.prefs', JSON.stringify({ textSize: ts }));
    }, [save, sz.text ?? 0]);
    await page.goto(url); await page.waitForTimeout(1500);
    const ids = await page.evaluate(() => window.rebound.content.sectorOrder);
    for (const id of ids) {
      if (filter && !id.includes(filter)) continue;
      await page.evaluate((i) => { window.rebound.ctx.selectSector(i); for (let i = 0; i < 8; i++) document.querySelector('.note-slot:not([hidden]) .note-x')?.click(); window.scrollTo(0, 0); }, id);
      await page.waitForTimeout(1400);
      await page.evaluate(() => { for (let i = 0; i < 8; i++) document.querySelector('.note-slot:not([hidden]) .note-x')?.click(); });
      await page.waitForTimeout(300);
      const look = await page.evaluate(() => document.documentElement.dataset.look);
      const o = await overflow(page);
      if (o.sw > o.cw) fail(`OVERFLOW first ${id}/${sz.tag}: ${o.sw} > ${o.cw}`);
      const cut = await cutOff(page);
      if (cut.length && sz.tag !== 'desk-x') fail(`CUT OFF first ${id}/${sz.tag}: ${cut.join(' | ')}`);
      const fs = await firstScreen(page);
      if (sz.tag !== 'desk' && !(fs.sell && fs.scene && fs.chip)) fail(`FIRST SCREEN ${id}/${sz.tag}: sell ${fs.sell} scene ${fs.scene} chip ${fs.chip}`);
      await page.screenshot({ path: `${out}/first-${id}-${sz.tag}.png` });
      console.log(`first ${id} (${look}) ${sz.tag}: cockpit ${fs.cockpit}px of ${sz.h}, sell ${fs.sell}, scene ${sz.tag === 'desk' ? 'n/a (beside)' : fs.scene}, chip ${fs.chip}${cut.length ? `, cut off ${cut.length}` : ''}`);
    }
    if (errs.length) fail(`first/${sz.tag}: ${errs.slice(0, 3).join(' | ')}`);
    await ctx.close();
  }
}

/* ---------------------------------------------------------------- m2 (mock): every M2 element */
// `node tools/shot.mjs m2 [filter]`: the pace choice, the dividend card, the sink line, a settled row and the Settle
// ceremony, the Commons, standing orders, the Charter choice and the run header, the return ledger (held and plain), the
// respec confirm, run history, the settings (sound off until tapped; the survey's disclosure and switch), the purchase
// moment, the time-lapse summary with "Save picture", the rebound past 1,000%, the tab row's "more" cue. Phone and desk;
// the 360 px narrow size for overflow.
async function m2() {
  for (const sz of SIZES) {
    if (filter && !sz.tag.includes(filter)) continue;
    const { ctx, page, errs } = await newPage({ ...sz, dpr: 1 });
    // Count AudioContexts made: none may exist until sound is turned on from a tap.
    await ctx.addInitScript(() => {
      window.__ac = 0;
      for (const k of ['AudioContext', 'webkitAudioContext']) {
        const C = window[k]; if (!C) continue;
        window[k] = class extends C { constructor(...a) { super(...a); window.__ac++; } };
      }
    });
    const T = `m2-${sz.tag}`;
    const big = sz.tag !== 'narrow';
    const step = async (name, f) => {
      try { await f(); console.log(`  ok   ${T} ${name}`); }
      catch (e) { fail(`FAIL ${T} ${name}: ${String(e.message).split('\n')[0]}`); }
    };
    const shot = async (n, sel) => {
      if (!big) return;
      if (sel) await page.locator(sel).first().evaluate((el) => el.scrollIntoView({ block: 'center' })).catch(() => {});
      await page.waitForTimeout(200);
      await page.screenshot({ path: `${out}/${T}-${n}.png` });
    };
    const st = () => page.evaluate(() => window.rebound.state);
    const d = () => page.evaluate(() => window.rebound.d);
    const closeToasts = () => page.evaluate(() => { for (let i = 0; i < 8; i++) document.querySelector('.note-slot:not([hidden]) .note-x')?.click(); });
    const go = async (hash) => { await page.goto(mock + hash); await page.waitForTimeout(1300); await closeToasts(); };
    const noOverflow = async (what) => { const o = await overflow(page); if (o.sw > o.cw) throw new Error(`sideways scroll at ${what} (${o.sw} > ${o.cw})`); };

    await go('#mock:m2,away=held');
    await step('return ledger, held: under the gauges, names the hold', async () => {
      if (!(await page.locator('.away:not([hidden])').count())) throw new Error('no ledger');
      const held = await page.locator('.aw-held').textContent();
      if (!/waited for you: smoke at \d+%/.test(held)) throw new Error(`hold not named: ${held}`);
      const g = await page.locator('.gauges').boundingBox(), a = await page.locator('.away').boundingBox();
      if (a.y < g.y + g.height - 1 && sz.tag !== 'desk') throw new Error('ledger over the gauges');
      await shot('away-held', '.away');
      await noOverflow('ledger');
    });
    await step('no AudioContext before sound is turned on', async () => {
      if (await page.evaluate(() => window.__ac)) throw new Error('an AudioContext exists');
    });
    await step('tabs: six Industries, "more" cue, selected in view, dividend badges', async () => {
      const t = await page.evaluate(() => { const r = document.querySelector('.tabs-row'); return { sw: r.scrollWidth, cw: r.clientWidth, more: document.querySelector('.tabs').classList.contains('more-r') }; });
      if (sz.tag !== 'desk' && t.sw > t.cw && !t.more) throw new Error('row scrolls with no cue');
      if (!(await page.locator('.tab.has-div').count())) throw new Error('no dividend badge on a tab');
      await page.evaluate(() => window.rebound.ctx.selectSector('code')); await page.waitForTimeout(500);
      const vis = await page.evaluate(() => { const b = document.querySelector('.tab.sel').getBoundingClientRect(), r = document.querySelector('.tabs-row').getBoundingClientRect(); return b.left >= r.left - 1 && b.right <= r.right + 1; });
      if (!vis) throw new Error('the selected tab is off the edge');
      await shot('tabs-code');
      await page.evaluate(() => window.rebound.ctx.selectSector('steam')); await page.waitForTimeout(500);
    });
    await step('reserve row keeps the whole resource name', async () => {
      await page.evaluate(() => window.rebound.ctx.selectSector('code')); await page.waitForTimeout(400);
      const clip = await page.evaluate(() => { const e = document.querySelector('.res-lbl'); return e.scrollWidth > e.clientWidth + 1 || getComputedStyle(e).textOverflow === 'ellipsis' && e.scrollWidth > e.clientWidth; });
      const txt = await page.locator('.res-lbl').textContent();
      if (clip || txt !== 'Human attention') throw new Error(`reserve name cut: ${txt}`);
      await page.evaluate(() => window.rebound.ctx.selectSector('steam')); await page.waitForTimeout(400);
    });
    await page.click('.away button:has-text("Carry on")').catch(() => {});
    await step('sink line on the sparkline', async () => {
      const pts = await page.locator('.sp-sink').getAttribute('points');
      if (!pts || pts.split(' ').length < 2) throw new Error('no sink line');
      if (!(await page.locator('.k-sink:visible').count())) throw new Error('no "the sink" key');
    });
    await step('the dividend card: oldest offer, amounts × pace, count; choose one', async () => {
      await page.locator('.divs').scrollIntoViewIfNeeded();
      const n0 = (await st()).pendingDividends.length;
      if (!(await page.locator('.divs:not([hidden]) .dv-opt').count())) throw new Error('no card');
      const fx = await page.locator('.dv-fx').first().textContent();
      if (!/96 seconds/.test(fx)) throw new Error(`amount not × pace: ${fx}`);
      if (!(await page.locator('.dv-n:visible').count())) throw new Error('no count of waiting offers');
      await shot('dividend', '.divs');
      await page.locator('.dv-opt').nth(1).click(); await page.waitForTimeout(250);
      const s = await st();
      if (s.pendingDividends.length !== n0 - 1) throw new Error('not chosen');
      if (!s.sectors.steam.dividends.includes('dv.reading')) throw new Error('wrong option recorded');
    });
    await step('budget: decade against the drawn wellbeing, lean/full ledger, the sky, Settle', async () => {
      await page.locator('.budget').scrollIntoViewIfNeeded();
      if (!(await page.locator('.bud-sub:visible').count())) throw new Error('no decade wellbeing line');
      if (!(await page.locator('.ledger li.lean').count()) || !(await page.locator('.ledger li.full').count())) throw new Error('ledger does not mark lean and full');
      if (!(await page.locator('.sky-clear:visible').count())) throw new Error('clear level not marked');
      await shot('budget', '.budget');
      await page.click('.bud-settle'); await page.waitForTimeout(250);
      if (!(await page.locator('.settle-sheet .paper-head:has-text("Steam settles")').count())) throw new Error('no ceremony');
      await shot('settle-ceremony');
      await page.click('.settle-sheet button:has-text("Settle Steam")'); await page.waitForTimeout(300);
      if (!(await st()).sectors.steam.settled) throw new Error('not settled');
      if (!(await page.locator('.settled-row:visible').count())) throw new Error('no settled row');
      await shot('settled', '.budget');
      await page.click('.settled-row button:has-text("Unsettle")'); await page.waitForTimeout(150);
      const q = await page.locator('.settled-row .confirm-box p').textContent();
      if (!/dividend stops/.test(q)) throw new Error('unsettle confirm does not name the loss');
      await page.click('.settled-row button:has-text("Unsettle it")'); await page.waitForTimeout(250);
      if ((await st()).sectors.steam.settled) throw new Error('not unsettled');
    });
    await step('a settled Industry: quiet row with held since', async () => {
      await page.evaluate(() => window.rebound.ctx.selectSector('light')); await page.waitForTimeout(500);
      const t = await page.locator('.st-t').textContent();
      if (!/Held since \d{4}/.test(t)) throw new Error(`no "held since": ${t}`);
      await shot('settled-light', '.budget');
      await page.evaluate(() => window.rebound.ctx.selectSector('steam')); await page.waitForTimeout(400);
    });
    await step('the Commons: grouped, fund first, build one', async () => {
      await page.locator('.commons').scrollIntoViewIfNeeded();
      if (!(await page.locator('.commons:not([hidden]) .cm-gt').count())) throw new Error('no groups');
      await shot('commons', '.commons');
      const lv0 = (await st()).commons.levels['cm.park'] ?? 0;
      await page.locator('.up.cm[data-cm="cm.park"] .buy').click(); await page.waitForTimeout(250);
      if (((await st()).commons.levels['cm.park'] ?? 0) !== lv0 + 1) throw new Error('not built');
    });
    await step('recycle offers the Commons', async () => {
      if (!(await page.locator('.recycle .seg-b:has-text("To the Commons")').count())) throw new Error('no Commons option');
    });
    await step('standing orders: payback, a switch per Industry, Civil Service levers, Treasury list', async () => {
      await page.locator('.orders').scrollIntoViewIfNeeded();
      await page.click('.od-market .seg-b:has-text("10 min")'); await page.waitForTimeout(200);
      if ((await st()).meta.orders.market.paybackMax !== 600) throw new Error('payback not set');
      if (!/10 minutes/.test(await page.locator('.od-market .od-txt').textContent())) throw new Error('payback not worded');
      await page.locator('.od-market .chip-t:has-text("Motion")').click(); await page.waitForTimeout(200);
      if ((await st()).meta.orders.market.sectors.motion !== false) throw new Error('switch did not patch');
      await page.locator('.od-treasury .chip-t').first().click(); await page.waitForTimeout(200);
      if ((await st()).meta.orders.treasury.projects.length !== 3) throw new Error('project not added');
      if (!/Next look at the books/.test(await page.locator('.od-next').textContent())) throw new Error('no next tick line');
      await shot('orders', '.orders');
    });
    await step('purchase moment: card stamped, needles swing', async () => {
      await page.evaluate(() => { const r = window.rebound; r.ctx.state = { ...r.state, capital: 1e9 }; r.ctx.refreshAll(); });
      await page.waitForTimeout(400);
      const card = page.locator('.up.afford:not(.cm)').filter({ hasNot: page.locator('.holdable') }).first();
      await card.evaluate((el) => el.scrollIntoView({ block: 'center' }));
      await card.locator('.buy').click(); await page.waitForTimeout(150);
      if (await page.locator('.layer:not([hidden]) button:has-text("Take it")').count()) { await page.click('.layer:not([hidden]) button:has-text("Take it")'); await page.waitForTimeout(150); }
      await page.waitForTimeout(150);
      const stamped = await page.locator('.stamped').count();
      if (!stamped) throw new Error('no stamp');
      await shot('purchase');
    });
    await step('settings: sound off until tapped, survey disclosed, closing deletes it', async () => {
      await page.evaluate(() => localStorage.setItem('rebound.playledger', '{"v":1,"days":{}}'));
      await page.click('.tb-menu'); await page.waitForTimeout(250);
      await page.locator('.setting.survey').scrollIntoViewIfNeeded();
      const txt = await page.locator('.setting.survey p').textContent();
      if (!/kept on this device, never in the save and never sent anywhere/.test(txt)) throw new Error('disclosure missing');
      await shot('settings', '.setting.snd');
      if (await page.evaluate(() => window.__ac)) throw new Error('AudioContext before the tap');
      await page.click('.setting.snd .tog'); await page.waitForTimeout(300);
      if (!(await page.evaluate(() => window.__ac))) throw new Error('no AudioContext after the tap');
      if (!(await page.locator('.snd-more:visible').count())) throw new Error('no volumes');
      await page.click('.setting.snd .tog'); await page.waitForTimeout(100);
      await page.click('.setting.survey .tog'); await page.waitForTimeout(150);
      if (await page.evaluate(() => localStorage.getItem('rebound.playledger'))) throw new Error('survey not deleted');
      await page.click('.setting.survey .tog'); await page.waitForTimeout(100);
      await page.keyboard.press('Escape');
    });
    await step('run history in the statistics', async () => {
      await page.click('.tb-menu'); await page.waitForTimeout(200);
      await page.click('.sheet button:has-text("Statistics")'); await page.waitForTimeout(250);
      if ((await page.locator('.run-row').count()) < 2) throw new Error('no run history');
      await page.locator('.run-row').first().evaluate((el) => { el.open = true; el.scrollIntoView({ block: 'center' }); });
      if (!(await page.locator('.run-row[open] .run-secs li').count())) throw new Error('no per-Industry summary');
      await shot('runs');
      await page.keyboard.press('Escape');
    });
    await step('rebound past 1,000% reads "well past"', async () => {
      await go('#mock:rich,reveal,late');
      const v = await page.locator('.dial-reb .dial-val').textContent();
      if (v !== '>1,000%') throw new Error(`dial reads ${v}`);
      await shot('rebound-late');
    });
    await step('return ledger, plain', async () => {
      await go('#mock:m2,away=plain');
      if (!(await page.locator('.away:not([hidden]) .aw-lines li.awl-broken').count())) throw new Error('no broken line');
      await shot('away-plain', '.away');
    });
    await step('between runs: Charter choice, respec confirm; the run header names the Charter', async () => {
      await go('#mock:m2,fresh');
      if (!(await page.locator('.sheet .charters:not([hidden]) .ch-card').count())) throw new Error('no Charter offer');
      await page.click('.sheet .unlearn'); await page.waitForTimeout(150);
      const q = await page.locator('.sheet .kh .confirm-box p').first().textContent();
      if (!/\d+ Hindsight comes back/.test(q)) throw new Error('respec confirm does not state the refund');
      await shot('respec');
      const h0 = (await st()).meta.hindsight;
      await page.click('.sheet .kh button:has-text("Unlearn it")'); await page.waitForTimeout(200);
      if (!((await st()).meta.hindsight > h0)) throw new Error('no refund');
      const card = page.locator('.sheet .ch-card').first();
      await card.evaluate((el) => el.scrollIntoView({ block: 'center' }));
      const name = await card.locator('.ch-n').textContent();
      await card.click(); await page.waitForTimeout(200);
      if (!(await st()).meta.charter) throw new Error('not chosen');
      await shot('charter');
      await page.click('.sheet button:has-text("Begin the next run")'); await page.waitForTimeout(400);
      const rl = await page.locator('.runline').textContent();
      if (!rl.includes(name)) throw new Error(`header does not name the Charter: ${rl}`);
    });
    await step('the Reckoning: time-lapse replay and "Save picture"', async () => {
      await go('#mock:rich,reveal,light');
      await page.evaluate(async () => {
        const r = window.rebound;
        for (let i = 0; i < 60; i++) {
          let s = r.ctx.state;
          for (const u of r.model.upgradeViews(s, r.content)) if (u.affordable && !u.def.excludes) s = r.model.buyUpgrade(s, r.content, u.def.id);
          for (const id of r.content.sectorOrder) for (const a of r.content.sectors[id].applications) { const n = r.model.foundApp(s, r.content, a.id); if (n !== s) s = n; }
          r.ctx.state = r.model.tick(s, r.content, 10); r.ctx.refreshAll();
          await new Promise((ok) => setTimeout(ok, 5));
        }
        r.ctx.state._forcePending = true; r.ctx.refreshAll();
      });
      await page.waitForTimeout(600);
      await page.click('text=Face the Reckoning'); await page.waitForTimeout(big ? 6000 : 1500);
      if (!(await page.locator('.lapse .lp-stage .scn, .lapse .lp-stage svg').count())) throw new Error('no replay picture');
      await shot('timelapse');
      if (sz.tag === 'phone') {
        const dl = page.waitForEvent('download', { timeout: 20000 });
        await page.click('.lapse button:has-text("Save before and after")');
        const f = await dl;
        await f.saveAs(`${out}/${T}-card.png`);
      }
      await page.locator('.sheet .charters').evaluate((el) => el.scrollIntoView({ block: 'center' })).catch(() => {});
      await shot('summary-charter');
      await noOverflow('summary');
    });
    const o = await overflow(page);
    if (o.sw > o.cw) fail(`OVERFLOW ${T}`);
    if (errs.length) fail(`console ${T}: ${errs.slice(0, 4).join(' | ')}`);
    await ctx.close();
  }
}

/* ---------------------------------------------------------------- m3 */
// M3: every new element on the mock at phone, landscape, narrow and desk sizes (design/scratch/m3-ui-progress.md).
async function m3() {
  const M3SIZES = [{ w: 390, h: 844, tag: 'phone' }, { w: 844, h: 390, tag: 'land' }, { w: 320, h: 700, tag: 'narrow' }, { w: 1280, h: 800, tag: 'desk' }];
  for (const sz of M3SIZES) {
    if (filter && !sz.tag.includes(filter)) continue;
    const { ctx, page, errs } = await newPage({ ...sz, dpr: sz.tag === 'phone' ? 2 : 1 });
    const T = `m3-${sz.tag}`;
    const big = sz.tag === 'phone' || sz.tag === 'desk' || sz.tag === 'land';
    const step = async (name, f) => {
      try { await f(); console.log(`  ok   ${T} ${name}`); }
      catch (e) { fail(`FAIL ${T} ${name}: ${String(e.message).split('\n')[0]}`); }
    };
    const shot = async (n, sel, block = 'start') => {
      if (!big) return;
      if (sel) await page.locator(sel).first().evaluate((el, b) => { el.scrollIntoView({ block: b }); if (b === 'start') window.scrollBy(0, -(document.querySelector('.cockpit')?.getBoundingClientRect().right <= el.getBoundingClientRect().left + 1 ? 0 : (document.querySelector('.cockpit')?.getBoundingClientRect().height ?? 0) + 8)); }, block).catch(() => {});
      await page.waitForTimeout(250);
      await page.screenshot({ path: `${out}/${T}-${n}.png` });
    };
    const closeToasts = () => page.evaluate(() => { for (let i = 0; i < 8; i++) document.querySelector('.note-slot:not([hidden]) .note-x')?.click(); });
    const go = async (hash, wait = 1300) => { await page.goto(mock + hash); await page.waitForTimeout(wait); await closeToasts(); };
    const noOverflow = async (what) => { const o = await overflow(page); if (o.sw > o.cw) throw new Error(`sideways scroll at ${what} (${o.sw} > ${o.cw})`); };
    const visible = (sel) => page.evaluate((s) => [...document.querySelectorAll(s)].some((e) => e.getClientRects().length && !e.closest('[hidden]')), sel);
    // (The Market's reason for waiting is not a locked system: it explains the Market, which is open.)
    const M3SEL = ['section.mech', 'section.letters', 'section.survey', '.arc-link', '.lev-bite', '.histories', '.bank-row', '.od-dispatch', '.od-kind', '.news-spot svg'];

    await step('fresh game: nothing of M3 visible', async () => {
      await go('#mock');
      for (const s of M3SEL.filter((x) => x !== '.news-spot svg')) if (await visible(s)) throw new Error(`${s} visible in a fresh game`);
      await noOverflow('fresh');
      await shot('fresh');
    });
    await step('run 3 (M2, M3 locked): nothing of M3 visible', async () => {
      await go('#mock:m2');
      for (const s of M3SEL.filter((x) => x !== '.news-spot svg')) if (await visible(s)) throw new Error(`${s} visible before its feature`);
      const menu = await page.evaluate(() => { window.rebound.ctx.openMenu(); return document.querySelector('.sheet')?.textContent ?? ''; });
      if (/The Archive|Fifty Years|The Coal Age, settled/.test(menu)) throw new Error('the menu names a locked system');
      await page.keyboard.press('Escape');
    });

    await go('#mock:m3,letter=3');
    await step('a letter with three answers: priced, one unaffordable with its reason, the default marked', async () => {
      const n = await page.locator('.letter .lt-arm').count();
      if (n !== 3) throw new Error(`${n} answers`);
      if (!(await page.locator('.lt-arm[aria-disabled="true"]').count())) throw new Error('no unaffordable answer');
      const why = await page.locator('.lt-arm[aria-disabled="true"] .lt-why').first().textContent();
      if (!/Needs/.test(why)) throw new Error(`no reason: ${why}`);
      if (!(await page.locator('.lt-default').count())) throw new Error('default not marked');
      const lapse = await page.locator('.lt-lapse').textContent();
      if (!/waits .* if left/.test(lapse)) throw new Error(`no countdown: ${lapse}`);
      if (await page.locator('.sheet-open, .layer:not([hidden])').count()) throw new Error('the letter opened over the page');
      await shot('letter-3', '.letter');
      await noOverflow('letter');
    });
    await step('modifiers in force with time left', async () => {
      if (!(await page.locator('.mods li').count())) throw new Error('no modifier line');
      const t = await page.locator('.mod-t').first().textContent();
      if (!/left/.test(t)) throw new Error(t);
    });
    await step('answer the letter: it goes, the answer is remembered, the paper prints the reply', async () => {
      const before = await page.evaluate(() => window.rebound.state.dispatch.answered.length);
      await closeToasts();
      await page.locator('.lt-arm:not([aria-disabled="true"])').first().click();
      await page.waitForTimeout(500);
      if (await page.locator('.lt-list .letter').count()) throw new Error(`letter still waiting: ${JSON.stringify(await page.evaluate(() => window.rebound.state.dispatch.pending))}`);
      const after = await page.evaluate(() => window.rebound.state.dispatch.answered.length);
      if (after !== before + 1) throw new Error('not answered');
      const sum = await page.locator('.lt-past summary').textContent();
      if (!/Letters this run, \d/.test(sum)) throw new Error(sum);
    });
    await step('the seam ladder: sink the next seam', async () => {
      await shot('seams', 'section.mech');
      const n0 = await page.evaluate(() => window.rebound.state.sectors.steam.seamsSunk);
      await page.locator('.seam-sink').click();
      await page.waitForTimeout(400);
      const n1 = await page.evaluate(() => window.rebound.state.sectors.steam.seamsSunk);
      if (n1 !== n0 + 1) throw new Error(`seams ${n0} → ${n1}`);
      if (await page.locator('.seam.sunk').count() < n1 + 1) throw new Error('ladder not patched');
    });
    await step('a lever that bites back', async () => {
      if (!(await visible('.lev-bite'))) throw new Error('no bite line');
      const t = await page.locator('.lev-bite').first().textContent();
      if (!/Bites back/.test(t) || !/[Uu]nless|Held off/.test(t)) throw new Error(t);
      await shot('bite', '.lev-bite', 'center');
    });
    await step('standing orders: the Market says why it waits', async () => {
      const t = await page.locator('.od-why').first().textContent();
      if (!/Waiting|bought|settled|Switched/.test(t)) throw new Error(t);
    });
    for (const sec of ['light', 'motion', 'compute', 'code']) {
      await step(`mechanic instrument: ${sec}`, async () => {
        await page.evaluate((s) => window.rebound.ctx.selectSector(s), sec);
        await page.waitForTimeout(700);
        const kind = await page.locator('section.mech').getAttribute('data-kind');
        const want = { light: 'load', motion: 'travel', compute: 'free', code: 'upkeep' }[sec];
        if (kind !== want) throw new Error(`kind ${kind}`);
        if (sec === 'light' && (await page.locator('.load-chart .lb').count()) !== 24) throw new Error('not 24 bars');
        if (sec === 'compute' && !(await page.locator('.ptag').count())) throw new Error('no price tag');
        await noOverflow(sec);
        await shot(`mech-${sec}`, 'section.mech');
      });
    }
    await page.evaluate(() => window.rebound.ctx.selectSector('steam'));
    await step('the Archive: browse, filter, search, read', async () => {
      await page.evaluate(() => window.rebound.ctx.openArchive());
      await page.waitForTimeout(400);
      const unread0 = await page.locator('.arc-note.unread:not([hidden])').count();
      if (!unread0) throw new Error('nothing unread');
      if (!(await page.locator('.arc-locked').count())) throw new Error('no locked titles');
      await page.locator('.arc-note:not([hidden]) summary').first().click();
      await page.waitForTimeout(200);
      if (!(await page.locator('.arc-src li').count())) throw new Error('no sources');
      const read = await page.evaluate(() => JSON.parse(localStorage.getItem('rebound.ui.prefs') || '{}').archiveRead?.length ?? 0);
      if (!read) throw new Error('read mark not kept');
      await shot('archive');
      await page.fill('.arc-q', 'coal');
      await page.waitForTimeout(150);
      const shown = await page.locator('.arc-note:not([hidden])').count();
      if (!shown) throw new Error('search found nothing');
      await page.locator('.arc-chips .chip-t', { hasText: 'All' }).click();
      await noOverflow('archive');
      await page.keyboard.press('Escape');
    });

    await go('#mock:m3,letter=0', 1500);
    await step('a letter arrives on the note line and waits in the feed', async () => {
      await page.waitForFunction(() => window.rebound.d.dispatch.pending.length > 0, null, { timeout: 20000 });
      await page.waitForTimeout(300);
      if (!(await visible('.letter'))) throw new Error('no letter in the feed');
      if ((await page.locator('.lt-arm').count()) !== 2) throw new Error('not two answers');
      await shot('letter-2', '.letter');
    });
    await step('left alone, it lapses to its default, reported once', async () => {
      await closeToasts();
      await page.evaluate(() => {
        const r = window.rebound; let s = JSON.parse(JSON.stringify(r.state));
        s.dispatch.pending[0].expiresAt = s.time + 1.5;
        for (let i = 0; i < 3; i++) s = r.model.tick(s, r.content, 1);
        r.ctx.state = s; r.ctx.refreshAll();
      });
      // Other notes from the same stretch queue ahead of it: step through them.
      let note = '', seen = false;
      for (let i = 0; i < 8 && !seen; i++) {
        await page.waitForTimeout(300);
        note = (await page.locator('.note-slot').textContent()) ?? '';
        if (/lapsed/.test(note)) seen = true; else await page.evaluate(() => document.querySelector('.note-slot:not([hidden]) .note-x')?.click());
      }
      if (!seen) throw new Error(`note: ${note}`);
      const by = await page.evaluate(() => window.rebound.state.dispatch.answered.at(-1)?.by);
      if (by !== 'default') throw new Error(by);
    });

    for (const dir of ['up', 'down', 'flat']) {
      await step(`the Proprietor's Day, published ${dir}`, async () => {
        await go(`#mock:m3,letter=0,survey=${dir}`);
        if (!(await visible('.sv-gauges'))) throw new Error('no second gauges');
        const h = await page.locator('.sv-clip-h').textContent();
        if (dir === 'up' && !/lengthens|longer|labour up|grows/.test(h)) throw new Error(h);
        if (dir === 'down' && !/shortens|shorter|saves/.test(h)) throw new Error(h);
        if (!(await visible('.od-kind'))) throw new Error('no closing/opening labels');
        await shot(`survey-${dir}`, 'section.survey');
      });
    }
    await step('file a return, buy the card, the return printed; closing the survey withdraws it', async () => {
      await go('#mock:m3,letter=0,survey=none,persist,rich', 1500);
      await page.evaluate(() => document.querySelector('section.survey')?.scrollIntoView());
      await page.locator('.survey .sv-file').click();
      await page.waitForTimeout(400);
      if (!(await page.evaluate(() => !!window.rebound.state.meta.returns.household))) throw new Error('not filed');
      if (!(await visible('.pamphlet'))) throw new Error('no pamphlet');
      await shot('pamphlet', '.pamphlet');
      await page.evaluate(() => { window.rebound.state.capital = 1e6; });
      await page.waitForTimeout(1500);
      await page.locator('.up[data-up="steam.proprietorsDay"] .buy').click();
      await page.waitForTimeout(500);
      if (!(await page.evaluate(() => window.rebound.state.meta.flags.proprietor))) throw new Error('card not bought');
      if (!(await visible('.sv-gauges'))) throw new Error('no gauges after the card');
      await page.evaluate(() => window.rebound.ctx.openMenu());
      await page.locator('.setting.survey .tog').click();
      await page.waitForTimeout(400);
      const left = await page.evaluate(() => ({ key: localStorage.getItem('rebound.playledger'), ret: !!window.rebound.state.meta.returns.household }));
      if (left.key != null) throw new Error('ledger key kept');
      if (left.ret) throw new Error('return kept in the save');
      await page.keyboard.press('Escape');
    });
    await step('the first ending: credits, retrospective, back to play; again from the menu', async () => {
      await go('#mock:m3,letter=0,ending', 1200);
      await page.waitForSelector('.credits-sheet', { timeout: 15000 });
      await page.waitForTimeout(sz.tag === 'phone' ? 7000 : 500);
      await shot('credits');
      await noOverflow('credits');
      await page.locator('.sheet button', { hasText: 'Read the retrospective' }).click();
      await page.waitForTimeout(300);
      if ((await page.locator('.rt-list li').count()) < 5) throw new Error('retrospective thin');
      await shot('retro');
      await page.locator('.sheet-foot button.primary').click();
      await page.waitForTimeout(300);
      if (await page.locator('.layer:not([hidden])').count()) throw new Error('did not return to play');
      await page.evaluate(() => window.rebound.ctx.openMenu());
      const crT = await page.evaluate(() => window.rebound.content.ending?.credits?.title ?? 'Fifty Years');
      if (!(await page.locator('.sheet button', { hasText: crT }).count())) throw new Error('no credits in the menu');
      await page.keyboard.press('Escape');
    });
    await step('a History between runs: offered first, cleared folded, chosen', async () => {
      await go('#mock:m3,letter=0,fresh', 1500);
      await page.waitForSelector('.histories:not([hidden])', { timeout: 5000 });
      const n = await page.locator('.histories .hs-list').first().locator('.hs-card').count();
      if (!n) throw new Error('none offered');
      await page.locator('.histories .hs-card').first().click();
      await page.waitForTimeout(300);
      if (!(await page.locator('.hs-card[aria-checked="true"]').count())) throw new Error('not chosen');
      await shot('history', '.histories');
      await noOverflow('history');
    });
    if (errs.length) fail(`${T} console: ${errs.slice(0, 4).join(' | ')}`);
    await ctx.close();
  }
}

/* ---------------------------------------------------------------- M4 (real build) */
// The page meets every M4 view as the core writes it: states are made in the page from a fresh run through the real model
// (window.rebound), as tools/perf.mjs makes its states. `m4`: the postcard row with seven tabs, Iron's order book, Fishing
// unsurveyed then the Board's Survey card (and filed), a wager answered both ways, Steam before and after `estimates`.
// `m4real`: from the Act I ending dump (M4_ENDING=path, default design/scratch/m4-fixtures/act1-ending.json, real
// content): the credits, then the next run with the capstone group and Motion as a Preview; from an M3 save
// (design/scratch/finish/human-run9.json): the save notice shown once.
const M4_MAKE = (variant) => {
  const R = window.rebound, m = R.model, C = R.content;
  let s = JSON.parse(JSON.stringify(m.createState(C)));
  s.meta.reckonings = 6; s.flags.revealed = true; s.capital = 5e7; s.mandate = 5000;
  s.meta.features = s.meta.features || {};
  for (const f of Object.keys(C.features || {})) if (f !== 'estimates' || variant === 'estimates') s.meta.features[f] = 0;
  if (variant === 'estimates') s.meta.flags['survey:fishing'] = true;
  const open = variant === 'seven' ? C.sectorOrder : ['steam', 'light', 'iron', 'fishing'];
  for (const id of open) {
    const def = C.sectors[id], st = s.sectors[id];
    st.open = true; s.meta.sectorsOpened[id] = true;
    if (!st.reserve) { st.reserve = def.reserve; st.reserveMax = def.reserve; }
    st.eta = def.baseEta;
    for (const a of def.applications) if (a.visibleBelow === Infinity) { st.apps[a.id].available = true; if (a.foundCost <= 0) st.apps[a.id].founded = true; }
  }
  for (let i = 0; i < 50; i++) s = m.tick(s, C, 0.1);
  for (let k = 0; k < 4; k++) {
    for (const id of open) {
      for (const a of C.sectors[id].applications) { const t = m.foundApp(s, C, a.id); if (t !== s) s = t; }
      for (const u of C.upgrades.filter((u) => u.sector === id)) { const t = m.buyUpgrade(s, C, u.id); if (t !== s) s = t; }
    }
    for (let i = 0; i < 100; i++) s = m.tick(s, C, 0.1);
  }
  if (variant === 'reveal' || variant === 'revealLarge' || variant === 'estimates') { s = JSON.parse(JSON.stringify(s)); s.sectors.fishing.openFor = 1790; s.time = Math.max(s.time, 1800); }
  // The large gap: the banks fished down to about a third before the Board's vessel puts out.
  if (variant === 'revealLarge') s.seed = (s.seed ^ 0x5eed) >>> 0; // another save, as far as the card's once-a-save key goes
  if (variant === 'revealLarge') s.sectors.fishing.reserve = 0.34 * (s.sectors.fishing.reserveMax || C.sectors.fishing.reserve);
  for (let i = 0; i < 60; i++) s = m.tick(s, C, 0.5);
  if (variant === 'estimates') s = m.drawBudget(s, C, 'steam');
  // A settlement made from the Industry's flows now (the page needs only a believable SettledState to draw).
  const settledOf = (st, id) => {
    const d = m.derive(st, C).sectors[id], x = st.sectors[id];
    const appD = {}, appAdoption = {};
    for (const a of C.sectors[id].applications) if (x.apps[a.id]?.founded) { appD[a.id] = d.apps[a.id]?.demand ?? 0; appAdoption[a.id] = d.apps[a.id]?.adoption ?? 0; }
    return { since: st.time, sinceYear: Math.floor(m.derive(st, C).year), D: d.demand, R: d.resourceUse, ps: d.servicePrice, pPre: d.preLevyPrice, income: d.income,
      P: x.pressure, eta: x.eta, defect: 1, N0: st.population, spillMul0: 1, extraD0: 0, appD, appAdoption };
  };
  if (variant === 'settled') {
    // Late in Act I: Steam, Light and Iron settled, Fishing still in play.
    s = JSON.parse(JSON.stringify(s));
    for (const id of ['steam', 'light', 'iron']) { s.sectors[id].settled = settledOf(s, id); s.sectors[id].settledBefore = true; s.sectors[id].budget = null; }
    for (let i = 0; i < 20; i++) s = m.tick(s, C, 0.5);
  }
  if (variant === 'capstone') {
    // The run after the Act I ending: the four Coal Age Industries capstoned (meta.world.capstone), Motion a Preview.
    const meta = JSON.parse(JSON.stringify(s.meta));
    const year = 1911;
    meta.world = { ...(meta.world || {}), capstone: {} };
    for (const id of ['steam', 'light', 'iron', 'fishing']) meta.world.capstone[id] = { act: 'actOne', year, settled: settledOf(s, id) };
    meta.endings = { ...(meta.endings || {}), actOne: { run: meta.reckonings + 1, runSeconds: s.time, totalSeconds: meta.totalSeconds + s.time, year } };
    meta.reckonings += 1;
    s = m.createState(C, meta);
    for (let i = 0; i < 400; i++) s = m.tick(s, C, 0.5);
  }
  R.ctx.replace(s);
  return true;
};

async function m4() {
  try { execFileSync('bun', ['run', 'build.ts'], { cwd: root, stdio: 'pipe' }); }
  catch (e) { console.log('M4: bun run build.ts failed:\n' + String(e.stderr || e.message).split('\n').slice(0, 6).join('\n')); problems++; return; }
  const url = 'file://' + resolve(root, 'dist/index.html');
  const M4SIZES = [{ w: 390, h: 844, tag: 'phone' }, { w: 844, h: 390, tag: 'land' }, { w: 360, h: 740, tag: 'narrow' }, { w: 1280, h: 800, tag: 'desk' }];
  for (const sz of M4SIZES) {
    if (filter && !sz.tag.includes(filter)) continue;
    const { ctx, page, errs } = await newPage({ ...sz, dpr: sz.tag === 'phone' ? 2 : 1 });
    const T = `m4-${sz.tag}`;
    const big = sz.tag !== 'narrow';
    const step = async (name, f) => {
      try { await f(); console.log(`  ok   ${T} ${name}`); }
      catch (e) { fail(`FAIL ${T} ${name}: ${String(e.message).split('\n')[0]}`); }
    };
    const shot = async (n, sel, block = 'start') => {
      if (!big) return;
      if (sel) await page.locator(sel).first().evaluate((el, b) => { el.scrollIntoView({ block: b }); if (b === 'start') window.scrollBy(0, -(document.querySelector('.cockpit')?.getBoundingClientRect().right <= el.getBoundingClientRect().left + 1 ? 0 : (document.querySelector('.cockpit')?.getBoundingClientRect().height ?? 0) + 8)); }, block).catch(() => {});
      else await page.evaluate(() => window.scrollTo(0, 0));
      await page.waitForTimeout(300);
      await page.screenshot({ path: `${out}/${T}-${n}.png` });
    };
    const closeToasts = () => page.evaluate(() => { for (let i = 0; i < 8; i++) document.querySelector('.note-slot:not([hidden]) .note-x')?.click(); });
    const noOverflow = async (what) => { const o = await overflow(page); if (o.sw > o.cw) throw new Error(`sideways scroll at ${what} (${o.sw} > ${o.cw})`); };
    const make = async (v, sector) => {
      await page.evaluate(M4_MAKE, v);
      await page.waitForTimeout(600);
      if (sector) await page.evaluate((id) => window.rebound.ctx.selectSector(id), sector);
      await page.waitForTimeout(1200);
      await closeToasts();
    };
    const text = (sel) => page.evaluate((x) => [...document.querySelectorAll(x)].filter((e) => e.getClientRects().length && !e.closest('[hidden]')).map((e) => e.textContent).join(' | '), sel);

    await step('a new save: the Act title card over the picture', async () => {
      await ctx.clearCookies();
      await page.goto(url); await page.evaluate(() => localStorage.clear()); await page.goto(url);
      await page.waitForTimeout(1300);
      const t = await text('.world-title');
      if (!/Act I/.test(t) || !/Coal Age/.test(t)) throw new Error(`no Act card: ${t}`);
      await shot('act-card');
    });
    await step('seven Industries: the postcard row scrolls and keeps the selected tab in view', async () => {
      await make('seven', 'code');
      await page.waitForTimeout(1500);
      const n = await page.locator('.tabs-row .tab.has-pc').count();
      if (n < 7) throw new Error(`${n} postcards`);
      const prev = await page.locator('.tabs-row .tab.preview').count();
      if (prev < 3) throw new Error(`${prev} Preview tabs`);
      const vis = await page.evaluate(() => { const b = document.querySelector('.tab.sel'), r = document.querySelector('.tabs-row'); const x = b.getBoundingClientRect(), y = r.getBoundingClientRect(); return x.left >= y.left - 1 && x.right <= y.right + 1; });
      if (!vis) throw new Error('the selected tab is out of view');
      const lbl = await page.locator('.tab.preview').first().getAttribute('aria-label');
      if (!/preview/i.test(lbl)) throw new Error(`label: ${lbl}`);
      await noOverflow('seven tabs');
      await shot('seven');
    });
    await step('Iron: the order book, one row per fed Industry, a row selects its tab', async () => {
      await make('open', 'iron');
      const rows = await page.locator('.ob-row').count();
      if (!rows) throw new Error('no order book rows');
      const t = await text('.ob-row');
      if (!/× 0\.\d\d/.test(t)) throw new Error(`no factor: ${t}`);
      await shot('iron', 'section.mech');
      await noOverflow('order book');
      await page.locator('.ob-row').first().click();
      await page.waitForTimeout(500);
      const sel = await page.evaluate(() => window.rebound.ctx.sector);
      if (sel === 'iron') throw new Error('the row did not select its Industry');
      const fed = await text('.mech-fed');
      if (!/order book/.test(fed)) throw new Error(`no fed line on ${sel}: ${fed}`);
    });
    await step('Fishing unsurveyed: catch per trip, a blank survey gauge, never the true stock', async () => {
      await make('open', 'fishing');
      const t = await text('.chart-card');
      if (!/Catch per trip/.test(t) || !/No survey/.test(t)) throw new Error(t);
      const res = await text('.res-lbl');
      if (!/Catch per trip/.test(res)) throw new Error(`reserve says ${res}`);
      const st = await page.evaluate(() => ({ t: Math.round(window.rebound.d.sectors.fishing.stock.world * 100), r: Math.round(window.rebound.d.sectors.fishing.stock.reported * 100) }));
      const shown = await text('.reserve, .chart-card .cg-v');
      if (st.t !== st.r && shown.includes(`${st.t}%`)) throw new Error('the true stock is on the page');
      await shot('fish-unsurveyed', 'section.mech');
      await noOverflow('chart');
    });
    await step('the Board’s Survey card: two columns, File the survey; then the true gauge', async () => {
      await make('reveal', 'fishing');
      await page.waitForSelector('.board-sheet', { timeout: 8000 });
      const cols = await page.locator('.board-card .bc-col').count();
      if (cols !== 2) throw new Error(`${cols} columns`);
      await page.waitForTimeout(2600);
      await page.screenshot({ path: `${out}/${T}-survey-card.png` });
      await noOverflow('survey card');
      await page.locator('.board-sheet .sheet-foot button.primary', { hasText: 'File the survey' }).click();
      await page.waitForTimeout(900);
      const blank = await page.evaluate(() => !document.querySelector('.cg-true .cg-blank')?.hidden);
      const v = await text('.cg-true .cg-v');
      if (blank || !/\d+%/.test(v)) throw new Error(`after filing: blank ${blank}, ${v}`);
      await shot('fish-surveyed', 'section.mech');
      // Once a save: a reload does not show it again.
      await page.evaluate(() => window.rebound.save());
      await page.reload(); await page.waitForTimeout(2200);
      if (await page.locator('.board-sheet').count() && await page.locator('.board-sheet').isVisible()) throw new Error('the card came back');
      // The other variant: a large gap between the catch per trip and the stock.
      await make('revealLarge', 'fishing');
      await page.waitForSelector('.board-sheet', { timeout: 8000 });
      const vr = await page.evaluate(() => document.querySelector('.board-card')?.getAttribute('data-variant'));
      if (vr === 'small') throw new Error('the large variant came out small');
      await page.waitForTimeout(2600);
      await page.screenshot({ path: `${out}/${T}-survey-card-${vr}.png` });
      await page.locator('.board-sheet .sheet-foot button.primary').click();
    });
    await step('a wager answered both ways: hint, both outcomes, won and lost', async () => {
      const res = [];
      for (const holds of [true, false]) {
        await make('open', 'iron');
        const r = await page.evaluate((holds) => {
          const R = window.rebound, C = R.content;
          const d = (C.dispatches || []).find((x) => x.arms.some((a) => a.wager && a.wager.when && a.wager.when.stat === 'reserveFraction'));
          if (!d) return 'no reserve wager in content';
          const i = d.arms.findIndex((a) => a.wager);
          const want = d.arms[i].wager.when;
          const s = JSON.parse(JSON.stringify(R.state));
          const sec = want.sector || d.sector || 'steam';
          const K = s.sectors[sec].reserveMax || C.sectors[sec].reserve;
          const v = Number(want.value), up = want.op === '>=' || want.op === '>';
          s.sectors[sec].reserve = K * Math.max(0.05, Math.min(1, (holds === up) ? Math.min(1, v + 0.3) : Math.max(0.05, v - 0.15)));
          s.dispatch.pending = [{ id: d.id, arrivedAt: s.time, expiresAt: s.time + 900 }];
          R.ctx.replace(s);
          return { id: d.id, arm: i };
        }, holds);
        if (typeof r === 'string') throw new Error(r);
        await page.waitForTimeout(900);
        const hint = await text('.lt-wager .lt-hint');
        const br = await text('.lt-wager .lt-branches');
        if (!hint || !/If so/.test(br) || !/If not/.test(br)) throw new Error(`wager arm not shown: ${hint} / ${br}`);
        if (holds) await shot('wager', '.letter');
        await closeToasts();
        await page.locator('.lt-wager').first().click();
        await page.waitForTimeout(700);
        const won = await page.evaluate((id) => window.rebound.state.dispatch.answered.find((a) => a.id === id)?.won, r.id);
        res.push(won);
        const past = await text('.lt-past');
        if (!/The bet (paid|was lost)/.test(past)) throw new Error(`no result in the letters: ${past}`);
      }
      if (res[0] !== true || res[1] !== false) throw new Error(`results ${JSON.stringify(res)}`);
    });
    await step('Steam before and after estimates: two readings, the full account, the line’s account', async () => {
      await make('open', 'steam');
      if (await text('.res-yrs')) throw new Error('two readings before estimates');
      await shot('steam-before');
      await make('estimates', 'steam');
      const y = await text('.res-yrs');
      if (!/this year’s rate/.test(y) || !/growing/.test(y)) throw new Error(`readings: ${y}`);
      const full = await page.evaluate(() => getComputedStyle(document.querySelector('.dial-cons .d-full')).display !== 'none');
      if (!full) throw new Error('no full-account needle');
      await shot('steam-after');
      await shot('steam-after-budget', 'section.budget');
      await page.waitForTimeout(400);
      const line = await text('.bud-line');
      if (!/full account/.test(line)) throw new Error(`line: ${line} (budget drawn: ${await page.evaluate(() => !!window.rebound.state.sectors.steam.budget)})`);
      await noOverflow('estimates');
    });
    const heights = async () => {
      const ids = await page.evaluate(() => window.rebound.content.sectorOrder.filter((id) => window.rebound.state.sectors[id]?.open));
      const hs = {};
      for (const id of ids) { await page.evaluate((x) => window.rebound.ctx.selectSector(x), id); await page.waitForTimeout(700); hs[id] = await page.evaluate(() => document.documentElement.scrollHeight); }
      return hs;
    };
    await step('late in Act I: each settled Industry is one card; Show the Industry opens it', async () => {
      await make('settled', 'light');
      if (!(await page.locator('.fold-bar:not([hidden])').count())) throw new Error('no fold bar');
      if (await page.locator('section.upgrades').isVisible()) throw new Error('improvements not folded');
      await shot('settled');
      if (sz.tag === 'phone') console.log(`       ${T} scroll heights, late Act I (three settled): ${JSON.stringify(await heights())}`);
      await page.evaluate(() => window.rebound.ctx.selectSector('light'));
      await page.waitForTimeout(600);
      await page.locator('.fold-show').click();
      await page.waitForTimeout(500);
      if (!(await page.locator('section.upgrades').isVisible())) throw new Error('Show the Industry did not open it');
      await page.locator('.fold-show').click();
      await page.waitForTimeout(300);
      await noOverflow('settled');
    });
    await step('the run after the Act I ending: the capstone group, cartouched postcards, no Unsettle', async () => {
      await make('capstone', 'steam');
      const g = await text('.cap-group');
      if (!/Coal Age \(settled 1911\)/.test(g)) throw new Error(`group: ${g}`);
      const rows = await page.locator('.cap-group .cap-row').count();
      if (rows !== 4) throw new Error(`${rows} rows`);
      const caps = await page.locator('.tab.capstoned').count();
      if (caps !== 4) throw new Error(`${caps} capstoned tabs`);
      if (await page.locator('.settled-row .btn', { hasText: 'Unsettle' }).isVisible().catch(() => false)) throw new Error('Unsettle offered');
      await shot('capstone');
      await shot('capstone-group', '.cap-group');
      // The Act I credits, again from the menu (Act name on the masthead, the content's continue label).
      await page.evaluate(() => window.rebound.ctx.openMenu());
      await page.waitForTimeout(400);
      await page.locator('.sheet button', { hasText: 'The Coal Age, settled' }).first().click();
      await page.waitForTimeout(800);
      const cr = await page.evaluate(() => document.querySelector('.credits-sheet')?.textContent ?? '');
      if (!/Act I/.test(cr) || !/The Coal Age, settled/.test(cr)) throw new Error(`credits: ${cr.slice(0, 80)}`);
      await page.screenshot({ path: `${out}/${T}-credits.png` });
      await page.locator('.credits-sheet .sheet-foot button', { hasText: 'The ledger continues' }).click();
      await page.waitForTimeout(400);
      if (sz.tag === 'phone') console.log(`       ${T} scroll heights, capstoned run: ${JSON.stringify(await heights())}`);
      await noOverflow('capstone');
    });
    if (errs.length) fail(`${T} console: ${errs.filter((e) => !/ERR_FAILED/.test(e)).slice(0, 4).join(' | ')}`);
    await ctx.close();
  }
}

async function m4real() {
  try { execFileSync('bun', ['run', 'build.ts'], { cwd: root, stdio: 'pipe' }); }
  catch (e) { console.log('M4REAL: bun run build.ts failed'); problems++; return; }
  const url = 'file://' + resolve(root, 'dist/index.html');
  const endingPath = process.env.M4_ENDING || resolve(root, 'design/scratch/m4-fixtures/act1-ending.json');
  const m3Path = resolve(root, 'design/scratch/finish/human-run9.json');
  for (const sz of [{ w: 390, h: 844, tag: 'phone' }, { w: 1280, h: 800, tag: 'desk' }]) {
    if (filter && !sz.tag.includes(filter)) continue;
    const T = `m4real-${sz.tag}`;
    const step = async (page, name, f) => {
      try { await f(); console.log(`  ok   ${T} ${name}`); }
      catch (e) { fail(`FAIL ${T} ${name}: ${String(e.message).split('\n')[0]}`); }
    };
    const load = async (save) => {
      const r = await newPage({ ...sz, dpr: sz.tag === 'phone' ? 2 : 1 });
      await r.page.addInitScript((sv) => { if (!sessionStorage.getItem('m4r')) { localStorage.clear(); localStorage.setItem('rebound.save.v1', sv); localStorage.setItem('rebound.save.v1.at', String(Date.now())); sessionStorage.setItem('m4r', '1'); } }, save);
      await r.page.goto(url); await r.page.waitForTimeout(2000);
      return r;
    };
    if (existsSync(endingPath)) {
      const { ctx, page, errs } = await load(readFileSync(endingPath, 'utf8'));
      await step(page, 'the Act I ending: the credits, then the ledger continues', async () => {
        // The dump is the state at the step of the ending; one more tick brings the event if it has not fired.
        for (let i = 0; i < 40 && !(await page.locator('.credits-sheet').count()); i++) await page.waitForTimeout(250);
        if (!(await page.locator('.credits-sheet').count())) await page.evaluate(() => window.rebound.ctx.openMenu && document.dispatchEvent(new Event('x')));
        await page.evaluate(() => { if (!document.querySelector('.credits-sheet')) window.__openCredits?.(); });
        await page.screenshot({ path: `${out}/${T}-credits.png` });
        const t = await page.evaluate(() => document.querySelector('.credits-sheet')?.textContent ?? '');
        if (!/Coal Age/.test(t)) throw new Error('no Act I credits');
        await page.locator('.credits-sheet .sheet-foot button', { hasText: 'The ledger continues' }).click();
      });
      await step(page, 'the next run: the capstone group and Motion as a Preview', async () => {
        await page.evaluate(() => { const R = window.rebound; const n = R.model.reckon(R.state, R.content); if (n !== R.state) R.ctx.replace(n); });
        await page.waitForTimeout(800);
        await page.evaluate(() => { for (const b of document.querySelectorAll('.sheet-foot button.primary')) if (/Begin/.test(b.textContent)) b.click(); });
        await page.waitForTimeout(1500);
        const capped = await page.evaluate(() => window.rebound.content.sectorOrder.filter((id) => window.rebound.d.sectors[id]?.capstoned));
        if (!capped.length) throw new Error('no capstoned Industry');
        await page.evaluate((id) => window.rebound.ctx.selectSector(id), capped[0]);
        await page.waitForTimeout(1200);
        const g = await page.evaluate(() => document.querySelector('.cap-group:not([hidden])')?.textContent ?? '');
        if (!/settled \d{4}/.test(g)) throw new Error(`group: ${g}`);
        await page.screenshot({ path: `${out}/${T}-capstone.png` });
        const h = await page.evaluate(() => document.documentElement.scrollHeight);
        console.log(`       ${T} scroll height on a capstoned Industry: ${h}`);
      });
      if (errs.length) fail(`${T} console: ${errs.filter((e) => !/ERR_FAILED/.test(e)).slice(0, 4).join(' | ')}`);
      await ctx.close();
    } else console.log(`  skip ${T} the Act I ending: no ${endingPath}`);
    {
      const { ctx, page, errs } = await load(readFileSync(m3Path, 'utf8'));
      await step(page, 'an M3 save: the notice once, Previews marked', async () => {
        await page.evaluate(() => { for (const b of document.querySelectorAll('.sheet-foot button.primary')) if (/Begin/.test(b.textContent)) b.click(); });
        await page.waitForTimeout(1200);
        const notes = await page.evaluate(() => document.querySelector('.note-line')?.textContent ?? '');
        if (!/Iron and fish join the Coal Age/.test(notes)) throw new Error(`no notice: ${notes}`);
        await page.screenshot({ path: `${out}/${T}-m3save.png` });
        await page.evaluate(() => window.rebound.save());
        await page.reload(); await page.waitForTimeout(2000);
        const again = await page.evaluate(() => document.querySelector('.note-line')?.textContent ?? '');
        if (/Iron and fish join the Coal Age/.test(again)) throw new Error('the notice came back');
      });
      if (errs.length) fail(`${T} console: ${errs.filter((e) => !/ERR_FAILED/.test(e)).slice(0, 4).join(' | ')}`);
      await ctx.close();
    }
  }
}

if (mode === 'scenes' || mode === 'all') await scenes();
if (mode === 'flow' || mode === 'all') await flow(mock);
if (mode === 'checks' || mode === 'all') await checks();
if (mode === 'audit' || mode === 'all') await audit();
if (mode === 'real') await real();
if (mode === 'realplay') await realplay();
if (mode === 'looks') await looks();
if (mode === 'first') await first();
if (mode === 'm2') await m2();
if (mode === 'm3') await m3();
if (mode === 'm4') await m4();
if (mode === 'm4real') await m4real();
await browser.close();
console.log(problems ? `${problems} problem(s)` : 'all clear: no console errors, no overflow, every step passed');
process.exit(problems ? 1 : 0);
