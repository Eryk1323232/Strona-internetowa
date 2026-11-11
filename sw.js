/* ════════════════════════════════════════════════════════════════════════
   SERVICE WORKER — strona jako aplikacja (PWA)
   ════════════════════════════════════════════════════════════════════════
   • Online: każdy plik strony jest pobierany NA ŚWIEŻO z GitHub Pages (sprawdzenie, czy się zmienił),
     więc nowe wersje widać od razu — nie trzeba już podbijać ?v= w index.html.
   • Offline: strona działa z kopii zapisanej przy poprzedniej wizycie. Dane wpisane offline czekają
     w kolejce (js/12-synchronizacja.js) i trafiają do Arkusza po powrocie internetu.
   • Czcionki Google: z pamięci (zmieniają się rzadko). Arkusz (script.google.com) — zawsze z sieci.
   Zmiana CACHE czyści stare kopie (rzadko potrzebne).
   ════════════════════════════════════════════════════════════════════════ */
const CACHE = 'pracownia-1';

self.addEventListener('install', e => {
  e.waitUntil((async () => {
    const c = await caches.open(CACHE);
    const base = ['./', './index.html', './manifest.webmanifest', './img/ikona-192.png', './img/logo-192.png', './img/logo-jasne-192.png', './img/favicon-64.png'];
    try {   /* wszystkie pliki css/js wymienione w index.html — żeby offline działało od pierwszej wizyty */
      const html = await (await fetch('./index.html', {cache: 'no-cache'})).text();
      const pliki = [...html.matchAll(/(?:href|src)="((?:css|js)\/[^"]+)"/g)].map(m => './' + m[1]);
      await c.addAll([...new Set([...base, ...pliki])]);
    } catch (err) { await c.addAll(base).catch(() => {}); }
    self.skipWaiting();
  })());
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const r = e.request; if (r.method !== 'GET') return;
  const u = new URL(r.url);
  if (u.origin === location.origin) {
    e.respondWith((async () => {
      try {
        const res = await fetch(new Request(r.url, {cache: 'no-cache', credentials: 'same-origin'}));
        if (res.ok) { const cp = res.clone(); caches.open(CACHE).then(c => c.put(r.url.split('#')[0], cp)); }
        return res;
      } catch (err) {
        const m = await caches.match(r.url.split('#')[0]) || await caches.match(r, {ignoreSearch: true});
        if (m) return m;
        if (r.mode === 'navigate') return (await caches.match('./index.html')) || (await caches.match('./'));
        return Response.error();
      }
    })());
    return;
  }
  if (/(^|\.)fonts\.(googleapis|gstatic)\.com$/.test(u.hostname)) {
    e.respondWith(caches.match(r).then(m => m || fetch(r).then(res => { const cp = res.clone(); caches.open(CACHE).then(c => c.put(r, cp)); return res; })));
  }
});
