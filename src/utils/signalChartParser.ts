export interface ParsedChartSignal {
  side: 'BUY' | 'SELL';
  symbol?: string;
  entry: number;
  sl: number;
  tp1?: number;
  tp2?: number;
  tp3?: number;
  sweepPrice?: number;
  atr?: number;
  rrText?: string;
  volMult?: number;
  rawText: string;
}

function parseMatchedNumber(raw?: string): number | undefined {
  if (!raw) return undefined;
  const cleaned = raw.replace(/,/g, '').trim();
  const num = Number(cleaned);
  return Number.isFinite(num) && num > 0 ? num : undefined;
}

/**
 * Clean Plain-Text Arabic/English Signal Extractor.
 * Parses TradingView Pine Script alerts, Telegram-style trade calls, or manual admin text
 * without requiring JSON. Returns null if entry or sl is missing/invalid so general chatter
 * never plots messy lines on the canvas chart.
 */
export function parsePlainTextSignal(text: string): ParsedChartSignal | null {
  if (!text || typeof text !== 'string') return null;

  const normalized = text
    .replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)))
    .trim();

  if (!normalized) return null;

  // 1. Determine Side (BUY / SELL)
  let side: 'BUY' | 'SELL' | null = null;
  const buyRegex = /(?:\b(?:BUY|LONG|BULLISH)\b|شراء|صعود|شرائية)/i;
  const sellRegex = /(?:\b(?:SELL|SHORT|BEARISH)\b|بيع|هبوط|بيعية)/i;

  const buyMatch = normalized.match(buyRegex);
  const sellMatch = normalized.match(sellRegex);

  if (buyMatch && sellMatch) {
    side = (buyMatch.index ?? 0) <= (sellMatch.index ?? 0) ? 'BUY' : 'SELL';
  } else if (buyMatch) {
    side = 'BUY';
  } else if (sellMatch) {
    side = 'SELL';
  }

  // 2. Optional Symbol extraction
  let symbol: string | undefined;
  const symMatch = normalized.match(/\b(XAUUSD|GOLD|US100|NAS100|NDX|BTCUSD|BTCUSDT|EURUSD|GBPUSD|WTI|USOIL)\b/i);
  if (symMatch) {
    const rawSym = symMatch[1].toUpperCase();
    if (rawSym === 'GOLD') symbol = 'XAUUSD';
    else if (rawSym === 'NAS100' || rawSym === 'NDX') symbol = 'US100';
    else if (rawSym === 'BTCUSDT') symbol = 'BTCUSD';
    else if (rawSym === 'USOIL') symbol = 'WTI';
    else symbol = rawSym;
  } else if (/الذهب|ذهب/.test(normalized)) {
    symbol = 'XAUUSD';
  } else if (/ناسداك|الناسداك/.test(normalized)) {
    symbol = 'US100';
  } else if (/بيتكوين|البيتكوين/.test(normalized)) {
    symbol = 'BTCUSD';
  }

  // Number pattern supporting decimals and optional comma thousands separator
  const numPattern = '([0-9]+(?:,[0-9]{3})*(?:\\.[0-9]+)?)';

  // 3. Extract Entry
  const entryRegexes = [
    new RegExp(`(?:entry\\s*price|entry|ep|الدخول|سعر\\s*الدخول|نقطة\\s*الدخول|دخول)\\s*[:=\\-@]?\\s*${numPattern}`, 'i'),
    new RegExp(`(?:BUY|SELL|LONG|SHORT|شراء|بيع)\\s+(?:[A-Z0-9]+\\s+)?@\\s*${numPattern}`, 'i'),
    new RegExp(`@\\s*${numPattern}`, 'i'),
  ];

  let entry: number | undefined;
  for (const rx of entryRegexes) {
    const m = normalized.match(rx);
    const val = parseMatchedNumber(m?.[1]);
    if (val !== undefined) {
      entry = val;
      break;
    }
  }

  // 4. Extract Stop Loss (SL)
  const slRegexes = [
    new RegExp(`(?:stop\\s*loss|stoploss|\\bsl\\b|\\bstop\\b|وقف\\s*الخسارة|وقف\\s*خسارة|الوقف|ستوب|وقف)\\s*[:=\\-@]?\\s*${numPattern}`, 'i'),
  ];

  let sl: number | undefined;
  for (const rx of slRegexes) {
    const m = normalized.match(rx);
    const val = parseMatchedNumber(m?.[1]);
    if (val !== undefined) {
      sl = val;
      break;
    }
  }

  // If entry or sl is missing/invalid, return null
  if (entry === undefined || sl === undefined || entry <= 0 || sl <= 0 || entry === sl) {
    return null;
  }

  // Infer side from Entry vs SL if side keyword wasn't explicitly found
  if (!side) {
    side = entry > sl ? 'BUY' : 'SELL';
  }

  // 5. Extract TP1, TP2, TP3
  const tp1Regex = new RegExp(`(?:\\btp\\s*1\\b|target\\s*1|take\\s*profit\\s*1|هدف\\s*1|الهدف\\s*1|هدف\\s*أول|الهدف\\s*الأول|\\btp\\b|الهدف|هدف)\\s*[:=\\-@]?\\s*${numPattern}`, 'i');
  const tp2Regex = new RegExp(`(?:\\btp\\s*2\\b|target\\s*2|take\\s*profit\\s*2|هدف\\s*2|الهدف\\s*2|هدف\\s*ثاني|الهدف\\s*الثاني)\\s*[:=\\-@]?\\s*${numPattern}`, 'i');
  const tp3Regex = new RegExp(`(?:\\btp\\s*3\\b|target\\s*3|take\\s*profit\\s*3|هدف\\s*3|الهدف\\s*3|هدف\\s*ثالث|الهدف\\s*الثالث)\\s*[:=\\-@]?\\s*${numPattern}`, 'i');

  const tp1 = parseMatchedNumber(normalized.match(tp1Regex)?.[1]);
  const tp2 = parseMatchedNumber(normalized.match(tp2Regex)?.[1]);
  const tp3 = parseMatchedNumber(normalized.match(tp3Regex)?.[1]);

  // 6. Extract Sweep Price (سحب سيولة / Sweep)
  const sweepRegex = new RegExp(`(?:liquidity\\s*sweep|sweep\\s*level|sweep|سحب\\s*سيولة|سيولة\\s*مسحوبة|قاع\\s*السحب|قمة\\s*السحب)\\s*(?:عند|@|[:=\\-])?\\s*${numPattern}`, 'i');
  const sweepPrice = parseMatchedNumber(normalized.match(sweepRegex)?.[1]);

  // 7. Optional Metadata: ATR, R:R, VolMult
  const atrRegex = new RegExp(`(?:\\batr\\b)\\s*[:=\\-]?\\s*${numPattern}`, 'i');
  const atr = parseMatchedNumber(normalized.match(atrRegex)?.[1]);

  const rrMatch = normalized.match(/(?:\br\s*:\s*r\b|\brr\b|العائد|نسبة\s*العائد)\s*[:=\-]?\s*([0-9]+(?:\.[0-9]+)?\s*:\s*[0-9]+(?:\.[0-9]+)?|1\s*:\s*[0-9]+(?:\.[0-9]+)?|[0-9]+(?:\.[0-9]+)?R)/i);
  let rrText = rrMatch?.[1]?.trim();
  if (!rrText && tp1 !== undefined) {
    const risk = Math.abs(entry - sl);
    const reward = Math.abs(tp1 - entry);
    if (risk > 0 && reward > 0) {
      rrText = `1:${(reward / risk).toFixed(1)}`;
    }
  }

  const volRegex = new RegExp(`(?:vol(?:ume)?\\s*mult(?:iplier)?|vol|حجم\\s*السيولة|سيولة)\\s*[:=\\-]?\\s*${numPattern}\\s*x?`, 'i');
  const volMult = parseMatchedNumber(normalized.match(volRegex)?.[1]);

  return {
    side,
    ...(symbol ? { symbol } : {}),
    entry,
    sl,
    ...(tp1 !== undefined ? { tp1 } : {}),
    ...(tp2 !== undefined ? { tp2 } : {}),
    ...(tp3 !== undefined ? { tp3 } : {}),
    ...(sweepPrice !== undefined ? { sweepPrice } : {}),
    ...(atr !== undefined ? { atr } : {}),
    ...(rrText ? { rrText } : {}),
    ...(volMult !== undefined ? { volMult } : {}),
    rawText: text.trim(),
  };
}
