/* ════════════════════════════════════════════════════════════════════════
   UKRYWANIE KWOT (jak w aplikacji banku) — przycisk z okiem
   ════════════════════════════════════════════════════════════════════════
   Gdzie: strona Pieniądze (karty), okienka Finanse / Zakłady / Subskrypcje, widżet „Szybki wydatek”
   na stronie głównej i kwoty w „Najbliższe 2 tygodnie”.
   Jak: kwoty w tekście (np. „1 250,00 zł”, „−50,00”, „100 zł”) są owijane w <span class="kw">
   (MutationObserver — działa też po każdym odświeżeniu widoku), pola z kwotami i liczby na wykresach
   rozmywa CSS. Przy włączonym ukrywaniu body ma klasę „kasa-ukryta”.
   Stan zapamiętany na tym urządzeniu (store „kasaUkryta”). Ustawienie ⚙ → Ogólne → „Ukrywaj kwoty
   po uruchomieniu” (store „kasaStart”) — przy każdym otwarciu strony kwoty są zakryte.
   Krótki klik w zakrytą kwotę nic nie odkrywa (żeby nie pokazać jej przypadkiem) — tylko oko.
   ════════════════════════════════════════════════════════════════════════ */
const KW_ZAKRES = '#bkPage, #finModal, #bkModal, #sbModal, .w-fin, .hd-next';
const KW_RE = /[-−+]?\d{1,3}(?:[  ]\d{3})*(?:,\d{1,2})(?:[  ]?zł)?|[-−+]?\d[\d  ]*[  ]?zł/g;
let kasaUkryta = store.get('kasaStart','0')==='1' ? true : store.get('kasaUkryta','0')==='1';
const KW_OKO = on => on
  ? '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 3l18 18"/><path d="M10.6 5.2A10.8 10.8 0 0 1 12 5c5 0 8.6 4.3 9.7 6.3a1.4 1.4 0 0 1 0 1.4 17 17 0 0 1-3.1 3.9M6.6 6.7A16.6 16.6 0 0 0 2.3 11.3a1.4 1.4 0 0 0 0 1.4C3.4 14.7 7 19 12 19a9.9 9.9 0 0 0 5.3-1.6"/><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2"/></svg>'
  : '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2.3 11.3C3.4 9.3 7 5 12 5s8.6 4.3 9.7 6.3a1.4 1.4 0 0 1 0 1.4C20.6 14.7 17 19 12 19s-8.6-4.3-9.7-6.3a1.4 1.4 0 0 1 0-1.4z"/><circle cx="12" cy="12" r="3"/></svg>';
const kwBtn = cls => `<button type="button" class="kw-oko ${cls||''}" data-kwoko="1" aria-pressed="${kasaUkryta}" aria-label="${kasaUkryta?'Pokaż kwoty':'Ukryj kwoty'}" title="${kasaUkryta?'Pokaż kwoty':'Ukryj kwoty'}">${KW_OKO(kasaUkryta)}</button>`;

function kasaUstaw(on){
  kasaUkryta=!!on; store.set('kasaUkryta', kasaUkryta?'1':'0');
  document.body.classList.toggle('kasa-ukryta', kasaUkryta);
  document.querySelectorAll('[data-kwoko]').forEach(b=>{ b.setAttribute('aria-pressed',kasaUkryta); b.setAttribute('aria-label',kasaUkryta?'Pokaż kwoty':'Ukryj kwoty'); b.title=kasaUkryta?'Pokaż kwoty':'Ukryj kwoty'; b.innerHTML=KW_OKO(kasaUkryta); });
}
/* owijanie kwot w tekście */
function kwOwin(root){
  const w=document.createTreeWalker(root, NodeFilter.SHOW_TEXT, { acceptNode:n=>{ const p=n.parentNode; if(!p||!n.nodeValue||!/\d/.test(n.nodeValue)) return 2;
    if(p.closest('.kw,script,style,textarea,select,option,svg,[contenteditable="true"],.kw-skip')) return 2; return 1; } });
  const L=[]; while(w.nextNode()) L.push(w.currentNode);
  L.forEach(n=>{ const t=n.nodeValue; KW_RE.lastIndex=0; if(!KW_RE.test(t)) return; KW_RE.lastIndex=0;
    const f=document.createDocumentFragment(); let i=0, m;
    while((m=KW_RE.exec(t))){ if(m.index>i) f.appendChild(document.createTextNode(t.slice(i,m.index))); const s=document.createElement('span'); s.className='kw'; s.textContent=m[0]; f.appendChild(s); i=m.index+m[0].length; }
    if(i<t.length) f.appendChild(document.createTextNode(t.slice(i))); n.parentNode.replaceChild(f,n); });
}
/* przyciski z okiem: nagłówki okienek, widżet, strona Pieniądze */
function kwPrzyciski(){
  document.querySelectorAll('#finModal .tr-top, #bkModal .tr-top, #sbModal .tr-top').forEach(t=>{ if(t.querySelector('[data-kwoko]')) return; const x=t.querySelector('.tr-x'); if(x){ const g=document.createElement('div'); g.className='kw-topg'; x.replaceWith(g); g.insertAdjacentHTML('beforeend', kwBtn('kw-tr')); g.appendChild(x); } });
  document.querySelectorAll('.w-fin .w-head').forEach(h=>{ if(!h.querySelector('[data-kwoko]')) h.lastElementChild.insertAdjacentHTML('beforebegin', kwBtn('kw-w')); });
  const bp=document.getElementById('bkPage'); if(bp){ const h=bp.previousElementSibling; if(h && h.tagName==='H1' && !h.querySelector('[data-kwoko]')){ h.classList.add('kw-h1'); h.insertAdjacentHTML('beforeend', kwBtn('kw-page')); } }
}
let kwT=0;
function kwSkan(){ kwT=0; kwPrzyciski(); document.querySelectorAll(KW_ZAKRES).forEach(kwOwin); }
new MutationObserver(ms=>{ if(kwT) return; if(!ms.some(m=>[...m.addedNodes].some(n=>n.nodeType===3||n.nodeType===1&&!(n.classList&&n.classList.contains('kw'))))) return;
  kwT=requestAnimationFrame(kwSkan); }).observe(document.documentElement, {childList:true, subtree:true, characterData:true});
document.addEventListener('click', e=>{ const b=e.target.closest&&e.target.closest('[data-kwoko]'); if(b){ e.preventDefault(); e.stopPropagation(); kasaUstaw(!kasaUkryta); } }, true);
kasaUstaw(kasaUkryta); requestAnimationFrame(kwSkan);
