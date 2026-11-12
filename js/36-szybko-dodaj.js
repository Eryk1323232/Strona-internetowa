/* ════════════════════════════════════════════════════════════════════════
   SZYBKO DODAJ — w górnej wyszukiwarce (Ctrl+K) można też wpisać rzecz do dodania
   ════════════════════════════════════════════════════════════════════════
   „kawa 12 zł”                    → wydatek 12 zł, kategoria zgadywana ze słów (SD_KAT), dziś
   „wczoraj kebab 25”              → wydatek z wczorajszą datą
   „+ stypendium 1200 zł”          → wpływ
   „jutro 10:00 kolokwium z dróg”  → zadanie z terminem i godziną
   „pt oddać projekt”, „15.11 …”, „za 3 dni …”, „w środę o 8 …”
   „cokolwiek”                     → zadanie bez terminu albo nowa notatka
   sdAnaliza(tekst) rozbiera wpis, sdAkcje(tekst) zwraca listę propozycji dla wyszukiwarki
   (js/22-wyszukiwarka.js pokazuje je na liście; Enter wykonuje pierwszą).
   ════════════════════════════════════════════════════════════════════════ */
const SD_KAT = {
  Jedzenie:'kawa obiad pizza kebab biedronka lidl zabka sniadanie kolacja jedzenie paczek bulka mcdonald kfc sushi burger lody stolowka zakupy spozywcze piekarnia woda napoj herbata zapiekanka pierogi',
  Transport:'bilet paliwo bolt uber pkp autobus tankowanie benzyna pociag taxi taksowka hulajnoga parking bkm',
  Mieszkanie:'czynsz akademik prad internet gaz mieszkanie pralnia',
  Studia:'ksero druk ksiazka skrypt legitymacja xero wydruk plotowanie zeszyt dlugopis indeks',
  Rozrywka:'kino piwo gra steam wot impreza bar klub pub netflix spotify koncert bilard kregle',
  Zakupy:'ubrania buty allegro rossmann koszulka spodnie kosmetyki apteka leki fryzjer silownia karnet' };
const SD_DNI = [['nd','niedz','niedziela','niedziele'],['pon','poniedzialek'],['wt','wtorek'],['sr','sroda','srode'],['czw','czwartek'],['pt','piatek'],['sob','sobota','sobote']];
const SD_MIES = ['stycznia','lutego','marca','kwietnia','maja','czerwca','lipca','sierpnia','wrzesnia','pazdziernika','listopada','grudnia'];
const sdK = s => String(s||'').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/ł/g,'l');
const sdISO = d => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;

function sdAnaliza(tekst){
  let s=' '+String(tekst||'').trim()+' ', due='', tm='', kwota=0, typ='wyd';
  const dzis=new Date(); dzis.setHours(12,0,0,0);
  const plus=n=>{ const d=new Date(dzis); d.setDate(d.getDate()+n); return sdISO(d); };
  const wytnij=(re,fn)=>{ const k=sdK(s), m=re.exec(k); if(!m) return false; const r=fn(m); if(r===false) return false; s=s.slice(0,m.index)+' '+s.slice(m.index+m[0].length); return true; };
  /* sdK nie zmienia długości tekstu (ł→l, ogonki znikają po NFD… więc liczymy na wersji bez znaków łączących) */
  s=s.normalize('NFC');
  if(/^\s*\+/.test(s)){ typ='wpl'; s=s.replace(/^\s*\+/,' '); }
  /* godzina */
  wytnij(/\s(?:o\s+|godz\.?\s*)?([01]?\d|2[0-3]):([0-5]\d)(?=\s)/, m=>{ tm=m[1].padStart(2,'0')+':'+m[2]; }) ||
  wytnij(/\s(?:o\s+|godz\.?\s*)([01]?\d|2[0-3])\.([0-5]\d)(?=\s)/, m=>{ tm=m[1].padStart(2,'0')+':'+m[2]; }) ||
  wytnij(/\so\s+([01]?\d|2[0-3])(?=\s)/, m=>{ tm=m[1].padStart(2,'0')+':00'; });
  /* data */
  wytnij(/\s(dzis|dzisiaj|jutro|pojutrze|wczoraj|przedwczoraj)(?=\s)/, m=>{ due=plus({dzis:0,dzisiaj:0,jutro:1,pojutrze:2,wczoraj:-1,przedwczoraj:-2}[m[1]]); }) ||
  wytnij(/\sza\s+(\d{1,3})\s+(dni|dzien|tygodnie|tygodni|tydzien)(?=\s)/, m=>{ due=plus(+m[1]*(m[2][0]==='t'?7:1)); }) ||
  wytnij(/\sza\s+tydzien(?=\s)/, ()=>{ due=plus(7); }) ||
  wytnij(/\s(\d{1,2})[.\/-](\d{1,2})(?:[.\/-](\d{4}|\d{2}))?\.?(?=\s)/, m=>{ const d=+m[1], mo=+m[2]; if(d<1||d>31||mo<1||mo>12) return false; let y=m[3]?+(m[3].length===2?'20'+m[3]:m[3]):dzis.getFullYear(); let x=new Date(y,mo-1,d,12); if(!m[3] && x<plus0()) x=new Date(y+1,mo-1,d,12); due=sdISO(x); }) ||
  wytnij(new RegExp('\\s(\\d{1,2})\\s+('+SD_MIES.join('|')+')(?=\\s)'), m=>{ const mo=SD_MIES.indexOf(m[2]); let x=new Date(dzis.getFullYear(),mo,+m[1],12); if(x<plus0()) x=new Date(dzis.getFullYear()+1,mo,+m[1],12); due=sdISO(x); }) ||
  wytnij(new RegExp('\\s(?:w|we|na)?\\s*('+SD_DNI.flat().sort((a,b)=>b.length-a.length).join('|')+')\\.?(?=\\s)'), m=>{ const nr=SD_DNI.findIndex(L=>L.includes(m[1])); let r=(nr-dzis.getDay()+7)%7; if(r===0) r=7; due=plus(r); });
  function plus0(){ const d=new Date(dzis); d.setHours(0,0,0,0); return d; }
  /* kwota: „12 zł”, „12,50zł”, albo sama liczba na początku / końcu */
  wytnij(/\s(\d{1,6}(?:[.,]\d{1,2})?)\s*(?:zl|pln|zeta|zlotych|zlote|zloty)(?=\s)/, m=>{ kwota=+m[1].replace(',','.'); }) ||
  wytnij(/\s(\d{1,6}(?:[.,]\d{1,2})?)\s$/, m=>{ kwota=+m[1].replace(',','.'); }) ||
  wytnij(/^\s(\d{1,6}(?:[.,]\d{1,2})?)(?=\s+\S)/, m=>{ kwota=+m[1].replace(',','.'); });
  let opis=s.replace(/\s+/g,' ').trim().replace(/^[-–—:,;]\s*|\s*[-–—:,;]$/g,'');
  if(opis) opis=opis[0].toUpperCase()+opis.slice(1);
  const k=' '+sdK(opis)+' '; let kat='';
  if(/ (stypendium|wyplata|pensja|przelew od|od rodzicow|zwrot|premia) /.test(k)) typ='wpl';
  if(typ==='wpl') kat=/stypendium/.test(k)?'Stypendium':/rodzic|mama|tata/.test(k)?'Od rodziców':/wyplata|pensja|praca|premia/.test(k)?'Praca':'Inne';
  else kat=(Object.entries(SD_KAT).find(([n,sl])=>sl.split(' ').some(w=>k.includes(' '+w)))||['Inne'])[0];
  return {kwota, typ, kat, opis, due, tm};
}
const sdDzien = iso => { const td=todayISO(); if(iso===td) return 'dziś'; const d=new Date(iso+'T12:00'), r=Math.round((d-new Date(td+'T12:00'))/864e5);
  return (r===1?'jutro, ':r===-1?'wczoraj, ':'')+d.toLocaleDateString('pl-PL',{weekday:'short', day:'numeric', month:'short'}); };
const SD_IC = { wyd:'<svg class="ni" viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="6" width="18" height="13" rx="2.5"/><path d="M3 10.5h18M7 15h4"/></svg>',
  zad:'<svg class="ni" viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="4" width="16" height="16" rx="4"/><path d="m8.5 12.2 2.5 2.5 4.8-5.2"/></svg>',
  not:'<svg class="ni" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 3.5h9l4 4V20.5H6z"/><path d="M9 12h7M9 16h7M9 8h3"/></svg>' };

function sdDodajWydatek(a){
  if(typeof FIN==='undefined') return 'Brak modułu Pieniądze';
  const o=finONorm(uid('fo'),{t:a.typ, k:store.get('finKonto','glowne'), d:a.due||todayISO(), a:a.kwota, kat:a.kat, n:a.opis, c:Date.now()});
  FIN.ops=[...FIN.ops,o]; saveFin(); finRefresh(); finPushO(o);
  return `Dodano ${a.typ==='wpl'?'wpływ':'wydatek'}: ${fmt(a.kwota,Number.isInteger(a.kwota)?0:2)} zł · ${a.kat}${a.opis?' · '+a.opis:''}`;
}
function sdDodajZadanie(a, tytul){
  const td=todayISO(), t=tdNorm(uid('t'),{t:tytul, l:'zadania', due:a.due, tm:a.due?a.tm:'', myDay:(!a.due||a.due===td)&&a.tm?td:(a.due===td?td:''), c:Date.now()});
  if(a.tm && !a.due){ t.due=td; t.tm=a.tm; }
  T.tasks=[t,...T.tasks]; saveTodo(); cloud(db=>db.collection('todo').doc(t.id).set(tdDoc(t)));
  if(typeof tdRefresh==='function') tdRefresh();
  return `Dodano zadanie: ${tytul}${t.due?' · '+sdDzien(t.due)+(t.tm?', '+t.tm:''):''}`;
}
function sdDodajNotatke(tekst){
  const n=ntNorm(uid('n'),{t:tekst.slice(0,140), c:Date.now(), u:Date.now()}); N=[n,...N]; ntSel=n.id; saveNotes(); ntPush(n);
  if(location.hash==='#notatki'){ if(typeof ntRefresh==='function') ntRefresh(true); } else location.hash='#notatki';
  return 'Utworzono notatkę';
}
/* propozycje dla wyszukiwarki: {n: napis, g: dopisek, ic, pierw: czy ma być przed podstronami, run()} */
function sdAkcje(tekst){
  const q=String(tekst||'').trim(); if(q.length<2) return [];
  const a=sdAnaliza(q), out=[], zl=fmt(a.kwota,Number.isInteger(a.kwota)?0:2)+' zł';
  if(a.kwota>0 && typeof FIN!=='undefined') out.push({ic:SD_IC.wyd, pierw:true, n:`${a.typ==='wpl'?'Wpływ':'Wydatek'} ${zl}${a.opis?' — '+a.opis:''}`, g:`${a.kat} · ${sdDzien(a.due||todayISO())}`, run:()=>sdDodajWydatek(a)});
  const tytul=a.kwota>0 ? (a.opis?`${a.opis} ${zl}`:'') : a.opis;
  if(tytul && typeof T==='object') out.push({ic:SD_IC.zad, pierw:!!(a.due||a.tm)&&!a.kwota, n:`Zadanie: ${tytul}`, g:a.due||a.tm?sdDzien(a.due||todayISO())+(a.tm?', '+a.tm:''):'bez terminu', run:()=>sdDodajZadanie(a, tytul)});
  if(!a.kwota && !a.due && !a.tm && typeof N!=='undefined') out.push({ic:SD_IC.not, n:`Notatka: ${q}`, g:'nowa notatka', run:()=>sdDodajNotatke(q)});
  return out;
}
