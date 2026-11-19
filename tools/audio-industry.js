// Expression for run.cjs: every preset of one Industry (analysis + spectrogram), every layer solo, two whole runs.
// SECTOR is substituted by the caller.
const S = 'SECTOR';
const out = { presets: {}, solos: {}, runs: {} };
for (const p of ['empty', 'early', 'mid', 'late', 'crisis', 'collapse', 'steady']) {
  const r = await bench.preset(S, p, 14, false, true);
  r.pngName = `${S}-${p}`;
  out.presets[p] = r;
}
for (const id of bench.layers(S)) { const r = await bench.solo(S, id); out.solos[id] = { rms: r.a.rmsDb, peak: r.a.peakDb, centroid: r.a.centroidHz, hi: r.a.bands.high6k, sub: r.a.bands.sub200 }; }
for (const e of ['collapse', 'steady']) { const r = await bench.run(S, e, 60); r.pngName = `${S}-run-${e}`; out.runs[e] = r; }
return out;
