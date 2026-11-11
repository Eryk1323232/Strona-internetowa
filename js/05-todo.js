/* ════════════════════════════════════════════════════════════════════════
   TO-DO (STUDIA)
   ════════════════════════════════════════════════════════════════════════
   T        – stan: listy (T.lists) i zadania (T.tasks).
   tdApp()  – rysuje całą stronę To-Do; tdDrawerHtml() – panel szczegółów zadania.
   tdAdd / tdSet / tdDel – dodawanie, zmiana, usuwanie zadania.
   Widoki: Mój dzień, Ważne, Zaplanowane, Wszystkie, Zadania + własne listy.
   Na dole: uid(), todayISO(), isoAdd() – używane też w innych modułach.
   ════════════════════════════════════════════════════════════════════════ */

/* ——— TO-DO: listy, Mój dzień, ważne, terminy, kroki, powtarzanie (chmura przez db, kopia w przeglądarce) ——— */
const p2 = n => String(n).padStart(2,'0');
const isoOf = x => x.getFullYear()+'-'+p2(x.getMonth()+1)+'-'+p2(x.getDate());
const todayISO = () => isoOf(new Date());
const isoDate = iso => { const [y,m,d]=iso.split('-').map(Number); return new Date(y,m-1,d); };
const isoAdd = (iso,n) => { const x=isoDate(iso); x.setDate(x.getDate()+n); return isoOf(x); };
const uid = p => p+Date.now().toString(36)+Math.random().toString(36).slice(2,6);
const TDI = {
  sun:'<circle cx="8" cy="8" r="3"/><path d="M8 1v2M8 13v2M1 8h2M13 8h2M3 3l1.4 1.4M11.6 11.6 13 13M3 13l1.4-1.4M11.6 4.4 13 3"/>',
  star:'<path d="M8 1.6l1.9 4 4.4.6-3.2 3.1.8 4.4L8 11.6l-3.9 2.1.8-4.4L1.7 6.2l4.4-.6z" stroke-linejoin="round"/>',
  cal:'<rect x="1.5" y="3" width="13" height="11.5"/><path d="M1.5 6.5h13M5 1v3M11 1v3"/>',
  all:'<rect x="1.5" y="1.5" width="5" height="5"/><rect x="9.5" y="1.5" width="5" height="5"/><rect x="1.5" y="9.5" width="5" height="5"/><rect x="9.5" y="9.5" width="5" height="5"/>',
  home:'<path d="M1.5 7.5 8 2l6.5 5.5v7h-13z"/>',
  list:'<path d="M5 3.5h9.5M5 8h9.5M5 12.5h9.5M1.5 3.5h1.2M1.5 8h1.2M1.5 12.5h1.2"/>',
  note:'<path d="M2.5 1.5h8l3 3v10h-11z"/><path d="M5 7h6M5 10h6"/>',
  rep:'<path d="M2.2 7A6 6 0 0 1 12.8 4.2M13.8 9a6 6 0 0 1-10.6 2.8"/><path d="M13 1.2v3.2H9.8M3 14.8v-3.2h3.2"/>',
  step:'<path d="M3 4.5h10M3 8h10M3 11.5h6"/>'
};
const ico = (k,c='') => `<svg class="ic ${c}" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true">${TDI[k]}</svg>`;
const SMART = [['dzien','Mój dzień','sun'],['wazne','Ważne','star'],['plan','Zaplanowane','cal'],['wszystkie','Wszystkie','all'],['zadania','Zadania','home']];
const REPS = [['','Nie powtarzaj'],['d','Codziennie'],['wd','Dni robocze'],['w','Co tydzień'],['m','Co miesiąc']];
const SORTS = [['dom','Kolejność dodania'],['due','Termin'],['imp','Ważność'],['az','Alfabetycznie']];

const tdNorm = (id,v={}) => ({id, t:String(v.t||''), l:String(v.l||'zadania'), done:!!v.done, imp:!!v.imp, myDay:String(v.myDay||''), due:String(v.due||''),
  tm:/^\d{2}:\d{2}$/.test(v.tm||'')?v.tm:'', note:String(v.note||''), steps:Array.isArray(v.steps)?v.steps.map(s=>({t:String(s&&s.t||''), d:!!(s&&s.d)})):[], rep:String(v.rep||''), c:+v.c||0, dn:+v.dn||0});
const tdDoc = t => { const {id,...rest}=t; return rest; };
let T = {lists:[], tasks:[]};
try{ const c=JSON.parse(store.get('todoState','null')); if(c && Array.isArray(c.tasks)) T={lists:Array.isArray(c.lists)?c.lists:[], tasks:c.tasks.map(t=>tdNorm(t.id,t))}; }catch(e){}
const saveTodo = () => store.set('todoState', JSON.stringify(T));
let tdView = store.get('tdView','dzien'), tdSel = null, tdRenaming = false, tdNoteTimer = null;
let tdShowDone = store.get('tdDone','1')==='1', tdSort = store.get('tdSort','dom');

const tdListName = id => id==='zadania' ? 'Zadania' : ((T.lists.find(l=>l.id===id)||{}).n || 'Zadania');
const tdLists = () => T.lists.slice().sort((a,b)=>a.o-b.o);
function tdFilter(v){
  const td=todayISO();
  if(v==='dzien') return T.tasks.filter(t=>t.myDay===td);
  if(v==='wazne') return T.tasks.filter(t=>t.imp);
  if(v==='plan') return T.tasks.filter(t=>t.due);
  if(v==='wszystkie') return T.tasks.slice();
  return T.tasks.filter(t=>t.l===v);
}
function tdSorted(a){
  const by = {dom:(x,y)=>y.c-x.c, due:(x,y)=>(x.due||'9999')<(y.due||'9999')?-1:(x.due||'9999')>(y.due||'9999')?1:y.c-x.c,
    imp:(x,y)=>(y.imp-x.imp)||(y.c-x.c), az:(x,y)=>x.t.localeCompare(y.t,'pl')};
  return a.slice().sort(by[tdSort]||by.dom);
}
function dueLabel(iso){
  const t=todayISO();
  if(iso===t) return 'Dziś'; if(iso===isoAdd(t,1)) return 'Jutro'; if(iso===isoAdd(t,-1)) return 'Wczoraj';
  const x=isoDate(iso);
  return x.toLocaleDateString('pl-PL',{weekday:'short',day:'numeric',month:'short',...(x.getFullYear()!==new Date().getFullYear()?{year:'numeric'}:{})});
}
function tdNext(iso, rep){
  if(rep==='d') return isoAdd(iso,1);
  if(rep==='w') return isoAdd(iso,7);
  if(rep==='wd'){ let n=isoAdd(iso,1); while([0,6].includes(isoDate(n).getDay())) n=isoAdd(n,1); return n; }
  if(rep==='m'){ const x=isoDate(iso), d=x.getDate(); const y=new Date(x.getFullYear(), x.getMonth()+1, 1); y.setDate(Math.min(d, new Date(y.getFullYear(), y.getMonth()+1, 0).getDate())); return isoOf(y); }
  return iso;
}

/* — zmiany — */
/* due — termin wybrany przy dodawaniu (pole daty obok „Dodaj”); bez wyboru w „Zaplanowane” = dziś */
function tdAdd(title, due){
  const td=todayISO(), v=tdView, custom=T.lists.some(l=>l.id===v);
  const t=tdNorm(uid('t'), {t:title, l:custom?v:'zadania', imp:v==='wazne', myDay:v==='dzien'?td:'', due:due||(v==='plan'?td:''), c:Date.now()});
  T.tasks=[t,...T.tasks]; saveTodo(); tdRefresh();
  cloud(db=>db.collection('todo').doc(t.id).set(tdDoc(t)));
}
function tdSet(id, patch){
  const t=T.tasks.find(x=>x.id===id); if(!t) return;
  patch={...patch};
  if('done' in patch) patch.dn = patch.done ? Date.now() : 0;
  if(patch.rep && !t.due && !patch.due) patch.due = todayISO();
  let next=null;
  if(patch.done && !t.done && t.rep){
    next={...t, id:uid('t'), done:false, dn:0, due:tdNext(t.due||todayISO(), t.rep), myDay:'', steps:t.steps.map(s=>({...s,d:false})), c:Date.now()};
    patch.rep='';
  }
  T.tasks=T.tasks.map(x=>x.id===id?{...x,...patch}:x);
  if(next) T.tasks=[next,...T.tasks];
  saveTodo(); tdRefresh();
  cloud(db=>db.collection('todo').doc(id).update(patch));
  if(next) cloud(db=>db.collection('todo').doc(next.id).set(tdDoc(next)));
}
function tdDel(id){
  T.tasks=T.tasks.filter(t=>t.id!==id); if(tdSel===id) tdSel=null; saveTodo(); tdRefresh();
  cloud(db=>db.collection('todo').doc(id).delete());
}
function tdAddList(n){
  const id=uid('l'), o=Math.max(-1,...T.lists.map(l=>l.o))+1;
  T.lists=[...T.lists,{id,n,o}]; tdView=id; store.set('tdView',id); saveTodo(); tdRefresh();
  cloud(db=>db.collection('todoListy').doc(id).set({n,o}));
}
function tdRenameList(id, n){
  T.lists=T.lists.map(l=>l.id===id?{...l,n}:l); saveTodo(); tdRefresh();
  cloud(db=>db.collection('todoListy').doc(id).update({n}));
}
function tdDelList(id){
  const gone=T.tasks.filter(t=>t.l===id).map(t=>t.id);
  T.lists=T.lists.filter(l=>l.id!==id); T.tasks=T.tasks.filter(t=>t.l!==id);
  if(gone.includes(tdSel)) tdSel=null;
  tdView='zadania'; store.set('tdView','zadania'); saveTodo(); tdRefresh();
  cloud(db=>db.collection('todoListy').doc(id).delete());
  gone.forEach(g=>cloud(db=>db.collection('todo').doc(g).delete()));
}

/* — widok — */
function tdRow(t, showList){
  const td=todayISO(), m=[];
  if(showList) m.push(`<span>${esc(tdListName(t.l))}</span>`);
  if(t.myDay===td && tdView!=='dzien') m.push(`<span>${ico('sun')}Mój dzień</span>`);
  if(t.steps.length) m.push(`<span>${ico('step')}${t.steps.filter(s=>s.d).length} z ${t.steps.length}</span>`);
  if(t.due){ const c=!t.done&&t.due<td?'late':t.due===td&&!t.done?'now':''; m.push(`<span class="${c}">${ico('cal')}${esc(dueLabel(t.due))}${t.tm?' · '+t.tm:''}${t.rep?' '+ico('rep'):''}</span>`); }
  if(t.note.trim()) m.push(`<span>${ico('note')}notatka</span>`);
  return `<div class="td-row${t.done?' done':''}${tdSel===t.id?' sel':''}" data-id="${esc(t.id)}">
    <button type="button" class="td-chk" data-act="done" aria-pressed="${t.done}" aria-label="${t.done?'Oznacz jako nieukończone':'Oznacz jako ukończone'}"></button>
    <button type="button" class="td-body" data-act="open"><span class="td-t">${esc(t.t)}</span>${m.length?`<span class="td-meta">${m.join('')}</span>`:''}</button>
    <button type="button" class="td-star" data-act="imp" aria-pressed="${t.imp}" aria-label="${t.imp?'Usuń ważność':'Oznacz jako ważne'}">${ico('star')}</button></div>`;
}
function tdEmpty(v){
  const txt={dzien:'Lista Mój dzień czyści się każdego ranka, a zadania zostają w swoich listach. Dodaj tu to, co chcesz zrobić dziś.',
    wazne:'Oznacz gwiazdką zadania, które mają priorytet — trafią tutaj.', plan:'Zadania z terminem pojawią się tutaj, pogrupowane według dni.'}[v]||'Brak zadań. Dodaj pierwsze powyżej.';
  const art=v==='dzien'?`<circle cx="32" cy="38" r="13" fill="var(--mark)"/><path d="M4 38h56" stroke="var(--ink)" stroke-width="2.5"/><path d="M32 14v8M14 22l5 5M50 22l-5 5" stroke="var(--ink)" stroke-width="2.5"/><rect x="4" y="44" width="56" height="16" fill="none" stroke="var(--ink)" stroke-width="2.5"/>`
    :`<rect x="8" y="6" width="48" height="52" fill="none" stroke="var(--ink)" stroke-width="2.5"/><rect x="16" y="16" width="9" height="9" fill="var(--accent)"/><path d="M30 20.5h18M16 36h32M16 46h22" stroke="var(--ink)" stroke-width="2.5"/>`;
  return `<div class="td-empty"><svg viewBox="0 0 64 64" aria-hidden="true">${art}</svg><p>${txt}</p></div>`;
}
function tdPlanGroups(open){
  const td=todayISO(), tm=isoAdd(td,1), wk=isoAdd(td,7);
  const G=[['late','Zaległe',t=>t.due<td],['d','Dziś',t=>t.due===td],['t','Jutro',t=>t.due===tm],['w','Najbliższe 7 dni',t=>t.due>tm&&t.due<=wk],['l','Później',t=>t.due>wk]];
  const s=open.slice().sort((a,b)=>a.due<b.due?-1:a.due>b.due?1:b.c-a.c);
  return G.map(([k,n,f])=>{ const r=s.filter(f); return r.length?`<div class="td-group ${k}"><span class="label">${n}</span><span class="label">${r.length}</span></div>${r.map(t=>tdRow(t,true)).join('')}`:''; }).join('');
}
function tdApp(){
  const v=tdView, smart=SMART.find(s=>s[0]===v), list=T.lists.find(l=>l.id===v);
  if(!smart && !list){ tdView='dzien'; return tdApp(); }
  const all=tdFilter(v), open=tdSorted(all.filter(t=>!t.done)), done=all.filter(t=>t.done).sort((a,b)=>b.dn-a.dn);
  const showList=['dzien','wazne','plan','wszystkie'].includes(v);
  const cnt=k=>tdFilter(k).filter(t=>!t.done).length;
  const nav=(k,n,ic,c)=>`<button type="button" role="tab" class="td-nav" data-tdv="${esc(k)}" aria-selected="${k===v}">${ico(ic,'c-'+c)}${esc(n)}${cnt(k)?`<span class="ct">${cnt(k)}</span>`:''}</button>`;
  const rail=`<div class="ptabs td-tabs" role="tablist">${SMART.map(s=>nav(s[0],s[1],s[2],s[2])).join('')}${T.lists.length?'<span class="ptabs-sep" aria-hidden="true"></span>':''}${tdLists().map(l=>nav(l.id,l.n,'list','list')).join('')}
    <form class="td-newlist"><input name="n" placeholder="+ Nowa lista" aria-label="Nazwa nowej listy" autocomplete="off" maxlength="60"></form></div>`;
  const name=smart?smart[1]:list.n;
  const sub=v==='dzien'?new Date().toLocaleDateString('pl-PL',{weekday:'long',day:'numeric',month:'long'}):`${open.length} otwarte · ${done.length} ukończone`;
  const tools=`${v!=='plan'?`<select class="td-sel td-sort" aria-label="Sortowanie">${SORTS.map(s=>`<option value="${s[0]}"${s[0]===tdSort?' selected':''}>${s[1]}</option>`).join('')}</select>`:''}
    ${list?`<button type="button" class="td-btn" data-act="rename">Zmień nazwę</button><button type="button" class="td-btn arm" data-act="dellist" data-confirm="Usunąć${all.length?' z '+all.length+' zad.':''}?">Usuń listę</button>`:''}`;
  const title=list&&tdRenaming?`<input class="tdd-in td-rename" value="${esc(list.n)}" aria-label="Nazwa listy" maxlength="60">`:`<h2>${esc(name)}</h2>`;
  let body;
  if(!all.length) body=tdEmpty(v);
  else if(!open.length) body=`<div class="td-empty" style="padding:26px 12px 6px"><p>Wszystko zrobione.</p></div>`;
  else body=v==='plan'?tdPlanGroups(open):open.map(t=>tdRow(t,showList)).join('');
  const doneHtml=done.length?`<button type="button" class="td-donetoggle" data-act="donetoggle" aria-expanded="${tdShowDone}">Ukończone <span class="ct">${done.length}</span></button>
    ${tdShowDone?`<div class="td-items">${done.map(t=>tdRow(t,showList)).join('')}</div>`:''}`:'';
  return `${rail}<div class="td-main"><div class="td-head"><div style="min-width:0">${title}<div class="td-sub">${esc(sub)}</div></div><div class="td-tools">${tools}</div></div>
    <form class="td-add"><span class="plus" aria-hidden="true">+</span><input name="t" placeholder="Dodaj zadanie${v==='dzien'?' na dziś':v==='wazne'?' (ważne)':v==='plan'?' (termin: dziś)':''}" aria-label="Nowe zadanie" autocomplete="off" maxlength="200">
      <span class="td-adddue"><button type="button" class="td-duebtn" data-act="adddue" aria-label="Wybierz termin" title="Termin">${ico('cal')}<span class="td-duelbl"></span></button><button type="button" class="td-dueclr" data-act="adddueclr" aria-label="Usuń termin" hidden>×</button><input type="date" name="due" class="td-duein" tabindex="-1" aria-hidden="true"></span>
      <button type="submit">Dodaj</button></form>
    <div class="td-items">${body}</div>${doneHtml}</div>`;
}
function tdTodayHtml(){
  const td=todayISO();
  const r=T.tasks.filter(t=>!t.done && (t.myDay===td || (t.due && t.due<=td))).sort((a,b)=>(a.due||'9999')<(b.due||'9999')?-1:(a.due||'9999')>(b.due||'9999')?1:b.c-a.c);
  if(!r.length) return `<div class="td-today empty"><p>Nic zaplanowanego na dziś.</p><a class="td-btn" href="#todo">Otwórz To-Do →</a></div>`;
  return `<div class="td-today">${r.slice(0,8).map(t=>tdRow(t,true)).join('')}${r.length>8?`<a class="td-more" href="#todo">+${r.length-8} więcej →</a>`:''}</div>`;
}
function tdDrawerHtml(t){
  const td=todayISO(), my=t.myDay===td;
  const steps=t.steps.map((s,i)=>`<div class="tdd-step${s.d?' done':''}"><button type="button" class="td-chk sm" data-act="step" data-i="${i}" aria-pressed="${s.d}" aria-label="Krok ukończony"></button>
    <input class="tdd-in tdd-stepin" data-i="${i}" value="${esc(s.t)}" aria-label="Krok ${i+1}" maxlength="200"><button type="button" class="tdd-x" data-act="delstep" data-i="${i}" aria-label="Usuń krok">×</button></div>`).join('');
  const lists=[['zadania','Zadania'],...tdLists().map(l=>[l.id,l.n])];
  return `<div class="tdd-top"><span class="label">Zadanie · ${esc(tdListName(t.l))}</span><button type="button" class="td-btn" data-act="close">Zamknij ✕</button></div>
  <div class="tdd-sec"><div class="tdd-head"><button type="button" class="td-chk" data-act="done" aria-pressed="${t.done}" aria-label="Ukończone"></button>
    <input class="tdd-in tdd-title" value="${esc(t.t)}" aria-label="Tytuł zadania" maxlength="200">
    <button type="button" class="td-star" data-act="imp" aria-pressed="${t.imp}" aria-label="Ważne">${ico('star')}</button></div>
    <div class="tdd-steps">${steps}<form class="tdd-addstep"><span class="plus" aria-hidden="true">+</span><input class="tdd-in" name="s" placeholder="${t.steps.length?'Następny krok':'Dodaj krok'}" aria-label="Nowy krok" autocomplete="off" maxlength="200"></form></div></div>
  <div class="tdd-sec"><button type="button" class="tdd-myday${my?' on':''}" data-act="myday">${ico('sun')}${my?'Dodano do widoku Mój dzień':'Dodaj do widoku Mój dzień'}${my?'<span class="x">usuń ✕</span>':''}</button></div>
  <div class="tdd-sec">
    <div class="tdd-field"><span class="label"><span>Termin</span>${t.due?`<span>${esc(dueLabel(t.due))}</span>`:''}</span>
      <div class="tdd-row"><button type="button" class="td-btn${t.due===td?' on':''}" data-act="due" data-v="0">Dziś</button><button type="button" class="td-btn${t.due===isoAdd(td,1)?' on':''}" data-act="due" data-v="1">Jutro</button><button type="button" class="td-btn${t.due===isoAdd(td,7)?' on':''}" data-act="due" data-v="7">Za tydzień</button>${t.due?'<button type="button" class="td-btn" data-act="nodue">Usuń</button>':''}</div>
      <div class="tdd-row"><input type="date" class="tdd-date tdd-due" value="${esc(t.due)}" aria-label="Wybierz datę"><input type="time" class="tdd-date tdd-tm" value="${esc(t.tm)}" aria-label="Godzina (opcjonalnie)" title="Godzina (opcjonalnie)"${t.due?'':' disabled'}></div></div>
    <div class="tdd-field"><label class="label" for="tddRep">Powtarzaj</label><select id="tddRep" class="td-sel tdd-rep">${REPS.map(r=>`<option value="${r[0]}"${r[0]===t.rep?' selected':''}>${r[1]}</option>`).join('')}</select></div>
    <div class="tdd-field"><label class="label" for="tddList">Lista</label><select id="tddList" class="td-sel tdd-list">${lists.map(l=>`<option value="${esc(l[0])}"${l[0]===t.l?' selected':''}>${esc(l[1])}</option>`).join('')}</select></div></div>
  <div class="tdd-sec"><label class="label" for="tddNote" style="display:block;margin-bottom:6px">Notatka</label><textarea id="tddNote" class="tdd-note" placeholder="Szczegóły, linki, numery sal…">${esc(t.note)}</textarea></div>
  <div class="tdd-foot"><span>${t.done&&t.dn?'Ukończono '+new Date(t.dn).toLocaleDateString('pl-PL'):'Utworzono '+new Date(t.c||Date.now()).toLocaleDateString('pl-PL')}</span><button type="button" class="td-btn arm" data-act="del" data-confirm="Na pewno usunąć?">Usuń zadanie</button></div>`;
}
function tdDrawerRender(force){
  let dr=$('#tdDrawer'), sc=$('#tdScrim');
  const t=tdSel && T.tasks.find(x=>x.id===tdSel);
  if(!t || !$('#todoApp')){ dr&&dr.remove(); sc&&sc.remove(); tdSel=null; return; }
  let fresh=false;
  if(!dr){ sc=document.createElement('div'); sc.id='tdScrim'; sc.className='td-scrim'; document.body.appendChild(sc);
    dr=document.createElement('aside'); dr.id='tdDrawer'; dr.className='td-drawer in'; dr.setAttribute('aria-label','Szczegóły zadania'); document.body.appendChild(dr); fresh=true; }
  const a=document.activeElement;
  if(!force && !fresh && dr.dataset.id===t.id && a && dr.contains(a) && a.matches('input:not([type=date]),textarea')) return;
  const st=dr.scrollTop; dr.dataset.id=t.id; dr.innerHTML=tdDrawerHtml(t); dr.scrollTop=fresh?0:st;
}
function tdClose(){ tdSel=null; tdRefresh(); }
/* napis na przycisku terminu w polu dodawania (np. „Jutro”, „pt, 14 lis”) */
function tdDueLbl(){ const i=$('.td-add input[name=due]'), l=$('.td-duelbl'), x=$('.td-dueclr'), b=$('.td-duebtn'); if(!i||!l) return;
  l.textContent=i.value?dueLabel(i.value):''; if(x) x.hidden=!i.value; if(b) b.classList.toggle('on',!!i.value); }
function tdRefresh(){
  const app=$('#todoApp');
  if(app){
    const a=document.activeElement, keep=['.td-add input','.td-newlist input'].find(s=>a&&a.matches&&a.matches(s));
    const vals={add:($('.td-add input[name=t]')||{}).value||'', due:($('.td-add input[name=due]')||{}).value||'', nl:($('.td-newlist input')||{}).value||''};
    if(!(a&&a.matches&&a.matches('.td-rename'))){
      app.innerHTML=tdApp();
      const ai=$('.td-add input[name=t]'), ni=$('.td-newlist input'), di=$('.td-add input[name=due]');
      if(ai) ai.value=vals.add; if(ni) ni.value=vals.nl; if(di){ di.value=vals.due; tdDueLbl(); }
      if(keep) $(keep)&&$(keep).focus();
      const rn=$('.td-rename'); if(rn){ rn.focus(); rn.select(); }
    }
    $('#tdSync') && ($('#tdSync').textContent=syncText());
  }
  const today=$('#tdToday'); if(today) today.innerHTML=tdTodayHtml();
  tdDrawerRender();
}
function pTodo(){
  return `<h1>To-<span class="acc">Do</span></h1>
  <div class="td" id="todoApp">${tdApp()}</div>
  <p class="sync" id="tdSync"></p>
`;
}

/* — zdarzenia — */
document.addEventListener('click', e=>{
  const nav=e.target.closest('[data-tdv]');
  if(nav){ tdView=nav.dataset.tdv; store.set('tdView',tdView); tdRenaming=false; tdRefresh(); return; }
  if(e.target.closest('#tdScrim')) return tdClose();
  const b=e.target.closest('[data-act]'); if(!b) return;
  if(b.classList.contains('arm') && !b.dataset.armed){
    const o=b.textContent; b.dataset.armed='1'; b.textContent=b.dataset.confirm; b.classList.add('armed');
    setTimeout(()=>{ if(b.isConnected){ delete b.dataset.armed; b.textContent=o; b.classList.remove('armed'); } },3000); return;
  }
  const id=(b.closest('[data-id]')||{dataset:{}}).dataset.id, t=T.tasks.find(x=>x.id===id), a=b.dataset.act, td=todayISO();
  switch(a){
    case 'done': if(t) tdSet(id,{done:!t.done}); break;
    case 'imp': if(t) tdSet(id,{imp:!t.imp}); break;
    case 'open':
      if(!t) break; tdSel=id;
      if(!$('#todoApp')){ if(!tdFilter(tdView).some(x=>x.id===id)){ tdView=t.myDay===td?'dzien':'plan'; store.set('tdView',tdView); } location.hash='#todo'; }
      else tdRefresh();
      break;
    case 'close': tdClose(); break;
    case 'myday': if(t) tdSet(id,{myDay:t.myDay===td?'':td}); break;
    case 'adddue': { const i=$('.td-add input[name=due]'); if(i){ try{ i.showPicker(); }catch(err){ i.focus(); i.click(); } } return; }
    case 'adddueclr': { const i=$('.td-add input[name=due]'); if(i){ i.value=''; tdDueLbl(); } return; }
    case 'due': if(t) tdSet(id,{due:isoAdd(td,+b.dataset.v)}); break;
    case 'nodue': if(t) tdSet(id,{due:'',rep:'',tm:''}); break;
    case 'step': if(t){ const i=+b.dataset.i; tdSet(id,{steps:t.steps.map((s,j)=>j===i?{...s,d:!s.d}:s)}); } break;
    case 'delstep': if(t){ const i=+b.dataset.i; tdSet(id,{steps:t.steps.filter((s,j)=>j!==i)}); } break;
    case 'del': if(t) tdDel(id); break;
    case 'donetoggle': tdShowDone=!tdShowDone; store.set('tdDone',tdShowDone?'1':'0'); tdRefresh(); break;
    case 'rename': tdRenaming=true; tdRefresh(); break;
    case 'dellist': tdDelList(tdView); break;
  }
});
document.addEventListener('submit', e=>{
  const f=e.target;
  if(f.matches('form.td-add')){ e.preventDefault(); const v=f.t.value.trim(); if(!v) return; const d=f.due.value; f.t.value=''; f.due.value=''; tdDueLbl(); tdAdd(v, d); return; }
  if(f.matches('form.td-newlist')){ e.preventDefault(); const v=f.n.value.trim(); if(!v) return; f.n.value=''; tdAddList(v); return; }
  if(f.matches('form.tdd-addstep')){ e.preventDefault(); const v=f.s.value.trim(), t=T.tasks.find(x=>x.id===tdSel); if(!v||!t) return;
    f.s.value=''; f.s.blur(); tdSet(t.id,{steps:[...t.steps,{t:v,d:false}]}); const ni=$('.tdd-addstep input'); ni&&ni.focus(); }
});
document.addEventListener('change', e=>{
  const el=e.target;
  if(el.matches('.td-sort')){ tdSort=el.value; store.set('tdSort',tdSort); return tdRefresh(); }
  if(el.matches('.td-rename')){ const v=el.value.trim(); tdRenaming=false; el.blur(); if(v&&T.lists.some(l=>l.id===tdView)) tdRenameList(tdView,v); else tdRefresh(); return; }
  if(el.matches('.td-duein')){ tdDueLbl(); const ti=$('.td-add input[name=t]'); ti&&ti.focus(); return; }
  const dr=el.closest('#tdDrawer'); if(!dr) return;
  const id=dr.dataset.id, t=T.tasks.find(x=>x.id===id); if(!t) return;
  if(el.matches('.tdd-title')){ const v=el.value.trim(); if(v&&v!==t.t) tdSet(id,{t:v}); else el.value=t.t; return; }
  if(el.matches('.tdd-stepin')){ const i=+el.dataset.i, v=el.value.trim();
    tdSet(id,{steps:v?t.steps.map((s,j)=>j===i?{...s,t:v}:s):t.steps.filter((s,j)=>j!==i)}); return; }
  if(el.matches('.tdd-due')) return tdSet(id,{due:el.value||'', ...(el.value?{}:{rep:'',tm:''})});
  if(el.matches('.tdd-tm')) return tdSet(id,{tm:el.value||''});
  if(el.matches('.tdd-rep')) return tdSet(id,{rep:el.value});
  if(el.matches('.tdd-list')) return tdSet(id,{l:el.value});
  if(el.matches('.tdd-note')){ clearTimeout(tdNoteTimer); if(el.value!==t.note) tdSet(id,{note:el.value}); }
});
document.addEventListener('input', e=>{
  if(!e.target.matches('.tdd-note')) return;
  const el=e.target, id=el.closest('#tdDrawer').dataset.id;
  clearTimeout(tdNoteTimer);
  tdNoteTimer=setTimeout(()=>{ const t=T.tasks.find(x=>x.id===id); if(t && el.isConnected && el.value!==t.note) tdSet(id,{note:el.value}); },900);
});
document.addEventListener('keydown', e=>{
  if(e.key==='Enter' && e.target.matches('.tdd-title, .tdd-stepin, .td-rename')){ e.preventDefault(); e.target.blur(); }
  if(e.key==='Escape'){ if(tdRenaming){ tdRenaming=false; document.activeElement&&document.activeElement.blur(); tdRefresh(); } else if(tdSel) tdClose(); }
});
document.addEventListener('focusout', e=>{ if(e.target.matches && e.target.matches('.td-rename')) setTimeout(()=>{ if(tdRenaming){ tdRenaming=false; tdRefresh(); } },0); });
const refreshAll = () => { typeof sbSyncRefresh==='function' && sbSyncRefresh(); refreshWot(); tdRefresh(); ntRefresh(); gymRefresh(); planRefresh(); pxRefresh(); trRefresh(); mxRefresh(); dkRefresh(); typeof subRefresh==='function' && subRefresh(); typeof bkRefresh==='function' && bkRefresh(); typeof finRefresh==='function' && finRefresh(); typeof cvRefresh==='function' && cvRefresh(); };
