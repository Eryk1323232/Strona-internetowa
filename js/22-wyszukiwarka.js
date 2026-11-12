/* ════════════════════════════════════════════════════════════════════════
   WYSZUKIWARKA (górny pasek) + boczne menu na telefonie
   ════════════════════════════════════════════════════════════════════════
   • Ctrl+K (albo „/”) — skok do wyszukiwarki. Szuka podstron z bocznego menu
     po nazwie, grupie i słowach z SZ_SLOWA (np. „trening” → Siłownia).
     Strzałki ↑↓ wybierają, Enter otwiera, Esc zamyka.
   • Szybko dodaj: ten sam pasek przyjmuje „kawa 12 zł” / „jutro 10:00 kolokwium” (js/36-szybko-dodaj.js).
   • Telefon: przyciemnienie za bocznym menu (.side-scrim) zamyka menu.
   • Jednorazowo przy pierwszym wejściu po zmianie wyglądu ustawia jasny motyw
     (wygląd „Pillio”); później działa zwykły przełącznik motywu w bocznym menu.
   ════════════════════════════════════════════════════════════════════════ */
if(!store.get('wygladPillio','')){ store.set('motyw','jasny'); store.set('wygladPillio','1'); }

const SZ_SLOWA = {
  start:'główna dom start pulpit widżety pogoda zegar szybki wydatek',
  kalendarz:'kalendarz terminy daty miesiąc plan dzień płatności',
  cv:'o mnie życiorys praca kariera pdf',
  todo:'zadania lista plan działania do zrobienia',
  notatki:'notes zapiski',
  kalkulatory:'mma mieszanki wyniki pawła moje lepiszcze asfalt sbs olej liczenie',
  dyski:'drive google linki semestr materiały',
  praca:'inżynierska badania dziennik laboratorium wyniki weryfikacja ai mma',
  wot:'world of tanks czołgi obligacje gry cele expienie free xp',
  silownia:'trening siłownia plan ćwiczenia waga serie gymrun',
  pozostale:'pozostałe posiadówki imprezy domówki rozliczenie znajomi',
  pieniadze:'finanse wydatki przychody konto oszczędności zakłady bukmacher subskrypcje kasa budżet'
};
const szK = s => String(s||'').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/ł/g,'l');
const szLista = () => { let grp=''; const L=[];
  document.querySelectorAll('.navtree > li').forEach(li=>{ if(li.classList.contains('grp')){ grp=li.textContent.trim(); return; }
    const a=li.querySelector('a'); if(!a) return; const r=a.dataset.r;
    L.push({r, n:a.textContent.trim(), g:grp||'Strona', ic:(a.querySelector('svg')||{}).outerHTML||'', k:szK([a.textContent, grp, SZ_SLOWA[r]||''].join(' '))}); });
  return L; };
let szSel=0, szWyn=[];
function szRender(){
  const inp=$('#srchIn'), pop=$('#srchPop'); if(!inp||!pop) return;
  const q=szK(inp.value.trim()), L=szLista();
  const strony=q?L.filter(x=>q.split(/\s+/).every(w=>x.k.includes(w))).sort((a,b)=>(szK(b.n).startsWith(q))-(szK(a.n).startsWith(q))):L;
  const ak=(q && typeof sdAkcje==='function' && !(typeof PODGLAD!=='undefined'&&PODGLAD))?sdAkcje(inp.value):[];   /* szybkie dodawanie (js/36-szybko-dodaj.js) */
  szWyn=[...ak.filter(a=>a.pierw), ...strony, ...ak.filter(a=>!a.pierw)];
  szSel=Math.min(szSel, Math.max(0,szWyn.length-1));
  pop.innerHTML=szWyn.length?szWyn.map((x,i)=>`<a href="#${esc(x.r||'')}" class="srch-it${x.run?' srch-ak':''}${i===szSel?' on':''}" role="option" aria-selected="${i===szSel}" data-i="${i}">${x.ic}<span>${x.run?'<b>+</b> ':''}${esc(x.n)}</span><small>${esc(x.g)}</small></a>`).join('')+(q?'':`<p class="srch-tip">Możesz też wpisać np. <b>kawa 12 zł</b> albo <b>jutro 10:00 kolokwium</b> — dodam wydatek lub zadanie.</p>`)
    :`<p class="srch-none">Nic nie znaleziono</p>`;
  pop.hidden=false;
}
const szZamknij = () => { const p=$('#srchPop'); if(p) p.hidden=true; };
let szOkT=null;
const szIdz = i => { const x=szWyn[i]; if(!x) return;
  if(x.run){ const inp=$('#srchIn'), pop=$('#srchPop'); let msg=''; try{ msg=x.run()||'Dodano'; }catch(e){ console.warn(e); msg='Nie udało się dodać'; }
    inp.value=''; szWyn=[]; pop.innerHTML=`<p class="srch-ok" role="status">✓ ${esc(msg)}</p>`; pop.hidden=false;
    if(typeof homeRefresh==='function') homeRefresh(); if(typeof kalRefresh==='function' && document.getElementById('kalApp')) kalRefresh();
    clearTimeout(szOkT); szOkT=setTimeout(()=>{ if(!inp.value && document.activeElement!==inp) szZamknij(); else if(!inp.value) szRender(); }, 2600); return; }
  location.hash='#'+x.r; const inp=$('#srchIn'); inp.value=''; inp.blur(); szZamknij(); };
document.addEventListener('focusin', e=>{ if(e.target.id==='srchIn'){ szSel=0; szRender(); } });
document.addEventListener('input', e=>{ if(e.target.id==='srchIn'){ clearTimeout(szOkT); szSel=0; szRender(); } });
document.addEventListener('keydown', e=>{
  const inp=$('#srchIn'); if(!inp) return;
  const typing=/^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement&&document.activeElement.tagName)||(document.activeElement&&document.activeElement.isContentEditable);
  if(((e.ctrlKey||e.metaKey) && e.key.toLowerCase()==='k') || (e.key==='/' && !typing)){ e.preventDefault(); inp.focus(); inp.select(); return; }
  if(e.target!==inp) return;
  if(e.key==='ArrowDown'||e.key==='ArrowUp'){ e.preventDefault(); if(!szWyn.length) return; szSel=(szSel+(e.key==='ArrowDown'?1:-1)+szWyn.length)%szWyn.length; szRender();
    const on=$('#srchPop .srch-it.on'); on&&on.scrollIntoView({block:'nearest'}); }
  else if(e.key==='Enter'){ e.preventDefault(); szIdz(szSel); }
  else if(e.key==='Escape'){ e.stopPropagation(); inp.value=''; inp.blur(); szZamknij(); }
});
document.addEventListener('mousedown', e=>{ const it=e.target.closest('.srch-it'); if(it){ e.preventDefault(); szIdz(+it.dataset.i); return; } if(!e.target.closest('.srch')) szZamknij(); });
document.addEventListener('click', e=>{ if(e.target.closest('.side-scrim')){ const b=$('#menuBtn'); if(b && $('#side').classList.contains('open')) b.click(); } });
/* skrót klawiszowy: na Macu ⌘K */
(()=>{ const k=document.querySelector('.srch-k'); if(k && /Mac|iPhone|iPad/.test(navigator.platform||'')) k.textContent='⌘ K'; })();
