// The pinned header keeps to about a third of the screen. On a phone held upright the header (top bar, tabs, dials,
// sparkline, reserve, the note line) is pinned over the feed; on a short screen (a small phone, a large text size) the
// sparkline, reserve and population move to the head of the feed, where they scroll with it, and the dials, the top bar
// and the note line stay pinned. Side by side (a desk, a phone on its side) the instruments are a column of their own
// beside the feed and keep everything (styles.css). Structure moves only when the layout changes (a resize, the text
// size, a line that wraps), never per tick. Display only: no game rules.

/** Share of the screen's height the pinned header may take. */
const THIRD = 1 / 3;
/** Moved back only when it fits with room to spare (no flapping at the boundary). */
const BACK_BELOW = 0.31;

export function fitLayout(cockpit: HTMLElement, feed: HTMLElement, gauges: HTMLElement, more: HTMLElement): () => void {
  let raf = 0, tightAt = 0;
  const html = document.documentElement;
  function fit(): void {
    raf = 0;
    const H = window.innerHeight || html.clientHeight || 0;
    if (!H) return;
    // Tighter dials are a last resort on the shortest screens, undone only when the window grows (not when the header
    // shrinks because of them).
    if (tightAt && H > tightAt) { tightAt = 0; html.classList.remove('tight-head'); }
    const cr = cockpit.getBoundingClientRect(), fr = feed.getBoundingClientRect();
    const beside = cr.right <= fr.left + 1;
    const inside = more.parentElement === gauges;
    if (beside) {
      if (!inside) gauges.append(more);
    } else if (inside) {
      if (cockpit.offsetHeight > H * THIRD + 2) feed.prepend(more);
    } else if (!tightAt && cockpit.offsetHeight + more.offsetHeight <= H * BACK_BELOW) {
      gauges.append(more);
    }
    const lean = more.parentElement !== gauges;
    html.classList.toggle('lean-head', lean);
    if (lean && !tightAt && cockpit.offsetHeight > H * THIRD + 2) { tightAt = H; html.classList.add('tight-head'); }
    if (!lean && tightAt) { tightAt = 0; html.classList.remove('tight-head'); }
  }
  const queue = (): void => { if (!raf) raf = requestAnimationFrame(fit); };
  try { if (typeof ResizeObserver === 'function') new ResizeObserver(queue).observe(cockpit); } catch { /* resize events only */ }
  window.addEventListener('resize', queue, { passive: true });
  window.addEventListener('orientationchange', queue, { passive: true });
  queue();
  return queue;
}
