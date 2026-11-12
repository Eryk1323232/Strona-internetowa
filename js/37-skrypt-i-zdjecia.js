/* ════════════════════════════════════════════════════════════════════════
   WERSJA SKRYPTU (Kod.gs) + PORZĄDEK W ZDJĘCIACH   (⚙ Ustawienia)
   ════════════════════════════════════════════════════════════════════════
   • Skrypt: strona pyta Apps Script o numer wersji (akcja „wersja”, WERSJA_SKRYPTU w Kod.gs).
     Gdy jest starszy niż SKRYPT_WYMAGANY — w ⚙ → Synchronizacja pojawia się instrukcja
     i przycisk „Kopiuj nowy Kod.gs” (plik apps-script/Kod.gs ze strony, z wpisanym od razu hasłem),
     a na kółku zębatym czerwona kropka. Sprawdzane raz dziennie i przy otwarciu ustawień.
   • Zdjęcia (⚙ → Dane i kopie): ile zdjęć jest w notatkach i badaniach, ile plików leży na Dysku,
     usuwanie nieużywanych (starszych niż 7 dni — żeby nie skasować zdjęcia dodanego przed chwilą
     na drugim urządzeniu; usunięte pliki są 30 dni w koszu Dysku Google).
   zdjUzywane() — zbiór id wszystkich zdjęć użytych na stronie (także w notatkach w koszu).
   ════════════════════════════════════════════════════════════════════════ */
const SKRYPT_WYMAGANY = 3;
let skryptStan = (()=>{ try{ return JSON.parse(store.get('skryptWer','null')); }catch(e){ return null; } })();   /* {v, t} */
let zdjStan = null, zdjMsg = '';
const skryptStary = () => !!(skryptStan && skryptStan.v < SKRYPT_WYMAGANY);

async function skryptSprawdz(wymus){
  if(typeof skGet!=='function' || !skPolaczenie() || (typeof PODGLAD!=='undefined'&&PODGLAD)) return;
  if(!wymus && skryptStan && skryptStan.v>=SKRYPT_WYMAGANY && Date.now()-skryptStan.t<864e5) return;
  let v=null;
  try{ v=+((await skGet('wersja'))||{}).wersja||0; }
  catch(e){ if(/Nieznana akcja/.test(e.message)) v=0; }   /* stary skrypt nie zna pytania o wersję */
  if(v===null) return;   /* brak internetu — nie zgadujemy */
  skryptStan={v, t:Date.now()}; store.set('skryptWer', JSON.stringify(skryptStan)); skryptKropka();
  if(typeof setOpen!=='undefined' && setOpen && typeof setKat!=='undefined' && setKat==='sync') setRender();
}
function skryptKropka(){ const b=document.getElementById('setBtn'); if(b){ b.classList.toggle('uwaga', skryptStary()); if(skryptStary()) b.title='Ustawienia — skrypt Apps Script wymaga aktualizacji'; } }
function skryptKartaHtml(){
  if(!skryptStan) return `<div class="set-skr"><i aria-hidden="true"></i><div><b>Skrypt Apps Script</b><span>Sprawdzam wersję…</span></div></div>`;
  if(!skryptStary()) return `<div class="set-skr ok"><i aria-hidden="true"></i><div><b>Skrypt Apps Script jest aktualny</b><span>Wersja ${skryptStan.v} · zdjęcia, skrzynka i zapis danych działają w pełni.</span></div><button type="button" class="td-btn" data-setact="skryptspr">Sprawdź</button></div>`;
  return `<div class="set-skr zle"><i aria-hidden="true"></i><div><b>Skrypt Apps Script wymaga aktualizacji</b><span>Masz wersję ${skryptStan.v||'starą'}, strona potrzebuje ${SKRYPT_WYMAGANY}. Do tego czasu zdjęcia zostają tylko na urządzeniu, z którego je dodano.</span>
    <ol><li>Kliknij <b>Kopiuj nowy Kod.gs</b> — skopiuje się cały skrypt z Twoim hasłem już w środku.</li>
    <li>Otwórz Arkusz → <b>Rozszerzenia → Apps Script</b>, zaznacz cały stary kod (Ctrl+A) i wklej nowy (Ctrl+V), zapisz (Ctrl+S).</li>
    <li><b>Wdróż → Zarządzaj wdrożeniami → ołówek → Wersja: „Nowa wersja” → Wdróż.</b> Adres zostaje ten sam.</li></ol>
    <div class="set-acts"><button type="button" class="set-main" data-setact="skryptkopiuj">Kopiuj nowy Kod.gs</button><button type="button" class="td-btn" data-setact="skryptspr">Sprawdź ponownie</button></div><p class="set-note" id="skrMsg"></p></div></div>`;
}
async function skryptKopiuj(btn){
  const msg=t=>{ const m=document.getElementById('skrMsg'); if(m) m.textContent=t; };
  try{ let kod=await (await fetch('apps-script/Kod.gs?t='+Date.now(), {cache:'no-store'})).text(); const a=skPolaczenie();
    if(!/WERSJA_SKRYPTU/.test(kod)) throw new Error('zly plik');
    if(a && a.klucz) kod=kod.replace(/const KLUCZ = '[^']*';/, ()=>"const KLUCZ = '"+String(a.klucz).replace(/\\/g,'\\\\').replace(/'/g,"\\'")+"';");
    await navigator.clipboard.writeText(kod); msg('Skopiowano. Wklej w Apps Script w miejsce całego starego kodu, zapisz i wdróż nową wersję.'); }
  catch(e){ msg('Nie udało się skopiować. Otwórz plik apps-script/Kod.gs w repozytorium i pamiętaj, żeby wpisać swoje hasło w linijce KLUCZ.'); }
}

/* ——— zdjęcia ——— */
function zdjUzywane(){
  const S=new Set();
  if(typeof N!=='undefined') N.forEach(n=>{ (String(n.h||'').match(/data-zid="[\w-]+"/g)||[]).forEach(m=>S.add(m.slice(10,-1))); });
  if(typeof MXS!=='undefined') Object.values(MXS).forEach(L=>L.forEach(m=>m.tests.forEach(t=>(t.z||[]).forEach(z=>S.add(z)))));
  return S;
}
const zdjIle = (n,a,b,c) => n+' '+(n===1?a:(n%10>=2&&n%10<=4&&(n%100<10||n%100>=20))?b:c);
const zdjMB = b => b>=1048576?fmt(b/1048576,1)+' MB':fmt(Math.max(1,Math.round(b/1024)),0)+' kB';
async function zdjSprawdz(){
  zdjMsg='Sprawdzam Dysk…'; setRender();
  try{ const L=await skGet('zdjeciaLista'), U=zdjUzywane(), granica=Date.now()-7*864e5;
    const nieuz=L.filter(x=>!U.has(x.zid)), doUsun=nieuz.filter(x=>x.kiedy<granica), naDysku=new Set(L.map(x=>x.zid));
    zdjStan={ile:L.length, rozm:L.reduce((a,x)=>a+x.rozmiar,0), nieuz:nieuz.length, doUsun, rozmUsun:doUsun.reduce((a,x)=>a+x.rozmiar,0), brak:[...U].filter(z=>!naDysku.has(z)).length}; zdjMsg=''; }
  catch(e){ zdjStan=null; zdjMsg=/Nieznana akcja/.test(e.message)?'Najpierw zaktualizuj skrypt (⚙ → Synchronizacja).':'Nie udało się połączyć z Dyskiem.'; }
  setRender();
}
async function zdjSprzataj(){
  if(!zdjStan || !zdjStan.doUsun.length) return; const L=zdjStan.doUsun; let ok=0;
  for(let i=0;i<L.length;i++){ zdjMsg=`Usuwam… ${i+1} / ${L.length}`; setRender();
    try{ await skPost({akcja:'zdjecieUsun', zid:L[i].zid}); ok++; try{ (await caches.open(NTZ_CACHE)).delete(ntzKlucz(L[i].zid)); }catch(e){} }catch(e){} }
  await zdjSprawdz(); zdjMsg=`Przeniesiono do kosza Dysku: ${zdjIle(ok,'plik','pliki','plików')} (można je przywrócić przez 30 dni).`; setRender();
}
function zdjKartaHtml(){
  const U=zdjUzywane().size, pol=typeof skPolaczenie==='function'&&skPolaczenie(), s=zdjStan;
  return `<div class="set-block set-zdj"><b>Zdjęcia</b>
    <p>W notatkach i badaniach: <b>${zdjIle(U,'zdjęcie','zdjęcia','zdjęć')}</b>.${s?` Na Dysku Google: <b>${zdjIle(s.ile,'plik','pliki','plików')}</b>, ${zdjMB(s.rozm)}. Nieużywane: <b>${s.nieuz}</b>${s.nieuz>s.doUsun.length?` (w tym ${s.nieuz-s.doUsun.length} z ostatnich 7 dni — zostają)`:''}.${s.brak?` <span class="set-zle">Brakuje na Dysku: ${s.brak} — są tylko na urządzeniu, z którego je dodano.</span>`:''}`:''}</p>
    <div class="set-acts">${pol?`<button type="button" class="td-btn" data-setact="zdjspr">${s?'Sprawdź ponownie':'Sprawdź Dysk'}</button>`:'<span class="set-note">Podłącz Arkusz, żeby zdjęcia trafiały na Dysk.</span>'}
      ${s&&s.doUsun.length?`<button type="button" class="td-btn set-usun" data-setact="zdjusun">Usuń nieużywane (${s.doUsun.length} · ${zdjMB(s.rozmUsun)})</button>`:''}</div>
    ${zdjMsg?`<p class="set-note" role="status">${esc(zdjMsg)}</p>`:''}</div>`;
}
/* przyciski z ustawień (wołane z js/24-ustawienia.js) */
function szAkcjaUstawien(act, btn){
  if(act==='skryptspr'){ btn.disabled=true; btn.textContent='Sprawdzam…'; skryptSprawdz(true).then(()=>setRender()); return true; }
  if(act==='skryptkopiuj'){ skryptKopiuj(btn); return true; }
  if(act==='zdjspr'){ zdjSprawdz(); return true; }
  if(act==='zdjusun'){ if(!btn.dataset.pewne){ btn.dataset.pewne='1'; btn.textContent='Na pewno usunąć?'; btn.classList.add('armed'); return true; } zdjSprzataj(); return true; }
  return false;
}
skryptKropka();
setTimeout(()=>skryptSprawdz(false), 6000);
document.addEventListener('click', e=>{ if(e.target.closest && e.target.closest('#setBtn')) setTimeout(()=>skryptSprawdz(true), 50); });
