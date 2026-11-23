const CACHE_NAME = 'mbk-trading-v10';
const STATE_CACHE_NAME = 'mbk-sw-bg-state-v1';
const STATE_CACHE_KEY = '/__mbk_sw_user_state__';
const PRECACHE_URLS = ['/favicon.svg', '/manifest.json', '/icon-192.png', '/mbk-logo.png'];

let swUserState = {
  uid: '',
  isAdmin: false,
  enabled: true,
  lastPulseMs: Date.now(),
  seenTags: []
};
let swStateLoaded = false;
let bgPollTimer = null;
let isCheckingPulse = false;

async function loadSwState() {
  if (swStateLoaded) return swUserState;
  try {
    const cache = await caches.open(STATE_CACHE_NAME);
    const resp = await cache.match(STATE_CACHE_KEY);
    if (resp) {
      const parsed = await resp.json();
      if (parsed && typeof parsed === 'object') {
        swUserState = {
          uid: String(parsed.uid || ''),
          isAdmin: Boolean(parsed.isAdmin),
          enabled: parsed.enabled !== false,
          lastPulseMs: Number(parsed.lastPulseMs) > 0 ? Number(parsed.lastPulseMs) : Date.now() - 60000,
          seenTags: Array.isArray(parsed.seenTags) ? parsed.seenTags.slice(-80) : []
        };
      }
    }
  } catch {
    // ignore cache read errors
  }
  swStateLoaded = true;
  return swUserState;
}

async function saveSwState() {
  try {
    const cache = await caches.open(STATE_CACHE_NAME);
    const body = JSON.stringify({
      ...swUserState,
      seenTags: (swUserState.seenTags || []).slice(-80)
    });
    await cache.put(
      STATE_CACHE_KEY,
      new Response(body, {
        headers: { 'Content-Type': 'application/json' }
      })
    );
  } catch {
    // ignore cache write errors
  }
}

function hasSeenTag(tag) {
  if (!tag) return false;
  return Array.isArray(swUserState.seenTags) && swUserState.seenTags.includes(tag);
}

function recordSeenTag(tag, timestampMs) {
  if (!tag) return;
  if (!Array.isArray(swUserState.seenTags)) {
    swUserState.seenTags = [];
  }
  if (!swUserState.seenTags.includes(tag)) {
    swUserState.seenTags.push(tag);
    if (swUserState.seenTags.length > 80) {
      swUserState.seenTags = swUserState.seenTags.slice(-80);
    }
  }
  if (timestampMs && Number(timestampMs) > swUserState.lastPulseMs) {
    swUserState.lastPulseMs = Number(timestampMs);
  }
}

/**
 * Polls the lightweight in-memory server pulse endpoint (/api/notifications/pulse)
 * which uses ZERO Firestore reads, and pushes OS notifications even when all app tabs are closed or hidden.
 */
async function checkBackgroundServerPulse() {
  if (isCheckingPulse) return;
  isCheckingPulse = true;
  try {
    await loadSwState();
    if (!swUserState.enabled) return;

    const since = Math.max(0, (swUserState.lastPulseMs || Date.now()) - 2000);
    const uid = encodeURIComponent(swUserState.uid || '');
    const isAdmin = swUserState.isAdmin ? '1' : '0';
    const url = `/api/notifications/pulse?since=${since}&uid=${uid}&isAdmin=${isAdmin}`;

    const response = await fetch(url, {
      method: 'GET',
      cache: 'no-store',
      headers: { Accept: 'application/json' }
    });
    if (!response.ok) return;

    const data = await response.json();
    if (!data || !Array.isArray(data.events) || data.events.length === 0) {
      return;
    }

    let stateChanged = false;
    for (const ev of data.events) {
      if (!ev || !ev.title) continue;
      const tag = ev.tag || `mbk-pulse-${ev.id || ev.timestampMs}`;
      if (hasSeenTag(tag)) {
        if (ev.timestampMs > swUserState.lastPulseMs) {
          swUserState.lastPulseMs = ev.timestampMs;
          stateChanged = true;
        }
        continue;
      }

      recordSeenTag(tag, ev.timestampMs);
      stateChanged = true;

      await self.registration
        .showNotification(ev.title, {
          body: ev.body || '',
          icon: '/icon-192.png',
          badge: '/icon-192.png',
          tag,
          renotify: true,
          requireInteraction: false,
          vibrate: [200, 100, 200],
          timestamp: ev.timestampMs || Date.now(),
          data: { url: ev.url || '/' }
        })
        .catch(() => {});
    }

    if (stateChanged) {
      await saveSwState();
    }
  } catch {
    // ignore transient offline errors
  } finally {
    isCheckingPulse = false;
  }
}

function ensureSwBackgroundWatchLoop() {
  if (bgPollTimer) return;
  bgPollTimer = setInterval(() => {
    checkBackgroundServerPulse().catch(() => {});
  }, 10000);
}

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
            if (key !== CACHE_NAME && key !== STATE_CACHE_NAME) {
              return caches.delete(key);
            }
          })
        )
      )
      .then(() => self.clients.claim())
      .then(() => {
        ensureSwBackgroundWatchLoop();
        return checkBackgroundServerPulse();
      })
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

  recordSeenTag(payload.tag, Date.now());
  event.waitUntil(
    Promise.all([
      saveSwState(),
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
    ])
  );
});

// Wake up any backgrounded client windows AND check zero-quota server pulse directly in SW
async function notifyClientsAndPollPulse() {
  await checkBackgroundServerPulse();
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
    ensureSwBackgroundWatchLoop();
    event.waitUntil(notifyClientsAndPollPulse());
  }
});

self.addEventListener('sync', (event) => {
  if (event.tag === 'mbk-sync-notifications') {
    ensureSwBackgroundWatchLoop();
    event.waitUntil(notifyClientsAndPollPulse());
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

// Handle instant SHOW_NOTIFICATION, SYNC_USER_CONTEXT, CLIENT_BACKGROUND_HEARTBEAT & SET_BADGE messages
self.addEventListener('message', (event) => {
  const data = event.data;
  if (!data) return;

  if (data.type === 'SKIP_WAITING') {
    self.skipWaiting();
    return;
  }

  if (data.type === 'SYNC_USER_CONTEXT') {
    ensureSwBackgroundWatchLoop();
    event.waitUntil(
      loadSwState().then(() => {
        if (typeof data.uid === 'string') swUserState.uid = data.uid;
        if (typeof data.isAdmin === 'boolean') swUserState.isAdmin = data.isAdmin;
        if (typeof data.enabled === 'boolean') swUserState.enabled = data.enabled;
        if (Number(data.lastPulseMs) > swUserState.lastPulseMs) {
          swUserState.lastPulseMs = Number(data.lastPulseMs);
        }
        return saveSwState();
      })
    );
    return;
  }

  if (data.type === 'CLIENT_BACKGROUND_HEARTBEAT') {
    ensureSwBackgroundWatchLoop();
    event.waitUntil(
      checkBackgroundServerPulse().then(() => {
        if (event.source && typeof event.source.postMessage === 'function') {
          event.source.postMessage({ type: 'SW_HEARTBEAT_ACK', ts: Date.now() });
        }
      })
    );
    return;
  }

  if (data.type === 'SHOW_NOTIFICATION' && data.title) {
    const tag = data.tag || 'mbk-alert-' + Date.now();
    const nowMs = Date.now();
    event.waitUntil(
      loadSwState().then(async () => {
        if (hasSeenTag(tag)) return;
        recordSeenTag(tag, nowMs);
        await saveSwState();
        const options = {
          body: data.body || '',
          icon: '/icon-192.png',
          badge: '/icon-192.png',
          tag,
          renotify: true,
          requireInteraction: false,
          vibrate: [200, 100, 200],
          timestamp: nowMs,
          data: { url: data.url || '/' }
        };
        await self.registration.showNotification(data.title, options).catch(() => {});
      })
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
