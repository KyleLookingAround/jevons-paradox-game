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
