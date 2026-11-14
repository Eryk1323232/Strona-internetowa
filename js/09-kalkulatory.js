/* ════════════════════════════════════════════════════════════════════════
   KALKULATORY (STUDIA)
   ════════════════════════════════════════════════════════════════════════
   pCalcs() – karty: Liczenie MMA (kalkulator MASA Web w okienku), Wyniki Pawła, Wyniki moje.
   MXC      – ustawienia obu list wyników (nazwy, domyślne składniki, podpowiedzi).
   MXS      – zapisane mieszanki: {pawel: [...], moje: [...]}.
   PDF      – „Pobierz PDF” (wszystkie) i „PDF” przy mieszance (jedna) → mxPdf(); wygląd w mxPrintHtml().
   Nowy kalkulator = nowa karta w pCalcs() + własny kod pod spodem.
   ════════════════════════════════════════════════════════════════════════ */

/* karty „Wyniki Pawła / Wyniki moje” — strona Studia → Praca */
function pPraca(){ return `<h1>Pra<span class="acc">ca</span></h1><div class="calc-cards pr-wyn" id="prWyn">${mxKarty()}</div>`; }
function mxKarty(){
  return `    <button type="button" class="calc-card res" data-mxact="open" data-set="pawel"><div class="calc-ic" aria-hidden="true"><svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6h12M20 6v12L9 38a3 3 0 0 0 2.6 4.5h24.8A3 3 0 0 0 39 38L28 18V6"/><path d="M13.5 30h21"/><circle cx="21" cy="35" r="1.6" fill="currentColor" stroke="none"/><circle cx="27" cy="37" r="1.2" fill="currentColor" stroke="none"/></svg></div>
      <h2>Wyniki Pawła</h2><span class="calc-count" id="mxCount-pawel">${mxCnt(MXS.pawel.length)}</span><span class="calc-open">Otwórz →</span></button>
    <button type="button" class="calc-card res mine" data-mxact="open" data-set="moje"><div class="calc-ic" aria-hidden="true"><svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6h12M20 6v12L9 38a3 3 0 0 0 2.6 4.5h24.8A3 3 0 0 0 39 38L28 18V6"/><path d="M13.5 30h21"/><circle cx="21" cy="35" r="1.6" fill="currentColor" stroke="none"/><circle cx="27" cy="37" r="1.2" fill="currentColor" stroke="none"/></svg></div>
      <h2>Wyniki moje</h2><span class="calc-count" id="mxCount-moje">${mxCnt(MXS.moje.length)}</span><span class="calc-open">Otwórz →</span></button>`;
}
function pCalcs(){
  return `<h1>Kalkula<span class="acc">tory</span></h1>
  <div class="calc-cards" id="calcPage">
    <button type="button" class="calc-card res" data-mmaact="open"><div class="calc-ic" aria-hidden="true"><svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M4 36h40"/><path d="M4 30h40" stroke-dasharray="3 4"/><circle cx="12" cy="24" r="2.2" fill="currentColor" stroke="none"/><circle cx="20" cy="21" r="1.6" fill="currentColor" stroke="none"/><circle cx="28" cy="25" r="2.6" fill="currentColor" stroke="none"/><circle cx="36" cy="22" r="1.8" fill="currentColor" stroke="none"/><path d="M4 42h40"/></svg></div>
      <h2>Liczenie MMA</h2><span class="calc-count">kalkulator MASA Web · skład, lepiszcze, receptura</span><span class="calc-open">Otwórz →</span></button>
  </div>`;
}

/* ——— WYNIKI: mieszanki z pracy inżynierskiej (nazwa, skład, proporcje; chmura przez db, kopia w przeglądarce) ——— */
const MX_UNITS=['%','g','kg','ml','cz. mas.'];
const mxNorm = (id,v={}) => ({id, n:String(v.n||''), note:String(v.note||''), c:+v.c||0, u:+v.u||+v.c||0,
  parts:(Array.isArray(v.parts)?v.parts:[]).map(p=>({n:String(p.n||''), v:+p.v||0, unit:MX_UNITS.includes(p.unit)?p.unit:'%'})),
  tests:mxTestsNorm(v), base:String(v.base||''), o:(v.o===undefined||v.o===null||v.o==='')?null:+v.o});
const mxZ = X => (Array.isArray(X)?X:[]).map(String).filter(x=>/^[\w-]{1,60}$/.test(x));
/* zdjęcia należą do badań (t.z); starsze zdjęcia całej mieszanki (v.z) trafiają do pierwszego badania */
function mxTestsNorm(v){
  const T=(Array.isArray(v.tests)?v.tests:[]).map(t=>({n:String(t.n||''), r:String(t.r||''), note:String(t.note||''), z:mxZ(t.z)}));
  const stare=mxZ(v.z); if(stare.length){ if(!T.length) T.push({n:'Zdjęcia', r:'', note:'', z:[]}); T[0].z=[...new Set([...T[0].z, ...stare])]; }
  return T;
}
const MXC={
  pawel:{title:'Wyniki Pawła', col:'mieszanki', key:'mxState', label:'Praca inżynierska · mieszanki lepiszczy',
    rows:[['Asfalt'],['SBS'],['Olej']], ph:'np. Mieszanka 3 — 5% SBS, 2% oleju', tn:'np. Penetracja w 25 °C', tr:'np. 52 ×0,1 mm'},
  moje:{title:'Wyniki moje', col:'mieszankiMoje', key:'mxMojeState', label:'Praca inżynierska · projekty MMA',
    rows:[['Lepiszcze'],['Kruszywo 0/2'],['Kruszywo 2/8'],['Kruszywo 8/11'],['Wypełniacz']], ph:'np. AC 11 S — lepiszcze M2', tn:'np. Zawartość wolnych przestrzeni', tr:'np. 3,4 %'}};
const MXS={pawel:[], moje:[]};
for(const k in MXC){ try{ const c=JSON.parse(store.get(MXC[k].key,'null')); if(Array.isArray(c)) MXS[k]=c.map(m=>mxNorm(m.id,m)); }catch(e){} }
const saveMx = k => store.set(MXC[k].key, JSON.stringify(MXS[k]));
let mxM=null; /* {set, mode:'list'} | {set, mode:'edit', id} */
const MX_COL=['var(--accent)','var(--mark)','var(--ok)','#B58B5A','#8E6BB0','#5AA3A8','var(--bad)','#7A7066'];
/* kolejność ustalana ręcznie strzałkami ↑↓ (pole o); wpisy bez o (starsze) — na górze, od najnowszego */
const mxList = k => MXS[k].slice().sort((a,b)=>(a.o===null)!==(b.o===null)?(a.o===null?-1:1):a.o===null?b.c-a.c:a.o-b.o);
function mxMove(k, id, dir){
  const L=mxList(k), i=L.findIndex(m=>m.id===id), j=i+dir; if(i<0||j<0||j>=L.length) return;
  [L[i],L[j]]=[L[j],L[i]]; mxUstaw(k, L);
  const el=document.querySelector(`.mx-item[data-id="${CSS.escape(id)}"] [data-mxact="${dir<0?'up':'down'}"]`); if(el&&!el.disabled) el.focus();
}
function mxUstaw(k, L){
  const zm=L.filter((m,x)=>m.o!==x); L.forEach((m,x)=>{ m.o=x; });
  saveMx(k); zm.forEach(m=>cloud(db=>{ const {id,...d}=m; return db.collection(MXC[k].col).doc(id).set(d); }));
  mxRender();
}
/* przeciąganie myszką / palcem za uchwyt ⋮⋮ (pointer events — działa też na telefonie) */
let mxDrag=null;
document.addEventListener('pointerdown', e=>{
  const g=e.target.closest&&e.target.closest('.mx-grip'); if(!g||!mxM||e.button>0) return;
  const it=g.closest('.mx-item'), list=it.parentElement; e.preventDefault();
  let sc=list; while(sc&&sc!==document.body&&!(sc.scrollHeight>sc.clientHeight&&/(auto|scroll)/.test(getComputedStyle(sc).overflowY))) sc=sc.parentElement;
  mxDrag={it, list, sc:sc&&sc!==document.body?sc:null, y:e.clientY, id:e.pointerId, raf:0, start:[...list.children].map(x=>x.dataset.id).join()};
  it.classList.add('drag'); list.classList.add('dragging'); g.setPointerCapture&&g.setPointerCapture(e.pointerId);
  const scroll=()=>{ if(!mxDrag) return; const s=mxDrag.sc; if(s){ const r=s.getBoundingClientRect(), y=mxDrag.y, v=y<r.top+60?-(r.top+60-y)/4:y>r.bottom-60?(y-(r.bottom-60))/4:0; if(v){ s.scrollTop+=v; mxDragPoz(); } } mxDrag.raf=requestAnimationFrame(scroll); };
  mxDrag.raf=requestAnimationFrame(scroll);
});
function mxDragPoz(){ const d=mxDrag; if(!d) return;
  const inne=[...d.list.children].filter(x=>x!==d.it);
  const za=inne.find(x=>{ const r=x.getBoundingClientRect(); return d.y<r.top+r.height/2; });
  if(za){ if(d.it.nextElementSibling!==za) d.list.insertBefore(d.it, za); } else if(d.list.lastElementChild!==d.it) d.list.appendChild(d.it);
}
document.addEventListener('pointermove', e=>{ if(!mxDrag||e.pointerId!==mxDrag.id) return; e.preventDefault(); mxDrag.y=e.clientY; mxDragPoz(); }, {passive:false});
const mxDragKoniec = e=>{ const d=mxDrag; if(!d||e.pointerId!==d.id) return; mxDrag=null; cancelAnimationFrame(d.raf);
  d.it.classList.remove('drag'); d.list.classList.remove('dragging');
  const ids=[...d.list.children].map(x=>x.dataset.id); if(ids.join()===d.start) return;
  const k=mxM.set, M=new Map(MXS[k].map(m=>[m.id,m])); mxUstaw(k, ids.map(i=>M.get(i)).filter(Boolean)); };
document.addEventListener('pointerup', mxDragKoniec); document.addEventListener('pointercancel', mxDragKoniec);
const mxCnt = n => n?n+' '+(n===1?'mieszanka':(n%10>=2&&n%10<=4&&(n%100<10||n%100>=20))?'mieszanki':'mieszanek'):'brak wpisów';
function mxBar(m){ const tot=m.parts.reduce((a,p)=>a+Math.max(0,p.v),0); if(!tot) return '';
  return `<div class="mx-bar" role="img" aria-label="Proporcje">${m.parts.map((p,i)=>p.v>0?`<i style="flex:${p.v};background:${MX_COL[i%MX_COL.length]}" title="${esc(p.n)}: ${fmt(p.v/tot*100,1)}%"></i>`:'').join('')}</div>`; }
function mxModalHtml(){
  const close=`<button type="button" class="tr-x" data-mxact="close" aria-label="Zamknij">✕</button>`;
  const C=MXC[mxM.set], MX=MXS[mxM.set];
  if(mxM.mode==='list'){ const L=mxList(mxM.set);
    const pdf=L.length?`<button type="button" class="mx-pdf" data-mxact="pdf"><svg viewBox="0 0 16 16" aria-hidden="true"><path d="M4 1.5h5.5L13 5v9.5H4z"/><path d="M9.5 1.5V5H13M8.5 7.5v5M6.5 10.5l2 2 2-2"/></svg>Pobierz PDF</button>`:'';
    return `<div class="tr-top"><div><span class="label">${esc(C.label)}</span><h2>${esc(C.title)}</h2></div><div class="mx-topr">${pdf}${close}</div></div>
      <button type="button" class="mx-add" data-mxact="new"><span aria-hidden="true">+</span>Dodaj mieszankę</button>
      ${L.length?`<div class="mx-list">${L.map((m,mi)=>{ const tot=m.parts.reduce((a,p)=>a+Math.max(0,p.v),0);
        return `<article class="mx-item" data-id="${esc(m.id)}"><div class="mx-ih"><span class="mx-grip" title="Przeciągnij, aby zmienić kolejność" aria-hidden="true"><svg viewBox="0 0 10 16"><circle cx="3" cy="3" r="1.3"/><circle cx="7" cy="3" r="1.3"/><circle cx="3" cy="8" r="1.3"/><circle cx="7" cy="8" r="1.3"/><circle cx="3" cy="13" r="1.3"/><circle cx="7" cy="13" r="1.3"/></svg></span><b>${esc(m.n||'Bez nazwy')}</b><div class="mx-acts"><span class="mx-ord"><button type="button" class="mx-mv" data-mxact="up" data-id="${esc(m.id)}" title="Przesuń wyżej" aria-label="Przesuń wyżej"${mi===0?' disabled':''}>↑</button><button type="button" class="mx-mv" data-mxact="down" data-id="${esc(m.id)}" title="Przesuń niżej" aria-label="Przesuń niżej"${mi===L.length-1?' disabled':''}>↓</button></span><button type="button" class="td-btn" data-mxact="pdf" data-id="${esc(m.id)}" title="Pobierz tę mieszankę jako PDF">PDF</button><button type="button" class="td-btn" data-mxact="edit" data-id="${esc(m.id)}">Edytuj</button><button type="button" class="g-del" data-mxact="del" data-id="${esc(m.id)}" aria-label="Usuń mieszankę">×</button></div></div>
          ${m.base?(b=>b?`<p class="mx-base">Lepiszcze: <b>${esc(b.n)}</b></p>`:'')(MXS.pawel.find(x=>x.id===m.base)):''}
          ${mxBar(m)}
          <table class="mx-t"><tbody>${m.parts.map((p,i)=>`<tr><td><span class="mx-dot" style="background:${MX_COL[i%MX_COL.length]}"></span>${esc(p.n)}</td><td class="n">${fmt(p.v, Number.isInteger(p.v)?0:2)} ${esc(p.unit)}</td><td class="n mx-pct">${tot?fmt(p.v/tot*100,1)+'%':''}</td></tr>`).join('')}</tbody></table>
          ${m.tests.length?`<div class="mx-tt"><span class="label">Badania</span><table class="mx-bt"><thead><tr><th>Badanie</th><th>Wynik</th><th>Uwagi</th></tr></thead><tbody>${m.tests.map(t=>`<tr${t.z.length?' class="mx-hasph"':''}><td><b>${esc(t.n)}</b></td><td class="mx-res">${esc(t.r)}</td><td class="mx-tn">${esc(t.note)}</td></tr>${t.z.length?`<tr class="mx-trph"><td colspan="3"><div class="mx-gal">${t.z.map(z=>`<img class="nt-img mx-img" data-zid="${esc(z)}" alt="Zdjęcie — kliknij, aby powiększyć">`).join('')}</div></td></tr>`:''}`).join('')}</tbody></table></div>`:''}
          ${m.note.trim()?`<p class="mx-note">${esc(m.note)}</p>`:''}
</article>`; }).join('')}</div>`
        :`<div class="nt-blank"><p>Nie ma jeszcze żadnej mieszanki. Kliknij „+ Dodaj mieszankę”.</p></div>`}`; }
  const m=MX.find(x=>x.id===mxM.id) || mxNorm('',{parts:C.rows.map(r=>({n:r[0],v:0,unit:'%'}))});
  const row=(p,i)=>`<div class="mx-row"><span class="mx-dot" style="background:${MX_COL[i%MX_COL.length]}"></span><input name="pn" value="${esc(p.n)}" placeholder="Składnik" aria-label="Składnik" autocomplete="off">
    <input name="pv" value="${p.v?String(p.v).replace('.',','):''}" placeholder="0" inputmode="decimal" aria-label="Proporcja" autocomplete="off">
    <select name="pu" aria-label="Jednostka">${MX_UNITS.map(u=>`<option${u===p.unit?' selected':''}>${u}</option>`).join('')}</select>
    <button type="button" class="g-del" data-mxact="rmrow" aria-label="Usuń składnik">×</button></div>`;
  return `<form class="mx-form"><div class="tr-top"><div><span class="label">${m.id?'Edycja':'Nowa mieszanka'}</span><h2>${m.id?esc(m.n||'Mieszanka'):'Dodaj mieszankę'}</h2></div>${close}</div>
    <label class="mx-f"><span class="label">Nazwa</span><input name="n" value="${esc(m.n)}" placeholder="${esc(C.ph)}" required autocomplete="off" maxlength="80"></label>
    ${mxM.set==='moje'?`<label class="mx-f"><span class="label">Lepiszcze z Wyników Pawła</span><select name="base" class="mx-sel"><option value="">— nie wybrano —</option>${mxList('pawel').map(p=>`<option value="${esc(p.id)}"${p.id===m.base?' selected':''}>${esc(p.n)}</option>`).join('')}</select></label>`:''}
    <div class="mx-f"><span class="label">Skład i proporcje</span><div class="mx-rows">${m.parts.map(row).join('')}</div>
      <button type="button" class="mx-addrow" data-mxact="addrow">+ składnik</button><div class="mx-sum" id="mxSum"></div></div>
    <div class="mx-f"><span class="label">Badania</span><div class="mx-tests">${(m.tests.length?m.tests:[{n:'',r:'',note:''}]).map(t=>mxTestRow(t,C)).join('')}</div>
      <button type="button" class="mx-addrow" data-mxact="addtest">+ badanie</button></div>
    <label class="mx-f"><span class="label">Uwagi ogólne</span><textarea name="note" rows="3" placeholder="np. warunki przygotowania próbek, czas mieszania…">${esc(m.note)}</textarea></label>
    <div class="tr-foot"><span class="tr-err" id="mxErr"></span><button type="button" class="td-btn" data-mxact="back">Anuluj</button><button type="submit" class="tr-save">Zapisz</button></div></form>`;
}
const mxPhHtml = z => `<div class="mx-ph" data-zid="${esc(z)}"><img class="nt-img mx-img" data-zid="${esc(z)}" alt=""><button type="button" class="mx-phx" data-mxact="rmph" aria-label="Usuń zdjęcie" title="Usuń zdjęcie">×</button></div>`;
async function mxPhDodaj(files, box){
  if(!box) return; const add=box.querySelector('.mx-phadd');
  for(const f of files){ if(!/^image\//.test(f.type||'')) continue;
    const tmp=document.createElement('div'); tmp.className='mx-ph ld'; box.insertBefore(tmp, add);
    try{ const zid=await ntzDodaj(f); const t=document.createElement('div'); t.innerHTML=mxPhHtml(zid); tmp.replaceWith(t.firstChild); }
    catch(e){ tmp.remove(); const er=$('#mxErr'); if(er) er.textContent=e.message; } }
}
function mxTestRow(t,C){ C=C||MXC[mxM.set]; return `<div class="mx-test"><div class="mx-test-g">
    <label><span class="mx-sl">Badanie</span><input name="tn" value="${esc(t.n)}" placeholder="${esc(C.tn)}" autocomplete="off"></label>
    <label><span class="mx-sl">Wynik z badania</span><input name="tr" value="${esc(t.r)}" placeholder="${esc(C.tr)}" autocomplete="off"></label>
    <label class="w"><span class="mx-sl">Uwagi do badania</span><textarea name="tno" rows="2" placeholder="np. średnia z 3 pomiarów">${esc(t.note)}</textarea></label>
    <div class="w"><span class="mx-sl">Zdjęcia z badania</span><div class="mx-phs">${(t.z||[]).map(mxPhHtml).join('')}<button type="button" class="mx-phadd" data-mxact="addph" title="Dodaj zdjęcie (albo wklej Ctrl+V w polach tego badania)"><span aria-hidden="true">+</span>Zdjęcie</button></div></div></div>
    <button type="button" class="g-del" data-mxact="rmtest" aria-label="Usuń badanie">×</button></div>`; }
function mxSum(){ const f=$('form.mx-form'); if(!f) return; const rows=[...f.querySelectorAll('.mx-row')];
  const vals=rows.map(r=>({v:gNum(r.querySelector('[name=pv]').value)||0, u:r.querySelector('[name=pu]').value}));
  const units=[...new Set(vals.map(x=>x.u))], tot=vals.reduce((a,x)=>a+x.v,0), el=$('#mxSum');
  if(!el) return;
  el.textContent = units.length===1 ? `Suma: ${fmt(tot, Number.isInteger(tot)?0:2)} ${units[0]}${units[0]==='%'&&Math.abs(tot-100)>0.001&&tot>0?(tot<100?` (brakuje do 100%: ${fmt(100-tot,2)})`:` (przekracza 100% o ${fmt(tot-100,2)})`):''}` : `Suma: ${fmt(tot,2)} (różne jednostki)`;
  el.classList.toggle('warn', units[0]==='%' && units.length===1 && tot>0 && Math.abs(tot-100)>0.001);
}
/* ——— PDF wyników: biały arkusz A4 (niezależnie od motywu strony), drukowany → „Zapisz jako PDF” ——— */
const MX_PCOL=['#C8102E','#2F5D8A','#3C8D5A','#B58B5A','#8E6BB0','#5AA3A8','#B04A3A','#7A7066'];
function mxPrintHtml(k, id, IMG={}){
  const C=MXC[k], L=mxList(k).filter(m=>!id||m.id===id);
  const tytul=id&&L[0]?`${C.title} – ${L[0].n||'mieszanka'}`:C.title;
  const data=new Date().toLocaleDateString('pl-PL',{day:'numeric',month:'long',year:'numeric'});
  const item=m=>{ const tot=m.parts.reduce((a,p)=>a+Math.max(0,p.v),0), b=m.base&&MXS.pawel.find(x=>x.id===m.base);
    return `<section class="mx${m.tests.some(t=>t.z.some(z=>IMG[z]))?' zph':''}">
      <h2>${esc(m.n||'Bez nazwy')}</h2>
      ${b?`<p class="base">Lepiszcze: <b>${esc(b.n)}</b></p>`:''}
      ${tot?`<div class="bar">${m.parts.map((p,i)=>p.v>0?`<i style="flex:${p.v};background:${MX_PCOL[i%MX_PCOL.length]}"></i>`:'').join('')}</div>`:''}
      <h3>Skład i proporcje</h3>
      <table><thead><tr><th>Składnik</th><th class="n">Ilość</th><th class="n">Udział</th></tr></thead><tbody>${m.parts.map((p,i)=>`<tr><td><span class="dot" style="background:${MX_PCOL[i%MX_PCOL.length]}"></span>${esc(p.n)}</td><td class="n">${fmt(p.v, Number.isInteger(p.v)?0:2)} ${esc(p.unit)}</td><td class="n">${tot?fmt(p.v/tot*100,1)+' %':''}</td></tr>`).join('')}</tbody></table>
      ${m.tests.length?`<h3>Badania</h3><table><thead><tr><th style="width:34%">Badanie</th><th style="width:22%">Wynik</th><th>Uwagi</th></tr></thead><tbody>${m.tests.map(t=>`<tr${t.z.some(z=>IMG[z])?' class="hasph"':''}><td><b>${esc(t.n)}</b></td><td class="res">${esc(t.r)}</td><td class="muted">${esc(t.note)}</td></tr>${t.z.some(z=>IMG[z])?`<tr class="phr"><td colspan="3"><div class="ph">${t.z.filter(z=>IMG[z]).map(z=>`<img src="${IMG[z]}" alt="">`).join('')}</div></td></tr>`:''}`).join('')}</tbody></table>`:''}
      ${m.note.trim()?`<h3>Uwagi ogólne</h3><p class="note">${esc(m.note)}</p>`:''}
    </section>`; };
  return `<!doctype html><html lang="pl"><head><meta charset="utf-8"><title>${esc(tytul)}</title><style>
  @page{size:A4;margin:14mm 15mm 16mm}
  *{box-sizing:border-box} html,body{margin:0;background:#fff}
  body{font:10pt/1.5 Calibri,Carlito,"Segoe UI",Arial,sans-serif;color:#1d1d1d;-webkit-print-color-adjust:exact;print-color-adjust:exact}
  .sheet{max-width:180mm;margin:0 auto}
  header{border-bottom:2px solid #1d1d1d;padding-bottom:3mm;margin-bottom:6mm;display:flex;justify-content:space-between;align-items:flex-end;gap:10mm}
  header small{display:block;font-size:8.5pt;letter-spacing:.12em;text-transform:uppercase;color:#C8102E}
  header h1{margin:1mm 0 0;font-size:20pt;font-weight:600;letter-spacing:.01em}
  header .meta{text-align:right;font-size:8.5pt;color:#666;line-height:1.5}
  .mx{padding:0 0 6mm;margin-bottom:6mm;border-bottom:1px solid #cfcfcf;break-inside:avoid}
  .mx:last-child{border-bottom:0}
  h2{margin:0 0 2mm;font-size:14pt;font-weight:600}
  h3{margin:4mm 0 1.5mm;font-size:8.5pt;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:#666}
  .base{margin:0 0 2mm;color:#444}
  .bar{display:flex;height:3mm;border-radius:1.5mm;overflow:hidden;margin:2mm 0 1mm}
  table{width:100%;border-collapse:collapse}
  th{text-align:left;font-size:8.5pt;font-weight:600;color:#666;border-bottom:1px solid #1d1d1d;padding:1.2mm 2mm 1.2mm 0}
  td{border-bottom:1px solid #e3e3e3;padding:1.4mm 2mm 1.4mm 0;vertical-align:top}
  .n{text-align:right;white-space:nowrap;font-variant-numeric:tabular-nums}
  .dot{display:inline-block;width:2.4mm;height:2.4mm;border-radius:50%;margin-right:2mm;vertical-align:.1mm}
  .res{font-weight:600;white-space:nowrap} .muted{color:#555}
  .note{margin:0;white-space:pre-wrap}
  .ph{display:grid;grid-template-columns:repeat(auto-fill,minmax(42mm,1fr));gap:3mm;margin:0 0 2mm} .ph img{width:100%;max-height:60mm;object-fit:contain;border:1px solid #ddd;border-radius:1.5mm;break-inside:avoid;background:#fafafa}
  .mx.zph{break-inside:auto} tr.hasph td{border-bottom:0} tr.phr td{padding-top:0}
  @media screen{ body{background:#e8e8e8;padding:20px} .sheet{background:#fff;padding:14mm 15mm;box-shadow:0 2px 12px rgba(0,0,0,.2)} }
  </style></head><body><div class="sheet">
  <header><div><small>${esc(C.label)}</small><h1>${esc(C.title)}</h1></div><div class="meta">${data}<br>${mxCnt(L.length)}</div></header>
  ${L.map(item).join('')}
  </div></body></html>`;
}
async function mxPdf(k, id){
  const tel=matchMedia('(pointer:coarse)').matches, w0=tel?window.open('','_blank'):null;   /* okno od razu (inaczej telefon zablokuje) */
  const zs=mxList(k).filter(m=>!id||m.id===id).flatMap(m=>m.tests.flatMap(t=>t.z)), IMG={};
  if(zs.length && typeof ntzDataUrl==='function'){ if(w0) w0.document.write('<p style="font:16px sans-serif;padding:20px">Przygotowuję PDF ze zdjęciami…</p>'); await Promise.all(zs.map(async z=>{ IMG[z]=await ntzDataUrl(z); })); }
  const html=pdfPrzygotuj(mxPrintHtml(k,id,IMG)), name=(html.match(/<title>(.*?)<\/title>/)||[])[1]||'Wyniki';
  if(tel){   /* telefon: nowa karta → Udostępnij/Drukuj → Zapisz jako PDF */
    const w=w0; if(w){ w.document.open(); w.document.write(html.replace('</body>','<script>setTimeout(()=>print(),'+(zs.length?1200:400)+')<\/script></body>')); w.document.close(); return; } }
  pdfDrukuj(html, name.replace(/&amp;/g,'&').replace(/&quot;/g,'"'));
}
function mxRender(){
  let sc=$('#mxScrim'), md=$('#mxModal');
  if(!mxM || !$('#prWyn')){ sc&&sc.remove(); md&&md.remove(); mxM=null; document.body.classList.remove('tr-lock'); return; }
  if(!md){ sc=document.createElement('div'); sc.id='mxScrim'; sc.className='tr-scrim'; document.body.appendChild(sc);
    md=document.createElement('div'); md.id='mxModal'; md.className='tr-modal'; md.setAttribute('role','dialog'); md.setAttribute('aria-modal','true'); document.body.appendChild(md); }
  document.body.classList.add('tr-lock'); md.innerHTML=`<div class="tr-panel">${mxModalHtml()}</div>`; mxSum();
  if(mxM.mode==='edit'){ const n=md.querySelector('[name=n]'); n&&setTimeout(()=>n.focus(),30); }
}
function mxRefresh(){ for(const k in MXC){ const c=$('#mxCount-'+k); if(c) c.textContent=mxCnt(MXS[k].length); } if(mxM&&mxM.mode==='list') mxRender(); }
document.addEventListener('click', e=>{
  if(e.target.id==='mxScrim'||e.target.id==='mxModal'){ mxM=null; return mxRender(); }
  const b=e.target.closest('[data-mxact]'); if(!b) return;
  const a=b.dataset.mxact;
  if(a==='open'){ mxM={set:b.dataset.set||'pawel', mode:'list'}; return mxRender(); }
  if(a==='close'){ mxM=null; return mxRender(); }
  if(a==='up'||a==='down'){ return mxMove(mxM.set, b.dataset.id, a==='up'?-1:1); }
  if(a==='pdf'){ return mxPdf(mxM.set, b.dataset.id||''); }
  if(a==='new'){ mxM={...mxM, mode:'edit', id:''}; return mxRender(); }
  if(a==='edit'){ mxM={...mxM, mode:'edit', id:b.dataset.id}; return mxRender(); }
  if(a==='back'){ mxM={set:mxM.set, mode:'list'}; return mxRender(); }
  if(a==='addrow'){ const box=$('.mx-rows'), n=box.children.length, tmp=document.createElement('div');
    tmp.innerHTML=`<div class="mx-row"><span class="mx-dot" style="background:${MX_COL[n%MX_COL.length]}"></span><input name="pn" placeholder="Składnik" aria-label="Składnik" autocomplete="off"><input name="pv" placeholder="0" inputmode="decimal" aria-label="Proporcja" autocomplete="off"><select name="pu" aria-label="Jednostka">${MX_UNITS.map(u=>`<option${u===((box.querySelector('[name=pu]')||{}).value||'%')?' selected':''}>${u}</option>`).join('')}</select><button type="button" class="g-del" data-mxact="rmrow" aria-label="Usuń składnik">×</button></div>`;
    box.appendChild(tmp.firstChild); box.lastChild.querySelector('input').focus(); mxSum(); return; }
  if(a==='rmrow'){ b.closest('.mx-row').remove(); mxSum(); return; }
  if(a==='addtest'){ const box=$('.mx-tests'), tmp=document.createElement('div'); tmp.innerHTML=mxTestRow({n:'',r:'',note:''},MXC[mxM.set]); box.appendChild(tmp.firstChild); box.lastChild.querySelector('input').focus(); return; }
  if(a==='addph'){ const i=document.createElement('input'); i.type='file'; i.accept='image/*'; i.multiple=true; const box=b.closest('.mx-phs'); i.onchange=()=>mxPhDodaj([...i.files], box); i.click(); return; }
  if(a==='rmph'){ b.closest('.mx-ph').remove(); return; }
  if(a==='rmtest'){ b.closest('.mx-test').remove(); return; }
  if(a==='del'){ if(!b.dataset.marm){ b.dataset.marm='1'; b.textContent='Usuń?'; b.classList.add('armed'); setTimeout(()=>{ if(b.isConnected){ delete b.dataset.marm; b.textContent='×'; b.classList.remove('armed'); } },3000); return; }
    const id=b.dataset.id, k=mxM.set; MXS[k]=MXS[k].filter(m=>m.id!==id); saveMx(k); mxRefresh(); cloud(db=>db.collection(MXC[k].col).doc(id).delete()); }
});
document.addEventListener('paste', e=>{ if(!(e.target.closest&&e.target.closest('form.mx-form'))) return; const f=[...((e.clipboardData||{}).files||[])].filter(x=>/^image\//.test(x.type)); if(!f.length) return; e.preventDefault(); const t=e.target.closest('.mx-test')||document.querySelector('form.mx-form .mx-test:last-child'); if(t) mxPhDodaj(f, t.querySelector('.mx-phs')); });
document.addEventListener('input', e=>{ if(e.target.closest && e.target.closest('form.mx-form') && (e.target.name==='pv'||e.target.name==='pu')) mxSum(); });
document.addEventListener('change', e=>{ if(e.target.name==='pu' && e.target.closest && e.target.closest('form.mx-form')) mxSum(); });
document.addEventListener('submit', e=>{
  const f=e.target; if(!f.matches('form.mx-form')) return; e.preventDefault();
  const n=f.n.value.trim(); if(!n){ f.n.focus(); return; }
  const parts=[...f.querySelectorAll('.mx-row')].map(r=>({n:r.querySelector('[name=pn]').value.trim(), v:Math.max(0,gNum(r.querySelector('[name=pv]').value)||0), unit:r.querySelector('[name=pu]').value})).filter(p=>p.n);
  if(!parts.length){ $('#mxErr').textContent='Dodaj przynajmniej jeden składnik.'; return; }
  const tests=[...f.querySelectorAll('.mx-test')].map(r=>({n:r.querySelector('[name=tn]').value.trim(), r:r.querySelector('[name=tr]').value.trim(), note:r.querySelector('[name=tno]').value.trim(), z:[...r.querySelectorAll('.mx-ph[data-zid]')].map(x=>x.dataset.zid)})).filter(t=>t.n||t.r||t.note||t.z.length);
  const k=mxM.set, old=MXS[k].find(x=>x.id===mxM.id), m=mxNorm(old?old.id:uid('m'),{n, parts, tests, base:f.base?f.base.value:'', note:f.note.value, c:old?old.c:Date.now(), u:Date.now(), o:old?old.o:(MXS[k].some(x=>x.o!==null)?Math.min(...MXS[k].filter(x=>x.o!==null).map(x=>x.o))-1:null)});
  MXS[k]=old?MXS[k].map(x=>x.id===m.id?m:x):[m,...MXS[k]]; saveMx(k); cloud(db=>{ const {id,...d}=m; return db.collection(MXC[k].col).doc(id).set(d); });
  mxM={set:k, mode:'list'}; mxRender(); mxRefresh();
});
document.addEventListener('keydown', e=>{ if(mxM && e.key==='Escape'){ e.stopPropagation(); mxM=null; mxRender(); } }, true);

/* ——— LICZENIE MMA: kalkulator MASA Web (plik kalkulatory/masa.html) w okienku ———
   Kalkulator to osobna strona wczytana w ramce (iframe), więc jego kod nie miesza się z kodem strony.
   Motyw (jasny/ciemny) przekazywany do ramki na bieżąco. Dane kalkulatora zapisuje on sam w przeglądarce. */
const MMA_URL = 'kalkulatory/masa.html';
let mmaM = false, mmaObs = null;
function mmaTheme(){ const f=$('#mmaFrame'); try{ const d=f&&f.contentDocument&&f.contentDocument.documentElement; if(!d) return;
  const t=document.documentElement.getAttribute('data-theme'); t?d.setAttribute('data-theme',t):d.removeAttribute('data-theme'); }catch(e){} }
function mmaRender(){
  let sc=$('#mmaScrim'), md=$('#mmaModal');
  if(!mmaM){ sc&&sc.remove(); md&&md.remove(); if(mmaObs){ mmaObs.disconnect(); mmaObs=null; } document.body.classList.remove('tr-lock'); return; }
  if(md) return;
  sc=document.createElement('div'); sc.id='mmaScrim'; sc.className='tr-scrim'; document.body.appendChild(sc);
  md=document.createElement('div'); md.id='mmaModal'; md.className='mma-modal'; md.setAttribute('role','dialog'); md.setAttribute('aria-modal','true'); md.setAttribute('aria-label','Liczenie MMA');
  md.innerHTML=`<div class="mma-panel"><div class="mma-top"><div><span class="label">Kalkulatory</span><h2>Liczenie MMA</h2></div>
      <div class="mma-acts"><a class="mma-tab" href="${MMA_URL}" target="_blank" rel="noopener" title="Otwórz w nowej karcie">↗<span> Nowa karta</span></a><button type="button" class="tr-x" data-mmaact="close" aria-label="Zamknij">✕</button></div></div>
    <div class="mma-load" id="mmaLoad">Wczytywanie kalkulatora…</div>
    <iframe id="mmaFrame" class="mma-frame" src="${MMA_URL}" title="Kalkulator MASA Web"></iframe></div>`;
  document.body.appendChild(md); document.body.classList.add('tr-lock');
  const f=$('#mmaFrame');
  f.addEventListener('load', ()=>{ mmaTheme(); const l=$('#mmaLoad'); if(l) l.remove();
    try{ f.contentWindow.addEventListener('keydown', e=>{ if(e.key==='Escape' && !e.target.closest('input,select,textarea')){ mmaM=false; mmaRender(); } }); }catch(e){} });
  mmaObs=new MutationObserver(mmaTheme); mmaObs.observe(document.documentElement,{attributes:true, attributeFilter:['data-theme']});
}
document.addEventListener('click', e=>{
  if(e.target.id==='mmaScrim' || e.target.id==='mmaModal'){ mmaM=false; return mmaRender(); }
  const a=e.target.closest('[data-mmaact]'); if(!a) return;
  mmaM=a.dataset.mmaact==='open'; mmaRender();
});
document.addEventListener('keydown', e=>{ if(mmaM && e.key==='Escape'){ e.stopPropagation(); mmaM=false; mmaRender(); } }, true);
