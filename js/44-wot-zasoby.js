/* ════════════════════════════════════════════════════════════════
   WORLD OF TANKS → panel zasobów obok tytułu strony
   ════════════════════════════════════════════════════════════════
   Kredyty, złoto, wolne XP, obligacje i konto premium — pobierane z Wargaming API
   przez projekt Apps Script „WoT Garaż” (co godzinę + przy „Odśwież” w zakładce Garaż)
   i zapisywane w Arkuszu, w zakładce „Garaż_konto” (jeden wiersz, id = konto).
   Strona tylko czyta (js/12-synchronizacja.js → gkZChmury). Ostatni stan jest w przeglądarce
   (store 'wotKonto'), więc panel widać też bez sieci.
   Obligacje pokazują się tylko, jeśli API je zwraca (puste pole = brak kafelka).

   Panel wstawia się sam po tytule strony World of Tanks (#page > h1) — obserwator zmian
   w #page, bez zmian w js/04-world-of-tanks.js. Na szerokim ekranie stoi w jednej linii
   z tytułem (po prawej), na węższym — pod tytułem.
   ════════════════════════════════════════════════════════════════ */
let GK = null;
try{ GK = JSON.parse(store.get('wotKonto','null')); }catch(e){ GK = null; }

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

function gkHtml(){
  if(!GK) return '';
  const kr=gkNum(GK['Kredyty']), zl=gkNum(GK['Złoto']), xp=gkNum(GK['Wolne XP']), ob=gkNum(GK['Obligacje']);
  if(kr===null && zl===null && xp===null) return '';
  const it=(k,l,v,t,cl='')=>`<div class="gk-it gk-${k}${cl}" title="${esc(t)}">${gkIk(k)}<span class="gk-t"><span class="gk-l">${l}</span><b>${v}</b></span></div>`;
  let prem='';
  const pd=String(GK['Premium do']||''), d=pd?new Date(pd.replace(' ','T')):null;
  if(GK['Premium']==='TAK' && d && !isNaN(d)){
    const dni=Math.ceil((d-Date.now())/86400000), dm=pd.slice(8,10)+'.'+pd.slice(5,7);
    prem=it('pr','Premium', dni<=0?'dziś koniec':dni===1?'1 dzień':`${dni} dni`, `Konto premium do ${pd}`, dni<=3?' gk-uwaga':'');
    prem=prem.replace('</b></span>', `</b><small>do ${dm}</small></span>`);
  } else {
    prem=it('pr','Premium','brak','Konto premium nieaktywne',' gk-brak');
  }
  return `<div class="gk" id="gkPanel" role="group" aria-label="Zasoby konta World of Tanks${GK['Aktualizacja']?' (stan z '+esc(GK['Aktualizacja'])+')':''}">
    ${kr!==null?it('kr','Kredyty',gkKrotko(kr),`Kredyty: ${fmt(kr,0)} · stan z ${GK['Aktualizacja']||'—'}`):''}
    ${zl!==null?it('zl','Złoto',fmt(zl,0),`Złoto: ${fmt(zl,0)}`):''}
    ${xp!==null?it('xp','Wolne XP',fmt(xp,0),`Wolne doświadczenie: ${fmt(xp,0)}`):''}
    ${ob!==null?it('ob','Obligacje',fmt(ob,0),`Obligacje: ${fmt(ob,0)}`):''}
    ${prem}</div>`;
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
    p.style.top = Math.max(0, h.offsetTop + (h.offsetHeight - p.offsetHeight)/2) + 'px';
  } else { p.classList.remove('gk-obok'); p.style.top=''; }
}
function gkZChmury(docs){
  const d=docs.find(x=>x.id==='konto'); GK=d?{...d.data()}:null;
  try{ store.set('wotKonto', JSON.stringify(GK)); }catch(e){}
  gkWstaw();
}

(()=>{
  const pg=document.getElementById('page'); if(!pg) return;
  new MutationObserver(()=>{ if($('#wotPanel') && !$('#gkPanel')) gkWstaw(); }).observe(pg, {childList:true});
  window.addEventListener('resize', ()=>gkPozycja());
  if(document.fonts && document.fonts.ready) document.fonts.ready.then(()=>gkPozycja());
})();
