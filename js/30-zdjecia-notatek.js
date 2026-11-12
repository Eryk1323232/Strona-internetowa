/* ════════════════════════════════════════════════════════════════════════
   NOTATKI → ZDJĘCIA (przycisk w pasku, wklejanie Ctrl+V, przeciąganie pliku)
   ════════════════════════════════════════════════════════════════════════
   Zdjęcie NIE jest zapisywane w treści notatki (komórka Arkusza mieści tylko 50 000 znaków).
   • W treści zostaje sam znacznik <img class="nt-img" data-zid="zd…"> (bez obrazka).
   • Plik (zmniejszony do 1600 px, JPEG) leży na Dysku Google w folderze
     „Pracownia – Zdjęcia notatek” — przez Apps Script (akcje zdjecie / zdjeciePobierz w Kod.gs).
   • Na każdym urządzeniu pobrane zdjęcie trafia do pamięci przeglądarki (Cache „pracownia-zdjecia”),
     więc później otwiera się od razu, także offline.
   • Bez internetu / bez podłączonego Arkusza zdjęcie czeka w kolejce (store „zdjKolejka”)
     i jest wysyłane później (przy starcie strony i co 2 minuty).
   ════════════════════════════════════════════════════════════════════════ */
const NTZ_CACHE = 'pracownia-zdjecia', NTZ_URL = {}, NTZ_LAD = {};
let ntzKolejka = (()=>{ try{ return JSON.parse(store.get('zdjKolejka','[]'))||[]; }catch(e){ return []; } })();
const ntzZapiszKolejke = () => store.set('zdjKolejka', JSON.stringify(ntzKolejka));
const ntzKlucz = zid => new URL('./__zdjecia/'+zid, location.href).href;
const ntzMsg = t => (typeof ntStatus==='function' ? ntStatus(t) : null);

/* pamięć przeglądarki (Cache Storage; gdy niedostępna — tylko do zamknięcia karty) */
const NTZ_MEM = {};
async function ntzPut(zid, blob){ NTZ_MEM[zid]=blob; try{ const c=await caches.open(NTZ_CACHE); await c.put(ntzKlucz(zid), new Response(blob,{headers:{'Content-Type':blob.type||'image/jpeg'}})); }catch(e){} }
async function ntzGet(zid){ if(NTZ_MEM[zid]) return NTZ_MEM[zid]; try{ const c=await caches.open(NTZ_CACHE), r=await c.match(ntzKlucz(zid)); if(r) return await r.blob(); }catch(e){} return null; }

/* zmniejszenie: dłuższy bok max 1600 px, JPEG 0.82 (zdjęcie z telefonu ~4 MB → ~300 kB) */
function ntzZmniejsz(file){
  return new Promise((ok, zle)=>{ const u=URL.createObjectURL(file), im=new Image();
    im.onload=()=>{ const k=Math.min(1, 1600/Math.max(im.naturalWidth, im.naturalHeight)), w=Math.round(im.naturalWidth*k), h=Math.round(im.naturalHeight*k);
      const cv=document.createElement('canvas'); cv.width=w; cv.height=h; const g=cv.getContext('2d'); g.fillStyle='#fff'; g.fillRect(0,0,w,h); g.drawImage(im,0,0,w,h);
      URL.revokeObjectURL(u); cv.toBlob(b=>b?ok(b):zle(new Error('Nie udało się przetworzyć zdjęcia')), 'image/jpeg', 0.82); };
    im.onerror=()=>{ URL.revokeObjectURL(u); zle(new Error('To nie jest obsługiwany obraz (HEIC? — zapisz jako JPG)')); };
    im.src=u; });
}
const ntzB64 = blob => new Promise(ok=>{ const r=new FileReader(); r.onload=()=>ok(String(r.result).split(',')[1]); r.readAsDataURL(blob); });

/* wysyłka na Dysk (z kolejką) */
let ntzWysyla = false;
async function ntzWyslijKolejke(){
  if(ntzWysyla || !ntzKolejka.length || typeof skPost!=='function' || !skPolaczenie() || !navigator.onLine) return;
  ntzWysyla = true;
  try{
    for(const zid of [...ntzKolejka]){
      const b=await ntzGet(zid); if(!b){ ntzKolejka=ntzKolejka.filter(x=>x!==zid); ntzZapiszKolejke(); continue; }
      try{ await skPost({akcja:'zdjecie', zid, typ:b.type||'image/jpeg', dane:await ntzB64(b)}); ntzKolejka=ntzKolejka.filter(x=>x!==zid); ntzZapiszKolejke(); }
      catch(e){ if(/Nieznana akcja/.test(e.message)) ntzMsg('Zdjęcie jest tylko na tym urządzeniu — zaktualizuj skrypt w Apps Script (Kod.gs), aby trafiało na Dysk'); else ntzMsg('Zdjęcie czeka na wysłanie (brak połączenia)'); break; }
    }
  } finally { ntzWysyla = false; }
}
addEventListener('online', ntzWyslijKolejke);
setInterval(ntzWyslijKolejke, 120000);
setTimeout(ntzWyslijKolejke, 4000);

/* wstawienie zdjęcia w miejscu kursora */
async function ntZdjWstaw(file){
  const r=ntRich(); if(!r || r.getAttribute('contenteditable')==='false') return;
  if(!/^image\//.test(file.type||'')) return ntzMsg('To nie jest zdjęcie');
  ntzMsg('Dodaję zdjęcie…');
  let blob; try{ blob=await ntzZmniejsz(file); }catch(e){ return ntzMsg(e.message); }
  const zid=uid('zd'); await ntzPut(zid, blob); NTZ_URL[zid]=URL.createObjectURL(blob);
  if(document.activeElement!==r){ r.focus(); if(ntLastRange){ const s=getSelection(); s.removeAllRanges(); s.addRange(ntLastRange); } }
  document.execCommand('insertHTML', false, `<div><img class="nt-img" data-zid="${zid}" src="${NTZ_URL[zid]}" alt=""></div><div><br></div>`);
  ntSave();
  ntzKolejka.push(zid); ntzZapiszKolejke();
  if(!skPolaczenie()) ntzMsg('Zdjęcie zapisane tylko na tym urządzeniu — podłącz Arkusz w Ustawieniach, aby było wszędzie');
  else { await ntzWyslijKolejke(); if(!ntzKolejka.includes(zid)) ntzMsg('Zdjęcie zapisane na Dysku'); }
}
function ntZdjWybierz(){
  const i=document.createElement('input'); i.type='file'; i.accept='image/*'; i.multiple=true;
  i.onchange=()=>{ [...i.files].reduce((p,f)=>p.then(()=>ntZdjWstaw(f)), Promise.resolve()); };
  i.click();
}

/* wyświetlanie: każdy <img data-zid> bez obrazka dostaje go z pamięci albo z Dysku */
async function ntzZaladuj(img){
  const zid=img.dataset.zid; if(!zid) return;
  if(NTZ_URL[zid]){ img.src=NTZ_URL[zid]; return; }
  img.classList.add('ld');
  if(!NTZ_LAD[zid]) NTZ_LAD[zid]=(async()=>{
    let b=await ntzGet(zid);
    if(!b && typeof skGet==='function' && skPolaczenie()){
      try{ const d=await skGet('zdjeciePobierz',{zid}); const bin=atob(d.dane), u8=new Uint8Array(bin.length); for(let k=0;k<bin.length;k++) u8[k]=bin.charCodeAt(k);
        b=new Blob([u8],{type:d.typ||'image/jpeg'}); await ntzPut(zid,b); }catch(e){}
    }
    if(b) NTZ_URL[zid]=URL.createObjectURL(b);
    delete NTZ_LAD[zid]; return NTZ_URL[zid]||'';
  })();
  const u=await NTZ_LAD[zid];
  document.querySelectorAll(`img.nt-img[data-zid="${zid}"]`).forEach(x=>{ x.classList.remove('ld'); if(u){ x.src=u; x.classList.remove('brak'); } else { x.classList.add('brak'); x.alt='Zdjęcie niedostępne — otwórz na urządzeniu, z którego je dodano, albo podłącz Arkusz'; } });
}
const ntzSkan = root => (root.querySelectorAll ? root.querySelectorAll('img.nt-img[data-zid]:not([src])') : []).forEach(ntzZaladuj);
new MutationObserver(ms=>ms.forEach(m=>m.addedNodes.forEach(n=>{ if(n.nodeType!==1) return; if(n.matches('img.nt-img[data-zid]:not([src])')) ntzZaladuj(n); else ntzSkan(n); })))
  .observe(document.documentElement, {childList:true, subtree:true});
document.addEventListener('DOMContentLoaded', ()=>ntzSkan(document));

/* przeciąganie pliku na notatkę */
document.addEventListener('dragover', e=>{ if(e.target.closest && e.target.closest('#ntRich') && [...(e.dataTransfer.items||[])].some(x=>x.kind==='file')){ e.preventDefault(); e.target.closest('#ntRich').classList.add('drop'); } });
document.addEventListener('dragleave', e=>{ const r=e.target.closest&&e.target.closest('#ntRich'); if(r) r.classList.remove('drop'); });
document.addEventListener('drop', e=>{ const r=e.target.closest&&e.target.closest('#ntRich'); if(!r) return; r.classList.remove('drop');
  const f=[...(e.dataTransfer.files||[])].filter(x=>/^image\//.test(x.type)); if(!f.length) return; e.preventDefault();
  const pos=document.caretRangeFromPoint?document.caretRangeFromPoint(e.clientX,e.clientY):null; if(pos){ const s=getSelection(); s.removeAllRanges(); s.addRange(pos); ntLastRange=pos.cloneRange(); }
  f.reduce((p,x)=>p.then(()=>ntZdjWstaw(x)), Promise.resolve()); });

/* dwuklik / dłuższe kliknięcie na zdjęcie → podgląd na cały ekran */
document.addEventListener('dblclick', e=>{ const im=e.target.closest&&e.target.closest('img.nt-img[src]'); if(!im) return; ntzPodglad(im.src); });
function ntzPodglad(src){
  const d=document.createElement('div'); d.className='ntz-lb'; d.innerHTML=`<img src="${src}" alt=""><button type="button" aria-label="Zamknij">✕</button>`;
  d.onclick=()=>d.remove(); document.body.appendChild(d);
  addEventListener('keydown', function k(e){ if(e.key==='Escape'){ d.remove(); removeEventListener('keydown',k); } });
}
