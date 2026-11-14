/* ════════════════════════════════════════════════════════════════════════
   CV (O MNIE) — podgląd, edycja całego CV i eksport do PDF
   ════════════════════════════════════════════════════════════════════════
   CV – jeden dokument (chmura: kolekcja „cv”, dokument „dane”; kopia w przeglądarce):
     imie, adres, tel, email   dane w nagłówku
     foto        zdjęcie (data:image/jpeg, zmniejszone do ~300 px); '' = bez zdjęcia
     sekcje[]    {id, t: tytuł, ukryj: bool, e: [{id, n: nagłówek (firma/szkoła), o: okres, d: opis}]}
                 w opisie każda linia zaczynająca się od „• ” lub „- ” to punkt listy
     rodo, rodoTxt   klauzula RODO na dole (włącz/wyłącz)
   Dane kontaktowe NIE są w kodzie (repozytorium jest publiczne) — wpisuje się je w trybie edycji,
   zapisują się tylko w prywatnym Arkuszu Google i w przeglądarce.
   PDF: „Pobierz PDF” otwiera wydruk A4 w stylu CV z Worda → „Zapisz jako PDF” (cvPrintHtml).
   ════════════════════════════════════════════════════════════════════════ */

const CV_RODO = 'Wyrażam zgodę na przetwarzanie moich danych osobowych zawartych w niniejszym dokumencie do realizacji procesu rekrutacji zgodnie z ustawą z dnia 10 maja 2018 roku o ochronie danych osobowych (Dz. Ustaw z 2018, poz. 1000) oraz zgodnie z Rozporządzeniem Parlamentu Europejskiego i Rady (UE) 2016/679 z dnia 27 kwietnia 2016 r. w sprawie ochrony osób fizycznych w związku z przetwarzaniem danych osobowych i w sprawie swobodnego przepływu takich danych oraz uchylenia dyrektywy 95/46/WE (RODO).';
const CV_START = {
  imie:'Eryk Bazeyan', adres:'', tel:'', email:'', foto:'',
  sekcje:[
    {id:'cs1', t:'Umiejętności', e:[{id:'ce1', n:'', o:'', d:'Znajomość oprogramowania komputerowego:\n• Microsoft Windows z pakietem MS Office (głównie Excel, Word, PowerPoint),\n• MathCAD,\n• AutoCAD.'}]},
    {id:'cs2', t:'Doświadczenie', e:[{id:'ce2', n:'Hanbud, Bielsk Podlaski', o:'08.2025 – 09.2025', d:'Praktyki studenckie. Zakres praktyk: produkcja elementów dachowych.'}]},
    {id:'cs3', t:'Wykształcenie', e:[
      {id:'ce3', n:'II Liceum Ogólnokształcące im. Bronisława Taraszkiewicza w Bielsku Podlaskim', o:'', d:'• Profil: matematyczno-fizyczno-informatyczny'},
      {id:'ce4', n:'Politechnika Białostocka: Wydział Budownictwa i Nauk o Środowisku', o:'', d:'• Kierunek: Budownictwo'}]},
    {id:'cs4', t:'Języki obce', e:[{id:'ce5', n:'', o:'', d:'• angielski: poziom średniozaawansowany (certyfikat B2),\n• rosyjski – poziom średniozaawansowany,\n• białoruski – poziom średniozaawansowany.'}]},
    {id:'cs5', t:'Certyfikaty i uprawnienia', e:[{id:'ce6', n:'', o:'', d:'• Prawo jazdy kategorii B'}]},
    {id:'cs6', t:'Zainteresowania', ukryj:true, e:[{id:'ce7', n:'', o:'', d:'Militaria: pojazdy wojskowe, uzbrojenie.\nInformatyka: sprzęt komputerowy, oprogramowanie.\nSport: piłka nożna, szachy.'}]}
  ],
  rodo:false, rodoTxt:CV_RODO
};
const cvNorm = (v={}) => ({
  imie:String(v.imie??CV_START.imie), adres:String(v.adres||''), tel:String(v.tel||''), email:String(v.email||''), foto:/^data:image\//.test(v.foto||'')?v.foto:'',
  sekcje:(Array.isArray(v.sekcje)?v.sekcje:CV_START.sekcje).map(s=>({id:String(s.id||uid('cs')), t:String(s.t||''), ukryj:!!s.ukryj,
    e:(Array.isArray(s.e)?s.e:[]).map(x=>({id:String(x.id||uid('ce')), n:String(x.n||''), o:String(x.o||''), d:String(x.d||'')}))})),
  rodo:!!v.rodo, rodoTxt:String(v.rodoTxt||CV_RODO)
});
let CV = cvNorm(CV_START);
try{ const c=JSON.parse(store.get('cvDane','null')); if(c) CV=cvNorm(c); }catch(e){}
let cvEd = false, cvTimer = null;
const cvSaveLocal = () => store.set('cvDane', JSON.stringify(CV));
const cvPush = () => cloud(db=>db.collection('cv').doc('dane').set({...CV}));
function cvSave(soft){ cvSaveLocal(); clearTimeout(cvTimer); if(soft) cvTimer=setTimeout(cvPush,800); else cvPush(); }

/* opis → akapity i punkty */
function cvDesc(d){
  let h='', ul=false; const close=()=>{ if(ul){ h+='</ul>'; ul=false; } };
  String(d).split('\n').forEach(l=>{ const m=l.match(/^\s*[•\-–*]\s+(.*)$/);
    if(m){ if(!ul){ h+='<ul>'; ul=true; } h+=`<li>${esc(m[1])}</li>`; }
    else { close(); if(l.trim()) h+=`<p>${esc(l)}</p>`; } });
  close(); return h;
}
const cvKontakt = () => [CV.adres, CV.tel, CV.email].filter(x=>x.trim());

/* ——— widok ——— */
function cvViewHtml(){
  const K=cvKontakt();
  return `<article class="cvd">
    <header class="cvd-head">${CV.foto?`<img class="cvd-foto" src="${CV.foto}" alt="Zdjęcie">`:''}
      <h2 class="cvd-name">${esc(CV.imie)}</h2>
      ${K.length?`<div class="cvd-kontakt">${CV.adres?`<span>${esc(CV.adres)}</span>`:''}${CV.tel?`<a href="tel:${esc(CV.tel.replace(/\s/g,''))}">${esc(CV.tel)}</a>`:''}${CV.email?`<a href="mailto:${esc(CV.email)}">${esc(CV.email)}</a>`:''}</div>`
        :`<button type="button" class="cvd-missing" data-cv="edit">+ Dodaj adres, telefon i e-mail</button>`}</header>
    ${CV.sekcje.filter(s=>!s.ukryj).map(s=>`<section class="cvd-row"><h3>${esc(s.t)}</h3><div class="cvd-body">${s.e.map(x=>`<div class="cvd-e">
        ${x.n||x.o?`<div class="cvd-eh">${x.n?`<b>${esc(x.n)}</b>`:''}${x.o?`<time>${esc(x.o)}</time>`:''}</div>`:''}${cvDesc(x.d)}</div>`).join('')}</div></section>`).join('')}
    ${CV.rodo?`<p class="cvd-rodo">${esc(CV.rodoTxt)}</p>`:''}
  </article>`;
}
function cvEditHtml(){
  const k=(f,s='',e='')=>`data-cvf="${f}" data-s="${esc(s)}" data-e="${esc(e)}"`;
  return `<article class="cvd cvd-ed">
    <header class="cvd-head">
      <div class="cvx-foto">${CV.foto?`<img class="cvd-foto" src="${CV.foto}" alt="Zdjęcie"><button type="button" data-cv="fotodel">Usuń zdjęcie</button>`
        :`<label class="cvx-up">+ Zdjęcie<input type="file" accept="image/*" id="cvFoto" hidden></label>`}</div>
      <div class="cvx-fields">
        <input class="cvx-name" ${k('imie')} value="${esc(CV.imie)}" placeholder="Imię i nazwisko" aria-label="Imię i nazwisko">
        <div class="cvx-k">
          <input ${k('adres')} value="${esc(CV.adres)}" placeholder="Adres, np. ulica 1, 00-000 Miasto" aria-label="Adres" autocomplete="street-address">
          <input ${k('tel')} value="${esc(CV.tel)}" placeholder="Telefon" aria-label="Telefon" inputmode="tel" autocomplete="tel">
          <input ${k('email')} value="${esc(CV.email)}" placeholder="E-mail" aria-label="E-mail" inputmode="email" autocomplete="email"></div></div></header>
    ${CV.sekcje.map((s,i)=>`<section class="cvd-row cvx-row${s.ukryj?' off':''}">
      <div class="cvx-st"><input ${k('t',s.id)} value="${esc(s.t)}" placeholder="Nazwa sekcji" aria-label="Nazwa sekcji">
        <div class="cvx-tools">
          <button type="button" data-cv="up" data-s="${esc(s.id)}" ${i?'':'disabled'} title="Wyżej" aria-label="Przesuń sekcję wyżej">↑</button>
          <button type="button" data-cv="down" data-s="${esc(s.id)}" ${i<CV.sekcje.length-1?'':'disabled'} title="Niżej" aria-label="Przesuń sekcję niżej">↓</button>
          <button type="button" data-cv="hide" data-s="${esc(s.id)}" aria-pressed="${s.ukryj}" title="${s.ukryj?'Pokaż w CV':'Ukryj w CV'}">${s.ukryj?'Ukryta':'Widoczna'}</button>
          <button type="button" class="cvx-del" data-cv="sdel" data-s="${esc(s.id)}" title="Usuń sekcję" aria-label="Usuń sekcję">×</button></div></div>
      <div class="cvd-body">${s.e.map((x,j)=>`<div class="cvx-e">
          <div class="cvx-eh"><input ${k('n',s.id,x.id)} value="${esc(x.n)}" placeholder="Nagłówek, np. firma albo szkoła (opcjonalnie)" aria-label="Nagłówek">
            <input class="cvx-o" ${k('o',s.id,x.id)} value="${esc(x.o)}" placeholder="Okres, np. 10.2024 – obecnie" aria-label="Okres"></div>
          <textarea ${k('d',s.id,x.id)} rows="${Math.max(2,x.d.split('\n').length+1)}" placeholder="Opis — linia zaczynająca się od „• ” albo „- ” to punkt" aria-label="Opis">${esc(x.d)}</textarea>
          <div class="cvx-etools">${j?`<button type="button" data-cv="eup" data-s="${esc(s.id)}" data-e="${esc(x.id)}">↑ wyżej</button>`:''}<button type="button" class="cvx-del" data-cv="edel" data-s="${esc(s.id)}" data-e="${esc(x.id)}">Usuń wpis</button></div></div>`).join('')}
        <button type="button" class="cvx-add" data-cv="eadd" data-s="${esc(s.id)}">+ Dodaj wpis</button></div></section>`).join('')}
    <div class="cvx-foot"><button type="button" class="cvx-add" data-cv="sadd">+ Dodaj sekcję</button>
      <label class="cvx-chk"><input type="checkbox" ${k('rodo')}${CV.rodo?' checked':''}><span>Klauzula RODO na dole CV</span></label>
      ${CV.rodo?`<textarea ${k('rodoTxt')} rows="4" aria-label="Treść klauzuli RODO">${esc(CV.rodoTxt)}</textarea>`:''}
      <button type="button" class="cvx-reset" data-cv="reset">Przywróć CV z pliku</button></div>
  </article>`;
}
function pCV(){
  return `<h1>Curriculum <span class="acc">vitae</span></h1>
  <div class="cv-bar"><button type="button" class="cv-btn${cvEd?' on':''}" data-cv="${cvEd?'done':'edit'}">${cvEd?'✓ Gotowe':icn('olowek')+' Edytuj CV'}</button>
    <button type="button" class="cv-btn cv-pdf" data-cv="pdf"><svg viewBox="0 0 16 16" aria-hidden="true"><path d="M4 1.5h5.5L13 5v9.5H4z"/><path d="M9.5 1.5V5H13M8.5 7.5v5M6.5 10.5l2 2 2-2"/></svg>Pobierz PDF</button>
    <span class="cv-stat" id="cvStat"></span></div>
  <div id="cvApp">${cvEd?cvEditHtml():cvViewHtml()}</div>`;
}
function cvRefresh(force){
  const app=$('#cvApp'); if(!app) return;
  const a=document.activeElement; if(!force && a && app.contains(a) && a.matches('input,textarea')) return;
  const y=window.scrollY; app.innerHTML=cvEd?cvEditHtml():cvViewHtml(); window.scrollTo(0,y);
  const b=$('.cv-bar .cv-btn'); if(b){ b.dataset.cv=cvEd?'done':'edit'; b.innerHTML=cvEd?'✓ Gotowe':icn('olowek')+' Edytuj CV'; b.classList.toggle('on',cvEd); }
}

/* ——— PDF: A4 w stylu CV z Worda ——— */
function cvPrintHtml(){
  const K=cvKontakt();
  return `<!doctype html><html lang="pl"><head><meta charset="utf-8"><title>CV – ${esc(CV.imie)}</title><style>
  @page{size:A4;margin:14mm 15mm 16mm}
  *{box-sizing:border-box} html,body{margin:0;background:#fff}
  body{font:10.5pt/1.5 Cambria,"Caladea",Georgia,"Times New Roman",serif;color:#1d1d1d;-webkit-print-color-adjust:exact;print-color-adjust:exact}
  .sheet{max-width:180mm;margin:0 auto}
  .top{display:flex;align-items:flex-end;gap:14px;margin-bottom:6mm}
  .foto{width:30mm;height:38mm;object-fit:cover;border:1px solid #c9d2db}
  .kontakt{margin-left:auto;text-align:right;font:9.5pt/1.55 Calibri,Carlito,Arial,sans-serif;color:#555}
  .kontakt a{color:#555;text-decoration:none}
  .bar{background:#56708A;color:#fff;font:600 17pt/1 Calibri,Carlito,Arial,sans-serif;letter-spacing:.02em;text-transform:uppercase;padding:9px 12px 8px;margin-bottom:4mm}
  .row{display:grid;grid-template-columns:38mm 1fr;gap:7mm;padding:3.2mm 0;border-bottom:1px solid #8ea2b6;break-inside:avoid}
  h3{margin:0;text-align:right;font:700 10pt/1.45 Calibri,Carlito,Arial,sans-serif;text-transform:uppercase;letter-spacing:.02em;color:#1d1d1d}
  .e+.e{margin-top:3.5mm}
  .eh b{display:block;font:700 9.5pt/1.45 Calibri,Carlito,Arial,sans-serif;text-transform:uppercase;letter-spacing:.01em}
  .eh time{display:block}
  p{margin:0} ul{margin:0;padding:0;list-style:none} li{padding-left:0} li::before{content:"• "}
  .rodo{margin-top:6mm;font-size:7.5pt;line-height:1.4;font-style:italic;color:#444}
  @media screen{ body{background:#e8e8e8;padding:20px} .sheet{background:#fff;padding:14mm 15mm;box-shadow:0 2px 12px rgba(0,0,0,.2)} }
  </style></head><body><div class="sheet">
  <div class="top">${CV.foto?`<img class="foto" src="${CV.foto}" alt="">`:''}<div class="kontakt">${K.map(x=>/@/.test(x)?`<a href="mailto:${esc(x)}">${esc(x)}</a>`:esc(x)).join('<br>')}</div></div>
  <div class="bar">${esc(CV.imie)}</div>
  ${CV.sekcje.filter(s=>!s.ukryj).map(s=>`<div class="row"><h3>${esc(s.t)}</h3><div>${s.e.map(x=>`<div class="e">${x.n||x.o?`<div class="eh">${x.n?`<b>${esc(x.n)}</b>`:''}${x.o?`<time>${esc(x.o)}</time>`:''}</div>`:''}${cvDesc(x.d)}</div>`).join('')}</div></div>`).join('')}
  ${CV.rodo?`<p class="rodo">${esc(CV.rodoTxt)}</p>`:''}
  </div></body></html>`;
}
function cvPdf(){
  const html=pdfPrzygotuj(cvPrintHtml());
  if(matchMedia('(pointer:coarse)').matches){   /* telefon: nowa karta → Udostępnij/Drukuj → Zapisz jako PDF */
    const w=window.open('','_blank'); if(w){ w.document.open(); w.document.write(html.replace('</body>','<script>setTimeout(()=>print(),400)<\/script></body>')); w.document.close(); return; } }
  pdfDrukuj(html, `CV – ${CV.imie}`);
}
/* zdjęcie: przycięte do 3:4 i zmniejszone, żeby zmieściło się w komórce Arkusza */
function cvFoto(file){
  const r=new FileReader(); r.onload=()=>{ const img=new Image(); img.onload=()=>{
    const W=300, H=400, c=document.createElement('canvas'); c.width=W; c.height=H; const x=c.getContext('2d');
    const s=Math.max(W/img.width, H/img.height), w=img.width*s, h=img.height*s; x.drawImage(img,(W-w)/2,(H-h)/2,w,h);
    let q=.85, url=c.toDataURL('image/jpeg',q); while(url.length>42000 && q>.4){ q-=.1; url=c.toDataURL('image/jpeg',q); }
    CV.foto=url; cvSave(); cvRefresh(true); }; img.src=r.result; }; r.readAsDataURL(file);
}

/* ——— zdarzenia ——— */
const cvS = id => CV.sekcje.find(s=>s.id===id);
document.addEventListener('click', e=>{
  const b=e.target.closest('[data-cv]'); if(!b || !$('#cvApp')) return;
  const a=b.dataset.cv, s=cvS(b.dataset.s), i=CV.sekcje.indexOf(s);
  switch(a){
    case 'edit': cvEd=true; return cvRefresh(true);
    case 'done': clearTimeout(cvTimer); cvPush(); cvEd=false; return cvRefresh(true);
    case 'pdf': return cvPdf();
    case 'up': case 'down': { const j=i+(a==='up'?-1:1); if(j<0||j>=CV.sekcje.length) return; const L=[...CV.sekcje]; [L[i],L[j]]=[L[j],L[i]]; CV.sekcje=L; break; }
    case 'hide': s.ukryj=!s.ukryj; break;
    case 'sdel': if(!b.dataset.arm){ b.dataset.arm='1'; b.textContent='Usunąć?'; b.classList.add('armed'); setTimeout(()=>{ if(b.isConnected){ delete b.dataset.arm; b.textContent='×'; b.classList.remove('armed'); } },3000); return; }
      CV.sekcje=CV.sekcje.filter(x=>x!==s); break;
    case 'sadd': CV.sekcje=[...CV.sekcje,{id:uid('cs'), t:'Nowa sekcja', ukryj:false, e:[{id:uid('ce'), n:'', o:'', d:''}]}]; break;
    case 'eadd': s.e=[...s.e,{id:uid('ce'), n:'', o:'', d:''}]; break;
    case 'eup': { const k=s.e.findIndex(x=>x.id===b.dataset.e); if(k>0){ const L=[...s.e]; [L[k-1],L[k]]=[L[k],L[k-1]]; s.e=L; } break; }
    case 'edel': if(!b.dataset.arm){ b.dataset.arm='1'; b.textContent='Na pewno?'; b.classList.add('armed'); setTimeout(()=>{ if(b.isConnected){ delete b.dataset.arm; b.textContent='Usuń wpis'; b.classList.remove('armed'); } },3000); return; }
      s.e=s.e.filter(x=>x.id!==b.dataset.e); break;
    case 'fotodel': CV.foto=''; break;
    case 'reset': if(!b.dataset.arm){ b.dataset.arm='1'; b.textContent='Na pewno? Dane kontaktowe zostaną'; setTimeout(()=>{ if(b.isConnected){ delete b.dataset.arm; b.textContent='Przywróć CV z pliku'; } },3500); return; }
      CV=cvNorm({...CV_START, imie:CV.imie, adres:CV.adres, tel:CV.tel, email:CV.email, foto:CV.foto}); break;
    default: return;
  }
  cvSave(); cvRefresh(true);
});
document.addEventListener('input', e=>{
  const el=e.target, f=el.dataset&&el.dataset.cvf; if(!f) return;
  const s=cvS(el.dataset.s), x=s&&s.e.find(q=>q.id===el.dataset.e);
  if(f==='rodo'){ CV.rodo=el.checked; cvSave(); return cvRefresh(true); }
  if(['imie','adres','tel','email','rodoTxt'].includes(f)) CV[f]=el.value;
  else if(f==='t' && s) s.t=el.value;
  else if(x) x[f]=el.value;
  if(el.tagName==='TEXTAREA'){ el.rows=Math.max(2, el.value.split('\n').length+1); }
  cvSave(true); const st=$('#cvStat'); if(st){ st.textContent='Zapisano'; clearTimeout(st._t); st._t=setTimeout(()=>st.textContent='',1500); }
});
document.addEventListener('change', e=>{ if(e.target.id==='cvFoto' && e.target.files[0]) cvFoto(e.target.files[0]); });
/* „• ” zamiast „- ” na początku linii opisu, a Enter w punkcie dodaje kolejny punkt */
document.addEventListener('keydown', e=>{
  const t=e.target; if(!t.matches || !t.matches('textarea[data-cvf="d"]') || e.key!=='Enter' || e.shiftKey) return;
  const v=t.value, s0=t.selectionStart, ls=v.lastIndexOf('\n',s0-1)+1, line=v.slice(ls,s0), m=line.match(/^(\s*[•\-–*]\s+)(.*)$/); if(!m) return;
  e.preventDefault();
  if(!m[2].trim()){ t.value=v.slice(0,ls)+v.slice(s0); t.setSelectionRange(ls,ls); }
  else { const pre='\n'+m[1]; t.value=v.slice(0,s0)+pre+v.slice(t.selectionEnd); t.setSelectionRange(s0+pre.length,s0+pre.length); }
  t.dispatchEvent(new Event('input',{bubbles:true}));
});
window.addEventListener('beforeunload', ()=>{ if(cvTimer){ clearTimeout(cvTimer); cvPush(); } });
