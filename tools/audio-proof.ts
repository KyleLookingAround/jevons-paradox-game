// Proof that the export's engine additions leave the game's sound unchanged.
//   bun run tools/audio-proof.ts          builds dist/audio-proof.html with the engine as committed (git HEAD) and the
//                                         working copy side by side
//   BENCH_HTML=dist/audio-proof.html node tools/audio-run.cjs "return await proof.all()" proof.json
// Chromium's offline renders of the game's graph do not repeat exactly by themselves (a junction of three or more
// inputs sums in an order that follows node addresses; 'ended' events arrive whenever they arrive; see engine.ts,
// inlet()). So both engines run under the same neutral patches, applied to Web Audio itself before either is loaded:
// every connection into a node goes through its own two-input rung (the same sum in a fixed order), finished voices
// are never disconnected (a finished source sends exact zeros), and the master limiter is a unity gain (the one
// node whose output did not repeat in the graph). Under those patches each engine repeats exactly, so the two can be
// compared byte for byte. The export taps are not used: this is the game's path.
import { execSync } from 'node:child_process';
import { mkdirSync, writeFileSync, copyFileSync, rmSync } from 'node:fs';

const OLD = 'dist/audio-proof/old/ui';
rmSync('dist/audio-proof', { recursive: true, force: true });
mkdirSync(`${OLD}/audio`, { recursive: true });
mkdirSync(`${OLD}/scene`, { recursive: true });
const files = execSync('git ls-tree --name-only HEAD src/ui/audio/').toString().trim().split('\n').filter((f) => /\.ts$/.test(f) && !f.endsWith('.test.ts'));
for (const f of files) writeFileSync(`${OLD}/audio/${f.split('/').pop()}`, execSync(`git show HEAD:${f}`));
copyFileSync('src/ui/scene/types.ts', `${OLD}/scene/types.ts`);

const page = `
import { createSoundscape as oldEngine } from './old/ui/audio/engine';
import { createSoundscape as newEngine } from '../../src/ui/audio/engine';
import { demoView, runView } from '../../src/ui/audio/views';

// ---- neutral patches (both engines) ----
const rungs = new WeakMap();
const conn = AudioNode.prototype.connect;
AudioNode.prototype.connect = function (dest, ...rest) {
  if (dest instanceof AudioNode && !(dest instanceof AudioDestinationNode)) {
    const list = rungs.get(dest) ?? [];
    rungs.set(dest, list);
    const r = new GainNode(this.context);
    conn.call(r, list.length ? list[list.length - 1] : dest);
    list.push(r);
    conn.call(this, r, ...rest);
    return dest;
  }
  return conn.call(this, dest, ...rest);
};
Object.defineProperty(AudioScheduledSourceNode.prototype, 'onended', { set() {}, get() { return null; }, configurable: true });
BaseAudioContext.prototype.createDynamicsCompressor = function () {
  const g = new GainNode(this);
  for (const k of ['threshold', 'knee', 'ratio', 'attack', 'release']) Object.defineProperty(g, k, { value: { value: 0 } });
  return g;
};

const SR = 48000;
function hashOf(chs) {
  let h = 0x811c9dc5;
  for (const ch of chs) { const u = new Uint8Array(ch.buffer, ch.byteOffset, ch.byteLength); for (let i = 0; i < u.length; i++) { h ^= u[i]; h = Math.imul(h, 0x01000193); } }
  return (h >>> 0).toString(16).padStart(8, '0');
}
async function renderWith(make, c) {
  const ctx = new OfflineAudioContext(2, Math.round(c.dur * SR), SR);
  const ss = make({ context: ctx, calm: false, clock: () => ctx.currentTime });
  const acts = new Map();
  const put = (t, f) => { const q = Math.round((t * SR) / 128); (acts.get(q) ?? acts.set(q, []).get(q)).push(f); };
  for (let k = 0; k * 0.1 < c.dur - 0.05; k++) { const t = k * 0.1; put(t, () => { const v = c.view(t); if (v) ss.update(v); }); }
  for (const [t, kind, det] of c.events ?? []) put(t, () => ss.event(kind, { sector: c.sector, ...(det ?? {}) }));
  for (let k = 0; k * 0.1 < c.dur - 0.05; k++) put(k * 0.1, () => ss.tick());
  for (const [q, fs] of acts) { if (q === 0) continue; void ctx.suspend((q * 128) / SR).then(() => { for (const f of fs) f(); void ctx.resume(); }); }
  for (const f of acts.get(0) ?? []) f();
  const b = await ctx.startRendering();
  ss.destroy();
  return [b.getChannelData(0), b.getChannelData(1)];
}
const CASES = [];
for (const s of ['steam', 'light', 'motion', 'compute', 'code']) {
  for (const p of ['empty', 'early', 'mid', 'late', 'crisis', 'collapse', 'steady']) CASES.push({ name: s + '-' + p, sector: s, dur: 14, view: () => demoView(s, p) });
  CASES.push({ name: s + '-run', sector: s, dur: 30, view: (t) => runView(s, Math.min(1, t / 30), 'collapse') });
  CASES.push({ name: s + '-events', sector: s, dur: 14, view: () => null, events: [[0.2, 'reveal'], [2, 'sell'], [2.1, 'sell'], [2.2, 'sell'], [2.5, 'buy'], [3, 'letter', { cast: 'pryce' }], [5, 'seam', { depth: 0.5 }], [6, 'bite', { lever: 'duty' }], [7, 'ending'], [12, 'ledgerContinues']] });
}
window.proof = {
  cases: CASES.map((c) => c.name),
  async one(name) {
    const c = CASES.find((x) => x.name === name);
    // Warm the synthesis bank first, so neither render waits on synthesis (the engine skips a hit, offline, when a
    // tick has spent its synthesis budget: a wall-clock effect, identical for both engines once everything is cached).
    await renderWith(newEngine, c);
    const o1 = await renderWith(oldEngine, c), n1 = await renderWith(newEngine, c), o2 = await renderWith(oldEngine, c);
    let maxd = 0;
    for (let ch = 0; ch < 2; ch++) for (let i = 0; i < o1[ch].length; i++) maxd = Math.max(maxd, Math.abs(o1[ch][i] - n1[ch][i]));
    return { name, old: hashOf(o1), old2: hashOf(o2), new: hashOf(n1), maxAbsDiff: maxd };
  },
  async all() { const out = []; for (const n of CASES.map((c) => c.name)) out.push(await this.one(n)); return { identical: out.filter((x) => x.old === x.new && x.old === x.old2).length, of: out.length, cases: out }; },
};
document.title = 'audio bench ready';
`;
writeFileSync('dist/audio-proof/page.ts', page);
const r = await Bun.build({ entrypoints: ['dist/audio-proof/page.ts'], minify: false, target: 'browser', format: 'iife' });
if (!r.success) { for (const l of r.logs) console.error(l); process.exit(1); }
const js = (await r.outputs[0].text()).replace(/<\/script/gi, '<\\/script');
writeFileSync('dist/audio-proof.html', `<!DOCTYPE html><html><head><meta charset="utf-8"><title>audio proof</title></head><body><script>${js}</script></body></html>`);
console.log(`dist/audio-proof.html (${files.length} files from HEAD)`);
