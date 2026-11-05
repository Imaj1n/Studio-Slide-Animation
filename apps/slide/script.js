
const $=id=>document.getElementById(id),st=$('st'),wrap=$('wrap');
const SRC=document.documentElement.outerHTML;
// Kabar ke shell (index.html utama): mode presentasi menyembunyikan sidebar
const shellImm=on=>{try{parent.postMessage({type:'shell:immersive',on},'*')}catch(_){}};
let slides=[],cur=0,sel=null,ms=new Set(),K=1,pres=false,tr='slide';
const pv={on:false,p:0,n:0,d:new Set(),w:new Map(),q:0};
const msg=t=>{$('msg').style.color='';$('msg').textContent=t||''};

function fit(){const r=wrap.getBoundingClientRect();K=Math.min(r.width/960,r.height/540)||1;st.style.transform=`translate(-50%,-50%) scale(${K})`;
 document.querySelectorAll('.fp').forEach(f=>{if(f.style.top&&f.offsetWidth){
  f.style.left=Math.max(0,Math.min(r.width-f.offsetWidth,parseFloat(f.style.left)))+'px';f.style.top=Math.max(0,Math.min(r.height-f.offsetHeight,parseFloat(f.style.top)))+'px'}})}
new ResizeObserver(fit).observe(wrap);

// Ekstrak kontainer animasi + skrip dari HTML sumber
function extract(html){
 const d=new DOMParser().parseFromString(html,'text/html');
 const s=d.querySelector('#stage')||[...d.querySelectorAll('div')].find(e=>e.querySelector('svg,canvas'));
 if(!s)throw new Error('Kontainer animasi (#stage atau div berisi svg/canvas) tidak ditemukan.');
 s.style.cssText+=';width:100%;height:100%;aspect-ratio:auto';
 const nav=d.querySelector('#nav');
 const js=[...d.querySelectorAll('script:not([src])')].filter(x=>!x.type||/(java|ecma)script/i.test(x.type)).map(x=>x.textContent).join('\n');
 const css=[...d.querySelectorAll('head style')].map(x=>x.textContent).join(''),q=/#stage\{[^}]*aspect-ratio:\s*([\d.]+)\s*\/\s*([\d.]+)/.exec(css);
 return{html:s.outerHTML+(nav?nav.outerHTML:''),js,title:d.title||'widget',ar:q?+q[2]/+q[1]:.5};
}
// Jalankan skrip dalam lingkup widget; go(i) diekspos sebagai API
function mount(root,ex){
 root.innerHTML=ex.html;const api={};
 const fdoc={getElementById:id=>root.querySelector('[id="'+id+'"]')};
 const ael=(t,f,o)=>root.addEventListener(t,f,o);
 const src=ex.js.replace(/^\s*\{"v":1,"app":"katex".*\n/,'').replace(/ui\(\);\s*requestAnimationFrame\(frame\)\}\)\(/,'API.go=go;API.n=S.length;API.get=()=>idx;API.busy=()=>m<1;API.pmEl=typeof PN!="undefined"?PN:0;API.pm=API.pmEl?()=>{PN.style.display=PN.style.display=="block"?"none":"block";need=1;return PN.style.display=="block"}:0;$&').replace('function frame(t){','function frame(t){if(API.dead)return;');
 try{new Function('document','addEventListener','API',src)(fdoc,ael,api)}catch(e){msg('Skrip widget gagal: '+e.message)}
 api.tk=0;if(api.pmEl)api.fp=mkPanel(api,ex.title);
 // go() aslinya hanya valid untuk selangkah bersebelahan dan setelah morph selesai: to() menjalankannya berurutan
 if(api.go)api.to=t=>new Promise(res=>{const id=++api.tk;const tick=()=>{
  if(api.tk!=id||api.dead)return res();if(api.busy())return requestAnimationFrame(tick);
  const i=api.get();if(i==t)return res();api.go(i+(t>i?1:-1));requestAnimationFrame(tick)};tick()});
 return api;
}

// Panel slider #pm dikeluarkan dari widget -> panel melayang (bisa digeser, tidak ikut ter-scale)
function mkPanel(api,title){
 const fp=document.createElement('div');fp.className='fp';fp.style.display='none';
 fp.innerHTML='<div class="fh"><span></span><b class="fx">×</b></div>';
 const h=fp.firstChild;api.ft=h.firstChild;api.ft.textContent='Slider · '+title;
 fp.appendChild(api.pmEl);$('fl').appendChild(fp);
 fp.onclick=e=>e.stopPropagation();
 fp.querySelector('.fx').onclick=()=>{api.open=api.pm();fpSync()};
 h.onpointerdown=e=>{
  if(e.target.className=='fx')return;h.setPointerCapture(e.pointerId);
  const r=fp.getBoundingClientRect(),f=$('fl').getBoundingClientRect(),dx=e.clientX-r.left,dy=e.clientY-r.top;
  const mv=v=>{fp.style.transform='none';fp.style.bottom='auto';
   fp.style.left=Math.max(0,Math.min(f.width-fp.offsetWidth,v.clientX-f.left-dx))+'px';
   fp.style.top=Math.max(0,Math.min(f.height-fp.offsetHeight,v.clientY-f.top-dy))+'px'};
  const up=()=>{h.removeEventListener('pointermove',mv);h.removeEventListener('pointerup',up)};
  h.addEventListener('pointermove',mv);h.addEventListener('pointerup',up)};
 return fp;
}
function fpSync(){
 let any=false;
 slides.forEach((s,i)=>s.items.forEach(it=>{const a=it.api;if(it.t!='w'||!a||!a.fp)return;
  if(i==cur)any=true;a.fp.style.display=i==cur&&a.open?'block':'none'}));
 $('pmb').style.display=any?'block':'none';
}
function togglePM(){slides[cur].items.forEach(it=>{if(it.t=='w'&&it.api&&it.api.pm)it.api.open=it.api.pm()});fpSync()}
$('pmb').onclick=e=>{e.stopPropagation();togglePM()};
function paint(it){
 const e=it.el.style;e.left=it.x+'px';e.top=it.y+'px';e.width=it.w+'px';e.height=it.h+'px';
 if(it.t=='x'){const t=it.el.firstChild.style;t.fontSize=it.fs+'px';t.color=it.col;t.fontWeight=it.b?700:400;t.textAlign=it.al;it.el.firstChild.classList.toggle('m',it.ff=='mono')}
}
function mkItem(it,s){
 const el=document.createElement('div');el.className='it';
 if(it.t=='x'){const t=document.createElement('div');t.className='tx';t.textContent=it.txt;el.appendChild(t)}
 else if(it.t=='i'){const im=document.createElement('img');im.src=it.src;im.draggable=false;im.className='im';el.appendChild(im)}
 else{const w=document.createElement('div');w.className='w';el.appendChild(w);it.api=mount(w,it.ex)}
 const g=document.createElement('div');g.className='bg';el.appendChild(g);it.bg=g;
 const rz=document.createElement('div');rz.className='rz';el.appendChild(rz);
 it.el=el;s.el.appendChild(el);s.items.push(it);paint(it);el.classList.toggle('lk',!!it.lk);el.classList.toggle('eh',!!it.eh);
 el.onpointerdown=e=>{if(pres||e.target.isContentEditable)return;
  if(e.shiftKey||e.ctrlKey||e.metaKey){select(it,true);return}
  if(!ms.has(it))select(it);else if(sel!=it){sel=it;fill()}
  drag(e,it,e.target==rz&&ms.size==1)};
 if(it.t=='x')el.ondblclick=()=>{const t=el.firstChild;t.contentEditable=true;t.focus();t.onblur=()=>{t.contentEditable=false;it.txt=t.innerText;thumbs()}};
}
function drag(e,it,rs){
 const t=e.currentTarget;let L=rs?[it]:[...ms];
 if(pv.on){const f=L.filter(i=>!pv.d.has(i));if(f.length<L.length)msg('Objek yang sedang dipindah/diskalakan urutan klik (mis. A>kiri-atas*0.5) tidak bisa digeser di sini: geser di langkah sebelum gerakan itu, atau ubah teks urutan.');L=f;if(!L.length)return}
 t.setPointerCapture(e.pointerId);
 const x0=e.clientX,y0=e.clientY,o=L.map(i=>({i,x:i.x,y:i.y,w:i.w,h:i.h}));let moved=false;
 const mv=v=>{const dx=(v.clientX-x0)/K,dy=(v.clientY-y0)/K;if(Math.abs(dx)+Math.abs(dy)>2)moved=true;
  o.forEach(q=>{if(rs){q.i.w=Math.max(40,Math.round(q.w+dx));q.i.h=Math.max(30,Math.round(q.h+dy))}
   else{q.i.x=Math.round(q.x+dx);q.i.y=Math.round(q.y+dy)}paint(q.i)});
  fill();thumbs()};
 const up=()=>{t.removeEventListener('pointermove',mv);t.removeEventListener('pointerup',up);if(!moved&&ms.size>1&&!rs)select(it)};
 t.addEventListener('pointermove',mv);t.addEventListener('pointerup',up);
}

function zorder(it,op){
 const s=slides[cur],a=s.items,i=a.indexOf(it);
 let j=op=='up'?i+1:op=='down'?i-1:op=='front'?a.length-1:0;j=Math.max(0,Math.min(a.length-1,j));
 if(j==i)return;a.splice(i,1);a.splice(j,0,it);a.forEach(x=>s.el.appendChild(x.el));layers();thumbs();
}
function layers(){
 const s=slides[cur],L=$('ly');if(!s)return;names(s);L.textContent='';
 const h=document.createElement('b');h.textContent='Layer (atas → bawah)';L.appendChild(h);
 [...s.items].reverse().forEach(it=>{
  const r=document.createElement('div');r.className='lr'+(ms.has(it)?' on':'');
  const n=document.createElement('span');n.className='ln';n.textContent=it.nm;
  const b=document.createElement('span');b.className='lb';b.textContent=it.t=='w'?it.ex.title:it.t=='x'?(it.txt||'').slice(0,16):'gambar';
  r.append(n,b);
  [[it.eh?'🚫':'👁',()=>{it.eh=!it.eh;it.el.classList.toggle('eh',!!it.eh)}],[it.lk?'🔒':'🔓',()=>{it.lk=!it.lk;it.el.classList.toggle('lk',!!it.lk)}],['▲',()=>zorder(it,'up')],['▼',()=>zorder(it,'down')]].forEach(([t,f])=>{
   const i=document.createElement('i');i.textContent=t;i.onclick=e=>{e.stopPropagation();f();layers()};r.appendChild(i)});
  r.onclick=e=>select(it,e.shiftKey||e.ctrlKey||e.metaKey);L.appendChild(r)});
}
$('zf').onclick=()=>[...slides[cur].items].filter(i=>ms.has(i)).forEach(i=>zorder(i,'front'));
$('zb').onclick=()=>[...slides[cur].items].filter(i=>ms.has(i)).reverse().forEach(i=>zorder(i,'back'));
// it + add(shift/ctrl) = tambah/hapus dari pilihan; tanpa add = pilih satu (atau kosong)
function select(it,add){
 if(add&&it){
  if(ms.has(it)){ms.delete(it);it.el.classList.remove('sel')}else{ms.add(it);it.el.classList.add('sel')}
  sel=ms.has(it)?it:[...ms].pop()||null;
 }else{ms.forEach(i=>i.el.classList.remove('sel'));ms.clear();sel=it;if(it){ms.add(it);it.el.classList.add('sel')}}
 fill();layers();
}
function fill(){
 $('pp').hidden=!sel;$('none').hidden=!!sel;st.classList.toggle('multi',ms.size>1);if(!sel){fillSeq();return}
 $('mc').textContent=ms.size>1?ms.size+' objek dipilih · seret untuk memindahkan bersama':'';
 ['x','y','w','h'].forEach(k=>$('p'+k).value=sel[k]);
 $('gt').hidden=sel.t!='x';$('gw').hidden=sel.t!='w';
 if(sel.t=='x'){$('fs').value=sel.fs;$('col').value=sel.col;$('bo').checked=!!sel.b;$('al').value=sel.al;$('ff').value=sel.ff||'sans'}
 else if(sel.api&&sel.api.n){$('sr').disabled=false;$('sr').max=sel.api.n-1;syncSr()}
 else{$('sr').disabled=true;$('sl').textContent='(tanpa API)'}
}
function syncSr(){if(sel&&sel.api&&sel.api.get){$('sr').value=sel.api.get();$('sl').textContent=(sel.api.get()+1)+' / '+sel.api.n}}
setInterval(()=>{if(!pres)syncSr()},250);
['x','y','w','h'].forEach(k=>$('p'+k).oninput=e=>{if(!sel)return;const v=+e.target.value;
 if((k=='x'||k=='y')&&ms.size>1){const d=v-sel[k];ms.forEach(i=>{i[k]+=d;paint(i)})}else{sel[k]=v;paint(sel)}thumbs()});
$('fs').oninput=e=>{sel.fs=+e.target.value||12;paint(sel)};
$('col').oninput=e=>{sel.col=e.target.value;paint(sel)};
$('bo').onchange=e=>{sel.b=e.target.checked;paint(sel)};
$('al').onchange=e=>{sel.al=e.target.value;paint(sel)};
$('ff').onchange=e=>{sel.ff=e.target.value;paint(sel)};
$('sr').oninput=e=>{sel.api.to&&sel.api.to(+e.target.value)};

function applyBg(s){const b=s.bg;s.el.style.background=b.c+(b.img?' url("'+b.img+'") center/'+b.fit+' no-repeat':'')}
const ser=s=>({seq:s.seq||'',hid:!!s.hid,bg:s.bg,items:s.items.map(({el,api,bg,nm,hs,rv,...r})=>r)});
$('bgc').oninput=e=>{slides[cur].bg.c=e.target.value;applyBg(slides[cur]);thumbs()};
$('bgf').onchange=e=>{slides[cur].bg.fit=e.target.value;applyBg(slides[cur])};
$('bgi').onclick=()=>$('fbg').click();
$('fbg').onchange=e=>{const f=e.target.files[0];e.target.value='';if(!f)return;
 const r=new FileReader();r.onload=()=>{slides[cur].bg.img=r.result;applyBg(slides[cur])};r.readAsDataURL(f)};
$('bgx').onclick=()=>{slides[cur].bg.img='';applyBg(slides[cur])};
$('bgd').onclick=()=>{const b=slides[cur].bg;if(!b.img)return msg('Belum ada gambar latar.');
 const im=new Image();im.onload=()=>{const c=document.createElement('canvas');c.width=c.height=1;const x=c.getContext('2d');
  x.drawImage(im,0,0,1,1);b.c='#'+[...x.getImageData(0,0,1,1).data].slice(0,3).map(v=>v.toString(16).padStart(2,'0')).join('');
  applyBg(slides[cur]);fillSeq();thumbs()};im.src=b.img};
$('bga').onclick=()=>{const b=slides[cur].bg;slides.forEach(t=>{t.bg={...b};applyBg(t)});thumbs()};
$('cS').onclick=()=>{const d=ser(slides[cur]);addSlide(d.items,cur+1,{seq:d.seq,hid:d.hid,bg:{...d.bg}});setCur(cur+1)};
function reorder(){slides.forEach(s=>st.appendChild(s.el))}
function addSlide(items=[],at=slides.length,meta={}){
 const s={el:document.createElement('div'),items:[],seq:meta.seq||'',hid:!!meta.hid,bg:Object.assign({c:'#ffffff',img:'',fit:'cover'},meta.bg)};s.el.className='sl';applyBg(s);
 s.el.onpointerdown=e=>{
  if(e.target!=s.el||pres)return;
  if(!(e.shiftKey||e.ctrlKey||e.metaKey))select(null);
  const r=st.getBoundingClientRect(),x0=(e.clientX-r.left)/K,y0=(e.clientY-r.top)/K,base=new Set(ms);
  const box=document.createElement('div');box.className='mq';s.el.appendChild(box);s.el.setPointerCapture(e.pointerId);
  const mv=v=>{const x1=(v.clientX-r.left)/K,y1=(v.clientY-r.top)/K,L=Math.min(x0,x1),T=Math.min(y0,y1),W=Math.abs(x1-x0),H=Math.abs(y1-y0);
   box.style.cssText='left:'+L+'px;top:'+T+'px;width:'+W+'px;height:'+H+'px';
   s.items.forEach(it=>{if(it.lk||it.eh||it.el.classList.contains('pvh'))return;const hit=it.x<L+W&&it.x+it.w>L&&it.y<T+H&&it.y+it.h>T;
    if(hit&&!ms.has(it)){ms.add(it);it.el.classList.add('sel')}
    else if(!hit&&ms.has(it)&&!base.has(it)){ms.delete(it);it.el.classList.remove('sel')}});
   sel=[...ms].pop()||null;fill();layers()};
  const up=()=>{s.el.removeEventListener('pointermove',mv);s.el.removeEventListener('pointerup',up);box.remove()};
  s.el.addEventListener('pointermove',mv);s.el.addEventListener('pointerup',up)};
 slides.splice(at,0,s);reorder();items.forEach(i=>mkItem(i,s));return s;
}
function setCur(i){if(pv.on)pvClear();cur=i;slides.forEach((s,k)=>s.el.classList.toggle('cur',k==i));select(null);thumbs();if(pv.on){pv.p=0;pvApply()}}
function thumbs(){
 const r=$('rail');r.innerHTML='';
 slides.forEach(s=>{names(s);s.items.forEach(it=>{it.bg.textContent=it.nm;if(it.api&&it.api.ft)it.api.ft.textContent='Slider '+it.nm})});
 slides.forEach((s,i)=>{
  const d=document.createElement('div');d.className='th'+(i==cur?' cur':'');d.innerHTML='<b>'+(i+1)+'</b>';d.style.background=s.bg.c;
  s.items.forEach(it=>{const q=document.createElement('i');if(it.t=='w')q.className='w';
   q.style.cssText=`left:${it.x/9.6}%;top:${it.y/5.4}%;width:${it.w/9.6}%;height:${it.h/5.4}%`;d.appendChild(q)});
  d.onclick=()=>setCur(i);r.appendChild(d)});fpSync();layers();pvQ();
}

$('aS').onclick=()=>{addSlide([],cur+1);setCur(cur+1)};
$('aT').onclick=()=>{const it={t:'x',x:80,y:60,w:800,h:80,txt:'Klik dua kali untuk mengedit',fs:36,col:'#0f172a',b:1,al:'left'};mkItem(it,slides[cur]);select(it);thumbs()};
$('dS').onclick=()=>{if(slides.length<2)return;{const d=slides.splice(cur,1)[0];d.items.forEach(it=>it.api&&it.api.fp&&it.api.fp.remove());d.el.remove()}setCur(Math.min(cur,slides.length-1))};
function mvS(d){const j=cur+d;if(j<0||j>=slides.length)return;[slides[cur],slides[j]]=[slides[j],slides[cur]];reorder();setCur(j)}
$('mu').onclick=()=>mvS(-1);$('md').onclick=()=>mvS(1);
$('dI').onclick=()=>{if(!ms.size)return;const t=slides[cur];
 ms.forEach(it=>{it.api&&it.api.fp&&it.api.fp.remove();it.el.remove()});t.items=t.items.filter(i=>!ms.has(i));select(null);thumbs()};
$('tr').onchange=e=>tr=e.target.value;
$('seq').oninput=e=>{slides[cur].seq=e.target.value;chk();pvQ()};
$('hid').addEventListener('change',()=>pvQ());
$('hid').onchange=e=>{slides[cur].hid=e.target.checked};

const ok=t=>{const m=$('msg');m.style.color='#16a34a';m.textContent=t;setTimeout(()=>{if(m.textContent==t)msg('')},3500)};
// Presentasi hasil Simpan .html membawa data proyek dalam elemen JSON bernama proj; dibaca tanpa menjalankan skripnya
function readProj(t){
 const e=new DOMParser().parseFromString(t,'text/html').getElementById('proj');
 const p=e?JSON.parse(e.textContent):null;return p&&Array.isArray(p.slides)?p:null;
}
function clearAll(){
 slides.forEach(s=>{s.items.forEach(it=>{if(it.api){it.api.dead=true;it.api.fp&&it.api.fp.remove()}});s.el.remove()});
 slides=[];cur=0;select(null);
}
function importProj(p,rep){
 if(rep){clearAll();tr=p.tr||'slide';$('tr').value=tr}
 const at=slides.length;
 p.slides.forEach(d=>addSlide(d.items||d,slides.length,d));
 if(!slides.length)addSlide([]);
 setCur(rep?0:at);
}
function load(f,x=160,y=110){
 msg('');
 f.text().then(t=>{
  const p=readProj(t);
  if(p){importProj(p,false);ok(p.slides.length+' slide ditambahkan dari '+f.name);return}
  const ex=extract(t),it={t:'w',x:Math.round(x),y:Math.round(y),w:640,h:Math.round(640*ex.ar),ex};
  mkItem(it,slides[cur]);select(it);thumbs();
 }).catch(e=>msg(e.message));
}
function addImg(f,x=200,y=100){
 const r=new FileReader();r.onerror=()=>msg('Gagal membaca gambar.');
 r.onload=()=>{const im=new Image();im.onerror=()=>msg('File bukan gambar yang valid.');
  im.onload=()=>{const k=Math.min(1,480/im.width,360/im.height);
   const it={t:'i',x:Math.round(x),y:Math.round(y),w:Math.round(im.width*k),h:Math.round(im.height*k),src:r.result};
   mkItem(it,slides[cur]);select(it);thumbs()};im.src=r.result};
 r.readAsDataURL(f);
}
// Terima animasi langsung dari Editor Geometri / KaTeX lewat shell (tanpa file .html)
function addHTML(t,title){
 const ex=extract(t);if(title)ex.title=title;
 const k=slides[cur].items.filter(i=>i.t=='w').length%6*24;
 const it={t:'w',x:160+k,y:110+k,w:640,h:Math.round(640*ex.ar),ex};
 mkItem(it,slides[cur]);select(it);thumbs();return it;
}
addEventListener('message',e=>{
 const d=e.data;if(!d||d.type!='studio:add'||e.source!==parent||typeof d.html!='string')return;
 try{if(pres)exit();addHTML(d.html,d.title);ok((d.title||'Animasi')+' masuk ke slide '+(cur+1)+'. Atur posisi & ukurannya.')}
 catch(x){msg(x.message);parent.postMessage({type:'shell:toast',kind:'err',text:'Studio Slide: '+x.message},'*')}
});
$('aI').onclick=()=>$('fim').click();
$('fim').onchange=e=>{e.target.files[0]&&addImg(e.target.files[0]);e.target.value=''};
$('aW').onclick=()=>$('fi').click();
$('oP').onclick=()=>$('fo').click();
$('fo').onchange=e=>{const f=e.target.files[0];e.target.value='';if(!f)return;
 f.text().then(t=>{
  const p=readProj(t);if(!p)throw new Error('Bukan presentasi hasil Simpan .html (data proyek tidak ditemukan).');
  let go=true;try{go=confirm('Ganti presentasi yang sedang dibuka dengan "'+f.name+'"? Perubahan yang belum disimpan akan hilang.')}catch(_){}
  if(!go)return;importProj(p,true);ok('Dibuka: '+p.slides.length+' slide dari '+f.name);
 }).catch(x=>msg(x.message))};
$('rw').onclick=()=>$('frw').click();
$('frw').onchange=e=>{const f=e.target.files[0];e.target.value='';if(!f||!sel||sel.t!='w')return;const it=sel;
 f.text().then(t=>{const ex=extract(t);it.api.dead=true;it.api.fp&&it.api.fp.remove();it.ex=ex;it.api=mount(it.el.firstChild,ex);
  fill();thumbs();ok('Sumber widget diganti.')}).catch(x=>msg(x.message))};
$('fi').onchange=e=>{e.target.files[0]&&load(e.target.files[0]);e.target.value=''};
wrap.ondragover=e=>e.preventDefault();
wrap.ondrop=e=>{e.preventDefault();const f=e.dataTransfer.files[0],r=st.getBoundingClientRect();
 f&&(f.type.startsWith('image/')?addImg(f,(e.clientX-r.left)/K-120,(e.clientY-r.top)/K-90):load(f,(e.clientX-r.left)/K-320,(e.clientY-r.top)/K-160))};

// Presentasi: langkah animasi widget dulu, baru pindah slide dengan transisi
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const WS=s=>s.items.filter(i=>i.t=='w');
// Satu baris = satu klik. Token berurutan; "+" = serentak.
// A2 | B3-5 : langkah widget   A>kanan-atas*0.5 | T1>@480:100 | G1>kembali : gerak/skala   G1>muncul | hilang
const PRE={tengah:[0,0],kiri:[-1,0],kanan:[1,0],atas:[0,-1],bawah:[0,1],'kiri-atas':[-1,-1],'kanan-atas':[1,-1],'kiri-bawah':[-1,1],'kanan-bawah':[1,1]};
function names(s){
 const m=new Map(),used=new Set(s.items.map(i=>i.n).filter(Boolean)),c={w:0,x:0,i:0};
 const gen=t=>{for(;;){const n=t=='w'?String.fromCharCode(65+c.w++):(t=='x'?'T':'G')+(++c[t]);if(!used.has(n)){used.add(n);return n}}};
 s.items.forEach(it=>{if(!it.n)it.n=gen(it.t);it.nm=it.n;m.set(it.n.toUpperCase(),it)});
 return m;
}
// Hasil: press[] -> token[] -> cabang[] (jalan bebas, "+") -> lajur[] (serentak per langkah, "&") -> aksi{it,k:'s'|'m'|'v'}
function parse(s,safe){
 const NM=names(s),txt=(s.seq||'').trim(),ps=new Map();s.ref=new Set();
 if(!txt)return WS(s).flatMap(it=>it.api&&it.api.n?[...Array(it.api.n-1)].map((_,i)=>[[[[{it,k:'s',step:i+2}]]]]):[]);
 return txt.split('\n').map(l=>l.trim()).filter(Boolean).map((l,ln)=>{
  const E=m=>{if(!safe)throw new Error('Baris '+(ln+1)+': '+m);return[]};
  return l.split(/[,;\s]+/).filter(Boolean).map(tok=>tok.split('+').map(br=>br.split('&').map(sub=>{
   let m=/^([A-Za-z]\d*)>(.+)$/.exec(sub);
   if(m){
    const it=NM.get(m[1].toUpperCase());if(!it)return E('"'+m[1]+'" tidak dikenali');
    const t=/^([a-z-]+|@-?[\d.]+:-?[\d.]+)(?:\*([\d.]+))?$/i.exec(m[2]);if(!t)return E('target "'+m[2]+'" tidak valid');
    const g=t[1].toLowerCase();s.ref.add(it);
    if(g=='muncul'||g=='hilang')return[{it,k:'v',v:g=='muncul'?1:0}];
    const sc=g=='kembali'?1:t[2]?+t[2]:ps.get(it)||1,w=it.w*sc,h=it.h*sc;let cx,cy;ps.set(it,sc);
    if(g=='kembali'){cx=it.x+it.w/2;cy=it.y+it.h/2}
    else if(g[0]=='@'){[cx,cy]=g.slice(1).split(':').map(Number)}
    else if(PRE[g]){cx=480+PRE[g][0]*(456-w/2);cy=270+PRE[g][1]*(246-h/2)}
    else return E('posisi "'+g+'" tidak dikenali');
    return[{it,k:'m',cx,cy,s:sc}]}
   m=/^([A-Za-z])(\d+)(?:-(\d+))?$/.exec(sub);const it=m&&NM.get(m[1].toUpperCase());
   if(!it||it.t!='w')return E('"'+sub+'" tidak dikenali');
   const a=+m[2],b=+(m[3]||m[2]),n=it.api&&it.api.n||0;
   if(a<1||b<1||a>n||b>n)return E(m[1].toUpperCase()+' hanya punya '+n+' langkah');
   s.ref.add(it);const r=[];for(let x=a;a<=b?x<=b:x>=b;x+=a<=b?1:-1)r.push({it,k:'s',step:x});return r
  }))).filter(tk=>tk.some(br=>br.some(l=>l.length)))}).filter(p=>p.length);
}
function fillSeq(){
 const s=slides[cur];if(!s)return;$('seq').value=s.seq||'';$('hid').checked=!!s.hid;$('bgc').value=s.bg.c;$('bgf').value=s.bg.fit;names(s);
 $('wl').textContent=s.items.map(it=>it.nm+': '+(it.t=='w'?it.ex.title+' ('+(it.api&&it.api.n||0)+' langkah)':it.t=='x'?'"'+it.txt.slice(0,18)+'"':'gambar')).join('\n')||'Belum ada objek di slide ini.';
 chk();
}
function chk(){try{parse(slides[cur]);msg('')}catch(e){msg(e.message)}}
const stOf=(S,it)=>S.get(it)||(S.set(it,{step:1,cx:it.x+it.w/2,cy:it.y+it.h/2,s:1,v:!it.hs,rv:!it.hs}),S.get(it));
function setT(it,cx,cy,k){it.el.style.transform='translate('+(cx-it.x-it.w/2)+'px,'+(cy-it.y-it.h/2)+'px) scale('+k+')'}
// Mulai slide dari awal: widget dipasang ulang, posisi & visibilitas direset
function resetSlide(s){
 s.items.forEach(it=>{if(it.t=='w'){it.api.dead=true;it.api.fp&&it.api.fp.remove();it.api=mount(it.el.firstChild,it.ex)}});
 s.P=parse(s,true);s.p=0;s.busy=false;
 s.items.forEach(it=>{const e=it.el.style;it.hs=!!(s.hid&&s.ref.has(it));it.rv=!it.hs;
  e.transition='none';e.transform='';e.opacity=it.hs?0:1;it.el.offsetWidth;e.transition=''});
}
async function doAct(a){
 const it=a.it;
 if(a.k=='v'){it.rv=1;it.el.style.opacity=a.v;await sleep(450);return}
 if(!it.rv){it.rv=1;it.el.style.opacity=1;await sleep(450)}
 if(a.k=='s'){if(it.api&&it.api.to)await it.api.to(a.step-1)}
 else{setT(it,a.cx,a.cy,a.s);await sleep(950)}
}
// Satu cabang: lajur-lajurnya berjalan serentak, langkah ke-r semua lajur selesai dulu sebelum langkah ke-(r+1)
async function runBr(br){
 const n=Math.max(...br.map(l=>l.length));
 for(let r=0;r<n;r++)await Promise.all(br.map(l=>l[r]?doAct(l[r]):0));
}
async function runP(s,d){
 s.busy=true;
 try{
  if(d>0){for(const tk of s.P[s.p-1])await Promise.all(tk.map(runBr))}
  else{
   const S=stateAt(s,s.p);
   await Promise.all(s.items.map(it=>{const o=stOf(S,it);it.rv=o.rv;it.el.style.opacity=o.v?1:0;setT(it,o.cx,o.cy,o.s);
    return it.t=='w'&&it.api.to?it.api.to(o.step-1):sleep(950)}))}
 }finally{s.busy=false}
}
// Keadaan semua objek setelah p klik pertama (dipakai presentasi mundur & Step Preview)
function stateAt(s,p){
 const S=new Map();
 s.P.slice(0,p).forEach(P=>P.forEach(tk=>tk.forEach(br=>br.forEach(ch=>ch.forEach(a=>{const o=stOf(S,a.it);
  if(a.k=='v'){o.v=a.v;o.rv=1}
  else{if(!o.rv){o.rv=1;o.v=1}if(a.k=='s')o.step=a.step;else{o.cx=a.cx;o.cy=a.cy;o.s=a.s}}})))));
 return S;
}
// ===== Step Preview: tampilkan keadaan slide setelah klik ke-p di editor, objek tetap bisa digeser =====
function pvQ(){if(!pv.on||pv.q)return;pv.q=1;requestAnimationFrame(()=>{pv.q=0;pvApply(true)})}
function pvClear(){
 slides.forEach(s=>s.items.forEach(it=>{it.el.style.opacity='';it.el.style.transform='';it.el.classList.remove('pvh')}));
 pv.w.forEach((v,it)=>{if(it.api&&it.api.to)it.api.to(v)});pv.w.clear();pv.d=new Set();
}
function pvApply(light){
 const s=slides[cur];if(!s||!pv.on)return;
 s.P=parse(s,true);
 s.items.forEach(it=>{it.hs=!!(s.hid&&s.ref.has(it))});
 pv.n=s.P.length;pv.p=Math.max(0,Math.min(pv.p,pv.n));
 const S=stateAt(s,pv.p);pv.d=new Set();
 s.items.forEach(it=>{const o=stOf(S,it),e=it.el.style;
  if(o.s!=1||Math.abs(o.cx-(it.x+it.w/2))>.5||Math.abs(o.cy-(it.y+it.h/2))>.5)pv.d.add(it);
  e.opacity=o.v?1:.15;it.el.classList.toggle('pvh',!o.v);setT(it,o.cx,o.cy,o.s);
  if(!light&&it.t=='w'&&it.api&&it.api.to){if(!pv.w.has(it)&&it.api.get)pv.w.set(it,it.api.get());it.api.to(o.step-1)}});
 pvUI(s);
}
function pvUI(s){
 $('pvl').textContent=pv.p+' / '+pv.n;$('pvs').max=pv.n;$('pvs').value=pv.p;
 const L=(s.seq||'').split('\n').map(x=>x.trim()).filter(Boolean);
 $('pvt').textContent=pv.n?(pv.p==0?'Kondisi awal (sebelum klik 1)':'Setelah klik '+pv.p+(L.length==pv.n?': '+L[pv.p-1]:'')):'Slide ini belum punya langkah (isi Urutan klik, atau tambah widget).';
}
function pvGo(d){pv.p+=d;pvApply()}
function pvSet(on){
 if(on==pv.on)return;
 if(on){pv.on=true;pv.p=0;pv.w.clear()}
 else{pvClear();pv.on=false}
 st.classList.toggle('pv',on);$('pvb').hidden=!on;$('pvm').classList.toggle('on',on);
 if(on)pvApply();else{fill();msg('')}
}
$('pvm').onclick=()=>pvSet(!pv.on);
$('pv0').onclick=()=>{pv.p=0;pvApply()};$('pv9').onclick=()=>{pv.p=1e9;pvApply()};
$('pvp').onclick=()=>pvGo(-1);$('pvn').onclick=()=>pvGo(1);
$('pvs').oninput=e=>{pv.p=+e.target.value;pvApply()};
function stepW(s,d){
 if(!s.P)resetSlide(s);
 if(s.busy)return true;
 const n=s.p+d;if(n<0||n>s.P.length)return false;
 s.p=n;runP(s,d);return true;
}
function go(n,d){
 const a=slides[cur].el,b=slides[n].el;cur=n;
 resetSlide(slides[n]);fpSync();
 b.classList.add('cur');a.classList.add('out');a.classList.remove('cur');a.style.zIndex=1;b.style.zIndex=2;
 const o={duration:500,easing:'ease-in-out',fill:'both'};
 const F={
  slide:[[{transform:'translateX(0)'},{transform:`translateX(${-d*100}%)`}],[{transform:`translateX(${d*100}%)`},{transform:'translateX(0)'}]],
  fade:[[{opacity:1},{opacity:0}],[{opacity:0},{opacity:1}]],
  zoom:[[{opacity:1,transform:'scale(1)'},{opacity:0,transform:'scale(1.25)'}],[{opacity:0,transform:'scale(.8)'},{opacity:1,transform:'scale(1)'}]]}[tr];
 a.animate(F[0],o).onfinish=()=>{a.classList.remove('out');a.getAnimations().forEach(x=>x.cancel())};
 b.animate(F[1],o).onfinish=()=>b.getAnimations().forEach(x=>x.cancel());
}
function next(){if(!stepW(slides[cur],1)&&cur<slides.length-1)go(cur+1,1)}
function prev(){if(!stepW(slides[cur],-1)&&cur>0)go(cur-1,-1)}
function present(){
 shellImm(true);pvSet(false);pres=true;document.body.classList.add('pres');select(null);fit();requestAnimationFrame(fit);resetSlide(slides[cur]);fpSync();
 try{document.documentElement.requestFullscreen().catch(()=>{})}catch(_){}
}
function exit(){
 shellImm(false);pres=false;document.body.classList.remove('pres');slides.forEach(s=>s.items.forEach(it=>{it.el.style.opacity='';it.el.style.transform=''}));setCur(cur);requestAnimationFrame(fit);
 if(document.fullscreenElement)document.exitFullscreen();
}
$('pr').onclick=present;
wrap.onclick=()=>{if(pres)next()};
document.onfullscreenchange=()=>{if(!document.fullscreenElement&&pres)exit()};
addEventListener('keydown',e=>{
 if(e.ctrlKey&&e.key.toLowerCase()=='m'){e.preventDefault();togglePM();return}
 const inF=e.target.closest&&e.target.closest('.fp');
 if(pres){const k=e.key;
  if(k=='Escape')exit();
  else if(inF){}
  else if(['ArrowRight','ArrowDown','PageDown',' '].includes(k)){e.preventDefault();next()}
  else if(['ArrowLeft','ArrowUp','PageUp'].includes(k)){e.preventDefault();prev()}
  return}
 if(e.target.closest('input,select,textarea,[contenteditable=true]'))return;
 if(pv.on&&(e.key=='['||e.key==']')){e.preventDefault();pvGo(e.key==']'?1:-1);return}
 if(e.key=='Delete'&&ms.size)$('dI').click();
 else if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()=='a'){e.preventDefault();ms.clear();
  slides[cur].items.forEach(i=>{if(!i.lk&&!i.eh){ms.add(i);i.el.classList.add('sel')}});sel=[...ms].pop()||null;fill();layers()}
 else if(e.key.startsWith('Arrow')&&ms.size){e.preventDefault();const d=e.shiftKey?10:1;
  const dx=e.key=='ArrowLeft'?-d:e.key=='ArrowRight'?d:0,dy=e.key=='ArrowUp'?-d:e.key=='ArrowDown'?d:0;
  ms.forEach(i=>{i.x+=dx;i.y+=dy;paint(i)});fill();thumbs()}
});

// Simpan: salin halaman ini + data proyek tertanam; file hasil langsung membuka mode presentasi
$('sv').onclick=async()=>{
 const j=JSON.stringify({tr,present:$('pa').checked,slides:slides.map(ser)}).replace(/</g,'\\u003c');
 let h=SRC.replace(new RegExp('<script id="pr'+'oj" type="application/json">[\\s\\S]*?<\\/scr'+'ipt>'),'');
 const pj='<script id="pr'+'oj" type="application/json">'+j+'<\/script>';
 if($('app').src){ // versi modular: CSS & JS dimasukkan kembali agar file hasil berdiri sendiri
  try{
   const get=u=>fetch(u).then(r=>{if(!r.ok)throw new Error(r.status);return r.text()});
   const[css,js]=await Promise.all([get($('appcss').href),get($('app').src)]);
   h=h.replace(/<link[^>]*id="appcss"[^>]*>/,()=>'<style>'+css+'</style>');
   h=h.replace(/<script[^>]*id="app"[^>]*><\/script>/,()=>pj+'<script id="app">'+js+'<\/script>');
  }catch(e){return msg('Simpan gagal: file CSS/JS tidak bisa dibaca. Buka aplikasi lewat http:// (hosting atau server lokal), bukan file://.')}
 }else h=h.replace('<script id="'+'app">',()=>pj+'<script id="'+'app">');
 const a=document.createElement('a');
 a.href=URL.createObjectURL(new Blob(['<!DOCTYPE html>'+h],{type:'text/html'}));a.download='presentasi.html';a.click();
};

// Inisialisasi
const pe=$('proj');
if(pe){
 const p=JSON.parse(pe.textContent);tr=p.tr||'slide';$('tr').value=tr;
 p.slides.forEach(d=>addSlide(d.items||d,slides.length,d));setCur(0);fit();if(p.present)present();
}else{
 addSlide([
  {t:'x',x:80,y:190,w:800,h:90,txt:'Judul Presentasi',fs:54,col:'#0f172a',b:1,al:'center'},
  {t:'x',x:80,y:300,w:800,h:50,txt:'Klik dua kali untuk mengedit · seret file .html ke slide',fs:24,col:'#475569',b:0,al:'center'}]);
 setCur(0);fit();
}
parent.postMessage({type:'shell:hello'},'*');
