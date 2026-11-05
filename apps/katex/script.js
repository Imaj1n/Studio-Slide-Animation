/* script.js — main thread: UI + menggambar saja.
   Semua kalkulasi berat (layout glyph, FFT, morph, evaluasi kurva Fourier) ada di core.js yang dijalankan
   di Web Worker (worker.js). Worker mengirim Float32Array (transferable, buffer didaur ulang) tiap frame. */
const $=id=>document.getElementById(id);
const cv=$('c'),ctx=cv.getContext('2d');
let AR=2;
const AL={sum:'∑',pi:'π',int:'∫',infty:'∞'};   // hanya untuk label tombol preset

// ================= klien engine (Worker, dengan fallback ke main thread) =================
let worker=null,eng=null,engReady=false,pending=[],lastGo=null,usedFallback=false;
let inflight=false,dirtyW=true,wAnim=false,acc=0,recycleBuf=null,lastF=null,newF=false,reqId=0;
const waiters=new Map();
function onReply(r){
 if(r.type==='frame'){
  inflight=false;wAnim=r.anim;
  if(lastF)recycleBuf=lastF.f.buffer;            // frame lama sudah tidak dipakai -> kembalikan ke worker
  const n=r.n,NP=r.NP,f=new Float32Array(r.f),tipOff=n*NP*2,stOff=tipOff+n*2;
  lastF={n,NP,NC:r.NC,K:r.K,focus:r.focus,chainN:r.chainN,f,tipOff,stOff,chOff:stOff+n};newF=true}
 else if(r.type==='export'){const w=waiters.get(r.id);if(w){waiters.delete(r.id);w.ok(r)}}
 else if(r.type==='error'){
  inflight=false;console.error('[core]',r.for,r.message);
  const w=waiters.get(r.id);if(w){waiters.delete(r.id);w.err(new Error(r.message))}}}
function send(msg,tr){
 if(msg.type==='go')lastGo=msg;
 if(worker){worker.postMessage(msg,tr||[]);return}
 if(engReady){eng.handle(msg);return}
 pending.push(msg)}
function startFallback(){            // Worker tidak tersedia (mis. dibuka via file://) -> jalankan core di main thread
 if(usedFallback)return;usedFallback=true;
 if(worker){try{worker.terminate()}catch(e){}worker=null}
 inflight=false;
 const boot=()=>{eng=FourierCore.create(r=>setTimeout(()=>onReply(r),0));engReady=true;
  const q=pending;pending=[];if(lastGo&&!q.includes(lastGo))q.unshift(lastGo);q.forEach(m=>eng.handle(m))};
 const s=document.createElement('script');s.src='core.js';s.onload=boot;
 s.onerror=()=>console.error('core.js gagal dimuat');document.head.appendChild(s)}
try{
 worker=new Worker('worker.js');
 worker.onmessage=e=>onReply(e.data);
 worker.onerror=e=>{console.warn('Worker gagal, pakai main thread:',e.message);startFallback()};
}catch(e){worker=null;startFallback()}
function request(msg){return new Promise((ok,err)=>{msg.id=++reqId;waiters.set(msg.id,{ok,err});send(msg)})}
function go(text,stk){
 send({type:'go',text,stk:stk===undefined?$('st').checked:!!stk,AR,mode:$('md').value,motion:$('mv').value});
 dirtyW=true}
['K','la','ep','sp'].forEach(id=>['input','change'].forEach(ev=>$(id).addEventListener(ev,()=>{dirtyW=true})));

// ---- UI ----
['E=mc^2','\\sum','\\pi','\\int','\\infty','e^{iπ}+1=0','x_n→∞','Fourier'].forEach(t=>{
 const b=document.createElement('button');b.textContent=t.replace(/\\(\w+)/,(m,n)=>AL[n]);b.onclick=()=>{$('tx').value=t;go(t)};$('pre').appendChild(b)});
[['frac','\\frac{a+b}{c}'],['√','\\sqrt{x^2+1}'],['sin+cos','\\sin x+\\cos x'],['⟨ψ|A†⟩','\\langle ψ|A^\\dagger\\rangle'],['x=y','x=y'],['x−y=0','x-y=0'],['c=a/b','c=\\frac{a}{b}'],['cb=a','cb=a'],['∫ₐᵇ','\\int_a^b f(x)dx'],['∑ batas','\\sum_{a=1}^{\\infty} a^{-2}'],['lim','\\lim_{x\\to 0}\\frac{\\sin x}{x}'],['\\text','\\text{Teks biasa: } x^2=y\\quad\\text{Dan Huruf Kapital}']].forEach(([l,t])=>{
 const b=document.createElement('button');b.textContent=l;b.onclick=()=>{$('tx').value=t;go(t)};$('pre').appendChild(b)});
[['( ) matriks','\\begin{pmatrix}\n a & b \\\\\n c & d\n\\end{pmatrix}'],['[ ] matriks','\\begin{bmatrix}\n a & b \\\\\n c & d\n\\end{bmatrix}'],['align','\\begin{align}\n x &= a+b \\\\\n y &= c\n\\end{align}'],['cases','f(x)=\\begin{cases}\n x & x>0 \\\\\n 0 & x\\leq 0\n\\end{cases}'],['underbrace','\\underbrace{a+b}_{n}'],['overbrace','\\overbrace{a+b}^{n}'],['\\left( \\right)','\\left( \\frac{a}{b} \\right)'],['\\\\ baris baru','\\\\\n']].forEach(([l,t])=>{
 const b=document.createElement('button');b.textContent=l;b.onclick=()=>{const ta=$('tx');ta.setRangeText(t,ta.selectionStart,ta.selectionEnd,'end');ta.focus();ta.dispatchEvent(new Event('input'))};$('sn').appendChild(b)});
let deb;$('tx').oninput=e=>{clearTimeout(deb);deb=setTimeout(()=>go(e.target.value),250)};
$('K').oninput=e=>$('Kv').textContent=e.target.value;
let cw=0,dpr=1,restyle=true;
function fit(){dpr=devicePixelRatio||1;cw=cv.clientWidth;cv.width=cw*dpr;cv.height=cw/AR*dpr;cv.style.height=cw/AR+'px';ctx.setTransform(dpr,0,0,dpr,0,0);restyle=true}
addEventListener('resize',fit);fit();
if(window.ResizeObserver)new ResizeObserver(()=>{if(cv.clientWidth!==cw)fit()}).observe(cv);
$('ar').onchange=()=>{AR=+$('ar').value;fit();go($('tx').value)};
const css=n=>getComputedStyle(document.documentElement).getPropertyValue(n).trim();
// warna tema di-cache (dulu getComputedStyle dipanggil tiap frame); di-refresh hanya bila tema berubah
const TH={acc:'',mut:''};
function refreshTheme(){TH.acc=css('--acc');TH.mut=css('--mut');restyle=true}
refreshTheme();
try{matchMedia('(prefers-color-scheme:dark)').addEventListener('change',refreshTheme)}catch(e){}
new MutationObserver(refreshTheme).observe(document.documentElement,{attributes:true,attributeFilter:['data-theme','class','style']});

// ================= render: Path2D, satu stroke/fill per path =================
const hasF=typeof ctx.filter=='string',TAU=2*Math.PI;
function draw(){
 const F=lastF,W=cw,H=W/AR,sc=W/2.7,ox=W/2,oy=H/2,Bk=CL.c.b;
 ctx.clearRect(0,0,W,H);
 if(!F)return;
 const f=F.f,NP=F.NP,n=F.n,focus=F.focus;
 // 1) semua kontur -> dua Path2D (non-coret: evenodd, coret: nonzero); dibangun sekali, dipakai untuk stroke DAN fill
 const fp=new Path2D(),fs=new Path2D();let hasS=false;
 for(let ci=0;ci<n;ci++){
  const P=f[F.stOff+ci]?(hasS=true,fs):fp;let o=ci*NP*2;
  P.moveTo(ox+f[o]*sc,oy+f[o+1]*sc);
  for(let s=1;s<NP;s++){o+=2;P.lineTo(ox+f[o]*sc,oy+f[o+1]*sc)}}
 let ink=fp;if(hasS){ink=new Path2D(fp);ink.addPath(fs)}      // satu path untuk garis -> satu panggilan stroke
 ctx.lineJoin='round';ctx.lineWidth=2;ctx.strokeStyle='rgb('+rgb(CL.c.s)+')';
 if(!(Bk>.05))ctx.stroke(ink);
 else if(hasF){ctx.filter='blur('+(Bk*.5*dpr).toFixed(2)+'px)';ctx.lineWidth=2+Bk*.5;ctx.stroke(ink);ctx.filter='none';ctx.lineWidth=2}
 else{ctx.globalAlpha=.16;for(let p=5;p>=1;p--){ctx.lineWidth=2+Bk*p*.45;ctx.stroke(ink)}ctx.globalAlpha=1;ctx.lineWidth=2}
 // 2) rantai epicycle (kontur fokus): lingkaran & jari-jari masing-masing satu path
 if(F.chainN){
  const ch=F.f,c0=F.chOff,circ=new Path2D(),arm=new Path2D();let any=false;
  for(let q=0;q<=2*F.K;q++){const o=c0+q*2,x0=ox+ch[o]*sc,y0=oy+ch[o+1]*sc,x1=ox+ch[o+2]*sc,y1=oy+ch[o+3]*sc,r=Math.hypot(x1-x0,y1-y0);
   if(r>1){any=true;circ.moveTo(x0+r,y0);circ.arc(x0,y0,r,0,TAU);arm.moveTo(x0,y0);arm.lineTo(x1,y1)}}
  if(any){ctx.lineWidth=1;ctx.strokeStyle=TH.mut;ctx.globalAlpha=.35;ctx.stroke(circ);ctx.globalAlpha=.7;ctx.stroke(arm);ctx.globalAlpha=1}}
 // 3) titik ujung tiap kontur: dua path (biasa & fokus) -> dua fill
 const dots=new Path2D(),fd=new Path2D();
 for(let ci=0;ci<n;ci++){const x=ox+f[F.tipOff+ci*2]*sc,y=oy+f[F.tipOff+ci*2+1]*sc;
  if(ci==focus){fd.moveTo(x+5,y);fd.arc(x,y,5,0,TAU)}else{dots.moveTo(x+3,y);dots.arc(x,y,3,0,TAU)}}
 ctx.fillStyle=TH.acc;ctx.fill(dots);ctx.fill(fd);
 // 4) isi
 if(CL.c.o>.001){ctx.save();ctx.globalCompositeOperation='destination-over';ctx.fillStyle='rgba('+rgb(CL.c.f)+','+CL.c.o+')';
  if(Bk>.05&&hasF)ctx.filter='blur('+(Bk*.5*dpr).toFixed(2)+'px)';
  ctx.fill(fp,'evenodd');ctx.fill(fs);ctx.restore()}}
let last=0;
function frame(t){
 requestAnimationFrame(frame);
 const dt=Math.min((t-last)/1000,.05);last=t;acc=Math.min(acc+dt,.05);
 const colRun=CL.m<1;updCol(dt);
 // minta frame baru ke worker hanya bila perlu & worker tidak sedang sibuk (tidak ada antrean frame)
 if(!inflight&&(engReady||worker)&&(dirtyW||wAnim||+$('sp').value>0)){
  inflight=true;dirtyW=false;
  const msg={type:'tick',dt:acc,K:+$('K').value,lz:$('la').checked,sp:+$('sp').value,ep:$('ep').checked,buf:recycleBuf};
  const tr=recycleBuf?[recycleBuf]:[];recycleBuf=null;acc=0;send(msg,tr)}
 // gambar ulang hanya bila ada frame baru, warna sedang bertransisi, atau ukuran/tema berubah
 if(newF||colRun||restyle){newF=false;restyle=false;draw()}}

// ---- warna ----
const hx=h=>/^#[0-9a-f]{6}$/i.test(h)?[1,3,5].map(i=>parseInt(h.slice(i,i+2),16)):[15,76,129];
const toHex=a=>'#'+a.map(v=>Math.round(v).toString(16).padStart(2,'0')).join('');
const rgb=a=>a.map(Math.round).join(',');
const lin=v=>{v/=255;return v<=.04045?v/12.92:Math.pow((v+.055)/1.055,2.4)};
const dlin=v=>255*(v<=.0031308?12.92*v:1.055*Math.pow(v,1/2.4)-.055);
const mix=(a,b,t)=>a.map((v,i)=>dlin(lin(v)+(lin(b[i])-lin(v))*t));
const CL={c:{s:hx(css('--line')),f:hx('#38bdf8'),o:0,b:0},a:null,b:null,m:1,d:.15};
$('sc').value=toHex(CL.c.s);
function setCol(s,f,o,d,b){CL.a={s:[...CL.c.s],f:[...CL.c.f],o:CL.c.o,b:CL.c.b};CL.b={s:hx(s),f:hx(f),o,b:+b||0};CL.m=0;CL.d=Math.max(.05,d)}
function updCol(dt){if(CL.m>=1)return;CL.m=Math.min(1,CL.m+dt/CL.d);const t=CL.m*CL.m*(3-2*CL.m);
 CL.c={s:mix(CL.a.s,CL.b.s,t),f:mix(CL.a.f,CL.b.f,t),o:CL.a.o+(CL.b.o-CL.a.o)*t,b:CL.a.b+(CL.b.b-CL.a.b)*t}}
['sc','fc','fo','bl'].forEach(id=>$(id).oninput=()=>{$('blv').textContent=$('bl').value;setCol($('sc').value,$('fc').value,$('fo').value/100,.15,$('bl').value)});
$('st').onchange=()=>go($('tx').value);
$('cd').oninput=e=>$('cdv').textContent=(e.target.value/10).toFixed(1);
const cdur=()=>$('cd').value/10;
function applyS(s){$('sc').value=s.s;$('fc').value=s.f;$('fo').value=s.o*100;$('bl').value=s.b||0;$('blv').textContent=s.b||0;$('st').checked=!!s.k;setCol(s.s,s.f,s.o,cdur(),s.b||0)}
// ---- scene ----
const scs=[{t:'x=y',d:2.5,s:'#2563eb',f:'#38bdf8',o:.3},{t:'x-y=0',d:2.5,s:'#ea580c',f:'#fbbf24',o:.4},{t:'c=\\frac{a}{b}',d:2.5,s:'#16a34a',f:'#86efac',o:.4},{t:'cb=a',d:2.5,s:'#9333ea',f:'#d8b4fe',o:.4},{t:'E=mc^2',d:3,s:'#2563eb',f:'#38bdf8',o:.3},{t:'A=\\begin{pmatrix}a&b\\\\c&d\\end{pmatrix}',d:3,s:'#0f766e',f:'#5eead4',o:.35},{t:'\\begin{align}\nx&=a+b\\\\\ny&=c\n\\end{align}',d:3,s:'#be123c',f:'#fda4af',o:.35},{t:'\\underbrace{a+b+c}_{n}=s',d:3,s:'#a16207',f:'#fde68a',o:.4},{t:'\\int_a^b f(x)dx',d:3,s:'#0369a1',f:'#7dd3fc',o:.4},{t:'\\sum_{a=1}^{\\infty}\\frac{1}{a^2}=\\frac{\\pi^2}{6}',d:3.5,s:'#be185d',f:'#f9a8d4',o:.4},{t:'\\sum_{a=1}^{\\infty}a^{-2}',d:3,s:'#334155',f:'#94a3b8',o:.45,b:5,k:true}],sl=$('sl');
let sPlay=false,sIdx=0,sTimer=0;
function sHi(){[...sl.children].forEach((r,i)=>r.classList.toggle('on',sPlay&&i==sIdx))}
function mk(type,val){const i=document.createElement('input');i.type=type;i.value=val;return i}
function lb(txt,el){const l=document.createElement('label');l.append(txt,el);return l}
// pindahkan scene dari indeks a ke indeks b (indeks akhir), scene yang sedang diputar tetap diikuti
function mvS(a,b){if(a==b||b<0||b>=scs.length)return;const cs=scs[sIdx],[m]=scs.splice(a,1);scs.splice(b,0,m);if(cs)sIdx=Math.max(0,scs.indexOf(cs));sRender();
 const hh=sl.children[b]&&sl.children[b].querySelector('.dh');if(hh)hh.focus()}
function sRender(){
 sl.innerHTML='';
 scs.forEach((s,i)=>{
  const r=document.createElement('div');r.className='row sc';
  const n=document.createElement('button');n.textContent='Scene '+(i+1);n.title='Lihat scene ini';
  n.onclick=()=>{sStop();$('tx').value=s.t;go(s.t,!!s.k);applyS(s)};
  const h=document.createElement('span');h.className='dh';h.textContent='⠿';h.tabIndex=0;h.title='Seret untuk memindah urutan scene (atau fokus lalu tekan ↑ ↓)';
  h.onkeydown=ev=>{if(ev.key=='ArrowUp'){ev.preventDefault();mvS(i,i-1)}else if(ev.key=='ArrowDown'){ev.preventDefault();mvS(i,i+1)}};
  h.onpointerdown=ev=>{ev.preventDefault();h.setPointerCapture(ev.pointerId);r.classList.add('drag');let ins=i;
   const rows=()=>[...sl.children],clr=()=>rows().forEach(x=>x.classList.remove('ov-t','ov-b'));
   h.onpointermove=e2=>{const R=rows();ins=R.length;
    for(let k=0;k<R.length;k++){const b=R[k].getBoundingClientRect();if(e2.clientY<b.top+b.height/2){ins=k;break}}
    clr();if(ins<R.length)R[ins].classList.add('ov-t');else R[R.length-1].classList.add('ov-b');
    if(e2.clientY<70)scrollBy(0,-14);else if(e2.clientY>innerHeight-70)scrollBy(0,14)};
   const end=e2=>{h.onpointermove=h.onpointerup=h.onpointercancel=null;clr();r.classList.remove('drag');
    if(e2&&e2.type=='pointerup')mvS(i,ins>i?ins-1:ins)};
   h.onpointerup=end;h.onpointercancel=end};
  const t=document.createElement('textarea');t.value=s.t;t.rows=2;t.spellcheck=false;t.oninput=()=>{s.t=t.value};
  const d=mk('number',s.d);d.min=.5;d.step=.5;d.style.width='64px';d.oninput=()=>{s.d=Math.max(.5,+d.value||.5)};
  const c1=mk('color',s.s),c2=mk('color',s.f),o=mk('range',s.o*100);o.min=0;o.max=100;o.style.width='80px';
  c1.oninput=()=>{s.s=c1.value};c2.oninput=()=>{s.f=c2.value};o.oninput=()=>{s.o=o.value/100};
  const k=mk('checkbox','');k.checked=!!s.k;k.oninput=()=>{s.k=k.checked};
  const bl=mk('range',s.b||0);bl.min=0;bl.max=24;bl.style.width='70px';bl.oninput=()=>{s.b=+bl.value};
  const x=document.createElement('button');x.textContent='✕';x.title='Hapus scene';
  x.onclick=()=>{scs.splice(i,1);if(sIdx>=scs.length)sIdx=0;sRender()};
  r.append(h,n,t,(()=>{const l=lb('Durasi ',d);l.append(' detik');return l})(),lb('Garis ',c1),lb('Isi ',c2),lb('Opasitas ',o),lb('Blur ',bl),lb('Coret ',k),x);sl.appendChild(r)});sHi()}
function sStop(){sPlay=false;clearTimeout(sTimer);$('pl').textContent='▶ Putar scene';sHi()}
function sStep(){
 if(!scs.length)return sStop();
 if(sIdx>=scs.length){if($('lp').checked)sIdx=0;else return sStop()}
 const s=scs[sIdx];$('tx').value=s.t;go(s.t,!!s.k);applyS(s);sHi();
 sTimer=setTimeout(()=>{sIdx++;sStep()},s.d*1000)}
$('pl').onclick=()=>{if(sPlay)return sStop();sPlay=true;sIdx=0;$('pl').textContent='⏹ Stop';sStep()};
$('ad').onclick=()=>{scs.push({t:$('tx').value,d:3,s:$('sc').value,f:$('fc').value,o:$('fo').value/100,b:+$('bl').value,k:$('st').checked});sRender()};
// ---- export slide HTML ----
function RT(D){
 const K=D.K,M=K,L=2*K+1,NC=256,S=D.sc,TR=D.tr,MD=1.6,CD=Math.max(.05,D.cd);
 const CS=[...Array(NC)].map((_,i)=>[Math.cos(2*Math.PI*i/NC),Math.sin(2*Math.PI*i/NC)]);
 const ix=(k,n)=>((k*n)%NC+NC)%NC,$=id=>document.getElementById(id),P=$('p'),P2=$('p2'),GB=$('gb');
 const hx=h=>[1,3,5].map(i=>parseInt(h.slice(i,i+2),16));
 const lin=v=>{v/=255;return v<=.04045?v/12.92:Math.pow((v+.055)/1.055,2.4)};
 const dlin=v=>255*(v<=.0031308?12.92*v:1.055*Math.pow(v,1/2.4)-.055);
 const mix=(a,b,t)=>a.map((v,i)=>dlin(lin(v)+(lin(b[i])-lin(v))*t));
 const rgb=a=>a.map(Math.round).join(',');
 const F=a=>a.map(c=>({re:Float64Array.from(c[0]),im:Float64Array.from(c[1]),k:c[2]}));
 const zero=(r,i)=>{const d={re:new Float64Array(L),im:new Float64Array(L)};d.re[M]=r;d.im[M]=i;return d};
 let idx=0,cur=F(S[0].c),from=[],to=[],rot=[],gc=[],m=1,tgtN=cur.length,need=true,last=0;
 let col={s:hx(S[0].s),f:hx(S[0].f),o:S[0].o,b:S[0].b||0},ca,cb,cm=1;
 function ui(){$('pv').disabled=idx==0;$('nx').disabled=idx==S.length-1}
 function blend(cur,from,to,rot,gc,e){
 for(let i=0;i<cur.length;i++){
  const f=from[i],t=to[i],c=cur[i],r=rot[i];
  for(let j=0;j<L;j++){c.re[j]=f.re[j]+(t.re[j]-f.re[j])*e;c.im[j]=f.im[j]+(t.im[j]-f.im[j])*e}
  if(r){
   const th=2*Math.PI*r*e,co=Math.cos(th),si=Math.sin(th),A=gc[i][0],B=gc[i][1];
   const ax=f.re[M]-A[0],ay=f.im[M]-A[1],bx=t.re[M]-B[0],by=t.im[M]-B[1];
   const rx=ax+(bx-ax)*e,ry=ay+(by-ay)*e;
   for(let j=0;j<L;j++){if(j==M)continue;const x=c.re[j],y=c.im[j];c.re[j]=x*co-y*si;c.im[j]=x*si+y*co}
   c.re[M]=A[0]+(B[0]-A[0])*e+rx*co-ry*si;c.im[M]=A[1]+(B[1]-A[1])*e+rx*si+ry*co}}}
function go(i){
  if(i<0||i>=S.length||i==idx)return;
  const fw=i>idx;let R=TR[fw?idx:i].map(r=>fw?r:[r[1],r[0],-r[2],r[5],r[6],r[3],r[4]]);
  if(!fw)R=R.filter(r=>r[1]>=0).sort((p,q)=>p[1]-q[1]).concat(R.filter(r=>r[1]<0));
  idx=i;const T=F(S[i].c);
  if(cur.length>tgtN)cur.length=tgtN;
  from=[];to=[];rot=[];gc=[];
  for(const r of R){
   const a=r[0]>=0?cur[r[0]]:null,b=r[1]>=0?T[r[1]]:null;
   const A=a||zero(b.re[M],b.im[M]),B=b||zero(a.re[M],a.im[M]);
   from.push({re:A.re.slice(),im:A.im.slice(),k:(b||a).k});to.push(B);
   rot.push(r[2]||0);gc.push(r[2]?[[r[3],r[4]],[r[5],r[6]]]:null)}
  cur=from.map(f=>({re:f.re.slice(),im:f.im.slice(),k:f.k}));tgtN=T.length;m=0;
  ca={s:[...col.s],f:[...col.f],o:col.o,b:col.b};cb={s:hx(S[i].s),f:hx(S[i].f),o:S[i].o,b:S[i].b||0};cm=0;ui()}
 function frame(t){
  const dt=Math.min((t-last)/1000,.05);last=t;
  if(!(need||m<1||cm<1)){requestAnimationFrame(frame);return}
  const run=m<1;if(run)m=Math.min(1,m+dt/MD);
  const e=m*m*(3-2*m);
  if(run){blend(cur,from,to,rot,gc,e);if(m>=1)cur.length=tgtN}
  if(cm<1){cm=Math.min(1,cm+dt/CD);const u=cm*cm*(3-2*cm);
   col={s:mix(ca.s,cb.s,u),f:mix(ca.f,cb.f,u),o:ca.o+(cb.o-ca.o)*u,b:ca.b+(cb.b-ca.b)*u}}
  let d='',d2='';
  for(const c of cur){let t='';
   for(let s=0;s<=NC;s++){let x=0,y=0;
    for(let k=-K;k<=K;k++){const j=k+M,q=CS[ix(k,s%NC)];
     x+=c.re[j]*q[0]-c.im[j]*q[1];y+=c.re[j]*q[1]+c.im[j]*q[0]}
    t+=(s?'L':'M')+x.toFixed(4)+' '+y.toFixed(4)}
   t+='Z';if(c.k)d2+=t;else d+=t}
  const sg=col.b*.5/318;
  [[P,d],[P2,d2]].forEach(a=>{const p=a[0];p.setAttribute('d',a[1]);p.setAttribute('stroke','rgb('+rgb(col.s)+')');
   p.setAttribute('fill','rgb('+rgb(col.f)+')');p.setAttribute('fill-opacity',col.o);
   p.setAttribute('stroke-width',(.006+sg).toFixed(5));
   if(sg>.0004)p.setAttribute('filter','url(#bf)');else p.removeAttribute('filter')});
  if(sg>.0004)GB.setAttribute('stdDeviation',sg.toFixed(5));
  need=false;requestAnimationFrame(frame)}
 $('pv').onclick=()=>go(idx-1);$('nx').onclick=()=>go(idx+1);
 addEventListener('keydown',ev=>{
  if(['ArrowRight','PageDown',' '].includes(ev.key)){ev.preventDefault();go(idx+1)}
  else if(['ArrowLeft','PageUp'].includes(ev.key)){ev.preventDefault();go(idx-1)}});
 let tx=null;
 addEventListener('touchstart',ev=>{tx=ev.touches[0].clientX},{passive:true});
 addEventListener('touchend',ev=>{if(tx==null)return;const dx=ev.changedTouches[0].clientX-tx;tx=null;
  if(Math.abs(dx)>40)go(idx+(dx<0?1:-1))},{passive:true});
 ui();requestAnimationFrame(frame)}
async function makeHTML(){
 const K=+$('K').value,lz=$('la').checked;
 const res=await request({type:'export',scenes:scs.map(s=>({t:s.t,k:!!s.k})),K,lz,mode:$('md').value,motion:$('mv').value,AR});
 const data=res.data.map(d=>{const s=scs[d.idx];return{c:d.c,s:s.s,f:s.f,o:s.o,b:s.b||0}}),tr=res.tr;
 if(!data.length){Bridge.toast('Tambahkan minimal satu scene yang berisi teks.','warn');return null}
 const json=JSON.stringify({K,cd:cdur(),sc:data,tr});
 const html=`<!DOCTYPE html>
<html lang="id"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Morphing Glyph Deret Fourier</title>
<style>
html,body{margin:0;height:100%;background:#fff}
body{display:flex;align-items:center;justify-content:center;overflow:hidden;font-family:system-ui,sans-serif}
#stage{width:min(96vw,${(AR*95).toFixed(1)}vh);aspect-ratio:${AR}/1}
#stage svg{width:100%;height:100%;display:block}
#nav{position:fixed;left:0;right:0;bottom:14px;display:flex;justify-content:center;gap:18px}
#nav button{border:0;background:none;color:#000;opacity:.3;font-size:30px;line-height:1;width:48px;height:48px;border-radius:50%;cursor:pointer}
#nav button:hover:not(:disabled){opacity:.7;background:#0000000d}
#nav button:disabled{opacity:.1;cursor:default}
</style></head><body>
<div id="stage"><svg viewBox="-1.35 ${(-1.35/AR).toFixed(4)} 2.7 ${(2.7/AR).toFixed(4)}"><defs><filter id="bf" filterUnits="userSpaceOnUse" x="-1.5" y="-1.5" width="3" height="3"><feGaussianBlur id="gb" stdDeviation="0"/></filter></defs><path id="p" fill-rule="evenodd" stroke-linejoin="round" stroke-width="0.006" fill="none"/><path id="p2" fill-rule="nonzero" stroke-linejoin="round" stroke-width="0.006" fill="none"/></svg></div>
<div id="nav"><button id="pv" aria-label="Sebelumnya">‹</button><button id="nx" aria-label="Berikutnya">›</button></div>
${window.KxSrc?KxSrc():''}
<script>(${RT.toString()})(${json})<\/script>
</body></html>`;
 return html}
async function exportHTML(){let html;try{html=await makeHTML()}catch(e){console.error(e);Bridge.toast('Gagal membuat animasi: '+e.message,'err');return}if(!html)return;
 const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([html],{type:'text/html'}));
 a.download='morph-fourier-slides.html';document.body.appendChild(a);a.click();a.remove();
 setTimeout(()=>URL.revokeObjectURL(a.href),2000)}
$('ex').onclick=exportHTML;
$('sd').onclick=async()=>{try{const html=await makeHTML();if(html)Bridge.send(html,'KaTeX')}catch(e){console.error(e);Bridge.toast('Gagal membuat animasi: '+e.message,'err')}};
sRender();
go($('tx').value);requestAnimationFrame(frame);
