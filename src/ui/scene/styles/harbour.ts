// Fishing / the Coal Age (M4): a harbour engraving at dawn, a variant of `ledger` (its hatches, stipple, plate and
// legend), with an Admiralty chart in place of the cut-away: soundings in the chart's italic, the banks outlined, the
// shoals as stipple, foreign sails as pennant-coloured glyphs (no real flags), a scar as blank grey water.
import type { ArtStyle } from '../style';
import { mix } from '../svg';
import { LEDGER } from '../props/ledger';
import { ledger } from './ledger';
import { HARBOUR } from '../props/harbour';

export const harbour: ArtStyle = {
  id: 'harbour',
  idiom: 'Steel engraving at dawn, with an Admiralty chart (1880s)',
  // The ledger's own treatment (smoke plumes, lanes, the plate's outline, the emblem), re-scoped, with dawn tokens.
  css: ledger.css.replace(/data-look=ledger/g, 'data-look=harbour') + `
.scn[data-look=harbour]{--s-wa:var(--s-water,#a9c2c8);--s-hz:206,190,170;--s-mist:244,232,214;--s-sun:#f0b26a;--s-sky0:#f1dcc8;--s-sky0b:#f5ead4;--s-glow:255,206,140;--s-fog:70,78,84;--s-held:226,232,220}
.scn[data-look=harbour] .scn-emb.cart{border-radius:2px}
.scn[data-look=harbour] .chp{fill:#f3ecd8;stroke:#2a1f15;stroke-width:calc(.9px*var(--sw))}
.scn[data-look=harbour] .chb{fill:#e2d8bc;stroke:#2a1f15;stroke-width:calc(.6px*var(--sw));stroke-dasharray:1.5 1.6}
.scn[data-look=harbour] .chc{fill:none;stroke:#2a1f15;stroke-width:calc(.45px*var(--sw));stroke-dasharray:.8 2;opacity:.7}
.scn[data-look=harbour] .snd{fill:#2a1f15;font:italic 6.4px/1 var(--f-serif,Georgia,serif);opacity:.8}
.scn[data-look=harbour]:not(.wide) .snd{display:none}
.scn[data-look=harbour] .cht{fill:#2a1f15;font:italic 8px/1 var(--f-serif,Georgia,serif);letter-spacing:.06em}
.scn[data-look=harbour] .chs{fill:#2a1f15;stroke:none}
.scn[data-look=harbour] .chx{fill:#c9c6bd;stroke:#2a1f15;stroke-width:calc(.5px*var(--sw));stroke-dasharray:2 1.5}
.scn[data-look=harbour] .fp1{fill:#b8452e;stroke:#2a1f15;stroke-width:.4px}.scn[data-look=harbour] .fp2{fill:#2f5d8a;stroke:#2a1f15;stroke-width:.4px}.scn[data-look=harbour] .fp3{fill:#c9a227;stroke:#2a1f15;stroke-width:.4px}
.scn[data-look=harbour] .svt{fill:none;stroke:#a3231a;stroke-width:calc(.7px*var(--sw));stroke-dasharray:2 2}`,
  defs: ledger.defs,
  plate: ledger.plate,
  legend: (c) => c.caption ? `Plate IV. — ${c.caption}.` : '',
  props: { ...LEDGER, ...HARBOUR },
  wash: (t, clear) => [mix(mix('#a8bd7c', '#9a8c6c', t), '#9fc07a', clear * 0.7), mix(mix('#a6c2cb', '#98a0a0', t), '#9cc8d4', clear * 0.6)],
  weather: { hz: [0.5, 0.28, 0.08] },
};
