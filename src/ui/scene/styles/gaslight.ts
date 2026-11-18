// Light: chromolithograph / fin-de-siecle poster.
import type { ArtStyle } from '../style';
import { mix } from '../svg';
import { flatFill, glowDefs, dots } from '../style';
import { GASLIGHT } from '../props/gaslight';

export const gaslight: ArtStyle = {
  id: 'gaslight',
  idiom: 'Chromolithograph poster, 1890s',
  css: `.scn[data-look=gaslight]{
  --s-paper:#141d33;--s-ink:#0a0f1e;--s-b:#1b2645;--s-b2:#16203b;--s-rf:#121a31;--s-w:#0c1222;--s-lit:var(--s-lamp,#f6c65b);
  --s-tr:#14203d;--s-wa:#22325c;--s-gd:#1a2443;--s-gd2:#1f2b4e;--s-sp:#1b2440;--s-ac:#f2b544;--s-ac2:#e8664a;
  --s-mt:#2b3962;--s-smk:52,46,40;--s-hz:96,72,52;--s-mist:40,54,92;--s-sun:#f4e7c5;
  --s-sky0:#0b1430;--s-sky0b:#3a3f6b;--s-sky1:#2a2420;--s-sky1b:#6b5038;--s-sky2:#101d44;--s-sky2b:#2d4f7c;
  --s-fog:26,22,20;--s-sv:#f2b544;--s-hatch:#0a0f1e;--s-glow:var(--s-lamprgb,246,198,91);--s-frame:#f2b544;
}

.scn[data-look=gaslight]{--s-ink:#33426f;--s-btxt:#f4e7c5}
.scn[data-look=gaslight] .scn-sky{background:linear-gradient(to bottom,#0c1433 0 16%,#141f45 16% 25%,#1d2954 25% 31%,#2c3263 31% 35%,#5a4166 35% 38.5%,#a8674e 38.5% 41%,#1d2a4f 41%)}
.scn[data-look=gaslight] .scn-sky.smog{background:linear-gradient(to bottom,#1c1712 0 16%,#2a2018 16% 25%,#3a2a1c 25% 31%,#55391f 31% 35%,#7a4f26 35% 39%,#a46a33 39% 42%,#3a2a1c 42%)}
.scn[data-look=gaslight] .scn-sky.fresh{background:linear-gradient(to bottom,#0b1640 0 16%,#13235a 16% 25%,#1c3170 25% 31%,#284585 31% 36%,#3a5d96 36% 41%,#1d2a4f 41%)}
.scn[data-look=gaslight] .scn-glow{background:radial-gradient(60% 34% at 50% 62%,rgba(var(--s-glow),.42) 0 30%,rgba(var(--s-glow),.24) 30% 55%,rgba(var(--s-glow),.1) 55% 80%,rgba(var(--s-glow),0) 80%)!important}
.scn[data-look=gaslight] .band-mid .b,.scn[data-look=gaslight] .band-mid .rf,.scn[data-look=gaslight] .band-near .b,.scn[data-look=gaslight] .band-near .rf{stroke:#060a16;stroke-width:calc(1px*var(--sw))}
.scn .poster-t{font-family:var(--f-grot,'Arial Narrow',Arial,sans-serif);font-weight:800;font-stretch:75%;font-size:18px;letter-spacing:.16em;fill:#f4e7c5}
.scn .fascia{font-family:var(--f-grot,'Arial Narrow',Arial,sans-serif);font-weight:800;font-stretch:75%;letter-spacing:.06em;fill:#1b1305}
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

.scn[data-look=gaslight] .scn-stage{border-color:rgba(242,181,68,.45);box-shadow:0 0 0 3px #141d33,0 0 0 4px rgba(242,181,68,.25)}`,
  defs: (p) => [0, 1, 2, 3].map((i) => flatFill(p, `h${i}`, 'rgba(4,8,20,.38)') + flatFill(p, `x${i}`, 'rgba(4,8,20,.55)')).join('') + glowDefs(p) +
    // Glow is printed, not blurred: three halftone screens, dense to sparse.
    dots(p, 'ht1', 1.5, 0.78, 'rgb(var(--s-glow))', 1) + dots(p, 'ht2', 1.9, 0.58, 'rgb(var(--s-glow))', 0.9) + dots(p, 'ht3', 2.4, 0.42, 'rgb(var(--s-glow))', 0.75),
  plate: (c) => {
    const t = (c.caption || c.name).toUpperCase();
    return '<rect x="0" y="0" width="600" height="34" fill="#0b1024"/>' +
      '<path d="M0 34.5H600M0 37H600" stroke="#f2b544" stroke-width="1" fill="none"/>' +
      '<path d="M14 17h40M546 17h40" stroke="#f2b544" stroke-width="1.4"/><circle cx="58" cy="17" r="2.2" fill="#e8664a"/><circle cx="542" cy="17" r="2.2" fill="#e8664a"/>' +
      `<text x="300" y="25" text-anchor="middle" class="poster-t">${t}</text>`;
  },
  props: GASLIGHT,
  wash: (t) => [mix('#14203d', '#221f22', t), mix('#22325c', '#2a2a30', t)],
};
