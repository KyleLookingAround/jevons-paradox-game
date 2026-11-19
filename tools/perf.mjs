// Page performance of the real built game, at phone size with the CPU throttled.
//   bun run build.ts && node tools/perf.mjs [states] [throttles] [flags]
//     states:    comma list of fresh,mid,late          (default all three)
//     throttles: comma list of CPU slow-down factors    (default 4,6)
//     --no-trace     skip the 10 s trace (style/layout/paint split)
//     --tabs         also time each Industry tab in the late state (4×)
//     --soak=N       N minutes of scripted play in the late state at 1×: heap and listeners per minute (leaks)
//     --label=X      write the results to design/scratch/perf-X.json
// Opens dist/index.html at 390×844 (DPR 3, touch). Web fonts are blocked (no network here) except in the "slow fonts"
// load check, which holds the font stylesheet for 1.5 s to see whether it blocks first paint.
// States are made once through the console handle (window.rebound) and loaded as a save, so load timing includes them.
import { createRequire } from 'node:module';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { gzipSync } from 'node:zlib';

const { chromium } = createRequire(import.meta.url)('playwright');
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const url = 'file://' + resolve(root, 'dist/index.html');
if (!existsSync(resolve(root, 'dist/index.html'))) { console.log('Build first: bun run build.ts'); process.exit(1); }

const args = process.argv.slice(2);
const pos = args.filter((a) => !a.startsWith('--'));
const flag = (k) => args.find((a) => a === `--${k}` || a.startsWith(`--${k}=`));
const STATES = (pos[0] || 'fresh,mid,late').split(',');
const THROTTLES = (pos[1] || '4,6').split(',').map(Number);
const TRACE = !flag('no-trace');
const SOAK = flag('soak') ? Number(flag('soak').split('=')[1] || 5) : 0;
const LABEL = flag('label')?.split('=')[1];
const VIEW = { width: 390, height: 844 };

const browser = await chromium.launch({ args: ['--enable-precise-memory-info', '--js-flags=--expose-gc'] });
const results = { when: new Date().toISOString(), sizes: sizes(), states: {} };

function sizes() {
  const r = {};
  for (const f of ['app.js', 'styles.css', 'index.html']) {
    const b = readFileSync(resolve(root, 'dist', f));
    r[f] = { raw: b.length, gz: gzipSync(b, { level: 9 }).length };
  }
  return r;
}

/* ------------------------------------------------------------ page setup */
// Long tasks and event timings from the very start of the page.
const INIT = () => {
  window.__lt = []; window.__ev = [];
  try { new PerformanceObserver((l) => { for (const e of l.getEntries()) window.__lt.push([e.startTime, e.duration]); }).observe({ type: 'longtask', buffered: true }); } catch { /* none */ }
  try {
    new PerformanceObserver((l) => { for (const e of l.getEntries()) window.__ev.push({ n: e.name, s: e.startTime, d: e.duration, ps: e.processingStart, pe: e.processingEnd, id: e.interactionId }); })
      .observe({ type: 'event', durationThreshold: 0, buffered: true });
  } catch { /* none */ }
};

async function newPage(save, fonts = 'block') {
  const ctx = await browser.newContext({ viewport: VIEW, deviceScaleFactor: 3, hasTouch: true, isMobile: true });
  await ctx.route(/fonts\.(googleapis|gstatic)\.com/, async (r) => {
    if (fonts === 'slow') await new Promise((ok) => setTimeout(ok, 1500));
    await r.abort();
  });
  await ctx.addInitScript(INIT);
  if (save) {
    await ctx.addInitScript(([txt, tab]) => {
      if (sessionStorage.getItem('perf.seeded')) return;
      sessionStorage.setItem('perf.seeded', '1');
      localStorage.clear();
      localStorage.setItem('rebound.save.v1', txt);
      localStorage.setItem('rebound.save.v1.at', String(Date.now()));
      if (tab) localStorage.setItem('rebound.ui.sector', tab);
    }, [save.text, save.tab ?? null]);
  }
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', (e) => errs.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error' && !/fonts\.g/.test(m.location()?.url || '')) errs.push(m.text()); });
  const cdp = await ctx.newCDPSession(page);
  await cdp.send('Performance.enable');
  return { ctx, page, cdp, errs };
}

/* ------------------------------------------------------------ making the states */
async function makeStates() {
  const { ctx, page } = await newPage(null);
  await page.goto(url); await page.waitForTimeout(800);
  const out = {};
  out.fresh = null;
  // Mid-run Steam: improvements bought round by round, several uses founded, the reveal, a budget drawn, some time on.
  out.mid = await page.evaluate(() => {
    const r = window.rebound, m = r.model, c = r.content;
    let s = r.state;
    const founded = () => Object.values(s.sectors.steam.apps).filter((a) => a.founded).length;
    for (let round = 0; round < 80; round++) {
      s = { ...s, capital: s.capital + 500 * Math.pow(1.6, round) };
      const vs = m.upgradeViews(s, c).filter((v) => v.def.sector === 'steam' && v.visible && !v.maxed && v.affordable && !v.excludedBy).sort((a, b) => a.cost - b.cost);
      for (const v of vs.slice(0, 2)) { const n = m.buyUpgrade(s, c, v.def.id); if (n !== s) s = n; }
      const d = m.derive(s, c);
      for (const a of c.sectors.steam.applications) if (d.sectors.steam.apps[a.id]?.canFound) s = m.foundApp(s, c, a.id);
      s = m.fastForward(s, c, 20);
      if (m.derive(s, c).pendingReckoning) return { error: 'pending reckoning at round ' + round };
      if (s.flags.revealed && founded() >= 4) break;
    }
    s = m.drawBudget(s, c, 'steam');
    s = m.fastForward(s, c, 60);
    const d = m.derive(s, c);
    return { text: m.serialize(s), tab: 'steam', info: `t=${Math.round(s.time)}s year=${Math.floor(d.year)} ups=${Object.keys(s.upgrades).length} founded=${founded()} revealed=${s.flags.revealed} budget=${!!s.sectors.steam.budget} pf=${d.sectors.steam.pressureFraction.toFixed(2)} pending=${!!d.pendingReckoning} news=${s.news.length} hist=${s.history.length}` };
  });
  // Late: all five open (as tools/shot.mjs looks does), uses founded and improvements bought in each, time on.
  out.late = await page.evaluate(() => {
    const r = window.rebound, m = r.model, c = r.content;
    let s = r.state;
    const sectors = { ...s.sectors };
    for (const id of c.sectorOrder) {
      if (sectors[id].open) continue;
      const def = c.sectors[id]; const apps = {};
      for (const a of def.applications) { const av = a.visibleBelow === Infinity; apps[a.id] = { available: av, founded: av && a.foundCost <= 0, satMul: 1, peakD: 0 }; }
      sectors[id] = { ...sectors[id], open: true, reserve: def.reserve, reserveMax: def.reserve, apps };
    }
    s = { ...s, sectors, flags: { ...s.flags } };
    const safe = (x) => !m.derive(m.fastForward(x, c, 180), c).pendingReckoning;
    const kept = [s];
    for (let round = 0; round < 40; round++) {
      s = { ...s, capital: s.capital + 1e4 * Math.pow(1.8, round), mandate: (s.mandate || 0) + 50 };
      const vs = m.upgradeViews(s, c).filter((v) => v.visible && !v.maxed && v.affordable && !v.excludedBy).sort((a, b) => a.cost - b.cost);
      for (const v of vs.slice(0, 4)) { const n = m.buyUpgrade(s, c, v.def.id); if (n !== s) s = n; }
      const d = m.derive(s, c);
      for (const id of c.sectorOrder) for (const a of c.sectors[id].applications) if (d.sectors[id]?.apps[a.id]?.canFound) s = m.foundApp(s, c, a.id);
      // Step back from a forced Reckoning: the state is wanted mid-run.
      const prev = s;
      s = m.fastForward(s, c, 10);
      if (m.derive(s, c).pendingReckoning) { s = prev; break; }
      kept.push(s);
    }
    // Far enough from a forced Reckoning that ten minutes of measuring will not meet one.
    while (kept.length > 1 && !safe(s)) s = kept.pop();
    for (const id of c.sectorOrder) { const n = m.drawBudget(s, c, id); if (n) s = n; }
    const lv = m.leverViews(s, c).filter((v) => v.visible && v.canRaise);
    for (const v of lv.slice(0, 4)) { const n = m.setLever(s, c, v.def.id, 1); if (n) s = n; }
    const prev = s;
    s = m.fastForward(s, c, 20);
    if (!safe(s)) s = prev;
    const d = m.derive(s, c);
    const nf = Object.values(s.sectors).reduce((a, x) => a + Object.values(x.apps || {}).filter((y) => y.founded).length, 0);
    return { text: m.serialize(s), tab: c.sectorOrder[c.sectorOrder.length - 1], info: `t=${Math.round(s.time)}s year=${Math.floor(d.year)} open=${Object.values(s.sectors).filter((x) => x.open).length} ups=${Object.keys(s.upgrades).length} founded=${nf} levers=${Object.values(s.levers || {}).filter((x) => x.level > 0).length} pending=${!!d.pendingReckoning} news=${s.news.length} hist=${s.history.length} save=${(m.serialize(s).length / 1024).toFixed(0)}KB` };
  });
  await ctx.close();
  return out;
}

/* ------------------------------------------------------------ measurements */
const q = (arr, p) => { if (!arr.length) return 0; const s = [...arr].sort((a, b) => a - b); return s[Math.min(s.length - 1, Math.floor(p * s.length))]; };

async function frames(page, ms) {
  return page.evaluate((dur) => new Promise((res) => {
    const d = []; let last = performance.now(); const t0 = last;
    const f = (now) => { d.push(now - last); last = now; if (now - t0 < dur) requestAnimationFrame(f); else res(d); };
    requestAnimationFrame(f);
  }), ms);
}
function frameStats(d) {
  return { n: d.length, p50: q(d, 0.5), p95: q(d, 0.95), max: Math.max(0, ...d), over33: d.filter((x) => x > 33.4).length, over50: d.filter((x) => x > 50).length };
}
async function longTasks(page, since) {
  return page.evaluate((t) => window.__lt.filter(([s]) => s >= t).map(([, d]) => d), since);
}
const now = (page) => page.evaluate(() => performance.now());

async function metrics(cdp) {
  const { metrics: m } = await cdp.send('Performance.getMetrics');
  const o = {}; for (const x of m) o[x.name] = x.value; return o;
}
async function heap(page, cdp) {
  await cdp.send('HeapProfiler.enable');
  await cdp.send('HeapProfiler.collectGarbage');
  const m = await metrics(cdp);
  const dc = await cdp.send('Memory.getDOMCounters');
  return { heapMB: m.JSHeapUsedSize / 1048576, nodes: dc.nodes, listeners: dc.jsEventListeners, domNodes: await page.evaluate(() => document.getElementsByTagName('*').length) };
}

// Trace: self time on the renderer main thread, bucketed.
const BUCKET = {
  scripting: ['FunctionCall', 'EvaluateScript', 'TimerFire', 'FireAnimationFrame', 'EventDispatch', 'v8.compile', 'v8.run', 'V8.Execute', 'RunMicrotasks', 'FireIdleCallback', 'v8.callFunction', 'MajorGC', 'MinorGC', 'V8.GC_SCAVENGER', 'GCEvent'],
  style: ['UpdateLayoutTree', 'RecalculateStyles', 'ScheduleStyleRecalculation', 'ParseAuthorStyleSheet'],
  layout: ['Layout', 'UpdateLayerTree', 'IntersectionObserverController::computeIntersections', 'ResizeObserverController::BroadcastObservations'],
  paint: ['Paint', 'PrePaint', 'PaintImage', 'Layerize', 'UpdateLayer', 'Commit', 'CompositeLayers', 'ScrollLayer', 'PaintSetup', 'RasterTask'],
};
const toBucket = {}; for (const [b, names] of Object.entries(BUCKET)) for (const n of names) toBucket[n] = b;
async function trace(cdp, page, ms) {
  const chunks = [];
  const done = new Promise((ok) => cdp.once('Tracing.tracingComplete', ok));
  await cdp.send('Tracing.start', { transferMode: 'ReturnAsStream', traceConfig: { includedCategories: ['devtools.timeline', 'v8', 'disabled-by-default-devtools.timeline.frame'], excludedCategories: ['*'] } });
  await page.waitForTimeout(ms);
  await cdp.send('Tracing.end');
  const { stream } = await done;
  for (;;) { const r = await cdp.send('IO.read', { handle: stream, size: 1 << 20 }); chunks.push(r.base64Encoded ? Buffer.from(r.data, 'base64').toString() : r.data); if (r.eof) break; }
  await cdp.send('IO.close', { handle: stream });
  let ev = JSON.parse(chunks.join(''));
  ev = Array.isArray(ev) ? ev : ev.traceEvents;
  const main = new Set(ev.filter((e) => e.ph === 'M' && e.name === 'thread_name' && e.args?.name === 'CrRendererMain').map((e) => `${e.pid}:${e.tid}`));
  // Busiest renderer main thread.
  const count = {}; for (const e of ev) { const k = `${e.pid}:${e.tid}`; if (main.has(k) && e.ph === 'X') count[k] = (count[k] || 0) + 1; }
  const key = Object.entries(count).sort((a, b) => b[1] - a[1])[0]?.[0];
  const xs = ev.filter((e) => e.ph === 'X' && `${e.pid}:${e.tid}` === key && e.dur != null).sort((a, b) => a.ts - b.ts || b.dur - a.dur);
  const tot = { scripting: 0, style: 0, layout: 0, paint: 0, other: 0, busy: 0 };
  const stack = [];
  const close = (upto) => { while (stack.length && stack[stack.length - 1].end <= upto) stack.pop(); };
  for (const e of xs) {
    close(e.ts);
    const b = toBucket[e.name];
    if (e.name === 'RunTask' || e.name === 'ThreadControllerImpl::RunTask') { if (!stack.length) tot.busy += e.dur; }
    // Self time: subtract this event from the nearest bucketed ancestor.
    if (b) {
      const parent = [...stack].reverse().find((x) => x.b);
      if (parent) tot[parent.b] -= e.dur;
      tot[b] += e.dur;
    }
    stack.push({ end: e.ts + e.dur, b });
  }
  const secs = ms / 1000;
  const o = {};
  for (const k of Object.keys(tot)) o[k] = tot[k] / 1000 / secs; // ms per second of wall time
  return o;
}

async function loadTiming(save, rate, fonts) {
  const { ctx, page, cdp, errs } = await newPage(save, fonts);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate });
  const t0 = Date.now();
  await page.goto(url, { waitUntil: 'load' });
  await page.waitForFunction(() => performance.getEntriesByName('rebound-ready').length > 0, null, { timeout: 30000 });
  const r = await page.evaluate(() => new Promise((ok) => requestAnimationFrame(() => setTimeout(() => {
    const fcp = performance.getEntriesByName('first-contentful-paint')[0]?.startTime ?? -1;
    const ready = performance.getEntriesByName('rebound-ready')[0]?.startTime ?? -1;
    const nav = performance.getEntriesByType('navigation')[0];
    ok({ fcp, ready, dcl: nav?.domContentLoadedEventEnd ?? -1, interactive: performance.now(), lt: window.__lt.map(([, d]) => d) });
  }))));
  r.wall = Date.now() - t0;
  await ctx.close();
  return { ...r, errs };
}

async function tapLatency(page, cdp, sel, n, gapMs) {
  const box = await page.locator(sel).first().boundingBox();
  if (!box) return null;
  const x = box.x + box.width / 2, y = box.y + box.height / 2;
  const t0 = await now(page);
  for (let i = 0; i < n; i++) {
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    if (gapMs) await page.waitForTimeout(gapMs);
  }
  await page.waitForTimeout(600);
  const ev = await page.evaluate((t) => window.__ev.filter((e) => e.s >= t && e.id), t0);
  // Per interaction: its click (the event the game acts on), from dispatch to the next paint.
  const by = new Map();
  for (const e of ev) if (e.n === 'click') by.set(e.id, e);
  const d = [...by.values()].map((e) => e.d);
  const proc = [...by.values()].map((e) => e.pe - e.ps);
  return { n: d.length, p50: q(d, 0.5), p95: q(d, 0.95), max: Math.max(0, ...d), procP50: q(proc, 0.5), procMax: Math.max(0, ...proc) };
}

async function measureState(name, save, rate) {
  const r = { rate };
  r.load = await loadTiming(save, rate, 'block');
  r.loadSlowFonts = await loadTiming(save, rate, 'slow');
  const { ctx, page, cdp, errs } = await newPage(save);
  await page.goto(url);
  await page.waitForFunction(() => performance.getEntriesByName('rebound-ready').length > 0);
  await page.waitForTimeout(1500);
  await page.evaluate(() => { document.querySelectorAll('.toast-x').forEach((x) => x.click()); window.scrollTo(0, 0); });
  r.info = await page.evaluate(() => ({ sector: window.rebound.ctx.sector, pending: !!window.rebound.d.pendingReckoning }));
  r.mem0 = await heap(page, cdp);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate });
  await page.waitForTimeout(500);

  // Idle play: 10 s of frames, long tasks and the loop's pieces.
  await page.evaluate(() => { const p = window.rebound.prof; p.reset(); p.on = true; });
  let t = await now(page);
  const m0 = await metrics(cdp);
  r.frames = frameStats(await frames(page, 10000));
  const m1 = await metrics(cdp);
  r.lt = await longTasks(page, t);
  r.cdp = { scriptMsPerS: (m1.ScriptDuration - m0.ScriptDuration) * 100, styleMsPerS: (m1.RecalcStyleDuration - m0.RecalcStyleDuration) * 100, layoutMsPerS: (m1.LayoutDuration - m0.LayoutDuration) * 100, taskMsPerS: (m1.TaskDuration - m0.TaskDuration) * 100 };
  r.prof = await page.evaluate(() => { const p = window.rebound.prof; p.on = false; return p.acc; });

  // Trace (separately: tracing itself costs time).
  if (TRACE) r.trace = await trace(cdp, page, 6000);

  // Scrolled down to the improvements: is off-screen work skipped?
  await page.evaluate(() => window.scrollTo(0, document.querySelector('.upgrades')?.getBoundingClientRect().top + window.scrollY - 200));
  await page.waitForTimeout(400);
  r.framesScrolled = frameStats(await frames(page, 4000));
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(400);

  // Taps on Sell: one at a time (latency), then 8 a second for 5 s.
  t = await now(page);
  r.sellTap = await tapLatency(page, cdp, '.sell', 6, 400);
  const tb = await now(page);
  const fp = frames(page, 5600);
  r.sellBurst = await tapLatency(page, cdp, '.sell', 40, 125);
  r.sellBurstFrames = frameStats(await fp);
  r.sellBurstLt = await longTasks(page, tb);

  // Buy: give capital, tap the first affordable Buy (fork arms excluded), then hold a repeatable one.
  await page.evaluate(() => { const r = window.rebound; r.ctx.state = { ...r.state, capital: r.state.capital + 1e15 }; r.ctx.refreshAll(); });
  await page.waitForTimeout(300);
  const buySel = await page.evaluate(() => {
    const ok = window.rebound.ctx.ups.filter((v) => v.def.sector === window.rebound.ctx.sector && v.affordable && v.visible && !v.maxed && !v.excludedBy && !v.def.excludes?.length && !window.rebound.content.upgrades.some((u) => u.excludes?.includes(v.def.id)));
    const rep = ok.find((v) => v.def.repeatable), one = ok.find((v) => !v.def.repeatable) ?? rep;
    return { one: one ? `.up[data-up="${one.def.id}"] .buy` : null, rep: rep ? `.up[data-up="${rep.def.id}"] .buy` : null };
  });
  if (buySel.one) {
    await page.locator(buySel.one).scrollIntoViewIfNeeded();
    await page.waitForTimeout(300);
    r.buyTap = await tapLatency(page, cdp, buySel.one, 1, 0);
  }
  if (buySel.rep) {
    await page.locator(buySel.rep).scrollIntoViewIfNeeded();
    await page.waitForTimeout(300);
    const box = await page.locator(buySel.rep).boundingBox();
    if (box) {
      const th = await now(page);
      const fp2 = frames(page, 3500);
      const x = box.x + box.width / 2, y = box.y + box.height / 2;
      const lv0 = await page.evaluate(() => Object.values(window.rebound.state.upgrades).reduce((a, b) => a + b, 0));
      await page.mouse.move(x, y); await page.mouse.down();
      await page.waitForTimeout(3000);
      await page.mouse.up();
      r.holdFrames = frameStats(await fp2);
      r.holdLt = await longTasks(page, th);
      r.holdBought = (await page.evaluate(() => Object.values(window.rebound.state.upgrades).reduce((a, b) => a + b, 0))) - lv0;
    }
  }
  // Switch Industry tabs (late only): the cost of a switch.
  if (name === 'late') {
    const ids = await page.evaluate(() => window.rebound.content.sectorOrder);
    await page.evaluate(() => window.scrollTo(0, 0));
    const tt = await now(page);
    const sw = [];
    for (const id of ids) {
      const ms = await page.evaluate((i) => new Promise((ok) => { const a = performance.now(); window.rebound.ctx.selectSector(i); requestAnimationFrame(() => setTimeout(() => ok(performance.now() - a))); }), id);
      sw.push(ms);
      await page.waitForTimeout(800);
    }
    r.tabSwitch = { p50: q(sw, 0.5), max: Math.max(...sw), lt: await longTasks(page, tt) };
  }
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 });
  r.mem1 = await heap(page, cdp);
  r.errs = errs;
  await ctx.close();
  return r;
}

async function perTab(save) {
  const { ctx, page, cdp } = await newPage(save);
  await page.goto(url); await page.waitForTimeout(1500);
  const ids = await page.evaluate(() => window.rebound.content.sectorOrder);
  const o = {};
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  for (const id of ids) {
    await page.evaluate((i) => { window.rebound.ctx.selectSector(i); window.scrollTo(0, 0); }, id);
    await page.waitForTimeout(1200);
    await page.evaluate(() => { const p = window.rebound.prof; p.reset(); p.on = true; });
    const t = await now(page);
    o[id] = { frames: frameStats(await frames(page, 5000)), lt: await longTasks(page, t), prof: await page.evaluate(() => { const p = window.rebound.prof; p.on = false; return p.acc; }) };
  }
  await ctx.close();
  return o;
}

async function soak(save, minutes) {
  const { ctx, page, cdp } = await newPage(save);
  await page.goto(url); await page.waitForTimeout(1500);
  const ids = await page.evaluate(() => window.rebound.content.sectorOrder);
  const rows = [await heap(page, cdp)];
  for (let min = 1; min <= minutes; min++) {
    for (let s = 0; s < 6; s++) {
      await page.evaluate((i) => window.rebound.ctx.selectSector(i), ids[(min * 6 + s) % ids.length]);
      for (let k = 0; k < 5; k++) { await page.locator('.sell').click().catch(() => {}); await page.waitForTimeout(150); }
      await page.evaluate(() => { const b = document.querySelector('.up .buy:not([aria-disabled])'); if (b && !b.closest('.fork')) b.click(); document.querySelectorAll('.toast-x').forEach((x) => x.click()); });
      await page.waitForTimeout(8500);
    }
    const hp = await heap(page, cdp);
    hp.t = min; hp.hist = await page.evaluate(() => window.rebound.state.history.length);
    rows.push(hp);
    console.log(`  soak ${min} min: heap ${hp.heapMB.toFixed(1)} MB, nodes ${hp.nodes}, listeners ${hp.listeners}, dom ${hp.domNodes}, history ${hp.hist}`);
  }
  await ctx.close();
  return rows;
}

/* ------------------------------------------------------------ run */
const f1 = (x) => (x == null || !Number.isFinite(x) ? '—' : x.toFixed(1));
const f0 = (x) => (x == null || !Number.isFinite(x) ? '—' : Math.round(x).toString());
console.log(`bundle app.js ${(results.sizes['app.js'].raw / 1024).toFixed(0)} KB (${(results.sizes['app.js'].gz / 1024).toFixed(0)} KB gz), styles.css ${(results.sizes['styles.css'].raw / 1024).toFixed(0)} KB (${(results.sizes['styles.css'].gz / 1024).toFixed(0)} KB gz)`);
const saves = await makeStates();
for (const k of ['mid', 'late']) console.log(`state ${k}: ${saves[k]?.info ?? saves[k]?.error}`);

for (const st of STATES) {
  results.states[st] = {};
  for (const rate of THROTTLES) {
    if (saves[st]?.error) continue;
    const r = await measureState(st, saves[st], rate);
    results.states[st][rate] = r;
    const P = r.prof || {};
    const per = (k) => (P[k] ? `${f1(P[k].t / P[k].n)}/${f1(P[k].max)}` : '—');
    console.log(`\n== ${st} @${rate}× (${r.info.sector}${r.info.pending ? ', PENDING RECKONING' : ''})`);
    console.log(`  load: FCP ${f0(r.load.fcp)} ms, ready ${f0(r.load.ready)} ms, interactive ${f0(r.load.interactive)} ms, long tasks [${r.load.lt.map(f0).join(' ')}]; slow fonts: FCP ${f0(r.loadSlowFonts.fcp)} ms, interactive ${f0(r.loadSlowFonts.interactive)} ms`);
    console.log(`  frames (10 s): p50 ${f1(r.frames.p50)} p95 ${f1(r.frames.p95)} max ${f0(r.frames.max)} ms; >33 ${r.frames.over33}, >50 ${r.frames.over50}; long tasks ${r.lt.length} (max ${f0(Math.max(0, ...r.lt))} ms)`);
    console.log(`  scrolled to improvements: p50 ${f1(r.framesScrolled.p50)} p95 ${f1(r.framesScrolled.p95)} max ${f0(r.framesScrolled.max)}`);
    console.log(`  main thread ms/s (cdp): script ${f1(r.cdp.scriptMsPerS)} style ${f1(r.cdp.styleMsPerS)} layout ${f1(r.cdp.layoutMsPerS)} task ${f1(r.cdp.taskMsPerS)}`);
    if (r.trace) console.log(`  trace ms/s: scripting ${f1(r.trace.scripting)} style ${f1(r.trace.style)} layout ${f1(r.trace.layout)} paint ${f1(r.trace.paint)} busy ${f1(r.trace.busy)}`);
    console.log(`  loop pieces, mean/max ms: tick ${per('model.tick')} (${P['model.tick']?.n ?? 0}×) derive ${per('model.derive')} upgradeViews ${per('model.upgradeViews')} leverViews ${per('model.leverViews')} knowhow ${per('model.knowhowViews')} inst ${per('model.institutionViews')} serialize ${per('model.serialize')}`);
    console.log(`  ui, mean/max ms: update ${per('ui.update')} afford ${per('ui.afford')} topbar ${per('ui.topbar')} tabs ${per('ui.tabs')} gauges ${per('ui.gauges')} dock ${per('ui.dock')} news ${per('ui.news')} world ${per('ui.world')} [view ${per('scene.view')} scene ${per('scene.update')}] ups ${per('ui.ups')} budget ${per('ui.budget')} levs ${per('ui.levs')}`);
    const L = (x) => (x ? `p50 ${f0(x.p50)} p95 ${f0(x.p95)} max ${f0(x.max)} ms (handler p50 ${f1(x.procP50)}, max ${f1(x.procMax)}; n ${x.n})` : '—');
    console.log(`  tap→paint Sell: ${L(r.sellTap)}`);
    console.log(`  Sell 8/s: ${L(r.sellBurst)}; frames p95 ${f1(r.sellBurstFrames.p95)} max ${f0(r.sellBurstFrames.max)}; long tasks ${r.sellBurstLt.length} (max ${f0(Math.max(0, ...r.sellBurstLt))})`);
    console.log(`  tap→paint Buy: ${L(r.buyTap)}`);
    if (r.holdFrames) console.log(`  hold Buy 3 s: bought ${r.holdBought}; frames p95 ${f1(r.holdFrames.p95)} max ${f0(r.holdFrames.max)}; long tasks ${r.holdLt.length} (max ${f0(Math.max(0, ...r.holdLt))})`);
    if (r.tabSwitch) console.log(`  tab switch to paint: p50 ${f0(r.tabSwitch.p50)} max ${f0(r.tabSwitch.max)} ms; long tasks [${r.tabSwitch.lt.map(f0).join(' ')}]`);
    console.log(`  memory: heap ${f1(r.mem0.heapMB)} → ${f1(r.mem1.heapMB)} MB, DOM ${r.mem0.domNodes} → ${r.mem1.domNodes} elements, listeners ${r.mem0.listeners} → ${r.mem1.listeners}`);
    if (r.errs.length) console.log(`  ERRORS: ${r.errs.slice(0, 3).join(' | ')}`);
  }
}
if (flag('tabs') && saves.late?.text) {
  results.tabs = await perTab(saves.late);
  console.log('\n== late, each Industry @4× (frames p50/p95/max, long tasks, scene.update mean/max)');
  for (const [id, x] of Object.entries(results.tabs)) console.log(`  ${id.padEnd(8)} ${f1(x.frames.p50)} / ${f1(x.frames.p95)} / ${f0(x.frames.max)} ms, LT ${x.lt.length}, scene ${x.prof['scene.update'] ? f1(x.prof['scene.update'].t / x.prof['scene.update'].n) + '/' + f1(x.prof['scene.update'].max) : '—'}, ui.update ${x.prof['ui.update'] ? f1(x.prof['ui.update'].t / x.prof['ui.update'].n) : '—'}`);
}
if (SOAK && saves.late?.text) {
  console.log(`\n== soak, late state, ${SOAK} min at 1×`);
  results.soak = await soak(saves.late, SOAK);
}
if (LABEL) {
  mkdirSync(resolve(root, 'design/scratch'), { recursive: true });
  writeFileSync(resolve(root, `design/scratch/perf-${LABEL}.json`), JSON.stringify(results, null, 1));
}
await browser.close();
