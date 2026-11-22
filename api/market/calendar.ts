import type { IncomingMessage, ServerResponse } from 'http';

export interface EconomicCalendarApiEvent {
  id: string;
  title: string;
  currency: string;
  countryCode: string;
  impact: 'High' | 'Medium' | 'Low';
  timestampMs: number;
  dateIso: string;
  actual: string;
  forecast: string;
  previous: string;
  revisedPrevious: string;
  unit: string;
}

interface CalendarCacheEntry {
  events: EconomicCalendarApiEvent[];
  source: string;
  cachedAt: string;
  expiresAtMs: number;
}

type Req = IncomingMessage & {
  method?: string;
  url?: string;
  query?: Record<string, any>;
};

const FALLBACK_FEED_URL = 'https://nfs.faireconomy.media/ff_calendar_thisweek.json';
const CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes
const UPSTREAM_TIMEOUT_MS = 6000; // 6 seconds

let calendarCache: CalendarCacheEntry | null = null;

const COUNTRY_TO_CURRENCY: Record<string, { currency: string; countryCode: string }> = {
  US: { currency: 'USD', countryCode: 'US' },
  USA: { currency: 'USD', countryCode: 'US' },
  USD: { currency: 'USD', countryCode: 'US' },
  EU: { currency: 'EUR', countryCode: 'EU' },
  EA: { currency: 'EUR', countryCode: 'EU' },
  EMU: { currency: 'EUR', countryCode: 'EU' },
  EUR: { currency: 'EUR', countryCode: 'EU' },
  GB: { currency: 'GBP', countryCode: 'GB' },
  UK: { currency: 'GBP', countryCode: 'GB' },
  GBR: { currency: 'GBP', countryCode: 'GB' },
  GBP: { currency: 'GBP', countryCode: 'GB' },
  CA: { currency: 'CAD', countryCode: 'CA' },
  CAN: { currency: 'CAD', countryCode: 'CA' },
  CAD: { currency: 'CAD', countryCode: 'CA' },
  JP: { currency: 'JPY', countryCode: 'JP' },
  JPN: { currency: 'JPY', countryCode: 'JP' },
  JPY: { currency: 'JPY', countryCode: 'JP' },
  AU: { currency: 'AUD', countryCode: 'AU' },
  AUS: { currency: 'AUD', countryCode: 'AU' },
  AUD: { currency: 'AUD', countryCode: 'AU' },
  CH: { currency: 'CHF', countryCode: 'CH' },
  CHE: { currency: 'CHF', countryCode: 'CH' },
  CHF: { currency: 'CHF', countryCode: 'CH' },
  NZ: { currency: 'NZD', countryCode: 'NZ' },
  NZL: { currency: 'NZD', countryCode: 'NZ' },
  NZD: { currency: 'NZD', countryCode: 'NZ' },
  CN: { currency: 'CNY', countryCode: 'CN' },
  CHN: { currency: 'CNY', countryCode: 'CN' },
  CNY: { currency: 'CNY', countryCode: 'CN' }
};

function resolveCurrencyAndCountry(
  rawCurrency?: unknown,
  rawCountry?: unknown
): { currency: string; countryCode: string } | null {
  const candidates = [
    String(rawCurrency || '').trim().toUpperCase(),
    String(rawCountry || '').trim().toUpperCase()
  ].filter(Boolean);

  for (const token of candidates) {
    if (COUNTRY_TO_CURRENCY[token]) {
      return COUNTRY_TO_CURRENCY[token];
    }
  }

  if (candidates.length > 0 && candidates[0].length >= 2) {
    const first = candidates[0];
    return {
      currency: first.length === 3 ? first : `${first}D`,
      countryCode: first.slice(0, 2)
    };
  }

  return null;
}

function normalizeImpact(rawImpact: unknown): 'High' | 'Medium' | 'Low' | null {
  if (typeof rawImpact === 'number') {
    if (rawImpact >= 3) return 'High';
    if (rawImpact === 2) return 'Medium';
    if (rawImpact === 1) return 'Low';
  }
  const val = String(rawImpact ?? '').trim().toLowerCase();
  if (!val || val === 'holiday' || val === 'none') return null;
  if (val === 'high' || val === '3' || val === 'high impact' || val === 'red') return 'High';
  if (val === 'medium' || val === 'moderate' || val === '2' || val === 'medium impact' || val === 'orange') {
    return 'Medium';
  }
  if (val === 'low' || val === '1' || val === 'low impact' || val === 'yellow') return 'Low';
  return null;
}

function parseEventTimestampMs(item: Record<string, any>): number {
  const numericCandidates = [item.timestampMs, item.timestamp, item.time_ms, item.unix];
  for (const cand of numericCandidates) {
    if (typeof cand === 'number' && Number.isFinite(cand) && cand > 0) {
      return cand < 1e11 ? cand * 1000 : cand;
    }
    if (typeof cand === 'string' && /^\d+$/.test(cand.trim())) {
      const n = Number(cand.trim());
      if (n > 0) return n < 1e11 ? n * 1000 : n;
    }
  }

  const stringCandidates = [item.dateIso, item.date, item.datetime, item.time, item.releaseDate];
  for (const cand of stringCandidates) {
    if (!cand) continue;
    const parsed = Date.parse(String(cand));
    if (!Number.isNaN(parsed) && parsed > 0) {
      return parsed;
    }
  }

  return NaN;
}

function normalizeUnit(rawUnit: unknown): string {
  if (rawUnit === null || rawUnit === undefined) return '';
  const clean = String(rawUnit).trim().toLowerCase();
  if (
    !clean ||
    clean === 'none' ||
    clean === 'null' ||
    clean === 'undefined' ||
    clean === 'n/a' ||
    clean === '-' ||
    clean === 'index' ||
    clean === 'points' ||
    clean === 'pts'
  ) {
    return '';
  }
  if (clean === 'percent' || clean === 'percentage' || clean === '%') return '%';
  if (clean === 'thousand' || clean === 'thousands' || clean === 'k') return 'K';
  if (clean === 'million' || clean === 'millions' || clean === 'm') return 'M';
  if (clean === 'billion' || clean === 'billions' || clean === 'b') return 'B';
  if (clean === 'trillion' || clean === 'trillions' || clean === 't') return 'T';
  return String(rawUnit).trim();
}

function formatWithUnit(rawValue: unknown, normalizedUnit: string): string {
  if (rawValue === null || rawValue === undefined) return '';
  let str = String(rawValue)
    .trim()
    .replace(/none$/i, '')
    .replace(/percent$/i, '%')
    .replace(/thousand$/i, 'K')
    .replace(/million$/i, 'M')
    .replace(/billion$/i, 'B')
    .trim();

  if (
    !str ||
    str.toLowerCase() === 'null' ||
    str.toLowerCase() === 'undefined' ||
    str.toLowerCase() === 'none'
  ) {
    return '';
  }
  if (!normalizedUnit || !/\d/.test(str)) return str;
  if (str.endsWith(normalizedUnit) || /[%KMBT]$/i.test(str)) return str;
  return `${str}${normalizedUnit}`;
}

function formatDateYMD(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}

function normalizeRawEventsArray(rawList: any[], prefix: string): EconomicCalendarApiEvent[] {
  const normalized: EconomicCalendarApiEvent[] = [];
  const seenKeys = new Set<string>();

  for (let i = 0; i < rawList.length; i++) {
    const item = rawList[i];
    if (!item || typeof item !== 'object') continue;

    const title = String(item.title || item.name || item.event || item.indicator || '').trim();
    const resolved = resolveCurrencyAndCountry(item.currency, item.country || item.countryCode);
    const impact = normalizeImpact(item.impact ?? item.importance ?? item.volatility);
    if (!title || !resolved || !impact) continue;

    const timestampMs = parseEventTimestampMs(item);
    if (Number.isNaN(timestampMs) || timestampMs <= 0) continue;

    const unit = normalizeUnit(item.unit);
    const actual = formatWithUnit(item.actual, unit);
    const forecast = formatWithUnit(item.forecast ?? item.consensus ?? item.estimate, unit);
    const previous = formatWithUnit(item.previous ?? item.prev, unit);
    const revisedPrevious = formatWithUnit(item.revisedPrevious ?? item.revised, unit);
    const dateIso = new Date(timestampMs).toISOString();

    const slug = `${resolved.currency}-${title}`
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 48);

    const dedupeKey = `${timestampMs}-${resolved.currency}-${slug}`;
    if (seenKeys.has(dedupeKey)) continue;
    seenKeys.add(dedupeKey);

    normalized.push({
      id: `${prefix}-${timestampMs}-${slug}-${i}`,
      title,
      currency: resolved.currency,
      countryCode: resolved.countryCode,
      impact,
      timestampMs,
      dateIso,
      actual,
      forecast,
      previous,
      revisedPrevious,
      unit
    });
  }

  normalized.sort((a, b) => a.timestampMs - b.timestampMs);
  return normalized;
}

async function fetchJsonArraySafely(url: string): Promise<any[]> {
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      Accept: 'application/json'
    },
    signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS)
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status} from ${url}`);
  }

  const contentType = (response.headers.get('content-type') || '').toLowerCase();
  const rawText = await response.text();
  const trimmed = rawText.trim();

  if (
    !contentType.includes('json') &&
    !(trimmed.startsWith('[') || trimmed.startsWith('{'))
  ) {
    throw new Error(`Non-JSON response (${contentType || 'unknown'}) from ${url}`);
  }

  if (trimmed.startsWith('<')) {
    throw new Error(`HTML rate-limit or error page received from ${url}`);
  }

  const parsed = JSON.parse(trimmed);
  if (Array.isArray(parsed)) return parsed;
  if (parsed && typeof parsed === 'object') {
    if (Array.isArray(parsed.data)) return parsed.data;
    if (Array.isArray(parsed.events)) return parsed.events;
    if (Array.isArray(parsed.calendar)) return parsed.calendar;
    if (Array.isArray(parsed.items)) return parsed.items;
  }

  throw new Error(`Unexpected JSON structure from ${url}`);
}

function sendJson(res: ServerResponse, statusCode: number, body: Record<string, any>) {
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'public, s-maxage=1800, stale-while-revalidate=3600');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.end(JSON.stringify(body));
}

async function loadCalendarWithCache(): Promise<{
  status: 'ok' | 'unavailable';
  source?: string;
  events: EconomicCalendarApiEvent[];
  cachedAt: string;
}> {
  const nowMs = Date.now();
  if (calendarCache && calendarCache.expiresAtMs > nowMs && calendarCache.events.length > 0) {
    return {
      status: 'ok',
      source: calendarCache.source,
      events: calendarCache.events,
      cachedAt: calendarCache.cachedAt
    };
  }

  const fromDate = formatDateYMD(nowMs - 2 * 24 * 60 * 60 * 1000);
  const toDate = formatDateYMD(nowMs + 14 * 24 * 60 * 60 * 1000);
  const primaryUrl = `https://biquote.io/api/calendar?from=${encodeURIComponent(
    fromDate
  )}&to=${encodeURIComponent(toDate)}&countries=US,EU,GB,CA,JP,AU,CH,NZ`;

  // 1. Primary 14-day rolling calendar source: biquote.io
  try {
    const rawPrimary = await fetchJsonArraySafely(primaryUrl);
    const primaryEvents = normalizeRawEventsArray(rawPrimary, 'bq');
    if (primaryEvents.length > 0) {
      const cachedAt = new Date(nowMs).toISOString();
      calendarCache = {
        events: primaryEvents,
        source: 'biquote',
        cachedAt,
        expiresAtMs: nowMs + CACHE_TTL_MS
      };
      return {
        status: 'ok',
        source: 'biquote',
        events: primaryEvents,
        cachedAt
      };
    }
  } catch (primaryErr: any) {
    console.warn('[/api/market/calendar] Primary source failover notice:', primaryErr?.message || primaryErr);
  }

  // 2. Automatic failover: nfs.faireconomy.media/ff_calendar_thisweek.json
  try {
    const rawFallback = await fetchJsonArraySafely(FALLBACK_FEED_URL);
    const fallbackEvents = normalizeRawEventsArray(rawFallback, 'ff');
    if (fallbackEvents.length > 0) {
      const cachedAt = new Date(nowMs).toISOString();
      calendarCache = {
        events: fallbackEvents,
        source: 'faireconomy',
        cachedAt,
        expiresAtMs: nowMs + CACHE_TTL_MS
      };
      return {
        status: 'ok',
        source: 'faireconomy',
        events: fallbackEvents,
        cachedAt
      };
    }
  } catch (fallbackErr: any) {
    console.warn('[/api/market/calendar] Fallback source notice:', fallbackErr?.message || fallbackErr);
  }

  // 3. Stale cache recovery if available
  if (calendarCache && calendarCache.events.length > 0) {
    return {
      status: 'ok',
      source: calendarCache.source,
      events: calendarCache.events,
      cachedAt: calendarCache.cachedAt
    };
  }

  return {
    status: 'unavailable',
    events: [],
    cachedAt: new Date(nowMs).toISOString()
  };
}

export async function getCachedCalendarEvents(): Promise<EconomicCalendarApiEvent[]> {
  const result = await loadCalendarWithCache();
  return result.events;
}

export default async function handler(req: Req, res: ServerResponse) {
  const method = (req.method || 'GET').toUpperCase();

  if (method === 'OPTIONS') {
    return sendJson(res, 200, { ok: true });
  }

  if (method !== 'GET') {
    return sendJson(res, 405, { error: 'Method not allowed' });
  }

  const result = await loadCalendarWithCache();
  return sendJson(res, 200, result);
}
