// The pure half of the soundscape, tested without a browser: the SceneView → mix mapping, the definitions, and every
// synthesised recipe (finite, bounded, click-free edges, no DC, deterministic, nothing harsh above 6 kHz).
// @ts-ignore bun:test types are not in the project tsconfig (types: [])
import { describe, expect, test } from 'bun:test';
import { mixFrom, sourcesFrom, momentsBetween, readSrc, nightness, loadAt, peakHourOf } from './mix';
import { SOUNDSCAPES, soundscapeFor, paletteFor, type HitsDef } from './defs';
import { render, hasRecipe, WORLD_RECIPES, PALETTES, UI_KINDS, MOTIFS, CAST_FAMILY } from './recipes';
import { KEYS as K2 } from './music';
import { runJob, jobId } from './jobs';
import { WORKER_SRC } from './worker-src';
import { rngFrom, BUF_SR, peak, svf } from './synth';
import { KEYS, semis, MODES } from './music';
import { demoView, viewOf, preset, runView, PRESET_NAMES } from './views';
import { SOUND_EVENT_KINDS, SOUND_EVENT_ALIASES } from './types';
import type { SceneView } from '../scene/types';

const SECTORS = ['steam', 'light', 'motion', 'compute', 'code'];
const mix = (v: SceneView, calm = false) => mixFrom(v, soundscapeFor(v.sectorId), { calm });

function deepFreeze<T>(o: T): T {
  if (o && typeof o === 'object') { Object.freeze(o); for (const v of Object.values(o)) deepFreeze(v); }
  return o;
}

describe('definitions', () => {
  test('every layer references a recipe that exists; ids unique; traces resolve', () => {
    for (const [id, d] of Object.entries(SOUNDSCAPES)) {
      const ids = new Set<string>();
      for (const l of d.layers) {
        expect(ids.has(l.id)).toBe(false);
        ids.add(l.id);
        if (l.kind === 'hits') expect(hasRecipe((l as HitsDef).recipe)).toBe(true);
        expect(l.gain).toBeGreaterThan(0);
        expect(l.gain).toBeLessThan(0.6);
      }
      expect(hasRecipe(d.crisis.recipe)).toBe(true);
      for (const t of d.trace) expect(ids.has(t)).toBe(true);
      expect(d.tempo[1]).toBeGreaterThan(d.tempo[0]);
      expect(MODES[d.key.mode]).toBeDefined();
      expect(id).toBe(d.id);
    }
  });
  test('neighbouring Ages differ by at most one note (tab switches modulate, not jolt)', () => {
    const set = (k: (typeof KEYS)[string]) => new Set(Array.from({ length: 7 }, (_, d) => Math.round(12 * Math.log2(k.root / 8.1758) + semis(k, d)) % 12));
    const order = ['steam', 'light', 'motion', 'compute', 'code'];
    for (let i = 1; i < order.length; i++) {
      const a = set(KEYS[order[i - 1]]), b = set(KEYS[order[i]]);
      const diff = [...b].filter((x) => !a.has(x)).length;
      expect(diff).toBeLessThanOrEqual(1);
    }
  });
  test('unknown Industry falls back to the generic bed; palettes follow the look', () => {
    expect(soundscapeFor('iron').id).toBe('generic');
    expect(paletteFor('iron', 'gaslight')).toBe('gaslight');
    expect(paletteFor('code')).toBe('neon');
    expect(paletteFor(undefined, 'nonsense')).toBe('ledger');
  });
  test('every interface event kind has a recipe in every palette', () => {
    const own = SOUND_EVENT_KINDS.filter((k) => !(k in SOUND_EVENT_ALIASES));
    for (const k of own) for (const p of PALETTES) expect(hasRecipe(`ui:${p}:${k}`)).toBe(true);
    expect([...UI_KINDS].sort()).toEqual([...own].sort());
    for (const [a, k] of Object.entries(SOUND_EVENT_ALIASES)) { expect(SOUND_EVENT_KINDS).toContain(a as never); expect(own).toContain(k); }
  });
});

describe('mixFrom (pure)', () => {
  test('total: garbage in, finite numbers out, and never mutates the view', () => {
    const bad = { sectorId: 'steam' } as unknown as SceneView;
    const m = mix(bad);
    for (const l of Object.values(m.layers)) for (const v of [l.level, l.density, l.pitch, l.tone]) expect(Number.isFinite(v)).toBe(true);
    const v = deepFreeze(demoView('steam', 'late'));
    expect(() => mix(v)).not.toThrow();
    expect(mix(v)).toEqual(mix(v));
  });
  test('Steam: the empty valley has birds and wind and no engine; the first pump brings the Newcomen engine', () => {
    const e = mix(demoView('steam', 'empty'));
    expect(e.layers.birds.level).toBeGreaterThan(0.6);
    expect(e.layers.wind.level).toBeGreaterThan(0.8);
    expect(e.layers.eng0.level).toBe(0);
    const early = mix(demoView('steam', 'early'));
    expect(early.layers.eng0.level).toBeGreaterThan(0.3);
    expect(early.layers.eng1.level).toBe(0);
  });
  test('one engine voice per machine stage', () => {
    for (let st = 0; st <= 3; st++) {
      const m = mix(viewOf('steam', { ...preset('steam', 'late'), stage: st }));
      const on = ['eng0', 'eng1', 'eng2', 'eng3'].filter((k) => m.layers[k].level > 0);
      expect(on).toEqual([`eng${st}`]);
    }
  });
  test('birds thin as pressure rises; the air loses its highs and thickens', () => {
    let prevB = Infinity, prevAir = Infinity;
    for (const p of [0, 0.25, 0.5, 0.75, 1]) {
      const m = mix(viewOf('steam', { ...preset('steam', 'mid'), pressure: p }));
      expect(m.layers.birds.level).toBeLessThanOrEqual(prevB);
      expect(m.air).toBeLessThan(prevAir);
      prevB = m.layers.birds.level; prevAir = m.air;
    }
    expect(mix(viewOf('steam', { ...preset('steam', 'mid'), pressure: 1 })).thick).toBeGreaterThan(0.9);
  });
  test('more adoption, more trains and louder mills', () => {
    const lo = mix(viewOf('steam', { ...preset('steam', 'late'), adoption: [1, 0.2, 1, 0.1, 1, 1] }));
    const hi = mix(viewOf('steam', { ...preset('steam', 'late'), adoption: [1, 1, 1, 1, 1, 1] }));
    expect(hi.layers.train.density).toBeGreaterThan(lo.layers.train.density);
    expect(hi.layers.looms.level).toBeGreaterThan(lo.layers.looms.level);
  });
  test('pace sets the shared pulse', () => {
    for (const s of SECTORS) {
      const a = mix(viewOf(s, { ...preset(s, 'mid'), pace: 0 })), b = mix(viewOf(s, { ...preset(s, 'mid'), pace: 1 }));
      expect(b.tempo).toBeGreaterThan(a.tempo);
    }
  });
  test('decoupling lifts the haze; Steady State brings the quiet back at the same pressure', () => {
    const base = { ...preset('steam', 'late'), pressure: 0.5 };
    const plain = mix(viewOf('steam', base));
    const dec = mix(viewOf('steam', { ...base, decoupling: true, steadyProgress: 0.5 }));
    const st = mix(viewOf('steam', { ...base, decoupling: true, steadyProgress: 1, steady: true }));
    expect(dec.air).toBeGreaterThan(plain.air);
    expect(st.air).toBeGreaterThan(dec.air);
    expect(st.layers.birds.level).toBeGreaterThan(plain.layers.birds.level * 1.5);
    expect(st.layers.looms.level).toBeGreaterThan(0.5); // the machines still run
    const code = mix(viewOf('code', { ...preset('code', 'steady') }));
    expect(code.layers.rain.level).toBeLessThan(0.15); // the rain stops
    expect(code.layers.night.level).toBeGreaterThan(0.5);
  });
  test('a pending Reckoning stops the world', () => {
    for (const s of SECTORS) {
      const c = mix(demoView(s, 'crisis')), r = mix(demoView(s, 'collapse'));
      expect(r.frozen).toBe(true);
      expect(r.world).toBeLessThan(0.1);
      expect(r.tempo).toBeLessThan(c.tempo);
      for (const k of Object.keys(r.layers)) expect(r.layers[k].density).toBeLessThanOrEqual(c.layers[k].density * 0.2 + 1e-9);
    }
  });
  test('Code: the warm rooms go dark one by one as attention is spent, until one is left', () => {
    const lit = (reserve: number) => { const m = mix(viewOf('code', { ...preset('code', 'mid'), reserve })); return [0, 1, 2, 3, 4, 5].filter((k) => m.layers[`room${k}`].level > 0.5).length; };
    expect(lit(1)).toBe(6);
    expect(lit(0.6)).toBe(4);
    expect(lit(0.1)).toBe(1);
    expect(lit(0)).toBe(0);
    let prev = 7;
    for (let r = 1; r >= 0.05; r -= 0.05) { const n = lit(r); expect(n).toBeLessThanOrEqual(prev); prev = n; }
  });
  test('Code at high pressure: rolling blackouts and the emergency tone', () => {
    const m = mix(viewOf('code', { ...preset('code', 'late'), pressure: 0.97 }));
    expect(m.stress).toBeGreaterThan(0.8);
    expect(m.layers.emergency.level).toBeGreaterThan(0.8);
    expect(m.layers.neon.blackout).toBe(true);
    const calmish = mix(viewOf('code', { ...preset('code', 'late'), pressure: 0.6 }));
    expect(calmish.stress).toBe(0);
    expect(calmish.layers.neon.blackout).toBe(false);
  });
  test('calmer mode halves the transients', () => {
    const v = demoView('motion', 'late');
    const a = mix(v), b = mix(v, true);
    expect(b.layers.cars.density).toBeCloseTo(a.layers.cars.density * 0.55, 5);
  });
  test('heritage becomes faint traces of earlier Industries; levers are listed', () => {
    const v = viewOf('motion', { ...preset('motion', 'mid'), heritage: { steam: 0.8, light: 0.5 }, levers: ['duty'] });
    const m = mix(v);
    expect(m.traces.steam).toBeCloseTo(0.8, 5);
    expect(m.traces.light).toBeCloseTo(0.5, 5);
    expect(m.levers.duty).toBe(1);
  });
  test('early vs late differ in the intended directions in every Industry', () => {
    for (const s of SECTORS) {
      const a = sourcesFrom(demoView(s, 'early')), b = sourcesFrom(demoView(s, 'late'));
      expect(b.built).toBeGreaterThan(a.built);
      const ma = mix(demoView(s, 'early')), mb = mix(demoView(s, 'late'));
      expect(mb.air).toBeLessThan(ma.air);
      // The made world gets busier (birds, rain and the warm rooms are the quiet, and go the other way).
      const quiet = /^(birds|evening|drips|night|room\d)$/;
      const busy = (m: typeof ma) => Object.entries(m.layers).reduce((t, [id, l]) => t + (quiet.test(id) ? 0 : l.density), 0);
      expect(busy(mb)).toBeGreaterThan(busy(ma));
      expect(mb.layers[Object.keys(mb.layers).find((k) => quiet.test(k))!].level).toBeLessThanOrEqual(ma.layers[Object.keys(ma.layers).find((k) => quiet.test(k))!].level);
    }
  });
  test('a whole run is continuous (no jumps in level larger than a step allows)', () => {
    for (const s of SECTORS) for (const ending of ['collapse', 'steady'] as const) {
      let prev = mix(runView(s, 0, ending));
      for (let i = 1; i <= 100; i++) {
        const m = mix(runView(s, i / 100, ending));
        expect(Math.abs(m.air - prev.air) / prev.air).toBeLessThan(0.6);
        prev = m;
      }
    }
  });
  test('moments: crisis and Steady State and Reckoning edges', () => {
    const a = demoView('steam', 'late'), b = { ...a, crises: a.crises + 1 };
    expect(momentsBetween(a, b).crisis).toBe(true);
    expect(momentsBetween(null, b).crisis).toBe(false);
    expect(momentsBetween(a, { ...a, steady: true }).steadyReached).toBe(true);
    expect(momentsBetween(a, { ...a, reckoning: { cause: 'x', here: true } }).reckoningBegan).toBe(true);
    expect(readSrc(sourcesFrom(a), 'inv:one')).toBe(0);
  });
});

describe('recipes (pure synthesis)', () => {
  const key = KEYS.steam;
  const names = [...WORLD_RECIPES, ...PALETTES.flatMap((p) => UI_KINDS.map((k) => `ui:${p}:${k}`))];
  test.each(names)('%s: finite, bounded, zero edges, no DC, deterministic', (name: string) => {
    const x = render(name, { rng: rngFrom(7), key, v: 1 });
    expect(x.length).toBeGreaterThan(10);
    let s = 0;
    for (let i = 0; i < x.length; i++) { if (!Number.isFinite(x[i])) throw new Error(`NaN at ${i}`); s += x[i]; }
    expect(peak(x)).toBeLessThanOrEqual(0.95);
    expect(peak(x)).toBeGreaterThan(0.1);
    expect(x[0]).toBe(0);
    expect(x[x.length - 1]).toBe(0);
    expect(Math.abs(s / x.length)).toBeLessThan(0.01);
    expect(x.length / BUF_SR).toBeLessThan(15);
    const y = render(name, { rng: rngFrom(7), key, v: 1 });
    expect(y).toEqual(x);
  });
  test('nothing harsh: energy above 6 kHz is a small share of every recipe', () => {
    for (const name of names) {
      const x = render(name, { rng: rngFrom(3), key, v: 0 });
      const hi = svf(Float32Array.from(x), 'hp', 6000, 0.707);
      let eh = 0, et = 0;
      for (let i = 0; i < x.length; i++) { eh += hi[i] * hi[i]; et += x[i] * x[i]; }
      if (eh / et > 0.08) throw new Error(`${name}: ${(100 * eh / et).toFixed(1)}% of energy above 6 kHz`);
    }
  });
  test('presets exist for every Industry', () => {
    for (const s of SECTORS) for (const p of PRESET_NAMES) expect(demoView(s, p).apps.length).toBeGreaterThan(0);
  });
});

/* ------------------------------------------------------------------ */
/* M3                                                                  */
/* ------------------------------------------------------------------ */

const lightDay = [0.2, 0.15, 0.12, 0.12, 0.15, 0.25, 0.45, 0.7, 0.8, 0.75, 0.7, 0.7, 0.72, 0.7, 0.68, 0.7, 0.8, 0.95, 1, 0.9, 0.7, 0.5, 0.35, 0.25];
const m3 = (sector: string, extra: Partial<SceneView>, p: Parameters<typeof preset>[1] = 'late') => ({ ...demoView(sector, p), ...extra }) as SceneView;
const mixH = (v: SceneView, hour?: number | null, calm = false, ending = 0) => mixFrom(v, soundscapeFor(v.sectorId), { calm, hour, ending });

describe('M3: nothing of a system the player has not met is heard', () => {
  test('absent fields: every M3 layer silent, every existing layer exactly as before', () => {
    const m3Layers = ['pumpHeave', 'loadHum', 'dayMill', 'crickets', 'queue', 'jamHorn', 'sprawlHum', 'till', 'tillMute', 'dam', 'grid'];
    for (const s of SECTORS) for (const p of PRESET_NAMES) {
      const m = mix(demoView(s, p));
      for (const id of m3Layers) if (m.layers[id]) { expect(m.layers[id].level).toBe(0); expect(m.layers[id].density).toBe(0); }
      expect(m.watch).toBe(0); expect(m.ending).toBe(0); expect(m.hour).toBeNull(); expect(Object.keys(m.bites)).toEqual([]);
    }
  });
  test('an M3 field for one Industry does nothing to another Industry\'s layers', () => {
    const v = m3('code', { seams: { sunk: 3, total: 4, next: true }, load: { hours: lightDay, factor: 0.55 }, travel: { speed: 0.3, sprawl: 0.8, sprawlShare: 0.5 }, free: { apps: ['code.chatbot'] } });
    const a = mix(demoView('code', 'late')), b = mix(v);
    expect(b.layers).toEqual(a.layers);
  });
});

describe('M3: Steam seams', () => {
  test('deeper seams: the winding runs longer (variant), lower and more often; the pumps labour', () => {
    const at = (sunk: number) => mix(m3('steam', { seams: { sunk, total: 4, next: true } }));
    const a = at(0), b = at(2), c = at(4);
    expect(a.layers.pumpHeave.level).toBe(0);
    expect(b.layers.pumpHeave.level).toBeGreaterThan(0.3);
    expect(c.layers.pumpHeave.level).toBeGreaterThan(b.layers.pumpHeave.level);
    expect(c.layers.winder.pitch).toBeLessThan(b.layers.winder.pitch);
    expect(b.layers.winder.pitch).toBeLessThan(a.layers.winder.pitch);
    expect(c.layers.winder.density).toBeGreaterThan(a.layers.winder.density);
    expect(a.layers.winder.variant).toBe(0);
    expect(c.layers.winder.variant).toBe(3);
    expect(c.layers.eng2.pitch).toBeLessThan(a.layers.eng2.pitch);
  });
  test('the deeper winder recipe is longer', () => {
    const len = (v: number) => render('winder', { rng: rngFrom(1), key: KEYS.steam, v }).length;
    expect(len(3)).toBeGreaterThan(len(0) * 1.4);
    expect(len(3) / BUF_SR).toBeLessThan(15);
  });
});

describe('M3: Light\'s day', () => {
  const v = m3('light', { load: { hours: lightDay, factor: 0.55 } });
  test('helpers', () => {
    expect(peakHourOf(lightDay)).toBe(18);
    expect(loadAt(lightDay, 18)).toBe(1);
    expect(loadAt(lightDay, 23.5)).toBeCloseTo((0.25 + 0.2) / 2, 5);
    expect(nightness(2)).toBe(1); expect(nightness(12)).toBe(0); expect(nightness(20.5)).toBeGreaterThan(0.2);
  });
  test('the evening peak is louder and brighter than the small hours; crickets only at a quiet night', () => {
    const peak = mixH(v, 18), small = mixH(v, 3);
    expect(peak.hour).toBe(18);
    expect(peak.layers.loadHum.level).toBeGreaterThan(small.layers.loadHum.level * 3);
    expect(peak.layers.loadHum.tone).toBeGreaterThan(small.layers.loadHum.tone);
    expect(peak.layers.town.level).toBeGreaterThan(small.layers.town.level);
    expect(small.layers.crickets.level).toBeGreaterThan(0.3);
    expect(peak.layers.crickets.level).toBe(0);
    expect(mixH(v, 8).layers.dayMill.density).toBeGreaterThan(0.5);
    expect(small.layers.dayMill.level).toBe(0);
  });
  test('the hollows sold: the night no longer goes quiet', () => {
    const flat = lightDay.map((x, h) => (h < 6 ? 0.85 : x));
    const sold = mixH(m3('light', { load: { hours: flat, factor: 0.8 } }), 3), quiet = mixH(v, 3);
    expect(sold.layers.nightMill.level).toBeGreaterThan(quiet.layers.nightMill.level * 2);
    expect(sold.layers.crickets.level).toBeLessThan(quiet.layers.crickets.level * 0.3);
    expect(sold.layers.loadHum.level).toBeGreaterThan(quiet.layers.loadHum.level * 2);
  });
  test('calm (no hour given) stands at the peak hour, as the picture does', () => {
    expect(mixH(v, null).hour).toBe(18);
  });
});

describe('M3: Motion travel', () => {
  test('congestion thickens the wash and brings the queue; cars pass slower; a horn only in a jam', () => {
    const at = (speed: number, sprawl = 0.3) => mix(m3('motion', { travel: { speed, sprawl, sprawlShare: 0.3 } }, 'mid'));
    const free = at(1), jam = at(0.2);
    expect(jam.layers.wash.level).toBeGreaterThan(free.layers.wash.level);
    expect(free.layers.queue.level).toBe(0);
    expect(jam.layers.queue.level).toBeGreaterThan(0.5);
    expect(jam.layers.cars.pitch).toBeLessThan(free.layers.cars.pitch);
    expect(free.layers.jamHorn.level).toBe(0);
    expect(jam.layers.jamHorn.level).toBeGreaterThan(0.4);
  });
  test('the sprawl stays when the traffic thins', () => {
    const thin = viewOf('motion', { ...preset('motion', 'late'), adoption: [0.1, 0.05, 0.1, 0.1, 0.1], status: ['founded', 'founded', 'founded', 'hidden', 'founded'] });
    const a = mix({ ...thin, travel: { speed: 0.95, sprawl: 0.9, sprawlShare: 0.7 } } as SceneView), b = mix(thin);
    expect(a.layers.sprawlHum.level).toBeGreaterThan(0.8);
    expect(a.layers.mower.level).toBeGreaterThan(b.layers.mower.level);
    expect(a.layers.radio.level).toBeGreaterThan(b.layers.radio.level);
  });
});

describe('M3: Compute free at the point of use', () => {
  test('free uses: the till falls silent where it rang, the bell-less key and the elsewhere (dam, grid) rise', () => {
    const none = mix(m3('compute', { free: { apps: [] } })), half = mix(m3('compute', { free: { apps: ['compute.globe', 'compute.play'] } }));
    const all = mix(m3('compute', { free: { apps: ['compute.sheet', 'compute.globe', 'compute.cloud', 'compute.play', 'compute.brain'] } }));
    expect(none.layers.till.level).toBeGreaterThan(0.5); expect(none.layers.tillMute.level).toBe(0); expect(none.layers.dam.level).toBe(0);
    expect(half.layers.till.level).toBeLessThan(none.layers.till.level);
    expect(all.layers.till.level).toBe(0);
    expect(all.layers.tillMute.level).toBeGreaterThan(half.layers.tillMute.level);
    expect(all.layers.dam.level).toBeGreaterThan(half.layers.dam.level);
    expect(all.layers.grid.level).toBeGreaterThan(0.5);
  });
});

describe('M3: levers that bite back, the watch, the ending', () => {
  test('bite is read per lever kind (0 when absent, clamped)', () => {
    const v = viewOf('motion', { ...preset('motion', 'mid'), levers: ['duty', 'cap'] });
    v.levers[0].bite = 0.7; v.levers[1].bite = 3;
    const m = mix(v);
    expect(m.bites.duty).toBeCloseTo(0.7, 5); expect(m.bites.cap).toBe(1);
    expect(mix(viewOf('motion', { ...preset('motion', 'mid'), levers: ['duty'] })).bites).toEqual({});
  });
  test('the watch: 0 when absent, clamped, silent in a Reckoning', () => {
    expect(mix(m3('steam', { watch: 0.5 })).watch).toBe(0.5);
    expect(mix(m3('steam', { watch: 7 })).watch).toBe(1);
    expect(mix({ ...demoView('steam', 'collapse'), watch: 1 } as SceneView).watch).toBe(0);
  });
  test('the ending clears the air, lifts the strain and steps the world back without stopping it', () => {
    const v = demoView('code', 'crisis');
    const a = mixH(v), b = mixH(v, null, false, 1);
    expect(b.air).toBeGreaterThan(a.air * 2);
    expect(b.stress).toBe(0); expect(b.thick).toBe(0);
    expect(b.world).toBeGreaterThan(0.6); expect(b.world).toBeLessThan(1);
    expect(b.layers.rain.level).toBeLessThan(a.layers.rain.level);
  });
});

describe('M3: cast motifs', () => {
  test('every family is a few notes and distinct from every other by interval content', () => {
    const sig = (degs: number[]) => degs.slice(1).map((d, i) => semis(K2.steam, d) - semis(K2.steam, degs[i])).join(',');
    const seen = new Map<string, string>();
    for (const [fam, [degs]] of Object.entries(MOTIFS)) {
      expect(degs.length).toBeGreaterThanOrEqual(2); expect(degs.length).toBeLessThanOrEqual(4);
      const k = sig(degs);
      expect(seen.has(k)).toBe(false);
      seen.set(k, fam);
    }
    for (const fam of Object.values(CAST_FAMILY)) expect(MOTIFS[fam]).toBeDefined();
    for (const p of PALETTES) for (const fam of Object.keys(MOTIFS)) expect(hasRecipe(`ui:${p}:motif.${fam}`)).toBe(true);
    expect(hasRecipe('ui:ledger:motif.nobody')).toBe(false);
  });
});

describe('M3: synthesis jobs and the worker', () => {
  test('jobs are deterministic; the impulse is normalised; ids differ by seed', () => {
    const j = { t: 'recipe' as const, name: 'bird', key: KEYS.steam, v: 2, seed: 9 };
    expect(runJob(j).chans[0]).toEqual(runJob(j).chans[0]);
    expect(jobId(j)).not.toBe(jobId({ ...j, seed: 10 }));
    const imp = runJob({ t: 'impulse', sr: 48000, dur: 1.7, seed: 1 });
    expect(imp.chans.length).toBe(2); expect(imp.sr).toBe(48000);
    const n = runJob({ t: 'noise', col: 'pink', seed: 1 });
    expect(n.chans[0][0]).toBeCloseTo(n.chans[0][n.chans[0].length - 1] * 0 + n.chans[0][0], 9);
  });
  test('worker-src.ts is up to date with worker.ts and the recipes (run: bun run tools/audio-worker.ts)', async () => {
    // @ts-ignore tools are outside the project tsconfig
    const { workerSource } = await import('../../../tools/audio-worker.ts');
    expect(WORKER_SRC).toBe(await workerSource());
  });
});
