/* ════════════════════════════════════════════════════════════════════════
   STRONA GŁÓWNA I CV
   ════════════════════════════════════════════════════════════════════════
   pStart() – strona główna: powitanie, pulpit (js/26-pulpit.js) i widżety
              (pogoda, szybkie notatki, szybki wydatek → js/17-finanse.js, cele WoT).
              • pogodę pobiera js/11-pasek-dolny.js.
   pCV()    – podstrona O mnie → CV: w js/18-cv.js.
   Każda funkcja pXxx() zwraca HTML strony jako tekst; router wstawia go do <div id="page">.
   ════════════════════════════════════════════════════════════════════════ */

/* ——— STRONA GŁÓWNA ——— */
function homeGreeting(){ const h=new Date().getHours();
  return h<5?['Dobranoc','']:h<12?['Dzień ','dobry']:h<18?['Dzień ','dobry']:['Dobry ','wieczór']; }

function pStart(){
  const [g1,g2]=homeGreeting(), n=new Date();
  const dzien=n.toLocaleDateString('pl-PL',{weekday:'long',day:'numeric',month:'long'});
  return `<section class="hello" aria-label="Powitanie"><div><span class="label">${esc(dzien)}</span><h1 class="hello-t">${esc((g1+g2).replace(/\s+/g,' ').trim())}${store.get('imie','Eryk')?', '+esc(store.get('imie','Eryk')):''}</h1></div>
    <div class="hello-time"><span class="label">Teraz</span><b id="heroTime">${n.toLocaleTimeString('pl-PL',{hour:'2-digit',minute:'2-digit'})}</b></div></section>
  ${typeof homeDash==='function'?homeDash():''}
  <section class="home-widgets">
    ${typeof widgetFin==='function'?widgetFin():''}
    ${typeof hdCeleWrap==='function'?hdCeleWrap():''}
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
/* ——— widżet: szybkie notatki (zapis automatyczny, synchronizowane z Arkuszem) ——— */
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

/* ——— CV: przeniesione do js/18-cv.js (podgląd, edycja, eksport PDF) ——— */
