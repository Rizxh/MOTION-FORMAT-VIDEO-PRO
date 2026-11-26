/* ============================================================================
   toon-dunia.js · kit dunia 3D "toon" untuk Motion Format (three.js r128)
   Tampilan: bahan toon dua nada (sisi terang hangat, sisi bayangan ungu-biru, bukan abu),
   tekstur dilukis di kanvas (plester, genteng, bata, kayu, rumput, aspal, paving, daun),
   garis tinta dari kedalaman + normal (pasca-proses), langit gradasi + matahari + awan lukis,
   kabut atmosfer, bloom lampu, fokus kamera (DOF), color grade, vinyet, butiran.

   Muat three r128 di @HEAD, lalu <!--@MESIN toon-tokoh.js toon-dunia.js-->.

   const D = TOON3D.mulai({ el:$('#dunia'), langit:'sore', ss:1.5 });
   D.scene · D.cam · D.ren · D.atur({langit, matahari:{az,el}, fokus, dof, bloom, tinta, kabut, grade})
   D.render(t)                    ← panggil di akhir SCENE.frame(t)
   Aset (semua mengembalikan THREE.Group, origin di tanah, satuan meter, muka menghadap +z):
     D.tanah({lebar,dalam,jenis:'rumput'|'paving'|'tanah'})   D.jalan({panjang,lebar,marka,trotoar})
     D.rumah({...})   D.pohon({...})   D.semak({...})   D.rumpun({lebar,dalam,n})   D.pot({...})
     D.tiang({...})   D.kabel(a,b,lendut)   D.lampion({...})   D.mobil({...})   D.motor({...})
     D.papan({lebar,tinggi,gambar(ctx,w,h)})   D.bangku()   D.bukit({...})   D.awan({...})
   Tokoh: const K = D.tokoh({tinggi:1.55, res:1.6}); di frame: K.atur(x,z,{...opsi TOKOH_TOON}, y)
   Label 3D ke layar: D.layar(x,y,z) → [sx, sy]
   ========================================================================== */
(function (G) {
  'use strict';
  var T = G.THREE;
  if (!T) { console.error('toon-dunia.js: muat three.js r128 dulu'); return; }
  var PI = Math.PI, TAU = PI * 2;
  var lin = function (c) { return new T.Color(c).convertSRGBToLinear(); };
  var cl = function (x, a, b) { return Math.max(a, Math.min(b, x)); };
  var lr = function (a, b, k) { return a + (b - a) * k; };
  function rng(seed) { var s = (seed * 9301 + 49297) % 233280 || 1; return function () { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; }; }
  var pilih = function (r, a) { return a[Math.floor(r() * a.length) % a.length]; };
  function jit(r, hex, dv, dh, ds) {
    var c = new T.Color(hex), h = {}; c.getHSL(h); dv = dv == null ? .08 : dv; dh = dh == null ? 4 : dh; ds = ds == null ? .12 : ds;
    var k = function (a) { return 1 + (r() * 2 - 1) * a; };
    c.setHSL((h.h + (r() * 2 - 1) * dh / 360 + 1) % 1, Math.min(1, h.s * k(ds)), Math.min(.97, h.l * k(dv)));
    return '#' + c.getHexString();
  }
  function gelap(hex, k) { var c = new T.Color(hex); c.multiplyScalar(k); return '#' + c.getHexString(); }
  function campur(a, b, k) { var c = new T.Color(a); c.lerp(new T.Color(b), k); return '#' + c.getHexString(); }

  /* ================= TEKSTUR LUKIS ================= */
  var CACHE = {};
  function ctex(key, w, h, draw, ulang) {
    if (CACHE[key]) return CACHE[key];
    var cv = document.createElement('canvas'); cv.width = w; cv.height = h;
    var g = cv.getContext('2d'), r = rng(hashStr(key));
    draw(g, r, w, h);
    var t = new T.CanvasTexture(cv); t.encoding = T.sRGBEncoding; t.anisotropy = 8;
    if (ulang !== false) t.wrapS = t.wrapT = T.RepeatWrapping;
    CACHE[key] = t; return t;
  }
  function hashStr(s) { var h = 7; for (var i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) % 100003; return h + 1; }
  function ulang(t, x, y) { var c = t.clone(); c.repeat.set(x, y); c.needsUpdate = true; return c; }
  function noda(g, r, w, h, n, warna, rmin, rmax, alpha) {   // bercak cat lembut
    for (var i = 0; i < n; i++) {
      var x = r() * w, y = r() * h, rr = lr(rmin, rmax, r());
      var gr = g.createRadialGradient(x, y, 0, x, y, rr); var c = pilih(r, warna);
      gr.addColorStop(0, rgba(c, alpha)); gr.addColorStop(1, rgba(c, 0));
      g.fillStyle = gr; g.fillRect(x - rr, y - rr, rr * 2, rr * 2);
      // bungkus tepi supaya tekstur menyambung
      if (x < rr) { g.save(); g.translate(w, 0); g.fillRect(x - rr, y - rr, rr * 2, rr * 2); g.restore(); }
      if (y < rr) { g.save(); g.translate(0, h); g.fillRect(x - rr, y - rr, rr * 2, rr * 2); g.restore(); }
    }
  }
  function rgba(hex, a) { var c = new T.Color(hex); return 'rgba(' + Math.round(c.r * 255) + ',' + Math.round(c.g * 255) + ',' + Math.round(c.b * 255) + ',' + a + ')'; }

  var TEX = {
    plester: function (warna) {
      return ctex('plester' + warna, 512, 512, function (g, r, w, h) {
        g.fillStyle = warna; g.fillRect(0, 0, w, h);
        noda(g, r, w, h, 60, [gelap(warna, .9), campur(warna, '#FFFFFF', .25), gelap(warna, .95)], 30, 110, .35);
        for (var i = 0; i < 1800; i++) { g.fillStyle = r() < .5 ? 'rgba(255,255,255,.08)' : 'rgba(60,40,40,.06)'; g.fillRect(r() * w, r() * h, 2, 2); }
        g.strokeStyle = rgba(gelap(warna, .75), .25); g.lineWidth = 1.2;   // retak rambut halus
        for (var j = 0; j < 5; j++) { var x = r() * w, y = r() * h; g.beginPath(); g.moveTo(x, y); for (var k = 0; k < 4; k++) { x += (r() - .5) * 30; y += r() * 22; g.lineTo(x, y); } g.stroke(); }
        var gb = g.createLinearGradient(0, h * .82, 0, h); gb.addColorStop(0, 'rgba(70,50,60,0)'); gb.addColorStop(1, 'rgba(70,50,60,.12)'); g.fillStyle = gb; g.fillRect(0, 0, w, h);
      });
    },
    genteng: function (warna) {
      return ctex('genteng' + warna, 512, 512, function (g, r, w, h) {
        g.fillStyle = gelap(warna, .55); g.fillRect(0, 0, w, h);
        var bar = 8, kol = 8, th = h / bar, tw = w / kol;
        for (var y = 0; y < bar; y++) for (var x = -1; x <= kol; x++) {
          var ox = (y % 2) * tw / 2, cx = x * tw + ox, c = jit(r, warna, .1, 5, .12);
          var gr = g.createLinearGradient(0, y * th, 0, y * th + th);
          gr.addColorStop(0, campur(c, '#FFFFFF', .18)); gr.addColorStop(.6, c); gr.addColorStop(1, gelap(c, .78));
          g.fillStyle = gr; g.beginPath();
          g.moveTo(cx + 3, y * th); g.lineTo(cx + tw - 3, y * th); g.lineTo(cx + tw - 3, y * th + th * .72);
          g.quadraticCurveTo(cx + tw / 2, y * th + th * 1.08, cx + 3, y * th + th * .72); g.closePath(); g.fill();
          g.strokeStyle = 'rgba(40,20,25,.55)'; g.lineWidth = 2.4; g.stroke();
          g.strokeStyle = 'rgba(255,255,255,.22)'; g.lineWidth = 3; g.beginPath(); g.moveTo(cx + tw * .25, y * th + 6); g.lineTo(cx + tw * .25, y * th + th * .55); g.stroke();
          if (r() < .12) { g.fillStyle = 'rgba(70,90,50,.25)'; g.beginPath(); g.arc(cx + tw * r(), y * th + th * .6, 6 + r() * 8, 0, TAU); g.fill(); }
        }
      });
    },
    bata: function (warna) {
      return ctex('bata' + warna, 512, 512, function (g, r, w, h) {
        g.fillStyle = '#D9CDBF'; g.fillRect(0, 0, w, h);
        var bh = 32, bw = 96;
        for (var y = 0; y < h / bh; y++) for (var x = -1; x < w / bw + 1; x++) {
          var ox = (y % 2) * bw / 2, c = jit(r, warna, .12, 6, .15);
          g.fillStyle = c; g.fillRect(x * bw + ox + 3, y * bh + 3, bw - 6, bh - 6);
          g.fillStyle = 'rgba(255,255,255,.16)'; g.fillRect(x * bw + ox + 3, y * bh + 3, bw - 6, 5);
          g.fillStyle = 'rgba(40,20,20,.18)'; g.fillRect(x * bw + ox + 3, y * bh + bh - 9, bw - 6, 6);
        }
      });
    },
    kayu: function (warna) {
      return ctex('kayu' + warna, 512, 512, function (g, r, w, h) {
        g.fillStyle = warna; g.fillRect(0, 0, w, h);
        for (var i = 0; i < 8; i++) { var x = i * w / 8; g.fillStyle = jit(r, warna, .07, 3, .1); g.fillRect(x + 2, 0, w / 8 - 4, h); g.fillStyle = 'rgba(30,15,10,.35)'; g.fillRect(x, 0, 3, h); }
        g.strokeStyle = rgba(gelap(warna, .7), .35); g.lineWidth = 2;
        for (var j = 0; j < 40; j++) { var xx = r() * w, yy = r() * h; g.beginPath(); g.moveTo(xx, yy); g.bezierCurveTo(xx + 6, yy + 40, xx - 6, yy + 80, xx + 2, yy + 120); g.stroke(); }
      });
    },
    rumput: function (warna) {
      warna = warna || '#7DBB55';
      return ctex('rumput' + warna, 512, 512, function (g, r, w, h) {
        g.fillStyle = warna; g.fillRect(0, 0, w, h);
        noda(g, r, w, h, 70, [gelap(warna, .82), campur(warna, '#E8F59A', .3), gelap(warna, .9)], 30, 90, .45);
        g.lineCap = 'round';
        for (var i = 0; i < 3200; i++) {
          var x = r() * w, y = r() * h, l = 5 + r() * 9;
          g.strokeStyle = pilih(r, [gelap(warna, .78), campur(warna, '#F2FFB0', .3), gelap(warna, .9), campur(warna, '#FFFFFF', .15)]); g.lineWidth = 2;
          g.beginPath(); g.moveTo(x, y); g.lineTo(x + (r() - .5) * 5, y - l); g.stroke();
        }
        for (var k = 0; k < 40; k++) { g.fillStyle = pilih(r, ['#FFF7D0', '#FFE066', '#FFB3C8', '#FFFFFF']); g.beginPath(); g.arc(r() * w, r() * h, 2.6, 0, TAU); g.fill(); }
      });
    },
    tanah: function () {
      return ctex('tanah', 512, 512, function (g, r, w, h) {
        g.fillStyle = '#C9A77E'; g.fillRect(0, 0, w, h);
        noda(g, r, w, h, 60, ['#B08B62', '#D9BC93', '#A8835B'], 20, 80, .5);
        for (var i = 0; i < 400; i++) { g.fillStyle = pilih(r, ['#8F7050', '#E2CDA9', '#9E8060']); g.beginPath(); g.ellipse(r() * w, r() * h, 2 + r() * 4, 1.5 + r() * 3, r() * 3, 0, TAU); g.fill(); }
      });
    },
    aspal: function () {
      return ctex('aspal', 512, 512, function (g, r, w, h) {
        g.fillStyle = '#6E6F7E'; g.fillRect(0, 0, w, h);
        noda(g, r, w, h, 50, ['#5E5F6E', '#7E7F8E', '#666776'], 30, 120, .5);
        for (var i = 0; i < 6000; i++) { g.fillStyle = pilih(r, ['rgba(255,255,255,.12)', 'rgba(0,0,0,.14)', 'rgba(200,190,210,.1)']); g.fillRect(r() * w, r() * h, 2, 2); }
        g.strokeStyle = 'rgba(40,38,50,.45)'; g.lineWidth = 2;   // retak & tambalan
        for (var j = 0; j < 3; j++) { var x = r() * w, y = r() * h; g.beginPath(); g.moveTo(x, y); for (var k = 0; k < 6; k++) { x += (r() - .5) * 50; y += (r() - .5) * 50; g.lineTo(x, y); } g.stroke(); }
      });
    },
    paving: function (warna) {
      warna = warna || '#C8B9A6';
      return ctex('paving' + warna, 512, 512, function (g, r, w, h) {
        g.fillStyle = gelap(warna, .62); g.fillRect(0, 0, w, h);
        var s = 64;
        for (var y = 0; y < h / s; y++) for (var x = 0; x < w / s; x++) {
          var c = jit(r, warna, .1, 5, .15), ox = x * s, oy = y * s, ver = (x + y) % 2;
          for (var b = 0; b < 2; b++) {
            g.fillStyle = c;
            if (ver) g.fillRect(ox + 3 + b * s / 2, oy + 3, s / 2 - 6, s - 6); else g.fillRect(ox + 3, oy + 3 + b * s / 2, s - 6, s / 2 - 6);
            c = jit(r, warna, .1, 5, .15);
          }
        }
        noda(g, r, w, h, 25, ['#8F8070', '#FFFFFF'], 30, 80, .12);
      });
    },
    keramik: function (warna) {
      warna = warna || '#E9DFD0';
      return ctex('keramik' + warna, 512, 512, function (g, r, w, h) {
        g.fillStyle = '#B5A795'; g.fillRect(0, 0, w, h);
        var s = 128;
        for (var y = 0; y < 4; y++) for (var x = 0; x < 4; x++) {
          var c = jit(r, warna, .04, 3, .08), gr = g.createLinearGradient(x * s, y * s, x * s + s, y * s + s);
          gr.addColorStop(0, campur(c, '#FFFFFF', .25)); gr.addColorStop(1, c);
          g.fillStyle = gr; g.fillRect(x * s + 3, y * s + 3, s - 6, s - 6);
        }
      });
    },
    daun: function (warna) {
      return ctex('daun' + warna, 512, 512, function (g, r, w, h) {
        g.fillStyle = warna; g.fillRect(0, 0, w, h);
        noda(g, r, w, h, 40, [gelap(warna, .88), campur(warna, '#F4FF9E', .18)], 40, 110, .5);
        for (var i = 0; i < 1400; i++) {
          var x = r() * w, y = r() * h, rr = 4 + r() * 7, c = pilih(r, [gelap(warna, .86), campur(warna, '#F4FF9E', .16), gelap(warna, .93), campur(warna, '#FFFFFF', .08)]);
          g.fillStyle = c; g.beginPath(); g.ellipse(x, y, rr, rr * .55, r() * PI, 0, TAU); g.fill();
        }
      });
    },
    batuAlam: function (warna) {   // lis batu alam (dinding bawah rumah Indonesia)
      warna = warna || '#B9A58C';
      return ctex('batuAlam' + warna, 512, 256, function (g, r, w, h) {
        g.fillStyle = gelap(warna, .55); g.fillRect(0, 0, w, h);
        var y = 0;
        while (y < h) { var bh = 22 + r() * 26, x = -r() * 40; while (x < w) { var bw = 40 + r() * 70, c = jit(r, warna, .14, 8, .2);
          g.fillStyle = c; g.beginPath(); g.roundRect ? g.roundRect(x + 3, y + 3, bw - 6, bh - 6, 6) : g.rect(x + 3, y + 3, bw - 6, bh - 6); g.fill();
          g.fillStyle = 'rgba(255,255,255,.14)'; g.fillRect(x + 6, y + 5, bw - 14, 4); x += bw; } y += bh; }
      });
    },
    beton: function () {
      return ctex('beton', 256, 256, function (g, r, w, h) {
        g.fillStyle = '#B9B6BF'; g.fillRect(0, 0, w, h);
        noda(g, r, w, h, 30, ['#A5A2AE', '#CFCCD6'], 20, 60, .5);
        for (var i = 0; i < 900; i++) { g.fillStyle = r() < .5 ? 'rgba(0,0,0,.1)' : 'rgba(255,255,255,.12)'; g.fillRect(r() * w, r() * h, 2, 2); }
      });
    },
    kerb: function () {   // trotoar dicat hitam-putih ala Indonesia
      return ctex('kerb', 512, 64, function (g, r, w, h) {
        for (var i = 0; i < 8; i++) { g.fillStyle = i % 2 ? '#2F2F38' : '#ECE8E0'; g.fillRect(i * 64, 0, 64, h); }
        for (var j = 0; j < 400; j++) { g.fillStyle = r() < .5 ? 'rgba(0,0,0,.12)' : 'rgba(255,255,255,.1)'; g.fillRect(r() * w, r() * h, 2, 2); }
        g.fillStyle = 'rgba(0,0,0,.15)'; g.fillRect(0, h - 10, w, 10);
      });
    },
    bulat: function () {   // bayangan kontak / pendar
      return ctex('bulat', 128, 128, function (g) {
        var gr = g.createRadialGradient(64, 64, 0, 64, 64, 64); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(.5, 'rgba(255,255,255,.55)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
        g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
      }, false);
    },
    awan: function (seed, pal) {
      return ctex('awan' + seed + pal.terang, 1024, 512, function (g) {
        var r = rng(seed * 7919 + 17), base = 400, n = 6 + Math.floor(r() * 4), L = [];
        for (var i = 0; i < n; i++) { var t = (i + .5) / n, rd = (60 + 110 * Math.pow(Math.sin(PI * t), .8)) * lr(.75, 1.15, r()); L.push({ x: 150 + t * 724 + lr(-30, 30, r()), y: base - rd * lr(.35, .65, r()), r: rd }); }
        for (var j = 0; j < n / 2; j++) { var tt = lr(.25, .75, r()), rr = lr(60, 110, r()); L.push({ x: 150 + tt * 724, y: base - 150 - rr * lr(.3, .7, r()), r: rr }); }
        var lap = function (dx, dy, k, c, b) { g.save(); g.filter = 'blur(' + b + 'px)'; g.fillStyle = c; g.beginPath(); L.forEach(function (l) { var x = l.x + dx * l.r, y = l.y + dy * l.r; g.moveTo(x + l.r * k, y); g.arc(x, y, l.r * k, 0, TAU); }); g.fill(); g.restore(); };
        lap(0, 0, 1, pal.bayang, 6); lap(-.04, -.12, .9, pal.tengah, 8); lap(-.1, -.26, .72, pal.terang, 10);
        g.globalCompositeOperation = 'destination-in';
        var m = g.createLinearGradient(0, base - 18, 0, base + 6); m.addColorStop(0, 'rgba(0,0,0,1)'); m.addColorStop(1, 'rgba(0,0,0,0)');
        g.fillStyle = m; g.fillRect(0, 0, 1024, 512); g.globalCompositeOperation = 'source-over';
      }, false);
    }
  };

  /* ================= PRESET CAHAYA ================= */
  // terang/bayang: pengali LINEAR. Bayangan berwarna (ungu-biru), bukan abu-abu: itulah rasa "toon".
  var LANGIT = {
    siang: { az: 35, el: 50, terang: [1.42, 1.34, 1.18], bayang: [.40, .43, .60], hemi: ['#CFE3FF', '#A08C78', .25],
      atas: '#3F7FD8', tengah: '#86B4EC', cakrawala: '#D3E4F5', bawah: '#C9D8E8', kabut: '#CFE0F2', kabutDekat: 30, kabutJauh: 220,
      matahari: '#FFF6E0', tokoh: '#FFFFFF', awan: { terang: '#FFFDF8', tengah: '#E6EAF6', bayang: '#C3CBE9' },
      grade: { kontras: 1.06, sat: 1.12, angkat: [.02, .02, .05], hangat: [1.02, 1.0, .97], vin: .22, vinW: '#3A2E5A' }, bloom: .25, thr: 1.05 },
    sore: { az: 40, el: 12, terang: [1.62, 1.02, .58], bayang: [.34, .30, .56], hemi: ['#FFC9A0', '#6E5878', .25],
      atas: '#5B5A9E', tengah: '#E99A84', cakrawala: '#FFD39A', bawah: '#E7B38F', kabut: '#F2BB92', kabutDekat: 35, kabutJauh: 240,
      matahari: '#FFD9A0', tokoh: '#FFE2C4', awan: { terang: '#FFD7AE', tengah: '#F2A08F', bayang: '#A98FC4' },
      grade: { kontras: 1.08, sat: 1.1, angkat: [.03, .01, .06], hangat: [1.04, .99, .94], vin: .28, vinW: '#3A2350' }, bloom: .4, thr: .95 },
    senja: { az: 30, el: 4, terang: [1.25, .62, .5], bayang: [.24, .22, .46], hemi: ['#FF9C88', '#40305E', .3],
      atas: '#2E2F6E', tengah: '#B4617E', cakrawala: '#FF9C6A', bawah: '#7A4A66', kabut: '#B8708A', kabutDekat: 25, kabutJauh: 180,
      matahari: '#FFB27A', tokoh: '#FFC7B4', awan: { terang: '#FFB08E', tengah: '#C46E8A', bayang: '#5E4C8C' },
      grade: { kontras: 1.08, sat: 1.12, angkat: [.03, .01, .07], hangat: [1.03, .97, 1.0], vin: .32, vinW: '#1E1640' }, bloom: .6, thr: .85 },
    malam: { az: 60, el: 40, terang: [.34, .44, .78], bayang: [.13, .16, .32], hemi: ['#5D77B8', '#1A1E33', .25],
      atas: '#081433', tengah: '#16306A', cakrawala: '#2D4C8A', bawah: '#1A2A50', kabut: '#1D3263', kabutDekat: 18, kabutJauh: 140,
      matahari: '#CFE0FF', tokoh: '#B9C8F2', awan: { terang: '#5E6FA8', tengah: '#3E4C84', bayang: '#26305E' },
      grade: { kontras: 1.1, sat: 1.15, angkat: [.01, .02, .06], hangat: [.96, 1.0, 1.06], vin: .35, vinW: '#050818' }, bloom: 1.0, thr: .7 }
  };

  /* ================= SHADER PASCA-PROSES ================= */
  var VS = 'varying vec2 vUv; void main(){ vUv=uv; gl_Position=vec4(position.xy,0.,1.); }';
  var FS_BLUR = [
    'uniform sampler2D tSrc; uniform vec2 dir; varying vec2 vUv;',
    'void main(){ vec4 c=texture2D(tSrc,vUv)*.227027;',
    ' c+=texture2D(tSrc,vUv+dir*1.3846)*.3162162; c+=texture2D(tSrc,vUv-dir*1.3846)*.3162162;',
    ' c+=texture2D(tSrc,vUv+dir*3.2308)*.0702703; c+=texture2D(tSrc,vUv-dir*3.2308)*.0702703; gl_FragColor=c; }'].join('\n');
  var FS_TURUN = 'uniform sampler2D tSrc; uniform vec2 px; varying vec2 vUv; void main(){ vec4 c=texture2D(tSrc,vUv+px*vec2(-1.,-1.))+texture2D(tSrc,vUv+px*vec2(1.,-1.))+texture2D(tSrc,vUv+px*vec2(-1.,1.))+texture2D(tSrc,vUv+px*vec2(1.,1.)); gl_FragColor=c*.25; }';
  var FS_AKHIR = [
    'uniform sampler2D tCol,tBlur,tBlur2,tNor,tDepN,tDepM; uniform vec2 res; uniform float near,far,waktu;',
    'uniform vec3 tinta; uniform float tintaW,tintaJauh,tintaKuat; uniform float fokus,dof,dofRentang,bloom,thr;',
    'uniform float kontras,sat,vin,grain,expo; uniform vec3 angkat,hangat,vinW;',
    'varying vec2 vUv;',
    'float iz(float d){ return (far-d*(far-near))/(near*far); }',
    'float izN(vec2 uv){ return iz(texture2D(tDepN,uv).r); }',
    'vec3 nr(vec2 uv){ return texture2D(tNor,uv).rgb*2.-1.; }',
    'float hash(vec2 p){ return fract(sin(dot(p,vec2(12.9898,78.233))+waktu*7.)*43758.5453); }',
    'vec3 bahu(vec3 x){ float k=.82; return mix(x, k+(1.-k)*(1.-exp(-(x-k)/(1.-k))), step(k,x)); }',
    'vec3 keSRGB(vec3 c){ c=max(c,0.); return mix(c*12.92, 1.055*pow(c,vec3(1./2.4))-.055, step(.0031308,c)); }',
    'void main(){',
    ' vec2 p=1./res; vec2 q=p*tintaW;',
    ' vec3 col=(texture2D(tCol,vUv+p*vec2(-.25,-.25)).rgb+texture2D(tCol,vUv+p*vec2(.25,-.25)).rgb+texture2D(tCol,vUv+p*vec2(-.25,.25)).rgb+texture2D(tCol,vUv+p*vec2(.25,.25)).rgb)*.25;',
    // DOF
    ' float zM=1./iz(texture2D(tDepM,vUv).r);',
    ' float coc=clamp(abs(zM-fokus)/(fokus*dofRentang),0.,1.)*dof;',
    ' vec3 bl=texture2D(tBlur,vUv).rgb, bl2=texture2D(tBlur2,vUv).rgb;',
    ' col=mix(col, mix(bl,bl2,smoothstep(.5,1.,coc)), smoothstep(0.,.6,coc));',
    // TINTA dari kedalaman + normal (pas tak bertinta: tokoh/kabel/langit)
    ' float c0=izN(vUv), l=izN(vUv-vec2(q.x,0.)), r=izN(vUv+vec2(q.x,0.)), d=izN(vUv-vec2(0.,q.y)), u=izN(vUv+vec2(0.,q.y));',
    ' float lap=abs(l+r+d+u-4.*c0)/max(c0,1e-5);',
    ' float de=smoothstep(.06,.22,lap);',
    ' vec3 n0=nr(vUv); float ne=max(max(1.-dot(n0,nr(vUv-vec2(q.x,0.))),1.-dot(n0,nr(vUv+vec2(q.x,0.)))),max(1.-dot(n0,nr(vUv-vec2(0.,q.y))),1.-dot(n0,nr(vUv+vec2(0.,q.y)))));',
    ' ne=smoothstep(.18,.5,ne)*step(c0*far,.999*far/near);',
    ' float zN=1./max(c0,1e-5); float jauh=1.-smoothstep(tintaJauh*.45,tintaJauh,zN);',
    ' float e=max(de,ne)*jauh*tintaKuat;',
    ' float zMn=zM; e*=step(zN-.05,zMn+0.0);',   // tinta hanya bila objek bertinta yang paling depan
    ' col=mix(col, tinta*(.35+.65*col), e*.88);',
    // BLOOM
    ' vec3 b=max(bl2-thr,0.)+max(bl-thr*1.1,0.)*.5; col+=b*bloom;',
    // nada & grade
    ' col*=expo; col=bahu(col); col*=hangat;',
    ' vec3 s=keSRGB(col);',
    ' s=(s-.5)*kontras+.5; float lu=dot(s,vec3(.299,.587,.114)); s=mix(vec3(lu),s,sat);',
    ' s+=angkat*(1.-s);',
    ' vec2 v=vUv-.5; v.x*=res.x/res.y*.85; float vg=smoothstep(.35,.95,length(v)); s=mix(s, s*vinW*1.2, vg*vin);',
    ' s+=(hash(vUv*res)-.5)*grain;',
    ' gl_FragColor=vec4(clamp(s,0.,1.),1.);',
    '}'].join('\n');

  /* ================= MESIN ================= */
  function mulai(o) {
    o = o || {};
    var Wd = o.W || G.W || 1080, Hd = o.H || G.H || 1920, ss = o.ss || 1.5;
    var ren = new T.WebGLRenderer({ antialias: false, preserveDrawingBuffer: true, powerPreference: 'high-performance' });
    ren.setPixelRatio(1); ren.setSize(Wd, Hd);
    ren.outputEncoding = T.LinearEncoding; ren.toneMapping = T.NoToneMapping;
    ren.shadowMap.enabled = true; ren.shadowMap.type = T.PCFSoftShadowMap; ren.shadowMap.autoUpdate = false;
    (o.el || document.body).appendChild(ren.domElement);
    ren.domElement.style.cssText = 'position:absolute;left:0;top:0;width:' + Wd + 'px;height:' + Hd + 'px';

    var scene = new T.Scene();
    var cam = new T.PerspectiveCamera(o.fov || 38, Wd / Hd, .1, 600);
    cam.position.set(0, 4, 14); cam.lookAt(0, 1, 0);
    var amb = new T.AmbientLight(0xffffff, 1); scene.add(amb);
    var hemi = new T.HemisphereLight(0xffffff, 0x000000, .2); scene.add(hemi);
    var sun = new T.DirectionalLight(0xffffff, 1); sun.castShadow = true;
    sun.shadow.mapSize.set(o.bayangan || 2048, o.bayangan || 2048); sun.shadow.bias = -.0004; sun.shadow.normalBias = .03; sun.shadow.radius = 3;
    var sc = sun.shadow.camera; sc.near = 1; sc.far = 160; sc.left = sc.bottom = -30; sc.right = sc.top = 30;
    sun.shadow.camera.layers.enableAll();
    scene.add(sun); scene.add(sun.target);

    // langit kubah
    var langitMat = new T.ShaderMaterial({
      uniforms: { atas: { value: new T.Color() }, tengah: { value: new T.Color() }, cak: { value: new T.Color() }, bawah: { value: new T.Color() }, sunDir: { value: new T.Vector3(0, 1, 0) }, sunCol: { value: new T.Color() }, sunK: { value: 1 } },
      vertexShader: 'varying vec3 vD; void main(){ vD=normalize(position); gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }',
      fragmentShader: ['uniform vec3 atas,tengah,cak,bawah,sunDir,sunCol; uniform float sunK; varying vec3 vD;',
        'void main(){ float h=vD.y; vec3 c=h<0.?mix(cak,bawah,smoothstep(0.,-.12,h)):mix(mix(cak,tengah,smoothstep(0.,.16,h)),atas,smoothstep(.12,.7,h));',
        ' float s=max(dot(normalize(vD),normalize(sunDir)),0.); c+=sunCol*(pow(s,18.)*.45+pow(s,500.)*2.2+pow(s,4.)*.12)*sunK;',
        ' gl_FragColor=vec4(c,1.); }'].join('\n'),
      side: T.BackSide, depthWrite: false, fog: false
    });
    var langit = new T.Mesh(new T.SphereGeometry(520, 32, 16), langitMat); langit.layers.set(2); langit.frustumCulled = false; scene.add(langit);
    scene.fog = new T.Fog(0xffffff, 30, 220);

    // target render
    var rw = Math.round(Wd * ss), rh = Math.round(Hd * ss);
    function rt(w, h, dep, half) {
      var r = new T.WebGLRenderTarget(w, h, { type: half ? T.HalfFloatType : T.UnsignedByteType, minFilter: T.LinearFilter, magFilter: T.LinearFilter, format: T.RGBAFormat });
      if (dep) { r.depthTexture = new T.DepthTexture(w, h); r.depthTexture.type = T.UnsignedIntType; r.depthBuffer = true; }
      return r;
    }
    var rtM = rt(rw, rh, true, true), rtN = rt(rw, rh, true, false);
    var bw = Math.round(Wd / 3), bh = Math.round(Hd / 3), rtA = rt(bw, bh, false, true), rtB = rt(bw, bh, false, true);
    var cw = Math.round(Wd / 8), ch = Math.round(Hd / 8), rtC = rt(cw, ch, false, true), rtD = rt(cw, ch, false, true);
    var layar = new T.Scene(), ocam = new T.OrthographicCamera(-1, 1, 1, -1, 0, 1), quad = new T.Mesh(new T.PlaneGeometry(2, 2)); layar.add(quad);
    var mTurun = new T.ShaderMaterial({ uniforms: { tSrc: { value: null }, px: { value: new T.Vector2() } }, vertexShader: VS, fragmentShader: FS_TURUN, depthTest: false, depthWrite: false });
    var mBlur = new T.ShaderMaterial({ uniforms: { tSrc: { value: null }, dir: { value: new T.Vector2() } }, vertexShader: VS, fragmentShader: FS_BLUR, depthTest: false, depthWrite: false });
    var U = {
      tCol: { value: rtM.texture }, tBlur: { value: rtA.texture }, tBlur2: { value: rtC.texture }, tNor: { value: rtN.texture }, tDepN: { value: rtN.depthTexture }, tDepM: { value: rtM.depthTexture },
      res: { value: new T.Vector2(Wd, Hd) }, near: { value: cam.near }, far: { value: cam.far }, waktu: { value: 0 },
      tinta: { value: lin('#2B1A2C') }, tintaW: { value: 1.25 }, tintaJauh: { value: 70 }, tintaKuat: { value: 1 },
      fokus: { value: 12 }, dof: { value: .0 }, dofRentang: { value: .6 }, bloom: { value: .3 }, thr: { value: 1 },
      kontras: { value: 1.06 }, sat: { value: 1.1 }, vin: { value: .25 }, grain: { value: .035 }, expo: { value: 1 },
      angkat: { value: new T.Vector3() }, hangat: { value: new T.Vector3(1, 1, 1) }, vinW: { value: new T.Vector3(.2, .15, .3) }
    };
    var mAkhir = new T.ShaderMaterial({ uniforms: U, vertexShader: VS, fragmentShader: FS_AKHIR, depthTest: false, depthWrite: false });
    var mNormal = new T.MeshNormalMaterial();

    var D = { ren: ren, scene: scene, cam: cam, sun: sun, amb: amb, hemi: hemi, langit: langit, U: U, preset: null, TEX: TEX, ulang: ulang, lin: lin, rng: rng, jit: jit, gelap: gelap, campur: campur,
      _awan: [], _kartu: [], _hadap: [] };

    D.atur = function (a) {
      a = a || {};
      if (a.langit) {
        var P = LANGIT[a.langit] || LANGIT.siang; D.preset = P; D.namaLangit = a.langit;
        amb.color.setRGB(P.bayang[0], P.bayang[1], P.bayang[2]);
        sun.color.setRGB(Math.max(0, P.terang[0] - P.bayang[0]), Math.max(0, P.terang[1] - P.bayang[1]), Math.max(0, P.terang[2] - P.bayang[2]));
        hemi.color.copy(lin(P.hemi[0])); hemi.groundColor.copy(lin(P.hemi[1])); hemi.intensity = P.hemi[2];
        langitMat.uniforms.atas.value.copy(lin(P.atas)); langitMat.uniforms.tengah.value.copy(lin(P.tengah));
        langitMat.uniforms.cak.value.copy(lin(P.cakrawala)); langitMat.uniforms.bawah.value.copy(lin(P.bawah));
        langitMat.uniforms.sunCol.value.copy(lin(P.matahari)); langitMat.uniforms.sunK.value = a.langit === 'malam' ? .35 : 1;
        scene.fog.color.copy(lin(P.kabut)); scene.fog.near = P.kabutDekat; scene.fog.far = P.kabutJauh;
        var g = P.grade; U.kontras.value = g.kontras; U.sat.value = g.sat; U.vin.value = g.vin;
        U.angkat.value.set(g.angkat[0], g.angkat[1], g.angkat[2]); U.hangat.value.set(g.hangat[0], g.hangat[1], g.hangat[2]);
        var vw = new T.Color(g.vinW); U.vinW.value.set(vw.r, vw.g, vw.b);
        U.bloom.value = P.bloom; U.thr.value = P.thr;
        D.tintTokoh = lin(P.tokoh);
        if (!a.matahari) a.matahari = { az: P.az, el: P.el };
        D._awan.forEach(function (w) { w.perbarui(); });
      }
      if (a.matahari) { D._mAz = a.matahari.az; D._mEl = a.matahari.el; }
      if (a.fokus != null) U.fokus.value = a.fokus;
      if (a.dof != null) U.dof.value = a.dof;
      if (a.dofRentang != null) U.dofRentang.value = a.dofRentang;
      if (a.bloom != null) U.bloom.value = a.bloom;
      if (a.tinta != null) U.tintaKuat.value = a.tinta;
      if (a.tintaW != null) U.tintaW.value = a.tintaW;
      if (a.tintaJauh != null) U.tintaJauh.value = a.tintaJauh;
      if (a.grain != null) U.grain.value = a.grain;
      if (a.expo != null) U.expo.value = a.expo;
      if (a.kabut) { scene.fog.near = a.kabut[0]; scene.fog.far = a.kabut[1]; }
      if (a.area) { D._area = a.area; }
      return D;
    };
    D._area = o.area || 28;

    function aturMatahari() {
      var az = (D._mAz || 0) * PI / 180, el = (D._mEl || 45) * PI / 180;
      var dir = new T.Vector3(Math.sin(az) * Math.cos(el), Math.sin(el), Math.cos(az) * Math.cos(el));
      D.arahMatahari = dir;
      langitMat.uniforms.sunDir.value.copy(dir);
      var tgt = D.pusatBayangan || new T.Vector3(cam.position.x, 0, cam.position.z - 8);
      sun.target.position.copy(tgt); sun.position.copy(tgt).addScaledVector(dir, 70);
      var A = D._area; sc.left = sc.bottom = -A; sc.right = sc.top = A; sc.updateProjectionMatrix();
    }

    /* ---- bahan ---- */
    var RAMP = (function () {
      var v = [0, 0, 0, 10, 150, 245, 255, 255], d = new Uint8Array(32);
      for (var i = 0; i < 8; i++) { d[i * 4] = d[i * 4 + 1] = d[i * 4 + 2] = v[i]; d[i * 4 + 3] = 255; }
      var t = new T.DataTexture(d, 8, 1, T.RGBAFormat); t.minFilter = t.magFilter = T.LinearFilter; t.needsUpdate = true; return t;
    })();
    D.bahan = function (warna, x) {
      x = x || {};
      var m = new T.MeshToonMaterial({ color: x.map ? lin(warna || '#FFFFFF') : lin(warna), map: x.map || null, gradientMap: RAMP,
        emissive: x.nyala ? lin(x.nyala) : new T.Color(0), emissiveIntensity: x.kuat == null ? 1 : x.kuat,
        transparent: !!x.tembus, opacity: x.tembus || 1, side: x.dua ? T.DoubleSide : T.FrontSide });
      return m;
    };
    D.bahanDasar = function (warna, x) {   // tanpa cahaya (lampu, kaca menyala)
      x = x || {};
      return new T.MeshBasicMaterial({ color: lin(warna), map: x.map || null, transparent: !!x.tembus, opacity: x.tembus || 1, fog: x.kabut !== false, side: x.dua ? T.DoubleSide : T.FrontSide, depthWrite: x.tulis !== false });
    };
    D.RAMP = RAMP;

    /* ---- geometri bantu ---- */
    function kotak(w, h, d, mat, x, y, z, bayang) {
      var m = new T.Mesh(new T.BoxGeometry(w, h, d), mat); m.position.set(x || 0, y || 0, z || 0);
      m.castShadow = bayang !== false; m.receiveShadow = true; return m;
    }
    function kotakBulat(w, h, d, r, mat) {   // kotak bersudut bulat (ekstrusi)
      var s = new T.Shape(), x = -w / 2, y = -h / 2; r = Math.min(r, w / 2, h / 2);
      s.moveTo(x + r, y); s.lineTo(x + w - r, y); s.quadraticCurveTo(x + w, y, x + w, y + r); s.lineTo(x + w, y + h - r); s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
      s.lineTo(x + r, y + h); s.quadraticCurveTo(x, y + h, x, y + h - r); s.lineTo(x, y + r); s.quadraticCurveTo(x, y, x + r, y);
      var b = Math.min(r * .6, d / 3), geo = new T.ExtrudeGeometry(s, { depth: d - 2 * b, bevelEnabled: true, bevelThickness: b, bevelSize: b * .9, bevelSegments: 3, curveSegments: 6 });
      geo.translate(0, 0, -(d - 2 * b) / 2); var m = new T.Mesh(geo, mat); m.castShadow = true; m.receiveShadow = true; return m;
    }
    function bola(r, mat, x, y, z, sx, sy, sz) { var m = new T.Mesh(new T.SphereGeometry(r, 18, 14), mat); m.position.set(x || 0, y || 0, z || 0); m.scale.set(sx || 1, sy || 1, sz || 1); m.castShadow = true; m.receiveShadow = true; return m; }
    function gumpal(r0, mat, x, y, z, r, sx, sy, sz) {   // bola bergelombang organik (daun, semak, awan 3D)
      var geo = new T.SphereGeometry(r0, 22, 16), p = geo.attributes.position, v = new T.Vector3(), f1 = r() * 10, f2 = r() * 10;
      for (var i = 0; i < p.count; i++) {
        v.fromBufferAttribute(p, i); var n = v.clone().normalize();
        var d = 1 + .09 * Math.sin(n.x * 5.1 + f1) * Math.sin(n.y * 4.3 + f2) + .06 * Math.sin(n.z * 7.7 + n.x * 3.1 + f1) + .04 * Math.sin(n.y * 11 + f2);
        if (n.y < -.3) d *= 1 - (-.3 - n.y) * .35;   // bawah sedikit rata
        p.setXYZ(i, v.x * d, v.y * d, v.z * d);
      }
      geo.computeVertexNormals();
      var m = new T.Mesh(geo, mat); m.position.set(x || 0, y || 0, z || 0); m.scale.set(sx || 1, sy || 1, sz || 1); m.castShadow = true; m.receiveShadow = true; return m;
    }
    function tabung(r1, r2, h, mat, x, y, z, seg) { var m = new T.Mesh(new T.CylinderGeometry(r1, r2, h, seg || 14), mat); m.position.set(x || 0, (y || 0) + h / 2, z || 0); m.castShadow = true; m.receiveShadow = true; return m; }
    function lapisan(obj, n) { obj.traverse(function (c) { c.layers.set(n); }); return obj; }
    D.kotak = kotak; D.kotakBulat = kotakBulat; D.gumpal = gumpal; D.bola = bola; D.tabung = tabung; D.lapisan = lapisan;
    D.pendar = function (warna, uk, kuat) {   // titik cahaya lembut (lampu) → ikut bloom
      var m = new T.Sprite(new T.SpriteMaterial({ map: TEX.bulat(), color: lin(warna).multiplyScalar(kuat || 2), transparent: true, depthWrite: false, blending: T.AdditiveBlending, fog: false }));
      m.scale.set(uk, uk, 1); m.layers.set(1); return m;
    };

    /* ================= ASET ================= */
    D.tanah = function (a) {
      a = a || {}; var w = a.lebar || 200, d = a.dalam || 200, jenis = a.jenis || 'rumput';
      var tx = jenis === 'paving' ? TEX.paving(a.warna) : jenis === 'tanah' ? TEX.tanah() : TEX.rumput(a.warna);
      var m = new T.Mesh(new T.PlaneGeometry(w, d), D.bahan('#FFFFFF', { map: ulang(tx, w / (a.ubin || 4), d / (a.ubin || 4)) }));
      m.rotation.x = -PI / 2; m.receiveShadow = true; m.position.set(a.x || 0, a.y || 0, a.z || 0);
      var g = new T.Group(); g.add(m); return g;
    };

    D.jalan = function (a) {
      a = a || {}; var p = a.panjang || 60, l = a.lebar || 6, g = new T.Group(), tr = a.trotoar == null ? 1.6 : a.trotoar;
      var as = new T.Mesh(new T.PlaneGeometry(l, p), D.bahan('#FFFFFF', { map: ulang(TEX.aspal(), l / 4, p / 4) }));
      as.rotation.x = -PI / 2; as.position.y = .02; as.receiveShadow = true; g.add(as);
      if (a.marka !== false) {
        var mm = D.bahan('#F4F0E4');
        for (var z = -p / 2 + 1; z < p / 2 - 1; z += 4) { var s = new T.Mesh(new T.PlaneGeometry(.16, 2), mm); s.rotation.x = -PI / 2; s.position.set(0, .03, z); s.receiveShadow = true; g.add(s); }
      }
      if (tr) [-1, 1].forEach(function (s) {
        var kb = kotak(.22, .2, p, D.bahan('#FFFFFF', { map: ulang(TEX.kerb(), 1, p / 2) }), s * (l / 2 + .11), .1, 0, false);
        kb.material.map.rotation = PI / 2; kb.material.map.repeat.set(p / 2, 1); g.add(kb);
        var sel = kotak(.36, .05, p, D.bahan('#3A3646'), s * (l / 2 + .4), .02, 0, false); g.add(sel);   // selokan
        var tv = kotak(tr, .16, p, D.bahan('#FFFFFF', { map: ulang(TEX.paving(a.paving), tr / 1.2, p / 1.2) }), s * (l / 2 + .58 + tr / 2), .08, 0, false); g.add(tv);
      });
      return g;
    };

    /* rumah komplek: depan menghadap +z, titik (0,0,0) = tengah depan teras di tanah */
    D.rumah = function (a) {
      a = Object.assign({ lebar: 7, dalam: 8, tinggi: 3.1, dinding: '#F3E2CC', list: '#FFFFFF', atap: '#C8483A', pintu: '#7A3B2A', kusen: '#5B3A2C',
        kaca: '#2D4D73', tirai: '#F7EAD0', pondasi: '#A99C92', teras: true, pagar: true, taman: true, lampion: 0, nyala: 0, benih: 1, ac: true, nomor: null, bata: false }, a || {});
      var g = new T.Group(), r = rng(a.benih * 101 + 7), W = a.lebar, Dd = a.dalam, Ht = a.tinggi, fz = -1.2;   // fz = muka dinding depan
      var cz = fz - Dd / 2, pd = .4;
      var mDinding = D.bahan('#FFFFFF', { map: ulang(TEX.plester(a.dinding), W / 3, Ht / 3) });
      var mDinding2 = D.bahan('#FFFFFF', { map: ulang(TEX.plester(a.dinding), Dd / 3, Ht / 3) });
      var mList = D.bahan(a.list), mKusen = D.bahan('#FFFFFF', { map: ulang(TEX.kayu(a.kusen), .3, 1) });
      // pondasi + dinding
      g.add(kotak(W + .24, pd, Dd + .24, D.bahan('#FFFFFF', { map: ulang(a.bata ? TEX.bata('#B86B4E') : TEX.plester(a.pondasi), W / 2, .3) }), 0, pd / 2, cz));
      var dinding = kotak(W, Ht, Dd, [mDinding2, mDinding2, mList, mList, mDinding, mDinding], 0, pd + Ht / 2, cz); g.add(dinding);
      g.add(kotak(W + .16, .16, Dd + .16, mList, 0, pd + Ht - .02, cz));            // list atas
      g.add(kotak(W + .06, .08, Dd + .06, D.bahan(gelap(a.dinding, .8)), 0, pd + .05, cz));   // plint
      if (a.batu !== false) {   // lis batu alam setinggi ±0,9 m di muka depan
        var mBatu = D.bahan('#FFFFFF', { map: ulang(TEX.batuAlam(a.batu || '#B9A58C'), W / 2.2, .9 / 1.1) });
        g.add(kotak(W + .04, .9, .06, mBatu, 0, pd + .45, fz + .02));
        g.add(kotak(W + .1, .06, .12, mList, 0, pd + .93, fz + .04));
      }
      // atap pelana (bubungan sepanjang z)
      var pitch = .52, oh = .55, half = W / 2 + oh, rise = Math.tan(pitch) * half, slope = half / Math.cos(pitch), yb = pd + Ht + .04;
      var mAtap = D.bahan('#FFFFFF', { map: ulang(TEX.genteng(a.atap), slope / 1.1, (Dd + oh * 2) / 1.1) });
      [-1, 1].forEach(function (s) {
        var pan = new T.Mesh(new T.BoxGeometry(slope, .14, Dd + oh * 2), mAtap);
        pan.material.map.rotation = 0;
        pan.position.set(s * half / 2, yb + rise / 2, cz); pan.rotation.z = -s * pitch; pan.castShadow = pan.receiveShadow = true; g.add(pan);
        // lisplang depan & belakang
        [1, -1].forEach(function (fb) {
          var ls = kotak(slope + .05, .24, .07, mList, s * half / 2, yb + rise / 2 - .06, cz + fb * (Dd / 2 + oh + .02)); ls.rotation.z = -s * pitch; g.add(ls);
        });
        var tl = tabung(.07, .07, Dd + oh * 2, D.bahan('#E8E4DE'), 0, 0, 0, 10); tl.rotation.x = PI / 2; tl.position.set(s * (half - .05), yb - .08, cz); g.add(tl);   // talang
      });
      var bub = tabung(.13, .13, Dd + oh * 2 + .1, D.bahan(gelap(a.atap, .75)), 0, 0, 0, 10); bub.rotation.x = PI / 2; bub.position.set(0, yb + rise + .04, cz); g.add(bub);
      // segitiga gevel depan/belakang
      var sh = new T.Shape(); sh.moveTo(-W / 2, 0); sh.lineTo(W / 2, 0); sh.lineTo(0, Math.tan(pitch) * W / 2); sh.lineTo(-W / 2, 0);
      var gv = new T.ShapeGeometry(sh); var uv = gv.attributes.uv; for (var i = 0; i < uv.count; i++) uv.setXY(i, (uv.getX(i) + W / 2) / 3, uv.getY(i) / 3);
      [1, -1].forEach(function (fb) { var m = new T.Mesh(gv, mDinding); m.position.set(0, yb - .04, cz + fb * (Dd / 2 + .001)); if (fb < 0) m.rotation.y = PI; m.receiveShadow = true; g.add(m); });
      var ven = kotakBulat(.7, .4, .08, .18, D.bahan(gelap(a.dinding, .55))); ven.position.set(0, yb + rise * .38, fz + .03); g.add(ven);   // ventilasi gevel
      for (var vv = 0; vv < 4; vv++) g.add(kotak(.55, .035, .03, mList, 0, yb + rise * .38 - .12 + vv * .08, fz + .08, false));
      // pintu + kusen
      var pw = 1.0, ph = 2.15, px = -W * .18;
      g.add(kotak(pw + .24, ph + .14, .14, mKusen, px, pd + ph / 2 + .07, fz + .04));
      var cv = document.createElement('canvas'); cv.width = 256; cv.height = 512; var c2 = cv.getContext('2d');
      c2.fillStyle = a.pintu; c2.fillRect(0, 0, 256, 512);
      [[28, 28, 200, 200], [28, 270, 200, 210]].forEach(function (q) { c2.fillStyle = gelap(a.pintu, .82); c2.fillRect(q[0], q[1], q[2], q[3]); c2.strokeStyle = gelap(a.pintu, .55); c2.lineWidth = 6; c2.strokeRect(q[0], q[1], q[2], q[3]); c2.fillStyle = campur(a.pintu, '#FFFFFF', .12); c2.fillRect(q[0] + 18, q[1] + 18, q[2] - 36, q[3] - 36); });
      for (var k = 0; k < 30; k++) { c2.strokeStyle = 'rgba(0,0,0,.08)'; c2.beginPath(); c2.moveTo(r() * 256, 0); c2.lineTo(r() * 256, 512); c2.stroke(); }
      var tP = new T.CanvasTexture(cv); tP.encoding = T.sRGBEncoding;
      g.add(kotak(pw, ph, .08, [D.bahan(gelap(a.pintu, .8)), D.bahan(gelap(a.pintu, .8)), D.bahan(gelap(a.pintu, .8)), D.bahan(gelap(a.pintu, .8)), D.bahan('#FFFFFF', { map: tP }), D.bahan('#FFFFFF', { map: tP })], px, pd + ph / 2, fz + .07));
      g.add(bola(.055, D.bahan('#E2C06E'), px + pw * .36, pd + ph * .48, fz + .14));
      // jendela kaca (tekstur: pantulan langit + tirai)
      function teksturJendela(lw, lh, nyala) {
        var cv2 = document.createElement('canvas'); cv2.width = 256; cv2.height = Math.round(256 * lh / lw); var q = cv2.getContext('2d'), h2 = cv2.height;
        var gr = q.createLinearGradient(0, 0, 0, h2);
        if (nyala) { gr.addColorStop(0, '#FFD995'); gr.addColorStop(1, '#FFB45E'); } else { gr.addColorStop(0, campur(a.kaca, '#BFD8F0', .45)); gr.addColorStop(1, a.kaca); }
        q.fillStyle = gr; q.fillRect(0, 0, 256, h2);
        q.fillStyle = 'rgba(255,255,255,' + (nyala ? .1 : .32) + ')'; q.beginPath(); q.moveTo(40, 0); q.lineTo(110, 0); q.lineTo(30, h2); q.lineTo(-40, h2); q.fill();
        q.beginPath(); q.moveTo(140, 0); q.lineTo(165, 0); q.lineTo(85, h2); q.lineTo(60, h2); q.fill();
        [0, 1].forEach(function (s) {   // tirai berlipit
          var x0 = s ? 256 - 70 : 0, tg = q.createLinearGradient(x0, 0, x0 + 70, 0);
          for (var f = 0; f <= 6; f++) tg.addColorStop(f / 6, f % 2 ? a.tirai : gelap(a.tirai, .82));
          q.fillStyle = tg; q.beginPath(); q.moveTo(x0, 0); q.lineTo(x0 + 70, 0); q.quadraticCurveTo(x0 + (s ? 10 : 60), h2 * .5, x0 + (s ? 30 : 40), h2); q.lineTo(s ? 256 : 0, h2); q.closePath(); q.fill();
        });
        var t2 = new T.CanvasTexture(cv2); t2.encoding = T.sRGBEncoding; return t2;
      }
      var jendela = [], nJ = a.jendela == null ? (W > 6 ? 2 : 1) : a.jendela;
      for (var j = 0; j < nJ; j++) {
        var jw = 1.3, jh = 1.35, jx = nJ === 1 ? W * .2 : lr(W * .05, W * .34, j / Math.max(1, nJ - 1)) + (j ? 0 : .1), jy = pd + 1.0 + jh / 2;
        if (Math.abs(jx - px) < 1.3) jx = px + 1.6;
        g.add(kotak(jw + .2, jh + .2, .12, mKusen, jx, jy, fz + .03));
        var kaca = new T.Mesh(new T.PlaneGeometry(jw, jh), a.nyala ? D.bahanDasar('#FFFFFF', { map: teksturJendela(jw, jh, true) }) : D.bahan('#FFFFFF', { map: teksturJendela(jw, jh, false) }));
        kaca.position.set(jx, jy, fz + .1); g.add(kaca); jendela.push(kaca);
        g.add(kotak(.06, jh, .06, mKusen, jx, jy, fz + .12, false)); g.add(kotak(jw, .06, .06, mKusen, jx, jy + jh * .18, fz + .12, false));
        g.add(kotak(jw + .4, .08, .26, mList, jx, jy - jh / 2 - .12, fz + .12));   // ambang
        for (var tb = 0; tb < 5; tb++) g.add(kotak(.025, jh, .025, D.bahan('#2E2A36'), jx - jw / 2 + (tb + .5) * jw / 5, jy, fz + .2, false));   // teralis
        if (a.nyala) { var pn = D.pendar('#FFC27A', 2.6, 1.2); pn.position.set(jx, jy, fz + .5); g.add(pn); }
      }
      // teras + kanopi + tiang
      if (a.teras) {
        var tw = W * .62, tdp = 1.6, tx = -W * .08;
        g.add(kotak(tw, .18, tdp, D.bahan('#FFFFFF', { map: ulang(TEX.keramik(), tw / 1.2, tdp / 1.2) }), tx, pd - .09 + .02, fz + tdp / 2));
        g.add(kotak(tw * .5, .14, .4, D.bahan('#D8D0C4'), px, .07, fz + tdp + .2));   // anak tangga
        var kn = kotak(tw + .5, .1, tdp + .5, D.bahan('#FFFFFF', { map: ulang(TEX.genteng(a.atap), (tw + .5) / 1.1, 1.6) }), tx, pd + 2.55, fz + tdp / 2 + .05); kn.rotation.x = .16; g.add(kn);
        g.add(kotak(tw + .55, .2, .06, mList, tx, pd + 2.42, fz + tdp + .3));
        [-1, 1].forEach(function (s) { g.add(kotak(.2, 2.4, .2, mList, tx + s * (tw / 2 - .1), pd + 1.2, fz + tdp - .05)); g.add(kotak(.3, .14, .3, D.bahan(gelap(a.list, .85)), tx + s * (tw / 2 - .1), pd + .07, fz + tdp - .05)); });
        // lampu dinding
        var lp = new T.Group(); lp.add(kotakBulat(.16, .26, .14, .05, D.bahan('#2E2A36'))); var bl = bola(.07, a.nyala ? D.bahanDasar('#FFE3A8') : D.bahan('#FFF2D8', { nyala: '#FFE3A8', kuat: .15 }), 0, -.02, .06); lp.add(bl);
        lp.position.set(px + pw / 2 + .35, pd + 1.95, fz + .1); g.add(lp);
        if (a.nyala) { var pl = D.pendar('#FFD08A', 1.4, 1.6); pl.position.set(px + pw / 2 + .35, pd + 1.95, fz + .3); g.add(pl); }
        // keset & pot
        g.add(kotak(.8, .02, .5, D.bahan('#9A4A3A'), px, pd + .01, fz + .45, false));
        D.pot && [tx - tw / 2 + .35, tx + tw / 2 - .35].forEach(function (x, i) { var pt = D.pot({ benih: a.benih * 3 + i, warna: i ? '#C9714A' : '#E9E2D6', tanaman: i ? 'bunga' : 'daun' }); pt.position.set(x, pd, fz + tdp - .45); g.add(pt); });
        for (var lm = 0; lm < (a.lampion || 0); lm++) { var la = D.lampion({ benih: lm }); la.position.set(tx + (lm - (a.lampion - 1) / 2) * 1.2, pd + 2.3, fz + tdp - .1); g.add(la); }
      }
      // nomor rumah
      if (a.nomor != null) {
        var nc = document.createElement('canvas'); nc.width = 128; nc.height = 64; var nq = nc.getContext('2d');
        nq.fillStyle = '#2E2A36'; nq.fillRect(0, 0, 128, 64); nq.fillStyle = '#F4E6C4'; nq.font = '800 44px system-ui'; nq.textAlign = 'center'; nq.textBaseline = 'middle'; nq.fillText(String(a.nomor), 64, 34);
        var nt = new T.CanvasTexture(nc); nt.encoding = T.sRGBEncoding;
        var nm = new T.Mesh(new T.PlaneGeometry(.36, .18), D.bahan('#FFFFFF', { map: nt })); nm.position.set(px - pw / 2 - .35, pd + 1.85, fz + .02); g.add(nm);
      }
      // AC outdoor + pipa di sisi
      if (a.ac) {
        var ac = kotakBulat(.8, .55, .3, .06, D.bahan('#ECEAE6')); ac.position.set(W / 2 + .16, pd + 2.0, cz + Dd * .2); ac.rotation.y = PI / 2; g.add(ac);
        var kp = new T.Mesh(new T.CircleGeometry(.2, 20), D.bahan('#4A4652')); kp.position.set(W / 2 + .32, pd + 2.0, cz + Dd * .2 + .1); kp.rotation.y = PI / 2; g.add(kp);
        var pp = tabung(.025, .025, 1.6, D.bahan('#ECEAE6'), W / 2 + .05, pd + .4, fz - .4, 8); g.add(pp);
      }
      // pagar
      if (a.pagar) {
        var pz = 1.6, pagH = .5, mPag = D.bahan('#FFFFFF', { map: ulang(TEX.plester(a.list === '#FFFFFF' ? '#EFE8DC' : a.list), W / 3, .3) });
        var bukaan = 2.6, sisi = (W + .4 - bukaan) / 2;
        [-1, 1].forEach(function (s) {
          var cx2 = s * (bukaan / 2 + sisi / 2);
          g.add(kotak(sisi, pagH, .2, mPag, cx2, pagH / 2, pz));
          g.add(kotak(sisi + .06, .07, .26, D.bahan(gelap(a.dinding, .8)), cx2, pagH + .035, pz));
          var tg2 = kotak(.32, 1.25, .32, mPag, s * bukaan / 2, .625, pz); g.add(tg2);
          g.add(kotak(.38, .08, .38, D.bahan(gelap(a.dinding, .75)), s * bukaan / 2, 1.29, pz));
          var tgw = kotak(.32, 1.25, .32, mPag, s * (W / 2 + .2), .625, pz); g.add(tgw);
          var nb = Math.floor(sisi / .16);
          var bars = new T.InstancedMesh(new T.BoxGeometry(.03, .6, .03), D.bahan('#2E2A36'), nb); bars.castShadow = true;
          var m4 = new T.Matrix4(); for (var bi = 0; bi < nb; bi++) { m4.makeTranslation(cx2 - sisi / 2 + (bi + .5) * sisi / nb, pagH + .38, pz); bars.setMatrixAt(bi, m4); }
          g.add(bars); g.add(kotak(sisi, .04, .04, D.bahan('#2E2A36'), cx2, pagH + .68, pz, false));
          // pagar samping (ke belakang)
          g.add(kotak(.18, pagH, Dd + pz + 1.2, mPag, s * (W / 2 + .2), pagH / 2, pz - (Dd + pz + 1.2) / 2));
        });
        // gerbang geser terbuka sebagian
        var nG = 12, gate = new T.Group();
        for (var gi = 0; gi < nG; gi++) gate.add(kotak(.035, 1.0, .035, D.bahan('#2E2A36'), -bukaan / 2 + (gi + .5) * bukaan / nG * .5, .55, 0, true));
        gate.add(kotak(bukaan * .5, .05, .05, D.bahan('#C9A45C'), -bukaan * .25, 1.03, 0)); gate.add(kotak(bukaan * .5, .05, .05, D.bahan('#2E2A36'), -bukaan * .25, .08, 0));
        gate.position.set(0, 0, pz + .16); g.add(gate);
      }
      // taman kecil
      if (a.taman) {
        var sm = D.semak({ benih: a.benih * 7 + 1, lebar: 1.4, bunga: '#FF8FB1' }); sm.position.set(W / 2 - .9, 0, .7); g.add(sm);
        var sm2 = D.semak({ benih: a.benih * 7 + 2, lebar: 1.1, bunga: '#FFE066' }); sm2.position.set(-W / 2 + .8, 0, .8); g.add(sm2);
        var rp = D.rumpun({ lebar: W - .6, dalam: 1.1, n: 140, benih: a.benih }); rp.position.set(0, 0, .55); g.add(rp);
      }
      g.userData = { jendela: jendela, depan: fz, pintu: new T.Vector3(px, pd, fz + .1), lebar: W, dalam: Dd };
      return g;
    };

    D.pohon = function (a) {
      a = Object.assign({ tinggi: 4.6, mahkota: 1.7, warna: '#5FA453', batang: '#7A5236', jenis: 'bulat', benih: 1, buah: null }, a || {});
      var g = new T.Group(), r = rng(a.benih * 31 + 3), mB = D.bahan('#FFFFFF', { map: ulang(TEX.kayu(a.batang), .5, 1.5) });
      if (a.jenis === 'cemara') {
        g.add(tabung(.08, .13, a.tinggi * .4, mB));
        for (var i = 0; i < 4; i++) {
          var c = new T.Mesh(new T.ConeGeometry(a.mahkota * .7 * (1 - i * .2), a.tinggi * .32, 16), D.bahan('#FFFFFF', { map: ulang(TEX.daun(jit(r, a.warna, .1)), 1.5, 1) }));
          c.position.y = a.tinggi * (.36 + i * .17); c.castShadow = c.receiveShadow = true; g.add(c);
        }
        return g;
      }
      var tb = tabung(a.mahkota * .07, a.mahkota * .12, a.tinggi * .66, mB); g.add(tb);
      [-1, 1].forEach(function (s) { var dh = tabung(.035, .065, a.tinggi * .3, mB); dh.position.set(s * .16, a.tinggi * .42, s * .05); dh.rotation.z = -s * .55; g.add(dh); });
      var pusatY = a.tinggi * .7, n = 12 + Math.floor(r() * 5), M = a.mahkota;
      var mDaun = D.bahan('#FFFFFF', { map: ulang(TEX.daun(a.warna), 1.2, 1) });
      g.add(gumpal(M * .78, mDaun, 0, pusatY + M * .1, 0, r, 1, .9, 1));
      for (var k = 0; k < n; k++) {
        var ang = k / n * TAU + r() * .5, rd = M * (.55 + r() * .35), rr = M * (.34 + r() * .2), up = (r() - .45) * M * .9;
        var mk = mDaun.clone(); mk.color.copy(lin(jit(r, '#FFFFFF', .0, 0, 0))).multiplyScalar(up < -.1 * M ? .8 : up > .3 * M ? 1.08 : .95);
        g.add(gumpal(rr, mk, Math.cos(ang) * rd, pusatY + up, Math.sin(ang) * rd * .85, r, 1, .88, 1));
      }
      if (a.buah) for (var f = 0; f < 10; f++) { var an = r() * TAU, rr2 = a.mahkota * 1.02; g.add(bola(.09, D.bahan(a.buah), Math.cos(an) * rr2 * .8, pusatY + (r() - .5) * a.mahkota, Math.sin(an) * rr2 * .8)); }
      return g;
    };

    D.semak = function (a) {
      a = Object.assign({ lebar: 1.2, tinggi: .7, warna: '#5C9E4A', bunga: null, benih: 1 }, a || {});
      var g = new T.Group(), r = rng(a.benih * 17 + 5), n = 4 + Math.floor(r() * 3);
      for (var i = 0; i < n; i++) {
        var x = (i / (n - 1) - .5) * a.lebar * .8, rr = a.tinggi * (.45 + r() * .3);
        g.add(gumpal(rr, D.bahan('#FFFFFF', { map: ulang(TEX.daun(jit(r, a.warna, .12)), 1, 1) }), x, rr * .8, (r() - .5) * .3, r, 1, .85, 1));
      }
      if (a.bunga) {
        var nb = 26, ins = new T.InstancedMesh(new T.SphereGeometry(.055, 8, 6), D.bahan(a.bunga), nb), m4 = new T.Matrix4();
        for (var k = 0; k < nb; k++) { var x2 = (r() - .5) * a.lebar * .9, y2 = a.tinggi * (.4 + r() * .7), z2 = (r() - .2) * .45 + .2; m4.makeTranslation(x2, y2, z2); ins.setMatrixAt(k, m4); }
        g.add(ins);
      }
      return g;
    };

    D.rumpun = function (a) {   // rumput tinggi tersebar (instanced)
      a = Object.assign({ lebar: 4, dalam: 2, n: 200, warna: '#6FAE4E', benih: 1, tinggi: .28 }, a || {});
      var r = rng(a.benih * 13 + 1), geo = new T.ConeGeometry(.045, 1, 4); geo.translate(0, .5, 0);
      var ins = new T.InstancedMesh(geo, D.bahan('#FFFFFF'), a.n), m4 = new T.Matrix4(), q = new T.Quaternion(), e = new T.Euler(), s = new T.Vector3(), p = new T.Vector3(), c = new T.Color();
      for (var i = 0; i < a.n; i++) {
        e.set((r() - .5) * .5, r() * TAU, (r() - .5) * .5); q.setFromEuler(e); var h = a.tinggi * (.5 + r());
        s.set(1, h, 1); p.set((r() - .5) * a.lebar, 0, (r() - .5) * a.dalam); m4.compose(p, q, s); ins.setMatrixAt(i, m4);
        ins.setColorAt(i, c.copy(lin(jit(r, a.warna, .15, 8, .15))));
      }
      ins.castShadow = false; ins.receiveShadow = true;
      var g = new T.Group(); g.add(lapisan(ins, 1)); return g;
    };

    D.pot = function (a) {
      a = Object.assign({ warna: '#C9714A', tanaman: 'daun', benih: 1, besar: 1 }, a || {});
      var g = new T.Group(), s = a.besar;
      g.add(tabung(.2 * s, .14 * s, .32 * s, D.bahan(a.warna)));
      g.add(tabung(.22 * s, .22 * s, .05 * s, D.bahan(gelap(a.warna, .85)), 0, .3 * s, 0));
      var sm = D.semak({ lebar: .4 * s, tinggi: .36 * s, benih: a.benih, bunga: a.tanaman === 'bunga' ? '#FF6F8E' : null }); sm.position.y = .3 * s; g.add(sm);
      return g;
    };

    D.tiang = function (a) {   // tiang listrik + lampu jalan
      a = Object.assign({ tinggi: 7.2, nyala: 0, arah: 1 }, a || {});
      var g = new T.Group(), mb = D.bahan('#FFFFFF', { map: ulang(TEX.beton(), .5, 3) });
      g.add(tabung(.09, .14, a.tinggi, mb));
      g.add(kotak(1.6, .1, .1, D.bahan('#4A4652'), 0, a.tinggi - .4, 0));
      [-.65, 0, .65].forEach(function (x) { g.add(tabung(.04, .05, .14, D.bahan('#F0EEE8'), x, a.tinggi - .35, 0, 8)); });
      var lengan = tabung(.035, .035, 1.3, D.bahan('#4A4652'), 0, 0, 0, 8); lengan.rotation.x = a.arah * PI / 2.6; lengan.position.set(0, a.tinggi - 1.2, a.arah * .6); g.add(lengan);
      var kp = kotakBulat(.5, .14, .26, .06, D.bahan('#4A4652')); kp.position.set(0, a.tinggi - .92, a.arah * 1.18); g.add(kp);
      var bl = new T.Mesh(new T.PlaneGeometry(.38, .18), a.nyala ? D.bahanDasar('#FFE6B0') : D.bahan('#F6F0E2', { nyala: '#FFF0C8', kuat: .1 }));
      bl.rotation.x = PI / 2; bl.position.set(0, a.tinggi - 1.0, a.arah * 1.18); g.add(bl);
      if (a.nyala) {
        var pn = D.pendar('#FFD394', 3.2, 1.4); pn.position.set(0, a.tinggi - 1.1, a.arah * 1.18); g.add(pn);
        var kerucut = new T.Mesh(new T.ConeGeometry(2.2, a.tinggi - 1, 24, 1, true), new T.MeshBasicMaterial({ color: lin('#FFD394').multiplyScalar(.1), transparent: true, opacity: .5, blending: T.AdditiveBlending, depthWrite: false, side: T.DoubleSide, fog: false }));
        kerucut.position.set(0, (a.tinggi - 1) / 2, a.arah * 1.18); lapisan(kerucut, 1); g.add(kerucut);
      }
      g.userData.kabel = [new T.Vector3(-.65, a.tinggi - .26, 0), new T.Vector3(0, a.tinggi - .26, 0), new T.Vector3(.65, a.tinggi - .26, 0)];
      return g;
    };
    D.kabel = function (A, B, lendut, warna) {   // kabel melendut (catenary sederhana), tanpa tinta
      var pts = []; for (var i = 0; i <= 24; i++) { var t = i / 24, p = A.clone().lerp(B, t); p.y -= Math.sin(t * PI) * (lendut == null ? .6 : lendut); pts.push(p); }
      var m = new T.Mesh(new T.TubeGeometry(new T.CatmullRomCurve3(pts), 40, .018, 5, false), D.bahan(warna || '#2A2430'));
      return lapisan(m, 1);
    };

    D.lampion = function (a) {
      a = Object.assign({ warna: '#D3242C', emas: '#E2B85A', besar: .42, nyala: 0, benih: 0 }, a || {});
      var g = new T.Group(), s = a.besar;
      var badan = bola(s * .5, a.nyala ? D.bahanDasar(campur(a.warna, '#FFB070', .35)) : D.bahan(a.warna, { nyala: a.warna, kuat: .25 }), 0, -s * .55, 0, 1.05, .82, 1.05); g.add(badan);
      for (var i = 0; i < 6; i++) { var rb = new T.Mesh(new T.TorusGeometry(s * .5, .006, 4, 24, PI), D.bahan(gelap(a.warna, .6))); rb.rotation.set(0, i * PI / 6, PI / 2); rb.position.y = -s * .55; rb.scale.set(.82, 1.05, 1.05); g.add(lapisan(rb, 1)); }
      g.add(tabung(s * .22, s * .22, s * .1, D.bahan(a.emas), 0, -s * .2, 0)); g.add(tabung(s * .22, s * .22, s * .1, D.bahan(a.emas), 0, -s * .98, 0));
      g.add(lapisan(tabung(.008, .008, s * .4, D.bahan('#2A2430'), 0, -s * .12, 0, 4), 1));
      var rumbai = tabung(s * .04, s * .1, s * .45, D.bahan(a.emas), 0, -s * 1.45, 0, 8); g.add(rumbai);
      if (a.nyala) { var pn = D.pendar('#FF9A5A', s * 4, 1.2); pn.position.y = -s * .55; g.add(pn); }
      return g;
    };

    D.mobil = function (a) {
      a = Object.assign({ warna: '#3F7FD0', panjang: 4.1, lebar: 1.72, nyala: 0 }, a || {});
      var g = new T.Group(), L = a.panjang, Wm = a.lebar, mB = D.bahan(a.warna);
      var badan = kotakBulat(Wm, .62, L, .24, mB); badan.position.y = .62; g.add(badan);
      var kap = kotakBulat(Wm * .96, .14, L * .32, .07, mB); kap.position.set(0, .95, L * .3); kap.rotation.x = -.08; g.add(kap);
      // kabin dengan kaca berbingkai
      var cv = document.createElement('canvas'); cv.width = 512; cv.height = 256; var q = cv.getContext('2d');
      q.fillStyle = a.warna; q.fillRect(0, 0, 512, 256);
      var gr = q.createLinearGradient(0, 0, 0, 256); gr.addColorStop(0, '#9FC3E6'); gr.addColorStop(1, '#2F4466');
      q.fillStyle = gr; q.beginPath(); q.roundRect ? q.roundRect(22, 22, 468, 200, 26) : q.rect(22, 22, 468, 200); q.fill();
      q.fillStyle = a.warna; q.fillRect(246, 10, 20, 230);
      q.fillStyle = 'rgba(255,255,255,.35)'; q.beginPath(); q.moveTo(70, 22); q.lineTo(150, 22); q.lineTo(80, 222); q.lineTo(0, 222); q.fill();
      var tk = new T.CanvasTexture(cv); tk.encoding = T.sRGBEncoding;
      var mK = D.bahan('#FFFFFF', { map: tk }), mAtap = D.bahan(campur(a.warna, '#FFFFFF', .08));
      var kab = new T.Mesh(new T.BoxGeometry(Wm * .86, .52, L * .5), [mK, mK, mAtap, mAtap, mK, mK]);
      kab.position.set(0, 1.18, -L * .05); kab.castShadow = true; g.add(kab);
      var atap = kotakBulat(Wm * .88, .08, L * .52, .04, mAtap); atap.position.set(0, 1.46, -L * .05); g.add(atap);
      [[-1, -1], [-1, 1], [1, -1], [1, 1]].forEach(function (s) {
        var rd = tabung(.34, .34, .26, D.bahan('#26232C'), 0, 0, 0, 20); rd.rotation.z = PI / 2; rd.position.set(s[1] * (Wm / 2 - .04), .34, s[0] * L * .31); g.add(rd);
        var vl = tabung(.18, .18, .28, D.bahan('#D4D7E0'), 0, 0, 0, 16); vl.rotation.z = PI / 2; vl.position.set(s[1] * (Wm / 2 - .03), .34, s[0] * L * .31); g.add(vl);
        var sp = kotakBulat(.12, .2, .9, .05, D.bahan(gelap(a.warna, .8))); sp.position.set(s[1] * (Wm / 2 + .02), .66, s[0] * L * .31); g.add(sp);
      });
      [-1, 1].forEach(function (s) {
        g.add(bola(.13, a.nyala ? D.bahanDasar('#FFF4D6') : D.bahan('#FFF4D6', { nyala: '#FFF4D6', kuat: .3 }), s * Wm * .32, .74, L / 2 - .02, 1, .75, .45));
        g.add(kotak(.32, .12, .05, D.bahanDasar('#E0303A'), s * Wm * .32, .78, -L / 2 + .01, false));
        var sk = kotakBulat(.08, .1, .22, .03, mB); sk.position.set(s * (Wm * .45 + .06), 1.12, L * .17); g.add(sk);   // spion
      });
      g.add(kotak(Wm * .9, .14, .12, D.bahan('#3A3646'), 0, .4, L / 2 + .02));      // bumper
      g.add(kotak(Wm * .9, .14, .12, D.bahan('#3A3646'), 0, .4, -L / 2 - .02));
      g.add(kotak(.5, .13, .03, D.bahan('#F4F0E4'), 0, .55, L / 2 + .09, false));
      g.add(kotak(Wm * .5, .1, .04, D.bahan('#2A2830'), 0, .68, L / 2 + .02, false)); // gril
      if (a.nyala) [-1, 1].forEach(function (s) { var pn = D.pendar('#FFF0C8', 1.6, 2); pn.position.set(s * Wm * .32, .74, L / 2 + .2); g.add(pn); });
      return g;
    };

    /* ================= ASET FENG SHUI (Shifu Po) ================= */
    /* aliran energi: 'sha' = qi tajam lurus (merah, cepat), 'sheng' = qi lembut berkelok (emas).
       titik: [[x,y,z],...] jalur; atur(t) menggeser kilau di sepanjang jalur. */
    D.energi = function (a) {
      a = Object.assign({ jenis: 'sheng', titik: [[0, .6, 10], [0, .6, 0]], tebal: .12, laju: 1, n: 1 }, a || {});
      var sha = a.jenis === 'sha', warna = sha ? '#FF3B3B' : '#FFD27A';
      var pts = a.titik.map(function (p) { return new T.Vector3(p[0], p[1], p[2]); });
      if (!sha && pts.length === 2) {   // tambahkan kelokan otomatis
        var A = pts[0], B = pts[1], o = []; for (var i = 0; i <= 8; i++) { var k = i / 8, p = A.clone().lerp(B, k); p.x += Math.sin(k * PI * 2.2) * 1.1 * Math.sin(k * PI); p.y += Math.sin(k * PI) * .25; o.push(p); } pts = o;
      }
      var kurva = new T.CatmullRomCurve3(pts, false, 'catmullrom', sha ? 0 : .5);
      var cv = document.createElement('canvas'); cv.width = 512; cv.height = 32; var q = cv.getContext('2d');
      var gr = q.createLinearGradient(0, 0, 512, 0);
      if (sha) { gr.addColorStop(0, 'rgba(255,80,60,0)'); gr.addColorStop(.55, 'rgba(255,120,90,.6)'); gr.addColorStop(.9, 'rgba(255,240,220,1)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); }
      else { gr.addColorStop(0, 'rgba(255,200,90,0)'); gr.addColorStop(.5, 'rgba(255,220,140,.75)'); gr.addColorStop(.8, 'rgba(255,250,220,1)'); gr.addColorStop(1, 'rgba(255,220,140,0)'); }
      q.fillStyle = gr; q.fillRect(0, 0, 512, 32);
      var tx = new T.CanvasTexture(cv); tx.wrapS = T.RepeatWrapping; tx.repeat.set(sha ? 2 : 3, 1);
      var mat = new T.MeshBasicMaterial({ map: tx, color: lin(warna).multiplyScalar(sha ? 2.4 : 2), transparent: true, blending: T.AdditiveBlending, depthWrite: false, side: T.DoubleSide, fog: false });
      var m = new T.Mesh(new T.TubeGeometry(kurva, 120, a.tebal, 8, false), mat); lapisan(m, 1);
      var inti = new T.Mesh(new T.TubeGeometry(kurva, 120, a.tebal * .3, 6, false), new T.MeshBasicMaterial({ color: lin(warna).multiplyScalar(1.6), transparent: true, opacity: .5, blending: T.AdditiveBlending, depthWrite: false, fog: false }));
      lapisan(inti, 1);
      var g = new T.Group(); g.add(m); g.add(inti);
      var kepala = D.pendar(warna, sha ? 1.4 : 1.1, 2.4); g.add(kepala);
      g.userData.atur = function (t, muncul) {   // muncul 0..1 = panjang jalur yang sudah terisi
        muncul = muncul == null ? 1 : cl(muncul, 0, 1);
        tx.offset.x = -t * a.laju * (sha ? 2.2 : .7);
        m.geometry.setDrawRange(0, Math.floor(m.geometry.index.count * muncul / 6) * 6);
        inti.geometry.setDrawRange(0, Math.floor(inti.geometry.index.count * muncul / 6) * 6);
        kepala.position.copy(kurva.getPointAt(Math.max(.001, muncul))); kepala.visible = muncul > .01 && muncul < .999;
        g.visible = muncul > .001;
      };
      g.userData.kurva = kurva; return g;
    };

    D.luopan = function (a) {   // kompas feng shui (piringan emas, cincin merah, jarum)
      a = Object.assign({ besar: .6 }, a || {});
      var g = new T.Group(), s = a.besar;
      var cv = document.createElement('canvas'); cv.width = cv.height = 1024; var q = cv.getContext('2d'), c = 512;
      q.fillStyle = '#C9A45C'; q.fillRect(0, 0, 1024, 1024);
      var cincin = ['#8E1A20', '#F1DDA8', '#1E1614', '#E9C67A', '#8E1A20', '#F1DDA8'];
      for (var i = 0; i < cincin.length; i++) {
        var r0 = 500 - i * 70; q.fillStyle = cincin[i]; q.beginPath(); q.arc(c, c, r0, 0, TAU); q.fill();
        q.strokeStyle = 'rgba(40,20,10,.7)'; q.lineWidth = 4; q.stroke();
        var n = [24, 8, 64, 12, 24, 8][i];
        for (var k = 0; k < n; k++) { var an = k / n * TAU; q.beginPath(); q.moveTo(c + Math.cos(an) * (r0 - 70), c + Math.sin(an) * (r0 - 70)); q.lineTo(c + Math.cos(an) * r0, c + Math.sin(an) * r0); q.lineWidth = 2; q.stroke();
          q.save(); q.translate(c + Math.cos(an + PI / n) * (r0 - 35), c + Math.sin(an + PI / n) * (r0 - 35)); q.rotate(an + PI / n + PI / 2);
          q.fillStyle = i % 2 ? '#8E1A20' : '#F6E6BE'; q.font = '700 ' + (i === 2 ? 14 : 26) + 'px serif'; q.textAlign = 'center'; q.fillText(['☰', '☱', '☲', '☳', '☴', '☵', '☶', '☷'][k % 8], 0, 8); q.restore(); }
      }
      q.fillStyle = '#F6EEDC'; q.beginPath(); q.arc(c, c, 80, 0, TAU); q.fill(); q.strokeStyle = '#8E1A20'; q.lineWidth = 6; q.stroke();
      var tx = new T.CanvasTexture(cv); tx.encoding = T.sRGBEncoding; tx.anisotropy = 8;
      var alas = kotakBulat(s * 1.15, s * 1.15, s * .12, s * .08, D.bahan('#7A3B22')); alas.rotation.x = -PI / 2; alas.position.y = s * .06; g.add(alas);
      var pir = new T.Mesh(new T.CylinderGeometry(s * .5, s * .5, s * .06, 48), [D.bahan('#B8913F'), D.bahan('#FFFFFF', { map: tx }), D.bahan('#B8913F')]);
      pir.position.y = s * .15; pir.castShadow = true; g.add(pir);
      var jarum = new T.Group(); jarum.add(kotak(s * .02, s * .01, s * .3, D.bahanDasar('#E0303A'), 0, 0, s * .07, false)); jarum.add(kotak(s * .02, s * .01, s * .16, D.bahan('#2A2430'), 0, 0, -s * .08, false));
      jarum.position.y = s * .2; g.add(jarum);
      var kaca = new T.Mesh(new T.CircleGeometry(s * .1, 32), new T.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: .25 })); kaca.rotation.x = -PI / 2; kaca.position.y = s * .21; g.add(kaca);
      g.userData.jarum = jarum; g.userData.atur = function (t, sudut) { jarum.rotation.y = (sudut || 0) + Math.sin(t * 3.1) * .08 * Math.exp(-((t % 6) * .6)); };
      return g;
    };

    D.cerminBagua = function (a) {   // cermin bagua segi delapan di atas pintu
      a = Object.assign({ besar: .5 }, a || {});
      var g = new T.Group(), s = a.besar, sh = new T.Shape();
      for (var i = 0; i < 8; i++) { var an = i / 8 * TAU + PI / 8; var x = Math.cos(an) * s / 2, y = Math.sin(an) * s / 2; if (i) sh.lineTo(x, y); else sh.moveTo(x, y); }
      var bingkai = new T.Mesh(new T.ExtrudeGeometry(sh, { depth: .04, bevelEnabled: true, bevelThickness: .01, bevelSize: .01, bevelSegments: 1 }), D.bahan('#8E1A20')); bingkai.castShadow = true; g.add(bingkai);
      var cv = document.createElement('canvas'); cv.width = cv.height = 256; var q = cv.getContext('2d');
      q.fillStyle = '#C9A45C'; q.beginPath(); for (var k = 0; k < 8; k++) { var b = k / 8 * TAU + PI / 8; q.lineTo(128 + Math.cos(b) * 120, 128 + Math.sin(b) * 120); } q.fill();
      q.fillStyle = '#1E1614'; for (var m = 0; m < 8; m++) { q.save(); q.translate(128, 128); q.rotate(m / 8 * TAU); for (var l = 0; l < 3; l++) q.fillRect(-22, -110 + l * 12, 44, 7); q.restore(); }
      var gr = q.createRadialGradient(118, 118, 4, 128, 128, 50); gr.addColorStop(0, '#FFFFFF'); gr.addColorStop(1, '#8FB4D8'); q.fillStyle = gr; q.beginPath(); q.arc(128, 128, 48, 0, TAU); q.fill();
      var tx = new T.CanvasTexture(cv); tx.encoding = T.sRGBEncoding;
      var muka = new T.Mesh(new T.CircleGeometry(s * .47, 8, PI / 8), D.bahan('#FFFFFF', { map: tx })); muka.position.z = .052; g.add(muka);
      return g;
    };

    D.bambu = function (a) {
      a = Object.assign({ n: 7, tinggi: 3.2, sebar: .7, benih: 2, warna: '#7FB04A' }, a || {});
      var g = new T.Group(), r = rng(a.benih * 5 + 1);
      for (var i = 0; i < a.n; i++) {
        var h = a.tinggi * (.7 + r() * .4), x = (r() - .5) * a.sebar, z = (r() - .5) * a.sebar, mt = D.bahan(jit(r, a.warna, .1));
        var ruas = Math.floor(h / .45);
        for (var k = 0; k < ruas; k++) { var bt = tabung(.045, .05, .43, mt, x + k * .01, k * .45, z, 8); g.add(bt); g.add(tabung(.058, .058, .04, D.bahan(gelap(a.warna, .75)), x + k * .01, k * .45 + .41, z, 8)); }
        for (var d = 0; d < 4; d++) {
          var dn = new T.Mesh(new T.PlaneGeometry(.5, .1), D.bahan(jit(r, '#6CA84A', .12), { dua: true }));
          dn.position.set(x + (r() - .5) * .5, h * (.6 + r() * .4), z + (r() - .5) * .3); dn.rotation.set(r() * .6, r() * TAU, -.4 + r() * .8); lapisan(dn, 1); g.add(dn);
        }
      }
      return g;
    };

    D.kolamKoi = function (a) {
      a = Object.assign({ lebar: 2.6, dalam: 1.6, ikan: 4, benih: 3 }, a || {});
      var g = new T.Group(), r = rng(a.benih);
      var sh = new T.Shape(); for (var i = 0; i <= 40; i++) { var an = i / 40 * TAU, k = 1 + .08 * Math.sin(an * 3 + 1); var x = Math.cos(an) * a.lebar / 2 * k, y = Math.sin(an) * a.dalam / 2 * k; if (i) sh.lineTo(x, y); else sh.moveTo(x, y); }
      var air = new T.Mesh(new T.ShapeGeometry(sh), new T.MeshBasicMaterial({ color: lin('#2F8FA8'), transparent: true, opacity: .82, depthWrite: false }));
      air.rotation.x = -PI / 2; air.position.y = .08; lapisan(air, 1); g.add(air);
      var dasar = new T.Mesh(new T.ShapeGeometry(sh), D.bahan('#1E5466')); dasar.rotation.x = -PI / 2; dasar.position.y = -.05; g.add(dasar);
      for (var b = 0; b < 22; b++) { var an2 = b / 22 * TAU; var bt = gumpal(.16 + r() * .06, D.bahan(jit(r, '#B9AE9E', .12)), Math.cos(an2) * a.lebar / 2 * 1.05, .06, Math.sin(an2) * a.dalam / 2 * 1.05, r, 1, .6, 1); g.add(bt); }
      var ikan = [];
      for (var f = 0; f < a.ikan; f++) {
        var ik = new T.Group(), wn = f % 2 ? '#F28C38' : '#FFFFFF';
        ik.add(bola(.1, D.bahan(wn), 0, 0, 0, .55, .35, 1.3));
        ik.add(bola(.05, D.bahan('#E0303A'), 0, .02, .04, .7, .5, 1));
        var ek = new T.Mesh(new T.PlaneGeometry(.12, .1), D.bahan(wn, { dua: true })); ek.position.z = -.16; ek.rotation.x = -PI / 2; ik.add(ek);
        ik.position.y = .02; g.add(ik); ikan.push({ m: ik, r: .35 + r() * .35, v: .4 + r() * .4, f: r() * TAU });
      }
      g.userData.atur = function (t) { ikan.forEach(function (k) { var an = k.f + t * k.v; k.m.position.set(Math.cos(an) * k.r * a.lebar / 2.4, .02, Math.sin(an) * k.r * a.dalam / 2.4); k.m.rotation.y = -an; }); };
      return g;
    };

    D.singa = function (a) {   // patung singa penjaga (shi) sederhana di atas alas
      a = Object.assign({ warna: '#D9CFC0', besar: .7 }, a || {});
      var g = new T.Group(), s = a.besar, mt = D.bahan(a.warna);
      g.add(kotak(s * .7, s * .35, s * .7, D.bahan(gelap(a.warna, .85)), 0, s * .175, 0));
      g.add(gumpal(s * .32, mt, 0, s * .72, -s * .05, rng(4), 1, 1.15, .9));
      g.add(gumpal(s * .27, mt, 0, s * 1.12, s * .1, rng(5), 1.1, 1, 1));
      g.add(gumpal(s * .2, D.bahan(gelap(a.warna, .9)), 0, s * 1.2, s * .02, rng(6), 1.6, 1.1, .7));   // surai
      [-1, 1].forEach(function (k) { g.add(bola(s * .035, D.bahan('#2A2430'), k * s * .09, s * 1.17, s * .34)); g.add(gumpal(s * .1, mt, k * s * .14, s * .45, s * .2, rng(7 + k), 1, 1.4, 1)); });
      g.add(bola(s * .09, D.bahan('#C9A45C'), s * .16, s * .62, s * .26));
      return g;
    };

    D.pohonUang = function (a) {   // tanaman giok / pohon uang dalam pot
      a = Object.assign({ besar: 1 }, a || {});
      var g = D.pot({ warna: '#2E7D63', tanaman: 'daun', benih: 9, besar: a.besar * 1.2 });
      var r = rng(11);
      for (var i = 0; i < 6; i++) g.add(bola(.05 * a.besar, D.bahan('#E2C06E', { nyala: '#E2C06E', kuat: .2 }), (r() - .5) * .4 * a.besar, (.55 + r() * .3) * a.besar, (r() - .2) * .3 * a.besar));
      return g;
    };

    /* ruang interior (kantor/rumah/toko): lantai, 3 dinding, jendela, pintu; isi lewat opsi */
    D.ruang = function (a) {
      a = Object.assign({ lebar: 7, dalam: 6, tinggi: 3, dinding: '#F4E7D4', lantai: 'kayu', warnaLantai: '#B98A5E', aksen: '#8E1A20', pintu: true, jendela: true, nyala: 0, isi: 'kantor', benih: 1 }, a || {});
      var g = new T.Group(), Wr = a.lebar, Dr = a.dalam, Hr = a.tinggi;
      var mL = D.bahan('#FFFFFF', { map: ulang(a.lantai === 'kayu' ? TEX.kayu(a.warnaLantai) : TEX.keramik(a.warnaLantai), Wr / 1.5, Dr / 1.5) });
      g.add(kotak(Wr, .1, Dr, mL, 0, -.05, 0, false));
      var mD = D.bahan('#FFFFFF', { map: ulang(TEX.plester(a.dinding), Wr / 3, Hr / 3) });
      g.add(kotak(Wr, Hr, .15, mD, 0, Hr / 2, -Dr / 2));
      g.add(kotak(.15, Hr, Dr, mD, -Wr / 2, Hr / 2, 0)); g.add(kotak(.15, Hr, Dr, mD, Wr / 2, Hr / 2, 0));
      g.add(kotak(Wr, .14, .2, D.bahan(gelap(a.dinding, .75)), 0, .07, -Dr / 2 + .1));   // plint
      [-1, 1].forEach(function (s) { g.add(kotak(.2, .14, Dr, D.bahan(gelap(a.dinding, .75)), s * (Wr / 2 - .1), .07, 0)); });
      var keluar = { pintu: null, meja: null, kursi: null };
      if (a.pintu) {
        var pd = kotak(1.0, 2.15, .08, D.bahan('#7A3B2A'), -Wr / 2 + .1, 1.075, Dr * .1); pd.rotation.y = PI / 2; g.add(pd);
        var kp = kotak(1.2, 2.3, .1, D.bahan('#5B3A2C'), -Wr / 2 + .06, 1.15, Dr * .1); kp.rotation.y = PI / 2; g.add(kp);
        g.add(bola(.05, D.bahan('#E2C06E'), -Wr / 2 + .2, 1.05, Dr * .1 + .38));
        keluar.pintu = new T.Vector3(-Wr / 2 + .2, 0, Dr * .1);
      }
      if (a.jendela) {
        var jg = new T.Group(); jg.add(kotak(1.8, 1.4, .1, D.bahan('#5B3A2C'), 0, 0, 0));
        var kaca = new T.Mesh(new T.PlaneGeometry(1.6, 1.2), a.nyala ? D.bahanDasar('#2A3E6E') : D.bahanDasar('#CFE6F7')); kaca.position.z = .06; jg.add(kaca);
        jg.add(kotak(.05, 1.2, .05, D.bahan('#5B3A2C'), 0, 0, .08)); jg.add(kotak(1.6, .05, .05, D.bahan('#5B3A2C'), 0, 0, .08));
        jg.position.set(Wr * .18, 1.65, -Dr / 2 + .09); g.add(jg);
        if (!a.nyala) { var sinar = new T.Mesh(new T.PlaneGeometry(1.7, 3.6), new T.MeshBasicMaterial({ color: lin('#FFE6B8').multiplyScalar(.35), transparent: true, opacity: .5, blending: T.AdditiveBlending, depthWrite: false, side: T.DoubleSide }));
          sinar.position.set(Wr * .18 + .4, 1.0, -Dr / 2 + 1.4); sinar.rotation.set(-1.0, .15, 0); lapisan(sinar, 1); g.add(sinar); }
      }
      // lukisan & rak
      var lk = D.papan({ lebar: 1.1, tinggi: .75, tiang: 0, gambar: function (c, w, h) { c.fillStyle = '#F6EEDC'; c.fillRect(0, 0, w, h); c.fillStyle = '#5B6E8C'; c.beginPath(); c.moveTo(0, h * .8); c.lineTo(w * .3, h * .35); c.lineTo(w * .5, h * .6); c.lineTo(w * .75, h * .25); c.lineTo(w, h * .7); c.lineTo(w, h); c.lineTo(0, h); c.fill(); c.fillStyle = '#C9A45C'; c.beginPath(); c.arc(w * .8, h * .22, h * .1, 0, TAU); c.fill(); c.strokeStyle = '#7A3B22'; c.lineWidth = 18; c.strokeRect(0, 0, w, h); } });
      lk.children[1].visible = false; lk.position.set(-Wr * .22, 1.35, -Dr / 2 + .1); g.add(lk);
      if (a.isi === 'kantor') {
        var meja = new T.Group(), mk = D.bahan('#FFFFFF', { map: ulang(TEX.kayu('#8A5A3C'), 1, .5) });
        meja.add(kotak(1.8, .08, .85, mk, 0, .76, 0)); [-1, 1].forEach(function (s) { meja.add(kotak(.06, .76, .8, mk, s * .85, .38, 0)); });
        meja.add(kotak(1.6, .5, .04, mk, 0, .5, -.38));
        var laptop = new T.Group(); laptop.add(kotak(.5, .02, .34, D.bahan('#C9CCD6'), 0, .81, .05)); var lyr = kotak(.5, .32, .02, D.bahan('#C9CCD6'), 0, .97, -.12); lyr.rotation.x = -.2; laptop.add(lyr);
        var lc = new T.Mesh(new T.PlaneGeometry(.44, .27), D.bahanDasar('#8FD3FF')); lc.position.set(0, .97, -.105); lc.rotation.x = -.2; lc.rotation.y = PI; laptop.add(lc); meja.add(laptop);
        var cg = tabung(.05, .04, .1, D.bahan('#FFFFFF'), .55, .8, .15, 12); meja.add(cg);
        meja.position.set(Wr * .1, 0, -Dr * .12); g.add(meja); keluar.meja = meja;
        var kursi = new T.Group(); var kb = kotakBulat(.55, .1, .55, .04, D.bahan('#2E2A36')); kb.position.y = .48; kursi.add(kb); var sd = kotakBulat(.55, .7, .1, .05, D.bahan('#2E2A36')); sd.position.set(0, .85, -.26); kursi.add(sd); kursi.add(tabung(.03, .03, .45, D.bahan('#5A5662'), 0, 0, 0, 8));
        kursi.position.set(Wr * .1, 0, -Dr * .12 - .75); g.add(kursi); keluar.kursi = kursi;
        var rak = new T.Group(), mr = D.bahan('#FFFFFF', { map: ulang(TEX.kayu('#7A4A2E'), 1, 1) });
        rak.add(kotak(1.4, 2.1, .38, mr, 0, 1.05, 0));
        for (var rr = 0; rr < 4; rr++) for (var bb = 0; bb < 6; bb++) rak.add(kotak(.12 + (bb % 3) * .03, .32, .26, D.bahan(['#C4262E', '#2E7D63', '#E2C06E', '#3F6FB5', '#F4F0E4'][(rr * 6 + bb) % 5]), -.5 + bb * .2, .35 + rr * .5, .08));
        rak.position.set(Wr / 2 - .35, 0, -Dr * .25); rak.rotation.y = -PI / 2; g.add(rak);
        var pu = D.pohonUang({}); pu.position.set(-Wr / 2 + .6, 0, -Dr / 2 + .6); g.add(pu);
      }
      g.userData = keluar; return g;
    };

    /* ================= NPC / WARGA ================= */
    /* warga yang lalu-lalang: jalur = [[x,z],[x,z],...] bolak-balik; tiap warga beda rupa, kecepatan, fase */
    D.warga = function (a) {
      a = Object.assign({ n: 6, jalur: [[-4, 20], [-4, -30]], laju: [.9, 1.4], benih: 1, tinggi: [1.35, 1.6], anak: .2 }, a || {});
      var r = rng(a.benih * 97 + 13), K = G.TOKOH_TOON, daftar = [];
      var P = a.jalur.map(function (p) { return new T.Vector2(p[0], p[1]); }), seg = [], total = 0;
      for (var i = 0; i < P.length - 1; i++) { var l = P[i].distanceTo(P[i + 1]); seg.push(l); total += l; }
      function titikPada(d) {   // jarak di jalur (bolak-balik) → posisi + arah
        var m = d % (2 * total); var maju = m < total; var x = maju ? m : 2 * total - m;
        for (var i = 0; i < seg.length; i++) { if (x <= seg[i] || i === seg.length - 1) { var k = cl(x / seg[i], 0, 1), p = P[i].clone().lerp(P[i + 1], k), dir = P[i + 1].clone().sub(P[i]).normalize(); if (!maju) dir.negate(); return { p: p, dir: dir }; } x -= seg[i]; }
      }
      for (var w = 0; w < a.n; w++) {
        var anak = r() < a.anak, rupa = K.rupaAcak(Math.floor(r() * 1e6), anak);
        var tk = D.tokoh({ tinggi: anak ? 1.05 + r() * .1 : lr(a.tinggi[0], a.tinggi[1], r()), res: 1.1 });
        daftar.push({ tk: tk, rupa: rupa, v: lr(a.laju[0], a.laju[1], r()) * (anak ? 1.15 : 1), d0: r() * total * 2, benih: w + 20, lebar: (r() - .5) * 1.2, pegang: r() < .25 ? K.pilihBarang(r) : null });
      }
      var ob = { daftar: daftar };
      ob.atur = function (t) {
        var ca = new T.Vector3(); cam.getWorldDirection(ca); var kanan = new T.Vector3().crossVectors(ca, cam.up).normalize();
        daftar.forEach(function (w) {
          var d = w.d0 + t * w.v, q = titikPada(d), x = q.p.x + w.lebar * q.dir.y, z = q.p.y - w.lebar * q.dir.x;
          var dir3 = new T.Vector3(q.dir.x, 0, q.dir.y), layarX = dir3.dot(kanan), keKamera = -dir3.dot(ca);
          w.tk.atur(x, z, { rupa: w.rupa, jalan: 1, fase: K.faseDariJarak(d, w.tk.tinggi * .36), hadap: cl(layarX * 1.3, -1, 1) * (1 - Math.max(0, keKamera) * .4), t: t, benih: w.benih, ekspresi: 'senyum', pegang: w.pegang, pose: w.pegang ? { L: { a: 10, j: .97 }, R: { a: -20, j: .7, d: 1 } } : 'diri' });
        });
      };
      return ob;
    };

    D.motor = function (a) {
      a = Object.assign({ warna: '#D33A3A' }, a || {});
      var g = new T.Group();
      [-1, 1].forEach(function (s) { var rd = tabung(.28, .28, .1, D.bahan('#26232C'), 0, 0, 0, 16); rd.rotation.z = PI / 2; rd.position.set(0, .28, s * .62); g.add(rd); });
      var bd = kotakBulat(.32, .4, 1.1, .14, D.bahan(a.warna)); bd.position.set(0, .62, 0); g.add(bd);
      var jk = kotakBulat(.3, .12, .6, .05, D.bahan('#2A2430')); jk.position.set(0, .86, -.12); g.add(jk);
      var st = tabung(.02, .02, .7, D.bahan('#4A4652'), 0, 0, 0, 6); st.rotation.z = PI / 2; st.position.set(0, 1.08, .5); g.add(st);
      return g;
    };

    D.papan = function (a) {   // papan bergambar di tiang (mis. "DIJUAL")
      a = Object.assign({ lebar: 1.2, tinggi: .8, tiang: 1.1, gambar: null, res: 512 }, a || {});
      var g = new T.Group(), cv = document.createElement('canvas'); cv.width = a.res; cv.height = Math.round(a.res * a.tinggi / a.lebar);
      if (a.gambar) a.gambar(cv.getContext('2d'), cv.width, cv.height);
      var tx = new T.CanvasTexture(cv); tx.encoding = T.sRGBEncoding; tx.anisotropy = 8;
      var pp = kotak(a.lebar, a.tinggi, .04, [D.bahan('#EEE'), D.bahan('#EEE'), D.bahan('#EEE'), D.bahan('#EEE'), D.bahan('#FFFFFF', { map: tx }), D.bahan('#E8E2D8')], 0, a.tiang + a.tinggi / 2, 0);
      g.add(pp); g.add(tabung(.035, .035, a.tiang + a.tinggi * .9, D.bahan('#7A5236'), 0, 0, -.04, 8));
      g.userData = { kanvas: cv, tekstur: tx }; return g;
    };

    D.bangku = function (a) {
      a = Object.assign({ warna: '#8A5A3C' }, a || {});
      var g = new T.Group(), mk = D.bahan('#FFFFFF', { map: ulang(TEX.kayu(a.warna), 1, .3) });
      for (var i = 0; i < 3; i++) g.add(kotak(1.6, .05, .12, mk, 0, .45, -.16 + i * .16));
      for (var j = 0; j < 2; j++) g.add(kotak(1.6, .1, .04, mk, 0, .65 + j * .16, -.26));
      [-1, 1].forEach(function (s) { g.add(kotak(.06, .45, .4, D.bahan('#2E2A36'), s * .7, .22, 0)); });
      return g;
    };

    D.bukit = function (a) {   // bukit/gunung jauh di cakrawala (tertelan kabut = kedalaman)
      a = Object.assign({ n: 9, jarak: 170, lebar: 340, warna: '#7FA06A', benih: 3, tinggi: 11 }, a || {});
      var g = new T.Group(), r = rng(a.benih);
      for (var i = 0; i < a.n; i++) {
        var w = a.lebar / a.n * (1.4 + r()), h = a.tinggi * (.5 + r() * .7);
        var b = bola(1, D.bahan(jit(r, a.warna, .1)), (i / (a.n - 1) - .5) * a.lebar, -h * .15, -a.jarak - r() * 50, w * .5, h, w * .3);
        b.castShadow = false; g.add(b);
      }
      return lapisan(g, 1);
    };

    D.awan = function (a) {
      a = Object.assign({ n: 6, jarak: 260, tinggi: [30, 90], sebar: 300, benih: 1, besar: 1 }, a || {});
      var g = new T.Group(), r = rng(a.benih * 77);
      var ob = { grup: g, perbarui: function () {
        var P = D.preset || LANGIT.siang;
        g.children.forEach(function (m, i) { m.material.map = TEX.awan(a.benih * 10 + i, P.awan); m.material.needsUpdate = true; });
      } };
      for (var i = 0; i < a.n; i++) {
        var w = (40 + r() * 50) * a.besar, m = new T.Mesh(new T.PlaneGeometry(w, w / 2), new T.MeshBasicMaterial({ transparent: true, depthWrite: false, fog: false, color: 0xffffff }));
        var an = (r() - .5) * a.sebar / a.jarak; m.position.set(Math.sin(an) * a.jarak, lr(a.tinggi[0], a.tinggi[1], r()), -Math.cos(an) * a.jarak);
        m.userData.v = .3 + r() * .6; m.userData.x0 = m.position.x; m.renderOrder = -1; g.add(m);
      }
      lapisan(g, 2); D._awan.push(ob); ob.perbarui();
      return g;
    };

    /* ================= TOKOH SEBAGAI KARTU ================= */
    D.tokoh = function (a) {
      a = Object.assign({ tinggi: 1.55, res: 1.6, bayangan: true, bayangNyata: false }, a || {});
      var K = G.TOKOH_TOON; if (!K) { console.error('muat toon-tokoh.js'); }
      var cw = Math.round(600 * a.res), chh = Math.round(1000 * a.res), cv = document.createElement('canvas'); cv.width = cw; cv.height = chh;
      var ctx = cv.getContext('2d'), tx = new T.CanvasTexture(cv); tx.encoding = T.sRGBEncoding; tx.anisotropy = 8;
      var skala = a.tinggi / .69;   // tinggi tubuh ±69 % tinggi kanvas desain
      var geo = new T.PlaneGeometry(skala * .6, skala); geo.translate(0, skala * (.5 - .025), 0);
      var mat = new T.MeshBasicMaterial({ map: tx, alphaTest: .45, side: T.DoubleSide, fog: true });
      var m = new T.Mesh(geo, mat); m.layers.set(1);
      if (a.bayangNyata) { m.castShadow = true; m.customDepthMaterial = new T.MeshDepthMaterial({ depthPacking: T.RGBADepthPacking, map: tx, alphaTest: .45 }); }
      var grup = new T.Group(); grup.add(m);
      var blob = null;
      if (a.bayangan) {
        blob = new T.Mesh(new T.PlaneGeometry(skala * .42, skala * .16), new T.MeshBasicMaterial({ map: TEX.bulat(), color: 0x1a1030, transparent: true, opacity: .42, depthWrite: false }));
        blob.rotation.x = -PI / 2; blob.position.y = .015; blob.layers.set(1); grup.add(blob);
      }
      scene.add(grup);
      var ob = { grup: grup, mesh: m, kanvas: cv, skala: skala, tinggi: a.tinggi };
      ob.atur = function (x, z, opsi, y) {
        opsi = opsi || {}; grup.position.set(x, y || 0, z);
        grup.visible = opsi.tampak !== false; if (!grup.visible) return ob;
        m.rotation.y = Math.atan2(cam.position.x - x, cam.position.z - z);
        if (opsi.skala) m.scale.setScalar(opsi.skala); else m.scale.setScalar(1);
        if (blob) blob.scale.setScalar(opsi.skala || 1);
        var o2 = Object.assign({}, opsi); if (o2.cahaya == null) o2.cahaya = D.cahaya2D();
        ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, cw, chh); ctx.setTransform(a.res, 0, 0, a.res, 0, 0);
        K.gambar(ctx, o2); tx.needsUpdate = true;
        mat.color.copy(D.tintTokoh || new T.Color(1, 1, 1));
        if (opsi.terang) mat.color.multiplyScalar(opsi.terang);
        return ob;
      };
      ob.kepala = function () { return D.layar(grup.position.x, grup.position.y + a.tinggi * .86 * (m.scale.x), grup.position.z); };
      D._kartu.push(ob);
      return ob;
    };
    /* arah cahaya matahari di layar (sudut kanvas, arah DATANG cahaya) untuk tokoh 2D */
    D.cahaya2D = function () {
      var d = (D.arahMatahari || new T.Vector3(.5, .7, .5)).clone().transformDirection(cam.matrixWorldInverse);
      var a = Math.atan2(-d.y, d.x);
      if (d.z < -.6) a = Math.atan2(-d.y, d.x * .4);   // cahaya dari belakang tokoh: tetap dari samping atas
      return a;
    };
    D.layar = function (x, y, z) {
      var v = new T.Vector3(x, y, z).project(cam); return [(v.x + 1) / 2 * Wd, (1 - v.y) / 2 * Hd, v.z];
    };

    /* ================= KAMERA ================= */
    D.kamera = function (pos, lihat, fov, gulung) {
      cam.position.set(pos[0], pos[1], pos[2]); if (fov) { cam.fov = fov; cam.updateProjectionMatrix(); }
      cam.up.set(Math.sin(gulung || 0), Math.cos(gulung || 0), 0); cam.lookAt(lihat[0], lihat[1], lihat[2]);
      cam.updateMatrixWorld();
      U.fokus.value = D._fokusOto === false ? U.fokus.value : Math.hypot(pos[0] - lihat[0], pos[1] - lihat[1], pos[2] - lihat[2]);
      return D;
    };
    /* jalur kamera halus: keys = [{t, pos:[x,y,z], lihat:[x,y,z], fov, ease:'io'|'lin'}]
       Spline Catmull-Rom lewat semua titik; tiap ruas memakai ease sendiri (bawaan 'io' = mulai & berhenti lembut). */
    D.jalurKamera = function (keys) {
      var P = new T.CatmullRomCurve3(keys.map(function (k) { return new T.Vector3(k.pos[0], k.pos[1], k.pos[2]); }), false, 'centripetal');
      var L = new T.CatmullRomCurve3(keys.map(function (k) { return new T.Vector3(k.lihat[0], k.lihat[1], k.lihat[2]); }), false, 'centripetal');
      var n = keys.length;
      return function (t, goyang) {
        var i = 0; while (i < n - 2 && t >= keys[i + 1].t) i++;
        var a = keys[i], b = keys[i + 1] || a, x = b.t > a.t ? cl((t - a.t) / (b.t - a.t), 0, 1) : 1;
        var e = (b.ease === 'lin') ? x : (b.ease === 'out' ? 1 - Math.pow(1 - x, 3) : (b.ease === 'in' ? x * x * x : (x < .5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2)));
        var u = n > 1 ? (i + e) / (n - 1) : 0, p = P.getPoint(u), l = L.getPoint(u), fov = lr(a.fov || 36, b.fov || a.fov || 36, e);
        var g = goyang || 0, h = [Math.sin(t * 1.3) * .5 + Math.sin(t * 2.9 + 1) * .3, Math.sin(t * 1.7 + 2) * .4 + Math.sin(t * 3.3) * .2];
        D.kamera([p.x + h[0] * .05 * g, p.y + h[1] * .05 * g, p.z], [l.x + h[0] * .03 * g, l.y + h[1] * .03 * g, l.z], fov, Math.sin(t * .9) * .004 * g);
        return { pos: p, lihat: l };
      };
    };
    /* guncangan kamera sesaat (benturan): panggil setelah D.kamera */
    D.guncang = function (t, t0, kuat, lama) {
      var x = t - t0; lama = lama || .45; if (x < 0 || x > lama) return;
      var k = (kuat || .15) * Math.pow(1 - x / lama, 2);
      cam.position.x += Math.sin(x * 61) * k; cam.position.y += Math.sin(x * 47 + 1) * k * .7; cam.rotation.z += Math.sin(x * 53) * k * .05;
      cam.updateMatrixWorld();
    };
    D.fokusOtomatis = function (on) { D._fokusOto = on; return D; };

    /* ================= RENDER ================= */
    D.render = function (t) {
      t = t || 0; U.waktu.value = Math.floor(t * 24) / 24;
      cam.updateMatrixWorld(); aturMatahari();
      langit.position.copy(cam.position);
      D._awan.forEach(function (w) { w.grup.position.set(cam.position.x * .9, 0, cam.position.z * .9); w.grup.children.forEach(function (m) { m.position.x = m.userData.x0 + t * m.userData.v; m.lookAt(cam.position.x, m.position.y * .6, cam.position.z); }); });
      // bayangan sekali
      ren.shadowMap.needsUpdate = true;
      // pas normal (lapisan 0 saja = objek bertinta)
      cam.layers.set(0); scene.overrideMaterial = mNormal; var fogS = scene.fog; scene.fog = null; var bg = scene.background; scene.background = null;
      ren.setRenderTarget(rtN); ren.setClearColor(0x8080ff, 1); ren.clear(); ren.render(scene, cam);
      scene.overrideMaterial = null; scene.fog = fogS; scene.background = bg;
      // pas utama
      cam.layers.enableAll(); ren.setRenderTarget(rtM); ren.setClearColor(0x000000, 1); ren.clear(); ren.render(scene, cam);
      // blur 1/3 & 1/8
      quad.material = mTurun; mTurun.uniforms.tSrc.value = rtM.texture; mTurun.uniforms.px.value.set(1 / rw, 1 / rh); ren.setRenderTarget(rtA); ren.render(layar, ocam);
      quad.material = mBlur; mBlur.uniforms.tSrc.value = rtA.texture; mBlur.uniforms.dir.value.set(1 / bw, 0); ren.setRenderTarget(rtB); ren.render(layar, ocam);
      mBlur.uniforms.tSrc.value = rtB.texture; mBlur.uniforms.dir.value.set(0, 1 / bh); ren.setRenderTarget(rtA); ren.render(layar, ocam);
      quad.material = mTurun; mTurun.uniforms.tSrc.value = rtA.texture; mTurun.uniforms.px.value.set(1 / bw, 1 / bh); ren.setRenderTarget(rtC); ren.render(layar, ocam);
      quad.material = mBlur; mBlur.uniforms.tSrc.value = rtC.texture; mBlur.uniforms.dir.value.set(1.5 / cw, 0); ren.setRenderTarget(rtD); ren.render(layar, ocam);
      mBlur.uniforms.tSrc.value = rtD.texture; mBlur.uniforms.dir.value.set(0, 1.5 / ch); ren.setRenderTarget(rtC); ren.render(layar, ocam);
      // gabung
      U.near.value = cam.near; U.far.value = cam.far;
      quad.material = mAkhir; ren.setRenderTarget(null); ren.render(layar, ocam);
    };

    D.atur(Object.assign({ langit: o.langit || 'siang' }, o));
    return D;
  }

  G.TOON3D = { mulai: mulai, TEX: TEX, LANGIT: LANGIT, rng: rng };
})(window);
