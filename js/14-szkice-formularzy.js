/* ════════════════════════════════════════════════════════════════════════
   SZKICE FORMULARZY — wpisany, jeszcze NIEZAPISANY tekst przeżywa odświeżenie
   ════════════════════════════════════════════════════════════════════════
   Jak to działa:
   • Każde pisanie w polu <form> zapisuje „szkic” w localStorage (klucz „szkic:…”).
   • Gdy formularz pojawi się znowu (odświeżenie, powrót na podstronę, ponowne
     otwarcie okienka), wpisane wartości wracają do pól.
   • Kliknięcie „Dodaj”/„Zapisz” (submit) usuwa szkic — dane są już zapisane
     normalnie przez daną podstronę.
   • Okienka edycji (np. „Edytuj dysk”) mają osobny szkic dla każdej pozycji:
     szkic wraca tylko wtedy, gdy formularz startuje z tymi samymi wartościami,
     co przy pisaniu — więc nie nadpisze innej pozycji ani nowszych danych.
   • Szkice starsze niż 14 dni są kasowane.
   • Żeby wyłączyć szkice dla jakiegoś formularza: dodaj mu atrybut data-nodraft.
   Ładuje się jako ostatni plik — nie wymaga zmian w innych plikach.
   ════════════════════════════════════════════════════════════════════════ */
(() => {
  const PFX = 'szkic:', TTL = 14*24*3600*1000;
  const orig = new WeakMap();                 /* formularz → wartości startowe */

  /* pola, które zapamiętujemy (bez przycisków, haseł, plików i pól ukrytych) */
  const fields = f => [...f.elements].filter(el =>
    /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName) && !/^(submit|button|reset|hidden|file|password|image)$/.test(el.type));
  const read = f => fields(f).map(el => /^(checkbox|radio)$/.test(el.type) ? el.checked : el.value);
  const same = (a,b) => JSON.stringify(a) === JSON.stringify(b);

  /* klucz: podstrona + klasa formularza + jego atrybuty data-* (np. który dzień planu, która gałąź) */
  const keyOf = f => PFX + (location.hash||'#start') + '|' + f.className + '|' + JSON.stringify({...f.dataset});

  const load = k => { try{ return JSON.parse(store.get(k,'null')); }catch(e){ return null; } };
  const drop = k => { try{ localStorage.removeItem(k); }catch(e){} };

  function restore(f){
    if(orig.has(f) || f.hasAttribute('data-nodraft')) return;
    const start = read(f); orig.set(f, start);
    const k = keyOf(f), d = load(k);
    if(!d) return;
    if(Date.now()-d.t > TTL || !same(d.orig, start) || d.cur.length !== start.length){ drop(k); return; }
    fields(f).forEach((el,i) => {
      const v = d.cur[i]; if(same(v, start[i])) return;
      if(/^(checkbox|radio)$/.test(el.type)) el.checked = !!v; else el.value = v;
      el.dispatchEvent(new Event('input', {bubbles:true}));   /* odśwież podglądy / formatowanie liczb */
    });
  }
  function save(f){
    if(f.hasAttribute('data-nodraft')) return;
    if(!orig.has(f)) orig.set(f, read(f));
    const k = keyOf(f), cur = read(f), start = orig.get(f);
    if(same(cur, start)) return drop(k);                       /* nic nie zmieniono — brak szkicu */
    store.set(k, JSON.stringify({t:Date.now(), orig:start, cur}));
  }

  /* pisanie → zapis szkicu */
  const onEdit = e => { const f = e.target.form; if(f && e.isTrusted) save(f); };
  document.addEventListener('input', onEdit);
  document.addEventListener('change', onEdit);
  /* wysłanie formularza → szkic niepotrzebny (faza przechwytywania: przed obsługą podstrony) */
  document.addEventListener('submit', e => { const f = e.target; drop(keyOf(f));
    setTimeout(() => { if(f.isConnected) orig.set(f, read(f)); }, 0); }, true);   /* nowy punkt startu po wyczyszczeniu pól */

  /* każdy nowo wstawiony formularz (zmiana podstrony, przerysowanie listy, okienko) → przywróć szkic */
  const scan = root => { if(root.nodeType !== 1) return;
    if(root.tagName === 'FORM') restore(root); root.querySelectorAll && root.querySelectorAll('form').forEach(restore); };
  new MutationObserver(ms => ms.forEach(m => m.addedNodes.forEach(scan))).observe(document.body, {childList:true, subtree:true});
  scan(document.body);

  /* sprzątanie starych szkiców */
  try{ Object.keys(localStorage).filter(k => k.startsWith(PFX)).forEach(k => { const d = load(k); if(!d || Date.now()-d.t > TTL) drop(k); }); }catch(e){}
})();
