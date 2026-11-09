/* ════════════════════════════════════════════════════════════════════════
   SIŁOWNIA (INNE)
   ════════════════════════════════════════════════════════════════════════
   pGym()          – układ podstrony (kafle, plany, masa ciała, zakupy).
   weightChart()   – wykres masy ciała (SVG) z dymkami po najechaniu.
   G               – waga (G.w) i zakupy (G.z); gymWeightHtml(), gymShopHtml().
   PL              – plany treningowe (dni → ćwiczenia: seria, powtórzenia, RIR); planHtml().
   TR              – treningi (jak w GymRun: plan → dzień → okienko treningu, edycja z Historii); trModalHtml().
   ════════════════════════════════════════════════════════════════════════ */

function pGym(){
  return `<h1>Siłow<span class="acc">nia</span></h1>
  <div class="grid g4" id="gymCells">${gymCellsHtml()}</div>
  <section class="block"><div class="block-head"><h2>Trening</h2></div><div id="gymTr">${trBar()}</div></section>
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

const savePlans = () => store.set('planState', JSON.stringify(PL));
const plList = () => PL.slice().sort((a,b)=>a.o-b.o);
const plPush = p => cloud(db=>db.collection('plany').doc(p.id).set({n:p.n, o:p.o, days:p.days}));
function plUpdate(pid, fn){ const p=PL.find(x=>x.id===pid); if(!p) return; const np=plNorm(p.id, JSON.parse(JSON.stringify(p))); fn(np); PL=PL.map(x=>x.id===pid?np:x); savePlans(); planRefresh(); plPush(np); }
/* „Plany treningowe” na stronie: zwinięte karty planów. Kliknięcie planu → okienko z wyborem dnia (trM.mode 'pick'),
   tam „Edytuj plan” → okienko edycji planu (trM.mode 'pedit', planEditHtml). */
const plCnt = (n,a,b,c) => n+' '+(n===1?a:(n%10>=2&&n%10<=4&&(n%100<10||n%100>=20))?b:c);
function planHtml(){
  const L=plList();
  return `<div class="pl-cards">${L.map(p=>{ const last=typeof trFor==='function'&&trFor(p.id)[0];
      return `<button type="button" class="pl-card" data-tract="pick" data-pid="${esc(p.id)}"><span class="label">Plan</span><b>${esc(p.n)}</b>
        <span class="pl-cmeta">${plCnt(p.days.length,'dzień','dni','dni')} · ${plCnt(p.days.reduce((a,d)=>a+d.ex.length,0),'ćwiczenie','ćwiczenia','ćwiczeń')}</span>
        <span class="pl-cfoot"><span>${last?'ostatnio '+dPL(last.d)+' · '+esc(last.dn):'jeszcze nie robiony'}</span><span class="ht-go" aria-hidden="true">→</span></span></button>`; }).join('')}
    <form class="pl-new pl-card pl-cnew"><span class="label">Nowy plan</span><input name="n" placeholder="+ Nazwa planu" aria-label="Nazwa nowego planu" autocomplete="off" maxlength="60"></form></div>`;
}
/* edycja jednego planu (w okienku) */
function planEditHtml(P){
  const cur=PL.find(p=>p.id===P); if(!cur) return '<p class="nt-none">Plan został usunięty.</p>';
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
  return `<div class="pl-head"><input class="pl-in pl-pname" data-pk="${esc(P)}|||n" value="${esc(cur.n)}" aria-label="Nazwa planu" maxlength="60">
      <span class="pl-meta">${plCnt(cur.days.length,'dzień','dni','dni')} · ${plCnt(cur.days.reduce((a,d)=>a+d.ex.length,0),'ćwiczenie','ćwiczenia','ćwiczeń')}</span>
      <button type="button" class="td-btn" data-pact="delplan" data-pid="${esc(P)}">Usuń plan</button></div>
    <div class="plan">${days}<button type="button" class="pl-addday" data-pact="addday" data-pid="${esc(P)}"><span>+</span>Dodaj dzień</button></div>`;
}
function planRefresh(){
  const box=$('#gymPlan'); if(box && !box.contains(document.activeElement)) box.innerHTML=planHtml();
  const ed=$('#plEdit'); if(!ed||!trM||trM.mode!=='pedit') return;
  const a=document.activeElement, key=a&&a.dataset&&a.dataset.pk, nf=a&&a.closest&&a.closest('form.pl-addex'), nfDay=nf&&nf.dataset.did;
  ed.innerHTML=planEditHtml(trM.pid);
  if(key){ const el=ed.querySelector(`[data-pk="${CSS.escape(key)}"]`); if(el){ el.focus(); el.select&&el.select(); } }
  else if(nfDay){ const el=ed.querySelector(`form.pl-addex[data-did="${CSS.escape(nfDay)}"] input`); el&&el.focus(); }
}
document.addEventListener('submit', e=>{
  const f=e.target;
  if(f.matches('form.pl-new')){ e.preventDefault(); const n=f.n.value.trim(); if(!n) return;
    const p=plNorm(uid('p'),{n, o:Math.max(-1,...PL.map(x=>x.o))+1, days:[{id:uid('d'),n:'Dzień 1',tag:'',ex:[]}]});
    PL=[...PL,p]; savePlans(); f.n.value=''; document.activeElement.blur(); planRefresh(); plPush(p);
    trM={mode:'pedit', pid:p.id}; trRender(); return; }
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
  const b=e.target.closest('[data-pact]'); if(!b) return;
  const a=b.dataset.pact, pid=b.dataset.pid;
  if(a==='addday'){ plUpdate(pid, p=>{ p.days.push({id:uid('d'), n:'Dzień '+(p.days.length+1), tag:'', ex:[]}); });
    setTimeout(()=>{ const ins=document.querySelectorAll('#plEdit .pl-dname'); const el=ins[ins.length-1]; if(el){ el.focus(); el.select(); } },0); return; }
  if(!b.dataset.parm){ b.dataset.parm='1'; const o=b.textContent; b.dataset.otext=o; b.textContent=a==='delplan'?'Na pewno usunąć plan?':'Usuń?'; b.classList.add('armed');
    setTimeout(()=>{ if(b.isConnected){ delete b.dataset.parm; b.textContent=b.dataset.otext; b.classList.remove('armed'); } },3000); return; }
  if(a==='delex') plUpdate(pid, p=>{ const d=p.days.find(x=>x.id===b.dataset.did); if(d) d.ex=d.ex.filter(x=>x.id!==b.dataset.eid); });
  else if(a==='delday') plUpdate(pid, p=>{ p.days=p.days.filter(x=>x.id!==b.dataset.did); });
  else if(a==='delplan'){ PL=PL.filter(p=>p.id!==pid); savePlans(); trM=null; trRender(); planRefresh(); cloud(db=>db.collection('plany').doc(pid).delete()); }
});


/* ——— TRENING (jak w GymRun): Rozpocznij trening → wybór planu → wybór dnia → okienko treningu ———
   Zapis: każda zmiana zapisuje się sama (trSave po ~0,7 s), więc można zamknąć okienko między seriami.
   Seria: ciężar, powtórzenia i ✓ (zrobiona). ✓ przy pustych polach wpisuje wartości z poprzedniego treningu.
   Po ✓ liczy się przerwa (pasek na dole okienka). Każdy zapisany trening da się otworzyć z Historii i poprawić.
   TR – zapisane treningi (chmura: kolekcja „treningi”):
     pid/pn plan · did/dn dzień · d data · c kolejność · s start (ms) · e koniec (ms, 0 = w trakcie)
     ex [{n nazwa, z zamiast (ćwiczenie z planu wymienione „Zmień”), sets:[{w kg, r powtórzenia, ok zrobiona}]}] */
const trNorm = (id,v={}) => ({id, pid:String(v.pid||''), pn:String(v.pn||''), did:String(v.did||''), dn:String(v.dn||''), d:String(v.d||''), c:+v.c||0, s:+v.s||0, e:+v.e||0,
  ex:(Array.isArray(v.ex)?v.ex:[]).map(e=>({n:String(e.n||''), z:String(e.z||''), sets:(Array.isArray(e.sets)?e.sets:[]).map(s=>({w:+s.w||0, r:+s.r||0, ok:!!s.ok}))}))});
let TR = [];
/* lista ćwiczeń do „Zmień” (własne dopisane + wszystkie z planów i treningów); chmura: cfg → „cwiczenia” */
let CWL = []; try{ const c=JSON.parse(store.get('cwiczenia','null')); if(Array.isArray(c)) CWL=c.map(String); }catch(e){}
const saveCwl = () => { store.set('cwiczenia', JSON.stringify(CWL)); cloud(db=>db.collection('cfg').doc('cwiczenia').set({l:CWL})); };
function cwlFromCloud(l){ if(!Array.isArray(l)) return; CWL=l.map(String); store.set('cwiczenia', JSON.stringify(CWL)); }
function cwlAll(){ const m=new Map(), add=n=>{ n=String(n||'').trim(); if(n && !m.has(trKey(n))) m.set(trKey(n), n); };
  CWL.forEach(add); PL.forEach(p=>p.days.forEach(d=>d.ex.forEach(e=>add(e.n)))); TR.forEach(t=>t.ex.forEach(e=>add(e.n)));
  return [...m.values()].sort((a,b)=>a.localeCompare(b,'pl')); }
try{ const c=JSON.parse(store.get('trState','null')); if(Array.isArray(c)) TR=c.map(t=>trNorm(t.id,t)); }catch(e){}
const saveTr = () => store.set('trState', JSON.stringify(TR));
let trM = null;   /* {mode:'plans'|'pick'|'log'|'hist', pid, did, d, tid} — tid = otwarty (zapisany) trening */
let trRestT = 0;  /* kiedy zaznaczono ostatnią serię (przerwa) */
const trAll = () => TR.slice().sort((a,b)=>(b.d||'').localeCompare(a.d||'')||b.c-a.c);
const trFor = pid => trAll().filter(t=>t.pid===pid);
const trKey = n => n.trim().toLowerCase();
const trLast = (pid,did,n,skip) => { const A=trAll().filter(t=>t.id!==skip);
  for(const L of [A.filter(t=>t.pid===pid&&t.did===did), A]) for(const t of L){ const e=t.ex.find(x=>trKey(x.n)===trKey(n)); if(e&&e.sets.length) return {t,e}; }
  return null; };
const trSetsN = s => { const m=String(s).match(/\d+/); return Math.min(10,Math.max(1, m?+m[0]:3)); };
const trW = w => fmt(w, Number.isInteger(w)?0:1);
const trVol = t => t.ex.reduce((a,e)=>a+e.sets.reduce((b,s)=>b+s.w*s.r,0),0);
const trSetsDone = t => t.ex.reduce((a,e)=>a+e.sets.filter(s=>s.ok).length,0);
const trMin = t => t.s&&t.e&&t.e>t.s ? Math.round((t.e-t.s)/60000) : 0;
const trClock = ms => { const s=Math.max(0,Math.floor(ms/1000)), h=Math.floor(s/3600), m=Math.floor(s%3600/60), x=s%60; return (h?h+':'+String(m).padStart(2,'0'):m)+':'+String(x).padStart(2,'0'); };
/* trening dzisiejszy w trakcie (niezakończony) — do przycisku „Kontynuuj” */
const trOpen = () => TR.find(t=>t.d===todayISO() && !t.e);
/* trening z tego samego dnia planu i tej samej daty (do dopisywania kolejnych serii) */
const trOpenId = (pid,did,d) => { const t=TR.find(x=>x.pid===pid && x.did===did && x.d===(d||todayISO())); return t?t.id:''; };
/* następny dzień w kolejce: ten po ostatnio zrobionym */
const trNext = p => { const last=trFor(p.id)[0]; if(!last||!p.days.length) return p.days[0]&&p.days[0].id; const i=p.days.findIndex(d=>d.id===last.did); return p.days[(i+1)%p.days.length].id; };

/* pasek na stronie Siłowni */
function trBar(){ const o=trOpen(), n=TR.length;
  return `<div class="tr-bar">${o?`<button type="button" class="tr-btn tr-main" data-tract="edit" data-tid="${esc(o.id)}"><span aria-hidden="true">▶</span> Kontynuuj trening · ${esc(o.dn||'Trening')}<small>zrobione serie: ${trSetsDone(o)}</small></button>`
      :`<button type="button" class="tr-btn tr-main" data-tract="plans"><span aria-hidden="true">▶</span> Rozpocznij trening</button>`}
    <button type="button" class="tr-btn" data-tract="hist">Historia${n?` <span class="ct">${n}</span>`:''}</button></div>`; }
function trBarRefresh(){ const b=$('#gymTr'); if(b) b.innerHTML=trBar(); }

function trModalHtml(){
  const close=`<button type="button" class="tr-x" data-tract="close" aria-label="Zamknij">✕</button>`;
  if(trM.mode==='plans'){ const L=plList();
    return `<div class="tr-top"><div><span class="label">Rozpocznij trening</span><h2>Wybierz plan</h2></div>${close}</div>
      <div class="tr-days">${L.map(p=>{ const last=trFor(p.id)[0];
        return `<button type="button" class="tr-day" data-tract="pick" data-pid="${esc(p.id)}"><b>${esc(p.n)}</b><span class="tr-sub">${p.days.length} ${p.days.length===1?'dzień':'dni'} · ${p.days.reduce((a,d)=>a+d.ex.length,0)} ćwiczeń</span><span class="tr-sub">${last?'ostatnio '+dPL(last.d)+' · '+esc(last.dn):'jeszcze nie robiony'}</span></button>`; }).join('')||'<p class="nt-none">Nie masz jeszcze planów — dodaj je w „Plany treningowe”.</p>'}</div>`; }
  if(trM.mode==='pick'){ const p=PL.find(x=>x.id===trM.pid); if(!p) return '';
    const nx=trNext(p);
    return `<div class="tr-top"><div>${PL.length>1?'<button type="button" class="tr-back" data-tract="plans">← Plany</button>':''}<span class="label">${esc(p.n)}</span><h2>Który dzień robisz?</h2></div>${close}</div>
      <div class="tr-days">${p.days.map(d=>{ const last=trFor(p.id).find(t=>t.did===d.id);
        return `<button type="button" class="tr-day${d.id===nx?' nx':''}" data-tract="day" data-did="${esc(d.id)}">${d.id===nx?'<span class="tr-nx">Następny</span>':''}<b>${esc(d.n||'Dzień')}</b>${d.tag?`<span class="tr-tag">${esc(d.tag)}</span>`:''}<span class="tr-sub">${d.ex.length} ćwiczeń · ${last?'ostatnio '+dPL(last.d):'jeszcze nie robiony'}</span></button>`; }).join('')||'<p class="nt-none">Ten plan nie ma jeszcze dni.</p>'}</div>
      <div class="tr-pfoot"><button type="button" class="td-btn" data-tract="pedit" data-pid="${esc(p.id)}">Edytuj plan</button></div>`; }
  if(trM.mode==='pedit'){ const p=PL.find(x=>x.id===trM.pid);
    return `<div class="tr-top"><div><button type="button" class="tr-back" data-tract="pick" data-pid="${esc(trM.pid)}">← Wybór dnia</button><span class="label">Edycja planu</span><h2>${esc(p?p.n:'Plan')}</h2></div>${close}</div>
      <div id="plEdit">${planEditHtml(trM.pid)}</div>`; }
  if(trM.mode==='log') return trLogHtml(close);
  /* historia: wszystkie treningi, od najnowszego */
  const H=trAll(), mies={}; H.forEach(t=>{ const k=(t.d||'').slice(0,7); (mies[k]=mies[k]||[]).push(t); });
  return `<div class="tr-top"><div><span class="label">Siłownia</span><h2>Historia treningów</h2></div>${close}</div>
    ${H.length?Object.entries(mies).map(([m,L])=>`<h3 class="tr-mh">${m?esc(new Date(m+'-01T12:00').toLocaleDateString('pl-PL',{month:'long',year:'numeric'})):'Bez daty'}<span>${L.length} ${L.length===1?'trening':(L.length%10>=2&&L.length%10<=4&&(L.length%100<10||L.length%100>=20))?'treningi':'treningów'}</span></h3>
      <div class="tr-hist">${L.map(t=>`<article class="tr-entry"><div class="tr-eh"><div><b>${esc(t.dn||'Trening')}</b><span class="tr-sub">${dPL(t.d)} · ${esc(t.pn)}${trMin(t)?` · ${trMin(t)} min`:''} · objętość ${fmt(trVol(t),0)} kg${!t.e&&t.d===todayISO()?' · <i class="tr-live">w trakcie</i>':''}</span></div>
        <div class="tr-eacts"><button type="button" class="td-btn" data-tract="edit" data-tid="${esc(t.id)}">Edytuj</button><button type="button" class="g-del" data-tract="del" data-tid="${esc(t.id)}" aria-label="Usuń trening">×</button></div></div>
        <table class="tr-ht"><tbody>${t.ex.filter(e=>e.sets.length).map(e=>`<tr><td>${esc(e.n)}</td><td>${e.sets.map(s=>`<span class="tr-pill">${trW(s.w)}×${s.r||'?'}</span>`).join('')}</td></tr>`).join('')}</tbody></table></article>`).join('')}</div>`).join('')
    :`<div class="nt-blank"><p>Brak zapisanych treningów. Kliknij „Rozpocznij trening”.</p></div>`}`;
}
/* okienko treningu */
function trLogHtml(close){
  const T=trM.tid?TR.find(x=>x.id===trM.tid):null, p=PL.find(x=>x.id===trM.pid);
  let d=p&&p.days.find(x=>x.id===trM.did);
  if(!d && T) d={id:T.did, n:T.dn, ex:[]};             /* dzień albo plan usunięty — edycja z samego zapisu */
  if(!d) return '';
  const exs=d.ex.map(e=>{ const S=T&&T.ex.find(x=>x.z&&trKey(x.z)===trKey(e.n)); return S?{...e, n:S.n, z:e.n}:{...e, z:''}; });
  if(T) T.ex.forEach(e=>{ if(!exs.some(x=>trKey(x.n)===trKey(e.n))) exs.push({n:e.n, z:e.z, s:'', r:'', rir:''}); });
  const done=T?trSetsDone(T):0, all=exs.reduce((a,e)=>a+trExN(e,d.id,T),0);
  const live=!T || (!T.e && T.d===todayISO());
  return `<form class="tr-log"><div class="tr-top"><div><span class="label">${esc(p?p.n:T.pn)}</span><h2>${esc(d.n||'Trening')}</h2></div>${close}</div>
    <div class="tr-meta"><label><span class="label">Data</span><input type="date" name="d" value="${esc(trM.d||todayISO())}" required></label>
      <div class="tr-stats"><div><span class="label">Serie</span><b id="trProg">${done} / ${all}</b></div><div><span class="label">${live?'Czas':'Trwał'}</span><b id="trTime" data-s="${T&&T.s||''}" data-live="${live?1:''}">${T&&T.s?(live?trClock(Date.now()-T.s):(trMin(T)?trMin(T)+' min':'—')):'0:00'}</b></div></div></div>
    <div class="tr-exs">${exs.map(e=>trExHtml(e,d.id,T)).join('')||'<p class="nt-none">Ten dzień nie ma ćwiczeń.</p>'}</div>
    <div class="tr-foot"><span class="tr-err" id="trErr"></span><span class="tr-st" id="trSt">${T?'Zapisano · zmiany zapisują się same':'Zapisuje się samo w trakcie'}</span><button type="button" class="td-btn" data-tract="close">Zamknij</button><button type="submit" class="tr-save">${live?'Zakończ trening':'Gotowe'}</button></div>
    <div class="tr-rest" id="trRest" hidden><span>Przerwa</span><b>0:00</b><button type="button" data-tract="resthide" aria-label="Ukryj przerwę">✕</button></div></form>`;
}
/* jedno ćwiczenie w okienku treningu; e = {n, z, s, r, rir}; z = ćwiczenie z planu, które zastępuje */
const trExN = (e,did,T) => { const L=trLast(trM.pid,did,e.n,trM.tid), Z=T&&T.ex.find(x=>trKey(x.n)===trKey(e.n)); return Math.max(e.s?trSetsN(e.s):1, L?L.e.sets.length:0, Z?Z.sets.length:0); };
function trExHtml(e, did, T){
  const L=trLast(trM.pid,did,e.n,trM.tid), Z=T&&T.ex.find(x=>trKey(x.n)===trKey(e.n)), n=trExN(e,did,T);
  return `<div class="tr-ex" data-n="${esc(e.n)}" data-z="${esc(e.z||'')}" data-s="${esc(e.s||'')}" data-r="${esc(e.r||'')}" data-rir="${esc(e.rir??'')}">
    <div class="tr-exh"><b>${esc(e.n)}</b><button type="button" class="tr-chg" data-tract="swap" aria-expanded="false">Zmień</button>${e.s||e.r?`<span class="tr-goal">${esc(e.s)} × ${esc(e.r)}${e.rir!==''&&e.rir!=null?` · RIR ${esc(e.rir)}`:''}</span>`:''}</div>
    ${e.z?`<p class="tr-zam">zamiast: ${esc(e.z)} <button type="button" data-tract="unswap">↺ przywróć</button></p>`:''}
    <div class="tr-swap" hidden></div>
    <div class="tr-grid"><span class="tr-gh">#</span><span class="tr-gh">Poprzednio</span><span class="tr-gh">kg</span><span class="tr-gh">Powt.</span><span class="tr-gh" aria-hidden="true">✓</span>
    ${Array.from({length:n},(_,si)=>trSetRow(si, L&&L.e.sets[si], Z&&Z.sets[si])).join('')}</div>
    <div class="tr-exf"><button type="button" class="tr-addset" data-tract="addset">+ seria</button><button type="button" class="tr-addset" data-tract="rmset">− seria</button></div></div>`;
}
/* lista „Zmień”: szukaj / dopisz nowe ćwiczenie, wybierz z listy */
function trSwapList(box, q){
  const cur=trKey(box.closest('.tr-ex').dataset.n), f=trKey(q||''), L=cwlAll().filter(n=>trKey(n)!==cur && (!f || trKey(n).includes(f)));
  const nowe=q&&q.trim()&&!cwlAll().some(n=>trKey(n)===f);
  return `${nowe?`<button type="button" class="tr-sw-add" data-tract="swapnew">+ Dodaj „${esc(q.trim())}” i wybierz</button>`:''}
    ${L.map(n=>`<div class="tr-sw-it"><button type="button" class="tr-sw-pick" data-tract="swappick" data-name="${esc(n)}">${esc(n)}</button>${CWL.some(x=>trKey(x)===trKey(n))?`<button type="button" class="tr-sw-del" data-tract="swapdel" data-name="${esc(n)}" aria-label="Usuń z listy">×</button>`:''}</div>`).join('')||(nowe?'':'<p class="tr-sw-none">Brak ćwiczeń — wpisz nazwę, żeby dodać.</p>')}`;
}
function trSwapOpen(ex){
  document.querySelectorAll('#trModal .tr-swap:not([hidden])').forEach(x=>{ x.hidden=true; x.closest('.tr-ex').querySelector('.tr-chg').setAttribute('aria-expanded','false'); });
  const box=ex.querySelector('.tr-swap'); box.hidden=false; ex.querySelector('.tr-chg').setAttribute('aria-expanded','true');
  box.innerHTML=`<div class="tr-sw-row"><input class="tr-sw-q" placeholder="Szukaj albo wpisz nowe ćwiczenie…" aria-label="Szukaj albo nowe ćwiczenie" autocomplete="off" maxlength="80"><button type="button" class="tr-sw-plus" data-tract="swapadd" title="Dodaj wpisane ćwiczenie do listy (bez wymiany)">+ Dodaj do listy</button></div><p class="tr-sw-msg" aria-live="polite"></p><div class="tr-sw-l">${trSwapList(box,'')}</div>`;
  if(!matchMedia('(pointer:coarse)').matches) box.querySelector('input').focus();
}
/* wymiana ćwiczenia tylko w tym treningu (plan zostaje bez zmian); wpisane serie przechodzą na nowe ćwiczenie */
function trSwapTo(ex, name){
  name=String(name||'').trim(); if(!name) return;
  const f=ex.closest('form'), T=trM.tid?TR.find(x=>x.id===trM.tid):null, sets=[...ex.querySelectorAll('.tr-set')];
  const orig=ex.dataset.z||ex.dataset.n, back=trKey(name)===trKey(orig);
  const e={n:name, z:back?'':orig, s:ex.dataset.s, r:ex.dataset.r, rir:ex.dataset.rir};
  const tmp=document.createElement('div'); tmp.innerHTML=trExHtml(e, trM.did, T&&{...T, ex:T.ex.filter(x=>trKey(x.n)!==trKey(name))}); const nw=tmp.firstElementChild;
  /* przenieś to, co już wpisane */
  const rows=nw.querySelector('.tr-grid'); sets.forEach((r,i)=>{ let t=rows.querySelectorAll('.tr-set')[i]; if(!t){ const x=document.createElement('div'); x.innerHTML=trSetRow(i,null,null); t=x.firstElementChild; rows.appendChild(t); }
    t.querySelector('[name=w]').value=r.querySelector('[name=w]').value; t.querySelector('[name=r]').value=r.querySelector('[name=r]').value;
    if(r.classList.contains('ok')){ t.classList.add('ok'); t.querySelector('.tr-ok').setAttribute('aria-pressed','true'); } });
  ex.replaceWith(nw); trProg(); trSave(f);
}
function trSetRow(si, ps, zs){
  return `<div class="tr-set${zs&&zs.ok?' ok':''}"><span class="tr-sn">${si+1}</span><span class="tr-prev">${ps?`${trW(ps.w)}×${ps.r||'?'}`:'—'}</span>
    <input name="w" value="${zs&&zs.w?String(zs.w).replace('.',','):''}" inputmode="decimal" placeholder="${ps?trW(ps.w):'kg'}" data-p="${ps?ps.w:''}" aria-label="Seria ${si+1}: ciężar w kg" autocomplete="off">
    <input name="r" value="${zs&&zs.r?zs.r:''}" inputmode="numeric" placeholder="${ps?ps.r:'powt.'}" data-p="${ps?ps.r:''}" aria-label="Seria ${si+1}: powtórzenia" autocomplete="off">
    <button type="button" class="tr-ok" data-tract="done" aria-pressed="${zs&&zs.ok?'true':'false'}" aria-label="Seria ${si+1} zrobiona">✓</button></div>`;
}
function trRender(){
  let sc=$('#trScrim'), md=$('#trModal');
  if(!trM || !$('#gymPlan')){ sc&&sc.remove(); md&&md.remove(); trM=null; document.body.classList.remove('tr-lock'); trBarRefresh(); return; }
  if(!md){ sc=document.createElement('div'); sc.id='trScrim'; sc.className='tr-scrim'; document.body.appendChild(sc);
    md=document.createElement('div'); md.id='trModal'; md.className='tr-modal'; md.setAttribute('role','dialog'); md.setAttribute('aria-modal','true'); document.body.appendChild(md); }
  document.body.classList.add('tr-lock'); md.classList.toggle('tr-sess', trM.mode==='log'); md.classList.toggle('tr-wide', trM.mode==='pedit'); md.innerHTML=`<div class="tr-panel">${trModalHtml()}</div>`; md.scrollTop=0;
  if(trM.mode==='log'){ const ins=[...md.querySelectorAll('.tr-set input')], f=ins.find(i=>!i.value)||ins[0]; if(f && !matchMedia('(pointer:coarse)').matches) setTimeout(()=>f.focus(),30); trTick(); }
}
function trRefresh(){ if(trM && trM.mode==='hist') trRender(); trBarRefresh(); }
/* zegar treningu i przerwy (co sekundę, tylko gdy okienko treningu jest otwarte) */
function trTick(){ const t=$('#trTime'); if(t&&t.dataset.live&&t.dataset.s) t.textContent=trClock(Date.now()-+t.dataset.s);
  const r=$('#trRest'); if(r){ r.hidden=!trRestT; if(trRestT) r.querySelector('b').textContent=trClock(Date.now()-trRestT); } }
setInterval(()=>{ if(trM&&trM.mode==='log') trTick(); }, 1000);
function trProg(){ const f=$('form.tr-log'), el=$('#trProg'); if(!f||!el) return; el.textContent=`${f.querySelectorAll('.tr-set.ok').length} / ${f.querySelectorAll('.tr-set').length}`; }

/* odczyt formularza; seria liczy się, gdy ma ciężar, powtórzenia albo ✓ */
function trRead(f){ return [...f.querySelectorAll('.tr-ex')].map(box=>({n:box.dataset.n, z:box.dataset.z||'', sets:[...box.querySelectorAll('.tr-set')].map(r=>{ const w=gNum(r.querySelector('[name=w]').value), rp=Math.round(gNum(r.querySelector('[name=r]').value));
      return {w:isNaN(w)?0:Math.round(w*100)/100, r:isNaN(rp)?0:rp, ok:r.classList.contains('ok')}; })})).map(x=>{ let L=x.sets.length; while(L&&!x.sets[L-1].w&&!x.sets[L-1].r&&!x.sets[L-1].ok) L--; return {...x, sets:x.sets.slice(0,L)}; }).filter(x=>x.sets.length||x.z); }   /* wymienione ćwiczenie zostaje zapisane nawet bez serii */
/* zapis (nowy albo aktualizacja otwartego treningu); fin = zakończ; zwraca false, gdy nie ma nic do zapisania */
function trSave(f, fin){
  if(!trM||trM.mode!=='log') return false;
  const p=PL.find(x=>x.id===trM.pid), T=trM.tid?TR.find(x=>x.id===trM.tid):null, d=(p&&p.days.find(x=>x.id===trM.did))||(T&&{id:T.did,n:T.dn});
  if(!d) return false;
  const ex=trRead(f), date=f.d.value||todayISO();
  if(!ex.some(x=>x.sets.length)){ if(T){ TR=TR.filter(x=>x.id!==T.id); trM.tid=''; saveTr(); trBarRefresh(); cloud(db=>db.collection('treningi').doc(T.id).delete()); } return false; }
  const now=Date.now(), s0=T&&T.s?T.s:now;
  const t=trNorm(T?T.id:uid('t'),{pid:trM.pid, pn:p?p.n:T.pn, did:d.id, dn:d.n, d:date, c:T?T.c:now, s:s0, e:fin?(T&&T.e?T.e:now):(T?T.e:0), ex});
  TR=T?TR.map(x=>x.id===t.id?t:x):[t,...TR]; trM.tid=t.id; trM.d=date; saveTr(); trBarRefresh();
  cloud(db=>{ const {id,...doc}=t; return db.collection('treningi').doc(id).set(doc); });
  const st=$('#trSt'); if(st) st.textContent='Zapisano '+new Date().toLocaleTimeString('pl-PL',{hour:'2-digit',minute:'2-digit'});
  const tm=$('#trTime'); if(tm && !tm.dataset.s){ tm.dataset.s=String(s0); }
  return true;
}
let trTimer=null;
const trFlush = () => { if(!trTimer) return; clearTimeout(trTimer); trTimer=null; const f=$('form.tr-log'); if(f) trSave(f); };
const trSoon = f => { const st=$('#trSt'); if(st) st.textContent='zapisywanie…'; const er=$('#trErr'); if(er) er.textContent='';
  clearTimeout(trTimer); trTimer=setTimeout(()=>{ trTimer=null; trSave(f); },700); };
const trClose = () => { trFlush(); trM=null; trRestT=0; trRender(); };

document.addEventListener('click', e=>{
  if(e.target.id==='trScrim' || e.target.id==='trModal') return trClose();
  const b=e.target.closest('[data-tract]'); if(!b) return;
  const a=b.dataset.tract;
  if(a==='plans'){ trFlush(); trM={mode:'plans'}; return trRender(); }
  if(a==='pick'){ trM={mode:'pick', pid:b.dataset.pid}; return trRender(); }
  if(a==='hist'){ trFlush(); trM={mode:'hist'}; return trRender(); }
  if(a==='pedit'){ trM={mode:'pedit', pid:b.dataset.pid}; return trRender(); }
  if(a==='day'){ trRestT=0; trM={mode:'log', pid:trM.pid, did:b.dataset.did, d:todayISO(), tid:trOpenId(trM.pid,b.dataset.did,todayISO())}; return trRender(); }
  if(a==='edit'){ const t=TR.find(x=>x.id===b.dataset.tid); if(!t) return; trRestT=0; trM={mode:'log', pid:t.pid, did:t.did, d:t.d, tid:t.id}; return trRender(); }
  if(a==='close') return trClose();
  if(a==='swap'){ const ex=b.closest('.tr-ex'), box=ex.querySelector('.tr-swap'); if(!box.hidden){ box.hidden=true; b.setAttribute('aria-expanded','false'); return; } return trSwapOpen(ex); }
  if(a==='swappick') return trSwapTo(b.closest('.tr-ex'), b.dataset.name);
  if(a==='swapnew'){ const ex=b.closest('.tr-ex'), q=ex.querySelector('.tr-sw-q').value.trim(); if(!q) return;
    if(!CWL.some(x=>trKey(x)===trKey(q))){ CWL=[...CWL,q]; saveCwl(); } return trSwapTo(ex, q); }
  if(a==='swapadd'){ const box=b.closest('.tr-swap'), inp=box.querySelector('.tr-sw-q'), q=inp.value.trim(), msg=box.querySelector('.tr-sw-msg');
    if(!q){ msg.textContent='Wpisz nazwę ćwiczenia w polu obok.'; inp.focus(); return; }
    if(cwlAll().some(x=>trKey(x)===trKey(q))){ msg.textContent=`„${q}” już jest na liście.`; }
    else { CWL=[...CWL,q]; saveCwl(); msg.textContent=`Dodano „${q}” do listy.`; }
    inp.value=''; box.querySelector('.tr-sw-l').innerHTML=trSwapList(box,''); inp.focus(); return; }
  if(a==='swapdel'){ const n=b.dataset.name; CWL=CWL.filter(x=>trKey(x)!==trKey(n)); saveCwl(); const box=b.closest('.tr-swap'); box.querySelector('.tr-sw-l').innerHTML=trSwapList(box, box.querySelector('.tr-sw-q').value); return; }
  if(a==='unswap'){ const ex=b.closest('.tr-ex'); return trSwapTo(ex, ex.dataset.z); }
  if(a==='resthide'){ trRestT=0; return trTick(); }
  if(a==='done'){ const row=b.closest('.tr-set'), w=row.querySelector('[name=w]'), r=row.querySelector('[name=r]'), on=!row.classList.contains('ok');
    if(on){ const pr=row.previousElementSibling&&row.previousElementSibling.classList.contains('tr-set')?row.previousElementSibling:null;   /* brak poprzedniego treningu → jak seria wyżej */
      if(!w.value) w.value=w.dataset.p?String(w.dataset.p).replace('.',','):(pr?pr.querySelector('[name=w]').value:'');
      if(!r.value) r.value=r.dataset.p||(pr?pr.querySelector('[name=r]').value:''); }
    row.classList.toggle('ok',on); b.setAttribute('aria-pressed',String(on)); trRestT=on?Date.now():trRestT; trTick(); trProg(); trSoon(b.closest('form'));
    if(on){ const nx=[...document.querySelectorAll('#trModal .tr-set:not(.ok) input[name=w]')].find(i=>i.compareDocumentPosition(w)&Node.DOCUMENT_POSITION_PRECEDING); if(nx && !matchMedia('(pointer:coarse)').matches) nx.focus(); }
    return; }
  if(a==='addset'){ const box=b.closest('.tr-ex').querySelector('.tr-grid'), n=box.querySelectorAll('.tr-set').length; if(n>=12) return;
    const last=box.querySelector('.tr-set:last-of-type'), tmp=document.createElement('div');
    tmp.innerHTML=trSetRow(n, null, null); const row=tmp.firstChild;
    if(last){ const lw=last.querySelector('[name=w]'), lr=last.querySelector('[name=r]');   /* podpowiedź = poprzednia seria */
      row.querySelector('[name=w]').placeholder=lw.value||lw.placeholder; row.querySelector('[name=w]').dataset.p=(lw.value||lw.dataset.p||'').replace(',','.');
      row.querySelector('[name=r]').placeholder=lr.value||lr.placeholder; row.querySelector('[name=r]').dataset.p=lr.value||lr.dataset.p||''; }
    box.appendChild(row); trProg(); if(!matchMedia('(pointer:coarse)').matches) row.querySelector('input').focus(); return; }
  if(a==='rmset'){ const L=b.closest('.tr-ex').querySelectorAll('.tr-set'); if(L.length<=1) return; L[L.length-1].remove(); trProg(); trSoon(b.closest('form')); return; }
  if(a==='del'){ if(!b.dataset.tarm){ b.dataset.tarm='1'; b.textContent='Usuń?'; b.classList.add('armed'); setTimeout(()=>{ if(b.isConnected){ delete b.dataset.tarm; b.textContent='×'; b.classList.remove('armed'); } },3000); return; }
    const id=b.dataset.tid; TR=TR.filter(t=>t.id!==id); saveTr(); trRender(); trBarRefresh(); cloud(db=>db.collection('treningi').doc(id).delete()); }
});
document.addEventListener('input', e=>{
  if(e.target.classList&&e.target.classList.contains('tr-sw-q')){ const box=e.target.closest('.tr-swap'); box.querySelector('.tr-sw-l').innerHTML=trSwapList(box, e.target.value); return; }
  const f=e.target.closest&&e.target.closest('form.tr-log'); if(f) trSoon(f); });
document.addEventListener('submit', e=>{
  const f=e.target; if(!f.matches('form.tr-log')) return; e.preventDefault();
  clearTimeout(trTimer); trTimer=null;
  if(!trSave(f,true)){ $('#trErr').textContent='Wpisz przynajmniej jedną serię.'; return; }
  trRestT=0; trM={mode:'hist'}; trRender();
});
document.addEventListener('keydown', e=>{
  if(!trM) return;
  if(e.key==='Escape' && !(e.target.classList && e.target.classList.contains('tr-sw-q'))){ e.stopPropagation(); trClose(); return; }
  if(e.key==='Enter' && e.target.classList && e.target.classList.contains('tr-sw-q')){ e.preventDefault();
    const box=e.target.closest('.tr-swap'), first=box.querySelector('.tr-sw-add,.tr-sw-pick'); if(first) first.click(); return; }
  if(e.key==='Escape' && e.target.classList && e.target.classList.contains('tr-sw-q')){ e.stopPropagation(); const ex=e.target.closest('.tr-ex'); ex.querySelector('.tr-swap').hidden=true; ex.querySelector('.tr-chg').setAttribute('aria-expanded','false'); return; }
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
