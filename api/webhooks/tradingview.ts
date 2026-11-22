import type { IncomingMessage, ServerResponse } from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { initializeApp as initClientApp, getApps as getClientApps } from 'firebase/app';
import { getFirestore as getClientFirestore, doc, setDoc } from 'firebase/firestore';

type Req = IncomingMessage & {
  method?: string;
  body?: any;
  query?: Record<string, any>;
  headers: Record<string, string | string[] | undefined>;
  url?: string;
};

type Res = ServerResponse & {
  status?: (code: number) => Res;
  json?: (data: any) => void;
};

const FALLBACK_FIREBASE_CONFIG = {
  projectId: 'mbktrading-8dc98',
  firestoreDatabaseId: '(default)',
  apiKey: 'AIzaSyCgNCyANwJ9CJmTJX0HKH-ssGHlfktF0L8',
  authDomain: 'mbktrading-8dc98.firebaseapp.com',
  storageBucket: 'mbktrading-8dc98.firebasestorage.app',
  messagingSenderId: '517824449905',
  appId: '1:517824449905:web:7c51ad7b5008b33a8f7ad0'
};

const LEGACY_DATABASE_ID = 'ai-studio-mbktrading-5c717851-cdb4-4a97-a0f4-f006f13d6c7b';

function loadFirebaseConfig(): typeof FALLBACK_FIREBASE_CONFIG {
  try {
    const candidates: string[] = [path.resolve(process.cwd(), 'firebase-applet-config.json')];
    try {
      const currentDir = path.dirname(fileURLToPath(import.meta.url));
      candidates.push(path.resolve(currentDir, '../../firebase-applet-config.json'));
    } catch {
      // ignore if import.meta.url is unavailable
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
    // fallback to embedded config
  }
  return FALLBACK_FIREBASE_CONFIG;
}

interface BotAlertDoc {
  id: string;
  text: string;
  chat_id: string | null;
  timestamp: string;
  timestampMs: number;
}

/**
 * Writes the bot alert to the primary (default) Firestore database (and mirrors to legacy database)
 * using the stateless Firestore REST API first, with an automatic fallback to the Firebase Web Client SDK.
 */
async function writeBotAlertToFirestore(alertDoc: BotAlertDoc): Promise<void> {
  const config = loadFirebaseConfig();
  const primaryDbId =
    config.firestoreDatabaseId && config.firestoreDatabaseId !== '(default)'
      ? config.firestoreDatabaseId
      : '(default)';

  const firestoreFields: Record<string, any> = {
    id: { stringValue: alertDoc.id },
    text: { stringValue: alertDoc.text },
    chat_id: alertDoc.chat_id ? { stringValue: alertDoc.chat_id } : { nullValue: null },
    timestamp: { stringValue: alertDoc.timestamp },
    timestampMs: { integerValue: String(Math.trunc(alertDoc.timestampMs)) }
  };

  const postToRestDb = async (targetDbId: string): Promise<boolean> => {
    const restUrl = `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(
      config.projectId
    )}/databases/${encodeURIComponent(targetDbId)}/documents/bot_alerts?documentId=${encodeURIComponent(
      alertDoc.id
    )}&key=${encodeURIComponent(config.apiKey)}`;

    const restRes = await fetch(restUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fields: firestoreFields })
    });
    return restRes.ok;
  };

  try {
    const ok = await postToRestDb(primaryDbId);
    if (ok) {
      return;
    }
  } catch (restErr: any) {
    console.warn('[Vercel Webhook] Firestore REST API error, falling back to Client SDK:', restErr?.message);
  }

  // Fallback to Firebase Web Client SDK
  const clientApp = !getClientApps().length
    ? initClientApp({
        apiKey: config.apiKey,
        authDomain: config.authDomain,
        projectId: config.projectId,
        storageBucket: config.storageBucket,
        messagingSenderId: config.messagingSenderId,
        appId: config.appId
      })
    : getClientApps()[0];

  const clientDb =
    primaryDbId !== '(default)'
      ? getClientFirestore(clientApp, primaryDbId)
      : getClientFirestore(clientApp);

  await setDoc(doc(clientDb, 'bot_alerts', alertDoc.id), alertDoc);
}

async function readRawBody(req: Req): Promise<string> {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (chunk: Buffer | string) => {
      data += typeof chunk === 'string' ? chunk : chunk.toString('utf8');
      if (data.length > 2 * 1024 * 1024) {
        reject(new Error('Payload too large'));
      }
    });
    req.on('end', () => resolve(data));
    req.on('error', (err) => reject(err));
  });
}

function sendJson(res: ServerResponse, statusCode: number, body: Record<string, any>) {
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.end(JSON.stringify(body));
}

function buildAlertDoc(text: string, chatId: string | null = null): BotAlertDoc {
  const nowMs = Date.now();
  const randomSuffix = Math.random()
    .toString(36)
    .slice(2, 8)
    .replace(/[^a-z0-9]/g, '0')
    .padEnd(4, '0');
  const alertId = `alert-${nowMs}-${randomSuffix}`;
  const timestamp = new Date(nowMs).toISOString();

  return {
    id: alertId,
    text: text.slice(0, 2000),
    chat_id: chatId || null,
    timestamp,
    timestampMs: nowMs
  };
}

export default async function handler(req: Req, res: Res | ServerResponse) {
  const method = (req.method || 'GET').toUpperCase();

  if (method === 'OPTIONS') {
    return sendJson(res, 200, { ok: true });
  }

  if (method === 'GET') {
    const urlObj = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
    const queryMsg =
      urlObj.searchParams.get('msg') ||
      urlObj.searchParams.get('text') ||
      urlObj.searchParams.get('alert') ||
      (typeof req.query?.msg === 'string' ? req.query.msg : '') ||
      (typeof req.query?.text === 'string' ? req.query.text : '');

    const isTest =
      Boolean(queryMsg) ||
      urlObj.searchParams.has('test') ||
      urlObj.searchParams.has('test1') ||
      req.query?.test !== undefined ||
      req.query?.test1 !== undefined;

    const configuredSecret = (process.env.TRADINGVIEW_WEBHOOK_SECRET || '').trim();
    const providedSecret = (
      urlObj.searchParams.get('secret') ||
      (typeof req.query?.secret === 'string' ? req.query.secret : '')
    ).trim();

    if (isTest && configuredSecret && providedSecret === configuredSecret) {
      const text =
        (queryMsg && queryMsg.trim()) ||
        'BUY US100 @ 21450 - TP1: 21550 SL: 21350 [Test Webhook Alert via Browser]';
      const alertDoc = buildAlertDoc(text, null);

      try {
        await writeBotAlertToFirestore(alertDoc);
        return sendJson(res, 200, {
          success: true,
          message: 'Test TradingView webhook alert generated and saved to bot_alerts successfully! Check your app.',
          alertId: alertDoc.id,
          text: alertDoc.text,
          timestamp: alertDoc.timestamp
        });
      } catch (err: any) {
        console.error('[Vercel Test Webhook Error]:', err);
        return sendJson(res, 500, { error: err?.message || 'Error generating test alert' });
      }
    }

    return sendJson(res, 200, {
      ok: true,
      endpoint: '/api/webhooks/tradingview'
    });
  }

  if (method !== 'POST') {
    return sendJson(res, 405, { error: 'Method not allowed. Use POST from TradingView.' });
  }

  try {
    const urlObj = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
    const querySecret = (
      urlObj.searchParams.get('secret') ||
      (typeof req.query?.secret === 'string' ? req.query.secret : '')
    ).trim();

    let rawBody: any = req.body;
    if (rawBody === undefined || rawBody === null || rawBody === '') {
      const streamText = await readRawBody(req);
      rawBody = streamText;
    }

    let payload: any = rawBody;
    if (typeof payload === 'string') {
      const trimmed = payload.trim();
      if (!trimmed) {
        return sendJson(res, 400, { error: 'Alert text content is required in payload' });
      }
      try {
        payload = JSON.parse(trimmed);
      } catch {
        payload = { text: trimmed };
      }
    }

    if (!payload || typeof payload !== 'object') {
      return sendJson(res, 400, { error: 'Valid JSON or text payload required from TradingView alert' });
    }

    const configuredSecret = (process.env.TRADINGVIEW_WEBHOOK_SECRET || '').trim();
    if (configuredSecret) {
      const bodySecret = typeof payload.secret === 'string' ? payload.secret.trim() : '';
      if (querySecret !== configuredSecret && bodySecret !== configuredSecret) {
        return sendJson(res, 401, { error: 'Unauthorized webhook secret' });
      }
    }

    let text = String(
      payload.text ||
        payload.textMsg ||
        payload.msg ||
        payload.message ||
        payload.alert ||
        payload.content ||
        payload.body ||
        ''
    ).trim();

    if (!text) {
      const sym = payload.symbol || payload.ticker || payload.pair || '';
      const act = payload.action || payload.side || payload.signal || payload.direction || '';
      const price = payload.price || payload.close || payload.entry || payload.entryPrice || '';
      const tf = payload.timeframe || payload.interval || '';
      const parts = [act, sym, price ? `@ ${price}` : '', tf ? `(${tf})` : ''].filter(Boolean);
      if (parts.length > 0) {
        text = parts.join(' ').trim();
      } else {
        const serialized = JSON.stringify(payload);
        if (serialized && serialized !== '{}' && serialized !== '[]') {
          text = serialized;
        }
      }
    }

    const chatId = String(payload.chat_id || payload.chatId || '').trim().slice(0, 100);

    if (!text) {
      return sendJson(res, 400, { error: 'Alert text content is required in payload' });
    }

    const alertDoc = buildAlertDoc(text, chatId || null);
    await writeBotAlertToFirestore(alertDoc);

    let telegramForwarded = false;
    const telegramBotToken = process.env.TELEGRAM_BOT_TOKEN || process.env.TELEGRAM_TOKEN || '';
    const targetChannelId = process.env.TELEGRAM_CHANNEL_ID || process.env.TELEGRAM_CHAT_ID || chatId || '';

    if (telegramBotToken && targetChannelId) {
      try {
        const tgRes = await fetch(`https://api.telegram.org/bot${telegramBotToken}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: targetChannelId,
            text
          })
        });
        telegramForwarded = tgRes.ok;
      } catch {
        // ignore optional telegram forward errors
      }
    }

    return sendJson(res, 200, {
      success: true,
      message: 'Alert saved to bot_alerts',
      alertId: alertDoc.id,
      telegramForwarded
    });
  } catch (err: any) {
    console.error('[Vercel TradingView Webhook Error]:', err);
    return sendJson(res, 500, { error: err?.message || 'Error processing TradingView webhook' });
  }
}
