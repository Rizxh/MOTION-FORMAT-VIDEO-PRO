# HANDOFF 2 · Shifu Po & Doktermobil (Motion Format) · 26–27 Nov 2026

> Tempel seluruh isi file ini ke Claude di akun berikutnya. Ini lanjutan dari `HANDOFF.md`, jadi baca juga file itu
> untuk aturan dasar (brand, Ko Popo, lisensi). Bahasa dengan user: Indonesia santai, kalimat pendek.
> Folder kerja: `C:\Portofolio\MOTION-FORMAT-VIDEO-PRO` (repo publik `Rizxh/MOTION-FORMAT-VIDEO-PRO`, branch `main`,
> push langsung boleh dan sudah jalan dari mesin ini). Windows: pakai `python`.

## 1. Aturan baru dari user (wajib)
- **Tanpa kedip, goyang, atau gambar pecah.** User marah saat video berkedip. Setiap video wajib lulus QC (lihat §3)
  sebelum dikirim.
- **Story, bukan baca berita.** Format "X vs Y" seperti Nico vs Simon (contoh: Cimeng vs Bipong). Hook dan CTA harus
  nyambung ("Anda tim Cimeng atau tim Bipong?").
- **Suara gratis yang hidup.** Suara Ardi (`id-ID-ArdiNeural`) terlalu kaku. Yang dipilih user adalah
  `en-US-AndrewMultilingualNeural` sebagai narator (laju +2..+6%, nada -4..-6Hz). Dialog tokoh pakai Brian (muda) atau
  William (tua). Buat satu klip per kalimat dengan jeda 0,3–0,5 dtk. Kuota ElevenLabs habis (sisa 63 karakter), jangan
  dipakai tanpa izin.
- **Durasi boleh lebih dari 60 dtk** (target 60–90) asal padat. Video 50 dtk dinilai "singkat banget".
- **Gaya Sejarah 3D** (seperti contoh kapal Cheng Ho) disukai untuk Shifu Po. Kamera harus mulus: hapus `nz()` dan
  `grainOn()` dari template.
- Kirim video yang lulus QC **langsung**, tanpa menunggu video lain.
- Prioritaskan permintaan terbaru user. Render ulang video lama hanya kalau diminta.

## 2. Video yang dibuat (semua di `proyek/`)
| Proyek | Gaya | Durasi | Status |
|---|---|---|---|
| `sp-bazi-cimeng-bipong` | toon-3d, story Cimeng vs Bipong (BaZi), Ko Popo merah | 47,5 dtk | MP4 jadi & terkirim. **Berkedip** (19 titik, bayangan ikut kamera). Sudah diperbaiki di scene (`D.pusatBayangan`), **belum dirender ulang** (user: "nanti aja") |
| `dm-obeng-scanner` | toon-3d, Doktermobil "Dari Obeng ke Scanner" (1886 Benz → 1913 Ford → karburator → OBD 1996 → scanner) | 58 dtk | MP4 terkirim tapi **jelek**: kedip 102 titik, roda mobil seperti kait, Ford gumpalan, judul tumpuk. Saran: buat ulang dengan gaya Sejarah 3D. Belum diputuskan user |
| `sp-kaisar-jingshan` | sejarah-3d, "Gunung Buatan untuk Kaisar" (Kota Terlarang 1406, bukit Jingshan) | 50 dtk | **Lulus QC & terkirim.** User: bagus tapi singkat |
| `sp-kompas-laut` | sejarah-3d (kapal Cheng Ho dari contoh), "Kompas Pertama Bukan untuk Berlayar" (angin muson, kompas air → luopan) | 54 dtk | **Lulus QC & terkirim.** User boleh dipanjangkan; usulan tambah "7 pelayaran 1405–1433 sampai Afrika Timur" + "arah jarum dicatat di peta pelayaran" (±70 dtk). Menunggu keputusan user |
| `sp-tulou-fujian` | sejarah-3d, "Tulou Fujian" (rumah tanah bundar Hakka, 288 kamar, Feng Shui, siang → malam) | 88 dtk | **Sedang render** saat handoff ditulis. Kalau MP4 belum ada / proses mati: jalankan ulang render (§5), lalu QC, lalu kirim |

Naskah & sumber fakta tiap video ada di `proyek/<id>/naskah.md`. Contoh gambar 8 gaya + preview ada di
`style-image/` (lokal, tidak di repo).

## 3. Sistem QC (dibuat sesi ini, sudah di GitHub)
- `tools/qc.py lint <proyek>`: memeriksa goyang `nz(t`, `grainOn`, `D.guncang`, toon-3d tanpa `D.pusatBayangan`,
  dan durasi ≤ 90.
- `tools/qc.py video <proyek>`: memeriksa kedip (osilasi kecerahan; potongan kamera tidak dihitung), frame hitam,
  resolusi, durasi, dan loudness. Juga membuat `qc/lembar-qc.jpg` (1 frame per 2 dtk) yang wajib dilihat.
- `tools/render_bagian.py <proyek> --dari X --sampai Y`: render ulang satu rentang lalu sambung ke MP4 lama
  (cadangan `*.sebelum-tambal.mp4`). Pakai hanya kalau batasnya potongan kamera atau dip gelap.
- `QC.md`: alur 4 gerbang, daftar cek mata, tabel penyebab ke perbaikan, dan aturan tambal vs render penuh.
- Skill `mf-qc` (`toon-addon/skills/mf-qc/SKILL.md`), dipasang oleh `python toon-addon/pasang.py` ke
  `~/.claude/skills/mf-qc`.

**Penyebab kedip yang sudah ditemukan:**
1. toon-3d: bayangan matahari ikut kamera. Perbaikan: `D.pusatBayangan = new THREE.Vector3(x,0,z)` per set.
2. Shot udara: z-fighting dua bidang datar berjarak 7 cm. Perbaikan: jarak ≥ 0,5 m dan `cam.near = max(1, tinggi/25)`.
3. Partikel angin terlalu dekat kamera berkilat. Perbaikan: jauhkan dari jalur kamera dan redupkan.

## 4. Lisensi & repo
- Skill Motion Format berlisensi: jangan di-push. `scene.html` proyek sejarah-3d (`sp-kompas-laut`,
  `sp-kaisar-jingshan`, `sp-tulou-fujian`) sebagian besar kode template, jadi masuk `.gitignore`. Naskah dan aset
  audio boleh di-push.
- `index.html`, MP4, `qc/`, `style-image/`, `proyek/_contoh-*` di-ignore.
- Commit terakhir: `146a55f`. Perubahan yang belum di-commit: proyek `sp-tulou-fujian` (sudah di-stage) dan
  `HANDOFF-2.md`.
- Folder `komik/01-tusuk-sate/` ikut ter-push di commit `40d3a73`. File itu bukan buatan sesi ini (mungkin dari sesi
  lain); user belum menanggapi.

## 5. Perintah penting
```powershell
$MF = "$env:USERPROFILE\.claude\skills\motion-format\scripts\mf.py"
python $MF baru proyek\<id> --dasar sejarah-3d --rasio 9:16      # lalu HAPUS nz() & grainOn dari scene.html
python tools\tts_gratis.py vo <id> --no 1 --teks "..." --suara en-US-AndrewMultilingualNeural --laju=+4% --nada=-6Hz
python tools\tts.py kata <id>                                    # butuh SCENE.audio.vo literal {src, at, teks}
python tools\qc.py lint <id>
$env:MF_PORT="9555"; python $MF potret proyek\<id> --t 1,5,10   # lihat lembar.jpg
$env:MF_CRF="14"; python $MF render proyek\<id> --out <id>.mp4   # ±25–35 menit
python tools\qc.py video <id>                                    # wajib LULUS sebelum kirim
```
Dua render sekaligus: pakai `MF_PORT` berbeda (9444, 9555, 9666). Cek error halaman lewat skrip debug kecil yang
memanggil `mf.Halaman` dan membaca `window.__errs`. Error umum: nama global bentrok dengan mesin (`kanvas`, `label`,
`seg`, `E`, `W`, `H`, `rng`, `hash`, `nz`), atau `D.kabel` butuh `THREE.Vector3`, bukan array.

## 6. Cara membuat Sejarah 3D baru (pola yang terbukti)
1. Proyek dari template, lalu salin blok renderer/kabut/langit (bagian [2]–[3]) dan `asapTex`. Ganti [4]–[8] dengan
   dunia sendiri.
2. Kamera: daftar `KUNCI` + `POTONG` (potong keras antar adegan), spline catmull, **tanpa goyang**.
3. Label menempel titik 3D pakai `label()` dan `proyeksiDunia()`. Judul pakai `#tHook` dan `#tJudul` (wIn/wOut).
   Kartu CTA Shifu Po memakai HTML `#cta`.
4. Setelah semua adegan dipotret, cek dekat tiap aset baru (bentuk, terpotong, terhalang pohon, teks tumpuk,
   bidang putih silau).
5. Waktu dari kata VO (`kt('kata', n, cadangan)`).

## 7. Langkah berikutnya
1. Tunggu atau ulang render `sp-tulou-fujian`, jalankan QC, kirim ke user, lalu commit dan push (scene.html sudah di-ignore).
2. Tanya user: panjangkan video kapal (±70 dtk)? Buat ulang Domo dengan gaya Sejarah 3D? Render ulang Cimeng
   (anti kedip)?
3. Simpan pola Sejarah 3D Shifu Po (lembah, kota, kapal) sebagai kerangka yang bisa dipakai ulang bila user minta
   lebih banyak video.

## 8. Update 27 Nov 2026 (malam): revisi kualitas Tulou & Kapal
- **Baca dulu `PANDUAN-VIDEO-MAKSIMAL.md`**: standar "maksimal", urutan kerja, dan tabel jebakan yang sudah terjadi.
- `proyek/sp-tulou-v2` (89,3 dtk): naskah baru bercerita (cincin = kampung, **kampung digulung jadi cincin**),
  warga low-poly beraktivitas (halaman, galeri, sawah, gerbang malam, rumah modern), lampion menyala bergiliran,
  pohon detail, papan 土楼, font brand, **Ko Popo merah** sebagai pemandu 2D+ (lip-sync, melambai di CTA).
- `proyek/sp-kompas-v2` (89,8 dtk): kapal Cheng Ho + rute 7 pelayaran, zoom panji, 風水 = angin & air, komplek perumahan (rumah tetangga, kanal, jalan, taman berkolam, rumah jauh)
  (angin datang, air mengalir, pintu, arah energi, mawar mata angin), **arah bangun** (bersandar bukit, menghadap terbuka,
  di Tiongkok duduk utara menghadap selatan), **potongan isi rumah**, luopan 24 arah, **Ko Popo emas**, suara laut ffmpeg.
- Alat baru: `tools/suara_alam.py` (ombak, angin, layar, derit, ciprat).
- Ko Popo berikutnya: **merah** (urutan: Tulou merah, Kapal emas).
- Render keduanya CRF 14; QC video wajib sebelum kirim. `scene.html` sejarah-3d tetap di-ignore (kode template berlisensi).
