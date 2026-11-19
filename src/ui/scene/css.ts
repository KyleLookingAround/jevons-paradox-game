// The scene's own stylesheet, injected once. Page theme tokens (--ink, --bg-solid, --accent, --bad, --good, --rule,
// --display, --body, --numf) are read with fallbacks; everything scene-specific is a --s-* token set per look.
// Every animation is transform/opacity on small elements, paused off-screen, and removed under reduced motion.

import { allStyles } from './styles/index';

const BASE = `
.scn{position:relative;font-family:var(--body,Georgia,serif);color:var(--ink,#2a1f15);--sw:1;}
.scn.wide{--sw:1.35}
.scn-stage{position:relative;width:100%;aspect-ratio:3/2;overflow:hidden;background:var(--s-paper);isolation:isolate;
  border:1px solid var(--s-frame);contain:layout paint;-webkit-user-select:none;user-select:none;touch-action:manipulation}
.scn-world,.scn-l,.scn-sky,.scn-hz,.scn-fog,.scn-places,.scn-glow,.scn-extra{position:absolute;inset:0;width:100%;height:100%}
.scn-extra,.scn-plate,.scn-noise{pointer-events:none}
.scn-bw{position:absolute;inset:0;width:100%;height:100%}
.scn-noise{opacity:0}
.scn-extra{overflow:hidden}
.scn-legend{margin:2px 0 4px;text-align:center;font:italic 13px/1.3 var(--f-serif,Georgia,serif);letter-spacing:.06em;color:var(--muted,#6f5f4a);font-variant:small-caps}
.scn-l{display:block;overflow:hidden}
.scn-defs{position:absolute;width:0;height:0;overflow:hidden}
.scn-sky{background:linear-gradient(to bottom,var(--s-sky0),var(--s-sky0b) 52%)}
.scn-sky.smog{background:linear-gradient(to bottom,var(--s-sky1),var(--s-sky1b) 55%);opacity:0;transition:opacity 1.2s}
.scn-sky.fresh{background:linear-gradient(to bottom,var(--s-sky2),var(--s-sky2b) 58%);opacity:0;transition:opacity 3s ease}
.scn.steady .scn-sky.fresh{opacity:1}
.scn-glow{display:none;background:radial-gradient(70% 38% at 50% 58%,rgba(var(--s-glow),.55),rgba(var(--s-glow),0) 70%);opacity:0;transition:opacity 1.5s}
.scn-hz{pointer-events:none;transition:opacity 1.2s}
.scn-hz.mist{background:linear-gradient(to bottom,rgba(var(--s-mist),0) 14%,rgba(var(--s-mist),.5) 30%,rgba(var(--s-mist),.15) 42%,rgba(var(--s-mist),0) 50%)}
.scn-hz.mist.m2{background:linear-gradient(to bottom,rgba(var(--s-mist),0) 40%,rgba(var(--s-mist),.22) 50%,rgba(var(--s-mist),0) 64%)}
.scn-hz.smog{background:linear-gradient(to bottom,rgba(var(--s-hz),.95),rgba(var(--s-hz),.75) 45%,rgba(var(--s-hz),.35) 70%,rgba(var(--s-hz),0) 92%)}
.scn-hz.smog.h1{opacity:0}
.scn-hz.smog.h2{opacity:0;background:linear-gradient(to bottom,rgba(var(--s-hz),.7),rgba(var(--s-hz),.45) 50%,rgba(var(--s-hz),.15) 80%,rgba(var(--s-hz),0))}
.scn-hz.smog.h3{opacity:0;background:linear-gradient(to bottom,rgba(var(--s-hz),.55),rgba(var(--s-hz),.25) 40%,rgba(var(--s-hz),0) 70%)}
.scn-fog{pointer-events:none;opacity:0;background:radial-gradient(120% 90% at 30% 60%,rgba(var(--s-fog,var(--s-smk)),.92),rgba(var(--s-fog,var(--s-smk)),.7) 55%,rgba(var(--s-fog,var(--s-smk)),.35))}
.scn.crisis .scn-fog{animation:scn-fog 7s ease-in-out forwards}
@keyframes scn-fog{0%{opacity:0;transform:translateX(-30%)}25%{opacity:.88;transform:translateX(0)}70%{opacity:.7}100%{opacity:0;transform:translateX(12%)}}
.scn.halt .scn-world{filter:grayscale(.75) contrast(.92);transition:filter 2.5s}
.scn.halt *{animation-play-state:paused!important}
.scn.paused *{animation-play-state:paused!important}

/* --- drawing classes (every look styles these through its tokens) --- */
.scn svg *{vector-effect:non-scaling-stroke;stroke-linejoin:round;stroke-linecap:round}
.scn .b{fill:var(--s-b);stroke:var(--s-ink);stroke-width:calc(.9px*var(--sw))}
.scn .b2{fill:var(--s-b2);stroke:var(--s-ink);stroke-width:calc(.9px*var(--sw))}
.scn .rf{fill:var(--s-rf);stroke:var(--s-ink);stroke-width:calc(.9px*var(--sw))}
.scn .k{fill:none;stroke:var(--s-ink);stroke-width:calc(.8px*var(--sw))}
.scn .K{stroke-width:calc(1.25px*var(--sw))}
.scn .k2{stroke-width:calc(.55px*var(--sw));opacity:.8}
.scn .d{fill:var(--s-ink);stroke:none}
.scn .w{fill:var(--s-w);stroke:none}
.scn .lit{fill:var(--s-lit);stroke:none}
.scn .tr{fill:var(--s-tr);stroke:var(--s-ink);stroke-width:calc(.8px*var(--sw))}
.scn .tr2{stroke:var(--s-ac2)}
.scn .wa{fill:var(--s-wa);stroke:none}
.scn .wak{fill:none;stroke:var(--s-wa);stroke-width:calc(1.4px*var(--sw))}
.scn .gd{fill:var(--s-gd);stroke:var(--s-ink);stroke-width:calc(.6px*var(--sw))}
.scn .gd2{fill:var(--s-gd2)}
.scn .sp{fill:var(--s-sp);stroke:var(--s-ink);stroke-width:calc(.8px*var(--sw))}
.scn .ac{fill:var(--s-ac);stroke:var(--s-ink);stroke-width:calc(.6px*var(--sw))}
.scn .ak{fill:none;stroke:var(--s-ac2);stroke-width:calc(1.2px*var(--sw))}
.scn .mt{fill:var(--s-mt);stroke:var(--s-ink);stroke-width:calc(.7px*var(--sw))}
.scn .hz,.scn .hz2{stroke:none}
.scn .sl{fill:var(--s-b);stroke:var(--s-ink);stroke-width:calc(.6px*var(--sw))}
.scn .fur{stroke-width:calc(.6px*var(--sw));opacity:.55}
.scn .fld{fill:var(--s-tr);fill-opacity:.55;stroke:var(--s-ink);stroke-width:calc(.5px*var(--sw));stroke-opacity:.6}
.scn .fld2{fill:var(--s-gd2);fill-opacity:.9}
.scn .plm{fill:none;stroke:rgba(var(--s-smk),.28);stroke-width:4.5;stroke-linecap:round;vector-effect:none!important}
.scn .scf{stroke:var(--s-ink);stroke-width:calc(.7px*var(--sw));opacity:.85}
.scn .gl{stroke:none}
.scn .svf{fill:var(--s-sv);fill-opacity:.07;stroke:none}
.scn .svs{fill:none;stroke:var(--s-sv);stroke-width:calc(.8px*var(--sw));stroke-dasharray:3 3}
.scn .svk{fill:none;stroke:var(--s-ink);stroke-width:calc(1.2px*var(--sw))}
.scn .svfl{fill:var(--s-sv);stroke:none}

/* --- appearance: slots grow out of the ground; ghosts are faint dashed hints --- */
.scn .sl0{display:none}
.scn .sl0.on{display:inline}
.scn .gr{transform-box:fill-box;transform-origin:50% 100%}
.scn.live .sl0.on>.gr{animation:scn-rise .9s cubic-bezier(.2,.9,.3,1.15) both}
.scn .sl0.fd{display:inline;opacity:0;transition:opacity 2.2s cubic-bezier(.6,0,.9,.4)}
.scn .sl0.fd.on{opacity:1;transition:opacity .8s ease-out}
.scn.live .sl0.fd.on>.gr{animation:none}
@keyframes scn-rise{from{transform:scaleY(.05);opacity:0}to{transform:none;opacity:1}}
.scn .ghost{display:none;opacity:.22}
.scn .ghost.on{display:inline}
.scn .ghost *{fill:none!important;stroke:var(--s-ink)!important;stroke-dasharray:2 2.5;stroke-width:.7px!important}
.scn .ghost.avail{opacity:.42}
.scn .svy{display:none}
.scn .svy.on{display:inline}
.scn.live .svy.on .svfl{animation:scn-flag 2.4s ease-in-out infinite;transform-box:fill-box;transform-origin:0 50%}
@keyframes scn-flag{50%{transform:scaleX(.7)}}
.scn .scaf{display:none}
.scn .scaf.on{display:inline;animation:scn-scaf 2.6s ease forwards}
@keyframes scn-scaf{0%{opacity:0}15%{opacity:1}70%{opacity:1}100%{opacity:0}}
.scn.live .build>.gr{animation:scn-rise 1.8s .3s cubic-bezier(.2,.9,.3,1.05) both!important}
.scn.live .evolve>.gr{animation:scn-evolve 1.4s ease both}
@keyframes scn-evolve{0%{opacity:.2;transform:scaleY(.9)}60%{opacity:1}100%{transform:none}}

/* --- fx: smoke, spin, rock, blink, flow, drift, movers --- */
.scn .fx{display:none}
.scn .fx.on{display:inline}
.scn .smk circle{fill:rgba(var(--s-smk),var(--smk-a,.35));stroke:none;transform-box:fill-box;transform-origin:50% 50%}
.scn .smk.wht circle{fill:rgba(240,240,236,.55)}
.scn[data-look=terminal] .smk circle{fill:none;stroke:rgba(var(--s-smk),.55);stroke-width:.8px}
.scn[data-look=ledger] .smk circle{stroke:rgba(42,31,21,.35);stroke-width:.5px}
.scn .smk circle:nth-child(1){transform:translate(1px,-3px) scale(.7)}
.scn .smk circle:nth-child(2){transform:translate(5px,-10px) scale(1.1)}
.scn .smk circle:nth-child(3){transform:translate(11px,-18px) scale(1.6);opacity:.7}
.scn .smk circle:nth-child(4){transform:translate(19px,-25px) scale(2.1);opacity:.45}
.scn.live .smk.live circle{animation:scn-puff var(--smk-d,3.6s) linear infinite}
.scn.live .smk.live circle:nth-child(2){animation-delay:calc(var(--smk-d,3.6s)*-.25)}
.scn.live .smk.live circle:nth-child(3){animation-delay:calc(var(--smk-d,3.6s)*-.5)}
.scn.live .smk.live circle:nth-child(4){animation-delay:calc(var(--smk-d,3.6s)*-.75)}
@keyframes scn-puff{0%{transform:translate(0,0) scale(.4);opacity:0}12%{opacity:1}100%{transform:translate(24px,-30px) scale(2.5);opacity:0}}
.scn.pace0{--smk-d:4.6s}.scn.pace1{--smk-d:3.4s}.scn.pace2{--smk-d:2.5s}
.scn.live .spin>g{animation:scn-spin var(--spin-d,3s) linear infinite}
.scn.pace0 .spin>g{--spin-d:4.2s}.scn.pace2 .spin>g{--spin-d:1.8s}
@keyframes scn-spin{to{transform:rotate(360deg)}}
.scn.live .rock>g{animation:scn-rock var(--rock-d,2.8s) ease-in-out infinite alternate}
.scn.pace0 .rock>g{--rock-d:3.6s}.scn.pace2 .rock>g{--rock-d:1.7s}
@keyframes scn-rock{from{transform:rotate(-5deg)}to{transform:rotate(5deg)}}
.scn.live .blink>g{animation:scn-blink 1.6s steps(2,jump-none) infinite}
@keyframes scn-blink{50%{opacity:.15}}
.scn .flow path{fill:none;stroke:var(--s-lit);stroke-width:calc(1.4px*var(--sw));stroke-dasharray:2 14}
.scn.live .flow path{animation:scn-flow 2.2s linear infinite}
@keyframes scn-flow{to{stroke-dashoffset:-32}}
.scn.live .drift>g{animation:scn-drift 70s ease-in-out infinite alternate}
@keyframes scn-drift{from{transform:translateX(-28px)}to{transform:translateX(28px)}}
.scn .mv{transform:translate(var(--sx),var(--sy))}
.scn.live .mv{animation:scn-mv linear infinite}
@keyframes scn-mv{from{transform:translate(var(--x0),var(--y0))}to{transform:translate(var(--x1),var(--y1))}}
.scn .rx{transform-box:fill-box;transform:scaleX(var(--res,1));transition:transform 1.5s}
.scn .ry{transform-box:fill-box;transform-origin:50% 100%;transform:scaleY(var(--res,1));transition:transform 1.5s}
.scn .dx{transform-box:fill-box;transform:scaleX(var(--dep,0));transition:transform 1.5s}
.scn .ly{transform-box:fill-box;transform-origin:50% 100%;transform:scaleY(var(--pfc,0));transition:transform 1.5s}
.scn .starf{opacity:calc(1 - var(--light,0)*1.15 - var(--pf2,0))}
.scn .sunf{opacity:calc(1 - var(--pf2,0)*.85)}
.scn .rst{display:none}.scn .rst.on{display:inline}
.scn .stdy{display:none}.scn.steady .stdy{display:inline}
.scn .nosteady{display:inline}.scn.steady .nosteady{display:none}

/* --- places: tap targets over the picture --- */
.scn-places{pointer-events:none}
.scn-place{position:absolute;pointer-events:auto;margin:0;padding:0;border:0;background:transparent;cursor:pointer;
  border-radius:4px;-webkit-tap-highlight-color:transparent}
.scn-place:focus-visible{outline:2px solid var(--focus,var(--s-sv));outline-offset:1px}
.scn-place.sel{outline:1.5px dashed var(--s-sv);outline-offset:1px}
.scn-pin{position:absolute;left:50%;bottom:4%;width:20px;height:20px;margin-left:-10px;border-radius:50%;display:none;
  align-items:center;justify-content:center;font:700 15px/1 var(--numf,system-ui);background:var(--s-sv);color:var(--s-paper);
  box-shadow:0 0 0 2px var(--s-paper)}
.scn-place.avail .scn-pin{display:flex}
.scn.live .scn-place.avail .scn-pin::after{content:'';position:absolute;inset:-5px;border-radius:50%;border:1.5px solid var(--s-sv);
  animation:scn-ping 2.2s ease-out infinite}
@keyframes scn-ping{0%{transform:scale(.6);opacity:.9}100%{transform:scale(1.5);opacity:0}}
.scn-banner{position:absolute;left:0;right:0;top:38%;transform:translateY(-50%);text-align:center;pointer-events:none;
  font-family:var(--display,Georgia,serif);font-weight:700;font-size:clamp(15px,4.2vw,26px);color:var(--s-btxt,var(--s-paper));
  text-shadow:0 1px 0 rgba(0,0,0,.25);opacity:0;transition:opacity 1s;padding:8px 12px}
.scn-banner span{display:inline-block;padding:6px 14px;background:rgba(var(--s-fog,var(--s-smk)),.86);border-top:1px solid currentColor;border-bottom:1px solid currentColor}
.scn-banner.on{opacity:1}
.scn-toast{position:absolute;left:8px;top:8px;padding:3px 8px;font:600 12px/1.3 var(--labelf,var(--body,system-ui));letter-spacing:.04em;
  background:var(--s-paper);color:var(--s-ink);border:1px solid var(--s-ink);opacity:0;transform:translateY(-4px);transition:opacity .4s,transform .4s;pointer-events:none}
.scn-toast.on{opacity:.95;transform:none}
.scn.crisis.rm .scn-fog{opacity:.62}

/* --- the card under the picture --- */
.scn-card{min-height:44px;padding:6px 2px 0;font-size:14px;line-height:1.35}
.scn-cap{color:var(--muted,#6f5f4a)}
.scn-sel{display:grid;grid-template-columns:1fr auto;gap:2px 10px;align-items:baseline}
.scn-sel[hidden]{display:none}
.scn-sel-n{font-family:var(--display,inherit);font-weight:700;font-size:16px;color:var(--ink,inherit)}
.scn-sel-x{grid-row:1;grid-column:2;border:0;background:transparent;color:var(--muted,#6f5f4a);font-size:20px;line-height:1;padding:4px 6px;cursor:pointer;min-width:32px;min-height:32px}
.scn-sel-m{grid-column:1/-1;font-family:var(--numf,inherit);font-variant-numeric:tabular-nums;color:var(--muted,#6f5f4a);display:flex;gap:10px;align-items:center;flex-wrap:wrap}
.scn-bar{position:relative;display:inline-block;width:80px;height:5px;background:var(--track,rgba(0,0,0,.1))}
.scn-bar i{position:absolute;inset:0 auto 0 0;background:var(--accent,#24473a)}
.scn-sel-b{grid-column:1/-1;color:var(--muted,#6f5f4a);font-style:italic;font-size:13px}
.scn-found{grid-column:1/-1;position:relative;overflow:hidden;margin-top:6px;min-height:44px;display:flex;justify-content:space-between;align-items:center;
  padding:0 14px;border:1px solid var(--ink,#2a1f15);background:var(--ink,#2a1f15);color:var(--bg-solid,#efe6d0);
  border-radius:var(--btn-radius,2px);font:inherit;font-weight:700;cursor:pointer}
.scn-found[aria-disabled=true]{background:transparent;color:var(--ink,#2a1f15);cursor:default}
.scn-found .scn-ff{position:absolute;inset:0 auto 0 0;background:var(--track,rgba(0,0,0,.08));pointer-events:none}
.scn-found span{position:relative}
.vh-scn{position:absolute!important;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}
.scn.rm *{animation:none!important;transition:none!important}
`;

/** Inject the base CSS and every registered style once; styles registered later are appended on demand. */
const done = new WeakMap<Document, Set<string>>();
export function injectSceneCss(doc: Document = document): void {
  let set = done.get(doc);
  if (!set) {
    set = new Set();
    done.set(doc, set);
    if (!doc.getElementById('scn-css')) {
      const el = doc.createElement('style');
      el.id = 'scn-css';
      el.textContent = BASE;
      doc.head.appendChild(el);
    }
  }
  for (const st of allStyles()) {
    if (set.has(st.id)) continue;
    set.add(st.id);
    const id = 'scn-css-' + st.id;
    if (doc.getElementById(id)) continue;
    const el = doc.createElement('style');
    el.id = id;
    el.textContent = st.css;
    doc.head.appendChild(el);
  }
}

/** The whole stylesheet as one string (base + every style registered so far), for hosts that prefer to ship it. */
export function sceneCss(): string { return BASE + allStyles().map((s) => s.css).join('\n'); }
export const SCENE_CSS: string = sceneCss();
