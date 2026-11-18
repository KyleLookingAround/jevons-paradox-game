// Home Screen install: a web app manifest and icons, made in the page.
//
// build.ts copies only index.html, app.js and styles.css into dist/, so a manifest file or icon files cannot reach the
// deployed site without a build change. Instead the icon is drawn here as SVG, rasterised to PNG on a canvas (192, 512
// and Apple's 180), and the manifest is set from script as a data: URL with an absolute start_url. If rasterising fails
// the manifest falls back to the SVG icon. Nothing remote is fetched.

const BG = '#efe6d0', INK = '#2a1f15', RED = '#a3231a', RULE = 'rgba(62,92,140,.28)';

/** The icon: a ledger-paper dial whose needle has swung into the red. Drawn inside the maskable safe zone. */
export function iconSvg(): string {
  const cx = 256, cy = 318, r = 150;
  const at = (t: number, rr = r) => { const th = Math.PI * (1 - t); return [cx + rr * Math.cos(th), cy - rr * Math.sin(th)].map((v) => v.toFixed(1)).join(' '); };
  const arc = (t0: number, t1: number, rr = r) => `M${at(t0, rr)}A${rr} ${rr} 0 0 1 ${at(t1, rr)}`;
  const rules = [150, 206, 262, 374, 430].map((y) => `<line x1="0" x2="512" y1="${y}" y2="${y}" stroke="${RULE}" stroke-width="4"/>`).join('');
  const ticks = [0, 0.2, 0.4, 0.6, 0.8, 1].map((t) => `<path d="M${at(t, r - 24)}L${at(t, r - (t === 0.4 ? 58 : 42))}" stroke="${INK}" stroke-width="${t === 0.4 ? 10 : 6}" stroke-linecap="round"/>`).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">`
    + `<rect width="512" height="512" fill="${BG}"/>${rules}`
    + `<line x1="0" x2="512" y1="396" y2="396" stroke="${INK}" stroke-width="5"/><line x1="0" x2="512" y1="408" y2="408" stroke="${INK}" stroke-width="5"/>`
    + `<path d="${arc(0, 1)}" fill="none" stroke="${INK}" stroke-opacity=".14" stroke-width="30"/>`
    + `<path d="${arc(0.4, 1)}" fill="none" stroke="${RED}" stroke-opacity=".25" stroke-width="30"/>`
    + `<path d="${arc(0, 0.82)}" fill="none" stroke="${RED}" stroke-width="30"/>${ticks}`
    + `<path d="M${at(0.82, -18)}L${at(0.82, r - 14)}" stroke="${INK}" stroke-width="16" stroke-linecap="round"/>`
    + `<circle cx="${cx}" cy="${cy}" r="24" fill="${INK}"/></svg>`;
}

export function svgDataUrl(svg: string): string {
  return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
}

function rasterise(src: string, size: number): Promise<string | null> {
  return new Promise((resolve) => {
    try {
      const img = new Image();
      img.onload = () => {
        try {
          const c = document.createElement('canvas');
          c.width = c.height = size;
          const g = c.getContext('2d');
          if (!g) { resolve(null); return; }
          g.drawImage(img, 0, 0, size, size);
          resolve(c.toDataURL('image/png'));
        } catch { resolve(null); }
      };
      img.onerror = () => resolve(null);
      img.src = src;
    } catch { resolve(null); }
  });
}

function setLink(rel: string, href: string, extra: Record<string, string> = {}): void {
  let l = document.head.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`);
  if (!l) { l = document.createElement('link'); l.rel = rel; document.head.append(l); }
  for (const k in extra) l.setAttribute(k, extra[k]);
  l.href = href;
}

/** Add the manifest and touch icon. Safe to call once at start-up; failures leave the page as it was. */
export async function installManifest(): Promise<void> {
  try {
    const svg = svgDataUrl(iconSvg());
    const [p192, p512, p180] = await Promise.all([rasterise(svg, 192), rasterise(svg, 512), rasterise(svg, 180)]);
    const icons = p192 && p512
      ? [{ src: p192, sizes: '192x192', type: 'image/png', purpose: 'any' }, { src: p512, sizes: '512x512', type: 'image/png', purpose: 'any' },
        { src: p512, sizes: '512x512', type: 'image/png', purpose: 'maskable' }]
      : [{ src: svg, sizes: 'any', type: 'image/svg+xml', purpose: 'any' }];
    const start = location.href.split('#')[0].split('?')[0];
    const manifest = {
      name: 'Rebound', short_name: 'Rebound', id: start,
      description: 'An incremental game about Jevons paradox: every efficiency upgrade makes the world burn more.',
      start_url: start, scope: start.replace(/[^/]*$/, ''), display: 'standalone', orientation: 'any',
      background_color: BG, theme_color: BG, lang: 'en-GB', icons,
    };
    setLink('manifest', 'data:application/manifest+json;charset=utf-8,' + encodeURIComponent(JSON.stringify(manifest)));
    setLink('apple-touch-icon', p180 ?? svg);
  } catch { /* no manifest: the game runs regardless */ }
}
