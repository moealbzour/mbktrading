import type { IncomingMessage, ServerResponse } from 'http';
import crypto from 'crypto';
import * as webpush from 'web-push';
import {
  cleanEnvKey,
  cleanEnvSubject,
  extractRestSubscriptions,
  getFirestoreRestBaseUrl,
  getOptionalAdminFirestore,
  loadPushFirebaseConfig,
  toFirestoreRestPushDoc,
  verifyFirebaseIdToken,
  type PushSubscriptionDoc
} from './subscribe.js';

type Req = IncomingMessage & {
  method?: string;
  body?: any;
  headers: Record<string, string | string[] | undefined>;
};

export type PushAudience = 'targetUid' | 'admins' | 'vip' | 'all';
export type PushCategory = 'chat' | 'dm' | 'signal' | 'announcement' | 'analysis' | 'bot';

export interface ServerPushDispatchInput {
  title: string;
  body: string;
  url?: string;
  tag?: string;
  audience: PushAudience;
  category?: PushCategory;
  targetUid?: string | null;
  excludeUid?: string | null;
  isTest?: boolean;
}

export interface ServerPushDispatchResult {
  ok: boolean;
  totalDocsRead: number;
  matchedUsers: number;
  matchedDevices: number;
  sentCount: number;
  failedCount: number;
  sent: number;
  failed: number;
  pruned: number;
  rateLimited?: boolean;
  storageMode?: string;
  skipped?: string;
  error?: string;
  errors?: string[];
}

// Parallel batching, per-request timeout, dead endpoint cache, and Chat push rate guard
const PUSH_BATCH_SIZE = 50;
const PUSH_REQUEST_TIMEOUT_MS = 5000;
const DEAD_ENDPOINT_CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6 hours
const DEAD_ENDPOINT_CACHE_MAX = 2000;
const deadEndpointCache = new Map<string, number>();

const CHAT_GLOBAL_COOLDOWN_MS = 120_000; // Max 1 Public Chat push broadcast per 120s
const CHAT_SENDER_COOLDOWN_MS = 120_000; // Max 1 Public Chat push per sender per 120s
const CHAT_HOURLY_WINDOW_MS = 60 * 60 * 1000;
const CHAT_MAX_BROADCASTS_PER_HOUR = 30;
let lastGlobalChatPushAtMs = 0;
const lastSenderChatPushMap = new Map<string, number>();
let recentChatPushTimestamps: number[] = [];

// 3-minute in-memory cache for push_subscriptions inside warm Serverless instances
const PUSH_DOCS_CACHE_TTL_MS = 3 * 60 * 1000; // 3 minutes
let cachedPushSubscriptions: {
  docs: PushSubscriptionDoc[];
  storageMode: string;
  fetchedAtMs: number;
} | null = null;

function isEndpointCachedDead(endpoint: string, nowMs: number): boolean {
  const deadAt = deadEndpointCache.get(endpoint);
  if (!deadAt) return false;
  if (nowMs - deadAt > DEAD_ENDPOINT_CACHE_TTL_MS) {
    deadEndpointCache.delete(endpoint);
    return false;
  }
  return true;
}

function markEndpointDead(endpoint: string, nowMs: number): void {
  if (deadEndpointCache.size >= DEAD_ENDPOINT_CACHE_MAX) {
    const oldestKey = deadEndpointCache.keys().next().value;
    if (oldestKey) deadEndpointCache.delete(oldestKey);
  }
  deadEndpointCache.set(endpoint, nowMs);
}

function checkAndRecordChatRateLimit(senderUid: string | null): { allowed: boolean; reason?: string } {
  const nowMs = Date.now();
  recentChatPushTimestamps = recentChatPushTimestamps.filter((ts) => nowMs - ts < CHAT_HOURLY_WINDOW_MS);

  if (nowMs - lastGlobalChatPushAtMs < CHAT_GLOBAL_COOLDOWN_MS) {
    return {
      allowed: false,
      reason: 'Chat push throttled (global 120s cooldown) to protect VIP/Bot trade signal push & Firestore read quota'
    };
  }

  if (senderUid) {
    const lastSenderAt = lastSenderChatPushMap.get(senderUid) || 0;
    if (nowMs - lastSenderAt < CHAT_SENDER_COOLDOWN_MS) {
      return {
        allowed: false,
        reason: 'Chat push throttled (per-sender 120s cooldown) to protect trade signal push & Firestore read quota'
      };
    }
  }

  if (recentChatPushTimestamps.length >= CHAT_MAX_BROADCASTS_PER_HOUR) {
    return {
      allowed: false,
      reason: 'Hourly chat push cap reached to prevent browser push rate-limiting of trade alerts'
    };
  }

  lastGlobalChatPushAtMs = nowMs;
  if (senderUid) {
    if (lastSenderChatPushMap.size > 500) {
      const oldestUid = lastSenderChatPushMap.keys().next().value;
      if (oldestUid) lastSenderChatPushMap.delete(oldestUid);
    }
    lastSenderChatPushMap.set(senderUid, nowMs);
  }
  recentChatPushTimestamps.push(nowMs);
  return { allowed: true };
}

function timingSafeSecretEqual(a: string, b: string): boolean {
  if (!a || !b) return false;
  const bufA = Buffer.from(a, 'utf8');
  const bufB = Buffer.from(b, 'utf8');
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

function getVapidConfig(): { publicKey: string; privateKey: string; subject: string } | null {
  const publicKey = cleanEnvKey(process.env.VAPID_PUBLIC_KEY || process.env.VITE_VAPID_PUBLIC_KEY);
  const privateKey = cleanEnvKey(process.env.VAPID_PRIVATE_KEY);
  const subject = cleanEnvSubject(process.env.VAPID_SUBJECT);
  if (!publicKey || !privateKey || publicKey.length < 20 || privateKey.length < 20) return null;
  return { publicKey, privateKey, subject };
}

function parseRestPushDoc(rawDoc: any): PushSubscriptionDoc | null {
  const f = rawDoc?.fields;
  if (!f) return null;
  const namePath = typeof rawDoc?.name === 'string' ? rawDoc.name : '';
  const fallbackUid = namePath ? namePath.split('/').pop() || '' : '';
  const uid = String(f.uid?.stringValue || fallbackUid || '').trim();
  if (!uid) return null;
  const subscriptions = extractRestSubscriptions(f);
  return {
    uid,
    isVip: Boolean(f.isVip?.booleanValue),
    isAdmin: Boolean(f.isAdmin?.booleanValue),
    canAccessInbox: Boolean(f.canAccessInbox?.booleanValue || f.isAdmin?.booleanValue),
    muteChatPush: Boolean(f.muteChatPush?.booleanValue),
    subscriptions,
    updatedAt: Number(f.updatedAt?.integerValue || f.updatedAt?.doubleValue || Date.now())
  };
}

async function isCallerAdminOrAnalyser(uid: string, email: string, idToken: string): Promise<boolean> {
  if (email.toLowerCase() === 'moe.albzour@gmail.com') return true;

  try {
    const userDocUrl = `${getFirestoreRestBaseUrl()}/users/${encodeURIComponent(uid)}`;
    const res = await fetch(userDocUrl, {
      headers: { Authorization: `Bearer ${idToken}` },
      signal: AbortSignal.timeout(5000)
    });
    if (res.ok) {
      const json = await res.json();
      const fields = json?.fields || {};
      const isAdminFlag = Boolean(fields.isAdmin?.booleanValue);
      const role = String(fields.role?.stringValue || '').toUpperCase();
      const staffRole = String(fields.staffRole?.stringValue || '').toLowerCase();
      const permFields = fields.permissions?.mapValue?.fields || {};
      const grantedFields = fields.grantedFeatures?.mapValue?.fields || {};
      const hasBroadcastPerm =
        Boolean(permFields.canPostSignals?.booleanValue) ||
        Boolean(permFields.canPostAnalysis?.booleanValue) ||
        Boolean(permFields.canSendPopups?.booleanValue) ||
        Boolean(permFields.canManageSystem?.booleanValue) ||
        Boolean(grantedFields.publishAnalysis?.stringValue);
      if (
        isAdminFlag ||
        hasBroadcastPerm ||
        role === 'ADMIN' ||
        role === 'ANALYSER' ||
        role === 'ANALYST' ||
        staffRole === 'super_admin' ||
        staffRole === 'market_analyst' ||
        staffRole === 'operations_manager'
      ) {
        return true;
      }
    }
  } catch {
    // fall through
  }

  const adminDb = getOptionalAdminFirestore();
  if (adminDb) {
    try {
      const snap = await adminDb.collection('users').doc(uid).get();
      if (snap.exists) {
        const data = snap.data() || {};
        const role = String(data.role || '').toUpperCase();
        const staffRole = String(data.staffRole || '').toLowerCase();
        const perms = data.permissions && typeof data.permissions === 'object' ? data.permissions : {};
        const granted = data.grantedFeatures && typeof data.grantedFeatures === 'object' ? data.grantedFeatures : {};
        const hasBroadcastPerm = Boolean(
          perms.canPostSignals ||
            perms.canPostAnalysis ||
            perms.canSendPopups ||
            perms.canManageSystem ||
            granted.publishAnalysis
        );
        return (
          data.isAdmin === true ||
          hasBroadcastPerm ||
          role === 'ADMIN' ||
          role === 'ANALYSER' ||
          role === 'ANALYST' ||
          staffRole === 'super_admin' ||
          staffRole === 'market_analyst' ||
          staffRole === 'operations_manager'
        );
      }
    } catch {
      // ignore
    }
  }

  return false;
}

function filterDocsByAudience(
  docs: PushSubscriptionDoc[],
  audience: PushAudience,
  targetUid: string | null,
  excludeUid: string | null,
  category?: PushCategory
): PushSubscriptionDoc[] {
  const result: PushSubscriptionDoc[] = [];
  for (const d of docs) {
    if (!d || !Array.isArray(d.subscriptions) || d.subscriptions.length === 0) continue;
    if (category === 'chat' && d.muteChatPush) continue;
    if (audience === 'targetUid') {
      if (targetUid && d.uid === targetUid) {
        result.push(d);
      }
      continue;
    }
    if (excludeUid && d.uid === excludeUid) continue;
    if (audience === 'admins' && (d.isAdmin || d.canAccessInbox)) {
      result.push(d);
    } else if (audience === 'vip' && (d.isVip || d.isAdmin)) {
      result.push(d);
    } else if (audience === 'all') {
      result.push(d);
    }
  }
  return result;
}

async function fetchPushDocsViaRest(
  audience: PushAudience,
  targetUid: string | null,
  callerIdToken?: string
): Promise<{ docs: PushSubscriptionDoc[]; error?: string }> {
  const baseUrl = getFirestoreRestBaseUrl();
  const config = loadPushFirebaseConfig();
  const headers: Record<string, string> = {};
  const apiKeyParam = !callerIdToken && config.apiKey ? `key=${encodeURIComponent(config.apiKey)}` : '';

  if (callerIdToken) {
    headers.Authorization = `Bearer ${callerIdToken}`;
  }

  if (audience === 'targetUid') {
    if (!targetUid) return { docs: [] };
    const docUrl = `${baseUrl}/push_subscriptions/${encodeURIComponent(targetUid)}${
      apiKeyParam ? `?${apiKeyParam}` : ''
    }`;
    const res = await fetch(docUrl, { headers, signal: AbortSignal.timeout(6000) });
    if (res.status === 404) {
      return { docs: [] };
    }
    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      return { docs: [], error: `Firestore REST get failed (HTTP ${res.status}): ${errText.slice(0, 240)}` };
    }
    const parsed = parseRestPushDoc(await res.json());
    return { docs: parsed ? [parsed] : [] };
  }

  // Paginated list of push_subscriptions via stateless Firestore REST API (pageSize=300 across all pages)
  const allDocs: PushSubscriptionDoc[] = [];
  let pageToken: string | undefined;
  let pages = 0;

  while (pages < 50) {
    pages += 1;
    const queryParts = ['pageSize=300'];
    if (pageToken) queryParts.push(`pageToken=${encodeURIComponent(pageToken)}`);
    if (apiKeyParam) queryParts.push(apiKeyParam);
    const listUrl = `${baseUrl}/push_subscriptions?${queryParts.join('&')}`;
    const res = await fetch(listUrl, { headers, signal: AbortSignal.timeout(6000) });
    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      return { docs: [], error: `Firestore REST list failed (HTTP ${res.status}): ${errText.slice(0, 240)}` };
    }
    const json = await res.json();
    const rawDocs = Array.isArray(json?.documents) ? json.documents : [];
    for (const rawDoc of rawDocs) {
      const parsed = parseRestPushDoc(rawDoc);
      if (parsed) allDocs.push(parsed);
    }
    const nextToken =
      typeof json?.nextPageToken === 'string' && json.nextPageToken.trim()
        ? json.nextPageToken.trim()
        : undefined;
    if (!nextToken || nextToken === pageToken) break;
    pageToken = nextToken;
  }

  return { docs: allDocs };
}

/**
 * Shared server-side Web Push dispatcher.
 * Uses stateless Firestore REST API when callerIdToken is provided (100% Vercel Serverless safe),
 * and Firebase Admin SDK when explicit credentials exist (for unauthenticated webhooks).
 */
export async function dispatchServerWebPush(
  input: ServerPushDispatchInput,
  callerIdToken?: string
): Promise<ServerPushDispatchResult> {
  const vapid = getVapidConfig();
  if (!vapid) {
    return {
      ok: true,
      totalDocsRead: 0,
      matchedUsers: 0,
      matchedDevices: 0,
      sentCount: 0,
      failedCount: 0,
      sent: 0,
      failed: 0,
      pruned: 0,
      skipped: 'VAPID keys not configured',
      error: 'VAPID_PUBLIC_KEY or VAPID_PRIVATE_KEY is missing in server environment variables'
    };
  }

  try {
    webpush.setVapidDetails(vapid.subject, vapid.publicKey, vapid.privateKey);
  } catch (err: any) {
    return {
      ok: false,
      totalDocsRead: 0,
      matchedUsers: 0,
      matchedDevices: 0,
      sentCount: 0,
      failedCount: 0,
      sent: 0,
      failed: 0,
      pruned: 0,
      error: `Invalid VAPID keys: ${err?.message || 'setVapidDetails failed'}`
    };
  }

  const category = input.category;
  const title = String(input.title || '').trim().slice(0, 140);
  const body = String(input.body || '').trim().slice(0, 260);
  const url = String(input.url || '/').trim().slice(0, 300) || '/';
  const uniqueFallbackTag = `${category || 'mbk'}-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`;
  const tag = String(input.tag || uniqueFallbackTag).trim().slice(0, 120) || uniqueFallbackTag;
  const audience = input.audience;
  const targetUid = input.targetUid ? String(input.targetUid).trim() : null;
  const excludeUid = input.excludeUid ? String(input.excludeUid).trim() : null;

  if (!title) {
    return {
      ok: false,
      totalDocsRead: 0,
      matchedUsers: 0,
      matchedDevices: 0,
      sentCount: 0,
      failedCount: 0,
      sent: 0,
      failed: 0,
      pruned: 0,
      error: 'Notification title is required'
    };
  }

  // Lightweight rate guard ONLY for high-frequency Public Chat broadcasts so Chrome/FCM
  // never rate-limits critical VIP/Bot trading signals or direct messages.
  if (category === 'chat') {
    const rateCheck = checkAndRecordChatRateLimit(excludeUid);
    if (!rateCheck.allowed) {
      return {
        ok: true,
        totalDocsRead: 0,
        matchedUsers: 0,
        matchedDevices: 0,
        sentCount: 0,
        failedCount: 0,
        sent: 0,
        failed: 0,
        pruned: 0,
        rateLimited: true,
        skipped: rateCheck.reason
      };
    }
  }

  let rawDocs: PushSubscriptionDoc[] = [];
  let storageMode = 'none';
  let firestoreReadError: string | undefined;

  // Bypass/invalidate the 3-minute in-memory cache ONLY on manual Admin Test Push (isTest === true)
  const isManualTestPush = Boolean(input.isTest) || tag.startsWith('mbk-test-push-');
  if (isManualTestPush) {
    cachedPushSubscriptions = null;
  }

  const cacheNowMs = Date.now();
  const isWarmCacheValid =
    !isManualTestPush &&
    cachedPushSubscriptions !== null &&
    cacheNowMs - cachedPushSubscriptions.fetchedAtMs < PUSH_DOCS_CACHE_TTL_MS;

  if (isWarmCacheValid && cachedPushSubscriptions) {
    if (audience === 'targetUid' && targetUid) {
      const cachedTarget = cachedPushSubscriptions.docs.find((d) => d.uid === targetUid);
      if (cachedTarget) {
        rawDocs = [cachedTarget];
        storageMode = `${cachedPushSubscriptions.storageMode}_cache`;
      }
    } else {
      rawDocs = cachedPushSubscriptions.docs;
      storageMode = `${cachedPushSubscriptions.storageMode}_cache`;
    }
  }

  // Path 1: Stateless Firestore REST API (primary path on Vercel Serverless when user token is present)
  if (storageMode === 'none' && callerIdToken) {
    const restResult = await fetchPushDocsViaRest(audience, targetUid, callerIdToken);
    if (!restResult.error) {
      rawDocs = restResult.docs;
      storageMode = 'firestore_rest';
      if (audience !== 'targetUid') {
        cachedPushSubscriptions = {
          docs: rawDocs,
          storageMode: 'firestore_rest',
          fetchedAtMs: Date.now()
        };
      }
    } else {
      firestoreReadError = restResult.error;
    }
  }

  // Path 2: Firebase Admin SDK (for webhooks when FIREBASE_SERVICE_ACCOUNT_JSON or ADC exists)
  const adminDb = getOptionalAdminFirestore();
  if (storageMode === 'none' && adminDb) {
    try {
      if (audience === 'targetUid' && targetUid) {
        const snap = await adminDb.collection('push_subscriptions').doc(targetUid).get();
        if (snap.exists) {
          const d = snap.data() as PushSubscriptionDoc;
          if (d) rawDocs = [{ ...d, uid: d.uid || targetUid }];
        }
      } else {
        const snap = await adminDb.collection('push_subscriptions').get();
        snap.forEach((docSnap) => {
          const d = docSnap.data() as PushSubscriptionDoc;
          if (d) rawDocs.push({ ...d, uid: d.uid || docSnap.id });
        });
        cachedPushSubscriptions = {
          docs: rawDocs,
          storageMode: 'firebase_admin',
          fetchedAtMs: Date.now()
        };
      }
      storageMode = 'firebase_admin';
      firestoreReadError = undefined;
    } catch (err: any) {
      firestoreReadError = firestoreReadError || `Admin Firestore read failed: ${err?.message || 'Unknown error'}`;
    }
  }

  // Path 3: Server-to-server Firestore REST API fallback via project apiKey (Vercel TradingView webhooks without service account JSON)
  if (storageMode === 'none' && !callerIdToken) {
    const serverRestResult = await fetchPushDocsViaRest(audience, targetUid, undefined);
    if (!serverRestResult.error) {
      rawDocs = serverRestResult.docs;
      storageMode = 'firestore_rest_server';
      firestoreReadError = undefined;
      if (audience !== 'targetUid') {
        cachedPushSubscriptions = {
          docs: rawDocs,
          storageMode: 'firestore_rest_server',
          fetchedAtMs: Date.now()
        };
      }
    } else {
      firestoreReadError = firestoreReadError || serverRestResult.error;
    }
  }

  if (storageMode === 'none') {
    return {
      ok: false,
      totalDocsRead: 0,
      matchedUsers: 0,
      matchedDevices: 0,
      sentCount: 0,
      failedCount: 0,
      sent: 0,
      failed: 0,
      pruned: 0,
      storageMode,
      error:
        firestoreReadError ||
        'Unable to read push_subscriptions: provide a signed-in Bearer token or configure FIREBASE_SERVICE_ACCOUNT_JSON on server'
    };
  }

  const totalDocsRead = rawDocs.length;
  const matchingDocs = filterDocsByAudience(rawDocs, audience, targetUid, excludeUid, category);
  const matchedUsers = matchingDocs.length;
  const nowMs = Date.now();

  // Flatten all active target devices (skipping endpoints already known dead in warm memory)
  const deliveryQueue: Array<{ userDoc: PushSubscriptionDoc; sub: PushSubscriptionDoc['subscriptions'][number] }> = [];
  for (const userDoc of matchingDocs) {
    for (const sub of userDoc.subscriptions) {
      if (!sub?.endpoint || !sub?.keys?.p256dh || !sub?.keys?.auth) continue;
      if (isEndpointCachedDead(sub.endpoint, nowMs)) continue;
      deliveryQueue.push({ userDoc, sub });
    }
  }

  const matchedDevices = deliveryQueue.length;

  if (matchedDevices === 0) {
    return {
      ok: true,
      totalDocsRead,
      matchedUsers,
      matchedDevices: 0,
      sentCount: 0,
      failedCount: 0,
      sent: 0,
      failed: 0,
      pruned: 0,
      storageMode,
      skipped:
        audience === 'targetUid'
          ? `No saved push device subscription found in push_subscriptions/${targetUid}`
          : 'No matching active push subscribers found'
    };
  }

  const payloadString = JSON.stringify({
    title,
    body,
    url,
    tag,
    category: category || 'mbk'
  });

  // Preserve Android/Chrome high-priority wake-up budget for VIP/Bot trading signals & DMs;
  // use normal urgency + shorter TTL for Public Chat messages.
  const pushOptions =
    category === 'chat'
      ? { TTL: 300, urgency: 'normal' as const, timeout: PUSH_REQUEST_TIMEOUT_MS }
      : { TTL: 86400, urgency: 'high' as const, timeout: PUSH_REQUEST_TIMEOUT_MS };

  let sent = 0;
  let failed = 0;
  let pruned = 0;
  const sendErrors: string[] = [];
  const expiredByUid = new Map<string, { userDoc: PushSubscriptionDoc; endpoints: Set<string> }>();

  const sendWithTimeout = (sub: PushSubscriptionDoc['subscriptions'][number]): Promise<void> => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const sendPromise = webpush
      .sendNotification(
        {
          endpoint: sub.endpoint,
          keys: {
            p256dh: sub.keys.p256dh,
            auth: sub.keys.auth
          }
        },
        payloadString,
        pushOptions
      )
      .then(() => undefined);

    const timeoutPromise = new Promise<never>((_, reject) => {
      timer = setTimeout(() => {
        const timeoutErr: any = new Error(`Push relay timeout after ${PUSH_REQUEST_TIMEOUT_MS}ms`);
        timeoutErr.statusCode = 408;
        reject(timeoutErr);
      }, PUSH_REQUEST_TIMEOUT_MS + 500);
    });

    return Promise.race([sendPromise, timeoutPromise]).finally(() => {
      if (timer) clearTimeout(timer);
    });
  };

  // Concurrent batched delivery (50 devices per batch via Promise.allSettled)
  for (let i = 0; i < deliveryQueue.length; i += PUSH_BATCH_SIZE) {
    const batch = deliveryQueue.slice(i, i + PUSH_BATCH_SIZE);
    const settled = await Promise.allSettled(batch.map((item) => sendWithTimeout(item.sub)));

    settled.forEach((outcome, idx) => {
      const { userDoc, sub } = batch[idx];
      if (outcome.status === 'fulfilled') {
        sent += 1;
        return;
      }

      failed += 1;
      const err: any = outcome.reason;
      const statusCode = Number(err?.statusCode || 0);
      const errBody = typeof err?.body === 'string' ? err.body.slice(0, 160) : '';
      sendErrors.push(
        `HTTP ${statusCode || 'ERR'}: ${err?.message || 'webpush failed'}${errBody ? ` (${errBody})` : ''}`
      );

      if (statusCode === 404 || statusCode === 410) {
        markEndpointDead(sub.endpoint, Date.now());
        let entry = expiredByUid.get(userDoc.uid);
        if (!entry) {
          entry = { userDoc, endpoints: new Set<string>() };
          expiredByUid.set(userDoc.uid, entry);
        }
        entry.endpoints.add(sub.endpoint);
      }
    });
  }

  // Automatically prune expired / unsubscribed endpoints (HTTP 404 or 410) in parallel
  if (expiredByUid.size > 0) {
    const pruneTasks = Array.from(expiredByUid.values()).map(async ({ userDoc, endpoints }) => {
      pruned += endpoints.size;
      const remaining = userDoc.subscriptions.filter((s) => !endpoints.has(s.endpoint));
      userDoc.subscriptions = remaining;
      const updatedDoc: PushSubscriptionDoc = {
        uid: userDoc.uid,
        isVip: userDoc.isVip,
        isAdmin: userDoc.isAdmin,
        canAccessInbox: Boolean(userDoc.canAccessInbox || userDoc.isAdmin),
        muteChatPush: Boolean(userDoc.muteChatPush),
        subscriptions: remaining,
        updatedAt: Date.now()
      };

      if (cachedPushSubscriptions) {
        cachedPushSubscriptions.docs = cachedPushSubscriptions.docs.map((d) =>
          d.uid === userDoc.uid ? updatedDoc : d
        );
      }

      if (storageMode.startsWith('firebase_admin') && adminDb) {
        await adminDb.collection('push_subscriptions').doc(userDoc.uid).set(updatedDoc, { merge: true });
      } else if (callerIdToken) {
        const docUrl = `${getFirestoreRestBaseUrl()}/push_subscriptions/${encodeURIComponent(userDoc.uid)}`;
        await fetch(docUrl, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${callerIdToken}`
          },
          body: JSON.stringify(toFirestoreRestPushDoc(updatedDoc)),
          signal: AbortSignal.timeout(3500)
        });
      }
    });

    await Promise.allSettled(pruneTasks);
  }

  const allFailed = sent === 0 && failed > 0;
  return {
    ok: !allFailed,
    totalDocsRead,
    matchedUsers,
    matchedDevices,
    sentCount: sent,
    failedCount: failed,
    sent,
    failed,
    pruned,
    storageMode,
    ...(allFailed ? { error: sendErrors[0] || 'All push deliveries failed' } : {}),
    ...(sendErrors.length > 0 ? { errors: sendErrors.slice(0, 5) } : {})
  };
}

async function readJsonBody(req: Req): Promise<any> {
  if (req.body && typeof req.body === 'object') return req.body;
  if (typeof req.body === 'string' && req.body.trim()) {
    return JSON.parse(req.body);
  }
  return new Promise((resolve, reject) => {
    let raw = '';
    req.on('data', (chunk: Buffer | string) => {
      raw += typeof chunk === 'string' ? chunk : chunk.toString('utf8');
      if (raw.length > 512 * 1024) {
        reject(new Error('Payload too large'));
      }
    });
    req.on('end', () => {
      try {
        resolve(raw.trim() ? JSON.parse(raw) : {});
      } catch (e) {
        reject(e);
      }
    });
    req.on('error', reject);
  });
}

function sendJson(res: ServerResponse, statusCode: number, data: Record<string, any>) {
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(data));
}

export default async function handler(req: Req, res: ServerResponse) {
  const method = (req.method || 'POST').toUpperCase();
  if (method === 'OPTIONS') {
    res.statusCode = 204;
    res.end();
    return;
  }
  if (method !== 'POST') {
    return sendJson(res, 405, { ok: false, sentCount: 0, error: 'Method not allowed' });
  }

  // Authorize via EITHER valid Firebase ID Token OR internal x-webhook-secret
  const configuredWebhookSecret = cleanEnvKey(process.env.TRADINGVIEW_WEBHOOK_SECRET);
  const providedWebhookSecret = cleanEnvKey(String(req.headers['x-webhook-secret'] || ''));
  const isWebhookAuthorized =
    Boolean(configuredWebhookSecret) &&
    Boolean(providedWebhookSecret) &&
    timingSafeSecretEqual(configuredWebhookSecret, providedWebhookSecret);

  let verifiedUser: { uid: string; email: string } | null = null;
  let idToken = '';

  if (!isWebhookAuthorized) {
    const authHeader = String(req.headers.authorization || req.headers.Authorization || '');
    const bearerMatch = authHeader.match(/^Bearer\s+(.+)$/i);
    idToken = bearerMatch?.[1]?.trim() || '';
    if (!idToken) {
      return sendJson(res, 401, {
        ok: false,
        sentCount: 0,
        error: 'Unauthorized: missing Bearer token or webhook secret'
      });
    }
    verifiedUser = await verifyFirebaseIdToken(idToken);
    if (!verifiedUser) {
      return sendJson(res, 401, {
        ok: false,
        sentCount: 0,
        error: 'Unauthorized: invalid Firebase ID token'
      });
    }
  }

  let body: any;
  try {
    body = await readJsonBody(req);
  } catch {
    return sendJson(res, 400, { ok: false, sentCount: 0, error: 'Invalid JSON request body' });
  }

  const rawAudience = String(body?.audience || 'all').trim();
  const allowedAudiences: PushAudience[] = ['targetUid', 'admins', 'vip', 'all'];
  if (!allowedAudiences.includes(rawAudience as PushAudience)) {
    return sendJson(res, 400, { ok: false, sentCount: 0, error: 'Invalid audience parameter' });
  }
  const audience = rawAudience as PushAudience;

  const rawCategory = typeof body?.category === 'string' ? body.category.trim().toLowerCase() : '';
  const allowedCategories: PushCategory[] = ['chat', 'dm', 'signal', 'announcement', 'analysis', 'bot'];
  const category: PushCategory | undefined = allowedCategories.includes(rawCategory as PushCategory)
    ? (rawCategory as PushCategory)
    : undefined;

  const rawTitle = String(body?.title || '').trim();
  const rawBody = String(body?.body || '').trim();

  if (!rawTitle || rawTitle.length > 160 || rawBody.length > 400) {
    return sendJson(res, 400, {
      ok: false,
      sentCount: 0,
      error: 'Invalid notification title or body length'
    });
  }

  // Enforce Admin/Analyser role check for broadcast announcements/signals/analysis.
  // Authenticated regular users may trigger pushes for their own Chat messages (category: 'chat')
  // or Direct/Inbox messages (audience: 'targetUid' | 'admins'), always excluding their own UID.
  let effectiveExcludeUid: string | null =
    body?.excludeUid === null
      ? null
      : typeof body?.excludeUid === 'string'
      ? body.excludeUid
      : verifiedUser?.uid || null;

  if (!isWebhookAuthorized && verifiedUser) {
    const isBroadcastAudience = audience === 'all' || audience === 'vip';
    const isChatPush = category === 'chat';

    if (isBroadcastAudience && !isChatPush) {
      const canBroadcast = await isCallerAdminOrAnalyser(verifiedUser.uid, verifiedUser.email, idToken);
      if (!canBroadcast) {
        return sendJson(res, 403, {
          ok: false,
          sentCount: 0,
          error: 'Forbidden: Admin or Analyser role required for broadcast announcements and signals'
        });
      }
    }

    if (isChatPush) {
      if (rawTitle.length > 120 || rawBody.length > 220) {
        return sendJson(res, 400, {
          ok: false,
          sentCount: 0,
          error: 'Chat notification payload exceeds allowed length'
        });
      }
      // Never allow chat sender to notify themselves
      effectiveExcludeUid = verifiedUser.uid;
    }

    if (audience === 'targetUid' && typeof body?.targetUid === 'string' && body.targetUid.trim() === verifiedUser.uid) {
      const canSelfTest = await isCallerAdminOrAnalyser(verifiedUser.uid, verifiedUser.email, idToken);
      if (!canSelfTest) {
        return sendJson(res, 400, {
          ok: false,
          sentCount: 0,
          error: 'Cannot send direct push notification to yourself'
        });
      }
    }
  }

  try {
    const result = await dispatchServerWebPush(
      {
        title: rawTitle,
        body: rawBody,
        url: typeof body?.url === 'string' ? body.url : '/',
        tag: typeof body?.tag === 'string' ? body.tag : undefined,
        audience,
        category,
        targetUid: typeof body?.targetUid === 'string' ? body.targetUid : null,
        excludeUid: effectiveExcludeUid,
        isTest: Boolean(body?.isTest)
      },
      idToken || undefined
    );

    return sendJson(res, result.ok ? 200 : 502, result);
  } catch (err: any) {
    return sendJson(res, 500, {
      ok: false,
      sentCount: 0,
      error: `Push dispatch failed: ${err?.message || 'Unknown error'}`
    });
  }
}
