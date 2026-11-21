// The scene's own stylesheet, injected once. Page theme tokens (--ink, --bg-solid, --accent, --bad, --good, --rule,
// --display, --body, --numf) are read with fallbacks; everything scene-specific is a --s-* token set per look.
// Every animation is transform/opacity on small elements, paused off-screen, and removed under reduced motion.

import { allStyles } from './styles/index';
import { FRAME_CSS } from './frame/ministry';
import { PRYCE_CSS } from './props/pryce';

const BASE = `
.scn{position:relative;font-family:var(--body,Georgia,serif);color:var(--ink,#2a1f15);--sw:1;}
.scn.wide{--sw:1.35}
.scn-stage{position:relative;width:100%;aspect-ratio:3/2;overflow:hidden;background:var(--s-paper);isolation:isolate;
  border:1px solid var(--s-frame);contain:layout paint;-webkit-user-select:none;user-select:none;touch-action:manipulation}
.scn-world,.scn-l,.scn-sky,.scn-hz,.scn-fog,.scn-places,.scn-glow,.scn-extra{position:absolute;inset:0;width:100%;height:100%}
.scn-extra,.scn-plate,.scn-noise{pointer-events:none}
.scn-stage>.scn-world:not(.act){display:none}
.scn-stage>.scn-places:not(.act){display:none}
.scn-bw{position:absolute;inset:0;width:100%;height:100%}
.scn-noise{opacity:0}
${/* The signal noise is a dense SVG: kept on its own layer so its opacity (which follows pressure) never repaints it. */ ''}
.scn[data-look=cyberpunk] .scn-noise{will-change:opacity}
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
${/* Settled: a held wash (the style's --s-held), never the frozen grey of a Reckoning. */ ''}
.scn-held{position:absolute;inset:0;pointer-events:none;opacity:0;transition:opacity 3s;background:linear-gradient(to bottom,rgba(var(--s-held,236,226,190),.0),rgba(var(--s-held,236,226,190),.16) 45%,rgba(var(--s-held,236,226,190),.1));mix-blend-mode:normal}
.scn[data-look=gaslight]{--s-held:246,206,140}.scn[data-look=chrome]{--s-held:214,236,226}.scn[data-look=terminal]{--s-held:110,210,130}.scn[data-look=cyberpunk]{--s-held:120,190,255}
${/* Clear skies, before Steady State: the weather has gone (each style's sky2 fades in with clearProgress). The night
   city shows its first stars and the rain thins. */ ''}
.scn[data-look=cyberpunk].clear svg .stdy{display:inline;opacity:.55}
.scn[data-look=cyberpunk].clear .rain.r2,.scn[data-look=cyberpunk].settled .rain{display:none}
.scn[data-look=cyberpunk].settled svg .stdy{display:inline}
.scn.settled .smk.live i{animation-duration:8s!important}
.scn.settled .smk i{background:rgba(var(--s-smk),.16)!important}
.scn.live.settled .spin.on>b{animation-duration:9s}.scn.live.settled .rock.on>b{animation-duration:6s}
.scn.settled .blink.on>b{animation:none}
${/* One-off moments: a flash layer (opacity only, composited). */ ''}
.scn-flash{position:absolute;inset:0;pointer-events:none;opacity:0}
.scn-flash.on.fl-decade{background:radial-gradient(90% 70% at 50% 35%,rgba(255,250,225,.55),rgba(255,250,225,0) 70%);animation:scn-fl 2.6s ease-out forwards}
.scn-flash.on.fl-stage{background:radial-gradient(80% 60% at 50% 70%,rgba(255,255,240,.4),rgba(255,255,240,0) 70%);animation:scn-fl 1.6s ease-out forwards}
.scn-flash.on.fl-clear{background:linear-gradient(to bottom,rgba(255,255,255,.5),rgba(255,255,255,0) 60%);animation:scn-fl 3.2s ease-out forwards}
.scn-flash.on.fl-settle{background:radial-gradient(100% 80% at 50% 50%,rgba(var(--s-held,236,226,190),.45),rgba(var(--s-held,236,226,190),0));animation:scn-fl 3s ease-out forwards}
.scn-flash.on.fl-backfire{background:radial-gradient(120% 90% at 30% 70%,rgba(var(--s-fog,var(--s-smk)),.75),rgba(var(--s-fog,var(--s-smk)),.25) 70%,rgba(var(--s-fog,var(--s-smk)),0));animation:scn-bf 5s ease-in-out forwards}
@keyframes scn-fl{0%{opacity:0}18%{opacity:1}100%{opacity:0}}
@keyframes scn-bf{0%{opacity:0}30%{opacity:0}62%{opacity:.85}100%{opacity:0}}
.scn.backfire .scn-world{animation:scn-breath 5s ease-in-out}
@keyframes scn-breath{0%{opacity:1}14%{opacity:.86}26%{opacity:1}100%{opacity:1}}
.scn.backfire .smk.live i{animation-duration:1.4s!important}
.scn.backfire .smk i{background:rgba(var(--s-smk),.7)!important}
.scn-world.opening{animation:scn-open 2.4s ease-out}
@keyframes scn-open{0%{opacity:0}100%{opacity:1}}
${/* The settled emblem and the highlight ring. */ ''}
.scn-emb{position:absolute;right:3%;bottom:4%;padding:2px 7px;font:600 10px/1.4 var(--labelf,var(--body,system-ui));letter-spacing:.14em;text-transform:uppercase;
  color:var(--s-ink);background:var(--s-paper);border:1px solid var(--s-ink);box-shadow:0 0 0 2px var(--s-paper),0 0 0 3px var(--s-ink);opacity:0;transition:opacity 2s;pointer-events:none}
.scn-emb.on{opacity:.9}
.scn[data-look=ledger] .scn-emb{font:italic 11px/1.3 var(--f-serif,Georgia,serif);letter-spacing:.08em;text-transform:none;font-variant:small-caps;border-radius:50%/40%;padding:4px 10px}
.scn[data-look=gaslight] .scn-emb{background:#c8a03c;color:#2a1405;border-color:#2a1405;font-family:var(--display,Georgia,serif)}
.scn[data-look=chrome] .scn-emb{border-radius:12px;background:#f3ead2;color:#0e5a54;border-color:#0e5a54;box-shadow:none}
.scn[data-look=terminal] .scn-emb{background:rgba(6,20,8,.8);color:#8ef08a;border-color:#8ef08a;box-shadow:none;font-family:ui-monospace,monospace}
.scn[data-look=cyberpunk] .scn-emb{background:rgba(10,4,24,.7);color:#7ff6ff;border-color:#7ff6ff;box-shadow:0 0 6px rgba(127,246,255,.6);font-family:ui-monospace,monospace}
.scn-hl{position:absolute;pointer-events:none;border:2px solid var(--focus,var(--s-sv));border-radius:50%;box-shadow:0 0 0 3px rgba(255,255,255,.35);opacity:0;transform:scale(1.15);transition:opacity .4s,transform .5s cubic-bezier(.2,.9,.3,1.2)}
.scn-hl.on{opacity:.95;transform:none}
.scn.halt *{animation-play-state:paused!important}
.scn.paused *{animation-play-state:paused!important}

${/* --- drawing classes (every look styles these through its tokens) --- */ ''}
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
.scn .tlive{fill:var(--s-ac);stroke:var(--s-ink);stroke-width:calc(.6px*var(--sw))}.scn .tcream{fill:var(--s-b2);stroke:none}
.scn .main{fill:none;stroke:var(--s-ink);stroke-width:calc(.6px*var(--sw));stroke-dasharray:1 3;opacity:.6}
.scn .cs{fill:rgba(0,0,0,.13);stroke:none}
.scn[data-look=ledger] .cs{fill:rgba(42,31,21,.13)}.scn[data-look=gaslight] .cs{fill:rgba(8,4,10,.45)}
.scn[data-look=terminal] .cs{fill:none;stroke:rgba(120,200,110,.25);stroke-width:.6px;stroke-dasharray:2 2}.scn[data-look=cyberpunk] .cs{fill:rgba(62,242,255,.06)}
.scn .svf{fill:var(--s-sv);fill-opacity:.07;stroke:none}
.scn .svs{fill:none;stroke:var(--s-sv);stroke-width:calc(.8px*var(--sw));stroke-dasharray:3 3}
.scn .svk{fill:none;stroke:var(--s-ink);stroke-width:calc(1.2px*var(--sw))}
.scn .svfl{fill:var(--s-sv);stroke:none}

${/* --- appearance: slots grow out of the ground; ghosts are faint dashed hints --- */ ''}
.scn .sl0{display:none}
.scn .sl0.on{display:inline}
${/* The slot's own origin is its foot (bottom centre), so grow from 0 0 in view-box terms: no fill-box needed (Safari). */ ''}
.scn .gr{transform-box:view-box;transform-origin:0 0}
.scn.live .sl0.on>.gr{animation:scn-rise .9s cubic-bezier(.2,.9,.3,1.15) both}
${/* M3: things lit by the hour come on and go off without the rise (and without repainting their band each frame). */ ''}
.scn.live .sl0.nr.on>.gr{animation:none}
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
.scn .scaf{display:none}
.scn .scaf.on{display:inline;animation:scn-scaf 2.6s ease forwards}
@keyframes scn-scaf{0%{opacity:0}15%{opacity:1}70%{opacity:1}100%{opacity:0}}
.scn.live .build>.gr{animation:scn-rise 1.8s .3s cubic-bezier(.2,.9,.3,1.05) both!important}
.scn.live .evolve>.gr{animation:scn-evolve 1.6s .35s cubic-bezier(.2,.9,.3,1.1) both}
@keyframes scn-evolve{0%{opacity:0;transform:scaleY(.2)}55%{opacity:1}100%{transform:none}}
${/* The old machine sinks away as the new one rises (a stage change). */ ''}
.scn .outgoing{pointer-events:none}
.scn.live .outgoing>.gr{animation:scn-out 1.3s ease-in forwards}
.scn.rm .outgoing{display:none}
@keyframes scn-out{0%{opacity:1;transform:none}100%{opacity:0;transform:scaleY(.15)}}
${/* The Market's scaffold: up, held, down; no player highlight. */ ''}
.scn .scaf.mkt.on{animation:scn-scaf2 3.8s ease forwards}
.scn.live .scaf.mkt.on>.sgr{transform-box:view-box;transform-origin:0 0;animation:scn-scafr 3.8s ease forwards}
@keyframes scn-scaf2{0%{opacity:0}12%{opacity:.9}78%{opacity:.9}100%{opacity:0}}
@keyframes scn-scafr{0%{transform:scaleY(.1)}30%{transform:none}75%{transform:none}100%{transform:scaleY(.3)}}
.scn.rm .scaf.mkt.on{opacity:.8}
.scn .scaf.mkt .scf{stroke-width:calc(1.2px*var(--sw));opacity:1}
${/* A sign of restraint going up; a landmark's kick at the first backfire. */ ''}
.scn.live .raise>.gr{animation:scn-rise 1.4s cubic-bezier(.2,.9,.3,1.15) both}
.scn.live .kick>.gr{animation:scn-kick 1.3s ease-out both}
@keyframes scn-kick{0%{transform:none}12%{transform:scale(1.06,.94)}30%{transform:scale(.97,1.05)}55%{transform:none}}
${/* Commons and a Charter's landmark: always shown once built. */ ''}
.scn .cmn{display:none}.scn .cmn.on{display:inline}
.scn.live .cmn.build>.gr{animation:scn-rise 1.8s .2s cubic-bezier(.2,.9,.3,1.05) both}

${/* --- fx: smoke, spin, rock, blink, flow, drift, movers ---
   Sprites (HTML) in a 600×400 px plane scaled to the stage; every animation is transform/opacity on an HTML element
   so it runs on the compositor. Keyframes hold no var(): per-sprite values are inline or Web Animations. */ ''}
.scn-fxl{position:absolute;left:0;top:0;width:600px;height:400px;transform-origin:0 0;transform:scale(var(--k,1));pointer-events:none;overflow:visible}
.scn-fxl>.fx{position:absolute;width:1px;height:1px;transform-origin:0 0}
.scn .fx{display:none}
.scn .fx.on{display:block}
.scn .spr{position:absolute;left:0;top:0;overflow:visible}
.scn .fx>b{position:absolute;left:0;top:0;width:1px;height:1px;transform-origin:0 0}
.scn .smk i{position:absolute;left:-2.6px;top:-2.6px;width:5.2px;height:5.2px;border-radius:50%;background:rgba(var(--s-smk),var(--smk-a,.35))}
.scn .smk.wht i{background:rgba(240,240,236,.55)}
.scn[data-look=terminal] .smk i{background:none;box-shadow:inset 0 0 0 .8px rgba(var(--s-smk),.55)}
.scn[data-look=ledger] .smk i{box-shadow:inset 0 0 0 .5px rgba(42,31,21,.35)}
.scn .smk i:nth-child(1){transform:translate(2px,-5px) scale(.8)}
.scn .smk i:nth-child(2){transform:translate(9px,-15px) scale(1.4);opacity:.75}
.scn .smk i:nth-child(3){transform:translate(18px,-24px) scale(2);opacity:.45}
.scn.live .smk.live i{animation:scn-puff var(--smk-d,3.6s) linear infinite}
.scn.live .smk.live i:nth-child(2){animation-delay:calc(var(--smk-d,3.6s)*-.333)}
.scn.live .smk.live i:nth-child(3){animation-delay:calc(var(--smk-d,3.6s)*-.667)}
@keyframes scn-puff{0%{transform:translate(0,0) scale(.4);opacity:0}12%{opacity:1}100%{transform:translate(24px,-30px) scale(2.5);opacity:0}}
.scn.pace0{--smk-d:4.6s}.scn.pace1{--smk-d:3.4s}.scn.pace2{--smk-d:2.5s}
.scn.live .spin.on>b{animation:scn-spin 3s linear infinite}
.scn.live.pace0 .spin>b{animation-duration:4.2s}.scn.live.pace2 .spin>b{animation-duration:1.8s}
@keyframes scn-spin{to{transform:rotate(360deg)}}
.scn.live .rock.on>b{animation:scn-rock 2.8s ease-in-out infinite alternate}
.scn.live.pace0 .rock>b{animation-duration:3.6s}.scn.live.pace2 .rock>b{animation-duration:1.7s}
@keyframes scn-rock{from{transform:rotate(-5deg)}to{transform:rotate(5deg)}}
.scn.live .blink.on>b{animation:scn-blink 1.6s steps(2,jump-none) infinite}
@keyframes scn-blink{50%{opacity:.15}}
.scn .flow path{fill:none;stroke:var(--s-lit);stroke-width:calc(1.4px*var(--sw));stroke-dasharray:2 14}
.scn .flow>b.f1,.scn .flow>b.f2{opacity:0}
.scn.live .flow.on>b{animation:scn-flow 1.2s linear infinite}
.scn.live .flow.on>b.f1{animation-delay:-.8s}.scn.live .flow.on>b.f2{animation-delay:-.4s}
@keyframes scn-flow{0%,33.2%{opacity:1}33.3%,100%{opacity:0}}
.scn.live .drift.on>b{animation:scn-drift 70s ease-in-out infinite alternate}
@keyframes scn-drift{from{transform:translateX(-28px)}to{transform:translateX(28px)}}
.scn.lowd .flow>b,.scn.lowd .drift>b{animation:none!important}
.scn.lowd .mv.thin{display:none}
.scn.lowd .scn-noise{display:none}
.scn .tsnap{transition:none!important}
.scn .rx{transform-box:fill-box;transform:scaleX(var(--res,1));transition:transform 1.5s}
.scn .ry{transform-box:fill-box;transform-origin:50% 100%;transform:scaleY(var(--res,1));transition:transform 1.5s}
.scn .dx{transform-box:fill-box;transform:scaleX(var(--dep,0));transition:transform 1.5s}
.scn .ly{transform-box:fill-box;transform-origin:50% 100%;transform:scaleY(var(--pfc,0))}
.scn .starf{opacity:calc(1 - var(--light,0)*1.15 - var(--pf2,0))}
.scn .sunf{opacity:calc(1 - var(--pf2,0)*.85)}
.scn .rst{display:none}.scn .rst.on{display:inline}
${/* M3: the seam ladder (props/strata.ts): shafts and galleries where sunk, the next seam's shaft dotted, the worked-out
   seams hollow, the one being worked hollowing from the shaft with the reserve. */ ''}
.scn .sm .shf,.scn .sm .gal,.scn .sm .nxs,.scn .sm .pp{display:none}
.scn .sm.sunk .shf,.scn .sm.work .gal,.scn .sm.next .nxs,.scn .sm.out .pp{display:inline}
.scn .sm .sx{transform-box:fill-box;transform:scaleX(0);transition:transform 1.5s}
.scn .sm.work .sx{transform:scaleX(var(--dep,0))}
.scn .sm.out .sx{transform:scaleX(1)}
.scn .sm .gal.gl{opacity:.75}
${/* M3: the sprites over the drawing. Light's day clock (a poster roundel: the day's load round a 24-hour dial, the
   night shaded, a hand walking the day); the cast in the foreground; the proprietor's watch. */ ''}
.scn-m3{z-index:0}
.scn .dial .dlr{fill:var(--s-paper);stroke:var(--s-ink);stroke-width:calc(1px*var(--sw))}
.scn .dial .dln{fill:var(--s-ink);fill-opacity:.32;stroke:none}
.scn .dial .dlb{fill:none;stroke:var(--s-ac);stroke-width:calc(2.2px*var(--sw));stroke-linecap:butt}
.scn[data-look=gaslight] .dial .dlb{stroke:#b8321e}
.scn .dial .dlh{stroke-width:calc(1.6px*var(--sw))}
.scn .fig .cs{fill:rgba(0,0,0,.18);stroke:none}
.scn[data-look=gaslight] .fig .d,.scn[data-look=gaslight] .fig .b,.scn[data-look=gaslight] .fig .b2{fill:#1b1220}
.scn[data-look=gaslight] .fig *:not(.cs){stroke:#f6c65b}
.scn[data-look=gaslight] .fig .ac{fill:#b8321e}
.scn[data-look=cyberpunk] .fig .d,.scn[data-look=cyberpunk] .fig .b,.scn[data-look=cyberpunk] .fig .b2{fill:#0b0618}
.scn[data-look=cyberpunk] .fig *:not(.cs){stroke:#7ff6ff}
.scn[data-look=terminal] .fig *:not(.cs){stroke:#8ef08a}
.scn[data-look=terminal] .fig .d,.scn[data-look=terminal] .fig .b,.scn[data-look=terminal] .fig .b2{fill:rgba(6,20,8,.9)}
.scn[data-look=gaslight] .dial .b{fill:#efdfb6}.scn[data-look=gaslight] .dial .dln{fill:#1d1830;fill-opacity:.5}
.scn[data-look=gaslight] .dial .k{stroke:#2a1405}.scn[data-look=gaslight] .dial .d{fill:#2a1405}
.scn.live .fig .warm{animation:scn-watch 9s ease-in-out infinite}
.scn.settled .fig .warm{animation:none}
@keyframes scn-watch{0%,64%{transform:rotate(0)}74%,88%{transform:rotate(-150deg)}96%,100%{transform:rotate(0)}}
.scn .m3t{display:none}.scn .m3t.on{display:inline}
${/* M3 spots (spots.ts): the broadsheet's small pictures. */ ''}
.scn-spot{display:block;overflow:hidden}
.scn-spot *{vector-effect:non-scaling-stroke;stroke-linejoin:round;stroke-linecap:round}
.scn-spot .spbg{fill:var(--s-sky0)}
.scn-spot .spfr{fill:none;stroke:var(--s-frame);stroke-width:1px}
.scn-spot .sm.work .sx{transform:scaleX(.5)}
${/* M3 moments: a seam sunk (the shaft sinks, steam puffs at the head), the ending (the fresh sky held). */ ''}
.scn.live .sm.sinking .shf{transform-box:fill-box;transform-origin:50% 0;animation:scn-sink 1.8s cubic-bezier(.3,.7,.4,1) both}
@keyframes scn-sink{from{transform:scaleY(0)}to{transform:scaleY(1)}}
.scn.live .sm.sinking .gal{animation:scn-fl 2s ease-out}
.scn .puff i{position:absolute;left:-4px;top:-4px;width:8px;height:8px;border-radius:50%;background:rgba(240,238,230,.8);box-shadow:inset 0 0 0 .5px rgba(42,31,21,.4);opacity:0}
.scn.live .puff i{animation:scn-puff1 2.4s ease-out forwards}.scn.live .puff i:nth-child(2){animation-delay:.3s}.scn.live .puff i:nth-child(3){animation-delay:.6s}
@keyframes scn-puff1{0%{opacity:0;transform:scale(.4)}15%{opacity:1}100%{opacity:0;transform:translate(22px,-34px) scale(3.4)}}
.scn-sky.fresh.ending{opacity:1!important;transition:opacity 2.5s}
.scn .ptg{fill:rgba(6,20,8,.85);stroke:var(--s-ink);stroke-width:calc(.8px*var(--sw))}
.scn .ptt{fill:var(--s-ink);font:700 7px/1 ui-monospace,monospace}
.scn .ptx{stroke:#ff5a4a;stroke-width:calc(1.4px*var(--sw));fill:none}
.scn .adb{fill:rgba(6,20,8,.6)}
.scn .sgn{fill:#f3ead2;stroke:#0e3a38;stroke-width:calc(.8px*var(--sw))}
.scn .sgt{fill:#0e3a38;font:700 6px/1 var(--labelf,system-ui,sans-serif)}
.scn .bcab .cab{fill:none;stroke:var(--s-sv);stroke-width:calc(.9px*var(--sw));stroke-dasharray:3 2;opacity:.85}
${/* M4: the capstone's cartouche (stamped once), the Preview mark, the sea's moments (sprites: opacity and transform). */ ''}
.scn-emb.cart{border-radius:2px;padding:3px 12px;box-shadow:0 0 0 2px var(--s-paper),0 0 0 3px var(--s-ink),0 0 0 5px var(--s-paper),0 0 0 5.6px var(--s-ink)}
.scn.live .scn-emb.stamp{animation:scn-stamp 1.4s cubic-bezier(.3,1.4,.5,1) both}
@keyframes scn-stamp{0%{opacity:0;transform:scale(1.8)}60%{opacity:1;transform:scale(.94)}100%{opacity:.9;transform:none}}
.scn-prev{position:absolute;left:2.5%;top:3%;padding:1px 6px;font:italic 600 10px/1.4 var(--f-serif,Georgia,serif);letter-spacing:.1em;font-variant:small-caps;
  color:var(--s-ink);background:var(--s-paper);border:1px dashed var(--s-ink);opacity:0;pointer-events:none}
.scn-prev.on{opacity:.85}
.scn .drn{position:absolute;left:0;top:0}
.scn .veil{overflow:hidden}.scn .veil i{position:absolute;top:0;bottom:0;left:0;background:linear-gradient(90deg,rgba(var(--s-mist),0),rgba(var(--s-mist),.95) 50%,rgba(var(--s-mist),0))}
.scn.arrears .scn-held{opacity:0!important}
.scn-spot .spt{fill:var(--s-ink);font:6px/1 var(--f-serif,Georgia,serif)}.scn-spot .spi{font-style:italic}.scn-spot .spc{font-size:9px;font-variant:small-caps}
.scn .stdy{display:none}.scn.steady .stdy{display:inline}
.scn .nosteady{display:inline}.scn.steady .nosteady{display:none}

${/* --- places: tap targets over the picture --- */ ''}
.scn-places{pointer-events:none}
.scn-place{position:absolute;pointer-events:auto;margin:0;padding:0;border:0;background:transparent;cursor:pointer;
  border-radius:4px;-webkit-tap-highlight-color:transparent;min-width:44px;min-height:44px}
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

${/* --- the card under the picture --- */ ''}
.scn-card{min-height:44px;padding:6px 2px 0;font-size:14px;line-height:1.35;border-top:1px solid var(--rule,rgba(0,0,0,.12));margin-top:6px}
.scn-cap{color:var(--muted,#6f5f4a)}
.scn:not(.wide) .scn-emb{font-size:9px;padding:1px 5px;right:2.5%;bottom:3%}
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
${FRAME_CSS}${PRYCE_CSS}`;

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

/** M4: the drawing classes alone (the shared .b/.k/.d … rules), for small self-contained pictures (postcards). */
export function drawingCss(): string {
  const a = BASE.indexOf('/* --- drawing classes'), b = BASE.indexOf('/* --- appearance');
  return a >= 0 && b > a ? BASE.slice(a, b) : BASE;
}
