/* worker.js — thread terpisah: semua kalkulasi Fourier. Main thread hanya menggambar. */
importScripts('core.js');
const engine=FourierCore.create((msg,transfer)=>postMessage(msg,transfer||[]));
onmessage=e=>engine.handle(e.data);
