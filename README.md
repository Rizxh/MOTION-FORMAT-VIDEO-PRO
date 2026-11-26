# MOTION-FORMAT-VIDEO-PRO

Folder kerja video dengan skill **motion-format v2.0.0** (`~/.claude/skills/motion-format`).

```
.env              ElevenLabs: API key, voice d7XUsgDgmf1xpHAogu7G (KO POPO BERCERITA), model eleven_v4
brand/shifupo/    BRAND.md (palet, font, zona aman) + logo
tools/tts.py      generate VO / efek suara via API + waktu kata asli untuk subtitle
proyek/<nama>/    satu folder per video (scene.html, gaya.md, naskah.md, assets/audio, MP4)
RENCANA-*.md      rencana topik
```

## Perintah (Windows: pakai `python`, bukan `python3`)

```
python %USERPROFILE%\.claude\skills\motion-format\scripts\mf.py baru proyek\<nama> --dasar <gaya> --rasio 9:16
python %USERPROFILE%\.claude\skills\motion-format\scripts\mf.py potret proyek\<nama> --t 0.5,3,7
python tools\tts.py kuota
python tools\tts.py vo <nama> --no 1 --teks "[curious] Kalimat..."    (tanpa --ya = cek biaya saja)
python tools\tts.py sfx <nama> whoosh "soft airy whoosh" --dur 0.6
python tools\tts.py kata <nama>                                         (kata.js dari waktu asli ElevenLabs)
python %USERPROFILE%\.claude\skills\motion-format\scripts\mf.py render proyek\<nama> --sampai 8
```

Kredit ElevenLabs hanya terpakai kalau ada `--ya`. Default VO: stability 0.5, similarity 0.9, tempo 1.1.
