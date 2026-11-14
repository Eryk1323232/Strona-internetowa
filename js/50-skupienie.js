/* ════════════════════════════════════════════════════════════════
   SKUPIENIE — licznik nauki (Pomodoro) w dolnym pasku
   Przycisk w pasku pokazuje czas do końca; klik otwiera okienko: start / pauza / pomiń / reset, długości (praca, przerwa,
   długa przerwa co N sesji), nad czym pracujesz (zadanie z To-Do), dzisiejsze sesje i minuty, ostatnie 7 dni.
   Stan (store 'skupStan') przechowuje znacznik końca — licznik przeżywa odświeżenie i zmianę podstrony.
   Statystyka: store 'skupDni' {RRRR-MM-DD: {n sesji, m minut}} + kolekcja 'cfg', dokument 'skupienie' (wspólna dla urządzeń).
   Koniec odcinka: dźwięk, powiadomienie systemowe (jeśli dozwolone), tytuł karty pokazuje czas.
   ════════════════════════════════════════════════════════════════ */
const foWczytaj = (k,d) => { try{ const v=JSON.parse(store.get(k,'null')); return v&&typeof v==='object'?v:d; }catch(e){ return d; } };
let FO = Object.assign({tryb:'stop', faza:'praca', koniec:0, zost:0, nr:0, co:''}, foWczytaj('skupStan',{}));
let FO_U = Object.assign({praca:25, przerwa:5, dluga:15, cykl:4}, foWczytaj('skupUst',{}));
let FO_D = foWczytaj('skupDni',{});
let foOtw=false, foTytul=document.title;
const foZapisz = () => store.set('skupStan', JSON.stringify(FO));
const foMin = f => (f==='praca'?FO_U.praca:f==='dluga'?FO_U.dluga:FO_U.przerwa);
const foZostalo = () => FO.tryb==='gra'?Math.max(0,FO.koniec-Date.now()):FO.tryb==='pauza'?FO.zost:foMin(FO.faza)*60000;
const foCzas = ms => { const s=Math.ceil(ms/1000); return String(Math.floor(s/60)).padStart(2,'0')+':'+String(s%60).padStart(2,'0'); };
const FO_NAZWA = {praca:'Skupienie', przerwa:'Przerwa', dluga:'Długa przerwa'};
function foZChmury(j){ try{ const v=JSON.parse(j); if(!v||typeof v!=='object') return; Object.entries(v).forEach(([d,x])=>{ const m=FO_D[d]; if(!m||(+x.n||0)>m.n) FO_D[d]={n:+x.n||0, m:+x.m||0}; }); store.set('skupDni', JSON.stringify(FO_D)); foRysuj(); }catch(e){} }
function foDzwiek(){ try{ const ac=new (window.AudioContext||window.webkitAudioContext)(); [880,1108,1320].forEach((f,i)=>{ const o=ac.createOscillator(), g=ac.createGain(), t=ac.currentTime+i*0.22; o.frequency.value=f; o.type='sine';
    g.gain.setValueAtTime(0.0001,t); g.gain.exponentialRampToValueAtTime(0.12,t+0.03); g.gain.exponentialRampToValueAtTime(0.0001,t+0.5); o.connect(g); g.connect(ac.destination); o.start(t); o.stop(t+0.55); }); }catch(e){} }
function foKoniecFazy(pominieto){
  const f=FO.faza;
  if(f==='praca' && !pominieto){ FO.nr++; const d=todayISO(), x=FO_D[d]||{n:0,m:0}; FO_D[d]={n:x.n+1, m:x.m+FO_U.praca};
    Object.keys(FO_D).sort().slice(0,-60).forEach(k=>delete FO_D[k]); store.set('skupDni', JSON.stringify(FO_D)); cloud(db=>db.collection('cfg').doc('skupienie').set({j:JSON.stringify(FO_D), u:Date.now()})); }
  FO.faza=f==='praca'?(FO.nr>0&&FO.nr%FO_U.cykl===0?'dluga':'przerwa'):'praca'; FO.tryb='stop'; FO.koniec=0; FO.zost=0; foZapisz();
  if(!pominieto){ foDzwiek(); const t=f==='praca'?`Koniec skupienia — czas na ${FO.faza==='dluga'?'długą ':''}przerwę (${foMin(FO.faza)} min)`:'Koniec przerwy — wracamy do pracy';
    try{ if('Notification' in window && Notification.permission==='granted') new Notification('Pracownia', {body:t, tag:'skupienie'}); }catch(e){}
    if(typeof snipToast==='function') snipToast(t); }
  foRysuj();
}
function foStart(){ if(FO.tryb==='gra') return; FO.koniec=Date.now()+foZostalo(); FO.tryb='gra'; foZapisz(); foRysuj();
  try{ if('Notification' in window && Notification.permission==='default') Notification.requestPermission(); }catch(e){} }
function foPauza(){ if(FO.tryb!=='gra') return; FO.zost=foZostalo(); FO.tryb='pauza'; foZapisz(); foRysuj(); }
function foReset(){ FO.tryb='stop'; FO.faza='praca'; FO.koniec=0; FO.zost=0; foZapisz(); foRysuj(); }
function foRysuj(){
  const b=$('#foBtn'); if(!b) return; const ms=foZostalo(), gra=FO.tryb==='gra';
  b.dataset.s=FO.tryb==='stop'?'stop':FO.faza==='praca'?'praca':'przerwa'; b.querySelector('span').textContent=FO.tryb==='stop'?'Skupienie':foCzas(ms)+(FO.tryb==='pauza'?' ⏸':'');
  document.title=gra?`${foCzas(ms)} · ${FO_NAZWA[FO.faza]}`:foTytul;
  const p=$('#foPop'); if(!foOtw){ p&&p.remove(); return; }
  const d=FO_D[todayISO()]||{n:0,m:0}, dni=Array.from({length:7},(_,i)=>isoAdd(todayISO(),i-6)), mx=Math.max(1,...dni.map(x=>(FO_D[x]||{}).m||0));
  const zad=(typeof T==='object'&&T.tasks)?T.tasks.filter(t=>!t.done).slice(0,40):[], calosc=foMin(FO.faza)*60000, pr=1-ms/calosc;
  const html=`<div class="fo-faza">${FO_NAZWA[FO.faza]}${FO.faza==='praca'?` · sesja ${FO.nr%FO_U.cykl+1}/${FO_U.cykl}`:''}</div>
    <div class="fo-kolo" style="--p:${Math.max(0,Math.min(1,pr))}"><b id="foCzas">${foCzas(ms)}</b></div>
    <div class="fo-btn"><button type="button" class="uk-btn uk-ok" data-fo="${gra?'pauza':'start'}">${gra?'Pauza':FO.tryb==='pauza'?'Wznów':'Start'}</button><button type="button" class="uk-btn" data-fo="pomin">Pomiń</button><button type="button" class="uk-btn uk-lnk" data-fo="reset">Reset</button></div>
    <label class="fo-co"><span class="label">Nad czym pracujesz?</span><select id="foCo"><option value="">— bez zadania —</option>${zad.map(t=>`<option${FO.co===t.t?' selected':''}>${esc(t.t)}</option>`).join('')}</select></label>
    <div class="fo-ust">${[['praca','Praca'],['przerwa','Przerwa'],['dluga','Długa'],['cykl','Co ile']].map(([k,n])=>`<label><span>${n}</span><input type="number" data-fou="${k}" min="1" max="${k==='cykl'?8:120}" value="${FO_U[k]}"></label>`).join('')}</div>
    <div class="fo-stat"><div><b>${d.n}</b> ${d.n===1?'sesja':'sesji'} dziś · <b>${d.m>=60?Math.floor(d.m/60)+' h '+(d.m%60)+' min':d.m+' min'}</b></div>
      <div class="fo-slupki" role="img" aria-label="Minuty skupienia z ostatnich 7 dni">${dni.map(x=>{ const m=(FO_D[x]||{}).m||0; return `<i title="${dPL(x)}: ${m} min" style="height:${Math.max(4,m/mx*100)}%"${x===todayISO()?' class="dzis"':''}></i>`; }).join('')}</div></div>`;
  if(p){ const a=document.activeElement; if(a&&p.contains(a)&&a.matches('input,select')){ const c=$('#foCzas'); if(c) c.textContent=foCzas(ms); p.querySelector('.fo-kolo').style.setProperty('--p',Math.max(0,Math.min(1,pr))); return; } p.innerHTML=html; return; }
  const n=document.createElement('div'); n.id='foPop'; n.className='fo-pop'; n.setAttribute('role','dialog'); n.setAttribute('aria-label','Licznik skupienia'); n.innerHTML=html; document.body.appendChild(n);
}
(function(){ const l=$('#sbar .sb-l'); if(!l || /[?&]widzet=1/.test(location.search)) return;
  l.insertAdjacentHTML('beforeend','<button type="button" class="fo-b" id="foBtn" data-s="stop" title="Licznik skupienia (Pomodoro)"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="13.5" r="7.5"/><path d="M12 9.5v4l2.500 1.500M9.500 3h5M12 3v3"/></svg><span>Skupienie</span></button>'.replace(/\.500/g,'.5'));
  if(FO.tryb==='gra' && FO.koniec<=Date.now()) foKoniecFazy(false);   /* skończyło się, gdy strona była zamknięta */
  foRysuj(); setInterval(()=>{ if(FO.tryb==='gra'){ if(Date.now()>=FO.koniec) foKoniecFazy(false); else foRysuj(); } }, 1000); })();
document.addEventListener('click', e=>{
  if(e.target.closest('#foBtn')){ foOtw=!foOtw; return foRysuj(); }
  const a=e.target.closest('[data-fo]'); if(a){ const c=a.dataset.fo; if(c==='start') foStart(); else if(c==='pauza') foPauza(); else if(c==='reset') foReset(); else if(c==='pomin') foKoniecFazy(true); return; }
  if(foOtw && !e.target.closest('#foPop')){ foOtw=false; foRysuj(); } });
document.addEventListener('change', e=>{ const t=e.target;
  if(t.id==='foCo'){ FO.co=t.value; foZapisz(); }
  if(t.dataset && t.dataset.fou){ const k=t.dataset.fou; FO_U[k]=Math.max(1,Math.min(k==='cykl'?8:120,Math.round(+t.value||1))); store.set('skupUst', JSON.stringify(FO_U)); t.blur(); foRysuj(); } });
document.addEventListener('keydown', e=>{ if(e.key==='Escape' && foOtw){ foOtw=false; foRysuj(); } });
