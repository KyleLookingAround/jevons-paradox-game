// Generic: follows the page theme tokens (used for unknown looks).
import type { ArtStyle } from '../style';
import { engravingHatches, glowDefs } from '../style';


export const generic: ArtStyle = {
  id: 'generic',
  idiom: 'Whatever the page theme says',
  css: `.scn[data-look=generic]{
  --s-paper:var(--bg-solid,#efe6d0);--s-ink:var(--ink,#2a1f15);--s-b:var(--surface,#f6efdc);--s-b2:var(--surface-2,#e8dcc0);
  --s-rf:var(--surface-2,#d8c7a2);--s-w:var(--ink,#3b2d1f);--s-lit:var(--accent,#e8ae3c);--s-tr:var(--good,#7fa98a);
  --s-wa:var(--water,#a7bcc0);--s-gd:var(--surface-2,#ddd1ab);--s-gd2:var(--surface,#cdbd92);--s-sp:var(--muted,#7a6e5d);
  --s-ac:var(--accent,#a3231a);--s-ac2:var(--good,#24473a);--s-mt:var(--muted,#8e8a80);--s-smk:var(--smog,90,80,70);
  --s-hz:var(--smog,110,95,75);--s-mist:200,200,200;--s-sun:var(--accent,#e9c46a);
  --s-sky0:var(--surface,#f3ecd9);--s-sky0b:var(--bg-solid,#e9e0c6);--s-sky1:var(--muted,#b49f7c);--s-sky1b:var(--surface-2,#d8c8a4);
  --s-sky2:var(--surface,#f4efdc);--s-sky2b:var(--bg-solid,#dde7d8);--s-sv:var(--bad,#a3231a);--s-hatch:var(--ink,#2a1f15);
  --s-glow:255,206,110;--s-frame:var(--rule-2,#2a1f15);
}`,
  defs: (p) => engravingHatches(p) + glowDefs(p),
  props: {},
};
