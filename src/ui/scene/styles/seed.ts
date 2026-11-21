// Plenty / the Great Acceleration (M5): the seed catalogue and agricultural print, 1910s-50s. A variant of `chrome` (the
// Age's poster family: its cars, lorries, planes and roads are borrowed), printed as flat stone-litho colour with the
// key plate a hair out of register, crop rows as decorative bands, and a scale-and-diagram cut-away of roots and
// groundwater. The Dust Bowl is the paper itself yellowing: the haze is ochre, and the far plates drift first.
import type { ArtStyle } from '../style';
import { mix } from '../svg';
import { flatFill, glowDefs } from '../style';
import { chrome } from './chrome';
import { SEED } from '../props/seed';

export const seed: ArtStyle = {
  id: 'seed',
  idiom: 'Seed catalogue and agricultural print, 1910s-50s',
  css: chrome.css.replace(/data-look=chrome/g, 'data-look=seed') + `
.scn[data-look=seed]{--s-paper:#f1e5c2;--s-ink:#2c2a20;--s-b:#f6ecd0;--s-b2:#dcc89a;--s-rf:#b9402c;--s-w:#3a3527;--s-lit:#f0c35a;
  --s-tr:#6f9a52;--s-wa:#5f9fb3;--s-gd:#c9c77a;--s-gd2:#e2b84c;--s-ac:#c0432f;--s-ac2:#e2b84c;--s-mt:#a9a28c;--s-smk:120,104,80;
  --s-hz:214,172,86;--s-mist:241,229,194;--s-sun:#f2bf45;--s-sky0:#a9cfc9;--s-sky0b:#f1e5c2;--s-sky1:#d6b46a;--s-sky1b:#ead49a;
  --s-sky2:#b7dccf;--s-sky2b:#f3ead0;--s-fog:150,112,54;--s-sv:#c0432f;--s-hatch:#2c2a20;--s-glow:242,191,69;--s-frame:#2c2a20;--s-held:214,224,190}
.scn[data-look=seed] .scn-sky{background:linear-gradient(to bottom,var(--s-sky0) 0%,var(--s-sky0) 26%,#cfe0c8 26%,#cfe0c8 38%,var(--s-sky0b) 38%)}
.scn[data-look=seed] .b,.scn[data-look=seed] .rf,.scn[data-look=seed] .b2{stroke:none}
.scn[data-look=seed] .k{stroke:#2c2a20}
.scn[data-look=seed] .gd{fill:#cdc57c}
.scn .sd1{fill:#e2b84c}.scn .sd2{fill:#9cb45a}.scn .sd3{fill:#c9c77a}.scn .sd4{fill:#b07a4a}.scn .sd5{fill:#7d9e4c}.scn .sd6{fill:#d9a24a}
.scn .sdr{fill:none;stroke:rgba(44,42,32,.28);stroke-width:calc(.7px*var(--sw))}
.scn .reg{fill:none;stroke:#2c2a20;stroke-width:calc(.8px*var(--sw));opacity:.75}
.scn .riv{fill:var(--s-water,#5f9fb3)}
.scn .soil{fill:#9a6a40}.scn .soil2{fill:#c09060}.scn .aq{stroke:#2b5f74;stroke-width:calc(1px*var(--sw))}
.scn .aq0{fill:#e8d9b0}.scn .root{fill:none;stroke:#f1e5c2;stroke-width:calc(.6px*var(--sw))}
.scn .seep{fill:none;stroke:#3f86a0;stroke-width:calc(1.1px*var(--sw));stroke-dasharray:2 2}
.scn .vap{fill:none;stroke:rgba(255,255,255,.85);stroke-width:calc(1.2px*var(--sw))}
.scn .spray{fill:#7fc0d4;opacity:.8}.scn .scum{fill:#6fa83a;opacity:.85}
.scn .sd-h{font:700 italic 25px/1 var(--f-serif,Georgia,serif);fill:#b9402c;letter-spacing:.02em}
.scn .sd-s{font:600 9px/1 var(--f-serif,Georgia,serif);fill:#2c2a20;letter-spacing:.16em;text-transform:uppercase}
.scn .sd-l{font:italic 8px/1 var(--f-serif,Georgia,serif);fill:#f1e5c2;letter-spacing:.04em}
.scn[data-look=seed]:not(.wide) .sd-l{display:none}
.scn[data-look=seed] .scn-emb{border-radius:2px;background:#f1e5c2;color:#b9402c;border-color:#b9402c;box-shadow:none;font-family:var(--f-serif,Georgia,serif)}
.scn[data-look=seed] .scn-stage{border-radius:4px}`,
  defs: (p) => [0, 1, 2, 3].map((i) => flatFill(p, `h${i}`, 'rgba(44,42,32,.12)') + flatFill(p, `x${i}`, 'rgba(44,42,32,.2)')).join('') + glowDefs(p) +
    `<pattern id="${p}sdAq" patternUnits="userSpaceOnUse" width="6" height="6"><rect width="6" height="6" fill="#7fb4c4"/><circle cx="1.5" cy="1.5" r=".8" fill="#2b5f74" fill-opacity=".45"/><circle cx="4.5" cy="4.5" r=".8" fill="#2b5f74" fill-opacity=".45"/></pattern>`,
  plate: (c) => `<rect x="18" y="18" width="208" height="54" fill="#f1e5c2" stroke="#2c2a20" stroke-width="1.6"/><rect x="22" y="22" width="200" height="46" fill="none" stroke="#b9402c" stroke-width=".8"/>` +
    `<text x="32" y="48" class="sd-h">${(c.caption || c.name)}</text><text x="33" y="62" class="sd-s">Field &amp; well · No. 5</text>`,
  props: SEED,
  weather: { hz: [0.75, 0.6, 0.5] },
  // The fields brown towards dust with nitrate and drought; the river greens (the Green Tide).
  wash: (t, clear) => [mix(mix('#9cb45a', '#c6a456', t), '#93bb62', clear * 0.7), mix(mix('#5f9fb3', '#6fa046', t), '#62a6bd', clear * 0.7)],
};
