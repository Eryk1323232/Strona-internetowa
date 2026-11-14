/* ════════════════════════════════════════════════════════════════
   ASYSTENT AI — mały czat w prawym dolnym rogu (Claude / Gemini)
   Silnik i model („moc”) wybierane w nagłówku czatu; lista modeli pobierana z API (GET /v1/models, /v1beta/models),
   z zapasową listą AI_DOMYSLNE, gdy pobranie się nie uda.
   KLUCZE API: wpisywane w ustawieniach czatu, trzymane WYŁĄCZNIE w tej przeglądarce (localStorage 'aiKluczClaude',
   'aiKluczGemini') — nie idą do Arkusza ani do kopii zapasowej (KOPIA_POMIN w js/20-kopia-zapasowa.js).
   Zapytania lecą prosto z przeglądarki do api.anthropic.com / generativelanguage.googleapis.com (strumieniowo, SSE).
   KONTEKST: gdy włączone „dane ze strony”, do polecenia systemowego dochodzi skrót aiKontekst():
   otwarte zadania, najbliższe 14 dni z kalendarza, wydatki miesiąca, zasoby WoT.
   AKCJE: model może zaproponować akcję blokiem ```akcja {json}``` (zadanie / wydatek / wpływ / notatka) —
   czat pokazuje ją jako przycisk; nic nie dzieje się bez kliknięcia (wykonują funkcje sd* z js/36-szybko-dodaj.js).
   Rozmowa: store 'aiRozmowa' (ostatnie 40 wiadomości), ustawienia: store 'aiUst' {silnik, model:{claude,gemini}, dane}.
   ════════════════════════════════════════════════════════════════ */
const AI_SIL = { claude:{n:'Claude', klucz:'aiKluczClaude', skad:'https://platform.claude.com/settings/keys'}, gemini:{n:'Gemini', klucz:'aiKluczGemini', skad:'https://aistudio.google.com/apikey'} };
const AI_DOMYSLNE = { claude:[['claude-fable-5-2','Claude Fable 5.2'],['claude-opus-5-5','Claude Opus 5.5'],['claude-sonnet-5-5','Claude Sonnet 5.5'],['claude-haiku-5-5','Claude Haiku 5.5']],
  gemini:[['gemini-2.5-pro','Gemini 2.5 Pro'],['gemini-2.5-flash','Gemini 2.5 Flash']] };
let AI = { ust:(()=>{ let u={}; try{ u=JSON.parse(store.get('aiUst','{}'))||{}; }catch(e){} return {silnik:u.silnik==='gemini'?'gemini':'claude', model:Object.assign({claude:'claude-sonnet-5-5', gemini:''}, u.model||{}), dane:u.dane!==false}; })(),
  msg:(()=>{ try{ const m=JSON.parse(store.get('aiRozmowa','[]')); return Array.isArray(m)?m.filter(x=>x&&(x.r==='u'||x.r==='a')&&typeof x.t==='string'):[]; }catch(e){ return []; } })(),
  otw:false, widok:'czat', pisze:null, modele:{}, blad:'' };
const aiKlucz = s => { try{ return localStorage.getItem(AI_SIL[s].klucz)||''; }catch(e){ return ''; } };
const aiZapiszUst = () => store.set('aiUst', JSON.stringify(AI.ust));
const aiZapiszRozm = () => store.set('aiRozmowa', JSON.stringify(AI.msg.slice(-40)));
const aiModele = s => AI.modele[s] || AI_DOMYSLNE[s];
const aiModel = s => { const L=aiModele(s), m=AI.ust.model[s]; return L.some(x=>x[0]===m)?m:(L[0]||[''])[0]; };

/* ——— skrót danych ze strony ——— */
function aiKontekst(){
  const td=todayISO(), L=[`Dziś jest ${new Date().toLocaleDateString('pl-PL',{weekday:'long',day:'numeric',month:'long',year:'numeric'})} (${td}), godzina ${new Date().toTimeString().slice(0,5)}.`];
  try{ if(typeof T==='object' && T.tasks){ const o=T.tasks.filter(t=>!t.done).sort((a,b)=>(a.due||'9')<(b.due||'9')?-1:1).slice(0,30);
    L.push(`ZADANIA (otwarte, ${T.tasks.filter(t=>!t.done).length}):\n`+(o.map(t=>`- ${t.t}${t.due?' [termin '+t.due+(t.tm?' '+t.tm:'')+']':''}${t.imp?' [ważne]':''}`).join('\n')||'- brak')); } }catch(e){}
  try{ if(typeof kalZbierz==='function'){ const M=kalZbierz(td, isoAdd(td,14)), dni=Object.keys(M).sort();
    L.push('KALENDARZ (14 dni):\n'+(dni.map(d=>`- ${d}: `+M[d].filter(e=>e.k!=='todo').map(e=>`${e.n}${e.tm?' '+e.tm:''}${e.kw?' '+fmt(e.kw,0)+' zł':''} (${e.k==='tren'?'trening':e.k==='plat'?'płatność':e.k})`).join('; ')).filter(x=>!/: $/.test(x)).join('\n')||'- nic poza zadaniami')); } }catch(e){}
  try{ if(typeof FIN==='object'){ const m=td.slice(0,7), W=FIN.ops.filter(o=>o.t==='wyd'&&o.d.slice(0,7)===m&&o.d<=td), K={}; W.forEach(o=>K[o.kat||'inne']=(K[o.kat||'inne']||0)+o.a);
    L.push(`WYDATKI w tym miesiącu: ${fmt(W.reduce((a,o)=>a+o.a,0),0)} zł`+(Object.keys(K).length?' ('+Object.entries(K).sort((a,b)=>b[1]-a[1]).map(([k,v])=>`${k} ${fmt(v,0)}`).join(', ')+')':'')); } }catch(e){}
  try{ if(typeof GK!=='undefined' && GK){ const z=['Kredyty','Złoto','Wolne XP','Obligacje'].filter(k=>GK[k]!==undefined&&GK[k]!=='').map(k=>`${k}: ${GK[k]}`); if(z.length) L.push('WORLD OF TANKS: '+z.join(', ')); } }catch(e){}
  return L.join('\n\n');
}
function aiSystem(){
  return `Jesteś asystentem wbudowanym w „Pracownię” — prywatną stronę Eryka, studenta budownictwa na Politechnice Białostockiej i gracza World of Tanks. Strona ma działy: Strona główna, Kalendarz, CV, To-Do, Notatki, Kalkulatory, Dyski, Praca (wyniki badań mieszanek), World of Tanks, Gry, Siłownia, Pozostałe, Pieniądze.
Odpowiadaj po polsku, krótko i konkretnie; okno czatu jest małe, więc bez długich wstępów. Możesz używać prostego Markdownu (pogrubienia, listy, bloki kodu).
Gdy użytkownik prosi o dodanie zadania, wydatku, wpływu albo notatki, dołącz na końcu odpowiedzi blok (jeden na akcję):
\`\`\`akcja
{"typ":"zadanie","tytul":"…","termin":"RRRR-MM-DD","godzina":"GG:MM"}
\`\`\`
Inne typy: {"typ":"wydatek","kwota":12.5,"opis":"…","kategoria":"jedzenie"} · {"typ":"wplyw","kwota":250,"opis":"…"} · {"typ":"notatka","tekst":"…"}. Pola termin i godzina są opcjonalne. Strona pokaże przycisk — akcja wykona się dopiero po kliknięciu, więc nie pisz, że już coś dodałeś.`
  + (AI.ust.dane?`\n\nAktualne dane ze strony (do wglądu, nie powtarzaj ich bez potrzeby):\n${aiKontekst()}`:'');
}

/* ——— wywołania API (strumień SSE) ——— */
async function aiSSE(res, naTekst){
  const rd=res.body.getReader(), dec=new TextDecoder(); let buf='';
  for(;;){ const {done,value}=await rd.read(); if(done) break; buf+=dec.decode(value,{stream:true});
    let i; while((i=buf.indexOf('\n'))>=0){ const l=buf.slice(0,i).trim(); buf=buf.slice(i+1); if(!l.startsWith('data:')) continue; const d=l.slice(5).trim(); if(!d||d==='[DONE]') continue; try{ naTekst(JSON.parse(d)); }catch(e){} } }
}
async function aiBlad(res){ let t=''; try{ const j=await res.json(); t=(j.error&&(j.error.message||j.error.status))||JSON.stringify(j).slice(0,200); }catch(e){}
  const s=res.status; return (s===401||s===403?'Klucz API jest nieprawidłowy albo nie ma dostępu. ':s===429?'Limit zapytań lub brak środków na koncie API. ':s===404?'Ten model nie jest dostępny dla Twojego klucza. ':`Błąd ${s}. `)+(t||''); }
async function aiPytaj(msgs, naKawalek, signal){
  const s=AI.ust.silnik, k=aiKlucz(s), model=aiModel(s), sys=aiSystem();
  if(s==='claude'){
    const res=await fetch('https://api.anthropic.com/v1/messages',{method:'POST', signal, headers:{'content-type':'application/json','x-api-key':k,'anthropic-version':'2023-06-01','anthropic-dangerous-direct-browser-access':'true'},
      body:JSON.stringify({model, max_tokens:2048, stream:true, system:sys, messages:msgs.map(m=>({role:m.r==='u'?'user':'assistant', content:m.t}))})});
    if(!res.ok) throw new Error(await aiBlad(res));
    await aiSSE(res, j=>{ if(j.type==='content_block_delta' && j.delta && j.delta.type==='text_delta') naKawalek(j.delta.text); if(j.type==='error') throw new Error(j.error&&j.error.message||'Błąd strumienia'); });
  } else {
    const res=await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:streamGenerateContent?alt=sse`,{method:'POST', signal, headers:{'content-type':'application/json','x-goog-api-key':k},
      body:JSON.stringify({systemInstruction:{parts:[{text:sys}]}, contents:msgs.map(m=>({role:m.r==='u'?'user':'model', parts:[{text:m.t}]}))})});
    if(!res.ok) throw new Error(await aiBlad(res));
    await aiSSE(res, j=>{ const p=j.candidates&&j.candidates[0]&&j.candidates[0].content&&j.candidates[0].content.parts; if(p) p.forEach(x=>{ if(x.text&&!x.thought) naKawalek(x.text); }); });
  }
}
async function aiPobierzModele(s){
  const k=aiKlucz(s); if(!k) return;
  try{
    if(s==='claude'){ const r=await fetch('https://api.anthropic.com/v1/models?limit=100',{headers:{'x-api-key':k,'anthropic-version':'2023-06-01','anthropic-dangerous-direct-browser-access':'true'}}); if(!r.ok) throw new Error(await aiBlad(r));
      const j=await r.json(), L=(j.data||[]).filter(m=>!m.lifecycle||m.lifecycle==='active').map(m=>[m.id, m.display_name||m.id]); if(L.length) AI.modele.claude=L; }
    else { const r=await fetch('https://generativelanguage.googleapis.com/v1beta/models?pageSize=200',{headers:{'x-goog-api-key':k}}); if(!r.ok) throw new Error(await aiBlad(r));
      const j=await r.json(), L=(j.models||[]).filter(m=>(m.supportedGenerationMethods||[]).includes('generateContent') && /gemini/i.test(m.name) && !/embedding|aqa|tts|image|audio|live|robotics|computer-use/i.test(m.name))
        .map(m=>[m.name.replace(/^models\//,''), m.displayName||m.name]).sort((a,b)=>b[0].localeCompare(a[0],undefined,{numeric:true})); if(L.length) AI.modele.gemini=L; }
    store.set('aiModele', JSON.stringify(AI.modele)); AI.blad='';
  }catch(e){ AI.blad=`Lista modeli ${AI_SIL[s].n}: ${e.message}`; }
  aiRender();
}
try{ const m=JSON.parse(store.get('aiModele','{}')); if(m&&typeof m==='object') AI.modele=m; }catch(e){}

/* ——— Markdown (prosty, bezpieczny) + akcje ——— */
function aiMd(t){
  const bloki=[]; let s=String(t).replace(/```(\w*)\n?([\s\S]*?)(```|$)/g,(_,jez,kod)=>{ bloki.push([jez,kod]); return `\u0000${bloki.length-1}\u0000`; });
  s=esc(s).replace(/`([^`\n]+)`/g,'<code>$1</code>').replace(/\*\*([^*\n]+)\*\*/g,'<b>$1</b>').replace(/(^|[^*])\*([^*\n]+)\*/g,'$1<i>$2</i>')
    .replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g,'<a href="$2" target="_blank" rel="noopener">$1</a>');
  const out=[]; let lista='';
  s.split('\n').forEach(l=>{ const p=/^\s*[-*•]\s+(.*)$/.exec(l), n=/^\s*\d+[.)]\s+(.*)$/.exec(l), h=/^#{1,4}\s+(.*)$/.exec(l), typ=p?'ul':n?'ol':'';
    if(typ!==lista){ if(lista) out.push(`</${lista}>`); if(typ) out.push(`<${typ}>`); lista=typ; }
    if(typ) out.push(`<li>${(p||n)[1]}</li>`); else if(h) out.push(`<p><b>${h[1]}</b></p>`); else if(l.trim()) out.push(`<p>${l}</p>`); });
  if(lista) out.push(`</${lista}>`);
  return out.join('').replace(/(?:<p>)?\u0000(\d+)\u0000(?:<\/p>)?/g,(_,i)=>{ const [jez,kod]=bloki[+i]; if(jez==='akcja') return aiAkcjaHtml(kod); return `<pre><code>${esc(kod.replace(/\n$/,''))}</code></pre>`; });
}
function aiAkcjaCzytaj(kod){ try{ const a=JSON.parse(kod); if(!a||typeof a!=='object') return null;
    if(a.typ==='zadanie' && a.tytul) return {typ:'zadanie', tytul:String(a.tytul).slice(0,200), termin:/^\d{4}-\d{2}-\d{2}$/.test(a.termin||'')?a.termin:'', godzina:/^\d{2}:\d{2}$/.test(a.godzina||'')?a.godzina:''};
    if((a.typ==='wydatek'||a.typ==='wplyw') && +a.kwota>0) return {typ:a.typ, kwota:Math.round(+a.kwota*100)/100, opis:String(a.opis||'').slice(0,120), kategoria:String(a.kategoria||'inne').slice(0,30), termin:/^\d{4}-\d{2}-\d{2}$/.test(a.termin||'')?a.termin:''};
    if(a.typ==='notatka' && a.tekst) return {typ:'notatka', tekst:String(a.tekst).slice(0,4000)}; }catch(e){} return null; }
function aiAkcjaHtml(kod){ const a=aiAkcjaCzytaj(kod); if(!a) return '';
  const op=a.typ==='zadanie'?`Zadanie: ${a.tytul}${a.termin?' · '+dPL(a.termin):''}${a.godzina?' '+a.godzina:''}`:a.typ==='notatka'?`Notatka: ${a.tekst.slice(0,60)}${a.tekst.length>60?'…':''}`:`${a.typ==='wplyw'?'Wpływ':'Wydatek'}: ${fmt(a.kwota,Number.isInteger(a.kwota)?0:2)} zł${a.opis?' · '+a.opis:''} · ${a.kategoria}`;
  return `<button type="button" class="ai-akcja" data-aiakcja="${esc(JSON.stringify(a))}"><span>+</span>${esc(op)}</button>`; }
function aiAkcjaWykonaj(a){
  if(a.typ==='zadanie') return sdDodajZadanie({due:a.termin, tm:a.godzina}, a.tytul);
  if(a.typ==='notatka') return sdDodajNotatke(a.tekst);
  return sdDodajWydatek({typ:a.typ==='wplyw'?'wpl':'wyd', kwota:a.kwota, kat:a.kategoria, opis:a.opis, due:a.termin});
}

/* ——— interfejs ——— */
const AI_IK = { czat:'M5 5h14a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-6l-4.5 3.5V17H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2z', zeb:'M4 7h10M18 7h2M4 17h4M12 17h8M14 4.5v5M8 14.5v5',
  nowa:'M12 5v14M5 12h14', x:'M6 6l12 12M18 6L6 18', wyslij:'M4 12l16-7-6 16-3-6.5z', stop:'M7 7h10v10H7z' };
const aiIk = k => `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="${AI_IK[k]}"/></svg>`;
function aiRender(){
  let b=$('#aiFab'); if(!b){ b=document.createElement('button'); b.id='aiFab'; b.type='button'; b.className='ai-fab'; b.setAttribute('aria-label','Asystent AI'); b.title='Asystent AI'; b.innerHTML=aiIk('czat'); document.body.appendChild(b); }
  b.hidden=AI.otw;
  let p=$('#aiPanel'); if(!AI.otw){ p&&p.remove(); return; }
  if(!p){ p=document.createElement('section'); p.id='aiPanel'; p.className='ai-panel'; p.setAttribute('role','dialog'); p.setAttribute('aria-label','Asystent AI'); document.body.appendChild(p); }
  const s=AI.ust.silnik, maKlucz=!!aiKlucz(s), szkic=($('#aiWe')||{}).value||'';
  const glowa=`<header class="ai-top"><div class="seg ai-sil" role="tablist" aria-label="Silnik">${Object.entries(AI_SIL).map(([k,v])=>`<button type="button" data-aisil="${k}" aria-selected="${k===s}">${v.n}</button>`).join('')}</div>
      <select id="aiModel" class="ai-model" aria-label="Model" title="Model („moc”)">${aiModele(s).map(([id,n])=>`<option value="${esc(id)}"${id===aiModel(s)?' selected':''}>${esc(n)}</option>`).join('')}</select>
      <button type="button" class="ai-ib" data-aiact="nowa" title="Nowa rozmowa" aria-label="Nowa rozmowa">${aiIk('nowa')}</button><button type="button" class="ai-ib" data-aiact="ust" title="Ustawienia i klucze API" aria-label="Ustawienia" aria-pressed="${AI.widok==='ust'}">${aiIk('zeb')}</button><button type="button" class="ai-ib" data-aiact="zamknij" title="Zamknij" aria-label="Zamknij">${aiIk('x')}</button></header>`;
  if(AI.widok==='ust' || !maKlucz){
    p.innerHTML=glowa+`<div class="ai-ust">${maKlucz?'':`<p class="ai-info"><b>Żeby zacząć, wklej klucz API ${AI_SIL[s].n}.</b> Klucz zostaje tylko w tej przeglądarce.</p>`}
      ${Object.entries(AI_SIL).map(([k,v])=>`<label class="ai-f"><span class="label">Klucz API ${v.n} ${aiKlucz(k)?'<em>zapisany</em>':''}</span><input type="password" data-aiklucz="${k}" value="${esc(aiKlucz(k))}" placeholder="${k==='claude'?'sk-ant-…':'AIza…'}" autocomplete="off" spellcheck="false">
        <a href="${v.skad}" target="_blank" rel="noopener">Skąd wziąć klucz ${v.n} →</a></label>`).join('')}
      <label class="ai-chk"><input type="checkbox" id="aiDane"${AI.ust.dane?' checked':''}><span>Dołączaj dane ze strony (zadania, kalendarz, wydatki miesiąca, zasoby WoT), żeby asystent wiedział, co u Ciebie</span></label>
      <p class="ai-pom">Klucze są zapisane wyłącznie w tej przeglądarce — nie trafiają do Arkusza ani kopii zapasowej, więc na telefonie wpisujesz je osobno. Zapytania idą bezpośrednio do Anthropic / Google i są płatne według cennika API. Ustaw limit wydatków na koncie API.</p>
      ${AI.blad?`<p class="ai-blad">${esc(AI.blad)}</p>`:''}
      <div class="ai-ustb"><button type="button" class="uk-btn" data-aiact="modele">Odśwież listę modeli</button>${maKlucz?'<button type="button" class="uk-btn uk-ok" data-aiact="czat">Gotowe</button>':''}</div></div>`;
    return; }
  p.innerHTML=glowa+`<div class="ai-msgs" id="aiMsgs" aria-live="polite">${AI.msg.length?AI.msg.map((m,i)=>`<div class="ai-m ${m.r==='u'?'u':'a'}${m.blad?' blad':''}">${m.r==='u'?esc(m.t).replace(/\n/g,'<br>'):aiMd(m.t)||(AI.pisze&&i===AI.msg.length-1?'<span class="ai-kropki"><i></i><i></i><i></i></span>':'')}</div>`).join('')
      :`<div class="ai-pusto"><b>Cześć, w czym pomóc?</b><div class="ai-podp">${['Co mam dziś do zrobienia?','Ile wydałem w tym miesiącu?','Dodaj zadanie: oddać projekt z dróg w piątek','Wytłumacz krótko nośność graniczną gruntu'].map(x=>`<button type="button" data-aipodp="${esc(x)}">${esc(x)}</button>`).join('')}</div></div>`}</div>
    <form class="ai-we" id="aiForm" data-nodraft><textarea id="aiWe" rows="1" placeholder="Napisz do asystenta…" aria-label="Wiadomość">${esc(szkic)}</textarea>
      <button type="${AI.pisze?'button':'submit'}" class="ai-ws"${AI.pisze?' data-aiact="stop"':''} aria-label="${AI.pisze?'Zatrzymaj':'Wyślij'}">${aiIk(AI.pisze?'stop':'wyslij')}</button></form>`;
  const m=$('#aiMsgs'); m.scrollTop=m.scrollHeight;
}
function aiOstatnia(){ const m=$('#aiMsgs'); if(!m) return; const el=m.lastElementChild, o=AI.msg[AI.msg.length-1]; if(!el||!o) return;
  const naDole=m.scrollHeight-m.scrollTop-m.clientHeight<60; el.innerHTML=aiMd(o.t)||'<span class="ai-kropki"><i></i><i></i><i></i></span>'; if(naDole) m.scrollTop=m.scrollHeight; }
async function aiWyslij(tekst){
  tekst=String(tekst||'').trim(); if(!tekst || AI.pisze) return;
  AI.msg.push({r:'u', t:tekst}); const odp={r:'a', t:''}; AI.msg.push(odp); AI.pisze=new AbortController(); const we=$('#aiWe'); if(we) we.value=''; aiRender();
  try{ let raf=0; await aiPytaj(AI.msg.slice(0,-1).filter(m=>!m.blad).slice(-20), k=>{ odp.t+=k; if(!raf) raf=requestAnimationFrame(()=>{ raf=0; aiOstatnia(); }); }, AI.pisze.signal);
    if(!odp.t) odp.t='(pusta odpowiedź)'; }
  catch(e){ if(e.name==='AbortError'){ odp.t+=odp.t?' …':'(przerwano)'; } else { odp.blad=true; odp.t=(odp.t?odp.t+'\n\n':'')+'Nie udało się: '+(/Failed to fetch|NetworkError/i.test(e.message)?'brak połączenia z API (internet albo blokada w przeglądarce).':e.message); } }
  AI.pisze=null; aiZapiszRozm(); aiRender(); const w=$('#aiWe'); w&&w.focus();
}
document.addEventListener('click', e=>{
  if(e.target.closest('#aiFab')){ AI.otw=true; AI.widok='czat'; aiRender(); const w=$('#aiWe'); w&&w.focus(); if(!AI.modele[AI.ust.silnik]) aiPobierzModele(AI.ust.silnik); return; }
  const p=e.target.closest('#aiPanel'); if(!p) return;
  const sil=e.target.closest('[data-aisil]'); if(sil){ AI.ust.silnik=sil.dataset.aisil; aiZapiszUst(); AI.blad=''; aiRender(); if(!AI.modele[AI.ust.silnik]) aiPobierzModele(AI.ust.silnik); return; }
  const pod=e.target.closest('[data-aipodp]'); if(pod) return aiWyslij(pod.dataset.aipodp);
  const ak=e.target.closest('[data-aiakcja]'); if(ak && !ak.disabled){ let wyn=''; try{ wyn=aiAkcjaWykonaj(JSON.parse(ak.dataset.aiakcja)); }catch(err){ wyn='Nie udało się: '+err.message; } ak.disabled=true; ak.classList.add('ok'); ak.innerHTML='<span>✓</span>'+esc(wyn||'Dodano'); return; }
  const a=e.target.closest('[data-aiact]'); if(!a) return; const c=a.dataset.aiact;
  if(c==='zamknij'){ AI.otw=false; return aiRender(); }
  if(c==='ust'){ AI.widok=AI.widok==='ust'?'czat':'ust'; return aiRender(); }
  if(c==='czat'){ AI.widok='czat'; return aiRender(); }
  if(c==='nowa'){ if(AI.pisze) AI.pisze.abort(); AI.msg=[]; aiZapiszRozm(); AI.widok='czat'; return aiRender(); }
  if(c==='stop'){ AI.pisze&&AI.pisze.abort(); return; }
  if(c==='modele'){ AI.blad=''; return Promise.all(['claude','gemini'].map(aiPobierzModele)); }
});
document.addEventListener('submit', e=>{ if(e.target.id!=='aiForm') return; e.preventDefault(); aiWyslij($('#aiWe').value); });
document.addEventListener('keydown', e=>{ if(e.target.id==='aiWe' && e.key==='Enter' && !e.shiftKey && !e.isComposing){ e.preventDefault(); aiWyslij(e.target.value); }
  if(e.key==='Escape' && AI.otw && e.target.closest && e.target.closest('#aiPanel')){ AI.otw=false; aiRender(); } });
document.addEventListener('input', e=>{ const t=e.target;
  if(t.id==='aiWe'){ t.style.height='auto'; t.style.height=Math.min(120,t.scrollHeight)+'px'; }
  if(t.dataset && t.dataset.aiklucz){ try{ const k=AI_SIL[t.dataset.aiklucz].klucz, v=t.value.trim(); v?localStorage.setItem(k,v):localStorage.removeItem(k); }catch(err){} } });
document.addEventListener('change', e=>{ const t=e.target;
  if(t.id==='aiModel'){ AI.ust.model[AI.ust.silnik]=t.value; aiZapiszUst(); }
  if(t.id==='aiDane'){ AI.ust.dane=t.checked; aiZapiszUst(); }
  if(t.dataset && t.dataset.aiklucz && t.value.trim()) aiPobierzModele(t.dataset.aiklucz); });
if(!/[?&]widzet=1/.test(location.search)) aiRender();
