/* ════════════════════════════════════════════════════════════════════════
   WIDŻET NA PULPIT — ta sama strona w trybie małego okienka:  ./?widzet=1#widzet
   ════════════════════════════════════════════════════════════════════════
   Zakładki (przełączane u góry, zapamiętane): Kalendarz (miesiąc + wydarzenia dnia),
   Dziś (zadania z odhaczaniem, trening, najbliższe 2 tygodnie), Kasa (szybki wydatek + ile zostaje).
   • Instalacja na Windows: ⚙ → Ogólne → „Widżet na pulpit” → Otwórz widżet → w Chrome/Edge
     ikona „Zainstaluj” w pasku adresu. Osobna aplikacja „Pracownia – widżet”
     (manifest-widzet.webmanifest, bez paska tytułu: window-controls-overlay).
   • Lively Wallpaper (widżet wbudowany w pulpit): „Kopiuj link do Lively” — link ma w sobie
     połączenie z Arkuszem (Lively ma własną przeglądarkę, bez Twoich danych). Hasło znika z adresu
     po pierwszym otwarciu (js/12-synchronizacja.js → arkuszUstawienia).
   • Dane odświeżają się same (synchronizacja co 30 s + przerysowanie co minutę i po powrocie do okna).
   • Kliknięcie w coś, co prowadzi do innej podstrony, otwiera pełną Pracownię w przeglądarce.
   ════════════════════════════════════════════════════════════════════════ */
const WZ_TRYB = /[?&]widzet(=|&|$)/.test(location.search);
const WZ_TABS = [['kal','Kalendarz'],['dzis','Dziś'],['kasa','Kasa']];
let wzTab = store.get('wzTab','kal'), wzM = todayISO().slice(0,7), wzSel = '', wzT = 0;
if(WZ_TRYB){
  document.documentElement.classList.add('tryb-widzet');
  if(location.hash!=='#widzet') history.replaceState(null,'', location.pathname+location.search+'#widzet');
  /* przejście na inną podstronę → pełna strona w nowym oknie, widżet zostaje */
  addEventListener('hashchange', ()=>{ if(location.hash!=='#widzet'){ const h=location.hash; history.replaceState(null,'','#widzet'); window.open('./'+h,'pracownia'); render(); } });
  setInterval(()=>wzOdswiez(), 60000);
  addEventListener('focus', ()=>wzOdswiez());
  document.addEventListener('visibilitychange', ()=>{ if(!document.hidden) wzOdswiez(); });
}

function wzKal(){
  const [y,m]=wzM.split('-').map(Number), pierw=new Date(y,m-1,1,12), start=new Date(pierw); start.setDate(1-(pierw.getDay()+6)%7);
  const od=kalIso(start), konIso=(()=>{ const d=new Date(start); d.setDate(d.getDate()+41); return kalIso(d); })(), td=todayISO();
  const M=typeof kalZbierz==='function'?kalZbierz(od,konIso):{};
  const dni=[]; for(let i=0;i<42;i++){ const d=new Date(start); d.setDate(start.getDate()+i); dni.push(kalIso(d)); }
  const ost=dni.slice(35).every(d=>d.slice(0,7)!==wzM)?dni.slice(0,35):dni;
  const sel=wzSel||td;
  const grid=ost.map(d=>{ const E=(M[d]||[]).filter(e=>!kalOff.has(e.k)), k=[...new Set(E.map(e=>e.k))];
    return `<button type="button" class="wz-d${d.slice(0,7)!==wzM?' out':''}${d===td?' today':''}${d===sel?' sel':''}" data-wzd="${d}"><span>${+d.slice(8)}</span><i>${k.slice(0,3).map(x=>`<b style="background:${KAL_KAT[x][1]}"></b>`).join('')}</i></button>`; }).join('');
  /* lista: wybrany dzień, a gdy pusty — najbliższe 7 dni */
  let tyt, L;
  const E0=(M[sel]||(typeof kalZbierz==='function'?kalZbierz(sel,sel)[sel]:[])||[]).filter(e=>!kalOff.has(e.k));
  if(E0.length){ tyt=sel===td?'Dziś':new Date(sel+'T12:00').toLocaleDateString('pl-PL',{weekday:'long', day:'numeric', month:'long'}); L=E0.map(e=>({d:sel,...e})); }
  else { const Z=typeof kalZbierz==='function'?kalZbierz(sel,isoAdd(sel,7)):{}; tyt=(sel===td?'Dziś nic — ':'Pusto — ')+'najbliższe 7 dni';
    L=Object.entries(Z).sort((a,b)=>a[0].localeCompare(b[0])).flatMap(([d,E])=>E.filter(e=>!e.done&&!kalOff.has(e.k)).map(e=>({d,...e}))); }
  const tm=new Date(y,m-1,1).toLocaleDateString('pl-PL',{month:'long', year:'numeric'});
  return `<div class="wz-kh"><button type="button" data-wzm="-1" aria-label="Poprzedni miesiąc">‹</button><b>${esc(tm)}</b><button type="button" data-wzm="1" aria-label="Następny miesiąc">›</button></div>
    <div class="wz-g">${['Pn','Wt','Śr','Cz','Pt','So','Nd'].map(x=>`<span class="wz-wd">${x}</span>`).join('')}${grid}</div>
    <div class="wz-lh">${esc(tyt)}</div>
    ${L.length?`<ul class="wz-l">${L.slice(0,8).map(e=>`<li${e.done?' class="done"':''}><b style="background:${KAL_KAT[e.k][1]}"></b><span>${esc(e.n)}<small>${e.d!==sel?hdDni(e.d)+(e.tm?', ':''):''}${e.tm||''}${e.sub?(e.tm||e.d!==sel?' · ':'')+esc(e.sub):''}</small></span>${e.kw?`<em class="${e.wpl?'plus':'minus'}">${e.wpl?'+':'−'}${kalZl(e.kw)}</em>`:''}</li>`).join('')}</ul>`:'<p class="wz-pusto">Brak wydarzeń.</p>'}`;
}
function wzPanel(){
  if(wzTab==='dzis') return `<section class="hd-grid wz-hd" id="homeDash">${hdTodo()}${hdTrening()}${hdNajblizsze()}</section>`;
  if(wzTab==='kasa') return typeof widgetFin==='function'?widgetFin():'<p class="wz-pusto">Brak modułu Pieniądze.</p>';
  return wzKal();
}
function pWidzet(){
  return `<div class="wz" id="wz"><div class="wz-top"><div class="seg wz-tabs" role="tablist">${WZ_TABS.map(([k,n])=>`<button type="button" role="tab" data-wztab="${k}" aria-selected="${wzTab===k}">${n}</button>`).join('')}</div>
    <button type="button" class="wz-ref" data-wzref="1" title="Odśwież" aria-label="Odśwież"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 11.5A8 8 0 1 0 17.7 17"/><path d="M20 4.5v7h-7"/></svg></button></div>
    <div class="wz-body" id="wzBody">${wzPanel()}</div>
    <div class="wz-foot"><span id="wzCzas">${new Date().toLocaleTimeString('pl-PL',{hour:'2-digit',minute:'2-digit'})}</span><a href="./#start" target="pracownia">Otwórz Pracownię ↗</a></div></div>`;
}
function wzOdswiez(sila){
  const b=$('#wzBody'); if(!b) return;
  if(!sila && b.contains(document.activeElement) && /INPUT|SELECT|TEXTAREA/.test(document.activeElement.tagName)) return;   /* nie przeszkadzaj w pisaniu */
  b.innerHTML=wzPanel(); const c=$('#wzCzas'); if(c) c.textContent=new Date().toLocaleTimeString('pl-PL',{hour:'2-digit',minute:'2-digit'});
}
document.addEventListener('click', e=>{
  if(!e.target.closest || !e.target.closest('#wz')) return;
  const t=e.target.closest('[data-wztab]'); if(t){ wzTab=t.dataset.wztab; store.set('wzTab',wzTab); document.querySelectorAll('[data-wztab]').forEach(x=>x.setAttribute('aria-selected',x===t)); return wzOdswiez(true); }
  const r=e.target.closest('[data-wzref]'); if(r){ r.classList.add('spin'); setTimeout(()=>location.reload(),200); return; }
  const m=e.target.closest('[data-wzm]'); if(m){ const [y,mm]=wzM.split('-').map(Number), d=new Date(y,mm-1+(+m.dataset.wzm),1); wzM=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`; wzSel=''; return wzOdswiez(true); }
  const d=e.target.closest('[data-wzd]'); if(d){ wzSel=d.dataset.wzd===wzSel?'':d.dataset.wzd; if(wzSel && wzSel.slice(0,7)!==wzM) wzM=wzSel.slice(0,7); return wzOdswiez(true); }
});
/* dane przyszły z Arkusza → przerysuj (synchronizacja woła homeRefresh / finRefresh) */
if(WZ_TRYB){ const opak=n=>{ const f=window[n]; if(typeof f!=='function') return; window[n]=function(){ const w=f.apply(this,arguments); if(wzTab==='kal'){ clearTimeout(wzT); wzT=setTimeout(()=>wzOdswiez(),300); } return w; }; };
  ['homeRefresh','finRefresh','tdRefresh','kalRefresh'].forEach(opak); }

/* ustawienia (⚙ → Ogólne) */
function wzOtworz(){ window.open('./?widzet=1#widzet', 'pracownia-widzet', 'popup=yes,width=400,height=620'); }
async function wzKopiujLively(btn){
  const a=typeof arkuszUstawienia==='function'?arkuszUstawienia():null, u=new URL('./', location.href);
  u.search='?widzet=1'+(a?`&arkusz=${encodeURIComponent(a.url)}&klucz=${encodeURIComponent(a.klucz||'')}`:''); u.hash='widzet';
  try{ await navigator.clipboard.writeText(u.href); btn.textContent='✓ Skopiowano'; }catch(e){ prompt('Skopiuj link:', u.href); }
  setTimeout(()=>{ if(btn.isConnected) btn.textContent='Kopiuj link do Lively'; },2500);
}
function wzUstawieniaHtml(){
  return setRow('Widżet na pulpit','Małe okienko z kalendarzem, zadaniami na dziś i szybkim wydatkiem (przełączasz u góry). Otwórz → w Chrome/Edge kliknij „Zainstaluj” w pasku adresu → aplikacja „Pracownia – widżet”. Ustaw rozmiar i miejsce; prawy klik na ikonie → „Uruchamiaj przy logowaniu”.',
    `<div class="set-acts"><button type="button" class="td-btn" data-setact="wzopen">Otwórz widżet</button><button type="button" class="td-btn" data-setact="wzlively" title="Lively Wallpaper — darmowy program, który wstawia stronę na pulpit pod ikonami">Kopiuj link do Lively</button></div>`);
}
