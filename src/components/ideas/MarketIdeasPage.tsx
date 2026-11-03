import React, { useState, useEffect } from 'react';
import {
  Lightbulb,
  Plus,
  Heart,
  MessageSquare,
  Share2,
  TrendingUp,
  TrendingDown,
  Sparkles,
  Maximize2,
  X,
  Search,
  Filter,
  Send,
  Crown,
  Shield,
  Zap,
  Image as ImageIcon,
  CheckCircle2,
  Lock,
  ExternalLink
} from 'lucide-react';
import { soundManager } from '../../utils/audio';
import { UserProfile, MarketSymbol, MarketIdea, MarketIdeaComment } from '../../types/trading';
import {
  subscribeToMarketIdeas,
  publishMarketIdeaToFirestore,
  toggleLikeMarketIdeaInFirestore,
  addCommentToMarketIdeaInFirestore
} from '../../services/marketIdeasService';
import { TradingViewAnalysisWidgets } from './TradingViewAnalysisWidgets';

interface Props {
  user: UserProfile;
  lang?: 'ar' | 'en';
}

const PRESET_CHARTS = [
  {
    nameAr: 'شارت الناسداك US100 (اختراق قمة FVG)',
    nameEn: 'US100 FVG Breakout Chart',
    url: 'https://images.unsplash.com/photo-1642543492481-44e81e3914a7?w=1000&auto=format&fit=crop&q=80'
  },
  {
    nameAr: 'شارت الذهب XAUUSD (ارتداد دعم 2,680$)',
    nameEn: 'XAUUSD Support Bounce Chart',
    url: 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=1000&auto=format&fit=crop&q=80'
  },
  {
    nameAr: 'شارت اليورو EURUSD (نموذج القمة المزدوجة)',
    nameEn: 'EURUSD Double Top Chart',
    url: 'https://images.unsplash.com/photo-1590283603385-17ffb3a7f29f?w=1000&auto=format&fit=crop&q=80'
  }
];

export const MarketIdeasPage: React.FC<Props> = ({ user, lang = 'ar' }) => {
  const isAr = lang === 'ar';

  const [ideas, setIdeas] = useState<MarketIdea[]>([]);
  const [activeSymbol, setActiveSymbol] = useState<string>('ALL');
  const [activeSentiment, setActiveSentiment] = useState<'ALL' | 'Bullish' | 'Bearish'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Publishing Modal State
  const [isPublishModalOpen, setIsPublishModalOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [symbol, setSymbol] = useState<MarketSymbol>('US100');
  const [sentiment, setSentiment] = useState<'Bullish' | 'Bearish' | 'Neutral'>('Bullish');
  const [chartUrl, setChartUrl] = useState('');
  const [isPublishing, setIsPublishing] = useState(false);

  // Zoom Image Lightbox
  const [lightboxImage, setLightboxImage] = useState<{ url: string; title: string } | null>(null);

  // Expanded Comments per Idea ID
  const [expandedComments, setExpandedComments] = useState<Record<string, boolean>>({});
  const [newCommentTexts, setNewCommentTexts] = useState<Record<string, string>>({});

  const userRoleUpper = (user?.role || '').toUpperCase();
  const canPublish =
    userRoleUpper === 'ADMIN' ||
    userRoleUpper === 'ANALYSER' ||
    userRoleUpper === 'VIP' ||
    userRoleUpper === 'MODERATOR' ||
    userRoleUpper === 'SALES' ||
    user?.isAdmin;

  useEffect(() => {
    const unsubscribe = subscribeToMarketIdeas((list) => {
      setIdeas(list);
    });
    return () => unsubscribe();
  }, []);

  const handlePublishSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;

    try {
      setIsPublishing(true);
      soundManager.playClick();

      await publishMarketIdeaToFirestore({
        title: title.trim(),
        content: content.trim(),
        symbol,
        sentiment,
        chartUrl: chartUrl.trim() || undefined,
        authorId: user.uid || user.id || 'user-id',
        authorName: user.name || user.email.split('@')[0],
        authorAvatar: user.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
        authorRole: userRoleUpper
      });

      setTitle('');
      setContent('');
      setChartUrl('');
      setIsPublishModalOpen(false);
      soundManager.playProfitChime();
    } catch (err) {
      console.warn('Publish idea error:', err);
    } finally {
      setIsPublishing(false);
    }
  };

  const handleToggleLike = async (idea: MarketIdea) => {
    soundManager.playClick();
    const currentUserId = user.uid || user.id || 'anon';
    const isLiked = idea.likedBy ? idea.likedBy.includes(currentUserId) : false;

    // Optimistic UI update
    setIdeas((prev) =>
      prev.map((i) => {
        if (i.id === idea.id) {
          const nextLiked = !isLiked;
          const nextBy = nextLiked
            ? [...(i.likedBy || []), currentUserId]
            : (i.likedBy || []).filter((id) => id !== currentUserId);
          return {
            ...i,
            likedBy: nextBy,
            likesCount: nextLiked ? i.likesCount + 1 : Math.max(0, i.likesCount - 1)
          };
        }
        return i;
      })
    );

    try {
      await toggleLikeMarketIdeaInFirestore(idea.id, currentUserId, isLiked);
    } catch (err) {
      console.warn('Like toggle error:', err);
    }
  };

  const handleAddComment = async (ideaId: string) => {
    const text = (newCommentTexts[ideaId] || '').trim();
    if (!text) return;

    soundManager.playClick();
    const newComment: MarketIdeaComment = {
      id: `c-${Date.now()}`,
      authorId: user.uid || user.id,
      authorName: user.name || user.email.split('@')[0],
      authorAvatar: user.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
      authorRole: userRoleUpper,
      text,
      createdAt: 'الآن'
    };

    // Optimistic update
    setIdeas((prev) =>
      prev.map((i) => {
        if (i.id === ideaId) {
          const updatedComments = [...(i.comments || []), newComment];
          return {
            ...i,
            comments: updatedComments,
            commentsCount: updatedComments.length
          };
        }
        return i;
      })
    );

    setNewCommentTexts((prev) => ({ ...prev, [ideaId]: '' }));

    try {
      await addCommentToMarketIdeaInFirestore(ideaId, newComment);
    } catch (err) {
      console.warn('Comment add error:', err);
    }
  };

  const filteredIdeas = ideas.filter((item) => {
    if (activeSymbol !== 'ALL' && item.symbol !== activeSymbol) return false;
    if (activeSentiment !== 'ALL' && item.sentiment !== activeSentiment) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = item.title.toLowerCase().includes(q);
      const matchContent = item.content.toLowerCase().includes(q);
      const matchAuthor = item.authorName.toLowerCase().includes(q);
      if (!matchTitle && !matchContent && !matchAuthor) return false;
    }
    return true;
  });

  const renderRoleBadge = (roleStr?: string) => {
    const r = (roleStr || '').toUpperCase();
    if (r === 'ADMIN') {
      return (
        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center gap-1">
          <Crown className="w-3 h-3 text-amber-400" />
          <span>المؤسس / Admin</span>
        </span>
      );
    }
    if (r === 'ANALYSER') {
      return (
        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 flex items-center gap-1">
          <Shield className="w-3 h-3 text-cyan-400" />
          <span>محلل معتمد</span>
        </span>
      );
    }
    if (r === 'VIP') {
      return (
        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-400/20 text-amber-400 border border-amber-400/40 flex items-center gap-1">
          <Crown className="w-2.5 h-2.5 text-amber-400" />
          <span>عضو VIP</span>
        </span>
      );
    }
    return (
      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-800 text-slate-400 border border-slate-700">
        عضو
      </span>
    );
  };

  return (
    <div
      className="w-full h-full min-h-0 flex flex-col bg-[#131722] text-[#d1d4dc] overflow-y-auto p-3 sm:p-6 space-y-6 select-none"
      dir={isAr ? 'rtl' : 'ltr'}
    >
      {/* HEADER BANNER */}
      <div className="bg-gradient-to-r from-[#1e222d] via-[#1a1e29] to-[#131722] border border-[#2a2e39] rounded-2xl p-4 sm:p-6 shadow-2xl relative overflow-hidden flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3 sm:gap-4 z-10">
          <div className="w-12 h-12 rounded-2xl bg-[#089981]/20 border border-[#089981]/40 flex items-center justify-center text-[#089981] shadow-lg shrink-0">
            <Lightbulb className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-lg sm:text-2xl font-black text-white tracking-wide">
                {isAr ? 'أفكار وتحليلات السوق (TradingView Market Ideas)' : 'Market Ideas & Analysis'}
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold font-mono bg-[#089981]/20 text-[#089981] border border-[#089981]/30">
                LIVE INSIGHTS
              </span>
            </div>
            <p className="text-xs sm:text-sm text-[#787b86] mt-1">
              {isAr
                ? 'منصة مشاركة النظريات الفنية والسيناريوهات الموجية والتحليلات المؤسسية من قبل المحللين والـ VIPs'
                : 'Share and explore technical analysis, wave setups, and institutional trade ideas'}
            </p>
          </div>
        </div>

        {/* Action Button: Publish Idea */}
        {canPublish ? (
          <button
            onClick={() => {
              soundManager.playClick();
              setIsPublishModalOpen(true);
            }}
            className="px-4 py-2.5 rounded-xl bg-[#089981] hover:bg-[#07806c] text-white font-bold text-xs transition-all shadow-lg shadow-[#089981]/20 flex items-center gap-2 cursor-pointer shrink-0 z-10"
          >
            <Plus className="w-4 h-4" />
            <span>{isAr ? 'نشر فكرة تحليل جديدة' : 'Publish New Idea'}</span>
          </button>
        ) : (
          <div className="px-3 py-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-semibold flex items-center gap-2 shrink-0 z-10">
            <Lock className="w-3.5 h-3.5" />
            <span>{isAr ? 'النشر متاح للمحللين وأعضاء VIP' : 'Publishing available for VIP & Analysts'}</span>
          </div>
        )}
      </div>

      {/* EMBEDDED TRADINGVIEW LIVE ANALYSIS WIDGETS (Technical Gauge + Timeline Stream) */}
      <TradingViewAnalysisWidgets lang={lang} />

      {/* FILTER & SEARCH CONTROLS */}
      <div className="bg-[#1e222d] border border-[#2a2e39] rounded-2xl p-3 sm:p-4 flex flex-col md:flex-row items-center justify-between gap-3 shrink-0 shadow-md">
        {/* Symbol Tickers Filter */}
        <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto no-scrollbar py-0.5">
          <span className="text-xs text-[#787b86] font-bold flex items-center gap-1 shrink-0 me-1">
            <Filter className="w-3.5 h-3.5" />
            <span>{isAr ? 'الأصل:' : 'Asset:'}</span>
          </span>
          {['ALL', 'US100', 'XAUUSD', 'EURUSD', 'BTCUSD', 'GBPUSD', 'WTI'].map((sym) => (
            <button
              key={sym}
              onClick={() => {
                soundManager.playClick();
                setActiveSymbol(sym);
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold font-mono transition-all cursor-pointer shrink-0 border ${
                activeSymbol === sym
                  ? 'bg-[#089981] text-white border-[#089981] shadow-md'
                  : 'bg-[#131722] text-[#787b86] hover:text-white border-[#2a2e39]'
              }`}
            >
              {sym === 'ALL' ? (isAr ? 'الكل' : 'ALL') : sym}
            </button>
          ))}
        </div>

        {/* Sentiment Filter + Search Input */}
        <div className="flex items-center gap-2 w-full md:w-auto justify-end">
          <div className="flex items-center gap-1 bg-[#131722] p-1 rounded-xl border border-[#2a2e39]">
            <button
              onClick={() => setActiveSentiment('ALL')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeSentiment === 'ALL' ? 'bg-[#2a2e39] text-white' : 'text-[#787b86] hover:text-white'
              }`}
            >
              {isAr ? 'الكل' : 'All'}
            </button>
            <button
              onClick={() => setActiveSentiment('Bullish')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                activeSentiment === 'Bullish'
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                  : 'text-[#787b86] hover:text-emerald-400'
              }`}
            >
              <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
              <span>{isAr ? 'صاعد 📈' : 'Bullish'}</span>
            </button>
            <button
              onClick={() => setActiveSentiment('Bearish')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                activeSentiment === 'Bearish'
                  ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40'
                  : 'text-[#787b86] hover:text-rose-400'
              }`}
            >
              <TrendingDown className="w-3.5 h-3.5 text-rose-400" />
              <span>{isAr ? 'هابط 📉' : 'Bearish'}</span>
            </button>
          </div>

          <div className="relative flex-1 md:w-48">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={isAr ? 'بحث في التحليلات...' : 'Search ideas...'}
              className="w-full bg-[#131722] border border-[#2a2e39] focus:border-[#089981] rounded-xl ps-8 pe-3 py-1.5 text-xs text-white placeholder-[#787b86] focus:outline-none"
            />
            <Search className="w-3.5 h-3.5 text-[#787b86] absolute start-2.5 top-1/2 -translate-y-1/2" />
          </div>
        </div>
      </div>

      {/* FEED OF IDEAS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {filteredIdeas.length === 0 ? (
          <div className="col-span-full text-center py-16 bg-[#1e222d] border border-[#2a2e39] rounded-2xl p-8 max-w-md mx-auto">
            <Lightbulb className="w-10 h-10 mx-auto mb-3 text-[#089981] opacity-60" />
            <h3 className="text-sm font-bold text-white mb-1">
              {isAr ? 'لا توجد أفكار تحليلية مطابقة' : 'No matching market ideas found'}
            </h3>
            <p className="text-xs text-[#787b86]">
              {isAr ? 'جرب اختيار رمز أصل آخر أو نشر فكرة جديدة الآن.' : 'Try selecting another asset symbol or publish a new idea.'}
            </p>
          </div>
        ) : (
          filteredIdeas.map((idea) => {
            const currentUserId = user.uid || user.id || 'anon';
            const isLikedByMe = idea.likedBy ? idea.likedBy.includes(currentUserId) : false;
            const isCommentsOpen = expandedComments[idea.id] || false;

            return (
              <div
                key={idea.id}
                className="bg-[#1e222d] border border-[#2a2e39] hover:border-[#089981]/50 rounded-2xl p-4 sm:p-5 shadow-xl transition-all flex flex-col justify-between space-y-4"
              >
                {/* Header: Author + Badges + Sentiment */}
                <div>
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <img
                        src={idea.authorAvatar}
                        alt={idea.authorName}
                        className="w-10 h-10 rounded-full object-cover border-2 border-[#2a2e39] shrink-0"
                      />
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-sm text-white truncate">{idea.authorName}</h4>
                          {renderRoleBadge(idea.authorRole)}
                        </div>
                        <span className="text-[11px] text-[#787b86] font-mono">{idea.createdAt}</span>
                      </div>
                    </div>

                    {/* Ticker & Sentiment Tags */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="px-2.5 py-1 rounded-lg bg-[#131722] border border-[#2a2e39] text-xs font-mono font-bold text-cyan-400">
                        ${idea.symbol}
                      </span>
                      {idea.sentiment === 'Bullish' ? (
                        <span className="px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 text-xs font-bold flex items-center gap-1">
                          <TrendingUp className="w-3.5 h-3.5" />
                          <span>صاعد 📈</span>
                        </span>
                      ) : (
                        <span className="px-2.5 py-1 rounded-lg bg-rose-500/20 text-rose-400 border border-rose-500/40 text-xs font-bold flex items-center gap-1">
                          <TrendingDown className="w-3.5 h-3.5" />
                          <span>هابط 📉</span>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Title & Body Content */}
                  <h3 className="text-base font-bold text-white leading-snug mb-2 font-sans">
                    {idea.title}
                  </h3>
                  <p className="text-xs text-[#d1d4dc] leading-relaxed whitespace-pre-wrap font-sans">
                    {idea.content}
                  </p>

                  {/* Attached TradingView Chart Snapshot */}
                  {idea.chartUrl && (
                    <div className="mt-3 rounded-xl overflow-hidden border border-[#2a2e39] bg-black/40 relative group">
                      <img
                        src={idea.chartUrl}
                        alt={idea.title}
                        onClick={() => setLightboxImage({ url: idea.chartUrl!, title: idea.title })}
                        className="w-full h-52 sm:h-64 object-cover cursor-pointer hover:scale-[1.01] transition-transform duration-200"
                      />
                      <button
                        onClick={() => setLightboxImage({ url: idea.chartUrl!, title: idea.title })}
                        className="absolute bottom-2 end-2 px-2.5 py-1 rounded-lg bg-black/75 backdrop-blur-md text-white text-[10px] font-bold flex items-center gap-1.5 border border-white/20 shadow-lg cursor-pointer"
                      >
                        <Maximize2 className="w-3 h-3 text-[#089981]" />
                        <span>{isAr ? 'تكبير الشارت' : 'Zoom Chart'}</span>
                      </button>
                    </div>
                  )}
                </div>

                {/* Footer Action Bar */}
                <div className="pt-3 border-t border-[#2a2e39] flex flex-col space-y-3">
                  <div className="flex items-center justify-between text-xs text-[#787b86]">
                    <div className="flex items-center gap-4">
                      {/* Like Button */}
                      <button
                        onClick={() => handleToggleLike(idea)}
                        className={`flex items-center gap-1.5 font-bold transition-all cursor-pointer ${
                          isLikedByMe ? 'text-rose-500' : 'hover:text-rose-400'
                        }`}
                      >
                        <Heart className={`w-4 h-4 ${isLikedByMe ? 'fill-rose-500 text-rose-500' : ''}`} />
                        <span>{idea.likesCount}</span>
                      </button>

                      {/* Comments Button */}
                      <button
                        onClick={() => {
                          soundManager.playClick();
                          setExpandedComments((prev) => ({ ...prev, [idea.id]: !prev[idea.id] }));
                        }}
                        className="flex items-center gap-1.5 font-bold hover:text-white transition-all cursor-pointer"
                      >
                        <MessageSquare className="w-4 h-4 text-blue-400" />
                        <span>
                          {idea.commentsCount} {isAr ? 'تعليقات' : 'Comments'}
                        </span>
                      </button>
                    </div>

                    <button
                      onClick={() => {
                        soundManager.playClick();
                        navigator.clipboard?.writeText(window.location.href);
                        alert(isAr ? 'تم نسخ رابط التحليل لمشاركته' : 'Analysis link copied');
                      }}
                      className="hover:text-white transition-colors cursor-pointer flex items-center gap-1"
                    >
                      <Share2 className="w-3.5 h-3.5" />
                      <span>{isAr ? 'مشاركة' : 'Share'}</span>
                    </button>
                  </div>

                  {/* Expandable Comments Panel */}
                  {isCommentsOpen && (
                    <div className="pt-3 border-t border-[#2a2e39]/60 space-y-3 animate-in fade-in">
                      {/* List of comments */}
                      {idea.comments && idea.comments.length > 0 ? (
                        <div className="space-y-2 max-h-48 overflow-y-auto pe-1">
                          {idea.comments.map((c) => (
                            <div key={c.id} className="p-2.5 rounded-xl bg-[#131722] border border-[#2a2e39] text-xs">
                              <div className="flex items-center justify-between mb-1">
                                <span className="font-bold text-white flex items-center gap-1.5">
                                  <span>{c.authorName}</span>
                                  {renderRoleBadge(c.authorRole)}
                                </span>
                                <span className="text-[10px] text-[#787b86] font-mono">{c.createdAt}</span>
                              </div>
                              <p className="text-[#d1d4dc] leading-relaxed">{c.text}</p>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-[11px] text-[#787b86] italic text-center py-1">
                          {isAr ? 'لا توجد تعليقات بعد. كن أول من يشارك رأيه!' : 'No comments yet. Be the first to share your thoughts!'}
                        </p>
                      )}

                      {/* Add comment input */}
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={newCommentTexts[idea.id] || ''}
                          onChange={(e) => setNewCommentTexts({ ...newCommentTexts, [idea.id]: e.target.value })}
                          placeholder={isAr ? 'اكتب تعليقاً على هذا التحليل...' : 'Add a comment...'}
                          className="flex-1 bg-[#131722] border border-[#2a2e39] focus:border-[#089981] rounded-xl px-3 py-1.5 text-xs text-white placeholder-[#787b86] focus:outline-none"
                        />
                        <button
                          onClick={() => handleAddComment(idea.id)}
                          disabled={!newCommentTexts[idea.id]?.trim()}
                          className="px-3 py-1.5 rounded-xl bg-[#089981] hover:bg-[#07806c] disabled:opacity-40 text-white font-bold text-xs transition-colors cursor-pointer flex items-center gap-1 shrink-0"
                        >
                          <Send className="w-3 h-3" />
                          <span>{isAr ? 'إرسال' : 'Send'}</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* PUBLISHING MODAL */}
      {isPublishModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 animate-in fade-in"
          onClick={() => setIsPublishModalOpen(false)}
        >
          <div
            className="bg-[#1e222d] border border-[#2a2e39] rounded-2xl w-full max-w-xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="px-4 py-3 border-b border-[#2a2e39] bg-[#171b26] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Lightbulb className="w-5 h-5 text-[#089981]" />
                <h3 className="font-bold text-sm text-white">
                  {isAr ? 'نشر فكرة تحليلية جديدة في TradingView Hub' : 'Publish New Market Analysis Idea'}
                </h3>
              </div>
              <button
                onClick={() => setIsPublishModalOpen(false)}
                className="p-1 rounded-lg text-[#787b86] hover:text-white hover:bg-[#2a2e39] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Form Body */}
            <form onSubmit={handlePublishSubmit} className="p-4 space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#787b86] mb-1">
                  {isAr ? 'عنوان الفكرة التحليلية:' : 'Idea Title:'}
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder={isAr ? 'مثال: تحليل ناسداك US100 - كسر واختبار FVG عند 20,720$' : 'e.g., US100 FVG Breakout Analysis'}
                  required
                  className="w-full bg-[#131722] border border-[#2a2e39] focus:border-[#089981] rounded-xl px-3 py-2 text-xs text-white placeholder-[#787b86] focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#787b86] mb-1">
                    {isAr ? 'رمز الأصل:' : 'Asset Symbol:'}
                  </label>
                  <select
                    value={symbol}
                    onChange={(e) => setSymbol(e.target.value as MarketSymbol)}
                    className="w-full bg-[#131722] border border-[#2a2e39] focus:border-[#089981] rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                  >
                    <option value="US100">US100 (ناسداك)</option>
                    <option value="XAUUSD">XAUUSD (الذهب)</option>
                    <option value="EURUSD">EURUSD (اليورو)</option>
                    <option value="BTCUSD">BTCUSD (البيتكوين)</option>
                    <option value="GBPUSD">GBPUSD (الباوند)</option>
                    <option value="WTI">WTI (النفط)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#787b86] mb-1">
                    {isAr ? 'الاتجاه المتوقع:' : 'Expected Sentiment:'}
                  </label>
                  <select
                    value={sentiment}
                    onChange={(e) => setSentiment(e.target.value as any)}
                    className="w-full bg-[#131722] border border-[#2a2e39] focus:border-[#089981] rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                  >
                    <option value="Bullish">صاعد 📈 (Bullish)</option>
                    <option value="Bearish">هابط 📉 (Bearish)</option>
                    <option value="Neutral">حيادي ⚖️ (Neutral)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#787b86] mb-1">
                  {isAr ? 'رابط صوره الشارت (TradingView Chart Snapshot URL):' : 'Chart Snapshot URL:'}
                </label>
                <input
                  type="url"
                  value={chartUrl}
                  onChange={(e) => setChartUrl(e.target.value)}
                  placeholder="https://images.unsplash.com/photo-..."
                  className="w-full bg-[#131722] border border-[#2a2e39] focus:border-[#089981] rounded-xl px-3 py-2 text-xs text-white placeholder-[#787b86] focus:outline-none font-mono"
                />

                {/* Preset charts selector */}
                <div className="mt-2 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
                  <span className="text-[10px] text-[#787b86] shrink-0">{isAr ? 'قوالب جاهزة:' : 'Presets:'}</span>
                  {PRESET_CHARTS.map((p) => (
                    <button
                      key={p.url}
                      type="button"
                      onClick={() => setChartUrl(p.url)}
                      className="px-2 py-0.5 rounded bg-[#131722] hover:bg-[#2a2e39] border border-[#2a2e39] text-[10px] text-amber-400 shrink-0 cursor-pointer"
                    >
                      {isAr ? p.nameAr : p.nameEn}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#787b86] mb-1">
                  {isAr ? 'تفاصيل التحليل الفني والأساسي:' : 'Detailed Technical Analysis:'}
                </label>
                <textarea
                  rows={5}
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder={
                    isAr
                      ? 'اكتب شرح الشارت والمستويات الفنية المهمة والدعوم والمقاومات وأهداف الصفقة...'
                      : 'Write full technical commentary, key levels, invalidation rules...'
                  }
                  required
                  className="w-full bg-[#131722] border border-[#2a2e39] focus:border-[#089981] rounded-xl p-3 text-xs text-white placeholder-[#787b86] focus:outline-none leading-relaxed"
                />
              </div>

              {/* Submit button */}
              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsPublishModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-[#131722] hover:bg-[#2a2e39] text-[#787b86] hover:text-white text-xs font-bold transition-colors cursor-pointer"
                >
                  {isAr ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  disabled={isPublishing || !title.trim() || !content.trim()}
                  className="px-5 py-2 rounded-xl bg-[#089981] hover:bg-[#07806c] disabled:opacity-50 text-white font-bold text-xs transition-colors cursor-pointer flex items-center gap-1.5 shadow-lg shadow-[#089981]/30"
                >
                  <Send className={`w-3.5 h-3.5 ${isPublishing ? 'animate-pulse' : ''}`} />
                  <span>{isAr ? (isPublishing ? 'جاري النشر...' : 'نشر التحليل الآن') : 'Publish Now'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* LIGHTBOX ZOOM MODAL */}
      {lightboxImage && (
        <div
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in"
          onClick={() => setLightboxImage(null)}
        >
          <div className="relative max-w-4xl w-full max-h-[90vh] flex flex-col items-center" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setLightboxImage(null)}
              className="absolute -top-10 end-0 p-1.5 rounded-full bg-black/60 text-white hover:text-rose-400 cursor-pointer"
            >
              <X className="w-6 h-6" />
            </button>
            <img
              src={lightboxImage.url}
              alt={lightboxImage.title}
              className="max-h-[80vh] w-auto object-contain rounded-xl border border-white/20 shadow-2xl"
            />
            <p className="mt-3 text-xs text-amber-300 font-bold font-sans text-center">
              📊 {lightboxImage.title}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
