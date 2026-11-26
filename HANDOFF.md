# HANDOFF · Motion Format Toon 3D untuk Shifu Po

> Tempel seluruh isi file ini ke Claude (akun lain) supaya langsung paham progres. Ditulis 26 Nov 2026.
> Bahasa dengan user: Indonesia santai, kalimat pendek. Kode & komentar boleh Indonesia (mengikuti mesin Motion Format).

## 1. Siapa & tujuan

- User membuat konten Reels **Shifu Po** (konsultan Feng Shui & BaZi) dengan skill **Motion Format v2**
  (HTML + three.js + canvas → MP4 lewat `mf.py`). Folder kerja: `C:\Portofolio\MOTION-FORMAT-VIDEO-PRO`
  (repo GitHub `Rizxh/MOTION-FORMAT-VIDEO-PRO`, **publik**, branch `main`, user boleh push langsung).
- Masalah awal: aset 3D bawaan Motion Format polos/kotak dan karakter 2D "batang". User mau kualitas setara
  "toon-format" miliknya (proyek Remotion `C:\Portofolio\shifupo-reels\src\toon`), bahkan lebih.
- Hasil: gaya baru **`toon-3d`** (dunia 3D bertinta + tokoh chibi 2D dengan rig IK), disetel khusus Shifu Po.

## 2. Aturan dari user (WAJIB, semua sudah dia minta tegas)

1. **Tanpa getar/goyang/guncang** ("PASTIKAN FIX BANGET"): kamera mulus spline saja; tokoh diam = benar-benar diam
   (tanpa napas/goyang/geleng); mengetik/bicara/melambai = pose diam; tanpa denyut berulang (tombol, cincin);
   butiran film statis. Gerak hanya yang disengaja: jalan, ganti pose (`poseDari`), benda berpindah, kedip.
2. **Teks tidak boleh seperti stiker story**: semua judul di **satu slot tetap kiri-atas** lewat `D.judulBab`
   (kicker emas kapital + judul Cinzel, rata kiri, tirai gelap lembut, tanpa kotak). Subtitle tetap di bawah
   (`y .755`), saat CTA pindah ke bawah kartu. Dilarang stempel besar di tengah & label melayang.
3. **Akting semi-realistis, tidak sepi**: bibir lip-sync visem dari kata VO (`TOKOH_TOON.lipsync`), alis naik di kata
   penting, lirik ke lawan bicara, angguk pelan di akhir kalimat, interaksi antartokoh (sapa-balas, serah barang,
   tunjuk-reaksi, jempol bersama), NPC lalu-lalang.
4. **Tangan bulat polos tanpa jari** (yang penting jelas).
5. **Karakter solid & presisi**: rambut satu bentuk padat (tanpa bolong), bahu tanpa celah.
6. **Ko Popo** (Shifu Po versi toon): badan **gemuk**, wajah bulat, rambut hitam **pendek berdiri** (seperti versi
   "Nico vs Simon"), **tangzhuang brokat motif awan**, celana hitam, kipas bulu. **Selang-seling per video
   merah ↔ emas** (`TOKOH_TOON.koPopo('merah'|'emas')`), catat di `gaya.md`. Referensi foto asli:
   `shifupo-reels/public/assets/2d/common/site/consult-red-black.jpg`, `consult-orange-1.jpg`.
7. Gerak tubuh harus logis/fisika (IK, kaki tidak meluncur, lengan berayun berlawanan kaki).
8. Brand (BRAND.md): tinta `#12100E`, kertas `#F8F4EC`, emas `#C9A45C/#F1DDA8`, merah segel `#A8161D`, giok `#2E7D63`;
   Cinzel + Plus Jakarta Sans; sapaan "Anda"; nada tenang, Feng Shui = arah & penataan, **tanpa janji pasti, tanpa
   angka karangan**; pisahkan dampak nyata dari "Dalam Feng Shui…". CTA baku: "Konsultasi via WhatsApp".
9. Hook kuat 0–3 dtk, CTA nyambung dengan hook. Durasi target 30–40 dtk.
10. Lisensi Motion Format: **skill tidak boleh diunggah/dibagikan**. Edit skill tetap lokal; yang di repo hanya
    add-on buatan sendiri (`toon-addon/`). `index.html` proyek (berisi mesin berlisensi) di-gitignore.
11. Jangan pakai kredit ElevenLabs tanpa izin. Windows: pakai `python`, bukan `python3`.

## 3. Yang sudah dibangun

### Mesin (skill lokal `~/.claude/skills/motion-format/`, salinan di repo `toon-addon/`)
| File | Isi |
|---|---|
| `assets/mesin/toon-tokoh.js` | `TOKOH_TOON.gambar(ctx,o)`: tokoh chibi ±3 kepala, garis tinta tebal-tipis, cel tajam; rig IK dua ruas; jalan/lari (`faseDariJarak`), `poseDari`/`ekspresiDari`/`campurPose`; 22 pose (diri, santai, pinggang, tunjuk, tunjukAtas, tunjukBawah, lambai, jelaskan, presentasi, tolak, kaget, pikir, garuk, sorak, sedih, pegang, sedekap, hormat, salam, duduk, lari…); 12 ekspresi; `lipsync(t,KATA,a,b)` → `{bicara, vokal a/i/e/o/u/m, alisNaik}`; opsi `lirik`, `angguk`, `naik`, `tekan`, `hadap`, `cermin`, `pegang` (hp, kertas, papan, cangkir, luopan, kunci, kantong, bunga, **kipas**); `rupaAcak(benih)` untuk NPC; `koPopo(varian)`; rambut: spike, rapi, cepak, jabrik, bob, panjang, kuncir, sanggul, uban, botak, hijab, ikal; baju: kaos, kemeja, blus, tangzhuang (+`motif:'awan'|'bunga'`), jaket, hoodie, batik, celemek, jas |
| `assets/mesin/toon-dunia.js` | `TOON3D.mulai({el,langit,ss,area})` → `D`: preset `siang/sore/senja/malam`; tinta pasca-proses (kedalaman+normal), DOF, bloom, grade, vinyet; tekstur lukis (plester, genteng, bata, batu alam, kayu, rumput, tanah, aspal, paving, keramik, daun, beton, kerb, awan). Aset: `tanah, jalan, rumah, pohon, semak, rumpun, pot, tiang, kabel, mobil, motor, papan, bangku, bukit, awan, lampion, luopan, cerminBagua, bambu, kolamKoi, singa, pohonUang, energi (sha/sheng), ruang (interior; pintuDi:'belakang' + daun pintu berengsel + lorong; plafon)`. `D.tokoh` (kartu), `D.warga` (NPC), `D.jalurKamera` (spline mulus), `D.judulBab` (slot teks), `D.layar`, `D.guncang` (dimatikan) |
| `assets/gaya/toon-3d/scene.html` | template "Rumah Tusuk Sate" 15 dtk (pola hook → masalah → Feng Shui → solusi → CTA) |
| `references/gaya/toon-3d.md` | resep: ciri wajib (termasuk semua aturan di atas), daftar aset, bank topik Shifu Po, brief cepat, kerangka adegan 30–45 dtk, rumus HOOK & CTA, jebakan, revisi cepat |
| `scripts/mf.py` (ditambal) | penanda `<!--@MESIN toon-tokoh.js toon-dunia.js-->` di `@HEAD` menanam modul ke index.html |
| `SKILL.md` | baris gaya `toon-3d` + "konten Shifu Po → toon-3d langsung" |

### Repo `MOTION-FORMAT-VIDEO-PRO`
| Path | Isi |
|---|---|
| `SETUP.md` | panduan pasang di komputer baru (clone → skill sendiri → `toon-addon/pasang.py` → cek → render) |
| `toon-addon/pasang.py` | memasang add-on ke skill Motion Format lokal (idempoten, cadangan `*.sebelum-toon`, `--cek`) |
| `tools/tts.py` | VO/SFX ElevenLabs (suara clone "KO POPO BERCERITA" `d7XUsgDgmf1xpHAogu7G`); `kata` → kata.js |
| `tools/tts_gratis.py` | **VO gratis** edge-tts `id-ID-ArdiNeural` (laju +4%, nada -6Hz) + waktu kata; format sama dgn tts.py |
| `proyek/sp-tusuk-sate-toon/` | demo Tusuk Sate 15 dtk (Ko Popo merah), tanpa VO |
| `proyek/sp-meja-kantor/` | **video aktif**: "Meja Membelakangi Pintu" 39,6 dtk, VO gratis + musik + SFX, interior kantor siang, Ko Popo **emas** |
| `proyek/_uji-tokoh`, `_uji-dunia`, `_uji-kopo` | lembar uji pose/jalan, aset dunia, Ko Popo merah/emas |
| `proyek/sp-tusuk-sate/` | versi lama (gaya kartun-cel bawaan) — pembanding "jelek" |

## 4. Status sekarang (26 Nov 2026)

- `sp-meja-kantor`: scene final, semua aturan di §2 sudah diterapkan dan dicek per potret (nol error JS).
  Render final `proyek/sp-meja-kantor/sp-meja-kantor.mp4` sedang/baru saja berjalan
  (`mf.py render proyek/sp-meja-kantor --out sp-meja-kantor.mp4`, ±20 menit). Bila belum ada file-nya, jalankan ulang.
- ElevenLabs: kuota habis (sisa ±63 karakter dari 80.941, slot suara 10/10). Sementara pakai `tts_gratis.py`.
  Saat kuota terisi, ganti VO ke suara clone dengan `tools/tts.py vo ... --ya` lalu `tools/tts.py kata`.
- Belum di-commit sejak push terakhir (`971b73a`): perubahan mesin (tanpa getar, lip-sync, slot teks, tangan bulat,
  Ko Popo baru, ruang berpintu belakang), proyek `sp-meja-kantor`, `_uji-kopo`, `tools/tts_gratis.py`, README/SETUP,
  `toon-addon/` terbaru. **MP4 jangan di-commit** (sudah di .gitignore). Tanya user dulu sebelum push.
- Repo publik masih menyimpan MP4 & `index.html` lama dari commit awal (`proyek/sp-tusuk-sate`, `_uji-tokoh`).
  Sudah ditawarkan `git rm --cached`; user belum memutuskan.

## 5. Cara kerja per video baru (alur yang disepakati)

1. Topik dari bank topik (`toon-3d.md`), isi brief; pilih Ko Popo **kebalikan** video sebelumnya (merah/emas).
2. `python %USERPROFILE%\.claude\skills\motion-format\scripts\mf.py baru proyek\<id> --dasar toon-3d --rasio 9:16`
   + salin logo `brand\shifupo\logo-shifupo-red.png` → `proyek\<id>\assets\gambar\logo-shifupo.png`.
3. Naskah 6 baris (hook, masalah, Feng Shui, dampak nyata, solusi, CTA) ±30–40 dtk → `naskah.md`.
4. VO: `python tools\tts_gratis.py vo <id> --no N --teks "..." --laju +4%` (atau ElevenLabs bila ada kuota) →
   `python tools\tts.py kata <id>` (butuh `SCENE.audio.vo` dengan `src`/`at` angka).
5. Scene: semua waktu dari kata VO (`K('kata')`), `D.judulBab` per bab, interaksi & lip-sync, kamera `jalurKamera`.
6. Cek: `mf.py potret proyek\<id> --t ...` → baca `lembar.jpg`; perbaiki framing (9:16 sempit: lebar terlihat =
   2·jarak·tan(fov/2)·0,56). Tokoh duduk: naikkan kartu `y=.2` supaya tidak tenggelam di balik meja.
7. Render: `mf.py render proyek\<id> --out <id>.mp4` (jalankan di latar belakang).
8. SFX/musik bisa dipakai ulang dari `proyek/sp-tusuk-sate/assets/audio` atau dibuat dengan ffmpeg (`sfx-ketik`, `sfx-detik`).

## 6. Proyek terkait di mesin yang sama
- `C:\Portofolio\shifupo-reels` (Remotion; toon-format asli di `src/toon/`, brand & foto Shifu Po di `public/assets`).
- Memori Claude Code user (bila di mesin yang sama): `~/.claude/projects/C--Portofolio/memory/`
  (`project_motion_format_video_pro.md`, `feedback_no_shake_wobble.md`, dll).
