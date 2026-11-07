/* ════════════════════════════════════════════════════════════════════════
   DYSKI (STUDIA)
   ════════════════════════════════════════════════════════════════════════
   DK      – lista dysków {url, sem: semestr, n: nazwa}.
   dkKind() – rozpoznaje usługę po adresie (Google Drive, OneDrive, Dropbox, MEGA, Teams).
   Sekcja semestru pojawia się sama, gdy dodasz do niego pierwszy dysk.
   ════════════════════════════════════════════════════════════════════════ */

/* ——— DYSKI: linki do dysków pogrupowane według semestrów (chmura przez db, kopia w przeglądarce) ——— */
const dkNorm = (id,v={}) => ({id, url:String(v.url||''), sem:String(v.sem||'').trim(), n:String(v.n||''), c:+v.c||0});
let DK=[];
try{ const c=JSON.parse(store.get('dkState','null')); if(Array.isArray(c)) DK=c.map(d=>dkNorm(d.id,d)); }catch(e){}
const saveDk = () => store.set('dkState', JSON.stringify(DK));
let dkM=null; /* {id} — id pusty = nowy */
const dkSems = () => [...new Set(DK.map(d=>d.sem).filter(Boolean))].sort((a,b)=>{ const na=parseInt((a.match(/\d+/)||[])[0]), nb=parseInt((b.match(/\d+/)||[])[0]);
  if(!isNaN(na)&&!isNaN(nb)&&na!==nb) return nb-na; return b.localeCompare(a,'pl',{numeric:true}); });
const dkSemLabel = s => /^\d+$/.test(s) ? `Semestr ${s}` : s;
function dkKind(u){ const h=gHost(gUrl(u)).toLowerCase();
  if(/drive\.google|docs\.google/.test(h)) return ['Google Drive','gd'];
  if(/onedrive|sharepoint|1drv/.test(h)) return ['OneDrive','od'];
  if(/dropbox/.test(h)) return ['Dropbox','db'];
  if(/mega\.(nz|io)/.test(h)) return ['MEGA','mg'];
  if(/teams\.microsoft/.test(h)) return ['Teams','tm'];
  return [h||'Link','ot']; }
const DK_IC={
  gd:'<path d="M9 4h6l6 10.5-3 5.5H6l-3-5.5z" fill="none"/><path d="M9 4 3 14.5M15 4l-6 10.5h12M6 20l3-5.5"/>',
  od:'<path d="M7 18h11a4 4 0 0 0 .6-7.95A6 6 0 0 0 7.2 9.1 4.5 4.5 0 0 0 7 18z"/>',
  db:'<path d="m7 4-5 3.2 5 3.2 5-3.2zM17 4l-5 3.2 5 3.2 5-3.2zM2 13.6l5 3.2 5-3.2-5-3.2zM17 10.4l-5 3.2 5 3.2 5-3.2zM7 18l5 3.2 5-3.2"/>',
  mg:'<circle cx="12" cy="12" r="9"/><path d="M8 15.5V8.5l4 4 4-4v7"/>',
  tm:'<rect x="3" y="6" width="12" height="12" rx="2"/><path d="M6.5 9.5h5M9 9.5V15M17 9h2.5a1.5 1.5 0 0 1 1.5 1.5V15a3 3 0 0 1-3 3h-1"/>',
  ot:'<path d="M10 14a4 4 0 0 0 5.66 0l3-3a4 4 0 0 0-5.66-5.66l-1 1M14 10a4 4 0 0 0-5.66 0l-3 3a4 4 0 0 0 5.66 5.66l1-1"/>'};
function dkCard(d){ const u=gUrl(d.url), [kn,kc]=dkKind(d.url);
  return `<article class="dk-card dk-${kc}"><div class="dk-ic" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round" stroke-linecap="round">${DK_IC[kc]}</svg></div>
    <div class="dk-body"><b>${esc(d.n.trim()||kn)}</b><span class="dk-host">${esc(d.n.trim()?kn:(gHost(u)||d.url))}</span></div>
    <div class="dk-acts">${u?`<a class="dk-open" href="${esc(u)}" target="_blank" rel="noopener">Otwórz ↗</a>`:''}
      ${u?`<button type="button" class="td-btn dk-copy" data-dkact="copy" data-url="${esc(u)}">Kopiuj</button>`:''}<button type="button" class="td-btn" data-dkact="edit" data-id="${esc(d.id)}">Edytuj</button>
      <button type="button" class="g-del" data-dkact="del" data-id="${esc(d.id)}" aria-label="Usuń dysk">×</button></div></article>`; }
function dkHtml(){
  const S=dkSems();
  return `<div class="dk-bar"><button type="button" class="dk-plus" data-dkact="new" aria-label="Dodaj dysk"><span aria-hidden="true">+</span>Dodaj dysk</button></div>
    ${S.length?S.map(s=>{ const L=DK.filter(d=>d.sem===s).sort((a,b)=>a.c-b.c);
      return `<section class="block dk-sem"><div class="block-head"><h2>${esc(dkSemLabel(s))}</h2><span class="ct dk-ct">${L.length}</span></div><div class="dk-grid">${L.map(dkCard).join('')}</div></section>`; }).join('')
    :`<div class="nt-blank dk-empty"><p>Nie masz jeszcze żadnych dysków. Kliknij „+ Dodaj dysk”, wklej link i wpisz semestr — sekcja semestru pojawi się sama.</p></div>`}`;
}
function dkModalHtml(){
  const d=DK.find(x=>x.id===dkM.id)||dkNorm('',{sem:dkSems()[0]||''});
  const sug=[...new Set([...dkSems(), ...Array.from({length:7},(_,i)=>String(i+1))])];
  return `<form class="dk-form"><div class="tr-top"><div><span class="label">Studia · dyski</span><h2>${d.id?'Edytuj dysk':'Dodaj dysk'}</h2></div><button type="button" class="tr-x" data-dkact="close" aria-label="Zamknij">✕</button></div>
    <label class="mx-f"><span class="label">Link</span><input name="url" value="${esc(d.url)}" placeholder="https://drive.google.com/…" required autocomplete="off" inputmode="url"></label>
    <label class="mx-f"><span class="label">Semestr</span><input name="sem" value="${esc(d.sem)}" list="dkSemList" placeholder="np. 7" required autocomplete="off" maxlength="40"><datalist id="dkSemList">${sug.map(s=>`<option value="${esc(s)}">`).join('')}</datalist></label>
    <label class="mx-f"><span class="label">Nazwa (opcjonalnie)</span><input name="n" value="${esc(d.n)}" placeholder="np. Mosty — wykłady" autocomplete="off" maxlength="80"></label>
    <div class="tr-foot"><span class="tr-err" id="dkErr"></span><button type="button" class="td-btn" data-dkact="close">Anuluj</button><button type="submit" class="tr-save">Zapisz</button></div></form>`;
}
function dkRender(){
  let sc=$('#dkScrim'), md=$('#dkModal');
  if(!dkM || !$('#dkApp')){ sc&&sc.remove(); md&&md.remove(); dkM=null; document.body.classList.remove('tr-lock'); return; }
  if(!md){ sc=document.createElement('div'); sc.id='dkScrim'; sc.className='tr-scrim'; document.body.appendChild(sc);
    md=document.createElement('div'); md.id='dkModal'; md.className='tr-modal'; md.setAttribute('role','dialog'); md.setAttribute('aria-modal','true'); document.body.appendChild(md); }
  document.body.classList.add('tr-lock'); md.innerHTML=`<div class="tr-panel dk-panel">${dkModalHtml()}</div>`;
  const f=md.querySelector('[name=url]'); f&&setTimeout(()=>f.focus(),30);
}
function dkRefresh(){ const a=$('#dkApp'); if(a) a.innerHTML=dkHtml(); }
function pDiski(){ return `<h1>Dys<span class="acc">ki</span></h1><div id="dkApp">${dkHtml()}</div>`; }
document.addEventListener('click', e=>{
  if(e.target.id==='dkScrim'||e.target.id==='dkModal'){ dkM=null; return dkRender(); }
  const b=e.target.closest('[data-dkact]'); if(!b) return;
  const a=b.dataset.dkact;
  if(a==='new'){ dkM={id:''}; return dkRender(); }
  if(a==='edit'){ dkM={id:b.dataset.id}; return dkRender(); }
  if(a==='close'){ dkM=null; return dkRender(); }
  if(a==='copy'){ const url=b.dataset.url, done=ok=>{ b.textContent=ok?'Skopiowano ✓':'Nie udało się'; b.classList.toggle('copied',ok); clearTimeout(b._t); b._t=setTimeout(()=>{ if(b.isConnected){ b.textContent='Kopiuj'; b.classList.remove('copied'); } },1600); };
    const fallback=()=>{ try{ const t=document.createElement('textarea'); t.value=url; t.setAttribute('readonly',''); t.style.cssText='position:fixed;top:-1000px;opacity:0'; document.body.appendChild(t); t.select(); const r=document.execCommand('copy'); t.remove(); done(r); }catch(e){ done(false); } };
    if(navigator.clipboard&&navigator.clipboard.writeText) navigator.clipboard.writeText(url).then(()=>done(true),fallback); else fallback(); return; }
  if(a==='del'){ if(!b.dataset.darm){ b.dataset.darm='1'; b.textContent='Usuń?'; b.classList.add('armed'); setTimeout(()=>{ if(b.isConnected){ delete b.dataset.darm; b.textContent='×'; b.classList.remove('armed'); } },3000); return; }
    const id=b.dataset.id; DK=DK.filter(d=>d.id!==id); saveDk(); dkRefresh(); cloud(db=>db.collection('dyski').doc(id).delete()); }
});
document.addEventListener('submit', e=>{
  const f=e.target; if(!f.matches('form.dk-form')) return; e.preventDefault();
  const url=f.url.value.trim(), sem=f.sem.value.trim().replace(/^semestr\s*/i,'');
  if(!gUrl(url)){ $('#dkErr').textContent='To nie wygląda na poprawny link.'; f.url.focus(); return; }
  if(!sem){ f.sem.focus(); return; }
  const old=DK.find(x=>x.id===dkM.id), d=dkNorm(old?old.id:uid('k'),{url, sem, n:f.n.value.trim(), c:old?old.c:Date.now()});
  DK=old?DK.map(x=>x.id===d.id?d:x):[...DK,d]; saveDk(); cloud(db=>{ const {id,...v}=d; return db.collection('dyski').doc(id).set(v); });
  dkM=null; dkRender(); dkRefresh();
});
document.addEventListener('keydown', e=>{ if(dkM && e.key==='Escape'){ e.stopPropagation(); dkM=null; dkRender(); } }, true);
