// Export work: hashes of the standard offline renders (every Industry × every preset, plus interface moments), to prove
// that additive engine options leave the live mix byte-identical. node tools/audio-run.cjs "$(cat tools/audio-baseline.js)" out.json
const S = ['steam', 'light', 'motion', 'compute', 'code'];
const P = ['empty', 'early', 'mid', 'late', 'crisis', 'collapse', 'steady'];
const out = {};
for (const s of S) {
  for (const p of P) { const r = await bench.hash(s, p, 14); out[`${s}-${p}`] = `${r.hash} ${r.rmsDb}`; }
  const e = await bench.hash(s, '', 12, [[0.2, 'reveal'], [2, 'sell'], [2.5, 'buy'], [3, 'letter'], [5, 'seam'], [7, 'ending']]);
  out[`${s}-events`] = `${e.hash} ${e.rmsDb}`;
}
return out;
