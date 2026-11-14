/* ════════════════════════════════════════════════════════════════
   GRY → podstrona „Gry” (#gierki) — drobne gierki offline
   Każda gierka to wpis w GIERKI: {k klucz, n nazwa, opis, ic ikona SVG (path), html() treść okienka, start(el) po otwarciu, stop() po zamknięciu}.
   Kafelki jak w Pracy; kliknięcie otwiera okienko (style tr-modal). Rekordy gierek: store 'gierkiRek' {klucz: wynik}.
   ════════════════════════════════════════════════════════════════ */
const GIERKI = [];   /* tu dopisujemy kolejne gierki */
let gkGra=null;
const gierkiRek = () => { try{ return JSON.parse(store.get('gierkiRek','{}'))||{}; }catch(e){ return {}; } };
function gierkaRekord(k, wynik, lepszyMniejszy){ const R=gierkiRek(), s=R[k]; const nowy=s===undefined||(lepszyMniejszy?wynik<s:wynik>s);
  if(nowy){ R[k]=wynik; store.set('gierkiRek', JSON.stringify(R)); } return nowy; }
function pGierki(){
  const R=gierkiRek();
  return `<h1>Gr<span class="acc">y</span></h1>
    ${GIERKI.length?`<div class="calc-cards gk-cards">${GIERKI.map(g=>`<button type="button" class="calc-card res" data-gierka="${g.k}"><div class="calc-ic" aria-hidden="true"><svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="${g.ic}"/></svg></div>
      <h2>${esc(g.n)}</h2><span class="calc-count">${esc(g.opis)}${R[g.k]!==undefined?` · rekord: ${esc(String(R[g.k]))}`:''}</span><span class="calc-open">Graj →</span></button>`).join('')}</div>`
    :`<div class="nt-blank gk-pusto"><svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="6" y="14" width="36" height="22" rx="11"/><path d="M15 21v8M11 25h8"/><circle cx="31" cy="23" r="1.6"/><circle cx="35" cy="27" r="1.6"/></svg>
      <p>Tu pojawią się drobne gierki offline — działają bez internetu, rekordy zapisują się na tym urządzeniu.</p></div>`}`;
}
function gierkaZamknij(){ const g=GIERKI.find(x=>x.k===gkGra); if(g&&g.stop) g.stop(); gkGra=null;
  ['#gkScrim','#gkModal'].forEach(s=>{ const e=$(s); e&&e.remove(); }); document.body.classList.remove('tr-lock'); }
function gierkaOtworz(k){ const g=GIERKI.find(x=>x.k===k); if(!g) return; gierkaZamknij(); gkGra=k;
  const sc=document.createElement('div'); sc.id='gkScrim'; sc.className='tr-scrim'; document.body.appendChild(sc);
  const md=document.createElement('div'); md.id='gkModal'; md.className='tr-modal tr-wide'; md.setAttribute('role','dialog'); md.setAttribute('aria-modal','true'); md.setAttribute('aria-label',g.n);
  md.innerHTML=`<div class="tr-panel gk-panel"><div class="tr-top"><div><span class="label">Gra</span><h2>${esc(g.n)}</h2></div><button type="button" class="tr-x" data-gkclose="1" aria-label="Zamknij">✕</button></div><div class="gk-gra">${g.html()}</div></div>`;
  document.body.appendChild(md); document.body.classList.add('tr-lock'); if(g.start) g.start(md.querySelector('.gk-gra')); }
document.addEventListener('click', e=>{
  const c=e.target.closest('[data-gierka]'); if(c) return gierkaOtworz(c.dataset.gierka);
  if(gkGra && (e.target.closest('[data-gkclose]') || e.target.id==='gkScrim' || e.target.id==='gkModal')) gierkaWyjdz();
});
function gierkaWyjdz(){ gierkaZamknij(); if(typeof render==='function' && render.ost==='gierki') $('#page').innerHTML=pGierki(); }   /* rekord na kafelku od razu */
document.addEventListener('keydown', e=>{ if(gkGra && e.key==='Escape'){ e.stopPropagation(); gierkaWyjdz(); } }, true);
