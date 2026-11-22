import type { IncomingMessage, ServerResponse } from 'http';

export interface LiveMarketQuote {
  symbol: 'US100' | 'XAUUSD' | 'EURUSD' | 'GBPUSD' | 'WTI' | 'BTCUSD';
  price: number;
  change: number;
  changePercent: number;
  high: number;
  low: number;
  updatedAt: string;
}

interface QuotesCacheEntry {
  quotes: LiveMarketQuote[];
  cachedAt: string;
  expiresAtMs: number;
}

type Req = IncomingMessage & {
  method?: string;
  url?: string;
  query?: Record<string, any>;
};

const CACHE_TTL_MS = 30 * 1000; // 30 seconds
const UPSTREAM_TIMEOUT_MS = 5000; // 5 seconds
const BROWSER_USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

let quotesCache: QuotesCacheEntry | null = null;

const YAHOO_SYMBOLS: Array<{
  appSymbol: LiveMarketQuote['symbol'];
  yahooTicker: string;
  digits: number;
}> = [
  { appSymbol: 'US100', yahooTicker: 'NQ=F', digits: 2 },
  { appSymbol: 'XAUUSD', yahooTicker: 'GC=F', digits: 2 },
  { appSymbol: 'EURUSD', yahooTicker: 'EURUSD=X', digits: 5 },
  { appSymbol: 'GBPUSD', yahooTicker: 'GBPUSD=X', digits: 5 },
  { appSymbol: 'WTI', yahooTicker: 'CL=F', digits: 2 }
];

function roundTo(val: number, digits: number): number {
  const factor = Math.pow(10, digits);
  return Math.round(val * factor) / factor;
}

async function fetchYahooChartQuote(
  appSymbol: LiveMarketQuote['symbol'],
  yahooTicker: string,
  digits: number
): Promise<LiveMarketQuote | null> {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(
    yahooTicker
  )}?interval=1m&range=1d`;

  const res = await fetch(url, {
    method: 'GET',
    headers: {
      'User-Agent': BROWSER_USER_AGENT,
      Accept: 'application/json'
    },
    signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS)
  });

  if (!res.ok) {
    throw new Error(`Yahoo HTTP ${res.status} for ${yahooTicker}`);
  }

  const data = await res.json();
  const meta = data?.chart?.result?.[0]?.meta;
  if (!meta || typeof meta.regularMarketPrice !== 'number') {
    throw new Error(`Missing regularMarketPrice for ${yahooTicker}`);
  }

  const priceRaw = Number(meta.regularMarketPrice);
  const prevCloseRaw = Number(
    meta.chartPreviousClose ?? meta.previousClose ?? priceRaw
  );
  if (!Number.isFinite(priceRaw) || priceRaw <= 0) {
    return null;
  }

  const changeRaw =
    Number.isFinite(prevCloseRaw) && prevCloseRaw > 0 ? priceRaw - prevCloseRaw : 0;
  const changePctRaw =
    Number.isFinite(prevCloseRaw) && prevCloseRaw > 0
      ? (changeRaw / prevCloseRaw) * 100
      : 0;

  const highRaw = Number(meta.regularMarketDayHigh ?? priceRaw);
  const lowRaw = Number(meta.regularMarketDayLow ?? priceRaw);

  return {
    symbol: appSymbol,
    price: roundTo(priceRaw, digits),
    change: roundTo(changeRaw, digits),
    changePercent: roundTo(changePctRaw, 2),
    high: roundTo(Number.isFinite(highRaw) && highRaw > 0 ? highRaw : priceRaw, digits),
    low: roundTo(Number.isFinite(lowRaw) && lowRaw > 0 ? lowRaw : priceRaw, digits),
    updatedAt: new Date().toISOString()
  };
}

async function fetchBtcLiveQuote(): Promise<LiveMarketQuote | null> {
  try {
    const res = await fetch('https://api.binance.com/api/v3/ticker/24hr?symbol=BTCUSDT', {
      method: 'GET',
      headers: {
        'User-Agent': BROWSER_USER_AGENT,
        Accept: 'application/json'
      },
      signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS)
    });

    if (res.ok) {
      const data = await res.json();
      const price = Number(data?.lastPrice);
      const change = Number(data?.priceChange ?? 0);
      const changePercent = Number(data?.priceChangePercent ?? 0);
      const high = Number(data?.highPrice ?? price);
      const low = Number(data?.lowPrice ?? price);

      if (Number.isFinite(price) && price > 0) {
        return {
          symbol: 'BTCUSD',
          price: roundTo(price, 2),
          change: roundTo(Number.isFinite(change) ? change : 0, 2),
          changePercent: roundTo(Number.isFinite(changePercent) ? changePercent : 0, 2),
          high: roundTo(Number.isFinite(high) && high > 0 ? high : price, 2),
          low: roundTo(Number.isFinite(low) && low > 0 ? low : price, 2),
          updatedAt: new Date().toISOString()
        };
      }
    }
  } catch {
    // Fallback to Yahoo Finance BTC-USD if Binance is geo-blocked (HTTP 451)
  }

  return fetchYahooChartQuote('BTCUSD', 'BTC-USD', 2);
}

function sendJson(res: ServerResponse, statusCode: number, body: Record<string, any>) {
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'public, s-maxage=30, stale-while-revalidate=60');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.end(JSON.stringify(body));
}

export default async function handler(req: Req, res: ServerResponse) {
  const method = (req.method || 'GET').toUpperCase();

  if (method === 'OPTIONS') {
    return sendJson(res, 200, { ok: true });
  }

  if (method !== 'GET') {
    return sendJson(res, 405, { error: 'Method not allowed' });
  }

  const nowMs = Date.now();
  if (quotesCache && quotesCache.expiresAtMs > nowMs && quotesCache.quotes.length > 0) {
    return sendJson(res, 200, {
      quotes: quotesCache.quotes,
      source: 'live',
      cachedAt: quotesCache.cachedAt
    });
  }

  const tasks: Array<Promise<LiveMarketQuote | null>> = [
    ...YAHOO_SYMBOLS.map((item) =>
      fetchYahooChartQuote(item.appSymbol, item.yahooTicker, item.digits)
    ),
    fetchBtcLiveQuote()
  ];

  const settled = await Promise.allSettled(tasks);
  const quotes: LiveMarketQuote[] = [];

  for (const resItem of settled) {
    if (resItem.status === 'fulfilled' && resItem.value) {
      quotes.push(resItem.value);
    }
  }

  if (quotes.length > 0) {
    // Merge with previous cache for any individual symbol that timed out
    if (quotesCache && quotesCache.quotes.length > 0) {
      const seen = new Set(quotes.map((q) => q.symbol));
      for (const prev of quotesCache.quotes) {
        if (!seen.has(prev.symbol)) {
          quotes.push(prev);
        }
      }
    }

    const cachedAt = new Date(nowMs).toISOString();
    quotesCache = {
      quotes,
      cachedAt,
      expiresAtMs: nowMs + CACHE_TTL_MS
    };

    return sendJson(res, 200, {
      quotes,
      source: 'live',
      cachedAt
    });
  }

  if (quotesCache && quotesCache.quotes.length > 0) {
    return sendJson(res, 200, {
      quotes: quotesCache.quotes,
      source: 'live',
      cachedAt: quotesCache.cachedAt
    });
  }

  return sendJson(res, 200, {
    quotes: [],
    source: 'live',
    cachedAt: new Date(nowMs).toISOString()
  });
}
