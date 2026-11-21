// Style registry. A Layout names its style (Layout.look); unknown ids fall back to the page look, then 'generic'.
import type { ArtStyle } from '../style';
import type { Prop } from '../layout';
import { ledger } from './ledger';
import { gaslight } from './gaslight';
import { chrome } from './chrome';
import { terminal } from './terminal';
import { cyberpunk } from './cyberpunk';
import { generic } from './generic';
import { foundry } from './foundry';
import { harbour } from './harbour';
import { seed } from './seed';

// M5: `agentic` (the v1 Code look, styles/agentic.ts) is no longer registered: no layout draws in it (Code is `cyberpunk`),
// and a generic scene under that page look takes the `generic` style. Saved ~2.4 KB gz with its props for Plenty.
const STYLES: Record<string, ArtStyle> = { ledger, gaslight, chrome, terminal, cyberpunk, generic, foundry, harbour, seed };

export function registerStyle(style: ArtStyle): void {
  const old = STYLES[style.id];
  STYLES[style.id] = old ? { ...style, props: { ...old.props, ...style.props } } : style;
}
export function styleFor(id: string): ArtStyle | undefined {
  return Object.prototype.hasOwnProperty.call(STYLES, id) ? STYLES[id] : undefined;
}
export function allStyles(): ArtStyle[] {
  return Object.values(STYLES);
}
/** Add props to a style (creating an empty style shell that inherits generic CSS if it does not exist yet). */
export function addProps(id: string, props: Record<string, Prop>): void {
  const st = STYLES[id];
  if (st) st.props = { ...st.props, ...props };
  else STYLES[id] = { ...generic, id, idiom: id, css: '', props: { ...props } };
}
