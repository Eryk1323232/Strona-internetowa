/* ════════════════════════════════════════════════════════════════════════
   SIŁOWNIA → POSTĘPY: wykres szacowanego 1RM, rekordy osobiste, puchar przy nowym rekordzie
   ════════════════════════════════════════════════════════════════════════
   Szacowany 1RM (wzór Epleya): ciężar × (1 + powtórzenia / 30) — liczony dla serii 1–12 powtórzeń.
   pgDane()   — dla każdego ćwiczenia: najlepszy 1RM z każdego treningu, rekord, najcięższa seria.
   pgHtml()   — sekcja „Postępy” w Siłowni (wybór ćwiczenia, kafle, wykres, tabela rekordów).
   pgPrCheck(form) — w okienku treningu zaznacza serie, które biją dotychczasowy rekord (puchar).
   Wykres rysuje wyLine z js/27-wykresy.js.
   ════════════════════════════════════════════════════════════════════════ */
const pgE1 = (w,r) => (w>0 && r>0 && r<=12) ? w*(1+r/30) : 0;
const pgK = n => String(n||'').trim().toLowerCase();
let pgSel = store.get('pgSel','');

function pgDane(skipId){
  const M=new Map();
  [...TR].filter(t=>t.id!==skipId).sort((a,b)=>a.d.localeCompare(b.d)||a.c-b.c).forEach(t=>t.ex.forEach(e=>{
    const k=pgK(e.n); if(!k) return; const sets=e.sets.filter(s=>s.w>0&&s.r>0); if(!sets.length) return;
    if(!M.has(k)) M.set(k,{n:e.n, ses:[], pr:null, maxW:null, n_ses:0});
    const x=M.get(k); let bestE=0, bestS=null; sets.forEach(s=>{ const v=pgE1(s.w,s.r); if(v>bestE){ bestE=v; bestS=s; } if(!x.maxW||s.w>x.maxW.w||(s.w===x.maxW.w&&s.r>x.maxW.r)) x.maxW={w:s.w,r:s.r,d:t.d}; });
    const vol=sets.reduce((a,s)=>a+s.w*s.r,0); x.n_ses++;
    if(bestE){ const last=x.ses[x.ses.length-1]; if(last&&last.d===t.d){ if(bestE>last.e1){ last.e1=bestE; last.s=bestS; } last.vol+=vol; } else x.ses.push({d:t.d, e1:bestE, s:bestS, vol}); }
    if(bestE && (!x.pr||bestE>x.pr.e1)) x.pr={e1:bestE, d:t.d, w:bestS.w, r:bestS.r};
  }));
  return M;
}
const pgKg = v => fmt(v, Number.isInteger(Math.round(v*10)/10)?0:1)+' kg';

function pgHtml(){
  const M=pgDane(), L=[...M.values()].filter(x=>x.ses.length).sort((a,b)=>b.n_ses-a.n_ses||a.n.localeCompare(b.n,'pl'));
  if(!L.length) return `<div class="nt-blank"><p>Postępy pojawią się po pierwszych zapisanych treningach (ciężar i powtórzenia).</p></div>`;
  let x=M.get(pgK(pgSel)); if(!x||!x.ses.length) x=L[0];
  const S=x.ses, first=S[0], last=S[S.length-1], zm=first.e1?(last.e1-first.e1)/first.e1*100:0, td=todayISO();
  const nowy=r=>r && (new Date(td)-new Date(r.d))/864e5<=7;
  return `<div class="pg-bar"><label class="pg-sel"><span class="label">Ćwiczenie</span><select class="pg-ex" aria-label="Wybierz ćwiczenie">${L.map(y=>`<option value="${esc(y.n)}"${y===x?' selected':''}>${esc(y.n)} (${y.n_ses})</option>`).join('')}</select></label></div>
    <div class="grid g4 sum-strip">
      <div class="cell"><span class="label">Rekord · szac. 1RM</span><span class="big">${fmt(x.pr.e1,1)}<small>kg</small></span><p>${nowy(x.pr)?`<span class="pg-nowy">${icn('puchar')} nowy</span> · `:''}${esc(dPL(x.pr.d))} · ${pgKg(x.pr.w)} × ${x.pr.r}</p></div>
      <div class="cell"><span class="label">Najcięższa seria</span><span class="big">${fmt(x.maxW.w,1)}<small>kg × ${x.maxW.r}</small></span><p>${esc(dPL(x.maxW.d))}</p></div>
      <div class="cell"><span class="label">Postęp od początku</span><span class="big ${zm>0?'pg-up':zm<0?'pg-down':''}">${zm>0?'+':''}${fmt(zm,1)}<small>%</small></span><p>${fmt(first.e1,1)} → ${fmt(last.e1,1)} kg · ${S.length} ${S.length===1?'trening':'treningów'}</p></div>
      <div class="cell"><span class="label">Ostatnio</span><span class="big">${fmt(last.e1,1)}<small>kg 1RM</small></span><p>${esc(dPL(last.d))} · objętość ${fmt(last.vol,0)} kg</p></div></div>
    ${wyBox(wyLine(S.map(s=>({x:s.d, y:Math.round(s.e1*10)/10, tip:`${fmt(s.e1,1)} kg`, sub:`${dPL(s.d)} · ${pgKg(s.s.w)} × ${s.s.r}`})),{u:'kg', label:'Szacowany 1RM — '+x.n}), `Szacowany 1RM — ${x.n}`)}
    <details class="pg-rek"><summary>Rekordy osobiste (${L.length} ${L.length===1?'ćwiczenie':'ćwiczeń'})</summary>
      <div class="tbl-wrap"><table><thead><tr><th>Ćwiczenie</th><th class="n">Szac. 1RM</th><th class="n">Seria rekordowa</th><th class="n">Najcięższa</th><th class="n">Data</th></tr></thead><tbody>
      ${[...L].sort((a,b)=>a.n.localeCompare(b.n,'pl')).map(y=>`<tr${y===x?' class="on"':''}><td><button type="button" class="pg-go" data-pg="${esc(y.n)}">${esc(y.n)}</button>${nowy(y.pr)?` <span class="pg-new" title="Rekord z ostatnich 7 dni">${icn('puchar')}</span>`:''}</td><td class="n"><b>${fmt(y.pr.e1,1)} kg</b></td><td class="n">${pgKg(y.pr.w)} × ${y.pr.r}</td><td class="n">${pgKg(y.maxW.w)} × ${y.maxW.r}</td><td class="n">${esc(dPL(y.pr.d))}</td></tr>`).join('')}
      </tbody></table></div><p class="pg-note">Szacowany 1RM = ciężar × (1 + powtórzenia / 30) (wzór Epleya, serie do 12 powtórzeń).</p></details>`;
}
function pgRefresh(){ const b=$('#gymPg'); if(b && !(b.contains(document.activeElement))) b.innerHTML=pgHtml(); }

/* 🏆 w okienku treningu: seria lepsza niż dotychczasowy rekord (bez bieżącego treningu) */
function pgPrCheck(form){
  if(!form || typeof trM==='undefined' || !trM) return;
  const M=pgDane(trM.tid);
  form.querySelectorAll('.tr-ex').forEach(box=>{ const rek=(M.get(pgK(box.dataset.n))||{}).pr; let top=null, topV=0;
    box.querySelectorAll('.tr-set').forEach(r=>{ const w=gNum(r.querySelector('[name=w]').value), rp=Math.round(gNum(r.querySelector('[name=r]').value)), v=pgE1(w,rp);
      if(v>topV){ topV=v; top=r; } r.querySelector('.tr-sn').classList.remove('pr'); });
    if(top && rek && topV>rek.e1+0.05){ const sn=top.querySelector('.tr-sn'); sn.classList.add('pr'); sn.title=`Nowy rekord! Szac. 1RM ${fmt(topV,1)} kg (było ${fmt(rek.e1,1)} kg)`; } });
}

document.addEventListener('change', e=>{ if(e.target.matches && e.target.matches('.pg-ex')){ pgSel=e.target.value; store.set('pgSel',pgSel); e.target.blur(); pgRefresh(); } });
document.addEventListener('click', e=>{ const b=e.target.closest&&e.target.closest('[data-pg]'); if(b){ pgSel=b.dataset.pg; store.set('pgSel',pgSel); pgRefresh(); const g=$('#gymPg'); g&&g.scrollIntoView({behavior:'smooth',block:'start'}); } });
