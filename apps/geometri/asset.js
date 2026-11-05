/* Aset: salin objek terpilih ke clipboard sistem sebagai teks, tempel di proyek mana pun (juga di browser / komputer lain).
   Memakai cp(), paste(), clip, pc, IMGS, PM, PV milik script.js. */
(() => {
  const $ = i => document.getElementById(i), MARK = 'studio-asset:v1\n';
  const msg = (t, bad) => { const m = $('amsg'); m.textContent = t; m.dataset.bad = bad ? '1' : ''; };
  const isAsset = t => typeof t === 'string' && t.startsWith(MARK);
  const typing = t => t && /INPUT|TEXTAREA|SELECT/.test(t.tagName);
  const cp0 = cp, paste0 = paste, dup0 = dup;
  let inDup = 0;

  function build() {
    const sh = clip.map(c => {
      const o = JSON.parse(JSON.stringify(c));
      ['hist', 'wd', 'pv', 'bx', 'lb'].forEach(k => delete o[k]);
      if (o.t === 'q' && o.q && o.q.dep) delete o.pl; // dihitung ulang dari rumus saat ditempel
      return o;
    });
    const im = {}; for (const m of JSON.stringify(sh).matchAll(/"im":"([^"]+)"/g)) if (IMGS[m[1]]) im[m[1]] = IMGS[m[1]];
    return MARK + JSON.stringify({ sh, im, PM, PV });
  }
  // baca teks aset -> isi clip; parameter & gambar yang belum ada ikut ditambahkan ke proyek ini
  function load(text) {
    const d = JSON.parse(text.slice(MARK.length));
    if (!Array.isArray(d.sh) || !d.sh.length) throw new Error('Kode aset kosong.');
    const add = [];
    for (const k in d.PM || {}) if (!(k in PM)) { PM[k] = d.PM[k]; PV[k] = (d.PV || {})[k] ?? d.PM[k][0]; add.push(k); }
    if (add.length) { pvUi(); prRender(); }
    for (const k in d.im || {}) if (!IMGS[k]) IMGS[k] = d.im[k];
    clip = d.sh; pc = -1; // -1: ditempel tepat di posisi aslinya
    return add;
  }
  function pasteText(text, at) {
    try {
      const add = load(text); paste0(at);
      msg(clip.length + ' objek aset ditempel' + (add.length ? ' (parameter ' + add.join(', ') + ' ikut ditambahkan)' : '') + '.');
    } catch (e) { console.error(e); msg(e instanceof SyntaxError ? 'Kode aset rusak atau terpotong. Salin ulang seluruh kodenya.' : 'Kode aset tidak valid: ' + e.message, 1); }
  }

  // ---- salin: clipboard sistem + kolom kode ----
  cp = function () {
    if (inDup) return cp0();
    if (!grp().length) { msg('Pilih objek di kanvas dulu, lalu salin.', 1); return; }
    cp0(); if (!clip || !clip.length) return;
    const text = build(); $('akd').value = text;
    const ok = () => msg(clip.length + ' objek disalin sebagai aset. Tempel dengan Ctrl+V di proyek mana pun.');
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(ok, () => msg('Browser menolak akses clipboard. Salin kode dari kolom Aset secara manual.', 1));
    else msg('Clipboard tidak tersedia. Salin kode dari kolom Aset secara manual.', 1);
  };
  dup = function () { inDup = 1; try { dup0(); } finally { inDup = 0; } };

  // ---- tempel: Ctrl+V (event paste, tanpa dialog izin) ----
  addEventListener('keydown', e => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'v' && !typing(e.target)) e.stopImmediatePropagation(); // tempel ditangani event paste
  }, true);
  document.addEventListener('paste', e => {
    if (typing(e.target) || mo) return;
    const t = e.clipboardData && e.clipboardData.getData('text');
    e.preventDefault();
    if (isAsset(t)) pasteText(t); else if (clip && clip.length) paste0();
  });
  // klik kanan > "Tempel di sini": baca clipboard bila diizinkan, kalau tidak pakai salinan terakhir
  paste = function (at) {
    if (!at) return paste0(at);
    const fb = () => paste0(at);
    if (!navigator.clipboard || !navigator.clipboard.readText) return fb();
    navigator.clipboard.readText().then(t => isAsset(t) ? pasteText(t, at) : fb(), fb);
  };

  // ---- dipakai pustaka aset (assetlib.js) ----
  window.AssetAPI = {
    isAsset, pasteText: t => pasteText(t),
    buildSel() { if (!grp().length) return null; const pv = clip, pp = pc; cp0(); const t = clip && clip.length ? build() : null; clip = pv; pc = pp; return t; }
  };

  // ---- tombol di kartu Aset ----
  $('acp').onclick = () => cp();
  $('apt').onclick = async () => {
    let t = $('akd').value.trim();
    if (!isAsset(t)) { try { t = await navigator.clipboard.readText(); } catch (_) { t = ''; } }
    if (isAsset(t)) pasteText(t); else msg('Tidak ada aset di clipboard. Salin objek dulu, atau tempel kode aset di kolom ini.', 1);
  };
})();
