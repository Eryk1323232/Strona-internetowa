/* ════════════════════════════════════════════════════════════════
   NOTATKI — „Word”: dodatkowe polecenia edytora + rysunek z inteligentnymi kształtami
   ntExecWord(cmd,val) — wołane z ntExec (js/06-notatki.js); zwraca true, gdy obsłużyło polecenie:
     indent / outdent  — poziomy listy (podpunkty; Tab / Shift+Tab), własna implementacja na <li>
     num               — numeracja wielopoziomowa 1. → 1.1. → 1.1.1. (klasa nt-num na liście głównej)
     color / hlc / size — kolor tekstu, zakreślenie, rozmiar (span style; czyści je ntStyl w js/06)
     justify*, subscript, superscript — wyrównanie i indeksy
     trow / tcol / trowx / tcolx — wiersze i kolumny tabeli
   RYSUNEK (rysOtworz): okienko z płótnem; pióro, zakreślacz, gumka (usuwa cały element), kolory, grubość, cofanie.
     „Inteligentne kształty”: po narysowaniu kreski rysRozpoznaj() zamienia ją na linię, strzałkę, prostokąt, trójkąt,
     elipsę lub okrąg (uproszczenie RDP + dopasowanie elipsy). Rysunek trafia do notatki jako zdjęcie (ntZdjWstaw, js/30).
   ════════════════════════════════════════════════════════════════ */
const ntListaKorzen = L => { let k=L; while(k.parentElement && k.parentElement.closest('ul,ol') && ntRich().contains(k.parentElement.closest('ul,ol'))) k=k.parentElement.closest('ul,ol'); return k; };
function ntKursorZachowaj(fn){ const s=getSelection(), a=s.rangeCount?[s.anchorNode,s.anchorOffset,s.focusNode,s.focusOffset]:null; fn();
  if(a){ try{ s.setBaseAndExtent(a[0],a[1],a[2],a[3]); }catch(e){} } }
function ntLiPoziom(d){
  const li=ntClosest('li'); if(!li) return false; const L=li.parentElement;
  ntKursorZachowaj(()=>{
    if(d>0){ const pop=li.previousElementSibling; if(!pop) return;   /* pierwszy punkt nie ma pod kogo wejść */
      let sub=pop.lastElementChild; if(!sub || !/^(UL|OL)$/.test(sub.tagName)){ sub=document.createElement(L.tagName); if(L.classList.contains('nt-ck')) sub.className='nt-ck'; pop.appendChild(sub); }
      sub.appendChild(li); }
    else { const rodzic=L.parentElement; if(!rodzic || rodzic.tagName!=='LI') return;   /* już poziom główny */
      const dalsze=[]; let n=li.nextElementSibling; while(n){ dalsze.push(n); n=n.nextElementSibling; }
      if(dalsze.length){ let sub=[...li.children].find(c=>/^(UL|OL)$/.test(c.tagName)); if(!sub){ sub=document.createElement(L.tagName); sub.className=L.className; li.appendChild(sub); } dalsze.forEach(x=>sub.appendChild(x)); }
      rodzic.after(li); if(!L.children.length) L.remove(); } });
  return true;
}
function ntTabela(cmd){
  const td=ntClosest('td,th'); if(!td) return true; const tr=td.parentElement, tb=tr.parentElement, i=[...tr.children].indexOf(td);
  if(cmd==='trow'){ const n=tr.cloneNode(true); [...n.children].forEach(c=>c.innerHTML='<br>'); tr.after(n); }
  else if(cmd==='tcol'){ [...tb.children].forEach(r=>{ const c=document.createElement(r.children[i]?r.children[i].tagName:'td'); c.innerHTML='<br>'; (r.children[i]||r.lastElementChild).after(c); }); }
  else if(cmd==='trowx'){ const t=td.closest('table'); if(tb.children.length<=1) t.remove(); else { const cel=(tr.nextElementSibling||tr.previousElementSibling).children[i]; tr.remove(); if(cel){ const s=getSelection(); s.selectAllChildren(cel); s.collapseToEnd(); } } }
  else if(cmd==='tcolx'){ const t=td.closest('table'); if(tr.children.length<=1) t.remove(); else { const cel=tr.children[i+1]||tr.children[i-1]; [...tb.children].forEach(r=>{ r.children[i]&&r.children[i].remove(); }); if(cel){ const s=getSelection(); s.selectAllChildren(cel); s.collapseToEnd(); } } }
  return true;
}
function ntExecWord(cmd, val){
  if(cmd==='indent') return ntLiPoziom(1) || true;
  if(cmd==='outdent') return ntLiPoziom(-1) || true;
  if(cmd==='num'){ let ol=ntClosest('ol'); if(!ol){ ntExec('insertOrderedList'); ol=ntClosest('ol'); if(!ol) return true; } ntListaKorzen(ol).classList.toggle('nt-num'); return true; }
  if(cmd==='color'||cmd==='hlc'||cmd==='size'){ document.execCommand('styleWithCSS', false, true);
    if(cmd==='hlc') document.execCommand('hiliteColor', false, val);
    else if(cmd==='size') document.execCommand('fontSize', false, val);
    else if(val==='auto'){ document.execCommand('foreColor', false, '#010203');   /* znacznik → zdejmujemy kolor */
      ntRich().querySelectorAll('span,font').forEach(e=>{ const c=e.style.color.replace(/\s/g,''); if(c==='rgb(1,2,3)'||e.getAttribute('color')==='#010203'){ e.style.color=''; e.removeAttribute('color'); if(!e.getAttribute('style')&&!e.attributes.length) e.replaceWith(...e.childNodes); else if(!e.getAttribute('style')) e.removeAttribute('style'); } }); }
    else document.execCommand('foreColor', false, val);
    document.execCommand('styleWithCSS', false, false); return true; }
  if(/^justify/.test(cmd)){ document.execCommand('styleWithCSS', false, true); document.execCommand(cmd); document.execCommand('styleWithCSS', false, false); return true; }
  if(/^t(row|col)x?$/.test(cmd)) return ntTabela(cmd);
  return false;
}

/* ─────────── RYSUNEK ─────────── */
const RYS_W=1000, RYS_H=620, RYS_KOL=['#1b1d2a','#E5484D','#2F6FEB','#1E9E6A','#E8890C','#8E4EC6'];
let RYS=null;   /* {el:[], narz, kol, gr, smart, biez} */
const rysOdl = (a,b) => Math.hypot(a.x-b.x,a.y-b.y);
function rysRDP(P, eps){ if(P.length<3) return P; let dm=0, im=0; const a=P[0], b=P[P.length-1], L=rysOdl(a,b)||1;
  for(let i=1;i<P.length-1;i++){ const d=Math.abs((b.x-a.x)*(a.y-P[i].y)-(a.x-P[i].x)*(b.y-a.y))/L; if(d>dm){ dm=d; im=i; } }
  return dm>eps?[...rysRDP(P.slice(0,im+1),eps).slice(0,-1), ...rysRDP(P.slice(im),eps)]:[a,b]; }
/* kreska → kształt (albo null, gdy to zwykłe pismo/szkic) */
function rysRozpoznaj(P){
  if(P.length<4) return null;
  const xs=P.map(p=>p.x), ys=P.map(p=>p.y), x0=Math.min(...xs), x1=Math.max(...xs), y0=Math.min(...ys), y1=Math.max(...ys), w=x1-x0, h=y1-y0, diag=Math.hypot(w,h);
  if(diag<24) return null;
  let dl=0; for(let i=1;i<P.length;i++) dl+=rysOdl(P[i],P[i-1]);
  const a=P[0], b=P[P.length-1], zamk=rysOdl(a,b)<Math.max(22,diag*0.22);
  if(!zamk){
    const ci=rysOdl(a,b); if(dl<ci*1.12){   /* prosta — przyciąganie do poziomu/pionu */
      let B={...b}; const kat=Math.abs(Math.atan2(b.y-a.y,b.x-a.x)); if(kat<0.09||kat>Math.PI-0.09) B.y=a.y; else if(Math.abs(kat-Math.PI/2)<0.09) B.x=a.x;
      return {t:'linia', a:{...a}, b:B}; }
    /* strzałka: prosty trzon + krótki „daszek” na końcu (2 załamania przy końcu) */
    const V=rysRDP(P, diag*0.05); if(V.length>=4 && V.length<=5){ const trzon=rysOdl(V[0],V[1]); let reszta=0; for(let i=2;i<V.length;i++) reszta+=rysOdl(V[i],V[i-1]);
      if(trzon>diag*0.6 && reszta<trzon*0.9 && V.slice(2).every(p=>rysOdl(p,V[1])<trzon*0.45)) return {t:'strzalka', a:{...V[0]}, b:{...V[1]}}; }
    return null; }
  /* zamknięty obrys: RDP osobno na dwóch połówkach (od startu do najdalszego punktu i z powrotem) */
  let far=0, fd=0; P.forEach((p,i)=>{ const d=rysOdl(p,a); if(d>fd){ fd=d; far=i; } });
  let V=[...rysRDP(P.slice(0,far+1), diag*0.07).slice(0,-1), ...rysRDP([...P.slice(far), a], diag*0.07).slice(0,-1)];
  V=V.filter((p,i)=>i===0||rysOdl(p,V[i-1])>diag*0.13); if(V.length>3 && rysOdl(V[0],V[V.length-1])<diag*0.13) V.pop();   /* sklej wierzchołki tuż obok siebie (początek/koniec kreski) */
  const cx=(x0+x1)/2, cy=(y0+y1)/2, rx=w/2||1, ry=h/2||1;
  /* dopasowanie elipsy wpisanej w ramkę */
  const odch=P.reduce((s,p)=>s+Math.abs(Math.hypot((p.x-cx)/rx,(p.y-cy)/ry)-1),0)/P.length;
  if(V.length===3 && odch>0.12) return {t:'wielokat', P:V.map(p=>({...p}))};
  if(V.length===4 && odch>0.085){   /* czworokąt: prawie prostopadły do osi → prostokąt z ramki */
    const osiowy=V.every((p,i)=>{ const q=V[(i+1)%4], k=Math.abs(Math.atan2(q.y-p.y,q.x-p.x))%(Math.PI/2); return k<0.22||k>Math.PI/2-0.22; });
    return osiowy?{t:'prost', x:x0, y:y0, w, h}:{t:'wielokat', P:V.map(p=>({...p}))}; }
  if(odch<0.11){ const kolo=Math.abs(w-h)<Math.max(w,h)*0.18, r=(rx+ry)/2; return {t:'elipsa', cx, cy, rx:kolo?r:rx, ry:kolo?r:ry}; }
  if((V.length===5||V.length===6) && odch>0.12) return {t:'wielokat', P:V.map(p=>({...p}))};
  return null;
}
function rysElement(ctx, e){
  ctx.strokeStyle=e.kol; ctx.lineWidth=e.gr; ctx.lineCap='round'; ctx.lineJoin='round'; ctx.globalAlpha=e.zakr?0.35:1; ctx.beginPath();
  if(e.t==='kreska'){ const P=e.P; ctx.moveTo(P[0].x,P[0].y); for(let i=1;i<P.length-1;i++){ const mx=(P[i].x+P[i+1].x)/2, my=(P[i].y+P[i+1].y)/2; ctx.quadraticCurveTo(P[i].x,P[i].y,mx,my); } const k=P[P.length-1]; ctx.lineTo(k.x,k.y); }
  else if(e.t==='linia'||e.t==='strzalka'){ ctx.moveTo(e.a.x,e.a.y); ctx.lineTo(e.b.x,e.b.y);
    if(e.t==='strzalka'){ const k=Math.atan2(e.b.y-e.a.y,e.b.x-e.a.x), d=Math.max(12,e.gr*4); ctx.moveTo(e.b.x-d*Math.cos(k-0.45),e.b.y-d*Math.sin(k-0.45)); ctx.lineTo(e.b.x,e.b.y); ctx.lineTo(e.b.x-d*Math.cos(k+0.45),e.b.y-d*Math.sin(k+0.45)); } }
  else if(e.t==='prost') ctx.rect(e.x,e.y,e.w,e.h);
  else if(e.t==='elipsa') ctx.ellipse(e.cx,e.cy,e.rx,e.ry,0,0,Math.PI*2);
  else if(e.t==='wielokat'){ e.P.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y)); ctx.closePath(); }
  ctx.stroke(); ctx.globalAlpha=1;
}
function rysPunkty(e){   /* punkty obrysu — do gumki */
  if(e.t==='kreska') return e.P; if(e.t==='wielokat') return [...e.P, e.P[0]];
  if(e.t==='linia'||e.t==='strzalka') return [e.a,e.b];
  if(e.t==='prost') return [{x:e.x,y:e.y},{x:e.x+e.w,y:e.y},{x:e.x+e.w,y:e.y+e.h},{x:e.x,y:e.y+e.h},{x:e.x,y:e.y}];
  return Array.from({length:33},(_,i)=>({x:e.cx+e.rx*Math.cos(i/32*6.2832), y:e.cy+e.ry*Math.sin(i/32*6.2832)}));
}
function rysTrafia(e, p, r){ const P=rysPunkty(e); for(let i=1;i<P.length;i++){ const a=P[i-1], b=P[i], l2=(b.x-a.x)**2+(b.y-a.y)**2||1, t=Math.max(0,Math.min(1,((p.x-a.x)*(b.x-a.x)+(p.y-a.y)*(b.y-a.y))/l2));
    if(Math.hypot(p.x-(a.x+t*(b.x-a.x)), p.y-(a.y+t*(b.y-a.y)))<r+e.gr/2) return true; } return P.length===1&&rysOdl(P[0],p)<r; }
function rysRysuj(){ const cv=$('#rysCv'); if(!cv||!RYS) return; const ctx=cv.getContext('2d'), s=cv.width/RYS_W; ctx.setTransform(s,0,0,s,0,0);
  ctx.fillStyle='#fff'; ctx.fillRect(0,0,RYS_W,RYS_H); RYS.el.forEach(e=>rysElement(ctx,e)); if(RYS.biez) rysElement(ctx,RYS.biez); }
function rysPasek(){ const p=$('#rysPasek'); if(!p||!RYS) return;
  const n=(k,t)=>`<button type="button" class="rys-b" data-rysn="${k}" aria-pressed="${RYS.narz===k}">${t}</button>`;
  p.innerHTML=`<div class="rys-g">${n('pioro','Pióro')}${n('zakr','Zakreślacz')}${n('gumka','Gumka')}</div>
    <div class="rys-g">${RYS_KOL.map(c=>`<button type="button" class="rys-kol" data-rysk="${c}" style="--c:${c}" aria-pressed="${RYS.kol===c}" aria-label="Kolor ${c}"></button>`).join('')}</div>
    <label class="rys-g rys-gr"><span>Grubość</span><input type="range" id="rysGr" min="1" max="14" value="${RYS.gr}"></label>
    <label class="rys-g rys-sm"><input type="checkbox" id="rysSmart"${RYS.smart?' checked':''}><span>Inteligentne kształty</span></label>
    <div class="rys-g rys-pr"><button type="button" class="rys-b" data-rysa="cofnij"${RYS.el.length?'':' disabled'}>Cofnij</button><button type="button" class="rys-b" data-rysa="czysc"${RYS.el.length?'':' disabled'}>Wyczyść</button></div>`; }
function rysZamknij(){ ['#rysScrim','#rysModal'].forEach(s=>{ const e=$(s); e&&e.remove(); }); RYS=null; document.body.classList.remove('tr-lock'); }
function rysOtworz(){
  if($('#rysModal')) return; const s=getSelection(); RYS={el:[], narz:'pioro', kol:RYS_KOL[0], gr:3, smart:store.get('rysSmart','1')==='1', biez:null, zakres:(s.rangeCount&&ntRich()&&ntRich().contains(s.anchorNode))?s.getRangeAt(0).cloneRange():null};
  const sc=document.createElement('div'); sc.id='rysScrim'; sc.className='tr-scrim'; document.body.appendChild(sc);
  const md=document.createElement('div'); md.id='rysModal'; md.className='tr-modal tr-wide'; md.setAttribute('role','dialog'); md.setAttribute('aria-modal','true'); md.setAttribute('aria-label','Rysunek');
  const d=Math.min(2.5,Math.max(2,devicePixelRatio||1));
  md.innerHTML=`<div class="tr-panel rys-panel"><div class="tr-top"><div><span class="label">Notatka</span><h2>Rysunek</h2></div><button type="button" class="tr-x" data-rysa="zamknij" aria-label="Zamknij">✕</button></div>
    <div class="rys-pasek" id="rysPasek"></div>
    <canvas id="rysCv" class="rys-cv" width="${RYS_W*d}" height="${RYS_H*d}" aria-label="Płótno rysunku"></canvas>
    <p class="rys-pom" id="rysPom">Narysuj linię, strzałkę, prostokąt, trójkąt albo kółko — wyrównam je automatycznie. Pismo i szkice zostają bez zmian.</p>
    <div class="rys-dol"><button type="button" class="uk-btn" data-rysa="zamknij">Anuluj</button><button type="button" class="uk-btn uk-ok" data-rysa="wstaw">Wstaw do notatki</button></div></div>`;
  document.body.appendChild(md); document.body.classList.add('tr-lock'); rysPasek(); rysRysuj();
}
const rysPoz = e => { const cv=$('#rysCv'), r=cv.getBoundingClientRect(); return {x:(e.clientX-r.left)*RYS_W/r.width, y:(e.clientY-r.top)*RYS_H/r.height}; };
function rysGumka(p){ const n=RYS.el.length; RYS.el=RYS.el.filter(e=>!rysTrafia(e,p,10)); if(RYS.el.length!==n){ rysRysuj(); rysPasek(); } }
document.addEventListener('pointerdown', e=>{ if(!RYS || e.target.id!=='rysCv') return; e.preventDefault(); e.target.setPointerCapture(e.pointerId); const p=rysPoz(e);
  if(RYS.narz==='gumka'){ RYS.gum=true; return rysGumka(p); }
  RYS.biez={t:'kreska', P:[p], kol:RYS.kol, gr:RYS.narz==='zakr'?Math.max(14,RYS.gr*4):RYS.gr, zakr:RYS.narz==='zakr'}; rysRysuj(); });
document.addEventListener('pointermove', e=>{ if(!RYS || e.target.id!=='rysCv') return; const p=rysPoz(e);
  if(RYS.gum) return rysGumka(p); if(!RYS.biez) return; const P=RYS.biez.P; if(rysOdl(P[P.length-1],p)>1.5){ P.push(p); rysRysuj(); } });
document.addEventListener('pointerup', e=>{ if(!RYS) return; RYS.gum=false; const b=RYS.biez; if(!b) return; RYS.biez=null;
  if(b.P.length===1) b.P.push({x:b.P[0].x+0.1, y:b.P[0].y});   /* kropka */
  const k=RYS.smart&&!b.zakr?rysRozpoznaj(b.P):null; RYS.el.push(k?{...k, kol:b.kol, gr:b.gr}:b); rysRysuj(); rysPasek();
  const pm=$('#rysPom'); if(pm&&k) pm.textContent='Rozpoznano: '+({linia:'linia prosta',strzalka:'strzałka',prost:'prostokąt',elipsa:k.rx===k.ry?'okrąg':'elipsa',wielokat:k.P&&k.P.length===3?'trójkąt':'wielokąt'})[k.t]+'. Nie to? Kliknij „Cofnij” i wyłącz inteligentne kształty.'; });
document.addEventListener('click', e=>{ if(!RYS) return;
  const n=e.target.closest('[data-rysn]'); if(n){ RYS.narz=n.dataset.rysn; return rysPasek(); }
  const k=e.target.closest('[data-rysk]'); if(k){ RYS.kol=k.dataset.rysk; if(RYS.narz==='gumka') RYS.narz='pioro'; return rysPasek(); }
  const a=e.target.closest('[data-rysa]'); if(a){ const c=a.dataset.rysa;
    if(c==='cofnij'){ RYS.el.pop(); rysRysuj(); return rysPasek(); }
    if(c==='czysc'){ RYS.el=[]; rysRysuj(); return rysPasek(); }
    if(c==='zamknij') return rysZamknij();
    if(c==='wstaw'){ if(!RYS.el.length) return rysZamknij();
      /* przycięcie do narysowanej części (+margines), białe tło */
      const pts=RYS.el.flatMap(rysPunkty), m=24, x0=Math.max(0,Math.min(...pts.map(p=>p.x))-m), y0=Math.max(0,Math.min(...pts.map(p=>p.y))-m), x1=Math.min(RYS_W,Math.max(...pts.map(p=>p.x))+m), y1=Math.min(RYS_H,Math.max(...pts.map(p=>p.y))+m);
      const c2=document.createElement('canvas'), sk=2; c2.width=Math.max(40,(x1-x0)*sk); c2.height=Math.max(40,(y1-y0)*sk); const ctx=c2.getContext('2d'); ctx.fillStyle='#fff'; ctx.fillRect(0,0,c2.width,c2.height);
      ctx.setTransform(sk,0,0,sk,-x0*sk,-y0*sk); RYS.el.forEach(el=>rysElement(ctx,el));
      const zakres=RYS.zakres; c2.toBlob(bl=>{ rysZamknij(); if(!bl) return; const r=ntRich(); if(r){ r.focus(); if(zakres){ const s=getSelection(); s.removeAllRanges(); s.addRange(zakres); } }
        ntZdjWstaw(new File([bl],'rysunek.png',{type:'image/png'})); }, 'image/png'); return; } }
  if(e.target.id==='rysScrim') rysZamknij(); });
document.addEventListener('input', e=>{ if(!RYS) return; if(e.target.id==='rysGr') RYS.gr=+e.target.value; if(e.target.id==='rysSmart'){ RYS.smart=e.target.checked; store.set('rysSmart',RYS.smart?'1':'0'); } });
document.addEventListener('keydown', e=>{ if(!RYS) return; if(e.key==='Escape'){ e.stopPropagation(); rysZamknij(); } else if((e.ctrlKey||e.metaKey)&&(e.key==='z'||e.key==='Z')){ e.preventDefault(); e.stopPropagation(); RYS.el.pop(); rysRysuj(); rysPasek(); } }, true);
