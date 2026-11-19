// THE COUNTRY: one geography for every Industry. Steam, Light, Motion, Compute and Code are the same valley running
// down to the same estuary, seen from the same hill over 250 years, each redrawn in its Age's style. Every layout
// builds on this data rather than inventing its own land, so the hill line, the coast, the town site, the viaduct
// and the mills stand in the same places from tab to tab, and what an earlier Industry built (`SceneView.heritage`)
// still stands in the later pictures: the mills at dusk in Light, the viaduct and chimneys in Motion, server halls in
// the mill shells in Compute, the viaduct carrying the elevated railway in Code, the hills still behind the towers.
//
// Coordinates are the 600 × 400 viewBox in Steam's projection (horizon at about y 120). A layout whose horizon sits
// lower passes `dy` to shift the far features down; x never changes, so landmarks line up across the tabs.
import { f, ridge } from './svg';

export const COUNTRY = {
  /** The far hill line, west to east, falling to the sea at `coastX`. */
  hills: [[0, 108], [70, 92], [150, 104], [230, 88], [320, 100], [390, 94], [430, 108], [452, 121]] as [number, number][],
  /** A nearer, lower hill line across the valley. */
  hills2: [[0, 138], [60, 128], [130, 142], [200, 132], [270, 146], [340, 140], [400, 152], [440, 162], [462, 180]] as [number, number][],
  /** Where the land meets the sea; the estuary opens to the east of this. */
  coastX: 448,
  /** The sea horizon (Steam's projection). */
  seaY: 120,
  /** The railway viaduct across the valley (x from, x to; deck y in Steam's projection). */
  viaduct: [56, 440, 200] as [number, number, number],
  /** The mill town on the valley floor (x from, x to) and its church on the far slope. */
  mills: [222, 437] as [number, number],
  church: 214,
  /** The pit on the west hillside. */
  pitX: 70,
  /** The harbour on the estuary (x from). */
  harbourX: 446,
} as const;

/** The far hill line as a closed silhouette, shifted down by `dy`, closed to `bottom`. */
export function hills(dy = 0, bottom = 260): string {
  return ridge(COUNTRY.hills.map(([x, y]) => [x, y + dy] as [number, number]), bottom);
}
/** The far hill line as an open stroke (its crest only). */
export function hillCrest(dy = 0): string {
  const pts = COUNTRY.hills.map(([x, y]) => [x, y + dy] as [number, number]);
  return ridge(pts, 999).replace(/L[\d.]+ 999Z$/, '').replace(/^M[\d.]+ 999L/, 'M');
}
/** The nearer hill line, shifted by `dy`. */
export function hills2(dy = 0, bottom = 260): string {
  return ridge(COUNTRY.hills2.map(([x, y]) => [x, y + dy] as [number, number]), bottom);
}
/** The sea east of the coast, from its horizon (shifted by `dy`) down to `bottom`. */
export function sea(dy = 0, bottom = 220): string {
  const y = COUNTRY.seaY + dy;
  return `M${COUNTRY.coastX} ${f(y)}H600V${f(bottom)}H${COUNTRY.coastX + 22}C${COUNTRY.coastX + 14} ${f((y + bottom) / 2)} ${COUNTRY.coastX + 10} ${f(y + 30)} ${COUNTRY.coastX} ${f(y)}Z`;
}

/** Arches of the old viaduct between x0 and x1, deck at y, `h` tall: one closed path (piers and arches). */
export function viaductArches(x0: number, x1: number, y: number, h: number, span = 15): string {
  let d = '';
  const r = span * 0.32;
  for (let x = x0; x < x1 - 1; x += span) {
    d += `M${f(x)} ${f(y + h)}V${f(y)}H${f(x + span)}V${f(y + h)}H${f(x + span - 3)}V${f(y + h * 0.45)}A${f(r)} ${f(r)} 0 0 0 ${f(x + 3)} ${f(y + h * 0.45)}V${f(y + h)}Z`;
  }
  return d;
}

/** A row of mill shells with chimneys (a silhouette), n of them spread over the mill town, base at y, scale s. */
export function millShells(n: number, y: number, s: number, dyStack = 1): { body: string; windows: string; stacks: [number, number][] } {
  const [a, b] = COUNTRY.mills;
  let body = '', windows = '';
  const stacks: [number, number][] = [];
  for (let i = 0; i < n; i++) {
    const x = a + ((b - a) * (i + 0.5)) / Math.max(1, n) + ((i * 37) % 11) - 5;
    const w = (26 + ((i * 13) % 9)) * s, h = (16 + ((i * 7) % 6)) * s;
    body += `M${f(x - w / 2)} ${f(y)}V${f(y - h)}L${f(x)} ${f(y - h - 4 * s)}L${f(x + w / 2)} ${f(y - h)}V${f(y)}Z`;
    const cx = x + w / 2 + 3 * s, ch = (30 + ((i * 11) % 10)) * s * dyStack;
    body += `M${f(cx - 1.6 * s)} ${f(y)}V${f(y - ch)}h${f(3.2 * s)}V${f(y)}Z`;
    stacks.push([cx, y - ch]);
    for (let r = 0; r < 2; r++) for (let c = 0; c < 4; c++) windows += `M${f(x - w / 2 + 3 * s + c * (w - 6 * s) / 4)} ${f(y - h + 4 * s + r * 6 * s)}h${f(2.4 * s)}v${f(3 * s)}h${f(-2.4 * s)}z`;
  }
  return { body, windows, stacks };
}

/** How built-up an earlier Industry is (0–1), with a default for hosts that do not say: it was built. */
export function built(heritage: Record<string, number> | undefined, sector: string, dflt = 0.8): number {
  const v = heritage?.[sector];
  return typeof v === 'number' && Number.isFinite(v) ? Math.max(0, Math.min(1, v)) : dflt;
}
