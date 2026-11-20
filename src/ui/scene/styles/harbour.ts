// Fishing / the Coal Age (M4): a harbour engraving at dawn, a variant of `ledger` (its hatches, stipple, plate and
// legend), with an Admiralty chart in place of the cut-away: soundings in the chart's italic, the banks outlined, the
// shoals as stipple, foreign sails as pennant-coloured glyphs (no real flags), a scar as blank grey water.
import type { ArtStyle } from '../style';
import { mix } from '../svg';
import { engravingHatches, glowDefs, dots } from '../style';
import { LEDGER } from '../props/ledger';
import { HARBOUR } from '../props/harbour';

export const harbour: ArtStyle = {
  id: 'harbour',
  idiom: 'Steel engraving at dawn, with an Admiralty chart (1880s)',
  css: `.scn[data-look=harbour]{
  --s-paper:var(--bg-solid,#efe6d0);--s-ink:#2a1f15;--s-b:#f4ecd6;--s-b2:#e6d9b9;--s-rf:#d8c7a2;--s-w:#3b2d1f;--s-lit:#e8ae3c;
  --s-tr:var(--s-wash,#a9b585);--s-wa:var(--s-water,#a9c2c8);--s-gd:#ddd1ab;--s-gd2:#cdbd92;--s-sp:#7a6e5d;--s-ac:#a3231a;--s-ac2:#24473a;
  --s-mt:#8e8a80;--s-smk:58,48,38;--s-hz:206,190,170;--s-mist:244,232,214;--s-sun:#f0b26a;
  --s-sky0:#f1dcc8;--s-sky0b:#f5ead4;--s-sky1:#c9b597;--s-sky1b:#e3d6b8;--s-sky2:#e3ebe8;--s-sky2b:#f6efdc;
  --s-sv:#a3231a;--s-hatch:#2a1f15;--s-glow:255,206,140;--s-frame:#2a1f15;--s-fog:70,78,84;--s-held:226,232,220;
}
.scn[data-look=harbour] .smb{fill:rgba(250,244,228,.55);stroke:#2a1f15;stroke-width:calc(.6px*var(--sw));stroke-opacity:.7}
.scn[data-look=harbour] .smh{stroke:none}
.scn[data-look=harbour] .lane{fill:#e9dfc2;stroke:#2a1f15;stroke-width:calc(.5px*var(--sw));stroke-opacity:.55}
.scn[data-look=harbour] .scn-stage{outline:1px solid var(--s-frame);outline-offset:3px;margin:4px 0 8px}
.scn[data-look=harbour] .scn-emb{font:italic 11px/1.3 var(--f-serif,Georgia,serif);letter-spacing:.08em;text-transform:none;font-variant:small-caps;border-radius:50%/40%;padding:4px 10px}
.scn[data-look=harbour] .scn-emb.cart{border-radius:2px}
.scn .chp{fill:#f3ecd8;stroke:#2a1f15;stroke-width:calc(.9px*var(--sw))}
.scn .chb{fill:#e2d8bc;stroke:#2a1f15;stroke-width:calc(.6px*var(--sw));stroke-dasharray:1.5 1.6}
.scn .chc{fill:none;stroke:#2a1f15;stroke-width:calc(.45px*var(--sw));stroke-dasharray:.8 2;opacity:.7}
.scn .snd{fill:#2a1f15;font:italic 6.4px/1 var(--f-serif,Georgia,serif);opacity:.8}
.scn:not(.wide) .snd{display:none}
.scn .cht{fill:#2a1f15;font:italic 8px/1 var(--f-serif,Georgia,serif);letter-spacing:.06em}
.scn .chs{fill:#2a1f15;stroke:none}
.scn .scr{fill:#c9c6bd;stroke:#2a1f15;stroke-width:calc(.5px*var(--sw));stroke-dasharray:2 1.5}
.scn .fp1{fill:#b8452e;stroke:#2a1f15;stroke-width:.4px}.scn .fp2{fill:#2f5d8a;stroke:#2a1f15;stroke-width:.4px}.scn .fp3{fill:#c9a227;stroke:#2a1f15;stroke-width:.4px}
.scn .svt{fill:none;stroke:#a3231a;stroke-width:calc(.7px*var(--sw));stroke-dasharray:2 2}`,
  defs: (p) => engravingHatches(p) + glowDefs(p) + dots(p, 'stip1', 2.2, 0.42, '#2a1f15', 0.5) + dots(p, 'stip2', 3.4, 0.38, '#2a1f15', 0.4),
  plate: () =>
    '<rect x="5" y="5" width="590" height="390" fill="none" stroke="#2a1f15" stroke-width="1.2"/>' +
    '<rect x="9" y="9" width="582" height="382" fill="none" stroke="#2a1f15" stroke-width=".5"/>',
  legend: (c) => c.caption ? `Plate IV. — ${c.caption}.` : '',
  props: { ...LEDGER, ...HARBOUR },
  wash: (t, clear) => [mix(mix('#a8bd7c', '#9a8c6c', t), '#9fc07a', clear * 0.7), mix(mix('#a6c2cb', '#98a0a0', t), '#9cc8d4', clear * 0.6)],
  weather: { hz: [0.5, 0.28, 0.08] },
};
