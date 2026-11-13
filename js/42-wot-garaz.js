/* ════════════════════════════════════════════════════════════════
   WORLD OF TANKS → zakładka „Garaż” (spis posiadanych czołgów)
   Pozycja: {id, nac, n, tier, p, cs, c}
     nac nacja (kody jak w Expieniu: NATIONS / NAT_NAMES z js/04) · n nazwa · tier I–XI
     p true = premium, false = drzewkowy · cs cena sprzedaży (kredyty, wpisywana ręcznie) · c kolejność dodania
   Formularz dodawania na górze; lista grupowana po nacji (kolejność jak w Expieniu), w nacji wg tieru i nazwy.
   Filtr Wszystkie / Drzewkowe / Premium (store 'grFiltr'); rozwinięte nacje — store 'grZwin' (zwinięte).
   Dane: localStorage 'wotGaraz' + kolekcja 'wotGaraz' w arkuszu (synchronizacja w js/12-synchronizacja.js).
   ════════════════════════════════════════════════════════════════ */
const GR_TIERY = ['I','II','III','IV','V','VI','VII','VIII','IX','X','XI'];
const grTierNr = t => GR_TIERY.indexOf(t)+1;
const grNorm = (id,v={}) => ({ id, nac:NATIONS.includes(v.nac)?v.nac:(NATIONS[0]||''), n:String(v.n||'').slice(0,80),
  tier:GR_TIERY.includes(v.tier)?v.tier:'', p:!!v.p, cs:Math.max(0,Math.round(+v.cs||0)), c:+v.c||0 });
let GR=[]; try{ const c=JSON.parse(store.get('wotGaraz','null')); if(Array.isArray(c)) GR=c.map(x=>grNorm(x.id,x)); }catch(e){}
const saveGr = () => store.set('wotGaraz', JSON.stringify(GR));
const grPush = x => cloud(db=>{ const {id,...v}=x; return db.collection('wotGaraz').doc(id).set(v); });
const grDel = id => cloud(db=>db.collection('wotGaraz').doc(id).delete());
const grZwin = () => { try{ return JSON.parse(store.get('grZwin','[]'))||[]; }catch(e){ return []; } };
const grOdm = (n,a,b,c) => n===1?a:(n%10>=2&&n%10<=4&&(n%100<10||n%100>=20))?b:c;

function grFormHtml(){
  const o=(()=>{ try{ return JSON.parse(store.get('grOst','{}'))||{}; }catch(e){ return {}; } })();
  return `<form class="gr-form" autocomplete="off">
    <div class="wz-pola">
      <label class="wz-f"><span class="label">Nacja</span><select name="nac">${NATIONS.map(nc=>`<option value="${esc(nc)}"${o.nac===nc?' selected':''}>${esc(NAT_NAMES[nc]||nc)}</option>`).join('')}</select></label>
      <label class="wz-f wz-fn"><span class="label">Nazwa</span><input name="n" placeholder="np. Tiger II" autocomplete="off"></label>
      <label class="wz-f wz-fs"><span class="label">Tier</span><select name="tier"><option value="">—</option>${GR_TIERY.map(t=>`<option>${t}</option>`).join('')}</select></label>
      <label class="wz-f wz-fp"><span class="label">Cena sprzedaży</span><input name="cs" class="num-in grp" inputmode="numeric" placeholder="0" autocomplete="off"></label>
    </div>
    <div class="wz-fbot"><div class="seg gr-typ" role="radiogroup" aria-label="Rodzaj czołgu">
        <button type="button" data-grtyp="0" aria-pressed="${!o.p}">Drzewkowy</button><button type="button" data-grtyp="1" aria-pressed="${!!o.p}">Premium</button></div>
      <span class="wz-prev gr-msg" role="status"></span><button type="submit" class="wz-add">Dodaj do garażu</button></div>
  </form>`;
}
function grWiersz(x){
  return `<li class="gr-it${x.p?' prem':''}"><span class="gr-tier">${x.tier||'—'}</span>
    <span class="gr-n">${esc(x.n)}</span>
    <button type="button" class="gr-pill" data-grp="${esc(x.id)}" title="Kliknij, żeby zmienić rodzaj">${x.p?'Premium':'Drzewkowy'}</button>
    <label class="gr-cena"><span class="sr">Cena sprzedaży ${esc(x.n)}</span><input class="num-in grp gr-cs" data-id="${esc(x.id)}" inputmode="numeric" value="${x.cs?grp(x.cs):''}" placeholder="cena"></label>
    <button type="button" class="del" data-grdel="${esc(x.id)}" aria-label="Usuń ${esc(x.n)}">×</button></li>`;
}
function grHtml(){
  const f=store.get('grFiltr','all'), L=GR.filter(x=>f==='all'||(f==='prem'?x.p:!x.p)), zw=grZwin();
  const suma=A=>A.reduce((a,x)=>a+x.cs,0), drz=GR.filter(x=>!x.p), pre=GR.filter(x=>x.p);
  const nat=NATIONS.map(nc=>{ const R=L.filter(x=>x.nac===nc).sort((a,b)=>grTierNr(a.tier)-grTierNr(b.tier)||a.n.localeCompare(b.n,'pl')); if(!R.length) return '';
    const np=R.filter(x=>x.p).length;
    return `<details class="gr-nat" data-nac="${esc(nc)}"${zw.includes(nc)?'':' open'}><summary><span class="gr-nn">${esc(NAT_NAMES[nc]||nc)}</span>
      <span class="gr-meta">${R.length} ${grOdm(R.length,'czołg','czołgi','czołgów')}${np?` · ${np} premium`:''} · <b>${fmt(suma(R),0)}</b></span></summary>
      <ul class="gr-l">${R.map(grWiersz).join('')}</ul></details>`; }).join('');
  return `<div class="gr">
    ${grFormHtml()}
    <div class="grid g4 px-cells wz-cells">
      <div class="cell"><span class="label">W garażu</span><span class="big wz-big">${GR.length}</span><p>${grOdm(GR.length,'czołg','czołgi','czołgów')}</p></div>
      <div class="cell"><span class="label">Drzewkowe</span><span class="big wz-big">${drz.length}</span><p>sprzedaż: ${fmt(suma(drz),0)}</p></div>
      <div class="cell"><span class="label">Premium</span><span class="big wz-big">${pre.length}</span><p>sprzedaż: ${fmt(suma(pre),0)}</p></div>
      <div class="cell"><span class="label">Wartość sprzedaży</span><span class="big wz-big">${fmt(suma(GR),0)}</span><p>wszystkie czołgi razem</p></div></div>
    <div class="gr-bar"><h3 class="wz-h">Moje czołgi</h3><div class="seg gr-filtr">${[['all','Wszystkie'],['drz','Drzewkowe'],['prem','Premium']].map(([v,n])=>`<button type="button" data-grf="${v}" aria-selected="${v===f}">${n}</button>`).join('')}</div></div>
    ${nat||`<p class="wz-pusto">${GR.length?'Brak czołgów w tym filtrze.':'Garaż jest pusty — dodaj pierwszy czołg wyżej.'}</p>`}
    <p class="gr-hint">Czołgi drzewkowe sprzedają się za 50% ceny zakupu — cenę sprzedaży wpisujesz sam (można ją poprawić w liście).</p></div>`;
}
function grRefresh(){ if(typeof wotTab==='undefined'||wotTab!=='gar'||!$('#wotPanel')) return; const a=document.activeElement;
  if(a && a.closest && a.closest('.gr') && a.matches('input') && a.value) return; const y=scrollY; $('#wotPanel').innerHTML=grHtml(); scrollTo(0,y); }
function grSet(id,patch){ const x=GR.find(y=>y.id===id); if(!x) return; const n=grNorm(id,{...x,...patch}); GR=GR.map(y=>y.id===id?n:y); saveGr(); grPush(n); }

document.addEventListener('submit', e=>{ const f=e.target; if(!f.matches||!f.matches('.gr-form')) return; e.preventDefault();
  const g=k=>(f.elements[k].value||'').trim(), msg=f.querySelector('.gr-msg'), p=f.querySelector('[data-grtyp="1"]').getAttribute('aria-pressed')==='true';
  if(!g('n')){ msg.textContent='Wpisz nazwę czołgu.'; f.elements.n.focus(); return; }
  const cs=g('cs')?bkNum(g('cs')):0; if(isNaN(cs)||cs<0){ msg.textContent='Cena sprzedaży musi być liczbą.'; return; }
  const x=grNorm(uid('gr'),{nac:g('nac'), n:g('n'), tier:g('tier'), p, cs, c:Date.now()});
  GR=[...GR,x]; saveGr(); grPush(x); store.set('grOst', JSON.stringify({nac:x.nac, p}));
  const zw=grZwin().filter(n=>n!==x.nac); store.set('grZwin', JSON.stringify(zw));
  $('#wotPanel').innerHTML=grHtml(); const m=$('.gr-form .gr-msg'); if(m) m.textContent=`Dodano: ${x.n} → ${NAT_NAMES[x.nac]||x.nac}`;
  const n=$('.gr-form [name=n]'); n&&n.focus({preventScroll:true}); });
document.addEventListener('click', e=>{
  if(!e.target.closest || !e.target.closest('.gr')) return;
  const t=e.target.closest('[data-grtyp]'); if(t){ t.parentNode.querySelectorAll('button').forEach(b=>b.setAttribute('aria-pressed', b===t?'true':'false')); return; }
  const fl=e.target.closest('[data-grf]'); if(fl){ store.set('grFiltr', fl.dataset.grf); return grRefresh(); }
  const p=e.target.closest('[data-grp]'); if(p){ const x=GR.find(y=>y.id===p.dataset.grp); if(x){ grSet(x.id,{p:!x.p}); grRefresh(); } return; }
  const d=e.target.closest('[data-grdel]'); if(d){ const id=d.dataset.grdel;
    if(!d.dataset.pewne){ d.dataset.pewne='1'; d.textContent='Usunąć?'; d.classList.add('armed'); setTimeout(()=>{ if(d.isConnected){ delete d.dataset.pewne; d.textContent='×'; d.classList.remove('armed'); } }, 3000); return; }
    GR=GR.filter(x=>x.id!==id); saveGr(); grDel(id); return grRefresh(); }
});
document.addEventListener('change', e=>{ const t=e.target; if(!t.matches||!t.matches('.gr-cs')) return;
  const v=t.value.trim()?bkNum(t.value):0; if(isNaN(v)) return; grSet(t.dataset.id,{cs:v}); t.blur(); grRefresh(); });
document.addEventListener('keydown', e=>{ if(e.key==='Enter' && e.target.matches && e.target.matches('.gr-cs')) e.target.blur(); });
document.addEventListener('toggle', e=>{ const d=e.target; if(!d.matches||!d.matches('details.gr-nat')) return;
  const s=new Set(grZwin()); d.open?s.delete(d.dataset.nac):s.add(d.dataset.nac); store.set('grZwin', JSON.stringify([...s])); }, true);
