// The pure half of the DAW export: WAV headers and sample encoding, the ZIP writer (CRC-32, offsets, sizes), file
// names, loop lengths and how the engine's pulse lines up with them, stem groups, seams and trimming.
// @ts-ignore bun:test types are not in the project tsconfig (types: [])
import { describe, expect, test } from 'bun:test';
import { encodeWav, wavHeader, wavSamples, wavSize, parseWavHeader, pcm24 } from './wav';
import { crc32, crc32Init, crc32Update, crc32Final, ZipWriter, dosDateTime } from './zip';
import { keyTag, bpmTag, fileName, loopLength, token, keyLong } from './naming';
import { stemGroups, groupOf, STEM_GROUPS } from './groups';
import { barLines, seamCrossers, pickStart, crossfadeLoop, trimOneShot, normalise, peakOf } from './loop';
import { SOUNDSCAPES, type HitsDef, type BedDef } from '../defs';
import { KEYS } from '../music';

const u8 = (s: string) => new TextEncoder().encode(s);
const str = (b: Uint8Array, o: number, n: number) => String.fromCharCode(...b.subarray(o, o + n));
const dv = (b: Uint8Array) => new DataView(b.buffer, b.byteOffset, b.byteLength);

describe('WAV', () => {
  test('24-bit stereo header is WAVE_FORMAT_EXTENSIBLE with the PCM subformat', () => {
    const h = wavHeader(1000, 2, 48000, 'pcm24');
    const v = dv(h);
    expect(h.length).toBe(68);
    expect(str(h, 0, 4)).toBe('RIFF');
    expect(v.getUint32(4, true)).toBe(68 - 8 + 6000);
    expect(str(h, 8, 4)).toBe('WAVE');
    expect(str(h, 12, 4)).toBe('fmt ');
    expect(v.getUint32(16, true)).toBe(40);
    expect(v.getUint16(20, true)).toBe(0xfffe);
    expect(v.getUint16(22, true)).toBe(2);
    expect(v.getUint32(24, true)).toBe(48000);
    expect(v.getUint32(28, true)).toBe(48000 * 6);
    expect(v.getUint16(32, true)).toBe(6);
    expect(v.getUint16(34, true)).toBe(24);
    expect(v.getUint16(36, true)).toBe(22);
    expect(v.getUint16(38, true)).toBe(24);
    expect(v.getUint32(40, true)).toBe(3);
    // KSDATAFORMAT_SUBTYPE_PCM 00000001-0000-0010-8000-00aa00389b71
    expect([...h.subarray(44, 60)]).toEqual([1, 0, 0, 0, 0, 0, 0x10, 0, 0x80, 0, 0, 0xaa, 0, 0x38, 0x9b, 0x71]);
    expect(str(h, 60, 4)).toBe('data');
    expect(v.getUint32(64, true)).toBe(6000);
    expect(wavSize(1000, 2, 'pcm24')).toBe(68 + 6000);
  });

  test('float header has the IEEE_FLOAT subformat and a fact chunk', () => {
    const h = wavHeader(500, 2, 48000, 'f32');
    const v = dv(h);
    expect(h.length).toBe(80);
    expect(v.getUint16(20, true)).toBe(0xfffe);
    expect(v.getUint16(34, true)).toBe(32);
    expect(v.getUint16(38, true)).toBe(32);
    expect(v.getUint16(44, true)).toBe(3);
    expect(str(h, 60, 4)).toBe('fact');
    expect(v.getUint32(64, true)).toBe(4);
    expect(v.getUint32(68, true)).toBe(500);
    expect(str(h, 72, 4)).toBe('data');
    expect(v.getUint32(76, true)).toBe(4000);
    expect(v.getUint32(28, true)).toBe(48000 * 8);
  });

  test('24-bit samples: rounding, clamping, sign, little-endian, interleaved', () => {
    expect(pcm24(0)).toBe(0);
    expect(pcm24(1)).toBe(8388607);
    expect(pcm24(1.5)).toBe(8388607);
    expect(pcm24(-1)).toBe(-8388608);
    expect(pcm24(-2)).toBe(-8388608);
    expect(pcm24(0.5)).toBe(4194304);
    expect(pcm24(1 / 8388608)).toBe(1);
    expect(pcm24(0.4 / 8388608)).toBe(0);
    expect(pcm24(NaN)).toBe(0);
    const L = new Float32Array([0.5, -1, 0]), R = new Float32Array([-0.5, 1 / 8388608, 1]);
    const d = wavSamples([L, R], 'pcm24');
    expect([...d]).toEqual([0x00, 0x00, 0x40, 0x00, 0x00, 0xc0, 0x00, 0x00, 0x80, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0xff, 0xff, 0x7f]);
    // Slices give the same bytes as the whole.
    const a = wavSamples([L, R], 'pcm24', 0, 2), b = wavSamples([L, R], 'pcm24', 2, 3);
    expect([...a, ...b]).toEqual([...d]);
  });

  test('float samples are written exactly', () => {
    const L = new Float32Array([0.1, -0.7, 1.25]), R = new Float32Array([0, 0.333, -1e-8]);
    const w = encodeWav([L, R], 48000, 'f32');
    const p = parseWavHeader(w);
    expect(p.sub).toBe(3);
    expect(p.frames).toBe(3);
    expect(p.factFrames).toBe(3);
    const v = dv(w);
    for (let i = 0; i < 3; i++) {
      expect(v.getFloat32(p.dataOffset + i * 8, true)).toBe(L[i]);
      expect(v.getFloat32(p.dataOffset + i * 8 + 4, true)).toBe(R[i]);
    }
  });

  test('whole file parses back; an odd data length is padded and counted in the RIFF size', () => {
    const w = encodeWav([new Float32Array(48000), new Float32Array(48000)], 48000, 'pcm24');
    const p = parseWavHeader(w);
    expect(p).toMatchObject({ tag: 0xfffe, sub: 1, channels: 2, sampleRate: 48000, bits: 24, validBits: 24, mask: 3, frames: 48000, dataOffset: 68 });
    expect(w.length).toBe(68 + 48000 * 6);
    const m = encodeWav([new Float32Array(3)], 48000, 'pcm24');   // 9 data bytes
    expect(m.length).toBe(68 + 9 + 1);
    expect(dv(m).getUint32(4, true)).toBe(m.length - 8);
    expect(parseWavHeader(m).mask).toBe(4);
  });
});

describe('ZIP', () => {
  test('CRC-32 check values, and running equals whole', () => {
    expect(crc32(u8('123456789'))).toBe(0xcbf43926);
    expect(crc32(new Uint8Array(0))).toBe(0);
    expect(crc32(u8('The quick brown fox jumps over the lazy dog'))).toBe(0x414fa339);
    const big = new Uint8Array(100000).map((_, i) => (i * 7919) & 0xff);
    let c = crc32Init();
    for (let o = 0; o < big.length; o += 4096) c = crc32Update(c, big.subarray(o, o + 4096));
    expect(crc32Final(c)).toBe(crc32(big));
  });

  test('store-only archive: headers, offsets, central directory and end record agree; repeatable', async () => {
    const files: [string, Uint8Array][] = [['rebound-audio/README.txt', u8('hello\n')], ['rebound-audio/steam/loops/a.wav', new Uint8Array(1000).map((_, i) => i & 0xff)], ['rebound-audio/empty.txt', new Uint8Array(0)]];
    const make = async () => {
      const parts: Uint8Array[] = [];
      const z = new ZipWriter((p) => { parts.push(p as Uint8Array); });
      for (const [n, d] of files) {
        if (n.endsWith('.wav')) await z.addParts(n, [d.subarray(0, 300), d.subarray(300)]);
        else await z.add(n, d);
      }
      await z.close();
      const out = new Uint8Array(parts.reduce((a, p) => a + p.length, 0));
      let o = 0; for (const p of parts) { out.set(p, o); o += p.length; }
      expect(z.bytes).toBe(out.length);
      return out;
    };
    const zip = await make();
    expect([...await make()]).toEqual([...zip]);
    expect(zip.length).toBe(ZipWriter.sizeOf(files.map(([name, d]) => ({ name, size: d.length }))));
    const v = dv(zip);
    // End of central directory
    const e = zip.length - 22;
    expect(v.getUint32(e, true)).toBe(0x06054b50);
    expect(v.getUint16(e + 8, true)).toBe(3);
    expect(v.getUint16(e + 10, true)).toBe(3);
    const cdSize = v.getUint32(e + 12, true), cdAt = v.getUint32(e + 16, true);
    expect(cdAt + cdSize).toBe(e);
    let o = cdAt;
    for (const [name, data] of files) {
      expect(v.getUint32(o, true)).toBe(0x02014b50);
      expect(v.getUint16(o + 10, true)).toBe(0);              // stored
      expect(v.getUint32(o + 16, true)).toBe(crc32(data));
      expect(v.getUint32(o + 20, true)).toBe(data.length);
      expect(v.getUint32(o + 24, true)).toBe(data.length);
      const nl = v.getUint16(o + 28, true);
      expect(str(zip, o + 46, nl)).toBe(name);
      const lh = v.getUint32(o + 42, true);
      // The local header it points at says the same, and the data follows it.
      expect(v.getUint32(lh, true)).toBe(0x04034b50);
      expect(v.getUint32(lh + 14, true)).toBe(crc32(data));
      expect(v.getUint32(lh + 18, true)).toBe(data.length);
      expect(v.getUint16(lh + 26, true)).toBe(nl);
      expect(str(zip, lh + 30, nl)).toBe(name);
      expect([...zip.subarray(lh + 30 + nl, lh + 30 + nl + data.length)]).toEqual([...data]);
      expect(v.getUint16(lh + 10, true)).toBe(dosDateTime(2026, 11, 19, 12).time);
      expect(v.getUint16(lh + 12, true)).toBe(dosDateTime(2026, 11, 19, 12).date);
      o += 46 + nl;
    }
  });

  test('DOS date and time', () => {
    expect(dosDateTime(1980, 1, 1)).toEqual({ date: 0x21, time: 0 });
    expect(dosDateTime(2026, 11, 19, 12, 30, 58)).toEqual({ date: (46 << 9) | (11 << 5) | 19, time: (12 << 11) | (30 << 5) | 29 });
  });
});

describe('naming', () => {
  test('key tags', () => {
    expect(keyTag(KEYS.steam)).toBe('Ddor');
    expect(keyTag(KEYS.light)).toBe('Gmix');
    expect(keyTag(KEYS.motion)).toBe('Clyd');
    expect(keyTag(KEYS.compute)).toBe('Emin');
    expect(keyTag(KEYS.code)).toBe('Bmin');
    expect(keyLong(KEYS.steam)).toBe('D dorian: D E F G A B C');
    expect(keyLong(KEYS.code)).toBe('B aeolian (natural minor): B C♯ D E F♯ G A');
  });
  test('file names read at a glance', () => {
    expect(fileName({ industry: 'steam', state: 'late', what: 'stem-engine', seconds: 120, key: KEYS.steam, bpm: 72, fmt: 'pcm24' })).toBe('steam_late_stem-engine_120s_Ddor_72bpm_48k24.wav');
    expect(fileName({ industry: 'light', state: 'controls', what: 'loop-seamless', bars: 16, seconds: 63.99, key: KEYS.light, bpm: 67.5, fmt: 'f32' })).toBe('light_controls_loop-seamless_16bars_64s_Gmix_67.5bpm_48k32f.wav');
    expect(fileName({ industry: 'code', what: 'oneshot-letter-missWhitlow', fmt: 'pcm24' })).toBe('code_oneshot-letter-miss-whitlow_48k24.wav');
    expect(bpmTag(78)).toBe('78bpm');
    expect(bpmTag(84.04)).toBe('84bpm');
    expect(token('Steady State!')).toBe('steady-state');
  });
  test('loop lengths are whole bars', () => {
    const a = loopLength(30, 78);
    expect(a.bars).toBe(10);
    expect(a.frames).toBe(Math.round(10 * (240 / 78) * 48000));
    expect(Math.abs(a.seconds - 30.769)).toBeLessThan(0.001);
    expect(loopLength(1, 60).bars).toBe(1);
    for (const bpm of [54, 67.5, 84, 99.9, 120]) for (const t of [15, 30, 60, 120, 240]) {
      const l = loopLength(t, bpm);
      expect(Math.abs(l.frames - l.bars * l.barSeconds * 48000)).toBeLessThanOrEqual(0.5);
      expect(Math.abs(l.seconds - t)).toBeLessThanOrEqual(l.barSeconds / 2 + 1 / 48000);
    }
  });
  test("every pulse layer's pattern and every beat-locked LFO repeats within a bar, so a whole-bar loop lines up", () => {
    for (const d of Object.values(SOUNDSCAPES)) for (const l of d.layers) {
      if (l.kind === 'hits' && (l as HitsDef).grid) {
        const g = (l as HitsDef).grid!;
        const period = g.every * (g.pattern?.length ?? 1);
        expect([d.id, l.id, 4 / period]).toEqual([d.id, l.id, Math.round(4 / period)]);
      }
      if (l.kind === 'bed' && (l as BedDef).lfo?.beats) {
        const cycles = (l as BedDef).lfo!.rate * 4;
        expect([d.id, l.id, cycles]).toEqual([d.id, l.id, Math.round(cycles)]);
      }
    }
  });
});

describe('stem groups', () => {
  test('every layer of every Industry is in exactly one stem, never in "other"', () => {
    for (const [id, d] of Object.entries(SOUNDSCAPES)) {
      const gs = stemGroups(id);
      expect(new Set(gs.map((g) => g.id)).size).toBe(gs.length);
      for (const l of d.layers) {
        expect([id, l.id, groupOf(id, l.id)]).not.toEqual([id, l.id, 'other']);
        const owners = gs.filter((g) => g.layers.includes(l.id));
        expect([id, l.id, owners.length]).toEqual([id, l.id, 1]);
      }
      for (const g of STEM_GROUPS[id] ?? []) for (const lid of g.layers) expect(d.layers.some((l) => l.id === lid)).toBe(true);
    }
    expect(groupOf('steam', 'lever:duty')).toBe('levers');
    expect(groupOf('motion', 'trace:steam:looms')).toBe('heritage');
    expect(groupOf('code', 'crisis')).toBe('crisis');
    expect(groupOf('code', 'watch')).toBe('watch');
    expect(groupOf('code', 'mystery')).toBe('other');
  });
});

describe('loops and one-shots', () => {
  test('bar lines from the beat clock', () => {
    const ticks = Array.from({ length: 101 }, (_, i) => ({ t: i * 0.1, beat: i * 0.1 * 2, tempo: 120 }));   // 2 beats/s
    const b = barLines(ticks, 0.5, 9.9);
    expect(b.length).toBe(4);   // 2, 4, 6, 8 s (the bar at 10 s is past the window)
    b.forEach((t, i) => expect(Math.abs(t - 2 * (i + 1))).toBeLessThan(1e-9));
  });
  test('seams: events crossing the head or the wrap are found; short texture and grid hits are not', () => {
    const v = [
      { source: 'train', at: 9, dur: 8, grid: false },     // crosses 10–12 (head)
      { source: 'birds', at: 10.5, dur: 0.4, grid: false }, // texture
      { source: 'looms', at: 10.2, dur: 1.5, grid: true },  // pulse
      { source: 'church', at: 39.5, dur: 4, grid: false },  // crosses the wrap at 40–42
    ];
    expect(seamCrossers(v, 10, 30, 2).map((x) => x.source)).toEqual(['train', 'church']);
    expect(seamCrossers(v, 10, 30, 2, (s) => s !== 'train').map((x) => x.source)).toEqual(['church']);
    expect(pickStart([10, 20, 24], v, 30, 2)).toEqual({ start: 20, crossers: [] });
  });
  test('a crossfaded loop runs on from its last frame into its first', () => {
    const src = new Float32Array(1000).map((_, i) => Math.sin(i * 0.05) + 0.001 * i);
    const out = crossfadeLoop(src, 100, 600, 50);
    expect(out.length).toBe(600);
    expect(out[599]).toBe(src[699]);
    expect(out[0]).toBe(src[700]);     // the first frame is exactly what followed the last
    expect(out[300]).toBe(src[400]);
    expect(() => crossfadeLoop(src, 400, 600, 50)).toThrow();
  });
  test('one-shots trim to their sound with a clean tail; normalising sets the peak', () => {
    const n = 48000, a = new Float32Array(n), b = new Float32Array(n);
    for (let i = 4800; i < 9600; i++) a[i] = 0.5 * Math.sin(i / 10) * Math.exp(-(i - 4800) / 1000);
    const t = trimOneShot([a, b], 48000)!;
    expect(t[0].length).toBeLessThan(9600 - 4800 + 0.09 * 48000);
    expect(Math.abs(t[0][t[0].length - 1])).toBe(0);
    expect(trimOneShot([new Float32Array(10)], 48000)).toBeNull();
    normalise(t, -1);
    expect(Math.abs(20 * Math.log10(peakOf(t)) + 1)).toBeLessThan(1e-4);
  });
});
