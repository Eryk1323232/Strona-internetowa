/* ════════════════════════════════════════════════════════════════════════
   PRACA (STUDIA) — dziennik badań do pracy inżynierskiej
   ════════════════════════════════════════════════════════════════════════
   PR – wpisy badań (chmura: kolekcja „badania”):
     d data · b badanie · p próbka / mieszanka · u jednostka · w pomiary [liczby]
     war warunki (temperatura, sprzęt…) · n uwagi · ai wnioski z weryfikacji AI · c kolejność
   Szybka kontrola (prKontrola) — liczona na stronie, bez internetu:
     • rozrzut pomiarów: współczynnik zmienności > PR_CV %,
     • wynik odbiega o > PR_ODCH % od średniej wcześniejszych wpisów tego badania i tej próbki,
     • mniej niż 2 pomiary (nie da się ocenić powtarzalności).
   Weryfikacja AI (prAi) — składa gotowe pytanie z wpisem i historią tego badania,
     kopiuje je i otwiera Claude (claude.ai/new?q=…). Odpowiedź można wkleić w „Wnioski AI”.
   PR_BADANIA — podpowiedzi nazw badań z jednostkami (dopisz własne).
   ════════════════════════════════════════════════════════════════════════ */
const PR_CV = 10, PR_ODCH = 15;
const PR_BADANIA = [
  ['Penetracja w 25 °C','0,1 mm'], ['Temperatura mięknienia PiK','°C'], ['Temperatura łamliwości Fraassa','°C'],
  ['Nawrót sprężysty','%'], ['Lepkość dynamiczna','Pa·s'], ['Siła rozciągania (duktylometr)','J/cm²'],
  ['Gęstość objętościowa','Mg/m³'], ['Gęstość','Mg/m³'], ['Zawartość wolnych przestrzeni','%'],
  ['Wytrzymałość na pośrednie rozciąganie ITS','kPa'], ['Wrażliwość na wodę ITSR','%'], ['Moduł sztywności','MPa'],
  ['Koleinowanie WTS','mm/10³ cykli'], ['Koleinowanie PRD','%'], ['Spływność lepiszcza (Schellenberg)','%']
];
const prNorm = (id,v={}) => ({id, d:String(v.d||''), b:String(v.b||''), p:String(v.p||''), u:String(v.u||''),
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
    return `- ${x.d} · ${x.b}${x.p?` · próbka: ${x.p}`:''}\n  pomiary: ${x.w.map(v=>String(v).replace('.',',')).join('; ')} ${x.u}`+
      (S?`\n  średnia ${prF2(S.sr)} ${x.u}${S.n>1?`, odch. std ${prF2(S.sd)}, CV ${fmt(S.cv,1)} %`:''}`:'')+
      (x.war?`\n  warunki: ${x.war}`:'')+(x.n?`\n  uwagi: ${x.n}`:''); };
  const hist=[...new Map(L.flatMap(prPoprz).map(y=>[y.id,y])).values()].sort((a,b)=>a.d.localeCompare(b.d)).slice(-12);
  return `Piszę pracę inżynierską z budownictwa (Politechnika Białostocka): lepiszcza asfaltowe modyfikowane (asfalt + SBS + olej, różne proporcje) i mieszanki mineralno-asfaltowe (MMA) projektowane na ich bazie.

Zweryfikuj moje dzisiejsze wyniki badań laboratoryjnych:
${L.map(opis).join('\n')}
${hist.length?`\nWcześniejsze wyniki tych samych badań i próbek (do porównania):\n${hist.map(opis).join('\n')}\n`:''}
Sprawdź proszę:
1. Czy wartości są realne dla tego typu materiału i badania (typowe zakresy, jednostki)?
2. Czy powtarzalność pomiarów mieści się w wymaganiach odpowiedniej normy PN-EN (jeśli norma podaje dopuszczalne różnice)?
3. Czy wyniki są spójne z wcześniejszymi i z oczekiwanym wpływem dodatków (SBS, olej)?
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
    <div class="pr-ch"><div><b>${esc(x.b||'Badanie')}</b>${x.p?`<span class="pr-p">${esc(x.p)}</span>`:''}</div>
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
      ${B.length>1?`<div class="seg pr-seg" role="tablist"><button type="button" data-prf="" aria-selected="${!prF}">Wszystkie</button>${B.map(b=>`<button type="button" data-prf="${esc(b)}" aria-selected="${prK(prF)===prK(b)}">${esc(b)}</button>`).join('')}</div>`:''}</div>
    ${L.length?Object.entries(dni).map(([d,X])=>`<section class="block pr-day"><div class="block-head"><h2>${d?esc(new Date(d+'T12:00').toLocaleDateString('pl-PL',{weekday:'long', day:'numeric', month:'long', year:'numeric'})):'Bez daty'}</h2>
        ${X.length>1?`<button type="button" class="pr-ai" data-pract="aiday" data-d="${esc(d)}">Weryfikacja AI całego dnia</button>`:''}</div>
      <div class="pr-grid">${X.map(prKarta).join('')}</div></section>`).join('')
    :`<div class="nt-blank"><p>Brak wpisów. Kliknij „+ Nowy wpis” i dodaj dzisiejsze badanie.</p></div>`}`;
}
function prRefresh(){ const a=$('#prApp'); if(a) a.innerHTML=prHtml(); }
function pPraca(){ return `<h1>Pra<span class="acc">ca</span></h1><div id="prApp">${prHtml()}</div>`; }

/* ——— okienko wpisu ——— */
function prModalHtml(){
  const x=PR.find(y=>y.id===prM.id)||prNorm('',{d:todayISO(), ...(prM.wzor||{})});
  const prob=[...new Set([...PR.map(y=>y.p), ...(typeof MXS==='object'?[...MXS.pawel,...MXS.moje].map(m=>m.n):[])].map(s=>String(s||'').trim()).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'pl'));
  const bad=[...new Map([...PR_BADANIA.map(([n])=>n), ...PR.map(y=>y.b)].filter(Boolean).map(n=>[prK(n),n])).values()];
  return `<form class="pr-form"><div class="tr-top"><div><span class="label">Studia · praca</span><h2>${x.id?'Edytuj wpis':'Nowy wpis'}</h2></div><button type="button" class="tr-x" data-pract="close" aria-label="Zamknij">✕</button></div>
    <div class="pr-fg">
      <label class="mx-f"><span class="label">Data</span><input type="date" name="d" value="${esc(x.d)}" required></label>
      <label class="mx-f pr-wide"><span class="label">Badanie</span><input name="b" value="${esc(x.b)}" list="prBadList" placeholder="np. Penetracja w 25 °C" required autocomplete="off" maxlength="80"><datalist id="prBadList">${bad.map(n=>`<option value="${esc(n)}">`).join('')}</datalist></label>
      <label class="mx-f pr-wide"><span class="label">Próbka / mieszanka</span><input name="p" value="${esc(x.p)}" list="prProbList" placeholder="np. Mieszanka 3 — 5 % SBS, 2 % oleju" autocomplete="off" maxlength="100"><datalist id="prProbList">${prob.map(n=>`<option value="${esc(n)}">`).join('')}</datalist></label>
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
  document.body.classList.add('tr-lock'); md.innerHTML=`<div class="tr-panel pr-panel">${prModalHtml()}</div>`; prLive();
  const f=md.querySelector(prM.id?'[name=w]':'[name=b]'); if(f && !matchMedia('(pointer:coarse)').matches) setTimeout(()=>f.focus(),30);
}
document.addEventListener('click', e=>{
  if(e.target.id==='prScrim'||e.target.id==='prModal'){ prM=null; return prRender(); }
  const fb=e.target.closest('[data-prf]'); if(fb){ prF=fb.dataset.prf; store.set('prFiltr',prF); return prRefresh(); }
  const b=e.target.closest('[data-pract]'); if(!b) return;
  const a=b.dataset.pract;
  if(a==='new'){ const ost=PR.slice().sort((x,y)=>y.d.localeCompare(x.d)||y.c-x.c)[0]; prM={id:'', wzor:ost?{p:ost.p}:{}}; return prRender(); }
  if(a==='edit'){ prM={id:b.dataset.id}; return prRender(); }
  if(a==='close'){ prM=null; return prRender(); }
  if(a==='ai'){ const x=PR.find(y=>y.id===b.dataset.id); if(x) prAi([x], b); return; }
  if(a==='aiday'){ prAi(PR.filter(y=>y.d===b.dataset.d).sort((x,y)=>x.c-y.c), b); return; }
  if(a==='del'){ if(!b.dataset.darm){ b.dataset.darm='1'; b.textContent='Usuń?'; b.classList.add('armed'); setTimeout(()=>{ if(b.isConnected){ delete b.dataset.darm; b.textContent='×'; b.classList.remove('armed'); } },3000); return; }
    const id=b.dataset.id; PR=PR.filter(x=>x.id!==id); savePr(); prRefresh(); cloud(db=>db.collection('badania').doc(id).delete()); }
});
document.addEventListener('input', e=>{
  const f=e.target.form; if(!f || !f.matches('form.pr-form')) return;
  if(e.target.name==='b'){ const m=PR_BADANIA.find(([n])=>prK(n)===prK(e.target.value)); const prev=PR.find(y=>prK(y.b)===prK(e.target.value)&&y.u);
    if((m||prev) && !f.u.value) f.u.value=prev?prev.u:m[1]; }
  prLive();
});
document.addEventListener('submit', e=>{
  const f=e.target; if(!f.matches('form.pr-form')) return; e.preventDefault();
  const w=prParse(f.w.value.replace(/(\d),(\d)/g,'$1.$2'));
  if(!f.b.value.trim()){ f.b.focus(); return; }
  if(!w.length){ $('#prErr').textContent='Wpisz przynajmniej jeden pomiar (liczbę).'; f.w.focus(); return; }
  const old=PR.find(x=>x.id===prM.id);
  const x=prNorm(old?old.id:uid('b'),{d:f.d.value||todayISO(), b:f.b.value.trim(), p:f.p.value.trim(), u:f.u.value.trim(), w, war:f.war.value.trim(), n:f.n.value.trim(), ai:f.ai.value.trim(), c:old?old.c:Date.now()});
  PR=old?PR.map(y=>y.id===x.id?x:y):[...PR,x]; savePr(); prPush(x); prM=null; prRender(); prRefresh();
});
document.addEventListener('keydown', e=>{ if(prM && e.key==='Escape'){ e.stopPropagation(); prM=null; prRender(); } }, true);
