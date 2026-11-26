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
  hasBotAccess?: boolean;
  isAdmin: boolean;
  canAccessInbox?: boolean;
  isBanned?: boolean;
  muteChatPush?: boolean;
  vipExpiryMs?: number | null;
  botExpiryMs?: number | null;
  verifiedAt?: number;
  subscriptions: StoredPushEndpoint[];
  updatedAt: number;
}

const FALLBACK_FIREBASE_CONFIG = {
  projectId: 'mbktrading-8dc98',
  firestoreDatabaseId: '(default)',
  apiKey: 'AIzaSyCgNCyANwJ9CJmTJX0HKH-ssGHlfktF0L8'
};

const SUPER_ADMIN_EMAIL = 'moe.albzour@gmail.com';

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

function parseTimestampMs(val: any): number {
  if (!val) return 0;
  if (typeof val === 'number') return Number.isFinite(val) ? val : 0;
  if (typeof val === 'string') {
    const trimmed = val.trim();
    if (!trimmed) return 0;
    const ms = new Date(trimmed).getTime();
    return Number.isNaN(ms) ? 0 : ms;
  }
  if (typeof val === 'object') {
    if (typeof val.toMillis === 'function') return val.toMillis();
    if (typeof val.seconds === 'number') return val.seconds * 1000;
    if (typeof val.timestampValue === 'string') return parseTimestampMs(val.timestampValue);
    if (typeof val.stringValue === 'string') return parseTimestampMs(val.stringValue);
    if (val.integerValue !== undefined) return Number(val.integerValue) || 0;
    if (val.doubleValue !== undefined) return Number(val.doubleValue) || 0;
  }
  return 0;
}

function decodeRestFieldValue(val: any): any {
  if (!val || typeof val !== 'object') return undefined;
  if ('booleanValue' in val) return Boolean(val.booleanValue);
  if ('stringValue' in val) return String(val.stringValue);
  if ('integerValue' in val) return Number(val.integerValue);
  if ('doubleValue' in val) return Number(val.doubleValue);
  if ('timestampValue' in val) return String(val.timestampValue);
  if ('nullValue' in val) return null;
  if ('mapValue' in val) {
    const out: Record<string, any> = {};
    const fields = val.mapValue?.fields || {};
    for (const [k, v] of Object.entries(fields)) {
      out[k] = decodeRestFieldValue(v);
    }
    return out;
  }
  if ('arrayValue' in val) {
    const values = Array.isArray(val.arrayValue?.values) ? val.arrayValue.values : [];
    return values.map(decodeRestFieldValue);
  }
  return undefined;
}

function decodeRestUserFields(fields: Record<string, any> | undefined): Record<string, any> {
  const out: Record<string, any> = {};
  if (!fields || typeof fields !== 'object') return out;
  for (const [k, v] of Object.entries(fields)) {
    out[k] = decodeRestFieldValue(v);
  }
  return out;
}

interface VerifiedPushEntitlements {
  isVip: boolean;
  hasBotAccess: boolean;
  isAdmin: boolean;
  canAccessInbox: boolean;
  isBanned: boolean;
  vipExpiryMs: number | null;
  botExpiryMs: number | null;
}

function computeAuthoritativeEntitlementsFromUser(
  userData: Record<string, any> | null,
  email: string,
  nowMs: number
): VerifiedPushEntitlements {
  const isSuperAdmin = email.toLowerCase() === SUPER_ADMIN_EMAIL;
  if (isSuperAdmin) {
    return {
      isVip: true,
      hasBotAccess: true,
      isAdmin: true,
      canAccessInbox: true,
      isBanned: false,
      vipExpiryMs: null,
      botExpiryMs: null
    };
  }

  if (!userData || typeof userData !== 'object') {
    return {
      isVip: false,
      hasBotAccess: false,
      isAdmin: false,
      canAccessInbox: false,
      isBanned: false,
      vipExpiryMs: null,
      botExpiryMs: null
    };
  }

  if (userData.isBanned === true) {
    return {
      isVip: false,
      hasBotAccess: false,
      isAdmin: false,
      canAccessInbox: false,
      isBanned: true,
      vipExpiryMs: null,
      botExpiryMs: null
    };
  }

  const roleUpper = String(userData.role || '').toUpperCase();
  const roleLower = roleUpper.toLowerCase();
  const tierLower = String(userData.tier || '').toLowerCase();
  const staffRoleLower = String(userData.staffRole || '').toLowerCase();
  const perms =
    userData.permissions && typeof userData.permissions === 'object' ? userData.permissions : {};
  const hasExplicitPerms = Object.keys(perms).length > 0;
  const hasAnyPerm = Object.values(perms).some(Boolean);

  const isAdmin =
    userData.isAdmin === true ||
    roleUpper === 'ADMIN' ||
    staffRoleLower === 'super_admin' ||
    Boolean(perms.canManageSystem);

  const isStaff =
    isAdmin ||
    userData.isStaff === true ||
    ['ADMIN', 'MODERATOR', 'SALES', 'ANALYSER', 'ANALYST'].includes(roleUpper) ||
    (Boolean(staffRoleLower) && staffRoleLower !== 'none') ||
    hasAnyPerm;

  const canAccessInbox =
    isAdmin ||
    Boolean(perms.canAccessInbox) ||
    (!hasExplicitPerms &&
      (staffRoleLower === 'customer_service' ||
        staffRoleLower === 'operations_manager' ||
        roleUpper === 'SALES'));

  if (isStaff) {
    return {
      isVip: true,
      hasBotAccess: true,
      isAdmin,
      canAccessInbox,
      isBanned: false,
      vipExpiryMs: null,
      botExpiryMs: null
    };
  }

  const expiryCandidates = [
    parseTimestampMs(userData.eliteExpiryDate),
    parseTimestampMs(userData.vipExpiryDate),
    parseTimestampMs(userData.subscription_end_date),
    parseTimestampMs(userData.subscriptionEndDate)
  ].filter((ms) => ms > 0);
  const latestTierExpiryMs = expiryCandidates.length > 0 ? Math.max(...expiryCandidates) : 0;

  const hasEliteClaim =
    tierLower === 'elite' || roleLower === 'elite' || userData.isElite === true;
  const hasVipClaim =
    hasEliteClaim ||
    tierLower === 'vip' ||
    roleLower === 'vip' ||
    userData.isVip === true ||
    userData.vipAccess === true;

  const isTierActive = hasVipClaim && (latestTierExpiryMs === 0 || latestTierExpiryMs > nowMs);
  const isLifetimeTier = isTierActive && latestTierExpiryMs === 0;

  const granted =
    userData.grantedFeatures && typeof userData.grantedFeatures === 'object'
      ? userData.grantedFeatures
      : {};
  const vipGrantMs = parseTimestampMs(granted.vipSignals);
  const botGrantMs = parseTimestampMs(granted.botSignals);

  if (isLifetimeTier) {
    return {
      isVip: true,
      hasBotAccess: true,
      isAdmin: false,
      canAccessInbox: false,
      isBanned: false,
      vipExpiryMs: null,
      botExpiryMs: null
    };
  }

  const effectiveVipExpiryMs = Math.max(
    isTierActive ? latestTierExpiryMs : 0,
    vipGrantMs > nowMs ? vipGrantMs : 0
  );
  const effectiveBotExpiryMs = Math.max(
    isTierActive ? latestTierExpiryMs : 0,
    botGrantMs > nowMs ? botGrantMs : 0
  );

  return {
    isVip: effectiveVipExpiryMs > nowMs,
    hasBotAccess: effectiveBotExpiryMs > nowMs,
    isAdmin: false,
    canAccessInbox: false,
    isBanned: false,
    vipExpiryMs: effectiveVipExpiryMs > nowMs ? effectiveVipExpiryMs : null,
    botExpiryMs: effectiveBotExpiryMs > nowMs ? effectiveBotExpiryMs : null
  };
}

async function fetchAuthoritativeUserEntitlements(
  uid: string,
  email: string,
  idToken: string,
  nowMs: number
): Promise<{ verified: boolean; entitlements: VerifiedPushEntitlements | null }> {
  if (email.toLowerCase() === SUPER_ADMIN_EMAIL) {
    return {
      verified: true,
      entitlements: computeAuthoritativeEntitlementsFromUser(null, email, nowMs)
    };
  }

  // Primary: Firestore REST using the signed-in user's Bearer ID token (works on Vercel Serverless & AI Studio)
  try {
    const userDocUrl = `${getFirestoreRestBaseUrl()}/users/${encodeURIComponent(uid)}`;
    const res = await fetch(userDocUrl, {
      method: 'GET',
      headers: { Authorization: `Bearer ${idToken}` },
      signal: AbortSignal.timeout(5000)
    });
    if (res.ok) {
      const json = await res.json();
      const decoded = decodeRestUserFields(json?.fields);
      return {
        verified: true,
        entitlements: computeAuthoritativeEntitlementsFromUser(decoded, email, nowMs)
      };
    }
    if (res.status === 404) {
      return {
        verified: true,
        entitlements: computeAuthoritativeEntitlementsFromUser(null, email, nowMs)
      };
    }
  } catch {
    // Fall through to optional Admin SDK
  }

  // Fallback: Firebase Admin SDK if available
  const adminDb = getOptionalAdminFirestore();
  if (adminDb) {
    try {
      const snap = await adminDb.collection('users').doc(uid).get();
      return {
        verified: true,
        entitlements: computeAuthoritativeEntitlementsFromUser(
          snap.exists ? (snap.data() as Record<string, any>) : null,
          email,
          nowMs
        )
      };
    } catch {
      // Transient failure below
    }
  }

  // Transient lookup failure (network/5xx/429): do NOT overwrite existing VIP push subscriptions with Free!
  return { verified: false, entitlements: null };
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
  const vipExpVal =
    typeof docData.vipExpiryMs === 'number' && docData.vipExpiryMs > 0
      ? { integerValue: String(Math.trunc(docData.vipExpiryMs)) }
      : { nullValue: null };
  const botExpVal =
    typeof docData.botExpiryMs === 'number' && docData.botExpiryMs > 0
      ? { integerValue: String(Math.trunc(docData.botExpiryMs)) }
      : { nullValue: null };

  return {
    fields: {
      uid: { stringValue: docData.uid },
      isVip: { booleanValue: Boolean(docData.isVip) },
      hasBotAccess: { booleanValue: Boolean(docData.hasBotAccess) },
      isAdmin: { booleanValue: Boolean(docData.isAdmin) },
      canAccessInbox: { booleanValue: Boolean(docData.canAccessInbox || docData.isAdmin) },
      isBanned: { booleanValue: Boolean(docData.isBanned) },
      muteChatPush: { booleanValue: Boolean(docData.muteChatPush) },
      vipExpiryMs: vipExpVal,
      botExpiryMs: botExpVal,
      verifiedAt: { integerValue: String(Math.trunc(docData.verifiedAt || docData.updatedAt)) },
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

  const nowMs = Date.now();
  const isUnsubscribe = String(body?.action || '').toLowerCase() === 'unsubscribe';

  // Handle clean device detach on user logout so a shared/switched phone never receives the previous user's VIP/Bot pushes
  if (isUnsubscribe) {
    const removeEndpoint = typeof body?.endpoint === 'string' ? body.endpoint.trim() : '';
    try {
      const docUrl = `${getFirestoreRestBaseUrl()}/push_subscriptions/${encodeURIComponent(verifiedUser.uid)}`;
      const getRes = await fetch(docUrl, {
        method: 'GET',
        headers: { Authorization: `Bearer ${idToken}` },
        signal: AbortSignal.timeout(5000)
      });

      if (getRes.status === 404) {
        return sendJson(res, 200, { ok: true, subscribed: false, removed: true, deviceCount: 0 });
      }

      if (getRes.ok) {
        const existingJson = await getRes.json();
        const existingEndpoints = extractRestSubscriptions(existingJson?.fields);
        const remaining = removeEndpoint
          ? existingEndpoints.filter((item) => item && item.endpoint !== removeEndpoint)
          : [];
        const entitlementLookup = await fetchAuthoritativeUserEntitlements(
          verifiedUser.uid,
          verifiedUser.email,
          idToken,
          nowMs
        );
        const existingFields = existingJson?.fields || {};
        const fallbackIsVip = Boolean(existingFields.isVip?.booleanValue);
        const fallbackHasBot =
          existingFields.hasBotAccess && 'booleanValue' in existingFields.hasBotAccess
            ? Boolean(existingFields.hasBotAccess.booleanValue)
            : fallbackIsVip;
        const fallbackIsAdmin = Boolean(existingFields.isAdmin?.booleanValue);
        const fallbackInbox = Boolean(
          existingFields.canAccessInbox?.booleanValue || fallbackIsAdmin
        );
        const fallbackBanned = Boolean(existingFields.isBanned?.booleanValue);
        const fallbackVipExp = parseTimestampMs(existingFields.vipExpiryMs) || null;
        const fallbackBotExp = parseTimestampMs(existingFields.botExpiryMs) || null;
        const ent = entitlementLookup.entitlements;

        const nextDoc: PushSubscriptionDoc = {
          uid: verifiedUser.uid,
          isVip: ent ? ent.isVip : fallbackIsVip,
          hasBotAccess: ent ? ent.hasBotAccess : fallbackHasBot,
          isAdmin: ent ? ent.isAdmin : fallbackIsAdmin,
          canAccessInbox: ent ? ent.canAccessInbox : fallbackInbox,
          isBanned: ent ? ent.isBanned : fallbackBanned,
          muteChatPush: Boolean(existingFields.muteChatPush?.booleanValue),
          vipExpiryMs: ent ? ent.vipExpiryMs : fallbackVipExp,
          botExpiryMs: ent ? ent.botExpiryMs : fallbackBotExp,
          verifiedAt: ent ? nowMs : parseTimestampMs(existingFields.verifiedAt) || nowMs,
          subscriptions: remaining,
          updatedAt: nowMs
        };

        await fetch(docUrl, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${idToken}`
          },
          body: JSON.stringify(toFirestoreRestPushDoc(nextDoc)),
          signal: AbortSignal.timeout(5000)
        });

        return sendJson(res, 200, {
          ok: true,
          subscribed: remaining.length > 0,
          removed: true,
          deviceCount: remaining.length,
          storageMode: 'firestore_rest'
        });
      }
    } catch {
      // Fall through cleanly
    }

    const adminDb = getOptionalAdminFirestore();
    if (adminDb) {
      try {
        const docRef = adminDb.collection('push_subscriptions').doc(verifiedUser.uid);
        const snap = await docRef.get();
        if (snap.exists) {
          const prevSubs: StoredPushEndpoint[] = Array.isArray(snap.data()?.subscriptions)
            ? snap.data()!.subscriptions
            : [];
          const remaining = removeEndpoint
            ? prevSubs.filter((item) => item && item.endpoint !== removeEndpoint)
            : [];
          await docRef.set({ subscriptions: remaining, updatedAt: nowMs }, { merge: true });
          return sendJson(res, 200, {
            ok: true,
            subscribed: remaining.length > 0,
            removed: true,
            deviceCount: remaining.length,
            storageMode: 'firebase_admin'
          });
        }
      } catch {
        // ignore
      }
    }

    return sendJson(res, 200, { ok: true, subscribed: false, removed: true, deviceCount: 0 });
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

  // Server-authoritative entitlement check directly against users/{uid} (never trust client VIP/Admin flags)
  const entitlementLookup = await fetchAuthoritativeUserEntitlements(
    verifiedUser.uid,
    verifiedUser.email,
    idToken,
    nowMs
  );
  if (!entitlementLookup.verified || !entitlementLookup.entitlements) {
    return sendJson(res, 503, {
      ok: false,
      subscribed: false,
      error: 'Temporary profile verification error — retry shortly'
    });
  }
  const entitlements = entitlementLookup.entitlements;

  const newEntry: StoredPushEndpoint = {
    endpoint,
    expirationTime: typeof sub?.expirationTime === 'number' ? sub.expirationTime : null,
    keys: { p256dh, auth: authKey },
    updatedAt: nowMs
  };

  const mergeEndpoints = (existing: StoredPushEndpoint[]): StoredPushEndpoint[] => {
    if (entitlements.isBanned) return [];
    const filtered = existing.filter((item) => item && item.endpoint && item.endpoint !== newEntry.endpoint);
    filtered.push(newEntry);
    return filtered.slice(-3);
  };

  try {
    // Path 1: Stateless Firestore REST API (works identically on Vercel Serverless and AI Studio)
    const docUrl = `${getFirestoreRestBaseUrl()}/push_subscriptions/${encodeURIComponent(verifiedUser.uid)}`;

    let existingEndpoints: StoredPushEndpoint[] = [];
    let existingMuteChatPush = false;
    const getRes = await fetch(docUrl, {
      method: 'GET',
      headers: { Authorization: `Bearer ${idToken}` },
      signal: AbortSignal.timeout(6000)
    });
    if (getRes.ok) {
      const existingJson = await getRes.json();
      existingEndpoints = extractRestSubscriptions(existingJson?.fields);
      existingMuteChatPush = Boolean(existingJson?.fields?.muteChatPush?.booleanValue);
    }

    const muteChatPush =
      typeof body?.muteChatPush === 'boolean' ? body.muteChatPush : existingMuteChatPush;

    const nextDoc: PushSubscriptionDoc = {
      uid: verifiedUser.uid,
      isVip: entitlements.isVip,
      hasBotAccess: entitlements.hasBotAccess,
      isAdmin: entitlements.isAdmin,
      canAccessInbox: entitlements.canAccessInbox,
      isBanned: entitlements.isBanned,
      muteChatPush,
      vipExpiryMs: entitlements.vipExpiryMs,
      botExpiryMs: entitlements.botExpiryMs,
      verifiedAt: nowMs,
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
        subscribed: !entitlements.isBanned && nextDoc.subscriptions.length > 0,
        uid: verifiedUser.uid,
        isVip: entitlements.isVip,
        hasBotAccess: entitlements.hasBotAccess,
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
      const adminMuteChat =
        typeof body?.muteChatPush === 'boolean'
          ? body.muteChatPush
          : Boolean(snap.exists ? snap.data()?.muteChatPush : false);
      const mergedAdminDoc: PushSubscriptionDoc = {
        uid: verifiedUser.uid,
        isVip: entitlements.isVip,
        hasBotAccess: entitlements.hasBotAccess,
        isAdmin: entitlements.isAdmin,
        canAccessInbox: entitlements.canAccessInbox,
        isBanned: entitlements.isBanned,
        muteChatPush: adminMuteChat,
        vipExpiryMs: entitlements.vipExpiryMs,
        botExpiryMs: entitlements.botExpiryMs,
        verifiedAt: nowMs,
        subscriptions: mergeEndpoints(adminExisting),
        updatedAt: nowMs
      };
      await docRef.set(mergedAdminDoc, { merge: true });
      return sendJson(res, 200, {
        ok: true,
        subscribed: !entitlements.isBanned && mergedAdminDoc.subscriptions.length > 0,
        uid: verifiedUser.uid,
        isVip: entitlements.isVip,
        hasBotAccess: entitlements.hasBotAccess,
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
