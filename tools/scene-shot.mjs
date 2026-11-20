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
const m3 = args.includes('--m3'); // the M3 strip (#strip=<id>&m3); with --perf/--switch: the busiest state with every M3 feature on
const m4 = args.includes('--m4'); // M4: the strip with Iron and Fishing open (#strip=<id>&m4); with --perf/--switch/--trace: crisisM4
const sfx = m2 ? '-m2' : m3 ? '-m3' : m4 ? '-m4' : '';
const busy = m4 ? 'crisisM4' : m3 ? 'crisisM3' : 'crisis';
const hash = m2 ? '&m2' : m3 ? '&m3' : m4 ? '&m4' : '';
const only = (args.find((a) => a.startsWith('--only=')) || '').slice(7);
const inds = args.filter((a) => !a.startsWith('--'));
const ALL = ['steam', 'light', 'motion', 'compute', 'code', 'iron', 'fishing'];
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

if (args.includes('--trace')) {
  // A paint trace per Industry at its busiest state, 4× CPU, phone: main-thread ms per second of style, layout,
  // paint and layer work, from a devtools timeline trace (CDP Tracing). Live, animated, after 3 s to settle.
  const p = await page(390, 844);
  const cdp = await p.context().newCDPSession(p);
  await p.goto(url);
  await p.waitForFunction(() => !!window.__scene);
  const rows = [];
  for (const ind of list) {
    await p.evaluate(([i, b]) => window.__scene.preset(b, i), [ind, busy]);
    await p.waitForTimeout(9000); // past the crisis fog
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
    // The host's 10 Hz update() with jittering inputs, as in --perf's update10hz.
    await p.evaluate((jit) => { let k = 0; window.__jit = setInterval(() => { k++; const o = { pressure: 0.86 + (k % 5) * 0.01, pace: 0.95 + (k % 3) * 0.02 }; if (jit === 'pace') delete o.pressure; if (jit === 'pressure') delete o.pace; if (jit === 'none') return; window.__scene.raw(o); }, 100); }, process.env.JIT || 'both');
    await browser.startTracing(p, { categories: ['devtools.timeline', 'disabled-by-default-devtools.timeline'] });
    await p.waitForTimeout(5000);
    const buf = await browser.stopTracing();
    await p.evaluate(() => clearInterval(window.__jit));
    const events = JSON.parse(buf.toString()).traceEvents || [];
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 });
    // Main thread of the renderer: the thread with the most 'Paint' or 'UpdateLayoutTree' events.
    const cnt = {};
    for (const e of events) if (e.name === 'Paint' || e.name === 'UpdateLayoutTree' || e.name === 'TimerFire' || e.name === 'FunctionCall') { const k = e.pid + ':' + e.tid; cnt[k] = (cnt[k] || 0) + 1; }
    const main = Object.entries(cnt).sort((a, b) => b[1] - a[1])[0]?.[0];
    if (process.env.TRACE_DEBUG === '2') { const ps = events.filter((e) => e.name === 'Paint' && (e.pid + ':' + e.tid) === main); const by = {}; for (const e of ps) { const k = JSON.stringify(e.args?.data?.clip?.map((x) => Math.round(x))) + ' node ' + e.args?.data?.nodeId; by[k] = (by[k] || 0) + (e.dur || 0); } console.log(Object.entries(by).sort((a, b) => b[1] - a[1]).slice(0, 12)); }
    if (process.env.TRACE_DEBUG === '1') { const nm = {}; for (const e of events) nm[e.name] = (nm[e.name] || 0) + 1; console.log(ind, events.length, main, JSON.stringify(Object.entries(nm).sort((a, b) => b[1] - a[1]).slice(0, 25))); }
    const sum = (names) => events.filter((e) => e.ph === 'X' && names.includes(e.name) && (e.pid + ':' + e.tid) === main).reduce((a, e) => a + (e.dur || 0), 0) / 1000 / 5;
    rows.push({ ind, styleMsPerS: +sum(['UpdateLayoutTree', 'RecalculateStyles']).toFixed(1), layoutMsPerS: +sum(['Layout']).toFixed(1), paintMsPerS: +sum(['Paint']).toFixed(1),
      layersMsPerS: +sum(['UpdateLayerTree', 'Layerize', 'PrePaint']).toFixed(1), scriptMsPerS: +sum(['FunctionCall', 'TimerFire', 'FireAnimationFrame', 'EventDispatch']).toFixed(1),
      paints: events.filter((e) => e.name === 'Paint' && (e.pid + ':' + e.tid) === main).length });
  }
  console.table(rows);
} else if (sw) {
  // Industry switch cost and style/layout per second while animating, at 4× CPU throttle on a phone profile.
  const p = await page(390, 844);
  const cdp = await p.context().newCDPSession(p);
  await p.goto(url);
  await p.waitForFunction(() => !!window.__scene);
  await p.evaluate((b) => { window.__busy = b; }, busy);
  await cdp.send('Performance.enable');
  const ids = list;
  const rows = [];
  const metric = async () => Object.fromEntries((await cdp.send('Performance.getMetrics')).metrics.map((m) => [m.name, m.value]));
  for (let pass = 0; pass < 2; pass++) {
    for (const ind of ids) {
      await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
      const ms = await p.evaluate((i) => new Promise((ok) => { const a = performance.now(); const u = window.__scene.timeSwitch(i, window.__busy); requestAnimationFrame(() => setTimeout(() => ok([u, performance.now() - a]))); }), ind);
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
      await p.goto(`${url}#strip=${ind}${hash}`);
      await p.evaluate(() => document.body.style.setProperty('--fig', '358px'));
      await p.waitForTimeout(400);
      await p.screenshot({ path: `shots/scene/${ind}${sfx}-phone.png`, fullPage: true });
      await p.context().close();
    }
    if (only !== 'phone') {
      const p = await page(1280, 900);
      await p.goto(`${url}#strip=${ind}${hash}`);
      await p.evaluate(() => document.body.style.setProperty('--fig', '600px'));
      await p.waitForTimeout(400);
      await p.screenshot({ path: `shots/scene/${ind}${sfx}-desk.png`, fullPage: true });
      await p.context().close();
    }
    console.log('strip', ind);
  }
  // Live single frames (animated, mid-motion) of the late stage, phone and desktop, scene only.
  for (const ind of m2 || m3 || m4 ? [] : list) {
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
  for (const ind of list) {
    await p.evaluate(([i, b]) => window.__scene.preset(b, i), [ind, busy]);
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
      world: document.querySelectorAll('.scn-world.act svg *').length,
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
