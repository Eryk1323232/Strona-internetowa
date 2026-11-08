/* ════════════════════════════════════════════════════════════════════════
   DOLNY PASEK (jak w Vivaldi) + POGODA + ZRZUTY EKRANU
   ════════════════════════════════════════════════════════════════════════
   Pasek przyklejony na dole każdej strony:
     lewa strona  – „Wycinek” (zaznaczasz myszką obszar) i „Cała strona”,
     prawa strona – pogoda, data i godzina (odświeżane co sekundę).
   Pogoda: darmowe API open-meteo.com (bez klucza). Miasto zmieniasz w widżecie
   pogody na stronie głównej (kliknij nazwę miasta). Wynik trzymany 20 min w pamięci.
   Zrzuty: biblioteka html-to-image (ładowana z CDN dopiero przy pierwszym zrzucie)
   rysuje stronę do obrazka; potem możesz go skopiować albo pobrać jako PNG.
   ════════════════════════════════════════════════════════════════════════ */

/* ——— pogoda ——— */
const WX_DEFAULT={n:'Białystok', lat:53.1325, lon:23.1688};
let WX_CITY=(()=>{ try{ return JSON.parse(store.get('wxCity','null'))||WX_DEFAULT; }catch(e){ return WX_DEFAULT; } })();
let WX={state:'idle', data:null, t:0, editing:false};
try{ const c=JSON.parse(store.get('wxCache','null')); if(c && c.city===WX_CITY.n && Date.now()-c.t<6*3600e3){ WX={...WX, state:'ok', data:c.data, t:c.t}; } }catch(e){}

/* kod pogody WMO → [opis, ikona] */
function wxInfo(code, day=true){
  const c=+code;
  if(c===0) return ['Bezchmurnie', day?'sun':'moon'];
  if(c<=2) return [c===1?'Przeważnie słonecznie':'Częściowe zachmurzenie', day?'partly':'moon'];
  if(c===3) return ['Pochmurno','cloud'];
  if(c===45||c===48) return ['Mgła','fog'];
  if(c>=51&&c<=57) return ['Mżawka','drizzle'];
  if((c>=61&&c<=67)||(c>=80&&c<=82)) return [c>=80?'Przelotny deszcz':'Deszcz','rain'];
  if((c>=71&&c<=77)||c===85||c===86) return ['Śnieg','snow'];
  if(c>=95) return ['Burza','storm'];
  return ['—','cloud'];
}
const WX_IC={
  sun:'<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
  moon:'<path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z"/>',
  partly:'<path d="M8 4v1.5M3.5 8.5H5M4.8 4.8l1 1M12 6.4A4 4 0 0 0 5.6 11"/><path d="M8 19h9a4 4 0 0 0 .5-8 5.5 5.5 0 0 0-10.4 1.6A3.2 3.2 0 0 0 8 19z"/>',
  cloud:'<path d="M7 19h10a4.5 4.5 0 0 0 .6-9 6 6 0 0 0-11.5 1.8A3.6 3.6 0 0 0 7 19z"/>',
  fog:'<path d="M4 9h16M3 13h18M5 17h14"/>',
  drizzle:'<path d="M7 15h10a4 4 0 0 0 .5-8 5.5 5.5 0 0 0-10.4 1.6A3.2 3.2 0 0 0 7 15z"/><path d="M9 18l-.5 1.5M13 18l-.5 1.5M17 18l-.5 1.5"/>',
  rain:'<path d="M7 14h10a4 4 0 0 0 .5-8 5.5 5.5 0 0 0-10.4 1.6A3.2 3.2 0 0 0 7 14z"/><path d="M8.5 17l-1.5 3.5M12.5 17L11 20.5M16.5 17L15 20.5"/>',
  snow:'<path d="M7 14h10a4 4 0 0 0 .5-8 5.5 5.5 0 0 0-10.4 1.6A3.2 3.2 0 0 0 7 14z"/><path d="M8 18h.01M12 19h.01M16 18h.01M10 21h.01M14 21h.01"/>',
  storm:'<path d="M7 14h10a4 4 0 0 0 .5-8 5.5 5.5 0 0 0-10.4 1.6A3.2 3.2 0 0 0 7 14z"/><path d="M12.5 15l-2 3.5h3l-2 3.5"/>'
};
const wxSvg=(k,cls='')=>`<svg class="wx-ic ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${WX_IC[k]||WX_IC.cloud}</svg>`;

async function wxLoad(force){
  if(WX.state==='loading') return;
  if(!force && WX.data && Date.now()-WX.t<20*60e3) return wxRefreshUI();
  WX.state=WX.data?'ok':'loading'; wxRefreshUI();
  const u=`https://api.open-meteo.com/v1/forecast?latitude=${WX_CITY.lat}&longitude=${WX_CITY.lon}&current=temperature_2m,apparent_temperature,relative_humidity_2m,weather_code,wind_speed_10m,is_day&daily=weather_code,temperature_2m_max,temperature_2m_min&timezone=auto&forecast_days=4`;
  try{
    const r=await fetch(u); if(!r.ok) throw new Error(r.status);
    const d=await r.json(); if(!d.current) throw new Error('brak danych');
    WX={...WX, state:'ok', data:d, t:Date.now()}; store.set('wxCache', JSON.stringify({city:WX_CITY.n, t:WX.t, data:d}));
  }catch(e){ WX.state=WX.data?'ok':'err'; }
  wxRefreshUI();
}
async function wxSetCity(q){
  const r=await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(q)}&count=1&language=pl`);
  const d=await r.json(); const g=d&&d.results&&d.results[0]; if(!g) throw new Error('nie znaleziono');
  WX_CITY={n:g.name, lat:g.latitude, lon:g.longitude}; store.set('wxCity', JSON.stringify(WX_CITY)); WX={state:'idle', data:null, t:0, editing:false}; wxLoad(true);
}
function weatherWidgetHtml(){
  const head=`<div class="w-head"><span class="label">Pogoda</span>${WX.editing
    ?`<form class="wx-city-f"><input name="q" value="${esc(WX_CITY.n)}" aria-label="Miasto" autocomplete="off"><button type="submit">OK</button></form>`
    :`<button type="button" class="wx-city" data-wx="edit" title="Zmień miasto">${esc(WX_CITY.n)} ✎</button>`}</div>`;
  if(WX.state==='err') return head+`<div class="wx-msg"><p>Nie udało się pobrać pogody.</p><button type="button" class="td-btn" data-wx="retry">Spróbuj ponownie</button></div>`;
  if(!WX.data) return head+`<div class="wx-msg"><p>Wczytywanie…</p></div>`;
  const c=WX.data.current, [lbl,ic]=wxInfo(c.weather_code, c.is_day!==0), dl=WX.data.daily;
  const days=dl.time.slice(1,4).map((t,i)=>{ const [l,k]=wxInfo(dl.weather_code[i+1]);
    return `<div class="wx-day"><span>${new Date(t+'T12:00').toLocaleDateString('pl-PL',{weekday:'short'})}</span>${wxSvg(k)}<b>${Math.round(dl.temperature_2m_max[i+1])}°</b><em>${Math.round(dl.temperature_2m_min[i+1])}°</em></div>`; }).join('');
  return head+`<div class="wx-now">${wxSvg(ic,'big')}<div><b class="wx-t">${Math.round(c.temperature_2m)}°</b><span>${lbl}</span></div></div>
    <div class="wx-meta"><span>odczuwalna ${Math.round(c.apparent_temperature)}°</span><span>wilgotność ${c.relative_humidity_2m}%</span><span>wiatr ${Math.round(c.wind_speed_10m)} km/h</span></div>
    <div class="wx-days">${days}</div>`;
}
function wxRefreshUI(){
  const w=$('#wWeather'); if(w && !(WX.editing && w.querySelector('.wx-city-f'))) w.innerHTML=weatherWidgetHtml();
  const b=$('#sbWx'); if(!b) return;
  if(WX.data){ const c=WX.data.current, [lbl,ic]=wxInfo(c.weather_code, c.is_day!==0); b.innerHTML=`${wxSvg(ic)}<b>${Math.round(c.temperature_2m)}°</b><span class="sb-hide">${esc(WX_CITY.n)}</span>`; b.title=`${WX_CITY.n}: ${lbl}`; }
  else b.innerHTML=WX.state==='err'?'<span>pogoda —</span>':'<span>…</span>';
}
document.addEventListener('click', e=>{ const b=e.target.closest('[data-wx]'); if(!b) return;
  if(b.dataset.wx==='edit'){ WX.editing=true; wxRefreshUI(); const i=$('.wx-city-f input'); i&&(i.focus(),i.select()); }
  if(b.dataset.wx==='retry') wxLoad(true); });
document.addEventListener('submit', async e=>{ if(!e.target.matches('form.wx-city-f')) return; e.preventDefault();
  const q=e.target.q.value.trim(); WX.editing=false; if(!q||q===WX_CITY.n){ wxRefreshUI(); return; }
  try{ await wxSetCity(q); }catch(err){ wxRefreshUI(); const w=$('#wWeather .wx-msg, #wWeather .wx-meta'); if(w) w.insertAdjacentHTML('beforebegin','<p class="wx-err">Nie znaleziono miasta „'+esc(q)+'”.</p>'); } });

/* ——— zegar: pasek + widżet na stronie głównej ——— */
function isoWeek(d){ const t=new Date(Date.UTC(d.getFullYear(),d.getMonth(),d.getDate())); const day=t.getUTCDay()||7; t.setUTCDate(t.getUTCDate()+4-day);
  const y=new Date(Date.UTC(t.getUTCFullYear(),0,1)); return Math.ceil(((t-y)/864e5+1)/7); }
function tickClock(){
  const n=new Date(), hm=n.toLocaleTimeString('pl-PL',{hour:'2-digit',minute:'2-digit'}), s=String(n.getSeconds()).padStart(2,'0');
  const bt=$('#sbTime'); if(bt) bt.innerHTML=`${hm}<em>:${s}</em>`;
  const ht=$('#heroTime'); if(ht) ht.textContent=hm;
  const bd=$('#sbDate'); if(bd) bd.textContent=n.toLocaleDateString('pl-PL',{weekday:'short',day:'numeric',month:'short'});
  const wt=$('#wcTime'); if(!wt) return;
  wt.innerHTML=`${hm}<em>:${s}</em>`; $('#wcDate').textContent=n.toLocaleDateString('pl-PL',{weekday:'long',day:'numeric',month:'long',year:'numeric'});
  $('#wcWeek').textContent=`tydzień ${isoWeek(n)}`;
  const H=(n.getHours()%12+n.getMinutes()/60)*30, M=(n.getMinutes()+n.getSeconds()/60)*6, S=n.getSeconds()*6;
  [['acH',H],['acM',M],['acS',S]].forEach(([id,a])=>{ const el=document.getElementById(id); if(el) el.setAttribute('transform',`rotate(${a} 50 50)`); });
}

/* ——— pasek ——— */
const SB_IC={
  snip:'<path d="M4 8V5a1 1 0 0 1 1-1h3M16 4h3a1 1 0 0 1 1 1v3M20 16v3a1 1 0 0 1-1 1h-3M8 20H5a1 1 0 0 1-1-1v-3"/><path d="M9 12h6M12 9v6"/>',
  page:'<rect x="5" y="3" width="14" height="18" rx="2"/><path d="M9 3v3h6V3M9 12h6M9 16h4"/>'
};
document.body.insertAdjacentHTML('beforeend', `<footer id="sbar" class="sbar" aria-label="Pasek stanu">
  <div class="sb-l"><button type="button" class="sb-btn" data-snip="area" title="Wytnij zaznaczony obszar"><svg class="wx-ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${SB_IC.snip}</svg><span class="sb-hide">Wycinek</span></button>
    <button type="button" class="sb-btn" data-snip="page" title="Zrzut całej strony"><svg class="wx-ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${SB_IC.page}</svg><span class="sb-hide">Cała strona</span></button></div>
  <div class="sb-r"><button type="button" class="sb-sync" id="sbSync" data-s="local"><i aria-hidden="true"></i><span class="sb-hide"></span></button><span class="sb-sep" aria-hidden="true"></span><a class="sb-wx" id="sbWx" href="#start" title="Pogoda"></a><span class="sb-sep" aria-hidden="true"></span><span class="sb-date" id="sbDate"></span><span class="sb-time" id="sbTime"></span></div></footer>`);
/* stan zapisu danych (kropka w pasku): zielona = zapisane w chmurze/Arkuszu, żółta = łączenie, czerwona = błąd, szara = tylko ta przeglądarka */
function sbSyncRefresh(){ const b=$('#sbSync'); if(!b) return;
  const L={cloud:'Zapisano', wait:'Łączenie…', err:'Błąd zapisu', local:'Tylko lokalnie'};
  b.dataset.s=syncState; b.querySelector('span').textContent=L[syncState]||''; b.title=syncText(); b.setAttribute('aria-label','Stan zapisu: '+syncText()); }
document.addEventListener('click', e=>{ if(e.target.closest('#sbSync')) snipToast(syncText()+(syncState==='err'&&window.arkuszBlad?' Szczegóły: '+window.arkuszBlad:'')+' [v9]'); });   /* na telefonie: dotknij kropki */
sbSyncRefresh(); setInterval(sbSyncRefresh, 2000);
tickClock(); setInterval(tickClock, 1000);
wxRefreshUI(); wxLoad(); setInterval(()=>wxLoad(), 30*60e3);

/* ——— zrzuty ekranu ——— */
let H2I=null;
function loadH2I(){ if(window.htmlToImage) return Promise.resolve(window.htmlToImage); if(H2I) return H2I;
  H2I=new Promise((ok,no)=>{ const s=document.createElement('script'); s.src='https://cdn.jsdelivr.net/npm/html-to-image@1.11.11/dist/html-to-image.js';
    s.onload=()=>window.htmlToImage?ok(window.htmlToImage):no(new Error('brak biblioteki')); s.onerror=()=>{ H2I=null; no(new Error('nie wczytano biblioteki')); }; document.head.appendChild(s); });
  return H2I; }
const SNIP_SKIP=new Set(['sbar','snipLayer','snipModal','snipScrim','trScrim','trModal','mxScrim','mxModal','dkScrim','dkModal']);
async function snapPage(){
  const lib=await loadH2I(), b=document.body;
  return lib.toCanvas(b, {pixelRatio:Math.min(2, window.devicePixelRatio||1), skipFonts:true, cacheBust:false,
    backgroundColor:getComputedStyle(b).backgroundColor, width:b.scrollWidth, height:b.scrollHeight,
    filter:n=>!(n.id && SNIP_SKIP.has(n.id))});
}
function snipToast(t){ let el=$('#snipToast'); if(!el){ el=document.createElement('div'); el.id='snipToast'; el.className='snip-toast'; document.body.appendChild(el); }
  el.textContent=t; el.classList.add('on'); clearTimeout(el._t); el._t=setTimeout(()=>el.classList.remove('on'), 2600); }
async function doSnip(rect){
  snipToast('Robię zrzut…');
  try{
    const full=await snapPage(); let cv=full;
    if(rect){ const pr=full.width/document.body.scrollWidth; cv=document.createElement('canvas'); cv.width=Math.round(rect.w*pr); cv.height=Math.round(rect.h*pr);
      cv.getContext('2d').drawImage(full, Math.round((rect.x+scrollX)*pr), Math.round((rect.y+scrollY)*pr), cv.width, cv.height, 0, 0, cv.width, cv.height); }
    snipShow(cv);
    $('#snipToast')?.classList.remove('on');
  }catch(e){ snipToast('Nie udało się zrobić zrzutu. W Windows możesz użyć Win+Shift+S.'); }
}
function snipArea(){
  const L=document.createElement('div'); L.id='snipLayer'; L.className='snip-layer'; L.innerHTML='<div class="snip-hint">Zaznacz obszar myszką · Esc anuluje</div><div class="snip-box" hidden></div>';
  document.body.appendChild(L); const box=L.querySelector('.snip-box'); let st=null;
  const end=()=>{ L.remove(); document.removeEventListener('keydown',esc_,true); };
  const esc_=e=>{ if(e.key==='Escape'){ e.stopPropagation(); end(); } };
  document.addEventListener('keydown',esc_,true);
  L.addEventListener('pointerdown',e=>{ st={x:e.clientX,y:e.clientY}; L.setPointerCapture(e.pointerId); box.hidden=false; Object.assign(box.style,{left:st.x+'px',top:st.y+'px',width:'0px',height:'0px'}); });
  L.addEventListener('pointermove',e=>{ if(!st) return; const x=Math.min(st.x,e.clientX), y=Math.min(st.y,e.clientY); Object.assign(box.style,{left:x+'px',top:y+'px',width:Math.abs(e.clientX-st.x)+'px',height:Math.abs(e.clientY-st.y)+'px'}); });
  L.addEventListener('pointerup',e=>{ if(!st) return; const r={x:Math.min(st.x,e.clientX), y:Math.min(st.y,e.clientY), w:Math.abs(e.clientX-st.x), h:Math.abs(e.clientY-st.y)}; st=null; end();
    if(r.w<8||r.h<8) return; requestAnimationFrame(()=>doSnip(r)); });
}
let SNIP_BLOB=null;
function snipShow(cv){
  cv.toBlob(b=>{ SNIP_BLOB=b; }, 'image/png');
  const url=cv.toDataURL('image/png');
  const sc=document.createElement('div'); sc.id='snipScrim'; sc.className='tr-scrim';
  const md=document.createElement('div'); md.id='snipModal'; md.className='tr-modal'; md.setAttribute('role','dialog'); md.setAttribute('aria-modal','true');
  md.innerHTML=`<div class="tr-panel snip-panel"><div class="tr-top"><div><span class="label">Zrzut ekranu</span><h2>Gotowe</h2></div><button type="button" class="tr-x" data-snipact="close" aria-label="Zamknij">✕</button></div>
    <div class="snip-prev"><img src="${url}" alt="Podgląd zrzutu"></div>
    <div class="tr-foot"><span class="tr-err" id="snipMsg"></span><button type="button" class="td-btn" data-snipact="copy">Kopiuj</button><button type="button" class="tr-save" data-snipact="save">Pobierz PNG</button></div></div>`;
  document.body.append(sc, md); document.body.classList.add('tr-lock');
}
function snipClose(){ $('#snipScrim')?.remove(); $('#snipModal')?.remove(); if(!$('#trModal,#mxModal,#dkModal')) document.body.classList.remove('tr-lock'); }
document.addEventListener('click', async e=>{
  const s=e.target.closest('[data-snip]'); if(s){ if(s.dataset.snip==='area') snipArea(); else doSnip(null); return; }
  if(e.target.id==='snipScrim'||e.target.id==='snipModal') return snipClose();
  const b=e.target.closest('[data-snipact]'); if(!b) return;
  const msg=t=>{ const m=$('#snipMsg'); if(m) m.textContent=t; };
  if(b.dataset.snipact==='close') return snipClose();
  if(!SNIP_BLOB){ msg('Chwilka…'); return; }
  if(b.dataset.snipact==='copy'){
    try{ await navigator.clipboard.write([new ClipboardItem({'image/png':SNIP_BLOB})]); msg('Skopiowano do schowka ✓'); }catch(err){ msg('Przeglądarka nie pozwala kopiować obrazów — użyj „Pobierz PNG”.'); }
  }
  if(b.dataset.snipact==='save'){
    const name=`zrzut-${new Date().toISOString().slice(0,16).replace(/[T:]/g,'-')}.png`;
    const dl=window.claude?.use ? await window.claude.use('downloads') : null;
    if(dl){ try{ await dl.save({filename:name, data:SNIP_BLOB}); msg('Zapisano ✓'); }catch(err){ msg(err&&err.code==='declined'?'Anulowano.':'Nie udało się zapisać.'); } }
    else { const a=document.createElement('a'); a.href=URL.createObjectURL(SNIP_BLOB); a.download=name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(()=>URL.revokeObjectURL(a.href),4000); msg('Pobrano ✓'); }
  }
});
document.addEventListener('keydown', e=>{ if(e.key==='Escape' && $('#snipModal')){ e.stopPropagation(); snipClose(); } }, true);
