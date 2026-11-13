/* ════════════════════════════════════════════════════════════════════════
   ANIMACJE OKIENEK — otwieranie i zamykanie (Wyniki, Finanse, Ustawienia, Skrzynka, podglądy…)
   ════════════════════════════════════════════════════════════════════════
   Otwieranie: samo CSS (css/31-animacje-okien.css) — animuje się okienko tworzone raz,
   więc przerysowanie treści w środku (lista → edycja) nie „podskakuje”.
   Zamykanie: kod okienek usuwa je od razu (sc.remove(); md.remove()) i tak zostaje —
   tutaj MutationObserver wstawia na chwilę KOPIĘ usuniętego okienka (bez id, bez klikania),
   która znika z animacją. Logika strony nie czeka na animację i nic się nie psuje.
   Przewinięcie okienka jest zapamiętywane, żeby kopia nie „skakała” na górę.
   Wyłączone przy systemowym „ogranicz animacje” (prefers-reduced-motion).
   ════════════════════════════════════════════════════════════════════════ */
const OK_SEL = '.tr-modal,.tr-scrim,.set-modal,.sk-panel,.sk-scrim,.ntz-lb,.sk-lb';
const OK_CZAS = 190;
const okRuch = () => !matchMedia('(prefers-reduced-motion: reduce)').matches;
document.addEventListener('scroll', e=>{ const t=e.target; if(t && t.nodeType===1) t.__okST=t.scrollTop; }, true);
function okDuch(el){
  if(!okRuch() || el.classList.contains('ok-out') || el.__okBez) return;
  const c=el.cloneNode(true);
  c.removeAttribute('id'); c.querySelectorAll('[id]').forEach(x=>x.removeAttribute('id'));
  c.querySelectorAll('input,textarea,select').forEach(x=>{ x.name=''; x.tabIndex=-1; });
  c.classList.add('ok-out'); c.setAttribute('aria-hidden','true'); c.inert=true;
  document.body.appendChild(c);
  /* przewinięcie jak w oryginale */
  const A=[el,...el.querySelectorAll('*')], B=[c,...c.querySelectorAll('*')];
  A.forEach((x,i)=>{ if(x.__okST && B[i]) B[i].scrollTop=x.__okST; });
  setTimeout(()=>c.remove(), OK_CZAS+40);
}
new MutationObserver(ms=>ms.forEach(m=>m.removedNodes.forEach(n=>{ if(n.nodeType===1 && n.parentNode===null && n.matches(OK_SEL)) okDuch(n); })))
  .observe(document.body, {childList:true});
