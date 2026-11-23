import type { IncomingMessage, ServerResponse } from 'http';
import crypto from 'crypto';
import * as webpush from 'web-push';
import {
  getOptionalAdminFirestore,
  loadPushFirebaseConfig,
  verifyFirebaseIdToken,
  type PushSubscriptionDoc,
  type StoredPushEndpoint
} from './subscribe.js';

type Req = IncomingMessage & {
  method?: string;
  body?: any;
  headers: Record<string, string | string[] | undefined>;
};

export type PushAudience = 'targetUid' | 'admins' | 'vip' | 'all';

export interface ServerPushDispatchInput {
  title: string;
  body: string;
  url?: string;
  tag?: string;
  audience: PushAudience;
  targetUid?: string | null;
  excludeUid?: string | null;
}

export interface ServerPushDispatchResult {
  ok: boolean;
  sent: number;
  failed: number;
  pruned: number;
  skipped?: string;
}

function timingSafeSecretEqual(a: string, b: string): boolean {
  if (!a || !b) return false;
  const bufA = Buffer.from(a, 'utf8');
  const bufB = Buffer.from(b, 'utf8');
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

function getVapidConfig(): { publicKey: string; privateKey: string; subject: string } | null {
  const publicKey = (process.env.VAPID_PUBLIC_KEY || process.env.VITE_VAPID_PUBLIC_KEY || '').trim();
  const privateKey = (process.env.VAPID_PRIVATE_KEY || '').trim();
  const rawSubject = (process.env.VAPID_SUBJECT || '').trim();
  const subject =
    rawSubject.startsWith('mailto:') || rawSubject.startsWith('https://')
      ? rawSubject
      : 'mailto:support@mbktrading.com';
  if (!publicKey || !privateKey || publicKey.length < 20 || privateKey.length < 20) return null;
  return { publicKey, privateKey, subject };
}

function extractDocsFromRest(rawDoc: any): PushSubscriptionDoc | null {
  const f = rawDoc?.fields;
  if (!f) return null;
  const uid = f.uid?.stringValue || '';
  if (!uid) return null;
  const values = f.subscriptions?.arrayValue?.values;
  const subscriptions: StoredPushEndpoint[] = [];
  if (Array.isArray(values)) {
    for (const item of values) {
      const sf = item?.mapValue?.fields;
      if (!sf) continue;
      const endpoint = sf.endpoint?.stringValue;
      const p256dh = sf.keys?.mapValue?.fields?.p256dh?.stringValue;
      const auth = sf.keys?.mapValue?.fields?.auth?.stringValue;
      const updatedAt = Number(sf.updatedAt?.integerValue || sf.updatedAt?.doubleValue || Date.now());
      if (endpoint && p256dh && auth) {
        subscriptions.push({
          endpoint,
          expirationTime: null,
          keys: { p256dh, auth },
          updatedAt
        });
      }
    }
  }
  return {
    uid,
    email: f.email?.stringValue || '',
    isVip: Boolean(f.isVip?.booleanValue),
    isAdmin: Boolean(f.isAdmin?.booleanValue),
    subscriptions,
    updatedAt: Number(f.updatedAt?.integerValue || Date.now())
  };
}

async function isCallerAdminOrAnalyser(uid: string, email: string, idToken: string): Promise<boolean> {
  if (email.toLowerCase() === 'moe.albzour@gmail.com') return true;
  const adminDb = getOptionalAdminFirestore();
  if (adminDb) {
    try {
      const snap = await adminDb.collection('users').doc(uid).get();
      if (snap.exists) {
        const data = snap.data() || {};
        const role = String(data.role || '').toUpperCase();
        if (data.isAdmin === true || role === 'ADMIN' || role === 'ANALYSER' || role === 'ANALYST') {
          return true;
        }
      }
    } catch {
      // fall through
    }
  }

  try {
    const config = loadPushFirebaseConfig();
    const dbId =
      config.firestoreDatabaseId && config.firestoreDatabaseId !== '(default)'
        ? config.firestoreDatabaseId
        : '(default)';
    const userDocUrl = `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(
      config.projectId
    )}/databases/${encodeURIComponent(dbId)}/documents/users/${encodeURIComponent(uid)}`;
    const res = await fetch(userDocUrl, {
      headers: { Authorization: `Bearer ${idToken}` },
      signal: AbortSignal.timeout(5000)
    });
    if (!res.ok) return false;
    const json = await res.json();
    const fields = json?.fields || {};
    const isAdminFlag = Boolean(fields.isAdmin?.booleanValue);
    const role = String(fields.role?.stringValue || '').toUpperCase();
    return isAdminFlag || role === 'ADMIN' || role === 'ANALYSER' || role === 'ANALYST';
  } catch {
    return false;
  }
}

/**
 * Shared server-side Web Push dispatcher.
 * Called by POST /api/push/send AND directly by api/webhooks/tradingview.ts & server.ts.
 */
export async function dispatchServerWebPush(
  input: ServerPushDispatchInput,
  callerIdToken?: string
): Promise<ServerPushDispatchResult> {
  const vapid = getVapidConfig();
  if (!vapid) {
    return {
      ok: true,
      sent: 0,
      failed: 0,
      pruned: 0,
      skipped: 'VAPID keys not configured'
    };
  }

  try {
    webpush.setVapidDetails(vapid.subject, vapid.publicKey, vapid.privateKey);
  } catch {
    return {
      ok: true,
      sent: 0,
      failed: 0,
      pruned: 0,
      skipped: 'Invalid VAPID key configuration'
    };
  }

  const title = String(input.title || '').trim().slice(0, 140);
  const body = String(input.body || '').trim().slice(0, 260);
  const url = String(input.url || '/').trim().slice(0, 300) || '/';
  const tag = String(input.tag || `mbk-push-${Date.now()}`).trim().slice(0, 120);
  const audience = input.audience;
  const targetUid = input.targetUid ? String(input.targetUid).trim() : null;
  const excludeUid = input.excludeUid ? String(input.excludeUid).trim() : null;

  if (!title) {
    return { ok: true, sent: 0, failed: 0, pruned: 0, skipped: 'Empty title' };
  }

  const adminDb = getOptionalAdminFirestore();
  let matchingDocs: PushSubscriptionDoc[] = [];

  if (adminDb) {
    try {
      if (audience === 'targetUid') {
        if (targetUid) {
          const snap = await adminDb.collection('push_subscriptions').doc(targetUid).get();
          if (snap.exists) {
            const d = snap.data() as PushSubscriptionDoc;
            if (d && Array.isArray(d.subscriptions) && d.subscriptions.length > 0) {
              matchingDocs = [d];
            }
          }
        }
      } else {
        const snap = await adminDb.collection('push_subscriptions').get();
        snap.forEach((docSnap) => {
          const d = docSnap.data() as PushSubscriptionDoc;
          if (!d || !Array.isArray(d.subscriptions) || d.subscriptions.length === 0) return;
          if (excludeUid && d.uid === excludeUid) return;

          if (audience === 'admins' && d.isAdmin) {
            matchingDocs.push(d);
          } else if (audience === 'vip' && (d.isVip || d.isAdmin)) {
            matchingDocs.push(d);
          } else if (audience === 'all') {
            matchingDocs.push(d);
          }
        });
      }
    } catch {
      // Fall through to REST fallback below if Admin SDK lacks IAM permissions
    }
  }

  // Fallback for self-targeted push when Admin SDK is unavailable
  if (matchingDocs.length === 0 && audience === 'targetUid' && targetUid && callerIdToken) {
    try {
      const config = loadPushFirebaseConfig();
      const dbId =
        config.firestoreDatabaseId && config.firestoreDatabaseId !== '(default)'
          ? config.firestoreDatabaseId
          : '(default)';
      const docUrl = `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(
        config.projectId
      )}/databases/${encodeURIComponent(dbId)}/documents/push_subscriptions/${encodeURIComponent(targetUid)}`;
      const res = await fetch(docUrl, {
        headers: { Authorization: `Bearer ${callerIdToken}` },
        signal: AbortSignal.timeout(5000)
      });
      if (res.ok) {
        const parsed = extractDocsFromRest(await res.json());
        if (parsed && parsed.subscriptions.length > 0) {
          matchingDocs = [parsed];
        }
      }
    } catch {
      // ignore
    }
  }

  if (matchingDocs.length === 0) {
    return { ok: true, sent: 0, failed: 0, pruned: 0 };
  }

  const payloadString = JSON.stringify({ title, body, url, tag });
  let sent = 0;
  let failed = 0;
  let pruned = 0;

  await Promise.all(
    matchingDocs.map(async (userDoc) => {
      const expiredEndpoints = new Set<string>();

      await Promise.all(
        userDoc.subscriptions.map(async (sub) => {
          if (!sub?.endpoint || !sub?.keys?.p256dh || !sub?.keys?.auth) return;
          try {
            await webpush.sendNotification(
              {
                endpoint: sub.endpoint,
                keys: {
                  p256dh: sub.keys.p256dh,
                  auth: sub.keys.auth
                }
              },
              payloadString,
              { TTL: 3600 }
            );
            sent += 1;
          } catch (err: any) {
            failed += 1;
            const statusCode = Number(err?.statusCode || 0);
            if (statusCode === 404 || statusCode === 410) {
              expiredEndpoints.add(sub.endpoint);
            }
          }
        })
      );

      // Automatically remove expired / unsubscribed endpoints (HTTP 404 or 410)
      if (expiredEndpoints.size > 0 && adminDb) {
        pruned += expiredEndpoints.size;
        try {
          const remaining = userDoc.subscriptions.filter((s) => !expiredEndpoints.has(s.endpoint));
          await adminDb.collection('push_subscriptions').doc(userDoc.uid).set(
            {
              subscriptions: remaining,
              updatedAt: Date.now()
            },
            { merge: true }
          );
        } catch {
          // ignore cleanup failure
        }
      }
    })
  );

  return { ok: true, sent, failed, pruned };
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
    return sendJson(res, 405, { error: 'Method not allowed' });
  }

  // Authorize via EITHER valid Firebase ID Token OR internal x-webhook-secret
  const configuredWebhookSecret = (process.env.TRADINGVIEW_WEBHOOK_SECRET || '').trim();
  const providedWebhookSecret = String(req.headers['x-webhook-secret'] || '').trim();
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
      return sendJson(res, 401, { error: 'Unauthorized: missing Bearer token or webhook secret' });
    }
    verifiedUser = await verifyFirebaseIdToken(idToken);
    if (!verifiedUser) {
      return sendJson(res, 401, { error: 'Unauthorized: invalid Firebase ID token' });
    }
  }

  let body: any;
  try {
    body = await readJsonBody(req);
  } catch {
    return sendJson(res, 400, { error: 'Invalid JSON request body' });
  }

  const rawAudience = String(body?.audience || 'all').trim();
  const allowedAudiences: PushAudience[] = ['targetUid', 'admins', 'vip', 'all'];
  if (!allowedAudiences.includes(rawAudience as PushAudience)) {
    return sendJson(res, 400, { error: 'Invalid audience parameter' });
  }
  const audience = rawAudience as PushAudience;

  // Enforce role check for broadcast audiences ('all' and 'vip') when invoked by client token
  if (!isWebhookAuthorized && verifiedUser && (audience === 'all' || audience === 'vip')) {
    const canBroadcast = await isCallerAdminOrAnalyser(verifiedUser.uid, verifiedUser.email, idToken);
    if (!canBroadcast) {
      return sendJson(res, 403, { error: 'Forbidden: Admin or Analyser role required for broadcast push' });
    }
  }

  try {
    const result = await dispatchServerWebPush(
      {
        title: String(body?.title || ''),
        body: String(body?.body || ''),
        url: typeof body?.url === 'string' ? body.url : '/',
        tag: typeof body?.tag === 'string' ? body.tag : undefined,
        audience,
        targetUid: typeof body?.targetUid === 'string' ? body.targetUid : null,
        excludeUid:
          typeof body?.excludeUid === 'string'
            ? body.excludeUid
            : verifiedUser?.uid || null
      },
      idToken || undefined
    );

    return sendJson(res, 200, result);
  } catch (err: any) {
    return sendJson(res, 500, {
      error: 'Push dispatch failed',
      message: err?.message || 'Unknown error'
    });
  }
}
