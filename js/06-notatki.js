/* ════════════════════════════════════════════════════════════════════════
   NOTATKI (STUDIA)
   ════════════════════════════════════════════════════════════════════════
   N            – lista notatek {t: tytuł, b: treść, cat: kategoria, pin: przypięta}.
   ntAppHtml()  – kafle albo edytor; ntRender() – prosty markdown do podglądu
                  (# nagłówek, **pogrubienie**, - lista, - [ ] zadanie, > cytat, linki).
   Zapis podczas pisania jest opóźniony o 0,7 s (ntSet z soft=true).
   ════════════════════════════════════════════════════════════════════════ */

/* ——— NOTATKI: lista, kategorie, przypinanie, wyszukiwarka, edytor z podglądem (chmura przez db, kopia w przeglądarce) ——— */
const ntNorm = (id,v={}) => ({id, t:String(v.t||''), b:String(v.b||''), cat:String(v.cat||''), pin:!!v.pin, c:+v.c||Date.now(), u:+v.u||+v.c||Date.now()});
const ntDoc = n => { const {id,...r}=n; return r; };
let N = [];
try{ const c=JSON.parse(store.get('notesState','null')); if(Array.isArray(c)) N=c.map(n=>ntNorm(n.id,n)); }catch(e){}
(function migrateOld(){ const old=store.get('notes',''); if(old.trim() && !N.length && store.get('notesMigrated','')!=='1'){ N=[ntNorm(uid('n'),{t:'Notatnik',b:old,cat:'',c:Date.now()})]; store.set('notesMigrated','1'); } })();
const saveNotes = () => store.set('notesState', JSON.stringify(N));
let ntSel = '', ntQ = '', ntCat = store.get('ntCat',''), ntMode = store.get('ntMode','edit'), ntTimer = null, ntPending = null, ntMobileEd = false;
const ntFold = s => String(s).toLowerCase().replace(/ł/g,'l').normalize('NFD').replace(/[̀-ͯ]/g,'');
const ntCats = () => [...new Set(N.map(n=>n.cat.trim()).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'pl'));
const ntTitle = n => n.t.trim() || (n.b.trim().split('\n')[0].replace(/^[#\-*\s\[\]x]+/,'').slice(0,60)) || 'Bez tytułu';
function ntList(){
  const q=ntFold(ntQ.trim());
  return N.filter(n=>(!ntCat || (ntCat==='__pin'?n.pin:n.cat.trim()===ntCat)) && (!q || ntFold(n.t+' '+n.b+' '+n.cat).includes(q)))
          .sort((a,b)=>(b.pin-a.pin)||(b.u-a.u));
}
function ntWhen(ts){
  const d=new Date(ts), now=new Date();
  if(d.toDateString()===now.toDateString()) return d.toLocaleTimeString('pl-PL',{hour:'2-digit',minute:'2-digit'});
  const y=new Date(now); y.setDate(now.getDate()-1); if(d.toDateString()===y.toDateString()) return 'wczoraj';
  return d.toLocaleDateString('pl-PL',{day:'numeric',month:'short',...(d.getFullYear()!==now.getFullYear()?{year:'numeric'}:{})});
}
/* mini-markdown do podglądu */
function ntInline(s){
  return esc(s).replace(/`([^`]+)`/g,'<code>$1</code>').replace(/\*\*([^*]+)\*\*/g,'<b>$1</b>').replace(/(^|[^*])\*([^*]+)\*/g,'$1<i>$2</i>')
    .replace(/(https?:\/\/[^\s<]+)/g,'<a href="$1" target="_blank" rel="noopener">$1</a>');
}
function ntRender(src){
  const L=src.split('\n'); let h='', inUl=false;
  const close=()=>{ if(inUl){ h+='</ul>'; inUl=false; } };
  L.forEach((ln,i)=>{
    let m;
    if((m=ln.match(/^\s*[-*] \[( |x|X)\] (.*)$/))){ if(!inUl){ h+='<ul class="md-ul">'; inUl=true; }
      const on=m[1]!==' '; h+=`<li class="md-task${on?' on':''}"><button type="button" class="md-chk" data-line="${i}" aria-pressed="${on}" aria-label="Przełącz zadanie"></button><span>${ntInline(m[2])}</span></li>`; return; }
    if((m=ln.match(/^\s*[-*] (.*)$/))){ if(!inUl){ h+='<ul class="md-ul">'; inUl=true; } h+=`<li class="md-li">${ntInline(m[1])}</li>`; return; }
    close();
    if((m=ln.match(/^## (.*)$/))) h+=`<h4>${ntInline(m[1])}</h4>`;
    else if((m=ln.match(/^# (.*)$/))) h+=`<h3>${ntInline(m[1])}</h3>`;
    else if((m=ln.match(/^> (.*)$/))) h+=`<blockquote>${ntInline(m[1])}</blockquote>`;
    else if(/^---+$/.test(ln.trim())) h+='<hr>';
    else if(!ln.trim()) h+='<div class="md-gap"></div>';
    else h+=`<p>${ntInline(ln)}</p>`;
  });
  close(); return h || '<p class="md-empty">Pusta notatka. Przełącz na „Edytuj”, żeby zacząć pisać.</p>';
}
/* zmiany */
function ntPush(n){ cloud(db=>db.collection('notatki').doc(n.id).set(ntDoc(n))); }
function ntNew(){
  const n=ntNorm(uid('n'),{cat:(ntCat&&ntCat!=='__pin')?ntCat:'', pin:ntCat==='__pin', c:Date.now()});
  N=[n,...N]; ntSel=n.id; store.set('ntSel',ntSel); ntMode='edit'; store.set('ntMode','edit'); ntQ=''; saveNotes(); ntRefresh(true); ntPush(n);
  setTimeout(()=>{ const t=$('.nt-title'); t&&t.focus(); },60);
}
function ntSet(id, patch, soft){
  const n=N.find(x=>x.id===id); if(!n) return;
  Object.assign(n,patch,{u:Date.now()}); N=N.map(x=>x.id===id?{...n}:x); saveNotes();
  if(soft){ ntRefresh(); ntStatus('Zapisywanie…'); clearTimeout(ntTimer); ntPending=id; ntTimer=setTimeout(ntFlush,700); }
  else { ntRefresh(true); ntPush(N.find(x=>x.id===id)); }
}
function ntFlush(){ clearTimeout(ntTimer); if(!ntPending) return; const n=N.find(x=>x.id===ntPending); ntPending=null; if(n){ ntPush(n); ntStatus(); } }
function ntDel(id){
  N=N.filter(n=>n.id!==id); if(ntSel===id) ntSel=''; saveNotes(); ntRefresh(true);
  cloud(db=>db.collection('notatki').doc(id).delete());
}
/* widok */
const ntSnip = (n,len) => n.b.replace(/^[#>\-*\s\[\]xX]+/gm,'').replace(/\*\*/g,'').replace(/\s+/g,' ').trim().slice(0,len);
const ntTasks = n => { const all=(n.b.match(/^\s*[-*] \[( |x|X)\] /gm)||[]); return all.length?{all:all.length, done:all.filter(x=>/\[[xX]\]/.test(x)).length}:null; };
function ntStatus(txt){ const el=$('#ntStat'); if(!el) return; const n=N.find(x=>x.id===ntSel); if(!n) return;
  const w=(n.b.trim().match(/\S+/g)||[]).length;
  el.textContent = txt || `Zapisano ${ntWhen(n.u)} · ${w} ${w===1?'słowo':(w%10>=2&&w%10<=4&&(w%100<10||w%100>=20))?'słowa':'słów'}`; }
function ntTabsHtml(){
  const t=(k,n,c)=>`<button type="button" role="tab" data-ntcat="${esc(k)}" aria-selected="${ntCat===k}">${esc(n)}<span class="ct">${c}</span></button>`;
  return `${t('','Wszystkie',N.length)}${N.some(n=>n.pin)?t('__pin','Przypięte',N.filter(n=>n.pin).length):''}${ntCats().map(c=>t(c,c,N.filter(n=>n.cat.trim()===c).length)).join('')}`;
}
function ntTile(n){
  const tk=ntTasks(n), sn=ntSnip(n,220);
  return `<button type="button" class="nt-tile${n.pin?' pin':''}" data-ntid="${esc(n.id)}">
    <span class="nt-tile-top"><span class="label">${n.cat.trim()?esc(n.cat.trim()):'Bez kategorii'}</span>${n.pin?'<i class="nt-pinmark" title="Przypięta"></i>':''}</span>
    <b>${esc(ntTitle(n))}</b><span class="nt-sn">${sn?esc(sn):'<em>Brak treści</em>'}</span>
    <span class="nt-tile-foot"><span>${ntWhen(n.u)}</span>${tk?`<span class="nt-prog"><i style="width:${Math.round(tk.done/tk.all*100)}%"></i></span><span>${tk.done}/${tk.all}</span>`:''}</span></button>`;
}
function ntOverviewHtml(){
  const L=ntList();
  return `<div class="nt-bar"><label class="nt-search"><svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><circle cx="7" cy="7" r="5"/><path d="M11 11l3.5 3.5"/></svg><input type="search" id="ntQ" placeholder="Szukaj w notatkach" value="${esc(ntQ)}" autocomplete="off"></label>
      <button type="button" class="nt-new" data-act="ntnew"><span aria-hidden="true">+</span> Nowa notatka</button></div>
    ${L.length?`<div class="nt-grid">${L.map(ntTile).join('')}</div>`
      :`<div class="nt-blank"><svg viewBox="0 0 64 64" aria-hidden="true"><rect x="10" y="6" width="44" height="52" fill="none" stroke="var(--ink)" stroke-width="2.5"/><path d="M18 20h28M18 30h28M18 40h16" stroke="var(--ink)" stroke-width="2.5"/><rect x="40" y="38" width="10" height="10" fill="var(--accent)"/></svg>
        <p>${N.length?'Brak notatek pasujących do wyszukiwania lub kategorii.':'Zapisuj tu terminy, pomysły, ustalenia z promotorem, listy zakupów — wszystko, co ma nie uciec.'}</p></div>`}`;
}
function ntAsideHtml(){
  const L=ntList().filter(n=>n.id!==ntSel).slice(0,12);
  return `<div class="block-head"><h2>Inne notatki</h2></div>
    ${L.map(n=>`<button type="button" class="nt-mini" data-ntid="${esc(n.id)}"><b>${esc(ntTitle(n))}${n.pin?' <i class="nt-pinmark"></i>':''}</b><span>${n.cat.trim()?esc(n.cat.trim())+' · ':''}${ntWhen(n.u)}</span></button>`).join('')||'<p class="nt-none">Brak innych notatek.</p>'}`;
}
function ntEditorHtml(n){
  return `<div class="nt-edwrap"><article class="nt-ed">
    <div class="nt-ed-top">
      <button type="button" class="nt-back" data-act="ntback">← Wszystkie notatki</button>
      <div class="nt-ed-tools">
        <div class="nt-seg" role="group" aria-label="Tryb"><button type="button" data-ntmode="edit" aria-pressed="${ntMode==='edit'}">Edytuj</button><button type="button" data-ntmode="view" aria-pressed="${ntMode==='view'}">Podgląd</button></div>
        <button type="button" class="nt-pin" data-act="ntpin" aria-pressed="${n.pin}" title="${n.pin?'Odepnij':'Przypnij na górze listy'}"><svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M6 1.5h4l-.6 4.2 2.6 2.3v1.5H4V8l2.6-2.3z" stroke-linejoin="round"/><path d="M8 9.5V15"/></svg>${n.pin?'Przypięta':'Przypnij'}</button>
        <button type="button" class="td-btn nt-del" data-act="ntdel">Usuń</button></div></div>
    <input class="nt-title" value="${esc(n.t)}" placeholder="Tytuł notatki" aria-label="Tytuł notatki" maxlength="140">
    <div class="nt-meta"><label class="nt-catin"><span class="label">Kategoria</span><input id="ntCatIn" list="ntCatList" value="${esc(n.cat)}" placeholder="np. Uczelnia" maxlength="40" autocomplete="off"></label>
      <datalist id="ntCatList">${[...new Set(['Uczelnia','Praca inżynierska','Gry','Siłownia','Zakupy','Pomysły',...ntCats()])].map(c=>`<option value="${esc(c)}">`).join('')}</datalist>
      <span class="label">Utworzono ${new Date(n.c).toLocaleDateString('pl-PL')}</span></div>
    ${ntMode==='edit'?`<div class="nt-tools" role="toolbar" aria-label="Formatowanie">
        <button type="button" data-md="# " title="Nagłówek">H</button><button type="button" data-md="**" title="Pogrubienie"><b>B</b></button>
        <button type="button" data-md="- " title="Lista">• Lista</button><button type="button" data-md="- [ ] " title="Lista zadań">☐ Zadania</button>
        <button type="button" data-md="> " title="Cytat">❝ Cytat</button></div>
      <textarea class="nt-body" placeholder="Zacznij pisać…" aria-label="Treść notatki">${esc(n.b)}</textarea>`
    :`<div class="nt-view md">${ntRender(n.b)}</div>`}
    <div class="nt-foot label" id="ntStat"></div></article>
    <aside class="nt-aside" id="ntAside">${ntAsideHtml()}</aside></div>`;
}
function ntAppHtml(){
  const n=ntSel && N.find(x=>x.id===ntSel); if(!n) ntSel='';
  return `<div class="ptabs" role="tablist" id="ntTabs">${ntTabsHtml()}</div><div class="nt-main">${n?ntEditorHtml(n):ntOverviewHtml()}</div>`;
}
function ntRefresh(force){
  const app=$('#notesApp');
  if(app){
    const a=document.activeElement, typing=ntSel && a && a.closest && a.closest('.nt-ed') && a.matches('input,textarea');
    if(force || !typing){
      const q=a&&a.id==='ntQ', pos=q?a.selectionStart:0, y=window.scrollY;
      app.innerHTML=ntAppHtml(); window.scrollTo(0,y);
      if(q){ const i=$('#ntQ'); if(i){ i.focus(); i.setSelectionRange(pos,pos); } }
      ntGrow();
    } else { $('#ntTabs').innerHTML=ntTabsHtml(); const as=$('#ntAside'); if(as) as.innerHTML=ntAsideHtml(); }
    ntStatus();
  }
  const rn=$('#ntRecent'); if(rn) rn.innerHTML=ntRecentHtml();
}
function ntGrow(){ const t=$('.nt-body'); if(!t) return; t.style.height='auto'; t.style.height=Math.max(420,t.scrollHeight+4)+'px'; }
function ntRecentHtml(){
  const L=N.slice().sort((a,b)=>(b.pin-a.pin)||(b.u-a.u)).slice(0,4);
  if(!L.length) return `<div class="td-today empty"><p>Brak notatek.</p><button type="button" class="td-btn" data-act="ntnewgo">+ Nowa notatka</button></div>`;
  return `<div class="nt-grid nt-grid-sm">${L.map(ntTile).join('').replace(/data-ntid=/g,'data-ntgo=')}</div>`;
}
function pNotes(){ return `<h1>Notat<span class="acc">ki</span></h1><div id="notesApp">${ntAppHtml()}</div>`; }
/* zdarzenia */
document.addEventListener('click', e=>{
  const go=e.target.closest('[data-ntgo]'); if(go){ ntSel=go.dataset.ntgo; location.hash='#notatki'; return; }
  const it=e.target.closest('[data-ntid]'); if(it){ ntFlush(); ntSel=it.dataset.ntid; ntRefresh(true); window.scrollTo(0,0); return; }
  const ch=e.target.closest('[data-ntcat]'); if(ch){ ntFlush(); ntCat=ch.dataset.ntcat; store.set('ntCat',ntCat); ntSel=''; ntRefresh(true); return; }
  const md=e.target.closest('[data-ntmode]'); if(md){ ntFlush(); ntMode=md.dataset.ntmode; store.set('ntMode',ntMode); ntRefresh(true); return; }
  const tk=e.target.closest('.md-chk'); if(tk){ const n=N.find(x=>x.id===ntSel); if(!n) return; const L=n.b.split('\n'), i=+tk.dataset.line;
    L[i]=L[i].replace(/\[( |x|X)\]/, m=>m==='[ ]'?'[x]':'[ ]'); ntSet(n.id,{b:L.join('\n')}); return; }
  const tb=e.target.closest('[data-md]'); if(tb){ const t=$('.nt-body'); if(!t) return; const mk=tb.dataset.md, s0=t.selectionStart, s1=t.selectionEnd, v=t.value;
    if(mk==='**'){ const sel=v.slice(s0,s1)||'tekst'; t.value=v.slice(0,s0)+'**'+sel+'**'+v.slice(s1); t.setSelectionRange(s0+2,s0+2+sel.length); }
    else { const ls=v.lastIndexOf('\n',s0-1)+1; t.value=v.slice(0,ls)+mk+v.slice(ls); t.setSelectionRange(s0+mk.length,s1+mk.length); }
    t.focus(); t.dispatchEvent(new Event('input',{bubbles:true})); return; }
  const b=e.target.closest('[data-act]'); if(!b) return;
  switch(b.dataset.act){
    case 'ntnew': ntNew(); break;
    case 'ntnewgo': location.hash='#notatki'; ntNew(); break;
    case 'ntback': ntFlush(); ntSel=''; ntRefresh(true); break;
    case 'ntpin': { const n=N.find(x=>x.id===ntSel); if(n) ntSet(n.id,{pin:!n.pin}); break; }
    case 'ntdel': if(b.dataset.ntarm) ntDel(ntSel); else { b.dataset.ntarm='1'; b.textContent='Na pewno usunąć?'; b.classList.add('armed'); setTimeout(()=>{ if(b.isConnected){ delete b.dataset.ntarm; b.textContent='Usuń'; b.classList.remove('armed'); } },3000); } break;
  }
});
document.addEventListener('input', e=>{
  const el=e.target;
  if(el.id==='ntQ'){ ntQ=el.value; ntRefresh(true); return; }
  if(!el.closest || !el.closest('.nt-ed')) return;
  if(el.matches('.nt-title')) ntSet(ntSel,{t:el.value},true);
  else if(el.matches('.nt-body')){ ntSet(ntSel,{b:el.value},true); ntGrow(); }
  else if(el.id==='ntCatIn') ntSet(ntSel,{cat:el.value},true);
});
document.addEventListener('focusout', e=>{ if(e.target.closest && e.target.closest('.nt-ed')) ntFlush(); });
document.addEventListener('keydown', e=>{
  if(e.key==='Escape' && ntSel && $('#notesApp') && !(e.target.matches && e.target.matches('input,textarea'))){ ntFlush(); ntSel=''; ntRefresh(true); return; }
  if(!e.target.matches || !e.target.matches('.nt-body')) return;
  if(e.key==='Enter' && !e.shiftKey){ const t=e.target, v=t.value, s0=t.selectionStart, ls=v.lastIndexOf('\n',s0-1)+1, line=v.slice(ls,s0);
    const m=line.match(/^(\s*)([-*] \[[ xX]\] |[-*] )(.*)$/); if(!m) return;
    e.preventDefault();
    if(!m[3].trim()){ t.value=v.slice(0,ls)+v.slice(s0); t.setSelectionRange(ls,ls); }
    else { const pre='\n'+m[1]+m[2].replace(/\[[xX]\]/,'[ ]'); t.value=v.slice(0,s0)+pre+v.slice(t.selectionEnd); t.setSelectionRange(s0+pre.length,s0+pre.length); }
    t.dispatchEvent(new Event('input',{bubbles:true})); }
});
window.addEventListener('beforeunload', ntFlush);
