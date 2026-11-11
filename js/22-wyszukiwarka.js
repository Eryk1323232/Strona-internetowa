/* ════════════════════════════════════════════════════════════════════════
   WYSZUKIWARKA (górny pasek) + boczne menu na telefonie
   ════════════════════════════════════════════════════════════════════════
   • Ctrl+K (albo „/”) — skok do wyszukiwarki. Szuka podstron z bocznego menu
     po nazwie, grupie i słowach z SZ_SLOWA (np. „trening” → Siłownia).
     Strzałki ↑↓ wybierają, Enter otwiera, Esc zamyka.
   • Telefon: przyciemnienie za bocznym menu (.side-scrim) zamyka menu.
   • Jednorazowo przy pierwszym wejściu po zmianie wyglądu ustawia jasny motyw
     (wygląd „Pillio”); później działa zwykły przełącznik motywu w bocznym menu.
   ════════════════════════════════════════════════════════════════════════ */
if(!store.get('wygladPillio','')){ store.set('motyw','jasny'); store.set('wygladPillio','1'); }

const SZ_SLOWA = {
  start:'główna dom start pulpit widżety pogoda zegar szybki wydatek',
  cv:'o mnie życiorys praca kariera pdf',
  todo:'zadania lista plan działania do zrobienia',
  notatki:'notes zapiski',
  kalkulatory:'mma mieszanki wyniki pawła moje lepiszcze asfalt sbs olej liczenie',
  dyski:'drive google linki semestr materiały',
  praca:'inżynierska badania dziennik laboratorium wyniki weryfikacja ai mma',
  wot:'world of tanks czołgi obligacje gry cele expienie free xp',
  fs25:'farming simulator farma gry',
  silownia:'trening siłownia plan ćwiczenia waga serie gymrun',
  posiadowki:'imprezy domówki rozliczenie znajomi',
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
  szWyn=q?L.filter(x=>q.split(/\s+/).every(w=>x.k.includes(w))).sort((a,b)=>(szK(b.n).startsWith(q))-(szK(a.n).startsWith(q))):L;
  szSel=Math.min(szSel, Math.max(0,szWyn.length-1));
  pop.innerHTML=szWyn.length?szWyn.map((x,i)=>`<a href="#${esc(x.r)}" class="srch-it${i===szSel?' on':''}" role="option" aria-selected="${i===szSel}" data-i="${i}">${x.ic}<span>${esc(x.n)}</span><small>${esc(x.g)}</small></a>`).join('')
    :`<p class="srch-none">Nic nie znaleziono</p>`;
  pop.hidden=false;
}
const szZamknij = () => { const p=$('#srchPop'); if(p) p.hidden=true; };
const szIdz = i => { const x=szWyn[i]; if(!x) return; location.hash='#'+x.r; const inp=$('#srchIn'); inp.value=''; inp.blur(); szZamknij(); };
document.addEventListener('focusin', e=>{ if(e.target.id==='srchIn'){ szSel=0; szRender(); } });
document.addEventListener('input', e=>{ if(e.target.id==='srchIn'){ szSel=0; szRender(); } });
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
