export interface KLineCandle {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export type SupportedSymbol = 'XAUUSD' | 'US100' | 'BTCUSD' | 'EURUSD' | 'GBPUSD' | 'WTI';
export type SupportedInterval = '1m' | '5m' | '15m' | '1h' | '4h' | '1d';

const YAHOO_SYMBOL_MAP: Record<SupportedSymbol, string> = {
  XAUUSD: 'GC=F',
  US100: 'NQ=F',
  BTCUSD: 'BTC-USD',
  EURUSD: 'EURUSD=X',
  GBPUSD: 'GBPUSD=X',
  WTI: 'CL=F',
};

const YAHOO_INTERVAL_CONFIG: Record<SupportedInterval, { yfInterval: string; range: string; aggregateHours?: number }> = {
  '1m': { yfInterval: '1m', range: '2d' },
  '5m': { yfInterval: '5m', range: '5d' },
  '15m': { yfInterval: '15m', range: '1mo' },
  '1h': { yfInterval: '60m', range: '1mo' },
  '4h': { yfInterval: '60m', range: '3mo', aggregateHours: 4 },
  '1d': { yfInterval: '1d', range: '1y' },
};

const CACHE_TTL_MS = 15_000;
const memoryCache = new Map<string, { expiresAt: number; candles: KLineCandle[]; source: string }>();

function normalizeSymbol(raw?: string): SupportedSymbol {
  const upper = String(raw || 'XAUUSD').trim().toUpperCase();
  if (upper in YAHOO_SYMBOL_MAP) return upper as SupportedSymbol;
  if (upper.includes('XAU') || upper.includes('GOLD')) return 'XAUUSD';
  if (upper.includes('NAS') || upper.includes('US100') || upper.includes('NDX')) return 'US100';
  if (upper.includes('BTC')) return 'BTCUSD';
  if (upper.includes('EUR')) return 'EURUSD';
  if (upper.includes('GBP')) return 'GBPUSD';
  if (upper.includes('WTI') || upper.includes('OIL') || upper.includes('USOIL')) return 'WTI';
  return 'XAUUSD';
}

function normalizeInterval(raw?: string): SupportedInterval {
  const lower = String(raw || '5m').trim().toLowerCase();
  if (lower === '1m' || lower === '5m' || lower === '15m' || lower === '1h' || lower === '4h' || lower === '1d') {
    return lower;
  }
  return '5m';
}

async function fetchBinanceBtcCandles(interval: SupportedInterval): Promise<KLineCandle[]> {
  const url = `https://api.binance.com/api/v3/klines?symbol=BTCUSDT&interval=${interval}&limit=300`;
  const res = await fetch(url, {
    headers: { 'User-Agent': 'MBK-Trading-Terminal/2.0' },
    signal: AbortSignal.timeout(6000),
  });
  if (!res.ok) {
    throw new Error(`Binance HTTP ${res.status}`);
  }
  const rows = await res.json();
  if (!Array.isArray(rows)) {
    throw new Error('Invalid Binance klines payload');
  }
  const candles: KLineCandle[] = [];
  for (const row of rows) {
    if (!Array.isArray(row) || row.length < 6) continue;
    const timestamp = Number(row[0]);
    const open = Number(row[1]);
    const high = Number(row[2]);
    const low = Number(row[3]);
    const close = Number(row[4]);
    const volume = Number(row[5] || 0);
    if (
      Number.isFinite(timestamp) &&
      Number.isFinite(open) &&
      Number.isFinite(high) &&
      Number.isFinite(low) &&
      Number.isFinite(close)
    ) {
      candles.push({ timestamp, open, high, low, close, volume: Number.isFinite(volume) ? volume : 0 });
    }
  }
  return candles.sort((a, b) => a.timestamp - b.timestamp);
}

function aggregateHourlyCandles(candles: KLineCandle[], hours: number): KLineCandle[] {
  const bucketMs = hours * 3600 * 1000;
  const buckets = new Map<number, KLineCandle>();

  for (const c of candles) {
    const bucketTs = Math.floor(c.timestamp / bucketMs) * bucketMs;
    const existing = buckets.get(bucketTs);
    if (!existing) {
      buckets.set(bucketTs, {
        timestamp: bucketTs,
        open: c.open,
        high: c.high,
        low: c.low,
        close: c.close,
        volume: c.volume,
      });
    } else {
      existing.high = Math.max(existing.high, c.high);
      existing.low = Math.min(existing.low, c.low);
      existing.close = c.close;
      existing.volume += c.volume;
    }
  }

  return Array.from(buckets.values())
    .sort((a, b) => a.timestamp - b.timestamp)
    .slice(-300);
}

async function fetchYahooCandles(symbol: SupportedSymbol, interval: SupportedInterval): Promise<KLineCandle[]> {
  const yfSym = YAHOO_SYMBOL_MAP[symbol];
  const cfg = YAHOO_INTERVAL_CONFIG[interval];
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(yfSym)}?interval=${cfg.yfInterval}&range=${cfg.range}`;

  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
      Accept: 'application/json',
    },
    signal: AbortSignal.timeout(7000),
  });

  if (!res.ok) {
    throw new Error(`Yahoo Finance HTTP ${res.status}`);
  }

  const json = await res.json();
  const result = json?.chart?.result?.[0];
  const timestamps: number[] = result?.timestamp || [];
  const quote = result?.indicators?.quote?.[0] || {};
  const opens: Array<number | null> = quote.open || [];
  const highs: Array<number | null> = quote.high || [];
  const lows: Array<number | null> = quote.low || [];
  const closes: Array<number | null> = quote.close || [];
  const volumes: Array<number | null> = quote.volume || [];

  const rawCandles: KLineCandle[] = [];
  for (let i = 0; i < timestamps.length; i++) {
    const tsSec = timestamps[i];
    const open = opens[i];
    const high = highs[i];
    const low = lows[i];
    const close = closes[i];
    const volume = volumes[i] ?? 0;

    if (
      tsSec == null ||
      open == null ||
      high == null ||
      low == null ||
      close == null ||
      !Number.isFinite(open) ||
      !Number.isFinite(high) ||
      !Number.isFinite(low) ||
      !Number.isFinite(close)
    ) {
      continue;
    }

    rawCandles.push({
      timestamp: Number(tsSec) * 1000,
      open: Number(open),
      high: Number(high),
      low: Number(low),
      close: Number(close),
      volume: Number.isFinite(Number(volume)) ? Number(volume) : 0,
    });
  }

  const sorted = rawCandles.sort((a, b) => a.timestamp - b.timestamp);
  if (cfg.aggregateHours && cfg.aggregateHours > 1) {
    return aggregateHourlyCandles(sorted, cfg.aggregateHours);
  }
  return sorted.slice(-300);
}

export default async function handler(req: any, res: any) {
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const symbol = normalizeSymbol(req.query?.symbol);
  const interval = normalizeInterval(req.query?.interval);
  const cacheKey = `${symbol}:${interval}`;
  const now = Date.now();

  res.setHeader('Cache-Control', 'public, s-maxage=15, stale-while-revalidate=30');

  const cached = memoryCache.get(cacheKey);
  if (cached && cached.expiresAt > now && cached.candles.length > 0) {
    return res.status(200).json({
      symbol,
      interval,
      source: `${cached.source}_cached`,
      candles: cached.candles,
    });
  }

  try {
    let candles: KLineCandle[] = [];
    let source = 'yahoo';

    if (symbol === 'BTCUSD') {
      try {
        candles = await fetchBinanceBtcCandles(interval);
        source = 'binance';
      } catch {
        candles = await fetchYahooCandles(symbol, interval);
        source = 'yahoo_fallback';
      }
    } else {
      candles = await fetchYahooCandles(symbol, interval);
      source = 'yahoo';
    }

    if (candles.length > 0) {
      memoryCache.set(cacheKey, {
        expiresAt: now + CACHE_TTL_MS,
        candles,
        source,
      });
    }

    return res.status(200).json({
      symbol,
      interval,
      source,
      candles,
    });
  } catch (err: any) {
    if (cached && cached.candles.length > 0) {
      return res.status(200).json({
        symbol,
        interval,
        source: 'stale_cache',
        candles: cached.candles,
      });
    }
    return res.status(502).json({
      error: 'Failed to load market candles',
      message: err?.message || 'Upstream error',
      symbol,
      interval,
      candles: [],
    });
  }
}
