#!/usr/bin/env python
"""Suara ElevenLabs untuk proyek Motion Format (pakai API key di ../.env).

  python tools/tts.py kuota
  python tools/tts.py vo    <proyek> --no 1 --teks "[curious] Kalimat VO..."   [--ya] [--tempo 1.1] [--voice ID]
  python tools/tts.py sfx   <proyek> whoosh "soft airy whoosh" --dur 0.6       [--ya]
  python tools/tts.py kata  <proyek>     -> kata.js dari waktu kata asli ElevenLabs (lebih pas dari mf.py kata)

Tanpa --ya, perintah hanya menghitung karakter & sisa kuota (tidak memakai kredit).
<proyek> boleh nama folder di proyek/ atau path lengkap.
Hasil: <proyek>/assets/audio/vo-01.mp3 (+ vo-01.kata.json), sfx-<nama>.mp3.
"""
import argparse, base64, json, os, re, subprocess, sys, urllib.request, urllib.error
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
API = 'https://api.elevenlabs.io/v1'


def env():
    e = {}
    f = ROOT / '.env'
    if f.exists():
        for line in f.read_text(encoding='utf-8').splitlines():
            if '=' in line and not line.lstrip().startswith('#'):
                k, v = line.split('=', 1)
                e[k.strip()] = v.strip().strip('"')
    e.update({k: v for k, v in os.environ.items() if k.startswith('ELEVENLABS_')})
    if not e.get('ELEVENLABS_API_KEY'):
        sys.exit(f'ELEVENLABS_API_KEY belum diisi di {f}')
    return e


def req(path, key, body=None):
    r = urllib.request.Request(API + path, headers={'xi-api-key': key, 'Content-Type': 'application/json'},
                               data=json.dumps(body).encode() if body is not None else None,
                               method='POST' if body is not None else 'GET')
    try:
        with urllib.request.urlopen(r, timeout=180) as res:
            return res.read(), res.headers.get('Content-Type', '')
    except urllib.error.HTTPError as err:
        sys.exit(f'ElevenLabs {err.code}: {err.read().decode(errors="replace")[:400]}')


def kuota(key):
    d = json.loads(req('/user/subscription', key)[0])
    used, lim = d.get('character_count', 0), d.get('character_limit', 0)
    return lim - used, used, lim, d.get('tier')


def proyek(nama):
    p = Path(nama)
    if not p.is_absolute():
        p = ROOT / 'proyek' / nama if (ROOT / 'proyek' / nama).exists() or not p.exists() else p.resolve()
    if not p.exists():
        sys.exit(f'Proyek tidak ditemukan: {p}')
    (p / 'assets' / 'audio').mkdir(parents=True, exist_ok=True)
    return p


def cek_biaya(key, n, ya):
    sisa, used, lim, tier = kuota(key)
    print(f'Biaya ~{n} karakter | sisa kuota {sisa:,} dari {lim:,} ({tier})')
    if n > sisa:
        sys.exit('Kuota tidak cukup.')
    if not ya:
        sys.exit('Belum dijalankan. Tambahkan --ya untuk benar-benar generate.')


def ffmpeg():
    return os.environ.get('FFMPEG', 'ffmpeg')


def durasi(f):
    out = subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', str(f)],
                         capture_output=True, text=True).stdout.strip()
    return float(out or 0)


def kata_dari_alignment(al, tempo):
    ch, t0s, t1s = al['characters'], al['character_start_times_seconds'], al['character_end_times_seconds']
    words, cur = [], None
    for c, a, b in zip(ch, t0s, t1s):
        if c.isspace():
            if cur: words.append(cur); cur = None
            continue
        if cur is None:
            cur = {'w': '', 't0': a, 't1': b}
        cur['w'] += c; cur['t1'] = b
    if cur: words.append(cur)
    # buang tag nada seperti [curious] / [pause]
    out, dalam = [], False
    for w in words:
        if w['w'].startswith('['): dalam = True
        if not dalam:
            out.append({'w': w['w'], 't0': round(w['t0'] / tempo, 3), 't1': round(w['t1'] / tempo, 3)})
        if w['w'].endswith(']'): dalam = False
    return out


def cmd_vo(a):
    e = env(); key = e['ELEVENLABS_API_KEY']
    p = proyek(a.proyek)
    teks = a.teks.strip()
    cek_biaya(key, len(teks), a.ya)
    voice = a.voice or e.get('ELEVENLABS_VOICE_ID')
    model = a.model or e.get('ELEVENLABS_MODEL_ID', 'eleven_v4')
    body = {'text': teks, 'model_id': model, 'language_code': 'id',
            'voice_settings': {'stability': a.stability, 'similarity_boost': a.similarity}}
    raw, _ = req(f'/text-to-speech/{voice}/with-timestamps?output_format=mp3_44100_128', key, body)
    d = json.loads(raw)
    nama = f'vo-{a.no:02d}'
    mentah = p / 'assets' / 'audio' / f'{nama}.mentah.mp3'
    mentah.write_bytes(base64.b64decode(d['audio_base64']))
    akhir = p / 'assets' / 'audio' / f'{nama}.mp3'
    if abs(a.tempo - 1) > 1e-3:
        subprocess.run([ffmpeg(), '-y', '-loglevel', 'error', '-i', str(mentah), '-af', f'atempo={a.tempo}',
                        '-b:a', '192k', str(akhir)], check=True)
        mentah.unlink()
    else:
        mentah.replace(akhir)
    al = d.get('alignment') or d.get('normalized_alignment')
    if al:
        (p / 'assets' / 'audio' / f'{nama}.kata.json').write_text(
            json.dumps(kata_dari_alignment(al, a.tempo), ensure_ascii=False), encoding='utf-8')
    print(f'OK {akhir}  ({durasi(akhir):.2f} dtk, model {model}, tempo {a.tempo})')


def cmd_sfx(a):
    e = env(); key = e['ELEVENLABS_API_KEY']
    p = proyek(a.proyek)
    cek_biaya(key, int(a.dur * 40) + 1, a.ya)   # perkiraan kasar biaya efek suara
    raw, _ = req('/sound-generation?output_format=mp3_44100_128', key,
                 {'text': a.prompt, 'duration_seconds': a.dur, 'prompt_influence': 0.5})
    f = p / 'assets' / 'audio' / f'sfx-{a.nama}.mp3'
    f.write_bytes(raw)
    print(f'OK {f}  ({durasi(f):.2f} dtk)')


def cmd_kata(a):
    p = proyek(a.proyek)
    scene = (p / 'scene.html').read_text(encoding='utf-8')
    semua = []
    for m in re.finditer(r"src:\s*['\"]assets/audio/(vo-\d+)\.mp3['\"]\s*,\s*at:\s*([\d.]+)", scene):
        nama, at = m.group(1), float(m.group(2))
        f = p / 'assets' / 'audio' / f'{nama}.kata.json'
        if not f.exists():
            print(f'  ! {f.name} tidak ada (klip bukan dari tts.py?), dilewati'); continue
        for w in json.loads(f.read_text(encoding='utf-8')):
            semua.append({'w': w['w'], 't0': round(at + w['t0'], 3), 't1': round(at + w['t1'], 3)})
    if not semua:
        sys.exit('Tidak ada klip VO di SCENE.audio.vo yang punya .kata.json. Pakai mf.py kata sebagai gantinya.')
    (p / 'kata.js').write_text('/* dibuat tools/tts.py kata: waktu kata asli dari ElevenLabs. */\nwindow.KATA=' +
                               json.dumps(semua, ensure_ascii=False) + ';\n', encoding='utf-8')
    print(f'{len(semua)} kata -> {p / "kata.js"}')


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sp = ap.add_subparsers(dest='cmd', required=True)
    sp.add_parser('kuota')
    v = sp.add_parser('vo'); v.add_argument('proyek'); v.add_argument('--no', type=int, required=True)
    v.add_argument('--teks', required=True); v.add_argument('--ya', action='store_true')
    v.add_argument('--tempo', type=float, default=1.1); v.add_argument('--voice'); v.add_argument('--model')
    v.add_argument('--stability', type=float, default=0.5); v.add_argument('--similarity', type=float, default=0.9)
    s = sp.add_parser('sfx'); s.add_argument('proyek'); s.add_argument('nama'); s.add_argument('prompt')
    s.add_argument('--dur', type=float, default=0.8); s.add_argument('--ya', action='store_true')
    k = sp.add_parser('kata'); k.add_argument('proyek')
    a = ap.parse_args()
    if a.cmd == 'kuota':
        sisa, used, lim, tier = kuota(env()['ELEVENLABS_API_KEY'])
        print(f'Kuota ElevenLabs ({tier}): terpakai {used:,} / {lim:,} | sisa {sisa:,} karakter')
    else:
        {'vo': cmd_vo, 'sfx': cmd_sfx, 'kata': cmd_kata}[a.cmd](a)


if __name__ == '__main__':
    main()
