/* ════════════════════════════════════════════════════════════════════════
   DOLNY PASEK (jak w Vivaldi) + POGODA
   ════════════════════════════════════════════════════════════════════════
   Pasek przyklejony na dole każdej strony:
     lewa strona  – stan zapisu danych (kropka: Arkusz / tylko lokalnie / błąd),
     prawa strona – data i godzina (odświeżane co sekundę).
   Pogoda: darmowe API open-meteo.com (bez klucza). Miasto zmieniasz w widżecie
   pogody na stronie głównej (kliknij nazwę miasta). Wynik trzymany 20 min w pamięci.
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
    :`<button type="button" class="wx-city" data-wx="edit" title="Zmień miasto">${esc(WX_CITY.n)} ${icn('olowek')}</button>`}</div>`;
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
}
document.addEventListener('click', e=>{ const b=e.target.closest('[data-wx]'); if(!b) return;
  if(b.dataset.wx==='edit'){ WX.editing=true; wxRefreshUI(); const i=$('.wx-city-f input'); i&&(i.focus(),i.select()); }
  if(b.dataset.wx==='retry') wxLoad(true); });
document.addEventListener('submit', async e=>{ if(!e.target.matches('form.wx-city-f')) return; e.preventDefault();
  const q=e.target.q.value.trim(); WX.editing=false; if(!q||q===WX_CITY.n){ wxRefreshUI(); return; }
  try{ await wxSetCity(q); }catch(err){ wxRefreshUI(); const w=$('#wWeather .wx-msg, #wWeather .wx-meta'); if(w) w.insertAdjacentHTML('beforebegin','<p class="wx-err">Nie znaleziono miasta „'+esc(q)+'”.</p>'); } });

/* ——— zegar: pasek dolny + godzina na stronie głównej ——— */
function tickClock(){
  const n=new Date(), hm=n.toLocaleTimeString('pl-PL',{hour:'2-digit',minute:'2-digit'}), s=String(n.getSeconds()).padStart(2,'0');
  const bt=$('#sbTime'); if(bt) bt.innerHTML=`${hm}<em>:${s}</em>`;
  const ht=$('#heroTime'); if(ht) ht.textContent=hm;
  const bd=$('#sbDate'); if(bd) bd.textContent=n.toLocaleDateString('pl-PL',{weekday:'short',day:'numeric',month:'short'});
}

/* ——— pasek ——— */
document.body.insertAdjacentHTML('beforeend', `<footer id="sbar" class="sbar" aria-label="Pasek stanu">
  <div class="sb-l"><button type="button" class="sb-sync" id="sbSync" data-s="local"><i aria-hidden="true"></i><span class="sb-hide"></span></button></div>
  <div class="sb-r"><span class="sb-date" id="sbDate"></span><span class="sb-time" id="sbTime"></span></div></footer>`);
/* stan zapisu danych (kropka w pasku): zielona = zapisane w chmurze/Arkuszu, żółta = łączenie, czerwona = błąd, szara = tylko ta przeglądarka */
function sbSyncRefresh(){ const b=$('#sbSync'); if(!b) return;
  const L={cloud:'Zapisano', wait:'Łączenie…', err:'Błąd zapisu', local:'Tylko lokalnie'};
  b.dataset.s=syncState; b.querySelector('span').textContent=L[syncState]||''; b.title=syncText(); b.setAttribute('aria-label','Stan zapisu: '+syncText()); }
document.addEventListener('click', e=>{ if(e.target.closest('#sbSync')) snipToast(syncText()+(syncState==='err'&&window.arkuszBlad?' Szczegóły: '+window.arkuszBlad:'')+''); });   /* na telefonie: dotknij kropki */
sbSyncRefresh(); setInterval(sbSyncRefresh, 2000);
tickClock(); setInterval(tickClock, 1000);
wxRefreshUI(); wxLoad(); setInterval(()=>wxLoad(), 30*60e3);

/* ——— krótki komunikat na dole ekranu ——— */
function snipToast(t){ let el=$('#snipToast'); if(!el){ el=document.createElement('div'); el.id='snipToast'; el.className='snip-toast'; document.body.appendChild(el); }
  el.textContent=t; el.classList.add('on'); clearTimeout(el._t); el._t=setTimeout(()=>el.classList.remove('on'), 2600); }
