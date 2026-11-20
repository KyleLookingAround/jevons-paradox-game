// M4: postcards for the Industry tabs (design/visual-direction.md item 7; m4-design §10): a static crop of an
// Industry's picture, 64 × 40 by default, built as an SVG string from the layout's own scenery (no DOM, no animation):
// the backdrop in the Age's style, the landmark of each founded application, the weather as a tint, and the marks a tab
// needs: the settled wash, the capstone's cartouche "Settled {year}", the Preview corner and the warning dot near a
// crisis. Render it once per layout change (the host keys it with postcardKey), never per tick.
//
//   postcard(view)                        → an SVG string relying on the scene CSS on the page (inline it);
//   postcard(view, { standalone: true })  → the same with a small stylesheet inlined (the drawing classes and this
//                                            look's tokens only, about 6 KB), for <img src="data:…"> (one DOM node).
import type { SceneView } from './types';
import type { BackdropCtx, PropArgs, Slot } from './layout';
import { depthScale } from './layout';
import { layoutFor, propFor } from './registry';
import { styleFor } from './styles/index';
import { f, hash, rng, clamp, esc } from './svg';
import { drawingCss } from './css';

export interface PostcardOptions {
  /** Inline the stylesheet the drawing needs (for an <img> or a saved file). Default false. */
  standalone?: boolean;
  /** Output size in CSS pixels (default 64 × 40). The crop fills it. */
  width?: number;
  height?: number;
}

/** What a postcard shows, coarsely: equal keys draw the same card (re-render only when it changes). */
export function postcardKey(v: SceneView): string {
  const warn = warning(v);
  return [v.sectorId, v.stage, v.apps.filter((a) => a.status === 'founded').map((a) => a.id).join(','), Math.round(clamp(v.pressureFraction, 0, 1) * 4),
    v.settled ? 's' : '', v.capstoned ? `c${v.capstoned.year ?? ''}${v.capstoned.arrears ? 'a' : ''}` : '', v.preview ? 'p' : '', warn ? 'w' : ''].join('|');
}

function warning(v: SceneView): boolean {
  if (v.settled && !v.capstoned?.arrears) return false;
  return (v.nextCrisisFraction ?? 0) >= 0.9 || v.pressureFraction >= 0.85 || !!v.capstoned?.arrears;
}

export function postcard(v: SceneView, o: PostcardOptions = {}): string {
  const l = layoutFor(v.sectorId, v.apps.length);
  const look = styleFor(l.look)?.css ? l.look : styleFor(v.look)?.css ? v.look : 'ledger';
  const st = styleFor(look)!;
  const [cx, cy, cw, ch] = l.card ?? [60, 100, 480, 300];
  const pf = `pc${hash(v.sectorId + look) % 100000}-`;
  const stage = clamp(Math.round(v.stage), 0, 3);
  const hl = (s: number) => (s >= 0.85 ? 0 : s >= 0.62 ? 1 : s >= 0.45 ? 2 : 3);
  const c: BackdropCtx = { u: (x) => `url(#${pf}${x})`, hatch: (s, lv = 0) => `url(#${pf}${lv ? 'x' : 'h'}${hl(s)})`, r: rng(hash(l.id)), stage, heritage: v.heritage };
  let bd: ReturnType<typeof l.backdrop> = {};
  try { bd = l.backdrop(c); } catch { bd = {}; }
  // The landmark of each founded application, where the picture has it.
  let marks = '';
  const used = new Set<unknown>();
  for (const a of v.apps) {
    if (a.status !== 'founded') continue;
    const p = l.plots.find((q) => (q.driver ?? 'app') === 'app' && !used.has(q) && (q.match ?? []).some((m) => m === a.icon || m === a.id));
    if (!p?.anchor) continue;
    used.add(p);
    marks += place(p.anchor, l, look, v.look, stage, pf, hl);
  }
  const pfv = clamp(v.pressureFraction, 0, 1) * (v.settled && !v.capstoned?.arrears ? 0.2 : 1);
  const held = v.settled && !v.capstoned?.arrears;
  // The marks: in card units (the crop is cw × ch), drawn at a size that reads at 64 px.
  const k = cw / 64;
  let over = `<rect x="${cx}" y="${cy}" width="${cw}" height="${ch}" style="fill:rgb(var(--s-hz))" opacity="${f(Math.pow(pfv, 1.2) * 0.55)}"/>`;
  if (held) over += `<rect x="${cx}" y="${cy}" width="${cw}" height="${ch}" style="fill:rgb(var(--s-held,236,226,190))" opacity=".38"/>`;
  if (v.capstoned && held) {
    const w = 30 * k, h = 9 * k, x = cx + cw / 2 - w / 2, y = cy + ch - h - 3 * k;
    over += `<rect x="${f(x)}" y="${f(y)}" width="${f(w)}" height="${f(h)}" rx="${f(h / 2)}" style="fill:var(--s-paper);stroke:var(--s-ink)" stroke-width="${f(k * 0.7)}"/>` +
      `<rect x="${f(x + k)}" y="${f(y + k)}" width="${f(w - 2 * k)}" height="${f(h - 2 * k)}" rx="${f(h / 2 - k)}" style="fill:none;stroke:var(--s-ink)" stroke-width="${f(k * 0.35)}"/>` +
      `<text x="${f(cx + cw / 2)}" y="${f(y + h * 0.68)}" text-anchor="middle" style="fill:var(--s-ink);font:italic ${f(5.2 * k)}px Georgia,serif">Settled ${esc(String(v.capstoned.year ?? ''))}</text>`;
  }
  if (v.preview) {
    const s = 12 * k;
    over += `<path d="M${cx} ${cy}h${f(s)}L${cx} ${f(cy + s)}Z" style="fill:var(--s-paper);stroke:var(--s-ink)" stroke-width="${f(k * 0.5)}" stroke-dasharray="${f(k)} ${f(k * 0.8)}"/>` +
      `<text x="${f(cx + s * 0.28)}" y="${f(cy + s * 0.42)}" text-anchor="middle" style="fill:var(--s-ink);font:italic 700 ${f(4.6 * k)}px Georgia,serif">P</text>`;
  }
  if (warning(v)) over += `<circle cx="${f(cx + cw - 5 * k)}" cy="${f(cy + 5 * k)}" r="${f(3 * k)}" style="fill:var(--bad,#b3261e);stroke:var(--s-paper)" stroke-width="${f(k * 0.8)}"/>`;
  const w = o.width ?? 64, h = o.height ?? 40;
  const css = o.standalone ? `<style>${(drawingCss() + st.css).replace(/<\/style/gi, '')}\n.scn-pc .scn{--sw:.55}.scn-pc *{vector-effect:non-scaling-stroke;stroke-linejoin:round;stroke-linecap:round}</style>` : '';
  return `<svg xmlns="http://www.w3.org/2000/svg" class="scn-pc" viewBox="${cx} ${cy} ${cw} ${ch}" width="${f(w)}" height="${f(h)}" preserveAspectRatio="xMidYMid slice" role="img" aria-hidden="true">${css}` +
    `<g class="scn" data-look="${look}"><defs>${st.defs(pf)}</defs><rect x="${cx}" y="${cy}" width="${cw}" height="${ch}" style="fill:var(--s-sky0)"/>` +
    `${bd.sky ?? ''}${bd.far ?? ''}${bd.mid ?? ''}${bd.near ?? ''}${bd.cut ?? ''}${marks}${over}</g></svg>`;
}

function place(sl: Slot, l: ReturnType<typeof layoutFor>, look: string, pageLook: string, stage: number, pf: string, hl: (s: number) => number): string {
  const s = sl.s ?? depthScale(l, sl.y) * (sl.k ?? 1);
  const a: PropArgs = { s, v: sl.v ?? 0.5, stage, w: sl.w ?? 0, h: sl.h ?? 0, r: rng(hash(`${sl.x},${sl.y}`)), overlay: false,
    u: (x) => `url(#${pf}${x})`, hatch: (lv = 0) => `url(#${pf}${lv ? 'x' : 'h'}${hl(s)})` };
  let inner = '';
  try { inner = propFor(l.look, pageLook, sl.p)(a, { fx: () => {} }); } catch { inner = ''; }
  void look;
  return `<g transform="translate(${f(sl.x)} ${f(sl.y)}) scale(${sl.flip ? -s : s} ${s})">${inner}</g>`;
}
