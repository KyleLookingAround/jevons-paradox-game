// Expression for tools/audio-run.cjs: every M4 measurement (node tools/audio-run.cjs "$(cat tools/audio-m4.js)" m4.json).
// Spectrograms go to shots/audio/m4-*.png. Per-Industry presets, solos and runs: tools/audio-industry.js (SECTOR=iron, fishing).
const o = { life: {}, events: {}, ref: {}, switch: {}, fish: {}, added: {} };
// The sea life alone at a held TRUE stock (catch per trip would read (truth)^0.3: 0.9→0.97, 0.5→0.81, 0.3→0.70, 0.19→0.61).
for (const t of [1, 0.7, 0.5, 0.35, 0.25, 0.19, 0.12]) { const r = await m4.lifeOnly(t); o.life['t' + t] = { rms: r.a.rmsDb, peak: r.a.peakDb, cent: r.a.centroidHz }; }
for (const t of [0.6]) { const r = await m4.lifeOnly(t, true); o.life['scarred' + t] = { rms: r.a.rmsDb, peak: r.a.peakDb }; }
const dec = await m4.decline(90); dec.pngName = 'm4-fishing-decline'; o.fish.decline = dec;
const rv = await m4.reveal(6, 16, true); rv.pngName = 'm4-survey-reveal-life'; o.fish.revealLife = rv;
const rv2 = await m4.reveal(6, 16, false); rv2.pngName = 'm4-survey-reveal'; o.fish.reveal = rv2;
const hl = await m4.heal(5, 30); hl.pngName = 'm4-scar-heals'; o.fish.heal = hl;
for (const [n, st, p, extra] of [['healthy', { truth: 0.9, foreign: 0.1 }, 'late', {}], ['thinning', { truth: 0.3, foreign: 0.4 }, 'late', {}], ['moratorium', { truth: 0.3, moratorium: true, scar: true, crossed: true, foreign: 0.4 }, 'late', {}], ['failedStopped', { truth: 0.1, crossed: true, scar: true }, 'late', { pace: 0.02 }]]) {
  const r = await m4.fish(p, st, `fishing · ${n}`, 24, extra); r.pngName = `m4-fishing-${n}`; o.fish[n] = r;
}
// Crossfades into and out of Iron and Fishing (dip ≤ 4 dB below the quieter side)
for (const [a, b] of [['steam', 'iron'], ['iron', 'steam'], ['light', 'iron'], ['iron', 'fishing'], ['fishing', 'iron'], ['fishing', 'light'], ['fishing', 'motion'], ['motion', 'fishing']]) {
  const r = await m4.switchDip(a, b); r.pngName = `m4-switch-${a}-${b}`; o.switch[`${a}>${b}`] = { before: r.before, after: r.after, dipDb: r.dipDb, clicks: r.a.clicks, png: r.png, pngName: r.pngName };
}
// Interface sounds (alone, 9 s) against references, in each Coal Age palette idiom (ledger) and in Code (neon)
for (const s of ['steam', 'iron', 'fishing', 'code']) {
  o.events[s] = {}; o.ref[s] = {};
  for (const [k, d] of [['wager', { outcome: 'won' }], ['wager', { outcome: 'lost' }], ['dispatchAnswered', { label: 'lost' }], ['actEnding', {}], ['arrears', {}], ['ending', {}], ['surveyed', { label: 'reveal' }], ['surveyed', {}], ['thresholdCrossed', {}]]) {
    const r = await m4.event(s, k, d, k === 'actEnding' || k === 'ending' ? 14 : 9);
    o.events[s][k + (d.outcome ? ':' + d.outcome : '') + (d.label ? ':' + d.label : '')] = { peak: r.a.peakDb, rms: r.a.rmsDb, cent: r.a.centroidHz, hi: r.a.bands.high6k, clicks: r.a.clicks, silent: r.a.silentShare };
  }
  for (const k of ['buy', 'answer', 'survey', 'headline']) { const r = await m3.event(s, k); o.ref[s][k] = { peak: r.a.peakDb, rms: r.a.rmsDb }; }
}
// The Act's credits bed alone for 120 s (slower bells, held longer than the first ending's 75 s)
const ac = await m4.event('iron', 'actEnding', {}, 125); o.events.actCreditsWindows = ac.a.windowsDb;
// Heritage: what Iron's hammer adds under Steam fed by Iron; what the buoy adds to Light
const D = async (n, s, p, extra, dur) => { const r = await m4.diff(s, p, extra, dur); o.added[n] = { rms: r.added.rmsDb, peak: r.added.peakDb, cent: r.added.centroidHz, hi: r.added.bands.high6k, bedRms: r.base.rmsDb, bedPeak: r.base.peakDb }; };
await D('ironUnderSteam', 'steam', 'mid', { fedBy: [{ from: 'iron', app: 'iron.rails', share: 0.3 }] }, 30);
await D('ironUnderLight', 'light', 'mid', { fedBy: [{ from: 'iron', app: 'iron.girders', share: 0.2 }] }, 30);
await D('ironFishUnderMotion', 'motion', 'mid', { heritage: { steam: 0.8, light: 0.8, iron: 0.8, fishing: 0.8 } }, 30);
// Iron: The Orange Night
const cr = await bench.crisisMoment('iron'); cr.pngName = 'm4-iron-orange-night'; o.ironCrisis = cr;
const crf = await bench.crisisMoment('fishing'); crf.pngName = 'm4-fishing-poor-season'; o.fishCrisis = crf;
o.perf = { iron: await bench.perf('iron'), fishing: await bench.perf('fishing'), steam: await bench.perf('steam') };
return o;
