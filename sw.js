/*
   Darkroom Studio — Service Worker
   Offline-first: shell cached, photos loaded network-first with fallback.
*/

const CACHE_SHELL = 'darkroom-shell-v2';
const CACHE_PHOTOS = 'darkroom-photos-v2';
const CACHE_FONTS = 'darkroom-fonts-v1';
const MAX_PHOTO_CACHE = 60; // Keep latest 60 photos cached

// ── Install: precache the app shell ──
const SHELL_FILES = [
  '/',
  '/index.html',
  '/admin.html',
  '/css/style.css',
  '/js/gallery.js',
  '/js/main.js',
  '/js/room.js',
  '/manifest.json',
  '/robots.txt',
  '/icons/icon-192.png',
  '/icons/icon-512.png'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_SHELL).then(cache => cache.addAll(SHELL_FILES).catch(() => {}))
  );
  self.skipWaiting();
});

// ── Activate: clean old caches ──
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.filter(k => k.startsWith('darkroom-') && k !== CACHE_SHELL && k !== CACHE_PHOTOS && k !== CACHE_FONTS)
          .map(k => caches.delete(k))
    ))
  );
  self.clients.claim();
});

// ── Fetch: smart routing ──
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  const { pathname } = url;

  // Google Fonts — cache-first
  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    event.respondWith(
      caches.open(CACHE_FONTS).then(cache =>
        cache.match(event.request).then(cached =>
          cached || fetch(event.request).then(response => {
            if (response.ok) cache.put(event.request, response.clone());
            return response;
          })
        )
      )
    );
    return;
  }

  // Photos — network-first, cache fallback
  if (pathname.startsWith('/photos/')) {
    event.respondWith(
      fetch(event.request).then(response => {
        if (response.ok) {
          const cloned = response.clone();
          caches.open(CACHE_PHOTOS).then(cache => {
            cache.put(event.request, cloned);
            // Trim cache to MAX_PHOTO_CACHE
            cache.keys().then(keys => {
              if (keys.length > MAX_PHOTO_CACHE) {
                keys.slice(0, keys.length - MAX_PHOTO_CACHE).forEach(k => cache.delete(k));
              }
            });
          });
        }
        return response;
      }).catch(() => caches.match(event.request))
    );
    return;
  }

  // Everything else — stale-while-revalidate
  event.respondWith(
    caches.match(event.request).then(cached => {
      const fetchPromise = fetch(event.request).then(response => {
        if (response.ok && response.type === 'basic') {
          caches.open(CACHE_SHELL).then(cache => cache.put(event.request, response.clone()));
        }
        return response;
      }).catch(() => cached);
      return cached || fetchPromise;
    })
  );
});
