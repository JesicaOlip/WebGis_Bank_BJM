var WFU = function() {
  var HARI = [ 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min' ];
  var AKSES = {
    baikM: 1e3,
    sedangM: 2500
  };
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function(c) {
      return {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
      }[c];
    });
  }
  function haversine(lat1, lng1, lat2, lng2) {
    var R = 6371e3, r = Math.PI / 180, dLat = (lat2 - lat1) * r, dLng = (lng2 - lng1) * r;
    var x = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(lat1 * r) * Math.cos(lat2 * r) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
    return 2 * R * Math.asin(Math.sqrt(x));
  }
  function fmtJarak(m) {
    return m < 1e3 ? Math.round(m) + ' m' : (m / 1e3).toLocaleString('id-ID', {
      maximumFractionDigits: 1
    }) + ' km';
  }
  function menit(t) {
    var p = t.split('.');
    return +p[0] * 60 + (+p[1] || 0);
  }
  function hhmm(m) {
    return ('0' + Math.floor(m / 60)).slice(-2) + '.' + ('0' + m % 60).slice(-2);
  }
  function parseJam(s) {
    var minggu = [ null, null, null, null, null, null, null ], baris = [];
    String(s || '').split(';').forEach(function(seg) {
      var m = seg.trim().match(/^(\w{3})(?:-(\w{3}))?\s+(.+)$/);
      if (!m) return;
      var a = HARI.indexOf(m[1]), b = m[2] ? HARI.indexOf(m[2]) : a;
      if (a < 0 || b < 0) return;
      var w = m[3].trim().toLowerCase().match(/^(\d{2}\.\d{2})-(\d{2}\.\d{2})$/);
      for (var i = a; i <= b; i++) minggu[i] = w ? [ menit(w[1]), menit(w[2]) ] : null;
      baris.push({
        hari: a === b ? HARI[a] : HARI[a] + '–' + HARI[b],
        waktu: w ? w[1] + '–' + w[2] : 'Tutup'
      });
    });
    return {
      baris: baris,
      minggu: minggu
    };
  }
  function wita() {
    var d = new Date(Date.now() + 8 * 36e5);
    return {
      hari: (d.getUTCDay() + 6) % 7,
      mnt: d.getUTCHours() * 60 + d.getUTCMinutes()
    };
  }
  function status(p, now) {
    now = now || wita();
    var t = p.minggu[now.hari];
    if (t && now.mnt >= t[0] && now.mnt < t[1]) return {
      buka: true,
      teks: 'Buka sekarang',
      info: 'tutup pukul ' + hhmm(t[1])
    };
    if (t && now.mnt < t[0]) return {
      buka: false,
      teks: 'Sedang tutup',
      info: 'buka hari ini pukul ' + hhmm(t[0])
    };
    for (var i = 1; i <= 7; i++) {
      var h = (now.hari + i) % 7, u = p.minggu[h];
      if (u) return {
        buka: false,
        teks: 'Sedang tutup',
        info: 'buka ' + (i === 1 ? 'besok' : HARI[h]) + ' pukul ' + hhmm(u[0])
      };
    }
    return {
      buka: false,
      teks: 'Sedang tutup',
      info: ''
    };
  }
  function klasifikasi(m) {
    return m <= AKSES.baikM ? 'baik' : m <= AKSES.sedangM ? 'sedang' : 'rendah';
  }
  return {
    esc: esc,
    haversine: haversine,
    fmtJarak: fmtJarak,
    parseJam: parseJam,
    status: status,
    wita: wita,
    klasifikasi: klasifikasi,
    AKSES: AKSES
  };
}();

(function() {
  if (!window.map || !window.WG) {
    console.error('fitur_farissa.js: map/WG tidak ditemukan. Pastikan fitur_jesica.js dimuat sebelum file ini.');
    return;
  }
  var U = WFU, esc = U.esc;
  var RADIUS = 2500;
  var FOTO_DIR = 'images/kantor/';
  var FOTO_EXT = [ 'jpg', 'jpeg', 'png', 'webp' ];
  var LABEL = {
    BUMN: 'Bank BUMN',
    SWASTA: 'Bank Swasta',
    BPD: 'Bank BPD'
  };
  var MOBILE = window.innerWidth < 650;
  var all = WG.data.slice().sort(function(a, b) {
    return a.nama.localeCompare(b.nama, 'id');
  });
  var byId = {}, WARNA = {};
  all.forEach(function(d) {
    byId[d.id] = d;
    d.jamP = U.parseJam(d.jam);
    WARNA[d.jenis] = d.grup.warna;
  });
  function dot(jenis) {
    return '<span class="wg-dot" style="background:' + WARNA[jenis] + '"></span>';
  }
  function sekitar(lat, lng, pool, skipId) {
    var best = null, bd = Infinity, dalam = [];
    pool.forEach(function(d) {
      if (d.id === skipId) return;
      var m = U.haversine(lat, lng, d.lat, d.lng);
      if (m < bd) {
        bd = m;
        best = d;
      }
      if (m <= RADIUS) dalam.push(d);
    });
    return {
      terdekat: best,
      jarak: bd,
      dalam: dalam
    };
  }
  function goTo(d) {
    var z = Math.max(map.getZoom(), 16), ll = L.latLng(d.lat, d.lng);
    function buka() {
      d.marker.openPopup();
    }
    if (map.getCenter().distanceTo(ll) < 3 && map.getZoom() >= z) return buka();
    map.once('moveend', buka);
    map.flyTo(ll, z, {
      duration: .6
    });
  }
  function noteScope(n) {
    return n < all.length ? '<p class="wf-note">Dihitung dari ' + n + ' dari ' + all.length + ' kantor yang sedang ditampilkan (mengikuti filter).</p>' : '';
  }
  var PLACEHOLDER = 'data:image/svg+xml;utf8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 180"><rect width="320" height="180" fill="#DEEBF7"/>' + '<g fill="none" stroke="#08306B" stroke-width="3" stroke-linejoin="round"><path d="M105 76l55-26 55 26z"/>' + '<path d="M118 84v32M146 84v32M174 84v32M202 84v32M108 120h104"/></g>' + '<text x="160" y="152" font-family="sans-serif" font-size="13" text-anchor="middle" fill="#5B6770">Foto kantor belum tersedia</text></svg>');
  function fotoEl(d) {
    var img = new Image, i = 0;
    img.loading = 'lazy';
    img.decoding = 'async';
    img.alt = 'Foto kantor ' + d.nama;
    img.onload = function() {
      if (img.src !== PLACEHOLDER) d.foto = img.src;
    };
    img.onerror = function() {
      i++;
      if (i < FOTO_EXT.length) {
        img.src = FOTO_DIR + d.id + '.' + FOTO_EXT[i];
        return;
      }
      img.onerror = null;
      d.foto = PLACEHOLDER;
      img.src = PLACEHOLDER;
      img.alt = 'Foto kantor ' + d.nama + ' belum tersedia';
      img.className = 'kosong';
    };
    if (d.foto === PLACEHOLDER) img.className = 'kosong';
    img.src = d.foto || FOTO_DIR + d.id + '.' + FOTO_EXT[0];
    return img;
  }
  function popupEl(d) {
    var vis = WG.getVisible(), s = sekitar(d.lat, d.lng, vis, d.id), st = U.status(d.jamP);
    var n = {
      BUMN: 0,
      SWASTA: 0,
      BPD: 0
    };
    s.dalam.forEach(function(x) {
      n[x.jenis]++;
    });
    var el = document.createElement('div');
    el.className = 'wf-pop';
    el.innerHTML = '<div class="wf-foto"></div><div class="wf-body">' + '<div class="wf-tipe">' + dot(d.jenis) + esc(LABEL[d.jenis]) + ' (' + esc(d.kantor) + ')</div>' + '<h3>' + esc(d.nama) + '</h3>' + '<p class="wf-alamat">' + esc(d.alamat) + '</p>' + '<h4>Jam operasional</h4>' + '<p class="wf-st ' + (st.buka ? 'buka' : 'tutup') + '"><span aria-hidden="true">' + (st.buka ? '✔' : '✖') + '</span> ' + st.teks + (st.info ? ' <small>(' + st.info + ')</small>' : '') + '</p>' + '<dl class="wf-jam">' + d.jamP.baris.map(function(b) {
      return '<dt>' + b.hari + '</dt><dd>' + b.waktu + '</dd>';
    }).join('') + '</dl>' + '<h4>Bank terdekat</h4>' + (s.terdekat ? '<button type="button" class="wf-near" data-id="' + esc(s.terdekat.id) + '">' + dot(s.terdekat.jenis) + '<span class="wf-near-n">' + esc(s.terdekat.nama) + '</span><b>' + U.fmtJarak(s.jarak) + '</b></button>' : '<p class="wf-mut">Tidak ada kantor lain yang sedang ditampilkan.</p>') + '<h4>Dalam radius ' + U.fmtJarak(RADIUS) + '</h4>' + '<p class="wf-rad"><b>' + s.dalam.length + '</b> kantor bank lain</p>' + '<ul class="wf-rinci">' + Object.keys(LABEL).map(function(k) {
      return '<li>' + dot(k) + LABEL[k] + ' <b>' + n[k] + '</b></li>';
    }).join('') + '</ul>' + noteScope(vis.length) + '</div>';
    el.querySelector('.wf-foto').appendChild(fotoEl(d));
    var near = el.querySelector('.wf-near');
    if (near) near.addEventListener('click', function() {
      goTo(byId[near.getAttribute('data-id')]);
    });
    return el;
  }
  var popupOpt = {
    className: 'wf-popup',
    minWidth: 260,
    maxWidth: Math.min(300, window.innerWidth - 48),
    maxHeight: Math.max(260, window.innerHeight - 160),
    autoPanPaddingTopLeft: [ 16, 84 ],
    autoPanPaddingBottomRight: [ 16, 16 ]
  };
  var aktifId = null, setAktif;
  all.forEach(function(d) {
    d.marker.off('popupopen');
    d.marker.unbindPopup();
    d.marker.bindPopup(function() {
      return popupEl(d);
    }, popupOpt);
    d.marker.on('popupopen', function() {
      setAktif(d.id);
    });
    d.marker.on('popupclose', function() {
      if (aktifId === d.id) setAktif(null);
    });
  });
  var q = '';
  var panel = document.createElement('aside');
  panel.id = 'wf-list';
  panel.innerHTML = '<div id="wf-list-head"><span>Daftar kantor <span id="wf-list-n"></span></span>' + '<button id="wf-list-toggle" type="button" aria-label="Buka/tutup daftar kantor" aria-expanded="true">−</button></div>' + '<div id="wf-list-body"><input id="wf-cari" type="search" placeholder="Cari nama, bank, alamat, kecamatan" ' + 'aria-label="Cari kantor bank" autocomplete="off"><ul id="wf-ul"></ul>' + '<p id="wf-kosong" hidden>Tidak ada kantor yang cocok.</p></div>';
  document.body.appendChild(panel);
  var ul = document.getElementById('wf-ul'), kosong = document.getElementById('wf-kosong'), cari = document.getElementById('wf-cari'), jml = document.getElementById('wf-list-n'), tog = document.getElementById('wf-list-toggle');
  function render() {
    var vis = WG.getVisible(), toks = q.toLowerCase().split(/\s+/).filter(Boolean);
    var hasil = all.filter(function(d) {
      if (vis.indexOf(d) < 0) return false;
      var h = (d.nama + ' ' + d.bank + ' ' + d.alamat + ' ' + d.kecamatan + ' ' + d.kantor + ' ' + LABEL[d.jenis]).toLowerCase();
      return toks.every(function(t) {
        return h.indexOf(t) >= 0;
      });
    });
    ul.innerHTML = hasil.map(function(d) {
      var st = U.status(d.jamP);
      return '<li><button type="button" class="wf-item' + (d.id === aktifId ? ' aktif' : '') + '" data-id="' + esc(d.id) + '">' + dot(d.jenis) + '<span class="wf-it"><b>' + esc(d.nama) + '</b><small>' + esc(d.kecamatan) + ', ' + esc(d.kantor) + '</small></span>' + '<span class="wf-itst ' + (st.buka ? 'buka' : 'tutup') + '"><span aria-hidden="true">' + (st.buka ? '✔' : '✖') + '</span> ' + (st.buka ? 'Buka' : 'Tutup') + '</span></button></li>';
    }).join('');
    kosong.hidden = hasil.length > 0;
    jml.textContent = '(' + (hasil.length === all.length ? all.length : hasil.length + ' dari ' + all.length) + ')';
    return hasil;
  }
  setAktif = function(id) {
    aktifId = id;
    var a = ul.querySelector('.aktif');
    if (a) a.classList.remove('aktif');
    if (id == null) return;
    var b = ul.querySelector('[data-id="' + id + '"]');
    if (b) {
      b.classList.add('aktif');
      b.scrollIntoView({
        block: 'nearest'
      });
    }
  };
  function tutupFilterDiMobile() {
    var f = document.getElementById('wg-panel');
    if (MOBILE && f && !f.classList.contains('tutup')) document.getElementById('wg-panel-toggle').click();
  }
  function tutupPanelDiMobile() {
    if (!MOBILE) return;
    panel.classList.add('tutup');
    tog.textContent = '+';
    tog.setAttribute('aria-expanded', 'false');
  }
  cari.addEventListener('input', function() {
    q = cari.value;
    render();
  });
  cari.addEventListener('keydown', function(e) {
    if (e.key === 'Enter') {
      var h = render();
      if (h[0]) {
        goTo(h[0]);
        tutupPanelDiMobile();
      }
    }
  });
  ul.addEventListener('click', function(e) {
    var b = e.target.closest('.wf-item');
    if (!b) return;
    goTo(byId[b.getAttribute('data-id')]);
    tutupPanelDiMobile();
  });
  tog.addEventListener('click', function() {
    var tutup = panel.classList.toggle('tutup');
    tog.textContent = tutup ? '+' : '−';
    tog.setAttribute('aria-expanded', String(!tutup));
    if (!tutup) tutupFilterDiMobile();
  });
  tutupPanelDiMobile();
  WG.onChange(render);
  render();
  var AK = {
    baik: {
      ikon: '✔',
      teks: 'Akses Baik',
      warna: '#2E7D32',
      ket: 'Kantor bank terdekat berada dalam jarak ' + U.fmtJarak(U.AKSES.baikM) + '.'
    },
    sedang: {
      ikon: '▲',
      teks: 'Akses Sedang',
      warna: '#E69F00',
      ket: 'Kantor bank terdekat berjarak ' + U.fmtJarak(U.AKSES.baikM) + ' sampai ' + U.fmtJarak(U.AKSES.sedangM) + '.'
    },
    rendah: {
      ikon: '✖',
      teks: 'Akses Rendah',
      warna: '#D55E00',
      ket: 'Kantor bank terdekat lebih dari ' + U.fmtJarak(U.AKSES.sedangM) + ', di luar jangkauan layanan.'
    }
  };
  var aksesOn = false, grup = L.layerGroup().addTo(map);
  var btn = document.createElement('button');
  btn.id = 'wf-akses-btn';
  btn.type = 'button';
  btn.setAttribute('aria-pressed', 'false');
  btn.innerHTML = '<span aria-hidden="true">◎</span> Cek akses lokasi';
  var card = document.createElement('section');
  card.id = 'wf-akses-card';
  card.hidden = true;
  card.setAttribute('aria-live', 'polite');
  card.innerHTML = '<div id="wf-akses-head"><span>Cek akses lokasi</span>' + '<button id="wf-akses-x" type="button" aria-label="Tutup cek akses">×</button></div><div id="wf-akses-isi"></div>';
  document.body.appendChild(btn);
  document.body.appendChild(card);
  var isi = document.getElementById('wf-akses-isi');
  function setAkses(on) {
    aksesOn = on;
    grup.clearLayers();
    btn.setAttribute('aria-pressed', String(on));
    btn.classList.toggle('on', on);
    card.hidden = !on;
    map.getContainer().classList.toggle('wf-akses-on', on);
    if (on) {
      map.closePopup();
      isi.innerHTML = '<p>Klik titik mana saja di peta untuk memeriksa akses ke kantor bank.</p>';
      tutupFilterDiMobile();
      tutupPanelDiMobile();
    }
  }
  btn.addEventListener('click', function() {
    setAkses(!aksesOn);
  });
  document.getElementById('wf-akses-x').addEventListener('click', function() {
    setAkses(false);
  });
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape' && aksesOn) setAkses(false);
  });
  function cek(ll) {
    var vis = WG.getVisible(), s = sekitar(ll.lat, ll.lng, vis, null);
    grup.clearLayers();
    if (!s.terdekat) {
      isi.innerHTML = '<p>Tidak ada kantor yang sedang ditampilkan. Ubah filter dulu.</p>';
      return;
    }
    var k = U.klasifikasi(s.jarak), a = AK[k], t = s.terdekat;
    L.circle(ll, {
      radius: RADIUS,
      color: a.warna,
      weight: 2,
      dashArray: '6 6',
      fillColor: a.warna,
      fillOpacity: .07,
      interactive: false
    }).addTo(grup);
    L.polyline([ ll, [ t.lat, t.lng ] ], {
      color: '#08306B',
      weight: 3,
      dashArray: '2 6',
      interactive: false
    }).addTo(grup);
    L.marker(ll, {
      icon: L.divIcon({
        className: 'wf-pin',
        iconSize: [ 22, 22 ],
        iconAnchor: [ 11, 11 ]
      }),
      interactive: false,
      keyboard: false
    }).addTo(grup);
    isi.innerHTML = '<p class="wf-ak ' + k + '"><span aria-hidden="true">' + a.ikon + '</span> ' + a.teks + '</p><p>' + a.ket + '</p>' + '<dl class="wf-akdl"><dt>Bank terdekat</dt><dd>' + esc(t.nama) + '<br><small>' + esc(t.kecamatan) + '</small></dd>' + '<dt>Jarak garis lurus</dt><dd>' + U.fmtJarak(s.jarak) + '</dd>' + '<dt>Kantor dalam ' + U.fmtJarak(RADIUS) + '</dt><dd>' + s.dalam.length + ' kantor</dd>' + '<dt>Titik</dt><dd>' + ll.lat.toFixed(5) + ', ' + ll.lng.toFixed(5) + '</dd></dl>' + '<button type="button" id="wf-lihat">Lihat bank terdekat</button>' + '<p class="wf-note">Jarak dihitung lurus, bukan jarak tempuh lewat jalan.</p>' + noteScope(vis.length);
    document.getElementById('wf-lihat').addEventListener('click', function() {
      goTo(t);
    });
  }
  var cont = map.getContainer(), down = null;
  cont.addEventListener('pointerdown', function(e) {
    down = {
      x: e.clientX,
      y: e.clientY
    };
  }, true);
  cont.addEventListener('click', function(e) {
    if (!aksesOn || e.target.closest('.leaflet-control, .leaflet-popup')) return;
    if (down && Math.hypot(e.clientX - down.x, e.clientY - down.y) > 6) return;
    e.stopPropagation();
    e.preventDefault();
    cek(map.mouseEventToLatLng(e));
  }, true);
})();