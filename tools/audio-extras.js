// Expression for tools/audio-run.cjs: transitions, interface sounds, moments, heritage, levers, calm, CPU.
const S = ['steam', 'light', 'motion', 'compute', 'code'];
const o = { switch: {}, sells: {}, ui: {}, crisis: {}, calm: {}, perf: {}, levers: {} };
const pairs = [['steam', 'light'], ['light', 'motion'], ['motion', 'compute'], ['compute', 'code'], ['code', 'iron']];
for (const [a, b] of pairs) { const r = await bench.switchTabs(a, b); r.pngName = `switch-${a}-${b}`; o.switch[`${a}>${b}`] = r; }
for (const s of S) {
  const w = await bench.sells(s, 8, true); w.pngName = `sell8-${s}-world`;
  const a = await bench.sells(s, 8, false); a.pngName = `sell8-${s}-alone`;
  const one = await bench.sells(s, 1, false);
  o.sells[s] = { world: w, alone: a, onePerSec: one.a };
  o.ui[s] = {};
  for (const k of ['sell','buy','cannotAfford','found','lever','fork','headline','reveal','backfire','crisis','decade','steady','reckoning','industryOpened','ageBegun']) {
    const r = await bench.uiEvent(s, k); o.ui[s][k] = { peak: r.a.peakDb, rms: r.a.rmsDb, cent: r.a.centroidHz, hi: r.a.bands.high6k, clicks: r.a.clicks };
  }
  const st = await bench.uiStrip(s, ['sell','buy','cannotAfford','found','lever','fork','headline','decade','backfire','crisis','industryOpened','reveal','steady','reckoning','ageBegun']); st.pngName = `ui-${s}`; o.ui[s].strip = st;
  const c = await bench.crisisMoment(s); c.pngName = `crisis-${s}`; o.crisis[s] = c;
  const n = await bench.preset(s, 'late', 14, false); const m = await bench.preset(s, 'late', 14, true);
  o.calm[s] = { normalRms: n.a.rmsDb, calmRms: m.a.rmsDb, normalCrest: n.a.crestDb, calmCrest: m.a.crestDb };
  o.perf[s] = await bench.perf(s);
  const lv = await bench.levers(s); o.levers[s] = { rms: lv.a.rmsDb, clicks: lv.a.clicks };
}
o.heritage = await bench.heritage();
return o;
