# Pracownia — prywatna strona Eryka

Strona do codziennego użytku: studia (To-Do, notatki, kalkulatory, dyski), gry (World of Tanks, Farming Simulator 25) i sprawy prywatne (siłownia, posiadówki, subskrypcje, pieniądze).
Czysty HTML + CSS + JavaScript — bez instalowania czegokolwiek i bez „budowania”.

## Jak uruchomić

- **Na komputerze:** otwórz `index.html` dwuklikiem w przeglądarce.
- **Na GitHub Pages (jeden link):**
  1. Wrzuć zawartość tego folderu do repozytorium (tak, żeby `index.html` był w głównym katalogu).
  2. W repozytorium: **Settings → Pages → Build and deployment → Source: Deploy from a branch**, gałąź `main`, folder `/ (root)` → **Save**.
  3. Po minucie strona będzie pod adresem `https://<twoja-nazwa>.github.io/<nazwa-repozytorium>/`.

## Gdzie co jest

```
index.html                  szkielet: nagłówek z menu + miejsce na treść, lista plików css/js
css/
  01-zmienne-i-podstawy.css KOLORY, czcionki, zaokrąglenia — zmieniasz wygląd całej strony tutaj
  02-naglowek-i-menu.css    pasek u góry, listy rozwijane
  03-uklad-strony.css       nagłówki, sekcje, kafle, tabele, zakładki (wspólne dla wszystkich stron)
  04-world-of-tanks.css     MOE, obligacje, garaż, expienie
  05-cv.css                 strona CV
  06-silownia.css           plany treningowe, wykres wagi, zakupy, dziennik treningów (okienko)
  07-todo.css               To-Do
  08-notatki.css            Notatki: 3 kolumny na komputerze, lista/notatka na telefonie, pasek nad klawiaturą
  09-telefon.css            wygląd na wąskich ekranach (telefon)
  10-kalkulatory.css        Kalkulatory + Wyniki Pawła / Wyniki moje
  11-posiadowki.css         Posiadówki
  12-dyski.css              Dyski
  13-strona-glowna-i-pasek.css  strona główna (kafle, widżety) i dolny pasek
  15-subskrypcje.css        Subskrypcje
  17-pieniadze.css          Pieniądze → okienko Zakłady (bukmacherka)
  18-finanse.css            Pieniądze → okienko Finanse
  20-skrzynka.css           Skrzynka: ikonka w nagłówku i panel przesyłania
  14-wyglad.css             styl „krem + ceramika” — ładuje się ostatni i nadpisuje resztę
js/
  00-ustawienia.js          adres i hasło Arkusza Google (zapis danych na GitHub Pages)
  01-dane.js                dane startowe z arkusza Prywatne.xlsx
  02-narzedzia.js           wspólne funkcje (formatowanie liczb, zapis w przeglądarce…)
  03-strona-glowna-i-cv.js  strona główna (ostatnio odwiedzane + widżety) i CV
  04-world-of-tanks.js      wszystkie zakładki WoT + Farming Simulator
  05-todo.js                To-Do
  06-notatki.js             Notatki: edytor jak w telefonie (formatowanie, checklisty, tabele), foldery, kolory, tagi, archiwum, kosz
  07-silownia.js            Siłownia: plany, dziennik treningów, waga, zakupy
  08-posiadowki.js          Posiadówki (rozliczanie domówek)
  09-kalkulatory.js         Kalkulatory, Wyniki Pawła, Wyniki moje
  10-dyski.js               Dyski
  11-pasek-dolny.js         dolny pasek: zrzuty ekranu, pogoda, data i godzina
  12-synchronizacja.js      synchronizacja z chmurą (działa tylko na claude.ai)
  13-router.js              lista podstron, przełączanie stron, motyw, menu
  15-subskrypcje.js         Subskrypcje: koszty, odnowienia, ile wydano — treść okienka w Pieniądzach (ładuje się przed routerem)
  16-pieniadze.js           Pieniądze: karty paneli + okienko Zakłady (bukmacherka) (wpłaty, wypłaty, bilans w czasie)
  19-skrzynka.js            Skrzynka (ikonka w rogu): pliki i tekst telefon ↔ komputer przez Dysk Google
  18-cv.js                  CV: podgląd, edycja całego CV, eksport do PDF (dane kontaktowe tylko w Arkuszu)
  17-finanse.js             Finanse: konto główne + oszczędnościowe, wydatki/wpływy, stałe wpływy i opłaty, średnie, wlicza Zakłady i Subskrypcje
  14-szkice-formularzy.js   niezapisany tekst w formularzach przeżywa odświeżenie (localStorage) — ładuje się ostatni
kalkulatory/
  masa.html                 kalkulator MASA Web (Studia → Kalkulatory → Liczenie MMA), otwierany w okienku;
                            zmieniony tylko wygląd — kod obliczeń jak w oryginale

apps-script/
  Kod.gs                    kod do wklejenia w Arkusz Google → Rozszerzenia → Apps Script
```

Każdy plik ma na górze opis, co zawiera i jak go zmieniać.

## Najczęstsze zmiany

- **Kolor akcentu / tła:** `css/01-zmienne-i-podstawy.css` → zmienne `--accent`, `--bg`, `--mark` itd.
- **Nowa podstrona:** opis krok po kroku na górze `js/13-router.js` (link w `index.html`, wpis w `ROUTES`, funkcja `pNazwa()`).
- **Nowa pozycja w menu:** `index.html`, sekcja `<nav>`.
- **Domyślne dane (np. plan treningowy na start):** `js/01-dane.js`.

## Ważne: gdzie zapisują się dane

- **Na claude.ai** — we wspólnej bazie claude.ai (automatycznie).
- **Na GitHub Pages** — w Twoim **Arkuszu Google** przez Google Apps Script (`apps-script/Kod.gs`),
  jeśli w `js/00-ustawienia.js` wpiszesz adres Web App i hasło. Bez tego — tylko w przeglądarce (localStorage).

Jak działa zapis do Arkusza (`js/12-synchronizacja.js`):
- każda zmiana trafia do kolejki w przeglądarce i w ciągu ~1 s leci w tle do Arkusza,
- bez internetu zmiany czekają w kolejce i wysyłają się same, gdy sieć wróci,
- co 30 s i po powrocie do karty strona pobiera dane z Arkusza (zmiany z telefonu widać na laptopie),
- w Arkuszu każda kolekcja to osobna karta (waga, todo, exp, notatki…); można je przeglądać i poprawiać ręcznie,
- jedna komórka mieści max 50 000 znaków — bardzo długie notatki warto dzielić.
