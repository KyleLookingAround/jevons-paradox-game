// Keyboard shortcuts (the cheat-sheet is in the menu: SHORTCUTS in sheets.ts). They act through the same buttons the
// page shows, so they hold no rules of their own, and they never fire while typing in a field, with a modifier held,
// or while a sheet is open (Escape, which closes sheets, lives with the sheets).
import type { Ctx } from './ctx';
import { openSectors, reckoningOffered } from './ctx';
import type { UI } from './app';

function typing(t: EventTarget | null): boolean {
  const el = t as HTMLElement | null;
  if (!el || !(el instanceof HTMLElement)) return false;
  return el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName);
}

const visible = (el: HTMLElement | null): el is HTMLElement => !!el && !el.closest('[hidden]') && el.getClientRects().length > 0;

export function installKeys(ctx: Ctx, ui: UI): void {
  document.addEventListener('keydown', (e) => {
    if (e.defaultPrevented || e.ctrlKey || e.metaKey || e.altKey || typing(e.target)) return;
    if (ui.sheets.kind() || document.getElementById('fatal')?.hidden === false) return;
    const k = e.key;
    const ids = openSectors(ctx);
    let done = true;
    if (k === 's' || k === 'S') {
      // No auto-repeat: holding the key is not an autoclicker.
      if (!e.repeat) document.querySelector<HTMLButtonElement>('.dock .sell')?.click();
    } else if (k === 'b' || k === 'B') {
      if (!e.repeat) {
        // The first card in this Industry whose Buy is live, in the order the page shows them (a fork asks first).
        const btn = Array.from(document.querySelectorAll<HTMLButtonElement>('.upgrades .up.afford .buy')).find(visible);
        btn?.click();
      }
    } else if (k === 'a' || k === 'A') {
      ui.jumpToAffordable();
    } else if (/^[1-9]$/.test(k)) {
      const id = ids[Number(k) - 1];
      if (id) ctx.selectSector(id);
    } else if (k === '[' || k === ']') {
      const i = ids.indexOf(ctx.sector);
      const id = ids[(i + (k === ']' ? 1 : ids.length - 1)) % Math.max(1, ids.length)];
      if (id) ctx.selectSector(id);
    } else if (k === 'm' || k === 'M') {
      ui.openMenu();
    } else if (k === 'r' || k === 'R') {
      if (reckoningOffered(ctx) && !ctx.d?.pendingReckoning) ui.confirmReckoning();
    } else if (k === '?') {
      ui.openMenu('keys');
    } else done = false;
    if (done) e.preventDefault();
  });
}
