/* ════════════════════════════════════════════════════════════════════════
   KALENDARZ — miesiąc z wydarzeniami z całej strony (wygląd jak na wzorze „Pillio”)
   ════════════════════════════════════════════════════════════════════════
   Źródła (kalDzien → lista wydarzeń na dany dzień ISO):
     todo    zadania z terminem (To-Do, js/05)           — da się odhaczyć i dodać nowe na wybrany dzień (z godziną lub bez — pole tm)
     tren    zapisane treningi (Siłownia, js/07)
     plat    stałe wpływy/opłaty i zaplanowane operacje (Finanse, js/17) + odnowienia subskrypcji (js/15)
     bad     wpisy badań (Praca, js/21)
   Dodatkowo w komórce: suma wydatków z tego dnia (Finanse).
   kalM — oglądany miesiąc 'RRRR-MM' · kalSel — zaznaczony dzień · kalOff — wyłączone kategorie (filtr, pamiętany).
   ════════════════════════════════════════════════════════════════════════ */
const KAL_KAT = {todo:['Zadania','#5B5BD6'], tren:['Treningi','#2E9E68'], plat:['Płatności','#E0832F']};   /* „Badania” usunięte razem z dziennikiem w Pracy */
let kalM = todayISO().slice(0,7), kalSel = todayISO();
let kalOff = new Set(); try{ const o=JSON.parse(store.get('kalOff','[]')); if(Array.isArray(o)) kalOff=new Set(o); }catch(e){}
const kalIso = d => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
const kalMies = (m,n) => { let y=+m.slice(0,4), mm=+m.slice(5,7)+n; while(mm>12){mm-=12;y++;} while(mm<1){mm+=12;y--;} return `${y}-${String(mm).padStart(2,'0')}`; };
const kalZl = v => fmt(v, Number.isInteger(v)?0:2)+' zł';

/* wszystkie wydarzenia z zakresu dat (od…do włącznie) pogrupowane po dniu */
function kalZbierz(od, doI){
  const M={}, add=(d,e)=>{ if(d<od||d>doI) return; (M[d]=M[d]||[]).push(e); };
  if(typeof T==='object' && T.tasks) T.tasks.forEach(t=>{ if(t.due) add(t.due,{k:'todo', id:t.id, n:t.t, done:t.done, imp:t.imp, tm:t.tm||''}); });
  if(typeof TR!=='undefined') TR.forEach(t=>add(t.d,{k:'tren', id:t.id, n:t.dn||'Trening', sub:t.pn, done:!!t.e}));
  if(typeof FIN==='object'){
    if(typeof finStaleDaty==='function') FIN.stale.forEach(s=>{ if(s.a>0) finStaleDaty(s, od, doI).forEach(d=>add(d,{k:'plat', n:s.n, kw:s.a, wpl:s.t==='wpl', sub:'stała'})); });
    const td=todayISO(); FIN.ops.forEach(o=>{ if(o.d>td && o.t!=='prz' && o.t!=='skb') add(o.d,{k:'plat', n:o.n||o.kat||'Operacja', kw:o.a, wpl:o.t==='wpl', sub:'zaplanowana'}); });
  }
  if(typeof SUB!=='undefined' && typeof subNth==='function') SUB.forEach(s=>{
    if(s.tryb==='anul'){ if(s.do) add(s.do,{k:'plat', n:s.n, sub:'subskrypcja wygasa'}); return; }
    if(s.przerwy.some(p=>!p.do)) return;   /* przerwa w płaceniu */
    const st=[...s.przerwy].reverse().find(p=>p.do)?.do || s.od, cena=pxEval(s.p);
    for(let k=0;k<2000;k++){ const d=kalIso(subNth(s,k,st)); if(d>doI) break; add(d,{k:'plat', n:s.n, kw:isNaN(cena)?0:cena, sub:s.tryb==='reczne'?'subskrypcja · zapłać':'subskrypcja'}); }
  });
  Object.values(M).forEach(L=>L.sort((a,b)=>(a.tm?0:1)-(b.tm?0:1)||(a.tm||'').localeCompare(b.tm||'')));   /* z godziną — na górze, po kolei */
  return M;
}
function kalWydane(od, doI){ const S={}; if(typeof FIN==='object') FIN.ops.forEach(o=>{ if(o.t==='wyd' && o.d>=od && o.d<=doI) S[o.d]=(S[o.d]||0)+o.a; }); return S; }

function kalHtml(){
  const [y,m]=kalM.split('-').map(Number), first=new Date(y,m-1,1), dniM=new Date(y,m,0).getDate();
  const lead=(first.getDay()+6)%7, cells=Math.ceil((lead+dniM)/7)*7, start=new Date(y,m-1,1-lead);
  const od=kalIso(start), doI=kalIso(new Date(y,m-1,1-lead+cells-1)), M=kalZbierz(od,doI), W=kalWydane(od,doI), td=todayISO();
  const tyt=first.toLocaleDateString('pl-PL',{month:'long'}), rok=y;
  const grid=Array.from({length:cells},(_,i)=>{ const dt=new Date(y,m-1,1-lead+i), d=kalIso(dt), inM=dt.getMonth()===m-1, wk=i%7>4;
    const E=(M[d]||[]).filter(e=>!kalOff.has(e.k)), max=3;
    return `<button type="button" class="kal-c${inM?'':' out'}${wk?' wk':''}${d===td?' today':''}${d===kalSel?' sel':''}" data-kald="${d}" aria-label="${dt.toLocaleDateString('pl-PL',{weekday:'long',day:'numeric',month:'long'})}${E.length?', '+E.length+' wydarzeń':''}">
      <span class="kal-n">${dt.getDate()}</span>${W[d]&&!kalOff.has('plat')?`<span class="kal-sum">−${kalZl(Math.round(W[d]))}</span>`:''}
      <span class="kal-ev">${E.slice(0,max).map(e=>`<span class="kal-chip k-${e.k}${e.done?' done':''}"><i></i>${e.tm?`<em>${e.tm}</em> `:''}${esc(e.n)}</span>`).join('')}${E.length>max?`<span class="kal-more">+${E.length-max} więcej</span>`:''}</span>
      ${E.length?`<span class="kal-dots" aria-hidden="true">${[...new Set(E.map(e=>e.k))].map(k=>`<i class="k-${k}"></i>`).join('')}</span>`:''}</button>`; }).join('');
  return `<div class="kal">
    <div class="kal-main">
      <div class="kal-bar"><div class="kal-nav"><button type="button" class="kal-arr" data-kalm="-1" aria-label="Poprzedni miesiąc">‹</button><h2><span>${esc(tyt)}</span> ${rok}</h2><button type="button" class="kal-arr" data-kalm="1" aria-label="Następny miesiąc">›</button>${kalM!==td.slice(0,7)?`<button type="button" class="td-btn" data-kalm="0">Dziś</button>`:''}</div>
        <div class="kal-leg">${Object.entries(KAL_KAT).map(([k,[n]])=>`<button type="button" class="kal-f k-${k}" data-kalf="${k}" aria-pressed="${!kalOff.has(k)}"><i></i>${n}</button>`).join('')}</div></div>
      <div class="kal-grid"><div class="kal-wd">${['Pon','Wt','Śr','Czw','Pt','Sob','Nd'].map(d=>`<span>${d}</span>`).join('')}</div><div class="kal-days">${grid}</div></div>
    </div>
    <aside class="kal-side" id="kalSide">${kalSideHtml()}</aside></div>`;
}
function kalSideHtml(){
  const d=kalSel, dt=new Date(d+'T12:00'), E=(kalZbierz(d,d)[d]||[]), W=kalWydane(d,d)[d]||0, td=todayISO();
  const grp=k=>E.filter(e=>e.k===k);
  const sek=(k,body)=>body?`<div class="kal-sek"><span class="label"><i class="kal-dot k-${k}"></i>${KAL_KAT[k][0]}</span>${body}</div>`:'';
  const todo=grp('todo').map(e=>`<div class="kal-it${e.done?' done':''}"><button type="button" class="td-chk sm" data-kaltodo="${esc(e.id)}" aria-pressed="${e.done}" aria-label="Zadanie zrobione"></button>${e.tm?`<span class="kal-tm">${e.tm}</span>`:''}<span>${esc(e.n)}</span>${e.imp?'<span class="kal-imp" title="Ważne">★</span>':''}</div>`).join('');
  const tren=grp('tren').map(e=>`<div class="kal-it"><b>${esc(e.n)}</b><small>${esc(e.sub||'')}${e.done?'':' · w trakcie'}</small></div>`).join('');
  const plat=grp('plat').map(e=>`<div class="kal-it"><span>${esc(e.n)}<small>${esc(e.sub||'')}</small></span>${e.kw?`<b class="${e.wpl?'plus':'minus'}">${e.wpl?'+':'−'}${kalZl(e.kw)}</b>`:''}</div>`).join('')+(W?`<div class="kal-it kal-wyd"><span>Wydane tego dnia</span><b class="minus">−${kalZl(W)}</b></div>`:'');
  return `<div class="kal-sh"><span class="label">${d===td?'Dziś':dt.toLocaleDateString('pl-PL',{weekday:'long'})}</span><h3>${dt.toLocaleDateString('pl-PL',{day:'numeric',month:'long',year:'numeric'})}</h3></div>
    ${sek('todo',todo)}${sek('tren',tren)}${sek('plat',plat)}
    ${!E.length&&!W?'<p class="kal-pusto">Nic nie zaplanowano.</p>':''}
    <form class="kal-add"><input name="t" placeholder="+ Wydarzenie / zadanie" aria-label="Nowe wydarzenie na ten dzień" autocomplete="off" maxlength="200"><input name="tm" type="time" class="kal-tmin" aria-label="Godzina (opcjonalnie)" title="Godzina (opcjonalnie)"><button type="submit">Dodaj</button></form>
    <div class="kal-links"><a href="#todo">To-Do →</a><a href="#silownia">Siłownia →</a><a href="#pieniadze">Pieniądze →</a></div>`;
}
function pKalendarz(){ return `<h1>Kalendarz</h1><div id="kalApp">${kalHtml()}</div>`; }
function kalRefresh(){ const a=$('#kalApp'); if(!a) return; const f=document.activeElement; if(f&&f.matches&&f.matches('.kal-add input')&&f.value) return; a.innerHTML=kalHtml(); }

document.addEventListener('click', e=>{
  if(!e.target.closest('#kalApp')) return;
  const c=e.target.closest('[data-kald]'); if(c){ kalSel=c.dataset.kald; if(kalSel.slice(0,7)!==kalM) kalM=kalSel.slice(0,7); kalRefresh();
    if(matchMedia('(max-width:900px)').matches){ const s=$('#kalSide'); s&&s.scrollIntoView({behavior:'smooth',block:'start'}); } return; }
  const n=e.target.closest('[data-kalm]'); if(n){ const v=+n.dataset.kalm; kalM=v?kalMies(kalM,v):todayISO().slice(0,7); if(!v) kalSel=todayISO(); return kalRefresh(); }
  const f=e.target.closest('[data-kalf]'); if(f){ const k=f.dataset.kalf; kalOff.has(k)?kalOff.delete(k):kalOff.add(k); store.set('kalOff',JSON.stringify([...kalOff])); return kalRefresh(); }
  const t=e.target.closest('[data-kaltodo]'); if(t && typeof tdSet==='function'){ const x=T.tasks.find(y=>y.id===t.dataset.kaltodo); if(x){ tdSet(x.id,{done:!x.done}); kalRefresh(); } }
});
document.addEventListener('submit', e=>{
  const f=e.target; if(!f.matches('form.kal-add')) return; e.preventDefault();
  const v=f.t.value.trim(); if(!v || typeof tdNorm!=='function') return;
  const t=tdNorm(uid('t'),{t:v, l:'zadania', due:kalSel, tm:f.tm.value||'', c:Date.now()});
  T.tasks=[t,...T.tasks]; saveTodo(); cloud(db=>db.collection('todo').doc(t.id).set(tdDoc(t)));
  f.t.value=''; f.tm.value=''; kalRefresh(); const i=$('.kal-add input'); i&&i.focus();
});
