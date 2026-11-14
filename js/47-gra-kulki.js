/* ════════════════════════════════════════════════════════════════
   GIERKA: „Kulki” — strzelanie kulkami (bubble shooter), własna implementacja na <canvas>
   Siatka heksagonalna KU_KOL kolumn; wiersz przesunięty o pół kulki, gdy (wiersz+kuPar)%2===1.
   Strzał: odbicia od ścian, przyklejenie do najbliższego wolnego pola; 3+ w kolorze znikają (10 pkt/szt.),
   wiszące w powietrzu spadają (20 pkt/szt.). Po kilku strzałach bez trafienia (kuCo) — nowy rząd od góry.
   Koniec, gdy kulka przekroczy linię strzelca; pusta plansza → następny poziom (+500 pkt, +3 żetony).
   COMBO: kolejne trafienia z rzędu mnożą punkty (×1,25 … ×3); pudło zeruje.
   ŻETONY (store 'kulkiZet'): 1 żeton za każde 100 pkt (× mnożnik, ×1,5 w trybie ekstremalnym) — zostają między grami.
   ULEPSZENIA (KU_UL, poziomy w store 'kulkiUl'): celownik, cierpliwość (+pudła do nowego rzędu), mnożnik żetonów
     oraz kulki specjalne z ładunkami na grę: bomba (wybuch w promieniu), tęcza (pasuje do każdego koloru),
     ogień (przelatuje przez planszę i niszczy wszystko po drodze).
   Animacje (KU.anim): 'pek' pęknięcie z pierścieniem i odłamkami (opóźnione falą od trafienia), 'iskra', 'spad', 'wyb', 'txt' (napisy punktów).
   Dźwięki: krótkie tony WebAudio (kuDzw), wyłączane przyciskiem (store 'kulkiDzw').
   Sterowanie: mysz/palec celuje, klik/puszczenie strzela; ←/→ celowanie, Spacja strzał, S lub klik w „następną” — zamiana, 1/2/3 — kulki specjalne.
   Tryby: normalny / ekstremalny. Rekordy: 'kulki' i 'kulkiX' (gierkaRekord, js/46-gierki.js).
   ════════════════════════════════════════════════════════════════ */
const KU_R=16, KU_KOL=11, KU_RH=KU_R*Math.sqrt(3), KU_W=KU_KOL*2*KU_R, KU_LINIA=440, KU_H=520, KU_V=12;
const KU_KOLORY=['#E5484D','#3E7BFA','#22B07D','#F2B705','#9B5DE5','#14B8C4'];
const KU_TRYB={ n:{n:'Normalny', kol:5, co:6, start:5, zet:1}, x:{n:'Ekstremalny', kol:6, co:3, start:6, zet:1.5} };
const KU_UL={
  cel:  {n:'Celownik', o:'dłuższa linia celowania, na końcu z odbiciem', max:3, koszt:[15,30,60]},
  pud:  {n:'Cierpliwość', o:'+1 pudło, zanim wjedzie nowy rząd', max:3, koszt:[20,45,80]},
  mnoz: {n:'Mnożnik żetonów', o:'+25% żetonów za punkty', max:4, koszt:[30,60,100,160]},
  bomba:{n:'Bomba', o:'ładunek na grę — wybuch niszczy kulki dookoła', max:3, koszt:[25,50,90], spec:1},
  tecza:{n:'Tęczowa kulka', o:'ładunek na grę — pasuje do każdego koloru', max:3, koszt:[20,40,70], spec:1},
  ogien:{n:'Kula ognia', o:'ładunek na grę — przepala wszystko po drodze', max:2, koszt:[40,90], spec:1},
};
const KU_CEL=[28,45,70,110];   /* długość celownika (kroki po 6 px) wg poziomu ulepszenia */
let KU=null;   /* stan gry */
const kuUl = () => { try{ return JSON.parse(store.get('kulkiUl','{}'))||{}; }catch(e){ return {}; } };
const kuUlP = k => Math.min(KU_UL[k].max, +kuUl()[k]||0);
const kuZet = () => Math.max(0, Math.floor(+store.get('kulkiZet','0')||0));
const kuCo = () => KU_TRYB[KU.tryb].co + kuUlP('pud');
/* ——— dźwięk ——— */
let kuAC=null;
function kuDzw(f, d=0.09, typ='sine', g=0.05, po=0){ if(store.get('kulkiDzw','1')!=='1') return;
  try{ kuAC=kuAC||new (window.AudioContext||window.webkitAudioContext)(); const t=kuAC.currentTime+po, o=kuAC.createOscillator(), ga=kuAC.createGain();
    o.type=typ; o.frequency.setValueAtTime(f,t); ga.gain.setValueAtTime(g,t); ga.gain.exponentialRampToValueAtTime(0.0001,t+d); o.connect(ga); ga.connect(kuAC.destination); o.start(t); o.stop(t+d+0.02); }catch(e){} }
/* ——— siatka ——— */
const kuOff = i => (i+KU.par)%2===1;
const kuIleKol = i => kuOff(i)?KU_KOL-1:KU_KOL;
const kuXY = (i,c) => ({ x:KU_R+c*2*KU_R+(kuOff(i)?KU_R:0), y:KU_R+i*KU_RH });
const kuLos = () => Math.floor(Math.random()*KU_TRYB[KU.tryb].kol);
function kuRzad(){ return Array.from({length:kuIleKol(0)},()=>kuLos()); }
function kuNowa(tryb){
  KU={ tryb, g:[], par:0, pkt:0, poz:1, strz:0, kat:-Math.PI/2, kul:null, ter:0, nast:0, koniec:false, anim:[], raf:(KU&&KU.raf)||0, cel:false,
       combo:0, zetF:0, zetGra:0, spec:null, lad:{bomba:kuUlP('bomba'), tecza:kuUlP('tecza'), ogien:kuUlP('ogien')}, wstrz:0, klatka:0 };
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
/* ——— punkty, żetony, usuwanie ——— */
function kuPunkty(n, za, x, y){ if(!n) return; const m=Math.min(3, 1+0.25*Math.max(0,KU.combo-1)), p=Math.round(n*za*m); KU.pkt+=p;
  KU.zetF+=p/100*(1+0.25*kuUlP('mnoz'))*KU_TRYB[KU.tryb].zet; const z=Math.floor(KU.zetF);
  if(z>0){ KU.zetF-=z; KU.zetGra+=z; store.set('kulkiZet', String(kuZet()+z)); }
  KU.anim.push({typ:'txt', x:Math.max(30,Math.min(KU_W-30,x)), y, s:'+'+p, t:0}); }
function kuUsun(L, x0, y0){   /* pęknięcia falą od miejsca trafienia */
  L.forEach(([a,b],n)=>{ const p=kuXY(a,b), op=Math.hypot(p.x-x0,p.y-y0)/14; KU.anim.push({typ:'pek', x:p.x, y:p.y, k:KU.g[a][b], t:-Math.round(op)}); KU.g[a][b]=null;
    if(n<8) kuDzw(520+n*70, 0.09, 'triangle', 0.045, op/60); });
  return L.length; }
function kuSpadajace(x0, y0){   /* niepołączone z górnym rzędem */
  const ok=new Set(), q=[]; (KU.g[0]||[]).forEach((v,c)=>{ if(v!==null){ ok.add('0,'+c); q.push([0,c]); } });
  for(let k=0;k<q.length;k++) kuSasiedzi(...q[k]).forEach(([a,b])=>{ const s=a+','+b; if(!ok.has(s)&&KU.g[a][b]!==null){ ok.add(s); q.push([a,b]); } });
  let sp=0; KU.g.forEach((r,a)=>r.forEach((v,b)=>{ if(v!==null&&!ok.has(a+','+b)){ const p=kuXY(a,b); KU.anim.push({typ:'spad', x:p.x, y:p.y, k:v, t:-6-sp, vy:0, vx:(Math.random()-.5)*1.6}); KU.g[a][b]=null; sp++; } }));
  if(sp){ kuPunkty(sp, 20, x0, y0+26); kuDzw(300, 0.25, 'sine', 0.04, 0.12); kuDzw(200, 0.3, 'sine', 0.04, 0.22); }
  return sp; }
function kuPoStrzale(trafil){
  kuPrzytnij();
  if(trafil){ if(KU.combo>=2) KU.anim.push({typ:'txt', x:KU_W/2, y:KU_LINIA-26, s:'Combo ×'+KU.combo, t:0, duzy:1}); }
  else { KU.combo=0; KU.strz++; if(KU.strz>=kuCo()){ KU.strz=0; kuDodajRzad(); kuDzw(140, 0.18, 'square', 0.03); } }
  if(!KU.g.length){ KU.pkt+=500; KU.poz++; store.set('kulkiZet', String(kuZet()+3)); KU.zetGra+=3; KU.anim.push({typ:'txt', x:KU_W/2, y:KU_H/2-40, s:'Poziom '+KU.poz+'!  +500', t:0, duzy:1});
    for(let k=0;k<KU_TRYB[KU.tryb].start;k++) kuDodajRzad(); KU.strz=0; [660,880,1100].forEach((f,i)=>kuDzw(f,0.14,'triangle',0.05,i*0.1)); }
  if(KU.g.some((r,a)=>r.some(v=>v!==null) && kuXY(a,0).y+KU_R>KU_LINIA)) return kuKoniec();
  KU.ter=KU.nast; if(!kuWPlanszy(KU.ter)) KU.ter=kuLosZPlanszy(); KU.nast=kuLosZPlanszy();
  kuPanel();
}
function kuGrupa(i,c){ const kol=KU.g[i][c], G=[[i,c]], wid=new Set([i+','+c]);
  for(let k=0;k<G.length;k++) kuSasiedzi(...G[k]).forEach(([a,b])=>{ const s=a+','+b; if(!wid.has(s)&&KU.g[a][b]===kol){ wid.add(s); G.push([a,b]); } }); return G; }
function kuLadunek(i, c, b){   /* kulka wylądowała w polu [i,c] */
  const p=kuXY(i,c);
  if(b.spec==='bomba'){ const L=[]; KU.g.forEach((r,a)=>r.forEach((v,d)=>{ if(v===null) return; const q=kuXY(a,d); if(Math.hypot(q.x-p.x,q.y-p.y)<KU_R*4.4) L.push([a,d]); }));
    KU.combo++; KU.wstrz=10; KU.anim.push({typ:'wyb', x:p.x, y:p.y, t:0}); kuDzw(90,0.35,'sawtooth',0.07); kuDzw(60,0.45,'square',0.05,0.03);
    kuPunkty(kuUsun(L,p.x,p.y), 10, p.x, p.y); kuSpadajace(p.x,p.y); return kuPoStrzale(true); }
  let kol=b.k;
  if(b.spec==='tecza'){ const ile={}; kuSasiedzi(i,c).forEach(([a,d])=>{ const v=KU.g[a][d]; if(v===null) return; KU.g[i][c]=v; ile[v]=kuGrupa(i,c).length; }); KU.g[i][c]=null;
    kol=+Object.keys(ile).sort((x,y)=>ile[y]-ile[x])[0]; if(isNaN(kol)) kol=kuLosZPlanszy(); }
  KU.g[i][c]=kol; const G=kuGrupa(i,c);
  if(G.length>=3){ KU.combo++; kuPunkty(kuUsun(G,p.x,p.y), 10, p.x, p.y); kuSpadajace(p.x,p.y); return kuPoStrzale(true); }
  kuDzw(180, 0.06, 'sine', 0.04); kuPoStrzale(false);
}
const kuWPlanszy = k => KU.g.some(r=>r.includes(k));
function kuKoniec(){ KU.koniec=true; KU.kul=null; const k=KU.tryb==='x'?'kulkiX':'kulki'; KU.rekord=gierkaRekord(k, KU.pkt); [330,262,196].forEach((f,i)=>kuDzw(f,0.25,'sine',0.05,i*0.16)); kuPanel(); }
function kuStrzel(){ if(!KU||KU.kul||KU.koniec) return;
  const s=KU.spec; if(s){ KU.lad[s]--; KU.spec=null; }
  KU.kul={x:KU_W/2, y:KU_LINIA+40, vx:Math.cos(KU.kat)*KU_V, vy:Math.sin(KU.kat)*KU_V, k:KU.ter, spec:s, zn:0};
  kuDzw(s==='ogien'?240:420, 0.08, s?'sawtooth':'sine', 0.04); kuPanel(); }
function kuZamien(){ if(!KU||KU.kul||KU.koniec||KU.spec) return; [KU.ter,KU.nast]=[KU.nast,KU.ter]; kuDzw(600,0.04,'sine',0.03); }
function kuSpec(s){ if(!KU||KU.kul||KU.koniec) return; KU.spec=KU.spec===s?null:(KU.lad[s]>0?s:KU.spec); kuPanel(); }
function kuKrok(){
  const b=KU.kul; if(b){ for(let s=0;s<4&&KU.kul;s++){ b.x+=b.vx/4; b.y+=b.vy/4;
      if(b.x<KU_R){ b.x=KU_R; b.vx=-b.vx; kuDzw(260,0.03,'sine',0.02); } if(b.x>KU_W-KU_R){ b.x=KU_W-KU_R; b.vx=-b.vx; kuDzw(260,0.03,'sine',0.02); }
      if(b.spec==='ogien'){   /* przepala wszystko po drodze, kończy na górnej ścianie */
        const L=[]; KU.g.forEach((r,a)=>r.forEach((v,d)=>{ if(v===null) return; const q=kuXY(a,d); if(Math.hypot(q.x-b.x,q.y-b.y)<KU_R*1.9) L.push([a,d]); }));
        if(L.length){ if(!b.zn) KU.combo++; b.zn+=L.length; kuPunkty(kuUsun(L,b.x,b.y), 10, b.x, b.y); }
        if(Math.random()<.6) KU.anim.push({typ:'iskra', x:b.x, y:b.y, vx:(Math.random()-.5)*2, vy:Math.random()*2, kol:Math.random()<.5?'#FF8A1F':'#FFD23F', t:0});
        if(b.y<=KU_R){ KU.kul=null; kuSpadajace(b.x,b.y); kuPoStrzale(b.zn>0); }
        continue; }
      if(kuTrafia(b.x,b.y)){ const p=kuPrzyklej(b.x,b.y); KU.kul=null; if(p) kuLadunek(p[0],p[1],b); else kuKoniec(); } } }
  const nowe=[];
  KU.anim=KU.anim.filter(a=>{ a.t++;
    if(a.typ==='pek'){ if(a.t===0) for(let n=0;n<7;n++){ const k=Math.random()*6.28, v=1.5+Math.random()*2.5; nowe.push({typ:'iskra', x:a.x, y:a.y, vx:Math.cos(k)*v, vy:Math.sin(k)*v-1, kol:KU_KOLORY[a.k], t:0}); } return a.t<14; }
    if(a.typ==='iskra'){ a.vy+=0.18; a.x+=a.vx; a.y+=a.vy; return a.t<26; }
    if(a.typ==='spad'){ if(a.t<0) return true; a.vy+=0.55; a.y+=a.vy; a.x+=a.vx; return a.y<KU_H+KU_R; }
    if(a.typ==='txt'){ a.y-=0.7; return a.t<(a.duzy?70:42); }
    if(a.typ==='wyb') return a.t<18;
    return false; });
  KU.anim.push(...nowe); if(KU.wstrz>0) KU.wstrz--; KU.klatka++;
}
/* ——— rysowanie ——— */
function kuKulka(ctx,x,y,k,r=KU_R-1,alfa=1){
  ctx.globalAlpha=alfa; const g=ctx.createRadialGradient(x-r*.35,y-r*.4,r*.15,x,y,r);
  g.addColorStop(0,'#fff'); g.addColorStop(.25,KU_KOLORY[k]); g.addColorStop(1,KU_KOLORY[k]);
  ctx.fillStyle=g; ctx.beginPath(); ctx.arc(x,y,r,0,7); ctx.fill();
  ctx.strokeStyle='rgba(0,0,0,.18)'; ctx.lineWidth=1; ctx.stroke(); ctx.globalAlpha=1;
}
function kuKulkaSpec(ctx,x,y,s,r,t){
  if(s==='bomba'){ ctx.fillStyle='#2A2D3A'; ctx.beginPath(); ctx.arc(x,y,r,0,7); ctx.fill(); ctx.fillStyle='rgba(255,255,255,.35)'; ctx.beginPath(); ctx.arc(x-r*.35,y-r*.35,r*.22,0,7); ctx.fill();
    ctx.strokeStyle='#8a6a3a'; ctx.lineWidth=2; ctx.beginPath(); ctx.moveTo(x+r*.5,y-r*.7); ctx.quadraticCurveTo(x+r*.9,y-r*1.2,x+r*.6,y-r*1.45); ctx.stroke(); ctx.lineWidth=1;
    ctx.fillStyle=t%10<5?'#FFD23F':'#FF8A1F'; ctx.beginPath(); ctx.arc(x+r*.6,y-r*1.45,2.6,0,7); ctx.fill(); return; }
  if(s==='tecza'){ for(let n=0;n<6;n++){ ctx.fillStyle=KU_KOLORY[n]; ctx.beginPath(); ctx.moveTo(x,y); ctx.arc(x,y,r,n*1.0472+t*0.04,(n+1)*1.0472+t*0.04+0.02); ctx.fill(); }
    ctx.fillStyle='rgba(255,255,255,.55)'; ctx.beginPath(); ctx.arc(x-r*.3,y-r*.35,r*.28,0,7); ctx.fill(); ctx.strokeStyle='rgba(0,0,0,.2)'; ctx.beginPath(); ctx.arc(x,y,r,0,7); ctx.stroke(); return; }
  const g=ctx.createRadialGradient(x,y,r*.1,x,y,r*1.35); g.addColorStop(0,'#FFF3B0'); g.addColorStop(.45,'#FF8A1F'); g.addColorStop(1,'rgba(229,72,77,0)');
  ctx.fillStyle=g; ctx.beginPath(); ctx.arc(x,y,r*1.35,0,7); ctx.fill();
}
function kuRysuj(cv){
  const ctx=cv.getContext('2d'), s=cv.width/KU_W; ctx.setTransform(s,0,0,s,0,0); ctx.clearRect(0,0,KU_W,KU_H);
  const mot=document.documentElement.dataset.theme, ciem=mot==='dark'||(mot!=='light'&&matchMedia('(prefers-color-scheme: dark)').matches);
  ctx.fillStyle=ciem?'#151826':'#F4F5FB'; ctx.fillRect(0,0,KU_W,KU_H);
  if(KU.wstrz>0) ctx.translate((Math.random()-.5)*KU.wstrz*.7,(Math.random()-.5)*KU.wstrz*.7);
  /* linia strzelca — pulsuje na czerwono, gdy kulki są blisko */
  const dol=KU.g.length?kuXY(KU.g.length-1,0).y+KU_R:0, blisko=dol>KU_LINIA-KU_RH*2;
  ctx.strokeStyle=blisko?`rgba(229,72,77,${.45+.35*Math.sin(KU.klatka/8)})`:(ciem?'rgba(255,255,255,.12)':'rgba(0,0,0,.12)'); ctx.lineWidth=blisko?2:1;
  ctx.setLineDash([6,6]); ctx.beginPath(); ctx.moveTo(0,KU_LINIA); ctx.lineTo(KU_W,KU_LINIA); ctx.stroke(); ctx.setLineDash([]); ctx.lineWidth=1;
  KU.g.forEach((r,i)=>r.forEach((v,c)=>{ if(v!==null){ const p=kuXY(i,c); kuKulka(ctx,p.x,p.y,v); } }));
  KU.anim.forEach(a=>{
    if(a.typ==='pek'){ if(a.t<0) return kuKulka(ctx,a.x,a.y,a.k); const u=a.t/14;
      kuKulka(ctx,a.x,a.y,a.k,(KU_R-1)*(1-u*.9),1-u);
      ctx.strokeStyle=KU_KOLORY[a.k]; ctx.globalAlpha=1-u; ctx.lineWidth=2.5*(1-u)+.1; ctx.beginPath(); ctx.arc(a.x,a.y,KU_R*(.6+u*1.3),0,7); ctx.stroke(); ctx.globalAlpha=1; ctx.lineWidth=1; }
    else if(a.typ==='iskra'){ ctx.globalAlpha=Math.max(0,1-a.t/26); ctx.fillStyle=a.kol; ctx.beginPath(); ctx.arc(a.x,a.y,2.4*(1-a.t/40),0,7); ctx.fill(); ctx.globalAlpha=1; }
    else if(a.typ==='spad') kuKulka(ctx,a.x,a.y,a.k,KU_R-1,.92);
    else if(a.typ==='wyb'){ const u=a.t/18; ctx.globalAlpha=1-u; ctx.fillStyle='#FFD23F'; ctx.beginPath(); ctx.arc(a.x,a.y,KU_R*4.4*u,0,7); ctx.fill();
      ctx.strokeStyle='#FF8A1F'; ctx.lineWidth=4*(1-u)+.1; ctx.stroke(); ctx.globalAlpha=1; ctx.lineWidth=1; } });
  const sx=KU_W/2, sy=KU_LINIA+40;
  if(!KU.koniec && !KU.kul){   /* celownik — długość zależy od ulepszenia */
    let x=sx, y=sy, vx=Math.cos(KU.kat)*6, vy=Math.sin(KU.kat)*6; const N=KU_CEL[kuUlP('cel')]; ctx.fillStyle=ciem?'rgba(255,255,255,.45)':'rgba(30,30,60,.35)';
    for(let n=0;n<N;n++){ x+=vx; y+=vy; if(x<KU_R){ x=KU_R; vx=-vx; } if(x>KU_W-KU_R){ x=KU_W-KU_R; vx=-vx; } if(y<KU_R || (KU.spec!=='ogien'&&kuTrafia(x,y))) break;
      if(n%2===0){ ctx.globalAlpha=Math.min(1,(N-n)/12); ctx.beginPath(); ctx.arc(x,y,2,0,7); ctx.fill(); ctx.globalAlpha=1; } } }
  if(KU.kul){ KU.kul.spec?kuKulkaSpec(ctx,KU.kul.x,KU.kul.y,KU.kul.spec,KU_R-1,KU.klatka):kuKulka(ctx,KU.kul.x,KU.kul.y,KU.kul.k); }
  else if(!KU.koniec){ KU.spec?kuKulkaSpec(ctx,sx,sy,KU.spec,KU_R-1,KU.klatka):kuKulka(ctx,sx,sy,KU.ter); }
  kuKulka(ctx,sx+58,sy+8,KU.nast,KU_R*.7);
  ctx.fillStyle=ciem?'rgba(255,255,255,.5)':'rgba(0,0,0,.45)'; ctx.font='600 10px system-ui,sans-serif'; ctx.textAlign='center'; ctx.fillText('następna',sx+58,sy+30);
  if(KU.combo>=2){ ctx.fillStyle='#D9A400'; ctx.font='700 12px system-ui,sans-serif'; ctx.textAlign='left'; ctx.fillText('COMBO ×'+KU.combo,10,sy+12); ctx.textAlign='center'; }
  KU.anim.forEach(a=>{ if(a.typ!=='txt') return; const zyc=a.duzy?70:42; ctx.globalAlpha=Math.max(0,Math.min(1,(zyc-a.t)/14)); ctx.font=`700 ${a.duzy?20:13}px system-ui,sans-serif`;
    ctx.lineWidth=3; ctx.strokeStyle=ciem?'rgba(10,12,20,.8)':'rgba(255,255,255,.9)'; ctx.strokeText(a.s,a.x,a.y); ctx.fillStyle=a.duzy?'#D9A400':(ciem?'#fff':'#1b1d2a'); ctx.fillText(a.s,a.x,a.y); ctx.globalAlpha=1; ctx.lineWidth=1; });
  if(KU.koniec){ ctx.setTransform(s,0,0,s,0,0); ctx.fillStyle=ciem?'rgba(10,12,20,.78)':'rgba(255,255,255,.82)'; ctx.fillRect(0,0,KU_W,KU_H); ctx.fillStyle=ciem?'#fff':'#111';
    ctx.font='700 28px system-ui,sans-serif'; ctx.fillText('Koniec gry',KU_W/2,KU_H/2-40); ctx.font='500 16px system-ui,sans-serif';
    ctx.fillText(`${KU.pkt} pkt${KU.rekord?' — nowy rekord!':''}`,KU_W/2,KU_H/2-10); ctx.fillStyle='#D9A400'; ctx.fillText(`+${KU.zetGra} żetonów`,KU_W/2,KU_H/2+14);
    ctx.fillStyle=ciem?'#fff':'#111'; ctx.font='500 13px system-ui,sans-serif'; ctx.fillText('Kliknij, żeby zagrać jeszcze raz',KU_W/2,KU_H/2+42); }
}
/* ——— panel nad/pod planszą ——— */
function kuPanel(){ const p=$('#kuInfo'); if(!p||!KU) return; const R=gierkiRek();
  p.innerHTML=`<span><b>${KU.pkt}</b> pkt</span><span>poziom <b>${KU.poz}</b></span><span>nowy rząd za <b>${kuCo()-KU.strz}</b></span><span class="ku-zet"><i class="ku-mon" aria-hidden="true"></i><b>${kuZet()}</b> żetonów</span><span>rekord <b>${R[KU.tryb==='x'?'kulkiX':'kulki']||0}</b></span>`;
  const s=$('#kuSpec'); if(s) s.innerHTML=['bomba','tecza','ogien'].map((k,i)=>`<button type="button" class="ku-sp${KU.spec===k?' on':''}" data-kuspec="${k}"${KU.lad[k]>0&&!KU.koniec?'':' disabled'} title="${KU_UL[k].o} (klawisz ${i+1})">${KU_UL[k].n.replace(' kulka','')} <b>${KU.lad[k]}</b></button>`).join('')
    +(kuUlP('bomba')+kuUlP('tecza')+kuUlP('ogien')?'':'<span class="ku-brak">Kulki specjalne kupisz w ulepszeniach ↓</span>');
  const sk=$('#kuSklep'); if(sk) sk.innerHTML=kuSklepHtml(); }
function kuSklepHtml(){ const z=kuZet();
  return Object.entries(KU_UL).map(([k,u])=>{ const p=kuUlP(k), c=u.koszt[p];
    return `<div class="ku-ul"><div class="ku-ult"><b>${u.n}</b><span class="ku-pip" role="img" aria-label="Poziom ${p} z ${u.max}">${Array.from({length:u.max},(_,i)=>`<i class="${i<p?'on':''}"></i>`).join('')}</span><small>${u.o}</small></div>
      ${p>=u.max?'<span class="ku-max">max</span>':`<button type="button" class="uk-btn ku-kup" data-kukup="${k}"${z>=c?'':' disabled'} aria-label="Kup ${u.n} za ${c} żetonów">${c} <i class="ku-mon" aria-hidden="true"></i></button>`}</div>`; }).join(''); }
function kuPetla(){ const cv=$('#kuCanvas'); if(!cv||!KU) return; kuKrok(); kuRysuj(cv); KU.raf=requestAnimationFrame(kuPetla); }
function kuCel(e){ const cv=$('#kuCanvas'), r=cv.getBoundingClientRect(), s=KU_W/r.width, x=(e.clientX-r.left)*s, y=(e.clientY-r.top)*s;
  let a=Math.atan2(y-(KU_LINIA+40), x-KU_W/2); if(a>-0.12) a=a>Math.PI/2?-Math.PI+0.12:-0.12; KU.kat=Math.max(-Math.PI+0.12,Math.min(-0.12,a)); return {x,y}; }
GIERKI.push({ k:'kulki', n:'Kulki', opis:'strzelanie kulkami — trzy w kolorze znikają',
  ic:'M14 34a6 6 0 1 0 0-.1M24 16a6 6 0 1 0 0-.1M34 34a6 6 0 1 0 0-.1M24 42V30M24 30l-4 4M24 30l4 4',
  html:()=>{ const t=store.get('kulkiTryb','n'); return `<div class="ku-uklad"><div class="ku-lewa">
      <canvas id="kuCanvas" class="ku-cv" width="${KU_W*2}" height="${KU_H*2}" aria-label="Plansza gry Kulki"></canvas>
      <div class="ku-spec" id="kuSpec"></div></div>
    <div class="ku-prawa"><div class="ku-bar"><div class="seg" role="tablist">${Object.entries(KU_TRYB).map(([k,v])=>`<button type="button" data-kutryb="${k}" aria-selected="${k===t}">${v.n}</button>`).join('')}</div>
        <div class="ku-barp"><button type="button" class="uk-btn ku-dzw" data-kudzw="1" aria-pressed="${store.get('kulkiDzw','1')==='1'}">Dźwięk</button><button type="button" class="uk-btn" data-kunowa="1">Od nowa</button></div></div>
      <div class="ku-info" id="kuInfo" aria-live="polite"></div>
      <details class="ku-sklepd"${store.get('kulkiSklep','1')==='1'?' open':''}><summary>Ulepszenia</summary><div class="ku-sklep" id="kuSklep"></div></details>
      <p class="ku-pom">Celuj myszką lub palcem, kliknij, żeby strzelić · ←/→ i Spacja · S lub klik w „następną” zamienia kulki · 1/2/3 kulki specjalne.</p></div></div>`; },
  start:()=>{ const cv=$('#kuCanvas'), d=Math.min(3,Math.max(2,devicePixelRatio||1)); cv.width=KU_W*d; cv.height=KU_H*d;
    if(KU) cancelAnimationFrame(KU.raf); KU=null; kuNowa(store.get('kulkiTryb','n')); kuPanel(); kuPetla(); },
  stop:()=>{ if(KU) cancelAnimationFrame(KU.raf); KU=null; } });
document.addEventListener('pointermove', e=>{ if(KU && e.target.id==='kuCanvas' && !KU.koniec) kuCel(e); });
document.addEventListener('pointerdown', e=>{ if(!KU || e.target.id!=='kuCanvas') return; e.preventDefault();
  if(KU.koniec){ kuNowa(KU.tryb); kuPanel(); return; }
  const p=kuCel(e); if(Math.hypot(p.x-(KU_W/2+58),p.y-(KU_LINIA+48))<KU_R*1.3){ kuZamien(); return; }
  KU.cel=true; if(e.pointerType==='mouse'){ KU.cel=false; kuStrzel(); } });
document.addEventListener('pointerup', ()=>{ if(KU && KU.cel){ KU.cel=false; kuStrzel(); } });
document.addEventListener('click', e=>{ if(!KU) return;
  const t=e.target.closest('[data-kutryb]'); if(t){ store.set('kulkiTryb',t.dataset.kutryb); t.parentNode.querySelectorAll('button').forEach(b=>b.setAttribute('aria-selected',b===t?'true':'false')); kuNowa(t.dataset.kutryb); return kuPanel(); }
  if(e.target.closest('[data-kunowa]')){ kuNowa(KU.tryb); return kuPanel(); }
  const d=e.target.closest('[data-kudzw]'); if(d){ const on=store.get('kulkiDzw','1')!=='1'; store.set('kulkiDzw',on?'1':'0'); d.setAttribute('aria-pressed',on); if(on) kuDzw(660,0.08,'triangle'); return; }
  const sp=e.target.closest('[data-kuspec]'); if(sp) return kuSpec(sp.dataset.kuspec);
  const k=e.target.closest('[data-kukup]'); if(k){ const id=k.dataset.kukup, u=KU_UL[id], p=kuUlP(id), c=u.koszt[p]; if(p>=u.max||kuZet()<c) return;
    store.set('kulkiZet', String(kuZet()-c)); const U=kuUl(); U[id]=p+1; store.set('kulkiUl', JSON.stringify(U)); if(u.spec && !KU.koniec) KU.lad[id]++;   /* nowy ładunek od razu w tej grze */
    [520,780].forEach((f,i)=>kuDzw(f,0.1,'triangle',0.05,i*0.08)); kuPanel(); } });
document.addEventListener('toggle', e=>{ if(e.target.matches&&e.target.matches('.ku-sklepd')) store.set('kulkiSklep', e.target.open?'1':'0'); }, true);
document.addEventListener('keydown', e=>{ if(!KU || (e.target.closest&&e.target.closest('input,textarea'))) return;
  if(e.key==='ArrowLeft'){ KU.kat=Math.max(-Math.PI+0.12,KU.kat-0.05); e.preventDefault(); }
  else if(e.key==='ArrowRight'){ KU.kat=Math.min(-0.12,KU.kat+0.05); e.preventDefault(); }
  else if(e.key===' '||e.key==='ArrowUp'){ e.preventDefault(); if(KU.koniec){ kuNowa(KU.tryb); kuPanel(); } else kuStrzel(); }
  else if(e.key==='s'||e.key==='S') kuZamien();
  else if(e.key==='1') kuSpec('bomba'); else if(e.key==='2') kuSpec('tecza'); else if(e.key==='3') kuSpec('ogien'); });
