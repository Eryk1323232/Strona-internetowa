/* ════════════════════════════════════════════════════════════════════════
   WYKRESY — wspólne rysowanie (SVG) + eksport do PNG
   ════════════════════════════════════════════════════════════════════════
   wyLine(P, o)  — wykres liniowy: P = [{x:'RRRR-MM-DD', y:liczba, tip:'…', sub:'…'}], o = {u:'kg', label:'…'}
   Kolory z motywu (--accent, --line…), dymek po najechaniu/dotknięciu (.wy-tip), jedna seria = bez legendy.
   wyPng(btn) — zapisuje wykres z najbliższego .wy-box jako PNG (białe/ciemne tło wg motywu, 2× rozdzielczość).
   Używa: Siłownia → Postępy (js/28-postepy.js).
   ════════════════════════════════════════════════════════════════════════ */
const wyNice = (lo,hi,n=5) => { if(lo===hi){ lo-=1; hi+=1; } const span=hi-lo, st0=span/n, mag=10**Math.floor(Math.log10(st0)), st=[1,2,2.5,5,10].map(k=>k*mag).find(k=>k>=st0);
  return {lo:Math.floor(lo/st)*st, hi:Math.ceil(hi/st)*st, st}; };
const wyF = (v,u) => fmt(v, Math.abs(v)>=100?0:Math.abs(v)>=10?1:2)+(u?' '+u:'');

function wyLine(P, o={}){
  const W=720,H=260,L=52,R=22,T=22,B=34;
  if(P.length<2) return `<div class="wy-empty">${P.length?'Potrzebne są co najmniej 2 treningi z tym ćwiczeniem, żeby narysować wykres.':'Brak danych.'}</div>`;
  const ts=P.map(p=>new Date(p.x+'T12:00').getTime()), t0=ts[0], t1=Math.max(ts[ts.length-1],t0+864e5);
  const ys=P.map(p=>p.y), pad=(Math.max(...ys)-Math.min(...ys))*.12||1, N=wyNice(Math.min(...ys)-pad, Math.max(...ys)+pad);
  const X=t=>L+(t-t0)/(t1-t0)*(W-L-R), Y=v=>T+(N.hi-v)/(N.hi-N.lo)*(H-T-B);
  let g=''; for(let v=N.lo; v<=N.hi+1e-9; v+=N.st) g+=`<line x1="${L}" x2="${W-R}" y1="${Y(v).toFixed(1)}" y2="${Y(v).toFixed(1)}" class="wy-grid"/><text x="${L-8}" y="${(Y(v)+3.5).toFixed(1)}" text-anchor="end" class="wy-ax">${fmt(v, N.st<1?1:0)}</text>`;
  const pts=P.map((p,i)=>[X(ts[i]),Y(p.y)]), line=pts.map((p,i)=>(i?'L':'M')+p[0].toFixed(1)+' '+p[1].toFixed(1)).join(' ');
  const area=line+` L${pts[pts.length-1][0].toFixed(1)} ${H-B} L${pts[0][0].toFixed(1)} ${H-B} Z`;
  const show=pts.map(()=>false); show[0]=show[pts.length-1]=true; let lx=pts[0][0]; for(let i=1;i<pts.length-1;i++){ if(pts[i][0]-lx>=60 && pts[pts.length-1][0]-pts[i][0]>=60){ show[i]=true; lx=pts[i][0]; } }
  const xl=P.map((p,i)=>show[i]?`<text x="${pts[i][0].toFixed(1)}" y="${H-12}" text-anchor="${i===0?'start':i===P.length-1?'end':'middle'}" class="wy-ax">${p.x.slice(8)}.${p.x.slice(5,7)}${p.x.slice(0,4)!==todayISO().slice(0,4)?'.'+p.x.slice(2,4):''}</text>`:'').join('');
  const best=ys.indexOf(Math.max(...ys)), lp=pts[pts.length-1];
  return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(o.label||'Wykres')}">${g}
    <path d="${area}" class="wy-area"/><path d="${line}" class="wy-line"/>
    ${pts.map((p,i)=>`<circle cx="${p[0].toFixed(1)}" cy="${p[1].toFixed(1)}" r="${i===best||i===pts.length-1?5:3.5}" class="wy-dot${i===best?' best':''}${i===pts.length-1?' last':''}"/>`).join('')}
    <text x="${(lp[0]-10).toFixed(1)}" y="${(lp[1]-12).toFixed(1)}" text-anchor="end" class="wy-lbl">${wyF(P[P.length-1].y,o.u)}</text>${xl}
    ${pts.map((p,i)=>`<circle cx="${p[0].toFixed(1)}" cy="${p[1].toFixed(1)}" r="16" class="wy-hit" tabindex="0" data-tip="${esc(P[i].tip||wyF(P[i].y,o.u))}" data-sub="${esc(P[i].sub||dPL(P[i].x))}"/>`).join('')}</svg>`;
}
function wyTip(el){ const box=el.closest('.wy-box'), tip=box&&box.querySelector('.wy-tip'); if(!tip) return;
  const r=el.getBoundingClientRect(), b=box.getBoundingClientRect();
  tip.innerHTML=`<b>${el.dataset.tip}</b><span>${el.dataset.sub||''}</span>`; tip.hidden=false;
  const x=r.left+r.width/2-b.left, y=(el.tagName==='rect'?r.top+r.height*.35:r.top+r.height/2)-b.top;
  tip.style.left=Math.max(70,Math.min(b.width-70,x))+'px'; tip.style.top=y+'px'; tip.classList.toggle('below', y<70); }
document.addEventListener('mouseover', e=>{ const h=e.target.closest&&e.target.closest('.wy-hit'); if(h) wyTip(h); });
document.addEventListener('focusin', e=>{ const h=e.target.closest&&e.target.closest('.wy-hit'); if(h) wyTip(h); });
document.addEventListener('mouseout', e=>{ const h=e.target.closest&&e.target.closest('.wy-hit'); if(h){ const t=h.closest('.wy-box').querySelector('.wy-tip'); if(t) t.hidden=true; } });
document.addEventListener('click', e=>{ const h=e.target.closest&&e.target.closest('.wy-hit'); if(h) wyTip(h); const b=e.target.closest&&e.target.closest('[data-wypng]'); if(b) wyPng(b); });

/* eksport PNG: style z motywu wpisane na stałe w kopię SVG */
function wyPng(btn){
  const box=btn.closest('.wy-wrap')||btn.closest('.wy-box'), svg=box&&box.querySelector('svg'); if(!svg) return;
  const cs=getComputedStyle(document.documentElement), c=svg.cloneNode(true), src=[...svg.querySelectorAll('*')], dst=[...c.querySelectorAll('*')];
  src.forEach((el,i)=>{ const s=getComputedStyle(el), d=dst[i]; if(d.classList.contains('wy-hit')){ d.remove(); return; }
    ['fill','stroke','stroke-width','opacity','font-size','font-weight','font-family','stroke-linecap'].forEach(p=>d.style.setProperty(p, s.getPropertyValue(p))); });
  const vb=svg.viewBox.baseVal, sc=2, tytul=btn.dataset.wypng||'Wykres', H=vb.height+40;
  c.setAttribute('width', vb.width*sc); c.setAttribute('height', vb.height*sc);
  const img=new Image(), url=URL.createObjectURL(new Blob([new XMLSerializer().serializeToString(c)],{type:'image/svg+xml'}));
  img.onload=()=>{ const cv=document.createElement('canvas'); cv.width=vb.width*sc; cv.height=H*sc; const x=cv.getContext('2d');
    x.fillStyle=cs.getPropertyValue('--surface').trim()||'#fff'; x.fillRect(0,0,cv.width,cv.height);
    x.fillStyle=cs.getPropertyValue('--ink').trim()||'#111'; x.font=`600 ${15*sc}px Inter, Segoe UI, Arial, sans-serif`; x.fillText(tytul, 16*sc, 26*sc);
    x.drawImage(img,0,40*sc,vb.width*sc,vb.height*sc); URL.revokeObjectURL(url);
    cv.toBlob(b=>{ const a=document.createElement('a'); a.href=URL.createObjectURL(b); a.download=tytul.replace(/[\\/:*?"<>|]+/g,' ').trim()+'.png'; document.body.appendChild(a); a.click(); setTimeout(()=>{ URL.revokeObjectURL(a.href); a.remove(); },1500); },'image/png'); };
  img.src=url;
}
const wyBox = (svg, png) => `<div class="wy-wrap"><div class="wy-box">${svg}<div class="wy-tip" hidden></div></div>${png?`<div class="wy-acts"><button type="button" class="td-btn" data-wypng="${esc(png)}">Pobierz PNG</button></div>`:''}</div>`;
