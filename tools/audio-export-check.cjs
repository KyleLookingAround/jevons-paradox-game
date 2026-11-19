// Drives the demo's "Export for a DAW" panel in headless Chromium and saves what it downloads; measures long tasks
// and memory meanwhile, and can cancel. Usage:
//   bun run tools/audio-demo.ts
//   node tools/audio-export-check.cjs <outdir> <kind> [key=value ...]
//     kind: loop | stems | oneshots | runs | industry | everything | quickloop | cancel
//     keys: sector=steam state=late len=60 seamless=1 content=all dry=1 norm=0 run=60 fmt=pcm24 take=1 cancelAt=10
// Writes <outdir>/<zip or wav> and <outdir>/<kind>.json (time, long tasks, heap). Then: python3 tools/audio-export-check.py
const { chromium } = require('playwright');
const fs = require('node:fs');
const path = require('node:path');
const { execSync } = require('node:child_process');
/** Resident memory (MB) of this browser's process tree: the page's heap, its audio buffers and the browser's Blob store. */
let rootPid = 0;
const rss = () => {
  try {
    const rows = execSync('ps -eo pid,ppid,rss').toString().trim().split('\n').slice(1).map((l) => l.trim().split(/\s+/).map(Number));
    const kids = new Map(); for (const [pid, ppid] of rows) (kids.get(ppid) ?? kids.set(ppid, []).get(ppid)).push(pid);
    const mem = new Map(rows.map(([pid, , r]) => [pid, r]));
    let tot = 0; const st = [rootPid];
    while (st.length) { const p = st.pop(); tot += mem.get(p) ?? 0; for (const k of kids.get(p) ?? []) st.push(k); }
    return Math.round(tot / 1024);
  } catch { return -1; }
};

const [outDir, kind, ...kv] = process.argv.slice(2);
const opt = Object.fromEntries(kv.map((x) => x.split('=')));
const html = path.resolve(process.env.DEMO_HTML || 'dist/audio-demo.html');
(async () => {
  fs.mkdirSync(outDir, { recursive: true });
  const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required', '--enable-precise-memory-info'] });
  rootPid = process.pid;   // this script and the browser it launched (its children)
  const ctx = await browser.newContext({ acceptDownloads: true, viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => console.error('[pageerror]', e.message));
  page.on('console', (m) => { if (m.type() === 'error') console.error('[page]', m.text()); });
  page.on('dialog', (d) => d.accept());
  await page.addInitScript(() => {
    window.__long = [];
    try { new PerformanceObserver((l) => { for (const e of l.getEntries()) window.__long.push([Math.round(e.startTime), Math.round(e.duration)]); }).observe({ type: 'longtask', buffered: true }); } catch {}
  });
  await page.goto('file://' + html);
  await page.waitForSelector('#export button[data-kind=loop]');
  const cdp = await ctx.newCDPSession(page);
  await cdp.send('Performance.enable');
  const heap = async () => { const m = await cdp.send('Performance.getMetrics'); return Math.round((m.metrics.find((x) => x.name === 'JSHeapUsedSize').value) / 1e6); };
  if (opt.sector) { await page.selectOption('.panel select >> nth=0', opt.sector); await page.waitForTimeout(300); }
  const setSel = (label, v) => page.selectOption(`#export select[aria-label="${label}"]`, String(v));
  if (opt.state) await setSel('State to export', opt.state);
  if (opt.len) await setSel('Loop length', opt.len);
  if (opt.content) await setSel('Loop content', opt.content);
  if (opt.run) await setSel('Run length', opt.run);
  if (opt.fmt) await setSel('Bit depth', opt.fmt);
  const box = async (text, on) => { const c = page.locator('#export label.chk', { hasText: text }).locator('input'); if ((await c.isChecked()) !== on) await c.click(); };
  if (opt.seamless != null) await box('seamless', opt.seamless === '1');
  if (opt.dry != null) await box('dry set', opt.dry === '1');
  if (opt.norm != null) await box('normalise', opt.norm === '1');
  if (await page.locator('#export label.chk', { hasText: 'write straight' }).count()) await box('write straight', false);   // headless: no file picker
  if (opt.take) { await page.fill('#export input[aria-label=Take]', String(opt.take)); await page.press('#export input[aria-label=Take]', 'Tab'); }
  await page.waitForTimeout(600);
  const label = await page.textContent(kind === 'quickloop' ? '#export button:has-text("Loop as one WAV")' : `#export button[data-kind=${kind === 'cancel' ? (opt.what || 'stems') : kind}]`);
  const t0 = Date.now();
  await page.evaluate(() => { window.__long.length = 0; });
  const heaps = [await heap()], rsses = [rss()];
  const hb = setInterval(async () => { try { rsses.push(rss()); heaps.push(await heap()); } catch {} }, 1000);
  // A responsiveness probe: how late a 50 ms timer fires while the export runs.
  await page.evaluate(() => { window.__lag = []; let last = performance.now(); window.__probe = setInterval(() => { const n = performance.now(); window.__lag.push(n - last - 50); last = n; }, 50); });
  let result = {};
  if (kind === 'cancel') {
    await page.click(`#export button[data-kind=${opt.what || 'stems'}]`);
    await page.waitForTimeout(+(opt.cancelAt || 8) * 1000);
    await page.click('#export button:has-text("Cancel")');
    await page.waitForFunction(() => document.querySelector('#export').dataset.state !== 'busy', null, { timeout: 30000 });
    result.state = await page.evaluate(() => document.querySelector('#export').dataset.state);
    result.status = await page.textContent('#export .xstatus');
    // After cancelling, a further export still works.
    await page.selectOption('#export select[aria-label="Loop length"]', '15');
    const [d2] = await Promise.all([page.waitForEvent('download', { timeout: 600000 }), page.click('#export button[data-kind=loop]')]);
    result.after = d2.suggestedFilename();
    await d2.saveAs(path.join(outDir, d2.suggestedFilename()));
  } else {
    const dls = [];
    page.on('download', (d) => dls.push(d));
    await page.click(kind === 'quickloop' ? '#export button:has-text("Loop as one WAV")' : `#export button[data-kind=${kind}]`);
    await page.waitForFunction(() => { const s = document.querySelector('#export').dataset.state; return s === 'done' || s === 'error' || s === 'cancelled'; }, null, { timeout: 7200000, polling: 500 });
    await page.waitForTimeout(500);
    result.state = await page.evaluate(() => document.querySelector('#export').dataset.state);
    result.status = await page.textContent('#export .xstatus');
    result.files = [];
    for (const d of dls) { const f = path.join(outDir, d.suggestedFilename()); await d.saveAs(f); result.files.push(f); }
  }
  clearInterval(hb);
  const lag = await page.evaluate(() => { clearInterval(window.__probe); const l = window.__lag.slice().sort((a, b) => a - b); return { n: l.length, p50: Math.round(l[l.length >> 1]), p99: Math.round(l[Math.floor(l.length * 0.99)]), max: Math.round(l[l.length - 1]) }; });
  const long = await page.evaluate(() => window.__long);
  Object.assign(result, { kind, opt, label, seconds: (Date.now() - t0) / 1000, longTasks: long.length, longMax: long.reduce((a, x) => Math.max(a, x[1]), 0), over100: long.filter((x) => x[1] > 100).length, timerLag: lag, heapMB: { start: heaps[0], max: Math.max(...heaps), end: heaps[heaps.length - 1] }, chromiumRssMB: { start: rsses[0], max: Math.max(...rsses), end: rsses[rsses.length - 1] } });
  fs.writeFileSync(path.join(outDir, `${kind}.json`), JSON.stringify(result, null, 1));
  console.log(JSON.stringify(result, null, 1));
  await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
