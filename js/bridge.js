/* Jembatan editor → shell. Dimuat oleh Editor Geometri & Editor KaTeX.
   Di dalam index.html utama, HTML animasi dikirim ke Studio Slide lewat postMessage (tanpa file). */
(function () {
  const inShell = window.parent !== window;
  const post = m => window.parent.postMessage(m, '*');
  window.Bridge = {
    inShell,
    send(html, label) {
      if (!inShell) return alert('Tombol ini aktif jika editor dibuka lewat index.html utama.');
      post({ type: 'shell:send', html, label });
    },
    toast(text, kind) { inShell ? post({ type: 'shell:toast', text, kind }) : alert(text); }
  };
})();
