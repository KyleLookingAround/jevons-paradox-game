// Live check of dist/audio-demo.html in headless Chromium: taps "Sound on" (the gesture unlock), plays the 60 s
// collapse run in real time under CPU throttling, samples stats() and long tasks, screenshots at phone width.
//   bun run tools/audio-demo.ts && node tools/audio-live.cjs [throttle=4] [seconds=30] [industry=steam]
// M4: the third argument picks the Industry (e.g. iron, fishing) from the demo's menu before the run; the summary adds
// update()/tick p95 from the stats samples.
const { chromium } = require('playwright');
const path = require('node:path');
(async () => {
  const rate = +(process.argv[2] || 4), secs = +(process.argv[3] || 30), industry = process.argv[4] || 'steam';
  const browser = await chromium.launch({ args: ['--autoplay-policy=user-gesture-required'] });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  page.on('pageerror', (e) => console.error('[pageerror]', e.message));
  await page.goto('file://' + path.resolve('dist/audio-demo.html'));
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate });
  await page.evaluate(() => { window.__long = []; new PerformanceObserver((l) => { for (const e of l.getEntries()) window.__long.push(Math.round(e.duration)); }).observe({ type: 'longtask', buffered: true }); });
  const before = await page.locator('.stats').textContent();
  if (!process.env.NOSOUND) await page.getByRole("button", { name: "♪ Sound on" }).click();
  await page.waitForTimeout(1500);
  if (industry !== 'steam') { await page.locator('.panel select').first().selectOption(industry); await page.waitForTimeout(1500); }
  await page.getByRole('button', { name: /Run to collapse/ }).click();
  const samples = [];
  for (let i = 0; i < secs; i++) {
    await page.waitForTimeout(1000);
    if (i === 8) for (let k = 0; k < 16; k++) { await page.getByRole('button', { name: 'sell', exact: true }).click(); await page.waitForTimeout(110); }
    samples.push(await page.locator('.stats').textContent());
  }
  const heap = await page.evaluate(() => (performance.memory ? Math.round(performance.memory.usedJSHeapSize / 1e6) : null));
  const longs = await page.evaluate(() => window.__long);
  await page.screenshot({ path: 'shots/audio/demo-phone.png', fullPage: false });
  console.log('before tap:', before.split('\n')[0]);
  for (const [i, s] of samples.entries()) if (i % 3 === 0 || i === samples.length - 1) console.log(`t+${i + 1}s`, s.replace(/\n/g, ' | '));
  console.log('long tasks (ms):', JSON.stringify(longs), 'heap MB', heap);
  const num = (re) => samples.map((x) => { const m = x.match(re); return m ? +m[1] : NaN; }).filter((x) => Number.isFinite(x)).sort((a, b) => a - b);
  const p95 = (a) => (a.length ? a[Math.floor(0.95 * (a.length - 1))] : null);
  const up = num(/update ([\d.]+) ms/), tk = num(/tick ([\d.]+) ms/);
  console.log(`${industry}: update p95 ${p95(up)} ms (max ${up[up.length - 1]}), tick p95 ${p95(tk)} ms (max ${tk[tk.length - 1]}), samples ${up.length}`);
  await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
