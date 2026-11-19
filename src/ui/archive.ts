// M3: the Archive (ModelApi.archiveViews): the real history behind things in the game, found as they are first owned or
// seen, kept for good. A sheet to browse: by Industry, newest first, unread marked, a search and a filter; each note a
// title until opened (the text and its sources are built on the first open). Notes not yet found are greyed titles,
// folded at the end of their Industry. Read marks are the page's own (prefs.archiveRead), never in the save.
import type { Ctx } from './ctx';
import { sectorIds } from './ctx';
import type { ArchiveDef, ArchiveView, Content, SectorId } from '../types';
import { chunkKnown, loadChunk } from './chunks';
import { h, setText, show, cls } from './dom';
import { fmt } from './fmt';
import { getPrefs, setPrefs, isOpen, setOpen } from './prefs';
import type { Sheets } from './sheets';

/** The Industry a note belongs to, from its subject's content (a sector, or a thing with a sector); else general. */
export function noteGroup(ctx: Ctx, subject: string): SectorId | '' {
  const c = ctx.content;
  if (c.sectors?.[subject]) return subject;
  const u = c.upgrades?.find((x) => x.id === subject) ?? c.levers?.find((x) => x.id === subject);
  if (u) return u.sector;
  for (const id of sectorIds(c)) {
    const d = c.sectors[id];
    if (d.applications?.some((a) => a.id === subject) || d.seams?.some((x) => x.id === subject)) return id;
  }
  const cm = c.commons?.find((x) => x.id === subject);
  if (cm?.sector) return cm.sector;
  const dp = c.dispatches?.find((x) => x.id === subject);
  if (dp?.sector) return dp.sector;
  const ch = c.charters?.find((x) => x.id === subject);
  if (ch?.sector) return ch.sector;
  return '';
}

/** Unread notes: worked out only when the notes found or the read marks change (it is asked for every frame). */
let unreadMemo = { arc: null as object | null, read: null as readonly string[] | null, n: 0 };
export function archiveUnread(ctx: Ctx): number {
  if (!ctx.d?.features?.archive || typeof ctx.model.archiveViews !== 'function') return 0;
  const arc = ctx.state.meta?.archive ?? {};
  const readList = getPrefs().archiveRead;
  if (unreadMemo.arc === arc && unreadMemo.read === readList) return unreadMemo.n;
  const read = new Set(readList);
  let n = 0;
  for (const id of Object.keys(arc)) if (!read.has(id)) n++;
  unreadMemo = { arc, read: readList, n };
  return n;
}

function markRead(id: string): void {
  const r = getPrefs().archiveRead;
  if (r.includes(id)) return;
  setPrefs({ archiveRead: [...r, id].slice(-600) });
}

/**
 * The notes' text and sources are a lazy part in the production build (build.ts splits them from the notes' ids and
 * subjects, which the core's rules read, into the 'archiveText' chunk). Fill them in before the sheet first opens; the
 * source build (tests, the mock) already has them. Resolves false if they could not be fetched (offline on a first visit).
 */
let textIn = false;
export function ensureArchiveText(content: Content): Promise<boolean> {
  const notes = content.archive ?? [];
  if (textIn || !notes.some((n) => !n.text)) { textIn = true; return Promise.resolve(true); }
  if (!chunkKnown('archiveText')) return Promise.resolve(false);
  return loadChunk<Record<string, [string, ArchiveDef['sources']]>>('archiveText').then((map) => {
    for (const n of notes) { const t = map[n.id]; if (t && !n.text) Object.assign(n, { text: t[0], sources: t[1] }); }
    textIn = true;
    return true;
  }, () => false);
}

export function archiveSheet(ctx: Ctx, sheets: Sheets, onChange?: () => void): void {
  if (!textIn) {
    void ensureArchiveText(ctx.content).then((ok) => { textIn = textIn || ok; textTried = true; archiveSheetNow(ctx, sheets, onChange); });
    return;
  }
  archiveSheetNow(ctx, sheets, onChange);
}
let textTried = false;

function archiveSheetNow(ctx: Ctx, sheets: Sheets, onChange?: () => void): void {
  let views: ArchiveView[] = [];
  try { views = ctx.model.archiveViews(ctx.state, ctx.content); } catch { views = []; }
  sheets.open('archive', (b) => {
    const read = new Set(getPrefs().archiveRead);
    const found = views.filter((v) => v.unlocked);
    b.append(h('p', { class: 'arc-lead', text: 'The real history behind the things in this game, filed by the Gazette as each is first met. Every note gives its sources.' }));
    if (!textIn && textTried) b.append(h('p', { class: 'muted small', text: 'The notes themselves could not be fetched: the titles are here, the text will follow when the page is next online.' }));
    const q = h('input', { class: 'arc-q', type: 'search', placeholder: 'Search the archive', 'aria-label': 'Search the archive', autocomplete: 'off', spellcheck: 'false' }) as HTMLInputElement;
    const count = h('p', { class: 'arc-count num muted' });
    // Filters: unread, everything, or one Industry (only those with something found).
    const groups: (SectorId | '')[] = [...sectorIds(ctx.content), ''];
    const gName = (g: SectorId | '') => (g ? ctx.content.sectors[g]?.name ?? g : 'General');
    const byGroup = new Map<SectorId | '', ArchiveView[]>();
    for (const v of views) { const g = noteGroup(ctx, v.subject); const l = byGroup.get(g) ?? []; l.push(v); byGroup.set(g, l); }
    const present = groups.filter((g) => (byGroup.get(g) ?? []).some((v) => v.unlocked));
    let filter: string = found.some((v) => !read.has(v.id)) ? 'unread' : 'all';
    const chips = h('div', { class: 'od-chips arc-chips', role: 'radiogroup', 'aria-label': 'Show' });
    const chipEls: { k: string; b: HTMLButtonElement }[] = [];
    const mkChip = (k: string, label: string) => {
      const btn = h('button', { class: 'chip-t', type: 'button', role: 'radio', onclick: () => { filter = k; apply(); } }, label) as HTMLButtonElement;
      chipEls.push({ k, b: btn }); chips.append(btn);
    };
    mkChip('unread', 'Unread'); mkChip('all', 'All');
    for (const g of present) mkChip('g:' + g, gName(g));
    b.append(h('div', { class: 'arc-tools' }, q, chips), count);

    const rows: { v: ArchiveView; el: HTMLElement; g: SectorId | ''; hay: string }[] = [];
    const sections: { g: SectorId | ''; el: HTMLElement; lockedEl: HTMLElement | null }[] = [];
    const list = h('div', { class: 'arc-list' });
    for (const g of groups) {
      const all = byGroup.get(g) ?? [];
      if (!all.length) continue;
      const got = all.filter((v) => v.unlocked).sort((a, z) => (z.at ?? 0) - (a.at ?? 0));
      const locked = all.filter((v) => !v.unlocked);
      const sec = h('section', { class: 'arc-g' }, h('h3', { class: 'arc-gh' }, gName(g), h('span', { class: 'num muted', text: ` ${fmt(got.length)} of ${fmt(all.length)}` })));
      for (const v of got) {
        const dot = h('span', { class: 'arc-dot', 'aria-label': 'unread' });
        const sum = h('summary', { class: 'arc-s' }, dot, h('span', { class: 'arc-t', text: v.title }), h('span', { class: 'arc-sub muted', text: [v.date, v.subjectName].filter(Boolean).join(' · ') }));
        const det = h('details', { class: 'arc-note' + (read.has(v.id) ? '' : ' unread') }, sum) as HTMLDetailsElement;
        let built = false;
        det.addEventListener('toggle', () => {
          if (!det.open) return;
          if (!built) {
            built = true;
            det.append(h('div', { class: 'arc-body' }, h('p', { class: 'arc-text', text: v.text }),
              h('ul', { class: 'arc-src' }, ...v.sources.map((s) => h('li', null,
                s.url ? h('a', { href: s.url, target: '_blank', rel: 'noopener noreferrer', text: s.cite }) : s.cite,
                h('span', { class: 'arc-grade muted', title: s.grade === 'V' ? 'Verified against a primary or scholarly source' : 'A reputable secondary source', text: s.grade === 'V' ? ' verified' : ' secondary' }))))));
          }
          if (det.classList.contains('unread')) { det.classList.remove('unread'); markRead(v.id); updCount(); onChange?.(); }
        });
        sec.append(det);
        rows.push({ v, el: det, g, hay: `${v.title} ${v.subjectName} ${v.date} ${v.text}`.toLowerCase() });
      }
      let lockedEl: HTMLElement | null = null;
      if (locked.length) {
        const key = `arc.locked.${g || 'general'}`;
        const d = h('details', { class: 'fold arc-locked' }, h('summary', { class: 'fold-s', text: `Not yet found, ${fmt(locked.length)}` }),
          h('ul', null, ...locked.map((v) => h('li', { class: 'muted', text: v.title })))) as HTMLDetailsElement;
        d.open = isOpen(key, false);
        d.addEventListener('toggle', () => setOpen(key, d.open));
        sec.append(d);
        lockedEl = d;
      }
      list.append(sec);
      sections.push({ g, el: sec, lockedEl });
    }
    const empty = h('p', { class: 'muted arc-empty', hidden: true });
    b.append(list, empty);

    function updCount(): void {
      const un = found.filter((v) => !getPrefs().archiveRead.includes(v.id)).length;
      setText(count, `${fmt(found.length)} of ${fmt(views.length)} notes found${un ? ` · ${fmt(un)} unread` : ''}`);
    }
    function apply(): void {
      const term = q.value.trim().toLowerCase();
      const readNow = new Set(getPrefs().archiveRead);
      let shown = 0;
      for (const r of rows) {
        const ok = (!term || r.hay.includes(term)) && (filter === 'all' || (filter === 'unread' ? !readNow.has(r.v.id) || r.el.hasAttribute('open') : filter === 'g:' + r.g));
        show(r.el, ok); if (ok) shown++;
      }
      for (const s of sections) {
        const any = rows.some((r) => r.g === s.g && !r.el.hidden);
        const mine = filter === 'g:' + s.g;
        show(s.el, any || (mine && !term));
        if (s.lockedEl) show(s.lockedEl, !term && (filter === 'all' || mine));
      }
      for (const c of chipEls) { const on = c.k === filter; c.b.setAttribute('aria-checked', String(on)); cls(c.b, 'on', on); }
      show(empty, shown === 0);
      setText(empty, term ? 'Nothing in the archive matches.' : filter === 'unread' ? 'Every note found has been read.' : 'Nothing found here yet.');
    }
    q.addEventListener('input', apply);
    updCount();
    apply();
  }, { label: 'The Archive', cls: 'archive-sheet full-ish' });
}
