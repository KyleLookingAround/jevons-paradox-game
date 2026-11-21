/**
 * M5 fixtures (fixtures/m5/): the Reckoning at which office is first offered, ten minutes into the first Ministry, a
 * third Ministry with Plenty open and the drip subsidy just enacted, and the Reckoning at which a Treaty can be signed.
 *   bun run tools/m5-fixtures.ts [--src=fixtures/m4/act1-ending.json] [--out=fixtures/m5] [--after=10] [--motion=8]
 *                                [--only=offer,ministry1,plenty,treaty]
 * From a save five seconds before the Act I ending: play on to the ending and `--after` minutes more, Reckon; play the
 * capstone run (no decisions: the Market buys, Motion opens as a Preview) until Motion has been open `--motion` minutes,
 * Reckon: the fresh run carries the invitation (office-offer.json). Then Take office and play the `steward` regulator bot
 * (tools/strategies/govkit.ts) for ten minutes (ministry-1.json).
 * M5 balance: from office-offer.json, the `steward` plays Ministries with a person's Reckoning (tools/balance.m5.ts
 * --rule=player); in the third, once Plenty has been open two minutes, the drip subsidy is enacted at its first level
 * (Mandate allowing, as the steward would: the card is the Ministry's new lever) and the state written
 * (ministry-3-plenty.json); the campaign goes on until the Treaty is offered, and the fresh run that offers it is written
 * (treaty.json). Exits 1 if the invitation or the Treaty does not come.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { model } from '../src/core';
import { content as C } from '../src/content';
import type { GameState } from '../src/types';
import { GOV, resetGovMemo } from './strategies/govkit';
import { reckonNow, spendBetween } from './balance.m5';

const argv = process.argv.slice(2);
const str = (k: string, d: string) => argv.find((a) => a.startsWith(`--${k}=`))?.slice(k.length + 3) ?? d;
const num = (k: string, d: number) => Number(str(k, String(d)));
const out = str('out', 'fixtures/m5');
const only = new Set(str('only', 'offer,ministry1,plenty,treaty').split(','));

let offer: GameState;
if (only.has('offer')) {
  let s = model.deserialize(readFileSync(str('src', 'fixtures/m4/act1-ending.json'), 'utf8'), C)!;
  for (let i = 0; i < 3600 && !s.meta.endings?.actOne; i++) s = model.tick(s, C, 1);
  for (let i = 0; i < num('after', 10) * 60 && !model.derive(s, C).pendingReckoning; i++) s = model.tick(s, C, 1);
  s = model.reckon(s, C);
  for (let i = 0; i < 4 * 3600 && !model.derive(s, C).pendingReckoning; i++) {
    s = model.tick(s, C, 1);
    if ((s.sectors.motion?.openFor ?? 0) >= num('motion', 8) * 60) break;
  }
  s = model.reckon(s, C);
  if (!s.officeOffer) { console.error('no invitation: office not offered'); process.exit(1); }
  writeFileSync(`${out}/office-offer.json`, model.serialize(s));
  console.log(`office-offer: run ${s.meta.reckonings + 1}, ${(s.meta.totalSeconds / 3600).toFixed(2)} h`);
  offer = s;
} else offer = model.deserialize(readFileSync(`${out}/office-offer.json`, 'utf8'), C)!;

const bot = GOV.steward;
if (only.has('ministry1')) {
  let s = model.takeOffice(offer, C);
  resetGovMemo();
  for (let t = 0; t < 600; t++) { s = bot(s, C, t); s = model.tick(s, C, 1); }
  writeFileSync(`${out}/ministry-1.json`, model.serialize(s));
  console.log(`ministry-1: ${(s.time / 60).toFixed(1)} min, Confidence ${s.chair?.confidence.toFixed(1)}, levers ${Object.entries(s.levers).filter(([, v]) => v.level > 0).map(([k, v]) => `${k}=${v.level}`).join(' ')}`);
}

if (only.has('plenty') || only.has('treaty')) {
  let s = model.takeOffice(offer, C);
  let wrotePlenty = !only.has('plenty');
  for (let m = 1; m <= 12; m++) {
    if (m > 1 && model.derive(s, C).treaty?.available) {
      if (only.has('treaty')) writeFileSync(`${out}/treaty.json`, model.serialize(s));
      console.log(`treaty: Ministry ${m} offers it, ${(s.meta.totalSeconds / 3600).toFixed(2)} h, Precedent if signed ${model.derive(s, C).treaty?.precedentIfNow}`);
      if (wrotePlenty) process.exit(0);
    }
    s = spendBetween(s, C);
    resetGovMemo();
    const hist: [number, number][] = [];
    let settledAt: number | null = null;
    for (let t = 0; ; t++) {
      if (reckonNow(s, C, hist, 7200, settledAt)) break;
      s = bot(s, C, t);
      if (!wrotePlenty && (s.sectors.plenty?.openFor ?? 0) >= 120) {
        const n = model.setLever({ ...s }, C, 'plenty.dripSubsidy', Math.max(1, s.levers['plenty.dripSubsidy']?.level ?? 0));
        if (n.levers['plenty.dripSubsidy']?.level >= 1) {
          writeFileSync(`${out}/ministry-3-plenty.json`, model.serialize(n));
          console.log(`ministry-3-plenty: Ministry ${m}, ${(n.time / 60).toFixed(1)} min, Plenty open ${n.sectors.plenty.openFor} s, subsidy level ${n.levers['plenty.dripSubsidy'].level}, Mandate ${n.mandate.toFixed(0)}`);
          wrotePlenty = true;
          s = n;
          if (!only.has('treaty')) process.exit(0);
        }
      }
      if (model.derive(s, C).pendingReckoning) break;
      s = model.tick(s, C, 1);
      for (const id of ['motion', 'plenty']) if (s.sectors[id]?.settled && settledAt === null) settledAt = s.time;
    }
    s = model.reckon(s, C);
  }
  console.error('no Treaty within 12 Ministries');
  process.exit(1);
}
