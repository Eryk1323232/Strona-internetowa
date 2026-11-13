/* ════════════════════════════════════════════════════════════════════════
   PRACA (STUDIA) — dziennik badań do pracy inżynierskiej (moja część: projektowanie MMA)
   Podział pracy: najpierw lepiszcza Pawła (asfalt + SBS + olej → Kalkulatory → Wyniki Pawła),
   potem moje mieszanki mineralno-asfaltowe na tych lepiszczach (Kalkulatory → Wyniki moje).
   ════════════════════════════════════════════════════════════════════════
   PR – wpisy badań (chmura: kolekcja „badania”):
     d data · b badanie · p próbka / mieszanka MMA · l lepiszcze (mieszanka Pawła) · u jednostka · w pomiary [liczby]
     war warunki (temperatura, sprzęt…) · n uwagi · ai wnioski z weryfikacji AI · c kolejność
   Szybka kontrola (prKontrola) — liczona na stronie, bez internetu:
     • rozrzut pomiarów: współczynnik zmienności > PR_CV %,
     • wynik odbiega o > PR_ODCH % od średniej wcześniejszych wpisów tego badania i tej próbki,
     • mniej niż 2 pomiary (nie da się ocenić powtarzalności).
   Weryfikacja AI (prAi) — składa gotowe pytanie z wpisem i historią tego badania,
     kopiuje je i otwiera Claude (claude.ai/new?q=…). Odpowiedź można wkleić w „Wnioski AI”.
   Wymiana z innymi stronami / Excelem:
     „Wklej wyniki” (prM.mode 'wklej') — tabela (z Excela, Arkusza, innej strony: tab / ; / ,) albo JSON;
       najpierw podgląd, potem dodanie; identyczne wpisy są pomijane. Kolumny rozpoznawane po nagłówkach
       (Data, Badanie, Mieszanka/Próbka, Lepiszcze, Jednostka, Pomiar 1…n / Wyniki, Warunki, Uwagi),
       bez nagłówka — w tej kolejności.
     „Kopiuj wyniki” (prM.mode 'kopiuj') — te same formaty (JSON: {app:'Pracownia-badania', v:1, wpisy:[…]}).
   PR_BADANIA — podpowiedzi nazw badań MMA z jednostkami (na końcu badania lepiszcza; dopisz własne).
   ════════════════════════════════════════════════════════════════════════ */
const PR_CV = 10, PR_ODCH = 15;
const PR_BADANIA = [
  ['Gęstość objętościowa próbki (PN-EN 12697-6)','Mg/m³'], ['Gęstość mieszanki MMA (PN-EN 12697-5)','Mg/m³'],
  ['Zawartość wolnych przestrzeni Vm (PN-EN 12697-8)','%'], ['Wypełnienie wolnych przestrzeni lepiszczem VFB','%'], ['Wolna przestrzeń w mieszance mineralnej VMA','%'],
  ['Zawartość lepiszcza (PN-EN 12697-1)','%'], ['Uziarnienie — przesiew (PN-EN 12697-2)','% przechodzi'],
  ['Wytrzymałość na pośrednie rozciąganie ITS (PN-EN 12697-23)','kPa'], ['Wrażliwość na wodę ITSR (PN-EN 12697-12)','%'],
  ['Stabilność Marshalla (PN-EN 12697-34)','kN'], ['Osiadanie Marshalla','mm'],
  ['Koleinowanie WTS (PN-EN 12697-22)','mm/10³ cykli'], ['Koleinowanie PRD','%'], ['Głębokość koleiny RD','mm'],
  ['Moduł sztywności (PN-EN 12697-26)','MPa'], ['Spływność lepiszcza Schellenberga (PN-EN 12697-18)','%'],
  ['Penetracja w 25 °C','0,1 mm'], ['Temperatura mięknienia PiK','°C'], ['Temperatura łamliwości Fraassa','°C'], ['Nawrót sprężysty','%']
];
/* mieszanka MMA z „Wyników moich” (po nazwie) i jej lepiszcze z „Wyników Pawła” */
const prMx = n => typeof MXS==='object' ? MXS.moje.find(m=>prK(m.n)===prK(n)) : null;
const prLep = m => m&&m.base&&typeof MXS==='object' ? MXS.pawel.find(x=>x.id===m.base) : null;
const prNorm = (id,v={}) => ({id, d:String(v.d||''), b:String(v.b||''), p:String(v.p||''), l:String(v.l||''), u:String(v.u||''),
  w:(Array.isArray(v.w)?v.w:[]).map(Number).filter(x=>isFinite(x)), war:String(v.war||''), n:String(v.n||''), ai:String(v.ai||''), c:+v.c||0});
let PR=[];
try{ const c=JSON.parse(store.get('prState','null')); if(Array.isArray(c)) PR=c.map(x=>prNorm(x.id,x)); }catch(e){}
const savePr = () => store.set('prState', JSON.stringify(PR));
const prPush = x => cloud(db=>{ const {id,...v}=x; return db.collection('badania').doc(id).set(v); });
let prM=null;          /* okienko: {id} — id pusty = nowy wpis */
let prF=store.get('prFiltr','');   /* filtr: nazwa badania albo '' */
const prK = s => String(s||'').trim().toLowerCase();
const prNum = v => { const x=parseFloat(String(v).replace(',','.').replace(/\s/g,'')); return isFinite(x)?x:NaN; };
const prF2 = (v,dz) => fmt(v, dz==null?(Math.abs(v)>=100?1:Math.abs(v)>=10?2:3):dz);

/* statystyka pomiarów */
function prStat(w){ const n=w.length; if(!n) return null;
  const sr=w.reduce((a,b)=>a+b,0)/n, sd=n>1?Math.sqrt(w.reduce((a,b)=>a+(b-sr)**2,0)/(n-1)):0;
  return {n, sr, sd, cv:sr?Math.abs(sd/sr*100):0, min:Math.min(...w), max:Math.max(...w)}; }
/* wcześniejsze wpisy tego samego badania i tej samej próbki */
const prPoprz = x => PR.filter(y=>y.id!==x.id && prK(y.b)===prK(x.b) && prK(y.p)===prK(x.p) && y.w.length && (y.d<x.d || (y.d===x.d && y.c<x.c)));
function prKontrola(x){ const S=prStat(x.w), L=[]; if(!S) return [{t:'warn', m:'Brak pomiarów'}];
  if(S.n<2) L.push({t:'info', m:'Jeden pomiar — nie da się ocenić powtarzalności'});
  if(S.n>1 && S.cv>PR_CV) L.push({t:'warn', m:`Duży rozrzut pomiarów: CV ${fmt(S.cv,1)} %`});
  const P=prPoprz(x); if(P.length){ const sr=P.reduce((a,y)=>a+prStat(y.w).sr,0)/P.length, o=sr?(S.sr-sr)/Math.abs(sr)*100:0;
    if(Math.abs(o)>PR_ODCH) L.push({t:'warn', m:`Średnia ${o>0?'wyższa':'niższa'} o ${fmt(Math.abs(o),0)} % niż we wcześniejszych wpisach (${prF2(sr)} ${x.u})`}); }
  if(!L.length) L.push({t:'ok', m:S.n>1?`Pomiary spójne (CV ${fmt(S.cv,1)} %)`:'Bez uwag'});
  return L; }

/* ——— weryfikacja AI: pytanie do Claude z wpisem/wpisami i historią ——— */
function prPytanie(L){
  const opis=x=>{ const S=prStat(x.w);
    const m=prMx(x.p), sk=m&&m.parts.length?m.parts.map(q=>`${q.n} ${String(q.v).replace('.',',')} ${q.unit}`).join(', '):'';
    return `- ${x.d} · ${x.b}${x.p?` · MMA: ${x.p}`:''}${x.l?` · lepiszcze: ${x.l}`:''}${sk?`\n  skład MMA: ${sk}`:''}\n  pomiary: ${x.w.map(v=>String(v).replace('.',',')).join('; ')} ${x.u}`+
      (S?`\n  średnia ${prF2(S.sr)} ${x.u}${S.n>1?`, odch. std ${prF2(S.sd)}, CV ${fmt(S.cv,1)} %`:''}`:'')+
      (x.war?`\n  warunki: ${x.war}`:'')+(x.n?`\n  uwagi: ${x.n}`:''); };
  const hist=[...new Map(L.flatMap(prPoprz).map(y=>[y.id,y])).values()].sort((a,b)=>a.d.localeCompare(b.d)).slice(-12);
  return `Piszę pracę inżynierską z budownictwa (Politechnika Białostocka). Praca jest dwuczęściowa: kolega zbadał lepiszcza asfaltowe modyfikowane (asfalt + SBS + olej w różnych proporcjach), a moja część to projektowanie mieszanek mineralno-asfaltowych (MMA) na bazie tych lepiszczy i badanie tych mieszanek.

Zweryfikuj moje wyniki badań MMA:
${L.map(opis).join('\n')}
${hist.length?`\nWcześniejsze wyniki tych samych badań i próbek (do porównania):\n${hist.map(opis).join('\n')}\n`:''}
Sprawdź proszę:
1. Czy wartości są realne dla tego typu materiału i badania (typowe zakresy, jednostki)?
2. Czy powtarzalność pomiarów mieści się w wymaganiach odpowiedniej normy PN-EN (jeśli norma podaje dopuszczalne różnice)?
3. Czy wyniki są spójne z wcześniejszymi i z oczekiwanym wpływem lepiszcza (zawartość SBS i oleju) na właściwości MMA? Jeśli to możliwe, oceń je względem typowych wymagań dla danego typu mieszanki (np. WT-2 dla AC/SMA).
4. Co może być przyczyną ewentualnych odchyleń i czy któryś pomiar warto powtórzyć?
Odpowiedz zwięźle, w punktach. Jeśli nie jesteś pewien zakresów z normy, napisz to wprost.`;
}
function prAi(L, btn){
  const q=prPytanie(L), url='https://claude.ai/new?q='+encodeURIComponent(q);
  const done=ok=>{ if(!btn) return; const o=btn.dataset.o||btn.textContent; btn.dataset.o=o; btn.textContent=ok?'Skopiowano — wklej w Claude':'Skopiuj ręcznie'; setTimeout(()=>{ if(btn.isConnected) btn.textContent=o; },2600); };
  const kopiuj=()=>{ try{ const t=document.createElement('textarea'); t.value=q; t.style.cssText='position:fixed;top:-1000px;opacity:0'; document.body.appendChild(t); t.select(); const r=document.execCommand('copy'); t.remove(); return r; }catch(e){ return false; } };
  (navigator.clipboard&&navigator.clipboard.writeText?navigator.clipboard.writeText(q).then(()=>true,kopiuj):Promise.resolve(kopiuj())).then(done);
  window.open(url.length<7500?url:'https://claude.ai/new', '_blank', 'noopener');
}

/* ——— strona ——— */
function prKarta(x){ const S=prStat(x.w), K=prKontrola(x);
  return `<article class="pr-card">
    <div class="pr-ch"><div><b>${esc(x.b||'Badanie')}</b>${x.p||x.l?`<span class="pr-p">${esc(x.p)}${x.p&&x.l?' · ':''}${x.l?'lepiszcze: '+esc(x.l):''}</span>`:''}</div>
      <div class="pr-acts"><button type="button" class="pr-ai" data-pract="ai" data-id="${esc(x.id)}">Weryfikacja AI</button><button type="button" class="td-btn" data-pract="edit" data-id="${esc(x.id)}">Edytuj</button><button type="button" class="g-del" data-pract="del" data-id="${esc(x.id)}" aria-label="Usuń wpis">×</button></div></div>
    <div class="pr-res">${S?`<div class="pr-big"><span class="label">Średnia</span><b>${prF2(S.sr)}</b><small>${esc(x.u)}</small></div>
      ${S.n>1?`<div class="pr-st"><span>n = ${S.n}</span><span>s = ${prF2(S.sd)}</span><span>CV = ${fmt(S.cv,1)} %</span><span>${prF2(S.min)} – ${prF2(S.max)}</span></div>`:''}`:''}
      <div class="pr-pills">${x.w.map(v=>`<span class="tr-pill">${prF2(v)}</span>`).join('')}</div></div>
    ${x.war?`<p class="pr-war"><span class="label">Warunki</span>${esc(x.war)}</p>`:''}
    ${x.n?`<p class="pr-note">${esc(x.n)}</p>`:''}
    <ul class="pr-k">${K.map(k=>`<li class="${k.t}">${esc(k.m)}</li>`).join('')}</ul>
    ${x.ai?`<details class="pr-aitxt"><summary>Wnioski AI</summary><p>${esc(x.ai)}</p></details>`:''}
  </article>`; }
function prHtml(){
  const B=[...new Map(PR.map(x=>[prK(x.b),x.b])).values()].sort((a,b)=>a.localeCompare(b,'pl'));
  const L=PR.filter(x=>!prF||prK(x.b)===prK(prF)).sort((a,b)=>b.d.localeCompare(a.d)||b.c-a.c), dni={};
  L.forEach(x=>{ (dni[x.d]=dni[x.d]||[]).push(x); });
  return `<div class="pr-bar"><button type="button" class="dk-plus" data-pract="new"><span aria-hidden="true">+</span>Nowy wpis</button>
      <div class="pr-io"><button type="button" class="td-btn" data-pract="wklej">Wklej wyniki</button>${PR.length?`<button type="button" class="td-btn" data-pract="kopiuj">Kopiuj wyniki</button>`:''}</div>
      ${B.length>1?`<div class="seg pr-seg" role="tablist"><button type="button" data-prf="" aria-selected="${!prF}">Wszystkie</button>${B.map(b=>`<button type="button" data-prf="${esc(b)}" aria-selected="${prK(prF)===prK(b)}">${esc(b)}</button>`).join('')}</div>`:''}</div>
    ${PR.length?`<section class="block pr-wy"><div class="block-head"><h2>Wykresy</h2></div>${prWyHtml()}</section>`:''}
    ${L.length?Object.entries(dni).map(([d,X])=>`<section class="block pr-day"><div class="block-head"><h2>${d?esc(new Date(d+'T12:00').toLocaleDateString('pl-PL',{weekday:'long', day:'numeric', month:'long', year:'numeric'})):'Bez daty'}</h2>
        ${X.length>1?`<button type="button" class="pr-ai" data-pract="aiday" data-d="${esc(d)}">Weryfikacja AI całego dnia</button>`:''}</div>
      <div class="pr-grid">${X.map(prKarta).join('')}</div></section>`).join('')
    :`<div class="nt-blank"><p>Brak wpisów. Kliknij „+ Nowy wpis” i dodaj dzisiejsze badanie.</p></div>`}`;
}
function prRefresh(){ const a=$('#prApp'); if(a) a.innerHTML=prHtml(); }
/* strona Praca: tylko karty Wyniki Pawła / moje. Dziennik badań (prHtml, dane PR) jest ukryty na życzenie —
   kod i zapisane wpisy zostają (synchronizacja, kopia, kalendarz), żeby nic nie zginęło. */
function pPraca(){ return `<h1>Pra<span class="acc">ca</span></h1><div class="calc-cards pr-wyn" id="prWyn">${mxKarty()}</div>`; }

/* ——— okienko wpisu ——— */
function prModalHtml(){
  const x=PR.find(y=>y.id===prM.id)||prNorm('',{d:todayISO(), ...(prM.wzor||{})});
  const uniq=L=>[...new Set(L.map(s=>String(s||'').trim()).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'pl'));
  const prob=uniq([...PR.map(y=>y.p), ...(typeof MXS==='object'?MXS.moje.map(m=>m.n):[])]);
  const lep=uniq([...PR.map(y=>y.l), ...(typeof MXS==='object'?MXS.pawel.map(m=>m.n):[])]);
  const bad=[...new Map([...PR_BADANIA.map(([n])=>n), ...PR.map(y=>y.b)].filter(Boolean).map(n=>[prK(n),n])).values()];
  return `<form class="pr-form"><div class="tr-top"><div><span class="label">Studia · praca</span><h2>${x.id?'Edytuj wpis':'Nowy wpis'}</h2></div><button type="button" class="tr-x" data-pract="close" aria-label="Zamknij">✕</button></div>
    <div class="pr-fg">
      <label class="mx-f"><span class="label">Data</span><input type="date" name="d" value="${esc(x.d)}" required></label>
      <label class="mx-f pr-wide"><span class="label">Badanie</span><input name="b" value="${esc(x.b)}" list="prBadList" placeholder="np. Penetracja w 25 °C" required autocomplete="off" maxlength="80"><datalist id="prBadList">${bad.map(n=>`<option value="${esc(n)}">`).join('')}</datalist></label>
      <label class="mx-f pr-wide"><span class="label">Mieszanka MMA / próbka</span><input name="p" value="${esc(x.p)}" list="prProbList" placeholder="np. AC 11 S — wariant 2" autocomplete="off" maxlength="100"><datalist id="prProbList">${prob.map(n=>`<option value="${esc(n)}">`).join('')}</datalist></label>
      <label class="mx-f"><span class="label">Lepiszcze (mieszanka Pawła)</span><input name="l" value="${esc(x.l)}" list="prLepList" placeholder="np. Mieszanka 3" autocomplete="off" maxlength="100"><datalist id="prLepList">${lep.map(n=>`<option value="${esc(n)}">`).join('')}</datalist></label>
      <label class="mx-f"><span class="label">Jednostka</span><input name="u" value="${esc(x.u)}" placeholder="np. °C" autocomplete="off" maxlength="20"></label>
    </div>
    <label class="mx-f"><span class="label">Pomiary — oddziel średnikiem, spacją lub Enterem</span><textarea name="w" rows="2" placeholder="np. 52; 54; 53" inputmode="decimal">${esc(x.w.map(v=>String(v).replace('.',',')).join('; '))}</textarea></label>
    <p class="pr-live" id="prLive"></p>
    <label class="mx-f"><span class="label">Warunki (opcjonalnie)</span><input name="war" value="${esc(x.war)}" placeholder="np. kąpiel 25 °C, czas 5 s, obciążenie 100 g" autocomplete="off" maxlength="200"></label>
    <label class="mx-f"><span class="label">Uwagi (opcjonalnie)</span><textarea name="n" rows="2" placeholder="Co zauważyłeś, co poszło nie tak, co powtórzyć…">${esc(x.n)}</textarea></label>
    <label class="mx-f"><span class="label">Wnioski AI (wklej odpowiedź z weryfikacji, opcjonalnie)</span><textarea name="ai" rows="2">${esc(x.ai)}</textarea></label>
    <div class="tr-foot"><span class="tr-err" id="prErr"></span><button type="button" class="td-btn" data-pract="close">Anuluj</button><button type="submit" class="tr-save">Zapisz</button></div></form>`;
}
const prParse = s => String(s||'').split(/[;\s\n]+/).map(prNum).filter(v=>!isNaN(v));
function prLive(){ const f=$('form.pr-form'), el=$('#prLive'); if(!f||!el) return; const S=prStat(prParse(f.w.value.replace(/(\d),(\d)/g,'$1.$2')));
  el.textContent=S?`n = ${S.n} · średnia ${prF2(S.sr)} ${f.u.value}${S.n>1?` · s = ${prF2(S.sd)} · CV = ${fmt(S.cv,1)} %`:''}`:''; el.classList.toggle('warn', !!S&&S.n>1&&S.cv>PR_CV); }
function prRender(){
  let sc=$('#prScrim'), md=$('#prModal');
  if(!prM || !$('#prApp')){ sc&&sc.remove(); md&&md.remove(); prM=null; document.body.classList.remove('tr-lock'); return; }
  if(!md){ sc=document.createElement('div'); sc.id='prScrim'; sc.className='tr-scrim'; document.body.appendChild(sc);
    md=document.createElement('div'); md.id='prModal'; md.className='tr-modal'; md.setAttribute('role','dialog'); md.setAttribute('aria-modal','true'); document.body.appendChild(md); }
  document.body.classList.add('tr-lock');
  if(prM.mode==='wklej'||prM.mode==='kopiuj'){ md.innerHTML=`<div class="tr-panel pr-panel">${prM.mode==='wklej'?prWklejHtml():prKopiujHtml()}</div>`;
    const t=md.querySelector('textarea'); if(t && prM.mode==='wklej' && !matchMedia('(pointer:coarse)').matches) setTimeout(()=>t.focus(),30); return; }
  md.innerHTML=`<div class="tr-panel pr-panel">${prModalHtml()}</div>`; prLive();
  const f=md.querySelector(prM.id?'[name=w]':'[name=b]'); if(f && !matchMedia('(pointer:coarse)').matches) setTimeout(()=>f.focus(),30);
}
document.addEventListener('click', e=>{
  if(e.target.id==='prScrim'||e.target.id==='prModal'){ prM=null; return prRender(); }
  const fb=e.target.closest('[data-prf]'); if(fb){ prF=fb.dataset.prf; store.set('prFiltr',prF); return prRefresh(); }
  const b=e.target.closest('[data-pract]'); if(!b) return;
  const a=b.dataset.pract;
  if(a==='new'){ const ost=PR.slice().sort((x,y)=>y.d.localeCompare(x.d)||y.c-x.c)[0]; prM={id:'', wzor:ost?{p:ost.p, l:ost.l}:{}}; return prRender(); }
  if(a==='edit'){ prM={id:b.dataset.id}; return prRender(); }
  if(a==='wklej'){ prM={mode:'wklej'}; return prRender(); }
  if(a==='kopiuj'){ prM={mode:'kopiuj'}; return prRender(); }
  if(a==='wkdodaj'){ const R=prWklejParse($('#prWkTxt').value).nowe; if(!R.length) return;
    let c=Date.now(); const X=R.map(x=>prNorm(uid('b'),{...x, c:c++})); PR=[...PR,...X]; savePr(); X.forEach(prPush);
    prM=null; prRender(); prRefresh(); return; }
  if(a==='kpt'||a==='kpj'){ const L=prKopiujLista(); prKopiuj(a==='kpt'?prTabela(L):JSON.stringify({app:'Pracownia-badania', v:1, wpisy:L.map(({id,c,...x})=>x)},null,1), b); return; }
  if(a==='close'){ prM=null; return prRender(); }
  if(a==='ai'){ const x=PR.find(y=>y.id===b.dataset.id); if(x) prAi([x], b); return; }
  if(a==='aiday'){ prAi(PR.filter(y=>y.d===b.dataset.d).sort((x,y)=>x.c-y.c), b); return; }
  if(a==='del'){ if(!b.dataset.darm){ b.dataset.darm='1'; b.textContent='Usuń?'; b.classList.add('armed'); setTimeout(()=>{ if(b.isConnected){ delete b.dataset.darm; b.textContent='×'; b.classList.remove('armed'); } },3000); return; }
    const id=b.dataset.id; PR=PR.filter(x=>x.id!==id); savePr(); prRefresh(); cloud(db=>db.collection('badania').doc(id).delete()); }
});
document.addEventListener('input', e=>{
  if(e.target.id==='prWkTxt'){ const p=$('#prWkPrev'); if(p) p.innerHTML=prWklejPrev(e.target.value); return; }
  const f=e.target.form; if(!f || !f.matches('form.pr-form')) return;
  if(e.target.name==='b'){ const m=PR_BADANIA.find(([n])=>prK(n)===prK(e.target.value)); const prev=PR.find(y=>prK(y.b)===prK(e.target.value)&&y.u);
    if((m||prev) && !f.u.value) f.u.value=prev?prev.u:m[1]; }
  if(e.target.name==='p'){ const L=prLep(prMx(e.target.value)); if(L) f.l.value=L.n; }   /* lepiszcze z „Wyników moich” */
  prLive();
});
document.addEventListener('submit', e=>{
  const f=e.target; if(!f.matches('form.pr-form')) return; e.preventDefault();
  const w=prParse(f.w.value.replace(/(\d),(\d)/g,'$1.$2'));
  if(!f.b.value.trim()){ f.b.focus(); return; }
  if(!w.length){ $('#prErr').textContent='Wpisz przynajmniej jeden pomiar (liczbę).'; f.w.focus(); return; }
  const old=PR.find(x=>x.id===prM.id);
  const x=prNorm(old?old.id:uid('b'),{d:f.d.value||todayISO(), b:f.b.value.trim(), p:f.p.value.trim(), l:f.l.value.trim(), u:f.u.value.trim(), w, war:f.war.value.trim(), n:f.n.value.trim(), ai:f.ai.value.trim(), c:old?old.c:Date.now()});
  PR=old?PR.map(y=>y.id===x.id?x:y):[...PR,x]; savePr(); prPush(x); prM=null; prRender(); prRefresh();
});
document.addEventListener('keydown', e=>{ if(prM && e.key==='Escape'){ e.stopPropagation(); prM=null; prRender(); } }, true);

/* ——— WKLEJANIE: tabela albo JSON → wpisy ——— */
const PR_KOL = [['d',/^(data|date|dzie[nń])/], ['b',/^(badanie|test|rodzaj|nazwa bad)/], ['p',/^(mieszanka|pr[oó]bka|mma|sample)/], ['l',/^(lepiszcze|binder|asfalt)/],
  ['u',/^(jednostka|unit|j\.?$)/], ['war',/^(warunki|conditions)/], ['n',/^(uwagi|notatk|komentarz|notes?)/], ['ai',/^(wnioski|ai)/], ['w',/^(pomiar|wynik|warto[sś][cć]|result|value|x\d|nr ?\d|\d+$)/]];
const PR_DOMYSL = ['d','b','p','l','u','w'];   /* bez nagłówka: Data, Badanie, Mieszanka, Lepiszcze, Jednostka, pomiary… */
function prData(v){ v=String(v||'').trim(); let m=v.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/); if(m) return `${m[1]}-${m[2].padStart(2,'0')}-${m[3].padStart(2,'0')}`;
  m=v.match(/^(\d{1,2})[.\/-](\d{1,2})[.\/-](\d{4})/); if(m) return `${m[3]}-${m[2].padStart(2,'0')}-${m[1].padStart(2,'0')}`; return ''; }
const prLiczby = v => String(v||'').replace(/(\d),(\d)/g,'$1.$2').split(/[;\s|]+/).map(prNum).filter(x=>!isNaN(x));
function prWklejParse(txt){
  txt=String(txt||'').trim(); const bledy=[]; let wp=[];
  if(!txt) return {nowe:[], dup:0, bledy, fmt:''};
  if(/^[\[{]/.test(txt)){   /* JSON: {wpisy:[…]} albo tablica */
    try{ const j=JSON.parse(txt), L=Array.isArray(j)?j:(j.wpisy||j.badania||j.results||[]);
      wp=L.map(x=>({d:prData(x.d||x.data||x.date)||todayISO(), b:String(x.b||x.badanie||x.test||''), p:String(x.p||x.mieszanka||x.probka||x.sample||''), l:String(x.l||x.lepiszcze||''),
        u:String(x.u||x.jednostka||x.unit||''), w:Array.isArray(x.w||x.pomiary||x.wyniki)?(x.w||x.pomiary||x.wyniki).map(Number).filter(isFinite):prLiczby(x.w||x.pomiary||x.wyniki||x.wynik||x.wartosc),
        war:String(x.war||x.warunki||''), n:String(x.n||x.uwagi||''), ai:String(x.ai||'')}));
    }catch(e){ return {nowe:[], dup:0, bledy:['To wygląda na JSON, ale nie da się go odczytać.'], fmt:'JSON'}; }
  } else {               /* tabela: separator = tab, potem ;, potem , */
    const wiersze=txt.split(/\r?\n/).filter(r=>r.trim()), sep=wiersze[0].includes('\t')?'\t':wiersze[0].includes(';')?';':',';
    const komorki=wiersze.map(r=>r.split(sep).map(c=>c.trim().replace(/^"|"$/g,'')));
    const nag=komorki[0].map(c=>{ const k=c.toLowerCase(); const h=PR_KOL.find(([,re])=>re.test(k)); return h?h[0]:null; });
    const maNag=nag.filter(Boolean).length>=2 && !prData(komorki[0][0]);
    const kol=maNag?nag:komorki[0].map((_,i)=>PR_DOMYSL[Math.min(i,PR_DOMYSL.length-1)]);
    (maNag?komorki.slice(1):komorki).forEach((r,ri)=>{ const x={d:'',b:'',p:'',l:'',u:'',w:[],war:'',n:'',ai:''};
      r.forEach((c,i)=>{ const k=kol[i]; if(!k||c==='') return; if(k==='w') x.w.push(...prLiczby(c)); else if(k==='d') x.d=prData(c); else x[k]=x[k]?x[k]+' '+c:c; });
      x.wiersz=ri+(maNag?2:1); wp.push(x); });
  }
  const nowe=[]; let dup=0;
  wp.forEach(x=>{ if(!x.b.trim() || !x.w.length){ bledy.push(`${x.wiersz?'Wiersz '+x.wiersz:'Wpis'}: ${!x.b.trim()?'brak nazwy badania':'brak liczb w pomiarach'} — pominięty`); return; }
    x.d=x.d||todayISO(); delete x.wiersz;
    const klucz=y=>[y.d,prK(y.b),prK(y.p),y.w.join('|')].join('#');
    if(PR.some(y=>klucz(y)===klucz(x)) || nowe.some(y=>klucz(y)===klucz(x))){ dup++; return; }
    nowe.push(x); });
  return {nowe, dup, bledy, fmt:/^[\[{]/.test(txt)?'JSON':'tabela'};
}
function prWklejPrev(txt){ const R=prWklejParse(txt); if(!String(txt||'').trim()) return '';
  return `<p class="pr-wkinfo">${R.fmt?`Rozpoznano: <b>${R.fmt}</b> · `:''}nowe wpisy: <b>${R.nowe.length}</b>${R.dup?` · pominięte duplikaty: ${R.dup}`:''}</p>
    ${R.bledy.length?`<ul class="pr-k">${R.bledy.slice(0,6).map(b=>`<li class="warn">${esc(b)}</li>`).join('')}${R.bledy.length>6?`<li class="info">…i ${R.bledy.length-6} więcej</li>`:''}</ul>`:''}
    ${R.nowe.length?`<div class="tbl-wrap"><table class="px-t pr-wkt"><thead><tr><th>Data</th><th>Badanie</th><th>Mieszanka</th><th>Lepiszcze</th><th class="n">Pomiary</th></tr></thead><tbody>
      ${R.nowe.slice(0,30).map(x=>`<tr><td>${dPL(x.d)}</td><td>${esc(x.b)}</td><td>${esc(x.p)}</td><td>${esc(x.l)}</td><td class="n">${x.w.map(v=>prF2(v)).join('; ')} ${esc(x.u)}</td></tr>`).join('')}
      ${R.nowe.length>30?`<tr><td colspan="5">…i ${R.nowe.length-30} więcej</td></tr>`:''}</tbody></table></div>`:''}
    <div class="tr-foot"><button type="button" class="td-btn" data-pract="close">Anuluj</button><button type="button" class="tr-save" data-pract="wkdodaj"${R.nowe.length?'':' disabled'}>Dodaj ${R.nowe.length||''} ${plCntWp(R.nowe.length)}</button></div>`; }
const plCntWp = n => n===1?'wpis':(n%10>=2&&n%10<=4&&(n%100<10||n%100>=20))?'wpisy':'wpisów';
function prWklejHtml(){
  return `<div class="tr-top"><div><span class="label">Studia · praca</span><h2>Wklej wyniki</h2></div><button type="button" class="tr-x" data-pract="close" aria-label="Zamknij">✕</button></div>
    <p class="pr-wkhelp">Wklej tabelę z Excela, Arkusza albo drugiej strony (kolumny: <b>Data · Badanie · Mieszanka · Lepiszcze · Jednostka · Pomiar 1 · Pomiar 2…</b>; nagłówek opcjonalny, mogą być też Warunki i Uwagi) albo JSON skopiowany przyciskiem „Kopiuj wyniki”.</p>
    <textarea id="prWkTxt" class="pr-wktxt" rows="7" placeholder="Data&#9;Badanie&#9;Mieszanka&#9;Lepiszcze&#9;Jednostka&#9;Pomiar 1&#9;Pomiar 2&#10;09.11.2026&#9;Vm&#9;AC 11 S wariant 2&#9;Mieszanka 3&#9;%&#9;3,8&#9;4,1" spellcheck="false"></textarea>
    <div id="prWkPrev"></div>`; }

/* ——— KOPIOWANIE: wszystkie albo tylko z aktualnego filtra ——— */
const prKopiujLista = () => PR.filter(x=>!prF||prK(x.b)===prK(prF)).sort((a,b)=>a.d.localeCompare(b.d)||a.c-b.c);
function prTabela(L){ const n=Math.max(1,...L.map(x=>x.w.length)), czysc=v=>String(v||'').replace(/[\t\r\n]+/g,' ');
  return [['Data','Badanie','Mieszanka','Lepiszcze','Jednostka',...Array.from({length:n},(_,i)=>'Pomiar '+(i+1)),'Średnia','Warunki','Uwagi'].join('\t'),
    ...L.map(x=>{ const S=prStat(x.w); return [x.d, czysc(x.b), czysc(x.p), czysc(x.l), czysc(x.u), ...Array.from({length:n},(_,i)=>x.w[i]!=null?String(x.w[i]).replace('.',','):''), S?String(Math.round(S.sr*1e4)/1e4).replace('.',','):'', czysc(x.war), czysc(x.n)].join('\t'); })].join('\n'); }
function prKopiuj(txt, btn){
  const done=ok=>{ const o=btn.dataset.o||btn.textContent; btn.dataset.o=o; btn.textContent=ok?'Skopiowano ✓':'Nie udało się'; setTimeout(()=>{ if(btn.isConnected) btn.textContent=o; },1800); };
  const awaryjnie=()=>{ try{ const t=document.createElement('textarea'); t.value=txt; t.style.cssText='position:fixed;top:-1000px;opacity:0'; document.body.appendChild(t); t.select(); const r=document.execCommand('copy'); t.remove(); return r; }catch(e){ return false; } };
  (navigator.clipboard&&navigator.clipboard.writeText?navigator.clipboard.writeText(txt).then(()=>true,awaryjnie):Promise.resolve(awaryjnie())).then(done); }
function prKopiujHtml(){ const L=prKopiujLista();
  return `<div class="tr-top"><div><span class="label">Studia · praca</span><h2>Kopiuj wyniki</h2></div><button type="button" class="tr-x" data-pract="close" aria-label="Zamknij">✕</button></div>
    <p class="pr-wkhelp">${L.length} ${plCntWp(L.length)}${prF?` (filtr: ${esc(prF)})`:' (wszystkie)'}, od najstarszego.</p>
    <div class="pr-kp">
      <button type="button" class="pr-kpb" data-pract="kpt"><b>Jako tabela</b><span>Wklejasz do Excela, Arkusza Google albo drugiej strony — każdy pomiar w osobnej kolumnie, plus średnia.</span></button>
      <button type="button" class="pr-kpb" data-pract="kpj"><b>Jako JSON</b><span>Pełne dane (z warunkami, uwagami i wnioskami AI) — do wczytania w drugiej stronie albo z powrotem tutaj.</span></button>
    </div>`; }

/* ——— WYKRESY wyników (rysuje js/27-wykresy.js) ———
   Badanie: z listy. Widok „Mieszanki”: średnia ± odchylenie dla każdej mieszanki MMA (ostatnie wyniki łączone),
   widok „W czasie”: średnia z każdego wpisu po dacie (opcjonalnie tylko jedna mieszanka). „Pobierz PNG” — do pracy. */
let prWyB=store.get('prWyB',''), prWyW=store.get('prWyW','m'), prWyP=store.get('prWyP','');
function prWyHtml(){
  const B=[...new Map(PR.filter(x=>x.w.length).map(x=>[prK(x.b),x.b])).values()].sort((a,b)=>a.localeCompare(b,'pl')); if(!B.length) return '';
  if(!B.some(b=>prK(b)===prK(prWyB))) prWyB=B[0];
  const X=PR.filter(x=>prK(x.b)===prK(prWyB) && x.w.length), u=(X.find(x=>x.u)||{}).u||'';
  let svg, tytul;
  if(prWyW==='m'){
    const G=new Map(); X.forEach(x=>{ const k=prK(x.p)||'—'; if(!G.has(k)) G.set(k,{n:x.p||'bez nazwy', l:x.l, w:[], ile:0}); const g=G.get(k); g.w.push(...x.w); g.ile++; if(x.l) g.l=x.l; });
    const Bs=[...G.values()].sort((a,b)=>a.n.localeCompare(b.n,'pl',{numeric:true})).map(g=>{ const S=prStat(g.w); return {n:g.n, n2:g.l?'lep. '+g.l:'', y:S.sr, sd:S.n>1?S.sd:0, tip:`${prF2(S.sr)} ${u}`, sub:`${g.n}${g.l?' · '+g.l:''} · n = ${S.n}${S.n>1?', s = '+prF2(S.sd):''}`}; });
    svg=wyBars(Bs,{u, label:prWyB}); tytul=`${prWyB} — porównanie mieszanek`;
  } else {
    const P=[...new Set(X.map(x=>x.p).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'pl',{numeric:true}));
    if(prWyP && !P.some(p=>prK(p)===prK(prWyP))) prWyP='';
    const Y=X.filter(x=>!prWyP||prK(x.p)===prK(prWyP)).sort((a,b)=>a.d.localeCompare(b.d)||a.c-b.c);
    svg=wyLine(Y.map(x=>{ const S=prStat(x.w); return {x:x.d, y:S.sr, tip:`${prF2(S.sr)} ${u}`, sub:`${dPL(x.d)}${x.p?' · '+x.p:''}${S.n>1?' · s = '+prF2(S.sd):''}`}; }),{u, label:prWyB});
    if(Y.length<2) svg=`<div class="wy-empty">Potrzebne są co najmniej 2 wpisy tego badania${prWyP?' dla tej mieszanki':''}, żeby narysować przebieg w czasie.</div>`;
    tytul=`${prWyB}${prWyP?' — '+prWyP:''} — w czasie`;
    var pSel=`<label class="pg-sel"><span class="label">Mieszanka</span><select class="pr-wyp"><option value="">Wszystkie</option>${P.map(p=>`<option value="${esc(p)}"${prK(p)===prK(prWyP)?' selected':''}>${esc(p)}</option>`).join('')}</select></label>`;
  }
  return `<div class="pg-bar"><label class="pg-sel"><span class="label">Badanie</span><select class="pr-wyb">${B.map(b=>`<option value="${esc(b)}"${prK(b)===prK(prWyB)?' selected':''}>${esc(b)}</option>`).join('')}</select></label>
      <div class="seg" role="tablist"><button type="button" data-prwyw="m" aria-selected="${prWyW==='m'}">Mieszanki</button><button type="button" data-prwyw="t" aria-selected="${prWyW==='t'}">W czasie</button></div>${prWyW==='t'?pSel:''}</div>
    ${wyBox(svg, tytul+(u?` [${u}]`:''))}`;
}
document.addEventListener('change', e=>{ const t=e.target; if(!t.matches) return;
  if(t.matches('.pr-wyb')){ prWyB=t.value; store.set('prWyB',prWyB); t.blur(); prRefresh(); }
  if(t.matches('.pr-wyp')){ prWyP=t.value; store.set('prWyP',prWyP); t.blur(); prRefresh(); } });
document.addEventListener('click', e=>{ const b=e.target.closest&&e.target.closest('[data-prwyw]'); if(b){ prWyW=b.dataset.prwyw; store.set('prWyW',prWyW); prRefresh(); } });
