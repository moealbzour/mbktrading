import { soundManager } from './audio';
import { auth } from '../lib/firebase';

export type AppNotificationPermission = NotificationPermission | 'unsupported';
export type WebPushAudience = 'targetUid' | 'admins' | 'vip' | 'all';
export type WebPushCategory = 'chat' | 'dm' | 'signal' | 'announcement' | 'analysis' | 'bot';

export interface WebPushSubscribeResult {
  ok: boolean;
  subscribed: boolean;
  deviceCount?: number;
  storageMode?: string;
  error?: string;
}

const NOTIFICATION_PREF_KEY = 'mbk_app_notifications_enabled';
const CHAT_PUSH_MUTE_KEY = 'mbk_chat_push_muted';
const RECENT_ACTIVITY_WINDOW_MS = 10 * 60 * 1000; // 10 minutes
const CLIENT_CHAT_PUSH_COOLDOWN_MS = 20_000; // 20 seconds client-side guard for high-frequency chat

let cachedSwRegistration: ServiceWorkerRegistration | null = null;
let lastWebPushSyncMeta: { isVip?: boolean; isAdmin?: boolean; canAccessInbox?: boolean } = {};
let lastClientChatPushAtMs = 0;

function cleanClientVapidKey(raw?: string): string {
  return String(raw || '')
    .replace(/[\r\n\s"']+/g, '')
    .trim();
}

/**
 * Converts a URL-safe base64 VAPID public key string into a Uint8Array
 * suitable for PushManager.subscribe({ applicationServerKey }).
 */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const clean = cleanClientVapidKey(base64String);
  const padding = '='.repeat((4 - (clean.length % 4)) % 4);
  const base64 = (clean + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

function uint8ArraysEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

/**
 * Resolves and caches the active Service Worker registration (no polling, no keep-alive loops).
 */
export async function ensureBackgroundNotificationWorkerReady(): Promise<ServiceWorkerRegistration | null> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return null;
  }
  try {
    if (!cachedSwRegistration) {
      cachedSwRegistration = (await navigator.serviceWorker.getRegistration('/sw.js')) || (await navigator.serviceWorker.getRegistration()) || null;
    }
    if (!cachedSwRegistration) {
      try {
        cachedSwRegistration = await navigator.serviceWorker.register('/sw.js', { updateViaCache: 'none' });
      } catch {
        // ignore if unsupported in current preview origin
      }
    }
    const readyReg = await Promise.race([
      navigator.serviceWorker.ready,
      new Promise<null>((resolve) => setTimeout(() => resolve(null), 4000))
    ]);
    if (readyReg) {
      cachedSwRegistration = readyReg;
    }
    return cachedSwRegistration;
  } catch {
    return cachedSwRegistration;
  }
}

/**
 * Registers or syncs the browser's native Web Push (VAPID) subscription to POST /api/push/subscribe.
 * Safely skips without throwing if VITE_VAPID_PUBLIC_KEY is not configured or permission is not granted.
 */
export async function registerWebPushSubscription(
  idToken: string,
  meta?: { isVip?: boolean; isAdmin?: boolean; canAccessInbox?: boolean }
): Promise<WebPushSubscribeResult> {
  if (meta) {
    lastWebPushSyncMeta = {
      isVip: Boolean(meta.isVip),
      isAdmin: Boolean(meta.isAdmin),
      canAccessInbox: Boolean(meta.canAccessInbox ?? meta.isAdmin)
    };
  }

  if (typeof window === 'undefined' || !idToken) {
    return { ok: false, subscribed: false, error: 'Missing browser context or Firebase ID token' };
  }
  if (!('Notification' in window)) {
    return { ok: false, subscribed: false, error: 'Notifications API is not supported in this browser' };
  }
  if (Notification.permission !== 'granted') {
    return {
      ok: false,
      subscribed: false,
      error: `Notification permission is "${Notification.permission}" (must be "granted")`
    };
  }
  if (!isAppNotificationsEnabled()) {
    return { ok: false, subscribed: false, error: 'App notifications are muted in settings' };
  }
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    return {
      ok: false,
      subscribed: false,
      error: 'PushManager or ServiceWorker is not available (on iOS, install to Home Screen first)'
    };
  }

  const vapidPublicKey = cleanClientVapidKey(import.meta.env?.VITE_VAPID_PUBLIC_KEY);
  if (!vapidPublicKey || vapidPublicKey.length < 20) {
    return {
      ok: false,
      subscribed: false,
      error: 'VITE_VAPID_PUBLIC_KEY is empty or missing in frontend environment variables'
    };
  }

  try {
    const registration = await ensureBackgroundNotificationWorkerReady();
    if (!registration || !registration.pushManager) {
      return { ok: false, subscribed: false, error: 'Active Service Worker registration with PushManager not ready' };
    }

    const expectedKeyBytes = urlBase64ToUint8Array(vapidPublicKey);
    let subscription = await registration.pushManager.getSubscription();

    // If an old subscription exists with a different VAPID key, unsubscribe and re-subscribe cleanly
    if (subscription && subscription.options?.applicationServerKey) {
      const existingKeyBytes = new Uint8Array(subscription.options.applicationServerKey);
      if (!uint8ArraysEqual(existingKeyBytes, expectedKeyBytes)) {
        await subscription.unsubscribe().catch(() => {});
        subscription = null;
      }
    }

    if (!subscription) {
      try {
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: expectedKeyBytes as BufferSource
        });
      } catch (subErr: any) {
        // Handle InvalidStateError caused by an existing mismatched subscription
        const staleSub = await registration.pushManager.getSubscription().catch(() => null);
        if (staleSub) {
          await staleSub.unsubscribe().catch(() => {});
          subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: expectedKeyBytes as BufferSource
          });
        } else {
          throw subErr;
        }
      }
    }

    const subJson = subscription.toJSON();
    if (!subJson?.endpoint || !subJson?.keys?.p256dh || !subJson?.keys?.auth) {
      return { ok: false, subscribed: false, error: 'Browser returned incomplete PushSubscription keys' };
    }

    const res = await fetch('/api/push/subscribe', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${idToken}`
      },
      body: JSON.stringify({
        subscription: subJson,
        isVip: Boolean(meta?.isVip ?? lastWebPushSyncMeta.isVip),
        isAdmin: Boolean(meta?.isAdmin ?? lastWebPushSyncMeta.isAdmin),
        canAccessInbox: Boolean(
          meta?.canAccessInbox ??
            lastWebPushSyncMeta.canAccessInbox ??
            meta?.isAdmin ??
            lastWebPushSyncMeta.isAdmin
        ),
        muteChatPush: isChatPushMuted()
      })
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data?.ok) {
      return {
        ok: false,
        subscribed: false,
        error: data?.error || `Subscribe endpoint failed (HTTP ${res.status})`
      };
    }

    return {
      ok: true,
      subscribed: true,
      deviceCount: Number(data.deviceCount || 1),
      storageMode: data.storageMode
    };
  } catch (err: any) {
    return {
      ok: false,
      subscribed: false,
      error: err?.message || 'Web Push subscription failed'
    };
  }
}

/**
 * Convenience helper to automatically subscribe the currently signed-in Firebase user.
 */
export async function syncCurrentUserWebPush(meta?: {
  isVip?: boolean;
  isAdmin?: boolean;
  canAccessInbox?: boolean;
}): Promise<WebPushSubscribeResult> {
  if (meta) {
    lastWebPushSyncMeta = {
      isVip: Boolean(meta.isVip),
      isAdmin: Boolean(meta.isAdmin),
      canAccessInbox: Boolean(meta.canAccessInbox ?? meta.isAdmin)
    };
  }
  try {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      return { ok: false, subscribed: false, error: 'No signed-in Firebase user' };
    }
    const idToken = await currentUser.getIdToken();
    return await registerWebPushSubscription(idToken, lastWebPushSyncMeta);
  } catch (err: any) {
    return { ok: false, subscribed: false, error: err?.message || 'Failed to get Firebase ID token' };
  }
}

/**
 * Fire-and-forget real Web Push dispatch via POST /api/push/send (non-blocking, never delays UI).
 */
export function triggerServerWebPush(params: {
  title: string;
  body: string;
  url?: string;
  tag?: string;
  audience: WebPushAudience;
  category?: WebPushCategory;
  targetUid?: string | null;
  excludeUid?: string | null;
}): void {
  if (typeof window === 'undefined') return;
  const currentUser = auth.currentUser;
  if (!currentUser) return;

  // Lightweight client-side cooldown for high-frequency Public Chat messages so rapid chat
  // bursts do not burn push quota needed for VIP/Bot trade signals.
  if (params.category === 'chat') {
    const nowMs = Date.now();
    if (nowMs - lastClientChatPushAtMs < CLIENT_CHAT_PUSH_COOLDOWN_MS) {
      return;
    }
    lastClientChatPushAtMs = nowMs;
  }

  currentUser
    .getIdToken()
    .then((idToken) => {
      if (!idToken) return;
      return fetch('/api/push/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${idToken}`
        },
        keepalive: true,
        body: JSON.stringify({
          title: params.title,
          body: params.body,
          url: params.url || '/',
          tag: params.tag || `mbk-push-${Date.now()}`,
          audience: params.audience,
          ...(params.category ? { category: params.category } : {}),
          targetUid: params.targetUid || null,
          excludeUid: params.excludeUid !== undefined ? params.excludeUid : currentUser.uid
        })
      });
    })
    .catch(() => {
      // Non-blocking fire-and-forget
    });
}

/**
 * Pure in-memory "Active Recently" presence check (0 Firestore reads, 0 server HTTP polling):
 * - True if official @mbktrading desk or the current signed-in user
 * - True if their last message timestamp already loaded in state was within the last 10 minutes
 */
export function isUserCurrentlyOnline(params: {
  uid?: string | null;
  myUid?: string | null;
  lastActivityMs?: number | null;
  role?: string | null;
}): boolean {
  const cleanUid = String(params.uid || '').trim();
  if (cleanUid === 'mbktrading') return true;
  if (cleanUid && params.myUid && cleanUid === params.myUid) return true;
  if (params.lastActivityMs && params.lastActivityMs > 0) {
    if (Date.now() - params.lastActivityMs <= RECENT_ACTIVITY_WINDOW_MS) {
      return true;
    }
  }
  return false;
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

export function isChatPushMuted(): boolean {
  try {
    return localStorage.getItem(CHAT_PUSH_MUTE_KEY) === 'true';
  } catch {
    return false;
  }
}

export function setChatPushMuted(muted: boolean): void {
  try {
    localStorage.setItem(CHAT_PUSH_MUTE_KEY, String(Boolean(muted)));
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('mbk-chat-push-mute-changed', { detail: { muted: Boolean(muted) } }));
    }
    syncCurrentUserWebPush().catch(() => {});
  } catch {
    // ignore
  }
}

export function setAppNotificationsEnabled(enabled: boolean): void {
  try {
    localStorage.setItem(NOTIFICATION_PREF_KEY, String(enabled));
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('mbk-notif-pref-changed', { detail: { enabled } }));
    }
    if (enabled) {
      syncCurrentUserWebPush().catch(() => {});
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
        syncCurrentUserWebPush().catch(() => {});
      }
      return result;
    }
    if (Notification.permission === 'granted') {
      syncCurrentUserWebPush().catch(() => {});
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

// Deduplicate identical tags within 3 seconds
const recentNotificationTags = new Map<string, number>();

/**
 * Dispatches an OS/Mobile foreground notification via active Service Worker registration
 * with clean fallback to the native Notification constructor.
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

  try {
    const registration = await ensureBackgroundNotificationWorkerReady();
    if (registration && typeof registration.showNotification === 'function') {
      await registration.showNotification(title, options);
      return true;
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
