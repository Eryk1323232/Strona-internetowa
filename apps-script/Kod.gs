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

   SKRZYNKA (ikonka w prawym górnym rogu strony) — przesyłanie plików i tekstu
   między telefonem a komputerem. Pliki NIE trafiają do Arkusza, tylko do folderu
   „Pracownia – Skrzynka” na Twoim Dysku Google; po 7 dniach same idą do kosza.
   ZDJĘCIA z Notatek i Wyników trafiają do folderu „Pracownia – Zdjęcia notatek” (bez usuwania).
   Najwygodniej: na stronie ⚙ → Synchronizacja → „Kopiuj nowy Kod.gs” (wstawia od razu Twoje hasło).
   Po wklejeniu nowej wersji tego pliku: Wdróż → Zarządzaj wdrożeniami → ołówek →
   Wersja: Nowa wersja → Wdróż, i zgódź się na dostęp do Dysku (Google zapyta raz).
   ════════════════════════════════════════════════════════════════════════ */

const WERSJA_SKRYPTU = 3;              // strona sprawdza ten numer (⚙ → Synchronizacja) — nie zmieniaj
const KLUCZ = 'zmien-mnie';            // ← TU wpisz swoje hasło (min. kilkanaście znaków)
const SKRZYNKA_FOLDER = 'Pracownia – Skrzynka';   // folder na Dysku Google
const SKRZYNKA_DNI = 7;                            // po ilu dniach pliki ze skrzynki idą do kosza

/* ——— strona pobiera dane (GET) ——— */
function doGet(e) {
  const p = (e && e.parameter) || {};
  /* skrzynka: ?akcja=lista | pobierz&id=… | usun&id=… | wyczysc | wyslij&tekst=… */
  if (p.akcja) return odpowiedz(() => { sprawdzKlucz(p.klucz); return skrzynka(p.akcja, p); });
  /* zapis przez GET (?ops=[…]) — gdy przeglądarka nie przepuszcza POST */
  if (p.ops) {
    let n = 0;
    return odpowiedz(() => {
      sprawdzKlucz(p.klucz);
      const ops = JSON.parse(p.ops);
      zapiszOperacje(ops); n = ops.length;
      return wszystkieDane();
    }, () => ({ zapisano: n }));
  }
  return odpowiedz(() => {
    sprawdzKlucz(p.klucz);
    return wszystkieDane();
  });
}

/* ——— strona wysyła zmiany (POST): {klucz, ops:[{op:'set'|'update'|'delete', c:'kolekcja', id, d:{…}}]} ——— */
function doPost(e) {
  return odpowiedz(() => {
    const body = JSON.parse(e.postData.contents);
    sprawdzKlucz(body.klucz);
    if (body.akcja) return skrzynka(body.akcja, body);   /* skrzynka: wysłanie pliku (base64) albo tekstu */
    zapiszOperacje(body.ops || []);
    return wszystkieDane();               // w odpowiedzi aktualny stan — strona od razu go ma
  });
}

function odpowiedz(fn, dodatki) {
  let wynik;
  try { wynik = { ok: true, dane: fn() }; if (dodatki) Object.assign(wynik, dodatki()); }
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

/* ——— SKRZYNKA: pliki i teksty w folderze na Dysku Google ———
   opis pliku (description) = {"od":"nazwa urządzenia","tekst":true|false} */
function folderSkrzynki() {
  const it = DriveApp.getFoldersByName(SKRZYNKA_FOLDER);
  return it.hasNext() ? it.next() : DriveApp.createFolder(SKRZYNKA_FOLDER);
}
function plikZeSkrzynki(folder, id) {
  const x = DriveApp.getFileById(String(id));
  const rodzice = x.getParents();
  if (!rodzice.hasNext() || rodzice.next().getId() !== folder.getId()) throw new Error('Tego pliku nie ma w skrzynce.');
  return x;
}
function skrzynka(akcja, p) {
  if (akcja === 'wersja') return { wersja: WERSJA_SKRYPTU };
  if (String(akcja).indexOf('zdjeci') === 0) return zdjecia(akcja, p);   /* zdjęcia z Notatek — osobny, stały folder */
  const folder = folderSkrzynki();
  if (akcja === 'lista') {
    const wynik = [], granica = Date.now() - SKRZYNKA_DNI * 864e5, it = folder.getFiles();
    while (it.hasNext()) {
      const x = it.next();
      if (x.getDateCreated().getTime() < granica) { x.setTrashed(true); continue; }
      let m = {}; try { m = JSON.parse(x.getDescription() || '{}'); } catch (e) {}
      wynik.push({ id: x.getId(), nazwa: x.getName(), typ: x.getMimeType(), rozmiar: x.getSize(), kiedy: x.getDateCreated().getTime(),
        od: m.od || '', tekst: m.tekst ? x.getBlob().getDataAsString('UTF-8').slice(0, 20000) : null });
    }
    return wynik.sort((a, b) => b.kiedy - a.kiedy);
  }
  if (akcja === 'wyslij') {
    const tekst = p.tekst !== undefined && p.tekst !== null;
    const blob = tekst ? Utilities.newBlob(String(p.tekst), 'text/plain', 'Tekst.txt')
                       : Utilities.newBlob(Utilities.base64Decode(String(p.dane || '')), String(p.typ || 'application/octet-stream'), String(p.nazwa || 'plik').slice(0, 180));
    const x = folder.createFile(blob);
    x.setDescription(JSON.stringify({ od: String(p.od || '').slice(0, 40), tekst: tekst }));
    return { id: x.getId() };
  }
  if (akcja === 'pobierz') {
    const x = plikZeSkrzynki(folder, p.id), b = x.getBlob();
    return { nazwa: x.getName(), typ: x.getMimeType(), dane: Utilities.base64Encode(b.getBytes()) };
  }
  if (akcja === 'usun') { plikZeSkrzynki(folder, p.id).setTrashed(true); return {}; }
  if (akcja === 'wyczysc') { const it = folder.getFiles(); while (it.hasNext()) it.next().setTrashed(true); return {}; }
  throw new Error('Nieznana akcja skrzynki: ' + akcja);
}

/* ——— ZDJĘCIA Z NOTATEK: folder „Pracownia – Zdjęcia notatek” (bez automatycznego usuwania) ———
   zdjecie        (POST) zid, typ, dane(base64) → zapisuje plik o nazwie zid (drugi raz ten sam zid = bez zmian)
   zdjeciePobierz (GET)  zid → { typ, dane(base64) }
   zdjecieUsun    (POST) zid → do kosza (Dysk trzyma kosz 30 dni)
   zdjeciaLista   (GET)  → [{ zid, rozmiar, kiedy }] */
function folderZdjec() {
  const nazwa = 'Pracownia – Zdjęcia notatek', it = DriveApp.getFoldersByName(nazwa);
  return it.hasNext() ? it.next() : DriveApp.createFolder(nazwa);
}
function zdjecia(akcja, p) {
  if (akcja === 'zdjeciaLista') {   /* wszystkie zdjęcia w folderze: do sprzątania nieużywanych i kopii zapasowej */
    const wynik = [], it0 = folderZdjec().getFiles();
    while (it0.hasNext()) { const x = it0.next(); wynik.push({ zid: x.getName(), rozmiar: x.getSize(), kiedy: x.getDateCreated().getTime() }); }
    return wynik;
  }
  const zid = String(p.zid || '');
  if (!/^[\w-]{1,60}$/.test(zid)) throw new Error('Złe id zdjęcia');
  const folder = folderZdjec(), it = folder.getFilesByName(zid), plik = it.hasNext() ? it.next() : null;
  if (akcja === 'zdjecie') {
    if (plik) return { id: plik.getId() };
    const x = folder.createFile(Utilities.newBlob(Utilities.base64Decode(String(p.dane || '')), String(p.typ || 'image/jpeg'), zid));
    return { id: x.getId() };
  }
  if (akcja === 'zdjeciePobierz') {
    if (!plik) throw new Error('Nie ma takiego zdjęcia');
    return { typ: plik.getMimeType(), dane: Utilities.base64Encode(plik.getBlob().getBytes()) };
  }
  if (akcja === 'zdjecieUsun') { if (plik) plik.setTrashed(true); return {}; }
  throw new Error('Nieznana akcja zdjęć: ' + akcja);
}

/* ——— test: w edytorze wybierz „test” i kliknij Uruchom — w Dzienniku zobaczysz listę kart ——— */
function test() {
  Logger.log(Object.keys(wszystkieDane()));
  Logger.log('Skrzynka: ' + skrzynka('lista', {}).length + ' plików');   // przy okazji Google poprosi o dostęp do Dysku
}
