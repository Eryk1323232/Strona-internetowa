/* ════════════════════════════════════════════════════════════════════════
   PRACOWNIA — zapis danych strony w Arkuszu Google (Google Apps Script)
   ════════════════════════════════════════════════════════════════════════
   Wklej CAŁY ten plik do: Arkusz Google → Rozszerzenia → Apps Script.
   Zmień KLUCZ na własne hasło (to samo wpisz w js/00-ustawienia.js).
   Potem: Wdróż → Nowe wdrożenie → Aplikacja internetowa
          (Wykonuj jako: Ja, Kto ma dostęp: Każdy) → skopiuj adres /exec.

   Jak wyglądają dane w arkuszu:
   • każda kolekcja strony = osobna karta (np. „waga”, „todo”, „exp”, „notatki”),
   • wiersz = jeden wpis, kolumna A = id, kolumna B = kiedy zmieniono,
     dalej pola wpisu (np. d = data, v = waga),
   • listy i obiekty (np. ćwiczenia w planie) są w komórce jako „json:[…]”.
   Możesz dane przeglądać i poprawiać ręcznie — strona pobierze zmiany
   w ciągu ~30 s. Nie zmieniaj tylko nazw kart i nagłówków w wierszu 1.
   ════════════════════════════════════════════════════════════════════════ */

const KLUCZ = 'zmien-mnie';            // ← TU wpisz swoje hasło (min. kilkanaście znaków)

/* ——— strona pobiera dane (GET) ——— */
function doGet(e) {
  return odpowiedz(() => {
    sprawdzKlucz(e && e.parameter && e.parameter.klucz);
    return wszystkieDane();
  });
}

/* ——— strona wysyła zmiany (POST): {klucz, ops:[{op:'set'|'update'|'delete', c:'kolekcja', id, d:{…}}]} ——— */
function doPost(e) {
  return odpowiedz(() => {
    const body = JSON.parse(e.postData.contents);
    sprawdzKlucz(body.klucz);
    zapiszOperacje(body.ops || []);
    return wszystkieDane();               // w odpowiedzi aktualny stan — strona od razu go ma
  });
}

function odpowiedz(fn) {
  let wynik;
  try { wynik = { ok: true, dane: fn() }; }
  catch (err) { wynik = { ok: false, blad: String(err && err.message || err) }; }
  return ContentService.createTextOutput(JSON.stringify(wynik)).setMimeType(ContentService.MimeType.JSON);
}

function sprawdzKlucz(k) {
  if (!KLUCZ || KLUCZ === 'zmien-mnie') throw new Error('Ustaw własny KLUCZ w Kod.gs i wdróż ponownie.');
  if (k !== KLUCZ) throw new Error('Złe hasło (KLUCZ).');
}

/* ——— zamiana wartości: strona ↔ komórka ——— */
function doKomorki(v) {
  if (v === null || v === undefined) return '';
  if (typeof v === 'object') return 'json:' + JSON.stringify(v);
  return v;                               // liczba, tekst, prawda/fałsz
}
function zKomorki(v) {
  if (v instanceof Date) return Utilities.formatDate(v, Session.getScriptTimeZone(), 'yyyy-MM-dd');
  if (typeof v === 'string' && v.indexOf('json:') === 0) { try { return JSON.parse(v.slice(5)); } catch (e) { return v; } }
  return v;
}

/* ——— odczyt wszystkich kart z nagłówkiem „id” w A1 ——— */
function wszystkieDane() {
  const wynik = {};
  SpreadsheetApp.getActive().getSheets().forEach(sh => {
    const w = sh.getDataRange().getValues();
    if (!w.length || w[0][0] !== 'id') return;
    const nag = w[0];
    wynik[sh.getName()] = w.slice(1).filter(r => r[0] !== '').map(r => {
      const d = {};
      for (let j = 2; j < nag.length; j++) if (nag[j] !== '' && r[j] !== '') d[nag[j]] = zKomorki(r[j]);
      return { id: String(r[0]), data: d };
    });
  });
  return wynik;
}

/* ——— zapis paczki zmian: każda karta wczytywana i zapisywana tylko raz ——— */
function zapiszOperacje(ops) {
  const blokada = LockService.getScriptLock();
  blokada.waitLock(30000);                // dwa urządzenia naraz nie nadpiszą sobie danych
  try {
    const ss = SpreadsheetApp.getActive(), karty = {};
    const karta = c => {
      if (karty[c]) return karty[c];
      if (!/^[A-Za-z0-9_\-]{1,60}$/.test(c)) throw new Error('Zła nazwa kolekcji: ' + c);
      let sh = ss.getSheetByName(c);
      if (!sh) { sh = ss.insertSheet(c); sh.getRange(1, 1, 1, 2).setValues([['id', '_zmieniono']]); sh.setFrozenRows(1); }
      const w = sh.getDataRange().getValues();
      const nag = w[0][0] === 'id' ? w[0].map(String) : ['id', '_zmieniono'];
      const wiersze = w[0][0] === 'id' ? w.slice(1).filter(r => r[0] !== '') : [];
      return (karty[c] = { sh, nag, wiersze });
    };
    const teraz = new Date();
    ops.forEach(o => {
      const k = karta(String(o.c)), id = String(o.id);
      const i = k.wiersze.findIndex(r => String(r[0]) === id);
      if (o.op === 'delete') { if (i >= 0) k.wiersze.splice(i, 1); return; }
      const d = o.d || {};
      let obiekt = {};
      if (o.op === 'update' && i >= 0) k.nag.forEach((h, j) => { if (j >= 2 && k.wiersze[i][j] !== '') obiekt[h] = k.wiersze[i][j]; });
      Object.keys(d).forEach(h => {
        if (k.nag.indexOf(h) < 0) k.nag.push(h);    // nowe pole → nowa kolumna
        obiekt[h] = doKomorki(d[h]);
      });
      const wiersz = k.nag.map((h, j) => j === 0 ? id : j === 1 ? teraz : (h in obiekt ? obiekt[h] : ''));
      if (i >= 0) k.wiersze[i] = wiersz; else k.wiersze.push(wiersz);
    });
    /* zapis kart z powrotem */
    Object.keys(karty).forEach(c => {
      const { sh, nag, wiersze } = karty[c];
      const dane = [nag].concat(wiersze.map(r => nag.map((_, j) => r[j] === undefined ? '' : r[j])));
      sh.clearContents();
      const zakres = sh.getRange(1, 1, dane.length, nag.length);
      zakres.setNumberFormats(dane.map((r, ri) => r.map((v, j) => ri > 0 && j === 1 ? 'yyyy-mm-dd hh:mm' : typeof v === 'string' ? '@' : 'General')));
      zakres.setValues(dane);             // teksty jako tekst — „7” nie zamieni się w liczbę, data w datę
      sh.getRange(1, 1, 1, nag.length).setFontWeight('bold');
    });
  } finally {
    blokada.releaseLock();
  }
}

/* ——— test: w edytorze wybierz „test” i kliknij Uruchom — w Dzienniku zobaczysz listę kart ——— */
function test() {
  Logger.log(Object.keys(wszystkieDane()));
}
