/**
 * Service Worker — 離線快取
 * 策略：Cache First（靜態資源），Network First（頁面）
 */

const CACHE_NAME = 'destiny-v5';

// 必要靜態資源（離線一定能用）
const PRECACHE = [
  './',
  './index.html',
  './css/style.css',
  './js/main.js',
  './js/ui.js',
  './js/share.js',
  './js/click-handlers.js',
  './js/engines/maya.js',
  './js/engines/astro.js',
  './js/engines/bazi.js',
  './js/engines/ziwei.js',
  './js/engines/human-design.js',
  './js/engines/synthesis.js',
  './js/engines/transit.js',
  './js/engines/meihua.js',
  './js/engines/company-compat.js',
  './js/engines/daily-energy.js',
  './js/engines/person-compat.js',
  './js/lib/ephemeris.js',
  './js/lib/planets.js',
  './js/lib/utils.js',
  './js/lib/solar-terms.js',
  './js/lib/lunar-calendar.js',
  './js/lib/geo-timezone.js',
  './js/data/cities.js',
  './js/data/astro-text.js',
  './js/data/hd-gates.js',
  './js/data/hd-channels.js',
  './js/data/hd-centers.js',
  './js/data/hd-channel-desc.js',
  './js/data/hd-text.js',
  './js/data/hd-crosses.js',
  './js/data/maya-text.js',
  './js/data/meihua-text.js',
];

// Install: 預快取所有靜態資源
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE);
    }).then(() => self.skipWaiting())
  );
});

// Activate: 清除舊版本 cache
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch: Cache First for static, Network First for navigation
self.addEventListener('fetch', (event) => {
  const { request } = event;

  // 只處理 GET
  if (request.method !== 'GET') return;

  // Navigation（HTML 頁面）：Network First
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).then((response) => {
        const clone = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(request, clone));
        return response;
      }).catch(() => caches.match(request))
    );
    return;
  }

  // 靜態資源：Cache First
  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request).then((response) => {
        // 只快取同源資源
        if (response.ok && request.url.startsWith(self.location.origin)) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(request, clone));
        }
        return response;
      });
    })
  );
});
