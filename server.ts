import express from 'express';
import axios from 'axios';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  initializeApp as initAdminApp,
  getApps as getAdminApps,
  getApp as getAdminApp,
  applicationDefault
} from 'firebase-admin/app';
import { getFirestore as getAdminFirestore, type Firestore as AdminFirestore } from 'firebase-admin/firestore';
import { store } from './server/store.js';
import { getSignalsFromFirestore, saveBotAlertToFirestore } from './server/firebaseDb.js';
import marketNewsHandler from './api/market/news.js';
import marketCalendarHandler from './api/market/calendar.js';
import marketQuotesHandler from './api/market/quotes.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = parseInt(process.env.PORT || '3000', 10);

app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true, limit: '2mb' }));
app.use(express.text({ type: 'text/*', limit: '2mb' }));

// Initialize official @google/genai SDK strictly from server environment variable
const apiKey = process.env.GEMINI_API_KEY;
let googleGenAIClient: GoogleGenAI | null = null;

if (apiKey) {
  googleGenAIClient = new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build'
      }
    }
  });
}

// ==========================================
// 1. FIREBASE ADMIN SDK (Application Default Credentials)
// ==========================================
let adminDb: AdminFirestore | null = null;
try {
  const configPath = path.resolve(__dirname, 'firebase-applet-config.json');
  if (fs.existsSync(configPath)) {
    const rawConfig = fs.readFileSync(configPath, 'utf-8');
    const firebaseConfig = JSON.parse(rawConfig);
    const adminApp = !getAdminApps().length
      ? initAdminApp({
          credential: applicationDefault(),
          projectId: firebaseConfig.projectId
        })
      : getAdminApp();

    adminDb =
      firebaseConfig.firestoreDatabaseId && firebaseConfig.firestoreDatabaseId !== '(default)'
        ? getAdminFirestore(adminApp, firebaseConfig.firestoreDatabaseId)
        : getAdminFirestore(adminApp);
    adminDb.settings({ ignoreUndefinedProperties: true });
    console.log(
      '[Firebase Admin SDK] Initialized in server.ts with applicationDefault() for database:',
      firebaseConfig.firestoreDatabaseId || '(default)'
    );
  }
} catch (err: any) {
  console.warn('[Firebase Admin SDK] Initialization notice in server.ts:', err.message);
}

// ==========================================
// 1B. REAL SERVER-CACHED MARKET NEWS, ECONOMIC CALENDAR & QUOTES
// ==========================================
app.get('/api/market/news', (req, res) => marketNewsHandler(req, res));
app.get('/api/market/calendar', (req, res) => marketCalendarHandler(req, res));
app.get('/api/market/quotes', (req, res) => marketQuotesHandler(req, res));

// ==========================================
// 2. TRADING IDEAS FEED (Real Firestore market_ideas only — Zero Hardcoded Mock Setups)
// ==========================================
app.get(['/api/tradingview/ideas', '/api/ideas', '/api/ideas/:symbol'], async (req, res) => {
  try {
    const symbolParam = (req.params.symbol || (req.query.symbol as string)) || '';
    const cleanSym = symbolParam.toUpperCase();
    const firestoreIdeas: any[] = [];

    if (adminDb) {
      try {
        const snap = await adminDb
          .collection('market_ideas')
          .orderBy('timestampMs', 'desc')
          .limit(15)
          .get();

        snap.forEach((docSnap) => {
          const d = docSnap.data();
          if (!d) return;
          const docSym = String(d.symbol || '').toUpperCase();
          if (cleanSym && docSym && !docSym.includes(cleanSym) && !cleanSym.includes(docSym)) {
            return;
          }
          firestoreIdeas.push({
            id: docSnap.id,
            title: String(d.titleEn || d.title || d.titleAr || '').trim(),
            titleAr: String(d.titleAr || d.title || d.titleEn || '').trim(),
            author: String(d.author || d.authorName || 'MBK Analyst'),
            link: String(d.link || d.chartUrl || `https://www.tradingview.com/symbols/${docSym || 'XAUUSD'}/ideas/`),
            pubDate: String(d.createdAt || d.pubDate || new Date().toISOString())
          });
        });
      } catch {
        // ignore adminDb query fallback
      }
    }

    return res.json({
      success: true,
      symbol: cleanSym || 'ALL',
      ideas: firestoreIdeas
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// 3. TRADINGVIEW WEBHOOK ALERTS RECEIVER (Open by design for Pine Script alerts)
// ==========================================
app.get(['/api/webhooks/tradingview', '/api/webhook/tradingview'], async (req, res) => {
  const queryMsg =
    (typeof req.query.msg === 'string' && req.query.msg) ||
    (typeof req.query.text === 'string' && req.query.text) ||
    (typeof req.query.alert === 'string' && req.query.alert) ||
    '';
  const isTest =
    Boolean(queryMsg) ||
    req.query.test !== undefined ||
    req.query.test1 !== undefined;

  if (isTest) {
    try {
      const text =
        (queryMsg && queryMsg.trim()) ||
        'BUY US100 @ 21450 - TP1: 21550 SL: 21350 [Test Webhook Alert via Browser]';
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
        chat_id: null,
        timestamp,
        timestampMs: nowMs
      };
      await saveBotAlertToFirestore(alertDoc);
      return res.status(200).json({
        success: true,
        message: 'Test TradingView webhook alert generated and saved to bot_alerts successfully! Check your app.',
        alertId,
        text: alertDoc.text,
        timestamp
      });
    } catch (err: any) {
      return res.status(500).json({ error: err?.message || 'Error generating test alert' });
    }
  }

  res.status(200).json({
    ok: true,
    endpoint: '/api/webhooks/tradingview',
    method: 'POST / GET (with ?test=1 or ?test1 or ?msg=...)',
    message: 'MBK TradingView Webhook Receiver is active. Send POST JSON/text alerts from TradingView, or open this URL with ?test=1 to trigger an instant test alert.'
  });
});

app.post(['/api/webhooks/tradingview', '/api/webhook/tradingview'], async (req, res) => {
  try {
    let payload: any = req.body;
    if (typeof payload === 'string') {
      const trimmedBody = payload.trim();
      if (!trimmedBody) {
        return res.status(400).json({ error: 'Alert text content is required in payload' });
      }
      try {
        payload = JSON.parse(trimmedBody);
      } catch {
        payload = { text: trimmedBody };
      }
    }

    if (!payload || typeof payload !== 'object') {
      return res.status(400).json({ error: 'Valid JSON or text payload required from TradingView alert' });
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
      return res.status(400).json({ error: 'Alert text content is required in payload' });
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

    await saveBotAlertToFirestore(alertDoc);

    let telegramForwarded = false;
    let telegramNotice: string | null = null;
    const telegramBotToken = process.env.TELEGRAM_BOT_TOKEN || process.env.TELEGRAM_TOKEN || '';
    const targetChannelId = process.env.TELEGRAM_CHANNEL_ID || process.env.TELEGRAM_CHAT_ID || chatId || '';

    if (telegramBotToken && targetChannelId) {
      const telegramApiUrl = `https://api.telegram.org/bot${telegramBotToken}/sendMessage`;
      try {
        await axios.post(
          telegramApiUrl,
          {
            chat_id: targetChannelId,
            text,
            parse_mode: 'HTML'
          },
          {
            headers: { 'Content-Type': 'application/json' },
            timeout: 6000
          }
        );
        telegramForwarded = true;
      } catch {
        try {
          await axios.post(
            telegramApiUrl,
            { chat_id: targetChannelId, text },
            {
              headers: { 'Content-Type': 'application/json' },
              timeout: 6000
            }
          );
          telegramForwarded = true;
        } catch (fallbackErr: any) {
          telegramNotice = fallbackErr.response?.data?.description || fallbackErr.message;
        }
      }
    }

    return res.status(200).json({
      success: true,
      message: 'Alert saved to bot_alerts',
      alertId,
      telegramForwarded,
      ...(telegramNotice ? { telegramNotice } : {})
    });
  } catch (err: any) {
    console.error('[TradingView Webhook Error]:', err);
    return res.status(500).json({ error: err.message || 'Error processing TradingView webhook' });
  }
});

// ==========================================
// 4. READ-ONLY SIGNALS FEED SNAPSHOTS (Mutations governed strictly by Firestore Rules)
// ==========================================
app.get(['/api/signals', '/api/trades'], async (_req, res) => {
  try {
    const trades = await getSignalsFromFirestore(50);
    const publicOnly = trades.filter(
      (t) => t.accessLevel === 'free' || t.access_level === 'free' || t.accessLevel === 'all'
    );
    res.json({
      success: true,
      count: publicOnly.length,
      signals: publicOnly,
      trades: publicOnly
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// 5. SERVER-SIDE GEMINI ASSISTANT (@google/genai)
// ==========================================
app.post(['/api/gemini/chat', '/api/gemini/agent'], async (req, res) => {
  try {
    const { query = '', activeSymbol = 'US100', currentPrice = 20892.4 } = req.body || {};

    const cleanQuery = typeof query === 'string' ? query.trim() : '';
    if (!cleanQuery) {
      return res.status(400).json({ error: 'Query message is required.' });
    }

    const serverKey = process.env.GEMINI_API_KEY;
    const client =
      googleGenAIClient ||
      (serverKey
        ? new GoogleGenAI({
            apiKey: serverKey,
            httpOptions: { headers: { 'User-Agent': 'aistudio-build' } }
          })
        : null);

    if (!client) {
      return res.status(503).json({
        error: 'Gemini API key is not configured on the server.'
      });
    }

    const systemInstruction = `You are the MBK Trading Assistant. Answer the user's specific questions conversationally, naturally, and concisely in the language they speak. Do not force market analysis unless explicitly asked. Do not provide personalized financial advice. Context if relevant: Active chart symbol is ${activeSymbol} at price ${currentPrice}.`;

    const response = await client.models.generateContent({
      model: 'gemini-4-hydrogen',
      contents: cleanQuery,
      config: {
        systemInstruction
      }
    });

    const text = (response.text || '').trim();
    if (!text) {
      return res.status(502).json({
        error: 'Empty response received from Gemini model.'
      });
    }

    return res.json({
      reply: text,
      sources: [],
      modelUsed: 'gemini-4-hydrogen',
      activeSymbol,
      currentPrice,
      timestamp: new Date().toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })
    });
  } catch (err: any) {
    console.error('[/api/gemini/chat ERROR]:', err?.message || err);
    return res.status(502).json({
      error: err?.message || 'Failed to generate AI response.'
    });
  }
});

// Setup Vite or static serving
async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';

  app.use((req, res, next) => {
    if (req.path === '/' || req.path === '/index.html' || req.path.startsWith('/sw.js')) {
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
    }
    next();
  });

  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    app.use(
      express.static(path.resolve(__dirname, 'dist'), {
        setHeaders: (res, filePath) => {
          if (filePath.endsWith('index.html') || filePath.endsWith('sw.js')) {
            res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
          }
        }
      })
    );
    app.get('*', (_req, res) => {
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(port, '0.0.0.0', () => {
    console.log(`MBKtrading Server running on http://0.0.0.0:${port}`);
  });
}

startServer();
