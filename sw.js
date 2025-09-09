self.addEventListener('install', (e) => {
  e.waitUntil(caches.open('city-wallet-v4').then(cache => cache.addAll(['./html/index.html','./css/styles.css','./js/app.js','./assets/img/hero-zuerich.jpg'])));
});
self.addEventListener('fetch', (event) => {event.respondWith(caches.match(event.request).then(resp => resp || fetch(event.request)))});