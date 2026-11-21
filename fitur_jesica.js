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