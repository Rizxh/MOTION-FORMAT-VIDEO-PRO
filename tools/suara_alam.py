#!/usr/bin/env python
"""Suara alam GRATIS dibuat dengan ffmpeg (tanpa unduh, tanpa kredit). Hasil ke <proyek>/assets/audio/.

  python tools/suara_alam.py <proyek> [jenis ...]
  jenis: ombak angin layar derit ciprat (bawaan: semua)

  amb-ombak.mp3      42 dtk  ombak bergulung (noise coklat berirama 7,3 dtk + pecahan buih)   loop, vol .2–.55
  amb-anginlaut.mp3  42 dtk  angin laut (pita noise pink naik-turun)                          loop, vol .3–.45
  sfx-layar.mp3      1,6 dtk layar kain berkibar                                              vol .4
  sfx-derit.mp3      1,6 dtk kayu / tali berderit                                             vol .3
  sfx-ciprat.mp3     2,2 dtk cipratan air di haluan                                           vol .35–.45
Untuk ambience darat (burung, sungai, jangkrik) lihat proyek/sp-tulou-v2/assets/audio (amb-*.mp3).
"""
import pathlib, shutil, subprocess, sys

RESEP = {
    'ombak': ('amb-ombak.mp3', ['-f', 'lavfi', '-i', 'anoisesrc=d=42:c=brown:r=44100:a=0.9:s=11', '-f', 'lavfi', '-i', 'anoisesrc=d=42:c=pink:r=44100:a=0.5:s=12',
              '-filter_complex', "[0]lowpass=f=420,volume='0.55+0.45*pow(sin(2*PI*t/7.3),2)':eval=frame[a];[1]highpass=f=900,lowpass=f=5200,volume='0.08+0.5*pow(max(0,sin(2*PI*(t-1.4)/7.3)),6)':eval=frame[b];[a][b]amix=inputs=2:normalize=0,afade=t=in:d=1,afade=t=out:st=40:d=2,loudnorm=I=-20:TP=-2", '-ac', '2']),
    'angin': ('amb-anginlaut.mp3', ['-f', 'lavfi', '-i', 'anoisesrc=d=42:c=pink:r=44100:a=0.8:s=21',
              '-af', "bandpass=f=600:width_type=q:w=0.7,volume='0.35+0.3*sin(2*PI*t/11)+0.15*sin(2*PI*t/3.7)':eval=frame,afade=t=in:d=1,afade=t=out:st=40:d=2,loudnorm=I=-24:TP=-3", '-ac', '2']),
    'layar': ('sfx-layar.mp3', ['-f', 'lavfi', '-i', 'anoisesrc=d=1.6:c=white:r=44100:a=0.9:s=31',
              '-af', "bandpass=f=1400:width_type=q:w=0.9,volume='pow(max(0,sin(2*PI*t*3.2)),3)*exp(-t*1.2)':eval=frame,loudnorm=I=-18:TP=-2"]),
    'derit': ('sfx-derit.mp3', ['-f', 'lavfi', '-i', "aevalsrc='0.6*sin(2*PI*(95+40*sin(2*PI*1.3*t))*t)*(0.5+0.5*sin(2*PI*17*t))*exp(-pow((t-0.7)/0.45,2))':s=44100:d=1.6",
              '-af', 'bandpass=f=320:width_type=q:w=1.2,loudnorm=I=-22:TP=-3']),
    'ciprat': ('sfx-ciprat.mp3', ['-f', 'lavfi', '-i', 'anoisesrc=d=2.2:c=pink:r=44100:a=0.9:s=41',
               '-af', "highpass=f=700,volume='exp(-t*2.2)*(1-exp(-t*30))':eval=frame,loudnorm=I=-18:TP=-2"]),
}


def main():
    if len(sys.argv) < 2:
        sys.exit(__doc__)
    p = pathlib.Path(sys.argv[1])
    if not p.exists():
        p = pathlib.Path(__file__).resolve().parent.parent / 'proyek' / sys.argv[1]
    out = p / 'assets' / 'audio'; out.mkdir(parents=True, exist_ok=True)
    ff = shutil.which('ffmpeg') or sys.exit('ffmpeg tidak ada di PATH')
    for j in (sys.argv[2:] or list(RESEP)):
        nama, arg = RESEP[j]
        subprocess.run([ff, '-y', '-loglevel', 'error', *arg, str(out / nama)], check=True)
        print('OK', out / nama)


if __name__ == '__main__':
    main()
