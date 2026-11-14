# Kontrakt danych — Arkusz „Strona internetowa - dane”

Ściągawka: **jakie dane leżą w Arkuszu Google i w jakim układzie**. Z tego korzystają strona
(GitHub Pages) i przyszła aplikacja na Androida. Zmieniasz układ zakładki → zaktualizuj ten plik.

---

## 1. Zasady wspólne

### Kto pisze, kto czyta

| Kto | Projekt Apps Script | Co robi |
|---|---|---|
| Strona | `apps-script/Kod.gs` (powiązany z Arkuszem) | czyta **i** zapisuje wszystkie zakładki z `id` w A1 |
| WoT Garaż | osobny projekt „WoT Garaż” (`Garaz.gs`, `WgLogin.gs`) | zapisuje zakładki `Garaż*` i `WoT_Encyklopedia` |

### Układ zakładki czytanej przez stronę („kolekcja”)

- Nazwa zakładki = nazwa kolekcji (np. `todo`, `Garaż`).
- **Wiersz 1** — nagłówki. **A1 = `id`** (inaczej strona zakładkę pomija), **B1 = `_zmieniono`**.
- Każdy kolejny wiersz = jeden wpis: **A** = id, **B** = data ostatniej zmiany, **C…** = pola wpisu (nazwa pola = nagłówek).
- Puste komórki są pomijane (pole nie istnieje w odpowiedzi).
- Komórka zaczynająca się od `json:` → lista/obiekt (`json:{"a":1}`); `Kod.gs` zamienia ją na obiekt.
- Daty w komórkach (typ data) wracają jako tekst `yyyy-MM-dd`.

### Jak pobrać dane (np. z aplikacji)

```
GET  <adres /exec projektu strony>?klucz=<KLUCZ>
→ {"ok":true, "dane": { "<kolekcja>": [ {"id":"…", "data":{ "<pole>": wartość, … }}, … ], … }}
```

Zapis: `POST` (body `text/plain`) `{"klucz":"…","ops":[{"op":"set|update|delete","c":"<kolekcja>","id":"…","d":{…}}]}`.
Nazwy kolekcji do zapisu: tylko `[A-Za-z0-9_-]` — zakładek `Garaż*` (z „ż”) nie da się zapisać przez `Kod.gs`, i dobrze: są **tylko do odczytu**.

---

## 2. World of Tanks → Garaż (automatycznie z Wargaming API)

Zapisuje projekt **„WoT Garaż”**: codziennie ~5:00 (wyzwalacz) i po kliknięciu „Odśwież”.
Każde odświeżenie **nadpisuje całą zakładkę** — poza ręcznymi cenami (zachowywane po `id`).
Przy błędzie (brak sieci, limit API, zły token) zakładka zostaje bez zmian, a błąd trafia do `Garaż_status`.

### 2.1 `Garaż` — czołgi w garażu (czytana przez stronę, A1 = `id`)

Jeden wiersz = jeden czołg. Sortowanie: tier malejąco, potem nazwa.

| Kolumna (pole) | Typ | Opis |
|---|---|---|
| `id` | liczba | `tank_id` z Wargaming |
| `_zmieniono` | data | czas zapisu |
| `Nazwa` | tekst | nazwa po polsku (encyklopedia, `language=pl`) |
| `Nacja` | tekst | po polsku: `Niemcy`, `ZSRR`, `USA`, `Chiny`, `Francja`, `Wielka Brytania`, `Japonia`, `Czechosłowacja`, `Szwecja`, `Polska`, `Włochy`, `Międzynarodowe` |
| `Typ` | tekst | `Lekki`, `Średni`, `Ciężki`, `Niszczyciel czołgów`, `Artyleria` |
| `Tier` | liczba | 1–11 |
| `W garażu` | tekst | `TAK` (z API, z tokenem) · `TAK (ręcznie)` (dopisany w `Garaż_dodatki`) · `brak tokenu` (bez logowania — lista zawiera też sprzedane) |
| `Cena zakupu (kr)` | liczba | `price_credit`; 0 = premium / nagroda / obligacje |
| `Cena zakupu (złoto)` | liczba | `price_gold` |
| `Szac. sprzedaż (kr)` | liczba / puste | 50% ceny zakupu; puste, gdy nie da się oszacować |
| `Sprzedaż ręcznie (kr)` | liczba / puste | cena ręczna: ze strony (`wotGarazCeny`) albo wpisana w Arkuszu; przeżywa odświeżanie |
| `Wartość do sumy (kr)` | liczba | ręczna cena, jeśli jest; inaczej szacunek; inaczej 0 |
| `Status wyceny` | tekst | `Szacunek 50%` · `Ręcznie` · `Premium/prezent – weryfikuj w grze` · `Brak ceny (nagroda/event) – weryfikuj w grze` · `Brak w encyklopedii – weryfikuj w grze` · `Ręczna cena nie jest liczbą – popraw` |
| `Bitwy` | liczba | `all.battles` (0 dla dopisanych) |
| `Wygrane %` | liczba / puste | np. `51.5` |
| `Mistrzostwo` | liczba | 0 brak · 1 III klasa · 2 II klasa · 3 I klasa · 4 As |
| `Nacja (kod)` | tekst | kod Wargaming: `germany`, `ussr`, `usa`, … |
| `Typ (kod)` | tekst | `lightTank`, `mediumTank`, `heavyTank`, `AT-SPG`, `SPG` |
| `Ikona` | tekst | URL małej ikony (https) |
| `Aktualizacja` | tekst | `yyyy-MM-dd HH:mm` |

**„Do weryfikacji”** = `Status wyceny` zawiera `weryfikuj` lub `popraw`.
**Suma garażu** = suma `Wartość do sumy (kr)`.

### 2.2 `Garaż_status` — stan modułu (czytana przez stronę, A1 = `id`)

Jeden wiersz, `id` = `stan`.

| Pole | Typ | Opis |
|---|---|---|
| `Aktualizacja` | tekst | ostatnie **udane** odświeżenie, `yyyy-MM-dd HH:mm` |
| `Token` | tekst | `OK` · `brak tokenu` · `zaloguj ponownie` |
| `Token wygasa` | tekst | `yyyy-MM-dd HH:mm` (token przedłuża się sam co ~tydzień) |
| `Ostatnia próba` | tekst | ostatnia próba odświeżenia (także nieudana) |
| `Ostatni błąd` | tekst / puste | komunikat ostatniego błędu |
| `Liczba czołgów` | liczba | |
| `Suma sprzedaży (kr)` | liczba | |
| `Do weryfikacji` | liczba | |
| `Na tier` | json | `json:{"1":11,"2":40,…,"11":14}` |
| `Encyklopedia` | tekst | data pobrania encyklopedii |
| `Dopisane ręcznie` | liczba | ile czołgów z `Garaż_dodatki` |

### 2.3 `wotGarazCeny` — ceny sprzedaży wpisane na stronie (zapisuje strona, A1 = `id`)

Strona zapisuje tu cenę po wpisaniu jej w kolumnie „Sprzedaż” (zwykłą drogą: `cloud` → `Kod.gs`).
Projekt „WoT Garaż” przy odświeżeniu przepisuje te ceny do `Garaż` → `Sprzedaż ręcznie (kr)`.
**Cena ze strony ma pierwszeństwo** przed wpisem w kolumnie K w Arkuszu.

| Pole | Typ | Opis |
|---|---|---|
| `id` | tekst | `tank_id` |
| `cena` | liczba / brak | cena sprzedaży w kredytach; **wiersz bez ceny = cenę usunięto** (powrót do szacunku) |

### 2.4 `Garaż_dodatki` — czołgi bez rozegranej bitwy (NIE czytana przez stronę)

Wargaming API nie zwraca czołgów, którymi nie rozegrano ani jednej bitwy — te dopisuje się tutaj.
A1 to celowo **nie** `id`.

| Kolumna | Kto wypełnia | Opis |
|---|---|---|
| `Nazwa czołgu (wpisz)` | Ty | nazwa jak w grze (wielkość liter, spacje, znaki i ogonki bez znaczenia) |
| `tank_id (opcjonalnie)` | Ty | gdy nazwa pasuje do kilku czołgów |
| `Wynik (skrypt)` | skrypt | `✔ dodano` · `✔ jest już z API` · `✖ nie znaleziono` · `✖ pasuje kilka: …` · `⚠ API: nie ma w garażu` · `✖ duplikat` |
| `Dopasowany czołg (skrypt)` | skrypt | nazwa, tier, tank_id |

### 2.5 `WoT_Encyklopedia` — cache encyklopedii (NIE czytana przez stronę)

A1 = `tank_id`. ~1000 pojazdów, odświeżana w środy i gdy w garażu pojawi się nieznany czołg.
Kolumny: `tank_id`, `Nazwa`, `Nazwa krótka`, `Nacja (kod)`, `Typ (kod)`, `Tier`, `Cena kredyty`, `Cena złoto`, `Premium`, `Prezent`, `Ikona`.

### 2.6 Web app „WoT Garaż” (inny adres niż Arkusz strony)

| Wywołanie | Wynik |
|---|---|
| `<adres>/exec?akcja=odswiez` | JSON `{ok, powod?, dane:{ok, czolgi:[…], podsumowanie, aktualizacja, token, blad}}`; blokada 5 min |
| `<adres>/exec?akcja=dane` | JSON jak `dane` wyżej, bez odświeżania |
| `<adres>/exec?akcja=zaloguj` | logowanie Wargaming (otwierać w przeglądarce) |
| `<adres>/exec` | prosta strona statusu |

Adres zapisany w kolekcji `cfg`, dokument `wotGarazUrl`, pole `u`.

### 2.7 `Garaż_konto` — zasoby konta (czytana przez stronę, A1 = `id`)

Jeden wiersz, `id` = `konto`. Zapisuje projekt „WoT Garaż” co godzinę i przy każdym odświeżeniu garażu (wymaga tokenu).

| Pole | Typ | Opis |
|---|---|---|
| `Kredyty` | liczba | `private.credits` |
| `Złoto` | liczba | `private.gold` |
| `Wolne XP` | liczba | `private.free_xp` |
| `Obligacje` | liczba | `private.bonds` |
| `Premium do` | tekst | `private.premium_expires_at` — **tylko stary typ premium**; obecnego „WoT Premium” API nie podaje |
| `Premium` | tekst | `TAK` / `NIE` (wg API) |
| `Aktualizacja` | tekst | `yyyy-MM-dd HH:mm` |

Koniec obecnego konta premium wpisuje się ręcznie na stronie: kolekcja `cfg`, dokument `wotPremium`, pole `d` = `RRRR-MM-DD` (ma pierwszeństwo przed API).

---

## 3. Pozostałe kolekcje (do opisania)

Kolekcje używane przez stronę, jeszcze bez opisu pól — uzupełniać przy pracy nad danym modułem:

- **World of Tanks:** `garaz` (czołgi z przepustki/obligacji w garażu: `g`, `n`), `mag`, `exp`, `oblig`, `wotZakupy`, `wotCele`, `wotGarazCeny` (opis wyżej), `wotGaraz` (stara ręczna lista — nieużywana od v67)
- **Studia:** `todo`, `todoListy`, `notatki`, `notatkiCfg`, `dyski`, `mieszanki`, `mieszankiMoje`
- **Prywatne:** `treningi`, `plany`, `posiadowki`, `subskrypcje`, `bukKonta`, `bukOps`, `bukCfg`, `finOps`, `finStale`, `finCfg`, `cv`
- **Ustawienia:** `cfg` (dokumenty m.in. `zetony`, `bastion`, `uklad`, `szybkie`, `kopia`, `cwiczenia`, `wotFxp`, `wotGarazUrl`, `wotPremium`)
