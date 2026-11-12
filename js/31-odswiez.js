/* ════════════════════════════════════════════════════════════════════════
   PRZYCISK „ODŚWIEŻ” w nagłówku (przydatny zwłaszcza w aplikacji z ekranu głównego,
   gdzie nie ma przycisku przeglądarki). Najpierw zapisuje to, co czeka na zapis
   (trening, notatka, pole w edycji), potem przeładowuje stronę — kolejka do Arkusza
   jest zapamiętana w przeglądarce, więc nic nie ginie. Skrót: F5 / Ctrl+R jak zwykle.
   ════════════════════════════════════════════════════════════════════════ */
function odswiezStrone(){
  const b=$('#rfBtn'); if(b){ b.classList.add('spin'); b.disabled=true; }
  try{ const a=document.activeElement; if(a && a!==document.body) a.blur(); }catch(e){}
  try{ if(typeof trFlush==='function') trFlush(); }catch(e){}
  try{ if(typeof ntFlush==='function') ntFlush(); }catch(e){}
  setTimeout(()=>location.reload(), 250);
}
(function(){
  const tools=document.querySelector('.hdr-tools'); if(!tools) return;
  tools.insertAdjacentHTML('afterbegin', `<button type="button" class="sk-btn rf-btn" id="rfBtn" aria-label="Odśwież stronę" title="Odśwież stronę">
    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 11.5A8 8 0 1 0 17.7 17"/><path d="M20 4.5v7h-7"/></svg></button>`);
  document.addEventListener('click', e=>{ if(e.target.closest && e.target.closest('#rfBtn')) odswiezStrone(); });
})();
