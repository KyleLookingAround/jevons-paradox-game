// WAV files for a DAW: RIFF/WAVE, little-endian, WAVE_FORMAT_EXTENSIBLE (Microsoft's form for more than 16 bits per
// sample and for float), with a `fact` chunk for float. Pure: no DOM, testable under bun.
//
// 24-bit PCM: subformat KSDATAFORMAT_SUBTYPE_PCM, 24 valid bits, no dither (the engine's own noise floor is far above
// a 24-bit step). 32-bit float: subformat KSDATAFORMAT_SUBTYPE_IEEE_FLOAT, samples written as they were rendered.
// Channel mask 0x3 (front left, front right) for stereo, 0x4 (front centre) for mono.

export type WavFormat = 'pcm24' | 'f32';

export const WAV_HEADER_BYTES = 12 + 8 + 40 + 8 + 4 + 8;   // RIFF+WAVE, fmt (40), fact (4, float only), data header

/** Bytes per sample frame. */
export const frameBytes = (fmt: WavFormat, channels: number) => channels * (fmt === 'pcm24' ? 3 : 4);

/** Size of the whole file for `frames` sample frames. */
export function wavSize(frames: number, channels: number, fmt: WavFormat): number {
  return headerSize(fmt) + frames * frameBytes(fmt, channels);
}

const headerSize = (fmt: WavFormat) => 12 + 8 + 40 + (fmt === 'f32' ? 12 : 0) + 8;

// The two subformat GUIDs differ only in the first 16 bits: xxxx0000-0000-0010-8000-00aa00389b71.
const GUID_TAIL = [0x00, 0x00, 0x00, 0x00, 0x10, 0x00, 0x80, 0x00, 0x00, 0xaa, 0x00, 0x38, 0x9b, 0x71];

/** The header (everything before the sample data). */
export function wavHeader(frames: number, channels: number, sampleRate: number, fmt: WavFormat): Uint8Array {
  const hs = headerSize(fmt);
  const dataBytes = frames * frameBytes(fmt, channels);
  const b = new Uint8Array(hs);
  const v = new DataView(b.buffer);
  let o = 0;
  const str = (s: string) => { for (let i = 0; i < s.length; i++) b[o++] = s.charCodeAt(i); };
  const u32 = (x: number) => { v.setUint32(o, x >>> 0, true); o += 4; };
  const u16 = (x: number) => { v.setUint16(o, x, true); o += 2; };
  const bits = fmt === 'pcm24' ? 24 : 32;
  const align = channels * (bits / 8);
  str('RIFF'); u32(hs - 8 + dataBytes + (dataBytes & 1)); str('WAVE');
  str('fmt '); u32(40);
  u16(0xfffe);                // WAVE_FORMAT_EXTENSIBLE
  u16(channels); u32(sampleRate); u32(sampleRate * align); u16(align); u16(bits);
  u16(22);                    // cbSize
  u16(bits);                  // wValidBitsPerSample
  u32(channels === 1 ? 0x4 : channels === 2 ? 0x3 : 0);   // dwChannelMask
  u16(fmt === 'pcm24' ? 0x0001 : 0x0003);                 // SubFormat (first two bytes of the GUID)
  for (const x of GUID_TAIL) b[o++] = x;
  if (fmt === 'f32') { str('fact'); u32(4); u32(frames); }
  str('data'); u32(dataBytes);
  return b;
}

/** Interleaved sample bytes for frames [from, to) of the channels. */
export function wavSamples(chans: readonly Float32Array[], fmt: WavFormat, from = 0, to = chans[0]?.length ?? 0): Uint8Array {
  const nc = chans.length, n = Math.max(0, to - from);
  if (fmt === 'f32') {
    const f = new Float32Array(n * nc);
    for (let c = 0; c < nc; c++) { const ch = chans[c]; for (let i = 0; i < n; i++) f[i * nc + c] = ch[from + i]; }
    // Float32Array is in platform byte order; every platform a browser runs on is little-endian, but say so in code.
    if (!LE) { const dv = new DataView(f.buffer); for (let i = 0; i < f.length; i++) dv.setFloat32(i * 4, f[i], true); }
    return new Uint8Array(f.buffer);
  }
  const out = new Uint8Array(n * nc * 3);
  let o = 0;
  for (let i = 0; i < n; i++) {
    for (let c = 0; c < nc; c++) {
      const s = pcm24(chans[c][from + i]);
      out[o++] = s & 0xff; out[o++] = (s >> 8) & 0xff; out[o++] = (s >> 16) & 0xff;
    }
  }
  return out;
}

const LE = new Uint8Array(new Uint16Array([1]).buffer)[0] === 1;

/** One float sample to a signed 24-bit integer: round to nearest, clamped to [−8388608, 8388607]; NaN is silence. */
export function pcm24(x: number): number {
  if (!(x === x)) return 0;
  const s = Math.round(x * 8388608);
  return s > 8388607 ? 8388607 : s < -8388608 ? -8388608 : s;
}

/** A whole WAV file in one array (small files and tests; large exports go through wavHeader + wavSamples in parts). */
export function encodeWav(chans: readonly Float32Array[], sampleRate: number, fmt: WavFormat): Uint8Array {
  const frames = chans[0]?.length ?? 0;
  const h = wavHeader(frames, chans.length, sampleRate, fmt);
  const d = wavSamples(chans, fmt);
  const out = new Uint8Array(h.length + d.length + (d.length & 1));
  out.set(h, 0); out.set(d, h.length);
  return out;
}

/** Parse a header written by wavHeader (tests and the verifier): format, channels, rate, bits, frames, data offset. */
export function parseWavHeader(b: Uint8Array): { tag: number; sub: number; channels: number; sampleRate: number; bits: number; validBits: number; mask: number; frames: number; dataOffset: number; dataBytes: number; factFrames: number | null } {
  const v = new DataView(b.buffer, b.byteOffset, b.byteLength);
  const tag4 = (o: number) => String.fromCharCode(b[o], b[o + 1], b[o + 2], b[o + 3]);
  if (tag4(0) !== 'RIFF' || tag4(8) !== 'WAVE') throw new Error('not RIFF/WAVE');
  let o = 12, fmtAt = -1, dataAt = -1, dataBytes = 0, fact: number | null = null;
  while (o + 8 <= b.length) {
    const id = tag4(o), sz = v.getUint32(o + 4, true);
    if (id === 'fmt ') fmtAt = o + 8;
    else if (id === 'fact') fact = v.getUint32(o + 8, true);
    else if (id === 'data') { dataAt = o + 8; dataBytes = sz; break; }
    o += 8 + sz + (sz & 1);
  }
  if (fmtAt < 0 || dataAt < 0) throw new Error('missing fmt or data');
  const tag = v.getUint16(fmtAt, true), channels = v.getUint16(fmtAt + 2, true), sampleRate = v.getUint32(fmtAt + 4, true), bits = v.getUint16(fmtAt + 14, true);
  const ext = tag === 0xfffe;
  return {
    tag, sub: ext ? v.getUint16(fmtAt + 24, true) : tag, channels, sampleRate, bits, validBits: ext ? v.getUint16(fmtAt + 18, true) : bits,
    mask: ext ? v.getUint32(fmtAt + 20, true) : 0, frames: dataBytes / (channels * (bits / 8)), dataOffset: dataAt, dataBytes, factFrames: fact,
  };
}
