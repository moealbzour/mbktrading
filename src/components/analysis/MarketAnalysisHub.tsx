import React, { useEffect, useMemo, useState } from 'react';
import {
  BarChart3,
  Clock,
  Edit3,
  Eye,
  EyeOff,
  Image as ImageIcon,
  Maximize2,
  Minus,
  Plus,
  RefreshCw,
  ShieldAlert,
  Sparkles,
  Target,
  Trash2,
  TrendingDown,
  TrendingUp,
  Upload,
  UserCheck,
  X
} from 'lucide-react';
import { UserProfile } from '../../types/trading';
import { hasFeatureAccess } from '../../utils/entitlements';
import { hasStaffPermission } from '../../utils/rbac';
import { soundManager } from '../../utils/audio';
import {
  AnalysisDirection,
  MarketAnalysisPost,
  deleteMarketAnalysisPost,
  fetchMarketAnalysisPosts,
  saveMarketAnalysisPost
} from '../../services/marketAnalysisService';
import { auth } from '../../lib/firebase';

export interface MarketAnalysisHubProps {
  lang?: 'ar' | 'en';
  userProfile?: UserProfile | null;
  isAdmin?: boolean;
}

type SymbolFilter = 'ALL' | 'XAUUSD' | 'US100' | 'BTCUSD' | 'FOREX';

interface AnalysisFormState {
  id?: string;
  titleAr: string;
  titleEn: string;
  symbol: string;
  timeframe: string;
  direction: AnalysisDirection;
  summaryAr: string;
  summaryEn: string;
  imageUrl: string;
  targetPrice: string;
  invalidationLevel: string;
  isPublished: boolean;
  timestampMs?: number;
}

const EMPTY_ANALYSIS_FORM: AnalysisFormState = {
  titleAr: '',
  titleEn: '',
  symbol: 'XAUUSD',
  timeframe: '4H',
  direction: 'BULLISH',
  summaryAr: '',
  summaryEn: '',
  imageUrl: '',
  targetPrice: '',
  invalidationLevel: '',
  isPublished: true
};

function compressChartImageToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const maxWidth = 1280;
        const maxHeight = 800;
        let width = img.width;
        let height = img.height;

        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }
        if (height > maxHeight) {
          width = Math.round((width * maxHeight) / height);
          height = maxHeight;
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Canvas context unavailable'));
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.78));
      };
      img.onerror = () => reject(new Error('Invalid chart image file'));
      img.src = String(reader.result || '');
    };
    reader.onerror = () => reject(new Error('Failed reading image file'));
    reader.readAsDataURL(file);
  });
}

function formatAnalysisTimestamp(tsMs: number, isAr: boolean): string {
  if (!tsMs) return '';
  try {
    return new Date(tsMs).toLocaleString(isAr ? 'ar-EG' : 'en-GB', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch {
    return '';
  }
}

export const MarketAnalysisHub: React.FC<MarketAnalysisHubProps> = ({
  lang = 'ar',
  userProfile,
  isAdmin: isAdminProp
}) => {
  const isAr = lang === 'ar';

  const isAdmin = useMemo(() => {
    if (typeof isAdminProp === 'boolean' && isAdminProp) return true;
    if (!userProfile) return false;
    const roleUpper = (userProfile.role || '').toString().toUpperCase();
    return Boolean(
      userProfile.isAdmin ||
        roleUpper === 'ADMIN' ||
        userProfile.email?.toLowerCase() === 'moe.albzour@gmail.com' ||
        auth.currentUser?.email?.toLowerCase() === 'moe.albzour@gmail.com'
    );
  }, [isAdminProp, userProfile]);

  // Strict authorization: Admin OR canPostAnalysis staff permission OR explicitly granted 'publishAnalysis' access
  const canPublishAnalysis = useMemo(() => {
    if (isAdmin) return true;
    if (hasStaffPermission(userProfile, 'canPostAnalysis')) return true;
    return hasFeatureAccess(userProfile, 'publishAnalysis');
  }, [isAdmin, userProfile]);

  const [posts, setPosts] = useState<MarketAnalysisPost[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [symbolFilter, setSymbolFilter] = useState<SymbolFilter>('ALL');

  // Selected post for full analysis modal & full-screen chart photo view
  const [selectedPost, setSelectedPost] = useState<MarketAnalysisPost | null>(null);
  const [zoomedImageUrl, setZoomedImageUrl] = useState<string | null>(null);

  // Editor modal state (only accessible when canPublishAnalysis is true)
  const [editorOpen, setEditorOpen] = useState<boolean>(false);
  const [formState, setFormState] = useState<AnalysisFormState>(EMPTY_ANALYSIS_FORM);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [editorError, setEditorError] = useState<string>('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [busyPostId, setBusyPostId] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    setIsLoading(true);
    fetchMarketAnalysisPosts(false)
      .then((cachedOrFresh) => {
        if (mounted) {
          setPosts(cachedOrFresh);
          setIsLoading(false);
        }
      })
      .catch(() => {
        if (mounted) setIsLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  const handleRefresh = async () => {
    soundManager.playClick();
    setIsRefreshing(true);
    try {
      const fresh = await fetchMarketAnalysisPosts(true);
      setPosts(fresh);
    } finally {
      setIsRefreshing(false);
    }
  };

  const visiblePosts = useMemo(() => {
    return posts.filter((post) => {
      if (!canPublishAnalysis && !post.isPublished) return false;
      if (symbolFilter === 'ALL') return true;
      const sym = (post.symbol || '').toUpperCase();
      if (symbolFilter === 'XAUUSD') return sym.includes('XAU') || sym.includes('GOLD');
      if (symbolFilter === 'US100') {
        return sym.includes('US100') || sym.includes('NAS') || sym.includes('NDX') || sym.includes('US30');
      }
      if (symbolFilter === 'BTCUSD') return sym.includes('BTC') || sym.includes('ETH');
      if (symbolFilter === 'FOREX') {
        return (
          !sym.includes('XAU') &&
          !sym.includes('GOLD') &&
          !sym.includes('US100') &&
          !sym.includes('NAS') &&
          !sym.includes('BTC')
        );
      }
      return true;
    });
  }, [posts, canPublishAnalysis, symbolFilter]);

  const getDirectionMeta = (dir: AnalysisDirection) => {
    if (dir === 'BEARISH') {
      return {
        labelAr: 'نظرة هابطة (BEARISH)',
        labelEn: 'BEARISH BIAS',
        icon: TrendingDown,
        badgeClass: 'bg-rose-500/15 text-rose-400 border-rose-500/35',
        borderAccent: 'border-s-4 border-s-rose-500'
      };
    }
    if (dir === 'NEUTRAL') {
      return {
        labelAr: 'منطقة تجميع / محايد',
        labelEn: 'NEUTRAL / RANGE',
        icon: Minus,
        badgeClass: 'bg-amber-500/15 text-amber-300 border-amber-500/35',
        borderAccent: 'border-s-4 border-s-amber-500'
      };
    }
    return {
      labelAr: 'نظرة صاعدة (BULLISH)',
      labelEn: 'BULLISH BIAS',
      icon: TrendingUp,
      badgeClass: 'bg-[#10b981]/15 text-[#10b981] border-[#10b981]/35',
      borderAccent: 'border-s-4 border-s-[#10b981]'
    };
  };

  const openCreateModal = () => {
    if (!canPublishAnalysis) return;
    soundManager.playClick();
    setEditorError('');
    setFormState({ ...EMPTY_ANALYSIS_FORM });
    setEditorOpen(true);
  };

  const openEditModal = (post: MarketAnalysisPost) => {
    if (!canPublishAnalysis) return;
    soundManager.playClick();
    setEditorError('');
    setFormState({
      id: post.id,
      titleAr: post.titleAr,
      titleEn: post.titleEn,
      symbol: post.symbol,
      timeframe: post.timeframe,
      direction: post.direction,
      summaryAr: post.summaryAr,
      summaryEn: post.summaryEn,
      imageUrl: post.imageUrl || '',
      targetPrice: post.targetPrice || '',
      invalidationLevel: post.invalidationLevel || '',
      isPublished: post.isPublished,
      timestampMs: post.timestampMs
    });
    setEditorOpen(true);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const dataUrl = await compressChartImageToDataUrl(file);
      setFormState((prev) => ({ ...prev, imageUrl: dataUrl }));
      setEditorError('');
    } catch {
      setEditorError(isAr ? 'تعذر معالجة صورة الشارت المختارة.' : 'Could not process chart image.');
    }
  };

  const handleSaveAnalysis = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canPublishAnalysis) return;

    const cleanTitleAr = formState.titleAr.trim();
    const cleanSummaryAr = formState.summaryAr.trim();
    if (!cleanTitleAr) {
      setEditorError(isAr ? 'يرجى إدخال عنوان التحليل الرئيسي.' : 'Please enter the main analysis subject.');
      return;
    }
    if (!cleanSummaryAr) {
      setEditorError(isAr ? 'يرجى كتابة تفاصيل التحليل الفني.' : 'Please write the analysis description.');
      return;
    }

    setIsSaving(true);
    setEditorError('');
    try {
      const myUid = auth.currentUser?.uid || userProfile?.uid || userProfile?.id || 'mbktrading';
      const myName = (userProfile?.name || userProfile?.email?.split('@')[0] || 'MBK Analyst').trim();
      const myRole = (userProfile?.role || (isAdmin ? 'ADMIN' : 'ANALYSER')).toString().toUpperCase();

      await saveMarketAnalysisPost({
        id: formState.id,
        titleAr: cleanTitleAr,
        titleEn: formState.titleEn.trim() || cleanTitleAr,
        symbol: formState.symbol.trim().toUpperCase() || 'XAUUSD',
        timeframe: formState.timeframe.trim() || '4H',
        direction: formState.direction,
        summaryAr: cleanSummaryAr,
        summaryEn: formState.summaryEn.trim() || cleanSummaryAr,
        imageUrl: formState.imageUrl.trim(),
        targetPrice: formState.targetPrice.trim(),
        invalidationLevel: formState.invalidationLevel.trim(),
        authorUid: myUid,
        authorName: myName,
        authorRole: myRole,
        isPublished: formState.isPublished,
        timestampMs: formState.timestampMs
      });

      const refreshed = await fetchMarketAnalysisPosts(true);
      setPosts(refreshed);
      soundManager.playSuccess();
      setEditorOpen(false);
    } catch (err: any) {
      setEditorError(
        err?.message || (isAr ? 'تعذر حفظ التحليل في قاعدة البيانات.' : 'Could not save analysis post.')
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleTogglePublish = async (post: MarketAnalysisPost) => {
    if (!canPublishAnalysis) return;
    soundManager.playClick();
    setBusyPostId(post.id);
    try {
      await saveMarketAnalysisPost({
        ...post,
        isPublished: !post.isPublished
      });
      const refreshed = await fetchMarketAnalysisPosts(true);
      setPosts(refreshed);
    } finally {
      setBusyPostId(null);
    }
  };

  const handleDeletePost = async (id: string) => {
    if (!canPublishAnalysis) return;
    soundManager.playClick();
    setBusyPostId(id);
    try {
      await deleteMarketAnalysisPost(id);
      const refreshed = await fetchMarketAnalysisPosts(true);
      setPosts(refreshed);
      setConfirmDeleteId(null);
      if (selectedPost?.id === id) {
        setSelectedPost(null);
      }
    } finally {
      setBusyPostId(null);
    }
  };

  return (
    <div className="space-y-4 bg-[#06080c] text-[#D1D4DC]" dir={isAr ? 'rtl' : 'ltr'}>
      {/* 1. HEADER & SYMBOL FILTER BAR (Matching Store Styling) */}
      <div className="bg-[#0b0e14] border border-white/10 rounded-xl overflow-hidden">
        <div className="p-4 bg-[#06080c] border-b border-white/10 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#10b981]/15 border border-[#10b981]/40 flex items-center justify-center text-[#10b981] shrink-0">
              <BarChart3 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-extrabold text-white flex items-center gap-2 flex-wrap">
                <span>
                  {isAr ? 'تحليلات السوق والشارت — فريق MBK' : 'MBK Team Market & Chart Analysis'}
                </span>
                <span className="px-2 py-0.5 rounded-[3px] text-[10px] font-mono font-bold bg-[#10b981]/15 text-[#10b981] border border-[#10b981]/30">
                  INSTITUTIONAL DESK
                </span>
              </h2>
              <p className="text-xs text-[#787B86] mt-0.5">
                {isAr
                  ? 'خرائط السيولة، مناطق العرض والطلب، وتحليلات الشارت المصورة للذهب (XAUUSD) والناسداك (US100)'
                  : 'Institutional chart breakdowns, liquidity zones, and technical outlook shared by the MBK Analysis Desk'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="px-2.5 py-1.5 rounded-[4px] bg-[#0b0e14] hover:bg-[#0f141e] border border-white/10 text-xs font-semibold text-[#D1D4DC] flex items-center gap-1.5 cursor-pointer transition-colors"
              title={isAr ? 'تحديث التحليلات' : 'Refresh Analysis'}
            >
              <RefreshCw
                className={`w-3.5 h-3.5 text-[#10b981] ${isRefreshing ? 'animate-spin' : ''}`}
              />
              <span className="hidden sm:inline">{isAr ? 'تحديث' : 'Refresh'}</span>
            </button>

            {canPublishAnalysis && (
              <button
                type="button"
                onClick={openCreateModal}
                className="px-3.5 py-1.5 rounded-[4px] bg-[#10b981] hover:bg-[#059669] text-[#06080c] text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors shadow-sm"
              >
                <Plus className="w-4 h-4" />
                <span>{isAr ? '+ نشر تحليل شارت جديد' : '+ Share Chart Analysis'}</span>
              </button>
            )}
          </div>
        </div>

        {/* Filter Bar */}
        <div className="px-4 py-2.5 bg-[#0b0e14] flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 flex-wrap">
            {(
              [
                { id: 'ALL', labelAr: 'جميع التحليلات', labelEn: 'All Analysis' },
                { id: 'XAUUSD', labelAr: 'الذهب (XAUUSD)', labelEn: 'Gold (XAUUSD)' },
                { id: 'US100', labelAr: 'المؤشرات (US100 / US30)', labelEn: 'Indices (US100)' },
                { id: 'BTCUSD', labelAr: 'العملات الرقمية (BTC)', labelEn: 'Crypto (BTC)' },
                { id: 'FOREX', labelAr: 'العملات (Forex)', labelEn: 'Forex' }
              ] as Array<{ id: SymbolFilter; labelAr: string; labelEn: string }>
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  soundManager.playClick();
                  setSymbolFilter(tab.id);
                }}
                className={`px-3 py-1.5 rounded-[4px] text-xs font-bold transition-colors cursor-pointer border ${
                  symbolFilter === tab.id
                    ? 'bg-[#10b981] text-[#06080c] border-[#10b981]'
                    : 'bg-[#06080c] text-[#787B86] hover:text-[#D1D4DC] border-white/10'
                }`}
              >
                {isAr ? tab.labelAr : tab.labelEn}
              </button>
            ))}
          </div>

          {canPublishAnalysis && (
            <span className="px-2.5 py-1 rounded-[4px] bg-[#10b981]/10 border border-[#10b981]/30 text-[#10b981] text-[11px] font-bold flex items-center gap-1.5">
              <UserCheck className="w-3.5 h-3.5" />
              <span>
                {isAr ? 'صلاحية نشر التحليلات مفعلة لحسابك' : 'Analysis Publishing Access Active'}
              </span>
            </span>
          )}
        </div>
      </div>

      {/* 2. WIDE TAB CARDS LIST (Arranged as Wide Horizontal Cards with Chart Photo + Main Subject + Partial Description) */}
      {isLoading ? (
        <div className="bg-[#0b0e14] border border-white/10 rounded-xl p-12 text-center space-y-2">
          <RefreshCw className="w-6 h-6 text-[#10b981] animate-spin mx-auto" />
          <p className="text-xs text-[#787B86] font-mono">
            {isAr ? 'جاري تحميل تحليلات السوق...' : 'Loading market analysis...'}
          </p>
        </div>
      ) : visiblePosts.length === 0 ? (
        <div className="bg-[#0b0e14] border border-white/10 rounded-xl p-8 sm:p-12 text-center max-w-2xl mx-auto space-y-4">
          <div className="w-12 h-12 rounded-xl bg-[#10b981]/15 border border-[#10b981]/35 flex items-center justify-center text-[#10b981] mx-auto">
            <BarChart3 className="w-6 h-6" />
          </div>
          <div className="space-y-1.5">
            <h3 className="text-sm sm:text-base font-extrabold text-white">
              {isAr
                ? 'لا توجد تحليلات منشورة في هذا القسم حالياً'
                : 'No market analysis published in this category yet'}
            </h3>
            <p className="text-xs text-[#787B86] leading-relaxed max-w-lg mx-auto">
              {isAr
                ? 'يقوم فريق محللي MBK بمشاركة تحليلات الشارت المصورة ومناطق السيولة المؤسسية هنا فور اكتمالها.'
                : 'The MBK Analysis team shares institutional chart breakdowns and key liquidity zones here.'}
            </p>
          </div>
          {canPublishAnalysis && (
            <div className="pt-2 flex justify-center">
              <button
                type="button"
                onClick={openCreateModal}
                className="px-4 py-2 rounded-[4px] bg-[#10b981] hover:bg-[#059669] text-[#06080c] text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span>{isAr ? '+ نشر أول تحليل للسوق' : '+ Publish First Market Analysis'}</span>
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {visiblePosts.map((post) => {
            const dirMeta = getDirectionMeta(post.direction);
            const DirIcon = dirMeta.icon;
            const title = isAr ? post.titleAr : post.titleEn;
            const summary = isAr ? post.summaryAr : post.summaryEn;
            const isBusy = busyPostId === post.id;

            return (
              <div
                key={post.id}
                onClick={() => {
                  soundManager.playClick();
                  setSelectedPost(post);
                }}
                className={`group bg-[#0b0e14] hover:bg-[#0f141e] border rounded-xl overflow-hidden transition-all cursor-pointer flex flex-col md:flex-row items-stretch ${
                  dirMeta.borderAccent
                } ${
                  !post.isPublished
                    ? 'border-amber-500/50 opacity-85'
                    : 'border-white/10 hover:border-[#10b981]/50 shadow-lg'
                }`}
              >
                {/* Wide Tab Thumbnail / Chart Photo Side */}
                <div className="w-full md:w-64 lg:w-72 h-48 md:h-auto bg-[#06080c] border-b md:border-b-0 md:border-e border-white/10 relative shrink-0 overflow-hidden flex items-center justify-center">
                  {post.imageUrl ? (
                    <>
                      <img
                        src={post.imageUrl}
                        alt={title}
                        className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-300"
                        loading="lazy"
                      />
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          soundManager.playClick();
                          setZoomedImageUrl(post.imageUrl || null);
                        }}
                        className="absolute bottom-2.5 end-2.5 px-2 py-1 rounded bg-black/75 hover:bg-black text-white text-[10px] font-bold border border-white/15 flex items-center gap-1 cursor-pointer backdrop-blur-sm"
                        title={isAr ? 'تكبير صورة الشارت' : 'Zoom Chart Photo'}
                      >
                        <Maximize2 className="w-3 h-3 text-[#10b981]" />
                        <span>{isAr ? 'تكبير الشارت' : 'Zoom Chart'}</span>
                      </button>
                    </>
                  ) : (
                    <div className="p-6 text-center space-y-1.5 text-[#787B86]">
                      <BarChart3 className="w-8 h-8 mx-auto text-[#10b981]/50" />
                      <span className="text-[11px] font-mono block">{post.symbol} • {post.timeframe}</span>
                    </div>
                  )}

                  {/* Symbol Badge on Thumbnail */}
                  <div className="absolute top-2.5 start-2.5 flex items-center gap-1.5">
                    <span className="px-2 py-0.5 rounded-[3px] bg-black/80 backdrop-blur-md border border-white/15 text-white font-mono font-extrabold text-[11px]">
                      {post.symbol}
                    </span>
                    <span className="px-1.5 py-0.5 rounded-[3px] bg-black/80 backdrop-blur-md border border-white/15 text-[#10b981] font-mono font-bold text-[10px]">
                      {post.timeframe}
                    </span>
                  </div>

                  {!post.isPublished && canPublishAnalysis && (
                    <span className="absolute top-2.5 end-2.5 px-2 py-0.5 rounded-[3px] bg-amber-500 text-black text-[10px] font-mono font-bold">
                      {isAr ? 'مخفي (مسودة)' : 'DRAFT'}
                    </span>
                  )}
                </div>

                {/* Wide Tab Main Content: Subject + Partial Description Preview + Key Levels + Footer */}
                <div className="flex-1 min-w-0 p-4 flex flex-col justify-between gap-3">
                  <div className="space-y-2">
                    {/* Top Metadata Row */}
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span
                          className={`px-2 py-0.5 rounded-[3px] border text-[10px] font-bold inline-flex items-center gap-1 ${dirMeta.badgeClass}`}
                        >
                          <DirIcon className="w-3 h-3" />
                          <span>{isAr ? dirMeta.labelAr : dirMeta.labelEn}</span>
                        </span>

                        {post.targetPrice && (
                          <span className="px-2 py-0.5 rounded-[3px] bg-[#10b981]/10 border border-[#10b981]/30 text-[#10b981] text-[10px] font-mono font-bold inline-flex items-center gap-1">
                            <Target className="w-3 h-3" />
                            <span>
                              {isAr ? 'المستهدف:' : 'Target:'} {post.targetPrice}
                            </span>
                          </span>
                        )}

                        {post.invalidationLevel && (
                          <span className="px-2 py-0.5 rounded-[3px] bg-rose-500/10 border border-rose-500/30 text-rose-300 text-[10px] font-mono font-bold inline-flex items-center gap-1">
                            <ShieldAlert className="w-3 h-3" />
                            <span>
                              {isAr ? 'إلغاء السيناريو:' : 'Invalidation:'} {post.invalidationLevel}
                            </span>
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2 text-[11px] text-[#787B86] font-mono">
                        <span>{post.authorName}</span>
                        <span>•</span>
                        <span className="inline-flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {formatAnalysisTimestamp(post.timestampMs, isAr)}
                        </span>
                      </div>
                    </div>

                    {/* Main Subject / Headline */}
                    <h3 className="text-sm sm:text-base font-extrabold text-white group-hover:text-[#10b981] transition-colors leading-snug">
                      {title}
                    </h3>

                    {/* Truncated Preview (Shows Part of the Analysis Topic) */}
                    <p className="text-xs text-[#9db2c6] leading-relaxed line-clamp-2 whitespace-pre-line">
                      {summary}
                    </p>
                  </div>

                  {/* Bottom Bar: Read Full Analysis + Admin/Analyser Actions */}
                  <div className="pt-2.5 border-t border-white/10 flex flex-wrap items-center justify-between gap-2">
                    <span className="text-xs font-bold text-[#10b981] group-hover:underline inline-flex items-center gap-1.5">
                      <Eye className="w-3.5 h-3.5" />
                      <span>
                        {isAr
                          ? 'عرض التحليل الكامل وصورة الشارت ←'
                          : 'Read Full Analysis & View Chart →'}
                      </span>
                    </span>

                    {canPublishAnalysis && (
                      <div
                        className="flex items-center gap-1.5"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          type="button"
                          onClick={() => openEditModal(post)}
                          disabled={isBusy}
                          className="px-2.5 py-1 rounded-[3px] bg-[#06080c] hover:bg-[#131a29] border border-white/10 text-[11px] font-semibold text-[#D1D4DC] flex items-center gap-1 cursor-pointer"
                        >
                          <Edit3 className="w-3 h-3 text-[#10b981]" />
                          <span>{isAr ? 'تعديل' : 'Edit'}</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleTogglePublish(post)}
                          disabled={isBusy}
                          className="px-2.5 py-1 rounded-[3px] bg-[#06080c] hover:bg-[#131a29] border border-white/10 text-[11px] font-semibold text-[#D1D4DC] flex items-center gap-1 cursor-pointer"
                        >
                          {post.isPublished ? (
                            <>
                              <EyeOff className="w-3 h-3 text-amber-400" />
                              <span>{isAr ? 'إخفاء' : 'Hide'}</span>
                            </>
                          ) : (
                            <>
                              <Eye className="w-3 h-3 text-[#10b981]" />
                              <span>{isAr ? 'نشر' : 'Publish'}</span>
                            </>
                          )}
                        </button>

                        {confirmDeleteId === post.id ? (
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => handleDeletePost(post.id)}
                              disabled={isBusy}
                              className="px-2 py-1 rounded-[3px] bg-rose-600 text-white text-[10px] font-bold cursor-pointer"
                            >
                              {isAr ? 'تأكيد الحذف' : 'Confirm'}
                            </button>
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteId(null)}
                              className="px-2 py-1 rounded-[3px] bg-[#06080c] border border-white/10 text-[#787B86] text-[10px] cursor-pointer"
                            >
                              {isAr ? 'إلغاء' : 'Cancel'}
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteId(post.id)}
                            disabled={isBusy}
                            className="px-2 py-1 rounded-[3px] bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-rose-400 text-[11px] font-semibold flex items-center gap-1 cursor-pointer"
                          >
                            <Trash2 className="w-3 h-3" />
                            <span>{isAr ? 'حذف' : 'Delete'}</span>
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 3. FULL ANALYSIS DETAIL MODAL */}
      {selectedPost && (
        <div
          className="fixed inset-0 z-[95] bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
          onClick={() => setSelectedPost(null)}
        >
          <div
            className="bg-[#0b0e14] border border-white/15 rounded-2xl w-full max-w-3xl overflow-hidden shadow-2xl my-auto max-h-[90vh] flex flex-col"
            dir={isAr ? 'rtl' : 'ltr'}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="px-4 py-3 bg-[#06080c] border-b border-white/10 flex items-center justify-between gap-2 shrink-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-2 py-0.5 rounded bg-[#10b981]/15 border border-[#10b981]/40 text-[#10b981] font-mono font-extrabold text-xs">
                  {selectedPost.symbol}
                </span>
                <span className="px-2 py-0.5 rounded bg-white/5 border border-white/10 text-white font-mono text-xs">
                  {selectedPost.timeframe}
                </span>
                <span className="text-xs text-[#787B86] font-mono">
                  {selectedPost.authorName} • {formatAnalysisTimestamp(selectedPost.timestampMs, isAr)}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setSelectedPost(null)}
                className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-[#9db2c6] hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Scrollable Body */}
            <div className="p-4 sm:p-5 overflow-y-auto space-y-4">
              {selectedPost.imageUrl && (
                <div className="rounded-xl overflow-hidden border border-white/10 bg-[#06080c] relative group">
                  <img
                    src={selectedPost.imageUrl}
                    alt={isAr ? selectedPost.titleAr : selectedPost.titleEn}
                    className="w-full max-h-[420px] object-contain mx-auto cursor-zoom-in"
                    onClick={() => setZoomedImageUrl(selectedPost.imageUrl || null)}
                  />
                  <button
                    type="button"
                    onClick={() => setZoomedImageUrl(selectedPost.imageUrl || null)}
                    className="absolute bottom-3 end-3 px-3 py-1.5 rounded-lg bg-black/80 hover:bg-black text-white text-xs font-bold border border-white/15 flex items-center gap-1.5 cursor-pointer"
                  >
                    <Maximize2 className="w-3.5 h-3.5 text-[#10b981]" />
                    <span>{isAr ? 'فتح الشارت بالحجم الكامل' : 'Open Full-Size Chart'}</span>
                  </button>
                </div>
              )}

              <div className="flex flex-wrap items-center gap-2">
                {(() => {
                  const dirMeta = getDirectionMeta(selectedPost.direction);
                  const DirIcon = dirMeta.icon;
                  return (
                    <span
                      className={`px-2.5 py-1 rounded border text-xs font-bold inline-flex items-center gap-1.5 ${dirMeta.badgeClass}`}
                    >
                      <DirIcon className="w-3.5 h-3.5" />
                      <span>{isAr ? dirMeta.labelAr : dirMeta.labelEn}</span>
                    </span>
                  );
                })()}

                {selectedPost.targetPrice && (
                  <span className="px-2.5 py-1 rounded bg-[#10b981]/10 border border-[#10b981]/30 text-[#10b981] text-xs font-mono font-bold inline-flex items-center gap-1.5">
                    <Target className="w-3.5 h-3.5" />
                    <span>
                      {isAr ? 'المستهدفات:' : 'Targets:'} {selectedPost.targetPrice}
                    </span>
                  </span>
                )}

                {selectedPost.invalidationLevel && (
                  <span className="px-2.5 py-1 rounded bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-mono font-bold inline-flex items-center gap-1.5">
                    <ShieldAlert className="w-3.5 h-3.5" />
                    <span>
                      {isAr ? 'إلغاء السيناريو:' : 'Invalidation:'} {selectedPost.invalidationLevel}
                    </span>
                  </span>
                )}
              </div>

              <h3 className="text-base sm:text-lg font-extrabold text-white leading-snug">
                {isAr ? selectedPost.titleAr : selectedPost.titleEn}
              </h3>

              <div className="p-4 rounded-xl bg-[#06080c] border border-white/10 text-xs sm:text-sm text-[#e1e4ea] leading-relaxed whitespace-pre-wrap">
                {isAr ? selectedPost.summaryAr : selectedPost.summaryEn}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 4. FULL-SCREEN CHART IMAGE LIGHTBOX */}
      {zoomedImageUrl && (
        <div
          className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-md flex items-center justify-center p-3 sm:p-6"
          onClick={() => setZoomedImageUrl(null)}
        >
          <button
            type="button"
            onClick={() => setZoomedImageUrl(null)}
            className="fixed top-4 end-4 p-2.5 rounded-full bg-white/10 hover:bg-white/20 text-white border border-white/20 cursor-pointer z-10"
          >
            <X className="w-5 h-5" />
          </button>
          <img
            src={zoomedImageUrl}
            alt="Full Chart Analysis"
            className="max-w-full max-h-[92vh] object-contain rounded-lg border border-white/15 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}

      {/* 5. ADMIN / AUTHORIZED ANALYST CREATE & EDIT MODAL */}
      {canPublishAnalysis && editorOpen && (
        <div className="fixed inset-0 z-[95] bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div
            className="bg-[#0b0e14] border border-white/10 rounded-xl w-full max-w-2xl overflow-hidden shadow-2xl my-auto"
            dir={isAr ? 'rtl' : 'ltr'}
          >
            <div className="px-4 py-3 bg-[#06080c] border-b border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#10b981]" />
                <h3 className="text-sm font-extrabold text-white">
                  {formState.id
                    ? isAr
                      ? 'تعديل تحليل السوق والشارت'
                      : 'Edit Market Analysis'
                    : isAr
                    ? 'نشر تحليل فني وشارت جديد — فريق MBK'
                    : 'Publish New Market & Chart Analysis'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setEditorOpen(false)}
                className="p-1 rounded text-[#787B86] hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form
              onSubmit={handleSaveAnalysis}
              className="p-4 space-y-3.5 max-h-[82vh] overflow-y-auto text-xs"
            >
              {editorError && (
                <div className="p-2.5 rounded bg-rose-500/15 border border-rose-500/40 text-rose-300 text-xs font-semibold">
                  {editorError}
                </div>
              )}

              {/* Subject / Main Title */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-[#D1D4DC] mb-1">
                    {isAr ? 'الموضوع الرئيسي للتحليل (بالعربية) *' : 'Main Subject / Headline (Arabic) *'}
                  </label>
                  <input
                    type="text"
                    required
                    value={formState.titleAr}
                    onChange={(e) =>
                      setFormState((prev) => ({ ...prev, titleAr: e.target.value }))
                    }
                    placeholder={
                      isAr
                        ? 'مثال: خارطة سيولة الذهب XAUUSD ومناطق الارتداد المؤسسية'
                        : 'Analysis headline in Arabic'
                    }
                    className="w-full px-3 py-2 rounded-[4px] bg-[#06080c] border border-white/10 text-white focus:outline-none focus:border-[#10b981]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-[#D1D4DC] mb-1">
                    {isAr ? 'العنوان (بالإنجليزية - اختياري)' : 'Headline (English - Optional)'}
                  </label>
                  <input
                    type="text"
                    value={formState.titleEn}
                    onChange={(e) =>
                      setFormState((prev) => ({ ...prev, titleEn: e.target.value }))
                    }
                    placeholder="e.g. XAUUSD Institutional Liquidity & Orderblock Outlook"
                    className="w-full px-3 py-2 rounded-[4px] bg-[#06080c] border border-white/10 text-white focus:outline-none focus:border-[#10b981]"
                  />
                </div>
              </div>

              {/* Symbol, Timeframe, Direction */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-[#D1D4DC] mb-1">
                    {isAr ? 'الرمز / السوق' : 'Symbol / Market'}
                  </label>
                  <input
                    type="text"
                    value={formState.symbol}
                    onChange={(e) =>
                      setFormState((prev) => ({ ...prev, symbol: e.target.value.toUpperCase() }))
                    }
                    placeholder="XAUUSD, US100, BTCUSD"
                    className="w-full px-3 py-2 rounded-[4px] bg-[#06080c] border border-white/10 text-white font-mono focus:outline-none focus:border-[#10b981]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-[#D1D4DC] mb-1">
                    {isAr ? 'الفريم الزمني (Timeframe)' : 'Timeframe'}
                  </label>
                  <select
                    value={formState.timeframe}
                    onChange={(e) =>
                      setFormState((prev) => ({ ...prev, timeframe: e.target.value }))
                    }
                    className="w-full px-3 py-2 rounded-[4px] bg-[#06080c] border border-white/10 text-white font-mono focus:outline-none focus:border-[#10b981]"
                  >
                    <option value="15m">15m</option>
                    <option value="30m">30m</option>
                    <option value="1H">1H</option>
                    <option value="4H">4H</option>
                    <option value="1D">1D (Daily)</option>
                    <option value="1W">1W (Weekly)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-[#D1D4DC] mb-1">
                    {isAr ? 'الاتجاه المتوقع' : 'Directional Bias'}
                  </label>
                  <select
                    value={formState.direction}
                    onChange={(e) =>
                      setFormState((prev) => ({
                        ...prev,
                        direction: e.target.value as AnalysisDirection
                      }))
                    }
                    className="w-full px-3 py-2 rounded-[4px] bg-[#06080c] border border-white/10 text-white focus:outline-none focus:border-[#10b981]"
                  >
                    <option value="BULLISH">
                      {isAr ? 'نظرة صاعدة (BULLISH)' : 'BULLISH (Long Bias)'}
                    </option>
                    <option value="BEARISH">
                      {isAr ? 'نظرة هابطة (BEARISH)' : 'BEARISH (Short Bias)'}
                    </option>
                    <option value="NEUTRAL">
                      {isAr ? 'منطقة تجميع / محايد' : 'NEUTRAL / Range'}
                    </option>
                  </select>
                </div>
              </div>

              {/* Target & Invalidation Levels */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-[#D1D4DC] mb-1">
                    {isAr ? 'المستهدفات السعرية (اختياري)' : 'Target Levels (Optional)'}
                  </label>
                  <input
                    type="text"
                    value={formState.targetPrice}
                    onChange={(e) =>
                      setFormState((prev) => ({ ...prev, targetPrice: e.target.value }))
                    }
                    placeholder="e.g. 2945 -> 2968"
                    className="w-full px-3 py-2 rounded-[4px] bg-[#06080c] border border-white/10 text-white font-mono focus:outline-none focus:border-[#10b981]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-[#D1D4DC] mb-1">
                    {isAr ? 'مستوى إلغاء السيناريو / الدعم أو المقاومة' : 'Invalidation / Key Level (Optional)'}
                  </label>
                  <input
                    type="text"
                    value={formState.invalidationLevel}
                    onChange={(e) =>
                      setFormState((prev) => ({ ...prev, invalidationLevel: e.target.value }))
                    }
                    placeholder="e.g. Below 2905"
                    className="w-full px-3 py-2 rounded-[4px] bg-[#06080c] border border-white/10 text-white font-mono focus:outline-none focus:border-[#10b981]"
                  />
                </div>
              </div>

              {/* Chart Photo Upload or Image URL */}
              <div className="p-3 rounded-xl bg-[#06080c] border border-white/10 space-y-2.5">
                <label className="block text-[11px] font-bold text-white flex items-center gap-1.5">
                  <ImageIcon className="w-3.5 h-3.5 text-[#10b981]" />
                  <span>
                    {isAr
                      ? 'صورة الشارت والتحليل (رفع صورة من جهازك أو رابط صورة الشارت)'
                      : 'Chart Screenshot / Image (Upload photo or paste chart URL)'}
                  </span>
                </label>

                <div className="flex flex-wrap items-center gap-2">
                  <label className="px-3 py-2 rounded-[4px] bg-[#10b981]/15 hover:bg-[#10b981]/25 border border-[#10b981]/40 text-[#10b981] text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors">
                    <Upload className="w-3.5 h-3.5" />
                    <span>{isAr ? 'رفع صورة الشارت من الجهاز' : 'Upload Chart Photo'}</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="hidden"
                    />
                  </label>

                  <input
                    type="text"
                    value={formState.imageUrl}
                    onChange={(e) =>
                      setFormState((prev) => ({ ...prev, imageUrl: e.target.value }))
                    }
                    placeholder={
                      isAr
                        ? 'أو الصق رابط صورة الشارت من TradingView...'
                        : 'Or paste TradingView chart snapshot image URL...'
                    }
                    className="flex-1 min-w-[200px] px-3 py-2 rounded-[4px] bg-[#0b0e14] border border-white/10 text-white focus:outline-none focus:border-[#10b981]"
                  />
                </div>

                {formState.imageUrl && (
                  <div className="relative rounded-lg overflow-hidden border border-white/10 bg-black/40 max-h-48">
                    <img
                      src={formState.imageUrl}
                      alt="Chart Preview"
                      className="w-full max-h-48 object-contain"
                    />
                    <button
                      type="button"
                      onClick={() => setFormState((prev) => ({ ...prev, imageUrl: '' }))}
                      className="absolute top-2 end-2 px-2 py-1 rounded bg-black/80 text-rose-400 text-[10px] font-bold border border-white/10 cursor-pointer"
                    >
                      {isAr ? 'إزالة الصورة' : 'Remove Photo'}
                    </button>
                  </div>
                )}
              </div>

              {/* Analysis Description */}
              <div>
                <label className="block text-[11px] font-bold text-[#D1D4DC] mb-1">
                  {isAr ? 'تفاصيل التحليل الفني والسيناريو المتوقع *' : 'Detailed Market Analysis & Breakdown *'}
                </label>
                <textarea
                  required
                  rows={5}
                  value={formState.summaryAr}
                  onChange={(e) =>
                    setFormState((prev) => ({ ...prev, summaryAr: e.target.value }))
                  }
                  placeholder={
                    isAr
                      ? 'اكتب شرح التحليل، مناطق السيولة، السيناريو الأساسي، ومناطق الدخول أو الارتداد...'
                      : 'Write the institutional chart breakdown, liquidity zones, and key levels...'
                  }
                  className="w-full px-3 py-2 rounded-[4px] bg-[#06080c] border border-white/10 text-white focus:outline-none focus:border-[#10b981]"
                />
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-white/10">
                <label className="inline-flex items-center gap-2 text-xs text-white cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formState.isPublished}
                    onChange={(e) =>
                      setFormState((prev) => ({ ...prev, isPublished: e.target.checked }))
                    }
                    className="rounded border-white/20 accent-[#10b981]"
                  />
                  <span>{isAr ? 'نشر التحليل فوراً لجميع المتداولين' : 'Publish immediately to all traders'}</span>
                </label>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setEditorOpen(false)}
                    className="px-3.5 py-2 rounded-[4px] bg-[#06080c] border border-white/10 text-[#9db2c6] hover:text-white font-bold cursor-pointer"
                  >
                    {isAr ? 'إلغاء' : 'Cancel'}
                  </button>
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="px-4 py-2 rounded-[4px] bg-[#10b981] hover:bg-[#059669] disabled:opacity-40 text-[#06080c] font-extrabold cursor-pointer"
                  >
                    {isSaving
                      ? isAr
                        ? 'جاري الحفظ...'
                        : 'Saving...'
                      : formState.id
                      ? isAr
                        ? 'حفظ التعديلات'
                        : 'Save Changes'
                      : isAr
                      ? 'نشر التحليل الآن'
                      : 'Publish Analysis'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
