// The scene's own stylesheet, injected once. Page theme tokens (--ink, --bg-solid, --accent, --bad, --good, --rule,
// --display, --body, --numf) are read with fallbacks; everything scene-specific is a --s-* token set per look.
// Every animation is transform/opacity on small elements, paused off-screen, and removed under reduced motion.

const LOOKS = `
.scn[data-look=ledger]{
  --s-paper:var(--bg-solid,#efe6d0);--s-ink:#2a1f15;--s-b:#f4ecd6;--s-b2:#e6d9b9;--s-rf:#d8c7a2;--s-w:#3b2d1f;--s-lit:#e8ae3c;
  --s-tr:var(--s-wash,#a9b585);--s-wa:var(--s-water,#a7bcc0);--s-gd:#ddd1ab;--s-gd2:#cdbd92;--s-sp:#7a6e5d;--s-ac:#a3231a;--s-ac2:#24473a;
  --s-mt:#8e8a80;--s-smk:58,48,38;--s-hz:122,102,74;--s-mist:239,230,208;--s-sun:#e9c46a;
  --s-sky0:#f3ecd9;--s-sky0b:#e9e0c6;--s-sky1:#b49f7c;--s-sky1b:#d8c8a4;--s-sky2:#dfe8e4;--s-sky2b:#f1eedc;
  --s-sv:#a3231a;--s-hatch:#2a1f15;--s-glow:255,206,110;--s-frame:#2a1f15;--s-fog:46,36,26;
}
.scn[data-look=gaslight]{
  --s-paper:#141d33;--s-ink:#0a0f1e;--s-b:#1b2645;--s-b2:#16203b;--s-rf:#121a31;--s-w:#0c1222;--s-lit:var(--s-lamp,#f6c65b);
  --s-tr:#14203d;--s-wa:#22325c;--s-gd:#1a2443;--s-gd2:#1f2b4e;--s-sp:#1b2440;--s-ac:#f2b544;--s-ac2:#e8664a;
  --s-mt:#2b3962;--s-smk:52,46,40;--s-hz:96,72,52;--s-mist:40,54,92;--s-sun:#f4e7c5;
  --s-sky0:#0b1430;--s-sky0b:#3a3f6b;--s-sky1:#2a2420;--s-sky1b:#6b5038;--s-sky2:#101d44;--s-sky2b:#2d4f7c;
  --s-fog:26,22,20;--s-sv:#f2b544;--s-hatch:#0a0f1e;--s-glow:var(--s-lamprgb,246,198,91);--s-frame:#f2b544;
}
.scn[data-look=chrome]{
  --s-paper:#f3eee2;--s-ink:#1a2a2d;--s-b:#fbf8f0;--s-b2:#e4ddcc;--s-rf:#0e7c77;--s-w:#2c3e40;--s-lit:#f0c35a;
  --s-tr:#7fa98a;--s-wa:#86bccb;--s-gd:#cfdcb8;--s-gd2:#e6d49a;--s-sp:#8a8f86;--s-ac:#e07a5f;--s-ac2:#e9b949;
  --s-mt:#b9c0c0;--s-smk:110,100,92;--s-hz:150,128,104;--s-mist:243,238,226;--s-sun:#f0c35a;
  --s-sky0:#bfe0dc;--s-sky0b:#f3eee2;--s-sky1:#b8a891;--s-sky1b:#e5d6bb;--s-sky2:#a8dbe0;--s-sky2b:#f6f1e4;
  --s-fog:92,72,56;--s-sv:#e07a5f;--s-hatch:#1a2a2d;--s-glow:240,195,90;--s-frame:#1a2a2d;
}
.scn[data-look=terminal]{
  --s-paper:#070b08;--s-ink:#9ff08f;--s-b:#070b08;--s-b2:#0b140d;--s-rf:#0b140d;--s-w:#16301a;--s-lit:#e9b44a;
  --s-tr:#0b140d;--s-wa:#071618;--s-gd:#08100a;--s-gd2:#0b160d;--s-sp:#102016;--s-ac:#e9b44a;--s-ac2:#5fd0e0;
  --s-mt:#5c9a55;--s-smk:120,160,120;--s-hz:150,90,30;--s-mist:7,11,8;--s-sun:#e9b44a;
  --s-sky0:#040705;--s-sky0b:#0a1a0e;--s-sky1:#1a0d04;--s-sky1b:#4a2a0c;--s-sky2:#030806;--s-sky2b:#0c2a22;
  --s-fog:70,24,6;--s-sv:#e9b44a;--s-hatch:#5c9a55;--s-glow:233,180,74;--s-frame:#3d6b37;
}
.scn[data-look=agentic]{
  --s-paper:#f2f1ed;--s-ink:#18191b;--s-b:#ffffff;--s-b2:#f1efe9;--s-rf:#e6e3da;--s-w:#d6d3ca;--s-lit:#1a7f37;
  --s-tr:#d7e8d5;--s-wa:#dbe7f7;--s-gd:#ebe9e2;--s-gd2:#e2dfd5;--s-sp:#c9c6bc;--s-ac:#e0592a;--s-ac2:#1a7f37;
  --s-mt:#b9b6ac;--s-smk:140,140,150;--s-hz:150,148,160;--s-mist:242,241,237;--s-sun:#e0592a;
  --s-sky0:#f7f6f2;--s-sky0b:#efeee9;--s-sky1:#cfcdd2;--s-sky1b:#e4e2e3;--s-sky2:#f7f9f6;--s-sky2b:#eef4ee;
  --s-fog:38,38,44;--s-sv:#e0592a;--s-hatch:#18191b;--s-glow:224,89,42;--s-frame:#dddbd3;
}
.scn[data-look=generic]{
  --s-paper:var(--bg-solid,#efe6d0);--s-ink:var(--ink,#2a1f15);--s-b:var(--surface,#f6efdc);--s-b2:var(--surface-2,#e8dcc0);
  --s-rf:var(--surface-2,#d8c7a2);--s-w:var(--ink,#3b2d1f);--s-lit:var(--accent,#e8ae3c);--s-tr:var(--good,#7fa98a);
  --s-wa:var(--water,#a7bcc0);--s-gd:var(--surface-2,#ddd1ab);--s-gd2:var(--surface,#cdbd92);--s-sp:var(--muted,#7a6e5d);
  --s-ac:var(--accent,#a3231a);--s-ac2:var(--good,#24473a);--s-mt:var(--muted,#8e8a80);--s-smk:var(--smog,90,80,70);
  --s-hz:var(--smog,110,95,75);--s-mist:200,200,200;--s-sun:var(--accent,#e9c46a);
  --s-sky0:var(--surface,#f3ecd9);--s-sky0b:var(--bg-solid,#e9e0c6);--s-sky1:var(--muted,#b49f7c);--s-sky1b:var(--surface-2,#d8c8a4);
  --s-sky2:var(--surface,#f4efdc);--s-sky2b:var(--bg-solid,#dde7d8);--s-sv:var(--bad,#a3231a);--s-hatch:var(--ink,#2a1f15);
  --s-glow:255,206,110;--s-frame:var(--rule-2,#2a1f15);
}
`;

const LOOK_EXTRA = `
.scn[data-look=gaslight]{--s-ink:#33426f;--s-btxt:#f4e7c5}
.scn[data-look=gaslight] .scn-glow{display:none;background:radial-gradient(80% 45% at 50% 62%,rgba(var(--s-glow),.6),rgba(var(--s-glow),.18) 55%,rgba(var(--s-glow),0) 80%)}
.scn[data-look=gaslight] .band-far .b,.scn[data-look=gaslight] .band-far .rf{fill:#25345f;stroke:none}
.scn[data-look=gaslight] .band-far .b2{fill:#1f2c52;stroke:none}
.scn[data-look=gaslight] .sil0{fill:#1d2a4f}
.scn[data-look=gaslight] .band-mid .b,.scn[data-look=gaslight] .band-mid .rf{fill:#18223f;stroke:#2a3863}
.scn[data-look=gaslight] .sil1{fill:#141d36!important;stroke:none!important}
.scn[data-look=gaslight] .band-near .b,.scn[data-look=gaslight] .band-near .rf{fill:#10172c;stroke:#2a3760}
.scn[data-look=gaslight] .gd{fill:#121a31;stroke:none}.scn[data-look=gaslight] .gd2{fill:#0f1529}
.scn[data-look=gaslight] .pave{fill:#0b1120!important}
.scn[data-look=gaslight] .post{stroke:#4a5a8c;stroke-width:calc(1px*var(--sw))}
.scn[data-look=gaslight] .k{stroke:#3a4a7a}
.scn .star{fill:#f4e7c5}
.scn .moon{fill:#f4e7c5;stroke:none;opacity:.9}
.scn .refl{opacity:var(--light,0)}
.scn .neon{fill:#2a1420;stroke:#e8664a;stroke-width:calc(1px*var(--sw))}
.scn .neonk{stroke:#ff9a7a!important;stroke-width:calc(1.2px*var(--sw))!important}
.scn .lettr{stroke:#2a1a05!important;stroke-width:calc(1.2px*var(--sw))!important;opacity:.8}
`;

const CHROME_CSS = `
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
`;

const TERM_CSS = `
.scn[data-look=terminal]{--s-btxt:#9ff08f}
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
`;

const AGENT_CSS = `
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
`;

const BASE = `
.scn{position:relative;font-family:var(--body,Georgia,serif);color:var(--ink,#2a1f15);--sw:1;}
.scn.wide{--sw:1.35}
.scn-stage{position:relative;width:100%;aspect-ratio:3/2;overflow:hidden;background:var(--s-paper);isolation:isolate;
  border:1px solid var(--s-frame);contain:layout paint;-webkit-user-select:none;user-select:none;touch-action:manipulation}
.scn[data-look=ledger] .scn-stage{outline:1px solid var(--s-frame);outline-offset:3px;margin:4px 0 8px}
.scn[data-look=chrome] .scn-stage{border-radius:14px;border-color:rgba(26,42,45,.25)}
.scn[data-look=agentic] .scn-stage{border-radius:6px}
.scn[data-look=gaslight] .scn-stage{border-color:rgba(242,181,68,.45);box-shadow:0 0 0 3px #141d33,0 0 0 4px rgba(242,181,68,.25)}
.scn-world,.scn-l,.scn-sky,.scn-hz,.scn-fog,.scn-places,.scn-glow{position:absolute;inset:0;width:100%;height:100%}
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

let injected = false;
export function injectSceneCss(doc: Document = document): void {
  if (injected && doc.getElementById('scn-css')) return;
  if (doc.getElementById('scn-css')) { injected = true; return; }
  const el = doc.createElement('style');
  el.id = 'scn-css';
  el.textContent = LOOKS + LOOK_EXTRA + CHROME_CSS + TERM_CSS + AGENT_CSS + BASE;
  doc.head.appendChild(el);
  injected = true;
}

export const SCENE_CSS = LOOKS + LOOK_EXTRA + CHROME_CSS + TERM_CSS + AGENT_CSS + BASE;
export const KNOWN_LOOKS = new Set(['ledger', 'gaslight', 'chrome', 'terminal', 'agentic']);
