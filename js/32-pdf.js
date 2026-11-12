/* ════════════════════════════════════════════════════════════════════════
   PDF ZE STRONY — wspólne ustawienia dla wszystkich wydruków (CV, Wyniki, Notatki)
   ════════════════════════════════════════════════════════════════════════
   pdfPrzygotuj(html) poprawia gotowy dokument przed drukiem:
   • @page margin:0 → przeglądarka nie ma miejsca na swoją stopkę/nagłówek
     (adres strony, data, tytuł, numery stron znikają);
   • marginesy robi tabela-opakowanie: puste <thead>/<tfoot> powtarzają się na każdej stronie
     (góra/dół), boki to wcięcie komórki;
   • opcjonalna ramka jak w Wordzie (linia wokół obszaru tekstu, na każdej stronie).
   Ustawienia (⚙ → Dane i kopie): pdfRamka '1'/'0', pdfMarg 'waskie' | 'normalne' | 'szerokie'.
   ════════════════════════════════════════════════════════════════════════ */
const PDF_MARG = { waskie:[12.7,12.7,12.7,12.7], normalne:[15,15,16,15], szerokie:[25,25,25,25] };   /* góra, prawo, dół, lewo (mm) */
if(!store.get('pdfMarg2','')){ store.set('pdfMarg','waskie'); store.set('pdfMarg2','1'); }   /* jednorazowo: domyślnie 1,27 cm jak w Wordzie */
function pdfPrzygotuj(html){
  const ramka=store.get('pdfRamka','0')==='1', [t,r,b,l]=PDF_MARG[store.get('pdfMarg','waskie')]||PDF_MARG.normalne, od=4;   /* ramka 4 mm od tekstu */
  const css=`
  @page{size:A4;margin:0}
  @media print{
    html,body{margin:0!important;padding:0!important;background:#fff!important;max-width:none!important;width:auto!important}
    .sheet{max-width:none!important;margin:0!important;padding:0!important;box-shadow:none!important;background:none!important}
    table.pdf-pg{width:100%!important;border-collapse:collapse!important;border:0!important;margin:0!important}
    table.pdf-pg>thead>tr>td,table.pdf-pg>tfoot>tr>td,table.pdf-pg>tbody>tr>td.pdf-c{border:0!important;padding:0!important;background:none!important;vertical-align:top!important}
    table.pdf-pg>tbody>tr>td.pdf-c{padding:0 ${r}mm 0 ${l}mm!important}
    .pdf-sp-t{height:${t}mm} .pdf-sp-b{height:${b}mm}
    .pdf-ramka{display:block!important;position:fixed;top:${(t-od).toFixed(1)}mm;right:${(r-od).toFixed(1)}mm;bottom:${(b-od).toFixed(1)}mm;left:${(l-od).toFixed(1)}mm;border:.75pt solid #222;pointer-events:none}
  }
  @media screen{ table.pdf-pg,table.pdf-pg>*>tr>td{border:0!important;padding:0!important;background:none!important;width:100%} .pdf-sp-t,.pdf-sp-b{height:0} }
  .pdf-ramka{display:none}`;
  html=html.replace(/@page\s*\{[^}]*\}/g,'').replace('</style>', css+'</style>');
  return html.replace(/<body([^>]*)>([\s\S]*)<\/body>/, (m,attr,inner)=>{
    const skrypty=[], tresc=inner.replace(/<script[\s\S]*?<\/script>/g, s=>{ skrypty.push(s); return ''; });
    return `<body${attr}><table class="pdf-pg" role="presentation"><thead><tr><td><div class="pdf-sp-t"></div></td></tr></thead><tfoot><tr><td><div class="pdf-sp-b"></div></td></tr></tfoot><tbody><tr><td class="pdf-c">${tresc}</td></tr></tbody></table>${ramka?'<div class="pdf-ramka"></div>':''}${skrypty.join('')}</body>`; });
}
