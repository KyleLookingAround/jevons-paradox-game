// bun run tools/audio-bench.ts → dist/audio-bench.html (offline measurement page, src/ui/audio/bench/page.ts, driven by
// tools/audio-run.cjs) and dist/audio-stall.html (live long-task page, src/ui/audio/bench/live.ts, driven by
// tools/audio-stall.cjs). Not shipped.
import { writeFileSync, mkdirSync } from 'node:fs';
mkdirSync('dist', { recursive: true });
for (const [entry, out, title] of [['src/ui/audio/bench/page.ts', 'dist/audio-bench.html', 'audio bench'], ['src/ui/audio/bench/live.ts', 'dist/audio-stall.html', 'audio stall']]) {
  const r = await Bun.build({ entrypoints: [entry], minify: false, target: 'browser', format: 'iife' });
  if (!r.success) { for (const l of r.logs) console.error(l); process.exit(1); }
  const js = (await r.outputs[0].text()).replace(/<\/script/gi, '<\\/script');
  writeFileSync(out, `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${title}</title></head><body><script>${js}</script></body></html>`);
  console.log(out);
}
