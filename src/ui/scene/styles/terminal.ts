// Compute / the Attention Age: vector display and early CAD.
import type { ArtStyle } from '../style';
import { lineHatch, glowDefs } from '../style';
import { TERMINAL } from '../props/terminal';

export const terminal: ArtStyle = {
  id: 'terminal',
  idiom: 'Vector display, early CAD, 1980s',
  css: `.scn[data-look=terminal]{
  --s-paper:#070b08;--s-ink:#9ff08f;--s-b:#070b08;--s-b2:#0b140d;--s-rf:#0b140d;--s-w:#16301a;--s-lit:#e9b44a;
  --s-tr:#0b140d;--s-wa:#071618;--s-gd:#08100a;--s-gd2:#0b160d;--s-sp:#102016;--s-ac:#e9b44a;--s-ac2:#5fd0e0;
  --s-mt:#5c9a55;--s-smk:120,160,120;--s-hz:150,90,30;--s-mist:7,11,8;--s-sun:#e9b44a;
  --s-sky0:#040705;--s-sky0b:#0a1a0e;--s-sky1:#1a0d04;--s-sky1b:#4a2a0c;--s-sky2:#030806;--s-sky2b:#0c2a22;
  --s-fog:70,24,6;--s-sv:#e9b44a;--s-hatch:#5c9a55;--s-glow:233,180,74;--s-frame:#3d6b37;
}

.scn[data-look=terminal]{--s-btxt:#9ff08f}
.scn .tlab{font-family:var(--f-mono,monospace);font-size:7px;fill:#e9b44a;letter-spacing:.04em}
.scn .thud{font-family:var(--f-mono,monospace);font-size:9px;fill:#7fd474;letter-spacing:.06em}
.scn .thud.dimt{fill:#3f6e3a}
.scn .iso{stroke:#3f7a39!important}
.scn[data-look=terminal] .b,.scn[data-look=terminal] .rf,.scn[data-look=terminal] .b2{fill:#070b08;stroke:#7fd474;stroke-width:calc(.9px*var(--sw))}
.scn[data-look=terminal] .band-far .b,.scn[data-look=terminal] .band-far .rf{stroke:#4f8a48}
.scn[data-look=terminal] .k{stroke:#7fd474}
.scn[data-look=terminal] .band-far .k{stroke:#4f8a48}
.scn[data-look=terminal] .w{fill:none;stroke:#2f5a2b;stroke-width:.6px}
.scn[data-look=terminal] .wa{fill:rgba(95,208,224,.08);stroke:#5fd0e0;stroke-width:.7px}
.scn[data-look=terminal] .wl{stroke:#5fd0e0}
.scn[data-look=terminal] .gd{fill:#050906;stroke:none}
.scn[data-look=terminal] .tr{fill:none;stroke:#5c9a55}
.scn[data-look=terminal] .ac{fill:#e9b44a;stroke:none}
.scn[data-look=terminal] .scn-stage::after{content:'';position:absolute;inset:0;pointer-events:none;
  background:repeating-linear-gradient(to bottom,rgba(0,0,0,0) 0 2px,rgba(0,0,0,.22) 2px 3px)}
.scn .cy{fill:#5fd0e0;stroke:none}
.scn .grid{fill:none;stroke:rgba(127,212,116,.13);stroke-width:.6px}
.scn .hzn{fill:none;stroke:#7fd474;stroke-width:1.2px;opacity:.7}
.scn .dim{opacity:.45}
.scn .lnk{stroke:rgba(127,212,116,.28)!important;stroke-width:.7px!important;fill:none}
`,
  defs: (p) => ([[0, 3], [1, 4], [2, 5.5], [3, 7]] as const).map(([i, sp]) => lineHatch(p, `h${i}`, sp, sp * 0.18, 0, 0.5) + lineHatch(p, `x${i}`, sp * 0.8, sp * 0.18, 0, 0.75)).join('') + glowDefs(p),
  props: TERMINAL,
  plate: (c) =>
    // HUD: corner brackets and text-mode headers, the way a vector display framed its picture.
    '<path d="M8 22V8H22M578 8H592V22M592 378V392H578M22 392H8V378" fill="none" stroke="#7fd474" stroke-width="1.2"/>' +
    `<text x="28" y="20" class="thud">${(c.name || 'COMPUTE').toUpperCase()} // ${c.caption || 'MAP'}</text>` +
    '<text x="572" y="20" text-anchor="end" class="thud">VEC-DISPLAY  F1:HELP</text>' +
    '<text x="28" y="388" class="thud dimt">X 000.0  Y 000.0  Z 1:1</text>',
};
