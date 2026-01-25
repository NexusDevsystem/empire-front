const CACHE_NAME = 'empire-erp-v2'; // Incremented version
const urlsToCache = [
    '/',
    '/index.html',
    '/assets/logo.png'
];

self.addEventListener('install', event => {
    self.skipWaiting(); // Force activation
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => cache.addAll(urlsToCache))
    );
});

self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    if (cacheName !== CACHE_NAME) {
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
});

self.addEventListener('fetch', event => {
    // Network First strategy
    event.respondWith(
        fetch(event.request).catch(() => {
            return caches.match(event.request);
        })
    );
});
