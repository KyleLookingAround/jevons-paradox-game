// bun run tools/audio-bench.ts → dist/audio-bench.html: the soundscape measurement page (src/ui/audio/bench/page.ts),
// driven in headless Chromium by tools/audio-run.cjs. Not shipped.
import { writeFileSync, mkdirSync } from 'node:fs';
const r = await Bun.build({ entrypoints: ['src/ui/audio/bench/page.ts'], minify: false, target: 'browser', format: 'iife' });
if (!r.success) { for (const l of r.logs) console.error(l); process.exit(1); }
const js = (await r.outputs[0].text()).replace(/<\/script/gi, '<\\/script');
mkdirSync('dist', { recursive: true });
writeFileSync('dist/audio-bench.html', `<!DOCTYPE html><html><head><meta charset="utf-8"><title>audio bench</title></head><body><script>${js}</script></body></html>`);
console.log('dist/audio-bench.html');
