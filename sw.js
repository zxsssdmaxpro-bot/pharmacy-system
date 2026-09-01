/**
 * Service Worker: يخزّن ملفات التطبيق الثابتة مؤقتاً (App Shell)
 * ليعمل الموقع دون اتصال بالإنترنت. بيانات المخزون نفسها تُخزَّن
 * منفصلة عبر IndexedDB (راجع js/db.js).
 */
const CACHE_NAME = 'pharmacy-app-v1';
const APP_SHELL = [
  './',
  './index.html',
  './manifest.json',
  './css/style.css',
  './js/config.js',
  './js/db.js',
  './js/api.js',
  './js/auth.js',
  './js/scanner.js',
  './js/router.js',
  './js/app.js',
  './js/pages/common.js',
  './js/pages/dashboard.js',
  './js/pages/medicines.js',
  './js/pages/stockIn.js',
  './js/pages/stockOut.js',
  './js/pages/inventory.js',
  './js/pages/inventoryCount.js',
  './js/pages/suppliers.js',
  './js/pages/reports.js',
  './js/pages/activityLog.js',
  './js/pages/users.js',
  './js/pages/settings.js',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)).catch(() => {})
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

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // لا نتدخل أبداً في طلبات API الخاصة بـ Google Apps Script - يجب أن تصل مباشرة أو تفشل بوضوح
  if (url.hostname.includes('script.google.com')) return;

  // شبكة أولاً للملفات نفسها، مع الرجوع للكاش عند الفشل (يضمن تحديثات فورية عند توفر الإنترنت)
  event.respondWith(
    fetch(event.request)
      .then((res) => {
        const resClone = res.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, resClone));
        return res;
      })
      .catch(() => caches.match(event.request).then((cached) => cached || caches.match('./index.html')))
  );
});
