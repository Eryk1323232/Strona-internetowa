/* ════════════════════════════════════════════════════════════════════════
   INNE → POZOSTAŁE — kafle jak w Kalkulatorach; każdy otwiera swój panel w okienku
   ════════════════════════════════════════════════════════════════════════
   POZ_KAFLE — lista kafli (dopisz nowy: klucz, nazwa, opis/licznik, ikona, treść okienka).
   Posiadówki: treść = posHtml() z js/08-posiadowki.js (odświeża się sama przez #posApp).
   Stary adres #posiadowki przenosi tutaj i od razu otwiera Posiadówki.
   ════════════════════════════════════════════════════════════════════════ */
const POZ_KAFLE = [
  {k:'posiadowki', n:'Posiadówki', opis:()=>{ const L=typeof pxList==='function'?pxList():[]; return L.length?`${L.length} ${L.length===1?'posiadówka':(L.length%10>=2&&L.length%10<=4&&(L.length%100<10||L.length%100>=20))?'posiadówki':'posiadówek'} · ostatnia: ${esc(L[0].n)}`:'rozliczenia imprez ze znajomymi'; },
   ic:'<path d="M17 6h14l-1.6 12a5.4 5.4 0 0 1-10.8 0z"/><path d="M24 24v12M17 42h14"/><path d="M18.5 12h11"/>',
   tresc:()=>`<div id="posApp">${posHtml()}</div>`, tytul:'Posiadówki', label:'Inne · pozostałe'}
];
let pozM=null;
function pPozostale(){
  return `<h1>Pozostałe</h1><div class="calc-cards" id="pozPage">${POZ_KAFLE.map(c=>`<button type="button" class="calc-card res" data-pozopen="${c.k}"><div class="calc-ic" aria-hidden="true"><svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${c.ic}</svg></div>
    <h2>${esc(c.n)}</h2><span class="calc-count">${c.opis()}</span><span class="calc-open">Otwórz →</span></button>`).join('')}</div>`;
}
function pozRender(){
  let sc=$('#pozScrim'), md=$('#pozModal'); const c=POZ_KAFLE.find(x=>x.k===pozM);
  if(!c || !$('#pozPage')){ sc&&sc.remove(); md&&md.remove(); if(pozM){ pozM=null; } document.body.classList.remove('tr-lock'); const p=$('#pozPage'); if(p) p.outerHTML=pPozostale().replace(/^<h1>Pozostałe<\/h1>/,''); return; }
  if(!md){ sc=document.createElement('div'); sc.id='pozScrim'; sc.className='tr-scrim'; document.body.appendChild(sc);
    md=document.createElement('div'); md.id='pozModal'; md.className='tr-modal tr-wide'; md.setAttribute('role','dialog'); md.setAttribute('aria-modal','true'); md.setAttribute('aria-label',c.tytul); document.body.appendChild(md); }
  document.body.classList.add('tr-lock');
  md.innerHTML=`<div class="tr-panel poz-panel"><div class="tr-top"><div><span class="label">${esc(c.label)}</span><h2>${esc(c.tytul)}</h2></div><button type="button" class="tr-x" data-pozclose="1" aria-label="Zamknij">✕</button></div>${c.tresc()}</div>`;
}
document.addEventListener('click', e=>{
  const o=e.target.closest('[data-pozopen]'); if(o){ pozM=o.dataset.pozopen; return pozRender(); }
  if(e.target.closest('[data-pozclose]') || e.target.id==='pozScrim' || e.target.id==='pozModal'){ pozM=null; return pozRender(); }
});
document.addEventListener('keydown', e=>{ if(pozM && e.key==='Escape' && !e.target.closest('input,textarea,select')){ e.stopPropagation(); pozM=null; pozRender(); } }, true);
/* stary adres #posiadowki → Pozostałe z otwartymi Posiadówkami */
function pozStaryAdres(){ if(location.hash==='#posiadowki'){ history.replaceState(null,'','#pozostale'); setTimeout(()=>{ pozM='posiadowki'; pozRender(); },0); } }
addEventListener('hashchange', pozStaryAdres); pozStaryAdres();
