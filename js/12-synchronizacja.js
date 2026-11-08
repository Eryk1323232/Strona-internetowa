/* ════════════════════════════════════════════════════════════════════════
   SYNCHRONIZACJA Z CHMURĄ
   ════════════════════════════════════════════════════════════════════════
   Dwie możliwości (wybierana automatycznie):
   • claude.ai  — strona dostaje window.claude.use('db') (wspólna baza claude.ai).
   • GitHub Pages — dane idą do Arkusza Google przez Google Apps Script,
     jeśli w js/00-ustawienia.js podano ARKUSZ_URL i ARKUSZ_KLUCZ
     (albo otwarto stronę z ?arkusz=…&klucz=…).
   Bez żadnej z nich wszystko zapisuje się tylko w przeglądarce (localStorage).

   Wszystkie podstrony zapisują dane tym samym poleceniem:
     cloud(db => db.collection('nazwa').doc(id).set({...}) / .update({...}) / .delete())
   i nasłuchują zmian przez db.collection('nazwa').onSnapshot(...).
   arkuszDb() niżej udaje dokładnie te polecenia, więc reszta kodu nie wie,
   czy pod spodem jest claude.ai, czy Arkusz Google.
   ════════════════════════════════════════════════════════════════════════ */

/* ——— adres i hasło Arkusza: z linku (?arkusz=…&klucz=…), z pamięci przeglądarki albo z js/00-ustawienia.js ——— */
function arkuszUstawienia(){
  try{
    const q=new URLSearchParams(location.search);
    if(q.has('arkusz')){
      if(q.get('arkusz')==='off'){ localStorage.removeItem('arkuszUrl'); localStorage.removeItem('arkuszKlucz'); }
      else { store.set('arkuszUrl', q.get('arkusz')); store.set('arkuszKlucz', q.get('klucz')||''); }
      q.delete('arkusz'); q.delete('klucz');
      history.replaceState(null,'', location.pathname+(q.toString()?'?'+q:'')+location.hash);   /* hasło znika z paska adresu */
    }
  }catch(e){}
  const url=store.get('arkuszUrl','') || (typeof ARKUSZ_URL==='string'?ARKUSZ_URL:'');
  const klucz=store.get('arkuszKlucz','') || (typeof ARKUSZ_KLUCZ==='string'?ARKUSZ_KLUCZ:'');
  return /^https:\/\/script\.google(usercontent)?\.com\//.test(url) ? {url:url.trim(), klucz} : null;
}

/* czy wysłać dane z przeglądarki do pustej kolekcji? Na claude.ai — tak (jak dotąd).
   Przy Arkuszu — tylko przy pierwszym połączeniu tego urządzenia; później pusta karta znaczy
   „wszystko usunięto”, a nie „wyślij moje stare dane” (inaczej usunięte wpisy wracałyby z innego urządzenia). */
const wyslijLokalne = () => !(gdb && gdb.arkusz) || gdb.pierwszyRaz;

/* ——— „baza” na Arkuszu Google: te same polecenia co baza claude.ai ———
   • zapisy trafiają do kolejki (zapamiętanej w przeglądarce — przetrwają brak internetu i odświeżenie),
     wysyłane paczką w tle po ok. 1 s; Arkusz w odpowiedzi odsyła aktualny stan wszystkich danych,
   • co 30 s (i po powrocie do karty) strona pobiera stan z Arkusza — zmiany z telefonu widać na laptopie,
   • dopóki coś czeka w kolejce, pobrane dane są „nakładane” na niewysłane zmiany, więc nic nie mignie wstecz. */
function arkuszDb(url, klucz){
  const QK='arkuszKolejka', subs={}, last={};
  let dane=null, kolejka=[], wLocie=0, timer=null, blad=false, startOk=false;
  try{ kolejka=JSON.parse(store.get(QK,'[]'))||[]; }catch(e){ kolejka=[]; }
  const zapiszKolejke=()=>store.set(QK, JSON.stringify(kolejka));

  const adres = extra => url+(url.includes('?')?'&':'?')+'klucz='+encodeURIComponent(klucz)+'&t='+Date.now()+(extra||'');
  const json = async r => { const j=await r.json(); if(!j.ok) throw new Error(j.blad||'Błąd Arkusza'); return j; };
  let tylkoGet = store.get('arkuszTylkoGet','')===url;   /* ta przeglądarka nie przepuszcza POST do Google → zapis przez GET */
  /* zapis przez GET: zmiany w adresie, w paczkach po ~6 000 znaków (limit długości adresu) */
  async function wyslijGetem(ops){
    let dane=null, paczka=[];
    const wyslijPaczke = async () => { if(!paczka.length) return;
      const j=await json(await fetch(adres('&ops='+encodeURIComponent(JSON.stringify(paczka)))));
      if(j.zapisano!==paczka.length) throw new Error('Kod.gs w Arkuszu jest starszy niż strona — wklej nowy Kod.gs i wdróż nową wersję');
      dane=j.dane; paczka=[]; };
    for(const o of ops){
      if(paczka.length && encodeURIComponent(JSON.stringify([...paczka,o])).length>6000) await wyslijPaczke();
      paczka.push(o);
    }
    await wyslijPaczke();
    return dane;
  }
  async function wywolaj(body){
    if(!body) return (await json(await fetch(adres()))).dane;
    if(!tylkoGet){
      try{ return (await json(await fetch(url, {method:'POST', body:JSON.stringify({klucz, ops:body})}))).dane; }   /* text/plain — bez zapytań „preflight” */
      catch(e){ if(!(e instanceof TypeError)) throw e; }          /* „Failed to fetch” — spróbuj przez GET */
    }
    const d=await wyslijGetem(body);
    if(!tylkoGet){ tylkoGet=true; store.set('arkuszTylkoGet', url); }
    return d;
  }
  /* stan z Arkusza + niewysłane zmiany z kolejki */
  function nalozone(){
    const m={};
    Object.entries(dane||{}).forEach(([c,docs])=>{ m[c]=new Map(docs.map(d=>[d.id,{...d.data}])); });
    kolejka.forEach(o=>{ const mm=m[o.c]||(m[o.c]=new Map());
      if(o.op==='delete') mm.delete(o.id); else if(o.op==='set') mm.set(o.id,{...o.d}); else mm.set(o.id,{...(mm.get(o.id)||{}), ...o.d}); });
    return m;
  }
  function migawka(m,c){ const docs=[...(m[c]||new Map()).entries()].map(([id,v])=>({id, data:()=>v})); return {empty:!docs.length, docs, size:docs.length}; }
  /* powiadom podstrony — tylko o kolekcjach, które naprawdę się zmieniły */
  function rozeslij(wszystko){
    if(!dane) return; const m=nalozone();
    Object.keys(subs).forEach(c=>{ const snap=migawka(m,c), sig=JSON.stringify(snap.docs.map(d=>[d.id,d.data()]));
      if(!wszystko && last[c]===sig) return; last[c]=sig;
      subs[c].forEach(([cb])=>{ try{ cb(snap); }catch(e){ console.error(e); window.arkuszBlad=`błąd przy wczytywaniu „${c}”: ${e&&e.message||e}`; } }); });
  }
  function zgloszBlad(e){ console.warn('Arkusz Google:', e); blad=true; window.arkuszBlad=String(e&&e.message||e)+(kolejka.length?` (czeka na wysłanie: ${kolejka.length})`:''); Object.values(subs).flat().forEach(([,err])=>{ try{ err&&err(e); }catch(_){} }); }
  function sukces(d){ window.arkuszBlad='';
    /* Arkusz ma już jakiekolwiek dane (z innego urządzenia albo z importu) → niczego z przeglądarki nie dosyłaj */
    if(!startOk && Object.values(d||{}).some(a=>a.length)) db.pierwszyRaz=false;
    dane=d; store.set('arkuszPolaczono', url); const odswiezWszystko=blad||!startOk; blad=false; startOk=true; rozeslij(odswiezWszystko); db.pierwszyRaz=false; }

  async function wyslij(){
    clearTimeout(timer); timer=null;
    if(wLocie||!kolejka.length) return;
    const paczka=kolejka.slice(0,300); wLocie=paczka.length;
    try{ const d=await wywolaj(paczka); kolejka=kolejka.slice(paczka.length); zapiszKolejke(); wLocie=0; sukces(d); if(kolejka.length) wyslij(); }
    catch(e){ wLocie=0; zgloszBlad(e); timer=setTimeout(wyslij, 15000); }   /* ponów za 15 s */
  }
  async function pobierz(){
    if(wLocie||kolejka.length) return wyslij();
    try{ sukces(await wywolaj(null)); }catch(e){ zgloszBlad(e); }
  }
  /* dodanie zmiany do kolejki; kolejne zmiany tego samego wpisu łączą się w jedną */
  function dodaj(op){
    const i=kolejka.findIndex((o,k)=>k>=wLocie && o.c===op.c && o.id===op.id);
    if(i<0) kolejka.push(op);
    else if(op.op==='update') kolejka[i] = kolejka[i].op==='delete' ? {...op, op:'set'} : {...kolejka[i], d:{...kolejka[i].d, ...op.d}};
    else kolejka[i]=op;
    zapiszKolejke(); clearTimeout(timer); timer=setTimeout(wyslij, 900);
    return Promise.resolve();
  }
  const czysc = d => JSON.parse(JSON.stringify(d||{}));   /* bez undefined, funkcji itp. */

  const FK='arkuszPolaczono', pierwszyRaz = store.get(FK,'')!==url;
  const db = {
    arkusz:true,
    pierwszyRaz,   /* to urządzenie łączy się z tym Arkuszem pierwszy raz */
    collection:c=>({
      doc:id=>({
        set:d=>dodaj({op:'set', c, id:String(id), d:czysc(d)}),
        update:d=>dodaj({op:'update', c, id:String(id), d:czysc(d)}),
        delete:()=>dodaj({op:'delete', c, id:String(id)})
      }),
      onSnapshot:(cb,err)=>{ (subs[c]=subs[c]||[]).push([cb,err]);
        if(dane){ const snap=migawka(nalozone(),c); last[c]=JSON.stringify(snap.docs.map(d=>[d.id,d.data()])); cb(snap); }
        return ()=>{ subs[c]=subs[c].filter(x=>x[0]!==cb); }; }
    }),
    start(){
      pobierz();
      setInterval(()=>{ if(document.visibilityState==='visible') pobierz(); }, 30000);
      document.addEventListener('visibilitychange', ()=>{ if(document.visibilityState==='visible') pobierz(); });
      window.addEventListener('online', wyslij);
      window.addEventListener('pagehide', ()=>{ if(kolejka.length && !wLocie && navigator.sendBeacon)   /* zamknięcie karty — wyślij resztę */
        navigator.sendBeacon(url, new Blob([JSON.stringify({klucz, ops:kolejka})],{type:'text/plain'})); });
    }
  };
  return db;
}

(async()=>{
  const ark = window.claude?.use ? null : arkuszUstawienia();
  if(!window.claude?.use && !ark) return;          /* brak chmury — zapis tylko w przeglądarce */
  syncState='wait';
  const timer = setTimeout(()=>{ if(syncState==='wait'){ syncState=ark?'err':'local'; if(ark&&!window.arkuszBlad) window.arkuszBlad='Arkusz nie odpowiedział w ciągu 25 s'; refreshAll(); } }, ark?25000:10000);
  const fail = ()=>{ clearTimeout(timer); syncState='err'; refreshAll(); };
  const ok = ()=>{ clearTimeout(timer); syncState='cloud'; saveLocal(); refreshAll(); };
  try{
    gdb = ark ? arkuszDb(ark.url, ark.klucz) : await window.claude.use('db');
    if(!gdb){ clearTimeout(timer); syncState='local'; refreshAll(); return; }
    /* pierwsze połączenie z pustą kolekcją (np. świeży Arkusz) → wyślij to, co jest w przeglądarce */
    let gaF=true, maF=true, cfF=true, exF=true, obF=true;
    gdb.collection('garaz').onSnapshot(s=>{ if(gaF&&s.empty&&wyslijLokalne()&&Object.keys(S.garage).length){ gaF=false; Object.keys(S.garage).forEach(id=>cloud(db=>db.collection('garaz').doc(id).set({g:true, n:id}))); return ok(); } gaF=false; const g={}; s.docs.forEach(d=>{const v=d.data(); if(v&&v.g) g[d.id]=true;}); S.garage=g; ok(); }, fail);
    gdb.collection('mag').onSnapshot(s=>{ if(maF&&s.empty&&wyslijLokalne()&&Object.keys(S.mag).length){ maF=false; Object.entries(S.mag).forEach(([id,q])=>cloud(db=>db.collection('mag').doc(id).set({q, n:id}))); return ok(); } maF=false; const m={}; s.docs.forEach(d=>{const v=d.data(); if(v&&typeof v.q==='number') m[d.id]=v.q;}); S.mag=m; ok(); }, fail);
    gdb.collection('cfg').onSnapshot(s=>{ if(cfF&&s.empty&&wyslijLokalne()){ cfF=false;
        cloud(db=>db.collection('cfg').doc('zetony').set({free:S.tok.free, ulep:S.tok.ulep}));
        cloud(db=>db.collection('cfg').doc('bastion').set({rows:S.bast.map(x=>({lvl:x[0],k:x[1],s:x[2]}))}));
        if(store.get('quickNote','')) cloud(db=>db.collection('cfg').doc('szybkie').set({t:store.get('quickNote',''), u:Date.now()}));
        return ok(); } cfF=false; s.docs.forEach(d=>{ if(d.id==='szybkie'){ quickNoteFromCloud((d.data()||{}).t); } if(d.id==='zetony'){const v=d.data()||{}; if(Array.isArray(v.free)&&Array.isArray(v.ulep)) S.tok={free:[...v.free],ulep:[...v.ulep]};}
      if(d.id==='bastion'){const v=d.data()||{}; if(Array.isArray(v.rows)) S.bast=v.rows.map(x=>[x.lvl, x.k??null, x.s??null]);} }); ok(); }, fail);
    gdb.collection('exp').onSnapshot(s=>{ if(exF&&s.empty&&wyslijLokalne()&&S.exp.length){ exF=false; fixExp(); S.exp.forEach(r=>{ const {id,...doc}=r; cloud(db=>db.collection('exp').doc(id).set(doc)); }); return ok(); } exF=false; if(!s.empty){ S.exp=s.docs.map(d=>{const v=d.data()||{}; return {id:d.id, nac:String(v.nac), br:+v.br||0, o:+v.o||0, n:String(v.n), mod:+v.mod||0, cz:+v.cz||0, zn:+v.zn||0, pos:+v.pos||0, modOk:!!v.modOk, czOk:!!v.czOk};});
      fixExp().forEach(r=>{ const {id,...doc}=r; cloud(db=>db.collection('exp').doc(id).set(doc)); }); } else fixExp(); ok(); }, fail);
    gdb.collection('oblig').onSnapshot(s=>{ if(obF&&s.empty&&wyslijLokalne()&&S.oblig.length){ obF=false; S.oblig.forEach(r=>{ const {id,...doc}=r; cloud(db=>db.collection('oblig').doc(id).set(doc)); }); return ok(); } obF=false; if(!s.empty){ S.oblig=s.docs.map(d=>{const v=d.data()||{}; return {id:d.id, tier:String(v.tier), n:String(v.n), p:+v.p||0, o:+v.o||0};}); } ok(); }, fail);
    let dkF=true;
    gdb.collection('dyski').onSnapshot(s=>{ if(dkF&&s.empty&&wyslijLokalne()&&DK.length){ dkF=false; DK.forEach(d=>{ const {id,...v}=d; cloud(db=>db.collection('dyski').doc(id).set(v)); }); return ok(); }
      dkF=false; DK=s.docs.map(d=>dkNorm(d.id,d.data())); saveDk(); ok(); }, fail);
    Object.keys(MXC).forEach(k=>{ let first=true; const col=MXC[k].col;
      gdb.collection(col).onSnapshot(s=>{ if(first&&s.empty&&wyslijLokalne()&&MXS[k].length){ first=false; MXS[k].forEach(m=>{ const {id,...d}=m; cloud(db=>db.collection(col).doc(id).set(d)); }); return ok(); }
        first=false; MXS[k]=s.docs.map(d=>mxNorm(d.id,d.data())); saveMx(k); if(!(mxM&&mxM.mode==='edit')) mxRefresh(); ok(); }, fail); });
    let trF=true;
    gdb.collection('treningi').onSnapshot(s=>{ if(trF&&s.empty&&wyslijLokalne()&&TR.length){ trF=false; TR.forEach(t=>{ const {id,...doc}=t; cloud(db=>db.collection('treningi').doc(id).set(doc)); }); return ok(); }
      trF=false; TR=s.docs.map(d=>trNorm(d.id,d.data())); saveTr(); if(!(trM&&trM.mode==='log')) planRefresh(); ok(); }, fail);
    let pxF=true;
    gdb.collection('posiadowki').onSnapshot(s=>{ if(pxF&&s.empty&&wyslijLokalne()&&PX.length){ pxF=false; PX.forEach(pxPush); return ok(); }
      pxF=false; const a=document.activeElement; if(a&&a.dataset&&a.dataset.xk) return; PX=s.docs.map(d=>pxNorm(d.id,d.data())); savePos(); ok(); }, fail);
    let sbF=true;
    gdb.collection('subskrypcje').onSnapshot(s=>{ if(sbF&&s.empty&&wyslijLokalne()&&SUB.length){ sbF=false; SUB.forEach(subPush); return ok(); }
      sbF=false; const a=document.activeElement; if(a&&a.dataset&&a.dataset.sk) return; SUB=s.docs.map(d=>subNorm(d.id,d.data())); saveSub(); ok(); }, fail);
    let bkF1=true, bkF2=true;   /* Pieniądze → Zakłady (bukmacherka) */
    gdb.collection('bukKonta').onSnapshot(s=>{ if(bkF1&&s.empty&&wyslijLokalne()&&BK.konta.length){ bkF1=false; BK.konta.forEach(bkPushK); return ok(); }
      bkF1=false; const a=document.activeElement; if(a&&a.dataset&&a.dataset.bk) return; BK.konta=s.docs.map(d=>bkKNorm(d.id,d.data())); saveBk(); ok(); }, fail);
    gdb.collection('bukOps').onSnapshot(s=>{ if(bkF2&&s.empty&&wyslijLokalne()&&BK.ops.length){ bkF2=false; BK.ops.forEach(bkPushO); return ok(); }
      bkF2=false; const a=document.activeElement; if(a&&a.dataset&&a.dataset.bk) return; BK.ops=s.docs.map(d=>bkONorm(d.id,d.data())); saveBk(); ok(); }, fail);
    let bkF3=true;
    gdb.collection('bukCfg').onSnapshot(s=>{
      /* jednorazowy import danych z Excela do Zakładów (gdy chmura nie ma znacznika „import”) — po wczytaniu kont i operacji */
      if(bkF3 && !s.docs.some(d=>d.id==='import')) setTimeout(()=>{ bkImport(); bkRefresh(); }, 2500);
      if(bkF3&&s.empty&&wyslijLokalne()&&bkLimit){ bkF3=false; saveLimit(); return ok(); }
      bkF3=false; const a=document.activeElement; if(a&&a.dataset&&a.dataset.bk) return; const d=s.docs.find(x=>x.id==='limit'); bkLimit=d?Math.max(0,+(d.data()||{}).v||0):0; store.set('bukLimit',String(bkLimit)); ok(); }, fail);
    let fnF1=true, fnF2=true;   /* Pieniądze → Finanse */
    gdb.collection('finOps').onSnapshot(s=>{ if(fnF1&&s.empty&&wyslijLokalne()&&FIN.ops.length){ fnF1=false; FIN.ops.forEach(finPushO); return ok(); }
      fnF1=false; const a=document.activeElement; if(a&&a.dataset&&a.dataset.fn) return; FIN.ops=s.docs.map(d=>finONorm(d.id,d.data())); saveFin(); ok(); }, fail);
    gdb.collection('finCfg').onSnapshot(s=>{ if(fnF2&&s.empty&&wyslijLokalne()&&FIN.cfg.u){ fnF2=false; finPushCfg(); return ok(); }
      fnF2=false; const a=document.activeElement; if(a&&a.dataset&&a.dataset.fn) return; const d=s.docs.find(x=>x.id==='cfg'); if(d) FIN.cfg=finCfgNorm(d.data()); saveFin(); ok(); }, fail);
    let fnF3=true;
    gdb.collection('finStale').onSnapshot(s=>{ if(fnF3&&s.empty&&wyslijLokalne()&&FIN.stale.length){ fnF3=false; FIN.stale.forEach(finPushS); return ok(); }
      fnF3=false; const a=document.activeElement; if(a&&a.dataset&&a.dataset.fn) return; FIN.stale=s.docs.map(d=>finSNorm(d.id,d.data())); saveFin(); ok(); }, fail);
    let plF=true;
    gdb.collection('plany').onSnapshot(s=>{ if(plF&&s.empty&&wyslijLokalne()&&PL.length){ plF=false; PL.forEach(plPush); return ok(); }
      plF=false; const a=document.activeElement; if(a&&a.dataset&&a.dataset.pk) return; PL=s.docs.map(d=>plNorm(d.id,d.data())); savePlans(); ok(); }, fail);
    let gF={w:true,z:true};
    [['waga','w'],['zakupy','z']].forEach(([col,k])=>gdb.collection(col).onSnapshot(s=>{
      if(gF[k]&&s.empty&&wyslijLokalne()&&G[k].length){ gF[k]=false; G[k].forEach(r=>cloud(db=>db.collection(col).doc(r.id).set(gDoc(r)))); return ok(); }
      gF[k]=false; G={...G,[k]:s.docs.map(d=>{ const v=d.data()||{}; return k==='w'?{id:d.id,d:String(v.d||''),v:+v.v||0}:{id:d.id,n:String(v.n||''),shop:String(v.shop||''),q:+v.q||0,p:+v.p||0,url:String(v.url||''),c:+v.c||0}; })}; saveGym(); ok(); }, fail));
    let ntF=true;
    gdb.collection('notatki').onSnapshot(s=>{ if(ntF&&s.empty&&wyslijLokalne()&&N.length){ ntF=false; N.forEach(n=>ntPush(n)); return ok(); }
      ntF=false; const loc=ntPending&&N.find(n=>n.id===ntPending);
      N=s.docs.map(d=>ntNorm(d.id,d.data())); if(loc) N=N.map(n=>n.id===loc.id?loc:n); saveNotes(); ok(); }, fail);
    let ntF2=true;   /* puste foldery notatek */
    gdb.collection('notatkiCfg').onSnapshot(s=>{ if(ntF2&&s.empty&&wyslijLokalne()&&NT_FOLD.length){ ntF2=false; ntSaveFold(); return ok(); }
      ntF2=false; const d=s.docs.find(x=>x.id==='foldery'); if(d){ const L=(d.data()||{}).L; if(Array.isArray(L)){ NT_FOLD=L.map(String); store.set('ntFoldery',JSON.stringify(NT_FOLD)); } } ok(); }, fail);
    let tdF1=true, tdF2=true;
    gdb.collection('todoListy').onSnapshot(s=>{ if(tdF1&&s.empty&&wyslijLokalne()&&T.lists.length){ tdF1=false; T.lists.forEach(l=>cloud(db=>db.collection('todoListy').doc(l.id).set({n:l.n,o:l.o}))); return ok(); }
      tdF1=false; T.lists=s.docs.map(d=>{const v=d.data()||{}; return {id:d.id, n:String(v.n||'Lista'), o:+v.o||0};}); saveTodo(); ok(); }, fail);
    gdb.collection('todo').onSnapshot(s=>{ if(tdF2&&s.empty&&wyslijLokalne()&&T.tasks.length){ tdF2=false; T.tasks.forEach(t=>cloud(db=>db.collection('todo').doc(t.id).set(tdDoc(t)))); return ok(); }
      tdF2=false; T.tasks=s.docs.map(d=>tdNorm(d.id,d.data())); saveTodo(); ok(); }, fail);
    if(gdb.start) gdb.start();   /* Arkusz Google: pierwsze pobranie danych */
  }catch(e){ clearTimeout(timer); syncState='local'; refreshAll(); }
})();
