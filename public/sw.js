const CACHE_NAME = 'mbk-trading-v9';
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

// Handle Web Push API payloads when app is closed or in background
self.addEventListener('push', (event) => {
  let payload = {
    title: 'MBK Trading 🔔',
    body: 'تحديث جديد في منصة MBK Trading',
    tag: 'mbk-push-' + Date.now(),
    url: '/'
  };

  if (event.data) {
    try {
      const parsed = event.data.json();
      payload = {
        title: parsed.title || payload.title,
        body: parsed.body || parsed.message || payload.body,
        tag: parsed.tag || payload.tag,
        url: parsed.url || '/'
      };
    } catch {
      try {
        payload.body = event.data.text() || payload.body;
      } catch {
        // ignore
      }
    }
  }

  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body: payload.body,
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      tag: payload.tag,
      renotify: true,
      requireInteraction: false,
      vibrate: [200, 100, 200],
      data: { url: payload.url || '/' }
    })
  );
});

// Wake up any backgrounded client windows on periodic sync or background sync to flush real-time alerts
async function notifyClientsToSync() {
  try {
    const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const client of clients) {
      client.postMessage({ type: 'MBK_BACKGROUND_SYNC_WAKE' });
    }
  } catch {
    // ignore
  }
}

self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'mbk-bg-notifications') {
    event.waitUntil(notifyClientsToSync());
  }
});

self.addEventListener('sync', (event) => {
  if (event.tag === 'mbk-sync-notifications') {
    event.waitUntil(notifyClientsToSync());
  }
});

// Handle OS/Mobile PWA notification clicks: focus open window or launch app
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

// Handle instant SHOW_NOTIFICATION & SET_BADGE messages from client tabs
self.addEventListener('message', (event) => {
  const data = event.data;
  if (!data) return;

  if (data.type === 'SKIP_WAITING') {
    self.skipWaiting();
    return;
  }

  if (data.type === 'SHOW_NOTIFICATION' && data.title) {
    const options = {
      body: data.body || '',
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      tag: data.tag || 'mbk-alert-' + Date.now(),
      renotify: true,
      requireInteraction: false,
      vibrate: [200, 100, 200],
      timestamp: Date.now(),
      data: { url: data.url || '/' }
    };
    event.waitUntil(self.registration.showNotification(data.title, options).catch(() => {}));
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
