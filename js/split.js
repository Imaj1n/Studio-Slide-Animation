/* Tata letak editor: lebar preview bisa digeser (pembagi), kanvas menyesuaikan, preview hasil di-render dari export asli. */
(() => {
  const $ = i => document.getElementById(i);
  const store = {
    get(k) { try { return localStorage.getItem(k); } catch (_) { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch (_) {} }
  };
  const work = $('work'), gut = $('gut'), key = 'pvw:' + location.pathname;

  // ---- pembagi kanvas | preview ----
  let cur = null;
  const setW = w => { cur = Math.max(280, Math.min(w, work.clientWidth - 380)); work.style.setProperty('--pvw', cur + 'px'); };
  const saved = +store.get(key);
  if (saved) setW(saved);
  gut.onpointerdown = e => {
    gut.setPointerCapture(e.pointerId); document.body.classList.add('drag');
    const r = work.getBoundingClientRect();
    gut.onpointermove = ev => setW(r.right - ev.clientX - 6);
    gut.onpointerup = gut.onpointercancel = () => {
      gut.onpointermove = gut.onpointerup = gut.onpointercancel = null;
      document.body.classList.remove('drag'); if (cur) store.set(key, String(Math.round(cur)));
    };
  };
  gut.onkeydown = e => {
    const d = { ArrowLeft: 24, ArrowRight: -24 }[e.key];
    if (!d) return;
    e.preventDefault(); setW((cur || $('pvp').clientWidth) + d); store.set(key, String(Math.round(cur)));
  };
  gut.ondblclick = () => { cur = null; work.style.removeProperty('--pvw'); store.set(key, ''); };
  addEventListener('resize', () => { if (cur) setW(cur); });

  // ---- panel properti: ciutkan / buka ----
  const itg = $('itg');
  if (itg) itg.onclick = () => {
    const on = document.body.classList.toggle('nin');
    itg.setAttribute('aria-expanded', String(!on));
  };


  // ---- kolom teks: tarik pegangan ke atas = lebih tinggi ----
  const grip = $('tgrip'), tx = $('tx');
  if (grip && tx) {
    const hk = 'txh:' + location.pathname, cvp = $('cvp');
    const setH = h => { h = Math.max(60, Math.min(h, cvp.clientHeight * 0.7)); tx.style.setProperty('--txh', h + 'px'); tx.parentNode.parentNode.style.setProperty('--txh', h + 'px'); return h; };
    const sv = +store.get(hk); if (sv) setH(sv);
    grip.onpointerdown = e => {
      grip.setPointerCapture(e.pointerId); document.body.classList.add('dragy');
      const y0 = e.clientY, h0 = tx.offsetHeight;
      grip.onpointermove = ev => setH(h0 + (y0 - ev.clientY));
      grip.onpointerup = grip.onpointercancel = () => {
        grip.onpointermove = grip.onpointerup = grip.onpointercancel = null;
        document.body.classList.remove('dragy'); store.set(hk, String(tx.offsetHeight));
      };
    };
    grip.onkeydown = e => {
      const d = { ArrowUp: 24, ArrowDown: -24 }[e.key]; if (!d) return;
      e.preventDefault(); store.set(hk, String(Math.round(setH(tx.offsetHeight + d))));
    };
    grip.ondblclick = () => { tx.style.removeProperty('--txh'); tx.parentNode.parentNode.style.removeProperty('--txh'); store.set(hk, ''); };
  }

  // ---- kanvas: pertahankan rasio, muat di area yang tersedia ----
  const box = $('cvbox'), wrap = $('cvw');
  let lastW = -1;
  const fitBox = () => {
    const cs = getComputedStyle(box);
    const aw = box.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
    const ah = box.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom);
    const ar = document.body.dataset.ar === 'var' && typeof AR === 'number' ? AR : 16 / 9;
    const w = Math.max(240, Math.min(aw, ah * ar));
    wrap.style.width = w + 'px';
    const cw = $('c').clientWidth;
    if (cw !== lastW) { lastW = cw; if (typeof fit === 'function') fit(); }
  };
  new ResizeObserver(fitBox).observe(box);
  if ($('ar')) $('ar').addEventListener('change', () => requestAnimationFrame(fitBox));

  // ---- preview hasil: iframe berisi HTML export yang sama dengan "Kirim ke Studio Slide" ----
  const pf = $('pvf');
  if (!pf) return;
  const page = (msg, err) => '<!DOCTYPE html><meta charset="utf-8"><body style="margin:0;height:100vh;display:grid;place-items:center;font:13px/1.5 system-ui,sans-serif;color:' +
    (err ? '#b4233c' : '#6b7178') + ';text-align:center;padding:16px;box-sizing:border-box">' + msg;
  const count = () => typeof SC !== 'undefined' ? SC.length : typeof scs !== 'undefined' ? scs.length : 0;
  let seq = 0, tm;
  async function run() {
    const my = ++seq;
    if (!count()) { pf.srcdoc = page('Belum ada scene.<br>Klik “+ Tambah scene” untuk melihat hasilnya di sini.'); return; }
    if (!pf.dataset.ok) pf.srcdoc = page('Memuat preview…');
    try {
      const html = typeof buildDoc === 'function' ? buildDoc() : await makeHTML();
      if (my === seq && html) { pf.srcdoc = html; pf.dataset.ok = '1'; }
    } catch (e) { console.error(e); if (my === seq) pf.srcdoc = page('Preview gagal dibuat: ' + String(e.message).replace(/</g, '&lt;'), 1); }
  }
  const auto = $('pva');
  const later = () => { if (auto.checked) { clearTimeout(tm); tm = setTimeout(run, 450); } };
  $('pvr').onclick = () => { clearTimeout(tm); run(); };
  auto.onchange = () => { if (auto.checked) later(); };
  document.addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    if (b.matches('#ad,#exs') || (b.closest('#sl') && /^(Perbarui|Hapus|✕)$/.test(b.textContent.trim()))) later();
  });
  document.addEventListener('input', e => { if (e.target.closest('#sl') || e.target.matches('#cd,#K')) later(); });
  document.addEventListener('pointerup', e => { if (e.target.closest && e.target.closest('#sl .dh')) later(); });
  document.addEventListener('keyup', e => { if (e.target.closest && e.target.closest('#sl .dh')) later(); });
  run();
})();
