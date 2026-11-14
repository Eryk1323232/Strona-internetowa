/* ════════════════════════════════════════════════════════════════
   UKŁAD — własne nazwy i kolejność (menu boczne + elementy podstron)
   Dane UK (localStorage 'uklad' + arkusz: kolekcja 'cfg', dokument 'uklad', pole j = JSON):
     nav   [{g:'Nazwa kategorii'} | {r:'klucz podstrony'}] — kolejność menu; null = jak w index.html
     nazwy {klucz: 'Nazwa'} — własne nazwy podstron (menu + nagłówek h1)
     ord   {'klucz|typ.n': [klucze elementów]} — kolejność zakładek / kafelków / sekcji na podstronie
     lab   {'klucz|typ.n': {klucz elementu: 'Nazwa'}} — własne nazwy zakładek / kafelków / sekcji
   Menu: ołówek „Edytuj menu” pod listą → edytor w miejscu menu (nazwy, ↑↓ — strzałka przez nagłówek
     przenosi podstronę do innej kategorii, nowa kategoria, usuwanie pustej).
   Podstrona: ołówek przy nagłówku h1 → panel pod nagłówkiem (nazwa podstrony + ←→ / ↑↓ dla elementów).
   Elementy rozpoznawane automatycznie (UK_TYPY): zakładki .tabs[data-tab], kafelki .calc-card, sekcje section.block.
   MutationObserver na #page nakłada układ po każdym przerysowaniu strony.
   ════════════════════════════════════════════════════════════════ */
const ukNorm = v => ({ nav:Array.isArray(v&&v.nav)?v.nav.filter(x=>x&&(typeof x.g==='string'||typeof x.r==='string')):null,
  nazwy:(v&&v.nazwy)||{}, ord:(v&&v.ord)||{}, lab:(v&&v.lab)||{} });
let UK = ukNorm((()=>{ try{ return JSON.parse(store.get('uklad','null')); }catch(e){ return null; } })());
Object.values(UK.ord).forEach(O=>{ const i=O.indexOf('bast'); if(i>=0) O[i]='tryby'; });   /* WoT: Ostatni Bastion → Tryby */
let ukT=0;
function ukSave(){ store.set('uklad', JSON.stringify(UK)); clearTimeout(ukT);
  ukT=setTimeout(()=>cloud(db=>db.collection('cfg').doc('uklad').set({j:JSON.stringify(UK), u:Date.now()})), 600); }
function ukZChmury(j){ if(typeof j!=='string' || j===JSON.stringify(UK)) return; try{ UK=ukNorm(JSON.parse(j)); store.set('uklad', j); }catch(e){ return; }
  if(!ukNavEd) ukNav(); ukStrona(true); }
const ukIk = (d,lab,extra='') => `<button type="button" class="uk-ik" ${extra} aria-label="${lab}" title="${lab}"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="${d}"/></svg></button>`;
const UK_D = { gora:'M12 19V5M6 11l6-6 6 6', dol:'M12 5v14M6 13l6 6 6-6', lewo:'M19 12H5M11 6l-6 6 6 6', prawo:'M5 12h14M13 6l6 6-6 6', x:'M6 6l12 12M18 6L6 18',
  olowek:'M4 20h4L19 9a2.8 2.8 0 0 0-4-4L4 16v4zM13.5 6.5l4 4' };
const ukOlowek = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="${UK_D.olowek}"/></svg>`;

/* ─────────── MENU BOCZNE ─────────── */
const UK_UL = $('.navtree');
const UK_NAV0 = [...UK_UL.children].map(li=>li.classList.contains('grp')?{g:li.textContent.trim()}:{r:li.querySelector('a').dataset.r});
const UK_LI = {}, UK_N0 = {};
[...UK_UL.children].filter(li=>!li.classList.contains('grp')).forEach(li=>{ const a=li.querySelector('a'); UK_LI[a.dataset.r]=li; UK_N0[a.dataset.r]=a.querySelector('span').textContent; });
const ukNazwa = r => UK.nazwy[r] || UK_N0[r] || r;
function ukNavLista(){ const L=(UK.nav||UK_NAV0).filter(x=>typeof x.g==='string'||UK_LI[x.r]).map(x=>({...x})), jest=new Set(L.map(x=>x.r).filter(Boolean));
  Object.keys(UK_LI).forEach(r=>{ if(!jest.has(r)) L.push({r}); }); return L; }
function ukNav(){
  const fr=document.createDocumentFragment();
  ukNavLista().forEach(x=>{ if(x.r){ const li=UK_LI[x.r]; li.querySelector('a span').textContent=ukNazwa(x.r); fr.appendChild(li); }
    else { const li=document.createElement('li'); li.className='grp'; li.setAttribute('aria-hidden','true'); li.textContent=x.g; fr.appendChild(li); } });
  UK_UL.replaceChildren(fr);
}
let ukNavEd=false;
const ukNavBox = document.createElement('div'); ukNavBox.className='uk-navbox';
UK_UL.after(ukNavBox);
function ukNavRender(){
  UK_UL.hidden=ukNavEd;
  if(!ukNavEd){ ukNavBox.innerHTML=`<button type="button" class="uk-navpen" data-uknav="start">${ukOlowek}<span>Edytuj menu</span></button>`; return; }
  const L=ukNavLista(), gi=L.map((x,i)=>x.g!==undefined?i:-1).filter(i=>i>=0);
  ukNavBox.innerHTML=`<div class="uk-ned"><p class="uk-pom">Strzałka przez nagłówek przenosi podstronę do innej kategorii.</p>${L.map((x,i)=>{
    if(x.r) return `<div class="uk-r uk-rp">${(UK_LI[x.r].querySelector('svg')||{}).outerHTML||''}<input class="uk-in" data-ukp="${esc(x.r)}" value="${esc(ukNazwa(x.r))}" placeholder="${esc(UK_N0[x.r])}" aria-label="Nazwa podstrony ${esc(UK_N0[x.r])}">
      ${ukIk(UK_D.gora,'W górę',`data-ukmv="${i}" data-d="-1"${i===0?' disabled':''}`)}${ukIk(UK_D.dol,'W dół',`data-ukmv="${i}" data-d="1"${i===L.length-1?' disabled':''}`)}</div>`;
    const k=gi.indexOf(i), pusta=!(L[i+1]&&L[i+1].r);
    return `<div class="uk-r uk-rg"><input class="uk-in" data-ukg="${i}" value="${esc(x.g)}" aria-label="Nazwa kategorii">
      ${ukIk(UK_D.gora,'Kategoria w górę',`data-ukgmv="${i}" data-d="-1"${k===0?' disabled':''}`)}${ukIk(UK_D.dol,'Kategoria w dół',`data-ukgmv="${i}" data-d="1"${k===gi.length-1?' disabled':''}`)}
      ${pusta?ukIk(UK_D.x,'Usuń pustą kategorię',`data-ukgdel="${i}"`):''}</div>`; }).join('')}
    <div class="uk-nbot"><button type="button" class="uk-btn" data-uknav="nowa">+ Kategoria</button><button type="button" class="uk-btn uk-lnk" data-uknav="reset">Przywróć domyślne</button>
      <button type="button" class="uk-btn uk-ok" data-uknav="stop">Gotowe</button></div></div>`;
}
function ukNavZapisz(L){ UK.nav=L.map(x=>x.r?{r:x.r}:{g:x.g}); ukSave(); ukNav(); ukNavRender(); }
function ukGrupy(L){ const B=[]; L.forEach(x=>{ if(x.g!==undefined||!B.length) B.push([]); B[B.length-1].push(x); }); return B; }   /* bloki: [ewentualne bez kategorii] + kategoria z podstronami */
ukNavBox.addEventListener('click', e=>{
  const b=e.target.closest('button'); if(!b||b.disabled) return; const L=ukNavLista();
  const a=b.dataset.uknav;
  if(a==='start'){ ukNavEd=true; ukNavRender(); const i=ukNavBox.querySelector('.uk-in'); i&&i.focus({preventScroll:true}); return; }
  if(a==='stop'){ ukNavEd=false; ukNav(); ukNavRender(); return; }
  if(a==='nowa'){ L.push({g:'Nowa kategoria'}); ukNavZapisz(L); const ins=ukNavBox.querySelectorAll('[data-ukg]'); const x=ins[ins.length-1]; if(x){ x.focus(); x.select(); } return; }
  if(a==='reset'){ if(!b.dataset.pewne){ b.dataset.pewne='1'; b.textContent='Na pewno?'; setTimeout(()=>{ if(b.isConnected){ delete b.dataset.pewne; b.textContent='Przywróć domyślne'; } },3000); return; }
    UK.nav=null; UK.nazwy={}; ukSave(); ukNav(); ukNavRender(); ukStrona(true); return; }
  if(b.dataset.ukmv!==undefined){ const i=+b.dataset.ukmv, j=i+(+b.dataset.d); if(j<0||j>=L.length) return; [L[i],L[j]]=[L[j],L[i]];
    ukNavZapisz(L); const q=ukNavBox.querySelector(`[data-ukmv="${j}"][data-d="${b.dataset.d}"]`)||ukNavBox.querySelector(`[data-ukmv="${j}"]`); q&&q.focus(); return; }
  if(b.dataset.ukgmv!==undefined){ const i=+b.dataset.ukgmv, d=+b.dataset.d, B=ukGrupy(L), k=B.findIndex(bl=>bl[0]===L[i]), m=k+d;
    if(m<0||m>=B.length||B[m][0].g===undefined) return; [B[k],B[m]]=[B[m],B[k]]; ukNavZapisz(B.flat()); return; }
  if(b.dataset.ukgdel!==undefined){ L.splice(+b.dataset.ukgdel,1); ukNavZapisz(L); }
});
ukNavBox.addEventListener('input', e=>{ const t=e.target, v=t.value.replace(/\s+/g,' ').trim();
  if(t.dataset.ukp){ const r=t.dataset.ukp; if(!v||v===UK_N0[r]) delete UK.nazwy[r]; else UK.nazwy[r]=v.slice(0,40); UK_LI[r].querySelector('a span').textContent=ukNazwa(r); ukSave(); ukStrona(true); }
  if(t.dataset.ukg!==undefined){ const L=ukNavLista(); L[+t.dataset.ukg].g=v.slice(0,30)||'Kategoria'; UK.nav=L.map(x=>x.r?{r:x.r}:{g:x.g}); ukSave(); ukNav(); }
});
ukNavBox.addEventListener('keydown', e=>{ if(e.key==='Enter' && e.target.matches('.uk-in')) e.target.blur(); });

/* ─────────── PODSTRONY ─────────── */
const UK_TYPY = [
  {n:'Zakładki', sel:'.tabs[role=tablist]', it:'button[data-tab]', h:true, key:e=>e.dataset.tab, lab:e=>e},
  {n:'Kafelki', sel:'.calc-cards', it:'.calc-card', h:true, key:e=>e.dataset.ukk||(e.dataset.ukk=((e.querySelector('h2')||{}).textContent||'').trim()), lab:e=>e.querySelector('h2')},
  {n:'Sekcje', sel:'#page', it:'section.block', h:false, key:e=>e.dataset.ukk||(e.dataset.ukk=((e.querySelector('.block-head h2')||{}).textContent||'').trim()), lab:e=>e.querySelector('.block-head h2')},
];
const ukTrasa = () => (typeof render!=='undefined' && render.ost) || '';
function ukKontenery(){
  const r=ukTrasa(), W=[]; const pg=$('#page'); if(!pg) return W;
  UK_TYPY.forEach((T,ti)=>{ const C=T.sel==='#page'?[pg]:[...pg.querySelectorAll(T.sel)].filter(c=>!c.closest('.uk-ped'));
    C.forEach((c,n)=>{ const I=[...c.children].filter(e=>e.matches(T.it) && T.key(e)); if(I.length<2) return;
      W.push({id:`${r}|${ti}.${n}`, T, c, I}); }); });
  return W;
}
function ukUloz(K){
  const O=UK.ord[K.id], L=UK.lab[K.id]||{};
  K.I.forEach(e=>{ const l=K.T.lab(e), k=K.T.key(e); if(!l) return; if(l.dataset.uk0===undefined) l.dataset.uk0=l.textContent; const want=L[k]||l.dataset.uk0; if(l.textContent!==want) l.textContent=want; });
  if(!O) return K.I;
  const poz=k=>{ const i=O.indexOf(k); return i<0?1e6:i; }, D=[...K.I].sort((a,b)=>poz(K.T.key(a))-poz(K.T.key(b)));
  if(D.every((e,i)=>e===K.I[i])) return K.I;
  const kotw=K.I[K.I.length-1].nextSibling; D.forEach(e=>K.c.insertBefore(e,kotw)); return D;
}
function ukStrona(sila){
  const r=ukTrasa(), pg=$('#page'); if(!pg||!r) return;
  const h=pg.querySelector(':scope > h1');
  if(h && r!=='start' && r!=='widzet'){
    if(h.dataset.uk0===undefined) h.dataset.uk0=h.innerHTML;
    const n=UK.nazwy[r], tresc=n?esc(n):h.dataset.uk0, ma=h.querySelector('.uk-pen');
    if(sila || !ma || h.dataset.ukn!==(n||'')){ h.innerHTML=`${tresc}<button type="button" class="uk-pen" aria-label="Edytuj układ podstrony" title="Edytuj nazwę i kolejność">${ukOlowek}</button>`; h.dataset.ukn=n||''; }
    h.querySelector('.uk-pen').setAttribute('aria-pressed', ukPed===r?'true':'false');
  }
  ukKontenery().forEach(ukUloz);
  if(ukPed && ukPed!==r){ ukPed=''; }
  const p=pg.querySelector(':scope > .uk-ped'); if(!ukPed && p) p.remove();
  if(ukPed && !p && h){ h.insertAdjacentHTML('afterend','<div class="uk-ped"></div>'); ukPedRender(); }
}
let ukPed='';
function ukPedRender(){
  const p=$('#page > .uk-ped'), r=ukTrasa(); if(!p) return;
  const W=ukKontenery();
  p.innerHTML=`<div class="uk-pr"><label class="uk-f"><span class="label">Nazwa podstrony</span><input class="uk-in" data-ukname value="${esc(ukNazwa(r))}" placeholder="${esc(UK_N0[r]||'')}"></label></div>
    ${W.map(K=>{ const I=K.c.isConnected?[...K.c.children].filter(e=>e.matches(K.T.it)&&K.T.key(e)):K.I, L=UK.lab[K.id]||{};
      return `<div class="uk-grp"><span class="label">${K.T.n}${W.filter(x=>x.T===K.T).length>1?' '+(+K.id.split('.').pop()+1):''}</span><div class="uk-chips${K.T.h?'':' pion'}">${I.map((e,i)=>{ const k=K.T.key(e), l=K.T.lab(e);
        return `<span class="uk-chip">${ukIk(K.T.h?UK_D.lewo:UK_D.gora,K.T.h?'W lewo':'W górę',`data-ukc="${esc(K.id)}" data-i="${i}" data-d="-1"${i===0?' disabled':''}`)}
          <input class="uk-in" data-ukl="${esc(K.id)}" data-k="${esc(k)}" value="${esc(L[k]||(l&&l.dataset.uk0)||k)}" placeholder="${esc((l&&l.dataset.uk0)||k)}" aria-label="Nazwa: ${esc((l&&l.dataset.uk0)||k)}">
          ${ukIk(K.T.h?UK_D.prawo:UK_D.dol,K.T.h?'W prawo':'W dół',`data-ukc="${esc(K.id)}" data-i="${i}" data-d="1"${i===I.length-1?' disabled':''}`)}</span>`; }).join('')}</div></div>`; }).join('')}
    ${W.length?'':'<p class="uk-pom">Na tej podstronie nie ma zakładek ani kafelków do przestawiania — możesz zmienić jej nazwę.</p>'}
    <div class="uk-nbot"><button type="button" class="uk-btn uk-lnk" data-ukped="reset">Przywróć domyślne</button><button type="button" class="uk-btn uk-ok" data-ukped="stop">Gotowe</button></div>`;
}
document.addEventListener('click', e=>{
  const pen=e.target.closest('.uk-pen'); if(pen){ e.preventDefault(); ukPed=ukPed?'':ukTrasa(); ukStrona(); return; }
  const p=e.target.closest('.uk-ped'); if(!p) return; const b=e.target.closest('button'); if(!b||b.disabled) return; const r=ukTrasa();
  if(b.dataset.ukped==='stop'){ ukPed=''; ukStrona(); return; }
  if(b.dataset.ukped==='reset'){ if(!b.dataset.pewne){ b.dataset.pewne='1'; b.textContent='Na pewno?'; setTimeout(()=>{ if(b.isConnected){ delete b.dataset.pewne; b.textContent='Przywróć domyślne'; } },3000); return; }
    delete UK.nazwy[r]; Object.keys(UK.ord).forEach(k=>{ if(k.startsWith(r+'|')) delete UK.ord[k]; }); Object.keys(UK.lab).forEach(k=>{ if(k.startsWith(r+'|')) delete UK.lab[k]; });
    ukSave(); UK_LI[r]&&(UK_LI[r].querySelector('a span').textContent=ukNazwa(r)); if(typeof render==='function') render(); return; }
  if(b.dataset.ukc){ const K=ukKontenery().find(x=>x.id===b.dataset.ukc); if(!K) return;
    const I=[...K.c.children].filter(x=>x.matches(K.T.it)&&K.T.key(x)).map(K.T.key), i=+b.dataset.i, j=i+(+b.dataset.d); if(j<0||j>=I.length) return;
    [I[i],I[j]]=[I[j],I[i]]; UK.ord[K.id]=I; ukSave(); ukUloz({...K, I:[...K.c.children].filter(x=>x.matches(K.T.it)&&K.T.key(x))}); ukPedRender();
    const q=$(`#page > .uk-ped [data-ukc="${CSS.escape(K.id)}"][data-i="${j}"][data-d="${b.dataset.d}"]`)||$(`#page > .uk-ped [data-ukc="${CSS.escape(K.id)}"][data-i="${j}"]`); q&&q.focus(); }
});
document.addEventListener('input', e=>{ const t=e.target; if(!t.closest||!t.closest('.uk-ped')) return; const r=ukTrasa(), v=t.value.replace(/\s+/g,' ').trim();
  if(t.dataset.ukname!==undefined){ if(!v||v===UK_N0[r]) delete UK.nazwy[r]; else UK.nazwy[r]=v.slice(0,40); ukSave(); UK_LI[r]&&(UK_LI[r].querySelector('a span').textContent=ukNazwa(r));
    const h=$('#page > h1'); if(h){ const pen=h.querySelector('.uk-pen'); h.innerHTML=UK.nazwy[r]?esc(UK.nazwy[r]):h.dataset.uk0; h.dataset.ukn=UK.nazwy[r]||''; pen&&h.appendChild(pen); } return; }
  if(t.dataset.ukl){ const id=t.dataset.ukl, k=t.dataset.k, L=UK.lab[id]||(UK.lab[id]={}); const d=t.placeholder;
    if(!v||v===d) delete L[k]; else L[k]=v.slice(0,40); if(!Object.keys(L).length) delete UK.lab[id]; ukSave(); ukKontenery().forEach(ukUloz); }
});
document.addEventListener('keydown', e=>{ if(e.key==='Enter' && e.target.matches && e.target.matches('.uk-ped .uk-in')) e.target.blur(); });

let ukRaf=0;
new MutationObserver(()=>{ if(ukRaf) return; ukRaf=requestAnimationFrame(()=>{ ukRaf=0; ukStrona(); }); }).observe($('#page'), {childList:true, subtree:true});
ukNav(); ukNavRender();
