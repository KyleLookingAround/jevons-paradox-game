// Builds the game into dist/ (see docs/adr/ADR-2026-11-19-split-build-lazy-parts-service-worker.md).
//   bun run build.ts            → what GitHub Pages serves:
//       index.html                 the shell: inline boot styles are not used; links the hashed stylesheet and main script
//       app.<hash>.js              the main script: the core, the content's rules and words, the page (classic script, deferred)
//       styles.<hash>.css          the page's stylesheet (minified)
//       scene.<hash>.js            lazy: the scene engine, art styles, layouts and props (loaded right after first paint)
//       audio.<hash>.js            lazy: the sound engine (only when sound is on, or the settings sheet opens)
//       archive.<hash>.js          lazy: the Archive notes' text and sources (when the Archive is first opened)
//       sw.js                      the service worker (offline play; a new edition is offered, never forced)
//       manifest.webmanifest       the web app manifest (icons from public/icons/)
//       build.json                 file names and sizes (tools/perf.mjs --check reads it)
//     and everything under public/ (as the Pages workflow also copies it).
//   bun run build.ts --single   → dist/single.html, everything inlined, no service worker (handy for sharing one file)
//
// Lazy parts are classic scripts that register themselves on `self.__rb` (src/ui/chunks.ts): they load from file://,
// on Pages and on old Safari alike. The main script finds their URLs in `self.__rbChunks`, written into index.html.
//
// index.html is a template holding `/*__CSS__*/` inside a <style> and `/*__JS__*/` inside a <script>.
import { readFileSync, writeFileSync, mkdirSync, readdirSync, rmSync, existsSync, cpSync } from 'node:fs';
import { gzipSync, brotliCompressSync, constants as zc } from 'node:zlib';

const single = process.argv.includes('--single');
// --check: fail (exit 1) when a shipped file is over its budget (BUDGET below). Run by the Pages workflow on every build.
const check = process.argv.includes('--check');
const quiet = process.argv.includes('--quiet');

/* ---------------------------------------------------------------- the Archive's text, split from its rules */
// The core's rules read only each note's id and subject (src/core/archive.ts); the title, date, text and sources are
// shown only in the Archive sheet. The main script gets the notes without them; they arrive as the 'archiveText' part when the sheet
// first opens (src/ui/archive.ts fills them in). The data files are not touched: the split is made here.
const { archive } = await import('./src/content/archive/index.ts');
type Note = { id: string; subject: string; title: string; date?: string; text: string; sources: unknown[] };
const notes = archive as Note[];
const archiveStub = `export const archive = ${JSON.stringify(notes.map((n) => ({ id: n.id, subject: n.subject, title: '', text: '', sources: [] })))};`;
const archiveText = Object.fromEntries(notes.map((n) => [n.id, [n.text, n.sources, n.title, n.date]]));
const archivePlugin = {
  name: 'archive-text-split',
  setup(b: { onLoad: (o: { filter: RegExp }, f: () => { contents: string; loader: 'ts' }) => void }) {
    b.onLoad({ filter: /src[\\/]content[\\/]archive[\\/]index\.ts$/ }, () => ({ contents: archiveStub, loader: 'ts' }));
  },
};

/* ---------------------------------------------------------------- scripts */
/** JSON safe inside a <script>: no '<' (so no '</script'), and the two line separators old parsers refuse escaped. */
const safeJson = (o: unknown): string => JSON.stringify(o).replace(/</g, '\\u003c').split(String.fromCharCode(0x2028)).join('\\u2028').split(String.fromCharCode(0x2029)).join('\\u2029');
async function bundle(entry: string, plugins: unknown[] = []): Promise<string> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const r = await Bun.build({ entrypoints: [entry], minify: true, target: 'browser', format: 'iife', plugins: plugins as any });
  if (!r.success) {
    for (const log of r.logs) console.error(log);
    process.exit(1);
  }
  return r.outputs[0].text();
}
const js = await bundle('src/main.ts', [archivePlugin]);
const lazy: Record<string, string> = {
  scene: await bundle('src/ui/lazy/scene.ts'),
  audio: await bundle('src/ui/lazy/audio.ts'),
  // JSON in a script: escape what could end the script or break it in old parsers.
  archiveText: `(function(){var G=self;(G.__rb=G.__rb||{}).archiveText=${safeJson(archiveText)};G.__rbOn&&G.__rbOn("archiveText")})();`,
};
const FILE: Record<string, string> = { scene: 'scene', audio: 'audio', archiveText: 'archive' };

/* ---------------------------------------------------------------- styles */
/** Comments and runs of white space out; space around { } ; and , dropped. Nothing else is touched (a space before ':'
 *  can matter in a selector, so it is left). Strings in the sheet are only url()s and content: '…' without those. */
function minifyCss(css: string): string {
  return css
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\s+/g, ' ')
    .replace(/\s*([{};,])\s*/g, '$1')
    .replace(/;}/g, '}')
    .trim();
}
const css = minifyCss(readFileSync('src/styles.css', 'utf8'));

const html = readFileSync('index.html', 'utf8');
if (!html.includes('/*__CSS__*/') || !html.includes('/*__JS__*/')) {
  console.error('index.html must contain /*__CSS__*/ inside a <style> and /*__JS__*/ inside a <script>');
  process.exit(1);
}
const styleTag = /<style[^>]*>\s*\/\*__CSS__\*\/\s*<\/style>/;
const scriptTag = /<script[^>]*>\s*\/\*__JS__\*\/\s*<\/script>/;
if (!styleTag.test(html) || !scriptTag.test(html)) {
  console.error('index.html: the <style> and <script> must hold only their placeholders');
  process.exit(1);
}
const noScript = (s: string) => s.replace(/<\/script/gi, '<\\/script');

mkdirSync('dist', { recursive: true });
const kb = (n: number) => `${(n / 1024).toFixed(1)} KB`;
const gz = (s: string | Buffer) => gzipSync(s, { level: 9 }).length;
// Brotli is reported for information (Pages serves gzip); a Bun without it reports 0.
const br = (s: string | Buffer) => { try { return brotliCompressSync(s, { params: { [zc.BROTLI_PARAM_QUALITY]: 11 } }).length; } catch { return 0; } };

if (single) {
  // Everything in one file. The lazy parts ride along as inert text (type="text/plain") and are run by chunks.ts when
  // first asked for, so the single file starts as light as the site. No manifest, no service worker.
  const parts = Object.entries(lazy).map(([n, s]) => `<script type="text/plain" id="rb-chunk-${n}">${noScript(s)}</script>`).join('\n');
  const map = Object.fromEntries(Object.keys(lazy).map((n) => [n, '#rb-chunk-' + n]));
  const out = html
    .replace(styleTag, () => `<style>${css}</style>`)
    .replace(/\s*<link rel="manifest"[^>]*>/, '').replace(/\s*<link rel="apple-touch-icon"[^>]*>/, '')
    .replace(scriptTag, () => `${parts}\n<script>self.__rbChunks=${JSON.stringify(map)};self.__rbSingle=1</script>\n<script>${noScript(js)}</script>`);
  writeFileSync('dist/single.html', out);
  console.log(`dist/single.html ${kb(out.length)} (gz ${kb(gz(out))})`);
  process.exit(0);
}

/* ---------------------------------------------------------------- files */
const hash = (s: string | Buffer) => Bun.hash(s).toString(36).slice(0, 8);
// Our own hashed files from earlier builds go (other tools' pages in dist/ stay).
for (const f of readdirSync('dist')) if (/^(app|scene|audio|archive|styles)\.[a-z0-9]+\.(js|css)$/.test(f) || f === 'app.js' || f === 'styles.css') rmSync('dist/' + f);
// public/ first (the workflow copies it again after the build; here so a local build serves the same site).
if (existsSync('public')) cpSync('public', 'dist', { recursive: true });

const files: Record<string, { file: string; raw: number; gz: number; br: number; when: string }> = {};
function emit(name: string, base: string, ext: string, body: string, when: string): string {
  const file = `${base}.${hash(body)}.${ext}`;
  writeFileSync('dist/' + file, body);
  files[name] = { file, raw: Buffer.byteLength(body), gz: gz(body), br: br(body), when };
  return file;
}
const appFile = emit('app', 'app', 'js', js, 'first paint');
const cssFile = emit('styles', 'styles', 'css', css, 'first paint');
const chunkMap: Record<string, string> = {};
for (const [n, s] of Object.entries(lazy)) chunkMap[n] = emit(n, FILE[n], 'js', s, n === 'scene' ? 'after first paint' : n === 'audio' ? 'sound on / settings opened' : 'Archive opened');

// The edition: changes whenever any shipped file changes (the service worker's cache name and the page's update check).
// Kill switch: REBOUND_SW=off emits a worker that removes itself and every cache, and a page that registers none.
const swOff = process.env.REBOUND_SW === 'off';
const edition = hash(Object.values(files).map((f) => f.file).join('|'));
const page = html
  .replace(styleTag, () => `<link rel="stylesheet" href="${cssFile}">`)
  .replace(scriptTag, () => `<script>self.__rbChunks=${JSON.stringify(chunkMap)};self.__rbEdition=${JSON.stringify(swOff ? '' : edition)}</script>\n<script src="${appFile}" defer></script>`);
writeFileSync('dist/index.html', page);
files.index = { file: 'index.html', raw: page.length, gz: gz(page), br: br(page), when: 'first paint' };

// The web app manifest (icons from public/icons/, made by tools/icons.mjs).
const BG = '#efe6d0';
const manifest = {
  name: 'Rebound', short_name: 'Rebound', id: './',
  description: 'An incremental game about Jevons paradox: every efficiency upgrade makes the world burn more.',
  start_url: './', scope: './', display: 'standalone', orientation: 'any', background_color: BG, theme_color: BG, lang: 'en-GB',
  icons: [
    { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
    { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
    { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    { src: 'icons/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
  ],
};
writeFileSync('dist/manifest.webmanifest', JSON.stringify(manifest));

// The service worker: the shell precached under this edition's name; lazy parts cached on first use.
const icons = existsSync('public/icons') ? readdirSync('public/icons').map((f) => 'icons/' + f) : [];
const sw = readFileSync('src/sw.js', 'utf8')
  .replace('__KILL__', String(swOff))
  .replace('__EDITION__', edition)
  .replace('__SHELL__', JSON.stringify(['./', appFile, cssFile, chunkMap.scene, 'manifest.webmanifest', ...icons]))
  .replace('__LAZY__', JSON.stringify(Object.values(chunkMap).filter((f) => f !== chunkMap.scene)));
writeFileSync('dist/sw.js', sw);

const initial = ['index', 'app', 'styles'];
const sum = (k: 'raw' | 'gz' | 'br', names: string[]) => names.reduce((a, n) => a + (files[n]?.[k] ?? 0), 0);
writeFileSync('dist/build.json', JSON.stringify({ edition, files, initial, initialGz: sum('gz', initial), initialBr: sum('br', initial), initialJsGz: files.app.gz }, null, 1));
/* ---------------------------------------------------------------- budgets (KB; perf pass 2, docs/adr/ADR-2026-11-19-*) */
// Gzipped sizes, a little above the build that set them, so a real regression fails and noise does not. Raise one only
// with a reason in the commit (and a look at what grew: `bun run build.ts` prints every file).
const BUDGET: Record<string, number> = { firstPaint: 240, app: 218, styles: 22, scene: 100, audio: 38, archiveText: 62 };
const over: string[] = [];
const gzKB = (n: number) => n / 1024;
if (gzKB(sum('gz', initial)) > BUDGET.firstPaint) over.push(`first paint ${gzKB(sum('gz', initial)).toFixed(1)} KB gz > ${BUDGET.firstPaint}`);
for (const n of ['app', 'styles', 'scene', 'audio', 'archiveText']) if (files[n] && gzKB(files[n].gz) > BUDGET[n]) over.push(`${n} ${gzKB(files[n].gz).toFixed(1)} KB gz > ${BUDGET[n]}`);
if (check) {
  if (over.length) { console.error('Over budget:\n  ' + over.join('\n  ')); process.exit(1); }
  console.log('Sizes within budget.');
}
if (!quiet) {
  for (const [n, f] of Object.entries(files)) console.log(`${f.file.padEnd(24)} ${kb(f.raw).padStart(9)}  gz ${kb(f.gz).padStart(8)}  br ${kb(f.br).padStart(8)}  ${n === 'index' ? '' : f.when}`);
  console.log(`first paint: ${kb(sum('raw', initial))} (gz ${kb(sum('gz', initial))}, br ${kb(sum('br', initial))}); edition ${edition}`);
}
