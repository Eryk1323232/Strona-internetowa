/* ════════════════════════════════════════════════════════════════
   WORLD OF TANKS → zakładka „Tryby” (tryby gry / przepustki wydarzeń)
   Siatka klikalnych kafelków (jak w Pracy) + „Nowy tryb”; kafelek otwiera okienko trybu.
   Tryb: {id, n nazwa, u jednostka (np. klucze), k koniec 'RRRR-MM-DD' lub '', o kolejność,
          lv [{c cena przejścia, s cena pominięcia (null = nie da się pominąć), d ukończony,
               n nagrody [{t typ z TY_NG, il ilość, o nazwa (dla czołgu, stylu itp.)}]}]}
   Nagrody: przy poziomie „+” otwiera wiersz dodawania (tyNg = numer poziomu); pod kafelkami podsumowanie
   „zdobyte / do zdobycia” — typy liczbowe sumowane, nazwane (czołg, styl…) wypisane.
   Dane: localStorage 'wotTryby' + kolekcja 'wotTryby' w arkuszu (js/12-synchronizacja.js).
   Dawna zakładka „Ostatni Bastion” jest tu zwykłym trybem (id 'bastion').
   ════════════════════════════════════════════════════════════════ */
/* typy nagród: [nazwa, czy z nazwą własną (1) zamiast samej liczby, kolor] */
const TY_NG = { kr:['Kredyty',0,'#8E94AB'], zl:['Złoto',0,'#D9A400'], ob:['Obligacje',0,'#3E7BFA'], xp:['Wolne XP',0,'#22B07D'], prem:['Dni premium',0,'#E2A93B'],
  rez:['Rezerwy osobiste',0,'#14B8C4'], sch:['Schematy',0,'#9B5DE5'], dyr:['Dyrektywy',0,'#6C5CE7'], skrz:['Skrzynki',0,'#E8890C'], zet:['Żetony',0,'#B07D12'],
  czolg:['Czołg',1,'#E5484D'], wyp:['Wyposażenie',1,'#18A999'], styl:['Styl / kamuflaż',1,'#D96570'], zal:['Załoga',1,'#2F6FEB'], inne:['Inne',1,'#8B8D98'] };
const tyNgNorm = n => (Array.isArray(n)?n:[]).filter(x=>x&&TY_NG[x.t]).map(x=>({t:x.t, il:Math.max(0,Math.round(+x.il||0))||(TY_NG[x.t][1]?1:0), o:String(x.o||'').slice(0,50)})).filter(x=>x.il>0).slice(0,8);
const tyLv = l => ({ c:Math.max(0,Math.round(+(l&&l.c)||0)), s:(l&&l.s!==null&&l.s!==undefined&&l.s!==''&&isFinite(+l.s))?Math.max(0,Math.round(+l.s)):null, d:!!(l&&l.d), n:tyNgNorm(l&&l.n) });
const tyNgTxt = x => TY_NG[x.t][1] ? `${x.il>1?x.il+'× ':''}${x.o||TY_NG[x.t][0]}` : `${fmt(x.il,0)} ${TY_NG[x.t][0].toLowerCase()}`;
function tyNgSuma(L){   /* [{…lv}] → tekst „1 500 000 kredytów · 250 złota · Czołg: X” */
  const S={}, N=[]; L.forEach(l=>l.n.forEach(x=>{ if(TY_NG[x.t][1]) N.push(x); else S[x.t]=(S[x.t]||0)+x.il; }));
  return [...Object.keys(TY_NG).filter(t=>S[t]).map(t=>`<span class="ty-ng" style="--c:${TY_NG[t][2]}"><b>${fmt(S[t],0)}</b> ${TY_NG[t][0].toLowerCase()}</span>`),
          ...N.map(x=>`<span class="ty-ng" style="--c:${TY_NG[x.t][2]}">${esc(TY_NG[x.t][0])}: <b>${esc((x.il>1?x.il+'× ':'')+(x.o||'—'))}</b></span>`)].join(''); }
const tyNorm = (id,v={}) => ({ id, n:String(v.n||'Nowy tryb').slice(0,60), u:String(v.u||'pkt').slice(0,20), k:/^\d{4}-\d{2}-\d{2}$/.test(v.k||'')?v.k:'',
  o:+v.o||0, lv:(Array.isArray(v.lv)?v.lv:[]).map(tyLv) });
let TY=[]; try{ const c=JSON.parse(store.get('wotTryby','null')); if(Array.isArray(c)) TY=c.map(x=>tyNorm(x.id,x)); }catch(e){}
let tyM=null;   /* id otwartego trybu */
let tyNg=null;   /* {i poziom, t typ} — otwarty wiersz dodawania nagrody */
const saveTy = () => store.set('wotTryby', JSON.stringify(TY));
const tyPush = x => cloud(db=>{ const {id,...v}=x; return db.collection('wotTryby').doc(id).set(v); });
const tyDel = id => cloud(db=>db.collection('wotTryby').doc(id).delete());
const tyLista = () => [...TY].sort((a,b)=>a.o-b.o);
const tyDni = k => { if(!k) return null; return Math.ceil((new Date(k+'T23:59:59')-new Date())/864e5); };
function tyStat(x){
  const zost=x.lv.filter(l=>!l.d), zrob=x.lv.length-zost.length;
  return { zrob, ile:x.lv.length, cena:zost.reduce((a,l)=>a+l.c,0), pom:zost.filter(l=>l.s!==null).reduce((a,l)=>a+l.s,0), bezPom:zost.filter(l=>l.s===null).length,
    sumC:x.lv.reduce((a,l)=>a+l.c,0), sumS:x.lv.filter(l=>l.s!==null).reduce((a,l)=>a+l.s,0), dni:tyDni(x.k) };
}
const TY_IC = '<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M8 40V22l8-6 8 6 8-6 8 6v18z"/><path d="M8 22V10h6v4h6v-4h8v4h6v-4h6v12"/><path d="M20 40v-8a4 4 0 0 1 8 0v8"/></svg>';
function tyHtml(){
  return `<div class="calc-cards ty-cards">${tyLista().map(x=>{ const st=tyStat(x), pr=st.ile?Math.round(st.zrob/st.ile*100):0;
    return `<button type="button" class="calc-card res ty-card" data-tyopen="${esc(x.id)}"><div class="calc-ic" aria-hidden="true">${TY_IC}</div>
      <h2>${esc(x.n)}</h2><span class="calc-count">${st.zrob}/${st.ile} poziomów${st.ile&&st.zrob<st.ile?` · zostało ${fmt(st.cena,0)} ${esc(x.u)}`:st.ile?' · ukończony ✓':''}${st.dni!==null?` · ${st.dni<0?'zakończony':st.dni===0?'kończy się dziś':`${st.dni} dni do końca`}`:''}</span>
      <span class="ty-bar" aria-hidden="true"><i style="width:${pr}%"></i></span><span class="calc-open">Otwórz →</span></button>`; }).join('')}
    <button type="button" class="calc-card ty-nowy" data-tyact="nowy"><span class="ty-plus" aria-hidden="true">+</span><h2>Nowy tryb</h2><span class="calc-count">np. przepustka wydarzenia — poziomy, cena przejścia i pominięcia</span></button></div>`;
}
function tyRefresh(){ if(typeof wotTab!=='undefined' && wotTab==='tryby' && $('#wotPanel') && !(document.activeElement && document.activeElement.matches('#wotPanel input'))) $('#wotPanel').innerHTML=tyHtml(); if(tyM) tyRender(); }
function tySet(id, fn){ const x=TY.find(y=>y.id===id); if(!x) return; const n=tyNorm(id, fn(JSON.parse(JSON.stringify(x)))||x); TY=TY.map(y=>y.id===id?n:y); saveTy(); tyPush(n); }
const tyIn = (attrs,val,ph,lab) => `<input class="ty-in num-in" inputmode="numeric" ${attrs} value="${val===null||val===undefined||val===''?'':grp(val)}" placeholder="${ph}" aria-label="${lab}">`;
function tyOkno(x){
  const st=tyStat(x), u=esc(x.u);
  return `<div class="ty-ust">
      <label class="ty-f ty-fn"><span class="label">Nazwa</span><input class="ty-tx" data-typ="n" value="${esc(x.n)}" maxlength="60"></label>
      <label class="ty-f"><span class="label">Waluta przejść</span><input class="ty-tx" data-typ="u" value="${esc(x.u)}" maxlength="20" placeholder="np. klucze"></label>
      <label class="ty-f"><span class="label">Koniec wydarzenia</span><input class="ty-tx" type="date" data-typ="k" value="${x.k}"></label></div>
    <div class="grid g4 ty-cells">
      <div class="cell"><span class="label">Ukończone</span><span class="big">${st.zrob}<small>/ ${st.ile}</small></span><p>poziomów</p></div>
      <div class="cell"><span class="label">Przejście reszty</span><span class="big">${fmt(st.cena,0)}</span><p>${u} za pozostałe poziomy</p></div>
      <div class="cell"><span class="label">Pominięcie reszty</span><span class="big">${fmt(st.pom,0)}</span><p>${st.bezPom?`${st.bezPom} ${st.bezPom===1?'poziomu':'poziomów'} nie da się pominąć`:'wszystkie pozostałe'}</p></div>
      <div class="cell"><span class="label">Do końca</span><span class="big">${st.dni===null?'—':st.dni<0?'koniec':fmt(st.dni,0)}${st.dni!==null&&st.dni>=0?'<small>dni</small>':''}</span><p>${x.k?dPL(x.k):'wpisz datę końca wyżej'}</p></div></div>
    ${x.lv.some(l=>l.n.length)?`<div class="ty-ngsum"><div><span class="label">Nagrody zdobyte</span><div class="ty-ngl">${tyNgSuma(x.lv.filter(l=>l.d))||'<i>jeszcze nic</i>'}</div></div>
      <div><span class="label">Do zdobycia</span><div class="ty-ngl">${tyNgSuma(x.lv.filter(l=>!l.d))||'<i>wszystko zebrane</i>'}</div></div></div>`:''}
    <div class="tbl-wrap ty-tbl"><table><thead><tr><th>Poziom</th><th class="ty-ok">Zrobione</th><th class="n">Przejście</th><th class="n">Pominięcie</th><th>Nagrody</th><th aria-label="Usuń"></th></tr></thead>
      <tbody>${x.lv.map((l,i)=>`<tr class="${l.d?'done':''}"><td class="mono">${i+1}</td>
        <td class="ty-ok"><input type="checkbox" class="sq ty-d" data-i="${i}" aria-label="Poziom ${i+1} ukończony"${l.d?' checked':''}></td>
        <td class="n">${tyIn(`data-i="${i}" data-f="c"`,l.c||'','0',`Poziom ${i+1}: cena przejścia`)}</td>
        <td class="n">${tyIn(`data-i="${i}" data-f="s"`,l.s,'—',`Poziom ${i+1}: cena pominięcia`)}</td>
        <td class="ty-ngc">${l.n.map((g,j)=>`<span class="ty-ng" style="--c:${TY_NG[g.t][2]}" title="${esc(TY_NG[g.t][0])}">${esc(tyNgTxt(g))}<button type="button" data-tyngx="${i}|${j}" aria-label="Usuń nagrodę ${esc(tyNgTxt(g))}">×</button></span>`).join('')}<button type="button" class="ty-ngadd" data-tyngo="${i}" aria-label="Dodaj nagrodę do poziomu ${i+1}" aria-expanded="${!!(tyNg&&tyNg.i===i)}">+</button></td>
        <td class="ty-x"><button type="button" class="del" data-tydel="${i}" aria-label="Usuń poziom ${i+1}">×</button></td></tr>${tyNg&&tyNg.i===i?`<tr class="ty-ngrow"><td colspan="6"><form class="ty-ngform"><span class="label">Nagroda za poziom ${i+1}</span>
          <select name="t" class="ty-tx" aria-label="Rodzaj nagrody">${Object.entries(TY_NG).map(([k,v])=>`<option value="${k}"${k===tyNg.t?' selected':''}>${v[0]}</option>`).join('')}</select>
          ${TY_NG[tyNg.t][1]?`<input name="o" class="ty-tx ty-ngo" placeholder="nazwa, np. ${tyNg.t==='czolg'?'Skoda T 56':tyNg.t==='wyp'?'Turbosprężarka':tyNg.t==='styl'?'styl 3D':tyNg.t==='zal'?'dowódca z 2 umiejętnościami':'emblemat'}" maxlength="50" aria-label="Nazwa nagrody" autocomplete="off">`:''}
          <input name="il" class="ty-tx num-in grp ty-ngil" inputmode="numeric" placeholder="${TY_NG[tyNg.t][1]?'szt. (1)':'ilość'}" aria-label="Ilość" autocomplete="off">
          <button type="submit" class="wz-add">Dodaj</button><button type="button" class="uk-btn uk-lnk" data-tyngo="-1">Gotowe</button></form></td></tr>`:''}`).join('')||`<tr><td colspan="6" class="ty-pusto">Brak poziomów — dodaj pierwsze poniżej.</td></tr>`}</tbody>
      ${x.lv.length?`<tfoot><tr><td colspan="2">Suma</td><td class="n">${fmt(st.sumC,0)}</td><td class="n">${fmt(st.sumS,0)}</td><td colspan="2"></td></tr></tfoot>`:''}</table></div>
    <form class="ty-dodaj"><span class="label">Dodaj poziomy</span>
      <label><span class="sr">Ile poziomów</span><input name="ile" class="ty-tx" type="number" min="1" max="100" value="1"></label>
      <label><span class="sr">Cena przejścia</span><input name="c" class="ty-tx num-in grp" inputmode="numeric" placeholder="przejście"></label>
      <label><span class="sr">Cena pominięcia</span><input name="s" class="ty-tx num-in grp" inputmode="numeric" placeholder="pominięcie (puste = brak)"></label>
      <button type="submit" class="wz-add">Dodaj</button></form>
    <p class="ty-pom">Puste pole „Pominięcie” = poziomu nie da się pominąć. Odhaczone poziomy nie wliczają się do kosztów „reszty”. Nagrody dodajesz przyciskiem „+” przy poziomie.</p>
    <div class="ty-dol"><button type="button" class="uk-btn uk-lnk ty-usun" data-tyact="usun">Usuń tryb</button></div>`;
}
function tyRender(){
  let sc=$('#tyScrim'), md=$('#tyModal'); const x=TY.find(y=>y.id===tyM);
  if(!x || !$('#wotPanel')){ sc&&sc.remove(); md&&md.remove(); tyM=null; document.body.classList.remove('tr-lock'); return; }
  if(!md){ sc=document.createElement('div'); sc.id='tyScrim'; sc.className='tr-scrim'; document.body.appendChild(sc);
    md=document.createElement('div'); md.id='tyModal'; md.className='tr-modal tr-wide'; md.setAttribute('role','dialog'); md.setAttribute('aria-modal','true'); document.body.appendChild(md); }
  md.setAttribute('aria-label', x.n); document.body.classList.add('tr-lock');
  const a=document.activeElement, fk=a&&md.contains(a)&&a.matches('input')&&!a.closest('.ty-ngform')?{s:a.dataset.typ||'', i:a.dataset.i||'', f:a.dataset.f||a.name||''}:null, y=md.querySelector('.tr-panel')?md.scrollTop:0;
  md.innerHTML=`<div class="tr-panel ty-panel"><div class="tr-top"><div><span class="label">Tryb gry</span><h2>${esc(x.n)}</h2></div><button type="button" class="tr-x" data-tyclose="1" aria-label="Zamknij">✕</button></div>${tyOkno(x)}</div>`;
  md.scrollTop=y;
  if(fk){ const q=fk.s?md.querySelector(`[data-typ="${fk.s}"]`):fk.i!==''?md.querySelector(`.ty-in[data-i="${fk.i}"][data-f="${fk.f}"]`):md.querySelector(`.ty-dodaj [name="${fk.f}"]`); q&&q.focus({preventScroll:true}); }
}
document.addEventListener('click', e=>{
  const o=e.target.closest('[data-tyopen]'); if(o){ tyM=o.dataset.tyopen; return tyRender(); }
  if(e.target.closest('[data-tyact="nowy"]')){ const x=tyNorm(uid('ty'),{n:'Nowy tryb', u:'pkt', o:Math.max(0,...TY.map(y=>y.o))+1}); TY=[...TY,x]; saveTy(); tyPush(x); tyRefresh(); tyM=x.id; tyRender();
    const n=$('#tyModal [data-typ="n"]'); if(n){ n.focus(); n.select(); } return; }
  if(e.target.closest('[data-tyclose]') || e.target.id==='tyScrim' || e.target.id==='tyModal'){ tyM=null; tyNg=null; tyRender(); return tyRefresh(); }
  if(!tyM) return;
  const ngo=e.target.closest('[data-tyngo]'); if(ngo){ const i=+ngo.dataset.tyngo; tyNg=(i<0||(tyNg&&tyNg.i===i))?null:{i, t:(tyNg&&tyNg.t)||store.get('tyNgTyp','kr')}; tyRender(); const q=$('#tyModal .ty-ngform [name=o], #tyModal .ty-ngform [name=il]'); q&&q.focus({preventScroll:true}); return; }
  const ngx=e.target.closest('[data-tyngx]'); if(ngx){ const [i,j]=ngx.dataset.tyngx.split('|').map(Number); tySet(tyM, x=>{ x.lv[i].n.splice(j,1); return x; }); return tyRender(); }
  const d=e.target.closest('[data-tydel]'); if(d){ const i=+d.dataset.tydel; tyNg=null; tySet(tyM, x=>{ x.lv.splice(i,1); return x; }); return tyRender(); }
  const u=e.target.closest('[data-tyact="usun"]'); if(u){ if(!u.dataset.pewne){ u.dataset.pewne='1'; u.textContent='Na pewno usunąć cały tryb?'; setTimeout(()=>{ if(u.isConnected){ delete u.dataset.pewne; u.textContent='Usuń tryb'; } },3000); return; }
    const id=tyM; TY=TY.filter(x=>x.id!==id); saveTy(); tyDel(id); tyM=null; tyRender(); return tyRefresh(); }
});
document.addEventListener('change', e=>{ const t=e.target; if(!tyM || !t.closest || !t.closest('#tyModal')) return;
  if(t.closest('.ty-ngform')){ if(t.name==='t' && tyNg){ tyNg.t=t.value; store.set('tyNgTyp',t.value); tyRender(); const q=$('#tyModal .ty-ngform [name=o], #tyModal .ty-ngform [name=il]'); q&&q.focus({preventScroll:true}); } return; }
  if(t.matches('.ty-d')){ tySet(tyM, x=>{ x.lv[+t.dataset.i].d=t.checked; return x; }); return tyRender(); }
  if(t.matches('.ty-in')){ const v=t.value.trim(), n=v===''?(t.dataset.f==='s'?null:0):bkNum(v); if(n!==null && isNaN(n)) return;
    tySet(tyM, x=>{ x.lv[+t.dataset.i][t.dataset.f]=n; return x; }); return tyRender(); }
  if(t.dataset.typ){ const k=t.dataset.typ, v=t.value.trim(); tySet(tyM, x=>{ x[k]=v||(k==='n'?'Nowy tryb':k==='u'?'pkt':''); return x; }); return tyRender(); }
});
document.addEventListener('keydown', e=>{ const t=e.target;
  if(tyM && e.key==='Enter' && t.matches && t.matches('#tyModal .ty-in, #tyModal [data-typ]')){ e.preventDefault(); t.blur(); }
  if(tyM && e.key==='Enter' && t.closest && t.closest('.ty-ngform') && t.matches('input')){ e.preventDefault(); e.stopPropagation(); return t.form.requestSubmit(); }   /* pola liczbowe mają globalny Enter=blur */
  if(tyM && e.key==='Escape' && tyNg){ e.stopPropagation(); tyNg=null; return tyRender(); }
  if(tyM && e.key==='Escape' && !(t.closest&&t.closest('input,textarea,select'))){ e.stopPropagation(); tyM=null; tyRender(); tyRefresh(); } }, true);
document.addEventListener('submit', e=>{ const f=e.target; if(!tyM || !f.matches || !f.matches('.ty-ngform') || !tyNg) return; e.preventDefault();
  const t=f.elements.t.value, naz=TY_NG[t][1], o=naz?f.elements.o.value.trim():'', v=f.elements.il.value.trim(), il=v?bkNum(v):(naz?1:NaN);
  if(isNaN(il)||il<=0){ f.elements.il.focus(); return; }
  const i=tyNg.i; tySet(tyM, x=>{ x.lv[i].n.push({t, il, o}); return x; }); tyRender();
  const q=$('#tyModal .ty-ngform [name=o], #tyModal .ty-ngform [name=il]'); q&&q.focus({preventScroll:true}); });
document.addEventListener('submit', e=>{ const f=e.target; if(!f.matches||!f.matches('.ty-dodaj')||!tyM) return; e.preventDefault();
  const ile=Math.min(100,Math.max(1,Math.round(+f.elements.ile.value||1))), c=f.elements.c.value.trim()?bkNum(f.elements.c.value):0, s=f.elements.s.value.trim()?bkNum(f.elements.s.value):null;
  if(isNaN(c)||(s!==null&&isNaN(s))) return;
  tySet(tyM, x=>{ for(let i=0;i<ile;i++) x.lv.push({c, s, d:false, n:[]}); return x; }); tyRender();
  const q=$('#tyModal .ty-dodaj [name=c]'); q&&q.focus({preventScroll:true}); });
