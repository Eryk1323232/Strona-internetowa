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
  'kalendarz':{title:'Kalendarz', parent:null, render:pKalendarz},
  'cv':      {title:'CV', parent:'o-mnie', render:pCV},
  'wot':     {title:'World of Tanks', parent:'gry', render:pWot},
  'silownia':{title:'Siłownia', parent:'inne', render:pGym},
  'pozostale':{title:'Pozostałe', parent:'inne', render:pPozostale},   /* Posiadówki są tu w okienku (js/29-pozostale.js) */
  'pieniadze':{title:'Pieniądze', parent:'inne', render:pPieniadze},
  'todo':    {title:'To-Do', parent:'studia', render:pTodo},
  'notatki': {title:'Notatki', parent:'studia', render:pNotes},
  'kalkulatory':{title:'Kalkulatory', parent:'studia', render:pCalcs},
  'dyski':   {title:'Dyski', parent:'studia', render:pDiski},
  'praca':   {title:'Praca', parent:'studia', render:pPraca},
  'widzet':  {title:'Widżet', parent:null, render:pWidzet},   /* tryb widżetu na pulpit: ./?widzet=1 (js/39-widzet.js) */
};

/* ——— router ——— */
let wotTab = store.get('wotTab','przep'); if(wotTab==='bast') wotTab='tryby';   /* Ostatni Bastion jest teraz w Trybach */
function render(){
  let key=(location.hash||'#'+store.get('startStrona','start')).slice(1);   /* strona po otwarciu: Ustawienia → Ogólne */
  const RD0={'o-mnie':1,'studia':1,'gry':1,'inne':1,'subskrypcje':1};
  /* Subskrypcje są teraz okienkiem w Pieniądzach — stary adres otwiera to okienko */
  if(key==='subskrypcje'){ history.replaceState(null,'','#pieniadze'); key='pieniadze'; setTimeout(()=>{ sbM=true; sbRender(); },0); }
  if(!ROUTES[key] && !RD0[key]) key='start';
  /* stare adresy działów (#gry itd.) przekierowują na pierwszą podstronę */
  const RD={'o-mnie':'cv','studia':'todo','gry':'wot','inne':'silownia'}; if(RD[key]){ history.replaceState(null,'','#'+RD[key]); key=RD[key]; }
  document.body.classList.toggle('is-home', key==='start');   /* strona główna: ciemny baner na całą szerokość */
  $('#page').innerHTML=ROUTES[key].render();
  if(key!==render.ost){ const pg=$('#page'); pg.classList.remove('page-in'); void pg.offsetWidth; pg.classList.add('page-in'); render.ost=key; }   /* płynne wejście nowej podstrony */
  if(key==='start') tickClock();
  document.querySelectorAll('.navtree a').forEach(a=>{
    const r=a.dataset.r; a.toggleAttribute('aria-current',false);
    if(r===key) a.setAttribute('aria-current','page');
    else if(ROUTES[key].parent===r) a.setAttribute('aria-current','page');
  });
  $('#side').classList.remove('open'); $('#menuBtn').setAttribute('aria-expanded','false'); document.body.classList.remove('side-open');
  if(key==='wot') setWotTab(wotTab);
  if(key==='todo') $('#tdSync').textContent=syncText();
  if(key!=='todo') tdRenaming=false;
  tdDrawerRender();
  if(key==='notatki') ntGrow(); else { ntFlush(); ntSel=''; }
  if(key!=='silownia' && trM){ trM=null; trRender(); }
  if(key!=='praca' && mxM){ mxM=null; mxRender(); }   /* Wyniki Pawła / moje są w Pracy */
  if(key!=='pozostale' && pozM){ pozM=null; pozRender(); }
  if(key!=='dyski' && dkM){ dkM=null; dkRender(); }
  if(key!=='pieniadze' && bkM){ bkM=false; bkRender(); }
  if(key!=='pieniadze' && finM){ finM=false; finRender(); }
  if(key!=='pieniadze' && sbM){ sbM=false; sbRender(); }
  if(mmaM){ mmaM=false; mmaRender(); }
  if(key!=='wot' && tyM){ tyM=null; tyRender(); }   /* okienko trybu WoT */
  window.scrollTo(0,0);
}
function setWotTab(k){
  if(!WOT_TABS.some(t=>t[0]===k)) k='przep';
  wotTab=k; store.set('wotTab',k);
  document.querySelectorAll('.tabs button').forEach(b=>b.setAttribute('aria-selected',b.dataset.tab===k));
  $('#wotPanel').innerHTML=wotPanel(k);
  if(k==='moe'){ moeCalc(); document.querySelectorAll('.calc input, .calc select').forEach(i=>i.addEventListener('input',moeCalc)); }
}
document.addEventListener('click',e=>{ const b=e.target.closest('.tabs button'); if(b) setWotTab(b.dataset.tab); });
$('#menuBtn').addEventListener('click',()=>{ const o=$('#side').classList.toggle('open'); $('#menuBtn').setAttribute('aria-expanded',o); document.body.classList.toggle('side-open',o); });

/* motyw */
function applyTheme(t){ const r=document.documentElement; if(t==='jasny') r.setAttribute('data-theme','light'); else if(t==='ciemny') r.setAttribute('data-theme','dark'); else r.removeAttribute('data-theme'); document.querySelectorAll('.theme-seg').forEach(seg=>{ seg.dataset.pos=['jasny','auto','ciemny'].indexOf(t); seg.querySelectorAll('button').forEach(b=>b.setAttribute('aria-pressed', b.dataset.th===t)); }); }
let theme=store.get('motyw','jasny'); applyTheme(theme);   /* wygląd „Pillio”: domyślnie jasny (zmiana na jasny raz — js/22-wyszukiwarka.js) */
document.querySelectorAll('.theme-seg button').forEach(b=>b.addEventListener('click',()=>{ theme=b.dataset.th; store.set('motyw',theme); applyTheme(theme); }));


window.addEventListener('hashchange',render);
render();
