// Expression for tools/audio-run.cjs: every M3 sound measured (node tools/audio-run.cjs "$(cat tools/audio-m3.js)" m3.json).
// Spectrograms go to shots/audio/m3-*.png.
const S = ['steam', 'light', 'motion', 'compute', 'code'];
const o = { events: {}, ref: {}, letters: {}, seams: {}, light: {}, motion: {}, compute: {}, bites: {}, watch: {}, ending: {}, off: {} };
const NEW = [['seam', { depth: 0 }], ['seam', { depth: 1 }], ['letter', {}], ['letter', { cast: 'whitlow' }], ['letterOpened', {}], ['answer', {}], ['answer', { by: 'default' }], ['letterExpired', {}], ['bite', {}], ['bite', { lever: 'duty' }], ['survey', {}], ['proprietor', {}], ['ending', {}], ['ledgerContinues', {}], ['arrived', {}], ['history', {}], ['dispatchArrived', { cast: 'pryce' }], ['nonsense', {}]];
for (const s of S) {
  o.events[s] = {}; o.ref[s] = {};
  for (const [k, d] of NEW) { const r = await m3.event(s, k, d); o.events[s][k + (d.depth != null ? d.depth : '') + (d.cast ? ':' + d.cast : '') + (d.by ? ':' + d.by : '') + (d.lever ? ':' + d.lever : '')] = { peak: r.a.peakDb, rms: r.a.rmsDb, cent: r.a.centroidHz, hi: r.a.bands.high6k, clicks: r.a.clicks, silent: r.a.silentShare }; }
  for (const k of ['buy', 'lever', 'headline', 'decade', 'found', 'reveal', 'steady']) { const r = await m3.event(s, k); o.ref[s][k] = { peak: r.a.peakDb, rms: r.a.rmsDb }; }
  // All the new moments in a strip, for the spectrogram
  const strip = await m3.overBed(s, 'mid', [[1, 'letter', { cast: 'correspondent' }], [4, 'letterOpened'], [5.5, 'answer'], [8, 'letterExpired'], [10, 'bite', { lever: 'duty' }], [13, 'arrived'], [15.5, 'history'], [18.5, 'survey'], [23, 'seam', { depth: 0.75 }], [29, 'proprietor']], 36, `${s} · the M3 moments over the mid bed`);
  strip.pngName = `m3-moments-${s}`; o.events[s].strip = strip;
  // Letters over a busy bed: one alone; then three 20 s apart (the second and third softer, no motif)
  const lt = await m3.overBed(s, 'late', [[4, 'letter', { cast: 'fenwick' }], [24, 'letter', { cast: 'fenwick' }], [44, 'letter', { cast: 'pryce' }]], 52, `${s} · three letters, 20 s apart, over the late bed`);
  lt.pngName = `m3-letters-${s}`; o.letters[s] = lt;
  const bed = await bench.preset(s, 'late', 14, false); o.letters[s].bedRms = bed.a.rmsDb; o.letters[s].bedPeak = bed.a.peakDb;
}
// Cast motifs (ledger and neon) one after another
o.motifs = {};
for (const s of ['steam', 'code']) {
  const evs = []; let t = 0.5; for (const c of ['correspondent', 'whitlow', 'missWhitlow', 'fenwick', 'ashworth', 'pryce', 'minister']) { evs.push([t, 'letter', { cast: c }]); t += 3.2; }
  const r = await m3.overBed(s, 'empty', evs, t + 1, `${s} · the cast's letters (correspondent, whitlow, missWhitlow, fenwick, ashworth, pryce, minister), 3.2 s apart`); r.pngName = `m3-cast-${s}`; o.motifs[s] = r;
}
// Steam seams: depth 0 / 0.5 / 1 (held late valley)
for (const [n, sunk] of [['none', null], ['d0', 0], ['d2', 2], ['d4', 4]]) {
  const r = await m3.state('steam', 'late', sunk == null ? {} : { seams: { sunk, total: 4, next: true } }, `steam · late, seams ${sunk == null ? 'absent' : sunk + '/4'}`, 40); r.pngName = `m3-seams-${n}`; o.seams[n] = r;
}
// Light: hours
for (const h of [3, 8, 13, 18]) o.light['h' + h] = (await m3.lightHour(h)).a;
o.light.soldNight = (await m3.lightHour(3, m3.LIGHT_DAY.map((x, i) => (i < 6 ? 0.85 : x)))).a;
o.light.none = (await bench.preset('light', 'late', 8, false)).a;
const day = await m3.lightDay(); day.pngName = 'm3-light-day'; o.light.day = day;
// Motion travel
for (const [n, t] of [['none', null], ['free', { speed: 1, sprawl: 0.3, sprawlShare: 0.3 }], ['jam', { speed: 0.2, sprawl: 0.5, sprawlShare: 0.4 }], ['thinSprawl', { speed: 0.95, sprawl: 0.9, sprawlShare: 0.7 }]]) {
  const p = n === 'thinSprawl' ? 'early' : 'mid';
  const r = await m3.state('motion', p, t ? { travel: t } : {}, `motion · ${p}, travel ${n}`, 30); r.pngName = `m3-travel-${n}`; o.motion[n] = r;
}
// Compute free
for (const [n, f] of [['none', null], ['paid', []], ['half', ['compute.globe', 'compute.play']], ['all', ['compute.sheet', 'compute.globe', 'compute.cloud', 'compute.play', 'compute.brain']]]) {
  const r = await m3.state('compute', 'late', f ? { free: { apps: f } } : {}, `compute · late, free ${n}`, 40); r.pngName = `m3-free-${n}`; o.compute[n] = r;
}
// Lever bite (world signature souring), 60 s
for (const [n, b] of [['0', 0], ['07', 0.7], ['1', 1]]) {
  const r = await m3.state('motion', 'mid', { levers: [{ id: 'm.duty', kind: 'duty', level: 1, name: 'duty' }, { id: 'm.cap', kind: 'cap', level: 1, name: 'cap' }] }, `motion · mid, duty and cap biting ${b}`, 60, n !== '0' || true, { duty: b, cap: b }); r.pngName = `m3-bite-${n}`; o.bites[n] = r.a;
}
// Watch
for (const w of [0, 0.5, 1]) { const r = await m3.state('steam', 'mid', { watch: w }, `steam · mid, watch ${w}`, 30, w === 1); if (w === 1) r.pngName = 'm3-watch-1'; o.watch['w' + w] = r.a; }
// Ending over Steam steady and Code crisis
for (const [s, p] of [['steam', 'steady'], ['code', 'crisis'], ['motion', 'late']]) { const r = await m3.ending(s, p); r.pngName = `m3-ending-${s}`; o.ending[s] = r; }
const ec = await m3.ending('light', 'late', 40, 25); ec.pngName = 'm3-ending-continues'; o.ending.continues = ec;
for (const s of ['steam', 'code']) o.off[s] = await m3.offMidway(s);
// What each layer adds on its own (difference renders: identical seeds, so the difference is the new sound alone)
const lv = [{ id: 'm.duty', kind: 'duty', level: 1, name: 'duty' }];
const D = async (n, s, p, extra, dur, bites) => { const r = await m3.diff(s, p, extra, dur, bites); o.added[n] = { rms: r.added.rmsDb, peak: r.added.peakDb, cent: r.added.centroidHz, hi: r.added.bands.high6k, sub: r.added.bands.sub200, bedRms: r.base.rmsDb, bedPeak: r.base.peakDb }; };
o.added = {};
await D('watch1', 'steam', 'mid', { watch: 1 }, 30);
await D('biteDuty1', 'motion', 'mid', { levers: lv }, 60, { duty: 1 });
await D('seams4', 'steam', 'late', { seams: { sunk: 4, total: 4, next: false } }, 40);
await D('loadQuiet', 'light', 'late', { load: { hours: m3.LIGHT_DAY, factor: 0.55 } }, 60);
await D('jam', 'motion', 'mid', { travel: { speed: 0.2, sprawl: 0.5, sprawlShare: 0.4 } }, 30);
await D('freeAll', 'compute', 'late', { free: { apps: ['compute.sheet', 'compute.globe', 'compute.cloud', 'compute.play', 'compute.brain'] } }, 40);
await D('freePaid', 'compute', 'late', { free: { apps: [] } }, 40);
// The credits bed alone (no world), 70 s
const ea = await (async () => { const r = await m3.event('code', 'ending', {}, 72); return r.a; })(); o.ending.aloneWindows = ea.windowsDb; o.ending.alone = { peak: ea.peakDb, rms: ea.rmsDb, hi: ea.bands.high6k, clicks: ea.clicks, cent: ea.centroidHz };
return o;
