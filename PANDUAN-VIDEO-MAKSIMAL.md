# Panduan video maksimal (Shifu Po · Motion Format)

Dirangkum dari pembuatan **Tulou v2** dan **Kompas Laut v2** (26–27 Nov 2026). Tujuannya: video berikutnya langsung
bagus dalam **satu putaran**, tanpa bolak-balik revisi. Ikuti urutan ini; setiap gerbang harus lulus sebelum lanjut.
Aturan dasar brand, lisensi, dan QC tetap di `HANDOFF.md`, `HANDOFF-2.md`, dan `QC.md`.

## 0. Standar "maksimal" (cek sebelum mulai)

| Aspek | Standar |
|---|---|
| Cerita | Satu benang merah yang **mengikat ke Shifu Po**: fakta/kisah → prinsip Feng Shui → contoh rumah nyata → luopan / konsultasi. Hook dan CTA saling menggema |
| Durasi | 60–90 dtk (QC maks 90). Padat: tiap kalimat punya visual sendiri |
| Suara | edge-tts `en-US-AndrewMultilingualNeural` +4..+7 %, −6 Hz, **satu klip per kalimat**, jeda .25–.45 dtk. Kalau lewat 90 dtk: `atempo` 1,02–1,03 + skala waktu kata (lihat §2) |
| Ambience | Selalu ada lapisan alam (ombak/angin/burung/sungai/jangkrik) per adegan + SFX di momen kunci, volume kecil |
| Pemandu | **Ko Popo 2D+** setengah badan kiri bawah, bibir lip-sync, pose ikut kalimat, melambai di CTA. Selang-seling **merah ↔ emas** per video |
| Dunia | Hidup: warga beraktivitas, hewan, air/angin bergerak. Ada shot setinggi mata, zoom detail, dan potongan (cutaway) kalau menjelaskan isi |
| Teks | Brand: Cinzel (judul/label) + Plus Jakarta Sans (subtitle), aksen emas. Satu judul per waktu; label tidak menumpuk subtitle |
| Gerak | Tanpa goyang/guncang/grain berkedip. Kamera spline mulus, potong keras di awal kalimat, dip gelap ≤ .4 dtk |

## 1. Rencana (15 menit)

1. **Pilih benang merah.** Contoh yang berhasil:
   - Tulou: "dari atas seperti cincin → tiap cincin satu kampung → *kampung digulung jadi cincin* → … → tempat duduk rumah Anda".
   - Kapal: "kompas pertama bukan untuk berlayar → **Feng Shui = angin & air** → arah rumah → isi rumah → luopan 24 arah".
2. **Tulis `vo.txt`** (satu kalimat per baris, 11–14 baris). Pola kalimat:
   hook paradoks → konteks/angka bersumber → analogi visual → mekanisme → **"Dalam Feng Shui, …"** → **"Secara nyata, …"** (dampak fisik) → contoh rumah (arah + isi) → CTA pertanyaan yang menggema hook.
3. **Untuk tiap kalimat, tulis visualnya** di `naskah.md` (tabel) + sumber fakta. Satu kalimat = satu shot (boleh dua untuk kalimat panjang).
4. Jangan klaim pasti (rezeki, jodoh). Arah spesifik selalu diberi konteks ("Di Tiongkok, artinya duduk di utara, menghadap selatan").

## 2. Suara (10 menit)

```powershell
python tools\tts_gratis.py vo <id> --no N --teks "..." --suara en-US-AndrewMultilingualNeural --laju=+5% --nada=-6Hz
python tools\suara_alam.py <id>                    # ombak, angin, layar, derit, ciprat (ffmpeg)
```
- Kalau edge-tts gagal `NoAudioReceived`: ulangi 2–4 kali (gangguan layanan).
- Hitung durasi & posisi klip (`at`) dengan skrip kecil; total = .45 + Σklip + Σjeda + 1,6 dtk ekor CTA ≤ 90.
- Terlalu panjang? Pangkas kalimat dulu, lalu `atempo` 1,02–1,03 untuk semua klip **dan** bagi `t0/t1` di `vo-NN.kata.json` dengan faktor yang sama.
- `SCENE.audio.vo` harus literal `{ src: 'assets/audio/vo-01.mp3', at: 0.45, teks: '...' }` lalu `python tools\tts.py kata <id>`.

## 3. Bangun adegan (pola kode yang terbukti)

- **Waktu dari kata:** `kt('kata', n, cadangan)`. Hitung dulu kemunculan ke-n (kata yang sama di kalimat lain ikut terhitung: "dua" di "lantai dua" vs "dua meter").
- **Kamera = daftar SHOT** `[mulai, selesai, [[pecahan, posisi, sasaran], ...]]` → `KUNCI`, `POTONG` dihitung otomatis. Potongan di awal kalimat (`VO[i] - .12`).
- **Shot yang membuat video "maksimal":**
  - pembuka udara tinggi yang menukik sampai setinggi mata (dalam satu shot);
  - **zoom detail** (panji/tali, kompas, papan nama) di kalimat "rahasianya / detailnya";
  - **analogi visual** yang bergerak (kampung lurus → cincin; mangkuk air → luopan);
  - **potongan (cutaway)**: atap disembunyikan, dinding transparan, perabot + arus energi di dalam;
  - kamera **dari depan ke belakang** untuk prinsip "bersandar/menghadap" (laut di depan, rumah tengah, bukit belakang).
- **Warga low-poly 3D** (`buatWarga`, `poseWarga`, langkah dari jarak) di dunia realistis; tokoh chibi hanya sebagai pemandu 2D (lapisan kanvas), jangan dicampur ke dunia 3D realistis.
- **Ko Popo pemandu:** kanvas 640×640 di (−60, 1090), `mask-image` pudar di bawah, cahaya radial di belakang, `subY = 1030` (CTA 1150), `TOKOH_TOON.lipsync(t, KATA)`, `pegang:'kipas'` lalu `'luopan'` saat bicara Feng Shui.
- **Label:** `lab(teks, dx, dy)`; anchor di titik 3D. Akhiri label **sebelum potongan berikutnya**. Kalau dekat subtitle (y ≈ 1030), pakai `dy` −330 s/d −430.

## 4. QC selama membangun (gerbang wajib)

1. `python tools\qc.py lint <id>` → 0 gagal.
2. `mf.py potret` tiap adegan (2–3 titik per kalimat), lalu **lihat lembar**. Satu putaran perbaikan per masalah, cek ulang hanya titik yang diubah, lalu satu potret menyeluruh (20+ titik) sebelum render.
3. Render: `$env:MF_PORT="95xx"; $env:MF_CRF="14"; mf.py render ...` (±1–1,4 dtk/frame; dua render paralel boleh, beda port).
4. `python tools\qc.py video <id>` → lulus, lalu lihat `qc/lembar-qc.jpg`.

### Jebakan yang SUDAH terjadi → cara cegah
| Gejala | Penyebab | Cegah |
|---|---|---|
| Kotak hitam di langit/laut | `pow()` dengan basis sedikit negatif (`1.-vUv.y`, `1.-dot(...)`) → NaN → melebar lewat bloom | selalu `pow(clamp(x,0.,1.), k)` di shader buatan sendiri |
| Silau putih di depan kamera | pita cahaya aditif terlalu tebal/dekat kamera | intensitas ≤ 2, radius kecil, mulai ≥ 4 m dari kamera |
| Teks menumpuk | label anchor dekat subtitle; judul lama belum keluar | `dy` lebih tinggi; judul keluar sebelum kalimat berikutnya |
| Label tertinggal di adegan lain | waktu akhir label = akhir pulau/set, bukan potongan berikut | akhir label = `P.<shot berikut> − .3` |
| Atap tidak hilang saat cutaway | ada pelat lain (lisplang) di atas rumah | kumpulkan semua mesh atap di array, sembunyikan semuanya |
| Objek utama tertutup pemandu | Ko Popo di kiri bawah | geser sasaran kamera supaya objek di tengah/atas |
| Halaman dalam terlalu gelap | bayangan dinding sore | naikkan `U.ex` & hemisfer khusus shot itu |
| Pohon menghalangi | sebaran acak di jalur kamera | buang titik pohon di koridor kamera |
| Subtitle berada di wajah | posisi subtitle tidak ikut tata letak pemandu | `subY` dihitung di satu tempat (`gambar`) |
| Shell heredoc gagal (`unexpected EOF`) | tanda kutip di dalam heredoc + rantai `&&` | tulis skrip ke file (Write), lalu `python file.py` |
| Rumah contoh terasa janggal ("rumah di tengah laut") | set rumah dibuat pulau kecil di dunia laut | set contoh harus sesuai konteks penonton: **komplek** (deretan rumah, jalan, kanal, taman, rumah jauh instanced); sembunyikan laut/kapal saat render shot rumah (simpan & kembalikan `visible` di sekitar `REN.render`, tetap deterministik) |
| Batang pohon tanpa daun dari kamera atas | pohon low-poly dilihat tegak lurus dari atas | sembunyikan pohon di belakang rumah selama shot cutaway |
| Atap raksasa sekilas di awal cutaway | atap baru hilang saat fade > .35 | sembunyikan atap tepat di awal shot `dalam` |
| Klip VO hilang | layanan edge-tts sesekali menolak | loop ulang per klip |

## 5. Penutup

- Kirim MP4 yang lulus QC, commit + push **tanpa MP4/index.html** (`.gitignore`), catat status di HANDOFF.
- Simpan pelajaran baru di tabel jebakan di atas.
