#!/usr/bin/env python
"""Render Motion Format paralel: frame dipecah ke beberapa Chrome headless, lalu disambung + diberi suara.

  python tools/render_paralel.py <proyek> --out final.mp4 [--n 8] [--audio mix.m4a] [--fps 30]

Tiap pekerja merender potongan frame [i0, i1) ke chunk_k.mp4 (port Chrome berbeda), lalu
semua potongan disambung tanpa encode ulang dan digabung dengan audio (durasi dicek).
"""
import argparse, os, subprocess, sys, time
from pathlib import Path

SKILL = Path.home() / '.claude' / 'skills' / 'motion-format' / 'scripts'


def pekerja(proyek, i0, i1, out, fps):
    sys.path.insert(0, str(SKILL))
    import mf
    p = Path(proyek).resolve()
    html = p / 'index.html'
    hal = mf.Halaman(html)
    ff = mf.cari_ffmpeg()
    enc = subprocess.Popen([ff, '-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', str(fps), '-c:v', 'mjpeg', '-i', '-',
                            '-c:v', 'libx264', '-preset', 'medium', '-crf', '18', '-pix_fmt', 'yuv420p', str(out)], stdin=subprocess.PIPE)
    try:
        for i in range(i0, i1):
            hal.ke(i / fps)
            enc.stdin.write(hal.foto())
    finally:
        enc.stdin.close(); enc.wait(); hal.tutup()


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('proyek'); ap.add_argument('--out', required=True); ap.add_argument('--n', type=int, default=8)
    ap.add_argument('--audio', default=''); ap.add_argument('--fps', type=int, default=30)
    ap.add_argument('--_pekerja', nargs=4, metavar=('I0', 'I1', 'OUT', 'PORT'))
    a = ap.parse_args()
    if a._pekerja:
        i0, i1, out, port = a._pekerja
        pekerja(a.proyek, int(i0), int(i1), out, a.fps); return
    sys.path.insert(0, str(SKILL))
    import mf
    p = Path(a.proyek).resolve()
    mf.rakit(p)
    hal = mf.Halaman(p / 'index.html'); dur = float(hal.info['d']); hal.tutup()
    n = int(round(dur * a.fps)); step = -(-n // a.n)
    tmp = p / '.paralel'; tmp.mkdir(exist_ok=True)
    print(f'{n} frame, {a.n} pekerja, mulai {time.strftime("%H:%M:%S")}', flush=True)
    procs = []
    for k in range(a.n):
        i0, i1 = k * step, min(n, (k + 1) * step)
        if i0 >= i1: break
        env = dict(os.environ, MF_PORT=str(9700 + k))
        procs.append(subprocess.Popen([sys.executable, __file__, str(p), '--out', a.out, '--fps', str(a.fps),
                                       '--_pekerja', str(i0), str(i1), str(tmp / f'chunk_{k:02d}.mp4'), str(9700 + k)], env=env))
    gagal = [pr.wait() for pr in procs]
    if any(gagal): sys.exit(f'pekerja gagal: {gagal}')
    daftar = tmp / 'daftar.txt'
    daftar.write_text(''.join(f"file '{(tmp / f'chunk_{k:02d}.mp4').as_posix()}'\n" for k in range(len(procs))), encoding='utf-8')
    sunyi = tmp / 'sunyi.mp4'
    subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', str(daftar), '-c', 'copy', str(sunyi)], check=True)
    out = p / a.out
    if a.audio:
        subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', str(sunyi), '-i', str(p / a.audio), '-map', '0:v', '-map', '1:a', '-c:v', 'copy',
                        '-c:a', 'copy', '-t', f'{dur:.3f}', '-movflags', '+faststart', str(out)], check=True)
    else:
        sunyi.replace(out)
    d = float(subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', str(out)], capture_output=True, text=True).stdout)
    print(f'selesai {time.strftime("%H:%M:%S")} -> {out} ({d:.2f} dtk dari {dur:.2f})', flush=True)
    if d < dur - .5: sys.exit('DURASI KURANG')


if __name__ == '__main__':
    main()
