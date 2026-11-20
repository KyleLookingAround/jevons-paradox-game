// M4 (amend): lever and Institution conditions, feeds known, the feed share and the combined factor on the target, the
// Act I milestone keys, and an act's ending writing only its own milestone.
// @ts-ignore — bun-types are not installed (see model.test.ts)
import { describe, expect, test } from 'bun:test';
import type { Content, GameState } from '../types';
import { model } from './index';
import { statValue } from './conditions';
import { computeFlows } from './flows';
import { feedFactor } from './feeds';
import { rAddedOf } from './orderBook';
import { fixtureM4Acts as CA } from './fixture';
import { C4, D4, forceSettle, openWith, patch, run4 } from './m4.testkit';

const K = 100_000;
const STEAM = ['steam.pumping', 'steam.mills'];
/** Iron with no feeding use founded (iron.rails is free, so an opening founds it). */
const unfed = (s: GameState): GameState => patch(s, 'iron', { apps: { ...s.sectors.iron.apps, 'iron.rails': { ...s.sectors.iron.apps['iron.rails'], founded: false } } });

describe('M4 (amend): LeverDef.when', () => {
  const W: Content = { ...C4, levers: C4.levers.map((l) => (l.id === 'fish.limits' ? { ...l, when: { stat: 'foreignShare', sector: 'fish', op: '>=', value: 0.15, label: 'Foreign sails on the grounds' } } : l)) };
  const view = (s: GameState) => model.leverViews(s, W).find((l) => l.def.id === 'fish.limits')!;
  test('hidden with its label until the condition holds; then shown for the rest of the run, without flicker', () => {
    let s = patch(openWith(W, ['fish'], ['fish.market']), 'fish', { reserve: 0.8 * K });
    expect(view(s).visible).toBe(false);
    expect(view(s).waiting).toBe('Foreign sails on the grounds');
    expect(model.setLever(s, W, 'fish.limits', 1)).toBe(s);
    const ps = computeFlows(s, W).sectors.fish.ps;
    const basePs = s.sectors.fish.basePs;
    s = model.tick(patch(s, 'fish', { basePs: 3 * ps }), W, 1);
    expect(s.levers['fish.limits'].seen).toBe(true);
    expect(view(s).visible).toBe(true);
    expect(view(s).waiting).toBeNull();
    s = model.tick(patch(s, 'fish', { basePs }), W, 1); // the share dips below 15%
    expect(statValue(s, W, { stat: 'foreignShare', sector: 'fish' })!).toBeLessThan(0.15);
    expect(view(s).visible).toBe(true);
    expect(model.setLever(s, W, 'fish.limits', 1).levers['fish.limits'].level).toBe(1);
    expect(model.leverViews(s, W).find((l) => l.def.id === 'fish.board')!.waiting).toBeNull();
  });
});

describe('M4 (amend): InstitutionDef.when', () => {
  const I: Content = { ...C4, institutions: [...(C4.institutions ?? []), { id: 'inst.board', name: 'Fishery Board', blurb: '', cost: 1, when: { owns: 'fish' }, effects: [{ type: 'survey', sector: 'fish' }] }] };
  test('not offered (nor buyable) until the condition holds between runs; owned is always shown', () => {
    const s = { ...model.createState(I), meta: { ...model.createState(I).meta, hindsight: 10 } };
    const v = (x: GameState) => model.institutionViews(x, I).find((i) => i.def.id === 'inst.board')!;
    expect(v(s).visible).toBe(false);
    expect(v(s).canBuy).toBe(false);
    expect(model.buyInstitution(s, I, 'inst.board')).toBe(s);
    expect(model.institutionViews(s, I).find((i) => i.def.id === 'inst.stats')!.visible).toBe(true);
    const opened = model.createState(I, { ...s.meta, sectorsOpened: { ...s.meta.sectorsOpened, fish: true } });
    expect(v(opened).visible).toBe(true);
    const bought = model.buyInstitution(opened, I, 'inst.board');
    expect(bought.meta.institutions['inst.board']).toBe(1);
    const forgot = model.createState(I, { ...bought.meta, sectorsOpened: { steam: true } });
    expect(v(forgot).visible).toBe(true);
  });
});

describe('M4 (amend): mechanic.feedsKnownWhen', () => {
  const F: Content = {
    ...C4,
    sectors: { ...C4.sectors, iron: { ...C4.sectors.iron, mechanic: { name: 'The order book', rebound: 'Input', blurb: '', feedsKnownWhen: { owns: 'iron.economy' } } } },
    upgrades: [...C4.upgrades, { id: 'iron.economy', sector: 'iron', name: 'Of the Economy of Fuel', blurb: '', kind: 'research', cost: 1, effects: [] }],
  };
  test('until it holds the page sees no feed lines (the feeds still act); then it does', () => {
    const s = run4(openWith(F, ['iron'], [...STEAM, 'iron.rails']), 2, F);
    const d = model.derive(s, F);
    expect(d.sectors.iron!.apps['iron.rails'].feedsKnown).toBe(false);
    expect(d.sectors.iron!.apps['iron.rails'].feeds).toBeNull();
    expect(d.sectors.iron!.feeds).toBeNull();
    expect(d.sectors.steam!.capCost).toBeLessThan(F.sectors.steam.capCost); // acting all the same
    const k = { ...s, upgrades: { ...s.upgrades, 'iron.economy': 1 } };
    const e = model.derive(k, F);
    expect(e.sectors.iron!.apps['iron.rails'].feedsKnown).toBe(true);
    expect(e.sectors.iron!.apps['iron.rails'].feeds).not.toBeNull();
    expect(e.sectors.iron!.feeds).not.toBeNull();
    expect(D4(s).sectors.iron!.apps['iron.rails'].feedsKnown).toBe(true); // default: known
  });
});

describe("M4 (amend): 'feedShare' and SectorDerived.fed", () => {
  test('the combined factor, Σ rAdded and its share of the target\'s R, as one figure and as stats', () => {
    const s = run4(openWith(C4, ['iron', 'light'], [...STEAM, 'iron.rails', 'iron.girders']), 3);
    const fl = computeFlows(s, C4);
    const ad = (i: number) => fl.sectors.iron.appD[i] / fl.sectors.iron.appSat[i];
    const fed = D4(s).sectors.steam!.fed!;
    expect(fed.factor).toBeCloseTo(feedFactor(0.8, ad(0)) * feedFactor(0.9, ad(1)), 12);
    expect(fed.factor).toBe(statValue(s, C4, { stat: 'feedFactor', sector: 'steam' })!);
    expect(fed.rAdded).toBeCloseTo(rAddedOf(s, C4, 'iron').steam, 12);
    expect(fed.share).toBeCloseTo(fed.rAdded! / fl.sectors.steam.R, 12);
    expect(statValue(s, C4, { stat: 'feedShare', sector: 'steam' })).toBe(fed.share);
    const none = run4(unfed(openWith(C4, ['iron'], [...STEAM, 'iron.pots'])), 2);
    expect(D4(none).sectors.steam!.fed).toBeNull();
    expect(statValue(none, C4, { stat: 'feedShare', sector: 'steam' })).toBe(0);
    expect(D4(none).sectors.iron!.fed).toBeNull();
  });
});

describe('M4 (amend): the Act I milestones', () => {
  test("'feed:<source>', 'crisis:<s>' (renewables only), 'threshold:<s>', 'surveyed:<s>', 'scarHealed:<s>'", () => {
    let s = unfed(openWith(C4, ['iron', 'fish'], [...STEAM, 'iron.pots', 'fish.market', 'fish.trawlers'], undefined, { population: 50 }));
    s = { ...s, meta: { ...s.meta, milestones: {} } };
    s = model.tick(s, C4, 1);
    expect(s.meta.milestones['feed:iron']).toBeUndefined();
    s = model.foundApp({ ...s, capital: 1e9 }, C4, 'iron.girders');
    s = model.tick(s, C4, 1);
    expect(s.meta.milestones['feed:iron']).toBeDefined();
    s = model.tick(patch(s, 'fish', { reserve: 0.305 * K }), C4, 1);
    for (let i = 0; i < 20 && !s.sectors.fish.crossed; i++) s = model.tick(s, C4, 1);
    expect(s.meta.milestones['crisis:fish']).toBeDefined();
    expect(s.meta.milestones['threshold:fish']).toBeDefined();
    expect(Object.keys(s.meta.milestones).some((k) => k === 'crisis:steam' || k === 'crisis:iron')).toBe(false);
    s = model.tick({ ...s, levers: { ...s.levers, 'fish.board': { level: 1, ref: 0 } } }, C4, 1);
    s = model.tick(s, C4, 1);
    expect(s.meta.milestones['surveyed:fish']).toBeDefined();
    s = model.tick({ ...s, meta: { ...s.meta, world: { ...s.meta.world, scars: { fish: { yearsLeft: 0.01, since: 0 } } } } }, C4, 1);
    expect(s.meta.milestones['scarHealed:fish']).toBeDefined();
    const m = s.meta.milestones['threshold:fish'];
    expect(m.run).toBe(1);
  });
  test("with acts, an act's ending writes 'ending:<actId>' and not the M3 'won'", () => {
    let s = run4(openWith(CA, ['iron', 'fish'], [...STEAM, 'iron.rails', 'fish.market']), 2, CA);
    for (const id of ['steam', 'iron', 'fish']) s = forceSettle(s, CA, id);
    for (let i = 0; i < 45 && !s.flags.won; i++) s = model.tick(s, CA, 1);
    expect(s.flags.won).toBe(true);
    expect(s.meta.milestones['ending:actOne']).toBeDefined();
    expect(s.meta.milestones.won).toBeUndefined();
    expect(s.meta.endings.steadyAll).toBeUndefined();
  });
});
