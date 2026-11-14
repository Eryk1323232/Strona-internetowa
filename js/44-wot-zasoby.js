/* ════════════════════════════════════════════════════════════════
   WORLD OF TANKS → panel zasobów obok tytułu strony
   ════════════════════════════════════════════════════════════════
   Kredyty, złoto, wolne XP i obligacje — pobierane z Wargaming API przez projekt
   Apps Script „WoT Garaż” (co godzinę + przy „Odśwież” w zakładce Garaż) i zapisywane
   w Arkuszu, w zakładce „Garaż_konto” (jeden wiersz, id = konto).
   Strona tylko czyta (js/12-synchronizacja.js → gkZChmury). Ostatni stan jest w przeglądarce
   (store 'wotKonto'), więc panel widać też bez sieci.

   KONTO PREMIUM: Wargaming API zwraca tylko stary typ premium (sprzed 2019), więc datę
   końca obecnego „WoT Premium” wpisuje się ręcznie — klik w kafelek „Premium”.
   Zapis: przeglądarka ('gkPremium') + chmura (kolekcja cfg, dokument 'wotPremium', pole d = 'RRRR-MM-DD').
   Data wpisana ręcznie ma pierwszeństwo przed API.

   Panel wstawia się sam po tytule strony World of Tanks (#page > h1) — obserwator zmian
   w #page, bez zmian w js/04-world-of-tanks.js. Na szerokim ekranie stoi w jednej linii
   z tytułem (po prawej), na węższym — pod tytułem.
   ════════════════════════════════════════════════════════════════ */
let GK = null;
try{ GK = JSON.parse(store.get('wotKonto','null')); }catch(e){ GK = null; }
let gkPremRecz = store.get('gkPremium','');   /* 'RRRR-MM-DD' albo '' */
let gkPremEdycja = false;

const GK_IKONY = {
  kr:'<circle cx="12" cy="12" r="8"/><path d="M14.8 9.2A3.6 3.6 0 0 0 12 8a4 4 0 0 0 0 8 3.6 3.6 0 0 0 2.8-1.2"/>',
  zl:'<path d="M5 15h14l-2.2-6H7.2z"/><path d="M8 9l1.2-3h5.6L16 9"/><path d="M4 18h16"/>',
  xp:'<path d="m12 4 2.4 4.9 5.4.8-3.9 3.8.9 5.4L12 16.4 7.2 18.9l.9-5.4-3.9-3.8 5.4-.8z"/>',
  ob:'<path d="M12 3.5 19 7.5v9l-7 4-7-4v-9z"/><path d="m9.2 12 2 2 3.8-4"/>',
  pr:'<path d="m4 8 4 4 4-6 4 6 4-4-1.6 10H5.6z"/><path d="M6 20h12"/>'
};
const gkIk = k => `<svg viewBox="0 0 24 24" aria-hidden="true">${GK_IKONY[k]}</svg>`;
const gkNum = v => { if(v===''||v===null||v===undefined) return null; const n=Number(v); return isFinite(n)?n:null; };
const gkKrotko = n => n>=1e6 ? (Math.floor(n/1e4)/100).toFixed(2).replace('.',',')+' mln' : fmt(n,0);
const gkDni = n => n===1 ? '1 dzień' : `${fmt(n,0)} dni`;

/* koniec premium: ręczna data → inaczej API (jeśli aktywne) → null */
function gkPremium(){
  if(/^\d{4}-\d{2}-\d{2}$/.test(gkPremRecz)) return {d:new Date(gkPremRecz+'T23:59:59'), recz:true, txt:gkPremRecz};
  const pd=String((GK&&GK['Premium do'])||''), d=pd?new Date(pd.replace(' ','T')):null;
  if(GK && GK['Premium']==='TAK' && d && !isNaN(d)) return {d, recz:false, txt:pd.slice(0,10)};
  return null;
}

function gkHtml(){
  if(!GK) return '';
  const kr=gkNum(GK['Kredyty']), zl=gkNum(GK['Złoto']), xp=gkNum(GK['Wolne XP']), ob=gkNum(GK['Obligacje']);
  if(kr===null && zl===null && xp===null) return '';
  const it=(k,l,v,t)=>`<div class="gk-it gk-${k}" title="${esc(t)}">${gkIk(k)}<span class="gk-t"><b>${v}</b><span class="gk-l">${l}</span></span></div>`;

  const p=gkPremium();
  let premV='brak', premL='Premium', premCl='', premT='Konto premium: kliknij, żeby wpisać datę końca';
  if(p){
    const dni=Math.ceil((p.d-Date.now())/86400000), dm=p.txt.slice(8,10)+'.'+p.txt.slice(5,7)+'.'+p.txt.slice(0,4);
    if(dni<0){ premV='wygasło'; premCl=' gk-uwaga'; }
    else { premV=dni===0?'dziś koniec':gkDni(dni); premL=`Premium do ${dm}`; if(dni<=3) premCl=' gk-uwaga'; }
    premT=`Konto premium do ${dm}${p.recz?' (data wpisana ręcznie)':''} — kliknij, żeby zmienić`;
  } else premCl=' gk-brak';
  const prem = `<button type="button" class="gk-it gk-pr${premCl}" data-gkprem title="${esc(premT)}" aria-expanded="${gkPremEdycja}">${gkIk('pr')}<span class="gk-t"><b>${premV}</b><span class="gk-l">${premL}</span></span></button>`;
  const pop = gkPremEdycja ? `<form class="gk-pop" autocomplete="off"><label><span>Koniec konta premium</span>
      <input type="date" name="d" value="${esc(/^\d{4}-\d{2}-\d{2}$/.test(gkPremRecz)?gkPremRecz:'')}"></label>
      <div class="gk-pop-b"><button type="submit" class="gk-pop-ok">Zapisz</button>${gkPremRecz?'<button type="button" class="gk-pop-x" data-gkpremx>Usuń datę</button>':''}<button type="button" class="gk-pop-x" data-gkpremz>Anuluj</button></div>
      <small>API Wargaming nie podaje obecnego „WoT Premium”, dlatego datę wpisujesz raz sam.</small></form>` : '';

  return `<div class="gk" id="gkPanel" role="group" aria-label="Zasoby konta World of Tanks${GK['Aktualizacja']?' (stan z '+esc(GK['Aktualizacja'])+')':''}">
    ${kr!==null?it('kr','Kredyty',gkKrotko(kr),`Kredyty: ${fmt(kr,0)} · stan z ${GK['Aktualizacja']||'—'}`):''}
    ${zl!==null?it('zl','Złoto',fmt(zl,0),`Złoto: ${fmt(zl,0)}`):''}
    ${xp!==null?it('xp','Wolne XP',fmt(xp,0),`Wolne doświadczenie: ${fmt(xp,0)}`):''}
    ${ob!==null?it('ob','Obligacje',fmt(ob,0),`Obligacje: ${fmt(ob,0)}`):''}
    ${prem}${pop}</div>`;
}

/* wstawienie / podmiana panelu po tytule strony WoT */
function gkWstaw(){
  const h=$('#page > h1'); if(!h || !$('#wotPanel')) return;
  const stary=$('#gkPanel'), html=gkHtml();
  if(stary){ if(html) stary.outerHTML=html; else stary.remove(); }
  else if(html) h.insertAdjacentHTML('afterend', html);
  gkPozycja();
}
/* szeroki ekran: panel w jednej linii z tytułem (wyśrodkowany w pionie względem h1) */
function gkPozycja(){
  const p=$('#gkPanel'), h=$('#page > h1'); if(!p||!h) return;
  if(window.matchMedia('(min-width:1100px)').matches){
    p.classList.add('gk-obok');
    const it=p.querySelector('.gk-it'), wys=it?it.offsetHeight:p.offsetHeight;
    p.style.top = Math.max(0, h.offsetTop + (h.offsetHeight - wys)/2) + 'px';
  } else { p.classList.remove('gk-obok'); p.style.top=''; }
}
function gkZChmury(docs){
  const d=docs.find(x=>x.id==='konto'); GK=d?{...d.data()}:null;
  try{ store.set('wotKonto', JSON.stringify(GK)); }catch(e){}
  if(!gkPremEdycja) gkWstaw();
}
function gkPremFromCloud(d){
  d = /^\d{4}-\d{2}-\d{2}$/.test(String(d||'')) ? String(d) : '';
  if(d===gkPremRecz) return; gkPremRecz=d; store.set('gkPremium', d); if(!gkPremEdycja) gkWstaw();
}
function gkUstawPrem(d){
  gkPremRecz=d; store.set('gkPremium', d);
  cloud(db=>db.collection('cfg').doc('wotPremium').set({d}));
}

document.addEventListener('click', e=>{
  if(!e.target.closest) return;
  if(e.target.closest('[data-gkprem]')){ gkPremEdycja=!gkPremEdycja; gkWstaw(); const i=$('.gk-pop input'); i&&i.focus(); return; }
  if(e.target.closest('[data-gkpremz]')){ gkPremEdycja=false; return gkWstaw(); }
  if(e.target.closest('[data-gkpremx]')){ gkUstawPrem(''); gkPremEdycja=false; return gkWstaw(); }
  if(gkPremEdycja && !e.target.closest('.gk-pop')){ gkPremEdycja=false; gkWstaw(); }
});
document.addEventListener('submit', e=>{ const f=e.target; if(!f.matches||!f.matches('.gk-pop')) return; e.preventDefault();
  const d=f.elements.d.value; gkUstawPrem(/^\d{4}-\d{2}-\d{2}$/.test(d)?d:''); gkPremEdycja=false; gkWstaw(); });
document.addEventListener('keydown', e=>{ if(e.key==='Escape' && gkPremEdycja){ gkPremEdycja=false; gkWstaw(); } });

(()=>{
  const pg=document.getElementById('page'); if(!pg) return;
  new MutationObserver(()=>{ if($('#wotPanel') && !$('#gkPanel')) gkWstaw(); }).observe(pg, {childList:true});
  window.addEventListener('resize', ()=>gkPozycja());
  if(document.fonts && document.fonts.ready) document.fonts.ready.then(()=>gkPozycja());
})();
