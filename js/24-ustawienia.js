/* ════════════════════════════════════════════════════════════════════════
   USTAWIENIA — kółko zębate obok logo (#setBtn) → okienko z kategoriami
   ════════════════════════════════════════════════════════════════════════
   Kategorie (SET_KAT): Ogólne · Wygląd · Dane i kopie · Synchronizacja · O stronie.
   Zapisywane w przeglądarce (store):
     imie         imię w powitaniu na stronie głównej (js/03 → pStart)
     startStrona  podstrona otwierana po wejściu bez adresu # (js/13-router.js)
     motyw        jasny / auto / ciemny (applyTheme w js/13-router.js)
     rozmiar      skala całej strony: 0.9 / 1 / 1.1 / 1.2 (CSS zoom)
     kopiaDni     co ile dni przycisk kopii ma świecić (0 = wyłączone; js/20-kopia-zapasowa.js)
     arkuszUrl / arkuszKlucz   połączenie z Arkuszem Google (js/12-synchronizacja.js)
   ════════════════════════════════════════════════════════════════════════ */
const SET_KAT = [
  ['ogolne','Ogólne','<path d="M4 6h16M4 12h10M4 18h7"/>'],
  ['wyglad','Wygląd','<circle cx="12" cy="12" r="8"/><path d="M12 4a8 8 0 0 0 0 16z" fill="currentColor"/>'],
  ['dane','Dane i kopie','<ellipse cx="12" cy="6" rx="7" ry="2.6"/><path d="M5 6v12c0 1.4 3.1 2.6 7 2.6s7-1.2 7-2.6V6M5 12c0 1.4 3.1 2.6 7 2.6s7-1.2 7-2.6"/>'],
  ['sync','Synchronizacja','<path d="M4 12a8 8 0 0 1 14-5.3L20 9M20 4v5h-5M20 12a8 8 0 0 1-14 5.3L4 15M4 20v-5h5"/>'],
  ['info','O stronie','<circle cx="12" cy="12" r="8.5"/><path d="M12 11v6M12 7.5v.5"/>']
];
const SET_WERSJA = 'v63';
const SET_ROZM = [['0.9','Mały'],['1','Normalny'],['1.1','Duży'],['1.2','Bardzo duży']];
let setOpen=false, setKat=store.get('setKat','ogolne');
/* instalacja jako aplikacja: Chrome/Android wysyła „beforeinstallprompt” — zapamiętujemy i pokazujemy przycisk */
let setInstal=null; const setJestApka = () => matchMedia('(display-mode: standalone)').matches || navigator.standalone===true;
addEventListener('beforeinstallprompt', e=>{ e.preventDefault(); setInstal=e; if(setOpen) setRender(); });
addEventListener('appinstalled', ()=>{ setInstal=null; if(setOpen) setRender(); });

/* rozmiar strony — od razu przy wczytaniu */
const setRozmiar = v => { document.documentElement.style.zoom = (+v && +v!==1) ? v : ''; };
setRozmiar(store.get('rozmiar','1'));

const setNav = () => [...document.querySelectorAll('.navtree a[data-r]')].map(a=>[a.dataset.r, a.textContent.trim()]);
const setRow = (t,opis,ctrl) => `<div class="set-row"><div class="set-rt"><b>${t}</b>${opis?`<span>${opis}</span>`:''}</div><div class="set-rc">${ctrl}</div></div>`;
const setSeg = (name, val, opts) => `<div class="seg set-seg" role="radiogroup">${opts.map(([v,n])=>`<button type="button" role="radio" data-set="${name}" data-v="${esc(v)}" aria-checked="${v===val}" aria-selected="${v===val}">${n}</button>`).join('')}</div>`;

function setTresc(k){
  if(k==='ogolne') return `<h3>Ogólne</h3>
    ${setRow('Imię w powitaniu','Na stronie głównej: „Dzień dobry, …”',`<input class="set-in" data-setin="imie" value="${esc(store.get('imie','Eryk'))}" maxlength="30" placeholder="Eryk">`)}
    ${setRow('Strona po otwarciu','Co ma się pokazać, gdy wchodzisz na stronę bez konkretnego adresu',`<select class="set-in" data-setin="startStrona">${setNav().map(([r,n])=>`<option value="${r}"${store.get('startStrona','start')===r?' selected':''}>${esc(n)}</option>`).join('')}</select>`)}
    ${setRow('Aplikacja na telefon i komputer', setJestApka()?'Działa jako zainstalowana aplikacja — także bez internetu.':setInstal?'Ikona na ekranie głównym, pełny ekran, działa też bez internetu.':'W Chrome: menu ⋮ → „Dodaj do ekranu głównego” / „Zainstaluj aplikację”. Działa też bez internetu.', setJestApka()?'<span class="set-ok">✓ Zainstalowana</span>':setInstal?`<button type="button" class="set-main" data-setact="instaluj">Zainstaluj</button>`:'')}
    ${setRow('Ukrywaj kwoty po uruchomieniu','Przy każdym otwarciu strony kwoty w Pieniądzach i w widżecie wydatków są rozmyte (jak w aplikacji banku). Odkrywasz okiem.',setSeg('kasaStart', store.get('kasaStart','0'), [['0','Nie'],['1','Tak']]))}
    ${typeof wzUstawieniaHtml==='function'?wzUstawieniaHtml():''}
    ${setRow('Skróty klawiszowe','<kbd>Ctrl</kbd> + <kbd>K</kbd> lub <kbd>/</kbd> — wyszukiwarka · <kbd>Esc</kbd> — zamyka okienka','')}`;
  if(k==='wyglad'){ const m=store.get('motyw','jasny');
    return `<h3>Wygląd</h3>
    <div class="set-block"><b>Motyw</b><div class="set-themes">${[['jasny','Jasny'],['auto','Jak w systemie'],['ciemny','Ciemny']].map(([v,n])=>`<button type="button" class="set-th th-${v}" data-set="motyw" data-v="${v}" aria-pressed="${m===v}"><span class="set-prev" aria-hidden="true"><i></i><i></i><i></i></span><span>${n}</span></button>`).join('')}</div></div>
    ${setRow('Rozmiar strony','Powiększa lub zmniejsza tekst i wszystkie elementy',setSeg('rozmiar', store.get('rozmiar','1'), SET_ROZM))}`; }
  if(k==='dane'){ const t=typeof kopiaT==='function'?kopiaT():0, dni=store.get('kopiaDni','7');
    return `<h3>Dane i kopie</h3>
    <div class="set-cards">
      <div class="set-card"><b>Eksport danych</b><p>Jeden plik z wszystkimi danymi strony: finanse, treningi, plany, notatki, To-Do, CV, gry, praca i reszta.${t?` Ostatnia kopia: <b>${new Date(t).toLocaleDateString('pl-PL',{day:'numeric',month:'long',year:'numeric'})}</b>.`:' Nie zrobiono jeszcze żadnej kopii.'}</p>
        <button type="button" class="set-main" data-setact="eksport"${typeof PODGLAD!=='undefined'&&PODGLAD?' disabled':''}><svg viewBox="0 0 16 16" aria-hidden="true"><path d="M8 2v8M4.5 6.5 8 10l3.5-3.5M2.5 13.5h11"/></svg>Pobierz kopię (.json)</button><button type="button" class="td-btn set-zipb" data-setact="eksportzip"${typeof PODGLAD!=='undefined'&&PODGLAD?' disabled':''}>Ze zdjęciami (.zip)</button></div>
      <div class="set-card"><b>Import danych</b><p>Otwiera plik kopii w trybie podglądu — przeglądasz stare dane (np. sprzed roku), a obecne zostają nietknięte.</p>
        <label class="set-sec"><input type="file" accept=".json,.zip,application/json,application/zip" data-setfile="1"><svg viewBox="0 0 16 16" aria-hidden="true"><path d="M8 13V5M4.5 8.5 8 5l3.5 3.5M2.5 2.5h11"/></svg>Wgraj kopię…</label></div>
    </div>
    ${setRow('Ramka w PDF','Linia wokół marginesów na każdej stronie — jak obramowanie strony w Wordzie (CV, Wyniki, Notatki)',setSeg('pdfRamka', store.get('pdfRamka','0'), [['0','Bez ramki'],['1','Z ramką']]))}
    ${setRow('Marginesy w PDF','Odstęp tekstu od krawędzi kartki — 1,27 cm to wąskie marginesy z Worda',setSeg('pdfMarg', store.get('pdfMarg','waskie'), [['waskie','1,27 cm'],['normalne','1,5 cm'],['szerokie','2,5 cm']]))}
    ${setRow('Przypomnienie o kopii','Przycisk kopii w górnym pasku zaświeci się po tylu dniach',setSeg('kopiaDni', dni, [['7','Co tydzień'],['14','Co 2 tyg.'],['30','Co miesiąc'],['0','Wyłącz']]))}
    ${typeof zdjKartaHtml==='function'?zdjKartaHtml():''}
    <p class="set-note">Trwałe przywracanie danych: w Arkuszu Google <b>Plik → Historia wersji</b>. Plik kopii trzymaj poza telefonem (Dysk, komputer).</p>`; }
  if(k==='sync'){ const a=arkuszUstawienia(), st=typeof syncState!=='undefined'?syncState:'local', z=a&&a.url.match(/\/s\/([^/]+)\//);
    return `<h3>Synchronizacja</h3>
    <div class="set-status st-${esc(st)}"><i aria-hidden="true"></i><div><b>${esc(typeof syncText==='function'?syncText():'')}</b><span>${a?`Arkusz Google · …${esc(z?z[1].slice(-8):'')}${store.get('arkuszUrl','')?'':' (z pliku js/00-ustawienia.js)'}`:'Dane są tylko w tej przeglądarce — połącz z Arkuszem, żeby mieć je na telefonie i komputerze.'}</span>${st==='err'&&window.arkuszBlad?`<span class="set-err">${esc(window.arkuszBlad)}</span>`:''}</div></div>
    ${a&&typeof skryptKartaHtml==='function'?skryptKartaHtml():''}
    <form class="set-ark"><b>${a?'Zmień połączenie':'Połącz z Arkuszem Google'}</b>
      <label><span class="label">Adres skryptu (Apps Script → Wdróż → adres aplikacji internetowej)</span><input name="url" class="set-in" placeholder="https://script.google.com/macros/s/…/exec" autocomplete="off" spellcheck="false" required></label>
      <label><span class="label">Hasło (KLUCZ z Kod.gs)</span><input name="klucz" type="password" class="set-in" autocomplete="off"></label>
      <div class="set-acts"><button type="submit" class="set-main">Zapisz i połącz</button>${store.get('arkuszUrl','')?`<button type="button" class="td-btn" data-setact="rozlacz">Rozłącz to urządzenie</button>`:''}</div>
      <p class="set-note" id="setArkMsg"></p></form>`; }
  return `<h3>O stronie</h3>
    <div class="set-about"><span class="logo-img" aria-hidden="true"><img class="lg-jasne" src="img/logo-jasne-192.png" alt=""><img class="lg-ciemne" src="img/logo-192.png" alt=""></span><div><b>Pracownia</b><span>wersja ${SET_WERSJA} · GitHub Pages</span></div></div>
    ${setRow('Kod strony','Repozytorium na GitHubie',`<a class="td-btn set-link" href="https://github.com/Eryk1323232/Strona-internetowa" target="_blank" rel="noopener">Otwórz ↗</a>`)}
    ${setRow('Odśwież stronę','Gdy nie widać najnowszych zmian — wczytuje stronę od nowa',`<button type="button" class="td-btn" data-setact="odswiez">Odśwież</button>`)}`;
}
function setRender(){
  let sc=$('#setScrim'), md=$('#setModal');
  if(!setOpen){ sc&&sc.remove(); md&&md.remove(); document.body.classList.remove('tr-lock'); return; }
  if(!md){ sc=document.createElement('div'); sc.id='setScrim'; sc.className='tr-scrim'; document.body.appendChild(sc);
    md=document.createElement('div'); md.id='setModal'; md.className='set-modal'; md.setAttribute('role','dialog'); md.setAttribute('aria-modal','true'); md.setAttribute('aria-label','Ustawienia'); document.body.appendChild(md); }
  document.body.classList.add('tr-lock');
  md.innerHTML=`<div class="set-panel">
    <aside class="set-side"><div class="set-head"><h2>Ustawienia</h2><button type="button" class="tr-x set-x" data-setact="zamknij" aria-label="Zamknij">✕</button></div>
      <nav class="set-nav" role="tablist">${SET_KAT.map(([k,n,ic])=>`<button type="button" role="tab" data-setkat="${k}" aria-selected="${k===setKat}"><svg class="ni" viewBox="0 0 24 24" aria-hidden="true">${ic}</svg><span>${n}</span></button>`).join('')}</nav></aside>
    <section class="set-body">${setTresc(setKat)}</section></div>`;
}
const setOdswiezMotyw = () => { if(typeof applyTheme==='function') applyTheme(store.get('motyw','jasny')); };

document.addEventListener('click', e=>{
  if(e.target.closest('#setBtn')){ setOpen=true; const b=$('#menuBtn'); if(b && $('#side').classList.contains('open')) b.click(); return setRender(); }
  if(!setOpen) return;
  if(e.target.id==='setScrim'){ setOpen=false; return setRender(); }
  const k=e.target.closest('[data-setkat]'); if(k){ setKat=k.dataset.setkat; store.set('setKat',setKat); return setRender(); }
  const s=e.target.closest('[data-set]');
  if(s){ const n=s.dataset.set, v=s.dataset.v; store.set(n,v);
    if(n==='motyw'){ if(typeof theme!=='undefined') theme=v; setOdswiezMotyw(); }
    if(n==='rozmiar') setRozmiar(v);
    if(n==='kopiaDni' && typeof kopiaBtn==='function') kopiaBtn();
    return setRender(); }
  const a=e.target.closest('[data-setact]'); if(!a) return;
  const act=a.dataset.setact;
  if(act==='zamknij'){ setOpen=false; return setRender(); }
  if(act==='eksport' && typeof kopiaPobierz==='function'){ kopiaPobierz(); return setRender(); }
  if(act==='eksportzip' && typeof kopiaPobierz==='function'){ a.disabled=true; a.textContent='Pobieram zdjęcia…'; kopiaPobierz(true); return; }
  if(act==='wzopen' && typeof wzOtworz==='function') return wzOtworz();
  if(act==='wzlively' && typeof wzKopiujLively==='function') return wzKopiujLively(a);
  if(typeof szAkcjaUstawien==='function' && szAkcjaUstawien(act, a)) return;
  if(act==='odswiez'){ location.reload(); return; }
  if(act==='instaluj' && setInstal){ setInstal.prompt(); setInstal.userChoice.finally(()=>{ setInstal=null; setRender(); }); return; }
  if(act==='rozlacz'){ if(!a.dataset.armed){ a.dataset.armed='1'; a.textContent='Na pewno? Kliknij jeszcze raz'; a.classList.add('armed'); return; }
    try{ localStorage.removeItem('arkuszUrl'); localStorage.removeItem('arkuszKlucz'); }catch(err){} location.reload(); }
});
document.addEventListener('change', e=>{
  const i=e.target.closest&&e.target.closest('[data-setin]');
  if(i){ store.set(i.dataset.setin, i.value.trim()); if(i.dataset.setin==='imie' && typeof render==='function') render(); return; }
  if(e.target.dataset && e.target.dataset.setfile && e.target.files[0] && typeof kopiaWgraj==='function') kopiaWgraj(e.target.files[0]);
});
document.addEventListener('submit', e=>{
  const f=e.target; if(!f.matches('form.set-ark')) return; e.preventDefault();
  const url=f.url.value.trim(), m=$('#setArkMsg');
  if(!/^https:\/\/script\.google(usercontent)?\.com\//.test(url)){ m.textContent='To nie wygląda na adres Apps Script (https://script.google.com/macros/s/…/exec).'; m.classList.add('err'); return; }
  store.set('arkuszUrl',url); store.set('arkuszKlucz',f.klucz.value); location.reload();
});
document.addEventListener('keydown', e=>{ if(setOpen && e.key==='Escape'){ e.stopPropagation(); setOpen=false; setRender(); } }, true);
