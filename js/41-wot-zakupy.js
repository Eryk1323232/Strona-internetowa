/* ════════════════════════════════════════════════════════════════════════
   WORLD OF TANKS → zakładka „Zakupy” (planowane zakupy w grze, odhaczanie, wykres wydatków)
   ════════════════════════════════════════════════════════════════════════
   WZ – pozycje (chmura: kolekcja „wotZakupy”):
     kat  'czolg' | 'magazyn' | 'premium' | 'zloto' | 'inne'   (WZ_KAT)
     n nazwa · nacja · tier (czołg) · cb cena bazowa za sztukę · r zniżka % · cz cena po zniżce za sztukę
     il ilość · w waluta 'zl' | 'gold' | 'kr' · done kupione · dk data kupna · c kolejność
   Czołg: wpisujesz cenę bazową i cenę po zniżce (zniżka % liczy się sama).
   Magazyn / premium / złoto / inne: cena, ilość, zniżka % → cena po zniżce = cena × (1 − zniżka), całość = po zniżce × ilość.
   Odhaczone trafiają do zwijanej sekcji „Kupione”; wykres kołowy (chowany przyciskiem) pokazuje
   wydane pieniądze wg kategorii, osobno dla każdej waluty.
   Panel wstawia wotPanel('zak') w js/04-world-of-tanks.js; synchronizacja w js/12-synchronizacja.js.
   ════════════════════════════════════════════════════════════════════════ */
const WZ_KAT = { czolg:['Czołg','#6C5CE7'], magazyn:['Magazyn','#18A999'], premium:['Konto premium','#E2A93B'], zloto:['Złoto','#D9A400'], inne:['Inne','#8E94AB'] };
const WZ_WAL = { zl:['zł','zł'], gold:['złoto','złota'], kr:['kredyty','kr'] };
const WZ_NACJE = ['ZSRR','Niemcy','USA','Wielka Brytania','Francja','Chiny','Japonia','Czechosłowacja','Szwecja','Polska','Włochy','Międzynarodowe'];
const WZ_TIERY = ['I','II','III','IV','V','VI','VII','VIII','IX','X','XI'];
const wzR = v => Math.round((+v||0)*100)/100;
const wzNorm = (id,v={}) => { const kat=WZ_KAT[v.kat]?v.kat:'inne', il=kat==='czolg'?1:Math.max(1,Math.round(+v.il||1)), cb=Math.max(0,wzR(v.cb));
  let r=Math.min(100,Math.max(0,+v.r||0)), cz=v.cz!=null&&v.cz!==''?Math.max(0,wzR(v.cz)):wzR(cb*(1-r/100));
  if(kat==='czolg'){ if(!(v.cz!=null&&v.cz!=='')) cz=cb; r=cb>0?Math.max(0,Math.round((1-cz/cb)*1000)/10):0; } else cz=wzR(cb*(1-r/100));
  return {id, kat, n:String(v.n||'').slice(0,80), nacja:String(v.nacja||''), tier:String(v.tier||''), cb, r, cz, il, w:WZ_WAL[v.w]?v.w:'zl', done:!!v.done, dk:String(v.dk||''), c:+v.c||0}; };
let WZ=[]; try{ const c=JSON.parse(store.get('wotZakupy','null')); if(Array.isArray(c)) WZ=c.map(x=>wzNorm(x.id,x)); }catch(e){}
const saveWz = () => store.set('wotZakupy', JSON.stringify(WZ));
const wzPush = x => cloud(db=>{ const {id,...v}=x; return db.collection('wotZakupy').doc(id).set(v); });
const wzDel = id => cloud(db=>db.collection('wotZakupy').doc(id).delete());
let wzKat = store.get('wzKat','czolg');
const wzSuma = x => wzR(x.cz*x.il);
const wzKw = (v,w) => w==='zl' ? fmt(v, Number.isInteger(v)?0:2)+' zł' : fmt(v,0)+' '+WZ_WAL[w][1];
const wzWalLast = k => store.get('wzWal_'+k, k==='magazyn'?'kr':'zl');

function wzFormHtml(){
  const k=wzKat, w=wzWalLast(k), walSel=`<label class="wz-f wz-fw"><span class="label">Waluta</span><select name="w">${Object.entries(WZ_WAL).map(([v,[n]])=>`<option value="${v}"${v===w?' selected':''}>${n}</option>`).join('')}</select></label>`;
  const pole=(name,lab,ph,cls='',typ='text')=>`<label class="wz-f ${cls}"><span class="label">${lab}</span><input name="${name}" ${typ==='num'?'inputmode="decimal"':''} placeholder="${ph}" autocomplete="off"></label>`;
  const pola = k==='czolg'
    ? `<label class="wz-f"><span class="label">Nacja</span><select name="nacja"><option value="">—</option>${WZ_NACJE.map(n=>`<option>${n}</option>`).join('')}</select></label>
       <label class="wz-f wz-fs"><span class="label">Tier</span><select name="tier"><option value="">—</option>${WZ_TIERY.map(t=>`<option>${t}</option>`).join('')}</select></label>
       ${pole('n','Nazwa','np. Progetto 46','wz-fn')}${pole('cb','Cena bazowa','0','wz-fp','num')}${pole('cz','Cena po zniżce','0','wz-fp','num')}${walSel}`
    : `${pole('n','Nazwa',k==='magazyn'?'np. Mała apteczka':k==='premium'?'np. 30 dni premium':k==='zloto'?'np. 2500 złota':'np. przepustka bojowa','wz-fn')}
       ${pole('cb','Cena (szt.)','0','wz-fp','num')}${pole('il','Ilość','1','wz-fs','num')}${pole('r','Zniżka %','0','wz-fs','num')}${walSel}`;
  return `<form class="wz-form" autocomplete="off"><div class="seg wz-kat" role="tablist">${Object.entries(WZ_KAT).map(([v,[n]])=>`<button type="button" data-wzkat="${v}" aria-selected="${v===k}">${n}</button>`).join('')}</div>
    <div class="wz-pola">${pola}</div>
    <div class="wz-fbot"><span class="wz-prev" id="wzPrev">Całość: —</span><span class="tr-err" id="wzErr"></span><button type="submit" class="wz-add">Dodaj do planu</button></div></form>`;
}
function wzWiersz(x){
  const sub = x.kat==='czolg' ? [x.nacja, x.tier&&'tier '+x.tier].filter(Boolean).join(' · ') : (x.il>1?`${x.il} × ${wzKw(x.cz,x.w)}`:'');
  return `<li class="wz-it${x.done?' done':''}"><label class="wz-chk"><input type="checkbox" class="sq wz-cb" data-id="${esc(x.id)}"${x.done?' checked':''} aria-label="Kupione"></label>
    <span class="wz-dot" style="background:${WZ_KAT[x.kat][1]}" title="${WZ_KAT[x.kat][0]}"></span>
    <div class="wz-b"><b>${esc(x.n||WZ_KAT[x.kat][0])}</b><small>${esc(WZ_KAT[x.kat][0])}${sub?' · '+esc(sub):''}${x.done&&x.dk?' · kupione '+esc(dPL(x.dk)):''}</small></div>
    <div class="wz-ceny">${x.r>0?`<s>${wzKw(wzR(x.cb*x.il),x.w)}</s><span class="wz-r">−${fmt(x.r, Number.isInteger(x.r)?0:1)}%</span>`:''}<b>${wzKw(wzSuma(x),x.w)}</b></div>
    <button type="button" class="del" data-wzdel="${esc(x.id)}" aria-label="Usuń">×</button></li>`;
}
/* wykres kołowy (donut) wydatków wg kategorii — dla jednej waluty */
function wzKolo(L, w){
  const S=Object.keys(WZ_KAT).map(k=>({k, v:wzR(L.filter(x=>x.kat===k&&x.w===w).reduce((a,x)=>a+wzSuma(x),0))})).filter(s=>s.v>0), tot=S.reduce((a,s)=>a+s.v,0);
  if(!tot) return '<p class="wz-pusto">Brak wydatków w tej walucie.</p>';
  const R=54, C=2*Math.PI*R; let off=0;
  const luki=S.map(s=>{ const dl=s.v/tot*C, gap=S.length>1?2:0, el=`<circle r="${R}" cx="70" cy="70" fill="none" stroke="${WZ_KAT[s.k][1]}" stroke-width="22" stroke-dasharray="${Math.max(0,dl-gap)} ${C}" stroke-dashoffset="${-off}" transform="rotate(-90 70 70)"><title>${WZ_KAT[s.k][0]}: ${wzKw(s.v,w)}</title></circle>`; off+=dl; return el; }).join('');
  return `<div class="wz-kolo"><svg viewBox="0 0 140 140" role="img" aria-label="Wydatki wg kategorii">${luki}<text x="70" y="66" text-anchor="middle" class="wz-kt">razem</text><text x="70" y="84" text-anchor="middle" class="wz-kv">${esc(wzKw(tot,w))}</text></svg>
    <ul class="wz-leg">${S.sort((a,b)=>b.v-a.v).map(s=>`<li><i style="background:${WZ_KAT[s.k][1]}"></i><span>${WZ_KAT[s.k][0]}</span><b>${wzKw(s.v,w)}</b><small>${fmt(s.v/tot*100,0)}%</small></li>`).join('')}</ul></div>`;
}
function wzHtml(){
  const plan=WZ.filter(x=>!x.done).sort((a,b)=>a.c-b.c), kup=WZ.filter(x=>x.done).sort((a,b)=>(b.dk||'').localeCompare(a.dk||'')||b.c-a.c);
  const wal=w=>L=>wzR(L.filter(x=>x.w===w).reduce((a,x)=>a+wzSuma(x),0));
  const sumy=L=>Object.keys(WZ_WAL).map(w=>[w,wal(w)(L)]).filter(([,v])=>v>0);
  const oszcz=sumy(WZ.map(x=>({...x, cz:wzR(x.cb-x.cz)})));
  const mies=todayISO().slice(0,7), kupM=kup.filter(x=>(x.dk||'').startsWith(mies));
  const kw=L=>L.length?L.map(([w,v])=>wzKw(v,w)).join('<br>'):'0 zł';
  const walKup=[...new Set(kup.map(x=>x.w))], wybW=walKup.includes(store.get('wzWykW',''))?store.get('wzWykW',''):walKup[0];
  const wyk=store.get('wzWyk','1')==='1', otw=store.get('wzKupOtw','0')==='1';
  return `<div class="wz">
    <div class="grid g4 px-cells wz-cells">
      <div class="cell"><span class="label">Do kupienia</span><span class="big wz-big">${kw(sumy(plan))}</span><p>${plan.length} ${plan.length===1?'pozycja':plan.length%10>=2&&plan.length%10<=4&&(plan.length%100<10||plan.length%100>=20)?'pozycje':'pozycji'}</p></div>
      <div class="cell"><span class="label">Kupione w tym miesiącu</span><span class="big wz-big">${kw(sumy(kupM))}</span><p>${kupM.length} · wszystkich kupionych: ${kup.length}</p></div>
      <div class="cell"><span class="label">Oszczędzone na zniżkach</span><span class="big wz-big bk-plus">${kw(oszcz)}</span><p>plan + kupione</p></div>
      <div class="cell"><span class="label">Wydane razem</span><span class="big wz-big">${kw(sumy(kup))}</span><p>od początku listy</p></div></div>
    ${wzFormHtml()}
    <h3 class="wz-h">Plan zakupów</h3>
    ${plan.length?`<ul class="wz-l">${plan.map(wzWiersz).join('')}</ul>`:'<p class="wz-pusto">Nic nie zaplanowano — dodaj pierwszą pozycję wyżej.</p>'}
    <details class="wz-kup" id="wzKup"${otw?' open':''}><summary><span>Kupione <b>${kup.length}</b></span><span class="wz-ksum">${sumy(kup).map(([w,v])=>wzKw(v,w)).join(' · ')||''}</span></summary>
      ${kup.length?`<ul class="wz-l">${kup.map(wzWiersz).join('')}</ul>`:'<p class="wz-pusto">Odhaczone zakupy pojawią się tutaj.</p>'}</details>
    <section class="wz-wyk"><div class="wz-wh"><h3 class="wz-h">Wydatki wg kategorii</h3>
      ${walKup.length>1&&wyk?`<div class="seg wz-wsel">${walKup.map(w=>`<button type="button" data-wzwykw="${w}" aria-selected="${w===wybW}">${WZ_WAL[w][0]}</button>`).join('')}</div>`:''}
      <button type="button" class="td-btn wz-wtog" data-wzwyk="1" aria-expanded="${wyk}">${wyk?'Ukryj wykres':'Pokaż wykres'}</button></div>
      ${wyk?(kup.length?wzKolo(kup,wybW):'<p class="wz-pusto">Wykres pokaże wydatki po odhaczeniu pierwszych zakupów.</p>'):''}</section></div>`;
}
function wzRefresh(){ if(typeof wotTab==='undefined'||wotTab!=='zak'||!$('#wotPanel')) return; const a=document.activeElement;
  if(a && a.closest && a.closest('.wz-form') && (a.value||a.tagName==='SELECT')) return; const y=scrollY; $('#wotPanel').innerHTML=wzHtml(); scrollTo(0,y); }
function wzSet(id,patch){ const x=WZ.find(y=>y.id===id); if(!x) return; const n=wzNorm(id,{...x,...patch}); WZ=WZ.map(y=>y.id===id?n:y); saveWz(); wzPush(n); }

/* podgląd w formularzu: zniżka / cena po zniżce / całość */
function wzPodglad(f){
  const v=n=>{ const e=f.elements[n]; return e?bkNum(e.value||''):NaN; }, w=f.elements.w.value, out=$('#wzPrev'); if(!out) return;
  const cb=v('cb'); if(isNaN(cb)||!f.elements.cb.value){ out.textContent='Całość: —'; return; }
  if(wzKat==='czolg'){ const cz=f.elements.cz.value?v('cz'):cb; out.innerHTML=`Zniżka: <b>${cb>0?fmt(Math.max(0,(1-cz/cb)*100),0):0}%</b> · Całość: <b>${wzKw(wzR(cz),w)}</b>`; return; }
  const il=Math.max(1,Math.round(f.elements.il.value?v('il'):1)), r=f.elements.r.value?Math.min(100,v('r')):0, cz=wzR(cb*(1-(r||0)/100));
  out.innerHTML=`Po zniżce: <b>${wzKw(cz,w)}</b> / szt. · Całość: <b>${wzKw(wzR(cz*il),w)}</b>`;
}
document.addEventListener('input', e=>{ const f=e.target.closest&&e.target.closest('.wz-form'); if(f) wzPodglad(f); });
document.addEventListener('change', e=>{
  const f=e.target.closest&&e.target.closest('.wz-form'); if(f){ if(e.target.name==='w') store.set('wzWal_'+wzKat, e.target.value); wzPodglad(f); return; }
  if(e.target.matches && e.target.matches('.wz-cb')){ const on=e.target.checked; wzSet(e.target.dataset.id,{done:on, dk:on?todayISO():''}); const li=e.target.closest('.wz-it'); if(li) li.classList.toggle('done',on); setTimeout(wzRefresh, 350); }
});
document.addEventListener('toggle', e=>{ if(e.target.id==='wzKup') store.set('wzKupOtw', e.target.open?'1':'0'); }, true);
document.addEventListener('click', e=>{
  if(!e.target.closest || !e.target.closest('.wz')) return;
  const k=e.target.closest('[data-wzkat]'); if(k){ wzKat=k.dataset.wzkat; store.set('wzKat',wzKat); const f=$('.wz-form'); if(f) f.outerHTML=wzFormHtml(); const n=$('.wz-form [name=n]'); n&&n.focus(); return; }
  const d=e.target.closest('[data-wzdel]'); if(d){ const id=d.dataset.wzdel; if(!d.dataset.pewne){ d.dataset.pewne='1'; d.textContent='Usunąć?'; d.classList.add('armed'); setTimeout(()=>{ if(d.isConnected){ delete d.dataset.pewne; d.textContent='×'; d.classList.remove('armed'); } },2500); return; }
    WZ=WZ.filter(x=>x.id!==id); saveWz(); wzDel(id); return wzRefresh(); }
  if(e.target.closest('[data-wzwyk]')){ store.set('wzWyk', store.get('wzWyk','1')==='1'?'0':'1'); return wzRefresh(); }
  const ww=e.target.closest('[data-wzwykw]'); if(ww){ store.set('wzWykW', ww.dataset.wzwykw); return wzRefresh(); }
});
document.addEventListener('submit', e=>{
  const f=e.target; if(!f.matches('.wz-form')) return; e.preventDefault();
  const g=n=>f.elements[n]?f.elements[n].value.trim():'', err=t=>{ const x=$('#wzErr'); if(x) x.textContent=t; };
  const cb=bkNum(g('cb')); if(!g('cb')||isNaN(cb)||cb<0) return err('Wpisz cenę.');
  if(!g('n') && wzKat==='czolg') return err('Wpisz nazwę czołgu.');
  const v={kat:wzKat, n:g('n'), cb, w:g('w')||'zl', c:Date.now()};
  if(wzKat==='czolg'){ const cz=g('cz')?bkNum(g('cz')):cb; if(isNaN(cz)||cz<0) return err('Zła cena po zniżce.'); if(cz>cb) return err('Cena po zniżce jest wyższa niż bazowa.'); Object.assign(v,{nacja:g('nacja'), tier:g('tier'), cz}); }
  else { const il=g('il')?Math.round(bkNum(g('il'))):1, r=g('r')?bkNum(g('r')):0; if(isNaN(il)||il<1) return err('Ilość musi być co najmniej 1.'); if(isNaN(r)||r<0||r>100) return err('Zniżka od 0 do 100%.'); Object.assign(v,{il, r}); }
  const x=wzNorm(uid('wz'), v); WZ=[...WZ,x]; saveWz(); wzPush(x);
  const y=scrollY; $('#wotPanel').innerHTML=wzHtml(); scrollTo(0,y); const n=$('.wz-form [name=n]'); n&&n.focus();
});
