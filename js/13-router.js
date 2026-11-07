/* ════════════════════════════════════════════════════════════════════════
   ROUTER, MENU I MOTYW — ładuje się na końcu
   ════════════════════════════════════════════════════════════════════════
   ROUTES   – lista podstron. DODANIE NOWEJ PODSTRONY:
              1) w index.html dopisz link w <nav>: <li><a href="#nazwa" data-r="nazwa">Nazwa</a></li>
              2) tutaj dopisz w ROUTES:  'nazwa': {title:'Nazwa', parent:'inne', render:pNazwa},
              3) w dowolnym pliku js napisz funkcję pNazwa(), która zwraca HTML strony
                 (np. `<h1>Nazwa</h1>...`) i dołącz ten plik w index.html PRZED 13-router.js.
   render() – czyta adres po # i rysuje odpowiednią stronę.
   Na końcu: przełącznik motywu (jasny / systemowy / ciemny) i obsługa list rozwijanych.
   ════════════════════════════════════════════════════════════════════════ */

const ROUTES = {
  /* klucz (adres po #) : tytuł, dział nadrzędny (do podświetlenia w menu), funkcja rysująca stronę */
  'start':   {title:'Strona główna', parent:null, render:pStart},
  'cv':      {title:'CV', parent:'o-mnie', render:pCV},
  'wot':     {title:'World of Tanks', parent:'gry', render:pWot},
  'fs25':    {title:'Farming Simulator 25', parent:'gry', render:pFs},
  'silownia':{title:'Siłownia', parent:'inne', render:pGym},
  'posiadowki':{title:'Posiadówki', parent:'inne', render:pPos},
  'subskrypcje':{title:'Subskrypcje', parent:'inne', render:pSub},
  'todo':    {title:'To-Do', parent:'studia', render:pTodo},
  'notatki': {title:'Notatki', parent:'studia', render:pNotes},
  'kalkulatory':{title:'Kalkulatory', parent:'studia', render:pCalcs},
  'dyski':   {title:'Dyski', parent:'studia', render:pDiski},
};

/* ——— router ——— */
let wotTab = store.get('wotTab','przep');
function render(){
  let key=(location.hash||'#start').slice(1);
  const RD0={'o-mnie':1,'studia':1,'gry':1,'inne':1};
  if(!ROUTES[key] && !RD0[key]) key='start';
  /* stare adresy działów (#gry itd.) przekierowują na pierwszą podstronę */
  const RD={'o-mnie':'cv','studia':'todo','gry':'wot','inne':'silownia'}; if(RD[key]){ history.replaceState(null,'','#'+RD[key]); key=RD[key]; }
  zapamiętajWizytę(key);
  $('#page').innerHTML=ROUTES[key].render();
  if(key==='start') tickClock();
  document.querySelectorAll('.navtree a').forEach(a=>{
    const r=a.dataset.r; a.toggleAttribute('aria-current',false);
    if(r===key) a.setAttribute('aria-current','page');
    else if(ROUTES[key].parent===r) a.setAttribute('aria-current','page');
  });
  document.querySelectorAll('li.dd').forEach(li=>li.classList.toggle('cur', !!li.querySelector('[aria-current]')));
  closeDD && closeDD();
  $('#side').classList.remove('open'); $('#menuBtn').setAttribute('aria-expanded','false'); $('#menuBtn').textContent='Menu';
  if(key==='wot') setWotTab(wotTab);
  if(key==='todo') $('#tdSync').textContent=syncText();
  if(key!=='todo') tdRenaming=false;
  tdDrawerRender();
  if(key==='notatki') ntGrow(); else { ntFlush(); ntSel=''; }
  if(key!=='silownia' && trM){ trM=null; trRender(); }
  if(key!=='kalkulatory' && mxM){ mxM=null; mxRender(); }
  if(key!=='dyski' && dkM){ dkM=null; dkRender(); }
  window.scrollTo(0,0);
}
/* lista 3 ostatnio odwiedzanych podstron (dla kafli na stronie głównej) */
function zapamiętajWizytę(key){
  if(key==='start' || !ROUTES[key]) return;
  let L=[]; try{ L=JSON.parse(store.get('recentPages','[]'))||[]; }catch(e){}
  L=[{k:key, t:Date.now()}, ...L.filter(x=>x.k!==key)].slice(0,6);
  store.set('recentPages', JSON.stringify(L));
}
function setWotTab(k){
  if(!WOT_TABS.some(t=>t[0]===k)) k='przep';
  wotTab=k; store.set('wotTab',k);
  document.querySelectorAll('.tabs button').forEach(b=>b.setAttribute('aria-selected',b.dataset.tab===k));
  $('#wotPanel').innerHTML=wotPanel(k);
  if(k==='moe'){ moeCalc(); document.querySelectorAll('.calc input, .calc select').forEach(i=>i.addEventListener('input',moeCalc)); }
}
document.addEventListener('click',e=>{ const b=e.target.closest('.tabs button'); if(b) setWotTab(b.dataset.tab); });
$('#menuBtn').addEventListener('click',()=>{ const o=$('#side').classList.toggle('open'); $('#menuBtn').setAttribute('aria-expanded',o); $('#menuBtn').textContent=o?'Zamknij':'Menu'; });

/* motyw */
const THEMES=['auto','jasny','ciemny'];
function applyTheme(t){ const r=document.documentElement; if(t==='jasny') r.setAttribute('data-theme','light'); else if(t==='ciemny') r.setAttribute('data-theme','dark'); else r.removeAttribute('data-theme'); const seg=$('.theme-seg'); seg.dataset.pos=['jasny','auto','ciemny'].indexOf(t); seg.querySelectorAll('button').forEach(b=>b.setAttribute('aria-pressed', b.dataset.th===t)); }
let theme=store.get('theme','jasny'); applyTheme(theme);
document.querySelectorAll('.theme-seg button').forEach(b=>b.addEventListener('click',()=>{ theme=b.dataset.th; store.set('theme',theme); applyTheme(theme); }));
/* rozwijane menu */
const closeDD = () => document.querySelectorAll('li.dd.open').forEach(li=>{ li.classList.remove('open'); li.querySelector('.dd-btn').setAttribute('aria-expanded','false'); });
document.addEventListener('click', e=>{
  const b=e.target.closest('.dd-btn');
  if(b){ const li=b.closest('li.dd'), o=!li.classList.contains('open'); closeDD(); li.classList.remove('shut'); if(o){ li.classList.add('open'); b.setAttribute('aria-expanded','true'); } return; }
  const a=e.target.closest('.navtree a');
  if(a){ const li=a.closest('li.dd'); closeDD(); if(li){ li.classList.add('shut'); a.blur(); } return; }
  if(!e.target.closest('li.dd')) closeDD();
});
document.querySelectorAll('li.dd').forEach(li=>{ li.addEventListener('mouseleave',()=>li.classList.remove('shut')); li.addEventListener('mouseenter',()=>{ document.querySelectorAll('li.dd.open').forEach(o=>{ if(o!==li){ o.classList.remove('open'); o.querySelector('.dd-btn').setAttribute('aria-expanded','false'); } }); if(document.activeElement && document.activeElement.closest && document.activeElement.closest('li.dd')!==li && document.activeElement.closest('li.dd')) document.activeElement.blur(); }); });
document.addEventListener('keydown', e=>{ if(e.key==='Escape') closeDD(); });

window.addEventListener('hashchange',render);
render();
