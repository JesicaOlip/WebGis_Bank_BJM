// HEADER + TOMBOL KEMBALI
(function () {
  // buat elemen header
  var h = document.createElement('header');
  h.id = 'wg-header';
  h.innerHTML =
    '<div><h1>WebGIS Kantor Bank Kota Banjarmasin</h1>' +
    '<p>Sebaran 62 kantor bank umum di lima kecamatan</p></div>' +
    '<nav id="wg-nav"><a href="beranda.html">Beranda</a>' +
    '<button id="wg-reset" type="button">Kembali ke Banjarmasin</button></nav>';
  document.body.insertBefore(h, document.body.firstChild);

  // tombol reset posisi peta
  document.getElementById('wg-reset').addEventListener('click', function () {
    map.setView([-3.3098, 114.6015], 12);
  });

  // perbaiki ukuran peta setelah header muncul
  setTimeout(function () { map.invalidateSize(); }, 200);
})();

/* ===== Fondasi WG + filter ===== */
(function () {
  // DAFTAR KELOMPOK BANK (layer + warna)
  var GROUPS = [
    { jenis: 'BUMN',   layer: layer_BankBUMN_11,   warna: '#0072B2', nama: 'Bank BUMN' },
    { jenis: 'SWASTA', layer: layer_BankSwasta_10, warna: '#CC79A7', nama: 'Bank Swasta' },
    { jenis: 'BPD',    layer: layer_BankBPD_9,     warna: '#009E73', nama: 'Bank BPD' }
  ];

  // KUMPULKAN DATA DARI SEMUA LAYER
  var data = [];
  GROUPS.forEach(function (g) {
    g.layer.eachLayer(function (l) {
      var p = l.feature.properties, ll = l.getLatLng();
      data.push({
        id: p['ID'], nama: p['Nama Bank'], bank: p['Bank'], jenis: g.jenis,
        kantor: p['Jenis Kant'], kecamatan: p['Kecamatan'], alamat: p['Alamat'],
        jam: p['Jam Operas'], lat: ll.lat, lng: ll.lng, marker: l, grup: g
      });
    });
  });

  // STATE FILTER + DAFTAR LISTENER
  var S = { jenis: { BUMN: true, SWASTA: true, BPD: true }, kantor: '', kec: '' };
  var listeners = [];

  // CEK DATA LOLOS FILTER ATAU TIDAK
  function lolos(d) {
    return S.jenis[d.jenis] && (!S.kantor || d.kantor === S.kantor) && (!S.kec || d.kecamatan === S.kec);
  }
  function getVisible() { return data.filter(lolos); }

  // TERAPKAN FILTER KE PETA + UPDATE JUMLAH
  function apply() {
    data.forEach(function (d) {
      var on = lolos(d), has = d.grup.layer.hasLayer(d.marker);
      if (on && !has) d.grup.layer.addLayer(d.marker);
      if (!on && has) d.grup.layer.removeLayer(d.marker);
    });
    document.getElementById('wg-count').textContent =
      'Menampilkan ' + getVisible().length + ' dari ' + data.length + ' kantor';
    listeners.forEach(function (fn) { fn(getVisible()); });
  }

  // RESET FILTER
  function reset() {
    S.jenis = { BUMN: true, SWASTA: true, BPD: true };
    S.kantor = ''; S.kec = '';
    document.querySelectorAll('#wg-panel input[data-j]').forEach(function (c) { c.checked = true; });
    document.getElementById('wg-kantor').value = '';
    document.getElementById('wg-kec').value = '';
    apply();
  }

  // DAFTAR KECAMATAN UNTUK DROPDOWN
  var kecList = [];
  data.forEach(function (d) { if (d.kecamatan && kecList.indexOf(d.kecamatan) < 0) kecList.push(d.kecamatan); });
  kecList.sort();

  // BUAT PANEL FILTER
  var panel = document.createElement('aside');
  panel.id = 'wg-panel';
  panel.innerHTML =
    '<div id="wg-panel-head"><span>Filter</span>' +
    '<button id="wg-panel-toggle" type="button" aria-label="Buka/tutup panel filter">−</button></div>' +
    '<div id="wg-panel-body">' +
    '<h3>Jenis bank</h3>' +
    GROUPS.map(function (g) {
      return '<label class="wg-ck"><input type="checkbox" data-j="' + g.jenis + '" checked>' +
             '<span class="wg-dot" style="background:' + g.warna + '"></span>' + g.nama + '</label>';
    }).join('') +
    '<h3>Jenis kantor</h3>' +
    '<select id="wg-kantor" aria-label="Jenis kantor"><option value="">Semua (KCU, KCP, Unit)</option>' +
    '<option>KCU</option><option>KCP</option><option>Unit</option></select>' +
    '<h3>Kecamatan</h3>' +
    '<select id="wg-kec" aria-label="Kecamatan"><option value="">Semua kecamatan</option>' +
    kecList.map(function (k) { return '<option>' + k + '</option>'; }).join('') + '</select>' +
    '<p id="wg-count" aria-live="polite"></p>' +
    '<button id="wg-filter-reset" type="button">Reset filter</button>' +
    '</div>';
  document.body.appendChild(panel);

  // EVENT: PERUBAHAN FILTER
  panel.addEventListener('change', function (e) {
    var t = e.target;
    if (t.dataset && t.dataset.j) S.jenis[t.dataset.j] = t.checked;
    else if (t.id === 'wg-kantor') S.kantor = t.value;
    else if (t.id === 'wg-kec') S.kec = t.value;
    apply();
  });
  // EVENT: TOMBOL RESET + BUKA/TUTUP PANEL
  document.getElementById('wg-filter-reset').addEventListener('click', reset);
  document.getElementById('wg-panel-toggle').addEventListener('click', function () {
    var tutup = panel.classList.toggle('tutup');
    this.textContent = tutup ? '+' : '−';
  });
  // PANEL TERTUTUP OTOMATIS DI LAYAR KECIL
  if (window.innerWidth < 650) {
    panel.classList.add('tutup');
    document.getElementById('wg-panel-toggle').textContent = '+';
  }

  // EKSPOR OBJEK GLOBAL WG
  window.WG = {
    data: data,
    getVisible: getVisible,
    onChange: function (fn) { listeners.push(fn); },
    reset: reset
  };
  apply();
})();

/* ===== Ukuran titik sesuai jenis kantor ===== */
(function () {
  // RADIUS PER JENIS KANTOR
  var UKURAN = { KCU: 9, KCP: 7, Unit: 5 };
  // TERAPKAN RADIUS KE MARKER
  WG.data.forEach(function (d) {
    var r = UKURAN[d.kantor];
    if (r && d.marker && typeof d.marker.setRadius === 'function') d.marker.setRadius(r);
  });
})();

/* ===== Statistik per kecamatan ===== */
(function () {
  // BUAT KOTAK STATISTIK DI DALAM PANEL
  var body = document.getElementById('wg-panel-body');
  var box = document.createElement('div');
  box.id = 'wg-stat';
  box.innerHTML = '<h3>Jumlah kantor per kecamatan</h3><div id="wg-stat-bars"></div>' +
                  '<p class="wg-stat-note">Batang oranye = kecamatan dengan kantor paling sedikit.</p>';
  body.appendChild(box);

  // HITUNG TOTAL + URUTKAN KECAMATAN
  var total = {};
  WG.data.forEach(function (d) { total[d.kecamatan] = (total[d.kecamatan] || 0) + 1; });
  var kecs = Object.keys(total).sort(function (a, b) { return total[b] - total[a]; });
  var maxAll = Math.max.apply(null, kecs.map(function (k) { return total[k]; }));

  // GAMBAR BATANG STATISTIK (IKUT FILTER)
  function render(list) {
    var c = {};
    kecs.forEach(function (k) { c[k] = 0; });
    list.forEach(function (d) { c[d.kecamatan]++; });
    var vals = kecs.map(function (k) { return c[k]; });
    var min = Math.min.apply(null, vals), max = Math.max.apply(null, vals);
    document.getElementById('wg-stat-bars').innerHTML = kecs.map(function (k) {
      var low = max > min && c[k] === min;
      return '<div class="wg-bar' + (low ? ' low' : '') + '">' +
        '<span>' + k.replace('Banjarmasin ', '') + '</span>' +
        '<span class="track"><span class="fill" style="width:' + (c[k] / maxAll * 100) + '%"></span></span>' +
        '<b>' + c[k] + '</b></div>';
    }).join('');
  }
  // DAFTARKAN KE FILTER + RENDER AWAL
  WG.onChange(render);
  render(WG.getVisible());
})();

/* ===== Legenda ===== */
(function () {
  // FUNGSI BUAT IKON SVG (BULAT / KOTAK / SEGITIGA)
  function ikon(bentuk, warna, r) {
    var s = r * 2 + 4, c = s / 2, isi;
    if (bentuk === 'kotak') isi = '<rect x="2" y="2" width="' + (r * 2) + '" height="' + (r * 2) + '" fill="' + warna + '" stroke="#222" stroke-width="1.5"/>';
    else if (bentuk === 'segitiga') isi = '<polygon points="' + c + ',2 ' + (s - 2) + ',' + (s - 2) + ' 2,' + (s - 2) + '" fill="' + warna + '" stroke="#222" stroke-width="1.5"/>';
    else isi = '<circle cx="' + c + '" cy="' + c + '" r="' + r + '" fill="' + warna + '" stroke="#222" stroke-width="1.5"/>';
    return '<svg width="' + s + '" height="' + s + '" aria-hidden="true">' + isi + '</svg>';
  }
  // BUAT ISI LEGENDA
  var lg = document.createElement('aside');
  lg.id = 'wg-legend';
  lg.innerHTML =
    '<div id="wg-legend-head"><span>Legenda</span>' +
    '<button id="wg-legend-toggle" type="button" aria-label="Buka/tutup legenda">−</button></div>' +
    '<div id="wg-legend-body">' +
    '<h4>Jenis bank</h4>' +
    '<div class="wg-lg-row">' + ikon('bulat', '#0072B2', 7) + 'Bank BUMN</div>' +
    '<div class="wg-lg-row">' + ikon('kotak', '#CC79A7', 7) + 'Bank Swasta</div>' +
    '<div class="wg-lg-row">' + ikon('segitiga', '#009E73', 7) + 'Bank BPD</div>' +
    '<h4>Ukuran = jenis kantor</h4>' +
    '<div class="wg-lg-row">' + ikon('bulat', '#9AA5B1', 9) + 'KCU (kantor cabang utama)</div>' +
    '<div class="wg-lg-row">' + ikon('bulat', '#9AA5B1', 7) + 'KCP (kantor cabang pembantu)</div>' +
    '<div class="wg-lg-row">' + ikon('bulat', '#9AA5B1', 5) + 'Unit</div>' +
    '</div>';
  document.body.appendChild(lg);
  // TOMBOL BUKA/TUTUP LEGENDA
  var tg = document.getElementById('wg-legend-toggle');
  tg.addEventListener('click', function () {
    var tutup = lg.classList.toggle('tutup');
    tg.textContent = tutup ? '+' : '−';
  });
  // LEGENDA TERTUTUP OTOMATIS DI LAYAR KECIL
  if (window.innerWidth < 650) { lg.classList.add('tutup'); tg.textContent = '+'; }
})();

/* ===== Perapian: jumlah kantor di header ikut data ===== */
(function () {
  // UPDATE TEKS HEADER SESUAI JUMLAH DATA
  var p = document.querySelector('#wg-header p');
  if (p) p.textContent = 'Sebaran ' + WG.data.length + ' kantor bank umum di lima kecamatan';
})();

/* ===== Heatmap: masuk daftar layer + ikut filter ===== */
(function () {
  // UBAH DATA JADI TITIK HEATMAP
  function titik(list) {
    return list.map(function (d) { return [d.lat, d.lng, 1]; });
  }

  // BUAT LAYER HEATMAP + GRADIEN WARNA
  var heat = L.heatLayer(titik(WG.getVisible()), {
    radius: 28, blur: 22, maxZoom: 15, minOpacity: 0.35,
    gradient: {
      0.0:  'rgba(255,255,178,0)',
      0.33: '#fecc5c',
      0.66: '#fd8d3c',
      1.0:  '#e31a1c'
    }
  });

  // pindahkan kanvas ke pane di atas choropleth supaya tidak tertutup
  heat.on('add', function () {
    var pane = map.getPane('pane_HeatmapKantorBank_3');
    if (pane && heat._canvas) {
      pane.appendChild(heat._canvas);
      heat._canvas.style.pointerEvents = 'none';
    }
  });

  // MASUKKAN HEATMAP KE DAFTAR LAYER
  lay.addOverlay(heat, 'Heatmap Kantor Bank');

  // HEATMAP IKUT FILTER
  WG.onChange(function (list) { heat.setLatLngs(titik(list)); });
})();