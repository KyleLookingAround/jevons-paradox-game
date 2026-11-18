// Screenshots and a scripted play-through of the game, for visual checks.
//   node tools/shot.mjs [scenes|flow|checks|real|all] [filter]
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
    const closeToasts = async () => { for (const x of await page.locator('.toast-x').all()) await x.click().catch(() => {}); };
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
      if (!(await page.locator('.up.excluded .ruled:has-text("Ruled out by")').count())) throw new Error('no ruled-out card');
    });
    await step('buy an upgrade', async () => {
      const n = Object.values((await st()).upgrades).reduce((a, b) => a + b, 0);
      await page.locator('.up .buy:not([aria-disabled="true"]):visible').first().click(); await page.waitForTimeout(150);
      if (Object.values((await st()).upgrades).reduce((a, b) => a + b, 0) !== n + 1) throw new Error('no upgrade bought');
    });
    await step('found an app', async () => {
      const f = page.locator('.found:not([aria-disabled="true"]):visible').first();
      const id = await f.evaluate((b) => b.closest('.app').dataset.app);
      await f.click(); await page.waitForTimeout(150);
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
      await page.click('.bud-draw'); await page.waitForTimeout(250);
      if (!(await st()).sectors.steam.budget) throw new Error('no budget');
      await page.click('.bud-draw'); await page.waitForTimeout(150);
      if (!(await page.locator('.budget .confirm-box:visible').count())) throw new Error('no redraw confirm');
      await page.click('button:has-text("Keep the line")');
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
      for (let i = 0; i < 4; i++) { await page.locator('.lever:has-text("Fuel duty") .lev-raise').click(); await page.waitForTimeout(120); }
      const lv = (await st()).levers['steam.duty'].level;
      if (lv < 4) throw new Error('duty level ' + lv);
      if (!(await page.locator('.lever:has-text("Fuel duty") .lev-raise:has-text("Tighten")').count())) throw new Error('no Tighten label');
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
      await page.locator('.shop-item:has-text("Board of Trade") .seat-b').click(); await page.waitForTimeout(200);
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
      await page.goto(base + '#mock:won'); await page.waitForTimeout(4500); await shot('win');
      if (!(await page.locator('.paper-head:has-text("Steady State")').count())) throw new Error('no win card');
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
    for (let i = 0; i < 40 && !found; i++) { await page.keyboard.press('Tab'); found = await page.evaluate(() => document.activeElement?.classList.contains('sell')); }
    if (!found) throw new Error('sell button not reachable by Tab');
    const ring = await page.evaluate(() => getComputedStyle(document.activeElement).outlineStyle);
    if (ring === 'none') throw new Error('no visible focus ring on the sell button');
    for (let i = 0; i < 12; i++) await page.keyboard.press('Enter');
    await page.waitForTimeout(100);
    if ((await st()).run.clicks < 12) throw new Error('Enter did not sell');
    await page.waitForTimeout(400);
    let buy = false;
    for (let i = 0; i < 60 && !buy; i++) { await page.keyboard.press('Tab'); buy = await page.evaluate(() => document.activeElement?.classList.contains('buy') && document.activeElement.getAttribute('aria-disabled') !== 'true'); }
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
    const { ctx, page, errs } = await newPage(sz);
    await page.goto(mock + '#mock:persist'); await page.waitForTimeout(800);
    await page.evaluate(() => window.rebound.save());
    const t0 = await page.evaluate(() => window.rebound.state.time);
    await page.evaluate(() => localStorage.setItem('rebound.mock.save.at', String(Date.now() - 25 * 60 * 1000)));
    await page.reload(); await page.waitForTimeout(800);
    const toast = await page.locator('.toast-t:has-text("While you were away")').count();
    const t1 = await page.evaluate(() => window.rebound.state.time);
    await page.screenshot({ path: `${out}/check-away.png` });
    if (!toast) throw new Error('no "While you were away" note');
    if (!(t1 > t0 + 600)) throw new Error(`time did not jump (${t0} → ${t1})`);
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
  await step('toasts do not cover the bottom controls', async () => {
    const { ctx, page } = await newPage(sz);
    await page.goto(mock + '#mock'); await page.waitForTimeout(500);
    await page.evaluate(() => window.rebound.ctx.toast('A test note that is long enough to wrap onto a second line on a phone.'));
    await page.waitForTimeout(300);
    const t = await page.locator('.toast').boundingBox(), sell = await page.locator('.sell').boundingBox();
    if (!t || !sell || t.y + t.height > sell.y - 300) throw new Error('toast sits low on the screen');
    await page.screenshot({ path: `${out}/check-toast.png` });
    await ctx.close();
  });
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
}

if (mode === 'scenes' || mode === 'all') await scenes();
if (mode === 'flow' || mode === 'all') await flow(mock);
if (mode === 'checks' || mode === 'all') await checks();
if (mode === 'real') await real();
await browser.close();
console.log(problems ? `${problems} problem(s)` : 'all clear: no console errors, no overflow, every step passed');
process.exit(problems ? 1 : 0);
