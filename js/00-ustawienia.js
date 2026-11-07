/* ════════════════════════════════════════════════════════════════════════
   USTAWIENIA — połączenie z Arkuszem Google (zapis danych na GitHub Pages)
   ════════════════════════════════════════════════════════════════════════
   1. Wklej poniżej adres Web App z Google Apps Script (kończy się na /exec).
   2. Wpisz to samo hasło, które ustawiłeś w Kod.gs jako KLUCZ.
   Puste pola = dane zapisują się tylko w tej przeglądarce (jak dotąd).

   Prywatniej (repozytorium na GitHubie jest publiczne, więc każdy może
   podejrzeć ten plik): zostaw pola puste i raz na każdym urządzeniu otwórz
   stronę z adresem:
     https://TWOJA-NAZWA.github.io/REPO/?arkusz=ADRES_WEB_APP&klucz=HASLO
   Strona zapamięta to w przeglądarce i od razu usunie z paska adresu.
   (?arkusz=off — zapomina połączenie na tym urządzeniu)

   W wersji na claude.ai te ustawienia są ignorowane — tam działa baza claude.ai.
   ════════════════════════════════════════════════════════════════════════ */
const ARKUSZ_URL   = '';   // np. 'https://script.google.com/macros/s/AKfy..../exec'
const ARKUSZ_KLUCZ = '';   // np. 'moje-tajne-haslo-123'
