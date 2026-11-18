// Agentic (v1 Code look, kept for generic scenes under the pale page look): crisp 2020s diagram.
import type { ArtStyle } from '../style';
import { lineHatch, glowDefs } from '../style';
import { AGENTIC } from '../props/agentic';

export const agentic: ArtStyle = {
  id: 'agentic',
  idiom: 'Developer-tool diagram, 2020s',
  css: `.scn[data-look=agentic]{
  --s-paper:#f2f1ed;--s-ink:#18191b;--s-b:#ffffff;--s-b2:#f1efe9;--s-rf:#e6e3da;--s-w:#d6d3ca;--s-lit:#1a7f37;
  --s-tr:#d7e8d5;--s-wa:#dbe7f7;--s-gd:#ebe9e2;--s-gd2:#e2dfd5;--s-sp:#c9c6bc;--s-ac:#e0592a;--s-ac2:#1a7f37;
  --s-mt:#b9b6ac;--s-smk:140,140,150;--s-hz:150,148,160;--s-mist:242,241,237;--s-sun:#e0592a;
  --s-sky0:#f7f6f2;--s-sky0b:#efeee9;--s-sky1:#cfcdd2;--s-sky1b:#e4e2e3;--s-sky2:#f7f9f6;--s-sky2b:#eef4ee;
  --s-fog:38,38,44;--s-sv:#e0592a;--s-hatch:#18191b;--s-glow:224,89,42;--s-frame:#dddbd3;
}

.scn[data-look=agentic]{--s-btxt:#ffffff}
.scn .cl{fill:none;stroke:#c3c0b6;stroke-width:calc(1.1px*var(--sw))}
.scn .cl2{fill:none;stroke:#dad7ce;stroke-width:calc(1px*var(--sw))}
.scn .dg{fill:#1a7f37;stroke:none}.scn .dr{fill:#cf222e;stroke:none}.scn .dgf{fill:#2da44e}.scn .blu{fill:#3474d4}
.scn .aband{fill:#f6f5f1;stroke:#9a978e;stroke-width:.8px;stroke-dasharray:2 2}
.scn .scf2{stroke:#8a877e}
.scn .note{fill:#f3dd6d;stroke:#b9a43b;stroke-width:.5px}
.scn .tangle{stroke:#6e6b64}.scn .dead{stroke:#a3a097}
.scn .clear{fill:none;stroke:#1a7f37;stroke-width:1px;stroke-dasharray:3 2}
.scn .okk{fill:none;stroke:#1a7f37;stroke-width:1.4px}
.scn .eye{fill:#fff}
.scn .bub{stroke:#fff;stroke-width:1.4px}
.scn .far{stroke:#c9c6bc!important;fill:#f7f6f2!important}
.scn .floorp{fill:#ecebe5;stroke:none}.scn .floorl{fill:none;stroke:#dcdad2;stroke-width:.6px}
.scn .debt{fill:#8d8a82;opacity:.28}
.scn .rsun{transform-box:fill-box;transform-origin:50% 50%;transform:scale(calc(.35 + var(--res,1)*.65));transition:transform 1.5s}
.scn .asun{fill:#e0592a;stroke:none;opacity:.9}
.scn[data-look=agentic] .gd{fill:#ebe9e2;stroke:none}

.scn[data-look=agentic] .scn-stage{border-radius:6px}`,
  defs: (p) => ([[0, 3], [1, 4], [2, 5], [3, 6.5]] as const).map(([i, sp]) => lineHatch(p, `h${i}`, sp, sp * 0.14, 45, 0.28) + lineHatch(p, `x${i}`, sp * 0.7, sp * 0.16, 45, 0.4)).join('') + glowDefs(p),
  props: AGENTIC,
};
