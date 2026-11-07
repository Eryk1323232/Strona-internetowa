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
const store = { get(k,f){try{const v=localStorage.getItem(k);return v===null?f:v}catch(e){return f}}, set(k,v){try{localStorage.setItem(k,v)}catch(e){}} };
