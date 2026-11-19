// Screenshots of the scene demo: node tools/scene-shot.mjs [steam light …] [--perf] [--only=phone|desk]
// Needs dist/scene-demo.html (bun run tools/scene-demo.ts). Writes shots/scene/*.png.
//   <industry>-phone.png   seven stages stacked at 390 px wide (empty → early → mid → late → crisis → collapse → steady)
//   <industry>-desk.png    the same at 1280 px (two columns)
//   <industry>-<stage>-phone.png / -desk.png  single frames, live (not reduced motion), for the best stills
// --perf: frame timings of the busiest state with 4× CPU throttling, in the live animated scene.
import { createRequire } from 'node:module';
import { mkdirSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const { chromium } = createRequire(import.meta.url)('playwright');
const args = process.argv.slice(2);
const perf = args.includes('--perf');
const sw = args.includes('--switch');
const m2 = args.includes('--m2'); // the M2 strip: clearing, steady, settled, Commons + landmark
const sfx = m2 ? '-m2' : '';
const only = (args.find((a) => a.startsWith('--only=')) || '').slice(7);
const inds = args.filter((a) => !a.startsWith('--'));
const ALL = ['steam', 'light', 'motion', 'compute', 'code', 'iron'];
const list = inds.length ? inds : ALL;
const file = resolve('dist/scene-demo.html');
if (!existsSync(file)) { console.error('Build first: bun run tools/scene-demo.ts'); process.exit(1); }
const url = 'file://' + file;
mkdirSync('shots/scene', { recursive: true });

const browser = await chromium.launch();
const errors = [];
async function page(w, h) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: w < 600 ? 2 : 1 });
  const p = await ctx.newPage();
  p.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') errors.push(`[${w}] ${m.text()}`); });
  p.on('pageerror', (e) => errors.push(`[${w}] pageerror ${e.message}`));
  return p;
}

if (sw) {
  // Industry switch cost and style/layout per second while animating, at 4× CPU throttle on a phone profile.
  const p = await page(390, 844);
  const cdp = await p.context().newCDPSession(p);
  await p.goto(url);
  await p.waitForFunction(() => !!window.__scene);
  await cdp.send('Performance.enable');
  const ids = list.filter((x) => x !== 'iron');
  const rows = [];
  const metric = async () => Object.fromEntries((await cdp.send('Performance.getMetrics')).metrics.map((m) => [m.name, m.value]));
  for (let pass = 0; pass < 2; pass++) {
    for (const ind of ids) {
      await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
      const ms = await p.evaluate((i) => new Promise((ok) => { const a = performance.now(); const u = window.__scene.timeSwitch(i); requestAnimationFrame(() => setTimeout(() => ok([u, performance.now() - a]))); }), ind);
      await p.waitForTimeout(pass ? 1500 : 8000); // past the crisis fog the preset change plays
      const m0 = await metric();
      await p.waitForTimeout(5000);
      const m1 = await metric();
      const per = (k) => +(((m1[k] - m0[k]) * 1000) / 5).toFixed(1);
      rows.push({ pass: pass ? 'revisit' : 'first', ind, update: +ms[0].toFixed(0), toPaint: +ms[1].toFixed(0), styleMsPerS: per('RecalcStyleDuration'), layoutMsPerS: per('LayoutDuration'), scriptMsPerS: per('ScriptDuration'), nodes: m1.Nodes });
      await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 });
    }
  }
  console.table(rows);
  const mem = await p.evaluate(() => (performance.memory ? Math.round(performance.memory.usedJSHeapSize / 1e5) / 10 + ' MB' : 'n/a'));
  console.log('heap', mem, 'DOM nodes in document', await p.evaluate(() => document.getElementsByTagName('*').length));
} else if (!perf) {
  for (const ind of list) {
    if (only !== 'desk') {
      const p = await page(390, 900);
      await p.goto(`${url}#strip=${ind}${m2 ? '&m2' : ''}`);
      await p.evaluate(() => document.body.style.setProperty('--fig', '358px'));
      await p.waitForTimeout(400);
      await p.screenshot({ path: `shots/scene/${ind}${sfx}-phone.png`, fullPage: true });
      await p.context().close();
    }
    if (only !== 'phone') {
      const p = await page(1280, 900);
      await p.goto(`${url}#strip=${ind}${m2 ? '&m2' : ''}`);
      await p.evaluate(() => document.body.style.setProperty('--fig', '600px'));
      await p.waitForTimeout(400);
      await p.screenshot({ path: `shots/scene/${ind}${sfx}-desk.png`, fullPage: true });
      await p.context().close();
    }
    console.log('strip', ind);
  }
  // Live single frames (animated, mid-motion) of the late stage, phone and desktop, scene only.
  for (const ind of m2 ? [] : list) {
    for (const [w, tag] of [[390, 'phone'], [1280, 'desk']]) {
      if (only && only !== tag) continue;
      const p = await page(w, 900);
      await p.goto(url);
      await p.waitForFunction(() => !!window.__scene);
      for (const stage of ['late', 'steady']) {
        await p.evaluate(([s, i]) => window.__scene.preset(s, i), [stage, ind]);
        await p.waitForTimeout(1600);
        const el = await p.$('.scn');
        await el.screenshot({ path: `shots/scene/${ind}-${stage}-${tag}.png` });
      }
      await p.context().close();
    }
  }
} else {
  const p = await page(390, 844);
  const cdp = await p.context().newCDPSession(p);
  await p.goto(url);
  await p.waitForFunction(() => !!window.__scene);
  const results = [];
  for (const ind of list.filter((x) => x !== 'iron')) {
    await p.evaluate((i) => window.__scene.preset('crisis', i), ind);
    await p.waitForTimeout(800);
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
    // 1) idle animation; 2) idle + update() at 10 Hz with jittering inputs (patch path).
    for (const mode of ['idle', 'update10hz']) {
      const r = await p.evaluate(async (mode) => {
        let timer = 0, k = 0;
        if (mode === 'update10hz') timer = setInterval(() => { k++; window.__scene.raw({ pressure: 0.86 + (k % 5) * 0.01, pace: 0.95 + (k % 3) * 0.02 }); }, 100);
        const ts = [];
        await new Promise((res) => {
          const t0 = performance.now();
          const f = (t) => { ts.push(t); if (t - t0 < 5000) requestAnimationFrame(f); else res(); };
          requestAnimationFrame(f);
        });
        clearInterval(timer);
        const d = ts.slice(1).map((t, i) => t - ts[i]).sort((a, b) => a - b);
        const avg = d.reduce((a, b) => a + b, 0) / d.length;
        return { frames: d.length, avg: +avg.toFixed(1), p50: +d[Math.floor(d.length * 0.5)].toFixed(1), p95: +d[Math.floor(d.length * 0.95)].toFixed(1), max: +d[d.length - 1].toFixed(1), over33: d.filter((x) => x > 33.4).length };
      }, mode);
      results.push({ ind, mode, ...r });
    }
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 });
    const counts = await p.evaluate(() => ({
      nodes: document.querySelectorAll('.scn svg *').length,
      visible: Array.from(document.querySelectorAll('.scn .on')).length,
      movers: document.querySelectorAll('.scn .mv.on').length,
      liveSmoke: document.querySelectorAll('.scn .smk.live').length,
    }));
    results[results.length - 1].counts = counts;
  }
  console.table(results.map(({ counts, ...r }) => ({ ...r, ...(counts || {}) })));
}
await browser.close();
if (errors.length) { console.log('Console errors/warnings:'); for (const e of [...new Set(errors)].slice(0, 30)) console.log('  ' + e); }
else console.log('No console errors.');
