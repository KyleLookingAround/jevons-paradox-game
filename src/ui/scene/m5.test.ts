// M5 scene: the adapter's Ministry fields on real saves, the moments, Plenty's layout, the frame, the props and spots.
// @ts-ignore bun:test types are not in the project tsconfig (types: [])
import { describe, expect, test } from 'bun:test';
// @ts-ignore node types are not in the project tsconfig
import { readFileSync } from 'node:fs';
import { sceneViewFrom } from './adapter';
import { MomentDesk } from './moments';
import { layoutFor, hasLayout, propFor } from './registry';
import { postcard, postcardKey } from './postcard';
import { spot } from './spots';
import { figureArt } from './props/figures';
import { frameMarkup } from './frame/ministry';
import { styleFor } from './styles/index';
import { rng } from './svg';
import { model } from '../../core';
import { content as C } from '../../content';
import type { SceneView } from './types';

const load = (f: string) => model.deserialize(readFileSync(f, 'utf8'), C)!;

describe('M5 adapter', () => {
  test('no M5 field before office (the invitation save)', () => {
    const s = load('fixtures/m5/office-offer.json');
    const v = sceneViewFrom(C, s, model.derive(s, C), 'motion');
    for (const k of ['chair', 'rival', 'exempt', 'water', 'sealed'] as const) expect(v[k]).toBeUndefined();
    for (const l of v.levers) { expect(l.lobbied).toBeUndefined(); expect(l.litigated).toBeUndefined(); }
  });
  test('in a Ministry: the window, Pryce runs Motion, Compute and Code sealed', () => {
    const s = load('fixtures/m5/ministry-1.json');
    const d = model.derive(s, C);
    const v = sceneViewFrom(C, s, d, 'motion');
    expect(v.chair).toEqual({ opposition: false });
    expect(v.rival).toBe(true);
    const sealed = (d as { office?: { sealed?: string[] } }).office?.sealed ?? [];
    for (const id of sealed) expect(sceneViewFrom(C, s, d, id).sealed).toBe(true);
  });
  test('lobbied, litigated and the exempt vans from the chair state', () => {
    const s = structuredClone(load('fixtures/m5/ministry-1.json'));
    const d = model.derive(s, C);
    s.levers['motion.cap'] = { ...(s.levers['motion.cap'] ?? {}), level: 1 } as typeof s.levers[string];
    s.chair!.rival.lobbying['motion.cap'] = true;
    s.chair!.litigation['motion.cap'] = { from: 0, until: s.time + 100 };
    s.chair!.loopholes['motion.mileage.lightTrucks'] = { status: 'used', since: 0 };
    const v = sceneViewFrom(C, s, { ...d, features: { ...(d as { features?: Record<string, boolean> }).features, loopholes: true } } as typeof d, 'motion');
    const cap = v.levers.find((l) => l.id === 'motion.cap')!;
    expect(cap.lobbied).toBe(true);
    expect(cap.litigated).toBe(true);
    expect(v.exempt).toEqual(['vans']);
  });
});

describe('M5 moments and art', () => {
  test('inspected, concealmentFound and litigated events become moments', () => {
    const desk = new MomentDesk();
    const base = { sectorId: 'motion', crises: 0, stage: 0, apps: [], levers: [], commons: [] } as unknown as SceneView;
    desk.take({ ...base, events: [] }, 0, true);
    const m = desk.take({ ...base, events: [{ seq: 1, kind: 'inspected', sector: 'motion', by: 'player' }, { seq: 2, kind: 'concealmentFound', sector: 'motion' }, { seq: 3, kind: 'litigated', sector: 'motion', id: 'motion.duty' }] }, 1000, false);
    expect(m.map((x) => x.kind)).toEqual(['inspected', 'found5', 'litigated']);
  });
  test('Plenty has its layout in the seed style, its slots draw, and its postcard', () => {
    expect(hasLayout('plenty')).toBe(true);
    const l = layoutFor('plenty', 6);
    expect(l.look).toBe('seed');
    expect(styleFor('seed')?.css).toContain('data-look=seed');
    for (const p of l.plots) for (const sl of [...(p.anchor ? [p.anchor] : []), ...p.slots]) {
      for (const stage of [0, 1, 2, 3]) {
        const out = propFor('seed', 'chrome', sl.p)({ s: 1, v: sl.v ?? 0.5, stage, w: sl.w ?? 0, h: sl.h ?? 0, r: rng(1), u: (x) => x, hatch: () => '', overlay: false }, { fx: () => {} });
        expect(out.length).toBeGreaterThan(0);
      }
    }
    const v = { sectorId: 'plenty', look: 'chrome', stage: 2, apps: [{ id: 'plenty.bread', icon: 'wheat', status: 'founded', adoption: 0.5 }], pressureFraction: 0.3 } as unknown as SceneView;
    expect(postcard(v).startsWith('<svg')).toBe(true);
    expect(postcardKey({ ...v, sealed: true })).not.toBe(postcardKey(v));
    expect(postcard({ ...v, sealed: true })).toContain('#9e2b22');
  });
  test('the frame, the new cast and the M5 spots', () => {
    expect(frameMarkup('x-')).toContain('url(#x-frmG)');
    for (const k of ['pryceChair', 'permanentSecretary', 'inspector', 'opposition', 'okonedo']) expect(figureArt(k, 'chrome')).not.toBeNull();
    for (const k of ['officeTaken', 'rivalAnswered', 'concealmentFound', 'electionWon', 'litigated']) expect(spot(k, 'chrome').startsWith('<svg')).toBe(true);
  });
});
