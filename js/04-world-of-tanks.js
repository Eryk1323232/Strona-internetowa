/* ════════════════════════════════════════════════════════════════════════
   WORLD OF TANKS + FARMING SIMULATOR
   ════════════════════════════════════════════════════════════════════════
   WOT_TABS  – lista zakładek WoT (przepustka, obligacje, magazyn, expienie, MOE, Tryby → js/45-wot-tryby.js (dawny Ostatni Bastion), Zakupy → js/41-wot-zakupy.js, Garaż → js/42-wot-garaz.js, Cele → js/23-wot-cele.js).
   wotPanel(k) – rysuje zawartość zakładki k; wotSummary(k) – kafle z liczbami nad nią.
   S         – stan WoT (garaż, magazyn, żetony, obligacje, expienie) zapisywany w przeglądarce.
   Expienie — „światełka” przy Modułach i Potrzebnym XP: czy starcza wolnego XP z konta (fxpWolne() — wolne XP z panelu zasobów / Wargaming API, js/44-wot-zasoby.js):
     zielone = starcza, pomarańczowe = masz co najmniej FXP_PROG (80 %) brakującego XP, czerwone = mniej.
     Każda rzecz osobno: XP z czołgu (Posiadane) + wolne XP. Moduły — XP na TYM czołgu; cena czołgu — XP na POPRZEDNIM
     czołgu w gałęzi (dla pierwszego w gałęzi — na nim samym). Np. 20 000 na czołgu + 30 000 wolnego → stać na działo za 50 000.
   fixExp()  – poprawki gałęzi drzewek (Hirschkäfer, Bassotto, T-34-2, Fauteur/AX-XX).
   cloud(fn) – zapis do chmury (Arkusz Google, patrz 12-synchronizacja.js).
   ════════════════════════════════════════════════════════════════════════ */

const WOT_TABS = [['przep','Przepustka'],['oblig','Obligacje'],['mag','Magazyn'],['gar','Garaż'],['exp','Expienie'],['moe','Kalkulator MOE'],['tryby','Tryby'],['zak','Zakupy'],['cele','Cele']];
const TIERS = ['V','VI','VII','VIII','IX','X'];

/* liczniki wyliczane ze stanu */
const tok = () => S.tok;
const tokSum = k => tok()[k].reduce((a,v)=>a+(+v||0),0);
const przepMiss = () => D.przep.filter(x=>!has(x[2])).reduce((a,x)=>a+x[3],0);
/* kropka „czy stać mnie” przy czołgach za obligacje (stan obligacji z panelu zasobów, js/44-wot-zasoby.js):
   zielona — obligacji wystarcza · pomarańczowa — brakuje najwyżej 25% ceny · czerwona — brakuje więcej */
const obDot = r => { if(has(r.n) || typeof GK==='undefined' || !GK) return ''; const ob=gkNum(GK['Obligacje']), p=+r.p||0; if(ob===null||!p) return '';
  const c=ob>=p?'ok':ob>=p*0.75?'blisko':'brak', t=ob>=p?'Stać Cię — zostanie '+fmt(ob-p,0)+' obl.':'Brakuje '+fmt(p-ob,0)+' obl.';
  return `<span class="ob-dot ${c}" title="${t}" role="img" aria-label="${t}"></span>`; };
const obligNeed = rows => rows.filter(r=>!has(r.n)).reduce((a,r)=>a+(+r.p||0),0);
const magQty = (n, def) => { const v=S.mag[slug(n)]; return (v===undefined||v===null)? def : v; };
const magItems = () => D.mag.map(x=>({n:x[0], p:x[1], q:magQty(x[0], x[2])}));
const konsItems = () => D.kons.map(x=>({n:x[0], p:x[1], q:magQty(x[0], 0)}));
const magValue = () => [...magItems(),...konsItems()].reduce((a,i)=>a+i.p*i.q*0.5,0);

function cells(list){ return `<div class="grid g${list.length} sum-strip">${list.map(c=>`<div class="cell"><span class="label">${c[0]}</span><span class="big">${c[1]}</span><p>${c[2]}</p></div>`).join('')}</div>`; }
function wotSummary(k){
  if(k==='przep'){
    const pIn=D.przep.filter(x=>has(x[2])).length;
    const have=tokSum('free')+tokSum('ulep'), miss=przepMiss();
    return cells([
      ['W garażu', `${pIn}<small>/ ${D.przep.length}</small>`, 'czołgów z przepustki'],
      ['Koszt brakujących', `${miss}<small>żet.</small>`, 'suma cen czołgów bez kwadratu'],
      ['Żetony do zdobycia', `${have}<small>żet.</small>`, `${tokSum('free')} free + ${tokSum('ulep')} ulep.`],
      ['Brakuje żetonów', `${Math.max(0,miss-have)}<small>żet.</small>`, miss>have?'tyle trzeba jeszcze zdobyć na wszystkie czołgi':'masz dość żetonów na wszystkie czołgi']]);
  }
  if(k==='oblig'){
    const rows=S.oblig, n=obligNeed(rows), got=rows.filter(r=>has(r.n)).length;
    return cells([
      ['Brakująca pula', fmt(n), 'obligacji na czołgi bez kwadratu'],
      ['W garażu', `${got}<small>/ ${rows.length}</small>`, 'czołgów ze sklepu za obligacje']]);
  }
  if(k==='mag'){
    const it=magItems(), ko=konsItems();
    return cells([
      ['Wartość magazynu', `${fmt(magValue()/1e6,2)}<small>mln</small>`, 'przy sprzedaży za 50% ceny'],
      ['Wyposażenie', `${it.reduce((a,i)=>a+i.q,0)}<small>szt.</small>`, `${it.filter(i=>i.q>0).length} z ${it.length} rodzajów`],
      ['Materiały', `${ko.reduce((a,i)=>a+i.q,0)}<small>szt.</small>`, `${ko.filter(i=>i.q>0).length} z ${ko.length} rodzajów`]]);
  }
  if(k==='exp'){
    const nonzero=S.exp.filter(r=>expLeft(r)>0), eIn=S.exp.filter(r=>has(r.n)).length;
    const brs=[...new Set(S.exp.map(r=>r.br))].map(b=>({b, xp:S.exp.filter(r=>r.br===b).reduce((a,r)=>a+expLeft(r),0), last:S.exp.filter(r=>r.br===b).sort((x,y)=>x.o-y.o).pop()})).filter(x=>x.xp>0).sort((a,b)=>a.xp-b.xp);
    return `<div class="grid g3 sum-strip">
      ${[['Do zdobycia', `${fmt(expAll()/1e6,2)}<small>mln XP</small>`, `${nonzero.length} czołgów z brakującym XP`],
      ['Skończone', `${eIn}<small>/ ${S.exp.length}</small>`, 'czołgów na liście'],
      ['Najbliższa gałąź', brs[0]?esc(brs[0].last.n):'—', brs[0]?`${fmt(brs[0].xp)} XP do końca gałęzi`:'brak danych']].map(c=>`<div class="cell"><span class="label">${c[0]}</span><span class="big">${c[1]}</span><p>${c[2]}</p></div>`).join('')}</div>`;
  }
  return '';
}
function pWot(){
  return `<h1>World <span class="acc">of</span> Tanks</h1>
  <div class="tabs" role="tablist">${WOT_TABS.map(([k,n])=>`<button role="tab" id="tab-${k}" data-tab="${k}">${n}</button>`).join('')}</div>
  <div class="panel" id="wotPanel"></div>
  <p class="sync" id="syncNote">${syncText()}</p>
`;
}
/* pola liczbowe: liczby całkowite pokazywane z odstępami (24 000), procenty jako zwykłe pole liczbowe */
const grp = v => v===''||v==null ? '' : String(v).replace(/\B(?=(\d{3})+(?!\d))/g,'\u00a0');
const numIn = (cls, attrs, val, label) => /\bpct\b/.test(cls)
  ? `<input type="number" inputmode="decimal" min="0" class="num-in ${cls}" ${attrs} value="${val}" aria-label="${esc(label)}">`
  : `<input type="text" inputmode="numeric" autocomplete="off" class="num-in grp ${cls}" ${attrs.replace(/\s*step="[^"]*"/,'')} value="${grp(val)}" aria-label="${esc(label)}">`;
/* odstępy wstawiane na bieżąco podczas pisania, kursor zostaje za tą samą cyfrą */
document.addEventListener('input', e=>{ const t=e.target; if(!t.matches||!t.matches('input.num-in.grp')) return;
  const pos=t.selectionStart||0, digBefore=t.value.slice(0,pos).replace(/\D/g,'').length;
  const raw=t.value.replace(/\D/g,''); const out=grp(raw); if(out===t.value) return; t.value=out;
  let k=0, c=0; while(c<out.length && k<digBefore){ if(/\d/.test(out[c])) k++; c++; } t.setSelectionRange(c,c); });
function wotPanel(k){
  if(k==='cele') return celeHtml();
  if(k==='zak') return wzHtml();   /* js/41-wot-zakupy.js */
  if(k==='gar') return grHtml();   /* js/42-wot-garaz.js */
  if(k==='tryby') return tyHtml();   /* js/45-wot-tryby.js */
  const top = wotSummary(k);
  if(k==='przep'){
    const rows=D.przep.map(x=>`<tr class="${has(x[2])?'':'dim'}"><td>${box(x[2])}</td><td class="mono">${x[0]}</td><td>${esc(x[1])}</td><td>${esc(x[2])}</td><td class="n">${x[3]}</td></tr>`).join('');
    const t=tok();
    const trows=[0,1,2].map(i=>`<tr><td>Przepustka ${i+1}</td><td class="n">${numIn('tok','data-k="free" data-i="'+i+'"',t.free[i],'Przepustka '+(i+1)+' free')}</td><td class="n">${numIn('tok','data-k="ulep" data-i="'+i+'"',t.ulep[i],'Przepustka '+(i+1)+' ulepszona')}</td></tr>`).join('');
    return `${top}<div class="split"><div class="tbl-wrap"><table><thead><tr><th>Garaż</th><th>Tier</th><th>Nacja</th><th>Czołg</th><th class="n">Cena [żet.]</th></tr></thead><tbody>${rows}</tbody>
      <tfoot><tr><td></td><td colspan="3">Koszt brakujących</td><td class="n">${przepMiss()}</td></tr></tfoot></table></div>
      <div class="tbl-wrap"><table><thead><tr><th>Żetony</th><th class="n">Free</th><th class="n">Ulep.</th></tr></thead><tbody>${trows}</tbody>
      <tfoot><tr><td>Do zdobycia</td><td class="n">${tokSum('free')}</td><td class="n">${tokSum('ulep')}</td></tr></tfoot></table></div></div>`;
  }
  if(k==='oblig'){
    return `${top}<div class="tiers">${TIERS.map(tier=>{
      const rows=S.oblig.filter(r=>r.tier===tier).sort((a,b)=>a.o-b.o);
      const g=rows.filter(r=>has(r.n)).length;
      return `<div class="tier${rows.length>10?' wide':''}"><div class="tier-head"><b>${tier}</b><span class="label">${g}/${rows.length} · ${fmt(obligNeed(rows))} obl.</span></div>
        ${rows.length?`<ul>${rows.map(r=>`<li class="${has(r.n)?'got':''}"><span class="nm">${box(r.n)}<span class="tn">${esc(r.n)}</span></span><span class="pr">${obDot(r)}${fmt(r.p)}<button type="button" class="del" data-del="${esc(r.id)}" aria-label="Usuń ${esc(r.n)}">×</button></span></li>`).join('')}</ul>`:'<div class="empty">Brak pozycji</div>'}
        <form class="addrow" data-tier="${tier}"><input name="n" id="add-n-${tier}" placeholder="Nazwa czołgu" aria-label="Nazwa czołgu, tier ${tier}" required><input name="p" id="add-p-${tier}" type="number" min="0" step="any" placeholder="Cena" aria-label="Cena w obligacjach" required><button type="submit">Dodaj</button></form>
      </div>`}).join('')}</div>`;
  }
  if(k==='mag'){
    const it=magItems(), ko=konsItems();
    const row=i=>`<tr class="${i.q?'':'dim'}"><td>${esc(i.n)}</td><td class="n">${fmt(i.p)}</td><td class="n">${numIn('mq','data-n="'+esc(i.n)+'"',i.q,i.n+' w magazynie')}</td><td class="n">${fmt(i.p*i.q*0.5)}</td></tr>`;
    const v1=it.reduce((a,i)=>a+i.p*i.q*0.5,0), v2=ko.reduce((a,i)=>a+i.p*i.q*0.5,0);
    return `${top}<div class="split even"><div class="tbl-wrap"><table><thead><tr><th>Wyposażenie</th><th class="n">Cena</th><th class="n">W magazynie</th><th class="n">Wartość</th></tr></thead><tbody>${it.map(row).join('')}</tbody>
      <tfoot><tr><td colspan="3">Razem wyposażenie</td><td class="n">${fmt(v1)}</td></tr></tfoot></table></div>
      <div class="tbl-wrap"><table><thead><tr><th>Materiały eksploatacyjne</th><th class="n">Cena</th><th class="n">W magazynie</th><th class="n">Wartość</th></tr></thead><tbody>${ko.map(row).join('')}</tbody>
      <tfoot><tr><td colspan="3">Razem materiały</td><td class="n">${fmt(v2)}</td></tr></tfoot></table></div></div>`;
  }
  if(k==='exp'){
    const open=expOpen();
    const nat=NATIONS.map(nc=>{
      const rows=S.exp.filter(r=>r.nac===nc);
      const brs=[...new Set(rows.map(r=>r.br))].sort((a,b)=>a-b);
      const tot=rows.reduce((a,r)=>a+expLeft(r),0), g=rows.filter(r=>has(r.n)).length;
      const tables=brs.map((b,bi)=>{
        const rs=rows.filter(r=>r.br===b).sort((x,y)=>x.o-y.o);
        const bt=rs.reduce((a,r)=>a+expLeft(r),0);
        const gd=rs.filter(r=>has(r.n)).length;
        const xin=(r,f,lbl,extra='')=>numIn('ex xp'+(f==='zn'?' pct':''),'data-id="'+esc(r.id)+'" data-f="'+f+'"'+extra,r[f],r.n+' '+lbl);
        /* pole XP + przycisk „zbadane” — zbadana wartość nie wlicza się do sumy */
        const xok=(r,f,ok,lbl)=>`<span class="xpcell${r[ok]?' ok':''}">${fxpLight(r,f)}${xin(r,f,lbl)}<button type="button" class="zb" data-zb="${esc(r.id)}" data-f="${ok}" aria-pressed="${!!r[ok]}" title="${r[ok]?'Zbadane — kliknij, żeby cofnąć':'Oznacz jako zbadane'}">${r[ok]?'✓ zbadane':'zbadane'}</button></span>`;
        return `<div class="branch"><div class="branch-top"><div class="branch-ttl"><span class="label">Gałąź ${bi+1} · ${gd}/${rs.length} skończonych</span>
            <h3>${rs.map(r=>`<span class="${has(r.n)?'got':''}">${esc(r.n)}</span>`).join('<i>→</i>')}</h3></div>
          <div class="branch-sum"><span class="label">Do zdobycia</span><b>${fmt(bt)}</b><small>XP</small></div></div>
        <div class="tbl-wrap"><table class="exp-t"><thead><tr><th class="c-chk"><span class="sr">Skończony</span></th><th>Czołg</th><th class="n">Moduły</th><th class="n">Potrzebne XP</th><th class="n">Zniżka</th><th class="n">Posiadane</th><th class="n">Do zdobycia</th><th></th></tr></thead><tbody>
        ${rs.map(r=>`<tr class="${has(r.n)?'done':(expRaw(r)>0?'':'dim')}"><td class="c-chk">${box(r.n)}</td>
          <td><input class="ed ed-name" data-id="${esc(r.id)}" data-f="n" value="${esc(r.n)}" aria-label="Nazwa czołgu"></td>
          <td class="n">${xok(r,'mod','modOk','moduły')}</td>
          <td class="n">${xok(r,'cz','czOk','potrzebne XP')}</td>
          <td class="n"><span class="pctw">${xin(r,'zn','zniżka w procentach',' max="100" step="any"')}<em>%</em></span></td>
          <td class="n">${xin(r,'pos','posiadane XP')}</td>
          <td class="n left">${has(r.n)?`<s class="struck">${fmt(expRaw(r))}</s> <b>0</b>`:`<b>${fmt(expRaw(r))}</b>`}${!has(r.n)&&expZPopr(r)?`<small class="xp-carry">−${fmt(expZPopr(r))} z poprzednika</small>`:''}</td>
          <td class="n"><button type="button" class="del" data-delexp="${esc(r.id)}" aria-label="Usuń ${esc(r.n)}">×</button></td></tr>`).join('')}
        </tbody></table></div>
        <form class="addrow addexp" data-nac="${esc(nc)}" data-br="${b}"><input name="n" id="addexp-${b}" placeholder="+ Dodaj czołg do tej gałęzi" aria-label="Nazwa nowego czołgu" required><button type="submit">Dodaj</button></form></div>`;
      }).join('');
      return `<details class="nation" data-nac="${esc(nc)}"${open.includes(nc)?' open':''}><summary><span class="nat-name">${esc(NAT_NAMES[nc]||nc)}</span><span class="nat-meta"><span class="label">${rows.length} czołgów · ${g} skończonych</span><span class="nat-xp">${fmt(tot)} XP</span></span></summary>
        <div class="nat-body">${tables||'<div class="empty">Brak czołgów</div>'}
        <form class="addrow addbranch" data-nac="${esc(nc)}"><input name="n" id="addbr-${esc(slug(nc))}" placeholder="Pierwszy czołg nowej gałęzi" aria-label="Pierwszy czołg nowej gałęzi" required><button type="submit">Nowa gałąź</button></form></div></details>`;
    }).join('');
    return `${top}<div class="nations">${nat}</div>`;
  }
  if(k==='moe'){
    const M=moeVals();
    return `<div class="calc"><div><h3 style="margin-bottom:16px">Dane wejściowe</h3><div class="fields">
      <div class="field"><label for="m1p">Próg 1 [%]</label><select id="m1p"><option value="0"${+M.m1p===0?" selected":""}>0%</option><option value="65"${+M.m1p===65?" selected":""}>65%</option><option value="85"${+M.m1p===85?" selected":""}>85%</option><option value="100"${+M.m1p===100?" selected":""}>100%</option></select></div>
      <div class="field"><label for="m1v">Próg 1 [dmg]</label><input id="m1v" type="number" value="${M.m1v}"></div>
      <div class="field"><label for="m2p">Próg 2 [%]</label><select id="m2p"><option value="0"${+M.m2p===0?" selected":""}>0%</option><option value="65"${+M.m2p===65?" selected":""}>65%</option><option value="85"${+M.m2p===85?" selected":""}>85%</option><option value="100"${+M.m2p===100?" selected":""}>100%</option></select></div>
      <div class="field"><label for="m2v">Próg 2 [dmg]</label><input id="m2v" type="number" value="${M.m2v}"></div>
      <div class="field"><label for="mp">Twój % MOE</label><input id="mp" type="number" step="0.01" value="${M.mp}"></div>
      <div class="field"><label for="mc">Twój łączony dmg</label><input id="mc" type="number" value="${M.mc}"></div>
      <div class="field wide"><label for="mb">Łączone w następnej bitwie</label><input id="mb" type="number" value="${M.mb}"></div>
    </div></div>
    <div class="result" id="moeOut"></div></div>`;
  }

}
const MOE_DEF={m1p:85,m1v:3222,m2p:100,m2v:3974,mp:87.5,mc:3420,mb:0};
function moeVals(){ try{ return {...MOE_DEF, ...JSON.parse(store.get('moe','{}'))}; }catch(e){ return {...MOE_DEF}; } }
function moeCalc(){
  const v=id=>parseFloat($('#'+id).value)||0;
  store.set('moe', JSON.stringify(Object.fromEntries(Object.keys(MOE_DEF).map(k=>[k, $('#'+k).value]))));
  const p1=v('m1p'),d1=v('m1v'),p2=v('m2p'),d2=v('m2v'),p=v('mp'),c=v('mc'),b=v('mb');
  if(p2===p1){ $('#moeOut').innerHTML='<p class="note">Progi muszą mieć różne procenty.</p>'; return; }
  const k=(d2-d1)/(p2-p1);
  const need=d1+(p-p1)*k;
  const next=c*99/101+b*2/101;
  const np=p1+(next-d1)/k;
  const ch=np-p;
  $('#moeOut').innerHTML=`
    <div class="row"><span class="label">Wymóg dla ${fmt(p,2)}%</span><span class="v">${fmt(need)}</span></div>
    <div class="row"><span class="label">Łączony po bitwie</span><span class="v">${fmt(next)}</span></div>
    <div class="row"><span class="label">MOE po bitwie</span><span class="v">${fmt(np,2)}%</span></div>
    <div class="row"><span class="label">Zmiana</span><span class="v ${ch>=0?'up':'down'}">${ch>=0?'+':'−'}${fmt(Math.abs(ch),2)}%</span></div>
    <div class="row"><span class="label">Łączony, by nie spaść</span><span class="v">${fmt(c)}</span></div>`;
}



/* ——— stan WoT: garaż, magazyn, żetony, obligacje (chmura przez db, kopia w przeglądarce) ——— */
const slug = n => String(n).toLowerCase().replace(/ł/g,'l').normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'') || 'x';
const DEF_OBLIG = D.oblig.flatMap(t=>t.t.map((x,i)=>({id:'xl-'+t.tier+'-'+i, tier:t.tier, n:x[0], p:x[1], o:i})));
const DEF_EXP = D.exp2.map((r,i)=>({id:'xe-'+i, modOk:false, czOk:false, ...r}));
const NATIONS = D.nations;
const NAT_NAMES = {'NIEMCY':'Niemcy','ZSRR':'ZSRR','USA':'USA','FRANCJA':'Francja','G.B':'Wielka Brytania','CHINY':'Chiny','JAPONIA':'Japonia','CZECHY':'Czechosłowacja','POLSKA':'Polska','SZWECJA':'Szwecja','WŁOCHY':'Włochy'};
let S = {garage:{}, mag:{}, tok:{free:[5,5,5], ulep:[3,3,3]}, oblig:DEF_OBLIG, exp:DEF_EXP};
try{ const c=JSON.parse(store.get('wotState','null')); if(c) S={...S,...c}; else { const g=JSON.parse(store.get('garaz','{}')); if(g) S.garage=g; } }catch(e){}
const saveLocal = () => store.set('wotState', JSON.stringify(S));
if(!Array.isArray(S.exp)||!S.exp.length||S.exp[0].mod===undefined) S.exp=DEF_EXP;
/* poprawki linii: Hirschkäfer osobno (po Grille 15), Bassotto do Włoch, T-34-2 w linii średnich Chin */
function fixExp(){
  const ch=[]; let E=S.exp.map(r=>({...r}));
  const hk=E.find(r=>r.n==='Hirschkafer'&&r.nac==='NIEMCY');
  if(hk && E.some(r=>r!==hk && r.br===hk.br)){ hk.br=Math.max(...E.map(r=>r.br))+1; hk.o=0; ch.push(hk); }
  const ba=E.find(r=>r.n==='Bassotto'&&r.nac!=='WŁOCHY');
  if(ba){ ba.nac='WŁOCHY'; const smv=E.find(r=>r.n==='SMV CC-56'); if(smv){ ba.br=smv.br; ba.o=Math.min(...E.filter(r=>r.br===smv.br&&r!==ba).map(r=>r.o))-1; } ch.push(ba); }
  const fa=E.find(r=>r.n==='Fauteur'), ax=E.find(r=>r.n==='AX-XX 40t');
  if(fa && ax && fa.br===ax.br){ ax.br=Math.max(...E.map(r=>r.br))+1; ax.o=0; ch.push(ax); }
  E.filter(r=>r.n==='T-34-2G FT' && E.some(x=>x.br===r.br && x.n==='WZ-120')).forEach(r=>{ r.n='T-34-2'; ch.push(r); });
  if(!ch.length) return [];
  S.exp=E; saveLocal(); return ch;
}
fixExp();
delete S.bast;   /* stary Ostatni Bastion — dane są w Trybach (js/45-wot-tryby.js) */
/* ——— ile XP zostało do zdobycia — liczone po kolei w gałęzi, jak w grze ———
   Potrzebne XP = koszt tego czołgu, Moduły = jego moduły, Posiadane = XP zebrane NA TYM czołgu.
   XP z czołgu idzie najpierw na jego moduły, a reszta na koszt NASTĘPNEGO czołgu w gałęzi
   (np. 6 000 XP na FV304 → Crusader za 30 000 kosztuje już tylko 24 000).
   Pierwszy czołg gałęzi nie ma poprzednika w tabeli, więc jego Posiadane odlicza się też od jego kosztu.
   Zbadane (✓) moduły / czołg liczą się jako 0. */
let _expSrc=null, _expMap=new Map();
function expCalcAll(){
  if(_expSrc===S.exp) return _expMap;
  const m=new Map(), gal={};
  S.exp.forEach(r=>{ (gal[r.br]=gal[r.br]||[]).push(r); });
  Object.values(gal).forEach(rows=>{ rows.sort((a,b)=>a.o-b.o); let zPopr=0;
    rows.forEach((r,i)=>{
      const czP=r.czOk?0:(+r.cz||0)*(1-Math.min(100,+r.zn||0)/100), modP=r.modOk?0:(+r.mod||0);
      let pos=Math.max(0,+r.pos||0), czL, zPoprzed=0;
      if(i===0){ const u=Math.min(czP,pos); czL=czP-u; pos-=u; }
      else { zPoprzed=Math.min(czP,zPopr); czL=czP-zPoprzed; }
      const um=Math.min(modP,pos); pos-=um; zPopr=pos;               /* reszta XP przechodzi na następny czołg */
      m.set(r.id,{left:Math.max(0,Math.round(czL+modP-um)), zPopr:Math.round(zPoprzed), czL:Math.max(0,Math.round(czL)), modL:Math.max(0,Math.round(modP-um))});
    }); });
  _expSrc=S.exp; _expMap=m; return m;
}
const expRaw = r => (expCalcAll().get(r.id)||{left:0}).left;
const expZPopr = r => (expCalcAll().get(r.id)||{zPopr:0}).zPopr;
/* wolne XP na koncie + światełko: brakujące XP danej rzeczy vs. wolne XP */
const FXP_PROG = 0.8;
/* wolne XP zawsze z panelu zasobów (Wargaming API → GK, js/44-wot-zasoby.js); bez danych z API — 0 */
const fxpWolne = () => { const v=(typeof GK!=='undefined'&&GK)?gkNum(GK['Wolne XP']):null; return v===null?0:Math.round(v); };
function fxpNeed(r, f){   /* ile kosztuje rzecz i ile XP z czołgu można na nią wydać */
  if(f==='mod') return {koszt:r.modOk?0:Math.max(0,+r.mod||0), zCz:Math.max(0,+r.pos||0), skad:r.n};
  const rows=S.exp.filter(x=>x.br===r.br).sort((a,b)=>a.o-b.o), i=rows.findIndex(x=>x.id===r.id), src=i>0?rows[i-1]:r;
  return {koszt:r.czOk?0:Math.round((+r.cz||0)*(1-Math.min(100,+r.zn||0)/100)), zCz:Math.max(0,+src.pos||0), skad:src.n};
}
function fxpLight(r, f){   /* f: 'mod' | 'cz' */
  const wotFxp=fxpWolne(), ok=f==='mod'?r.modOk:r.czOk, N=fxpNeed(r,f), need=Math.max(0, N.koszt-N.zCz), ma=Math.min(N.koszt,N.zCz)+wotFxp;
  if(has(r.n) || ok || !(N.koszt>0)) return '<span class="fxl none" aria-hidden="true"></span>';
  const st=wotFxp>=need?'g':ma>=N.koszt*FXP_PROG?'o':'r';
  const sklad=`${N.zCz?`${fmt(Math.min(N.koszt,N.zCz))} XP na ${N.skad} + `:''}${fmt(wotFxp)} wolnego`;
  const t=st==='g'?`Stać cię: koszt ${fmt(N.koszt)}, masz ${sklad}`:`Brakuje ${fmt(need-wotFxp)} XP: koszt ${fmt(N.koszt)}, masz ${sklad} (${fmt(Math.floor(ma/N.koszt*100))} %)`;
  return `<span class="fxl ${st}" role="img" aria-label="${t}" title="${t}"></span>`;
}
const expLeft = r => has(r.n) ? 0 : expRaw(r);
const expAll = () => S.exp.reduce((a,r)=>a+expLeft(r),0);
const expOpen = () => { try{ return JSON.parse(store.get('expOpen','[]'))||[]; }catch(e){ return []; } };
function setExp(id, f, v){
  S.exp=S.exp.map(r=>r.id===id?{...r,[f]:v}:r); saveLocal(); refreshWot();
  cloud(db=>db.collection('exp').doc(id).update({[f]:v}));
}
document.addEventListener('click', e=>{ const b=e.target.closest('button.zb'); if(!b) return;
  const r=S.exp.find(x=>x.id===b.dataset.zb); if(r) setExp(r.id, b.dataset.f, !r[b.dataset.f]); });
function addExp(nac, br, n){
  const o=Math.max(-1,...S.exp.filter(r=>r.br===br).map(r=>r.o))+1;
  const id='e'+Date.now().toString(36)+Math.random().toString(36).slice(2,6);
  const doc={nac,br,o,n,mod:0,cz:0,zn:0,pos:0};
  S.exp=[...S.exp,{id,...doc}]; saveLocal(); refreshWot();
  cloud(db=>db.collection('exp').doc(id).set(doc));
}
function delExp(id){
  S.exp=S.exp.filter(r=>r.id!==id); saveLocal(); refreshWot();
  cloud(db=>db.collection('exp').doc(id).delete());
}
let gdb = null, syncState = 'local';
const has = n => !!S.garage[slug(n)];
const box = n => `<input type="checkbox" class="sq" data-t="${esc(String(n))}" aria-label="${esc(String(n))} w garażu"${has(n)?' checked':''}>`;
function syncText(){
  return { local:'Zapis tylko w tej przeglądarce.',
           wait:'Łączenie z zapisem w chmurze…', cloud:(typeof gdb!=='undefined'&&gdb&&gdb.arkusz)?'Zapisywane w Arkuszu Google, widoczne na każdym urządzeniu.':'Zapisywane na koncie, widoczne na każdym urządzeniu.',
           err:'Nie udało się zapisać w chmurze. Zmiana jest zapisana w tej przeglądarce.' }[syncState];
}
function refreshWot(force){
  if(!$('#wotPanel')) return;
  $('#syncNote').textContent = syncText();
  const a=document.activeElement;
  if(!force && a && a.closest && a.closest('#wotPanel') && a.matches('input:not([type=checkbox])')) return; // nie przerywaj wpisywania
  if(['przep','oblig','mag','exp'].includes(wotTab)){ const y=window.scrollY; $('#wotPanel').innerHTML = wotPanel(wotTab); window.scrollTo(0,y); }
}
async function cloud(fn){
  if(!gdb) return;
  try{ await fn(gdb); }catch(e){ syncState='err'; $('#syncNote') && ($('#syncNote').textContent=syncText()); }
}
function toggleTank(name, on){
  const id=slug(name);
  if(on) S.garage[id]=true; else delete S.garage[id];
  saveLocal(); refreshWot();
  cloud(db=>db.collection('garaz').doc(id).set({g:on, n:String(name)}));
}
function setMag(name, q){
  const id=slug(name); S.mag[id]=q; saveLocal(); refreshWot();
  cloud(db=>db.collection('mag').doc(id).set({q, n:name}));
}
function setTok(k, i, v){
  S.tok={...S.tok, [k]:S.tok[k].map((x,j)=>j===i?v:x)}; saveLocal(); refreshWot();
  cloud(db=>db.collection('cfg').doc('zetony').set({free:S.tok.free, ulep:S.tok.ulep}));
}
function addOblig(tier, n, p){
  const o=Math.max(-1,...S.oblig.filter(r=>r.tier===tier).map(r=>r.o))+1;
  const id='r'+Date.now().toString(36)+Math.random().toString(36).slice(2,6);
  S.oblig=[...S.oblig,{id,tier,n,p,o}]; saveLocal(); refreshWot();
  cloud(db=>db.collection('oblig').doc(id).set({tier,n,p,o}));
}
function delOblig(id){
  S.oblig=S.oblig.filter(r=>r.id!==id); saveLocal(); refreshWot();
  cloud(db=>db.collection('oblig').doc(id).delete());
}
const toInt = v => Math.max(0, Math.round(+String(v).replace(/[\s\u00a0]/g,'').replace(',','.')||0));
document.addEventListener('change', e=>{
  const t=e.target;
  if(t.matches('input.sq[data-t]')) return toggleTank(t.dataset.t, t.checked);
  if(t.matches('input.mq')) { t.blur(); return setMag(t.dataset.n, toInt(t.value)); }
  if(t.matches('input.tok')) { t.blur(); return setTok(t.dataset.k, +t.dataset.i, toInt(t.value)); }
  if(t.matches('input.ex')) { t.blur(); const v=t.dataset.f==='zn'?Math.min(100,Math.max(0,+t.value||0)):toInt(t.value); return setExp(t.dataset.id, t.dataset.f, v); }
  if(t.matches('input.ed-name')) { t.blur(); const v=t.value.trim(); if(v) return setExp(t.dataset.id, 'n', v); t.value=(S.exp.find(r=>r.id===t.dataset.id)||{}).n||''; return; }
});
document.addEventListener('keydown', e=>{ if(e.key==='Enter' && e.target.matches('input.num-in, input.ed')) e.target.blur(); });
document.addEventListener('toggle', e=>{ const d=e.target; if(!d.matches||!d.matches('details.nation')) return; const s=new Set(expOpen()); d.open?s.add(d.dataset.nac):s.delete(d.dataset.nac); store.set('expOpen', JSON.stringify([...s])); }, true);
document.addEventListener('submit', e=>{
  const f=e.target.closest('form.addrow'); if(!f) return; e.preventDefault();
  if(f.classList.contains('addexp')||f.classList.contains('addbranch')){
    const n=f.n.value.trim(); if(!n) return; f.reset(); document.activeElement && document.activeElement.blur();
    const br=f.classList.contains('addexp')? +f.dataset.br : Math.max(-1,...S.exp.map(r=>r.br))+1;
    return addExp(f.dataset.nac, br, n);
  }
  const n=f.n.value.trim(), p=toInt(f.p.value); if(!n) return;
  f.reset(); document.activeElement && document.activeElement.blur();
  addOblig(f.dataset.tier, n, p);
});
document.addEventListener('click', e=>{
  const b=e.target.closest('button.del'); if(!b) return;
  if(b.dataset.armed){ b.dataset.delexp ? delExp(b.dataset.delexp) : delOblig(b.dataset.del); return; }
  b.dataset.armed='1'; b.textContent='Usuń?'; b.classList.add('armed');
  setTimeout(()=>{ if(b.isConnected){ delete b.dataset.armed; b.textContent='×'; b.classList.remove('armed'); } }, 3000);
});
