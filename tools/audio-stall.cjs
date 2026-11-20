// Long tasks attributable to audio, under CPU throttling, on a page that holds only the soundscape (no scene):
//   bun run tools/audio-bench.ts && node tools/audio-stall.cjs [throttle=4] [scenario=default]
// Taps "on" (the real gesture path), feeds a run at 10 Hz for 20 s on Steam, switches to Light, Motion and Compute
// (15 s each), fires interface events, turns off and on three times. Prints every long task (> 50 ms) with time.
const { chromium } = require('playwright');
const path = require('node:path');
(async () => {
  const rate = +(process.argv[2] || 4);
  const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  const page = await browser.newPage();
  page.on('pageerror', (e) => console.error('[pageerror]', e.message));
  await page.goto('file://' + path.resolve('dist/audio-stall.html'));
  await page.waitForFunction(() => document.title === 'stall ready');
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate });
  await page.waitForTimeout(500);
  if (process.argv[3] === 'cycle') {
    // Robustness: turn sound on and off N times quickly (the page destroys the soundscape on off), hide/show the tab
    // in between, then count listeners left on document and window, the heap and the final state.
    const n = +(process.argv[4] || 15);
    const lis = async () => {
      const cnt = async (expr) => { const { result } = await cdp.send('Runtime.evaluate', { expression: expr }); const r = await cdp.send('DOMDebugger.getEventListeners', { objectId: result.objectId }); return r.listeners.map((l) => l.type).sort().join(','); };
      return { doc: await cnt('document'), win: await cnt('window') };
    };
    console.log('listeners before:', JSON.stringify(await lis()));
    await page.click('#on'); await page.evaluate(() => window.stall.start('steam')); await page.waitForTimeout(1500);
    console.log('listeners while on:', JSON.stringify(await lis()));
    for (let i = 0; i < n; i++) {
      await page.evaluate(() => window.stall.off()); await page.waitForTimeout(150 + (i % 3) * 200);
      await page.click('#on'); await page.waitForTimeout(300 + (i % 4) * 250);
      if (i % 5 === 2) { await page.evaluate(() => { window.stall.quiet(true); }); await page.waitForTimeout(300); await page.evaluate(() => { window.stall.quiet(false); }); await page.waitForTimeout(400); }
    }
    await page.waitForTimeout(2500);
    const st = await page.evaluate(() => window.stall.stats());
    console.log('listeners after', n, 'cycles (on):', JSON.stringify(await lis()));
    await page.evaluate(() => window.stall.off()); await page.waitForTimeout(800);
    console.log('listeners after off:', JSON.stringify(await lis()));
    await cdp.send('HeapProfiler.collectGarbage');
    const heap = await page.evaluate(() => Math.round(performance.memory.usedJSHeapSize / 1e5) / 10);
    const longs = await page.evaluate(() => window.__long);
    console.log('final state while on:', JSON.stringify(st), 'heap MB after off + GC:', heap, 'long tasks:', JSON.stringify(longs.map((x) => x.ms)));
    await browser.close(); return;
  }
  const mark = async (label) => { const t = await page.evaluate(() => Math.round(performance.now())); marks.push([t, label]); };
  const marks = [];
  await mark('tap on (steam)');
  await page.click('#on');
  await page.evaluate(() => window.stall.start('steam'));
  await page.waitForTimeout(20000);
  for (const s of ['light', 'iron', 'fishing', 'motion', 'compute']) { await mark(`switch ${s}`); await page.evaluate((x) => window.stall.switchTo(x), s); await page.waitForTimeout(15000); }
  await mark('events');
  const evMs = [];
  for (const k of ['buy', 'found', 'lever', 'headline', 'decade', 'letter', 'answer', 'seam', 'bite', 'survey', 'arrived', 'proprietor', 'ending', 'reveal', 'backfire', 'wager', 'arrears', 'thresholdCrossed', 'surveyReveal', 'actEnding']) { evMs.push([k, await page.evaluate((x) => window.stall.event(x), k)]); await page.waitForTimeout(400); }
  await page.waitForTimeout(3000);
  for (let i = 0; i < 3; i++) {
    await mark(`off ${i}`); const offMs = await page.evaluate(() => window.stall.off()); evMs.push([`off${i}`, offMs]);
    await page.waitForTimeout(800);
    await mark(`on ${i}`); await page.click('#on'); await page.waitForTimeout(4000);
  }
  const st = await page.evaluate(() => window.stall.stats());
  const err = await page.evaluate(() => window.__audioErr); if (err) console.log('audio error:', err);
  const longs = await page.evaluate(() => window.__long);
  const log = await page.evaluate(() => window.__log);
  const where = (t) => { let l = '?'; for (const [m, n] of marks) if (t >= m) l = n; return l; };
  const byPhase = {};
  for (const { at, ms } of longs) (byPhase[where(at)] ??= []).push(ms);
  console.log(`throttle ${rate}x`);
  console.log('handler times:', log.join('; '));
  console.log('event()/off() main-thread ms:', evMs.map(([k, v]) => `${k} ${v.toFixed(1)}`).join(', '));
  for (const [k, v] of Object.entries(byPhase)) console.log(`  ${k.padEnd(16)} long tasks: ${v.length}  max ${Math.max(...v)} ms  [${v.join(', ')}]`);
  console.log(`total long tasks ${longs.length}, max ${longs.length ? Math.max(...longs.map((x) => x.ms)) : 0} ms, over 50: ${longs.filter((x) => x.ms > 50).length}`);
  console.log('stats at end:', JSON.stringify(st));
  await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
