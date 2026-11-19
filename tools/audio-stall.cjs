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
  const mark = async (label) => { const t = await page.evaluate(() => Math.round(performance.now())); marks.push([t, label]); };
  const marks = [];
  await mark('tap on (steam)');
  await page.click('#on');
  await page.evaluate(() => window.stall.start('steam'));
  await page.waitForTimeout(20000);
  for (const s of ['light', 'motion', 'compute']) { await mark(`switch ${s}`); await page.evaluate((x) => window.stall.switchTo(x), s); await page.waitForTimeout(15000); }
  await mark('events');
  const evMs = [];
  for (const k of ['buy', 'found', 'lever', 'headline', 'decade', 'letter', 'answer', 'seam', 'bite', 'survey', 'arrived', 'proprietor', 'ending', 'reveal', 'backfire']) { evMs.push([k, await page.evaluate((x) => window.stall.event(x), k)]); await page.waitForTimeout(400); }
  await page.waitForTimeout(3000);
  for (let i = 0; i < 3; i++) {
    await mark(`off ${i}`); const offMs = await page.evaluate(() => window.stall.off()); evMs.push([`off${i}`, offMs]);
    await page.waitForTimeout(800);
    await mark(`on ${i}`); await page.click('#on'); await page.waitForTimeout(4000);
  }
  const st = await page.evaluate(() => window.stall.stats());
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
