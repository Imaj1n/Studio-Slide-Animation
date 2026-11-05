/* Kerangka utama: sidebar, perpindahan editor, dan penerusan animasi ke Studio Slide. */
(() => {
  const $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];
  const panes = Object.fromEntries($$('.pane').map(p => [p.dataset.app, p]));
  const navs = $$('.nav');
  const store = {
    get(k, d) { try { const v = localStorage.getItem(k); return v == null ? d : v; } catch (_) { return d; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch (_) {} }
  };

  // ---- perpindahan editor (hash: #geometri | #katex | #slide) ----
  function show(app) {
    if (!panes[app]) app = 'geometri';
    for (const k in panes) panes[k].classList.toggle('on', k === app);
    navs.forEach(n => n.toggleAttribute('aria-current', n.dataset.app === app));
    navs.forEach(n => { if (n.dataset.app === app) n.setAttribute('aria-current', 'page'); });
    try { panes[app].contentWindow.focus(); } catch (_) {}
  }
  const route = () => show(location.hash.slice(1));
  addEventListener('hashchange', route);
  route();

  // ---- sidebar: ciutkan / buka (ingat pilihan) ----
  const tgl = $('#tgl');
  function rail(on, save) {
    document.body.classList.toggle('rail', on);
    const t = on ? 'Buka sidebar' : 'Ciutkan sidebar';
    tgl.setAttribute('aria-expanded', String(!on)); tgl.setAttribute('aria-label', t); tgl.title = t;
    if (save) store.set('rail', on ? '1' : '0');
  }
  rail(store.get('rail', '1') === '1');
  tgl.onclick = () => rail(!document.body.classList.contains('rail'), true);
  navs.forEach(n => { n.title = n.querySelector('.t').firstChild.textContent; }); // tooltip saat hanya ikon
  requestAnimationFrame(() => requestAnimationFrame(() => document.body.classList.add('anim')));

  // ---- toast ----
  let tt;
  function toast(text, kind) {
    const t = $('#toast');
    t.textContent = text; t.dataset.kind = kind || 'ok'; t.classList.add('show');
    clearTimeout(tt); tt = setTimeout(() => t.classList.remove('show'), 4000);
  }

  // ---- pengiriman ke Studio Slide ----
  const auto = $('#auto');
  auto.checked = store.get('auto', '1') === '1';
  auto.onchange = () => store.set('auto', auto.checked ? '1' : '0');

  let slideReady = false, sent = 0;
  const queue = [], count = {};
  const toSlide = m => slideReady ? panes.slide.contentWindow.postMessage(m, '*') : queue.push(m);

  function send(from, d) {
    if (typeof d.html !== 'string' || !d.html) return;
    const label = String(d.label || from).slice(0, 24);
    count[label] = (count[label] || 0) + 1;
    const title = label + ' ' + count[label];
    toSlide({ type: 'studio:add', html: d.html, title });
    sent++;
    const c = $('#cnt'); c.hidden = false; c.textContent = sent;
    c.parentElement.title = 'Studio Slide · ' + sent + ' animasi dikirim pada sesi ini';
    toast('“' + title + '” dikirim ke Studio Slide.');
    if (auto.checked) location.hash = 'slide';
  }

  addEventListener('message', e => {
    const d = e.data;
    if (!d || typeof d.type !== 'string') return;
    const from = Object.keys(panes).find(k => panes[k].contentWindow === e.source);
    if (!from) return; // hanya terima pesan dari tiga iframe sendiri
    if (d.type === 'shell:hello' && from === 'slide') { slideReady = true; queue.splice(0).forEach(toSlide); }
    else if (d.type === 'shell:send') send(from, d);
    else if (d.type === 'shell:toast') toast(String(d.text || ''), d.kind);
    else if (d.type === 'shell:immersive') document.body.classList.toggle('immersive', !!d.on);
  });

  // data hanya hidup di memori tab ini
  addEventListener('beforeunload', e => { if (sent) { e.preventDefault(); e.returnValue = ''; } });
})();
