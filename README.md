# Studio Animasi

Buka `index.html` lewat server (hosting statis, VS Code Live Server, atau `python -m http.server`).
Tanpa server (file://), semua fitur jalan kecuali "Simpan .html" di Studio Slide, karena file CSS/JS-nya perlu dibaca ulang.

```
index.html            kerangka + sidebar kiri
css/shell.css          tema sidebar
css/ui.css             tema bersama editor (panel, kartu, tombol, pembagi)
js/studiodb.js         penyimpanan browser bersama (IndexedDB: proyek & pustaka aset Geometri/KaTeX)
js/split.js            pembagi kanvas | preview, ukuran kanvas, preview hasil
js/shell.js           routing editor, penerus animasi ke Studio Slide
js/bridge.js          dipakai editor: Bridge.send(html, label), Bridge.toast(...)
apps/geometri/        Editor Geometri  (index.html, style.css, script.js, library.js = proyek tersimpan & impor HTML, asset.js = salin/tempel aset, assetlib.js = pustaka aset tersimpan)
apps/katex/           Editor KaTeX     (index.html, style.css, script.js)
apps/slide/           Studio Slide     (index.html, style.css, script.js)
```

## Tata letak editor

Kiri: panel Properti (bisa diciutkan). Tengah: kanvas scene. Kanan: preview hasil + daftar scene.
Seret pembagi di antara kanvas dan preview untuk mengatur lebar (klik dua kali = reset, panah ← → saat pembagi difokus). Lebar diingat per editor.
Preview memakai HTML export yang sama dengan "Kirim ke Studio Slide", jadi yang terlihat di kanan = hasil akhir.

## Proyek, aset, dan impor (Geometri & KaTeX)

- **Proyek tersimpan**: simpan/buka/hapus proyek penuh di browser (IndexedDB, `js/studiodb.js`). Tombol Impor membaca file HTML hasil Export.
  Geometri: data tertanam di export. KaTeX: export baru menyertakan blok `<template id="studio-src">` (teks rumus + pengaturan); export lama tidak bisa diedit lagi.
- **Aset**: Geometri = objek terpilih di kanvas; KaTeX = scene yang dicentang. Salin dengan Ctrl+C, tempel dengan Ctrl+V di proyek mana pun (kodenya berupa teks, bisa dikirim ke teman).
- **Pustaka aset**: aset bernama yang disimpan di browser; Tempel / Salin kode / Ganti nama / Hapus.
- Berkas: `apps/geometri/{library,asset,assetlib}.js`, `apps/katex/{library,asset}.js`.
