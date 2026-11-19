// M3 test 1, "no fields, no change": the M2 fixture played by a scripted hour reproduces, bit for bit, the trajectory
// the M2 core (5d6e410) produced (per-step R, D and p_s of every open sector, capital, population and wellbeing, hashed).
// Real content without M3 data: byte-identical balancer output, checked by design/scratch/m3core/compare.sh.
// @ts-ignore — bun-types are not installed (see model.test.ts)
import { describe, expect, test } from 'bun:test';
import { model } from './index';
import { fixture as C, fixtureM3 } from './fixture';
import { trajectory } from './m3.golden';

const GOLDEN = {"hash":"578f3588-cc556e60","samples":[[300,571.3497446066261,15.119764410339885,103.22012486807974,-1,-1,-1,-1],[600,2383.143952765753,18.04534327825752,90.59267555403812,-1,-1,-1,-1],[900,924.3494822956264,17.861645444175814,94.30958740113914,-1,-1,-1,-1],[1200,4730.348542663747,17.423268607800978,95.91330861820613,-1,-1,-1,-1],[1500,79.25781208559275,29.661689964143676,244.71173444309298,-1,-1,-1,-1],[1800,4792.6697426194505,35.69469818092381,306.4872633983796,-1,-1,-1,-1],[2100,1329.9508824353095,16.552702617134113,106.64003028349707,-1,-1,-1,-1],[2400,2792.2880803218623,24.076042959595892,92.31298149165382,180.3898051566722,-1,-1,-1],[2700,12477.261968301475,51.121658384439456,444.56196952765583,363.58096685678646,-1,-1,-1],[3000,12260.082037137223,60.71607358710801,311.66210040487914,178.40915768941315,-1,-1,-1],[3300,40883.74252926396,65.13005170497074,226.60829178058557,178.20206667263537,-1,-1,-1],[3600,99609.11902914876,64.86474292545921,207.56801753780334,177.99100737601395,-1,-1,-1]]};

describe('M3: no fields, no change', () => {
  test('a scripted hour on the M2 fixture matches the M2 core exactly', () => {
    const t = trajectory(model, C);
    expect(t.samples).toEqual(GOLDEN.samples);
    expect(t.hash).toBe(GOLDEN.hash);
  });
  test('fixtureM3 Steam (seams unsunk) solves exactly as the M2 fixture Steam', () => {
    const a = model.createState(C), b = model.createState(fixtureM3);
    expect(model.derive(b, fixtureM3).sectors.steam).toEqual({ ...model.derive(a, C).sectors.steam, seams: model.derive(b, fixtureM3).sectors.steam!.seams });
  });
});
