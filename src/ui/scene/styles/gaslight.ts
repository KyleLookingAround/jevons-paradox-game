// Light: chromolithograph / fin-de-siecle poster.
import type { ArtStyle } from '../style';
import { mix } from '../svg';
import { flatFill, glowDefs, dots } from '../style';
import { GASLIGHT } from '../props/gaslight';

export const gaslight: ArtStyle = {
  id: 'gaslight',
  idiom: 'Chromolithograph poster, 1890s',
  css: `.scn[data-look=gaslight]{
  --s-paper:#1a1630;--s-ink:#120a14;--s-b:#2a1d33;--s-b2:#22172b;--s-rf:#1d1426;--s-w:#140d18;--s-lit:var(--s-lamp,#f6c65b);
  --s-tr:#1f2a2e;--s-wa:#2c2442;--s-gd:#221a2c;--s-gd2:#291f33;--s-sp:#2a1f30;--s-ac:#e8a531;--s-ac2:#d4472a;
  --s-mt:#4a3550;--s-smk:58,44,36;--s-hz:110,72,44;--s-mist:120,70,70;--s-sun:#f4e7c5;
  --s-sky0:#0b1430;--s-sky0b:#3a3f6b;--s-sky1:#2a2420;--s-sky1b:#6b5038;--s-sky2:#101d44;--s-sky2b:#2d4f7c;
  --s-fog:40,28,22;--s-sv:#f2b544;--s-hatch:#120a14;--s-glow:var(--s-lamprgb,246,198,91);--s-frame:#f2b544;
}

.scn[data-look=gaslight]{--s-ink:#5a3a4c;--s-btxt:#f4e7c5}
/* A printed dusk: prussian blue overhead, stepped down through plum and vermilion to an ochre and cream horizon. */
.scn[data-look=gaslight] .scn-sky{background:linear-gradient(to bottom,#151a3c 0 13%,#22204a 13% 20%,#3a2550 20% 26%,#5e2c52 26% 30%,#93344a 30% 33.5%,#c9502f 33.5% 36.5%,#e48c38 36.5% 39%,#f0c56e 39% 41%,#f3e2b0 41% 42.5%,#2a1d33 42.5%)}
.scn[data-look=gaslight] .scn-sky.smog{background:linear-gradient(to bottom,#1c1712 0 16%,#2a2018 16% 25%,#3a2a1c 25% 31%,#55391f 31% 35%,#7a4f26 35% 39%,#a46a33 39% 42.5%,#2a1d33 42.5%)}
.scn[data-look=gaslight] .scn-sky.fresh{background:linear-gradient(to bottom,#0b1640 0 16%,#13235a 16% 25%,#1c3170 25% 31%,#284585 31% 36%,#3a5d96 36% 41%,#6a7fb0 41% 42.5%,#2a1d33 42.5%)}
.scn[data-look=gaslight] .scn-glow{background:radial-gradient(60% 34% at 50% 62%,rgba(var(--s-glow),.42) 0 30%,rgba(var(--s-glow),.24) 30% 55%,rgba(var(--s-glow),.1) 55% 80%,rgba(var(--s-glow),0) 80%)!important}
.scn[data-look=gaslight] .band-mid .b,.scn[data-look=gaslight] .band-mid .rf,.scn[data-look=gaslight] .band-near .b,.scn[data-look=gaslight] .band-near .rf{stroke:#060a16;stroke-width:calc(1px*var(--sw))}
.scn .poster-t{font-family:var(--f-grot,'Arial Narrow',Arial,sans-serif);font-weight:800;font-stretch:75%;font-size:18px;letter-spacing:.16em;fill:#b8321e}
.scn .fascia{font-family:var(--f-grot,'Arial Narrow',Arial,sans-serif);font-weight:800;font-stretch:75%;letter-spacing:.06em;fill:#1b1305}
.scn[data-look=gaslight] .scn-glow{display:none;background:radial-gradient(80% 45% at 50% 62%,rgba(var(--s-glow),.6),rgba(var(--s-glow),.18) 55%,rgba(var(--s-glow),0) 80%)}
.scn[data-look=gaslight] .band-far .b,.scn[data-look=gaslight] .band-far .rf{fill:#6a3a4e;stroke:none}
.scn[data-look=gaslight] .band-far .b2{fill:#5a3044;stroke:none}
.scn[data-look=gaslight] .sil0{fill:#7a4252}
.scn[data-look=gaslight] .sil00{fill:#a8584e}
.scn[data-look=gaslight] .seaD{fill:#c56a3c}.scn[data-look=gaslight] .seaG{fill:none;stroke:#f3d59a;stroke-width:1px;opacity:.7}
.scn[data-look=gaslight] .heri{fill:#4a2a40}.scn[data-look=gaslight] .heriw{fill:var(--s-lamp,#f6c65b);opacity:.55}
.scn[data-look=gaslight] .band-mid .b,.scn[data-look=gaslight] .band-mid .rf{fill:#3a2438;stroke:#1a0f18}
.scn[data-look=gaslight] .sil1{fill:#30203a!important;stroke:none!important}
.scn[data-look=gaslight] .band-near .b,.scn[data-look=gaslight] .band-near .rf{fill:#22152a;stroke:#0e070c}
.scn[data-look=gaslight] .gd{fill:#1e1626;stroke:none}.scn[data-look=gaslight] .gd2{fill:#1a1220}
.scn[data-look=gaslight] .pave{fill:#140e18!important}
.scn[data-look=gaslight] .post{stroke:#8a6a5a;stroke-width:calc(1px*var(--sw))}
.scn[data-look=gaslight] .k{stroke:#6a4a5a}
.scn .star{fill:#f4e7c5}
.scn .moon{fill:#f4e7c5;stroke:none;opacity:.9}
.scn .refl{opacity:var(--light,0)}
.scn .neon{fill:#2a1420;stroke:#e8664a;stroke-width:calc(1px*var(--sw))}
.scn .neonk{stroke:#ff9a7a!important;stroke-width:calc(1.2px*var(--sw))!important}
.scn .lettr{stroke:#2a1a05!important;stroke-width:calc(1.2px*var(--sw))!important;opacity:.8}

.scn[data-look=gaslight] .scn-stage{border-color:#c8902a;box-shadow:0 0 0 3px var(--bg-solid,#141d33),0 0 0 4px rgba(242,181,68,.3)}`,
  defs: (p) => [0, 1, 2, 3].map((i) => flatFill(p, `h${i}`, 'rgba(4,8,20,.38)') + flatFill(p, `x${i}`, 'rgba(4,8,20,.55)')).join('') + glowDefs(p) +
    // Glow is printed, not blurred: three halftone screens, dense to sparse.
    dots(p, 'ht1', 1.5, 0.78, 'rgb(var(--s-glow))', 1) + dots(p, 'ht2', 1.9, 0.58, 'rgb(var(--s-glow))', 0.9) + dots(p, 'ht3', 2.4, 0.42, 'rgb(var(--s-glow))', 0.75),
  plate: (c) => {
    const t = (c.caption || c.name).toUpperCase();
    // The poster's lettered band: cream stock, vermilion title, ochre rules (the printer's three inks).
    return '<rect x="0" y="0" width="600" height="34" fill="#efdfb6"/>' +
      '<path d="M0 34.5H600" stroke="#1a0f18" stroke-width="1.4" fill="none"/><path d="M0 37.5H600" stroke="#c8902a" stroke-width="1.4" fill="none"/>' +
      '<path d="M14 17h40M546 17h40" stroke="#c8902a" stroke-width="1.6"/><circle cx="58" cy="17" r="2.6" fill="#b8321e"/><circle cx="542" cy="17" r="2.6" fill="#b8321e"/>' +
      `<text x="300" y="25" text-anchor="middle" class="poster-t">${t}</text>`;
  },
  props: GASLIGHT,
  wash: (t) => [mix('#1f2a2e', '#2a2220', t), mix('#2c2442', '#2e2a2a', t)],
};
