// Transient notes: one quiet line in the header, under the gauges (the broadsheet's "late extra"), never over a control
// or a gauge. One note at a time; the rest wait in a short queue. The line's height is reserved whether or not a note
// shows (it carries the gauges' own quiet line when idle), so a note never moves the page under a thumb. The "New" mark
// on the thing itself (unfold.ts) does most of the work; a note only says where to look.
import { h, svg, setText, show, cls } from './dom';
import { UI_ICONS } from './icons';

export interface NoteAction { label: string; run: () => void }
export interface Notes {
  el: HTMLElement;
  /** Queue a note; returns a function that withdraws it (from the queue, or from the line if showing). */
  push(text: string, action?: NoteAction, ms?: number): () => void;
  /** Whether a note is on show now (the line hides the gauges' quiet line while it is). */
  showing(): boolean;
}

interface Item { text: string; action?: NoteAction; ms: number; dead: boolean }

/** Notes waiting beyond this are dropped, oldest first (they are stale by the time they would show). */
const QUEUE_MAX = 4;
/** While others wait, a note on show gives way after this long. */
const HURRY_MS = 3000;

export function buildNotes(onChange: (showing: boolean) => void): Notes {
  const txt = h('span', { class: 'note-t' });
  const act = h('button', { class: 'note-a linkish', type: 'button', hidden: true });
  const x = h('button', { class: 'note-x', type: 'button', 'aria-label': 'Dismiss the note' });
  x.append(svg(UI_ICONS.close));
  // One line: a long name ends in an ellipsis on a narrow phone (the whole note is in the title and read out).
  const el = h('div', { class: 'note-slot', role: 'status', 'aria-live': 'polite', 'data-clip': 'ok', hidden: true }, txt, act, x);
  const queue: Item[] = [];
  let cur: Item | null = null;
  let timer = 0, held = false, shownAt = 0;

  function arm(ms: number): void {
    clearTimeout(timer);
    if (!held) timer = window.setTimeout(next, ms);
  }
  function next(): void {
    clearTimeout(timer);
    cur = null;
    let it: Item | undefined;
    while ((it = queue.shift()) && it.dead) { /* skip withdrawn */ }
    if (!it) { show(el, false); cls(el, 'in', false); onChange(false); return; }
    cur = it;
    shownAt = Date.now();
    setText(txt, it.text);
    el.title = it.text;
    show(act, !!it.action);
    if (it.action) setText(act, it.action.label);
    show(el, true);
    cls(el, 'in', false); void el.offsetWidth; cls(el, 'in', true);
    onChange(true);
    arm(queue.some((q) => !q.dead) ? Math.min(it.ms, HURRY_MS) : it.ms);
  }
  act.addEventListener('click', () => { const a = cur?.action; next(); a?.run(); });
  x.addEventListener('click', () => next());
  el.addEventListener('pointerenter', () => { held = true; clearTimeout(timer); });
  el.addEventListener('pointerleave', () => { held = false; arm(2500); });
  el.addEventListener('focusin', () => { held = true; clearTimeout(timer); });
  el.addEventListener('focusout', () => { held = false; arm(2500); });

  function push(text: string, action?: NoteAction, ms?: number): () => void {
    // The same note twice (a second tap of the same thing) is one note.
    if (cur && !cur.dead && cur.text === text) return () => { if (cur?.text === text) next(); };
    const dup = queue.find((q) => !q.dead && q.text === text);
    if (dup) return () => { dup.dead = true; };
    const it: Item = { text, action, ms: ms ?? (action ? 8000 : 4500), dead: false };
    queue.push(it);
    while (queue.filter((q) => !q.dead).length > QUEUE_MAX) { const old = queue.find((q) => !q.dead); if (old) old.dead = true; }
    if (!cur) next();
    // Someone is waiting: the note on show gives way soon (but is read for a moment first).
    else if (!held) { const t = Date.now() - shownAt; arm(Math.max(1200, Math.min(cur.ms - t, HURRY_MS - t))); }
    return () => { if (cur === it) next(); else it.dead = true; };
  }
  return { el, push, showing: () => !!cur };
}
