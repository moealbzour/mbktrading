import type { IncomingMessage, ServerResponse } from 'http';

export interface MarketNewsItem {
  id: string;
  title: string;
  link: string;
  source: string;
  publishedAt: string;
  timestampMs: number;
  category: string;
}

interface CacheEntry {
  items: MarketNewsItem[];
  cachedAt: string;
  expiresAtMs: number;
}

type Req = IncomingMessage & {
  method?: string;
  url?: string;
  query?: Record<string, any>;
};

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const UPSTREAM_TIMEOUT_MS = 6000; // 6 seconds
const newsCache = new Map<string, CacheEntry>();

interface FeedSource {
  url: string;
  source: string;
  category: string;
}

function getFeedsForRequest(lang: 'ar' | 'en', type: 'news' | 'analysis'): FeedSource[] {
  if (type === 'analysis') {
    if (lang === 'ar') {
      return [
        {
          url: 'https://sa.investing.com/rss/market_overview.rss',
          source: 'Investing.com عربي',
          category: 'تحليل الأسواق'
        },
        {
          url: 'https://www.fxstreet.com/rss/analysis',
          source: 'FXStreet Analysis',
          category: 'تحليل الأسواق'
        }
      ];
    }
    return [
      {
        url: 'https://www.fxstreet.com/rss/analysis',
        source: 'FXStreet Analysis',
        category: 'Market Analysis'
      },
      {
        url: 'https://www.investing.com/rss/market_overview.rss',
        source: 'Investing.com',
        category: 'Market Analysis'
      }
    ];
  }

  if (lang === 'ar') {
    return [
      {
        url: 'https://sa.investing.com/rss/news_1.rss',
        source: 'Investing.com عربي',
        category: 'فوركس وعملات'
      },
      {
        url: 'https://sa.investing.com/rss/news_11.rss',
        source: 'Investing.com عربي',
        category: 'ذهب وسلع'
      },
      {
        url: 'https://sa.investing.com/rss/news_14.rss',
        source: 'Investing.com عربي',
        category: 'اقتصاد كلي'
      },
      {
        url: 'https://sa.investing.com/rss/news_25.rss',
        source: 'Investing.com عربي',
        category: 'مؤشرات وأسهم'
      },
      {
        url: 'https://www.fxstreet.com/rss/news',
        source: 'FXStreet',
        category: 'فوركس وعملات'
      }
    ];
  }

  return [
    {
      url: 'https://www.fxstreet.com/rss/news',
      source: 'FXStreet',
      category: 'Forex & Macro'
    },
    {
      url: 'https://www.investing.com/rss/news_1.rss',
      source: 'Investing.com',
      category: 'Forex'
    },
    {
      url: 'https://www.investing.com/rss/news_11.rss',
      source: 'Investing.com',
      category: 'Gold & Commodities'
    },
    {
      url: 'https://www.investing.com/rss/news_25.rss',
      source: 'Investing.com',
      category: 'Indices & Equities'
    }
  ];
}

function decodeHtmlEntities(input: string): string {
  return input
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/gi, '$1')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&#(\d+);/g, (_m, code) => {
      const n = Number(code);
      return Number.isFinite(n) ? String.fromCharCode(n) : '';
    })
    .replace(/\s+/g, ' ')
    .trim();
}

function extractXmlTag(block: string, tagName: string): string {
  const regex = new RegExp(`<${tagName}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${tagName}>`, 'i');
  const match = block.match(regex);
  if (!match || !match[1]) return '';
  return decodeHtmlEntities(match[1]);
}

function parseRssXmlItems(xml: string, feed: FeedSource): MarketNewsItem[] {
  if (!xml || typeof xml !== 'string') return [];
  const itemMatches = xml.match(/<item(?:\s[^>]*)?>[\s\S]*?<\/item>/gi);
  if (!itemMatches) return [];

  const parsed: MarketNewsItem[] = [];

  for (let i = 0; i < itemMatches.length; i++) {
    const itemXml = itemMatches[i];
    const title = extractXmlTag(itemXml, 'title');
    if (!title || title.length < 4) continue;

    let link = extractXmlTag(itemXml, 'link');
    if (!link) {
      link = extractXmlTag(itemXml, 'guid');
    }
    if (!link || !/^https?:\/\//i.test(link)) continue;

    const rawPubDate =
      extractXmlTag(itemXml, 'pubDate') ||
      extractXmlTag(itemXml, 'dc:date') ||
      extractXmlTag(itemXml, 'published') ||
      '';

    const parsedMs = rawPubDate ? Date.parse(rawPubDate) : NaN;
    if (Number.isNaN(parsedMs) || parsedMs <= 0) {
      continue;
    }

    const publishedAt = new Date(parsedMs).toISOString();
    const idSeed = `${feed.source}-${link}-${parsedMs}`
      .replace(/[^a-zA-Z0-9_-]/g, '')
      .slice(-48);

    parsed.push({
      id: `news-${parsedMs}-${i}-${idSeed}`,
      title,
      link,
      source: feed.source,
      publishedAt,
      timestampMs: parsedMs,
      category: feed.category
    });
  }

  return parsed;
}

async function fetchSingleFeed(feed: FeedSource): Promise<MarketNewsItem[]> {
  const response = await fetch(feed.url, {
    method: 'GET',
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      Accept: 'application/rss+xml, application/xml, text/xml, */*'
    },
    signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS)
  });

  if (!response.ok) {
    throw new Error(`Upstream RSS ${feed.url} returned HTTP ${response.status}`);
  }

  const xmlText = await response.text();
  return parseRssXmlItems(xmlText, feed);
}

function parseQueryParams(req: Req): { lang: 'ar' | 'en'; type: 'news' | 'analysis' } {
  let rawLang = '';
  let rawType = '';

  if (req.query) {
    const qLang = req.query.lang;
    const qType = req.query.type;
    rawLang = Array.isArray(qLang) ? qLang[0] || '' : qLang || '';
    rawType = Array.isArray(qType) ? qType[0] || '' : qType || '';
  }

  if ((!rawLang || !rawType) && req.url) {
    try {
      const parsedUrl = new URL(req.url, 'http://localhost');
      if (!rawLang) rawLang = parsedUrl.searchParams.get('lang') || '';
      if (!rawType) rawType = parsedUrl.searchParams.get('type') || '';
    } catch {
      // ignore URL parse error
    }
  }

  const lang: 'ar' | 'en' = rawLang.toLowerCase() === 'en' ? 'en' : 'ar';
  const type: 'news' | 'analysis' = rawType.toLowerCase() === 'analysis' ? 'analysis' : 'news';
  return { lang, type };
}

function sendJson(res: ServerResponse, statusCode: number, body: Record<string, any>) {
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600');
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

  const { lang, type } = parseQueryParams(req);
  const cacheKey = `${lang}:${type}`;
  const nowMs = Date.now();
  const existingCache = newsCache.get(cacheKey);

  if (existingCache && existingCache.expiresAtMs > nowMs && existingCache.items.length > 0) {
    return sendJson(res, 200, {
      status: 'ok',
      items: existingCache.items,
      cachedAt: existingCache.cachedAt
    });
  }

  const feeds = getFeedsForRequest(lang, type);
  const settled = await Promise.allSettled(feeds.map((feed) => fetchSingleFeed(feed)));

  const rawItems: MarketNewsItem[] = [];
  for (const resItem of settled) {
    if (resItem.status === 'fulfilled' && Array.isArray(resItem.value)) {
      rawItems.push(...resItem.value);
    }
  }

  // If Arabic feeds returned items, prefer Arabic items when lang === 'ar'
  const filteredByLang =
    lang === 'ar'
      ? (() => {
          const arabicOnly = rawItems.filter((item) => /[\u0600-\u06FF]/.test(item.title));
          return arabicOnly.length >= 3 ? arabicOnly : rawItems;
        })()
      : rawItems;

  // Deduplicate by normalized title and link
  const seenTitles = new Set<string>();
  const seenLinks = new Set<string>();
  const deduplicated: MarketNewsItem[] = [];

  const sortedNewestFirst = [...filteredByLang].sort((a, b) => b.timestampMs - a.timestampMs);

  for (const item of sortedNewestFirst) {
    const normTitle = item.title.toLowerCase().replace(/\s+/g, ' ').trim();
    const normLink = item.link.toLowerCase().trim();
    if (seenTitles.has(normTitle) || seenLinks.has(normLink)) {
      continue;
    }
    seenTitles.add(normTitle);
    seenLinks.add(normLink);
    deduplicated.push(item);
    if (deduplicated.length >= 40) break;
  }

  if (deduplicated.length > 0) {
    const cachedAt = new Date(nowMs).toISOString();
    newsCache.set(cacheKey, {
      items: deduplicated,
      cachedAt,
      expiresAtMs: nowMs + CACHE_TTL_MS
    });

    return sendJson(res, 200, {
      status: 'ok',
      items: deduplicated,
      cachedAt
    });
  }

  // If all upstream feeds fail temporarily, return the last cached real items (never fabricated news)
  if (existingCache && existingCache.items.length > 0) {
    return sendJson(res, 200, {
      status: 'ok',
      items: existingCache.items,
      cachedAt: existingCache.cachedAt
    });
  }

  return sendJson(res, 200, {
    status: 'unavailable',
    items: [],
    cachedAt: new Date(nowMs).toISOString()
  });
}
