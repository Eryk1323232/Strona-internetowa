/* ════════════════════════════════════════════════════════════════════════
   NOTATKI → KONIEC STRONY A4 (przerywana linia „Strona 2”, „Strona 3”… w edytorze)
   ════════════════════════════════════════════════════════════════════════
   Jak to liczy: notatka jest składana w ukrytej ramce DOKŁADNIE tak jak do PDF
   (ten sam dokument ntPrintHtml, szerokość tekstu = 21 cm − marginesy z ustawień),
   potem „łamana” na strony o wysokości 29,7 cm − marginesy. Miejsce łamania
   (przed akapitem/punktem listy/zdjęciem albo między wierszami długiego akapitu)
   jest przenoszone na ten sam element w edytorze. Przycisk w pasku narzędzi włącza/wyłącza.
   Odświeża się sam po zmianach (sprawdza co 1,2 s, tylko gdy coś się zmieniło).
   ════════════════════════════════════════════════════════════════════════ */
let a4Wl = store.get('ntStrony','1')==='1', a4Klucz = '', a4Ifr = null, a4Licze = false;
const A4_MM = 96/25.4;
const A4_BLOK = /^(P|DIV|H1|H2|H3|UL|OL|LI|BLOCKQUOTE|PRE|TABLE|TBODY|TR|HR|IMG)$/;

function a4Przelacz(){ a4Wl=!a4Wl; store.set('ntStrony', a4Wl?'1':'0'); a4Klucz=''; a4Tick(); }

/* „jednostki”: najmniejsze bloki (akapit, punkt listy, wiersz tabeli, zdjęcie) w kolejności dokumentu */
function a4Jednostki(root){
  const out=[];
  const idz=el=>[...el.children].forEach(c=>{
    if(!A4_BLOK.test(c.tagName)) return;
    if(c.tagName==='IMG'||c.tagName==='HR'||c.tagName==='TR') return out.push(c);
    const bloki=[...c.children].some(x=>A4_BLOK.test(x.tagName));
    if(!bloki) return out.push(c);
    if(c.tagName==='LI'||c.tagName==='DIV'||c.tagName==='P'){ const tekst=[...c.childNodes].some(x=>x.nodeType===3&&x.nodeValue.trim() || x.nodeType===1&&!A4_BLOK.test(x.tagName)&&x.textContent.trim()); if(tekst) out.push(c); }
    idz(c); });
  idz(root); return out;
}

/* łamanie stron w ramce wydruku → lista {i: nr jednostki, f: ułamek jej wysokości} */
async function a4Lam(n){
  const M=PDF_MARG[store.get('pdfMarg','waskie')]||PDF_MARG.waskie, [t,r,b,l]=M, szer=210-l-r, wys=(297-t-b)*A4_MM;
  if(!a4Ifr || !a4Ifr.isConnected){ a4Ifr=document.createElement('iframe'); a4Ifr.setAttribute('aria-hidden','true'); a4Ifr.tabIndex=-1;
    a4Ifr.style.cssText='position:fixed;left:-10000px;top:0;height:400px;border:0;opacity:0;pointer-events:none'; document.body.appendChild(a4Ifr); }
  a4Ifr.style.width=szer+'mm';
  const d=a4Ifr.contentDocument; d.open();
  d.write(ntPrintHtml(n).replace('</style>', `html,body{margin:0!important;padding:0!important;max-width:none!important;width:${szer}mm!important;overflow:hidden} body>*:first-child{margin-top:0}</style>`)); d.close();
  await Promise.all([...d.images].map(im=>im.complete?0:new Promise(ok=>{ im.onload=im.onerror=ok; setTimeout(ok,1500); })));
  const pc=d.querySelector('.nt-pc'); if(!pc) return {lam:[], U:[]};
  const U=a4Jednostki(pc), top0=d.body.getBoundingClientRect().top, lam=[];
  let koniec=wys;
  U.forEach((u,i)=>{ const R=u.getBoundingClientRect(), g=R.top-top0, dol=R.bottom-top0; if(!R.height) return;
    let guard=0;
    while(dol>koniec+0.5 && guard++<50){
      if(g>=koniec-0.5){ lam.push({i,f:0}); koniec=g+wys; continue; }
      const lh=parseFloat(getComputedStyle(u).lineHeight)||R.height, calosc=u.tagName==='IMG'||u.tagName==='TR'||u.tagName==='HR'||u.querySelector('img')||R.height<=lh*1.6;
      if(calosc){ lam.push({i,f:0}); koniec=g+wys; continue; }
      let wiersze=Math.floor((koniec-g)/lh+0.01); const L=Math.round(R.height/lh);
      if(L-wiersze<2) wiersze=L-2;   /* jak przeglądarka: min. 2 wiersze na dole (orphans) i na górze strony (widows) */
      if(wiersze<2){ lam.push({i,f:0}); koniec=g+wys; continue; }
      const y=g+wiersze*lh; lam.push({i,f:(y-g)/R.height}); koniec=y+wys;
    } });
  return {lam, U};
}

async function a4Tick(){
  const r=document.getElementById('ntRich'), papier=r&&r.closest('.nt-paper');
  const btn=document.querySelector('.nt-tb-pages'); if(btn){ btn.classList.toggle('on',a4Wl); btn.setAttribute('aria-pressed',a4Wl); }
  if(!r||!papier){ a4Klucz=''; return; }
  const n=N.find(x=>x.id===ntSel); if(!n) return;
  const klucz=[a4Wl, ntSel, r.innerHTML.length, r.innerHTML.slice(0,200), r.innerHTML.slice(-200), r.clientWidth, store.get('pdfMarg',''), n.t, n.cat].join('|');
  let warstwa=papier.querySelector('.nt-pbs');
  if(klucz===a4Klucz && warstwa) return; if(a4Licze) return;
  a4Klucz=klucz;
  if(!a4Wl){ if(warstwa) warstwa.remove(); return; }
  a4Licze=true;
  try{
    const {lam}=await a4Lam(n), E=a4Jednostki(r), A=a4Jednostki(a4Ifr.contentDocument.querySelector('.nt-pc'));
    if(!warstwa || !warstwa.isConnected){ warstwa=document.createElement('div'); warstwa.className='nt-pbs'; warstwa.setAttribute('aria-hidden','true'); papier.appendChild(warstwa); }
    if(E.length!==A.length){ warstwa.innerHTML=''; return; }
    const P=papier.getBoundingClientRect(), Rr=r.getBoundingClientRect();
    warstwa.innerHTML=lam.map((x,k)=>{ const e=E[x.i]; if(!e) return ''; const R=e.getBoundingClientRect();
      const y=(x.f?R.top+R.height*x.f:R.top-3)-P.top;
      return `<div class="nt-pb" style="top:${Math.round(y)}px;left:${Math.round(Rr.left-P.left)}px;width:${Math.round(Rr.width)}px"><span title="Tu kończy się strona ${k+1} wydruku">str. ${k+2}</span></div>`; }).join('');
  } catch(e){ console.warn('A4:', e); }
  finally{ a4Licze=false; }
}
setInterval(a4Tick, 1200);
addEventListener('resize', ()=>{ a4Klucz=''; });
document.addEventListener('input', e=>{ if(e.target.id==='ntRich'){ clearTimeout(a4Tick.t); a4Tick.t=setTimeout(a4Tick, 500); } });
