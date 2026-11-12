/* ════════════════════════════════════════════════════════════════════════
   NOTATKA → WORD (.docx)   (menu „…” w notatce → „Pobierz jako Word (.docx)”)
   ════════════════════════════════════════════════════════════════════════
   Plik .docx to archiwum ZIP z kilkoma plikami XML (js/34-zip.js). Przenoszone są:
   tytuł, nagłówki (jako style Nagłówek 1–3 — działa spis treści Worda), pogrubienie/kursywa/
   podkreślenie/przekreślenie, zakreślacz, linki, listy punktowane i numerowane (prawdziwe listy
   Worda, także zagnieżdżone), checklisty (☐/☑), cytaty, kod, linie, tabele i zdjęcia.
   Strona: A4, marginesy i ramka jak w ustawieniach PDF (⚙ → Dane i kopie).
   ════════════════════════════════════════════════════════════════════════ */
const dxE = s => String(s==null?'':s).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g,'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
const DX_BLOK = /^(DIV|P|H1|H2|H3|UL|OL|LI|BLOCKQUOTE|PRE|HR|TABLE)$/;

async function ntDocx(n){
  const r=(ntSel===n.id&&ntRich())||null, box=document.createElement('div'); box.innerHTML=r?ntClean(r.innerHTML):ntHtml(n);
  const [mt,mr,mb,ml]=PDF_MARG[store.get('pdfMarg','waskie')]||PDF_MARG.waskie, szerCm=(210-ml-mr)/10;
  const rels=[], media=[], numy=[]; let rid=10, nid=1;   /* numId 1 = punktory; kolejne = osobne listy numerowane */

  /* zdjęcia: pobranie i wymiary */
  const IMG={};
  await Promise.all([...box.querySelectorAll('img[data-zid]')].map(async im=>{ const z=im.dataset.zid; if(IMG[z]) return;
    try{ const b=await ntzBlob(z); if(!b) return; const bm=await createImageBitmap(b), u8=new Uint8Array(await b.arrayBuffer());
      const ext=/png/.test(b.type)?'png':'jpeg', name=`image${Object.keys(IMG).length+1}.${ext}`, id='rId'+(rid++);
      let w=bm.width/96*2.54, h=bm.height/96*2.54; const k=Math.min(1, szerCm/w, 12/h); w*=k; h*=k;
      IMG[z]={id, cx:Math.round(w*360000), cy:Math.round(h*360000)}; media.push({name:'word/media/'+name, data:u8});
      rels.push(`<Relationship Id="${id}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/${name}"/>`); }catch(e){} }));

  /* tekst w akapicie → „runy” */
  const rPr=f=>{ let x=''; if(f.code) x+='<w:rFonts w:ascii="Consolas" w:hAnsi="Consolas" w:cs="Consolas"/>'; if(f.b) x+='<w:b/>'; if(f.i) x+='<w:i/>'; if(f.s) x+='<w:strike/>'; if(f.a) x+='<w:color w:val="0563C1"/>'; if(f.u||f.a) x+='<w:u w:val="single"/>'; if(f.hl) x+='<w:highlight w:val="yellow"/>'; return x?`<w:rPr>${x}</w:rPr>`:''; };
  const run=(t,f)=>t?`<w:r>${rPr(f)}<w:t xml:space="preserve">${dxE(t)}</w:t></w:r>`:'';
  let obr=0, aktInd=0;   /* aktInd: wcięcie bieżącego akapitu (twipy) — zdjęcie w liście musi być węższe */
  const rysunek=z=>{ let m=IMG[z]; if(!m) return run('[zdjęcie niedostępne]',{i:1}); obr++;
    const maxCx=Math.round((szerCm-aktInd/567)*360000); if(m.cx>maxCx) m={id:m.id, cx:maxCx, cy:Math.round(m.cy*maxCx/m.cx)};
    return `<w:r><w:drawing><wp:inline distT="0" distB="0" distL="0" distR="0"><wp:extent cx="${m.cx}" cy="${m.cy}"/><wp:docPr id="${obr}" name="Zdjęcie ${obr}"/><a:graphic xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:pic xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:nvPicPr><pic:cNvPr id="${obr}" name="Zdjęcie ${obr}"/><pic:cNvPicPr/></pic:nvPicPr><pic:blipFill><a:blip r:embed="${m.id}"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill><pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${m.cx}" cy="${m.cy}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr></pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing></w:r>`; };
  const inl=(node,f)=>{ if(node.nodeType===3) return run(node.nodeValue.replace(/ /g,' '), f); if(node.nodeType!==1) return '';
    const t=node.tagName; if(t==='BR') return '<w:r><w:br/></w:r>'; if(t==='IMG') return rysunek(node.dataset.zid);
    const g={...f}; if(t==='B'||t==='STRONG') g.b=1; if(t==='I'||t==='EM') g.i=1; if(t==='U') g.u=1; if(t==='S'||t==='STRIKE'||t==='DEL') g.s=1; if(t==='CODE') g.code=1;
    if(t==='MARK'||(t==='SPAN'&&/background/.test(node.getAttribute('style')||''))) g.hl=1;
    if(t==='A' && /^(https?:|mailto:)/i.test(node.getAttribute('href')||'')){ const id='rId'+(rid++);
      rels.push(`<Relationship Id="${id}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/hyperlink" Target="${dxE(node.getAttribute('href'))}" TargetMode="External"/>`);
      return `<w:hyperlink r:id="${id}">${[...node.childNodes].map(c=>inl(c,{...g,a:1})).join('')}</w:hyperlink>`; }
    return [...node.childNodes].map(c=>inl(c,g)).join(''); };

  /* akapit z ustawieniami */
  const akapit=(runs,c={})=>{ let p='';
    if(c.styl) p+=`<w:pStyle w:val="${c.styl}"/>`;
    if(c.quote) p+='<w:pBdr><w:left w:val="single" w:sz="18" w:space="8" w:color="C8252B"/></w:pBdr>';
    if(c.hr) p+='<w:pBdr><w:bottom w:val="single" w:sz="6" w:space="1" w:color="999999"/></w:pBdr>';
    if(c.num){ p+=`<w:numPr><w:ilvl w:val="${c.num.lvl}"/><w:numId w:val="${c.num.id}"/></w:numPr>`; }
    else if(c.ind||c.wys) p+=`<w:ind w:left="${c.ind||0}"${c.wys?` w:hanging="${c.wys}"`:''}/>`;
    if(c.ciasno) p+='<w:spacing w:after="0"/>';
    return `<w:p>${p?`<w:pPr>${p}</w:pPr>`:''}${runs}</w:p>`; };

  /* bloki */
  const kontener=(el,c)=>{ let out='', buf=[]; let pierwszy=c.numPending||null, ck=c.ckPending||'';
    const wypchnij=()=>{ if(!buf.length) return; aktInd=c.ind||0; let runs=buf.map(x=>inl(x,c.fmt||{})).join(''); const sam_br=buf.every(x=>x.nodeType===1&&x.tagName==='BR'||x.nodeType===3&&!x.nodeValue.trim()); buf=[];
      if(sam_br && !buf.length && runs.indexOf('<w:t')<0 && runs.indexOf('<w:drawing')<0) runs='';
      const cc={ind:c.ind, quote:c.quote, styl:c.styl};
      if(pierwszy){ cc.num=pierwszy; pierwszy=null; }
      if(ck){ runs=`<w:r><w:rPr><w:rFonts w:ascii="Segoe UI Symbol" w:hAnsi="Segoe UI Symbol"/></w:rPr><w:t xml:space="preserve">${ck} </w:t></w:r>`+runs; cc.ind=(c.ind||0); cc.wys=340; ck=''; }
      out+=akapit(runs,cc); };
    [...el.childNodes].forEach(ch=>{ if(ch.nodeType===1 && DX_BLOK.test(ch.tagName)){ wypchnij(); if(pierwszy){ out+=akapit('',{num:pierwszy}); pierwszy=null; } out+=blok(ch,{...c, numPending:null, ckPending:'', styl:''}); }
      else if(ch.nodeType===3 && !ch.nodeValue.trim() && !buf.length){ /* odstęp między blokami */ }
      else buf.push(ch); });
    wypchnij(); if(pierwszy) out+=akapit('',{num:pierwszy});
    return out; };
  const blok=(el,c)=>{ const t=el.tagName;
    if(t==='H1'||t==='H2'||t==='H3') return kontener(el,{...c, styl:'Heading'+t[1]});
    if(t==='HR') return akapit('',{hr:1});
    if(t==='PRE') return el.textContent.replace(/\n$/,'').split('\n').map(l=>akapit(run(l,{code:1}),{ind:c.ind, ciasno:1})).join('')+akapit('',{ciasno:1});
    if(t==='BLOCKQUOTE') return kontener(el,{...c, quote:1, ind:(c.ind||0)+340, fmt:{...(c.fmt||{}), i:1}});
    if(t==='UL'||t==='OL'){ const lvl=c.lvl==null?0:Math.min(c.lvl+1,3), ck=t==='UL'&&el.classList.contains('nt-ck'); let id=1;
      if(t==='OL'){ id=++nid; numy.push(id); }
      return [...el.children].map(li=>li.tagName!=='LI'?blok(li,c):ck
        ? kontener(li,{...c, lvl, ind:340+lvl*400, ckPending:li.classList.contains('done')?'☑':'☐', numPending:null})
        : kontener(li,{...c, lvl, ind:720*(lvl+1), numPending:{id, lvl}, ckPending:''})).join(''); }
    if(t==='TABLE'){ const rows=[...el.querySelectorAll('tr')]; if(!rows.length) return '';
      const kol=Math.max(...rows.map(r=>r.children.length)), w=Math.floor(5000/kol), bd='<w:top w:val="single" w:sz="4" w:color="999999"/><w:left w:val="single" w:sz="4" w:color="999999"/><w:bottom w:val="single" w:sz="4" w:color="999999"/><w:right w:val="single" w:sz="4" w:color="999999"/><w:insideH w:val="single" w:sz="4" w:color="999999"/><w:insideV w:val="single" w:sz="4" w:color="999999"/>';
      return `<w:tbl><w:tblPr><w:tblW w:w="5000" w:type="pct"/><w:tblBorders>${bd}</w:tblBorders><w:tblCellMar><w:left w:w="100" w:type="dxa"/><w:right w:w="100" w:type="dxa"/></w:tblCellMar></w:tblPr>${rows.map(tr=>`<w:tr>${[...tr.children].map(td=>`<w:tc><w:tcPr><w:tcW w:w="${w}" w:type="pct"/></w:tcPr>${kontener(td,{ind:0, fmt:td.tagName==='TH'?{b:1}:{}})||akapit('')}</w:tc>`).join('')}</w:tr>`).join('')}</w:tbl>${akapit('')}`; }
    return kontener(el,c)||akapit('',{ind:c.ind}); };

  const tresc=kontener(box,{});
  const tw=mm=>Math.round(mm*56.6929), ramka=store.get('pdfRamka','0')==='1';
  const bok=k=>`<w:${k} w:val="single" w:sz="6" w:space="11" w:color="222222"/>`;
  const W='xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing"';
  const doc=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document ${W}><w:body>
${akapit(run(ntTitle(n),{}),{styl:'Title'})}${akapit(`<w:r><w:rPr><w:color w:val="777777"/><w:sz w:val="18"/></w:rPr><w:t xml:space="preserve">${dxE((n.cat?n.cat+' · ':'')+ntWhen(n.u,true))}</w:t></w:r>`)}
${tresc}
<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="${tw(mt)}" w:right="${tw(mr)}" w:bottom="${tw(mb)}" w:left="${tw(ml)}" w:header="0" w:footer="0" w:gutter="0"/>${ramka?`<w:pgBorders w:offsetFrom="text">${bok('top')}${bok('left')}${bok('bottom')}${bok('right')}</w:pgBorders>`:''}</w:sectPr></w:body></w:document>`;
  const lvlB=['•','◦','▪','•'].map((z,i)=>`<w:lvl w:ilvl="${i}"><w:start w:val="1"/><w:numFmt w:val="bullet"/><w:lvlText w:val="${z}"/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="${720*(i+1)}" w:hanging="360"/></w:pPr><w:rPr><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/></w:rPr></w:lvl>`).join('');
  const lvlN=['decimal','lowerLetter','lowerRoman','decimal'].map((z,i)=>`<w:lvl w:ilvl="${i}"><w:start w:val="1"/><w:numFmt w:val="${z}"/><w:lvlText w:val="%${i+1}."/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="${720*(i+1)}" w:hanging="360"/></w:pPr></w:lvl>`).join('');
  const numbering=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:numbering ${W}><w:abstractNum w:abstractNumId="0"><w:multiLevelType w:val="hybridMultilevel"/>${lvlB}</w:abstractNum><w:abstractNum w:abstractNumId="1"><w:multiLevelType w:val="hybridMultilevel"/>${lvlN}</w:abstractNum><w:num w:numId="1"><w:abstractNumId w:val="0"/></w:num>${numy.map(id=>`<w:num w:numId="${id}"><w:abstractNumId w:val="1"/><w:lvlOverride w:ilvl="0"><w:startOverride w:val="1"/></w:lvlOverride></w:num>`).join('')}</w:numbering>`;
  const nagl=(id,nazwa,sz,lvl)=>`<w:style w:type="paragraph" w:styleId="${id}"><w:name w:val="${nazwa}"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:qFormat/><w:pPr><w:keepNext/><w:spacing w:before="240" w:after="80"/>${lvl!=null?`<w:outlineLvl w:val="${lvl}"/>`:''}</w:pPr><w:rPr><w:b/><w:sz w:val="${sz}"/></w:rPr></w:style>`;
  const styles=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:styles ${W}><w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri" w:cs="Calibri" w:eastAsia="Calibri"/><w:sz w:val="22"/><w:lang w:val="pl-PL"/></w:rPr></w:rPrDefault><w:pPrDefault><w:pPr><w:spacing w:after="120" w:line="276" w:lineRule="auto"/></w:pPr></w:pPrDefault></w:docDefaults>
<w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/><w:qFormat/></w:style>
<w:style w:type="paragraph" w:styleId="Title"><w:name w:val="Title"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:qFormat/><w:pPr><w:spacing w:after="40"/></w:pPr><w:rPr><w:b/><w:sz w:val="40"/></w:rPr></w:style>
${nagl('Heading1','heading 1',32,0)}${nagl('Heading2','heading 2',28,1)}${nagl('Heading3','heading 3',24,2)}</w:styles>`;
  const pliki=[
    {name:'[Content_Types].xml', data:`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Default Extension="jpeg" ContentType="image/jpeg"/><Default Extension="png" ContentType="image/png"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/><Override PartName="/word/numbering.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.numbering+xml"/></Types>`},
    {name:'_rels/.rels', data:`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>`},
    {name:'word/document.xml', data:doc},
    {name:'word/_rels/document.xml.rels', data:`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/numbering" Target="numbering.xml"/>${rels.join('')}</Relationships>`},
    {name:'word/styles.xml', data:styles}, {name:'word/numbering.xml', data:numbering}, ...media];
  return zipStworz(pliki, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
}
async function ntDocxPobierz(n){
  if(typeof ntStatus==='function') ntStatus('Przygotowuję plik Word…');
  try{ const b=await ntDocx(n), a=document.createElement('a'); a.href=URL.createObjectURL(b); a.download=(ntTitle(n).replace(/[\\/:*?"<>|]+/g,' ').trim()||'Notatka')+'.docx';
    document.body.appendChild(a); a.click(); setTimeout(()=>{ URL.revokeObjectURL(a.href); a.remove(); },1500); if(typeof ntStatus==='function') ntStatus('Pobrano plik Word'); }
  catch(e){ console.warn(e); if(typeof ntStatus==='function') ntStatus('Nie udało się utworzyć pliku Word'); }
}
