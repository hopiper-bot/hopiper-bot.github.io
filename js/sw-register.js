// Service Worker 註冊（強制更新，避免無限 reload）— 各頁共用
(function () {
  if (!('serviceWorker' in navigator)) return;

  var refreshing = false;
  navigator.serviceWorker.addEventListener('controllerchange', function () {
    if (!refreshing) { refreshing = true; location.reload(); }
  });

  navigator.serviceWorker.register('./sw.js').then(function (reg) {
    if (reg.waiting) { reg.waiting.postMessage({ type: 'SKIP_WAITING' }); }
    reg.addEventListener('updatefound', function () {
      var newSW = reg.installing;
      if (!newSW) return;
      newSW.addEventListener('statechange', function () {
        if (newSW.state === 'installed' && navigator.serviceWorker.controller) {
          newSW.postMessage({ type: 'SKIP_WAITING' });
        }
      });
    });
  }).catch(function () {});
})();
