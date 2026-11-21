// Expression for tools/audio-run.cjs: every M5 measurement (node tools/audio-run.cjs "$(cat tools/audio-m5.js)" m5.json).
// Spectrograms go to shots/audio/m5-*.png. Plenty's presets, solos and runs: tools/audio-industry.js (SECTOR=plenty).
const o = { room: {}, office: {}, switch: {}, pump: {}, events: {}, ref: {}, seq: {} };
const A = (r) => ({ rms: r.a.rmsDb, peak: r.a.peakDb, cent: r.a.centroidHz, hi: r.a.bands.high6k, clicks: r.a.clicks, clipped: r.a.clipped });
for (const m of ['office', 'opposition']) { const r = await m5.roomOnly(m, 24); r.pngName = `m5-room-${m}`; o.room[m] = { ...A(r), clockGaps: r.clockGaps, cars: r.cars, png: r.png, pngName: r.pngName }; }
// The window: each Industry at 'mid' out of office, in office, in Opposition (the room included)
for (const s of ['steam', 'iron', 'motion', 'plenty', 'compute', 'code']) {
  o.office[s] = {};
  for (const m of ['', 'office', 'opposition']) { const r = await m5.office(s, 'mid', m, 16); if (s === 'motion' || s === 'plenty') { r.pngName = `m5-${s}-mid-${m || 'out'}`; } o.office[s][m || 'out'] = { ...A(r), ...(r.pngName ? { png: r.png, pngName: r.pngName } : {}) }; }
}
// Tab switches in office (the room stays) and out of office (Plenty's crossfades with its neighbours)
for (const [a, b] of [['motion', 'plenty'], ['plenty', 'motion'], ['plenty', 'compute'], ['iron', 'plenty']]) { const r = await m5.switchDip(a, b); r.pngName = `m5-office-switch-${a}-${b}`; o.switch[`office:${a}>${b}`] = { before: r.before, after: r.after, dipDb: r.dipDb, clicks: r.a.clicks, clockGapsAcross: r.clockGapsAcross, png: r.png, pngName: r.pngName }; }
for (const [a, b] of [['motion', 'plenty'], ['plenty', 'motion'], ['plenty', 'compute'], ['compute', 'plenty'], ['fishing', 'plenty']]) { const r = await m4.switchDip(a, b); o.switch[`${a}>${b}`] = { before: r.before, after: r.after, dipDb: r.dipDb, clicks: r.a.clicks }; }
for (const s of ['plenty', 'motion']) { const r = await m4.switchDip(s, s); o.switch[`null:${s}>${s}`] = { dipDb: r.dipDb }; }
// The pump against the water table
for (const res of [1, 0.7, 0.5, 0.3, 0.15]) { const r = await m5.pump(res, 36); o.pump['r' + res] = { strokes: r.strokes, meanGap: r.meanGap, rms: r.a.rmsDb }; }
// Interface moments alone, in Motion's idiom (chrome, C lydian) and Plenty's (chrome, G ionian), against references
for (const s of ['motion', 'plenty', 'steam']) {
  o.events[s] = {}; o.ref[s] = {};
  for (const [k, d, dur] of [['officeTaken', {}, 7], ['electionCalled', {}, 6], ['electionWon', {}, 7], ['electionLost', {}, 6], ['inspected', {}, 5], ['concealmentFound', {}, 3], ['rivalAnswered', { label: 'lobby' }, 4], ['rivalAnswered', { label: 'comply' }, 3], ['litigated', {}, 3], ['loopholeUsed', {}, 4], ['loopholeClosed', {}, 4], ['treaty', {}, 9]]) {
    const r = await m4.event(s, k, d, dur);
    o.events[s][k + (d.label ? ':' + d.label : '')] = { peak: r.a.peakDb, rms: r.a.rmsDb, cent: r.a.centroidHz, hi: r.a.bands.high6k, clicks: r.a.clicks, silent: r.a.silentShare };
  }
  for (const k of ['buy', 'answer', 'lever', 'reveal']) { const r = await m3.event(s, k); o.ref[s][k] = { peak: r.a.peakDb, rms: r.a.rmsDb }; }
}
// Together: the finding's stamp after the Inspector's; the court event does not strike the gavel twice
const f = await m5.events('motion', [[0.2, 'inspected', { n: 18 }], [0.2, 'concealmentFound', { n: 18 }]], 5); f.pngName = 'm5-inspected-found'; o.seq.inspectedFound = { quarterDb: f.quarterDb, peak: f.a.peakDb, png: f.png, pngName: f.pngName };
const g1 = await m5.events('motion', [[0.2, 'litigated']], 3), g2 = await m5.events('motion', [[0.2, 'rivalAnswered', { label: 'litigate' }], [0.2, 'litigated']], 3);
o.seq.gavel = { once: { peak: g1.a.peakDb, rms: g1.a.rmsDb }, answerAndCourt: { peak: g2.a.peakDb, rms: g2.a.rmsDb } };
const c2 = await m5.events('motion', [[0.2, 'officeTaken'], [3, 'officeTaken']], 8); o.seq.officeTwice = { rms: c2.a.rmsDb, quarterDb: c2.quarterDb };
// Plenty's crisis moment, and CPU
const cr = await bench.crisisMoment('plenty'); cr.pngName = 'm5-plenty-crisis'; o.plentyCrisis = cr;
o.perf = { plenty: await bench.perf('plenty'), motion: await bench.perf('motion') };
return o;
