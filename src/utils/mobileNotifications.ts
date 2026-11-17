import { soundManager } from './audio';

export type AppNotificationPermission = NotificationPermission | 'unsupported';

const NOTIFICATION_PREF_KEY = 'mbk_app_notifications_enabled';

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
      }
      return result;
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

/**
 * Dispatches an OS/Mobile notification via active ServiceWorkerRegistration (required on Android/iOS PWAs)
 * with graceful desktop fallback to `new Notification(...)` and acoustic alert.
 */
export async function dispatchMobileAppNotification({
  title,
  body,
  tag = 'mbk-alert',
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

  const options: NotificationOptions & { vibrate?: number[]; renotify?: boolean } = {
    body,
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    tag,
    renotify: true,
    vibrate: [180, 80, 180],
    data: { url }
  };

  try {
    if ('serviceWorker' in navigator) {
      let registration = await navigator.serviceWorker.getRegistration();
      if (!registration) {
        registration = await Promise.race([
          navigator.serviceWorker.ready,
          new Promise<undefined>((resolve) => setTimeout(() => resolve(undefined), 800))
        ]);
      }
      if (registration && typeof registration.showNotification === 'function') {
        await registration.showNotification(title, options);
        return true;
      }
    }
  } catch (swErr) {
    console.warn('[Notifications] ServiceWorker showNotification fallback:', swErr);
  }

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
