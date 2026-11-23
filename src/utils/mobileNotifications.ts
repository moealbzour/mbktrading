import { soundManager } from './audio';

export type AppNotificationPermission = NotificationPermission | 'unsupported';

const NOTIFICATION_PREF_KEY = 'mbk_app_notifications_enabled';

let cachedSwRegistration: ServiceWorkerRegistration | null = null;

/**
 * Pre-warms and caches the Service Worker registration + registers Periodic Background Sync
 * so notifications fire with zero lookup latency even when the app is in the background.
 */
export async function ensureBackgroundNotificationWorkerReady(): Promise<ServiceWorkerRegistration | null> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return null;
  }
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
    if (enabled) {
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
        ensureBackgroundNotificationWorkerReady().catch(() => {});
      }
      return result;
    }
    if (Notification.permission === 'granted') {
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

// Deduplicate identical tags within 2.5 seconds so dual SW controller + registration paths never double-fire
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
  if (nowMs - prevMs < 2500) {
    return true;
  }
  recentNotificationTags.set(tag, nowMs);

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

  // Fast Path 1: If cached ServiceWorkerRegistration is already ready in memory, fire immediately (0ms wait)
  try {
    if (cachedSwRegistration && typeof cachedSwRegistration.showNotification === 'function') {
      await cachedSwRegistration.showNotification(title, options);
      return true;
    }
  } catch {
    // fallback to controller or fresh lookup below
  }

  // Fast Path 2: Post directly to active ServiceWorker controller thread (runs even when tab is backgrounded)
  try {
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({
        type: 'SHOW_NOTIFICATION',
        title,
        body,
        tag,
        url
      });
      ensureBackgroundNotificationWorkerReady().catch(() => {});
      return true;
    }
  } catch {
    // fallback below
  }

  // Path 3: Resolve registration and show notification
  try {
    const registration = await ensureBackgroundNotificationWorkerReady();
    if (registration && typeof registration.showNotification === 'function') {
      await registration.showNotification(title, options);
      return true;
    }
  } catch (swErr) {
    console.warn('[Notifications] ServiceWorker showNotification fallback:', swErr);
  }

  // Path 4: Direct Notification constructor fallback
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
