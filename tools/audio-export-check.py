#!/usr/bin/env python3
"""Checks what the demo's "Export for a DAW" panel downloaded (see tools/audio-export-check.cjs).

  python3 -I tools/audio-export-check.py <zip or wav> [...]           validity, levels, stems sum, seams
  python3 -I tools/audio-export-check.py --compare <zipA> <zipB>      repeatability (sample data byte for byte)

Every WAV: the RIFF/WAVE header by hand (WAVE_FORMAT_EXTENSIBLE, subformat, fact, sizes), Python's `wave` module
for PCM, ffprobe if present; channels, rate, length against the name; clipping; silence. Every stems folder: the stems
summed against the full mix beside them (the residual in dB). Every seamless loop: the sample step at the wrap and a
short-window spectral difference across it, against the file's own frame-to-frame figures.
"""
import hashlib, io, json, os, re, shutil, struct, subprocess, sys, tempfile, wave, zipfile
import numpy as np

SR = 48000


def parse_header(b):
    if b[:4] != b'RIFF' or b[8:12] != b'WAVE':
        raise ValueError('not RIFF/WAVE')
    riff = struct.unpack('<I', b[4:8])[0]
    o, fmt, fact, data = 12, None, None, None
    while o + 8 <= len(b):
        cid, sz = b[o:o + 4], struct.unpack('<I', b[o + 4:o + 8])[0]
        if cid == b'fmt ':
            fmt = b[o + 8:o + 8 + sz]
        elif cid == b'fact':
            fact = struct.unpack('<I', b[o + 8:o + 12])[0]
        elif cid == b'data':
            data = (o + 8, sz)
            break
        o += 8 + sz + (sz & 1)
    tag, ch, sr, brate, align, bits = struct.unpack('<HHIIHH', fmt[:16])
    h = dict(riff=riff, tag=tag, channels=ch, rate=sr, byterate=brate, align=align, bits=bits, fact=fact, data_off=data[0], data_bytes=data[1], fmt_len=len(fmt))
    if tag == 0xFFFE:
        cb, valid, mask = struct.unpack('<HHI', fmt[16:24])
        guid = fmt[24:40]
        h.update(cb=cb, valid=valid, mask=mask, sub=struct.unpack('<H', guid[:2])[0], guid_tail_ok=guid[2:] == bytes([0, 0, 0, 0, 0x10, 0, 0x80, 0, 0, 0xaa, 0, 0x38, 0x9b, 0x71]))
    return h


def decode(b, h):
    raw = np.frombuffer(b, dtype=np.uint8, count=h['data_bytes'], offset=h['data_off'])
    if h['bits'] == 24:
        a = raw.reshape(-1, 3).astype(np.int32)
        v = a[:, 0] | (a[:, 1] << 8) | (a[:, 2] << 16)
        v = np.where(v & 0x800000, v - 0x1000000, v)
        x = v.astype(np.float64) / 8388608.0
        full = (v >= 8388607) | (v <= -8388608)
    else:
        x = raw.view('<f4').astype(np.float64)
        full = np.abs(x) >= 1.0
    return x.reshape(-1, h['channels']), int(full.sum())


def db(x):
    return 20 * np.log10(x) if x > 1e-12 else -240.0


def check_wav(name, b, ffprobe):
    out = dict(name=name)
    h = parse_header(b)
    issues = []
    if h['tag'] != 0xFFFE: issues.append('not WAVE_FORMAT_EXTENSIBLE')
    if h.get('cb') != 22 or h['fmt_len'] != 40: issues.append('fmt chunk size')
    if not h.get('guid_tail_ok'): issues.append('subformat GUID')
    if h['channels'] != 2: issues.append('channels %d' % h['channels'])
    if h['rate'] != SR: issues.append('rate %d' % h['rate'])
    if h['bits'] == 24 and h.get('sub') != 1: issues.append('24-bit not PCM')
    if h['bits'] == 32 and (h.get('sub') != 3 or h['fact'] is None): issues.append('float without IEEE subformat or fact')
    if h['byterate'] != h['rate'] * h['align'] or h['align'] != h['channels'] * h['bits'] // 8: issues.append('byterate/align')
    if h.get('valid') != h['bits']: issues.append('valid bits')
    if h.get('mask') != 3: issues.append('channel mask')
    if h['riff'] != len(b) - 8: issues.append('RIFF size %d vs %d' % (h['riff'], len(b) - 8))
    if h['data_off'] + h['data_bytes'] + (h['data_bytes'] & 1) != len(b): issues.append('data size')
    frames = h['data_bytes'] // h['align']
    if h['fact'] is not None and h['fact'] != frames: issues.append('fact frames')
    out.update(bits=h['bits'], frames=frames, seconds=frames / SR)
    if h['bits'] == 24:
        try:
            with wave.open(io.BytesIO(b)) as w:
                if (w.getnchannels(), w.getsampwidth(), w.getframerate(), w.getnframes()) != (2, 3, SR, frames): issues.append('wave module disagrees')
                out['wave_module'] = 'ok'
        except Exception as e:
            issues.append('wave module: %s' % e)
    if ffprobe:
        with tempfile.NamedTemporaryFile(suffix='.wav') as f:
            f.write(b); f.flush()
            r = subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'stream=codec_name,sample_rate,channels,bits_per_sample,duration_ts', '-of', 'json', f.name], capture_output=True, text=True)
            try:
                s = json.loads(r.stdout)['streams'][0]
                out['ffprobe'] = '%s %s Hz %s ch %s frames' % (s.get('codec_name'), s.get('sample_rate'), s.get('channels'), s.get('duration_ts'))
                if int(s.get('duration_ts', -1)) != frames or int(s['channels']) != 2 or int(s['sample_rate']) != SR: issues.append('ffprobe disagrees')
            except Exception:
                issues.append('ffprobe failed: %s' % r.stderr.strip()[:200])
    x, nfull = decode(b, h)
    pk = float(np.abs(x).max()) if x.size else 0.0
    rms = float(np.sqrt(np.mean(x * x))) if x.size else 0.0
    out.update(peak_db=round(db(pk), 2), rms_db=round(db(rms), 2), full_scale_samples=nfull)
    if nfull: issues.append('clipped: %d samples at full scale' % nfull)
    if rms < 10 ** (-90 / 20): issues.append('silent (RMS %.1f dBFS)' % db(rms))
    m = re.search(r'_(\d+)s_', name)
    if m and abs(int(m.group(1)) - frames / SR) > 0.51: issues.append('length %.2f s vs name %ss' % (frames / SR, m.group(1)))
    out['issues'] = issues
    return out, x


def seam(x, bars=0):
    """The wrap of a loop against the file's own figures: |x[0]-x[-1]| against every frame-to-frame step, and the
    spectral difference of a 1024-sample window centred on the wrap against windows hopping through the file."""
    m = x.mean(axis=1)
    steps = np.abs(np.diff(m))
    wrap = abs(m[0] - m[-1])
    N, hop = 1024, 512
    win = np.hanning(N)
    def spec(seg):
        return np.log10(np.abs(np.fft.rfft(seg * win)) + 1e-9)
    # Frame-to-frame spectral flux through the file (each frame against the one 512 samples later).
    flux = []
    idx = np.arange(0, len(m) - N - hop, hop * 7)   # spread over the file
    for i in idx:
        flux.append(np.mean(np.abs(spec(m[i + hop:i + hop + N]) - spec(m[i:i + N]))))
    flux = np.array(flux)
    ring = np.concatenate([m[-N:], m[:N]])           # the wrap in the middle
    seam_flux = np.mean(np.abs(spec(ring[N - hop + hop:N + hop + hop][:N] if False else ring[hop:hop + N]) - spec(ring[0:N])))
    seam_flux2 = np.mean(np.abs(spec(ring[N:2 * N]) - spec(ring[hop:hop + N])))
    sf = max(seam_flux, seam_flux2)
    # RMS step: 20 ms windows either side of the wrap, against the same for every 20 ms boundary.
    w = int(0.02 * SR)
    r = np.sqrt(np.add.reduceat(m[: len(m) // w * w] ** 2, np.arange(0, len(m) // w * w, w)) / w)
    rd = np.abs(np.diff(20 * np.log10(r + 1e-9)))
    seam_rd = abs(20 * np.log10(np.sqrt(np.mean(m[:w] ** 2)) + 1e-9) - 20 * np.log10(np.sqrt(np.mean(m[-w:] ** 2)) + 1e-9))
    # The same figures at the loop's own bar lines (a loop starts on a downbeat, so a hit there is expected).
    at_bars = {}
    if bars > 1:
        L = len(m)
        pos = [int(round(k * L / bars)) for k in range(1, bars)]
        bstep = [abs(20 * np.log10(np.sqrt(np.mean(m[p:p + w] ** 2)) + 1e-9) - 20 * np.log10(np.sqrt(np.mean(m[p - w:p] ** 2)) + 1e-9)) for p in pos]
        bflux = [np.mean(np.abs(spec(m[p:p + N]) - spec(m[p - N:p]))) for p in pos]
        wrapflux = np.mean(np.abs(spec(ring[N:2 * N]) - spec(ring[0:N])))
        at_bars = dict(bar_rms_step_db_median=round(float(np.median(bstep)), 2), bar_rms_step_db_max=round(float(np.max(bstep)), 2),
                       bar_flux_median=round(float(np.median(bflux)), 4), bar_flux_max=round(float(np.max(bflux)), 4), wrap_flux_1024=round(float(wrapflux), 4))
    return dict(**at_bars,
        wrap_step=float(wrap), step_median=float(np.median(steps)), step_p99=float(np.percentile(steps, 99)), step_max=float(steps.max()),
        wrap_step_percentile=round(float((steps < wrap).mean() * 100), 2),
        seam_flux=round(float(sf), 4), flux_median=round(float(np.median(flux)), 4), flux_p95=round(float(np.percentile(flux, 95)), 4), flux_max=round(float(flux.max()), 4),
        seam_flux_percentile=round(float((flux < sf).mean() * 100), 1),
        seam_rms_step_db=round(float(seam_rd), 2), rms_step_p95_db=round(float(np.percentile(rd, 95)), 2),
    )


def check_zip(path):
    rep = dict(zip=os.path.basename(path), size=os.path.getsize(path))
    r = subprocess.run(['unzip', '-tq', path], capture_output=True, text=True)
    rep['unzip_t'] = r.stdout.strip().splitlines()[-1] if r.stdout.strip() else r.stderr.strip()
    z = zipfile.ZipFile(path)
    rep['zipfile_testzip'] = z.testzip() or 'ok'
    ff = shutil.which('ffprobe')
    wavs, stems, files = {}, {}, []
    for info in z.infolist():
        if not info.filename.endswith('.wav'):
            continue
        b = z.read(info)
        o, x = check_wav(info.filename, b, ff)
        files.append(o)
        folder = os.path.dirname(info.filename)
        base = os.path.basename(info.filename)
        if '/stems/' in info.filename:
            stems.setdefault(folder, {})[base] = x
        nb = re.search(r'_(\d+)bars_', base)
        if '_loop-seamless' in base:
            o['seam'] = seam(x, int(nb.group(1)) if nb else 0)
        elif '/stems/' in info.filename and ('_stem-' in base or '-mix_' in base):
            o['seam_if_seamless'] = None
    rep['files'] = files
    rep['readme'] = 'rebound-audio/README.txt' in z.namelist()
    sums = []
    for folder, d in stems.items():
        mix = [k for k in d if '-mix_' in k]
        parts = [k for k in d if '_stem-' in k]
        if not mix or not parts:
            continue
        m = d[mix[0]]
        s = sum(d[k] for k in parts)
        res = m - s
        mr = float(np.sqrt(np.mean(m * m)))
        sums.append(dict(folder=folder, stems=len(parts), mix=mix[0], residual_peak_dbfs=round(db(float(np.abs(res).max())), 1), residual_rms_dbfs=round(db(float(np.sqrt(np.mean(res * res)))), 1), mix_rms_dbfs=round(db(mr), 1),
                         residual_vs_mix_db=round(db(float(np.sqrt(np.mean(res * res)))) - db(mr), 1)))
        # A seamless passage's stems and mix loop as its loop does: measure the mix's seam too.
        if 'loop-mix' in mix[0]:
            nb = re.search(r'_(\d+)bars_', mix[0])
            sums[-1]['mix_seam'] = seam(m, int(nb.group(1)) if nb else 0)
    rep['stem_sums'] = sums
    rep['problems'] = [(f['name'], f['issues']) for f in files if f['issues']]
    return rep


def compare(a, b):
    za, zb = zipfile.ZipFile(a), zipfile.ZipFile(b)
    na, nb = set(za.namelist()), set(zb.namelist())
    out = dict(only_a=sorted(na - nb), only_b=sorted(nb - na), same=0, differ=[])
    for n in sorted(na & nb):
        da, db_ = za.read(n), zb.read(n)
        if hashlib.sha256(da).digest() == hashlib.sha256(db_).digest():
            out['same'] += 1
        else:
            out['differ'].append(n)
    out['archives_identical'] = hashlib.sha256(open(a, 'rb').read()).hexdigest() == hashlib.sha256(open(b, 'rb').read()).hexdigest()
    return out


if __name__ == '__main__':
    if sys.argv[1] == '--compare':
        print(json.dumps(compare(sys.argv[2], sys.argv[3]), indent=1))
    else:
        reps = [check_zip(p) for p in sys.argv[1:] if p.endswith('.zip')]
        print(json.dumps(reps, indent=1, default=float))
