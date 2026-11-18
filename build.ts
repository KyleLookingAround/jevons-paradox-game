// Builds the game into dist/.
//   bun run build.ts            → dist/index.html + dist/app.js + dist/styles.css  (what GitHub Pages serves)
//   bun run build.ts --single   → dist/single.html, everything inlined (handy for sharing one file)
//
// index.html is a template holding `/*__CSS__*/` inside a <style> and `/*__JS__*/` inside a <script>.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';

const single = process.argv.includes('--single');

const result = await Bun.build({ entrypoints: ['src/main.ts'], minify: true, target: 'browser', format: 'iife' });
if (!result.success) {
  for (const log of result.logs) console.error(log);
  process.exit(1);
}
const js = await result.outputs[0].text();
const css = readFileSync('src/styles.css', 'utf8');
const html = readFileSync('index.html', 'utf8');
if (!html.includes('/*__CSS__*/') || !html.includes('/*__JS__*/')) {
  console.error('index.html must contain /*__CSS__*/ inside a <style> and /*__JS__*/ inside a <script>');
  process.exit(1);
}

mkdirSync('dist', { recursive: true });
const kb = (s: string) => `${(s.length / 1024).toFixed(1)} KB`;

// Function replacers throughout, so `$` sequences in the bundle are not treated as patterns.
const inline = () =>
  html.replace('/*__CSS__*/', () => css).replace('/*__JS__*/', () => js.replace(/<\/script/gi, '<\\/script'));

if (single) {
  const out = inline();
  writeFileSync('dist/single.html', out);
  console.log(`dist/single.html ${kb(out)}`);
} else {
  const styleTag = /<style[^>]*>\s*\/\*__CSS__\*\/\s*<\/style>/;
  const scriptTag = /<script[^>]*>\s*\/\*__JS__\*\/\s*<\/script>/;
  if (styleTag.test(html) && scriptTag.test(html)) {
    // Cache-bust by content so a new deploy is picked up straight away.
    const hash = (s: string) => Bun.hash(s).toString(36).slice(0, 8);
    const out = html
      .replace(styleTag, () => `<link rel="stylesheet" href="styles.css?v=${hash(css)}">`)
      .replace(scriptTag, () => `<script src="app.js?v=${hash(js)}" defer></script>`);
    writeFileSync('dist/index.html', out);
    writeFileSync('dist/app.js', js);
    writeFileSync('dist/styles.css', css);
    console.log(`dist/index.html ${kb(out)}  app.js ${kb(js)}  styles.css ${kb(css)}`);
  } else {
    // The template has other content in those tags: fall back to inlining.
    const out = inline();
    writeFileSync('dist/index.html', out);
    console.log(`dist/index.html ${kb(out)} (inlined: template tags hold more than the placeholders)`);
  }
}
