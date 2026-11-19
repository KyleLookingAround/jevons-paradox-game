// Renders the Home Screen icon (src/ui/install.ts iconSvg) to public/icons/: icon.svg, icon-192.png, icon-512.png and
// apple-touch-icon.png (180). Run after changing the drawing:  node tools/icons.mjs   (needs bun and playwright).
import { createRequire } from 'node:module';
import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const { chromium } = createRequire(import.meta.url)('playwright');
const svg = execFileSync('bun', ['-e', "import { iconSvg } from './src/ui/install.ts'; process.stdout.write(iconSvg());"], { cwd: root }).toString();
const out = resolve(root, 'public/icons');
mkdirSync(out, { recursive: true });
writeFileSync(resolve(out, 'icon.svg'), svg);
const browser = await chromium.launch();
for (const [name, size] of [['icon-192.png', 192], ['icon-512.png', 512], ['apple-touch-icon.png', 180]]) {
  const page = await browser.newPage({ viewport: { width: size, height: size }, deviceScaleFactor: 1 });
  await page.setContent(`<style>html,body{margin:0}svg{display:block;width:${size}px;height:${size}px}</style>${svg}`);
  writeFileSync(resolve(out, name), await page.screenshot({ type: 'png', omitBackground: false }));
  await page.close();
}
await browser.close();
console.log('public/icons/: icon.svg, icon-192.png, icon-512.png, apple-touch-icon.png');
