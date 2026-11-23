import type { IncomingMessage, ServerResponse } from 'http';

export interface PulseNotificationEvent {
  id: string;
  tag: string;
  title: string;
  body: string;
  url?: string;
  timestampMs: number;
  targetUid?: string | null;
  excludeUid?: string | null;
}

type Req = IncomingMessage & {
  method?: string;
  body?: any;
  query?: Record<string, any>;
  url?: string;
};

type Res = ServerResponse & {
  status?: (code: number) => Res;
  json?: (data: any) => void;
};

const MAX_PULSE_EVENTS = 60;
const MAX_EVENT_AGE_MS = 12 * 60 * 60 * 1000; // 12 hours
const PRESENCE_ONLINE_TTL_MS = 3 * 60 * 1000; // 3 minutes active window in server RAM

// In-memory ring buffer & presence map shared across requests in Node/Express process (0 Firestore reads/writes)
const pulseRingBuffer: PulseNotificationEvent[] = [];
const activePresenceByUid = new Map<string, number>();

export function touchUserPresence(uid?: string | null) {
  const clean = String(uid || '').trim();
  if (!clean) return;
  activePresenceByUid.set(clean, Date.now());
}

export function getActiveOnlineUids(): string[] {
  const now = Date.now();
  const online: string[] = ['mbktrading'];
  for (const [uid, lastSeenMs] of activePresenceByUid.entries()) {
    if (now - lastSeenMs <= PRESENCE_ONLINE_TTL_MS) {
      if (!online.includes(uid)) {
        online.push(uid);
      }
    } else {
      activePresenceByUid.delete(uid);
    }
  }
  return online;
}

export function recordServerNotificationPulse(
  partial: Omit<PulseNotificationEvent, 'id' | 'timestampMs'> & {
    id?: string;
    timestampMs?: number;
  }
): PulseNotificationEvent | null {
  if (partial.excludeUid) {
    touchUserPresence(partial.excludeUid);
  }
  const title = String(partial.title || '').trim().slice(0, 140);
  const body = String(partial.body || '').trim().slice(0, 260);
  if (!title && !body) return null;

  const nowMs = Number(partial.timestampMs) > 0 ? Number(partial.timestampMs) : Date.now();
  const tag = String(partial.tag || `mbk-pulse-${nowMs}`).trim().slice(0, 120);

  // Deduplicate identical tag within 4 seconds
  const existingIdx = pulseRingBuffer.findIndex(
    (e) => e.tag === tag && Math.abs(nowMs - e.timestampMs) < 4000
  );
  if (existingIdx !== -1) {
    return pulseRingBuffer[existingIdx];
  }

  const event: PulseNotificationEvent = {
    id: partial.id || `${tag}-${nowMs}`,
    tag,
    title: title || 'MBK Trading 🔔',
    body,
    url: String(partial.url || '/').trim() || '/',
    timestampMs: nowMs,
    targetUid: partial.targetUid ? String(partial.targetUid).trim() : null,
    excludeUid: partial.excludeUid ? String(partial.excludeUid).trim() : null
  };

  pulseRingBuffer.push(event);

  // Prune old events and cap ring buffer length
  const cutoff = Date.now() - MAX_EVENT_AGE_MS;
  while (pulseRingBuffer.length > 0 && pulseRingBuffer[0].timestampMs < cutoff) {
    pulseRingBuffer.shift();
  }
  while (pulseRingBuffer.length > MAX_PULSE_EVENTS) {
    pulseRingBuffer.shift();
  }

  return event;
}

function sendJson(res: Res, statusCode: number, payload: any) {
  if (typeof res.status === 'function' && typeof res.json === 'function') {
    const statusRes = res.status(statusCode);
    if (statusRes && typeof statusRes.json === 'function') {
      return statusRes.json(payload);
    }
  }
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
  res.end(JSON.stringify(payload));
}

function parseQuery(req: Req): Record<string, string> {
  if (req.query && typeof req.query === 'object') {
    const out: Record<string, string> = {};
    for (const [k, v] of Object.entries(req.query)) {
      if (typeof v === 'string') out[k] = v;
    }
    return out;
  }
  const out: Record<string, string> = {};
  try {
    const u = new URL(req.url || '/', 'http://localhost');
    u.searchParams.forEach((v, k) => {
      out[k] = v;
    });
  } catch {
    // ignore
  }
  return out;
}

export default async function notificationPulseHandler(req: Req, res: Res) {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');

  if (req.method === 'POST') {
    try {
      let body = req.body;
      if (typeof body === 'string') {
        try {
          body = JSON.parse(body);
        } catch {
          body = {};
        }
      }
      if (!body || typeof body !== 'object') {
        return sendJson(res, 400, { ok: false, error: 'Invalid pulse payload' });
      }

      if (body.uid) {
        touchUserPresence(body.uid);
      }

      if (body.action === 'presence') {
        return sendJson(res, 200, {
          ok: true,
          onlineUids: getActiveOnlineUids()
        });
      }

      const recorded = recordServerNotificationPulse({
        title: body.title,
        body: body.body,
        tag: body.tag,
        url: body.url,
        timestampMs: body.timestampMs,
        targetUid: body.targetUid || null,
        excludeUid: body.excludeUid || null
      });

      return sendJson(res, 200, {
        ok: true,
        event: recorded,
        onlineUids: getActiveOnlineUids()
      });
    } catch (err: any) {
      return sendJson(res, 500, { ok: false, error: err?.message || 'Pulse post error' });
    }
  }

  // GET /api/notifications/pulse?since=<ms>&uid=<uid>&isAdmin=<0|1>
  const q = parseQuery(req);
  const sinceMs = Number(q.since || 0) || Date.now() - 60 * 1000;
  const uid = String(q.uid || '').trim();
  const isAdmin = q.isAdmin === '1' || q.isAdmin === 'true';

  if (uid) {
    touchUserPresence(uid);
  }

  const matchingEvents = pulseRingBuffer.filter((ev) => {
    if (ev.timestampMs <= sinceMs) return false;
    if (uid && ev.excludeUid && ev.excludeUid === uid) return false;
    if (ev.targetUid) {
      if (ev.targetUid === 'mbktrading') {
        return isAdmin;
      }
      return Boolean(uid && ev.targetUid === uid);
    }
    return true;
  });

  return sendJson(res, 200, {
    ok: true,
    serverTimeMs: Date.now(),
    onlineUids: getActiveOnlineUids(),
    events: matchingEvents.slice(-10)
  });
}
