// Runs the measurement harness in headless Chromium.
//   bun build is done first (bun run src/ui/audio/bench/build.ts), then: node src/ui/audio/bench/run.mjs <script.json|inline>
// Usage: node src/ui/audio/bench/run.mjs '<js expression using bench, returning JSON>' [out.json]
// PNG data URLs in the result (keys named png) are written to shots/audio/<name>.png when the result has `pngName`.
const { chromium } = require('playwright');
const fs = require('node:fs');
const path = require('node:path');

const page_ = path.resolve(process.env.BENCH_HTML || 'dist/audio-bench.html');
const expr = process.argv[2];
(async () => {
  const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  const page = await browser.newPage();
  page.on('console', (m) => { if (m.type() === 'error') console.error('[page]', m.text()); });
  page.on('pageerror', (e) => console.error('[pageerror]', e.message));
  await page.goto('file://' + page_);
  await page.waitForFunction(() => document.title === 'audio bench ready');
  const res = await page.evaluate(`(async () => { ${expr} })()`);
  const save = (o) => {
    if (!o || typeof o !== 'object') return;
    for (const [k, v] of Object.entries(o)) {
      if (typeof v === 'string' && v.startsWith('data:image/png') && o.pngName) {
        fs.mkdirSync('shots/audio', { recursive: true });
        fs.writeFileSync(`shots/audio/${o.pngName}.png`, Buffer.from(v.split(',')[1], 'base64'));
        o[k] = `shots/audio/${o.pngName}.png`;
      } else if (v && typeof v === 'object') save(v);
    }
  };
  save(res);
  const out = JSON.stringify(res, null, 1);
  if (process.argv[3]) fs.writeFileSync(process.argv[3], out);
  console.log(out.length > 20000 ? out.slice(0, 20000) + '…' : out);
  await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
