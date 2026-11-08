/* ════════════════════════════════════════════════════════════════════════
   PIENIĄDZE (INNE) — karty paneli + okienko „Zakłady” (bukmacherka)
   ════════════════════════════════════════════════════════════════════════
   pPieniadze()  – strona z kartami paneli; każda karta otwiera okienko (.tr-modal z Siłowni).
                   Nowy panel (np. „Finanse”): dopisz kartę w pPieniadze() i własne okienko.

   ZAKŁADY (bukmacherka) — śledzenie wpłat i wypłat u bukmacherów w czasie.
   bkLimit  – miesięczny limit wpłat (wszystkie konta razem; chmura: kolekcja „bukCfg”, dokument „limit”).
              Kafel „Limit wpłat”: pasek zapełnienia, żółty od 80%, czerwony po przekroczeniu. 0 = brak limitu.
   BK.konta  – konta u bukmacherów (chmura: kolekcja „bukKonta”, kopia w przeglądarce)
     n      nazwa (Superbet, Fortuna…)      st   'akt' aktywne · 'zam' zamknięte
     start  bilans sprzed zapisywania operacji (np. stare konto bez rozpisanych wpłat)
     o      kolejność
   BK.ops    – operacje (chmura: kolekcja „bukOps”)
     k  id konta   t  'wp' wpłata · 'wy' wypłata   d  data   a  kwota (zawsze dodatnia)   c  kolejność dodania
   Bilans = wypłaty − wpłaty + start  (na plusie = wyciągnąłeś więcej, niż wpłaciłeś).
   Dane startowe (z Prywatne.xlsx) są w js/01-dane.js → BUK_START.
   ════════════════════════════════════════════════════════════════════════ */

const BK_TYP = {wp:'Wpłata', wy:'Wypłata'};
const bkIso = v => /^\d{4}-\d{2}-\d{2}$/.test(v);
const bkKNorm = (id,v={}) => ({id, n:String(v.n||'Bukmacher').slice(0,40), st:v.st==='zam'?'zam':'akt', start:isFinite(+v.start)?Math.round(+v.start*100)/100:0, o:+v.o||0});
const bkONorm = (id,v={}) => ({id, k:String(v.k||''), t:v.t==='wy'?'wy':'wp', d:bkIso(v.d)?v.d:todayISO(), a:Math.abs(Math.round((+v.a||0)*100)/100), c:+v.c||0});

let BK = {konta:[], ops:[]};
(()=>{ let k=null, o=null;
  try{ k=JSON.parse(store.get('bukKonta','null')); o=JSON.parse(store.get('bukOps','null')); }catch(e){}
  if(!Array.isArray(k) && !Array.isArray(o) && typeof BUK_START==='object'){ k=BUK_START.konta; o=BUK_START.ops; }   /* pierwszy raz: dane z Excela */
  BK.konta=(k||[]).map(x=>bkKNorm(x.id,x)); BK.ops=(o||[]).map(x=>bkONorm(x.id,x)); })();
const saveBk = () => { store.set('bukKonta', JSON.stringify(BK.konta)); store.set('bukOps', JSON.stringify(BK.ops)); };
const bkPushK = x => { const {id,...d}=x; cloud(db=>db.collection('bukKonta').doc(id).set(d)); };
const bkPushO = x => { const {id,...d}=x; cloud(db=>db.collection('bukOps').doc(id).set(d)); };

let bkM = false;                                  /* czy okienko jest otwarte */
let bkF = store.get('bukFiltr','all');            /* 'all' albo id konta */
let bkTyp = store.get('bukTyp','wp');             /* ostatnio wybrany typ w formularzu */
let bkLimit = Math.max(0, +store.get('bukLimit','0')||0);
const saveLimit = () => { store.set('bukLimit', String(bkLimit)); cloud(db=>db.collection('bukCfg').doc('limit').set({v:bkLimit})); };
/* limit wpłat w bieżącym miesiącu — zawsze dla wszystkich kont razem */
function bkLim(){ const m=todayISO().slice(0,7), wp=BK.ops.filter(o=>o.t==='wp'&&o.d.startsWith(m)).reduce((s,o)=>s+o.a,0), p=bkLimit?wp/bkLimit:0;
  return {wp, p, cls:!bkLimit?'':p>1.0001?'over':p>=0.8?'warn':'ok', zost:bkLimit-wp,
    mies:new Date().toLocaleDateString('pl-PL',{month:'long'})}; }

/* ——— liczenie ——— */
const bkKonta = () => [...BK.konta].sort((a,b)=>(a.st===b.st?0:a.st==='akt'?-1:1)||a.o-b.o);
const bkSort = L => [...L].sort((a,b)=>a.d.localeCompare(b.d)||a.c-b.c);
const bkSign = v => (v>0.004?'+':v<-0.004?'−':'')+fmt(Math.abs(v),2);
const bkCls = v => v>0.004?'bk-plus':v<-0.004?'bk-minus':'';
function bkSum(kid){   /* kid = 'all' albo id konta */
  const K=kid==='all'?BK.konta:BK.konta.filter(x=>x.id===kid), ids=new Set(K.map(x=>x.id));
  const ops=BK.ops.filter(o=>ids.has(o.k));
  const wp=ops.filter(o=>o.t==='wp'), wy=ops.filter(o=>o.t==='wy');
  const swp=wp.reduce((s,o)=>s+o.a,0), swy=wy.reduce((s,o)=>s+o.a,0), start=K.reduce((s,k)=>s+k.start,0);
  return {K, ops, wp:swp, wy:swy, nwp:wp.length, nwy:wy.length, start, bil:swy-swp+start};
}
const bkNazwa = id => (BK.konta.find(k=>k.id===id)||{n:'—'}).n;

/* ——— wykres: bilans narastająco (koniec każdego dnia) ——— */
function bkChart(S){
  const W=820,H=260,L=56,R=20,T=18,B=30, ops=bkSort(S.ops);
  if(!ops.length) return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Wykres bilansu"><text class="empty-chart" x="${W/2}" y="${H/2}" text-anchor="middle">Brak operacji — dodaj pierwszą wpłatę lub wypłatę.</text></svg>`;
  const dni=[]; let bil=S.start;
  ops.forEach(o=>{ bil+=o.t==='wy'?o.a:-o.a; const last=dni[dni.length-1];
    if(last&&last.d===o.d){ last.v=bil; last.ops.push(o); } else dni.push({d:o.d, v:bil, ops:[o]}); });
  const t=iso=>{ const [y,m,d]=iso.split('-').map(Number); return new Date(y,m-1,d).getTime(); };
  const t0=t(dni[0].d)-864e5, t1=Math.max(t(dni[dni.length-1].d), t(todayISO()), t0+2*864e5);   /* oś do dziś */
  const vs=[S.start,0,...dni.map(x=>x.v)]; let lo=Math.min(...vs), hi=Math.max(...vs); if(hi-lo<1){ hi+=1; lo-=1; }
  const raw=(hi-lo)/5, mag=Math.pow(10,Math.floor(Math.log10(raw))), step=[1,2,2.5,5,10].map(m=>m*mag).find(s=>s>=raw);
  lo=Math.floor(lo/step)*step; hi=Math.ceil(hi/step)*step;
  const X=v=>L+(v-t0)/(t1-t0)*(W-L-R), Y=v=>T+(hi-v)/(hi-lo)*(H-T-B);
  let g='';
  for(let v=lo; v<=hi+step/2; v+=step){ const z=Math.abs(v)<step/1e3; g+=`<line x1="${L}" x2="${W-R}" y1="${Y(v).toFixed(1)}" y2="${Y(v).toFixed(1)}" class="${z?'bk-zero':'bk-grid'}"/><text x="${L-8}" y="${(Y(v)+3.5).toFixed(1)}" text-anchor="end">${fmt(Math.round(v*100)/100, step<1?2:0)}</text>`; }
  /* podpisy miesięcy */
  const M=['sty','lut','mar','kwi','maj','cze','lip','sie','wrz','paź','lis','gru'];
  let mx='', d0=new Date(t0); d0=new Date(d0.getFullYear(), d0.getMonth()+1, 1); const mStep=Math.max(1, Math.ceil(((t1-t0)/(30*864e5))/8));
  for(let k=0; d0.getTime()<=t1 && k<120; k++, d0=new Date(d0.getFullYear(), d0.getMonth()+mStep, 1)){ const x=X(d0.getTime());
    mx+=`<line x1="${x.toFixed(1)}" x2="${x.toFixed(1)}" y1="${T}" y2="${H-B}" class="bk-grid"/><text x="${(x+4).toFixed(1)}" y="${H-10}">${M[d0.getMonth()]}${d0.getMonth()===0?' '+d0.getFullYear():''}</text>`; }
  /* linia schodkowa: od bilansu startowego, zmiana w dniu operacji */
  let path=`M${X(t0).toFixed(1)} ${Y(S.start).toFixed(1)}`, prev=S.start;
  dni.forEach(p=>{ const x=X(t(p.d)).toFixed(1); path+=` L${x} ${Y(prev).toFixed(1)} L${x} ${Y(p.v).toFixed(1)}`; prev=p.v; });
  const xe=X(t1).toFixed(1); path+=` L${xe} ${Y(prev).toFixed(1)}`;
  const area=path+` L${xe} ${Y(0).toFixed(1)} L${X(t0).toFixed(1)} ${Y(0).toFixed(1)} Z`;
  const dots=dni.map((p,i)=>{ const x=X(t(p.d)).toFixed(1), y=Y(p.v).toFixed(1), last=i===dni.length-1;
    const opis=p.ops.map(o=>`${o.t==='wy'?'+':'−'}${fmt(o.a,2)} ${o.t==='wy'?'wypłata':'wpłata'}${S.K.length>1?' · '+bkNazwa(o.k):''}`).join('|');
    return `<circle class="bk-dot ${bkCls(p.v)}" cx="${x}" cy="${y}" r="${last?5:3.5}"/>`
      + `<circle class="bk-hit" cx="${x}" cy="${y}" r="13" fill="transparent" tabindex="0" data-bd="${dPL(p.d)}" data-bv="${esc(bkSign(p.v))}" data-bo="${esc(opis)}" aria-label="${dPL(p.d)}: bilans ${esc(bkSign(p.v))} zł"/>`; }).join('');
  const lp=dni[dni.length-1];
  return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Wykres bilansu w czasie">${g}${mx}
    <clipPath id="bkUp"><rect x="0" y="0" width="${W}" height="${Y(0).toFixed(1)}"/></clipPath><clipPath id="bkDn"><rect x="0" y="${Y(0).toFixed(1)}" width="${W}" height="${H}"/></clipPath>
    <path d="${area}" class="bk-area-up" clip-path="url(#bkUp)"/><path d="${area}" class="bk-area-dn" clip-path="url(#bkDn)"/>
    <path d="${path}" class="bk-line"/>${dots}
    <text class="lbl" x="${(X(t(lp.d))-10).toFixed(1)}" y="${(Y(lp.v)+(lp.v>=0?-12:20)).toFixed(1)}" text-anchor="end">${esc(bkSign(lp.v))} zł</text></svg>`;
}

/* ——— okienko ——— */
function bkModalHtml(){
  if(bkF!=='all' && !BK.konta.some(k=>k.id===bkF)) bkF='all';
  const S=bkSum(bkF), K=bkKonta(), k=(a,id,f)=>esc(a+'|'+id+'|'+f);
  const mies=todayISO().slice(0,7), mo=S.ops.filter(o=>o.d.startsWith(mies)), mNet=mo.reduce((s,o)=>s+(o.t==='wy'?o.a:-o.a),0);
  const close=`<button type="button" class="tr-x" data-bkact="close" aria-label="Zamknij">✕</button>`;

  const chips=`<div class="bk-chips" role="tablist">${[['all','Wszystkie'],...K.map(x=>[x.id,x.n,x.st])].map(([id,n,st])=>`<button type="button" role="tab" class="bk-chip${st==='zam'?' zam':''}" data-bkf="${esc(id)}" aria-selected="${bkF===id}">${id!=='all'?'<i aria-hidden="true"></i>':''}${esc(n)}</button>`).join('')}</div>`;

  const LM=bkLim();
  const limCell=`<div class="cell bk-lim ${LM.cls}"><span class="label">Limit wpłat · ${LM.mies.slice(0,3)}.</span>
      <span class="big">${fmt(LM.wp,2)}<small>/</small><input class="bk-limin" data-bk="l|x|v" value="${bkLimit?fmt(bkLimit,bkLimit%1?2:0).replace(/\u00a0/g,''):''}" placeholder="—" inputmode="decimal" aria-label="Miesięczny limit wpłat w zł"><small>zł</small></span>
      <div class="bk-bar" aria-hidden="true"><i style="width:${Math.min(100,LM.p*100).toFixed(1)}%"></i></div>
      <p>${!bkLimit?'wpisz kwotę, żeby ustawić limit':LM.zost<-0.004?`przekroczony o ${fmt(-LM.zost,2)} zł`:`zostało ${fmt(LM.zost,2)} zł`}${bkF!=='all'?' · wszystkie konta':''}</p></div>`;
  const cells=`<div class="grid g4 px-cells bk-cells">
    <div class="cell"><span class="label">Bilans</span><span class="big ${bkCls(S.bil)}">${bkSign(S.bil)}<small>zł</small></span><p>${S.bil>=0?'wypłacono więcej, niż wpłacono':'wpłacono więcej, niż wypłacono'}</p></div>
    <div class="cell"><span class="label">Wpłacono</span><span class="big">${fmt(S.wp,2)}<small>zł</small></span><p>${S.nwp} ${S.nwp===1?'wpłata':S.nwp%10>=2&&S.nwp%10<=4&&(S.nwp%100<10||S.nwp%100>=20)?'wpłaty':'wpłat'}</p></div>
    <div class="cell"><span class="label">Wypłacono</span><span class="big">${fmt(S.wy,2)}<small>zł</small></span><p>${S.nwy} ${S.nwy===1?'wypłata':S.nwy%10>=2&&S.nwy%10<=4&&(S.nwy%100<10||S.nwy%100>=20)?'wypłaty':'wypłat'}${Math.abs(S.start)>0.004?` · ${bkSign(S.start)} zł sprzed zapisów`:''}</p></div>
    <div class="cell"><span class="label">Ten miesiąc</span><span class="big ${bkCls(mNet)}">${mo.length?bkSign(mNet):'0,00'}<small>zł</small></span><p>${mo.length?`${mo.length} ${mo.length===1?'operacja':mo.length<5?'operacje':'operacji'}`:'brak operacji'}</p></div>${limCell}</div>`;

  const aktywne=K.filter(x=>x.st==='akt'), domK=bkF!=='all'?bkF:(store.get('bukKonto','')&&BK.konta.some(x=>x.id===store.get('bukKonto',''))?store.get('bukKonto',''):(aktywne[0]||K[0]||{}).id);
  const add=K.length?`<form class="bk-add">
      <div class="bk-typ" role="radiogroup" aria-label="Rodzaj operacji">${Object.entries(BK_TYP).map(([v,n])=>`<label class="t-${v}"><input type="radio" name="t" value="${v}"${bkTyp===v?' checked':''}><span>${n}</span></label>`).join('')}</div>
      <input name="a" placeholder="Kwota" inputmode="decimal" autocomplete="off" aria-label="Kwota" required>
      <select name="k" aria-label="Konto">${K.map(x=>`<option value="${esc(x.id)}"${x.id===domK?' selected':''}>${esc(x.n)}${x.st==='zam'?' (zamknięte)':''}</option>`).join('')}</select>
      <input name="d" type="date" value="${todayISO()}" aria-label="Data" required>
      <button type="submit">Dodaj</button><span class="tr-err" id="bkErr"></span></form>`
    :'<p class="nt-none">Najpierw dodaj konto bukmachera niżej.</p>';

  /* historia (najnowsze na górze) z bilansem po operacji */
  let run=S.start; const after={}; bkSort(S.ops).forEach(o=>{ run+=o.t==='wy'?o.a:-o.a; after[o.id]=run; });
  const hist=[...bkSort(S.ops)].reverse().map(o=>`<tr class="bk-r-${o.t}">
      <td><input type="date" class="g-in g-date" data-bk="${k('o',o.id,'d')}" value="${esc(o.d)}" aria-label="Data"></td>
      ${K.length>1?`<td class="bk-kc"><select class="td-sel bk-sel" data-bk="${k('o',o.id,'k')}" aria-label="Konto">${K.map(x=>`<option value="${esc(x.id)}"${x.id===o.k?' selected':''}>${esc(x.n)}</option>`).join('')}</select></td>`:''}
      <td><select class="td-sel bk-sel bk-t t-${o.t}" data-bk="${k('o',o.id,'t')}" aria-label="Rodzaj">${Object.entries(BK_TYP).map(([v,n])=>`<option value="${v}"${v===o.t?' selected':''}>${n}</option>`).join('')}</select></td>
      <td class="n"><span class="bk-amt"><em aria-hidden="true">${o.t==='wy'?'+':'−'}</em><input class="g-in g-num bk-a" inputmode="decimal" data-bk="${k('o',o.id,'a')}" value="${fmt(o.a,2).replace(/ /g,'')}" aria-label="Kwota"></span></td>
      <td class="n px-calc ${bkCls(after[o.id])}">${bkSign(after[o.id])}</td>
      <td class="n"><button type="button" class="g-del" data-bkdel="o|${esc(o.id)}" aria-label="Usuń operację">×</button></td></tr>`).join('');
  const histT=S.ops.length?`<div class="tbl-wrap px-wrap"><table class="px-t bk-t"><thead><tr><th>Data</th>${K.length>1?'<th class="bk-kc">Konto</th>':''}<th>Rodzaj</th><th class="n">Kwota</th><th class="n">Bilans po</th><th></th></tr></thead><tbody>${hist}</tbody></table></div>`
    :'<p class="nt-none">Brak operacji.</p>';

  /* miesiące */
  const MS={}; S.ops.forEach(o=>{ const m=o.d.slice(0,7), x=MS[m]||(MS[m]={wp:0,wy:0,n:0}); x[o.t]+=o.a; x.n++; });
  const mies12=Object.keys(MS).sort().reverse();
  const mT=mies12.length?`<div class="tbl-wrap px-wrap"><table class="px-t bk-t bk-mt"><thead><tr><th>Miesiąc</th><th class="n">Wpłaty</th><th class="n">Wypłaty</th><th class="n">Wynik</th></tr></thead><tbody>${mies12.map(m=>{ const x=MS[m], net=x.wy-x.wp, [y,mm]=m.split('-');
      return `<tr><td class="bk-mn">${new Date(+y,+mm-1,1).toLocaleDateString('pl-PL',{month:'long',year:'numeric'})}</td><td class="n px-calc">${fmt(x.wp,2)}</td><td class="n px-calc">${fmt(x.wy,2)}</td><td class="n px-calc px-share ${bkCls(net)}">${bkSign(net)}</td></tr>`; }).join('')}</tbody></table></div>`:'';

  /* konta */
  const konta=K.map(x=>{ const s=bkSum(x.id);
    return `<tr class="${x.st==='zam'?'bk-zam':''}">
      <td class="px-prod"><input class="g-in g-txt bk-name" data-bk="${k('k',x.id,'n')}" value="${esc(x.n)}" aria-label="Nazwa konta" maxlength="40"></td>
      <td><button type="button" class="sub-st ${x.st==='akt'?'on':''} bk-st" data-bkst="${esc(x.id)}" aria-pressed="${x.st==='akt'}" title="Kliknij, żeby zmienić">${x.st==='akt'?'Aktywne':'Zamknięte'}</button></td>
      <td class="n"><input class="g-in g-num bk-a" inputmode="decimal" data-bk="${k('k',x.id,'start')}" value="${fmt(x.start,2).replace(/ /g,'')}" aria-label="Bilans sprzed zapisów"></td>
      <td class="n px-calc">${fmt(s.wp,2)}</td><td class="n px-calc">${fmt(s.wy,2)}</td>
      <td class="n px-calc px-share ${bkCls(s.bil)}">${bkSign(s.bil)}</td>
      <td class="n"><button type="button" class="g-del" data-bkdel="k|${esc(x.id)}" aria-label="Usuń konto">×</button></td></tr>`; }).join('');
  const all=bkSum('all');
  const kontaT=`<div class="tbl-wrap px-wrap"><table class="px-t bk-t bk-kt"><thead><tr><th>Bukmacher</th><th>Status konta</th><th class="n">Bilans sprzed zapisów</th><th class="n">Wpłaty</th><th class="n">Wypłaty</th><th class="n">Bilans</th><th></th></tr></thead>
    <tbody>${konta}<tr class="px-add"><td colspan="7"><form class="bk-addk"><input name="n" placeholder="+ Bukmacher, np. STS" aria-label="Nazwa nowego konta" autocomplete="off" maxlength="40" required><button type="submit">Dodaj</button></form></td></tr></tbody>
    <tfoot><tr class="px-sum"><td colspan="3">Razem</td><td class="n">${fmt(all.wp,2)}</td><td class="n">${fmt(all.wy,2)}</td><td class="n ${bkCls(all.bil)}">${bkSign(all.bil)}</td><td></td></tr></tfoot></table></div>`;

  return `<div class="tr-top"><div><span class="label">Pieniądze · bukmacherka</span><h2>Zakłady</h2></div>${close}</div>
    ${chips}${cells}
    <section class="bk-sec">${add}</section>
    <section class="bk-sec"><h3>Bilans w czasie</h3><div class="chart bk-chart">${bkChart(S)}<div class="w-tip bk-tip" id="bkTip" hidden></div></div></section>
    <div class="bk-two">
      <section class="bk-sec"><h3>Historia</h3>${histT}</section>
      <section class="bk-sec"><h3>Miesiące</h3>${mT||'<p class="nt-none">Brak operacji.</p>'}</section>
    </div>
    <section class="bk-sec"><h3>Konta</h3>${kontaT}</section>`;
}
function bkRender(){
  let sc=$('#bkScrim'), md=$('#bkModal');
  if(!bkM || !$('#bkPage')){ sc&&sc.remove(); md&&md.remove(); bkM=false; document.body.classList.remove('tr-lock'); return; }
  const a=document.activeElement, key=a&&a.dataset&&a.dataset.bk, inAdd=a&&a.closest&&a.closest('form.bk-add,form.bk-addk'), fname=inAdd&&a.name, fcls=inAdd&&inAdd.className;
  const y=md?md.scrollTop:0, fresh=!md;
  if(fresh){ sc=document.createElement('div'); sc.id='bkScrim'; sc.className='tr-scrim'; document.body.appendChild(sc);
    md=document.createElement('div'); md.id='bkModal'; md.className='tr-modal'; md.setAttribute('role','dialog'); md.setAttribute('aria-modal','true'); md.setAttribute('aria-label','Zakłady'); document.body.appendChild(md); }
  document.body.classList.add('tr-lock'); md.innerHTML=`<div class="tr-panel bk-panel">${bkModalHtml()}</div>`; md.scrollTop=fresh?0:y;
  if(key){ const el=md.querySelector(`[data-bk="${CSS.escape(key)}"]`); if(el) el.focus(); }
  else if(inAdd){ const el=md.querySelector(`form.${fcls.split(' ')[0]} [name="${fname}"]`); el&&el.focus(); }
  else if(fresh){ const f=md.querySelector('form.bk-add [name="a"]'); if(f && matchMedia('(pointer:fine)').matches) setTimeout(()=>f.focus(),30); }
}
function bkCard(){ const S=bkSum('all'), akt=BK.konta.filter(k=>k.st==='akt').length, LM=bkLim();
  return `<span class="bk-cbil ${bkCls(S.bil)}">${bkSign(S.bil)} zł</span>${bkLimit?`<span class="bk-clim ${LM.cls}">Limit: ${fmt(LM.wp,2)} / ${fmt(bkLimit,bkLimit%1?2:0)} zł<span class="bk-bar"><i style="width:${Math.min(100,LM.p*100).toFixed(1)}%"></i></span></span>`:''}<span class="calc-count">${S.ops.length} ${S.ops.length===1?'operacja':S.ops.length%10>=2&&S.ops.length%10<=4&&(S.ops.length%100<10||S.ops.length%100>=20)?'operacje':'operacji'} · ${akt} ${akt===1?'aktywne konto':'aktywne konta'}</span>`; }
function bkRefresh(){ const c=$('#bkCard'); if(c) c.innerHTML=bkCard(); if(bkM) bkRender(); typeof finRefresh==='function' && finRefresh(); }   /* Finanse wliczają Zakłady */

/* ——— strona Pieniądze ——— */
function pPieniadze(){
  return `<h1>Pienią<span class="acc">dze</span></h1>
  <div class="calc-cards" id="bkPage">
    <button type="button" class="calc-card res bk-card" data-bkact="open"><div class="calc-ic" aria-hidden="true"><svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="6" y="10" width="36" height="28" rx="3"/><path d="M6 18h36"/><path d="M12 30l6-6 5 4 8-9 5 4"/></svg></div>
      <h2>Zakłady</h2><span id="bkCard" class="bk-cinfo">${bkCard()}</span><span class="calc-open">Otwórz →</span></button>
    <button type="button" class="calc-card res mine bk-card" data-finact="open"><div class="calc-ic" aria-hidden="true"><svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M8 14h28a4 4 0 0 1 4 4v18a4 4 0 0 1-4 4H12a4 4 0 0 1-4-4z"/><path d="M8 14l24-6v6"/><path d="M40 24h-8a3 3 0 0 0 0 6h8"/></svg></div>
      <h2>Finanse</h2><span id="finCard" class="bk-cinfo">${typeof finCard==='function'?finCard():''}</span><span class="calc-open">Otwórz →</span></button>
  </div>`;
}

/* ——— zapis zmian ——— */
const bkNum = v => { const x=pxEval(v); return isNaN(x)?NaN:Math.round(x*100)/100; };
function bkUpdK(id, fn){ const x=BK.konta.find(k=>k.id===id); if(!x) return; const n={...x}; fn(n); const f=bkKNorm(id,n); BK.konta=BK.konta.map(k=>k.id===id?f:k); saveBk(); bkRefresh(); bkPushK(f); }
function bkUpdO(id, fn){ const x=BK.ops.find(o=>o.id===id); if(!x) return; const n={...x}; fn(n); const f=bkONorm(id,n); BK.ops=BK.ops.map(o=>o.id===id?f:o); saveBk(); bkRefresh(); bkPushO(f); }

document.addEventListener('submit', e=>{
  const f=e.target;
  if(f.matches('form.bk-add')){ e.preventDefault();
    const a=bkNum(f.a.value), t=f.t.value==='wy'?'wy':'wp';
    if(isNaN(a)||a<=0){ $('#bkErr').textContent='Wpisz kwotę większą od zera.'; f.a.focus(); return; }
    bkTyp=t; store.set('bukTyp',t); store.set('bukKonto',f.k.value);
    const o=bkONorm(uid('bo'),{k:f.k.value, t, d:f.d.value||todayISO(), a, c:Date.now()});
    BK.ops=[...BK.ops,o]; saveBk(); bkRefresh(); bkPushO(o);
    setTimeout(()=>{ const i=$('form.bk-add [name="a"]'); i&&i.focus(); },0); return; }
  if(f.matches('form.bk-addk')){ e.preventDefault();
    const n=f.n.value.trim(); if(!n) return;
    const x=bkKNorm(uid('bk'),{n, st:'akt', start:0, o:Math.max(0,...BK.konta.map(k=>k.o))+1});
    BK.konta=[...BK.konta,x]; saveBk(); bkRefresh(); bkPushK(x);
    setTimeout(()=>{ const i=$('form.bk-addk [name="n"]'); i&&i.focus(); },0); }
});
document.addEventListener('change', e=>{
  const el=e.target;
  if(el.name==='t' && el.closest('form.bk-add')){ bkTyp=el.value; store.set('bukTyp',bkTyp); return; }
  const key=el.dataset&&el.dataset.bk; if(!key) return;
  const [kind,id,f]=key.split('|'), v=el.value;
  if(kind==='l'){ const n=String(v).trim()?bkNum(v):0; if(!isNaN(n)&&n>=0){ bkLimit=n; saveLimit(); } setTimeout(bkRefresh,0); return; }
  setTimeout(()=>{
    if(kind==='k') bkUpdK(id, x=>{ if(f==='n'){ if(v.trim()) x.n=v.trim(); } else if(f==='start'){ const n=bkNum(v); if(!isNaN(n)) x.start=n; } });
    else bkUpdO(id, o=>{ if(f==='a'){ const n=bkNum(v); if(!isNaN(n)&&n>0) o.a=n; } else if(f==='d'){ if(bkIso(v)) o.d=v; } else if(f==='t'||f==='k'){ o[f]=v; } });
  },0);
});
document.addEventListener('click', e=>{
  if(e.target.id==='bkScrim' || e.target.id==='bkModal'){ bkM=false; return bkRender(); }
  const hit=e.target.closest&&e.target.closest('circle.bk-hit'); if(hit) return bkTipShow(hit);   /* telefon: dotknięcie punktu */
  const act=e.target.closest('[data-bkact]');
  if(act){ bkM=act.dataset.bkact==='open'; return bkRender(); }
  const ch=e.target.closest('[data-bkf]'); if(ch){ bkF=ch.dataset.bkf; store.set('bukFiltr',bkF); return bkRender(); }
  const st=e.target.closest('[data-bkst]'); if(st) return bkUpdK(st.dataset.bkst, x=>{ x.st=x.st==='akt'?'zam':'akt'; });
  const b=e.target.closest('[data-bkdel]'); if(!b) return;
  if(!b.dataset.bkarm){ b.dataset.bkarm='1'; b.textContent='Usuń?'; b.classList.add('armed');
    if(b.dataset.bkdel[0]==='k'){ const n=BK.ops.filter(o=>o.k===b.dataset.bkdel.slice(2)).length; if(n) b.title=`Usunie też ${n} operacji tego konta`; }
    setTimeout(()=>{ if(b.isConnected){ delete b.dataset.bkarm; b.textContent='×'; b.classList.remove('armed'); } },3000); return; }
  const [kind,id]=[b.dataset.bkdel[0], b.dataset.bkdel.slice(2)];
  if(kind==='o'){ BK.ops=BK.ops.filter(o=>o.id!==id); cloud(db=>db.collection('bukOps').doc(id).delete()); }
  else { const ops=BK.ops.filter(o=>o.k===id); BK.ops=BK.ops.filter(o=>o.k!==id); BK.konta=BK.konta.filter(k=>k.id!==id);
    ops.forEach(o=>cloud(db=>db.collection('bukOps').doc(o.id).delete())); cloud(db=>db.collection('bukKonta').doc(id).delete()); if(bkF===id){ bkF='all'; store.set('bukFiltr','all'); } }
  saveBk(); bkRefresh();
});
document.addEventListener('keydown', e=>{
  if(!bkM) return;
  if(e.key==='Escape'){ e.stopPropagation(); bkM=false; bkRender(); return; }
  if(e.key==='Enter' && e.target.matches && e.target.matches('#bkModal input[data-bk]')){ e.preventDefault(); e.target.blur(); }
}, true);

/* dymek na wykresie */
function bkTipShow(c){ const box=c.closest('.bk-chart'), tip=box&&box.querySelector('.bk-tip'); if(!tip) return;
  const r=c.getBoundingClientRect(), b=box.getBoundingClientRect();
  tip.innerHTML=`<b>${c.dataset.bv} zł</b><span>${c.dataset.bd}</span>${c.dataset.bo.split('|').map(x=>`<i class="${x[0]==='+'?'bk-plus':'bk-minus'}">${esc(x)}</i>`).join('')}`;
  tip.hidden=false; let x=r.left+r.width/2-b.left+box.scrollLeft; const w=tip.offsetWidth/2+6; x=Math.min(Math.max(x,w),box.scrollWidth-w);
  tip.style.left=x+'px'; const y=r.top+r.height/2-b.top; tip.style.top=y+'px'; tip.classList.toggle('below', y < tip.offsetHeight+22); }
const bkTipHide = () => { const t=$('#bkTip'); if(t) t.hidden=true; };
document.addEventListener('mouseover', e=>{ if(!bkM) return; const c=e.target.closest&&e.target.closest('circle.bk-hit'); if(c) bkTipShow(c); else if(e.target.closest&&!e.target.closest('.bk-tip')) bkTipHide(); });
document.addEventListener('focusin', e=>{ if(e.target.matches&&e.target.matches('circle.bk-hit')) bkTipShow(e.target); });
document.addEventListener('focusout', e=>{ if(e.target.matches&&e.target.matches('circle.bk-hit')) bkTipHide(); });
