/* Proyek tersimpan di browser (IndexedDB) + impor dari HTML hasil "Export HTML".
   Dimuat setelah script.js; memakai state global editor (S, SC, SP, PV, PM, AX, CAM, IMGS, ...). */
(() => {
  const $ = i => document.getElementById(i);
  const msg = (t, bad) => { const m = $('lmsg'); m.textContent = t; m.dataset.bad = bad ? '1' : ''; };

  // ---------- IndexedDB (js/studiodb.js) ----------
  const tx = (...a) => window.StudioDB.tx(...a);
  const dbAll = () => tx('geo', 'readonly', s => s.getAll());
  const dbPut = rec => tx('geo', 'readwrite', s => s.put(rec));
  const dbDel = id => tx('geo', 'readwrite', s => s.delete(id));

  // ---------- state editor <-> data proyek ----------
  const AXI = [['agd', 'gd', 1], ['axa', 'ax', 1], ['xgd', 'xg', 1], ['xax', 'xa', 1], ['an', 'num', 1], ['ax1', 'x1'], ['ax2', 'x2'], ['ay1', 'y1'], ['ay2', 'y2'], ['ast', 'st']];
  function serialize() {
    if (pen) endPen();
    const used = new Set([...JSON.stringify([SC, S]).matchAll(/"im":"([^"]+)"/g)].map(m => m[1])), im = {};
    used.forEach(k => { if (IMGS[k]) im[k] = IMGS[k]; });
    return { v: 1, SC: SC.slice(), SP: JSON.parse(JSON.stringify(SP)), PM: JSON.parse(JSON.stringify(PM)), PV: { ...PV }, PP: Object.keys(PP).filter(k => PP[k]),
      cur: JSON.stringify(S), si, AX: { ...AX }, K: +$('K').value, cd: +$('cd').value, cam: [CAM.cx, CAM.cy, CAM.lz], IMGS: im };
  }
  const sigNow = () => JSON.stringify([SC, SP, PM]) + JSON.stringify(S);
  function apply(d) {
    sStop(); if (pen) endPen();
    tw = []; mo = null; ms = []; sel = null; UN = [];
    SC = d.SC.slice(); SP = d.SP; PM = d.PM; PV = { ...d.PV }; PP = {}; (d.PP || []).forEach(k => PP[k] = 1);
    for (const k in IMGS) delete IMGS[k]; for (const k in IMGE) delete IMGE[k];
    Object.assign(IMGS, d.IMGS || {});
    Object.assign(AX, d.AX || {});
    AXI.forEach(([id, k, c]) => { const e = $(id); if (c) e.checked = !!AX[k]; else e.value = AX[k]; });
    $('K').value = d.K; $('cd').value = d.cd;
    [CAM.cx, CAM.cy, CAM.lz] = d.cam || [0, 0, 0];
    S = JSON.parse(d.cur || SC[0] || '[]'); si = Math.min(d.si ?? 0, SC.length - 1);
    uid = 1 + Math.max(0, ...SC.flatMap(j => JSON.parse(j).map(s => s.id)), ...S.map(s => s.id));
    setTool('v'); pvUi(); prRender(); sRender(); nl(); sync(); dirty = 1;
    $('pvr').click();
  }

  // ---------- impor dari HTML hasil export ----------
  function fromHtml(html) {
    const a = html.lastIndexOf('})('), b = html.lastIndexOf(')</script>');
    let D; try { D = JSON.parse(html.slice(a + 3, b)); } catch (_) { D = null; }
    if (!D || !Array.isArray(D.sc) || !D.sc.length || !D.sc[0].g) throw new Error('Berkas ini bukan hasil Export HTML dari Editor Geometri.');
    PM = D.pm || {}; PV = {};
    for (const k in PM) PV[k] = D.sc[0].p && k in D.sc[0].p ? D.sc[0].p[k] : PM[k][0];
    const fix = o => { delete o.L; if (o.t === 'q' && !o.pl) o.pl = eqPts(o.q) || []; return o; };
    const SCn = D.sc.map(x => JSON.stringify(x.g.map(o => fix(o))));
    const ims = {}; for (const k in D.im || {}) ims[k] = { src: D.im[k], w: 1, h: 1 };
    return { v: 1, SC: SCn, SP: D.sc.map(x => ({ ...(x.p || {}), _p: x.pl || [], _c: x.cam || [0, 0, 0] })), PM, PV, PP: D.sc[0].pl || [], cur: SCn[0], si: 0,
      AX: { ...D.ax, gd: 1, ax: 1 }, K: D.K, cd: Math.round((D.cd || 1.6) * 10), cam: D.sc[0].cam || [0, 0, 0], IMGS: ims };
  }

  // ---------- UI ----------
  let curId = null, base = sigNow();
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
    if (!SC.length && !S.length) { msg('Belum ada yang bisa disimpan: gambar objek atau tambah scene dulu.', 1); return; }
    const id = asNew || !curId ? 'p' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5) : curId;
    try {
      await dbPut({ id, name, saved: Date.now(), n: SC.length, data: serialize() });
      curId = id; base = sigNow(); msg('“' + name + '” disimpan di browser ini.'); render();
    } catch (e) { console.error(e); msg('Gagal menyimpan: ' + (e.name === 'QuotaExceededError' ? 'penyimpanan browser penuh.' : e.message), 1); }
  }
  $('lsv').onclick = () => save(false);
  $('lsa').onclick = () => save(true);
  $('lnm').onkeydown = e => { if (e.key === 'Enter') save(false); };
  $('lnw').onclick = () => {
    if (!sure('Mulai proyek kosong?')) return;
    apply({ SC: [], SP: [], PM: { th: [0, 6.2832] }, PV: { th: .8 }, PP: [], cur: '[]', si: -1, AX: { gd: 1, ax: 1, xg: 1, xa: 0, num: 1, x1: -8, x2: 8, y1: -4.5, y2: 4.5, st: 1 }, K: 50, cd: 16, cam: [0, 0, 0], IMGS: {} });
    curId = null; $('lnm').value = ''; base = sigNow(); msg('Proyek kosong siap dipakai.'); render();
  };
  $('lim').onclick = () => $('lfi').click();
  $('lfi').onchange = async e => {
    const f = e.target.files[0]; e.target.value = ''; if (!f) return;
    if (!sure('Impor “' + f.name + '”?')) return;
    try {
      apply(fromHtml(await f.text())); curId = null; $('lnm').value = f.name.replace(/\.html?$/i, ''); base = sigNow();
      msg('“' + f.name + '” diimpor (' + SC.length + ' scene). Klik Simpan untuk menyimpannya di browser.');
    } catch (err) { console.error(err); msg(err.message, 1); }
  };
  addEventListener('beforeunload', e => { if (sigNow() !== base && (SC.length || S.length)) { e.preventDefault(); e.returnValue = ''; } });
  render();
})();
