/* ════════════════════════════════════════════════════════════════════════
   ZIP — mały, własny zapis i odczyt archiwów (bez bibliotek)
   ════════════════════════════════════════════════════════════════════════
   Używają go: eksport notatki do Worda (.docx to archiwum ZIP — js/35-docx.js)
   i kopia zapasowa ze zdjęciami (js/20-kopia-zapasowa.js).
   zipStworz([{name, data}], typ)  → Blob   (data: Uint8Array albo tekst; bez kompresji — „store”)
   zipCzytaj(ArrayBuffer)          → Promise<[{name, data:Uint8Array}]>  (czyta też skompresowane „deflate”)
   ════════════════════════════════════════════════════════════════════════ */
const ZIP_CRC = (()=>{ const T=new Uint32Array(256); for(let n=0;n<256;n++){ let c=n; for(let k=0;k<8;k++) c=c&1?0xEDB88320^(c>>>1):c>>>1; T[n]=c>>>0; } return T; })();
function zipCrc(u8){ let c=0xFFFFFFFF; for(let i=0;i<u8.length;i++) c=ZIP_CRC[(c^u8[i])&0xFF]^(c>>>8); return (c^0xFFFFFFFF)>>>0; }
function zipStworz(pliki, typ='application/zip'){
  const enc=new TextEncoder(), czesci=[], centr=[]; let off=0;
  const d=new Date(), czas=(d.getHours()<<11)|(d.getMinutes()<<5)|(d.getSeconds()>>1), data=((d.getFullYear()-1980)<<9)|((d.getMonth()+1)<<5)|d.getDate();
  pliki.forEach(p=>{ const nazwa=enc.encode(p.name), dane=typeof p.data==='string'?enc.encode(p.data):p.data, crc=zipCrc(dane);
    const h=new DataView(new ArrayBuffer(30)); h.setUint32(0,0x04034b50,true); h.setUint16(4,20,true); h.setUint16(6,0x0800,true); h.setUint16(8,0,true); h.setUint16(10,czas,true); h.setUint16(12,data,true);
    h.setUint32(14,crc,true); h.setUint32(18,dane.length,true); h.setUint32(22,dane.length,true); h.setUint16(26,nazwa.length,true); h.setUint16(28,0,true);
    czesci.push(new Uint8Array(h.buffer), nazwa, dane);
    const c=new DataView(new ArrayBuffer(46)); c.setUint32(0,0x02014b50,true); c.setUint16(4,20,true); c.setUint16(6,20,true); c.setUint16(8,0x0800,true); c.setUint16(10,0,true); c.setUint16(12,czas,true); c.setUint16(14,data,true);
    c.setUint32(16,crc,true); c.setUint32(20,dane.length,true); c.setUint32(24,dane.length,true); c.setUint16(28,nazwa.length,true); c.setUint32(42,off,true);
    centr.push(new Uint8Array(c.buffer), nazwa); off+=30+nazwa.length+dane.length; });
  const rozmC=centr.reduce((a,x)=>a+x.length,0), e=new DataView(new ArrayBuffer(22));
  e.setUint32(0,0x06054b50,true); e.setUint16(8,pliki.length,true); e.setUint16(10,pliki.length,true); e.setUint32(12,rozmC,true); e.setUint32(16,off,true);
  return new Blob([...czesci, ...centr, new Uint8Array(e.buffer)], {type:typ});
}
async function zipCzytaj(buf){
  const u8=new Uint8Array(buf), dv=new DataView(buf), dec=new TextDecoder(); let i=u8.length-22;
  while(i>=0 && dv.getUint32(i,true)!==0x06054b50) i--; if(i<0) throw new Error('To nie jest plik ZIP');
  const n=dv.getUint16(i+10,true); let p=dv.getUint32(i+16,true); const out=[];
  for(let k=0;k<n;k++){ if(dv.getUint32(p,true)!==0x02014b50) break;
    const met=dv.getUint16(p+10,true), rozm=dv.getUint32(p+20,true), nl=dv.getUint16(p+28,true), el=dv.getUint16(p+30,true), cl=dv.getUint16(p+32,true), lok=dv.getUint32(p+42,true);
    const name=dec.decode(u8.subarray(p+46,p+46+nl)), start=lok+30+dv.getUint16(lok+26,true)+dv.getUint16(lok+28,true), surowe=u8.subarray(start,start+rozm);
    let data=surowe;
    if(met===8) data=new Uint8Array(await new Response(new Blob([surowe]).stream().pipeThrough(new DecompressionStream('deflate-raw'))).arrayBuffer());
    else if(met!==0) throw new Error('Nieobsługiwana kompresja w pliku ZIP');
    if(!name.endsWith('/')) out.push({name, data}); p+=46+nl+el+cl; }
  return out;
}
