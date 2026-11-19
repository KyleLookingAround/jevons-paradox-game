// Steam / the Coal Age: steel engraving from an illustrated paper of the 1840s.
import type { ArtStyle } from '../style';
import { mix } from '../svg';
import { engravingHatches, glowDefs, dots } from '../style';
import { LEDGER } from '../props/ledger';

export const ledger: ArtStyle = {
  id: 'ledger',
  idiom: 'Steel engraving, illustrated paper, 1840s',
  css: `.scn[data-look=ledger]{
  --s-paper:var(--bg-solid,#efe6d0);--s-ink:#2a1f15;--s-b:#f4ecd6;--s-b2:#e6d9b9;--s-rf:#d8c7a2;--s-w:#3b2d1f;--s-lit:#e8ae3c;
  --s-tr:var(--s-wash,#a9b585);--s-wa:var(--s-water,#a7bcc0);--s-gd:#ddd1ab;--s-gd2:#cdbd92;--s-sp:#7a6e5d;--s-ac:#a3231a;--s-ac2:#24473a;
  --s-mt:#8e8a80;--s-smk:58,48,38;--s-hz:196,180,148;--s-mist:239,230,208;--s-sun:#e9c46a;
  --s-sky0:#f3ecd9;--s-sky0b:#e9e0c6;--s-sky1:#b49f7c;--s-sky1b:#d8c8a4;--s-sky2:#dfe8e4;--s-sky2b:#f1eedc;
  --s-sv:#a3231a;--s-hatch:#2a1f15;--s-glow:255,206,110;--s-frame:#2a1f15;--s-fog:46,36,26;
}
.scn[data-look=ledger] .smb{fill:rgba(250,244,228,.55);stroke:#2a1f15;stroke-width:calc(.6px*var(--sw));stroke-opacity:.7}
.scn[data-look=ledger] .smh{stroke:none}
.scn[data-look=ledger] .scn-stage{outline:1px solid var(--s-frame);outline-offset:3px;margin:4px 0 8px}`,
  defs: (p) => engravingHatches(p) + glowDefs(p) + dots(p, 'stip1', 2.2, 0.42, '#2a1f15', 0.55) + dots(p, 'stip2', 3.4, 0.38, '#2a1f15', 0.45),
  plate: () =>
    // The plate: a double engraved rule inside the border, like a print in an illustrated paper.
    '<rect x="5" y="5" width="590" height="390" fill="none" stroke="#2a1f15" stroke-width="1.2"/>' +
    '<rect x="9" y="9" width="582" height="382" fill="none" stroke="#2a1f15" stroke-width=".5"/>',
  legend: (c) => c.caption ? `Plate I. — ${c.caption}.` : '',
  props: LEDGER,
  wash: (t, clear) => [mix(mix('#a8bd7c', '#9a8c6c', t), '#9fc07a', clear * 0.7), mix(mix('#a3bcc4', '#8f8a74', t), '#9cc0cc', clear * 0.6)],
  // Smog as a pale murk that lifts the far bands towards the paper (the engraver's atmospheric perspective), so the
  // dark near drawing stays legible; the smoke itself is engraved plumes (the 'smog' plot), not a wash.
  weather: { hz: [0.66, 0.38, 0.1] },
};
