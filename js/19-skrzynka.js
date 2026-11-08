/* ════════════════════════════════════════════════════════════════════════
   SKRZYNKA — przesyłanie plików i tekstu między telefonem a komputerem (jak LocalSend)
   ════════════════════════════════════════════════════════════════════════
   Ikonka skrzynki w prawym górnym rogu → panel: wpisz tekst / wklej link / dodaj pliki → Wyślij.
   Na drugim urządzeniu w panelu pojawia się wpis (kropka z liczbą na ikonce = nowe z innych urządzeń).

   Jak to działa: przez ten sam Google Apps Script co Arkusz (js/12-synchronizacja.js → arkuszUstawienia),
   ale pliki trafiają do folderu „Pracownia – Skrzynka” na Twoim Dysku Google (nie do Arkusza).
   Po 7 dniach pliki same idą do kosza (SKRZYNKA_DNI w apps-script/Kod.gs).
   Wymaga nowej wersji apps-script/Kod.gs (funkcja skrzynka) — jeśli jej brak, panel pokaże instrukcję.

   SK_MAX_MB      – największy plik (Apps Script przyjmuje do ~50 MB, base64 dokłada 1/3)
   skNazwa        – nazwa tego urządzenia (zapamiętana w przeglądarce; widać ją przy wysłanych wpisach)
   ════════════════════════════════════════════════════════════════════════ */

const SK_MAX_MB = 25;
const SK_ODSWIEZ_OTWARTA = 6000, SK_ODSWIEZ_ZAMKNIETA = 60000;
let skOpen = false, skList = null, skErr = '', skStary = false, skBusy = [], skTimer = null, skFetching = false;
const skBlobs = {};   /* pobrane pliki (do „Udostępnij” bez ponownego pobierania) */
const skDomyslna = () => { const u=navigator.userAgent;
  return /iPhone/.test(u)?'iPhone':/iPad/.test(u)?'iPad':/Android/.test(u)?(/Mobile/.test(u)?'Telefon':'Tablet'):/Mac/.test(u)?'Mac':'Komputer'; };
let skNazwa = store.get('skNazwa','') || skDomyslna();
const skPolaczenie = () => (typeof arkuszUstawienia==='function' ? arkuszUstawienia() : null);

/* ——— rozmowa z Apps Script ——— */
async function skGet(akcja, extra={}){
  const a=skPolaczenie(); if(!a) throw new Error('brak');
  const q=new URLSearchParams({klucz:a.klucz, akcja, t:Date.now(), ...extra});
  const j=await (await fetch(a.url+(a.url.includes('?')?'&':'?')+q)).json();
  if(!j.ok) throw new Error(j.blad||'Błąd skrzynki');
  return j.dane;
}
async function skPost(body){
  const a=skPolaczenie(); if(!a) throw new Error('brak');
  let r; try{ r=await fetch(a.url,{method:'POST', body:JSON.stringify({klucz:a.klucz, ...body})}); }
  catch(e){ throw new Error('Ta przeglądarka blokuje wysyłanie plików do Google (POST). Spróbuj w Chrome lub Safari.'); }
  const j=await r.json(); if(!j.ok) throw new Error(j.blad||'Błąd skrzynki');
  return j.dane;
}
async function skLoad(){
  if(skFetching || !skPolaczenie()) return; skFetching=true;
  try{ const d=await skGet('lista');
    if(!Array.isArray(d)){ skStary=true; skList=[]; }   /* stary Kod.gs zwraca cały Arkusz zamiast listy */
    else { skStary=false; skList=d; skErr=''; }
  }catch(e){ skErr=String(e.message||e); }
  skFetching=false; skBadge(); if(skOpen) skRenderList();
}
function skPlan(){ clearTimeout(skTimer); skTimer=setTimeout(()=>{ if(document.visibilityState==='visible') skLoad().then(skPlan); else skPlan(); }, skOpen?SK_ODSWIEZ_OTWARTA:SK_ODSWIEZ_ZAMKNIETA); }
document.addEventListener('visibilitychange', ()=>{ if(document.visibilityState==='visible' && skPolaczenie()) skLoad(); });

/* ——— wysyłanie ——— */
async function skSendText(t){
  t=t.trim(); if(!t) return;
  const job={id:uid('sj'), nazwa:t.length>40?t.slice(0,40)+'…':t, rozmiar:0, tekst:true}; skBusy.push(job); skRenderList();
  try{ if(encodeURIComponent(t).length<5000) await skGet('wyslij',{tekst:t, od:skNazwa}); else await skPost({akcja:'wyslij', tekst:t, od:skNazwa}); }
  catch(e){ skErr=String(e.message||e); }
  skBusy=skBusy.filter(x=>x!==job); await skLoad();
}
function skB64(file){ return new Promise((ok,err)=>{ const r=new FileReader(); r.onload=()=>ok(String(r.result).split(',')[1]||''); r.onerror=()=>err(r.error); r.readAsDataURL(file); }); }
async function skSendFiles(files){
  for(const f of [...files]){
    if(f.size>SK_MAX_MB*1048576){ skErr=`„${f.name}” ma ${skSize(f.size)} — limit to ${SK_MAX_MB} MB.`; skRenderList(); continue; }
    const job={id:uid('sj'), nazwa:f.name||'plik', rozmiar:f.size}; skBusy.push(job); skRenderList();
    try{ const dane=await skB64(f); await skPost({akcja:'wyslij', nazwa:f.name||'plik', typ:f.type||'application/octet-stream', dane, od:skNazwa}); }
    catch(e){ skErr=String(e.message||e); }
    skBusy=skBusy.filter(x=>x!==job); skRenderList();
  }
  await skLoad();
}
/* ——— pobieranie ——— */
async function skBlob(it){
  if(skBlobs[it.id]) return skBlobs[it.id];
  const d=await skGet('pobierz',{id:it.id}); const bin=atob(d.dane), u=new Uint8Array(bin.length);
  for(let i=0;i<bin.length;i++) u[i]=bin.charCodeAt(i);
  return (skBlobs[it.id]=new Blob([u],{type:d.typ||it.typ}));
}
async function skDownload(it, btn){
  const t0=btn.textContent; btn.textContent='Pobieranie…'; btn.disabled=true;
  try{ const b=await skBlob(it); const a=document.createElement('a'); a.href=URL.createObjectURL(b); a.download=it.nazwa; document.body.appendChild(a); a.click(); setTimeout(()=>{ URL.revokeObjectURL(a.href); a.remove(); },4000); btn.textContent='✓ Pobrano'; }
  catch(e){ skErr=String(e.message||e); btn.textContent=t0; skRenderList(); }
  btn.disabled=false; setTimeout(()=>{ if(btn.isConnected) btn.textContent=t0; },2500);
}
async function skShare(it, btn){
  try{ btn.disabled=true; const b=await skBlob(it), f=new File([b], it.nazwa, {type:b.type});
    if(navigator.canShare && navigator.canShare({files:[f]})) await navigator.share({files:[f], title:it.nazwa}); else skDownload(it, btn); }
  catch(e){ if(e.name!=='AbortError'){ skErr=String(e.message||e); skRenderList(); } }
  btn.disabled=false;
}

/* ——— widok ——— */
const skSize = b => b<1024?b+' B':b<1048576?(b/1024).toFixed(0)+' KB':(b/1048576).toFixed(b<10485760?1:0).replace('.',',')+' MB';
const skAgo = ts => { const s=(Date.now()-ts)/1000; if(s<60) return 'przed chwilą'; if(s<3600) return Math.floor(s/60)+' min temu'; if(s<86400) return Math.floor(s/3600)+' godz. temu';
  const d=new Date(ts); return d.toLocaleDateString('pl-PL',{day:'numeric',month:'short'})+', '+d.toLocaleTimeString('pl-PL',{hour:'2-digit',minute:'2-digit'}); };
const skLink = t => esc(t).replace(/(https?:\/\/[^\s<]+)/g,'<a href="$1" target="_blank" rel="noopener">$1</a>');
function skIco(it){
  const e=(it.nazwa.split('.').pop()||'').toLowerCase(), t=it.typ||'';
  const k=/^image\//.test(t)?'img':/pdf/.test(t)||e==='pdf'?'pdf':/^video\//.test(t)?'vid':/^audio\//.test(t)?'aud':/zip|rar|7z|tar|gz/.test(e)?'zip':/xlsx?|csv|ods/.test(e)?'xls':/docx?|odt|rtf/.test(e)?'doc':/dwg|dxf/.test(e)?'cad':'file';
  const L={img:'IMG',pdf:'PDF',vid:'VID',aud:'MP3',zip:'ZIP',xls:'XLS',doc:'DOC',cad:'CAD',file:(e||'?').slice(0,4).toUpperCase()};
  return `<span class="sk-ico sk-${k}" aria-hidden="true">${esc(L[k])}</span>`;
}
const skMobile = () => matchMedia('(pointer:coarse)').matches;
function skItemHtml(it){
  const mine=it.od===skNazwa, meta=`<span class="sk-meta">${mine?'z tego urządzenia':esc(it.od||'inne urządzenie')} · ${skAgo(it.kiedy)}</span>`;
  const del=`<button type="button" class="sk-x" data-sk="del" data-id="${esc(it.id)}" aria-label="Usuń" title="Usuń">×</button>`;
  if(it.tekst!==null && it.tekst!==undefined){
    const url=(it.tekst.trim().match(/^https?:\/\/\S+$/)||[])[0];
    return `<li class="sk-it sk-txt${mine?' mine':''}">${meta}<div class="sk-tbody">${skLink(it.tekst)}</div>
      <div class="sk-acts"><button type="button" data-sk="copy" data-id="${esc(it.id)}">Kopiuj</button>${url?`<a class="sk-open" href="${esc(url)}" target="_blank" rel="noopener">Otwórz ↗</a>`:''}${del}</div></li>`;
  }
  return `<li class="sk-it${mine?' mine':''}">${skIco(it)}<div class="sk-fb"><b title="${esc(it.nazwa)}">${esc(it.nazwa)}</b>${meta.replace('</span>',` · ${skSize(it.rozmiar)}</span>`)}</div>
    <div class="sk-acts"><button type="button" class="sk-dl" data-sk="get" data-id="${esc(it.id)}">Pobierz</button>${skMobile()&&navigator.share?`<button type="button" data-sk="share" data-id="${esc(it.id)}">Udostępnij</button>`:''}${del}</div></li>`;
}
function skListHtml(){
  if(!skPolaczenie()) return `<div class="sk-info"><b>Skrzynka potrzebuje połączenia z Arkuszem Google.</b><p>Działa przez ten sam skrypt co zapis danych strony. Gdy strona jest połączona z Arkuszem na obu urządzeniach, możesz od razu przesyłać pliki.</p></div>`;
  if(skStary) return `<div class="sk-info"><b>Zaktualizuj skrypt w Arkuszu.</b><ol><li>Arkusz Google → Rozszerzenia → Apps Script.</li><li>Wklej cały nowy plik <code>apps-script/Kod.gs</code> (zostaw swój KLUCZ).</li><li>Wdróż → Zarządzaj wdrożeniami → ołówek → Wersja: <i>Nowa wersja</i> → Wdróż.</li><li>Zgódź się na dostęp do Dysku Google — tam trafiają pliki.</li></ol></div>`;
  const busy=skBusy.map(j=>`<li class="sk-it busy"><span class="sk-spin" aria-hidden="true"></span><div class="sk-fb"><b>${esc(j.nazwa)}</b><span class="sk-meta">Wysyłanie${j.rozmiar?' · '+skSize(j.rozmiar):''}…</span></div></li>`).join('');
  if(skList===null) return `<ul class="sk-list">${busy}</ul><p class="sk-empty">Wczytywanie…</p>`;
  return `<ul class="sk-list">${busy}${skList.map(skItemHtml).join('')}</ul>${!skList.length&&!skBusy.length?`<p class="sk-empty">Skrzynka jest pusta. Wyślij coś z tego urządzenia — pojawi się na drugim.</p>`:''}`;
}
function skPanelHtml(){
  const ok=skPolaczenie() && !skStary;
  return `<div class="sk-head"><div><h2>Skrzynka</h2><label class="sk-dev">To urządzenie: <input id="skDev" value="${esc(skNazwa)}" maxlength="30" aria-label="Nazwa tego urządzenia"></label></div>
      <button type="button" class="sk-close" data-sk="close" aria-label="Zamknij">✕</button></div>
    ${ok?`<form class="sk-send" id="skSend">
      <textarea name="t" rows="2" placeholder="Wpisz tekst albo wklej link…" aria-label="Tekst do wysłania"></textarea>
      <div class="sk-sbar"><label class="sk-files"><svg viewBox="0 0 16 16" aria-hidden="true"><path d="M13 7.5 8 12.5a3.2 3.2 0 0 1-4.5-4.5L8.8 2.7a2.1 2.1 0 0 1 3 3L6.6 10.9a1 1 0 0 1-1.5-1.5L9.8 4.7"/></svg>Pliki<input type="file" multiple id="skFile" hidden></label>
        <span class="sk-hint">${skMobile()?'':'albo przeciągnij tutaj · Ctrl+V'}</span><button type="submit">Wyślij</button></div></form>`:''}
    <div class="sk-err" id="skErr"${skErr?'':' hidden'}>${esc(skErr)}<button type="button" data-sk="errx" aria-label="Zamknij">✕</button></div>
    <div class="sk-body" id="skBody">${skListHtml()}</div>
    ${ok&&skList&&skList.length?`<div class="sk-foot"><span>Pliki są na Twoim Dysku Google 7 dni</span><button type="button" data-sk="clear">Wyczyść wszystko</button></div>`:''}
    <div class="sk-drop" aria-hidden="true"><span>Upuść, żeby wysłać</span></div>`;
}
function skRender(){
  let sc=$('#skScrim'), p=$('#skPanel');
  if(!skOpen){ sc&&sc.remove(); p&&p.remove(); document.body.classList.remove('sk-lock'); return; }
  if(!p){ sc=document.createElement('div'); sc.id='skScrim'; sc.className='sk-scrim'; document.body.appendChild(sc);
    p=document.createElement('aside'); p.id='skPanel'; p.className='sk-panel'; p.setAttribute('role','dialog'); p.setAttribute('aria-modal','true'); p.setAttribute('aria-label','Skrzynka'); document.body.appendChild(p); }
  p.innerHTML=skPanelHtml(); document.body.classList.add('sk-lock');
}
function skRenderList(){
  if(!skOpen) return; const b=$('#skBody'); if(!b) return skRender();
  b.innerHTML=skListHtml(); const e=$('#skErr'); if(e){ e.hidden=!skErr; e.innerHTML=`${esc(skErr)}<button type="button" data-sk="errx" aria-label="Zamknij">✕</button>`; }
  const p=$('#skPanel'); if(p && !p.querySelector('.sk-foot') && skList && skList.length && skPolaczenie() && !skStary) skRender();
}
function skBadge(){
  const b=$('#skBadge'); if(!b) return; const seen=+store.get('skSeen','0')||0;
  const n=(skList||[]).filter(it=>it.kiedy>seen && it.od!==skNazwa).length;
  b.hidden=!n; b.textContent=n>9?'9+':n;
}
function skToggle(on){
  skOpen=on; if(on){ store.set('skSeen', String(Date.now())); skErr=''; } skRender(); skBadge();
  if(on){ skLoad(); const t=$('#skSend textarea'); if(t && !skMobile()) setTimeout(()=>t.focus(),50); }
  skPlan();
}

/* ——— przycisk w nagłówku ——— */
(function(){
  const tools=document.querySelector('.hdr-tools'); if(!tools) return;
  tools.insertAdjacentHTML('afterbegin', `<button type="button" class="sk-btn" id="skBtn" data-sk="open" aria-label="Skrzynka — przesyłanie między urządzeniami" title="Skrzynka">
    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 13.5 5.6 5.4A1.5 1.5 0 0 1 7 4.5h10a1.5 1.5 0 0 1 1.4.9L21 13.5V18a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 18z"/><path d="M3 13.5h5l1.5 2.5h5l1.5-2.5h5"/></svg>
    <span class="sk-badge" id="skBadge" hidden></span></button>`);
  if(skPolaczenie()){ setTimeout(()=>skLoad().then(skPlan), 2500); }
})();

/* ——— zdarzenia ——— */
document.addEventListener('click', e=>{
  if(e.target.id==='skScrim') return skToggle(false);
  const b=e.target.closest('[data-sk]'); if(!b) return;
  const a=b.dataset.sk, it=(skList||[]).find(x=>x.id===b.dataset.id);
  if(a==='open') return skToggle(!skOpen);
  if(a==='close') return skToggle(false);
  if(a==='errx'){ skErr=''; const x=$('#skErr'); if(x) x.hidden=true; return; }
  if(a==='copy' && it){ (navigator.clipboard?navigator.clipboard.writeText(it.tekst):Promise.reject()).then(()=>{ b.textContent='✓ Skopiowano'; setTimeout(()=>{ if(b.isConnected) b.textContent='Kopiuj'; },1800); }).catch(()=>{ b.textContent='Nie udało się'; }); return; }
  if(a==='get' && it) return skDownload(it, b);
  if(a==='share' && it) return skShare(it, b);
  if(a==='del' && it){ skList=skList.filter(x=>x!==it); skRenderList(); skGet('usun',{id:it.id}).catch(er=>{ skErr=String(er.message||er); skLoad(); }); return; }
  if(a==='clear'){ if(!b.dataset.arm){ b.dataset.arm='1'; b.textContent='Na pewno? Usunie wszystko'; setTimeout(()=>{ if(b.isConnected){ delete b.dataset.arm; b.textContent='Wyczyść wszystko'; } },3500); return; }
    skList=[]; skRender(); skGet('wyczysc').then(skLoad).catch(er=>{ skErr=String(er.message||er); skLoad(); }); }
});
document.addEventListener('submit', e=>{ if(e.target.id!=='skSend') return; e.preventDefault(); const t=e.target.t; const v=t.value; t.value=''; skSendText(v); });
document.addEventListener('keydown', e=>{
  if(!skOpen) return;
  if(e.key==='Escape') return skToggle(false);
  if(e.key==='Enter' && !e.shiftKey && e.target.matches && e.target.matches('#skSend textarea') && !skMobile()){ e.preventDefault(); e.target.form.requestSubmit(); }
});
document.addEventListener('change', e=>{
  if(e.target.id==='skFile' && e.target.files.length){ skSendFiles(e.target.files); e.target.value=''; }
  if(e.target.id==='skDev'){ skNazwa=e.target.value.trim().slice(0,30)||skDomyslna(); store.set('skNazwa', skNazwa); skRenderList(); }
});
/* wklejanie plików (np. zrzut ekranu) i przeciąganie na panel */
document.addEventListener('paste', e=>{ if(!skOpen || !skPolaczenie() || skStary) return; const f=[...(e.clipboardData||{}).files||[]]; if(f.length){ e.preventDefault(); skSendFiles(f); } });
let skDragN=0;
document.addEventListener('dragenter', e=>{ if(!skOpen || ![...(e.dataTransfer||{}).types||[]].includes('Files')) return; skDragN++; const p=$('#skPanel'); p&&p.classList.add('drag'); });
document.addEventListener('dragleave', ()=>{ if(!skOpen) return; skDragN=Math.max(0,skDragN-1); if(!skDragN){ const p=$('#skPanel'); p&&p.classList.remove('drag'); } });
document.addEventListener('dragover', e=>{ if(skOpen && [...(e.dataTransfer||{}).types||[]].includes('Files')) e.preventDefault(); });
document.addEventListener('drop', e=>{ if(!skOpen) return; const f=[...(e.dataTransfer||{}).files||[]]; if(!f.length) return; e.preventDefault(); skDragN=0; const p=$('#skPanel'); p&&p.classList.remove('drag'); if(skPolaczenie() && !skStary) skSendFiles(f); });
