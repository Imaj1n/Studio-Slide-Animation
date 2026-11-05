/* Pustaka aset: simpan objek terpilih sebagai aset bernama di browser (IndexedDB), tempel kapan saja ke proyek mana pun. */
(() => {
  const $ = i => document.getElementById(i), A = window.AssetAPI, DB = window.StudioDB, MARK = 'studio-asset:v1\n';
  const KIND = { c: 'lingkaran', r: 'kotak', l: 'garis', p: 'kurva', d: 'titik', T: 'teks', G: 'kotak koordinat', q: 'kurva persamaan', I: 'gambar' };
  const msg = (t, bad) => { const m = $('bmsg'); m.textContent = t; m.dataset.bad = bad ? '1' : ''; };
  const all = () => DB.tx('assets', 'readonly', s => s.getAll());
  const put = r => DB.tx('assets', 'readwrite', s => s.put(r));
  const del = id => DB.tx('assets', 'readwrite', s => s.delete(id));

  function info(text) {
    const sh = JSON.parse(text.slice(MARK.length)).sh, n = {};
    sh.forEach(o => { const k = KIND[o.t] || 'objek'; n[k] = (n[k] || 0) + 1; });
    return { n: sh.length, info: Object.entries(n).map(([k, v]) => v + ' ' + k).join(' · ') };
  }
  async function render() {
    const box = $('blist'), q = $('bq').value.trim().toLowerCase(); let rows = [];
    try { rows = (await all()).sort((a, b) => b.saved - a.saved); } catch (e) { msg(e.message, 1); }
    $('bn').textContent = rows.length; box.innerHTML = '';
    const shown = rows.filter(r => r.name.toLowerCase().includes(q));
    if (!shown.length) {
      const p = document.createElement('p'); p.className = 'f';
      p.textContent = rows.length ? 'Tidak ada aset dengan nama itu.' : 'Pustaka masih kosong. Pilih objek di kanvas, beri nama, lalu klik Simpan ke pustaka.';
      box.append(p); return;
    }
    shown.forEach(r => {
      const li = document.createElement('div'); li.className = 'li as';
      const t = document.createElement('div'); t.className = 'lt';
      const n = document.createElement('b'); n.textContent = r.name; n.title = r.name;
      const m = document.createElement('span'); m.textContent = r.info; m.title = r.info;
      t.append(n, m);
      const acts = document.createElement('div'); acts.className = 'lacts';
      const mkb = (l, f, c) => { const b = document.createElement('button'); b.textContent = l; b.onclick = f; if (c) b.className = c; return b; };
      acts.append(
        mkb('Tempel', () => { A.pasteText(r.text); msg('“' + r.name + '” ditempel ke proyek ini.'); }, 'pri'),
        mkb('Salin kode', () => {
          const ok = () => msg('Kode “' + r.name + '” disalin. Kirim ke teman, lalu mereka tempel dengan Ctrl+V.');
          const fb = () => { $('akd').value = r.text; msg('Clipboard ditolak browser. Kode ada di kolom Aset, salin dari sana.', 1); };
          navigator.clipboard && navigator.clipboard.writeText ? navigator.clipboard.writeText(r.text).then(ok, fb) : fb();
        }),
        mkb('Ganti nama', async () => {
          const nn = (prompt('Nama baru untuk aset ini:', r.name) || '').trim(); if (!nn || nn === r.name) return;
          try { await put({ ...r, name: nn }); msg('Nama diganti menjadi “' + nn + '”.'); render(); } catch (e) { msg(e.message, 1); }
        }),
        mkb('Hapus', async () => {
          if (!confirm('Hapus aset “' + r.name + '” dari pustaka? Tindakan ini tidak bisa diurungkan.')) return;
          try { await del(r.id); msg('“' + r.name + '” dihapus dari pustaka.'); render(); } catch (e) { msg(e.message, 1); }
        })
      );
      li.append(t, acts); box.append(li);
    });
  }
  async function save() {
    const name = $('bnm').value.trim();
    if (!name) { msg('Isi nama aset dulu.', 1); $('bnm').focus(); return; }
    let text = A.buildSel();
    if (!text) { const k = $('akd').value.trim(); if (A.isAsset(k)) text = k; }
    if (!text) { msg('Pilih objek di kanvas dulu (atau taruh kode aset di kolom Aset).', 1); return; }
    try {
      const i = info(text);
      await put({ id: 'a' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5), name, saved: Date.now(), text, ...i });
      $('bnm').value = ''; msg('“' + name + '” (' + i.n + ' objek) disimpan di pustaka.'); render();
    } catch (e) { console.error(e); msg('Gagal menyimpan: ' + (e.name === 'QuotaExceededError' ? 'penyimpanan browser penuh.' : e.message), 1); }
  }
  $('bsv').onclick = save;
  $('bnm').onkeydown = e => { if (e.key === 'Enter') save(); };
  $('bq').oninput = render;
  render();
})();
