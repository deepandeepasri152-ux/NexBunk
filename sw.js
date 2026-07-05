// NexBunk service worker — minimal app-shell cache so the app can reload
// while offline. All real data lives in IndexedDB (untouched by this file);
// this only caches the static HTML shell itself.
//
// Bump CACHE_NAME whenever you deploy a new version of the HTML file, or
// returning users will keep seeing the old cached shell until it expires.
const CACHE_NAME = 'nexbunk-shell-v1';
const SHELL_URL = './index.html'; // update if your deployed filename differs

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(['./', SHELL_URL]))
      .catch(() => {}) // don't fail install if the shell URL doesn't match — offline just won't work yet
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Network-first for navigations (so you always get the latest deployed
// version when online), falling back to the cached shell when offline.
self.addEventListener('fetch', (event) => {
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(() => caches.match(SHELL_URL).then((r) => r || caches.match('./')))
    );
  }
});
