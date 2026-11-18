// Screenshots of the built game for visual checks.
//   bun run build.ts && node tools/shot.mjs [filter]
// Opens dist/index.html over file:// with #mock options, at 390×844 and 1280×800 (plus a 360px width check),
// clicks the main button and a Buy button, and writes PNGs to shots/. Prints console errors and sideways overflow.
import { createRequire } from 'node:module';
import { mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const { chromium } = createRequire(import.meta.url)('playwright');
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const base = 'file://' + resolve(root, 'dist/index.html');
const out = resolve(root, 'shots');
mkdirSync(out, { recursive: true });

const scenes = [
  { name: 'fresh', hash: '#mock' },
  { name: 'ledger', hash: '#mock:rich,reveal,smog=0.4' },
  { name: 'gaslight', hash: '#mock:all,era=light,smog=0.3' },
  { name: 'chrome', hash: '#mock:all,era=motion,smog=0.6' },
  { name: 'terminal', hash: '#mock:all,era=compute,smog=0.5' },
  { name: 'agentic', hash: '#mock:all,era=code,smog=0.7' },
  { name: 'real', hash: '' },
];
const filter = process.argv[2];
const sizes = [{ w: 390, h: 844, tag: 'phone' }, { w: 1280, h: 800, tag: 'desk' }, { w: 360, h: 740, tag: 'narrow' }];

const browser = await chromium.launch();
let problems = 0;

if (filter === 'flow') { await flow(); await browser.close(); process.exit(problems ? 1 : 0); }

// Scripted play-through on the mock: every interaction the UI offers, with screenshots of the sheets.
async function flow() {
  for (const sz of [{ w: 390, h: 844, tag: 'phone' }, { w: 1280, h: 800, tag: 'desk' }]) {
    const ctx = await browser.newContext({ viewport: { width: sz.w, height: sz.h }, deviceScaleFactor: 1, acceptDownloads: true });
    const page = await ctx.newPage();
    const errs = [];
    page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') errs.push(`${m.type()}: ${m.text()}`); });
    page.on('pageerror', (e) => errs.push('pageerror: ' + e.message));
    const step = async (name, f) => {
      try { await f(); console.log(`  ok   ${sz.tag} ${name}`); }
      catch (e) { problems++; console.log(`  FAIL ${sz.tag} ${name}: ${e.message.split('\n')[0]}`); }
    };
    const shot = (n) => page.screenshot({ path: `${out}/flow-${sz.tag}-${n}.png` });
    const st = () => page.evaluate(() => window.rebound.state);
    await page.goto(base + '#mock:rich,reveal,light');
    await page.waitForTimeout(800);
    await step('click main button', async () => {
      const before = (await st()).run.clicks; await page.click('.sell'); await page.waitForTimeout(150);
      if ((await st()).run.clicks !== before + 1) throw new Error('clicks did not rise');
    });
    await step('buy an upgrade', async () => {
      const n = Object.values((await st()).upgrades).reduce((a, b) => a + b, 0);
      await page.locator('.up .buy:not([aria-disabled="true"])').first().click(); await page.waitForTimeout(150);
      if (Object.values((await st()).upgrades).reduce((a, b) => a + b, 0) !== n + 1) throw new Error('no upgrade bought');
    });
    await step('found an app', async () => {
      await page.locator('.found:not([aria-disabled="true"]):visible').first().click(); await page.waitForTimeout(150);
      const s = await st(); if (!s.eras.steam.apps['steam.rail'].founded) throw new Error('railways not founded');
    });
    await step('open a formula', async () => { await page.click('.dial-cons .info'); await page.waitForTimeout(300); await shot('formula'); await page.click('.sheet-x'); });
    await step('switch era tab', async () => {
      await page.click('.tab:has-text("Light")'); await page.waitForTimeout(200);
      if (await page.evaluate(() => document.documentElement.dataset.era) !== 'gaslight') throw new Error('theme did not switch');
      await page.click('.tab:has-text("Steam")'); await page.waitForTimeout(200);
    });
    await step('raise a lever', async () => {
      await page.locator('.lev-raise:not([aria-disabled="true"])').first().click(); await page.waitForTimeout(150);
      const s = await st(); if (!Object.values(s.levers).some((l) => l.level > 0)) throw new Error('no lever raised');
      await page.locator('.lever.active').first().scrollIntoViewIfNeeded(); await shot('lever');
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
    await step('call and complete a Reckoning', async () => {
      for (const x of await page.locator('.toast-x').all()) await x.click().catch(() => {});
      await page.click('.run-foot .btn'); await page.waitForTimeout(250); await shot('confirm');
      await page.click('button:has-text("Close the books")'); await page.waitForTimeout(400); await shot('summary');
      const s = await st(); if (s.meta.reckonings < 2) throw new Error('reckonings did not rise');
    });
    await step('buy from the Hindsight shop', async () => {
      await page.click('button:has-text("Spend Hindsight")'); await page.waitForTimeout(300);
      const h0 = (await st()).meta.hindsight;
      await page.locator('.shop-item .btn:not([aria-disabled="true"]):not([disabled])').first().click(); await page.waitForTimeout(200);
      await shot('shop');
      if ((await st()).meta.hindsight >= h0) throw new Error('hindsight not spent');
      await page.click('button:has-text("Begin the next run")'); await page.waitForTimeout(300); await shot('newrun');
    });
    await step('forced Reckoning', async () => {
      await page.goto(base + '#mock:pending'); await page.waitForTimeout(800); await shot('pending');
      await page.click('button:has-text("Face the Reckoning")'); await page.waitForTimeout(400);
      if (!(await page.locator('.sheet-t:has-text("Run summary")').count())) throw new Error('no summary');
      await page.click('button:has-text("Begin again")'); await page.waitForTimeout(400);
    });
    await step('win card', async () => {
      await page.goto(base + '#mock:won'); await page.waitForTimeout(4500); await shot('win');
      if (!(await page.locator('.paper-head:has-text("Steady State")').count())) throw new Error('no win card');
    });
    if (errs.length) { problems++; console.log(`  console ${sz.tag}:`, errs.join(' | ')); }
    await ctx.close();
  }
  console.log(problems ? `${problems} problem(s)` : 'flow: all steps passed, no console errors');
}
for (const sc of scenes) {
  if (filter && !sc.name.includes(filter)) continue;
  for (const sz of sizes) {
    const ctx = await browser.newContext({ viewport: { width: sz.w, height: sz.h }, deviceScaleFactor: sz.tag === 'desk' ? 1 : 2 });
    const page = await ctx.newPage();
    const errs = [];
    page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') errs.push(`${m.type()}: ${m.text()}`); });
    page.on('pageerror', (e) => errs.push('pageerror: ' + e.message));
    await page.goto(base + sc.hash);
    await page.waitForTimeout(1500);
    for (let i = 0; i < 4; i++) await page.click('.sell').catch(() => {});
    const buy = page.locator('.buy:not([aria-disabled="true"])').first();
    if (await buy.count()) await buy.click().catch(() => {});
    await page.waitForTimeout(1200);
    const sw = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth, cockpit: document.querySelector('.cockpit')?.getBoundingClientRect().height ?? 0 }));
    if (sw.sw > sw.cw) { problems++; console.log(`  OVERFLOW ${sc.name}/${sz.tag}: scrollWidth ${sw.sw} > ${sw.cw}`); }
    if (sz.tag === 'narrow') { await ctx.close(); if (errs.length) { problems++; console.log(`  ${sc.name}/${sz.tag}:`, errs.join(' | ')); } continue; }
    const file = `${out}/${sc.name}-${sz.tag}.png`;
    await page.screenshot({ path: file });
    if (sz.tag === 'phone') await page.screenshot({ path: `${out}/${sc.name}-${sz.tag}-full.png`, fullPage: true });
    console.log(`${file}  cockpit ${Math.round(sw.cockpit)}px of ${sz.h} (${Math.round(sw.cockpit / sz.h * 100)}%)`);
    if (errs.length) { problems++; console.log(`  ${sc.name}/${sz.tag}:`, errs.join(' | ')); }
    await ctx.close();
  }
}
await browser.close();
console.log(problems ? `${problems} problem(s)` : 'no console errors, no overflow');
