(function () {
  var h = document.createElement('header');
  h.id = 'wg-header';
  h.innerHTML =
    '<div><h1>WebGIS Kantor Bank Kota Banjarmasin</h1>' +
    '<p>Sebaran 62 kantor bank umum di lima kecamatan</p></div>' +
    '<button id="wg-reset" type="button">Kembali ke Banjarmasin</button>';
  document.body.insertBefore(h, document.body.firstChild);

  document.getElementById('wg-reset').addEventListener('click', function () {
    map.setView([-3.3098, 114.6015], 12);
  });

  setTimeout(function () { map.invalidateSize(); }, 200);
})();

/* ===== Fondasi WG + filter ===== */
(function () {
  var GROUPS = [
    { jenis: 'BUMN',   layer: layer_BankBUMN_12,   warna: '#0072B2', nama: 'Bank BUMN' },
    { jenis: 'SWASTA', layer: layer_BankSwasta_11, warna: '#CC79A7', nama: 'Bank Swasta' },
    { jenis: 'BPD',    layer: layer_BankBPD_10,    warna: '#009E73', nama: 'Bank BPD' }
  ];

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

  var S = { jenis: { BUMN: true, SWASTA: true, BPD: true }, kantor: '', kec: '' };
  var listeners = [];

  function lolos(d) {
    return S.jenis[d.jenis] && (!S.kantor || d.kantor === S.kantor) && (!S.kec || d.kecamatan === S.kec);
  }
  function getVisible() { return data.filter(lolos); }

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

  function reset() {
    S.jenis = { BUMN: true, SWASTA: true, BPD: true };
    S.kantor = ''; S.kec = '';
    document.querySelectorAll('#wg-panel input[data-j]').forEach(function (c) { c.checked = true; });
    document.getElementById('wg-kantor').value = '';
    document.getElementById('wg-kec').value = '';
    apply();
  }

  var kecList = [];
  data.forEach(function (d) { if (d.kecamatan && kecList.indexOf(d.kecamatan) < 0) kecList.push(d.kecamatan); });
  kecList.sort();

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

  panel.addEventListener('change', function (e) {
    var t = e.target;
    if (t.dataset && t.dataset.j) S.jenis[t.dataset.j] = t.checked;
    else if (t.id === 'wg-kantor') S.kantor = t.value;
    else if (t.id === 'wg-kec') S.kec = t.value;
    apply();
  });
  document.getElementById('wg-filter-reset').addEventListener('click', reset);
  document.getElementById('wg-panel-toggle').addEventListener('click', function () {
    var tutup = panel.classList.toggle('tutup');
    this.textContent = tutup ? '+' : '−';
  });
  if (window.innerWidth < 650) {
    panel.classList.add('tutup');
    document.getElementById('wg-panel-toggle').textContent = '+';
  }

  window.WG = {
    data: data,
    getVisible: getVisible,
    onChange: function (fn) { listeners.push(fn); },
    reset: reset
  };
  apply();
})();