/* Editor KaTeX: proyek tersimpan di browser (IndexedDB) + impor dari HTML hasil Export.
   Export baru menyertakan "sumber proyek" (teks rumus + pengaturan) supaya bisa diimpor dan diedit lagi. */
(() => {
  const $ = i => document.getElementById(i), DB = window.StudioDB;
  const msg = (t, bad) => { const m = $('lmsg'); m.textContent = t; m.dataset.bad = bad ? '1' : ''; };
  const SETS = [['K', 0], ['sp', 0], ['la', 1], ['ep', 1], ['md', 0], ['mv', 0], ['ar', 0], ['lp', 1], ['cd', 0]]; // [id, checkbox?]
  const dbAll = () => DB.tx('kx', 'readonly', s => s.getAll());
  const dbPut = r => DB.tx('kx', 'readwrite', s => s.put(r));
  const dbDel = id => DB.tx('kx', 'readwrite', s => s.delete(id));

  // ---------- state editor <-> data proyek ----------
  function serialize() {
    const set = {}; SETS.forEach(([id, c]) => set[id] = c ? $(id).checked : $(id).value);
    return { v: 1, app: 'katex', scs: JSON.parse(JSON.stringify(scs)), set,
      cur: { tx: $('tx').value, sc: $('sc').value, fc: $('fc').value, fo: $('fo').value, bl: $('bl').value, st: $('st').checked } };
  }
  function apply(d) {
    sStop(); scs.splice(0, scs.length, ...d.scs); sIdx = 0;
    SETS.forEach(([id, c]) => { if (d.set && id in d.set) { if (c) $(id).checked = !!d.set[id]; else $(id).value = d.set[id]; } });
    ['K', 'cd'].forEach(id => $(id).dispatchEvent(new Event('input', { bubbles: true })));
    AR = +$('ar').value || 2; fit();
    const c = d.cur || {};
    if (c.sc) { $('sc').value = c.sc; $('fc').value = c.fc; $('fo').value = c.fo; $('bl').value = c.bl; $('blv').textContent = c.bl; $('st').checked = !!c.st; }
    const t = c.tx ?? (scs[0] ? scs[0].t : 'E=mc^2'); $('tx').value = t; go(t);
    if (c.sc) setCol(c.sc, c.fc, c.fo / 100, cdur(), +c.bl || 0);
    sRender(); dirtyW = true;
    $('pvr').click();
  }
  // <template> (bukan <script>) supaya tidak pernah ikut dieksekusi oleh Studio Slide atau pemuat HTML lain
  window.KxSrc = () => '<template id="studio-src">' + JSON.stringify(serialize()).replace(/</g, '\\u003c') + '</template>';

  // ---------- impor dari HTML hasil export ----------
  function fromHtml(html) {
    const m = html.match(/<(?:template|script type="application\/json") id="studio-src">([\s\S]*?)<\/(?:template|script)>/); // script = export versi sebelumnya
    if (!m) throw new Error(html.includes('Animasi Geometri Responsif')
      ? 'Berkas ini dari Editor Geometri. Impor lewat Editor Geometri.'
      : 'Berkas ini tidak memuat teks rumus (export lama hanya berisi hasil gambar). Export ulang dari proyek asli dengan versi terbaru agar bisa diimpor dan diedit.');
    let d; try { d = JSON.parse(m[1]); } catch (_) { d = null; }
    if (!d || d.app !== 'katex' || !Array.isArray(d.scs)) throw new Error('Sumber proyek di berkas ini rusak.');
    return d;
  }

  // ---------- UI ----------
  let curId = null;
  const sigNow = () => JSON.stringify(serialize());
  let base = sigNow();
  const fmt = t => new Date(t).toLocaleString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  const sure = what => sigNow() === base || confirm('Perubahan yang belum disimpan akan hilang. ' + what);
  async function render() {
    const box = $('llist'); let all = [];
    try { all = (await dbAll()).sort((a, b) => b.saved - a.saved); } catch (e) { msg(e.message, 1); }
    $('libn').textContent = all.length; box.innerHTML = '';
    if (!all.length) { const p = document.createElement('p'); p.className = 'f'; p.textContent = 'Belum ada proyek tersimpan. Isi nama lalu klik Simpan.'; box.append(p); return; }
    all.forEach(r => {
      const li = document.createElement('div'); li.className = 'li' + (r.id === curId ? ' on' : '');
      const t = document.createElement('div'); t.className = 'lt';
      const n = document.createElement('b'); n.textContent = r.name;
      const m = document.createElement('span'); m.textContent = r.n + ' scene · ' + fmt(r.saved);
      t.append(n, m);
      const o = document.createElement('button'); o.textContent = 'Buka'; o.onclick = () => {
        if (!sure('Buka “' + r.name + '”?')) return;
        try { apply(r.data); curId = r.id; $('lnm').value = r.name; base = sigNow(); msg('“' + r.name + '” dibuka.'); render(); } catch (e) { console.error(e); msg('Gagal membuka: ' + e.message, 1); }
      };
      const x = document.createElement('button'); x.textContent = 'Hapus'; x.onclick = async () => {
        if (!confirm('Hapus proyek “' + r.name + '” dari browser ini? Tindakan ini tidak bisa diurungkan.')) return;
        try { await dbDel(r.id); if (curId === r.id) curId = null; msg('“' + r.name + '” dihapus.'); render(); } catch (e) { msg(e.message, 1); }
      };
      li.append(t, o, x); box.append(li);
    });
  }
  async function save(asNew) {
    const name = $('lnm').value.trim();
    if (!name) { msg('Isi nama proyek dulu.', 1); $('lnm').focus(); return; }
    if (!scs.length && !$('tx').value.trim()) { msg('Belum ada yang bisa disimpan: tulis rumus atau tambah scene dulu.', 1); return; }
    const id = asNew || !curId ? 'p' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5) : curId;
    try {
      await dbPut({ id, name, saved: Date.now(), n: scs.length, data: serialize() });
      curId = id; base = sigNow(); msg('“' + name + '” disimpan di browser ini.'); render();
    } catch (e) { console.error(e); msg('Gagal menyimpan: ' + (e.name === 'QuotaExceededError' ? 'penyimpanan browser penuh.' : e.message), 1); }
  }
  $('lsv').onclick = () => save(false);
  $('lsa').onclick = () => save(true);
  $('lnm').onkeydown = e => { if (e.key === 'Enter') save(false); };
  $('lnw').onclick = () => {
    if (!sure('Mulai proyek kosong?')) return;
    apply({ scs: [], set: {}, cur: { ...serialize().cur, tx: 'E=mc^2' } });
    curId = null; $('lnm').value = ''; base = sigNow(); msg('Proyek kosong siap dipakai.'); render();
  };
  $('lim').onclick = () => $('lfi').click();
  $('lfi').onchange = async e => {
    const f = e.target.files[0]; e.target.value = ''; if (!f) return;
    if (!sure('Impor “' + f.name + '”?')) return;
    try {
      const d = fromHtml(await f.text()); apply(d); curId = null; $('lnm').value = f.name.replace(/\.html?$/i, ''); base = sigNow();
      msg('“' + f.name + '” diimpor (' + scs.length + ' scene). Klik Simpan untuk menyimpannya di browser.');
    } catch (err) { console.error(err); msg(err.message, 1); }
  };
  addEventListener('beforeunload', e => { if (sigNow() !== base && (scs.length || $('tx').value.trim())) { e.preventDefault(); e.returnValue = ''; } });
  render();
})();
