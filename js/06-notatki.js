/* ════════════════════════════════════════════════════════════════════════
   NOTATKI (STUDIA) — w stylu Apple Notatki / Samsung Notes / Google Keep
   ════════════════════════════════════════════════════════════════════════
   N – lista notatek (chmura: kolekcja „notatki”, kopia w przeglądarce):
     t    tytuł              h    treść jako HTML z edytora (formatowanie widać od razu)
     b    treść jako zwykły tekst/markdown — liczona z h; do wyszukiwania, podglądów i starszych wersji strony
     cat  folder ('' = bez folderu)     pin  przypięta     col  kolor ('' / czerwony / … — NT_KOLORY)
     arch zarchiwizowana   del  kiedy przeniesiona do kosza (0 = nie); po 30 dniach kosz czyści się sam
     c    utworzono        u    ostatnia zmiana
   Puste foldery: NT_FOLD (chmura: kolekcja „notatkiCfg”, dokument „foldery”).

   Układ: komputer — 3 kolumny (foldery · lista · notatka); telefon — lista albo notatka na cały ekran,
   foldery jako przewijany pasek, „+” w rogu, pasek formatowania nad klawiaturą.
   Edytor: contenteditable + document.execCommand (działa w Chrome, Safari, Firefox, na iOS i Androidzie).
   Skróty w pisaniu: „- ” lista · „1. ” numerowana · „[] ” checklista · „# ” „## ” nagłówki · „> ” cytat.
   Klawiatura: Ctrl+B/I/U, Ctrl+Shift+S przekreślenie, Ctrl+Shift+7/8/9 listy, Ctrl+K link, Tab w tabeli.
   Zapis podczas pisania opóźniony o 0,7 s (ntSet z soft=true).
   ════════════════════════════════════════════════════════════════════════ */

const NT_KOLORY = {czerwony:'#E5605C', pomaranczowy:'#E8964A', zolty:'#E3C24A', zielony:'#6FB287', niebieski:'#5B9BD5', fioletowy:'#A784D8'};
const NT_KOLOR_N = {'':'Bez koloru', czerwony:'Czerwony', pomaranczowy:'Pomarańczowy', zolty:'Żółty', zielony:'Zielony', niebieski:'Niebieski', fioletowy:'Fioletowy'};
const NT_KOSZ_DNI = 30;
const ntNorm = (id,v={}) => ({id, t:String(v.t||''), b:String(v.b||''), h:String(v.h||''), cat:String(v.cat||''), pin:!!v.pin,
  col:NT_KOLORY[v.col]?v.col:'', arch:!!v.arch, del:+v.del||0, c:+v.c||Date.now(), u:+v.u||+v.c||Date.now()});
const ntDoc = n => { const {id,...r}=n; return r; };
let N = [];
try{ const c=JSON.parse(store.get('notesState','null')); if(Array.isArray(c)) N=c.map(n=>ntNorm(n.id,n)); }catch(e){}
(function migrateOld(){ const old=store.get('notes',''); if(old.trim() && !N.length && store.get('notesMigrated','')!=='1'){ N=[ntNorm(uid('n'),{t:'Notatnik',b:old,cat:'',c:Date.now()})]; store.set('notesMigrated','1'); } })();
let NT_FOLD = []; try{ const f=JSON.parse(store.get('ntFoldery','[]')); if(Array.isArray(f)) NT_FOLD=f.map(String); }catch(e){}
const saveNotes = () => store.set('notesState', JSON.stringify(N));
const ntSaveFold = () => { store.set('ntFoldery', JSON.stringify(NT_FOLD)); cloud(db=>db.collection('notatkiCfg').doc('foldery').set({L:NT_FOLD})); };

let ntSel = '', ntQ = '', ntCat = store.get('ntCat',''), ntTimer = null, ntPending = null;
let ntSort = store.get('ntSort','u'), ntView = store.get('ntView','list'), ntMenu = '', ntLinkRange = null, ntFoldEd = '';
const ntWide = () => matchMedia('(min-width:901px)').matches;
const ntFold = s => String(s).toLowerCase().replace(/ł/g,'l').normalize('NFD').replace(/[̀-ͯ]/g,'');

/* ——— HTML: czyszczenie (tylko bezpieczne znaczniki) ——— */
const NT_TAGS = new Set(['P','DIV','BR','B','STRONG','I','EM','U','S','STRIKE','DEL','SPAN','A','H1','H2','H3','UL','OL','LI','BLOCKQUOTE','PRE','CODE','HR','TABLE','TBODY','TR','TD','TH','MARK','IMG']);
function ntClean(html){
  const box=document.createElement('div'); box.innerHTML=html;
  const walk=el=>{ [...el.childNodes].forEach(n=>{
    if(n.nodeType===3) return;
    if(n.nodeType!==1 || !NT_TAGS.has(n.tagName)){ if(n.nodeType===1 && !/^(SCRIPT|STYLE|IFRAME|OBJECT|EMBED|SVG|IMG|VIDEO|AUDIO|LINK|META)$/.test(n.tagName)){ walk(n); n.replaceWith(...n.childNodes); } else n.remove(); return; }
    [...n.attributes].forEach(a=>{ const k=a.name.toLowerCase();
      if(n.tagName==='IMG'){ if(!((k==='data-zid'&&/^[\w-]{1,60}$/.test(a.value))||(k==='class'&&a.value.split(/\s+/).includes('nt-img')))) n.removeAttribute(a.name); else if(k==='class') n.setAttribute('class','nt-img'); }
      else if(k==='class'){ const c=a.value.split(/\s+/).filter(x=>/^(nt-ck|done|nt-tbl|nt-hl)$/.test(x)).join(' '); c?n.setAttribute('class',c):n.removeAttribute('class'); }
      else if(k==='href' && n.tagName==='A'){ if(!/^(https?:|mailto:)/i.test(a.value.trim())) n.removeAttribute('href'); }
      else if(k==='style' && n.tagName==='SPAN'){ const m=/background-color:\s*([^;]+)/i.exec(a.value); m?n.setAttribute('style','background-color:'+m[1].replace(/[^#\w\s(),.%]/g,'')):n.removeAttribute('style'); }
      else n.removeAttribute(a.name); });
    if(n.tagName==='IMG' && !n.getAttribute('data-zid')){ n.remove(); return; }   /* tylko własne zdjęcia (js/30-zdjecia-notatek.js) */
    if(n.tagName==='A'){ n.setAttribute('target','_blank'); n.setAttribute('rel','noopener'); }
    walk(n); }); };
  walk(box); return box.innerHTML;
}
/* ——— starsze notatki (markdown) → HTML ——— */
function ntInline(s){
  return esc(s).replace(/`([^`]+)`/g,'<code>$1</code>').replace(/\*\*([^*]+)\*\*/g,'<b>$1</b>').replace(/~~([^~]+)~~/g,'<s>$1</s>').replace(/(^|[^*])\*([^*]+)\*/g,'$1<i>$2</i>')
    .replace(/(https?:\/\/[^\s<]+)/g,'<a href="$1" target="_blank" rel="noopener">$1</a>');
}
function ntMdToHtml(src){
  const L=String(src).split('\n'); let h='', list='';
  const open=t=>{ if(list!==t){ close(); h+=t==='ck'?'<ul class="nt-ck">':t==='ol'?'<ol>':'<ul>'; list=t; } };
  const close=()=>{ if(list){ h+=list==='ol'?'</ol>':'</ul>'; list=''; } };
  L.forEach(ln=>{ let m;
    if((m=ln.match(/^\s*[-*] \[( |x|X)\] (.*)$/))){ open('ck'); h+=`<li${m[1]!==' '?' class="done"':''}>${ntInline(m[2])||'<br>'}</li>`; return; }
    if((m=ln.match(/^\s*[-*] (.*)$/))){ open('ul'); h+=`<li>${ntInline(m[1])||'<br>'}</li>`; return; }
    if((m=ln.match(/^\s*\d+[.)] (.*)$/))){ open('ol'); h+=`<li>${ntInline(m[1])||'<br>'}</li>`; return; }
    close();
    if((m=ln.match(/^### (.*)$/))) h+=`<h3>${ntInline(m[1])}</h3>`;
    else if((m=ln.match(/^## (.*)$/))) h+=`<h2>${ntInline(m[1])}</h2>`;
    else if((m=ln.match(/^# (.*)$/))) h+=`<h1>${ntInline(m[1])}</h1>`;
    else if((m=ln.match(/^> ?(.*)$/))) h+=`<blockquote>${ntInline(m[1])||'<br>'}</blockquote>`;
    else if(/^---+$/.test(ln.trim())) h+='<hr>';
    else h+=`<div>${ntInline(ln)||'<br>'}</div>`;
  });
  close(); return h;
}
/* ——— HTML z edytora → zwykły tekst/markdown (pole b) ——— */
function ntHtmlToMd(root){
  const inl=el=>[...el.childNodes].map(n=>{ if(n.nodeType===3) return n.nodeValue.replace(/ /g,' ');
    if(n.nodeType!==1) return ''; const t=n.tagName, s=inl(n);
    if(t==='BR') return '\n'; if(t==='IMG') return '(zdjęcie)'; if(!s.trim()) return s;
    if(t==='B'||t==='STRONG') return `**${s}**`; if(t==='I'||t==='EM') return `*${s}*`; if(t==='S'||t==='STRIKE'||t==='DEL') return `~~${s}~~`;
    if(t==='CODE') return '`'+s+'`'; if(t==='A'){ const h=n.getAttribute('href')||''; return h&&h!==s?`${s} (${h})`:s; }
    return s; }).join('');
  const out=[], BL=/^(DIV|P|H1|H2|H3|UL|OL|BLOCKQUOTE|PRE|HR|TABLE)$/;
  const each=box=>[...box.childNodes].forEach(n=>{
    if(n.nodeType===1 && (n.tagName==='DIV'||n.tagName==='P') && [...n.children].some(c=>BL.test(c.tagName))){   /* akapit z listą w środku */
      let txt=''; [...n.childNodes].forEach(c=>{ if(c.nodeType===1 && BL.test(c.tagName)){ if(txt.trim()) out.push(txt.trim()); txt=''; each({childNodes:[c]}); } else txt+=c.nodeType===3?c.nodeValue:inl({childNodes:[c]}); });
      if(txt.trim()) out.push(txt.trim()); return; }
    if(n.nodeType===3){ if(n.nodeValue.trim()) out.push(n.nodeValue.trim()); return; } if(n.nodeType!==1) return;
    const t=n.tagName;
    if(t==='H1') out.push('# '+inl(n).trim()); else if(t==='H2') out.push('## '+inl(n).trim()); else if(t==='H3') out.push('### '+inl(n).trim());
    else if(t==='UL'||t==='OL'){ const ck=n.classList.contains('nt-ck'); [...n.children].forEach((li,i)=>out.push(ck?`- [${li.classList.contains('done')?'x':' '}] ${inl(li).trim()}`:t==='OL'?`${i+1}. ${inl(li).trim()}`:`- ${inl(li).trim()}`)); }
    else if(t==='BLOCKQUOTE') inl(n).split('\n').forEach(l=>out.push('> '+l));
    else if(t==='PRE') out.push('```\n'+n.textContent+'\n```');
    else if(t==='HR') out.push('---');
    else if(t==='TABLE') [...n.querySelectorAll('tr')].forEach(tr=>out.push('| '+[...tr.children].map(td=>inl(td).trim()).join(' | ')+' |'));
    else out.push(inl(n).replace(/\n$/,''));
  });
  each(root);
  return out.join('\n').replace(/\n{3,}/g,'\n\n').trim();
}
const ntHtml = n => n.h ? ntClean(n.h) : ntMdToHtml(n.b);

/* ——— lista ——— */
const ntTitle = n => n.t.trim() || (n.b.trim().split('\n')[0].replace(/^[#>\-*\s\[\]xX\d.]+/,'').replace(/\*\*|~~|`/g,'').slice(0,80)) || 'Nowa notatka';
const ntSnip = (n,len) => { const L=n.b.split('\n').map(l=>l.replace(/^[#>\-*\s\[\]xX]+|^\d+\.\s/g,'').replace(/\*\*|~~|`|\|/g,'').trim()).filter(Boolean);
  if(!n.t.trim()) L.shift(); return L.join(' ').slice(0,len); };
const ntTasks = n => { const all=(n.b.match(/^\s*[-*] \[( |x|X)\] /gm)||[]); return all.length?{all:all.length, done:all.filter(x=>/\[[xX]\]/.test(x)).length}:null; };
const ntTags = n => [...new Set((n.b.match(/(^|\s)#([\p{L}\d_-]{2,30})/gu)||[]).map(x=>x.trim().slice(1).toLowerCase()))];
const ntAlive = () => N.filter(n=>!n.del);
const ntCats = () => [...new Set([...ntAlive().filter(n=>!n.arch).map(n=>n.cat.trim()).filter(Boolean), ...NT_FOLD])].sort((a,b)=>a.localeCompare(b,'pl'));
const ntAllTags = () => [...new Set(ntAlive().filter(n=>!n.arch).flatMap(ntTags))].sort((a,b)=>a.localeCompare(b,'pl'));
function ntInView(n){
  if(ntCat==='__bin') return !!n.del; if(n.del) return false;
  if(ntCat==='__arch') return n.arch; if(n.arch) return false;
  if(!ntCat) return true; if(ntCat==='__pin') return n.pin;
  if(ntCat[0]==='#') return ntTags(n).includes(ntCat.slice(1));
  return n.cat.trim()===ntCat;
}
function ntList(){
  const q=ntFold(ntQ.trim());
  const L=N.filter(n=>ntInView(n) && (!q || ntFold(n.t+' '+n.b+' '+n.cat).includes(q)));
  const by=ntSort==='t'?(a,b)=>ntTitle(a).localeCompare(ntTitle(b),'pl'):ntSort==='c'?(a,b)=>b.c-a.c:(a,b)=>b.u-a.u;
  return L.sort((a,b)=>(ntCat==='__bin'?0:(b.pin-a.pin))||by(a,b));
}
function ntWhen(ts, full){
  const d=new Date(ts), now=new Date();
  if(full) return d.toLocaleDateString('pl-PL',{day:'numeric',month:'long',year:'numeric'})+', '+d.toLocaleTimeString('pl-PL',{hour:'2-digit',minute:'2-digit'});
  if(d.toDateString()===now.toDateString()) return d.toLocaleTimeString('pl-PL',{hour:'2-digit',minute:'2-digit'});
  const y=new Date(now); y.setDate(now.getDate()-1); if(d.toDateString()===y.toDateString()) return 'wczoraj';
  if(now-d<6*864e5) return d.toLocaleDateString('pl-PL',{weekday:'long'});
  return d.toLocaleDateString('pl-PL',{day:'numeric',month:'numeric',...(d.getFullYear()!==now.getFullYear()?{year:'2-digit'}:{})});
}
function ntGroup(n){   /* grupy jak w Apple Notatkach */
  if(n.pin && ntCat!=='__bin') return 'Przypięte';
  if(ntSort==='t') return 'Notatki';
  const ts=ntSort==='c'?n.c:n.u, d=new Date(ts), t0=new Date(); t0.setHours(0,0,0,0);
  const dd=Math.floor((t0-new Date(d.getFullYear(),d.getMonth(),d.getDate()))/864e5);
  if(dd<=0) return 'Dzisiaj'; if(dd===1) return 'Wczoraj'; if(dd<7) return 'Poprzednie 7 dni'; if(dd<30) return 'Poprzednie 30 dni';
  return d.getFullYear()===t0.getFullYear()?d.toLocaleDateString('pl-PL',{month:'long'}):String(d.getFullYear());
}
const ntMark = s => { const q=ntQ.trim(); if(!q) return esc(s); const f=ntFold(s), fq=ntFold(q), i=f.indexOf(fq); if(i<0) return esc(s);
  return esc(s.slice(0,i))+'<mark>'+esc(s.slice(i,i+q.length))+'</mark>'+esc(s.slice(i+q.length)); };

/* ——— zmiany ——— */
function ntPush(n){ cloud(db=>db.collection('notatki').doc(n.id).set(ntDoc(n))); }
function ntNew(){
  const real=ntCat && ntCat[0]!=='_' && ntCat[0]!=='#';
  const n=ntNorm(uid('n'),{cat:real?ntCat:'', pin:ntCat==='__pin', b:ntCat[0]==='#'?ntCat:'', h:ntCat[0]==='#'?`<div>${esc(ntCat)}</div>`:'', c:Date.now()});
  if(ntCat==='__arch'||ntCat==='__bin'){ ntCat=''; store.set('ntCat',''); }
  N=[n,...N]; ntSel=n.id; ntQ=''; ntMenu=''; saveNotes(); ntRefresh(true); ntPush(n);
  setTimeout(()=>{ const t=$('.nt-title'); t&&t.focus(); },60);
}
function ntSet(id, patch, soft){
  const n=N.find(x=>x.id===id); if(!n) return;
  Object.assign(n,patch,{u:Date.now()}); N=N.map(x=>x.id===id?{...n}:x); saveNotes();
  if(soft){ ntRefresh(); ntStatus('Zapisywanie…'); clearTimeout(ntTimer); ntPending=id; ntTimer=setTimeout(ntFlush,700); }
  else { ntRefresh(true); ntPush(N.find(x=>x.id===id)); }
}
function ntFlush(){ clearTimeout(ntTimer); if(!ntPending) return; const n=N.find(x=>x.id===ntPending); ntPending=null; if(n){ ntPush(n); ntStatus(); } }
function ntPurge(id){ N=N.filter(n=>n.id!==id); if(ntSel===id) ntSel=''; saveNotes(); cloud(db=>db.collection('notatki').doc(id).delete()); }
function ntTrash(id){ ntFlush(); const n=N.find(x=>x.id===id); if(!n) return;
  if(!n.t.trim() && !n.b.trim()){ ntPurge(id); return ntRefresh(true); }   /* pusta notatka — od razu znika */
  Object.assign(n,{del:Date.now(), pin:false}); saveNotes(); ntPush(n); if(ntSel===id) ntSel=''; ntRefresh(true); }
/* kosz czyści się sam po NT_KOSZ_DNI dniach */
setTimeout(()=>{ const lim=Date.now()-NT_KOSZ_DNI*864e5; N.filter(n=>n.del && n.del<lim).forEach(n=>ntPurge(n.id)); }, 4000);

/* ——— widok: kolumna folderów ——— */
function ntSideHtml(){
  const A=ntAlive(), act=A.filter(n=>!n.arch);
  const row=(k,label,count,ico,extra='')=>`<button type="button" class="nt-f${ntCat===k?' on':''}" data-ntcat="${esc(k)}"><span class="nt-fi" aria-hidden="true">${ico}</span><span class="nt-fn">${esc(label)}</span><span class="nt-fc">${count}</span>${extra}</button>`;
  const I={all:'<svg viewBox="0 0 16 16"><path d="M3 2.5h7l3 3v8H3z"/><path d="M5.5 7h5M5.5 10h5"/></svg>', pin:'<svg viewBox="0 0 16 16"><path d="M6 1.5h4l-.6 4.2 2.6 2.3v1.5H4V8l2.6-2.3z"/><path d="M8 9.5V15"/></svg>',
    fold:'<svg viewBox="0 0 16 16"><path d="M1.5 4.5V13h13V5.5H7.5L6 3.5H1.5z"/></svg>', arch:'<svg viewBox="0 0 16 16"><rect x="1.5" y="2.5" width="13" height="3"/><path d="M2.5 5.5v8h11v-8M6.5 8.5h3"/></svg>',
    bin:'<svg viewBox="0 0 16 16"><path d="M2.5 4h11M6 4V2.5h4V4M3.8 4l.7 9.5h7l.7-9.5"/></svg>', tag:'#'};
  const F=ntCats(), T=ntAllTags();
  return `<div class="nt-sgrp"><span class="nt-sh">Notatki</span>
      ${row('','Wszystkie',act.length,I.all)}${act.some(n=>n.pin)?row('__pin','Przypięte',act.filter(n=>n.pin).length,I.pin):''}</div>
    <div class="nt-sgrp"><span class="nt-sh">Foldery</span>
      ${F.map(c=>ntFoldEd===c?`<form class="nt-fren" data-old="${esc(c)}"><input name="n" value="${esc(c)}" maxlength="40" aria-label="Nowa nazwa folderu" autocomplete="off"><button type="submit">OK</button></form>`
        :row(c,c,act.filter(n=>n.cat.trim()===c).length,I.fold, ntCat===c?`<span class="nt-fact"><i role="button" tabindex="0" data-ntfren="${esc(c)}" title="Zmień nazwę">${icn('olowek')}</i><i role="button" tabindex="0" data-ntfdel="${esc(c)}" title="Usuń folder (notatki zostaną)">×</i></span>`:'')).join('')}
      <form class="nt-fnew"><input name="n" placeholder="+ Nowy folder" maxlength="40" aria-label="Nowy folder" autocomplete="off"></form></div>
    ${T.length?`<div class="nt-sgrp"><span class="nt-sh">Tagi</span><div class="nt-tags">${T.map(t=>`<button type="button" class="nt-tag${ntCat==='#'+t?' on':''}" data-ntcat="#${esc(t)}">#${esc(t)}</button>`).join('')}</div></div>`:''}
    <div class="nt-sgrp nt-sbot">${row('__arch','Archiwum',A.filter(n=>n.arch).length,I.arch)}${row('__bin','Ostatnio usunięte',N.filter(n=>n.del).length,I.bin)}</div>`;
}
/* telefon: foldery jako pasek */
function ntChipsHtml(){
  const act=ntAlive().filter(n=>!n.arch), c=(k,l,n)=>`<button type="button" class="nt-chip${ntCat===k?' on':''}" data-ntcat="${esc(k)}">${esc(l)}${n!=null?` <span>${n}</span>`:''}</button>`;
  return `${c('','Wszystkie',act.length)}${act.some(n=>n.pin)?c('__pin','Przypięte',act.filter(n=>n.pin).length):''}${ntCats().map(f=>c(f,f,act.filter(n=>n.cat.trim()===f).length)).join('')}${ntAllTags().map(t=>c('#'+t,'#'+t)).join('')}${c('__arch','Archiwum')}${c('__bin','Kosz')}`;
}
/* ——— widok: lista notatek ——— */
function ntRowHtml(n){
  const tk=ntTasks(n), sn=ntSnip(n,140), showCat=(!ntCat||ntCat==='__pin'||ntCat[0]==='#'||ntCat==='__arch') && n.cat.trim();
  const left=n.del?Math.max(0,NT_KOSZ_DNI-Math.floor((Date.now()-n.del)/864e5)):0;
  return `<button type="button" class="nt-row${ntSel===n.id?' on':''}" data-ntid="${esc(n.id)}"${n.col?` style="--nc:${NT_KOLORY[n.col]}"`:''}>
    <b>${n.pin&&ntCat!=='__bin'?'<i class="nt-pinmark" aria-label="Przypięta"></i>':''}${ntMark(ntTitle(n))}</b>
    <span class="nt-rmeta"><time>${ntWhen(ntSort==='c'?n.c:n.u)}</time><span class="nt-rsn">${sn?ntMark(sn):'Brak dodatkowego tekstu'}</span></span>
    ${showCat||tk||n.del?`<span class="nt-rfoot">${showCat?`<span class="nt-rcat"><svg viewBox="0 0 16 16" aria-hidden="true"><path d="M1.5 4.5V13h13V5.5H7.5L6 3.5H1.5z"/></svg>${esc(n.cat.trim())}</span>`:''}${tk?`<span class="nt-rtk">☑ ${tk.done}/${tk.all}</span>`:''}${n.del?`<span class="nt-rdel">zostało ${left} ${left===1?'dzień':'dni'}</span>`:''}</span>`:''}</button>`;
}
function ntTile(n){   /* kafel w widoku galerii i na stronie głównej */
  const tk=ntTasks(n);
  const prev=n.b.split('\n').filter(Boolean).slice(n.t.trim()?0:1,8).map(l=>{ const m=l.match(/^\s*[-*] \[( |x|X)\] (.*)$/);
    return m?`<span class="nt-tck${m[1]!==' '?' on':''}">${esc(m[2].replace(/\*\*|~~/g,''))}</span>`:`<span>${esc(l.replace(/^[#>\-*\s]+|^\d+\.\s/g,'').replace(/\*\*|~~|`/g,''))}</span>`; }).join('');
  return `<button type="button" class="nt-tile${n.pin?' pin':''}" data-ntid="${esc(n.id)}"${n.col?` style="--nc:${NT_KOLORY[n.col]}"`:''}>
    <b>${ntMark(ntTitle(n))}</b><span class="nt-tprev">${prev||'<em>Brak treści</em>'}</span>
    <span class="nt-tile-foot"><span>${n.cat.trim()?esc(n.cat.trim()):''}</span><span>${tk?`☑ ${tk.done}/${tk.all} · `:''}${ntWhen(n.u)}</span></span></button>`;
}
function ntItemsHtml(L){
  let body='';
  if(!L.length) body=`<div class="nt-blank"><svg viewBox="0 0 48 48" aria-hidden="true"><path d="M12 6h18l8 8v28H12z"/><path d="M17 22h16M17 29h16M17 15h7"/></svg><p>${ntQ.trim()?'Brak wyników dla „'+esc(ntQ.trim())+'”.':ntCat==='__bin'?'Kosz jest pusty.':ntCat==='__arch'?'Brak zarchiwizowanych notatek.':'Brak notatek.'}</p></div>`;
  else if(ntView==='grid') body=`<div class="nt-grid">${L.map(ntTile).join('')}</div>`;
  else { let g=''; L.forEach(n=>{ const k=ntGroup(n); if(k!==g){ body+=`<div class="nt-gh">${esc(k)}</div>`; g=k; } body+=ntRowHtml(n); }); }
  return body;
}
function ntListHtml(){
  const L=ntList(), nazwa=ntCat===''?'Wszystkie':ntCat==='__pin'?'Przypięte':ntCat==='__arch'?'Archiwum':ntCat==='__bin'?'Ostatnio usunięte':ntCat;
  const body=ntItemsHtml(L);
  const S={u:'Data edycji', c:'Data utworzenia', t:'Tytuł'};
  return `<div class="nt-lhead">
      <div class="nt-ltop"><h2 class="nt-lname">${esc(nazwa)}</h2><span class="nt-lcount">${L.length} ${L.length===1?'notatka':L.length%10>=2&&L.length%10<=4&&(L.length%100<10||L.length%100>=20)?'notatki':'notatek'}</span>
        <div class="nt-lact">
          <div class="nt-seg" role="group" aria-label="Widok"><button type="button" data-ntview="list" aria-pressed="${ntView==='list'}" title="Lista"><svg viewBox="0 0 16 16" aria-hidden="true"><path d="M2 4h12M2 8h12M2 12h12"/></svg></button><button type="button" data-ntview="grid" aria-pressed="${ntView==='grid'}" title="Galeria"><svg viewBox="0 0 16 16" aria-hidden="true"><rect x="2" y="2" width="5" height="5"/><rect x="9" y="2" width="5" height="5"/><rect x="2" y="9" width="5" height="5"/><rect x="9" y="9" width="5" height="5"/></svg></button></div>
          <label class="nt-sort" title="Sortuj"><svg viewBox="0 0 16 16" aria-hidden="true"><path d="M4 2v12M1.5 11.5 4 14l2.5-2.5M12 14V2M9.5 4.5 12 2l2.5 2.5"/></svg><select id="ntSortSel" aria-label="Sortuj">${Object.entries(S).map(([k,v])=>`<option value="${k}"${ntSort===k?' selected':''}>${v}</option>`).join('')}</select></label>
          ${ntCat==='__bin'&&L.length?`<button type="button" class="nt-empty" data-act="ntbinempty">Opróżnij</button>`:''}
        </div></div>
      <label class="nt-search"><svg viewBox="0 0 16 16" aria-hidden="true"><circle cx="7" cy="7" r="5"/><path d="M11 11l3.5 3.5"/></svg><input type="search" id="ntQ" placeholder="Szukaj" value="${esc(ntQ)}" autocomplete="off" enterkeyhint="search"></label>
      <div class="nt-chips" id="ntChips">${ntChipsHtml()}</div>
    </div>
    <div class="nt-litems" id="ntItems">${body}</div>
    ${ntCat!=='__bin'?`<button type="button" class="nt-fab" data-act="ntnew" aria-label="Nowa notatka" title="Nowa notatka (Alt+N)"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg></button>`:''}`;
}
/* ——— widok: edytor ——— */
const NT_I = {
  back:'<svg viewBox="0 0 16 16"><path d="M10 3 5 8l5 5"/></svg>', pin:'<svg viewBox="0 0 16 16"><path d="M6 1.5h4l-.6 4.2 2.6 2.3v1.5H4V8l2.6-2.3z"/><path d="M8 9.5V15"/></svg>',
  more:'<svg viewBox="0 0 16 16"><circle cx="3" cy="8" r="1.2"/><circle cx="8" cy="8" r="1.2"/><circle cx="13" cy="8" r="1.2"/></svg>', col:'<svg viewBox="0 0 16 16"><circle cx="8" cy="8" r="5.5"/><path d="M8 2.5v11" /></svg>',
  ul:'<svg viewBox="0 0 16 16"><circle cx="2.5" cy="4" r=".9"/><circle cx="2.5" cy="8" r=".9"/><circle cx="2.5" cy="12" r=".9"/><path d="M6 4h8M6 8h8M6 12h8"/></svg>',
  ol:'<svg viewBox="0 0 16 16"><path d="M6 4h8M6 8h8M6 12h8"/><text x="0.5" y="5.6" font-size="4.6" stroke="none" fill="currentColor">1</text><text x="0.5" y="9.6" font-size="4.6" stroke="none" fill="currentColor">2</text><text x="0.5" y="13.6" font-size="4.6" stroke="none" fill="currentColor">3</text></svg>',
  ck:'<svg viewBox="0 0 16 16"><rect x="1.5" y="2.5" width="4" height="4" rx="1"/><path d="m2.4 4.5 1 1 1.6-2"/><rect x="1.5" y="9.5" width="4" height="4" rx="1"/><path d="M8 4.5h6.5M8 11.5h6.5"/></svg>',
  q:'<svg viewBox="0 0 16 16"><path d="M3 3v10"/><path d="M6 5h8M6 8h8M6 11h5"/></svg>', hr:'<svg viewBox="0 0 16 16"><path d="M1.5 8h13"/><path d="M4 4.5h8M4 11.5h8" opacity=".4"/></svg>',
  link:'<svg viewBox="0 0 16 16"><path d="M6.5 9.5a3 3 0 0 0 4.2 0l2.3-2.3a3 3 0 0 0-4.2-4.2L7.6 4.2"/><path d="M9.5 6.5a3 3 0 0 0-4.2 0L3 8.8A3 3 0 0 0 7.2 13l1.2-1.2"/></svg>',
  tbl:'<svg viewBox="0 0 16 16"><rect x="1.5" y="2.5" width="13" height="11" rx="1"/><path d="M1.5 6.5h13M1.5 10h13M6 2.5v11M10.5 2.5v11"/></svg>',
  hl:'<svg viewBox="0 0 16 16"><path d="m9.5 2.5 4 4-6 6H3.5v-4z"/><path d="M2 14.5h12" stroke-width="2.2" class="nt-hlbar"/></svg>',
  undo:'<svg viewBox="0 0 16 16"><path d="M5 3 2 6l3 3"/><path d="M2 6h7.5a4 4 0 0 1 0 8H6"/></svg>', redo:'<svg viewBox="0 0 16 16"><path d="m11 3 3 3-3 3"/><path d="M14 6H6.5a4 4 0 0 0 0 8H10"/></svg>',
  pages:'<svg viewBox="0 0 16 16"><path d="M3.5 1.5h9v5h-9zM3.5 9.5h9v5h-9z"/><path d="M1 8h2M5 8h2M9 8h2M13 8h2"/></svg>',
  img:'<svg viewBox="0 0 16 16"><rect x="1.5" y="2.5" width="13" height="11" rx="1.5"/><circle cx="5.5" cy="6.3" r="1.3"/><path d="m1.8 12 4-4 3 3 2-2 3.4 3.4"/></svg>',
  clr:'<svg viewBox="0 0 16 16"><path d="M3 3h9M7.5 3 5.5 13"/><path d="m10 9 4 4M14 9l-4 4"/></svg>', open:'<svg viewBox="0 0 16 16"><path d="M9 2.5h4.5V7M13.5 2.5 7 9M11.5 9.5v4h-9v-9h4"/></svg>'
};
function ntToolbarHtml(){
  const b=(cmd,inner,title,cls='')=>`<button type="button" class="nt-tb-b ${cls}" data-ntcmd="${cmd}" title="${title}" aria-label="${title}">${inner}</button>`;
  return `<div class="nt-tbw"><div class="nt-tb" role="toolbar" aria-label="Formatowanie" id="ntTb">
    <label class="nt-style" title="Styl akapitu"><select id="ntStyle" aria-label="Styl akapitu"><option value="h1">Tytuł</option><option value="h2">Nagłówek</option><option value="h3">Podnagłówek</option><option value="div" selected>Tekst</option><option value="pre">Monospace</option></select></label>
    <span class="nt-tb-sep"></span>
    ${b('img',NT_I.img,'Wstaw zdjęcie (można też wkleić Ctrl+V lub przeciągnąć)')}${b('pages',NT_I.pages,'Pokaż koniec stron A4 (jak w wydruku PDF)','nt-tb-pages')}
    <span class="nt-tb-sep"></span>
    ${b('bold','<b>B</b>','Pogrubienie (Ctrl+B)')}${b('italic','<i>I</i>','Kursywa (Ctrl+I)')}${b('underline','<u>U</u>','Podkreślenie (Ctrl+U)')}${b('strikeThrough','<s>S</s>','Przekreślenie (Ctrl+Shift+S)')}${b('hl',NT_I.hl,'Zakreślacz','nt-tb-hl')}
    <span class="nt-tb-sep"></span>
    ${b('ck',NT_I.ck,'Checklista (Ctrl+Shift+9)')}${b('insertUnorderedList',NT_I.ul,'Lista punktowana (Ctrl+Shift+8)')}${b('insertOrderedList',NT_I.ol,'Lista numerowana (Ctrl+Shift+7)')}
    <span class="nt-tb-sep"></span>
    ${b('quote',NT_I.q,'Cytat')}${b('table',NT_I.tbl,'Tabela')}${b('insertHorizontalRule',NT_I.hr,'Linia')}${b('link',NT_I.link,'Link (Ctrl+K)')}${b('openlink',NT_I.open,'Otwórz link','nt-tb-open')}
    <span class="nt-tb-sep"></span>
    ${b('undo',NT_I.undo,'Cofnij (Ctrl+Z)')}${b('redo',NT_I.redo,'Ponów (Ctrl+Y)')}${b('clear',NT_I.clr,'Wyczyść formatowanie')}</div>
    <form class="nt-linkbar" hidden><input name="u" placeholder="https://…" inputmode="url" autocomplete="off" aria-label="Adres linku"><button type="submit">Wstaw</button><button type="button" data-ntcmd="linkx" aria-label="Anuluj">✕</button></form>
  </div>`;
}
function ntMenuHtml(n){
  if(ntMenu==='col') return `<div class="nt-pop nt-colpop" role="menu">${Object.keys(NT_KOLOR_N).map(k=>`<button type="button" role="menuitemradio" aria-checked="${n.col===k}" data-ntcol="${k}" title="${NT_KOLOR_N[k]}" style="--nc:${NT_KOLORY[k]||'transparent'}"></button>`).join('')}</div>`;
  if(ntMenu==='more') return `<div class="nt-pop nt-morepop" role="menu">
    <button type="button" role="menuitem" data-act="ntdup">Duplikuj</button>
    <button type="button" role="menuitem" data-act="ntarch">${n.arch?'Przywróć z archiwum':'Archiwizuj'}</button>
    <hr><button type="button" role="menuitem" data-act="ntcopy">Kopiuj tekst</button>
    <button type="button" role="menuitem" data-act="ntmd">Pobierz jako .md</button>
    <button type="button" role="menuitem" data-act="nttxt">Pobierz jako .txt</button>
    <button type="button" role="menuitem" data-act="ntdocx">Pobierz jako Word (.docx)</button>
    <button type="button" role="menuitem" data-act="ntprint">Drukuj / PDF</button>
    <hr><button type="button" role="menuitem" class="danger" data-act="ntdel">Usuń</button></div>`;
  return '';
}
function ntEditorHtml(n){
  if(!n) return `<div class="nt-noed"><svg viewBox="0 0 48 48" aria-hidden="true"><path d="M12 6h18l8 8v28H12z"/><path d="M17 22h16M17 29h16M17 15h7"/></svg><p>Wybierz notatkę albo utwórz nową.</p><button type="button" class="nt-newbtn" data-act="ntnew">+ Nowa notatka</button></div>`;
  const kosz=!!n.del, F=ntCats();
  return `<article class="nt-ed${kosz?' ro':''}"${n.col?` style="--nc:${NT_KOLORY[n.col]}"`:''}>
    <div class="nt-ebar">
      <button type="button" class="nt-ib nt-back" data-act="ntback" aria-label="Wróć do listy">${NT_I.back}<span>${ntWide()&&ntView!=='grid'?'':'Notatki'}</span></button>
      ${kosz?'':`<label class="nt-fsel" title="Folder"><svg viewBox="0 0 16 16" aria-hidden="true"><path d="M1.5 4.5V13h13V5.5H7.5L6 3.5H1.5z"/></svg><select id="ntCatSel" aria-label="Folder"><option value="">Bez folderu</option>${F.map(c=>`<option value="${esc(c)}"${n.cat.trim()===c?' selected':''}>${esc(c)}</option>`).join('')}<option value="__new">+ Nowy folder…</option></select></label>
      <span class="nt-ebsp"></span>
      <div class="nt-mw"><button type="button" class="nt-ib" data-ntmenu="col" aria-label="Kolor" aria-expanded="${ntMenu==='col'}" title="Kolor"><i class="nt-coldot"${n.col?` style="background:${NT_KOLORY[n.col]}"`:''}></i></button>${ntMenu==='col'?ntMenuHtml(n):''}</div>
      <button type="button" class="nt-ib${n.pin?' on':''}" data-act="ntpin" aria-pressed="${n.pin}" title="${n.pin?'Odepnij':'Przypnij'}">${NT_I.pin}</button>
      <div class="nt-mw"><button type="button" class="nt-ib" data-ntmenu="more" aria-label="Więcej" aria-expanded="${ntMenu==='more'}" title="Więcej">${NT_I.more}</button>${ntMenu==='more'?ntMenuHtml(n):''}</div>`}
    </div>
    ${kosz?`<div class="nt-binbar"><span>Ta notatka jest w koszu.</span><button type="button" data-act="ntrestore">Przywróć</button><button type="button" class="danger" data-act="ntpurge">Usuń na zawsze</button></div>`:''}
    ${n.arch&&!kosz?`<div class="nt-binbar arch"><span>Notatka w archiwum.</span><button type="button" data-act="ntarch">Przywróć</button></div>`:''}
    <div class="nt-paper">
      <time class="nt-date">${ntWhen(n.u,true)}</time>
      <input class="nt-title" value="${esc(n.t)}" placeholder="Tytuł" aria-label="Tytuł notatki" maxlength="140"${kosz?' readonly':''} enterkeyhint="next">
      ${kosz?'':ntToolbarHtml()}
      <div class="nt-rich" id="ntRich" contenteditable="${!kosz}" spellcheck="true" role="textbox" aria-multiline="true" aria-label="Treść notatki" data-ph="Zacznij pisać…">${ntHtml(n)}</div>
    </div>
    <footer class="nt-foot"><span id="ntStat"></span><span id="ntCkx"></span></footer>
  </article>`;
}
/* ——— całość ——— */
function ntAppHtml(){
  if(!ntSel && ntWide() && ntView==='list'){ const f=ntList()[0]; if(f) ntSel=f.id; }   /* komputer: od razu otwórz pierwszą notatkę */
  const n=ntSel && N.find(x=>x.id===ntSel); if(!n) ntSel='';
  const ed=!!ntSel, grid=ntView==='grid';
  return `<div class="nt-app${ed?' has-ed':''}${grid?' grid':''}" id="ntApp">
    <nav class="nt-side" id="ntSide" aria-label="Foldery">${ntSideHtml()}</nav>
    <section class="nt-lpane" id="ntLPane" aria-label="Lista notatek">${ntListHtml()}</section>
    <section class="nt-epane" id="ntEPane" aria-label="Notatka">${ntEditorHtml(n)}</section></div>`;
}
function ntStatus(txt){ const el=$('#ntStat'); if(!el) return; const n=N.find(x=>x.id===ntSel); if(!n) return;
  const w=(n.b.trim().match(/\S+/g)||[]).length, ch=n.b.replace(/\s/g,'').length, min=Math.max(1,Math.round(w/200));
  el.textContent = txt || `${n.del?'W koszu':'Zapisano '+ntWhen(n.u)} · ${w} ${w===1?'słowo':(w%10>=2&&w%10<=4&&(w%100<10||w%100>=20))?'słowa':'słów'} · ${ch} znaków${w>60?` · ~${min} min czytania`:''}`;
  const ck=$('#ntCkx'); if(ck){ const tk=ntTasks(n); ck.innerHTML=tk&&!n.del?`<span class="nt-ckprog"><i style="width:${Math.round(tk.done/tk.all*100)}%"></i></span>${tk.done}/${tk.all}${tk.done&&tk.done<tk.all?` <button type="button" data-act="ntcksort">Zaznaczone na dół</button>`:''}`:''; } }
function ntRefresh(force){
  const app=$('#notesApp');
  if(app){
    const a=document.activeElement, typing=ntSel && a && a.closest && a.closest('.nt-ed') && (a.matches('input,textarea')||a.isContentEditable);
    const q=a&&a.id==='ntQ', pos=q?a.selectionStart:0;
    if(force || !$('#ntApp')){
      const ly=($('#ntItems')||{}).scrollTop||0;
      app.innerHTML=ntAppHtml(); const it=$('#ntItems'); if(it) it.scrollTop=ly;
      if(q){ const i=$('#ntQ'); if(i){ i.focus(); i.setSelectionRange(pos,pos); } }
    } else {
      const side=$('#ntSide'); if(side && !(a&&side.contains(a)&&a.matches('input'))) side.innerHTML=ntSideHtml();
      const lp=$('#ntLPane'), ly=($('#ntItems')||{}).scrollTop||0;
      if(lp && !q){ lp.innerHTML=ntListHtml(); const it=$('#ntItems'); if(it) it.scrollTop=ly; }
      else if(q){ const it=$('#ntItems'), L=ntList(); if(it) it.innerHTML=ntItemsHtml(L); const c=$('.nt-lcount'); if(c) c.textContent=`${L.length} ${L.length===1?'notatka':L.length%10>=2&&L.length%10<=4&&(L.length%100<10||L.length%100>=20)?'notatki':'notatek'}`; }
      if(!typing){ const ep=$('#ntEPane'); if(ep) ep.innerHTML=ntEditorHtml(ntSel&&N.find(x=>x.id===ntSel)); }
      const ap=$('#ntApp'); if(ap) ap.classList.toggle('has-ed',!!ntSel);
    }
    ntStatus();
  }
  const rn=$('#ntRecent'); if(rn) rn.innerHTML=ntRecentHtml();
}
function ntGrow(){ /* zostawione dla routera: po wejściu na stronę nic nie trzeba przeliczać */ }
function ntRecentHtml(){
  const L=ntAlive().filter(n=>!n.arch).sort((a,b)=>(b.pin-a.pin)||(b.u-a.u)).slice(0,4);
  if(!L.length) return `<div class="td-today empty"><p>Brak notatek.</p><button type="button" class="td-btn" data-act="ntnewgo">+ Nowa notatka</button></div>`;
  return `<div class="nt-grid nt-grid-sm">${L.map(ntTile).join('').replace(/data-ntid=/g,'data-ntgo=')}</div>`;
}
function pNotes(){ return `<h1>Notat<span class="acc">ki</span></h1><div id="notesApp">${ntAppHtml()}</div>`; }

/* ——— edytor: polecenia ——— */
const ntRich = () => $('#ntRich');
try{ document.execCommand('defaultParagraphSeparator', false, 'div'); }catch(e){}
let ntLastRange = null;   /* ostatnie zaznaczenie w edytorze — przywracane po kliknięciu w listę stylów */
/* najbliższy blok (akapit, nagłówek, punkt listy…) w którym stoi kursor */
function ntBlock(){ const s=getSelection(); if(!s.rangeCount) return null; let n=s.anchorNode; const r=ntRich(); if(!r||!r.contains(n)) return null;
  while(n && n!==r){ if(n.nodeType===1 && /^(DIV|P|H1|H2|H3|BLOCKQUOTE|PRE|LI|TD|TH)$/.test(n.tagName)) return n; n=n.parentNode; } return null; }
function ntClosest(tag){ const s=getSelection(); if(!s.rangeCount) return null; let n=s.anchorNode; const r=ntRich(); if(!r||!r.contains(n)) return null;
  while(n && n!==r){ if(n.nodeType===1 && n.matches(tag)) return n; n=n.parentNode; } return null; }
function ntSave(){ const r=ntRich(); if(!r||!ntSel) return; ntSet(ntSel,{h:ntClean(r.innerHTML), b:ntHtmlToMd(r)},true); ntToolState(); }
/* nowa lista w miejscu bieżącego akapitu (bez sklejania z listą obok, co robi przeglądarka) */
function ntMakeList(kind){
  const s=getSelection(), r=ntRich(); let blk=ntBlock();
  if(!blk){ const a=s.anchorNode; if(a && a.parentNode===r && a.nodeType===3){ const d=document.createElement('div'); a.replaceWith(d); d.appendChild(a); blk=d; } }
  if(!blk || !/^(DIV|P)$/.test(blk.tagName) || [...blk.children].some(c=>/^(UL|OL|DIV|TABLE)$/.test(c.tagName))) return false;
  if(!s.isCollapsed && !blk.contains(s.focusNode)) return false;   /* zaznaczonych kilka akapitów — niech zrobi to przeglądarka */
  const L=document.createElement(kind==='ol'?'ol':'ul'); if(kind==='ck') L.className='nt-ck';
  const li=document.createElement('li'); li.innerHTML=blk.innerHTML.trim()&&blk.textContent.trim()?blk.innerHTML:'<br>'; L.appendChild(li); blk.replaceWith(L);
  const rg=document.createRange(); rg.selectNodeContents(li); rg.collapse(false); s.removeAllRanges(); s.addRange(rg); return true;
}
function ntExec(cmd, val){
  const r=ntRich(); if(!r) return;
  if(document.activeElement!==r){ r.focus(); if(ntLastRange){ const s=getSelection(); s.removeAllRanges(); s.addRange(ntLastRange); } }
  try{ document.execCommand('styleWithCSS', false, cmd==='hiliteColor'); }catch(e){}
  if(cmd==='pages'){ if(typeof a4Przelacz==='function') a4Przelacz(); return; }
  if(cmd==='img'){ if(typeof ntZdjWybierz==='function') ntZdjWybierz(); return; }
  if(cmd==='ck'){ const ul=ntClosest('ul');
    if(ul && ul.classList.contains('nt-ck')){ document.execCommand('insertUnorderedList'); }   /* wyłącz */
    else if(ul){ ul.classList.add('nt-ck'); [...ul.children].forEach(li=>li.classList.remove('done')); }
    else if(!ntClosest('ol') && !ntMakeList('ck')){ document.execCommand('insertUnorderedList'); const u=ntClosest('ul'); if(u) u.classList.add('nt-ck'); }
    else if(ntClosest('ol')){ document.execCommand('insertUnorderedList'); const u=ntClosest('ul'); if(u) u.classList.add('nt-ck'); }
  }
  else if(cmd==='insertUnorderedList'){ const ul=ntClosest('ul'); if(ul && ul.classList.contains('nt-ck')) ul.classList.remove('nt-ck'); else if(ul || ntClosest('ol') || !ntMakeList('ul')) document.execCommand(cmd); }
  else if(cmd==='insertOrderedList'){ if(ntClosest('ul,ol') || !ntMakeList('ol')) document.execCommand(cmd); }
  else if(cmd==='quote'){ document.execCommand('formatBlock', false, ntClosest('blockquote')?'div':'blockquote'); }
  else if(cmd==='table'){ const row='<tr><td><br></td><td><br></td><td><br></td></tr>'; document.execCommand('insertHTML', false, `<table class="nt-tbl"><tbody>${row}${row}${row}</tbody></table><div><br></div>`); }
  else if(cmd==='hl'){ const on=ntClosest('span[style*="background"]'); document.execCommand('styleWithCSS',false,true); document.execCommand('hiliteColor', false, on?'transparent':'rgba(227,194,74,.45)'); }
  else if(cmd==='clear'){ document.execCommand('removeFormat'); document.execCommand('unlink'); document.execCommand('formatBlock', false, 'div'); }
  else if(cmd==='style'){ document.execCommand('formatBlock', false, val); }
  else document.execCommand(cmd, false, val||null);
  ntSave();
}
function ntToolState(){
  const tb=$('#ntTb'); if(!tb) return; const r=ntRich(); const s=getSelection(); if(!r||!s.rangeCount||!r.contains(s.anchorNode)) return;
  const q=c=>{ try{ return document.queryCommandState(c); }catch(e){ return false; } };
  tb.querySelectorAll('[data-ntcmd]').forEach(b=>{ const c=b.dataset.ntcmd; let on=false;
    if(['bold','italic','underline','strikeThrough','insertOrderedList'].includes(c)) on=q(c);
    else if(c==='insertUnorderedList'){ const u=ntClosest('ul'); on=!!u && !u.classList.contains('nt-ck'); }
    else if(c==='ck'){ const u=ntClosest('ul'); on=!!u && u.classList.contains('nt-ck'); }
    else if(c==='quote') on=!!ntClosest('blockquote');
    else if(c==='hl') on=!!ntClosest('span[style*="background"]');
    b.setAttribute('aria-pressed', on); });
  const blk=ntBlock(), tag=blk&&blk.nodeType===1?blk.tagName.toLowerCase():'div', st=$('#ntStyle');
  if(st) st.value=['h1','h2','h3','pre'].includes(tag)?tag:'div';
  tb.classList.toggle('has-link', !!ntClosest('a[href]'));
}
/* skróty w pisaniu: „- ”, „1. ”, „[] ”, „# ”, „## ”, „> ” na początku akapitu */
function ntAutoFormat(){
  let blk=ntBlock(); const s0=getSelection(), r=ntRich();
  if(!blk && s0.anchorNode && s0.anchorNode.parentNode===r && s0.anchorNode.nodeType===3){ const d=document.createElement('div'), tn=s0.anchorNode, off=s0.anchorOffset; tn.replaceWith(d); d.appendChild(tn); const rg=document.createRange(); rg.setStart(tn,off); s0.removeAllRanges(); s0.addRange(rg); blk=d; }
  if(!blk || blk.nodeType!==1 || !/^(DIV|P)$/.test(blk.tagName) || [...blk.children].some(c=>/^(UL|OL|DIV)$/.test(c.tagName))) return false;
  const t=blk.textContent.replace(/ /g,' ');
  const M=[[/^[-*] $/,'insertUnorderedList'],[/^1[.)] $/,'insertOrderedList'],[/^\[ ?\] $/,'ck'],[/^# $/,'h1'],[/^## $/,'h2'],[/^### $/,'h3'],[/^> $/,'quote']];
  const m=M.find(x=>x[0].test(t)); if(!m) return false;
  blk.innerHTML='<br>'; const rg=document.createRange(); rg.setStart(blk,0); rg.collapse(true); const s=getSelection(); s.removeAllRanges(); s.addRange(rg);
  if(/^h[123]$/.test(m[1])) ntExec('style', m[1]); else ntExec(m[1]);
  return true;
}
function ntDownload(name, text, type){
  const a=document.createElement('a'); a.href=URL.createObjectURL(new Blob([text],{type:type+';charset=utf-8'}));
  a.download=(name.replace(/[\\/:*?"<>|]+/g,' ').trim()||'notatka')+(type==='text/markdown'?'.md':'.txt'); document.body.appendChild(a); a.click(); setTimeout(()=>{ URL.revokeObjectURL(a.href); a.remove(); },500);
}
function ntPrint(n){
  const f=pdfRamkaIframe();
  const d=f.contentDocument; d.open(); d.write(pdfPrzygotuj(ntPrintHtml(n))); d.close();
  setTimeout(()=>{ f.contentWindow.focus(); f.contentWindow.print(); setTimeout(()=>f.remove(),1500); },150);
}
/* dokument do druku (używa go też podgląd końca stron A4 w js/33-strony-a4.js) */
function ntPrintHtml(n){
  return `<!doctype html><html lang="pl"><head><meta charset="utf-8"><title>${esc(ntTitle(n))}</title><style>
    body{font:15px/1.65 -apple-system,"Segoe UI",Inter,Arial,sans-serif;color:#111;max-width:720px;margin:32px auto;padding:0 20px}
    h1.t{font-size:26px;margin:0 0 4px} .d{color:#777;font-size:12px;margin-bottom:22px} h1{font-size:22px}h2{font-size:18px}h3{font-size:16px}
    ul.nt-ck{list-style:none;padding-left:4px} ul.nt-ck li::before{content:"☐ "} ul.nt-ck li.done::before{content:"☑ "} ul.nt-ck li.done{color:#888;text-decoration:line-through}
    blockquote{border-left:3px solid #c8252b;margin:6px 0;padding-left:12px;color:#444} pre{background:#f4f4f4;padding:10px;white-space:pre-wrap}
    img{max-width:100%;max-height:120mm;width:auto;height:auto;border-radius:6px;display:block;margin:4px 0} table{border-collapse:collapse} td,th{border:1px solid #bbb;padding:5px 9px} a{color:#c8252b}</style></head>
    <body><h1 class="t">${esc(ntTitle(n))}</h1><div class="d">${esc(n.cat?n.cat+' · ':'')}${ntWhen(n.u,true)}</div><div class="nt-pc">${(ntSel===n.id&&ntRich())?ntClean(ntRich().innerHTML).replace(/<img ([^>]*)data-zid="([\w-]+)"/g,(m,x,z)=>`<img ${x}data-zid="${z}" src="${(typeof NTZ_URL!=='undefined'&&NTZ_URL[z])||''}"`):ntHtml(n)}</div></body></html>`;
}
function ntOpen(id){ ntFlush(); ntSel=id; ntMenu=''; ntRefresh(true); if(!ntWide()) window.scrollTo(0,0); }

/* ——— zdarzenia ——— */
document.addEventListener('click', e=>{
  const go=e.target.closest('[data-ntgo]'); if(go){ ntSel=go.dataset.ntgo; location.hash='#notatki'; return; }
  if(!e.target.closest('#notesApp')){ if(e.target.closest('[data-act="ntnewgo"]')){ location.hash='#notatki'; ntNew(); } return; }
  /* checklista: klik w kwadracik po lewej */
  const li=e.target.closest('#ntRich ul.nt-ck > li');
  if(li && !$('.nt-ed.ro')){ const rc=li.getBoundingClientRect(); if(e.clientX-rc.left < 30){ e.preventDefault(); li.classList.toggle('done'); ntSave(); ntStatus(); return; } }
  if(ntMenu && !e.target.closest('.nt-mw')){ ntMenu=''; const ep=$('#ntEPane'); if(ep) ep.querySelectorAll('.nt-pop').forEach(p=>p.remove()); ep&&ep.querySelectorAll('[data-ntmenu]').forEach(b=>b.setAttribute('aria-expanded','false')); }
  const cm=e.target.closest('[data-ntcmd]'); if(cm){ e.preventDefault(); const c=cm.dataset.ntcmd;
    if(c==='link'){ const s=getSelection(); ntLinkRange=s.rangeCount?s.getRangeAt(0).cloneRange():null; const f=$('form.nt-linkbar'); if(f){ f.hidden=false; const a=ntClosest('a[href]'); f.u.value=a?a.getAttribute('href'):''; f.u.focus(); } return; }
    if(c==='linkx'){ const f=$('form.nt-linkbar'); if(f) f.hidden=true; return; }
    if(c==='openlink'){ const a=ntClosest('a[href]'); if(a) window.open(a.href,'_blank','noopener'); return; }
    return ntExec(c); }
  const it=e.target.closest('[data-ntid]'); if(it) return ntOpen(it.dataset.ntid);
  const fr=e.target.closest('[data-ntfren]'); if(fr){ e.stopPropagation(); ntFoldEd=fr.dataset.ntfren; const s=$('#ntSide'); if(s){ s.innerHTML=ntSideHtml(); const i=s.querySelector('form.nt-fren input'); i&&(i.focus(),i.select()); } return; }
  const fd=e.target.closest('[data-ntfdel]'); if(fd){ e.stopPropagation(); const c=fd.dataset.ntfdel;
    if(!fd.dataset.arm){ fd.dataset.arm='1'; fd.textContent='usuń?'; fd.classList.add('armed'); setTimeout(()=>{ if(fd.isConnected){ delete fd.dataset.arm; fd.textContent='×'; fd.classList.remove('armed'); } },3000); return; }
    N.filter(n=>n.cat.trim()===c).forEach(n=>{ n.cat=''; ntPush(n); }); N=N.map(n=>({...n})); NT_FOLD=NT_FOLD.filter(x=>x!==c); ntSaveFold(); saveNotes(); ntCat=''; store.set('ntCat',''); return ntRefresh(true); }
  const ch=e.target.closest('[data-ntcat]'); if(ch){ ntFlush(); ntCat=ch.dataset.ntcat; store.set('ntCat',ntCat); ntFoldEd='';
    if(ntWide() && ntView==='list'){ const f=ntList()[0]; ntSel=f?f.id:''; } else ntSel=''; return ntRefresh(true); }
  const vw=e.target.closest('[data-ntview]'); if(vw){ ntView=vw.dataset.ntview; store.set('ntView',ntView); if(ntView==='grid') ntSel=''; return ntRefresh(true); }
  const mn=e.target.closest('[data-ntmenu]'); if(mn){ ntMenu=ntMenu===mn.dataset.ntmenu?'':mn.dataset.ntmenu; const n=N.find(x=>x.id===ntSel);
    document.querySelectorAll('.nt-pop').forEach(p=>p.remove()); if(ntMenu&&n) mn.insertAdjacentHTML('afterend', ntMenuHtml(n)); mn.setAttribute('aria-expanded', !!ntMenu); return; }
  const cl=e.target.closest('[data-ntcol]'); if(cl){ ntMenu=''; return ntSet(ntSel,{col:cl.dataset.ntcol}); }
  const b=e.target.closest('[data-act]'); if(!b) return;
  const n=N.find(x=>x.id===ntSel);
  switch(b.dataset.act){
    case 'ntnew': ntNew(); break;
    case 'ntback': ntFlush(); ntSel=''; ntMenu=''; ntRefresh(true); break;
    case 'ntpin': if(n) ntSet(n.id,{pin:!n.pin}); break;
    case 'ntarch': if(n){ ntMenu=''; const was=n.arch; ntSet(n.id,{arch:!n.arch, pin:false}); if(!was && ntCat!=='__arch'){ ntSel=''; ntRefresh(true); } } break;
    case 'ntdup': if(n){ ntMenu=''; const c=ntNorm(uid('n'),{...n, t:(n.t||ntTitle(n))+' (kopia)', pin:false, c:Date.now(), u:Date.now()}); N=[c,...N]; ntSel=c.id; saveNotes(); ntPush(c); ntRefresh(true); } break;
    case 'ntcopy': if(n){ ntMenu=''; const r=ntRich(); const txt=(n.t?n.t+'\n\n':'')+(r?r.innerText:n.b); (navigator.clipboard?navigator.clipboard.writeText(txt):Promise.reject()).then(()=>ntStatus('Skopiowano do schowka')).catch(()=>ntStatus('Nie udało się skopiować')); document.querySelectorAll('.nt-pop').forEach(p=>p.remove()); } break;
    case 'ntmd': if(n){ ntMenu=''; ntDownload(ntTitle(n), `# ${ntTitle(n)}\n\n${n.b}\n`, 'text/markdown'); document.querySelectorAll('.nt-pop').forEach(p=>p.remove()); } break;
    case 'nttxt': if(n){ ntMenu=''; const r=ntRich(); ntDownload(ntTitle(n), `${ntTitle(n)}\n\n${r?r.innerText:n.b}\n`, 'text/plain'); document.querySelectorAll('.nt-pop').forEach(p=>p.remove()); } break;
    case 'ntdocx': if(n){ ntMenu=''; document.querySelectorAll('.nt-pop').forEach(p=>p.remove()); ntFlush(); ntDocxPobierz(n); } break;
    case 'ntprint': if(n){ ntMenu=''; document.querySelectorAll('.nt-pop').forEach(p=>p.remove()); ntPrint(n); } break;
    case 'ntdel': if(n){ ntMenu=''; ntTrash(n.id); } break;
    case 'ntrestore': if(n){ ntSet(n.id,{del:0}); ntCat=''; store.set('ntCat',''); ntRefresh(true); } break;
    case 'ntpurge': if(!n) break;
      if(!b.dataset.arm){ b.dataset.arm='1'; b.textContent='Na pewno? Tego nie da się cofnąć'; setTimeout(()=>{ if(b.isConnected){ delete b.dataset.arm; b.textContent='Usuń na zawsze'; } },3500); break; }
      ntPurge(n.id); ntRefresh(true); break;
    case 'ntbinempty':
      if(!b.dataset.arm){ b.dataset.arm='1'; b.textContent='Na pewno?'; b.classList.add('armed'); setTimeout(()=>{ if(b.isConnected){ delete b.dataset.arm; b.textContent='Opróżnij'; b.classList.remove('armed'); } },3000); break; }
      N.filter(x=>x.del).forEach(x=>ntPurge(x.id)); ntRefresh(true); break;
    case 'ntcksort': { const r=ntRich(); if(!r) break; r.querySelectorAll('ul.nt-ck').forEach(u=>[...u.children].filter(li=>li.classList.contains('done')).forEach(li=>u.appendChild(li))); ntSave(); ntStatus(); break; }
  }
});
document.addEventListener('submit', e=>{
  const f=e.target;
  if(f.matches('form.nt-linkbar')){ e.preventDefault(); let u=f.u.value.trim(); f.hidden=true; if(!u) return;
    if(!/^(https?:|mailto:)/i.test(u)) u='https://'+u;
    const r=ntRich(); r.focus(); const s=getSelection(); if(ntLinkRange){ s.removeAllRanges(); s.addRange(ntLinkRange); }
    if(s.isCollapsed) document.execCommand('insertHTML', false, `<a href="${esc(u)}">${esc(u.replace(/^https?:\/\//,''))}</a>&nbsp;`); else document.execCommand('createLink', false, u);
    ntSave(); return; }
  if(f.matches('form.nt-fnew')){ e.preventDefault(); const v=f.n.value.trim().slice(0,40); if(!v) return;
    if(!ntCats().includes(v)){ NT_FOLD=[...NT_FOLD,v]; ntSaveFold(); }
    ntCat=v; store.set('ntCat',v); ntSel=''; return ntRefresh(true); }
  if(f.matches('form.nt-fren')){ e.preventDefault(); const old=f.dataset.old, v=f.n.value.trim().slice(0,40); ntFoldEd='';
    if(v && v!==old){ N.filter(n=>n.cat.trim()===old).forEach(n=>{ n.cat=v; ntPush(n); }); N=N.map(n=>({...n})); NT_FOLD=[...new Set(NT_FOLD.map(x=>x===old?v:x))]; ntSaveFold(); saveNotes(); if(ntCat===old){ ntCat=v; store.set('ntCat',v); } }
    return ntRefresh(true); }
});
document.addEventListener('change', e=>{
  const el=e.target;
  if(el.id==='ntSortSel'){ ntSort=el.value; store.set('ntSort',ntSort); return ntRefresh(true); }
  if(el.id==='ntStyle'){ const r=ntRich(); if(r) ntExec('style', el.value==='pre'?'pre':el.value); return; }
  if(el.id==='ntCatSel'){ if(el.value==='__new'){ const v=(prompt('Nazwa nowego folderu:')||'').trim().slice(0,40); if(!v){ el.value=(N.find(x=>x.id===ntSel)||{}).cat||''; return; }
      if(!ntCats().includes(v)){ NT_FOLD=[...NT_FOLD,v]; ntSaveFold(); } return ntSet(ntSel,{cat:v}); }
    return ntSet(ntSel,{cat:el.value}); }
});
document.addEventListener('input', e=>{
  const el=e.target;
  if(el.id==='ntQ'){ ntQ=el.value; return ntRefresh(); }
  if(!el.closest || !el.closest('.nt-ed')) return;
  if(el.matches('.nt-title')) return ntSet(ntSel,{t:el.value},true);
  if(el.id==='ntRich'){ if(e.inputType==='insertText' && e.data===' ' && ntAutoFormat()) return; ntSave(); }
});
/* wklejanie: zawsze jako czysty tekst (bez obcych stylów ze stron i Worda) */
document.addEventListener('paste', e=>{
  if(!e.target.closest || !e.target.closest('#ntRich')) return;
  const cd=e.clipboardData||window.clipboardData, pl=[...(cd.files||[])].filter(f=>/^image\//.test(f.type));
  if(pl.length && typeof ntZdjWstaw==='function'){ e.preventDefault(); pl.forEach(f=>ntZdjWstaw(f)); return; }
  e.preventDefault(); const t=cd.getData('text/plain'); if(!t) return;
  if(/^https?:\/\/\S+$/.test(t.trim())) document.execCommand('insertHTML', false, `<a href="${esc(t.trim())}">${esc(t.trim())}</a>&nbsp;`);
  else document.execCommand('insertText', false, t);
});
document.addEventListener('selectionchange', ()=>{ const r=ntRich(); if(!r) return; const s=getSelection(); if(s.rangeCount && r.contains(s.anchorNode)) ntLastRange=s.getRangeAt(0).cloneRange(); ntToolState(); });
/* przyciski formatowania nie zabierają kursora z tekstu (na telefonie klawiatura zostaje) */
document.addEventListener('mousedown', e=>{ if(e.target.closest && e.target.closest('.nt-tb-b')) e.preventDefault(); });
document.addEventListener('touchstart', ()=>{}, {passive:true});
document.addEventListener('focusout', e=>{ if(e.target.closest && e.target.closest('.nt-ed')) ntFlush();
  if(e.target.closest && e.target.closest('form.nt-fren')) setTimeout(()=>{ if(ntFoldEd && !(document.activeElement&&document.activeElement.closest&&document.activeElement.closest('form.nt-fren'))){ ntFoldEd=''; const s=$('#ntSide'); if(s) s.innerHTML=ntSideHtml(); } },150); });
document.addEventListener('keydown', e=>{
  const inNotes=!!$('#notesApp'); if(!inNotes) return;
  const mod=e.ctrlKey||e.metaKey, t=e.target;
  if(e.altKey && !mod && (e.key==='n'||e.key==='N') && !t.isContentEditable){ e.preventDefault(); return ntNew(); }
  if(mod && (e.key==='f'||e.key==='F') && !e.shiftKey){ const q=$('#ntQ'); if(q){ e.preventDefault(); q.focus(); q.select(); } return; }
  if(e.key==='Escape'){ if(ntMenu){ ntMenu=''; document.querySelectorAll('.nt-pop').forEach(p=>p.remove()); return; }
    const lb=$('form.nt-linkbar'); if(lb && !lb.hidden){ lb.hidden=true; return; }
    if(ntSel && !ntWide()){ ntFlush(); ntSel=''; return ntRefresh(true); } return; }
  if(t.matches && t.matches('.nt-title') && e.key==='Enter'){ e.preventDefault(); const r=ntRich(); if(r){ r.focus(); const rg=document.createRange(); rg.setStart(r,0); rg.collapse(true); const s=getSelection(); s.removeAllRanges(); s.addRange(rg); } return; }
  if(t.id!=='ntRich') return;
  if(mod && e.shiftKey && (e.key==='S'||e.key==='s')){ e.preventDefault(); return ntExec('strikeThrough'); }
  if(mod && e.shiftKey && (e.code==='Digit7')){ e.preventDefault(); return ntExec('insertOrderedList'); }
  if(mod && e.shiftKey && (e.code==='Digit8')){ e.preventDefault(); return ntExec('insertUnorderedList'); }
  if(mod && e.shiftKey && (e.code==='Digit9')){ e.preventDefault(); return ntExec('ck'); }
  if(mod && (e.key==='k'||e.key==='K')){ e.preventDefault(); const b=$('[data-ntcmd="link"]'); b&&b.click(); return; }
  /* Tab w tabeli: następna komórka, w ostatniej — nowy wiersz */
  if(e.key==='Tab'){ const td=ntClosest('td,th'); if(!td) return; e.preventDefault();
    const cells=[...td.closest('table').querySelectorAll('td,th')], i=cells.indexOf(td); let nx=cells[i+(e.shiftKey?-1:1)];
    if(!nx && !e.shiftKey){ const tr=td.closest('tr'), nr=tr.cloneNode(true); nr.querySelectorAll('td,th').forEach(c=>c.innerHTML='<br>'); tr.after(nr); nx=nr.firstElementChild; ntSave(); }
    if(nx){ const rg=document.createRange(); rg.selectNodeContents(nx); rg.collapse(false); const s=getSelection(); s.removeAllRanges(); s.addRange(rg); } return; }
  /* Enter w cytacie: kończy cytat i zaczyna zwykły akapit (Shift+Enter — nowa linia w cytacie) */
  if(e.key==='Enter' && !e.shiftKey){ const bq=ntClosest('blockquote'); if(bq){ e.preventDefault();
    const d=document.createElement('div'); d.innerHTML='<br>'; bq.after(d); const rg=document.createRange(); rg.setStart(d,0); rg.collapse(true); const sl=getSelection(); sl.removeAllRanges(); sl.addRange(rg); ntSave(); return; } }
  /* nowy punkt checklisty startuje niezaznaczony */
  if(e.key==='Enter' && !e.shiftKey){ setTimeout(()=>{ const li=ntClosest('ul.nt-ck > li'); if(li && !li.textContent.trim()) li.classList.remove('done'); },0); }
});
/* telefon: pasek formatowania tuż nad klawiaturą */
(function(){ const vv=window.visualViewport; if(!vv) return;
  const fit=()=>{ const kb=Math.max(0, window.innerHeight-vv.height-vv.offsetTop); document.documentElement.style.setProperty('--nt-kb', kb+'px'); };
  vv.addEventListener('resize',fit); vv.addEventListener('scroll',fit); })();
document.addEventListener('focusin', e=>{ if(e.target.id==='ntRich' && !ntWide()) document.body.classList.add('nt-typing'); });
document.addEventListener('focusout', e=>{ if(e.target.id==='ntRich') setTimeout(()=>{ if(!(document.activeElement&&document.activeElement.closest&&document.activeElement.closest('.nt-tbw,#ntRich'))) document.body.classList.remove('nt-typing'); },120); });
window.addEventListener('beforeunload', ntFlush);
