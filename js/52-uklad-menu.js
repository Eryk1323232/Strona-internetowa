/* ════════════════════════════════════════════════════════════════
   MENU — układ i zwijanie (komputer, szerokość > 900 px; na telefonie zostaje wysuwane menu)
   • Układ (⚙ Ustawienia → Wygląd → „Układ menu”, store 'menuUklad'): lewo · prawo · gora
     – gora: klasyczny pasek u góry, kategorie (Studia, Gry…) jako rozwijane listy.
   • Zwinięte menu boczne (przycisk „Zwiń menu”, store 'menuMini'): same ikony.
   • Zwijane kategorie: klik w nazwę grupy w menu bocznym chowa jej podstrony (store 'menuZw' — lista nazw).
   Lista menu jest budowana przez ukNav (js/43-uklad.js); tu tylko nakładamy klasy / grupowanie, po każdej przebudowie.
   ════════════════════════════════════════════════════════════════ */
const MU_UL = document.querySelector('.navtree'), MU_MQ = matchMedia('(min-width:901px)');
let muUklad = store.get('menuUklad','lewo'), muZw = (()=>{ try{ return JSON.parse(store.get('menuZw','[]'))||[]; }catch(e){ return []; } })();
const muStrz = '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="m4 6 4 4 4-4"/></svg>';
const muGora = () => muUklad==='gora' && MU_MQ.matches;

function muGrupuj(){   /* płaska lista (li.grp + li) → li.mu-g z przyciskiem i podlistą */
  if(!MU_UL.querySelector(':scope > li.grp')) return;
  const fr=document.createDocumentFragment(); let sub=null;
  [...MU_UL.children].forEach(li=>{
    if(li.classList.contains('grp')){ const g=document.createElement('li'); g.className='mu-g';
      g.innerHTML=`<button type="button" class="mu-gb" aria-expanded="false"><span></span>${muStrz}</button><ul class="mu-sub"></ul>`;
      g.querySelector('span').textContent=li.textContent; sub=g.querySelector('ul'); fr.appendChild(g); }
    else if(sub) sub.appendChild(li); else fr.appendChild(li); });
  MU_UL.replaceChildren(fr); muAktywne();
}
function muZwin(){   /* menu boczne: chowanie podstron zwiniętych kategorii (poza bieżącą) */
  let zw=false;
  [...MU_UL.children].forEach(li=>{
    if(li.classList.contains('grp')){ zw=muZw.includes(li.textContent.trim()); li.classList.add('mu-grp'); li.classList.toggle('zw',zw); li.removeAttribute('aria-hidden'); li.setAttribute('role','button'); li.tabIndex=0; li.title=zw?'Rozwiń':'Zwiń'; }
    else li.classList.toggle('mu-ukr', zw && !li.querySelector('[aria-current]')); });
}
function muAktywne(){ MU_UL.querySelectorAll('li.mu-g').forEach(g=>g.classList.toggle('on', !!g.querySelector('[aria-current]'))); }
function muZastosuj(){
  const b=document.body; b.classList.toggle('mu-prawo', muUklad==='prawo'); b.classList.toggle('mu-gora', muUklad==='gora');
  b.classList.toggle('mu-mini', store.get('menuMini','0')==='1' && muUklad!=='gora');
  if(muGora()) muGrupuj();
  else { if(MU_UL.querySelector(':scope > li.mu-g') && typeof ukNav==='function') ukNav(); muZwin(); }
  const t=document.querySelector('.mu-tog'); if(t) t.innerHTML=b.classList.contains('mu-mini')?'<svg viewBox="0 0 16 16" aria-hidden="true"><path d="m6 4 4 4-4 4"/></svg><span>Rozwiń menu</span>':'<svg viewBox="0 0 16 16" aria-hidden="true"><path d="m10 4-4 4 4 4"/></svg><span>Zwiń menu</span>';
}
function muUstaw(v){ muUklad=v; store.set('menuUklad',v); document.querySelectorAll('.mu-g.open').forEach(g=>g.classList.remove('open')); muZastosuj(); }

/* przycisk zwijania pod menu */
const muTog=document.createElement('button'); muTog.type='button'; muTog.className='mu-tog';
(document.querySelector('.uk-navbox')||MU_UL).after(muTog);
muTog.addEventListener('click', ()=>{ store.set('menuMini', document.body.classList.contains('mu-mini')?'0':'1'); muZastosuj(); const sd=document.getElementById('side'); if(sd) sd.scrollTop=0; });

/* po każdej przebudowie listy (ukNav) i zmianie strony (aria-current) */
new MutationObserver(()=>{ if(muGora()) muGrupuj(); else if(MU_UL.querySelector(':scope > li.grp:not(.mu-grp)')) muZwin(); }).observe(MU_UL,{childList:true});
addEventListener('hashchange', ()=>setTimeout(()=>{ if(muGora()){ muAktywne(); document.querySelectorAll('.mu-g.open').forEach(g=>g.classList.remove('open')); } else muZwin(); },0));
MU_MQ.addEventListener('change', muZastosuj);

MU_UL.addEventListener('click', e=>{
  const gb=e.target.closest('.mu-gb'); if(gb){ const g=gb.parentElement, on=!g.classList.contains('open');
    MU_UL.querySelectorAll('.mu-g.open').forEach(x=>{ x.classList.remove('open'); x.querySelector('.mu-gb').setAttribute('aria-expanded','false'); });
    g.classList.toggle('open',on); gb.setAttribute('aria-expanded',on); return; }
  const gr=e.target.closest('li.mu-grp'); if(gr && !document.body.classList.contains('mu-mini')){ const n=gr.textContent.trim();
    muZw=muZw.includes(n)?muZw.filter(x=>x!==n):[...muZw,n]; store.set('menuZw',JSON.stringify(muZw)); muZwin(); }
});
MU_UL.addEventListener('keydown', e=>{ if((e.key==='Enter'||e.key===' ') && e.target.matches('li.mu-grp')){ e.preventDefault(); e.target.click(); } });
document.addEventListener('click', e=>{ if(!e.target.closest('.mu-g')) MU_UL.querySelectorAll('.mu-g.open').forEach(g=>{ g.classList.remove('open'); g.querySelector('.mu-gb').setAttribute('aria-expanded','false'); }); });
document.addEventListener('keydown', e=>{ if(e.key==='Escape') MU_UL.querySelectorAll('.mu-g.open').forEach(g=>g.classList.remove('open')); });

muZastosuj(); setTimeout(()=>{ if(muGora()) muAktywne(); else muZwin(); },0);
