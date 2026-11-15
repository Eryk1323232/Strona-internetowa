/* ════════════════════════════════════════════════════════════════
   ASYSTENT AI — mały czat w prawym dolnym rogu (Google Gemini, darmowy klucz z Google AI Studio)
   Model wybierany w nagłówku czatu; lista modeli pobierana z API (GET /v1beta/models), darmowe (Flash) na górze,
   płatne (Pro itp., aiPlatny) z dopiskiem; zapasowo aliasy AI_DOMYSLNE. Domyślnie: najnowszy Flash.
   KLUCZ API: wpisywany w ustawieniach czatu, trzymany WYŁĄCZNIE w tej przeglądarce (localStorage 'aiKluczGemini') —
   nie idzie do Arkusza ani do kopii zapasowej (KOPIA_POMIN w js/20-kopia-zapasowa.js).
   Zapytania lecą prosto z przeglądarki do generativelanguage.googleapis.com (strumieniowo, SSE).
   KONTEKST: gdy włączone „dane ze strony”, do polecenia systemowego dochodzi skrót aiKontekst():
   otwarte zadania, najbliższe 14 dni z kalendarza, wydatki miesiąca, zasoby WoT.
   AKCJE: model może zaproponować akcję blokiem ```akcja {json}``` (zadanie / wydatek / wpływ / notatka) —
   czat pokazuje ją jako przycisk; nic nie dzieje się bez kliknięcia (wykonują funkcje sd* z js/36-szybko-dodaj.js).
   Rozmowa: store 'aiRozmowa' (ostatnie 40 wiadomości), ustawienia: store 'aiUst' {model, dane}, lista modeli: 'aiModeleG'.
   ════════════════════════════════════════════════════════════════ */
const AI_KLUCZ='aiKluczGemini', AI_SKAD='https://aistudio.google.com/apikey';
/* zapasowa lista, gdy nie da się pobrać modeli z API — aliasy Google wskazujące zawsze najnowszy Flash */
const AI_DOMYSLNE = [['gemini-flash-latest','Gemini Flash (najnowszy)'],['gemini-flash-lite-latest','Gemini Flash-Lite (najnowszy)']];
const aiPlatny = id => /pro|ultra|argon|omni/i.test(id);   /* modele bez darmowego poziomu API */
let AI = { ust:(()=>{ let u={}; try{ u=JSON.parse(store.get('aiUst','{}'))||{}; }catch(e){} return {model:typeof u.model==='string'?u.model:(u.model&&u.model.gemini)||'', dane:u.dane!==false}; })(),
  msg:(()=>{ try{ const m=JSON.parse(store.get('aiRozmowa','[]')); return Array.isArray(m)?m.filter(x=>x&&(x.r==='u'||x.r==='a')&&typeof x.t==='string'):[]; }catch(e){ return []; } })(),
  otw:false, widok:'czat', pisze:null, modele:null, blad:'' };
try{ ['aiKluczClaude','aiModele'].forEach(k=>localStorage.removeItem(k)); }catch(e){}   /* stare klucze z czasów czatu z Claude */
const aiKlucz = () => { try{ return localStorage.getItem(AI_KLUCZ)||''; }catch(e){ return ''; } };
const aiZapiszUst = () => store.set('aiUst', JSON.stringify(AI.ust));
const aiZapiszRozm = () => store.set('aiRozmowa', JSON.stringify(AI.msg.slice(-40)));
const aiModele = () => AI.modele || AI_DOMYSLNE;
const aiModel = () => { const L=aiModele(), m=AI.ust.model; if(L.some(x=>x[0]===m)) return m;
  return (L.find(x=>/flash/i.test(x[0])&&!/lite|preview|exp/i.test(x[0])) || L.find(x=>!aiPlatny(x[0])) || L[0] || [''])[0]; };

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

/* ——— wywołania API Gemini (strumień SSE) ——— */
async function aiSSE(res, naTekst){
  const rd=res.body.getReader(), dec=new TextDecoder(); let buf='';
  for(;;){ const {done,value}=await rd.read(); if(done) break; buf+=dec.decode(value,{stream:true});
    let i; while((i=buf.indexOf('\n'))>=0){ const l=buf.slice(0,i).trim(); buf=buf.slice(i+1); if(!l.startsWith('data:')) continue; const d=l.slice(5).trim(); if(!d||d==='[DONE]') continue; try{ naTekst(JSON.parse(d)); }catch(e){} } }
}
async function aiBlad(res){ let t=''; try{ const j=await res.json(); t=(j.error&&(j.error.message||j.error.status))||JSON.stringify(j).slice(0,200); }catch(e){}
  const s=res.status; return (s===400&&/API key/i.test(t)||s===401||s===403?'Klucz API jest nieprawidłowy. Sprawdź, czy skopiowałeś cały klucz z Google AI Studio. ':s===429?'Wykorzystany darmowy limit zapytań — odczekaj minutę (limit na minutę) albo do jutra (limit dzienny). ':s===404?'Ten model nie jest dostępny dla Twojego klucza — wybierz inny (np. Flash). ':`Błąd ${s}. `)+(t&&s!==429?t:''); }
async function aiPytaj(msgs, naKawalek, signal){
  const res=await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(aiModel())}:streamGenerateContent?alt=sse`,{method:'POST', signal, headers:{'content-type':'application/json','x-goog-api-key':aiKlucz()},
    body:JSON.stringify({systemInstruction:{parts:[{text:aiSystem()}]}, contents:msgs.map(m=>({role:m.r==='u'?'user':'model', parts:[{text:m.t}]}))})});
  if(!res.ok) throw new Error(await aiBlad(res));
  await aiSSE(res, j=>{ const p=j.candidates&&j.candidates[0]&&j.candidates[0].content&&j.candidates[0].content.parts; if(p) p.forEach(x=>{ if(x.text&&!x.thought) naKawalek(x.text); }); });
}
async function aiPobierzModele(){
  const k=aiKlucz(); if(!k) return;
  try{ const r=await fetch('https://generativelanguage.googleapis.com/v1beta/models?pageSize=200',{headers:{'x-goog-api-key':k}}); if(!r.ok) throw new Error(await aiBlad(r));
    const j=await r.json(), L=(j.models||[]).filter(m=>(m.supportedGenerationMethods||[]).includes('generateContent') && /gemini/i.test(m.name) && !/embedding|aqa|tts|image|audio|live|transcribe|translate|robotics|computer-use/i.test(m.name))
      .map(m=>[m.name.replace(/^models\//,''), m.displayName||m.name])
      .sort((a,b)=>(aiPlatny(a[0])-aiPlatny(b[0])) || b[0].localeCompare(a[0],undefined,{numeric:true}));   /* darmowe na górze */
    if(L.length){ AI.modele=L; store.set('aiModeleG', JSON.stringify(L)); } AI.blad='';
  }catch(e){ AI.blad='Lista modeli: '+e.message; }
  aiRender();
}
try{ const m=JSON.parse(store.get('aiModeleG','null')); if(Array.isArray(m)&&m.length) AI.modele=m; }catch(e){}

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
  const maKlucz=!!aiKlucz(), szkic=($('#aiWe')||{}).value||'';
  const glowa=`<header class="ai-top"><span class="ai-logo" aria-hidden="true">✦</span><b class="ai-nazwa">Gemini</b>
      <select id="aiModel" class="ai-model" aria-label="Model" title="Model">${aiModele().map(([id,n])=>`<option value="${esc(id)}"${id===aiModel()?' selected':''}>${esc(n)}${aiPlatny(id)?' · płatny':''}</option>`).join('')}</select>
      <button type="button" class="ai-ib" data-aiact="nowa" title="Nowa rozmowa" aria-label="Nowa rozmowa">${aiIk('nowa')}</button><button type="button" class="ai-ib" data-aiact="ust" title="Ustawienia i klucz API" aria-label="Ustawienia" aria-pressed="${AI.widok==='ust'}">${aiIk('zeb')}</button><button type="button" class="ai-ib" data-aiact="zamknij" title="Zamknij" aria-label="Zamknij">${aiIk('x')}</button></header>`;
  if(AI.widok==='ust' || !maKlucz){
    p.innerHTML=glowa+`<div class="ai-ust">${maKlucz?'':`<div class="ai-info"><b>Darmowy klucz Gemini w 1 minutę:</b><ol><li>Otwórz <a href="${AI_SKAD}" target="_blank" rel="noopener">Google AI Studio → API keys</a> i zaloguj się kontem Google.</li><li>Kliknij <b>„Create API key”</b> (utwórz klucz).</li><li>Skopiuj klucz (zaczyna się od <code>AIza</code>) i wklej go poniżej.</li></ol></div>`}
      <label class="ai-f"><span class="label">Klucz API Gemini ${maKlucz?'<em>zapisany</em>':''}</span><input type="password" data-aiklucz="1" value="${esc(aiKlucz())}" placeholder="AIza…" autocomplete="off" spellcheck="false">
        <a href="${AI_SKAD}" target="_blank" rel="noopener">Utwórz lub skopiuj klucz w Google AI Studio →</a></label>
      <label class="ai-chk"><input type="checkbox" id="aiDane"${AI.ust.dane?' checked':''}><span>Dołączaj dane ze strony (zadania, kalendarz, wydatki miesiąca, zasoby WoT), żeby asystent wiedział, co u Ciebie</span></label>
      <p class="ai-pom">Darmowe są modele <b>Flash</b> i <b>Flash-Lite</b> (z limitem zapytań na minutę i na dzień); modele oznaczone „płatny” wymagają włączenia płatności w Google. Na darmowym poziomie Google może wykorzystywać treść rozmów do ulepszania swoich usług — nie wpisuj haseł ani wrażliwych danych. Klucz jest zapisany tylko w tej przeglądarce (nie trafia do Arkusza ani kopii), więc na telefonie wklejasz go osobno.</p>
      ${AI.blad?`<p class="ai-blad">${esc(AI.blad)}</p>`:''}
      <div class="ai-ustb"><button type="button" class="uk-btn" data-aiact="modele"${maKlucz?'':' disabled'}>Odśwież listę modeli</button>${maKlucz?'<button type="button" class="uk-btn uk-ok" data-aiact="czat">Gotowe</button>':''}</div></div>`;
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
  if(e.target.closest('#aiFab')){ AI.otw=true; AI.widok='czat'; aiRender(); const w=$('#aiWe'); w&&w.focus(); if(!AI.modele) aiPobierzModele(); return; }
  const p=e.target.closest('#aiPanel'); if(!p) return;
  const pod=e.target.closest('[data-aipodp]'); if(pod) return aiWyslij(pod.dataset.aipodp);
  const ak=e.target.closest('[data-aiakcja]'); if(ak && !ak.disabled){ let wyn=''; try{ wyn=aiAkcjaWykonaj(JSON.parse(ak.dataset.aiakcja)); }catch(err){ wyn='Nie udało się: '+err.message; } ak.disabled=true; ak.classList.add('ok'); ak.innerHTML='<span>✓</span>'+esc(wyn||'Dodano'); return; }
  const a=e.target.closest('[data-aiact]'); if(!a) return; const c=a.dataset.aiact;
  if(c==='zamknij'){ AI.otw=false; return aiRender(); }
  if(c==='ust'){ AI.widok=AI.widok==='ust'?'czat':'ust'; return aiRender(); }
  if(c==='czat'){ AI.widok='czat'; return aiRender(); }
  if(c==='nowa'){ if(AI.pisze) AI.pisze.abort(); AI.msg=[]; aiZapiszRozm(); AI.widok='czat'; return aiRender(); }
  if(c==='stop'){ AI.pisze&&AI.pisze.abort(); return; }
  if(c==='modele'){ AI.blad=''; return aiPobierzModele(); }
});
document.addEventListener('submit', e=>{ if(e.target.id!=='aiForm') return; e.preventDefault(); aiWyslij($('#aiWe').value); });
document.addEventListener('keydown', e=>{ if(e.target.id==='aiWe' && e.key==='Enter' && !e.shiftKey && !e.isComposing){ e.preventDefault(); aiWyslij(e.target.value); }
  if(e.key==='Escape' && AI.otw && e.target.closest && e.target.closest('#aiPanel')){ AI.otw=false; aiRender(); } });
document.addEventListener('input', e=>{ const t=e.target;
  if(t.id==='aiWe'){ t.style.height='auto'; t.style.height=Math.min(120,t.scrollHeight)+'px'; }
  if(t.dataset && t.dataset.aiklucz){ try{ const v=t.value.trim(); v?localStorage.setItem(AI_KLUCZ,v):localStorage.removeItem(AI_KLUCZ); }catch(err){} } });
document.addEventListener('change', e=>{ const t=e.target;
  if(t.id==='aiModel'){ AI.ust.model=t.value; aiZapiszUst(); }
  if(t.id==='aiDane'){ AI.ust.dane=t.checked; aiZapiszUst(); }
  if(t.dataset && t.dataset.aiklucz && t.value.trim()){ AI.modele=null; aiPobierzModele(); } });
if(!/[?&]widzet=1/.test(location.search)) aiRender();
