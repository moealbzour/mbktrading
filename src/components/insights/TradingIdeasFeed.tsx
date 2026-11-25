import React, { useState, useEffect } from 'react';
import { collection, getDocs, limit, orderBy, query } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { MarketSymbol } from '../../types/trading';
import { Lightbulb, ExternalLink, User, Clock, Radio, Sparkles } from 'lucide-react';

interface TradingIdeasFeedProps {
  symbol: MarketSymbol;
  lang?: 'ar' | 'en';
}

interface TradingViewIdea {
  id: string;
  title: string;
  titleAr?: string;
  author: string;
  link: string;
  pubDate: string;
  symbolTag?: string;
}

const SYMBOL_KEYWORDS: Record<MarketSymbol, RegExp> = {
  XAUUSD: /\b(gold|xau|xauusd|bullion|precious|fed|dollar|usd)\b|ذهب|الذهب|أونصة|الدولار|الفيدرالي/i,
  US100: /\b(nasdaq|us100|ndx|nq|wall street|tech|s&p|stocks|equities|fed)\b|ناسداك|الأسهم|وول ستريت|تكنولوجيا/i,
  EURUSD: /\b(eur|eurusd|euro|ecb|lagarde|dollar|usd|forex)\b|يورو|اليورو|المركزي الأوروبي/i,
  GBPUSD: /\b(gbp|gbpusd|pound|sterling|boe|uk|dollar|usd)\b|إسترليني|الجنيه|بنك إنجلترا|بريطانيا/i,
  WTI: /\b(oil|wti|crude|brent|opec|energy)\b|نفط|النفط|خام|أوبك|الطاقة/i,
  BTCUSD: /\b(btc|btcusd|bitcoin|crypto|ethereum|etf)\b|بيتكوين|البيتكوين|عملات رقمية|كريبتو/i
};

export const TradingIdeasFeed: React.FC<TradingIdeasFeedProps> = ({ symbol, lang = 'ar' }) => {
  const isAr = lang === 'ar';
  const [ideas, setIdeas] = useState<TradingViewIdea[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);

    const loadRealIdeasAndAnalysis = async () => {
      const collected: TradingViewIdea[] = [];
      const seenLinksOrTitles = new Set<string>();

      // 1. Load real analyst posts from Firestore market_ideas (if any)
      try {
        const q = query(
          collection(db, 'market_ideas'),
          orderBy('timestampMs', 'desc'),
          limit(12)
        );
        const snap = await getDocs(q);
        snap.forEach((docSnap) => {
          const d = docSnap.data();
          if (!d) return;
          const docSym = String(d.symbol || '').toUpperCase();
          if (symbol && docSym && docSym !== 'ALL' && !docSym.includes(symbol) && !symbol.includes(docSym)) {
            return;
          }
          const title = String(d.titleEn || d.title || d.titleAr || '').trim();
          const titleAr = String(d.titleAr || d.title || d.titleEn || '').trim();
          if (!title && !titleAr) return;

          const key = (title || titleAr).toLowerCase();
          if (seenLinksOrTitles.has(key)) return;
          seenLinksOrTitles.add(key);

          collected.push({
            id: `fs-idea-${docSnap.id}`,
            title: title || titleAr,
            titleAr: titleAr || title,
            author: String(d.author || d.authorName || 'MBK Analyst'),
            link: String(
              d.link ||
                d.chartUrl ||
                `https://www.tradingview.com/symbols/${symbol}/ideas/`
            ),
            pubDate: String(d.createdAt || d.pubDate || new Date().toISOString()),
            symbolTag: docSym || symbol
          });
        });
      } catch {
        // Ignore if market_ideas collection is empty or not accessible
      }

      // 2. Supplement with real live analysis articles from /api/market/news?lang=${lang}&type=analysis
      try {
        const res = await fetch(
          `/api/market/news?lang=${encodeURIComponent(lang)}&type=analysis`,
          {
            method: 'GET',
            headers: { Accept: 'application/json' }
          }
        );
        if (res.ok) {
          const data = await res.json();
          const rawItems = Array.isArray(data?.items) ? data.items : [];
          const matcher = SYMBOL_KEYWORDS[symbol];

          const symbolMatched: TradingViewIdea[] = [];
          const generalMacro: TradingViewIdea[] = [];

          for (let i = 0; i < rawItems.length; i++) {
            const item = rawItems[i];
            if (!item || typeof item !== 'object') continue;
            const title = String(item.title || '').trim();
            const link = String(item.link || '').trim();
            if (!title || !link) continue;

            const dedupeKey = link.toLowerCase() || title.toLowerCase();
            if (seenLinksOrTitles.has(dedupeKey)) continue;
            seenLinksOrTitles.add(dedupeKey);

            const entry: TradingViewIdea = {
              id: String(item.id || `analysis-${i}`),
              title,
              titleAr: title,
              author: String(item.source || (isAr ? 'تحليلات الأسواق' : 'Market Analysis')),
              link,
              pubDate: String(item.pubDate || new Date().toISOString())
            };

            if (matcher && matcher.test(title)) {
              symbolMatched.push(entry);
            } else {
              generalMacro.push(entry);
            }
          }

          collected.push(...symbolMatched, ...generalMacro);
        }
      } catch (err) {
        console.warn('[TradingIdeasFeed] Analysis feed fetch notice:', err);
      }

      if (isMounted) {
        setIdeas(collected.slice(0, 12));
        setIsLoading(false);
      }
    };

    loadRealIdeasAndAnalysis();

    return () => {
      isMounted = false;
    };
  }, [symbol, lang, isAr]);

  const formatTimeAgo = (pubDate: string) => {
    try {
      const date = new Date(pubDate);
      const diffMs = Date.now() - date.getTime();
      if (Number.isNaN(diffMs) || diffMs < 0) return isAr ? 'مباشر' : 'Live';
      const mins = Math.floor(diffMs / (1000 * 60));
      if (mins < 2) return isAr ? 'الآن' : 'Just now';
      if (mins < 60) return isAr ? `قبل ${mins} دقيقة` : `${mins}m ago`;
      const hours = Math.floor(mins / 60);
      if (hours < 24) return isAr ? `قبل ${hours} ساعة` : `${hours}h ago`;
      const days = Math.floor(hours / 24);
      return isAr ? `قبل ${days} يوم` : `${days}d ago`;
    } catch {
      return isAr ? 'مباشر' : 'Live';
    }
  };

  return (
    <div className="w-full bg-[#FFFFFF]/95 dark:bg-[#131722]/80 dark:backdrop-blur-md p-3 rounded-xl border border-[#E0E3EB] dark:border-white/10 flex flex-col space-y-2.5 shadow-[0_1px_2px_rgba(19,23,34,0.04)] dark:shadow-lg mt-3">
      {/* Feed Header */}
      <div className="flex items-center justify-between pb-1.5 border-b border-[#E0E3EB] dark:border-white/5">
        <div className="flex items-center gap-2">
          <div className="p-1 rounded bg-[#EDF1F7] dark:bg-blue-500/20 border border-[#CBD2DF] dark:border-blue-500/30 text-[#1E53E5] dark:text-blue-400">
            <Lightbulb className="w-3.5 h-3.5 animate-pulse" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-[#131722] dark:text-white flex items-center gap-1.5">
              <span>{isAr ? `أفكار وتحليلات السوق — ${symbol}` : `Market Analysis & Ideas — ${symbol}`}</span>
              <span className="px-1.5 py-0.2 rounded text-[9px] font-mono font-bold bg-[#EDF1F7] dark:bg-blue-500/20 text-[#1E53E5] dark:text-blue-400 border border-[#CBD2DF] dark:border-blue-500/30">
                ANALYSIS FEED
              </span>
            </h4>
          </div>
        </div>

        <span className="text-[10px] font-mono text-[#787b86] flex items-center gap-1">
          <Radio className="w-2.5 h-2.5 text-[#089981] animate-ping" />
          <span>{ideas.length} {isAr ? 'تحليلات' : 'Articles'}</span>
        </span>
      </div>

      {/* Ideas Cards Scrollable List */}
      <div className="space-y-2 max-h-[220px] overflow-y-auto scrollbar-thin scrollbar-thumb-white/10 pr-0.5">
        {isLoading ? (
          <div className="py-6 text-center text-xs text-[#787b86] flex items-center justify-center gap-2">
            <Sparkles className="w-4 h-4 animate-spin text-[#1E53E5] dark:text-blue-400" />
            <span>{isAr ? 'جاري جلب أفكار وتحليلات السوق...' : 'Fetching market analysis & ideas...'}</span>
          </div>
        ) : ideas.length === 0 ? (
          <div className="py-4 text-center text-xs text-[#787b86]">
            {isAr ? 'لا توجد تحليلات متاحة حالياً لهذا الرمز' : 'No market analysis available right now'}
          </div>
        ) : (
          ideas.map((item) => (
            <a
              key={item.id}
              href={item.link}
              target="_blank"
              rel="noopener noreferrer"
              className="group block p-2.5 rounded-xl bg-[#F8F9FD] dark:bg-white/5 hover:bg-[#EDF1F7] dark:hover:bg-white/10 border border-[#E0E3EB] dark:border-white/5 hover:border-blue-500/40 transition-all space-y-1.5 cursor-pointer"
            >
              <div className="flex items-start justify-between gap-2">
                <h5 className="text-[11px] sm:text-xs font-bold text-[#131722] dark:text-white group-hover:text-blue-400 transition-colors line-clamp-2 leading-snug">
                  {isAr && item.titleAr ? item.titleAr : item.title}
                </h5>

                <div className="p-1 rounded-md bg-[#F8F9FD] dark:bg-white/5 text-[#787b86] group-hover:text-blue-400 group-hover:bg-blue-500/20 transition-all shrink-0">
                  <ExternalLink className="w-3 h-3" />
                </div>
              </div>

              <div className="flex items-center justify-between text-[10px] text-[#787b86] pt-1 border-t border-[#E0E3EB] dark:border-white/5 font-mono">
                <div className="flex items-center gap-1.5 truncate">
                  <User className="w-2.5 h-2.5 text-[#1E53E5] dark:text-blue-400" />
                  <span className="truncate font-semibold text-[#4A5162] dark:text-slate-300">{item.author}</span>
                </div>

                <div className="flex items-center gap-1 shrink-0 text-[#9A6700] dark:text-amber-400 font-bold">
                  <Clock className="w-2.5 h-2.5" />
                  <span>{formatTimeAgo(item.pubDate)}</span>
                </div>
              </div>
            </a>
          ))
        )}
      </div>
    </div>
  );
};
