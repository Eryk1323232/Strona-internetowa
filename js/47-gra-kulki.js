/* ════════════════════════════════════════════════════════════════
   GIERKA: „Kulki” — strzelanie kulkami (bubble shooter), własna implementacja na <canvas>
   Siatka heksagonalna KU_KOL kolumn; wiersz przesunięty o pół kulki, gdy (wiersz+kuPar)%2===1.
   Strzał: odbicia od ścian, przyklejenie do najbliższego wolnego pola; 3+ w kolorze znikają (10 pkt/szt.),
   wiszące w powietrzu spadają (20 pkt/szt.). Po KU_TRYB[tryb].co strzałach bez trafienia — nowy rząd od góry.
   Koniec, gdy kulka przekroczy linię strzelca; pusta plansza → następny poziom (+500).
   Sterowanie: mysz/palec celuje, klik/puszczenie strzela; ←/→ celowanie, Spacja strzał, S lub klik w „następną” — zamiana.
   Tryby: normalny / ekstremalny (więcej kolorów, częściej nowy rząd). Rekordy: 'kulki' i 'kulkiX' (gierkaRekord, js/46-gierki.js).
   ════════════════════════════════════════════════════════════════ */
const KU_R=16, KU_KOL=11, KU_RH=KU_R*Math.sqrt(3), KU_W=KU_KOL*2*KU_R, KU_LINIA=440, KU_H=520;
const KU_KOLORY=['#E5484D','#3E7BFA','#22B07D','#F2B705','#9B5DE5','#14B8C4'];
const KU_TRYB={ n:{n:'Normalny', kol:5, co:6, start:5}, x:{n:'Ekstremalny', kol:6, co:3, start:6} };
let KU=null;   /* stan gry */
const kuOff = i => (i+KU.par)%2===1;
const kuIleKol = i => kuOff(i)?KU_KOL-1:KU_KOL;
const kuXY = (i,c) => ({ x:KU_R+c*2*KU_R+(kuOff(i)?KU_R:0), y:KU_R+i*KU_RH });
const kuLos = () => Math.floor(Math.random()*KU_TRYB[KU.tryb].kol);
function kuRzad(){ return Array.from({length:kuIleKol(0)},()=>kuLos()); }
function kuNowa(tryb){
  KU={ tryb, g:[], par:0, pkt:0, poz:1, strz:0, kat:-Math.PI/2, kul:null, ter:0, nast:0, koniec:false, anim:[], raf:0, cel:false };
  for(let i=0;i<KU_TRYB[tryb].start;i++) kuDodajRzad();
  KU.ter=kuLosZPlanszy(); KU.nast=kuLosZPlanszy();
}
function kuLosZPlanszy(){ const S=new Set(); KU.g.forEach(r=>r.forEach(v=>{ if(v!==null) S.add(v); })); const L=[...S]; return L.length?L[Math.floor(Math.random()*L.length)]:kuLos(); }
function kuSasiedzi(i,c){ const o=kuOff(i), d=o?[[0,-1],[0,1],[-1,0],[-1,1],[1,0],[1,1]]:[[0,-1],[0,1],[-1,-1],[-1,0],[1,-1],[1,0]];
  return d.map(([a,b])=>[i+a,c+b]).filter(([a,b])=>a>=0&&a<KU.g.length&&b>=0&&b<kuIleKol(a)); }
function kuDodajRzad(){ KU.par^=1; KU.g.unshift(kuRzad()); KU.g=KU.g.map((r,i)=>{ const n=kuIleKol(i); return r.length===n?r:r.length>n?r.slice(0,n):[...r,null]; }); }
function kuPrzytnij(){ while(KU.g.length && KU.g[KU.g.length-1].every(v=>v===null)) KU.g.pop(); }
/* kolizja lecącej kulki: ściana górna albo kulka bliżej niż ~1,8 R */
function kuTrafia(x,y){ if(y<=KU_R) return true; const i0=Math.max(0,Math.floor((y-KU_R)/KU_RH)-1);
  for(let i=i0;i<Math.min(KU.g.length,i0+3);i++) for(let c=0;c<KU.g[i].length;c++){ if(KU.g[i][c]===null) continue; const p=kuXY(i,c); if((p.x-x)**2+(p.y-y)**2<(KU_R*1.8)**2) return true; }
  return false; }
function kuPrzyklej(x,y){
  let naj=null, nd=1e9; const iy=Math.round((y-KU_R)/KU_RH);
  for(let i=Math.max(0,iy-1);i<=iy+1;i++){ while(KU.g.length<=i) KU.g.push(Array(kuIleKol(KU.g.length)).fill(null));
    for(let c=0;c<kuIleKol(i);c++){ if(KU.g[i][c]!==null) continue; if(i>0 && !kuSasiedzi(i,c).some(([a,b])=>KU.g[a][b]!==null)) continue;
      const p=kuXY(i,c), d=(p.x-x)**2+(p.y-y)**2; if(d<nd){ nd=d; naj=[i,c]; } } }
  return naj;
}
function kuPo(i,c){
  const kol=KU.g[i][c], grupa=[[i,c]], wid=new Set([i+','+c]);
  for(let k=0;k<grupa.length;k++) kuSasiedzi(...grupa[k]).forEach(([a,b])=>{ const s=a+','+b; if(!wid.has(s)&&KU.g[a][b]===kol){ wid.add(s); grupa.push([a,b]); } });
  let trafil=false;
  if(grupa.length>=3){ trafil=true; grupa.forEach(([a,b])=>{ KU.anim.push({...kuXY(a,b), k:KU.g[a][b], t:0, typ:'pek'}); KU.g[a][b]=null; }); KU.pkt+=grupa.length*10;
    /* wiszące: niepołączone z górnym rzędem */
    const ok=new Set(), q=[]; (KU.g[0]||[]).forEach((v,c2)=>{ if(v!==null){ ok.add('0,'+c2); q.push([0,c2]); } });
    for(let k=0;k<q.length;k++) kuSasiedzi(...q[k]).forEach(([a,b])=>{ const s=a+','+b; if(!ok.has(s)&&KU.g[a][b]!==null){ ok.add(s); q.push([a,b]); } });
    let sp=0; KU.g.forEach((r,a)=>r.forEach((v,b)=>{ if(v!==null&&!ok.has(a+','+b)){ KU.anim.push({...kuXY(a,b), k:v, t:0, typ:'spad', vy:0}); KU.g[a][b]=null; sp++; } }));
    KU.pkt+=sp*20; }
  kuPrzytnij();
  if(!trafil){ KU.strz++; if(KU.strz>=KU_TRYB[KU.tryb].co){ KU.strz=0; kuDodajRzad(); } }
  if(!KU.g.length){ KU.pkt+=500; KU.poz++; for(let k=0;k<KU_TRYB[KU.tryb].start;k++) kuDodajRzad(); KU.strz=0; }
  if(KU.g.some((r,a)=>r.some(v=>v!==null) && kuXY(a,0).y+KU_R>KU_LINIA)) kuKoniec();
  KU.ter=KU.nast; if(!kuWPlanszy(KU.ter)) KU.ter=kuLosZPlanszy(); KU.nast=kuLosZPlanszy();
  kuPanel();
}
const kuWPlanszy = k => KU.g.some(r=>r.includes(k));
function kuKoniec(){ KU.koniec=true; const k=KU.tryb==='x'?'kulkiX':'kulki'; KU.rekord=gierkaRekord(k, KU.pkt); kuPanel(); }
function kuStrzel(){ if(!KU||KU.kul||KU.koniec) return; const v=16; KU.kul={x:KU_W/2, y:KU_LINIA+40, vx:Math.cos(KU.kat)*v, vy:Math.sin(KU.kat)*v, k:KU.ter}; }
function kuZamien(){ if(!KU||KU.kul||KU.koniec) return; [KU.ter,KU.nast]=[KU.nast,KU.ter]; }
function kuKrok(){
  const b=KU.kul; if(b){ for(let s=0;s<4;s++){ b.x+=b.vx/4; b.y+=b.vy/4;
      if(b.x<KU_R){ b.x=KU_R; b.vx=-b.vx; } if(b.x>KU_W-KU_R){ b.x=KU_W-KU_R; b.vx=-b.vx; }
      if(kuTrafia(b.x,b.y)){ const p=kuPrzyklej(b.x,b.y); KU.kul=null; if(p){ KU.g[p[0]][p[1]]=b.k; kuPo(p[0],p[1]); } else kuKoniec(); break; } } }
  KU.anim=KU.anim.filter(a=>{ a.t++; if(a.typ==='spad'){ a.vy+=0.6; a.y+=a.vy; return a.y<KU_H+KU_R; } return a.t<12; });
}
function kuKulka(ctx,x,y,k,r=KU_R-1,alfa=1){
  ctx.globalAlpha=alfa; const g=ctx.createRadialGradient(x-r*.35,y-r*.4,r*.15,x,y,r);
  g.addColorStop(0,'#fff'); g.addColorStop(.25,KU_KOLORY[k]); g.addColorStop(1,KU_KOLORY[k]);
  ctx.fillStyle=g; ctx.beginPath(); ctx.arc(x,y,r,0,7); ctx.fill();
  ctx.strokeStyle='rgba(0,0,0,.18)'; ctx.lineWidth=1; ctx.stroke(); ctx.globalAlpha=1;
}
function kuRysuj(cv){
  const ctx=cv.getContext('2d'), s=cv.width/KU_W; ctx.setTransform(s,0,0,s,0,0); ctx.clearRect(0,0,KU_W,KU_H);
  const ciem=matchMedia('(prefers-color-scheme: dark)').matches&&document.documentElement.dataset.theme!=='light'||document.documentElement.dataset.theme==='dark';
  ctx.fillStyle=ciem?'#151826':'#F4F5FB'; ctx.fillRect(0,0,KU_W,KU_H);
  ctx.strokeStyle=ciem?'rgba(255,255,255,.12)':'rgba(0,0,0,.12)'; ctx.setLineDash([6,6]); ctx.beginPath(); ctx.moveTo(0,KU_LINIA); ctx.lineTo(KU_W,KU_LINIA); ctx.stroke(); ctx.setLineDash([]);
  KU.g.forEach((r,i)=>r.forEach((v,c)=>{ if(v!==null){ const p=kuXY(i,c); kuKulka(ctx,p.x,p.y,v); } }));
  KU.anim.forEach(a=>{ if(a.typ==='pek') kuKulka(ctx,a.x,a.y,a.k,(KU_R-1)*(1+a.t/12),1-a.t/12); else kuKulka(ctx,a.x,a.y,a.k,KU_R-1,.9); });
  const sx=KU_W/2, sy=KU_LINIA+40;
  if(!KU.koniec && !KU.kul){   /* celownik z jednym odbiciem */
    let x=sx, y=sy, vx=Math.cos(KU.kat)*6, vy=Math.sin(KU.kat)*6; ctx.fillStyle=ciem?'rgba(255,255,255,.45)':'rgba(30,30,60,.35)';
    for(let n=0;n<70;n++){ x+=vx; y+=vy; if(x<KU_R){ x=KU_R; vx=-vx; } if(x>KU_W-KU_R){ x=KU_W-KU_R; vx=-vx; } if(kuTrafia(x,y)) break;
      if(n%2===0){ ctx.beginPath(); ctx.arc(x,y,2,0,7); ctx.fill(); } } }
  if(KU.kul) kuKulka(ctx,KU.kul.x,KU.kul.y,KU.kul.k);
  else if(!KU.koniec) kuKulka(ctx,sx,sy,KU.ter);
  kuKulka(ctx,sx+58,sy+8,KU.nast,KU_R*.7);
  ctx.fillStyle=ciem?'rgba(255,255,255,.5)':'rgba(0,0,0,.45)'; ctx.font='600 10px system-ui,sans-serif'; ctx.textAlign='center'; ctx.fillText('następna',sx+58,sy+30);
  if(KU.koniec){ ctx.fillStyle=ciem?'rgba(10,12,20,.78)':'rgba(255,255,255,.82)'; ctx.fillRect(0,0,KU_W,KU_H); ctx.fillStyle=ciem?'#fff':'#111';
    ctx.font='700 28px system-ui,sans-serif'; ctx.fillText('Koniec gry',KU_W/2,KU_H/2-30); ctx.font='500 16px system-ui,sans-serif';
    ctx.fillText(`${KU.pkt} pkt${KU.rekord?' — nowy rekord!':''}`,KU_W/2,KU_H/2); ctx.font='500 13px system-ui,sans-serif'; ctx.fillText('Kliknij, żeby zagrać jeszcze raz',KU_W/2,KU_H/2+28); }
}
function kuPanel(){ const p=$('#kuInfo'); if(!p||!KU) return; const R=gierkiRek();
  p.innerHTML=`<span><b>${KU.pkt}</b> pkt</span><span>poziom <b>${KU.poz}</b></span><span>nowy rząd za <b>${KU_TRYB[KU.tryb].co-KU.strz}</b></span><span>rekord <b>${R[KU.tryb==='x'?'kulkiX':'kulki']||0}</b></span>`; }
function kuPetla(){ const cv=$('#kuCanvas'); if(!cv||!KU){ return; } kuKrok(); kuRysuj(cv); KU.raf=requestAnimationFrame(kuPetla); }
function kuCel(e){ const cv=$('#kuCanvas'), r=cv.getBoundingClientRect(), s=KU_W/r.width, x=(e.clientX-r.left)*s, y=(e.clientY-r.top)*s;
  let a=Math.atan2(y-(KU_LINIA+40), x-KU_W/2); if(a>-0.12) a=a>Math.PI/2?-Math.PI+0.12:-0.12; KU.kat=Math.max(-Math.PI+0.12,Math.min(-0.12,a)); return {x,y}; }
GIERKI.push({ k:'kulki', n:'Kulki', opis:'strzelanie kulkami — trzy w kolorze znikają',
  ic:'M14 34a6 6 0 1 0 0-.1M24 16a6 6 0 1 0 0-.1M34 34a6 6 0 1 0 0-.1M24 42V30M24 30l-4 4M24 30l4 4',
  html:()=>{ const t=store.get('kulkiTryb','n'); return `<div class="ku-bar"><div class="seg" role="tablist">${Object.entries(KU_TRYB).map(([k,v])=>`<button type="button" data-kutryb="${k}" aria-selected="${k===t}">${v.n}</button>`).join('')}</div>
    <button type="button" class="uk-btn" data-kunowa="1">Od nowa</button></div><div class="ku-info" id="kuInfo" aria-live="polite"></div>
    <canvas id="kuCanvas" class="ku-cv" width="${KU_W*2}" height="${KU_H*2}" aria-label="Plansza gry Kulki"></canvas>
    <p class="ku-pom">Celuj myszką lub palcem, kliknij, żeby strzelić · ←/→ i Spacja · S lub klik w „następną” zamienia kulki.</p>`; },
  start:()=>{ const cv=$('#kuCanvas'), d=Math.min(3,Math.max(2,devicePixelRatio||1)); cv.width=KU_W*d; cv.height=KU_H*d;
    kuNowa(store.get('kulkiTryb','n')); kuPanel(); cancelAnimationFrame(KU.raf); kuPetla(); },
  stop:()=>{ if(KU) cancelAnimationFrame(KU.raf); KU=null; } });
document.addEventListener('pointermove', e=>{ if(KU && e.target.id==='kuCanvas' && !KU.koniec) kuCel(e); });
document.addEventListener('pointerdown', e=>{ if(!KU || e.target.id!=='kuCanvas') return; e.preventDefault();
  if(KU.koniec){ kuNowa(KU.tryb); kuPanel(); return; }
  const p=kuCel(e); if(Math.hypot(p.x-(KU_W/2+58),p.y-(KU_LINIA+48))<KU_R*1.3){ kuZamien(); return; }
  KU.cel=true; if(e.pointerType==='mouse'){ KU.cel=false; kuStrzel(); } });
document.addEventListener('pointerup', e=>{ if(KU && KU.cel){ KU.cel=false; kuStrzel(); } });
document.addEventListener('click', e=>{ const t=e.target.closest('[data-kutryb]'); if(t&&KU){ store.set('kulkiTryb',t.dataset.kutryb); t.parentNode.querySelectorAll('button').forEach(b=>b.setAttribute('aria-selected',b===t?'true':'false')); kuNowa(t.dataset.kutryb); kuPanel(); }
  if(e.target.closest('[data-kunowa]')&&KU){ kuNowa(KU.tryb); kuPanel(); } });
document.addEventListener('keydown', e=>{ if(!KU || (e.target.closest&&e.target.closest('input,textarea'))) return;
  if(e.key==='ArrowLeft'){ KU.kat=Math.max(-Math.PI+0.12,KU.kat-0.05); e.preventDefault(); }
  else if(e.key==='ArrowRight'){ KU.kat=Math.min(-0.12,KU.kat+0.05); e.preventDefault(); }
  else if(e.key===' '||e.key==='ArrowUp'){ e.preventDefault(); if(KU.koniec){ kuNowa(KU.tryb); kuPanel(); } else kuStrzel(); }
  else if(e.key==='s'||e.key==='S'){ kuZamien(); } });
