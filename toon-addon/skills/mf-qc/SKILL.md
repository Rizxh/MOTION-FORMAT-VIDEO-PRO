---
name: mf-qc
description: Quality gate for Motion Format videos (toon-3d, sejarah-3d, Shifu Po, Doktermobil). Use before sending, uploading or calling any rendered MP4 "done", after writing or editing a scene.html, and whenever the user reports flicker ("kedip"), shake ("goyang"), blurry or broken output ("pecah", "aset rusak"). Runs tools/qc.py lint/video and the visual checklist in QC.md.
---

# mf-qc: gerbang kualitas video

Tidak ada video yang dikirim ke user sebelum lulus empat gerbang di bawah. Kalau satu gerbang gagal, perbaiki,
jalankan ulang gerbang itu, lalu lanjut. Repo kerja: folder yang berisi `tools/qc.py` (biasanya
`MOTION-FORMAT-VIDEO-PRO`). Di Windows pakai `python`.

## Gerbang 1: lint (setelah scene.html ditulis atau diubah)
```
python tools/qc.py lint <proyek>
```
Wajib 0 gagal. Aturan yang dicek:
- tanpa goyang genggam `nz(t…)`
- tanpa `grainOn`
- tanpa `D.guncang`
- toon-3d wajib `D.pusatBayangan` diset per set
- durasi ≤ 60 dtk

Template `sejarah-3d` bawaan melanggar dua aturan pertama (goyang genggam dan grainOn). Hapus keduanya setiap kali
membuat proyek dari template itu.

## Gerbang 2: potret aset (sebelum render)
`mf.py potret <proyek> --t ...` dengan minimal satu waktu per adegan, ditambah satu frame dekat untuk tiap aset
yang baru dibuat. Baca `lembar.jpg` dan centang semua poin **DAFTAR CEK MATA** di `QC.md`:
1. bentuk aset
2. tidak terpotong
3. tidak terhalang
4. teks
5. cahaya
6. gerak
7. cocok naskah
8. CTA

Aset prosedural yang terlihat seperti gumpalan, kait, tenda, atau kotak polos harus diperbaiki dulu. Jangan lanjut
render dengan alasan "nanti tidak kelihatan".

## Gerbang 3: video (setelah render)
```
python tools/qc.py video <proyek>
```
Wajib 0 gagal. Batasnya:
- kedip ≤ 6 titik
- tanpa frame hitam di tengah
- resolusi 1080×1920 atau 2160×3840
- durasi ≤ 60 dtk

Loudness -16 s/d -14 LUFS boleh berupa peringatan.

## Gerbang 4: mata
Buka `<proyek>/qc/lembar-qc.jpg` (1 frame per 2 dtk) dan cek lagi DAFTAR CEK MATA, dari frame pertama sampai
terakhir.

## Saat melapor ke user
- Sebutkan hasil tiap gerbang dalam satu baris, misalnya `kedip 0 titik, durasi 50 dtk, 1080×1920`.
- Kalau ada yang belum dicek, katakan terus terang.
- Jangan menyebut video "sudah dicek" kalau baru sebagian frame yang dilihat.

## Kalau user melapor kedip, goyang, pecah, atau aset rusak
1. Jalankan `python tools/qc.py video <proyek>`. Catat detik kedipnya, lalu ambil 4 frame berurutan di detik itu dengan
   `ffmpeg -ss <dtk> -i video.mp4 -vf "scale=360:-1,tile=4x1" -frames:v 1 kedip.jpg` dan bandingkan.
2. Cari penyebab di tabel "Yang dicek otomatis" di `QC.md`, perbaiki di `scene.html`, lalu lint dan potret lagi.
3. Pilih cara render ulang (tabel "tambal sebagian atau render ulang penuh" di `QC.md`):
   - Masalah hanya di satu adegan dan bisa dibatasi di potongan kamera: `python tools/render_bagian.py <proyek> --dari <dtk> --sampai <dtk>`.
   - Selain itu, render ulang penuh dengan `MF_CRF=14`.
4. Jalankan gerbang 3 dan 4 lagi, termasuk melihat frame di titik sambungan, sebelum mengirim.
