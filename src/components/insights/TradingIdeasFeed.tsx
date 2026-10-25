import React, { useState, useEffect } from 'react';
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
}

export const TradingIdeasFeed: React.FC<TradingIdeasFeedProps> = ({ symbol, lang = 'ar' }) => {
  const isAr = lang === 'ar';
  const [ideas, setIdeas] = useState<TradingViewIdea[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);

    fetch(`/api/ideas/${symbol}`)
      .then((res) => res.json())
      .then((data) => {
        if (isMounted && data.success && Array.isArray(data.ideas)) {
          setIdeas(data.ideas);
        }
      })
      .catch((err) => console.error('[TradingIdeasFeed] Error fetching ideas:', err))
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [symbol]);

  const formatTimeAgo = (pubDate: string) => {
    try {
      const date = new Date(pubDate);
      const diffMs = Date.now() - date.getTime();
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
    <div className="w-full bg-[#131722]/80 backdrop-blur-md p-3 rounded-xl border border-white/10 flex flex-col space-y-2.5 shadow-lg mt-3">
      {/* Feed Header */}
      <div className="flex items-center justify-between pb-1.5 border-b border-white/5">
        <div className="flex items-center gap-2">
          <div className="p-1 rounded bg-blue-500/20 border border-blue-500/30 text-blue-400">
            <Lightbulb className="w-3.5 h-3.5 animate-pulse" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
              <span>{isAr ? `أفكار وتحليلات السوق — ${symbol}` : `Market Analysis & Ideas — ${symbol}`}</span>
              <span className="px-1.5 py-0.2 rounded text-[9px] font-mono font-bold bg-blue-500/20 text-blue-400 border border-blue-500/30">
                ANALYSIS FEED
              </span>
            </h4>
          </div>
        </div>

        <span className="text-[10px] font-mono text-[#787b86] flex items-center gap-1">
          <Radio className="w-2.5 h-2.5 text-[#089981] animate-ping" />
          <span>{ideas.length} {isAr ? 'أفكار' : 'Ideas'}</span>
        </span>
      </div>

      {/* Ideas Cards Scrollable List */}
      <div className="space-y-2 max-h-[220px] overflow-y-auto scrollbar-thin scrollbar-thumb-white/10 pr-0.5">
        {isLoading ? (
          <div className="py-6 text-center text-xs text-[#787b86] flex items-center justify-center gap-2">
            <Sparkles className="w-4 h-4 animate-spin text-blue-400" />
            <span>{isAr ? 'جاري جلب أفكار وتحليلات السوق...' : 'Fetching market analysis & ideas...'}</span>
          </div>
        ) : ideas.length === 0 ? (
          <div className="py-4 text-center text-xs text-[#787b86]">
            {isAr ? 'لا توجد أفكار تداول متاحة حالياً لهذا الرمز' : 'No community ideas available for this symbol right now'}
          </div>
        ) : (
          ideas.map((item) => (
            <a
              key={item.id}
              href={item.link}
              target="_blank"
              rel="noopener noreferrer"
              className="group block p-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 hover:border-blue-500/40 transition-all space-y-1.5 cursor-pointer"
            >
              <div className="flex items-start justify-between gap-2">
                <h5 className="text-[11px] sm:text-xs font-bold text-white group-hover:text-blue-400 transition-colors line-clamp-2 leading-snug">
                  {isAr && item.titleAr ? item.titleAr : item.title}
                </h5>

                <div className="p-1 rounded-md bg-white/5 text-[#787b86] group-hover:text-blue-400 group-hover:bg-blue-500/20 transition-all shrink-0">
                  <ExternalLink className="w-3 h-3" />
                </div>
              </div>

              <div className="flex items-center justify-between text-[10px] text-[#787b86] pt-1 border-t border-white/5 font-mono">
                <div className="flex items-center gap-1.5 truncate">
                  <User className="w-2.5 h-2.5 text-blue-400" />
                  <span className="truncate font-semibold text-slate-300">{item.author}</span>
                </div>

                <div className="flex items-center gap-1 shrink-0 text-amber-400 font-bold">
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
