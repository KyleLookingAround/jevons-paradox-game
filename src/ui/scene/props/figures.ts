// M3: the cast as small figures in the foreground, the way an engraver stood a few people at the front of a view.
// Each figure is drawn about its feet (y up is negative), about 30 units tall, with the style's shared classes, so
// it is an engraved gentleman under `ledger`, a keylined silhouette under `gaslight`, an airbrushed figure under
// `chrome`, a wireframe under `terminal` and a neon-rimmed shape in the rain under `cyberpunk`. Dress follows the Age.
// Keys are CastDef.figure values (content) and two of the scene's own ('proprietor', 'paperboy'); unknown keys draw
// nothing. The proprietor's arm is returned separately so it can lift his watch (a composited rotation).
import { P, C, R, E, f } from '../svg';

type Era = 'victorian' | 'mid' | 'eighties' | 'night';
const eraOf = (look: string): Era => (look === 'chrome' ? 'mid' : look === 'terminal' ? 'eighties' : look === 'cyberpunk' || look === 'agentic' ? 'night' : 'victorian');

interface Kit { hat: 'top' | 'bowler' | 'cap' | 'bonnet' | 'trilby' | 'none' | 'hood' | 'cloche'; skirt?: boolean; stout?: boolean; hold?: 'notebook' | 'book' | 'basket' | 'brochure' | 'box' | 'cane' | 'paper' | 'screen' | 'none'; coat?: 'long' | 'short'; small?: boolean; accent?: boolean }

/** Who wears what, by cast key (aliases included so content can name roles or people). */
const CAST: Record<string, Kit> = {
  correspondent: { hat: 'bowler', hold: 'notebook', coat: 'short' },
  reporter: { hat: 'bowler', hold: 'notebook', coat: 'short' },
  whitlow: { hat: 'top', hold: 'book', coat: 'long' },
  economist: { hat: 'top', hold: 'book', coat: 'long' },
  fenwick: { hat: 'bonnet', skirt: true, hold: 'basket' },
  reformer: { hat: 'bonnet', skirt: true, hold: 'basket' },
  pryce: { hat: 'bowler', hold: 'brochure', coat: 'short', accent: true },
  motorist: { hat: 'bowler', hold: 'brochure', coat: 'short', accent: true },
  salesman: { hat: 'bowler', hold: 'brochure', coat: 'short', accent: true },
  ashworth: { hat: 'bowler', stout: true, hold: 'book', coat: 'short' }, // the engineer, with his drawings
  millowner: { hat: 'top', stout: true, hold: 'cane', coat: 'long' },
  industrialist: { hat: 'top', stout: true, hold: 'cane', coat: 'long' },
  minister: { hat: 'top', hold: 'box', coat: 'long', accent: true },
  official: { hat: 'top', hold: 'box', coat: 'long', accent: true },
  engineer: { hat: 'cap', hold: 'book', coat: 'short' },
  proprietor: { hat: 'top', hold: 'none', coat: 'long' },
  paperboy: { hat: 'cap', hold: 'paper', coat: 'short', small: true },
};

export const FIGURE_KEYS = Object.keys(CAST);
export const hasFigure = (key: string): boolean => Object.prototype.hasOwnProperty.call(CAST, key);

/** The Age's version of a hat (a top hat in 1840 is a trilby in 1955 and nothing at all in 1985). */
function hatFor(k: Kit, era: Era): Kit['hat'] {
  if (era === 'victorian') return k.hat;
  if (era === 'mid') return k.hat === 'bonnet' ? 'cloche' : k.hat === 'cap' ? 'cap' : 'trilby';
  if (era === 'eighties') return k.hat === 'cap' ? 'cap' : 'none';
  return k.hat === 'cap' ? 'cap' : 'hood';
}

function hat(h: Kit['hat'], hx: number, hy: number): string {
  switch (h) {
    case 'top': return R(hx - 2.6, hy - 9, 5.2, 6.4, 'd') + P(`M${f(hx - 4.2)} ${f(hy - 2.4)}h8.4`, 'k K');
    case 'bowler': return P(`M${f(hx - 3.9)} ${f(hy - 2.2)}h7.8M${f(hx - 2.7)} ${f(hy - 2.4)}a2.7 2.9 0 0 1 5.4 0z`, 'd k');
    case 'trilby': return P(`M${f(hx - 4.2)} ${f(hy - 2.2)}h8.4M${f(hx - 2.6)} ${f(hy - 2.4)}l.5 -3.2h4.2l.5 3.2z`, 'd k');
    case 'cap': return P(`M${f(hx - 2.8)} ${f(hy - 2.2)}a2.8 2 0 0 1 5.6 0l1.8 .6z`, 'd k');
    case 'bonnet': return P(`M${f(hx - 3.4)} ${f(hy + 1.2)}Q${f(hx - 3.6)} ${f(hy - 4.4)} ${f(hx + 0.4)} ${f(hy - 4)}Q${f(hx + 3.8)} ${f(hy - 3.4)} ${f(hx + 3)} ${f(hy + 0.6)}`, 'b2 k');
    case 'cloche': return P(`M${f(hx - 3.2)} ${f(hy - 0.4)}a3.2 3.4 0 0 1 6.4 0z`, 'ac k');
    case 'hood': return P(`M${f(hx - 3.4)} ${f(hy + 2)}Q${f(hx - 3.4)} ${f(hy - 4.6)} ${f(hx)} ${f(hy - 4.4)}Q${f(hx + 3.4)} ${f(hy - 4.6)} ${f(hx + 3.4)} ${f(hy + 2)}`, 'd k');
    default: return P(`M${f(hx - 2.4)} ${f(hy - 1.4)}q2.4 -2 4.8 0`, 'k K');
  }
}

export interface FigureArt { body: string; arm?: { x: number; y: number; svg: string } }

/** A figure for a cast key in a look, or null for a key the scene does not know. */
export function figureArt(key: string, look: string): FigureArt | null {
  const k = CAST[key];
  if (!k) return null;
  const era = eraOf(look);
  const s = k.small ? 0.78 : 1;
  const w = (k.stout ? 4.6 : 3.4) * s, top = -21 * s, hy = -24.5 * s;
  let b = '';
  // Shadow on the ground.
  b += E(0, 0, 7 * s, 1.2, 'cs');
  if (k.skirt) {
    b += P(`M${f(-5.4 * s)} 0Q${f(-4 * s)} ${f(-9 * s)} ${f(-2.8 * s)} ${f(top + 3)}H${f(2.8 * s)}Q${f(4 * s)} ${f(-9 * s)} ${f(5.4 * s)} 0Z`, era === 'night' ? 'd k' : 'b2 k');
  } else {
    // Legs, then the coat (long to the knee or short to the hip).
    b += P(`M${f(-1.8 * s)} 0V${f(-10 * s)}M${f(1.6 * s)} 0V${f(-10 * s)}`, 'k K');
    const hem = k.coat === 'long' ? -6.5 * s : -10 * s;
    b += P(`M${f(-w)} ${f(hem)}L${f(-w + 0.6)} ${f(top + 2)}Q0 ${f(top - 0.6)} ${f(w - 0.6)} ${f(top + 2)}L${f(w)} ${f(hem)}Z`, era === 'mid' ? 'ac k' : 'd k');
    b += P(`M0 ${f(top + 1)}V${f(hem)}`, 'k k2');
  }
  // Head and hat.
  b += C(0, hy, 2.6 * s, 'b k');
  b += hat(hatFor(k, era), 0, hy - 1.6 * s);
  // What they hold (on the right arm, in front).
  const hx = w + 1.2, hyy = -13 * s;
  b += P(`M${f(w - 0.6)} ${f(top + 2.4)}L${f(hx)} ${f(hyy)}`, 'k K');
  switch (era === 'night' && k.hold !== 'paper' ? 'screen' : k.hold) {
    case 'notebook': b += R(hx - 0.6, hyy - 4.4, 3.6, 4.4, 'b k') + P(`M${f(hx + 0.2)} ${f(hyy - 3.2)}h2M${f(hx + 0.2)} ${f(hyy - 2)}h2`, 'k k2'); break;
    case 'book': b += R(hx - 1, hyy - 1.2, 4.6, 3, 'ac k'); break;
    case 'basket': b += P(`M${f(hx - 1.6)} ${f(hyy)}h5l-.8 3.6h-3.4zM${f(hx - 0.8)} ${f(hyy)}a1.6 2.2 0 0 1 3.2 0`, 'b2 k'); break;
    case 'brochure': b += P(`M${f(hx)} ${f(hyy - 5)}l4 -.6v5l-4 .6z`, 'ac k'); break;
    case 'box': b += R(hx - 1.4, hyy - 1.2, 5.4, 3.6, 'ac k') + P(`M${f(hx + 0.4)} ${f(hyy - 1.2)}v-1h1.8v1`, 'k'); break;
    case 'cane': b += P(`M${f(hx)} ${f(hyy)}L${f(hx + 2.4)} 0`, 'k K'); break;
    case 'paper': b += P(`M${f(hx - 0.6)} ${f(hyy - 6)}h4.4v5.4h-4.4z`, 'b k') + P(`M${f(hx)} ${f(hyy - 5)}h3.2M${f(hx)} ${f(hyy - 3.8)}h3.2M${f(hx)} ${f(hyy - 2.6)}h2`, 'k k2') +
      P(`M${f(-w - 0.4)} ${f(top + 4)}l-2.4 7h4.4z`, 'b2 k'); break;
    case 'screen': b += R(hx - 0.4, hyy - 4.4, 3.4, 4.8, 'lit k'); break;
    default: break;
  }
  if (key !== 'proprietor') return { body: b };
  // The proprietor: a watch chain across the waistcoat, and his left arm (separate, so it can lift the watch).
  b += P(`M${f(-w + 1.2)} ${f(top + 6)}q${f(w - 1.2)} 2.4 ${f(w * 2 - 2.4)} 0`, 'ac k2');
  const ax = -w + 0.6, ay = top + 2.4;
  const arm = P('M0 0L-1.8 8.6', 'k K') + C(-1.8, 9.4, 1.3, 'ac k');
  return { body: b, arm: { x: ax, y: ay, svg: arm } };
}
