# QC video: cek sebelum dikirim

Video tidak boleh dikirim ke klien atau diunggah sebelum lulus QC. Aturan ini dibuat setelah dua kejadian
pada 26 Nov 2026:

- **Kedip-kedip.** Video Domo "Dari Obeng ke Scanner" punya 102 titik kedip, Cimeng vs Bipong punya 19.
  Penyebabnya peta bayangan matahari yang ikut bergeser bersama kamera.
- **Aset rusak.** Roda mobil terlihat seperti kait hitam, mobil Ford cuma gumpalan, dan dua judul menumpuk.
  Masalah ini lolos karena hanya beberapa frame yang dicek.

Alatnya `tools/qc.py`. Skill Claude `mf-qc` (di `toon-addon/skills/mf-qc/`) menjalankan alur ini otomatis.

## Alur (4 gerbang)

| Gerbang | Kapan | Perintah / cara | Lulus bila |
|---|---|---|---|
| 1. Lint | setelah `scene.html` ditulis, sebelum potret | `python tools/qc.py lint <proyek>` | 0 gagal |
| 2. Potret aset | sebelum render | `mf.py potret <proyek> --t ...` minimal 1 frame per adegan + tiap aset baru dilihat dekat | semua poin DAFTAR CEK MATA lulus |
| 3. Video | setelah render | `python tools/qc.py video <proyek>` | 0 gagal (kedip ≤ 6, tanpa frame hitam, durasi ≤ 60) |
| 4. Mata | setelah gerbang 3 | buka `<proyek>/qc/lembar-qc.jpg` (1 frame per 2 dtk) | semua poin DAFTAR CEK MATA lulus |

`python tools/qc.py semua <proyek>` menjalankan gerbang 1 dan 3 sekaligus. Laporan tersimpan di
`<proyek>/qc/laporan.md`.

## Yang dicek otomatis

| Cek | Penyebab umum bila gagal | Perbaikan |
|---|---|---|
| Kamera goyang (`nz(t…)`) | template `sejarah-3d` memakai goyang genggam | `cam.position.set(p[0], p[1], p[2])` |
| Butiran film (`grainOn`) | template `sejarah-3d` memanggil `grainOn(.06)` | hapus panggilannya |
| `D.guncang` | guncangan kamera | hapus |
| Bayangan ikut kamera (toon-3d) | `D.pusatBayangan` tidak diset | `D.pusatBayangan = new THREE.Vector3(x, 0, z)` per set |
| Kedip di MP4 | bayangan berenang, bloom di bidang putih, garis tipis berkilau | kunci bayangan, gelapkan bidang putih besar, kurangi benda sangat tipis di jauh |
| Kedip di shot udara (warna tanah bergantian tiap frame) | z-fighting: dua bidang datar terlalu dekat (mis. 7 cm) dilihat dari ratusan meter | beri jarak ≥ 0,5 m antar lapisan tanah/lantai/air; `cam.near` ikut ketinggian (`Math.max(1, tinggi/25)`) |
| Frame hitam di tengah | `gelap`/dip terlalu lama, kamera di dalam objek | perpendek dip (≤ 0,4 dtk), cek posisi kamera |
| Durasi > 60 dtk | VO terlalu panjang | padatkan kalimat atau naikkan laju VO, jangan potong video |
| Loudness | VO terlalu pelan atau keras | target -16 s/d -14 LUFS, puncak ≤ -1 dBFS |

## DAFTAR CEK MATA (gerbang 2 dan 4)

Lihat tiap frame. Satu poin gagal berarti perbaiki dulu, lalu potret atau render ulang.

1. **Bentuk aset benar.** Roda bulat dan kelihatan sebagai ban, bukan kait atau garis. Mobil punya kaca, roda, dan
   lampu. Atap tidak runcing seperti tenda dan bubungannya tidak melayang. Benda dari zaman tertentu
   (Benz 1886, Ford T) mirip aslinya.
2. **Tidak ada yang terpotong.** Tokoh yang bicara masuk bingkai utuh, dari kepala sampai kaki atau setengah badan.
   Objek utama terlihat utuh minimal sekali.
3. **Tidak ada yang menghalangi.** Tidak ada pohon, tiang, kendaraan, atau warga di antara kamera dan tokoh.
4. **Teks.** Satu judul per waktu, tidak ada dua judul yang menumpuk. Subtitle tidak menutupi wajah. Label menunjuk benda
   yang benar dan tidak tertutup objek.
5. **Cahaya.** Tidak ada bidang putih yang silau (bloom). Tidak ada bagian hitam pekat tanpa detail.
6. **Gerak.** Bandingkan dua potret berurutan. Tokoh diam benar-benar diam, kamera tidak goyang, dan tidak ada benda yang
   berkedip atau melompat.
7. **Kecocokan naskah.** Visual tiap kalimat menunjukkan isi kalimat itu.
8. **CTA.** Kartu terbaca utuh, tombol tidak terpotong, dan tokoh di bawah kartu tidak tertutup subtitle.

## QC gagal: tambal sebagian atau render ulang penuh?

| Situasi | Pilihan | Perintah |
|---|---|---|
| Masalah hanya di satu adegan, dan perbaikannya tidak mengubah waktu, kamera, atau suara di adegan lain | **tambal sebagian** (menit, bukan puluhan menit) | `python tools/render_bagian.py <proyek> --dari <dtk> --sampai <dtk>` |
| Batas `--dari`/`--sampai` bisa diletakkan tepat di potongan kamera keras atau dip gelap | tambal sebagian | sambungan tidak terlihat |
| Perbaikan mengubah sesuatu yang terlihat di banyak adegan (cahaya, warna, tokoh, judul) | **render ulang penuh** | `mf.py render ...` |
| Waktu VO, naskah, atau durasi berubah | render ulang penuh | |
| Masalah di beberapa tempat berjauhan, atau tidak ada potongan di dekatnya | render ulang penuh | |

Setelah menambal, wajib: `qc.py video` lagi dan lihat frame di kedua titik sambungan
(`ffmpeg -ss <dtk-0,1> -i video.mp4 -vf "scale=270:-1,tile=6x1" -frames:v 1 sambung.jpg`).
MP4 lama otomatis dicadangkan sebagai `<nama>.sebelum-tambal.mp4`.

## Pengaturan render HD

| Kebutuhan | Pengaturan |
|---|---|
| Lebih tajam, tidak pecah | `MF_CRF=14` (bawaan 18; makin kecil makin tajam, file makin besar) |
| Super HD 2160×3840 | `MF_SKALA=2` (render ±4× lebih lama) |
| Dua render sekaligus | beda port: `MF_PORT=9444`, `MF_PORT=9555` |

Contoh (PowerShell):
```powershell
$env:MF_CRF="14"; python $MF render proyek\<nama> --out <nama>.mp4
python tools\qc.py video <nama>
```
