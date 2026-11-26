#!/usr/bin/env python
"""Pasang add-on Toon 3D (Shifu Po) ke skill Motion Format yang SUDAH terpasang di komputer ini.

  python toon-addon/pasang.py                 # skill di ~/.claude/skills/motion-format
  python toon-addon/pasang.py --skill <path>  # skill di lokasi lain
  python toon-addon/pasang.py --cek           # hanya periksa, tidak mengubah apa pun

Yang dilakukan (aman diulang):
  1. salin mesin/toon-tokoh.js, mesin/toon-dunia.js      -> <skill>/assets/mesin/
  2. salin gaya/toon-3d/scene.html                         -> <skill>/assets/gaya/toon-3d/
  3. salin references/gaya/toon-3d.md                      -> <skill>/references/gaya/
  4. tambal scripts/mf.py: penanda <!--@MESIN ...--> di @HEAD menanam modul mesin ke index.html
  5. daftarkan gaya toon-3d di SKILL.md dan references/mesin.md
  6. pasang skill mf-qc (gerbang kualitas video) di sebelah skill motion-format
File skill yang diubah dicadangkan sekali sebagai *.sebelum-toon.
Add-on ini TIDAK berisi skill Motion Format; skill itu harus dibeli/dipasang sendiri.
"""
import argparse, pathlib, shutil, sys

ADDON = pathlib.Path(__file__).resolve().parent

TAMBAL_MF_CARI = "    core = (MESIN / 'core.html').read_text(encoding='utf-8')"
TAMBAL_MF = """    # <!--@MESIN toon-tokoh.js toon-dunia.js-->  → modul mesin ditanam langsung (jalan juga dari file://)
    def tanam(m):
        out = []
        for nama in m.group(1).split():
            f = MESIN / nama
            if not f.exists():
                sys.exit(f'Modul mesin {nama} tidak ada di {MESIN}')
            out.append(f'<script>/* mesin: {nama} */\\n{f.read_text(encoding="utf-8")}\\n</script>')
        return '\\n'.join(out)
    head = re.sub(r'<!--@MESIN\\s+([^>]*?)\\s*-->', tanam, head)
"""
BARIS_SKILL_CARI = "| `promo-produk` | Promo Produk & Iklan |"
BARIS_SKILL = ("| `toon-3d` | Toon 3D (dunia bertinta + tokoh chibi) | **Shifu Po / Feng Shui**, cerita rumah-kantor-toko, "
               "tokoh menjelaskan di dunia 3D ramai | three.js toon + tinta pasca-proses + `toon-tokoh.js` (IK) |")
CATATAN_SKILL_CARI = "Gaya di luar tabel → **racik sendiri**"
CATATAN_SKILL = ("**Konten Shifu Po (Feng Shui & BaZi)** → gaya `toon-3d` langsung, tanpa menawarkan 3 gaya. Brand di\n"
                 "`brand/shifupo/BRAND.md` proyek; bank topik, rumus hook & CTA di `references/gaya/toon-3d.md`.\n\n")
BAGIAN_MESIN = """
## 9. Modul mesin tambahan (`<!--@MESIN ...-->`)

`mf.py rakit` menanam file dari `assets/mesin/` ke `index.html` bila `@HEAD` berisi
`<!--@MESIN toon-tokoh.js toon-dunia.js-->` (taruh setelah `<script>` three r128).

| modul | isi |
|---|---|
| `toon-tokoh.js` | `TOKOH_TOON.gambar(ctx,o)` tokoh chibi ±3 kepala, rig IK dua ruas, jalan/lari tanpa kaki meluncur (`faseDariJarak`), `poseDari`/`ekspresiDari` (ganti pose mulus), `rupaAcak(benih)` untuk NPC |
| `toon-dunia.js` | `TOON3D.mulai({el,langit,ss})` → dunia toon three.js: preset cahaya `siang/sore/senja/malam`, tinta pasca-proses, DOF, bloom, grade; aset rumah/jalan/pohon/tiang/mobil + aset Feng Shui; `D.tokoh`, `D.warga`, `D.jalurKamera`, `D.guncang`, `D.layar` |

Rincian & contoh: `references/gaya/toon-3d.md`. Lapisan objek: 0 = bertinta (garis otomatis), 1 = tanpa tinta
(tokoh, kabel, cahaya, daun tipis), 2 = langit & awan.
"""


def cadang(f, cek):
    b = f.with_name(f.name + '.sebelum-toon')
    if not b.exists() and not cek:
        shutil.copy2(f, b)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--skill', default=str(pathlib.Path.home() / '.claude' / 'skills' / 'motion-format'))
    ap.add_argument('--cek', action='store_true')
    a = ap.parse_args()
    sk = pathlib.Path(a.skill).expanduser().resolve()
    mf = sk / 'scripts' / 'mf.py'
    if not mf.exists() or not (sk / 'assets' / 'mesin' / 'core.html').exists():
        sys.exit(f'Skill Motion Format tidak ditemukan di {sk}.\n'
                 'Pasang dulu skill motion-format (salinan milik sendiri), lalu jalankan ulang skrip ini.')
    laporan = []

    # 1-3 salin file add-on
    for src, dst in [('mesin/toon-tokoh.js', 'assets/mesin/toon-tokoh.js'), ('mesin/toon-dunia.js', 'assets/mesin/toon-dunia.js'),
                     ('gaya/toon-3d/scene.html', 'assets/gaya/toon-3d/scene.html'), ('references/gaya/toon-3d.md', 'references/gaya/toon-3d.md')]:
        s, d = ADDON / src, sk / dst
        sama = d.exists() and d.read_bytes() == s.read_bytes()
        if not sama and not a.cek:
            d.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(s, d)
        laporan.append(f'{"ok    " if sama else ("PERLU " if a.cek else "salin ")} {dst}')

    # 4 tambal mf.py
    t = mf.read_text(encoding='utf-8')
    if '@MESIN' in t:
        laporan.append('ok     scripts/mf.py (penanda @MESIN sudah ada)')
    elif TAMBAL_MF_CARI in t:
        if not a.cek:
            cadang(mf, a.cek)
            mf.write_text(t.replace(TAMBAL_MF_CARI, TAMBAL_MF + TAMBAL_MF_CARI, 1), encoding='utf-8')
        laporan.append(('PERLU ' if a.cek else 'tambal') + ' scripts/mf.py (+ penanda @MESIN)')
    else:
        laporan.append('GAGAL  scripts/mf.py: baris rakit tidak dikenali (versi skill berbeda?). Tambal manual, lihat SETUP.md.')

    # 5 daftarkan gaya
    f = sk / 'SKILL.md'; t = f.read_text(encoding='utf-8')
    if '`toon-3d`' in t:
        laporan.append('ok     SKILL.md')
    else:
        baru = t
        i = baru.find(BARIS_SKILL_CARI)
        if i >= 0:
            j = baru.index('\n', i)
            baru = baru[:j + 1] + BARIS_SKILL + '\n' + baru[j + 1:]
        if CATATAN_SKILL_CARI in baru:
            baru = baru.replace(CATATAN_SKILL_CARI, CATATAN_SKILL + CATATAN_SKILL_CARI, 1)
        if not a.cek:
            cadang(f, a.cek); f.write_text(baru, encoding='utf-8')
        laporan.append(('PERLU ' if a.cek else 'tambah') + ' SKILL.md (gaya toon-3d)')
    f = sk / 'references' / 'mesin.md'
    if f.exists():
        t = f.read_text(encoding='utf-8')
        if '@MESIN' in t:
            laporan.append('ok     references/mesin.md')
        else:
            if not a.cek:
                cadang(f, a.cek); f.write_text(t.rstrip('\n') + '\n' + BAGIAN_MESIN, encoding='utf-8')
            laporan.append(('PERLU ' if a.cek else 'tambah') + ' references/mesin.md (modul tambahan)')

    # 6 skill mf-qc (gerbang kualitas) -> ~/.claude/skills/mf-qc/SKILL.md (sejajar dengan motion-format)
    s, d = ADDON / 'skills' / 'mf-qc' / 'SKILL.md', sk.parent / 'mf-qc' / 'SKILL.md'
    sama = d.exists() and d.read_bytes() == s.read_bytes()
    if not sama and not a.cek:
        d.parent.mkdir(parents=True, exist_ok=True); shutil.copy2(s, d)
    laporan.append(f'{"ok    " if sama else ("PERLU " if a.cek else "salin ")} ../mf-qc/SKILL.md (skill QC)')

    print(f'skill: {sk}')
    print('\n'.join('  ' + x for x in laporan))
    if any(x.startswith('GAGAL') for x in laporan):
        sys.exit(1)
    print('\nSelesai.' if not a.cek else '\nCek selesai (tidak ada yang diubah).')


if __name__ == '__main__':
    main()
