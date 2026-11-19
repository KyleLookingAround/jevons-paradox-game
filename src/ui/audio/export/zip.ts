// A small ZIP writer: store only (no compression: WAV hardly compresses and a DAW user wants it fast), written in
// pieces to a sink so a large export never holds the whole archive in memory. Pure: no DOM, testable under bun.
//
// Layout per entry: local file header, name, data. At the end: the central directory and the end-of-central-directory
// record. CRC-32 (IEEE 802.3, reflected, polynomial 0xEDB88320) and sizes are known before each local header is
// written (the caller hands over each file whole), so no data descriptors are used. Every entry carries one fixed
// timestamp, so the same files always give the same archive, byte for byte. No ZIP64: the writer refuses an archive
// past 4 GiB − 1 or 65 535 entries rather than write one that tools would misread.

const TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

/** Running CRC-32: start with crc32Init, feed parts with crc32Update, finish with crc32Final. */
export const crc32Init = (): number => 0xffffffff;
export function crc32Update(crc: number, b: Uint8Array): number {
  let c = crc >>> 0;
  for (let i = 0; i < b.length; i++) c = TABLE[(c ^ b[i]) & 0xff] ^ (c >>> 8);
  return c >>> 0;
}
export const crc32Final = (crc: number): number => (crc ^ 0xffffffff) >>> 0;
export const crc32 = (b: Uint8Array): number => crc32Final(crc32Update(crc32Init(), b));

/** MS-DOS date and time. Fixed per archive for repeatable output. */
export function dosDateTime(y: number, mo: number, d: number, h = 0, mi = 0, s = 0): { date: number; time: number } {
  return { date: ((y - 1980) << 9) | (mo << 5) | d, time: (h << 11) | (mi << 5) | (s >> 1) };
}
const STAMP = dosDateTime(2026, 11, 19, 12, 0, 0);

export type Sink = (part: Uint8Array) => void | Promise<void>;

interface Entry { name: Uint8Array; crc: number; size: number; offset: number }

const utf8 = (s: string) => new TextEncoder().encode(s);
const MAX = 0xffffffff;

export class ZipWriter {
  private entries: Entry[] = [];
  private offset = 0;
  private closed = false;
  constructor(private sink: Sink) {}

  /** Bytes written so far. */
  get bytes(): number { return this.offset; }
  get count(): number { return this.entries.length; }

  /** Size a store-only archive will have, for an estimate before anything is rendered. */
  static sizeOf(files: { name: string; size: number }[]): number {
    let n = 22;
    for (const f of files) { const nl = utf8(f.name).length; n += 30 + nl + f.size + 46 + nl; }
    return n;
  }

  private async put(b: Uint8Array): Promise<void> { this.offset += b.length; await this.sink(b); }

  /** Add one file, given as parts (e.g. a WAV header then its samples in slices) and its CRC-32 over all of them. */
  async addParts(name: string, parts: Uint8Array[], crc?: number): Promise<void> {
    if (this.closed) throw new Error('zip closed');
    let size = 0;
    for (const p of parts) size += p.length;
    if (crc === undefined) { let c = crc32Init(); for (const p of parts) c = crc32Update(c, p); crc = crc32Final(c); }
    const nm = utf8(name);
    if (this.entries.length >= 0xffff) throw new Error('too many files for a ZIP without ZIP64');
    if (this.offset + 30 + nm.length + size + 46 * (this.entries.length + 1) + 22 > MAX) throw new Error('archive would pass 4 GiB: export less at once');
    const h = new Uint8Array(30 + nm.length);
    const v = new DataView(h.buffer);
    v.setUint32(0, 0x04034b50, true);   // local file header
    v.setUint16(4, 20, true);           // version needed: 2.0
    v.setUint16(6, 0x0800, true);       // flags: UTF-8 names
    v.setUint16(8, 0, true);            // method: stored
    v.setUint16(10, STAMP.time, true); v.setUint16(12, STAMP.date, true);
    v.setUint32(14, crc >>> 0, true); v.setUint32(18, size, true); v.setUint32(22, size, true);
    v.setUint16(26, nm.length, true); v.setUint16(28, 0, true);
    h.set(nm, 30);
    this.entries.push({ name: nm, crc: crc >>> 0, size, offset: this.offset });
    await this.put(h);
    for (const p of parts) if (p.length) await this.put(p);
  }

  async add(name: string, data: Uint8Array): Promise<void> { await this.addParts(name, [data]); }

  /** Write the central directory and the end record. */
  async close(): Promise<void> {
    if (this.closed) return;
    this.closed = true;
    const start = this.offset;
    for (const e of this.entries) {
      const c = new Uint8Array(46 + e.name.length);
      const v = new DataView(c.buffer);
      v.setUint32(0, 0x02014b50, true);  // central directory header
      v.setUint16(4, 0x0314, true);      // made by: 2.0, Unix (so permissions below are read)
      v.setUint16(6, 20, true);
      v.setUint16(8, 0x0800, true);
      v.setUint16(10, 0, true);
      v.setUint16(12, STAMP.time, true); v.setUint16(14, STAMP.date, true);
      v.setUint32(16, e.crc, true); v.setUint32(20, e.size, true); v.setUint32(24, e.size, true);
      v.setUint16(28, e.name.length, true);
      v.setUint16(30, 0, true); v.setUint16(32, 0, true); v.setUint16(34, 0, true); v.setUint16(36, 0, true);
      v.setUint32(38, (0o100644 << 16) >>> 0, true);   // a regular file, rw-r--r--
      v.setUint32(42, e.offset, true);
      c.set(e.name, 46);
      await this.put(c);
    }
    const size = this.offset - start;
    const z = new Uint8Array(22);
    const v = new DataView(z.buffer);
    v.setUint32(0, 0x06054b50, true);
    v.setUint16(8, this.entries.length, true); v.setUint16(10, this.entries.length, true);
    v.setUint32(12, size, true); v.setUint32(16, start, true);
    await this.put(z);
  }
}
