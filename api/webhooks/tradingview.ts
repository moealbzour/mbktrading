import type { IncomingMessage, ServerResponse } from 'http';
import fs from 'fs';
import path from 'path';
import {
  initializeApp as initAdminApp,
  getApps as getAdminApps,
  getApp as getAdminApp,
  applicationDefault
} from 'firebase-admin/app';
import { getFirestore as getAdminFirestore } from 'firebase-admin/firestore';
import { initializeApp as initClientApp, getApps as getClientApps } from 'firebase/app';
import { getFirestore as getClientFirestore, doc, setDoc } from 'firebase/firestore';

type Req = IncomingMessage & {
  method?: string;
  body?: any;
  headers: Record<string, string | string[] | undefined>;
  url?: string;
};

type Res = ServerResponse & {
  status: (code: number) => Res;
  json: (data: any) => void;
};

function loadFirebaseConfig(): Record<string, any> {
  const candidates = [
    path.resolve(process.cwd(), 'firebase-applet-config.json'),
    path.resolve(path.dirname(new URL(import.meta.url).pathname), '../../firebase-applet-config.json'),
    path.resolve(__dirname, '../../firebase-applet-config.json')
  ];
  for (const filePath of candidates) {
    if (fs.existsSync(filePath)) {
      return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    }
  }
  throw new Error('firebase-applet-config.json not found');
}

function getAdminDb() {
  const config = loadFirebaseConfig();
  const adminApp = !getAdminApps().length
    ? initAdminApp({
        credential: applicationDefault(),
        projectId: config.projectId
      })
    : getAdminApp();

  const db =
    config.firestoreDatabaseId && config.firestoreDatabaseId !== '(default)'
      ? getAdminFirestore(adminApp, config.firestoreDatabaseId)
      : getAdminFirestore(adminApp);
  db.settings({ ignoreUndefinedProperties: true });
  return db;
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

export default async function handler(req: Req, res: Res | ServerResponse) {
  const method = (req.method || 'GET').toUpperCase();

  if (method === 'OPTIONS') {
    return sendJson(res, 200, { ok: true });
  }

  if (method === 'GET') {
    const urlObj = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
    const queryMsg = urlObj.searchParams.get('msg') || urlObj.searchParams.get('text') || urlObj.searchParams.get('alert');
    const isTest = urlObj.searchParams.get('test') === '1' || queryMsg;

    if (isTest) {
      const text = queryMsg || 'BUY US100 @ 21450 - TP1: 21550 SL: 21350 [Test Webhook Alert via Browser GET]';
      const nowMs = Date.now();
      const randomSuffix = Math.random().toString(36).slice(2, 8);
      const alertId = `alert-${nowMs}-${randomSuffix}`;
      const timestamp = new Date(nowMs).toISOString();
      const alertDoc = {
        id: alertId,
        text,
        chat_id: null,
        timestamp,
        timestampMs: nowMs
      };

      try {
        let saved = false;
        try {
          const db = getAdminDb();
          await db.collection('bot_alerts').doc(alertId).set(alertDoc);
          saved = true;
        } catch {
          // fallback to client SDK
        }

        if (!saved) {
          const config = loadFirebaseConfig();
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
            config.firestoreDatabaseId && config.firestoreDatabaseId !== '(default)'
              ? getClientFirestore(clientApp, config.firestoreDatabaseId)
              : getClientFirestore(clientApp);
          await setDoc(doc(clientDb, 'bot_alerts', alertId), alertDoc);
        }

        return sendJson(res, 200, {
          success: true,
          message: 'Test TradingView webhook alert generated and saved to bot_alerts successfully! Check your app.',
          alertId,
          text
        });
      } catch (err: any) {
        return sendJson(res, 500, { error: err?.message || 'Error generating test alert' });
      }
    }

    return sendJson(res, 200, {
      ok: true,
      endpoint: '/api/webhooks/tradingview',
      method: 'POST / GET (with ?msg=... or ?test=1)',
      message: 'MBK TradingView Webhook Receiver is active. Send POST JSON alerts or open this URL with ?msg=BUY+US100+@+21000 or ?test=1 to test instantly in the app.'
    });
  }

  if (method !== 'POST') {
    return sendJson(res, 405, { error: 'Method not allowed. Use POST from TradingView.' });
  }

  try {
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

    const nowMs = Date.now();
    const randomSuffix = Math.random()
      .toString(36)
      .slice(2, 8)
      .replace(/[^a-z0-9]/g, '0')
      .padEnd(4, '0');
    const alertId = `alert-${nowMs}-${randomSuffix}`;
    const timestamp = new Date(nowMs).toISOString();

    const alertDoc = {
      id: alertId,
      text: text.slice(0, 2000),
      chat_id: chatId || null,
      timestamp,
      timestampMs: nowMs
    };

    let savedToFirestore = false;
    try {
      const db = getAdminDb();
      await db.collection('bot_alerts').doc(alertId).set(alertDoc);
      savedToFirestore = true;
    } catch (adminErr: any) {
      console.warn('[Vercel Webhook] Admin SDK write failed, falling back to Client SDK:', adminErr?.message);
      try {
        const config = loadFirebaseConfig();
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
          config.firestoreDatabaseId && config.firestoreDatabaseId !== '(default)'
            ? getClientFirestore(clientApp, config.firestoreDatabaseId)
            : getClientFirestore(clientApp);
        await setDoc(doc(clientDb, 'bot_alerts', alertId), alertDoc);
        savedToFirestore = true;
      } catch (clientErr: any) {
        console.error('[Vercel Webhook] Client SDK fallback also failed:', clientErr?.message);
        throw clientErr;
      }
    }

    if (!savedToFirestore) {
      throw new Error('Failed to save webhook alert to database');
    }

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
      alertId,
      telegramForwarded
    });
  } catch (err: any) {
    console.error('[Vercel TradingView Webhook Error]:', err);
    return sendJson(res, 500, { error: err?.message || 'Error processing TradingView webhook' });
  }
}
