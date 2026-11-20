/**
 * M5 fixtures (fixtures/m5/): the Reckoning at which office is first offered, and ten minutes into the first Ministry.
 *   bun run tools/m5-fixtures.ts [--src=fixtures/m4/act1-ending.json] [--out=fixtures/m5] [--after=10] [--motion=8]
 * From a save five seconds before the Act I ending: play on to the ending and `--after` minutes more, Reckon; play the
 * capstone run (no decisions: the Market buys, Motion opens as a Preview) until Motion has been open `--motion` minutes,
 * Reckon: the fresh run carries the invitation (office-offer.json). Then Take office and play the `steward` regulator bot
 * (tools/strategies/govkit.ts) for ten minutes (ministry-1.json). Exits 1 if the invitation does not come.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { model } from '../src/core';
import { content as C } from '../src/content';
import { GOV } from './strategies/govkit';

const argv = process.argv.slice(2);
const str = (k: string, d: string) => argv.find((a) => a.startsWith(`--${k}=`))?.slice(k.length + 3) ?? d;
const num = (k: string, d: number) => Number(str(k, String(d)));
const out = str('out', 'fixtures/m5');

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

s = model.takeOffice(s, C);
/* A core gap (design/scratch/m5-prestige-progress.md): takeOffice leaves flags.revealed false (every Institution is at
 * level 0 after the wipe), which hides every lever. The regulator harness (tools/balance.m5.ts) sets it by hand; so does
 * this fixture, so that it shows the Ministry as intended. Remove once the core sets it in a Ministry. */
s = { ...s, flags: { ...s.flags, revealed: true } };
const bot = GOV.steward;
for (let t = 0; t < 600; t++) { s = bot(s, C, t); s = model.tick(s, C, 1); }
writeFileSync(`${out}/ministry-1.json`, model.serialize(s));
console.log(`ministry-1: ${(s.time / 60).toFixed(1)} min, Confidence ${s.chair?.confidence.toFixed(1)}, levers ${Object.entries(s.levers).filter(([, v]) => v.level > 0).map(([k, v]) => `${k}=${v.level}`).join(' ')}`);
