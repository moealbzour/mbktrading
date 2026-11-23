import { soundManager } from './audio';

export type AppNotificationPermission = NotificationPermission | 'unsupported';

const NOTIFICATION_PREF_KEY = 'mbk_app_notifications_enabled';

let cachedSwRegistration: ServiceWorkerRegistration | null = null;
let webLockHeld = false;
let silentKeepAliveCtx: AudioContext | null = null;
let bgHeartbeatInterval: ReturnType<typeof setInterval> | null = null;
let currentSyncedUser: { uid: string; isAdmin: boolean } = { uid: '', isAdmin: false };

/**
 * Holds a Web Lock + silent low-power Web Audio node + Service Worker heartbeat when backgrounded
 * so Android and iOS PWAs stay alive in the background without freezing real-time alerts,
 * using ZERO extra Firestore reads.
 */
function ensureMobileBackgroundKeepAlive(): void {
  if (typeof window === 'undefined') return;

  // 1. Web Locks API (prevents mobile browser tab/PWA discarding while backgrounded)
  if (!webLockHeld && 'locks' in navigator && navigator.locks && typeof navigator.locks.request === 'function') {
    webLockHeld = true;
    navigator.locks
      .request('mbk-realtime-background-alerts', { mode: 'shared' }, () => {
        return new Promise<void>(() => {
          // Hold lock for the lifetime of the session
        });
      })
      .catch(() => {
        webLockHeld = false;
      });
  }

  // 2. Service Worker Background Heartbeat (keeps SW thread awake when tab is hidden)
  if (!bgHeartbeatInterval) {
    bgHeartbeatInterval = setInterval(() => {
      if (!isAppNotificationsEnabled()) return;
      try {
        if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
          navigator.serviceWorker.controller.postMessage({
            type: 'CLIENT_BACKGROUND_HEARTBEAT',
            hidden: typeof document !== 'undefined' ? document.visibilityState === 'hidden' : false,
            ts: Date.now()
          });
        }
      } catch {
        // ignore
      }
    }, 12000);
  }
}

function startSilentAudioKeepAliveOnGesture(): void {
  if (typeof window === 'undefined' || silentKeepAliveCtx) return;
  if (!isAppNotificationsEnabled()) return;
  try {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    // Completely inaudible sub-threshold gain (0.00001) keeps mobile OS audio session alive in background
    gain.gain.value = 0.00001;
    osc.frequency.value = 1;
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    silentKeepAliveCtx = ctx;
  } catch {
    // ignore
  }
}

if (typeof window !== 'undefined') {
  const unlockKeepAlive = () => {
    if (getNotificationPermissionState() === 'granted' && isAppNotificationsEnabled()) {
      startSilentAudioKeepAliveOnGesture();
      ensureMobileBackgroundKeepAlive();
    }
  };
  window.addEventListener('pointerdown', unlockKeepAlive, { passive: true });
  window.addEventListener('touchstart', unlockKeepAlive, { passive: true });
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden' && isAppNotificationsEnabled()) {
      ensureMobileBackgroundKeepAlive();
      if (silentKeepAliveCtx && silentKeepAliveCtx.state === 'suspended') {
        silentKeepAliveCtx.resume().catch(() => {});
      }
      if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({
          type: 'CLIENT_BACKGROUND_HEARTBEAT',
          hidden: true,
          ts: Date.now()
        });
      }
    }
  });
}

/**
 * Pre-warms and caches the Service Worker registration + registers Periodic Background Sync
 * so notifications fire with zero lookup latency even when the app is in the background or closed.
 */
export async function ensureBackgroundNotificationWorkerReady(): Promise<ServiceWorkerRegistration | null> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return null;
  }
  ensureMobileBackgroundKeepAlive();
  try {
    if (!cachedSwRegistration) {
      cachedSwRegistration = (await navigator.serviceWorker.getRegistration()) || null;
    }
    if (!cachedSwRegistration) {
      cachedSwRegistration =
        (await Promise.race([
          navigator.serviceWorker.ready,
          new Promise<null>((resolve) => setTimeout(() => resolve(null), 1200))
        ])) || null;
    }

    if (cachedSwRegistration) {
      const regAny = cachedSwRegistration as any;
      if (regAny.periodicSync && typeof regAny.periodicSync.register === 'function') {
        regAny.periodicSync
          .register('mbk-bg-notifications', {
            minInterval: 60 * 1000
          })
          .catch(() => {});
      }
      if (regAny.sync && typeof regAny.sync.register === 'function') {
        regAny.sync.register('mbk-sync-notifications').catch(() => {});
      }
    }

    return cachedSwRegistration;
  } catch {
    return cachedSwRegistration;
  }
}

/**
 * Syncs the logged-in user's UID and Admin status to the Service Worker's persistent Cache storage
 * so the Service Worker can filter and push personal DMs, @mbktrading inbox messages, and trade alerts
 * even when the app is closed.
 */
export function syncNotificationWorkerUserContext(uid: string, isAdmin: boolean): void {
  currentSyncedUser = { uid: uid || '', isAdmin: Boolean(isAdmin) };
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;
  const payload = {
    type: 'SYNC_USER_CONTEXT',
    uid: currentSyncedUser.uid,
    isAdmin: currentSyncedUser.isAdmin,
    enabled: isAppNotificationsEnabled(),
    lastPulseMs: Date.now()
  };

  try {
    if (navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage(payload);
    }
    navigator.serviceWorker.ready
      .then((reg) => {
        if (reg && reg.active) {
          reg.active.postMessage(payload);
        }
      })
      .catch(() => {});
  } catch {
    // ignore
  }
}

/**
 * Publishes an event to the server's zero-quota in-memory notification pulse ring buffer (/api/notifications/pulse)
 * so closed/backgrounded Service Workers across other devices receive the alert with 0 Firestore reads.
 */
export function emitBackgroundNotificationPulse(params: {
  title: string;
  body: string;
  tag?: string;
  url?: string;
  targetUid?: string | null;
  excludeUid?: string | null;
  timestampMs?: number;
}): void {
  if (typeof window === 'undefined') return;
  const payload = JSON.stringify({
    title: params.title,
    body: params.body,
    tag: params.tag || `mbk-pulse-${Date.now()}`,
    url: params.url || '/',
    targetUid: params.targetUid || null,
    excludeUid: params.excludeUid || currentSyncedUser.uid || null,
    timestampMs: params.timestampMs || Date.now()
  });

  try {
    fetch('/api/notifications/pulse', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: payload,
      keepalive: true
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data && Array.isArray(data.onlineUids)) {
          updateLocalOnlineUids(data.onlineUids);
        }
      })
      .catch(() => {});
  } catch {
    // ignore
  }
}

// ================= ZERO-QUOTA IN-MEMORY ONLINE PRESENCE REGISTRY =================
let cachedOnlineUidsSet = new Set<string>(['mbktrading']);
const presenceListeners = new Set<(onlineSet: Set<string>) => void>();
let presenceIntervalId: number | null = null;

function updateLocalOnlineUids(list: string[]) {
  const next = new Set<string>(['mbktrading']);
  if (currentSyncedUser.uid) {
    next.add(currentSyncedUser.uid);
  }
  for (const id of list) {
    if (typeof id === 'string' && id.trim()) {
      next.add(id.trim());
    }
  }
  cachedOnlineUidsSet = next;
  presenceListeners.forEach((cb) => {
    try {
      cb(new Set(cachedOnlineUidsSet));
    } catch {
      // ignore
    }
  });
}

async function pingServerPresenceOnce() {
  if (typeof window === 'undefined') return;
  try {
    const uid = currentSyncedUser.uid || '';
    const isAdminFlag = currentSyncedUser.isAdmin ? '1' : '0';
    const res = await fetch(
      `/api/notifications/pulse?since=${Date.now()}&uid=${encodeURIComponent(uid)}&isAdmin=${isAdminFlag}`,
      {
        method: 'GET',
        headers: { Accept: 'application/json' },
        cache: 'no-store'
      }
    );
    if (res.ok) {
      const data = await res.json();
      if (data && Array.isArray(data.onlineUids)) {
        updateLocalOnlineUids(data.onlineUids);
      }
    }
  } catch {
    // ignore
  }
}

/**
 * Subscribe to the zero-quota in-memory online presence set (0 Firestore reads/writes).
 */
export function subscribeToOnlinePresence(
  myUid: string | null | undefined,
  onUpdate: (onlineUids: Set<string>) => void
): () => void {
  if (myUid && myUid.trim()) {
    currentSyncedUser.uid = myUid.trim();
    cachedOnlineUidsSet.add(myUid.trim());
  }
  presenceListeners.add(onUpdate);
  onUpdate(new Set(cachedOnlineUidsSet));

  if (typeof window !== 'undefined') {
    pingServerPresenceOnce();
    if (!presenceIntervalId) {
      presenceIntervalId = window.setInterval(() => {
        if (typeof document === 'undefined' || document.visibilityState === 'visible') {
          pingServerPresenceOnce();
        }
      }, 35000);
    }
  }

  return () => {
    presenceListeners.delete(onUpdate);
    if (presenceListeners.size === 0 && presenceIntervalId && typeof window !== 'undefined') {
      window.clearInterval(presenceIntervalId);
      presenceIntervalId = null;
    }
  };
}

/**
 * Determines whether a user is currently Online with 0 Firestore reads:
 * - True if in the server RAM onlineUids set
 * - True if it's the current user or official @mbktrading desk
 * - True if their last message/activity in the current stream was within 8 minutes
 */
export function isUserCurrentlyOnline(params: {
  uid?: string | null;
  myUid?: string | null;
  lastActivityMs?: number | null;
  onlineUids?: Set<string>;
  role?: string | null;
}): boolean {
  const cleanUid = String(params.uid || '').trim();
  if (cleanUid === 'mbktrading') return true;
  if (cleanUid && params.myUid && cleanUid === params.myUid) return true;
  const setToCheck = params.onlineUids || cachedOnlineUidsSet;
  if (cleanUid && setToCheck.has(cleanUid)) return true;
  if (params.lastActivityMs && params.lastActivityMs > 0) {
    if (Date.now() - params.lastActivityMs <= 8 * 60 * 1000) {
      return true;
    }
  }
  return false;
}

// Pre-warm immediately when module loads in browser
if (typeof window !== 'undefined') {
  ensureBackgroundNotificationWorkerReady().catch(() => {});
}

export function getNotificationPermissionState(): AppNotificationPermission {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'unsupported';
  }
  return Notification.permission;
}

export function isAppNotificationsEnabled(): boolean {
  try {
    const saved = localStorage.getItem(NOTIFICATION_PREF_KEY);
    return saved !== 'false';
  } catch {
    return true;
  }
}

export function setAppNotificationsEnabled(enabled: boolean): void {
  try {
    localStorage.setItem(NOTIFICATION_PREF_KEY, String(enabled));
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('mbk-notif-pref-changed', { detail: { enabled } }));
    }
    syncNotificationWorkerUserContext(currentSyncedUser.uid, currentSyncedUser.isAdmin);
    if (enabled) {
      startSilentAudioKeepAliveOnGesture();
      ensureBackgroundNotificationWorkerReady().catch(() => {});
    }
  } catch {
    // ignore
  }
}

export async function requestAppNotificationPermission(): Promise<AppNotificationPermission> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'unsupported';
  }
  try {
    if (Notification.permission === 'default') {
      const result = await Notification.requestPermission();
      if (result === 'granted') {
        setAppNotificationsEnabled(true);
        startSilentAudioKeepAliveOnGesture();
        ensureBackgroundNotificationWorkerReady().catch(() => {});
      }
      return result;
    }
    if (Notification.permission === 'granted') {
      startSilentAudioKeepAliveOnGesture();
      ensureBackgroundNotificationWorkerReady().catch(() => {});
    }
    return Notification.permission;
  } catch (err) {
    console.warn('[Notifications] requestPermission notice:', err);
    return Notification.permission;
  }
}

export interface MobileNotificationPayload {
  title: string;
  body: string;
  tag?: string;
  url?: string;
  playSound?: boolean;
}

// Deduplicate identical tags within 3 seconds so dual SW controller + registration paths never double-fire
const recentNotificationTags = new Map<string, number>();

/**
 * Dispatches an OS/Mobile notification with ZERO delay via pre-warmed ServiceWorker controller/registration
 * (required on Android/iOS PWAs and backgrounded tabs) with instant desktop fallback.
 */
export async function dispatchMobileAppNotification({
  title,
  body,
  tag = `mbk-alert-${Date.now()}`,
  url = '/',
  playSound = false
}: MobileNotificationPayload): Promise<boolean> {
  if (playSound) {
    try {
      soundManager.playSignalPing();
    } catch {
      // ignore
    }
  }

  if (typeof window === 'undefined' || !('Notification' in window)) {
    return false;
  }
  if (Notification.permission !== 'granted' || !isAppNotificationsEnabled()) {
    return false;
  }

  const nowMs = Date.now();
  const prevMs = recentNotificationTags.get(tag) || 0;
  if (nowMs - prevMs < 3000) {
    return true;
  }
  recentNotificationTags.set(tag, nowMs);

  // Sync tag to Service Worker so its background pulse poller knows this client already displayed it
  try {
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({
        type: 'SHOW_NOTIFICATION',
        title,
        body,
        tag,
        url
      });
      return true;
    }
  } catch {
    // fallback below
  }

  const options: NotificationOptions & { vibrate?: number[]; renotify?: boolean; timestamp?: number } = {
    body,
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    tag,
    renotify: true,
    vibrate: [200, 100, 200],
    timestamp: nowMs,
    data: { url }
  };

  // Fast Path: If cached ServiceWorkerRegistration is already ready in memory, fire immediately (0ms wait)
  try {
    if (cachedSwRegistration && typeof cachedSwRegistration.showNotification === 'function') {
      await cachedSwRegistration.showNotification(title, options);
      return true;
    }
  } catch {
    // fallback below
  }

  // Resolve registration and show notification
  try {
    const registration = await ensureBackgroundNotificationWorkerReady();
    if (registration && typeof registration.showNotification === 'function') {
      await registration.showNotification(title, options);
      return true;
    }
  } catch (swErr) {
    console.warn('[Notifications] ServiceWorker showNotification fallback:', swErr);
  }

  // Direct Notification constructor fallback
  try {
    const notif = new Notification(title, {
      body,
      icon: '/icon-192.png',
      tag
    });
    notif.onclick = () => {
      try {
        window.focus();
        notif.close();
      } catch {
        // ignore
      }
    };
    return true;
  } catch (err) {
    console.warn('[Notifications] Fallback Notification error:', err);
    return false;
  }
}
