import type { IncomingMessage, ServerResponse } from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  initializeApp as initAdminApp,
  getApps as getAdminApps,
  getApp as getAdminApp,
  applicationDefault,
  cert
} from 'firebase-admin/app';
import { getFirestore as getAdminFirestore, type Firestore as AdminFirestore } from 'firebase-admin/firestore';

type Req = IncomingMessage & {
  method?: string;
  body?: any;
  headers: Record<string, string | string[] | undefined>;
};

export interface StoredPushEndpoint {
  endpoint: string;
  expirationTime: number | null;
  keys: {
    p256dh: string;
    auth: string;
  };
  updatedAt: number;
}

export interface PushSubscriptionDoc {
  uid: string;
  isVip: boolean;
  isAdmin: boolean;
  subscriptions: StoredPushEndpoint[];
  updatedAt: number;
}

const FALLBACK_FIREBASE_CONFIG = {
  projectId: 'mbktrading-8dc98',
  firestoreDatabaseId: '(default)',
  apiKey: 'AIzaSyCgNCyANwJ9CJmTJX0HKH-ssGHlfktF0L8'
};

export function cleanEnvKey(raw?: string): string {
  return String(raw || '')
    .replace(/[\r\n\s"']+/g, '')
    .trim();
}

export function cleanEnvSubject(raw?: string): string {
  const cleaned = String(raw || '')
    .replace(/[\r\n"']+/g, '')
    .trim();
  if (cleaned.startsWith('mailto:') || cleaned.startsWith('https://')) {
    return cleaned;
  }
  return 'mailto:support@mbktrading.com';
}

export function loadPushFirebaseConfig() {
  try {
    const candidates: string[] = [path.resolve(process.cwd(), 'firebase-applet-config.json')];
    try {
      const currentDir = path.dirname(fileURLToPath(import.meta.url));
      candidates.push(path.resolve(currentDir, '../../firebase-applet-config.json'));
    } catch {
      // ignore
    }

    for (const filePath of candidates) {
      if (fs.existsSync(filePath)) {
        const parsed = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
        if (parsed && parsed.projectId && parsed.apiKey) {
          return { ...FALLBACK_FIREBASE_CONFIG, ...parsed };
        }
      }
    }
  } catch {
    // fallback
  }
  return FALLBACK_FIREBASE_CONFIG;
}

let cachedAdminDb: AdminFirestore | null | undefined = undefined;

/**
 * Initializes Firebase Admin Firestore ONLY when explicit service account credentials exist
 * (or when running in a GCP/AI Studio runtime with ADC). On Vercel Serverless without
 * FIREBASE_SERVICE_ACCOUNT_JSON, immediately returns null so we use the fast stateless
 * Firestore REST API without waiting for GCP metadata timeouts.
 */
export function getOptionalAdminFirestore(): AdminFirestore | null {
  if (cachedAdminDb !== undefined) return cachedAdminDb;

  const hasExplicitServiceAccount = Boolean((process.env.FIREBASE_SERVICE_ACCOUNT_JSON || '').trim());
  const hasGoogleAppCreds = Boolean((process.env.GOOGLE_APPLICATION_CREDENTIALS || '').trim());
  const isVercel = Boolean(process.env.VERCEL || process.env.VERCEL_ENV);

  if (isVercel && !hasExplicitServiceAccount && !hasGoogleAppCreds) {
    cachedAdminDb = null;
    return null;
  }

  try {
    const config = loadPushFirebaseConfig();
    let app;
    if (getAdminApps().length > 0) {
      app = getAdminApp();
    } else if (hasExplicitServiceAccount) {
      const parsedSa = JSON.parse(String(process.env.FIREBASE_SERVICE_ACCOUNT_JSON).trim());
      app = initAdminApp({
        credential: cert(parsedSa),
        projectId: config.projectId
      });
    } else {
      app = initAdminApp({
        credential: applicationDefault(),
        projectId: config.projectId
      });
    }
    const dbId =
      config.firestoreDatabaseId && config.firestoreDatabaseId !== '(default)'
        ? config.firestoreDatabaseId
        : undefined;
    const db = dbId ? getAdminFirestore(app, dbId) : getAdminFirestore(app);
    try {
      db.settings({ ignoreUndefinedProperties: true });
    } catch {
      // Already configured by server.ts
    }
    cachedAdminDb = db;
    return db;
  } catch {
    cachedAdminDb = null;
    return null;
  }
}

export function getFirestoreRestBaseUrl(): string {
  const config = loadPushFirebaseConfig();
  const dbId =
    config.firestoreDatabaseId && config.firestoreDatabaseId !== '(default)'
      ? config.firestoreDatabaseId
      : '(default)';
  return `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(
    config.projectId
  )}/databases/${encodeURIComponent(dbId)}/documents`;
}

export async function verifyFirebaseIdToken(
  idToken: string
): Promise<{ uid: string; email: string } | null> {
  const cleanToken = String(idToken || '').trim();
  if (!cleanToken) return null;
  const config = loadPushFirebaseConfig();

  try {
    const res = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${encodeURIComponent(config.apiKey)}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken: cleanToken }),
        signal: AbortSignal.timeout(6000)
      }
    );
    if (!res.ok) return null;
    const json = await res.json();
    const user = Array.isArray(json?.users) ? json.users[0] : null;
    if (!user || typeof user.localId !== 'string' || !user.localId) return null;
    return {
      uid: user.localId,
      email: typeof user.email === 'string' ? user.email.toLowerCase() : ''
    };
  } catch {
    return null;
  }
}

function isValidPushEndpointUrl(endpoint: string): boolean {
  try {
    const parsed = new URL(endpoint);
    if (parsed.protocol !== 'https:') return false;
    const host = parsed.hostname.toLowerCase();
    if (
      host === 'localhost' ||
      host === '127.0.0.1' ||
      host === '::1' ||
      host === '169.254.169.254' ||
      host.startsWith('10.') ||
      host.startsWith('192.168.') ||
      /^172\.(1[6-9]|2\d|3[01])\./.test(host)
    ) {
      return false;
    }
    return true;
  } catch {
    return false;
  }
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

export function extractRestSubscriptions(fields: Record<string, any> | undefined): StoredPushEndpoint[] {
  const values = fields?.subscriptions?.arrayValue?.values;
  if (!Array.isArray(values)) return [];
  const result: StoredPushEndpoint[] = [];
  for (const item of values) {
    const f = item?.mapValue?.fields;
    if (!f) continue;
    const endpoint = f.endpoint?.stringValue;
    const p256dh = f.keys?.mapValue?.fields?.p256dh?.stringValue;
    const auth = f.keys?.mapValue?.fields?.auth?.stringValue;
    const updatedAt = Number(f.updatedAt?.integerValue || f.updatedAt?.doubleValue || Date.now());
    if (endpoint && p256dh && auth) {
      result.push({
        endpoint,
        expirationTime: null,
        keys: { p256dh, auth },
        updatedAt
      });
    }
  }
  return result;
}

export function toFirestoreRestPushDoc(docData: PushSubscriptionDoc) {
  return {
    fields: {
      uid: { stringValue: docData.uid },
      isVip: { booleanValue: docData.isVip },
      isAdmin: { booleanValue: docData.isAdmin },
      updatedAt: { integerValue: String(Math.trunc(docData.updatedAt)) },
      subscriptions: {
        arrayValue: {
          values: docData.subscriptions.map((sub) => ({
            mapValue: {
              fields: {
                endpoint: { stringValue: sub.endpoint },
                expirationTime: { nullValue: null },
                updatedAt: { integerValue: String(Math.trunc(sub.updatedAt)) },
                keys: {
                  mapValue: {
                    fields: {
                      p256dh: { stringValue: sub.keys.p256dh },
                      auth: { stringValue: sub.keys.auth }
                    }
                  }
                }
              }
            }
          }))
        }
      }
    }
  };
}

export default async function handler(req: Req, res: ServerResponse) {
  const method = (req.method || 'POST').toUpperCase();
  if (method === 'OPTIONS') {
    res.statusCode = 204;
    res.end();
    return;
  }
  if (method !== 'POST') {
    return sendJson(res, 405, { ok: false, subscribed: false, error: 'Method not allowed' });
  }

  const authHeader = String(req.headers.authorization || req.headers.Authorization || '');
  const bearerMatch = authHeader.match(/^Bearer\s+(.+)$/i);
  const idToken = bearerMatch?.[1]?.trim() || '';

  if (!idToken) {
    return sendJson(res, 401, {
      ok: false,
      subscribed: false,
      error: 'Missing Authorization Bearer token'
    });
  }

  const verifiedUser = await verifyFirebaseIdToken(idToken);
  if (!verifiedUser) {
    return sendJson(res, 401, {
      ok: false,
      subscribed: false,
      error: 'Invalid or expired Firebase ID token'
    });
  }

  let body: any;
  try {
    body = await readJsonBody(req);
  } catch {
    return sendJson(res, 400, {
      ok: false,
      subscribed: false,
      error: 'Invalid JSON request body'
    });
  }

  const sub = body?.subscription;
  const endpoint = typeof sub?.endpoint === 'string' ? sub.endpoint.trim() : '';
  const p256dh = typeof sub?.keys?.p256dh === 'string' ? sub.keys.p256dh.trim() : '';
  const authKey = typeof sub?.keys?.auth === 'string' ? sub.keys.auth.trim() : '';

  if (!endpoint || !isValidPushEndpointUrl(endpoint) || !p256dh || !authKey) {
    return sendJson(res, 400, {
      ok: false,
      subscribed: false,
      error: 'Invalid Web Push subscription payload (missing valid https endpoint or keys)'
    });
  }

  const isSuperAdmin = verifiedUser.email === 'moe.albzour@gmail.com';
  const isVip = Boolean(body?.isVip) || isSuperAdmin;
  const isAdmin = Boolean(body?.isAdmin) || isSuperAdmin;
  const nowMs = Date.now();

  const newEntry: StoredPushEndpoint = {
    endpoint,
    expirationTime: typeof sub?.expirationTime === 'number' ? sub.expirationTime : null,
    keys: { p256dh, auth: authKey },
    updatedAt: nowMs
  };

  const mergeEndpoints = (existing: StoredPushEndpoint[]): StoredPushEndpoint[] => {
    const filtered = existing.filter((item) => item && item.endpoint && item.endpoint !== newEntry.endpoint);
    filtered.push(newEntry);
    return filtered.slice(-3);
  };

  try {
    // Path 1: Stateless Firestore REST API (works identically on Vercel Serverless and AI Studio)
    const docUrl = `${getFirestoreRestBaseUrl()}/push_subscriptions/${encodeURIComponent(verifiedUser.uid)}`;

    let existingEndpoints: StoredPushEndpoint[] = [];
    const getRes = await fetch(docUrl, {
      method: 'GET',
      headers: { Authorization: `Bearer ${idToken}` },
      signal: AbortSignal.timeout(6000)
    });
    if (getRes.ok) {
      const existingJson = await getRes.json();
      existingEndpoints = extractRestSubscriptions(existingJson?.fields);
    }

    const nextDoc: PushSubscriptionDoc = {
      uid: verifiedUser.uid,
      isVip,
      isAdmin,
      subscriptions: mergeEndpoints(existingEndpoints),
      updatedAt: nowMs
    };

    const patchRes = await fetch(docUrl, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${idToken}`
      },
      body: JSON.stringify(toFirestoreRestPushDoc(nextDoc)),
      signal: AbortSignal.timeout(6000)
    });

    if (patchRes.ok) {
      return sendJson(res, 200, {
        ok: true,
        subscribed: true,
        uid: verifiedUser.uid,
        deviceCount: nextDoc.subscriptions.length,
        storageMode: 'firestore_rest'
      });
    }

    const restErrText = await patchRes.text().catch(() => '');

    // Path 2: Fallback to Firebase Admin SDK if available
    const adminDb = getOptionalAdminFirestore();
    if (adminDb) {
      const docRef = adminDb.collection('push_subscriptions').doc(verifiedUser.uid);
      const snap = await docRef.get();
      const adminExisting: StoredPushEndpoint[] =
        snap.exists && Array.isArray(snap.data()?.subscriptions) ? snap.data()!.subscriptions : [];
      const mergedAdminDoc: PushSubscriptionDoc = {
        uid: verifiedUser.uid,
        isVip,
        isAdmin,
        subscriptions: mergeEndpoints(adminExisting),
        updatedAt: nowMs
      };
      await docRef.set(mergedAdminDoc, { merge: true });
      return sendJson(res, 200, {
        ok: true,
        subscribed: true,
        uid: verifiedUser.uid,
        deviceCount: mergedAdminDoc.subscriptions.length,
        storageMode: 'firebase_admin'
      });
    }

    return sendJson(res, 502, {
      ok: false,
      subscribed: false,
      error: `Firestore REST write failed (HTTP ${patchRes.status}): ${restErrText.slice(0, 300)}`
    });
  } catch (err: any) {
    return sendJson(res, 500, {
      ok: false,
      subscribed: false,
      error: `Failed to persist push subscription: ${err?.message || 'Unknown error'}`
    });
  }
}
