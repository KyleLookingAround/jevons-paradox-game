// Number formatting. Never returns NaN / undefined / Infinity text.
const MINUS = '−';
const SUFFIX: [number, string][] = [[1e12, 'T'], [1e9, 'B'], [1e6, 'M'], [1e3, 'k']];

function trim1(x: number): string {
  const s = x.toFixed(1);
  return s.endsWith('.0') ? s.slice(0, -2) : s;
}

/** Number notation from 1000 up (a player setting): k/M/B/T suffixes, scientific, or engineering. */
export type Notation = 'suffix' | 'sci' | 'eng';
let notation: Notation = 'suffix';
let epoch = 0;
export function setNotation(n: Notation): void { if (n !== notation) { notation = n; epoch++; } }
export function getNotation(): Notation { return notation; }
/** Bumps whenever the notation changes, for renderers that cache formatted text. */
export function fmtEpoch(): number { return epoch; }

/** 3 significant figures, exponent a multiple of 3 when `eng`: 12345 → "1.23e4" / "12.3e3". */
function expo(a: number, eng: boolean): string {
  let e = Math.floor(Math.log10(a));
  if (eng) e -= ((e % 3) + 3) % 3;
  let m = a / Math.pow(10, e);
  let txt = m >= 100 ? m.toFixed(0) : m >= 10 ? m.toFixed(1) : m.toFixed(2);
  // Rounding can carry past the mantissa's range (9.999e4 → "10.00").
  if (Number(txt) >= (eng ? 1000 : 10)) { e += eng ? 3 : 1; m = a / Math.pow(10, e); txt = m >= 100 ? m.toFixed(0) : m >= 10 ? m.toFixed(1) : m.toFixed(2); }
  return txt + 'e' + e;
}

/** Plain number: up to 1 decimal under 1000, then k/M/B/T (or the chosen notation), then scientific. */
export function fmt(x: number | null | undefined): string {
  if (x == null || !Number.isFinite(x)) return x === Infinity ? '∞' : x === -Infinity ? MINUS + '∞' : '—';
  const neg = x < 0;
  const a = Math.abs(x);
  let s: string;
  if (a < 1000) {
    s = a >= 100 ? Math.round(a).toString() : trim1(a);
    if (s === '1000') s = notation === 'suffix' ? '1.00k' : '1.00e3';
  } else if (notation !== 'suffix') {
    s = expo(a, notation === 'eng');
  } else if (a < 1e15) {
    s = '';
    for (const [v, suf] of SUFFIX) {
      if (a >= v) {
        let n = a / v;
        let txt = n >= 100 ? n.toFixed(0) : n >= 10 ? n.toFixed(1) : n.toFixed(2);
        if (txt === '1000' || txt === '1000.0') txt = n.toFixed(0);
        s = txt + suf;
        break;
      }
    }
  } else {
    const [m, e] = a.toExponential(2).split('e');
    s = m + 'e' + Number(e);
  }
  if (s === '0') return '0';
  return (neg ? MINUS : '') + s;
}

/** Small values (prices) get more precision. */
export function fmtPrice(x: number | null | undefined): string {
  if (x == null || !Number.isFinite(x)) return '—';
  const a = Math.abs(x);
  if (a === 0) return '0';
  if (a < 0.01) return (x < 0 ? MINUS : '') + a.toPrecision(2);
  if (a < 100) return (x < 0 ? MINUS : '') + String(Number(a.toPrecision(3)));
  return fmt(x);
}

export function money(x: number | null | undefined): string {
  if (x == null || !Number.isFinite(x)) return '£—';
  return x < 0 ? MINUS + '£' + fmt(-x) : '£' + fmt(x);
}

export function fold(x: number | null | undefined): string {
  if (x == null || !Number.isFinite(x) || x <= 0) return '×—';
  if (x < 10) return '×' + (x < 1 ? x.toFixed(2) : x.toFixed(1));
  return '×' + fmt(x);
}

/** Signed percentage from a fraction: 0.24 -> "+24%", -0.6 -> "−60%". */
export function pct(frac: number | null | undefined, signed = true): string {
  if (frac == null || !Number.isFinite(frac)) return '—';
  const v = frac * 100;
  const a = Math.abs(v);
  const body = a >= 1000 ? fmt(a) : a < 10 && a !== 0 && Math.round(a) !== a ? a.toFixed(a < 1 ? 1 : 0) : Math.round(a).toString();
  if (body === '0') return '0%';
  const sign = v < 0 ? MINUS : signed ? '+' : '';
  return sign + body + '%';
}

/** "12m 05s", "1h 02m", "45s", "3d 4h". */
export function dur(sec: number | null | undefined): string {
  if (sec == null || !Number.isFinite(sec) || sec < 0) return '—';
  const s = Math.floor(sec);
  if (s < 60) return s + 's';
  const m = Math.floor(s / 60), r = s % 60;
  if (m < 60) return m + 'm ' + String(r).padStart(2, '0') + 's';
  const hh = Math.floor(m / 60), mm = m % 60;
  if (hh < 48) return hh + 'h ' + String(mm).padStart(2, '0') + 'm';
  return Math.floor(hh / 24) + 'd ' + (hh % 24) + 'h';
}

export function num(x: unknown, fallback = 0): number {
  return typeof x === 'number' && Number.isFinite(x) ? x : fallback;
}

export function clamp(x: number, lo: number, hi: number): number {
  return Number.isFinite(x) ? Math.min(hi, Math.max(lo, x)) : lo;
}

export function lower(s: string | undefined | null): string {
  if (!s) return '';
  // keep acronyms intact
  return /^[A-Z0-9]{2,}/.test(s) ? s : s.charAt(0).toLowerCase() + s.slice(1);
}
