/* Penyimpanan browser bersama (IndexedDB) untuk Editor Geometri & Editor KaTeX.
   Satu database, satu versi, semua "store" dibuat di sini supaya kedua editor tidak saling bentrok. */
(() => {
  const STORES = ['geo', 'assets', 'kx', 'kxassets'];
  let dbp;
  const db = () => dbp || (dbp = new Promise((ok, no) => {
    if (!window.indexedDB) return no(new Error('Penyimpanan browser tidak tersedia di mode ini.'));
    const r = indexedDB.open('studio-animasi', 3);
    r.onupgradeneeded = () => { const d = r.result; STORES.forEach(n => { if (!d.objectStoreNames.contains(n)) d.createObjectStore(n, { keyPath: 'id' }); }); };
    r.onsuccess = () => { r.result.onversionchange = () => { r.result.close(); dbp = null; }; ok(r.result); };
    r.onerror = () => { dbp = null; no(r.error); };
    r.onblocked = () => no(new Error('Tutup tab Studio Animasi lain yang terbuka lalu muat ulang halaman ini.'));
  }));
  const tx = async (store, mode, f) => {
    const d = await db();
    return new Promise((ok, no) => { const t = d.transaction(store, mode), q = f(t.objectStore(store)); t.oncomplete = () => ok(q && q.result); t.onerror = t.onabort = () => no(t.error); });
  };
  window.StudioDB = { tx };
})();
