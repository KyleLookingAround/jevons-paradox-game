// Iron & Steel / the Coal Age (M4): a foundry lithograph. The `ledger` family printed from two stones, furnace orange
// over a heavy ink, at night: the blacks are solid, the orange is a flat plate laid slightly out of register with the
// ink (the glow plates are offset a hair, as a two-colour print is), and the sky is ink stipple over a low orange glow.
// The same country as Steam's plate (geography.ts); a legend in the ledger manner ("Plate III. — …").
import type { ArtStyle } from '../style';
import { mix } from '../svg';
import { engravingHatches, glowDefs, dots } from '../style';
import { FOUNDRY } from '../props/foundry';

export const foundry: ArtStyle = {
  id: 'foundry',
  idiom: 'Two-colour lithograph, furnace orange over ink, at night (1850s–1900s)',
  css: `.scn[data-look=foundry]{
  --s-paper:#e9dcc0;--s-ink:#15100d;--s-b:#3a302a;--s-b2:#4b3e33;--s-rf:#231b17;--s-w:#1b1411;--s-lit:#f39233;
  --s-tr:var(--s-wash,#3b3f2e);--s-hill:#1d1714;--s-wa:var(--s-water,#2d363b);--s-gd:#57483a;--s-gd2:#665341;--s-sp:#2a221e;--s-ac:#e8762c;--s-ac2:#b9481a;
  --s-mt:#6f675d;--s-smk:44,32,26;--s-hz:122,72,42;--s-mist:58,44,36;--s-sun:#efdcae;
  --s-sky0:#221e27;--s-sky0b:#6a4734;--s-sky1:#4a3124;--s-sky1b:#b05a28;--s-sky2:#2b3142;--s-sky2b:#8d7b62;
  --s-sv:#f0a040;--s-hatch:#0e0a08;--s-glow:255,138,48;--s-frame:#15100d;--s-fog:208,98,34;--s-btxt:#fff0d8;--s-held:236,176,112;
}
.scn[data-look=foundry] .og{fill:var(--s-ac);stroke:none;opacity:.86;transform:translate(1.1px,.7px)}
.scn[data-look=foundry] .og2{fill:#f6b25a;stroke:none;opacity:.9;transform:translate(1.1px,.7px)}
.scn[data-look=foundry] .ogk{fill:none;stroke:var(--s-lit);stroke-width:calc(.9px*var(--sw))}
.scn[data-look=foundry] .str{fill:#efe2c4;stroke:none;opacity:.7}
.scn[data-look=foundry] .smb{fill:rgba(52,36,28,.62);stroke:#15100d;stroke-width:calc(.5px*var(--sw));stroke-opacity:.5}
.scn[data-look=foundry] .smh{stroke:none}
.scn[data-look=foundry] .lane{fill:#4a3d30;stroke:#15100d;stroke-width:calc(.5px*var(--sw))}
.scn[data-look=foundry] .wl{stroke:var(--s-lit);opacity:.55}
.scn[data-look=foundry] .wg{fill:#e9dcc0;font:700 5.6px/1 var(--labelf,system-ui,sans-serif)}
.scn[data-look=foundry] .wgb{fill:#2a201b;stroke:#e9dcc0;stroke-width:calc(.5px*var(--sw))}
.scn[data-look=foundry] .cs{fill:rgba(0,0,0,.35)}
.scn[data-look=foundry] .smk i{background:rgba(var(--s-smk),var(--smk-a,.35));box-shadow:inset 0 -.6px 0 .3px rgba(243,146,51,.35)}
.scn[data-look=foundry] .plm{stroke:rgba(60,40,30,.5)}
.scn[data-look=foundry] .ghost{opacity:.5}
.scn[data-look=foundry] .scn-stage{outline:1px solid var(--s-frame);outline-offset:3px;margin:4px 0 8px}
.scn[data-look=foundry] .scn-emb{font:italic 11px/1.3 var(--f-serif,Georgia,serif);letter-spacing:.08em;text-transform:none;font-variant:small-caps;background:#e9dcc0;color:#15100d}
.scn[data-look=foundry] .flm{fill:#f6a344;stroke:none}
.scn[data-look=foundry] .fig .d,.scn[data-look=foundry] .fig .b,.scn[data-look=foundry] .fig .b2{stroke:#eaa24e;stroke-width:.7px}
.scn[data-look=foundry] .hl1{fill:var(--s-hill);stroke:var(--s-ink)}.scn[data-look=foundry] .hl2{fill:#2c2420;stroke:var(--s-ink)}
.scn[data-look=foundry] .dx,.scn[data-look=foundry] .sx{fill:#7a6650!important}`,
  defs: (p) => engravingHatches(p) + glowDefs(p) + dots(p, 'stip1', 2.4, 0.5, '#0e0a08', 0.6) + dots(p, 'stip2', 3.2, 0.42, '#0e0a08', 0.45),
  plate: () =>
    '<rect x="5" y="5" width="590" height="390" fill="none" stroke="#15100d" stroke-width="1.6"/>' +
    '<rect x="9" y="9" width="582" height="382" fill="none" stroke="#15100d" stroke-width=".6"/>',
  legend: (c) => c.caption ? `Plate III. — ${c.caption}.` : '',
  props: FOUNDRY,
  wash: (t, clear) => [mix(mix('#3d4430', '#4a3a2c', t), '#45553a', clear * 0.7), mix(mix('#2e383e', '#3b3028', t), '#33454f', clear * 0.6)],
  // The haze is the smoke's orange-brown tint, laid over the far bands like a third printing.
  weather: { hz: [0.62, 0.38, 0.12] },
};
