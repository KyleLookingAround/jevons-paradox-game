// Motion / the Great Acceleration: mid-century travel poster, airbrushed motoring advert.
import type { ArtStyle } from '../style';
import { mix } from '../svg';
import { flatFill, glowDefs } from '../style';
import { CHROME } from '../props/chrome';

export const chrome: ArtStyle = {
  id: 'chrome',
  idiom: 'Travel poster and airbrushed advert, 1950s-60s',
  css: `.scn[data-look=chrome]{
  --s-paper:#f3eee2;--s-ink:#1a2a2d;--s-b:#fbf8f0;--s-b2:#e4ddcc;--s-rf:#0e7c77;--s-w:#2c3e40;--s-lit:#f0c35a;
  --s-tr:#7fa98a;--s-wa:#86bccb;--s-gd:#cfdcb8;--s-gd2:#e6d49a;--s-sp:#8a8f86;--s-ac:#e07a5f;--s-ac2:#e9b949;
  --s-mt:#b9c0c0;--s-smk:110,100,92;--s-hz:150,128,104;--s-mist:243,238,226;--s-sun:#f0c35a;
  --s-sky0:#bfe0dc;--s-sky0b:#f3eee2;--s-sky1:#b8a891;--s-sky1b:#e5d6bb;--s-sky2:#a8dbe0;--s-sky2b:#f6f1e4;
  --s-fog:92,72,56;--s-sv:#e07a5f;--s-hatch:#1a2a2d;--s-glow:240,195,90;--s-frame:#1a2a2d;
}

.scn[data-look=chrome]{--s-btxt:#fbf8f0}
.scn[data-look=chrome] .b,.scn[data-look=chrome] .rf,.scn[data-look=chrome] .b2{stroke:rgba(26,42,45,.55);stroke-width:calc(.6px*var(--sw))}
.scn[data-look=chrome] .k{stroke:#1a2a2d}
.scn .hill1{fill:#b4cda8}.scn .hill2{fill:#9cbe94}
.scn[data-look=chrome] .gd{fill:#c6d7ab;stroke:none}
.scn .sun{fill:var(--s-sun);stroke:none}
.scn .road{fill:#8a9496;stroke:none}.scn .edge{stroke:#f6f1e4;stroke-width:calc(.8px*var(--sw));fill:none}
.scn .dash{stroke:#f6f1e4;stroke-width:calc(.9px*var(--sw));stroke-dasharray:4 5;fill:none}
.scn .verge{fill:#7fa98a;stroke:none}.scn .lawn{fill:#93c08e;stroke:none}
.scn .r2{fill:#e07a5f;stroke:rgba(26,42,45,.55);stroke-width:calc(.6px*var(--sw))}
.scn .r3{fill:#e9b949;stroke:rgba(26,42,45,.55);stroke-width:calc(.6px*var(--sw))}
.scn .c0{fill:#e07a5f}.scn .c1{fill:#0e7c77}.scn .c2{fill:#e9b949}.scn .c3{fill:#5b8fb9}.scn .c4{fill:#f3eee2;stroke:#1a2a2d;stroke-width:.5px}
.scn .glass{fill:#cfe7ea;stroke:none}.scn .tyre{fill:#1a2a2d;stroke:none}
.scn .vn{fill:#fbf8f0;stroke:rgba(26,42,45,.6);stroke-width:calc(.6px*var(--sw))}.scn .vs{fill:#0e7c77}.scn .volts,.scn .volt{fill:#e9b949}
.scn .door{fill:#c9c2b0;stroke:rgba(26,42,45,.4);stroke-width:.5px}
.scn .oil{fill:#1d1a17;stroke:none}.scn .stra1{fill:#e3d3b0}.scn .stra2{fill:#cdb48a}
.scn .fd1{fill:#d9cf8f}.scn .fd2{fill:#b8cf96}.scn .fd3{fill:#cfd9a6}
.scn .cyc{fill:#0e7c77;opacity:.6}
.scn .trail{fill:none;stroke:rgba(255,255,255,.85);stroke-width:2.2;vector-effect:none!important}
.scn .cloud{fill:#fbf8f0;stroke:none;opacity:.92}

.scn[data-look=chrome] .scn-stage{border-radius:14px;border-color:rgba(26,42,45,.25)}`,
  defs: (p) => [0, 1, 2, 3].map((i) => flatFill(p, `h${i}`, 'rgba(20,40,45,.13)') + flatFill(p, `x${i}`, 'rgba(20,40,45,.22)')).join('') + glowDefs(p),
  props: CHROME,
  wash: (t) => [mix('#8fb58f', '#a7a27f', t), mix('#86bccb', '#9a9a86', t)],
};
