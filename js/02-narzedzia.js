/* ════════════════════════════════════════════════════════════════════════
   NARZĘDZIA WSPÓLNE
   ════════════════════════════════════════════════════════════════════════
   $('#id')        – skrót do document.querySelector
   fmt(n, miejsca) – liczba po polsku, np. fmt(1234.5,2) → "1 234,50"
   zl(n)           – kwota z „zł”
   esc(tekst)      – zabezpiecza tekst przed wstawieniem do HTML (zawsze używaj przy danych z formularzy)
   dPL('2026-11-06') → "06.11.2026"
   store.get/set   – zapis w przeglądarce (localStorage), odporny na błędy
   ════════════════════════════════════════════════════════════════════════ */

/* ——— narzędzia ——— */
const $ = s => document.querySelector(s);
/* liczba po polsku z odstępami co 3 cyfry — także dla 4-cyfrowych (24 000, nie 24000) */
const fmt = (n, d=0) => { n=Number(n); if(!isFinite(n)) return String(n);
  const [i,f]=Math.abs(n).toFixed(d).split('.'); return (n<0&&+(Math.abs(n).toFixed(d))?'-':'')+i.replace(/\B(?=(\d{3})+(?!\d))/g,'\u00a0')+(f?','+f:''); };
const zl = n => fmt(n,2)+' zł';
const esc = s => String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const dPL = iso => { const [y,m,d]=iso.split('-'); return `${d}.${m}.${y}`; };
/* PODGLĄD KOPII (js/20-kopia-zapasowa.js): gdy w tej karcie wgrano starą kopię, strona czyta dane z niej,
   zmiany trzyma tylko w pamięci, a chmura jest wyłączona — prawdziwe dane zostają nietknięte. */
const PODGLAD = (()=>{ try{ const v=JSON.parse(sessionStorage.getItem('podglad')||'null'); return v&&v.d&&typeof v.d==='object'?v:null; }catch(e){ return null; } })();
const store = PODGLAD
  ? { get(k,f){ const v=PODGLAD.d[k]; return v===undefined||v===null?f:String(v); }, set(k,v){ PODGLAD.d[k]=String(v); } }
  : { get(k,f){try{const v=localStorage.getItem(k);return v===null?f:v}catch(e){return f}}, set(k,v){try{localStorage.setItem(k,v)}catch(e){}} };

/* ——— małe ikony SVG zamiast emoji (wyglądają tak samo na Windowsie i telefonie) ———
   icn('puchar') → <svg class="ic ic-puchar">…  Kolor = kolor tekstu (currentColor), rozmiar = 1em. */
const IC_SVG = {
  puchar:'<path d="M8 4h8v5a4 4 0 0 1-8 0z"/><path d="M8 6H5.5a2.5 2.5 0 0 0 2.6 3.8M16 6h2.5a2.5 2.5 0 0 1-2.6 3.8"/><path d="M12 13v4M8.5 20h7M10 17h4"/>',
  cel:'<circle cx="12" cy="12" r="8.5"/><path d="m8.3 12.3 2.6 2.6 5-5.4"/>',
  olowek:'<path d="M15.5 5.5 18.5 8.5"/><path d="M4.5 19.5 5.4 15.6 15.6 5.4a2.1 2.1 0 0 1 3 3L8.4 18.6z"/>',
  zebatka:'<circle cx="12" cy="12" r="3"/><path d="M12 3.5v2M12 18.5v2M3.5 12h2M18.5 12h2M6 6l1.4 1.4M16.6 16.6 18 18M6 18l1.4-1.4M16.6 7.4 18 6"/>',
  obraz:'<rect x="3.5" y="5" width="17" height="14" rx="2.5"/><circle cx="9" cy="10" r="1.6"/><path d="m4.5 17.5 4.5-4.5 3.5 3.5 2.5-2.5 4.5 4"/>'
};
const icn = (n, cls='') => `<svg class="ic ic-${n}${cls?' '+cls:''}" viewBox="0 0 24 24" aria-hidden="true">${IC_SVG[n]||''}</svg>`;
