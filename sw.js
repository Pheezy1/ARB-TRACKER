const CACHE_NAME = 'arb-calc-v2';
const ASSETS_TO_CACHE = [
    'index.html',
    'styles.css',
    'index.js',
    'manifest.json',
    'icon-192.png',
    'icon-512.png'
];

// Installation Cycle: Open cache instance and stream structural baseline assets
self.addEventListener('install', (e) => {
    e.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('PWA Offline Cache Layer Prepped Successfully.');
                return cache.addAll(ASSETS_TO_CACHE);
            })
            .then(() => self.skipWaiting())
    );
});

// Activation Cycle: Clean up and clear out obsolete workspace caches
self.addEventListener('activate', (e) => {
    e.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cache) => {
                    if (cache !== CACHE_NAME) {
                        console.log('Purging legacy asset footprint:', cache);
                        return caches.delete(cache);
                    }
                })
            );
        }).then(() => self.clients.claim())
    );
});

// Intercept Engine: Serve files instantly from the device cache even if network connection drops
self.addEventListener('fetch', (e) => {
    e.respondWith(
        caches.match(e.request)
            .then((cachedResponse) => {
                if (cachedResponse) {
                    return cachedResponse;
                }
                return fetch(e.request);
            })
    );
});
