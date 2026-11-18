// Builds the standalone scene demo: bun run tools/scene-demo.ts → dist/scene-demo.html (one self-contained file).
// It does not import the game's model or content (they may be mid-rewrite); the demo feeds hand-made SceneViews.
// The page theme tokens are lifted from src/styles.css when present so the scene sits in the real look.
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';

const result = await Bun.build({ entrypoints: ['src/ui/scene/demo/main.ts'], minify: true, target: 'browser', format: 'iife' });
if (!result.success) {
  for (const log of result.logs) console.error(log);
  process.exit(1);
}
const js = (await result.outputs[0].text()).replace(/<\/script/gi, '<\\/script');

// Theme tokens: everything in styles.css before the "Base" section (the :root and html[data-…] blocks).
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
<title>Rebound — scene demo</title>
<style>
${tokens}
*,*::before,*::after{box-sizing:border-box}
html,body{height:100%;margin:0}
html{background:var(--bg-solid,#efe6d0)}
body{background:var(--bg-img,none),var(--bg-solid,#efe6d0);color:var(--ink,#2a1f15);font-family:var(--body,Georgia,serif);font-size:15px;overflow-x:clip}
#app{max-width:760px;margin:0 auto;padding:14px 16px 60px}
h1{font-family:var(--display,Georgia);font-size:20px;margin:0 0 8px}
.log{font-size:12px;color:var(--muted,#6f5f4a);min-height:1.2em;margin:4px 0 10px}
.panel{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:12px;font-size:13px}
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
body.strip #app{max-width:none;display:grid;grid-template-columns:repeat(auto-fill,minmax(var(--fig,358px),1fr));gap:10px 14px}
body.strip figure{margin:0}
body.strip figcaption{font:600 11px/1.6 var(--labelf,system-ui);letter-spacing:.1em;text-transform:uppercase;color:var(--muted,#6f5f4a)}
</style>
</head>
<body>
<div id="app"></div>
<script>${js}</script>
</body>
</html>
`;
mkdirSync('dist', { recursive: true });
writeFileSync('dist/scene-demo.html', html);
console.log(`dist/scene-demo.html ${(html.length / 1024).toFixed(1)} KB`);
