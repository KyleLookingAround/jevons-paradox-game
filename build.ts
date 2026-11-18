// Bundles src/main.ts + src/styles.css + index.html into one self-contained dist/index.html.
// Run: bun run build.ts
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';

const result = await Bun.build({ entrypoints: ['src/main.ts'], minify: true, target: 'browser', format: 'iife' });
if (!result.success) {
  for (const log of result.logs) console.error(log);
  process.exit(1);
}
const js = (await result.outputs[0].text()).replace(/<\/script/gi, '<\\/script');
const css = readFileSync('src/styles.css', 'utf8');
const html = readFileSync('index.html', 'utf8');
if (!html.includes('/*__CSS__*/') || !html.includes('/*__JS__*/')) {
  console.error('index.html must contain /*__CSS__*/ inside a <style> and /*__JS__*/ inside a <script>');
  process.exit(1);
}
// Function replacers so `$` sequences in the bundle are not treated as patterns.
const out = html.replace('/*__CSS__*/', () => css).replace('/*__JS__*/', () => js);
mkdirSync('dist', { recursive: true });
writeFileSync('dist/index.html', out);
console.log(`dist/index.html ${(out.length / 1024).toFixed(1)} KB`);
