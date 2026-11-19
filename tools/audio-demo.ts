// Builds the standalone soundscape demo: bun run tools/audio-demo.ts → dist/audio-demo.html (one self-contained file).
// The real scene and the soundscape side by side, driven by the same hand-made SceneViews (no model or content).
// The page theme tokens are lifted from src/styles.css when present so the scene sits in the real look.
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';

const result = await Bun.build({ entrypoints: ['src/ui/audio/demo/main.ts'], minify: true, target: 'browser', format: 'iife' });
if (!result.success) {
  for (const log of result.logs) console.error(log);
  process.exit(1);
}
const js = (await result.outputs[0].text()).replace(/<\/script/gi, '<\\/script');

let tokens = '';
if (existsSync('src/styles.css')) {
  const css = readFileSync('src/styles.css', 'utf8');
  const cut = css.search(/\/\*\s*-+\s*\*\/\s*\/\*\s*Base/);
  tokens = (cut > 0 ? css.slice(0, cut) : '').replace(/<\/style/gi, '');
}

const html = `<!DOCTYPE html>
<html lang="en-GB" data-era="ledger" data-theme="ledger">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Rebound — soundscape demo</title>
<meta name="description" content="Generated sound for Rebound, an incremental game about Jevons paradox: synthesised in the browser, exportable as WAV loops, stems and one-shots for a DAW.">
<style>
${tokens}
*,*::before,*::after{box-sizing:border-box}
html,body{margin:0}
html{background:var(--bg-solid,#efe6d0)}
body{background:var(--bg-img,none),var(--bg-solid,#efe6d0);color:var(--ink,#2a1f15);font-family:var(--body,Georgia,serif);font-size:15px;overflow-x:clip}
#app{max-width:1100px;margin:0 auto;padding:14px 16px 60px}
.top{display:grid;grid-template-columns:minmax(0,2fr) minmax(240px,1fr);gap:14px;align-items:start}
@media (max-width:720px){.top{grid-template-columns:1fr}}
.side{border:1px solid var(--rule,rgba(0,0,0,.2));padding:10px;background:var(--surface,transparent);font-size:13px}
.meter{height:10px;background:rgba(0,0,0,.15);margin:8px 0}.meter i{display:block;height:100%;width:0;background:var(--accent,#7a3);transition:width .1s}
.stats{font:12px/1.4 ui-monospace,monospace;white-space:pre-wrap;margin:0}
.panel{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:12px;font-size:13px;margin-top:14px}
.grp{border:1px solid var(--rule,rgba(0,0,0,.2));padding:8px 10px;background:var(--surface,transparent)}
.grp h3{margin:0 0 6px;font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:var(--muted,#6f5f4a)}
.row{display:grid;grid-template-columns:110px 1fr 38px;align-items:center;gap:6px;margin:3px 0}
.row input{width:100%}
.chk{display:inline-flex;gap:5px;align-items:center;margin:3px 10px 3px 0}
.app{border-top:1px solid var(--rule,rgba(0,0,0,.15));padding:5px 0}
.app strong{display:inline-block;min-width:150px}
.btns{display:flex;flex-wrap:wrap;gap:5px;margin:6px 0}
button,select{font:inherit;color:inherit;background:var(--surface,#fff);border:1px solid var(--rule-2,#888);padding:5px 8px;border-radius:var(--btn-radius,2px)}
button.play{background:var(--ink,#222);color:var(--bg-solid,#fff)}
button:disabled{opacity:.5}
.what{margin:0 0 12px;font-size:15px;line-height:1.45;max-width:72ch}
.what a{color:inherit}
.export-host{margin-top:14px}
.export{font-size:13px}
.export .xintro{margin:0 0 8px;max-width:80ch;line-height:1.4}
.xgrid{display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:2px 16px}
.xrow{display:grid;grid-template-columns:80px minmax(0,1fr);gap:6px;align-items:center;padding:3px 0}
.xl{color:var(--muted,#6f5f4a);font-size:12px;letter-spacing:.04em}
.xc{display:flex;flex-wrap:wrap;gap:6px;align-items:center;min-width:0}
.xc select{max-width:100%}
.xnote{color:var(--muted,#6f5f4a);font-size:12px}
.xbtns{margin-top:10px}
.xquick{display:grid;grid-template-columns:80px minmax(0,1fr);gap:6px;align-items:center;margin-top:6px}
.xquick select{max-width:100%}
.xrun{display:flex;gap:8px;align-items:center;margin-top:8px}
.xprog{flex:1;min-width:0;height:12px}
.xstatus{font:12px/1.4 ui-monospace,monospace;margin-top:4px;overflow-wrap:anywhere}
select{max-width:100%}
@media (max-width:520px){#app{padding:12px 16px 48px}.row{grid-template-columns:96px minmax(0,1fr) 34px}.app strong{min-width:0;display:block}.xgrid{grid-template-columns:1fr}.xrow,.xquick{grid-template-columns:1fr;gap:2px}.panel{grid-template-columns:1fr}}
</style>
</head>
<body>
<div id="app"></div>
<script>${js}</script>
</body>
</html>
`;
mkdirSync('dist', { recursive: true });
writeFileSync('dist/audio-demo.html', html);
console.log(`dist/audio-demo.html ${(html.length / 1024).toFixed(1)} KB`);
