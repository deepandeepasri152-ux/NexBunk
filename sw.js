// NexBunk service worker — minimal app-shell cache so the app can reload
// while offline. All real data lives in IndexedDB (untouched by this file);
// this only caches the static HTML shell itself.
//
// IMPORTANT — why the old version went stale:
// Browsers only detect a "new" service worker by byte-comparing this file.
// If you deploy a new index.html but never touch sw.js, the browser sees
// the exact same file and never re-runs install — so the offline cache
// stays frozen at whatever index.html was cached the very first time this
// was installed, potentially many versions behind. Network-first still
// shows the latest version whenever you're online; only the OFFLINE
// fallback was going stale.
//
// Fix: every time a navigation successfully fetches over the network, we
// now also refresh the cached copy with that response (see the fetch
// handler below). So even if you never touch this file again, the offline
// fallback will always be "whatever version was last successfully loaded
// online" instead of "whatever version existed on install day."
//
// Still bump CACHE_NAME when you deploy a big change, if you want to force
// an immediate, clean cutover (it clears old cache entries on activate) —
// but it's no longer required for the app to eventually catch up.
const CACHE_NAME = 'nexbunk-shell-v2';
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
// version when online) — and on every successful fetch, refresh the cached
// offline copy too, so the fallback self-heals instead of staying frozen
// at install-time content.
self.addEventListener('fetch', (event) => {
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(SHELL_URL, copy)).catch(() => {});
          return response;
        })
        .catch(() => caches.match(SHELL_URL).then((r) => r || caches.match('./')))
    );
  }
});

// Lets the page force an already-open installed app to activate a waiting
// service worker immediately, instead of needing a full close-and-reopen.
// Optional to use — see notes below.
self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
});
