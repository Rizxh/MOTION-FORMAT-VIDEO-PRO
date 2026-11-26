/* ============================================================================
   toon-tokoh.js · tokoh chibi "toon" untuk Motion Format (kanvas 2D)
   Kepala besar (±2,6 kepala), garis tinta tebal-tipis yang menebal di sisi jauh dari cahaya,
   bayangan sabit lembut, mata bulat berkilau, pipi merona, rambut berponi + kilap.
   Dipakai sendiri (kanvas 2D) atau sebagai kartu di dunia 3D (toon-dunia.js → D.tokoh()).

   TOKOH_TOON.gambar(ctx, o)   ruang desain 600 × 1000, telapak kaki di y = 975, tengah x = 300.
                               Ubah skala/posisi dengan ctx.setTransform sebelum memanggil.
   o = {
     rupa:   lihat RUPA di bawah (warna kulit, rambut, baju, aksesori)
     pose:   'diri' 'pinggang' 'tunjuk' 'tunjukAtas' 'lambai' 'jelaskan' 'kaget' 'pikir' 'sorak'
             'sedih' 'pegang' 'salam' 'duduk' 'lari'  (atau objek {L,R} sendiri)
     jalan:  0..1 (besar ayunan langkah)  ·  fase: 0..1 putaran langkah
     ekspresi: 'netral' 'senyum' 'senang' 'tawa' 'kaget' 'cemas' 'sedih' 'marah' 'yakin' 'bingung' 'kedip' 'sombong'
     bicara: 0..1 (buka mulut)  ·  kedip: 0..1  ·  lirik: -1..1 (arah bola mata)
     hadap:  -1 | 0 | 1  (wajah condong ke kiri/kanan; badan tetap depan)
     cermin: true = gambar dibalik horizontal
     miring: derajat badan · tengok: derajat kepala
     cahaya: sudut (radian, sudut kanvas) ARAH DATANGNYA cahaya; bawaan kiri-atas
     pegang: 'hp' 'kertas' 'papan' 'cangkir' 'luopan' 'kunci' 'kantong' 'bunga' (di tangan kanan)
     t:      detik (napas, kilau)  ·  benih: angka (variasi bentuk kepala)
   }
   Helper: TOKOH_TOON.kedipDari(t, benih) · TOKOH_TOON.bicaraDari(t, kata) · TOKOH_TOON.RUPA_CONTOH
   ========================================================================== */
(function (G) {
  'use strict';
  var INK = '#2B1A2C', PUTIH = '#FFFFFF', MULUT = '#6A1E2C', LIDAH = '#EE7684';
  var PI = Math.PI, TAU = PI * 2;
  var rad = function (d) { return d * PI / 180; };
  var cl = function (x, a, b) { return Math.max(a, Math.min(b, x)); };
  var lr = function (a, b, k) { return a + (b - a) * k; };
  var rnd = function (s, k) { var x = Math.sin(s * 127.1 + k * 311.7) * 43758.5453; return x - Math.floor(x); };

  /* ---------- warna ---------- */
  function rgb(c) { var n = parseInt(c.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
  function hx(r, g, b) { return '#' + [r, g, b].map(function (v) { return cl(Math.round(v), 0, 255).toString(16).padStart(2, '0'); }).join(''); }
  function mul(c, m) { var a = rgb(c); return hx(a[0] * m[0], a[1] * m[1], a[2] * m[2]); }
  function mix(a, b, t) { var A = rgb(a), B = rgb(b); return hx(lr(A[0], B[0], t), lr(A[1], B[1], t), lr(A[2], B[2], t)); }
  function terang(c, k) { return mix(c, '#FFFFFF', k); }
  var SH_KULIT = [0.95, 0.80, 0.80], SH_KAIN = [0.68, 0.66, 0.80], SH_RAMBUT = [0.62, 0.6, 0.74];

  /* ---------- pena ---------- */
  function Pen(g) { this.g = g; this.ol = 12; }
  Pen.prototype.path = function (pts, tutup) {
    var g = this.g; g.beginPath();
    for (var i = 0; i < pts.length; i++) { if (i) g.lineTo(pts[i][0], pts[i][1]); else g.moveTo(pts[i][0], pts[i][1]); }
    if (tutup) g.closePath();
  };
  Pen.prototype.poly = function (pts, isi, ol) {
    var g = this.g, w = ol == null ? this.ol : ol; this.path(pts, true);
    if (isi) { g.fillStyle = isi; g.fill(); }
    if (w) { g.lineWidth = w; g.strokeStyle = INK; g.lineJoin = 'round'; g.stroke(); }
  };
  Pen.prototype.ell = function (cx, cy, rx, ry, isi, ol, a0, a1, rot) { this.poly(ellPts(cx, cy, rx, ry, a0 || 0, a1 == null ? 360 : a1, rot || 0), isi, ol); };
  Pen.prototype.garis = function (pts, w, warna, cap) {
    var g = this.g; g.lineCap = cap || 'round'; g.lineJoin = 'round';
    this.path(pts, false); g.strokeStyle = warna || INK; g.lineWidth = w; g.stroke();
  };
  Pen.prototype.dahan = function (pts, w, warna, ink) {   // garis tebal bertepi tinta (lengan, kaki)
    this.garis(pts, w + 2 * (ink == null ? this.ol * 0.85 : ink), INK);
    this.garis(pts, w, warna);
  };
  Pen.prototype.titik = function (x, y, r, warna) { var g = this.g; g.beginPath(); g.arc(x, y, Math.max(.1, r), 0, TAU); g.fillStyle = warna || INK; g.fill(); };
  Pen.prototype.busur = function (cx, cy, rx, ry, a0, a1, w, warna) {
    var p = []; for (var i = 0; i <= 24; i++) { var a = rad(a0 + (a1 - a0) * i / 24); p.push([cx + rx * Math.cos(a), cy + ry * Math.sin(a)]); }
    this.garis(p, w, warna);
  };
  Pen.prototype.klip = function (pts, fn) { var g = this.g; g.save(); this.path(pts, true); g.clip(); fn(); g.restore(); };
  /* isi rata + sabit bayangan lembut di sisi jauh dari cahaya */
  Pen.prototype.isiSabit = function (pts, dasar, bayang, cahaya, R, geser, r0, r1) {
    geser = geser == null ? .45 : geser; r0 = r0 || 1.0; r1 = r1 || 1.1;
    var c = pusat(pts), gx = c[0] + Math.cos(cahaya) * geser * R, gy = c[1] + Math.sin(cahaya) * geser * R, g = this.g;
    var gr = g.createRadialGradient(gx, gy, 0, gx, gy, r1 * R);
    gr.addColorStop(0, dasar); gr.addColorStop(r0 / r1, dasar); gr.addColorStop(1, bayang);
    this.path(pts, true); g.fillStyle = gr; g.fill();
  };
  /* gradien lebar searah cahaya (badan, baju) */
  Pen.prototype.isiGradasi = function (pts, dasar, bayang, cahaya, datar) {
    datar = datar == null ? .25 : datar;
    var g = this.g, dx = Math.cos(cahaya), dy = Math.sin(cahaya), lo = 1e9, hi = -1e9, c = pusat(pts);
    pts.forEach(function (p) { var d = p[0] * dx + p[1] * dy; lo = Math.min(lo, d); hi = Math.max(hi, d); });
    var dc = c[0] * dx + c[1] * dy;
    var gr = g.createLinearGradient(c[0] + dx * (hi - dc), c[1] + dy * (hi - dc), c[0] + dx * (lo - dc), c[1] + dy * (lo - dc));
    gr.addColorStop(0, dasar); gr.addColorStop(datar, dasar); gr.addColorStop(Math.min(1, datar + .07), bayang); gr.addColorStop(1, mul(bayang, [.94, .94, .97]));
    this.path(pts, true); g.fillStyle = gr; g.fill();
  };
  /* cincin tinta tebal-tipis: paling tebal di arah `tebal` */
  Pen.prototype.cincin = function (pts, w0, tebal, k) {
    k = k == null ? .5 : k; var n = pts.length, c = pusat(pts), luar = [], dalam = [];
    for (var i = 0; i < n; i++) {
      var q = pts[i], a = pts[(i + n - 1) % n], b = pts[(i + 1) % n];
      var nx = b[1] - a[1], ny = a[0] - b[0], l = Math.hypot(nx, ny) || 1; nx /= l; ny /= l;
      var h = .5 * w0 * (1 + k * Math.cos(Math.atan2(q[1] - c[1], q[0] - c[0]) - tebal));
      luar.push([q[0] + nx * h, q[1] + ny * h]); dalam.push([q[0] - nx * h, q[1] - ny * h]);
    }
    var g = this.g; g.beginPath();
    luar.forEach(function (p, i) { if (i) g.lineTo(p[0], p[1]); else g.moveTo(p[0], p[1]); }); g.closePath();
    dalam.reverse().forEach(function (p, i) { if (i) g.lineTo(p[0], p[1]); else g.moveTo(p[0], p[1]); }); g.closePath();
    g.fillStyle = INK; g.fill('evenodd');
  };

  function pusat(pts) { var x = 0, y = 0; pts.forEach(function (p) { x += p[0]; y += p[1]; }); return [x / pts.length, y / pts.length]; }
  function ellPts(cx, cy, rx, ry, a0, a1, rot, n) {
    n = n || 40; var r = rad(rot || 0), o = [];
    for (var i = 0; i <= n; i++) { var a = rad(a0 + (a1 - a0) * i / n), x = rx * Math.cos(a), y = ry * Math.sin(a); o.push([cx + x * Math.cos(r) - y * Math.sin(r), cy + x * Math.sin(r) + y * Math.cos(r)]); }
    return o;
  }
  function kurva(a, k, b, n) {   // kurva halus a → (dekat) k → b
    n = n || 12; var c = [2 * k[0] - (a[0] + b[0]) / 2, 2 * k[1] - (a[1] + b[1]) / 2], o = [];
    for (var i = 0; i <= n; i++) { var t = i / n, s = 1 - t; o.push([s * s * a[0] + 2 * s * t * c[0] + t * t * b[0], s * s * a[1] + 2 * s * t * c[1] + t * t * b[1]]); }
    return o;
  }
  /* bentuk "kacang" superelips: mahkota/rahang terpisah, telur, tonjolan satu sisi */
  function blob(cx, cy, B, n) {
    n = n || 72; var o = [], ph = [rnd(B.seed, 11) * TAU, rnd(B.seed, 12) * TAU, rnd(B.seed, 13) * TAU];
    for (var i = 0; i < n; i++) {
      var t = i / n * TAU, c = Math.cos(t), s = Math.sin(t), e = 2 / (s < 0 ? B.nTop : B.nBot);
      var X = Math.sign(c) * Math.pow(Math.abs(c), e), Y = Math.sign(s) * Math.pow(Math.abs(s), e);
      X *= (1 + B.egg * Y) * (1 + B.asym * Math.sign(X));
      var r = 1 + B.noise * (Math.cos(2 * t + ph[0]) + .7 * Math.cos(3 * t + ph[1]) + .5 * Math.cos(4 * t + ph[2]));
      var x = B.a * X * r, y = B.b * Y * r;
      o.push([cx + x * Math.cos(B.rot) - y * Math.sin(B.rot), cy + x * Math.sin(B.rot) + y * Math.cos(B.rot)]);
    }
    return o;
  }
  function putar(pts, a, cx, cy) {
    if (!a) return pts; var c = Math.cos(a), s = Math.sin(a);
    return pts.map(function (p) { return [cx + (p[0] - cx) * c - (p[1] - cy) * s, cy + (p[0] - cx) * s + (p[1] - cy) * c]; });
  }
  var arahTebal = function (cahaya) { return Math.atan2(-Math.sin(cahaya) + .8, -Math.cos(cahaya)); };

  /* ---------- RUPA: setelan tokoh ---------- */
  var RUPA_DASAR = {
    kulit: '#FFDCC0', pipi: '#FF8F9C',
    rambut: '#2A1E1C', gayaRambut: 'rapi',   // rapi · cepak · jabrik · bob · panjang · kuncir · sanggul · botak · uban · hijab · ikal
    hijab: null,                              // warna hijab (gayaRambut 'hijab')
    atasan: '#F4F1EA', jenisAtasan: 'kaos',  // kaos · kemeja · blus · tangzhuang · jaket · hoodie · batik · celemek · jas
    luar: null,                               // warna outer/jaket terbuka (null = tanpa)
    aksen: '#C9A45C',                         // kancing, motif, kerah
    bawahan: '#3B4256', jenisBawahan: 'celana', // celana · rok · rokPanjang · sarung
    sepatu: '#3A2A26',
    kacamata: null, kumis: null, jenggot: null, anting: null,
    topi: null, warnaTopi: '#8E1A20',         // peci · topi · caping · koki
    bangun: 'dewasa'                          // dewasa · gemuk · anak · lansia
  };
  var BANGUN = {
    dewasa: { a: 112, badan: 1.08, kaki: 1.16, lebar: .9 },
    gemuk:  { a: 114, badan: 1.08, kaki: 1.0, lebar: 1.12 },
    anak:   { a: 108, badan: .8, kaki: .78, lebar: .78 },
    lansia: { a: 110, badan: 1.02, kaki: 1.06, lebar: .94 }
  };

  /* ---------- EKSPRESI ---------- */
  // mata: bulat · senang (^) · tutup · kaget · sipit · kedip(kiri tutup) · bintang
  // alis [dalam, luar] (+ = turun) dalam satuan u · mulut: lihat fungsi mulut()
  var EKS = {
    netral:  { mata: ['bulat', 'bulat'], alis: [0, -1], mulut: 'senyumKecil', pipi: .55 },
    senyum:  { mata: ['bulat', 'bulat'], alis: [-1, -2], mulut: 'senyum', pipi: .8 },
    senang:  { mata: ['senang', 'senang'], alis: [-3, -3], mulut: 'lebar', pipi: 1 },
    tawa:    { mata: ['tutupSenang', 'tutupSenang'], alis: [-4, -4], mulut: 'tawa', pipi: 1 },
    kaget:   { mata: ['kaget', 'kaget'], alis: [-7, -6], mulut: 'O', pipi: .3 },
    cemas:   { mata: ['bulatKecil', 'bulatKecil'], alis: [-4, 3], mulut: 'gelombang', pipi: .35, keringat: 1 },
    sedih:   { mata: ['sedih', 'sedih'], alis: [-5, 4], mulut: 'cemberut', pipi: .3, air: 1 },
    marah:   { mata: ['sipit', 'sipit'], alis: [5, -3], mulut: 'cemberut', pipi: .4, urat: 1 },
    yakin:   { mata: ['bulat', 'bulat'], alis: [2, -3], mulut: 'seringai', pipi: .6 },
    bingung: { mata: ['bulat', 'bulatKecil'], alis: [-5, 2], mulut: 'miring', pipi: .4, tanya: 1 },
    kedip:   { mata: ['bulat', 'senang'], alis: [-2, -3], mulut: 'lebar', pipi: .9 },
    sombong: { mata: ['sipit', 'sipit'], alis: [-2, -4], mulut: 'seringai', pipi: .5 }
  };

  /* ---------- POSE ----------
     Tiap lengan: a = sudut lengan dari bahu (derajat; 0 = lurus ke bawah, 90 = mendatar keluar, 180 = lurus ke atas,
     negatif = menyilang ke depan badan), j = jangkauan 0..1 (1 = lengan lurus), s = arah siku (+1 keluar/bawah, -1 ke dalam),
     b = bentuk tangan (bulat · tunjuk · buka · kepal), d = digambar di depan badan, g = melambai.
     Panjang lengan atas & bawah TETAP (IK dua ruas), jadi siku selalu masuk akal. */
  var POSE = {
    diri:        { L: { a: 10, j: .97, s: 1 }, R: { a: 10, j: .97, s: 1 } },
    santai:      { L: { a: 6, j: .98, s: 1 }, R: { a: -4, j: .78, s: 1, d: 1 } },
    pinggang:    { L: { a: -2, j: .8, s: 1, b: 'kepal' }, R: { a: -2, j: .8, s: 1, b: 'kepal' } },
    tunjuk:      { L: { a: 10, j: .97, s: 1 }, R: { a: 92, j: 1, s: 1, b: 'tunjuk' } },
    tunjukAtas:  { L: { a: 10, j: .97, s: 1 }, R: { a: 148, j: .98, s: 1, b: 'tunjuk' } },
    tunjukBawah: { L: { a: 10, j: .97, s: 1 }, R: { a: 42, j: 1, s: 1, b: 'tunjuk' } },
    lambai:      { L: { a: 10, j: .97, s: 1 }, R: { a: 140, j: .7, s: 1, b: 'buka', g: 1 } },
    jelaskan:    { L: { a: 10, j: .97, s: 1 }, R: { a: 55, j: .66, s: 1, b: 'buka', d: 1 } },
    presentasi:  { L: { a: 58, j: .72, s: 1, b: 'buka' }, R: { a: 58, j: .72, s: 1, b: 'buka' } },
    tolak:       { L: { a: 10, j: .97, s: 1 }, R: { a: 75, j: .78, s: 1, b: 'buka', d: 1 } },
    kaget:       { L: { a: 150, j: .5, s: 1, b: 'buka' }, R: { a: 150, j: .5, s: 1, b: 'buka' } },
    pikir:       { L: { a: -38, j: .58, s: 1, d: 1, b: 'kepal' }, R: { a: -158, j: .5, s: 1, d: 1, b: 'kepal' } },
    garuk:       { L: { a: 10, j: .97, s: 1 }, R: { a: -172, j: .78, s: 1, b: 'kepal' } },
    sorak:       { L: { a: 160, j: .96, s: 1, b: 'kepal' }, R: { a: 160, j: .96, s: 1, b: 'kepal' } },
    sedih:       { L: { a: -8, j: .96, s: -1 }, R: { a: -8, j: .96, s: -1 } },
    pegang:      { L: { a: -36, j: .62, s: 1, d: 1 }, R: { a: -30, j: .64, s: 1, d: 1 } },
    sedekap:     { L: { a: -72, j: .52, s: 1, d: 1, b: 'kepal' }, R: { a: -66, j: .55, s: 1, d: 1, b: 'kepal' } },
    hormat:      { L: { a: -62, j: .48, s: 1, d: 1, b: 'buka' }, R: { a: -58, j: .5, s: 1, d: 1, b: 'kepal' } },
    salam:       { L: { a: -64, j: .5, s: 1, d: 1, b: 'buka' }, R: { a: -64, j: .5, s: 1, d: 1, b: 'buka' } },
    duduk:       { L: { a: -14, j: .78, s: 1, d: 1 }, R: { a: -14, j: .78, s: 1, d: 1 }, duduk: 1 },
    lari:        { L: { a: 18, j: .62, s: 1, b: 'kepal' }, R: { a: 18, j: .62, s: 1, b: 'kepal' }, lari: 1 }
  };
  function poseDariNama(p) { return typeof p === 'object' && p ? p : (POSE[p] || POSE.diri); }
  function campurLengan(A, B, k) {
    return { a: lr(A.a, B.a, k), j: lr(A.j == null ? .95 : A.j, B.j == null ? .95 : B.j, k), s: lr(A.s == null ? 1 : A.s, B.s == null ? 1 : B.s, k),
      b: k < .5 ? A.b : B.b, d: k < .5 ? A.d : B.d, g: lr(A.g || 0, B.g || 0, k) };
  }
  /* campur dua pose (0..1) */
  function campurPose(a, b, k) {
    a = poseDariNama(a); b = poseDariNama(b);
    return { L: campurLengan(a.L, b.L, k), R: campurLengan(a.R, b.R, k), duduk: k < .5 ? a.duduk : b.duduk, lari: k < .5 ? a.lari : b.lari };
  }
  /* pose berganti mulus menurut waktu: daftar [[detik,'pose'], ...]; antisipasi kecil + lewat-sasaran (overshoot) */
  function poseDari(t, daftar, dur) {
    dur = dur || .42; var i = 0;
    for (var k = 0; k < daftar.length; k++) if (t >= daftar[k][0]) i = k;
    if (i === 0) return poseDariNama(daftar[0][1]);
    var x = cl((t - daftar[i][0]) / dur, 0, 1);
    var c1 = 1.5, c3 = c1 + 1, e = 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2);
    var antisipasi = x < .2 ? -Math.sin(x / .2 * PI) * .07 : 0;
    return campurPose(daftar[i - 1][1], daftar[i][1], e + antisipasi);
  }
  /* ekspresi menurut waktu: daftar [[detik,'ekspresi'], ...] */
  function ekspresiDari(t, daftar) { var e = daftar[0][1]; for (var i = 0; i < daftar.length; i++) if (t >= daftar[i][0]) e = daftar[i][1]; return e; }
  /* langkah tanpa kaki meluncur: fase dari jarak tempuh (meter); satu siklus = dua langkah */
  function faseDariJarak(jarak, panjangLangkah) { return jarak / (2 * (panjangLangkah || .55)); }
  /* IK dua ruas: S pangkal, Tg sasaran, l1/l2 panjang ruas, (arahX, arahY) = sisi tempat siku/lutut menonjol */
  function ik2(S, Tg, l1, l2, arahX, arahY) {
    var dx = Tg[0] - S[0], dy = Tg[1] - S[1], d = Math.hypot(dx, dy) || 1e-3;
    var dd = cl(d, Math.abs(l1 - l2) + 1, l1 + l2 - .01), ux = dx / d, uy = dy / d;
    var T2 = [S[0] + ux * dd, S[1] + uy * dd];
    var x = (l1 * l1 - l2 * l2 + dd * dd) / (2 * dd), h = Math.sqrt(Math.max(0, l1 * l1 - x * x));
    var mx = S[0] + ux * x, my = S[1] + uy * x, n1 = [mx - uy * h, my + ux * h], n2 = [mx + uy * h, my - ux * h];
    var sk1 = (n1[0] - mx) * arahX + (n1[1] - my) * (arahY || 0), sk2 = (n2[0] - mx) * arahX + (n2[1] - my) * (arahY || 0);
    return { E: sk1 >= sk2 ? n1 : n2, H: T2 };
  }

  /* ---------- wajah ---------- */
  function mata(p, jenis, x, y, u, sisi, lirik, kulit, kd) {
    var lx = x + lirik * 2.6 * u, w = 3.6 * u;
    if (kd >= .85 && /bulat|kaget|sipit|sedih/.test(jenis)) jenis = 'tutup';
    switch (jenis) {
      case 'bulat': case 'bulatKecil': case 'sedih': {
        var k = jenis === 'bulatKecil' ? .72 : 1, ry = 9 * u * k * (1 - .75 * kd), rx = 6.8 * u * k;
        p.ell(lx, y, rx, ry, INK, 0);
        // pantulan: dua kilau putih + sedikit biru di bawah
        var g = p.g; g.save(); p.path(ellPts(lx, y, rx, ry, 0, 360, 0), true); g.clip();
        p.ell(lx, y + ry * .55, rx * .8, ry * .45, '#4B3D66', 0);
        g.restore();
        p.titik(lx - 2.2 * u, y - ry * .38, 2.5 * u * k, PUTIH);
        p.titik(lx + 2.3 * u, y + ry * .32, 1.2 * u * k, PUTIH);
        break;
      }
      case 'senang': p.busur(x, y + 4 * u, 7.5 * u, 6.5 * u, 200, 340, w); break;
      case 'tutupSenang': p.busur(x, y + 4 * u, 8 * u, 6 * u, 195, 345, w * 1.1); break;
      case 'tutup': p.busur(x, y - 1 * u, 7 * u, 4 * u, 20, 160, w); break;
      case 'sipit':
        p.ell(lx, y + u, 6.5 * u, 4 * u * (1 - .7 * kd), INK, 0);
        p.garis([[x - 8.5 * u, y - 2 * u], [x + 8.5 * u, y - 2 * u]], w); p.titik(lx - 2 * u, y, 1.6 * u, PUTIH); break;
      case 'kaget':
        p.ell(x, y, 10 * u, 11 * u, PUTIH, 2.6 * u); p.titik(lx, y + 1 * u, 3.6 * u, INK); p.titik(lx - 1.2 * u, y - .4 * u, 1.1 * u, PUTIH); break;
      case 'bintang': {
        var s = []; for (var i = 0; i < 10; i++) { var a = -PI / 2 + i * PI / 5, r = (i % 2 ? 4 : 9.5) * u; s.push([x + Math.cos(a) * r, y + Math.sin(a) * r]); }
        p.poly(s, '#FFD36A', 1.6 * u); break;
      }
    }
  }
  function mulut(p, jenis, mx, my, u, bicara, vokal) {
    var w = 3.4 * u;
    if (bicara > .03 && jenis !== 'O' && jenis !== 'tawa') {   // bibir bicara: bentuk mengikuti vokal (visem)
      var b = Math.min(1, bicara), v = vokal || 'a';
      if (v === 'm') {   // m/b/p: bibir rapat sedikit ditekan
        p.garis([[mx - 6.5 * u, my - 1.5 * u], [mx + 6.5 * u, my - 1.5 * u]], 3.4 * u);
        p.busur(mx, my + 1.2 * u, 4 * u, 1.6 * u, 20, 160, 1.6 * u, 'rgba(120,40,50,.45)');
        return;
      }
      if (v === 'o' || v === 'u') {   // bulat
        var rr = (v === 'u' ? 3.6 : 4.8) * u, ry0 = (v === 'u' ? 4.4 : 5.5 + 4 * b) * u;
        p.ell(mx, my, rr, ry0, MULUT, 2.8 * u);
        p.klip(ellPts(mx, my, rr, ry0, 0, 360, 0), function () { p.ell(mx, my + ry0 * .7, rr * .7, ry0 * .45, LIDAH, 0); });
        return;
      }
      if (v === 'i' || v === 'e') {   // melebar, gigi tampak
        var rx1 = (9.5 + 1.5 * b) * u, ry1 = (2.4 + (v === 'e' ? 4 : 2.6) * b) * u, y1 = my - 1.5 * u;
        p.ell(mx, y1, rx1, ry1, MULUT, 0);
        p.klip(ellPts(mx, y1, rx1, ry1, 0, 360, 0), function () { p.poly([[mx - rx1, y1 - ry1], [mx + rx1, y1 - ry1], [mx + rx1, y1 - ry1 * .15], [mx - rx1, y1 - ry1 * .15]], PUTIH, 0); });
        p.ell(mx, y1, rx1, ry1, null, 2.6 * u);
        return;
      }
      var ry = (3 + 8 * b) * u, rx = (8 + 2 * b) * u;   // 'a': huruf D terbuka
      p.ell(mx, my - 1.5 * u, rx, ry, MULUT, 0, 0, 180);
      p.klip(ellPts(mx, my - 1.5 * u, rx, ry, 0, 180, 0), function () { p.ell(mx + 1.5 * u, my - 1.5 * u + ry * .95, rx * .55, ry * .5, LIDAH, 0); p.poly([[mx - rx, my - 2 * u], [mx + rx, my - 2 * u], [mx + rx, my + .6 * u], [mx - rx, my + .6 * u]], PUTIH, 0); });
      p.ell(mx, my - 1.5 * u, rx, ry, null, 2.8 * u, 0, 180);
      p.garis([[mx - rx, my - 1.5 * u], [mx + rx, my - 1.5 * u]], 2.8 * u);
      return;
    }
    switch (jenis) {
      case 'senyumKecil': p.busur(mx, my - 3 * u, 5.5 * u, 3.6 * u, 25, 155, w); break;
      case 'senyum': p.busur(mx, my - 4 * u, 8 * u, 5 * u, 20, 160, w); break;
      case 'lebar': case 'tawa': {
        var rx2 = (jenis === 'tawa' ? 13 : 10) * u, ry2 = (jenis === 'tawa' ? 12 : 8) * u;
        p.ell(mx, my - 3 * u, rx2, ry2, MULUT, 0, 0, 180);
        p.klip(ellPts(mx, my - 3 * u, rx2, ry2, 0, 180, 0), function () {
          p.ell(mx + u, my - 3 * u + ry2 * .95, rx2 * .55, ry2 * .55, LIDAH, 0);
          p.poly([[mx - rx2, my - 3.2 * u], [mx + rx2, my - 3.2 * u], [mx + rx2, my - .2 * u], [mx - rx2, my - .2 * u]], PUTIH, 0);
        });
        p.ell(mx, my - 3 * u, rx2, ry2, null, 2.8 * u, 0, 180); p.garis([[mx - rx2, my - 3 * u], [mx + rx2, my - 3 * u]], 2.8 * u);
        break;
      }
      case 'O': p.ell(mx, my + 1 * u, 6 * u, 8.5 * u, MULUT, 2.8 * u); p.ell(mx, my + 5 * u, 3.4 * u, 2.4 * u, LIDAH, 0); break;
      case 'gelombang': { var s = []; for (var i = 0; i <= 12; i++) s.push([mx - 8 * u + i * 1.35 * u, my + 1.4 * u * Math.sin(i * 1.4)]); p.garis(s, 2.8 * u); break; }
      case 'cemberut': p.busur(mx, my + 3 * u, 6.5 * u, 3.6 * u, 205, 335, w); break;
      case 'seringai': p.busur(mx + 2 * u, my - 4 * u, 7.5 * u, 4.5 * u, 10, 140, w); break;
      case 'miring': p.garis([[mx - 6 * u, my + 1 * u], [mx + 6 * u, my - 1.6 * u]], w); break;
    }
  }
  function taper(p, a, b, wa, wb, warna) {
    var dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1, nx = -dy / l, ny = dx / l;
    p.poly([[a[0] + nx * wa / 2, a[1] + ny * wa / 2], [b[0] + nx * wb / 2, b[1] + ny * wb / 2], [b[0] - nx * wb / 2, b[1] - ny * wb / 2], [a[0] - nx * wa / 2, a[1] - ny * wa / 2]], warna || INK, 0);
    p.titik(a[0], a[1], wa / 2, warna); p.titik(b[0], b[1], wb / 2, warna);
  }
  function wajah(p, R, cx, cy, Wk, o, kd) {
    var u = Wk / 100, F = EKS[o.ekspresi] || EKS.netral, hd = o.hadap || 0, fx = cx + 9 * u * hd;
    var ey = cy + 10 * u, ex = 21 * u, lirik = o.lirik != null ? o.lirik : hd * .6;
    // pipi merona (gradien lembut)
    var g = p.g;
    [-1, 1].forEach(function (s) {
      var bx = fx + s * 31 * u - hd * 3 * u, by = ey + 17 * u, gr = g.createRadialGradient(bx, by, 0, bx, by, 11 * u);
      gr.addColorStop(0, hexA(R.pipi, .62 * F.pipi)); gr.addColorStop(1, hexA(R.pipi, 0));
      g.fillStyle = gr; g.beginPath(); g.ellipse(bx, by, 12 * u, 7.5 * u, 0, 0, TAU); g.fill();
      if (F.pipi > .7) for (var i = 0; i < 3; i++) p.garis([[bx - 5 * u + i * 4 * u, by - 2 * u], [bx - 7 * u + i * 4 * u, by + 2.5 * u]], 1.3 * u, mul(R.pipi, [.8, .5, .55]));
    });
    [-1, 1].forEach(function (s) {
      var x = fx + s * ex, jenis = F.mata[s > 0 ? 1 : 0];
      mata(p, jenis, x, ey, u, s, lirik, R.kulit, kd);
      var naik = (o.alisNaik || 0) * 4.5 * u, by = ey - 17 * u - naik, dI = F.alis[0], dO = F.alis[1];
      var warnaAlis = R.gayaRambut === 'uban' || R.gayaRambut === 'botak' ? mix(R.rambut, INK, .35) : INK;
      if (jenis === 'kaget') p.busur(x, by - 5 * u, 8 * u, 3 * u, 200, 340, 3.6 * u, warnaAlis);
      else taper(p, [x - s * 7.5 * u, by + dI * u], [x + s * 7.5 * u, by + dO * u], 4.6 * u, 2.4 * u, warnaAlis);
    });
    // hidung kecil
    p.busur(fx + hd * 2 * u, ey + 10 * u, 2.4 * u, 1.6 * u, 20, 160, 2.2 * u, mul(R.kulit, [.7, .5, .5]));
    var mx = fx + hd * 2 * u, my = ey + 22 * u;
    if (R.kumis) { taper(p, [mx - 1.5 * u, my - 6.5 * u], [mx - 14 * u, my - 3 * u], 5 * u, 1.8 * u, R.kumis); taper(p, [mx + 1.5 * u, my - 6.5 * u], [mx + 14 * u, my - 3 * u], 5 * u, 1.8 * u, R.kumis); }
    mulut(p, F.mulut, mx, my, u, o.bicara || 0, o.vokal);
    if (R.kacamata) {
      g.save(); g.strokeStyle = R.kacamata; g.lineWidth = 3 * u; g.fillStyle = 'rgba(225,240,255,.22)';
      [-1, 1].forEach(function (s) { var x = fx + s * ex; g.beginPath(); g.roundRect ? g.roundRect(x - 11 * u, ey - 9 * u, 22 * u, 17 * u, 6 * u) : g.rect(x - 11 * u, ey - 9 * u, 22 * u, 17 * u); g.fill(); g.stroke();
        g.strokeStyle = 'rgba(255,255,255,.7)'; g.lineWidth = 1.6 * u; g.beginPath(); g.moveTo(x - 6 * u, ey - 5 * u); g.lineTo(x - 2 * u, ey - 7 * u); g.stroke(); g.strokeStyle = R.kacamata; g.lineWidth = 3 * u; });
      g.beginPath(); g.moveTo(fx - ex + 11 * u, ey - 2 * u); g.quadraticCurveTo(fx, ey - 6 * u, fx + ex - 11 * u, ey - 2 * u); g.stroke(); g.restore();
    }
    if (F.keringat) p.poly(tetes(cx + 44 * u * (hd || 1), cy - 18 * u, 6 * u), '#A9DBFF', 1.8 * u);
    if (F.air) [-1, 1].forEach(function (s) { p.poly(tetes(fx + s * ex + s * 3 * u, ey + 14 * u, 3.6 * u), '#A9DBFF', 1.4 * u); });
    if (F.urat) { var vx = cx + 34 * u, vy = cy - 44 * u; [[0, 1], [1, 0], [0, -1], [-1, 0]].forEach(function (d) { p.busur(vx + d[0] * 5 * u, vy + d[1] * 5 * u, 4 * u, 4 * u, 0, 180, 2.4 * u, '#D8334A'); }); }
  }
  function tetes(x, y, r) { var o = []; for (var i = 0; i <= 20; i++) { var a = -PI / 2 + i / 20 * TAU, k = Math.abs(Math.sin(a / 2 + PI / 4)); o.push([x + Math.cos(a) * r * (.3 + .7 * (1 - Math.max(0, -Math.sin(a)))), y + Math.sin(a) * r * 1.3 + (Math.sin(a) < 0 ? -r * .9 * (-Math.sin(a)) : 0)]); } return o; }
  function hexA(c, a) { var v = rgb(c); return 'rgba(' + v[0] + ',' + v[1] + ',' + v[2] + ',' + cl(a, 0, 1).toFixed(3) + ')'; }

  /* ---------- rambut ---------- */
  function rambutBelakang(p, R, H, cx, hc, cahaya, tebal, ow, t, b0, ayun) {
    var gr = R.gayaRambut, col = R.rambut, sh = mul(col, SH_RAMBUT), u = H.a / 50;
    var goy = ayun != null ? ayun : 0;   // tanpa goyang: rambut hanya condong searah gerak
    if (gr === 'hijab') {
      var hj = R.hijab || '#C98E9A';
      var s = blob(cx, hc + 26 * u, { a: H.a * 1.1, b: H.b * 1.3, nTop: 2.2, nBot: 1.7, egg: .22, asym: 0, rot: 0, noise: .004, seed: 3 });
      p.isiSabit(s, hj, mul(hj, SH_KAIN), cahaya, H.a * 1.2, .5); p.cincin(s, ow, tebal);
      return;
    }
    if (gr === 'panjang' || gr === 'bob' || gr === 'ikal') {
      var pj = gr === 'panjang' ? 1.62 : gr === 'ikal' ? 1.15 : 1.0;
      var pts = [];
      for (var i = 0; i <= 30; i++) {
        var a = PI + i / 30 * PI, rx = H.a * 1.13, ry = H.b * 1.1;
        pts.push([cx + Math.cos(a) * rx, hc + Math.sin(a) * ry]);
      }
      var yb = hc + H.b * pj;
      if (gr === 'ikal') {
        for (var j = 0; j <= 8; j++) { var xx = cx + H.a * 1.13 - j / 8 * 2.26 * H.a; pts.push([xx + (j % 2 ? 0 : 6 * u), yb + (j % 2 ? 8 * u : -4 * u)]); }
      } else {
        pts.push([cx + H.a * 1.08 + goy * .5, yb - 22 * u]);
        for (var k = 0; k <= 6; k++) { var xk = cx + H.a * .96 - k / 6 * 1.92 * H.a; pts.push([xk + goy * (1 - k / 6), yb + (k % 2 ? 6 * u : 0)]); }
        pts.push([cx - H.a * 1.08 + goy * .5, yb - 22 * u]);
      }
      p.isiSabit(pts, col, sh, cahaya, H.a * 1.2, .5); p.cincin(pts, ow, tebal);
    }
    if (gr === 'kuncir') {
      var kx = cx - H.a * 1.0, ky = hc - H.b * .2;
      var kc = [[kx + 10 * u, ky - 14 * u], [kx - 26 * u, ky - 8 * u], [kx - 40 * u + goy, ky + 26 * u], [kx - 30 * u + goy, ky + 62 * u], [kx - 14 * u, ky + 30 * u], [kx + 4 * u, ky + 8 * u]];
      p.isiSabit(kc, col, sh, cahaya, 40 * u, .4); p.poly(kc, null, ow * .9);
    }
    if (gr === 'sanggul') {
      var sg = ellPts(cx + H.a * .1, hc - H.b * 1.02, 26 * u, 22 * u, 0, 360, 0);
      p.isiSabit(sg, col, sh, cahaya, 26 * u, .45); p.cincin(sg, ow * .9, tebal);
    }
  }
  function rambutDepan(p, R, H, hp, cx, hc, cahaya, tebal, ow, hd) {
    var gr = R.gayaRambut, col = R.rambut, sh = mul(col, SH_RAMBUT), u = H.a / 50, top = hc - H.b;
    if (gr === 'botak' || gr === 'hijab') {
      if (gr === 'botak') {   // rambut samping tipis + kilap kepala
        [-1, 1].forEach(function (s) {
          var sp = ellPts(cx + s * H.a * .9, hc - 2 * u, 9 * u, 20 * u, 0, 360, s * 12);
          p.isiSabit(sp, col, sh, cahaya, 18 * u, .3); p.poly(sp, null, ow * .7);
        });
        p.busur(cx - H.a * .35, top + 22 * u, 16 * u, 9 * u, 200, 290, 4 * u, 'rgba(255,255,255,.55)');
      } else {
        var hj = R.hijab || '#C98E9A';
        var muka = blob(cx, hc + 6 * u, Object.assign({}, H, { a: H.a * .86, b: H.b * .86 }));
        var dahi = ellPts(cx, hc - H.b * .95, H.a * 1.25, H.b * .68, 0, 360, 0);
        p.klip(muka, function () { p.isiSabit(dahi, hj, mul(hj, SH_KAIN), cahaya, H.a, .4); p.busur(cx, hc - H.b * .95, H.a * 1.25, H.b * .68, 20, 160, ow, INK); });
        p.busur(cx, hc - H.b * .95, H.a * 1.05, H.b * .5, 40, 140, 1.6 * u, hexA(terang(hj, .5), .8));
        p.busur(cx - H.a * .2, top + 18 * u, H.a * .5, 10 * u, 200, 280, 4 * u, 'rgba(255,255,255,.45)');
      }
      return;
    }
    var potong = { spike: .2, rapi: .3, cepak: .22, jabrik: .26, bob: .34, panjang: .33, kuncir: .3, sanggul: .28, uban: .26, ikal: .32 }[gr] || .3;
    if (R.topi === 'peci' || R.topi === 'topi') potong = Math.min(potong, .22);
    var cut = top + potong * 2 * H.b;
    var hp2 = hp.map(function (q) { return [cx + (q[0] - cx) * 1.05, hc + (q[1] - hc) * 1.05]; }), n = hp2.length;
    var batas = function (q) { return q[1] < cut + (Math.abs(q[0] - cx) > H.a * .8 ? H.b * (gr === 'spike' ? .22 : .34) : 0); };
    var cap = [], i0 = n >> 1;
    for (var kk = i0; kk > 0 && batas(hp2[kk]); kk--) cap.unshift(hp2[kk]);       // kiri bawah → kiri
    for (var kk2 = i0 + 1; kk2 < n; kk2++) cap.push(hp2[kk2]);                    // kiri → atas → kanan
    for (var kk3 = 0; kk3 < i0 && batas(hp2[kk3]); kk3++) cap.push(hp2[kk3]);       // kanan → kanan bawah
    var kiri = cap[0], kanan = cap[cap.length - 1];
    // poni: deretan helai berujung lancip, melengkung searah sisiran
    var nP = { jabrik: 7, cepak: 6, rapi: 5, uban: 5, spike: 6 }[gr] || 6, sisir = hd ? hd : (gr === 'rapi' || gr === 'uban' ? 1 : gr === 'spike' ? .4 : 0);
    var poni = [];
    for (var i = 0; i < nP; i++) {
      var A = [lr(kanan[0], kiri[0], i / nP), i ? cut : kanan[1]], B = [lr(kanan[0], kiri[0], (i + 1) / nP), i === nP - 1 ? kiri[1] : cut];
      var tengah = 1 - Math.abs((i + .5) / nP - .5) * 2;
      var dalam = (gr === 'cepak' ? 6 : gr === 'spike' ? 6 : gr === 'jabrik' ? 16 : 13) * u * (.55 + .45 * tengah) * (i % 2 ? .75 : 1);
      var tip = [lr(A[0], B[0], .5) - sisir * 6 * u, cut + dalam - (sisir > 0 ? i / nP * 10 * u : sisir < 0 ? (1 - i / nP) * 10 * u : 0)];
      poni = poni.concat(kurva(A, [lr(A[0], tip[0], .5) + 2 * u, lr(A[1], tip[1], .6)], tip, 5).slice(i ? 1 : 0));
      poni = poni.concat(kurva(tip, [lr(tip[0], B[0], .5), lr(tip[1], B[1], .3)], B, 5).slice(1));
    }
    var bentuk = cap.concat(poni.slice(1, -1));
    if (gr === 'spike') {   // rambut pendek berdiri (Ko Popo): SATU bentuk padat — lengkung kepala + 6 jambul berjarak sama + garis dahi mulus
      var ra = H.a * 1.06, rb = H.b * 1.06, pt = function (deg, k) { var r0 = deg * PI / 180; return [cx + Math.cos(r0) * ra * (k || 1), hc + Math.sin(r0) * rb * (k || 1)]; };
      var jambul = [222, 240, 257, 274, 291, 308], lebarJ = 7.5, hasil = [];
      hasil.push(pt(200, .97));                                   // cambang kiri, terselip di garis kepala
      for (var dg = 198; dg <= 342; dg += 2) {
        var dekat = jambul.filter(function (c) { return Math.abs(dg - c) < lebarJ; })[0];
        if (dekat != null) {
          if (Math.abs(dg - (dekat - lebarJ + 1)) < 1.01) {          // masuk jambul: alas kiri → ujung → alas kanan
            var ujung = (dekat + (270 - dekat) * .28) * PI / 180, pj = (dekat === 257 || dekat === 274) ? 1.22 : 1.17;
            hasil.push(pt(dekat - lebarJ)); hasil.push([cx + Math.cos(ujung) * ra * pj, hc + Math.sin(ujung) * rb * pj]); hasil.push(pt(dekat + lebarJ));
          }
          continue;
        }
        hasil.push(pt(dg));
      }
      hasil.push(pt(340, .97));                                    // cambang kanan
      var yDahi = hc - H.b * .5, xDahi = H.a * .8;
      hasil = hasil.concat(kurva([cx + H.a * .93, hc - H.b * .3], [cx + xDahi * 1.02, yDahi - 2 * u], [cx + xDahi * .9, yDahi], 6).slice(1));
      hasil = hasil.concat(kurva([cx + xDahi * .9, yDahi], [cx + H.a * .15, yDahi + 5 * u], [cx - xDahi * .9, yDahi - 1 * u], 14).slice(1));   // belahan halus
      hasil = hasil.concat(kurva([cx - xDahi * .9, yDahi - 1 * u], [cx - xDahi * 1.02, yDahi - 2 * u], [cx - H.a * .93, hc - H.b * .3], 6).slice(1));
      bentuk = hasil;
    }
    if (gr === 'jabrik') {   // duri di mahkota
      var duri = [];
      for (var j = 0; j < cap.length; j++) { var q = cap[j], a = Math.atan2(q[1] - hc, q[0] - cx), k = (j % 5 === 2 && q[1] < hc - H.b * .55) ? 11 * u : 0; duri.push([q[0] + Math.cos(a) * k, q[1] + Math.sin(a) * k]); }
      bentuk = duri.concat(poni.slice(1, -1).reverse());
    }
    p.isiSabit(bentuk, col, sh, cahaya, H.a, .38);
    // kilap rambut: busur terang di sisi cahaya
    p.klip(bentuk, function () {
      var kx = cx + Math.cos(cahaya) * H.a * .35, ky = top + (gr === 'spike' ? 6 : 22) * u;
      p.busur(kx, ky + 8 * u, H.a * .55, 14 * u, 195, 300, 5 * u, gr === 'uban' ? 'rgba(255,255,255,.7)' : hexA(terang(col, .55), .75));
      p.busur(kx + 4 * u, ky + 2 * u, H.a * .32, 8 * u, 200, 290, 2.4 * u, hexA(terang(col, .7), .55));
    });
    p.poly(bentuk, null, ow);
    if (gr === 'kuncir' || gr === 'sanggul') {   // ikat rambut
      var ix = gr === 'kuncir' ? cx - H.a * .98 : cx + H.a * .1, iy = gr === 'kuncir' ? hc - H.b * .22 : hc - H.b * .82;
      p.ell(ix, iy, 6 * u, 5 * u, R.aksen || '#E0505E', 1.8 * u);
    }
  }

  /* ---------- topi ---------- */
  function topi(p, R, H, cx, hc, cahaya, tebal, ow) {
    if (!R.topi) return; var u = H.a / 50, top = hc - H.b, col = R.warnaTopi;
    if (R.topi === 'peci') {
      var pc = [[cx - H.a * .78, top + 18 * u], [cx + H.a * .78, top + 18 * u], [cx + H.a * .7, top - 18 * u], [cx - H.a * .7, top - 18 * u]];
      p.isiGradasi(pc, col, mul(col, SH_KAIN), cahaya, .3); p.poly(pc, null, ow * .9);
      p.garis([[cx - H.a * .66, top - 8 * u], [cx + H.a * .66, top - 8 * u]], 1.6 * u, hexA('#FFFFFF', .25));
    } else if (R.topi === 'topi') {
      var cr = ellPts(cx, top + 16 * u, H.a * .98, H.b * .62, 180, 360, 0);
      p.isiSabit(cr, col, mul(col, SH_KAIN), cahaya, H.a, .4); p.poly(cr, null, ow);
      p.ell(cx + H.a * .25, top + 16 * u, H.a * .9, 9 * u, mul(col, [.82, .82, .85]), ow * .8, -10, 190);
      p.titik(cx, top - H.b * .48, 5 * u, mul(col, [.8, .8, .8]));
    } else if (R.topi === 'caping') {
      var cp = [[cx - H.a * 1.6, top + 26 * u], [cx, top - 40 * u], [cx + H.a * 1.6, top + 26 * u]];
      p.isiGradasi(cp, '#E8C885', '#B8945A', cahaya, .3); p.poly(cp, null, ow);
      for (var i = 1; i < 4; i++) p.garis([[cx - H.a * 1.6 * i / 4, top + 26 * u - 66 * u * (1 - i / 4) * 0], [cx, top - 40 * u]], 1.2 * u, 'rgba(90,60,30,.45)');
    } else if (R.topi === 'koki') {
      var kk = [[cx - H.a * .72, top + 14 * u], [cx + H.a * .72, top + 14 * u], [cx + H.a * .8, top - 40 * u], [cx - H.a * .8, top - 40 * u]];
      p.isiGradasi(kk, '#FFFFFF', '#D9DCEA', cahaya, .35); p.poly(kk, null, ow * .9);
      [-1, 0, 1].forEach(function (s) { var c2 = ellPts(cx + s * H.a * .45, top - 44 * u, 26 * u, 22 * u, 0, 360, 0); p.isiSabit(c2, '#FFFFFF', '#D9DCEA', cahaya, 26 * u); p.poly(c2, null, ow * .8); });
    }
  }

  /* ---------- tangan & barang ---------- */
  /* tangan = bulatan polos tanpa jari (jelas di ukuran kecil): sedikit lonjong searah lengan, tinta tegas, bayangan cel */
  function tangan(p, h, ar, bentuk, kulit, u) {
    var r = 8.2 * u, pts = ellPts(h[0], h[1], r * 1.08, r * .94, 0, 360, ar * 180 / PI);
    p.isiSabit(pts, kulit, mul(kulit, SH_KULIT), rad(-125), r, .45, 1.0, 1.12);
    p.poly(pts, null, 2.8 * u);
    p.titik(h[0] - 2.4 * u, h[1] - 2.6 * u, 2.2 * u, 'rgba(255,255,255,.4)');
  }
  function barang(p, jenis, h, u, t) {
    var x = h[0], y = h[1];
    switch (jenis) {
      case 'hp':
        p.poly(rr(x - 9 * u, y - 30 * u, x + 9 * u, y + 4 * u, 3 * u), '#2E3445', 2.2 * u);
        p.poly(rr(x - 6.5 * u, y - 27 * u, x + 6.5 * u, y + .5 * u, 2 * u), '#7FD2FF', 0);
        p.garis([[x - 4 * u, y - 22 * u], [x + 3 * u, y - 22 * u]], 1.6 * u, '#FFFFFF'); p.garis([[x - 4 * u, y - 17 * u], [x + 1 * u, y - 17 * u]], 1.6 * u, '#FFFFFF'); break;
      case 'kertas':
        p.poly([[x - 22 * u, y - 40 * u], [x + 18 * u, y - 43 * u], [x + 21 * u, y + 6 * u], [x - 19 * u, y + 9 * u]], '#FBF5E6', 2.2 * u);
        for (var i = 0; i < 4; i++) p.garis([[x - 13 * u, y - 31 * u + i * 9 * u], [x + 11 * u, y - 33 * u + i * 9 * u]], 1.6 * u, '#A09078'); break;
      case 'papan':
        p.poly(rr(x - 30 * u, y - 56 * u, x + 30 * u, y + 2 * u, 4 * u), '#F7EFD8', 2.6 * u);
        p.poly(rr(x - 24 * u, y - 50 * u, x + 24 * u, y - 4 * u, 2 * u), '#FFFFFF', 0);
        p.garis([[x - 16 * u, y - 38 * u], [x + 16 * u, y - 38 * u]], 2.2 * u, '#C9A45C'); p.garis([[x - 16 * u, y - 28 * u], [x + 10 * u, y - 28 * u]], 2.2 * u, '#A9A2B8'); break;
      case 'cangkir':
        p.poly([[x - 10 * u, y - 16 * u], [x + 10 * u, y - 16 * u], [x + 8 * u, y + 4 * u], [x - 8 * u, y + 4 * u]], '#FFFFFF', 2.2 * u);
        p.busur(x + 11 * u, y - 7 * u, 5 * u, 5 * u, -90, 90, 2.2 * u);
        for (var j = 0; j < 2; j++) { var s = []; for (var k = 0; k < 8; k++) s.push([x - 3 * u + j * 6 * u + Math.sin(k * .9 + j) * 2 * u, y - 20 * u - k * 2.6 * u]); p.garis(s, 1.6 * u, 'rgba(255,255,255,.75)'); }
        break;
      case 'luopan':
        p.ell(x, y - 14 * u, 22 * u, 22 * u, '#C9A45C', 2.6 * u); p.ell(x, y - 14 * u, 16 * u, 16 * u, '#8E1A20', 1.6 * u);
        p.ell(x, y - 14 * u, 9 * u, 9 * u, '#F1DDA8', 1.4 * u); p.garis([[x, y - 22 * u], [x, y - 6 * u]], 1.8 * u, '#A8161D'); break;
      case 'kunci':
        p.ell(x, y - 12 * u, 7 * u, 7 * u, '#F2C94C', 2 * u); p.ell(x, y - 12 * u, 3 * u, 3 * u, '#7A5A1C', 0);
        p.dahan([[x, y - 5 * u], [x, y + 14 * u]], 3 * u, '#F2C94C', 1.8 * u); break;
      case 'kantong':
        p.poly([[x - 16 * u, y - 4 * u], [x + 16 * u, y - 4 * u], [x + 18 * u, y + 28 * u], [x - 18 * u, y + 28 * u]], '#F3E2B8', 2.4 * u);
        p.busur(x, y - 4 * u, 9 * u, 9 * u, 180, 360, 2.2 * u); break;
      case 'kipas': {   // kipas bulu Shifu Po: bulu abu-hitam berlapis, gagang gelap, rumbai merah
        var ka = -PI / 2 - .35;
        for (var fb = 0; fb < 7; fb++) { var af = ka + (fb - 3) * .16, ux = Math.cos(af), uy = Math.sin(af);
          var bl = [[x, y], [x + ux * 30 * u - uy * 6 * u, y + uy * 30 * u + ux * 6 * u], [x + ux * 46 * u, y + uy * 46 * u], [x + ux * 30 * u + uy * 6 * u, y + uy * 30 * u - ux * 6 * u]];
          p.poly(bl, fb % 2 ? '#5E5A66' : '#2E2A34', 1.6 * u); p.garis([[x, y], [x + ux * 44 * u, y + uy * 44 * u]], 1 * u, 'rgba(255,255,255,.45)'); }
        p.dahan([[x, y], [x + 4 * u, y + 16 * u]], 3.4 * u, '#2A1E1C', 1.4 * u);
        p.garis([[x + 4 * u, y + 16 * u], [x + 5 * u, y + 30 * u]], 2.4 * u, '#C4262E'); p.titik(x + 5 * u, y + 31 * u, 3 * u, '#C4262E');
        break;
      }
      case 'bunga':
        p.dahan([[x, y], [x + 2 * u, y - 34 * u]], 2.4 * u, '#4F9A4A', 1.4 * u);
        for (var b = 0; b < 5; b++) { var a = b / 5 * TAU; p.ell(x + 2 * u + Math.cos(a) * 6 * u, y - 38 * u + Math.sin(a) * 6 * u, 5 * u, 5 * u, '#FF8FB1', 1.4 * u); }
        p.titik(x + 2 * u, y - 38 * u, 3.6 * u, '#FFD36A'); break;
    }
  }
  function rr(x0, y0, x1, y1, r) {
    var o = [], c = [[x1 - r, y0 + r, -90], [x1 - r, y1 - r, 0], [x0 + r, y1 - r, 90], [x0 + r, y0 + r, 180]];
    c.forEach(function (k) { for (var i = 0; i <= 6; i++) { var a = rad(k[2] + 90 * i / 6); o.push([k[0] + r * Math.cos(a), k[1] + r * Math.sin(a)]); } });
    return o;
  }

  /* ---------- badan & baju ---------- */
  function detailBaju(p, R, T, tcx, leher, bawah, u, hd, cahaya, t) {
    var j = R.jenisAtasan, ac = R.aksen || '#C9A45C', col = R.atasan;
    var garisLipat = hexA(mul(col, [.55, .55, .65]), .55);
    // lipatan halus di bawah ketiak & pinggang
    p.busur(tcx - T.a * .55, bawah - 30 * u, 14 * u, 22 * u, 200, 260, 1.6 * u, garisLipat);
    p.busur(tcx + T.a * .55, bawah - 30 * u, 14 * u, 22 * u, 280, 340, 1.6 * u, garisLipat);
    if (j === 'kemeja' || j === 'jas') {
      p.garis([[tcx + hd * 2 * u, leher + 6 * u], [tcx + hd * 2 * u, bawah]], 1.8 * u, garisLipat);
      for (var i = 0; i < 4; i++) { var y = leher + 22 * u + i * 20 * u; if (y < bawah - 8 * u) { p.titik(tcx + hd * 2 * u + 4 * u, y, 2.6 * u, INK); p.titik(tcx + hd * 2 * u + 4 * u, y, 1.8 * u, ac); } }
      p.poly(rr(tcx + T.a * .2, leher + 26 * u, tcx + T.a * .62, leher + 48 * u, 2 * u), null, 1.6 * u);
    }
    if (j === 'tangzhuang' && R.motif) {   // motif brokat awan (emas di atas emas / emas di atas merah) atau bunga merah
      var mw = R.warnaMotif || mul(col, [.78, .74, .7]);
      for (var my = leher - 4 * u, baris = 0; my < bawah + 10 * u; my += 26 * u, baris++) for (var mx = tcx - T.a * 1.3 + (baris % 2) * 15 * u; mx < tcx + T.a * 1.3; mx += 30 * u) {
        if (R.motif === 'bunga') { for (var pb = 0; pb < 5; pb++) { var ab = pb / 5 * TAU + baris; p.ell(mx + Math.cos(ab) * 4.6 * u, my + Math.sin(ab) * 4.6 * u, 4.4 * u, 2.6 * u, hexA(mw, .85), 0, 0, 360, ab * 180 / PI); } }
        else { p.busur(mx, my, 5 * u, 4 * u, 180, 360, 1.8 * u, hexA(mw, .9)); p.busur(mx + 7 * u, my + 1 * u, 4 * u, 3.4 * u, 180, 360, 1.8 * u, hexA(mw, .9)); p.busur(mx + 3.5 * u, my + 1.5 * u, 8.5 * u, 3.5 * u, 0, 180, 1.6 * u, hexA(mw, .8)); }
      }
    }
    if (j === 'tangzhuang') {   // baju cina: kancing katak + list emas
      p.garis([[tcx + hd * 2 * u, leher + 4 * u], [tcx + hd * 2 * u, bawah]], 2.4 * u, ac);
      for (var k = 0; k < 4; k++) { var yy = leher + 18 * u + k * 19 * u; if (yy < bawah - 8 * u) { p.garis([[tcx - 9 * u, yy], [tcx + 13 * u, yy]], 3 * u, INK); p.garis([[tcx - 9 * u, yy], [tcx + 13 * u, yy]], 1.8 * u, ac); p.titik(tcx + 2 * u, yy, 3 * u, ac); } }
      p.garis([[tcx - T.a * 1.2, bawah - 6 * u], [tcx + T.a * 1.2, bawah - 6 * u]], 2.2 * u, hexA(ac, .8));
    }
    if (j === 'hoodie') {
      p.poly(rr(tcx - T.a * .55, bawah - 42 * u, tcx + T.a * .55, bawah - 14 * u, 6 * u), mul(col, [.9, .9, .95]), 1.8 * u);
      [-1, 1].forEach(function (s) { p.garis([[tcx + s * 7 * u, leher + 6 * u], [tcx + s * 8 * u, leher + 34 * u]], 1.8 * u, '#FFFFFF'); p.titik(tcx + s * 8 * u, leher + 36 * u, 2.2 * u, '#FFFFFF'); });
    }
    if (j === 'batik') {   // motif kawung sederhana
      for (var by = leher + 10 * u; by < bawah; by += 22 * u) for (var bx = tcx - T.a * 1.1; bx < tcx + T.a * 1.1; bx += 22 * u) {
        var ox = ((by - leher) / 22 / u) % 2 ? 11 * u : 0;
        [0, 1, 2, 3].forEach(function (q) { var a = q * PI / 2 + PI / 4; p.ell(bx + ox + Math.cos(a) * 5 * u, by + Math.sin(a) * 5 * u, 4.4 * u, 2.6 * u, hexA(ac, .65), 0, 0, 360, q * 90 + 45); });
      }
    }
    if (j === 'celemek') {
      var ap = [[tcx - T.a * .62, leher + 20 * u], [tcx + T.a * .62, leher + 20 * u], [tcx + T.a * .78, bawah + 30 * u], [tcx - T.a * .78, bawah + 30 * u]];
      p.isiGradasi(ap, R.aksen || '#FFFFFF', mul(R.aksen || '#FFFFFF', SH_KAIN), cahaya, .35); p.poly(ap, null, 2 * u);
      p.poly(rr(tcx - T.a * .3, leher + 46 * u, tcx + T.a * .3, leher + 70 * u, 3 * u), null, 1.6 * u);
    }
    if (j === 'blus') {
      for (var f = 0; f < 3; f++) p.titik(tcx + hd * 2 * u, leher + 22 * u + f * 16 * u, 2.2 * u, ac);
    }
  }
  function kerah(p, R, tcx, leher, u, hd) {
    var j = R.jenisAtasan, col = R.atasan;
    if (j === 'kemeja' || j === 'jas') {
      [-1, 1].forEach(function (s) { p.poly([[tcx + hd * 2 * u, leher + 8 * u], [tcx + s * 20 * u, leher - 4 * u], [tcx + s * 22 * u, leher + 14 * u]], terang(col, .25), 2.2 * u); });
    } else if (j === 'tangzhuang') {
      p.poly(rr(tcx - 18 * u, leher - 6 * u, tcx + 18 * u, leher + 6 * u, 4 * u), mul(col, [.85, .85, .9]), 2.2 * u);
      p.garis([[tcx - 15 * u, leher + 1 * u], [tcx + 15 * u, leher + 1 * u]], 1.6 * u, R.aksen || '#C9A45C');
    } else if (j === 'hoodie') {
      p.poly(ellPts(tcx, leher + 2 * u, 30 * u, 12 * u, 0, 360, 0), mul(col, [.86, .86, .92]), 2.2 * u);
    } else {
      p.busur(tcx + hd * 2 * u, leher, 15 * u, 9 * u, 15, 165, 2.6 * u);
    }
  }

  /* ---------- tokoh utuh ---------- */
  function gambar(ctx, o) {
    o = o || {};
    var R = Object.assign({}, RUPA_DASAR, o.rupa || {});
    var p = new Pen(ctx), t = o.t || 0, benih = o.benih == null ? 1 : o.benih;
    var Bd = BANGUN[R.bangun] || BANGUN.dewasa, hd = cl(o.hadap || 0, -1, 1);
    var cahaya = o.cahaya == null ? rad(-125) : o.cahaya, tebal = arahTebal(cahaya);
    var pose = poseDariNama(o.pose);
    var duduk = !!pose.duduk, lari = !!pose.lari || !!o.lari;
    var jl = cl(o.jalan != null ? o.jalan : (lari ? 1 : 0), 0, 1);
    var ph = (((o.fase || 0) % 1) + 1) % 1;
    var kd = o.kedip != null ? o.kedip : kedipDari(t, benih);

    ctx.save();
    if (o.cermin) { ctx.translate(600, 0); ctx.scale(-1, 1); cahaya = PI - cahaya; tebal = arahTebal(cahaya); }

    var gemuk = R.bangun === 'gemuk';
    var H = { a: Bd.a * (gemuk ? 1.04 : 1), b: Bd.a * (.93 + .05 * (rnd(benih, 1) - .5)), nTop: 1.9 + .25 * (rnd(benih, 2) - .5), nBot: gemuk ? 2.15 : 2.45 + .2 * (rnd(benih, 3) - .5),
      egg: gemuk ? .05 : -.06 + .04 * (rnd(benih, 4) - .5), asym: .05 * (hd || (rnd(benih, 6) < .5 ? -1 : 1)), rot: rad(5 * (rnd(benih, 7) - .5)), noise: .006, seed: benih };
    var Wk = 2 * H.a, HH = 2 * H.b, u = Wk / 100, ow = 4.4 * u;
    p.ol = ow;
    var sol = 975 - (o.naik || 0);
    /* ---- kerangka (panjang tulang tetap) ---- */
    var Lkaki = Bd.kaki * HH, badanH = Bd.badan * HH;
    var paha = Lkaki * .5, betis = Lkaki * .5;                   // pinggul→pergelangan kaki = Lkaki saat berdiri tegak
    var la1 = badanH * .44, la2 = badanH * .42;                  // lengan atas / lengan bawah
    var tekan = o.tekan || 0;                                     // 0..1 meredam (mendarat, ancang-ancang lompat)
    /* jalan: pinggul paling rendah saat dua kaki menapak (fase 0 & .5), paling tinggi saat kaki melintas;
       berat badan bergeser ke kaki tumpu; badan condong ke arah gerak saat lari */
    var langkah = (lari ? 64 : 40) * u * jl;
    var bob = jl ? (lari ? -7 : 4.5) * u * jl * Math.cos(4 * PI * (ph - (lari ? .12 : 0))) : 0;
    var geser = jl ? (lari ? 2 : 4.5) * u * Math.sin(TAU * ph) * jl : 0;
    var napas = 0;                      // diam = benar-benar diam (tanpa napas/goyang)
    var pinggulX = 300 + geser;
    var pinggul = duduk ? sol - Lkaki * .56 : sol - 8 * u - Lkaki * (.992 - .25 * tekan) + bob + (lari && jl ? 6 * u : 0);
    var leher = pinggul - badanH * (1 - .06 * tekan) + napas, hc = leher - H.b * .86, top = hc - H.b;
    var miring = rad((o.miring || 0) + (lari ? 7 : 2.2) * hd * jl + Math.sin(TAU * ph) * 1.2 * jl);
    var tcx = pinggulX + hd * 3 * u;
    var tengok = rad(o.tengok || 0) + miring * .6;
    var kp = putar([[tcx, leher]], miring, pinggulX, pinggul)[0];
    kp[1] += jl ? (lari ? 3 : 1.6) * u * Math.cos(4 * PI * (ph - .08)) * jl * .4 : 0;   // kepala sedikit telat
    kp[1] += (o.angguk || 0) * 7 * u;   // angguk: kepala turun pelan (dikendalikan pemanggil, mulus)
    var rambutAyun = (o.vx != null ? o.vx : hd * jl) * -6 * u;
    function keKepala() { ctx.save(); ctx.translate(kp[0], kp[1]); ctx.rotate(tengok); ctx.translate(-300, -leher); }
    if (R.gayaRambut !== 'hijab') { keKepala(); rambutBelakang(p, R, H, 300, hc, cahaya, tebal, ow, t, benih, rambutAyun); ctx.restore(); }

    /* ---- kaki: IK dua ruas, telapak diam di tanah selama fase tumpu ---- */
    var rok = /rok|sarung/.test(R.jenisBawahan), kakiW = 12 * u;
    var warnaKaki = R.jenisBawahan === 'celana' ? R.bawahan : R.kulit;
    var kakiData = {};
    [-1, 1].forEach(function (s) {
      var pl = (ph + (s > 0 ? .5 : 0)) % 1, f = 0, angkat = 0, jinjit = 0;
      if (jl && !duduk) {
        var tumpu = lari ? .4 : .5;
        if (pl < tumpu) f = lr(1, -1, pl / tumpu) * langkah / 2;
        else { var w = (pl - tumpu) / (1 - tumpu), e = w * w * (3 - 2 * w); f = lr(-1, 1, e) * langkah / 2; angkat = Math.sin(PI * w) * (lari ? 46 : 22) * u * jl; jinjit = Math.sin(PI * Math.min(1, w * 1.6)) * jl; }
      }
      var hip = [pinggulX + s * 14 * u, pinggul];
      var fx = 300 + s * (14 + 2 * (1 - jl)) * u + hd * f * .9, fy = sol - 8 * u - angkat + (1 - Math.abs(hd)) * f * .16;
      var IKk = duduk ? { E: [300 + s * 26 * u, pinggul + 6 * u], H: [300 + s * 24 * u, sol - 8 * u] } : ik2(hip, [fx, fy], paha, betis, hd !== 0 ? hd : s * .25, -.3);
      kakiData[s] = { hip: hip, E: IKk.E, A: IKk.H, jinjit: jinjit };
    });
    function gambarKaki(s) {
      var K = kakiData[s];
      p.dahan(kurva(K.hip, K.E, K.A, 14), kakiW, warnaKaki, 2.4 * u);
      if (R.jenisBawahan === 'celana') p.garis([[K.A[0] - 6 * u, K.A[1] - 4 * u], [K.A[0] + 6 * u, K.A[1] - 4 * u]], 1.6 * u, hexA(mix(R.bawahan, INK, .4), .8));
      var arah = hd !== 0 ? hd : s * .35, panjang = (16 + 6 * Math.abs(hd)) * u, rot = -arah * K.jinjit * .45;
      ctx.save(); ctx.translate(K.A[0], K.A[1] + 4 * u); ctx.rotate(rot);
      var x0 = arah >= 0 ? -9 * u : -panjang, x1 = arah >= 0 ? panjang : 9 * u;
      var spt = rr(x0, -8 * u, x1, 6 * u, 6.5 * u);
      p.isiGradasi(spt, R.sepatu, mul(R.sepatu, [.6, .6, .72]), cahaya, .4); p.poly(spt, null, 2.4 * u);
      p.garis([[x0 + 4 * u, 3 * u], [x1 - 4 * u, 3 * u]], 2.2 * u, hexA(mix(R.sepatu, '#FFFFFF', .5), .6));
      p.garis([[x0 + 5 * u, -4 * u], [x0 + 12 * u, -6 * u]], 2 * u, 'rgba(255,255,255,.35)');
      ctx.restore();
    }
    (hd >= 0 ? [-1, 1] : [1, -1]).forEach(gambarKaki);

    if (rok) {
      var panjangRok = R.jenisBawahan === 'rok' ? Lkaki * .42 : Lkaki * .9;
      var ay0 = jl ? Math.sin(TAU * ph) * 4 * u * jl : 0;
      var rk = [[tcx - Bd.lebar * Wk * .38, pinggul - 12 * u], [tcx + Bd.lebar * Wk * .38, pinggul - 12 * u],
        [tcx + Bd.lebar * Wk * .5 + ay0 - hd * 4 * u * jl, pinggul + panjangRok], [tcx + ay0 * .3, pinggul + panjangRok + 3 * u], [tcx - Bd.lebar * Wk * .5 + ay0 - hd * 4 * u * jl, pinggul + panjangRok]];
      p.isiGradasi(rk, R.bawahan, mul(R.bawahan, SH_KAIN), cahaya, .42);
      p.klip(rk, function () {
        for (var i = -2; i <= 2; i++) p.garis([[tcx + i * 14 * u, pinggul], [tcx + i * 19 * u + ay0, pinggul + panjangRok]], 1.6 * u, hexA(mul(R.bawahan, [.6, .6, .7]), .55));
        if (R.jenisBawahan === 'sarung') for (var k = 0; k < 7; k++) p.garis([[tcx - 80 * u, pinggul + k * 16 * u], [tcx + 80 * u, pinggul + k * 16 * u]], 2.6 * u, hexA(R.aksen, .55));
      });
      p.poly(rk, null, ow * .9);
    }

    /* ---- badan ---- */
    var T = { a: Bd.lebar * Wk * .4 * (1 + .08 * tekan), b: (pinggul - leher) * .54, nTop: 2.9, nBot: 2.6, egg: R.bangun === 'gemuk' ? .2 : .1, asym: .03 * hd, rot: 0, noise: .005, seed: benih + 7 };
    var tcy = pinggul - T.b * .92;
    var tb = putar(blob(tcx, tcy, T), miring, pinggulX, pinggul);
    var bahu = function (s) { return putar([[tcx + s * T.a * .74, leher + 22 * u]], miring, pinggulX, pinggul)[0]; };   // pangkal lengan di dalam badan: bahu padat tanpa celah

    /* ---- lengan: IK dua ruas, ayunan berlawanan kaki & sedikit telat (follow-through) ---- */
    var lengan = [];
    ['L', 'R'].forEach(function (k, i) {
      var s = i ? 1 : -1, P = pose[k], S = bahu(s), Rj = (la1 + la2) * (P.j == null ? .95 : P.j);
      var a = rad(P.a);   // tanpa getar: lambai/bicara = pose diam, gerak hanya lewat poseDari
      var tx = S[0] + s * Math.sin(a) * Rj, ty = S[1] + Math.cos(a) * Rj;
      var santai = P.a < 35 && P.a > -20 && (P.j == null || P.j > .6);
      if (jl && (santai || lari)) {
        var ay = Math.sin(TAU * (ph - .06) + (s > 0 ? PI : 0)) * jl;
        var amp = (lari ? 36 : 30) * u;
        tx += hd * ay * amp; ty -= Math.abs(ay) * amp * .25 + (1 - Math.abs(hd)) * ay * amp * .15;
      }
      var siku = P.s == null ? 1 : P.s;
      var r = ik2(S, [tx, ty], la1, la2, s * siku, siku * .6);
      lengan.push({ s: s, S: S, E: r.E, H: r.H, ar: Math.atan2(r.H[1] - r.E[1], r.H[0] - r.E[0]), P: P, kanan: !!i });
    });
    var lenganPendek = R.jenisAtasan === 'kaos' || R.jenisAtasan === 'blus';
    var warnaLengan = R.luar || R.atasan;
    function gambarLengan(L) {
      var atas = kurva(L.S, lr2(L.S, L.E, .5), L.E, 6), bawah = kurva(L.E, lr2(L.E, L.H, .5), L.H, 6);
      var semua = atas.concat(bawah.slice(1)), potong = Math.floor(atas.length * .6);
      p.garis(semua, 13 * u + 4.6 * u, INK);
      p.garis(bawah, 10.5 * u, lenganPendek && !R.luar ? R.kulit : warnaLengan);
      if (lenganPendek && !R.luar) { p.garis(atas.slice(potong - 1), 10.5 * u, R.kulit); p.garis(atas.slice(0, potong + 1), 13.5 * u, warnaLengan); }
      else { p.garis(atas, 13 * u, warnaLengan); p.garis(bawah, 12 * u, warnaLengan); }
      var off = [-Math.cos(cahaya) * 3.6 * u, -Math.sin(cahaya) * 3.6 * u];
      var kain = lenganPendek && !R.luar ? atas.slice(0, potong + 1) : semua;
      p.garis(kain.map(function (q) { return [q[0] + off[0], q[1] + off[1]]; }), 4 * u, hexA(mul(warnaLengan, SH_KAIN), .9));
      var ujung = lenganPendek && !R.luar ? atas[potong] : bawah[bawah.length - 2], arah = lenganPendek && !R.luar ? Math.atan2(L.E[1] - L.S[1], L.E[0] - L.S[0]) : L.ar;
      var nx = Math.cos(arah + PI / 2) * 7.4 * u, ny = Math.sin(arah + PI / 2) * 7.4 * u;
      p.garis([[ujung[0] + nx, ujung[1] + ny], [ujung[0] - nx, ujung[1] - ny]], 2.4 * u, INK);
      tangan(p, L.H, L.ar, L.P.b || 'bulat', R.kulit, u);
      if (L.kanan && o.pegang) barang(p, o.pegang, L.H, u, t);
    }
    var jauh = hd >= 0 ? 0 : 1;
    [lengan[jauh], lengan[1 - jauh]].forEach(function (L) { if (!L.P.d) gambarLengan(L); });

    p.isiGradasi(tb, R.atasan, mul(R.atasan, SH_KAIN), cahaya, .5);
    p.klip(tb, function () {
      detailBaju(p, R, T, tcx, leher, pinggul, u, hd, cahaya, t);
      if (R.luar) {
        [-1, 1].forEach(function (s) {
          var pn = [[tcx + s * 12 * u, leher - 10 * u], [tcx + s * T.a * 1.3, leher - 10 * u], [tcx + s * T.a * 1.3, pinggul + 20 * u], [tcx + s * 16 * u, pinggul + 20 * u]];
          p.isiGradasi(pn, R.luar, mul(R.luar, SH_KAIN), cahaya, .5); p.poly(pn, null, 2.4 * u);
        });
      }
      if (R.jenisBawahan === 'celana' && !rok) p.garis([[tcx - T.a * 1.2, pinggul - 5 * u], [tcx + T.a * 1.2, pinggul - 5 * u]], 5 * u, mix(R.bawahan, INK, .3));
      var kx = Math.cos(cahaya) < 0 ? -1 : 1;
      p.busur(tcx - kx * T.a * .08, tcy - T.b * .05, T.a * .9, T.b * .86, kx < 0 ? 150 : -30, kx < 0 ? 215 : 35, 3.2 * u, hexA('#FFFFFF', .32));
    });
    p.cincin(tb, ow, tebal);
    kerah(p, R, tcx, leher, u, hd);
    [lengan[jauh], lengan[1 - jauh]].forEach(function (L) { if (L.P.d) gambarLengan(L); });

    /* ---- kepala ---- */
    keKepala();
    if (R.gayaRambut === 'hijab') rambutBelakang(p, R, H, 300, hc, cahaya, tebal, ow, t, benih, rambutAyun);
    if (R.gayaRambut !== 'hijab') p.poly(rr(300 - 12 * u, hc + H.b * .7, 300 + 12 * u, leher + 8 * u, 4 * u), mul(R.kulit, SH_KULIT), 2.2 * u);
    if (R.gayaRambut !== 'hijab') [-1, 1].forEach(function (s) {
      var ex = 300 + s * H.a * .97 - hd * 4 * u, ey = hc + 8 * u;
      p.ell(ex, ey, 9 * u, 12 * u, R.kulit, 2.6 * u);
      p.busur(ex + s * 1 * u, ey, 4 * u, 6 * u, s > 0 ? -60 : 120, s > 0 ? 60 : 240, 1.6 * u, mul(R.kulit, [.8, .6, .6]));
      if (R.anting) p.titik(ex, ey + 13 * u, 3 * u, R.anting);
    });
    var hp = blob(300, hc, H), muka = hp;
    if (R.gayaRambut === 'hijab') muka = blob(300, hc + 6 * u, Object.assign({}, H, { a: H.a * .86, b: H.b * .86 }));
    p.isiSabit(muka, R.kulit, mul(R.kulit, SH_KULIT), cahaya, H.a, .5, 1.04, 1.2);
    p.cincin(muka, ow, tebal);
    if (R.jenggot) {
      var jg = blob(300, hc + H.b * .62, { a: H.a * .5, b: H.b * .42, nTop: 3, nBot: 2, egg: .25, asym: 0, rot: 0, noise: .02, seed: 9 }).filter(function (q) { return q[1] > hc + H.b * .45; });
      p.isiSabit(jg, R.jenggot, mul(R.jenggot, SH_RAMBUT), cahaya, H.a * .5); p.poly(jg, null, ow * .8);
    }
    wajah(p, R, 300, hc, Wk, o, kd);
    rambutDepan(p, R, H, hp, 300, hc, cahaya, tebal, ow, hd);
    topi(p, R, H, 300, hc, cahaya, tebal, ow);
    if (EKS[o.ekspresi] && EKS[o.ekspresi].tanya) { ctx.font = '900 ' + Math.round(40 * u) + 'px system-ui'; ctx.lineWidth = 4 * u; ctx.strokeStyle = INK; ctx.fillStyle = '#FFD36A'; ctx.strokeText('?', 300 + H.a * 1.05, top + 10 * u); ctx.fillText('?', 300 + H.a * 1.05, top + 10 * u); }
    ctx.restore();
    ctx.restore();
    return { kepala: [kp[0], hc], puncak: top, tanganL: lengan[0].H, tanganR: lengan[1].H };
  }
  function lr2(a, b, k) { return [lr(a[0], b[0], k), lr(a[1], b[1], k)]; }


  /* warga acak (NPC): rupa berbeda tiap benih, warna serasi (palet hangat-tenang) */
  var PAL_BAJU = ['#3F6FB5', '#C4262E', '#2E7D63', '#E2A23A', '#7B5AC9', '#F28C38', '#4FA3A5', '#D96B8C', '#F4F1EA', '#8A5A3C', '#5B6E8C', '#E9D8A6'];
  var PAL_BAWAH = ['#2A2D38', '#3B4256', '#4A3A30', '#5B6E8C', '#1D1A1F', '#6B5B4B', '#EDE3CF'];
  var KULIT = ['#FFDCC0', '#F3CFAE', '#E5B38C', '#D9A27A', '#C98E66'];
  var RAMBUT = ['#1E1614', '#2A1E1C', '#4A2E22', '#5A3426', '#D9D4CC'];
  function rupaAcak(benih, anak) {
    var r = function (k) { return rnd(benih, k); }, pilih = function (a, k) { return a[Math.floor(r(k) * a.length) % a.length]; };
    var perempuan = r(1) < .5, hijab = perempuan && r(2) < .45, tua = !anak && r(3) < .15;
    var gaya = hijab ? 'hijab' : perempuan ? pilih(['bob', 'panjang', 'kuncir', 'sanggul', 'ikal'], 4) : pilih(['rapi', 'cepak', 'jabrik', 'rapi'], 4);
    if (tua && !hijab) gaya = perempuan ? 'sanggul' : (r(5) < .5 ? 'uban' : 'botak');
    return {
      kulit: pilih(KULIT, 6), rambut: tua ? '#D9D4CC' : pilih(RAMBUT.slice(0, 4), 7), gayaRambut: gaya,
      hijab: pilih(['#D98C9C', '#7E9BCB', '#C9A45C', '#5E8C6A', '#E8DCC8', '#8C5E7A'], 8),
      atasan: pilih(PAL_BAJU, 9), jenisAtasan: pilih(perempuan ? ['blus', 'kaos', 'batik', 'blus'] : ['kaos', 'kemeja', 'batik', 'hoodie', 'kaos'], 10),
      luar: r(11) < .2 ? pilih(PAL_BAJU, 12) : null, aksen: pilih(['#E2C06E', '#FFFFFF', '#C4262E', '#2A2430'], 13),
      bawahan: pilih(PAL_BAWAH, 14), jenisBawahan: perempuan ? pilih(['rokPanjang', 'celana', 'rok'], 15) : 'celana',
      sepatu: pilih(['#3A2A26', '#F4F1EA', '#2A2430', '#7A2A2A'], 16), kacamata: r(17) < .15 ? '#3A2A26' : null,
      kumis: !perempuan && !anak && r(18) < .15 ? '#2A1E1C' : null, topi: !hijab && r(19) < .1 ? 'topi' : (tua && !perempuan && r(20) < .4 ? 'peci' : null),
      warnaTopi: pilih(PAL_BAJU, 21), bangun: anak ? 'anak' : tua ? 'lansia' : (r(22) < .15 ? 'gemuk' : 'dewasa')
    };
  }
  function pilihBarang(r) { var a = ['hp', 'kantong', 'cangkir', 'bunga', 'kertas']; return a[Math.floor(r() * a.length) % a.length]; }

  /* ---------- helper waktu ---------- */
  function kedipDari(t, b) { var per = 3.2 + (b % 4) * .45, f = (t + b * 1.37) % per; return f < .16 ? Math.sin(f / .16 * PI) : 0; }
  /* buka mulut dari daftar kata [{t0,t1}] (KATA dari mf.py kata) dalam rentang [a,b] */
  function bicaraDari(t, kata, a, b) {
    if (!kata) return 0; a = a == null ? -1e9 : a; b = b == null ? 1e9 : b;
    for (var i = 0; i < kata.length; i++) { var k = kata[i]; if (t >= k.t0 && t <= k.t1 && t >= a && t <= b) { var x = (t - k.t0) / Math.max(.08, k.t1 - k.t0); return .35 + .55 * Math.abs(Math.sin(x * PI * Math.max(1, Math.round((k.t1 - k.t0) / .14)))); } }
    return 0;
  }

  /* lip-sync: dari kata VO → {bicara 0..1, vokal 'a'|'i'|'e'|'o'|'u'|'m', alisNaik 0..1}
     Suku kata = kelompok vokal dalam kata; bibir membuka di tengah suku kata, rapat di konsonan m/b/p.
     Alis naik pelan di kata panjang/kunci & akhir pertanyaan. a,b = rentang detik milik tokoh ini. */
  function lipsync(t, kata, a, b) {
    var out = { bicara: 0, vokal: 'a', alisNaik: 0 };
    if (!kata) return out; a = a == null ? -1e9 : a; b = b == null ? 1e9 : b;
    for (var i = 0; i < kata.length; i++) {
      var k = kata[i]; if (k.t0 < a || k.t0 > b) continue;
      var tanya = /[?!]$/.test(k.w), panjang = k.w.replace(/[^\p{L}]/gu, '').length >= 8;
      if ((tanya || panjang) && t > k.t0 - .15 && t < k.t1 + .35) out.alisNaik = Math.max(out.alisNaik, Math.sin(cl((t - k.t0 + .15) / (k.t1 - k.t0 + .5), 0, 1) * PI));
      if (t < k.t0 || t > k.t1) continue;
      var w = k.w.toLowerCase().replace(/[^a-z]/g, '') || 'a', suku = w.match(/[aiueo]+|[^aiueo]+/g) || ['a'];
      var vok = suku.filter(function (x) { return /[aiueo]/.test(x); }); if (!vok.length) vok = ['a'];
      var x = (t - k.t0) / Math.max(.06, k.t1 - k.t0), n = vok.length, j = Math.min(n - 1, Math.floor(x * n)), f = x * n - j;
      var v = vok[j].slice(-1), sebelum = (w.split(vok[j])[0] || '').slice(-1);
      out.vokal = (f < .28 && /[mbp]/.test(sebelum)) ? 'm' : v;
      out.bicara = .3 + .6 * Math.sin(Math.min(1, f * 1.15) * PI);
      return out;
    }
    return out;
  }

  var RUPA_CONTOH = {
    koPopo:      { kulit: '#F1C9A5', pipi: '#FF8F8F', rambut: '#16110F', gayaRambut: 'spike', atasan: '#B3202A', jenisAtasan: 'tangzhuang', motif: 'awan', warnaMotif: '#E2B85A', aksen: '#F1D38A', bawahan: '#141216', sepatu: '#1E1A1C', bangun: 'gemuk' },
    koPopoMerah: { kulit: '#F1C9A5', pipi: '#FF8F8F', rambut: '#16110F', gayaRambut: 'spike', atasan: '#B3202A', jenisAtasan: 'tangzhuang', motif: 'awan', warnaMotif: '#E2B85A', aksen: '#F1D38A', bawahan: '#141216', sepatu: '#1E1A1C', bangun: 'gemuk' },
    koPopoEmas:  { kulit: '#F1C9A5', pipi: '#FF8F8F', rambut: '#16110F', gayaRambut: 'spike', atasan: '#EBB43A', jenisAtasan: 'tangzhuang', motif: 'awan', warnaMotif: '#C98A1E', aksen: '#9C6A12', bawahan: '#141216', sepatu: '#1E1A1C', bangun: 'gemuk' },
    cindy:   { kulit: '#FFDDC6', rambut: '#1E1614', gayaRambut: 'bob', atasan: '#FBF6EE', jenisAtasan: 'blus', luar: '#C4262E', aksen: '#E2C06E', bawahan: '#34384A', jenisBawahan: 'rok', sepatu: '#7A2A2A', anting: '#E2C06E' },
    sherlyn: { kulit: '#F7D3B6', rambut: '#5A3426', gayaRambut: 'panjang', atasan: '#F4E8D2', jenisAtasan: 'blus', luar: '#2E7D63', aksen: '#A8161D', bawahan: '#EDE3CF', jenisBawahan: 'rokPanjang', sepatu: '#5A3A2A' },
    pakRT:   { kulit: '#E5B38C', rambut: '#D9D4CC', gayaRambut: 'uban', atasan: '#7A4A2A', jenisAtasan: 'batik', aksen: '#F0C66A', bawahan: '#2A2D38', topi: 'peci', warnaTopi: '#1A1A1E', kumis: '#D9D4CC', bangun: 'lansia', kacamata: '#5A4632' },
    ibu:     { kulit: '#F0C8A6', gayaRambut: 'hijab', hijab: '#D98C9C', atasan: '#7E9BCB', jenisAtasan: 'blus', aksen: '#FFFFFF', bawahan: '#4A4F6A', jenisBawahan: 'rokPanjang' },
    anak:    { kulit: '#FFDCC0', rambut: '#2A1E1C', gayaRambut: 'jabrik', atasan: '#F28C38', jenisAtasan: 'kaos', bawahan: '#3B5B9A', sepatu: '#F4F1EA', bangun: 'anak' },
    koki:    { kulit: '#F3CFAE', rambut: '#2A1E1C', gayaRambut: 'cepak', atasan: '#FFFFFF', jenisAtasan: 'celemek', aksen: '#3F6FB5', bawahan: '#2A2D38', topi: 'koki', bangun: 'gemuk' }
  };

  /* Ko Popo (Shifu Po versi toon): badan gemuk, rambut pendek berdiri, tangzhuang brokat, kipas bulu.
     Selang-seling per video: 'merah' / 'emas' (catat di gaya.md). */
  function koPopo(varian) { return Object.assign({}, varian === 'emas' ? RUPA_CONTOH.koPopoEmas : RUPA_CONTOH.koPopoMerah); }
  G.TOKOH_TOON = { koPopo: koPopo, gambar: gambar, rupaAcak: rupaAcak, pilihBarang: pilihBarang, POSE: POSE, campurPose: campurPose, poseDari: poseDari, ekspresiDari: ekspresiDari, faseDariJarak: faseDariJarak, EKSPRESI: EKS, RUPA_DASAR: RUPA_DASAR, RUPA_CONTOH: RUPA_CONTOH,
    kedipDari: kedipDari, bicaraDari: bicaraDari, lipsync: lipsync, INK: INK, warna: { mul: mul, mix: mix, terang: terang } };
})(typeof window !== 'undefined' ? window : this);
