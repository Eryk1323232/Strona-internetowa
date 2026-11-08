/* ════════════════════════════════════════════════════════════════════════
   PIENIĄDZE → okienko „Finanse” (ładuje się po js/16-pieniadze.js, przed routerem)
   ════════════════════════════════════════════════════════════════════════
   Dwa konta: 'glowne' (Konto główne) i 'oszcz' (Oszczędnościowe).

   FIN.cfg  – ustawienia (chmura: kolekcja „finCfg”, dokument „cfg”)
     od   „stan na dzień” — od tej daty liczą się wszystkie operacje
     sg   saldo konta głównego w dniu „od”       so  saldo oszczędnościowego w dniu „od”
     zak  wliczaj Zakłady (wpłata u bukmachera = wydatek, wypłata = wpływ na koncie głównym)
     sub  wliczaj Subskrypcje (każda płatność = wydatek z konta głównego, także te zaplanowane)
   FIN.ops  – operacje wpisane ręcznie (chmura: kolekcja „finOps”)
     t  'wyd' wydatek · 'wpl' wpływ · 'prz' przelew między kontami
     k  konto (przy przelewie — konto, z którego idą pieniądze; trafiają na drugie)
     d  data   a  kwota (dodatnia)   kat  kategoria   n  opis   c  kolejność dodania
   FIN.stale – stałe wpływy i opłaty co miesiąc (chmura: kolekcja „finStale”), np. stypendium, akademik
     n nazwa  t 'wpl' wpływ / 'wyd' opłata  a kwota  dz dzień miesiąca (31 → ostatni dzień krótszych miesięcy)
     k konto  kat kategoria  od pierwszy miesiąc (data)  do ostatni dzień obowiązywania ('' = bez końca)
     Zmiana kwoty zmienia też minione miesiące — gdy stawka się zmienia, ustaw „do” starej pozycji i dodaj nową.
   finAuto()  – operacje dopisywane automatycznie ze stałych, Zakładów i Subskrypcji (tylko do odczytu).
   finCalc()  – salda, „zostaje do końca miesiąca”, średnie dzienne/tygodniowe/miesięczne.
   Przelew między kontami: przycisk „Przelej” na kafelku konta (szybkie kwoty FIN_SZYBKIE, „Całość”, inna kwota, „Cofnij”).
   Kategorie: FIN_KAT_WYD (wydatki) i FIN_KAT_WPL (wpływy) niżej.
   Operacje z przyszłą datą = zaplanowane: nie zmieniają salda dziś, ale liczą się w „zostaje”.
   ════════════════════════════════════════════════════════════════════════ */

const FIN_KONTA = {glowne:'Konto główne', oszcz:'Oszczędnościowe'};
const FIN_KR = {glowne:'Główne', oszcz:'Oszczędn.'};
const FIN_TYP = {wyd:'Wydatek', wpl:'Wpływ', prz:'Przelew'};
const FIN_KAT_WYD = ['Jedzenie','Transport','Mieszkanie','Studia','Zakupy','Rozrywka','Inne'];   /* kategorie wydatków — dopisz/usuń tutaj */
const FIN_KAT_WPL = ['Stypendium','Praca','Od rodziców','Inne'];
/* lista <option> kategorii dla rodzaju operacji; nietypowa kategoria ze starszego wpisu zostaje na liście */
const finKatOpts = (t, cur='') => { const L=t==='wpl'?FIN_KAT_WPL:FIN_KAT_WYD; return (cur&&!L.includes(cur)?[cur,...L]:L).map(x=>`<option value="${esc(x)}"${x===cur?' selected':''}>${esc(x)}</option>`).join(''); };
const FIN_OKRES = {d:['Dziennie','dzień',1], t:['Tygodniowo','tydzień',7], m:['Miesięcznie','miesiąc',365.25/12]};
const finIso = v => /^\d{4}-\d{2}-\d{2}$/.test(v);
const finR = v => Math.round((+v||0)*100)/100;
const finCfgNorm = (v={}) => ({od:finIso(v.od)?v.od:todayISO(), sg:finR(v.sg), so:finR(v.so), zak:v.zak!==false, sub:v.sub!==false, u:+v.u||0});
const finONorm = (id,v={}) => ({id, t:FIN_TYP[v.t]?v.t:'wyd', k:FIN_KONTA[v.k]?v.k:'glowne', d:finIso(v.d)?v.d:todayISO(), a:Math.abs(finR(v.a)), kat:String(v.kat||'').slice(0,40), n:String(v.n||'').slice(0,80), c:+v.c||0});

const finSNorm = (id,v={}) => ({id, n:String(v.n||'Stała pozycja').slice(0,50), t:v.t==='wpl'?'wpl':'wyd', a:Math.abs(finR(v.a)), dz:Math.min(31,Math.max(1,Math.round(+v.dz||1))),
  k:FIN_KONTA[v.k]?v.k:'glowne', kat:String(v.kat||'').slice(0,40), od:finIso(v.od)?v.od:todayISO(), do:finIso(v.do)?v.do:'', o:+v.o||0});
let FIN = {ops:[], stale:[], cfg:finCfgNorm({})};
try{ const o=JSON.parse(store.get('finOps','null')); if(Array.isArray(o)) FIN.ops=o.map(x=>finONorm(x.id,x)); }catch(e){}
try{ const c=JSON.parse(store.get('finCfg','null')); if(c) FIN.cfg=finCfgNorm(c); }catch(e){}
try{ const s=JSON.parse(store.get('finStale','null')); if(Array.isArray(s)) FIN.stale=s.map(x=>finSNorm(x.id,x)); }catch(e){}
const saveFin = () => { store.set('finOps', JSON.stringify(FIN.ops)); store.set('finCfg', JSON.stringify(FIN.cfg)); store.set('finStale', JSON.stringify(FIN.stale)); };
const finPushS = x => { const {id,...d}=x; cloud(db=>db.collection('finStale').doc(id).set(d)); };
const finPushO = x => { const {id,...d}=x; cloud(db=>db.collection('finOps').doc(id).set(d)); };
const finPushCfg = () => cloud(db=>db.collection('finCfg').doc('cfg').set({...FIN.cfg}));

let finM = false;                                   /* czy okienko jest otwarte */
let finOkres = FIN_OKRES[store.get('finOkres','d')] ? store.get('finOkres','d') : 'd';
let finK = store.get('finK','all');                 /* filtr historii: all / glowne / oszcz */
let finTyp = store.get('finTyp','wyd')==='wpl' ? 'wpl' : 'wyd';   /* formularz: wydatek / wpływ (przelewy — przyciskiem na kafelku konta) */
let finPrz = null;      /* otwarty panel przelewu: 'glowne' albo 'oszcz' (konto, z którego przelewasz) */
let finPrzMsg = null;   /* ostatni przelew {id, txt} — do cofnięcia */
let finMies = todayISO().slice(0,7);                /* miesiąc pokazany w historii */

/* ——— daty ——— */
const finD = iso => { const [y,m,d]=iso.split('-').map(Number); return new Date(y,m-1,d); };
const finISO = dt => `${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,'0')}-${String(dt.getDate()).padStart(2,'0')}`;
const finDni = (a,b) => Math.round((finD(b)-finD(a))/864e5);           /* ile dni od a do b */
const finEom = iso => { const x=finD(iso); return finISO(new Date(x.getFullYear(), x.getMonth()+1, 0)); };
const finMName = ym => { const [y,m]=ym.split('-').map(Number); return new Date(y,m-1,1).toLocaleDateString('pl-PL',{month:'long', year:'numeric'}); };

/* ——— płatności subskrypcji w przedziale dat (ta sama logika co subCalc w js/15-subskrypcje.js) ——— */
function finSubDaty(s, odIso, doIso){
  if(typeof subNth!=='function') return [];
  const od=finD(odIso), dd=finD(doIso), koniec=s.tryb==='anul'&&s.do?finD(s.do):null, out=[];
  let start=s.od; const odc=[];
  for(const p of s.przerwy){ if(p.od<start){ if(p.do&&p.do>start) start=p.do; continue; }
    odc.push([start,p.od]); if(!p.do){ start=null; break; } start=p.do; }
  if(start) odc.push([start,null]);
  odc.forEach(([a,b])=>{ const kon=b?finD(b):null;
    for(let k=0;k<5000;k++){ const dt=subNth(s,k,a); if((kon&&dt>=kon)||(koniec&&dt>=koniec)||dt>dd) break; if(dt>=od) out.push(finISO(dt)); } });
  return out;
}
/* operacje z Zakładów i Subskrypcji (konto główne) */
/* daty stałej pozycji w przedziale: co miesiąc w dniu dz (albo ostatnim dniu krótszego miesiąca) */
function finStaleDaty(s, odIso, doIso){
  const out=[], st=finD(s.od); let y=st.getFullYear(), m=st.getMonth();
  for(let i=0;i<600;i++,m++){ if(m>11){ m=0; y++; }
    const d=finISO(new Date(y, m, Math.min(s.dz, new Date(y,m+1,0).getDate())));
    if(d>doIso || (s.do && d>s.do)) break;
    if(d>=s.od && d>=odIso) out.push(d); }
  return out;
}
function finAuto(odIso, doIso){
  const L=[];
  FIN.stale.forEach(s=>{ if(s.a<=0) return; finStaleDaty(s, odIso, doIso).forEach(d=>L.push({id:'stale-'+s.id+'-'+d, auto:'stale', t:s.t, k:s.k, d, a:s.a, kat:s.kat||(s.t==='wpl'?'Stałe wpływy':'Stałe opłaty'), n:s.n, c:0})); });
  if(FIN.cfg.zak && typeof BK==='object') BK.ops.forEach(o=>{ if(o.d<odIso||o.d>doIso) return;
    L.push({id:'auto-'+o.id, auto:'zak', t:o.t==='wp'?'wyd':'wpl', k:'glowne', d:o.d, a:o.a, kat:'Zakłady', n:`${o.t==='wp'?'Wpłata':'Wypłata'} · ${bkNazwa(o.k)}`, c:o.c}); });
  if(FIN.cfg.sub && typeof SUB==='object') SUB.forEach(s=>{ const p=pxEval(s.p); if(isNaN(p)||p<=0) return;
    finSubDaty(s, odIso, doIso).forEach(d=>L.push({id:'auto-'+s.id+'-'+d, auto:'sub', t:'wyd', k:'glowne', d, a:finR(p), kat:'Subskrypcje', n:s.n, c:0})); });
  return L;
}

/* ——— liczenie ——— */
function finCalc(){
  const C=FIN.cfg, td=todayISO(), eom=finEom(td), od=C.od;
  const kon=finD(eom)>finD(td)?eom:td, max=FIN.ops.reduce((m,o)=>o.d>m?o.d:m, kon);
  const all=[...FIN.ops, ...finAuto(od, max>kon?max:kon)];
  const saldo={glowne:C.sg, oszcz:C.so}, poMies={glowne:0, oszcz:0};
  const ruch=(o,s)=>{ if(o.t==='wpl') s[o.k]+=o.a; else if(o.t==='wyd') s[o.k]-=o.a; else { s[o.k]-=o.a; s[o.k==='glowne'?'oszcz':'glowne']+=o.a; } };
  const liczone=all.filter(o=>o.d>=od && o.d<=td), plan=all.filter(o=>o.d>td && o.d<=eom);
  liczone.forEach(o=>ruch(o,saldo));
  liczone.filter(o=>o.d.startsWith(td.slice(0,7))).forEach(o=>ruch(o,poMies));
  const po={...saldo}; plan.forEach(o=>ruch(o,po));
  const planSub=plan.filter(o=>o.auto==='sub').reduce((s,o)=>s+o.a,0);
  const planStale=plan.filter(o=>o.auto==='stale'&&o.k==='glowne').reduce((s,o)=>s+(o.t==='wpl'?o.a:-o.a),0);
  const planInne=po.glowne-saldo.glowne+planSub-planStale;
  const dniDoKonca=finDni(td,eom)+1;
  /* średnie: wydatki i wpływy bez przelewów, od dnia „od” do dziś */
  const przeplyw=liczone.filter(o=>o.t!=='prz'), dni=Math.max(1, finDni(od,td)+1);
  const wyd=przeplyw.filter(o=>o.t==='wyd').reduce((s,o)=>s+o.a,0), wpl=przeplyw.filter(o=>o.t==='wpl').reduce((s,o)=>s+o.a,0);
  return {all, liczone, plan, saldo, poMies, po, zostaje:po.glowne, planSub, planStale, planInne, dniDoKonca, eom, td, od, dni, wyd, wpl};
}
const finSign = v => (v>0.004?'+':v<-0.004?'−':'')+fmt(Math.abs(v),2);
const finCls = v => v>0.004?'bk-plus':v<-0.004?'bk-minus':'';
const finAvg = (tot,dni,k) => tot/dni*FIN_OKRES[k][2];

/* ——— wykres: wydatki i wpływy w kolejnych dniach / tygodniach / miesiącach ——— */
function finKoszyki(F){
  const td=finD(F.td), B=[];
  if(finOkres==='d') for(let i=29;i>=0;i--){ const x=new Date(td); x.setDate(x.getDate()-i); const iso=finISO(x); B.push({a:iso, b:iso, l:i%7===0?`${x.getDate()}.${String(x.getMonth()+1).padStart(2,'0')}`:'', t:x.toLocaleDateString('pl-PL',{weekday:'short', day:'numeric', month:'short'})}); }
  else if(finOkres==='t'){ const pn=new Date(td); pn.setDate(pn.getDate()-((pn.getDay()+6)%7));
    for(let i=11;i>=0;i--){ const a=new Date(pn); a.setDate(a.getDate()-7*i); const b=new Date(a); b.setDate(b.getDate()+6);
      B.push({a:finISO(a), b:finISO(b), l:`${a.getDate()}.${String(a.getMonth()+1).padStart(2,'0')}`, t:`${dPL(finISO(a)).slice(0,5)} – ${dPL(finISO(b)).slice(0,5)}`}); } }
  else for(let i=11;i>=0;i--){ const a=new Date(td.getFullYear(), td.getMonth()-i, 1), b=new Date(a.getFullYear(), a.getMonth()+1, 0);
    B.push({a:finISO(a), b:finISO(b), l:a.toLocaleDateString('pl-PL',{month:'short'}), t:finMName(finISO(a).slice(0,7))}); }
  B.forEach(k=>{ const L=F.liczone.filter(o=>o.t!=='prz' && o.d>=k.a && o.d<=k.b); k.wyd=L.filter(o=>o.t==='wyd').reduce((s,o)=>s+o.a,0); k.wpl=L.filter(o=>o.t==='wpl').reduce((s,o)=>s+o.a,0); });
  return B;
}
function finChart(F){
  const B=finKoszyki(F), W=820,H=240,L=56,R=16,T=16,Bm=30;
  const hi0=Math.max(1,...B.map(k=>Math.max(k.wyd,k.wpl))), raw=hi0/4, mag=Math.pow(10,Math.floor(Math.log10(raw))), step=[1,2,2.5,5,10].map(m=>m*mag).find(s=>s>=raw), hi=Math.ceil(hi0/step)*step;
  const Y=v=>T+(hi-v)/hi*(H-T-Bm), cw=(W-L-R)/B.length, bw=Math.max(2,Math.min(16,cw*0.34));
  let g=''; for(let v=0; v<=hi+step/2; v+=step) g+=`<line x1="${L}" x2="${W-R}" y1="${Y(v).toFixed(1)}" y2="${Y(v).toFixed(1)}" class="${v?'bk-grid':'fin-base'}"/><text x="${L-8}" y="${(Y(v)+3.5).toFixed(1)}" text-anchor="end">${fmt(v, step<1?2:0)}</text>`;
  const avg=finAvg(F.wyd,F.dni,finOkres), ay=Y(Math.min(avg,hi)).toFixed(1);
  const bars=B.map((k,i)=>{ const x=L+cw*i+cw/2;
    return `<rect class="fin-bw" x="${(x-bw-1).toFixed(1)}" y="${Y(k.wyd).toFixed(1)}" width="${bw.toFixed(1)}" height="${(Y(0)-Y(k.wyd)).toFixed(1)}"/>`
      + `<rect class="fin-bp" x="${(x+1).toFixed(1)}" y="${Y(k.wpl).toFixed(1)}" width="${bw.toFixed(1)}" height="${(Y(0)-Y(k.wpl)).toFixed(1)}"/>`
      + (k.l?`<text x="${x.toFixed(1)}" y="${H-10}" text-anchor="middle">${esc(k.l)}</text>`:'')
      + `<rect class="fin-hit" x="${(L+cw*i).toFixed(1)}" y="${T}" width="${cw.toFixed(1)}" height="${H-T-Bm}" tabindex="0" data-ft="${esc(k.t)}" data-fw="${fmt(k.wyd,2)}" data-fp="${fmt(k.wpl,2)}" data-fb="${esc(finSign(k.wpl-k.wyd))}" aria-label="${esc(k.t)}: wydatki ${fmt(k.wyd,2)} zł, wpływy ${fmt(k.wpl,2)} zł"/>`; }).join('');
  return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Wydatki i wpływy">${g}${bars}
    ${avg>0?`<line x1="${L}" x2="${W-R}" y1="${ay}" y2="${ay}" class="fin-avg"/><text class="lbl fin-avgl" x="${L+6}" y="${(+ay-6).toFixed(1)}" text-anchor="start">śr. wydatki ${fmt(avg,2)} zł</text>`:''}</svg>`;
}

/* ——— okienko ——— */
function finModalHtml(){
  const F=finCalc(), C=FIN.cfg, k=(a,id,f)=>esc(a+'|'+id+'|'+f);
  const close=`<button type="button" class="tr-x" data-finact="close" aria-label="Zamknij">✕</button>`;
  const nieUst=!C.u;
  const naDzien=F.zostaje/F.dniDoKonca;
  const cells=`<div class="grid g4 px-cells fin-cells">
    ${['glowne','oszcz'].map(kk=>`<div class="cell fin-acc${finPrz===kk?' open':''}"><span class="label">${FIN_KONTA[kk]}</span><span class="big ${F.saldo[kk]<-0.004?'bk-minus':''}">${fmt(F.saldo[kk],2)}<small>zł</small></span><p>${finSign(F.poMies[kk])} zł w tym miesiącu</p>${finPrzHtml(kk,F)}</div>`).join('')}
    <div class="cell"><span class="label">Razem</span><span class="big">${fmt(F.saldo.glowne+F.saldo.oszcz,2)}<small>zł</small></span><p>oba konta${nieUst?' · ustaw salda w „Konta” niżej':''}</p></div>
    <div class="cell fin-zost${F.zostaje<-0.004?' over':''}"><span class="label">Zostaje do ${dPL(F.eom).slice(0,5)}</span><span class="big">${fmt(F.zostaje,2)}<small>zł</small></span>
      <p>${F.zostaje>0?`≈ ${fmt(naDzien,2)} zł na dzień (${F.dniDoKonca} ${F.dniDoKonca===1?'dzień':'dni'})`:'na koncie głównym zabraknie pieniędzy'}${Math.abs(F.planStale)>0.004?` · ${finSign(F.planStale)} stałe`:''}${F.planSub?` · −${fmt(F.planSub,2)} subskrypcje`:''}${Math.abs(F.planInne)>0.004?` · ${finSign(F.planInne)} zaplanowane`:''}</p></div></div>`;

  /* średnie */
  const avgCell=(lab,tot,cls)=>{ const v=finAvg(tot,F.dni,finOkres), tip=Object.keys(FIN_OKRES).map(q=>`${FIN_OKRES[q][0]}: ${fmt(finAvg(tot,F.dni,q),2)} zł`).join('\n');
    return `<div class="cell" title="${esc(tip)}"><span class="label">${lab}</span><span class="big ${cls}">${fmt(Math.abs(v),2)}<small>zł / ${FIN_OKRES[finOkres][1]}</small></span><p>${Object.keys(FIN_OKRES).filter(q=>q!==finOkres).map(q=>`${fmt(finAvg(tot,F.dni,q),2)} zł / ${FIN_OKRES[q][1]}`).join(' · ')}</p></div>`; };
  const bil=F.wpl-F.wyd, bilAvg=finAvg(bil,F.dni,finOkres);
  const avg=`<div class="fin-avgbar"><div class="seg fin-seg" role="tablist">${Object.entries(FIN_OKRES).map(([q,w])=>`<button type="button" data-fino="${q}" aria-selected="${finOkres===q}">${w[0]}</button>`).join('')}</div><span class="fin-from">z ${F.dni} ${F.dni===1?'dnia':'dni'} · od ${dPL(F.od)}</span></div>
    <div class="grid g3 px-cells fin-avgcells">${avgCell('Średnie wydatki',F.wyd,'')}${avgCell('Średnie wpływy',F.wpl,'')}
      <div class="cell"><span class="label">Średni bilans</span><span class="big ${finCls(bilAvg)}">${finSign(bilAvg)}<small>zł / ${FIN_OKRES[finOkres][1]}</small></span><p>${bilAvg>=0?'odkładasz':'wydajesz więcej, niż zarabiasz'}</p></div></div>
    <div class="chart fin-chart">${finChart(F)}<div class="w-tip fin-tip" id="finTip" hidden></div></div>
    <div class="fin-leg"><span class="w">wydatki</span><span class="p">wpływy</span><span class="a">średnia wydatków</span></div>`;

  /* formularz */
  const add=`<form class="fin-add" data-t="${finTyp}">
    <div class="bk-typ fin-typ" role="radiogroup" aria-label="Rodzaj operacji">${['wyd','wpl'].map(v=>`<label class="t-${v}"><input type="radio" name="t" value="${v}"${finTyp===v?' checked':''}><span>${FIN_TYP[v]}</span></label>`).join('')}</div>
    <input name="a" placeholder="Kwota" inputmode="decimal" autocomplete="off" aria-label="Kwota" required>
    <select name="kat" class="fin-kat" aria-label="Kategoria">${finKatOpts(finTyp)}</select>
    <input name="n" placeholder="Opis (opcjonalnie)" autocomplete="off" aria-label="Opis" maxlength="80">
    <select name="k" class="fin-konto" aria-label="Konto">${Object.entries(FIN_KONTA).map(([v,n])=>`<option value="${v}"${v===store.get('finKonto','glowne')?' selected':''}>${n}</option>`).join('')}</select>
    <input name="d" type="date" value="${todayISO()}" aria-label="Data" required>
    <button type="submit">Dodaj</button><span class="tr-err" id="finErr"></span></form>`;

  /* historia wybranego miesiąca, pogrupowana po dniach */
  const H=F.all.filter(o=>o.d.startsWith(finMies) && (finK==='all' || o.k===finK || o.t==='prz')).sort((a,b)=>b.d.localeCompare(a.d)||b.c-a.c);
  const dni={}; H.forEach(o=>(dni[o.d]=dni[o.d]||[]).push(o));
  const znak=o=>o.t==='wpl'?1:o.t==='wyd'?-1:(finK==='all'?0:(o.k===finK?-1:1));
  const wiersz=o=>{ const pre=o.d<C.od, fut=o.d>F.td, s=znak(o), cls=`fin-r-${o.t}${pre?' fin-pre':''}${fut?' fin-fut':''}${o.auto?' fin-auto':''}`;
    const konto=o.t==='prz'?`${FIN_KR[o.k]} → ${FIN_KR[o.k==='glowne'?'oszcz':'glowne']}`:FIN_KR[o.k];
    const kw=`<span class="bk-amt"><em aria-hidden="true">${s>0?'+':s<0?'−':'⇄'}</em>`;
    if(o.auto) return `<tr class="${cls}" title="${o.auto==='zak'?'Z okienka Zakłady — zmieniasz tam':o.auto==='sub'?'Z Subskrypcji — zmieniasz tam':'Stała pozycja — zmieniasz w „Stałe wpływy i opłaty”'}"><td><span class="fin-tag fin-tag-${o.auto}">${esc(o.kat)}</span></td><td class="fin-n">${esc(o.n)}${fut?' <small>zaplanowane</small>':''}</td><td class="fin-kc">${konto}</td><td class="n">${kw}<b>${fmt(o.a,2)}</b></span></td><td></td></tr>`;
    return `<tr class="${cls}"${pre?' title="Przed dniem „stan na” — nie liczy się do salda"':''}>
      <td>${o.t==='prz'?'<span class="fin-tag">Przelew</span>':`<select class="td-sel bk-sel fin-katsel" data-fn="${k('o',o.id,'kat')}" aria-label="Kategoria">${finKatOpts(o.t, o.kat||'Inne')}</select>`}</td>
      <td class="fin-n"><input class="g-in g-txt" data-fn="${k('o',o.id,'n')}" value="${esc(o.n)}" placeholder="opis" aria-label="Opis" maxlength="80">${fut?'<small>zaplanowane</small>':''}</td>
      <td class="fin-kc">${o.t==='prz'?konto:`<select class="td-sel bk-sel" data-fn="${k('o',o.id,'k')}" aria-label="Konto">${Object.entries(FIN_KR).map(([v,n])=>`<option value="${v}"${v===o.k?' selected':''}>${n}</option>`).join('')}</select>`}</td>
      <td class="n">${kw}<input class="g-in g-num bk-a" inputmode="decimal" data-fn="${k('o',o.id,'a')}" value="${fmt(o.a,2).replace(/ /g,'')}" aria-label="Kwota"></span></td>
      <td class="n"><input type="date" class="fin-dt" data-fn="${k('o',o.id,'d')}" value="${esc(o.d)}" aria-label="Zmień datę" title="Zmień datę"><button type="button" class="g-del" data-findel="${esc(o.id)}" aria-label="Usuń operację">×</button></td></tr>`; };
  const histBody=Object.keys(dni).map(d=>{ const L=dni[d], w=L.filter(o=>o.t==='wyd').reduce((s,o)=>s+o.a,0), p=L.filter(o=>o.t==='wpl').reduce((s,o)=>s+o.a,0);
    const nazwa=finD(d).toLocaleDateString('pl-PL',{weekday:'long', day:'numeric', month:'long'});
    return `<tr class="fin-day"><td colspan="5"><b>${d===F.td?'Dziś · ':''}${esc(nazwa)}</b><span>${w?`<i class="bk-minus">−${fmt(w,2)}</i>`:''}${p?`<i class="bk-plus">+${fmt(p,2)}</i>`:''}</span></td></tr>${L.map(wiersz).join('')}`; }).join('');
  const mW=H.filter(o=>o.t==='wyd' && o.d<=F.td && o.d>=C.od && (finK==='all'||o.k===finK)).reduce((s,o)=>s+o.a,0), mP=H.filter(o=>o.t==='wpl' && o.d<=F.td && o.d>=C.od && (finK==='all'||o.k===finK)).reduce((s,o)=>s+o.a,0);
  const hist=`<div class="fin-hbar"><div class="fin-mnav"><button type="button" data-finm="-1" aria-label="Poprzedni miesiąc">‹</button><b>${esc(finMName(finMies))}</b><button type="button" data-finm="1" aria-label="Następny miesiąc"${finMies>=F.td.slice(0,7)?' disabled':''}>›</button></div>
      <div class="bk-chips">${[['all','Oba konta'],['glowne',FIN_KONTA.glowne],['oszcz',FIN_KONTA.oszcz]].map(([v,n])=>`<button type="button" class="bk-chip" data-fink="${v}" aria-selected="${finK===v}">${n}</button>`).join('')}</div></div>
    <p class="fin-msum">Wydatki <b class="bk-minus">${fmt(mW,2)} zł</b> · wpływy <b class="bk-plus">${fmt(mP,2)} zł</b> · bilans <b class="${finCls(mP-mW)}">${finSign(mP-mW)} zł</b></p>
    ${H.length?`<div class="tbl-wrap px-wrap"><table class="px-t bk-t fin-t"><thead><tr><th>Kategoria</th><th>Opis</th><th class="fin-kc">Konto</th><th class="n">Kwota</th><th></th></tr></thead><tbody>${histBody}</tbody></table></div>`:'<p class="nt-none">Brak operacji w tym miesiącu.</p>'}`;

  /* kategorie wydatków w wybranym miesiącu */
  const KT={}; H.filter(o=>o.t==='wyd' && o.d>=C.od && (finK==='all'||o.k===finK)).forEach(o=>{ const n=o.kat||'Bez kategorii'; KT[n]=(KT[n]||0)+o.a; });
  const kt=Object.entries(KT).sort((a,b)=>b[1]-a[1]), ktMax=kt.length?kt[0][1]:1, ktSum=kt.reduce((s,x)=>s+x[1],0);
  const kat=kt.length?`<div class="fin-kat-l">${kt.map(([n,v])=>`<div class="fin-kr"><span class="fin-kn">${esc(n)}</span><span class="fin-kv">${fmt(v,2)} zł <small>${Math.round(v/ktSum*100)}%</small></span><span class="bk-bar"><i style="width:${(v/ktMax*100).toFixed(1)}%"></i></span></div>`).join('')}</div>`:'<p class="nt-none">Brak wydatków.</p>';

  /* konta i ustawienia */
  const ust=`<div class="tbl-wrap px-wrap"><table class="px-t bk-t fin-ust"><thead><tr><th>Konto</th><th class="n">Saldo w dniu „stan na”</th><th class="n">Saldo dziś</th><th class="n">Po zaplanowanych</th></tr></thead><tbody>
      ${Object.entries(FIN_KONTA).map(([v,n])=>`<tr><td class="px-prod"><b>${n}</b></td><td class="n"><input class="g-in g-num bk-a" inputmode="decimal" data-fn="${k('c','x',v==='glowne'?'sg':'so')}" value="${fmt(v==='glowne'?C.sg:C.so,2).replace(/ /g,'')}" aria-label="Saldo początkowe: ${n}"></td><td class="n px-calc px-share">${fmt(F.saldo[v],2)}</td><td class="n px-calc">${fmt(F.po[v],2)}</td></tr>`).join('')}
    </tbody></table></div>
    <div class="fin-opts"><label class="fin-od"><span class="label">Stan na dzień</span><input type="date" data-fn="${k('c','x','od')}" value="${esc(C.od)}" aria-label="Stan na dzień"></label>
      <label class="fin-chk"><input type="checkbox" data-fn="${k('c','x','zak')}"${C.zak?' checked':''}><span>Wliczaj Zakłady — wpłaty u bukmachera jako wydatki, wypłaty jako wpływy na koncie głównym</span></label>
      <label class="fin-chk"><input type="checkbox" data-fn="${k('c','x','sub')}"${C.sub?' checked':''}><span>Wliczaj Subskrypcje — każda płatność jako wydatek z konta głównego, także zaplanowane do końca miesiąca</span></label></div>`;

  return `<div class="tr-top"><div><span class="label">Pieniądze</span><h2>Finanse</h2></div>${close}</div>
    ${cells}
    <section class="bk-sec">${add}</section>
    <section class="bk-sec"><h3>Stałe wpływy i opłaty</h3>${finStaleHtml(F)}</section>
    <section class="bk-sec"><h3>Średnie</h3>${avg}</section>
    <div class="bk-two">
      <section class="bk-sec"><h3>Historia</h3>${hist}</section>
      <section class="bk-sec"><h3>Kategorie</h3>${kat}</section>
    </div>
    <section class="bk-sec"><h3>Konta</h3>${ust}</section>`;
}
/* ——— przelew między kontami (przycisk na kafelku konta) ——— */
const FIN_SZYBKIE = [50, 100, 200, 500];   /* kwoty na jedno kliknięcie */
function finPrzHtml(kk, F){
  const na=kk==='glowne'?'oszcz':'glowne', dokad=kk==='glowne'?'na oszczędnościowe':'na główne';
  const msg=finPrzMsg&&finPrzMsg.k===kk?`<div class="fin-pmsg">${esc(finPrzMsg.txt)}<button type="button" data-finundo="${esc(finPrzMsg.id)}">Cofnij</button></div>`:'';
  if(finPrz!==kk) return `${msg}<button type="button" class="fin-pbtn" data-finprz="${kk}">${kk==='glowne'?'Przelej '+dokad+' →':'← Przelej '+dokad}</button>`;
  const mx=Math.max(0,F.saldo[kk]);
  return `${msg}<div class="fin-pbox"><span class="fin-ph">${FIN_KR[kk]} → ${FIN_KR[na]}</span>
    <div class="fin-pq">${FIN_SZYBKIE.map(q=>`<button type="button" data-finq="${q}" data-from="${kk}"${q>mx+0.004?' disabled':''}>${fmt(q)} zł</button>`).join('')}<button type="button" data-finq="all" data-from="${kk}"${mx<0.01?' disabled':''}>Całość</button></div>
    <form class="fin-pform" data-from="${kk}"><input name="a" placeholder="Inna kwota" inputmode="decimal" autocomplete="off" aria-label="Kwota przelewu"><button type="submit">Przelej</button><button type="button" class="fin-pcancel" data-finprz="">✕</button></form>
    <span class="tr-err" id="finPErr"></span></div>`;
}
function finPrzelej(from, a){
  const F=finCalc(), mx=finR(F.saldo[from]);
  if(isNaN(a)||a<=0){ const e=$('#finPErr'); if(e) e.textContent='Wpisz kwotę większą od zera.'; return; }
  if(a>mx+0.004){ const e=$('#finPErr'); if(e) e.textContent=`Na koncie jest tylko ${fmt(mx,2)} zł.`; return; }
  const o=finONorm(uid('fo'),{t:'prz', k:from, d:todayISO(), a:finR(a), kat:'', n:'', c:Date.now()});
  FIN.ops=[...FIN.ops,o]; finPrz=null; finPrzMsg={id:o.id, k:from, txt:`Przelano ${fmt(o.a,2)} zł ${from==='glowne'?'na oszczędnościowe':'na główne'}.`};
  saveFin(); finRefresh(); finPushO(o);
  setTimeout(()=>{ if(finPrzMsg&&finPrzMsg.id===o.id){ finPrzMsg=null; if(finM) finRender(); } }, 12000);
}

/* ——— stałe wpływy i opłaty ——— */
function finStaleHtml(F){
  const k=(id,f)=>esc('s|'+id+'|'+f), td=F.td;
  const nast=s=>{ const L=finStaleDaty(s, td, finISO(new Date(finD(td).getFullYear()+1, finD(td).getMonth(), finD(td).getDate()))); return L[0]||''; };
  const L=[...FIN.stale].sort((a,b)=>(a.t===b.t?0:a.t==='wpl'?-1:1)||a.dz-b.dz||a.o-b.o);
  const akt=s=>!s.do||s.do>=td;
  const rows=L.map(s=>{ const nx=nast(s), on=akt(s);
    return `<tr class="fin-r-${s.t}${on?'':' fin-off'}">
      <td class="px-prod"><input class="g-in g-txt fin-sn" data-fn="${k(s.id,'n')}" value="${esc(s.n)}" aria-label="Nazwa" maxlength="50"></td>
      <td><select class="td-sel bk-sel bk-t t-${s.t==='wpl'?'wy':'wp'}" data-fn="${k(s.id,'t')}" aria-label="Rodzaj"><option value="wpl"${s.t==='wpl'?' selected':''}>Wpływ</option><option value="wyd"${s.t==='wyd'?' selected':''}>Opłata</option></select></td>
      <td class="n"><span class="bk-amt"><em aria-hidden="true">${s.t==='wpl'?'+':'−'}</em><input class="g-in g-num bk-a" inputmode="decimal" data-fn="${k(s.id,'a')}" value="${fmt(s.a,2).replace(/\u00a0/g,'')}" aria-label="Kwota"></span></td>
      <td class="fin-dz"><input class="g-in g-num g-q" inputmode="numeric" data-fn="${k(s.id,'dz')}" value="${s.dz}" aria-label="Dzień miesiąca">. dnia</td>
      <td><select class="td-sel bk-sel" data-fn="${k(s.id,'k')}" aria-label="Konto">${Object.entries(FIN_KR).map(([v,n])=>`<option value="${v}"${v===s.k?' selected':''}>${n}</option>`).join('')}</select></td>
      <td><select class="td-sel bk-sel fin-katsel" data-fn="${k(s.id,'kat')}" aria-label="Kategoria">${finKatOpts(s.t, s.kat||(s.t==='wpl'?'Stypendium':'Mieszkanie'))}</select></td>
      <td><input type="date" class="g-in g-date" data-fn="${k(s.id,'od')}" value="${esc(s.od)}" aria-label="Od"></td>
      <td><input type="date" class="g-in g-date" data-fn="${k(s.id,'do')}" value="${esc(s.do)}" aria-label="Do (puste = bez końca)" title="Puste = bez końca"></td>
      <td class="sub-term">${nx?`<b>${dPL(nx)}</b><small>${finDni(td,nx)===0?'dziś':finDni(td,nx)===1?'jutro':`za ${finDni(td,nx)} dni`}</small>`:'<small>zakończona</small>'}</td>
      <td class="n"><button type="button" class="g-del" data-findels="${esc(s.id)}" aria-label="Usuń pozycję">×</button></td></tr>`; }).join('');
  const sumT=t=>L.filter(s=>s.t===t&&akt(s)).reduce((a,s)=>a+s.a,0), wp=sumT('wpl'), wy=sumT('wyd');
  const add=`<tr class="px-add"><td colspan="10"><form class="fin-adds">
      <input name="n" placeholder="+ np. Stypendium, Akademik" aria-label="Nazwa" autocomplete="off" maxlength="50" required>
      <select name="t" aria-label="Rodzaj"><option value="wyd">Opłata</option><option value="wpl">Wpływ</option></select>
      <input name="a" placeholder="Kwota" inputmode="decimal" autocomplete="off" aria-label="Kwota" required>
      <label class="fin-dzl">dnia <input name="dz" inputmode="numeric" value="${finD(td).getDate()}" aria-label="Dzień miesiąca" autocomplete="off"></label>
      <select name="k" aria-label="Konto">${Object.entries(FIN_KONTA).map(([v,n])=>`<option value="${v}">${n}</option>`).join('')}</select>
      <button type="submit">Dodaj</button><span class="tr-err" id="finErrS"></span></form></td></tr>`;
  return `<div class="tbl-wrap px-wrap"><table class="px-t bk-t fin-st"><thead><tr><th>Nazwa</th><th>Rodzaj</th><th class="n">Kwota</th><th>Kiedy</th><th>Konto</th><th>Kategoria</th><th>Od</th><th>Do</th><th>Następna</th><th></th></tr></thead>
    <tbody>${rows}${add}</tbody>
    ${L.length?`<tfoot><tr class="px-sum"><td colspan="10">Co miesiąc: wpływy <b class="bk-plus">+${fmt(wp,2)}</b> · opłaty <b class="bk-minus">−${fmt(wy,2)}</b> · zostaje <b class="${finCls(wp-wy)}">${finSign(wp-wy)} zł</b></td></tr></tfoot>`:''}</table></div>`;
}
function finRender(){
  let sc=$('#finScrim'), md=$('#finModal');
  if(!finM || !$('#bkPage')){ sc&&sc.remove(); md&&md.remove(); finM=false; if(!bkM) document.body.classList.remove('tr-lock'); return; }
  const a=document.activeElement, key=a&&a.dataset&&a.dataset.fn, inAdd=a&&a.closest&&a.closest('form.fin-add,form.fin-adds'), fname=inAdd&&a.name, fcls=inAdd&&inAdd.className;
  const keep={}; const fa=$('form.fin-add'); if(fa) ['kat','n','k','d'].forEach(n=>keep[n]=fa[n].value);
  const y=md?md.scrollTop:0, fresh=!md;
  if(fresh){ sc=document.createElement('div'); sc.id='finScrim'; sc.className='tr-scrim'; document.body.appendChild(sc);
    md=document.createElement('div'); md.id='finModal'; md.className='tr-modal'; md.setAttribute('role','dialog'); md.setAttribute('aria-modal','true'); md.setAttribute('aria-label','Finanse'); document.body.appendChild(md); }
  document.body.classList.add('tr-lock'); md.innerHTML=`<div class="tr-panel bk-panel fin-panel">${finModalHtml()}</div>`; md.scrollTop=fresh?0:y;
  const nf=$('form.fin-add'); if(nf && !fresh) Object.entries(keep).forEach(([n,v])=>{ if(nf[n]&&v!=null) nf[n].value=v; });
  if(key){ const el=md.querySelector(`[data-fn="${CSS.escape(key)}"]`); if(el && el.type!=='checkbox') el.focus(); }
  else if(inAdd){ const el=md.querySelector(`form.${fcls} [name="${fname}"]`); el&&el.focus(); }
  else if(fresh){ const f=md.querySelector('form.fin-add [name="a"]'); if(f && matchMedia('(pointer:fine)').matches) setTimeout(()=>f.focus(),30); }
}
function finCard(){ const F=finCalc();
  return `<span class="bk-cbil">${fmt(F.saldo.glowne+F.saldo.oszcz,2)} zł</span><span class="calc-count">główne ${fmt(F.saldo.glowne,2)} · oszczędn. ${fmt(F.saldo.oszcz,2)}</span><span class="calc-count ${F.zostaje<-0.004?'bk-minus':''}">zostaje do ${dPL(F.eom).slice(0,5)}: ${fmt(F.zostaje,2)} zł</span>`; }
function finRefresh(){ const c=$('#finCard'); if(c) c.innerHTML=finCard(); if(finM) finRender(); }

/* ——— zapis zmian ——— */
function finUpdO(id, fn){ const x=FIN.ops.find(o=>o.id===id); if(!x) return; const n={...x}; fn(n); const f=finONorm(id,n); FIN.ops=FIN.ops.map(o=>o.id===id?f:o); saveFin(); finRefresh(); finPushO(f); }
function finUpdS(id, fn){ const x=FIN.stale.find(o=>o.id===id); if(!x) return; const n={...x}; fn(n); const f=finSNorm(id,n); FIN.stale=FIN.stale.map(o=>o.id===id?f:o); saveFin(); finRefresh(); finPushS(f); }
function finUpdCfg(fn){ const n={...FIN.cfg}; fn(n); n.u=Date.now(); FIN.cfg=finCfgNorm(n); saveFin(); finRefresh(); finPushCfg(); }

document.addEventListener('submit', e=>{
  const f=e.target;
  if(f.matches('form.fin-pform')){ e.preventDefault(); return finPrzelej(f.dataset.from, bkNum(f.a.value)); }
  if(f.matches('form.fin-adds')){ e.preventDefault();
    const a=bkNum(f.a.value), dz=Math.round(bkNum(f.dz.value)), n=f.n.value.trim();
    if(!n){ f.n.focus(); return; } if(isNaN(a)||a<=0){ $('#finErrS').textContent='Wpisz kwotę większą od zera.'; f.a.focus(); return; }
    if(isNaN(dz)||dz<1||dz>31){ $('#finErrS').textContent='Dzień miesiąca: 1–31.'; f.dz.focus(); return; }
    /* pierwszy raz: w tym miesiącu (liczy się, jeśli dzień już minął — i jest po dniu „stan na”) */
    const t0=finD(todayISO()), od=finISO(new Date(t0.getFullYear(), t0.getMonth(), 1));
    const x=finSNorm(uid('fs'),{n, t:f.t.value, a, dz, k:f.k.value, kat:'', od, do:'', o:Date.now()});
    FIN.stale=[...FIN.stale,x]; saveFin(); finRefresh(); finPushS(x);
    setTimeout(()=>{ const i=$('form.fin-adds [name="n"]'); i&&i.focus(); },0); return; }
  if(!f.matches('form.fin-add')) return; e.preventDefault();
  const a=bkNum(f.a.value), t=f.t.value==='wpl'?'wpl':'wyd';
  if(isNaN(a)||a<=0){ $('#finErr').textContent='Wpisz kwotę większą od zera.'; f.a.focus(); return; }
  finTyp=t; store.set('finTyp',t); store.set('finKonto',f.k.value);
  const o=finONorm(uid('fo'),{t, k:f.k.value, d:f.d.value||todayISO(), a, kat:f.kat.value, n:f.n.value.trim(), c:Date.now()});
  FIN.ops=[...FIN.ops,o]; if(o.d.slice(0,7)!==finMies && o.d<=todayISO()) finMies=o.d.slice(0,7);
  f.a.value=''; f.n.value='';
  saveFin(); finRefresh(); finPushO(o);
  setTimeout(()=>{ const i=$('form.fin-add [name="a"]'); i&&i.focus(); },0);
});
document.addEventListener('change', e=>{
  const el=e.target;
  if(el.name==='t' && el.closest('form.fin-add')){ finTyp=el.value; store.set('finTyp',finTyp); const fm=el.closest('form'); fm.dataset.t=finTyp; fm.kat.innerHTML=finKatOpts(finTyp); return; }
  const key=el.dataset&&el.dataset.fn; if(!key) return;
  const [kind,id,f]=key.split('|'), v=el.type==='checkbox'?el.checked:el.value;
  setTimeout(()=>{
    if(kind==='s') finUpdS(id, x=>{ if(f==='a'){ const n=bkNum(v); if(!isNaN(n)&&n>0) x.a=n; } else if(f==='dz'){ const n=Math.round(bkNum(v)); if(n>=1&&n<=31) x.dz=n; }
      else if(f==='od'){ if(finIso(v)) x.od=v; } else if(f==='do'){ x.do=finIso(v)?v:''; } else if(f==='t'){ x.t=v; const L=v==='wpl'?FIN_KAT_WPL:FIN_KAT_WYD; if(!L.includes(x.kat)) x.kat=''; } else if(f==='n'){ if(String(v).trim()) x.n=String(v).trim(); } else x[f]=String(v).trim(); });
    else if(kind==='c') finUpdCfg(c=>{ if(f==='sg'||f==='so'){ const n=String(v).trim()?bkNum(v):0; if(!isNaN(n)) c[f]=n; } else if(f==='od'){ if(finIso(v)) c.od=v; } else c[f]=!!v; });
    else finUpdO(id, o=>{ if(f==='a'){ const n=bkNum(v); if(!isNaN(n)&&n>0) o.a=n; } else if(f==='d'){ if(finIso(v)) o.d=v; } else if(f==='kat'||f==='n'){ o[f]=String(v).trim(); } else if(f==='k'){ o.k=v; } });
  },0);
});
document.addEventListener('click', e=>{
  if(e.target.id==='finScrim' || e.target.id==='finModal'){ finM=false; return finRender(); }
  const hit=e.target.closest&&e.target.closest('rect.fin-hit'); if(hit) return finTipShow(hit);
  const act=e.target.closest('[data-finact]'); if(act){ finM=act.dataset.finact==='open'; finPrz=null; finPrzMsg=null; if(finM) finMies=todayISO().slice(0,7); return finRender(); }
  const pb=e.target.closest('[data-finprz]'); if(pb){ finPrz=pb.dataset.finprz||null; finRender(); if(finPrz) setTimeout(()=>{ const i=$('form.fin-pform [name="a"]'); i&&matchMedia('(pointer:fine)').matches&&i.focus(); },0); return; }
  const qb=e.target.closest('[data-finq]'); if(qb){ const from=qb.dataset.from; return finPrzelej(from, qb.dataset.finq==='all'?finR(finCalc().saldo[from]):+qb.dataset.finq); }
  const ub=e.target.closest('[data-finundo]'); if(ub){ const id=ub.dataset.finundo; FIN.ops=FIN.ops.filter(o=>o.id!==id); finPrzMsg=null; saveFin(); finRefresh(); cloud(db=>db.collection('finOps').doc(id).delete()); return; }
  const ob=e.target.closest('[data-fino]'); if(ob){ finOkres=ob.dataset.fino; store.set('finOkres',finOkres); return finRender(); }
  const kb=e.target.closest('[data-fink]'); if(kb){ finK=kb.dataset.fink; store.set('finK',finK); return finRender(); }
  const mb=e.target.closest('[data-finm]'); if(mb){ const [y,m]=finMies.split('-').map(Number), x=new Date(y, m-1+(+mb.dataset.finm), 1); finMies=finISO(x).slice(0,7); return finRender(); }
  const bs=e.target.closest('[data-findels]');
  if(bs){ if(!bs.dataset.finarm){ bs.dataset.finarm='1'; bs.textContent='Usuń?'; bs.classList.add('armed'); bs.title='Usunie też tę pozycję z minionych miesięcy — żeby zakończyć, ustaw datę „Do”';
      setTimeout(()=>{ if(bs.isConnected){ delete bs.dataset.finarm; bs.textContent='×'; bs.classList.remove('armed'); } },3000); return; }
    const id=bs.dataset.findels; FIN.stale=FIN.stale.filter(x=>x.id!==id); saveFin(); finRefresh(); cloud(db=>db.collection('finStale').doc(id).delete()); return; }
  const b=e.target.closest('[data-findel]'); if(!b) return;
  if(!b.dataset.finarm){ b.dataset.finarm='1'; b.textContent='Usuń?'; b.classList.add('armed');
    setTimeout(()=>{ if(b.isConnected){ delete b.dataset.finarm; b.textContent='×'; b.classList.remove('armed'); } },3000); return; }
  const id=b.dataset.findel; FIN.ops=FIN.ops.filter(o=>o.id!==id); saveFin(); finRefresh(); cloud(db=>db.collection('finOps').doc(id).delete());
});
document.addEventListener('keydown', e=>{
  if(!finM) return;
  if(e.key==='Escape'){ e.stopPropagation(); finM=false; finRender(); return; }
  if(e.key==='Enter' && e.target.matches && e.target.matches('#finModal input[data-fn]')){ e.preventDefault(); e.target.blur(); }
}, true);

/* dymek na wykresie */
function finTipShow(r0){ const box=r0.closest('.fin-chart'), tip=box&&box.querySelector('.fin-tip'); if(!tip) return;
  const r=r0.getBoundingClientRect(), b=box.getBoundingClientRect();
  tip.innerHTML=`<b class="${r0.dataset.fb[0]==='−'?'bk-minus':''}">${r0.dataset.fb} zł</b><span>${r0.dataset.ft}</span><i class="bk-minus">wydatki ${r0.dataset.fw} zł</i><i class="bk-plus">wpływy ${r0.dataset.fp} zł</i>`;
  tip.hidden=false; let x=r.left+r.width/2-b.left+box.scrollLeft; const w=tip.offsetWidth/2+6; x=Math.min(Math.max(x,w),box.scrollWidth-w);
  tip.style.left=x+'px'; tip.style.top=(r.top-b.top+40)+'px'; tip.classList.remove('below'); }
const finTipHide = () => { const t=$('#finTip'); if(t) t.hidden=true; };
document.addEventListener('mouseover', e=>{ if(!finM) return; const c=e.target.closest&&e.target.closest('rect.fin-hit'); if(c) finTipShow(c); else if(e.target.closest&&!e.target.closest('.fin-tip')) finTipHide(); });
document.addEventListener('focusin', e=>{ if(e.target.matches&&e.target.matches('rect.fin-hit')) finTipShow(e.target); });
document.addEventListener('focusout', e=>{ if(e.target.matches&&e.target.matches('rect.fin-hit')) finTipHide(); });
