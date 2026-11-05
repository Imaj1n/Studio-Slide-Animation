/* Editor KaTeX: aset = satu atau beberapa scene (rumus + warna + durasi). Salin/tempel antar proyek,
   dan pustaka aset tersimpan di browser (IndexedDB). */
(() => {
  const $ = i => document.getElementById(i), DB = window.StudioDB;
  const MARK = 'studio-asset:katex:v1\n', GEO = 'studio-asset:v1\n';
  const msg = (t, bad) => { const m = $('amsg'); m.textContent = t; m.dataset.bad = bad ? '1' : ''; };
  const bmsg = (t, bad) => { const m = $('bmsg'); m.textContent = t; m.dataset.bad = bad ? '1' : ''; };
  const isAsset = t => typeof t === 'string' && t.startsWith(MARK);
  const typing = t => t && /INPUT|TEXTAREA|SELECT/.test(t.tagName);
  const SEL = new WeakSet();

  // ---- pilih scene (kotak centang di tiap baris scene) ----
  const sRender0 = sRender;
  const picked = () => scs.filter(s => SEL.has(s));
  const count = () => { const n = picked().length; $('apk').textContent = n ? n + ' scene dipilih' : 'Belum ada scene dipilih'; };
  sRender = function () {
    sRender0();
    [...sl.children].forEach((r, i) => {
      const s = scs[i]; if (!s) return;
      const c = document.createElement('input'); c.type = 'checkbox'; c.className = 'pick'; c.checked = SEL.has(s);
      c.title = 'Pilih scene ini sebagai aset'; c.setAttribute('aria-label', 'Pilih scene ' + (i + 1) + ' sebagai aset');
      c.onchange = () => { c.checked ? SEL.add(s) : SEL.delete(s); count(); };
      r.prepend(c);
    });
    count();
  };
  sRender();
  $('asa').onclick = () => { scs.forEach(s => SEL.add(s)); sRender(); };
  $('asn').onclick = () => { scs.forEach(s => SEL.delete(s)); sRender(); };

  // ---- format aset ----
  const clone = s => JSON.parse(JSON.stringify(s));
  const build = list => MARK + JSON.stringify({ scs: list.map(clone) });
  function parse(text) {
    if (typeof text === 'string' && text.startsWith(GEO)) throw new Error('Ini aset dari Editor Geometri. Tempel di Editor Geometri.');
    if (!isAsset(text)) throw new Error('Bukan kode aset Editor KaTeX.');
    const d = JSON.parse(text.slice(MARK.length));
    if (!Array.isArray(d.scs) || !d.scs.length || d.scs.some(s => typeof s.t !== 'string')) throw new Error('Kode aset kosong atau rusak.');
    return d.scs;
  }
  const info = list => ({ n: list.length, info: list.length + ' scene · ' + list[0].t.replace(/\s+/g, ' ').slice(0, 30) });
  function pasteText(text, out) {
    try {
      const list = parse(text).map(clone); sStop();
      list.forEach(s => scs.push({ d: 3, s: '#2563eb', f: '#38bdf8', o: .3, ...s }));
      sRender(); $('pvr').click(); out(list.length + ' scene aset ditambahkan di akhir daftar scene.');
    } catch (e) { out(e instanceof SyntaxError ? 'Kode aset rusak atau terpotong. Salin ulang seluruh kodenya.' : e.message, 1); }
  }

  // ---- salin & tempel: Ctrl+C / Ctrl+V (tanpa dialog izin) ----
  const write = (text, ok, fail) => navigator.clipboard && navigator.clipboard.writeText ? navigator.clipboard.writeText(text).then(ok, fail) : fail();
  function copyPicked() {
    const l = picked(); if (!l.length) { msg('Centang scene di daftar scene dulu, lalu salin.', 1); return; }
    const text = build(l); $('akd').value = text;
    write(text, () => msg(l.length + ' scene disalin sebagai aset. Tempel dengan Ctrl+V di proyek mana pun.'), () => msg('Browser menolak akses clipboard. Salin kode dari kolom Aset secara manual.', 1));
  }
  document.addEventListener('copy', e => {
    if (typing(e.target) || String(getSelection())) return;
    const l = picked(); if (!l.length) return;
    e.clipboardData.setData('text/plain', build(l)); e.preventDefault(); $('akd').value = build(l);
    msg(l.length + ' scene disalin sebagai aset. Tempel dengan Ctrl+V di proyek mana pun.');
  });
  document.addEventListener('paste', e => {
    if (typing(e.target)) return;
    const t = e.clipboardData && e.clipboardData.getData('text');
    if (typeof t === 'string' && (isAsset(t) || t.startsWith(GEO))) { e.preventDefault(); pasteText(t, msg); }
  });
  $('acp').onclick = copyPicked;
  $('apt').onclick = async () => {
    let t = $('akd').value.trim();
    if (!isAsset(t) && !t.startsWith(GEO)) { try { t = await navigator.clipboard.readText(); } catch (_) { t = ''; } }
    if (isAsset(t) || (t || '').startsWith(GEO)) pasteText(t, msg); else msg('Tidak ada aset di clipboard. Salin scene dulu, atau tempel kode aset di kolom ini.', 1);
  };

  // ---- pustaka aset (IndexedDB, store "kxassets") ----
  const all = () => DB.tx('kxassets', 'readonly', s => s.getAll());
  const put = r => DB.tx('kxassets', 'readwrite', s => s.put(r));
  const del = id => DB.tx('kxassets', 'readwrite', s => s.delete(id));
  async function render() {
    const box = $('blist'), q = $('bq').value.trim().toLowerCase(); let rows = [];
    try { rows = (await all()).sort((a, b) => b.saved - a.saved); } catch (e) { bmsg(e.message, 1); }
    $('bn').textContent = rows.length; box.innerHTML = '';
    const shown = rows.filter(r => r.name.toLowerCase().includes(q));
    if (!shown.length) {
      const p = document.createElement('p'); p.className = 'f';
      p.textContent = rows.length ? 'Tidak ada aset dengan nama itu.' : 'Pustaka masih kosong. Centang scene, beri nama, lalu klik Simpan ke pustaka.';
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
        mkb('Tempel', () => pasteText(r.text, (t2, bad) => bmsg(bad ? t2 : '“' + r.name + '”: ' + t2, bad)), 'pri'),
        mkb('Salin kode', () => write(r.text, () => bmsg('Kode “' + r.name + '” disalin. Kirim ke teman, lalu mereka tempel dengan Ctrl+V.'),
          () => { $('akd').value = r.text; bmsg('Clipboard ditolak browser. Kode ada di kolom Aset, salin dari sana.', 1); })),
        mkb('Ganti nama', async () => {
          const nn = (prompt('Nama baru untuk aset ini:', r.name) || '').trim(); if (!nn || nn === r.name) return;
          try { await put({ ...r, name: nn }); bmsg('Nama diganti menjadi “' + nn + '”.'); render(); } catch (e) { bmsg(e.message, 1); }
        }),
        mkb('Hapus', async () => {
          if (!confirm('Hapus aset “' + r.name + '” dari pustaka? Tindakan ini tidak bisa diurungkan.')) return;
          try { await del(r.id); bmsg('“' + r.name + '” dihapus dari pustaka.'); render(); } catch (e) { bmsg(e.message, 1); }
        })
      );
      li.append(t, acts); box.append(li);
    });
  }
  async function save() {
    const name = $('bnm').value.trim();
    if (!name) { bmsg('Isi nama aset dulu.', 1); $('bnm').focus(); return; }
    let list = picked().map(clone);
    if (!list.length) { try { list = parse($('akd').value.trim()); } catch (_) { list = []; } }
    if (!list.length) { bmsg('Centang scene di daftar scene dulu (atau taruh kode aset di kolom Aset).', 1); return; }
    try {
      const text = build(list), i = info(list);
      await put({ id: 'k' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5), name, saved: Date.now(), text, ...i });
      $('bnm').value = ''; bmsg('“' + name + '” (' + i.n + ' scene) disimpan di pustaka.'); render();
    } catch (e) { console.error(e); bmsg('Gagal menyimpan: ' + (e.name === 'QuotaExceededError' ? 'penyimpanan browser penuh.' : e.message), 1); }
  }
  $('bsv').onclick = save;
  $('bnm').onkeydown = e => { if (e.key === 'Enter') save(); };
  $('bq').oninput = render;
  render();
})();
