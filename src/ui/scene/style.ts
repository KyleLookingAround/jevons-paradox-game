// ART STYLES: the drawing idiom of an Age. A style owns how things are drawn (line, fill, texture, lettering, sky and
// weather treatment, framing) and a library of prop variants; a Layout owns where things are. A new Age gets a new
// style; a new Industry within an Age reuses its style with a different place (a new Layout).
//
// The engine sets `data-look="<style id>"` on the scene root and renders the style's CSS, defs and plate. Props draw
// with the shared classes (.b body, .b2 shade, .rf roof, .k line, .K heavy line, .d ink, .w window, .lit lit window,
// .tr foliage, .wa water, .gd ground, .ac accent, .mt metal, .hz hatch fill, .gl glow) and may use style-specific ones.
import type { Prop } from './layout';
import { f } from './svg';

export interface PlateCtx {
  /** Layout caption ("The coal valley, looking towards the sea"). */
  caption: string;
  /** Industry name as shown on screen. */
  name: string;
  /** `url(#…)` for a def of this scene instance. */
  u(id: string): string;
}

export interface ArtStyle {
  /** Key used for data-look and for prop lookups. */
  id: string;
  /** What it imitates, for documentation ("Steel engraving from an illustrated paper, 1840s"). */
  idiom: string;
  /**
   * CSS for this style, every selector scoped under `.scn[data-look=<id>]` (or to classes only this style uses).
   * Must define the --s-* tokens: paper, ink, b, b2, rf, w, lit, tr, wa, gd, gd2, sp, ac, ac2, mt, smk (rgb), hz (rgb),
   * mist (rgb), fog (rgb), sun, sky0/sky0b (clean sky), sky1/sky1b (smog sky), sky2/sky2b (Steady State sky), sv
   * (survey), hatch, glow (rgb), frame, btxt (banner text).
   */
  css: string;
  /** SVG defs. Must define (prefixed) h0–h3 and x0–x3 (hatch and cross-hatch by depth), glow, pool, cyan, fade. */
  defs(p: string): string;
  /** Prop variants in this idiom. Lookup falls back to shared props, then any style, then a generic works. */
  props: Record<string, Prop>;
  /** Landscape washes that move with pressure (0–1) and clearing (0–1): [--s-wash, --s-water]. */
  wash?(pf: number, clear: number): [string, string] | null;
  /** Smog strength over the far, mid and near bands (default [.85, .55, .32]) and signal-noise overlay strength. */
  weather?: { hz?: [number, number, number]; noise?: number };
  /** SVG drawn over the whole picture (a border, a title, HUD lettering). Static per build; pointer-events none. */
  plate?(c: PlateCtx): string;
  /** HTML caption under the picture (an engraving's legend). */
  legend?(c: PlateCtx): string;
  /** Extra HTML layers above the picture, e.g. rain; animate with transform/opacity only. */
  layers?: string;
  /** SVG markup for a noise overlay whose opacity follows pressure × weather.noise. */
  noise?: string;
}

/* ------------------------------------------------------------------ */
/* Def helpers                                                         */
/* ------------------------------------------------------------------ */

export function lineHatch(p: string, id: string, sp: number, sw: number, ang: number, op: number, colour = 'var(--s-hatch)'): string {
  return `<pattern id="${p}${id}" patternUnits="userSpaceOnUse" width="${sp}" height="${sp}" patternTransform="rotate(${ang})">` +
    `<line x1="0" y1="0" x2="0" y2="${sp}" style="stroke:${colour}" stroke-width="${f(sw)}" stroke-opacity="${op}"/></pattern>`;
}
export function crossHatch(p: string, id: string, sp: number, sw: number, op: number, colour = 'var(--s-hatch)'): string {
  return `<pattern id="${p}${id}" patternUnits="userSpaceOnUse" width="${sp}" height="${sp}" patternTransform="rotate(45)">` +
    `<path d="M0 0V${sp}M0 0H${sp}" style="stroke:${colour}" stroke-width="${f(sw)}" stroke-opacity="${op}" fill="none"/></pattern>`;
}
export function flatFill(p: string, id: string, c: string): string {
  return `<pattern id="${p}${id}" patternUnits="userSpaceOnUse" width="4" height="4"><rect width="4" height="4" fill="${c}"/></pattern>`;
}
/** Dots on a grid (stipple, halftone). */
export function dots(p: string, id: string, sp: number, r: number, colour: string, op = 1, offset = true): string {
  const st = `style="fill:${colour}" fill-opacity="${op}"`;
  const o = offset ? `<circle cx="${f(sp)}" cy="${f(sp)}" r="${f(r)}" ${st}/>` : '';
  return `<pattern id="${p}${id}" patternUnits="userSpaceOnUse" width="${f(sp * 2)}" height="${f(sp * 2)}">` +
    `<circle cx="0" cy="0" r="${f(r)}" ${st}/>${o}` +
    `<circle cx="${f(sp * 2)}" cy="0" r="${f(r)}" ${st}/><circle cx="0" cy="${f(sp * 2)}" r="${f(r)}" ${st}/>` +
    `<circle cx="${f(sp * 2)}" cy="${f(sp * 2)}" r="${f(r)}" ${st}/></pattern>`;
}
/** The glows every style must define. */
export function glowDefs(p: string, cyan = '#5fd0e0'): string {
  return `<radialGradient id="${p}glow"><stop offset="0" style="stop-color:rgb(var(--s-glow))" stop-opacity=".95"/><stop offset=".35" style="stop-color:rgb(var(--s-glow))" stop-opacity=".45"/><stop offset="1" style="stop-color:rgb(var(--s-glow))" stop-opacity="0"/></radialGradient>` +
    `<radialGradient id="${p}pool"><stop offset="0" style="stop-color:rgb(var(--s-glow))" stop-opacity=".5"/><stop offset="1" style="stop-color:rgb(var(--s-glow))" stop-opacity="0"/></radialGradient>` +
    `<radialGradient id="${p}cyan"><stop offset="0" stop-color="${cyan}" stop-opacity=".9"/><stop offset="1" stop-color="${cyan}" stop-opacity="0"/></radialGradient>` +
    `<linearGradient id="${p}fade" x1="0" y1="0" x2="0" y2="1"><stop offset="0" style="stop-color:var(--s-hatch)" stop-opacity="0"/><stop offset="1" style="stop-color:var(--s-hatch)" stop-opacity=".25"/></linearGradient>`;
}
export function engravingHatches(p: string): string {
  let d = '';
  ([[0, 2.6], [1, 3.6], [2, 5], [3, 7]] as const).forEach(([i, sp]) => {
    d += lineHatch(p, `h${i}`, sp, sp * 0.24, 45, 0.6) + crossHatch(p, `x${i}`, sp, sp * 0.2, 0.55);
  });
  return d;
}
