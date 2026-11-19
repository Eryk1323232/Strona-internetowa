/* ════════════════════════════════════════════════════════════════
   NOTATKI — równania jak w Wordzie (przycisk „π” w pasku albo Alt+=)
   Wpisujesz liniowo:  2/3+1/3 \approx 1,  x^2,  a_1,  \sqrt(b^2-4ac),  \alpha,  <=  !=  +-
   i dostajesz ładny wzór (MathML — przeglądarka rysuje go sama, działa też w wydruku/PDF).
   W notatce: <span class="nt-eq" data-eq="źródło" contenteditable="false"><math>…</math></span>;
   ntClean (js/06) za każdym razem odtwarza <math> ze źródła — do notatki nie trafia żaden obcy MathML.
   Klik w wzór w notatce = edycja.
   ════════════════════════════════════════════════════════════════ */
const EQ_SYM = {
  approx:'≈', ne:'≠', neq:'≠', le:'≤', leq:'≤', ge:'≥', geq:'≥', pm:'±', mp:'∓', cdot:'·', times:'×', div:'÷', infty:'∞', inf:'∞',
  to:'→', rightarrow:'→', leftarrow:'←', Rightarrow:'⇒', Leftrightarrow:'⇔', deg:'°', degree:'°', permil:'‰', sim:'∼', equiv:'≡', propto:'∝',
  sum:'∑', prod:'∏', int:'∫', iint:'∬', oint:'∮', partial:'∂', nabla:'∇', in:'∈', notin:'∉', forall:'∀', exists:'∃', cdots:'⋯', ldots:'…',
  alpha:'α', beta:'β', gamma:'γ', delta:'δ', epsilon:'ε', varepsilon:'ε', zeta:'ζ', eta:'η', theta:'θ', iota:'ι', kappa:'κ', lambda:'λ', mu:'μ',
  nu:'ν', xi:'ξ', pi:'π', rho:'ρ', sigma:'σ', tau:'τ', upsilon:'υ', phi:'φ', varphi:'φ', chi:'χ', psi:'ψ', omega:'ω',
  Gamma:'Γ', Delta:'Δ', Theta:'Θ', Lambda:'Λ', Xi:'Ξ', Pi:'Π', Sigma:'Σ', Phi:'Φ', Psi:'Ψ', Omega:'Ω'
};
const EQ_OP = '+-−=<>≈≠≤≥±∓·×÷→←⇒⇔∼≡∝∈∉,;:!|∑∏∫∬∮∀∃';
const EQ_FUN = /^(sin|cos|tan|tg|ctg|cot|log|ln|lg|exp|max|min|lim|arcsin|arccos|arctan|arctg|sinh|cosh|tanh)$/;
const EQ_DUZE = /^[∑∏∫∬∮]$/;

function eqTokeny(src){
  const s=String(src).replace(/<=/g,'≤').replace(/>=/g,'≥').replace(/!=/g,'≠').replace(/\+-/g,'±').replace(/->/g,'→').replace(/\*/g,'·');
  const t=[]; let i=0;
  while(i<s.length){ const c=s[i];
    if(/\s/.test(c)){ i++; continue; }
    if(c==='\\'){ const m=/^\\([A-Za-z]+)/.exec(s.slice(i)); if(m){ t.push({k:'cmd',v:m[1]}); i+=m[0].length; continue; } t.push({k:'op',v:'\\'}); i++; continue; }
    const num=/^\d+(?:[.,]\d+)?/.exec(s.slice(i)); if(num){ t.push({k:'num',v:num[0]}); i+=num[0].length; continue; }
    const id=/^[A-Za-zÀ-žͰ-Ͽ]+/.exec(s.slice(i)); if(id){ t.push({k:'id',v:id[0]}); i+=id[0].length; continue; }
    t.push({k:'ch',v:c}); i++; }
  return t;
}
function eqParsuj(src){
  const t=eqTokeny(src); let p=0;
  const peek=()=>t[p], next=()=>t[p++];
  const bez=n=>n&&n.typ==='grp'&&n.par?{typ:'grp',par:false,el:n.el}:n;   /* licznik/mianownik/wykładnik: nawiasy jak w Wordzie znikają */
  function wyr(stop){ const el=[];
    while(p<t.length){ const k=peek(); if(k.k==='ch'&&stop.includes(k.v)) break;
      if(k.k==='ch'&&EQ_OP.includes(k.v)){ next(); el.push({typ:'mo',v:k.v==='-'?'−':k.v}); continue; }
      if(k.k==='cmd'&&EQ_SYM[k.v]&&EQ_OP.includes(EQ_SYM[k.v])&&!EQ_DUZE.test(EQ_SYM[k.v])){ next(); el.push({typ:'mo',v:EQ_SYM[k.v]}); continue; }
      let a=operand(); if(!a) break;
      while(peek()&&peek().k==='ch'&&peek().v==='/'){ next(); const b=operand()||{typ:'mi',v:''}; a={typ:'frac',l:bez(a),m:bez(b)}; }
      el.push(a); }
    return el; }
  function operand(){ let b=prim(); if(!b) return null;
    let sup=null, sub=null;
    for(let i=0;i<2;i++){ const k=peek(); if(!k||k.k!=='ch'||(k.v!=='^'&&k.v!=='_')) break; next(); const x=bez(prim()||{typ:'mi',v:''}); if(k.v==='^') sup=x; else sub=x; }
    return sup||sub?{typ:'skr',b,sup,sub}:b; }
  function prim(){ const k=peek(); if(!k) return null;
    if(k.k==='ch'&&(k.v==='('||k.v==='[')){ next(); const z=k.v==='('?')':']'; const el=wyr([z]); if(peek()&&peek().v===z) next(); return {typ:'grp',par:true,o:k.v,z,el}; }
    if(k.k==='ch'&&k.v==='{'){ next(); const el=wyr(['}']); if(peek()&&peek().v==='}') next(); return {typ:'grp',par:false,el}; }
    if(k.k==='ch'&&k.v==='|'){ return null; }
    if(k.k==='num'){ next(); return {typ:'mn',v:k.v}; }
    if(k.k==='id'){ next(); return EQ_FUN.test(k.v)?{typ:'fn',v:k.v}:{typ:'ids',v:k.v}; }
    if(k.k==='cmd'){ next();
      if(k.v==='sqrt'){ const x=prim(); return {typ:'sqrt',x:bez(x||{typ:'mi',v:''})}; }
      if(k.v==='frac'){ const a=prim(), b=prim(); return {typ:'frac',l:bez(a||{typ:'mi',v:''}),m:bez(b||{typ:'mi',v:''})}; }
      if(EQ_FUN.test(k.v)) return {typ:'fn',v:k.v};
      const s=EQ_SYM[k.v]; if(s) return EQ_DUZE.test(s)?{typ:'big',v:s}:{typ:'mi',v:s};
      return {typ:'mi',v:'\\'+k.v}; }
    if(k.k==='ch'&&!')]}'.includes(k.v)&&k.v!=='/'&&k.v!=='^'&&k.v!=='_'){ next(); return {typ:'mi',v:k.v}; }
    if(k.k==='ch'&&(k.v===')'||k.v===']'||k.v==='}')){ next(); return {typ:'mo',v:k.v}; }   /* nadmiarowy nawias */
    return null; }
  const el=wyr([]); while(p<t.length){ next(); }   /* reszta (np. samotne „/”) jest ignorowana */
  return el;
}
function eqMml(n){
  const r=a=>a.map(eqMml).join('');
  switch(n.typ){
    case 'mn': return `<mn>${esc(n.v)}</mn>`;
    case 'mo': return `<mo>${esc(n.v)}</mo>`;
    case 'mi': return `<mi>${esc(n.v)}</mi>`;
    case 'big': return `<mo largeop="true">${esc(n.v)}</mo>`;
    case 'fn': return `<mi mathvariant="normal">${esc(n.v)}</mi><mo>&#8289;</mo>`;
    case 'ids': return [...n.v].map(c=>`<mi>${esc(c)}</mi>`).join('');
    case 'grp': return n.par?`<mrow><mo lspace="0" rspace="0">${esc(n.o)}</mo>${r(n.el)}<mo lspace="0" rspace="0">${esc(n.z)}</mo></mrow>`:`<mrow>${r(n.el)}</mrow>`;
    case 'frac': return `<mfrac>${eqMml(n.l)}${eqMml(n.m)}</mfrac>`;
    case 'sqrt': return `<msqrt>${eqMml(n.x)}</msqrt>`;
    case 'skr': { const b=n.b.typ==='big'?`<mo largeop="true">${esc(n.b.v)}</mo>`:eqMml(n.b);
      if(n.sup&&n.sub) return `<msubsup>${b}${eqMml(n.sub)}${eqMml(n.sup)}</msubsup>`;
      return n.sup?`<msup>${b}${eqMml(n.sup)}</msup>`:`<msub>${b}${eqMml(n.sub)}</msub>`; }
  }
  return '';
}
const eqRysuj = src => `<math display="inline"><mrow>${eqParsuj(src).map(eqMml).join('')}</mrow></math>`;
/* używane przez ntClean: czysty element równania odtworzony ze źródła */
function eqSpan(src){ src=String(src||'').slice(0,800); return `<span class="nt-eq" contenteditable="false" data-eq="${esc(src)}">${eqRysuj(src)}</span>`; }

/* ——— panel wstawiania / edycji ——— */
let eqCel=null, eqZakres=null;   /* edytowany wzór w notatce (albo null = nowy) · miejsce kursora w notatce dla nowego */
const EQ_PALETA=[['a/b','/'],['x²','^2'],['xⁿ','^'],['xᵢ','_'],['√','\\sqrt()'],['( )','()'],['≈','\\approx'],['≠','\\ne'],['≤','\\le'],['≥','\\ge'],['±','\\pm'],['·','\\cdot'],['×','\\times'],['→','\\to'],['∞','\\infty'],['°','\\deg'],
  ['∑','\\sum_(i=1)^n'],['∫','\\int_a^b'],['∂','\\partial'],['Δ','\\Delta'],['α','\\alpha'],['β','\\beta'],['γ','\\gamma'],['δ','\\delta'],['ε','\\varepsilon'],['λ','\\lambda'],['μ','\\mu'],['π','\\pi'],['ρ','\\rho'],['σ','\\sigma'],['τ','\\tau'],['φ','\\varphi'],['ω','\\omega'],['Ω','\\Omega']];
function ntEqOtworz(el){
  document.querySelector('.eq-pan')?.remove(); eqCel=el||null;
  const r0=ntRich(), sl=getSelection(); eqZakres = sl.rangeCount && r0 && r0.contains(sl.getRangeAt(0).startContainer) ? sl.getRangeAt(0).cloneRange() : (ntLastRange?ntLastRange.cloneRange():null);
  const p=document.createElement('div'); p.className='eq-pan'; p.setAttribute('role','dialog'); p.setAttribute('aria-label','Równanie');
  p.innerHTML=`<div class="eq-hd"><b>${el?'Edytuj równanie':'Wstaw równanie'}</b><button type="button" class="eq-x" aria-label="Zamknij">×</button></div>
    <input class="eq-in" spellcheck="false" autocomplete="off" placeholder="np. 2/3+1/3 \\approx 1">
    <div class="eq-pod" aria-live="polite"></div>
    <div class="eq-pal">${EQ_PALETA.map(([l,v])=>`<button type="button" data-eqv="${esc(v)}" title="${esc(v)}">${esc(l)}</button>`).join('')}</div>
    <p class="eq-pom">Ułamek <code>a/b</code>, potęga <code>x^2</code>, indeks <code>x_1</code>, nawiasy grupują: <code>(a+b)/(c-d)</code>. Skróty: <code>&lt;=</code> <code>&gt;=</code> <code>!=</code> <code>+-</code>, symbole jak w Wordzie: <code>\\approx</code>, <code>\\alpha</code>…</p>
    <div class="eq-act">${el?'<button type="button" class="td-btn eq-del">Usuń</button>':''}<span></span><button type="button" class="td-btn eq-no">Anuluj</button><button type="button" class="set-main eq-ok">${el?'Zapisz':'Wstaw'}</button></div>`;
  document.body.appendChild(p);
  const inp=p.querySelector('.eq-in'), pod=p.querySelector('.eq-pod');
  const odsw=()=>{ pod.innerHTML=inp.value.trim()?eqRysuj(inp.value):'<span class="eq-pusto">podgląd</span>'; };
  inp.value=el?el.getAttribute('data-eq')||'':''; odsw(); inp.focus(); inp.select();
  inp.addEventListener('input', odsw);
  const zamknij=()=>{ p.remove(); eqCel=null; const r=ntRich(); if(r) r.focus(); };
  const ok=()=>{ const v=inp.value.trim(); const cel=eqCel; p.remove(); eqCel=null;
    if(cel){ if(v){ const t=document.createElement('span'); t.innerHTML=eqSpan(v); cel.replaceWith(t.firstChild); } ntSave(); return; }
    const r=ntRich(); if(!r) return; r.focus(); if(v) eqWstaw(v); };
  p.addEventListener('mousedown', e=>{ if(e.target.closest('button')) e.preventDefault(); });
  p.addEventListener('click', e=>{ const b=e.target.closest('button'); if(!b) return;
    if(b.dataset.eqv!==undefined){ const v=b.dataset.eqv, s=inp.selectionStart, k=inp.selectionEnd, wsr=/\\[a-z]+$/i.test(v)&&inp.value.slice(k,k+1).match(/[a-z]/i)?v+' ':v;
      inp.setRangeText(wsr, s, k, 'end'); const n=wsr.indexOf('()'); if(n>=0 && wsr.endsWith('()')) inp.setSelectionRange(s+n+1, s+n+1); inp.focus(); odsw(); return; }
    if(b.classList.contains('eq-ok')) ok();
    else if(b.classList.contains('eq-del')){ const c=eqCel; p.remove(); eqCel=null; if(c){ c.remove(); ntSave(); } }
    else zamknij(); });
  inp.addEventListener('keydown', e=>{ if(e.key==='Enter'){ e.preventDefault(); ok(); } else if(e.key==='Escape'){ e.preventDefault(); zamknij(); } });
}
/* wstawienie w miejscu kursora (bez execCommand — po zamknięciu panelu bywało ignorowane) */
function eqWstaw(v){
  const r=ntRich(); let rg=eqZakres; eqZakres=null;
  if(!rg || !r.contains(rg.startContainer)){ rg=document.createRange(); let k=r.lastElementChild; if(!k||k.tagName==='TABLE'){ k=document.createElement('div'); r.appendChild(k); } rg.selectNodeContents(k); rg.collapse(false); }
  if(rg.startContainer===r){ /* kursor „między” blokami → do bloku obok */ const b=r.childNodes[rg.startOffset-1]||r.childNodes[rg.startOffset]; if(b&&b.nodeType===1&&!/^(TABLE|UL|OL)$/.test(b.tagName)){ rg.selectNodeContents(b); rg.collapse(rg.startOffset>0); } }
  rg.deleteContents();
  const t=document.createElement('span'); t.innerHTML=eqSpan(v); const q=t.firstChild, za=document.createTextNode('\u00a0');
  rg.insertNode(za); rg.insertNode(q);
  const k=document.createRange(); k.setStartAfter(za); k.collapse(true); const s=getSelection(); s.removeAllRanges(); s.addRange(k);
  ntSave();
}
/* klik w wzór w notatce = edycja; Alt+= = nowe równanie (jak w Wordzie) */
document.addEventListener('click', e=>{ const q=e.target.closest&&e.target.closest('#ntRich .nt-eq'); if(q){ e.preventDefault(); ntEqOtworz(q); } });
document.addEventListener('keydown', e=>{ if(e.altKey && (e.key==='='||e.code==='Equal') && document.activeElement===ntRich()){ e.preventDefault(); ntExec('eq'); } });
