const CACHE_NAME = 'mbk-trading-v13';
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
const GENERIC_PUSH_TAGS = new Set([
  'mbk',
  'mbk-push',
  'mbk-alert',
  'mbk-chat',
  'mbk-signal',
  'mbk-dm',
  'bot-alert',
  'default',
  'notification'
]);

self.addEventListener('push', (event) => {
  let title = 'MBK Trading 🔔';
  let body = 'تحديث جديد في منصة MBK Trading';
  let category = 'mbk';
  let rawTag = '';
  let url = '/';

  if (event.data) {
    try {
      const parsed = event.data.json();
      if (parsed && typeof parsed === 'object') {
        title = String(parsed.title || title).trim() || title;
        body = String(parsed.body || parsed.message || body).trim() || body;
        category = String(parsed.category || category).trim().toLowerCase() || 'mbk';
        rawTag = typeof parsed.tag === 'string' ? parsed.tag.trim() : '';
        url = String(parsed.url || '/').trim() || '/';
      }
    } catch {
      try {
        const plain = event.data.text();
        if (plain && plain.trim()) {
          body = plain.trim();
        }
      } catch {
        // ignore parse errors and show default alert
      }
    }
  }

  const isGenericTag = !rawTag || GENERIC_PUSH_TAGS.has(rawTag.toLowerCase());
  const tag = isGenericTag
    ? `${category}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
    : rawTag;

  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      tag,
      renotify: true,
      vibrate: [200, 100, 200],
      data: { url: url || '/', category }
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
