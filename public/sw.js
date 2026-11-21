// Service worker SkingKong : jouable hors ligne, sans rester bloqué sur une vieille version.
// - la page (navigation) : réseau d'abord, cache en secours hors ligne ;
// - les fichiers du build (noms hachés, donc immuables) : cache d'abord ;
// - le reste du même domaine : cache, mis à jour en arrière-plan.
const CACHE = 'skingkong-v4';
const SHELL = ['./', './index.html', './manifest.webmanifest', './icon.svg'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)));
  self.skipWaiting();
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});

const put = (req, res) => { if (res && res.ok) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); } return res; };

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET' || !req.url.startsWith(self.location.origin)) return;
  // musique en flux (requêtes partielles) : laissée au navigateur, qui gère son propre cache
  if (req.headers.has('range') || req.url.includes('/music/')) return;
  const url = new URL(req.url);
  if (req.mode === 'navigate') {
    e.respondWith(fetch(req).then((res) => put('./index.html', res)).catch(() => caches.match('./index.html').then((hit) => hit || caches.match('./'))));
    return;
  }
  if (url.pathname.includes('/assets/')) {
    e.respondWith(caches.match(req).then((hit) => hit || fetch(req).then((res) => put(req, res))));
    return;
  }
  e.respondWith(caches.match(req).then((hit) => {
    const net = fetch(req).then((res) => put(req, res)).catch(() => hit);
    return hit || net;
  }));
});
