/* ════════════════════════════════════════════════════════════════════════
   WORLD OF TANKS → zakładka „Cele” (cele na miesiąc albo rok, z odhaczaniem)
   ════════════════════════════════════════════════════════════════════════
   WC – cele (chmura: kolekcja „wotCele”): t treść · o okres ('2026-11' = miesiąc, '2026' = rok) · done · c kolejność
   wcTyp ('m' | 'r') i wcOkres — który miesiąc/rok jest pokazany (strzałki ‹ ›, „Dziś” wraca do bieżącego).
   „Przenieś niezrobione” kopiuje nieodhaczone cele z poprzedniego okresu do oglądanego.
   Panel wstawia wotPanel('cele') w js/04-world-of-tanks.js; zakładka jest w WOT_TABS.
   ════════════════════════════════════════════════════════════════════════ */
const wcNorm = (id,v={}) => ({id, t:String(v.t||''), o:String(v.o||''), done:!!v.done, c:+v.c||0});
let WC=[]; try{ const c=JSON.parse(store.get('wotCele','null')); if(Array.isArray(c)) WC=c.map(x=>wcNorm(x.id,x)); }catch(e){}
const saveWc = () => store.set('wotCele', JSON.stringify(WC));
const wcPush = x => cloud(db=>{ const {id,...v}=x; return db.collection('wotCele').doc(id).set(v); });
let wcTyp = store.get('wcTyp','m');
let wcOkres = '';
const wcBiez = () => wcTyp==='r' ? todayISO().slice(0,4) : todayISO().slice(0,7);
const wcPrzes = (o,n) => { if(o.length===4) return String(+o+n); let y=+o.slice(0,4), m=+o.slice(5,7)+n; while(m>12){m-=12;y++;} while(m<1){m+=12;y--;} return `${y}-${String(m).padStart(2,'0')}`; };
const wcNazwa = o => o.length===4 ? `Rok ${o}` : new Date(o+'-01T12:00').toLocaleDateString('pl-PL',{month:'long', year:'numeric'});
const wcCnt = n => n===1?'cel':(n%10>=2&&n%10<=4&&(n%100<10||n%100>=20))?'cele':'celów';

function celeHtml(){
  if(!wcOkres || wcOkres.length!==(wcTyp==='r'?4:7)) wcOkres=wcBiez();
  const L=WC.filter(x=>x.o===wcOkres).sort((a,b)=>a.done-b.done||a.c-b.c), z=L.filter(x=>x.done).length, pct=L.length?Math.round(z/L.length*100):0;
  const poprz=WC.filter(x=>x.o===wcPrzes(wcOkres,-1) && !x.done && !L.some(y=>y.t.trim().toLowerCase()===x.t.trim().toLowerCase()));
  /* cele roczne widoczne też przy miesiącu (i odwrotnie: podsumowanie miesięcy przy roku) */
  const rok=wcTyp==='m'?WC.filter(x=>x.o===wcOkres.slice(0,4)):[];
  const mies=wcTyp==='r'?[...Array(12)].map((_,i)=>`${wcOkres}-${String(i+1).padStart(2,'0')}`).map(o=>({o, L:WC.filter(x=>x.o===o)})).filter(m=>m.L.length):[];
  const item=x=>`<li class="wc-it${x.done?' done':''}"><label class="wc-chk"><input type="checkbox" class="sq wc-cb" data-id="${esc(x.id)}"${x.done?' checked':''} aria-label="Cel zrobiony"></label>
      <input class="wc-t" data-id="${esc(x.id)}" value="${esc(x.t)}" aria-label="Treść celu" maxlength="160">
      <button type="button" class="del" data-wcdel="${esc(x.id)}" aria-label="Usuń cel">×</button></li>`;
  return `<div class="wc">
    <div class="wc-bar"><div class="seg" role="tablist"><button type="button" data-wctyp="m" aria-selected="${wcTyp==='m'}">Miesiąc</button><button type="button" data-wctyp="r" aria-selected="${wcTyp==='r'}">Rok</button></div>
      <div class="wc-nav"><button type="button" class="td-btn" data-wcnav="-1" aria-label="Poprzedni">‹</button><b class="wc-name">${esc(wcNazwa(wcOkres))}</b><button type="button" class="td-btn" data-wcnav="1" aria-label="Następny">›</button>${wcOkres!==wcBiez()?`<button type="button" class="td-btn" data-wcnav="0">Dziś</button>`:''}</div></div>
    <div class="grid g3 sum-strip">
      <div class="cell"><span class="label">Zrobione</span><span class="big">${z}<small>/ ${L.length}</small></span><div class="wc-prog" aria-hidden="true"><i style="width:${pct}%"></i></div></div>
      <div class="cell"><span class="label">Postęp</span><span class="big">${pct}<small>%</small></span><p>${L.length-z?`zostało ${L.length-z} ${wcCnt(L.length-z)}`:L.length?`<span class="ic-ok">${icn('cel')} wszystko zrobione</span>`:'brak celów'}</p></div>
      <div class="cell"><span class="label">${wcTyp==='m'?'Cele na rok '+wcOkres.slice(0,4):'Miesiące z celami'}</span><span class="big">${wcTyp==='m'?`${rok.filter(x=>x.done).length}<small>/ ${rok.length}</small>`:`${mies.length}<small>/ 12</small>`}</span><p>${wcTyp==='m'?'zrobionych celów rocznych':`${mies.reduce((a,m)=>a+m.L.filter(x=>x.done).length,0)} z ${mies.reduce((a,m)=>a+m.L.length,0)} celów miesięcznych`}</p></div></div>
    <form class="addrow wc-add"><input name="t" placeholder="+ Nowy cel na ${esc(wcTyp==='m'?wcNazwa(wcOkres):'rok '+wcOkres)}, np. 3 znaczki na Ru 251" aria-label="Nowy cel" maxlength="160" autocomplete="off" required><button type="submit">Dodaj</button></form>
    ${poprz.length?`<button type="button" class="td-btn wc-carry" data-wccarry="1">↳ Przenieś niezrobione z poprzedniego ${wcTyp==='m'?'miesiąca':'roku'} (${poprz.length})</button>`:''}
    ${L.length?`<ul class="wc-list">${L.map(item).join('')}</ul>`:`<div class="nt-blank"><p>Brak celów na ${esc(wcTyp==='m'?wcNazwa(wcOkres):'rok '+wcOkres)}. Dodaj pierwszy powyżej.</p></div>`}
    ${rok.length?`<section class="block"><div class="block-head"><h2>Cele na rok ${esc(wcOkres.slice(0,4))}</h2></div><ul class="wc-list">${rok.sort((a,b)=>a.done-b.done||a.c-b.c).map(item).join('')}</ul></section>`:''}
    ${mies.length?`<section class="block"><div class="block-head"><h2>Miesiące</h2></div><div class="wc-months">${mies.map(m=>{ const d=m.L.filter(x=>x.done).length;
        return `<button type="button" class="wc-mon" data-wcgo="${m.o}"><span class="label">${esc(wcNazwa(m.o))}</span><b>${d} / ${m.L.length}</b><div class="wc-prog"><i style="width:${Math.round(d/m.L.length*100)}%"></i></div></button>`; }).join('')}</div></section>`:''}
  </div>`;
}
function wcRefresh(){ if(typeof wotTab!=='undefined' && wotTab==='cele' && $('#wotPanel')){ const a=document.activeElement; if(a&&a.matches&&(a.matches('.wc-t')||(a.matches('.wc-add input')&&a.value))) return;   /* nie przerywaj pisania */ const y=window.scrollY; $('#wotPanel').innerHTML=celeHtml(); window.scrollTo(0,y); } }
function wcSet(id,patch){ const x=WC.find(y=>y.id===id); if(!x) return; const n={...x,...patch}; WC=WC.map(y=>y.id===id?n:y); saveWc(); wcPush(n); }

document.addEventListener('click', e=>{
  const t=e.target.closest('[data-wctyp],[data-wcnav],[data-wcdel],[data-wccarry],[data-wcgo]'); if(!t || !t.closest('.wc')) return;
  if(t.dataset.wctyp){ wcTyp=t.dataset.wctyp; store.set('wcTyp',wcTyp); wcOkres=wcBiez(); return wcRefresh(); }
  if(t.dataset.wcnav!==undefined){ const n=+t.dataset.wcnav; wcOkres=n?wcPrzes(wcOkres,n):wcBiez(); return wcRefresh(); }
  if(t.dataset.wcgo){ wcTyp='m'; store.set('wcTyp','m'); wcOkres=t.dataset.wcgo; return wcRefresh(); }
  if(t.dataset.wccarry){ const L=WC.filter(x=>x.o===wcOkres), P=WC.filter(x=>x.o===wcPrzes(wcOkres,-1) && !x.done && !L.some(y=>y.t.trim().toLowerCase()===x.t.trim().toLowerCase()));
    let c=Date.now(); const N=P.map(x=>wcNorm(uid('wc'),{t:x.t, o:wcOkres, c:c++})); WC=[...WC,...N]; saveWc(); N.forEach(wcPush); return wcRefresh(); }
  if(t.dataset.wcdel){ if(!t.dataset.armed){ t.dataset.armed='1'; t.textContent='Usuń?'; t.classList.add('armed'); setTimeout(()=>{ if(t.isConnected){ delete t.dataset.armed; t.textContent='×'; t.classList.remove('armed'); } },3000); return; }
    const id=t.dataset.wcdel; WC=WC.filter(x=>x.id!==id); saveWc(); wcRefresh(); cloud(db=>db.collection('wotCele').doc(id).delete()); }
});
document.addEventListener('change', e=>{
  const el=e.target;
  if(el.matches('.wc-cb')){ wcSet(el.dataset.id,{done:el.checked}); return wcRefresh(); }
  if(el.matches('.wc-t')){ const v=el.value.trim(), x=WC.find(y=>y.id===el.dataset.id); el.blur(); if(v&&x&&v!==x.t) wcSet(x.id,{t:v}); else if(x) el.value=x.t; return wcRefresh(); }
});
document.addEventListener('keydown', e=>{ if(e.key==='Enter' && e.target.matches && e.target.matches('.wc-t')) e.target.blur(); });
document.addEventListener('submit', e=>{
  const f=e.target; if(!f.matches('form.wc-add')) return; e.preventDefault();
  const v=f.t.value.trim(); if(!v) return;
  const x=wcNorm(uid('wc'),{t:v, o:wcOkres||wcBiez(), c:Date.now()}); WC=[...WC,x]; saveWc(); wcPush(x); f.t.value='';
  const y=window.scrollY; $('#wotPanel').innerHTML=celeHtml(); window.scrollTo(0,y); const i=$('form.wc-add input'); i&&i.focus();
});
