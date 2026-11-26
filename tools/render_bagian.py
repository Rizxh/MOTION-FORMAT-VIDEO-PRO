#!/usr/bin/env python
"""Render ulang SEBAGIAN video lalu sambung ke MP4 lama (hemat waktu bila QC gagal hanya di satu adegan).

  python tools/render_bagian.py <proyek> --dari 24.5 --sampai 30.5 [--mp4 nama.mp4] [--crf 14] [--fps 30]

Syarat supaya sambungan tidak kelihatan: --dari dan --sampai jatuh tepat di potongan kamera keras (cut) atau
dip gelap, karena perubahan scene.html bisa sedikit mengubah frame lain. MP4 lama dicadangkan sebagai
<nama>.sebelum-tambal.mp4; audio diambil dari MP4 lama tanpa diubah.
"""
import argparse, os, shutil, subprocess, sys
from pathlib import Path

SKILL = Path.home() / '.claude' / 'skills' / 'motion-format' / 'scripts'


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('proyek'); ap.add_argument('--dari', type=float, required=True); ap.add_argument('--sampai', type=float, required=True)
    ap.add_argument('--mp4', default=''); ap.add_argument('--crf', default='14'); ap.add_argument('--fps', type=int, default=30)
    a = ap.parse_args()
    p = Path(a.proyek)
    if not p.exists():
        p = Path(__file__).resolve().parent.parent / 'proyek' / a.proyek
    p = p.resolve()
    mp4 = p / (a.mp4 or f'{p.name}.mp4')
    if not mp4.exists():
        sys.exit(f'MP4 lama tidak ada: {mp4}')
    sys.path.insert(0, str(SKILL)); import mf
    mf.cmd_rakit(argparse.Namespace(proyek=str(p)))           # index.html terbaru dari scene.html
    ff = mf.cari_ffmpeg(); i0, i1 = round(a.dari * a.fps), round(a.sampai * a.fps)
    bagian = p / '.bagian.mp4'
    hal = mf.Halaman(p / 'index.html')
    enc = subprocess.Popen([ff, '-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', str(a.fps), '-c:v', 'mjpeg', '-i', '-',
                            '-c:v', 'libx264', '-preset', 'slow', '-crf', a.crf, '-pix_fmt', 'yuv420p', str(bagian)], stdin=subprocess.PIPE)
    try:
        for i in range(i0, i1):
            hal.ke(i / a.fps); enc.stdin.write(hal.foto(95))
            if (i - i0) % 30 == 0:
                print(f'  {i - i0}/{i1 - i0} frame', flush=True)
    finally:
        enc.stdin.close(); enc.wait(); hal.tutup()
    cadang = mp4.with_name(mp4.stem + '.sebelum-tambal.mp4')
    if not cadang.exists():
        shutil.copy2(mp4, cadang)
    t0, t1 = i0 / a.fps, i1 / a.fps
    fc = (f'[0:v]trim=end={t0:.4f},setpts=PTS-STARTPTS[a];[1:v]setpts=PTS-STARTPTS[b];'
          f'[0:v]trim=start={t1:.4f},setpts=PTS-STARTPTS[c];[a][b][c]concat=n=3:v=1:a=0[v]')
    tmp = p / '.tambal.mp4'
    subprocess.run([ff, '-y', '-loglevel', 'error', '-i', str(cadang), '-i', str(bagian), '-filter_complex', fc, '-map', '[v]', '-map', '0:a?',
                    '-c:v', 'libx264', '-preset', 'slow', '-crf', a.crf, '-pix_fmt', 'yuv420p', '-c:a', 'copy', '-movflags', '+faststart', str(tmp)], check=True)
    os.replace(tmp, mp4); bagian.unlink(missing_ok=True)
    print(f'selesai -> {mp4} (frame {i0}-{i1} diganti; cadangan {cadang.name})')


if __name__ == '__main__':
    main()
