/* ════════════════════════════════════════════════════════════════════════
   SUBSKRYPCJE (INNE)
   ════════════════════════════════════════════════════════════════════════
   SUB        – lista subskrypcji (chmura: kolekcja „subskrypcje”, kopia w przeglądarce).
   Jedna subskrypcja:
     n    nazwa            p    cena za okres (można wpisać działanie, np. 49,99-10)
     co   co ile (liczba)  j    jednostka: d dni · t tygodnie · m miesiące · r lata
     od   data pierwszej płatności (od niej liczą się kolejne płatności)
     tryb auto = odnawia się sama · reczne = trzeba opłacić ręcznie · anul = anulowana
     do   (dla anulowanej) dzień, w którym przestaje działać
     pl   sposób płatności (karta, BLIK, PayPal, Google Play…)
     przerwy  [{od, do}] — przerwy w płaceniu; do='' = przerwa trwa. Po przerwie płatności
              liczą się od nowa od dnia wznowienia (tak działa większość serwisów).
   subCalc()  – następna płatność, ile dni zostało, koszt miesięczny, ile już wydano.
   Wygląd i obsługa wzorowane na Posiadówkach (tabela z polami do edycji w miejscu).
   ════════════════════════════════════════════════════════════════════════ */

const SUB_J = {d:['dzień','dni','dni'], t:['tydzień','tygodnie','tygodni'], m:['miesiąc','miesiące','miesięcy'], r:['rok','lata','lat']};
const SUB_TRYB = {auto:'Automatycznie', reczne:'Ręcznie', anul:'Anulowana'};
const subNorm = (id,v={}) => ({id, n:String(v.n||'Subskrypcja'), p:String(v.p??'0'), co:Math.max(1,Math.round(+v.co||1)), j:SUB_J[v.j]?v.j:'m',
  od:/^\d{4}-\d{2}-\d{2}$/.test(v.od)?v.od:todayISO(), tryb:SUB_TRYB[v.tryb]?v.tryb:'auto', do:/^\d{4}-\d{2}-\d{2}$/.test(v.do)?v.do:'', pl:String(v.pl||''), o:+v.o||0,
  przerwy:(Array.isArray(v.przerwy)?v.przerwy:[]).map(x=>({od:String(x&&x.od||''), do:String(x&&x.do||'')})).filter(x=>/^\d{4}-\d{2}-\d{2}$/.test(x.od)&&(!x.do||/^\d{4}-\d{2}-\d{2}$/.test(x.do))).sort((a,b)=>a.od.localeCompare(b.od))});
const subPauza = s => s.przerwy.find(x=>!x.do);   /* trwająca przerwa albo undefined */
let SUB = [];
try{ const c=JSON.parse(store.get('subState','null')); if(Array.isArray(c)) SUB=c.map(s=>subNorm(s.id,s)); }catch(e){}
const saveSub = () => store.set('subState', JSON.stringify(SUB));
const subPush = s => { const {id,...d}=s; cloud(db=>db.collection('subskrypcje').doc(id).set(d)); };

/* ——— daty ——— */
const subD = iso => { const [y,m,d]=iso.split('-').map(Number); return new Date(y,m-1,d); };
const subISO = dt => `${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,'0')}-${String(dt.getDate()).padStart(2,'0')}`;
/* k-ta płatność od startu (0 = pierwsza); miesiące i lata pilnują końca miesiąca (31.01 → 28.02) */
function subNth(s,k,start){ const st=subD(start||s.od), n=s.co*k;
  if(s.j==='d'||s.j==='t'){ const x=new Date(st); x.setDate(x.getDate()+n*(s.j==='t'?7:1)); return x; }
  const mies=s.j==='r'?n*12:n, y=st.getFullYear()+Math.floor((st.getMonth()+mies)/12), m=(st.getMonth()+mies)%12;
  return new Date(y, m, Math.min(st.getDate(), new Date(y,m+1,0).getDate())); }
const subDni = dt => { const t=new Date(); t.setHours(0,0,0,0); return Math.round((dt-t)/864e5); };
const subMies = s => { const p=pxEval(s.p), c=isNaN(p)?0:p; return s.j==='m'?c/s.co : s.j==='r'?c/(12*s.co) : s.j==='t'?c*52/12/s.co : c*365/12/s.co; };
const subOkres = s => s.co===1 ? `co ${SUB_J[s.j][0]}` : `co ${s.co} ${SUB_J[s.j][s.co<5?1:2]}`;
const subDniTxt = n => n===0?'dziś':n===1?'jutro':n===-1?'wczoraj':n>0?`za ${n} dni`:`${-n} dni temu`;

function subCalc(s){
  const t=new Date(); t.setHours(0,0,0,0);
  const koniec = s.tryb==='anul' && s.do ? subD(s.do) : null;
  let ile=0, nast=null; const cena=pxEval(s.p), c=isNaN(cena)?0:cena;
  /* okresy płacenia: od startu do pierwszej przerwy, od wznowienia do kolejnej przerwy… aż do dziś (u anulowanej — do końca) */
  let start=s.od, pauza=null;
  const odcinki=[];
  for(const p of s.przerwy){ if(p.od<start) { if(p.do && p.do>start) start=p.do; continue; }
    odcinki.push([start, p.od]); if(!p.do){ pauza=p; start=null; break; } start=p.do; }
  if(start) odcinki.push([start, null]);
  odcinki.forEach(([a,b],i)=>{ const kon=b?subD(b):null, ostatni=i===odcinki.length-1&&!pauza;
    for(let k=0;k<5000;k++){ const dt=subNth(s,k,a);
      if((kon&&dt>=kon) || (koniec&&dt>=koniec)) break;
      if(dt>t){ if(ostatni) nast=dt; break; }
      ile++; } });
  const aktywna = !(koniec && koniec<=t);
  return {nast, dni:nast?subDni(nast):null, koniec, dniKoniec:koniec?subDni(koniec):null, aktywna, pauza, wyd:ile*c, platnosci:ile,
    mies:aktywna&&s.tryb!=='anul'&&!pauza?subMies(s):0, bad:isNaN(cena)};
}

let subFiltr = store.get('subFiltr','akt');   /* akt = aktywne, wszystkie */
function subHtml(){
  const L=SUB.map(s=>({s, c:subCalc(s)}));
  const akt=L.filter(x=>x.c.aktywna);
  const mies=akt.reduce((a,x)=>a+x.c.mies,0), wyd=L.reduce((a,x)=>a+x.c.wyd,0);
  const najbl=akt.filter(x=>x.c.nast).sort((a,b)=>a.c.nast-b.c.nast)[0];
  const cells=`<div class="grid g4 px-cells sub-cells">
      <div class="cell"><span class="label">Miesięcznie</span><span class="big">${fmt(mies,2)}<small>zł</small></span><p>${akt.filter(x=>x.s.tryb!=='anul'&&!x.c.pauza).length} płatnych${akt.some(x=>x.c.pauza)?` · ${akt.filter(x=>x.c.pauza).length} w przerwie`:''}</p></div>
      <div class="cell"><span class="label">Rocznie</span><span class="big">${fmt(mies*12,2)}<small>zł</small></span><p>przy obecnych cenach</p></div>
      <div class="cell"><span class="label">Wydane łącznie</span><span class="big">${fmt(wyd,2)}<small>zł</small></span><p>${L.reduce((a,x)=>a+x.c.platnosci,0)} płatności</p></div>
      <div class="cell"><span class="label">Najbliższa płatność</span><span class="big px-name">${najbl?esc(najbl.s.n):'—'}</span><p>${najbl?`${dPL(subISO(najbl.c.nast))} · ${subDniTxt(najbl.c.dni)} · ${pxZl(pxEval(najbl.s.p)||0)}`:'brak zaplanowanych'}</p></div></div>`;

  /* nadchodzące: najbliższe 30 dni + kończące się anulowane */
  const nad=[];
  akt.forEach(({s,c})=>{ if(c.nast && c.dni<=30) nad.push({s, dt:c.nast, dni:c.dni, typ:s.tryb==='reczne'?'zapłać':'odnowi się'});
    if(c.koniec && c.dniKoniec>=0 && c.dniKoniec<=30) nad.push({s, dt:c.koniec, dni:c.dniKoniec, typ:'wygasa'}); });
  nad.sort((a,b)=>a.dt-b.dt);
  const upcoming=nad.length?`<div class="px-settle sub-next">${nad.map(x=>`<div class="px-row sub-row${x.dni<=3?' pilne':''}${x.typ==='wygasa'?' wyg':''}">
      <span class="sub-date"><b>${x.dt.getDate()}</b>${x.dt.toLocaleDateString('pl-PL',{month:'short'})}</span>
      <span class="px-who"><b>${esc(x.s.n)}</b>${x.s.pl?` · ${esc(x.s.pl)}`:''}</span><span class="px-amt">${x.typ==='wygasa'?'—':pxZl(pxEval(x.s.p)||0)}</span>
      <span class="px-st">${x.typ} ${subDniTxt(x.dni)}</span></div>`).join('')}</div>`
    :'<p class="nt-none">W ciągu 30 dni nic się nie odnawia.</p>';

  const k=(id,f)=>esc(id+'|'+f);
  const rows=L.filter(x=>subFiltr==='wsz'||x.c.aktywna).sort((a,b)=>(b.c.aktywna-a.c.aktywna)||((a.c.nast||a.c.koniec||(a.c.pauza?9e15:0))-(b.c.nast||b.c.koniec||(b.c.pauza?9e15:0)))).map(({s,c})=>{
    const termin = s.tryb==='anul'
      ? `<input type="date" class="g-in g-date" data-sk="${k(s.id,'do')}" value="${esc(s.do)}" aria-label="Działa do">`
      : c.pauza ? '<b class="sub-pz">przerwa</b>' : (c.nast?`<b>${dPL(subISO(c.nast))}</b>`:'—');
    const kiedy = s.tryb==='anul' ? (c.koniec?(c.aktywna?`wygasa ${subDniTxt(c.dniKoniec)}`:'wygasła'):'ustaw datę końca') : c.pauza ? 'nic nie płacisz' : (c.nast?subDniTxt(c.dni):'');
    const status = !c.aktywna ? '<span class="sub-st off">Zakończona</span>'
      : `<button type="button" class="sub-st ${c.pauza?'pz':'on'}" data-sbp="${esc(s.id)}" aria-pressed="${!c.pauza}" title="${c.pauza?'Kliknij, gdy znowu zaczniesz płacić':'Kliknij, gdy robisz przerwę w płaceniu'}">${c.pauza?'Przerwa':'Aktywna'}</button>`
        + (c.pauza?`<input type="date" class="g-in g-date sub-pzod" data-sk="${k(s.id,'pod')}" value="${esc(c.pauza.od)}" aria-label="Przerwa od">`:'')
        + (s.przerwy.length&&!c.pauza?`<small>${s.przerwy.length} ${s.przerwy.length===1?'przerwa':s.przerwy.length<5?'przerwy':'przerw'} wcześniej</small>`:'');
    const pilne = c.aktywna && ((s.tryb!=='anul'&&c.dni!=null&&c.dni<=3) || (s.tryb==='anul'&&c.dniKoniec!=null&&c.dniKoniec>=0&&c.dniKoniec<=7));
    return `<tr class="${c.aktywna?'':'sub-off'}${pilne?' sub-pilne':''}${c.pauza?' sub-pauza':''}">
      <td class="px-prod"><input class="g-in g-txt sub-name" data-sk="${k(s.id,'n')}" value="${esc(s.n)}" aria-label="Nazwa subskrypcji" maxlength="60"></td>
      <td class="n"><input class="g-in g-num px-price${c.bad?' bad':''}" data-sk="${k(s.id,'p')}" value="${esc(String(s.p).replace(/\./g,','))}" aria-label="Cena za okres"></td>
      <td class="sub-co"><span class="sub-cow">co <input class="g-in g-num g-q" inputmode="numeric" data-sk="${k(s.id,'co')}" value="${s.co}" aria-label="Co ile">
        <select class="td-sel sub-sel" data-sk="${k(s.id,'j')}" aria-label="Jednostka">${Object.entries(SUB_J).map(([v,w])=>`<option value="${v}"${v===s.j?' selected':''}>${s.co===1?w[0]:w[s.co<5?1:2]}</option>`).join('')}</select></span></td>
 <td class="sub-stc">${status}</td>
      <td><select class="td-sel sub-sel sub-tryb t-${s.tryb}" data-sk="${k(s.id,'tryb')}" aria-label="Sposób odnawiania">${Object.entries(SUB_TRYB).map(([v,w])=>`<option value="${v}"${v===s.tryb?' selected':''}>${w}</option>`).join('')}</select></td>
      <td><input class="g-in g-txt sub-pl" data-sk="${k(s.id,'pl')}" value="${esc(s.pl)}" placeholder="karta, BLIK…" list="subPlList" aria-label="Sposób płatności" maxlength="40"></td>
      <td><input type="date" class="g-in g-date" data-sk="${k(s.id,'od')}" value="${esc(s.od)}" aria-label="Pierwsza płatność"></td>
      <td class="sub-term">${termin}<small>${kiedy}</small></td>
      <td class="n px-calc">${c.mies?fmt(c.mies,2):'—'}</td>
      <td class="n px-calc px-share">${fmt(c.wyd,2)}<small>${c.platnosci}×</small></td>
      <td class="n"><button type="button" class="g-del" data-sbdel="${esc(s.id)}" aria-label="Usuń subskrypcję">×</button></td></tr>`; }).join('');
  const add=`<tr class="px-add"><td colspan="11"><form class="sub-add"><input name="n" placeholder="+ Subskrypcja, np. Spotify" aria-label="Nazwa nowej subskrypcji" autocomplete="off" required>
      <input name="p" placeholder="Cena" inputmode="decimal" aria-label="Cena" autocomplete="off" required>
      <select name="j" class="td-sel sub-sel" aria-label="Co ile"><option value="m">co miesiąc</option><option value="r">co rok</option><option value="t">co tydzień</option></select>
      <input name="od" type="date" value="${todayISO()}" aria-label="Pierwsza płatność">
      <button type="submit">Dodaj</button></form></td></tr>`;
  const ileOff=L.length-akt.length;
  const table=`<div class="sub-bar"><div class="seg" role="tablist"><button type="button" data-sbf="akt" aria-selected="${subFiltr!=='wsz'}">Aktywne</button><button type="button" data-sbf="wsz" aria-selected="${subFiltr==='wsz'}">Wszystkie${ileOff?` <span class="ct">${ileOff} zakończone</span>`:''}</button></div></div>
    <div class="tbl-wrap px-wrap"><table class="px-t sub-t"><thead><tr><th>Subskrypcja</th><th class="n">Cena</th><th>Odnawia się</th><th>Status</th><th>Odnawianie</th><th>Płatność</th><th>Od</th><th>Następna płatność</th><th class="n">Miesięcznie</th><th class="n">Wydano</th><th></th></tr></thead>
    <tbody>${rows}${add}</tbody>
    <tfoot><tr class="px-sum"><td colspan="8">Razem</td><td class="n">${fmt(mies,2)}</td><td class="n">${fmt(wyd,2)}</td><td></td></tr></tfoot></table></div>
    <datalist id="subPlList">${['Karta','BLIK','PayPal','Google Play','App Store','Przelew','Apple Pay','Google Pay'].map(x=>`<option value="${x}">`).join('')}</datalist>`;
  return `${cells}
    <section class="block"><div class="block-head"><h2>Nadchodzące</h2></div>${upcoming}</section>
    <section class="block"><div class="block-head"><h2>Moje subskrypcje</h2></div>${table}</section>`;
}
function subRefresh(){
  const box=$('#subApp'); if(!box) return;
  const a=document.activeElement, key=a&&a.dataset&&a.dataset.sk, inAdd=a&&a.closest&&a.closest('form.sub-add'), fname=inAdd&&a.name;
  const y=window.scrollY; box.innerHTML=subHtml(); window.scrollTo(0,y);
  if(key){ const el=box.querySelector(`[data-sk="${CSS.escape(key)}"]`); if(el){ el.focus(); el.select&&el.type==='text'&&el.select(); } }
  else if(inAdd){ const el=box.querySelector(`form.sub-add [name="${fname}"]`); el&&el.focus(); }
}
function pSub(){ return `<h1>Subskryp<span class="acc">cje</span></h1><div id="subApp">${subHtml()}</div>`; }
function subUpdate(id, fn){ const s=SUB.find(x=>x.id===id); if(!s) return; const ns={...s}; fn(ns); const fixed=subNorm(id,ns); SUB=SUB.map(x=>x.id===id?fixed:x); saveSub(); subRefresh(); subPush(fixed); }

document.addEventListener('submit', e=>{
  const f=e.target; if(!f.matches('form.sub-add')) return; e.preventDefault();
  const n=f.n.value.trim(), pr=pxEval(f.p.value); if(!n||isNaN(pr)){ (n?f.p:f.n).focus(); return; }
  const s=subNorm(uid('sb'),{n, p:String(f.p.value).replace(/,/g,'.').replace(/\s+/g,''), co:1, j:f.j.value, od:f.od.value||todayISO(), tryb:'auto', o:Date.now()});
  SUB=[...SUB,s]; saveSub(); subRefresh(); subPush(s);
  setTimeout(()=>{ const i=$('form.sub-add [name="n"]'); i&&i.focus(); },0);
});
document.addEventListener('change', e=>{
  const el=e.target, key=el.dataset&&el.dataset.sk; if(!key) return;
  const [id,f]=key.split('|'); let v=el.value;
  setTimeout(()=>subUpdate(id, s=>{
    if(f==='n'){ v=v.trim(); if(v) s.n=v; }
    else if(f==='p'){ if(!isNaN(pxEval(v))) s.p=String(v).replace(/,/g,'.').replace(/\s+/g,'')||'0'; }
    else if(f==='co'){ const x=pxEval(v); if(!isNaN(x)&&x>=1) s.co=Math.round(x); }
    else if(f==='tryb'){ /* anulowanie: subskrypcja działa do końca opłaconego okresu */
      if(v==='anul' && s.tryb!=='anul' && !s.do){ const c=subCalc(s); s.do=c.nast?subISO(c.nast):todayISO(); }
      s.tryb=v; }
    else if(f==='pl'){ s.pl=v.trim(); }
    else if(f==='od'||f==='do'||f==='j'){ s[f]=v; }
    else if(f==='pod'){ const p=subPauza(s); if(p&&v) p.od=v; }
  }),0);
});
document.addEventListener('keydown', e=>{ if(e.key==='Enter' && e.target.matches && e.target.matches('input[data-sk]')){ e.preventDefault(); e.target.blur(); } });
document.addEventListener('click', e=>{
  const pb=e.target.closest('[data-sbp]');
  if(pb){ return subUpdate(pb.dataset.sbp, s=>{ const p=subPauza(s), dzis=todayISO();
    if(p){ if(p.od>=dzis) s.przerwy=s.przerwy.filter(x=>x!==p); else p.do=dzis; }   /* wznowienie (przerwa od dziś = pomyłka → usuń) */
    else s.przerwy=[...s.przerwy, {od:dzis, do:''}]; }); }
  const fb=e.target.closest('[data-sbf]'); if(fb){ subFiltr=fb.dataset.sbf; store.set('subFiltr',subFiltr); return subRefresh(); }
  const b=e.target.closest('[data-sbdel]'); if(!b) return;
  if(!b.dataset.sbarm){ b.dataset.sbarm='1'; b.textContent='Usuń?'; b.classList.add('armed');
    setTimeout(()=>{ if(b.isConnected){ delete b.dataset.sbarm; b.textContent='×'; b.classList.remove('armed'); } },3000); return; }
  const id=b.dataset.sbdel; SUB=SUB.filter(x=>x.id!==id); saveSub(); subRefresh(); cloud(db=>db.collection('subskrypcje').doc(id).delete());
});
setInterval(()=>{ if($('#subApp') && !(document.activeElement&&document.activeElement.closest&&document.activeElement.closest('#subApp'))) subRefresh(); }, 60*60e3);   /* „za X dni” aktualne po północy */
