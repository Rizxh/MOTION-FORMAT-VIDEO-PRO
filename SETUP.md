# Setup di komputer baru

Panduan memasang folder kerja video Shifu Po (Motion Format + add-on Toon 3D) dari GitHub sampai bisa
merender video sendiri. Perkiraan waktu: 20–30 menit.

## Yang perlu dipahami dulu

| Bagian | Ada di repo ini? | Cara dapat |
|---|---|---|
| Proyek video, brand Shifu Po, alat suara (`tools/`) | ya | `git clone` |
| Add-on **Toon 3D** (karakter chibi, dunia 3D, aset Feng Shui) | ya, di `toon-addon/` | dipasang dengan `pasang.py` |
| Skill **Motion Format** (mesin render, `mf.py`) | **tidak** | salinan milik sendiri (lisensi pembeli Motion Course melarang skill dibagikan) |
| Kunci ElevenLabs (suara) | **tidak** | akun sendiri, ditulis di `.env` (opsional) |

## 1. Pasang program pendukung

**Windows** (PowerShell):
```powershell
winget install Git.Git Python.Python.3.12 Google.Chrome Gyan.FFmpeg
```
Tutup lalu buka lagi PowerShell, cek:
```powershell
git --version; python --version; ffmpeg -version
```
Di Windows pakai `python`, bukan `python3` (`python3` sering hanya membuka Microsoft Store).

**Mac** (Terminal):
```bash
brew install git python ffmpeg && brew install --cask google-chrome
```
Di Mac, ganti `python` di panduan ini dengan `python3`.

Pasang juga **Claude Code** (aplikasi desktop atau CLI) bila ingin membuat video lewat chat.

## 2. Ambil repo

```powershell
cd $HOME\Documents
git clone https://github.com/Rizxh/MOTION-FORMAT-VIDEO-PRO.git
cd MOTION-FORMAT-VIDEO-PRO
```

## 3. Pasang skill Motion Format (salinan sendiri)

Salin folder skill `motion-format` dari paket Motion Course ke:

- Windows: `%USERPROFILE%\.claude\skills\motion-format`
- Mac: `~/.claude/skills/motion-format`

Isinya harus ada `SKILL.md`, `scripts/mf.py`, dan `assets/mesin/core.html`.

## 4. Pasang add-on Toon 3D

Dari folder repo:
```powershell
python toon-addon/pasang.py --cek
python toon-addon/pasang.py
```
`--cek` hanya memeriksa. Tanpa `--cek`, skrip menyalin `toon-tokoh.js` dan `toon-dunia.js` ke `assets/mesin/`,
gaya `toon-3d` ke `assets/gaya/`, resep ke `references/gaya/toon-3d.md`, lalu menambal `scripts/mf.py` supaya
mengenali penanda `<!--@MESIN ...-->`. File skill yang diubah dicadangkan sebagai `*.sebelum-toon`.
Aman dijalankan ulang; jalankan lagi setiap kali `git pull` membawa perubahan di `toon-addon/`.

Skill di lokasi lain: `python toon-addon/pasang.py --skill "D:\path\ke\motion-format"`.

## 5. Kunci suara (opsional, hanya untuk VO)

```powershell
copy .env.example .env
```
Isi `ELEVENLABS_API_KEY` dengan kunci akun sendiri. `.env` tidak pernah ikut ke GitHub.
Kredit baru terpakai bila perintah `tools/tts.py` diberi `--ya`.

## 6. Cek hasil

```powershell
$MF = "$env:USERPROFILE\.claude\skills\motion-format\scripts\mf.py"
python $MF potret proyek\sp-tusuk-sate-toon --t 0.3,2.9,8.6,13
```
Buka `proyek\sp-tusuk-sate-toon\lembar.jpg`: harus terlihat komplek dari udara + judul, stempel TUSUK SATE,
Ko Popo dan Cindy, lalu kartu CTA. Baris terakhir harus `error halaman: tidak ada`.

Render cek 8 detik tanpa suara:
```powershell
python $MF render proyek\sp-tusuk-sate-toon --sampai 8 --tanpa-audio --out cek-8dtk.mp4
```

## 7. Bikin video baru

Lewat Claude Code (disarankan): buka folder repo, lalu tulis misalnya
> Buat video Shifu Po gaya toon-3d tentang meja kantor membelakangi pintu, 35 detik, pakai VO Ko Popo.

Claude mengikuti alur skill: brief → gambar uji adegan 1 → naskah → suara → semua adegan → render.

Manual:
```powershell
python $MF baru proyek\<nama-video> --dasar toon-3d --rasio 9:16
copy brand\shifupo\logo-shifupo-red.png proyek\<nama-video>\assets\gambar\logo-shifupo.png
```
Edit `proyek\<nama-video>\scene.html` (objek `WAKTU`, dunia, tokoh, teks), cek dengan `potret`, render dengan `render`.
Panduan gaya lengkap (bank topik, rumus hook & CTA, daftar aset dan pose):
`%USERPROFILE%\.claude\skills\motion-format\references\gaya\toon-3d.md` (salinan juga di `toon-addon/references/`).

Perintah suara ada di `README.md`.

## 8. Kerja bareng lewat Git

- `git pull` sebelum mulai, lalu `python toon-addon/pasang.py` bila `toon-addon/` berubah.
- Satu folder `proyek/<nama>` per video; jangan mengedit proyek yang sedang dikerjakan orang lain.
- Yang di-commit: `scene.html`, `gaya.md`, `naskah.md`, `kata.js`, `assets/`. Tidak perlu: `index.html` (dibuat ulang
  otomatis oleh `potret`/`render` dan berisi mesin berlisensi), `.potret/`, `.paralel/`, MP4 besar.
- Kirim MP4 jadi lewat Drive/WhatsApp, bukan lewat Git (GitHub menolak file > 100 MB).

## Masalah umum

| Gejala | Penyebab → solusi |
|---|---|
| `python` membuka Microsoft Store | pasang Python dari winget (langkah 1), centang "Add to PATH", buka ulang terminal |
| `Skill Motion Format tidak ditemukan` | folder skill belum di `.claude\skills\motion-format` (langkah 3) |
| `Modul mesin toon-dunia.js tidak ada` | `pasang.py` belum dijalankan (langkah 4) |
| Chrome tidak ditemukan | set `CHROME` ke path chrome.exe: `$env:CHROME="C:\Program Files\Google\Chrome\Application\chrome.exe"` |
| `ffmpeg` tidak dikenal | buka ulang terminal setelah winget; atau set `FFMPEG` ke path ffmpeg.exe |
| Potret macet / port dipakai | tutup render lain; atau `$env:MF_PORT="9444"` |
| Layar hitam di potret | cek baris "error halaman"; three.js dimuat dari CDN, jadi perlu internet |
| Render lambat (> 2 dtk/frame) | di `scene.html` ubah `ss: 1.5` → `1.25`, kurangi jumlah `D.warga` |
