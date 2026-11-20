// Style registry. A Layout names its style (Layout.look); unknown ids fall back to the page look, then 'generic'.
import type { ArtStyle } from '../style';
import type { Prop } from '../layout';
import { ledger } from './ledger';
import { gaslight } from './gaslight';
import { chrome } from './chrome';
import { terminal } from './terminal';
import { agentic } from './agentic';
import { cyberpunk } from './cyberpunk';
import { generic } from './generic';
import { foundry } from './foundry';
import { harbour } from './harbour';

const STYLES: Record<string, ArtStyle> = { ledger, gaslight, chrome, terminal, agentic, cyberpunk, generic, foundry, harbour };

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
