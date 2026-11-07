/* ════════════════════════════════════════════════════════════════════════
   POSIADÓWKI (INNE)
   ════════════════════════════════════════════════════════════════════════
   PX       – lista posiadówek: uczestnicy (people), produkty (items: cena, ilość, kto brał).
   pxCalc() – liczy: koszt na osobę, sumy, ile kto oddaje płacącemu.
   pxEval() – pozwala wpisać w cenie działanie, np. 4,95+9,49.
   ════════════════════════════════════════════════════════════════════════ */

/* ——— POSIADÓWKI: jedna osoba płaci, reszta oddaje swoją część (chmura przez db, kopia w przeglądarce) ——— */
const pxEval = v => { let x=String(v??'').replace(/,/g,'.').replace(/\s+/g,''); if(!x) return 0; if(!/^[\d+\-*/().]+$/.test(x)) return NaN;
  try{ const r=Function('"use strict";return ('+x+')')(); return isFinite(r)?r:NaN; }catch(e){ return NaN; } };
const pxDef = () => { const P=['Dmochu','Adaś','Barry','Michał','Eryk'].map((n,i)=>({id:'xq-'+i, n, adj:[-5,-5,0,15,-5][i], paid:false}));
  const on=m=>P.filter((p,i)=>m[i]).map(p=>p.id);
  const I=[['Pepsi','10.15',2,6.72,[1,1,1,1,1]],['Zatecky','4.69',3,0,[0,0,0,0,1]],['Łomża','3.99',4,0,[0,0,1,0,0]],['Jager','57.99',1,0,[1,1,0,0,0]],['Monster','5.99',3,0,[1,1,0,0,1]],
    ['Woda','2.89',2,0,[1,1,1,1,1]],['Chipsy','4.95+9.49',1,0,[1,1,1,1,1]],['Mirinda','10.15',1,0,[1,1,1,1,1]],['Koncentrat','19.99',1,0,[1,1,1,1,1]],['Reklamówka','0.65',1,0,[1,1,1,1,1]]]
    .map((r,i)=>({id:'xi-'+i, n:r[0], p:r[1], q:r[2], disc:r[3], on:on(r[4])}));
  return [{id:'xpo-1', n:'Domówka', d:'2026-07-02', payer:'xq-4', o:0, people:P, items:I}]; };
const pxNorm = (id,v={}) => { const people=(Array.isArray(v.people)?v.people:[]).map(p=>({id:String(p.id), n:String(p.n||''), adj:+p.adj||0, paid:!!p.paid}));
  const ids=new Set(people.map(p=>p.id));
  return {id, n:String(v.n||'Posiadówka'), d:String(v.d||''), payer:ids.has(v.payer)?String(v.payer):(people[people.length-1]||{}).id||'', o:+v.o||0, people,
    items:(Array.isArray(v.items)?v.items:[]).map(i=>{ let p=String(i.p??'0'), q=+i.q||0, disc=+i.disc||0; if(disc>0&&q>0){ p=`${/[+\-*/]/.test(p)?'('+p+')':p}-${Math.round(disc/q*10000)/10000}`; disc=0; } return {id:String(i.id), n:String(i.n||''), p, q, disc, on:(Array.isArray(i.on)?i.on:[]).map(String).filter(x=>ids.has(x))}; })}; };
let PX = pxDef().map(e=>pxNorm(e.id,e));
try{ const c=JSON.parse(store.get('posState','null')); if(Array.isArray(c)&&c.length) PX=c.map(e=>pxNorm(e.id,e)); }catch(e){}
let pxSel = store.get('posSel','');
const savePos = () => store.set('posState', JSON.stringify(PX));
const pxList = () => PX.slice().sort((a,b)=>(b.d||'').localeCompare(a.d||'')||(b.o-a.o));
const pxCur = () => PX.find(e=>e.id===pxSel) || pxList()[0];
const pxPush = e => { const {id,...d}=e; cloud(db=>db.collection('posiadowki').doc(id).set(d)); };
function pxUpdate(eid, fn){ const e=PX.find(x=>x.id===eid); if(!e) return; const ne=pxNorm(e.id, JSON.parse(JSON.stringify(e))); fn(ne); const fixed=pxNorm(ne.id,ne); PX=PX.map(x=>x.id===eid?fixed:x); savePos(); pxRefresh(); pxPush(fixed); }
function pxCalc(e){
  const tot={}; e.people.forEach(p=>tot[p.id]=0);
  let spent=0, unassigned=0;
  const rows=e.items.map(i=>{ const pr=pxEval(i.p), cost=(isNaN(pr)?0:pr)*i.q - i.disc, n=i.on.length, share=n?cost/n:0;
    spent+=cost; if(!n) unassigned+=cost; i.on.forEach(id=>{ if(id in tot) tot[id]+=share; }); return {cost, n, share, bad:isNaN(pr)}; });
  e.people.forEach(p=>tot[p.id]+=p.adj);
  const owe=e.people.filter(p=>p.id!==e.payer).reduce((a,p)=>a+Math.max(0,tot[p.id]),0);
  const back=e.people.filter(p=>p.id!==e.payer && !p.paid).reduce((a,p)=>a+Math.max(0,tot[p.id]),0);
  return {rows, tot, spent, unassigned, owe, back};
}
const pxZl = v => fmt(v,2)+' zł';
function posHtml(){
  const cur=pxCur();
  const tabs=`<div class="ptabs" role="tablist">${pxList().map(e=>`<button type="button" role="tab" data-pxsel="${esc(e.id)}" aria-selected="${cur&&e.id===cur.id}">${esc(e.n)}${e.d?`<span class="ct">${dPL(e.d)}</span>`:''}</button>`).join('')}
    <form class="px-new"><input name="n" placeholder="+ Nowa posiadówka" aria-label="Nazwa nowej posiadówki" autocomplete="off" maxlength="60"></form></div>`;
  if(!cur) return tabs+'<div class="nt-blank"><p>Brak posiadówek. Wpisz nazwę w polu „+ Nowa posiadówka”.</p></div>';
  const E=cur.id, c=pxCalc(cur), P=cur.people, payer=P.find(p=>p.id===cur.payer);
  const k=(...a)=>esc([E,...a].join('|'));
  const head=`<div class="px-head">
      <input class="pl-in pl-pname" data-xk="${k('e','','n')}" value="${esc(cur.n)}" aria-label="Nazwa posiadówki" maxlength="60">
      <label class="px-f"><span class="label">Data</span><input type="date" class="g-in g-date" data-xk="${k('e','','d')}" value="${esc(cur.d)}"></label>
      <label class="px-f"><span class="label">Płacił</span><select class="td-sel px-payer" data-xk="${k('e','','payer')}">${P.map(p=>`<option value="${esc(p.id)}"${p.id===cur.payer?' selected':''}>${esc(p.n)}</option>`).join('')}</select></label>
      <button type="button" class="td-btn" data-xact="delev" data-eid="${esc(E)}">Usuń posiadówkę</button></div>`;
  const cells=`<div class="grid g4 px-cells">
      <div class="cell"><span class="label">Wydane razem</span><span class="big">${fmt(c.spent,2)}<small>zł</small></span><p>${cur.items.length} pozycji</p></div>
      <div class="cell"><span class="label">Płacił</span><span class="big px-name">${payer?esc(payer.n):'—'}</span><p>${payer?'jego część: '+pxZl(c.tot[payer.id]||0):'wybierz osobę'}</p></div>
      <div class="cell"><span class="label">Do oddania</span><span class="big">${fmt(c.owe,2)}<small>zł</small></span><p>od ${P.filter(p=>p.id!==cur.payer).length} osób</p></div>
      <div class="cell"><span class="label">Jeszcze nie oddane</span><span class="big">${fmt(c.back,2)}<small>zł</small></span><p>${c.back>0.004?P.filter(p=>p.id!==cur.payer&&!p.paid&&c.tot[p.id]>0.004).length+' os. zalega':'wszyscy rozliczeni'}</p></div></div>`;
  const ph=P.map(p=>`<th class="px-p${p.id===cur.payer?' payer':''}"><button type="button" class="px-colbtn" data-xact="col" data-eid="${esc(E)}" data-pid="${esc(p.id)}" title="Zaznacz / odznacz wszystko dla: ${esc(p.n)}">${esc(p.n)}</button></th>`).join('');
  const body=cur.items.map((i,ix)=>{ const r=c.rows[ix];
    return `<tr class="${r.n?'':'px-none'}"><td class="px-prod"><input class="g-in g-txt" data-xk="${k('i',i.id,'n')}" value="${esc(i.n)}" aria-label="Produkt"></td>
      <td class="n"><input class="g-in g-num px-price${r.bad?' bad':''}" data-xk="${k('i',i.id,'p')}" value="${esc(String(i.p).replace(/\./g,','))}" title="Możesz wpisać działanie, np. 4,95+9,49" aria-label="Cena"></td>
      <td class="n"><input class="g-in g-num g-q" inputmode="numeric" data-xk="${k('i',i.id,'q')}" value="${i.q}" aria-label="Ilość"></td>
      <td class="n px-calc px-share">${r.n?fmt(r.share,2):'—'}</td>
      ${P.map(p=>`<td class="px-c${p.id===cur.payer?' payer':''}"><input type="checkbox" class="sq px-on" data-eid="${esc(E)}" data-iid="${esc(i.id)}" data-pid="${esc(p.id)}"${i.on.includes(p.id)?' checked':''} aria-label="${esc(p.n)} – ${esc(i.n)}"></td>`).join('')}
      <td class="n"><button type="button" class="g-del" data-xact="delit" data-eid="${esc(E)}" data-iid="${esc(i.id)}" aria-label="Usuń pozycję">×</button></td></tr>`; }).join('');
  const add=`<tr class="px-add"><td colspan="${5+P.length}"><form class="px-additem" data-eid="${esc(E)}"><input name="n" placeholder="+ Produkt" aria-label="Nowy produkt" autocomplete="off" required>
      <input name="p" placeholder="Cena" inputmode="decimal" aria-label="Cena" autocomplete="off" required><input name="q" value="1" inputmode="numeric" aria-label="Ilość" autocomplete="off">
      <button type="submit">Dodaj</button></form></td></tr>`;
  const foot=`<tr class="px-adj"><td colspan="4">Korekta</td>${P.map(p=>`<td class="px-c${p.id===cur.payer?' payer':''}"><input class="g-in g-num px-adjin" inputmode="decimal" data-xk="${k('p',p.id,'adj')}" value="${fmt(p.adj,2)}" aria-label="Korekta ${esc(p.n)}"></td>`).join('')}<td></td></tr>
    <tr class="px-sum"><td colspan="3">Suma na osobę</td><td class="n">${fmt(c.spent,2)}</td>${P.map(p=>`<td class="px-c${p.id===cur.payer?' payer':''}"><b>${fmt(c.tot[p.id]||0,2)}</b></td>`).join('')}<td></td></tr>`;
  const table=`<div class="tbl-wrap px-wrap"><table class="px-t"><thead><tr><th>Produkt</th><th class="n">Cena</th><th class="n">Ilość</th><th class="n">Na os.</th>${ph}<th></th></tr></thead>
    <tbody>${body}${add}</tbody><tfoot>${foot}</tfoot></table></div>
    ${c.unassigned>0.004?`<p class="px-warn">${pxZl(c.unassigned)} nie jest przypisane do nikogo — zaznacz, kto brał te produkty.</p>`:''}`;
  const people=`<div class="px-people">${P.map(p=>`<span class="px-chip${p.id===cur.payer?' payer':''}"><input class="px-chipin" data-xk="${k('p',p.id,'n')}" value="${esc(p.n)}" aria-label="Imię uczestnika" maxlength="24" size="${Math.max(3,p.n.length)}"><button type="button" class="px-x" data-xact="delp" data-eid="${esc(E)}" data-pid="${esc(p.id)}" aria-label="Usuń ${esc(p.n)}">×</button></span>`).join('')}
    <form class="px-addp" data-eid="${esc(E)}"><input name="n" placeholder="+ Uczestnik" aria-label="Nowy uczestnik" autocomplete="off" maxlength="24"></form></div>`;
  const settle=`<div class="px-settle">${P.filter(p=>p.id!==cur.payer).map(p=>{ const v=Math.max(0,c.tot[p.id]||0);
      return `<label class="px-row${p.paid?' done':''}"><input type="checkbox" class="sq px-paid" data-eid="${esc(E)}" data-pid="${esc(p.id)}"${p.paid?' checked':''}><span class="px-who"><b>${esc(p.n)}</b> → ${payer?esc(payer.n):'?'}</span><span class="px-amt">${pxZl(v)}</span><span class="px-st">${p.paid?'oddane':'do oddania'}</span></label>`; }).join('')||'<p class="nt-none">Dodaj uczestników.</p>'}</div>`;
  return `${tabs}${head}${cells}
    <section class="block"><div class="block-head"><h2>Uczestnicy</h2></div>${people}</section>
    <section class="block"><div class="block-head"><h2>Rachunek</h2></div>${table}</section>
    <section class="block"><div class="block-head"><h2>Rozliczenie</h2></div>${settle}</section>`;
}
function pxRefresh(){
  const box=$('#posApp'); if(!box) return;
  const a=document.activeElement, key=a&&a.dataset&&a.dataset.xk, form=a&&a.closest&&a.closest('form.px-additem,form.px-addp'), fsel=form&&(form.classList.contains('px-additem')?'form.px-additem':'form.px-addp'), fname=form&&a.name;
  const y=window.scrollY; box.innerHTML=posHtml(); window.scrollTo(0,y);
  if(key){ const el=box.querySelector(`[data-xk="${CSS.escape(key)}"]`); if(el){ el.focus(); el.select&&el.type!=='date'&&el.select(); } }
  else if(fsel){ const el=box.querySelector(`${fsel} [name="${fname}"]`); el&&el.focus(); }
}
function pPos(){ return `<h1>Posiadów<span class="acc">ki</span></h1><div id="posApp">${posHtml()}</div>`; }
document.addEventListener('submit', e=>{
  const f=e.target;
  if(f.matches('form.px-new')){ e.preventDefault(); const n=f.n.value.trim(); if(!n) return; const prev=pxCur();
    const people=prev?prev.people.map(p=>({id:uid('q'), n:p.n, adj:0, paid:false})):[{id:uid('q'),n:'Eryk',adj:0,paid:false}];
    const ev=pxNorm(uid('po'),{n, d:todayISO(), o:Date.now(), people, payer:(people.find(p=>p.n==='Eryk')||people[0]).id, items:[]});
    PX=[...PX,ev]; pxSel=ev.id; store.set('posSel',pxSel); savePos(); f.n.value=''; document.activeElement.blur(); pxRefresh(); pxPush(ev); return; }
  if(f.matches('form.px-additem')){ e.preventDefault(); const n=f.n.value.trim(), pr=pxEval(f.p.value), q=Math.max(1,Math.round(pxEval(f.q.value)||1)); if(!n||isNaN(pr)){ (n?f.p:f.n).focus(); return; }
    const p=String(f.p.value).replace(/,/g,'.').replace(/\s+/g,'');
    pxUpdate(f.dataset.eid, ev=>{ ev.items.push({id:uid('i'), n, p, q, disc:0, on:ev.people.map(x=>x.id)}); });
    setTimeout(()=>{ const i=$('form.px-additem [name="n"]'); i&&i.focus(); },0); return; }
  if(f.matches('form.px-addp')){ e.preventDefault(); const n=f.n.value.trim(); if(!n) return;
    pxUpdate(f.dataset.eid, ev=>{ ev.people.push({id:uid('q'), n, adj:0, paid:false}); if(!ev.payer) ev.payer=ev.people[0].id; });
    setTimeout(()=>{ const i=$('form.px-addp [name="n"]'); i&&i.focus(); },0); }
});
document.addEventListener('change', e=>{
  const el=e.target;
  if(el.matches('input.px-on')){ const {eid,iid,pid}=el.dataset, on=el.checked; return pxUpdate(eid, ev=>{ const i=ev.items.find(x=>x.id===iid); if(!i) return; i.on=on?[...new Set([...i.on,pid])]:i.on.filter(x=>x!==pid); }); }
  if(el.matches('input.px-paid')){ const {eid,pid}=el.dataset, v=el.checked; return pxUpdate(eid, ev=>{ const p=ev.people.find(x=>x.id===pid); if(p) p.paid=v; }); }
  const k=el.dataset&&el.dataset.xk; if(!k) return;
  const [eid,kind,id,f]=k.split('|'); let v=el.value;
  setTimeout(()=>pxUpdate(eid, ev=>{
    if(kind==='e'){ v=v.trim(); if(f==='n'&&!v) return; ev[f]=v; return; }
    if(kind==='p'){ const p=ev.people.find(x=>x.id===id); if(!p) return; if(f==='adj'){ const x=pxEval(v); if(!isNaN(x)) p.adj=Math.round(x*100)/100; } else { v=v.trim(); if(v) p.n=v; } return; }
    const i=ev.items.find(x=>x.id===id); if(!i) return;
    if(f==='n'){ v=v.trim(); if(v) i.n=v; }
    else if(f==='p'){ if(!isNaN(pxEval(v))) i.p=String(v).replace(/,/g,'.').replace(/\s+/g,'')||'0'; }
    else if(f==='q'){ const x=pxEval(v); if(!isNaN(x)) i.q=Math.max(0,Math.round(x)); }
    else if(f==='disc'){ const x=pxEval(v); if(!isNaN(x)) i.disc=Math.max(0,Math.round(x*100)/100); }
  }),0);
});
document.addEventListener('keydown', e=>{ if(e.key==='Enter' && e.target.matches && e.target.matches('[data-xk]') && e.target.tagName==='INPUT'){ e.preventDefault(); e.target.blur(); } });
document.addEventListener('click', e=>{
  const t=e.target.closest('[data-pxsel]'); if(t){ pxSel=t.dataset.pxsel; store.set('posSel',pxSel); pxRefresh(); return; }
  const b=e.target.closest('[data-xact]'); if(!b) return;
  const a=b.dataset.xact, eid=b.dataset.eid;
  if(a==='col'){ return pxUpdate(eid, ev=>{ const pid=b.dataset.pid, all=ev.items.length&&ev.items.every(i=>i.on.includes(pid)); ev.items.forEach(i=>{ i.on=all?i.on.filter(x=>x!==pid):[...new Set([...i.on,pid])]; }); }); }
  if(!b.dataset.xarm){ b.dataset.xarm='1'; b.dataset.otext=b.textContent; b.textContent=a==='delev'?'Na pewno usunąć?':(a==='delp'?'?':'Usuń?'); b.classList.add('armed');
    setTimeout(()=>{ if(b.isConnected){ delete b.dataset.xarm; b.textContent=b.dataset.otext; b.classList.remove('armed'); } },3000); return; }
  if(a==='delit') pxUpdate(eid, ev=>{ ev.items=ev.items.filter(i=>i.id!==b.dataset.iid); });
  else if(a==='delp') pxUpdate(eid, ev=>{ ev.people=ev.people.filter(p=>p.id!==b.dataset.pid); });
  else if(a==='delev'){ PX=PX.filter(x=>x.id!==eid); if(pxSel===eid){ pxSel=''; store.set('posSel',''); } savePos(); pxRefresh(); cloud(db=>db.collection('posiadowki').doc(eid).delete()); }
});
