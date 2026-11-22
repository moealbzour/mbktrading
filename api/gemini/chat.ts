import type { IncomingMessage, ServerResponse } from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';
import { getCachedLiveQuotes, type LiveMarketQuote } from '../market/quotes.js';
import { getCachedCalendarEvents, type EconomicCalendarApiEvent } from '../market/calendar.js';

type Req = IncomingMessage & {
  method?: string;
  body?: any;
};

interface UserRateBucket {
  lastRequestMs: number;
  hourlyTimestamps: number[];
  dailyTimestamps: number[];
}

const MIN_COOLDOWN_MS = 3 * 1000; // 3 seconds between messages
const MAX_REQUESTS_PER_HOUR = 20;
const MAX_REQUESTS_PER_DAY = 60;
const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;
const SNAPSHOT_TIMEOUT_MS = 2500;

const userRateBuckets = new Map<string, UserRateBucket>();

let cachedFirebaseApiKey: string | null = null;

function getFirebaseApiKey(): string {
  if (cachedFirebaseApiKey) return cachedFirebaseApiKey;

  const candidates: string[] = [];
  try {
    candidates.push(path.resolve(process.cwd(), 'firebase-applet-config.json'));
  } catch {
    // ignore
  }
  try {
    const __dirname = path.dirname(fileURLToPath(import.meta.url));
    candidates.push(path.resolve(__dirname, '../../firebase-applet-config.json'));
  } catch {
    // ignore
  }

  for (const configPath of candidates) {
    try {
      if (fs.existsSync(configPath)) {
        const parsed = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
        if (parsed?.apiKey && typeof parsed.apiKey === 'string') {
          const key = parsed.apiKey.trim();
          cachedFirebaseApiKey = key;
          return key;
        }
      }
    } catch {
      // ignore
    }
  }

  return (process.env.VITE_FIREBASE_API_KEY || '').trim();
}

async function verifyFirebaseIdToken(
  authHeader: string | string[] | undefined
): Promise<string | null> {
  const headerStr = Array.isArray(authHeader) ? authHeader[0] : authHeader;
  if (!headerStr || !headerStr.startsWith('Bearer ')) {
    return null;
  }

  const idToken = headerStr.slice('Bearer '.length).trim();
  if (!idToken) return null;

  const apiKey = getFirebaseApiKey();
  if (!apiKey) return null;

  try {
    const verifyRes = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${encodeURIComponent(apiKey)}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken })
      }
    );
    if (!verifyRes.ok) return null;
    const data = await verifyRes.json();
    const uid =
      Array.isArray(data?.users) &&
      data.users.length > 0 &&
      typeof data.users[0]?.localId === 'string'
        ? data.users[0].localId.trim()
        : '';
    return uid || null;
  } catch {
    return null;
  }
}

function checkAndRecordUserRateLimit(
  uid: string,
  lang: 'ar' | 'en'
): { allowed: true } | { allowed: false; message: string; retryAfterSeconds: number } {
  const nowMs = Date.now();
  let bucket = userRateBuckets.get(uid);
  if (!bucket) {
    bucket = {
      lastRequestMs: 0,
      hourlyTimestamps: [],
      dailyTimestamps: []
    };
    userRateBuckets.set(uid, bucket);
  }

  // Prune expired timestamps
  bucket.hourlyTimestamps = bucket.hourlyTimestamps.filter((ts) => nowMs - ts < HOUR_MS);
  bucket.dailyTimestamps = bucket.dailyTimestamps.filter((ts) => nowMs - ts < DAY_MS);

  // 1. Minimum 3-second cooldown
  const elapsedSinceLast = nowMs - bucket.lastRequestMs;
  if (bucket.lastRequestMs > 0 && elapsedSinceLast < MIN_COOLDOWN_MS) {
    const waitSec = Math.max(1, Math.ceil((MIN_COOLDOWN_MS - elapsedSinceLast) / 1000));
    return {
      allowed: false,
      retryAfterSeconds: waitSec,
      message:
        lang === 'ar'
          ? `يرجى الانتظار ${waitSec} ثوانٍ قبل إرسال الرسالة التالية.`
          : `Please wait ${waitSec} seconds before sending another message.`
    };
  }

  // 2. Max 20 requests per hour
  if (bucket.hourlyTimestamps.length >= MAX_REQUESTS_PER_HOUR) {
    const oldestHourTs = bucket.hourlyTimestamps[0] || nowMs;
    const waitMin = Math.max(1, Math.ceil((HOUR_MS - (nowMs - oldestHourTs)) / 60000));
    return {
      allowed: false,
      retryAfterSeconds: waitMin * 60,
      message:
        lang === 'ar'
          ? `لقد وصلت إلى الحد الأقصى للرسائل في الساعة (${MAX_REQUESTS_PER_HOUR} رسالة/ساعة). يرجى المحاولة بعد ${waitMin} دقيقة.`
          : `Hourly message limit reached (${MAX_REQUESTS_PER_HOUR} requests/hour). Please try again in ${waitMin} minutes.`
    };
  }

  // 3. Max 60 requests per day
  if (bucket.dailyTimestamps.length >= MAX_REQUESTS_PER_DAY) {
    return {
      allowed: false,
      retryAfterSeconds: 3600,
      message:
        lang === 'ar'
          ? `لقد وصلت إلى الحد اليومي للمساعد الذكي (${MAX_REQUESTS_PER_DAY} رسالة/يوم). يتجدد الرصيد تلقائياً خلال 24 ساعة.`
          : `Daily AI assistant limit reached (${MAX_REQUESTS_PER_DAY} requests/day). Quota resets automatically within 24 hours.`
    };
  }

  bucket.lastRequestMs = nowMs;
  bucket.hourlyTimestamps.push(nowMs);
  bucket.dailyTimestamps.push(nowMs);
  return { allowed: true };
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number, fallback: T): Promise<T> {
  return new Promise<T>((resolve) => {
    const timer = setTimeout(() => resolve(fallback), timeoutMs);
    promise
      .then((val) => {
        clearTimeout(timer);
        resolve(val);
      })
      .catch(() => {
        clearTimeout(timer);
        resolve(fallback);
      });
  });
}

async function buildLiveMarketSnapshot(
  activeSymbol: string,
  fallbackPrice?: number
): Promise<{ snapshotText: string; resolvedActivePrice: number }> {
  const [quotesSettled, calendarSettled] = await Promise.allSettled([
    withTimeout<LiveMarketQuote[]>(getCachedLiveQuotes(), SNAPSHOT_TIMEOUT_MS, []),
    withTimeout<EconomicCalendarApiEvent[]>(getCachedCalendarEvents(), SNAPSHOT_TIMEOUT_MS, [])
  ]);

  const quotes = quotesSettled.status === 'fulfilled' ? quotesSettled.value : [];
  const calendarEvents = calendarSettled.status === 'fulfilled' ? calendarSettled.value : [];

  const cleanActiveSym = String(activeSymbol || 'US100').toUpperCase().trim();
  const activeQuote = quotes.find((q) => q.symbol.toUpperCase() === cleanActiveSym);
  const resolvedActivePrice =
    activeQuote && activeQuote.price > 0
      ? activeQuote.price
      : typeof fallbackPrice === 'number' && fallbackPrice > 0
      ? fallbackPrice
      : 0;

  const coreOrder = ['XAUUSD', 'US100', 'EURUSD', 'GBPUSD', 'WTI', 'BTCUSD'];
  const quoteLines: string[] = [];
  for (const sym of coreOrder) {
    const q = quotes.find((item) => item.symbol.toUpperCase() === sym);
    if (q && q.price > 0) {
      const sign = q.change >= 0 ? '+' : '';
      quoteLines.push(
        `- ${q.symbol}: ${q.price} (${sign}${q.change} / ${sign}${q.changePercent}% | High: ${q.high}, Low: ${q.low})`
      );
    }
  }

  const nowMs = Date.now();
  const upcomingHigh = calendarEvents
    .filter((ev) => ev.impact === 'High' && ev.timestampMs >= nowMs - 15 * 60 * 1000)
    .sort((a, b) => a.timestampMs - b.timestampMs)
    .slice(0, 5);

  const eventLines = upcomingHigh.map((ev) => {
    const utcTime = new Date(ev.timestampMs).toISOString().replace('T', ' ').slice(0, 16) + ' UTC';
    const fc = ev.forecast ? `Forecast: ${ev.forecast}` : 'Forecast: N/A';
    const prev = ev.previous ? `Prev: ${ev.previous}` : 'Prev: N/A';
    const act = ev.actual ? ` | Actual: ${ev.actual}` : '';
    return `- [${ev.currency}] ${ev.title} @ ${utcTime} (${fc}, ${prev}${act})`;
  });

  const nowUtc = new Date(nowMs).toISOString();
  const snapshotText = [
    `=== LIVE MARKET SNAPSHOT (UTC: ${nowUtc}) ===`,
    `Active User Chart Symbol: ${cleanActiveSym}${resolvedActivePrice > 0 ? ` (Live Price: ${resolvedActivePrice})` : ''}`,
    `Live Server-Cached Quotes:`,
    quoteLines.length > 0 ? quoteLines.join('\n') : '- Live quotes currently refreshing',
    `Next 5 Upcoming High-Impact Economic Releases:`,
    eventLines.length > 0
      ? eventLines.join('\n')
      : '- No high-impact releases in the immediate window'
  ].join('\n');

  return { snapshotText, resolvedActivePrice };
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
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.end(JSON.stringify(body));
}

export default async function handler(req: Req, res: ServerResponse) {
  const method = (req.method || 'POST').toUpperCase();

  if (method === 'OPTIONS') {
    return sendJson(res, 200, { ok: true });
  }

  if (method !== 'POST') {
    return sendJson(res, 405, { error: 'Method not allowed' });
  }

  const verifiedUid = await verifyFirebaseIdToken(req.headers?.authorization);
  if (!verifiedUid) {
    return sendJson(res, 401, { error: 'Unauthorized: Valid Firebase ID token is required.' });
  }

  try {
    let body = req.body;
    if (!body) {
      const raw = await readRawBody(req);
      body = raw ? JSON.parse(raw) : {};
    } else if (typeof body === 'string') {
      body = JSON.parse(body);
    }

    const {
      query = '',
      activeSymbol = 'US100',
      currentPrice = 0,
      lang: rawLang = 'ar',
      history = []
    } = body || {};

    const lang: 'ar' | 'en' = rawLang === 'en' ? 'en' : 'ar';
    const cleanQuery = typeof query === 'string' ? query.trim().slice(0, 1500) : '';

    if (!cleanQuery) {
      return sendJson(res, 400, { error: 'Query message is required.' });
    }

    // Per-UID rate limit check (3s cooldown, 20/hr, 60/day)
    const rateCheck = checkAndRecordUserRateLimit(verifiedUid, lang);
    if (!rateCheck.allowed) {
      res.setHeader('Retry-After', String(rateCheck.retryAfterSeconds));
      return sendJson(res, 429, {
        error: rateCheck.message,
        retryAfterSeconds: rateCheck.retryAfterSeconds
      });
    }

    const serverKey = process.env.GEMINI_API_KEY;
    if (!serverKey) {
      return sendJson(res, 503, { error: 'Gemini API key is not configured on the server.' });
    }

    const { snapshotText, resolvedActivePrice } = await buildLiveMarketSnapshot(
      activeSymbol,
      typeof currentPrice === 'number' ? currentPrice : Number(currentPrice) || 0
    );

    const client = new GoogleGenAI({
      apiKey: serverKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build'
        }
      }
    });

    const langDirective =
      lang === 'ar'
        ? 'Respond in clear, professional institutional Arabic (العربية). Use standard trading terms (مثل: السيولة، وقف الخسارة، XAUUSD، US100).'
        : 'Respond in crisp, professional institutional English.';

    const systemInstruction = [
      'You are the MBK Trading Institutional Assistant.',
      langDirective,
      'Rules:',
      '1. Answer the trader concisely, accurately, and directly (aim for under 250 words unless detailed breakdown is requested).',
      '2. Use ONLY the real live prices and upcoming High-Impact macro events provided in the LIVE MARKET SNAPSHOT below. NEVER invent outdated prices, fake news headlines, or fabricated economic events.',
      '3. Anchor market context to the user’s Active Chart Symbol when relevant, without forcing unsolicited trade calls or personalized financial advice.',
      '',
      snapshotText
    ].join('\n');

    // Cap conversation history to the last 6 messages
    const rawHistoryList = Array.isArray(history) ? history.slice(-6) : [];
    const contents: Array<{ role: 'user' | 'model'; parts: Array<{ text: string }> }> = [];

    for (const turn of rawHistoryList) {
      if (!turn || typeof turn !== 'object') continue;
      const turnRole = turn.role === 'model' ? 'model' : turn.role === 'user' ? 'user' : null;
      const turnText = typeof turn.text === 'string' ? turn.text.trim().slice(0, 1200) : '';
      if (!turnRole || !turnText) continue;
      // Avoid duplicate trailing user message if the client already included the current query in history
      if (turnRole === 'user' && turnText === cleanQuery) continue;
      contents.push({
        role: turnRole,
        parts: [{ text: turnText }]
      });
    }

    contents.push({
      role: 'user',
      parts: [{ text: cleanQuery }]
    });

    const response = await client.models.generateContent({
      model: 'gemini-4-hydrogen',
      contents,
      config: {
        systemInstruction,
        maxOutputTokens: 700
      }
    });

    const text = (response.text || '').trim();
    if (!text) {
      return sendJson(res, 502, { error: 'Empty response received from Gemini model.' });
    }

    return sendJson(res, 200, {
      reply: text,
      sources: [],
      modelUsed: 'gemini-4-hydrogen',
      activeSymbol,
      currentPrice: resolvedActivePrice || currentPrice,
      timestamp: new Date().toLocaleTimeString(lang === 'ar' ? 'ar-SA' : 'en-US', {
        hour: '2-digit',
        minute: '2-digit'
      })
    });
  } catch (err: any) {
    console.error('[Vercel /api/gemini/chat ERROR]:', err?.message || err);
    return sendJson(res, 502, { error: err?.message || 'Failed to generate AI response.' });
  }
}
