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
