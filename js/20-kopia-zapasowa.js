/* ════════════════════════════════════════════════════════════════════════
   KOPIA ZAPASOWA — przycisk w nagłówku (obok skrzynki)
   ════════════════════════════════════════════════════════════════════════
   • „Pobierz kopię” — jeden plik .json ze WSZYSTKIMI danymi strony (finanse, treningi, plany,
     notatki, To-Do, CV, WoT, posiadówki, subskrypcje…). Bez hasła do Arkusza i bez szkiców.
   • „Kopia ze zdjęciami (.zip)” — to samo + wszystkie zdjęcia z notatek i badań (folder zdjecia/ w archiwum).
   • Przycisk świeci na czerwono, gdy od ostatniej kopii minęło 7 dni (KOPIA_DNI).
     Data ostatniej kopii idzie do Arkusza (cfg → kopia), więc kopia z komputera gasi przycisk też na telefonie.
   • „Wgraj kopię” — PODGLĄD w tej karcie: strona pokazuje dane z pliku (np. sprzed 2 lat),
     nic nie trafia do chmury ani nie nadpisuje obecnych danych. „Zakończ podgląd” wraca do aktualnych.
     (Mechanizm podglądu: PODGLAD w js/02-narzedzia.js, wyłączenie chmury w js/12-synchronizacja.js.)
   ════════════════════════════════════════════════════════════════════════ */
let KOPIA_DNI = 7;   /* zmieniane w Ustawieniach → Dane i kopie (store „kopiaDni”, 0 = bez przypomnień) */
const KOPIA_POMIN = k => /^(arkusz|szkic:|kopiaT$|podglad)/.test(k);   /* hasło do Arkusza, kolejka, szkice formularzy */
const kopiaT = () => { try{ return +localStorage.getItem('kopiaT')||0; }catch(e){ return 0; } };
const kopiaDue = () => { KOPIA_DNI=+store.get('kopiaDni','7')||0; return !PODGLAD && KOPIA_DNI>0 && Date.now()-kopiaT() > KOPIA_DNI*864e5; };
const kopiaDzien = t => new Date(t).toLocaleDateString('pl-PL',{day:'numeric', month:'long', year:'numeric'});

function kopiaDane(){ const d={}; try{ Object.keys(localStorage).forEach(k=>{ if(!KOPIA_POMIN(k)) d[k]=localStorage.getItem(k); }); }catch(e){} return d; }
async function kopiaPobierz(zeZdjeciami){
  const d=kopiaDane(), t=Date.now(), json=JSON.stringify({app:'Pracownia', v:1, t, d}, null, 1);
  let plik=`Pracownia-kopia-${todayISO()}.json`, blob=new Blob([json], {type:'application/json'}), dopisek='';
  if(zeZdjeciami && typeof zdjUzywane==='function'){   /* .zip: kopia.json + zdjecia/<id>.jpg (js/34-zip.js, js/37-skrypt-i-zdjecia.js) */
    const Z=[...zdjUzywane()], pliki=[{name:'kopia.json', data:json}]; let brak=0;
    for(let i=0;i<Z.length;i++){ kopiaRender(`Pobieram zdjęcia… ${i+1} / ${Z.length}`);
      const b=await ntzBlob(Z[i]); if(!b){ brak++; continue; }
      pliki.push({name:`zdjecia/${Z[i]}.${/png/.test(b.type)?'png':'jpg'}`, data:new Uint8Array(await b.arrayBuffer())}); }
    blob=zipStworz(pliki); plik=`Pracownia-kopia-${todayISO()}.zip`;
    dopisek=` Zdjęcia: ${pliki.length-1}${brak?`, niedostępne: ${brak} (brak połączenia z Dyskiem?)`:''}.`; }
  const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download=plik; document.body.appendChild(a); a.click();
  setTimeout(()=>{ URL.revokeObjectURL(a.href); a.remove(); }, 1500);
  try{ localStorage.setItem('kopiaT', String(t)); }catch(e){}
  cloud(db=>db.collection('cfg').doc('kopia').set({t}));   /* data kopii wspólna dla telefonu i komputera */
  kopiaBtn(); kopiaRender(`Zapisano plik „${plik}” (${Object.keys(d).length} zestawów danych).${dopisek}`);
  if(typeof setOpen!=='undefined' && setOpen && typeof setRender==='function') setRender();
}
async function kopiaWgraj(file){
  if(/\.zip$/i.test(file.name)){   /* kopia ze zdjęciami: zdjęcia do pamięci przeglądarki, dane do podglądu */
    try{ const P=await zipCzytaj(await file.arrayBuffer()), kj=P.find(x=>x.name==='kopia.json'); if(!kj) return kopiaRender('W tym pliku ZIP nie ma kopii tej strony.', true);
      for(const x of P){ const m=/^zdjecia\/([\w-]+)\.(jpg|png)$/.exec(x.name); if(m && typeof ntzPut==='function') await ntzPut(m[1], new Blob([x.data],{type:m[2]==='png'?'image/png':'image/jpeg'})); }
      return kopiaOtworz(new TextDecoder().decode(kj.data), file.name); }
    catch(e){ return kopiaRender('Nie udało się odczytać pliku ZIP.', true); } }
  const r=new FileReader();
  r.onload=()=>kopiaOtworz(r.result, file.name);
  r.onerror=()=>kopiaRender('Nie udało się odczytać pliku.', true);
  r.readAsText(file);
}
function kopiaOtworz(tekst, nazwa){ const file={name:nazwa}, r={result:tekst};
  { let j=null; try{ j=JSON.parse(r.result); }catch(e){}
    if(!j || j.app!=='Pracownia' || !j.d || typeof j.d!=='object') return kopiaRender('To nie jest plik kopii tej strony.', true);
    try{ sessionStorage.setItem('podglad', JSON.stringify({t:+j.t||0, plik:file.name, d:j.d})); }
    catch(e){ return kopiaRender('Plik jest za duży, żeby go otworzyć w podglądzie.', true); }
    location.reload(); }
}
/* data ostatniej kopii z innego urządzenia (z Arkusza) — bierzemy nowszą */
function kopiaFromCloud(t){ t=+t||0; if(t<=kopiaT()) return; try{ localStorage.setItem('kopiaT', String(t)); }catch(e){} kopiaBtn(); if(kopiaOpen) kopiaRender(); }
function kopiaKoniec(){ try{ sessionStorage.removeItem('podglad'); }catch(e){} location.reload(); }

/* ——— panel (wygląd jak skrzynka: z prawej na komputerze, od dołu na telefonie) ——— */
let kopiaOpen=false;
function kopiaRender(msg, err){
  let sc=$('#kpScrim'), pn=$('#kpPanel');
  if(!kopiaOpen){ sc&&sc.remove(); pn&&pn.remove(); document.body.classList.remove('sk-lock'); return; }
  if(!pn){ sc=document.createElement('div'); sc.id='kpScrim'; sc.className='sk-scrim'; sc.dataset.kp='close'; document.body.appendChild(sc);
    pn=document.createElement('aside'); pn.id='kpPanel'; pn.className='sk-panel kp-panel'; pn.setAttribute('role','dialog'); pn.setAttribute('aria-label','Kopia zapasowa'); document.body.appendChild(pn); }
  document.body.classList.add('sk-lock');
  const t=kopiaT(), due=kopiaDue();
  pn.innerHTML=`<div class="sk-head"><div><span class="label">Dane strony</span><h2>Kopia zapasowa</h2></div><button type="button" class="sk-close" data-kp="close" aria-label="Zamknij">✕</button></div>
    <div class="kp-body">
      ${PODGLAD?`<div class="kp-card kp-pv"><b>Teraz oglądasz kopię</b><p>${esc(PODGLAD.plik||'plik')}${PODGLAD.t?' · z '+kopiaDzien(PODGLAD.t):''}. Zmiany w podglądzie nie są nigdzie zapisywane.</p><button type="button" class="kp-main" data-kp="end">Zakończ podgląd</button></div>`:''}
      <div class="kp-card${due?' due':''}">
        <span class="label">Ostatnia kopia</span>
        <b class="kp-when">${t?kopiaDzien(t):'jeszcze nie zrobiona'}</b>
        <p>${due?(t?`Minęło ${Math.floor((Date.now()-t)/864e5)} dni — czas na nową.`:'Zrób pierwszą kopię.'):(KOPIA_DNI?'Kolejna za ':'Przypomnienia wyłączone.')+(KOPIA_DNI?Math.max(1,Math.ceil((t+KOPIA_DNI*864e5-Date.now())/864e5))+' dni.':'')} Plik zawiera wszystkie dane strony: finanse, treningi, plany, notatki, To-Do, CV, gry i resztę.</p>
        <button type="button" class="kp-main" data-kp="get"${PODGLAD?' disabled title="Najpierw zakończ podgląd"':''}><svg viewBox="0 0 16 16" aria-hidden="true"><path d="M8 2v8M4.5 6.5 8 10l3.5-3.5M2.5 13.5h11"/></svg>Pobierz kopię</button>
        <button type="button" class="kp-sec" data-kp="getzip"${PODGLAD?' disabled':''} title="Plik .zip: dane + wszystkie zdjęcia z notatek i badań">Kopia ze zdjęciami (.zip)</button>
      </div>
      <div class="kp-card">
        <span class="label">Wgraj dane</span>
        <b>Podgląd starej kopii</b>
        <p>Otwiera plik kopii (np. sprzed dwóch lat) tylko w tej karcie: przeglądasz i analizujesz stare dane, a obecne zostają nietknięte i nic nie trafia do Arkusza.</p>
        <label class="kp-file"><input type="file" accept=".json,.zip,application/json,application/zip" data-kp="file"><svg viewBox="0 0 16 16" aria-hidden="true"><path d="M8 13V5M4.5 8.5 8 5l3.5 3.5M2.5 2.5h11"/></svg>Wgraj kopię…</label>
      </div>
      ${msg?`<p class="kp-msg${err?' err':''}" role="status">${esc(msg)}</p>`:''}
      <p class="kp-note">Kopie trzymaj poza telefonem — np. wyślij plik na swój Dysk Google albo przez Skrzynkę na komputer.</p>
    </div>`;
}
/* przycisk w nagłówku: kropka = minął tydzień */
function kopiaBtn(){ const b=$('#kpBtn'); if(!b) return; const due=kopiaDue(); b.classList.toggle('due',due);
  b.title=PODGLAD?'Podgląd kopii — kliknij, by zakończyć':due?'Kopia zapasowa — minął tydzień, zrób nową':'Kopia zapasowa'; }
(function(){
  const tools=document.querySelector('.hdr-tools'); if(!tools) return;
  tools.insertAdjacentHTML('afterbegin', `<button type="button" class="sk-btn kp-btn${PODGLAD?' pv':''}" id="kpBtn" data-kp="open" aria-label="Kopia zapasowa">
    <svg viewBox="0 0 24 24" aria-hidden="true"><ellipse cx="12" cy="6" rx="7.5" ry="2.8"/><path d="M4.5 6v12c0 1.5 3.4 2.8 7.5 2.8s7.5-1.3 7.5-2.8V6"/><path d="M4.5 12c0 1.5 3.4 2.8 7.5 2.8s7.5-1.3 7.5-2.8"/></svg>
    <span class="kp-dot" aria-hidden="true"></span></button>`);
  kopiaBtn();
  if(PODGLAD){   /* pasek u góry, cały czas widoczny */
    document.body.insertAdjacentHTML('afterbegin', `<div class="kp-bar" role="status"><span><b>Podgląd kopii</b> ${PODGLAD.t?'z '+kopiaDzien(PODGLAD.t):''} — zmiany nie są zapisywane</span><button type="button" data-kp="end">Zakończ podgląd</button></div>`);
    document.body.classList.add('kp-on'); }
})();
document.addEventListener('click', e=>{
  const b=e.target.closest('[data-kp]'); if(!b || b.dataset.kp==='file') return;
  const a=b.dataset.kp;
  if(a==='open'){ kopiaOpen=true; return kopiaRender(); }
  if(a==='close'){ kopiaOpen=false; return kopiaRender(); }
  if(a==='get') return kopiaPobierz();
  if(a==='getzip') return kopiaPobierz(true);
  if(a==='end') return kopiaKoniec();
});
document.addEventListener('change', e=>{ if(e.target.dataset && e.target.dataset.kp==='file' && e.target.files[0]) kopiaWgraj(e.target.files[0]); });
document.addEventListener('keydown', e=>{ if(kopiaOpen && e.key==='Escape'){ kopiaOpen=false; kopiaRender(); } });
