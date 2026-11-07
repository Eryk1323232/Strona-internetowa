/* ════════════════════════════════════════════════════════════════════════
   SIŁOWNIA (INNE)
   ════════════════════════════════════════════════════════════════════════
   pGym()          – układ podstrony (kafle, plany, masa ciała, zakupy).
   weightChart()   – wykres masy ciała (SVG) z dymkami po najechaniu.
   G               – waga (G.w) i zakupy (G.z); gymWeightHtml(), gymShopHtml().
   PL              – plany treningowe (dni → ćwiczenia: seria, powtórzenia, RIR); planHtml().
   TR              – dziennik treningów (zapisane wyniki); okienko trModalHtml().
   ════════════════════════════════════════════════════════════════════════ */

function pGym(){
  return `<h1>Siłow<span class="acc">nia</span></h1>
  <div class="grid g4" id="gymCells">${gymCellsHtml()}</div>
  <section class="block"><div class="block-head"><h2>Plany treningowe</h2></div><div id="gymPlan">${planHtml()}</div></section>
  <section class="block"><div class="block-head"><h2>Masa ciała</h2></div><div id="gymW">${gymWeightHtml()}</div></section>
  <section class="block"><div class="block-head"><h2>Zakupy</h2></div><div id="gymZ">${gymShopHtml()}</div></section>`;
}
function weightChart(){
  const waga=gW().map(w=>[w.d,w.v,w.id]);
  const W=640,H=240,L=44,R=24,T=20,B=30;
  if(waga.length<2) return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Wykres masy ciała"><text class="empty-chart" x="${W/2}" y="${H/2}" text-anchor="middle">${waga.length?'Dodaj drugi pomiar, żeby zobaczyć wykres.':'Brak pomiarów.'}</text></svg>`;
  const ts=waga.map(w=>new Date(w[0]).getTime());
  const t0=ts[0],t1=ts[ts.length-1]===t0?t0+864e5:ts[ts.length-1];
  const ys=waga.map(w=>w[1]);
  const y0=Math.floor(Math.min(...ys)-1), y1=Math.ceil(Math.max(...ys)+1);
  const X=t=>L+(t-t0)/(t1-t0)*(W-L-R), Y=v=>T+(y1-v)/(y1-y0)*(H-T-B);
  let g=''; const step=Math.max(1,Math.ceil((y1-y0)/6));
  for(let v=y0;v<=y1;v+=step){ g+=`<line x1="${L}" x2="${W-R}" y1="${Y(v)}" y2="${Y(v)}" stroke="var(--line-soft)"/><text x="${L-8}" y="${Y(v)+3.5}" text-anchor="end">${v}</text>`; }
  const pts=waga.map((w,i)=>[X(ts[i]),Y(w[1])]);
  const line=pts.map((p,i)=>(i?'L':'M')+p[0].toFixed(1)+' '+p[1].toFixed(1)).join(' ');
  const area=line+` L${pts[pts.length-1][0].toFixed(1)} ${H-B} L${pts[0][0].toFixed(1)} ${H-B} Z`;
  const show=pts.map(()=>false); show[pts.length-1]=true; let lx=pts[pts.length-1][0];
  for(let i=pts.length-2;i>=0;i--){ if(lx-pts[i][0]>=46){ show[i]=true; lx=pts[i][0]; } }
  const xl=waga.map((w,i)=>!show[i]?'':`<text x="${pts[i][0]}" y="${H-10}" text-anchor="${i===0?'start':i===waga.length-1?'end':'middle'}">${w[0].slice(8)}.${w[0].slice(5,7)}</text>`).join('');
  const dots=pts.map((p,i)=>`<circle class="wdot" cx="${p[0]}" cy="${p[1]}" r="${i===pts.length-1?5:3.5}" fill="${i===pts.length-1?'var(--accent)':'var(--surface)'}" stroke="var(--accent)" stroke-width="2"/>`).join('')
    + pts.map((p,i)=>{ const pv=waga[i-1], ch=pv?waga[i][1]-pv[1]:null; return `<circle class="whit" cx="${p[0]}" cy="${p[1]}" r="14" fill="transparent" tabindex="0" data-wid="${esc(waga[i][2])}" data-wd="${dPL(waga[i][0])}" data-wv="${fmt(waga[i][1],1)}" data-wc="${ch===null?'':(ch>0?'+':ch<0?'−':'±')+fmt(Math.abs(ch),1)}" aria-label="${dPL(waga[i][0])}: ${fmt(waga[i][1],1)} kg"/>`; }).join('');
  const lp=pts[pts.length-1];
  return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Wykres masy ciała">
    ${g}<path d="${area}" fill="var(--accent)" opacity=".08"/><path d="${line}" fill="none" stroke="var(--accent)" stroke-width="2"/>${dots}
    <text class="lbl" x="${lp[0]-10}" y="${lp[1]-12}" text-anchor="end">${fmt(waga[waga.length-1][1],1)} kg</text>${xl}</svg>`;
}


/* ——— SIŁOWNIA: masa ciała i zakupy (edytowalne; chmura przez db, kopia w przeglądarce) ——— */
const gNum = v => { const x=parseFloat(String(v).replace(',','.').replace(/\s/g,'')); return isFinite(x)?x:NaN; };
const gUrl = u => { u=String(u||'').trim(); if(!u) return ''; if(!/^https?:\/\//i.test(u)) u='https://'+u; try{ const x=new URL(u); return /^https?:$/.test(x.protocol)?x.href:''; }catch(e){ return ''; } };
const gHost = u => { try{ return new URL(u).hostname.replace(/^www\./,''); }catch(e){ return ''; } };
let G = {w:D.waga.map((x,i)=>({id:'xw-'+i, d:x[0], v:x[1]})), z:D.zakupy.map((x,i)=>({id:'xz-'+i, n:x[1], shop:x[4], q:x[2], p:x[3], url:'', c:i}))};
try{ const c=JSON.parse(store.get('gymState','null')); if(c&&Array.isArray(c.w)&&Array.isArray(c.z)) G=c; }catch(e){}
const saveGym = () => store.set('gymState', JSON.stringify(G));
const gW = () => G.w.slice().sort((a,b)=>a.d<b.d?-1:a.d>b.d?1:0);
const gZ = () => G.z.slice().sort((a,b)=>a.c-b.c);
const gDoc = r => { const {id,...x}=r; return x; };
const gSign = d => (d>0?'+':d<0?'−':'±')+fmt(Math.abs(d),1);
function gymCellsHtml(){
  const W=gW(), last=W[W.length-1], prev=W[W.length-2], first=W[0], zs=G.z.reduce((a,z)=>a+(+z.q||0)*(+z.p||0),0);
  return `<div class="cell"><span class="label">Ostatni pomiar</span><span class="big">${last?fmt(last.v,1):'—'}<small>kg</small></span><p>${last?dPL(last.d):'brak pomiarów'}</p></div>
    <div class="cell"><span class="label">Zmiana od poprzedniego</span><span class="big">${prev?gSign(last.v-prev.v):'—'}<small>kg</small></span><p>${prev?'względem '+dPL(prev.d):'potrzebne 2 pomiary'}</p></div>
    <div class="cell"><span class="label">Od pierwszego pomiaru</span><span class="big">${first&&last&&first!==last?gSign(last.v-first.v):'—'}<small>kg</small></span><p>${first?`od ${dPL(first.d)} · ${W.length} pomiarów`:'—'}</p></div>
    <div class="cell"><span class="label">Zakupy · siłownia</span><span class="big">${fmt(zs,2)}<small>zł</small></span><p>${G.z.length} ${G.z.length===1?'pozycja':(G.z.length%10>=2&&G.z.length%10<=4&&(G.z.length%100<10||G.z.length%100>=20))?'pozycje':'pozycji'}</p></div>`;
}
let wListOpen=false;
function gymWeightHtml(){
  const W=gW();
  const rows=W.slice().reverse().map((w,i,arr)=>{ const pv=arr[i+1], d=pv?w.v-pv.v:null;
    return `<tr data-wrow="${esc(w.id)}"><td><input type="date" class="g-in g-date" data-gk="w|${esc(w.id)}|d" value="${esc(w.d)}" aria-label="Data pomiaru"></td>
      <td class="n"><input class="g-in g-num" inputmode="decimal" data-gk="w|${esc(w.id)}|v" value="${fmt(w.v,1)}" aria-label="Waga w kg"><span class="g-unit">kg</span></td>
      <td class="n"><span class="g-ch ${d===null?'':d>0?'up':d<0?'down':''}">${d===null?'—':gSign(d)}</span></td>
      <td class="n"><button type="button" class="g-del" data-gdel="w|${esc(w.id)}" aria-label="Usuń pomiar">×</button></td></tr>`; }).join('');
  return `<form class="g-form g-wadd"><label><span class="label">Data</span><input type="date" name="d" value="${todayISO()}" required></label>
      <label><span class="label">Waga [kg]</span><input name="v" inputmode="decimal" placeholder="np. 98,4" required autocomplete="off"></label><button type="submit">Dodaj pomiar</button></form>
    <div class="chart g-chart">${weightChart()}<div class="w-tip" id="wTip" hidden></div></div>
    <details class="w-list" id="wList"${wListOpen?' open':''}><summary>Wszystkie pomiary <span class="ct">${W.length}</span></summary>
      <div class="tbl-wrap"><table class="g-t"><thead><tr><th>Data</th><th class="n">Waga</th><th class="n">Zmiana</th><th></th></tr></thead><tbody>${rows||'<tr><td colspan="4" class="g-empty">Brak pomiarów.</td></tr>'}</tbody></table></div></details>`;
}
function gymShopHtml(){
  const Z=gZ(), sum=Z.reduce((a,z)=>a+(+z.q||0)*(+z.p||0),0);
  const rows=Z.map(z=>{ const u=gUrl(z.url);
    return `<tr><td><input class="g-in g-txt g-name" data-gk="z|${esc(z.id)}|n" value="${esc(z.n)}" aria-label="Produkt"></td>
      <td><input class="g-in g-txt" data-gk="z|${esc(z.id)}|shop" value="${esc(z.shop)}" placeholder="—" aria-label="Sklep"></td>
      <td class="n"><input class="g-in g-num g-q" inputmode="numeric" data-gk="z|${esc(z.id)}|q" value="${+z.q||0}" aria-label="Ilość"></td>
      <td class="n"><input class="g-in g-num" inputmode="decimal" data-gk="z|${esc(z.id)}|p" value="${fmt(+z.p||0,2)}" aria-label="Cena za sztukę"><span class="g-unit">zł</span></td>
      <td class="n g-sum">${zl((+z.q||0)*(+z.p||0))}</td>
      <td class="g-link">${u?`<a class="g-open" href="${esc(u)}" target="_blank" rel="noopener" title="${esc(u)}">${esc(gHost(u))} ↗</a>`:''}<input class="g-in g-txt g-url" data-gk="z|${esc(z.id)}|url" value="${esc(z.url)}" placeholder="${u?'zmień link':'wklej link'}" aria-label="Link do oferty"></td>
      <td class="n"><button type="button" class="g-del" data-gdel="z|${esc(z.id)}" aria-label="Usuń produkt">×</button></td></tr>`; }).join('');
  return `<form class="g-form g-zadd"><label class="w2"><span class="label">Produkt</span><input name="n" placeholder="np. Kreatyna 500 g" required autocomplete="off"></label>
      <label><span class="label">Sklep</span><input name="shop" placeholder="np. Allegro" autocomplete="off"></label>
      <label class="w0"><span class="label">Ilość</span><input name="q" inputmode="numeric" value="1" autocomplete="off"></label>
      <label class="w0"><span class="label">Cena [zł]</span><input name="p" inputmode="decimal" placeholder="0,00" required autocomplete="off"></label>
      <label class="w2"><span class="label">Link do oferty</span><input name="url" placeholder="https://…" autocomplete="off"></label><button type="submit">Dodaj produkt</button></form>
    <div class="tbl-wrap"><table class="g-t g-zt"><thead><tr><th>Produkt</th><th>Sklep</th><th class="n">Ilość</th><th class="n">Cena szt.</th><th class="n">Kwota</th><th>Oferta</th><th></th></tr></thead>
      <tbody>${rows||'<tr><td colspan="7" class="g-empty">Brak produktów — dodaj pierwszy powyżej.</td></tr>'}</tbody>
      <tfoot><tr><td colspan="4">Razem</td><td class="n">${zl(sum)}</td><td colspan="2"></td></tr></tfoot></table></div>`;
}
function gymRefresh(){
  if(!$('#gymW')) return;
  const a=document.activeElement, key=a&&a.dataset&&a.dataset.gk, inForm=a&&a.closest&&a.closest('.g-form');
  if(inForm) { $('#gymCells').innerHTML=gymCellsHtml(); return; }
  $('#gymCells').innerHTML=gymCellsHtml(); $('#gymW').innerHTML=gymWeightHtml(); $('#gymZ').innerHTML=gymShopHtml();
  if(key){ const el=document.querySelector(`[data-gk="${CSS.escape(key)}"]`); if(el){ el.focus(); if(el.select && el.type!=='date') el.select(); } }
}
function gSave(kind, row){ saveGym(); gymRefresh(); cloud(db=>db.collection(kind==='w'?'waga':'zakupy').doc(row.id).set(gDoc(row))); }
function gDel(kind, id){ G[kind]=G[kind].filter(r=>r.id!==id); saveGym(); gymRefresh(); cloud(db=>db.collection(kind==='w'?'waga':'zakupy').doc(id).delete()); }
document.addEventListener('submit', e=>{
  const f=e.target;
  if(f.matches('form.g-wadd')){ e.preventDefault(); const v=gNum(f.v.value), d=f.d.value; if(!d||!(v>0)){ f.v.focus(); return; }
    const r={id:uid('w'), d, v:Math.round(v*10)/10}; G.w=[...G.w,r]; f.v.value=''; document.activeElement.blur(); gSave('w',r); return; }
  if(f.matches('form.g-zadd')){ e.preventDefault(); const n=f.n.value.trim(), p=gNum(f.p.value), q=Math.max(1,Math.round(gNum(f.q.value)||1)); if(!n||!(p>=0)){ (n?f.p:f.n).focus(); return; }
    const r={id:uid('z'), n, shop:f.shop.value.trim(), q, p:Math.round(p*100)/100, url:f.url.value.trim(), c:Date.now()}; G.z=[...G.z,r]; f.reset(); document.activeElement.blur(); gSave('z',r); }
});
document.addEventListener('change', e=>{
  const el=e.target, k=el.dataset&&el.dataset.gk; if(!k) return;
  const [kind,id,f]=k.split('|'), row=G[kind].find(r=>r.id===id); if(!row) return;
  let v=el.value;
  if(f==='v'||f==='p'){ v=gNum(v); if(!(v>=0)||(f==='v'&&!(v>0))){ gymRefresh(); return; } v=f==='v'?Math.round(v*10)/10:Math.round(v*100)/100; }
  else if(f==='q'){ v=Math.max(0,Math.round(gNum(v)||0)); }
  else if(f==='d'){ if(!v){ gymRefresh(); return; } }
  else { v=v.trim(); if(f==='n'&&!v){ gymRefresh(); return; } }
  const nr={...row,[f]:v}; G[kind]=G[kind].map(r=>r.id===id?nr:r); setTimeout(()=>gSave(kind,nr),0);
});
document.addEventListener('keydown', e=>{ if(e.key==='Enter' && e.target.matches && e.target.matches('input.g-in')){ e.preventDefault(); e.target.blur(); } });
document.addEventListener('click', e=>{
  const b=e.target.closest('[data-gdel]'); if(!b) return;
  if(!b.dataset.garm){ b.dataset.garm='1'; b.textContent='Usuń?'; b.classList.add('armed'); setTimeout(()=>{ if(b.isConnected){ delete b.dataset.garm; b.textContent='×'; b.classList.remove('armed'); } },3000); return; }
  const [kind,id]=b.dataset.gdel.split('|'); gDel(kind,id);
});

/* ——— PLANY TRENINGOWE: wiele planów, dni, ćwiczenia (edytowalne; chmura przez db, kopia w przeglądarce) ——— */
const plDef = () => [{id:'xp-1', n:'Upper-Lower #1', o:0, days:D.plan.map((d,i)=>({id:'xd-'+i, n:d.name.replace(/\s*\(.*\)/,'').trim(), tag:((d.name.match(/\((.*)\)/)||[])[1]||''),
  ex:d.ex.map((e,j)=>({id:'xe'+i+'-'+j, n:e[0], s:String(e[1]), r:String(e[2]), rir:String(e[4])}))}))}];
const plNorm = (id,v={}) => ({id, n:String(v.n||'Plan'), o:+v.o||0, days:(Array.isArray(v.days)?v.days:[]).map(d=>({id:String(d.id||uid('d')), n:String(d.n||''), tag:String(d.tag||''),
  ex:(Array.isArray(d.ex)?d.ex:[]).map(e=>({id:String(e.id||uid('e')), n:String(e.n||''), s:String(e.s??''), r:String(e.r??''), rir:String(e.rir??'')}))}))});
let PL = plDef();
try{ const c=JSON.parse(store.get('planState','null')); if(Array.isArray(c)&&c.length) PL=c.map(p=>plNorm(p.id,p)); }catch(e){}
let plSel = store.get('planSel','');
const savePlans = () => store.set('planState', JSON.stringify(PL));
const plList = () => PL.slice().sort((a,b)=>a.o-b.o);
const plCur = () => PL.find(p=>p.id===plSel) || plList()[0];
const plPush = p => cloud(db=>db.collection('plany').doc(p.id).set({n:p.n, o:p.o, days:p.days}));
function plUpdate(pid, fn){ const p=PL.find(x=>x.id===pid); if(!p) return; const np=plNorm(p.id, JSON.parse(JSON.stringify(p))); fn(np); PL=PL.map(x=>x.id===pid?np:x); savePlans(); planRefresh(); plPush(np); }
function planHtml(){
  const cur=plCur();
  const tabs=`<div class="ptabs pl-tabs" role="tablist">${plList().map(p=>`<button type="button" role="tab" data-plsel="${esc(p.id)}" aria-selected="${cur&&p.id===cur.id}">${esc(p.n)}</button>`).join('')}
    <form class="pl-new"><input name="n" placeholder="+ Nowy plan" aria-label="Nazwa nowego planu" autocomplete="off" maxlength="60"></form></div>`;
  if(!cur) return tabs+'<div class="nt-blank"><p>Brak planów. Wpisz nazwę w polu „+ Nowy plan”.</p></div>';
  const P=cur.id;
  const days=cur.days.map(d=>{ const k=`${P}|${d.id}`;
    return `<div class="day"><div class="day-head"><input class="pl-in pl-dname" data-pk="${esc(k)}||n" value="${esc(d.n)}" placeholder="Nazwa dnia" aria-label="Nazwa dnia">
      <input class="pl-in pl-tag" data-pk="${esc(k)}||tag" value="${esc(d.tag)}" placeholder="opis" aria-label="Opis dnia" maxlength="20">
      <button type="button" class="g-del" data-pact="delday" data-pid="${esc(P)}" data-did="${esc(d.id)}" aria-label="Usuń dzień">×</button></div>
      <div class="tbl-wrap" style="border:0"><table class="pl-t"><thead><tr><th>Ćwiczenie</th><th class="n">Serie</th><th class="n">Powt.</th><th class="n">RIR</th><th></th></tr></thead><tbody>
      ${d.ex.map(e=>{ const ek=`${k}|${e.id}`; return `<tr><td><input class="pl-in pl-ex" data-pk="${esc(ek)}|n" value="${esc(e.n)}" title="${esc(e.n)}" aria-label="Nazwa ćwiczenia"></td>
        <td class="n"><input class="pl-in pl-sm" data-pk="${esc(ek)}|s" value="${esc(e.s)}" aria-label="Serie"></td>
        <td class="n"><input class="pl-in pl-md" data-pk="${esc(ek)}|r" value="${esc(e.r)}" aria-label="Powtórzenia"></td>
        <td class="n"><input class="pl-in pl-sm" data-pk="${esc(ek)}|rir" value="${esc(e.rir)}" aria-label="RIR"></td>
        <td class="n"><button type="button" class="g-del" data-pact="delex" data-pid="${esc(P)}" data-did="${esc(d.id)}" data-eid="${esc(e.id)}" aria-label="Usuń ćwiczenie">×</button></td></tr>`; }).join('')}
      </tbody></table></div>
      <form class="pl-addex" data-pid="${esc(P)}" data-did="${esc(d.id)}"><input name="n" placeholder="+ Dodaj ćwiczenie" aria-label="Nazwa nowego ćwiczenia" autocomplete="off" maxlength="80"></form></div>`; }).join('');
  return `${tabs}<div class="pl-head"><input class="pl-in pl-pname" data-pk="${esc(P)}|||n" value="${esc(cur.n)}" aria-label="Nazwa planu" maxlength="60">
      <span class="pl-meta">${cur.days.length} ${cur.days.length===1?'dzień':'dni'} · ${cur.days.reduce((a,d)=>a+d.ex.length,0)} ćwiczeń</span>
      <button type="button" class="td-btn" data-pact="delplan" data-pid="${esc(P)}">Usuń plan</button></div>
    <div class="plan">${days}<button type="button" class="pl-addday" data-pact="addday" data-pid="${esc(P)}"><span>+</span>Dodaj dzień</button></div>${trBar(cur)}`;
}
function planRefresh(){
  const box=$('#gymPlan'); if(!box) return;
  const a=document.activeElement, key=a&&a.dataset&&a.dataset.pk, nf=a&&a.closest&&a.closest('form.pl-addex'), nfDay=nf&&nf.dataset.did;
  box.innerHTML=planHtml();
  if(key){ const el=box.querySelector(`[data-pk="${CSS.escape(key)}"]`); if(el){ el.focus(); el.select&&el.select(); } }
  else if(nfDay){ const el=box.querySelector(`form.pl-addex[data-did="${CSS.escape(nfDay)}"] input`); el&&el.focus(); }
}
document.addEventListener('submit', e=>{
  const f=e.target;
  if(f.matches('form.pl-new')){ e.preventDefault(); const n=f.n.value.trim(); if(!n) return;
    const p=plNorm(uid('p'),{n, o:Math.max(-1,...PL.map(x=>x.o))+1, days:[{id:uid('d'),n:'Dzień 1',tag:'',ex:[]}]});
    PL=[...PL,p]; plSel=p.id; store.set('planSel',plSel); savePlans(); f.n.value=''; document.activeElement.blur(); planRefresh(); plPush(p); return; }
  if(f.matches('form.pl-addex')){ e.preventDefault(); const n=f.n.value.trim(); if(!n) return;
    plUpdate(f.dataset.pid, p=>{ const d=p.days.find(x=>x.id===f.dataset.did); if(d) d.ex.push({id:uid('e'), n, s:'3', r:'8-10', rir:'1'}); }); }
});
document.addEventListener('change', e=>{
  const k=e.target.dataset&&e.target.dataset.pk; if(!k) return;
  const [pid,did,eid,f]=k.split('|'), v=e.target.value.trim();
  setTimeout(()=>{
  if(!did){ if(!v) return planRefresh(); return plUpdate(pid, p=>{ p.n=v; }); }
  plUpdate(pid, p=>{ const d=p.days.find(x=>x.id===did); if(!d) return;
    if(!eid){ d[f]=v; return; }
    const x=d.ex.find(y=>y.id===eid); if(!x) return; if(f==='n'&&!v) return; x[f]=v; });
  },0);
});
document.addEventListener('keydown', e=>{ if(e.key==='Enter' && e.target.matches && e.target.matches('input.pl-in')){ e.preventDefault(); e.target.blur(); } });
document.addEventListener('click', e=>{
  const t=e.target.closest('[data-plsel]'); if(t){ plSel=t.dataset.plsel; store.set('planSel',plSel); planRefresh(); return; }
  const b=e.target.closest('[data-pact]'); if(!b) return;
  const a=b.dataset.pact, pid=b.dataset.pid;
  if(a==='addday'){ plUpdate(pid, p=>{ p.days.push({id:uid('d'), n:'Dzień '+(p.days.length+1), tag:'', ex:[]}); });
    setTimeout(()=>{ const ins=document.querySelectorAll('#gymPlan .pl-dname'); const el=ins[ins.length-1]; if(el){ el.focus(); el.select(); } },0); return; }
  if(!b.dataset.parm){ b.dataset.parm='1'; const o=b.textContent; b.dataset.otext=o; b.textContent=a==='delplan'?'Na pewno usunąć plan?':'Usuń?'; b.classList.add('armed');
    setTimeout(()=>{ if(b.isConnected){ delete b.dataset.parm; b.textContent=b.dataset.otext; b.classList.remove('armed'); } },3000); return; }
  if(a==='delex') plUpdate(pid, p=>{ const d=p.days.find(x=>x.id===b.dataset.did); if(d) d.ex=d.ex.filter(x=>x.id!==b.dataset.eid); });
  else if(a==='delday') plUpdate(pid, p=>{ p.days=p.days.filter(x=>x.id!==b.dataset.did); });
  else if(a==='delplan'){ PL=PL.filter(p=>p.id!==pid); if(plSel===pid){ plSel=''; store.set('planSel',''); } savePlans(); planRefresh(); cloud(db=>db.collection('plany').doc(pid).delete()); }
});


/* ——— DZIENNIK TRENINGÓW: zapis ciężaru i powtórzeń + historia (chmura przez db, kopia w przeglądarce) ——— */
const trNorm = (id,v={}) => ({id, pid:String(v.pid||''), pn:String(v.pn||''), did:String(v.did||''), dn:String(v.dn||''), d:String(v.d||''), c:+v.c||0,
  ex:(Array.isArray(v.ex)?v.ex:[]).map(e=>({n:String(e.n||''), sets:(Array.isArray(e.sets)?e.sets:[]).map(s=>({w:+s.w||0, r:+s.r||0}))}))});
let TR = [];
try{ const c=JSON.parse(store.get('trState','null')); if(Array.isArray(c)) TR=c.map(t=>trNorm(t.id,t)); }catch(e){}
const saveTr = () => store.set('trState', JSON.stringify(TR));
let trM = null; /* {mode:'pick'|'log'|'hist', pid, did, d} */
const trFor = pid => TR.filter(t=>t.pid===pid).sort((a,b)=>(b.d||'').localeCompare(a.d||'')||b.c-a.c);
const trLast = (pid,did,n) => { for(const t of trFor(pid)){ if(t.did!==did) continue; const e=t.ex.find(x=>x.n.trim().toLowerCase()===n.trim().toLowerCase()); if(e&&e.sets.length) return {t,e}; } return null; };
const trSetsN = s => { const m=String(s).match(/\d+/); return Math.min(10,Math.max(1, m?+m[0]:3)); };
const trW = w => fmt(w, Number.isInteger(w)?0:1);
const trVol = t => t.ex.reduce((a,e)=>a+e.sets.reduce((b,s)=>b+s.w*s.r,0),0);
function trBar(p){ const n=trFor(p.id).length;
  return `<div class="tr-bar"><button type="button" class="tr-btn tr-main" data-tract="pick" data-pid="${esc(p.id)}"><span aria-hidden="true">+</span> Zapisz trening</button>
    <button type="button" class="tr-btn" data-tract="hist" data-pid="${esc(p.id)}">Historia${n?` <span class="ct">${n}</span>`:''}</button></div>`; }
function trModalHtml(){
  const p=PL.find(x=>x.id===trM.pid); if(!p) return '';
  const close=`<button type="button" class="tr-x" data-tract="close" aria-label="Zamknij">✕</button>`;
  if(trM.mode==='pick') return `<div class="tr-top"><div><span class="label">${esc(p.n)}</span><h2>Wybierz dzień treningowy</h2></div>${close}</div>
    <div class="tr-days">${p.days.map(d=>{ const last=trFor(p.id).find(t=>t.did===d.id);
      return `<button type="button" class="tr-day" data-tract="day" data-did="${esc(d.id)}"><b>${esc(d.n||'Dzień')}</b>${d.tag?`<span class="tr-tag">${esc(d.tag)}</span>`:''}<span class="tr-sub">${d.ex.length} ćwiczeń · ${last?'ostatnio '+dPL(last.d):'jeszcze nie robiony'}</span></button>`; }).join('')||'<p class="nt-none">Ten plan nie ma jeszcze dni.</p>'}</div>`;
  if(trM.mode==='log'){ const d=p.days.find(x=>x.id===trM.did); if(!d) return '';
    return `<form class="tr-log"><div class="tr-top"><div><span class="label">${esc(p.n)}</span><h2>${esc(d.n||'Trening')}</h2></div>${close}</div>
      <div class="tr-meta"><button type="button" class="tr-back" data-tract="pick" data-pid="${esc(p.id)}">← Zmień dzień</button><label><span class="label">Data</span><input type="date" name="d" value="${esc(trM.d||todayISO())}" required></label></div>
      <div class="tr-exs">${d.ex.map((e,ei)=>{ const L=trLast(p.id,d.id,e.n), n=Math.max(trSetsN(e.s), L?L.e.sets.length:0);
        return `<div class="tr-ex" data-ei="${ei}" data-n="${esc(e.n)}"><div class="tr-exh"><b>${esc(e.n)}</b><span class="tr-goal">${esc(e.s)} × ${esc(e.r)}${e.rir!==''?` · RIR ${esc(e.rir)}`:''}</span></div>
          ${L?`<div class="tr-prev">Ostatnio (${dPL(L.t.d)}): ${L.e.sets.map(s=>`${trW(s.w)} kg × ${s.r}`).join(' · ')}</div>`:''}
          <div class="tr-sets">${Array.from({length:n},(_,si)=>{ const ps=L&&L.e.sets[si];
            return `<div class="tr-set"><span class="tr-sn">${si+1}</span><label><input name="w" inputmode="decimal" placeholder="${ps?trW(ps.w):''}" aria-label="Seria ${si+1}: ciężar w kg" autocomplete="off"><em>kg</em></label><span class="tr-times">×</span><label><input name="r" inputmode="numeric" placeholder="${ps?ps.r:'powt.'}" aria-label="Seria ${si+1}: powtórzenia" autocomplete="off"></label></div>`; }).join('')}
            <button type="button" class="tr-addset" data-tract="addset">+ seria</button></div></div>`; }).join('')||'<p class="nt-none">Ten dzień nie ma ćwiczeń.</p>'}</div>
      <div class="tr-foot"><span class="tr-err" id="trErr"></span><button type="button" class="td-btn" data-tract="close">Anuluj</button><button type="submit" class="tr-save">Zapisz trening</button></div></form>`; }
  const H=trFor(p.id);
  return `<div class="tr-top"><div><span class="label">${esc(p.n)}</span><h2>Historia treningów</h2></div>${close}</div>
    ${H.length?`<div class="tr-hist">${H.map(t=>`<article class="tr-entry"><div class="tr-eh"><div><b>${esc(t.dn||'Trening')}</b><span class="tr-sub">${dPL(t.d)} · objętość ${fmt(trVol(t),0)} kg</span></div>
        <button type="button" class="g-del" data-tract="del" data-tid="${esc(t.id)}" aria-label="Usuń trening">×</button></div>
        <table class="tr-ht"><tbody>${t.ex.map(e=>`<tr><td>${esc(e.n)}</td><td>${e.sets.map(s=>`<span class="tr-pill">${trW(s.w)}×${s.r}</span>`).join('')}</td></tr>`).join('')}</tbody></table></article>`).join('')}</div>`
      :`<div class="nt-blank"><p>Brak zapisanych treningów. Kliknij „Zapisz trening” pod planem.</p></div>`}`;
}
function trRender(){
  let sc=$('#trScrim'), md=$('#trModal');
  if(!trM || !$('#gymPlan')){ sc&&sc.remove(); md&&md.remove(); trM=null; document.body.classList.remove('tr-lock'); return; }
  if(!md){ sc=document.createElement('div'); sc.id='trScrim'; sc.className='tr-scrim'; document.body.appendChild(sc);
    md=document.createElement('div'); md.id='trModal'; md.className='tr-modal'; md.setAttribute('role','dialog'); md.setAttribute('aria-modal','true'); document.body.appendChild(md); }
  document.body.classList.add('tr-lock'); md.innerHTML=`<div class="tr-panel">${trModalHtml()}</div>`; md.scrollTop=0;
  const f=md.querySelector('input[name="w"]'); if(f) setTimeout(()=>f.focus(),30);
}
function trRefresh(){ if(trM && trM.mode==='hist') trRender(); }
document.addEventListener('click', e=>{
  if(e.target.id==='trScrim' || e.target.id==='trModal'){ trM=null; return trRender(); }
  const b=e.target.closest('[data-tract]'); if(!b) return;
  const a=b.dataset.tract;
  if(a==='pick'){ trM={mode:'pick', pid:b.dataset.pid||trM.pid, d:trM&&trM.d}; const p=PL.find(x=>x.id===trM.pid); if(p&&p.days.length===1){ trM.mode='log'; trM.did=p.days[0].id; } return trRender(); }
  if(a==='hist'){ trM={mode:'hist', pid:b.dataset.pid}; return trRender(); }
  if(a==='day'){ trM={...trM, mode:'log', did:b.dataset.did}; return trRender(); }
  if(a==='close'){ trM=null; return trRender(); }
  if(a==='addset'){ const box=b.closest('.tr-sets'), n=box.querySelectorAll('.tr-set').length; if(n>=12) return;
    const row=box.querySelector('.tr-set').cloneNode(true); row.querySelector('.tr-sn').textContent=n+1; row.querySelectorAll('input').forEach(i=>{ i.value=''; i.placeholder=i.name==='w'?'':'powt.'; i.setAttribute('aria-label',`Seria ${n+1}: ${i.name==='w'?'ciężar w kg':'powtórzenia'}`); });
    box.insertBefore(row,b); row.querySelector('input').focus(); return; }
  if(a==='del'){ if(!b.dataset.tarm){ b.dataset.tarm='1'; b.textContent='Usuń?'; b.classList.add('armed'); setTimeout(()=>{ if(b.isConnected){ delete b.dataset.tarm; b.textContent='×'; b.classList.remove('armed'); } },3000); return; }
    const id=b.dataset.tid; TR=TR.filter(t=>t.id!==id); saveTr(); trRender(); planRefresh(); cloud(db=>db.collection('treningi').doc(id).delete()); }
});
document.addEventListener('submit', e=>{
  const f=e.target; if(!f.matches('form.tr-log')) return; e.preventDefault();
  const p=PL.find(x=>x.id===trM.pid), d=p&&p.days.find(x=>x.id===trM.did); if(!d) return;
  const ex=[...f.querySelectorAll('.tr-ex')].map(box=>({n:box.dataset.n, sets:[...box.querySelectorAll('.tr-set')].map(r=>{ const w=gNum(r.querySelector('[name=w]').value), rp=Math.round(gNum(r.querySelector('[name=r]').value));
      return {w:isNaN(w)?0:Math.round(w*100)/100, r:isNaN(rp)?0:rp}; }).filter(s=>s.r>0)})).filter(x=>x.sets.length);
  if(!ex.length){ $('#trErr').textContent='Wpisz przynajmniej jedną serię (powtórzenia).'; return; }
  const t=trNorm(uid('t'),{pid:p.id, pn:p.n, did:d.id, dn:d.n, d:f.d.value||todayISO(), c:Date.now(), ex});
  TR=[t,...TR]; saveTr(); cloud(db=>{ const {id,...doc}=t; return db.collection('treningi').doc(id).set(doc); });
  trM={mode:'hist', pid:p.id}; trRender(); planRefresh();
});
document.addEventListener('keydown', e=>{
  if(!trM) return;
  if(e.key==='Escape'){ e.stopPropagation(); trM=null; trRender(); return; }
  if(e.key==='Enter' && e.target.matches && e.target.matches('.tr-set input')){ e.preventDefault();
    const all=[...document.querySelectorAll('#trModal .tr-set input')], i=all.indexOf(e.target); if(all[i+1]) all[i+1].focus(); }
}, true);

/* dymek z masą na wykresie */
function wTipShow(c){ const box=c.closest('.g-chart'), tip=box&&box.querySelector('.w-tip'); if(!tip) return;
  const r=c.getBoundingClientRect(), b=box.getBoundingClientRect();
  tip.innerHTML=`<b>${c.dataset.wv} kg</b><span>${c.dataset.wd}</span>${c.dataset.wc?`<i>${c.dataset.wc} kg od poprzedniego</i>`:''}`;
  tip.hidden=false; let x=r.left+r.width/2-b.left+box.scrollLeft; const w=tip.offsetWidth/2+6; x=Math.min(Math.max(x,w),box.scrollWidth-w);
  tip.style.left=x+'px'; const y=r.top+r.height/2-b.top; tip.style.top=y+'px'; tip.classList.toggle('below', y < tip.offsetHeight+22);
  box.querySelectorAll('circle.wdot').forEach(d=>d.removeAttribute('data-on')); }
const wTipHide = () => { const t=$('#wTip'); if(t) t.hidden=true; };
document.addEventListener('mouseover', e=>{ const c=e.target.closest&&e.target.closest('circle.whit'); if(c) wTipShow(c); else if(e.target.closest&&!e.target.closest('.w-tip')) wTipHide(); });
document.addEventListener('focusin', e=>{ if(e.target.matches&&e.target.matches('circle.whit')) wTipShow(e.target); });
document.addEventListener('focusout', e=>{ if(e.target.matches&&e.target.matches('circle.whit')) wTipHide(); });
document.addEventListener('click', e=>{ const c=e.target.closest&&e.target.closest('circle.whit'); if(!c) return; wTipShow(c);
  const l=$('#wList'); if(!l) return; l.open=true; wListOpen=true; const row=l.querySelector(`tr[data-wrow="${CSS.escape(c.dataset.wid)}"]`);
  if(row){ row.classList.add('w-hl'); setTimeout(()=>row.classList.remove('w-hl'),1600); row.scrollIntoView({block:'center',behavior:'smooth'}); const i=row.querySelector('[data-gk$="|v"]'); i&&setTimeout(()=>{ i.focus({preventScroll:true}); i.select(); },350); } });
document.addEventListener('toggle', e=>{ if(e.target.id==='wList') wListOpen=e.target.open; }, true);
