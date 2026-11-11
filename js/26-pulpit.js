/* ════════════════════════════════════════════════════════════════════════
   PULPIT — strona główna: konkretne rzeczy na dziś z całej strony
   ════════════════════════════════════════════════════════════════════════
   homeDash() wstawia pStart (js/03). Karty:
     • Na dziś      — zadania z „Mojego dnia” i z terminem dziś/zaległym (odhaczanie, szybkie dodanie)
     • Trening      — trening w trakcie albo następny dzień planu (przycisk start otwiera okienko treningu)
     • Najbliższe   — 14 dni z kalendarza (zadania, płatności, subskrypcje) → #kalendarz
     • Cele WoT     — postęp celów na bieżący miesiąc (odhaczanie)
   Odświeżenie po zmianie: homeRefresh() (podmienia #homeDash).
   ════════════════════════════════════════════════════════════════════════ */
const hdIle = (n,a,b,c) => n===1?a:(n%10>=2&&n%10<=4&&(n%100<10||n%100>=20))?b:c;
const hdDni = d => { const x=Math.round((new Date(d+'T12:00')-new Date(todayISO()+'T12:00'))/864e5); return x===0?'dziś':x===1?'jutro':x===-1?'wczoraj':x<0?`${-x} dni temu`:`za ${x} dni`; };

function hdTodo(){
  if(typeof T!=='object') return '';
  const td=todayISO(), L=T.tasks.filter(t=>!t.done && (t.myDay===td || (t.due && t.due<=td))).sort((a,b)=>(a.due||'9999').localeCompare(b.due||'9999')||(a.tm||'99').localeCompare(b.tm||'99')||b.c-a.c);
  const zr=T.tasks.filter(t=>t.done && (t.myDay===td || t.due===td)).length;
  return `<article class="widget hd-card hd-todo"><div class="w-head"><span class="label">Na dziś</span><a class="w-sub hd-go" href="#todo">To-Do →</a></div>
    <div class="hd-big"><b>${L.length}</b><span>${L.length?hdIle(L.length,'zadanie do zrobienia','zadania do zrobienia','zadań do zrobienia'):'wszystko zrobione'}${zr?` · ${zr} ${hdIle(zr,'zrobione','zrobione','zrobionych')}`:''}</span></div>
    ${L.length?`<ul class="hd-list">${L.slice(0,6).map(t=>`<li><button type="button" class="td-chk sm" data-hdtodo="${esc(t.id)}" aria-pressed="false" aria-label="Zrobione"></button>${t.tm&&t.due===td?`<span class="hd-tm">${t.tm}</span>`:''}<span class="hd-t">${esc(t.t)}</span>${t.due&&t.due<td?`<span class="hd-late">${hdDni(t.due)}</span>`:t.imp?'<span class="hd-imp">★</span>':''}</li>`).join('')}${L.length>6?`<li class="hd-more"><a href="#todo">+${L.length-6} więcej</a></li>`:''}</ul>`:''}
    <form class="hd-add"><input name="t" placeholder="+ Dodaj na dziś" aria-label="Nowe zadanie na dziś" autocomplete="off" maxlength="200"></form></article>`;
}
function hdTrening(){
  if(typeof PL==='undefined') return '';
  const o=typeof trOpen==='function'?trOpen():null, last=typeof trAll==='function'?trAll()[0]:null;
  const p=(last&&PL.find(x=>x.id===last.pid))||PL[0];
  const tydz=TR.filter(t=>{ const d=new Date(t.d+'T12:00'), n=new Date(); const pon=new Date(n); pon.setHours(0,0,0,0); pon.setDate(n.getDate()-(n.getDay()+6)%7); return d>=pon; }).length;
  let body;
  if(o){ body=`<div class="hd-tr"><span class="hd-live">W trakcie</span><b>${esc(o.dn||'Trening')}</b><span class="w-sub">${esc(o.pn)} · zrobione serie: ${trSetsDone(o)}</span></div>
      <button type="button" class="hd-btn" data-hdtr="${esc(o.id)}">▶ Kontynuuj trening</button>`; }
  else if(p && p.days.length){ const did=trNext(p), d=p.days.find(x=>x.id===did);
    body=`<div class="hd-tr"><span class="label">Następny · ${esc(p.n)}</span><b>${esc(d.n||'Trening')}</b><span class="w-sub">${d.ex.length} ${hdIle(d.ex.length,'ćwiczenie','ćwiczenia','ćwiczeń')}${d.ex.length?' · '+esc(d.ex.slice(0,3).map(e=>e.n).join(', '))+(d.ex.length>3?'…':''):''}</span></div>
      <button type="button" class="hd-btn" data-hdstart="${esc(p.id)}|${esc(did)}">▶ Rozpocznij ${esc(d.n||'trening')}</button>`; }
  else body=`<p class="w-sub">Brak planu treningowego — dodaj go w Siłowni.</p>`;
  return `<article class="widget hd-card hd-trening"><div class="w-head"><span class="label">Trening</span><a class="w-sub hd-go" href="#silownia">Siłownia →</a></div>
    ${body}
    <div class="hd-foot"><span>${last?`Ostatnio: <b>${esc(last.dn)}</b> · ${hdDni(last.d)}`:'Jeszcze bez treningów'}</span><span>${tydz} w tym tyg.</span></div></article>`;
}
function hdNajblizsze(){
  if(typeof kalZbierz!=='function') return '';
  const od=isoAdd(todayISO(),1), doI=isoAdd(todayISO(),14), M=kalZbierz(od,doI);
  const L=Object.entries(M).sort((a,b)=>a[0].localeCompare(b[0])).flatMap(([d,E])=>E.filter(e=>!e.done && e.k!=='tren' && e.k!=='bad').map(e=>({d,...e})));
  return `<article class="widget hd-card hd-next"><div class="w-head"><span class="label">Najbliższe 2 tygodnie</span><a class="w-sub hd-go" href="#kalendarz">Kalendarz →</a></div>
    ${L.length?`<ul class="hd-list hd-ev">${L.slice(0,7).map(e=>`<li class="k-${e.k}"><span class="hd-date"><b>${new Date(e.d+'T12:00').getDate()}</b><small>${new Date(e.d+'T12:00').toLocaleDateString('pl-PL',{weekday:'short'})}</small></span><span class="hd-t"><i class="kal-dot"></i>${esc(e.n)}<small>${hdDni(e.d)}${e.tm?', '+e.tm:''}${e.sub?' · '+esc(e.sub):''}</small></span>${e.kw?`<b class="${e.wpl?'plus':'minus'}">${e.wpl?'+':'−'}${fmt(e.kw,Number.isInteger(e.kw)?0:2)} zł</b>`:''}</li>`).join('')}</ul>${L.length>7?`<a class="hd-more" href="#kalendarz">+${L.length-7} więcej w kalendarzu</a>`:''}`
      :`<p class="w-sub">Nic nie zaplanowano. Terminy zadań, opłaty stałe i subskrypcje pojawią się tutaj.</p>`}</article>`;
}
function hdCele(){
  if(typeof WC==='undefined') return '';
  const m=todayISO().slice(0,7), L=WC.filter(x=>x.o===m).sort((a,b)=>a.done-b.done||a.c-b.c), z=L.filter(x=>x.done).length, pct=L.length?Math.round(z/L.length*100):0;
  return `<article class="widget hd-card hd-cele"><div class="w-head"><span class="label">Cele WoT · ${new Date(m+'-01T12:00').toLocaleDateString('pl-PL',{month:'long'})}</span><a class="w-sub hd-go" href="#wot" data-hdwot="1">Cele →</a></div>
    <div class="hd-big"><b>${z}<small> / ${L.length}</small></b><span>${L.length?pct+' %':'brak celów na ten miesiąc'}</span></div>
    <div class="wc-prog" aria-hidden="true"><i style="width:${pct}%"></i></div>
    ${L.length?`<ul class="hd-list">${L.slice(0,4).map(x=>`<li class="${x.done?'done':''}"><button type="button" class="td-chk sm" data-hdcel="${esc(x.id)}" aria-pressed="${x.done}" aria-label="Cel zrobiony"></button><span class="hd-t">${esc(x.t)}</span></li>`).join('')}</ul>`:''}</article>`;
}
function homeDash(){ return `<section class="hd-grid" id="homeDash">${hdTodo()}${hdTrening()}${hdNajblizsze()}</section>`; }
function homeRefresh(){ const h=$('#homeDash'); if(h) h.innerHTML=hdTodo()+hdTrening()+hdNajblizsze(); const c=$('#hdCele'); if(c) c.outerHTML=hdCeleWrap(); }
const hdCeleWrap = () => `<div id="hdCele">${hdCele()}</div>`;

/* otwiera okienko treningu po przejściu do Siłowni */
function hdOtworzTrening(m){ const go=()=>setTimeout(()=>{ if(typeof trRender!=='function') return; trM=m; trRender(); },30);
  if(location.hash==='#silownia') go(); else { addEventListener('hashchange', go, {once:true}); location.hash='#silownia'; } }

document.addEventListener('click', e=>{
  if(!e.target.closest('.home-dash,#homeDash,#hdCele')) return;
  const t=e.target.closest('[data-hdtodo]'); if(t && typeof tdSet==='function'){ tdSet(t.dataset.hdtodo,{done:true}); return homeRefresh(); }
  const c=e.target.closest('[data-hdcel]'); if(c && typeof wcSet==='function'){ const x=WC.find(y=>y.id===c.dataset.hdcel); if(x) wcSet(x.id,{done:!x.done}); return homeRefresh(); }
  const s=e.target.closest('[data-hdstart]'); if(s){ const [pid,did]=s.dataset.hdstart.split('|'); return hdOtworzTrening({mode:'log', pid, did, d:todayISO(), tid:trOpenId(pid,did,todayISO())}); }
  const o=e.target.closest('[data-hdtr]'); if(o){ const x=TR.find(y=>y.id===o.dataset.hdtr); if(x) return hdOtworzTrening({mode:'log', pid:x.pid, did:x.did, d:x.d, tid:x.id}); }
  const w=e.target.closest('[data-hdwot]'); if(w){ store.set('wotTab','cele'); if(typeof wotTab!=='undefined') wotTab='cele'; }
});
document.addEventListener('submit', e=>{
  const f=e.target; if(!f.matches('form.hd-add')) return; e.preventDefault();
  const v=f.t.value.trim(); if(!v || typeof tdNorm!=='function') return;
  const t=tdNorm(uid('t'),{t:v, l:'zadania', myDay:todayISO(), c:Date.now()});
  T.tasks=[t,...T.tasks]; saveTodo(); cloud(db=>db.collection('todo').doc(t.id).set(tdDoc(t)));
  homeRefresh(); const i=$('form.hd-add input'); i&&i.focus();
});
