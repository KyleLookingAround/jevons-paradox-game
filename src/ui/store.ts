// Browser storage and file helpers. Every access is guarded: the game must run without storage.
export function lsGet(key: string): string | null {
  try { return localStorage.getItem(key); } catch { return null; }
}
export function lsSet(key: string, value: string): boolean {
  try { localStorage.setItem(key, value); return true; } catch { return false; }
}
export function lsDel(key: string): void {
  try { localStorage.removeItem(key); } catch { /* storage unavailable */ }
}

export function download(filename: string, text: string): boolean {
  try {
    const url = URL.createObjectURL(new Blob([text], { type: 'text/plain' }));
    const a = document.createElement('a');
    a.href = url; a.download = filename; a.rel = 'noopener';
    document.body.append(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
    return true;
  } catch { return false; }
}

export async function copyText(text: string): Promise<boolean> {
  try { await navigator.clipboard.writeText(text); return true; } catch { return false; }
}

export function readFileText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    try {
      const r = new FileReader();
      r.onload = () => resolve(String(r.result ?? ''));
      r.onerror = () => reject(r.error);
      r.readAsText(file);
    } catch (e) { reject(e); }
  });
}

/** Ask the browser not to clear this site's storage under pressure (navigator.storage.persist), guarded. */
export async function requestPersist(): Promise<'granted' | 'denied' | 'unsupported' | 'failed'> {
  try {
    const st = (navigator as Navigator & { storage?: StorageManager }).storage;
    if (!st || typeof st.persist !== 'function') return 'unsupported';
    if (typeof st.persisted === 'function' && (await st.persisted())) return 'granted';
    return (await st.persist()) ? 'granted' : 'denied';
  } catch { return 'failed'; }
}

/** Whether storage is already persistent: true/false, or null when the browser cannot say. */
export async function isPersisted(): Promise<boolean | null> {
  try {
    const st = (navigator as Navigator & { storage?: StorageManager }).storage;
    if (!st || typeof st.persisted !== 'function') return null;
    return await st.persisted();
  } catch { return null; }
}

/** iPhone or iPad (iPadOS reports itself as a Mac with touch), running in a browser tab rather than from the Home Screen. */
export function iosInBrowser(): boolean {
  try {
    const ua = navigator.userAgent || '';
    const ios = /iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && (navigator.maxTouchPoints ?? 0) > 1);
    if (!ios) return false;
    const standalone = (navigator as Navigator & { standalone?: boolean }).standalone === true
      || (typeof matchMedia === 'function' && matchMedia('(display-mode: standalone)').matches);
    return !standalone;
  } catch { return false; }
}
