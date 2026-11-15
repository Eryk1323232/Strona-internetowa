/* ════════════════════════════════════════════════════════════════
   PRACA → kafelek „Pliki” — dokumenty PDF (normy, WT-2 itp.) do podglądu bez pobierania
   Plik: {id, n nazwa, zid, r rozmiar w bajtach, d data dodania, o kolejność}
     • lista: localStorage 'prPliki' + kolekcja 'prPliki' w Arkuszu (js/12-synchronizacja.js)
     • sam PDF: Dysk Google, folder „Pracownia – Zdjęcia notatek” (te same akcje Apps Script co zdjęcia: zdjecie / zdjeciePobierz),
       w przeglądarce w Cache „pracownia-zdjecia” (ntzPut / ntzBlob z js/30) — po pierwszym otwarciu działa od razu i offline.
       zid zaczyna się od 'pf'; zdjUzywane (js/37) liczy je jako używane, więc sprzątanie zdjęć ich nie usuwa.
   PODGLĄD: komputer — wbudowany podgląd PDF przeglądarki w okienku (wyszukiwanie, zoom, druk);
            telefon/tablet (pointer: coarse — tam ramka z PDF nie działa) — strony rysowane przez pdf.js (cdnjs).
   ════════════════════════════════════════════════════════════════ */
const PF_MAX = 25*1048576;   /* Apps Script przyjmuje ok. 50 MB w zapytaniu, base64 dokłada 1/3 */
const pfNorm = (id,v={}) => ({ id, n:String(v.n||'dokument.pdf').slice(0,140), zid:/^pf[\w-]+$/.test(v.zid||'')?v.zid:'', r:Math.max(0,+v.r||0), d:/^\d{4}-\d{2}-\d{2}$/.test(v.d||'')?v.d:todayISO(), o:+v.o||0 });
let PF=[]; try{ const c=JSON.parse(store.get('prPliki','null')); if(Array.isArray(c)) PF=c.map(x=>pfNorm(x.id,x)).filter(x=>x.zid); }catch(e){}
let pfM=false, pfSzukaj='', pfPodglad=null;
const savePf = () => store.set('prPliki', JSON.stringify(PF));
const pfPush = x => cloud(db=>{ const {id,...v}=x; return db.collection('prPliki').doc(id).set(v); });
const pfDel = id => cloud(db=>db.collection('prPliki').doc(id).delete());
const pfLista = () => [...PF].sort((a,b)=>a.o-b.o);
const pfIle = n => n+' '+(n===1?'plik':(n%10>=2&&n%10<=4&&(n%100<10||n%100>=20))?'pliki':'plików');
const PF_IC = '<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5h17l9 9v29H12z"/><path d="M29 5v9h9"/><path d="M18 26h12M18 32h12M18 38h7"/></svg>';
const pfKarta = () => `<button type="button" class="calc-card res" data-pfact="otworz"><div class="calc-ic" aria-hidden="true">${PF_IC}</div><h2>Pliki</h2><span class="calc-count" id="pfCount">${PF.length?pfIle(PF.length)+' · PDF do podglądu':'PDF do podglądu bez pobierania'}</span><span class="calc-open">Otwórz →</span></button>`;
function pfRefresh(){ const c=$('#pfCount'); if(c) c.textContent=PF.length?pfIle(PF.length)+' · PDF do podglądu':'PDF do podglądu bez pobierania'; if(pfM) pfRender(); }

/* ——— dodawanie ——— */
async function pfDodaj(files){
  const L=[...files]; let ok=0; const bl=[];
  for(const f of L){
    if(f.type!=='application/pdf' && !/\.pdf$/i.test(f.name)){ bl.push(`${f.name}: to nie jest PDF`); continue; }
    if(f.size>PF_MAX){ bl.push(`${f.name}: za duży (${zdjMB(f.size)}, limit 25 MB)`); continue; }
    const zid=uid('pf'), blob=new Blob([await f.arrayBuffer()],{type:'application/pdf'});
    await ntzPut(zid, blob); ntzKolejka.push(zid); ntzZapiszKolejke();
    const x=pfNorm(uid('pl'),{n:f.name, zid, r:f.size, d:todayISO(), o:Math.max(0,...PF.map(y=>y.o))+1});
    PF=[...PF,x]; savePf(); pfPush(x); ok++;
  }
  setTimeout(ntzWyslijKolejke, 50);
  pfRefresh(); const m=$('#pfMsg'); if(m) m.textContent=[ok?`Dodano ${pfIle(ok)}.${skPolaczenie()?' Wysyłam na Dysk…':' Plik jest na tym urządzeniu — trafi na Dysk po podłączeniu Arkusza.'}`:'', ...bl].filter(Boolean).join(' ');
}

/* ——— okienko z listą ——— */
function pfRender(){
  let sc=$('#pfScrim'), md=$('#pfModal');
  if(!pfM){ sc&&sc.remove(); md&&md.remove(); if(!pfPodglad) document.body.classList.remove('tr-lock'); return; }
  if(!md){ sc=document.createElement('div'); sc.id='pfScrim'; sc.className='tr-scrim'; document.body.appendChild(sc);
    md=document.createElement('div'); md.id='pfModal'; md.className='tr-modal tr-wide'; md.setAttribute('role','dialog'); md.setAttribute('aria-modal','true'); md.setAttribute('aria-label','Pliki'); document.body.appendChild(md);
    md.innerHTML=`<div class="tr-panel pf-panel"><div class="tr-top"><div><span class="label">Praca</span><h2>Pliki</h2></div><button type="button" class="tr-x" data-pfact="zamknij" aria-label="Zamknij">✕</button></div>
      <div class="pf-bar"><label class="pf-szuk"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="6.5"/><path d="m16 16 4 4"/></svg><input id="pfSzukaj" placeholder="Szukaj pliku…" aria-label="Szukaj pliku" autocomplete="off"></label>
        <label class="wz-add pf-dodaj"><input type="file" id="pfPlik" accept="application/pdf,.pdf" multiple hidden>+ Dodaj PDF</label></div>
      <p class="pf-msg" id="pfMsg" role="status"></p><div id="pfLista"></div>
      <p class="pf-pom">Możesz też przeciągnąć pliki PDF w to okienko. Pliki leżą na Twoim Dysku Google (folder „Pracownia – Zdjęcia notatek”), a po pierwszym otwarciu także w pamięci przeglądarki — otwierają się od razu, nawet offline.</p></div>`; }
  document.body.classList.add('tr-lock');
  const q=pfSzukaj.toLowerCase(), L=pfLista().filter(x=>!q||x.n.toLowerCase().includes(q)), czeka=new Set(ntzKolejka);
  $('#pfLista').innerHTML=L.length?`<ul class="pf-l">${L.map(x=>`<li class="pf-it"><button type="button" class="pf-otw" data-pfpod="${esc(x.id)}" title="Podgląd"><span class="pf-ik" aria-hidden="true">PDF</span>
        <span class="pf-n">${esc(x.n.replace(/\.pdf$/i,''))}</span><span class="pf-meta">${zdjMB(x.r)} · ${dPL(x.d)}${czeka.has(x.zid)?' · <em>czeka na wysłanie</em>':''}</span></button>
      <button type="button" class="ai-ib" data-pfnaz="${esc(x.id)}" title="Zmień nazwę" aria-label="Zmień nazwę ${esc(x.n)}"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20h4L19 9a2.8 2.8 0 0 0-4-4L4 16v4zM13.5 6.5l4 4"/></svg></button>
      <button type="button" class="ai-ib" data-pfpob="${esc(x.id)}" title="Pobierz" aria-label="Pobierz ${esc(x.n)}"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 4v11M7 10l5 5 5-5M5 20h14"/></svg></button>
      <button type="button" class="del" data-pfdel="${esc(x.id)}" aria-label="Usuń ${esc(x.n)}">×</button></li>`).join('')}</ul>`
    :`<div class="pf-pusto">${PF.length?'Nic nie pasuje do wyszukiwania.':'Brak plików — dodaj pierwszy PDF, np. WT-2.'}</div>`;
}

/* ——— podgląd ——— */
const pfDotyk = () => matchMedia('(pointer: coarse)').matches;
let pfJsLad=null;
function pfJs(){ if(window.pdfjsLib) return Promise.resolve(window.pdfjsLib);
  return pfJsLad||(pfJsLad=new Promise((ok,zle)=>{ const s=document.createElement('script'); s.src='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
    s.onload=()=>{ window.pdfjsLib.GlobalWorkerOptions.workerSrc='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js'; ok(window.pdfjsLib); };
    s.onerror=()=>{ pfJsLad=null; zle(new Error('Nie udało się wczytać przeglądarki PDF (brak internetu?)')); }; document.head.appendChild(s); })); }
function pfZamknijPodglad(){ if(!pfPodglad) return; if(pfPodglad.url) URL.revokeObjectURL(pfPodglad.url); if(pfPodglad.ob) pfPodglad.ob.disconnect(); if(pfPodglad.doc) pfPodglad.doc.destroy();
  pfPodglad=null; const v=$('#pfView'); v&&v.remove(); if(!pfM) document.body.classList.remove('tr-lock'); }
async function pfOtworz(id){
  const x=PF.find(y=>y.id===id); if(!x) return; pfZamknijPodglad();
  const v=document.createElement('div'); v.id='pfView'; v.className='pf-view'; v.setAttribute('role','dialog'); v.setAttribute('aria-modal','true'); v.setAttribute('aria-label',x.n);
  v.innerHTML=`<div class="pf-vtop"><b class="pf-vn">${esc(x.n.replace(/\.pdf$/i,''))}</b><span class="pf-vz" id="pfZoom"></span>
    <button type="button" class="uk-btn" data-pfpob="${esc(x.id)}">Pobierz</button><button type="button" class="tr-x" data-pfact="zamknijPodglad" aria-label="Zamknij podgląd">✕</button></div>
    <div class="pf-vbody" id="pfVBody"><div class="pf-lad"><span class="ai-kropki"><i></i><i></i><i></i></span><span>Otwieram ${esc(x.n)}…</span></div></div>`;
  document.body.appendChild(v); document.body.classList.add('tr-lock'); pfPodglad={id};
  const b=await ntzBlob(x.zid); if(!pfPodglad||pfPodglad.id!==id) return;
  const body=$('#pfVBody');
  if(!b){ body.innerHTML=`<div class="pf-lad">Nie udało się pobrać pliku z Dysku${skPolaczenie()?'':' — podłącz Arkusz w ustawieniach'}.</div>`; return; }
  const blob=b.type==='application/pdf'?b:new Blob([b],{type:'application/pdf'});
  if(!pfDotyk()){ pfPodglad.url=URL.createObjectURL(blob); body.innerHTML=`<iframe class="pf-ifr" src="${pfPodglad.url}#view=FitH" title="${esc(x.n)}"></iframe>`; return; }
  try{ const lib=await pfJs(), doc=await lib.getDocument({data:new Uint8Array(await blob.arrayBuffer())}).promise; if(!pfPodglad||pfPodglad.id!==id) return doc.destroy();
    pfPodglad.doc=doc; pfPodglad.skala=1; pfStrony(); }
  catch(e){ body.innerHTML=`<div class="pf-lad">${esc(e.message)}<br><button type="button" class="uk-btn" data-pfpob="${esc(x.id)}">Pobierz plik</button></div>`; }
}
function pfStrony(){   /* pdf.js: puste ramki stron, rysowanie dopiero gdy strona wjeżdża na ekran */
  const P=pfPodglad, body=$('#pfVBody'); if(!P||!P.doc||!body) return; if(P.ob) P.ob.disconnect();
  const sz=Math.min(body.clientWidth-16, 1100)*P.skala, dpr=Math.min(2.5,devicePixelRatio||1);
  body.innerHTML=Array.from({length:P.doc.numPages},(_,i)=>`<div class="pf-str" data-s="${i+1}" style="width:${sz}px;height:${sz*1.414}px"><span>${i+1}</span></div>`).join('');
  $('#pfZoom').innerHTML=`<button type="button" class="ai-ib" data-pfzoom="-1" aria-label="Pomniejsz">−</button><span>${Math.round(P.skala*100)}%</span><button type="button" class="ai-ib" data-pfzoom="1" aria-label="Powiększ">+</button><span class="pf-vs">${P.doc.numPages} str.</span>`;
  P.ob=new IntersectionObserver(E=>E.forEach(async en=>{ if(!en.isIntersecting||en.target.dataset.ok) return; en.target.dataset.ok='1';
    const pg=await P.doc.getPage(+en.target.dataset.s), w=pg.getViewport({scale:1}).width, vp=pg.getViewport({scale:sz/w*dpr}), cv=document.createElement('canvas');
    cv.width=vp.width; cv.height=vp.height; cv.style.width=sz+'px'; cv.style.height=(vp.height/dpr)+'px'; en.target.style.height='auto';
    await pg.render({canvasContext:cv.getContext('2d'), viewport:vp}).promise; en.target.replaceChildren(cv); }), {root:body, rootMargin:'600px 0px'});
  body.querySelectorAll('.pf-str').forEach(s=>P.ob.observe(s));
}
async function pfPobierz(id){ const x=PF.find(y=>y.id===id); if(!x) return; const b=await ntzBlob(x.zid); if(!b) return alert('Nie udało się pobrać pliku z Dysku.');
  const u=URL.createObjectURL(b), a=document.createElement('a'); a.href=u; a.download=/\.pdf$/i.test(x.n)?x.n:x.n+'.pdf'; document.body.appendChild(a); a.click(); a.remove(); setTimeout(()=>URL.revokeObjectURL(u), 4000); }

/* ——— zdarzenia ——— */
document.addEventListener('click', e=>{
  const a=e.target.closest('[data-pfact]'); if(a){ const c=a.dataset.pfact;
    if(c==='otworz'){ pfM=true; pfSzukaj=''; pfRender(); return; }
    if(c==='zamknij'){ pfM=false; return pfRender(); }
    if(c==='zamknijPodglad') return pfZamknijPodglad(); }
  if(e.target.id==='pfScrim' || e.target.id==='pfModal'){ pfM=false; return pfRender(); }
  const p=e.target.closest('[data-pfpod]'); if(p) return pfOtworz(p.dataset.pfpod);
  const g=e.target.closest('[data-pfpob]'); if(g) return pfPobierz(g.dataset.pfpob);
  const z=e.target.closest('[data-pfzoom]'); if(z && pfPodglad && pfPodglad.doc){ pfPodglad.skala=Math.max(.5,Math.min(3,pfPodglad.skala+(+z.dataset.pfzoom)*.25)); return pfStrony(); }
  const n=e.target.closest('[data-pfnaz]'); if(n){ const x=PF.find(y=>y.id===n.dataset.pfnaz); if(!x) return; const v=prompt('Nowa nazwa pliku:', x.n.replace(/\.pdf$/i,'')); if(!v||!v.trim()) return;
    const y=pfNorm(x.id,{...x, n:v.trim()+'.pdf'}); PF=PF.map(q=>q.id===x.id?y:q); savePf(); pfPush(y); return pfRender(); }
  const d=e.target.closest('[data-pfdel]'); if(d){ if(!d.dataset.pewne){ d.dataset.pewne='1'; d.textContent='Usunąć?'; d.classList.add('armed'); setTimeout(()=>{ if(d.isConnected){ delete d.dataset.pewne; d.textContent='×'; d.classList.remove('armed'); } },3000); return; }
    const x=PF.find(y=>y.id===d.dataset.pfdel); if(!x) return; PF=PF.filter(y=>y.id!==x.id); savePf(); pfDel(x.id);
    ntzKolejka=ntzKolejka.filter(q=>q!==x.zid); ntzZapiszKolejke(); if(skPolaczenie()) skPost({akcja:'zdjecieUsun', zid:x.zid}).catch(()=>{});
    caches.open(NTZ_CACHE).then(c=>c.delete(ntzKlucz(x.zid))).catch(()=>{}); delete NTZ_MEM[x.zid]; return pfRefresh(); }
});
document.addEventListener('change', e=>{ if(e.target.id==='pfPlik' && e.target.files.length){ pfDodaj(e.target.files); e.target.value=''; } });
document.addEventListener('input', e=>{ if(e.target.id==='pfSzukaj'){ pfSzukaj=e.target.value.trim(); pfRender(); } });
document.addEventListener('dragover', e=>{ if(pfM && e.target.closest && e.target.closest('#pfModal')){ e.preventDefault(); $('#pfModal .pf-panel').classList.add('pf-drop'); } });
document.addEventListener('dragleave', e=>{ const p=$('#pfModal .pf-panel'); if(p && !p.contains(e.relatedTarget)) p.classList.remove('pf-drop'); });
document.addEventListener('drop', e=>{ if(!pfM || !e.target.closest || !e.target.closest('#pfModal')) return; e.preventDefault(); $('#pfModal .pf-panel').classList.remove('pf-drop'); if(e.dataTransfer.files.length) pfDodaj(e.dataTransfer.files); });
document.addEventListener('keydown', e=>{ if(e.key!=='Escape') return; if(pfPodglad){ e.stopPropagation(); pfZamknijPodglad(); } else if(pfM && !(e.target.closest&&e.target.closest('input'))){ e.stopPropagation(); pfM=false; pfRender(); } }, true);
