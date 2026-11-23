const CACHE_NAME = 'mbk-trading-v11';
const PRECACHE_URLS = ['/favicon.svg', '/manifest.json', '/icon-192.png', '/mbk-logo.png'];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS).catch(() => {}))
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.map((key) => {
            if (key !== CACHE_NAME) {
              return caches.delete(key);
            }
          })
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const url = event.request.url;

  // Never intercept non-GET, API routes, Vite module scripts, or external Firebase/Google APIs
  if (
    event.request.method !== 'GET' ||
    url.includes('/api/') ||
    url.includes('/src/') ||
    url.includes('/@') ||
    url.includes('/node_modules/') ||
    url.includes('hot-update') ||
    url.includes('googleapis.com') ||
    url.includes('firebase')
  ) {
    return;
  }

  // Standard network-first fetch with cache fallback
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response && response.status === 200 && response.type === 'basic') {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
        }
        return response;
      })
      .catch(() => caches.match(event.request).then((cached) => cached || caches.match('/')))
  );
});

// Handle real closed-app Web Push API (VAPID) payloads
self.addEventListener('push', (event) => {
  let title = 'MBK Trading 🔔';
  let body = 'تحديث جديد في منصة MBK Trading';
  let tag = 'mbk-push-' + Date.now();
  let url = '/';

  if (event.data) {
    try {
      const parsed = event.data.json();
      if (parsed && typeof parsed === 'object') {
        title = parsed.title || title;
        body = parsed.body || parsed.message || body;
        tag = parsed.tag || tag;
        url = parsed.url || '/';
      }
    } catch {
      try {
        body = event.data.text() || body;
      } catch {
        // ignore
      }
    }
  }

  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      tag,
      renotify: true,
      vibrate: [200, 100, 200],
      data: { url: url || '/' }
    })
  );
});

// Handle OS/Mobile PWA notification clicks: focus an existing window or open target URL
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  if (self.navigator && 'clearAppBadge' in self.navigator) {
    self.navigator.clearAppBadge().catch(() => {});
  }
  const targetUrl = (event.notification.data && event.notification.data.url) || '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) {
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});

// Handle foreground SHOW_NOTIFICATION, SET_BADGE, and SKIP_WAITING messages
self.addEventListener('message', (event) => {
  const data = event.data;
  if (!data) return;

  if (data.type === 'SKIP_WAITING') {
    self.skipWaiting();
    return;
  }

  if (data.type === 'SHOW_NOTIFICATION' && data.title) {
    const tag = data.tag || 'mbk-alert-' + Date.now();
    const nowMs = Date.now();
    event.waitUntil(
      self.registration
        .showNotification(data.title, {
          body: data.body || '',
          icon: '/icon-192.png',
          badge: '/icon-192.png',
          tag,
          renotify: true,
          vibrate: [200, 100, 200],
          timestamp: nowMs,
          data: { url: data.url || '/' }
        })
        .catch(() => {})
    );
    return;
  }

  if (data.type === 'SET_BADGE') {
    const count = Number(data.count || 0);
    if (self.navigator && 'setAppBadge' in self.navigator) {
      if (count > 0) {
        self.navigator.setAppBadge(count).catch(() => {});
      } else if ('clearAppBadge' in self.navigator) {
        self.navigator.clearAppBadge().catch(() => {});
      }
    }
  }
});
