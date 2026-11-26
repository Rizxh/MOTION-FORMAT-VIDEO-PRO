#!/usr/bin/env python
"""Voice over GRATIS (tanpa kredit ElevenLabs) dengan edge-tts (github.com/rany2/edge-tts).

  python -m pip install edge-tts           (sekali saja)
  python tools/tts_gratis.py suara                                  daftar suara Indonesia
  python tools/tts_gratis.py vo <proyek> --no 1 --teks "Kalimat..." [--suara id-ID-ArdiNeural] [--laju -4%] [--nada -6Hz]
  python tools/tts.py kata <proyek>                                 kata.js dari waktu kata (sama seperti ElevenLabs)

Hasil: <proyek>/assets/audio/vo-01.mp3 + vo-01.kata.json (waktu tiap kata asli dari mesin suara).
Suara dirapikan ffmpeg: potong hening ujung, hangatkan bas, kompresi ringan, loudness -16 LUFS.
Bawaan "Ko Popo": id-ID-ArdiNeural, laju -4%, nada -6Hz (lebih tenang & berat).
Catatan: butuh internet (layanan suara Microsoft Edge). Bukan suara clone; clone Ko Popo tetap di tools/tts.py.
"""
import argparse, asyncio, json, re, shutil, subprocess, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent


def proyek(nama):
    p = Path(nama)
    if not p.exists():
        p = ROOT / 'proyek' / nama
    if not (p / 'scene.html').exists():
        sys.exit(f'Proyek tidak ditemukan: {nama}')
    return p.resolve()


def ffmpeg():
    f = shutil.which('ffmpeg')
    if not f:
        sys.exit('ffmpeg tidak ada di PATH')
    return f


async def bicara(teks, suara, laju, nada, mentah):
    import edge_tts
    c = edge_tts.Communicate(teks, suara, rate=laju, pitch=nada, boundary='WordBoundary')
    batas = []
    with open(mentah, 'wb') as f:
        async for ch in c.stream():
            if ch['type'] == 'audio':
                f.write(ch['data'])
            elif ch['type'] == 'WordBoundary':
                t0 = ch['offset'] / 1e7
                batas.append({'w': ch['text'], 't0': t0, 't1': t0 + ch['duration'] / 1e7})
    return batas


def tempel_tanda_baca(batas, teks):
    """kata dari mesin suara tanpa tanda baca → pakai token asli naskah (agar subtitle tahu jeda kalimat)"""
    token = [t for t in re.split(r'\s+', re.sub(r'\[[^\]]*\]', ' ', teks)) if t.strip()]
    norm = lambda s: re.sub(r'[^\w]', '', s.lower())
    out, j = [], 0
    for b in batas:
        w = b['w']
        for k in range(j, min(j + 4, len(token))):
            if norm(token[k]).startswith(norm(b['w'])) or norm(b['w']).startswith(norm(token[k])):
                w, j = token[k], k + 1
                break
        out.append({'w': w, 't0': round(b['t0'], 3), 't1': round(b['t1'], 3)})
    return out


def cmd_vo(a):
    p = proyek(a.proyek)
    d = p / 'assets' / 'audio'; d.mkdir(parents=True, exist_ok=True)
    nama = f'vo-{a.no:02d}'
    mentah = d / f'.{nama}.mentah.mp3'
    batas = asyncio.run(bicara(a.teks, a.suara, a.laju, a.nada, mentah))
    awal = batas[0]['t0'] if batas else 0
    geser = max(0.0, awal - .06)
    akhir = d / f'{nama}.mp3'
    saring = (f'atrim=start={geser:.3f},asetpts=PTS-STARTPTS,areverse,silenceremove=start_periods=1:start_threshold=-45dB,areverse,'
              'highpass=f=70,equalizer=f=160:t=q:w=1:g=2.5,equalizer=f=3200:t=q:w=1.2:g=1.5,'
              'acompressor=threshold=-18dB:ratio=2.5:attack=8:release=120,loudnorm=I=-16:TP=-1.5:LRA=9')
    subprocess.run([ffmpeg(), '-y', '-loglevel', 'error', '-i', str(mentah), '-af', saring, '-ar', '44100', '-b:a', '192k', str(akhir)], check=True)
    mentah.unlink(missing_ok=True)
    kata = [{'w': k['w'], 't0': round(k['t0'] - geser, 3), 't1': round(k['t1'] - geser, 3)} for k in tempel_tanda_baca(batas, a.teks)]
    (d / f'{nama}.kata.json').write_text(json.dumps(kata, ensure_ascii=False), encoding='utf-8')
    dur = float(subprocess.run([ffmpeg().replace('ffmpeg', 'ffprobe'), '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', str(akhir)],
                               capture_output=True, text=True).stdout.strip() or 0)
    print(f'OK {akhir.name}  {dur:.2f} dtk · {len(kata)} kata · {a.suara} {a.laju} {a.nada}')


def cmd_suara(a):
    import edge_tts
    for v in asyncio.run(edge_tts.list_voices()):
        if v['Locale'].startswith('id-') or v['Locale'].startswith('ms-'):
            print(f"{v['ShortName']:28} {v['Gender']}")


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sp = ap.add_subparsers(dest='cmd', required=True)
    sp.add_parser('suara')
    v = sp.add_parser('vo'); v.add_argument('proyek'); v.add_argument('--no', type=int, required=True); v.add_argument('--teks', required=True)
    v.add_argument('--suara', default='id-ID-ArdiNeural'); v.add_argument('--laju', default='-4%'); v.add_argument('--nada', default='-6Hz')
    a = ap.parse_args()
    {'vo': cmd_vo, 'suara': cmd_suara}[a.cmd](a)


if __name__ == '__main__':
    main()
