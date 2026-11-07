/* ════════════════════════════════════════════════════════════════════════
   STRONA GŁÓWNA I CV
   ════════════════════════════════════════════════════════════════════════
   pStart() – strona główna: powitanie, 3 kafle „ostatnio odwiedzane”, widżety
              (zegar, pogoda, szybkie notatki).
              • ostatnio odwiedzane zapisuje router (js/13-router.js → zapamiętajWizytę),
              • pogodę pobiera js/11-pasek-dolny.js (wspólna dla widżetu i paska),
              • ikony kafli i nazwy działów: stałe HOME_ICONS / HOME_SECTION niżej.
   pCV()    – podstrona O mnie → CV.
   Każda funkcja pXxx() zwraca HTML strony jako tekst; router wstawia go do <div id="page">.
   ════════════════════════════════════════════════════════════════════════ */

/* ——— STRONA GŁÓWNA ——— */
/* ikony kafli (SVG 24×24, rysowane kreską) — klucz = adres strony po # */
const HOME_ICONS={
  todo:'<path d="M4 6.5l2 2 3.5-3.5M4 13.5l2 2 3.5-3.5M13 7h7M13 14h7M4 20h16"/>',
  notatki:'<path d="M6 3h9l4 4v14H6z"/><path d="M9 11h7M9 15h7M9 7h3"/>',
  kalkulatory:'<rect x="5" y="3" width="14" height="18" rx="2"/><path d="M8 7h8M8 11h2M12 11h0M16 11h0M8 15h2M12 15h0M16 15h0M8 18h2M12 18h4"/>',
  dyski:'<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>',
  wot:'<path d="M3 15h14l2-3H5zM6 12l1-3h7l1 3M12 9V6h7"/><circle cx="6" cy="18" r="1.5"/><circle cx="10" cy="18" r="1.5"/><circle cx="14" cy="18" r="1.5"/>',
  fs25:'<path d="M4 16V9h7l2 4h5v3"/><circle cx="7" cy="17" r="2.5"/><circle cx="17" cy="17" r="2"/><path d="M8 9V6h3"/>',
  silownia:'<path d="M3 12h18M6 8v8M18 8v8M3 10v4M21 10v4"/>',
  posiadowki:'<path d="M8 3h8l-1 7a3 3 0 0 1-6 0zM12 13v6M8 21h8"/>',
  cv:'<circle cx="12" cy="8" r="3.5"/><path d="M5 20a7 7 0 0 1 14 0"/>'
};
const HOME_SECTION={studia:'Studia', gry:'Gry', inne:'Inne', 'o-mnie':'O mnie'};
const HOME_FALLBACK=['todo','silownia','wot'];           /* gdy nie odwiedziłeś jeszcze 3 stron */

function homeAgo(t){ const m=Math.round((Date.now()-t)/60000);
  if(m<1) return 'przed chwilą'; if(m<60) return m+' min temu'; const h=Math.round(m/60); if(h<24) return h+' godz. temu';
  const d=Math.round(h/24); return d===1?'wczoraj':d+' dni temu'; }
function homeRecent(){ let L=[]; try{ L=JSON.parse(store.get('recentPages','[]'))||[]; }catch(e){}
  L=L.filter(x=>ROUTES[x.k] && x.k!=='start');
  HOME_FALLBACK.forEach(k=>{ if(L.length<3 && !L.some(x=>x.k===k)) L.push({k,t:0}); });
  return L.slice(0,3); }
function homeTile(x,i){ const r=ROUTES[x.k];
  return `<a class="home-tile ht-${i}" href="#${x.k}">
    <span class="ht-ic" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">${HOME_ICONS[x.k]||HOME_ICONS.notatki}</svg></span>
    <span class="label">${esc(HOME_SECTION[r.parent]||'Pracownia')}</span>
    <b>${esc(r.title)}</b>
    <span class="ht-foot"><span>${x.t?homeAgo(x.t):'proponowane'}</span><span class="ht-go" aria-hidden="true">→</span></span></a>`; }

function homeGreeting(){ const h=new Date().getHours();
  return h<5?['Dobranoc','']:h<12?['Dzień ','dobry']:h<18?['Dzień ','dobry']:['Dobry ','wieczór']; }

function pStart(){
  const [g1,g2]=homeGreeting();
  return `<h1 class="home-h1">${g1}<span class="acc">${g2}</span>${g2?'':''}, Eryk</h1>
  <section class="home-recent" aria-label="Ostatnio odwiedzane"><div class="home-tiles">${homeRecent().map(homeTile).join('')}</div></section>
  <section class="home-widgets">
    ${widgetClock()}
    ${widgetWeather()}
    ${widgetQuick()}
  </section>`;
}

/* ——— widżet: zegar ——— */
function widgetClock(){
  let ticks=''; for(let i=0;i<12;i++){ const a=i*30*Math.PI/180, r1=i%3?40:36; ticks+=`<line x1="${50+r1*Math.sin(a)}" y1="${50-r1*Math.cos(a)}" x2="${50+44*Math.sin(a)}" y2="${50-44*Math.cos(a)}"/>`; }
  return `<article class="widget w-clock"><div class="w-head"><span class="label">Zegar</span></div>
    <div class="clock-wrap"><svg class="aclock" viewBox="0 0 100 100" aria-hidden="true"><circle cx="50" cy="50" r="47" class="ac-face"/><g class="ac-ticks">${ticks}</g>
      <line id="acH" x1="50" y1="50" x2="50" y2="27" class="ac-h"/><line id="acM" x1="50" y1="50" x2="50" y2="16" class="ac-m"/><line id="acS" x1="50" y1="56" x2="50" y2="12" class="ac-s"/><circle cx="50" cy="50" r="2.6" class="ac-c"/></svg>
      <div class="clock-txt"><b id="wcTime">--:--</b><span id="wcDate"></span><span id="wcWeek" class="w-sub"></span></div></div></article>`;
}
/* ——— widżet: pogoda (dane z js/11-pasek-dolny.js) ——— */
function widgetWeather(){
  return `<article class="widget w-weather" id="wWeather">${weatherWidgetHtml()}</article>`;
}
/* ——— widżet: szybkie notatki (zapis automatyczny; na claude.ai synchronizowane) ——— */
function widgetQuick(){
  return `<article class="widget w-quick"><div class="w-head"><span class="label">Szybkie notatki</span><span class="w-sub" id="qnState"></span></div>
    <textarea id="qnText" placeholder="Zapisz coś na szybko…" aria-label="Szybkie notatki">${esc(store.get('quickNote',''))}</textarea></article>`;
}
let qnTimer=null;
document.addEventListener('input', e=>{ if(e.target.id!=='qnText') return;
  const v=e.target.value; store.set('quickNote',v); $('#qnState').textContent='zapisywanie…'; clearTimeout(qnTimer);
  qnTimer=setTimeout(()=>{ cloud(db=>db.collection('cfg').doc('szybkie').set({t:v, u:Date.now()})); const st=$('#qnState'); if(st) st.textContent='zapisano'; },700); });
function quickNoteFromCloud(t){ if(typeof t!=='string' || t===store.get('quickNote','')) return; store.set('quickNote',t);
  const el=$('#qnText'); if(el && document.activeElement!==el) el.value=t; }

/* ——— CV ——— */
function pCV(){
  const f = t => `<span class="fill">${t}</span>`;
  return `<h1>Curriculum<br><span class="acc">vitae</span></h1>
  <div class="cv">
    <div>
      <div class="photo">ZDJĘCIE<br>3 × 4</div>
      <dl>
        <div><dt>Imię i nazwisko</dt><dd>Eryk ${f('nazwisko')}</dd></div>
        <div><dt>Kierunek</dt><dd>Budownictwo</dd></div>
        <div><dt>Uczelnia</dt><dd>Politechnika Białostocka</dd></div>
        <div><dt>Telefon</dt><dd>${f('+48 ___ ___ ___')}</dd></div>
        <div><dt>E-mail</dt><dd>${f('adres e-mail')}</dd></div>
        <div><dt>Miejscowość</dt><dd>${f('miasto')}</dd></div>
        <div><dt>Prawo jazdy</dt><dd>${f('kat.')}</dd></div>
      </dl>
    </div>
    <div>
      <div class="cv-sec"><h2>Wykształcenie</h2><div class="tl">
        <div class="tl-item"><div class="when">${f('rrrr')} – obecnie</div><div><h3>Politechnika Białostocka</h3><p>Wydział Budownictwa i Nauk o Środowisku · Budownictwo, studia I stopnia (inż.)</p><p>Praca inżynierska: ${f('temat')}</p></div></div>
        <div class="tl-item"><div class="when">${f('rrrr – rrrr')}</div><div><h3>${f('Szkoła średnia')}</h3><p>${f('profil')}</p></div></div>
      </div></div>
      <div class="cv-sec"><h2>Doświadczenie</h2><div class="tl">
        <div class="tl-item"><div class="when">${f('mm.rrrr')}</div><div><h3>${f('Praktyki / praca')}</h3><p>${f('firma, zakres obowiązków')}</p></div></div>
      </div></div>
      <div class="cv-sec"><h2>Umiejętności</h2>
        <div class="ph"><b>Do uzupełnienia:</b> programy (np. AutoCAD, Revit, Robot, Excel), języki obce z poziomem, uprawnienia i kursy.</div>
      </div>
      <div class="cv-sec"><h2>Zainteresowania</h2><p style="margin:0;color:var(--muted)">Trening siłowy, gry strategiczne i symulatory.</p></div>
    </div>
  </div>`;
}
