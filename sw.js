/**
 * Service Worker — Network First（所有資源）
 * 永遠先嘗試網路，失敗才用 cache（離線備援）
 */

const CACHE_NAME = 'destiny-v9';

// Install: 立即接管
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

// Activate: 清除所有舊 cache，立即控制所有頁面
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch: Network First（所有請求）
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  event.respondWith(
    fetch(event.request).then((response) => {
      // 成功取得網路回應 → 存入 cache 備用
      if (response.ok) {
        const clone = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
      }
      return response;
    }).catch(() => {
      // 網路失敗 → 嘗試 cache
      return caches.match(event.request);
    })
  );
});
