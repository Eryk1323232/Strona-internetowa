/* ════════════════════════════════════════════════════════════════════════
   GOOGLE KALENDARZ — połączenie Kalendarza strony z Twoim Kalendarzem Google
   ════════════════════════════════════════════════════════════════════════
   Działa przez ten sam Apps Script co Arkusz (apps-script/Kod.gs, wersja ≥ 4) — bez kluczy API
   i bez logowania na stronie. Skrypt działa „jako Ty”, więc widzi i zmienia Twój kalendarz.

   • Odczyt:  wydarzenia ze wszystkich kalendarzy zaznaczonych w Google Kalendarzu
              (gkZapewnij(od,do) — pobiera, gdy zakres jest nieaktualny; pamięć: localStorage „gkCache”).
   • Zapis:   gkDodaj({n,d,tm,tk,przyp}) — wydarzenie od razu ląduje na liście i w kolejce („gkKolejka”),
              która wysyła je do Google (przetrwa brak internetu i odświeżenie strony).
   • Usuwanie: gkUsun(key) — tylko z Twoich kalendarzy, bez wydarzeń powtarzających się.
   • kalZbierz() (js/25) bierze wydarzenia z gkWDniach(od,do) jako kategorię „gk”.
   • Widżet na stronie głównej: hdKalendarz() — mini-miesiąc + wybrany dzień + szybkie dodanie
     (wstawiany przez homeDash() w js/26-pulpit.js, wygląd: css/44-google-kalendarz.css).

   Gdzie trafiają nowe wpisy: store 'kalCel' = 'gk' (Google Kalendarz) albo 'todo' (zadanie w To-Do).
   ════════════════════════════════════════════════════════════════════════ */
const GK_ODSWIEZ = 120000;   /* co ile ms pobierać ponownie ten sam zakres (2 min) */
const GK_PRZYP = [['','Domyślne przypomnienie'],['x','Bez przypomnienia'],['0','W chwili rozpoczęcia'],['10','10 min przed'],['30','30 min przed'],['60','1 godz. przed'],['1440','1 dzień przed']];

let GKAL = (()=>{ try{ const o=JSON.parse(store.get('gkCache','null')); if(o&&Array.isArray(o.ev)) return {ev:o.ev, t:o.t||{}, ok:o.ok||0}; }catch(e){} return {ev:[], t:{}, ok:0}; })();
let gkKol = (()=>{ try{ const o=JSON.parse(store.get('gkKolejka','[]')); return Array.isArray(o)?o:[]; }catch(e){ return []; } })();
let gkBlad = '', gkStary = false, gkWysylam = false, gkPytUsun = '';
const gkLeci = new Set();

const gkPolaczony = () => !(typeof PODGLAD!=='undefined' && PODGLAD) && typeof arkuszUstawienia==='function' && !!arkuszUstawienia();
const gkCel = () => gkPolaczony() && store.get('kalCel','gk')!=='todo' ? 'gk' : 'todo';
const gkHm = d => String(d.getHours()).padStart(2,'0')+':'+String(d.getMinutes()).padStart(2,'0');
const gkZapisz = () => { const gr=isoAdd(todayISO(),-400); GKAL.ev=GKAL.ev.filter(e=>e.tmp||e.dk>=gr);
  const k=Object.keys(GKAL.t); if(k.length>40) k.sort((a,b)=>GKAL.t[a]-GKAL.t[b]).slice(0,k.length-40).forEach(x=>delete GKAL.t[x]);
  store.set('gkCache', JSON.stringify(GKAL)); store.set('gkKolejka', JSON.stringify(gkKol)); };

/* ——— rozmowa z Apps Script ——— */
async function gkGet(akcja, extra={}){
  const a=arkuszUstawienia(); if(!a) throw new Error('Brak połączenia z Arkuszem');
  const q=new URLSearchParams({klucz:a.klucz, akcja, t:Date.now(), ...extra});
  const j=await (await fetch(a.url+(a.url.includes('?')?'&':'?')+q)).json();
  if(!j.ok){ if(/Nieznana akcja/.test(j.blad||'')) gkStary=true; throw new Error(j.blad||'Błąd Google Kalendarza'); }
  return j.dane;
}
const gkBladTekst = e => gkStary ? 'Zaktualizuj Kod.gs (⚙ → Synchronizacja)' : /fetch|network/i.test(String(e&&e.message)) ? 'Brak internetu — spróbuję ponownie' : String(e&&e.message||e);

/* wydarzenie z Google → postać używana na stronie */
function gkNorm(x){
  const e={id:String(x.id||''), cal:String(x.cal||''), kn:String(x.kn||''), kol:/^#[0-9a-f]{6}$/i.test(x.kol||'')?x.kol:'', n:String(x.t||'(bez tytułu)'),
    cd:!!x.cd, gdzie:String(x.g||''), own:!!x.own, prim:!!x.prim, rec:!!x.rec};
  if(e.cd){ e.d=String(x.s); e.dk=isoAdd(String(x.e),-1); if(e.dk<e.d) e.dk=e.d; e.tm=''; e.tk=''; }
  else { const s=new Date(+x.s), k=new Date(+x.e); e.d=kalIso(s); e.tm=gkHm(s); e.tk=gkHm(k); const kk=kalIso(new Date(k.getTime()-1)); e.dk=kk<e.d?e.d:kk; }
  e.key=e.id+'|'+x.s;
  return e;
}

/* ——— pobieranie ——— */
function gkZapewnij(od, doI){
  if(!gkPolaczony() || gkStary) return;
  const k=od+'|'+doI; if(gkLeci.has(k) || Date.now()-(GKAL.t[k]||0)<GK_ODSWIEZ) return;
  gkLeci.add(k); GKAL.t[k]=Date.now();   /* także przy błędzie — żeby nie pytać w kółko */
  gkGet('gkLista',{od:new Date(od+'T00:00').getTime(), do:new Date(isoAdd(doI,1)+'T00:00').getTime()}).then(L=>{
    if(!Array.isArray(L)){ gkStary=true; throw new Error('stary skrypt'); }
    const nowe=L.map(gkNorm), klucze=new Set(nowe.map(e=>e.key));
    GKAL.ev=GKAL.ev.filter(e=>e.tmp || (e.dk<od || e.d>doI) && !klucze.has(e.key)).concat(nowe);
    GKAL.ok=Date.now(); gkBlad=''; gkZapisz(); gkPoZmianie();
  }).catch(e=>{ gkBlad=gkBladTekst(e); delete GKAL.t[k]; GKAL.t[k]=Date.now()-GK_ODSWIEZ+30000; gkPoZmianie(); if(gkStary && typeof skryptSprawdz==='function') skryptSprawdz(true); })
    .finally(()=>gkLeci.delete(k));
  if(gkKol.length) gkWyslij();
}
/* wydarzenia rozpisane na dni (wielodniowe — na każdy dzień) dla kalZbierz() */
function gkWDniach(od, doI){
  const W=[];
  GKAL.ev.forEach(e=>{ if(e.dk<od || e.d>doI) return;
    for(let d=e.d>od?e.d:od, n=0; d<=e.dk && d<=doI && n<62; d=isoAdd(d,1), n++)
      W.push([d,{k:'gk', id:e.key, n:e.n, tm:d===e.d?e.tm:'', tk:d===e.d?e.tk:'', sub:e.cd?(e.dk>e.d?'cały dzień · do '+new Date(e.dk+'T12:00').toLocaleDateString('pl-PL',{day:'numeric',month:'short'}):'cały dzień'):'', gk:e}]); });
  return W;
}
/* przerysuj to, co jest na ekranie (ale nie w trakcie pisania w formularzu) */
function gkPoZmianie(){
  const f=document.activeElement, pisze=f && f.matches && f.matches('input,select') && f.closest('form.kal-add,form.hk-add') && f.value;
  if(pisze) return;
  if(document.getElementById('kalApp') && typeof kalRefresh==='function') kalRefresh();
  if(document.getElementById('homeDash') && typeof homeRefresh==='function') homeRefresh();
}

/* ——— dodawanie ——— */
function gkDodaj({n, d, tm='', tk='', przyp=''}){
  n=String(n||'').trim().slice(0,300); if(!n || !d) return;
  let s, e, cd=!tm;
  if(cd){ s=new Date(d+'T12:00').getTime(); e=s; }
  else { s=new Date(d+'T'+tm).getTime(); e=tk?new Date(d+'T'+tk).getTime():s+36e5; if(e<=s) e+=864e5; }
  const tmp='tmp_'+uid('g');
  GKAL.ev.push({...gkNorm({id:'', t:n, cd, s:cd?d:s, e:cd?isoAdd(d,1):e, own:true, prim:true}), key:tmp, tmp:true});
  gkKol.push({tmp, p:{t:n, cd:cd?'1':'0', s, e, przyp}});
  gkZapisz(); gkPoZmianie(); gkWyslij();
}
async function gkWyslij(){
  if(gkWysylam || !gkKol.length || !gkPolaczony()) return;
  gkWysylam=true;
  while(gkKol.length){
    const z=gkKol[0];
    try{ const e=gkNorm(await gkGet('gkDodaj', z.p)); GKAL.ev=GKAL.ev.filter(x=>x.key!==z.tmp && x.key!==e.key); GKAL.ev.push(e); gkKol.shift(); gkBlad=''; gkZapisz(); }
    catch(err){ gkBlad=gkBladTekst(err); if(!gkStary) setTimeout(gkWyslij, 30000); else if(typeof skryptSprawdz==='function') skryptSprawdz(true); break; }
  }
  gkWysylam=false; gkPoZmianie();
}
addEventListener('online', ()=>gkWyslij());

/* ——— usuwanie (dwa kliknięcia: „Usuń” → „Na pewno?”) ——— */
async function gkUsun(key){
  const e=GKAL.ev.find(x=>x.key===key); if(!e) return;
  GKAL.ev=GKAL.ev.filter(x=>x.key!==key); gkPytUsun='';
  if(e.tmp){ gkKol=gkKol.filter(z=>z.tmp!==key); gkZapisz(); return gkPoZmianie(); }
  gkZapisz(); gkPoZmianie();
  try{ await gkGet('gkUsun',{id:e.id, cal:e.cal}); }
  catch(err){ GKAL.ev.push(e); gkBlad='Nie usunięto: '+gkBladTekst(err); gkZapisz(); gkPoZmianie(); }
}

/* ——— wspólne kawałki HTML (Kalendarz i widżet) ——— */
function gkStatusHtml(){
  if(typeof PODGLAD!=='undefined' && PODGLAD) return '';
  if(!gkPolaczony()) return `<span class="gk-st off" title="Połącz Arkusz Google w ⚙ → Synchronizacja">Google: niepołączony</span>`;
  if(gkStary) return `<span class="gk-st zle" title="Wklej nowy Kod.gs: ⚙ → Synchronizacja → Kopiuj nowy Kod.gs">Google: zaktualizuj skrypt</span>`;
  if(gkKol.length) return `<span class="gk-st busy">Google: wysyłanie (${gkKol.length})…</span>`;
  if(gkBlad) return `<span class="gk-st zle" title="${esc(gkBlad)}">Google: ${esc(gkBlad.length>34?gkBlad.slice(0,34)+'…':gkBlad)}</span>`;
  return `<span class="gk-st ok" title="Wydarzenia dodane tutaj trafiają do Twojego Kalendarza Google">Google${GKAL.ok?' · '+gkHm(new Date(GKAL.ok)):''}</span>`;
}
/* jeden wiersz wydarzenia z Google w panelu dnia */
function gkWierszHtml(e){
  const g=e.gk, czas=g.cd?'':(e.tm?`${e.tm}${e.tk?'–'+e.tk:''}`:'');
  const usun=g.own && !g.rec ? `<button type="button" class="gk-del${gkPytUsun===g.key?' pyt':''}" data-gkdel="${esc(g.key)}" aria-label="Usuń z Google Kalendarza" title="Usuń z Google Kalendarza">${gkPytUsun===g.key?'Na pewno?':'×'}</button>` : '';
  return `<div class="kal-it gk-it${g.tmp?' tmp':''}"${g.kol?` style="--k:${g.kol}"`:''}>${czas?`<span class="kal-tm">${czas}</span>`:''}<span>${esc(e.n)}<small>${[g.tmp?'wysyłanie do Google…':'', e.sub, g.gdzie, !g.prim&&g.kn?g.kn:'', g.rec?'powtarza się':''].filter(Boolean).map(esc).join(' · ')}</small></span>${usun}</div>`;
}
const gkLinkDnia = d => `https://calendar.google.com/calendar/r/day/${d.replace(/-/g,'/')}`;
const gkPrzypSel = () => `<select name="przyp" class="gk-przyp" aria-label="Przypomnienie">${GK_PRZYP.map(([v,l])=>`<option value="${v}"${store.get('gkPrzyp','')===v?' selected':''}>${l}</option>`).join('')}</select>`;
/* przełącznik: dokąd trafia nowy wpis */
function gkCelHtml(){
  const c=gkCel(), ok=gkPolaczony();
  return `<div class="gk-cel" role="group" aria-label="Dokąd dodać"><button type="button" data-kalcel="gk" aria-pressed="${c==='gk'}"${ok?'':' disabled title="Połącz Arkusz Google w ⚙ → Synchronizacja"'}>Google Kalendarz</button><button type="button" data-kalcel="todo" aria-pressed="${c==='todo'}">Zadanie To-Do</button></div>`;
}

/* ════════ WIDŻET NA STRONIE GŁÓWNEJ ════════ */
let hkM = todayISO().slice(0,7), hkSel = todayISO();
function hdKalendarz(){
  if(typeof kalZbierz!=='function') return '';
  const [y,m]=hkM.split('-').map(Number), first=new Date(y,m-1,1), dniM=new Date(y,m,0).getDate(), lead=(first.getDay()+6)%7, cells=Math.ceil((lead+dniM)/7)*7;
  const od=kalIso(new Date(y,m-1,1-lead)), doI=kalIso(new Date(y,m-1,cells-lead)), td=todayISO();
  gkZapewnij(od,doI);
  const M=kalZbierz(od,doI), off=typeof kalOff!=='undefined'?kalOff:new Set();
  const grid=Array.from({length:cells},(_,i)=>{ const dt=new Date(y,m-1,1-lead+i), d=kalIso(dt), E=(M[d]||[]).filter(e=>!off.has(e.k));
    const kropki=[...new Map(E.map(e=>[e.k==='gk'&&e.gk.kol?e.gk.kol:e.k, e])).values()].slice(0,3);
    return `<button type="button" class="hk-c${dt.getMonth()===m-1?'':' out'}${d===td?' today':''}${d===hkSel?' sel':''}" data-hkd="${d}" aria-label="${dt.toLocaleDateString('pl-PL',{weekday:'long',day:'numeric',month:'long'})}${E.length?', '+E.length+' wydarzeń':''}"><span>${dt.getDate()}</span><i class="hk-dots">${kropki.map(e=>`<b class="k-${e.k}"${e.k==='gk'&&e.gk.kol?` style="--k:${e.gk.kol}"`:''}></b>`).join('')}</i></button>`; }).join('');
  const E=((hkSel>=od&&hkSel<=doI?M:kalZbierz(hkSel,hkSel))[hkSel]||[]).filter(e=>!off.has(e.k)), sd=new Date(hkSel+'T12:00');
  const lista=E.map(e=>e.k==='gk'?gkWierszHtml(e):`<div class="kal-it k-${e.k}${e.done?' done':''}">${e.tm?`<span class="kal-tm">${e.tm}</span>`:''}<span><i class="kal-dot"></i> ${esc(e.n)}<small>${esc(KAL_KAT[e.k]?KAL_KAT[e.k][0]:'')}${e.sub?' · '+esc(e.sub):''}</small></span>${e.kw?`<b class="${e.wpl?'plus':'minus'}">${e.wpl?'+':'−'}${kalZl(e.kw)}</b>`:''}</div>`).join('');
  return `<article class="widget hd-card hd-kal"><div class="w-head"><span class="label">Kalendarz</span>${gkStatusHtml()}<a class="w-sub hd-go" href="#kalendarz">Otwórz →</a></div>
    <div class="hk-body">
      <div class="hk-mies"><div class="hk-bar"><button type="button" class="kal-arr" data-hkm="-1" aria-label="Poprzedni miesiąc">‹</button><b>${esc(first.toLocaleDateString('pl-PL',{month:'long'}))} ${y}</b><button type="button" class="kal-arr" data-hkm="1" aria-label="Następny miesiąc">›</button>${hkM!==td.slice(0,7)||hkSel!==td?'<button type="button" class="td-btn" data-hkm="0">Dziś</button>':''}</div>
        <div class="hk-wd">${['Pn','Wt','Śr','Cz','Pt','So','Nd'].map(x=>`<span>${x}</span>`).join('')}</div><div class="hk-grid">${grid}</div></div>
      <div class="hk-dzien"><div class="hk-dt"><span class="label">${hkSel===td?'Dziś':esc(sd.toLocaleDateString('pl-PL',{weekday:'long'}))}</span><b>${esc(sd.toLocaleDateString('pl-PL',{day:'numeric',month:'long'}))}</b></div>
        <div class="hk-lista">${lista||'<p class="kal-pusto">Nic nie zaplanowano.</p>'}</div>
        <form class="hk-add"><input name="t" placeholder="${gkCel()==='gk'?'+ Nowe wydarzenie':'+ Nowe zadanie'}" aria-label="Nowe wydarzenie na wybrany dzień" autocomplete="off" maxlength="300"><input name="tm" type="time" aria-label="Godzina (puste = cały dzień)" title="Godzina (puste = cały dzień)"><button type="submit">Dodaj</button></form>
      </div>
    </div></article>`;
}

/* ——— kliknięcia i formularze (widżet + Kalendarz) ——— */
document.addEventListener('click', e=>{
  const del=e.target.closest('[data-gkdel]'); if(del){ const k=del.dataset.gkdel; if(gkPytUsun!==k){ gkPytUsun=k; gkPoZmianie(); setTimeout(()=>{ if(gkPytUsun===k){ gkPytUsun=''; gkPoZmianie(); } },4000); } else gkUsun(k); return; }
  const cel=e.target.closest('[data-kalcel]'); if(cel){ store.set('kalCel', cel.dataset.kalcel); gkPoZmianie(); const i=document.querySelector('form.kal-add input[name=t]'); i&&i.focus(); return; }
  if(!e.target.closest('.hd-kal')) return;
  const c=e.target.closest('[data-hkd]'); if(c){ hkSel=c.dataset.hkd; if(hkSel.slice(0,7)!==hkM) hkM=hkSel.slice(0,7); return homeRefresh(); }
  const n=e.target.closest('[data-hkm]'); if(n){ const v=+n.dataset.hkm; if(v) hkM=kalMies(hkM,v); else { hkM=todayISO().slice(0,7); hkSel=todayISO(); } return homeRefresh(); }
});
document.addEventListener('submit', e=>{
  const f=e.target; if(!f.matches('form.hk-add')) return; e.preventDefault();
  const v=f.t.value.trim(); if(!v) return;
  if(gkCel()==='gk') gkDodaj({n:v, d:hkSel, tm:f.tm.value||'', przyp:store.get('gkPrzyp','')});
  else if(typeof tdNorm==='function'){ const t=tdNorm(uid('t'),{t:v, l:'zadania', due:hkSel, tm:f.tm.value||'', c:Date.now()}); T.tasks=[t,...T.tasks]; saveTodo(); cloud(db=>db.collection('todo').doc(t.id).set(tdDoc(t))); }
  f.t.value=''; f.tm.value=''; homeRefresh(); const i=document.querySelector('form.hk-add input[name=t]'); i&&i.focus();
});
document.addEventListener('change', e=>{ if(e.target.matches('select.gk-przyp')) store.set('gkPrzyp', e.target.value); });
document.addEventListener('visibilitychange', ()=>{ if(document.visibilityState==='visible' && gkPolaczony()){ GKAL.t={}; gkPoZmianie(); gkWyslij(); } });
