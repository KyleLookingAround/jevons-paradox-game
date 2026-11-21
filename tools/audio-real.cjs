// M5: the sound on the REAL built page (dist/, from `bun run build.ts`), at 390 × 844, 4× CPU throttle.
//   node tools/audio-real.cjs [save=fixtures/m5/ministry-1.json] [out.json]
// Seeds a save, turns sound on from the settings toggle (a real tap), and listens through an analyser tapped onto the
// destination (every connect() to a context's destination is mirrored into it). Records every buffer source started
// (its length, playback rate and time) to find the Ministry clock (watchTick at rate ≈ 0.42, once a second) in the
// game's own SceneView. Then, as the page does not yet pass the M5 events to the sound (UI lane), it makes a second
// soundscape from the shipped lazy part (self.__rb.audio) and fires each M5 kind, measuring what each one plays.
const { chromium } = require('playwright');
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');

const savePath = process.argv[2] || 'fixtures/m5/ministry-1.json';
const outPath = process.argv[3];
const root = path.resolve('dist');
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.svg': 'image/svg+xml', '.png': 'image/png' };
const server = http.createServer((req, res) => {
  const u = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  const f = path.join(root, u === '/' ? 'index.html' : u);
  if (!f.startsWith(root) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { 'content-type': TYPES[path.extname(f)] || 'application/octet-stream' });
  fs.createReadStream(f).pipe(res);
});

(async () => {
  await new Promise((r) => server.listen(0, r));
  const port = server.address().port;
  const browser = await chromium.launch({ args: ['--autoplay-policy=user-gesture-required'] });
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, serviceWorkers: 'block' });
  await ctx.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', (e) => errs.push(e.message));
  const save = fs.readFileSync(savePath, 'utf8');
  await page.addInitScript((s) => {
    if (!sessionStorage.getItem('seeded')) { sessionStorage.setItem('seeded', '1'); localStorage.setItem('rebound.save.v1', s); localStorage.setItem('rebound.save.v1.at', String(Date.now())); }
    window.__starts = []; window.__ctxs = []; window.__long = [];
    try { new PerformanceObserver((l) => { for (const e of l.getEntries()) window.__long.push(Math.round(e.duration)); }).observe({ type: 'longtask', buffered: true }); } catch {}
    const C = window.AudioContext;
    window.AudioContext = class extends C {
      constructor(...a) {
        super(...a);
        const an = super.createAnalyser(); an.fftSize = 4096;
        window.__ctxs.push({ c: this, an });
      }
    };
    const conn = AudioNode.prototype.connect;
    AudioNode.prototype.connect = function (d, ...rest) {
      const r = conn.call(this, d, ...rest);
      if (d instanceof AudioDestinationNode) { const e = window.__ctxs.find((x) => x.c === this.context); if (e) conn.call(this, e.an); }
      return r;
    };
    const st = AudioBufferSourceNode.prototype.start;
    AudioBufferSourceNode.prototype.start = function (...a) {
      const e = window.__ctxs.findIndex((x) => x.c === this.context);
      window.__starts.push({ ctx: e, at: a[0] ?? this.context.currentTime, dur: this.buffer ? this.buffer.duration : 0, rate: this.playbackRate.value, loop: this.loop });
      return st.apply(this, a);
    };
    window.__level = (i = 0) => { const e = window.__ctxs[i]; if (!e) return null; const b = new Float32Array(e.an.fftSize); e.an.getFloatTimeDomainData(b); let s = 0, p = 0; for (const x of b) { s += x * x; p = Math.max(p, Math.abs(x)); } return [Math.round(10 * Math.log10(s / b.length + 1e-12) * 10) / 10, Math.round(20 * Math.log10(p + 1e-9) * 10) / 10]; };
  }, save);
  await page.goto(`http://localhost:${port}/`);
  await page.waitForTimeout(3000);
  const cdp = await ctx.newCDPSession(page);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  const out = { errs };
  out.inOffice = await page.evaluate(() => !!window.rebound?.d?.chair);
  out.htmlMinistry = await page.evaluate(() => document.documentElement.hasAttribute('data-ministry'));
  out.contextsBeforeTap = await page.evaluate(() => window.__ctxs.length);
  // Sound on, from the settings toggle (a real tap).
  await page.click('.tb-menu'); await page.waitForTimeout(600);
  await page.locator('.setting.snd .tog').scrollIntoViewIfNeeded();
  await page.click('.setting.snd .tog'); await page.waitForTimeout(400);
  await page.keyboard.press('Escape'); await page.waitForTimeout(300);
  for (let i = 0; i < 3; i++) { await page.mouse.click(200, 120); await page.waitForTimeout(300); }
  out.contextsAfterTap = await page.evaluate(() => window.__ctxs.length);
  out.state = await page.evaluate(() => window.__ctxs[0]?.c.state);
  // Listen 16 s in office on the open tab; then switch tab (Motion) and listen 12 s.
  const listen = async (secs) => { const L = []; for (let i = 0; i < secs * 2; i++) { L.push(await page.evaluate(() => window.__level(0))); await page.waitForTimeout(500); } return L; };
  const sector0 = await page.evaluate(() => window.rebound.ctx.sector);
  const t0 = await page.evaluate(() => window.__ctxs[0]?.c.currentTime ?? 0);
  out.levels = { [sector0]: await listen(16) };
  const tSwitch = await page.evaluate(() => window.__ctxs[0]?.c.currentTime ?? 0);
  await page.evaluate(() => window.rebound.ctx.selectSector(window.rebound.ctx.sector === 'motion' ? 'steam' : 'motion'));
  await page.waitForTimeout(100);
  const sector1 = await page.evaluate(() => window.rebound.ctx.sector) + ' (after switch)';
  out.levels[sector1] = await listen(12);
  const clock = await page.evaluate((t) => window.__starts.filter((s) => s.ctx === 0 && !s.loop && s.at > t && s.rate > 0.4 && s.rate < 0.44 && s.dur < 0.1).map((s) => s.at), t0);
  const gaps = clock.slice(1).map((t, i) => Math.round((t - clock[i]) * 1000) / 1000);
  out.clock = { ticks: clock.length, gapMin: Math.min(...gaps), gapMax: Math.max(...gaps), gapsSample: gaps.slice(0, 10), secondsListened: 28,
    longGapsAt: gaps.map((g, i) => [g, Math.round((clock[i] - tSwitch) * 10) / 10]).filter(([g]) => g > 1.05).map(([g, t]) => `${g} s gap starting ${t} s from the tab switch`) };
  out.startsAroundSwitch = await page.evaluate((ts) => window.__starts.filter((s) => s.ctx === 0 && !s.loop && s.at > ts - 1 && s.at < ts + 7).map((s) => `${(s.at - ts).toFixed(2)}:${s.rate.toFixed(2)}:${s.dur.toFixed(2)}`), tSwitch);
  out.loopsStarted = await page.evaluate(() => window.__starts.filter((s) => s.ctx === 0 && s.loop).length);
  // The M5 moments through the shipped part: a second soundscape, unlocked by a tap, each kind fired alone.
  out.part = await page.evaluate(() => !!(self.__rb && self.__rb.audio));
  await page.evaluate(() => { window.__ss = self.__rb.audio.createSoundscape({ enabled: true, seed: 3 }); });
  await page.mouse.click(200, 120); await page.waitForTimeout(500);
  const ctxIdx = await page.evaluate(() => window.__ctxs.length - 1);
  out.secondContext = await page.evaluate((i) => window.__ctxs[i]?.c.state, ctxIdx);
  out.events = {};
  const KINDS = [['officeTaken', {}], ['electionCalled', {}], ['electionWon', {}], ['electionLost', {}], ['inspected', {}], ['concealmentFound', {}], ['rivalAnswered', { label: 'lobby' }], ['rivalAnswered', { label: 'comply' }], ['litigated', {}], ['loopholeUsed', {}], ['loopholeClosed', {}], ['treaty', {}]];
  for (const [k, d] of KINDS) {
    const before = await page.evaluate((i) => window.__starts.filter((s) => s.ctx === i).length, ctxIdx);
    await page.evaluate(([k, d]) => window.__ss.event(k, { sector: 'motion', ...d }), [k, d]);
    let pk = -240, n = 0;
    for (let i = 0; i < 12; i++) { await page.waitForTimeout(250); const l = await page.evaluate((i) => window.__level(i), ctxIdx); if (l && l[1] > pk) pk = l[1]; }
    n = await page.evaluate(([i, b]) => window.__starts.filter((s) => s.ctx === i).length - b, [ctxIdx, before]);
    out.events[k + (d.label ? ':' + d.label : '')] = { buffersStarted: n, peakDbAt250ms: pk };
    await page.waitForTimeout(k === 'treaty' || k === 'officeTaken' ? 3000 : 800);
  }
  await page.evaluate(() => window.__ss.destroy());
  out.longTasks = await page.evaluate(() => window.__long.length);
  await page.screenshot({ path: 'shots/audio/m5-real-page.png' });
  const s = JSON.stringify(out, null, 1);
  if (outPath) fs.writeFileSync(outPath, s);
  console.log(s);
  await browser.close(); server.close();
})().catch((e) => { console.error(e); process.exit(1); });
