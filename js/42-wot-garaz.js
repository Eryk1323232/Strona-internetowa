/* ════════════════════════════════════════════════════════════════
   WORLD OF TANKS → zakładka „Garaż” (automatycznie z Wargaming API)
   ════════════════════════════════════════════════════════════════
   Dane NIE są wpisywane na stronie. Pobiera je osobny projekt Apps Script „WoT Garaż”
   (Garaz.gs + WgLogin.gs) i zapisuje w Arkuszu, w zakładkach:
     • „Garaż”        – jeden wiersz = jeden czołg (id = tank_id),
     • „Garaż_status” – jeden wiersz „stan”: aktualizacja, token, ostatni błąd.
   Strona tylko je CZYTA, tym samym mechanizmem co resztę danych (js/12-synchronizacja.js,
   co ~30 s). Ostatnie dane są też w przeglądarce (store 'wotGarazAuto'), więc przy braku
   sieci albo błędzie projektu „WoT Garaż” widać ostatni stan.

   Przyciski „Odśwież” i „Zaloguj przez Wargaming” wołają web app projektu „WoT Garaż”
   (inny adres niż Arkusz strony) przez fetch / zwykły link:
     <adres>/exec?akcja=odswiez   → JSON {ok, powod, dane}  (blokada 5 min po stronie skryptu)
     <adres>/exec?akcja=zaloguj   → logowanie Wargaming w nowej karcie
   Adres wkleja się raz (pole na dole zakładki); zapisuje się w przeglądarce ('gaUrl')
   i w chmurze (kolekcja cfg, dokument 'wotGarazUrl'), więc działa na każdym urządzeniu.

   RĘCZNE CENY SPRZEDAŻY wpisuje się na stronie (pole w kolumnie „Sprzedaż”). Zapis idzie
   zwykłą drogą strony (cloud → Kod.gs) do kolekcji 'wotGarazCeny' {id: tank_id, cena}
   — dokument bez ceny = cena usunięta. Strona od razu przelicza wartość (gaZCena), a projekt
   „WoT Garaż” przy odświeżeniu przepisuje te ceny do kolumny „Sprzedaż ręcznie (kr)”
   (cena ze strony ma pierwszeństwo przed wpisaną ręcznie w Arkuszu).
   Czołgi bez bitew dopisuje się w Arkuszu, w zakładce „Garaż_dodatki”.

   Wejście: grHtml() – wołane przez wotPanel('gar') w js/04-world-of-tanks.js.
   Stara ręczna lista (kolekcja 'wotGaraz') zostaje w Arkuszu, ale nie jest już wyświetlana.
   ════════════════════════════════════════════════════════════════ */
const GA_RZ = ['—','I','II','III','IV','V','VI','VII','VIII','IX','X','XI'];
const GA_COOLDOWN_MIN = 5;
const GA_TYP_SKROT = { lightTank:'LT', mediumTank:'MT', heavyTank:'HT', 'AT-SPG':'TD', SPG:'SPG' };

const gaLiczba = v => { if(v===''||v===null||v===undefined) return null; const n=Number(String(v).replace(/[\s ]/g,'').replace(',','.')); return isFinite(n)?n:null; };
/* wiersz z Arkusza (nagłówki zakładki „Garaż”) → krótki obiekt */
const gaZArkusza = (id,v={}) => ({ id:String(id), n:String(v['Nazwa']||''), nac:String(v['Nacja']||''), typ:String(v['Typ']||''),
  tier:+v['Tier']||0, wg:String(v['W garażu']||''), ck:+v['Cena zakupu (kr)']||0, cz:+v['Cena zakupu (złoto)']||0,
  sz:gaLiczba(v['Szac. sprzedaż (kr)']), rr:gaLiczba(v['Sprzedaż ręcznie (kr)']), w:+v['Wartość do sumy (kr)']||0,
  st:String(v['Status wyceny']||''), b:+v['Bitwy']||0, wr:gaLiczba(v['Wygrane %']), m:+v['Mistrzostwo']||0,
  tk:String(v['Typ (kod)']||''), ik:String(v['Ikona']||'').replace(/^http:\/\//,'https://') });
/* ceny wpisane na stronie: {tank_id: liczba | null (usunięta)} — nakładane na dane z Arkusza */
let GA_CENY = {}; try{ GA_CENY=JSON.parse(store.get('wotGarazCeny','{}'))||{}; }catch(e){ GA_CENY={}; }
const saveGaCeny = () => store.set('wotGarazCeny', JSON.stringify(GA_CENY));
function gaCenyZChmury(docs){ const m={}; docs.forEach(d=>{ const v=d.data()||{}; m[d.id]=gaLiczba(v.cena); }); GA_CENY=m; saveGaCeny(); gaRefresh(); }
function gaZCena(x){
  if(!(x.id in GA_CENY)) return x;
  const rr=GA_CENY[x.id];
  if(rr!==null) return {...x, rr, w:rr, st:'Ręcznie'};
  const st = x.st==='Ręcznie' ? (x.sz!==null ? 'Szacunek 50%' : 'Brak ceny – weryfikuj w grze') : x.st;
  return {...x, rr:null, w:x.sz!==null?x.sz:0, st};
}
const gaLista = () => GA.map(gaZCena);
function gaZapiszCene(id, cena){
  GA_CENY[id]=cena; saveGaCeny();
  cloud(db=>db.collection('wotGarazCeny').doc(id).set(cena===null?{}:{cena}));
}
const gaWer = x => /weryfikuj|popraw/i.test(x.st);

let GA=[], GA_ST=null;
try{ const c=JSON.parse(store.get('wotGarazAuto','null')); if(c&&Array.isArray(c.t)){ GA=c.t; GA_ST=c.s||null; } }catch(e){}
const saveGa = () => { try{ store.set('wotGarazAuto', JSON.stringify({t:GA, s:GA_ST})); }catch(e){} };
let gaMsg = '', gaTrwa = false;

/* filtr i sortowanie (zapamiętane na urządzeniu) */
let gaF = (()=>{ try{ return {q:'', tier:'', nac:'', typ:'', wer:false, sort:'tier', dir:-1, ...(JSON.parse(store.get('gaFiltr','{}'))||{})}; }catch(e){ return {q:'',tier:'',nac:'',typ:'',wer:false,sort:'tier',dir:-1}; } })();
const saveGaF = () => store.set('gaFiltr', JSON.stringify({...gaF, q:''}));

/* adres web appa „WoT Garaż” */
const GA_URL_RE = /^https:\/\/script\.google\.com\/macros\/s\/[\w-]+\/exec$/;
const gaUrl = () => { const u=store.get('gaUrl',''); return GA_URL_RE.test(u)?u:''; };
function gaUrlFromCloud(u){ if(typeof u==='string' && GA_URL_RE.test(u) && u!==store.get('gaUrl','')){ store.set('gaUrl',u); gaRefresh(true); } }
function gaUstawUrl(u){
  u=String(u||'').trim().replace(/\?.*$/,'');
  if(u && !GA_URL_RE.test(u)) return false;
  store.set('gaUrl', u);
  cloud(db=>db.collection('cfg').doc('wotGarazUrl').set({u}));
  return true;
}

/* dane ze synchronizacji (js/12-synchronizacja.js) */
function gaZChmury(docs){ GA=docs.map(d=>gaZArkusza(d.id,d.data())).filter(x=>x.id); saveGa(); gaRefresh(); }
function gaStZChmury(docs){ const d=docs.find(x=>x.id==='stan'); GA_ST=d?{...d.data()}:null; saveGa(); gaRefresh(); }

const gaCzas = iso => { if(!iso) return ''; const d=new Date(iso); if(isNaN(d)) return String(iso);
  const p=n=>String(n).padStart(2,'0'); return `${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`; };
const gaOdm = (n,a,b,c) => n===1?a:(n%10>=2&&n%10<=4&&(n%100<10||n%100>=20))?b:c;
const gaMinOdOst = () => { const t=+store.get('gaOstOdsw','0'); return t?(Date.now()-t)/60000:Infinity; };

/* ——— widok ——— */
function gaFiltruj(){
  const q=gaF.q.trim().toLowerCase();
  const L=gaLista().filter(x=>(!gaF.tier||x.tier===+gaF.tier) && (!gaF.nac||x.nac===gaF.nac) && (!gaF.typ||x.typ===gaF.typ)
    && (!gaF.wer||gaWer(x)) && (!q||x.n.toLowerCase().includes(q)));
  const k=gaF.sort, d=gaF.dir;
  const val = x => k==='n'?x.n : k==='nac'?x.nac : k==='typ'?x.typ : k==='w'?x.w : k==='b'?x.b : k==='wr'?(x.wr??-1) : x.tier;
  return L.sort((a,b)=>{ const A=val(a), B=val(b);
    const r = typeof A==='string' ? A.localeCompare(B,'pl') : A-B;
    return r*d || b.tier-a.tier || a.n.localeCompare(b.n,'pl'); });
}
function gaWiersz(x){
  const wer=gaWer(x), recz=x.rr!==null && x.st==='Ręcznie';
  const opis = recz ? '<small class="ga-zr">ręcznie</small>'
             : x.sz!==null ? '<small class="ga-zr">szac. 50%</small>'
             : `<small class="ga-zr ga-wer" title="${esc(x.st)}">weryfikuj</small>`;
  const wart = `<label class="ga-cena${recz?' recz':''}"><span class="sr">Cena sprzedaży ${esc(x.n)}</span>
      <input class="num-in grp ga-cs" data-gacena="${esc(x.id)}" inputmode="numeric" autocomplete="off"
        value="${recz?grp(String(Math.round(x.rr))):''}" placeholder="${x.sz!==null?grp(String(Math.round(x.sz))):'wpisz cenę'}"
        title="Wpisz cenę sprzedaży z gry (puste = szacunek 50%)"></label>${opis}`;
  return `<tr class="${wer?'ga-r-wer':''}${x.wg==='TAK (ręcznie)'?' ga-r-dop':''}">
    <td class="ga-ik">${x.ik?`<img src="${esc(x.ik)}" alt="" loading="lazy" width="62" height="16">`:''}</td>
    <td class="ga-t"><span class="ga-tier">${GA_RZ[x.tier]||'—'}</span></td>
    <td class="ga-nm"><b>${esc(x.n)}</b>${x.cz>0||/Premium/.test(x.st)?'<span class="ga-prem">premium</span>':''}${x.wg==='TAK (ręcznie)'?'<span class="ga-dop" title="Dopisany w zakładce Garaż_dodatki (bez bitew)">dopisany</span>':''}</td>
    <td class="ga-nac">${esc(x.nac)}</td>
    <td class="ga-typ" title="${esc(x.typ)}">${esc(GA_TYP_SKROT[x.tk]||x.typ)}</td>
    <td class="n ga-w">${wart}</td>
    <td class="n ga-b">${x.b?fmt(x.b,0):'—'}</td>
    <td class="n ga-wr">${x.wr!==null?String(x.wr).replace('.',',')+'%':'—'}</td></tr>`;
}
function gaTabelaHtml(){
  const L=gaFiltruj(), suma=L.reduce((a,x)=>a+x.w,0);
  const th=(k,n,cl='')=>`<th class="${cl} ga-sort${gaF.sort===k?' on':''}" data-gasort="${k}" aria-sort="${gaF.sort===k?(gaF.dir<0?'descending':'ascending'):'none'}">${n}${gaF.sort===k?(gaF.dir<0?' ↓':' ↑'):''}</th>`;
  return `<p class="ga-licz">${L.length===GA.length?`${L.length} ${gaOdm(L.length,'czołg','czołgi','czołgów')}`:`${L.length} z ${GA.length}`} · wartość: <b>${fmt(suma,0)}</b></p>
    <div class="tbl-wrap ga-tw"><table class="ga-tab"><thead><tr><th class="ga-ik"><span class="sr">Ikona</span></th>${th('tier','Tier','ga-t')}${th('n','Czołg')}${th('nac','Nacja','ga-nac')}${th('typ','Typ','ga-typ')}${th('w','Sprzedaż','n')}${th('b','Bitwy','n ga-b')}${th('wr','WR','n ga-wr')}</tr></thead>
    <tbody>${L.map(gaWiersz).join('')||`<tr><td colspan="8" class="wz-pusto">Brak czołgów w tym filtrze.</td></tr>`}</tbody></table></div>`;
}
function gaStatusHtml(){
  const s=GA_ST||{}, tok=String(s['Token']||''), url=gaUrl(), blad=String(s['Ostatni błąd']||'');
  const wyg=s['Token wygasa']?String(s['Token wygasa']).slice(5,10).split('-').reverse().join('.'):'';
  const tokHtml = tok==='OK' ? `<span class="ga-ok">Wargaming: połączono</span>${wyg?` <small>(token do ${esc(wyg)}, przedłuża się sam)</small>`:''}`
    : tok==='zaloguj ponownie' ? `<span class="ga-zle">Wargaming: zaloguj się ponownie</span>`
    : tok==='brak tokenu' ? `<span class="ga-zle">Wargaming: niepołączono</span> <small>(lista zawiera też sprzedane czołgi)</small>`
    : `<span class="ga-sz">Wargaming: brak danych o tokenie</span>`;
  const blok = gaTrwa || gaMinOdOst()<GA_COOLDOWN_MIN;
  const btn = url ? `<div class="ga-akcje">
      <button type="button" class="wz-add ga-odsw" data-gaodsw ${blok?'disabled':''}>${gaTrwa?'Odświeżanie…':'Odśwież'}</button>
      ${tok!=='OK'?`<a class="ga-login" href="${esc(url)}?akcja=zaloguj" target="_blank" rel="noopener">Zaloguj przez Wargaming</a>`:''}</div>` : '';
  return `<div class="ga-status">
    <div class="ga-st-t"><span>Aktualizacja: <b>${esc(s['Aktualizacja']||'—')}</b></span><span>${tokHtml}</span>
      ${gaMsg?`<span class="ga-msg" role="status">${esc(gaMsg)}</span>`:''}
      ${blad?`<span class="ga-blad">Ostatni błąd: ${esc(blad)} — pokazuję ostatnie zapisane dane.</span>`:''}</div>${btn}</div>`;
}
function grHtml(){
  const url=gaUrl();
  if(!GA.length){
    return `<div class="ga">${gaStatusHtml()}
      <div class="ga-pusto"><h3 class="wz-h">Brak danych garażu</h3>
      <p>Czołgi pobiera projekt <b>„WoT Garaż”</b> (Apps Script) i zapisuje w Arkuszu, w zakładce „Garaż”.
      ${typeof gdb!=='undefined'&&gdb?'Strona pokaże je po najbliższej synchronizacji (do ~30 s).':'Ta przeglądarka nie jest połączona z Arkuszem (⚙ → Synchronizacja) — bez tego dane garażu nie dotrą.'}</p></div>
      ${gaUrlHtml(!url)}</div>`;
  }
  const GL=gaLista();
  const naTier={}; GL.forEach(x=>{ naTier[x.tier]=(naTier[x.tier]||0)+1; });
  const tiery=[1,2,3,4,5,6,7,8,9,10,11].filter(t=>t<=10||naTier[t]);
  const suma=GL.reduce((a,x)=>a+x.w,0), wer=GL.filter(gaWer).length, dop=GL.filter(x=>x.wg==='TAK (ręcznie)').length;
  const recz=GL.filter(x=>x.st==='Ręcznie').length;
  const nacje=[...new Set(GA.map(x=>x.nac).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'pl'));
  const typy=[...new Set(GA.map(x=>x.typ).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'pl'));
  const opt=(v,n,sel)=>`<option value="${esc(v)}"${String(sel)===String(v)?' selected':''}>${esc(n)}</option>`;
  return `<div class="ga">
    ${gaStatusHtml()}
    <div class="grid g4 px-cells wz-cells">
      <div class="cell"><span class="label">W garażu</span><span class="big wz-big">${GA.length}</span><p>${dop?`w tym ${dop} ${gaOdm(dop,'dopisany','dopisane','dopisanych')} ręcznie`:gaOdm(GA.length,'czołg','czołgi','czołgów')}</p></div>
      <div class="cell"><span class="label">Wartość przy sprzedaży</span><span class="big wz-big">${fmt(suma,0)}</span><p>kredyty · szacunek dolny</p></div>
      <div class="cell"><span class="label">Do weryfikacji</span><span class="big wz-big">${wer}</span><p>premium, nagrody — bez wyceny</p></div>
      <div class="cell"><span class="label">Ceny ręczne</span><span class="big wz-big">${recz}</span><p>wpisane przez Ciebie</p></div></div>
    <div class="ga-tiery" role="group" aria-label="Liczba czołgów na tier (kliknij, żeby filtrować)">
      ${tiery.map(t=>`<button type="button" class="ga-tb${String(gaF.tier)===String(t)?' on':''}" data-gatier="${t}" ${naTier[t]?'':'disabled'}><span>${GA_RZ[t]}</span><b>${naTier[t]||0}</b></button>`).join('')}</div>
    <div class="ga-filtr">
      <label class="wz-f ga-fq"><span class="label">Nazwa</span><input type="search" data-gaf="q" value="${esc(gaF.q)}" placeholder="szukaj czołgu" autocomplete="off"></label>
      <label class="wz-f"><span class="label">Tier</span><select data-gaf="tier">${opt('','Wszystkie',gaF.tier)}${tiery.map(t=>opt(t,GA_RZ[t],gaF.tier)).join('')}</select></label>
      <label class="wz-f"><span class="label">Nacja</span><select data-gaf="nac">${opt('','Wszystkie',gaF.nac)}${nacje.map(n=>opt(n,n,gaF.nac)).join('')}</select></label>
      <label class="wz-f"><span class="label">Typ</span><select data-gaf="typ">${opt('','Wszystkie',gaF.typ)}${typy.map(n=>opt(n,n,gaF.typ)).join('')}</select></label>
      <label class="ga-fw"><input type="checkbox" class="sq" data-gaf="wer"${gaF.wer?' checked':''}> tylko do weryfikacji</label>
      ${gaF.q||gaF.tier||gaF.nac||gaF.typ||gaF.wer?'<button type="button" class="ga-wyczysc" data-gawyczysc>Wyczyść filtry</button>':''}
    </div>
    <div id="gaTab">${gaTabelaHtml()}</div>
    <p class="gr-hint">Zwykłe czołgi: 50% ceny zakupu (bez modułów i wyposażenia — w grze wyjdzie trochę więcej). Premium i nagrody: kliknij pole w kolumnie
      „Sprzedaż” i wpisz cenę z gry (w grze: prawy klik na czołg → Sprzedaj → odczytaj kwotę → Anuluj). Wyczyszczenie pola = powrót do szacunku.
      Czołgi bez rozegranej bitwy dopisuje się w Arkuszu, w zakładce „Garaż_dodatki”.</p>
    ${gaUrlHtml(false)}
  </div>`;
}
function gaUrlHtml(otwarte){
  const u=gaUrl();
  return `<details class="ga-ust"${otwarte?' open':''}><summary>Połączenie z projektem „WoT Garaż”</summary>
    <form class="ga-url-f" autocomplete="off"><label class="wz-f ga-fq"><span class="label">Adres aplikacji internetowej (kończy się na /exec)</span>
      <input name="u" value="${esc(u)}" placeholder="https://script.google.com/macros/s/…/exec"></label>
      <button type="submit" class="wz-add">Zapisz</button></form>
    <p class="gr-hint">Wklejasz raz — zapamięta się na wszystkich urządzeniach. Potrzebny tylko do przycisków „Odśwież” i „Zaloguj przez Wargaming”; sama lista czyta się z Arkusza.</p></details>`;
}

/* odświeżenie widoku: przy pisaniu w wyszukiwarce tylko tabela (żeby nie zgubić kursora) */
function gaRefresh(calosc){
  if(typeof wotTab==='undefined'||wotTab!=='gar'||!$('#wotPanel')) return;
  const a=document.activeElement;
  if(!calosc && a && a.matches && a.matches('.ga-cs')) return;   /* nie przerywaj wpisywania ceny */
  if(!calosc && a && a.closest && a.closest('.ga') && a.matches('input,select')){
    if(a.closest('.ga-url-f')) return;
    const t=$('#gaTab'); if(t) t.innerHTML=gaTabelaHtml(); return;
  }
  const y=scrollY; $('#wotPanel').innerHTML=grHtml(); scrollTo(0,y);
}
/* zgodność ze starą nazwą (js/12-synchronizacja.js, starsze wersje) */
const grRefresh = () => gaRefresh();

async function gaOdswiez(){
  const u=gaUrl(); if(!u||gaTrwa) return;
  gaTrwa=true; gaMsg='Pobieram dane z Wargaming… (do ~30 s)'; gaRefresh(true);
  try{
    const r=await fetch(u+'?akcja=odswiez&t='+Date.now());
    const j=await r.json();
    store.set('gaOstOdsw', String(Date.now()));
    const d=j&&j.dane;
    if(d && d.ok && Array.isArray(d.czolgi) && d.czolgi.length){
      GA=d.czolgi.map(c=>gaZArkusza(c.id,c));
      GA_ST={...(GA_ST||{}), 'Aktualizacja':gaCzas(d.aktualizacja)||(GA_ST||{})['Aktualizacja'], 'Token':d.token||(GA_ST||{})['Token'], 'Ostatni błąd':d.blad||''};
      saveGa();
    }
    gaMsg = j.ok ? 'Odświeżono.' : (j.powod||'Nie udało się odświeżyć — pokazuję ostatnie dane.');
  }catch(e){
    gaMsg='Brak połączenia z projektem „WoT Garaż” — pokazuję ostatnie dane.';
  }
  gaTrwa=false; gaRefresh(true);
  setTimeout(()=>{ gaMsg=''; gaRefresh(); }, 8000);
  setTimeout(()=>gaRefresh(), GA_COOLDOWN_MIN*60000+500);   /* odblokuj przycisk */
}

/* ——— zdarzenia ——— */
document.addEventListener('click', e=>{
  if(!e.target.closest || !e.target.closest('.ga')) return;
  if(e.target.closest('[data-gaodsw]')) return gaOdswiez();
  const s=e.target.closest('[data-gasort]'); if(s){ const k=s.dataset.gasort;
    gaF.dir = gaF.sort===k ? -gaF.dir : (['n','nac','typ'].includes(k)?1:-1); gaF.sort=k; saveGaF(); const t=$('#gaTab'); if(t) t.innerHTML=gaTabelaHtml(); return; }
  const t=e.target.closest('[data-gatier]'); if(t){ gaF.tier = String(gaF.tier)===t.dataset.gatier ? '' : t.dataset.gatier; saveGaF(); return gaRefresh(true); }
  if(e.target.closest('[data-gawyczysc]')){ gaF={...gaF, q:'', tier:'', nac:'', typ:'', wer:false}; saveGaF(); return gaRefresh(true); }
});
document.addEventListener('input', e=>{ const t=e.target; if(!t.matches||!t.matches('.ga [data-gaf="q"]')) return;
  gaF.q=t.value; const tb=$('#gaTab'); if(tb) tb.innerHTML=gaTabelaHtml(); });
document.addEventListener('change', e=>{ const t=e.target; if(!t.matches||!t.matches('.ga-cs')) return;
  const raw=t.value.trim(), v=raw?gaLiczba(raw):null;
  if(raw && (v===null||v<0)){ t.classList.add('zle'); return; }
  t.classList.remove('zle'); gaZapiszCene(t.dataset.gacena, v===null?null:Math.round(v)); t.blur(); gaRefresh(true); });
document.addEventListener('keydown', e=>{ if(e.key==='Enter' && e.target.matches && e.target.matches('.ga-cs')) e.target.blur(); });
document.addEventListener('change', e=>{ const t=e.target; if(!t.matches||!t.matches('.ga [data-gaf]')) return; const k=t.dataset.gaf;
  if(k==='q') return;
  gaF[k] = t.type==='checkbox' ? t.checked : t.value; saveGaF(); gaRefresh(true); });
document.addEventListener('submit', e=>{ const f=e.target; if(!f.matches||!f.matches('.ga-url-f')) return; e.preventDefault();
  const ok=gaUstawUrl(f.elements.u.value);
  gaMsg = ok ? (f.elements.u.value.trim()?'Zapisano adres „WoT Garaż”.':'Usunięto adres „WoT Garaż”.') : 'To nie wygląda na adres aplikacji Apps Script (https://script.google.com/macros/s/…/exec).';
  gaRefresh(true); setTimeout(()=>{ gaMsg=''; gaRefresh(); }, 6000); });
