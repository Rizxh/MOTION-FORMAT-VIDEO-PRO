# Gaya: Toon 3D (dunia bertinta + tokoh chibi) · disetel untuk Shifu Po

> Dunia three.js yang terasa dilukis: bahan toon dua nada (sisi terang hangat, sisi bayangan ungu-biru, bukan abu),
> tekstur kanvas (plester, genteng, batu alam, kayu, rumput, aspal, paving, daun), **garis tinta** otomatis dari kedalaman +
> normal, langit gradasi + awan lukis, kabut atmosfer, bloom lampu, fokus kamera (DOF), color grade per waktu hari.
> Di dalamnya hidup **tokoh chibi 2D** (±3 kepala) sebagai kartu yang selalu menghadap kamera, dengan rig IK dua ruas
> sehingga siku, lutut, langkah, dan ayunan tangan masuk akal. Dunia selalu ramai: warga lalu-lalang, mobil, kabel,
> pohon, lampion. Contoh siap jalan: `assets/gaya/toon-3d/scene.html` (Rumah Tusuk Sate, 15 dtk, hook → CTA).

Mesin: `assets/mesin/toon-dunia.js` (dunia, aset, kamera, pasca-proses) + `assets/mesin/toon-tokoh.js` (tokoh).
Dirakit lewat `<!--@MESIN toon-tokoh.js toon-dunia.js-->` di `@HEAD` setelah three r128.

## Cocok untuk · tidak cocok untuk
**Cocok:** Feng Shui rumah/kantor/toko (arah pintu, tusuk sate, tangga lurus ke pintu, meja membelakangi pintu, cermin
menghadap ranjang, dapur vs kamar mandi), BaZi & shio dengan tokoh, "kenapa rumah ini…?", sebelum-sesudah penataan,
cerita klien (tanpa nama asli), promo jasa konsultasi.

**Tidak cocok:** ramalan menakutkan, janji rezeki/jodoh pasti, angka yang tidak ada sumbernya (melanggar BRAND.md),
diagram kompas rinci (pakai `luopan` close-up atau gaya 2D), berita duka.

## Ciri wajib
1. **Satu waktu hari per adegan, warna konsisten.** Pakai preset `langit`: `siang` · `sore` · `senja` · `malam`.
   Preset mengatur cahaya, langit, kabut, grade, bloom, dan warna tint tokoh sekaligus. Jangan mencampur warna sendiri
   di luar preset kecuali aksen brand. Ganti waktu hari = ganti adegan (cerita), bukan di tengah shot.
2. **Brand Shifu Po:** tinta `#12100E`, kertas `#F8F4EC`, emas `#C9A45C`/`#F1DDA8`, merah segel `#A8161D`, giok `#2E7D63`.
   Judul **Cinzel 900**, teks/tombol **Plus Jakarta Sans 800**. Merah segel hanya untuk bahaya/stempel/CTA; giok untuk
   "berhasil"; emas untuk qi baik dan tombol.
3. **Tokoh ±3 kepala**, tangan **bulat polos tanpa jari** (jelas di ukuran kecil), garis tinta tebal-tipis (tebal di sisi jauh dari cahaya), cel tajam, mata bulat berkilau,
   pipi merona. Arah cahaya tokoh mengikuti matahari dunia (`D.cahaya2D()` otomatis lewat `K.atur`).
4. **Gerak tubuh masuk akal:** panjang tulang tetap (IK). Jalan: `fase = TOKOH_TOON.faseDariJarak(jarakMeter)` supaya
   kaki tidak meluncur; pinggul turun saat dua kaki menapak, naik saat kaki melintas; lengan berayun berlawanan kaki dan
   sedikit telat. Berhenti = kurangi `jalan` ke 0 dalam ±0,35 dtk, jangan langsung. Ganti pose lewat
   `TOKOH_TOON.poseDari(t, [[detik,'pose'],...])` (antisipasi kecil + lewat-sasaran), bukan lompat.
5. **Dunia tidak boleh sepi:** minimal 3 lapisan (depan: semak/pagar/tiang; tengah: tokoh & rumah; belakang:
   deret rumah, pohon, bukit kabut) + **NPC** `D.warga()` di trotoar + 1 benda bergerak (mobil lewat, motor, ikan koi,
   awan). Cakrawala tidak boleh kosong: jalan/rumah berlanjut sampai tertelan kabut.
6. **Simbol Feng Shui sebagai aset 3D, bukan teks:** `D.energi({jenis:'sha'})` (qi tajam merah, lurus, cepat) vs
   `{jenis:'sheng'}` (qi emas, berkelok, lembut); `D.luopan()`, `D.cerminBagua()`, `D.bambu()`, `D.kolamKoi()`,
   `D.singa()`, `D.pohonUang()`, `D.lampion()`, `D.ruang({isi:'kantor'})`.
7. **Kamera selalu bergerak MULUS** lewat `D.jalurKamera(keys)` (spline halus, tiap ruas berhenti lembut).
   **DILARANG getar/goyang:** tanpa goyang tangan kamera, tanpa guncangan (`D.guncang` sudah dimatikan), tanpa napas/goyang
   tokoh saat diam, tanpa tangan bergetar (mengetik/bicara/melambai = pose diam), tanpa denyut berulang (tombol, cincin),
   tanpa butiran film berkedip. Gerak hanya yang disengaja: langkah, pergantian pose, benda berpindah. 9:16 sempit: dua tokoh berjarak 3 m butuh jarak kamera ±9–10 m atau fov 42–46.
8. **Teks punya tempat tetap, bukan stiker ala story.** Semua judul lewat `D.judulBab([{a,b,kicker,judul,besar}])`:
   satu slot kiri-atas (x 80, y 250, rata kiri), kicker emas kapital + judul Cinzel, kata kunci `<em>` emas, tirai gelap
   lembut di atas layar (tanpa kotak). Satu judul per bab cerita: hook → Masalahnya → Dalam Feng Shui → Dampak nyata →
   Solusinya, masuk ±0,15 dtk setelah VO menyebut kata kuncinya, keluar sebelum bab berikutnya. Subtitle tetap di bawah
   (`y: .755`, maks 5 kata, kata kunci emas); saat CTA subtitle pindah ke bawah kartu supaya tidak menutupi wajah.
   **Dilarang:** stempel besar di tengah layar, label/teks melayang menempel objek, teks berganti posisi tiap adegan.
9. **Akting semi-realistis (tidak sepi):** tokoh yang bicara memakai `TOKOH_TOON.lipsync(t, KATA, a, b)` → `bicara`,
   `vokal` (bibir a / i-e / o-u / rapat m-b-p), `alisNaik`. Pendengar melirik ke pembicara (`lirik`), mengangguk pelan di
   akhir kalimat (`angguk` 0..1 dari satu lengkung sin, bukan getar), ekspresi berganti di kata kunci. Selalu ada
   interaksi antartokoh: menyapa & membalas, menyerahkan barang, menunjuk lalu yang ditunjuk bereaksi, jempol bersama.

## Aset siap pakai (satuan meter, muka menghadap +z)
| Panggilan | Isi |
|---|---|
| `D.tanah({jenis})` `D.jalan({panjang,lebar,trotoar})` | rumput/paving/tanah · aspal + marka + kerb hitam-putih + selokan + trotoar paving |
| `D.rumah({dinding,atap,pintu,lampion,nyala,nomor,bata,batu})` | rumah komplek lengkap: pondasi, lis batu alam, atap genteng, lisplang, talang, ventilasi gevel, pintu panel, jendela bertirai + teralis, teras keramik + kanopi + tiang, lampu dinding, AC, pagar + gerbang, taman, pot, nomor rumah |
| `D.pohon({jenis:'bulat'|'cemara'})` `D.semak()` `D.rumpun()` `D.pot()` `D.bambu()` | vegetasi gumpal organik bertekstur daun |
| `D.tiang({nyala})` `D.kabel(a,b,lendut)` | tiang listrik + lampu jalan (kerucut cahaya saat malam) |
| `D.mobil({warna})` `D.motor()` `D.bangku()` `D.papan({gambar})` | kendaraan, bangku, papan bertulisan (mis. DIJUAL) |
| `D.lampion()` `D.cerminBagua()` `D.luopan()` `D.singa()` `D.pohonUang()` `D.kolamKoi()` | aset Feng Shui (koi & jarum luopan punya `userData.atur(t)`) |
| `D.energi({jenis,titik,tebal})` | jalur qi bercahaya; `userData.atur(t, muncul0..1)` |
| `D.ruang({isi:'kantor'})` | interior: lantai kayu, dinding, pintu, jendela + sinar, lukisan, meja + laptop, kursi, rak, pohon uang |
| `D.bukit()` `D.awan()` | latar jauh (tertelan kabut) |
| `D.tokoh({tinggi,res})` → `K.atur(x,z,opsi)` | tokoh kartu + bayangan kontak |
| `D.warga({n,jalur,benih,anak})` → `W.atur(t)` | NPC acak berjalan bolak-balik di jalur |

**Ko Popo (Shifu Po versi toon) — baku:** `TOKOH_TOON.koPopo('merah')` atau `TOKOH_TOON.koPopo('emas')`: badan gemuk,
wajah bulat, rambut hitam pendek berdiri (`gayaRambut:'spike'`, seperti Nico vs Simon), tangzhuang brokat motif awan,
celana hitam, kipas bulu (`pegang:'kipas'`). **Selang-seling per video** (merah ↔ emas, catat di `gaya.md`).
Tokoh contoh lain di `TOKOH_TOON.RUPA_CONTOH`:
`cindy`, `sherlyn`, `pakRT`, `ibu` (hijab), `anak`, `koki`. Rupa baru = objek `rupa` (lihat `RUPA_DASAR` di toon-tokoh.js).
Pose: diri · santai · pinggang · tunjuk · tunjukAtas · tunjukBawah · lambai · jelaskan · presentasi · tolak · kaget ·
pikir · garuk · sorak · sedih · pegang · sedekap · hormat (salam kepal-telapak) · salam · duduk · lari.
Ekspresi: netral · senyum · senang · tawa · kaget · cemas · sedih · marah · yakin · bingung · kedip · sombong.

## Bank topik Shifu Po (pilih satu masalah, satu janji)
| Seri | Contoh judul hook | Aset utama | Solusi yang ditunjukkan |
|---|---|---|---|
| Rumah | "Rumah termurah di komplek… ternyata ada sebabnya" (tusuk sate) | jalan lurus + `energi sha` | pagar hidup, bambu, arah gerbang |
| Rumah | "Buka pintu langsung lihat pintu belakang?" | lorong lurus di `D.ruang` | sekat/rak, tanaman |
| Rumah | "Tangga lurus ke pintu depan" | tangga + qi mengalir keluar | karpet, belokan, lampu |
| Kamar | "Cermin menghadap ranjang, kenapa sering gelisah?" | ruang kamar | geser cermin / tutup |
| Kantor | "Meja membelakangi pintu" | `ruang({isi:'kantor'})` + kursi | putar meja ke posisi komando |
| Toko | "Usaha ramai di sebelah, toko sendiri sepi" | deret ruko + warga | pintu, papan, lampu, aliran pengunjung |
| BaZi | "Shio Anda tahun depan" (seri) | tokoh shio + lampion | tips sikap, bukan ramalan menakutkan |
| Promo | "Sebelum pindah rumah, cek ini dulu" | rumah kosong + luopan | konsultasi |

Nada (BRAND.md): Feng Shui = **arah & penataan**, bukan klenik. Pisahkan dampak nyata ("sorot lampu mobil, bising")
dari sudut pandang Feng Shui ("dalam Feng Shui…"). Tanpa angka karangan, tanpa janji pasti.

## Brief cepat (isi sebelum menulis naskah)
```
Masalah (1 kalimat, dari sudut pandang penonton):
Janji (apa yang akan mereka pahami/lakukan):
Tokoh: Ko Popo + 1–2 tokoh (nama awam, bukan klien asli) · NPC: berapa & di mana
Lokasi + waktu hari (preset langit):
Simbol utama (aset 3D): sha/sheng/luopan/cermin/…
Hook (0–3 dtk): gambar apa yang membuat orang berhenti scroll?
Solusi visual (apa yang BERUBAH di dunia):
CTA: "Konsultasi via WhatsApp" + kalimat ajakan 3–5 kata
Durasi: 30–45 dtk (promo 15–20)
```

## Kerangka adegan (pola A, 30–45 dtk) — tiap adegan menyambung ke berikutnya
| Detik | Adegan | Kamera (`jalurKamera`) | Yang wajib terjadi |
|---|---|---|---|
| 0–3 | **HOOK visual** | udara tinggi → menukik mengikuti qi sha | qi melesat sejak frame 1, judul 2 baris (kicker kecil + kata kunci Cinzel), benturan di 2,5–3 dtk: stempel dibanting (tanpa guncang kamera) |
| 3–7 | Masalah dirasakan tokoh | dorong ke tokoh, setinggi dada | tokoh kaget → cemas (`poseDari`), label menunjuk penyebab, NPC tetap jalan |
| 7–12 | Ko Popo masuk | orbit pelan, dua tokoh dalam frame | berjalan masuk (fase dari jarak), berhenti, **hormat**, lalu menjelaskan sambil menunjuk |
| 12–22 | Penjelasan + bukti | naik sedikit / sisipan close-up aset (luopan, cermin) | simbol 3D bergerak (sha lurus vs sheng berkelok); kalimat VO dipisah dampak nyata vs Feng Shui |
| 22–32 | **Solusi berubah di dunia** | crane naik memperlihatkan perubahan | aset tumbuh/bergeser dengan lewat-sasaran (`E.back`), qi sheng masuk berkelok, tokoh lega/sorak |
| 32–40 | **CTA** | turun ke setinggi mata, tokoh di sepertiga bawah | kartu kertas+emas: logo, pertanyaan (merah segel, kapital), janji 2 baris (Cinzel), tombol pil emas berdenyut, "Shifu Po · Feng Shui & BaZi"; tokoh melambai, latar DOF kabur |

Contoh demo memadatkan pola ini ke 15 dtk (tanpa VO). Dengan VO: waktu tiap adegan = waktu kata di `kata.js`
(`const T = w => KATA.find(k => k.w.toLowerCase().startsWith(w))?.t0`), isi semua ke objek `WAKTU`.

### Rumus HOOK (pilih satu, wajib visual + teks ≤ 7 kata)
1. **Paradoks harga/nasib:** "Rumah termurah di komplek… ternyata ada sebabnya" + qi sha menghantam pintu.
2. **Pertanyaan yang menunjuk penonton:** "Pintu rumah Anda menghadap ini?" + kamera menukik ke pintu.
3. **Sebelum-sesudah kilat:** 1 dtk dunia gelap/berantakan → potongan ke dunia tertata, lalu "begini caranya".
4. **Benda yang bergerak sendiri:** jarum luopan berputar liar, cermin memantulkan qi ke ranjang.
Jangan: logo di detik 0, layar diam, teks panjang, menakut-nakuti.

### Rumus CTA (selalu nyambung dengan hook)
- Pertanyaan CTA mengulang masalah hook ("Rumah Anda tusuk sate?"), janji mengulang solusi ("Tata dulu arahnya").
- Tombol **satu** ajakan: "Konsultasi via WhatsApp". Tanpa daftar layanan.
- Tokoh di dunia tetap hidup saat CTA (melambai, qi sheng mengalir), bukan layar statis.
- Muncul ≥ 3,5 dtk sebelum akhir; kartu masuk 0,7 dtk (`E.out`), tombol muncul sekali dengan `E.back` (tidak berdenyut).

## Gerak & transisi
- Antar adegan: kamera menyambung (satu jalur), atau benda penghubung (qi yang melesat membawa kamera ke pintu).
  Tanpa fade hitam kecuali ganti waktu hari.
- Semua muncul dengan `E.back`/`E.out`, hilang dengan `E.in`; tidak ada gerak linear kecuali mobil/awan.
- Benturan: stempel `scale 1.7→1` + rotasi lewat-sasaran + SFX. Tanpa guncang kamera.
- Ganti pose ±0,4 dtk; ekspresi berganti tepat di kata kunci VO; kedip otomatis.
- Mulut bicara: `bicara` dari `TOKOH_TOON.bicaraDari(t, KATA, a, b)` bila ada VO.

## Gambar uji adegan 1
`mf.py potret <proyek> --t 0.3,1.5,2.8` → frame udara dengan judul, tukikan dengan qi, benturan + stempel.
Lalu `--t 5,8.5,10.5,13` untuk tokoh, solusi, CTA.

## Jebakan → perbaikan
- Teks hook tidak muncul: induk `#hook` jangan `opacity:0` (wIn menyalakan anak, bukan induk); sembunyikan anak dengan `visibility:hidden`.
- Tokoh terpotong di 9:16: lebar terlihat = `2·jarak·tan(fov/2)·0,56`; perbesar jarak/fov.
- Tokoh tertutup semak: tokoh harus lebih dekat ke kamera dari aset solusi (z lebih besar bila kamera di +z).
- Qi tidak terlihat dari udara: mulai jalur dari dalam frame, `muncul` jangan `E.in` tajam.
- Pita qi raksasa di depan lensa: titik awal jalur jangan lebih dekat dari 4 m ke kamera.
- Garis tinta ganda di benda tipis (kabel, daun bambu, cahaya): taruh di lapisan 1 (`D.lapisan(obj,1)`), tidak bertinta.
- **Video berkedip-kedip** (tepi bayangan berenang saat kamera bergerak pelan): kunci `D.pusatBayangan = new THREE.Vector3(x,0,z)` per set/adegan; jangan biarkan mengikuti kamera.
- Render lambat (> 2 dtk/frame): `ss: 1.25`, kurangi `D.warga` n, `bayangan: 1024`.

## Revisi cepat
| Permintaan | Ubah |
|---|---|
| "lebih hangat / lebih dramatis" | `langit:'sore'` → `'senja'`; `D.atur({bloom:.6})` |
| "garisnya kurang tegas" | `D.atur({tinta:1.3, tintaW:1.5})` |
| "latar terlalu kabur" | `D.atur({dof:.3})` |
| "terlalu sepi" | tambah `D.warga` jalur kedua, mobil lewat, lampion, `D.rumpun` |
| "tokoh kurang ekspresif" | tambah pergantian pose/ekspresi di kata kunci, `naik` (lompat kecil) saat kaget |
