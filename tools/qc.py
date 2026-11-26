#!/usr/bin/env python
"""QC video Motion Format: cek SEBELUM video dikirim ke siapa pun.

  python tools/qc.py lint   <proyek>        cek scene.html (goyang, grain, bayangan ikut kamera, durasi)
  python tools/qc.py video  <proyek|mp4>    cek MP4 hasil render (kedip, frame hitam, ukuran, suara) + lembar frame
  python tools/qc.py semua  <proyek>        lint + video

Hasil: <proyek>/qc/laporan.md dan <proyek>/qc/lembar-qc.jpg (1 frame per 2 dtk, buka dan LIHAT satu per satu).
Kode keluar 1 bila ada yang GAGAL. Jangan kirim video yang gagal QC.

Ambang (bisa diubah lewat argumen):
  --kedip 6      jumlah titik kedip maksimum (kecerahan naik-turun bolak-balik > 0,8 dari 255 dalam 3 frame)
  --maks-dur 60  durasi Reels maksimum (detik)
"""
import argparse, json, pathlib, re, shutil, subprocess, sys

ROOT = pathlib.Path(__file__).resolve().parent.parent


def ffbin(nama):
    f = shutil.which(nama)
    if not f:
        sys.exit(f'{nama} tidak ada di PATH (pasang ffmpeg, lihat SETUP.md)')
    return f


def cari_proyek(arg):
    p = pathlib.Path(arg)
    if p.suffix.lower() == '.mp4':
        return p.resolve().parent, p.resolve()
    if not p.exists():
        p = ROOT / 'proyek' / arg
    if not p.exists():
        sys.exit(f'Proyek tidak ditemukan: {arg}')
    p = p.resolve()
    mp4 = [m for m in p.glob('*.mp4') if not m.name.startswith('.')]
    return p, (max(mp4, key=lambda m: m.stat().st_mtime) if mp4 else None)


class Laporan:
    def __init__(self):
        self.baris, self.gagal, self.peringatan = [], 0, 0

    def ok(self, judul, isi=''):
        self.baris.append(f'- LULUS | {judul}' + (f' | {isi}' if isi else ''))

    def warn(self, judul, isi=''):
        self.peringatan += 1
        self.baris.append(f'- PERINGATAN | {judul}' + (f' | {isi}' if isi else ''))

    def fail(self, judul, isi=''):
        self.gagal += 1
        self.baris.append(f'- GAGAL | {judul}' + (f' | {isi}' if isi else ''))


# ------------------------------------------------------------------ lint scene.html
def lint(proyek, L):
    f = proyek / 'scene.html'
    if not f.exists():
        L.fail('scene.html', 'tidak ada'); return
    s = f.read_text(encoding='utf-8')
    kode = re.sub(r'/\*.*?\*/', '', s, flags=re.S)
    kode = '\n'.join(l.split('//')[0] if '://' not in l else l for l in kode.splitlines())
    toon = 'toon-dunia.js' in s
    if re.search(r'\bnz\(\s*t', kode):
        L.fail('kamera goyang', 'ada nz(t…) (goyang genggam). Pakai posisi spline murni: cam.position.set(p[0], p[1], p[2])')
    else:
        L.ok('kamera tanpa goyang genggam')
    if re.search(r'grainOn\(\s*[.\d]', kode) and not re.search(r'grainOn\(\s*0\s*\)', kode):
        L.fail('butiran film', 'grainOn(...) aktif: butiran berkedip tiap frame. Hapus panggilannya')
    else:
        L.ok('tanpa butiran film berkedip')
    if re.search(r'D\.guncang\(', kode):
        L.fail('guncangan kamera', 'D.guncang(...) dipakai')
    if toon:
        if 'pusatBayangan' not in kode:
            L.fail('bayangan berkedip', 'toon-3d tanpa D.pusatBayangan: tepi bayangan berenang saat kamera bergerak. Set D.pusatBayangan = new THREE.Vector3(x,0,z) per set')
        else:
            L.ok('pusat bayangan dikunci')
    m = re.search(r'\bdur\s*:\s*([\d.]+)|DUR\s*:\s*([\d.]+)', kode)
    if m:
        d = float(m.group(1) or m.group(2))
        (L.ok if d <= 60 else L.fail)('durasi scene', f'{d:g} dtk (maks 60 untuk Reels)')
    if re.search(r'Math\.sin\(\s*t\s*\*\s*\d+(\.\d+)?\s*\)\s*\*\s*\.0[0-4]', kode) and toon:
        L.warn('gerak kecil berulang', 'ada Math.sin(t*…)*0.0x: pastikan bukan goyang/denyut tokoh, tombol, atau kamera')
    bab = re.findall(r"\{\s*a:\s*([^,]+),\s*b:\s*([^,]+),\s*kicker", kode)
    if bab:
        L.ok('slot judul', f'{len(bab)} bab (cek di potret: tidak ada dua judul tumpuk)')


# ------------------------------------------------------------------ cek mp4
def probe(mp4):
    r = subprocess.run([ffbin('ffprobe'), '-v', 'error', '-show_entries', 'format=duration:stream=codec_type,width,height,r_frame_rate',
                        '-of', 'json', str(mp4)], capture_output=True, text=True)
    return json.loads(r.stdout or '{}')


def kecerahan(mp4, qc):
    out = qc / '.yavg.txt'
    out.unlink(missing_ok=True)
    subprocess.run([ffbin('ffmpeg'), '-v', 'error', '-i', mp4.name, '-vf', f'scale=270:-2,signalstats,metadata=print:key=lavfi.signalstats.YAVG:file={out.relative_to(mp4.parent).as_posix()}',
                    '-f', 'null', '-'], cwd=mp4.parent, check=True)
    v = [float(x) for x in re.findall(r'YAVG=([0-9.]+)', out.read_text())]
    out.unlink(missing_ok=True)
    return v


def video(proyek, mp4, L, ambang_kedip, maks_dur):
    if not mp4 or not mp4.exists():
        L.fail('MP4', 'belum ada hasil render'); return
    qc = proyek / 'qc'; qc.mkdir(exist_ok=True)
    info = probe(mp4)
    dur = float(info.get('format', {}).get('duration', 0))
    vs = [s for s in info.get('streams', []) if s.get('codec_type') == 'video']
    au = [s for s in info.get('streams', []) if s.get('codec_type') == 'audio']
    if vs:
        w, h = vs[0].get('width'), vs[0].get('height')
        ((L.ok) if (w, h) in [(1080, 1920), (2160, 3840), (1920, 1080), (3840, 2160)] else L.fail)('resolusi', f'{w}x{h}')
    (L.ok if dur <= maks_dur else L.fail)('durasi', f'{dur:.1f} dtk (maks {maks_dur})')
    (L.ok if au else L.warn)('audio', 'ada' if au else 'tidak ada trek audio')

    # kedip: kecerahan naik-turun bolak-balik dalam 3 frame
    v = kecerahan(mp4, qc)
    d = [v[i] - v[i - 1] for i in range(1, len(v))]
    titik = [i for i in range(1, len(d)) if abs(d[i]) > .8 and abs(d[i - 1]) > .8 and d[i] * d[i - 1] < 0]
    detik = sorted({round(i / 30) for i in titik})
    if len(titik) > ambang_kedip:
        L.fail('kedip', f'{len(titik)} titik (maks {ambang_kedip}) di detik {detik[:20]}. Cek bayangan ikut kamera, bloom di bidang putih, benda tipis berkilau')
    else:
        L.ok('kedip', f'{len(titik)} titik' + (f' (detik {detik})' if titik else ''))

    # frame hitam di tengah video (selain dip gelap disengaja di awal/akhir)
    r = subprocess.run([ffbin('ffmpeg'), '-v', 'info', '-i', mp4.name, '-vf', 'blackdetect=d=0.4:pix_th=0.06', '-an', '-f', 'null', '-'],
                       cwd=mp4.parent, capture_output=True, text=True)
    hitam = [(float(a), float(b)) for a, b in re.findall(r'black_start:([\d.]+) black_end:([\d.]+)', r.stderr)]
    hitam = [x for x in hitam if x[0] > .6 and x[1] < dur - .6]
    (L.fail if hitam else L.ok)('frame hitam', ', '.join(f'{a:.1f}-{b:.1f}' for a, b in hitam) if hitam else 'tidak ada')

    # suara: loudness terintegrasi & puncak
    if au:
        r = subprocess.run([ffbin('ffmpeg'), '-v', 'info', '-i', mp4.name, '-af', 'ebur128=peak=true', '-vn', '-f', 'null', '-'],
                           cwd=mp4.parent, capture_output=True, text=True)
        I = re.findall(r'I:\s+(-?[\d.]+) LUFS', r.stderr)
        P = re.findall(r'Peak:\s+(-?[\d.]+) dBFS', r.stderr)
        if I:
            i = float(I[-1]); p = float(P[-1]) if P else 0
            ((L.ok) if -18 <= i <= -12 else L.warn)('loudness', f'{i:.1f} LUFS (target -16 s/d -14)')
            (L.ok if p <= -.5 else L.warn)('puncak suara', f'{p:.1f} dBFS (maks -1)')

    # lembar frame: 1 frame per 2 dtk untuk dilihat mata (aset rusak, teks tumpuk, objek terpotong)
    n = max(1, int(dur // 2))
    kol = 6
    subprocess.run([ffbin('ffmpeg'), '-v', 'error', '-y', '-i', mp4.name, '-vf', f'fps=1/2,scale=240:-2,tile={kol}x{(n + kol - 1) // kol}',
                    '-frames:v', '1', (qc / 'lembar-qc.jpg').relative_to(mp4.parent).as_posix()], cwd=mp4.parent, check=True)
    L.warn('lihat lembar frame', f'buka qc/lembar-qc.jpg dan cek tiap frame dengan DAFTAR CEK MATA di QC.md')


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('perintah', choices=['lint', 'video', 'semua'])
    ap.add_argument('target')
    ap.add_argument('--kedip', type=int, default=6)
    ap.add_argument('--maks-dur', type=float, default=60)
    a = ap.parse_args()
    proyek, mp4 = cari_proyek(a.target)
    L = Laporan()
    if a.perintah in ('lint', 'semua'):
        lint(proyek, L)
    if a.perintah in ('video', 'semua'):
        video(proyek, mp4, L, a.kedip, a.maks_dur)
    hasil = 'GAGAL' if L.gagal else 'LULUS'
    teks = f'# QC {proyek.name} | {hasil}\n\n' + (f'Video: `{mp4.name}`\n\n' if mp4 else '') + '\n'.join(L.baris) + \
           f'\n\n{L.gagal} gagal | {L.peringatan} peringatan\n'
    (proyek / 'qc').mkdir(exist_ok=True)
    (proyek / 'qc' / 'laporan.md').write_text(teks, encoding='utf-8')
    print(teks)
    sys.exit(1 if L.gagal else 0)


if __name__ == '__main__':
    main()
