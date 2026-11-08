/* ════════════════════════════════════════════════════════════════════════
   KALKULATORY (STUDIA)
   ════════════════════════════════════════════════════════════════════════
   pCalcs() – karty: Liczenie MMA (kalkulator MASA Web w okienku), Wyniki Pawła, Wyniki moje.
   MXC      – ustawienia obu list wyników (nazwy, domyślne składniki, podpowiedzi).
   MXS      – zapisane mieszanki: {pawel: [...], moje: [...]}.
   Nowy kalkulator = nowa karta w pCalcs() + własny kod pod spodem.
   ════════════════════════════════════════════════════════════════════════ */

function pCalcs(){
  return `<h1>Kalkula<span class="acc">tory</span></h1>
  <div class="calc-cards" id="calcPage">
    <button type="button" class="calc-card res" data-mmaact="open"><div class="calc-ic" aria-hidden="true"><svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M4 36h40"/><path d="M4 30h40" stroke-dasharray="3 4"/><circle cx="12" cy="24" r="2.2" fill="currentColor" stroke="none"/><circle cx="20" cy="21" r="1.6" fill="currentColor" stroke="none"/><circle cx="28" cy="25" r="2.6" fill="currentColor" stroke="none"/><circle cx="36" cy="22" r="1.8" fill="currentColor" stroke="none"/><path d="M4 42h40"/></svg></div>
      <h2>Liczenie MMA</h2><span class="calc-count">kalkulator MASA Web · skład, lepiszcze, receptura</span><span class="calc-open">Otwórz →</span></button>
    <button type="button" class="calc-card res" data-mxact="open" data-set="pawel"><div class="calc-ic" aria-hidden="true"><svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6h12M20 6v12L9 38a3 3 0 0 0 2.6 4.5h24.8A3 3 0 0 0 39 38L28 18V6"/><path d="M13.5 30h21"/><circle cx="21" cy="35" r="1.6" fill="currentColor" stroke="none"/><circle cx="27" cy="37" r="1.2" fill="currentColor" stroke="none"/></svg></div>
      <h2>Wyniki Pawła</h2><span class="calc-count" id="mxCount-pawel">${mxCnt(MXS.pawel.length)}</span><span class="calc-open">Otwórz →</span></button>
    <button type="button" class="calc-card res mine" data-mxact="open" data-set="moje"><div class="calc-ic" aria-hidden="true"><svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6h12M20 6v12L9 38a3 3 0 0 0 2.6 4.5h24.8A3 3 0 0 0 39 38L28 18V6"/><path d="M13.5 30h21"/><circle cx="21" cy="35" r="1.6" fill="currentColor" stroke="none"/><circle cx="27" cy="37" r="1.2" fill="currentColor" stroke="none"/></svg></div>
      <h2>Wyniki moje</h2><span class="calc-count" id="mxCount-moje">${mxCnt(MXS.moje.length)}</span><span class="calc-open">Otwórz →</span></button>
  </div>`;
}

/* ——— WYNIKI: mieszanki z pracy inżynierskiej (nazwa, skład, proporcje; chmura przez db, kopia w przeglądarce) ——— */
const MX_UNITS=['%','g','kg','ml','cz. mas.'];
const mxNorm = (id,v={}) => ({id, n:String(v.n||''), note:String(v.note||''), c:+v.c||0, u:+v.u||+v.c||0,
  parts:(Array.isArray(v.parts)?v.parts:[]).map(p=>({n:String(p.n||''), v:+p.v||0, unit:MX_UNITS.includes(p.unit)?p.unit:'%'})),
  tests:(Array.isArray(v.tests)?v.tests:[]).map(t=>({n:String(t.n||''), r:String(t.r||''), note:String(t.note||'')})), base:String(v.base||'')});
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
const mxList = k => MXS[k].slice().sort((a,b)=>b.u-a.u);
const mxCnt = n => n?n+' '+(n===1?'mieszanka':(n%10>=2&&n%10<=4&&(n%100<10||n%100>=20))?'mieszanki':'mieszanek'):'brak wpisów';
function mxBar(m){ const tot=m.parts.reduce((a,p)=>a+Math.max(0,p.v),0); if(!tot) return '';
  return `<div class="mx-bar" role="img" aria-label="Proporcje">${m.parts.map((p,i)=>p.v>0?`<i style="flex:${p.v};background:${MX_COL[i%MX_COL.length]}" title="${esc(p.n)}: ${fmt(p.v/tot*100,1)}%"></i>`:'').join('')}</div>`; }
function mxModalHtml(){
  const close=`<button type="button" class="tr-x" data-mxact="close" aria-label="Zamknij">✕</button>`;
  const C=MXC[mxM.set], MX=MXS[mxM.set];
  if(mxM.mode==='list'){ const L=mxList(mxM.set);
    return `<div class="tr-top"><div><span class="label">${esc(C.label)}</span><h2>${esc(C.title)}</h2></div>${close}</div>
      <button type="button" class="mx-add" data-mxact="new"><span aria-hidden="true">+</span>Dodaj mieszankę</button>
      ${L.length?`<div class="mx-list">${L.map(m=>{ const tot=m.parts.reduce((a,p)=>a+Math.max(0,p.v),0);
        return `<article class="mx-item"><div class="mx-ih"><b>${esc(m.n||'Bez nazwy')}</b><div class="mx-acts"><button type="button" class="td-btn" data-mxact="edit" data-id="${esc(m.id)}">Edytuj</button><button type="button" class="g-del" data-mxact="del" data-id="${esc(m.id)}" aria-label="Usuń mieszankę">×</button></div></div>
          ${m.base?(b=>b?`<p class="mx-base">Lepiszcze: <b>${esc(b.n)}</b></p>`:'')(MXS.pawel.find(x=>x.id===m.base)):''}
          ${mxBar(m)}
          <table class="mx-t"><tbody>${m.parts.map((p,i)=>`<tr><td><span class="mx-dot" style="background:${MX_COL[i%MX_COL.length]}"></span>${esc(p.n)}</td><td class="n">${fmt(p.v, Number.isInteger(p.v)?0:2)} ${esc(p.unit)}</td><td class="n mx-pct">${tot?fmt(p.v/tot*100,1)+'%':''}</td></tr>`).join('')}</tbody></table>
          ${m.tests.length?`<div class="mx-tt"><span class="label">Badania</span><table class="mx-bt"><thead><tr><th>Badanie</th><th>Wynik</th><th>Uwagi</th></tr></thead><tbody>${m.tests.map(t=>`<tr><td><b>${esc(t.n)}</b></td><td class="mx-res">${esc(t.r)}</td><td class="mx-tn">${esc(t.note)}</td></tr>`).join('')}</tbody></table></div>`:''}
          ${m.note.trim()?`<p class="mx-note">${esc(m.note)}</p>`:''}</article>`; }).join('')}</div>`
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
function mxTestRow(t,C){ C=C||MXC[mxM.set]; return `<div class="mx-test"><div class="mx-test-g">
    <label><span class="mx-sl">Badanie</span><input name="tn" value="${esc(t.n)}" placeholder="${esc(C.tn)}" autocomplete="off"></label>
    <label><span class="mx-sl">Wynik z badania</span><input name="tr" value="${esc(t.r)}" placeholder="${esc(C.tr)}" autocomplete="off"></label>
    <label class="w"><span class="mx-sl">Uwagi do badania</span><textarea name="tno" rows="2" placeholder="np. średnia z 3 pomiarów">${esc(t.note)}</textarea></label></div>
    <button type="button" class="g-del" data-mxact="rmtest" aria-label="Usuń badanie">×</button></div>`; }
function mxSum(){ const f=$('form.mx-form'); if(!f) return; const rows=[...f.querySelectorAll('.mx-row')];
  const vals=rows.map(r=>({v:gNum(r.querySelector('[name=pv]').value)||0, u:r.querySelector('[name=pu]').value}));
  const units=[...new Set(vals.map(x=>x.u))], tot=vals.reduce((a,x)=>a+x.v,0), el=$('#mxSum');
  if(!el) return;
  el.textContent = units.length===1 ? `Suma: ${fmt(tot, Number.isInteger(tot)?0:2)} ${units[0]}${units[0]==='%'&&Math.abs(tot-100)>0.001&&tot>0?(tot<100?` (brakuje do 100%: ${fmt(100-tot,2)})`:` (przekracza 100% o ${fmt(tot-100,2)})`):''}` : `Suma: ${fmt(tot,2)} (różne jednostki)`;
  el.classList.toggle('warn', units[0]==='%' && units.length===1 && tot>0 && Math.abs(tot-100)>0.001);
}
function mxRender(){
  let sc=$('#mxScrim'), md=$('#mxModal');
  if(!mxM || !$('#calcPage')){ sc&&sc.remove(); md&&md.remove(); mxM=null; document.body.classList.remove('tr-lock'); return; }
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
  if(a==='new'){ mxM={...mxM, mode:'edit', id:''}; return mxRender(); }
  if(a==='edit'){ mxM={...mxM, mode:'edit', id:b.dataset.id}; return mxRender(); }
  if(a==='back'){ mxM={set:mxM.set, mode:'list'}; return mxRender(); }
  if(a==='addrow'){ const box=$('.mx-rows'), n=box.children.length, tmp=document.createElement('div');
    tmp.innerHTML=`<div class="mx-row"><span class="mx-dot" style="background:${MX_COL[n%MX_COL.length]}"></span><input name="pn" placeholder="Składnik" aria-label="Składnik" autocomplete="off"><input name="pv" placeholder="0" inputmode="decimal" aria-label="Proporcja" autocomplete="off"><select name="pu" aria-label="Jednostka">${MX_UNITS.map(u=>`<option${u===((box.querySelector('[name=pu]')||{}).value||'%')?' selected':''}>${u}</option>`).join('')}</select><button type="button" class="g-del" data-mxact="rmrow" aria-label="Usuń składnik">×</button></div>`;
    box.appendChild(tmp.firstChild); box.lastChild.querySelector('input').focus(); mxSum(); return; }
  if(a==='rmrow'){ b.closest('.mx-row').remove(); mxSum(); return; }
  if(a==='addtest'){ const box=$('.mx-tests'), tmp=document.createElement('div'); tmp.innerHTML=mxTestRow({n:'',r:'',note:''},MXC[mxM.set]); box.appendChild(tmp.firstChild); box.lastChild.querySelector('input').focus(); return; }
  if(a==='rmtest'){ b.closest('.mx-test').remove(); return; }
  if(a==='del'){ if(!b.dataset.marm){ b.dataset.marm='1'; b.textContent='Usuń?'; b.classList.add('armed'); setTimeout(()=>{ if(b.isConnected){ delete b.dataset.marm; b.textContent='×'; b.classList.remove('armed'); } },3000); return; }
    const id=b.dataset.id, k=mxM.set; MXS[k]=MXS[k].filter(m=>m.id!==id); saveMx(k); mxRefresh(); cloud(db=>db.collection(MXC[k].col).doc(id).delete()); }
});
document.addEventListener('input', e=>{ if(e.target.closest && e.target.closest('form.mx-form') && (e.target.name==='pv'||e.target.name==='pu')) mxSum(); });
document.addEventListener('change', e=>{ if(e.target.name==='pu' && e.target.closest && e.target.closest('form.mx-form')) mxSum(); });
document.addEventListener('submit', e=>{
  const f=e.target; if(!f.matches('form.mx-form')) return; e.preventDefault();
  const n=f.n.value.trim(); if(!n){ f.n.focus(); return; }
  const parts=[...f.querySelectorAll('.mx-row')].map(r=>({n:r.querySelector('[name=pn]').value.trim(), v:Math.max(0,gNum(r.querySelector('[name=pv]').value)||0), unit:r.querySelector('[name=pu]').value})).filter(p=>p.n);
  if(!parts.length){ $('#mxErr').textContent='Dodaj przynajmniej jeden składnik.'; return; }
  const tests=[...f.querySelectorAll('.mx-test')].map(r=>({n:r.querySelector('[name=tn]').value.trim(), r:r.querySelector('[name=tr]').value.trim(), note:r.querySelector('[name=tno]').value.trim()})).filter(t=>t.n||t.r||t.note);
  const k=mxM.set, old=MXS[k].find(x=>x.id===mxM.id), m=mxNorm(old?old.id:uid('m'),{n, parts, tests, base:f.base?f.base.value:'', note:f.note.value, c:old?old.c:Date.now(), u:Date.now()});
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
