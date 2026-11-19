// Code / the end of the Attention Age: a night megacity in rain. Dense verticals, magenta / cyan / amber on near
// black, wet reflections, invented signage. Works on its own dark ground whatever the page theme says.
// Cost control: neon is tube + halo strokes (no filters); rain is two tiled layers moved by transform (composited);
// flicker is opacity steps on a handful of elements; all of it stops under reduced motion and at Steady State.
import type { ArtStyle } from '../style';
import { lineHatch, crossHatch, glowDefs } from '../style';
import { CYBERPUNK } from '../props/cyberpunk';
import { rng, hash, f } from '../svg';

const RAIN_TILE = (op: number, len: number) => {
  const r = rng(hash('rain' + len));
  let d = '';
  for (let i = 0; i < 9; i++) { const x = r() * 60, y = r() * 90; d += `M${f(x)} ${f(y)}l-2 ${len}`; }
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='60' height='90'><path d='${d}' stroke='rgba(190,205,255,${op})' stroke-width='1' fill='none'/></svg>`;
  return `url("data:image/svg+xml,${encodeURIComponent(svg).replace(/'/g, '%27')}")`;
};

function noise(): string {
  const r = rng(hash('noise'));
  let m = '', c = '';
  for (let i = 0; i < 70; i++) {
    const y = r() * 400, x = r() * 600, w = 6 + r() * 60;
    (r() < 0.5 ? (m += `M${f(x)} ${f(y)}h${f(w)}`) : (c += `M${f(x)} ${f(y)}h${f(w)}`));
  }
  return `<path d="${m}" stroke="#ff4fd8" stroke-width="1" opacity=".5"/><path d="${c}" stroke="#3ef2ff" stroke-width="1" opacity=".45"/>` +
    "";
}

export const cyberpunk: ArtStyle = {
  id: 'cyberpunk',
  idiom: 'Cyberpunk night city: neon, rain and wet reflections',
  defs: (p) => {
    let d = '';
    ([[0, 3], [1, 4], [2, 5], [3, 6.5]] as const).forEach(([i, sp]) => {
      d += lineHatch(p, `h${i}`, sp, sp * 0.2, 90, 0.35, '#3ef2ff') + crossHatch(p, `x${i}`, sp, sp * 0.18, 0.3, '#ff4fd8');
    });
    // Street-level pipework that grows with maintenance debt.
    d += `<pattern id="${p}pipes" patternUnits="userSpaceOnUse" width="46" height="30" patternTransform="rotate(0)">` +
      `<path d="M2 30V4H18V30M8 30V12H40V30M28 0V12M44 30V18H24" fill="none" stroke="#24203a" stroke-width="2.4"/>` +
      `<path d="M2 30V4H18V30M8 30V12H40V30" fill="none" stroke="#3a3452" stroke-width=".6"/>` +
      `<circle cx="18" cy="16" r="1.6" fill="#a0562a"/><circle cx="40" cy="22" r="1.2" fill="#ff4fd8" opacity=".6"/></pattern>`;
    // Haze between the tower rows, the city's glow on the cloud base, the wet street's sheen, a lamplit room.
    d += `<linearGradient id="${p}cbhz" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#4a1a5c" stop-opacity="0"/><stop offset=".75" stop-color="#5a1f66" stop-opacity=".42"/><stop offset="1" stop-color="#6a2470" stop-opacity=".5"/></linearGradient>` +
      `<radialGradient id="${p}cbcg" cx=".5" cy="1" r=".8" fx=".5" fy="1"><stop offset="0" stop-color="#ff4fd8" stop-opacity=".34"/><stop offset=".5" stop-color="#9a2a9a" stop-opacity=".16"/><stop offset="1" stop-color="#3b1150" stop-opacity="0"/></radialGradient>` +
      `<linearGradient id="${p}cbwg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#7a2a7a" stop-opacity=".38"/><stop offset=".4" stop-color="#3a1a4a" stop-opacity=".16"/><stop offset="1" stop-color="#09080f" stop-opacity="0"/></linearGradient>` +
      `<linearGradient id="${p}vwarm" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffe2a0"/><stop offset=".6" stop-color="#ffb85a"/><stop offset="1" stop-color="#e57f2e"/></linearGradient>`;
    return d + glowDefs(p, '#3ef2ff');
  },
  props: CYBERPUNK,
  weather: { hz: [0.5, 0.36, 0.22], noise: 0.5 },
  noise: noise(),
  layers: '<div class="rain r1"></div><div class="rain r2"></div>',
  // A lettered tag in the corner, the way the city letters everything: a neon tube title over its halo, a bar.
  plate: (c) => {
    const t = (c.caption || c.name).toUpperCase();
    return `<text x="22" y="26" class="cbpl cbplh">${t}</text><text x="22" y="26" class="cbpl">${t}</text>` +
      '<path d="M22 32h46" stroke="#ff4fd8" stroke-width="1.6" opacity=".85"/><path d="M72 32h6" stroke="#3ef2ff" stroke-width="1.6" opacity=".85"/>';
  },
  css: `
.scn[data-look=cyberpunk]{
  --s-paper:#07060d;--s-ink:#2b2450;--s-b:#15122a;--s-b2:#1c1835;--s-rf:#100d20;--s-w:#0b0a16;--s-lit:#8f8cff;
  --s-tr:#123a2a;--s-wa:#0d1b2a;--s-gd:#0a0912;--s-gd2:#0e0c18;--s-sp:#241f3a;--s-ac:#ff4fd8;--s-ac2:#3ef2ff;--s-mt:#2c2840;
  --s-smk:110,60,130;--s-hz:96,22,92;--s-mist:58,24,84;--s-fog:24,6,28;--s-sun:#ffb347;
  --s-sky0:#04030c;--s-sky0b:#3b1150;--s-sky1:#1d0a26;--s-sky1b:#7a1f62;--s-sky2:#02030b;--s-sky2b:#0c1636;
  --s-sv:#3ef2ff;--s-hatch:#3a3550;--s-glow:255,79,216;--s-frame:#2b2450;--s-btxt:#3ef2ff;
}
.scn[data-look=cyberpunk] .scn-stage{border-color:#2b2450;box-shadow:0 0 0 1px #07060d,0 0 18px -6px rgba(255,79,216,.45)}
.scn[data-look=cyberpunk] .b{fill:#15122a;stroke:#2b2450;stroke-width:calc(.6px*var(--sw))}
.scn[data-look=cyberpunk] .b2{fill:#1c1835;stroke:none}
.scn[data-look=cyberpunk] .band-far .b{fill:#110e21;stroke:none}
.scn[data-look=cyberpunk] .k{stroke:#3a3356}
.scn[data-look=cyberpunk] .mt{fill:#2c2840;stroke:#3a3356}
.scn[data-look=cyberpunk] .ghost *{stroke:#3ef2ff!important}
.scn[data-look=cyberpunk] .svk{stroke:#3ef2ff}
.scn[data-look=cyberpunk] .smk i{background:rgba(160,90,190,var(--smk-a,.3))}
.scn[data-look=cyberpunk] .smk.wht i{background:rgba(200,170,230,.22)}
.scn .nh{fill:none;stroke-width:calc(4.6px*var(--sw));opacity:.26}
.scn .nt{fill:none;stroke-width:calc(1.3px*var(--sw))}
.scn .nm{stroke:#ff4fd8}.scn .nc{stroke:#3ef2ff}.scn .na{stroke:#ffb347}.scn .nr{stroke:#ff3b5c}.scn .ng{stroke:#4dff9a}.scn .nv{stroke:#9d7dff}
.scn .dead{stroke:#39334f}.scn .nh.dead{opacity:0}
.scn .sg{font-family:var(--f-grot,'Arial Narrow',Arial,sans-serif);font-weight:800;letter-spacing:.08em;stroke:none!important}
.scn .sgh{font-family:var(--f-grot,'Arial Narrow',Arial,sans-serif);font-weight:800;letter-spacing:.08em;fill:none;stroke-width:3px;opacity:.32}
.scn .sg.nm{fill:#ff9be9}.scn .sg.nc{fill:#a6f9ff}.scn .sg.na{fill:#ffd08a}.scn .sg.ng{fill:#a9ffcb}.scn .sg.nv{fill:#c9b8ff}.scn .sg.nr{fill:#ff8a9c}
.scn .sg.dead{fill:#3a3450}.scn .sgh.dead{opacity:0}
.scn .rfl{stroke:none}.scn .rfl.nm{fill:#ff4fd8}.scn .rfl.nc{fill:#3ef2ff}.scn .rfl.na{fill:#ffb347}.scn .rfl.nv{fill:#9d7dff}
.scn .cold{fill:#8f8cff}.scn .warm{fill:#ffc46b}.scn .who{fill:#3a1d0a;stroke:none}.scn .wk{fill:none;stroke:#3a1d0a;stroke-width:1px}
.scn .redl{fill:#ff3b5c}.scn .cyl{fill:#3ef2ff}.scn .na-dot{fill:#ffb347}
.scn .shop{fill:#2a7188}.scn .scr{fill:#3ef2ff;opacity:.75}.scn .scr0{fill:#1b1733}
.scn .conc{fill:#24212f;stroke:#37334a;stroke-width:calc(.6px*var(--sw))}
.scn .scaf2{fill:none;stroke:#b07a2e;stroke-width:calc(.75px*var(--sw))}
.scn .glassc{fill:rgba(62,242,255,.16);stroke:#3ef2ff;stroke-width:calc(.6px*var(--sw))}
.scn .glk{fill:none;stroke:rgba(62,242,255,.45);stroke-width:.5px}
.scn .holo{fill:rgba(62,242,255,.11)}.scn .holos{fill:none;stroke:rgba(62,242,255,.2);stroke-width:.5px}
.scn .nmf{fill:#ff9be9}.scn .trailr{fill:none;stroke:rgba(255,59,92,.55);stroke-width:1.2px}
.scn .pipe{fill:none;stroke:#3b3553;stroke-width:calc(1.6px*var(--sw))}.scn .rust{fill:#a0562a}
.scn .pipeb{fill:none;stroke:#09080f;stroke-width:calc(3.6px*var(--sw))}.scn .pipeh{fill:none;stroke:#6a5f8e;stroke-width:.6px}.scn .rustf{fill:#7a3f22}
.scn .cab{fill:none;stroke:#0f0d1c;stroke-width:calc(1px*var(--sw))}
.scn[data-look=cyberpunk] .cab{stroke:#3b3260}
.scn .jbox{fill:#231d3a;stroke:#4a3f72;stroke-width:.6px}.scn .jled{fill:#4dff9a}.scn .trayb{fill:#1a1530;stroke:#3a3160;stroke-width:.6px}
.scn .flow path.dfl{stroke:#7ff6ff;stroke-dasharray:2 10;stroke-width:calc(1.3px*var(--sw))}
.scn[data-look=cyberpunk].stress .flow path.dfl{stroke:#ff3b5c}
.scn .coldscr{fill:#3ef2ff;opacity:.16}
.scn .clearc{fill:#0f2a20}.scn .clearl{fill:none;stroke:#4dff9a;stroke-width:1px}
.scn .gdc{fill:#0f2a20}.scn .treec{fill:#164c32;stroke:#4dff9a;stroke-width:.6px}.scn .pool2{fill:rgba(77,255,154,.07)}
.scn .solc{fill:#16244a;stroke:#3ef2ff;stroke-width:.5px}
.scn .wet{fill:#09080f}.scn .cbfar{fill:#0c0a18}.scn .cbfar2{fill:#13102a}.scn .cbwin{fill:#5a4f9e;opacity:.55}
.scn .cbwin2{fill:#ff4fd8;opacity:.5}.scn .cbwin3{fill:#ffb347;opacity:.45}
.scn .star2{fill:#dfe6ff}
.scn .cblow{fill:#0d0b19}
.scn .pipes{stroke:none}
.scn[data-look=cyberpunk] .rain{position:absolute;left:-12%;width:124%;top:-90px;height:calc(100% + 90px);background-repeat:repeat;will-change:transform;transform:translate3d(0,0,0)}
.scn[data-look=cyberpunk] .rain.r1{background-image:${RAIN_TILE(0.28, 14)};background-size:60px 90px;opacity:.9}
.scn[data-look=cyberpunk] .rain.r2{background-image:${RAIN_TILE(0.16, 9)};background-size:40px 60px;opacity:.8}
.scn.live[data-look=cyberpunk] .rain.r1{animation:cb-rain1 .55s linear infinite}
.scn.live[data-look=cyberpunk] .rain.r2{animation:cb-rain2 .8s linear infinite}
@keyframes cb-rain1{from{transform:translate3d(0,0,0)}to{transform:translate3d(-12px,90px,0)}}
@keyframes cb-rain2{from{transform:translate3d(0,0,0)}to{transform:translate3d(-8px,60px,0)}}
.scn[data-look=cyberpunk].lowd .rain.r2,.scn[data-look=cyberpunk].steady .rain,.scn[data-look=cyberpunk].halt .rain{display:none}
.scn.live[data-look=cyberpunk] .blink.on>b{animation:cb-flick 2.6s steps(1,end) infinite}
@keyframes cb-flick{0%{opacity:1}43%{opacity:.25}46%{opacity:1}71%{opacity:.4}73%{opacity:1}}
.scn[data-look=cyberpunk].steady .blink>b{animation:none}
.scn .cbarc{fill:#2a1842}.scn .cbhill{fill:#241536}.scn .cbsea{fill:#1a1030}.scn .cbfar0{fill:#1d1233}.scn .cbwin0{fill:#a77fd0;opacity:.35}
.scn .beam{fill:rgba(160,200,255,.05)}
.scn .pier{fill:#0d0b19;stroke:#2b2450;stroke-width:.5px}.scn .deck{fill:#120f22;stroke:#2b2450;stroke-width:.6px}.scn .trn{fill:#1d1934;stroke:#4a4373;stroke-width:.6px}
.scn .rim{fill:none;stroke:rgba(255,79,216,.35);stroke-width:1px}
.scn .rp{fill:none;stroke-width:1.2px;opacity:.5}.scn .rp.nm{stroke:#ff4fd8}.scn .rp.nc{stroke:#3ef2ff}.scn .rp.na{stroke:#ffb347}.scn .rp.nv{stroke:#9d7dff}
.scn .rfb{fill:#8f8cff;opacity:.05}
.scn .oldb{fill:#1b1530;stroke:#2f2752;stroke-width:.6px}.scn .oldb2{fill:#130f24}.scn .oldl{fill:#2a2348}.scn .oldw{fill:#09080f;stroke:#2f2752;stroke-width:.6px}
.scn .sil{fill:#2a1305;stroke:none}.scn .vk{fill:none;stroke:#2a1305;stroke-width:1.1px}
.scn .vspill{fill:#ff9a3c;opacity:.07}.scn .vhalo{fill:#ffb347;opacity:.22}
.scn .vcone{fill:#fff4c8;opacity:.75}.scn .vscr{fill:#9fe8ff;opacity:.85}.scn .vbook{fill:#fff4d8}.scn .vlamp{fill:#fff6d0}
.scn .vleaf{fill:none;stroke:#2a3a12;stroke-width:1.3px}.scn .vgtr{fill:#5a2a0a}.scn .vpic{fill:#c76a2a}.scn .vcur{fill:#b4501e;opacity:.85}.scn .vpaper{fill:#fff8e8}
.scn .vbar{fill:none;stroke:#3a1d0a;stroke-width:1px}.scn .vsill{fill:#2f2752}
.scn .wlk{fill:none;stroke:#0d0b16;stroke-width:1.2px}.scn .wlb{fill:#0d0b16}
.scn .umb{fill-opacity:.35}.scn .umb.nm{fill:#ff4fd8}.scn .umb.nc{fill:#3ef2ff}.scn .umb.na{fill:#ffb347}.scn .umb.nv{fill:#9d7dff}
.scn .pud{fill:#ff6fe0;opacity:.09}.scn .lpool{fill:#3ef2ff;opacity:.13}
.scn .cbpl{font:700 11px/1 var(--f-mono,ui-monospace,monospace);letter-spacing:.18em;fill:#c8fbff}
.scn .cbplh{fill:none;stroke:#3ef2ff;stroke-width:3px;stroke-opacity:.28;vector-effect:none}
.scn .emgm{display:none}.scn .emr{fill:#ff2a3a}.scn .emp{fill:#ff2a3a;opacity:.1}
.scn[data-look=cyberpunk].stress .emgm,.scn[data-look=cyberpunk].halt .emgm{display:inline}
/* Under strain the grid sheds load: towers' machine light goes out block by block, in turn; signs fail. */
.scn.live[data-look=cyberpunk].stress .band-mid .ov{animation:cb-shed 12s steps(1,end) infinite}
.scn[data-look=cyberpunk].stress .band-mid .ov:nth-child(3n+1){animation-delay:-4s}
.scn[data-look=cyberpunk].stress .band-mid .ov:nth-child(3n+2){animation-delay:-8s}
@keyframes cb-shed{0%{opacity:1}30%{opacity:.06}52%{opacity:1}}
.scn[data-look=cyberpunk].stress .band-mid .ov:nth-child(5n){opacity:.06}
.scn[data-look=cyberpunk].stress .band-near .sg.nv,.scn[data-look=cyberpunk].stress .band-near .nt.nv{fill:#3a3450;stroke:#39334f}
.scn[data-look=cyberpunk].stress .nh.nv{opacity:0}
/* A Reckoning here is a blackout: the machine light gone, neon dead, only the emergency red and any warm room. */
.scn[data-look=cyberpunk].halt .scn-world{filter:saturate(.55) brightness(.85)}
.scn[data-look=cyberpunk].halt .ov,.scn[data-look=cyberpunk].halt .cbwin,.scn[data-look=cyberpunk].halt .cbwin2,.scn[data-look=cyberpunk].halt .cbwin3{opacity:.05}
.scn[data-look=cyberpunk].halt .nh{opacity:0}.scn[data-look=cyberpunk].halt .nt{stroke:#3a3356}.scn[data-look=cyberpunk].halt .sg{fill:#3a3450}
.scn[data-look=cyberpunk] .delgap{display:inline}.scn[data-look=cyberpunk].lv-deletion .delgap{display:none}
.scn[data-look=cyberpunk] .delstars{display:none}.scn[data-look=cyberpunk].lv-deletion .delstars{display:inline}
`,
};
